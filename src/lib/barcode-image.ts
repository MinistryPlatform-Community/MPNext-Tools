/**
 * Generates barcode images as BMP buffers for embedding in Word documents.
 * BMP is used because it has a trivial format (no compression) and Word supports it natively.
 */

import type { BarState } from './imb-encoder';
import type { PostnetBar } from './postnet-encoder';

const IMB_DIMS: Record<string, { topOffset: number; barHeight: number }> = {
  T: { topOffset: 0.35, barHeight: 0.3 },
  D: { topOffset: 0.15, barHeight: 0.85 },
  A: { topOffset: 0, barHeight: 0.65 },
  F: { topOffset: 0, barHeight: 1.0 },
};

/**
 * Create a BMP image buffer from raw pixel rows (bottom-up, no compression).
 */
function createBmp(width: number, height: number, pixels: Uint8Array): Buffer {
  const rowSize = Math.ceil((width * 3) / 4) * 4; // rows padded to 4-byte boundary
  const pixelDataSize = rowSize * height;
  const fileSize = 54 + pixelDataSize; // 14 (file header) + 40 (info header) + pixel data

  const buf = Buffer.alloc(fileSize);

  // File header (14 bytes)
  buf.write('BM', 0);                    // signature
  buf.writeUInt32LE(fileSize, 2);         // file size
  buf.writeUInt32LE(0, 6);               // reserved
  buf.writeUInt32LE(54, 10);             // pixel data offset

  // Info header (40 bytes)
  buf.writeUInt32LE(40, 14);             // header size
  buf.writeInt32LE(width, 18);           // width
  buf.writeInt32LE(height, 22);          // height (positive = bottom-up)
  buf.writeUInt16LE(1, 26);             // color planes
  buf.writeUInt16LE(24, 28);            // bits per pixel (24-bit RGB)
  buf.writeUInt32LE(0, 30);             // compression (none)
  buf.writeUInt32LE(pixelDataSize, 34); // pixel data size
  buf.writeInt32LE(2835, 38);           // horizontal resolution (72 DPI)
  buf.writeInt32LE(2835, 42);           // vertical resolution (72 DPI)
  buf.writeUInt32LE(0, 46);             // colors in palette
  buf.writeUInt32LE(0, 50);             // important colors

  // Pixel data (bottom-up rows, BGR format)
  for (let y = 0; y < height; y++) {
    const srcRow = (height - 1 - y) * width * 3; // BMP is bottom-up
    const destRow = 54 + y * rowSize;
    for (let x = 0; x < width; x++) {
      const srcIdx = srcRow + x * 3;
      const destIdx = destRow + x * 3;
      buf[destIdx] = pixels[srcIdx + 2];     // B
      buf[destIdx + 1] = pixels[srcIdx + 1]; // G
      buf[destIdx + 2] = pixels[srcIdx];     // R
    }
  }

  return buf;
}

/**
 * Render IMb barcode bar states to a BMP image buffer.
 */
export function imbBarcodeToBmp(barStates: string, width = 200, height = 30): Buffer {
  const pixels = new Uint8Array(width * height * 3).fill(255); // white background
  const barCount = barStates.length;
  const pitch = width / barCount;
  const barWidth = Math.max(Math.floor(pitch * 0.4), 1);

  for (let i = 0; i < barCount; i++) {
    const dims = IMB_DIMS[barStates[i]];
    if (!dims) continue;

    const x0 = Math.floor(i * pitch);
    const y0 = Math.floor(dims.topOffset * height);
    const barH = Math.floor(dims.barHeight * height);

    for (let dy = 0; dy < barH; dy++) {
      for (let dx = 0; dx < barWidth; dx++) {
        const px = x0 + dx;
        const py = y0 + dy;
        if (px < width && py < height) {
          const idx = (py * width + px) * 3;
          pixels[idx] = 0;     // R
          pixels[idx + 1] = 0; // G
          pixels[idx + 2] = 0; // B
        }
      }
    }
  }

  return createBmp(width, height, pixels);
}

/**
 * Render POSTNET barcode bars to a BMP image buffer.
 */
export function postnetBarcodeToBmp(barStatesJson: string, width = 200, height = 24): Buffer {
  let bars: PostnetBar[];
  try {
    bars = JSON.parse(barStatesJson);
  } catch {
    return createBmp(1, 1, new Uint8Array(3).fill(255));
  }

  const pixels = new Uint8Array(width * height * 3).fill(255);
  const barCount = bars.length;
  const pitch = width / barCount;
  const barWidth = Math.max(Math.floor(pitch * 0.4), 1);

  for (let i = 0; i < barCount; i++) {
    const isTall = bars[i] === 'tall';
    const barH = Math.floor((isTall ? 1.0 : 0.4) * height);
    const y0 = height - barH; // align to bottom
    const x0 = Math.floor(i * pitch);

    for (let dy = 0; dy < barH; dy++) {
      for (let dx = 0; dx < barWidth; dx++) {
        const px = x0 + dx;
        const py = y0 + dy;
        if (px < width && py < height) {
          const idx = (py * width + px) * 3;
          pixels[idx] = 0;
          pixels[idx + 1] = 0;
          pixels[idx + 2] = 0;
        }
      }
    }
  }

  return createBmp(width, height, pixels);
}
