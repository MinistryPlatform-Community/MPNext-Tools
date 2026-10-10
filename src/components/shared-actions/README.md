# Shared Actions

This folder contains **shared server actions** that are used across multiple components or features.

## When to Add Actions Here

Place actions in this folder when:
- The action is used by **multiple components** across different features
- The action provides **shared utility** or **common functionality**
- The action handles **cross-cutting concerns** (logging, analytics, etc.)

## When to Keep Actions Co-located

Keep actions with their component folder when:
- The action is **feature-specific** and only used by that component
- The action is tightly coupled to a single feature's business logic

## Examples

**Shared Actions (place here):**
- `user.ts` - Current-user profile lookup used by contexts and components
- `sign-out.ts` - `handleSignOut`: app sign-out plus MP RP-initiated logout (used by the sign-out forms on `/no-access` and `/session-error`)
- `auth.ts` - Authentication actions used across the app
- `analytics.ts` - Analytics tracking used by multiple features
- `notifications.ts` - Notification system used app-wide

**Feature-Specific Actions (keep co-located):**
- `components/address-labels/actions.ts` - Address-label fetch and mail merge

## Usage

```typescript
// Importing shared actions
import { getCurrentUserProfile } from '@/components/shared-actions/user';

// Returns the CALLING user's profile. It takes no arguments by design: a server
// action is a caller-shaped POST endpoint, so a user-id/GUID parameter would let
// any authenticated MP user read anyone else's profile (IDOR). Do not re-add one.
const profile = await getCurrentUserProfile();

// Importing feature-specific actions
import { myAction } from './actions'; // Within same folder
```
