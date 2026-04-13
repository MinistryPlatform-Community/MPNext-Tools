import { z } from 'zod';

export const DevoSubscriptionsSchema = z.object({
  Devo_Subscription_ID: z.number().int(),
  Email_Address: z.string().max(256),
  Confirmed_Email: z.boolean().nullable(),
  First_Name: z.string().max(50).nullable(),
  Last_Name: z.string().max(50).nullable(),
  Contact_ID: z.number().int().nullable(),
  Start_Date: z.string().datetime(),
  End_Date: z.string().datetime().nullable(),
  Status_Message: z.string().max(256).nullable(),
  Email_Confirmed: z.string().datetime().nullable(),
  Subscription_GUID: z.string().uuid(),
});

export type DevoSubscriptionsInput = z.infer<typeof DevoSubscriptionsSchema>;
