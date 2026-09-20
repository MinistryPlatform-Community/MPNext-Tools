
/**
 * Max records the MP REST table API returns (or accepts) in a single call. Reads of
 * unbounded result sets must page through with `$top`/`$skip` until a short page returns;
 * writes must be chunked to stay at or below this. A result of exactly this size means
 * "there may be more", never "this is the total".
 */
export const MP_MAX_PAGE_SIZE = 1000;

/** Max contact/record IDs to bundle in a single MP $filter `IN (...)` clause. */
export const MP_FETCH_BATCH_SIZE = 100;

// =====================================================================
// Messaging tools: pricing, throughput, and communication status defaults
// =====================================================================

/**
 * Fallback SMS price per segment (USD) when the chosen `dp_SMS_Numbers` row has no
 * `Cost_Per_Segment`. Twilio US long-code list price at the time of writing.
 */
export const TEXT_DEFAULT_SMS_COST_PER_SEGMENT = 0.0083;

/** MMS price per message (USD); an MMS is billed once regardless of text length. */
export const TEXT_DEFAULT_MMS_COST_PER_MESSAGE = 0.022;

/**
 * Text segments the MP messaging worker delivers per second, used for the
 * completion-time estimate and the collision check's queue model. Built-in default
 * only: the effective value comes from `dp_Configuration_Settings`
 * (`MessagingTextSegmentsPerSecond`) or `TEXT_SEGMENTS_PER_SECOND`.
 */
export const TEXT_DEFAULT_SEGMENTS_PER_SECOND = 5;

/**
 * `dp_Communication_Statuses` IDs: Draft = 1, In Review = 2, Ready to Send = 3.
 * The tool creates the communication as a Draft, inserts every message row, then
 * moves it to Ready to Send when the recipient count is within the sender's
 * pre-approved `dp_Roles.Mass_Text_Quota`, or to In Review otherwise (or when none
 * of the sender's roles carries a quota). Override per instance if your IDs differ.
 */
export const TEXT_COMMUNICATION_STATUS_DRAFT_ID = Number.parseInt(
  process.env.MP_COMMUNICATION_STATUS_DRAFT_ID ?? '1',
  10
);
export const TEXT_COMMUNICATION_STATUS_IN_REVIEW_ID = Number.parseInt(
  process.env.MP_COMMUNICATION_STATUS_IN_REVIEW_ID ?? '2',
  10
);
export const TEXT_COMMUNICATION_STATUS_READY_ID = Number.parseInt(
  process.env.MP_COMMUNICATION_STATUS_READY_ID ?? '3',
  10
);
/**
 * `dp_Communication_Statuses` ID for a communication the platform has finished
 * dispatching (stock MP: Sent = 4). The collision check leaves Sent emails out of its
 * queue estimate but keeps Sent texts in, since the carrier may still be delivering them.
 */
export const TEXT_COMMUNICATION_STATUS_SENT_ID = Number.parseInt(
  process.env.MP_COMMUNICATION_STATUS_SENT_ID ?? '4',
  10
);
// =====================================================================
// Messaging collision check (shared by messaging tools)
// =====================================================================

/**
 * A communication with more recipients than this counts as a "large send" for the
 * collision check: it is reported when it lands near the planned send time, and a
 * planned send above it also looks for any other scheduled message nearby.
 */
export const MESSAGING_COLLISION_LARGE_SEND_THRESHOLD = Number.parseInt(
  process.env.MESSAGING_COLLISION_LARGE_SEND_THRESHOLD ?? '1000',
  10
);

/** Hours before the planned send time to look for other messages. */
export const MESSAGING_COLLISION_LOOKBACK_HOURS = Number.parseFloat(
  process.env.MESSAGING_COLLISION_LOOKBACK_HOURS ?? '12'
);

/** Hours after the planned send time to look for other messages. */
export const MESSAGING_COLLISION_LOOKAHEAD_HOURS = Number.parseFloat(
  process.env.MESSAGING_COLLISION_LOOKAHEAD_HOURS ?? '12'
);

