# Clerk JWT for Convex

1. Clerk Dashboard → **JWT templates** → **New template** → choose **Convex** (slug must be `convex`, audience `convex`).
2. Copy the template **Issuer** (instance root, not the JWKS path), e.g. `https://rapid-crawdad-4559.clerk.accounts.dev`.
   - JWKS for verification: `{issuer}/.well-known/jwks.json` (Convex fetches this from the issuer domain).
3. Set on the Convex deployment (not only Next.js):

   ```bash
   pnpm convex:dev   # keep running
   npx convex env set CLERK_JWT_ISSUER_DOMAIN https://rapid-crawdad-4559.clerk.accounts.dev
   ```

4. Mirror the same value in `.env.local` for documentation and tooling.

`convex/auth.config.ts` already uses `applicationID: "convex"`; no code change needed after the template exists.
