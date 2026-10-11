---
title: Group Wizard
domain: components
type: reference
applies_to:
  - src/components/group-wizard/
  - src/app/(web)/tools/groupwizard/
symbols:
  - StepIdentity
  - StepOrganization
  - StepMeeting
  - StepAttributes
  - StepSettings
  - StepReview
  - WizardStepper
  - WizardNavigation
  - ContactSearch
  - GroupSearch
  - groupWizardSchema
  - GROUP_WIZARD_DEFAULTS
  - buildGroupWizardDefaults
  - STEP_FIELDS
  - WIZARD_STEPS
  - GroupWizardFormData
  - GroupWizardLookups
  - fetchGroupWizardLookups
  - fetchGroupRecord
  - createGroup
  - updateGroup
  - searchContacts
  - searchGroups
related:
  - ../services/group-service.md
  - ../components/tool-framework.md
  - ../auth/sessions.md
last_verified: 2026-10-10
---

## Purpose
Six-step create/edit wizard for Ministry Platform `Groups` records. Client-side React Hook Form + Zod per-step validation, server actions call `GroupService`, tool is mounted at `/tools/groupwizard` via the standard `ToolContainer` shell.

## Files

| File | Role |
|---|---|
| `src/components/group-wizard/index.ts` | Barrel export (components, schema, types, constants) |
| `src/components/group-wizard/types.ts` | `GroupWizardLookups`, `WIZARD_STEPS`, result/error types |
| `src/components/group-wizard/schema.ts` | Zod `groupWizardSchema`, `STEP_FIELDS`, `GROUP_WIZARD_DEFAULTS`, `buildGroupWizardDefaults(mpTimezone)` |
| `src/components/group-wizard/actions.ts` | Server actions: lookups, contact/group search, fetch/create/update; `requireAccess` gate + server-side `parseGroupPayload` |
| `src/components/group-wizard/wizard-stepper.tsx` | Desktop ordered-list stepper + mobile progress bar |
| `src/components/group-wizard/wizard-navigation.tsx` | Back / Next / Cancel / Submit footer |
| `src/components/group-wizard/step-identity.tsx` | Step 0 — `Group_Name`, `Group_Type_ID`, dates, `Reason_Ended`, description |
| `src/components/group-wizard/step-organization.tsx` | Step 1 — `Congregation_ID`, `Ministry_ID`, `Primary_Contact`, `Parent_Group`, `Priority_ID` |
| `src/components/group-wizard/step-meeting.tsx` | Step 2 — day / time / frequency / duration / room / offsite address / `Meets_Online` |
| `src/components/group-wizard/step-attributes.tsx` | Step 3 — target size, life stage, focus, book, SMS number, `Group_Is_Full` |
| `src/components/group-wizard/step-settings.tsx` | Step 4 — visibility, check-in, classroom, promotion (groups + dates + flags) |
| `src/components/group-wizard/step-review.tsx` | Step 5 — review cards with per-section "Edit" buttons + success screen |
| `src/components/group-wizard/contact-search.tsx` | Debounced Popover+Command combobox over `searchContacts` action |
| `src/components/group-wizard/group-search.tsx` | Debounced Popover+Command combobox over `searchGroups` action (with clear) |

Route host (outside the component folder):

| File | Role |
|---|---|
| `src/app/(web)/tools/groupwizard/page.tsx` | Server entry; `requireToolAccess({ table: "Groups", operation: "read" })` first, then `parseToolParams` (`@/lib/tool-params.server`) + `getMpTimezone()` in parallel |
| `src/app/(web)/tools/groupwizard/group-wizard.tsx` | Client shell (`{ params, mpTimezone }`): `useForm`, step gating, submit dispatch, ToolContainer |
| `src/app/(web)/tools/groupwizard/loading.tsx` | Route loading skeleton |

Every component under `src/components/group-wizard/` has a co-located `*.test.tsx`; `actions.ts` and `schema.ts` have `*.test.ts` (12 test files).

## Key concepts

### Six steps (index → label)

Source: `src/components/group-wizard/types.ts:51-58`

| Index | Label | Description | Route host switch |
|---|---|---|---|
| 0 | Identity | Name, type & dates | `StepIdentity` |
| 1 | Organization | Ministry, people & structure | `StepOrganization` |
| 2 | Meeting | Schedule & location | `StepMeeting` |
| 3 | Attributes | Size, focus & details | `StepAttributes` |
| 4 | Settings | Visibility & promotion | `StepSettings` |
| 5 | Review | Review & submit | `StepReview` |

