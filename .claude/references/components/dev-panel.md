---
title: DevPanel — localhost-only developer overlay
domain: components
type: reference
applies_to:
  - src/components/dev-panel/dev-panel.tsx
  - src/components/dev-panel/index.ts
  - src/components/dev-panel/panels/params-panel.tsx
  - src/components/dev-panel/panels/selection-panel.tsx
  - src/components/dev-panel/panels/selection-actions.ts
  - src/components/dev-panel/panels/contact-records-panel.tsx
  - src/components/dev-panel/panels/contact-records-actions.ts
  - src/components/dev-panel/panels/user-tools-panel.tsx
  - src/components/dev-panel/panels/user-tools-actions.ts
  - src/components/dev-panel/panels/deploy-tool-panel.tsx
  - src/components/dev-panel/panels/deploy-tool-actions.ts
symbols:
  - DevPanel
  - ParamsPanel
  - SelectionPanel
  - ContactRecordsPanel
  - UserToolsPanel
  - DeployToolPanel
  - resolveSelection
  - resolveContactRecords
  - getUserTools
  - deployToolAction
  - listPagesAction
  - listRolesAction
  - getDeployToolEnvStatusAction
related:
  - tool-framework.md
  - ../services/tool-service.md
  - ../routing/tool-params.md
  - ../required-stored-procs.md
last_verified: 2026-04-17
---

## Purpose
Localhost-only developer overlay rendered by `ToolContainer` when `params` is present. Exposes the resolved `ToolParams`, the selection record-IDs, the contact-ID mapping, the current user's authorized tool paths, and a one-click Deploy Tool form for upserting the current route into `dp_Tools` via `api_dev_DeployTool`. Unified into one collapsible bar in commit `971c40b` (#5).

## Files
| File | Role |
|------|------|
| `src/components/dev-panel/dev-panel.tsx` | `DevPanel` shell — gates (mount + NODE_ENV + hostname), collapsible bar, composes sub-panels |
| `src/components/dev-panel/index.ts` | Barrel — `export { DevPanel }` |
| `src/components/dev-panel/dev-panel.test.tsx` | Shell tests (gating, localStorage persistence) — sub-panels fully mocked |
| `src/components/dev-panel/panels/params-panel.tsx` | Renders `ToolParams` as a labelled grid + raw JSON (pure client, no server action) |
| `src/components/dev-panel/panels/selection-panel.tsx` | Resolves `params.s` → record IDs via `resolveSelection`, bubbles IDs up via `onRecordIdsResolved` |
| `src/components/dev-panel/panels/selection-actions.ts` | `resolveSelection(selectionId, pageId)` → `{ recordIds, count }` (auth-gated) |
| `src/components/dev-panel/panels/selection-actions.test.ts` | Tests for auth/userGuid guards and delegation |
| `src/components/dev-panel/panels/contact-records-panel.tsx` | Maps record IDs → Contact IDs via `resolveContactRecords`, driven by `params.recordID` or upstream selection |
| `src/components/dev-panel/panels/contact-records-actions.ts` | `resolveContactRecords(table, pk, contactIdField, recordIds)` → `ContactRecordResult` |
| `src/components/dev-panel/panels/user-tools-panel.tsx` | Lists the user's authorized tool paths, computes `isAuthorized` against `NEXT_PUBLIC_PROD_URL + pathname`, reports status up via `onAuthorizationChange` |
| `src/components/dev-panel/panels/user-tools-actions.ts` | `getUserTools()` → `string[]` (paths, auth-gated, resolves `userGuid` → `User_ID`) |
| `src/components/dev-panel/panels/user-tools-actions.test.ts` | Tests for auth/userGuid guards and delegation |
| `src/components/dev-panel/panels/deploy-tool-panel.tsx` | Form: tool-name/launch-page/description/flags/pages/roles + server-side env-status badge; rendered only when user is NOT authorized for the current tool path |
| `src/components/dev-panel/panels/deploy-tool-actions.ts` | `listPagesAction`, `listRolesAction`, `deployToolAction`, `getDeployToolEnvStatusAction` — all gated on `NODE_ENV !== 'production'` + session |
| `src/components/dev-panel/panels/deploy-tool-actions.test.ts` | Tests for prod guard, session guard, delegation, env-status reporting |

## Key concepts

### Triple-gate rendering
`DevPanel` returns `null` unless **all three** hold (`src/components/dev-panel/dev-panel.tsx:56-58`):
1. `mounted === true` — avoids SSR/CSR mismatch (value flipped inside `useEffect`)
2. `process.env.NODE_ENV === "development"` (`isDevBuild()`)
3. `window.location.hostname === "localhost" || "127.0.0.1"` (`isLocalhost()`)

