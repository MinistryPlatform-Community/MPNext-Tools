---
title: User Identity — user.id vs userGuid (CRITICAL)
domain: auth
type: reference
applies_to: [src/lib/auth.ts, src/contexts/user-context.tsx]
symbols: [userGuid, mpEmail, user.id, userAdditionalFields, mapProfileToUser, accountSubject]
related: [sessions.md, oauth-flow.md, ../services/user-service.md, ../contexts/user-provider.md]
last_verified: 2026-10-10
---

## Purpose
Explain the single most consequential gotcha in this codebase: `session.user.id` is **Better Auth's internal nanoid**, not the Ministry Platform `User_GUID`. The MP `User_GUID` lives in `session.user.userGuid` (populated from the OIDC `sub` claim via `additionalFields` + `mapProfileToUser`). Every MP API lookup keyed by the signed-in user **must** use `userGuid`.

## Files
- `src/lib/auth.ts:352-363` — `userAdditionalFields` (`userGuid`, `mpEmail`)
- `src/lib/auth.ts:777` — `accountSubject` reads `profile.sub` (the account key)
- `src/lib/auth.ts:778-892` — `getUserInfo` returns `{ sub, email: <sub>@mp.invalid, mpEmail, ... }`
- `src/lib/auth.ts:899-917` — `mapProfileToUser` writes `userGuid: sub` (validated by `extractUserGuid`)
- `src/contexts/user-context.tsx:29` — canonical consumer cast
- `src/auth.test.ts:194-222` — field-persistence guard + test asserting the distinction

## Identity table

| Field | Where it comes from | Example value | Use for |
|---|---|---|---|
| `session.user.id` | Better Auth generates internally on user creation | `1gYSNMvy6OqAm9q3DdVhtKj3Czkxd0ms` (nanoid-style) | Auth guards only (`if (!session?.user?.id) throw ...`) |
| `session.user.userGuid` | MP OIDC `sub` claim → stored via `additionalFields` | `ab12cd34-ef56-7890-abcd-ef1234567890` (UUID) | **All MP API lookups** (`dp_Users.User_GUID`, profile fetching, `$userId` audit) |
| `session.user.email` | `syntheticEmailForSub(sub)` — `<sub>@mp.invalid`, **not** a real address | `ab12cd34-...@mp.invalid` | Better Auth identity keying only; display the real address from `session.user.mpEmail` |
| Account row `accountId` | `accountSubject` reads `profile.sub` (returned by `getUserInfo`); Better Auth stores it on the account, **not** on the user | `ab12cd34-ef56-7890-abcd-ef1234567890` | Better Auth internal (account-to-user link) |

## Why `user.id` ≠ `sub`
Better Auth uses the provider subject (`accountSubject` → `profile.sub`) only as the `accountId` on the linked account record. The user's `id` is a fresh server-generated token. This is why `mapProfileToUser` must write `userGuid` separately as an `additionalField`.

## `userAdditionalFields` declaration (verbatim)

```typescript
// src/lib/auth.ts:352-363 — extracted to an exported const so a test can assert against it
export const userAdditionalFields = {
  userGuid: {
    type: "string" as const,
    required: true,
    input: true,
  },
  mpEmail: {
    type: "string" as const,
    required: false,
    input: true,
  },
};

// ...referenced in the options:
user: {
  additionalFields: userAdditionalFields,
},
```

> ⚠️ **`userGuid` (and `mpEmail`) MUST keep `input: true`.** It is populated server-side from the
> OAuth profile via `mapProfileToUser`, not by user input. As of better-auth
> 1.6, the provider-profile field parser (`parseAdditionalUserInput` in
> `node_modules/better-auth/dist/db/schema.mjs`) no longer lets an
> `input: false` additionalField through when a value is supplied — in 1.6.11 it
> throws `"userGuid is not allowed to be set"`, so the OAuth-created user never
> gets a `userGuid`. Result: `session.user.userGuid` is `undefined` → every
> tool redirects to `/session-error`, and MP profile lookups break. `input: true`
> also makes the field writable through Better Auth's `/update-user` endpoint;
> that endpoint is closed at the route layer (`disabledAuthPaths` in
> `src/lib/auth.ts` and the allowlist in `src/app/api/auth/[...all]/route.ts`) —
> that is the control, not this flag.
> Guarded by `src/auth.test.ts` (runs the real better-auth parser against the
> real `userAdditionalFields` config).

- `input: true` — see the warning above. The field is only ever set server-side by `mapProfileToUser`.
- `required: true` — better-auth refuses to create a user record with no MP identity (fail closed). Sessions minted before this, or by a future regression, can still lack it — `AuthWrapper` routes those to `/session-error`, and consumers still null-check.

## Better Auth upgrade checklist

`npm audit fix` / `npm update` can bump better-auth across minor versions (this
bug shipped via a bump from 1.4.18 → 1.6.x). CI (build + lint + unit tests) does
**not** exercise a real OAuth login, so session/OAuth regressions ship silently.
After **any** better-auth version change:

1. Read the changelog for `genericOAuth`, `customSession`, `additionalFields`,
   cookie-cache / session serialization, and `mapProfileToUser`.
