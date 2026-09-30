---
title: Sessions (stateless, encrypted cookie cache + customSession)
domain: auth
type: reference
applies_to: [src/lib/auth.ts, src/lib/env.ts, src/lib/auth-client.ts, src/contexts/session-context.tsx]
symbols: [auth, authClient, useAppSession, Session, SessionData, enrichSession, stripUserOAuthTokens, assertAuthEnvironment, parseIpAddressOptions]
related: [oauth-flow.md, user-identity.md, route-protection.md, ../security/README.md]
last_verified: 2026-09-30
---

## Purpose
Session strategy: stateless (no database), a hard 12 h lifetime, an encrypted
(JWE) `session_data` cookie, no user OAuth tokens anywhere, a lightweight
`customSession` that splits `name` and withholds `token`/`ipAddress`/`userAgent`,
and the boot-time refusals that keep the signing secret and base URLs sane.
Changed 2026-09-30 (security Step 3) — before that, sessions could live 7 days,
the cookie was a readable JWT, and the user's MP access/refresh tokens rode in an
`account_data` cookie.

## Files
- `src/lib/auth.ts` — `session`, `account`, `databaseHooks`, `advanced`,
  `assertAuthEnvironment`, `parseIpAddressOptions`, `enrichSession`,
  `stripUserOAuthTokens`
- `src/lib/env.ts` — `getMpBaseUrl()`, `getAuthBaseUrl()`
- `src/lib/auth-client.ts` — client `authClient` with `customSessionClient<typeof auth>()`
- `src/contexts/session-context.tsx` — `useAppSession()` hook
- Tests: `src/auth.session-lifetime.test.ts` (clock walks), `src/auth.session-config.test.ts`
  (cookie names/attrs, decrypted `session_data`, withheld fields),
  `src/auth.user-oauth-tokens.test.ts`, `src/auth.secret-guard.test.ts`,
  `src/auth.ip-address.test.ts`, `src/lib/env.test.ts`. They drive the real
  `auth` instance through the mock MP OIDC server in `src/test-utils/mock-oidc.ts`.

## Configuration (from `src/lib/auth.ts`)

```typescript
session: {
  expiresIn: 12 * 60 * 60,       // hard ceiling: expiresAt = sign-in + 12h
  disableSessionRefresh: true,   // expiresAt never slides
  cookieCache: {
    enabled: true,
    maxAge: 60 * 60,             // an unbacked cookie dies within 1h
    strategy: "jwe",             // encrypted, not just signed
    refreshCache: false,         // MUST be explicit — stateless mode defaults it to true
  },
},
account: {
  storeStateStrategy: "cookie",
  storeAccountCookie: false,     // no account_data cookie
  accountLinking: { enabled: false },
},
databaseHooks: {                 // applied by the in-memory adapter
  account: {
    create: { before: async (a) => ({ data: stripUserOAuthTokens(a) }) },
    update: { before: async (a) => ({ data: stripUserOAuthTokens(a) }) },
  },
},
advanced: {
  disableOriginCheck: false,     // a truthy TEST env var must not switch it off
  ipAddress: parseIpAddressOptions(process.env),
},
```

## Key concepts
- **Stateless.** No database adapter. better-auth keeps a per-process in-memory
  adapter; the signed `session_token` + encrypted `session_data` cookies are the
  session. There is no server-side revocation across instances.
- **12 h ceiling.** `expiresAt` is set once at sign-in and both `/get-session`
  paths refuse a session past it. Pinned by a clock walk.
- **`refreshCache: false` is load-bearing.** better-auth 1.7.6 defu-merges
  `refreshCache: true` under the config when there is no database
  (`context/create-context.mjs`). With it on, `/get-session` re-signs
  `session_data` from the cookie alone, so a copied cookie outlived sign-out for
  up to 7 days. With it off, a cookie not backed by a live in-memory row (copied
  before sign-out, forged from a leaked secret, or presented to a serverless
  instance that never saw the sign-in) dies `maxAge` (1 h) after minting.
  **Trade-off:** on serverless, a request after the hour that lands on an
  instance without the row gets no session and goes back through MP sign-in —
  which is also an hourly re-check that a disabled MP login fails.
- **No user OAuth tokens.** `offline_access` is not requested;
  `storeAccountCookie: false` keeps tokens out of the browser; the account-row
  hooks null the access/refresh tokens in memory. The **`idToken` is kept** in
  the in-memory row: on the instance that handled sign-in, better-auth's own
  `auth.api.signOut({ body: { disableRedirect: true } })` returns MP's
  endsession URL with `id_token_hint` (pinned in `auth.user-oauth-tokens.test.ts`),
  and `handleSignOut` forwards that hint (`sharedInstance` makes every Next
  bundle layer in the process share the row). On a different serverless
  instance there is no row and so no hint: sign-out still sends `client_id`,
  and MP may show its "log out?" prompt once. See `oauth-flow.md`.
