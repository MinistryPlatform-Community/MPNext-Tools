import { redirect } from "next/navigation";
import {
  AuthorizationService,
  UnauthorizedError,
  type AuthorizationContext,
} from "@/services/authorizationService";

/**
 * Page-level ENFORCEMENT for a tool route. Every `tools/<tool>/page.tsx`
 * calls this first, before parsing params or touching any data.
 *
 * Why the page and not just the layout: Next 16 renders each route segment
 * independently. The page is built as its own segment and the layout only
 * receives a placeholder as `children`, so a `redirect()` in
 * `tools/layout.tsx` does NOT stop the page component running or its output
 * reaching the RSC payload (Next's own guide, "Layouts and auth checks":
 * node_modules/next/dist/docs/01-app/02-guides/authentication.md). Layouts
 * are also not re-rendered on client navigation. So each page gates itself;
 * the actions and services it calls gate again.
 *
 * Uses `requireSecurityRole` (not `hasSecurityRole`) because this IS an
 * enforcement point, so a refusal is logged. Only a refusal becomes a
 * redirect to `/no-access`; an infrastructure failure (MP unreachable) still
 * throws to the error boundary rather than masquerading as "no access".
 *
 * @returns the acting MP `User_ID` (callers normally ignore it — write
 * attribution is assembled in the services).
 */
export async function requireToolAccess(context: AuthorizationContext): Promise<number> {
  try {
    return await AuthorizationService.getInstance().requireSecurityRole(context);
  } catch (err) {
    if (err instanceof UnauthorizedError) redirect("/no-access");
    throw err;
  }
}
