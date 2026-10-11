import { z } from 'zod';

export const ParticipantCertificationsSchema = z.object({
  Participant_Certification_ID: z.number().int(),
  Participant_ID: z.number().int(),
  Certification_Type_ID: z.number().int(),
  Certification_Submitted: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)"),
  Certification_Completed: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
  Passed: z.boolean().nullable(),
  Certification_Expires: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
  Certification_GUID: z.string().uuid(),
  Notes: z.string().max(500).nullable(),
});

export type ParticipantCertificationsInput = z.infer<typeof ParticipantCertificationsSchema>;
