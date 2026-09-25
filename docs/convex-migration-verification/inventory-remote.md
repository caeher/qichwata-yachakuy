# Inventario remoto Convex

| Campo | Resultado |
| --- | --- |
| Deployment consultado | No disponible en este entorno (sin login Convex / sin `CONVEX_DEPLOY_KEY`) |
| Fecha/hora | 2026-09-25 (verificación automatizada local) |
| Comando operador | `pnpm convex:seed` luego `pnpm convex:inventory` con `NEXT_PUBLIC_CONVEX_URL` y `CONVEX_DEPLOY_KEY` |
| Función | `internal.inventory.deploymentInventory` en [convex/inventory.ts](../../convex/inventory.ts) |

## Evidencia local sustituta

- Pruebas `lib/convex/education.convex.test.ts`: semilla idempotente de tres módulos en borrador, flujos de matrícula/progreso/certificado en mock Convex.
- No se importaron usuarios, progreso ni certificados desde PostgreSQL; solo el catálogo versionado del prototipo.

El operador debe adjuntar fuera del repositorio el JSON de `pnpm convex:inventory` y, si aplica, checksum de export Postgres para conciliación.
