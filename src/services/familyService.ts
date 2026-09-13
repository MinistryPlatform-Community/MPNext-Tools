import { MPHelper } from "@/lib/providers/ministry-platform";
import { AuthorizationService } from "@/services/authorizationService";
import { escapeFilterString, validatePositiveInt, validateColumnName } from "@/lib/validation";
import { DomainTimezoneService } from "@/services/domainTimezoneService";
import type {
  ContactSearchResult,
  CountryOption,
  FamilyDefaults,
  FamilyLookups,
  Household,
  LookupOption,
  StateOption,
  FamilyMember,
  SaveProgress,
  SavedMemberId,
} from "@/lib/dto/family";

export class PartialSaveError extends Error {
  constructor(public progress: SaveProgress, public underlying: unknown) {
    super(underlying instanceof Error ? underlying.message : String(underlying));
    this.name = "PartialSaveError";
  }
}

const DONOR_DEFAULTS = {
  Statement_Frequency_ID: 1, // Quarterly
  Statement_Type_ID: 1, // Individual
  Statement_Method_ID: 1, // Postal Mail
  Cancel_Envelopes: false,
};

const US_STATES: StateOption[] = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" }, { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" }, { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" }, { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" }, { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" }, { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" }, { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" }, { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" }, { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" }, { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" }, { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" }, { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" }, { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" }, { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" }, { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" }, { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
  { code: "AS", name: "American Samoa" }, { code: "GU", name: "Guam" },
  { code: "MP", name: "Northern Mariana Islands" }, { code: "PR", name: "Puerto Rico" },
  { code: "VI", name: "U.S. Virgin Islands" },
  { code: "AA", name: "Armed Forces Americas" },
  { code: "AE", name: "Armed Forces Europe" },
  { code: "AP", name: "Armed Forces Pacific" },
];

const DEFAULT_FAMILY_DEFAULTS: FamilyDefaults = {
  congregationId: 1,
  sourceId: 18,
  countryCode: "US",
  state: "",
  householdPositionId: 1,
  participantTypeId: 4,
  showEnvelopeNumbers: true,
};

function toIsoOrNull(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.startsWith("0001-01-01")) return null;
  return value;
}

function toDatetime(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.includes("T")) return value;
  return `${value}T00:00:00`;
}

export class FamilyService {
  private static instance: FamilyService;
  private mp: MPHelper | null = null;

  private constructor() {}

  public static async getInstance(): Promise<FamilyService> {
    if (!FamilyService.instance) {
      FamilyService.instance = new FamilyService();
      FamilyService.instance.mp = new MPHelper();
    }
    return FamilyService.instance;
  }

  async searchContacts(term: string): Promise<ContactSearchResult[]> {
    await AuthorizationService.getInstance().requireSecurityRole({
      table: 'Contacts',
      operation: 'read',
    });
    const trimmed = term.trim();
    if (trimmed.length < 2) return [];
    const escaped = escapeFilterString(trimmed);

    const rows = await this.mp!.getTableRecords<{
      Contact_ID: number;
      Display_Name: string;
      Email_Address: string | null;
      Household_ID_TABLE_Address_ID_TABLE_Address_Line_1?: string | null;
    }>({
      table: "Contacts",
      select: [
        "Contact_ID",
        "Display_Name",
        "Email_Address",
        "Household_ID_TABLE_Address_ID_TABLE.Address_Line_1",
      ].join(", "),
      filter: `Display_Name LIKE '${escaped}%' AND Contact_Status_ID = 1`,
      orderBy: "Display_Name",
      top: 25,
    });

    return rows.map((r) => ({
      contactId: r.Contact_ID,
      displayName: r.Display_Name,
      detail:
        r.Email_Address ??
        r.Household_ID_TABLE_Address_ID_TABLE_Address_Line_1 ??
        "",
    }));
  }

