import { TemplateTool } from "./template-tool";
import { requireToolAccess } from "@/app/(web)/tools/require-tool-access";
import { parseToolParams } from "@/lib/tool-params.server";

interface TemplatePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TemplateToolPage({ searchParams }: TemplatePageProps) {
  // Self-gating, before ANY param parsing or data call — see require-tool-access.ts.
  await requireToolAccess({ table: "dp_Tools", operation: "read" });

  const params = await parseToolParams(await searchParams);
  
  return <TemplateTool params={params} />;
}
