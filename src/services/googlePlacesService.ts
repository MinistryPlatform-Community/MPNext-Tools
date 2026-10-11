import "server-only";
import { MPHelper } from "@/lib/providers/ministry-platform";
import { AuthorizationService } from "@/services/authorizationService";
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
   * Never call this without `requireAccess()` first: the cache is process-wide,
   * so the gate must run on every call, not only on a cache miss.
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

  /**
   * Authorization gate for every public method (CLAUDE.md rule 12).
   *
   * The key comes from an MP read of `dp_Configuration_Settings`, and once
   * resolved it is cached on this process-wide singleton. Gating only the
   * cache-miss path would let an unauthorized caller use a key an authorized
   * caller had already loaded, so each public method gates before touching
   * either the MP read or the cached key/provider. It runs outside
   * `resolveApiKey`'s try/catch so a refusal is never swallowed into the
   * env-var fallback.
   */
  private async requireAccess(): Promise<void> {
    await AuthorizationService.getInstance().requireSecurityRole({
      table: "dp_Configuration_Settings",
      operation: "read",
    });
  }

  public async isEnabled(): Promise<boolean> {
    await this.requireAccess();
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
    await this.requireAccess();
    const provider = await this.getProvider();
    return provider.autocomplete(input, sessionToken);
  }

  async getPlaceDetails(placeId: string, sessionToken: string): Promise<PlaceDetails> {
    await this.requireAccess();
    const provider = await this.getProvider();
    return provider.getPlaceDetails(placeId, sessionToken);
  }
}
