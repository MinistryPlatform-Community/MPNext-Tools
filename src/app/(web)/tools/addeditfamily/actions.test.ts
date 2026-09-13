import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Household, SaveProgress } from "@/lib/dto/family";

const { mockRequireSecurityRole } = vi.hoisted(() => ({
  mockRequireSecurityRole: vi.fn(async () => 42),
}));

vi.mock("@/services/authorizationService", () => ({
  AuthorizationService: {
    getInstance: () => ({
      requireSecurityRole: mockRequireSecurityRole,
    }),
  },
}));

const {
  mockSearchContacts,
  mockGetLookups,
  mockGetDefaults,
  mockGetHousehold,
  mockResolveContactIdFromPage,
  mockGetNextEnvelopeNumber,
  mockSaveHousehold,
} = vi.hoisted(() => ({
  mockSearchContacts: vi.fn(),
  mockGetLookups: vi.fn(),
  mockGetDefaults: vi.fn(),
  mockGetHousehold: vi.fn(),
  mockResolveContactIdFromPage: vi.fn(),
  mockGetNextEnvelopeNumber: vi.fn(),
  mockSaveHousehold: vi.fn(),
}));

const FakePartialSaveError = vi.hoisted(() => {
  return class FakePartialSaveError extends Error {
    progress: SaveProgress;
    underlying: unknown;
    constructor(progress: SaveProgress, underlying: unknown) {
      super(underlying instanceof Error ? underlying.message : String(underlying));
      this.name = "PartialSaveError";
      this.progress = progress;
      this.underlying = underlying;
    }
  };
});

vi.mock("@/services/familyService", () => ({
  FamilyService: {
    getInstance: vi.fn(async () => ({
      searchContacts: mockSearchContacts,
      getLookups: mockGetLookups,
      getDefaults: mockGetDefaults,
      getHousehold: mockGetHousehold,
      resolveContactIdFromPage: mockResolveContactIdFromPage,
      getNextEnvelopeNumber: mockGetNextEnvelopeNumber,
      saveHousehold: mockSaveHousehold,
    })),
  },
  PartialSaveError: FakePartialSaveError,
}));

const { mockIsEnabled, mockAutocomplete, mockGetPlaceDetails } = vi.hoisted(() => ({
  mockIsEnabled: vi.fn(),
  mockAutocomplete: vi.fn(),
  mockGetPlaceDetails: vi.fn(),
}));

vi.mock("@/services/googlePlacesService", () => ({
  GooglePlacesService: {
    getInstance: vi.fn(async () => ({
      isEnabled: mockIsEnabled,
      autocomplete: mockAutocomplete,
      getPlaceDetails: mockGetPlaceDetails,
    })),
  },
}));

import {
  searchContacts,
  fetchFamilyLookups,
  fetchFamilyDefaults,
  fetchHousehold,
  resolveContactIdFromPage,
  fetchNextEnvelopeNumber,
  placesEnabled,
  placeAutocomplete,
  placeDetails,
  saveFamily,
} from "./actions";

function makeHousehold(overrides: Partial<Household> = {}): Household {
  return {
    householdId: 1,
    householdName: "Smith",
    householdPhone: "",
    congregationId: 1,
    sourceId: 18,
    address: {
      addressId: 0,
      addressLine1: null,
      addressLine2: null,
      city: null,
      state: null,
      region: null,
      postalCode: "",
      countryCode: null,
    },
    alternateMailingAddress: {
      addressId: 0,
      addressLine1: null,
      addressLine2: null,
      city: null,
      state: null,
      region: null,
      postalCode: "",
      countryCode: null,
    },
    seasonStart: null,
    seasonEnd: null,
    repeatsAnnually: false,
    areHeadsMarried: false,
    members: [],
    ...overrides,
  };
}

