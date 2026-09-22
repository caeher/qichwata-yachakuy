# Issue #4 — Upload + SHA-256 plan

Status: plan only. Implement after #3 (`documents`, `reserveStorage`, `releaseStorage`, PGlite tests) and #2 (session on `/dashboard` and private `/api/*`). No Stellar anchor submission. Uploaded documents stay `status = "draft"` and the UI shows the server hash before any anchor exists.

Issue: https://github.com/caeher/stellar-data-integrity/issues/4

Scaffold constraints: Next **16.3.5** repo-root App Router, shadcn `Button` / `Card` (Base UI `render` prop), Spanish UI, pnpm. `proxy.ts` from #2 already treats `/api/*` as private except `/api/webhooks/clerk`. This issue’s routes inherit that.

## Decision

- Hash on the server with `node:crypto` `createHash("sha256")` over the exact `Uint8Array` that will be stored. No client hash is authoritative.
- Object storage is an interface with two adapters:
  - `local` (default): filesystem under `STORAGE_LOCAL_DIR` (default `.data/objects`). Used in dev and tests.
  - `s3`: `@aws-sdk/client-s3`, only constructed when `STORAGE_DRIVER=s3`. Works for R2 (`S3_ENDPOINT`) and AWS. Tests never set this driver.
- Quota uses `reserveStorage` from #3 (`SELECT … FOR UPDATE` then insert). The blob is written only after the transaction commits. If `put` fails, call `releaseStorage` and return 500.
- Vitest covers hash, magic bytes, quota, and the storage adapter. No Playwright. No browser E2E.

## Packages

```bash
pnpm add @aws-sdk/client-s3@3.1137.0
```

No `file-type` dependency. The allow-list is small enough to check in `lib/uploads/sniff.ts`. No new test runner.

`pnpm build` and `pnpm test` must not require `S3_*`, `DATABASE_URL`, or Clerk keys. The S3 client is created inside `createObjectStorage()` only when the driver is `s3`. Missing S3 env then throws from that function, which route handlers catch when the driver is actually `s3`. Default driver is `local`.

## Body size

Next 16.3.5 `experimental.proxyClientMaxBodySize` defaults to **10 MB** (see `next/dist/server/config-shared.d.ts` in this repo). A 25 MB upload would be rejected by the proxy before the route runs.

In `next.config.ts`:

```ts
const nextConfig: NextConfig = {
  experimental: {
    proxyClientMaxBodySize: "30mb",
  },
};
```

30 MB leaves room for multipart overhead above the 25 MiB file cap. Do not set a larger limit.

## Files

```
lib/uploads/hash.ts              # sha256Hex(bytes: Uint8Array): string
lib/uploads/sniff.ts             # magic + deny list
lib/uploads/quota-error.ts       # typed errors mapped to HTTP
lib/storage/types.ts             # ObjectStorage interface
lib/storage/local.ts             # filesystem adapter
lib/storage/memory.ts            # in-memory adapter for unit tests
lib/storage/s3.ts                # lazy S3Client
lib/storage/index.ts             # createObjectStorage() from env
lib/uploads/create-document.ts   # orchestrates hash, sniff, reserve, put
app/api/documents/route.ts       # POST multipart, GET list
app/api/documents/text/route.ts  # POST JSON text
app/dashboard/upload-form.tsx    # client form
app/dashboard/page.tsx           # extend #2 page with the form and hash preview
lib/uploads/hash.test.ts
lib/uploads/sniff.test.ts
lib/uploads/create-document.test.ts
lib/storage/memory.test.ts
.gitignore                       # .data/
```

## Hash

```ts
import { createHash } from "node:crypto";

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
```

Known answers the test must lock:

| Bytes              | Hex                                                                |
| ------------------ | ------------------------------------------------------------------ |
| empty `Uint8Array` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| UTF-8 `abc`        | `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad` |

Text uploads: `new TextEncoder().encode(text)` (UTF-8, no BOM). Hash that array and store those bytes, not a re-encoded string. The same string must hash the same on every run. Do not trim or normalize newlines.

## Allow-list

Extension is a hint only. Accept a file when **declared MIME** (browser `File.type` or, for the text route, the implied type) is in the table **and** the magic-byte check passes. If the browser sends an empty MIME, infer from the extension and still require magic bytes.

| Kind | Extensions      | MIME                                                                      | Magic                                                                                         |
| ---- | --------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| PNG  | `.png`          | `image/png`                                                               | `89 50 4E 47 0D 0A 1A 0A`                                                                     |
| JPEG | `.jpg`, `.jpeg` | `image/jpeg`                                                              | `FF D8 FF`                                                                                    |
| GIF  | `.gif`          | `image/gif`                                                               | `GIF87a` or `GIF89a`                                                                          |
| WEBP | `.webp`         | `image/webp`                                                              | `RIFF` at 0 and `WEBP` at offset 8                                                            |
| PDF  | `.pdf`          | `application/pdf`                                                         | `%PDF-`                                                                                       |
| TXT  | `.txt`          | `text/plain`                                                              | UTF-8, no `NUL`, and none of the binary signatures below                                      |
| MD   | `.md`           | `text/markdown`                                                           | same as TXT                                                                                   |
| DOCX | `.docx`         | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | ZIP local header `PK\x03\x04` and the byte sequence `word/document.xml` somewhere in the file |

