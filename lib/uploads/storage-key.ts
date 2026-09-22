export function storageKeyFor(
  userId: string,
  documentId: string,
  now: Date = new Date(),
): string {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${userId}/${yyyy}/${mm}/${documentId}`;
}

export function keyBelongsToUser(key: string, userId: string): boolean {
  if (!userId || userId.length === 0) {
    return false;
  }
  if (key.includes("..") || key.startsWith("/") || key.includes("\\")) {
    return false;
  }
  const prefix = `${userId}/`;
  if (!key.startsWith(prefix)) {
    return false;
  }
  const remainder = key.slice(prefix.length);
  return remainder.length > 0;
}
