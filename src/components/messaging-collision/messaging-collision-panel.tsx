'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Info, Loader2, Radar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MessagingCollision, MessagingCollisionResult } from '@/lib/dto';
import {
  channelLabel,
  describeDelay,
  describeTiming,
  describeWindow,
  formatCollisionTime,
  partitionCollisions,
  summarizeCollisions,
  type CollisionLevel,
} from './collision-utils';

interface MessagingCollisionPanelProps {
  result: MessagingCollisionResult | null;
  loading: boolean;
  error: string | null;
  /** IANA zone the church works in; timestamps are shown in it. */
  timeZone: string;
  /** What to call the planned send in copy, e.g. "text" or "email". */
  sendNoun?: string;
  className?: string;
}

const LEVEL_STYLES: Record<CollisionLevel, string> = {
  none: 'border-green-200 bg-green-50 text-green-900',
  notice: 'border-sky-200 bg-sky-50 text-sky-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
};

/**
 * Lists other email or text messages starting within a few hours of the planned
 * send, split into the ones before it and the ones after it, with the facts a
 * sender weighs: when, how many people, how many of them overlap, and whether the
 * two sends would queue against each other. Renders nothing until a check has started.
 */
export function MessagingCollisionPanel({
  result,
  loading,
  error,
  timeZone,
  sendNoun = 'message',
  className,
}: MessagingCollisionPanelProps) {
  if (!result && !loading && !error) return null;
  const summary = result ? summarizeCollisions(result, sendNoun) : null;
  const groups = result ? partitionCollisions(result.collisions) : null;
  const Icon = summary?.level === 'warning' ? AlertTriangle : summary?.level === 'notice' ? Info : CheckCircle2;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Radar className="w-4 h-4" />
          Other messages around this time
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && !result && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking...
          </div>
        )}

        {error && !loading && <p className="text-sm text-muted-foreground">Could not check: {error}</p>}

        {result && summary && groups && (
          <>
            <div
              className={cn(
                'flex items-start gap-2 text-sm rounded-md border p-3',
                LEVEL_STYLES[summary.level],
                loading && 'opacity-60'
              )}
            >
              <Icon className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
              <p>{summary.headline}</p>
            </div>

            <CollisionGroup
              title={`Before this ${sendNoun}`}
              collisions={groups.before}
              result={result}
              timeZone={timeZone}
              sendNoun={sendNoun}
            />
            <CollisionGroup
              title={`After this ${sendNoun}`}
              collisions={groups.after}
              result={result}
              timeZone={timeZone}
              sendNoun={sendNoun}
            />

            {result.truncatedCount > 0 && (
              <p className="text-xs text-muted-foreground">And {result.truncatedCount.toLocaleString()} more.</p>
            )}

            <p className="text-xs text-muted-foreground">
              Window: {describeWindow(result)} either side. Large: more than{' '}
              {result.largeSendThreshold.toLocaleString()} people. Delays are estimates.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function CollisionGroup({
  title,
  collisions,
  result,
  timeZone,
  sendNoun,
}: {
  title: string;
  collisions: MessagingCollision[];
  result: MessagingCollisionResult;
  timeZone: string;
  sendNoun: string;
}) {
  if (collisions.length === 0) return null;
  return (
    <section className="space-y-1.5">
      <h4 className="text-sm font-medium">{title}</h4>
      <ul className="divide-y rounded-md border text-sm">
        {collisions.map((c) => (
          <CollisionRow key={c.communicationId} collision={c} timeZone={timeZone} result={result} sendNoun={sendNoun} />
        ))}
      </ul>
    </section>
  );
}

function CollisionRow({
  collision,
  timeZone,
  result,
  sendNoun,
}: {
  collision: MessagingCollision;
  timeZone: string;
  result: MessagingCollisionResult;
  sendNoun: string;
}) {
  const overlapText =
    !result.overlapChecked || collision.overlapCount === null
      ? null
      : `${collision.overlapCount.toLocaleString()} also on this ${sendNoun}`;
  const delay = describeDelay(collision, sendNoun);

  return (
    <li className={cn('p-3 space-y-1', collision.interferes && 'border-l-2 border-l-amber-400')}>
      <div className="flex items-center gap-2 min-w-0">
        <Badge variant={collision.channel === 'sms' ? 'default' : 'secondary'} className="shrink-0">
          {channelLabel(collision)}
        </Badge>
        <span className="font-medium truncate" title={collision.subject || undefined}>
          {collision.subject || '(no subject)'}
        </span>
        <span className="ml-auto flex shrink-0 gap-1.5">
          {collision.isHighImpact && <Badge variant="destructive">High impact</Badge>}
          {delay && (
            <Badge variant="outline" className="border-amber-300 text-amber-900">
              {delay}
            </Badge>
          )}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {formatCollisionTime(collision.startAt, timeZone)}
        {' · '}
        {describeTiming(collision)}
        {' · '}
        <span className={collision.isHighImpact ? 'font-medium text-foreground' : undefined}>
          {collision.recipientCount.toLocaleString()} people
        </span>
        {overlapText ? `, ${overlapText}` : ''}
      </p>
    </li>
  );
}