  async resolveContactIdFromPage(
    tableName: string,
    primaryKey: string,
    recordId: number,
    contactIdField: string,
  ): Promise<number | null> {
    await AuthorizationService.getInstance().requireSecurityRole({
      table: tableName,
      operation: 'read',
    });
    validatePositiveInt(recordId);
    validateColumnName(primaryKey);
    const fkPath = contactIdField.trim();
    if (!fkPath) return null;

    const select = fkPath.includes("_TABLE")
      ? `${fkPath} AS Resolved_Contact_ID`
      : `${validateColumnName(fkPath)} AS Resolved_Contact_ID`;

    const rows = await this.mp!.getTableRecords<{ Resolved_Contact_ID: number | null }>({
      table: tableName,
      select,
      filter: `${primaryKey} = ${recordId}`,
      top: 1,
    });

    const id = rows[0]?.Resolved_Contact_ID;
    return id ? Number(id) : null;
  }

  async getHousehold(contactId: number): Promise<Household | null> {
    await AuthorizationService.getInstance().requireSecurityRole({
      table: 'Households',
      operation: 'read',
    });
    validatePositiveInt(contactId);

    const contactRows = await this.mp!.getTableRecords<{
      Contact_ID: number;
      Household_ID: number | null;
    }>({
      table: "Contacts",
      select: "Contact_ID, Household_ID",
      filter: `Contact_ID = ${contactId}`,
      top: 1,
    });

    const householdId = contactRows[0]?.Household_ID;
    if (!householdId) return null;

    const [households, members] = await Promise.all([
      this.mp!.getTableRecords<Record<string, unknown>>({
        table: "Households",
        select: [
          "Households.Household_ID",
          "Households.Household_Name",
          "Households.Home_Phone",
          "Households.Congregation_ID",
          "Households.Household_Source_ID",
          "Households.Address_ID",
          "Households.Alternate_Mailing_Address",
          "Households.Season_Start",
          "Households.Season_End",
          "Households.Repeats_Annually",
          "Address_ID_TABLE.Address_Line_1 AS Addr1_Line1",
          "Address_ID_TABLE.Address_Line_2 AS Addr1_Line2",
          "Address_ID_TABLE.City AS Addr1_City",
          'Address_ID_TABLE."State/Region" AS Addr1_State',
          "Address_ID_TABLE.Postal_Code AS Addr1_Postal",
          "Address_ID_TABLE.Country_Code AS Addr1_Country",
          "Alternate_Mailing_Address_TABLE.Address_Line_1 AS Addr2_Line1",
          "Alternate_Mailing_Address_TABLE.Address_Line_2 AS Addr2_Line2",
          "Alternate_Mailing_Address_TABLE.City AS Addr2_City",
          'Alternate_Mailing_Address_TABLE."State/Region" AS Addr2_State',
          "Alternate_Mailing_Address_TABLE.Postal_Code AS Addr2_Postal",
          "Alternate_Mailing_Address_TABLE.Country_Code AS Addr2_Country",
        ].join(", "),
        filter: `Households.Household_ID = ${householdId}`,
        top: 1,
      }),
      this.mp!.getTableRecords<Record<string, unknown>>({
        table: "Contacts",
        select: [
          "Contacts.Contact_ID",
          "Contacts.Display_Name",
          "Contacts.First_Name",
          "Contacts.Middle_Name",
          "Contacts.Last_Name",
          "Contacts.Maiden_Name",
          "Contacts.Nickname",
          "Contacts.Prefix_ID",
          "Contacts.Suffix_ID",
          "Contacts.Date_of_Birth",
          "Contacts.Gender_ID",
          "Contacts.Marital_Status_ID",
          "Contacts.Mobile_Phone",
          "Contacts.Email_Address",
          "Contacts.Bulk_Email_Opt_Out",
          "Contacts.Contact_Status_ID",
          "Contacts.Primary_Language_ID",
          "Contacts.Faith_Background_ID",
          "Contacts.Household_Position_ID",
          "Contacts.Participant_Record",
          "Contacts.Donor_Record",
          "Participant_Record_TABLE.Participant_Type_ID AS Participant_Type_ID",
          "Donor_Record_TABLE.Envelope_No AS Envelope_No",
        ].join(", "),
        filter: `Contacts.Household_ID = ${householdId}`,
        orderBy: "Contacts.Household_Position_ID, Contacts.Date_of_Birth",
      }),
    ]);

    const h = households[0];
    if (!h) return null;

    const buildAddress = (prefix: "Addr1" | "Addr2", addressId: number) => ({
      addressId,
      addressLine1: (h[`${prefix}_Line1`] as string | null) ?? null,
      addressLine2: (h[`${prefix}_Line2`] as string | null) ?? null,
      city: (h[`${prefix}_City`] as string | null) ?? null,
      state: (h[`${prefix}_State`] as string | null) ?? null,
      region: null,
      postalCode: (h[`${prefix}_Postal`] as string | null) ?? "",
      countryCode: (h[`${prefix}_Country`] as string | null) ?? null,
    });

    const householdMembers: FamilyMember[] = members.map((m) => ({
      contactId: m.Contact_ID as number,
      displayName: (m.Display_Name as string) ?? "",
      firstName: (m.First_Name as string) ?? "",
      middleName: (m.Middle_Name as string) ?? "",
      maidenName: (m.Maiden_Name as string) ?? "",
      lastName: (m.Last_Name as string) ?? "",
      nickname: (m.Nickname as string) ?? "",
      prefixId: (m.Prefix_ID as number) ?? 0,
      suffixId: (m.Suffix_ID as number) ?? 0,
      birthDate: toIsoOrNull(m.Date_of_Birth as string | null),
      genderId: (m.Gender_ID as number) ?? 0,
      maritalStatusId: (m.Marital_Status_ID as number) ?? 0,
      mobilePhone: (m.Mobile_Phone as string) ?? "",
      emailAddress: (m.Email_Address as string) ?? "",
      bulkEmailOpt: Boolean(m.Bulk_Email_Opt_Out),
      envelopeNo: (m.Envelope_No as number | null) ?? null,
      contactStatusId: (m.Contact_Status_ID as number) ?? 1,
      primaryLanguageId: (m.Primary_Language_ID as number | null) ?? null,
      faithBackgroundId: (m.Faith_Background_ID as number | null) ?? null,
      householdPositionId: (m.Household_Position_ID as number) ?? 0,
      participant: m.Participant_Record
        ? {
            participantId: m.Participant_Record as number,
            participantTypeId: (m.Participant_Type_ID as number) ?? 0,
            notes: null,
          }
        : null,
      donorId: (m.Donor_Record as number | null) ?? null,
      isDonor: Boolean(m.Donor_Record),
    }));

    return {
      householdId: h.Household_ID as number,
      householdName: (h.Household_Name as string) ?? "",
      householdPhone: (h.Home_Phone as string) ?? "",
      congregationId: (h.Congregation_ID as number) ?? 0,
      sourceId: (h.Household_Source_ID as number) ?? 0,
      address: buildAddress("Addr1", (h.Address_ID as number | null) ?? 0),
      alternateMailingAddress: buildAddress(
        "Addr2",
        (h.Alternate_Mailing_Address as number | null) ?? 0,
      ),
      seasonStart: toIsoOrNull(h.Season_Start as string | null),
      seasonEnd: toIsoOrNull(h.Season_End as string | null),
      repeatsAnnually: Boolean(h.Repeats_Annually),
      areHeadsMarried: false,
      members: householdMembers,
    };
  }

