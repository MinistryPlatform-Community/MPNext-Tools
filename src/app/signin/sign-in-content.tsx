"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { authClient } from "@/lib/auth-client";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// If the OAuth redirect hasn't navigated away within this window, flip to
// an error state so the user sees a retry path instead of an infinite spinner.
const REDIRECT_TIMEOUT_MS = 10_000;

// C0 controls, DEL and C1 controls. The WHATWG URL parser silently STRIPS tab,
// LF and CR from anywhere in the input before it parses — i.e. AFTER every
// string check below has run. So `/\t/evil.example` (from
// `?callbackUrl=/%09/evil.example`) passes a `startsWith("//")` test and then
// navigates as `//evil.example`: off-site. Refusing all control characters
// closes that and any other parser-stripped variant in one rule.
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/;
// A percent-encoded `/` or `\` in the PATH can be decoded by a router or proxy
// downstream into a real separator (`/%2F/evil` -> `//evil`). Only the path is
// checked: `%2F` in a query string or fragment is ordinary data.
const ENCODED_SEPARATOR = /%2f|%5c/i;
// A throwaway base for the final resolution check. `.invalid` is reserved
// (RFC 2606), so it can never collide with a real origin.
const SENTINEL = "https://sentinel.invalid";

/**
 * Clamps `?callbackUrl=` to a path on this origin.
 *
 * F3: without this, `/signin?callbackUrl=https://evil.example` bounces the
 * user off-site from a URL that looks exactly like this app's own login page —
 * a credible phishing hop.
 *
 * F3b: the first version only refused a leading `//` or `/\`, which
 * `?callbackUrl=/%09/example.com` bypassed (see `CONTROL_CHARS`). The rules
 * now mirror better-auth's server-side `isSafeRelativeURL`, which already
 * refuses these values as a `callbackURL` on the signed-out path. The
 * signed-in path is a bare `location.href` assignment with no server in the
 * loop, so this function is the ONLY check there — and client and server
 * should agree on what "safe" means, or a URL one accepts and the other
 * rejects strands the user.
 *
 * Sanitizing happens once, HERE AT THE SOURCE, rather than at each sink,
 * because the value feeds two different consumers: the `window.location.href`
 * assignment and the `callbackURL` handed to `signIn.social`. Cleaning it once
 * means a future third use cannot miss it.
 */
