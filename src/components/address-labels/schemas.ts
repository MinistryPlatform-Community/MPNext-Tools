import { z } from 'zod';
import { SERVICE_TYPES } from '@/lib/dto';
import type { LabelConfig, LabelData } from '@/lib/dto';
import { MAX_LABELS } from './limits';

/**
 * Server-side validation for what the address-label actions receive.
 *
 * Labels come back from the client after `fetchAddressLabels`, so they are
 * caller-shaped input: a server action is a POST endpoint anyone with access
 * can call with any payload. This bounds the count and every string, and
 * DROPS `barStates`/`barType` — those are computed server-side by
 * `preEncodeBarcodes` and must never be accepted from the caller.
 *
 * Field caps are generous (well above MP's column sizes) so real data never
 * trips them; they exist to bound memory, not to re-validate addresses.
 */
const text = (max: number) => z.string().max(max);

export const labelDataSchema = z.object({
  name: text(256),
  addressLine1: text(256),
  addressLine2: text(256).optional(),
  city: text(128),
  state: text(64),
  postalCode: text(32),
  barCode: text(64).optional(),
  deliveryPointCode: text(16).optional(),
});

export const labelsSchema = z.array(labelDataSchema).max(MAX_LABELS);

const serviceTypeIds = SERVICE_TYPES.map((t) => t.id) as [string, ...string[]];

export const labelConfigSchema = z.object({
  stockId: text(64),
  addressMode: z.enum(['household', 'individual']),
  // Upper bound is the stock's labels-per-sheet, checked once the stock is known.
  startPosition: z.number().int().min(1),
  includeMissingBarcodes: z.boolean(),
  barcodeFormat: z.enum(['imb', 'postnet', 'none']),
  mailerId: text(9),
  serviceType: z.enum(serviceTypeIds),
});

export type ParsedLabelInput =
  | { success: true; labels: LabelData[]; config: LabelConfig }
  | { success: false; error: string };

/** Parse labels + config; the error names the problem, never the payload. */
export function parseLabelInput(labels: unknown, config: unknown): ParsedLabelInput {
  if (Array.isArray(labels) && labels.length > MAX_LABELS) {
    return {
      success: false,
      error: `Too many labels (${labels.length.toLocaleString('en-US')}); the limit is ${MAX_LABELS.toLocaleString('en-US')} per request`,
    };
  }
  const parsedLabels = labelsSchema.safeParse(labels);
  if (!parsedLabels.success) return { success: false, error: 'Invalid label data' };
  const parsedConfig = labelConfigSchema.safeParse(config);
  if (!parsedConfig.success) return { success: false, error: 'Invalid label settings' };
  return { success: true, labels: parsedLabels.data, config: parsedConfig.data };
}
