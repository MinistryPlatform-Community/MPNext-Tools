import { GroupWizard } from "./group-wizard";
import { parseToolParams } from "@/lib/tool-params";

interface GroupWizardPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function GroupWizardPage({ searchParams }: GroupWizardPageProps) {
  const params = await parseToolParams(await searchParams);

  return <GroupWizard params={params} />;
}
