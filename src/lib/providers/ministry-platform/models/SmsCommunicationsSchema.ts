import { z } from 'zod';

export const SmsCommunicationsSchema = z.object({
  SMS_Communication_ID: z.number().int(),
  From_Phone: z.string().max(15),
  To_Phone: z.string().max(15),
  SMSBody: z.string().max(512),
  From_Contact: z.number().int().nullable(),
  To_Contact: z.number().int().nullable(),
  Status: z.number().int(),
  Start_Date: z.string().datetime(),
  Response: z.string().max(1000).nullable(),
  Send_After: z.string().datetime().nullable(),
  Message_SID: z.string().max(128).nullable(),
  Image_Uri: z.string().max(256).nullable(),
});

export type SmsCommunicationsInput = z.infer<typeof SmsCommunicationsSchema>;
