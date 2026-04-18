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
last_verified: 2026-04-17
---

## Purpose
Six-step create/edit wizard for Ministry Platform `Groups` records. Client-side React Hook Form + Zod per-step validation, server actions call `GroupService`, tool is mounted at `/tools/groupwizard` via the standard `ToolContainer` shell.

## Files

| File | Role |
|---|---|
| `src/components/group-wizard/index.ts` | Barrel export (components, schema, types, constants) |
| `src/components/group-wizard/types.ts` | `GroupWizardLookups`, `WIZARD_STEPS`, result/error types |
| `src/components/group-wizard/schema.ts` | Zod `groupWizardSchema`, `STEP_FIELDS`, `GROUP_WIZARD_DEFAULTS` |
| `src/components/group-wizard/actions.ts` | Server actions: lookups, contact/group search, fetch/create/update |
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
| `src/app/(web)/tools/groupwizard/page.tsx` | Server entry; awaits `searchParams`, calls `parseToolParams` |
| `src/app/(web)/tools/groupwizard/group-wizard.tsx` | Client shell: `useForm`, step gating, submit dispatch, ToolContainer |
| `src/app/(web)/tools/groupwizard/loading.tsx` | Route loading skeleton |

No `*.test.*` files exist under `src/components/group-wizard/` — see `../../TODO/2026-04-17-components-group-wizard-missing-tests.md`.

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

- Mode is derived in the client shell (`src/app/(web)/tools/groupwizard/group-wizard.tsx:41-42`):
  - `isNew = isNewRecord(params)` (from `@/lib/tool-params`)
  - `isEditMode = !isNew && !!params.recordID && params.recordID > 0`
- Edit mode effect (`group-wizard.tsx:69-84`) calls `fetchGroupRecord(recordID)` and `form.reset(result.data)`.
- `handleSubmit` (`group-wizard.tsx:121-136`) dispatches to `updateGroup` when editing, `createGroup` otherwise.
- Submit success → `submitResult` state → `StepReview` renders a success screen (`step-review.tsx:81-108`) with "Create Another" (new only) + "Close".

### Form state (React Hook Form 7.71.1 + Zod 4.3.6)

`src/app/(web)/tools/groupwizard/group-wizard.tsx:54-58`:

```typescript
const form = useForm<GroupWizardFormData>({
  resolver: zodResolver(groupWizardSchema),
  defaultValues: GROUP_WIZARD_DEFAULTS,
  mode: "onTouched",
});
```

- Steps consume `useFormContext<GroupWizardFormData>()` rather than prop drilling (`step-identity.tsx:29`, `step-organization.tsx:39`, etc.).
- `<Form {...form}>` wraps the entire flow in `group-wizard.tsx:188`.
- Per-step validation on Next: `form.trigger(STEP_FIELDS[currentStep])` (`group-wizard.tsx:96-109`).
- Completed steps tracked in `Set<number>` local state; clicking a past/completed step is allowed, future ones are gated (`wizard-stepper.tsx:22-41`, `group-wizard.tsx:115-119`).

### Contact / group display maps

IDs round-trip through the form; human-readable names are held outside RHF:

- `contactDisplayMap: Map<number, string>` and `groupDisplayMap: Map<number, string>` in the shell (`group-wizard.tsx:51-52`).
- Populated by `onContactSelect` / `onGroupSelect` callbacks from the combobox widgets (`group-wizard.tsx:86-94`).
- **Edit-mode gap:** `fetchGroupRecord` hydrates form values only; it does **not** seed display maps, so selected `Primary_Contact` / `Parent_Group` / `Promote_to_Group` / `Descended_From` render as `ID: <n>` until the user re-selects. See `../../TODO/2026-04-17-components-group-wizard-display-map-edit-mode.md`.

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
export { groupWizardSchema, GROUP_WIZARD_DEFAULTS, STEP_FIELDS };
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
  Promise<{ success: true; data: GroupWizardFormData } | ActionError>
