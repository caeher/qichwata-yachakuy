# Issue 13 — Integrar y validar la migración funcional y visual de Yachay

Prioridad: alta para cierre. Depende de las issues [05](05-arquitectura-migracion-yachay.md), [06](06-design-system-yachay.md), [07](07-landing-acceso-navegacion.md), [08](08-catalogo-contenido-inicial.md), [09](09-lecciones-practica-progreso.md), [10](10-panel-progreso-real.md), [11](11-tutor-openai.md) y [12](12-certificados-diseno-verificacion.md).

## Objetivo

Entregar la aplicación raíz con el recorrido inicial de Yachay integrado, equivalencia visual documentada y operación independiente del proyecto anidado.

## Trabajo propuesto

1. Comprobar el recorrido visitante → cuenta → catálogo → inscripción → lección → práctica → progreso → finalización elegible → certificado → verificación pública.
2. Comparar landing, inicio, módulos, actividades, progreso y certificados contra el origen a 375, 768 y 1440 px. Registrar capturas y diferencias justificadas en espaciado, tipografía, colores y estados.
3. Revisar que las pantallas consuman componentes compartidos y variantes, con teclado, foco visible, mensajes accesibles, textos largos y movimiento reducido.
4. Verificar que el arranque y la compilación desde la raíz no importen código de `quechua-convex`, no requieran su proveedor Convex y no dependan de su instalación. Conservar el origen como referencia hasta cerrar la migración; su eliminación no es requisito de esta issue.
5. Obtener evidencia del inventario remoto Convex (deployment consultado, fecha, tablas y recuentos; no incluir secretos ni datos personales en el repositorio). Si hay datos, ejecutar el plan de la issue 05: export inmutable protegido, ensayo, respaldo, ventana de corte de escrituras, importación repetible, conciliación y recuperación sin perder avances nuevos. Si no hay datos, adjuntar evidencia del inventario que sustenta esa conclusión y documentar que solo se migró contenido. La falta de exportación/configuración local no cuenta como prueba de que la base remota esté vacía.
6. Documentar variables de Clerk, PostgreSQL, OpenAI y Stellar, semillas, publicación de contenido y recuperación de fallos. Actualizar los mensajes de preparación cuando las capacidades estén realmente habilitadas.
7. Mantener diferenciadas la entrega técnica y la publicación académica: registrar contenido/revisión/política pendientes y bloquear únicamente las capacidades que dependan de ellos.

## Criterios de aceptación

- [ ] El recorrido completo funciona en la raíz con fixtures controlados y los servicios reales configurados donde corresponda.
- [ ] No aparecen rachas ficticias, certificados estáticos válidos ni progreso supuestamente guardado sin persistencia.
- [ ] El diseño conserva la identidad Yachay y las diferencias están documentadas.
- [ ] La raíz usa OpenAI para toda funcionalidad de IA y opera sin Convex.
- [ ] Las rutas actuales y sus alias funcionan; los enlaces públicos históricos conservan su significado.
- [ ] La documentación distingue funcionalidades disponibles y bloqueos de publicación con responsables o evidencia pendiente.
- [ ] Si se migraron datos, los recuentos y equivalencias están conciliados y existe recuperación documentada.

## Validación prevista

Ejecutar `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build` desde la raíz, atendiendo a los requisitos reales del entorno. Mantener las pruebas automáticas de IA y Stellar independientes de credenciales usando simulaciones. Añadir pruebas de integración del recorrido y realizar comprobaciones controladas de OpenAI y testnet antes de publicar. No considerar una prueba omitida por falta de configuración como aprobada.

## Estado de cierre — 2026-09-25

El estado operativo detallado está en [docs/yachay-migration-closeout.md](../docs/yachay-migration-closeout.md). La aplicación raíz contiene la integración técnica, pero esta issue sigue abierta hasta adjuntar evidencia externa y visual.

| Requisito | Estado | Evidencia |
| --- | --- | --- |
| Progreso con respuestas correctas, idempotencia y política académica cerrada por defecto | Implementado con fixtures | `lib/education/service.test.ts`; la finalización elegible se comprueba con política inyectada en pruebas. |
| Recorrido extremo a extremo con usuario/servicios configurados | Pendiente | Requiere Clerk y PostgreSQL de staging; no se considera cubierto solo por pruebas de servicio. |
| Capturas de origen y raíz a 375, 768 y 1440 px | Pendiente | En el entorno de revisión no hay Chromium/Playwright ni capturas de referencia versionadas. |
| Aislamiento de Convex en la raíz | Revisado estáticamente | Sin imports/proveedor en el código operativo raíz ni dependencia raíz; TypeScript y ESLint excluyen la referencia anidada. |
| Alias `/aprender`, `/verificar` y referencia `YCH-` | Probado con fixtures | `app/legacy-route-aliases.test.ts` verifica las redirecciones y conservación de query/identificador. |
| Inventario remoto Convex | Bloqueado por acceso | Sin deployment consultado; tablas y recuentos quedan pendientes, no se afirma que esté vacío. |
| OpenAI real y Stellar testnet | Pendiente | Pruebas automáticas usan simulaciones; no había credenciales de servicio para comprobación controlada. |
| Revisión académica y publicación | Pendiente por política/contenido | El seed crea borradores; matrículas productivas y certificados dependen de revisión y aprobación. |

Validación local final: `pnpm lint`, `pnpm typecheck`, `pnpm test` (30 archivos,
95 pruebas) y `pnpm build` pasaron. Una primera ejecución de la suite tuvo un
timeout transitorio de inicialización PGlite; dos ejecuciones completas
posteriores pasaron.

La evidencia local de configuración revisada no mostró variables Convex en el
proceso ni en los archivos de entorno locales comprobados. Esto no sustituye el
inventario remoto. No copiar secretos ni datos personales a esta issue o al
repositorio.