2. `npm run test:run src/auth.test.ts` — runs the 1.6 field-persistence guard.
3. **Manual smoke test (required — nothing else catches this):** `npm run dev`,
   **sign out and sign in fresh** (stale sessions predate any user-record change),
   open `/api/auth/get-session`, and confirm `user.userGuid` is present. Confirm
   a tool loads (not `/session-error`).
4. If `userGuid` is missing, inspect `parseAdditionalUserInput` (formerly
   `parseAdditionalUserInputFromProviderProfile`) in
   `node_modules/better-auth/dist/db/schema.mjs`.

## `mapProfileToUser` (verbatim)

```typescript
// src/lib/auth.ts:899-917 (comments trimmed)
mapProfileToUser: (profile) => {
  const sub = extractUserGuid(profile);
  if (!sub) {
    throw new Error("mapProfileToUser: profile has no usable sub");
  }
  return {
    userGuid: sub,
    email: syntheticEmailForSub(sub),
    mpEmail:
      (profile as unknown as { mpEmail?: string | null }).mpEmail ??
      null,
  } as Record<string, unknown>;
},
```

The `Record<string, unknown>` cast is required: genericOAuth's `mapProfileToUser` type signature doesn't expose `additionalFields`. The runtime forwards the extra keys to `createOAuthUser` correctly.

## Consumer patterns

### Server action / server component

```typescript
// Real pattern: see src/contexts/user-context.tsx:29 (same cast idiom)
const session = await auth.api.getSession({ headers: await headers() });
if (!session?.user?.id) {
  throw new Error("Authentication required"); // guard on any identity
}
// Feature actions/services must authorize via AuthorizationService, not just
// check a session — see ../security/README.md.

// For MP API lookups, use userGuid (NOT user.id):
const userGuid = (session.user as { userGuid?: string }).userGuid;
if (!userGuid) throw new Error("Missing userGuid");
// ... use userGuid in dp_Users WHERE User_GUID = '{userGuid}'
```

### Client component

```typescript
// src/contexts/user-context.tsx:29
const { data: session } = authClient.useSession();
const userGuid = (session?.user as { userGuid?: string } | undefined)?.userGuid;
```

### UserProvider flow (real usage)

```typescript
// src/contexts/user-context.tsx:29-49 (excerpt)
// userGuid gates whether the load fires; it is NOT passed to the action.
const userGuid = (session?.user as { userGuid?: string } | undefined)?.userGuid;

const loadUserProfile = useCallback(async () => {
  if (!userGuid) { /* ... */ return; }
  // ...
  const profile = await getCurrentUserProfile(); // no argument: the action re-derives the GUID server-side
  setUserProfile(profile ?? null);
}, [userGuid]);
```

## Type casts — why they're needed

`customSessionClient<typeof auth>()` and the `customSession` server plugin both return a type that **does not include `additionalFields`** from `genericOAuth`. So TypeScript sees `session.user` without `userGuid`. Consumers must cast:

- Server: `(session.user as Record<string, unknown>).userGuid as string` **or** `(session.user as { userGuid?: string }).userGuid`
- Client: `(session?.user as { userGuid?: string } | undefined)?.userGuid`

This is a Better Auth type-inference limitation (still present on `better-auth@^1.7.7`; the casts remain in `user-context.tsx` and `auth-wrapper.tsx`). Runtime behavior is correct.

## Test evidence

```typescript
// src/auth.test.ts:203-222
it('should distinguish user.id (Better Auth internal) from userGuid (MP User_GUID)', () => {
  const mpUserGuid = 'ab12cd34-ef56-7890-abcd-ef1234567890';
  const betterAuthId = '1gYSNMvy6OqAm9q3DdVhtKj3Czkxd0ms';

  const sessionUser = {
    id: betterAuthId,
    userGuid: mpUserGuid,
    email: 'test@example.com',
    name: 'Test User',
  };

  // user.id is NOT suitable for MP API queries
  expect(sessionUser.id).not.toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/);
  // userGuid IS the MP User_GUID (UUID format)
  expect(sessionUser.userGuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/);
});
```

## Gotchas

- **Most common bug:** calling an MP service with `session.user.id` instead of `session.user.userGuid` — returns empty results or throws "user not found" because `user.id` is a nanoid, not a UUID in `dp_Users.User_GUID`.
- **Don't rename `userGuid` to `mpUserGuid` / `userId`.** Call sites grep on exactly `userGuid`.
- **`userGuid` can be `undefined`** on a session minted before the field existed or by a better-auth regression (the 1.6 incident). Always null-check.
- **`user.id` is still required** — use it only as a "session exists" sentinel (`if (!session?.user?.id)`), never for DB joins.

## Glossary candidates
- **`userGuid`** — the MP `User_GUID` stored on `session.user` via Better Auth `additionalFields`. Sourced from the OIDC `sub` claim by `mapProfileToUser`. Required for any MP API lookup of the signed-in user.

## Related docs
- `sessions.md` — session shape and why the cast is necessary
- `oauth-flow.md` — how `sub` flows into `userGuid`
- `../services/user-service.md` — `UserService.getUserProfile(userGuid)` consumer
- `../contexts/user-provider.md` — canonical client-side consumer
