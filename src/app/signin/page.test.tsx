import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

/**
 * SignIn Page Tests
 *
 * Verifies the primary client-side OAuth entry point. A regression here
 * (typo in providerId, dropped callbackURL, broken already-signed-in
 * short-circuit) would silently break the auth flow for every user.
 *
 * Covers:
 * 1. Already-signed-in short-circuit: session exists → window.location.href = callbackUrl
 * 2. Not-signed-in happy path: session null → signIn.social with provider + callbackURL
 * 3. Error fall-through: getSession rejects → still calls signIn.social
 * 4. callbackUrl defaults to "/" when the query param is absent
 * 5. ?error=access_denied renders the error card (and does NOT auto-start OAuth)
 * 6. Retry button re-invokes signIn.social with the correct callbackURL
 * 7. 10s redirect-timeout flips to the error state when no navigation happens
 */

const { mockGetSession, mockSignInSocial, mockUseSearchParams } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockSignInSocial: vi.fn(),
  mockUseSearchParams: vi.fn(),
}));

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    getSession: mockGetSession,
    // Better Auth 1.7 removed `signIn.oauth2` with the genericOAuthClient
    // plugin; generic providers now go through core `signIn.social`.
    signIn: {
      social: mockSignInSocial,
    },
  },
}));

vi.mock('next/navigation', () => ({
  useSearchParams: mockUseSearchParams,
}));

import SignIn, { dynamic } from './page';
import { sanitizeCallbackUrl } from './sign-in-content';

function setSearchParams(params: Record<string, string>) {
  const sp = new URLSearchParams(params);
  mockUseSearchParams.mockReturnValue(sp);
}

/**
 * These tests deliberately drive failure paths, and the code under test logs
 * them on purpose. Silence the channel so a real, unexpected error still
 * stands out in the runner output instead of drowning in expected noise.
 * `mockImplementation` keeps the spy recording, so assertions on what was
 * logged still work.
 */
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('SignIn page', () => {
  let originalLocation: Location;
  let locationHref: string;

  beforeEach(() => {
    vi.clearAllMocks();

    // Replace window.location with a stub so we can observe href assignment
    // without jsdom trying to navigate.
    originalLocation = window.location;
    locationHref = '';
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: {
        get href() {
          return locationHref;
        },
        set href(value: string) {
          locationHref = value;
        },
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });

  it('redirects to callbackUrl when a session already exists', async () => {
    setSearchParams({ callbackUrl: '/tools/addresslabels?s=123' });
    mockGetSession.mockResolvedValue({
      data: { user: { id: 'u1' }, session: { token: 't' } },
    });

    render(<SignIn />);

    await waitFor(() => {
      expect(locationHref).toBe('/tools/addresslabels?s=123');
    });
    expect(mockSignInSocial).not.toHaveBeenCalled();
  });

  it('initiates OAuth sign-in with providerId + callbackURL when not signed in', async () => {
    setSearchParams({ callbackUrl: '/tools/template?q=a' });
    mockGetSession.mockResolvedValue({ data: null });

    render(<SignIn />);

    await waitFor(() => {
      expect(mockSignInSocial).toHaveBeenCalledWith({
        provider: 'ministryplatform',
        callbackURL: '/tools/template?q=a',
      });
    });
    expect(locationHref).toBe('');
  });

  it('falls through to OAuth sign-in when getSession rejects', async () => {
    setSearchParams({ callbackUrl: '/tools/groupwizard' });
    mockGetSession.mockRejectedValue(new Error('network down'));

    render(<SignIn />);

    await waitFor(() => {
      expect(mockSignInSocial).toHaveBeenCalledWith({
        provider: 'ministryplatform',
        callbackURL: '/tools/groupwizard',
      });
    });
    expect(locationHref).toBe('');
  });

  it('defaults callbackUrl to "/" when the query param is absent', async () => {
    setSearchParams({});
    mockGetSession.mockResolvedValue({ data: null });

    render(<SignIn />);

    await waitFor(() => {
      expect(mockSignInSocial).toHaveBeenCalledWith({
        provider: 'ministryplatform',
        callbackURL: '/',
      });
    });
  });

  it('renders an error card when ?error=access_denied is present and does NOT auto-start OAuth', async () => {
    setSearchParams({ callbackUrl: '/tools/addresslabels', error: 'access_denied' });
    // getSession should not be awaited into an OAuth redirect when the URL
    // arrived with an error code — the user just came back from a failure.
    mockGetSession.mockResolvedValue({ data: null });

    render(<SignIn />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/sign-in error/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /retry sign-in/i })
    ).toBeInTheDocument();
    // Give any pending microtasks a chance to run — OAuth must still NOT fire.
    await Promise.resolve();
    expect(mockSignInSocial).not.toHaveBeenCalled();
  });

  it('retry button re-invokes signIn.social with the callbackURL', async () => {
    setSearchParams({ callbackUrl: '/tools/template', error: 'access_denied' });
    mockGetSession.mockResolvedValue({ data: null });

    render(<SignIn />);

    const retry = await screen.findByRole('button', { name: /retry sign-in/i });
    expect(mockSignInSocial).not.toHaveBeenCalled();

    fireEvent.click(retry);

    await waitFor(() => {
      expect(mockSignInSocial).toHaveBeenCalledWith({
        provider: 'ministryplatform',
        callbackURL: '/tools/template',
      });
    });
  });

  it('flips to an error state after a 10s redirect timeout', async () => {
    // Use fake timers with a shim so queueMicrotask / Promise resolution
    // still work — we only want setTimeout/setInterval faked.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    try {
      setSearchParams({ callbackUrl: '/' });
      mockGetSession.mockResolvedValue({ data: null });
      // signIn.social "succeeds" (no throw, no reject) but never navigates — this
      // mirrors a hung provider redirect.
      mockSignInSocial.mockReturnValue(undefined);

      render(<SignIn />);

      // Let the getSession().then(...) microtask resolve so startOAuth runs
      // and the 10s timeout is armed.
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(mockSignInSocial).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();

      // Advance past the 10s safety timeout and flush resulting state updates.
      await act(async () => {
        vi.advanceTimersByTime(10_000);
      });

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/taking longer than expected/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /retry sign-in/i })
      ).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

