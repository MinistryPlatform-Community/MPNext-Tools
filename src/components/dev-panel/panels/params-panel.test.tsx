import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ParamsPanel } from "./params-panel";
import type { ToolParams } from "@/lib/tool-params";

afterEach(() => {
  cleanup();
});

describe("ParamsPanel", () => {
  it("renders the no-parameters message when every param is undefined", () => {
    render(<ParamsPanel params={{}} />);
    expect(screen.getByText("Development Mode - No Parameters")).toBeInTheDocument();
  });

  it("renders param cards and marks new-record / edit-mode state", () => {
    const params: ToolParams = { pageID: 292, recordID: -1 };
    render(<ParamsPanel params={params} />);

    expect(screen.getByText("✓ New Record")).toBeInTheDocument();
    expect(screen.getByText("○ Edit Mode")).toBeInTheDocument();
    expect(screen.getByText("pageID")).toBeInTheDocument();
    expect(screen.getByText("MP PageID")).toBeInTheDocument();
  });

  it("marks edit mode (not new record) for a positive recordID", () => {
    const params: ToolParams = { recordID: 42 };
    render(<ParamsPanel params={params} />);

    expect(screen.getByText("○ New Record")).toBeInTheDocument();
    expect(screen.getByText("✓ Edit Mode")).toBeInTheDocument();
  });

  it("shows pageID alongside the page's Table_Name from pageData", () => {
    const params: ToolParams = {
      pageID: 292,
      pageData: {
        Page_ID: 292,
        Display_Name: "Contacts",
        Singular_Name: "Contact",
        Table_Name: "Contacts",
        Primary_Key: "Contact_ID",
        Contact_ID_Field: "Contact_ID",
      },
    };
    render(<ParamsPanel params={params} />);

    expect(screen.getByText("292 - Contacts")).toBeInTheDocument();
    expect(screen.getByText("Contact_ID")).toBeInTheDocument();
    expect(screen.getByText("Contact FK column for this page")).toBeInTheDocument();
  });

  it("skips rendering a card for pageData and recordDescription keys", () => {
    const params: ToolParams = {
      recordDescription: "Some description",
      pageData: {
        Page_ID: 1,
        Display_Name: "X",
        Singular_Name: "X",
        Table_Name: "X",
        Primary_Key: "X_ID",
      },
    };
    render(<ParamsPanel params={params} />);

    expect(screen.queryByText("recordDescription")).not.toBeInTheDocument();
    expect(screen.queryByText("pageData")).not.toBeInTheDocument();
  });

  it("shows 'undefined' placeholder for params without a value", () => {
    const params: ToolParams = { q: undefined, pageID: 1 };
    render(<ParamsPanel params={params} />);

    // q is explicitly present as a key with an undefined value.
    expect(screen.getByText("q")).toBeInTheDocument();
  });

  it("renders a numeric param value directly (not string-wrapped)", () => {
    const params: ToolParams = { s: 7 };
    render(<ParamsPanel params={params} />);

    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("Selection ID")).toBeInTheDocument();
  });

  it("renders the raw JSON details for the params", () => {
    const params: ToolParams = { pageID: 292 };
    render(<ParamsPanel params={params} />);

    expect(screen.getByText(/View Raw JSON/)).toBeInTheDocument();
  });
});
