---
title: User Menu + OIDC Sign-Out
domain: components
type: reference
applies_to:
  - src/components/user-menu/user-menu.tsx
  - src/components/user-menu/actions.ts
  - src/components/user-menu/index.ts
  - src/components/user-menu/actions.test.ts
symbols: [UserMenu, handleSignOut]
related:
  - ../auth/sessions.md
  - ../auth/oauth-flow.md
  - ../contexts/user-provider.md
last_verified: 2026-04-17
---

## Purpose
Dropdown menu that displays the signed-in MP user's name + email and triggers RP-initiated OIDC logout (Better Auth `signOut` → MP `/oauth/connect/endsession` → `post_logout_redirect_uri`).

## Files
- `src/components/user-menu/user-menu.tsx` — `"use client"` `UserMenu` component (Radix `DropdownMenu`)
- `src/components/user-menu/actions.ts` — `"use server"` `handleSignOut` server action
- `src/components/user-menu/index.ts` — barrel: `export { UserMenu } from './user-menu'`
- `src/components/user-menu/actions.test.ts` — 3 test cases for `handleSignOut`

## Key concepts
- `UserMenu` is a **client component** (`"use client"`) — wraps a caller-supplied trigger via `<DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>`.
- `userProfile` prop is typed `MPUserProfile` (`src/lib/providers/ministry-platform/types/user-profile.types.ts:1-13`) — expects the enriched MP profile, typically supplied by `UserProvider` / `useUser()`.
- Display name uses `Nickname || First_Name`, then `Last_Name` (`user-menu.tsx:49-50`).
- Sign-out is the only menu item currently (`userMenuItems` array, `user-menu.tsx:21-27`). Icon is `@heroicons/react/24/outline`'s `ArrowRightOnRectangleIcon`.
- `onClose?` optional callback fires before the action — used by callers that render the trigger inside a larger popover/sidebar to close the outer surface.
- `handleSignOut` is a **server action** that (1) clears the Better Auth cookie via `auth.api.signOut`, (2) `redirect(...)`s the browser to MP's `endsession`. No `id_token_hint` is sent.
- `post_logout_redirect_uri` is taken from `BETTER_AUTH_URL || NEXTAUTH_URL || 'http://localhost:3000'` — must be pre-registered on the MP OAuth client.

## API / Interface

```typescript
// src/components/user-menu/user-menu.tsx:15-19
interface UserMenuProps {
  onClose?: () => void;
  userProfile: MPUserProfile;
  children: React.ReactNode;
}

export function UserMenu({ onClose, userProfile, children }: UserMenuProps);
```

```typescript
// src/components/user-menu/actions.ts:7
export async function handleSignOut(): Promise<void>;
```

- `handleSignOut` throws `Error('MINISTRY_PLATFORM_BASE_URL is not configured')` when the env var is unset (`actions.ts:14-16`).
- It never returns normally — either throws or calls `redirect(...)` which throws a `NEXT_REDIRECT`.

## How it works

Sign-out call chain:

```
UserMenu.handleItemClick("signout")          // user-menu.tsx:30-37 (client)
  → onClose?.()                              // optional caller close-hook
  → handleSignOut()                          // actions.ts:7 (server action)
      → auth.api.signOut({ headers: await headers() })   // actions.ts:9-11
      → check process.env.MINISTRY_PLATFORM_BASE_URL     // actions.ts:13-16
      → redirect(
          `${baseUrl}/oauth/connect/endsession` +
          `?post_logout_redirect_uri=${BETTER_AUTH_URL || NEXTAUTH_URL || localhost}`
        )                                    // actions.ts:18-23
  → Browser follows 307 → MP endsession
  → MP ends its SSO session, 302s back to post_logout_redirect_uri
```

- `await headers()` — required in Next.js 16 (dynamic APIs are async).
- `redirect(...)` uses `next/navigation` and throws internally; do not wrap in `try/catch` that swallows errors.

## Usage

Nothing in `src/` currently imports `UserMenu` (verified via `Grep` for `UserMenu` in `*.tsx`; only self-references). It is a library-style component exposed via the barrel for future composition. A typical call site would be:

```tsx
// hypothetical call site
import { UserMenu } from '@/components/user-menu';
import { useUser } from '@/contexts';

function AppHeader() {
  const { userProfile } = useUser();
  if (!userProfile) return null;
  return (
    <UserMenu userProfile={userProfile}>
      <button>{userProfile.Nickname || userProfile.First_Name}</button>
    </UserMenu>
  );
}
```

Real verbatim sign-out action:

```typescript
// src/components/user-menu/actions.ts:7-24
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

## Tests

`src/components/user-menu/actions.test.ts` — 3 cases:

| Case | Asserts |
|------|---------|
| `should call auth.api.signOut` | `mockSignOut` called with `{ headers: <Headers> }` |
| `should redirect to MP end session URL` | `redirect(...)` called with URL containing `https://mp.example.com/oauth/connect/endsession` and URL-encoded `post_logout_redirect_uri=https%3A%2F%2Fmyapp.example.com` |
| `should throw when MINISTRY_PLATFORM_BASE_URL is missing` | `handleSignOut()` rejects with `'MINISTRY_PLATFORM_BASE_URL is not configured'` |

Mocks use `vi.hoisted()` for `mockSignOut` / `mockRedirect` (required pattern — see `../testing/setup.md`).

No test exists for the `UserMenu` client component itself (rendering / `handleItemClick` wiring). See TODO.

## Gotchas
- **Post-logout redirect URI must be pre-registered on the MP OAuth client.** If `BETTER_AUTH_URL` is not in MP's allowed post-logout URIs, MP will ignore the param and the user lands on MP's generic post-logout page — subsequent navigation to the app sees a stale SSO session and silently re-authenticates, producing a perceived logout loop. Enforced nowhere in code; configuration-only. (`src/components/user-menu/actions.ts:19-21`)
- **Localhost fallback ships to production.** If neither `BETTER_AUTH_URL` nor `NEXTAUTH_URL` is set, sign-out redirects to `http://localhost:3000` regardless of environment. (`src/components/user-menu/actions.ts:20`)
- **No `id_token_hint` is sent on `endsession`** (optional in OIDC spec). Pre-registration of `post_logout_redirect_uri` is the only allowlist mechanism. (`src/components/user-menu/actions.ts:18-23`, cross-ref `../auth/oauth-flow.md`)
- **`UserMenu` is unused in the current tree.** Shipping a new layout needs to wire it up; it will not appear by virtue of the barrel alone.
- **`Email_Address` can be `null`** per `MPUserProfile`, but `user-menu.tsx:52` renders `{userProfile.Email_Address}` directly — React renders `null` as empty, so there's no crash, but the email line collapses silently. (`src/components/user-menu/user-menu.tsx:52`)

## Related docs
- `../auth/oauth-flow.md` — full OIDC sign-in + `endsession` logout flow (this action is one half)
- `../auth/sessions.md` — what `auth.api.signOut` clears (JWT cookie, `cookieCache`)
- `../contexts/user-provider.md` — source of the `MPUserProfile` prop passed to `UserMenu`
- `README.md` — components domain index
