import "server-only";
import { MPHelper } from "@/lib/providers/ministry-platform";
import { GooglePlacesProvider } from "@/lib/providers/google-places";
import type { PlacePrediction, PlaceDetails } from "@/lib/providers/google-places";

export class GooglePlacesService {
  private static instance: GooglePlacesService;
  private mp: MPHelper | null = null;
  private provider: GooglePlacesProvider | null = null;
  // undefined = not yet resolved; null = resolved with no key (feature disabled)
  private resolvedKey: string | null | undefined = undefined;

  private constructor() {}

  public static async getInstance(): Promise<GooglePlacesService> {
    if (!GooglePlacesService.instance) {
      GooglePlacesService.instance = new GooglePlacesService();
      GooglePlacesService.instance.mp = new MPHelper();
    }
    return GooglePlacesService.instance;
  }

  /**
   * Resolves the Google Places API key with this precedence:
   *   1. MP dp_Configuration_Settings (Application_Code='COMMON', Key_Name='GoogleMapsAPIKey')
   *   2. GOOGLE_PLACES_API_KEY environment variable
   *   3. null (feature disabled)
   *
   * Cached on the singleton so MP is queried at most once per process lifetime.
   */
  private async resolveApiKey(): Promise<string | null> {
    if (this.resolvedKey !== undefined) return this.resolvedKey;

    try {
      const rows = await this.mp!.getTableRecords<{ Value: string | null }>({
        table: "dp_Configuration_Settings",
        select: "Value",
        filter: "Application_Code='COMMON' AND Key_Name='GoogleMapsAPIKey'",
        top: 1,
      });
      const mpKey = rows[0]?.Value?.trim();
      if (mpKey) {
        this.resolvedKey = mpKey;
        return this.resolvedKey;
      }
    } catch {
      // Swallow lookup failures (e.g. table permissions) and fall through to env var.
    }

    const envKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
    this.resolvedKey = envKey ? envKey : null;
    return this.resolvedKey;
  }

  public async isEnabled(): Promise<boolean> {
    return (await this.resolveApiKey()) !== null;
  }

  private async getProvider(): Promise<GooglePlacesProvider> {
    if (this.provider) return this.provider;
    const apiKey = await this.resolveApiKey();
    if (!apiKey) {
      throw new Error(
        "Google Places API key is not configured. Set the 'GoogleMapsAPIKey' setting in MinistryPlatform (Application_Code='COMMON') or define GOOGLE_PLACES_API_KEY in .env.local.",
      );
    }
    this.provider = new GooglePlacesProvider(apiKey);
    return this.provider;
  }

  async autocomplete(input: string, sessionToken: string): Promise<PlacePrediction[]> {
    const provider = await this.getProvider();
    return provider.autocomplete(input, sessionToken);
  }

  async getPlaceDetails(placeId: string, sessionToken: string): Promise<PlaceDetails> {
    const provider = await this.getProvider();
    return provider.getPlaceDetails(placeId, sessionToken);
  }
}
