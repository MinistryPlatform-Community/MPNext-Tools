"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/**
 * Guard for dev-panel server actions.
 *
 * Dev-panel actions are intended to run only in development builds on
 * localhost. Because server actions are routable endpoints regardless of
 * where they're imported, we enforce two checks here:
 *
 * 1. `NODE_ENV === "production"` → throw. Server actions must not execute
 *    in a production deployment, even if an authenticated user replays the
 *    form-post or RPC payload.
 * 2. A valid Better Auth session with `user.id` must exist.
 *
 * Returns the session on success so callers can read user fields
 * (e.g. `userGuid`) without calling `auth.api.getSession` again.
 *
 * @param featureLabel - Human-readable label used in the production error
 *   message (e.g. `"Deploy Tool"`). Defaults to `"Dev panel"`.
 * @returns The validated Better Auth session.
 * @throws If NODE_ENV is "production" or no valid session is present.
 */
export async function requireDevSession(
  featureLabel: string = "Dev panel"
): Promise<NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>> {
  if (process.env.NODE_ENV === "production") {
    throw new Error(`${featureLabel} is not available in production.`);
  }
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    throw new Error("Unauthorized - Missing user session data");
  }
  return session;
}
