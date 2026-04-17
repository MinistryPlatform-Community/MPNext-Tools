"use client";

import { useRouter } from "next/navigation";
import { ToolContainer } from "@/components/tool";
import { TemplateEditorForm } from "@/components/template-editor";
import type { ToolParams } from "@/lib/tool-params";

interface TemplateEditorProps {
  params: ToolParams;
}

export function TemplateEditor({ params }: TemplateEditorProps) {
  const router = useRouter();

  const handleClose = () => {
    router.back();
  };

  return (
    <ToolContainer
      params={params}
      title="Template Editor"
      infoContent={
        <div className="space-y-2">
          <p className="font-semibold">Template Editor</p>
          <p className="text-sm">
            Create and edit email templates using a drag-and-drop MJML editor.
          </p>
          {params.pageID && (
            <p className="text-xs text-gray-400 mt-2">
              Page ID: {params.pageID}
              {params.recordID !== undefined && ` | Record: ${params.recordID}`}
            </p>
          )}
        </div>
      }
      hideFooter
    >
      <TemplateEditorForm onClose={handleClose} />
    </ToolContainer>
  );
}