export function sanitizeCallbackUrl(raw: string | null | undefined): string {
  if (typeof raw !== "string" || !raw.startsWith("/")) return "/";
  // `//evil` is protocol-relative (another origin). ANY backslash is refused,
  // not just a leading `/\`: special-scheme URLs treat `\` as `/`, and a
  // backslash has no legitimate use in this app's paths.
  if (raw.startsWith("//") || raw.includes("\\") || CONTROL_CHARS.test(raw)) return "/";
  const pathEnd = raw.search(/[?#]/);
  if (ENCODED_SEPARATOR.test(pathEnd === -1 ? raw : raw.slice(0, pathEnd))) return "/";
  // Backstop: let the real URL parser resolve it and insist it stays on this
  // origin. After the checks above no input is known to fail this; it guards
  // against a browser parser diverging from the string rules.
  try {
    if (new URL(raw, SENTINEL).origin !== SENTINEL) return "/";
  } catch {
    return "/";
  }
  // Return the RAW value, never the `new URL()`-normalized form: dot-segment
  // removal turns `/.//evil.com` into the pathname `//evil.com`, which would
  // itself be a protocol-relative redirect. Raw `/.//evil.com` resolves safely
  // to this origin's `//evil.com` path.
  return raw;
}

const PROVIDER_REJECTED =
  "The sign-in request was rejected by the provider. Please retry; if the problem persists, contact support.";
const PROVIDER_UNAVAILABLE =
  "The sign-in provider is temporarily unavailable. Please retry in a moment.";
const GENERIC_FAILURE =
  "Sign-in failed. Please retry; if the problem persists, contact support.";

/**
 * The fixed set of messages `?error=` can select. The query value is only
 * ever used as a LOOKUP KEY — never rendered — so a crafted link cannot put
 * attacker-chosen text on this app's own sign-in page ("Your account is
 * locked, call 555-…"). An unknown code gets the generic message.
 *
 * A `Map`, not an object literal, so keys like `__proto__` or `constructor`
 * cannot resolve to inherited properties.
 */
const OAUTH_ERROR_MESSAGES: ReadonlyMap<string, string> = new Map([
  ["access_denied", "Sign-in was cancelled. Click retry to try again."],
  ["invalid_request", PROVIDER_REJECTED],
  ["invalid_client", PROVIDER_REJECTED],
  ["invalid_grant", PROVIDER_REJECTED],
  ["unauthorized_client", PROVIDER_REJECTED],
  ["unsupported_response_type", PROVIDER_REJECTED],
  ["invalid_scope", PROVIDER_REJECTED],
  ["server_error", PROVIDER_UNAVAILABLE],
  ["temporarily_unavailable", PROVIDER_UNAVAILABLE],
]);

function describeOAuthError(code: string): string {
  return OAUTH_ERROR_MESSAGES.get(code) ?? GENERIC_FAILURE;
}

export function SignInContent() {
  const searchParams = useSearchParams();
  const callbackUrl = sanitizeCallbackUrl(searchParams?.get("callbackUrl"));
  const errorParam = searchParams?.get("error") || null;

  const [isRedirecting, setIsRedirecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    errorParam ? describeOAuthError(errorParam) : null
  );

  // Track redirect-timeout so we can clear it if the page unmounts (or
  // navigation actually happens) before the timeout fires.
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Guards against starting two concurrent OAuth flows.
   *
   * This MUST be a ref, not the `isRedirecting` state. React StrictMode
   * double-invokes effects in development, and a state flag read inside an
   * async callback cannot close that window: both runs reach the callback
   * before `setState` lands, both captured `false` in their closure, and both
   * fire. Each call then mints its own `state` and `nonce` and overwrites the
   * single `oauth_state` cookie (`storeStateStrategy: "cookie"`), so the two
   * flows race and the loser's callback fails verification.
   *
   * A ref is checked and set synchronously before the first await, and it
   * survives StrictMode's mount/unmount/remount because the component instance
   * is the same.
   */
  const oauthStartedRef = useRef(false);

  const clearRedirectTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startOAuth = useCallback(
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    (force = false) => {
      // Checked and set synchronously — before any await — so a second
      // StrictMode effect run cannot slip past.
      if (!force && oauthStartedRef.current) return;
      oauthStartedRef.current = true;

      setIsRedirecting(true);
      setErrorMessage(null);

      // Arm a safety timeout: if OAuth never navigates away, surface an error.
      clearRedirectTimeout();
      timeoutRef.current = setTimeout(() => {
        console.error(
          "SignIn: OAuth redirect did not navigate within %dms — surfacing error state",
          REDIRECT_TIMEOUT_MS
        );
        oauthStartedRef.current = false;
        setIsRedirecting(false);
        setErrorMessage(
          "Sign-in is taking longer than expected. Please retry; if the problem persists, check your network or contact support."
        );
      }, REDIRECT_TIMEOUT_MS);

      try {
        // Better Auth 1.7 removed `signIn.oauth2` along with the
        // genericOAuthClient plugin: genericOAuth providers are now registered
        // as first-class social providers and go through core `signIn.social`.
        // Note the field is `provider`, not the old `providerId`.
        const result = authClient.signIn.social({
          provider: "ministryplatform",
          callbackURL: callbackUrl,
        });
        // signIn.social() may return a Promise — attach a catch so
        // provider-level failures aren't swallowed.
        if (result && typeof (result as Promise<unknown>).catch === "function") {
          (result as Promise<unknown>).catch((err) => {
            console.error("SignIn: authClient.signIn.social rejected:", err);
            clearRedirectTimeout();
            oauthStartedRef.current = false;
            setIsRedirecting(false);
            setErrorMessage(
              "Failed to start sign-in. Please retry; if the problem persists, contact support."
            );
          });
        }
      } catch (err) {
        console.error("SignIn: authClient.signIn.social threw:", err);
        clearRedirectTimeout();
        oauthStartedRef.current = false;
        setIsRedirecting(false);
        setErrorMessage(
          "Failed to start sign-in. Please retry; if the problem persists, contact support."
        );
      }
    },
    [callbackUrl, clearRedirectTimeout]
  );

  const handleRetry = useCallback(() => {
    // An explicit retry deliberately bypasses the once-only guard.
    startOAuth(true);
  }, [startOAuth]);

  useEffect(() => {
    // If the URL arrived with ?error=..., don't auto-start OAuth — the user
    // just came back from a failed attempt and should see the retry UI.
    if (errorParam) {
      // Log whether the code is one we recognise, not the free-text value.
      console.error(
        "SignIn: OAuth provider returned an error (known code: %s)",
        OAUTH_ERROR_MESSAGES.has(errorParam)
      );
      return;
    }

    let cancelled = false;

    authClient
      .getSession()
      .then(({ data: session }) => {
        if (cancelled) return;
        if (session) {
          // Already signed in. `callbackUrl` was sanitized at the source above,
          // so this can only ever be a path on this origin.
          window.location.href = callbackUrl;
        } else if (!isRedirecting) {
          startOAuth();
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("SignIn: Failed to check session:", err);
        // Proceed with sign-in redirect since the user needs to authenticate anyway
        if (!isRedirecting) {
          startOAuth();
        }
      });

    return () => {
      cancelled = true;
      clearRedirectTimeout();
    };
    // We intentionally exclude isRedirecting/startOAuth/clearRedirectTimeout
    // from deps so the effect only runs when callbackUrl/errorParam change —
    // otherwise flipping isRedirecting would re-trigger getSession.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callbackUrl, errorParam]);

  if (errorMessage) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md w-full" role="alert" aria-live="assertive">
          <CardHeader>
            <CardTitle>Sign-in error</CardTitle>
            <CardDescription>We couldn&apos;t complete sign-in.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={handleRetry} type="button">
              Retry sign-in
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">Redirecting to sign in...</h2>
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent mx-auto"></div>
      </div>
    </div>
  );
}

export function SignInFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">Loading...</h2>
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent mx-auto"></div>
      </div>
    </div>
  );
}
