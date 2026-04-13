import { describe, it, expect } from 'vitest';
import { postnetEncode } from './postnet-encoder';

describe('postnet-encoder', () => {
  it('should encode a 5-digit ZIP', () => {
    const bars = postnetEncode('32904');
    // 1 frame + 6 digits * 5 bars + 1 frame = 32 bars
    expect(bars).toHaveLength(32);
    expect(bars[0]).toBe('tall'); // leading frame
    expect(bars[bars.length - 1]).toBe('tall'); // trailing frame
  });

  it('should encode a 9-digit ZIP+4', () => {
    const bars = postnetEncode('329047322');
    // 1 frame + 10 digits * 5 bars + 1 frame = 52 bars
    expect(bars).toHaveLength(52);
  });

  it('should encode an 11-digit ZIP+4+DP', () => {
    const bars = postnetEncode('32904732220');
    // 1 frame + 12 digits * 5 bars + 1 frame = 62 bars
    expect(bars).toHaveLength(62);
  });

  it('should strip dashes from input', () => {
    const bars = postnetEncode('32904-7322');
    expect(bars).toHaveLength(52); // 9 digits + check = 10 * 5 + 2 frame
  });

  it('should calculate correct check digit', () => {
    // 3+2+9+0+4 = 18, check = (10 - 18%10)%10 = 2
    // So digit sequence is 3,2,9,0,4,2
    const bars = postnetEncode('32904');
    expect(bars).toHaveLength(32); // 6 digits * 5 + 2 frame
  });

  it('should throw for invalid length', () => {
    expect(() => postnetEncode('123')).toThrow();
    expect(() => postnetEncode('1234567')).toThrow(); // 7 digits
  });

  it('should throw for non-numeric input', () => {
    expect(() => postnetEncode('3290A')).toThrow();
  });

  it('should produce consistent output', () => {
    const r1 = postnetEncode('32904732220');
    const r2 = postnetEncode('32904732220');
    expect(r1).toEqual(r2);
  });

  it('should have exactly 2 tall bars per digit', () => {
    const bars = postnetEncode('32904');
    // Skip frame bars, check each group of 5
    for (let i = 0; i < 6; i++) { // 5 digits + 1 check digit
      const group = bars.slice(1 + i * 5, 1 + (i + 1) * 5);
      const tallCount = group.filter(b => b === 'tall').length;
      expect(tallCount).toBe(2);
    }
  });
});
