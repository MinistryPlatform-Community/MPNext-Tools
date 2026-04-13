import { z } from 'zod';

export const AttributesSchema = z.object({
  Attribute_ID: z.number().int(),
  Attribute_Name: z.string().max(50),
  Description: z.string().max(255).nullable(),
  Attribute_Type_ID: z.number().int(),
  HTMLDescription: z.string().max(2147483647).nullable(),
  Sermon_ID: z.number().int().nullable(),
  Create_Attribute_Group: z.boolean(),
  Icon: z.string().max(50).nullable(),
});

export type AttributesInput = z.infer<typeof AttributesSchema>;
