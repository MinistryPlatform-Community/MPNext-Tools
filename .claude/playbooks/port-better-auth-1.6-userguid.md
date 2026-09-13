# Playbook: Upgrade Better Auth to 1.6+ Without Breaking MP Session Identity

You are Claude Code running in a repo built on **MPNext** (or forked from it) at
an **older Better Auth version** — 1.4.x or earlier — that now needs to catch up
to Better Auth **1.6.x+**. This playbook ports across the one breaking change
that silently destroys the app's connection to Ministry Platform, plus the
guardrails and docs that stop it regressing again.

If you already run Better Auth ≥1.6 and your avatar/user-menu work, you may only
need Phases 4–6 (the recovery guard + docs) — but **read Phase 1 first** to
confirm.

> **Note for MPNext-Tools itself:** this fix already shipped to `main`
> (`src/lib/auth.ts` declares `userGuid` with `input: true` and extracts
> `userAdditionalFields`; `src/auth.test.ts` has the guard; `/session-error`
> exists). This playbook is the portable, corrected record for **derived repos**
> that haven't caught up yet, and the reference to consult if any of that
> regresses here. It supersedes the earlier draft — the two factual corrections
> below (the function was **renamed**, and 1.6.11 **throws** rather than silently
> dropping) were verified against the installed `better-auth@1.6.11`.

**Outcome you're driving toward**

1. Better Auth is on 1.6.x+ **and** the `userGuid` user `additionalField` is
   declared `input: true` — so the MP `User_GUID` still lands on the session
   after the upgrade.
2. That field config is extracted to an exported `userAdditionalFields` const so
   a test can assert against the real thing.
3. A regression guard runs the **real** Better Auth field-parsing function
   against the **real** field config, failing if the flag is flipped back OR if a
   future Better Auth version changes provider-profile handling again.
4. `AuthWrapper` treats a session with no `userGuid` as unusable and routes it to
   a `/session-error` recovery page that can always sign the user out — instead
   of trapping them in a dead app with no logout control.
5. `AuthWrapper`'s guard branches are unit-tested.
6. The auth reference docs under `.claude/references/auth/` document the
   `input: true` requirement, a Better Auth **upgrade checklist**, the
   broken-session recovery flow, and the in-memory-adapter risk.

**Do not skip the discovery phase.** The exact Better Auth version, session
shape, and file layout in a derived repo may differ. The fix is portable; the
wiring is not. And **the only thing that actually proves this fix works is a real
OAuth login** — build/lint/unit tests all pass whether or not `userGuid` reaches
the session.

## Are you affected? (recognize the symptom)

After a Better Auth bump from 1.4.x → 1.6.x, users report one or more of:

- The header **avatar shows a generic placeholder** (never the MP profile photo).
- The **user menu does nothing when clicked** — no dropdown, and critically **no
  way to sign out**.
- The app otherwise seems logged in (no redirect to `/signin`).

Quick confirmation — sign in, then open `/api/auth/get-session` in the browser
and look at the `user` object:

```jsonc
{
  "user": {
    "name": "…", "email": "…", "firstName": "…", "lastName": "…",
    "id": "vKYoq…"            // ← Better Auth internal id (fine)
    // "userGuid": MISSING    // ← ROOT CAUSE: MP User_GUID never persisted
  }
}
```

If `user.userGuid` is **absent**, you have this bug. Proceed.

> In MPNext-Tools the `customSession` plugin only splits `user.name` into
> `firstName`/`lastName`; it does **not** resolve an MP `User_ID`. So the
> `"userId": null` secondary signal from the original write-up won't appear here
> — the reliable tells are the missing `userGuid`, the dead avatar, and the
> non-interactive user menu. A derived repo whose `customSession` *does* resolve
> `User_ID` from `userGuid` will additionally see `userId: null`.

## Background — the bug class you're preventing

