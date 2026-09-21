'use server';

import { ToolService } from '@/services/toolService';
import { AuthorizationService } from '@/services/authorizationService';
import {
  TextMessageService,
  type TextCommunicationInsert,
  type TextMessageInsert,
  type TextableContactRow,
} from '@/services/textMessageService';
import { DomainTimezoneService } from '@/services/domainTimezoneService';
import { AiWritingService } from '@/services/aiWritingService';
import { getMessagingSettings } from '@/services/messagingSettings';
import type { ToolParams } from '@/lib/tool-params';
import type {
  CreateTextCommunicationInput,
  CreateTextCommunicationResult,
  FinalizeTextCommunicationResult,
  MergeFieldOption,
  MessagingViewOption,
  SendTextChunkInput,
  SendTextChunkResult,
  SmsRewriteResult,
  TextRecipient,
  TextRecipientSummary,
  TextRecipientTarget,
  TextToolConfig,
} from '@/lib/dto';
import {
  TEXT_COMMUNICATION_STATUS_DRAFT_ID,
  TEXT_COMMUNICATION_STATUS_IN_REVIEW_ID,
  TEXT_COMMUNICATION_STATUS_READY_ID,
  TEXT_IMAGE_COMPACT_WIDTH,
  TEXT_IMAGE_MAX_WIDTH,
  TEXT_MESSAGE_ACTION_STATUS_READY_ID,
  TEXT_MMS_MAX_ATTACHMENT_BYTES,
  TEXT_MMS_RECOMMENDED_ATTACHMENT_BYTES,
  TEXT_SEND_CHUNK_SIZE,
} from '@/lib/constants';
import {
  STANDARD_MERGE_FIELDS,
  extractPlaceholders,
  labelForToken,
  mergePlaceholders,
  normalizePhoneForDedupe,
} from './merge-utils';
import { SMS_MAX_BODY_LENGTH, analyzeSms, normalizeLookalikes, toGsmSafe } from './sms-utils';
import { meetsTextingCompliance, requiresDoubleOptIn } from './opt-in-utils';

type ActionResult<T> = ({ success: true } & T) | { success: false; error: string };

/**
 * Authorization gate for this feature's server actions (CLAUDE.md rule 12).
 *
 * A server action is a callable POST endpoint whether or not the page that renders it
 * was ever fetched, so the tools layout's gate is not enough. MP's OIDC endpoint
 * authenticates any dp_Users record and this app reads MP with its own service
 * account, so "a session exists" proves nothing about what the caller may see or send.
 * TextMessageService gates every method again and stamps $userId itself (rule 13);
 * these actions never resolve, accept, or forward a user ID.
 */
async function requireAccess(table: string, operation: 'read' | 'create' | 'update' | 'delete'): Promise<void> {
  await AuthorizationService.getInstance().requireSecurityRole({ table, operation });
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/**
 * Pricing and throughput from the church's `dp_Configuration_Settings` (Application_Code
 * MPNEXT), falling back to environment variables and then the built-in defaults.
 */
async function getPricing(): Promise<TextToolConfig['pricing']> {
  const settings = await getMessagingSettings();
  return {
    defaultCostPerSegment: settings.smsCostPerSegment,
    mmsCostPerMessage: settings.mmsCostPerMessage,
    segmentsPerSecond: settings.segmentsPerSecond,
  };
}

const STANDARD_TOKENS = new Set(STANDARD_MERGE_FIELDS.map((f) => f.token.toLowerCase()));

/**
 * Merge values are normalized like the typed body: a curly apostrophe in a contact's
 * name would otherwise silently switch that one recipient's text to UCS-2.
 */
function plain(value: string | null | undefined): string {
  return value ? normalizeLookalikes(value).text : '';
}

/** Values for the standard placeholders, from a Contacts row. */
function standardMergeValues(row: TextableContactRow): Record<string, string> {
  return {
    Nickname: plain(row.Nickname || row.First_Name),
    First_Name: plain(row.First_Name),
    Last_Name: plain(row.Last_Name),
    Display_Name: plain(row.Display_Name),
    Mobile_Phone: plain(row.Mobile_Phone),
    Email_Address: plain(row.Email_Address),
    Congregation_Name: plain(row.Congregation_Name),
  };
}

/** Page merge-tag values from a messaging-view row, minus the standard/system columns. */
function pageMergeValues(row: Record<string, unknown>): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    if (key === 'Contact_ID' || STANDARD_TOKENS.has(key.toLowerCase())) continue;
    if (value === null || value === undefined) {
      values[key] = '';
    } else if (typeof value === 'object') {
      continue;
    } else {
      values[key] = plain(String(value));
    }
  }
  return values;
}

