---
title: Sessions (stateless JWT + customSession)
domain: auth
type: reference
applies_to: [src/lib/auth.ts, src/lib/auth-client.ts, src/contexts/session-context.tsx]
symbols: [auth, authClient, useAppSession, Session, SessionData]
related: [oauth-flow.md, user-identity.md, route-protection.md]
last_verified: 2026-07-09
---

## Purpose
Session strategy: stateless JWT cookie cache (no DB), a lightweight `customSession` that splits `name` into `firstName`/`lastName`, and the access patterns for reading sessions server- and client-side.

## Files
- `src/lib/auth.ts` — `session.cookieCache`, `account.storeAccountCookie`, `customSession` plugin
- `src/lib/auth-client.ts` — client `authClient` with `customSessionClient<typeof auth>()`
- `src/contexts/session-context.tsx` — `useAppSession()` hook
- `src/auth.test.ts` — `customSession` logic tests (name splitting + session shape)

## Key concepts
- **Stateless**: no database adapter configured. Session state lives in a signed JWT cookie.
- **Cookie cache**: 1-hour TTL (`maxAge: 60 * 60`), `strategy: "jwt"`. Subsequent `getSession()` calls within the TTL decode the cookie, bypassing any DB (there is none anyway).
- **OAuth tokens in cookie**: `account.storeAccountCookie: true` + `storeStateStrategy: "cookie"` — there's no DB to persist them in.
- **`customSession` runs every `getSession()` call** when the cache expires. It **must stay cheap**: no MP API calls here. Profile enrichment happens in `UserProvider` (see `../contexts/user-provider.md`).
- **`additionalFields.userGuid`** is declared with `input: true` (extracted to the exported `userAdditionalFields` const) and populated only by `mapProfileToUser`. It **must not** be `input: false`: as of better-auth 1.6 that flag blocks the field from the OAuth profile → `userGuid` never persists → broken avatar/menu. See `user-identity.md` and the guard in `src/auth.test.ts`.
- **Type export:** `export type Session = typeof auth.$Infer.Session;` — server-side consumers import this (`src/lib/auth.ts:117`).
- Client-side mirror: `SessionData = typeof authClient.$Infer.Session` (`src/contexts/session-context.tsx:5`).

## Configuration (verbatim from `src/lib/auth.ts`)

```typescript
// src/lib/auth.ts:11-30
session: {
  cookieCache: {
    enabled: true,
    maxAge: 60 * 60, // 1 hour cache
    strategy: "jwt" as const,
  },
},
account: {
  storeStateStrategy: "cookie" as const,
  storeAccountCookie: true,
},
user: {
  // extracted to an exported `userAdditionalFields` const (see user-identity.md)
  additionalFields: userAdditionalFields, // { userGuid: { type: "string", required: false, input: true } }
},
```

## `customSession` (verbatim)

```typescript
// src/lib/auth.ts:398-413
customSession(
  async ({ user, session }) => {
    // No API calls here — profile loading is handled by UserProvider
    // on the client side via getCurrentUserProfile(). This keeps
    // getSession() fast and avoids hitting the MP API on every request.
    return {
      user: {
        ...user,
        firstName: user.name?.split(" ")[0] || "",
        lastName: user.name?.split(" ").slice(1).join(" ") || "",
      },
      session,
    };
  },
  options,
),
```

- `firstName` / `lastName` are derived from `user.name` by space-splitting. Single-name users → `firstName` only, `lastName: ""`. `undefined` or empty `name` → both `""`. Covered by `src/auth.test.ts:22-87`.

## Client auth wiring (verbatim from `src/lib/auth-client.ts`)

```typescript
// src/lib/auth-client.ts:1-11
import { createAuthClient } from "better-auth/react";
import { genericOAuthClient, customSessionClient } from "better-auth/client/plugins";
import type { auth } from "./auth";

export const authClient = createAuthClient({
  plugins: [
    genericOAuthClient(),
    customSessionClient<typeof auth>(),
  ],
});
```

`customSessionClient<typeof auth>()` gives the client type inference for `firstName`/`lastName`, but **does not** infer `additionalFields` (e.g., `userGuid`) — see `user-identity.md#type-casts`.

## Session shape (post-customSession)

```typescript
session.user = {
  id: string;              // Better Auth internal (nanoid). NOT the MP User_GUID.
  email: string;
  name: string;            // "First Last" from getUserInfo
  firstName: string;       // user.name.split(" ")[0]
  lastName: string;        // user.name.split(" ").slice(1).join(" ")
  userGuid?: string;       // MP User_GUID (OIDC sub). Type requires cast — see user-identity.md
  // ... other Better Auth user fields
};
session.session = {
  id: string;
  expiresAt: Date;
  // ... Better Auth session metadata
};
```

`userProfile` is **not** on the session — it's loaded client-side by `UserProvider` (asserted by `src/auth.test.ts:113-128`).

## Access patterns

### Server Component / Server Action
```typescript
// real pattern: src/components/layout/auth-wrapper.tsx:6-7
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const session = await auth.api.getSession({ headers: await headers() });
if (!session) redirect("/signin");
```

### Server Action needing userGuid
```typescript
// real pattern: src/contexts/user-context.tsx:29 (same cast server-side)
const session = await auth.api.getSession({ headers: await headers() });
const userGuid = (session?.user as { userGuid?: string } | undefined)?.userGuid;
```

### Client Component (hook)
```typescript
// real pattern: src/contexts/user-context.tsx:22, 29
"use client";
import { authClient } from "@/lib/auth-client";

const { data: session, isPending } = authClient.useSession();
const userGuid = (session?.user as { userGuid?: string } | undefined)?.userGuid;
```

### `useAppSession` wrapper
```typescript
// src/contexts/session-context.tsx:7-10
export function useAppSession() {
  const { data } = authClient.useSession();
  return data;
}
```
Returns `data` directly (no `isPending` exposure).

## Gotchas
- **⚠️ No DB adapter = in-memory session store (production risk).** No `database` key is configured in `src/lib/auth.ts`, so better-auth falls back to its in-memory adapter. Session state lives only in-memory + the signed cookie. A process restart drops the store, and on serverless/Vercel **every cold start begins with an empty store** — so once the 1-hour cookie cache expires, a request that lands on a fresh instance returns `null` and the user intermittently appears logged out. **Recommended follow-up: configure a persistent adapter before production.** This is the top auth refactor, independent of the userGuid fix.
- **`userGuid` requires a cast** on both server and client because `customSessionClient` and `customSession`'s inferred output don't expose `additionalFields`. This is a Better Auth type limitation. See `user-identity.md#type-casts`.
- **1-hour `cookieCache` staleness**: Changes to `customSession` logic (e.g., adding a field) won't appear in returning users' sessions until the cookie cache expires or they re-auth.
- **Refresh tokens**: `offline_access` scope is requested and `storeAccountCookie: true` persists tokens, but automatic refresh behavior in stateless cookie mode is **not explicitly implemented or tested** in the codebase.

## Related docs
- `oauth-flow.md` — how the session is created
- `user-identity.md` — `user.id` vs `userGuid` — critical
- `route-protection.md` — how the session cookie gates protected routes
- `../contexts/README.md` — `UserProvider` that enriches with the MP profile
