'use client';

import { useRouter } from 'next/navigation';
import { ToolContainer } from '@/components/tool';
import { TrainingToolForm } from '@/components/training-tool';
import { ToolParams } from '@/lib/tool-params';

interface TrainingToolProps {
  params: ToolParams;
}

export function TrainingTool({ params }: TrainingToolProps) {
  const router = useRouter();

  const handleClose = () => {
    router.back();
  };

  const pageId = params.pageID ?? 0;
  const recordId = params.recordID;
  const selectionId = params.s;

  return (
    <ToolContainer
      title="Training Assignment"
      infoContent={
        <div className="space-y-2">
          <p className="font-semibold">Training Assignment Tool</p>
          <p className="text-sm">
            Assign volunteer training to selected volunteer application programs.
          </p>
          {params.pageID && (
            <p className="text-xs text-gray-400 mt-2">
              Launched from Page ID: {params.pageID}
              {params.s !== undefined && ` | Selection: ${params.s}`}
            </p>
          )}
        </div>
      }
      onClose={handleClose}
      hideFooter
    >
      <div className="px-6 py-4">
        <TrainingToolForm
          pageId={pageId}
          recordId={recordId}
          selectionId={selectionId}
          onClose={handleClose}
        />
      </div>
    </ToolContainer>
  );
}
