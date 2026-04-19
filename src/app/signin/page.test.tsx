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
 * 2. Not-signed-in happy path: session null → signIn.oauth2 with providerId + callbackURL
 * 3. Error fall-through: getSession rejects → still calls signIn.oauth2
 * 4. callbackUrl defaults to "/" when the query param is absent
 * 5. ?error=access_denied renders the error card (and does NOT auto-start OAuth)
 * 6. Retry button re-invokes signIn.oauth2 with the correct callbackURL
 * 7. 10s redirect-timeout flips to the error state when no navigation happens
 */

const { mockGetSession, mockSignInOauth2, mockUseSearchParams } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockSignInOauth2: vi.fn(),
  mockUseSearchParams: vi.fn(),
}));

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    getSession: mockGetSession,
    signIn: {
      oauth2: mockSignInOauth2,
    },
  },
}));

vi.mock('next/navigation', () => ({
  useSearchParams: mockUseSearchParams,
}));

import SignIn from './page';

function setSearchParams(params: Record<string, string>) {
  const sp = new URLSearchParams(params);
  mockUseSearchParams.mockReturnValue(sp);
}

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
    expect(mockSignInOauth2).not.toHaveBeenCalled();
  });

  it('initiates OAuth sign-in with providerId + callbackURL when not signed in', async () => {
    setSearchParams({ callbackUrl: '/tools/template?q=a' });
    mockGetSession.mockResolvedValue({ data: null });

    render(<SignIn />);

    await waitFor(() => {
      expect(mockSignInOauth2).toHaveBeenCalledWith({
        providerId: 'ministry-platform',
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
      expect(mockSignInOauth2).toHaveBeenCalledWith({
        providerId: 'ministry-platform',
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
      expect(mockSignInOauth2).toHaveBeenCalledWith({
        providerId: 'ministry-platform',
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
    expect(mockSignInOauth2).not.toHaveBeenCalled();
  });

  it('retry button re-invokes signIn.oauth2 with the callbackURL', async () => {
    setSearchParams({ callbackUrl: '/tools/template', error: 'access_denied' });
    mockGetSession.mockResolvedValue({ data: null });

    render(<SignIn />);

    const retry = await screen.findByRole('button', { name: /retry sign-in/i });
    expect(mockSignInOauth2).not.toHaveBeenCalled();

    fireEvent.click(retry);

    await waitFor(() => {
      expect(mockSignInOauth2).toHaveBeenCalledWith({
        providerId: 'ministry-platform',
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
      // oauth2 "succeeds" (no throw, no reject) but never navigates — this
      // mirrors a hung provider redirect.
      mockSignInOauth2.mockReturnValue(undefined);

      render(<SignIn />);

      // Let the getSession().then(...) microtask resolve so startOAuth runs
      // and the 10s timeout is armed.
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(mockSignInOauth2).toHaveBeenCalledTimes(1);
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
