---
title: User Identity — user.id vs userGuid (CRITICAL)
domain: auth
type: reference
applies_to: [src/lib/auth.ts, src/contexts/user-context.tsx]
symbols: [userGuid, user.id, additionalFields]
related: [sessions.md, oauth-flow.md, ../services/user-service.md]
last_verified: 2026-07-09
---

## Purpose
Explain the single most consequential gotcha in this codebase: `session.user.id` is **Better Auth's internal nanoid**, not the Ministry Platform `User_GUID`. The MP `User_GUID` lives in `session.user.userGuid` (populated from the OIDC `sub` claim via `additionalFields` + `mapProfileToUser`). Every MP API lookup keyed by the signed-in user **must** use `userGuid`.

## Files
- `src/lib/auth.ts:22-30` — `user.additionalFields.userGuid` declaration
- `src/lib/auth.ts:82-86` — `mapProfileToUser` writes `userGuid: profile.id`
- `src/lib/auth.ts:69-75` — `getUserInfo` returns `id: profile.sub`
- `src/contexts/user-context.tsx:29` — canonical consumer cast
- `src/auth.test.ts:189-207` — test asserting the distinction

## Identity table

| Field | Where it comes from | Example value | Use for |
|---|---|---|---|
| `session.user.id` | Better Auth generates internally on user creation | `1gYSNMvy6OqAm9q3DdVhtKj3Czkxd0ms` (nanoid-style) | Auth guards only (`if (!session?.user?.id) throw ...`) |
| `session.user.userGuid` | MP OIDC `sub` claim → stored via `additionalFields` | `ab12cd34-ef56-7890-abcd-ef1234567890` (UUID) | **All MP API lookups** (`dp_Users.User_GUID`, profile fetching, `$userId` audit) |
| Account row `accountId` | `getUserInfo` returns `id: profile.sub`, Better Auth stores it on the account, **not** on the user | `ab12cd34-ef56-7890-abcd-ef1234567890` | Better Auth internal (account-to-user link) |

## Why `user.id` ≠ `sub`
Better Auth explicitly strips the incoming `id` when creating the user row, using the value only as the `accountId` on the linked account record. The user's `id` is a fresh server-generated token. This is why `mapProfileToUser` must write `userGuid` separately as an `additionalField`.

## `additionalFields.userGuid` declaration (verbatim)

```typescript
// src/lib/auth.ts — extracted to an exported const so a test can assert against it
export const userAdditionalFields = {
  userGuid: {
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

> ⚠️ **`userGuid` MUST keep `input: true`.** It is populated server-side from the
> OAuth profile via `mapProfileToUser`, not by user input. As of better-auth
> 1.6, the provider-profile field parser (`parseAdditionalUserInput` in
> `node_modules/better-auth/dist/db/schema.mjs`) no longer lets an
> `input: false` additionalField through when a value is supplied — in 1.6.11 it
> throws `"userGuid is not allowed to be set"`, so the OAuth-created user never
> gets a `userGuid`. Result: `session.user.userGuid` is `undefined` → blank
> avatar, dead user menu, broken MP profile lookups. There is no user-facing
> form that sets this field (genericOAuth only; no email/password signup or
> update-user endpoint), so `input: true` carries no practical risk here.
> Guarded by `src/auth.test.ts` (runs the real better-auth parser against the
> real `userAdditionalFields` config).

- `input: true` — see the warning above. The field is only ever set server-side by `mapProfileToUser`.
- `required: false` — the field is optional in the TS type, so consumers must null-check.

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
   the header avatar renders and the user menu opens with a working sign-out.
4. If `userGuid` is missing, inspect `parseAdditionalUserInput` (formerly
   `parseAdditionalUserInputFromProviderProfile`) in
   `node_modules/better-auth/dist/db/schema.mjs`.

## `mapProfileToUser` (verbatim)

```typescript
// src/lib/auth.ts:82-86
mapProfileToUser: (profile) => {
  return {
    userGuid: profile.id,
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

This is a Better Auth type-inference limitation as of `better-auth@^1.5.5`. Runtime behavior is correct.

## Test evidence

```typescript
// src/auth.test.ts:189-207
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
- **`userGuid` can be `undefined`** if the user row was created before `additionalFields.userGuid` was added, or if `mapProfileToUser` ran before a schema change. Always null-check.
- **`user.id` is still required** — use it only as a "session exists" sentinel (`if (!session?.user?.id)`), never for DB joins.

## Glossary candidates
- **`userGuid`** — the MP `User_GUID` stored on `session.user` via Better Auth `additionalFields`. Sourced from the OIDC `sub` claim by `mapProfileToUser`. Required for any MP API lookup of the signed-in user.

## Related docs
- `sessions.md` — session shape and why the cast is necessary
- `oauth-flow.md` — how `sub` flows into `userGuid`
- `../services/user-service.md` — `UserService.getUserProfile(userGuid)` consumer (if authored)
- `../contexts/user-provider.md` — canonical client-side consumer (if authored)
