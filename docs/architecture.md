# Arquitectura

## Qué es

**stellar-data-integrity** calcula el SHA-256 de archivos y textos, guarda el contenido fuera de la cadena y ancla la huella en Stellar (Soroban). Cualquiera puede verificar un hash en `/verify` sin cuenta. Detalle de uso local: [README](../README.md).

## Stack

- Next.js **16.3.5** (App Router en la raíz del repo; `proxy.ts` en lugar de `middleware.ts`)
- React 19, TypeScript, Tailwind CSS v4, shadcn/ui (`base-nova`)
- Drizzle ORM + PostgreSQL (Neon u otro Postgres compatible)
- Clerk (autenticación)
- Vitest + PGlite (tests sin servidor Postgres)
- pnpm 10

## Rutas

| Ruta                               | Acceso            | Descripción              |
| ---------------------------------- | ----------------- | ------------------------ |
| `/`                                | Pública           | Landing                  |
| `/sign-in`, `/sign-up`             | Pública           | Clerk                    |
| `/verify`, `/v/[hash]`             | Pública           | Verificación             |
| `/dashboard`                       | Protegida         | Resumen y cuotas         |
| `/dashboard/documents`             | Protegida         | Lista de documentos      |
| `/dashboard/documents/new`         | Protegida         | Subida                   |
| `/dashboard/documents/[id]`        | Protegida         | Detalle, anclaje, recibo |
| `/dashboard/billing`               | Protegida         | Plan Free y límites      |
| `/dashboard/settings`              | Protegida         | Perfil Clerk             |
| `GET/POST /api/documents`          | Protegida         | Lista y upload           |
| `POST /api/documents/text`         | Protegida         | Texto                    |
| `GET/DELETE /api/documents/[id]`   | Protegida         | Detalle y borrado        |
| `GET /api/documents/[id]/download` | Protegida         | URL firmada de descarga  |
| `GET /api/storage/download`        | Pública (token)   | Redime token local/HMAC  |
| `POST /api/documents/[id]/anchor`  | Protegida         | Anclaje                  |
| `GET /api/stellar/health`          | Pública           | Salud RPC                |
| `POST /api/verify`                 | Pública           | Lookup de hash           |
| `POST /api/webhooks/clerk`         | Pública (firmada) | Provisionado de usuarios |

Fuente de verdad para rutas API públicas: `lib/auth/public-paths.ts` y `proxy.ts`.

## Auth

