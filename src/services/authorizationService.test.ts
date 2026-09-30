import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockGetSession, mockGetTableRecords } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGetTableRecords: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: mockGetSession } },
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock('@/lib/providers/ministry-platform', () => ({
  MPHelper: class {
    getTableRecords = mockGetTableRecords;
  },
}));

// React's `cache()` is a no-op outside a request scope; identity-map it so the
// service's per-request memoization doesn't mask repeated MP reads in tests.
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return { ...actual, cache: <T,>(fn: T) => fn };
});

import { AuthorizationService, UnauthorizedError, resolveRolePolicy } from './authorizationService';

const GUID = '550e8400-e29b-41d4-a716-446655440000';
const signedIn = { user: { id: 'ba-1', userGuid: GUID } };

/** dp_Users lookup, then dp_User_Roles lookup. */
function mpReturns(userId: number | null, roles: string[]) {
  mockGetTableRecords.mockImplementation(async ({ table }: { table: string }) => {
    if (table === 'dp_Users') return userId === null ? [] : [{ User_ID: userId }];
    if (table === 'dp_User_Roles') return roles.map((Role_Name) => ({ Role_Name }));
    return [];
  });
}

describe('AuthorizationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (AuthorizationService as unknown as { instance?: unknown }).instance = undefined;
    // `*` = any MP security role. Tests of the unset / blank / list policies
    // override this explicitly; see 'MP_SECURITY_ROLES policy (fails closed)'.
    process.env.MP_SECURITY_ROLES = '*';
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.MP_SECURITY_ROLES;
  });

  const gate = () => AuthorizationService.getInstance();
  const readCtx = { table: 'Contacts', operation: 'read' as const };
  const writeCtx = { table: 'Groups', operation: 'update' as const };

  describe('requireSecurityRole', () => {
    it('returns the acting MP User_ID when the user holds any role and MP_SECURITY_ROLES is *', async () => {
      mockGetSession.mockResolvedValue(signedIn);
      mpReturns(42, ['Administrators']);

      await expect(gate().requireSecurityRole(readCtx)).resolves.toBe(42);
    });

    it('permits when the user holds one of the configured roles', async () => {
      process.env.MP_SECURITY_ROLES = 'Tools Users, Administrators';
      mockGetSession.mockResolvedValue(signedIn);
      mpReturns(42, ['Administrators']);

      await expect(gate().requireSecurityRole(readCtx)).resolves.toBe(42);
    });

    it('matches configured roles case-insensitively', async () => {
      process.env.MP_SECURITY_ROLES = 'tools users';
      mockGetSession.mockResolvedValue(signedIn);
      mpReturns(42, ['Tools Users']);

      await expect(gate().requireSecurityRole(readCtx)).resolves.toBe(42);
    });

    it('REFUSES a signed-in MP user holding none of the configured roles', async () => {
      // The core of the finding: MP's OIDC endpoint authenticates ANY dp_Users
      // record, so a valid session proves nothing about authorization.
      process.env.MP_SECURITY_ROLES = 'Tools Users';
      mockGetSession.mockResolvedValue(signedIn);
      mpReturns(42, ['Some Unrelated Role']);

      await expect(gate().requireSecurityRole(readCtx)).rejects.toThrow(UnauthorizedError);
    });

    it('REFUSES a signed-in MP user with no security roles at all', async () => {
      mockGetSession.mockResolvedValue(signedIn);
      mpReturns(42, []);

      await expect(gate().requireSecurityRole(readCtx)).rejects.toThrow(UnauthorizedError);
    });

    it('fails closed when there is no session', async () => {
      mockGetSession.mockResolvedValue(null);

      await expect(gate().requireSecurityRole(readCtx)).rejects.toThrow(UnauthorizedError);
      expect(mockGetTableRecords).not.toHaveBeenCalled();
    });

    it('fails closed when the session carries no userGuid', async () => {
      mockGetSession.mockResolvedValue({ user: { id: 'ba-1' } });

      await expect(gate().requireSecurityRole(readCtx)).rejects.toThrow(UnauthorizedError);
    });

    it('fails closed when the userGuid resolves to no dp_Users row', async () => {
      mockGetSession.mockResolvedValue(signedIn);
      mpReturns(null, []);

      await expect(gate().requireSecurityRole(readCtx)).rejects.toThrow(UnauthorizedError);
    });

    it('RETHROWS infrastructure failures instead of reporting them as a refusal', async () => {
      // A caller must never mistake "MP is unreachable" for "this user is not
      // allowed" — the two demand very different responses.
      mockGetSession.mockResolvedValue(signedIn);
      mockGetTableRecords.mockRejectedValue(new Error('ConnectTimeoutError'));

      const err = await gate()
        .requireSecurityRole(readCtx)
        .catch((e) => e);

      expect(err).toBeInstanceOf(Error);
      expect(err).not.toBeInstanceOf(UnauthorizedError);
      expect(err.message).toBe('ConnectTimeoutError');
    });

    it('logs a structured read denial carrying identifiers only', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockGetSession.mockResolvedValue(signedIn);
      mpReturns(42, []);

      await gate().requireSecurityRole(readCtx).catch(() => {});

      expect(warn).toHaveBeenCalledWith(
        'mp.read.unauthorized',
        expect.objectContaining({ table: 'Contacts', operation: 'read' }),
      );
      // No record content, no filter strings.
      const payload = JSON.stringify(warn.mock.calls[0][1]);
      expect(payload).not.toContain(GUID);
    });

    it('logs a structured write denial under the write event name', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockGetSession.mockResolvedValue(signedIn);
      mpReturns(42, []);

      await gate().requireSecurityRole(writeCtx).catch(() => {});

      expect(warn).toHaveBeenCalledWith(
        'mp.write.unauthorized',
        expect.objectContaining({ table: 'Groups', operation: 'update' }),
      );
    });

    it('emits mp.write.non_user when no acting MP user could be resolved', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockGetSession.mockResolvedValue(signedIn);
      mpReturns(null, []);

      await gate().requireSecurityRole(writeCtx).catch(() => {});

      expect(warn).toHaveBeenCalledWith('mp.write.non_user', expect.any(Object));
    });
  });

  describe('hasSecurityRole', () => {
    it('returns true when permitted', async () => {
      mockGetSession.mockResolvedValue(signedIn);
      mpReturns(42, ['Administrators']);

      await expect(gate().hasSecurityRole()).resolves.toBe(true);
    });

    it('returns false instead of throwing when refused', async () => {
      mockGetSession.mockResolvedValue(signedIn);
      mpReturns(42, []);

      await expect(gate().hasSecurityRole()).resolves.toBe(false);
    });

    it('fails closed on an infrastructure error', async () => {
      mockGetSession.mockResolvedValue(signedIn);
      mockGetTableRecords.mockRejectedValue(new Error('boom'));

      await expect(gate().hasSecurityRole()).resolves.toBe(false);
    });

    it('does not log — it is an affordance check, not an enforcement point', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockGetSession.mockResolvedValue(signedIn);
      mpReturns(42, []);

      await gate().hasSecurityRole();

      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe('MP_SECURITY_ROLES policy (fails closed)', () => {
    // Adversarial: before 2026-09-30 a blank/unset value meant "any role will
    // do", so a deployment that forgot the variable silently let every MP user
    // holding ANY security role in. Each refusal below fails if that returns.
    it.each([
      ['unset', undefined],
      ['blank', ''],
      ['whitespace', '   '],
      ['only commas', ','],
      ['commas and spaces', ' , , '],
    ])('REFUSES everyone when the variable is %s', async (_label, value) => {
      if (value === undefined) delete process.env.MP_SECURITY_ROLES;
      else process.env.MP_SECURITY_ROLES = value;
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockGetSession.mockResolvedValue(signedIn);
      mpReturns(42, ['Administrators']);

      await expect(gate().requireSecurityRole(readCtx)).rejects.toThrow(UnauthorizedError);
      await expect(gate().hasSecurityRole()).resolves.toBe(false);
      expect(warn).toHaveBeenCalledWith(
        'mp.read.unauthorized',
        expect.objectContaining({ reason: 'roles_not_configured', userId: 42 }),
      );
      // No role read is wasted on an app that refuses everyone.
      expect(mockGetTableRecords).not.toHaveBeenCalledWith(
        expect.objectContaining({ table: 'dp_User_Roles' }),
      );
    });

    it('permits any role holder when the variable is * (surrounding whitespace ignored)', async () => {
      process.env.MP_SECURITY_ROLES = '  *  ';
      mockGetSession.mockResolvedValue(signedIn);
      mpReturns(42, ['Some Unrelated Role']);

      await expect(gate().requireSecurityRole(readCtx)).resolves.toBe(42);
    });

    it('still refuses a user with NO role when the variable is *', async () => {
      process.env.MP_SECURITY_ROLES = '*';
      mockGetSession.mockResolvedValue(signedIn);
      mpReturns(42, []);

      await expect(gate().requireSecurityRole(readCtx)).rejects.toThrow(UnauthorizedError);
    });

    it('treats * inside a list as a literal name, not a wildcard', async () => {
      process.env.MP_SECURITY_ROLES = 'Administrators,*';
      mockGetSession.mockResolvedValue(signedIn);
      mpReturns(42, ['Some Unrelated Role']);

      await expect(gate().requireSecurityRole(readCtx)).rejects.toThrow(UnauthorizedError);
    });

    it('ignores empty entries in a list', async () => {
      process.env.MP_SECURITY_ROLES = ',Tools Users,,';
      mockGetSession.mockResolvedValue(signedIn);
      mpReturns(42, ['tools users']);

      await expect(gate().requireSecurityRole(readCtx)).resolves.toBe(42);
    });
  });

  describe('resolveRolePolicy', () => {
    it.each([
      ['', { kind: 'unconfigured' }],
      [',', { kind: 'unconfigured' }],
      ['*', { kind: 'any' }],
      [' A , b ', { kind: 'list', names: ['a', 'b'] }],
      ['A,*', { kind: 'list', names: ['a', '*'] }],
    ])('parses %j', (raw, expected) => {
      expect(resolveRolePolicy(raw)).toEqual(expected);
    });

    it('reads MP_SECURITY_ROLES when called without an argument, unset = unconfigured', () => {
      delete process.env.MP_SECURITY_ROLES;
      expect(resolveRolePolicy()).toEqual({ kind: 'unconfigured' });
    });
  });

  it('escapes the userGuid into the dp_Users filter via validateGuid', async () => {
    // A malformed/injected guid must be rejected before it reaches a $filter.
    mockGetSession.mockResolvedValue({ user: { id: 'ba-1', userGuid: "' OR 1=1--" } });

    await expect(gate().requireSecurityRole(readCtx)).rejects.toThrow();
    expect(mockGetTableRecords).not.toHaveBeenCalled();
  });
});