createGroup(data: GroupWizardFormData): Promise<CreateGroupResult | ActionError>
updateGroup(groupId: number, data: GroupWizardFormData): Promise<UpdateGroupResult | ActionError>
```

- All actions gate on `auth.api.getSession({ headers: await headers() })` and throw `'Unauthorized'` if no session (`actions.ts:17-21`).
- `createGroup` / `updateGroup` additionally resolve the MP `$userId` from `session.user.userGuid` via `UserService.getUserIdByGuid` (`actions.ts:23-29, 69, 84`).
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

1. Route `/tools/groupwizard` resolves `searchParams` via `parseToolParams` (`page.tsx:9`).
2. Client shell initialises RHF with `GROUP_WIZARD_DEFAULTS`, mode `onTouched`.
3. Mount effects load `fetchGroupWizardLookups()`; in edit mode, also `fetchGroupRecord(recordID)` → `form.reset(data)`.
4. `<WizardStepper>` renders steps; non-current step clicks are only allowed if `completedSteps.has(index) || index < currentStep`.
5. `<WizardNavigation>` "Next" calls `handleNext`: runs `form.trigger(STEP_FIELDS[currentStep])`; on success, marks current step complete and advances.
6. On final step, the primary button switches to Create/Save (`wizard-navigation.tsx:55-69`). Clicking calls `handleSubmit`:
   - `createGroup(data)` or `updateGroup(recordID, data)` → service → MP API.
   - Success → `submitResult` state → `StepReview` shows success screen; stepper + nav are hidden.
   - Failure → `loadError` is set, which replaces the form body with an `Alert` (`group-wizard.tsx:180-186`).
7. "Create Another" resets the form + step state; "Close" calls `router.back()`.

## Usage

Route-level mount (`src/app/(web)/tools/groupwizard/page.tsx`):

```typescript
import { GroupWizard } from "./group-wizard";
import { parseToolParams } from "@/lib/tool-params";

interface GroupWizardPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function GroupWizardPage({ searchParams }: GroupWizardPageProps) {
  const params = await parseToolParams(await searchParams);
  return <GroupWizard params={params} />;
}
```

Client shell dispatch (`src/app/(web)/tools/groupwizard/group-wizard.tsx:121-136`):

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
- **`Start_Date` default is `new Date().toISOString().split('T')[0]`** (`schema.ts:71`). This is evaluated at module load, which in a Next.js App Router client bundle means it is fixed at the first render of the client component (fine), but tests importing the module will capture the test-run date.
- **Display maps are not seeded in edit mode.** `fetchGroupRecord` returns only numeric IDs for `Primary_Contact`, `Parent_Group`, `Promote_to_Group`, `Descended_From` — those fields render as `ID: <n>` on the Review step until the user opens the combobox and re-selects. TODO: `../../TODO/2026-04-17-components-group-wizard-display-map-edit-mode.md`.
- **Per-step validation gates Next, not form submit.** `form.trigger([fields])` is called in `handleNext`; `handleSubmit` (`group-wizard.tsx:121`) does **not** re-run Zod validation before calling the server action. Server action relies on RHF+Zod having already kept the form valid. `GROUP_WIZARD_DEFAULTS` uses `undefined as unknown as number` casts for three required ID fields (`Group_Type_ID`, `Congregation_ID`, `Ministry_ID`, `Primary_Contact`, `schema.ts:69-76`) — those will fail Zod on `trigger` before the user can reach Review, which is the intended safety net.
- **No unsaved-changes guard.** Navigating away (closing the tool, clicking Cancel, or hitting browser back) discards form state silently — no confirmation dialog. Multi-step progress is lost. TODO: `../../TODO/2026-04-17-components-group-wizard-missing-tests.md` (covers both missing tests and this UX gap).
- **Search actions silent-return `[]` for short queries.** `searchContacts` / `searchGroups` return `[]` if `term.length < 2` (`actions.ts:39, 46`). The combobox also enforces this client-side (`contact-search.tsx:38-41`, `group-search.tsx:45-48`). Do not rely on server validation alone.
- **`ContactSearch` has no "clear" affordance.** Unlike `GroupSearch` (which shows a "Clear selection" row when `value` is set, `group-search.tsx:108-122`), `ContactSearch` cannot be cleared — users must pick a different contact. `Primary_Contact` is required so this is intentional, but it means stray test selections can't be undone without a form reset.
- **Step click gating can orphan steps after edit-and-jump.** Clicking Edit on a Review card jumps to that step; if the user then goes Back/Next through, later steps remain in `completedSteps` even if their now-dependent values changed — Next does re-validate, but already-advanced steps are not re-validated until the user explicitly revisits them (`group-wizard.tsx:115-119`).

## Related docs

- `../services/group-service.md` — `GroupService` (`createGroup`, `updateGroup`, `getGroup`, `fetchAllLookups`, `searchContacts`, `searchGroups`)
- `../components/tool-framework.md` — `ToolContainer` wrapper used by the route shell
- `../auth/sessions.md` — `session.user.userGuid` → `UserService.getUserIdByGuid` chain used by `createGroup`/`updateGroup`
- `../routing/tool-params.md` — `ToolParams`, `isNewRecord`, `parseToolParams` contract consumed by the page
