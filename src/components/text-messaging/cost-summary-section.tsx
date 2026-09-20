'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ChevronDown, Clock, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDuration, formatUsd, type CostEstimate, type SmsAnalysis } from './sms-utils';
import {
  formatZonedDateTime,
  formatZonedTime,
  instantToZonedWallClock,
  sameZonedDay,
  timeZoneAbbreviation,
} from './schedule-utils';
import { InfoHint } from './info-hint';

export type ScheduleWhen = 'now' | 'later';

interface CostSummarySectionProps {
  recipients: number;
  analysis: SmsAnalysis;
  cost: CostEstimate;
  isMms: boolean;
  costPerSegment: number;
  mmsCostPerMessage: number;
  completionSeconds: number;
  segmentsPerSecond: number;
  /** IANA zone of the MP domain; the picker and estimates are shown in it. */
  timeZone: string;
  when: ScheduleWhen;
  onWhenChange: (when: ScheduleWhen) => void;
  /** Wall-clock "YYYY-MM-DDTHH:MM" in `timeZone`. */
  scheduledLocal: string;
  onScheduledLocalChange: (value: string) => void;
  /** Instant the send starts when scheduled and valid; null otherwise. */
  scheduledInstant: Date | null;
  /** Why the schedule cannot be used yet (empty, in the past). */
  scheduleProblem: string | null;
  disabled?: boolean;
}

export function CostSummarySection({
  recipients,
  analysis,
  cost,
  isMms,
  costPerSegment,
  mmsCostPerMessage,
  completionSeconds,
  segmentsPerSecond,
  timeZone,
  when,
  onWhenChange,
  scheduledLocal,
  onScheduledLocalChange,
  scheduledInstant,
  scheduleProblem,
  disabled,
}: CostSummarySectionProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const ready = cost.totalSegments > 0;
  const zoneLabel = timeZoneAbbreviation(timeZone, scheduledInstant ?? undefined);
  // Floor of the picker: the current wall-clock time in the domain's zone, so only
  // future datetimes can be chosen. Server/logic still validates via `scheduleProblem`.
  const minScheduledLocal = instantToZonedWallClock(new Date(), timeZone);

  let finishLine: string | null = null;
  if (ready && when === 'later' && scheduledInstant) {
    const finish = new Date(scheduledInstant.getTime() + completionSeconds * 1000);
    const finishText = sameZonedDay(scheduledInstant, finish, timeZone)
      ? formatZonedTime(finish, timeZone)
      : formatZonedDateTime(finish, timeZone);
    finishLine = `Starts ${formatZonedDateTime(scheduledInstant, timeZone)}, done around ${finishText}`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Cost and timing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-muted-foreground">When to send</Label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6">
            <RadioGroup
              value={when}
              onValueChange={(value) => onWhenChange(value as ScheduleWhen)}
              className="flex flex-col gap-2 sm:flex-row sm:gap-5 sm:pt-2"
              disabled={disabled}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="now" id="text-when-now" />
                <Label htmlFor="text-when-now" className="font-normal">
                  Right away
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="later" id="text-when-later" />
                <Label htmlFor="text-when-later" className="font-normal">
                  Schedule for later
                </Label>
              </div>
            </RadioGroup>
            {when === 'later' && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Input
                    id="text-schedule-at"
                    type="datetime-local"
                    value={scheduledLocal}
                    min={minScheduledLocal}
                    onChange={(e) => onScheduledLocalChange(e.target.value)}
                    disabled={disabled}
                    aria-label="Send at"
                    className="w-auto"
                  />
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    {zoneLabel}
                    <InfoHint label="About the time zone">
                      Times are in the church&apos;s time zone ({timeZone.replace(/_/g, ' ')}), which is what
                      Ministry Platform uses to schedule sends, even if you are somewhere else.
                    </InfoHint>
                  </span>
                </div>
                {scheduleProblem && <p className="text-xs text-red-600">{scheduleProblem}</p>}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border bg-slate-50 p-4">
            <p className="text-xs text-muted-foreground">Estimated cost</p>
            <p className="text-2xl font-semibold tabular-nums mt-1">{ready ? formatUsd(cost.total) : '$0.00'}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {ready
                ? `for ${recipients.toLocaleString()} ${recipients === 1 ? 'person' : 'people'}`
                : 'Add recipients and a message'}
            </p>
          </div>
          <div className="rounded-lg border bg-slate-50 p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Delivery time
              {ready && (
                <InfoHint label="How delivery time is estimated">
                  Messages go out at about {segmentsPerSecond} per second. This send is{' '}
                  {cost.totalSegments.toLocaleString()} {isMms ? 'picture message' : 'text piece'}
                  {cost.totalSegments === 1 ? '' : 's'} in total
                  {isMms ? '' : ` (${recipients.toLocaleString()} people x ${analysis.segments} per person)`}.
                </InfoHint>
              )}
            </p>
            <p className="text-2xl font-semibold mt-1">
              {ready ? formatDuration(completionSeconds).replace(/^about /, '') : 'n/a'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {!ready
                ? 'Add recipients and a message'
                : finishLine ?? (when === 'later' ? 'Pick a date and time to see when it finishes' : 'from the moment it is released')}
            </p>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setDetailsOpen((open) => !open)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            aria-expanded={detailsOpen}
          >
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', detailsOpen && 'rotate-180')} />
            {detailsOpen ? 'Hide details' : 'Show details'}
          </button>
          {detailsOpen && (
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:max-w-md">
              <dt className="text-muted-foreground">Recipients</dt>
              <dd className="text-right tabular-nums">{recipients.toLocaleString()}</dd>

              <dt className="text-muted-foreground">Message type</dt>
              <dd className="text-right">{isMms ? 'Picture message (MMS)' : `Text (SMS, ${analysis.encoding})`}</dd>

              <dt className="text-muted-foreground">{isMms ? 'Billed per person' : 'Pieces per person'}</dt>
              <dd className="text-right tabular-nums">{isMms ? '1 message' : analysis.segments}</dd>

              <dt className="text-muted-foreground">Rate</dt>
              <dd className="text-right tabular-nums">
                {isMms ? `${formatUsd(mmsCostPerMessage)} per message` : `${formatUsd(costPerSegment)} per piece`}
              </dd>

              <dt className="text-muted-foreground">Cost per person</dt>
              <dd className="text-right tabular-nums">{formatUsd(cost.perRecipient)}</dd>

              <dt className="text-muted-foreground">Total pieces</dt>
              <dd className="text-right tabular-nums">{cost.totalSegments.toLocaleString()}</dd>

              <dt className="text-muted-foreground">Send rate</dt>
              <dd className="text-right tabular-nums">{segmentsPerSecond} per second</dd>
            </dl>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
