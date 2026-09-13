import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";

const mockGetUserTools = vi.hoisted(() => vi.fn());
const mockUsePathname = vi.hoisted(() => vi.fn());

vi.mock("./user-tools-actions", () => ({
  getUserTools: mockGetUserTools,
}));

vi.mock("next/navigation", () => ({
  usePathname: mockUsePathname,
}));

import { UserToolsPanel } from "./user-tools-panel";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("UserToolsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/tools/address-labels");
    vi.stubEnv("NEXT_PUBLIC_PROD_URL", "https://tools.example.org");
  });

  it("shows a loading state while fetching", () => {
    mockGetUserTools.mockReturnValueOnce(new Promise(() => {}));
    render(<UserToolsPanel />);
    expect(screen.getByText("Development Mode - Loading User Tools")).toBeInTheDocument();
  });

  it("shows an error state when the fetch rejects", async () => {
    mockGetUserTools.mockRejectedValueOnce(new Error("boom"));
    render(<UserToolsPanel />);

    await waitFor(() => {
      expect(screen.getByText("Development Mode - Error Loading User Tools")).toBeInTheDocument();
    });
    expect(screen.getByText("boom")).toBeInTheDocument();
  });

  it("shows a generic error message for a non-Error rejection", async () => {
    mockGetUserTools.mockRejectedValueOnce("nope");
    render(<UserToolsPanel />);

    await waitFor(() => {
      expect(screen.getByText("Unknown error")).toBeInTheDocument();
    });
  });

  it("shows a no-tools message when the tool list is empty", async () => {
    mockGetUserTools.mockResolvedValueOnce([]);
    render(<UserToolsPanel />);

    await waitFor(() => {
      expect(screen.getByText("Development Mode - No Tools Found")).toBeInTheDocument();
    });
  });

  it("shows a missing-env-var message when NEXT_PUBLIC_PROD_URL is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_PROD_URL", "");
    mockGetUserTools.mockResolvedValueOnce(["/tools/foo"]);
    render(<UserToolsPanel />);

    await waitFor(() => {
      expect(screen.getByText("Development Mode - Missing Environment Variable")).toBeInTheDocument();
    });
    expect(screen.getByText(/authorized tool paths: 1/)).toBeInTheDocument();
  });

  it("shows authorized state and calls onAuthorizationChange(true) when the prod URL matches a tool path", async () => {
    mockGetUserTools.mockResolvedValueOnce([
      "https://tools.example.org/tools/address-labels?pageID=292",
    ]);
    const onAuthorizationChange = vi.fn();
    render(<UserToolsPanel onAuthorizationChange={onAuthorizationChange} />);

    await waitFor(() => {
      expect(screen.getByText(/Development Mode - Your Authorized Tools \(1\)/)).toBeInTheDocument();
    });
    expect(onAuthorizationChange).toHaveBeenCalledWith(true);
    expect(
      screen.getByText("https://tools.example.org/tools/address-labels?pageID=292")
    ).toBeInTheDocument();
  });

  it("shows unauthorized state and calls onAuthorizationChange(false) when no tool path matches", async () => {
    mockGetUserTools.mockResolvedValueOnce(["https://tools.example.org/tools/other"]);
    const onAuthorizationChange = vi.fn();
    render(<UserToolsPanel onAuthorizationChange={onAuthorizationChange} />);

    await waitFor(() => {
      expect(screen.getByText(/NOT AUTHORIZED/)).toBeInTheDocument();
    });
    expect(onAuthorizationChange).toHaveBeenCalledWith(false);
    expect(
      screen.getByText(/No authorized tool path matches the production URL/)
    ).toBeInTheDocument();
  });

  it("re-fetches when refreshKey changes", async () => {
    mockGetUserTools.mockResolvedValue(["https://tools.example.org/tools/address-labels"]);
    const { rerender } = render(<UserToolsPanel refreshKey={0} />);

    await waitFor(() => {
      expect(mockGetUserTools).toHaveBeenCalledTimes(1);
    });

    rerender(<UserToolsPanel refreshKey={1} />);

    await waitFor(() => {
      expect(mockGetUserTools).toHaveBeenCalledTimes(2);
    });
  });

  it("shows the raw JSON of all authorized tool paths", async () => {
    mockGetUserTools.mockResolvedValueOnce(["https://tools.example.org/tools/address-labels"]);
    render(<UserToolsPanel />);

    await waitFor(() => {
      expect(screen.getByText(/View all authorized tool paths/)).toBeInTheDocument();
    });
  });
});
