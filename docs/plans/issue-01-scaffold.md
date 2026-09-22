# Issue #1 — Scaffold plan

Status: plan only. Do not add Clerk, Stellar/Soroban, hashing logic, API routes, or a database in this issue.

Issue: https://github.com/caeher/stellar-data-integrity/issues/1
Repo at planning time: `main` @ `e4ffbb0` (`Initial commit`). The only tracked file is `README.md` (one Spanish product sentence). No `package.json`, no app source.

Implement on a new branch off `main` after this plan is merged (or off the latest `main` that contains this file). Do not implement the app on the docs branch that added this plan.

## Goal

Scaffold a pnpm Next.js App Router app pinned to `next@16.3.5`, with TypeScript strict, Tailwind CSS v4, ESLint, Prettier, shadcn/ui, a class-based light/dark theme, and a minimal Spanish landing page at `/`.

## Out of scope

- Clerk or any auth
- Stellar, Soroban, wallets, or hash anchoring
- Database, Convex, or server actions that persist data
- `npx convex dev` / `npx convex deploy`
- Real upload, SHA-256 computation, or API routes
- Extra shadcn components beyond the three listed below

## Preconditions

Verified while writing this plan (2026-09-22):

| Tool     | Version seen         | Requirement                                                                                             |
| -------- | -------------------- | ------------------------------------------------------------------------------------------------------- |
| Node     | v22.14.0 (`node -v`) | `next@16.3.5` engines: `>=20.9.0`. `prettier-plugin-tailwindcss@0.8.1` engines: `>=20.19`. Use Node 22. |
| pnpm     | 10.33.3              | Prefer the pnpm already on PATH. Do not upgrade pnpm as part of this issue.                             |
| corepack | 0.34.6               | Optional. `pnpm` is already installed.                                                                  |

`next@16.3.5` and `create-next-app@16.3.5` both exist on the npm registry. Peer range for React is `^18.2.0 || ^19.0.0`. The 16.3.5 app template hard-pins React to `19.2.8` (see `packages/create-next-app/templates/index.ts` on tag `v16.3.5`, `nextjsReactPeerVersion`).

## Package pins

### Written by `create-next-app@16.3.5` (do not loosen `next`)

From the v16.3.5 template installer. `next` and `eslint-config-next` are the create-next-app package version (exact, no caret). React is exact.

| Package                | Spec in `package.json` |
| ---------------------- | ---------------------- |
| `next`                 | `16.3.5`               |
| `react`                | `19.2.8`               |
| `react-dom`            | `19.2.8`               |
| `eslint-config-next`   | `16.3.5` (dev)         |
| `typescript`           | `^5` (dev)             |
| `@types/node`          | `^20` (dev)            |
| `@types/react`         | `^19` (dev)            |
| `@types/react-dom`     | `^19` (dev)            |
| `tailwindcss`          | `^4` (dev)             |
| `@tailwindcss/postcss` | `^4` (dev)             |
| `eslint`               | `^9` (dev)             |

After install, `pnpm-lock.yaml` is the resolved pin for every `^` range. Commit the lockfile. Do not bump `next` or `eslint-config-next` off `16.3.5`.

The CLI also sets `"packageManager": "pnpm@<version on PATH>"`. Leave that field as the CLI writes it (expected major 10 on the planning machine).

pnpm 10 writes `pnpm-workspace.yaml` (no `packages:` key):

```yaml
ignoredBuiltDependencies:
  - sharp
  - unrs-resolver
```

pnpm 11+ would write `allowBuilds` instead. Keep whichever file the CLI emits for the pnpm that actually runs. Do not hand-convert it.

Do not enable React Compiler. The 16.3.5 default is off. Do not pass `--react-compiler`.

### Added after the Next scaffold

Install these exact versions. shadcn runtime deps (`clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react`, `tw-animate-css`, `@base-ui/react` or `radix-ui`, and the `shadcn` CSS package) are chosen by the CLI. Do not hand-pin them ahead of `shadcn init`. Commit whatever versions the CLI writes into `package.json` and `pnpm-lock.yaml`.

