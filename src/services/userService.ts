import "server-only";
import { MPUserProfile } from "@/lib/providers/ministry-platform/types";
import { MPHelper } from "@/lib/providers/ministry-platform";
import { validateGuid } from "@/lib/validation";

/**
 * UserService - Singleton service for managing user-related operations
 * 
 * This service provides methods to interact with user data from Ministry Platform,
 * including retrieving user profiles and related contact information.
 */
export class UserService {
  private static instance: UserService;
  private mp: MPHelper | null = null;

  /**
   * Private constructor to enforce singleton pattern
   * Initializes the service when instantiated
   */
  private constructor() {
    // Initialization is handled by getInstance()
  }

  /**
   * Gets the singleton instance of UserService
   * Creates a new instance if one doesn't exist and ensures it's properly initialized
   * 
   * @returns Promise<UserService> - The initialized UserService instance
   */
  public static async getInstance(): Promise<UserService> {
    if (!UserService.instance) {
      UserService.instance = new UserService();
      await UserService.instance.initialize();
    }
    return UserService.instance;
  }

  /**
   * Initializes the UserService by creating a new MPHelper instance
   * This method sets up the Ministry Platform connection helper
   * 
   * @returns Promise<void>
   */
  private async initialize(): Promise<void> {
    this.mp = new MPHelper();
  }

  /**
   * Retrieves the profile shown to the signed-in user, by User GUID.
   *
   * Returns only the fields the UI renders (see `MPUserProfile`): names and
   * email. The row is mapped explicitly so nothing else the query returns can
   * reach the client.
   *
   * @param id - The User GUID to search for
   * @returns Promise<MPUserProfile | undefined> - The profile, or undefined if no such user
   * @throws Will throw an error if the Ministry Platform query fails
   */
  public async getUserProfile(id: string): Promise<MPUserProfile | undefined> {
    const records = await this.mp!.getTableRecords<MPUserProfile>({
      table: "dp_Users",
      filter: `User_GUID = '${validateGuid(id)}'`,
      select: "Contact_ID_TABLE.First_Name,Contact_ID_TABLE.Nickname,Contact_ID_TABLE.Last_Name,Contact_ID_TABLE.Email_Address",
      top: 1
    });

    const row = records[0];
    if (!row) return undefined;

    return {
      First_Name: row.First_Name,
      Nickname: row.Nickname,
      Last_Name: row.Last_Name,
      Email_Address: row.Email_Address ?? null,
    };
  }
}
