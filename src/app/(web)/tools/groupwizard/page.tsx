import { GroupWizard } from "./group-wizard";
import { requireToolAccess } from "@/app/(web)/tools/require-tool-access";
import { parseToolParams } from "@/lib/tool-params.server";
import { getMpTimezone } from "@/components/shared-actions/domain";

interface GroupWizardPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function GroupWizardPage({ searchParams }: GroupWizardPageProps) {
  // Self-gating, before ANY param parsing or data call — see require-tool-access.ts.
  await requireToolAccess({ table: "Groups", operation: "read" });

  const [params, mpTimezone] = await Promise.all([
    parseToolParams(await searchParams),
    getMpTimezone(),
  ]);

  return <GroupWizard params={params} mpTimezone={mpTimezone} />;
}
