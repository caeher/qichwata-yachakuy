# Paridad de esquema Convex / Drizzle

## Tablas presentes en ambos

| Tabla Convex | Tabla Postgres | Paridad de campos |
| --- | --- | --- |
| `plans` | `plans` | Sí (`monthlyAnchorsIncluded`) |
| `users` | `users` | Sí; timestamps Convex en ms |
| `courses` | `courses` | Sí; mismos enums de status/accent/level |
| `courseUnits` | `course_units` | Sí |
| `enrollments` | `enrollments` | Sí |
| `unitProgress` | `unit_progress` | Sí |
| `courseCompletions` | `course_completions` | Sí |
| `certificates` | `certificates` | Sí; `publicId` string en Convex vs uuid en PG |
| `documents` | `documents` | Esquema sí; sin API de producto Convex |
| `anchors` | `anchors` | Esquema sí; worker cert. no escribe en Convex |
| `auditEvents` | `audit_events` | Parcial (solo emisión cert. en Convex) |
| `usageEvents` | `usage_events` | Esquema sí; sin API Convex |
| `webhookEvents` | `webhook_events` | Sí (`externalId` vs `id` PK) |
| `legacyObjectInventory` | `legacy_object_inventory` | Sí |

## Unicidad: Postgres `uniqueIndex` vs Convex `.index()`

| Restricción | Postgres | Convex handler |
| --- | --- | --- |
| Usuario por Clerk | `users_clerk_user_id_uidx` | `by_clerk_user_id` + `.unique()` en queries |
| Curso slug+versión | `courses_slug_version_uidx` | `by_slug_version` + seed upsert |
| Matrícula usuario+curso+versión | `enrollments_user_course_version_uidx` | `education.enroll` consulta `.unique()` antes de insert |
| Progreso matrícula+unidad | `unit_progress_enrollment_unit_uidx` | `completeUnit` idempotente con `.unique()` |
| Completación por matrícula | `course_completions_enrollment_uidx` | `finalizeEnrollment` consulta `by_enrollment` |
| Certificado `publicId` | `certificates_public_id_uidx` | `by_public_id` en queries |
| Certificado `sha256` | `certificates_sha256_uidx` | `by_sha256` |
| Certificado por completion | `certificates_completion_uidx` | `by_completion` |
| Webhook idempotente | `webhook_events.id` PK | `recordWebhookEvent` con `by_external_id` |

Convex no impone unicidad a nivel de motor en todos los índices; la verificación exige que los handlers de escritura mantengan el mismo contrato que las restricciones Postgres.

## Prueba automática

`lib/convex/schema-parity.test.ts` comprueba que el conjunto de tablas del esquema Convex coincide con el esperado para migración Yachay y que los slugs sembrados existen tras `seedDraftCatalog`.
