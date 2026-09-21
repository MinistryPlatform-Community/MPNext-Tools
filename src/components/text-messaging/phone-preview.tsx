'use client';

import { MessageSquareText } from 'lucide-react';

interface PhonePreviewProps {
  /** Message with placeholders already merged for the sample recipient. */
  body: string;
  /** Sender label or number shown in the conversation header. */
  senderLabel: string;
  /** Object URL of the attached image, when any. */
  imageUrl: string | null;
  /** Who the preview is merged for, e.g. "Rivera, Samuel" (null when using sample values). */
  recipientName: string | null;
}

/** A phone-shaped wireframe showing how the text will land in the recipient's messages app. */
export function PhonePreview({ body, senderLabel, imageUrl, recipientName }: PhonePreviewProps) {
  const showBody = body.trim().length > 0;
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative w-[260px] h-[520px] rounded-[2.5rem] border-[6px] border-slate-800 bg-slate-900 shadow-xl overflow-hidden"
        aria-label="Message preview"
      >
        <div className="absolute top-0 inset-x-0 flex justify-center pt-2 z-10">
          <div className="h-5 w-24 rounded-full bg-slate-800" />
        </div>
        <div className="absolute inset-0 bg-white flex flex-col pt-8">
          <div className="flex items-center justify-between px-5 text-[11px] font-semibold text-slate-800">
            <span>9:41</span>
            <span className="tracking-tight">●●● ▲ ▮</span>
          </div>
          <div className="mt-2 border-b border-slate-200 pb-2 flex flex-col items-center gap-1">
            <div className="h-9 w-9 rounded-full bg-slate-300 flex items-center justify-center text-slate-600">
              <MessageSquareText className="h-4 w-4" />
            </div>
            <div className="text-[11px] font-medium text-slate-800 max-w-[200px] truncate">{senderLabel}</div>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            <div className="text-center text-[10px] text-slate-400">Text Message · Today</div>
            {showBody || imageUrl ? (
              <div className="flex justify-start">
                <div className="max-w-[85%] space-y-1">
                  {imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt="Attachment preview" className="rounded-2xl max-h-40 w-auto object-cover" />
                  )}
                  {showBody && (
                    <div className="rounded-2xl rounded-bl-sm bg-slate-200 px-3 py-2 text-[13px] leading-snug text-slate-900 whitespace-pre-wrap break-words">
                      {body}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-center text-[11px] text-slate-400 pt-8">Start typing to see your message here.</p>
            )}
          </div>
          <div className="border-t border-slate-200 px-3 py-2">
            <div className="h-7 rounded-full border border-slate-300 text-[11px] text-slate-400 flex items-center px-3">
              Text Message
            </div>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        {recipientName ? `Preview merged for ${recipientName}` : 'Preview uses sample values until recipients resolve'}
      </p>
    </div>
  );
}
