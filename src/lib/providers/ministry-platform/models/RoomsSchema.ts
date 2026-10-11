import { z } from 'zod';

export const RoomsSchema = z.object({
  Room_ID: z.number().int(),
  Room_Name: z.string().max(50),
  Room_Number: z.string().max(15).nullable(),
  Building_ID: z.number().int(),
  Description: z.string().max(255).nullable(),
  Maximum_Capacity: z.number().int(),
  Default_Room_Layout: z.number().int().nullable(),
  Room_Usage_Type_ID: z.number().int().nullable(),
  Bookable: z.boolean(),
  Last_Remodel_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
  Parent_Room_ID: z.number().int().nullable(),
  Auto_Approve: z.boolean(),
  Print_Server_ID: z.number().int().nullable(),
  Printer_Name: z.string().max(128).nullable(),
});

export type RoomsInput = z.infer<typeof RoomsSchema>;
