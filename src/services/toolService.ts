import { MPHelper } from "@/lib/providers/ministry-platform";
import { PageData } from "@/lib/tool-params";
import { validatePositiveInt, validateColumnName } from "@/lib/validation";
import { MP_FETCH_BATCH_SIZE } from "@/lib/constants";

export interface ContactRecord {
  recordId: number;
  contactId: number;
}

export interface ContactRecordResult {
  tableName: string;
  primaryKey: string;
  contactIdField: string;
  records: ContactRecord[];
}

export interface PageLookup {
  Page_ID: number;
  Display_Name: string;
  Table_Name: string;
}

export interface RoleLookup {
  Role_ID: number;
  Role_Name: string;
}

export interface DeployToolInput {
  toolName: string;
  launchPage: string;
  description?: string;
  launchWithCredentials: boolean;
  launchWithParameters: boolean;
  launchInNewTab: boolean;
  showOnMobile: boolean;
  pageIds: number[];
  additionalData?: string;
  roleIds: number[];
}

export interface DeployedToolRow {
  Tool_ID: number;
  Tool_Name: string;
  Description: string | null;
  Launch_Page: string;
  Launch_with_Credentials: boolean;
  Launch_with_Parameters: boolean;
  Launch_in_New_Tab: boolean;
  Show_On_Mobile: boolean;
}

export interface DeployedToolPageRow {
  Tool_Page_ID: number;
  Tool_ID: number;
  Page_ID: number;
  Page_Name: string | null;
  Additional_Data: string | null;
}

export interface DeployedToolRoleRow {
  Role_Tool_ID: number;
  Tool_ID: number;
  Role_ID: number;
  Role_Name: string | null;
  Domain_ID: number;
}

export interface DeployToolResult {
  tool: DeployedToolRow;
  pages: DeployedToolPageRow[];
  roles: DeployedToolRoleRow[];
}

/**
 * ToolService - Singleton service for managing tool-related operations
 * 
 * This service provides methods to interact with Ministry Platform tools and pages,
 * including retrieving page metadata and table information based on page IDs.
 * Uses the singleton pattern to ensure a single instance across the application.
 */
export class ToolService {
  private static instance: ToolService;
  private mp: MPHelper | null = null;

  /**
   * Private constructor to enforce singleton pattern
   * Initializes the service when instantiated
   */
  private constructor() {
    // Initialization is handled by getInstance()
  }

  /**
   * Gets the singleton instance of ToolService
   * Creates a new instance if one doesn't exist and ensures it's properly initialized
   * 
   * @returns Promise<ToolService> - The initialized ToolService instance
   */
  public static async getInstance(): Promise<ToolService> {
    if (!ToolService.instance) {
      ToolService.instance = new ToolService();
      await ToolService.instance.initialize();
    }
    return ToolService.instance;
  }

  /**
   * Initializes the ToolService by creating a new MPHelper instance
   * This method sets up the Ministry Platform connection helper
   * 
   * @returns Promise<void>
   */
  private async initialize(): Promise<void> {
    this.mp = new MPHelper();
  }

