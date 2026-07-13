import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import session from "express-session";
import { env } from "../config/env.js";

fs.mkdirSync(path.dirname(env.DATABASE_PATH), { recursive: true });
fs.mkdirSync(path.join(env.DATA_DIR, "uploads"), { recursive: true });
fs.mkdirSync(path.join(env.DATA_DIR, "outputs"), { recursive: true });

export const db = new Database(env.DATABASE_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const schemaPath = path.resolve("server/db/schema.sql");
db.exec(fs.readFileSync(schemaPath, "utf8"));

export class SqliteSessionStore extends session.Store {
  get(sid: string, callback: (err?: unknown, session?: session.SessionData | null) => void) {
    try {
      const row = db
        .prepare("SELECT data, expires_at FROM http_sessions WHERE sid = ?")
        .get(sid) as { data: string; expires_at: number } | undefined;
      if (!row || row.expires_at < Date.now()) {
        if (row) db.prepare("DELETE FROM http_sessions WHERE sid = ?").run(sid);
        callback(undefined, null);
        return;
      }
      callback(undefined, JSON.parse(row.data));
    } catch (error) {
      callback(error);
    }
  }

  set(sid: string, value: session.SessionData, callback?: (err?: unknown) => void) {
    try {
      const expiresAt = value.cookie.expires?.getTime() ?? Date.now() + 12 * 60 * 60 * 1000;
      db.prepare(
        "INSERT INTO http_sessions(sid, data, expires_at) VALUES (?, ?, ?) ON CONFLICT(sid) DO UPDATE SET data = excluded.data, expires_at = excluded.expires_at",
      ).run(sid, JSON.stringify(value), expiresAt);
      callback?.();
    } catch (error) {
      callback?.(error);
    }
  }

  destroy(sid: string, callback?: (err?: unknown) => void) {
    try {
      db.prepare("DELETE FROM http_sessions WHERE sid = ?").run(sid);
      callback?.();
    } catch (error) {
      callback?.(error);
    }
  }
}