| Package                       | Spec           | Why                                                                 |
| ----------------------------- | -------------- | ------------------------------------------------------------------- |
| `next-themes`                 | `0.4.6`        | Class-based theme provider. Peers include React 19.                 |
| `prettier`                    | `3.9.8` (dev)  | Formatter alongside ESLint.                                         |
| `eslint-config-prettier`      | `10.1.8` (dev) | Turns off ESLint rules that fight Prettier. Flat-config compatible. |
| `prettier-plugin-tailwindcss` | `0.8.1` (dev)  | Sorts Tailwind classes. Requires Node `>=20.19` and Prettier 3.     |

## Exact commands

Run from the repository root. `create-next-app .` uses `basename(cwd)` as the npm package name. This cloud workspace directory is `/workspace`, so the generated name will be `workspace`. Rename it in step 3. Do not scaffold into a nested folder (that creates a second app and can nest a `.git`).

### 1. Move the existing README out of the way

`create-next-app@16.3.5` treats `README.md` as a conflict. Allowlisted names include `.git` and `docs` (so this plan file is safe). `README.md` is not allowlisted. `isFolderEmpty` exits the process if it finds anything else.

```bash
mv README.md /tmp/stellar-data-integrity-README.md
```

The file is a single product sentence. Fold that sentence into the new README in step 8. Do not commit the generated Create Next App marketing README.

### 2. Scaffold with the pinned CLI

Non-interactive. Explicit flags so CI / `--yes` cannot pick Biome, the Pages Router, or a saved ESLint-off preference. `--disable-git` is required: the repo already has `.git`, and the default path runs `git init`.

```bash
pnpm create next-app@16.3.5 . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --use-pnpm \
  --disable-git \
  --import-alias "@/*" \
  --yes
```

Do not pass `--empty`, `--src-dir`, `--biome`, `--react-compiler`, `--use-npm`, `--rspack`, or `--example`.

This selects the `app-tw` / `ts` template: App Router, Tailwind v4 (`@import "tailwindcss"` in `app/globals.css`, `postcss.config.mjs` with `@tailwindcss/postcss`), `eslint.config.mjs` flat config, `tsconfig.json` with `"strict": true` and `"paths": { "@/*": ["./*"] }`.

If the command still exits on a conflict, delete only the listed conflict (never `.git` or `docs/`) and rerun the same command.

### 3. Assert the Next pin and fix the package name

```bash
node --input-type=module -e "
import { readFileSync } from 'node:fs';
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const next = pkg.dependencies?.next;
const eslintNext = pkg.devDependencies?.['eslint-config-next'];
if (next !== '16.3.5' || eslintNext !== '16.3.5') {
  console.error('Unexpected pin', { next, eslintNext });
  process.exit(1);
}
console.log('pins ok', { next, react: pkg.dependencies.react });
"
```

If that check fails (wrong create-next-app resolved):

```bash
pnpm add next@16.3.5 react@19.2.8 react-dom@19.2.8
pnpm add -D eslint-config-next@16.3.5
```

Then set in `package.json`:

- `"name": "stellar-data-integrity"`
- `"private": true` (already set by the template)
- scripts below

Required scripts (keep `start` from the template):

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "typecheck": "tsc --noEmit"
}
```

`dev` must not include `--webpack` unless the template added it (Turbopack is the 16.3.5 default, so the script stays `next dev`). Add two extra scripts; they do not replace the required four:

```json
{
  "format": "prettier --write .",
  "format:check": "prettier --check ."
}
```

Optional but useful: `"engines": { "node": ">=20.9.0" }`.

### 4. Initialize shadcn/ui

The current CLI (`https://ui.shadcn.com/docs/cli`, read 2026-09-22) treats `--defaults` as `--template next --preset nova`. Nova is Lucide + Geist, base color `neutral`, CSS variables on. `--yes` defaults to true. Pass the rest so a `pnpm-workspace.yaml` file cannot steer the CLI into monorepo mode, and so the component library is explicit.