  async getLookups(): Promise<FamilyLookups> {
    await AuthorizationService.getInstance().requireSecurityRole({
      table: 'Contacts',
      operation: 'read',
    });
    type Row<K extends string, N extends string> = Record<K, number> & Record<N, string>;
    const [
      congregations,
      sources,
      householdPositions,
      participantTypes,
      maritalStatuses,
      prefixes,
      suffixes,
      genders,
      contactStatuses,
      primaryLanguages,
      faithBackgrounds,
      countries,
    ] = await Promise.all([
      this.mp!.getTableRecords<Row<"Congregation_ID", "Congregation_Name">>({
        table: "Congregations",
        select: "Congregation_ID, Congregation_Name",
        filter: "End_Date IS NULL",
        orderBy: "Congregation_Name",
      }),
      this.mp!.getTableRecords<Row<"Household_Source_ID", "Household_Source">>({
        table: "Household_Sources",
        select: "Household_Source_ID, Household_Source",
        orderBy: "Household_Source",
      }),
      this.mp!.getTableRecords<Row<"Household_Position_ID", "Household_Position">>({
        table: "Household_Positions",
        select: "Household_Position_ID, Household_Position",
        orderBy: "Household_Position_ID",
      }),
      this.mp!.getTableRecords<Row<"Participant_Type_ID", "Participant_Type">>({
        table: "Participant_Types",
        select: "Participant_Type_ID, Participant_Type",
        orderBy: "Participant_Type",
      }),
      this.mp!.getTableRecords<Row<"Marital_Status_ID", "Marital_Status">>({
        table: "Marital_Statuses",
        select: "Marital_Status_ID, Marital_Status",
        orderBy: "Marital_Status",
      }),
      this.mp!.getTableRecords<Row<"Prefix_ID", "Prefix">>({
        table: "Prefixes",
        select: "Prefix_ID, Prefix",
        orderBy: "Prefix",
      }),
      this.mp!.getTableRecords<Row<"Suffix_ID", "Suffix">>({
        table: "Suffixes",
        select: "Suffix_ID, Suffix",
        orderBy: "Suffix",
      }),
      this.mp!.getTableRecords<Row<"Gender_ID", "Gender">>({
        table: "Genders",
        select: "Gender_ID, Gender",
        orderBy: "Gender_ID",
      }),
      this.mp!.getTableRecords<Row<"Contact_Status_ID", "Contact_Status">>({
        table: "Contact_Statuses",
        select: "Contact_Status_ID, Contact_Status",
        orderBy: "Contact_Status_ID",
      }),
      this.mp!.getTableRecords<Row<"Primary_Language_ID", "Primary_Language">>({
        table: "Primary_Languages",
        select: "Primary_Language_ID, Primary_Language",
        orderBy: "Primary_Language",
      }),
      this.mp!.getTableRecords<Row<"Faith_Background_ID", "Faith_Background">>({
        table: "Faith_Backgrounds",
        select: "Faith_Background_ID, Faith_Background",
        orderBy: "Faith_Background",
      }),
      this.mp!.getTableRecords<{ Country_Code: string | null; Country: string | null }>({
        table: "Countries",
        select: "Country_Code, Country",
        filter: "Country_Code IS NOT NULL",
        orderBy: "Country",
      }),
    ]);

    const mapLookup = <K extends string, N extends string>(
      rows: Row<K, N>[],
      idKey: K,
      nameKey: N,
    ): LookupOption[] =>
      rows.map((r) => ({ id: r[idKey] as number, name: r[nameKey] as string }));

    const countryList: CountryOption[] = countries
      .filter((c) => c.Country_Code && c.Country)
      .map((c) => ({ code: c.Country_Code!, name: c.Country! }));

    return {
      congregations: mapLookup(congregations, "Congregation_ID", "Congregation_Name"),
      sources: mapLookup(sources, "Household_Source_ID", "Household_Source"),
      householdPositions: mapLookup(householdPositions, "Household_Position_ID", "Household_Position"),
      participantTypes: mapLookup(participantTypes, "Participant_Type_ID", "Participant_Type"),
      maritalStatuses: mapLookup(maritalStatuses, "Marital_Status_ID", "Marital_Status"),
      prefixes: mapLookup(prefixes, "Prefix_ID", "Prefix"),
      suffixes: mapLookup(suffixes, "Suffix_ID", "Suffix"),
      genders: mapLookup(genders, "Gender_ID", "Gender"),
      contactStatuses: mapLookup(contactStatuses, "Contact_Status_ID", "Contact_Status"),
      primaryLanguages: mapLookup(primaryLanguages, "Primary_Language_ID", "Primary_Language"),
      faithBackgrounds: mapLookup(faithBackgrounds, "Faith_Background_ID", "Faith_Background"),
      states: US_STATES,
      countries: countryList,
    };
  }

