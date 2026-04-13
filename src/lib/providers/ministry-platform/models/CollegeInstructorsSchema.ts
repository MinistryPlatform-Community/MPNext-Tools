import { z } from 'zod';

export const CollegeInstructorsSchema = z.object({
  Instructor_ID: z.number().int(),
  Contact_ID: z.number().int(),
  Instructor_Id_Number: z.number().int().nullable(),
  Instructor_Status: z.number().int().nullable(),
  Instructor_Last_name: z.string().max(50).nullable(),
  Instructor_First_Name: z.string().max(50).nullable(),
  Instructor_Middle_Name: z.string().max(50).nullable(),
  Home_Phone_Number: z.string().max(50).nullable(),
  Office_Phone_Number: z.string().max(50).nullable(),
  Cell_Phone_Number: z.string().max(50).nullable(),
  Office_Street_Address: z.string().max(70).nullable(),
  Office_City: z.string().max(70).nullable(),
  Office_State: z.string().max(50).nullable(),
  Office_Zip: z.string().max(50).nullable(),
  Home_Street_Address: z.string().max(70).nullable(),
  Home_City: z.string().max(70).nullable(),
  Home_State: z.string().max(50).nullable(),
  Home_Zip: z.string().max(50).nullable(),
  Instructor_Credentials: z.string().max(50).nullable(),
  Instructor_Pastor: z.boolean(),
  Instructor_Memo: z.string().max(2147483647).nullable(),
});

export type CollegeInstructorsInput = z.infer<typeof CollegeInstructorsSchema>;
