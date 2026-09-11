import { z } from "zod";
import {
  type Portfolio,
  type Project,
  repositorySchema,
  type ProjectRelease,
} from "../shared/schema";
import { attachReleases } from "../shared/releases";

const remoteSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  full_name: z.string(),
  owner: z.object({ login: z.string() }),
  html_url: z.url(),
  description: z.string().nullable(),
  homepage: z.string().nullable(),
  language: z.string().nullable(),
  topics: z.array(z.string()).default([]),
  private: z.boolean(),
  fork: z.boolean(),
  archived: z.boolean(),
  disabled: z.boolean().default(false),
  size: z.number(),
  stargazers_count: z.number().int().nonnegative(),
  pushed_at: z.string().nullable(),
  created_at: z.string(),
});
type RemoteRepo = z.infer<typeof remoteSchema>;
type Repo = z.infer<typeof repositorySchema>;
const cacheSchema = z.object({
  username: z.string(),
  syncedAt: z.string(),
  repositories: z.array(repositorySchema),
});

export interface GitHubOptions {
  username: string;
  cache?: {
    load: () => Promise<string>;
    save: (value: string) => Promise<void>;
  };
  token?: string;
  enabled?: boolean;
  fetcher?: typeof fetch;
  now?: () => number;
  ttlMs?: number;
  maxRequests?: number;
  previews?: Record<string, string>;
  releases?: Record<string, ProjectRelease>;
}

export function normalizeRepository(
  repo: RemoteRepo,
  username: string,
  hasContents = repo.size > 0,
): Repo | null {
  if (
    repo.private ||
    repo.fork ||
    repo.archived ||
    repo.disabled ||
    !hasContents ||
    repo.owner.login.toLowerCase() !== username.toLowerCase() ||
    repo.topics.includes("portfolio-hide") ||
    repo.name.toLowerCase() === username.toLowerCase()
  )
    return null;
  const expected = repo.owner.login + "/" + repo.name;
  if (repo.full_name.toLowerCase() !== expected.toLowerCase()) return null;
  const homepage =
    repo.homepage && /^https?:\/\//i.test(repo.homepage)
      ? repo.homepage
      : undefined;
  return repositorySchema.parse({
    id: repo.id,
    name: repo.name,
    fullName: expected,
    url: "https://github.com/" + expected,
    description:
      repo.description ||
      "A public project by " +
        repo.owner.login +
        ". Explore the repository for documentation and source code.",
    language: repo.language,
    topics: repo.topics.filter((topic) => topic !== "portfolio-hide"),
    stars: repo.stargazers_count,
    updatedAt: repo.pushed_at || repo.created_at,
    ...(homepage ? { homepage } : {}),
  });
}

function repositoryIdentity(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.toLowerCase() !== "github.com") return null;
    return parsed.pathname
      .replace(/^\//, "")
      .replace(/\/$/, "")
      .replace(/\.git$/, "")
      .toLowerCase();
  } catch {
    return null;
  }
}

export function mergeProjects(
  curated: Project[],
  repositories: Repo[],
  previews: Record<string, string> = {},
): Project[] {
  const images = new Map(
    Object.entries(previews).map(([name, path]) => [name.toLowerCase(), path]),
  );
  const remaining = new Map(
    repositories.map((repo) => [repo.fullName.toLowerCase(), repo]),
  );
  const preserved = curated.map((project) => {
    const identity = project.links
      .map((link) => repositoryIdentity(link.href))
      .find((key) => key && remaining.has(key));
    if (!identity) return project;
    const repository = remaining.get(identity)!;
    remaining.delete(identity);
    return {
      ...project,
      image: project.image || images.get(identity),
      repository,
    };
  });
  const discovered: Project[] = [...remaining.values()].map((repo) => ({
    title: repo.name
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase()),
    slug: "github-" + repo.id,
    source: "github",
    repository: repo,
    image: images.get(repo.fullName.toLowerCase()),
    bodyText: repo.description,
    tags: [
      ...new Set(
        [repo.language, ...repo.topics].filter((value): value is string =>
          Boolean(value),
        ),
      ),
    ],
    links: [
      { text: "GitHub", href: repo.url },
      ...(repo.homepage ? [{ text: "Live", href: repo.homepage }] : []),
    ],
  }));
  return [...preserved, ...discovered];
}

