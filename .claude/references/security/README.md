# Security Reference

Entry point for the authorization model, the endpoint surface, and the header
policy. Read this before changing anything under `src/lib/auth.ts`,
`src/proxy.ts`, `src/app/api/auth/`, or `src/services/authorizationService.ts`.

| Question | Read |
|---|---|
| Who is allowed to use a tool, and where is that enforced? | [Authorization policy](#authorization-policy) |
| Which Better Auth endpoints are reachable? | [Endpoint surface](#endpoint-surface) |
| Why is `style-src 'unsafe-inline'`? Can I tighten it? | [Headers and CSP](#headers-and-csp) |
| How is a user identified, and why is their email `@mp.invalid`? | [Identity](#identity) |
| What was fixed, and what is still open? | [Findings](#findings) |

---

## Authorization policy

> **Any MP user may sign in and use the app shell. The tools require an MP
> security role.**

Sign-in is deliberately **not** role-gated — no check in `getUserInfo`,
`mapProfileToUser`, `customSession` or `AuthWrapper` — so a role-less user still
gets a session, the header, the user menu and a **working sign-out**. Refusing
at sign-in would strand them in the app with no way out. They are redirected
from `/tools/*` to `/no-access`, which renders inside the shell.

### Why authentication is not enough

MP's OIDC endpoint authenticates **any** `dp_Users` record, and this app fetches
all MP data with its own client-credentials service account
(`dataplatform/scopes/all`). **MP's per-user record security therefore never
applies to what this app returns.** A Better Auth session proves only that
*some* MP user signed in.

The sharpest surface here is field management: `updatePageFieldOrder` rewrites
`dp_Page_Fields` for the **entire MP domain**, not just the caller.

### Three enforcement layers

A server action is a callable POST endpoint whether or not its page ever
rendered, so the gate runs at every layer that is independently reachable:

| Layer | File | Call |
|---|---|---|
| Page | `src/app/(web)/tools/layout.tsx` | `hasSecurityRole()` then `redirect("/no-access")` |
| Action | `src/components/<feature>/actions.ts` | `requireAccess()` wrapping `requireSecurityRole()` |
| Service | `src/services/*.ts` | `requireSecurityRole()` on **every** method, reads included |

A layout gate covers its child pages for free — React renders the layout first
and only renders `children` once it returns.

### `AuthorizationService` design points

- **Two entry points.** `requireSecurityRole()` throws `UnauthorizedError` and
  logs a structured denial — it is the enforcement point, and it returns the
  acting MP `User_ID`. `hasSecurityRole()` returns a decision without logging —
  for UI affordances and the layout redirect, **never** as enforcement.
- **Per-request memoization via React `cache()`** — not module-level, not TTL.
  The gate runs up to three times per request; this collapses that to one MP
  read. Nothing crosses requests, which is what keeps a role revoked in MP
  effective on the user's *very next* request.
- **Fails closed.** No session, no `userGuid`, no `dp_Users` row, or no role
  means refused.
- **Infrastructure failures throw; they do not return `permitted: false`.** A
  caller must never mistake "MP is down" for "this user is not allowed".
- **Config, not code:** `MP_SECURITY_ROLES` (comma-separated, case-insensitive).
  Blank or unset means "any MP security role will do". Tighten without a deploy.

### Write attribution

`$userId` has exactly **one** source: the gate's return value, applied in the
**service**. Actions never assemble it, and no server action accepts a `userId`
parameter. `ToolService.getSelectionRecordIds` takes its `@UserID` from the gate
for the same reason — a selection belongs to a specific MP user, so accepting one
from the payload would let any caller read someone else's selection.

### Carve-outs

Four call sites use a plain session check because they touch no per-person MP
data. Each documents why **in-file**. Adding a fifth needs the same
justification, in the file, in writing.

- `components/layout/auth-wrapper.tsx` — it *is* the session gate
- `components/shared-actions/user.ts` — the user's own profile; enforced by the
  signature (no parameter to forge), not just asserted
- `components/shared-actions/domain.ts` — the domain-wide time zone (one string)
- `components/dev-panel/panels/require-dev-session.ts` — dev-only
  (`NODE_ENV !== "production"`), and the services it calls gate anyway

---

## Endpoint surface

`toNextJsHandler(auth)` mounts roughly thirty Better Auth endpoints. This app's
browser client calls **three**. `src/app/api/auth/[...all]/route.ts` is
therefore **deny-by-default**:

```
GET   /get-session
GET   /callback/ministryplatform
POST  /sign-in/social
```

These were read off the installed version, not assumed — **and they changed in
Better Auth 1.7.** The genericOAuth plugin no longer mounts endpoints of its
own; it registers its providers as first-class **social** providers, so sign-in
goes through the **core** `/sign-in/social` and `/callback/:id` endpoints.

On 1.6 the paths were `POST /sign-in/oauth2` and
`GET /oauth2/callback/:providerId`, and `/oauth2/link` existed as the plugin's
account-linking endpoint. None of those exist any more, and all three now 404.

The `ministryplatform` segment is the `providerId` from
`ministryPlatformProviderConfig`. The provider id, this allowlist entry and the
sign-in page's `signIn.social({ provider })` must all agree — `src/auth.test.ts`
pins that.

**Re-enumerate this list on every Better Auth upgrade.** A stale entry fails
closed — sign-in 404s loudly rather than silently opening something — which is
the behaviour to want, but it is still an outage.

Everything else returns a plain 404 without reaching Better Auth — including any
endpoint a **future** Better Auth version adds. That is the point of
deny-by-default, and it is why this is the *primary* control, with
`disabledAuthPaths` in `src/lib/auth.ts` as defence in depth.

- `/sign-out` is deliberately **absent**: sign-out runs server-side through
  `auth.api.signOut`, which never crosses this HTTP boundary. Moving it to
  `authClient.signOut()` would 404 — loudly, which is the point.
- `/oauth2/link` no longer exists in 1.7 (it was genericOAuth's account-linking
  endpoint); core `/link-social` and `/unlink-account` are deliberately absent.
- **`onAPIError.errorURL` is set to `/auth-error`.** Better Auth's default is
  `/api/auth/error`, which the allowlist now 404s — without this, a failed
  sign-in dead-ends on a blank 404.
- **`/auth-error` is allowlisted as public in `src/proxy.ts`.** Without it an
  unauthenticated visitor bounces to `/signin`, which auto-starts OAuth again,
  looping forever on the very failure the page exists to explain.

The error page maps the codes Better Auth **actually** emits (read off the
installed version — e.g. the literal is `oAuth_code_missing`, with that exact
capitalization) and **never renders `error_description`**, which is
attacker-influencable text arriving on a redirect. Its lookup is a `Map`, not an
object literal: the key is an arbitrary query value, and `?error=constructor`
against a plain object returns an inherited `Object.prototype` member.

---

## Headers and CSP

Split across two files, and the split is not arbitrary:

| Where | Headers | Why there |
|---|---|---|
| `next.config.ts` on `/(.*)` | `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS (prod only) | Request-independent, and reaches `/api` plus the static paths the proxy matcher skips |
| `src/proxy.ts` via `src/lib/security-headers.ts` | `Content-Security-Policy` | The nonce must be fresh per request; a build-time value is a constant an attacker reads off any page |

Anti-framing is expressed **twice on purpose** — `X-Frame-Options` reaches the
routes the proxy skips, `frame-ancestors` covers the rest. They are not both CSP
headers: two `Content-Security-Policy` headers on one response are enforced as
an **intersection**, which is miserable to debug.

HSTS is production-only, with **no `preload`** — that is a one-way submission to
a browser-vendor list and the deploying church's call, not a repo default.

### Three loosenings — do NOT "tighten" these into an outage

1. **`style-src 'unsafe-inline'`, with NO nonce.** Radix's dialog pulls in
   react-remove-scroll, which locks body scroll by **injecting a `<style>`
   element** at runtime. That is an element, not an attribute, so
   `style-src-attr` never applies. A nonce cannot help (the element is created
   by script long after the server chose the nonce) and a hash cannot either
   (the content embeds the computed scrollbar width, so it varies by platform
   and zoom). **The nonce must stay out of this directive** — CSP3 browsers
   ignore `'unsafe-inline'` whenever a nonce sits beside it, which is exactly
   the trap that produces a policy that looks correct and breaks every dialog.
   `src/app/global-error.tsx` also depends on this; the two are coupled.
2. **`form-action` includes the MP origin.** Sign-out is a form-driven server
   action ending in a redirect to MP's endsession endpoint, and browsers apply
   `form-action` to the **whole redirect chain**, not just its first hop.
3. **`img-src` includes the MP origins**, for contact photos served from MP.

### Nonces force dynamic rendering

Next reads the nonce off the **incoming request headers** at render time, so the
proxy sets the CSP on the request *and* the response. A page prerendered at
build time has no request, therefore no nonce, therefore a blocked bootstrap
script and no hydration.

`/signin` and `/session-error` are pinned with `export const dynamic = "force-dynamic"`.
**The trap: route segment config is silently IGNORED in a `"use client"` module** —
it sits inert, the build still reports the route as static, and the page still
fails to hydrate with nothing to explain why. That is why `/signin`'s body lives
in `sign-in-content.tsx` and its `page.tsx` is a server component.
`src/app/signin/page.test.tsx` pins **both** halves — the export, and the absence
of the directive.

`/_not-found` remains static and nonce-less. Accepted: it is Next's built-in 404
with no interactivity to lose.

### `CSP_ENFORCE`

**Enforces by default.** Only the exact string `"false"` drops to report-only, so
a typo fails **loud** (a too-strict header) rather than **silent** (no policy at
all). Report-only is the unusual state you switch on to diagnose a violation.

Report-only is a necessary step before enforcing, not a sufficient one: dev's
`'unsafe-eval'` / `'unsafe-inline'` relaxations hide violations, and an enforced
policy can block things a clean report-only pass never flagged. Walk sign-in,
sign-out, images and **every Radix surface** (dropdown, dialog, select, tooltip)
against a production build before calling it done.

---

## Identity

**Ministry Platform enforces no uniqueness on email addresses** — households
routinely share one across contacts, each of whom may hold a `dp_Users` login.
Better Auth, however, keys identity on email: `handleOAuthUserInfo` looks a user
up by `userInfo.email` **before** it considers the provider account id.

**Better Auth 1.7 narrowed this but did not close it.** `handleOAuthUserInfo`
now resolves the provider account key first (`findAccountOwnerByKey`), and only
falls back to `findUserByEmail` when no account matches — which is exactly what
happens on every **first** sign-in for a given `sub`. The email fallback, and
the implicit link it can perform, are still there. This fix remains
load-bearing, not redundant.

So this app keys on the only identifier MP guarantees unique — the OIDC `sub`
(the MP `User_GUID`) — via a synthetic address:

```
<user_guid>@mp.invalid        # mp.invalid is an RFC 2606 reserved TLD
```

- The **real** address is preserved separately as `mpEmail`, for display only.
  Nothing in the UI reads `session.user.email`; the header uses
  `MPUserProfile.Email_Address` straight from MP.
- `account.accountLinking.enabled = false` is the second lock.
- `emailVerified` reports the provider's actual claim instead of asserting
  `true`.
- Side benefit: MP does not require a user to have an email at all, and Better
  Auth hard-fails the callback with `email_is_missing` when the profile yields
  none. Such users previously could not sign in.

In genericOAuth this works because `mapProfileToUser`'s `email` overrides
`userInfo.email` **before** `handleOAuthUserInfo` runs — verified against the
installed version, not assumed.

### `accountSubject` — the provider account key (new in 1.7)

Better Auth 1.7 stopped deriving the provider account id from `profile.id` (the
user-info type now declares `id?: never`) and derives it from
`accountSubject(...)` instead. genericOAuth's default is
`isOidc ? profile.sub : profile.id`, where `isOidc` is inferred **at boot** from
whether the discovery fetch returned `id_token_signing_alg_values_supported`.

Two consequences this app handles explicitly:

1. **`getUserInfo` returns `sub`, not `id`.** Returning the 1.6 `id` shape
   leaves `sub` undefined, and `resolveOAuthAccountKey` throws
   `OAUTH_ACCOUNT_SUBJECT_INVALID` **after a successful token exchange** —
   surfacing as `/auth-error?error=unable_to_get_user_info`, which reads like a
   userinfo fetch failure rather than an identity-mapping one.
2. **`accountSubject` is declared explicitly**, so the account key does not
   depend on a boot-time network fetch succeeding. A transient discovery failure
   would otherwise silently switch which field identifies the user.

`mapProfileToUser` receives the **raw** object `getUserInfo` returned, so it
reads `sub` for the same reason. `src/auth.test.ts` pins all three, and the
guard is verified to fail against the 1.6 shape.

### `disableIdTokenNonceBinding` — required for Ministry Platform

As of 1.7, any provider configured with a `discoveryUrl` that publishes a JWKS
binds the `id_token` to the authorization request **by default**: Better Auth
sends a server-generated `nonce` and rejects a callback whose `id_token` does
not echo it (OIDC Core 1.0 §3.1.3.7). **MP omits the claim**, so every sign-in
would fail with `unable_to_get_user_info`.

The failure is inverted from the obvious reading, which is what makes it cost
hours: sign-in succeeds **only when the boot-time discovery fetch failed**,
because that leaves the id_token config undefined and skips verification
entirely. A *working* discovery means a *broken* sign-in.

What this gives up is binding the id_token to that particular authorization
request. Signature, issuer and audience are still verified against MP's JWKS,
and residual replay risk is mitigated by the `state` cookie check, by this being
a confidential client exchanging the code with a client secret, and by PKCE.

`src/auth.test.ts` pins this flag and `pkce`, because both fail as a broken
sign-in for every user rather than as a type error.

### `userGuid` must stay `input: true`

As of Better Auth 1.6, `parseAdditionalUserInputFromProviderProfile` strips any
additional field declared `input: false` **before** the user record is created —
so `input: false` silently drops `userGuid` and breaks every MP lookup (avatar,
user menu, `User_ID` resolution). But `input: true` also means the field is
writable through `/update-user`.

**No value of `input` satisfies both.** The control is at the endpoint layer
(the allowlist, plus `disabledAuthPaths`), not the flag. A field-level
`validator.input` is not an alternative either: it runs on the provider-profile
path too, so it can constrain the GUID's *shape* but cannot tell
`mapProfileToUser` from an attacker sending a well-formed GUID.

---

## Logging

The rule: **identifiers and shape, never content.** `no-console` is enforced by
ESLint across `src/` (`warn` and `error` only; generator scripts exempt). The MP
provider's `logger` has **no `debug` channel** — it previously dumped `$filter`
params, stored-procedure parameters, PUT bodies and full result sets. Being
gated on `NODE_ENV !== "production"` was not enough: developer machines and any
non-production deployment still wrote member PII to a terminal or aggregator.

Response bodies are stripped from **thrown error messages** as well as logs: a
thrown message reaches error reporters and client-visible action results, so
appending an MP response body leaked record content and `$filter` strings
everywhere at once.

Structured events alerts can grep on:

| Event | Emitted when |
|---|---|
| `mp.read.unauthorized` | role gate refuses a read |
| `mp.write.unauthorized` | role gate refuses a write |
| `mp.write.non_user` | a write ran with no resolved acting user |
| `mp.request.failed` | a non-2xx MP HTTP response |
| `auth.userinfo.invalid_sub` | MP userinfo returned no usable `sub` |
| `auth.userinfo.fetch_failed` | MP userinfo endpoint returned non-2xx |
| `ui.render.error` | a React error boundary caught a render error |

---

## Error boundaries

Placement is the whole design — `error.tsx` never wraps the layout of its **own**
segment, so one boundary cannot do every job:

| File | Catches | Why separate |
|---|---|---|
| `src/app/(web)/error.tsx` | anything below the `(web)` layout | renders **inside** the shell, so the header and **sign-out survive** |
| `src/app/error.tsx` | `/signin`, `/session-error`, `/auth-error` | those routes have no shell |
| `src/app/global-error.tsx` | a throw in the root layout itself | replaces it; imports nothing from the app |

Two details that bite:

- **Next 16 renamed the prop to `retry`** (it was `reset`). `reset` still exists
  but only clears error state without re-fetching, so a boundary wired to the
  stale name renders fine and its button **silently does nothing**.
  `src/app/(web)/error.test.tsx` pins that `retry` is what gets called.
- **Log and render identifiers only, never `error.message`.** These boundaries
  sit above components rendering MP names and household data; unlike a
  controlled catch around an HTTP call, a render error's message is not
  guaranteed to be content-free. `digest` is the join key to the un-redacted
  server log.

`npm run build` is what proves Next accepts these file conventions. A unit test
of the component cannot.

---

## Findings

Closed in this repo, from the upstream MPNext hardening playbook
(commits `436466d..5bc505a`):

| ID | Severity | What it was |
|---|---|---|
| F-UPDATE-USER | Critical | Any authenticated user could POST their own session a different MP `User_GUID` |
| F2 | High | Two MP users sharing an email merged onto one Better Auth user |
| F1 | High | Reads gated on "a session exists", which proves nothing |
| F5 | Medium | Member PII, `$filter` strings and response bodies in logs and thrown messages |
| F9 | Medium | No CSP, no HSTS, no anti-framing, no Referrer-Policy |
| F3 | Medium | Open redirect via `?callbackUrl=` on `/signin` |
| F7 | Low | ~30 Better Auth endpoints publicly mounted; OAuth errors on a third-party page |
| F8 | Low | **Resolved as WONTFIX.** PKCE stays `false`: MP advertises `S256` in discovery but rejects the token exchange with `invalid_grant`. See below. |

**Not applicable to this repo:** F4 (no `Made_By` / contact-log feature, and
attribution was already server-authoritative — no server action ever accepted a
`userId` parameter), F10 and F11 (no `ContactService`; `getMpTimezone` is a
documented carve-out).

### F8 (PKCE) — closed as not-possible, with evidence

The upstream playbook lists PKCE as "likely can be flipped to `true`" because
MP's discovery document advertises
`code_challenge_methods_supported: ["plain", "S256"]`. **The discovery document
is wrong.** Enabling it produces:

1. `POST /sign-in/social` → 200, authorize URL carries `code_challenge_method=S256`
2. MP authenticates the user and redirects back **with a valid code**
3. Token exchange → `{ error: 'invalid_grant', status: 400 }`
4. User lands on `/auth-error?error=invalid_code`

Both of the signals you would naturally check — the advertised support, and MP
accepting the `code_challenge` on the authorize URL — look like confirmation.
The flow only breaks on the last hop. `src/auth.test.ts` pins `pkce: false` with
this reasoning so it is not re-opened from the discovery document alone.

Without PKCE the code rests on the client secret and the `state` cookie check,
which is a confidential client's normal posture.

### Still open — needs a human

- **The MP OAuth client's registered redirect URI must be updated.** Better Auth
  1.7 changed the callback path, so the `redirect_uri` this app sends is now
  `<BETTER_AUTH_URL>/api/auth/callback/ministryplatform` — previously
  `/api/auth/oauth2/callback/ministry-platform`. Note BOTH halves changed: the
  1.7 upgrade moved `/oauth2/callback/` to `/callback/`, and the provider id was
  renamed from `ministry-platform` to `ministryplatform`. Register the new value in the
  Ministry Platform OAuth client **before** deploying, or MP will reject the
  authorization request outright.
- **The enforced-CSP browser walk has not been done.** Headers and nonce
  coverage were verified against `next start`; a human still needs to click
  through every Radix surface under enforcement.
- **`BETTER_AUTH_SECRET` should be rotated** if this deployment was ever exposed
  to F-UPDATE-USER. Patching does not revoke sessions already forged — they
  survive in the JWT cookie cache for up to an hour, and with no database there
  is no session table to clear.
- A transient **discovery failure at boot disables the OAuth provider for the
  life of the process**, with no retry (inherited upstream issue). It also
  inverts the sign-in failure mode: a *working* discovery is what turns on
  id_token verification.
