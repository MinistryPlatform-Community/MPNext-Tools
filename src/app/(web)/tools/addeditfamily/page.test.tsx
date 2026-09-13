import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

/**
 * AddEditFamilyPage tests.
 *
 * Covers the branching in the async server component: resolving
 * initialContactId from page params (success and failure — the failure
 * path is swallowed with a console.warn and initialContactId stays null),
 * and the various guard conditions that skip resolution entirely.
 */

const { mockParseToolParams, mockGetInstance, mockResolveContactIdFromPage } = vi.hoisted(() => ({
  mockParseToolParams: vi.fn(),
  mockGetInstance: vi.fn(),
  mockResolveContactIdFromPage: vi.fn(),
}));

vi.mock("@/lib/tool-params.server", () => ({
  parseToolParams: mockParseToolParams,
}));

vi.mock("@/services/familyService", () => ({
  FamilyService: {
    getInstance: mockGetInstance,
  },
}));

vi.mock("./add-edit-family", () => ({
  AddEditFamily: ({
    params,
    initialContactId,
  }: {
    params: unknown;
    initialContactId: number | null;
  }) => (
    <div data-testid="add-edit-family">
      <span data-testid="initial-contact-id">{String(initialContactId)}</span>
      <span data-testid="params">{JSON.stringify(params)}</span>
    </div>
  ),
}));

import AddEditFamilyPage, { generateMetadata } from "./page";

function searchParamsOf(obj: Record<string, string | string[] | undefined>) {
  return Promise.resolve(obj);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetInstance.mockResolvedValue({
    resolveContactIdFromPage: mockResolveContactIdFromPage,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("AddEditFamilyPage", () => {
  it("renders with initialContactId null when there is no recordID", async () => {
    mockParseToolParams.mockResolvedValue({ recordID: undefined });
    const jsx = await AddEditFamilyPage({ searchParams: searchParamsOf({}) });
    render(jsx);
    expect(screen.getByTestId("initial-contact-id").textContent).toBe("null");
    expect(mockGetInstance).not.toHaveBeenCalled();
  });

  it("does not resolve when recordID is not positive", async () => {
    mockParseToolParams.mockResolvedValue({
      recordID: -1,
      pageData: {
        Table_Name: "Contacts",
        Primary_Key: "Contact_ID",
        Contact_ID_Field: "Contact_ID",
      },
    });
    const jsx = await AddEditFamilyPage({ searchParams: searchParamsOf({ recordID: "-1" }) });
    render(jsx);
    expect(screen.getByTestId("initial-contact-id").textContent).toBe("null");
    expect(mockGetInstance).not.toHaveBeenCalled();
  });

  it("does not resolve when pageData is missing required fields", async () => {
    mockParseToolParams.mockResolvedValue({
      recordID: 42,
      pageData: { Table_Name: "Contacts" }, // missing Primary_Key/Contact_ID_Field
    });
    const jsx = await AddEditFamilyPage({ searchParams: searchParamsOf({ recordID: "42" }) });
    render(jsx);
    expect(screen.getByTestId("initial-contact-id").textContent).toBe("null");
    expect(mockGetInstance).not.toHaveBeenCalled();
  });

  it("resolves the Contact_ID from the page record when all params are present", async () => {
    mockParseToolParams.mockResolvedValue({
      recordID: 42,
      pageData: {
        Table_Name: "Households",
        Primary_Key: "Household_ID",
        Contact_ID_Field: "Contact_ID",
      },
    });
    mockResolveContactIdFromPage.mockResolvedValue(999);

    const jsx = await AddEditFamilyPage({ searchParams: searchParamsOf({ recordID: "42" }) });
    render(jsx);

    expect(mockResolveContactIdFromPage).toHaveBeenCalledWith(
      "Households",
      "Household_ID",
      42,
      "Contact_ID",
    );
    expect(screen.getByTestId("initial-contact-id").textContent).toBe("999");
  });

  it("swallows a resolution failure and renders with initialContactId null", async () => {
    mockParseToolParams.mockResolvedValue({
      recordID: 42,
      pageData: {
        Table_Name: "Households",
        Primary_Key: "Household_ID",
        Contact_ID_Field: "Contact_ID",
      },
    });
    mockResolveContactIdFromPage.mockRejectedValue(new Error("no security role"));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const jsx = await AddEditFamilyPage({ searchParams: searchParamsOf({ recordID: "42" }) });
    render(jsx);

    expect(screen.getByTestId("initial-contact-id").textContent).toBe("null");
    expect(warnSpy).toHaveBeenCalledWith(
      "Failed to resolve Contact_ID from page record:",
      expect.any(Error),
    );
  });

  it("passes params through to AddEditFamily", async () => {
    mockParseToolParams.mockResolvedValue({ recordID: undefined, pageID: 292 });
    const jsx = await AddEditFamilyPage({ searchParams: searchParamsOf({ pageID: "292" }) });
    render(jsx);
    expect(screen.getByTestId("params").textContent).toContain("292");
  });

  it("generateMetadata returns the tool title", async () => {
    await expect(generateMetadata()).resolves.toEqual({ title: "Add/Edit Family" });
  });
});
