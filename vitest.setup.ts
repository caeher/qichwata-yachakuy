/** Vitest uses PGlite; disable Convex env from .env.local during tests. */
delete process.env.NEXT_PUBLIC_CONVEX_URL;
delete process.env.CONVEX_DEPLOY_KEY;
delete process.env.CONVEX_DEPLOYMENT;
delete process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
