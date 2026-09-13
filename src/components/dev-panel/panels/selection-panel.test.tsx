import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act, waitFor } from "@testing-library/react";

const mockResolveSelection = vi.hoisted(() => vi.fn());

vi.mock("./selection-actions", () => ({
  resolveSelection: mockResolveSelection,
}));

import { SelectionPanel } from "./selection-panel";
import type { ToolParams } from "@/lib/tool-params";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("SelectionPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when there is no selection param", () => {
    const params: ToolParams = {};
    const { container } = render(<SelectionPanel params={params} />);
    expect(container.firstChild).toBeNull();
    expect(mockResolveSelection).not.toHaveBeenCalled();
  });

  it("renders nothing when s is present but pageID is missing", () => {
    const params: ToolParams = { s: 5 };
    const { container } = render(<SelectionPanel params={params} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when s is 0", () => {
    const params: ToolParams = { s: 0, pageID: 292 };
    const { container } = render(<SelectionPanel params={params} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows a loading state, then the resolved selection", async () => {
    let resolvePromise: (value: { recordIds: number[]; count: number }) => void;
    mockResolveSelection.mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePromise = resolve;
      })
    );

    const params: ToolParams = { s: 5, pageID: 292 };
    render(<SelectionPanel params={params} />);

    expect(screen.getByText("Development Mode - Loading Selection...")).toBeInTheDocument();

    await act(async () => {
      resolvePromise!({ recordIds: [1, 2, 3], count: 3 });
    });

    await waitFor(() => {
      expect(screen.getByText("Development Mode - Selection Details")).toBeInTheDocument();
    });
    expect(screen.getByText("3 records in selection")).toBeInTheDocument();
  });

  it("calls onRecordIdsResolved with the resolved record IDs", async () => {
    mockResolveSelection.mockResolvedValueOnce({ recordIds: [10, 20], count: 2 });
    const onRecordIdsResolved = vi.fn();

    render(<SelectionPanel params={{ s: 5, pageID: 292 }} onRecordIdsResolved={onRecordIdsResolved} />);

    await waitFor(() => {
      expect(onRecordIdsResolved).toHaveBeenCalledWith([10, 20]);
    });
  });

  it("shows an error state when resolution fails", async () => {
    mockResolveSelection.mockRejectedValueOnce(new Error("boom"));

    render(<SelectionPanel params={{ s: 5, pageID: 292 }} />);

    await waitFor(() => {
      expect(screen.getByText("Development Mode - Selection Error")).toBeInTheDocument();
    });
    expect(screen.getByText("boom")).toBeInTheDocument();
  });

  it("shows a generic error message for a non-Error rejection", async () => {
    mockResolveSelection.mockRejectedValueOnce("not an error object");

    render(<SelectionPanel params={{ s: 5, pageID: 292 }} />);

    await waitFor(() => {
      expect(screen.getByText("Failed to resolve selection")).toBeInTheDocument();
    });
  });

  it("shows page name and table from pageData, and truncates to +N more", async () => {
    mockResolveSelection.mockResolvedValueOnce({
      recordIds: [1, 2, 3, 4, 5, 6, 7],
      count: 7,
    });

    render(
      <SelectionPanel
        params={{
          s: 5,
          pageID: 292,
          pageData: {
            Page_ID: 292,
            Display_Name: "Contacts",
            Singular_Name: "Contact",
            Table_Name: "Contacts",
            Primary_Key: "Contact_ID",
          },
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText("Contacts").length).toBe(2);
    });
    expect(screen.getByText("+2 more")).toBeInTheDocument();
  });

  it("falls back to 'Page N' and 'N/A' when pageData is missing", async () => {
    mockResolveSelection.mockResolvedValueOnce({ recordIds: [1], count: 1 });

    render(<SelectionPanel params={{ s: 5, pageID: 292 }} />);

    await waitFor(() => {
      expect(screen.getByText("Page 292")).toBeInTheDocument();
    });
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });
});
