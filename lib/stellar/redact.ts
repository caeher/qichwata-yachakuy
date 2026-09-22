import { SERVER_SECRET_ENV_NAMES } from "@/lib/env/secret-names";

const SECRET_PATTERN = /\bS[A-Z2-7]{55}\b/g;

export function redact(
  text: string,
  env: Record<string, string | undefined> = process.env,
): string {
  let out = text;
  for (const name of SERVER_SECRET_ENV_NAMES) {
    const value = env[name]?.trim();
    if (value && value.length > 0) {
      out = out.split(value).join("[redacted]");
    }
  }
  out = out.replace(SECRET_PATTERN, "[redacted]");
  return out;
}
