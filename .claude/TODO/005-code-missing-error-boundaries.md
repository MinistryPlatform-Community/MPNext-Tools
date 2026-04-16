# Missing React Error Boundaries and Loading States

**Severity:** MEDIUM  
**Category:** Code Quality / UX  

## Problem

### No Error Boundaries
The application has zero `error.tsx` or `global-error.tsx` files. Uncaught React render errors show the default Next.js error page with no recovery option.

### No Loading States
No `loading.tsx` files exist for any route. Users see no visual feedback during server-side data loading (searchParams parsing, auth checks).

### Unhandled Promise Rejections
- `src/app/signin/page.tsx:16` — `authClient.getSession().then(...)` has no `.catch()`. If the session check fails, the user is stuck with no error feedback.
- `src/app/(web)/tools/groupwizard/group-wizard.tsx:72` — `fetchGroupRecord()` promise has no `.catch()`. Edit mode silently fails.

## Recommended Fix

1. Add `error.tsx` at `src/app/(web)/error.tsx` for authenticated routes
2. Consider `global-error.tsx` at `src/app/global-error.tsx` for catastrophic failures  
3. Add `loading.tsx` to tool routes (addresslabels, groupwizard, template, templateeditor)
4. Add `.catch()` handlers to the unprotected promise chains in signin and group-wizard
