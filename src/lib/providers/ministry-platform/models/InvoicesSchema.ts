import { z } from 'zod';

export const InvoicesSchema = z.object({
  Invoice_ID: z.number().int(),
  Purchaser_Contact_ID: z.number().int(),
  Invoice_Status_ID: z.number().int(),
  Invoice_Total: z.number(),
  Invoice_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)"),
  Notes: z.string().max(4000).nullable(),
  Currency: z.string().max(25).nullable(),
  Congregation_ID: z.number().int().nullable(),
  Invoice_GUID: z.string().uuid(),
  Invoice_Source: z.number().int().nullable(),
  Cancel_Reason: z.string().max(255).nullable(),
  Form_Response_ID: z.number().int().nullable(),
});

export type InvoicesInput = z.infer<typeof InvoicesSchema>;
