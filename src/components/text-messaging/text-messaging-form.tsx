'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ToolParams } from '@/lib/tool-params';
import type { TextRecipientSummary, TextRecipientTarget, TextToolConfig } from '@/lib/dto';
import { TEXT_SEND_CHUNK_SIZE } from '@/lib/constants';
import { Loader2 } from 'lucide-react';
import {
  createTextCommunication,
  finalizeTextCommunication,
  getTextToolConfig,
  resolveTextRecipients,
  sendTextChunk,
} from './actions';
import { RecipientSection, type CampusScope } from './recipient-section';
import { ComposeSection } from './compose-section';
import { PhonePreview } from './phone-preview';
import { CostSummarySection, type ScheduleWhen } from './cost-summary-section';
import { ReviewSendSection, type SendProgress } from './review-send-section';
import { analyzeSms, estimateCompletionSeconds, estimateCost } from './sms-utils';
import { extractPlaceholders, findUnknownPlaceholders, mergePlaceholders, sampleMergeValues } from './merge-utils';
import { prepareAttachment, type PreparedAttachment } from './image-utils';
import { formatZonedDateTime, timeZoneAbbreviation, zonedWallClockToInstant } from './schedule-utils';
import { evaluateCurfew, formatCurfewWindow } from './curfew-utils';
import { CurfewNotice } from './curfew-notice';
import { MessagingCollisionPanel, summarizeCollisions, useMessagingCollisions } from '@/components/messaging-collision';

interface TextMessagingFormProps {
  params: ToolParams;
}

/**
 * Loads the tool config once, then renders the composer. "New message" after a send
 * bumps `draftKey`, which remounts the composer with fresh state while keeping the
 * already-loaded config.
 */
export function TextMessagingForm({ params }: TextMessagingFormProps) {
  const [config, setConfig] = useState<TextToolConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [draftKey, setDraftKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await getTextToolConfig(params);
      if (cancelled) return;
      if (!result.success) {
        setConfigError(result.error);
        return;
      }
      setConfig(result.config);
    })();
    return () => {
      cancelled = true;
    };
    // params is stable for the life of the page (server-provided).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (configError) {
    return <div className="text-sm text-red-600 bg-red-50 rounded-md p-3">{configError}</div>;
  }
  if (!config) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading the text messaging tool...
      </div>
    );
  }

  return (
    <TextComposer key={draftKey} params={params} config={config} onNewMessage={() => setDraftKey((k) => k + 1)} />
  );
}

interface TextComposerProps {
  params: ToolParams;
  config: TextToolConfig;
  /** Called from the "New message" button after a send completes; the parent remounts this component. */
  onNewMessage: () => void;
}