  getDefaults(): FamilyDefaults {
    return { ...DEFAULT_FAMILY_DEFAULTS };
  }

  async getNextEnvelopeNumber(): Promise<number> {
    await AuthorizationService.getInstance().requireSecurityRole({
      table: 'Contacts',
      operation: 'read',
    });
    // MAX() returns a single row even on an empty table — both ORDER BY DESC
    // TOP 1 and MAX() walk the index, but MAX is one round-trip with one row.
    // Note: Donors has no Congregation_ID column, so envelope numbers are
    // global across the MP instance (matches MP's own Add/Edit Family tool).
    const rows = await this.mp!.getTableRecords<{ Highest: number | null }>({
      table: "Donors",
      select: "MAX(Envelope_No) AS Highest",
      filter: "Envelope_No IS NOT NULL",
    });
    const highest = rows[0]?.Highest ?? 0;
    return highest + 1;
  }

  async saveHousehold(household: Household): Promise<SaveProgress> {
    // Gate FIRST; its return value is the ONLY source of write attribution for
    // every record this multi-step save touches.
    const userId = await AuthorizationService.getInstance().requireSecurityRole({
      table: 'Households',
      operation: 'update',
    });
    const progress: SaveProgress = {
      mainAddressId: null,
      altAddressId: null,
      householdId: household.householdId > 0 ? household.householdId : null,
      members: [],
    };

    const wrap = async <T>(fn: () => Promise<T>): Promise<T> => {
      try {
        return await fn();
      } catch (e) {
        throw new PartialSaveError(progress, e);
      }
    };

    progress.mainAddressId = await wrap(() => this.upsertAddress(household.address, userId));
    progress.altAddressId = household.alternateMailingAddress.addressLine1?.trim()
      ? await wrap(() => this.upsertAddress(household.alternateMailingAddress, userId))
      : null;

    const householdPayload = {
      Household_Name: household.householdName,
      Home_Phone: household.householdPhone || null,
      Congregation_ID: household.congregationId,
      Household_Source_ID: household.sourceId,
      Address_ID: progress.mainAddressId,
      Alternate_Mailing_Address: progress.altAddressId,
      Season_Start: toDatetime(household.seasonStart),
      Season_End: toDatetime(household.seasonEnd),
      Repeats_Annually: household.repeatsAnnually,
    };

    if (household.householdId === 0) {
      const created = await wrap(() =>
        this.mp!.createTableRecords<{ Household_ID: number } & typeof householdPayload>(
          "Households",
          [householdPayload as { Household_ID: number } & typeof householdPayload],
          { $select: "Household_ID", $userId: userId },
        ),
      );
      progress.householdId = (created[0] as { Household_ID: number }).Household_ID;
    } else {
      await wrap(() =>
        this.mp!.updateTableRecords(
          "Households",
          [{ Household_ID: household.householdId, ...householdPayload }],
          { partial: true, $userId: userId },
        ),
      );
      progress.householdId = household.householdId;
    }

    for (const member of household.members) {
      const hasName = member.firstName.trim().length > 0;
      if (!hasName && member.contactId < 0) continue;
      const savedMember = await wrap(() =>
        this.saveMember(member, progress.householdId!, household.householdName, userId),
      );
      progress.members.push(savedMember);
    }

    return progress;
  }

