# Issue #3 — Data model plan

Status: plan only. Implement after this doc is on the branch, before issues #2 and #4 (they import this schema). Do not add Clerk UI or upload routes in the #3 commit if the work is split; the combined batch may land in one PR as long as schema exists before webhook and upload code.

Issue: https://github.com/caeher/stellar-data-integrity/issues/3

Depends on: issue #1 scaffold (done). App Router at repo root, `next@16.3.5`, pnpm, `@/*` paths, no `src/`.

Blocks: issue #2 (`provisionFreePlan`), issue #4 (documents, quota, usage events).

## Decision

**Drizzle ORM + PostgreSQL**, not Prisma.

- SQL migrations are files in git (`drizzle/`), so they are reproducible without a running database generator daemon.
- The same `db/schema.ts` runs against **postgres.js** in real environments (local Postgres or Neon connection string) and against **PGlite** in Vitest. CI and `pnpm build` do not need `DATABASE_URL`, Neon, or Docker.
- Neon-compatible means: use a standard Postgres URL (`sslmode=require` on Neon). Do not take a hard dependency on `@neondatabase/serverless`. `postgres` (postgres.js) speaks Neon’s pooled URL.

## Packages (exact pins)

```bash
pnpm add drizzle-orm@0.45.3 postgres@3.4.9
pnpm add -D drizzle-kit@0.31.11 tsx@4.23.15 @electric-sql/pglite@0.5.8 vitest@5.0.1
```

`vitest` is introduced here and reused by #2 and #4. Do not add Playwright.

Do not add Prisma, `@neondatabase/serverless`, or `drizzle-zod`.

## Scripts

Add to `package.json`:

```json
{
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:seed": "tsx db/seed.ts",
  "test": "vitest run"
}
```

`pnpm db:generate` and `pnpm test` must succeed with no `DATABASE_URL`. `pnpm db:migrate` and `pnpm db:seed` require `DATABASE_URL` and are for local/staging only. Do not call them from `pnpm build`.

## Files

```
db/schema.ts                 # tables below
db/client.ts                 # lazy postgres.js client; throws only when called
db/pglite.ts                 # test helper: in-memory PGlite + drizzle migrator
db/seed.ts                   # idempotent Free/Pro/Enterprise plan rows
db/constants.ts              # byte limits shared with seed and later quota code
drizzle.config.ts
drizzle/0000_*.sql           # generated; commit it
drizzle/meta/*               # generated; commit it
vitest.config.ts             # alias @ -> repo root
db/schema.test.ts
.gitignore                   # add .data/
```

