"use client";

import { authClient } from "@/lib/auth-client";

export type SessionData = typeof authClient.$Infer.Session;

export function useAppSession() {
  const { data } = authClient.useSession();
  return data;
}
