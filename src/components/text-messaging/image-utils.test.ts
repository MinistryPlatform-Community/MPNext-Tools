import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  attachmentSizeWarning,
  canShrinkAttachment,
  computeScaledSize,
  formatBytes,
  pickOutputType,
  prepareAttachment,
  validateAttachmentSize,
  validateAttachmentType,
} from './image-utils';

describe('computeScaledSize', () => {
  it('scales wide images down to the max width, keeping aspect', () => {
    expect(computeScaledSize(2400, 1200, 1200)).toEqual({ width: 1200, height: 600, resized: true });
  });

  it('never upscales', () => {
    expect(computeScaledSize(800, 600, 1200)).toEqual({ width: 800, height: 600, resized: false });
  });

  it('handles zero sizes', () => {
    expect(computeScaledSize(0, 0)).toEqual({ width: 0, height: 0, resized: false });
  });
});

describe('validation', () => {
  it('rejects non-image types', () => {
    expect(validateAttachmentType(new File([''], 'a.pdf', { type: 'application/pdf' }))).toMatch(/Unsupported/);
    expect(validateAttachmentType(new File([''], 'a.jpg', { type: 'image/jpeg' }))).toBeNull();
  });

  it('flags files over 5 MB and warns over 1 MB', () => {
    expect(validateAttachmentSize(5 * 1024 * 1024)).toBeNull();
    expect(validateAttachmentSize(5 * 1024 * 1024 + 1)).toMatch(/over the 5.00 MB MMS limit/);
    expect(attachmentSizeWarning(1024 * 1024)).toBeNull();
    expect(attachmentSizeWarning(2 * 1024 * 1024)).toMatch(/downscaled/);
  });

  it('keeps PNG and converts everything else to JPEG', () => {
    expect(pickOutputType('image/png')).toEqual({ mime: 'image/png', ext: 'png' });
    expect(pickOutputType('image/webp')).toEqual({ mime: 'image/jpeg', ext: 'jpg' });
  });

  it('offers a shrink only for oversized images wider than the compact width', () => {
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
    const base = { file, height: 600, resized: false, originalBytes: 1, source: file, maxWidth: 1200 };
    const warning = 'Images over 1.00 MB are often downscaled.';
    expect(canShrinkAttachment({ ...base, width: 1200, warning }, 640)).toBe(true);
    expect(canShrinkAttachment({ ...base, width: 640, warning }, 640)).toBe(false);
    expect(canShrinkAttachment({ ...base, width: 400, warning }, 640)).toBe(false);
    expect(canShrinkAttachment({ ...base, width: 1200, warning: null }, 640)).toBe(false);
    expect(canShrinkAttachment({ ...base, width: 1200, warning }, 0)).toBe(false);
  });

  it('formats bytes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.00 MB');
  });
});

describe('prepareAttachment (canvas pipeline)', () => {
  const originalImage = globalThis.Image;
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  let getContext: ReturnType<typeof vi.fn>;
  let toBlob: ReturnType<typeof vi.fn>;
  let ctx: { fillStyle: string; fillRect: ReturnType<typeof vi.fn>; drawImage: ReturnType<typeof vi.fn> };

  function installImage(width: number, height: number, fail = false) {
    class FakeImage {
      naturalWidth = width;
      naturalHeight = height;
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      set src(_value: string) {
        queueMicrotask(() => (fail ? this.onerror?.() : this.onload?.()));
      }
    }
    globalThis.Image = FakeImage as unknown as typeof Image;
  }

  function installCanvas(blob: Blob | null, withContext = true) {
    ctx = { fillStyle: '', fillRect: vi.fn(), drawImage: vi.fn() };
    getContext = vi.fn().mockReturnValue(withContext ? ctx : null);
    toBlob = vi.fn((cb: (b: Blob | null) => void) => cb(blob));
    HTMLCanvasElement.prototype.getContext = getContext as unknown as HTMLCanvasElement['getContext'];
    HTMLCanvasElement.prototype.toBlob = toBlob as unknown as HTMLCanvasElement['toBlob'];
  }

  beforeEach(() => {
    URL.createObjectURL = vi.fn().mockReturnValue('blob:fake');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    globalThis.Image = originalImage;
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    vi.restoreAllMocks();
  });

  it('rejects an unsupported type before touching the canvas', async () => {
    installImage(10, 10);
    installCanvas(new Blob(['x']));
    await expect(prepareAttachment(new File(['x'], 'doc.pdf', { type: 'application/pdf' }))).rejects.toThrow(
      /Unsupported image type/
    );
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('scales a wide JPEG down, paints a white background, and re-encodes it', async () => {
    installImage(2400, 1200);
    installCanvas(new Blob([new Uint8Array(500)], { type: 'image/jpeg' }));
    const source = new File([new Uint8Array(4000)], 'My Photo (1).jpeg', { type: 'image/jpeg' });
    const result = await prepareAttachment(source, { maxWidth: 1200 });
    expect(result).toMatchObject({ width: 1200, height: 600, resized: true, originalBytes: 4000, maxWidth: 1200, warning: null });
    expect(result.source).toBe(source);
    expect(result.file.name).toBe('My-Photo-1.jpg');
    expect(result.file.type).toBe('image/jpeg');
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1200, 600);
    expect(ctx.drawImage).toHaveBeenCalled();
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.85);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake');
  });

  it('keeps PNG as PNG without a background fill and keeps the original when re-encoding would grow it', async () => {
    installImage(300, 200);
    installCanvas(new Blob([new Uint8Array(900)], { type: 'image/png' }));
    const source = new File([new Uint8Array(100)], 'icon.png', { type: 'image/png' });
    const result = await prepareAttachment(source);
    expect(result.resized).toBe(false);
    expect(result.file).toBe(source);
    expect(ctx.fillRect).not.toHaveBeenCalled();
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png', 0.85);
  });

  it('converts other types to JPEG and warns when the output is over the recommended size', async () => {
    installImage(500, 500);
    installCanvas(new Blob([new Uint8Array(2 * 1024 * 1024)], { type: 'image/jpeg' }));
    const source = new File([new Uint8Array(10)], '***', { type: 'image/webp' });
    const result = await prepareAttachment(source);
    expect(result.file.type).toBe('image/jpeg');
    expect(result.file.name).toBe('image.jpg');
    expect(result.warning).toMatch(/may be downscaled or dropped/);
  });

  it('rejects output over the MMS limit', async () => {
    installImage(500, 500);
    installCanvas(new Blob([new Uint8Array(600)], { type: 'image/jpeg' }));
    await expect(
      prepareAttachment(new File([new Uint8Array(1000)], 'a.jpg', { type: 'image/jpeg' }), { maxBytes: 500 })
    ).rejects.toThrow(/over the .* MMS limit/);
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('fails clearly when the browser has no canvas context or encoding returns nothing', async () => {
    installImage(500, 500);
    installCanvas(null, false);
    await expect(prepareAttachment(new File(['x'], 'a.jpg', { type: 'image/jpeg' }))).rejects.toThrow(
      'Canvas is not available in this browser.'
    );
    installCanvas(null, true);
    await expect(prepareAttachment(new File(['x'], 'a.jpg', { type: 'image/jpeg' }))).rejects.toThrow(
      'Image encoding failed.'
    );
  });

  it('fails clearly when the file is not a readable image', async () => {
    installImage(0, 0, true);
    installCanvas(new Blob(['x']));
    await expect(prepareAttachment(new File(['x'], 'a.gif', { type: 'image/gif' }))).rejects.toThrow(
      'Could not read that image file.'
    );
  });
});