`STEP_FIELDS` (`schema.ts:58-65`) maps each step index to the RHF field names validated when Next is clicked. Step 5 has `[]` — no fields to trigger.

### Create vs edit mode

- Mode is derived in the client shell (`src/app/(web)/tools/groupwizard/group-wizard.tsx:42-43`):
  - `isNew = isNewRecord(params)` (from `@/lib/tool-params`)
  - `isEditMode = !isNew && !!params.recordID && params.recordID > 0`
- Edit mode effect (`group-wizard.tsx:74-108`) calls `fetchGroupRecord(recordID)` and `form.reset(result.data)`.
- `handleSubmit` (`group-wizard.tsx:140-155`) dispatches to `updateGroup` when editing, `createGroup` otherwise.
- Submit success → `submitResult` state → `StepReview` renders a success screen (`step-review.tsx:81-108`) with "Create Another" (new only) + "Close".

### Form state (`react-hook-form` ^7.89.0 + `zod` ^4.6.5)

`src/app/(web)/tools/groupwizard/group-wizard.tsx:57-63`:

```typescript
const initialDefaults = useMemo(() => buildGroupWizardDefaults(mpTimezone), [mpTimezone]);

const form = useForm<GroupWizardFormData>({
  resolver: zodResolver(groupWizardSchema),
  defaultValues: initialDefaults,
  mode: "onTouched",
});
```

- Steps consume `useFormContext<GroupWizardFormData>()` rather than prop drilling (`step-identity.tsx:29`, `step-organization.tsx:39`, etc.).
- `<Form {...form}>` wraps the entire flow in `group-wizard.tsx:207`.
- Per-step validation on Next: `form.trigger(STEP_FIELDS[currentStep])` (`group-wizard.tsx:120-128`).
- Completed steps tracked in `Set<number>` local state; clicking a past/completed step is allowed, future ones are gated (`wizard-stepper.tsx:22-39`, `group-wizard.tsx:134-138`).

### Contact / group display maps

IDs round-trip through the form; human-readable names are held outside RHF:

- `contactDisplayMap: Map<number, string>` and `groupDisplayMap: Map<number, string>` in the shell (`group-wizard.tsx:52-53`).
- Populated by `onContactSelect` / `onGroupSelect` callbacks from the combobox widgets (`group-wizard.tsx:110-118`).
- **Edit mode:** `fetchGroupRecord` returns `displayNames`, and the edit-mode effect seeds both maps before `form.reset`, so loaded `Primary_Contact` / `Parent_Group` / `Promote_to_Group` / `Descended_From` show names, not `ID: <n>`.

### Debounced typeahead (ContactSearch / GroupSearch)

- 300ms debounce via `setTimeout` + `useRef` (`contact-search.tsx:53-59`, `group-search.tsx:60-66`)
- Minimum query length: 2 characters (matched by the server actions — see API below)
- `<Command shouldFilter={false}>` — server is the filter, not cmdk
- `GroupSearch` adds a "Clear selection" row when `value` is truthy (`group-search.tsx:108-122`) — `ContactSearch` does not

## API / Interface

### Barrel exports (`index.ts`)

```typescript
export { StepIdentity, StepOrganization, StepMeeting, StepAttributes, StepSettings, StepReview };
export { WizardStepper, WizardNavigation, ContactSearch, GroupSearch };
export { groupWizardSchema, GROUP_WIZARD_DEFAULTS, buildGroupWizardDefaults, STEP_FIELDS };
export type { GroupWizardFormData };
export { WIZARD_STEPS };
export type {
  GroupWizardLookups, ContactSearchResult, GroupSearchResult,
  CreateGroupResult, UpdateGroupResult, ActionError,
  LookupItem, WizardStepIndex,
};
```

### Server actions (`actions.ts`)

```typescript
fetchGroupWizardLookups(): Promise<GroupWizardLookups>
searchContacts(term: string): Promise<ContactSearchResult[]>            // returns [] when term.length < 2
searchGroups(term: string): Promise<GroupSearchResult[]>                // returns [] when term.length < 2
fetchGroupRecord(groupId: number):
  Promise<{ success: true; data: GroupWizardFormData;
            displayNames: { contacts: Record<number, string>; groups: Record<number, string> } } | ActionError>
createGroup(data: GroupWizardFormData): Promise<CreateGroupResult | ActionError>
updateGroup(groupId: number, data: GroupWizardFormData): Promise<UpdateGroupResult | ActionError>
```

