---
title: /home redirect-only page sits inside (web), forcing auth roundtrip before redirect
severity: low
tags: [refactor, perf]
area: routing
files: [src/app/(web)/home/page.tsx]
discovered: 2026-04-17
discovered_by: routing
status: open
---

## Problem
`src/app/(web)/home/page.tsx` is a three-line redirect to `/` but lives inside the `(web)` route group. Because `(web)/layout.tsx` mounts `AuthWrapper`, hitting `/home` triggers a full server-side session validation (`auth.api.getSession`) before the redirect runs. For a pure redirect, this is wasted work.

## Evidence
- `src/app/(web)/home/page.tsx`:
  ```typescript
  import { redirect } from 'next/navigation';
  export default function Home() {
    redirect('/');
  }
  ```
- `src/app/(web)/layout.tsx:34` wraps every child in `AuthWrapper`

## Proposed fix
Two options:

1. **Move the redirect to a `redirects()` entry in `next.config.ts`** — fastest path, no React render:
   ```typescript
   async redirects() {
     return [{ source: '/home', destination: '/', permanent: true }];
   }
   ```
2. **Or**, if the /home route is vestigial (left over from an earlier layout), delete it and audit for stale `<Link href="/home">` references via `Grep`.

## Impact if not fixed
- Minor perf hit per `/home` hit (one extra session validation + redirect). Probably rare in practice.
- Dead code risk: it's unclear whether anything still links to `/home` — if nothing does, delete it.
