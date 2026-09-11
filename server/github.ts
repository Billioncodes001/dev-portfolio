import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import {
  createGitHubFeed as createFeed,
  type GitHubOptions,
} from "../shared/github";
export { mergeProjects, normalizeRepository } from "../shared/github";

export function createGitHubFeed(
  options: GitHubOptions & { cacheFile?: string },
) {
  const filename = options.cacheFile;
  return createFeed({
    ...options,
    cache: filename
      ? {
          load: () => readFile(filename, "utf8"),
          async save(value) {
            await mkdir(dirname(filename), { recursive: true, mode: 0o700 });
            await writeFile(filename + ".tmp", value, { mode: 0o600 });
            await rename(filename + ".tmp", filename);
          },
        }
      : options.cache,
  });
}
