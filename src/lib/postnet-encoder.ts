/**
 * POSTNET barcode encoder.
 *
 * Encodes a ZIP, ZIP+4, or ZIP+4+delivery point string into
 * an array of bar heights: 'tall' or 'short'.
 *
 * Input: 5, 9, or 11 digit string (digits only, no dashes)
 * Output: Array of 'tall'|'short' bars including frame bars and check digit
 */

export type PostnetBar = 'tall' | 'short';

// Each digit maps to 5 bars (2 tall, 3 short)
const DIGIT_TABLE: Record<string, PostnetBar[]> = {
  '0': ['tall', 'tall', 'short', 'short', 'short'],
  '1': ['short', 'short', 'short', 'tall', 'tall'],
  '2': ['short', 'short', 'tall', 'short', 'tall'],
  '3': ['short', 'short', 'tall', 'tall', 'short'],
  '4': ['short', 'tall', 'short', 'short', 'tall'],
  '5': ['short', 'tall', 'short', 'tall', 'short'],
  '6': ['short', 'tall', 'tall', 'short', 'short'],
  '7': ['tall', 'short', 'short', 'short', 'tall'],
  '8': ['tall', 'short', 'short', 'tall', 'short'],
  '9': ['tall', 'short', 'tall', 'short', 'short'],
};

/**
 * Encode a routing code string into POSTNET bars.
 * @param input 5, 9, or 11 digits (ZIP, ZIP+4, or ZIP+4+DP)
 */
export function postnetEncode(input: string): PostnetBar[] {
  const digits = input.replace(/-/g, '').trim();

  if (!/^\d+$/.test(digits)) {
    throw new Error('POSTNET input must contain only digits');
  }

  if (![5, 9, 11].includes(digits.length)) {
    throw new Error(`POSTNET input must be 5, 9, or 11 digits (got ${digits.length})`);
  }

  // Calculate check digit: (10 - (sum of digits % 10)) % 10
  const sum = digits.split('').reduce((acc, d) => acc + parseInt(d, 10), 0);
  const checkDigit = ((10 - (sum % 10)) % 10).toString();

  const allDigits = digits + checkDigit;

  // Build bars: frame bar + digit bars + frame bar
  const bars: PostnetBar[] = ['tall']; // leading frame bar

  for (const digit of allDigits) {
    bars.push(...DIGIT_TABLE[digit]);
  }

  bars.push('tall'); // trailing frame bar

  return bars;
}