/**
 * F3 — open redirect via `?callbackUrl=`.
 *
 * `/signin?callbackUrl=https://evil.example` bounced the user off-site from a
 * URL that looks exactly like this app's own login page.
 */
describe('sanitizeCallbackUrl', () => {
  it.each([
    ['https://evil.example', '/'],
    ['http://evil.example/x', '/'],
    ['//evil.example', '/'],
    ['//evil.example/path', '/'],
    ['/\\evil.example', '/'],  // JS string: /\evil.example
    ['javascript:alert(1)', '/'],
    ['', '/'],
    [null, '/'],
    [undefined, '/'],
  ])('rejects %s', (input, expected) => {
    expect(sanitizeCallbackUrl(input as string | null | undefined)).toBe(expected);
  });

  it.each([
    '/',
    '/tools/addresslabels',
    '/tools/addresslabels?s=123&pageID=292',
    '/tools/groupwizard/abc?tab=members',
  ])('preserves the legitimate deep link %s', (input) => {
    // A sanitizer that breaks deep links gets reverted, so pin these too.
    expect(sanitizeCallbackUrl(input)).toBe(input);
  });
});

/**
 * F9 — the nonce-based CSP forces this route to render per-request.
 *
 * A prerendered page has no request, therefore no nonce, so under enforcement
 * its bootstrap script is blocked and it never hydrates. For /signin — whose
 * entire job happens in a client effect — that is a permanent spinner.
 */
