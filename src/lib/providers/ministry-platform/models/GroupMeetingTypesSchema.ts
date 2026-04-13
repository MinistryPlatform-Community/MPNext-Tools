import { z } from 'zod';

export const GroupMeetingTypesSchema = z.object({
  Group_Meeting_Type_ID: z.number().int(),
  Group_Meeting_Type: z.string().max(50),
});

export type GroupMeetingTypesInput = z.infer<typeof GroupMeetingTypesSchema>;
