'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Users } from 'lucide-react';
import type {
  MessagingViewOption,
  SelectOption,
  TextRecipientMode,
  TextRecipientSummary,
  TextRecipientTarget,
} from '@/lib/dto';
import type { ToolParams } from '@/lib/tool-params';
import { CampusMultiSelect } from '@/components/campus-multi-select';
import { InfoHint } from './info-hint';

/** "all" = every campus the sender may text; "specific" = the picked campuses only. */
export type CampusScope = 'all' | 'specific';

interface RecipientSectionProps {
  params: ToolParams;
  selectionAvailable: boolean;
  /** True when launched from one open record (`recordID`) rather than a selection. */
  recordAvailable: boolean;
  target: TextRecipientTarget;
  onTargetChange: (target: TextRecipientTarget) => void;
  audiences: SelectOption[];
  publications: SelectOption[];
  /** Messaging views on the launching page; when non-empty one must be chosen. */
  messagingViews: MessagingViewOption[];
  congregations: SelectOption[];
  /** Campuses the sender's global filter allows; empty = every campus. */
  allowedCongregationIds: number[];
  campusScope: CampusScope;
  onCampusScopeChange: (scope: CampusScope) => void;
  congregationIds: number[];
  onCongregationToggle: (id: number) => void;
  summary: TextRecipientSummary | null;
  resolving: boolean;
  resolveError: string | null;
  disabled?: boolean;
}

function plural(count: number, singular: string, pluralWord = `${singular}s`): string {
  return `${count.toLocaleString()} ${count === 1 ? singular : pluralWord}`;
}

