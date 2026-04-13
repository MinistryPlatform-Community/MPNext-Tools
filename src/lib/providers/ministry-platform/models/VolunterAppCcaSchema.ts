import { z } from 'zod';

export const VolunterAppCcaSchema = z.object({
  Volunteer_App_CCA_ID: z.number().int(),
  Volunteer_App_Employment_App_ID: z.number().int(),
  Faith: z.boolean().nullable(),
  Servant: z.boolean().nullable(),
  Motivated: z.boolean().nullable(),
  Previous_Interview: z.string().max(128).nullable(),
  Relative_Employees: z.string().max(128).nullable(),
  Publications: z.string().max(128).nullable(),
  Age_Grade_Pref: z.string().max(128).nullable(),
  Student_Teaching: z.string().max(512).nullable(),
  Credentials_Certs: z.string().max(512).nullable(),
  Teaching_Experience: z.string().max(750).nullable(),
  Recent_Teaching_Exp: z.string().max(750).nullable(),
  Course_Hours_Completed: z.string().max(128).nullable(),
  Course_Hours_Completed_2: z.string().max(128).nullable(),
  Course_Hours_Completed_3: z.string().max(128).nullable(),
  Transcript: z.string().max(2147483647).nullable(),
});

export type VolunterAppCcaInput = z.infer<typeof VolunterAppCcaSchema>;