function TextComposer({ params, config, onNewMessage }: TextComposerProps) {
  const selectionAvailable = Boolean(params.s && params.pageID);
  const recordAvailable = Boolean(params.pageID && params.recordID && params.recordID > 0);

  // Recipients
  const [target, setTarget] = useState<TextRecipientTarget>(
    selectionAvailable ? { mode: 'selection' } : recordAvailable ? { mode: 'record' } : { mode: 'audience' }
  );
  const [campusScope, setCampusScope] = useState<CampusScope>('all');
  const [congregationIds, setCongregationIds] = useState<number[]>([]);
  const [summary, setSummary] = useState<TextRecipientSummary | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const resolveRequestRef = useRef(0);

  // Message
  const [fromSmsNumberId, setFromSmsNumberId] = useState<number | undefined>(
    () => (config.smsNumbers.find((n) => n.isDefault) ?? config.smsNumbers[0])?.id
  );
  const [body, setBody] = useState('');
  const [attachment, setAttachment] = useState<PreparedAttachment | null>(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [preparingAttachment, setPreparingAttachment] = useState(false);

  // Schedule (wall-clock in the MP domain's time zone)
  const [scheduleWhen, setScheduleWhen] = useState<ScheduleWhen>('now');
  const [scheduledLocal, setScheduledLocal] = useState('');
  // Override for the messaging-curfew (quiet hours) warning; must be checked to send when
  // the start or estimated completion falls inside the domain's curfew.
  const [curfewAck, setCurfewAck] = useState(false);
  // A slowly ticking "now" so a scheduled time that slips into the past is caught without
  // reading the clock during render.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Send state
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<SendProgress | null>(null);
  const [communicationId, setCommunicationId] = useState<number | null>(null);
  const [failedRecipients, setFailedRecipients] = useState<number[]>([]);
  const [sendError, setSendError] = useState<string | null>(null);
  const [completedMessage, setCompletedMessage] = useState<string | null>(null);
  // Once the send completes, every input is locked until "New message" resets the form.
  const locked = sending || completedMessage !== null;

  // Revoke the attachment preview URL when it changes or on unmount.
  useEffect(() => {
    return () => {
      if (attachmentPreviewUrl) URL.revokeObjectURL(attachmentPreviewUrl);
    };
  }, [attachmentPreviewUrl]);

  // "All my campuses" sends an empty list; the server expands it to the sender's allowed set.
  const activeCongregationIds = useMemo(
    () => (campusScope === 'specific' ? congregationIds : []),
    [campusScope, congregationIds]
  );
  const congregationKey = activeCongregationIds.join(',');
  const campusPickIncomplete = campusScope === 'specific' && congregationIds.length === 0;
  const placeholderTokens = useMemo(() => extractPlaceholders(body), [body]);
  const pageTokenKey = placeholderTokens
    .filter((t) => !config?.mergeFields.some((f) => f.token.toLowerCase() === t.toLowerCase()))
    .join(',');

  // Launched from records on a page with messaging views: one must be picked before
  // recipients can resolve, since each view reaches a different set of contacts.
  const launchMode = target.mode === 'selection' || target.mode === 'record';
  const needsMessagingView = launchMode && config.messagingViews.length > 0 && !target.messagingViewId;
  const targetReady =
    (launchMode && !needsMessagingView) ||
    (target.mode === 'audience' && !!target.audienceId) ||
    (target.mode === 'publication' && !!target.publicationId);

  const loadRecipients = useCallback(async () => {
    // Skip an empty specific campus pick.
    if (!targetReady || campusPickIncomplete) {
      setSummary(null);
      return;
    }
    const requestId = ++resolveRequestRef.current;
    setResolving(true);
    setResolveError(null);
    setSummary(null);
    const result = await resolveTextRecipients(
      params,
      { ...target, congregationIds: activeCongregationIds },
      placeholderTokens
    );
    if (requestId !== resolveRequestRef.current) return;
    if (result.success) {
      setSummary(result.summary);
    } else {
      setResolveError(result.error);
    }
    setResolving(false);
    // congregationKey and pageTokenKey capture the parts of the filter and draft that
    // change what resolves; params is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, targetReady, congregationKey, campusPickIncomplete, pageTokenKey]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRecipients();
  }, [loadRecipients]);

  const resetSendState = useCallback(() => {
    setCompletedMessage(null);
    setProgress(null);
    setFailedRecipients([]);
    setCommunicationId(null);
    setSendError(null);
    // A new time or recipient set is a new curfew decision; make the sender re-confirm.
    setCurfewAck(false);
  }, []);

  const handleTargetChange = useCallback(
    (next: TextRecipientTarget) => {
      setTarget(next);
      resetSendState();
    },
    [resetSendState]
  );

  const handleCongregationToggle = useCallback(
    (id: number) => {
      setCongregationIds((current) =>
        current.includes(id) ? current.filter((c) => c !== id) : [...current, id]
      );
      resetSendState();
    },
    [resetSendState]
  );

  const handleCampusScopeChange = useCallback(
    (scope: CampusScope) => {
      setCampusScope(scope);
      if (scope === 'all') setCongregationIds([]);
      resetSendState();
    },
    [resetSendState]
  );

  const prepareAndSetAttachment = useCallback(
    async (file: File, maxWidth: number) => {
      if (!config) return;
      setAttachmentError(null);
      setPreparingAttachment(true);
      try {
        const prepared = await prepareAttachment(file, {
          maxWidth,
          maxBytes: config.limits.maxAttachmentBytes,
        });
        setAttachment(prepared);
        setAttachmentPreviewUrl(URL.createObjectURL(prepared.file));
      } catch (error) {
        setAttachment(null);
        setAttachmentPreviewUrl(null);
        setAttachmentError(error instanceof Error ? error.message : 'Could not prepare that image.');
      } finally {
        setPreparingAttachment(false);
      }
    },
    [config]
  );

  const handleAttachmentPicked = useCallback(
    (file: File) => {
      if (!config) return;
      return prepareAndSetAttachment(file, config.limits.maxImageWidth);
    },
    [config, prepareAndSetAttachment]
  );

  /** Re-prepares the picked file at the compact width when the result is still over the recommended size. */
  const handleAttachmentShrink = useCallback(() => {
    if (!config || !attachment) return;
    return prepareAndSetAttachment(attachment.source, config.limits.compactImageWidth);
  }, [config, attachment, prepareAndSetAttachment]);

  const handleAttachmentRemoved = useCallback(() => {
    setAttachment(null);
    setAttachmentPreviewUrl(null);
    setAttachmentError(null);
  }, []);

  const handleScheduleWhenChange = useCallback(
    (when: ScheduleWhen) => {
      setScheduleWhen(when);
      resetSendState();
    },
    [resetSendState]
  );

  const handleScheduledLocalChange = useCallback(
    (value: string) => {
      setScheduledLocal(value);
      resetSendState();
    },
    [resetSendState]
  );

  // ---------------------------------------------------------------------
  // Derived: preview, counts, cost
  // ---------------------------------------------------------------------

  const configMergeFields = config?.mergeFields;
  const mergeFields = useMemo(() => configMergeFields ?? [], [configMergeFields]);
  const knownTokens = useMemo(() => {
    const known = mergeFields.map((f) => f.token);
    for (const key of Object.keys(summary?.sampleRecipient?.mergeValues ?? {})) known.push(key);
    return known;
  }, [mergeFields, summary]);
  const unknownPlaceholders = useMemo(() => findUnknownPlaceholders(body, knownTokens), [body, knownTokens]);

  const previewValues = useMemo(
    () => ({ ...sampleMergeValues(mergeFields), ...(summary?.sampleRecipient?.mergeValues ?? {}) }),
    [mergeFields, summary]
  );
  const previewBody = useMemo(() => mergePlaceholders(body, previewValues), [body, previewValues]);
  const analysis = useMemo(() => analyzeSms(previewBody), [previewBody]);
  const countsAreEstimated = placeholderTokens.length > 0;

  const selectedNumber = config?.smsNumbers.find((n) => n.id === fromSmsNumberId);
  const pricing = config?.pricing;
  const costPerSegment = selectedNumber?.costPerSegment ?? pricing?.defaultCostPerSegment ?? 0;
  const mmsCostPerMessage = pricing?.mmsCostPerMessage ?? 0;
  const isMms = attachment !== null;
  const recipientCount = summary?.recipientContactIds.length ?? 0;
  const quota = config?.quota ?? { limit: null, roleNames: [] };
  // Mirrors the server decision in finalizeTextCommunication, for the UI copy only.
  const needsReview = quota.limit === null || recipientCount > quota.limit;
  // With no message approval process there is no review path, so a send that would need
  // review cannot go out at all: the tool blocks it instead of submitting for approval.
  const approvalProcessConfigured = config?.approvalProcessConfigured ?? true;
  const reviewUnavailable = needsReview && !approvalProcessConfigured;

  const cost = useMemo(
    () =>
      estimateCost({
        recipients: recipientCount,
        segments: analysis.segments,
        costPerSegment,
        mmsCostPerMessage,
        isMms,
      }),
    [recipientCount, analysis.segments, costPerSegment, mmsCostPerMessage, isMms]
  );
  const completionSeconds = estimateCompletionSeconds(cost.totalSegments, pricing?.segmentsPerSecond ?? 0);

  // Schedule: the picker collects church wall-clock time; convert only for checks and estimates.
  const timeZone = config?.timeZone ?? 'Etc/UTC';
  const scheduled = scheduleWhen === 'later';
  const scheduledInstant = useMemo(
    () => (scheduled && scheduledLocal ? zonedWallClockToInstant(scheduledLocal, timeZone) : null),
    [scheduled, scheduledLocal, timeZone]
  );
  const scheduleProblem = (() => {
    if (!scheduled) return null;
    if (!scheduledLocal) return 'Pick a date and time to schedule';
    if (!scheduledInstant) return 'That date and time is not valid';
    if (now !== null && scheduledInstant.getTime() < now - 60_000) return 'That time has already passed';
    return null;
  })();
  const whenLabel =
    scheduled && scheduledInstant && !scheduleProblem
      ? `${formatZonedDateTime(scheduledInstant, timeZone)} ${timeZoneAbbreviation(timeZone, scheduledInstant)}`
      : scheduled
        ? 'Pick a date and time'
        : 'Right away';

  // Messaging curfew (quiet hours): warn and require an override when the send's start
  // (scheduled time, or now for "right away") or its estimated completion falls inside
  // the domain's curfew window. Only relevant once there is something to send.
  const curfewReady = cost.totalSegments > 0;
  const curfewStartInstant = useMemo(() => {
    if (scheduled) return scheduleProblem ? null : scheduledInstant;
    return now !== null ? new Date(now) : null;
  }, [scheduled, scheduleProblem, scheduledInstant, now]);
  const curfewEval = useMemo(
    () =>
      evaluateCurfew({
        curfew: config.curfew,
        timeZone,
        startInstant: curfewReady ? curfewStartInstant : null,
        completionSeconds,
      }),
    [config.curfew, timeZone, curfewReady, curfewStartInstant, completionSeconds]
  );
  const curfewGateActive = curfewEval.inCurfew && !curfewAck;
  const curfewWarning =
    curfewEval.inCurfew && config.curfew
      ? `This text ${
          curfewEval.startInCurfew ? (scheduled ? 'starts' : 'sends') : 'would still be sending'
        } during quiet hours (${formatCurfewWindow(config.curfew)}).`
      : null;

  // Other large or scheduled messages within a few hours of when this one goes out.
  // "Right away" passes no instant so the server uses its own clock.
  const collisions = useMessagingCollisions({
    enabled: summary !== null && recipientCount > 0 && !(scheduled && scheduleProblem !== null),
    recipientCount,
    recipientContactIds: summary?.recipientContactIds,
    sendAt: scheduled && !scheduleProblem ? scheduledInstant : null,
    channels: ['email', 'sms'],
    plannedChannel: 'sms',
    plannedSegments: analysis.segments,
  });
  const collisionSummary = collisions.result ? summarizeCollisions(collisions.result) : null;
  const collisionWarning = collisionSummary?.level === 'warning' ? collisionSummary.headline : null;

  const fromLabel = selectedNumber
    ? `${selectedNumber.label}${selectedNumber.number ? ` (${selectedNumber.number})` : ''}`
    : '';
  const senderLabel = selectedNumber?.senderLabel || selectedNumber?.number || selectedNumber?.label || 'Your church';

  const blockedReason = (() => {
    if (resolving) return 'Resolving recipients...';
    if (campusPickIncomplete) return 'Pick at least one campus';
    if (needsMessagingView) return 'Choose which contacts to text';
    if (!summary) return 'Choose recipients first';
    if (summary.recipientContactIds.length === 0) return 'No recipients can receive a text';
    if (reviewUnavailable) {
      return quota.limit === null
        ? 'Your account has no texting limit and this church has no approval process'
        : `Over your limit of ${quota.limit.toLocaleString()}; this church has no approval process`;
    }
    if (!fromSmsNumberId) return 'Choose a number to send from';
    if (!body.trim()) return 'Enter a message';
    if (analysis.overMaxLength) return 'Message is too long';
    if (preparingAttachment) return 'Preparing the image...';
    if (attachmentError) return 'Fix the attachment first';
    if (scheduleProblem) return scheduleProblem;
    if (curfewGateActive) return 'Confirm sending during quiet hours';
    return null;
  })();

  // ---------------------------------------------------------------------
  // Send loop: Draft communication -> message chunks -> Ready to Send
  // ---------------------------------------------------------------------

  const runChunks = useCallback(
    async (commId: number, recipientIds: number[], alreadySent: number, totalRows: number) => {
      let sentRows = alreadySent;
      let skippedRows = 0;
      const failed: number[] = [];
      setProgress({ sentRows, totalRows, skippedRows, failedRecipients: 0 });

      for (let i = 0; i < recipientIds.length; i += TEXT_SEND_CHUNK_SIZE) {
        const chunk = recipientIds.slice(i, i + TEXT_SEND_CHUNK_SIZE);
        const result = await sendTextChunk({
          communicationId: commId,
          contactIds: chunk,
          body,
          fromSmsNumberId: fromSmsNumberId!,
          selectionId: target.mode === 'selection' ? params.s : undefined,
          pageId: params.pageID,
        });
        if (result.success) {
          sentRows += result.createdCount;
          skippedRows += result.skippedCount;
        } else {
          failed.push(...chunk);
          setSendError(result.error);
        }
        setProgress({ sentRows, totalRows, skippedRows, failedRecipients: failed.length });
      }
      return { sentRows, skippedRows, failed };
    },
    [body, fromSmsNumberId, params.pageID, params.s, target.mode]
  );

  const finishSend = useCallback(
    async (commId: number, sentRows: number, skippedRows: number, failed: number[]) => {
      setFailedRecipients(failed);
      if (failed.length > 0) {
        setSendError(
          `${failed.length} recipient${failed.length === 1 ? '' : 's'} could not be queued. Use Retry to try them again; the message stays a draft in Ministry Platform until every recipient is queued.`
        );
        return;
      }
      const finalized = await finalizeTextCommunication(commId);
      if (!finalized.success) {
        setSendError(finalized.error);
        setFailedRecipients([]);
        return;
      }
      setSendError(null);
      const skippedNote =
        skippedRows > 0 ? ` ${skippedRows} contact${skippedRows === 1 ? '' : 's'} skipped at send time.` : '';
      const queued = `Prepared ${sentRows.toLocaleString()} text${sentRows === 1 ? '' : 's'} (communication ${commId}).${skippedNote}`;
      const delivery = scheduled ? `Delivery starts ${whenLabel}.` : 'The platform is delivering them now.';
      setCompletedMessage(
        finalized.outcome === 'ready_to_send'
          ? `${queued} ${delivery}`
          : finalized.quotaLimit === null
            ? `${queued} An approver needs to release it because your account has no pre-approved texting limit.${scheduled ? ` Once released, delivery starts ${whenLabel}.` : ''}`
            : `${queued} An approver needs to release it because ${finalized.messageCount.toLocaleString()} people is over your limit of ${finalized.quotaLimit.toLocaleString()}.${scheduled ? ` Once released, delivery starts ${whenLabel}.` : ''}`
      );
    },
    [scheduled, whenLabel]
  );

  const handleSend = useCallback(async () => {
    if (!summary || !fromSmsNumberId) return;
    setSending(true);
    setSendError(null);
    setCompletedMessage(null);
    setFailedRecipients([]);

    const recipientIds = summary.recipientContactIds;
    const formData = new FormData();
    formData.append(
      'payload',
      JSON.stringify({
        body,
        fromSmsNumberId,
        target: { ...target, congregationIds: activeCongregationIds },
        recipientCount: recipientIds.length,
        pageId: params.pageID,
        selectionId: target.mode === 'selection' ? params.s : undefined,
        scheduledLocal: scheduled ? scheduledLocal : undefined,
      })
    );
    if (attachment) formData.append('attachment', attachment.file, attachment.file.name);

    const created = await createTextCommunication(formData);
    if (!created.success) {
      setSendError(created.error);
      setSending(false);
      return;
    }
    setCommunicationId(created.communicationId);

    const { sentRows, skippedRows, failed } = await runChunks(created.communicationId, recipientIds, 0, recipientIds.length);
    await finishSend(created.communicationId, sentRows, skippedRows, failed);
    setSending(false);
  }, [
    summary,
    fromSmsNumberId,
    body,
    target,
    activeCongregationIds,
    params.pageID,
    params.s,
    scheduled,
    scheduledLocal,
    attachment,
    runChunks,
    finishSend,
  ]);

  const handleRetryFailed = useCallback(async () => {
    if (!communicationId || failedRecipients.length === 0 || !progress) return;
    setSending(true);
    setSendError(null);
    const { sentRows, skippedRows, failed } = await runChunks(
      communicationId,
      failedRecipients,
      progress.sentRows,
      progress.totalRows
    );
    await finishSend(communicationId, sentRows, progress.skippedRows + skippedRows, failed);
    setSending(false);
  }, [communicationId, failedRecipients, progress, runChunks, finishSend]);

  // ---------------------------------------------------------------------

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-6 min-w-0">
        <RecipientSection
          params={params}
          selectionAvailable={selectionAvailable}
          recordAvailable={recordAvailable}
          target={target}
          onTargetChange={handleTargetChange}
          audiences={config.audiences}
          publications={config.publications}
          messagingViews={config.messagingViews}
          congregations={config.congregations}
          allowedCongregationIds={config.allowedCongregationIds}
          campusScope={campusScope}
          onCampusScopeChange={handleCampusScopeChange}
          congregationIds={congregationIds}
          onCongregationToggle={handleCongregationToggle}
          summary={summary}
          resolving={resolving}
          resolveError={resolveError}
          disabled={locked}
        />

        <ComposeSection
          smsNumbers={config.smsNumbers}
          fromSmsNumberId={fromSmsNumberId}
          onFromChange={setFromSmsNumberId}
          body={body}
          onBodyChange={setBody}
          mergeFields={mergeFields}
          unknownPlaceholders={unknownPlaceholders}
          analysis={analysis}
          countsAreEstimated={countsAreEstimated}
          attachment={attachment}
          attachmentPreviewUrl={attachmentPreviewUrl}
          attachmentError={attachmentError}
          preparingAttachment={preparingAttachment}
          onAttachmentPicked={handleAttachmentPicked}
          onAttachmentRemoved={handleAttachmentRemoved}
          onAttachmentShrink={handleAttachmentShrink}
          compactImageWidth={config.limits.compactImageWidth}
          mmsWouldBeCheaper={cost.mmsWouldBeCheaper}
          mmsSavingPerRecipient={cost.mmsSavingPerRecipient}
          mmsCostPerMessage={mmsCostPerMessage}
          maxImageWidth={config.limits.maxImageWidth}
          aiWriterEnabled={config.aiWriterEnabled}
          costPerSegment={costPerSegment}
          recipientCount={recipientCount}
          segmentsPerSecond={pricing?.segmentsPerSecond ?? 0}
          disabled={locked}
        />

        <CostSummarySection
          recipients={recipientCount}
          analysis={analysis}
          cost={cost}
          isMms={isMms}
          costPerSegment={costPerSegment}
          mmsCostPerMessage={mmsCostPerMessage}
          completionSeconds={completionSeconds}
          segmentsPerSecond={pricing?.segmentsPerSecond ?? 0}
          timeZone={timeZone}
          when={scheduleWhen}
          onWhenChange={handleScheduleWhenChange}
          scheduledLocal={scheduledLocal}
          onScheduledLocalChange={handleScheduledLocalChange}
          scheduledInstant={scheduleProblem ? null : scheduledInstant}
          scheduleProblem={scheduled && scheduledLocal ? scheduleProblem : null}
          disabled={locked}
        />

        {config.curfew && curfewEval.inCurfew && (
          <CurfewNotice
            curfew={config.curfew}
            startInCurfew={curfewEval.startInCurfew}
            endInCurfew={curfewEval.endInCurfew}
            scheduled={scheduled}
            acknowledged={curfewAck}
            onAcknowledgedChange={setCurfewAck}
            disabled={locked}
          />
        )}

        <MessagingCollisionPanel
          result={collisions.result}
          loading={collisions.loading}
          error={collisions.error}
          timeZone={timeZone}
          sendNoun="text"
        />

        <ReviewSendSection
          recipientCount={recipientCount}
          fromLabel={fromLabel}
          totalCost={cost.total}
          isMms={isMms}
          whenLabel={whenLabel}
          scheduled={scheduled}
          quota={quota}
          needsReview={needsReview}
          approvalProcessConfigured={approvalProcessConfigured}
          collisionWarning={collisionWarning}
          curfewWarning={curfewWarning}
          blockedReason={blockedReason}
          sending={sending}
          progress={progress}
          completedMessage={completedMessage}
          sendError={sendError}
          onSend={handleSend}
          onRetryFailed={handleRetryFailed}
          onNewMessage={onNewMessage}
        />
      </div>

      <div className="lg:sticky lg:top-6 self-start">
        <PhonePreview
          body={previewBody}
          senderLabel={senderLabel}
          imageUrl={attachmentPreviewUrl}
          recipientName={summary?.sampleRecipient?.displayName ?? null}
        />
      </div>
    </div>
  );
}
