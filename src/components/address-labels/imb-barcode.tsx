import { View } from '@react-pdf/renderer';
import type { BarState } from '@/lib/imb-encoder';

interface ImbBarcodeProps {
  /** Pre-encoded bar states string (65 chars of T/D/A/F) */
  barStates: string;
  width?: number;
  height?: number;
}

const BAR_COUNT = 65;

const BAR_DIMS: Record<string, { topOffset: number; barHeight: number }> = {
  T: { topOffset: 0.35, barHeight: 0.3 },
  D: { topOffset: 0.15, barHeight: 0.85 },
  A: { topOffset: 0, barHeight: 0.65 },
  F: { topOffset: 0, barHeight: 1.0 },
};

export function ImbBarcode({ barStates, width = 90, height = 10 }: ImbBarcodeProps) {
  if (!barStates || barStates.length !== BAR_COUNT) return null;

  const pitch = width / BAR_COUNT;
  const barWidth = Math.max(pitch * 0.38, 0.5);

  return (
    <View style={{ width, height, flexDirection: 'row' }}>
      {Array.from(barStates).map((state, i) => {
        const dims = BAR_DIMS[state];
        if (!dims) return null;
        const barH = dims.barHeight * height;
        const topPad = dims.topOffset * height;
        return (
          <View key={i} style={{ width: pitch, height }}>
            <View style={{ height: topPad }} />
            <View style={{ width: barWidth, height: barH, backgroundColor: '#000000' }} />
          </View>
        );
      })}
    </View>
  );
}
