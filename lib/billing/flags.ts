export function isBillingEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.BILLING_ENABLED === "true";
}