- **`customSession` (`enrichSession`)** runs on every `getSession()`. It must stay
  cheap: no MP API calls. It adds `firstName`/`lastName` and strips
  `WITHHELD_SESSION_FIELDS` (`token`, `ipAddress`, `userAgent`) from the
  session. They remain inside the encrypted cookie and the in-memory row.
- **`additionalFields.userGuid`** must stay `input: true` — see `user-identity.md`.

## Boot-time refusals
`assertAuthEnvironment` runs at module load in every environment except Vitest
(including `next build`, which imports `auth.ts`). It throws — never echoing the
secret — when:
- no `BETTER_AUTH_SECRET` (or `NEXTAUTH_SECRET` fallback) is set;
- the secret is better-auth's public default;
- the secret is shorter than **32** characters (`openssl rand -base64 32`);
- `BETTER_AUTH_SECRETS` is set (it would silently override the validated secret);
- `NODE_ENV=production` with a truthy `TEST`.

`getMpBaseUrl()` / `getAuthBaseUrl()` (`src/lib/env.ts`) run at module load
under Vitest too. `MINISTRY_PLATFORM_BASE_URL`: https (loopback http outside
production), path allowed, trailing slash stripped. `BETTER_AUTH_URL` (fallback
`NEXTAUTH_URL`): required, origin only, https for real hosts, loopback http
allowed everywhere so local/CI `next build` works. Both refuse credentials,
query strings and fragments. The MP client, the client-credentials token request
and the sign-out action use the same readers.

## Client IP for rate limiting
`AUTH_IP_ADDRESS_HEADERS` (comma list, tried in order) and `AUTH_TRUSTED_PROXIES`
(IPs/CIDRs) feed `advanced.ipAddress`. Invalid entries refuse startup. Unset:
on Vercel (`VERCEL` set) → `x-vercel-forwarded-for, x-real-ip`, which Vercel's
edge overwrites; elsewhere → better-auth's default single-value
`x-forwarded-for`. Clones behind another edge must name the header **their**
edge overwrites (`cf-connecting-ip`, `x-azure-clientip`, ...). See `.env.example`.

## Emergency "sign everyone out"
Bump `session.cookieCache.version` and redeploy (every existing `session_data`
is refused), or rotate `BETTER_AUTH_SECRET` (invalidates every signed cookie,
including forged ones). Changing any of the settings above also invalidates
existing cookies once.

## Session shape (post-customSession)

```typescript
session.user = {
  id: string;              // Better Auth internal. NOT the MP User_GUID.
  email: string;           // synthetic <guid>@mp.invalid
  name: string;
  firstName: string;       // user.name.split(" ")[0]
  lastName: string;        // user.name.split(" ").slice(1).join(" ")
  userGuid?: string;       // MP User_GUID (OIDC sub). Type requires cast — see user-identity.md
  mpEmail?: string | null;
};
session.session = {
  id: string;
  userId: string;
  expiresAt: Date;         // sign-in + 12h
  createdAt: Date;
  updatedAt: Date;
  // token, ipAddress, userAgent: withheld
};
```

## Access patterns

### Server Component / Server Action
```typescript
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const session = await auth.api.getSession({ headers: await headers() });
if (!session) redirect("/signin");
```
Feature actions and services use `AuthorizationService`, not a bare session
check — see `../security/README.md`.

### Client Component (hook)
```typescript
"use client";
import { authClient } from "@/lib/auth-client";

const { data: session, isPending } = authClient.useSession();
const userGuid = (session?.user as { userGuid?: string } | undefined)?.userGuid;
```

## Gotchas
- **Serverless re-sign-in after an hour.** See the `refreshCache` trade-off above.
  If that proves too disruptive, the fix is a shared session store, not turning
  `refreshCache` back on.
- **`userGuid` requires a cast** on both server and client — a Better Auth type
  limitation. See `user-identity.md#type-casts`.
- **Don't test with `auth.api.getSession` on a fresh instance and expect a
  cookie-only session to live past 1 h** — that is the point.

## Related docs
- `oauth-flow.md` — how the session is created
- `user-identity.md` — `user.id` vs `userGuid`
- `route-protection.md` — how the session cookie gates protected routes
- `../security/README.md` — secrets, rotation, findings
