---
title: OAuth Flow (genericOAuth + OIDC endsession)
domain: auth
type: reference
applies_to: [src/lib/auth.ts, src/app/signin/page.tsx, src/app/api/auth/[...all]/route.ts, src/components/user-menu/actions.ts]
symbols: [auth, handleSignOut]
related: [sessions.md, user-identity.md, route-protection.md]
last_verified: 2026-04-17
---

## Purpose
End-to-end OAuth2/OIDC flow against Ministry Platform: sign-in, token exchange, profile mapping, and OIDC-style logout via `endsession`.

## Files
- `src/lib/auth.ts` — `genericOAuth` provider config (`providerId: "ministry-platform"`)
- `src/app/signin/page.tsx` — client page that calls `authClient.signIn.oauth2(...)`
- `src/app/api/auth/[...all]/route.ts` — Better Auth route handler via `toNextJsHandler(auth)`
- `src/components/user-menu/actions.ts` — `handleSignOut()` server action for OIDC logout
- `src/auth.test.ts` — unit tests for `getUserInfo`, `mapProfileToUser`
- `src/components/user-menu/actions.test.ts` — tests for `handleSignOut`

## Key concepts
- Provider is registered under **`providerId: "ministry-platform"`** (`src/lib/auth.ts:35`). This string is the key for both the OAuth callback URL and `signIn.oauth2({ providerId })`.
- **OIDC discovery** is used — no hand-wired endpoints. `discoveryUrl` points at MP's well-known config.
- **PKCE is disabled** (`pkce: false`, `src/lib/auth.ts:44`). <!-- UNVERIFIED: prior TODO path `.claude/TODO/002-security-pkce-disabled.md` does not exist in current tree (2026-04-17). Security concern still valid but no tracking file. -->
- MP requires a **`realm=realm`** authorization URL param (`authorizationUrlParams`, `src/lib/auth.ts:45-47`).
- **`getUserInfo`** fetches `${MP_BASE_URL}/oauth/connect/userinfo` with the access token and returns `{ id: profile.sub, email, name, image: undefined, emailVerified: true }`.
- **`mapProfileToUser`** persists the OIDC `sub` claim as the custom `userGuid` field. See `user-identity.md`.
- **OAuth callback URL (convention):** `${APP_URL}/api/auth/oauth2/callback/ministry-platform` — Better Auth's `genericOAuth` pattern `/api/auth/oauth2/callback/{providerId}`. Must be registered on the MP OAuth client.
- **Sign-out is a two-step flow:** clear local Better Auth session via `auth.api.signOut(...)`, then `redirect(...)` the browser to MP's `/oauth/connect/endsession?post_logout_redirect_uri=...`.
- `id_token_hint` is **not** passed to `endsession` (optional in OIDC). `post_logout_redirect_uri` must be pre-registered on the MP OAuth client.

## genericOAuth configuration (from `src/lib/auth.ts`)

| Setting | Value | Source |
|---|---|---|
| `providerId` | `"ministry-platform"` | `auth.ts:35` |
| `discoveryUrl` | `${MP_BASE_URL}/oauth/.well-known/openid-configuration` | `auth.ts:36` |
| `clientId` | `process.env.MINISTRY_PLATFORM_CLIENT_ID!` | `auth.ts:37` |
| `clientSecret` | `process.env.MINISTRY_PLATFORM_CLIENT_SECRET!` | `auth.ts:38` |
| `scopes` | `["openid", "offline_access", "http://www.thinkministry.com/dataplatform/scopes/all"]` | `auth.ts:39-43` |
| `pkce` | `false` | `auth.ts:44` |
| `authorizationUrlParams` | `{ realm: "realm" }` | `auth.ts:45-47` |
| `getUserInfo` | custom `fetch(${MP_BASE_URL}/oauth/connect/userinfo)` | `auth.ts:48-76` |
| `mapProfileToUser` | `(profile) => ({ userGuid: profile.id }) as Record<string, unknown>` | `auth.ts:82-86` |

## `getUserInfo` implementation (verbatim)

```typescript
// src/lib/auth.ts:48-76
getUserInfo: async (tokens) => {
  // Fetch the OIDC profile to get the sub (User_GUID)
  const response = await fetch(
    `${mpBaseUrl}/oauth/connect/userinfo`,
    {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    },
  );

  if (!response.ok) {
    console.error(
      "getUserInfo - Failed to fetch user info:",
      response.status,
    );
    return null;
  }

  const profile = await response.json();

  return {
    id: profile.sub,
    email: profile.email,
    name: `${profile.given_name} ${profile.family_name}`,
    image: undefined,
    emailVerified: true,
  };
},
```

Notes:
- `emailVerified: true` is **hardcoded** — MP is trusted to have validated the email.
- The returned `id` (= `sub`) becomes the **`accountId`** in the account table, not `user.id`. See `user-identity.md`.