Rendered from `ToolContainer` (`src/components/tool/tool-container.tsx:37`): `{params && <DevPanel params={params} />}` — so it only appears on tool pages that pass `params`. Parent has no localhost/env gate; all gating lives inside `DevPanel`.

### Open state persistence
- Key: `mp-dev-panel:open` in `localStorage` (`src/components/dev-panel/dev-panel.tsx:12`)
- Read/write wrapped in try/catch — storage failures default to closed and are swallowed
- Restored on mount via `setIsOpen(readOpenState())` in the same `useEffect` that sets `mounted`

### Sub-panel composition
Inside the expanded body (`src/components/dev-panel/dev-panel.tsx:94-109`):
1. `ParamsPanel` — always
2. `SelectionPanel` — bubbles `selectionRecordIds` up via `onRecordIdsResolved`
3. `ContactRecordsPanel` — consumes `params.recordID` OR `selectionRecordIds` from (2)
4. `UserToolsPanel` — bubbles `isAuthorized` up via `onAuthorizationChange`
5. `DeployToolPanel` — **conditionally rendered only when `!isAuthorized`**; `onDeployed` increments `userToolsRefreshKey` to force (4) to re-fetch

### Authorization check (UserToolsPanel)
- Reads `NEXT_PUBLIC_PROD_URL` on the client, strips trailing `/`, appends `usePathname()`
- Matches against each path returned by `getUserTools()` via `path.includes(prodToolUrl)`
- If `NEXT_PUBLIC_PROD_URL` is unset, renders an amber warning and sets `isAuthorized = false` (so Deploy Tool stays visible)

### Deploy Tool env status
`getDeployToolEnvStatusAction` server-side checks two env vars (`src/components/dev-panel/panels/deploy-tool-actions.ts:46-55`):
- `MINISTRY_PLATFORM_DEV_CLIENT_ID`
- `MINISTRY_PLATFORM_DEV_CLIENT_SECRET`

When missing, the form disables the submit button and surfaces an amber notice naming the missing vars. These are used by `MPHelper`'s dev-credential pipeline because the procedure name starts with `api_dev_` (see `../services/tool-service.md`).

### Stored procedures called from the dev-panel
| SP | Called via | From file |
|----|-----------|-----------|
| `api_Common_GetSelection` | `ToolService.getSelectionRecordIds` | `src/services/toolService.ts:154` (via `selection-actions.ts`) |
| `api_Tools_GetUserTools` | `ToolService.getUserTools` | `src/services/toolService.ts:185` (via `user-tools-actions.ts`) |
| `api_dev_DeployTool` | `ToolService.deployTool` | `src/services/toolService.ts:268` (via `deploy-tool-actions.ts`) |
| `api_MPNextTools_GetPages` | `ToolService.listPages` | `src/services/toolService.ts:207` (via `deploy-tool-actions.ts`) |

`ContactRecordsPanel` does **not** call a stored procedure — it uses `getTableRecords` in `ToolService.resolveContactIds` (`src/services/toolService.ts:335`).

### Glossary candidates
- **DevPanel** — localhost-only overlay defined at `src/components/dev-panel/dev-panel.tsx:44`
- **Selection panel** — the `SelectionPanel` sub-panel that resolves `params.s` to record IDs
- **Deploy tool** — the `DeployToolPanel` form that upserts the current tool into `dp_Tools`

## API / Interface

### `DevPanel`
```tsx
// src/components/dev-panel/dev-panel.tsx:40-44
interface DevPanelProps {
  params: ToolParams;
}

export function DevPanel({ params }: DevPanelProps) { ... }
```

### Server actions
```typescript
// src/components/dev-panel/panels/selection-actions.ts
export interface SelectionResult {
  recordIds: number[];
  count: number;
}
export async function resolveSelection(
  selectionId: number,
  pageId: number
): Promise<SelectionResult>;

// src/components/dev-panel/panels/contact-records-actions.ts
export async function resolveContactRecords(
  tableName: string,
  primaryKey: string,
  contactIdField: string,
  recordIds: number[]
): Promise<ContactRecordResult>;

// src/components/dev-panel/panels/user-tools-actions.ts
export async function getUserTools(): Promise<string[]>;

// src/components/dev-panel/panels/deploy-tool-actions.ts
export async function listPagesAction(search?: string): Promise<PageLookup[]>;
export async function listRolesAction(search?: string): Promise<RoleLookup[]>;
export async function deployToolAction(input: DeployToolInput): Promise<DeployToolResult>;
export interface DeployToolEnvStatus { hasDevCreds: boolean; missing: string[]; }
export async function getDeployToolEnvStatusAction(): Promise<DeployToolEnvStatus>;
```