function hasMobile(row: TextableContactRow): boolean {
  return Boolean(row.Mobile_Phone && row.Mobile_Phone.replace(/\D/g, '').length >= 7);
}

// =====================================================================
// Config
// =====================================================================

/** Never throws: an unconfigured or unreachable AI setup just hides the panel. */
async function isAiWriterEnabled(): Promise<boolean> {
  try {
    const ai = await AiWritingService.getInstance();
    return await ai.isEnabled();
  } catch {
    return false;
  }
}

export async function getTextToolConfig(params: ToolParams): Promise<ActionResult<{ config: TextToolConfig }>> {
  try {
    await requireAccess('dp_Communications', 'read');
    const service = await TextMessageService.getInstance();
    const tz = DomainTimezoneService.getInstance();

    // Messaging views apply when launched from records (a selection or one open record)
    // on a page other than Contacts. A failure to read them degrades to the page's
    // Contact_ID mapping rather than blocking the tool.
    const launchedFromRecords = Boolean(params.pageID && (params.s || (params.recordID && params.recordID > 0)));
    const offerMessagingViews = launchedFromRecords && params.pageData?.Table_Name !== 'Contacts';

    const [
      smsNumbers,
      audiences,
      publications,
      allCongregations,
      allowedCongregationIds,
      quota,
      pageTags,
      aiWriterEnabled,
      timeZone,
      views,
      pricing,
      domainData,
    ] = await Promise.all([
        service.listSmsNumbersForUser(),
        service.listAudiences(),
        service.listPublications(),
        service.listCongregations(),
        service.getUserGlobalFilterCongregationIds(),
        service.getUserTextQuota(),
        params.pageID && params.s ? service.getMergeTagsForPage(params.pageID) : Promise.resolve([]),
        isAiWriterEnabled(),
        tz.getMpTimezone(),
        offerMessagingViews
          ? service.listMessagingViews(params.pageID!).catch((error: unknown) => {
              // Identifiers and shape only (rule 14): the page, never the query or its rows.
              console.warn('[text-messaging] Could not read messaging views', {
                pageId: params.pageID,
                error: errorMessage(error, 'unknown error'),
              });
              return [];
            })
          : Promise.resolve([]),
        getPricing(),
        service.getDomainMessagingData(),
      ]);
    const messagingViews: MessagingViewOption[] = views.map((v) => ({
      id: v.id,
      label: v.label,
      subPageName: v.subPageName,
      viewTitle: v.viewTitle,
    }));

    // A restricted sender only sees the campuses their global filter allows.
    const allowedSet = new Set(allowedCongregationIds);
    const congregations =
      allowedSet.size > 0 ? allCongregations.filter((c) => allowedSet.has(c.id)) : allCongregations;

    const mergeFields: MergeFieldOption[] = [...STANDARD_MERGE_FIELDS];
    for (const tag of pageTags) {
      if (STANDARD_TOKENS.has(tag.toLowerCase())) continue;
      mergeFields.push({ token: tag, label: labelForToken(tag), sample: labelForToken(tag) });
    }

    return {
      success: true,
      config: {
        quota,
        timeZone,
        aiWriterEnabled,
        curfew: domainData.curfew,
        approvalProcessConfigured: domainData.approvalProcessConfigured,
        smsNumbers,
        audiences,
        publications,
        messagingViews,
        congregations,
        allowedCongregationIds,
        mergeFields,
        pricing,
        limits: {
          maxImageWidth: TEXT_IMAGE_MAX_WIDTH,
          compactImageWidth: TEXT_IMAGE_COMPACT_WIDTH,
          maxAttachmentBytes: TEXT_MMS_MAX_ATTACHMENT_BYTES,
          recommendedAttachmentBytes: TEXT_MMS_RECOMMENDED_ATTACHMENT_BYTES,
        },
      },
    };
  } catch (error) {
    return { success: false, error: errorMessage(error, 'Failed to load the text messaging tool') };
  }
}

