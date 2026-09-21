'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarClock, ClipboardCheck, Loader2, MessageSquarePlus, Send } from 'lucide-react';
import type { TextQuota } from '@/lib/dto';
import { formatUsd } from './sms-utils';
import { InfoHint } from './info-hint';

export interface SendProgress {
  sentRows: number;
  totalRows: number;
  skippedRows: number;
  failedRecipients: number;
}

interface ReviewSendSectionProps {
  recipientCount: number;
  fromLabel: string;
  totalCost: number;
  isMms: boolean;
  /** "Right away" or the scheduled start in church time, for the summary and dialog. */
  whenLabel: string;
  scheduled: boolean;
  quota: TextQuota;
  /** True when this send exceeds (or has no) pre-approved quota and will land In Review. */
  needsReview: boolean;
  /**
   * Whether the church has a message approval process. When false, a send that would need
   * review cannot go out at all, so the section shows a blocked notice instead of the
   * "an approver will review" copy.
   */
  approvalProcessConfigured: boolean;
  /** Non-null when sending is blocked; shown next to the disabled button. */
  blockedReason: string | null;
  /** One sentence about other messages landing near this send time, repeated in the confirm dialog. */
  collisionWarning?: string | null;
  /** One sentence noting the send falls in quiet hours, repeated in the confirm dialog. */
  curfewWarning?: string | null;
  sending: boolean;
  progress: SendProgress | null;
  /** Set once the send has been released; the form is locked and the button becomes "New message". */
  completedMessage: string | null;
  sendError: string | null;
  onSend: () => void;
  onRetryFailed: () => void;
  /** Resets the form for another text. */
  onNewMessage: () => void;
}

export function ReviewSendSection({
  recipientCount,
  fromLabel,
  totalCost,
  isMms,
  whenLabel,
  scheduled,
  quota,
  needsReview,
  approvalProcessConfigured,
  blockedReason,
  collisionWarning = null,
  curfewWarning = null,
  sending,
  progress,
  completedMessage,
  sendError,
  onSend,
  onRetryFailed,
  onNewMessage,
}: ReviewSendSectionProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  // With no approval process, a send that would need review is blocked rather than
  // submitted; the button (disabled via blockedReason) reads "Send text" in that case.
  const reviewUnavailable = needsReview && !approvalProcessConfigured;
  const buttonLabel =
    needsReview && !reviewUnavailable ? 'Submit for approval' : scheduled ? 'Schedule text' : 'Send text';
  const completed = completedMessage !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Send className="w-4 h-4" />
          Review and send
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">To</dt>
          <dd>{recipientCount > 0 ? `${recipientCount.toLocaleString()} ${recipientCount === 1 ? 'person' : 'people'}` : 'No recipients yet'}</dd>
          <dt className="text-muted-foreground">From</dt>
          <dd>{fromLabel || 'Choose a number'}</dd>
          <dt className="text-muted-foreground">When</dt>
          <dd>{whenLabel}</dd>
          <dt className="text-muted-foreground">Cost</dt>
          <dd>
            {formatUsd(totalCost)}
            {isMms ? ' (picture message)' : ''}
          </dd>
        </dl>

        <div
          className={`flex items-start gap-1.5 text-sm rounded-md border p-3 ${
            reviewUnavailable
              ? 'border-red-200 bg-red-50 text-red-900'
              : needsReview
                ? 'border-amber-200 bg-amber-50 text-amber-900'
                : 'border-green-200 bg-green-50 text-green-900'
          }`}
        >
          <p>
            {reviewUnavailable
              ? quota.limit === null
                ? 'This text cannot be sent: your account has no pre-approved texting limit and this church has not set up a message approval process.'
                : `This text cannot be sent: ${recipientCount.toLocaleString()} people is over your limit of ${quota.limit.toLocaleString()}, and this church has not set up a message approval process. Reduce the recipients to ${quota.limit.toLocaleString()} or fewer.`
              : quota.limit === null
                ? 'An approver will review this message before it sends.'
                : needsReview
                  ? `An approver will review this message before it sends: ${recipientCount.toLocaleString()} people is over your limit of ${quota.limit.toLocaleString()}.`
                  : `No approval needed: within your limit of ${quota.limit.toLocaleString()} people.`}
          </p>
          <InfoHint label="About approval limits" className="mt-0.5">
            {reviewUnavailable
              ? `Your pre-approved texting limit${
                  quota.roleNames.length > 0 ? ` (from ${quota.roleNames.join(', ')})` : ''
                } is the number of people you can text without approval. Because this church has no message approval process set up, texts over that limit cannot be sent. Send to fewer people, or ask an administrator to set up an approval process.`
              : quota.limit === null
                ? 'None of your security roles has a pre-approved texting limit (Mass Text Quota), so every text you send is placed in review until an approver releases it.'
                : `Your pre-approved texting limit comes from your security role${quota.roleNames.length === 1 ? '' : 's'}${
                    quota.roleNames.length > 0 ? ` (${quota.roleNames.join(', ')})` : ''
                  }. Sends within it go out on their own; larger sends wait for an approver.`}
          </InfoHint>
        </div>

        {sending && progress && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Preparing messages... {progress.sentRows.toLocaleString()} of {progress.totalRows.toLocaleString()}
            </div>
            <div className="h-2 w-full max-w-md rounded bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-cyan-600 transition-all"
                style={{
                  width: `${progress.totalRows > 0 ? Math.round((progress.sentRows / progress.totalRows) * 100) : 0}%`,
                }}
              />
            </div>
          </div>
        )}

        {sendError && <div className="text-sm text-red-600 bg-red-50 rounded-md p-3">{sendError}</div>}

        {completedMessage && (
          <div className="text-sm text-green-700 bg-green-50 rounded-md p-3">{completedMessage}</div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          {completed ? (
            <>
              <Button onClick={onNewMessage}>
                <MessageSquarePlus className="h-4 w-4 mr-2" />
                New message
              </Button>
              <span className="text-xs text-muted-foreground">Starts a fresh text. This one is already on its way.</span>
            </>
          ) : (
            <>
              <Button onClick={() => setConfirmOpen(true)} disabled={sending || blockedReason !== null}>
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : needsReview && !reviewUnavailable ? (
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                ) : scheduled ? (
                  <CalendarClock className="h-4 w-4 mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {buttonLabel}
              </Button>
              {!sending && progress && progress.failedRecipients > 0 && (
                <Button variant="secondary" onClick={onRetryFailed}>
                  Retry {progress.failedRecipients} failed
                </Button>
              )}
              {blockedReason && !sending && <span className="text-xs text-muted-foreground">{blockedReason}</span>}
            </>
          )}
        </div>
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {needsReview ? 'Submit' : scheduled ? 'Schedule' : 'Send'} to {recipientCount.toLocaleString()}{' '}
              {recipientCount === 1 ? 'person' : 'people'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              One {isMms ? 'picture message' : 'text'} per person from {fromLabel}, at an estimated cost of{' '}
              {formatUsd(totalCost)}. Sending {scheduled ? `starts ${whenLabel}` : 'starts right away'}.{' '}
              {needsReview
                ? 'An approver reviews it first and releases it.'
                : 'Messages cannot be recalled once the platform sends them.'}
              {curfewWarning ? ` ${curfewWarning}` : ''}
              {collisionWarning ? ` Heads up: ${collisionWarning}` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                onSend();
              }}
            >
              {buttonLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
