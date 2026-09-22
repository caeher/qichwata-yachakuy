function isPublicApiPath(pathname: string): boolean {
  if (
    pathname === "/api/webhooks/clerk" ||
    pathname.startsWith("/api/webhooks/clerk/")
  ) {
    return true;
  }
  if (pathname === "/api/stellar/health") {
    return true;
  }
  if (pathname === "/api/verify") {
    return true;
  }
  if (pathname === "/api/storage/download") {
    return true;
  }
  return false;
}

export function isProtectedPath(pathname: string): boolean {
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return true;
  }
  if (!pathname.startsWith("/api/")) {
    return false;
  }
  return !isPublicApiPath(pathname);
}
