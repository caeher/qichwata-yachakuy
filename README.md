# stellar-data-integrity

SaaS de integridad de datos: SHA-256 de archivos, textos y documentos anclado en Stellar (Soroban).

Este repositorio contiene el **scaffold** de la aplicación (Next.js 16.3.5, TypeScript, Tailwind CSS v4, shadcn/ui). La autenticación (Clerk), el anclaje en Stellar y la persistencia llegarán en issues posteriores.

## Requisitos

- Node.js `>=20.9.0` (se recomienda Node 22)
- [pnpm](https://pnpm.io/) 10

## Configuración local

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Scripts

| Comando             | Descripción               |
| ------------------- | ------------------------- |
| `pnpm dev`          | Servidor de desarrollo    |
| `pnpm build`        | Build de producción       |
| `pnpm start`        | Sirve el build            |
| `pnpm lint`         | ESLint                    |
| `pnpm typecheck`    | `tsc --noEmit`            |
| `pnpm format`       | Prettier (escribe)        |
| `pnpm format:check` | Prettier (solo comprueba) |

`next` está fijado en **16.3.5**. No actualices a `latest` sin acordarlo en el proyecto.

## Plan de implementación

Ver [`docs/plans/issue-01-scaffold.md`](docs/plans/issue-01-scaffold.md).
