import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const filename = resolve(
  root,
  process.env.DATA_DIR || "data",
  "messages.sqlite",
);
if (!existsSync(filename)) {
  console.log("No inbox yet. Start the server and submit a message first.");
} else {
  const db = new DatabaseSync(filename, { readOnly: true });
  console.log(
    JSON.stringify(
      db
        .prepare(
          "SELECT id, name, email, service, message, created_at FROM messages ORDER BY created_at DESC",
        )
        .all(),
      null,
      2,
    ),
  );
  db.close();
}