// =====================================================================
// Recipient resolution
// =====================================================================

interface SourceContacts {
  contactIds: number[];
  /** Page merge-tag values by Contact_ID when the messaging view supplied them. */
  pageValues: Map<number, Record<string, string>>;
  usedMessagingView: boolean;
}

/** The records the tool was launched with: the selection's record IDs or the one open record. */
async function launchRecordIds(params: ToolParams, target: TextRecipientTarget): Promise<number[]> {
  if (!params.pageID) throw new Error('This tool was not launched from a page.');
  if (target.mode === 'record') {
    if (!params.recordID || params.recordID <= 0) throw new Error('This tool was not launched from a record.');
    return [Math.trunc(params.recordID)];
  }
  if (!params.s) throw new Error('This tool was not launched with a selection.');
  const toolService = await ToolService.getInstance();
  return toolService.getSelectionRecordIds(params.s, params.pageID);
}

/**
 * Contacts for a selection or single-record launch. Order:
 *  1. The chosen messaging view (how MP's own New Message tool reaches contacts from,
 *     say, an Event: its Participants sub page filtered by the "Registered" view).
 *  2. Contacts page: the records are already Contact_IDs.
 *  3. Selection on another page: MP's stock proc applies the page's Contact_ID mapping
 *     and returns page merge-tag columns.
 *  4. The page's Contact_ID_Field mapping.
 */
async function resolveLaunchContacts(
  params: ToolParams,
  target: TextRecipientTarget,
  service: TextMessageService,
  extraFields: string[]
): Promise<SourceContacts> {
  if (!params.pageID) throw new Error('This tool was not launched from a page.');
  const isContactsPage = params.pageData?.Table_Name === 'Contacts';

  if (target.messagingViewId && !isContactsPage) {
    const viewId = Math.trunc(target.messagingViewId);
    const views = await service.listMessagingViews(params.pageID);
    const view = views.find((v) => v.id === viewId);
    if (!view) throw new Error('That messaging view is not available on this page.');
    const recordIds = await launchRecordIds(params, target);
    const domainNow = await DomainTimezoneService.getInstance().toMpSqlDatetime(new Date());
    const contactIds = await service.getMessagingViewContacts(view, recordIds, domainNow);
    return { contactIds, pageValues: new Map(), usedMessagingView: true };
  }

  if (isContactsPage) {
    const ids = await launchRecordIds(params, target);
    return { contactIds: ids, pageValues: new Map(), usedMessagingView: false };
  }

  if (target.mode === 'selection' && params.s) {
    const rows = await service.getSelectedContacts(params.s, extraFields);
    if (rows !== null) {
      const pageValues = new Map<number, Record<string, string>>();
      for (const row of rows) pageValues.set(row.Contact_ID, pageMergeValues(row));
      return { contactIds: rows.map((r) => r.Contact_ID), pageValues, usedMessagingView: true };
    }
  }

  if (!params.pageData) {
    throw new Error('Page information could not be loaded for this launch.');
  }
  const contactIdField = params.pageData.Contact_ID_Field;
  if (!contactIdField) {
    throw new Error(
      `Records on the ${params.pageData.Display_Name} page cannot be mapped to contacts. Add a messaging view or a contact field to the page.`
    );
  }
  const recordIds = await launchRecordIds(params, target);
  const toolService = await ToolService.getInstance();
  const resolved = await toolService.resolveContactIds(
    params.pageData.Table_Name,
    params.pageData.Primary_Key,
    contactIdField,
    recordIds
  );
  return {
    contactIds: resolved.records.map((r) => r.contactId).filter((id): id is number => !!id),
    pageValues: new Map(),
    usedMessagingView: false,
  };
}

async function resolveSourceContacts(
  params: ToolParams,
  target: TextRecipientTarget,
  service: TextMessageService,
  extraFields: string[]
): Promise<SourceContacts> {
  if (target.mode === 'selection' || target.mode === 'record') {
    return resolveLaunchContacts(params, target, service, extraFields);
  }
  if (target.mode === 'audience') {
    if (!target.audienceId) throw new Error('Choose an audience.');
    const contactIds = await service.getContactIdsForAudience(target.audienceId);
    return { contactIds, pageValues: new Map(), usedMessagingView: false };
  }
  if (!target.publicationId) throw new Error('Choose a publication.');
  const contactIds = await service.getContactIdsForPublication(target.publicationId);
  return { contactIds, pageValues: new Map(), usedMessagingView: false };
}