MPNext authenticates against Ministry Platform via Better Auth's `genericOAuth`
plugin. Better Auth generates its own internal `user.id`; the MP `User_GUID` (the
OAuth `sub`) is carried on the session as a **custom user `additionalField`**
named `userGuid`, populated server-side from the OAuth profile via
`mapProfileToUser`. **Everything MP-related keys off `userGuid`** — the client
`UserProvider` calls `getCurrentUserProfile()` to load the profile
(avatar, name). No `userGuid` → no profile → dead avatar/menu.

> If your fork still declares that action as `getCurrentUserProfile(userGuid)`,
> fix it separately: a server action is a caller-shaped POST endpoint, so the
> parameter is an IDOR — any authenticated MP user can read another user's
> profile. Derive the GUID from the session inside the action. Unrelated to the
> 1.6 upgrade, but you will be looking right at the code.

**The breaking change:** As of Better Auth **1.6**, the function that pulls
additional fields off an OAuth provider profile stopped letting a field declared
`input: false` through when a value is supplied. Two things changed versus the
older behavior, both verified against `better-auth@1.6.11`:

1. **The function was renamed.** The old name
   `parseAdditionalUserInputFromProviderProfile` no longer exists. It is now
   **`parseAdditionalUserInput(options, user)`** — a two-arg signature (no
   separate `profile`/`action` params), exported from the **`better-auth/db`**
   subpath. Definition lives in `node_modules/better-auth/dist/db/schema.mjs`.

2. **It throws rather than silently dropping.** The shared `parseInputData`
   helper it delegates to now does this for an `input: false` field that has a
   value (paraphrased from `schema.mjs`):

   ```js
   function parseInputData(data, schema) {
     const action = schema.action || "create";
     const fields = schema.fields;
     const parsedData = Object.create(null);
     for (const key in fields) {
       if (key in data) {
         if (fields[key].input === false) {
           if (fields[key].defaultValue !== void 0 && action !== "update") {
             parsedData[key] = fields[key].defaultValue;
             continue;
           }
           if (data[key]) throw APIError.from("BAD_REQUEST", {
             ...BASE_ERROR_CODES.FIELD_NOT_ALLOWED,
             message: `${key} is not allowed to be set`,   // ← userGuid dies here
           });
           continue;
         }
         // …validator / transform / passthrough…
       }
     }
     return parsedData;
   }
   ```

The older MPNext config declared `userGuid` with `input: false` — intending "a
user can't set this during signup." That was correct on 1.4.x, where the field
still flowed through from the OAuth profile. On 1.6 the same flag now **also**
blocks the server-side `mapProfileToUser` mapping: because `mapProfileToUser`
supplies a `userGuid` value, the parser throws `"userGuid is not allowed to be
set"` during OAuth user creation, so `userGuid` is never written. (Depending on
the exact 1.6.x patch and call path this may surface as a thrown error rather
than a silent `{}` — either way the field never reaches the user record.) Build,
lint, and unit tests all pass. Only a real login reveals it.

This slipped into MPNext through a routine `npm audit fix` that bumped
`better-auth 1.4.18 → 1.6.x` (resolving GHSA-86j7-9j95-vpqj, a stored-XSS
advisory in the oidc-provider/mcp plugins — not directly exploitable here since
the app uses `genericOAuth` only). The lesson baked into this playbook: **auth
libraries can ship behavior changes across minor versions, and this repo's CI
cannot catch OAuth-runtime regressions.**

The fix has two independent parts, and you want both:

1. **Restore the field** — flip `userGuid` to `input: true` (it is populated
   server-side, never by user input, so this is safe here) and guard it with a
   test that exercises the real library function.
2. **Never trap the user again** — even if some future change breaks `userGuid`
   resolution, a session without it must still offer a way to sign out. Add a
   server-side guard + recovery page.

## Phase 1 — Discovery

Before changing anything, answer these by reading the repo. On Windows the Bash
tool runs Git Bash, so the POSIX commands below work; `node -p`/`node -e` are
cross-platform.

