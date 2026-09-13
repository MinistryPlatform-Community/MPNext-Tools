import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";

const mockResolveContactRecords = vi.hoisted(() => vi.fn());

vi.mock("./contact-records-actions", () => ({
  resolveContactRecords: mockResolveContactRecords,
}));

import { ContactRecordsPanel } from "./contact-records-panel";
import type { ToolParams } from "@/lib/tool-params";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const pageData = {
  Page_ID: 292,
  Display_Name: "Contacts",
  Singular_Name: "Contact",
  Table_Name: "Contacts",
  Primary_Key: "Contact_ID",
  Contact_ID_Field: "Contact_ID",
};

describe("ContactRecordsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when pageData has no Contact_ID_Field", () => {
    const params: ToolParams = { recordID: 1 };
    const { container } = render(<ContactRecordsPanel params={params} />);
    expect(container.firstChild).toBeNull();
    expect(mockResolveContactRecords).not.toHaveBeenCalled();
  });

  it("renders nothing when there is neither a single record nor a selection", () => {
    const params: ToolParams = { pageData };
    const { container } = render(<ContactRecordsPanel params={params} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when recordID is 0 (falsy for hasSingleRecord) and no selection", () => {
    const params: ToolParams = { pageData, recordID: 0 };
    const { container } = render(<ContactRecordsPanel params={params} />);
    expect(container.firstChild).toBeNull();
  });

  it("resolves a single record and shows the loading then loaded state", async () => {
    mockResolveContactRecords.mockResolvedValueOnce({
      tableName: "Contacts",
      primaryKey: "Contact_ID",
      contactIdField: "Contact_ID",
      records: [{ recordId: 1, contactId: 100 }],
    });

    const params: ToolParams = { pageData, recordID: 1 };
    render(<ContactRecordsPanel params={params} />);

    expect(
      screen.getByText("Development Mode - Loading Contact Records...")
    ).toBeInTheDocument();
    expect(screen.getByText(/Resolving Contact IDs from record/)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Development Mode - Contact Records")).toBeInTheDocument();
    });
    expect(screen.getByText("1 contact resolved")).toBeInTheDocument();
    expect(mockResolveContactRecords).toHaveBeenCalledWith("Contacts", "Contact_ID", "Contact_ID", [1]);
  });

  it("resolves a selection of record IDs and pluralizes the count", async () => {
    mockResolveContactRecords.mockResolvedValueOnce({
      tableName: "Contacts",
      primaryKey: "Contact_ID",
      contactIdField: "Contact_ID",
      records: [
        { recordId: 1, contactId: 100 },
        { recordId: 2, contactId: 200 },
      ],
    });

    const params: ToolParams = { pageData };
    render(<ContactRecordsPanel params={params} selectionRecordIds={[1, 2]} />);

    expect(screen.getByText(/Resolving Contact IDs from selection/)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("2 contacts resolved")).toBeInTheDocument();
    });
    expect(mockResolveContactRecords).toHaveBeenCalledWith("Contacts", "Contact_ID", "Contact_ID", [1, 2]);
  });

  it("shows an error state when resolution fails", async () => {
    mockResolveContactRecords.mockRejectedValueOnce(new Error("resolve failed"));

    render(<ContactRecordsPanel params={{ pageData, recordID: 1 }} />);

    await waitFor(() => {
      expect(screen.getByText("Development Mode - Contact Records Error")).toBeInTheDocument();
    });
    expect(screen.getByText("resolve failed")).toBeInTheDocument();
  });

  it("shows a generic error message for a non-Error rejection", async () => {
    mockResolveContactRecords.mockRejectedValueOnce("nope");

    render(<ContactRecordsPanel params={{ pageData, recordID: 1 }} />);

    await waitFor(() => {
      expect(screen.getByText("Failed to resolve contact records")).toBeInTheDocument();
    });
  });

  it("truncates displayed contact IDs beyond 5 and shows a +N more indicator", async () => {
    mockResolveContactRecords.mockResolvedValueOnce({
      tableName: "Contacts",
      primaryKey: "Contact_ID",
      contactIdField: "Contact_ID",
      records: Array.from({ length: 7 }, (_, i) => ({ recordId: i + 1, contactId: 100 + i })),
    });

    render(<ContactRecordsPanel params={{ pageData }} selectionRecordIds={[1, 2, 3, 4, 5, 6, 7]} />);

    await waitFor(() => {
      expect(screen.getByText("+2 more")).toBeInTheDocument();
    });
  });

  it("renders the raw JSON details for the resolved result", async () => {
    mockResolveContactRecords.mockResolvedValueOnce({
      tableName: "Contacts",
      primaryKey: "Contact_ID",
      contactIdField: "Contact_ID",
      records: [{ recordId: 1, contactId: 100 }],
    });

    render(<ContactRecordsPanel params={{ pageData, recordID: 1 }} />);

    await waitFor(() => {
      expect(screen.getByText("View Raw JSON")).toBeInTheDocument();
    });
  });
});
