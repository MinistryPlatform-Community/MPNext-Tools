import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GooglePlacesProvider } from "./provider";

const mockFetch = vi.fn();

describe("GooglePlacesProvider", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("constructor", () => {
    it("throws when apiKey is empty", () => {
      expect(() => new GooglePlacesProvider("")).toThrow(
        "GooglePlacesProvider requires a non-empty API key",
      );
    });

    it("constructs with a non-empty key", () => {
      expect(() => new GooglePlacesProvider("key-123")).not.toThrow();
    });
  });

  describe("autocomplete", () => {
    it("returns [] when trimmed input is shorter than 3 chars", async () => {
      const provider = new GooglePlacesProvider("key-123");
      const result = await provider.autocomplete("  a ", "token-1");
      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("calls the autocomplete endpoint and maps suggestions", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          suggestions: [
            {
              placePrediction: {
                placeId: "place-1",
                text: { text: "123 Main St, Springfield" },
                structuredFormat: {
                  mainText: { text: "123 Main St" },
                  secondaryText: { text: "Springfield" },
                },
              },
            },
            {
              placePrediction: {
                placeId: "place-2",
                text: { text: "456 Oak Ave" },
                // no structuredFormat
              },
            },
            // missing placeId entirely -> filtered out
            { placePrediction: { placeId: "" } },
            {},
          ],
        }),
      });

      const provider = new GooglePlacesProvider("key-123");
      const result = await provider.autocomplete("123 Main", "token-1");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://places.googleapis.com/v1/places:autocomplete",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "X-Goog-Api-Key": "key-123",
          }),
        }),
      );
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body).toEqual({
        input: "123 Main",
        sessionToken: "token-1",
        includedPrimaryTypes: ["street_address", "premise", "subpremise"],
      });

      expect(result).toEqual([
        {
          placeId: "place-1",
          primary: "123 Main St",
          secondary: "Springfield",
          full: "123 Main St, Springfield",
        },
        {
          placeId: "place-2",
          primary: "456 Oak Ave",
          secondary: "",
          full: "456 Oak Ave",
        },
      ]);
    });

    it("returns [] when suggestions is missing entirely", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      const provider = new GooglePlacesProvider("key-123");
      const result = await provider.autocomplete("123 Main", "token-1");
      expect(result).toEqual([]);
    });

    it("throws with status and body text when the response is not ok", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => "Rate limited",
      });
      const provider = new GooglePlacesProvider("key-123");
      await expect(provider.autocomplete("123 Main", "token-1")).rejects.toThrow(
        "Google Places autocomplete failed: 429 Rate limited",
      );
    });
  });

  describe("getPlaceDetails", () => {
    it("requests details and maps address components", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "place-1",
          formattedAddress: "123 Main St, Springfield, IL 62701, US",
          addressComponents: [
            { longText: "123", shortText: "123", types: ["street_number"] },
            { longText: "Main St", shortText: "Main St", types: ["route"] },
            { longText: "Springfield", shortText: "Springfield", types: ["locality"] },
            { longText: "Illinois", shortText: "IL", types: ["administrative_area_level_1"] },
            { longText: "62701", shortText: "62701", types: ["postal_code"] },
            { longText: "United States", shortText: "US", types: ["country"] },
          ],
        }),
      });

      const provider = new GooglePlacesProvider("key-123");
      const details = await provider.getPlaceDetails("place-1", "token-1");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://places.googleapis.com/v1/places/place-1?sessionToken=token-1",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({ "X-Goog-Api-Key": "key-123" }),
        }),
      );

      expect(details).toEqual({
        placeId: "place-1",
        formattedAddress: "123 Main St, Springfield, IL 62701, US",
        addressLine1: "123 Main St",
        city: "Springfield",
        state: "IL",
        postalCode: "62701",
        countryCode: "US",
      });
    });

    it("falls back through city component types", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "place-2",
          addressComponents: [
            { longText: "Some Town", shortText: "Some Town", types: ["postal_town"] },
          ],
        }),
      });
      const provider = new GooglePlacesProvider("key-123");
      const details = await provider.getPlaceDetails("place-2", "token-1");
      expect(details.city).toBe("Some Town");
      expect(details.formattedAddress).toBe("");
    });

    it("handles missing addressComponents entirely", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "place-3" }),
      });
      const provider = new GooglePlacesProvider("key-123");
      const details = await provider.getPlaceDetails("place-3", "token-1");
      expect(details).toEqual({
        placeId: "place-3",
        formattedAddress: "",
        addressLine1: "",
        city: "",
        state: "",
        postalCode: "",
        countryCode: "",
      });
    });

    it("throws with status and body text when the response is not ok", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => "Not found",
      });
      const provider = new GooglePlacesProvider("key-123");
      await expect(provider.getPlaceDetails("bad-id", "token-1")).rejects.toThrow(
        "Google Places details failed: 404 Not found",
      );
    });

    it("encodes the placeId in the URL", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "place with spaces" }),
      });
      const provider = new GooglePlacesProvider("key-123");
      await provider.getPlaceDetails("place with spaces", "token-1");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://places.googleapis.com/v1/places/place%20with%20spaces?sessionToken=token-1",
        expect.anything(),
      );
    });
  });
});
