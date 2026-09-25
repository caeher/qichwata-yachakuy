# stellar-data-integrity

Plataforma educativa B2C con cuentas individuales, scaffolding de aprendizaje y certificados verificables mediante SHA-256 y Stellar/Soroban. Los cursos y criterios académicos siguen sin publicarse; la política de finalización bloquea emisiones reales hasta su aprobación.

## Stack

- Next.js 16.3.5, React 19, TypeScript, Tailwind CSS v4 y shadcn/ui
- PostgreSQL con Drizzle ORM (tests y rutas legacy)
- **Convex** como base de datos en desarrollo/producción cuando `NEXT_PUBLIC_CONVEX_URL` está configurado
- Clerk para identidad y autenticación
- Stellar Soroban para comprobantes de integridad
- Vitest y PGlite para pruebas sin un servidor PostgreSQL

## Requisitos y configuración local

- Node.js `>=20.9.0` (se recomienda Node 22)
- pnpm 10

```bash
pnpm install
cp .env.example .env.local
# Ver docs/LOCAL_SETUP.md (Clerk, Convex, Alchemy, Stellar, OpenAI)
pnpm convex:dev   # terminal aparte
pnpm convex:seed
pnpm dev
```

La cuenta se provisiona al entrar por primera vez o recibir `user.created` de Clerk. No hace falta ejecutar un seed para registrar o iniciar sesión; `pnpm db:seed` carga el catálogo inicial como borradores y no publica cursos. Configura `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `DATABASE_URL` y el secreto de firma del webhook para un entorno completo. Sin credenciales externas, `pnpm build` y `pnpm test` usan sus rutas de respaldo y fakes.

El tutor de quechua sigue apagado hasta una evaluación lingüística controlada. Revisa [configuración y evaluación del tutor](docs/coach.md) antes de configurar `OPENAI_COACH_ENABLED=true`.

El webhook de Clerk vive en `/api/webhooks/clerk` y debe validar `user.created` y `user.deleted`. Los reintentos conservan un solo usuario interno y sincronizan el correo. El identificador interno y el ID de Clerk se mantienen al eliminar la cuenta; el contenido de Stellar permanece verificable.

## Funciones actuales

- `/sign-up` y `/sign-in` conservan la identidad individual de Clerk.
- `/verify` y `/v/<hash>` permiten comprobar huellas de forma pública.
- `/dashboard/learn` permite consultar cursos publicados, inscribirse y persistir avance. No hay cursos publicados por defecto.
- `/dashboard/certificates` muestra emisiones del usuario; `/certificates/[publicId]` verifica públicamente la evidencia.
- No se cargan ni guardan archivos o textos arbitrarios. `/api/documents*` y las rutas de descarga responden `410 resource_retired`.
- `/verify`, `POST /api/verify` y `/v/<hash>` verifican certificados y conservan la consulta histórica de documentos. No calculan hashes desde archivos o textos.
- Los límites por IP, la protección de rutas y las comprobaciones de configuración de la hot wallet son controles técnicos, no funciones de un plan.

PostgreSQL conserva usuarios, progreso educativo, snapshots canónicos y comprobantes Stellar históricos. La aplicación no requiere disco persistente, bucket, URL firmada ni PDFs. Stellar usa `STELLAR_NETWORK`, `STELLAR_CONTRACT_ID`, `STELLAR_HOT_WALLET_SECRET` y, opcionalmente, `ALCHEMY_STELLAR_API_KEY`. Para operar el procesador programado se configura `CERTIFICATE_WORKER_TOKEN`.

## Comandos

| Comando                | Descripción                                        |
| ---------------------- | -------------------------------------------------- |
| `pnpm dev`             | Servidor local                                     |
| `pnpm build`           | Build de producción sin credenciales externas      |
| `pnpm test`            | Vitest con PGlite en memoria                       |
| `pnpm lint`            | ESLint                                             |
| `pnpm typecheck`       | TypeScript                                         |
| `pnpm db:migrate`      | Aplicar migraciones a `DATABASE_URL`               |
| `pnpm db:seed`         | Cargar catálogo educativo inicial como borradores   |
| `pnpm contract:test`   | Tests del contrato Soroban                         |
| `pnpm contract:build`  | Compilar el contrato Soroban                       |
| `pnpm contract:deploy` | Desplegar el contrato Soroban                      |

`pnpm build` y `pnpm test` no requieren Clerk, PostgreSQL, Alchemy ni claves de la hot wallet.

## Migraciones y conservación histórica

Las migraciones nuevas eliminan columnas de almacenamiento y añaden cursos, progreso, finalizaciones, certificados y vínculos de anclaje. Los comprobantes históricos continúan asociados a documentos; no se renombran ni recalculan.

La migración copia la relación de cada objeto existente a `legacy_object_inventory` antes de quitar las columnas de almacenamiento. Antes de una limpieza física futura, respalda/exporta esa tabla y los comprobantes históricos, registra fuera de la aplicación el proveedor y bucket de origen, y define una política de conservación. Ninguna migración borra buckets ni archivos locales. Un rollback de esquema no recuperaría blobs eliminados manualmente. No recrees cuentas Clerk ni conviertas registros históricos en matrículas o certificados.

## Documentación

- [`docs/architecture.md`](docs/architecture.md): arquitectura vigente y orden de migración
- [`docs/stellar.md`](docs/stellar.md): RPC y contrato Soroban
- [`docs/security.md`](docs/security.md): controles y modelo de amenazas
- [`docs/certificates.md`](docs/certificates.md): hash canónico, estados, recuperación y privacidad
- [`docs/yachay-migration-closeout.md`](docs/yachay-migration-closeout.md): estado de integración, validación y pendientes de cierre
- [`docs/plans/README.md`](docs/plans/README.md): planes anteriores conservados como referencia histórica

La integración de cobros, Stripe, suscripciones, planes comerciales y upselling no forma parte del producto.
