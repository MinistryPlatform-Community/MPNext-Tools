import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Household } from "@/lib/dto/family";

const { mockGetTableRecords, mockCreateTableRecords, mockUpdateTableRecords, mockGetDomainInfo } =
  vi.hoisted(() => ({
    mockGetTableRecords: vi.fn(),
    mockCreateTableRecords: vi.fn(),
    mockUpdateTableRecords: vi.fn(),
    mockGetDomainInfo: vi.fn(),
  }));

vi.mock("@/lib/providers/ministry-platform", () => ({
  MPHelper: class {
    getTableRecords = mockGetTableRecords;
    createTableRecords = mockCreateTableRecords;
    updateTableRecords = mockUpdateTableRecords;
    getDomainInfo = mockGetDomainInfo;
  },
}));

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

import { FamilyService, PartialSaveError } from "./familyService";
import { DomainTimezoneService } from "./domainTimezoneService";

function makeHousehold(overrides: Partial<Household> = {}): Household {
  return {
    householdId: 0,
    householdName: "Smith",
    householdPhone: "",
    congregationId: 1,
    sourceId: 18,
    address: {
      addressId: 0,
      addressLine1: "123 Main St",
      addressLine2: null,
      city: "Springfield",
      state: "IL",
      region: null,
      postalCode: "62701",
      countryCode: "US",
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

describe("FamilyService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
     
    (FamilyService as any).instance = undefined;
     
    (DomainTimezoneService as any).instance = null;
    mockRequireSecurityRole.mockResolvedValue(42);
    mockGetDomainInfo.mockResolvedValue({ TimeZoneName: "UTC" });
  });

  it("is a singleton", async () => {
    const instance1 = await FamilyService.getInstance();
    const instance2 = await FamilyService.getInstance();
    expect(instance1).toBe(instance2);
  });

  describe("searchContacts", () => {
    it("authorizes a read against Contacts", async () => {
      mockGetTableRecords.mockResolvedValueOnce([]);
      const service = await FamilyService.getInstance();
      await service.searchContacts("smith");
      expect(mockRequireSecurityRole).toHaveBeenCalledWith({ table: "Contacts", operation: "read" });
    });

    it("returns [] without querying when trimmed term is shorter than 2 chars", async () => {
      const service = await FamilyService.getInstance();
      const result = await service.searchContacts(" a ");
      expect(result).toEqual([]);
      expect(mockGetTableRecords).not.toHaveBeenCalled();
    });

    it("escapes special characters and queries by Display_Name prefix", async () => {
      mockGetTableRecords.mockResolvedValueOnce([]);
      const service = await FamilyService.getInstance();
      await service.searchContacts("O'Brien%_");
      expect(mockGetTableRecords).toHaveBeenCalledWith(
        expect.objectContaining({
          table: "Contacts",
          filter: "Display_Name LIKE 'O''Brien[%][_]%' AND Contact_Status_ID = 1",
        }),
      );
    });

    it("maps rows preferring Email_Address, falling back to the household address, then empty", async () => {
      mockGetTableRecords.mockResolvedValueOnce([
        { Contact_ID: 1, Display_Name: "Smith, John", Email_Address: "john@example.com" },
        {
          Contact_ID: 2,
          Display_Name: "Smith, Jane",
          Email_Address: null,
          Household_ID_TABLE_Address_ID_TABLE_Address_Line_1: "123 Main St",
        },
        { Contact_ID: 3, Display_Name: "Smith, Joe", Email_Address: null },
      ]);
      const service = await FamilyService.getInstance();
      const result = await service.searchContacts("smith");
      expect(result).toEqual([
        { contactId: 1, displayName: "Smith, John", detail: "john@example.com" },
        { contactId: 2, displayName: "Smith, Jane", detail: "123 Main St" },
        { contactId: 3, displayName: "Smith, Joe", detail: "" },
      ]);
    });
  });

  describe("resolveContactIdFromPage", () => {
    it("authorizes a read against the given table", async () => {
      mockGetTableRecords.mockResolvedValueOnce([{ Resolved_Contact_ID: 5 }]);
      const service = await FamilyService.getInstance();
      await service.resolveContactIdFromPage("Event_Participants", "Event_Participant_ID", 10, "Contact_ID");
      expect(mockRequireSecurityRole).toHaveBeenCalledWith({
        table: "Event_Participants",
        operation: "read",
      });
    });

    it("throws for a non-positive recordId", async () => {
      const service = await FamilyService.getInstance();
      await expect(
        service.resolveContactIdFromPage("Event_Participants", "Event_Participant_ID", 0, "Contact_ID"),
      ).rejects.toThrow("Expected positive integer");
      expect(mockGetTableRecords).not.toHaveBeenCalled();
    });

    it("throws for an invalid primaryKey column name", async () => {
      const service = await FamilyService.getInstance();
      await expect(
        service.resolveContactIdFromPage("Event_Participants", "bad; name", 10, "Contact_ID"),
      ).rejects.toThrow("Invalid column name");
    });

    it("returns null without querying when contactIdField is blank", async () => {
      const service = await FamilyService.getInstance();
      const result = await service.resolveContactIdFromPage(
        "Event_Participants",
        "Event_Participant_ID",
        10,
        "   ",
      );
      expect(result).toBeNull();
      expect(mockGetTableRecords).not.toHaveBeenCalled();
    });

    it("throws for an invalid contactIdField column name (no _TABLE)", async () => {
      const service = await FamilyService.getInstance();
      await expect(
        service.resolveContactIdFromPage("Event_Participants", "Event_Participant_ID", 10, "bad; name"),
      ).rejects.toThrow("Invalid column name");
    });

    it("uses the FK path directly when contactIdField traverses a _TABLE join", async () => {
      mockGetTableRecords.mockResolvedValueOnce([{ Resolved_Contact_ID: 77 }]);
      const service = await FamilyService.getInstance();
      const result = await service.resolveContactIdFromPage(
        "Event_Participants",
        "Event_Participant_ID",
        10,
        "Participant_ID_TABLE_Contact_ID",
      );
      expect(mockGetTableRecords).toHaveBeenCalledWith(
        expect.objectContaining({
          select: "Participant_ID_TABLE_Contact_ID AS Resolved_Contact_ID",
          filter: "Event_Participant_ID = 10",
        }),
      );
      expect(result).toBe(77);
    });

    it("returns null when the resolved id is 0", async () => {
      mockGetTableRecords.mockResolvedValueOnce([{ Resolved_Contact_ID: 0 }]);
      const service = await FamilyService.getInstance();
      const result = await service.resolveContactIdFromPage(
        "Event_Participants",
        "Event_Participant_ID",
        10,
        "Contact_ID",
      );
      expect(result).toBeNull();
    });

    it("returns null when no row is found", async () => {
      mockGetTableRecords.mockResolvedValueOnce([]);
      const service = await FamilyService.getInstance();
      const result = await service.resolveContactIdFromPage(
        "Event_Participants",
        "Event_Participant_ID",
        10,
        "Contact_ID",
      );
      expect(result).toBeNull();
    });
  });

  describe("getHousehold", () => {
    it("authorizes a read against Households", async () => {
      mockGetTableRecords.mockResolvedValueOnce([]);
      const service = await FamilyService.getInstance();
      await service.getHousehold(1);
      expect(mockRequireSecurityRole).toHaveBeenCalledWith({ table: "Households", operation: "read" });
    });

    it("throws for a non-positive contactId", async () => {
      const service = await FamilyService.getInstance();
      await expect(service.getHousehold(-1)).rejects.toThrow("Expected positive integer");
    });

    it("returns null when the contact has no Household_ID", async () => {
      mockGetTableRecords.mockResolvedValueOnce([{ Contact_ID: 1, Household_ID: null }]);
      const service = await FamilyService.getInstance();
      const result = await service.getHousehold(1);
      expect(result).toBeNull();
      // Only the Contacts lookup ran — Promise.all for households/members never fired.
      expect(mockGetTableRecords).toHaveBeenCalledTimes(1);
    });

    it("returns null when no contact row is found at all", async () => {
      mockGetTableRecords.mockResolvedValueOnce([]);
      const service = await FamilyService.getInstance();
      const result = await service.getHousehold(1);
      expect(result).toBeNull();
    });

    it("returns null when the household row itself is missing", async () => {
      mockGetTableRecords
        .mockResolvedValueOnce([{ Contact_ID: 1, Household_ID: 55 }])
        .mockResolvedValueOnce([]) // households
        .mockResolvedValueOnce([]); // members
      const service = await FamilyService.getInstance();
      const result = await service.getHousehold(1);
      expect(result).toBeNull();
    });

    it("maps a full household with members, addresses, participant and donor", async () => {
      mockGetTableRecords
        .mockResolvedValueOnce([{ Contact_ID: 1, Household_ID: 55 }])
        .mockResolvedValueOnce([
          {
            Household_ID: 55,
            Household_Name: "Smith Family",
            Home_Phone: "555-1234",
            Congregation_ID: 2,
            Household_Source_ID: 3,
            Address_ID: 501,
            Alternate_Mailing_Address: 502,
            Season_Start: "2024-01-01",
            Season_End: "0001-01-01T00:00:00",
            Repeats_Annually: true,
            Addr1_Line1: "123 Main St",
            Addr1_Line2: "Apt 4",
            Addr1_City: "Springfield",
            Addr1_State: "IL",
            Addr1_Postal: "62701",
            Addr1_Country: "US",
            Addr2_Line1: "PO Box 9",
            Addr2_Line2: null,
            Addr2_City: "Springfield",
            Addr2_State: "IL",
            Addr2_Postal: "62701",
            Addr2_Country: "US",
          },
        ])
        .mockResolvedValueOnce([
          {
            Contact_ID: 701,
            Display_Name: "Smith, John",
            First_Name: "John",
            Middle_Name: null,
            Maiden_Name: null,
            Last_Name: "Smith",
            Nickname: null,
            Prefix_ID: null,
            Suffix_ID: null,
            Date_of_Birth: "1980-01-01",
            Gender_ID: 1,
            Marital_Status_ID: 2,
            Mobile_Phone: "555-0000",
            Email_Address: "john@example.com",
            Bulk_Email_Opt_Out: false,
            Contact_Status_ID: 1,
            Primary_Language_ID: null,
            Faith_Background_ID: null,
            Household_Position_ID: 1,
            Participant_Record: 801,
            Donor_Record: 901,
            Participant_Type_ID: 4,
            Envelope_No: 1001,
          },
          {
            Contact_ID: 702,
            Display_Name: "Smith, Jane",
            First_Name: "Jane",
            Last_Name: "Smith",
            Household_Position_ID: 2,
            Participant_Record: null,
            Donor_Record: null,
          },
        ]);

      const service = await FamilyService.getInstance();
      const result = await service.getHousehold(1);

      expect(result).not.toBeNull();
      expect(result!.householdId).toBe(55);
      expect(result!.householdName).toBe("Smith Family");
      expect(result!.householdPhone).toBe("555-1234");
      expect(result!.congregationId).toBe(2);
      expect(result!.sourceId).toBe(3);
      expect(result!.seasonStart).toBe("2024-01-01");
      expect(result!.seasonEnd).toBeNull(); // 0001-01-01 sentinel maps to null
      expect(result!.repeatsAnnually).toBe(true);
      expect(result!.areHeadsMarried).toBe(false);

      expect(result!.address).toEqual({
        addressId: 501,
        addressLine1: "123 Main St",
        addressLine2: "Apt 4",
        city: "Springfield",
        state: "IL",
        region: null,
        postalCode: "62701",
        countryCode: "US",
      });
      expect(result!.alternateMailingAddress.addressId).toBe(502);

      expect(result!.members).toHaveLength(2);
      const [john, jane] = result!.members;
      expect(john.contactId).toBe(701);
      expect(john.birthDate).toBe("1980-01-01");
      expect(john.participant).toEqual({
        participantId: 801,
        participantTypeId: 4,
        notes: null,
      });
      expect(john.donorId).toBe(901);
      expect(john.isDonor).toBe(true);
      expect(john.envelopeNo).toBe(1001);

      expect(jane.participant).toBeNull();
      expect(jane.donorId).toBeNull();
      expect(jane.isDonor).toBe(false);
      expect(jane.birthDate).toBeNull();
      expect(jane.firstName).toBe("Jane");
    });
  });

  describe("getLookups", () => {
    it("authorizes a read against Contacts and composes all lookup lists", async () => {
      mockGetTableRecords
        .mockResolvedValueOnce([{ Congregation_ID: 1, Congregation_Name: "Main Campus" }])
        .mockResolvedValueOnce([{ Household_Source_ID: 1, Household_Source: "Web" }])
        .mockResolvedValueOnce([{ Household_Position_ID: 1, Household_Position: "Head" }])
        .mockResolvedValueOnce([{ Participant_Type_ID: 4, Participant_Type: "Member" }])
        .mockResolvedValueOnce([{ Marital_Status_ID: 1, Marital_Status: "Single" }])
        .mockResolvedValueOnce([{ Prefix_ID: 1, Prefix: "Mr." }])
        .mockResolvedValueOnce([{ Suffix_ID: 1, Suffix: "Jr." }])
        .mockResolvedValueOnce([{ Gender_ID: 1, Gender: "Male" }])
        .mockResolvedValueOnce([{ Contact_Status_ID: 1, Contact_Status: "Active" }])
        .mockResolvedValueOnce([{ Primary_Language_ID: 1, Primary_Language: "English" }])
        .mockResolvedValueOnce([{ Faith_Background_ID: 1, Faith_Background: "Christian" }])
        .mockResolvedValueOnce([
          { Country_Code: "US", Country: "United States" },
          { Country_Code: null, Country: "Bad Row" },
          { Country_Code: "CA", Country: null },
        ]);

      const service = await FamilyService.getInstance();
      const lookups = await service.getLookups();

      expect(mockRequireSecurityRole).toHaveBeenCalledWith({ table: "Contacts", operation: "read" });
      expect(lookups.congregations).toEqual([{ id: 1, name: "Main Campus" }]);
      expect(lookups.sources).toEqual([{ id: 1, name: "Web" }]);
      expect(lookups.householdPositions).toEqual([{ id: 1, name: "Head" }]);
      expect(lookups.participantTypes).toEqual([{ id: 4, name: "Member" }]);
      expect(lookups.maritalStatuses).toEqual([{ id: 1, name: "Single" }]);
      expect(lookups.prefixes).toEqual([{ id: 1, name: "Mr." }]);
      expect(lookups.suffixes).toEqual([{ id: 1, name: "Jr." }]);
      expect(lookups.genders).toEqual([{ id: 1, name: "Male" }]);
      expect(lookups.contactStatuses).toEqual([{ id: 1, name: "Active" }]);
      expect(lookups.primaryLanguages).toEqual([{ id: 1, name: "English" }]);
      expect(lookups.faithBackgrounds).toEqual([{ id: 1, name: "Christian" }]);
      expect(lookups.countries).toEqual([{ code: "US", name: "United States" }]);
      expect(lookups.states.length).toBeGreaterThan(0);
      expect(lookups.states[0]).toEqual({ code: "AL", name: "Alabama" });
    });
  });

  describe("getDefaults", () => {
    it("returns a copy of the default family values", async () => {
      const service = await FamilyService.getInstance();
      const first = service.getDefaults();
      first.congregationId = 999;
      const second = service.getDefaults();
      expect(second.congregationId).toBe(1);
      expect(mockRequireSecurityRole).not.toHaveBeenCalled();
    });
  });

  describe("getNextEnvelopeNumber", () => {
    it("authorizes a read against Contacts", async () => {
      mockGetTableRecords.mockResolvedValueOnce([{ Highest: 100 }]);
      const service = await FamilyService.getInstance();
      await service.getNextEnvelopeNumber();
      expect(mockRequireSecurityRole).toHaveBeenCalledWith({ table: "Contacts", operation: "read" });
    });

    it("returns 1 when there are no existing envelope numbers", async () => {
      mockGetTableRecords.mockResolvedValueOnce([{ Highest: null }]);
      const service = await FamilyService.getInstance();
      const result = await service.getNextEnvelopeNumber();
      expect(result).toBe(1);
    });

    it("returns 1 when no row is returned at all", async () => {
      mockGetTableRecords.mockResolvedValueOnce([]);
      const service = await FamilyService.getInstance();
      const result = await service.getNextEnvelopeNumber();
      expect(result).toBe(1);
    });

    it("returns highest + 1 when envelopes already exist", async () => {
      mockGetTableRecords.mockResolvedValueOnce([{ Highest: 5000 }]);
      const service = await FamilyService.getInstance();
      const result = await service.getNextEnvelopeNumber();
      expect(result).toBe(5001);
    });
  });

  describe("saveHousehold", () => {
    it("authorizes an update against Households before anything else", async () => {
      mockRequireSecurityRole.mockRejectedValueOnce(new Error("Not authorized"));
      const service = await FamilyService.getInstance();
      await expect(service.saveHousehold(makeHousehold())).rejects.toThrow("Not authorized");
      expect(mockCreateTableRecords).not.toHaveBeenCalled();
    });

    it("creates a new household, skips the blank alternate address, and creates a new member with a new participant and donor", async () => {
      // 1. upsertAddress(main) -> create
      mockCreateTableRecords
        .mockResolvedValueOnce([{ Address_ID: 501 }]) // main address create
        .mockResolvedValueOnce([{ Household_ID: 601 }]) // household create
        .mockResolvedValueOnce([{ Contact_ID: 701 }]) // contact create
        .mockResolvedValueOnce([{ Participant_ID: 801 }]) // participant create
        .mockResolvedValueOnce([{ Donor_ID: 901 }]); // donor create

      // Envelope conflict check -> no conflict
      mockGetTableRecords.mockResolvedValueOnce([]);

      const household = makeHousehold({
        members: [
          {
            contactId: -1,
            firstName: "John",
            middleName: "",
            maidenName: "",
            lastName: "Smith",
            nickname: "",
            prefixId: 0,
            suffixId: 0,
            birthDate: null,
            genderId: 0,
            maritalStatusId: 0,
            mobilePhone: "",
            emailAddress: "",
            bulkEmailOpt: false,
            envelopeNo: 1001,
            contactStatusId: 1,
            primaryLanguageId: null,
            faithBackgroundId: null,
            householdPositionId: 1,
            participant: { participantId: 0, participantTypeId: 4, notes: null },
            donorId: null,
            isDonor: true,
          },
          {
            contactId: -2,
            firstName: "  ",
            middleName: "",
            maidenName: "",
            lastName: "",
            nickname: "",
            prefixId: 0,
            suffixId: 0,
            birthDate: null,
            genderId: 0,
            maritalStatusId: 0,
            mobilePhone: "",
            emailAddress: "",
            bulkEmailOpt: false,
            envelopeNo: null,
            contactStatusId: 1,
            primaryLanguageId: null,
            faithBackgroundId: null,
            householdPositionId: 1,
            participant: null,
            donorId: null,
            isDonor: false,
          },
        ],
      });

      const service = await FamilyService.getInstance();
      const progress = await service.saveHousehold(household);

      expect(progress.mainAddressId).toBe(501);
      expect(progress.altAddressId).toBeNull();
      expect(progress.householdId).toBe(601);
      expect(progress.members).toHaveLength(1); // blank second member skipped

      const saved = progress.members[0];
      expect(saved.tempContactId).toBe(-1);
      expect(saved.contactId).toBe(701);
      expect(saved.participantId).toBe(801);
      expect(saved.donorId).toBe(901);
      expect(saved.envelopeNo).toBe(1001);
      expect(saved.envelopeBumped).toBe(false);

      // First create call was for the main address.
      expect(mockCreateTableRecords.mock.calls[0][0]).toBe("Addresses");
      expect(mockCreateTableRecords.mock.calls[1][0]).toBe("Households");
      expect(mockCreateTableRecords.mock.calls[2][0]).toBe("Contacts");
      expect(mockCreateTableRecords.mock.calls[3][0]).toBe("Participants");
      expect(mockCreateTableRecords.mock.calls[4][0]).toBe("Donors");

      // $userId comes solely from the authorization gate's return value.
      for (const call of mockCreateTableRecords.mock.calls) {
        expect(call[2]).toMatchObject({ $userId: 42 });
      }

      // Contact gets patched with the new Participant_Record and Donor_Record.
      expect(mockUpdateTableRecords).toHaveBeenCalledWith(
        "Contacts",
        [{ Contact_ID: 701, Participant_Record: 801 }],
        expect.objectContaining({ $userId: 42 }),
      );
      expect(mockUpdateTableRecords).toHaveBeenCalledWith(
        "Contacts",
        [{ Contact_ID: 701, Donor_Record: 901 }],
        expect.objectContaining({ $userId: 42 }),
      );
    });

    it("updates an existing household, address, member, participant and donor", async () => {
      mockUpdateTableRecords.mockResolvedValue(undefined);
      // Alternate address create (only new address in this scenario)
      mockCreateTableRecords.mockResolvedValueOnce([{ Address_ID: 502 }]);
      // Envelope conflict check (excluding existing donor) -> no conflict
      mockGetTableRecords.mockResolvedValueOnce([]);

      const household = makeHousehold({
        householdId: 55,
        address: {
          addressId: 501,
          addressLine1: "123 Main St",
          addressLine2: null,
          city: "Springfield",
          state: "IL",
          region: null,
          postalCode: "62701",
          countryCode: "US",
        },
        alternateMailingAddress: {
          addressId: 0,
          addressLine1: "PO Box 9",
          addressLine2: null,
          city: "Springfield",
          state: "IL",
          region: null,
          postalCode: "62701",
          countryCode: "US",
        },
        members: [
          {
            contactId: 701,
            firstName: "John",
            middleName: "",
            maidenName: "",
            lastName: "Smith",
            nickname: "",
            prefixId: 0,
            suffixId: 0,
            birthDate: "1980-05-01",
            genderId: 1,
            maritalStatusId: 1,
            mobilePhone: "",
            emailAddress: "",
            bulkEmailOpt: false,
            envelopeNo: 1002,
            contactStatusId: 1,
            primaryLanguageId: null,
            faithBackgroundId: null,
            householdPositionId: 1,
            participant: { participantId: 801, participantTypeId: 4, notes: null },
            donorId: 901,
            isDonor: true,
          },
        ],
      });

      const service = await FamilyService.getInstance();
      const progress = await service.saveHousehold(household);

      expect(progress.mainAddressId).toBe(501); // existing, updated in place
      expect(progress.altAddressId).toBe(502); // created
      expect(progress.householdId).toBe(55);
      expect(progress.members).toHaveLength(1);
      expect(progress.members[0]).toEqual({
        tempContactId: 701,
        contactId: 701,
        participantId: 801,
        donorId: 901,
        envelopeNo: 1002,
        envelopeBumped: false,
      });

      expect(mockUpdateTableRecords).toHaveBeenCalledWith(
        "Addresses",
        [expect.objectContaining({ Address_ID: 501 })],
        expect.objectContaining({ partial: true, $userId: 42 }),
      );
      expect(mockUpdateTableRecords).toHaveBeenCalledWith(
        "Households",
        [expect.objectContaining({ Household_ID: 55 })],
        expect.objectContaining({ partial: true, $userId: 42 }),
      );
      expect(mockUpdateTableRecords).toHaveBeenCalledWith(
        "Participants",
        [{ Participant_ID: 801, Participant_Type_ID: 4 }],
        expect.objectContaining({ $userId: 42 }),
      );
      expect(mockUpdateTableRecords).toHaveBeenCalledWith(
        "Donors",
        [{ Donor_ID: 901, Envelope_No: 1002 }],
        expect.objectContaining({ $userId: 42 }),
      );

      const donorConflictCall = mockGetTableRecords.mock.calls.find(
        (c) => c[0].table === "Donors" && c[0].select === "Donor_ID",
      );
      expect(donorConflictCall![0].filter).toBe("Envelope_No = 1002 AND Donor_ID <> 901");
    });

    it("bumps the envelope number when the requested one conflicts, and reports envelopeBumped", async () => {
      mockCreateTableRecords
        .mockResolvedValueOnce([{ Household_ID: 601 }])
        .mockResolvedValueOnce([{ Contact_ID: 701 }])
        .mockResolvedValueOnce([{ Donor_ID: 901 }]);

      mockGetTableRecords
        .mockResolvedValueOnce([{ Donor_ID: 55 }]) // conflict on requested 1001
        .mockResolvedValueOnce([{ Highest: 1050 }]) // getNextEnvelopeNumber -> 1051
        .mockResolvedValueOnce([]); // no conflict on 1051

      const household = makeHousehold({
        address: { ...makeHousehold().address, addressLine1: null, postalCode: "" }, // no address content
        members: [
          {
            contactId: -1,
            firstName: "John",
            middleName: "",
            maidenName: "",
            lastName: "Smith",
            nickname: "",
            prefixId: 0,
            suffixId: 0,
            birthDate: null,
            genderId: 0,
            maritalStatusId: 0,
            mobilePhone: "",
            emailAddress: "",
            bulkEmailOpt: false,
            envelopeNo: 1001,
            contactStatusId: 1,
            primaryLanguageId: null,
            faithBackgroundId: null,
            householdPositionId: 1,
            participant: null,
            donorId: null,
            isDonor: true,
          },
        ],
      });

      const service = await FamilyService.getInstance();
      const progress = await service.saveHousehold(household);

      expect(progress.mainAddressId).toBeNull(); // no address content -> no create call
      expect(progress.members[0].envelopeNo).toBe(1051);
      expect(progress.members[0].envelopeBumped).toBe(true);
    });

    it("throws after 5 failed attempts to find a unique envelope number, wrapped in PartialSaveError", async () => {
      mockCreateTableRecords
        .mockResolvedValueOnce([{ Household_ID: 601 }])
        .mockResolvedValueOnce([{ Contact_ID: 701 }]);

      // Every conflict check returns a conflict; every "next number" call returns the same value.
      mockGetTableRecords.mockImplementation(async (query: { table: string; select: string }) => {
        if (query.table === "Donors" && query.select === "Donor_ID") {
          return [{ Donor_ID: 55 }];
        }
        if (query.table === "Donors" && query.select === "MAX(Envelope_No) AS Highest") {
          return [{ Highest: 1000 }];
        }
        return [];
      });

      const household = makeHousehold({
        address: { ...makeHousehold().address, addressLine1: null, postalCode: "" },
        members: [
          {
            contactId: -1,
            firstName: "John",
            middleName: "",
            maidenName: "",
            lastName: "Smith",
            nickname: "",
            prefixId: 0,
            suffixId: 0,
            birthDate: null,
            genderId: 0,
            maritalStatusId: 0,
            mobilePhone: "",
            emailAddress: "",
            bulkEmailOpt: false,
            envelopeNo: 1001,
            contactStatusId: 1,
            primaryLanguageId: null,
            faithBackgroundId: null,
            householdPositionId: 1,
            participant: null,
            donorId: null,
            isDonor: true,
          },
        ],
      });

      const service = await FamilyService.getInstance();
      const error = await service.saveHousehold(household).catch((e) => e);

      expect(error).toBeInstanceOf(PartialSaveError);
      expect((error as PartialSaveError).message).toContain(
        "Could not find an available envelope number after 5 attempts",
      );
      expect((error as PartialSaveError).progress.householdId).toBe(601);
    });

    it("wraps a failure creating the main address in a PartialSaveError with the progress so far", async () => {
      mockCreateTableRecords.mockRejectedValueOnce(new Error("address insert failed"));

      const service = await FamilyService.getInstance();
      const error = await service.saveHousehold(makeHousehold()).catch((e) => e);

      expect(error).toBeInstanceOf(PartialSaveError);
      expect((error as PartialSaveError).message).toBe("address insert failed");
      expect((error as PartialSaveError).progress).toEqual({
        mainAddressId: null,
        altAddressId: null,
        householdId: null,
        members: [],
      });
      expect((error as PartialSaveError).underlying).toBeInstanceOf(Error);
    });

    it("wraps a non-Error throw's String() representation as the message", async () => {
      mockCreateTableRecords.mockRejectedValueOnce("raw string failure");

      const service = await FamilyService.getInstance();
      const error = await service.saveHousehold(makeHousehold()).catch((e) => e);

      expect(error).toBeInstanceOf(PartialSaveError);
      expect((error as PartialSaveError).message).toBe("raw string failure");
      expect((error as PartialSaveError).underlying).toBe("raw string failure");
    });
  });
});
