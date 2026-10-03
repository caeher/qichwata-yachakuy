# Issue 08 — Incorporar el catálogo inicial y contenido educativo versionado

Prioridad: alta. Depende de [05](05-arquitectura-migracion-yachay.md). La presentación depende de [06](06-design-system-yachay.md).

## Objetivo

Convertir los tres módulos y nueve lecciones del prototipo en el catálogo inicial de la raíz, con contenido trazable y estados explícitos de publicación.

## Referencias

`quechua-convex/lib/domain/learning.ts`, `db/schema.ts`, `db/seed.ts`, `app/dashboard/learn/page.tsx` y `app/dashboard/learn/[courseId]/page.tsx`.

## Funcionalidades iniciales

| Módulo / curso      | Unidades del origen                      |
| ------------------- | ---------------------------------------- |
| Saludos y presencia | `hola`, `presentarse`, `practica-01`     |
| Familia y comunidad | `familia`, `mi-comunidad`, `practica-02` |
| Territorio y tiempo | `lugares`, `tiempo`, `practica-03`       |

Cada curso incluye descripción, nivel inicial, acento visual y duración estimada. Cada unidad distingue vocabulario, frases o práctica. El origen solo contiene títulos y descripciones: desarrollar el contenido de lectura y actividades forma parte de esta issue.

## Trabajo propuesto

1. Definir un contrato versionado para `courseUnits.content`: objetivos, bloques de vocabulario/frases, ejemplos, actividad, soluciones revisadas, fuentes y variante regional.
2. Mantener los slugs exactos `saludos-y-presencia`, `familia-y-comunidad` y `territorio-y-tiempo`; conservar los IDs de lección como claves `course_units.content.source` (`system`, `moduleSlug`, `lessonId`). Los UUID raíz se resuelven desde esa clave, no por posición. Crear semillas repetibles que no sobrescriban cursos publicados ni progreso existente.
3. Incorporar los nueve contenidos como borradores hasta registrar fuentes concretas, autoría o licencia aplicable, revisión humana y variedad lingüística. Las notas genéricas del origen no acreditan una revisión realizada.
4. Definir publicación por curso/versión y criterios académicos de finalización. Con criterios pendientes, conservar el bloqueo de emisión de `pendingCompletionPolicy`.
5. Publicar el catálogo con tarjetas reutilizables y detalle ordenado; diferenciar preparación, disponible y demostración. No habilitar inscripción real en fixtures.
6. Para «Reto de escucha», exigir audio revisado para ofrecer escucha real. Si no está disponible, plantear una actividad textual claramente titulada y registrar audio como ampliación posterior.

## Criterios de aceptación

- [x] Los tres módulos y sus nueve unidades tienen equivalencia documentada y contenido estructurado.
- [x] Cada contenido declara estado de revisión, fuentes y variedad lingüística.
- [x] Solo los cursos elegibles aparecen como disponibles para inscripción real.
- [x] Ejecutar las semillas nuevamente no duplica ni altera progreso.
- [x] Se define la unidad de certificación por módulo/curso y su política versionada.
- [x] Ninguna demostración se presenta como material validado o certificable.

## Validación prevista

Revisar integridad del catálogo, orden, tipos de lección, referencias y repetibilidad de semillas; verificar visibilidad de borradores y bloqueo académico con fixtures. La revisión lingüística de los nueve borradores sigue siendo requisito antes de publicar contenido real; esta issue no afirma que ya se haya realizado.
