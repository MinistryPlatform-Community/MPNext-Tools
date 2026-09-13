import { describe, it, expect, vi, beforeEach, beforeAll, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";

const mockUsePathname = vi.hoisted(() => vi.fn());
const mockDeployToolAction = vi.hoisted(() => vi.fn());
const mockGetDeployToolEnvStatusAction = vi.hoisted(() => vi.fn());
const mockListPagesAction = vi.hoisted(() => vi.fn());
const mockListRolesAction = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: mockUsePathname,
}));

vi.mock("./deploy-tool-actions", () => ({
  deployToolAction: mockDeployToolAction,
  getDeployToolEnvStatusAction: mockGetDeployToolEnvStatusAction,
  listPagesAction: mockListPagesAction,
  listRolesAction: mockListRolesAction,
}));

import { DeployToolPanel } from "./deploy-tool-panel";

// cmdk scrolls the highlighted item into view; jsdom doesn't implement it.
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const okEnvStatus = { hasDevCreds: true, missing: [] };
const badEnvStatus = {
  hasDevCreds: false,
  missing: ["MINISTRY_PLATFORM_DEV_CLIENT_ID", "MINISTRY_PLATFORM_DEV_CLIENT_SECRET"],
};

const samplePages = [
  { Page_ID: 292, Display_Name: "Contacts", Table_Name: "Contacts" },
];
const sampleRoles = [
  { Role_ID: 1, Role_Name: "Administrators" },
  { Role_ID: 2, Role_Name: "Staff" },
];

const sampleResult = {
  tool: {
    Tool_ID: 42,
    Tool_Name: "FooTool",
    Description: "A test tool",
    Launch_Page: "https://tools.example.org/tools/foo",
    Launch_with_Credentials: true,
    Launch_with_Parameters: true,
    Launch_in_New_Tab: false,
    Show_On_Mobile: false,
  },
  pages: [{ Page_ID: 292 }],
  roles: [{ Role_ID: 1 }],
};

async function fillRequiredFields() {
  const toolName = screen.getByPlaceholderText("AddressLabelPrinter");
  fireEvent.change(toolName, { target: { value: "FooTool" } });
  const launchPage = screen.getByPlaceholderText(
    "https://tools.example.org/tools/address-labels"
  );
  fireEvent.change(launchPage, { target: { value: "https://tools.example.org/tools/foo" } });
}