Reject with **415** `{ "error": "unsupported_type" }` otherwise.

### Executable deny list (runs before the allow-list)

Reject **415** `{ "error": "forbidden_file" }` when any of these is true:

- Filename (lowercased, after stripping trailing dots and spaces) ends with: `.exe`, `.dll`, `.bat`, `.cmd`, `.com`, `.scr`, `.msi`, `.apk`, `.sh`, `.bash`, `.ps1`, `.jar`, `.app`, `.dmg`, `.iso`
- A compound suffix hides one of those (example: `report.pdf.exe`)
- The first bytes are `MZ`, `\x7FELF`, a Mach-O magic (`FE ED FA CE`, `FE ED FA CF`, `CE FA ED FE`, `CF FA ED FE`), or a shebang `#!`
- ZIP/`PK` files that are not a DOCX (no `word/document.xml`) even if the extension says `.docx`

Do not scan with ClamAV or call an external service.

TXT/MD that begin with `MZ` or `#!` fail the deny list. A PDF renamed to `.txt` fails because text sniff rejects non-UTF-8 / binary signatures and the declared MIME would not be `application/pdf`.

25 MiB cap is `26_214_400` bytes (`db/constants.ts` Free `max_upload_bytes`). Compare `bytes.byteLength`, not string length. Over the limit → **413** `{ "error": "file_too_large", "maxBytes": 26214400 }` before magic-byte work on the rest of the buffer. Still read the stream with a hard cap: if the incoming body exceeds 30 MB, stop and respond 413 without buffering the rest into RAM beyond that cap.

## Storage interface

```ts
export type ObjectStorage = {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
  delete(key: string): Promise<void>;
};
```

Key format: `{userId}/{yyyy}/{mm}/{documentId}` using UTC month and the document UUID. No bucket name, no access key, no leading slash.

`local` adapter:

- Root is `path.resolve(STORAGE_LOCAL_DIR || ".data/objects")`.
- Reject keys that escape the root (`path.relative` must not start with `..`).
- `put` writes the file with `fs.promises.mkdir({ recursive: true })` and `writeFile`.
- Add `.data/` to `.gitignore`.

`memory` adapter: `Map<string, Uint8Array>` for tests.

`s3` adapter:

- `S3Client({ region, endpoint, credentials, forcePathStyle: true })`. `forcePathStyle` keeps R2/MinIO happy.
- `PutObject` / `GetObject` / `DeleteObject` on `S3_BUCKET`.
- Never log the secret. Never import this module from a client component.
- `createObjectStorage()` is called from server route handlers only.

Client components must not read `S3_SECRET_ACCESS_KEY`, `S3_ACCESS_KEY_ID`, `CLERK_SECRET_KEY`, or `DATABASE_URL`. The upload form posts to the same-origin route; the browser does not receive a presigned URL in this issue.

## Orchestration (`createDraftDocument`)

Server-only function. Route handlers are thin.

```ts
type Input = {
  userId: string; // internal users.id, resolved from clerk user id
  name: string;
  declaredMime: string;
  bytes: Uint8Array;
};
```

Steps:

