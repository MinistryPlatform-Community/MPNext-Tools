import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildRoutingCode, buildImbTrackingCode, preEncodeBarcodes } from './barcode-helpers';
import type { LabelData, LabelConfig } from '@/lib/dto';

describe('barcode-helpers', () => {
  describe('buildRoutingCode', () => {
    it('should build 11-digit routing from ZIP+4 and delivery point', () => {
      expect(buildRoutingCode('32904-7322', '20')).toBe('32904732220');
    });

    it('should build 9-digit routing from ZIP+4 without delivery point', () => {
      expect(buildRoutingCode('32904-7322', undefined)).toBe('329047322');
    });

    it('should build 5-digit routing from ZIP only', () => {
      expect(buildRoutingCode('32904', undefined)).toBe('32904');
    });

    it('should strip dashes', () => {
      expect(buildRoutingCode('32904-7322', '20')).toBe('32904732220');
    });

    it('should pad single-digit delivery point', () => {
      expect(buildRoutingCode('32904', '6')).toBe('3290406');
    });

    it('should return empty string for no postal code', () => {
      expect(buildRoutingCode(undefined, '20')).toBe('');
    });
  });

  describe('buildImbTrackingCode', () => {
    it('should build 20-digit tracking code with 9-digit mailer ID', () => {
      const code = buildImbTrackingCode('901047256', '040', 1);
      expect(code).toBe('00040901047256000001');
      expect(code).toHaveLength(20);
    });

    it('should build 20-digit tracking code with 6-digit mailer ID', () => {
      const code = buildImbTrackingCode('123456', '040', 1);
      expect(code).toBe('00040123456000000001');
      expect(code).toHaveLength(20);
    });
  });

  describe('preEncodeBarcodes', () => {
    const baseLabel: LabelData = {
      name: 'Test', addressLine1: '123 Main',
      city: 'Test', state: 'TX', postalCode: '75001',
    };

    it('should return labels unchanged when format is none', () => {
      const config: LabelConfig = {
        stockId: '5160', addressMode: 'household', startPosition: 1,
        includeMissingBarcodes: true, barcodeFormat: 'none', mailerId: '', serviceType: '040',
      };
      const result = preEncodeBarcodes([baseLabel], config);
      expect(result[0].barStates).toBeUndefined();
    });

    it('should encode POSTNET from postal code', () => {
      const config: LabelConfig = {
        stockId: '5160', addressMode: 'household', startPosition: 1,
        includeMissingBarcodes: true, barcodeFormat: 'postnet', mailerId: '', serviceType: '040',
      };
      const result = preEncodeBarcodes([baseLabel], config);
      expect(result[0].barType).toBe('postnet');
      expect(result[0].barStates).toBeDefined();
    });

    it('should encode IMb when mailer ID is provided', () => {
      const config: LabelConfig = {
        stockId: '5160', addressMode: 'household', startPosition: 1,
        includeMissingBarcodes: true, barcodeFormat: 'imb', mailerId: '901047256', serviceType: '040',
      };
      const result = preEncodeBarcodes([baseLabel], config);
      expect(result[0].barType).toBe('imb');
      expect(result[0].barStates).toHaveLength(65);
    });

    describe('fallback branches', () => {
      let warnSpy: ReturnType<typeof vi.spyOn>;

      beforeEach(() => {
        warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      });

      afterEach(() => {
        warnSpy.mockRestore();
      });

      it('should log warning and fall back to POSTNET when IMb throws (invalid mailer ID length)', () => {
        // Mailer ID of length 5 produces a 19-digit tracking code (not 20/25/29/31) → imbEncode throws.
        const config: LabelConfig = {
          stockId: '5160', addressMode: 'household', startPosition: 1,
          includeMissingBarcodes: true, barcodeFormat: 'imb', mailerId: '12345', serviceType: '040',
        };
        const result = preEncodeBarcodes([baseLabel], config);

        expect(result[0].barType).toBe('postnet');
        expect(result[0].barStates).toBeDefined();
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy.mock.calls[0][0]).toContain('IMb encode failed');
        expect(warnSpy.mock.calls[0][0]).toContain('Test');
      });

      it('should log warning and produce no barcode when IMb fails and POSTNET also fails (invalid ZIP)', () => {
        // Non-numeric ZIP prevents any POSTNET encoding.
        const badZipLabel: LabelData = {
          ...baseLabel,
          postalCode: 'ABCDE',
        };
        const config: LabelConfig = {
          stockId: '5160', addressMode: 'household', startPosition: 1,
          includeMissingBarcodes: true, barcodeFormat: 'imb', mailerId: '12345', serviceType: '040',
        };
        const result = preEncodeBarcodes([badZipLabel], config);

        // No barcode produced — original label returned unchanged.
        expect(result[0].barStates).toBeUndefined();
        expect(result[0].barType).toBeUndefined();
        // One warn for IMb fallback + one for initial POSTNET failure + one for 5-digit retry failure = 3
        expect(warnSpy).toHaveBeenCalledTimes(3);
        expect(warnSpy.mock.calls[0][0]).toContain('IMb encode failed');
        expect(warnSpy.mock.calls[1][0]).toContain('POSTNET encode failed');
        expect(warnSpy.mock.calls[2][0]).toContain('POSTNET encode also failed');
      });

      it('should log warning and fall back to 5-digit ZIP when full-routing POSTNET throws', () => {
        // 11-digit routing with non-numeric deliveryPointCode → postnetEncode throws on full routing,
        // but retry with first-5 succeeds.
        const badDpLabel: LabelData = {
          ...baseLabel,
          postalCode: '32904-7322',
          deliveryPointCode: 'XY', // non-numeric DP breaks full routing
        };
        const config: LabelConfig = {
          stockId: '5160', addressMode: 'household', startPosition: 1,
          includeMissingBarcodes: true, barcodeFormat: 'postnet', mailerId: '', serviceType: '040',
        };
        const result = preEncodeBarcodes([badDpLabel], config);

        expect(result[0].barType).toBe('postnet');
        expect(result[0].barStates).toBeDefined();
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy.mock.calls[0][0]).toContain('POSTNET encode failed');
        expect(warnSpy.mock.calls[0][0]).toContain('retrying with 5-digit ZIP');
      });
    });
  });
});
