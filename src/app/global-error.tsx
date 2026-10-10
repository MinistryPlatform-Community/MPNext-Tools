"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Last-resort boundary: catches a throw in the ROOT LAYOUT itself, which it
 * then replaces entirely (including <html> and <body>).
 *
 * This file MUST NOT import anything from the app — whatever failed may be that
 * very code — and it does not receive the app's global styles, so everything is
 * inlined.
 *
 * The inline `style` attributes below are safe ONLY BECAUSE `style-src` is
 * `'self' 'unsafe-inline'` with NO nonce (see `src/lib/security-headers.ts`).
 * The two are coupled: a nonce-based `style-src` would silently drop all of
 * this and render an unstyled page at the worst possible moment. If you change
 * one, check the other.
 *
 * Two controls, because this page can be the server-rendered HTML a user sees
 * BEFORE (or without) hydration:
 * - "Try again" calls `retry`, which needs React. It is disabled until the
 *   page hydrates, so a pre-hydration click is not silently swallowed.
 * - "Go to home page" is a plain `<a href="/">`, which works with no JS at all.
 */

const subscribeNoop = () => () => {};

/** `false` in the server render and during hydration, `true` once hydrated. */
function useHydrated(): boolean {
  return useSyncExternalStore(subscribeNoop, () => true, () => false);
}
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const hydrated = useHydrated();

  useEffect(() => {
    console.error("ui.render.error", {
      boundary: "global",
      name: error.name,
      digest: error.digest,
    });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          backgroundColor: "#f9fafb",
          color: "#111827",
        }}
      >
        <div style={{ maxWidth: "28rem", padding: "1.5rem", textAlign: "center" }}>
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: 600,
              color: "#dc2626",
              marginBottom: "0.75rem",
            }}
          >
            Something went wrong
          </h2>
          <p style={{ fontSize: "0.875rem", color: "#4b5563", marginBottom: "1.5rem" }}>
            The application failed to load. Please try again.
          </p>
          <button
            type="button"
            onClick={retry}
            disabled={!hydrated}
            style={{
              backgroundColor: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "0.375rem",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: hydrated ? "pointer" : "default",
              opacity: hydrated ? 1 : 0.6,
            }}
          >
            Try again
          </button>
          <p style={{ fontSize: "0.875rem", marginTop: "1rem" }}>
            {/* A plain <a>, not next/link, on purpose: it must work before or
                without hydration, and a full document load is the recovery we
                want when the root layout itself has failed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ color: "#2563eb", textDecoration: "underline" }}>
              Go to home page
            </a>
          </p>
          {error.digest ? (
            <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "1.5rem" }}>
              Reference: <span style={{ fontFamily: "monospace" }}>{error.digest}</span>
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
