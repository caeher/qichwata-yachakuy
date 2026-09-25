# Verificación migración PostgreSQL/Drizzle → Convex

Índice de evidencia para comprobar que la persistencia activa es Convex.

| Documento | Contenido |
| --- | --- |
| [closeout.md](./closeout.md) | Resumen ejecutivo y estado |
| [static-matrix.md](./static-matrix.md) | Flujos Convex vs huecos Drizzle |
| [schema-parity.md](./schema-parity.md) | Tablas, índices y unicidad |
| [auth-and-e2e-checklist.md](./auth-and-e2e-checklist.md) | JWT Clerk y recorrido sin `DATABASE_URL` |
| [inventory-remote.md](./inventory-remote.md) | Inventario de deployment remoto |

Pruebas automáticas: `lib/convex/education.convex.test.ts`, `lib/convex/schema-parity.test.ts`.
