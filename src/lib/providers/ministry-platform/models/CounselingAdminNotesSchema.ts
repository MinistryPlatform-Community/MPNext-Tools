import { z } from 'zod';

export const CounselingAdminNotesSchema = z.object({
  Counseling_Admin_Note_ID: z.number().int(),
  Admin: z.number().int(),
  Start_Date: z.string().datetime(),
  Notes: z.string().max(2000).nullable(),
  Counseling_Engagement_ID: z.number().int(),
  Counseling_Session_ID: z.number().int().nullable(),
});

export type CounselingAdminNotesInput = z.infer<typeof CounselingAdminNotesSchema>;
