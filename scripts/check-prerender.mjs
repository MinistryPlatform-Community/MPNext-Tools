#!/usr/bin/env node
/**
 * Fails when `next build` statically prerendered a route that has no business
 * being static. Run after `npm run build` (CI does).
 *
 * WHY: the CSP in `src/proxy.ts` is nonce-based, and Next reads the nonce off
 * the incoming request at render time. A route prerendered at build time has no
 * request and therefore no nonce, so under the enforced CSP its scripts are
 * blocked and it never hydrates — silently, with no build error. A static page
 * also skips every server-side session and role check. `src/app/signin` was
 * bitten by exactly this; see the `force-dynamic` note in its `page.tsx`.
 *
 * ALLOWED are Next's two built-in shells, both static by design and neither
 * dependent on hydration to be useful:
 *   /_not-found     plain 404 markup; its links work without JavaScript
 *   /_global-error  only ever rendered client-side, after a crash
 * Anything else showing up here means a route lost its dynamic signal (a
 * `headers()`/session read, or `export const dynamic = "force-dynamic"` in a
 * SERVER module). Fix the route; do not widen this list without the same kind
 * of written justification.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const ALLOWED_STATIC = new Set(["/_not-found", "/_global-error"]);

const manifestPath = path.join(process.cwd(), ".next", "prerender-manifest.json");

let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
} catch {
  console.error(`check-prerender: cannot read ${manifestPath} — run \`npm run build\` first.`);
  process.exit(1);
}

const prerendered = [
  ...Object.keys(manifest.routes ?? {}),
  ...Object.keys(manifest.dynamicRoutes ?? {}),
];
const unexpected = prerendered.filter((route) => !ALLOWED_STATIC.has(route));

if (unexpected.length > 0) {
  console.error("check-prerender: these routes were statically prerendered:");
  for (const route of unexpected) console.error(`  ${route}`);
  console.error(
    "A prerendered page has no CSP nonce (it will not hydrate under the enforced policy) " +
      "and skips server-side auth. Make the route dynamic; see scripts/check-prerender.mjs.",
  );
  process.exit(1);
}

console.log(
  `check-prerender: OK (${prerendered.length} prerendered, all allowed: ${prerendered.join(", ") || "none"})`,
);
