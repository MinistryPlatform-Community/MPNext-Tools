import { MPHelper } from "@/lib/providers/ministry-platform";
import { PageData } from "@/lib/tool-params";
import { validatePositiveInt, validateColumnName } from "@/lib/validation";

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
   * Calls the api_CloudTools_GetSelection stored procedure.
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

  private static readonly BATCH_SIZE = 100;

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

    for (let i = 0; i < recordIds.length; i += ToolService.BATCH_SIZE) {
      const batch = recordIds.slice(i, i + ToolService.BATCH_SIZE);
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