/**
 * Hours either side of the planned send where another message competes for the same
 * delivery queue. Collisions inside this band are flagged; the wider window above
 * only signals general messaging busyness.
 */
export const MESSAGING_COLLISION_CRITICAL_HOURS = Number.parseFloat(
  process.env.MESSAGING_COLLISION_CRITICAL_HOURS ?? '2'
);

/** A communication with more recipients than this is flagged as high impact. */
export const MESSAGING_COLLISION_HIGH_IMPACT_THRESHOLD = Number.parseInt(
  process.env.MESSAGING_COLLISION_HIGH_IMPACT_THRESHOLD ?? '10000',
  10
);

/**
 * Emails the MP messaging worker delivers per second. The worker is one serial queue
 * shared by email and text, processed in scheduled order, so an email blast ahead of
 * a text holds the text until it finishes. Texts use `TEXT_SEGMENTS_PER_SECOND`.
 */
export const MESSAGING_COLLISION_EMAILS_PER_SECOND = Number.parseFloat(
  process.env.MESSAGING_COLLISION_EMAILS_PER_SECOND ?? '5'
);

/** Most colliding communications returned to the client (nearest first); the rest are counted. */
export const MESSAGING_COLLISION_MAX_RESULTS = 10;

/**
 * Cap on MP reads spent computing recipient overlap per check. Each read is one page
 * of `dp_Communication_Messages` rows (or one batch of recipient IDs); over the cap
 * the remaining communications report overlap as unknown rather than stall the form.
 */
export const MESSAGING_COLLISION_MAX_OVERLAP_READS = 40;

// =====================================================================
// Text Messaging tool
// =====================================================================

/**
 * Contacts per `sendTextChunk` call. Each chunk is one Contacts read (batched by
 * `MP_FETCH_BATCH_SIZE`) plus one `dp_Communication_Messages` POST, so it stays
 * well under `MP_MAX_PAGE_SIZE`.
 */
export const TEXT_SEND_CHUNK_SIZE = 200;

/** Hard cap Twilio enforces on total MMS media size. */
export const TEXT_MMS_MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

/**
 * Carriers commonly downscale or drop MMS media above this size, so the tool
 * warns (but does not block) between this and the hard cap.
 */
export const TEXT_MMS_RECOMMENDED_ATTACHMENT_BYTES = 1024 * 1024;

/** Images attached to a text are resized client-side so their width is at most this. */
export const TEXT_IMAGE_MAX_WIDTH = Number.parseInt(
  process.env.NEXT_PUBLIC_TEXT_IMAGE_MAX_WIDTH ?? '1200',
  10
);

/**
 * Width offered as a one-click "shrink" when an attachment is still over the
 * recommended MMS size. Wide enough to stay sharp on a phone screen (most are 360 to
 * 430 CSS pixels across), small enough to drop a photo well under 1 MB.
 */
export const TEXT_IMAGE_COMPACT_WIDTH = Number.parseInt(
  process.env.NEXT_PUBLIC_TEXT_IMAGE_COMPACT_WIDTH ?? '640',
  10
);

/**
 * `dp_Communication_Action_Statuses` ID for a message the platform should still send.
 * MP ships Ready to Send = 2. Override per instance with the env var if it differs.
 */
export const TEXT_MESSAGE_ACTION_STATUS_READY_ID = Number.parseInt(
  process.env.MP_MESSAGE_ACTION_STATUS_READY_ID ?? '2',
  10
);

/**
 * `dp_Communication_Types` ID for text messages, used only when the type cannot be
 * resolved by name from the (readable) `dp_Communication_Types` table. MP ships
 * Email = 1, Text Message = 2.
 */
export const TEXT_COMMUNICATION_TYPE_FALLBACK_ID = Number.parseInt(
  process.env.MP_COMMUNICATION_TYPE_TEXT_ID ?? '2',
  10
);
