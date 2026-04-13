import { z } from 'zod';

export const CollegeSemesterClassesSchema = z.object({
  Semester_Class_ID: z.number().int(),
  Semester_ID: z.number().int(),
  Class_ID: z.number().int(),
  Instructor_ID: z.number().int().nullable(),
  Meets_On: z.string().max(50).nullable(),
  Room_ID: z.number().int().nullable(),
  Campus: z.number().int().nullable(),
  Class_Credits: z.number().nullable(),
  Class_Id_Number: z.number().int().nullable(),
  Semester_Number: z.number().nullable(),
  Class_Number: z.string().max(50).nullable(),
  Class_Type: z.string().max(1).nullable(),
  Instructor_Id_Number: z.number().int().nullable(),
  Class_Campus_Id_Number: z.number().int().nullable(),
  Class_Facility: z.string().max(50).nullable(),
  Class_Location: z.string().max(255).nullable(),
  Class_Days_And_Times: z.string().max(70).nullable(),
  Class_Notes: z.string().max(2147483647).nullable(),
  Create_User: z.string().max(50).nullable(),
  Create_date: z.string().datetime().nullable(),
});

export type CollegeSemesterClassesInput = z.infer<typeof CollegeSemesterClassesSchema>;
