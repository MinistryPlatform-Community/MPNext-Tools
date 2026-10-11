import { z } from 'zod';

export const EquipmentSchema = z.object({
  Equipment_ID: z.number().int(),
  Equipment_Name: z.string().max(50),
  Date_Acquired: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)"),
  Equipment_Type_ID: z.number().int().nullable(),
  Room_ID: z.number().int(),
  Model_Name: z.string().max(50).nullable(),
  Serial_Number: z.string().max(50).nullable(),
  Inventory_Number: z.string().max(50).nullable(),
  Bookable: z.boolean(),
  Separately_Insured: z.boolean(),
  Purchase_Price: z.number().nullable(),
  Date_Retired: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
  Equipment_Coordinator: z.number().int().nullable(),
  Auto_Approve: z.boolean(),
  Quantity: z.number().int(),
});

export type EquipmentInput = z.infer<typeof EquipmentSchema>;
