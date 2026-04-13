/**
 * USPS Intelligent Mail Barcode (IMb) Encoder
 *
 * Implements the USPS-B-3200 specification for encoding tracking/routing
 * data into a 65-bar 4-state barcode. Each bar is one of:
 *   T (tracker) - short center bar
 *   D (descender) - extends below center
 *   A (ascender) - extends above center
 *   F (full) - extends both above and below center
 *
 * Reference: USPS-B-3200 "Intelligent Mail Barcode 4-State Specification"
 */

/** The four possible bar states in an Intelligent Mail Barcode. */
export type BarState = 'T' | 'D' | 'A' | 'F';

// ---------------------------------------------------------------------------
// Bar-to-character mapping table (65 entries from USPS-B-3200 spec)
// Each entry: [descender_char_index, descender_bit, ascender_char_index, ascender_bit]
// Characters A-J map to indices 0-9.
// ---------------------------------------------------------------------------
const BAR_TABLE: readonly [number, number, number, number][] = [
  [7, 2, 4, 3],   // bar 0:  H 2 E 3
  [1, 10, 0, 0],  // bar 1:  B 10 A 0
  [9, 12, 2, 8],  // bar 2:  J 12 C 8
  [5, 5, 6, 11],  // bar 3:  F 5 G 11
  [8, 9, 3, 1],   // bar 4:  I 9 D 1
  [0, 1, 5, 12],  // bar 5:  A 1 F 12
  [2, 5, 1, 8],   // bar 6:  C 5 B 8
  [4, 4, 9, 11],  // bar 7:  E 4 J 11
  [6, 3, 8, 10],  // bar 8:  G 3 I 10
  [3, 9, 7, 6],   // bar 9:  D 9 H 6
  [5, 11, 1, 4],  // bar 10: F 11 B 4
  [8, 5, 2, 12],  // bar 11: I 5 C 12
  [9, 10, 0, 2],  // bar 12: J 10 A 2
  [7, 1, 6, 7],   // bar 13: H 1 G 7
  [3, 6, 4, 9],   // bar 14: D 6 E 9
  [0, 3, 8, 6],   // bar 15: A 3 I 6
  [6, 4, 2, 7],   // bar 16: G 4 C 7
  [1, 1, 9, 9],   // bar 17: B 1 J 9
  [7, 10, 5, 2],  // bar 18: H 10 F 2
  [4, 0, 3, 8],   // bar 19: E 0 D 8
  [6, 2, 0, 4],   // bar 20: G 2 A 4
  [8, 11, 1, 0],  // bar 21: I 11 B 0
  [9, 8, 3, 12],  // bar 22: J 8 D 12
  [2, 6, 7, 7],   // bar 23: C 6 H 7
  [5, 1, 4, 10],  // bar 24: F 1 E 10
  [1, 12, 6, 9],  // bar 25: B 12 G 9
  [7, 3, 8, 0],   // bar 26: H 3 I 0
  [5, 8, 9, 7],   // bar 27: F 8 J 7
  [4, 6, 2, 10],  // bar 28: E 6 C 10
  [3, 4, 0, 5],   // bar 29: D 4 A 5
  [8, 4, 5, 7],   // bar 30: I 4 F 7
  [7, 11, 1, 9],  // bar 31: H 11 B 9
  [6, 0, 9, 6],   // bar 32: G 0 J 6
  [0, 6, 4, 8],   // bar 33: A 6 E 8
  [2, 1, 3, 2],   // bar 34: C 1 D 2
  [5, 9, 8, 12],  // bar 35: F 9 I 12
  [4, 11, 6, 1],  // bar 36: E 11 G 1
  [9, 5, 7, 4],   // bar 37: J 5 H 4
  [3, 3, 1, 2],   // bar 38: D 3 B 2
  [0, 7, 2, 0],   // bar 39: A 7 C 0
  [1, 3, 4, 1],   // bar 40: B 3 E 1
  [6, 10, 3, 5],  // bar 41: G 10 D 5
  [8, 7, 9, 4],   // bar 42: I 7 J 4
  [2, 11, 5, 6],  // bar 43: C 11 F 6
  [0, 8, 7, 12],  // bar 44: A 8 H 12
  [4, 2, 8, 1],   // bar 45: E 2 I 1
  [5, 10, 3, 0],  // bar 46: F 10 D 0
  [9, 3, 0, 9],   // bar 47: J 3 A 9
  [6, 5, 2, 4],   // bar 48: G 5 C 4
  [7, 8, 1, 7],   // bar 49: H 8 B 7
  [5, 0, 4, 5],   // bar 50: F 0 E 5
  [2, 3, 0, 10],  // bar 51: C 3 A 10
  [6, 12, 9, 2],  // bar 52: G 12 J 2
  [3, 11, 1, 6],  // bar 53: D 11 B 6
  [8, 8, 7, 9],   // bar 54: I 8 H 9
  [5, 4, 0, 11],  // bar 55: F 4 A 11
  [1, 5, 2, 2],   // bar 56: B 5 C 2
  [9, 1, 4, 12],  // bar 57: J 1 E 12
  [8, 3, 6, 6],   // bar 58: I 3 G 6
  [7, 0, 3, 7],   // bar 59: H 0 D 7
  [4, 7, 7, 5],   // bar 60: E 7 H 5
  [0, 12, 1, 11], // bar 61: A 12 B 11
  [2, 9, 9, 0],   // bar 62: C 9 J 0
  [6, 8, 5, 3],   // bar 63: G 8 F 3
  [3, 10, 8, 2],  // bar 64: D 10 I 2
];

