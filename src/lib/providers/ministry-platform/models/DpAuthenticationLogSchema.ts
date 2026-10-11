import { z } from 'zod';

export const DpAuthenticationLogSchema = z.object({
  Authentication_ID: z.number().int(),
  User_Name: z.string().max(256),
  Server_Name: z.string().max(75),
  IP_Address: z.string().max(50),
  Date_Time: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)"),
  User_ID: z.number().int().nullable(),
  Referrer: z.string().max(2048).nullable(),
  Keep_Signed_In: z.boolean(),
  Last_Token_Request: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
});

export type DpAuthenticationLogInput = z.infer<typeof DpAuthenticationLogSchema>;