function cleanCongregationIds(ids: number[] | undefined): Set<number> {
  return new Set((ids ?? []).map((id) => Math.trunc(id)).filter((id) => id > 0));
}

/**
 * The campus scope a send actually runs under. `requested` empty means "all my
 * campuses". A sender with global filter rows can never reach outside them; a sender
 * without any has no campus restriction (null).
 */
function effectiveCongregationScope(requested: Set<number>, allowed: number[]): Set<number> | null {
  const allowedSet = new Set(allowed);
  if (requested.size === 0) return allowedSet.size > 0 ? allowedSet : null;
  if (allowedSet.size === 0) return requested;
  const scoped = new Set([...requested].filter((id) => allowedSet.has(id)));
  if (scoped.size === 0) {
    throw new Error('Your global filter does not give you access to the selected campuses.');
  }
  return scoped;
}

/**
 * Resolves who will receive the text and why others were left out. Consent is checked
 * against the sending number: a Double Opt-in number only reaches double-opted-in
 * contacts, any other level reaches single- or double-opted-in contacts. Without a
 * number the single opt-in rule applies; the send re-checks against the real number.
 */
export async function resolveTextRecipients(
  params: ToolParams,
  target: TextRecipientTarget,
  /** Placeholder tokens in the draft, so the sample recipient can preview page tags. */
  placeholderTokens: string[] = [],
  /** `dp_SMS_Numbers` ID the message will be sent from, for the opt-in compliance rule. */
  fromSmsNumberId?: number
): Promise<ActionResult<{ summary: TextRecipientSummary }>> {
  try {
    await requireAccess('Contacts', 'read');
    const service = await TextMessageService.getInstance();

    const pageTokens = placeholderTokens.filter((t) => !STANDARD_TOKENS.has(t.toLowerCase()));
    const smsNumberId = fromSmsNumberId ? Math.trunc(fromSmsNumberId) : 0;
    const [source, allowedCongregationIds, smsNumber] = await Promise.all([
      resolveSourceContacts(params, target, service, pageTokens),
      service.getUserGlobalFilterCongregationIds(),
      smsNumberId > 0 ? service.getSmsNumber(smsNumberId) : Promise.resolve(null),
    ]);
    if (smsNumberId > 0 && !smsNumber) throw new Error('The sending number is no longer active.');
    const complianceLevelId = smsNumber?.complianceLevelId ?? null;
    const congregationScope = effectiveCongregationScope(
      cleanCongregationIds(target.congregationIds),
      allowedCongregationIds
    );
    const uniqueIds = [...new Set(source.contactIds)];
    const rows = await service.getTextableContacts(uniqueIds);

    let excludedByCongregation = 0;
    let excludedNoMobile = 0;
    let excludedOptedOut = 0;
    let excludedDuplicateNumber = 0;
    const seenNumbers = new Set<string>();
    const recipientContactIds: number[] = [];
    let sampleRecipient: TextRecipient | null = null;

    for (const row of rows) {
      if (congregationScope && !(row.Congregation_ID && congregationScope.has(row.Congregation_ID))) {
        excludedByCongregation += 1;
        continue;
      }
      if (!hasMobile(row)) {
        excludedNoMobile += 1;
        continue;
      }
      if (!meetsTextingCompliance(row.Texting_Opt_In_Type_ID, complianceLevelId)) {
        excludedOptedOut += 1;
        continue;
      }
      const key = normalizePhoneForDedupe(row.Mobile_Phone) ?? `contact:${row.Contact_ID}`;
      if (seenNumbers.has(key)) {
        excludedDuplicateNumber += 1;
        continue;
      }
      seenNumbers.add(key);
      recipientContactIds.push(row.Contact_ID);
      if (!sampleRecipient) {
        sampleRecipient = {
          contactId: row.Contact_ID,
          displayName: [row.Nickname || row.First_Name, row.Last_Name].filter(Boolean).join(' '),
          mobilePhone: row.Mobile_Phone ?? '',
          mergeValues: { ...standardMergeValues(row), ...(source.pageValues.get(row.Contact_ID) ?? {}) },
        };
      }
    }

    return {
      success: true,
      summary: {
        mode: target.mode,
        totalContacts: uniqueIds.length,
        excludedByCongregation,
        excludedNoMobile,
        excludedOptedOut,
        requiresDoubleOptIn: requiresDoubleOptIn(complianceLevelId),
        excludedDuplicateNumber,
        recipientContactIds,
        sampleRecipient,
        usedMessagingView: source.usedMessagingView,
      },
    };
  } catch (error) {
    return { success: false, error: errorMessage(error, 'Failed to resolve recipients') };
  }
}

