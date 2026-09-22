# Issue #13 — Object storage: R2/S3 + StorageProvider

Status: plan only. Do not implement in the same commit as this document.

Issue: https://github.com/caeher/stellar-data-integrity/issues/13

Depends on: `main` at #1–#12 (`875002c` and later). #4 already shipped the blob layer. This issue finishes it.

Implement **before** #14. #14’s account erasure calls `StorageProvider.delete`, and its rate limit attaches to the download route this issue adds.

## Already on main

Do not rebuild storage. Extend what is here.

| Piece     | Where                                               | Today                                                                                                                        |
| --------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Interface | `lib/storage/types.ts`                              | `ObjectStorage`: `put` / `get` / `delete`. No `signedUrl`.                                                                   |
| Factory   | `lib/storage/index.ts`                              | `createObjectStorage()`. `STORAGE_DRIVER` default `local`. `memory` and `s3` branches exist.                                 |
| Local     | `lib/storage/local.ts`                              | Files under `STORAGE_LOCAL_DIR` (default `.data/objects`). Rejects keys that escape the root.                                |
| Memory    | `lib/storage/memory.ts`                             | `Map` for Vitest.                                                                                                            |
| S3        | `lib/storage/s3.ts`                                 | `@aws-sdk/client-s3@3.1137.0`. `forcePathStyle: true`. Built only when the driver is `s3`.                                   |
| Keys      | `storageKeyFor` in `lib/uploads/create-document.ts` | `{userId}/{yyyy}/{mm}/{documentId}` UTC. `userId` is the internal `users.id` UUID, not the Clerk id.                         |
| Delete    | `lib/uploads/delete-document.ts`                    | `releaseStorage` (soft-delete + quota), then `storage.delete`. A blob error is logged and the HTTP delete still returns 200. |
| Env       | `.env.example`                                      | `STORAGE_DRIVER=local` and empty `S3_*`. CI sets `STORAGE_DRIVER: local` in `.github/workflows/ci.yml`.                      |

There is no download route and no presigner dependency. #4 forbade presigned **uploads**. This issue adds presigned **downloads** only. Uploads stay server-side (`POST /api/documents`, `POST /api/documents/text`).

`pnpm build` and `pnpm test` must keep passing with `S3_*` empty and `STORAGE_DRIVER=local`. Do not add MinIO, LocalStack, or a real R2 bucket to CI.

## Decision

- Rename the type to `StorageProvider` and add `signedUrl`. Keep `export type ObjectStorage = StorageProvider` so a missed import still compiles. Update every in-repo import to `StorageProvider`.
- Keep the factory name `createObjectStorage()`. Do not add a second factory.
- Keys stay `{internalUserId}/{yyyy}/{mm}/{documentId}`. Move `storageKeyFor` to its own module and test it. On download and delete, refuse a key that does not start with `{userId}/`.
- Short-lived download URLs:
  - `s3`: `GetObject` presign via `@aws-sdk/s3-request-presigner`, same version as the client (`3.1137.0`). This is the R2/AWS/MinIO path.
  - `local` and `memory`: HMAC token, redeemed at `GET /api/storage/download`. No AWS call.
- TTL default **60 seconds**, clamped to **15–300**. The client cannot choose the TTL.
- Authenticated mint: `GET /api/documents/:id/download` checks the Clerk session and ownership, then returns `{ url, expiresAt }`. The UI navigates to `url`. It does not `fetch()` the bytes (so R2 does not need CORS).
- Document delete already removes the blob. Add the missing assertion that `get` returns null afterwards, and skip `storage.delete` when the key is outside the user’s prefix.
- Document R2 in `.env.example`, README, and `docs/architecture.md`. Leave the CI default on `local`.

## Package

```bash
pnpm add @aws-sdk/s3-request-presigner@3.1137.0
```

Match `@aws-sdk/client-s3` exactly. Do not float the version. Do not add a MinIO client.

Import the presigner only from `lib/storage/s3.ts`. That module is already server-only. Do not import it from a client component.

## Files

