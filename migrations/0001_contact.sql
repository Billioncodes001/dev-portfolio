CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  request_key TEXT NOT NULL UNIQUE,
  payload_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  service TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_created_at ON messages(created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS contact_rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_limits_expiry ON contact_rate_limits(expires_at);

-- Private random salt prevents dictionary reversal of short-lived IP hashes.
CREATE TABLE IF NOT EXISTS runtime_config (key TEXT PRIMARY KEY, value TEXT NOT NULL);
INSERT OR IGNORE INTO runtime_config VALUES ('rate_salt', lower(hex(randomblob(32))));

CREATE TABLE IF NOT EXISTS github_cache (
  username TEXT PRIMARY KEY,
  snapshot TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
