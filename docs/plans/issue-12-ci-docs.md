# Issue #12 — CI, architecture docs, and deploy notes

Status: plan only. Do not implement in the same commit as this document.

Issue: https://github.com/caeher/stellar-data-integrity/issues/12

Depends on: `main` after #1–#8. Prefer landing after #9–#11 so `docs/architecture.md` describes the dashboard routes and `BILLING_ENABLED`. The workflow itself does not need those issues: `pnpm lint`, `typecheck`, `test`, and `build` already pass on `main` without secrets.

There is no `.github/workflows` directory today. There is no `docs/architecture.md` or `docs/stellar.md`. README already documents env vars, Free limits, Stellar, and verify, and its plan index stops at issue #4 even though `docs/plans/issue-05` through `issue-08` exist.

## Decision

Add a GitHub Actions workflow that runs the scripts already in `package.json`. Do not add a new test runner. Do not create a Vercel project, a Neon database, or a Clerk application from CI.

CI must be green with every secret empty. The app is already built that way: lazy `getDb()`, Clerk provider only when the publishable key is set, Stellar clients only when a call needs them, Vitest on PGlite.

Contract tests are a separate job. They need Rust, not Node secrets, and they do not need the Stellar CLI. Do not run `pnpm contract:build` or `pnpm contract:deploy` in CI.

## Workflow

Create `.github/workflows/ci.yml`.

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  app:
    runs-on: ubuntu-latest
    env:
      DATABASE_URL: ""
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ""
      CLERK_SECRET_KEY: ""
      CLERK_WEBHOOK_SECRET: ""
      CLERK_WEBHOOK_SIGNING_SECRET: ""
      ALCHEMY_STELLAR_API_KEY: ""
      STELLAR_HOT_WALLET_SECRET: ""
      STELLAR_CONTRACT_ID: ""
      BILLING_ENABLED: "false"
      STORAGE_DRIVER: local
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10.33.3
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm format:check
      - run: pnpm test
      - run: pnpm build

  contract:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - run: cargo test --manifest-path contracts/anchor/Cargo.toml
