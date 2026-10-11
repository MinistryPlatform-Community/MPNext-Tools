import { z } from 'zod';

export const PledgeCampaignsSchema = z.object({
  Pledge_Campaign_ID: z.number().int(),
  Campaign_Name: z.string().max(50),
  Nickname: z.string().max(50).nullable(),
  Pledge_Campaign_Type_ID: z.number().int(),
  Description: z.string().max(500).nullable(),
  Campaign_Goal: z.number(),
  Start_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)"),
  End_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
  Event_ID: z.number().int().nullable(),
  Program_ID: z.number().int().nullable(),
  Registration_Start: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
  Registration_End: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
  Maximum_Registrants: z.number().int().nullable(),
  Registration_Deposit: z.number().nullable(),
  Fundraising_Goal: z.number().nullable(),
  Registration_Form: z.number().int().nullable(),
  Allow_Online_Pledge: z.boolean(),
  Online_Thank_You_Message: z.string().max(255).nullable(),
  Pledge_Beyond_End_Date: z.boolean(),
  Show_On_My_Pledges: z.boolean(),
  Congregation_ID: z.number().int().nullable(),
  Credit_Parishes: z.boolean(),
  Auto_Create_Pledge: z.boolean(),
  Auto_Increase_Total: z.boolean(),
});

export type PledgeCampaignsInput = z.infer<typeof PledgeCampaignsSchema>;
