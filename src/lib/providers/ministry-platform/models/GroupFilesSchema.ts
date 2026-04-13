import { z } from 'zod';

export const GroupFilesSchema = z.object({
  Group_File_ID: z.number().int(),
  Group_ID: z.number().int().nullable(),
  Group_Type_ID: z.number().int().nullable(),
  Group_Focus_ID: z.number().int().nullable(),
  Notes: z.string().max(500).nullable(),
  Start_Date: z.string().datetime(),
  Visible: z.boolean(),
  LeaderOnly: z.boolean(),
  User_ID: z.number().int(),
  Tag_ID: z.number().int().nullable(),
});

export type GroupFilesInput = z.infer<typeof GroupFilesSchema>;
