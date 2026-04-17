"use client";

import { ToolHeader } from "./tool-header";
import { ToolFooter } from "./tool-footer";
import { DevPanel } from "@/components/dev-panel";
import type { ToolParams } from "@/lib/tool-params";

interface ToolContainerProps {
  title: string;
  params?: ToolParams;
  infoContent?: React.ReactNode;
  onClose?: () => void;
  onSave?: () => void;
  closeLabel?: string;
  saveLabel?: string;
  isSaving?: boolean;
  hideFooter?: boolean;
  footerExtra?: React.ReactNode;
  children: React.ReactNode;
}

export function ToolContainer({
  title,
  params,
  infoContent,
  onClose,
  onSave,
  closeLabel,
  saveLabel,
  isSaving,
  hideFooter,
  footerExtra,
  children,
}: ToolContainerProps) {
  return (
    <div className="flex flex-col h-screen">
      {params && <DevPanel params={params} />}
      <ToolHeader title={title} infoContent={infoContent} />

      <div className="flex-1 overflow-auto bg-gray-50">
        {children}
      </div>

      {!hideFooter && (
        <ToolFooter
          onClose={onClose}
          onSave={onSave}
          closeLabel={closeLabel}
          saveLabel={saveLabel}
          isSaving={isSaving}
          footerExtra={footerExtra}
        />
      )}
    </div>
  );
}
