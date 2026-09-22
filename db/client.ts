import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/db/schema";

type GlobalDb = {
  sql?: ReturnType<typeof postgres>;
  db?: ReturnType<typeof drizzle<typeof schema>>;
};

const globalForDb = globalThis as unknown as GlobalDb;

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  if (!globalForDb.sql) {
    globalForDb.sql = postgres(url, { max: 10, prepare: false });
  }
  if (!globalForDb.db) {
    globalForDb.db = drizzle(globalForDb.sql, { schema });
  }

  return globalForDb.db;
}

export type Database = ReturnType<typeof getDb>;
