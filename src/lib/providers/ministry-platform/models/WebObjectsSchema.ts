import { z } from 'zod';

export const WebObjectsSchema = z.object({
  Web_Object_ID: z.number().int(),
  ObjectType: z.string().max(50),
  Payload: z.string().max(2147483647).nullable(),
  Start_Date: z.string().datetime(),
  User_ID: z.number().int().nullable(),
  Deleted: z.boolean(),
  Last_Updated: z.string().datetime(),
});

export type WebObjectsInput = z.infer<typeof WebObjectsSchema>;
