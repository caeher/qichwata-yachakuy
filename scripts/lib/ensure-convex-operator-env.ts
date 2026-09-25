import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadDotEnvFile(relativePath: string) {
  const path = resolve(process.cwd(), relativePath);
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function tryLocalConvexAdminKey() {
  if (process.env.CONVEX_DEPLOY_KEY?.trim()) return;
  const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim() ?? "";
  const isLocal =
    /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/i.test(url) ||
    url.startsWith("http://127.0.0.1:") ||
    url.startsWith("http://localhost:");
  if (!isLocal) return;

  const configPath = resolve(process.cwd(), ".convex/local/default/config.json");
  if (!existsSync(configPath)) return;

  try {
    const config = JSON.parse(readFileSync(configPath, "utf8")) as {
      adminKey?: string;
    };
    const adminKey = config.adminKey?.trim();
    if (adminKey) {
      process.env.CONVEX_DEPLOY_KEY = adminKey;
    }
  } catch {
    // Local Convex config missing or invalid; operator must set CONVEX_DEPLOY_KEY.
  }
}

loadDotEnvFile(".env.local");
loadDotEnvFile(".env");
tryLocalConvexAdminKey();
