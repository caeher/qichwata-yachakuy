# Issue #9 — Dashboard UI (shadcn)

Status: plan only. Do not implement in the same commit as this document.

Issue: https://github.com/caeher/stellar-data-integrity/issues/9

Depends on: #10 (public quota codes `QUOTA_STORAGE` / `QUOTA_ANCHORS`, `loadUsageSummary`, `isBillingEnabled`). Implement #10 first. If this issue is started alone, do not invent a second quota model; call the helpers #10 adds.

Blocks: nothing in #11–#12. #12 docs should describe the routes this issue adds, so land this before the docs pass if both are in flight.

## Decision

This is incremental polish on the authenticated panel that #2, #4, and #7 already shipped. Do not rebuild auth, upload hashing, or the anchor job.

Keep:

- App Router at the repo root, Next **16.3.5**, `lang="es"`, Geist fonts, `max-w-5xl` page width.
- shadcn style `base-nova` (`components.json`). `Button` uses the Base UI `render` prop (`render={<Link href="..." />}`). Do not use `asChild`.
- Server components read the database through existing functions. The browser only calls the HTTP routes it already uses, plus one new `DELETE`.
- Spanish UI copy. No i18n library.

Do not add Playwright, Testing Library, Stripe, or a new data table library.

## What already exists

