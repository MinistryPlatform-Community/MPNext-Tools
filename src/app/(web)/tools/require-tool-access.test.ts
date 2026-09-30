import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const { mockRequireSecurityRole, mockRedirect, FakeUnauthorizedError } = vi.hoisted(() => ({
  mockRequireSecurityRole: vi.fn(),
  mockRedirect: vi.fn((url: string) => {
    // redirect() throws in real Next.js to abort rendering; mirror that.
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  FakeUnauthorizedError: class UnauthorizedError extends Error {},
}));

vi.mock('next/navigation', () => ({ redirect: mockRedirect }));

vi.mock('@/services/authorizationService', () => ({
  AuthorizationService: {
    getInstance: () => ({ requireSecurityRole: mockRequireSecurityRole }),
  },
  UnauthorizedError: FakeUnauthorizedError,
}));

import { requireToolAccess } from './require-tool-access';

const ctx = { table: 'Groups', operation: 'read' as const };

describe('requireToolAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the acting User_ID when permitted, without redirecting', async () => {
    mockRequireSecurityRole.mockResolvedValueOnce(42);

    await expect(requireToolAccess(ctx)).resolves.toBe(42);
    expect(mockRequireSecurityRole).toHaveBeenCalledWith(ctx);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('redirects a refused caller to /no-access', async () => {
    mockRequireSecurityRole.mockRejectedValueOnce(new FakeUnauthorizedError());

    await expect(requireToolAccess(ctx)).rejects.toThrow('NEXT_REDIRECT:/no-access');
  });

  it('rethrows an infrastructure failure instead of reporting it as no-access', async () => {
    mockRequireSecurityRole.mockRejectedValueOnce(new Error('ConnectTimeoutError'));

    await expect(requireToolAccess(ctx)).rejects.toThrow('ConnectTimeoutError');
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});

/**
 * Structural guard: every tool page must gate ITSELF. The tools layout's
 * redirect does not stop a page segment from rendering in Next 16, so a new
 * tool page that forgets the call would render (and fetch) for a role-less
 * user. This fails if any page.tsx under tools/ lacks the gate, or calls it
 * after parsing params.
 */
describe('every tool page self-gates', () => {
  const toolsDir = path.resolve(__dirname);
  const pages = ['addeditfamily', 'addresslabels', 'fieldmanagement', 'groupwizard', 'template', 'templateeditor'];

  it('covers every tool directory', async () => {
    const { readdirSync, existsSync } = await import('node:fs');
    const found = readdirSync(toolsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(path.join(toolsDir, d.name, 'page.tsx')))
      .map((d) => d.name)
      .sort();
    expect(found).toEqual([...pages].sort());
  });

  it.each(pages)('%s/page.tsx awaits requireToolAccess before parseToolParams', (dir) => {
    const src = readFileSync(path.join(toolsDir, dir, 'page.tsx'), 'utf8');
    const gate = src.indexOf('await requireToolAccess(');
    const parse = src.indexOf('parseToolParams(await');
    expect(gate).toBeGreaterThan(-1);
    expect(parse).toBeGreaterThan(gate);
  });
});