### Sub-panel props (selected)
```tsx
interface SelectionPanelProps {
  params: ToolParams;
  onRecordIdsResolved?: (recordIds: number[]) => void;
}
interface ContactRecordsPanelProps {
  params: ToolParams;
  selectionRecordIds?: number[];
}
interface UserToolsPanelProps {
  refreshKey?: number;
  onAuthorizationChange?: (isAuthorized: boolean) => void;
}
interface DeployToolPanelProps {
  onDeployed?: () => void;
}
```

## How it works

- `ToolContainer` renders `<DevPanel params={params} />` at the top of the page when `params` is provided (`src/components/tool/tool-container.tsx:37`)
- `DevPanel` returns `null` on first render (pre-`useEffect`), then re-evaluates the three gates — so the bar appears only after hydration on a qualifying localhost dev build
- Toggle button writes `"1"`/`"0"` to `localStorage["mp-dev-panel:open"]`; reads in `useEffect` prevent SSR mismatch
- Sub-panels are arranged so state flows downward from `SelectionPanel` → `ContactRecordsPanel` and upward from `UserToolsPanel` → `DevPanel` (`isAuthorized`) → `DeployToolPanel` (via conditional render). Successful deploy bumps `userToolsRefreshKey`, which re-triggers `UserToolsPanel`'s fetch, which flips `isAuthorized` and unmounts `DeployToolPanel`.
- Every server action begins with `auth.api.getSession({ headers: await headers() })` and extracts `userGuid` (not `session.user.id`) for MP lookups — see `../auth/sessions.md`
- `deploy-tool-actions.ts` adds `process.env.NODE_ENV === "production"` → throw before any session check (belt-and-suspenders against accidental exposure)

## Usage

Copied from `src/components/tool/tool-container.tsx:36-37`:

```tsx
<div className="flex flex-col h-screen">
  {params && <DevPanel params={params} />}
```

The inner gates from `src/components/dev-panel/dev-panel.tsx:56-58`:

```typescript
if (!mounted) return null;
if (!isDevBuild()) return null;
if (!isLocalhost()) return null;
```

Server-action guard pattern, from `src/components/dev-panel/panels/deploy-tool-actions.ts:13-21`:

```typescript
async function requireDevSession(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Deploy Tool is not available in production.");
  }
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    throw new Error("Unauthorized - Missing user session data");
  }
}
```

## Gotchas

- **Don't ship DevPanel to production.** The `DevPanel` component gates on `NODE_ENV === "development"` AND `hostname === "localhost" | "127.0.0.1"`. Removing either check (or setting `NODE_ENV=development` on a deployed build) would leak deploy-tool and session internals. Defense-in-depth: `deploy-tool-actions.ts` also throws in production before any session check.
- **Server actions in a dev-only code path are still reachable.** `/* "use server" */` exports are addressable over the network regardless of where they're imported. `requireDevSession` in `deploy-tool-actions.ts` enforces the `NODE_ENV` check server-side; `selection-actions.ts`, `contact-records-actions.ts`, and `user-tools-actions.ts` only check for a valid session — they do NOT gate on `NODE_ENV`. This is by design (those same services back real features), but it means the "dev-only" label applies to the **UI** only, not the actions. (See TODO `2026-04-17-components-dev-panel-prod-guard-gap.md`.)
- **Missing `NEXT_PUBLIC_PROD_URL` makes the authorization check non-functional.** When unset, `UserToolsPanel` cannot match production URLs and always treats the user as unauthorized, which keeps `DeployToolPanel` visible even for already-registered tools.
- **`session.user.id` is NOT `User_GUID`.** Every action extracts `userGuid` from `session.user` (see `../auth/sessions.md`) before calling `UserService.getUserIdByGuid`.

## Related docs
- `tool-framework.md` — `ToolContainer` that mounts this overlay
- `../services/tool-service.md` — `ToolService.getSelectionRecordIds`, `getUserTools`, `deployTool`, `resolveContactIds`, `listPages`, `listRoles`
- `../routing/tool-params.md` — `ToolParams` shape + `parseToolParams`
- `../required-stored-procs.md` — `api_Common_GetSelection`, `api_Tools_GetUserTools` call contracts
- `../auth/sessions.md` — why `userGuid` (not `user.id`) is used for MP lookups
