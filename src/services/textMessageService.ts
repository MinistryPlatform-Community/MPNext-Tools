import { z } from 'zod';
import { MPHelper } from '@/lib/providers/ministry-platform';
import { MP_FETCH_BATCH_SIZE, MP_MAX_PAGE_SIZE, TEXT_COMMUNICATION_TYPE_FALLBACK_ID } from '@/lib/constants';
import { validateColumnName, validatePositiveInt } from '@/lib/validation';
import { AuthorizationService } from '@/services/authorizationService';
import type { MessageCurfewWindow, MessagingViewOption, SelectOption, SmsNumberOption, TextQuota } from '@/lib/dto';
import { STANDARD_MERGE_CONTACT_SELECT } from '@/components/text-messaging/merge-utils';

/**
 * Normalizes a curfew time from `api_CORE_GetDomainData` ("HH:MM:SS", "HH:MM", or a
 * datetime with a time component) to "HH:MM". Returns null for anything else, including
 * blank or out-of-range values, so a bad row disables the curfew check instead of
 * throwing.
 */
function normalizeCurfewTime(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/(?:^|[T ])(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** True when the value is a positive record ID (a configured `Messaging_Approval_Process_ID`). */
function isConfiguredProcessId(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0;
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isFinite(parsed) && parsed > 0;
  }
  return false;
}

/** Domain-wide messaging settings read from the stock proc `api_CORE_GetDomainData`. */
export interface DomainMessagingData {
  /** The messaging curfew (quiet hours), or null when none is configured. */
  curfew: MessageCurfewWindow | null;
  /**
   * Whether the domain has a `Messaging_Approval_Process_ID`. When true, a send over the
   * sender's quota is placed In Review (the process approves it). When false, the domain
   * has no review path, so an over-quota send is not permitted at all.
   *
   * Defaults to true when the proc is unavailable or the column is absent, so a domain we
   * cannot read keeps the existing review behavior rather than blocking every large send.
   */
  approvalProcessConfigured: boolean;
}

/**
 * Row shape inserted into dp_Communications for a text message.
 *
 * The generated `DpCommunicationsSchema` is unusable for inserts: it requires the
 * identity PK and validates datetimes with `z.string().datetime()`, which rejects the
 * MP SQL format ("YYYY-MM-DD HH:MM:SS") produced by DomainTimezoneService.
 */
export interface TextCommunicationInsert {
  Author_User_ID: number;
  Communication_Type_ID: number;
  Communication_Status_ID: number;
  Selection_ID: number | null;
  Send_To_Parents: boolean;
  Subject: string;
  Body: string;
  Pertains_To_Page_ID: number | null;
  From_SMS_Number: number;
  From_Contact: number;
  Reply_to_Contact: number;
  /** MP SQL datetime in the domain's wall-clock time. */
  Start_Date: string;
  Bulk_Email: boolean;
  Template: boolean;
  Active: boolean;
  Publication_ID: number | null;
}

const MP_SQL_DATETIME = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

export const textCommunicationInsertSchema = z.object({
  Author_User_ID: z.number().int().positive(),
  Communication_Type_ID: z.number().int().positive(),
  Communication_Status_ID: z.number().int().positive(),
  Selection_ID: z.number().int().positive().nullable(),
  Send_To_Parents: z.boolean(),
  Subject: z.string().min(1).max(500),
  Body: z.string().min(1),
  Pertains_To_Page_ID: z.number().int().positive().nullable(),
  From_SMS_Number: z.number().int().positive(),
  From_Contact: z.number().int().positive(),
  Reply_to_Contact: z.number().int().positive(),
  Start_Date: z.string().regex(MP_SQL_DATETIME),
  Bulk_Email: z.boolean(),
  Template: z.boolean(),
  Active: z.boolean(),
  Publication_ID: z.number().int().positive().nullable(),
});

/** A messaging view plus the metadata needed to run it against the table API. */
export interface MessagingViewDefinition extends MessagingViewOption {
  /** Target page table, e.g. Event_Participants. */
  tableName: string;
  /** Target page primary key, e.g. Event_Participant_ID. */
  primaryKey: string;
  /** Column or FK path on `tableName` that yields the contact, e.g. Participant_ID_Table.Contact_ID. */
  contactIdField: string;
  /** Column on `tableName` holding the launching record's ID, e.g. Event_ID. */
  parentKey: string;
  /** The view's SQL where-clause fragment in MP's alias syntax ("" when unrestricted). */
  viewClause: string;
}

interface MessagingViewRow {
  Sub_Page_View_ID: number;
  View_Title: string;
  View_Clause: string | null;
  Sub_Page_Name: string | null;
  View_Order: number | null;
  Table_Name: string | null;
  Primary_Key: string | null;
  Contact_ID_Field: string | null;
  Parent_Primary_Key: string | null;
}

/** Row shape inserted into dp_Communication_Messages (one per recipient). */
export interface TextMessageInsert {
  Communication_ID: number;
  Action_Status_ID: number;
  /** MP SQL datetime in the domain's wall-clock time. */
  Action_Status_Time: string;
  Contact_ID: number;
  /** Sending SMS number. */
  From: string;
  /** Recipient mobile number. */
  To: string;
  Subject: string | null;
  /** Body with placeholders already merged for this recipient. */
  Body: string;
  Deleted: boolean;
}

export const textMessageInsertSchema = z.object({
  Communication_ID: z.number().int().positive(),
  Action_Status_ID: z.number().int().positive(),
  Action_Status_Time: z.string().regex(MP_SQL_DATETIME),
  Contact_ID: z.number().int().positive(),
  From: z.string().min(1).max(256),
  To: z.string().min(1).max(256),
  Subject: z.string().max(500).nullable(),
  Body: z.string().min(1),
  Deleted: z.boolean(),
});

/** Contact columns needed to text someone and merge the standard placeholders. */
export interface TextableContactRow {
  Contact_ID: number;
  Display_Name: string | null;
  First_Name: string | null;
  Last_Name: string | null;
  Nickname: string | null;
  Mobile_Phone: string | null;
  Email_Address: string | null;
  /** `Texting_Opt_In_Types` ID; see `meetsTextingCompliance`. */
  Texting_Opt_In_Type_ID: number | null;
  Congregation_ID: number | null;
  Congregation_Name: string | null;
}

/** The sending user's contact record. */
export interface SenderContext {
  userId: number;
  contactId: number;
  displayName: string | null;
}

type SmsNumberRow = {
  SMS_Number_ID: number;
  Number_Title: string;
  SMS_Number: string | null;
  Default: boolean;
  User_Group_ID: number | null;
  Congregation_ID: number | null;
  Cost_Per_Segment: number | null;
  Sender_Label: string | null;
  /** `Texting_Compliance_Levels` ID; drives which contacts may be texted from this number. */
  Texting_Compliance_Level: number | null;
};

/**
 * TextMessageService: singleton service for the Text Messaging tool.
 *
 * Reads targeting sources (Audiences, Publications), the SMS numbers a user may send
 * from, and contact texting eligibility; resolves selection recipients through MP's
 * stock messaging-view proc; and writes `dp_Communications` and
 * `dp_Communication_Messages` rows directly (never the `/messages` API).
 */
export class TextMessageService {
  private static instance: TextMessageService;
  private mp: MPHelper | null = null;
  private textTypeId: number | null = null;

  private constructor() {
    // Initialization is handled by getInstance()
  }

  public static async getInstance(): Promise<TextMessageService> {
    if (!TextMessageService.instance) {
      TextMessageService.instance = new TextMessageService();
      await TextMessageService.instance.initialize();
    }
    return TextMessageService.instance;
  }

  private async initialize(): Promise<void> {
    this.mp = new MPHelper();
  }

  /**
   * Authorization gate (CLAUDE.md rules 12 and 13). Every MP read and write asserts a
   * security role; the returned MP User_ID is the single source for the acting user,
   * both for write attribution ($userId) and for "the sender's" reads. Per-request
   * memoization inside AuthorizationService keeps the repeated calls to one MP read.
   */
  private async gate(table: string, operation: 'read' | 'create' | 'update' | 'delete'): Promise<number> {
    return AuthorizationService.getInstance().requireSecurityRole({ table, operation });
  }

  /** Reads an entire result set, paging past `MP_MAX_PAGE_SIZE`. Needs a stable orderBy. */
  private async getAllRecords<T>(params: {
    table: string;
    select: string;
    orderBy: string;
    filter?: string;
    distinct?: boolean;
  }): Promise<T[]> {
    const all: T[] = [];
    let skip = 0;
    for (;;) {
      const page = await this.mp!.getTableRecords<T>({ ...params, top: MP_MAX_PAGE_SIZE, skip });
      all.push(...page);
      if (page.length < MP_MAX_PAGE_SIZE) break;
      skip += MP_MAX_PAGE_SIZE;
    }
    return all;
  }

  private inList(ids: number[]): string {
    return ids.map((id) => validatePositiveInt(Math.trunc(id))).join(',');
  }

  // =====================================================================
  // Sender context and pickers
  // =====================================================================

  /** The user's Contact_ID (From_Contact / Reply_to_Contact on the communication). */
  public async getSenderContext(): Promise<SenderContext> {
    const userId = await this.gate('dp_Users', 'read');
    const rows = await this.mp!.getTableRecords<{
      User_ID: number;
      Contact_ID: number;
      Display_Name: string | null;
    }>({
      table: 'dp_Users',
      select: 'dp_Users.User_ID, dp_Users.Contact_ID, Contact_ID_TABLE.Display_Name',
      filter: `dp_Users.User_ID = ${validatePositiveInt(userId)}`,
      top: 1,
    });
    const row = rows[0];
    if (!row) throw new Error('User not found');
    return {
      userId: row.User_ID,
      contactId: row.Contact_ID,
      displayName: row.Display_Name ?? null,
    };
  }

  /**
   * The domain's messaging settings from the stock proc `api_CORE_GetDomainData`:
   * the messaging curfew (quiet hours) and whether a message approval process exists.
   *
   * MP stores `Message_Curfew_Start_Time` / `Message_Curfew_End_Time` as "HH:MM:SS"
   * wall-clock strings in the domain time zone, usually wrapping overnight (e.g. 19:00 to
   * 08:00); they are returned normalized to "HH:MM", or null when either is missing/blank.
   * `Messaging_Approval_Process_ID` is a positive ID when the domain has a review process
   * and NULL when it does not.
   *
   * Never throws: when the proc is unavailable to the API user the curfew check is skipped
   * and `approvalProcessConfigured` stays true, so the existing review behavior is kept
   * rather than blocking sends on a domain we cannot read.
   */
  public async getDomainMessagingData(): Promise<DomainMessagingData> {
    await this.gate('dp_Domains', 'read');
    try {
      const result = await this.mp!.executeProcedure('api_CORE_GetDomainData');
      for (const resultSet of result ?? []) {
        if (!Array.isArray(resultSet)) continue;
        const row = resultSet[0];
        if (!row || typeof row !== 'object') continue;
        const record = row as Record<string, unknown>;
        if (
          !('Message_Curfew_Start_Time' in record) &&
          !('Message_Curfew_End_Time' in record) &&
          !('Messaging_Approval_Process_ID' in record)
        ) {
          continue;
        }
        const start = normalizeCurfewTime(record.Message_Curfew_Start_Time);
        const end = normalizeCurfewTime(record.Message_Curfew_End_Time);
        return {
          curfew: start && end ? { start, end } : null,
          // Absent column (an older MP without the field) keeps the review path open.
          approvalProcessConfigured: 'Messaging_Approval_Process_ID' in record
            ? isConfiguredProcessId(record.Messaging_Approval_Process_ID)
            : true,
        };
      }
      return { curfew: null, approvalProcessConfigured: true };
    } catch {
      return { curfew: null, approvalProcessConfigured: true };
    }
  }

  /**
   * The sender's pre-approved texting quota: the highest `Mass_Text_Quota` across the
   * security roles in dp_User_Roles. `limit` is null when no role sets one, which
   * means every send goes to review.
   */
  public async getUserTextQuota(): Promise<TextQuota> {
    const userId = await this.gate('dp_User_Roles', 'read');
    const rows = await this.mp!.getTableRecords<{
      Role_Name: string;
      Mass_Text_Quota: number | null;
    }>({
      table: 'dp_User_Roles',
      select: 'Role_ID_TABLE.Role_Name, Role_ID_TABLE.Mass_Text_Quota',
      filter: `dp_User_Roles.User_ID = ${validatePositiveInt(userId)}`,
    });
    let limit: number | null = null;
    const roleNames: string[] = [];
    for (const row of rows) {
      const quota = row.Mass_Text_Quota;
      if (typeof quota === 'number' && Number.isFinite(quota) && quota > 0) {
        roleNames.push(row.Role_Name);
        limit = limit === null ? quota : Math.max(limit, quota);
      }
    }
    return { limit, roleNames };
  }

  /** Message rows on a communication, counted server-side so release never trusts the client. */
  public async countMessages(communicationId: number): Promise<number> {
    await this.gate('dp_Communication_Messages', 'read');
    const rows = await this.getAllRecords<{ Communication_Message_ID: number }>({
      table: 'dp_Communication_Messages',
      select: 'Communication_Message_ID',
      filter: `Communication_ID = ${validatePositiveInt(communicationId)} AND Deleted = 0`,
      orderBy: 'Communication_Message_ID',
    });
    return rows.length;
  }

  /**
   * Congregation IDs the user's MP global filter restricts them to, from
   * dp_User_Global_Filters. An empty list means no restriction: the user may see (and
   * text) every campus. MP's global filter table is Congregations, so Global_Filter_ID
   * is a Congregation_ID.
   */
  public async getUserGlobalFilterCongregationIds(): Promise<number[]> {
    const userId = await this.gate('dp_User_Global_Filters', 'read');
    const rows = await this.mp!.getTableRecords<{ Global_Filter_ID: number | string | null }>({
      table: 'dp_User_Global_Filters',
      select: 'Global_Filter_ID',
      filter: `User_ID = ${validatePositiveInt(userId)}`,
    });
    const ids = new Set<number>();
    for (const row of rows) {
      const id = typeof row.Global_Filter_ID === 'string' ? Number.parseInt(row.Global_Filter_ID, 10) : row.Global_Filter_ID;
      if (typeof id === 'number' && Number.isFinite(id) && id > 0) ids.add(id);
    }
    return [...ids];
  }

  /**
   * Active SMS numbers the user may send from: numbers with no User_Group_ID plus
   * numbers restricted to a user group the user belongs to. Default number first.
   */
  public async listSmsNumbersForUser(): Promise<SmsNumberOption[]> {
    const userId = await this.gate('dp_SMS_Numbers', 'read');
    const [numbers, groups] = await Promise.all([
      this.mp!.getTableRecords<SmsNumberRow>({
        table: 'dp_SMS_Numbers',
        select:
          'SMS_Number_ID, Number_Title, SMS_Number, [Default], User_Group_ID, Congregation_ID, Cost_Per_Segment, Sender_Label, Texting_Compliance_Level',
        filter: 'Active = 1',
        orderBy: 'Number_Title',
      }),
      this.mp!.getTableRecords<{ User_Group_ID: number }>({
        table: 'dp_User_User_Groups',
        select: 'User_Group_ID',
        filter: `User_ID = ${validatePositiveInt(userId)}`,
      }),
    ]);
    const groupIds = new Set(groups.map((g) => g.User_Group_ID));

    return numbers
      .filter((n) => n.User_Group_ID === null || n.User_Group_ID === undefined || groupIds.has(n.User_Group_ID))
      .sort((a, b) => Number(b.Default) - Number(a.Default) || a.Number_Title.localeCompare(b.Number_Title))
      .map((n) => ({
        id: n.SMS_Number_ID,
        label: n.Number_Title,
        number: n.SMS_Number ?? null,
        senderLabel: n.Sender_Label ?? null,
        congregationId: n.Congregation_ID ?? null,
        costPerSegment: n.Cost_Per_Segment ?? null,
        isDefault: Boolean(n.Default),
        complianceLevelId: n.Texting_Compliance_Level ?? null,
      }));
  }

  /** Re-fetches a single SMS number by ID so a send never trusts client-supplied number text. */
  public async getSmsNumber(id: number): Promise<SmsNumberOption | null> {
    await this.gate('dp_SMS_Numbers', 'read');
    const rows = await this.mp!.getTableRecords<SmsNumberRow>({
      table: 'dp_SMS_Numbers',
      select:
        'SMS_Number_ID, Number_Title, SMS_Number, [Default], User_Group_ID, Congregation_ID, Cost_Per_Segment, Sender_Label, Texting_Compliance_Level',
      filter: `SMS_Number_ID = ${validatePositiveInt(id)} AND Active = 1`,
      top: 1,
    });
    const n = rows[0];
    if (!n) return null;
    return {
      id: n.SMS_Number_ID,
      label: n.Number_Title,
      number: n.SMS_Number ?? null,
      senderLabel: n.Sender_Label ?? null,
      congregationId: n.Congregation_ID ?? null,
      costPerSegment: n.Cost_Per_Segment ?? null,
      isDefault: Boolean(n.Default),
      complianceLevelId: n.Texting_Compliance_Level ?? null,
    };
  }

  /** Live, online campuses (no End_Date, Available_Online) for the campus picker. */
  public async listCongregations(): Promise<SelectOption[]> {
    await this.gate('Congregations', 'read');
    const rows = await this.mp!.getTableRecords<{ Congregation_ID: number; Congregation_Name: string }>({
      table: 'Congregations',
      select: 'Congregation_ID, Congregation_Name',
      filter: 'End_Date IS NULL AND Available_Online = 1',
      orderBy: 'Online_Sort_Order, Congregation_Name',
      top: 200,
    });
    return rows.map((r) => ({ id: r.Congregation_ID, label: r.Congregation_Name }));
  }

  public async listAudiences(): Promise<SelectOption[]> {
    await this.gate('Audiences', 'read');
    const rows = await this.mp!.getTableRecords<{ Audience_ID: number; Audience_Name: string }>({
      table: 'Audiences',
      select: 'Audience_ID, Audience_Name',
      filter: 'Active = 1',
      orderBy: 'Audience_Name',
    });
    return rows.map((r) => ({ id: r.Audience_ID, label: r.Audience_Name }));
  }

  public async listPublications(): Promise<SelectOption[]> {
    await this.gate('dp_Publications', 'read');
    const rows = await this.mp!.getTableRecords<{ Publication_ID: number; Title: string }>({
      table: 'dp_Publications',
      select: 'Publication_ID, Title',
      orderBy: 'Title',
      top: 200,
    });
    return rows.map((r) => ({ id: r.Publication_ID, label: r.Title }));
  }

  /**
   * The dp_Communication_Types row for texts, resolved by name and cached. Falls back
   * to `TEXT_COMMUNICATION_TYPE_FALLBACK_ID` when the lookup fails or finds nothing.
   */
  public async getTextCommunicationTypeId(): Promise<number> {
    await this.gate('dp_Communication_Types', 'read');
    if (this.textTypeId) return this.textTypeId;
    try {
      const rows = await this.mp!.getTableRecords<{ Communication_Type_ID: number; Communication_Type: string }>({
        table: 'dp_Communication_Types',
        select: 'Communication_Type_ID, Communication_Type',
        filter: "Communication_Type LIKE 'Text%' OR Communication_Type LIKE 'SMS%'",
        orderBy: 'Communication_Type_ID',
        top: 1,
      });
      this.textTypeId = rows[0]?.Communication_Type_ID ?? TEXT_COMMUNICATION_TYPE_FALLBACK_ID;
    } catch {
      this.textTypeId = TEXT_COMMUNICATION_TYPE_FALLBACK_ID;
    }
    return this.textTypeId;
  }

  // =====================================================================
  // Recipient resolution
  // =====================================================================

  public async getContactIdsForAudience(audienceId: number): Promise<number[]> {
    await this.gate('Audience_Members', 'read');
    const rows = await this.getAllRecords<{ Contact_ID: number }>({
      table: 'Audience_Members',
      select: 'Contact_ID',
      filter: `Audience_ID = ${validatePositiveInt(audienceId)} AND Active = 1 AND (End_Date IS NULL OR End_Date > GETDATE())`,
      orderBy: 'Contact_ID',
    });
    return rows.map((r) => r.Contact_ID);
  }

  /**
   * Messaging views on `pageId`: every sub-page view flagged `Messaging_View` whose
   * sub page hangs off that page, shared or owned by `userId`. Read through FK traversal
   * from dp_Sub_Page_Views, because dp_Sub_Pages and dp_Pages are not readable by the
   * API user directly. The sub page's Target Page supplies the child table and its
   * Contact_ID mapping; the Parent Page's primary key names the child column that
   * links back to the launching records (MP infers the same FK).
   */
  public async listMessagingViews(pageId: number): Promise<MessagingViewDefinition[]> {
    const userId = await this.gate('dp_Sub_Page_Views', 'read');
    const rows = await this.getAllRecords<MessagingViewRow>({
      table: 'dp_Sub_Page_Views',
      select: [
        'dp_Sub_Page_Views.Sub_Page_View_ID',
        'dp_Sub_Page_Views.View_Title',
        'dp_Sub_Page_Views.View_Clause',
        'Sub_Page_ID_TABLE.Display_Name AS Sub_Page_Name',
        'Sub_Page_ID_TABLE.View_Order',
        'Sub_Page_ID_TABLE_Target_Page_ID_TABLE.Table_Name',
        'Sub_Page_ID_TABLE_Target_Page_ID_TABLE.Primary_Key',
        'Sub_Page_ID_TABLE_Target_Page_ID_TABLE.Contact_ID_Field',
        'Sub_Page_ID_TABLE_Parent_Page_ID_TABLE.Primary_Key AS Parent_Primary_Key',
      ].join(', '),
      filter:
        `dp_Sub_Page_Views.Messaging_View = 1 AND Sub_Page_ID_TABLE.Parent_Page_ID = ${validatePositiveInt(pageId)}` +
        ` AND (dp_Sub_Page_Views.User_ID IS NULL OR dp_Sub_Page_Views.User_ID = ${validatePositiveInt(userId)})`,
      orderBy: 'Sub_Page_ID_TABLE.View_Order, Sub_Page_ID_TABLE.Display_Name, dp_Sub_Page_Views.View_Title',
    });
    return rows
      .filter((r) => r.Table_Name && r.Primary_Key && r.Contact_ID_Field && r.Parent_Primary_Key)
      .map((r) => ({
        id: r.Sub_Page_View_ID,
        viewTitle: r.View_Title,
        subPageName: r.Sub_Page_Name ?? '',
        label: r.Sub_Page_Name ? `${r.Sub_Page_Name}: ${r.View_Title}` : r.View_Title,
        tableName: r.Table_Name!,
        primaryKey: r.Primary_Key!,
        contactIdField: r.Contact_ID_Field!,
        parentKey: r.Parent_Primary_Key!,
        viewClause: (r.View_Clause ?? '').trim(),
      }));
  }

  /**
   * Contacts a messaging view yields for the given parent records: rows of the view's
   * table whose link column is in `parentRecordIds` and that satisfy the view clause.
   * `domainNowSql` (MP wall-clock "YYYY-MM-DD HH:MM:SS") stands in for `dp_DomainTime`,
   * which the table API does not understand.
   */
  public async getMessagingViewContacts(
    view: MessagingViewDefinition,
    parentRecordIds: number[],
    domainNowSql: string
  ): Promise<number[]> {
    validateColumnName(view.tableName);
    await this.gate(view.tableName, 'read');
    validateColumnName(view.parentKey);
    view.contactIdField.split('.').forEach(validateColumnName);
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(domainNowSql)) {
      throw new Error('Invalid domain time');
    }
    const unique = [...new Set(parentRecordIds.map((id) => Math.trunc(id)).filter((id) => id > 0))];
    const clause = view.viewClause.replace(/\bdp_DomainTime\b/gi, `'${domainNowSql}'`);
    const contactIds = new Set<number>();
    for (let i = 0; i < unique.length; i += MP_FETCH_BATCH_SIZE) {
      const batch = unique.slice(i, i + MP_FETCH_BATCH_SIZE);
      const scope = `${view.tableName}.${view.parentKey} IN (${this.inList(batch)})`;
      const rows = await this.getAllRecords<{ Contact_ID: number | null }>({
        table: view.tableName,
        select: `${view.contactIdField} AS Contact_ID`,
        filter: clause ? `${scope} AND (${clause})` : scope,
        orderBy: `${view.contactIdField}`,
        distinct: true,
      });
      for (const row of rows) {
        if (typeof row.Contact_ID === 'number' && row.Contact_ID > 0) contactIds.add(row.Contact_ID);
      }
    }
    return [...contactIds];
  }

  public async getContactIdsForPublication(publicationId: number): Promise<number[]> {
    await this.gate('dp_Contact_Publications', 'read');
    const rows = await this.getAllRecords<{ Contact_ID: number }>({
      table: 'dp_Contact_Publications',
      select: 'Contact_ID',
      filter: `Publication_ID = ${validatePositiveInt(publicationId)} AND Unsubscribed = 0`,
      orderBy: 'Contact_ID',
    });
    return rows.map((r) => r.Contact_ID);
  }

  /**
   * Resolves a selection to contacts the way MP's own New Message tool does: the
   * stock proc `api_Tools_GetSelectedContacts` applies the page's messaging view (or
   * its Contact_ID column mapping) and returns one row per reachable contact. Extra
   * `selectFields` (page merge tags) come back as columns on each row.
   *
   * Returns null when the proc is unavailable to the API user or returns no usable
   * result set, so callers can fall back to the page's Contact_ID_Field mapping.
   */
  public async getSelectedContacts(
    selectionId: number,
    selectFields: string[] = []
  ): Promise<Array<Record<string, unknown> & { Contact_ID: number }> | null> {
    await this.gate('Contacts', 'read');
    const fields = ['Contact_ID', ...selectFields.filter((f) => /^[A-Za-z0-9_]+$/.test(f) && f !== 'Contact_ID')];
    try {
      const result = await this.mp!.executeProcedureWithBody('api_Tools_GetSelectedContacts', {
        '@SelectionId': validatePositiveInt(selectionId),
        '@SelectFields': fields.join(','),
      });
      for (const resultSet of result ?? []) {
        if (!Array.isArray(resultSet)) continue;
        if (resultSet.length === 0) return [];
        const first = resultSet[0];
        if (first && typeof first === 'object' && 'Contact_ID' in first) {
          return (resultSet as Array<Record<string, unknown> & { Contact_ID: number }>).filter(
            (r) => typeof r.Contact_ID === 'number' && r.Contact_ID > 0
          );
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Page-specific merge tags from MP's stock `api_Tools_GetMergeTags`. The proc's
   * result shape is not documented, so any string column that looks like a column
   * name is accepted. Returns [] when the proc is unavailable.
   */
  public async getMergeTagsForPage(pageId: number): Promise<string[]> {
    await this.gate('dp_Pages', 'read');
    try {
      const result = await this.mp!.executeProcedureWithBody('api_Tools_GetMergeTags', {
        '@PageId': validatePositiveInt(pageId),
      });
      const tags = new Set<string>();
      for (const resultSet of result ?? []) {
        if (!Array.isArray(resultSet)) continue;
        for (const row of resultSet) {
          if (!row || typeof row !== 'object') continue;
          for (const value of Object.values(row as Record<string, unknown>)) {
            if (typeof value === 'string') {
              const cleaned = value.trim().replace(/^\[|\]$/g, '');
              if (/^[A-Za-z][A-Za-z0-9_]*$/.test(cleaned)) tags.add(cleaned);
            }
          }
        }
      }
      return [...tags];
    } catch {
      return [];
    }
  }

  /**
   * Reads texting eligibility plus the standard merge columns for a set of contacts,
   * batched to respect the MP `IN (...)` URL limit. Callers decide what to exclude.
   */
  public async getTextableContacts(contactIds: number[]): Promise<TextableContactRow[]> {
    await this.gate('Contacts', 'read');
    const unique = [...new Set(contactIds.map((id) => Math.trunc(id)).filter((id) => id > 0))];
    const rows: TextableContactRow[] = [];
    for (let i = 0; i < unique.length; i += MP_FETCH_BATCH_SIZE) {
      const batch = unique.slice(i, i + MP_FETCH_BATCH_SIZE);
      const page = await this.mp!.getTableRecords<TextableContactRow>({
        table: 'Contacts',
        select: STANDARD_MERGE_CONTACT_SELECT,
        filter: `Contacts.Contact_ID IN (${this.inList(batch)})`,
      });
      rows.push(...page);
    }
    return rows;
  }

  // =====================================================================
  // Writes
  // =====================================================================

  /** Inserts the dp_Communications row and returns its Communication_ID. */
  /**
   * Creates the Draft communication. `Author_User_ID` is stamped here from the gate,
   * never taken from the caller (rule 13).
   */
  public async createCommunication(row: Omit<TextCommunicationInsert, 'Author_User_ID'>): Promise<number> {
    const $userId = await this.gate('dp_Communications', 'create');
    const insert: TextCommunicationInsert = { ...row, Author_User_ID: $userId };
    const created = await this.mp!.createTableRecords<Record<string, unknown>>(
      'dp_Communications',
      [insert as unknown as Record<string, unknown>],
      {
        schema: textCommunicationInsertSchema,
        $select: 'Communication_ID',
        $userId,
      }
    );
    const id = (created[0] as { Communication_ID?: number } | undefined)?.Communication_ID;
    if (!id) throw new Error('Ministry Platform did not return a Communication_ID.');
    return id;
  }

  /** Attaches an image to the communication so the platform sends it as MMS media. */
  public async attachFile(communicationId: number, file: File): Promise<number | null> {
    const userId = await this.gate('dp_Communications', 'update');
    const uploaded = await this.mp!.uploadFiles({
      table: 'dp_Communications',
      recordId: validatePositiveInt(communicationId),
      files: [file],
      uploadParams: { userId, description: 'Text message attachment' },
    });
    return uploaded[0]?.FileId ?? null;
  }

  /** Inserts message rows (single POST). Callers chunk well below the MP per-call cap. */
  public async createMessages(rows: TextMessageInsert[]): Promise<number> {
    const $userId = await this.gate('dp_Communication_Messages', 'create');
    if (rows.length === 0) return 0;
    if (rows.length > MP_MAX_PAGE_SIZE) {
      throw new Error(
        `createMessages received ${rows.length} rows; the MP API accepts at most ${MP_MAX_PAGE_SIZE} per call. Chunk the send.`
      );
    }
    const created = await this.mp!.createTableRecords(
      'dp_Communication_Messages',
      rows as unknown as Record<string, unknown>[],
      { schema: textMessageInsertSchema, $userId }
    );
    return created.length;
  }

  /** Moves the communication between Draft, In Review, and Ready to Send. */
  public async setCommunicationStatus(communicationId: number, statusId: number): Promise<void> {
    const $userId = await this.gate('dp_Communications', 'update');
    await this.mp!.updateTableRecords(
      'dp_Communications',
      [
        {
          Communication_ID: validatePositiveInt(communicationId),
          Communication_Status_ID: validatePositiveInt(statusId),
        },
      ],
      { $userId }
    );
  }
}
