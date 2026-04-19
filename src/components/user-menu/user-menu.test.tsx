import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import type { MPUserProfile } from "@/lib/providers/ministry-platform/types";

/**
 * UserMenu Tests
 *
 * Covers the client component behavior that `actions.test.ts` does not:
 *   1. Name display fallback (Nickname || First_Name).
 *   2. Email_Address rendering including null-safe render.
 *   3. `handleItemClick` wiring: `onClose?.()` runs before `handleSignOut()`.
 *   4. Sign-out still works when `onClose` is omitted.
 *
 * The Radix DropdownMenu primitives rely on a Portal plus pointer-event
 * gating that does not play nicely with jsdom, so we stub the UI barrel
 * to render content inline. This keeps the focus on UserMenu's own
 * logic rather than Radix internals.
 */

const { mockHandleSignOut } = vi.hoisted(() => ({
  mockHandleSignOut: vi.fn(),
}));

vi.mock("./actions", () => ({
  handleSignOut: mockHandleSignOut,
}));

vi.mock("@/components/ui/dropdown-menu", () => {
  const React = require("react");
  const passthrough = (tag: string) =>
    function Passthrough({ children, ...rest }: any) {
      return React.createElement(tag, rest, children);
    };
  return {
    DropdownMenu: passthrough("div"),
    DropdownMenuTrigger: function Trigger({ children }: any) {
      // `asChild` means Radix clones into the child; for tests we just
      // render the child directly.
      return React.createElement(React.Fragment, null, children);
    },
    DropdownMenuContent: passthrough("div"),
    DropdownMenuLabel: passthrough("div"),
    DropdownMenuSeparator: passthrough("hr"),
    DropdownMenuItem: function Item({ children, onClick, className }: any) {
      return React.createElement(
        "button",
        { type: "button", onClick, className },
        children
      );
    },
  };
});

import { UserMenu } from "./user-menu";

function makeProfile(overrides: Partial<MPUserProfile> = {}): MPUserProfile {
  return {
    User_ID: 1,
    User_GUID: "guid-1",
    Contact_ID: 101,
    First_Name: "Jonathan",
    Nickname: "Jon",
    Last_Name: "Doe",
    Email_Address: "jon@example.com",
    Mobile_Phone: null,
    Image_GUID: null,
    roles: [],
    userGroups: [],
    ...overrides,
  };
}

describe("UserMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders Nickname when present", () => {
    render(
      <UserMenu userProfile={makeProfile({ Nickname: "Jon" })}>
        <button>trigger</button>
      </UserMenu>
    );

    // Nickname + Last_Name rendered together with a literal space between.
    expect(screen.getByText(/Jon\s+Doe/)).toBeInTheDocument();
    // First_Name should not appear when Nickname is present.
    expect(screen.queryByText(/Jonathan\s+Doe/)).not.toBeInTheDocument();
  });

  it("falls back to First_Name when Nickname is empty", () => {
    render(
      <UserMenu
        userProfile={makeProfile({ Nickname: "", First_Name: "Jonathan" })}
      >
        <button>trigger</button>
      </UserMenu>
    );

    expect(screen.getByText(/Jonathan\s+Doe/)).toBeInTheDocument();
  });

  it("renders Email_Address when present and does not crash when null", () => {
    const { unmount } = render(
      <UserMenu userProfile={makeProfile({ Email_Address: "jon@example.com" })}>
        <button>trigger</button>
      </UserMenu>
    );
    expect(screen.getByText("jon@example.com")).toBeInTheDocument();
    unmount();

    // Null Email_Address must not throw during render.
    expect(() =>
      render(
        <UserMenu userProfile={makeProfile({ Email_Address: null })}>
          <button>trigger</button>
        </UserMenu>
      )
    ).not.toThrow();
  });

  it("invokes onClose before handleSignOut when Sign out is clicked", async () => {
    const callOrder: string[] = [];
    const onClose = vi.fn(() => {
      callOrder.push("onClose");
    });
    mockHandleSignOut.mockImplementation(async () => {
      callOrder.push("handleSignOut");
    });

    render(
      <UserMenu userProfile={makeProfile()} onClose={onClose}>
        <button>trigger</button>
      </UserMenu>
    );

    const signOut = screen.getByRole("button", { name: /sign out/i });
    await act(async () => {
      signOut.click();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockHandleSignOut).toHaveBeenCalledTimes(1);
    expect(callOrder).toEqual(["onClose", "handleSignOut"]);
  });

  it("still signs out when onClose is omitted", async () => {
    mockHandleSignOut.mockResolvedValueOnce(undefined);

    render(
      <UserMenu userProfile={makeProfile()}>
        <button>trigger</button>
      </UserMenu>
    );

    const signOut = screen.getByRole("button", { name: /sign out/i });
    await act(async () => {
      signOut.click();
    });

    expect(mockHandleSignOut).toHaveBeenCalledTimes(1);
  });
});