// ---------------------------------------------------------------------------
// 5-of-13 and 2-of-13 lookup table generation
// ---------------------------------------------------------------------------

/**
 * Reverse the bits of a 16-bit unsigned integer.
 */
function reverseUint16(value: number): number {
  let rev = 0;
  let v = value;
  for (let i = 0; i < 16; i++) {
    rev = (rev << 1) | (v & 1);
    v >>= 1;
  }
  return rev;
}

/**
 * Build the N-of-13 lookup table as described in the USPS spec.
 * For n=5, length=1287 (C(13,5) entries).
 * For n=2, length=78 (C(13,2) entries).
 *
 * The table is built by iterating through all 13-bit values (0..8191),
 * selecting those with exactly n bits set, and placing them in a
 * specific order: non-palindromic pairs fill from the low end,
 * palindromic (symmetric) values fill from the high end.
 */
function initNof13Table(n: number, tableLength: number): number[] {
  const table = new Array<number>(tableLength).fill(0);
  let indexLow = 0;
  let indexHi = tableLength - 1;

  for (let i = 0; i < 8192; i++) {
    // Count bits set
    let bitCount = 0;
    let tmp = i;
    while (tmp) {
      bitCount += tmp & 1;
      tmp >>= 1;
    }

    if (bitCount !== n) {
      continue;
    }

    // Reverse the 13-bit value (reverse 16 bits, then shift right 3)
    const reverse = reverseUint16(i) >> 3;

    // Skip if we already visited this pair (reverse < i means we saw it before)
    if (reverse < i) {
      continue;
    }

    if (i === reverse) {
      // Symmetric: place at the high end
      table[indexHi] = i;
      indexHi--;
    } else {
      // Non-symmetric: place pair at the low end
      table[indexLow] = i;
      indexLow++;
      table[indexLow] = reverse;
      indexLow++;
    }
  }

  return table;
}

// Pre-compute the lookup tables
const TABLE_5_OF_13 = initNof13Table(5, 1287);
const TABLE_2_OF_13 = initNof13Table(2, 78);

// ---------------------------------------------------------------------------
// CRC-11 computation
// ---------------------------------------------------------------------------

