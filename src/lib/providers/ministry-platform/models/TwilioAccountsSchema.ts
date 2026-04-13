import { z } from 'zod';

export const TwilioAccountsSchema = z.object({
  Twilio_Account_ID: z.number().int(),
  Twilio_Number: z.string().max(25),
  Twilio_Sid: z.string().max(128).nullable(),
  Twilio_Token: z.string().max(128).nullable(),
  Start_Date: z.string().datetime(),
  End_Date: z.string().datetime().nullable(),
});

export type TwilioAccountsInput = z.infer<typeof TwilioAccountsSchema>;
