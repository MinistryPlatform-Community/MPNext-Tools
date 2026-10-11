import { z } from 'zod';

export const VwMpParticipationComplianceSchema = z.object({
  ID: z.number().int().nullable(),
  Group_ID: z.number().int(),
  Participant_ID: z.number().int(),
  Group_Role_ID: z.number().int(),
  Start_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)"),
  End_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
  Attribute_Alignment: z.string().max(4000).nullable(),
  Background_Check: z.string().max(13).nullable(),
  Certification: z.string().max(13).nullable(),
  Milestone: z.string().max(10).nullable(),
  Form: z.string().max(13).nullable(),
});

export type VwMpParticipationComplianceInput = z.infer<typeof VwMpParticipationComplianceSchema>;
