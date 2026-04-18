---
title: CommunicationService — Email / SMS / Letter
domain: mp-provider
type: reference
applies_to: [src/lib/providers/ministry-platform/services/communication.service.ts]
symbols: [CommunicationService, createCommunication, sendMessage]
related: [../README.md, file.md]
last_verified: 2026-04-17
---

## Purpose
Create MP `Communications` records (renders + schedules delivery) and send direct messages via `/messages`. Both support optional file attachments via multipart branch.

## Files
- `src/lib/providers/ministry-platform/services/communication.service.ts` — implementation (80 lines)
- `src/lib/providers/ministry-platform/services/communication.service.test.ts` — tests (162 lines)

## Key concepts
- **Two endpoints, same pattern:**
  - `POST /communications` — creates a `Communications` row, renders body, schedules delivery. Supports `Email | Text | Letter` (`CommunicationInfo.CommunicationType`).
  - `POST /messages` — direct send; addresses are passed in the payload (no template/contact resolution).
- **Attachment branch:** if `attachments && attachments.length > 0`, serialize the info object as a JSON string under the FormData key `communication` / `message` and append files as `file-{i}`.
- **Empty array = no attachments** — `attachments: []` takes the JSON branch (`communication.service.test.ts:107-114`).

## API / Interface

Signatures copied from `src/lib/providers/ministry-platform/services/communication.service.ts`:

```typescript
public async createCommunication(
    communication: CommunicationInfo,
    attachments?: File[]
): Promise<Communication>

public async sendMessage(
    message: MessageInfo,
    attachments?: File[]
): Promise<Communication>
```

### Endpoint → method map

| Method | HTTP | Endpoint | Body |
|---|---|---|---|
| `createCommunication` (no files) | POST | `/communications` | JSON `{ ...communication }` |
| `createCommunication` (with files) | POST (multipart) | `/communications` | FormData: `communication=<JSON>`, `file-0`, `file-1`, ... |
| `sendMessage` (no files) | POST | `/messages` | JSON `{ ...message }` |
| `sendMessage` (with files) | POST (multipart) | `/messages` | FormData: `message=<JSON>`, `file-0`, `file-1`, ... |

### Type shapes

From `src/lib/providers/ministry-platform/types/provider.types.ts`:

```typescript
// :36
export interface CommunicationInfo {
  AuthorUserId: number;
  Body: string;
  FromContactId: number;
  ReplyToContactId: number;
  CommunicationType: 'Email' | 'Text' | 'Letter';
  Contacts: number[];
  IsBulkEmail: boolean;
  SendToContactParents: boolean;
  Subject: string;
  StartDate: string;
  TextPhoneNumberId?: number;
}

// :55
export interface MessageInfo {
  FromAddress: MessageAddress;
  ToAddresses: MessageAddress[];
  ReplyToAddress?: MessageAddress;
  Subject: string;
  Body: string;
  StartDate?: string;
}

// :64 — response shape (MP DB row)
export interface Communication {
  Communication_ID: number;
  Author_User_ID: number;
  Subject: string;
  Body: string;
  Domain_ID: number;
  Start_Date: string;
  Communication_Status_ID: number;
  From_Contact: number;
  Reply_to_Contact: number;
  Template_ID?: number;
  Active: boolean;
}
```

## How it works
- Branch on `attachments?.length > 0` (`communication.service.ts:22`, `:42`).
- Non-attachment path: spread info object (`{ ...communication }`) — creates a shallow copy before the HTTP POST.
- Attachment path delegates to private `createCommunicationWithAttachments` / `sendMessageWithAttachments`:

```typescript
// communication.service.ts:53-65
private async createCommunicationWithAttachments(
    communication: CommunicationInfo,
    attachments: File[]
): Promise<Communication> {
    const formData = new FormData();
    formData.append('communication', JSON.stringify(communication));
    attachments.forEach((file, index) => {
        formData.append(`file-${index}`, file, file.name);
    });
    return await this.client.getHttpClient().postFormData<Communication>('/communications', formData);
}
```

- `sendMessage` variant uses FormData key `message` instead of `communication` (`communication.service.ts:72`).

## Usage

From tests (`communication.service.test.ts:67-85`):

```typescript
const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
const result = await service.createCommunication(communicationInfo, [file]);
// postFormData called with:
//   endpoint: '/communications'
//   formData.get('communication') === JSON.stringify(communicationInfo)
//   formData.get('file-0').name === 'test.pdf'
```

Note: no application-layer wrapper currently calls these methods (greppable via `Grep createCommunication src/services`). They are exposed through `MPHelper` (`helper.ts:559, :573`) and ready for use by `src/components/**/actions.ts`.

## Error handling

| Operation | Error | Test location |
|---|---|---|
| `createCommunication` | generic POST failure | `communication.service.test.ts:101-105` |
| `sendMessage` | generic POST failure | `communication.service.test.ts:145-149` |

Token validation happens once per outer call (`communication.service.test.ts:152-161`).

## Gotchas
- **Empty `attachments: []` takes the JSON branch** — the guard is `attachments.length > 0`, not just truthiness. If you want to force multipart with no files, you cannot (`communication.service.ts:22`).
- **Response shape uses MP database snake_case column names** (`Communication_ID`, `Author_User_ID`) while the request shape uses camelCase (`AuthorUserId`). Do not assume symmetry.
- **Attachment limit** — not enforced at this layer. MP API enforces server-side; expect 413 Payload Too Large on oversize.
- **JSON-stringifying the payload twice** — on multipart, the info object is `JSON.stringify`'d into a single FormData field. Server must parse it back. No merge with top-level form fields.

## Related docs
- `../README.md` — provider overview
- `file.md` — sibling service using the same multipart pattern (different FormData keys)
