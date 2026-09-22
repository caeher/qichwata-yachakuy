import { redact } from "@/lib/stellar/redact";

export function logAnchor(
  event: string,
  fields: Record<string, unknown>,
  env: NodeJS.ProcessEnv = process.env,
) {
  const line = redact(JSON.stringify({ msg: event, ...fields }), env);
  console.info(line);
}
