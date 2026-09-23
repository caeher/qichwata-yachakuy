# Issue 01 — Transición a B2C y eliminación de la funcionalidad SaaS

## Objetivo

Convertir el producto en una plataforma educativa para personas: cuenta individual, aprendizaje y certificados. Retirar planes comerciales, suscripciones, facturación y cuotas asociadas al SaaS, conservando Clerk y la identidad de los usuarios.

## Contexto del repositorio

- `db/schema.ts` contiene `plans`, `subscriptions`, `users.planId` y métricas de almacenamiento. No se observa un modelo de organizaciones o tenants que requiera migración.
- `lib/auth/provision-user.ts` exige un plan Free y crea una suscripción al provisionar usuarios; también intervienen los webhooks y la resolución de sesión.
- `lib/billing/`, `db/quota.ts` y `db/anchor-quota.ts` implementan reglas comerciales. `BILLING_ENABLED` es una bandera; no existe integración de cobros con Stripe.
- La navegación y `/dashboard/billing` presentan el producto como servicio de almacenamiento y anclaje.

## Alcance y plan de implementación

1. Inventariar referencias a planes, suscripciones, precios, cuotas y Stripe en esquema, autenticación, dashboard, landing, tests, seed y documentación. Separar reglas comerciales de controles técnicos contra abuso.
2. Desacoplar el provisionado de usuarios de `provisionFreePlan`: mantener identificadores internos, vínculo con Clerk, sincronización de correo e idempotencia ante webhooks duplicados y accesos concurrentes.
3. Adaptar `lib/auth/resolve-app-user.ts`, `lib/auth/clerk-webhook.ts`, `lib/dashboard/load-dashboard-user.ts`, `lib/api/session.ts` y el borrado de cuenta para operar sin suscripciones. Mantener protección por propietario y validación de firmas de webhook.
4. Retirar `/dashboard/billing`, `lib/billing/`, indicadores de planes, llamadas a upgrade y mensajes de cuotas comerciales. Definir la redirección de la antigua página hacia `/dashboard`.
5. Actualizar `app/page.tsx`, `components/site-header.tsx` y `components/dashboard-nav.tsx` con el enfoque educativo B2C. Preparar navegación hacia aprendizaje y certificados sin enlaces a pantallas todavía inexistentes.
6. Eliminar `BILLING_ENABLED`, configuración comercial y seed de planes cuando no existan consumidores. Ajustar `db/seed.ts` y la descripción de su script; no introducir pagos por cursos ni otra monetización.
7. Preparar migraciones nuevas para retirar `users.plan_id`, `subscriptions` y `plans`, después de eliminar sus dependencias. No reescribir migraciones históricas. Coordinar el retiro de cuotas de almacenamiento con la issue 02 y el de cuotas de anclaje con la issue 04.
8. Actualizar README y arquitectura para describir cuentas individuales y eliminar instrucciones de configuración SaaS. Identificar los planes antiguos de `docs/plans/` como documentación histórica al implementar el cambio.

## Migración y dependencias

- Orden general del trabajo: **01 → 02 → 03 → 04**. La issue 01 inicia el desacoplamiento; sus eliminaciones de esquema que afecten al anclaje se completan al integrar la 04.
- Usar una transición expansiva y luego contractiva: permitir usuarios sin plan, actualizar consumidores y retirar tablas al final. Evitar una versión intermedia que rompa registro, sesiones o verificación histórica.
- Antes de migrar un entorno con datos, inventariar usuarios, planes y suscripciones, respaldar y validar conteos e identidades después de la migración. No recrear usuarios ni convertir registros comerciales en matrículas.
- Los límites técnicos de peticiones, autenticación y protección de la hot wallet se conservan; no dependen de un plan comercial.

## Criterios de aceptación

- [ ] Registro, inicio de sesión, provisionado y eliminación de cuenta funcionan sin seed de planes ni suscripciones.
- [ ] No hay facturación, precios, planes ni upselling en la experiencia activa.
- [ ] Las cuentas existentes conservan sus IDs y acceso; dos eventos de alta no duplican usuarios.
- [ ] Ninguna funcionalidad nueva requiere organización, tenant, plan o pago.
- [ ] Se eliminan las dependencias comerciales de ejecución y se documenta el orden de retiro de tablas.
- [ ] Los controles técnicos contra abuso y la protección de rutas siguen activos.

## Validación prevista

Adaptar pruebas de provisionado, webhooks, sesiones, privacidad y esquema. Probar alta nueva y cuenta existente en una base migrada, webhook repetido y navegación sin billing. Ejecutar `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build` al implementar; conservar el build sin credenciales externas.

## Fuera de alcance

Implementar cursos, emitir certificados, añadir pagos B2C o reemplazar Clerk. Estas issues son planificación: su creación no ejecuta migraciones ni cambia código.
