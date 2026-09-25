const FALLBACK_DESTINATION = "/dashboard";

/** Accept only same-site absolute paths for post-authentication navigation. */
export function safeReturnUrl(value: string | string[] | undefined): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return FALLBACK_DESTINATION;
  }

  if (/[\\\u0000-\u001f\u007f]/.test(value)) return FALLBACK_DESTINATION;

  try {
    const parsed = new URL(value, "https://yachay.invalid");
    if (parsed.origin !== "https://yachay.invalid") return FALLBACK_DESTINATION;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return FALLBACK_DESTINATION;
  }
}

export function currentPathWithQuery(url: URL): string {
  return safeReturnUrl(`${url.pathname}${url.search}`);
}
