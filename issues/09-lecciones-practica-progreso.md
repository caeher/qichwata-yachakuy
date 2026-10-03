# Issue 09 — Implementar el recorrido de lecciones y práctica con progreso persistente

Prioridad: alta. Depende de [06](06-design-system-yachay.md) y [08](08-catalogo-contenido-inicial.md).

## Objetivo

Permitir inscribirse, estudiar una unidad, realizar una actividad y continuar desde el progreso guardado en la cuenta.

## Referencias

`quechua-convex/components/yachay-dashboard.tsx`, `quechua-convex/convex/learning.ts`, `lib/education/service.ts`, `app/dashboard/learn/course-actions.tsx` y `app/api/education/enrollments/`.

## Trabajo propuesto

1. Reutilizar inscripción y finalización de unidades de la raíz; mostrar listado, contenido de la unidad seleccionada, duración, fuentes y siguiente paso.
2. Implementar presentaciones reutilizables para vocabulario, frases y práctica. Como mínimo, permitir una actividad textual con respuesta y retroalimentación basada en soluciones revisadas por módulo.
3. Definir qué evidencia exige cada tipo de unidad para completarla. Validar en servidor pertenencia al curso, inscripción, propietario y evidencia requerida; una llamada directa no debe eludir los criterios.
4. Guardar progreso de forma idempotente y reflejar carga, guardado, error y reintento. Si hay actualización optimista, revertirla cuando falle: el origen muestra avance local incluso sin persistencia confirmada.
   El progreso Convex importado que se acepte se representa como avance histórico por unidad, con fecha del agregado Convex como aproximación. No crea `course_completions`, no activa certificados y no cuenta como evidencia de evaluación.
5. Reanudar la primera unidad pendiente; al terminar todas, mostrar módulo completado o evaluación pendiente según la política. Evitar que la función equivalente a `getNextLesson` vuelva a la primera unidad como si faltara completarla.
6. Mantener separadas la práctica formativa y la elegibilidad de certificado. La IA de la issue 11 puede explicar ejercicios, pero no sustituye una política académica del servidor.

## Criterios de aceptación

- [ ] El alumno puede inscribirse, leer contenido, responder una actividad y recuperar su avance tras recargar.
- [ ] Repetir una finalización no duplica progreso; otro usuario no puede consultar ni modificarlo.
- [ ] IDs desconocidos o de otro curso se rechazan y no alteran porcentajes.
- [ ] Un error de persistencia no muestra «guardado» ni deja progreso ficticio.
- [ ] Cada módulo cuenta con práctica funcional y estados accesibles de respuesta.
- [ ] El 100 % de progreso no concede certificados cuando la política académica siga pendiente.

## Validación prevista

Pruebas de servicio para autorización, duplicados, concurrencia y validación de evidencia; recorrido de interfaz con recarga, sesión vencida, error de red y módulo terminado. Reutilizar pruebas existentes de educación.
