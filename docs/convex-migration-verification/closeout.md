# Cierre de verificación: persistencia Convex

Fecha: 2026-09-25. Criterio: **Convex es la base activa** cuando `NEXT_PUBLIC_CONVEX_URL` está definida; Drizzle/Postgres queda para pruebas PGlite y rutas legacy no migradas.

## Resultado por área

| Área | Estado | Evidencia |
| --- | --- | --- |
| Matriz estática | Documentada | [static-matrix.md](./static-matrix.md) |
| Paridad de esquema | Alineada en tablas educativas/certificados | [schema-parity.md](./schema-parity.md), `lib/convex/schema-parity.test.ts` |
| Funciones Convex (educación) | Verificadas en mock | `lib/convex/education.convex.test.ts` (4 pruebas) |
| Suite PGlite | No sustituye Convex | `pnpm test`: 101 pruebas; las nuevas cubren la rama Convex |
| Inventario remoto | Pendiente de operador | [inventory-remote.md](./inventory-remote.md) |
| Auth Clerk JWT en deployment | Pendiente de configuración | `convex/auth.config.ts` con `providers: []` hasta configurar issuer en deployment; ver [auth-and-e2e-checklist.md](./auth-and-e2e-checklist.md) |
| Recorrido Convex-only manual | Checklist listo | [auth-and-e2e-checklist.md](./auth-and-e2e-checklist.md) |

## Flujos que pasan por Convex (con URL configurada)

Identidad, webhook Clerk, catálogo, detalle de curso, inscripción, unidades, finalización, resumen, certificados (lectura/verificación), semilla `convex:seed`, listado de pendientes del worker.

## Dominios que siguen solo en Drizzle

Documentos y anclaje de documentos, cuotas `usageEvents`/`plans`, auditoría genérica (`lib/audit/record.ts`), borrado GDPR completo (`lib/privacy/erase-user.ts`), ejecución del job de anclaje de certificados (Convex devuelve `processed: 0`).

## Migración de datos de usuarios

No hay evidencia de importación desde Postgres. Solo catálogo inicial repetible vía `seedDraftCatalog`. Conciliación usuario/progreso/certificados sigue el protocolo de [issues/05-arquitectura-migracion-yachay.md](../../issues/05-arquitectura-migracion-yachay.md) cuando el operador confirme filas en el deployment.

## Comandos de verificación

```bash
pnpm test
pnpm convex:seed    # deployment con Convex CLI autenticado
pnpm convex:inventory
```

## Nota sobre documentación anterior

[docs/yachay-migration-closeout.md](../yachay-migration-closeout.md) describe la integración Yachay asumiendo Postgres único. Esta carpeta refleja el objetivo actual: **Convex como persistencia de producto**.