describe("addeditfamily actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSecurityRole.mockResolvedValue(42);
  });

  describe("searchContacts", () => {
    it("authorizes a read against Contacts and delegates to the service", async () => {
      mockSearchContacts.mockResolvedValueOnce([
        { contactId: 1, displayName: "Smith, John", detail: "" },
      ]);
      const result = await searchContacts("smith");
      expect(mockRequireSecurityRole).toHaveBeenCalledWith({
        table: "Contacts",
        operation: "read",
      });
      expect(mockSearchContacts).toHaveBeenCalledWith("smith");
      expect(result).toEqual([{ contactId: 1, displayName: "Smith, John", detail: "" }]);
    });

    it("propagates authorization failures", async () => {
      mockRequireSecurityRole.mockRejectedValueOnce(new Error("Not authorized"));
      await expect(searchContacts("smith")).rejects.toThrow("Not authorized");
      expect(mockSearchContacts).not.toHaveBeenCalled();
    });
  });

  describe("fetchFamilyLookups", () => {
    it("authorizes and returns lookups", async () => {
      const lookups = { congregations: [] } as unknown as Awaited<ReturnType<typeof fetchFamilyLookups>>;
      mockGetLookups.mockResolvedValueOnce(lookups);
      const result = await fetchFamilyLookups();
      expect(mockRequireSecurityRole).toHaveBeenCalledWith({ table: "Contacts", operation: "read" });
      expect(result).toBe(lookups);
    });
  });

  describe("fetchFamilyDefaults", () => {
    it("authorizes and returns defaults", async () => {
      const defaults = { congregationId: 1 } as unknown as Awaited<ReturnType<typeof fetchFamilyDefaults>>;
      mockGetDefaults.mockResolvedValueOnce(defaults);
      const result = await fetchFamilyDefaults();
      expect(mockRequireSecurityRole).toHaveBeenCalledWith({ table: "Contacts", operation: "read" });
      expect(result).toBe(defaults);
    });
  });

  describe("fetchHousehold", () => {
    it("returns success with the household when found", async () => {
      const household = makeHousehold();
      mockGetHousehold.mockResolvedValueOnce(household);
      const result = await fetchHousehold(5);
      expect(mockRequireSecurityRole).toHaveBeenCalledWith({ table: "Households", operation: "read" });
      expect(result).toEqual({ success: true, household });
    });

    it("returns a not-found error when the service returns null", async () => {
      mockGetHousehold.mockResolvedValueOnce(null);
      const result = await fetchHousehold(5);
      expect(result).toEqual({ success: false, error: "Household not found" });
    });

    it("returns a generic error message for a non-Error throw", async () => {
      mockGetHousehold.mockRejectedValueOnce("boom");
      const result = await fetchHousehold(5);
      expect(result).toEqual({ success: false, error: "Failed to load household" });
    });

    it("returns the Error message when the service throws an Error", async () => {
      mockGetHousehold.mockRejectedValueOnce(new Error("db exploded"));
      const result = await fetchHousehold(5);
      expect(result).toEqual({ success: false, error: "db exploded" });
    });

    it("surfaces authorization failures as ActionError", async () => {
      mockRequireSecurityRole.mockRejectedValueOnce(new Error("Not authorized"));
      const result = await fetchHousehold(5);
      expect(result).toEqual({ success: false, error: "Not authorized" });
    });
  });

  describe("resolveContactIdFromPage", () => {
    const args = {
      tableName: "Event_Participants",
      primaryKey: "Event_Participant_ID",
      recordId: 10,
      contactIdField: "Participant_ID_TABLE_Contact_ID",
    };

    it("authorizes against the given table and returns the contactId", async () => {
      mockResolveContactIdFromPage.mockResolvedValueOnce(99);
      const result = await resolveContactIdFromPage(args);
      expect(mockRequireSecurityRole).toHaveBeenCalledWith({
        table: "Event_Participants",
        operation: "read",
      });
      expect(mockResolveContactIdFromPage).toHaveBeenCalledWith(
        args.tableName,
        args.primaryKey,
        args.recordId,
        args.contactIdField,
      );
      expect(result).toEqual({ success: true, contactId: 99 });
    });

    it("returns null contactId when unresolved", async () => {
      mockResolveContactIdFromPage.mockResolvedValueOnce(null);
      const result = await resolveContactIdFromPage(args);
      expect(result).toEqual({ success: true, contactId: null });
    });

    it("returns a generic error message for a non-Error throw", async () => {
      mockResolveContactIdFromPage.mockRejectedValueOnce("boom");
      const result = await resolveContactIdFromPage(args);
      expect(result).toEqual({ success: false, error: "Failed to resolve contact" });
    });

    it("returns the Error message when the service throws an Error", async () => {
      mockResolveContactIdFromPage.mockRejectedValueOnce(new Error("invalid column"));
      const result = await resolveContactIdFromPage(args);
      expect(result).toEqual({ success: false, error: "invalid column" });
    });
  });

  describe("fetchNextEnvelopeNumber", () => {
    it("authorizes and returns the next envelope number", async () => {
      mockGetNextEnvelopeNumber.mockResolvedValueOnce(1234);
      const result = await fetchNextEnvelopeNumber();
      expect(mockRequireSecurityRole).toHaveBeenCalledWith({ table: "Contacts", operation: "read" });
      expect(result).toBe(1234);
    });
  });

  describe("placesEnabled", () => {
    it("authorizes against Addresses and returns the enabled flag", async () => {
      mockIsEnabled.mockResolvedValueOnce(true);
      const result = await placesEnabled();
      expect(mockRequireSecurityRole).toHaveBeenCalledWith({ table: "Addresses", operation: "read" });
      expect(result).toBe(true);
    });
  });

  describe("placeAutocomplete", () => {
    it("short-circuits to [] for inputs under 3 chars without calling the service", async () => {
      const result = await placeAutocomplete(" a ", "token-1");
      expect(mockRequireSecurityRole).toHaveBeenCalledWith({ table: "Addresses", operation: "read" });
      expect(result).toEqual([]);
      expect(mockIsEnabled).not.toHaveBeenCalled();
    });

    it("returns [] when the feature is disabled", async () => {
      mockIsEnabled.mockResolvedValueOnce(false);
      const result = await placeAutocomplete("123 Main", "token-1");
      expect(result).toEqual([]);
      expect(mockAutocomplete).not.toHaveBeenCalled();
    });

    it("delegates to the provider when enabled and input is long enough", async () => {
      mockIsEnabled.mockResolvedValueOnce(true);
      mockAutocomplete.mockResolvedValueOnce([
        { placeId: "p1", primary: "123 Main St", secondary: "", full: "123 Main St" },
      ]);
      const result = await placeAutocomplete("123 Main", "token-1");
      expect(mockAutocomplete).toHaveBeenCalledWith("123 Main", "token-1");
      expect(result).toEqual([
        { placeId: "p1", primary: "123 Main St", secondary: "", full: "123 Main St" },
      ]);
    });
  });

  describe("placeDetails", () => {
    it("returns success with details", async () => {
      const details = {
        placeId: "p1",
        formattedAddress: "123 Main St",
        addressLine1: "123 Main St",
        city: "Springfield",
        state: "IL",
        postalCode: "62701",
        countryCode: "US",
      };
      mockGetPlaceDetails.mockResolvedValueOnce(details);
      const result = await placeDetails("p1", "token-1");
      expect(mockRequireSecurityRole).toHaveBeenCalledWith({ table: "Addresses", operation: "read" });
      expect(result).toEqual({ success: true, details });
    });

    it("returns a generic error message for a non-Error throw", async () => {
      mockGetPlaceDetails.mockRejectedValueOnce("boom");
      const result = await placeDetails("p1", "token-1");
      expect(result).toEqual({ success: false, error: "Failed to fetch place details" });
    });

    it("returns the Error message when the service throws an Error", async () => {
      mockGetPlaceDetails.mockRejectedValueOnce(new Error("upstream failure"));
      const result = await placeDetails("p1", "token-1");
      expect(result).toEqual({ success: false, error: "upstream failure" });
    });
  });

  describe("saveFamily", () => {
    it("authorizes an update against Households and returns progress on success", async () => {
      const household = makeHousehold();
      const progress: SaveProgress = {
        mainAddressId: 1,
        altAddressId: null,
        householdId: 1,
        members: [],
      };
      mockSaveHousehold.mockResolvedValueOnce(progress);
      const result = await saveFamily(household);
      expect(mockRequireSecurityRole).toHaveBeenCalledWith({ table: "Households", operation: "update" });
      expect(mockSaveHousehold).toHaveBeenCalledWith(household);
      expect(result).toEqual({ success: true, progress });
    });

    it("returns partial progress and message when a PartialSaveError is thrown", async () => {
      const household = makeHousehold();
      const progress: SaveProgress = {
        mainAddressId: 1,
        altAddressId: null,
        householdId: null,
        members: [],
      };
      mockSaveHousehold.mockRejectedValueOnce(
        new FakePartialSaveError(progress, new Error("household insert failed")),
      );
      const result = await saveFamily(household);
      expect(result).toEqual({
        success: false,
        error: "household insert failed",
        progress,
      });
    });

    it("returns a generic error message for a non-Error, non-PartialSaveError throw", async () => {
      const household = makeHousehold();
      mockSaveHousehold.mockRejectedValueOnce("boom");
      const result = await saveFamily(household);
      expect(result).toEqual({ success: false, error: "Failed to save family" });
    });

    it("returns the Error message for a plain Error throw", async () => {
      const household = makeHousehold();
      mockSaveHousehold.mockRejectedValueOnce(new Error("connection reset"));
      const result = await saveFamily(household);
      expect(result).toEqual({ success: false, error: "connection reset" });
    });

    it("surfaces authorization failures as ActionError", async () => {
      const household = makeHousehold();
      mockRequireSecurityRole.mockRejectedValueOnce(new Error("Not authorized"));
      const result = await saveFamily(household);
      expect(result).toEqual({ success: false, error: "Not authorized" });
      expect(mockSaveHousehold).not.toHaveBeenCalled();
    });
  });
});

