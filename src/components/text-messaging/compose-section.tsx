'use client';

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Braces, ImagePlus, Lightbulb, Loader2, MessageSquare, Shrink, Sparkles, Wand2, X } from 'lucide-react';
import type { MergeFieldOption, SmsNumberOption } from '@/lib/dto';
import { cn } from '@/lib/utils';
import {
  GSM_SINGLE_SEGMENT_LIMIT,
  SMS_MAX_BODY_LENGTH,
  UCS2_SINGLE_SEGMENT_LIMIT,
  describeReplacements,
  estimateCompletionSeconds,
  formatDuration,
  formatUsd,
  normalizeLookalikes,
  toGsmSafe,
  type SmsAnalysis,
} from './sms-utils';
import { canShrinkAttachment, formatBytes, type PreparedAttachment } from './image-utils';
import { AiRewritePanel } from './ai-rewrite-panel';
import { InfoHint } from './info-hint';

interface ComposeSectionProps {
  smsNumbers: SmsNumberOption[];
  fromSmsNumberId: number | undefined;
  onFromChange: (id: number) => void;
  body: string;
  onBodyChange: (value: string) => void;
  mergeFields: MergeFieldOption[];
  unknownPlaceholders: string[];
  analysis: SmsAnalysis;
  /** True when the counts were computed with placeholders replaced by sample values. */
  countsAreEstimated: boolean;
  attachment: PreparedAttachment | null;
  attachmentPreviewUrl: string | null;
  attachmentError: string | null;
  preparingAttachment: boolean;
  onAttachmentPicked: (file: File) => void;
  onAttachmentRemoved: () => void;
  /** Re-prepares the attachment at `compactImageWidth`; offered when it is over the recommended size. */
  onAttachmentShrink: () => void;
  compactImageWidth: number;
  /** True when the same text would cost less as an MMS (no image attached yet). */
  mmsWouldBeCheaper: boolean;
  /** Per-recipient saving if an image were attached. */
  mmsSavingPerRecipient: number;
  mmsCostPerMessage: number;
  maxImageWidth: number;
  /** True when an AI provider is wired; shows the AI rewrite button. */
  aiWriterEnabled: boolean;
  costPerSegment: number;
  recipientCount: number;
  /** Messages the platform releases per second; used to phrase delivery-time impact. */
  segmentsPerSecond: number;
  disabled?: boolean;
}

function describeChar(char: string): string {
  const code = char.codePointAt(0) ?? 0;
  const hex = code.toString(16).toUpperCase().padStart(4, '0');
  return `"${char}" (U+${hex})`;
}

function segmentLabel(count: number): string {
  return `${count} segment${count === 1 ? '' : 's'}`;
}

/** "4 minutes", "under a minute": the bare span for "delivery time by ...". */
function durationSpan(seconds: number): string {
  return formatDuration(seconds).replace(/^about /, '');
}

