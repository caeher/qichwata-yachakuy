# [Follow-up] Stripe: cobro por anclaje extra y por almacenamiento

Parent: [#10](https://github.com/caeher/stellar-data-integrity/issues/10)

Use this body when opening the GitHub child issue. Do not implement in the #10 PR.

## Fuera de esta issue

No implementar Checkout, Customer Portal, ni webhooks de Stripe hasta que el plan Free y los códigos `QUOTA_STORAGE` / `QUOTA_ANCHORS` estén en `main`.

## Cuando se active

- Respetar `BILLING_ENABLED=true` como interruptor. Con `false`, ningún endpoint crea una sesión de pago.
- Stripe Checkout y Customer Portal. El paquete `stripe` solo en un route handler o server action, nunca en el cliente con la clave secreta.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, y los price ids van en el entorno. No commitearlos. No usar el prefijo `NEXT_PUBLIC_` en secretos.
- Webhook propio, distinto de `/api/webhooks/clerk`. Idempotencia con una tabla o con `webhook_events` si el esquema se extiende a propósito.
- Rellenar `plans.price_per_extra_anchor_cents` y `plans.price_per_gb_cents` en ese cambio, no antes.
- `subscriptions.stripe_customer_id` ya existe y está vacío. Usarlo ahí.
- El cupo incluido del mes UTC no cambia: los anclajes de pago son los que superan `monthly_anchors_included`. No cobrar dentro del cupo Free.
- `pnpm build` y `pnpm test` siguen en verde sin claves de Stripe.
