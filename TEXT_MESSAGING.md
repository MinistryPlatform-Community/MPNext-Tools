# Text Messaging Tool: Setup Guide

Setup and configuration reference for the Text Messaging tool (`/tools/textmessaging`).
The tool works out of the box on a stock MinistryPlatform install once the
[general setup](README.md#getting-started) is done. This guide covers the parts that
are specific to texting: what the tool needs in MP, the configuration settings records
it creates, how approvals and quiet hours are controlled, and how to wire an AI provider
into the optional rewrite feature.

## Contents

- [What the tool does](#what-the-tool-does)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration settings (dp_Configuration_Settings)](#configuration-settings-dp_configuration_settings)
- [Approval limits and the review path](#approval-limits-and-the-review-path)
- [Quiet hours (messaging curfew)](#quiet-hours-messaging-curfew)
- [Per-number pricing](#per-number-pricing)
- [Environment variables](#environment-variables)
- [AI rewrite (bring your own provider)](#ai-rewrite-bring-your-own-provider)
- [Troubleshooting](#troubleshooting)

## What the tool does

Staff launch the tool from a Contacts selection, a single record, or any page with
messaging views (for example Events > Participants > Registered), pick a from-number
and campuses, write a text with `[Placeholder]` merge fields, optionally attach one
image (MMS), and send now or schedule for later in the church's time zone.

The tool never calls MP's `/messages` API. It writes a `dp_Communications` row and one
`dp_Communication_Messages` row per recipient, then moves the communication to
**Ready to Send** (or **In Review**). MP's own communication service delivers the
texts through the church's Twilio numbers exactly as if they had been sent from MP's
New Message tool, so delivery, replies, opt-outs, and reporting all stay in MP.

Before a send the tool also shows:

- an estimated cost and delivery time,
- other large emails or texts scheduled around the same time (the collision check),
- a quiet-hours warning when the send would land inside the domain's messaging curfew,
- whether the send will go out on its own or wait for an approver.

## Prerequisites

Everything in the main [README](README.md#prerequisites), plus:

| Requirement | Where | Why |
|---|---|---|
| Texting enabled in MP with at least one active row in **dp_SMS_Numbers** | Administration > SMS Numbers | The from-number picker lists active numbers. A number with a **User Group** is offered only to members of that group. The number flagged **Default** is preselected. |
| Domain time zone set | Administration > Domain | Scheduling, quiet hours, and the collision check all convert to the domain zone via `DomainTimezoneService`. |
| Stock stored procedures granted to the API user's role in **dp_Role_API_Procedures** | Administration > Security Roles > API Procedures | `api_Common_GetSelection` (selections), `api_CORE_GetDomainData` (curfew and approval process), `api_Tools_GetSelectedContacts` and `api_Tools_GetMergeTags` (selections on non-Contacts pages and page merge tags). |
| API user table access | Administration > Security Roles | Read on `Contacts`, `Congregations`, `Audiences`, `Audience_Members`, `dp_Publications`, `dp_Contact_Publications`, `dp_SMS_Numbers`, `dp_Users`, `dp_User_Roles`, `dp_User_User_Groups`, `dp_User_Global_Filters`, `dp_Sub_Page_Views`, `dp_Communication_Types`. Create and edit on `dp_Communications` and `dp_Communication_Messages`, with **File Attach** on `dp_Communications` for MMS images. Create on `dp_Configuration_Settings` so the tool can seed its own settings (see below). |

The tool degrades rather than fails when a proc is not granted: without
`api_CORE_GetDomainData` the quiet-hours check is skipped and the review path stays
open; without the `api_Tools_*` procs, selections on non-Contacts pages fall back to
the page's Contact ID field only.

The tool reads `Cost_Per_Segment` and `Sender_Label` from `dp_SMS_Numbers`; both are stock
MinistryPlatform columns. Set `Cost_Per_Segment` on a number when its rate differs from the
church-wide setting (see [Per-number pricing](#per-number-pricing)).

## Installation

### 1. Deploy the SQL install script

Run `_INSTALL/ministryplatform-install.sql` against the MP database (see
[Database Setup](README.md#database-setup)). For texting it seeds the nine
`dp_Configuration_Settings` rows listed below. The seed is idempotent and inserts only
missing keys, so re-running it never overwrites a value your church has changed.

This step is optional for texting: the tool also seeds any missing row the first time
it loads settings (see [Self-seeding](#self-seeding)). Run the script anyway if you
want the settings visible in MP before anyone launches the tool, or if the API user
cannot create `dp_Configuration_Settings` rows.

### 2. Register the tool in MinistryPlatform

Create a **Tool** record (Administration > Tools) and map it to the pages you want it
launched from:

| Field | Value |
|---|---|
| Tool Name | `Text Messaging` (any name) |
| Launch Page | `https://<your-mpnext-host>/tools/textmessaging` |
| Launch with Credentials | Yes |
| Launch with Parameters | Yes |
| Launch in New Tab | No (either works) |
| Tool Pages | Contacts, Households, Groups, Events, Event Participants, Group Participants, or any page whose records resolve to contacts. Events and other parent pages work best when they have sub-page views flagged as **Messaging View**. |
| Roles | The security roles that may send texts. Administrators are always included. |

MP appends `pageID`, `s` (selection), `recordID`, and `recordDescription` to the launch
URL; the tool reads them to decide between **selection** mode (the checked records) and
**record** mode (the one open record).

Developers running locally can use the dev panel's **Deploy tool** form, which upserts
the same records through `api_dev_DeployTool`.

### 3. Set environment variables only if your instance differs from stock

Every texting variable has a default that matches a stock MP install, so most churches
set nothing. See [Environment variables](#environment-variables) for the full list and
when to change one.

### 4. Launch once and review the settings in MP

Open the tool from any mapped page. On first load it creates the `MPNEXT` configuration
settings rows if the install script did not. Then open Administration >
Configuration Settings, filter on Application Code `MPNEXT`, and adjust the values for
your church (most importantly the per-segment and per-MMS prices you actually pay).

## Configuration settings (dp_Configuration_Settings)

All tunables live in `dp_Configuration_Settings` under **Application Code `MPNEXT`**
so admins change them in MP (Administration > Configuration Settings) instead of
redeploying the app. Every setting resolves in this order:

1. The MP row (when its Value is a positive number).
2. The matching environment variable.
3. The built-in default in `src/lib/constants.ts`.

A Value that is blank, zero, negative, or not a number is skipped, so a typo in MP
falls through to the next source instead of breaking the tool.

### The nine records

| Key Name | Default | Env var fallback | What it controls |
|---|---|---|---|
| `MessagingSmsCostPerSegment` | `0.0083` | `TEXT_SMS_COST_PER_SEGMENT` | USD per SMS segment when the sending number has no `Cost_Per_Segment` of its own. Drives the estimated total on the compose form. |
| `MessagingMmsCostPerMessage` | `0.022` | `TEXT_MMS_COST_PER_MESSAGE` | USD per MMS (picture) message. An MMS is billed once regardless of length; the tool also uses this to hint when attaching an image would be cheaper than a multi-segment SMS. |
| `MessagingTextSegmentsPerSecond` | `5` | `TEXT_SEGMENTS_PER_SECOND` | Text segments MP's messaging worker delivers per second. Drives the "done around" delivery estimate and the collision check's queue model. |
| `MessagingEmailsPerSecond` | `5` | `MESSAGING_COLLISION_EMAILS_PER_SECOND` | Emails the messaging worker delivers per second. MP runs one serial queue for email and text, so an email blast ahead of a text delays it; this feeds the queue estimate. |
| `MessagingLargeSendThreshold` | `1000` | `MESSAGING_COLLISION_LARGE_SEND_THRESHOLD` | A communication to more recipients than this is a "large send". Large sends near the planned time are always listed in the collision panel. |
| `MessagingHighImpactThreshold` | `10000` | `MESSAGING_COLLISION_HIGH_IMPACT_THRESHOLD` | A communication to more recipients than this gets a **High impact** badge in the collision panel. |
| `MessagingCollisionLookbackHours` | `12` | `MESSAGING_COLLISION_LOOKBACK_HOURS` | Hours before the planned send to look for other communications. |
| `MessagingCollisionLookaheadHours` | `12` | `MESSAGING_COLLISION_LOOKAHEAD_HOURS` | Hours after the planned send to look for other communications. |
| `MessagingCollisionCriticalHours` | `2` | `MESSAGING_COLLISION_CRITICAL_HOURS` | Hours either side of the planned send treated as the shared-queue band; collisions inside it are flagged as likely to delay (or be delayed by) this text. |

The prices default to Twilio US long-code list prices at the time of writing. Set them
to what your church actually pays, including any carrier fees you want reflected in
the estimate. The throughput values are estimates of MP's worker speed; adjust them if
your observed delivery times differ.

The same rows are shared with the collision check used by the other messaging tools,
so changing one changes it everywhere.

### Self-seeding

The first time the tool reads settings in a server process, it inserts a row for every
key that is missing, using the value currently in effect (the environment variable when
set, otherwise the built-in default) and the same description as the install script.
It never overwrites an existing row. If the API user cannot create rows, the tool logs
one warning and keeps working from environment variables and defaults.

The install script writes `Domain_ID = 1`; rows the tool seeds through the API get the
domain MP assigns.

### Changing a value

Edit the row in MP. Settings are cached per server process for five minutes, so a
change shows up in the tool within five minutes without a restart.

## Approval limits and the review path

Whether a text goes out on its own or waits for an approver is decided on the server
from two stock MP settings. Nothing in the app needs configuring.

| MP setting | Where | Effect |
|---|---|---|
| **Mass Text Quota** on each security role | Administration > Security Roles > (role) > Mass Text Quota | The sender's pre-approved limit is the highest quota across their roles. A send within it is released as **Ready to Send** immediately. A send over it, or a sender with no quota on any role, is placed **In Review**. |
| **Messaging Approval Process** on the domain | Administration > Domain > Messaging Approval Process | When set, In Review communications wait for an approver to release them, exactly as with MP's New Message tool. When empty, there is no review path: an over-quota (or no-quota) send is blocked with a clear message and the communication is left as a Draft. |

Summary of outcomes:

| Sender's quota | Recipients | Approval process set | Result |
|---|---|---|---|
| Within quota | any | either | Sent (Ready to Send) |
| Over quota | over limit | yes | In Review until released |
| Over quota | over limit | no | Blocked; reduce recipients |
| No quota on any role | any | yes | In Review until released |
| No quota on any role | any | no | Blocked |

Give each texting role a Mass Text Quota that matches how many people its members may
text without oversight, and set a Messaging Approval Process if you want larger sends
reviewed rather than refused.

`Texting_Override` and `Texting_Character_Limit` on `dp_Roles` are not consulted.

## Quiet hours (messaging curfew)

The tool reads the domain's **Message Curfew Start Time** and **Message Curfew End
Time** (Administration > Domain) through `api_CORE_GetDomainData`. If the send's start
time, or its estimated completion time, falls inside that window (usually overnight,
for example 19:00 to 08:00 in the domain time zone), the form shows an amber
quiet-hours notice and the sender must tick an override before sending. It is a
required acknowledgement, not a hard block. Leave both times empty to disable the
check.

## Per-number pricing

`dp_SMS_Numbers.Cost_Per_Segment` overrides `MessagingSmsCostPerSegment` for texts sent
from that number. Set it when different numbers have different rates (for example a
toll-free or short-code number). Leave it empty to use the church-wide setting.

## Environment variables

All texting variables are documented with their defaults in `.env.example`. They fall
into three groups.

**Instance IDs.** Change these only if your `dp_Communication_Statuses`,
`dp_Communication_Action_Statuses`, or `dp_Communication_Types` IDs differ from stock MP
(these tables are not readable through the API, so the tool cannot look them up by
name):

| Variable | Default | Stock MP meaning |
|---|---|---|
| `MP_COMMUNICATION_STATUS_DRAFT_ID` | `1` | Draft |
| `MP_COMMUNICATION_STATUS_IN_REVIEW_ID` | `2` | In Review |
| `MP_COMMUNICATION_STATUS_READY_ID` | `3` | Ready to Send |
| `MP_COMMUNICATION_STATUS_SENT_ID` | `4` | Sent (collision check only) |
| `MP_MESSAGE_ACTION_STATUS_READY_ID` | `2` | Message action status Ready to Send |
| `MP_COMMUNICATION_TYPE_TEXT_ID` | `2` | Text Message type; used only if the name lookup fails |

**Settings fallbacks.** The env vars listed in the
[configuration settings table](#the-nine-records) are consulted only when MP has no
usable row. They are also the values the tool seeds into MP on first launch, so setting
them before the first launch is a way to pre-fill the MP rows.

**Client-side image limits** (public, baked into the build):

| Variable | Default | Meaning |
|---|---|---|
| `NEXT_PUBLIC_TEXT_IMAGE_MAX_WIDTH` | `1200` | Attached images are resized so their width is at most this. |
| `NEXT_PUBLIC_TEXT_IMAGE_COMPACT_WIDTH` | `640` | Width offered by the one-click **Shrink** button when an image is still over 1 MB. |

The 5 MB hard cap on MMS media is Twilio's and is not configurable.

## AI rewrite (bring your own provider)

The compose toolbar can offer an **AI rewrite** button that shortens a draft for cost and
clarity: fewer segments, plain characters that stay in GSM-7, every fact and every
`[Placeholder]` kept. The sender sees before and after character, segment, and
per-recipient cost figures and applies the rewrite explicitly.

**This repo ships no AI vendor client, so the feature is off and the button is hidden.**
Churches host in too many places for one provider to be the right default. Everything
else is in place: the panel, the server action (`rewriteTextForSms`), the prompt, and
the safety rules (the output is normalized to GSM-safe text and any placeholder the
model dropped is reported). Wiring your own provider is a small, self-contained change.

### How it is wired

`src/lib/providers/ai-text/index.ts` exports `createAiTextProvider()`, which returns
`null` by default. `AiWritingService` calls it once per process; `null` means disabled.
The provider contract is one method:

```ts
interface AiTextProvider {
  generate(request: { instructions: string; input: string; maxOutputTokens?: number }): Promise<string>;
}
```

`instructions` is the system prompt, `input` is the draft with its stats and
placeholders, and the return value is the rewritten text.

### Steps

1. **Implement the provider** in a sibling file, for example
   `src/lib/providers/ai-text/openai-provider.ts`, using your vendor's SDK (OpenAI,
   Azure OpenAI, Anthropic, Gemini, a self-hosted model). Read its endpoint and
   credentials from your own environment variables or from `dp_Configuration_Settings`
   rows, never from the request. Throw a plain `Error` on failure; the action turns it
   into a friendly message.
2. **Return it** from `createAiTextProvider()`, reading any "is it configured" signal
   you want (for example, return `null` when the API key env var is empty so the
   feature stays hidden on environments that lack it).
3. **Add the SDK** to `package.json` and restart the app. The provider is resolved once
   per server process.
4. **Verify.** Open the Text Messaging tool, type a draft, and confirm the **AI rewrite**
   button appears in the compose toolbar. Click it and apply a rewrite.
5. **Test it.** `src/services/aiWritingService.test.ts` shows how the service is tested
   with a mocked provider; add a unit test for your provider's request and response
   mapping so the repo's coverage gate stays green.

### What is sent and what it costs

Each rewrite sends the draft text, its character and segment stats, the list of
placeholders, and any guidance the sender typed to your provider. No recipient data is
sent. The request asks for at most 400 output tokens; a typical rewrite is a few hundred
tokens at your vendor's rate. Add your own timeout in the provider if the SDK does not
enforce one.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Tool opens but no from-numbers are listed | No active `dp_SMS_Numbers` rows the user may use, or the API user cannot read the table | Check Administration > SMS Numbers (Active, User Group); verify API user read access. |
| Settings do not appear under Application Code `MPNEXT` | API user lacks create rights on `dp_Configuration_Settings` | Run the install script, or grant create and relaunch. |
| A changed setting is not reflected | Five-minute per-process cache | Wait up to five minutes, or restart. |
| Every send says "An approver will review this message" | No role held by the sender has a Mass Text Quota | Set Mass Text Quota on the sender's security role. |
| "This text cannot be sent: ... has not set up a message approval process" | Sender is over (or has no) quota and the domain has no Messaging Approval Process | Raise the quota, reduce recipients, or set a Messaging Approval Process on the domain. |
| Quiet-hours notice never appears | `api_CORE_GetDomainData` not granted, or curfew times empty on the domain | Grant the proc to the API user's role; set the curfew times. |
| Selection from an Event or other non-Contacts page resolves to too few people | `api_Tools_GetSelectedContacts` / `api_Tools_GetMergeTags` not granted, or the page has no Messaging View | Grant the procs; add a sub-page view flagged Messaging View and pick it under **Which contacts**. |
| **AI rewrite** button is missing | No provider is wired, or `createAiTextProvider()` returned `null` | Implement and return a provider (see the AI rewrite section), then restart the app. |
| AI rewrite fails with an authentication error | Your provider's credentials are missing or lack access | Check the env vars or MP rows your provider reads. |
| Scheduled time is off by hours | Domain time zone not set or unmapped | Set the time zone on the domain (see the [Date/Time Handling reference](.claude/references/ministryplatform.datetimehandling.md)). |

## Related documentation

- [`.claude/references/components/text-messaging.md`](.claude/references/components/text-messaging.md): component and server action internals
- [`.claude/references/services/text-message-service.md`](.claude/references/services/text-message-service.md): the MP reads and writes behind the tool
- [`.claude/references/services/configuration-settings-service.md`](.claude/references/services/configuration-settings-service.md): how `dp_Configuration_Settings` resolution and seeding work
- [`.claude/references/components/messaging-collision.md`](.claude/references/components/messaging-collision.md): the shared collision check
- `src/lib/providers/ai-text/index.ts`: where an AI provider is wired in
- `.env.example`: every variable with its default and comments