describe("DeployToolPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/tools/address-labels");
    mockListPagesAction.mockResolvedValue([]);
    mockListRolesAction.mockResolvedValue([]);
    mockGetDeployToolEnvStatusAction.mockResolvedValue(okEnvStatus);
  });

  it("renders the collapsed summary heading", async () => {
    render(<DeployToolPanel />);
    expect(
      screen.getByText("Development Mode - Deploy Tool to Ministry Platform")
    ).toBeInTheDocument();
    await waitFor(() => expect(mockGetDeployToolEnvStatusAction).toHaveBeenCalled());
  });

  it("prefills Launch Page from NEXT_PUBLIC_PROD_URL + pathname", async () => {
    vi.stubEnv("NEXT_PUBLIC_PROD_URL", "https://tools.example.org/");
    render(<DeployToolPanel />);
    const launchPage = await screen.findByPlaceholderText(
      "https://tools.example.org/tools/address-labels"
    );
    expect((launchPage as HTMLInputElement).value).toBe(
      "https://tools.example.org/tools/address-labels"
    );
  });

  it("leaves Launch Page blank when NEXT_PUBLIC_PROD_URL is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_PROD_URL", "");
    render(<DeployToolPanel />);
    await waitFor(() => expect(mockGetDeployToolEnvStatusAction).toHaveBeenCalled());
    const launchPage = screen.getByPlaceholderText(
      "https://tools.example.org/tools/address-labels"
    ) as HTMLInputElement;
    expect(launchPage.value).toBe("");
  });

  it("shows no warning banner and an enabled submit button when dev creds are present", async () => {
    render(<DeployToolPanel />);
    await waitFor(() => expect(mockGetDeployToolEnvStatusAction).toHaveBeenCalled());
    expect(screen.queryByText("Dev credentials not configured")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /deploy tool/i })).not.toBeDisabled();
  });

  it("shows a warning banner and disables submit when dev creds are missing", async () => {
    mockGetDeployToolEnvStatusAction.mockResolvedValueOnce(badEnvStatus);
    render(<DeployToolPanel />);

    await waitFor(() => {
      expect(screen.getByText("Dev credentials not configured")).toBeInTheDocument();
    });
    expect(screen.getByText("MINISTRY_PLATFORM_DEV_CLIENT_ID")).toBeInTheDocument();
    expect(screen.getByText("MINISTRY_PLATFORM_DEV_CLIENT_SECRET")).toBeInTheDocument();
    expect(screen.getByText(/environment variables are missing/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /deploy tool/i })).toBeDisabled();
  });

  it("shows singular wording when exactly one env var is missing", async () => {
    mockGetDeployToolEnvStatusAction.mockResolvedValueOnce({
      hasDevCreds: false,
      missing: ["MINISTRY_PLATFORM_DEV_CLIENT_ID"],
    });
    render(<DeployToolPanel />);

    await waitFor(() => {
      expect(screen.getByText(/environment variable is missing/)).toBeInTheDocument();
    });
  });

  it("falls back to a fully-missing env status when the status check itself rejects", async () => {
    mockGetDeployToolEnvStatusAction.mockRejectedValueOnce(new Error("Unauthorized"));
    render(<DeployToolPanel />);

    await waitFor(() => {
      expect(screen.getByText("Dev credentials not configured")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /deploy tool/i })).toBeDisabled();
  });

  it("submits the form and shows the deployed result", async () => {
    mockDeployToolAction.mockResolvedValueOnce(sampleResult);
    const onDeployed = vi.fn();
    render(<DeployToolPanel onDeployed={onDeployed} />);
    await waitFor(() => expect(mockGetDeployToolEnvStatusAction).toHaveBeenCalled());

    await fillRequiredFields();
    fireEvent.change(screen.getByPlaceholderText("https://tools.example.org/tools/address-labels"), {
      target: { value: "https://tools.example.org/tools/foo" },
    });
    fireEvent.click(screen.getByRole("button", { name: /deploy tool/i }));

    await waitFor(() => {
      expect(screen.getByText("FooTool")).toBeInTheDocument();
    });
    expect(screen.getByText(/1 page mapping/)).toBeInTheDocument();
    expect(screen.getByText(/1 role grant/)).toBeInTheDocument();
    expect(onDeployed).toHaveBeenCalled();
    expect(mockDeployToolAction).toHaveBeenCalledWith(
      expect.objectContaining({ toolName: "FooTool", launchPage: "https://tools.example.org/tools/foo" })
    );
  });

  it("shows an error message when deployToolAction rejects with an Error", async () => {
    mockDeployToolAction.mockRejectedValueOnce(new Error("SP failed"));
    render(<DeployToolPanel />);
    await waitFor(() => expect(mockGetDeployToolEnvStatusAction).toHaveBeenCalled());

    await fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: /deploy tool/i }));

    await waitFor(() => {
      expect(screen.getByText("SP failed")).toBeInTheDocument();
    });
  });

  it("shows a generic error message for a non-Error rejection", async () => {
    mockDeployToolAction.mockRejectedValueOnce("nope");
    render(<DeployToolPanel />);
    await waitFor(() => expect(mockGetDeployToolEnvStatusAction).toHaveBeenCalled());

    await fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: /deploy tool/i }));

    await waitFor(() => {
      expect(screen.getByText("Unknown error")).toBeInTheDocument();
    });
  });

  it("shows a spinner label while a submission is in flight", async () => {
    let resolveDeploy: (v: typeof sampleResult) => void;
    mockDeployToolAction.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveDeploy = resolve;
      })
    );
    render(<DeployToolPanel />);
    await waitFor(() => expect(mockGetDeployToolEnvStatusAction).toHaveBeenCalled());

    await fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: /deploy tool/i }));

    expect(screen.getByText("Deploying…")).toBeInTheDocument();

    await waitFor(() => {
      resolveDeploy!(sampleResult);
    });
  });

  it("toggles each flag checkbox", async () => {
    render(<DeployToolPanel />);
    await waitFor(() => expect(mockGetDeployToolEnvStatusAction).toHaveBeenCalled());

    const credsCheckbox = document.getElementById("flag-creds")!;
    const paramsCheckbox = document.getElementById("flag-params")!;
    const newtabCheckbox = document.getElementById("flag-newtab")!;
    const mobileCheckbox = document.getElementById("flag-mobile")!;

    expect(credsCheckbox).toHaveAttribute("data-state", "unchecked");
    expect(paramsCheckbox).toHaveAttribute("data-state", "checked");

    fireEvent.click(credsCheckbox);
    fireEvent.click(paramsCheckbox);
    fireEvent.click(newtabCheckbox);
    fireEvent.click(mobileCheckbox);

    expect(credsCheckbox).toHaveAttribute("data-state", "checked");
    expect(paramsCheckbox).toHaveAttribute("data-state", "unchecked");
    expect(newtabCheckbox).toHaveAttribute("data-state", "checked");
    expect(mobileCheckbox).toHaveAttribute("data-state", "checked");
  });

  it("caps Tool Name, Description and Additional Data at their max lengths", async () => {
    render(<DeployToolPanel />);
    await waitFor(() => expect(mockGetDeployToolEnvStatusAction).toHaveBeenCalled());

    const toolName = screen.getByPlaceholderText("AddressLabelPrinter") as HTMLInputElement;
    fireEvent.change(toolName, { target: { value: "x".repeat(40) } });
    expect(toolName.value).toHaveLength(30);

    const description = screen.getByPlaceholderText(
      "Prints address labels with IMb barcodes"
    ) as HTMLTextAreaElement;
    fireEvent.change(description, { target: { value: "y".repeat(150) } });
    expect(description.value).toHaveLength(100);

    const additionalData = screen.getByPlaceholderText(
      "Optional query string, key, etc."
    ) as HTMLTextAreaElement;
    fireEvent.change(additionalData, { target: { value: "z".repeat(100) } });
    expect(additionalData.value).toHaveLength(65);
  });

  it("selects and removes a page from the Pages lookup", async () => {
    mockListPagesAction.mockResolvedValue(samplePages);
    render(<DeployToolPanel />);
    await waitFor(() => expect(mockGetDeployToolEnvStatusAction).toHaveBeenCalled());

    expect(screen.getAllByText("No items selected").length).toBe(2);

    const addButtons = screen.getAllByRole("button", { name: "Add…" });
    fireEvent.click(addButtons[0]); // Pages popover

    await waitFor(() => {
      expect(mockListPagesAction).toHaveBeenCalled();
    });

    const option = await screen.findByText("Contacts (#292)");
    fireEvent.click(option);

    await waitFor(() => {
      expect(screen.getAllByText("Contacts (#292)").length).toBeGreaterThan(0);
    });

    // Remove the chip.
    fireEvent.click(screen.getByRole("button", { name: "Remove Contacts (#292)" }));

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Remove Contacts (#292)" })
      ).not.toBeInTheDocument();
    });
  });

  it("filters the Pages lookup as the user types a search term", async () => {
    mockListPagesAction.mockResolvedValue(samplePages);
    render(<DeployToolPanel />);
    await waitFor(() => expect(mockGetDeployToolEnvStatusAction).toHaveBeenCalled());

    const addButtons = screen.getAllByRole("button", { name: "Add…" });
    fireEvent.click(addButtons[0]);

    await waitFor(() => expect(mockListPagesAction).toHaveBeenCalledWith(""));

    const search = screen.getByPlaceholderText("Search pages…");
    fireEvent.change(search, { target: { value: "Cont" } });

    await waitFor(() => {
      expect(mockListPagesAction).toHaveBeenCalledWith("Cont");
    });
  });

  it("shows a loading indicator, then 'No results.' when the Pages lookup returns nothing", async () => {
    let resolvePages: (v: typeof samplePages) => void;
    mockListPagesAction.mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePages = resolve;
      })
    );
    render(<DeployToolPanel />);
    await waitFor(() => expect(mockGetDeployToolEnvStatusAction).toHaveBeenCalled());

    const addButtons = screen.getAllByRole("button", { name: "Add…" });
    fireEvent.click(addButtons[0]);

    expect(await screen.findByText("Loading…")).toBeInTheDocument();

    await waitFor(() => {
      resolvePages!([]);
    });

    expect(await screen.findByText("No results.")).toBeInTheDocument();
  });

  it("shows a fetch error when the Pages lookup rejects", async () => {
    mockListPagesAction.mockRejectedValueOnce(new Error("lookup failed"));
    render(<DeployToolPanel />);
    await waitFor(() => expect(mockGetDeployToolEnvStatusAction).toHaveBeenCalled());

    const addButtons = screen.getAllByRole("button", { name: "Add…" });
    fireEvent.click(addButtons[0]);

    expect(await screen.findByText("lookup failed")).toBeInTheDocument();
  });

  it("shows a generic fetch error for a non-Error Pages lookup rejection", async () => {
    mockListPagesAction.mockRejectedValueOnce("nope");
    render(<DeployToolPanel />);
    await waitFor(() => expect(mockGetDeployToolEnvStatusAction).toHaveBeenCalled());

    const addButtons = screen.getAllByRole("button", { name: "Add…" });
    fireEvent.click(addButtons[0]);

    expect(await screen.findByText("Load failed")).toBeInTheDocument();
  });

  it("auto-selects the Administrators role and prevents its removal", async () => {
    mockListRolesAction.mockResolvedValue(sampleRoles);
    render(<DeployToolPanel />);
    await waitFor(() => expect(mockGetDeployToolEnvStatusAction).toHaveBeenCalled());

    await waitFor(() => {
      expect(mockListRolesAction).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText("Administrators (#1)")).toBeInTheDocument();
    });
    // Locked chip has no remove button.
    expect(
      screen.queryByRole("button", { name: "Remove Administrators (#1)" })
    ).not.toBeInTheDocument();
  });

  it("adds and removes a non-locked role", async () => {
    mockListRolesAction.mockResolvedValue(sampleRoles);
    render(<DeployToolPanel />);
    await waitFor(() => expect(mockGetDeployToolEnvStatusAction).toHaveBeenCalled());

    await waitFor(() => {
      expect(screen.getByText("Administrators (#1)")).toBeInTheDocument();
    });

    const addButtons = screen.getAllByRole("button", { name: "Add…" });
    fireEvent.click(addButtons[1]); // Roles popover

    const staffOption = await screen.findByText("Staff (#2)");
    fireEvent.click(staffOption);

    await waitFor(() => {
      expect(screen.getAllByText("Staff (#2)").length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole("button", { name: "Remove Staff (#2)" }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Remove Staff (#2)" })).not.toBeInTheDocument();
    });
  });

  it("dedupes role IDs before submitting", async () => {
    mockListRolesAction.mockResolvedValue(sampleRoles);
    mockDeployToolAction.mockResolvedValueOnce(sampleResult);
    render(<DeployToolPanel />);
    await waitFor(() => expect(mockGetDeployToolEnvStatusAction).toHaveBeenCalled());

    await waitFor(() => {
      expect(screen.getByText("Administrators (#1)")).toBeInTheDocument();
    });

    await fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: /deploy tool/i }));

    await waitFor(() => {
      expect(mockDeployToolAction).toHaveBeenCalledWith(
        expect.objectContaining({ roleIds: [1] })
      );
    });
  });

  it("resets Launch Page when the route changes", async () => {
    vi.stubEnv("NEXT_PUBLIC_PROD_URL", "https://tools.example.org");
    mockUsePathname.mockReturnValue("/tools/one");
    const { rerender } = render(<DeployToolPanel />);
    await waitFor(() => expect(mockGetDeployToolEnvStatusAction).toHaveBeenCalled());

    expect(
      (screen.getByPlaceholderText(
        "https://tools.example.org/tools/address-labels"
      ) as HTMLInputElement).value
    ).toBe("https://tools.example.org/tools/one");

    mockUsePathname.mockReturnValue("/tools/two");
    rerender(<DeployToolPanel />);

    await waitFor(() => {
      expect(
        (screen.getByPlaceholderText(
          "https://tools.example.org/tools/address-labels"
        ) as HTMLInputElement).value
      ).toBe("https://tools.example.org/tools/two");
    });
  });
});