1. **What Better Auth version is installed vs. declared?**
   ```
   node -p "require('./node_modules/better-auth/package.json').version"
   node -p "require('./package.json').dependencies['better-auth']"
   ```
   - If installed is `< 1.6.0`, the upgrade hasn't happened yet — you're doing a
     proactive fix (good). If it's `≥ 1.6.0`, the bug may already be live.

2. **Where is the Better Auth server config, and how is `userGuid` declared?**
   - In MPNext: `src/lib/auth.ts`. Grep in a derived repo:
     `grep -rn "additionalFields\|betterAuth\|mapProfileToUser" src/`.
   - Find the `user.additionalFields.userGuid` block. Note its `input:` value.
   - If the field is named something other than `userGuid` (e.g. `mpUserGuid`),
     use that name consistently throughout.

3. **How is `userGuid` populated?** Confirm a `genericOAuth` config with
   `mapProfileToUser` returning `{ userGuid: profile.id }` (or equivalent), and a
   `getUserInfo` that returns `id: profile.sub`. If the derived repo uses a
   different provider plugin or maps the sub differently, adapt — but the
   `input:` fix applies to any additionalField populated from an OAuth profile.

4. **Is `customSession` present, and what does it do?**
   - In MPNext-Tools it **only** splits `user.name` into `firstName`/`lastName`
     (no API calls, no `User_ID` resolution). A derived repo may additionally
     resolve MP `User_ID` from `userGuid`; if so, a missing `userGuid` also makes
     that `null` — a useful extra signal.

5. **Where is the auth guard / layout wrapper?**
   - In MPNext-Tools: `src/components/layout/auth-wrapper.tsx`, used by
     `src/app/(web)/layout.tsx`. `/signin` lives at `src/app/signin/` — **outside**
     the `(web)` route group, so it isn't self-guarded.
   - Grep: `grep -rn "getSession\|AuthWrapper\|redirect(\"/signin\")" src/app src/components`.
   - Identify the route-group structure so the new `/session-error` page can live
     **outside** the guarded group (or it will redirect-loop).

6. **Where is the sign-out action?**
   - In MPNext-Tools: `handleSignOut` in `src/components/user-menu/actions.ts`
     (clears the Better Auth session, then redirects to MP's OIDC endsession
     endpoint). The recovery page reuses it.

7. **Testing framework + path alias.** MPNext uses Vitest with `vi.hoisted()`
   and `@/*` → `src/*`. Env vars for tests are stubbed in `src/test-setup.ts`
   (this matters — Phase 3's guard imports `@/lib/auth`, which executes
   `betterAuth(...)` at module load and reads `process.env`). Confirm in
   `vitest.config.ts` / `tsconfig.json` / `src/test-setup.ts`.

8. **Is there a database adapter?**
   ```
   grep -rn "database" src/lib/auth.ts
   node -e "const d={...require('./package.json').dependencies,...require('./package.json').devDependencies};console.log(Object.keys(d).filter(k=>/prisma|drizzle|kysely|mongodb|better-sqlite|pg|mysql2|adapter/i.test(k)).join('\n')||'(none)')"
   ```
   - No `database` key + no adapter package = **in-memory adapter** (this is the
     case in MPNext-Tools). Note it; it's a related fragility documented in
     Phase 6 (sessions die on every server restart / serverless cold start).

Write the answers down. Only proceed when each has an answer or is raised with
the user.

## Phase 2 — Bump Better Auth and flip `userGuid` to `input: true`

**1.** If not already on 1.6+, upgrade within your policy (e.g. `npm install
better-auth@^1.6`). Re-run `npm install` so the lockfile syncs.

**2.** In the auth server config, extract the additional-fields object to an
exported const and set `input: true`. In MPNext-Tools this is `src/lib/auth.ts`:

