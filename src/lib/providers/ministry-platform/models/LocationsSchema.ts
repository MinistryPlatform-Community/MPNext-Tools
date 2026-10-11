import { z } from 'zod';

export const LocationsSchema = z.object({
  Location_ID: z.number().int(),
  Location_Name: z.string().max(50),
  Congregation_ID: z.number().int().nullable(),
  Description: z.string().max(255).nullable(),
  Location_Type_ID: z.number().int(),
  Address_ID: z.number().int(),
  Move_In_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
  Move_Out_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
  Phone: z.string().nullable(),
  Location_Group_ID: z.number().int().nullable(),
  Mailing_Address_ID: z.number().int().nullable(),
  Location_Category_ID: z.number().int().nullable(),
});

export type LocationsInput = z.infer<typeof LocationsSchema>;
