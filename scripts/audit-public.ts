import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { join, resolve, relative } from "node:path";
import {
  loadPortfolio,
  loadReleases,
  loadRepositoryPreviews,
} from "../server/content";

const root = resolve("public");
const errors: string[] = [];
const sensitive =
  /(?:\/Users\/[^\s"']+|\/private\/(?:tmp|var)\/|file:\/\/|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bgh[pousr]_[a-zA-Z0-9]{20,}|\bgithub_pat_[a-zA-Z0-9_]{20,}|\bAKIA[A-Z0-9]{16})/;
let files = 0,
  images = 0;
async function walk(directory: string) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      errors.push("Public symlink: " + relative(root, path));
      continue;
    }
    if (entry.isDirectory()) {
      await walk(path);
      continue;
    }
    files++;
    if (/(?:^\.|\.sqlite(?:-|$)|\.map$|\.pem$|\.key$|\.env)/.test(entry.name))
      errors.push("Private-looking public asset: " + entry.name);
    if (!/\.(?:json|html|js|css|txt|svg)$/.test(entry.name)) continue;
    const text = await readFile(path, "utf8");
    if (sensitive.test(text))
      errors.push("Potential secret/local path: " + relative(root, path));
    if (entry.name.endsWith(".json")) await inspect(JSON.parse(text), path);
  }
}
async function inspect(value: unknown, source: string): Promise<void> {
  if (typeof value === "string") {
    if (/^\/?images\//.test(value)) {
      images++;
      const asset = resolve(root, value.replace(/^\//, ""));
      if (!asset.startsWith(root + "/"))
        errors.push("Asset escapes public: " + value);
      else
        try {
          await access(asset);
        } catch {
          errors.push(relative(root, source) + ": missing " + value);
        }
    }
    if (/^(?:file|javascript|data):/i.test(value))
      errors.push("Unsafe public URL in " + relative(root, source));
    if (/^https?:\/\//.test(value)) {
      const url = new URL(value);
      if (
        url.username ||
        url.password ||
        /^(?:localhost|127\.|0\.0\.0\.0|\[::1\])/.test(url.hostname)
      )
        errors.push("Private/credentialed URL in " + relative(root, source));
    }
  } else if (Array.isArray(value)) {
    for (const item of value) await inspect(item, source);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) await inspect(item, source);
  }
}
const portfolio = await loadPortfolio(root);
assert.equal(
  portfolio.testimonials.length,
  0,
  "Launch gate: no unsupported testimonials",
);
assert.equal(
  portfolio.achievements.length,
  0,
  "Launch gate: no unsupported awards or credentials",
);
assert.equal(
  portfolio.blogs.length,
  0,
  "Launch gate: no unverified article URLs",
);
await loadReleases(root);
await loadRepositoryPreviews(root);
await walk(root);
try {
  await access("dist");
  await walk(resolve("dist"));
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}
assert.deepEqual(
  errors,
  [],
  "Public content audit failed (review before publication)",
);
console.log(
  `Public audit passed: ${files} files; ${images} referenced image paths. No matching secrets/local paths or missing local images.`,
);
console.log(
  "Unsupported testimonial, award and article arrays are empty. Owner-supplied employment, degree labels and resume destination remain unverified. This technical audit does not certify claims or Git history.",
);