```ts
/**
 * Custom fields added to the Better Auth `user` record.
 *
 * `userGuid` (the MP User_GUID / OAuth `sub`) MUST keep `input: true`. It is
 * populated server-side from the OAuth profile via `mapProfileToUser`. As of
 * better-auth 1.6, the provider-profile field parser (`parseAdditionalUserInput`
 * in node_modules/better-auth/dist/db/schema.mjs) no longer lets an
 * `input: false` additionalField through when a value is supplied — in 1.6.11 it
 * throws "userGuid is not allowed to be set", so `userGuid` is never written to
 * the user record. That breaks every MP profile lookup (avatar, user menu). There
 * is no user-facing form that sets this field (genericOAuth only; no
 * email/password signup or update-user endpoint), so allowing input carries no
 * practical risk here. `src/auth.test.ts` guards this against future regressions.
 */
export const userAdditionalFields = {
  userGuid: {
    type: "string" as const,
    required: false,
    input: true,
  },
};
```

**3.** Reference it in the config:

```ts
const options = {
  // …
  user: {
    additionalFields: userAdditionalFields,
  },
  // …
} satisfies BetterAuthOptions;
```

**Why `input: true` is safe here:** the app uses `genericOAuth` only — there is
no email/password signup form and no exposed update-user endpoint that accepts
`userGuid`. The field is only ever set server-side from the verified OAuth
profile. If your derived repo *does* expose user-writable endpoints, prefer
populating the field via a `databaseHooks.user.create.before` hook instead, so
you can keep `input: false`. Otherwise `input: true` is the minimal, correct fix.

## Phase 3 — Add the field-persistence regression guard

The `input:` filter lives in Better Auth's own code, so the highest-value guard
runs the **real** library function against your **real** field config. It's
importable via the `better-auth/db` subpath.

**First, confirm the exact export name and behavior in *your* installed version**
— the function was renamed once already and could change again:

```
node --input-type=module -e "
import * as db from 'better-auth/db';
console.log(Object.keys(db).filter(k => /parse.*Input/i.test(k)).join('\n'));
"
```

In 1.6.11 this prints `parseAdditionalUserInput` (among others). Then prove it's
a real tripwire — `input: false` throws, `input: true` returns `{ userGuid }`:

```
node --input-type=module -e "
import { parseAdditionalUserInput } from 'better-auth/db';
const mk = (input) => ({ user:{ additionalFields:{ userGuid:{ type:'string', required:false, input } } } });
for (const input of [false, true]) {
  try { console.log('input:'+input+' =>', JSON.stringify(parseAdditionalUserInput(mk(input), {userGuid:'x'}))); }
  catch (e) { console.log('input:'+input+' => THROWS:', e.message || String(e)); }
}
"
```

Expected: `input:false => THROWS: userGuid is not allowed to be set` and
`input:true => {"userGuid":"x"}`.

Now add this to the auth config test (MPNext-Tools: `src/auth.test.ts`). The
assertion checks the **positive** outcome (`userGuid` survives), which is robust
whether the broken case throws or silently drops:

```ts
import { parseAdditionalUserInput } from 'better-auth/db';
import { userAdditionalFields } from '@/lib/auth';

// …inside a describe block…

/**
 * Regression guard for the better-auth 1.6 upgrade incident.
 *
 * 1.6 changed how additional user fields are parsed from the OAuth provider
 * profile: a field declared `input: false` no longer flows through when a value
 * is supplied (in 1.6.11 the parser throws "userGuid is not allowed to be set").
 * userGuid is populated server-side via mapProfileToUser, so input:false broke
 * it — session.user.userGuid became undefined, breaking every MP profile lookup.
 *
 * Runs the REAL better-auth parse function against our REAL field config, so it
 * fails if (a) someone flips userGuid back to input:false, or (b) a future
 * better-auth upgrade changes how provider-profile fields are parsed.
 */
it('persists userGuid from the OAuth provider profile (better-auth 1.6 guard)', () => {
  const guid = 'ab12cd34-ef56-7890-abcd-ef1234567890';
  const options = { user: { additionalFields: userAdditionalFields } };

  const parsed = parseAdditionalUserInput(options, { userGuid: guid });

  expect(parsed).toHaveProperty('userGuid', guid);
});
```

