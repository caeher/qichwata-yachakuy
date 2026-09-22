const SECRET_PATTERN = /\bS[A-Z2-7]{55}\b/g;

export function redact(
  text: string,
  env: Record<string, string | undefined> = process.env,
): string {
  let out = text;
  const key = env.ALCHEMY_STELLAR_API_KEY?.trim();
  if (key && key.length > 0) {
    out = out.split(key).join("[redacted]");
  }
  const hot = env.STELLAR_HOT_WALLET_SECRET?.trim();
  if (hot && hot.length > 0) {
    out = out.split(hot).join("[redacted]");
  }
  out = out.replace(SECRET_PATTERN, "[redacted]");
  return out;
}
