# Issue 03 — Crear el scaffolding educativo de aprendizaje y finalización

## Objetivo

Preparar la estructura educativa B2C para que una persona consulte cursos, se inscriba y registre avance, dejando temas, contenidos y reglas académicas explícitamente pendientes de definir. Proveer una finalización validada en servidor que pueda activar la emisión de un certificado.

## Dependencias y límites

Depende de las issues [01](01-transicion-b2c-eliminar-saas.md) y [02](02-retirar-uploads-y-object-storage.md). No incorporar un LMS completo, pagos, organizaciones, herramientas de autoría, evaluaciones definitivas ni carga de material multimedia.

Los nombres de entidades y rutas siguientes son una propuesta de implementación, no funcionalidades existentes.

## Modelo mínimo propuesto

| Entidad | Datos y restricciones principales |
| --- | --- |
| `courses` | ID, slug único, título provisional, descripción, versión y estado borrador/publicado. |
| `course_units` | Curso, orden, título y placeholder de contenido; orden único dentro del curso. |
| `enrollments` | Usuario, curso/versión, estado, fechas; una inscripción por usuario y versión cursada. |
| `unit_progress` | Inscripción, unidad y fecha de finalización; unicidad por inscripción/unidad. |
| `course_completions` | Inscripción única, versión del curso, versión de política y fecha de finalización validada. |

Separar finalización académica y estado blockchain: una indisponibilidad de Stellar no revierte el aprendizaje completado.

## Plan de implementación

1. Añadir tablas y migraciones Drizzle con claves foráneas, índices de consultas por alumno y restricciones de unicidad. Conservar los usuarios existentes y dejar sus paneles en estado vacío; no inventar historial académico.
2. Crear una capa de servicios para catálogo, inscripción, lectura de progreso y finalización. Todas las escrituras deben resolver al usuario en servidor y comprobar propiedad de la inscripción y pertenencia de la unidad al curso.
3. Preparar rutas propuestas `/dashboard/learn`, `/dashboard/learn/[courseId]` y una portada con cursos/progreso. Mostrar estados vacíos claros mientras no exista oferta publicada.
4. Incorporar fixtures de desarrollo con títulos como «Curso de ejemplo — contenido pendiente», marcados como demostración y en borrador por defecto. No publicar temas inventados como oferta real ni habilitar certificados reales para fixtures.
5. Definir una interfaz versionada de política de finalización con resultado elegible/no elegible y motivos. Hasta definir la regla académica, la implementación productiva devuelve «criterios pendientes» y no certifica por un simple clic del cliente.
6. Proveer una política simulada solo en pruebas/desarrollo para demostrar inscripción → avance → finalización. No permitir que un parámetro de petición active ese modo en producción.
7. Registrar `course_completions` de forma transaccional e idempotente. Definir un punto de integración posterior al commit y un mecanismo de recuperación para la issue 04: una finalización persistida sin certificado debe poder reprocesarse.
8. Preparar `/dashboard/certificates` como estado vacío hasta integrar la emisión. Actualizar navegación, portada y documentación del recorrido del alumno.
9. Extender el borrado de cuenta y sus pruebas para los datos de matrícula y progreso; coordinar la conservación o anonimización de evidencias con la issue 04.

## Decisiones de producto pendientes

- Temas, títulos, programa, contenidos y estructura final de cursos/unidades.
- Reglas de aprobación: avance, evaluación, nota mínima, asistencia u otras evidencias; ninguna se asume como requisito definitivo.
- Identidad mostrada en el certificado, entidad emisora y diseño visual.
- Publicación/versionado de cursos y efecto de cambios curriculares sobre inscripciones existentes.

Estas decisiones no bloquean el scaffolding ni sus pruebas. Sí bloquean publicar cursos reales y activar la emisión productiva sin una política definida.

## Criterios de aceptación

- [ ] Un usuario autenticado dispone de un área de aprendizaje y certificados con estados vacíos coherentes.
- [ ] El modelo permite inscripción y progreso sin planes, pagos ni almacenamiento de archivos.
- [ ] Un alumno no puede leer o modificar progreso privado ajeno ni completar unidades de otro curso.
- [ ] Reintentar o ejecutar concurrentemente inscripción/finalización no duplica registros.
- [ ] Los cursos de ejemplo están identificados y no generan certificados productivos.
- [ ] La finalización se valida en servidor; con criterios sin definir permanece bloqueada.
- [ ] Existe una finalización persistida y recuperable que la issue 04 puede consumir sin depender de una sesión abierta.

## Validación prevista

Añadir pruebas de servicios y restricciones con Vitest/PGlite: propietario incorrecto, unidad de otro curso, solicitudes repetidas, concurrencia y política pendiente. Validar el flujo simulado completo y su inaccesibilidad en producción. Ejecutar los controles de CI y comprobar que el proyecto continúa compilando sin servicios externos.