describe('SignIn route rendering mode', () => {
  it('opts out of static prerendering', () => {
    expect(dynamic).toBe('force-dynamic');
  });

  it('is NOT a client module — route segment config is ignored in one', async () => {
    // The trap: `export const dynamic` sits inert in a "use client" module. The
    // build output still reports the route as static and the page still fails
    // to hydrate, with nothing to explain why. Both halves have to be pinned.
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const source = await fs.readFile(
      path.resolve(process.cwd(), 'src/app/signin/page.tsx'),
      'utf-8',
    );
    expect(source).not.toMatch(/^\s*["']use client["']/m);
  });

  it('keeps the interactive body in a separate client module', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const source = await fs.readFile(
      path.resolve(process.cwd(), 'src/app/signin/sign-in-content.tsx'),
      'utf-8',
    );
    expect(source).toMatch(/^["']use client["']/m);
  });
});

/**
 * Error-code classification.
 *
 * `describeOAuthError` is not exported, so it is exercised through the rendered
 * error card. Each branch maps a provider error code to the guidance the user
 * actually reads — getting this wrong tells people to retry something that
 * will never succeed, or to contact support for a cancelled sign-in.
 */
describe('SignIn OAuth error classification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(null);
  });

  it.each([
    'invalid_request',
    'invalid_client',
    'invalid_grant',
    'unauthorized_client',
    'unsupported_response_type',
    'invalid_scope',
  ])('describes %s as a request rejected by the provider', async (code) => {
    setSearchParams({ error: code });

    render(<SignIn />);

    expect(
      await screen.findByText(/sign-in request was rejected by the provider/i),
    ).toBeInTheDocument();
    expect(mockSignInSocial).not.toHaveBeenCalled();
  });

  it.each(['server_error', 'temporarily_unavailable'])(
    'describes %s as a temporary provider outage',
    async (code) => {
      setSearchParams({ error: code });

      render(<SignIn />);

      expect(
        await screen.findByText(/temporarily unavailable\. please retry in a moment/i),
      ).toBeInTheDocument();
    },
  );

  it('falls back to a generic message that names an unrecognised code', async () => {
    setSearchParams({ error: 'some_unmapped_code' });

    render(<SignIn />);

    expect(await screen.findByText(/sign-in failed \(some_unmapped_code\)/i)).toBeInTheDocument();
  });

  it('describes access_denied as a cancellation the user can retry', async () => {
    setSearchParams({ error: 'access_denied' });

    render(<SignIn />);

    expect(await screen.findByText(/sign-in was cancelled/i)).toBeInTheDocument();
  });
});

/**
 * Failure to even START the OAuth handshake.
 *
 * `signIn.social()` can fail two ways: it can throw synchronously, or it can
 * return a promise that rejects. Both must clear the redirect timeout, release
 * the once-only guard, and surface a retryable error — otherwise the user is
 * left on a spinner with no way forward.
 */
describe('SignIn when signIn.social fails to start', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(null);
    setSearchParams({});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('surfaces a retryable error when signIn.social throws synchronously', async () => {
    mockSignInSocial.mockImplementation(() => {
      throw new Error('provider exploded');
    });

    render(<SignIn />);

    expect(await screen.findByText(/failed to start sign-in/i)).toBeInTheDocument();
  });

  it('surfaces a retryable error when the returned promise rejects', async () => {
    mockSignInSocial.mockRejectedValue(new Error('network down'));

    render(<SignIn />);

    expect(await screen.findByText(/failed to start sign-in/i)).toBeInTheDocument();
  });

  it('allows a retry after a start failure, re-invoking signIn.social', async () => {
    mockSignInSocial.mockRejectedValueOnce(new Error('network down'));

    render(<SignIn />);
    await screen.findByText(/failed to start sign-in/i);

    const callsBeforeRetry = mockSignInSocial.mock.calls.length;
    mockSignInSocial.mockResolvedValueOnce(undefined);
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() =>
      expect(mockSignInSocial.mock.calls.length).toBeGreaterThan(callsBeforeRetry),
    );
  });

  it('tolerates a non-thenable return value without throwing', async () => {
    // The source guards on `typeof result.catch === "function"`; a void return
    // must not crash the effect.
    mockSignInSocial.mockReturnValue(undefined);

    render(<SignIn />);

    await waitFor(() => expect(mockSignInSocial).toHaveBeenCalled());
    expect(screen.queryByText(/failed to start sign-in/i)).not.toBeInTheDocument();
  });
});

describe('SignInFallback', () => {
  it('renders a loading state for the Suspense boundary', async () => {
    const { SignInFallback } = await import('./sign-in-content');

    render(<SignInFallback />);

    expect(screen.getByRole('heading', { name: /loading/i })).toBeInTheDocument();
  });
});