- Con `CLERK_SECRET_KEY`, `clerkMiddleware` protege `/dashboard` y `/api/*` excepto las rutas públicas listadas.
- Sin clave secreta de Clerk, las rutas protegidas redirigen a `/sign-in`.
- `ClerkProvider` solo se monta si existe `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.
- `provisionFreePlan` al resolver el usuario (dashboard/API) y webhook Clerk (`user.created`, `user.deleted`).

## Datos

Tablas en `db/schema.ts`:

- **plans** — límites por slug (`free`, `pro`, `enterprise`)
- **users** — usuario interno, `clerk_user_id`, `storage_used_bytes`
- **documents** — borrador / pending / anchored / failed, `sha256`, `storage_key`
- **anchors** — recibo on-chain por documento
- **usage_events** — `upload`, `anchor`, etc.
- **subscriptions** — fila activa por usuario (Stripe reservado)
- **webhook_events** — idempotencia Clerk

Borrado de documentos: `deleted_at` + liberación de bytes; el blob se elimina del almacenamiento. Modelo de amenazas: [`docs/security.md`](security.md).

## Cuotas

Límites del plan Free en `db/constants.ts` (100 MiB total, 25 MiB por archivo, 10 anclajes/mes UTC).

- **Storage:** `reserveStorage` en transacción antes de escribir el blob. Error público `QUOTA_STORAGE` (409).
- **Anclajes:** cupo mensual UTC = eventos `anchor` + documentos `pending`. Error público `QUOTA_ANCHORS` (409).

`BILLING_ENABLED` por defecto `false`. No hay Stripe ni cobros.

## Anclaje

El cliente llama `POST /api/documents/:id/anchor`. El servidor firma con `STELLAR_HOT_WALLET_SECRET`. Sin secret o `STELLAR_CONTRACT_ID` → `503 anchor_unconfigured` antes de marcar `pending`. El recibo es una fila en `anchors`.

## Verificación

`POST /api/verify` y páginas `/verify`, `/v/[hash]`. Primero base de datos, luego cadena si hay contrato y RPC. Límite **30 peticiones/minuto por IP** en memoria (por proceso Node).

## Almacenamiento

- Interfaz `StorageProvider` (`put` / `get` / `delete` / `signedUrl`). Claves `{userId}/{yyyy}/{mm}/{documentId}`; `keyBelongsToUser` en borrado y mint.
- `STORAGE_DRIVER=local` → `.data/objects`; descarga vía token HMAC en `GET /api/storage/download`.
- `STORAGE_DRIVER=s3` → R2/AWS (variables `S3_*`); presign `GetObject` ~60 s.
- Tests: adaptador en memoria. Ver también [`docs/security.md`](security.md) (modelo de amenazas).

## Entorno

Ver `.env.example` y la tabla de secretos abajo. `pnpm build` y `pnpm test` **no** requieren `DATABASE_URL` ni claves de Clerk.

## CI

GitHub Actions: `.github/workflows/ci.yml` — `lint`, `typecheck`, `format:check`, `test`, `build` sin secretos; job aparte `cargo test` del contrato Soroban.

## Despliegue en Vercel (notas)

No se crea el proyecto desde este repo. Si despliegas manualmente:

- Raíz del repo, framework Next.js, Node 22, `pnpm install --frozen-lockfile`, `pnpm build`.
- No ejecutes `pnpm db:migrate` ni `pnpm db:seed` en el build de Vercel; hazlo contra tu Postgres desde una máquina de confianza.
- Configura las mismas variables que en `.env.example` en el panel de Vercel (Preview/Production pueden diferir en `STELLAR_NETWORK` y `STELLAR_CONTRACT_ID`).
- Webhook Clerk: `https://<host>/api/webhooks/clerk`.
- En producción, el disco local de Vercel es efímero; usa `STORAGE_DRIVER=s3` para archivos.
- `BILLING_ENABLED=false` hasta integrar pagos.
- El contrato Soroban se despliega aparte (`pnpm contract:deploy`); copia `STELLAR_CONTRACT_ID` al entorno del servidor.

## Secretos

| Variable                                                       | Uso                         | Dónde                                     |
| -------------------------------------------------------------- | --------------------------- | ----------------------------------------- |
| `DATABASE_URL`                                                 | Postgres                    | `.env.local`, host                        |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`                            | UI Clerk                    | `.env.local`, host                        |
| `CLERK_SECRET_KEY`                                             | Auth servidor               | `.env.local`, host                        |
| `CLERK_WEBHOOK_SECRET` / `CLERK_WEBHOOK_SIGNING_SECRET`        | Webhook                     | `.env.local`, host                        |
| `STORAGE_DRIVER`, `STORAGE_LOCAL_DIR`                          | Blobs                       | `.env.local`, host                        |
| `S3_*`                                                         | Solo si `STORAGE_DRIVER=s3` | `.env.local`, host                        |
| `STORAGE_SIGNED_URL_TTL_SECONDS`, `STORAGE_URL_SIGNING_SECRET` | Descargas local/HMAC        | `.env.local`, host (servidor)             |
| `STELLAR_HOT_WALLET_MIN_XLM`                                   | Alerta saldo hot wallet     | `.env.local`, host                        |
| `STELLAR_NETWORK`                                              | testnet/mainnet             | `.env.local`, host                        |
| `ALCHEMY_STELLAR_API_KEY`                                      | RPC Soroban                 | `.env.local`, host (nunca `NEXT_PUBLIC_`) |
| `STELLAR_HOT_WALLET_SECRET`                                    | Firma anclajes              | `.env.local`, host                        |
| `STELLAR_CONTRACT_ID`                                          | Contrato desplegado         | `.env.local`, host                        |
| `BILLING_ENABLED`                                              | Interruptor futuro pagos    | `.env.local`, host                        |

Nunca commitees `.env.local` ni claves. CI de este repo no usa GitHub Secrets.

## Fuera de esta versión

Cobro real, Stripe, cola de trabajos aparte del request de anclaje, precios en `plans` (siguen `null`).
