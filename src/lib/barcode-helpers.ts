import { imbEncode } from '@/lib/imb-encoder';
import { postnetEncode } from '@/lib/postnet-encoder';
import type { LabelData, LabelConfig } from '@/lib/dto';

/**
 * Build routing code from postal code + delivery point.
 * Returns 5, 9, or 11 digits (or empty string if invalid).
 */
export function buildRoutingCode(postalCode?: string, deliveryPointCode?: string): string {
  const zip = postalCode?.replace(/-/g, '').trim() ?? '';
  if (!zip) return '';
  const dp = deliveryPointCode?.trim().padStart(2, '0') ?? '00';
  if (dp && dp !== '00') return zip + dp;
  return zip;
}

/**
 * Build a full 20-digit IMb tracking code from org settings.
 * Format: [Barcode ID: 2][Service Type: 3][Mailer ID: 6 or 9][Serial: 9 or 6]
 */
export function buildImbTrackingCode(mailerId: string, serviceType: string, serialNumber: number): string {
  const barcodeId = '00';
  const serialLength = mailerId.length === 6 ? 9 : 6;
  const serial = String(serialNumber).padStart(serialLength, '0');
  return barcodeId + serviceType + mailerId + serial;
}

/**
 * Pre-encode barcodes for an array of labels based on the label config.
 * Attempts IMb first (if configured), falls back to POSTNET.
 * Returns a new array with `barStates` and `barType` populated where possible.
 */
export function preEncodeBarcodes(labels: LabelData[], config: LabelConfig): LabelData[] {
  let serialCounter = 0;

  return labels.map((label) => {
    if (config.barcodeFormat === 'none') return label;

    const routingCode = buildRoutingCode(label.postalCode, label.deliveryPointCode);

    if (config.barcodeFormat === 'imb' && config.mailerId) {
      try {
        serialCounter++;
        const trackingCode = buildImbTrackingCode(config.mailerId, config.serviceType, serialCounter);
        const imbInput = trackingCode + routingCode;
        const bars = imbEncode(imbInput);
        return { ...label, barStates: bars.join(''), barType: 'imb' as const };
      } catch {
        // Fall through to POSTNET
      }
    }

    if (config.barcodeFormat === 'postnet' || config.barcodeFormat === 'imb') {
      if (routingCode) {
        try {
          const bars = postnetEncode(routingCode);
          return { ...label, barStates: JSON.stringify(bars), barType: 'postnet' as const };
        } catch {
          try {
            const bars = postnetEncode(routingCode.substring(0, 5));
            return { ...label, barStates: JSON.stringify(bars), barType: 'postnet' as const };
          } catch {
            // No barcode possible
          }
        }
      }
    }

    return label;
  });
}
