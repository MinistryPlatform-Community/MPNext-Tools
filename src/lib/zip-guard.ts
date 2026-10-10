import { inflateRawSync } from 'zlib';

/**
 * Pre-flight check for an uploaded ZIP container (a `.docx` template) BEFORE
 * it is handed to PizZip.
 *
 * PizZip trusts the sizes declared in the archive's own headers and inflates
 * each entry fully into memory before it compares the result against them, so
 * a few-hundred-KB "zip bomb" can expand to gigabytes inside the server
 * process. This walks the central directory independently and:
 *
 * 1. caps the entry count and the SUM of declared uncompressed sizes, then
 * 2. actually inflates every entry with `maxOutputLength` set to its declared
 *    size, so an entry that lies about its size fails at that size instead of
 *    expanding without bound.
 *
 * After this passes, PizZip's own decompression is bounded by `maxTotalBytes`.
 * ZIP64 archives, encryption and compression methods other than STORE/DEFLATE
 * are rejected — a Word template never needs them, and PizZip cannot read the
 * last two anyway.
 *
 * Errors name the failure mode only, never archive content.
 */
export interface ZipLimits {
  maxEntries: number;
  maxTotalBytes: number;
}

export class ZipLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZipLimitError';
  }
}

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const EOCD_MIN_LENGTH = 22;
const MAX_COMMENT_LENGTH = 0xffff;
const METHOD_STORE = 0;
const METHOD_DEFLATE = 8;
const FLAG_ENCRYPTED = 0x1;

function findEndOfCentralDirectory(buf: Buffer): number {
  const stop = Math.max(0, buf.length - EOCD_MIN_LENGTH - MAX_COMMENT_LENGTH);
  for (let i = buf.length - EOCD_MIN_LENGTH; i >= stop; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIGNATURE) return i;
  }
  throw new ZipLimitError('Not a valid .docx file');
}

export function assertZipWithinLimits(buf: Buffer, limits: ZipLimits): void {
  if (buf.length < EOCD_MIN_LENGTH) throw new ZipLimitError('Not a valid .docx file');

  const eocd = findEndOfCentralDirectory(buf);
  const entryCount = buf.readUInt16LE(eocd + 10);
  const directoryOffset = buf.readUInt32LE(eocd + 16);

  if (entryCount === 0xffff || directoryOffset === 0xffffffff) {
    throw new ZipLimitError('ZIP64 templates are not supported');
  }
  if (entryCount > limits.maxEntries) {
    throw new ZipLimitError('Template contains too many files');
  }

  // Pass 1: declared sizes only — cheap, and bounds pass 2.
  const entries: Array<{ method: number; compressed: number; uncompressed: number; localOffset: number }> = [];
  let declaredTotal = 0;
  let cursor = directoryOffset;
  for (let i = 0; i < entryCount; i++) {
    if (cursor + 46 > buf.length || buf.readUInt32LE(cursor) !== CENTRAL_SIGNATURE) {
      throw new ZipLimitError('Not a valid .docx file');
    }
    const flags = buf.readUInt16LE(cursor + 8);
    const method = buf.readUInt16LE(cursor + 10);
    const compressed = buf.readUInt32LE(cursor + 20);
    const uncompressed = buf.readUInt32LE(cursor + 24);
    const nameLength = buf.readUInt16LE(cursor + 28);
    const extraLength = buf.readUInt16LE(cursor + 30);
    const commentLength = buf.readUInt16LE(cursor + 32);
    const localOffset = buf.readUInt32LE(cursor + 42);

    if (flags & FLAG_ENCRYPTED) throw new ZipLimitError('Encrypted templates are not supported');
    if (method !== METHOD_STORE && method !== METHOD_DEFLATE) {
      throw new ZipLimitError('Template uses an unsupported compression method');
    }

    declaredTotal += uncompressed;
    if (declaredTotal > limits.maxTotalBytes) {
      throw new ZipLimitError('Template is too large when uncompressed');
    }

    entries.push({ method, compressed, uncompressed, localOffset });
    cursor += 46 + nameLength + extraLength + commentLength;
  }

  // Pass 2: prove each entry's real size matches its declared size.
  for (const entry of entries) {
    const local = entry.localOffset;
    if (local + 30 > buf.length || buf.readUInt32LE(local) !== LOCAL_SIGNATURE) {
      throw new ZipLimitError('Not a valid .docx file');
    }
    const dataStart = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const dataEnd = dataStart + entry.compressed;
    if (dataEnd > buf.length) throw new ZipLimitError('Not a valid .docx file');

    if (entry.method === METHOD_STORE) {
      if (entry.compressed !== entry.uncompressed) throw new ZipLimitError('Not a valid .docx file');
      continue;
    }

    let actual: number;
    try {
      // +1 so "exactly the declared size" succeeds and anything larger throws.
      actual = inflateRawSync(buf.subarray(dataStart, dataEnd), {
        maxOutputLength: entry.uncompressed + 1,
      }).length;
    } catch (error) {
      // zlib throws a RangeError when output would pass maxOutputLength;
      // anything else is a corrupt stream.
      throw new ZipLimitError(
        error instanceof RangeError ? 'Template is too large when uncompressed' : 'Not a valid .docx file',
      );
    }
    if (actual !== entry.uncompressed) {
      throw new ZipLimitError(
        actual > entry.uncompressed ? 'Template is too large when uncompressed' : 'Not a valid .docx file',
      );
    }
  }
}
