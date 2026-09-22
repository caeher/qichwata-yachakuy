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
- Plan Gratis: **100 MiB** de almacenamiento total, **25 MiB** por archivo, **10** anclajes/mes (anclaje en Stellar aún no implementado).

## Scripts

| Comando             | Descripción                                   |
| ------------------- | --------------------------------------------- |
| `pnpm dev`          | Servidor de desarrollo                        |
| `pnpm build`        | Build de producción (sin credenciales)        |
| `pnpm start`        | Sirve el build                                |
| `pnpm test`         | Vitest (PGlite en memoria)                    |
| `pnpm db:generate`  | Generar migraciones Drizzle                   |
| `pnpm db:migrate`   | Aplicar migraciones (requiere `DATABASE_URL`) |
| `pnpm db:seed`      | Sembrar planes Free/Pro/Enterprise            |
| `pnpm lint`         | ESLint                                        |
| `pnpm typecheck`    | `tsc --noEmit`                                |
| `pnpm format`       | Prettier (escribe)                            |
| `pnpm format:check` | Prettier (solo comprueba)                     |

`next` está fijado en **16.3.5**. No actualices a `latest` sin acordarlo en el proyecto.

## Auth (Clerk)

- Inicio de sesión y registro en `/sign-in` y `/sign-up`.
- Rutas protegidas: `/dashboard` y `/api/*` excepto `/api/webhooks/clerk`.
- Proxy en `proxy.ts` con `clerkMiddleware()` cuando hay `CLERK_SECRET_KEY`.
- `ClerkProvider` solo se monta si existe `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (build sin claves).
- Cierre de sesión redirige a `/` (`afterSignOutUrl` en `ClerkProvider`).

CI y `pnpm build` **no** requieren claves de Clerk ni base de datos.

## Planes de implementación

- [`docs/plans/issue-01-scaffold.md`](docs/plans/issue-01-scaffold.md)
- [`docs/plans/issue-02-clerk-auth.md`](docs/plans/issue-02-clerk-auth.md)
- [`docs/plans/issue-03-data-model.md`](docs/plans/issue-03-data-model.md)
- [`docs/plans/issue-04-upload-sha256.md`](docs/plans/issue-04-upload-sha256.md)
