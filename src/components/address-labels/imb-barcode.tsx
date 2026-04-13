import { Svg, Rect } from '@react-pdf/renderer';
import { imbEncode, type BarState } from '@/lib/imb-encoder';

interface ImbBarcodeProps {
  data: string;
  width?: number; // total width in points
  height?: number; // total height in points
}

const BAR_COUNT = 65;
const BAR_WIDTH_RATIO = 0.38;

// Normalized positions for 4 bar states (0 = top, 1 = bottom)
const BAR_DIMENSIONS: Record<BarState, { y: number; height: number }> = {
  T: { y: 0.35, height: 0.3 }, // Tracker: short middle bar
  D: { y: 0.15, height: 0.85 }, // Descender: middle + bottom
  A: { y: 0, height: 0.65 }, // Ascender: top + middle
  F: { y: 0, height: 1.0 }, // Full: top to bottom
};

export function ImbBarcode({ data, width = 90, height = 10 }: ImbBarcodeProps) {
  let bars: BarState[];
  try {
    bars = imbEncode(data);
  } catch {
    return null;
  }

  const pitch = width / BAR_COUNT;
  const barWidth = pitch * BAR_WIDTH_RATIO;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {bars.map((state, i) => {
        const dims = BAR_DIMENSIONS[state];
        return (
          <Rect
            key={i}
            x={i * pitch}
            y={dims.y * height}
            width={barWidth}
            height={dims.height * height}
            fill="black"
          />
        );
      })}
    </Svg>
  );
}
