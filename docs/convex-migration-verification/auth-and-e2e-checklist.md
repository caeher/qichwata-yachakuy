# Auth Clerk + recorrido Convex-only

Ejecutar en staging o local con `NEXT_PUBLIC_CONVEX_URL` definida y **`DATABASE_URL` vacía**.

## Auth JWT

1. En Clerk Dashboard: plantilla JWT **Convex**; copiar **Issuer** a `CLERK_JWT_ISSUER_DOMAIN` (Convex env y `.env.local` para documentación).
2. Desplegar funciones (`pnpm convex:dev` o push al deployment de desarrollo).
3. Confirmar [convex/auth.config.ts](../../convex/auth.config.ts) expone el proveedor cuando `CLERK_JWT_ISSUER_DOMAIN` está configurado en el deployment Convex.
4. Iniciar sesión en la app; abrir `/dashboard/learn` y comprobar que no hay error `not_authenticated` en red (Convex).

## Recorrido manual (Convex-only)

| Paso | Ruta / acción | Éxito esperado |
| --- | --- | --- |
| Visitante | `/` | Landing sin error de base de datos |
| Registro | Clerk sign-up | Webhook crea fila en `users` (dashboard Convex) |
| Catálogo | `/dashboard/learn` | Lista cursos (borrador o publicados según seed) |
| Inscripción | Curso publicado con `enrollmentEnabled` | 201 desde API; fila en `enrollments` |
| Unidad | Completar práctica con respuesta correcta | `unitProgress` sin duplicados |
| Progreso | `/dashboard/progress` | Resumen coherente con Convex |
| Cierre | Completar curso | Con política `pending`, error `criteria_pending` |
| Verificación | `/verify` con `publicId` válido | Respuesta desde `certificates.getByPublicId` |
| Certificados job | `POST /api/jobs/certificates` | Con Convex: `processed: 0` y nota de mutaciones pendientes (hueco conocido) |

## Fallos que invalidan la migración

- Mensaje `PostgreSQL getDb() is disabled` o `database_unconfigured` en flujos educativos con Convex configurado.
- `providers: []` en producción con usuarios autenticados (JWT no configurado en deployment Convex).
- Escrituras que solo existen en Postgres (documentos, anclaje documento, borrado GDPR completo) tratadas como disponibles en producto Convex.

Automatización parcial: `convex/education.convex.test.ts` y `pnpm test` (incluye matriz estática en `lib/convex/schema-parity.test.ts`).
