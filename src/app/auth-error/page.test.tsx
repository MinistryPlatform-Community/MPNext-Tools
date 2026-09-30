import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AuthErrorPage from './page';

/**
 * Auth-error page tests.
 *
 * This page is reachable by anyone, unauthenticated, with a fully
 * attacker-chosen `?error=` value — so the two things worth pinning are that a
 * hostile key can't break it and that nothing from the URL is rendered
 * verbatim as an explanation.
 */
async function renderPage(params: Record<string, string | string[]>) {
  const ui = await AuthErrorPage({ searchParams: Promise.resolve(params) });
  return render(ui);
}

describe('AuthErrorPage', () => {
  it('explains a known Better Auth error code', async () => {
    await renderPage({ error: 'state_security_mismatch' });

    expect(screen.getByText(/couldn't be verified/i)).toBeInTheDocument();
  });

  it('explains the code Better Auth 1.7 actually emits for a missing code', async () => {
    // Read off the installed better-auth, not guessed. This literal CHANGED in
    // 1.7: it was `oAuth_code_missing` on 1.6, it is `no_code` now.
    await renderPage({ error: 'no_code' });

    expect(screen.getByText(/response from Ministry Platform was incomplete/i)).toBeInTheDocument();
  });

  it('no longer maps nonce_binding_missing (no nonce is sent since Step 4), so it falls back', async () => {
    await renderPage({ error: 'nonce_binding_missing' });

    expect(screen.getByText(/couldn't complete sign-in/i)).toBeInTheDocument();
  });

  it('explains oauth_provider_not_found as a configuration fault, not an MP outage', async () => {
    // Building the auth instance makes no MP call any more, so an MP outage
    // can no longer unregister the provider.
    await renderPage({ error: 'oauth_provider_not_found' });

    expect(screen.getByText(/isn't configured correctly/i)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/when it started/i);
  });

  it('invites a retry for unable_to_get_user_info, which is what an MP blip at the callback looks like', async () => {
    await renderPage({ error: 'unable_to_get_user_info' });

    expect(screen.getByText(/please try again in a moment/i)).toBeInTheDocument();
  });

  it('falls back for an unknown code', async () => {
    await renderPage({ error: 'something_new_in_a_future_version' });

    expect(screen.getByText(/couldn't complete sign-in/i)).toBeInTheDocument();
  });

  it('renders with no error param at all', async () => {
    await renderPage({});

    expect(screen.getByText(/couldn't complete sign-in/i)).toBeInTheDocument();
  });

  it.each(['constructor', 'toString', '__proto__', 'hasOwnProperty', 'valueOf'])(
    'does not blow up on the prototype-pollution key %s',
    async (key) => {
      // Against a plain object literal this returns an inherited
      // Object.prototype member, which React then tries to render as a child.
      await renderPage({ error: key });

      expect(screen.getByText(/couldn't complete sign-in/i)).toBeInTheDocument();
    },
  );

  it('never renders error_description from the URL', async () => {
    await renderPage({
      error: 'internal_server_error',
      error_description: '<script>alert(1)</script> Contact your bank at evil.example',
    });

    expect(document.body.textContent).not.toContain('evil.example');
    expect(document.body.textContent).not.toContain('alert(1)');
  });

  it('clamps the reference code it echoes back', async () => {
    await renderPage({ error: 'a'.repeat(500) + ' <img src=x onerror=1>' });

    const reference = screen.getByText(/^a+$/);
    expect(reference.textContent!.length).toBeLessThanOrEqual(64);
    expect(document.body.textContent).not.toContain('onerror');
  });

  it('always offers a way back to sign-in, with no auto-redirect', async () => {
    await renderPage({ error: 'internal_server_error' });

    expect(screen.getByRole('link', { name: /try signing in again/i })).toHaveAttribute(
      'href',
      '/signin',
    );
  });

  it('does not describe invalid_code as only an expiry', async () => {
    // Better Auth maps a rejected token exchange (MP `invalid_grant`) onto this
    // code. Calling it "expired" sent a real debugging session looking for a
    // timeout that had not happened.
    await renderPage({ error: 'invalid_code' });

    expect(screen.getByText(/didn't accept the sign-in attempt/i)).toBeInTheDocument();
  });
});
