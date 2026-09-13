import { describe, it, expect } from 'vitest';

import { authClient } from './auth-client';

/**
 * Smoke coverage for the Better Auth browser client.
 *
 * Better Auth 1.7 removed `genericOAuthClient()`; the MP generic OAuth provider
 * is now registered as a first-class social provider, so sign-in must go
 * through `signIn.social({ provider: "ministryplatform" })` rather than the
 * removed `signIn.oauth2`. These assertions pin the surface the app calls.
 *
 * The client is NOT mocked here: `better-auth/react` is a subpath export that
 * Vitest's module registry does not intercept in this setup, and the real
 * client constructs fine under jsdom. Constructing it for real is also the
 * stronger test — it proves the plugin list in the source actually builds.
 */

describe('authClient', () => {
  it('constructs without throwing at import time', () => {
    expect(authClient).toBeDefined();
  });

  it('exposes signIn.social, the endpoint the MP provider uses', () => {
    expect(authClient.signIn.social).toBeTypeOf('function');
  });

  it('exposes the customSession-backed useSession hook', () => {
    expect(authClient.useSession).toBeDefined();
  });

  it('exposes signOut', () => {
    expect(authClient.signOut).toBeTypeOf('function');
  });
});