  private async upsertAddress(
    address: Household["address"],
    userId: number,
  ): Promise<number | null> {
    const hasContent =
      (address.addressLine1?.trim().length ?? 0) > 0 ||
      (address.postalCode?.trim().length ?? 0) > 0;
    if (!hasContent) return null;

    const payload = {
      Address_Line_1: address.addressLine1 ?? "",
      Address_Line_2: address.addressLine2 ?? null,
      City: address.city ?? null,
      "State/Region": address.state ?? null,
      Postal_Code: address.postalCode ?? null,
      Country_Code: address.countryCode ?? null,
    };

    if (address.addressId && address.addressId > 0) {
      await this.mp!.updateTableRecords(
        "Addresses",
        [{ Address_ID: address.addressId, ...payload }],
        { partial: true, $userId: userId },
      );
      return address.addressId;
    }

    const created = await this.mp!.createTableRecords<{ Address_ID: number } & typeof payload>(
      "Addresses",
      [payload as { Address_ID: number } & typeof payload],
      { $select: "Address_ID", $userId: userId },
    );
    return (created[0] as { Address_ID: number }).Address_ID;
  }

  private async saveMember(
    member: FamilyMember,
    householdId: number,
    fallbackLastName: string,
    userId: number,
  ): Promise<SavedMemberId> {
    const lastName = member.lastName.trim() || fallbackLastName;
    const displayName = `${lastName}, ${member.firstName.trim()}`.trim();

    const contactPayload = {
      Display_Name: displayName,
      First_Name: member.firstName || null,
      Middle_Name: member.middleName || null,
      Last_Name: lastName,
      Maiden_Name: member.maidenName || null,
      Nickname: member.nickname || member.firstName || null,
      Prefix_ID: member.prefixId || null,
      Suffix_ID: member.suffixId || null,
      Date_of_Birth: toDatetime(member.birthDate),
      Gender_ID: member.genderId || null,
      Marital_Status_ID: member.maritalStatusId || null,
      Mobile_Phone: member.mobilePhone || null,
      Email_Address: member.emailAddress || null,
      Bulk_Email_Opt_Out: member.bulkEmailOpt,
      Household_ID: householdId,
      Household_Position_ID: member.householdPositionId,
      Contact_Status_ID: member.contactStatusId || 1,
      Primary_Language_ID: member.primaryLanguageId,
      Faith_Background_ID: member.faithBackgroundId,
      Company: false,
    };

    let contactId: number;
    if (member.contactId > 0) {
      await this.mp!.updateTableRecords(
        "Contacts",
        [{ Contact_ID: member.contactId, ...contactPayload }],
        { partial: true, $userId: userId },
      );
      contactId = member.contactId;
    } else {
      const created = await this.mp!.createTableRecords<{ Contact_ID: number } & typeof contactPayload>(
        "Contacts",
        [contactPayload as { Contact_ID: number } & typeof contactPayload],
        { $select: "Contact_ID", $userId: userId },
      );
      contactId = (created[0] as { Contact_ID: number }).Contact_ID;
    }

    let participantId: number | null = member.participant?.participantId ?? null;
    const participantTypeId = member.participant?.participantTypeId ?? 0;
    if (participantTypeId > 0) {
      if (participantId && participantId > 0) {
        await this.mp!.updateTableRecords(
          "Participants",
          [
            {
              Participant_ID: participantId,
              Participant_Type_ID: participantTypeId,
            },
          ],
          { partial: true, $userId: userId },
        );
      } else {
        const tz = DomainTimezoneService.getInstance();
        const nowMpSql = await tz.toMpSqlDatetime(new Date());
        const created = await this.mp!.createTableRecords<{
          Participant_ID: number;
          Contact_ID: number;
          Participant_Type_ID: number;
          Participant_Start_Date: string;
        }>(
          "Participants",
          [
            {
              Contact_ID: contactId,
              Participant_Type_ID: participantTypeId,
              Participant_Start_Date: nowMpSql,
            } as {
              Participant_ID: number;
              Contact_ID: number;
              Participant_Type_ID: number;
              Participant_Start_Date: string;
            },
          ],
          { $select: "Participant_ID", $userId: userId },
        );
        participantId = (created[0] as { Participant_ID: number }).Participant_ID;
        await this.mp!.updateTableRecords(
          "Contacts",
          [{ Contact_ID: contactId, Participant_Record: participantId }],
          { partial: true, $userId: userId },
        );
      }
    }

    let donorId: number | null = member.donorId;
    let envelopeNo: number | null = member.envelopeNo;
    let envelopeBumped = false;
    if (member.isDonor) {
      const result = await this.upsertDonor(
        contactId,
        member.donorId,
        member.envelopeNo,
        userId,
      );
      donorId = result.donorId;
      envelopeNo = result.envelopeNo;
      envelopeBumped = result.bumped;
    }

    return {
      tempContactId: member.contactId,
      contactId,
      participantId,
      donorId,
      envelopeNo,
      envelopeBumped,
    };
  }