/**
 * Runtime validation of the saveFamily payload.
 *
 * `saveFamily(household: Household)` is a server action — a public POST
 * endpoint whose TypeScript annotation is erased at runtime. Downstream,
 * `FamilyService` interpolates `envelopeNo` and `donorId` into MP `$filter`
 * strings and uses `donorId` to target a `Donors` update, so the payload has
 * to be parsed, not merely typed.
 *
 * See `.claude/TODO/2026-09-13-unvalidated-envelope-donor-ids-in-filter.md`.
 */
describe("saveFamily payload validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSecurityRole.mockResolvedValue(42);
  });

  /** Bypass the compile-time type the way a hand-crafted POST body does. */
  function malformed(household: Record<string, unknown>): Household {
    return household as unknown as Household;
  }

  it("rejects a filter-injection-shaped envelopeNo before it reaches the service", async () => {
    const household = makeHousehold();
    const bad = malformed({
      ...household,
      members: [{ ...household.members[0], envelopeNo: "1 OR 1=1" }],
    });

    const result = await saveFamily(bad);

    expect(result.success).toBe(false);
    expect(mockSaveHousehold).not.toHaveBeenCalled();
  });

  it("rejects a filter-injection-shaped donorId before it reaches the service", async () => {
    const household = makeHousehold();
    const bad = malformed({
      ...household,
      members: [{ ...household.members[0], donorId: "5; DROP" }],
    });

    const result = await saveFamily(bad);

    expect(result.success).toBe(false);
    expect(mockSaveHousehold).not.toHaveBeenCalled();
  });

  it.each([
    ["a non-integer envelopeNo", { envelopeNo: 1.5 }],
    ["an array envelopeNo", { envelopeNo: [7] }],
    ["an object donorId", { donorId: { id: 7 } }],
    ["a boolean contactId", { contactId: true }],
  ])("rejects %s", async (_label, patch) => {
    const household = makeHousehold();
    const bad = malformed({
      ...household,
      members: [{ ...household.members[0], ...patch }],
    });

    const result = await saveFamily(bad);

    expect(result.success).toBe(false);
    expect(mockSaveHousehold).not.toHaveBeenCalled();
  });

  it("rejects a household missing required top-level fields", async () => {
    const result = await saveFamily(malformed({ householdId: 1 }));

    expect(result.success).toBe(false);
    expect(mockSaveHousehold).not.toHaveBeenCalled();
  });

  it("reports offending field paths so the user can fix the form", async () => {
    const household = makeHousehold();
    const bad = malformed({
      ...household,
      members: [{ ...household.members[0], envelopeNo: "1 OR 1=1" }],
    });

    const result = await saveFamily(bad);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/members\.0\.envelopeNo/);
  });

  it("never echoes the submitted value back in the error message", async () => {
    // CLAUDE.md rule 14: error messages travel further than logs do. Paths
    // are safe to report; the value that was rejected is not.
    const household = makeHousehold();
    const bad = malformed({
      ...household,
      members: [
        { ...household.members[0], envelopeNo: "1 OR 1=1", emailAddress: "secret@example.com" },
      ],
    });

    const result = await saveFamily(bad);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).not.toContain("1 OR 1=1");
    expect(result.error).not.toContain("secret@example.com");
  });

  it("still authorizes before validating, so an unauthorized caller learns nothing about the schema", async () => {
    mockRequireSecurityRole.mockRejectedValueOnce(new Error("Forbidden"));

    const result = await saveFamily(malformed({ householdId: 1 }));

    expect(result).toEqual({ success: false, error: "Forbidden" });
    expect(mockSaveHousehold).not.toHaveBeenCalled();
  });

  it("passes a well-formed household straight through to the service", async () => {
    const household = makeHousehold();
    const progress: SaveProgress = {
      mainAddressId: 1,
      altAddressId: null,
      householdId: 1,
      members: [],
    };
    mockSaveHousehold.mockResolvedValueOnce(progress);

    const result = await saveFamily(household);

    expect(result).toEqual({ success: true, progress });
    expect(mockSaveHousehold).toHaveBeenCalledTimes(1);
  });
});
