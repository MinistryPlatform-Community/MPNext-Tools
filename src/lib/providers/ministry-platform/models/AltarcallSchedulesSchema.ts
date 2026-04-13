import { z } from 'zod';

export const AltarcallSchedulesSchema = z.object({
  AltarCall_Schedule_ID: z.number().int(),
  AltarCall_Contact_ID: z.number().int(),
  Day_of_Week: z.number().int(),
  Start_Time: z.string(),
  End_Time: z.string(),
  Enabled: z.boolean(),
});

export type AltarcallSchedulesInput = z.infer<typeof AltarcallSchedulesSchema>;
