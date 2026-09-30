import { TemplateEditor } from "./template-editor";
import { requireToolAccess } from "@/app/(web)/tools/require-tool-access";
import { parseToolParams } from "@/lib/tool-params.server";

interface TemplateEditorPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TemplateEditorPage({ searchParams }: TemplateEditorPageProps) {
  // Self-gating, before ANY param parsing or data call — see require-tool-access.ts.
  await requireToolAccess({ table: "dp_Tools", operation: "read" });

  const params = await parseToolParams(await searchParams);

  return <TemplateEditor params={params} />;
}
