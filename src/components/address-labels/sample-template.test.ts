import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PizZip from 'pizzip';

const mockRequireSecurityRole = vi.hoisted(() => vi.fn());

vi.mock('@/services/authorizationService', () => ({
  AuthorizationService: {
    getInstance: () => ({
      requireSecurityRole: mockRequireSecurityRole,
    }),
  },
  UnauthorizedError: class UnauthorizedError extends Error {},
}));

import { generateSampleTemplate } from './sample-template';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('generateSampleTemplate', () => {
  beforeEach(() => {
    mockRequireSecurityRole.mockReset();
    mockRequireSecurityRole.mockResolvedValue(42);
  });

  it('authorizes a Contacts read before building the template', async () => {
    await generateSampleTemplate();
    expect(mockRequireSecurityRole).toHaveBeenCalledWith({
      table: 'Contacts',
      operation: 'read',
    });
  });

  it('rejects when the security role gate refuses', async () => {
    mockRequireSecurityRole.mockRejectedValueOnce(new Error('Unauthorized'));
    await expect(generateSampleTemplate()).rejects.toThrow('Unauthorized');
  });

  it('returns a base64-encoded .docx zip containing the merge tokens', async () => {
    const base64 = await generateSampleTemplate();
    expect(typeof base64).toBe('string');
    expect(base64.length).toBeGreaterThan(0);

    const buffer = Buffer.from(base64, 'base64');
    // A valid .docx is a zip archive — verify it parses and carries the
    // expected merge-token content in its main document part.
    const zip = new PizZip(buffer);
    const documentXml = zip.file('word/document.xml')?.asText() ?? '';
    expect(documentXml).toContain('{#addresses}');
    expect(documentXml).toContain('{Name}');
    expect(documentXml).toContain('{AddressLine1}');
    expect(documentXml).toContain('{#AddressLine2}');
    expect(documentXml).toContain('{City}, {State}');
    expect(documentXml).toContain('{PostalCode}');
    expect(documentXml).toContain('{%Barcode}');
    expect(documentXml).toContain('{#isNotLast}');
    expect(documentXml).toContain('{/addresses}');
  });
});