/** CRC-11 generator polynomial from the USPS spec. */
const CRC11_GENERATOR_POLY = 0x0f35;

/** Initial CRC-11 value (all 11 bits set). */
const CRC11_INIT = 0x07ff;

/**
 * Compute the 11-bit CRC Frame Check Sequence over 13 bytes of data.
 * The algorithm processes bytes MSB-first, skipping the 2 most significant
 * bits of the first byte (since the data is 102 bits = 12 bytes + 6 bits).
 */
function crc11(bytes: number[]): number {
  let fcs = CRC11_INIT;

  // Process the first byte, skipping the 2 most significant bits
  let data = bytes[0] << 5;
  for (let bit = 2; bit < 8; bit++) {
    if ((fcs ^ data) & 0x400) {
      fcs = (fcs << 1) ^ CRC11_GENERATOR_POLY;
    } else {
      fcs = fcs << 1;
    }
    fcs &= 0x7ff;
    data <<= 1;
  }

  // Process the remaining 12 bytes
  for (let byteIdx = 1; byteIdx < 13; byteIdx++) {
    data = bytes[byteIdx] << 3;
    for (let bit = 0; bit < 8; bit++) {
      if ((fcs ^ data) & 0x400) {
        fcs = (fcs << 1) ^ CRC11_GENERATOR_POLY;
      } else {
        fcs = fcs << 1;
      }
      fcs &= 0x7ff;
      data <<= 1;
    }
  }

  return fcs;
}

// ---------------------------------------------------------------------------
// BigInt-to-bytes conversion
// ---------------------------------------------------------------------------

/**
 * Convert a BigInt value to an array of bytes (big-endian), padded to nbytes.
 */
function bigintToBytes(val: bigint, nbytes: number): number[] {
  const bytes: number[] = [];
  let v = val;
  for (let i = 0; i < nbytes; i++) {
    bytes.push(Number(v & 0xffn));
    v >>= 8n;
  }
  bytes.reverse();
  return bytes;
}

// ---------------------------------------------------------------------------
// Routing code conversion
// ---------------------------------------------------------------------------

/**
 * Convert the routing portion (ZIP code) of the input into a numeric value.
 * - Empty (0 digits): 0
 * - 5-digit ZIP: zip + 1
 * - 9-digit ZIP+4: zip + 100001
 * - 11-digit ZIP+4+DP: zip + 1000100001
 */
function convertRoutingCode(routing: string): bigint {
  if (routing.length === 0) {
    return 0n;
  } else if (routing.length === 5) {
    return BigInt(routing) + 1n;
  } else if (routing.length === 9) {
    return BigInt(routing) + 100001n;
  } else if (routing.length === 11) {
    return BigInt(routing) + 1000100001n;
  }
  throw new Error(`Invalid routing code length: ${routing.length}`);
}

// ---------------------------------------------------------------------------
// Tracking code conversion
// ---------------------------------------------------------------------------

/**
 * Combine the routing value with the 20-digit tracking code into
 * a single binary (BigInt) value using the USPS mixed-radix scheme.
 *
 * The first tracking digit is multiplied by 10, the second by 5,
 * and all remaining digits by 10 each.
 */
function convertTrackingCode(routingValue: bigint, tracking: string): bigint {
  let val = routingValue;
  val = val * 10n + BigInt(parseInt(tracking[0], 10));
  val = val * 5n + BigInt(parseInt(tracking[1], 10));
  for (let i = 2; i < 20; i++) {
    val = val * 10n + BigInt(parseInt(tracking[i], 10));
  }
  return val;
}

// ---------------------------------------------------------------------------
// Codeword generation (mixed-radix decomposition)
// ---------------------------------------------------------------------------

/**
 * Convert the binary payload into 10 codewords using mixed-radix division.
 * The last codeword uses modulo 636; the first 9 use modulo 1365.
 * Returns codewords in order [A, B, C, D, E, F, G, H, I, J].
 */
