# Security Policy

MPNext-Tools is a template that churches fork and copy. There is no package to
upgrade, so no Dependabot alert reaches a fork when something is fixed here.
If you run a copy, you are responsible for porting fixes into it — see
[Downstream clones](#downstream-clones) below.

## Supported versions

| Version | Supported |
|---|---|
| `main` (latest commit) | Yes |
| Anything else — older commits, tags, forks | No. Forks are maintained by their owners. |

## Reporting a vulnerability

**Please do not open a public issue, discussion or pull request for a
security problem.**

Report privately through **GitHub private vulnerability reporting**: the
repository's **Security** tab → **Report a vulnerability**, or directly at
<https://github.com/MinistryPlatform-Community/MPNext-Tools/security/advisories/new>.

It helps to include:

- The commit (or date of your fork) you tested against, and the better-auth and
  Next.js versions from your lockfile
- The affected file(s) and a description of the mechanism
- Steps to reproduce or a proof of concept — against a **non-production**
  instance or a mock; please never test against a live Ministry Platform
  database with real member data
- The impact as you understand it, and any fix you have in mind

We aim to acknowledge a report within 5 business days and to agree a
disclosure date with you once a fix is available.

## Downstream clones

**If your repository was forked or copied from MPNext-Tools (or from MPNext)
before 2026-09-30, do all of the following:**

1. **Port the `/update-user` fix** (`disabledPaths` in `src/lib/auth.ts` plus the
   deny-by-default allowlist in `src/app/api/auth/[...all]/route.ts`). Between
   2026-07-09 and 2026-09-13 any signed-in user could rewrite their own session's
   MP `User_GUID` and act as another user.
2. **Rotate your `BETTER_AUTH_SECRET`** (`openssl rand -base64 32`, at least 32
   characters) in every environment, and redeploy. Patching does not revoke a
   forged session cookie; before the 2026-09-30 session changes such a cookie
   could keep re-signing itself for up to 7 days. Rotating the secret is the
   only thing that invalidates it. Every user is signed out once.
3. **Review your MP audit log** (`dp_Audit_Log`) for writes made through the app
   during the window your deployment was exposed, looking for `User_ID`s that
   do not match the person who was signed in.
4. **Port the session hardening** (12 h ceiling, encrypted cookie cache,
   `refreshCache: false`, no user OAuth tokens, boot-time secret/URL refusals).
   See `.claude/references/auth/sessions.md` and
   `.claude/references/security/README.md`.

## Secrets in this repository

- `.env*` files other than `.env.example` are git-ignored, and
  `.githooks/pre-commit` (installed by `npm install` via the `prepare` script)
  refuses to commit one.
- `.env.example` holds placeholders only. Never put a real value in it.
- If a secret is ever committed, rotate it — removing it from history is not
  enough once it has been pushed.
