import { z } from 'zod';

export const ScheduledChangesSchema = z.object({
  Scheduled_Change_ID: z.number().int(),
  Table_Name: z.string().max(50),
  Change_Type: z.string().max(50),
  RecordID: z.number().int().nullable(),
  Data_Payload: z.string().max(2048).nullable(),
  Execution_Date: z.string().datetime(),
});

export type ScheduledChangesInput = z.infer<typeof ScheduledChangesSchema>;
