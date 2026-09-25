# Matriz estática: Convex vs Drizzle

Criterio: con `NEXT_PUBLIC_CONVEX_URL` definida, las operaciones de producto deben bifurcar a Convex antes de tocar `getDb()` / `legacyDb()`.

Revisado contra el código en la raíz del repositorio.

## Cubierto en Convex (bifurcación + función)

| Operación | Función Convex | Llamador | Prueba |
| --- | --- | --- | --- |
| Aprovisionar usuario (sesión) | `users.resolveAppUser` | `lib/auth/resolve-app-user.ts` | `convex/education.convex.test.ts` |
| Webhook Clerk (create/delete) | `users.provisionFromWebhook`, `deleteFromWebhook`, `recordWebhookEvent` | `lib/auth/clerk-webhook.ts` | Manual / staging |
| Catálogo autenticado | `education.listCatalog` | `app/dashboard/learn/page.tsx` | `convex/education.convex.test.ts` |
| Detalle de curso | `education.getCourseDetail` | `app/dashboard/learn/[courseId]/page.tsx` | `convex/education.convex.test.ts` |
| Inscripción | `education.enroll` | `lib/education/service.ts` → API enrollments | `convex/education.convex.test.ts` |
| Completar unidad | `education.completeUnit` | `lib/education/service.ts` → API units | `convex/education.convex.test.ts` |
| Finalizar / certificado | `education.finalizeEnrollment` | `lib/education/service.ts` | `convex/education.convex.test.ts` |
| Resumen aprendizaje | `learningSummary.loadLearningSummary` | `lib/dashboard/learning-summary.ts` | Parcial (Convex test) |
| Listar certificados | `certificates.listForUser` | `app/dashboard/certificates/page.tsx` | `convex/education.convex.test.ts` |
| Verificar por publicId | `certificates.getByPublicId` | `app/api/verify/route.ts`, `lib/certificates/verify.ts` | `convex/education.convex.test.ts` |
| Verificar por sha256 (doc) | `verify.lookupDocumentAnchor` | `lib/verify/lookup.ts`, `app/v/[hash]/page.tsx` | Drizzle: `lib/verify/lookup.test.ts` |
| Certificado por hash | `certificates.getBySha256` | `lib/certificates/verify.ts` | `convex/education.convex.test.ts` |
| Ancla de certificado | `certificates.getAnchorForCertificate` | `lib/certificates/verify.ts` | Convex test (vacío) |
| Contexto tutor | `education.getCoachContext` | `app/api/coach/route.ts` | Drizzle: `app/api/coach/route.test.ts` |
| Semilla catálogo | `seed.seedDraftCatalog` | `pnpm convex:seed` | `convex/education.convex.test.ts` |
| Worker cert. pendientes | `certificates.listPendingForWorker` | `app/api/jobs/certificates/route.ts` | Sin procesar anclas en Convex |

## Huecos (solo Drizzle o sin equivalente Convex)

| Dominio | Código legacy | Notas |
| --- | --- | --- |
| Documentos (CRUD, anclaje) | `app/api/documents/**`, `lib/anchors/job.ts` | Sin mutaciones Convex de producto |
| Cuota de anclajes | `db/anchor-quota.ts` | Tabla `usageEvents` / `plans` sin API Convex |
| Auditoría genérica | `lib/audit/record.ts` | Solo insert educativo en `finalizeEnrollment` |
| Borrado de cuenta (GDPR) | `lib/privacy/erase-user.ts` | Webhook Convex solo `deletedAt` + email null |
| Job anclaje certificados | `lib/certificates/anchor-job.ts` | Ruta jobs devuelve `processed: 0` con Convex |
| Semilla Postgres | `db/seed.ts`, `pnpm db:seed` | No usar en despliegue Convex |

## Rutas que importan Drizzle pero bifurcan antes de uso

Con Convex activo, `legacyDb()` y `getDb()` lanzan o no se alcanzan si la bifurcación es correcta:

- `app/api/education/enrollments/**` → `enrollInCourse(legacyDb())` — OK vía `lib/education/service.ts`
- `app/api/verify/route.ts` — bifurca antes de `legacyDb()` para certificados
- `app/dashboard/learn/page.tsx` — bifurca antes de `getDb()`
- `app/dashboard/certificates/page.tsx` — bifurca antes de `legacyDb()`
- `app/api/coach/route.ts` — bifurca contexto; fallback Drizzle solo sin Convex

## Riesgo: llamadas sin bifurcación previa

| Archivo | Riesgo |
| --- | --- |
| `app/certificates/[publicId]/page.tsx` | Llama `legacyDb()` sin comprobar `convexConfigured()` primero en la ruta de lectura |
| `app/api/verify/route.ts` | Asigna `legacyDb()` antes del branch Convex para ramas legacy |

Estos archivos deben fallar en recorrido Convex-only si ejecutan la rama Drizzle; la prueba `lib/convex/convex-only-paths.test.ts` documenta el contrato esperado.