// =====================================================================
// Sending: create communication (Draft) -> message chunks -> Ready to Send
// =====================================================================

const SCHEDULE_WALL_CLOCK = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/;

/**
 * Resolves the communication's Start_Date. A scheduled value is a wall-clock string in
 * the domain's time zone (what the picker collects) and must not already be in the
 * past; with nothing scheduled the platform sends as soon as the message is released.
 */
async function resolveStartDate(tz: DomainTimezoneService, scheduledLocal: string | undefined): Promise<string> {
  const trimmed = scheduledLocal?.trim();
  if (!trimmed) return tz.toMpSqlDatetime(new Date());
  if (!SCHEDULE_WALL_CLOCK.test(trimmed)) throw new Error('The scheduled time is not valid.');
  const startDate = await tz.toMpSqlDatetime(trimmed);
  const instant = await tz.parseMpDatetime(startDate);
  if (instant.getTime() < Date.now() - 60_000) {
    throw new Error('The scheduled time has already passed. Pick a time in the future or send now.');
  }
  return startDate;
}

function validateBody(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) throw new Error('Enter a message.');
  if ([...trimmed].length > SMS_MAX_BODY_LENGTH) {
    throw new Error(`Messages are limited to ${SMS_MAX_BODY_LENGTH} characters.`);
  }
  return trimmed;
}

/**
 * Creates the dp_Communications row in Draft status and uploads the optional image
 * attachment. Expects FormData with a `payload` JSON field (CreateTextCommunicationInput)
 * and an optional `attachment` File.
 */
export async function createTextCommunication(
  formData: FormData
): Promise<ActionResult<CreateTextCommunicationResult>> {
  try {
    await requireAccess('dp_Communications', 'create');
    const service = await TextMessageService.getInstance();
    const tz = DomainTimezoneService.getInstance();

    const rawPayload = formData.get('payload');
    if (typeof rawPayload !== 'string') throw new Error('Missing message payload.');
    const input = JSON.parse(rawPayload) as CreateTextCommunicationInput;
    const body = validateBody(input.body ?? '');

    const attachment = formData.get('attachment');
    const file = attachment instanceof File && attachment.size > 0 ? attachment : null;
    if (file) {
      if (!file.type.startsWith('image/')) throw new Error('Only image attachments are supported.');
      if (file.size > TEXT_MMS_MAX_ATTACHMENT_BYTES) {
        throw new Error('The attachment is over the 5 MB MMS limit.');
      }
    }

    const smsNumber = await service.getSmsNumber(Math.trunc(input.fromSmsNumberId));
    if (!smsNumber) throw new Error('Choose an active number to send from.');
    const allowed = await service.listSmsNumbersForUser();
    if (!allowed.some((n) => n.id === smsNumber.id)) {
      throw new Error('You do not have access to send from that number.');
    }

    const sender = await service.getSenderContext();
    const typeId = await service.getTextCommunicationTypeId();
    const startDate = await resolveStartDate(tz, input.scheduledLocal);

    // Author_User_ID is stamped by the service from the authorization gate (rule 13).
    const row: Omit<TextCommunicationInsert, 'Author_User_ID'> = {
      Communication_Type_ID: typeId,
      Communication_Status_ID: TEXT_COMMUNICATION_STATUS_DRAFT_ID,
      Selection_ID: input.target.mode === 'selection' && input.selectionId ? Math.trunc(input.selectionId) : null,
      Send_To_Parents: false,
      Subject: body.slice(0, 500),
      Body: body,
      Pertains_To_Page_ID: input.pageId ? Math.trunc(input.pageId) : null,
      From_SMS_Number: smsNumber.id,
      From_Contact: sender.contactId,
      Reply_to_Contact: sender.contactId,
      Start_Date: startDate,
      Bulk_Email: false,
      Template: false,
      Active: true,
      Publication_ID:
        input.target.mode === 'publication' && input.target.publicationId
          ? Math.trunc(input.target.publicationId)
          : null,
    };

    const communicationId = await service.createCommunication(row);
    let attachmentFileId: number | null = null;
    if (file) {
      attachmentFileId = await service.attachFile(communicationId, file);
    }

    return { success: true, communicationId, attachmentFileId, startDate };
  } catch (error) {
    return { success: false, error: errorMessage(error, 'Failed to create the text message') };
  }
}

