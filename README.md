# stellar-data-integrity

SaaS de integridad de datos: SHA-256 de archivos, textos y documentos anclado en Stellar (Soroban).

Stack actual: Next.js 16.3.5, TypeScript, Tailwind CSS v4, shadcn/ui, Drizzle ORM + PostgreSQL, Clerk para autenticación, almacenamiento local de objetos (S3 opcional).

## Requisitos

- Node.js `>=20.9.0` (se recomienda Node 22)
- [pnpm](https://pnpm.io/) 10

## Configuración local

```bash
pnpm install
cp .env.example .env.local
```

Opcional para desarrollo completo:

- **Clerk:** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` y `CLERK_SECRET_KEY` en `.env.local` (sin ellas, la app compila y la landing funciona; `/dashboard` redirige a `/sign-in`).
- **Base de datos:** `DATABASE_URL` (Postgres local o Neon). Sin URL, `pnpm build` y `pnpm test` siguen funcionando; las rutas API que usan DB responden 503.
- **Webhook Clerk:** `CLERK_WEBHOOK_SIGNING_SECRET` (o `CLERK_WEBHOOK_SECRET`) y endpoint `https://<tu-host>/api/webhooks/clerk` con eventos `user.created` y `user.deleted`. El panel también provisiona el plan Gratis al entrar al dashboard.

Migrar y sembrar planes (solo con `DATABASE_URL`):

```bash
pnpm db:migrate
pnpm db:seed
```

```bash
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Almacenamiento y límites (plan Gratis)

- `STORAGE_DRIVER=local` (por defecto) guarda blobs en `STORAGE_LOCAL_DIR` (`.data/objects`).
- Tests usan almacenamiento en memoria; **no** hace falta S3 en CI.
- Con `STORAGE_DRIVER=s3`, rellena las variables `S3_*` en `.env.local`.
- Plan Gratis: **100 MiB** de almacenamiento total, **25 MiB** por archivo, **10** anclajes/mes (cuota en servidor; anclajes exitosos + documentos `pending` en el mes UTC).

## Stellar (RPC, anclaje, contrato)

- `@stellar/stellar-sdk@17.1.0`. RPC: Alchemy (`ALCHEMY_STELLAR_API_KEY`) o `https://soroban-testnet.stellar.org` en testnet.
- Salud pública: `GET /api/stellar/health` (la clave de API no aparece en JSON ni logs).
- Anclaje Soroban: `STELLAR_HOT_WALLET_SECRET`, `STELLAR_CONTRACT_ID`, `STELLAR_NETWORK`. Sin ellas, `POST /api/documents/:id/anchor` responde **503** `anchor_unconfigured`.
- Contrato Rust en `contracts/anchor/` (`soroban-sdk` 28). Tests: `pnpm contract:test` (requiere Rust reciente, p. ej. stable ≥ 1.98). Build WASM: `pnpm contract:build`. Despliegue: `pnpm contract:deploy`.
- `pnpm build` y `pnpm test` pasan sin Alchemy, hot wallet ni `CONTRACT_ID` (clientes perezosos y fakes en Vitest).

## Verificación pública

- [`/verify`](http://localhost:3000/verify) y enlaces compartibles `/v/<64 hex>` (sin cuenta Clerk).
- `POST /api/verify` con archivo, texto o hash; límite **30 peticiones/minuto por IP** (memoria por proceso Node).
- Sin `STELLAR_CONTRACT_ID`, la respuesta puede salir solo de la base de datos; los tests no llaman a RPC.

## Scripts

| Comando                | Descripción                                   |
| ---------------------- | --------------------------------------------- |
| `pnpm dev`             | Servidor de desarrollo                        |
| `pnpm build`           | Build de producción (sin credenciales)        |
| `pnpm start`           | Sirve el build                                |
| `pnpm test`            | Vitest (PGlite en memoria)                    |
| `pnpm contract:test`   | Tests del contrato Soroban (Rust)             |
| `pnpm contract:build`  | Compilar WASM del contrato                    |
| `pnpm contract:deploy` | Desplegar contrato (CLI Stellar v28)          |
| `pnpm db:generate`     | Generar migraciones Drizzle                   |
| `pnpm db:migrate`      | Aplicar migraciones (requiere `DATABASE_URL`) |
| `pnpm db:seed`         | Sembrar planes Free/Pro/Enterprise            |
| `pnpm lint`            | ESLint                                        |
| `pnpm typecheck`       | `tsc --noEmit`                                |
| `pnpm format`          | Prettier (escribe)                            |
| `pnpm format:check`    | Prettier (solo comprueba)                     |

`next` está fijado en **16.3.5**. No actualices a `latest` sin acordarlo en el proyecto.

## Auth (Clerk)

- Inicio de sesión y registro en `/sign-in` y `/sign-up`.
- Rutas protegidas: `/dashboard` y `/api/*` excepto `/api/webhooks/clerk`, `/api/stellar/health` y `/api/verify`. `/verify` y `/v/*` son públicas.
- Proxy en `proxy.ts` con `clerkMiddleware()` cuando hay `CLERK_SECRET_KEY`.
- `ClerkProvider` solo se monta si existe `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (build sin claves).
- Cierre de sesión redirige a `/` (`afterSignOutUrl` en `ClerkProvider`).

CI y `pnpm build` **no** requieren claves de Clerk ni base de datos.

`BILLING_ENABLED` queda en `false` por defecto; no hay integración con Stripe ni cobros reales.

## Documentación

- [`docs/architecture.md`](docs/architecture.md) — rutas, datos, cuotas, CI y notas de Vercel
- [`docs/stellar.md`](docs/stellar.md) — Alchemy, RPC y contrato Soroban

CI: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) (sin secretos en GitHub Actions).

## Planes de implementación

- [`docs/plans/issue-01-scaffold.md`](docs/plans/issue-01-scaffold.md)
- [`docs/plans/issue-02-clerk-auth.md`](docs/plans/issue-02-clerk-auth.md)
- [`docs/plans/issue-03-data-model.md`](docs/plans/issue-03-data-model.md)
- [`docs/plans/issue-04-upload-sha256.md`](docs/plans/issue-04-upload-sha256.md)
- [`docs/plans/issue-05-stellar-rpc.md`](docs/plans/issue-05-stellar-rpc.md)
- [`docs/plans/issue-06-soroban-contract.md`](docs/plans/issue-06-soroban-contract.md)
- [`docs/plans/issue-07-anchor-job.md`](docs/plans/issue-07-anchor-job.md)
- [`docs/plans/issue-08-public-verify.md`](docs/plans/issue-08-public-verify.md)
- [`docs/plans/issue-09-dashboard-ui.md`](docs/plans/issue-09-dashboard-ui.md)
- [`docs/plans/issue-10-billing-quotas.md`](docs/plans/issue-10-billing-quotas.md)
- [`docs/plans/issue-11-landing.md`](docs/plans/issue-11-landing.md)
- [`docs/plans/issue-12-ci-docs.md`](docs/plans/issue-12-ci-docs.md)
