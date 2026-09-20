'use client';

import { MoonStar } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { MessageCurfewWindow } from '@/lib/dto';
import { formatCurfewWindow } from './curfew-utils';

interface CurfewNoticeProps {
  curfew: MessageCurfewWindow;
  /** The scheduled or immediate start falls inside quiet hours. */
  startInCurfew: boolean;
  /** The estimated completion time falls inside quiet hours. */
  endInCurfew: boolean;
  scheduled: boolean;
  acknowledged: boolean;
  onAcknowledgedChange: (value: boolean) => void;
  disabled?: boolean;
}

/**
 * Amber quiet-hours warning shown when a send's start or estimated completion falls
 * inside the domain's messaging curfew. The override checkbox must be checked before the
 * send is allowed (the form adds it to `blockedReason`).
 */
export function CurfewNotice({
  curfew,
  startInCurfew,
  endInCurfew,
  scheduled,
  acknowledged,
  onAcknowledgedChange,
  disabled,
}: CurfewNoticeProps) {
  const windowLabel = formatCurfewWindow(curfew);
  const reason =
    startInCurfew && endInCurfew
      ? `This message would send and finish during your church's quiet hours (${windowLabel}).`
      : startInCurfew
        ? `This message is set to ${scheduled ? 'start' : 'send'} during your church's quiet hours (${windowLabel}).`
        : `This message would still be sending during your church's quiet hours (${windowLabel}).`;

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-900">
      <div className="flex items-start gap-2">
        <MoonStar className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold">Sending during quiet hours</p>
            <p className="text-sm">
              {reason} Recipients may not want texts at this time. Send it anyway only if this cannot wait.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Checkbox
              id="curfew-override"
              checked={acknowledged}
              onCheckedChange={(value) => onAcknowledgedChange(value === true)}
              disabled={disabled}
              className="mt-0.5 border-amber-400 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
            />
            <Label htmlFor="curfew-override" className="text-sm font-normal leading-snug">
              I understand and want to deliver this text outside of messaging quiet hours.
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
}