- All actions call `requireAccess(table, operation)` (`actions.ts:28-33`) → `AuthorizationService.requireSecurityRole`: `Groups`/`read` for lookups, `searchGroups`, `fetchGroupRecord`; `Contacts`/`read` for `searchContacts`; `Groups`/`create` and `Groups`/`update` for the writes. The gate runs **before** the short-query `[]` return.
- `fetchGroupRecord` / `createGroup` / `updateGroup` catch errors (including a refusal) and return `ActionError`; the lookup and search actions let the refusal propagate.
- `createGroup` / `updateGroup` re-validate the payload server-side with `parseGroupPayload` (`actions.ts:44-51`, `groupWizardSchema.safeParse`); failure → `Invalid group data: <field names>` (names only, never values).
- No action passes `$userId`: `GroupService` takes write attribution from its own `requireSecurityRole` call (CLAUDE.md rule 13).
- All delegate to `GroupService.getInstance()` from `src/services/groupService.ts`.

### Step component prop contracts

| Component | Key props |
|---|---|
| `StepIdentity` | `lookups: GroupWizardLookups` |
| `StepOrganization` | `lookups`, `contactDisplayMap`, `groupDisplayMap`, `onContactSelect`, `onGroupSelect` |
| `StepMeeting` | `lookups` |
| `StepAttributes` | `lookups` |
| `StepSettings` | `lookups`, `groupDisplayMap`, `onGroupSelect` |
| `StepReview` | `lookups`, `contactDisplayMap`, `groupDisplayMap`, `onEditStep`, `submitResult`, `isEditMode`, `onCreateAnother`, `onClose` |
| `WizardStepper` | `currentStep`, `completedSteps: Set<number>`, `onStepClick` |
| `WizardNavigation` | `currentStep`, `totalSteps`, `onBack`, `onNext`, `onCancel`, `onSubmit`, `isSubmitting`, `isEditMode` |
| `ContactSearch` | `value: number \| undefined`, `displayName`, `onSelect(id, name)`, `disabled?` |
| `GroupSearch` | `value: number \| null \| undefined`, `displayName`, `onSelect(id \| null, name)`, `placeholder?`, `disabled?` |

### Schema surface

`groupWizardSchema` is a flat `z.object(...)` over ~40 `Groups`-table fields. Notable required fields (non-nullable, will fail Next on step boundary):

- Step 0: `Group_Name` (1–75), `Group_Type_ID`, `Start_Date`
- Step 1: `Congregation_ID`, `Ministry_ID`, `Primary_Contact`
- All boolean flags are required `z.boolean()` (not optional) — defaults handled in `GROUP_WIZARD_DEFAULTS`.

## How it works

1. Route `/tools/groupwizard` gates with `requireToolAccess` (`page.tsx:12`), then resolves `searchParams` via `parseToolParams` and the MP time zone via `getMpTimezone()` (`page.tsx:14-17`).
2. Client shell initialises RHF with `buildGroupWizardDefaults(mpTimezone)` (`Start_Date` = today in the MP domain zone), mode `onTouched`.
3. Mount effects load `fetchGroupWizardLookups()`; in edit mode, also `fetchGroupRecord(recordID)` → `form.reset(data)`.
4. `<WizardStepper>` renders steps; non-current step clicks are only allowed if `completedSteps.has(index) || index < currentStep`.
5. `<WizardNavigation>` "Next" calls `handleNext`: runs `form.trigger(STEP_FIELDS[currentStep])`; on success, marks current step complete and advances.
6. On final step, the primary button switches to Create/Save (`wizard-navigation.tsx:55-68`). Clicking calls `handleSubmit`:
   - `createGroup(data)` or `updateGroup(recordID, data)` → service → MP API.
   - Success → `submitResult` state → `StepReview` shows success screen; stepper + nav are hidden.
   - Failure → `loadError` is set, which replaces the form body with an `Alert` (`group-wizard.tsx:199-205`).
7. "Create Another" resets the form to `buildGroupWizardDefaults(mpTimezone)` + step state; "Close" calls `router.back()`.

## Usage

Route-level mount (`src/app/(web)/tools/groupwizard/page.tsx`):

