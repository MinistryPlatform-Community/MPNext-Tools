import { handleSignOut } from "@/components/shared-actions/sign-out";

/**
 * Explaining page for signed-in users who hold no MP security role.
 *
 * Sign-in is deliberately not role-gated (see AuthorizationService), so these
 * users DO have a session — and this page must give them a way to end it, e.g.
 * to sign in again as a different MP user. The form below is that way out; the
 * app has no other sign-out control outside `/session-error`.
 *
 * It sits inside the `(web)` group, so AuthWrapper renders it per request (it
 * reads the session), which keeps the CSP nonce available for the form.
 */
export default function NoAccessPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold mb-3">You don&apos;t have access to this tool</h1>
        <p className="text-gray-600 mb-6">
          Your Ministry Platform account signed in successfully, but it
          doesn&apos;t have a security role that grants access to these tools.
          Ask your Ministry Platform administrator to assign one.
        </p>
        <form action={handleSignOut}>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md bg-[#344767] px-5 py-2.5 text-white font-medium hover:bg-[#2d3a5f] focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
