import { z } from 'zod';

export const SitefinityRolesSchema = z.object({
  Sitefinity_Role_ID: z.number().int(),
  Sitefinity_Role_Name: z.string().max(50),
  Sitefinity_Role_Guid: z.string().max(36),
  Sitefinity_Role_Description: z.string().max(255).nullable(),
  Realm: z.string().max(150),
  Role_ID: z.number().int().nullable(),
});

export type SitefinityRolesInput = z.infer<typeof SitefinityRolesSchema>;
