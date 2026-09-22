export function resolveSignedUrlTtl(
  env: Record<string, string | undefined> = process.env,
): number {
  const raw = env.STORAGE_SIGNED_URL_TTL_SECONDS?.trim();
  if (!raw || !/^\d+$/.test(raw)) {
    return 60;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) {
    return 60;
  }
  return Math.min(300, Math.max(15, n));
}
