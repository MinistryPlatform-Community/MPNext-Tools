import { z } from 'zod';

export const SpiritualGiftsSchema = z.object({
  Spiritual_Gift_ID: z.number().int(),
  Spiritual_Gift: z.string().max(128),
  Definition: z.string().max(512).nullable(),
  Strengths: z.string().max(2147483647).nullable(),
  Weaknesses: z.string().max(2147483647).nullable(),
  Attribute_ID: z.number().int(),
});

export type SpiritualGiftsInput = z.infer<typeof SpiritualGiftsSchema>;
