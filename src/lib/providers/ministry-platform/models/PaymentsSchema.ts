import { z } from 'zod';

export const PaymentsSchema = z.object({
  Payment_ID: z.number().int(),
  Payment_Total: z.number(),
  Contact_ID: z.number().int(),
  Payment_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)"),
  Gateway_Response: z.string().max(500).nullable(),
  Transaction_Code: z.string().max(50).nullable(),
  Notes: z.string().max(4000).nullable(),
  Merchant_Batch: z.string().max(25).nullable(),
  Payment_Type_ID: z.number().int().nullable(),
  Item_Number: z.string().max(15).nullable(),
  Processed: z.boolean().nullable(),
  Currency: z.string().max(25).nullable(),
  Invoice_Number: z.string().max(25).nullable(),
  Congregation_ID: z.number().int().nullable(),
  Invoice_ID: z.number().int().nullable(),
});

export type PaymentsInput = z.infer<typeof PaymentsSchema>;
