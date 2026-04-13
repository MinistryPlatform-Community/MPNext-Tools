import { Canvas } from '@react-pdf/renderer';
import { imbEncode, type BarState } from '@/lib/imb-encoder';

interface ImbBarcodeProps {
  data: string;
  width?: number;  // total width in points
  height?: number; // total height in points
}

const BAR_COUNT = 65;
const BAR_WIDTH_RATIO = 0.38;

// Normalized positions for 4 bar states (0 = top, 1 = bottom)
const BAR_DIMENSIONS: Record<BarState, { y: number; height: number }> = {
  T: { y: 0.35, height: 0.3 },
  D: { y: 0.15, height: 0.85 },
  A: { y: 0, height: 0.65 },
  F: { y: 0, height: 1.0 },
};

export function ImbBarcode({ data, width = 90, height = 10 }: ImbBarcodeProps) {
  let bars: BarState[];
  try {
    bars = imbEncode(data);
  } catch (err) {
    console.error('ImbBarcode encode error:', err, 'data:', data);
    return null;
  }

  const pitch = width / BAR_COUNT;
  const barWidth = pitch * BAR_WIDTH_RATIO;

  // Pre-compute bar positions (Canvas paint fn can't close over component-level lets)
  const barRects = bars.map((state, i) => {
    const dims = BAR_DIMENSIONS[state];
    return {
      x: i * pitch,
      y: dims.y * height,
      w: barWidth,
      h: dims.height * height,
    };
  });

  return (
    <Canvas
      style={{ width, height }}
      paint={(painter) => {
        painter.fillColor('#000000');
        for (const bar of barRects) {
          painter.rect(bar.x, bar.y, bar.w, bar.h).fill();
        }
        return null;
      }}
    />
  );
}
