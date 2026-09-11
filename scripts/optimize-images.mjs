import { readdir } from "node:fs/promises";
import sharp from "sharp";

const directory = new URL("../public/images/projects/", import.meta.url);
for (const file of await readdir(directory)) {
  if (!file.endsWith(".png")) continue;
  const source = new URL(file, directory);
  await sharp(source.pathname)
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(new URL(file.replace(/\.png$/, ".webp"), directory).pathname);
}
console.log(
  "Generated optimized WebP project previews; originals are preserved.",
);
