import { z } from 'zod';

export const SmsSalvationsSchema = z.object({
  SMS_Salvation_ID: z.number().int(),
  Mobile_Phone: z.string().max(50),
  Contact_ID: z.number().int().nullable(),
  Start_Date: z.string().datetime(),
  Complete_Date: z.string().datetime().nullable(),
  FollowUp_SMS_Date: z.string().datetime().nullable(),
  First_SMS: z.number().int().nullable(),
  FollowUp_SMS: z.number().int().nullable(),
  Main_Group_Participant: z.number().int().nullable(),
  Please_Call: z.boolean().nullable(),
  Bible: z.boolean().nullable(),
  SMW: z.boolean().nullable(),
  MyCalvary: z.boolean().nullable(),
  Second_Email_Sent: z.string().datetime().nullable(),
});

export type SmsSalvationsInput = z.infer<typeof SmsSalvationsSchema>;