```
lib/storage/types.ts                      # StorageProvider + ObjectStorage alias
lib/storage/sign-local.ts                 # HMAC issue/verify, no AWS
lib/storage/sign-local.test.ts
lib/storage/ttl.ts                        # resolveSignedUrlTtl
lib/storage/ttl.test.ts
lib/storage/local.ts                      # signedUrl
lib/storage/memory.ts                     # signedUrl
lib/storage/s3.ts                         # presign GetObject; narrower get() errors
lib/storage/s3-sign.test.ts               # pure input builder + missing-object helper
lib/storage/index.ts                      # unchanged driver switch
lib/uploads/storage-key.ts                # storageKeyFor + keyBelongsToUser
lib/uploads/storage-key.test.ts
lib/uploads/create-document.ts            # call storageKeyFor from the new module
lib/uploads/delete-document.ts            # prefix check, then delete
lib/uploads/delete-document.test.ts       # blob gone; bad prefix does not delete
lib/uploads/open-signed-download.ts       # verify token, then storage.get
lib/uploads/open-signed-download.test.ts
app/api/documents/[id]/download/route.ts  # mint URL, session required
app/api/storage/download/route.ts         # redeem local/memory token
lib/auth/public-paths.ts                  # allow only /api/storage/download
lib/auth/public-paths.test.ts
app/dashboard/document-actions.tsx        # Descargar on the detail variant
.env.example
README.md
docs/architecture.md
```

Do not add `middleware.ts`. This repo uses `proxy.ts`, which already calls `isProtectedPath`.

## Interface

`lib/storage/types.ts`:

```ts
export type SignedUrlOptions = {
  expiresInSeconds: number;
  downloadName?: string;
  contentType?: string;
};

export type StorageProvider = {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
  delete(key: string): Promise<void>;
  signedUrl(key: string, options: SignedUrlOptions): Promise<string>;
};

export type ObjectStorage = StorageProvider;
```

`signedUrl` returns a string the browser can navigate to.

- S3: absolute `https://…` URL.
- Local and memory: a same-origin path `/api/storage/download?token=…` (no host). The UI assigns it as a relative URL.

Do not include the bucket, the access key, or the storage key in any JSON DTO except the signed URL’s opaque token or the S3 signature.

## TTL

`lib/storage/ttl.ts`:

```ts
export function resolveSignedUrlTtl(
  env: Record<string, string | undefined> = process.env,
): number;
```

- Read `STORAGE_SIGNED_URL_TTL_SECONDS`.
- Empty, unset, or not an integer → `60`.
- Clamp to the inclusive range `15`–`300`.
- Never throw. CI leaves the variable unset.

The mint route calls this. Ignore any TTL query param from the browser.

## Keys

`lib/uploads/storage-key.ts`:

```ts
export function storageKeyFor(
  userId: string,
  documentId: string,
  now: Date = new Date(),
): string;

export function keyBelongsToUser(key: string, userId: string): boolean;
```

`storageKeyFor` keeps today’s shape: `` `${userId}/${yyyy}/${mm}/${documentId}` `` with UTC month padded to 2 digits. No leading slash, no bucket, no `..`.

`keyBelongsToUser` is true only when all of these hold:

- `userId` is non-empty and `key.startsWith(`${userId}/`)`
- `key` does not contain `..`, does not start with `/`, and does not contain `\`
- the remainder after the prefix is non-empty

The strict UUID regex is **not** required at delete/download time. Tests and any older row may use a shorter suffix. New uploads still go through `storageKeyFor`.

`createDraftDocument` imports `storageKeyFor` from this module. Delete the private copy.

`storage-key.test.ts`:

- Fixed `now` of `Date.UTC(2026, 8, 22)` (September) and ids `user` / `doc` → `user/2026/09/doc`. Assert `keyBelongsToUser` is true for that user and false for `other`.
- `../etc/passwd`, `/abs`, and `other/user/2026/09/doc` are rejected for `user`.

## Local and memory signatures

`lib/storage/sign-local.ts` uses `node:crypto` only (`createHmac`, `timingSafeEqual`, `randomBytes`). No AWS SDK.

Token: `base64url(json).base64url(hmacSha256)`.

JSON payload: `{ "k": "<storage key>", "e": <unix seconds>, "n": "<download name or omitted>", "c": "<content type or omitted>" }`.

```ts
export function signStorageToken(
  payload: { k: string; e: number; n?: string; c?: string },
  key: Uint8Array,
): string;