  /**
   * Re-check envelope uniqueness against the Donors table to harden against
   * a race where two clients pulled the same MAX+1. If the requested number
   * is already taken by a different donor, bump to current MAX+1 and retry
   * (up to 5 attempts to bound the cost in pathological cases).
   *
   * Returns the number that was actually safe to use, and whether it was
   * bumped from the requested value.
   */
  private async resolveUniqueEnvelopeNo(
    requested: number,
    excludeDonorId: number | null,
  ): Promise<{ envelopeNo: number; bumped: boolean }> {
    // Both values land in a raw $filter string below. They originate from a
    // client-supplied Household, and a server action is a public POST endpoint
    // whose TypeScript types are erased at runtime — so `number` here proves
    // nothing. The action parses with HouseholdSchema; this is the second
    // layer, at the point where the string is actually built.
    validatePositiveInt(requested);
    // 0 and null both mean "no donor to exclude" and are handled by the
    // ternary below, so only a value that will actually be interpolated is
    // required to be a positive integer.
    if (excludeDonorId !== null && excludeDonorId !== 0) {
      validatePositiveInt(excludeDonorId);
    }

    let candidate = requested;
    for (let attempt = 0; attempt < 5; attempt++) {
      // `candidate` is either `requested` (validated above) or the result of
      // getNextEnvelopeNumber(), which is derived server-side — but validate
      // each iteration anyway so no future change to that method can quietly
      // reintroduce an unchecked value here.
      validatePositiveInt(candidate);
      const filter =
        excludeDonorId && excludeDonorId > 0
          ? `Envelope_No = ${candidate} AND Donor_ID <> ${excludeDonorId}`
          : `Envelope_No = ${candidate}`;
      const conflicts = await this.mp!.getTableRecords<{ Donor_ID: number }>({
        table: "Donors",
        select: "Donor_ID",
        filter,
        top: 1,
      });
      if (conflicts.length === 0) {
        return { envelopeNo: candidate, bumped: candidate !== requested };
      }
      candidate = await this.getNextEnvelopeNumber();
    }
    throw new Error(
      `Could not find an available envelope number after 5 attempts (last tried: ${candidate}). ` +
        `Another transaction may be assigning envelopes simultaneously — please retry.`,
    );
  }

