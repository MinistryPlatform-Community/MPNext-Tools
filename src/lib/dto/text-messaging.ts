/**
 * DTOs for the Text Messaging tool.
 *
 * The tool writes directly to the MP communication tables (never the `/messages`
 * API): one `dp_Communications` row (type = Text Message) plus one
 * `dp_Communication_Messages` row per recipient with the placeholders already
 * merged. Attachments are uploaded to the communication record and go out as MMS.
 * The platform's communication service then delivers rows in Ready to Send status.
 */

/**
 * How recipients are chosen. `selection` is offered when launched from an MP selection,
 * `record` when launched from a single open record (`recordID`).
 */
export type TextRecipientMode = 'selection' | 'record' | 'audience' | 'publication';

/**
 * A sub-page view flagged `Messaging_View` on the launching page, e.g. Events >
 * Participants > "Registered". Choosing one texts the contacts that view returns for
 * the selected records, the way MP's own New Message tool does.
 */
export interface MessagingViewOption {
  /** dp_Sub_Page_Views.Sub_Page_View_ID */
  id: number;
  /** "Participants: Registered" */
  label: string;
  subPageName: string;
  viewTitle: string;
}

export interface TextRecipientTarget {
  mode: TextRecipientMode;
  /** Required when mode = 'audience'. */
  audienceId?: number;
  /** Required when mode = 'publication'. */
  publicationId?: number;
  /**
   * For `selection` and `record` on a non-Contacts page: the messaging view that maps
   * the launching records to contacts. Required when the page offers any.
   */
  messagingViewId?: number;
  /**
   * Specific congregations (campuses) to text, matched on the contact's household
   * congregation. Empty means "all my campuses": every campus the sender's MP global
   * filter allows, or no campus filter at all when the sender has no global filter
   * rows. The server always intersects this with the sender's allowed set.
   */
  congregationIds?: number[];
}

/** A contact that will receive the text, with the values its placeholders resolve to. */
export interface TextRecipient {
  contactId: number;
  displayName: string;
  mobilePhone: string;
  /** Placeholder token (without brackets) to value, e.g. `First_Name` to `Sam`. */
  mergeValues: Record<string, string>;
}

/** Resolved recipients plus the exclusions shown before sending. */
export interface TextRecipientSummary {
  mode: TextRecipientMode;
  /** Contacts resolved from the source before any exclusion. */
  totalContacts: number;
  /** Contacts whose household campus is outside the sender's campus scope. */
  excludedByCongregation: number;
  /** Contacts with no mobile number on file. */
  excludedNoMobile: number;
  /**
   * Contacts whose `Texting_Opt_In_Type_ID` does not satisfy the sending number's
   * `Texting_Compliance_Level` (opted out, no response, or single when double is required).
   */
  excludedOptedOut: number;
  /** True when the sending number is configured for Double Opt-in, so single opt-ins were excluded. */
  requiresDoubleOptIn: boolean;
  /** Contacts dropped because another recipient already has the same mobile number. */
  excludedDuplicateNumber: number;
  /** Deduped Contact_IDs that each get a message row. */
  recipientContactIds: number[];
  /** First recipient, used for the phone preview and segment estimate. */
  sampleRecipient: TextRecipient | null;
  /**
   * True when the selection's page has no direct contact mapping and the tool fell
   * back to MP's messaging-view proc to reach contacts.
   */
  usedMessagingView: boolean;
}

/** A `dp_SMS_Numbers` row the current user may send from. */
export interface SmsNumberOption {
  id: number;
  label: string;
  /** E.164 or formatted number as stored in MP; null when the row has no number. */
  number: string | null;
  /** Shown to recipients instead of the raw number when set. */
  senderLabel: string | null;
  congregationId: number | null;
  /** USD per SMS segment; null falls back to the tool default. */
  costPerSegment: number | null;
  isDefault: boolean;
  /**
   * `Texting_Compliance_Levels` ID (stock MP: 1 None, 2 Single Opt-in, 3 Double Opt-in).
   * Null when the row has no level; treated as the single opt-in rule.
   */
  complianceLevelId: number | null;
}

/** A placeholder the sender can insert, e.g. `[First_Name]`. */
export interface MergeFieldOption {
  /** Token without brackets. */
  token: string;
  label: string;
  /** Example value used in the preview when no recipient has been resolved yet. */
  sample: string;
}

/**
 * The sender's pre-approved texting allowance from their security roles
 * (`dp_Roles.Mass_Text_Quota`, highest value across roles).
 */
export interface TextQuota {
  /** Recipients the sender may text without review; null when no role grants a quota. */
  limit: number | null;
  /** Roles that contributed a quota, for the explanatory copy. */
  roleNames: string[];
}

/**
 * The domain's messaging curfew (quiet hours), from the stock proc
 * `api_CORE_GetDomainData` (`Message_Curfew_Start_Time` / `Message_Curfew_End_Time`).
 * Times are wall-clock "HH:MM" in the domain's time zone and usually wrap overnight
 * (e.g. start 19:00, end 08:00). Null when the domain has no curfew configured.
 */