export function createGitHubFeed(options: GitHubOptions) {
  if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(options.username))
    throw new Error("Invalid GitHub username");
  const now = options.now || Date.now;
  const fetcher = options.fetcher || fetch;
  const ttl = options.ttlMs ?? 5 * 60_000;
  let repositories: Repo[] = [];
  let syncedAt: string | null = null;
  let nextAttempt = 0;
  let failed = false;
  let inFlight: Promise<void> | null = null;
  const confirmedContents = new Map<number, string>();
  const restore = options.cache
    ? options.cache
        .load()
        .then((raw) => {
          const cache = cacheSchema.parse(JSON.parse(raw));
          if (cache.username.toLowerCase() !== options.username.toLowerCase())
            return;
          if (
            now() - Date.parse(cache.syncedAt) > 24 * 60 * 60_000 ||
            !Number.isFinite(Date.parse(cache.syncedAt))
          )
            return;
          repositories = cache.repositories.filter(
            (repo) =>
              repo.fullName.split("/")[0].toLowerCase() ===
              options.username.toLowerCase(),
          );
          syncedAt = cache.syncedAt;
          nextAttempt = Date.parse(cache.syncedAt) + ttl;
          failed = true;
          for (const repo of repositories)
            confirmedContents.set(repo.id, repo.updatedAt);
        })
        .catch(() => undefined)
    : Promise.resolve();

  async function refresh() {
    const signal = AbortSignal.timeout(10_000);
    let requests = 0;
    async function request(url: string, allowEmpty = false) {
      if (++requests > (options.maxRequests ?? 2000))
        throw new Error("GitHub refresh request budget exhausted");
      const response = await fetcher(url, {
        signal,
        redirect: "manual",
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "Josiah-Adeyemo-Portfolio",
          ...(options.token
            ? { Authorization: "Bearer " + options.token }
            : {}),
        },
      });
      if (
        !response.ok &&
        !(allowEmpty && [404, 409].includes(response.status))
      ) {
        const retryAfter =
          Number(response.headers.get("retry-after") || 0) * 1000;
        const reset =
          Number(response.headers.get("x-ratelimit-reset") || 0) * 1000 - now();
        nextAttempt =
          now() +
          Math.max(ttl, Math.min(Math.max(retryAfter, reset), 60 * 60_000));
        throw new Error("GitHub returned " + response.status);
      }
      return response;
    }
    try {
      const fresh: Repo[] = [];
      for (let page = 1; page <= 10; page++) {
        const response = await request(
          "https://api.github.com/users/" +
            options.username +
            "/repos?type=owner&sort=created&direction=desc&per_page=100&page=" +
            page,
        );
        const parsed = z.array(remoteSchema).parse(await response.json());
        const checked: (Repo | null)[] = Array(parsed.length).fill(null);
        let nextIndex = 0;
        let failure: unknown;
        // Bound first-push probes so a batch publication fits the refresh
        // deadline without creating an unbounded burst of API requests.
        async function verifyContents() {
          while (!failure && nextIndex < parsed.length) {
            const index = nextIndex++;
            const item = parsed[index];
            try {
              const repo = normalizeRepository(item, options.username, true);
              if (!repo) continue;
              if (
                item.size === 0 &&
                confirmedContents.get(repo.id) !== repo.updatedAt
              ) {
                const commits = await request(
                  "https://api.github.com/repos/" +
                    encodeURIComponent(item.owner.login) +
                    "/" +
                    encodeURIComponent(item.name) +
                    "/commits?per_page=1",
                  true,
                );
                if (!commits.ok) continue;
                const history = z
                  .array(z.object({ sha: z.string().regex(/^[a-f0-9]{40}$/i) }))
                  .parse(await commits.json());
                if (history.length === 0) continue;
              }
              confirmedContents.set(repo.id, repo.updatedAt);
              checked[index] = repo;
            } catch (error) {
              failure = error || new Error("GitHub verification failed");
            }
          }
        }
        await Promise.all(
          Array.from({ length: Math.min(4, parsed.length) }, verifyContents),
        );
        if (failure) throw failure;
        fresh.push(...checked.filter((repo): repo is Repo => repo !== null));
        if (parsed.length < 100) break;
        if (page === 10) throw new Error("GitHub pagination limit reached");
      }
      repositories = [
        ...new Map(fresh.map((repo) => [repo.id, repo])).values(),
      ];
      syncedAt = new Date(now()).toISOString();
      failed = false;
      if (options.cache) {
        try {
          await options.cache.save(
            JSON.stringify({
              username: options.username,
              syncedAt,
              repositories,
            }),
          );
        } catch {
          console.warn(
            "GitHub persistent cache unavailable; memory cache retained.",
          );
        }
      }
    } catch {
      failed = true;
    } finally {
      nextAttempt = Math.max(nextAttempt, now() + ttl);
    }
  }

  return {
    async getPortfolio(base: Portfolio): Promise<Portfolio> {
      if (options.enabled === false)
        return {
          ...base,
          projects: attachReleases(base.projects, options.releases || {}),
        };
      await restore;
      if (now() >= nextAttempt) {
        if (!inFlight)
          inFlight = refresh().finally(() => {
            inFlight = null;
          });
        await inFlight;
      }
      return {
        ...base,
        projects: attachReleases(
          mergeProjects(base.projects, repositories, options.previews),
          options.releases || {},
        ),
        github: {
          username: options.username,
          status: failed ? (syncedAt ? "cached" : "unavailable") : "live",
          syncedAt,
          repositories: repositories.length,
        },
      };
    },
  };
}