```typescript
import { GroupWizard } from "./group-wizard";
import { requireToolAccess } from "@/app/(web)/tools/require-tool-access";
import { parseToolParams } from "@/lib/tool-params.server";
import { getMpTimezone } from "@/components/shared-actions/domain";

interface GroupWizardPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function GroupWizardPage({ searchParams }: GroupWizardPageProps) {
  // Self-gating, before ANY param parsing or data call — see require-tool-access.ts.
  await requireToolAccess({ table: "Groups", operation: "read" });

  const [params, mpTimezone] = await Promise.all([
    parseToolParams(await searchParams),
    getMpTimezone(),
  ]);

  return <GroupWizard params={params} mpTimezone={mpTimezone} />;
}
```

Client shell dispatch (`src/app/(web)/tools/groupwizard/group-wizard.tsx:140-155`):

```typescript
const handleSubmit = useCallback(async () => {
  const data = form.getValues();

  let result;
  if (isEditMode && params.recordID) {
    result = await updateGroup(params.recordID, data);
  } else {
    result = await createGroup(data);
  }

  if (result.success) {
    setSubmitResult({ groupId: result.groupId, groupName: result.groupName });
  } else {
    setLoadError(result.error);
  }
}, [form, isEditMode, params.recordID]);
```

## Gotchas

- **Quoted special-character field name.** `Secure_Check-in` contains a hyphen — it is referenced with bracket/string syntax throughout: `schema.ts:43` (`'Secure_Check-in': z.boolean()`), `STEP_FIELDS` uses `'Secure_Check-in' as keyof GroupWizardFormData` (`schema.ts:63`), `step-settings.tsx:115`, `step-review.tsx:200, 206`. Do not rename without also updating all string literals.
- **`Start_Date` default comes from `buildGroupWizardDefaults(mpTimezone)`** (`schema.ts:136-140`), i.e. today's date in the MP domain time zone. The static `GROUP_WIZARD_DEFAULTS` leaves `Start_Date: ''` (`schema.ts:90`) — use the builder, never `new Date().toISOString()` (CLAUDE.md rule 17).
- **Per-step validation gates Next, not form submit.** `form.trigger([fields])` is called in `handleNext`; the client `handleSubmit` (`group-wizard.tsx:140`) does **not** re-run Zod. The server does: `createGroup`/`updateGroup` run `parseGroupPayload` before any MP call. `GROUP_WIZARD_DEFAULTS` uses `undefined as unknown as number` casts for four required ID fields (`Group_Type_ID`, `Congregation_ID`, `Ministry_ID`, `Primary_Contact`, `schema.ts:88-95`) — those fail Zod on `trigger` before the user can reach Review.
- **No unsaved-changes guard.** Navigating away (closing the tool, clicking Cancel, or hitting browser back) discards form state silently — no confirmation dialog. Multi-step progress is lost. Known UX gap; no TODO filed.
- **Search actions silent-return `[]` for short queries.** `searchContacts` / `searchGroups` return `[]` if `term.length < 2` (`actions.ts:61, 68`), after the authorization gate. The combobox also enforces this client-side (`contact-search.tsx:38-41`, `group-search.tsx:45-48`). Do not rely on server validation alone.
- **`ContactSearch` has no "clear" affordance.** Unlike `GroupSearch` (which shows a "Clear selection" row when `value` is set, `group-search.tsx:108-122`), `ContactSearch` cannot be cleared — users must pick a different contact. `Primary_Contact` is required so this is intentional, but it means stray test selections can't be undone without a form reset.
- **Step click gating can orphan steps after edit-and-jump.** Clicking Edit on a Review card jumps to that step; if the user then goes Back/Next through, later steps remain in `completedSteps` even if their now-dependent values changed — Next does re-validate, but already-advanced steps are not re-validated until the user explicitly revisits them (`group-wizard.tsx:134-138`).

## Related docs

- `../services/group-service.md` — `GroupService` (`createGroup`, `updateGroup`, `getGroup`, `fetchAllLookups`, `searchContacts`, `searchGroups`)
- `../components/tool-framework.md` — `ToolContainer` wrapper used by the route shell
- `../auth/sessions.md` — `session.user.userGuid` (the gate resolves the MP `User_ID` from it)
- `../utils/tool-params.md` — `ToolParams`, `isNewRecord`, `parseToolParams` contract consumed by the page
