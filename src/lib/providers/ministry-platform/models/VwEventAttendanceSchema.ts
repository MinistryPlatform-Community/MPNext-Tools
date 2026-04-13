import { z } from 'zod';

export const VwEventAttendanceSchema = z.object({
  Event_ID: z.number().int(),
  Event_Title: z.string().max(75),
  Event_Start_Date: z.string().datetime(),
  Kid_Count: z.number().int().nullable(),
  Day_of_Week: z.string().max(30).nullable(),
});

export type VwEventAttendanceInput = z.infer<typeof VwEventAttendanceSchema>;
