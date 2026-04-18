import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';

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
});