function binaryToCodewords(n: bigint): number[] {
  const codewords: number[] = [];
  let val = n;

  // Last codeword (J) uses mod 636
  let remainder = val % 636n;
  codewords.push(Number(remainder));
  val = val / 636n;

  // Remaining 9 codewords use mod 1365
  for (let i = 0; i < 9; i++) {
    remainder = val % 1365n;
    codewords.push(Number(remainder));
    val = val / 1365n;
  }

  // codewords is [J, I, H, G, F, E, D, C, B, A] - reverse to get [A..J]
  codewords.reverse();
  return codewords;
}

// ---------------------------------------------------------------------------
// Main encoder
// ---------------------------------------------------------------------------

/**
 * Encode a USPS Intelligent Mail Barcode from a numeric input string.
 *
 * @param input - A string of 20, 25, 29, or 31 digits:
 *   - 20 digits: tracking code only (no routing/ZIP)
 *   - 25 digits: tracking code + 5-digit ZIP
 *   - 29 digits: tracking code + 9-digit ZIP+4
 *   - 31 digits: tracking code + 11-digit ZIP+4+delivery point
 *
 * @returns An array of 65 BarState values representing the barcode.
 *
 * @throws Error if the input length is invalid or contains non-numeric characters.
 */
export function imbEncode(input: string): BarState[] {
  // Validate input
  if (!/^\d+$/.test(input)) {
    throw new Error('Input must contain only digits');
  }

  const validLengths = [20, 25, 29, 31];
  if (!validLengths.includes(input.length)) {
    throw new Error(
      `Input must be 20, 25, 29, or 31 digits (got ${input.length})`
    );
  }

  // Split into tracking (first 20 digits) and routing (remaining digits)
  const tracking = input.substring(0, 20);
  const routing = input.substring(20);

  // Step 1: Convert routing and tracking to binary value
  const routingValue = convertRoutingCode(routing);
  const binaryValue = convertTrackingCode(routingValue, tracking);

  // Step 2: Compute CRC-11 Frame Check Sequence
  const bytes = bigintToBytes(binaryValue, 13);
  const fcs = crc11(bytes);

  // Step 3: Convert binary value to 10 codewords
  const codewords = binaryToCodewords(binaryValue);

  // Step 4: Modify codewords per spec
  // Multiply last codeword (J, index 9) by 2
  codewords[9] *= 2;
  // If bit 10 of FCS is set, add 659 to first codeword (A, index 0)
  if (fcs & (1 << 10)) {
    codewords[0] += 659;
  }

  // Step 5: Convert codewords to 13-bit characters using lookup tables
  const characters: number[] = [];
  for (const cw of codewords) {
    if (cw <= 1286) {
      characters.push(TABLE_5_OF_13[cw]);
    } else if (cw >= 1287 && cw <= 1364) {
      characters.push(TABLE_2_OF_13[cw - 1287]);
    } else {
      throw new Error(`Codeword out of range: ${cw}`);
    }
  }

  // Step 6: Apply FCS bit-flipping to characters
  // For each of the lower 10 bits of FCS, if set, XOR the corresponding
  // character with 0x1FFF (flip all 13 bits)
  for (let i = 0; i < 10; i++) {
    if (fcs & (1 << i)) {
      characters[i] = characters[i] ^ 0x1fff;
    }
  }

  // Step 7: Map characters to 65 bars using the bar construction table
  const bars: BarState[] = [];
  for (let i = 0; i < 65; i++) {
    const [descChar, descBit, ascChar, ascBit] = BAR_TABLE[i];
    const descend = (characters[descChar] & (1 << descBit)) !== 0;
    const ascend = (characters[ascChar] & (1 << ascBit)) !== 0;

    if (descend && ascend) {
      bars.push('F');
    } else if (descend) {
      bars.push('D');
    } else if (ascend) {
      bars.push('A');
    } else {
      bars.push('T');
    }
  }

  return bars;
}
