import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * `compileMjml` gates through AuthorizationService.requireSecurityRole rather
 * than a bare session check (CLAUDE.md rule 12). The default implementation
 * resolves so happy-path tests don't need to think about auth; individual
 * tests override it with a rejection to prove the gate actually blocks.
 */
const { mockRequireSecurityRole } = vi.hoisted(() => ({
  mockRequireSecurityRole: vi.fn(),
}));

vi.mock('@/services/authorizationService', () => ({
  AuthorizationService: {
    getInstance: () => ({
      requireSecurityRole: mockRequireSecurityRole,
    }),
  },
}));

const { mockMjml2html } = vi.hoisted(() => ({
  mockMjml2html: vi.fn(),
}));

vi.mock('mjml', () => ({
  default: mockMjml2html,
}));

import { compileMjml } from './actions';

const VALID_MJML = '<mjml><mj-body><mj-section><mj-column><mj-text>Hi</mj-text></mj-column></mj-section></mj-body></mjml>';

describe('compileMjml', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSecurityRole.mockResolvedValue(42);
    mockMjml2html.mockResolvedValue({
      html: '<html>compiled</html>',
      errors: [],
    });
  });

  it('gates through AuthorizationService.requireSecurityRole for the dp_Tools table on read', async () => {
    await compileMjml(VALID_MJML);

    expect(mockRequireSecurityRole).toHaveBeenCalledWith({
      table: 'dp_Tools',
      operation: 'read',
    });
  });

  it('propagates rejection when the caller is not authorized', async () => {
    mockRequireSecurityRole.mockRejectedValueOnce(new Error('Not authorized'));

    await expect(compileMjml(VALID_MJML)).rejects.toThrow('Not authorized');
    expect(mockMjml2html).not.toHaveBeenCalled();
  });

  it('rejects an empty MJML source', async () => {
    await expect(compileMjml('')).rejects.toThrow(/must be between 1 and/);
    expect(mockMjml2html).not.toHaveBeenCalled();
  });

  it('rejects MJML source larger than the 500KB cap', async () => {
    const oversized = 'a'.repeat(512_001);
    await expect(compileMjml(oversized)).rejects.toThrow(/must be between 1 and/);
    expect(mockMjml2html).not.toHaveBeenCalled();
  });

  it('accepts MJML source right at the 500KB cap', async () => {
    const atCap = 'a'.repeat(512_000);
    await expect(compileMjml(atCap)).resolves.toBeDefined();
    expect(mockMjml2html).toHaveBeenCalledWith(atCap, {
      validationLevel: 'soft',
      minify: false,
    });
  });

  it('returns the compiled html and maps empty errors', async () => {
    const result = await compileMjml(VALID_MJML);

    expect(result).toEqual({
      html: '<html>compiled</html>',
      errors: [],
    });
  });

  it('maps mjml compile errors into the MjmlCompileError shape', async () => {
    mockMjml2html.mockResolvedValueOnce({
      html: '<html>partial</html>',
      errors: [
        {
          line: 3,
          message: 'Unknown tag',
          tagName: 'mj-bogus',
          formattedMessage: 'Line 3 of mj-bogus: Unknown tag',
        },
      ],
    });

    const result = await compileMjml(VALID_MJML);

    expect(result.errors).toEqual([
      {
        line: 3,
        message: 'Unknown tag',
        tagName: 'mj-bogus',
        formattedMessage: 'Line 3 of mj-bogus: Unknown tag',
      },
    ]);
  });
});
