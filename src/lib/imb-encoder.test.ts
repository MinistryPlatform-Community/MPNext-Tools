import { describe, it, expect } from 'vitest';
import { imbEncode, type BarState } from './imb-encoder';

describe('imb-encoder', () => {
  it('should encode USPS spec example 4 (31-digit with routing)', () => {
    // This is "example 4" from the USPS-B-3200 spec:
    // barcode_id=01, service_type=234, mailer_id=567094,
    // serial=987654321, delivery_point_zip=01234567891
    const result = imbEncode('0123456709498765432101234567891');
    expect(result).toHaveLength(65);
    expect(result.join('')).toBe(
      'AADTFFDFTDADTAADAATFDTDDAAADDTDTTDAFADADDDTFFFDDTTTADFAAADFTDAADA'
    );
  });

  it('should encode a 20-digit tracking code (no routing)', () => {
    const result = imbEncode('01234567094987654321');
    expect(result).toHaveLength(65);
    result.forEach((bar) => {
      expect(['T', 'D', 'A', 'F']).toContain(bar);
    });
  });

  it('should encode a 25-digit code (tracking + 5-digit ZIP)', () => {
    const result = imbEncode('0123456709498765432112345');
    expect(result).toHaveLength(65);
    result.forEach((bar) => {
      expect(['T', 'D', 'A', 'F']).toContain(bar);
    });
  });

  it('should encode a 29-digit code (tracking + ZIP+4)', () => {
    const result = imbEncode('01234567094987654321123456789');
    expect(result).toHaveLength(65);
    result.forEach((bar) => {
      expect(['T', 'D', 'A', 'F']).toContain(bar);
    });
  });

  it('should encode a 31-digit code (tracking + ZIP+4 + delivery point)', () => {
    const result = imbEncode('0123456709498765432112345678901');
    expect(result).toHaveLength(65);
    result.forEach((bar) => {
      expect(['T', 'D', 'A', 'F']).toContain(bar);
    });
  });

  it('should throw for invalid input length', () => {
    expect(() => imbEncode('12345')).toThrow();
    expect(() => imbEncode('12345678901234567890123456789012')).toThrow();
    // 21 digits is invalid (not 20, 25, 29, or 31)
    expect(() => imbEncode('012345670949876543211')).toThrow();
  });

  it('should throw for non-numeric input', () => {
    expect(() => imbEncode('0123456709498765432A')).toThrow();
  });

  it('should produce consistent output for same input', () => {
    const input = '0123456709498765432101234567891';
    const result1 = imbEncode(input);
    const result2 = imbEncode(input);
    expect(result1).toEqual(result2);
  });

  it('should produce different output for different inputs', () => {
    const result1 = imbEncode('0123456709498765432101234567891');
    const result2 = imbEncode('0123456709498765432112345678901');
    expect(result1.join('')).not.toBe(result2.join(''));
  });

  it('should only contain valid bar states', () => {
    const validStates: BarState[] = ['T', 'D', 'A', 'F'];
    const result = imbEncode('0123456709498765432101234567891');
    for (const bar of result) {
      expect(validStates).toContain(bar);
    }
  });
});