> If your installed version still exports the old
> `parseAdditionalUserInputFromProviderProfile` (three-arg
> `(options, profile, action)`), use that name and signature instead — the
> `node` probe above tells you which one you have. Do not assume; the whole point
> of this guard is to pin behavior to the version actually installed.

Run: `npm run test:run src/auth.test.ts` — must pass.

## Phase 4 — Add the broken-session recovery guard

The trap that made this so painful: with no `userGuid`, the header renders a
non-interactive fallback, so the user had **no sign-out control** and was stuck.
Add a defensive net so an unusable session always has an exit — independent of
the root cause.

**1.** In the auth guard (`src/components/layout/auth-wrapper.tsx`), add a
`userGuid` check after the existing no-session redirect. Note MPNext-Tools'
`AuthWrapper` also builds a `callbackUrl` from the `x-pathname` header — keep
that; just add the new check after it:

```tsx
export async function AuthWrapper({ children }: { children: React.ReactNode }) {
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });

  if (!session) {
    const originalPath = hdrs.get("x-pathname") || "/";
    const signinUrl = new URL("/signin", "http://placeholder");
    signinUrl.searchParams.set("callbackUrl", originalPath);
    redirect(`${signinUrl.pathname}${signinUrl.search}`);
  }

  // A session without a userGuid is unusable: every MP lookup keys off userGuid,
  // and without it the header avatar/menu never renders — which leaves the user
  // with no way to even sign out (the trap behind the better-auth 1.6 regression).
  // Route these broken sessions to a recovery page that CAN sign them out,
  // rather than rendering a dead app. /session-error lives outside the (web)
  // route group, so it is not wrapped by AuthWrapper and cannot redirect-loop.
  const userGuid = (session.user as { userGuid?: string | null }).userGuid;
  if (!userGuid) {
    redirect("/session-error");
  }

  return <>{children}</>;
}
```

**Why here, not the proxy or cookie deletion?**
- The proxy (`src/proxy.ts`) uses a fast cookie-*existence* check and doesn't
  decode the JWT, so it can't cheaply see `userGuid`.
- You can't delete the cookie during a Server Component render — Next.js only
  allows cookie mutation in actions/route handlers. That's exactly why recovery
  uses a server-action form button (below), not an auto-clear.
- `AuthWrapper` already calls `auth.api.getSession()`, so inspecting `userGuid`
  there is authoritative and free.

**2.** Create the recovery page **outside** the guarded route group so it can't
loop. In MPNext-Tools, `/session-error` sits beside `/signin`, outside `(web)`:
`src/app/session-error/page.tsx`:

```tsx
import { handleSignOut } from "@/components/user-menu/actions";

/**
 * Recovery page for authenticated-but-unusable sessions.
 *
 * AuthWrapper redirects here when a session exists but has no `userGuid`. Such a
 * session can't load an MP profile, so the header avatar/menu — and therefore
 * the normal sign-out control — never render. This page gives the user an
 * unconditional way out via `handleSignOut`. It lives outside the (web) route
 * group, so it is NOT wrapped by AuthWrapper and cannot cause a redirect loop.
 */
export default function SessionErrorPage() {
  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold mb-3">We couldn&apos;t load your account</h1>
        <p className="text-gray-600 mb-6">
          Your sign-in completed, but it didn&apos;t include the Ministry Platform
          user link we need to load your profile. Please sign out and sign in
          again. If this keeps happening, contact your administrator.
        </p>
        <form action={handleSignOut}>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md bg-[#344767] px-5 py-2.5 text-white font-medium hover:bg-[#2d3a5f] focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            Sign out and try again
          </button>
        </form>
      </div>
    </div>
  );
}
```