## `mapProfileToUser` implementation (verbatim)

```typescript
// src/lib/auth.ts:82-86
mapProfileToUser: (profile) => {
  return {
    userGuid: profile.id,
  } as Record<string, unknown>;
},
```

- The `Record<string, unknown>` cast is required because genericOAuth's TS type for `mapProfileToUser` doesn't surface `additionalFields`; the runtime does pass them to `createOAuthUser`.

## Sign-in flow

```
1. Browser hits protected path
2. src/proxy.ts → no session cookie → 302 /signin?callbackUrl=<original>
3. /signin (src/app/signin/page.tsx):
   - authClient.getSession() — if already signed in, redirect to callbackUrl
   - Else authClient.signIn.oauth2({ providerId: "ministry-platform", callbackURL })
4. Browser → MP /oauth/connect/authorize?... (with realm=realm, scopes)
5. User authenticates at MP
6. MP → ${APP_URL}/api/auth/oauth2/callback/ministry-platform?code=...
7. Better Auth (via toNextJsHandler):
   a. Exchanges code for tokens
   b. getUserInfo(tokens) → { id: sub, email, name, image, emailVerified: true }
   c. mapProfileToUser(profile) → { userGuid: profile.id }
   d. Creates user (id=generated, userGuid=sub, email, name)
   e. Creates account (accountId=sub, tokens) — storeAccountCookie: true
   f. Creates session → sets JWT cookie (cookieCache)
8. Browser lands on callbackURL (app page)
9. Client-side UserProvider reads session.user.userGuid → getCurrentUserProfile(userGuid)
```

## Sign-in entry (verbatim from `src/app/signin/page.tsx`)

```typescript
// src/app/signin/page.tsx:25-28
authClient.signIn.oauth2({
  providerId: "ministry-platform",
  callbackURL: callbackUrl,
});
```

## Sign-out flow (verbatim from `src/components/user-menu/actions.ts`)

```typescript
// src/components/user-menu/actions.ts
export async function handleSignOut() {
  // Clear the Better Auth session
  await auth.api.signOut({
    headers: await headers(),
  });

  const baseUrl = process.env.MINISTRY_PLATFORM_BASE_URL;
  if (!baseUrl) {
    throw new Error('MINISTRY_PLATFORM_BASE_URL is not configured');
  }

  const endSessionUrl = `${baseUrl}/oauth/connect/endsession`;
  const params = new URLSearchParams({
    post_logout_redirect_uri: process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000',
  });

  redirect(`${endSessionUrl}?${params.toString()}`);
}
```

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `MINISTRY_PLATFORM_BASE_URL` | yes | OIDC discovery root + userinfo + endsession |
| `MINISTRY_PLATFORM_CLIENT_ID` | yes | OAuth + API client ID registered on MP |
| `MINISTRY_PLATFORM_CLIENT_SECRET` | yes | OAuth + API client secret |
| `BETTER_AUTH_URL` | yes (fallback `NEXTAUTH_URL`) | App base URL for callbacks + `post_logout_redirect_uri` |
| `BETTER_AUTH_SECRET` | yes (fallback `NEXTAUTH_SECRET`) | Session signing secret |

`NEXTAUTH_*` fallbacks exist for gradual migration from NextAuth (`src/lib/auth.ts:9-10`, `src/components/user-menu/actions.ts:20`).

## MP OAuth client setup

Register these URLs on the MP OAuth client:
- **Redirect URI:** `${APP_URL}/api/auth/oauth2/callback/ministry-platform`
- **Post-logout redirect URI:** value of `BETTER_AUTH_URL` (or `NEXTAUTH_URL`)

## Gotchas
- `user.id` ≠ `userGuid`. See `user-identity.md`.
- `emailVerified` is always `true` — no client-side re-verification. `src/lib/auth.ts:74`
- PKCE disabled — `pkce: false` at `src/lib/auth.ts:44`. <!-- UNVERIFIED: referenced TODO `.claude/TODO/002-security-pkce-disabled.md` does not exist; see new TODO `2026-04-17-verify-auth-oauth-flow.md`. -->
- No `id_token_hint` on `endsession` — `post_logout_redirect_uri` **must** be pre-registered on MP.
- `handleSignOut` falls back to `http://localhost:3000` if neither `BETTER_AUTH_URL` nor `NEXTAUTH_URL` is set (`src/components/user-menu/actions.ts:20`). Deploying without the env var will 302 to localhost.

## Related docs
- `sessions.md` — what gets stored in the JWT cookie after callback
- `user-identity.md` — `sub` → `userGuid` mapping and consumer patterns
- `route-protection.md` — `callbackUrl` preservation through the OAuth round-trip
