# Issue #11 — Landing polish

Status: plan only. Do not implement in the same commit as this document.

Issue: https://github.com/caeher/stellar-data-integrity/issues/11

Depends on: the current `app/page.tsx` (Spanish hero, three cards, a "Cómo funciona" list, footer) and the public routes from #8 (`/verify`, `/v/[hash]`, `/sign-up`, `/sign-in`).

Recommended order for this batch: **#10 → #9 → #11 → #12**. This page does not need the billing or dashboard work. It only shares `components/site-header.tsx` if the header is edited, and `SiteHeader` already accepts `title` and `trailing`, so leave that component unchanged unless a spacing fix is required.

## Decision

Edit the existing landing. Do not add a second homepage, a CMS, or an i18n framework. Copy stays Spanish. `app/layout.tsx` already sets `<html lang="es">`.

Use the shadcn pieces already in the repo: `Button`, `Card`, and `SiteHeader`. `Button` takes `render={<Link href="..." />}`, not `asChild`. Do not add Badge, Form, or other primitives just for this page. Do not restyle the dashboard.

The page must stay a server component with no Clerk and no database calls, so `pnpm build` works without secrets. Import limits from `db/constants.ts` and format them with `formatBytes`. Those modules do not open a connection.

## What is wrong or thin today

`app/page.tsx` already has a hero, "Crear cuenta", "Entrar", "Verificar", three feature cards, three steps, and a short footer.

Gaps against the issue:

- "Verificar" is a hand-copied class string, not a `Button`.
- The header is a one-off `<header>`, not `SiteHeader`, and it has no sign-in or verify link.
- Step 1 says the SHA-256 is calculated on the client. The product hashes on the server (`sha256Hex` in `createDraftDocument`). The landing must describe the shipped flow.
- There is no Free-plan section.
- There is no trust section that states only the hash goes on chain.
- The footer does not point at sign-up or state the trust line.

## Page structure

Keep `max-w-5xl`, `px-4`, vertical rhythm similar to the current page (`gap-16`, `py-12 sm:py-16`). One column on small screens. The feature grid stays `md:grid-cols-3`.

### Header

Replace the custom header with `SiteHeader`. `trailing` is a row: link "Verificar" (`/verify`), link "Entrar" (`/sign-in`). `SiteHeader` already appends `ThemeToggle`. Use `Button` `variant="ghost"` or `size="sm"` via `render` for those two links so they match the rest of the system. Do not duplicate `ThemeToggle`.

### Hero

Eyebrow: "Integridad verificable".

Heading (keep the current meaning): "Ancla la huella de tus datos en Stellar".

Paragraph: the server computes SHA-256 of a file or text and anchors that hash on Stellar (Soroban). The file itself is not written to the chain.

CTAs, in this order:

1. `Button` "Crear cuenta" → `/sign-up` (primary).
2. `Button` `variant="outline"` "Verificar" → `/verify`.
3. Text link "Entrar" → `/sign-in`, only if the header does not already make it obvious. The header link is enough; do not show Entrar twice. Drop the duplicate from the hero.

Keep "Ver cómo funciona" as a text link to `#como-funciona`.

### Cómo funciona

`id="como-funciona"` and `scroll-mt-20` stay.

Ordered steps, Spanish, matching the code:

1. Subes un archivo o pegas un texto. El servidor calcula el SHA-256 de esos bytes.
2. Anclas ese hash en Stellar (Soroban). El contenido no entra en la transacción.
3. Cualquiera puede comprobar el hash en Verificar, sin crear una cuenta.

Do not tell the reader to hash on the client.

### Plan Gratis

A single `Card`, not a pricing table. Numbers come from code:

- Storage: `formatBytes(FREE_STORAGE_LIMIT_BYTES)` → `100.0 MB`.
- Anchors: `` `${FREE_MONTHLY_ANCHORS} anclajes al mes` `` → `10 anclajes al mes`.
- File: `formatBytes(FREE_MAX_UPLOAD_BYTES)` → `25.0 MB` por archivo.
- Network line: "La red de desarrollo es testnet. Mainnet es un ajuste del servidor, no un plan de pago."

Do not list Pro or Enterprise. Do not show prices. Do not add an upgrade button. The CTA in this section is "Crear cuenta" → `/sign-up`.

`formatBytes` labels base-1024 quantities as MB. That matches the dashboard. Do not add a second formatter.

### Confianza

Heading: "Qué se publica".

Three short points, as `Card`s or a simple list inside one card. Use the same card style as the feature grid so the page does not invent a new visual language.

- En la cadena solo va el hash (32 bytes) y un metadato corto. El contrato rechaza un metadato de más de 128 bytes (`META_MAX` in `contracts/anchor`).
- El archivo se guarda fuera de la cadena (disco local o S3). La clave del monedero no llega al navegador.
- Verificar es público: `/verify` y `/v/<hash>` no piden sesión.

Do not claim the chain stores a timestamped copy of the file. Do not mention Alchemy keys on this page.

### Footer

Keep the top border. Lines:

- stellar-data-integrity
- "Solo el hash se ancla en Stellar."
- Links: Verificar (`/verify`), Crear cuenta (`/sign-up`), Entrar (`/sign-in`).

## Files

```
app/page.tsx                         # sections above
components/site-header.tsx           # only if the trailing row needs a gap tweak
```

If `app/page.tsx` grows past a single screen of JSX, split presentational sections into `components/landing/` (`hero.tsx`, `how-it-works.tsx`, `free-plan.tsx`, `trust.tsx`). Those files stay server components and receive no props that come from I/O. Skipping the split is fine if the page stays readable.

Do not edit `app/dashboard/**`, API routes, or the contract.

## Copy rules

- Spanish, informal "tú" ("Subes", "Anclas"), consistent with "Crear cuenta" / "Verificar".
- No English headings.
- No "blockchain" where "Stellar" is more precise. One mention of Soroban in the hero or in step 2 is enough.
- Do not say the product is audited, custodial, or legally binding.

## Tests and build

No new test is required for static copy. Do not add Playwright.

If a constant is rendered, a one-line unit test is unnecessary. A wrong number would mean `formatBytes` or the constants changed; those already have callers in quota tests.

`pnpm build` must succeed with `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `DATABASE_URL` unset. The landing must not call `auth()`, `getDb()`, or `createStellarClients()`.

`pnpm lint` and `pnpm typecheck` stay green.

## Acceptance

- [ ] Hero has a primary Crear cuenta control and a Verificar control, both shadcn `Button`s, pointing at `/sign-up` and `/verify`.
- [ ] Cómo funciona describes server-side SHA-256, then Stellar, then public verify.
- [ ] Free highlights show 100.0 MB, 10 anchors per month, and 25.0 MB per file, taken from `db/constants.ts`.
- [ ] A trust section states that the file bytes are not on chain.
- [ ] Footer includes the trust line and links to verify and sign-up.
- [ ] The page is Spanish and uses the existing type scale, cards, and buttons.
- [ ] Narrow and desktop widths: sections stack, CTAs wrap, no horizontal scroll.
- [ ] `pnpm build` passes without Clerk or Stellar secrets.

## Out of scope

- Blog, changelog, or docs site.
- English locale toggle.
- Pricing for Pro or Enterprise.
- Screenshots, custom illustrations, or a new font.
- Changing `/verify` itself.
