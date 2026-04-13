import { z } from 'zod';

export const VolunteerTrainingQuestionsSchema = z.object({
  Volunteer_Training_Question_ID: z.number().int(),
  Training_ID: z.number().int(),
  Question: z.string().max(256),
  Answers: z.string().max(2000),
  Correct_Answer: z.string().max(128),
  Question_Order: z.number().int().nullable(),
});

export type VolunteerTrainingQuestionsInput = z.infer<typeof VolunteerTrainingQuestionsSchema>;
