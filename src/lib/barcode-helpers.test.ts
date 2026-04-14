import { describe, it, expect } from 'vitest';
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
  });
});
