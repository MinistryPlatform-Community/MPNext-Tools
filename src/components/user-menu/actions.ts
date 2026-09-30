'use server';

import { auth } from "@/lib/auth";
import { getAuthBaseUrl, getMpBaseUrl } from "@/lib/env";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function handleSignOut() {
  // Clear the Better Auth session
  await auth.api.signOut({
    headers: await headers(),
  });

  // Both validated and normalized (https, no credentials/query/fragment, no
  // trailing slash; the app URL origin-only) — see src/lib/env.ts. They throw
  // on a bad value without echoing it.
  const endSessionUrl = `${getMpBaseUrl()}/oauth/connect/endsession`;
  const params = new URLSearchParams({
    post_logout_redirect_uri: getAuthBaseUrl(),
  });

  redirect(`${endSessionUrl}?${params.toString()}`);
}