  /**
   * Retrieves the page data associated with a given Ministry Platform page ID
   * 
   * @param pageID - The Ministry Platform Page ID
   * @returns Promise<PageData | null> - The page data or null if not found
   */
  public async getPageData(pageID: number): Promise<PageData | null> {
    try {
      // Execute stored procedure to get page data
      // DomainID is automatically injected by MP API
      const result = await this.mp!.executeProcedureWithBody('api_Tools_GetPageData', {
        "@PageID": pageID
      });

      // The result is an array of result sets, we want the first result set
      if (result && result.length > 0 && result[0].length > 0) {
        const pageData = result[0][0] as PageData;
        return pageData;
      }

      return null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Retrieves the record IDs from a Ministry Platform selection.
   * Calls the api_Common_GetSelection stored procedure.
   *
   * @param selectionId - The Selection ID
   * @param userId - The Ministry Platform User ID
   * @param pageId - The Ministry Platform Page ID
   * @returns Promise<number[]> - Array of Record_IDs from the selection
   */
  public async getSelectionRecordIds(selectionId: number, userId: number, pageId: number): Promise<number[]> {
    try {
      const result = await this.mp!.executeProcedureWithBody('api_Common_GetSelection', {
        '@SelectionID': selectionId,
        '@UserID': userId,
        '@PageID': pageId,
      });

      // Find the result set containing Record_ID
      if (result && result.length > 0) {
        for (const resultSet of result) {
          if (Array.isArray(resultSet) && resultSet.length > 0 && typeof resultSet[0] === 'object' && resultSet[0] !== null && 'Record_ID' in resultSet[0]) {
            const recordIds = (resultSet as Array<{ Record_ID: number }>).map((r) => r.Record_ID);
            return recordIds;
          }
        }
      }

      return [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Retrieves the tool paths for a user based on their roles.
   * Domain ID is automatically injected by the MP API.
   *
   * @param userId - The Ministry Platform User ID
   * @returns Promise<string[]> - Array of tool paths
   */
  public async getUserTools(userId: number): Promise<string[]> {
    try {
      const result = await this.mp!.executeProcedureWithBody('api_Tools_GetUserTools', {
        "@UserId": userId
      });

      if (result && result.length > 0 && result[0].length > 0) {
        const toolPaths = (result[0] as Array<{ Tool_Path: string }>).map((row) => row.Tool_Path);
        return toolPaths;
      }

      return [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Lists MP pages (dp_Pages) for the deploy-tool picker. Reuses
   * `api_MPNextTools_GetPages` (the same SP the field-management feature
   * uses) — the SP has no search parameter, so we filter in-memory on
   * Display_Name / Table_Name and cap at 100 rows.
   */
  public async listPages(search?: string): Promise<PageLookup[]> {
    const result = await this.mp!.executeProcedureWithBody('api_MPNextTools_GetPages', {});
    const rows = (result?.[0] as PageLookup[] | undefined) ?? [];

    const term = search?.trim().toLowerCase();
    const filtered = term
      ? rows.filter(
          (r) =>
            r.Display_Name?.toLowerCase().includes(term) ||
            r.Table_Name?.toLowerCase().includes(term)
        )
      : rows;

    return filtered.slice(0, 100);
  }

  /**
   * Lists MP roles (dp_Roles) for the deploy-tool picker. Uses the default
   * credential pipeline — the MP API exposes dp_Roles directly to apiuser.
   */
  public async listRoles(search?: string): Promise<RoleLookup[]> {
    const term = search?.trim();
    const filter = term
      ? `Role_Name LIKE '%${term.replace(/'/g, "''")}%'`
      : undefined;

    return this.mp!.getTableRecords<RoleLookup>({
      table: 'dp_Roles',
      select: 'Role_ID, Role_Name',
      filter,
      orderBy: 'Role_Name',
      top: 100,
    });
  }

  /**
   * Deploys a tool via `api_dev_DeployTool`. Because the procedure name starts with
   * `api_dev_`, the MP provider automatically uses the MINISTRY_PLATFORM_DEV_* client
   * credentials — this must not be reachable from production. DomainID is auto-injected
   * by the MP API.
   */
  public async deployTool(input: DeployToolInput, userId?: number): Promise<DeployToolResult> {
    if (!input.toolName.trim()) throw new Error('Tool Name is required');
    if (!input.launchPage.trim()) throw new Error('Launch Page is required');
    if (input.toolName.length > 30) throw new Error('Tool Name must be 30 characters or fewer');
    if (input.description && input.description.length > 100) throw new Error('Description must be 100 characters or fewer');
    if (input.launchPage.length > 1024) throw new Error('Launch Page must be 1024 characters or fewer');
    if (input.additionalData && input.additionalData.length > 65) throw new Error('Additional Data must be 65 characters or fewer');

    const payload: Record<string, unknown> = {
      '@ToolName': input.toolName.trim(),
      '@LaunchPage': input.launchPage.trim(),
      '@Description': input.description?.trim() || null,
      '@LaunchWithCredentials': input.launchWithCredentials ? 1 : 0,
      '@LaunchWithParameters': input.launchWithParameters ? 1 : 0,
      '@LaunchInNewTab': input.launchInNewTab ? 1 : 0,
      '@ShowOnMobile': input.showOnMobile ? 1 : 0,
      '@PageIDs': input.pageIds.length ? input.pageIds.join(',') : null,
      '@AdditionalData': input.additionalData?.trim() || null,
      '@RoleIDs': input.roleIds.length ? input.roleIds.join(',') : null,
    };

    const queryParams = userId !== undefined ? { $userId: userId } : undefined;
    const resultSets = await this.mp!.executeProcedureWithBody('api_dev_DeployTool', payload, queryParams);

    const [toolRows, pageRows, roleRows] = resultSets ?? [];
    const tool = (toolRows?.[0] as DeployedToolRow | undefined);
    if (!tool) {
      throw new Error('Deploy did not return a tool row — check stored procedure permissions and dev credentials.');
    }

    return {
      tool,
      pages: (pageRows as DeployedToolPageRow[] | undefined) ?? [],
      roles: (roleRows as DeployedToolRoleRow[] | undefined) ?? [],
    };
  }

  /**
   * Resolves record IDs to their associated Contact IDs by querying the
   * specified table. Supports direct columns and FK traversal paths
   * (e.g. `Participant_ID_Table.Contact_ID`).
   *
   * Short-circuits when the contact ID field IS the primary key (e.g. Contacts table).
   * Batches queries in groups of 100 to avoid oversized IN clauses.
   *
   * @param tableName - The Ministry Platform table to query
   * @param primaryKey - The primary key column of the table
   * @param contactIdField - Column or FK path that resolves to a Contact_ID
   * @param recordIds - Array of primary key values to look up
   * @returns Promise<ContactRecordResult> - Mapped record/contact ID pairs
   */
  public async resolveContactIds(
    tableName: string,
    primaryKey: string,
    contactIdField: string,
    recordIds: number[]
  ): Promise<ContactRecordResult> {
    const envelope = { tableName, primaryKey, contactIdField };

    validateColumnName(primaryKey);
    validateColumnName(tableName);
    if (contactIdField.includes('.')) {
      contactIdField.split('.').forEach(validateColumnName);
    } else {
      validateColumnName(contactIdField);
    }

    if (recordIds.length === 0) {
      return { ...envelope, records: [] };
    }

    if (contactIdField === primaryKey) {
      return {
        ...envelope,
        records: recordIds.map(id => ({ recordId: id, contactId: id })),
      };
    }

    const contactIdResponseKey = contactIdField.includes('.')
      ? contactIdField.split('.').pop()!
      : contactIdField;

    const allRecords: ContactRecord[] = [];

    for (let i = 0; i < recordIds.length; i += MP_FETCH_BATCH_SIZE) {
      const batch = recordIds.slice(i, i + MP_FETCH_BATCH_SIZE);
      batch.forEach(validatePositiveInt);
      const rows = await this.mp!.getTableRecords<Record<string, number>>({
        table: tableName,
        select: `${primaryKey}, ${contactIdField}`,
        filter: `${primaryKey} IN (${batch.join(',')})`,
      });

      for (const row of rows) {
        allRecords.push({
          recordId: row[primaryKey],
          contactId: row[contactIdResponseKey],
        });
      }
    }

    return { ...envelope, records: allRecords };
  }
}
