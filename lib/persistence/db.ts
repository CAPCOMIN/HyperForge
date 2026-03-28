import { mkdirSync } from "fs";
import path from "path";
import Database from "better-sqlite3";
import { schemaSql } from "@/lib/persistence/schema";
import { env } from "@/lib/utils/env";

declare global {
  // eslint-disable-next-line no-var
  var __hyperforgeDb: Database.Database | undefined;
}

function resolveDatabasePath() {
  const raw = env.DATABASE_URL.replace(/^file:/, "");
  const absolutePath = path.resolve(process.cwd(), raw);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  return absolutePath;
}

export function getDb() {
  if (!global.__hyperforgeDb) {
    global.__hyperforgeDb = new Database(resolveDatabasePath());
    global.__hyperforgeDb.exec(schemaSql);
    try {
      global.__hyperforgeDb.exec(
        "ALTER TABLE task_runs ADD COLUMN agent_runtime TEXT NOT NULL DEFAULT 'mock'"
      );
    } catch {}
    try {
      global.__hyperforgeDb.exec(
        "ALTER TABLE task_runs ADD COLUMN llm_model_name TEXT"
      );
    } catch {}
  }

  return global.__hyperforgeDb;
}
