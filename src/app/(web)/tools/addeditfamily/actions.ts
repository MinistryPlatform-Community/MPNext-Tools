"use server";

import { FamilyService, PartialSaveError } from "@/services/familyService";
import { AuthorizationService } from "@/services/authorizationService";
import { GooglePlacesService } from "@/services/googlePlacesService";
import { HouseholdSchema } from "@/lib/dto/family";
import type {
  ContactSearchResult,
  FamilyDefaults,
  FamilyLookups,
  Household,
  SaveProgress,
} from "@/lib/dto/family";
import type { PlacePrediction, PlaceDetails } from "@/lib/providers/google-places";

export type ActionError = { success: false; error: string; progress?: SaveProgress };

/**
 * Authorization gate for this feature's server actions.
 *
 * A server action is a callable POST endpoint whether or not the page that
 * renders it was ever fetched, so the page-level gate in the tools layout is
 * not sufficient on its own. This replaces the previous bare session check:
 * MP's OIDC endpoint authenticates ANY dp_Users record, and this app reads MP
 * with its own service account, so "a session exists" proves nothing about
 * whether the caller may see or change this data.
 *
 * The service layer gates again — that is deliberate defence in depth, and the
 * per-request memoization in AuthorizationService keeps it to one MP read.
 */
async function requireAccess(
  table: string,
  operation: "read" | "create" | "update" | "delete",
): Promise<number> {
  return AuthorizationService.getInstance().requireSecurityRole({ table, operation });
}


export async function searchContacts(term: string): Promise<ContactSearchResult[]> {
  await requireAccess("Contacts", "read");
  const service = await FamilyService.getInstance();
  return service.searchContacts(term);
}

export async function fetchFamilyLookups(): Promise<FamilyLookups> {
  await requireAccess("Contacts", "read");
  const service = await FamilyService.getInstance();
  return service.getLookups();
}

export async function fetchFamilyDefaults(): Promise<FamilyDefaults> {
  await requireAccess("Contacts", "read");
  const service = await FamilyService.getInstance();
  return service.getDefaults();
}

export async function fetchHousehold(
  contactId: number,
): Promise<{ success: true; household: Household } | ActionError> {
  try {
    await requireAccess("Households", "read");
    const service = await FamilyService.getInstance();
    const household = await service.getHousehold(contactId);
    if (!household) return { success: false, error: "Household not found" };
    return { success: true, household };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load household",
    };
  }
}

export async function resolveContactIdFromPage(args: {
  tableName: string;
  primaryKey: string;
  recordId: number;
  contactIdField: string;
}): Promise<{ success: true; contactId: number | null } | ActionError> {
  try {
    await requireAccess(args.tableName, "read");
    const service = await FamilyService.getInstance();
    const contactId = await service.resolveContactIdFromPage(
      args.tableName,
      args.primaryKey,
      args.recordId,
      args.contactIdField,
    );
    return { success: true, contactId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to resolve contact",
    };
  }
}

export async function fetchNextEnvelopeNumber(): Promise<number> {
  await requireAccess("Contacts", "read");
  const service = await FamilyService.getInstance();
  return service.getNextEnvelopeNumber();
}

export async function placesEnabled(): Promise<boolean> {
  await requireAccess("Addresses", "read");
  const service = await GooglePlacesService.getInstance();
  return service.isEnabled();
}

export async function placeAutocomplete(
  input: string,
  sessionToken: string,
): Promise<PlacePrediction[]> {
  await requireAccess("Addresses", "read");
  if (input.trim().length < 3) return [];
  const service = await GooglePlacesService.getInstance();
  if (!(await service.isEnabled())) return [];
  return service.autocomplete(input, sessionToken);
}

export async function placeDetails(
  placeId: string,
  sessionToken: string,
): Promise<{ success: true; details: PlaceDetails } | ActionError> {
  try {
    await requireAccess("Addresses", "read");
    const service = await GooglePlacesService.getInstance();
    const details = await service.getPlaceDetails(placeId, sessionToken);
    return { success: true, details };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch place details",
    };
  }
}

export async function saveFamily(
  household: Household,
): Promise<{ success: true; progress: SaveProgress } | ActionError> {
  try {
    await requireAccess("Households", "update");

    /**
     * Parse before the payload reaches the service.
     *
     * `household: Household` is a compile-time annotation only — this is a
     * server action, i.e. a public POST endpoint, and the types are erased at
     * runtime. Fields from this object are interpolated into MP `$filter`
     * strings and used to target `Donors`/`Contacts` updates downstream, so
     * "it is typed `number`" is not a runtime guarantee of anything.
     *
     * The error deliberately reports field PATHS only, never the submitted
     * values (CLAUDE.md rule 14: error messages travel further than logs).
     */
    const parsed = HouseholdSchema.safeParse(household);
    if (!parsed.success) {
      const paths = [
        ...new Set(
          parsed.error.issues.map((issue) =>
            issue.path.length > 0 ? issue.path.join(".") : "(root)",
          ),
        ),
      ];
      return {
        success: false,
        error: `Invalid family data. Check these fields: ${paths.join(", ")}`,
      };
    }

    const service = await FamilyService.getInstance();
    const progress = await service.saveHousehold(parsed.data);
    return { success: true, progress };
  } catch (error) {
    if (error instanceof PartialSaveError) {
      return { success: false, error: error.message, progress: error.progress };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save family",
    };
  }
}
