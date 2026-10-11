import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockGetTableRecords } = vi.hoisted(() => ({
  mockGetTableRecords: vi.fn(),
}));

const { mockRequireSecurityRole } = vi.hoisted(() => ({
  mockRequireSecurityRole: vi.fn(async () => 42),
}));

vi.mock("@/services/authorizationService", () => ({
  AuthorizationService: {
    getInstance: () => ({
      requireSecurityRole: mockRequireSecurityRole,
    }),
  },
  UnauthorizedError: class UnauthorizedError extends Error {},
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
import { UnauthorizedError } from "@/services/authorizationService";

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

  describe("authorization gate", () => {
    const configGate = { table: "dp_Configuration_Settings", operation: "read" };
    const details = {
      placeId: "p1",
      formattedAddress: "",
      addressLine1: "",
      city: "",
      state: "",
      postalCode: "",
      countryCode: "",
    };

    it("gates every public method on dp_Configuration_Settings read", async () => {
      mockGetTableRecords.mockResolvedValueOnce([{ Value: "mp-key-123" }]);
      mockAutocomplete.mockResolvedValue([]);
      mockGetPlaceDetails.mockResolvedValue(details);
      const service = await GooglePlacesService.getInstance();

      await service.isEnabled();
      await service.autocomplete("123 Main", "t");
      await service.getPlaceDetails("p1", "t");

      expect(mockRequireSecurityRole).toHaveBeenCalledTimes(3);
      for (const call of mockRequireSecurityRole.mock.calls) {
        expect(call).toEqual([configGate]);
      }
    });

    it.each([
      ["isEnabled", (s: GooglePlacesService) => s.isEnabled()],
      ["autocomplete", (s: GooglePlacesService) => s.autocomplete("123 Main", "t")],
      ["getPlaceDetails", (s: GooglePlacesService) => s.getPlaceDetails("p1", "t")],
    ])("%s: a denied gate throws and makes no MP or Google call", async (_name, call) => {
      vi.stubEnv("GOOGLE_PLACES_API_KEY", "env-key-456");
      mockRequireSecurityRole.mockRejectedValueOnce(new UnauthorizedError("denied"));
      const service = await GooglePlacesService.getInstance();

      await expect(call(service)).rejects.toBeInstanceOf(UnauthorizedError);
      expect(mockGetTableRecords).not.toHaveBeenCalled();
      expect(mockAutocomplete).not.toHaveBeenCalled();
      expect(mockGetPlaceDetails).not.toHaveBeenCalled();
    });

    it.each([
      ["isEnabled", (s: GooglePlacesService) => s.isEnabled()],
      ["autocomplete", (s: GooglePlacesService) => s.autocomplete("123 Main", "t")],
      ["getPlaceDetails", (s: GooglePlacesService) => s.getPlaceDetails("p1", "t")],
    ])(
      "%s: a denied gate throws even when an authorized caller already cached the key",
      async (_name, call) => {
        mockGetTableRecords.mockResolvedValueOnce([{ Value: "mp-key-123" }]);
        mockAutocomplete.mockResolvedValue([]);
        mockGetPlaceDetails.mockResolvedValue(details);
        const service = await GooglePlacesService.getInstance();
        // Authorized caller warms both the key and the provider cache.
        await service.autocomplete("warm", "t0");
        mockGetTableRecords.mockClear();
        mockAutocomplete.mockClear();
        mockGetPlaceDetails.mockClear();

        mockRequireSecurityRole.mockRejectedValueOnce(new UnauthorizedError("denied"));
        await expect(call(service)).rejects.toBeInstanceOf(UnauthorizedError);
        expect(mockGetTableRecords).not.toHaveBeenCalled();
        expect(mockAutocomplete).not.toHaveBeenCalled();
        expect(mockGetPlaceDetails).not.toHaveBeenCalled();
      },
    );
  });
});
