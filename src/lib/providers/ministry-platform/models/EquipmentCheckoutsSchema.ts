import { z } from 'zod';

export const EquipmentCheckoutsSchema = z.object({
  Equipment_CheckOut_ID: z.number().int(),
  Equipment_ID: z.number().int(),
  CheckOut_Date: z.string().datetime(),
  CheckOut_Person: z.number().int(),
  Expected_Return_Date: z.string().datetime(),
  CheckIn_Date: z.string().datetime().nullable(),
  CheckIn_Person: z.number().int().nullable(),
  Notes: z.string().max(512).nullable(),
});

export type EquipmentCheckoutsInput = z.infer<typeof EquipmentCheckoutsSchema>;