| Route                       | Today                                                                                                                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/dashboard`                | Plan name, storage sentence, anchor sentence, and the upload form inline. No nav, no progress, no recent-document list. Anchor count uses the constant `FREE_MONTHLY_ANCHORS`, not the user's plan row. |
| `/dashboard/documents`      | Missing. `GET /api/documents` and `listDocumentsForUser` already return the caller's non-deleted documents, newest first, as `DocumentDto` (no `storageKey`).                                           |
| `/dashboard/documents/new`  | Missing. Upload lives in `app/dashboard/upload-form.tsx` (`POST /api/documents` or `POST /api/documents/text`).                                                                                         |
| `/dashboard/documents/[id]` | Server page: name, status sentence, hash, `DocumentAnchorPanel`. No copy, no verify link, no receipt card, no delete.                                                                                   |
| `/dashboard/billing`        | Missing.                                                                                                                                                                                                |
| `/dashboard/settings`       | Missing. Header shows Clerk `UserButton` via `DashboardUserMenu`.                                                                                                                                       |
| `/v/[hash]`, `/verify`      | Public verify from #8. "Abrir verificación" must link to `/v/<sha256>`.                                                                                                                                 |

`app/dashboard/layout.tsx` only checks Clerk and redirects anonymous users to `/sign-in`. `isProtectedPath` already treats every `/dashboard` and `/dashboard/*` path as protected. New pages do not need a `proxy.ts` change.

shadcn already installed: `components/ui/button.tsx`, `card.tsx`, `dropdown-menu.tsx`.

Not installed: Table, Dialog, Progress, Badge, Tabs, Toast, Form.

Actions today: upload and anchor work. Copy hash, open verify (except the `hash_already_anchored` error link), and delete do not.

`releaseStorage` in `db/quota.ts` soft-deletes a document and decrements `storage_used_bytes`. Nothing calls it from a user-facing route. It does not delete the object blob.

## shadcn components

Add with the CLI already implied by `components.json` (style `base-nova`). Pin the CLI to the major already in the repo:

```bash
pnpm dlx shadcn@4.21.0 add table dialog progress badge tabs sonner form
```

Commit `pnpm-lock.yaml` and the generated `components/ui/*` files. Do not hand-write primitives.

- Toast is the `sonner` component. Mount `<Toaster />` once in the dashboard shell, not on the marketing page.
- `dropdown-menu` already exists. Use it for the per-document action menu. Do not add a second menu package.
- `form` may pull `react-hook-form` and `zod` through the CLI. Use that only on `/dashboard/documents/new`. Do not add another form library by hand. If the CLI refuses `form`, keep the current labeled `<form>` and do not block the issue on it; Button, Card, Table, Dialog, Progress, Badge, Tabs, and Sonner are the ones the screens actually need.

## Shell

Move the repeated header into the dashboard layout so every screen shares it.

`app/dashboard/layout.tsx`:

- Keep the current Clerk gate (`CLERK_SECRET_KEY` missing → render children; no user → `redirect("/sign-in")`).
- When a session exists, render `SiteHeader` (`trailing={<DashboardUserMenu />}`) plus a nav, then `{children}`.
- Remove the duplicated `SiteHeader` from `app/dashboard/page.tsx` and `app/dashboard/documents/[id]/page.tsx`.

Nav links (Spanish), `aria-current="page"` on the active one:

| Label       | href                   |
| ----------- | ---------------------- |
| Resumen     | `/dashboard`           |
| Documentos  | `/dashboard/documents` |
| Facturación | `/dashboard/billing`   |
| Ajustes     | `/dashboard/settings`  |

Desktop: a horizontal row under the header, inside `max-w-5xl`. Mobile: the same row wraps; do not add a sidebar package. Hit targets stay at least the `Button` `sm` height.

Active state is a pathname check (`/dashboard` exact; the others by prefix). `/dashboard/documents/new` and `/dashboard/documents/[id]` count as Documentos.

## Screens

### `/dashboard` overview

Server component. Call `loadUsageSummary` from #10. Replace the single usage paragraph and remove the inline upload form.

Three cards:

1. **Almacenamiento** — `formatBytes(used)` de `formatBytes(limit)`, shadcn `Progress` at `min(100, round(used/limit*100))`. `aria-label` in Spanish. Limit `0` → value `0`.
2. **Anclajes este mes** — `(anchorsSettled + anchorsPending)` de `anchorsIncluded`, same progress. Caption: `N en curso` when `anchorsPending > 0`. The bar matches the quota the anchor job enforces (settled usage events plus in-flight `pending` documents). Do not read `FREE_MONTHLY_ANCHORS` here.
3. **Plan** — `planName` (Gratis for `free`). Link to `/dashboard/billing`.

**Documentos recientes:** first 5 from `listDocumentsForUser` (already `createdAt desc`). Each row: name, `Badge` for status, relative or `es` date, link to the detail. Empty state: "Todavía no hay documentos." and a `Button` to `/dashboard/documents/new`.

Primary action on the page: "Nuevo documento" → `/dashboard/documents/new`.

Status badge labels:

| status     | label     |
| ---------- | --------- |
| `draft`    | Borrador  |
| `pending`  | Pendiente |
| `anchored` | Anclado   |
| `failed`   | Fallido   |

### `/dashboard/documents`

Server page. `searchParams.estado`:

| value              | rows                    |
| ------------------ | ----------------------- |
| missing or `todos` | all non-deleted         |
| `borrador`         | `status === "draft"`    |
| `anclado`          | `status === "anchored"` |

`pending` and `failed` stay visible under Todos. Do not add a query-string API; filter the array from `listDocumentsForUser` in the server component.

Cap the query at 100 rows. Add an optional limit argument to `listDocumentsForUser` (default 100) using Drizzle `.limit()`. If the cap is hit, show "Mostrando los 100 más recientes." Cursor pagination is out of scope.

shadcn `Tabs` link to `?estado=todos|borrador|anclado` (real links, so the filter works without client state).

`md` and up: shadcn `Table` columns Nombre, Estado, Tamaño (`formatBytes`), Fecha, Acciones. Below `md`: the same rows as stacked `Card`s (a 64-char hash must not force a horizontal page scroll). The hash itself is not a column; it lives on the detail page.

Empty:

- No documents at all: "Todavía no hay documentos." + button "Subir documento".
- Filter matches nothing: "No hay documentos en esta vista." + link back to Todos.

Row actions use `dropdown-menu`: Ver detalle, Copiar hash, Abrir verificación, Eliminar. Eliminar is omitted or disabled when `status === "pending"`.

### `/dashboard/documents/new`

Move `UploadForm` here. The overview no longer renders it.

Keep the current behavior: file **or** non-empty text; file wins if both are set. Same `accept` list. Same Spanish errors, but match the #10 codes:

| `error`            | copy                                         |
| ------------------ | -------------------------------------------- |
| `QUOTA_STORAGE`    | Superas el espacio del plan Gratis.          |
| `file_too_large`   | El archivo supera el tamaño máximo del plan. |
| `unsupported_type` | Tipo de archivo no permitido.                |
| `forbidden_file`   | Este tipo de archivo no está permitido.      |
| other              | No se pudo subir el contenido.               |

Do not hardcode "100 MB" or "25 MB" in new strings; the API remains the source of the limit. Existing strings that say "100 MB" / "25 MB" may stay only if they still match `formatBytes` of the Free constants (100.0 MB and 25.0 MB at base 1024).

On 201, `router.push(/dashboard/documents/${id})` so the detail page is where the user anchors. A toast "Documento creado." is enough; do not keep a second result card on this page.

### `/dashboard/documents/[id]`

Keep the server load (`loadDocumentDetail`, `notFound()` when missing or not owned).

Layout:

- Back link "Documentos" → `/dashboard/documents` (not only `/dashboard`).
- Title, status `Badge`, size, mime, created date.
- Hash in `font-mono break-all`, with "Copiar hash".
- `DocumentAnchorPanel` unchanged in behavior (anchor / retry / pending / Stellar Expert). Update its quota branch to `payload.error === "QUOTA_ANCHORS"` with the same Spanish sentence ("Has usado los anclajes incluidos este mes.").
- Always show "Abrir verificación" → `/v/${sha256}` as a `Button` `outline` link. This is not only the `hash_already_anchored` error path. Keep that error's extra link if it is still useful; the permanent action is the button.
- Receipt card when `detail.anchor` is non-null: network (`testnet` / `mainnet`), tx hash, ledger, `anchoredAt`, `feeXlm` or "—", contract id or "—", Expert link. If `status === "anchored"` and `anchor` is null, show "Recibo no disponible." Do not invent a receipt.
- "Eliminar" opens a `Dialog`. See delete rules below.

### `/dashboard/billing`

Server page. Data from `loadUsageSummary` and `isBillingEnabled()` (#10).

One card, current plan only:

- Name (`planName`).
- Storage progress (same math as the overview).
- Anchor progress (settled + pending, same math).
- Per-file max: `formatBytes(maxUploadBytes)`.
- Period copy: "Los anclajes se reinician al inicio del mes UTC." Do not display `subscriptions.current_period_end` as the quota window. #7 already decided that column is not rolled forward.

Do not render Pro or Enterprise as products. Their rows exist in `plans` and their prices are `null`. Do not invent prices.

Upgrade placeholder (no network, no email capture, no Stripe):

- `Button` "Mejorar plan" `disabled`.
- `Button` "Comprar anclajes" `disabled`.
- Text: "El cobro está desactivado. No se realiza ningún cargo."
- When `isBillingEnabled()` is true, the buttons stay disabled and the text adds "Los pagos todavía no están conectados." A `true` flag must not start Checkout. #10's follow-up issue owns Stripe.

### `/dashboard/settings`

Server page. Read `currentUser()` (already used on the overview) plus `loadUsageSummary` for the plan name.

Card **Perfil**:

- Name, if Clerk has `firstName` / `lastName`.
- Primary email, or "Sin correo".
- Plan name.
- Short line: "La cuenta la gestiona Clerk." The header `UserButton` remains the place to sign out and open the Clerk account widget.

No profile mutation, no extra table, no `<UserProfile />` full page.

## Delete

New route: `DELETE app/api/documents/[id]/route.ts` next to the existing `GET`. `runtime = "nodejs"`. Same session and `DATABASE_URL` checks as `GET` (`401 unauthorized`, `503 database_unconfigured`).

Handler body, in a small function `deleteDocumentForUser` in `lib/uploads/delete-document.ts` (do not grow the route):

1. Load the document by id, `userId`, `deletedAt is null`. Missing or not owned → `404 { "error": "not_found" }`. Do not return 403.
2. `status === "pending"` → `409 { "error": "document_pending" }`. Do not release storage. An in-flight anchor must finish or fail first.
3. Otherwise call existing `releaseStorage` (soft delete + byte decrement).
4. Then `storage.delete(storageKey)` via `createObjectStorage()`. If the blob delete throws, still return 200: the quota row is already released. Log the key only, never the file bytes.
5. `200 { "ok": true }`.

Dialog copy:

- Draft or failed: "Se eliminará el documento y se liberará el espacio."
- Anchored: "Se quitará de tu cuenta y se liberará el espacio. El hash puede seguir en Stellar. La verificación pública puede seguir encontrándolo en la red." This matches `lookupAnchor`: a soft-deleted row is skipped in the database join, and a configured contract can still return `source: "chain"`.
- Confirm button uses `Button` `variant="destructive"`.
- Pending: no confirm dialog; the menu item is disabled with "No se puede eliminar mientras se ancla."

After success, toast "Documento eliminado." and `router.push("/dashboard/documents")` from the detail page, or refresh the list.

Do not hard-delete the `anchors` row. The receipt stays for the chain record.

## Client actions

| Action             | Where                       | Implementation                                                                                            |
| ------------------ | --------------------------- | --------------------------------------------------------------------------------------------------------- |
| Subir              | `/dashboard/documents/new`  | Existing POST routes                                                                                      |
| Anclar             | Detail and the anchor panel | Existing `POST /api/documents/:id/anchor`                                                                 |
| Copiar hash        | List menu and detail        | `navigator.clipboard.writeText(sha256)` then toast "Hash copiado." On failure, toast "No se pudo copiar." |
| Abrir verificación | List menu and detail        | Link `/v/${sha256}`                                                                                       |
| Eliminar           | List menu and detail        | `DELETE` above, confirm dialog                                                                            |

Toasts go through sonner. No `alert()`.

## Responsive and empty states

- Pages keep `px-4 py-12 sm:px-6` and `max-w-5xl`.
- Progress bars are full width of their card.
- Tables are `md+` only; cards below `md`.
- Empty states are a short sentence plus one action, not an illustration.
- Buttons that submit (`Subir`, `Anclar`, `Eliminar`) show a disabled pending label ("Subiendo…", "Anclando…", "Eliminando…").

## Files

```
components/ui/table.tsx              # CLI
components/ui/dialog.tsx             # CLI
components/ui/progress.tsx           # CLI
components/ui/badge.tsx              # CLI
components/ui/tabs.tsx               # CLI
components/ui/sonner.tsx             # CLI
components/ui/form.tsx               # CLI, only if it installs cleanly
components/dashboard-nav.tsx
components/document-status-badge.tsx
components/quota-progress.tsx        # label, used, limit, format
app/dashboard/layout.tsx             # shell + Toaster
app/dashboard/page.tsx               # overview, no upload form
app/dashboard/documents/page.tsx
app/dashboard/documents/new/page.tsx
app/dashboard/documents/[id]/page.tsx
app/dashboard/billing/page.tsx
app/dashboard/settings/page.tsx
app/dashboard/upload-form.tsx        # move usage to /new; QUOTA_STORAGE
app/dashboard/document-anchor-panel.tsx  # QUOTA_ANCHORS
app/dashboard/document-actions.tsx   # client: copy, verify, delete dialog
app/api/documents/[id]/route.ts      # add DELETE
lib/uploads/delete-document.ts
lib/uploads/delete-document.test.ts
lib/uploads/create-document.ts       # optional limit on listDocumentsForUser
pnpm-lock.yaml
```

Do not add `middleware.ts`. Protection stays in `proxy.ts`.

## Tests

No Playwright. No browser component tests.

`lib/uploads/delete-document.test.ts` on PGlite + the memory storage adapter:

- Owner soft-deletes a draft, `storage_used_bytes` drops, blob `delete` is called.
- Other user's id → not found, bytes unchanged.
- `pending` → `document_pending`, row stays, bytes unchanged.
- Anchored draft-equivalent (status `anchored` with an `anchors` row) soft-deletes the document and leaves the `anchors` row in place.

`pnpm test`, `pnpm lint`, `pnpm typecheck`, and `pnpm build` pass with Clerk, `DATABASE_URL`, Alchemy, and Stellar secrets unset. Pages that need a session are not executed at build time beyond Next's static analysis; do not import `getDb()` at module scope.

## Acceptance

- [ ] `/dashboard` shows storage, monthly anchors (including in-flight), and recent documents, with progress bars and an empty state.
- [ ] `/dashboard/documents` lists documents and filters Todos / Borrador / Anclado.
- [ ] `/dashboard/documents/new` uploads a file or text.
- [ ] `/dashboard/documents/[id]` shows hash, anchor action, receipt, copy, verify, and delete.
- [ ] `/dashboard/billing` shows the Free plan and limits; upgrade and buy-anchors controls are disabled and do not call the network.
- [ ] `/dashboard/settings` shows the Clerk profile fields and the plan name.
- [ ] Layout works at a narrow mobile width and at desktop: nav wraps, no table overflow on small screens.
- [ ] `pnpm build` and `pnpm test` stay green without Clerk or Stripe secrets.

## Out of scope

- Stripe, prices, or enabling `BILLING_ENABLED`.
- Editing file bytes, renaming, or re-hashing.
- Pagination beyond the 100-row cap.
- A documents API `?estado=` query parameter.
- Changing anchor job, contract, or verify semantics other than the delete copy above.
