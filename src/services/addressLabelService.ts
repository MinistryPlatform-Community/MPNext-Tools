import { MPHelper } from '@/lib/providers/ministry-platform';

export interface ContactAddressRow {
  Contact_ID: number;
  Display_Name: string;
  First_Name: string;
  Last_Name: string;
  Household_ID: number | null;
  Household_Name: string | null;
  Bulk_Mail_Opt_Out: boolean;
  Address_Line_1: string | null;
  Address_Line_2: string | null;
  City: string | null;
  'State/Region': string | null;
  Postal_Code: string | null;
  Bar_Code: string | null;
}

const BATCH_SIZE = 100;

const SELECT_FIELDS = [
  'Contact_ID',
  'Display_Name',
  'First_Name',
  'Last_Name',
  'Household_ID',
  'Household_ID_TABLE.Household_Name',
  'Household_ID_TABLE.Bulk_Mail_Opt_Out',
  'Household_ID_TABLE_Address_ID_TABLE.Address_Line_1',
  'Household_ID_TABLE_Address_ID_TABLE.Address_Line_2',
  'Household_ID_TABLE_Address_ID_TABLE.City',
  'Household_ID_TABLE_Address_ID_TABLE.[State/Region]',
  'Household_ID_TABLE_Address_ID_TABLE.Postal_Code',
  'Household_ID_TABLE_Address_ID_TABLE.Bar_Code',
].join(', ');

/**
 * AddressLabelService - Singleton service for fetching contact addresses
 * from Ministry Platform via Household → Address FK joins.
 * Used by address label generation features.
 */
export class AddressLabelService {
  private static instance: AddressLabelService;
  private mp: MPHelper | null = null;

  private constructor() {
    this.initialize();
  }

  public static async getInstance(): Promise<AddressLabelService> {
    if (!AddressLabelService.instance) {
      AddressLabelService.instance = new AddressLabelService();
      await AddressLabelService.instance.initialize();
    }
    return AddressLabelService.instance;
  }

  private async initialize(): Promise<void> {
    this.mp = new MPHelper();
  }

  /**
   * Fetch addresses for multiple contacts, batching large arrays to avoid
   * oversized filter clauses.
   */
  async getAddressesForContacts(contactIds: number[]): Promise<ContactAddressRow[]> {
    if (contactIds.length === 0) return [];

    const results: ContactAddressRow[] = [];

    for (let i = 0; i < contactIds.length; i += BATCH_SIZE) {
      const batch = contactIds.slice(i, i + BATCH_SIZE);
      const idList = batch.join(', ');

      const rows = await this.mp!.getTableRecords<ContactAddressRow>({
        table: 'Contacts',
        select: SELECT_FIELDS,
        filter: `Contact_ID IN (${idList})`,
        orderBy: 'Household_ID_TABLE_Address_ID_TABLE.Postal_Code',
      });

      results.push(...rows);
    }

    return results;
  }

  /**
   * Fetch the address for a single contact. Returns null if not found.
   */
  async getAddressForContact(contactId: number): Promise<ContactAddressRow | null> {
    const rows = await this.mp!.getTableRecords<ContactAddressRow>({
      table: 'Contacts',
      select: SELECT_FIELDS,
      filter: `Contact_ID = ${contactId}`,
      top: 1,
    });

    return rows[0] ?? null;
  }
}
