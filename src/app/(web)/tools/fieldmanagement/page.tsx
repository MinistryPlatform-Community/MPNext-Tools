import { FieldManagement } from "./field-management";
import { requireToolAccess } from "@/app/(web)/tools/require-tool-access";
import { parseToolParams } from "@/lib/tool-params.server";

interface FieldManagementPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function FieldManagementPage({ searchParams }: FieldManagementPageProps) {
  // Self-gating, before ANY param parsing or data call — see require-tool-access.ts.
  await requireToolAccess({ table: "dp_Page_Fields", operation: "read" });

  const params = await parseToolParams(await searchParams);

  return <FieldManagement params={params} />;
}
