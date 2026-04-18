---
title: App Router layout
domain: routing
type: reference
applies_to: [src/app/layout.tsx, src/app/(web)/layout.tsx, src/app/(web)/page.tsx, src/app/(web)/home/page.tsx, src/app/(web)/tools/layout.tsx, src/app/(web)/error.tsx, src/app/signin/page.tsx, src/app/api/auth/[...all]/route.ts, src/app/providers.tsx]
symbols: [RootLayout, WebLayout, ToolsLayout, Home, SignIn, Providers]
related: [proxy.md, ../auth/README.md, ../components/README.md, ../contexts/README.md]
last_verified: 2026-04-17
---

## Purpose
Next.js 16 App Router tree. A `(web)` route group gates all authenticated pages with `AuthWrapper` + client `Providers`; `/signin` and `/api/auth/*` sit outside the group so they render without a session.

## Files
- `src/app/layout.tsx` — root layout, imports `globals.css`, renders `<html lang="en"><body>{children}</body></html>`
- `src/app/(web)/layout.tsx` — group layout; wraps children in `AuthWrapper` then `Providers`, injects Geist fonts, sets `metadata` + `viewport`
- `src/app/(web)/page.tsx` — dashboard `/` — 5 tool cards (Template, Template Editor, Address Labels, Group Wizard, Field Management)
- `src/app/(web)/home/page.tsx` — `/home` → `redirect('/')`
- `src/app/(web)/tools/layout.tsx` — tools sub-layout, `flex flex-col h-screen bg-gray-50`
- `src/app/(web)/tools/<tool>/page.tsx` — per-tool entry (`addresslabels`, `fieldmanagement`, `groupwizard`, `template`, `templateeditor`)
- `src/app/(web)/error.tsx` — `"use client"` error boundary for the group
- `src/app/signin/page.tsx` — public OAuth redirect page
- `src/app/api/auth/[...all]/route.ts` — Better Auth catch-all handler (`export const { GET, POST } = toNextJsHandler(auth)`)
- `src/app/providers.tsx` — `"use client"` composition (`UserProvider` + sonner `Toaster`)

## Key concepts
- **Route group `(web)`** — parens in directory name group routes without contributing a URL segment; used to apply a shared layout (auth) to everything under it without affecting the URL
- **Public routes sit outside `(web)`** — `src/app/signin/` and `src/app/api/` are siblings of `(web)`, so they skip `AuthWrapper`
- **Nested layouts compose top-down** — `RootLayout` → `WebLayout` (inside `(web)`) → `ToolsLayout` (inside `(web)/tools/`)
- **Root layout is async** (`async function RootLayout`) — `src/app/layout.tsx:3`
- **WebLayout is async** (`async function WebLayout`) — `src/app/(web)/layout.tsx:28`
- **Error boundary per group** — `src/app/(web)/error.tsx` only catches errors inside `(web)`
- **Named-exports rule does NOT apply to route files** — Next.js App Router requires `export default` for `layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`, and `route.ts` GET/POST (these are named exports on route handlers)

## Route tree
```
/
├── /                    # (web)/page.tsx — dashboard
├── /home                # (web)/home/page.tsx — redirects to /
├── /tools/template
├── /tools/templateeditor
├── /tools/addresslabels
├── /tools/groupwizard
├── /tools/fieldmanagement
├── /signin              # public
└── /api/auth/*          # public (Better Auth catch-all)
```

## API / Interface

`src/app/(web)/layout.tsx:28-44`:
```typescript
export default async function WebLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthWrapper>
      <Providers>
        <div className={`flex flex-col ${geistSans.variable} ${geistMono.variable}`}>
          <main className="flex-1">
            {children}
          </main>
        </div>
      </Providers>
    </AuthWrapper>
  );
}
```

`src/app/(web)/home/page.tsx`:
```typescript
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/');
}
```

`src/app/api/auth/[...all]/route.ts`:
```typescript
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

`src/app/providers.tsx`:
```typescript
"use client";

import { UserProvider } from "@/contexts/user-context";
import { Toaster } from "sonner";
import { ReactNode } from "react";

export function Providers({ children }: ProvidersProps) {
  return (
    <UserProvider>
      {children}
      <Toaster position="bottom-right" richColors />
    </UserProvider>
  );
}
```

## How it works
- Request hits `proxy.ts` → cookie check → if ok, Next.js routes to matching segment
- If segment lives under `(web)/`: `RootLayout` → `WebLayout` (mounts `AuthWrapper`) → (optional `ToolsLayout`) → `page.tsx`
- `AuthWrapper` calls `auth.api.getSession({ headers: await headers() })`; missing session triggers `redirect('/signin?callbackUrl=...')`
- Once session validated, `Providers` mounts client context tree (`UserProvider` fetches MP profile client-side)
- `/signin` skips the whole group tree — rendered under `RootLayout` only

## Next.js 16 routing notes
- **Dev output path**: `next dev` writes to `.next/dev` (not `.next`) — see `proxy.md` and Next.js 16 upgrade guide
- **Turbopack is default** for both `dev` and `build` — no `--turbopack` flag
- **Async dynamic APIs** — `params`, `searchParams`, `cookies()`, `headers()` must be `await`ed (see `AuthWrapper`: `await headers()`)
- **ESLint**: `next lint` was removed; `package.json` uses `"lint": "eslint ."` with flat config in `eslint.config.mjs`

## Usage
- Add a tool route: create `src/app/(web)/tools/<slug>/page.tsx` — inherits `WebLayout` (auth) + `ToolsLayout` (gray bg)
- Add a public route: create a sibling of `(web)/` (e.g. `src/app/public-thing/page.tsx`) **and** whitelist in `src/proxy.ts` — see `proxy.md`

## Gotchas
- Forgetting to `await` `headers()` / `cookies()` / `params` / `searchParams` — Next.js 16 enforces async; sync access throws
- Adding a new public route without updating the `proxy.ts` whitelist — request gets redirected to `/signin`
- Placing a public route under `(web)/` — it'll be blocked by `AuthWrapper` even if proxy lets it through

## Related docs
- `proxy.md` — edge gate behavior and public paths
- `../auth/README.md` — `AuthWrapper`, session shape, OAuth flow
- `../contexts/README.md` — `UserProvider` loaded inside `Providers`