1. Resolve the app user by `clerkUserId` from the session (`provisionFreePlan` if missing, same helper as #2). Reject if `deleted_at` is set → 401.
2. Enforce size cap.
3. Run deny list + sniff. On failure, write nothing.
4. `sha256Hex(bytes)`.
5. Pre-generate `documentId` and `storageKey`.
6. `reserveStorage` inside the #3 transaction (inserts `documents` row `draft` + usage event + increments `storage_used_bytes`). Quota failure → **409** `{ "error": "quota_exceeded", "limitBytes", "usedBytes" }` and no `put`.
7. `storage.put`. On failure, `releaseStorage(documentId)` and **500**.
8. Return the public DTO. **Do not include** `storageKey`, bucket, or any env value.

Public DTO:

```ts
type DocumentDto = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  status: "draft";
  createdAt: string; // ISO
};
```

## HTTP contract

All responses are JSON. Auth: Clerk session (`await auth()`). Missing session → **401** `{ "error": "unauthorized" }`. These routes are already covered by `proxy.ts` `auth.protect()`; the handler repeats the check.

### `POST /api/documents`

`multipart/form-data` with field `file` (required) and optional `name` (defaults to the filename).

| Status | When                                           |
| ------ | ---------------------------------------------- |
| 201    | DTO above                                      |
| 400    | missing file, empty file, name longer than 255 |
| 401    | no session                                     |
| 409    | quota                                          |
| 413    | larger than plan `max_upload_bytes`            |
| 415    | MIME or deny list                              |
| 500    | storage write failed after rollback            |

`export const runtime = "nodejs"`.

### `POST /api/documents/text`

`Content-Type: application/json`

```json
{ "text": "string, required", "name": "optional, default nota.txt" }
```

MIME stored as `text/plain` unless `name` ends with `.md`, then `text/markdown`. Same status codes. Hash the UTF-8 bytes of `text`.

### `GET /api/documents`

Lists the current user’s documents where `deleted_at is null`, newest first, DTO array. No storage keys.

## UI (Spanish)

Extend `app/dashboard/page.tsx` (server component) with a client `UploadForm`:

- File input `accept` listing the extensions above (hint only).
- Textarea “o pega un texto”.
- Submit “Subir y calcular SHA-256”.
- After 201, show the hash in a `Card` with a monospace `<code>` and the line `Borrador. Aún no está anclado en Stellar.`
- Disable any “Anclar” control with the label `Anclar (próximamente)`.
- Show quota errors in Spanish: `Superas el espacio del plan Gratis (100 MB).`
- Show the updated usage line from a `router.refresh()` so the server component re-reads `storage_used_bytes`.

The hash on screen is the `sha256` field from the JSON response, not `crypto.subtle` in the browser. A client-side digest may be added later; do not display it in this issue.

Keep the page usable at 320px: file input and textarea stack, hash wraps (`break-all`).

## Env

Append to `.env.example`:

```bash
# Object storage. Default local uses the filesystem. Tests use an in-memory adapter.
# S3_* is only read when STORAGE_DRIVER=s3. Leave empty for CI and `pnpm build`.
STORAGE_DRIVER=local
STORAGE_LOCAL_DIR=.data/objects
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
```

`STORAGE_DRIVER=local` is a non-secret default. Empty S3 values are not credentials.

## Tests

`hash.test.ts`: hardcode only the empty and `abc` vectors; call the function twice on the same bytes and expect equal digests. Assert the UTF-8 bytes of `"a\nb"` and `"a\r\nb"` hash differently. Do not add a third hand-computed hex.

`sniff.test.ts`:

- Minimal valid PNG header is accepted with `image/png`.
- Bytes `MZ` plus a `.png` name are rejected.
- `%PDF-` with `.pdf` accepted.
- `%PDF-` with `.txt` rejected.
- ZIP without `word/document.xml` and name `x.docx` rejected.
- ZIP that contains the ASCII `word/document.xml` and name `x.docx` accepted.
- `.exe` rejected even if the body is a valid PNG.
- `#!` rejected.

`create-document.test.ts` on PGlite + `memory` storage + seeded Free plan:

- Accepted PNG bytes create one `draft` document whose `sha256` matches `sha256Hex`, `storage_used_bytes` increases by `byteLength`, and one `usage_events` row of type `upload`.
- Second call that would cross 100 MiB returns `QuotaExceeded` and does not change `storage_used_bytes` or call `put` (spy).
- File of `26_214_401` bytes is rejected and does not call `put`.
- Two concurrent reservations that together exceed the quota: exactly one succeeds (see #3 race note).
- `put` throwing triggers `releaseStorage`: `storage_used_bytes` returns to the previous value and the document is soft-deleted or absent.

`memory.test.ts`: `put`/`get` round-trips the same bytes (hash unchanged).

Do not boot Next for these tests. Call `createDraftDocument` directly. Optionally call the route `POST` with a mocked `auth` module via `vi.mock("@clerk/nextjs/server")` returning `{ userId: "user_test" }` and a `FormData` body, and assert 401 when the mock returns a null user. One route-level test is enough; the matrix stays on the pure functions.

## README

Document `STORAGE_DRIVER=local`, the 25 MB / 100 MB Free limits, and that S3 variables are optional. Mention `pnpm test`.

## Acceptance map

| Criterion                               | Where                                                                               |
| --------------------------------------- | ----------------------------------------------------------------------------------- |
| Same input → same sha256                | `lib/uploads/hash.test.ts`                                                          |
| Reject over plan quota                  | `create-document.test.ts` + `reserveStorage`                                        |
| 25 MB per file                          | `max_upload_bytes` and 413                                                          |
| Hash preview before anchor              | dashboard card shows server `sha256`, status stays `draft`, anchor control disabled |
| Storage secret never sent to the client | DTO omits keys; S3 module is server-only; no presigned URL                          |
| Magic bytes, not only extension         | `lib/uploads/sniff.ts`                                                              |
| Deny executables                        | deny list in `sniff.ts`                                                             |

## Out of scope

Anchoring on Stellar, download/verify endpoints, virus scanning services, image resizing, multipart chunked uploads, presigned browser uploads.

## Risks

- Writing the blob before the DB transaction can orphan objects or, worse, confirm a hash the quota layer then rejects. Transaction first, `put` second, `releaseStorage` on `put` failure.
- Hashing a decoded string instead of the raw file bytes changes the digest (UTF-8 vs Latin-1, added BOM, newline conversion).
- The proxy 10 MB default silently breaks the 25 MB acceptance test in a real browser. The config key must be `experimental.proxyClientMaxBodySize`.
- Importing `@aws-sdk/client-s3` from `app/dashboard/upload-form.tsx` would ship credentials patterns into the client bundle. The form file imports only UI components.
- DOCX detection via `includes(word/document.xml)` can false-positive on a ZIP that merely mentions that string. That is acceptable for v1; do not accept other ZIP types (`.zip`, `.jar`, `.apk`).