**3.** Confirm the proxy allows the page. In MPNext-Tools, `src/proxy.ts` makes
only `/api/auth/*` and `/signin` public; any other path passes through **when a
session cookie exists** and redirects to `/signin` when it doesn't. In the
failure case the (broken) session cookie *is* present, so `/session-error` is
reachable. If your derived repo's proxy is stricter, add `/session-error` to its
public paths.

## Phase 5 — Add the AuthWrapper guard tests

MPNext-Tools already has `src/components/layout/auth-wrapper.test.tsx` covering
the no-session → `/signin` + `callbackUrl` branches. **Two things to do:**

- **Fix the existing "authenticated" test.** It likely asserts a session like
  `{ user: { id: '1' } }` renders children — but that session now has no
  `userGuid`, so it will redirect to `/session-error` and the test will fail. Add
  a `userGuid` to it.
- **Add the two broken-session branches.**

The mock setup (mirror the existing file's `vi.hoisted()` block — `redirect` must
throw to mimic `next/navigation` halting execution):

```tsx
describe('when the session is missing userGuid', () => {
  it('redirects to /session-error when userGuid is absent', async () => {
    setHeaders({ 'x-pathname': '/tools/template' });
    mockGetSession.mockResolvedValueOnce({ user: { id: 'ba-id', name: 'No Guid' }, session: {} });

    await expect(AuthWrapper({ children: 'content' } as never))
      .rejects.toThrow('NEXT_REDIRECT:/session-error');
    expect(mockRedirect).toHaveBeenCalledWith('/session-error');
  });

  it('redirects to /session-error when userGuid is null', async () => {
    setHeaders({ 'x-pathname': '/tools/template' });
    mockGetSession.mockResolvedValueOnce({ user: { id: 'ba-id', userGuid: null }, session: {} });

    await expect(AuthWrapper({ children: 'content' } as never))
      .rejects.toThrow('NEXT_REDIRECT:/session-error');
    expect(mockRedirect).toHaveBeenCalledWith('/session-error');
  });
});

describe('when authenticated', () => {
  it('does not redirect and returns children', async () => {
    setHeaders({ 'x-pathname': '/tools/template' });
    mockGetSession.mockResolvedValueOnce({ user: { id: '1', userGuid: 'guid-1' }, session: {} });

    const result = await AuthWrapper({ children: 'content' } as never);
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });
});
```

> The existing file's `mockRedirect` throws `NEXT_REDIRECT:<url>`; match whatever
> prefix it already uses so the `.rejects.toThrow(...)` strings line up.

## Phase 6 — Update the auth reference docs

In MPNext-Tools the auth reference is a **folder** (`.claude/references/auth/`
with `README.md`, `user-identity.md`, `sessions.md`, `route-protection.md`,
`oauth-flow.md`), not a single `auth.md`. Grep for the stale `input: false`
snippets before editing: `grep -rn "input:\|additionalFields\|in-memory" .claude/references/auth/`.
Four edits:

1. **Correct the `additionalFields` snippet** in `user-identity.md` **and**
   `sessions.md` — both show `input: false`, which would lead the next person
   straight back into the bug. Change to `input: true` / the
   `userAdditionalFields` const, and add a warning:

   > ⚠️ **`userGuid` MUST keep `input: true`.** It is populated server-side from
   > the OAuth profile via `mapProfileToUser`, not by user input. As of
   > better-auth 1.6, the provider-profile parser strips/blocks any additional
   > field declared with `input: false` when a value is supplied (in 1.6.11 it
   > throws `"userGuid is not allowed to be set"`) → `session.user.userGuid`
   > becomes `undefined` → blank avatar, dead user menu. Guarded by
   > `src/auth.test.ts`.