  private async upsertDonor(
    contactId: number,
    existingDonorId: number | null,
    envelopeNo: number | null,
    userId: number,
  ): Promise<{ donorId: number; envelopeNo: number | null; bumped: boolean }> {
    let finalEnvelopeNo: number | null = envelopeNo;
    let bumped = false;
    if (envelopeNo !== null && envelopeNo > 0) {
      const resolved = await this.resolveUniqueEnvelopeNo(envelopeNo, existingDonorId);
      finalEnvelopeNo = resolved.envelopeNo;
      bumped = resolved.bumped;
    }

    if (existingDonorId && existingDonorId > 0) {
      // Client-supplied, and it selects which Donors row gets written.
      validatePositiveInt(existingDonorId);
      await this.mp!.updateTableRecords(
        "Donors",
        [{ Donor_ID: existingDonorId, Envelope_No: finalEnvelopeNo }],
        { partial: true, $userId: userId },
      );
      return { donorId: existingDonorId, envelopeNo: finalEnvelopeNo, bumped };
    }

    const tz = DomainTimezoneService.getInstance();
    const setupDateMpSql = await tz.toMpSqlDatetime(new Date());
    const payload = {
      Contact_ID: contactId,
      Envelope_No: finalEnvelopeNo,
      Setup_Date: setupDateMpSql,
      ...DONOR_DEFAULTS,
    };
    const created = await this.mp!.createTableRecords<{ Donor_ID: number } & typeof payload>(
      "Donors",
      [payload as { Donor_ID: number } & typeof payload],
      { $select: "Donor_ID", $userId: userId },
    );
    const newDonorId = (created[0] as { Donor_ID: number }).Donor_ID;
    await this.mp!.updateTableRecords(
      "Contacts",
      [{ Contact_ID: contactId, Donor_Record: newDonorId }],
      { partial: true, $userId: userId },
    );
    return { donorId: newDonorId, envelopeNo: finalEnvelopeNo, bumped };
  }
}
