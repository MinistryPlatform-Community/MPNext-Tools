import { describe, it, expect } from 'vitest';
import PizZip from 'pizzip';
import { assertZipWithinLimits, ZipLimitError } from './zip-guard';

const LIMITS = { maxEntries: 10, maxTotalBytes: 1024 * 1024 };

function makeZip(files: Record<string, string | Buffer>, compression: 'DEFLATE' | 'STORE' = 'DEFLATE'): Buffer {
  const zip = new PizZip();
  for (const [name, content] of Object.entries(files)) zip.file(name, content);
  return zip.generate({ type: 'nodebuffer', compression });
}

/** Offset of the first central-directory record (signature PK\x01\x02). */
function centralOffset(buf: Buffer): number {
  return buf.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
}

function expectRejected(buf: Buffer, message: string, limits = LIMITS) {
  let caught: unknown;
  try {
    assertZipWithinLimits(buf, limits);
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(ZipLimitError);
  expect((caught as Error).message).toBe(message);
}

describe('assertZipWithinLimits', () => {
  it('accepts a small, honest deflated archive', () => {
    const buf = makeZip({ 'word/document.xml': '<w:document>' + 'a'.repeat(5000) + '</w:document>', '[Content_Types].xml': '<Types/>' });
    expect(() => assertZipWithinLimits(buf, LIMITS)).not.toThrow();
  });

  it('accepts a stored (uncompressed) archive', () => {
    const buf = makeZip({ 'a.xml': 'hello' }, 'STORE');
    expect(() => assertZipWithinLimits(buf, LIMITS)).not.toThrow();
  });

  it('accepts an archive with an empty entry', () => {
    const buf = makeZip({ 'empty.xml': '', 'a.xml': 'x' });
    expect(() => assertZipWithinLimits(buf, LIMITS)).not.toThrow();
  });

  it('rejects an archive whose declared total exceeds the cap (classic bomb)', () => {
    // 2 MB of zeros deflates to a couple of KB.
    const buf = makeZip({ 'bomb.xml': Buffer.alloc(2 * 1024 * 1024) });
    expect(buf.length).toBeLessThan(20_000);
    expectRejected(buf, 'Template is too large when uncompressed');
  });

  it('rejects an entry that lies about its uncompressed size', () => {
    const buf = makeZip({ 'liar.xml': Buffer.alloc(512 * 1024) });
    // Patch the central directory's declared uncompressed size down to 10 bytes.
    buf.writeUInt32LE(10, centralOffset(buf) + 24);
    expectRejected(buf, 'Template is too large when uncompressed');
  });

  it('rejects an entry that declares more than it actually contains', () => {
    const buf = makeZip({ 'short.xml': 'a'.repeat(1000) });
    buf.writeUInt32LE(5000, centralOffset(buf) + 24);
    expectRejected(buf, 'Not a valid .docx file');
  });

  it('rejects too many entries', () => {
    const files = Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`f${i}.xml`, 'x']));
    expectRejected(makeZip(files), 'Template contains too many files');
  });

  it('rejects a buffer that is not a ZIP at all', () => {
    expectRejected(Buffer.from('this is not a zip file, just some text padding it out'), 'Not a valid .docx file');
  });

  it('rejects a buffer shorter than an end-of-central-directory record', () => {
    expectRejected(Buffer.from('PK'), 'Not a valid .docx file');
  });

  it('rejects ZIP64 markers', () => {
    const buf = makeZip({ 'a.xml': 'x' });
    const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    buf.writeUInt16LE(0xffff, eocd + 10);
    expectRejected(buf, 'ZIP64 templates are not supported');
  });

  it('rejects encrypted entries', () => {
    const buf = makeZip({ 'a.xml': 'x' });
    const cd = centralOffset(buf);
    buf.writeUInt16LE(buf.readUInt16LE(cd + 8) | 0x1, cd + 8);
    expectRejected(buf, 'Encrypted templates are not supported');
  });

  it('rejects unsupported compression methods', () => {
    const buf = makeZip({ 'a.xml': 'x' });
    buf.writeUInt16LE(12, centralOffset(buf) + 10); // bzip2
    expectRejected(buf, 'Template uses an unsupported compression method');
  });

  it('rejects a corrupt deflate stream', () => {
    const buf = makeZip({ 'a.xml': 'a'.repeat(2000) });
    const local = 0;
    const dataStart = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    buf.fill(0xff, dataStart, dataStart + 8);
    expectRejected(buf, 'Not a valid .docx file');
  });

  it('rejects a stored entry whose sizes disagree', () => {
    const buf = makeZip({ 'a.xml': 'hello' }, 'STORE');
    buf.writeUInt32LE(4, centralOffset(buf) + 20); // compressed size
    expectRejected(buf, 'Not a valid .docx file');
  });

  it('rejects a central directory that points past the end of the buffer', () => {
    const buf = makeZip({ 'a.xml': 'x' });
    const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    buf.writeUInt32LE(buf.length + 100, eocd + 16);
    expectRejected(buf, 'Not a valid .docx file');
  });

  it('rejects a local header offset that does not point at a local header', () => {
    const buf = makeZip({ 'a.xml': 'x' });
    buf.writeUInt32LE(5, centralOffset(buf) + 42);
    expectRejected(buf, 'Not a valid .docx file');
  });

  it('rejects entry data that runs past the end of the buffer', () => {
    const buf = makeZip({ 'a.xml': 'a'.repeat(100) });
    buf.writeUInt32LE(buf.length * 2, centralOffset(buf) + 20);
    expectRejected(buf, 'Not a valid .docx file');
  });
});
