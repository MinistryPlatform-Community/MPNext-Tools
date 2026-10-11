"use client";

import { useEffect } from "react";

/**
 * Error boundary for everything below the `(web)` layout.
 *
 * Placement is the whole design: because this sits INSIDE the `(web)` segment,
 * the `(web)` layout (AuthWrapper + Providers) survives the error. A single
 * boundary at `src/app/error.tsx` would replace that shell. (There is no
 * in-shell sign-out control; sign-out lives on `/no-access` and `/session-error`.)
 *
 * Two details that bite:
 *
 * 1. Next 16 renamed the prop to `retry` (it was `reset`). `reset` still
 *    exists but only clears error state without re-fetching, so a boundary
 *    wired to the old name renders perfectly and its button SILENTLY DOES
 *    NOTHING. `error.test.tsx` pins that `retry` is the one being called.
 *
 * 2. Log and render IDENTIFIERS ONLY, never `error.message`. This boundary sits
 *    above components rendering MP names, addresses and household data; unlike
 *    a controlled catch around an HTTP call, a render error's message is not
 *    guaranteed to be content-free. `digest` is the join key to the
 *    un-redacted server-side log.
 */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("ui.render.error", {
      boundary: "web",
      name: error.name,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-md w-full p-6 text-center space-y-4">
        <h2 className="text-2xl font-semibold text-red-600">
          Something went wrong
        </h2>
        <p className="text-sm text-gray-600">
          An unexpected error occurred while loading this page. You can try
          again — if it keeps happening, contact your administrator.
        </p>
        <button
          onClick={retry}
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Try again
        </button>
        {error.digest ? (
          <p className="text-xs text-gray-400">
            Reference: <span className="font-mono">{error.digest}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
