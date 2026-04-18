---
title: FileService — File Attachments
domain: mp-provider
type: reference
applies_to: [src/lib/providers/ministry-platform/services/file.service.ts]
symbols: [FileService, getFilesByRecord, uploadFiles, updateFile, deleteFile, getFileContentByUniqueId, getFileMetadata, getFileMetadataByUniqueId]
related: [../README.md, table.md, communication.md]
last_verified: 2026-04-17
---

## Purpose
CRUD on files attached to MP records via `/files/*` REST endpoints. Uploads use `multipart/form-data`; downloads by UniqueFileId are public (no auth header).

## Files
- `src/lib/providers/ministry-platform/services/file.service.ts` — implementation (213 lines)
- `src/lib/providers/ministry-platform/services/file.service.test.ts` — tests (332 lines)

## Key concepts
- Uploads use `FormData` with field key pattern `file-{index}` per file (`file.service.ts:52-54`). Optional params (`description`, `isDefaultImage`, `longestDimension`) are appended as both form fields AND query string params (`file.service.ts:57-71`).
- `getFileContentByUniqueId` is the only method that does **NOT** call `ensureValidToken` and does **NOT** send an Authorization header — it uses raw `fetch()` (`file.service.ts:159-185`).
- Query-string `$` prefix pattern: `$description`, `$default`, `$longestDimension`, `$fileName`, `$userId`, `$thumbnail`.
- `isDefaultImage: boolean` maps to query param `$default` (name mismatch is intentional).
- `FileDescription` shape: `src/lib/providers/ministry-platform/types/provider.types.ts:19-34`.

## API / Interface

Signatures copied from `src/lib/providers/ministry-platform/services/file.service.ts`:

```typescript
public async getFilesByRecord(
    table: string,
    recordId: number,
    defaultOnly?: boolean
): Promise<FileDescription[]>

public async uploadFiles(
    table: string,
    recordId: number,
    files: File[],
    params?: FileUploadParams
): Promise<FileDescription[]>

public async updateFile(
    fileId: number,
    file?: File,
    params?: FileUpdateParams
): Promise<FileDescription>

public async deleteFile(
    fileId: number,
    userId?: number
): Promise<void>

public async getFileContentByUniqueId(
    uniqueFileId: string,
    thumbnail?: boolean
): Promise<Blob>

public async getFileMetadata(fileId: number): Promise<FileDescription>

public async getFileMetadataByUniqueId(uniqueFileId: string): Promise<FileDescription>
```

### Endpoint → method map

| Method | HTTP | Endpoint | Auth |
|---|---|---|---|
| `getFilesByRecord` | GET | `/files/{table}/{recordId}` | required |
| `uploadFiles` | POST (multipart) | `/files/{table}/{recordId}` | required |
| `updateFile` | PUT (multipart) | `/files/{fileId}` | required |
| `deleteFile` | DELETE | `/files/{fileId}` | required |
| `getFileContentByUniqueId` | GET (raw fetch) | `/files/{uniqueFileId}` | **none** |
| `getFileMetadata` | GET | `/files/{fileId}/metadata` | required |
| `getFileMetadataByUniqueId` | GET | `/files/{uniqueFileId}/metadata` | required |

### Param types

`FileUploadParams` (`provider.types.ts:168`):

```typescript
export interface FileUploadParams {
  description?: string;
  isDefaultImage?: boolean;
  longestDimension?: number;
  userId?: number;
}
```

`FileUpdateParams` (`provider.types.ts:175`) adds `fileName?: string`.

## How it works
- `uploadFiles` builds FormData: appends each file as `file-{i}`, then appends optional params as string form fields. Separately builds `queryParams` with `$`-prefixed keys and calls `postFormData(endpoint, formData, queryParams)` (`file.service.ts:50-77`).
- `updateFile` — same pattern but PUT, file field is `file` (singular) not `file-0`, and an extra `fileName`/`$fileName` is supported (`file.service.ts:87-131`).
- `getFileContentByUniqueId` builds URL via `client.getHttpClient().buildUrl(...)`, then uses global `fetch` with `method: 'GET'` only (no headers). Throws `Error` with `"GET /files/{id} failed: {status} {statusText}"` on non-ok response (`file.service.ts:176-178`).
- `deleteFile` omits the `$userId` query param entirely when `userId` is undefined (`file.service.ts:143-146`).
- `getFilesByRecord` sends `{ $default: 'true'|'false' }` only when `defaultOnly !== undefined` (`file.service.ts:23-26`).

## Usage

From test fixtures (`file.service.test.ts:97-119`):

```typescript
const file = new File(['a'], 'doc.pdf', { type: 'application/pdf' });
await service.uploadFiles('Contacts', 10, [file], {
  description: 'desc',
  isDefaultImage: true,
  longestDimension: 800,
  userId: 123,
});
// FormData contains: file-0, description, isDefaultImage, longestDimension
// Query string: $description, $default, $longestDimension, $userId
```

Public blob download (`file.service.test.ts:230-243`):

```typescript
const blob = await service.getFileContentByUniqueId('abc');
// No Authorization header, no ensureValidToken
```

## Error handling

| Status | Operation | Test location |
|---|---|---|
| 404 Not Found | `getFilesByRecord` / metadata lookups | `file.service.test.ts:62-66`, `:307-311`, `:326-330` |
| 404 Not Found | `getFileContentByUniqueId` (thrown as `GET /files/... failed: 404 Not Found`) | `file.service.test.ts:281-292` |
| 403 Forbidden | `deleteFile` | `file.service.test.ts:222-226` |
| 413 Payload Too Large | `uploadFiles` | `file.service.test.ts:133-140` |
| 500 Internal Server Error | `updateFile` | `file.service.test.ts:197-201` |

## Gotchas
- **`isDefaultImage` → `$default`** — param name changes between the TS interface and the query string. Don't search for `$isDefaultImage`; it is always `$default` (`file.service.ts:69, :118`).
- **`getFileContentByUniqueId` bypasses auth** — relies on MP's public blob endpoint. If MP changes this to require auth, this method will 401 silently (the raw `fetch` has no token refresh logic).
- **Duplicate param transmission** — `uploadFiles` and `updateFile` send the same optional values in both FormData AND query string. Intentional (MP API accepts either) but doubles the wire payload for large descriptions.
- **`userId` is NOT put in FormData for uploads** — only the query string gets `$userId` (`file.service.ts:71`). Compare to other optional params which go to both.
- **`$thumbnail` omitted when undefined** — only `thumbnail === true | false` sends it; implicit `undefined` skips (`file.service.ts:165-167`).

## Related docs
- `../README.md` — provider overview
- `table.md` — the `{table}/{recordId}` pair comes from a TableService record
- `communication.md` — attachments on communications use a parallel `postFormData` pattern but with different FormData keys
