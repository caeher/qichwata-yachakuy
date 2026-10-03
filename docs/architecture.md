# Arquitectura

## Producto

Plataforma educativa B2C para personas, con cuentas individuales y una dirección de producto centrada en aprendizaje y certificados verificables. Clerk sigue siendo la fuente de identidad. La experiencia educativa y la emisión de certificados se completarán en issues posteriores; mientras tanto, la consulta pública por hash y los comprobantes históricos de documentos/anclajes siguen disponibles.

## Stack

- Next.js 16.3.5, App Router, `proxy.ts` y React 19
- TypeScript, Tailwind CSS v4 y shadcn/ui
- PostgreSQL con Drizzle ORM
- Clerk para autenticación
- Stellar Soroban para comprobantes de integridad
- Vitest y PGlite para pruebas sin PostgreSQL externo

## Rutas

| Ruta                          | Acceso            | Descripción                                      |
| ----------------------------- | ----------------- | ------------------------------------------------ |
| `/`                           | Pública           | Presentación educativa B2C                       |
| `/sign-in`, `/sign-up`        | Pública           | Identidad Clerk                                  |
| `/verify`, `/v/[hash]`        | Pública           | Verificación de certificados y hashes históricos |
| `/certificates/[publicId]`    | Pública           | Vista y verificación del certificado             |
| `/dashboard`                  | Protegida         | Espacio personal                                 |
| `/dashboard/learn*`           | Protegida         | Catálogo, inscripción y avance                   |
| `/dashboard/certificates`     | Protegida         | Certificados del alumno                          |
| `/dashboard/documents*`       | Protegida         | Redirección de compatibilidad a `/dashboard`     |
| `/dashboard/billing`          | Protegida         | Redirige a `/dashboard` por compatibilidad       |
| `/dashboard/settings`         | Protegida         | Perfil de Clerk                                  |
| `POST /api/webhooks/clerk`    | Pública (firmada) | Provisionado y borrado de cuentas                |
| `POST /api/verify`            | Pública           | Consulta de hash                                 |
| `/api/education/*`            | Protegida         | Inscripción, avance y solicitud de finalización  |
| `POST /api/jobs/certificates` | Token de worker   | Procesamiento y reconciliación programada        |
| `/api/documents*` y descargas | Retiradas         | Respuesta explícita `410 resource_retired`       |

Las rutas protegidas se declaran en `lib/auth/public-paths.ts` y `proxy.ts`. Los endpoints internos mantienen controles de propietario. El webhook verifica la firma de Clerk antes de procesar eventos y registra IDs de evento para evitar duplicados.

## Identidad y provisionado

Cada persona conserva una fila en `users` con UUID interno único y `clerk_user_id` único. `provisionUser` no requiere planes ni suscripciones, sincroniza el correo y usa la unicidad del ID de Clerk para resolver altas simultáneas y reintentos. Resolver una sesión vuelve a usar el mismo provisionado idempotente.

El borrado de cuenta mantiene la fila y sus IDs, limpia el correo y elimina datos personales de acuerdo con el flujo de privacidad. No actualiza suscripciones. Los IDs de usuario permanecen vinculados a los registros históricos y no se recrean para simular matrículas.

## Datos y transición de esquema

Las tablas incluyen `users`, `courses`, `course_units`, `enrollments`, `unit_progress`, `course_completions`, `certificates`, documentos históricos y `anchors`. Cada anclaje nuevo referencia exactamente un certificado o un documento histórico. PostgreSQL conserva SHA-256 y evidencia de transacción; no convierte ni recalcula los anclajes anteriores.

Los planes y la referencia opcional desde `users` permanecen temporalmente solo donde el flujo de anclaje heredado los consulta. No representan una oferta comercial. La issue 04 retira las dependencias de anclaje pendientes.

No se reescriben migraciones históricas. Antes del retiro final en un entorno con datos, se inventarían y respaldarán usuarios, planes y relaciones; se validarán conteos e identidades tras migrar. Los registros comerciales no se convierten en matrículas.

## Controles técnicos

La protección por sesión, los límites de consulta por IP, la verificación de firmas de webhook y las comprobaciones de configuración de la hot wallet siguen activos. No hay formularios ni endpoints que reciban archivos o texto arbitrario, ni límites de carga o cuotas de bytes.

Los límites heredados de anclaje permanecen hasta que la issue 04 retire el anclaje manual y la cuota asociada. No hay límites ni medidores de almacenamiento.

## Stellar y verificación

El servidor firma anclajes con `STELLAR_HOT_WALLET_SECRET`. La emisión educativa es independiente de la disponibilidad de Stellar: el certificado queda `pending` para que un worker programado lo procese. Sin configuración de cadena nunca se marca como confirmado. La verificación pública recalcula el snapshot canónico y consulta red/contrato; una fila de DB sola no se presenta como confirmación on-chain.

Los cursos comienzan en borrador y no hay contenido real precargado. `pendingCompletionPolicy` bloquea las finalizaciones productivas hasta que se aprueben reglas académicas. Los tests inyectan una política controlada.

## Entorno y CI

`pnpm build`, `pnpm test`, `pnpm lint` y `pnpm typecheck` no requieren credenciales Clerk o Stellar ni `DATABASE_URL`. Las variables vigentes se documentan en `.env.example`. No hay configuración de facturación.

El despliegue se configura manualmente. Solo PostgreSQL requiere persistencia para identidad y pruebas históricas; no se requiere disco persistente, bucket de objetos, URL firmada ni almacenamiento de PDF. Las migraciones se ejecutan contra PostgreSQL desde un entorno controlado, no durante el build. El contrato Soroban se despliega por separado.

Antes de limpiar objetos existentes, exporta y respalda `legacy_object_inventory`, `documents` y `anchors`; guarda también el proveedor/bucket de origen y define la política de conservación. La migración deja claves y relaciones consultables en `legacy_object_inventory`. Ningún despliegue o migración elimina objetos automáticamente. Revertir el esquema no restaura blobs borrados físicamente.

## Documentación histórica

Los documentos originales de `docs/plans/` describen una versión anterior orientada a almacenamiento y SaaS. Se conservan como registro histórico y no representan el producto actual. La secuencia vigente de transición está en `issues/01-transicion-b2c-eliminar-saas.md` y sus issues dependientes.