export function RecipientSection({
  params,
  selectionAvailable,
  recordAvailable,
  target,
  onTargetChange,
  audiences,
  publications,
  messagingViews,
  congregations,
  allowedCongregationIds,
  campusScope,
  onCampusScopeChange,
  congregationIds,
  onCongregationToggle,
  summary,
  resolving,
  resolveError,
  disabled,
}: RecipientSectionProps) {
  const exclusions = summary
    ? [
        summary.excludedByCongregation > 0 && `${summary.excludedByCongregation.toLocaleString()} at other campuses`,
        summary.excludedNoMobile > 0 && `${summary.excludedNoMobile.toLocaleString()} with no mobile number`,
        summary.excludedOptedOut > 0 && `${summary.excludedOptedOut.toLocaleString()} opted out of texting`,
        summary.excludedDuplicateNumber > 0 &&
          `${summary.excludedDuplicateNumber.toLocaleString()} sharing a number with someone already included`,
      ].filter((x): x is string => Boolean(x))
    : [];

  const selectionLabel = params.sc
    ? `Selected records (${params.sc} from ${params.pageData?.Display_Name ?? 'the launching page'})`
    : params.pageData?.Display_Name
      ? `Selected records (from ${params.pageData.Display_Name})`
      : 'Selected records';
  const recordNoun = params.pageData?.Singular_Name?.toLowerCase() ?? 'record';
  const recordLabel = params.recordDescription
    ? `This ${recordNoun}: ${params.recordDescription}`
    : `This ${recordNoun}`;
  const launchMode = target.mode === 'selection' || target.mode === 'record';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Users className="w-4 h-4" />
          Recipients
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Who */}
          <div className="space-y-3">
            <Label className="text-muted-foreground">Send to</Label>
            <RadioGroup
              value={target.mode}
              onValueChange={(value) => onTargetChange({ mode: value as TextRecipientMode })}
              className="space-y-1"
              disabled={disabled}
            >
              {selectionAvailable && (
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="selection" id="text-mode-selection" />
                  <Label htmlFor="text-mode-selection" className="font-normal">
                    {selectionLabel}
                  </Label>
                </div>
              )}
              {recordAvailable && (
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="record" id="text-mode-record" />
                  <Label htmlFor="text-mode-record" className="font-normal">
                    {recordLabel}
                  </Label>
                </div>
              )}
              <div className="flex items-center gap-2">
                <RadioGroupItem value="audience" id="text-mode-audience" />
                <Label htmlFor="text-mode-audience" className="font-normal">
                  An audience
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="publication" id="text-mode-publication" />
                <Label htmlFor="text-mode-publication" className="font-normal">
                  Publication subscribers
                </Label>
              </div>
            </RadioGroup>

            {launchMode && messagingViews.length > 0 && (
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  Which contacts
                  <InfoHint label="Where these options come from">
                    These are the messaging views set up on the {params.pageData?.Display_Name ?? 'launching'} page
                    in Ministry Platform. Each one reaches a different set of people connected to the{' '}
                    {target.mode === 'record' ? recordNoun : 'selected records'}, for example the registered
                    participants of an event.
                  </InfoHint>
                </Label>
                <Select
                  value={target.messagingViewId ? String(target.messagingViewId) : undefined}
                  onValueChange={(value) => onTargetChange({ ...target, messagingViewId: Number(value) })}
                  disabled={disabled}
                >
                  <SelectTrigger aria-label="Which contacts">
                    <SelectValue placeholder="Choose which contacts to text" />
                  </SelectTrigger>
                  <SelectContent>
                    {messagingViews.map((v) => (
                      <SelectItem key={v.id} value={String(v.id)}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {target.mode === 'audience' && (
              <Select
                value={target.audienceId ? String(target.audienceId) : undefined}
                onValueChange={(value) => onTargetChange({ mode: 'audience', audienceId: Number(value) })}
                disabled={disabled}
              >
                <SelectTrigger aria-label="Audience">
                  <SelectValue placeholder="Choose an audience" />
                </SelectTrigger>
                <SelectContent>
                  {audiences.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {target.mode === 'publication' && (
              <Select
                value={target.publicationId ? String(target.publicationId) : undefined}
                onValueChange={(value) => onTargetChange({ mode: 'publication', publicationId: Number(value) })}
                disabled={disabled}
              >
                <SelectTrigger aria-label="Publication">
                  <SelectValue placeholder="Choose a publication" />
                </SelectTrigger>
                <SelectContent>
                  {publications.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Where */}
          <div className="space-y-3">
            <Label className="text-muted-foreground flex items-center gap-1.5">
              Campuses
              <InfoHint label="How campuses are matched">
                Contacts are matched on their household campus.{' '}
                {allowedCongregationIds.length > 0
                  ? 'Your Ministry Platform global filter decides which campuses you can text.'
                  : 'You have no global filter, so every campus is available.'}
              </InfoHint>
            </Label>
            <RadioGroup
              value={campusScope}
              onValueChange={(value) => onCampusScopeChange(value as CampusScope)}
              className="space-y-1"
              disabled={disabled}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="all" id="text-campus-all" />
                <Label htmlFor="text-campus-all" className="font-normal">
                  {allowedCongregationIds.length > 0
                    ? `All my campuses (${allowedCongregationIds.length})`
                    : 'All campuses'}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="specific" id="text-campus-specific" />
                <Label htmlFor="text-campus-specific" className="font-normal">
                  Specific campuses
                </Label>
              </div>
            </RadioGroup>
            {campusScope === 'specific' && (
              <div className="space-y-1.5">
                <CampusMultiSelect
                  campuses={congregations}
                  selectedIds={congregationIds}
                  onToggle={onCongregationToggle}
                  placeholder="Pick one or more campuses"
                  disabled={disabled}
                />
                {congregationIds.length === 0 && (
                  <p className="text-xs text-muted-foreground">Pick at least one campus, or switch back to all campuses.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {resolving && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Finding recipients...
          </div>
        )}

        {resolveError && <div className="text-sm text-red-600 bg-red-50 rounded-md p-3">{resolveError}</div>}

        {!resolving && !resolveError && summary && (
          <div className="text-sm rounded-md bg-slate-50 border p-3 space-y-1">
            <p>
              <span className="font-semibold text-base">{summary.recipientContactIds.length.toLocaleString()}</span>{' '}
              {summary.recipientContactIds.length === summary.totalContacts
                ? summary.totalContacts === 1
                  ? 'contact'
                  : 'contacts'
                : `of ${plural(summary.totalContacts, 'contact')}`}{' '}
              will receive this text.
            </p>
            {exclusions.length > 0 && <p className="text-xs text-muted-foreground">Not included: {exclusions.join(', ')}.</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
