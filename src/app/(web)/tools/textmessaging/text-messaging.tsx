'use client';

import { useRouter } from 'next/navigation';
import { ToolContainer } from '@/components/tool';
import { TextMessagingForm } from '@/components/text-messaging';
import type { ToolParams } from '@/lib/tool-params';

interface TextMessagingProps {
  params: ToolParams;
}

export function TextMessaging({ params }: TextMessagingProps) {
  const router = useRouter();

  const handleClose = () => {
    router.back();
  };

  return (
    <ToolContainer
      params={params}
      title="Text Messaging"
      onClose={handleClose}
      hideFooter
      infoContent={
        <div className="space-y-2">
          <p className="font-semibold">Text Messaging</p>
          <p className="text-sm">
            Send a text (or an MMS with an image) to a selection of records, an audience, or publication
            subscribers. Shows segment counts, encoding warnings, cost, and delivery time before you send.
            Messages are written to Ministry Platform communications for the platform to deliver.
          </p>
          {params.pageID && (
            <p className="text-xs text-gray-400 mt-2">
              Launched from Page ID: {params.pageID}
              {params.s !== undefined && ` | Selection: ${params.s}`}
            </p>
          )}
        </div>
      }
    >
      <div className="px-6 py-4 space-y-6 w-full max-w-6xl mx-auto">
        <TextMessagingForm params={params} />
      </div>
    </ToolContainer>
  );
}
