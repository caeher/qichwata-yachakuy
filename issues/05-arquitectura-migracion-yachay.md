# Issue 05 — Definir la migración de Yachay a la aplicación raíz

Prioridad: alta. Dependencias: ninguna nueva; parte de la base educativa existente y de las issues [03](03-scaffolding-educativo-b2c.md) y [04](04-certificados-integridad-stellar.md).

## Objetivo

Integrar las funcionalidades de `quechua-convex` en la aplicación raíz, conservando la identidad visual Yachay y reutilizando Next.js App Router, Clerk, PostgreSQL/Drizzle y los servicios educativos y Stellar existentes.

## Evidencia y alcance

El origen utiliza Pages Router, dos componentes extensos, progreso en Convex y un tutor mediante AI Gateway. La raíz ya dispone de inscripción, progreso por unidad, finalización, certificados y verificación. La propuesta es adaptar las capacidades del origen a esa infraestructura, sin introducir una segunda fuente de datos activa.

| Capacidad del origen | Destino propuesto | Issue |
| --- | --- | --- |
| Tokens, tipografía y componentes | `app/globals.css`, `components/ui`, componentes de dominio | [06](06-design-system-yachay.md) |
| Landing, Clerk y `/aprender` | `/`, acceso existente y `/dashboard` | [07](07-landing-acceso-navegacion.md) |
| Tres módulos y nueve lecciones | Catálogo en PostgreSQL y contenido versionado | [08](08-catalogo-contenido-inicial.md) |
| Completar lecciones | `/dashboard/learn/[courseId]` y servicios educativos | [09](09-lecciones-practica-progreso.md) |
| Inicio y progreso | `/dashboard`, `/dashboard/progress` | [10](10-panel-progreso-real.md) |
| Tutor `/api/coach` | `/dashboard/practice`, Route Handler y OpenAI | [11](11-tutor-openai.md) |
| Certificados y `/verificar` | Certificados y verificación existentes | [12](12-certificados-diseno-verificacion.md) |
| Cierre de migración | Validación conjunta y documentación | [13](13-integracion-validacion-migracion.md) |

## Mapa de destino

Este mapa fija las equivalencias para implementar las issues siguientes. Los IDs UUID de PostgreSQL son internos y no sustituyen los slugs/IDs legibles del origen. La equivalencia estable se conserva en el slug del curso y en metadatos de procedencia del contenido de cada unidad.

| Origen Yachay | Destino canónico raíz | Regla de equivalencia |
| --- | --- | --- |
| `pages/index.tsx`, `components/yachay-landing.tsx` | `/` | Landing pública; las cifras y muestras de progreso son ilustrativas. |
| Clerk en `_app.tsx`, `pages/sign-in`, `pages/sign-up` | `/sign-in`, `/sign-up`, `proxy.ts`, `app/dashboard/layout.tsx` | Una sesión Clerk; aprovisionamiento local por `users.clerk_user_id`. |
| `/aprender` | `/dashboard` | Alias de compatibilidad hacia el inicio autenticado. El catálogo permanece en `/dashboard/learn`. |
| `learning:DEFAULT_LEARNING_MODULES[].slug` | `courses.slug` | Conservar exactamente `saludos-y-presencia`, `familia-y-comunidad` y `territorio-y-tiempo`; crear cada curso con una versión explícita. |
| `lessons[].id` | `course_units.content.source.lessonId` | Conservar `hola`, `presentarse`, `practica-01`, `familia`, `mi-comunidad`, `practica-02`, `lugares`, `tiempo` y `practica-03`. El ID UUID de `course_units` se obtiene por curso/versión y clave de origen, nunca por posición solamente. |
| `learning:progress.userId` | `users.clerk_user_id` → `users.id` → `enrollments` → `unit_progress` | El `identity.subject` de Clerk se coteja exactamente con `clerk_user_id`; los IDs locales no se infieren del email. |
| `completedLessonIds[]` | Una fila `unit_progress` por unidad reconocida | Deduplicar dentro del arreglo; ignorar como progreso importable, pero reportar, cada ID desconocido. La importación conserva avance histórico y no crea `course_completions` ni certificados. |
| `learning:certificates.identifier` (`YCH-...`) | Registro legado de referencia; sin equivalencia automática a `certificates.public_id` | No insertar en `certificates`, `course_completions` ni `anchors`. Mantener el identificador para consulta informativa y etiquetarlo como no verificado. |
| `/verificar` | `/verify` | Redirección de compatibilidad sin bucle; preservar la consulta URL. Los hashes/UUID raíz siguen la verificación normal; un `YCH-...` legado se identifica como registro legado sin evidencia de anclaje. |
| `/api/coach` | Futuro Route Handler de `/api/coach` | Reimplementar en servidor con OpenAI; no reutilizar AI Gateway, `context` ni mensajes del cliente como fuente autorizada. |

Las claves `course_units.content.source` deben incluir `system: "yachay-convex"`, `moduleSlug` y `lessonId`, además de la versión del contrato de contenido. La posición ordena la presentación, pero no identifica una lección. Una vez publicado un curso, su versión y esas claves no se reutilizan para contenido distinto.

### Contrato y límites

