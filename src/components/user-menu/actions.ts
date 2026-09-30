'use server';

import { auth } from "@/lib/auth";
import { getAuthBaseUrl, getMpBaseUrl, getOidcClient } from "@/lib/env";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Pulls the `id_token_hint` out of the provider logout URL better-auth returns
 * from `signOut`. better-auth can only build that URL with a hint in the
 * process whose in-memory account row still holds the user's id_token (it is
 * in no cookie — `storeAccountCookie` is off), so this is null on any other
 * serverless instance. Only a URL on the MP origin is trusted.
 */
function idTokenHintFrom(providerLogoutUrl: unknown, mpOrigin: string): string | null {
  if (typeof providerLogoutUrl !== "string") return null;
  try {
    const url = new URL(providerLogoutUrl);
    if (url.origin !== mpOrigin) return null;
    return url.searchParams.get("id_token_hint") || null;
  } catch {
    return null;
  }
}

/**
 * Signs the user out of this app, then sends the browser to MP's end-session
 * endpoint so MP ends its own SSO session too (RP-initiated logout).
 *
 * Why the URL is rebuilt here rather than taken from better-auth:
 * `post_logout_redirect_uri` must be EXACTLY the value registered on the MP
 * client (`getAuthBaseUrl()`, an origin with no trailing slash), while
 * better-auth would send a `/`-suffixed URL, and would omit `client_id`
 * whenever it has an id_token.
 *
 * Without `id_token_hint` or `client_id`, IdentityServer-style providers (MP)
 * cannot tell which client's registered post-logout URIs to check, so they
 * prompt "log out?" and do not redirect — leaving the MP SSO session alive on
 * a shared PC if the tab is closed there. So `client_id` (the OIDC sign-in
 * client) is ALWAYS sent, and `id_token_hint` whenever this process still has
 * the id_token.
 *
 * KNOWN LIMITATION: the id_token lives only in the in-memory account row of
 * the process that handled the sign-in callback (`sharedInstance` makes every
 * Next bundle layer in that process share it). When sign-out lands on a
 * different serverless instance, or after a restart, there is no hint; MP then
 * relies on `client_id` + `post_logout_redirect_uri` and may show its
 * "log out?" confirmation once. The app session is cleared either way.
 */
export async function handleSignOut() {
  // Clear the Better Auth session FIRST, so a misconfigured environment below
  // still signs the user out of this app. `disableRedirect` asks better-auth
  // for the provider logout URL in the body instead of a redirect; only its
  // id_token is used.
  const result = await auth.api.signOut({
    headers: await headers(),
    body: { disableRedirect: true },
  });

  // Each throws on an unset or unusable value without echoing it (see
  // src/lib/env.ts). No localhost fallback: a post-logout redirect to the
  // wrong origin either fails MP's registered-URI check or sends the user
  // somewhere unexpected.
  const mpBaseUrl = getMpBaseUrl();
  const appUrl = getAuthBaseUrl();
  const { clientId } = getOidcClient();

  const params = new URLSearchParams({
    post_logout_redirect_uri: appUrl,
    client_id: clientId,
  });
  const idTokenHint = idTokenHintFrom(
    (result as { url?: unknown } | undefined)?.url,
    new URL(mpBaseUrl).origin,
  );
  if (idTokenHint) params.set("id_token_hint", idTokenHint);

  redirect(`${mpBaseUrl}/oauth/connect/endsession?${params.toString()}`);
}
