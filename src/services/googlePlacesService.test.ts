import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockGetTableRecords } = vi.hoisted(() => ({
  mockGetTableRecords: vi.fn(),
}));

vi.mock("@/lib/providers/ministry-platform", () => ({
  MPHelper: class {
    getTableRecords = mockGetTableRecords;
  },
}));

const { mockAutocomplete, mockGetPlaceDetails, MockGooglePlacesProvider } = vi.hoisted(() => {
  const mockAutocomplete = vi.fn();
  const mockGetPlaceDetails = vi.fn();
  class MockGooglePlacesProvider {
    apiKey: string;
    constructor(apiKey: string) {
      this.apiKey = apiKey;
    }
    autocomplete = mockAutocomplete;
    getPlaceDetails = mockGetPlaceDetails;
  }
  return { mockAutocomplete, mockGetPlaceDetails, MockGooglePlacesProvider };
});

vi.mock("@/lib/providers/google-places", () => ({
  GooglePlacesProvider: MockGooglePlacesProvider,
}));

import { GooglePlacesService } from "./googlePlacesService";

describe("GooglePlacesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
     
    (GooglePlacesService as any).instance = undefined;
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is a singleton", async () => {
    const instance1 = await GooglePlacesService.getInstance();
    const instance2 = await GooglePlacesService.getInstance();
    expect(instance1).toBe(instance2);
  });

  describe("resolveApiKey / isEnabled", () => {
    it("resolves the key from MP configuration settings", async () => {
      mockGetTableRecords.mockResolvedValueOnce([{ Value: "mp-key-123" }]);
      const service = await GooglePlacesService.getInstance();
      expect(await service.isEnabled()).toBe(true);
      expect(mockGetTableRecords).toHaveBeenCalledWith(
        expect.objectContaining({
          table: "dp_Configuration_Settings",
          filter: "Application_Code='COMMON' AND Key_Name='GoogleMapsAPIKey'",
        }),
      );
    });

    it("caches the resolved key so MP is queried only once", async () => {
      mockGetTableRecords.mockResolvedValueOnce([{ Value: "mp-key-123" }]);
      const service = await GooglePlacesService.getInstance();
      await service.isEnabled();
      await service.isEnabled();
      expect(mockGetTableRecords).toHaveBeenCalledTimes(1);
    });

    it("falls back to the env var when MP has no value", async () => {
      vi.stubEnv("GOOGLE_PLACES_API_KEY", "env-key-456");
      mockGetTableRecords.mockResolvedValueOnce([{ Value: null }]);
      const service = await GooglePlacesService.getInstance();
      expect(await service.isEnabled()).toBe(true);
    });

    it("falls back to the env var when MP row Value is blank/whitespace", async () => {
      vi.stubEnv("GOOGLE_PLACES_API_KEY", "env-key-456");
      mockGetTableRecords.mockResolvedValueOnce([{ Value: "   " }]);
      const service = await GooglePlacesService.getInstance();
      expect(await service.isEnabled()).toBe(true);
    });

    it("falls back to the env var when MP returns no rows", async () => {
      vi.stubEnv("GOOGLE_PLACES_API_KEY", "env-key-456");
      mockGetTableRecords.mockResolvedValueOnce([]);
      const service = await GooglePlacesService.getInstance();
      expect(await service.isEnabled()).toBe(true);
    });

    it("falls back to the env var when the MP lookup throws", async () => {
      vi.stubEnv("GOOGLE_PLACES_API_KEY", "env-key-456");
      mockGetTableRecords.mockRejectedValueOnce(new Error("table permission denied"));
      const service = await GooglePlacesService.getInstance();
      expect(await service.isEnabled()).toBe(true);
    });

    it("resolves to disabled (null) when neither MP nor env provide a key", async () => {
      mockGetTableRecords.mockResolvedValueOnce([]);
      const service = await GooglePlacesService.getInstance();
      expect(await service.isEnabled()).toBe(false);
    });

    it("treats a blank env var as disabled", async () => {
      vi.stubEnv("GOOGLE_PLACES_API_KEY", "   ");
      mockGetTableRecords.mockResolvedValueOnce([]);
      const service = await GooglePlacesService.getInstance();
      expect(await service.isEnabled()).toBe(false);
    });
  });

  describe("getProvider / autocomplete / getPlaceDetails", () => {
    it("throws a descriptive error when no key is configured", async () => {
      mockGetTableRecords.mockResolvedValueOnce([]);
      const service = await GooglePlacesService.getInstance();
      await expect(service.autocomplete("123 Main", "token")).rejects.toThrow(
        "Google Places API key is not configured",
      );
    });

    it("creates the provider once and reuses it across calls", async () => {
      mockGetTableRecords.mockResolvedValueOnce([{ Value: "mp-key-123" }]);
      mockAutocomplete.mockResolvedValue([]);
      mockGetPlaceDetails.mockResolvedValue({
        placeId: "p1",
        formattedAddress: "",
        addressLine1: "",
        city: "",
        state: "",
        postalCode: "",
        countryCode: "",
      });

      const service = await GooglePlacesService.getInstance();
      await service.autocomplete("123 Main", "token-1");
      await service.getPlaceDetails("p1", "token-1");

      expect(mockAutocomplete).toHaveBeenCalledWith("123 Main", "token-1");
      expect(mockGetPlaceDetails).toHaveBeenCalledWith("p1", "token-1");
      // Only resolved once thanks to caching of both the key and the provider.
      expect(mockGetTableRecords).toHaveBeenCalledTimes(1);
    });
  });
});