export function ComposeSection({
  smsNumbers,
  fromSmsNumberId,
  onFromChange,
  body,
  onBodyChange,
  mergeFields,
  unknownPlaceholders,
  analysis,
  countsAreEstimated,
  attachment,
  attachmentPreviewUrl,
  attachmentError,
  preparingAttachment,
  onAttachmentPicked,
  onAttachmentRemoved,
  onAttachmentShrink,
  compactImageWidth,
  mmsWouldBeCheaper,
  mmsSavingPerRecipient,
  mmsCostPerMessage,
  maxImageWidth,
  aiWriterEnabled,
  costPerSegment,
  recipientCount,
  segmentsPerSecond,
  disabled,
}: ComposeSectionProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [placeholderPick, setPlaceholderPick] = useState<string>('');
  const [normalizeNotice, setNormalizeNotice] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCaretRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, []);

  // Restore the caret after a normalized value has rendered.
  useEffect(() => {
    const caret = pendingCaretRef.current;
    if (caret === null) return;
    pendingCaretRef.current = null;
    const textarea = textareaRef.current;
    if (textarea && document.activeElement === textarea) {
      textarea.setSelectionRange(caret, caret);
    }
  }, [body]);

  /**
   * Swaps curly quotes, dashes, and similar lookalikes for plain characters as the
   * sender types or pastes, keeps the caret in place, and shows a short notice so
   * they learn why. Emoji and other unmappable characters are left for the hint below.
   */
  const handleBodyInput = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const raw = event.target.value;
    const normalized = normalizeLookalikes(raw);
    if (normalized.total === 0) {
      onBodyChange(raw);
      return;
    }
    const caret = event.target.selectionStart ?? raw.length;
    pendingCaretRef.current = normalizeLookalikes(raw.slice(0, caret)).text.length;
    onBodyChange(normalized.text);
    setNormalizeNotice(`Replaced ${describeReplacements(normalized.replacements)} with plain characters so the text stays short.`);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setNormalizeNotice(null), 8000);
  };

  const insertPlaceholder = useCallback(
    (token: string) => {
      const textarea = textareaRef.current;
      const insert = `[${token}]`;
      if (!textarea) {
        onBodyChange(body + insert);
        return;
      }
      const start = textarea.selectionStart ?? body.length;
      const end = textarea.selectionEnd ?? body.length;
      const next = body.slice(0, start) + insert + body.slice(end);
      onBodyChange(next);
      requestAnimationFrame(() => {
        textarea.focus();
        const cursor = start + insert.length;
        textarea.setSelectionRange(cursor, cursor);
      });
    },
    [body, onBodyChange]
  );

  const handlePlaceholderSelect = (token: string) => {
    insertPlaceholder(token);
    // Reset so the same field can be inserted twice in a row.
    setPlaceholderPick('');
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onAttachmentPicked(file);
    event.target.value = '';
  };

  const overLimit = analysis.overMaxLength;
  const isMms = attachment !== null;
  const hasSpecial = analysis.nonGsmCharacters.length > 0;
  const specialCostsMore = hasSpecial && !isMms && analysis.segments > analysis.segmentsIfGsm;
  const replaceable = analysis.nonGsmCharacters.filter((c) => c.replacement !== null);
  const removeOnly = analysis.nonGsmCharacters.filter((c) => c.replacement === null);
  const singleNumber = smsNumbers.length === 1 ? smsNumbers[0] : null;

  // Both hints below express impact as money and time for the whole send. They only read
  // as concrete once recipients are resolved and a send rate is known; before that, fall
  // back to a neutral nudge rather than showing $0.00 / "no time".
  const canQuantify = recipientCount > 0 && segmentsPerSecond > 0;

  // Emoji / special-symbol penalty: extra segments per person, times recipients.
  const extraSegmentsPerPerson = Math.max(0, analysis.segments - analysis.segmentsIfGsm);
  const specialExtraCost = extraSegmentsPerPerson * recipientCount * costPerSegment;
  const specialExtraSeconds = estimateCompletionSeconds(extraSegmentsPerPerson * recipientCount, segmentsPerSecond);

  // MMS saving: one picture message per person instead of several text pieces.
  const mmsSavingTotal = mmsSavingPerRecipient * recipientCount;
  const mmsSecondsSaved = estimateCompletionSeconds(
    Math.max(0, analysis.segments - 1) * recipientCount,
    segmentsPerSecond
  );

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Message
        </CardTitle>
        <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
          <Label htmlFor="text-from" className="text-xs text-muted-foreground shrink-0">
            From
          </Label>
          {smsNumbers.length === 0 ? (
            <span className="text-red-600">No texting number available to you</span>
          ) : singleNumber ? (
            <span className="text-foreground truncate">
              {singleNumber.label}
              {singleNumber.number ? ` (${singleNumber.number})` : ''}
            </span>
          ) : (
            <Select
              value={fromSmsNumberId ? String(fromSmsNumberId) : undefined}
              onValueChange={(value) => onFromChange(Number(value))}
              disabled={disabled}
            >
              <SelectTrigger id="text-from" className="h-8 text-xs w-full sm:w-[260px]">
                <SelectValue placeholder="Choose a number" />
              </SelectTrigger>
              <SelectContent>
                {smsNumbers.map((n) => (
                  <SelectItem key={n.id} value={String(n.id)}>
                    {n.label}
                    {n.number ? ` (${n.number})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {smsNumbers.length === 0 && (
          <p className="text-sm text-red-600 bg-red-50 rounded-md p-3">
            No active texting numbers are available to you. Ask an administrator to grant your user group access to
            a number.
          </p>
        )}

        <Textarea
          id="text-body"
          ref={textareaRef}
          value={body}
          rows={2}
          maxLength={SMS_MAX_BODY_LENGTH}
          placeholder="Hi [Nickname], this Sunday we..."
          onChange={handleBodyInput}
          disabled={disabled}
          aria-label="Message"
          className={cn('min-h-[65px] text-base leading-relaxed resize-y', overLimit && 'border-red-400')}
        />

        {/* Toolbar: actions on the left, the one number that matters on the right. */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={placeholderPick} onValueChange={handlePlaceholderSelect} disabled={disabled}>
            <SelectTrigger className="h-8 text-xs w-[180px]" aria-label="Insert a placeholder">
              <span className="flex items-center gap-1.5">
                <Braces className="h-3.5 w-3.5" />
                <SelectValue placeholder="Personalize" />
              </span>
            </SelectTrigger>
            <SelectContent>
              {mergeFields.map((f) => (
                <SelectItem key={f.token} value={f.token}>
                  {f.label} <span className="text-muted-foreground">[{f.token}]</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={handleFileChange}
            disabled={disabled || preparingAttachment}
          />
          {!attachment && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                'h-8 text-xs',
                mmsWouldBeCheaper &&
                  'border-cyan-400 bg-cyan-50 text-cyan-900 ring-2 ring-cyan-200 hover:bg-cyan-100 hover:text-cyan-900'
              )}
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || preparingAttachment}
              title={`JPEG, PNG, GIF, or WebP. Resized to ${maxImageWidth}px wide, 5 MB max.`}
            >
              {preparingAttachment ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <ImagePlus className="h-3.5 w-3.5 mr-1.5" />
              )}
              Attach image
            </Button>
          )}

          {aiWriterEnabled && (
            <Button
              type="button"
              variant={aiOpen ? 'secondary' : 'outline'}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setAiOpen((open) => !open)}
              disabled={disabled}
              aria-expanded={aiOpen}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              AI rewrite
            </Button>
          )}

          <div
            className={cn(
              'ml-auto flex items-center gap-1.5 text-xs',
              overLimit ? 'text-red-600 font-medium' : 'text-muted-foreground'
            )}
          >
            <span>
              {analysis.characterCount.toLocaleString()} characters
              {analysis.segments > 0 && !isMms && ` · ${segmentLabel(analysis.segments)} per person`}
            </span>
            <InfoHint label="How the length is counted" side="left">
              {isMms ? (
                <p>
                  With an image attached this sends as a picture message (MMS), billed once per person no matter the
                  length, up to {SMS_MAX_BODY_LENGTH.toLocaleString()} characters.
                </p>
              ) : (
                <div className="space-y-1.5">
                  <p>
                    Carriers split long messages into pieces of {GSM_SINGLE_SEGMENT_LIMIT} characters (
                    {UCS2_SINGLE_SEGMENT_LIMIT} when emoji or special symbols are used) and bill each piece.
                  </p>
                  <p>
                    This message: {segmentLabel(analysis.segments)} per person, {analysis.unitsRemainingInSegment} character
                    {analysis.unitsRemainingInSegment === 1 ? '' : 's'} left before the next piece.
                    {' '}Limit {SMS_MAX_BODY_LENGTH.toLocaleString()} characters.
                  </p>
                  {countsAreEstimated && <p>Counts use sample values for the placeholders.</p>}
                </div>
              )}
            </InfoHint>
          </div>
        </div>

        {overLimit && (
          <p className="text-xs text-red-600">
            Carriers reject texts over {SMS_MAX_BODY_LENGTH.toLocaleString()} characters. Shorten the message.
          </p>
        )}

        {normalizeNotice && (
          <div className="flex items-start justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            <span>{normalizeNotice}</span>
            <button
              type="button"
              className="text-slate-500 hover:text-slate-800"
              onClick={() => setNormalizeNotice(null)}
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {hasSpecial && (
          <div
            className={cn(
              'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border px-3 py-2 text-xs',
              specialCostsMore ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-slate-200 bg-slate-50 text-slate-700'
            )}
          >
            <span className="flex items-center gap-1.5">
              {specialCostsMore
                ? canQuantify
                  ? `Emoji or special symbols are adding ${formatUsd(specialExtraCost)} and increasing delivery time by ${durationSpan(specialExtraSeconds)}.`
                  : 'Emoji or special symbols are adding to the cost and delivery time.'
                : 'This message contains emoji or special symbols.'}
              <InfoHint label="Which characters">
                <div className="space-y-1.5">
                  <p>
                    Emoji and symbols outside the standard text alphabet shrink each piece from {GSM_SINGLE_SEGMENT_LIMIT} to{' '}
                    {UCS2_SINGLE_SEGMENT_LIMIT} characters.
                  </p>
                  <ul className="space-y-0.5">
                    {replaceable.map((c) => (
                      <li key={c.char}>
                        {describeChar(c.char)} x{c.count}: becomes &quot;{c.replacement}&quot;
                      </li>
                    ))}
                    {removeOnly.map((c) => (
                      <li key={c.char}>
                        {describeChar(c.char)} x{c.count}: no plain equivalent, removed
                      </li>
                    ))}
                  </ul>
                </div>
              </InfoHint>
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs ml-auto bg-white"
              onClick={() => onBodyChange(toGsmSafe(body))}
              disabled={disabled}
            >
              <Wand2 className="h-3.5 w-3.5 mr-1.5" />
              {replaceable.length > 0 ? 'Use plain characters' : 'Remove them'}
            </Button>
          </div>
        )}

        {unknownPlaceholders.length > 0 && (
          <p className="text-xs rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
            {unknownPlaceholders.map((t) => `[${t}]`).join(', ')}{' '}
            {unknownPlaceholders.length === 1 ? 'is' : 'are'} not available for these recipients and will be left
            blank.
          </p>
        )}

        {aiWriterEnabled && aiOpen && (
          <AiRewritePanel
            body={body}
            isMms={isMms}
            currentAnalysis={analysis}
            costPerSegment={costPerSegment}
            recipientCount={recipientCount}
            onApply={(text) => {
              onBodyChange(text);
              setAiOpen(false);
            }}
            disabled={disabled}
          />
        )}

        {attachment && (
          <div className="flex items-center gap-3 rounded-md border p-2.5">
            {attachmentPreviewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={attachmentPreviewUrl} alt="Attachment" className="h-14 w-14 rounded object-cover border" />
            )}
            <div className="text-sm flex-1 min-w-0">
              <p className="font-medium truncate">{attachment.file.name}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                Sent as a picture message (MMS)
                <InfoHint label="About picture messages">
                  {attachment.width} x {attachment.height} px, {formatBytes(attachment.file.size)}
                  {attachment.resized || attachment.file.size < attachment.originalBytes
                    ? ` (reduced from ${formatBytes(attachment.originalBytes)})`
                    : ''}
                  . Picture messages are billed once per person ({formatUsd(mmsCostPerMessage)}) no matter how long the
                  text is, up to {SMS_MAX_BODY_LENGTH.toLocaleString()} characters.
                </InfoHint>
              </p>
              {attachment.warning && (
                <div className="mt-1 flex flex-col items-start gap-2">
                  <p className="text-xs text-amber-700 flex items-start gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span className="whitespace-pre-line">{attachment.warning}</span>
                  </p>
                  {canShrinkAttachment(attachment, compactImageWidth) && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={onAttachmentShrink}
                      disabled={disabled || preparingAttachment}
                    >
                      {preparingAttachment ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Shrink className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Optimize for Texting
                    </Button>
                  )}
                </div>
              )}
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={onAttachmentRemoved} disabled={disabled}>
              <X className="h-4 w-4" />
              <span className="sr-only">Remove attachment</span>
            </Button>
          </div>
        )}
        {attachmentError && <p className="text-sm text-red-600">{attachmentError}</p>}

        {mmsWouldBeCheaper && !attachment && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-cyan-300 bg-cyan-50 px-3 py-2.5 text-sm text-cyan-900">
            <span className="flex items-center gap-1.5 font-medium">
              <Lightbulb className="h-4 w-4 shrink-0 text-cyan-600" />
              {canQuantify
                ? `Attach an image to save ${formatUsd(mmsSavingTotal)} and reduce delivery time by ${durationSpan(mmsSecondsSaved)}.`
                : 'Attach an image to lower the cost and delivery time.'}
              <InfoHint label="Why an image is cheaper">
                A long text is billed per {GSM_SINGLE_SEGMENT_LIMIT}-character piece, and each piece goes out
                separately. A picture message (MMS) is billed once per person at {formatUsd(mmsCostPerMessage)} and
                sends as a single message, so it costs less and clears faster.
              </InfoHint>
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs ml-auto bg-white border-cyan-300 text-cyan-900 hover:bg-cyan-100 hover:text-cyan-900"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || preparingAttachment}
            >
              {preparingAttachment ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <ImagePlus className="h-3.5 w-3.5 mr-1.5" />
              )}
              Attach image
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
