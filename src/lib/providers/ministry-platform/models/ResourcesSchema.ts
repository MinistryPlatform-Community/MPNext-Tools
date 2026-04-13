import { z } from 'zod';

export const ResourcesSchema = z.object({
  Resource_ID: z.number().int(),
  Title: z.string().max(128),
  Description: z.string().max(384),
  Resource_URL: z.string().max(255).nullable(),
  Author: z.number().int(),
  Approved: z.boolean(),
});

export type ResourcesInput = z.infer<typeof ResourcesSchema>;
