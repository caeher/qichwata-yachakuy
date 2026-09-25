# Cierre de migración de Yachay

Estado revisado el 2026-09-25. La entrega técnica integrada en la aplicación
raíz está en validación; no se declara cerrada mientras falten las evidencias
operativas listadas abajo. Este documento no afirma que el deployment remoto de
Convex esté vacío.

## Estado de capacidades

| Capacidad | Estado comprobable | Bloqueo o evidencia pendiente |
| --- | --- | --- |
| Registro, acceso e identidad | Rutas Clerk y aprovisionamiento están en la raíz. | Validación con instancia Clerk configurada y cuenta controlada. |
| Catálogo inicial | `pnpm db:seed` crea cursos y unidades versionados como borradores. | Contenido, autoría, licencia, variedad regional y revisión lingüística antes de publicar. |
| Inscripción y práctica | PostgreSQL guarda matrículas; el servidor corrige respuestas antes de persistir el avance. | Recorrido extremo a extremo con usuario y PostgreSQL de staging. |
| Progreso | Se deriva de `unit_progress`; no hay rachas simuladas. | Revisión visual y prueba con persistencia de staging. |
| Tutor | `/api/coach` usa OpenAI Responses API; apagado por defecto; pruebas usan cliente simulado. | Evaluación lingüística controlada y configuración privada de OpenAI antes de habilitarlo. |
| Certificados | La intención y la verificación tienen almacenamiento y estados explícitos. La política de finalización está pendiente, por lo que no se emiten certificados de curso en producción. | Política académica, emisor e identidad institucional aprobados; luego prueba controlada con testnet. |
| Verificación histórica | `/verify` y `/v/[hash]` conservan verificación por hash; `/verificar` redirige a `/verify` preservando la query. | Probar casos históricos concretos y confirmación real en Stellar testnet. |
| Alias de rutas | Pruebas verifican `/aprender` → `/dashboard` y `/verificar` → `/verify`, incluyendo query repetida e ID `YCH-`. | Ninguno para los alias implementados. |
| Convex | No se encontraron imports, proveedor ni dependencia Convex en `app`, `components`, `db`, `lib`, `scripts` ni dependencias raíz. `quechua-convex` sigue como referencia. | Inventario del deployment remoto pendiente; se requiere acceso del operador Convex. |

## Evidencia de inventario remoto

En esta revisión no había variables Convex en el proceso ni variables Convex en
los archivos locales de entorno revisados. La raíz no tiene Convex como
dependencia. Eso solo demuestra falta de configuración local visible; no es
evidencia del estado de la base remota.

| Dato de inventario | Resultado |
| --- | --- |
| Deployment consultado | Ninguno; no se obtuvo acceso al deployment. |
| Fecha/hora de consulta remota | No realizada. |
| Tablas y recuentos | Pendientes; no se presume cero. |
| Export, checksum y conciliación | No realizados. |
| Estado de migración de cuentas/progreso | Solo está migrado/versionado el contenido inicial del prototipo; no se importaron datos de usuarios ni certificados. |

El operador debe adjuntar el identificador no secreto del deployment, fecha de
consulta, lista de tablas y recuentos, y checksum del export protegido fuera del
repositorio. Si aparecen filas, aplicar el plan de [issue 05](../issues/05-arquitectura-migracion-yachay.md): export inmutable, ensayo, respaldo, corte coordinado de escrituras, importación repetible, conciliación y recuperación. No incluir secretos, exportaciones con datos personales ni reportes de cuarentena en Git.

## Publicación, configuración y recuperación

Las variables están documentadas en `.env.example` y en las guías enlazadas en
el [README](../README.md): Clerk (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`,
`CLERK_SECRET_KEY`, secretos de webhook), PostgreSQL (`DATABASE_URL`), OpenAI
(`OPENAI_COACH_ENABLED`, `OPENAI_API_KEY`, `OPENAI_MODEL`) y Stellar
(`STELLAR_NETWORK`, `STELLAR_CONTRACT_ID`, `STELLAR_HOT_WALLET_SECRET`,
`ALCHEMY_STELLAR_API_KEY`, `CERTIFICATE_WORKER_TOKEN`). Las claves privadas son
solo del servidor.

`pnpm db:migrate` aplica esquema y `pnpm db:seed` inserta el catálogo inicial
como borrador de forma repetible; no habilita matrícula ni publicación. Antes
de publicar, una persona responsable debe completar la revisión, fuentes y
licencias, autoría y variante regional por unidad. La capacidad de matrícula
requiere curso publicado y habilitado; la certificación requiere además una
política de finalización aprobada. El tutor requiere evaluación lingüística.
Stellar requiere contrato, red, wallet y worker; su disponibilidad no sustituye
la aprobación académica.

La recuperación de certificados pendiente/fallida está descrita en
[certificates.md](certificates.md); la recuperación de tutor y sus límites en
[coach.md](coach.md); y la migración repetible en issue 05. Un progreso guardado
permanece en PostgreSQL aunque fallen OpenAI o Stellar. Una respuesta de base de
datos sin recibo de cadena no se muestra como confirmación Stellar.

## Validación local

Desde la raíz, el 2026-09-25:

| Comando | Resultado |
| --- | --- |
| `pnpm lint` | Pasó; ESLint evalúa la aplicación raíz y excluye `quechua-convex`. |
| `pnpm typecheck` | Pasó. |
| `pnpm test` | Pasó: 30 archivos, 95 pruebas. Las integraciones de OpenAI y Stellar usan dobles locales. |
| `pnpm build` | Pasó con secretos externos vacíos; generó las rutas de la aplicación raíz. |

Una ejecución inicial de `pnpm test` tuvo un timeout al inicializar PGlite en
`app/api/verify/route.test.ts`; la repetición completa pasó. La prueba de alias
agregada después pasó (2/2) y la suite completa volvió a pasar (95/95).

## Comparación visual y accesibilidad

La [guía del sistema Yachay](design-system-yachay.md) registra la paleta,
tipografías, radios, movimiento reducido, componentes compartidos y ajustes de
contraste realizados. Las diferencias justificadas son el oscurecimiento de
tinta suave y arcilla para contraste AA y la representación del acento `gold`
con papel/arcilla, porque el origen no definía un pigmento dorado.

No se guardaron capturas comparativas de origen y raíz para 375, 768 y 1440 px
en esta revisión: el entorno no tiene Playwright ni un navegador Chromium
instalado, y no hay capturas de referencia versionadas. La comparación de
pantallas, desbordamiento de textos largos y estados con teclado debe registrarse
cuando se disponga de navegador en los dos proyectos. No se considera aprobada
por una inspección estática de CSS.

## Aislamiento de la raíz

La dependencia `convex` está declarada únicamente en
`quechua-convex/package.json`. La configuración de TypeScript excluye ese
subproyecto y ESLint lo ignora; la raíz no lo importa al arrancar o compilar.
El subproyecto se conserva como fuente histórica hasta completar el inventario y
la comparación visual.
