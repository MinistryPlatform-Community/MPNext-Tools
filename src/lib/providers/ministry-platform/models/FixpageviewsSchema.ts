import { z } from 'zod';

export const FixpageviewsSchema = z.object({
  Table_Name: z.string().max(2147483647).nullable(),
  Page_View_ID: z.number().nullable(),
  View_Title: z.string().max(2147483647).nullable(),
  Page_ID: z.number().nullable(),
  Description: z.string().max(2147483647).nullable(),
  Field_List: z.string().max(2147483647).nullable(),
  View_Clause: z.string().max(2147483647).nullable(),
  Order_By: z.string().max(2147483647).nullable(),
  User_ID: z.number().nullable(),
  User_Group_ID: z.number().nullable(),
});

export type FixpageviewsInput = z.infer<typeof FixpageviewsSchema>;
