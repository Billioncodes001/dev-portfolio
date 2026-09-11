import { DatabaseSync } from "node:sqlite";
import { createHash, randomUUID } from "node:crypto";
import type { ContactInput } from "../shared/schema";

export function createStore(filename: string) {
  const db = new DatabaseSync(filename, { timeout: 5000 });
  db.exec(`PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY, request_key TEXT UNIQUE NOT NULL, payload_hash TEXT NOT NULL,
      name TEXT NOT NULL, email TEXT NOT NULL, service TEXT NOT NULL,
      message TEXT NOT NULL, created_at TEXT NOT NULL
    )`);
  return {
    save(input: ContactInput, key: string) {
      const hash = createHash("sha256")
        .update(JSON.stringify(input))
        .digest("hex");
      const existing = db
        .prepare("SELECT id, payload_hash FROM messages WHERE request_key = ?")
        .get(key);
      if (existing) {
        if (existing.payload_hash !== hash) return { conflict: true as const };
        return { id: String(existing.id), duplicate: true };
      }
      const id = randomUUID();
      db.prepare("INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
        id,
        key,
        hash,
        input.name,
        input.email,
        input.service,
        input.message,
        new Date().toISOString(),
      );
      return { id, duplicate: false };
    },
    list() {
      return db
        .prepare(
          "SELECT id, name, email, service, message, created_at FROM messages ORDER BY created_at DESC",
        )
        .all();
    },
    healthy() {
      return Boolean(db.prepare("SELECT 1").get());
    },
    close() {
      db.close();
    },
  };
}
export type MessageStore = ReturnType<typeof createStore>;