/**
 * Inserts one dp_Communication_Messages row per eligible contact in the chunk, with
 * placeholders merged per recipient. Re-checks eligibility against the sending number's
 * compliance level so a contact who opted out after the preview is skipped rather than texted.
 */
export async function sendTextChunk(input: SendTextChunkInput): Promise<ActionResult<SendTextChunkResult>> {
  try {
    await requireAccess('dp_Communication_Messages', 'create');
    const service = await TextMessageService.getInstance();
    const tz = DomainTimezoneService.getInstance();

    const contactIds = [...new Set(input.contactIds.map((id) => Math.trunc(id)).filter((id) => id > 0))];
    if (contactIds.length === 0) return { success: true, createdCount: 0, skippedCount: 0 };
    if (contactIds.length > TEXT_SEND_CHUNK_SIZE) {
      throw new Error(`Send at most ${TEXT_SEND_CHUNK_SIZE} recipients per chunk.`);
    }
    const body = validateBody(input.body ?? '');
    const communicationId = Math.trunc(input.communicationId);
    if (communicationId <= 0) throw new Error('Missing communication.');

    const smsNumber = await service.getSmsNumber(Math.trunc(input.fromSmsNumberId));
    if (!smsNumber) throw new Error('The sending number is no longer active.');
    const from = smsNumber.number?.trim() || smsNumber.label;

    // Page-specific placeholders come from the messaging view, one proc call per chunk.
    const pageTokens = extractPlaceholders(body).filter((t) => !STANDARD_TOKENS.has(t.toLowerCase()));
    const pageValues = new Map<number, Record<string, string>>();
    if (pageTokens.length > 0 && input.selectionId) {
      const rows = await service.getSelectedContacts(Math.trunc(input.selectionId), pageTokens);
      for (const row of rows ?? []) pageValues.set(row.Contact_ID, pageMergeValues(row));
    }

    const contacts = await service.getTextableContacts(contactIds);
    const now = await tz.toMpSqlDatetime(new Date());
    const rows: TextMessageInsert[] = [];
    let skippedCount = 0;

    for (const contact of contacts) {
      if (!hasMobile(contact) || !meetsTextingCompliance(contact.Texting_Opt_In_Type_ID, smsNumber.complianceLevelId)) {
        skippedCount += 1;
        continue;
      }
      // Lookalikes in the body are already plain from the editor; normalizing the merged
      // result also covers bodies posted by other callers.
      const merged = normalizeLookalikes(
        mergePlaceholders(body, {
          ...standardMergeValues(contact),
          ...(pageValues.get(contact.Contact_ID) ?? {}),
        })
      ).text.trim();
      if (!merged) {
        skippedCount += 1;
        continue;
      }
      rows.push({
        Communication_ID: communicationId,
        Action_Status_ID: TEXT_MESSAGE_ACTION_STATUS_READY_ID,
        Action_Status_Time: now,
        Contact_ID: contact.Contact_ID,
        From: from,
        To: contact.Mobile_Phone!.trim(),
        // MP requires both Subject and Body populated to send; mirror the body into
        // Subject (capped at the column's 500-char limit).
        Subject: merged.slice(0, 500),
        Body: merged,
        Deleted: false,
      });
    }
    skippedCount += contactIds.length - contacts.length;

    const createdCount = await service.createMessages(rows);
    return { success: true, createdCount, skippedCount };
  } catch (error) {
    return { success: false, error: errorMessage(error, 'Failed to queue this batch of messages') };
  }
}

