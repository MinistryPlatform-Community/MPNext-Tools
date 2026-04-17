import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
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
  UserToolsPanel: () => <div data-testid="user-tools-panel" />,
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
});