2. **Add a "Better Auth Upgrade Checklist"** (put it in `user-identity.md` — the
   CRITICAL file — near the warning):

   > `npm audit fix` / `npm update` can bump better-auth across minor versions.
   > CI (build + lint + unit tests) does not exercise a real OAuth login, so
   > session/OAuth regressions ship silently. After any better-auth version
   > change:
   > 1. Read the changelog for `genericOAuth`, `customSession`,
   >    `additionalFields`, cookie-cache/session serialization, `mapProfileToUser`.
   > 2. `npm run test:run src/auth.test.ts` (the 1.6 guard).
   > 3. **Manual smoke test (required — nothing else catches this):** `npm run
   >    dev`, sign in, open `/api/auth/get-session`, confirm `user.userGuid` is
   >    non-null and the avatar/menu render. Sign out and log in **fresh**.
   > 4. If `userGuid` is missing, inspect `parseAdditionalUserInput` (formerly
   >    `parseAdditionalUserInputFromProviderProfile`) in
   >    `node_modules/better-auth/dist/db/schema.mjs`.

3. **Document the recovery flow** in `route-protection.md` — `AuthWrapper`
   redirects sessions with no `userGuid` to `/session-error` (outside the guarded
   route group), which offers an unconditional sign-out. List
   `src/app/session-error/page.tsx` in that doc's Files section and add a
   `/session-error` row to its path matrix. Guarded by `auth-wrapper.test.tsx`.

4. **Elevate the in-memory-adapter risk** (if Phase 1 found no `database`) in
   `sessions.md` Gotchas: with no adapter, sessions live only in-memory + cookies
   and are lost on every process restart. On serverless/Vercel, **every cold
   start has an empty session store**, so once the cookie cache expires a request
   on a fresh instance returns `null` and the user intermittently appears logged
   out. Recommend configuring a persistent adapter before production.

Bump each edited doc's `last_verified:` frontmatter date.

## Phase 7 — Verify

1. `npm run lint` — clean.
2. `npm run test:run` — all pass, including the new `auth.test.ts` guard and the
   `auth-wrapper.test.tsx` branches.
3. `npm run build` — succeeds and emits the `/session-error` route. (In
   MPNext-Tools the build first rebuilds the SQL install script, then runs
   Turbopack + TypeScript; the route list at the end should include
   `○ /session-error`.)
4. **Manual login smoke test — MANDATORY. This is the only step that actually
   proves the fix.** Steps 1–3 all pass whether or not `userGuid` reaches the
   session.
   - `npm run dev`, then **sign out and log in fresh** (existing sessions predate
     the corrected user-record shape).
   - Open `/api/auth/get-session`: confirm `user.userGuid` is present.
   - Confirm the header avatar renders and the user menu opens with a working
     sign-out.
5. **Optionally prove the recovery path:** temporarily force `userGuid` undefined
   (e.g. comment out the `mapProfileToUser` return in a throwaway branch), log
   in, confirm you land on `/session-error` with a working sign-out button.
   Revert.

## Phase 8 — Branch, commit, PR

Use the repo's conventions (see `.claude/skills`/commands for `branch-commit`,
`pr`). MPNext split this into two commits:

```
fix(auth): keep userGuid additionalField as input:true (better-auth 1.6 regression)

better-auth 1.6 changed how additional user fields are parsed from the OAuth
provider profile: a field declared input:false no longer flows through when a
value is supplied (in 1.6.11 the parser throws "userGuid is not allowed to be
set"). Our userGuid field (MP User_GUID / OAuth sub) is populated server-side
via mapProfileToUser, so input:false broke it: session.user.userGuid became
undefined, breaking every MP profile lookup — blank avatar, dead user menu.

- Flip userGuid to input:true; extract to exported userAdditionalFields const.
- Add a regression guard test running the real better-auth parse function
  (parseAdditionalUserInput from better-auth/db) against the real field config.
- Correct auth reference docs, add a Better Auth upgrade checklist and DB-adapter
  warning.
```

