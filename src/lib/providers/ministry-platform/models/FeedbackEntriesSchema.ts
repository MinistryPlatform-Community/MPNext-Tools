import { z } from 'zod';

export const FeedbackEntriesSchema = z.object({
  Feedback_Entry_ID: z.number().int(),
  Contact_ID: z.number().int(),
  Entry_Title: z.string().max(50),
  Feedback_Type_ID: z.number().int(),
  Program_ID: z.number().int().nullable(),
  Date_Submitted: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)"),
  Visibility_Level_ID: z.number().int(),
  Description: z.string().max(2000).nullable(),
  Ongoing_Need: z.boolean(),
  Assigned_To: z.number().int().nullable(),
  Care_Outcome_ID: z.number().int().nullable(),
  Outcome_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
  Approved: z.boolean(),
  Care_Case_ID: z.number().int().nullable(),
});

export type FeedbackEntriesInput = z.infer<typeof FeedbackEntriesSchema>;
