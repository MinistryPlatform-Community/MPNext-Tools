import { z } from 'zod';

export const FormsSchema = z.object({
  Form_ID: z.number().int(),
  Form_Title: z.string().max(50),
  Congregation_ID: z.number().int().nullable(),
  Instructions: z.string().max(2147483647).nullable(),
  Get_Contact_Info: z.boolean(),
  Get_Address_Info: z.boolean(),
  Form_GUID: z.string().uuid(),
  End_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
  Complete_Message: z.string().max(2147483647).nullable(),
  Primary_Contact: z.number().int().nullable(),
  Notify: z.boolean(),
  Response_Message: z.number().int().nullable(),
  Months_Till_Expires: z.number().int().nullable(),
  Expiring_Soon_Days: z.number().int().nullable(),
  Force_Login: z.boolean(),
  Product_ID: z.number().int().nullable(),
  Program_ID: z.number().int().nullable(),
});

export type FormsInput = z.infer<typeof FormsSchema>;
