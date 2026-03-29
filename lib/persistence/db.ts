import { mkdirSync } from "fs";
import path from "path";
import Database from "better-sqlite3";
import { hashPassword } from "@/lib/auth/password";
import { schemaSql } from "@/lib/persistence/schema";
import { env } from "@/lib/utils/env";
import { createId } from "@/lib/utils/ids";
import { nowIso } from "@/lib/utils/time";

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

function runSafeMigration(db: Database.Database, sql: string) {
  try {
    db.exec(sql);
  } catch {}
}

function seedUser(
  db: Database.Database,
  input: {
    username?: string;
    password?: string;
    displayName?: string;
    role: "admin" | "user";
    quotaLimit: number | null;
  }
) {
  if (!input.username || !input.password || !input.displayName) {
    return;
  }

  const existing = db
    .prepare("SELECT id FROM users WHERE username = ?")
    .get(input.username) as { id: string } | undefined;

  if (existing) {
    return;
  }

  const timestamp = nowIso();
  db.prepare(
    `
      INSERT INTO users (
        id, username, display_name, password_hash, role, status, quota_limit,
        password_version, created_at, updated_at, last_login_at
      )
      VALUES (
        @id, @username, @displayName, @passwordHash, @role, 'active', @quotaLimit,
        1, @createdAt, @updatedAt, NULL
      )
    `
  ).run({
    id: createId("user"),
    username: input.username,
    displayName: input.displayName,
    passwordHash: hashPassword(input.password),
    role: input.role,
    quotaLimit: input.quotaLimit,
    createdAt: timestamp,
    updatedAt: timestamp
  });
}

function bootstrapUsers(db: Database.Database) {
  seedUser(db, {
    username: env.AUTH_BOOTSTRAP_USERNAME,
    password: env.AUTH_BOOTSTRAP_PASSWORD,
    displayName: env.AUTH_BOOTSTRAP_DISPLAY_NAME,
    role: "admin",
    quotaLimit: null
  });
  seedUser(db, {
    username: env.AUTH_DEMO_USERNAME,
    password: env.AUTH_DEMO_PASSWORD,
    displayName: env.AUTH_DEMO_DISPLAY_NAME,
    role: "user",
    quotaLimit: 5
  });
}

export function getDb() {
  if (!global.__hyperforgeDb) {
    global.__hyperforgeDb = new Database(resolveDatabasePath());
    global.__hyperforgeDb.exec(schemaSql);
    runSafeMigration(
      global.__hyperforgeDb,
      "ALTER TABLE task_runs ADD COLUMN agent_runtime TEXT NOT NULL DEFAULT 'mock'"
    );
    runSafeMigration(
      global.__hyperforgeDb,
      "ALTER TABLE task_runs ADD COLUMN llm_model_name TEXT"
    );
    runSafeMigration(
      global.__hyperforgeDb,
      "ALTER TABLE task_runs ADD COLUMN user_id TEXT"
    );
    bootstrapUsers(global.__hyperforgeDb);
    runSafeMigration(
      global.__hyperforgeDb,
      `
        UPDATE task_runs
        SET user_id = (
          SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1
        )
        WHERE user_id IS NULL OR user_id = ''
      `
    );
  }

  return global.__hyperforgeDb;
}
