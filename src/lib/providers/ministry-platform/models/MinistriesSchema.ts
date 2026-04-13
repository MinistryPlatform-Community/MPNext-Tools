import { z } from 'zod';

export const MinistriesSchema = z.object({
  Ministry_ID: z.number().int(),
  Ministry_Name: z.string().max(50),
  Nickname: z.string().max(50).nullable(),
  Primary_Contact: z.number().int(),
  Start_Date: z.string().datetime(),
  End_Date: z.string().datetime().nullable(),
  Available_Online: z.boolean(),
  Parent_Ministry: z.number().int().nullable(),
  Description: z.string().max(255).nullable(),
  Purpose_Statement: z.string().max(255).nullable(),
  Leadership_Team: z.number().int().nullable(),
  Home_Page_URL: z.string().max(254).nullable(),
  Priority_ID: z.number().int().nullable(),
  Background_Check_Required: z.boolean().nullable(),
});

export type MinistriesInput = z.infer<typeof MinistriesSchema>;
