# Configuración local (Clerk, Convex, Alchemy, Stellar, OpenAI)

## 1. Dependencias

```bash
pnpm install
cp .env.example .env.local
```

## 2. Clerk

```bash
clerk auth login
clerk init --app app_3JkPVmXR7lwv7HHUQ6O6CUKwuFf
clerk doctor
```

Copia las claves a `.env.local`. En el Dashboard de Clerk:

1. Crea la plantilla JWT **Convex** y anota el **Issuer** en `CLERK_JWT_ISSUER_DOMAIN`.
2. (Opcional) Webhook `POST /api/webhooks/clerk` con `CLERK_WEBHOOK_SIGNING_SECRET` (en local suele hacer falta túnel).

## 3. Convex

```bash
pnpm convex:dev
```

Esto rellena `NEXT_PUBLIC_CONVEX_URL` y genera `convex/_generated`. Copia también `CONVEX_DEPLOY_KEY` (Settings → Deploy Key) para webhooks y jobs internos.

Catálogo inicial (borradores):

```bash
pnpm convex:seed
```

## 4. Alchemy (Stellar testnet)

1. Instala/inicia sesión en la [CLI o dashboard de Alchemy](https://www.alchemy.com/).
2. Crea una app **Stellar Testnet**.
3. Copia la API key a `ALCHEMY_STELLAR_API_KEY`.

Sin clave, testnet usa RPC público (`docs/stellar.md`).

## 5. Wallet Stellar (testnet)

```bash
pnpm stellar:wallet
```

Pega `STELLAR_HOT_WALLET_SECRET` en `.env.local`. Opcional: `pnpm contract:build` y `pnpm contract:deploy`.

## 6. OpenAI (tutor)

Rotar cualquier clave expuesta. En `.env.local`:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` (p. ej. `gpt-4o-mini`)
- `OPENAI_COACH_ENABLED=false` hasta aprobación lingüística (`docs/coach.md`)

## 7. Arranque

```bash
pnpm dev
```

Prueba registro en `/sign-up`, panel en `/dashboard` y salud Stellar en `/api/stellar/health`.

## Tests sin Convex

```bash
pnpm test
```

Vitest usa PGlite; no define `NEXT_PUBLIC_CONVEX_URL`.
