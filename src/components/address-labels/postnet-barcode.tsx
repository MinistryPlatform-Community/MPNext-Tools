import { View } from '@react-pdf/renderer';
import type { PostnetBar } from '@/lib/postnet-encoder';

interface PostnetBarcodeProps {
  /** JSON-encoded array of 'tall'|'short' bars */
  barStates: string;
  width?: number;
  height?: number;
}

const TALL_RATIO = 1.0;
const SHORT_RATIO = 0.4;

export function PostnetBarcode({ barStates, width = 120, height = 8 }: PostnetBarcodeProps) {
  let bars: PostnetBar[];
  try {
    bars = JSON.parse(barStates);
  } catch {
    return null;
  }

  if (!Array.isArray(bars) || bars.length === 0) return null;

  const pitch = width / bars.length;
  const barWidth = Math.max(pitch * 0.4, 0.5);

  return (
    <View style={{ width, height, flexDirection: 'row', alignItems: 'flex-end' }}>
      {bars.map((bar, i) => {
        const barH = (bar === 'tall' ? TALL_RATIO : SHORT_RATIO) * height;
        return (
          <View key={i} style={{ width: pitch, height, justifyContent: 'flex-end' }}>
            <View style={{ width: barWidth, height: barH, backgroundColor: '#000000' }} />
          </View>
        );
      })}
    </View>
  );
}
