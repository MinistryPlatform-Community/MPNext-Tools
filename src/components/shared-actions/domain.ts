'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { DomainTimezoneService } from '@/services/domainTimezoneService';

/**
 * Returns the IANA time zone identifier for the active Ministry Platform
 * domain. Use this to drive any client-side `Intl.DateTimeFormat` rendering
 * of MP-sourced datetime values so the displayed wall-clock matches MP's
 * database regardless of the user's browser zone.
 *
 * AUTHORIZATION CARVE-OUT (CLAUDE.md rule 12) — written justification:
 * this requires an authenticated session but deliberately NOT the
 * `AuthorizationService` role gate, because
 *   1. the value is ONE domain-wide configuration string (e.g.
 *      "America/New_York"), not per-person or per-record MP data;
 *   2. its only consumers are tool pages that are themselves role-gated
 *      (the group wizard page gates before calling it); and
 *   3. role-gating it would add a second MP round-trip to every page load
 *      for no confidentiality gain.
 * It must still check the session (F11, ported 2026-09-30): a compiled server
 * action is a callable POST endpoint, and this was reachable with no session
 * at all. The check is on `session.user.id` — presence of a Better Auth
 * session — which is all a carve-out of this kind needs.
 *
 * Result is cached for the lifetime of the server process.
 */
export async function getMpTimezone(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  const tz = DomainTimezoneService.getInstance();
  return tz.getMpTimezone();
}