```

Notes for the implementer:

- `packageManager` is `pnpm@10.33.3`. The setup action version must match so the lockfile installs.
- Node 22 matches the README recommendation. `engines` allows `>=20.9.0`; do not drop to an older runner image by accident.
- Do not declare GitHub Actions secrets. An empty string in `env` is intentional. If a step fails because a variable is missing, fix the app so the empty value is valid. Do not paper over it with a fake key.
- `pnpm test` already covers hash fixtures (`lib/uploads/hash.test.ts`), storage quota (`lib/uploads/create-document.test.ts`, `db/anchor-quota.test.ts`), and Stellar health with mocks (`lib/stellar/health.test.ts`, `app/api/stellar/health/route.test.ts`). Do not rewrite those tests in this issue.
- `format:check` is already a script. If `main` is not clean, format the offending files in the #12 PR. Do not weaken the job.
- `contract` installs stable Rust. README asks for stable ≥ 1.98 because of the pinned `soroban-sdk`. If stable on the runner is older than the crate requires, pin `dtolnay/rust-toolchain` to a specific stable that satisfies that floor (for example `1.98.0` or newer). Do not set `continue-on-error`. Do not install the Stellar CLI.
- Cargo must be allowed to reach crates.io on first run. The committed snapshots under `contracts/anchor/test_snapshots/` must stay in git. Do not ignore them.
- `contracts/anchor/target/` is gitignored. CI builds it from scratch.

## `docs/architecture.md`

Write from the code on the branch, not from memory. Spanish or bilingual is fine; identifiers stay as in the repo. Suggested headings:

1. **Qué es** — SHA-256 of files and text, hash anchored on Stellar. One short paragraph. Link the README.
2. **Stack** — Next.js 16.3.5 (App Router at repo root, `proxy.ts` instead of `middleware.ts`), React 19, Tailwind 4, shadcn `base-nova`, Drizzle, PostgreSQL, Clerk, Vitest + PGlite. pnpm 10.
3. **Rutas** — table of pages and route handlers that exist after #9, or those on `main` if #9 has not merged. Mark `/dashboard` and `/dashboard/*` as protected. Public: `/`, `/sign-in`, `/sign-up`, `/verify`, `/v/[hash]`, `GET /api/stellar/health`, `POST /api/verify`, `POST /api/webhooks/clerk`. Source of truth: `lib/auth/public-paths.ts` and `proxy.ts`.
4. **Auth** — `clerkMiddleware` when `CLERK_SECRET_KEY` is set; otherwise protected paths redirect to `/sign-in`. `ClerkProvider` only if `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set. Provisioning: `provisionFreePlan` on dashboard load and the Clerk webhook (`user.created`, `user.deleted`).
5. **Datos** — tables in `db/schema.ts`: `plans`, `users`, `documents`, `anchors`, `usage_events`, `subscriptions`, `webhook_events`. Who writes documents (upload), anchors (anchor job), usage events (`upload` and `anchor`). Soft delete via `deleted_at`.
6. **Cuotas** — Free numbers from `db/constants.ts`. Storage reserved in a transaction before the blob is stored. Anchors counted per UTC month from `usage_events` plus `pending` documents. Public codes `QUOTA_STORAGE` and `QUOTA_ANCHORS` once #10 has merged; until then document the current strings `quota_exceeded` and `anchor_quota_exceeded` and point at the #10 plan. `BILLING_ENABLED` defaults false. No Stripe.
7. **Anclaje** — browser calls `POST /api/documents/:id/anchor`. Server signs with `STELLAR_HOT_WALLET_SECRET`. Missing secret or contract id → `503 anchor_unconfigured` before the row becomes `pending`. Receipt is an `anchors` row.
8. **Verificación** — `POST /api/verify`, pages `/verify` and `/v/[hash]`. Database first, chain second when configured. In-memory rate limit, 30 requests per minute per IP per Node process. No Redis.
9. **Almacenamiento** — `STORAGE_DRIVER=local` (`.data/objects`) or `s3`. Tests use memory. S3 env is read only when the driver is `s3`.
10. **Entorno** — pointer to `.env.example` and the secrets table below. State that `pnpm build` and `pnpm test` do not need a database.
11. **CI** — what the workflow runs, including the contract job.
12. **Despliegue en Vercel (notas, sin crear el proyecto)** — see below.
13. **Fuera de esta versión** — no cobro, no Stripe, precios de planes en `null`, no cola de trabajos distinta del request de anclaje.

Do not paste secrets, example API keys, or the hot-wallet seed. Do not duplicate the full Rust contract; link `contracts/anchor/src/lib.rs` and `docs/stellar.md`.

## `docs/stellar.md`

Write from `lib/stellar/endpoints.ts`, `.env.example`, `contracts/anchor/src/lib.rs`, and `scripts/deploy-anchor.ts`.

Headings:

1. **Redes** — `STELLAR_NETWORK=testnet` (default) or `mainnet`. Passphrases: `Test SDF Network ; September 2015` and `Public Global Stellar Network ; September 2015`.
2. **Alchemy** — create an Alchemy app with the Stellar chain. Set `ALCHEMY_STELLAR_API_KEY` on the server only. URL shapes already implemented:
   - Testnet RPC: `https://stellar-testnet.g.alchemy.com/v2/<key>`
   - Mainnet RPC: `https://stellar-mainnet.g.alchemy.com/v2/<key>`
   - Websocket URLs in `.env.example` are not used by the app.
   - Empty key on testnet uses `https://soroban-testnet.stellar.org` and Horizon `https://horizon-testnet.stellar.org`.
   - Empty key on mainnet uses Horizon `https://horizon.stellar.org` only. There is no public mainnet Soroban RPC in this code, so anchor and chain verify need the Alchemy key on mainnet.
3. **La clave no se filtra** — `lib/stellar/redact.ts` strips the key from logs and from `GET /api/stellar/health`. Never prefix the key, the hot wallet, or the contract id with `NEXT_PUBLIC_`.
4. **Contrato** — `contracts/anchor`. Operator set in the constructor; `anchor` requires operator auth. The key is a 32-byte hash. `meta_cid` max 128 bytes. Re-anchoring the same hash, metadata, and owner returns the first record. A different metadata or owner errors. `verify` of an unknown hash is none. Tests: `pnpm contract:test`. WASM: `pnpm contract:build` (Stellar CLI, not CI). Deploy: `pnpm contract:deploy` writes `STELLAR_CONTRACT_ID` for the operator to copy into the server env. It does not commit an id.
5. **Monedero** — `STELLAR_HOT_WALLET_SECRET` is the server signer. The browser never sees it. Do not call Friendbot from the Next process (already forbidden by #7). Document that testnet funding is a manual step outside the app.
6. **Salud** — `GET /api/stellar/health` is public. It checks the configured network and redacts the key.
7. **Expert** — transaction links are `https://stellar.expert/explorer/testnet/tx/<hash>` or `.../public/tx/<hash>` (`lib/anchors/expert-url.ts`).
8. **Secretos** — same table as architecture, Stellar rows only.

If a host in this list disagrees with `lib/stellar/endpoints.ts`, the TypeScript file wins. Update the doc, not the client, unless the code is actually wrong.

## Secrets

Add this table to `docs/architecture.md` and a shorter pointer in the README. "Dónde" means the only places a value may live.

| Variable                                                                            | Required for                       | Where                  | Notes                                                                                                        |
| ----------------------------------------------------------------------------------- | ---------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`                                                                      | Dashboard and API against Postgres | `.env.local`, host env | Not required for CI, `pnpm build`, or `pnpm test`. Pooled Neon URL uses `sslmode=require`.                   |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`                                                 | Clerk UI                           | `.env.local`, host env | Public by design. Empty in CI.                                                                               |
| `CLERK_SECRET_KEY`                                                                  | Auth gate                          | `.env.local`, host env | Server only.                                                                                                 |
| `CLERK_WEBHOOK_SECRET` / `CLERK_WEBHOOK_SIGNING_SECRET`                             | `POST /api/webhooks/clerk`         | `.env.local`, host env | Server only. Both names are accepted.                                                                        |
| `STORAGE_DRIVER`, `STORAGE_LOCAL_DIR`                                               | Blob storage                       | `.env.local`, host env | Default `local` and `.data/objects`.                                                                         |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Only when `STORAGE_DRIVER=s3`      | `.env.local`, host env | Never commit.                                                                                                |
| `STELLAR_NETWORK`                                                                   | Anchor and health                  | `.env.local`, host env | `testnet` or `mainnet`. Not a secret.                                                                        |
| `ALCHEMY_STELLAR_API_KEY`                                                           | Hosted Soroban RPC                 | `.env.local`, host env | Server only. Redacted in logs.                                                                               |
| `STELLAR_HOT_WALLET_SECRET`                                                         | Submitting anchors                 | `.env.local`, host env | Server only. Never `NEXT_PUBLIC_`.                                                                           |
| `STELLAR_CONTRACT_ID`                                                               | Anchor and chain verify            | `.env.local`, host env | Not a key, but do not treat a deployed id as something to commit if it is environment-specific. Empty in CI. |
| `BILLING_ENABLED`                                                                   | Future payments                    | `.env.local`, host env | Default `false`. No Stripe keys exist.                                                                       |

Rules to state in prose:

- `.gitignore` ignores `.env*` except `.env.example`, plus `*.pem` and `.vercel`. Do not relax that.
- GitHub Actions for this repo uses no secrets. Do not add a secret to the workflow to make a job pass.
- Vercel env, when someone creates a project later, gets the same names. Production and Preview can differ (`STELLAR_NETWORK`, contract id, database).
- Never commit a filled `.env.local`. `.env.example` keeps empty values.

## Vercel notes (do not create the project)

Put this under the deploy heading in `docs/architecture.md`. Do not add `vercel.json` unless the implementer discovers Next 16 fails to detect the app. Do not run `vercel link`.

- Framework: Next.js. Root directory: repository root (no `src/`).
- Install: `pnpm install --frozen-lockfile`. Package manager 10.33.3.
- Build: `pnpm build`. Node 22.
- Do not run `pnpm db:migrate` or `pnpm db:seed` inside the Vercel build. Those need `DATABASE_URL` and must stay optional for CI. Run them from a trusted machine against the target database before the first real signup.
- The auth file is `proxy.ts`, not `middleware.ts`. Do not add a second middleware file.
- After the first deploy, set the Clerk webhook endpoint to `https://<host>/api/webhooks/clerk` for `user.created` and `user.deleted`.
- Leave `BILLING_ENABLED` false. Do not add Stripe env vars.
- Local object storage on Vercel is ephemeral. Say so, and say production file storage should be `STORAGE_DRIVER=s3` (R2 or AWS). Do not implement that change in this issue.
- `pnpm contract:deploy` is not part of the Vercel build. Deploy the contract separately, then set `STELLAR_CONTRACT_ID`.

## README

Under "Planes de implementación", list `docs/plans/issue-01` through `issue-12`.

Add links to `docs/architecture.md` and `docs/stellar.md`.

Add one sentence that CI is `.github/workflows/ci.yml` and does not use secrets.

Do not delete the existing setup steps.

## Files

```
.github/workflows/ci.yml
docs/architecture.md
docs/stellar.md
README.md
```

No application code unless `format:check` or a build step forces a trivial fix. If the build fails only in Actions, fix the cause in this PR. Do not disable the step.

## Acceptance

- [ ] Pull requests and pushes to `main` run lint, typecheck, format check, test, and build.
- [ ] Those steps pass with Clerk, database, Alchemy, and Stellar secrets empty.
- [ ] A separate job runs `cargo test` for `contracts/anchor` and is not allowed to fail quietly.
- [ ] `docs/architecture.md` describes the app, env vars, CI, and Vercel notes without creating a Vercel project.
- [ ] `docs/stellar.md` describes Alchemy hosts, the public testnet fallback, the hot wallet, and the Soroban contract commands.
- [ ] The secrets table says values live in `.env.local` or the host, and that they are not committed.
- [ ] README links the plans and the two new docs.

## Out of scope

- Deploying to Vercel, Neon, or Stellar.
- Branch protection settings in the GitHub UI (mention them as a manual follow-up; do not block the PR on them).
- Code coverage gates, preview deploys, or Docker.
- `pnpm contract:build` in CI.
