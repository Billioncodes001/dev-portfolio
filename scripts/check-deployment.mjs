import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import JSON5 from "json5";

const config = JSON5.parse(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
const db = config.d1_databases.find((item) => item.binding === "DB");
assert.equal(config.name, "josiah-portfolio");
assert.equal(config.account_id, "40687c1a299192a1ba3add80961e429f");
assert.equal(config.vars.SITE_ORIGIN, "https://josiahadeyemo.me");
assert.equal(db?.database_name, "josiah-portfolio-db");
assert.match(
  db?.database_id || "",
  /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i,
);
assert.notEqual(
  db.database_id,
  "00000000-0000-0000-0000-000000000000",
  "Replace the local-only D1 ID with the parent-provided real database ID before deployment.",
);
assert(
  !Object.keys(config.vars).some((key) =>
    /TOKEN|SECRET|PASSWORD|KEY/i.test(key),
  ),
  "Use Wrangler secrets, never plaintext vars, for secrets.",
);
console.log("Deployment configuration is ready; no resources were changed.");