export function verifyStorageToken(
  token: string,
  key: Uint8Array,
  nowSeconds: number,
): { k: string; e: number; n?: string; c?: string } | null;
```

`verifyStorageToken` returns null when the token is malformed, the HMAC does not match, or `e <= nowSeconds`. Compare the MAC with `timingSafeEqual` on equal-length buffers. Do not throw on bad input.

Signing key:

- If `STORAGE_URL_SIGNING_SECRET` is non-empty, its UTF-8 bytes are the key.
- Otherwise a 32-byte key from `randomBytes`, stored in a module singleton for the life of the process.

Export `getProcessSigningKey()` for the adapters and the redeem route. Tests of `signStorageToken` pass their own `Uint8Array` and do not read env. Empty secret must not throw in CI.

`createMemoryStorage` and `createLocalStorage` gain an optional last argument so tests can pin the clock and the key:

```ts
type LocalSignOptions = {
  signingKey?: Uint8Array;
  nowSeconds?: () => number;
};

export function createMemoryStorage(
  options?: LocalSignOptions,
): StorageProvider;
export function createLocalStorage(
  rootDir: string,
  options?: LocalSignOptions,
): StorageProvider;
```

Production `createObjectStorage()` keeps calling `createMemoryStorage()` and `createLocalStorage(localDir)` with no options.

`signedUrl` on both adapters:

1. `exp = nowSeconds() + options.expiresInSeconds`
2. `downloadName` passed through `sanitizeDownloadName` (below)
3. return `/api/storage/download?token=${signStorageToken(...)}`

They do not read the blob to mint a URL. `put` / `get` / `delete` behavior stays as it is, including the local root escape check.

`sanitizeDownloadName` (same file, exported, tested):

- Take the last path segment (`/` and `\`).
- Strip `"`, `\r`, `\n`, `;`.
- Trim. Cap at 200 characters.
- If nothing remains, use `document`.

`sign-local.test.ts`:

- Round-trip: verify returns the same `k`, `n`, `c`.
- Expired token (`e === now`) is null.
- One flipped character in the MAC is null.
- A token signed with key A fails under key B.
- `sanitizeDownloadName('a/b";\r\nname.txt')` is `name.txt`.

## S3 / R2 presign

In `lib/storage/s3.ts`, add `signedUrl` next to the existing commands.

```ts
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
```

Build the command with `GetObjectCommand`:

- `Bucket`, `Key`
- `ResponseContentType` when `contentType` is set
- `ResponseContentDisposition: attachment; filename="<sanitized>"` when a name is set (use `sanitizeDownloadName`)

`expiresIn` is `options.expiresInSeconds` (the mint route already clamped it).

Do not log the client, the credentials, or the signed URL.

`get` today swallows every error and returns null. Change it:

```ts
export function isMissingObjectError(error: unknown): boolean;
```

True for SDK errors whose `name` is `NoSuchKey` or `NotFound`. Those return null. Any other error is rethrown. `delete` stays idempotent (`DeleteObject` even if the key is already gone). Local `unlink` already ignores a missing file.

`s3-sign.test.ts` does not construct an `S3Client` and does not open a socket. Test:

- `isMissingObjectError({ name: "NoSuchKey" })` is true; `{ name: "AccessDenied" }` is false.
- A pure helper `buildSignedGetInput(bucket, key, options)` returns the command fields above, with the filename sanitized.

If `buildSignedGetInput` is the easiest way to test without a mock of the presigner, export it from `s3.ts`. The live `getSignedUrl` call is not unit-tested.

`createS3Storage()` still throws `${name} is required when STORAGE_DRIVER=s3` when a required env var is missing. That throw happens only when the driver is `s3`. The default driver never calls it.

R2 is the same adapter. No new driver name. Document these values (do not put a real account id in the repo):

| Variable               | R2                                              |
| ---------------------- | ----------------------------------------------- |
| `STORAGE_DRIVER`       | `s3`                                            |
| `S3_ENDPOINT`          | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| `S3_REGION`            | `auto`                                          |
| `S3_BUCKET`            | bucket name                                     |
| `S3_ACCESS_KEY_ID`     | R2 S3 API token access key id                   |
| `S3_SECRET_ACCESS_KEY` | that token’s secret                             |

`forcePathStyle: true` is already set and must stay. That is what R2 and MinIO need. Do not point `S3_ENDPOINT` at a public `r2.dev` URL. MinIO is the same variables with a local endpoint; do not run MinIO in CI.

## Redeem and mint

### `openSignedDownload`

`lib/uploads/open-signed-download.ts`:

```ts
export async function openSignedDownload(
  storage: StorageProvider,
  token: string,
  signingKey: Uint8Array,
  nowSeconds: number,
): Promise<{
  body: Uint8Array;
  downloadName: string;
  contentType: string;
} | null>;
```

Verify the token. If verification fails, return null. If `storage.get(payload.k)` returns null, return null. Otherwise return the bytes plus the sanitized name (default `document`) and content type (default `application/octet-stream`).

This function is what tests call. Do not boot Next for it.

### `GET /api/storage/download`

Public path. Add an exact match in `isPublicApiPath`:

```ts
if (pathname === "/api/storage/download") return true;
```

Do not prefix-match `/api/storage`, or a future route would be public by accident.

`runtime = "nodejs"`. Read `token` from the query string. Call `openSignedDownload(createObjectStorage(), token, getProcessSigningKey(), Math.floor(Date.now() / 1000))`.

- Missing or bad token, or missing blob → **404** `{ "error": "not_found" }`. Do not use 401 (that would distinguish “bad MAC” from “expired”).
- Success → raw body, status 200, headers:
  - `Content-Type` from the token or `application/octet-stream`
  - `Content-Disposition: attachment; filename="<sanitized>"`
  - `Cache-Control: private, no-store`
  - `Referrer-Policy: no-referrer`
  - `X-Content-Type-Options: nosniff`

Do not log the token or the query string. This route is only for local/memory URLs. S3 URLs never hit it.

`public-paths.test.ts`: `/api/storage/download` is not protected; `/api/storage` and `/api/documents/x/download` **are** protected.

### `GET /api/documents/:id/download`

Copy the session and 503 `database_unconfigured` pattern from `app/api/documents/[id]/route.ts` (`sessionContext` from `@/lib/api/session`, `params: Promise<{ id: string }>`).

After the app user resolves:

1. Load the document with `id`, `userId = appUser.id`, and `deletedAt` null. Missing → **404** `{ "error": "not_found" }`.
2. If `keyBelongsToUser(doc.storageKey, appUser.id)` is false → **404**. Do not call `signedUrl`.
3. `ttl = resolveSignedUrlTtl()`.
4. `url = await storage.signedUrl(doc.storageKey, { expiresInSeconds: ttl, downloadName: doc.name, contentType: doc.mimeType })`.
5. **200** `{ "url": "<string>", "expiresAt": "<ISO-8601>" }` where `expiresAt` is `ttl` seconds from now.

`pending` documents are downloadable (the blob is already stored). Do not block on `anchored`.

The JSON must not contain `storageKey`, the bucket, or env values.

No rate limit in this issue. #14 adds one on this route. Leave a one-line comment in the handler: `// rate limit: issue #14`.

## Delete cleanup

`deleteDocumentForUser` stays: soft-delete and release quota **first**, then the blob. A blob failure must not roll back the row (quota would stay consumed while the UI shows the file as gone).

Change the blob step:

```ts
if (keyBelongsToUser(doc.storageKey, userId)) {
  try {
    await storage.delete(doc.storageKey);
  } catch (error) {
    console.error("storage_delete_failed", {
      storageKey: doc.storageKey,
      message: error instanceof Error ? error.message : "unknown",
    });
  }
} else {
  console.error("storage_key_rejected", { documentId });
}
```

Log the key on a storage failure (it is an internal path, not a secret). Do not log file bytes. On a rejected prefix, log the document id only.

`delete-document.test.ts`:

- Change stored keys from `k1` / `k2` / `k3` / `k4` to `` `${userId}/k1` `` (and so on) so they pass `keyBelongsToUser`.
- After the successful draft delete, `expect(await storage.get(`${userId}/k1`)).toBeNull()`.
- New case: row owned by the user with `storageKey: "other/secret"`, blob put at that key. After delete, the row is soft-deleted, quota is released, and `get("other/secret")` still returns the bytes (`delete` was not called).
- Existing cases stay: other user → not found; `pending` → `DocumentPendingDeleteError`; anchored row keeps the `anchors` row.

Do not delete `anchors`. On-chain data is out of this issue; #14 states that in the threat model.

`user.deleted` still only sets `users.deleted_at`. Account-wide blob cleanup is #14.

## UI

In `app/dashboard/document-actions.tsx`, detail variant only, add a button **Descargar** before **Eliminar**.