/**
 * Releases the communication once every message row exists. The recipient count is
 * taken from the message rows on the server and compared with the sender's
 * pre-approved `Mass_Text_Quota`: within the quota goes straight to Ready to Send;
 * over it, or with no quota on any role, the communication is placed In Review.
 */
export async function finalizeTextCommunication(
  communicationId: number
): Promise<ActionResult<FinalizeTextCommunicationResult>> {
  try {
    await requireAccess('dp_Communications', 'update');
    const service = await TextMessageService.getInstance();
    const id = Math.trunc(communicationId);
    if (id <= 0) throw new Error('Missing communication.');

    const [quota, messageCount, domainData] = await Promise.all([
      service.getUserTextQuota(),
      service.countMessages(id),
      service.getDomainMessagingData(),
    ]);
    if (messageCount === 0) throw new Error('No messages were queued on this communication.');

    const withinQuota = quota.limit !== null && messageCount <= quota.limit;
    // With no approval process, there is no review path: an over-quota send is not
    // permitted, so refuse to release it and leave the communication as a Draft.
    if (!withinQuota && !domainData.approvalProcessConfigured) {
      throw new Error(
        quota.limit === null
          ? 'This message needs approval to send, but your church has not set up a message approval process and your account has no pre-approved texting limit. Ask an administrator to set up an approval process or grant a texting limit.'
          : `This message goes to ${messageCount.toLocaleString()} people, over your limit of ${quota.limit.toLocaleString()}, and your church has not set up a message approval process. Reduce the recipients to ${quota.limit.toLocaleString()} or fewer.`
      );
    }
    const statusId = withinQuota ? TEXT_COMMUNICATION_STATUS_READY_ID : TEXT_COMMUNICATION_STATUS_IN_REVIEW_ID;
    await service.setCommunicationStatus(id, statusId);

    return {
      success: true,
      communicationId: id,
      outcome: withinQuota ? 'ready_to_send' : 'in_review',
      messageCount,
      quotaLimit: quota.limit,
    };
  } catch (error) {
    return { success: false, error: errorMessage(error, 'Failed to release the text message') };
  }
}

// =====================================================================
// AI rewrite
// =====================================================================

/**
 * Asks the wired AI provider for a shorter, clearer, cheaper version of the draft, then
 * enforces the two rules the model can only be asked to follow: the result is
 * normalized to GSM-7 characters, and any placeholder the model dropped is reported.
 */
export async function rewriteTextForSms(input: {
  body: string;
  guidance?: string;
  isMms: boolean;
}): Promise<ActionResult<SmsRewriteResult>> {
  try {
    // No MP data is read, but the AI endpoint is an MP-data tool feature: same gate.
    await requireAccess('dp_Communications', 'read');
    const body = input.body?.trim() ?? '';
    if (!body) throw new Error('Write a message first, then ask for a rewrite.');
    if ([...body].length > SMS_MAX_BODY_LENGTH * 2) {
      throw new Error('The message is too long to rewrite. Trim it first.');
    }

    const analysis = analyzeSms(body);
    const placeholders = extractPlaceholders(body);
    const ai = await AiWritingService.getInstance();
    const raw = await ai.rewriteTextMessage({
      body,
      placeholders,
      currentCharacters: analysis.characterCount,
      currentSegments: analysis.segments,
      currentEncoding: analysis.encoding,
      nonGsmCharacters: analysis.nonGsmCharacters.map((c) => c.char),
      isMms: input.isMms,
      guidance: input.guidance,
    });

    // Strip wrapping quotes the model sometimes adds despite instructions.
    const unwrapped = raw.trim().replace(/^["'\u201C\u2018](.*)["'\u201D\u2019]$/s, '$1').trim();
    const text = toGsmSafe(unwrapped).replace(/[ \t]+\n/g, '\n').trim();
    if (!text) throw new Error('The rewrite came back empty. Try again.');

    const kept = new Set(extractPlaceholders(text).map((t) => t.toLowerCase()));
    const placeholdersDropped = placeholders.filter((t) => !kept.has(t.toLowerCase()));

    return {
      success: true,
      text,
      placeholdersDropped,
      gsmFixed: text !== unwrapped,
    };
  } catch (error) {
    return { success: false, error: errorMessage(error, 'Failed to rewrite the message') };
  }
}