```bash
pnpm dlx shadcn@latest init --defaults --base base --yes --no-monorepo --force
```

`--base base` is Base UI, which is the current recommended primitive library. Do not switch to Radix unless `pnpm typecheck` fails on the generated components and the failure is clearly the Base UI primitive. If you must fall back, rerun init with `--base radix` on a clean `components.json` and record the reason in the implementation PR.

If `--base` is rejected as incompatible with `--defaults`, drop `--base` only, rerun, and record the base the CLI actually wrote (`components.json` / installed primitive package).

Expected `components.json` (shape can grow; these values must hold):

- `style`: `nova`
- `rsc`: true
- `tsx`: true
- Tailwind CSS file: `app/globals.css`
- `tailwind.baseColor`: `neutral`
- `tailwind.cssVariables`: true
- aliases: `components` → `@/components`, `ui` → `@/components/ui`, `utils` → `@/lib/utils`
- icon library: `lucide`
- `lib/utils.ts` exists (`cn` helper)

Do not author `components.json` by hand before init.

#### If init fails with `ERR_PNPM_ADDING_TO_ROOT`

`create-next-app@16.3.5` writes `pnpm-workspace.yaml` for pnpm 10+. shadcn’s `pnpm add` can then refuse to install at the workspace root (shadcn-ui/ui#9178). Workaround, in order:

1. `mv pnpm-workspace.yaml /tmp/pnpm-workspace.yaml`
2. Rerun the same `shadcn init` command.
3. `mv /tmp/pnpm-workspace.yaml pnpm-workspace.yaml`
4. `pnpm install` so the lockfile matches both the shadcn deps and the restored workspace file.

Do not delete `pnpm-workspace.yaml` permanently. Do not add `packages: ['.']`.

### 5. Add the initial components and the theme package

```bash
pnpm dlx shadcn@latest add button card dropdown-menu --yes
pnpm add next-themes@0.4.6
pnpm add -D prettier@3.9.8 eslint-config-prettier@10.1.8 prettier-plugin-tailwindcss@0.8.1
```

That is the full UI set for this issue:

| File                              | Source                     | Used for                               |
| --------------------------------- | -------------------------- | -------------------------------------- |
| `components/ui/button.tsx`        | shadcn `button`            | Header toggle trigger and landing CTAs |
| `components/ui/card.tsx`          | shadcn `card`              | Three feature cards                    |
| `components/ui/dropdown-menu.tsx` | shadcn `dropdown-menu`     | Claro / Oscuro / Sistema menu          |
| `components/theme-provider.tsx`   | local, not a registry item | `next-themes` wrapper                  |
| `components/theme-toggle.tsx`     | local, not a registry item | Client toggle                          |
| `lib/utils.ts`                    | shadcn init                | `cn`                                   |

Do not run `shadcn add --all`.

### 6. Prettier beside ESLint

`.prettierrc.json`:

```json
{
  "plugins": ["prettier-plugin-tailwindcss"],
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all"
}
```

The Tailwind plugin must be the last Prettier plugin. It is the only one.

`.prettierignore`:

```
.next
node_modules
pnpm-lock.yaml
public
```

`eslint.config.mjs` already imports `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`. Append `eslint-config-prettier` last inside `defineConfig` so it wins over stylistic rules:

```js
import prettier from "eslint-config-prettier";
```

```js
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
```

Keep the generated `globalIgnores` list. Do not switch to Biome. Do not add a second ESLint config file.

### 7. Theme provider and root layout

Follow https://ui.shadcn.com/docs/dark-mode/next. Tailwind v4 + shadcn dark mode is the `.dark` class on `<html>`, not `data-theme`. `next-themes` defaults to `data-theme`, so `attribute="class"` is required.

`components/theme-provider.tsx`:

```tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

`components/theme-toggle.tsx` is a client component:

- `DropdownMenu` + `Button` variant `outline` size `icon`
- Lucide `Sun` / `Moon` icons (the nova preset installs `lucide-react`)
- Items call `setTheme("light" | "dark" | "system")` with Spanish labels: Claro, Oscuro, Sistema
- `aria-label="Cambiar tema"`
- Gate icon/label rendering on a `mounted` flag (`useEffect` + `useState`) so `useTheme()` does not hydrate-mismatch. Render the button shell before mount.

`app/layout.tsx` end state:

- Keep Geist and Geist Mono from `next/font/google` (the template and the nova preset both use Geist). Apply their CSS variables on `<body>`.
- If shadcn init injects a second font (a `<link>` or another `next/font` import), delete the duplicate and keep `next/font/google` only.
- `<html lang="es" suppressHydrationWarning>`. `suppressHydrationWarning` is required because `next-themes` edits `<html>` before hydration. It only covers that element.
- Wrap `{children}` in:

```tsx
<ThemeProvider
  attribute="class"
  defaultTheme="system"
  enableSystem
  disableTransitionOnChange
>
  {children}
</ThemeProvider>
```

- `<body>` classes include the font variables plus `min-h-svh bg-background text-foreground antialiased`.
- Metadata in Spanish:
  - `title`: `Integridad de datos en Stellar`
  - `description`: `SHA-256 de archivos, textos y documentos anclado en Stellar (Soroban).`
- Preserve the generated `LayoutProps<"/">` children typing if `pnpm typecheck` accepts it. If that global is missing, type the props as `{ children: React.ReactNode }` from `react`.

`app/globals.css`: keep the shadcn variable blocks (`:root`, `.dark`, `@theme inline`) produced by init. Do not restore the Create Next App demo palette over them. Confirm a dark variant exists (Tailwind v4 form is typically `@custom-variant dark (&:is(.dark *));`). Without it, the toggle will set `.dark` and the page will not change.

### 8. Landing page (`app/page.tsx`)

Replace the generated Create Next App page. One server component is enough. Import `ThemeToggle` (client) and the `Card` / `Button` primitives. No `"use client"` on the page itself.

Spanish copy, this structure:

1. Header: product name `stellar-data-integrity`, theme toggle aligned to the end. Sticky is unnecessary.
2. Hero
   - Eyebrow: `Integridad verificable`
   - Heading: `Ancla la huella de tus datos en Stellar`
   - Lead: `Calcula el SHA-256 de archivos, textos y documentos y deja una prueba anclada en Stellar (Soroban).`
   - Primary button label `Empezar pronto`, `disabled`, so it does not navigate to an auth flow that does not exist.
   - Secondary link `Ver cómo funciona` to `#como-funciona`.
3. Three cards in a responsive grid (1 column, 3 from `md`):
   - `Archivos` — `Huella SHA-256 de un archivo. El contenido no se publica en la cadena.`
   - `Texto` — `La misma prueba para un fragmento de texto.`
   - `Documentos` — `Preparado para documentos que quieras verificar después.`
4. Section `#como-funciona` with three short steps: calcular SHA-256, anclar el hash en Stellar, comprobar que el contenido no cambió.
5. Footer: `stellar-data-integrity` and a line that this screen is the scaffold (`Aún sin cuentas ni anclaje`).

Use semantic tokens (`bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`) so light and dark both work. No hex colors in the page. No stock Next/Vercel marketing SVGs. Delete `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, and `public/window.svg` if nothing imports them. Keep `app/favicon.ico`.

Layout: `max-w-5xl` content column, comfortable vertical padding, heading scale that stays readable at 320px. Cards stack on small screens. The theme toggle stays reachable without horizontal scroll.

### 9. `.env.example` and gitignore

The app-tw template writes `.env.example` containing `MY_HOST="example.com"`, and `.gitignore` contains `.env*`, which ignores `.env.example`. Fix both.

Replace `.env.example` with comments only. No values, no keys that look like secrets:

```bash
# Copy to .env.local for local development.
# Next.js loads .env.local and does not commit it.
# This issue has no Clerk, Stellar, or database variables yet.
#
# NEXT_PUBLIC_APP_URL=http://localhost:3000
```

In `.gitignore`, keep ignoring env files and un-ignore the example:

```
.env*
!.env.example
```

Do not create `.env`, `.env.local`, or `.env.development`.

### 10. README

Replace the generated README. Spanish. Include:

- What the product is (reuse the original sentence: SaaS de integridad de datos, SHA-256 de archivos/textos/documentos anclado en Stellar/Soroban).
- This repo is the Next.js 16.3.5 scaffold only. Clerk, Stellar, and persistence are later issues.
- Requirements: Node `>=20.9.0` (Node 22 recommended), pnpm 10.
- Setup:

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

- App URL: http://localhost:3000
- Scripts: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, plus `pnpm format` / `pnpm format:check`
- Note that `next` is pinned to `16.3.5` and must not be floated to `latest`

Delete any Create Next App “deploy to Vercel” boilerplate.

### 11. Verify

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
```

`pnpm format` first if Prettier check fails on files the CLI wrote, then rerun `format:check`.

Confirm:

- `package.json` `dependencies.next` is exactly `16.3.5`
- `components.json` exists and `components/ui/` contains `button.tsx`, `card.tsx`, `dropdown-menu.tsx`
- `git check-ignore -v .env.example` does not ignore it
- `git status` does not show `.env.local` or any secret
- `pnpm dev` serves `/` in Spanish with a working theme toggle (light, dark, system). A production `pnpm build` is the required gate; a quick `pnpm dev` click-through is required before the implementation PR because the page is user-visible.

`AGENTS.md` is part of the 16.3.5 recommended defaults (`agentsMd: true`). Keep the generated file if the CLI wrote it. Do not expand it into product docs.

## Folder structure (end state)

```
.
├── .env.example
├── .gitignore
├── .prettierrc.json
├── .prettierignore
├── AGENTS.md                      # only if create-next-app wrote it
├── README.md
├── app/
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── theme-provider.tsx
│   ├── theme-toggle.tsx
│   └── ui/
│       ├── button.tsx
│       ├── card.tsx
│       └── dropdown-menu.tsx
├── components.json
├── docs/plans/issue-01-scaffold.md
├── eslint.config.mjs
├── lib/utils.ts
├── next.config.ts
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── postcss.config.mjs
├── public/
└── tsconfig.json
```

`next-env.d.ts` is gitignored by the template. Leave that ignore in place. `node_modules/` and `.next/` stay untracked.

## Acceptance checklist

| Issue criterion                                                 | Done when                                                                                                                                                                  |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create-next-app` with App Router, TypeScript, Tailwind, ESLint | Command in step 2 was used. Evidence: `app/layout.tsx`, `app/page.tsx`, `tsconfig.json` (`strict: true`), `postcss.config.mjs`, `eslint.config.mjs`, `app/globals.css`.    |
| Exact pin `next@16.3.5`                                         | `package.json` `dependencies.next` is `16.3.5` (no caret). `eslint-config-next` is `16.3.5`. Lockfile committed.                                                           |
| shadcn/ui initialized                                           | `components.json` plus `components/ui/button.tsx`, `card.tsx`, `dropdown-menu.tsx` and `lib/utils.ts`.                                                                     |
| Root layout typography + theme provider                         | `app/layout.tsx` loads Geist via `next/font`, `lang="es"`, `suppressHydrationWarning`, and `components/theme-provider.tsx`. Toggle lives in `components/theme-toggle.tsx`. |
| Minimal landing at `/`                                          | `app/page.tsx` is the Spanish page in step 8. No demo Next.js links.                                                                                                       |
| Scripts `dev`, `build`, `lint`, `typecheck`                     | Those four keys exist in `package.json` and the step 11 commands exit 0.                                                                                                   |
| README with local setup                                         | `README.md` matches step 10.                                                                                                                                               |
| `.env.example` with no secrets                                  | File is comments only, and `.gitignore` contains `!.env.example`.                                                                                                          |
| pnpm preferred                                                  | `pnpm-lock.yaml` committed, `packageManager` starts with `pnpm@`, no `package-lock.json` or `yarn.lock`.                                                                   |
| Prettier alongside ESLint                                       | `.prettierrc.json`, `.prettierignore`, `eslint-config-prettier` last in `eslint.config.mjs`, `format` / `format:check` scripts.                                            |

## Risks

### `create-next-app` defaults vs pinning `next@16.3.5`

- `pnpm create next-app@latest` (and `pnpm create next-app` with no version) will not honor this issue. The command must be `pnpm create next-app@16.3.5`.
- The installer sets `next` from the `create-next-app` package version, so `@16.3.5` yields `"next": "16.3.5"` with no caret. A later `pnpm add next` or `pnpm update` will float it. Do not run those.
- Recommended defaults in v16.3.5 are TypeScript, Tailwind, App Router, no `src/`, no React Compiler, ESLint as the linter label, and `AGENTS.md`. Passing flags skips prompts. `--yes` alone is not enough: the `eslint: false` legacy preference key exists in the CLI, so pass `--eslint` explicitly.
- CI is detected as non-interactive. That is safe only because the command passes `--typescript --tailwind --eslint --app --disable-git`. Without `--disable-git`, the CLI runs `git init` inside an existing repository.
- The npm package name comes from the directory basename. On a cloud agent that directory is often `workspace`, not `stellar-data-integrity`. Rename `package.json` `name` after scaffolding.
- `README.md` blocks `create-next-app .`. `docs/` does not. Move the README first.
- React is pinned to `19.2.8` by the template, which satisfies the `next@16.3.5` peer range. Do not downgrade to React 18.

### shadcn on this Next + pnpm combo

- pnpm 10’s `pnpm-workspace.yaml` can make `shadcn init` fail with `ERR_PNPM_ADDING_TO_ROOT`. Use the move-aside workaround in step 4. Do not “fix” it by deleting the workspace file or by adding a fake `packages` list.
- `--defaults` selects preset `nova` (style `nova`, neutral, Geist, Lucide). Older blog posts still show `style: new-york` and `tailwind.config.js`. This template has no `tailwind.config.ts`; Tailwind v4 config lives in `app/globals.css`. Do not add a v3 config file to satisfy an old guide.
- shadcn init rewrites `app/globals.css` and may touch `app/layout.tsx`. Re-apply `lang="es"`, `suppressHydrationWarning`, and `ThemeProvider` after init.
- `next-themes` must use `attribute="class"`. The library default (`data-theme`) will not activate shadcn’s `.dark` tokens.
- Theme UI that reads `useTheme()` during SSR will hydration-mismatch. Mount-gate the toggle icons.
- Base UI vs Radix: stay on `--base base` unless typecheck fails.

### Tooling footguns

- Template `.gitignore` pattern `.env*` ignores `.env.example`. Add `!.env.example` or the acceptance file never gets committed.
- `next-env.d.ts` is gitignored on purpose. Do not force-add it.
- Prettier is not part of `create-next-app@16.3.5`. The template repo has a `.prettierrc.json` that is not copied into the app. Install Prettier yourself (step 5).
- `prettier-plugin-tailwindcss@0.8.1` refuses Node `<20.19`. The Next engine floor (`20.9.0`) is lower. Document Node 22 in the README.
- `tsc --noEmit` is the `typecheck` script. Do not point `typecheck` at `next build` (that duplicates `build` and hides type errors behind a bundler).
- Generated `public/*.svg` assets are marketing leftovers. Remove them when the landing stops referencing them so `next build` does not depend on unused files and the page does not show the Next.js demo.

## Implementation note for the coding agent

One PR, app scaffold only. Before opening it, run every command in step 11 and fix failures. In the PR body, paste the `next` version line from `package.json` and list any deviation (shadcn base fallback, pnpm-workspace workaround, Node version).
