import { describe, it, expect, vi } from 'vitest';

vi.mock('@/services/authorizationService', () => ({
  AuthorizationService: {
    getInstance: () => ({ requireSecurityRole: vi.fn(async () => 1) }),
  },
  UnauthorizedError: class UnauthorizedError extends Error {},
}));

import PizZip from 'pizzip';
import { generateSampleTemplate } from './sample-template';
import { mergeTemplate } from './actions';
import type { LabelConfig } from '@/lib/dto';

/**
 * End-to-end through the REAL zip guard, PizZip and docxtemplater (actions.test.ts
 * mocks all three). Proves the guard accepts a genuine Word archive and that a
 * bomb is stopped before PizZip is reached.
 */
const config: LabelConfig = {
  stockId: '5160',
  addressMode: 'household',
  startPosition: 1,
  includeMissingBarcodes: true,
  barcodeFormat: 'none',
  mailerId: '',
  serviceType: '040',
};
const labels = [{ name: 'Jane Doe', addressLine1: '1 Main St', city: 'Springfield', state: 'IL', postalCode: '62704' }];

describe('mergeTemplate (integration)', () => {
  it('merges the bundled sample template', async () => {
    const template = await generateSampleTemplate();
    const result = await mergeTemplate(template, labels, config);
    expect(result.success).toBe(true);
    if (!result.success) return;
    const xml = new PizZip(Buffer.from(result.data, 'base64')).file('word/document.xml')!.asText();
    expect(xml).toContain('Jane Doe');
  });

  it('rejects a zip bomb before decompressing it', async () => {
    // An entry whose header understates its size: the shape that gets past a
    // declared-size check and would make PizZip inflate it in full. (The
    // honest-but-huge case is covered in src/lib/zip-guard.test.ts.)
    const zip = new PizZip();
    zip.file('word/document.xml', Buffer.alloc(4 * 1024 * 1024));
    const buf = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
    const central = buf.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
    buf.writeUInt32LE(100, central + 24);
    const template = buf.toString('base64');
    const result = await mergeTemplate(template, labels, config);
    expect(result).toEqual({ success: false, error: 'Template is too large when uncompressed' });
  });
});
