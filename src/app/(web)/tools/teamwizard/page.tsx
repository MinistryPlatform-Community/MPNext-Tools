import { TeamWizard } from "./team-wizard";
import { parseToolParams } from "@/lib/tool-params";

interface TeamWizardPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TeamWizardPage({ searchParams }: TeamWizardPageProps) {
  const params = await parseToolParams(await searchParams);

  return <TeamWizard params={params} />;
}
