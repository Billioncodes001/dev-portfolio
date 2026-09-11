import type { ContactInput } from "../shared/schema";
import { digest, HttpError } from "./security";

export interface SavedMessage {
  id: string;
  payload_hash: string;
}

export function findMessage(db: D1Database, key: string) {
  return db
    .prepare("SELECT id, payload_hash FROM messages WHERE request_key = ?")
    .bind(key)
    .first<SavedMessage>();
}

export function accepted(existing: SavedMessage, hash: string) {
  if (existing.payload_hash !== hash)
    throw new HttpError(
      409,
      "Request identifier already used for another message.",
    );
  return { accepted: true, id: existing.id };
}

export async function saveMessage(
  db: D1Database,
  input: ContactInput,
  key: string,
  hash: string,
) {
  // The unique key and atomic INSERT, not a read-then-write check, resolve concurrent retries.
  const results = await db.batch([
    db
      .prepare(
        `INSERT INTO messages (id, request_key, payload_hash, name, email, service, message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(request_key) DO NOTHING`,
      )
      .bind(
        crypto.randomUUID(),
        key,
        hash,
        input.name,
        input.email,
        input.service,
        input.message,
        new Date().toISOString(),
      ),
    db
      .prepare("SELECT id, payload_hash FROM messages WHERE request_key = ?")
      .bind(key),
  ]);
  const row = results[1].results[0] as unknown as SavedMessage | undefined;
  if (!row) throw new Error("Storage unavailable");
  return accepted(row, hash);
}

export async function rateLimit(
  db: D1Database,
  request: Request,
  now = Date.now(),
) {
  const windowMs = 15 * 60_000;
  const window = Math.floor(now / windowMs);
  const expires = (window + 1) * windowMs;
  const salt = await db
    .prepare("SELECT value FROM runtime_config WHERE key = 'rate_salt'")
    .first<string>("value");
  if (!salt) throw new Error("Rate limiter is not configured");
  // Only Cloudflare's edge-generated address is trusted. Missing IPs share one bucket.
  const key = await digest(
    salt +
      ":" +
      window +
      ":" +
      (request.headers.get("CF-Connecting-IP") || "unknown"),
  );
  const result = await db.batch([
    db
      .prepare("DELETE FROM contact_rate_limits WHERE expires_at <= ?")
      .bind(now),
    db
      .prepare(
        `INSERT INTO contact_rate_limits (key, count, expires_at) VALUES (?, 1, ?)
      ON CONFLICT(key) DO UPDATE SET count = count + 1 WHERE count < 5 RETURNING count`,
      )
      .bind(key, expires),
  ]);
  return {
    allowed: result[1].results.length > 0,
    retryAfter: Math.max(1, Math.ceil((expires - now) / 1000)),
  };
}