`vitest.config.ts`:

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node", include: ["**/*.test.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
```

`drizzle.config.ts` dialect `postgresql`, schema `./db/schema.ts`, out `./drizzle`. `dbCredentials.url` reads `process.env.DATABASE_URL`. Generate does not connect. If drizzle-kit refuses to load without a URL, set a dummy default only inside the config module (`postgres://postgres:postgres@127.0.0.1:5432/stellar_data_integrity`) and never open a connection during generate.

## Client rules (build must not connect)

`db/client.ts`:

- Do not construct `postgres()` at module top level.
- `getDb()` reads `DATABASE_URL`. If it is missing, throw `Error("DATABASE_URL is not set")`.
- Cache the client on `globalThis` in development so HMR does not exhaust connections.
- Driver: `drizzle(postgres(url, { max: 10, prepare: false }))`. `prepare: false` is required for Neon’s transaction pooler.
- No import of this module from `app/layout.tsx` or `app/page.tsx`. The marketing page stays static and credential-free.

PGlite helper used only from tests:

```ts
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

export async function createTestDb() {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  return { db, client };
}
```

If `drizzle-orm/pglite/migrator` path differs in 0.45.3, use the path exported by the installed package. Do not shell out to a Postgres server.

## Schema

UUID primary keys via `gen_random_uuid()`. Timestamps `timestamptz` default `now()`. Money and byte counts are integers or `bigint` in the database (Drizzle `bigint` mode `number` only where the value fits in JS safe integers; storage bytes and size bytes fit). Use `bigint("...", { mode: "number" })` for byte columns. Anchor fee is `numeric` as string mode, nullable.

Snake case in SQL, camelCase in the Drizzle object.

### `plans`

| Column                       | Type                 | Notes                       |
| ---------------------------- | -------------------- | --------------------------- |
| id                           | uuid pk              |                             |
| slug                         | text unique not null | `free`, `pro`, `enterprise` |
| name                         | text not null        | Spanish display name        |
| storage_limit_bytes          | bigint not null      |                             |
| max_upload_bytes             | bigint not null      | per file                    |
| monthly_anchors_included     | integer not null     |                             |
| price_per_extra_anchor_cents | integer null         | placeholder, no billing yet |
| price_per_gb_cents           | integer null         | placeholder                 |

Seed values:

| slug       | storage               | max upload          | anchors / month | extra anchor | extra GB |
| ---------- | --------------------- | ------------------- | --------------- | ------------ | -------- |
| free       | 104857600 (100 MiB)   | 26214400 (25 MiB)   | 10              | null         | null     |
| pro        | 10737418240 (10 GiB)  | 104857600 (100 MiB) | 500             | null         | null     |
| enterprise | 1099511627776 (1 TiB) | 524288000 (500 MiB) | 100000          | null         | null     |

Prices stay `null` until a later billing issue. Constants live in `db/constants.ts` and the seed imports them. Pro/Enterprise rows exist so the slug check constraint is real; no UI sells them in this batch.

### `users`

| Column             | Type                               | Notes                                       |
| ------------------ | ---------------------------------- | ------------------------------------------- |
| id                 | uuid pk                            | internal id, not the Clerk id               |
| clerk_user_id      | text not null                      | **unique index** `users_clerk_user_id_uidx` |
| email              | text null                          | primary email from Clerk; may be null       |
| plan_id            | uuid not null                      | fk `plans.id`                               |
| storage_used_bytes | bigint not null default 0          | maintained by #4 transactions               |
| created_at         | timestamptz not null default now() |                                             |
| deleted_at         | timestamptz null                   | set by `user.deleted`; optional soft delete |

### `documents`

| Column      | Type                               | Notes                                                    |
| ----------- | ---------------------------------- | -------------------------------------------------------- |
| id          | uuid pk                            |                                                          |
| user_id     | uuid not null                      | fk `users.id`                                            |
| name        | text not null                      | original filename or text title, max 255                 |
| mime_type   | text not null                      |                                                          |
| size_bytes  | bigint not null                    | exact byte length hashed                                 |
| sha256      | char(64) not null                  | lowercase hex                                            |
| storage_key | text not null                      | `userId/yyyy/mm/uuid`, no bucket secret                  |
| status      | text not null                      | check `draft` \| `anchored` \| `failed`, default `draft` |
| created_at  | timestamptz not null default now() |                                                          |
| deleted_at  | timestamptz null                   | soft delete                                              |

Indexes:

- `documents_sha256_idx` on `sha256` (not unique: two users may store the same bytes)
- `documents_user_id_idx` on `user_id`
- `documents_user_active_idx` on `(user_id)` where `deleted_at is null` (partial)

### `anchors`

No writer in this batch. Table must exist.

| Column      | Type                               | Notes                                   |
| ----------- | ---------------------------------- | --------------------------------------- |
| id          | uuid pk                            |                                         |
| document_id | uuid not null                      | fk `documents.id`                       |
| network     | text not null                      | check `testnet` \| `mainnet`            |
| tx_hash     | text not null                      | **unique index** `anchors_tx_hash_uidx` |
| ledger      | bigint null                        |                                         |
| contract_id | text null                          |                                         |
| anchored_at | timestamptz not null default now() |                                         |
| fee_xlm     | numeric(20, 7) null                |                                         |

### `usage_events`

| Column      | Type                               | Notes                                                |
| ----------- | ---------------------------------- | ---------------------------------------------------- |
| id          | uuid pk                            |                                                      |
| user_id     | uuid not null                      | fk `users.id`                                        |
| type        | text not null                      | check `upload` \| `anchor` \| `download` \| `verify` |
| bytes_delta | bigint not null                    | signed; uploads positive                             |
| meta        | jsonb not null default `'{}'`      |                                                      |
| created_at  | timestamptz not null default now() |                                                      |

Index `usage_events_user_id_created_at_idx` on `(user_id, created_at)`.

### `subscriptions`

| Column             | Type                               | Notes                                      |
| ------------------ | ---------------------------------- | ------------------------------------------ |
| id                 | uuid pk                            |                                            |
| user_id            | uuid not null                      | **unique** so one current row              |
| plan_id            | uuid not null                      | fk `plans.id`                              |
| status             | text not null                      | check `active` \| `canceled` \| `past_due` |
| stripe_customer_id | text null                          | unused until billing                       |
| current_period_end | timestamptz not null               | end of the UTC month at provision time     |
| created_at         | timestamptz not null default now() |                                            |

### `webhook_events` (needed by #2, created here)

| Column      | Type                               | Notes          |
| ----------- | ---------------------------------- | -------------- |
| id          | text pk                            | Svix `svix-id` |
| event_type  | text not null                      |                |
| received_at | timestamptz not null default now() |                |

## Seed

`db/seed.ts` upserts the three plans on `slug` (`on conflict do update` the numeric limits, not the id). Safe to run twice. Exported function `seedPlans(db)` so tests call it without the CLI. The CLI loads `DATABASE_URL` and calls `seedPlans(getDb())`.

Free plan lookup for #2: `select plan where slug = 'free'`. If missing, throw a clear error telling the operator to run `pnpm db:seed`. Tests always seed.

## Quota transaction (contract for #4, function stub allowed in #3)

Put `reserveStorage(db, input)` in `db/quota.ts` so #4 does not invent a second locking scheme.

```text
begin
  select users.storage_used_bytes, plans.storage_limit_bytes, plans.max_upload_bytes
  from users
  join plans on plans.id = users.plan_id
  where users.id = $userId and users.deleted_at is null
  for update

  if sizeBytes > max_upload_bytes -> throw UploadTooLarge
  if storage_used_bytes + sizeBytes > storage_limit_bytes -> throw QuotaExceeded

  insert documents (status draft, sha256, storage_key, ...)
  update users set storage_used_bytes = storage_used_bytes + sizeBytes
  insert usage_events (type upload, bytes_delta = sizeBytes, meta { documentId, sha256 })
commit
```

`FOR UPDATE` on the user row serializes concurrent uploads for that user. On any throw, the transaction rolls back so bytes are not reserved without a document. Do not check quota outside the transaction and then insert: that races.

PGlite is a single connection, which still honors `FOR UPDATE` inside one transaction. The race test in #4 runs two transactions sequentially on that connection only if the test driver cannot overlap them; prefer two `PGlite` clients if the build supports it, otherwise simulate the race by interleaving the check and the write in a unit test of a broken vs locked implementation. Minimum acceptable test: two `reserveStorage` calls in `Promise.all` whose sizes each fit but whose sum exceeds the limit, and exactly one success. If PGlite serializes them on one connection, start the second only after the first has locked, using a deferred query. Document the result in the test name.

Deleting a draft later (not required to ship a UI) must decrement `storage_used_bytes` in the same transaction as setting `deleted_at`. Add `releaseStorage(db, documentId)` now so the invariant has an owner. It no-ops if `deleted_at` is already set.

## Env

Add to `.env.example` (empty secret values, comments only for examples):

```bash
# PostgreSQL. Local or Neon (use the pooled URL, sslmode=require).
# Not required for `pnpm build` or `pnpm test`.
# DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/stellar_data_integrity
DATABASE_URL=
```

## Commands the implementer runs

```bash
pnpm db:generate
pnpm db:seed   # only if a local Postgres is already running; skip otherwise
pnpm test
pnpm typecheck
pnpm lint
pnpm build     # no DATABASE_URL
```

Commit the generated `drizzle/` SQL. Do not commit a live database.

## Tests (`db/schema.test.ts`)

Against in-memory PGlite, no network:

1. Migrations create `plans`, `users`, `documents`, `anchors`, `usage_events`, `subscriptions`, `webhook_events`.
2. After `seedPlans`, slug `free` has `storage_limit_bytes = 104857600`, `monthly_anchors_included = 10`, `max_upload_bytes = 26214400`.
3. Second `seedPlans` does not insert a duplicate `free` row.
4. Inserting two users with the same `clerk_user_id` fails.
5. Inserting two anchors with the same `tx_hash` fails.
6. A document can be inserted with `deleted_at` null and selected back by sha256.

## Acceptance map

| Issue criterion                   | File                                                     |
| --------------------------------- | -------------------------------------------------------- |
| Reproducible migrations           | `drizzle/*.sql` committed; test applies them with PGlite |
| Seed Free plan                    | `db/seed.ts`, `db/constants.ts`                          |
| Index on sha256                   | `documents_sha256_idx` in schema + SQL                   |
| Index on clerkUserId              | `users_clerk_user_id_uidx`                               |
| Index on txHash                   | `anchors_tx_hash_uidx`                                   |
| Optional soft delete on documents | `documents.deleted_at`                                   |

## Out of scope

Stripe charges, Stellar submission, upload HTTP routes, Clerk SDK. Those are #2, #4, and later issues. `reserveStorage` may land in this issue because #4 must not redefine locking.

## Risks

- `drizzle-kit generate` is interactive on renames. First migration is create-only; do not rename columns in this batch.
- PGlite does not accept a `postgres://` URL. Tests must not call `getDb()`.
- `pnpm build` imports no DB client from the root layout. A mistaken import that calls `getDb()` at module scope fails the credential-free build.
- Byte columns as JS numbers are safe up to `2^53 - 1`. Enterprise’s 1 TiB fits. Do not store XLM fees as JS floats.