- `GET /api/documents/${doc.id}/download` with credentials (same-origin `fetch`).
- 200: `window.location.assign(body.url)`. Relative local paths and absolute S3 URLs both work with `assign`.
- Any other status: `toast.error("No se pudo descargar el documento.")`.
- Do not write the URL into the page text.
- Do not disable the button for `pending`.
- Keep the control usable at 320px (`flex-wrap` is already on the detail row).

The list dropdown does not need a download item in this issue.

## Env

Append to `.env.example` under the existing storage block:

```bash
# Signed download TTL in seconds. Default 60. Clamped to 15–300.
# Empty is valid. CI leaves this unset.
STORAGE_SIGNED_URL_TTL_SECONDS=

# HMAC key for local/memory download tokens. Empty → a process-local random key
# (tokens die on restart). Set a long random value in production if STORAGE_DRIVER=local.
# Not used when STORAGE_DRIVER=s3 (R2 presigns with S3_SECRET_ACCESS_KEY).
STORAGE_URL_SIGNING_SECRET=

# R2 (only when STORAGE_DRIVER=s3). S3-compatible API, not the r2.dev public URL.
# S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
# S3_REGION=auto
# S3_BUCKET=<bucket>
# S3_ACCESS_KEY_ID = R2 token access key id
# S3_SECRET_ACCESS_KEY = R2 token secret
# The app sets forcePathStyle. Leave S3_* empty for CI and `pnpm build`.
```

Do not put sample secrets. Empty values stay empty. Do not add these to the GitHub Actions `env` block unless you set them to `""`. `STORAGE_DRIVER: local` is already there; leave it.

## Docs to touch when implementing

README storage section: local remains the default; `s3` is R2 or AWS; signed downloads expire in about a minute; CI does not need R2.

`docs/architecture.md` storage section: name `StorageProvider`, the mint route, the public redeem route, and the key prefix rule. Add `STORAGE_SIGNED_URL_TTL_SECONDS` and `STORAGE_URL_SIGNING_SECRET` to the secrets table as server-only (the signing secret is not `NEXT_PUBLIC_`).

Add this plan to the README plan index.

## Tests that must stay green

Existing `memory.test.ts` round-trip stays. Extend it with `delete` then `get` → null, and with `signedUrl` returning a path that starts with `/api/storage/download?token=`.

No test may import `@aws-sdk/client-s3` in a way that sends a request. No test sets `STORAGE_DRIVER=s3`.

`pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build` with the CI env (empty `S3_*`, empty Clerk, empty `DATABASE_URL`, `STORAGE_DRIVER=local`).

## Acceptance map

| Criterion                                       | Where                                                             |
| ----------------------------------------------- | ----------------------------------------------------------------- |
| `StorageProvider` with put/get/delete/signedUrl | `lib/storage/types.ts`; all four adapters                         |
| Keys namespaced by userId                       | `storageKeyFor`; `keyBelongsToUser` on download and delete        |
| Short-lived download URL                        | TTL clamp; S3 presign; local HMAC; mint route returns `expiresAt` |
| Cleanup on document delete                      | `deleteDocumentForUser` + test that `get` is null                 |
| R2 documented, local default in CI              | `.env.example`, README, workflow unchanged driver                 |

## Out of scope

Presigned uploads, multipart client uploads, a new `r2` driver name, MinIO in CI, virus scanning, image transforms, account-wide GDPR erasure (#14), rate limits (#14), deleting `anchors` rows, changing the SHA-256 pipeline.

## Risks

- Minting an S3 URL for a key that does not start with the user’s id would let one user sign another user’s object. The prefix check is mandatory before `signedUrl` and before `delete`.
- Putting the local token route behind `auth.protect()` makes `window.location.assign` bounce to `/sign-in` and the file never downloads. It must be public, and the HMAC is the capability. Keep the TTL short and send `no-referrer` / `no-store`.
- Logging `req.url` on that route writes the token into logs. Do not log the query.
- Importing `s3.ts` from `document-actions.tsx` pulls the AWS SDK into the client bundle. The client only `fetch`es the mint route.
- `get()` swallowing `AccessDenied` hides a bad R2 token as a missing file. Only `NoSuchKey` / `NotFound` map to null.
- Deleting the blob before `releaseStorage` can free the file and then fail the DB update, so the UI still shows a document whose bytes are gone. Keep DB first.
