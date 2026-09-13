import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isValidElement } from 'react';

/**
 * ToolsLayout Tests
 *
 * This layout is the page-level authorization gate for every route under
 * /tools. React renders a layout before its children, so a redirect() here
 * means no tool page component ever runs.
 *
 * It is the UX layer, not the security control — enforcement lives in the
 * server actions and service methods. These tests pin both halves of that
 * contract: that a permitted user gets their children rendered, and that a
 * non-permitted user is redirected to /no-access before children are touched.
 */

const { mockHasSecurityRole, mockRedirect } = vi.hoisted(() => ({
  mockHasSecurityRole: vi.fn(),
  mockRedirect: vi.fn((url: string) => {
    // redirect() throws in real Next.js to abort rendering; mirror that so
    // code after it doesn't execute in tests.
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));

vi.mock('@/services/authorizationService', () => ({
  AuthorizationService: {
    getInstance: vi.fn(() => ({
      hasSecurityRole: mockHasSecurityRole,
    })),
  },
}));

import ToolsLayout from './layout';

describe('ToolsLayout authorization gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children when the user holds a security role', async () => {
    mockHasSecurityRole.mockResolvedValueOnce(true);

    const result = await ToolsLayout({ children: 'tool-content' });

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(isValidElement(result)).toBe(true);
    expect(result.props.children).toBe('tool-content');
  });

  it('redirects to /no-access when the user holds no security role', async () => {
    mockHasSecurityRole.mockResolvedValueOnce(false);

    await expect(
      ToolsLayout({ children: 'tool-content' }),
    ).rejects.toThrow('NEXT_REDIRECT:/no-access');

    expect(mockRedirect).toHaveBeenCalledExactlyOnceWith('/no-access');
  });

  it('consults the authorization service exactly once per render', async () => {
    mockHasSecurityRole.mockResolvedValueOnce(true);

    await ToolsLayout({ children: 'tool-content' });

    expect(mockHasSecurityRole).toHaveBeenCalledTimes(1);
  });

  it('propagates an infrastructure failure rather than rendering the tool', async () => {
    // hasSecurityRole() is documented to fail closed and return false, but if
    // it ever throws, the gate must not fall through to rendering children.
    mockHasSecurityRole.mockRejectedValueOnce(new Error('MP unreachable'));

    await expect(
      ToolsLayout({ children: 'tool-content' }),
    ).rejects.toThrow('MP unreachable');

    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('does not evaluate children before the gate decides', async () => {
    // Children arrive as an already-constructed element tree, so the gate
    // cannot "skip" work — but it must not pass them through on denial.
    mockHasSecurityRole.mockResolvedValueOnce(false);

    await expect(
      ToolsLayout({ children: 'tool-content' }),
    ).rejects.toThrow(/NEXT_REDIRECT/);
  });
});
