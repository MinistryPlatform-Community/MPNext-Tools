import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ToolParams } from "@/lib/tool-params";

// Mock all sub-panels — DevPanel tests should not depend on server actions.
vi.mock("./panels/params-panel", () => ({
  ParamsPanel: () => <div data-testid="params-panel" />,
}));
vi.mock("./panels/selection-panel", () => ({
  SelectionPanel: () => <div data-testid="selection-panel" />,
}));
vi.mock("./panels/contact-records-panel", () => ({
  ContactRecordsPanel: () => <div data-testid="contact-records-panel" />,
}));
vi.mock("./panels/user-tools-panel", () => ({
  UserToolsPanel: ({ refreshKey }: { refreshKey?: number }) => (
    <div data-testid="user-tools-panel">{refreshKey}</div>
  ),
}));
vi.mock("./panels/deploy-tool-panel", () => ({
  DeployToolPanel: ({ onDeployed }: { onDeployed?: () => void }) => (
    <div data-testid="deploy-tool-panel">
      <button type="button" onClick={onDeployed}>
        simulate deploy
      </button>
    </div>
  ),
}));

import { DevPanel } from "./dev-panel";

const params: ToolParams = { pageID: 292 };

function setHostname(h: string) {
  Object.defineProperty(window, "location", {
    value: { ...window.location, hostname: h },
    writable: true,
    configurable: true,
  });
}

describe("DevPanel", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development");
    setHostname("localhost");
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns null when hostname is not localhost", async () => {
    setHostname("example.com");
    const { container } = render(<DevPanel params={params} />);
    await act(async () => {});
    expect(container.firstChild).toBeNull();
  });

  it("returns null when NODE_ENV is production (even on localhost)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { container } = render(<DevPanel params={params} />);
    await act(async () => {});
    expect(container.firstChild).toBeNull();
  });

  it("renders the bar when both gates pass", async () => {
    render(<DevPanel params={params} />);
    await act(async () => {});
    expect(screen.getByTestId("dev-panel")).toBeInTheDocument();
  });

  it("defaults to closed when localStorage has no key", async () => {
    render(<DevPanel params={params} />);
    await act(async () => {});
    expect(screen.queryByTestId("dev-panel-body")).not.toBeInTheDocument();
  });

  it("restores open state from localStorage", async () => {
    localStorage.setItem("mp-dev-panel:open", "1");
    render(<DevPanel params={params} />);
    await act(async () => {});
    expect(screen.getByTestId("dev-panel-body")).toBeInTheDocument();
  });

  it("persists open state to localStorage when toggled", async () => {
    render(<DevPanel params={params} />);
    await act(async () => {});
    const button = screen.getByRole("button", { name: /expand dev panel/i });
    await act(async () => {
      button.click();
    });
    expect(localStorage.getItem("mp-dev-panel:open")).toBe("1");
    expect(screen.getByTestId("dev-panel-body")).toBeInTheDocument();
  });

  it("swallows localStorage read errors and defaults to closed", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("boom");
    });
    render(<DevPanel params={params} />);
    await act(async () => {});
    expect(screen.getByTestId("dev-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("dev-panel-body")).not.toBeInTheDocument();
  });

  it("swallows localStorage write errors when toggled", async () => {
    const user = userEvent.setup();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    render(<DevPanel params={params} />);
    await act(async () => {});
    const button = screen.getByRole("button", { name: /expand dev panel/i });
    await user.click(button);
    expect(screen.getByTestId("dev-panel-body")).toBeInTheDocument();
  });

  it("summarizes selection and record params", async () => {
    render(<DevPanel params={{ pageID: 292, s: 5, recordID: 10 }} />);
    await act(async () => {});
    expect(screen.getByText("page 292 · selection 5 · record 10")).toBeInTheDocument();
  });

  it("shows a placeholder summary when no params are set", async () => {
    render(<DevPanel params={{}} />);
    await act(async () => {});
    expect(screen.getByText("no params")).toBeInTheDocument();
  });

  it("bumps the user-tools refresh key when DeployToolPanel reports a deploy", async () => {
    const user = userEvent.setup();
    render(<DevPanel params={params} />);
    await act(async () => {});
    // Open the panel body so the child panels render.
    await user.click(screen.getByRole("button", { name: /expand dev panel/i }));

    expect(screen.getByTestId("user-tools-panel")).toHaveTextContent("0");

    await user.click(screen.getByRole("button", { name: /simulate deploy/i }));

    expect(screen.getByTestId("user-tools-panel")).toHaveTextContent("1");
  });
});
