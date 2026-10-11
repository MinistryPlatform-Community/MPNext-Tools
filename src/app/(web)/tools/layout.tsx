import { redirect } from "next/navigation";
import { AuthorizationService } from "@/services/authorizationService";

/**
 * UX redirect for every route under `/tools` — NOT an enforcement point for
 * the tool pages.
 *
 * It sends a role-less user to `/no-access` (which explains the refusal)
 * instead of a tool full of failing actions. That is all it can do.
 *
 * **It does not protect any `tools/<tool>/page.tsx`.** Next 16 renders each
 * route segment independently: the page is built as its own segment and this
 * layout only receives a placeholder as `children`, so a `redirect()` here
 * does not stop the page running or its output reaching the RSC payload
 * (node_modules/next/dist/docs/01-app/02-guides/authentication.md, "Layouts
 * and auth checks"). Layouts are also not re-rendered on client navigation.
 * (An earlier version of this comment claimed the opposite; corrected
 * 2026-09-30, following upstream's 2026-09-29 fix.) So every tool page gates
 * ITSELF via `requireToolAccess` before any data call, and every server action
 * and service method gates again with `requireSecurityRole()` — a server action
 * is a callable POST endpoint whether or not this layout ever rendered.
 *
 * Uses the non-throwing, non-logging `hasSecurityRole()` purely to choose
 * between rendering and redirecting.
 */
export default async function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const permitted = await AuthorizationService.getInstance().hasSecurityRole();
  if (!permitted) {
    redirect("/no-access");
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {children}
    </div>
  );
}
