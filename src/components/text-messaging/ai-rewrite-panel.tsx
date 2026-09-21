'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, RefreshCw, Sparkles, X } from 'lucide-react';
import type { SmsRewriteResult } from '@/lib/dto';
import { rewriteTextForSms } from './actions';
import { analyzeSms, formatUsd, type SmsAnalysis } from './sms-utils';

interface AiRewritePanelProps {
  body: string;
  isMms: boolean;
  /** Current analysis of the draft, for the before/after comparison. */
  currentAnalysis: SmsAnalysis;
  costPerSegment: number;
  recipientCount: number;
  onApply: (text: string) => void;
  disabled?: boolean;
}

function delta(before: number, after: number): string {
  const diff = after - before;
  if (diff === 0) return 'same';
  return diff < 0 ? `${diff}` : `+${diff}`;
}

/**
 * Asks the wired AI provider for a shorter, clearer, cheaper rewrite of the draft and shows
 * it side by side with the current stats. Nothing changes until the sender applies it.
 */
export function AiRewritePanel({
  body,
  isMms,
  currentAnalysis,
  costPerSegment,
  recipientCount,
  onApply,
  disabled,
}: AiRewritePanelProps) {
  const [guidance, setGuidance] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SmsRewriteResult | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    const response = await rewriteTextForSms({ body, guidance: guidance || undefined, isMms });
    if (response.success) {
      setResult(response);
    } else {
      setError(response.error);
    }
    setLoading(false);
  };

  const apply = () => {
    if (!result) return;
    onApply(result.text);
    setResult(null);
  };

  const suggested = result ? analyzeSms(result.text) : null;
  const canRun = body.trim().length > 0 && !disabled && !loading;

  const segmentCostBefore = isMms ? 0 : currentAnalysis.segments * costPerSegment;
  const segmentCostAfter = suggested && !isMms ? suggested.segments * costPerSegment : 0;
  const savingPerRecipient = segmentCostBefore - segmentCostAfter;

  return (
    <div className="rounded-md border border-violet-200 bg-violet-50/60 p-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-sm font-medium text-violet-900">
          <Sparkles className="h-4 w-4" />
          AI rewrite
        </span>
        <span className="text-xs text-violet-900/80">
          Suggests a shorter, clearer version that costs fewer segments. You choose whether to use it.
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          value={guidance}
          onChange={(e) => setGuidance(e.target.value)}
          placeholder="Optional guidance, e.g. keep the time and the link"
          maxLength={200}
          disabled={disabled || loading}
          className="bg-white"
        />
        <Button type="button" size="sm" onClick={run} disabled={!canRun} className="shrink-0">
          {loading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
          {result ? 'Try again' : 'Suggest a rewrite'}
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && suggested && (
        <div className="rounded-md border bg-white p-3 space-y-3">
          <p className="text-sm whitespace-pre-wrap break-words font-mono">{result.text}</p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              Characters: {currentAnalysis.characterCount} to {suggested.characterCount} (
              {delta(currentAnalysis.characterCount, suggested.characterCount)})
            </span>
            <span>
              Segments: {currentAnalysis.segments} to {suggested.segments} (
              {delta(currentAnalysis.segments, suggested.segments)})
            </span>
            <Badge variant={suggested.encoding === 'GSM-7' ? 'secondary' : 'destructive'} className="text-[10px]">
              {suggested.encoding}
            </Badge>
            {!isMms && savingPerRecipient > 0 && (
              <span className="text-green-700">
                Saves {formatUsd(savingPerRecipient)} per recipient
                {recipientCount > 0 ? `, ${formatUsd(savingPerRecipient * recipientCount)} total` : ''}
              </span>
            )}
            {!isMms && savingPerRecipient < 0 && (
              <span className="text-amber-700">Costs {formatUsd(-savingPerRecipient)} more per recipient</span>
            )}
          </div>

          {result.placeholdersDropped.length > 0 && (
            <p className="text-xs text-amber-700">
              The rewrite dropped {result.placeholdersDropped.map((t) => `[${t}]`).join(', ')}. Add it back if you
              still want it personalized.
            </p>
          )}
          {result.gsmFixed && (
            <p className="text-xs text-muted-foreground">Special characters in the suggestion were replaced with plain ones.</p>
          )}

          <div className="flex items-center gap-2">
            <Button type="button" size="sm" onClick={apply} disabled={disabled}>
              <Check className="h-4 w-4 mr-1.5" />
              Use this rewrite
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={run} disabled={!canRun}>
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Try again
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setResult(null)} disabled={disabled}>
              <X className="h-4 w-4 mr-1.5" />
              Dismiss
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
