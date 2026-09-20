/**
 * Client-side attachment pipeline for MMS images: validate, resize to the max width,
 * re-encode, and enforce the carrier size cap. Mirrors the Discover Publisher image
 * helper but without cropping (a text attachment keeps its aspect ratio as picked).
 */

import {
  TEXT_IMAGE_MAX_WIDTH,
  TEXT_MMS_MAX_ATTACHMENT_BYTES,
  TEXT_MMS_RECOMMENDED_ATTACHMENT_BYTES,
} from '@/lib/constants';

export const ACCEPTED_ATTACHMENT_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;

/** JPEG quality for re-encoded output (ignored for lossless PNG). */
const JPEG_QUALITY = 0.85;

export interface PreparedAttachment {
  file: File;
  width: number;
  height: number;
  /** True when the source was wider than the cap and got scaled down. */
  resized: boolean;
  /** Bytes of the original file, for the "reduced from" hint. */
  originalBytes: number;
  /** Non-blocking warning (e.g. above the recommended size) or null. */
  warning: string | null;
  /** The file as picked, kept so the attachment can be prepared again at another width. */
  source: File;
  /** Width cap this result was prepared with. */
  maxWidth: number;
}

/**
 * True when the prepared image is still over the recommended size and is wider than
 * `compactWidth`, so shrinking it to that width is worth offering. Already-narrow
 * images get no offer: shrinking would not change them.
 */
export function canShrinkAttachment(attachment: PreparedAttachment, compactWidth: number): boolean {
  return attachment.warning !== null && compactWidth > 0 && attachment.width > compactWidth;
}

export function validateAttachmentType(file: File): string | null {
  if (!(ACCEPTED_ATTACHMENT_TYPES as readonly string[]).includes(file.type)) {
    return 'Unsupported image type. Use JPEG, PNG, GIF, or WebP.';
  }
  return null;
}

/** Returns an error when `bytes` is over the hard MMS cap, otherwise null. */
export function validateAttachmentSize(bytes: number, maxBytes = TEXT_MMS_MAX_ATTACHMENT_BYTES): string | null {
  if (bytes > maxBytes) {
    return `This image is ${formatBytes(bytes)}, over the ${formatBytes(maxBytes)} MMS limit. Choose a smaller image.`;
  }
  return null;
}

export function attachmentSizeWarning(
  bytes: number,
  recommendedBytes = TEXT_MMS_RECOMMENDED_ATTACHMENT_BYTES
): string | null {
  if (bytes > recommendedBytes) {
    return `This image is ${formatBytes(bytes)} and may be downscaled or dropped by carriers.\nImages under 1 MB deliver more reliably.`;
  }
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Scale so width is at most `maxWidth`, never upscaling. */
export function computeScaledSize(
  srcWidth: number,
  srcHeight: number,
  maxWidth: number = TEXT_IMAGE_MAX_WIDTH
): { width: number; height: number; resized: boolean } {
  if (srcWidth <= 0 || srcHeight <= 0) return { width: 0, height: 0, resized: false };
  if (srcWidth <= maxWidth) {
    return { width: Math.round(srcWidth), height: Math.round(srcHeight), resized: false };
  }
  const scale = maxWidth / srcWidth;
  return { width: maxWidth, height: Math.max(1, Math.round(srcHeight * scale)), resized: true };
}

/** PNG stays PNG (transparency); everything else becomes JPEG. GIF loses animation. */
export function pickOutputType(sourceType: string): { mime: string; ext: string } {
  if (sourceType === 'image/png') return { mime: 'image/png', ext: 'png' };
  return { mime: 'image/jpeg', ext: 'jpg' };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read that image file.'));
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Image encoding failed.'))),
      mime,
      quality
    );
  });
}

function safeFileName(name: string, ext: string): string {
  const base = name.replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'image';
  return `${base}.${ext}`;
}

/**
 * Validates, resizes (width at most `maxWidth`) and re-encodes `file`. Throws with a
 * user-facing message when the type is unsupported or the result is still over the
 * MMS cap. A file already within the width cap is re-encoded anyway so oversized
 * originals still shrink.
 */
export async function prepareAttachment(
  file: File,
  options: { maxWidth?: number; maxBytes?: number } = {}
): Promise<PreparedAttachment> {
  const typeError = validateAttachmentType(file);
  if (typeError) throw new Error(typeError);

  const maxWidth = options.maxWidth ?? TEXT_IMAGE_MAX_WIDTH;
  const maxBytes = options.maxBytes ?? TEXT_MMS_MAX_ATTACHMENT_BYTES;

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const { width, height, resized } = computeScaledSize(image.naturalWidth, image.naturalHeight, maxWidth);
    const { mime, ext } = pickOutputType(file.type);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available in this browser.');
    if (mime === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(image, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, mime, JPEG_QUALITY);
    // Keep whichever is smaller when nothing was scaled: re-encoding a tiny PNG can grow it.
    const useOriginal = !resized && blob.size >= file.size && file.type === mime;
    const output = useOriginal ? file : new File([blob], safeFileName(file.name, ext), { type: mime });

    const sizeError = validateAttachmentSize(output.size, maxBytes);
    if (sizeError) throw new Error(sizeError);

    return {
      file: output,
      width,
      height,
      resized,
      originalBytes: file.size,
      warning: attachmentSizeWarning(output.size),
      source: file,
      maxWidth,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