export interface MessageCurfewWindow {
  /** Curfew start, "HH:MM" wall-clock in the domain time zone. */
  start: string;
  /** Curfew end, "HH:MM" wall-clock in the domain time zone. */
  end: string;
}

/** Where a finalized communication landed. */
export type TextReleaseOutcome = 'ready_to_send' | 'in_review';

/** Result of the AI rewrite: a GSM-safe suggestion plus what the caller enforced. */
export interface SmsRewriteResult {
  /** The suggested message, already normalized to GSM-7 characters. */
  text: string;
  /** Placeholders present in the draft that the model dropped (the sender should check). */
  placeholdersDropped: string[];
  /** True when non-GSM characters in the model output were replaced or removed. */
  gsmFixed: boolean;
}

/** Everything the compose form needs on load. Nothing here is sensitive. */
export interface TextToolConfig {
  quota: TextQuota;
  /**
   * IANA time zone of the MP domain (from `/domain`), e.g. `America/Phoenix`. The
   * scheduler works in this zone because `dp_Communications.Start_Date` is stored as
   * wall-clock time in it.
   */
  timeZone: string;
  /** True when an AI provider is wired, so the AI rewrite panel can show. */
  aiWriterEnabled: boolean;
  /**
   * The domain's messaging curfew (quiet hours) in the domain time zone, or null when
   * none is configured. Used to warn and require an override when a send's scheduled
   * start or estimated completion falls inside the window.
   */
  curfew: MessageCurfewWindow | null;
  /**
   * Whether the domain has a message approval process (`Messaging_Approval_Process_ID` on
   * `api_CORE_GetDomainData`). When true, a send over the sender's quota goes In Review.
   * When false, the domain has no review path, so an over-quota send is not permitted and
   * the tool blocks it instead of submitting it for approval.
   */
  approvalProcessConfigured: boolean;
  smsNumbers: SmsNumberOption[];
  audiences: { id: number; label: string }[];
  publications: { id: number; label: string }[];
  /**
   * Messaging views on the launching page, for selection / record launches from a
   * non-Contacts page. Empty when not launched from a page or the page has none (the
   * tool then falls back to the page's Contact_ID mapping).
   */
  messagingViews: MessagingViewOption[];
  /**
   * Campuses offered in the picker: live (no End_Date), Available_Online, and within the
   * sender's global filter when one applies.
   */
  congregations: { id: number; label: string }[];
  /**
   * Congregation IDs from the sender's dp_User_Global_Filters rows. Empty means the
   * sender has no global filter and may text every campus.
   */
  allowedCongregationIds: number[];
  mergeFields: MergeFieldOption[];
  pricing: {
    defaultCostPerSegment: number;
    mmsCostPerMessage: number;
    segmentsPerSecond: number;
  };
  limits: {
    maxImageWidth: number;
    /** Width offered by the "shrink" action when an attachment is over the recommended size. */
    compactImageWidth: number;
    maxAttachmentBytes: number;
    recommendedAttachmentBytes: number;
  };
}

/** Body of the FormData posted to `createTextCommunication` (under the `payload` key). */
export interface CreateTextCommunicationInput {
  body: string;
  fromSmsNumberId: number;
  target: TextRecipientTarget;
  recipientCount: number;
  /** MP page the tool was launched from, recorded as Pertains_To_Page_ID. */
  pageId?: number;
  /** MP selection the tool was launched with, recorded as Selection_ID. */
  selectionId?: number;
  /**
   * Wall-clock time in the domain's time zone ("YYYY-MM-DDTHH:MM") to start sending.
   * Omitted means send as soon as the communication is released.
   */
  scheduledLocal?: string;
}

export interface CreateTextCommunicationResult {
  communicationId: number;
  /** `Start_Date` as written to MP (domain wall-clock, "YYYY-MM-DD HH:MM:SS"). */
  startDate: string;
  /** Set when an image was attached and uploaded to the communication. */
  attachmentFileId: number | null;
}

/** One chunk of the client-driven fan-out loop. */
export interface SendTextChunkInput {
  communicationId: number;
  contactIds: number[];
  body: string;
  fromSmsNumberId: number;
  /** Selection the recipients came from; enables page-specific merge tags. */
  selectionId?: number;
  pageId?: number;
}

export interface SendTextChunkResult {
  createdCount: number;
  /** Contacts skipped at send time (lost their mobile number or opted out since resolving). */
  skippedCount: number;
}

export interface FinalizeTextCommunicationResult {
  communicationId: number;
  outcome: TextReleaseOutcome;
  /** Message rows counted on the communication when it was released. */
  messageCount: number;
  /** The quota the decision was made against; null when the sender has none. */
  quotaLimit: number | null;
}

/** Generic dropdown option (Congregation, Audience, Publication, etc.). */
export interface SelectOption {
  id: number;
  label: string;
}
