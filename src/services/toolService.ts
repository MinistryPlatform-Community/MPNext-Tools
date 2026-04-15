import { MPHelper } from "@/lib/providers/ministry-platform";
import { PageData } from "@/lib/tool-params";

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
    this.initialize();
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
    console.log('ToolService.getPageData - Called with pageID:', pageID);
    
    try {
      // Execute stored procedure to get page data
      // DomainID is automatically injected by MP API
      const result = await this.mp!.executeProcedureWithBody('api_Tools_GetPageData', {
        "@PageID": pageID
      });
      
      console.log('ToolService.getPageData - Procedure result:', result);
      
      // The result is an array of result sets, we want the first result set
      if (result && result.length > 0 && result[0].length > 0) {
        const pageData = result[0][0] as PageData;
        
        console.log('ToolService.getPageData - Found page data:', pageData);
        return pageData;
      }
      
      console.log('ToolService.getPageData - No page data found for pageID:', pageID);
      return null;
    } catch (error) {
      console.error('ToolService.getPageData - Error:', error);
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
    console.log('ToolService.getSelectionRecordIds - Called with selectionId:', selectionId, 'userId:', userId, 'pageId:', pageId);

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
            console.log('ToolService.getSelectionRecordIds - Found record IDs:', recordIds);
            return recordIds;
          }
        }
      }

      console.log('ToolService.getSelectionRecordIds - No records found for selection:', selectionId);
      return [];
    } catch (error) {
      console.error('ToolService.getSelectionRecordIds - Error:', error);
      throw error;
    }
  }

  /**
   * Retrieves the tool paths for a user based on their roles
   * 
   * @param domainId - The Ministry Platform Domain ID
   * @param userId - The Ministry Platform User ID
   * @returns Promise<string[]> - Array of tool paths
   */
  public async getUserTools(userId: number): Promise<string[]> {
    console.log('ToolService.getUserTools - Called with userId:', userId);

    try {
      const result = await this.mp!.executeProcedureWithBody('api_Tools_GetUserTools', {
        "@UserId": userId
      });
      
      console.log('ToolService.getUserTools - Procedure result:', result);
      
      if (result && result.length > 0 && result[0].length > 0) {
        const toolPaths = (result[0] as Array<{ Tool_Path: string }>).map((row) => row.Tool_Path);
        console.log('ToolService.getUserTools - Found tool paths:', toolPaths);
        return toolPaths;
      }
      
      console.log('ToolService.getUserTools - No tools found for userId:', userId);
      return [];
    } catch (error) {
      console.error('ToolService.getUserTools - Error:', error);
      throw error;
    }
  }
}
