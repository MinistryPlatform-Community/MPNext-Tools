import type { PageData, ToolParams } from "./tool-params";

/**
 * Server-only parser for tool query-string params.
 *
 * Split out of `./tool-params` because it needs `ToolService` (and therefore
 * `next/headers` and `MPHelper`), while the types and pure helpers next door
 * are imported by client components. Keeping them in one module traced the
 * whole server-only chain into the client bundle and failed the Turbopack
 * build.
 *
 * Only ever called from server components (the `page.tsx` of each tool).
 */

/**
 * Parse a query-string value to a finite integer, or return `undefined`.
 *
 * Guards against `parseInt('abc', 10)` returning `NaN` — which would otherwise
 * leak as `typeof === 'number'` and silently corrupt downstream state (e.g.
 * `ToolService.getPageData(NaN)`, `===` checks, display as `"NaN"`).
 */
function parseIntOrUndefined(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function parseToolParams(searchParams: URLSearchParams | { [key: string]: string | string[] | undefined }): Promise<ToolParams> {
  const getValue = (key: string): string | undefined => {
    if (searchParams instanceof URLSearchParams) {
      return searchParams.get(key) || undefined;
    }
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const pageID = getValue('pageID');
  const s = getValue('s');
  const sc = getValue('sc');
  const p = getValue('p');
  const q = getValue('q');
  const v = getValue('v');
  const recordID = getValue('recordID');
  const recordDescription = getValue('recordDescription');
  const addl = getValue('addl');

  const parsedPageID = parseIntOrUndefined(pageID);

  // Fetch page data if pageID is provided
  let pageData: PageData | undefined;
  if (parsedPageID) {
    try {
      const { ToolService } = await import("@/services/toolService");
      const toolService = await ToolService.getInstance();
      pageData = await toolService.getPageData(parsedPageID) || undefined;
    } catch {
      // Identifier only. Every tool page gates (requireToolAccess) before
      // calling this, so a refusal here is unexpected; the page simply
      // renders without page metadata.
      console.warn('tool_params.page_data_unavailable', { pageID: parsedPageID });
      pageData = undefined;
    }
  }

  return {
    pageID: parsedPageID,
    s: parseIntOrUndefined(s),
    sc: parseIntOrUndefined(sc),
    p: parseIntOrUndefined(p),
    q: q || undefined,
    v: parseIntOrUndefined(v),
    recordID: parseIntOrUndefined(recordID),
    recordDescription: recordDescription ? decodeURIComponent(recordDescription) : undefined,
    addl: addl || undefined,
    pageData: pageData,
  };
}

