import { z } from 'zod';

export const DepositsSchema = z.object({
  Deposit_ID: z.number().int(),
  Deposit_Name: z.string().max(75),
  Deposit_Total: z.number(),
  Deposit_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)"),
  Account_Number: z.string().max(30),
  Batch_Count: z.number().int(),
  Exported: z.boolean(),
  Notes: z.string().max(500).nullable(),
  Congregation_ID: z.number().int().nullable(),
  Send_To_Accounting: z.boolean(),
});

export type DepositsInput = z.infer<typeof DepositsSchema>;