- **Presentación:** recibe DTOs de cursos, unidades, progreso, tutor y certificados, más callbacks/eventos de interfaz. Los componentes no importan Clerk, Drizzle, Convex ni clientes de IA, y no deciden propiedad, elegibilidad o estado verificado.
- **Servicios de dominio:** `lib/education/service.ts` resuelve catálogo, inscripción, propiedad, avance y política de finalización. Los servicios de certificados consumen finalizaciones persistidas y son la única vía hacia la emisión Stellar. Las rutas obtienen la identidad con el servicio de sesión raíz y pasan el `users.id` local.
- **Persistencia:** PostgreSQL/Drizzle de la raíz es la fuente activa única. Convex queda solo como fuente de lectura para inventario/exportación durante la migración; no se mantiene escritura dual ni fallback de lectura en producción.
- **Contenido:** catálogo versionado en PostgreSQL; cada contenido declara estado de revisión, fuentes/licencia, variedad regional y procedencia. Los títulos y descripciones del prototipo, por sí solos, no prueban que una lección esté desarrollada o validada.
- **Funciones:** marcar una lección completa en el prototipo es una demostración de interacción y no una evaluación. Las rachas, palabras vistas y certificados de muestra son demostraciones. La emisión productiva requiere una política académica aprobada y `course_completions` elegible; la llamada `issueCertificate` de Convex no satisface ese requisito.

### Inventario y política de importación Convex

El repositorio contiene el esquema, funciones y contenido predeterminado de Convex, pero no contiene exportación de datos ni identifica un deployment; tampoco hay evidencia versionada que permita afirmar que la base remota está vacía. Por tanto, el resultado del inventario remoto queda **pendiente**, no se considera “sin datos”. La issue 13 debe adjuntar evidencia de exportación/listado del deployment antes de decidir entre importar o registrar ausencia. No copiar secretos ni exportaciones con datos personales al repositorio.

Si el inventario confirma datos, ejecutar primero un export inmutable con fecha, recuentos y checksum en un entorno protegido. La importación tendrá modo `dry-run`, modo aplicar y reporte conciliable, y se ensayará contra una copia de PostgreSQL. Clave de repetición para progreso: usuario Clerk + slug de módulo + versión de curso + ID de lección. Para certificados heredados: ID Convex original; son referencias informativas, no certificados raíz. Registrar conteos de origen, creados, ya existentes, omitidos y errores, con categorías para usuarios sin match, módulo/unidad desconocidos, duplicados y certificados heredados.

Resolver usuarios solo por coincidencia exacta de Clerk ID. Si no existe fila local, consultar que esa identidad siga siendo válida en Clerk y aprovisionarla mediante el flujo existente; si fue eliminada/no se puede resolver, poner sus datos en el reporte de cuarentena protegido y no crear progreso huérfano. No emparejar por correo. Detectar claves duplicadas de progreso y certificados antes de aplicar; deduplicar únicamente progreso equivalente y no escoger arbitrariamente entre certificados en conflicto. En importaciones parciales, una repetición debe completar los faltantes sin duplicar inscripciones, unidades ni filas del reporte de referencia.

Los `updatedAt` de Convex son milisegundos Unix y aplican al agregado completo, no a cada lección. Si se usan como `unit_progress.completed_at`, documentar que son aproximaciones del momento del snapshot, no fechas individuales de finalización. Los datos importados preservan historial de avance, pero no pueden crear una finalización elegible ni disparar anclajes.

No iniciar importación productiva hasta conciliar el ensayo, resolver referencias desconocidas y acordar corte de escrituras/rollback. La issue 13 documenta el punto de cambio de fuente. Tras el corte, Convex deja de aceptar mutaciones de aprendizaje; la raíz queda como única fuente.

## Trabajo propuesto

1. Implementar el mapa y los límites de contrato anteriores; mantener Clerk y PostgreSQL/Drizzle raíz como sesión y persistencia únicas.
2. Crear `/aprender` → `/dashboard` y `/verificar` → `/verify` como compatibilidad unidireccional. Mantener `/dashboard/learn` como catálogo y resolver IDs `YCH-...` con el estado de legado no verificado.
3. Crear cursos por slug/version y enlazar las nueve unidades mediante `content.source`; reutilizar `course_completions` como frontera única de certificado por curso/versión.
4. Completar inventario remoto de Convex y ejecutar el protocolo anterior solo si hay registros. Si se confirma que no hay datos, incluir export/listado y fecha como evidencia y migrar únicamente contenido aprobado.
5. No importar certificados Convex como certificados elegibles ni cambiar su clasificación sin evidencia independiente de identidad, finalización y anclaje.
6. Antes de cualquier implementación Next.js, consultar la guía local de la versión instalada en `node_modules/next/dist/docs/`; adaptar Pages Router a App Router y sus convenciones vigentes.

## Criterios de aceptación

- [ ] Existe un mapa de rutas, componentes, entidades y equivalencias de IDs, con slugs fuente conservados y UUIDs raíz tratados como internos.
- [ ] La raíz funciona con una única sesión y una única fuente persistente de progreso.
- [ ] Está documentado el protocolo de inventario/importación, incluidos duplicados, usuarios sin correspondencia y certificados heredados; el inventario remoto tiene evidencia adjunta o queda explícitamente bloqueado como pendiente.
- [ ] Se distinguen funciones reales, demostraciones y contenido pendiente de revisión.
- [ ] Las issues 06–13 tienen un alcance ejecutable sobre el código existente.

## Validación prevista

Revisar la matriz contra `quechua-convex/convex/learning.ts`, `quechua-convex/convex/schema.ts`, `quechua-convex/lib/domain/learning.ts`, `db/schema.ts`, `lib/education/service.ts`, `lib/auth/provision-user.ts` y las rutas de ambas aplicaciones. Verificar las redirecciones con y sin sesión, identificadores UUID y `YCH-...`, consulta preservada y ausencia de ciclos. Si hay importación, demostrar recuentos, reporte de referencias desconocidas, idempotencia y repetibilidad en una copia de datos antes del cambio de fuente. La consulta de guías Next locales es requisito de las issues que implementen rutas o componentes.
