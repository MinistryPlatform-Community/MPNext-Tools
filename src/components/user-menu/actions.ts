'use server';

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function handleSignOut() {
  // Clear the Better Auth session
  await auth.api.signOut({
    headers: await headers(),
  });

  const baseUrl = process.env.MINISTRY_PLATFORM_BASE_URL;
  if (!baseUrl) {
    throw new Error('MINISTRY_PLATFORM_BASE_URL is not configured');
  }

  const postLogoutRedirectUri = process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL;
  if (!postLogoutRedirectUri) {
    throw new Error('BETTER_AUTH_URL (or NEXTAUTH_URL) is not configured');
  }

  const endSessionUrl = `${baseUrl}/oauth/connect/endsession`;
  const params = new URLSearchParams({
    post_logout_redirect_uri: postLogoutRedirectUri,
  });

  redirect(`${endSessionUrl}?${params.toString()}`);
}