```
feat(auth): recover from sessions missing userGuid instead of trapping the user

A session without a userGuid rendered a dead header — no avatar/menu, no
sign-out control, user stuck. Add a defensive guard so an unusable session
always has an exit, independent of root cause.

- AuthWrapper: session with no userGuid → redirect to /session-error.
- New /session-error page: recovery screen with a handleSignOut form button,
  outside the (web) route group so it can't redirect-loop.
- auth-wrapper.test.tsx covers all guard branches.
```

Open the PR, request review, don't self-merge unless that's normal here.

## What "done" looks like

- [ ] Better Auth is on 1.6.x+ and `userGuid` is declared `input: true`, extracted
      to an exported `userAdditionalFields` const.
- [ ] `src/auth.test.ts` has a guard that runs the real provider-profile parser
      (from `better-auth/db`) against the real config and asserts `userGuid`
      survives.
- [ ] `AuthWrapper` redirects sessions with no `userGuid` to `/session-error`.
- [ ] `/session-error` exists **outside** the guarded route group and offers a
      working sign-out via `handleSignOut`.
- [ ] `auth-wrapper.test.tsx` covers no-session → `/signin`, no-userGuid →
      `/session-error`, null-userGuid → `/session-error`, and healthy → renders
      children.
- [ ] The auth reference docs have the `input: true` warning, upgrade checklist,
      recovery-flow note, and (if applicable) the in-memory-adapter warning.
- [ ] Lint, full test suite, and build (emitting `/session-error`) pass; **and a
      real fresh login shows `userGuid` populated and a working avatar/menu.**

If you hit something the playbook doesn't cover — a differently-named export, a
different provider plugin, a `customSession` that resolves `User_ID`, or an
unusual route-group layout — stop and ask the user before improvising.

## Appendix — Better Auth ↔ MP identity facts (mental-model upgrade)

- **`user.id` ≠ MP `User_GUID`.** Better Auth generates its own internal
  nanoid-style `user.id`. The OAuth `sub` becomes the `accountId` in the account
  table, **not** `user.id`. The MP `User_GUID` is carried separately as the
  `userGuid` additionalField. Use `userGuid` for all MP lookups; use `user.id`
  only for "is there a session" guards.
- **Where each session field comes from:**
  | Field | Source |
  | --- | --- |
  | `user.id` | Better Auth internal (generated) |
  | `user.userGuid` | `mapProfileToUser` ← OAuth `sub` — **the field this playbook protects** |
  | `user.name` | `getUserInfo`: `` `${given_name} ${family_name}` `` |
  | `user.image` | explicitly `undefined` — avatar comes from MP `Image_GUID`, not the session |
  | `user.firstName` / `lastName` | `customSession` splits `user.name` |
- **`customSession` runs on every `getSession()`** (including cookie-cache hits,
  because the plugin wraps the `/get-session` endpoint). Keep it cheap. In
  MPNext-Tools it does name-splitting only — no per-request MP fetch, no `User_ID`
  lookup.
- **Client type inference:** `customSessionClient<typeof auth>()` in
  `auth-client.ts` makes server-augmented fields visible on
  `authClient.useSession()`, but `userGuid` still needs a cast in most call sites
  because `genericOAuth`'s `additionalFields` aren't inferred — e.g.
  `(session?.user as { userGuid?: string })?.userGuid`.
- **The avatar/menu chain end-to-end:** `useSession()` → `session.user.userGuid`
  → `UserProvider` → `getCurrentUserProfile()` → `MPUserProfile`
  (`Image_GUID`, names) → `Header` renders the photo + `UserMenu`. Any break in
  `userGuid` collapses the whole chain to a non-interactive fallback
  (a generic `UserCircleIcon`, not text initials).
- **No database by default:** Better Auth uses an in-memory adapter when no
  `database` is configured. Sessions don't survive restarts/cold starts. This is
  the top follow-up refactor, independent of this playbook.
