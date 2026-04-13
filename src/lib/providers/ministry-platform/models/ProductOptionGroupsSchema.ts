import { z } from 'zod';

export const ProductOptionGroupsSchema = z.object({
  Product_Option_Group_ID: z.number().int(),
  Option_Group_Name: z.string().max(50),
  Product_ID: z.number().int(),
  Description: z.string().max(255).nullable(),
  Mutually_Exclusive: z.boolean(),
  Required: z.boolean(),
  Note_Label: z.string().max(50).nullable(),
  Shelby_Fund_Number: z.number().int().nullable(),
  Shelby_Department_Number: z.number().int().nullable(),
  Shelby_Account_Number: z.number().int().nullable(),
  Online_Sort_Order: z.number().int().nullable(),
  Project_Code: z.string().max(15).nullable(),
});

export type ProductOptionGroupsInput = z.infer<typeof ProductOptionGroupsSchema>;
