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
| How long does a session live? What must the secret look like? | [Sessions and secrets](#sessions-and-secrets) |
| We forked this repo — what do we have to do? | [Downstream clones](#downstream-clones) |
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
- **Config, not code — and fail-closed:** `MP_SECURITY_ROLES` (comma-separated,
  case-insensitive). `*` means "any MP security role will do"; a list means only
  those roles; **unset, blank or `","` means nobody** (denials log reason
  `roles_not_configured`). `*` is a wildcard only as the whole value. Changed
  2026-09-30 — blank used to mean "any role". Tighten without a deploy.

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
- `components/shared-actions/domain.ts` — the domain-wide time zone (one string);
  session-checked since 2026-09-30 (F11 — it previously had no check at all)
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
- `POST /sign-in/social` is additionally **body-filtered** (F12): raw
  Content-Type `application/json` (params allowed, no comma, untrimmed), body
  ≤ 4096 bytes (declared and streamed), keys ⊆ `provider`/`callbackURL`,
  `provider === "ministryplatform"`, `callbackURL` ≤ 2048 chars. Anything else
  gets the same plain 404. The primary F12 control is `refuseIdTokenSignIn`
  (`hooks.before` in `src/lib/auth.ts`), which also covers in-process
  `auth.api` calls. If the client ever sends another key, add it deliberately;
  never add `idToken`.
- Every `/api/auth` response, 404s included, carries `Cache-Control: no-store`.
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
`isOidc ? profile.sub : profile.id`, where `isOidc` comes from a discovery
document — and since security Step 4 the provider has **no** `discoveryUrl`, so
the default would read `profile.id` and key every account on `""`.

Two consequences this app handles explicitly:

1. **`getUserInfo` returns `sub`, not `id`.** Returning the 1.6 `id` shape
   leaves `sub` undefined, and `resolveOAuthAccountKey` throws
   `OAUTH_ACCOUNT_SUBJECT_INVALID` **after a successful token exchange** —
   surfacing as `/auth-error?error=unable_to_get_user_info`, which reads like a
   userinfo fetch failure rather than an identity-mapping one.
2. **`accountSubject` is declared explicitly** (`typeof profile.sub ===
   "string" ? profile.sub : ""`). Required, not stylistic, without discovery.

`mapProfileToUser` receives the **raw** object `getUserInfo` returned, so it
reads `sub` for the same reason. `src/auth.test.ts` pins all three, and the
guard is verified to fail against the 1.6 shape.

### OIDC: lazy discovery and id_token verification

Security Step 4 (2026-09-30), ported from upstream MPNext issue #101. Full
detail in [`../auth/oauth-flow.md`](../auth/oauth-flow.md).

- **No `discoveryUrl`.** Explicit `authorizationUrl` / `tokenUrl` /
  `endSessionEndpoint`, so building the auth instance makes no MP call. With
  `discoveryUrl`, better-auth 1.7 fetched discovery once at boot with no
  timeout: a failed fetch dropped the provider until a restart (an uptime check
  stayed green), a hung one stalled every request.
- **The id_token is verified by the app** in `getUserInfo` (`verifyMpIdToken`):
  RS256 pinned (an HS256 token keyed with a client secret, or `alg: none`, is
  `ERR_JOSE_ALG_NOT_ALLOWED`), signature against MP's JWKS, `iss`, `aud` = the
  OIDC client id; then `sub` present, `exp` present, `azp` when `aud` is a
  list; then the userinfo `sub` must equal the id_token `sub`. Every refusal
  returns `null` and logs identifiers only.
- **Issuer + `jwks_uri` load lazily** at the first callback
  (`lazyIdTokenVerifier`): 5 s timeout, `redirect: "error"`, single-flight,
  cached on success, never cached on failure, fail closed on a partial
  document. The JWKS URL is not pinned.
- **`requireIdTokenVerification` / `disableIdTokenNonceBinding` removed.** The
  first throws without discovery; the second is a no-op without an id_token
  config (better-auth then neither sends nor requires a nonce). Re-adding
  `discoveryUrl` would also turn nonce binding back on, which MP cannot satisfy
  — `src/auth.oidc-discovery.test.ts` keeps that negative control.
- **Dedicated OIDC client** (owner decision): `MP_OIDC_CLIENT_ID` /
  `MP_OIDC_CLIENT_SECRET`, separate from the service account. Falls back to the
  service account with `auth.oidc.shared_client` until every environment is
  split (`.claude/TODO/2026-09-30-require-dedicated-oidc-client.md`).
- **One auth instance per process** (`sharedInstance`), so sign-out finds the
  id_token (`id_token_hint`) and deletes the session row. Sign-out always sends
  `client_id`; on another serverless instance there is no hint and MP may
  prompt once.

`src/auth.test.ts` pins `pkce: false` and the absence of `discoveryUrl`,
because both fail as a broken sign-in (or a reopened hole) rather than as a
type error.

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

## Sessions and secrets

Full detail in [`../auth/sessions.md`](../auth/sessions.md). The security-relevant
points (security Step 3, 2026-09-30):

- **Hard 12 h ceiling** (`expiresIn`, `disableSessionRefresh`). A cookie pair
  not backed by a live in-memory row — copied before sign-out, forged from a
  leaked secret, or replayed at another serverless instance — dies within
  **1 h** (`cookieCache.maxAge` with `refreshCache: false`). The earlier
  "up to an hour" claim for forged sessions was **wrong**: stateless
  better-auth defaults `refreshCache` on, and such a cookie re-signed itself
  for up to 7 days.
- **`session_data` is encrypted (JWE)**, not a readable JWT; `/get-session`
  withholds `token`, `ipAddress` and `userAgent`.
- **No user MP OAuth tokens**: no `offline_access`, no `account_data` cookie,
  access/refresh tokens nulled in the in-memory account row. The `idToken` is
  kept in memory: it is the sign-out `id_token_hint` (on the process that
  handled the callback only).
- **Boot refusals**: missing, default or < 32-char `BETTER_AUTH_SECRET`,
  `BETTER_AUTH_SECRETS`, `TEST` in production, or a malformed/non-https
  `BETTER_AUTH_URL` / `MINISTRY_PLATFORM_BASE_URL` all stop the process
  (including `next build`). `advanced.disableOriginCheck` is pinned `false`.
- **Rate-limit client IP**: `AUTH_IP_ADDRESS_HEADERS` / `AUTH_TRUSTED_PROXIES`,
  invalid entries refuse startup. On Vercel the default is
  `x-vercel-forwarded-for,x-real-ip` — Vercel's edge sets both to the client IP
  and does not forward client-supplied values
  (<https://vercel.com/docs/headers/request-headers>, checked 2026-09-30);
  `x-vercel-forwarded-for` is first because it survives a proxy in front of
  Vercel. Off Vercel the default stays better-auth's single-value
  `x-forwarded-for`, because there these headers are client-controlled.
- **Git hygiene**: `.env*` (except `.env.example`), `.vercel`,
  `.claude/settings.local.json` and `.claude/worktrees/` are ignored;
  `.githooks/pre-commit` refuses staged env files. `.claude/settings.local.json`
  was untracked on 2026-09-30 (it granted `Bash(sed:*)` and `rm -rf .claude/*`).
- **Emergency sign-out of everyone**: bump `cookieCache.version` and redeploy,
  or rotate `BETTER_AUTH_SECRET`.

## Downstream clones

No advisory or Dependabot alert reaches a copy of this repo. **Every downstream
clone made before 2026-09-30 should:**

1. Port `disabledPaths` + the deny-by-default auth route allowlist
   (F-UPDATE-USER, exposure window 2026-07-09 → 2026-09-13 here).
2. **Rotate its own `BETTER_AUTH_SECRET`** (`openssl rand -base64 32`) in every
   environment. Only rotation invalidates a forged cookie minted during the
   window; without `refreshCache: false` such a cookie keeps re-signing itself.
3. Review its own `dp_Audit_Log` for writes via the app during its exposure
   window whose `User_ID` doesn't match the signed-in person.
4. Port the session hardening above.

`SECURITY.md` at the repo root carries the same list for people who never open
`.claude/`.

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
| F3b | Low–Medium | F3 bypass: `?callbackUrl=/%09/evil` — the URL parser strips tab/LF/CR after string checks. Closed 2026-09-30 (sanitizer mirrors `isSafeRelativeURL`, returns the raw value) |
| F12 | Low–Medium | `/sign-in/social` id_token branch + caller-supplied access token = sign in as another user. Closed 2026-09-30 by `hooks.before` (`ID_TOKEN_SIGN_IN_DISABLED`) + route body filter + `/link-social` disabled. MP's client allows implicit/hybrid, hence Low–Medium. Since Step 4 (2026-09-30) better-auth also refuses the mode itself (no id_token config without `discoveryUrl` — a side effect, not a control) and `getUserInfo` binds the verified id_token `sub` to the userinfo `sub` (`auth.userinfo.sub_mismatch`) |
| F7 | Low | ~30 Better Auth endpoints publicly mounted; OAuth errors on a third-party page |
| P2/P3/P6 (2026-09-28 review) | Medium | Sessions up to 7 days via default `refreshCache`; readable JWT cookie; user MP refresh token in an `account_data` cookie; no boot-time secret/URL guards; rate-limit IP unconfigured; `.env*` not ignored; `settings.local.json` tracked. Closed 2026-09-30 (security Step 3) — see [Sessions and secrets](#sessions-and-secrets) |
| MPNext #101 | Medium (availability) | Boot-time OIDC discovery: one MP blip left sign-in 404ing until a restart; a hang stalled every request ~300 s. Closed 2026-09-30 (Step 4): explicit endpoints, id_token verified by the app against lazily loaded discovery — see [OIDC: lazy discovery](#oidc-lazy-discovery-and-id_token-verification) |
| F8 | Low | **Resolved as WONTFIX / accepted risk.** PKCE stays `false`: MP advertises `S256` in discovery but rejects the token exchange with `invalid_grant`; MP does not echo a nonce either. See below. |

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

Stated plainly: with neither PKCE nor a nonce, **nothing binds an
authorization code to the browser that started the flow** — the `state` check
does not stop an attacker injecting a stolen code into their own flow, and the
client secret does not help because the app redeems the injected code itself
(RFC 9700 §4.5). What remains keeps codes out of reach: a dedicated MP OIDC
client with exact redirect URIs (`MP_OIDC_CLIENT_ID`, Step 4), `Referrer-Policy`,
and no code-bearing URLs in logs.

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
- **`BETTER_AUTH_SECRET` must be rotated** (owner decision 2026-09-30) in every
  Vercel environment and `.env.local` — this deployment was exposed to
  F-UPDATE-USER from 2026-07-09 to 2026-09-13. Patching does not revoke sessions
  already forged, and with `refreshCache` on (fixed 2026-09-30) they could keep
  re-signing themselves; with no database there is no session table to clear.
  Tracked in `.claude/TODO/2026-09-30-ops-rotate-better-auth-secret.md`.
- **Repo settings**: GitHub private vulnerability reporting, secret scanning,
  push protection and Dependabot security updates were all **disabled** on
  2026-09-30 (public repo). `SECURITY.md` points reporters at private
  vulnerability reporting, so it needs enabling.
- **Register a dedicated MP OIDC client** and set `MP_OIDC_CLIENT_ID` /
  `MP_OIDC_CLIENT_SECRET` in every environment (redirect URI
  `<BETTER_AUTH_URL>/api/auth/callback/ministryplatform`, post-logout redirect
  URI `<BETTER_AUTH_URL>`). Until then sign-in shares the service-account
  client and logs `auth.oidc.shared_client`.
- **Real-MP smoke test of Step 4 not yet done** (a real sign-in): sign in,
  confirm `/api/auth/get-session` has a `userGuid`, no
  `auth.oidc.discovery_failed` / `auth.userinfo.id_token_unverified` in the
  log, and sign-out ends the MP session without a "log out?" prompt.
