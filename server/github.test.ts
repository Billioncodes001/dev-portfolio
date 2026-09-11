import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createGitHubFeed, mergeProjects } from "./github";
import { loadPortfolio, loadRepositoryPreviews } from "./content";
import { access } from "node:fs/promises";
import { repositoryPreviewsSchema } from "../shared/schema";

const base = await loadPortfolio(resolve("public"));
test("a first push is discovered even while GitHub reports zero size", async () => {
  let now = 1_800_000_000_000,
    published = false,
    probes = 0;
  const feed = createGitHubFeed({
    username: "billioncodes001",
    now: () => now,
    ttlMs: 100,
    fetcher: async (url) => {
      if (!String(url).includes("/commits?"))
        return Response.json([repo(99, { size: 0 })]);
      probes++;
      return published
        ? Response.json([{ sha: "a".repeat(40) }])
        : Response.json({ message: "empty" }, { status: 409 });
    },
  });
  assert.equal(
    (await feed.getPortfolio(base)).projects.length,
    base.projects.length,
  );
  published = true;
  now += 101;
  assert.equal(
    (await feed.getPortfolio(base)).projects.at(-1)?.slug,
    "github-99",
  );
  now += 101;
  assert.equal((await feed.getPortfolio(base)).github?.repositories, 1);
  assert.equal(
    probes,
    2,
    "unchanged verified repositories do not need another commit request",
  );
});
function repo(id = 1, overrides = {}) {
  return {
    id,
    name: "new-project-" + id,
    full_name: "billioncodes001/new-project-" + id,
    owner: { login: "billioncodes001" },
    html_url: "https://github.com/billioncodes001/new-project-" + id,
    description: "A useful public project.",
    homepage: null,
    language: "TypeScript",
    topics: ["react"],
    private: false,
    fork: false,
    archived: false,
    disabled: false,
    size: 20,
    stargazers_count: 2,
    pushed_at: "2026-09-10T12:00:00Z",
    created_at: "2026-09-10T10:00:00Z",
    ...overrides,
  };
}

test("repository previews attach case-insensitively and survive cached feed responses", async () => {
  let now = 1_800_000_000_000;
  let offline = false;
  const feed = createGitHubFeed({
    username: "billioncodes001",
    ttlMs: 100,
    now: () => now,
    previews: {
      "Billioncodes001/New-Project-1":
        "images/projects/app-launch-inspector.webp",
    },
    fetcher: async () => {
      if (offline) throw new Error("offline");
      return Response.json([repo()]);
    },
  });
  const first = await feed.getPortfolio(base);
  assert.equal(
    first.projects.at(-1)?.image,
    "images/projects/app-launch-inspector.webp",
  );
  assert.equal(first.projects.at(-1)?.source, "github");
  assert.equal(first.projects.at(-1)?.slug, "github-1");
  offline = true;
  now += 101;
  const cached = await feed.getPortfolio(base);
  assert.equal(cached.github?.status, "cached");
  assert.equal(cached.projects.at(-1)?.image, first.projects.at(-1)?.image);
  const merged = mergeProjects(
    [
      {
        ...base.projects[0],
        links: [{ text: "GitHub", href: repo().html_url }],
      },
    ],
    [first.projects.at(-1)!.repository!],
    {
      "billioncodes001/new-project-1":
        "images/projects/app-launch-inspector.webp",
    },
  );
  assert.equal(merged.length, 1);
  assert.equal(
    merged[0].image,
    base.projects[0].image,
    "curated screenshots take precedence",
  );
});

test("configured preview assets exist and external or traversing paths are rejected", async () => {
  const previews = await loadRepositoryPreviews(resolve("public"));
  assert.deepEqual(Object.keys(previews).sort(), [
    "billioncodes001/app-launch-inspector",
    "billioncodes001/billioncodes-academy",
    "billioncodes001/dev-portfolio",
    "billioncodes001/social-claim-verifier",
    "billioncodes001/x-browser-mcp",
  ]);
  for (const path of Object.values(previews))
    await access(resolve("public", path));
  const student = base.projects.find(
    (project) => project.title === "Polytechnic Students Record System",
  );
  assert.ok(student?.image);
  await access(resolve("public", student.image));
  for (const path of ["https://example.com/image.png", "images/../private.png"])
    assert.equal(
      repositoryPreviewsSchema.safeParse({ "owner/repo": path }).success,
      false,
    );
});
test("public discovery excludes private, empty, archived, forked, hidden, and foreign repositories", async () => {
  const values = [
    repo(),
    repo(2, { private: true }),
    repo(3, { size: 0 }),
    repo(4, { archived: true }),
    repo(5, { fork: true }),
    repo(6, { topics: ["portfolio-hide"] }),
    repo(7, { owner: { login: "someone-else" } }),
  ];
  const feed = createGitHubFeed({
    username: "billioncodes001",
    fetcher: async (url) =>
      String(url).includes("/commits?")
        ? Response.json(
            { message: "Git Repository is empty." },
            { status: 409 },
          )
        : Response.json(values),
  });
  const result = await feed.getPortfolio(base);
  assert.equal(result.projects.length, base.projects.length + 1);
  assert.equal(result.projects.at(-1)?.slug, "github-1");
  assert.equal(result.github?.repositories, 1);
});
test("new publications appear after cache expiry, with request coalescing and stable identifiers", async () => {
  let now = 1_800_000_000_000,
    calls = 0;
  const feed = createGitHubFeed({
    username: "billioncodes001",
    now: () => now,
    ttlMs: 100,
    fetcher: async () => {
      calls++;
      return Response.json(
        calls === 1
          ? [repo()]
          : [
              repo(2),
              repo(1, {
                name: "renamed",
                full_name: "billioncodes001/renamed",
              }),
            ],
      );
    },
  });
  const results = await Promise.all([
    feed.getPortfolio(base),
    feed.getPortfolio(base),
    feed.getPortfolio(base),
  ]);
  assert.equal(calls, 1);
  assert.equal(results[0].projects.length, base.projects.length + 1);
  now += 101;
  const updated = await feed.getPortfolio(base);
  assert.equal(updated.projects.length, base.projects.length + 2);
  assert.equal(updated.projects.at(-1)?.slug, "github-1");
  assert.equal(calls, 2);
});
test("curated cards retain images and are not duplicated by GitHub discovery", async () => {
  const feed = createGitHubFeed({
    username: "billioncodes001",
    fetcher: async () => Response.json([repo()]),
  });
  const data = await feed.getPortfolio(base);
  const repository = data.projects.at(-1)!.repository!;
  const curated = {
    ...base.projects[0],
    links: [{ text: "Rebuilt source", href: repository.url + ".git" }],
  };
  const merged = mergeProjects([curated], [repository]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].image, curated.image);
  assert.equal(merged[0].repository?.id, 1);
});
test("GitHub failures preserve selected work and the last successful public snapshot", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "portfolio-github-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const cacheFile = join(directory, "cache.json");
  let now = 1_800_000_000_000,
    fail = false,
    calls = 0;
  const feed = createGitHubFeed({
    username: "billioncodes001",
    cacheFile,
    now: () => now,
    ttlMs: 100,
    fetcher: async () => {
      calls++;
      return fail
        ? Response.json({}, { status: 429, headers: { "retry-after": "10" } })
        : Response.json([repo()]);
    },
  });
  await feed.getPortfolio(base);
  fail = true;
  now += 101;
  const stale = await feed.getPortfolio(base);
  assert.equal(stale.github?.status, "cached");
  assert.equal(stale.projects.length, base.projects.length + 1);
  await feed.getPortfolio(base);
  assert.equal(calls, 2);
  const restored = createGitHubFeed({
    username: "billioncodes001",
    cacheFile,
    now: () => now,
    fetcher: async () => {
      throw new Error("offline");
    },
  });
  assert.equal(
    (await restored.getPortfolio(base)).projects.length,
    base.projects.length + 1,
  );
  const cold = createGitHubFeed({
    username: "billioncodes001",
    fetcher: async () => {
      throw new Error("offline");
    },
  });
  assert.equal((await cold.getPortfolio(base)).github?.status, "unavailable");
  assert.equal(
    (await cold.getPortfolio(base)).projects.length,
    base.projects.length,
  );
});
test("pagination returns all repositories and unsafe homepage links are omitted", async () => {
  let requests = 0;
  const feed = createGitHubFeed({
    username: "billioncodes001",
    fetcher: async () => {
      requests++;
      return Response.json(
        requests === 1
          ? Array.from({ length: 100 }, (_, index) => repo(index + 1))
          : [repo(101, { homepage: "javascript:alert(1)" })],
      );
    },
  });
  const result = await feed.getPortfolio(base);
  assert.equal(requests, 2);
  assert.equal(result.github?.repositories, 101);
  assert.equal(result.projects.at(-1)?.links.length, 1);
});

test("batch first pushes use bounded probes and retain repository order", async () => {
  let active = 0;
  let peak = 0;
  const feed = createGitHubFeed({
    username: "billioncodes001",
    fetcher: async (url) => {
      if (!String(url).includes("/commits?"))
        return Response.json(
          Array.from({ length: 13 }, (_, i) => repo(i + 1, { size: 0 })),
        );
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active--;
      return Response.json([{ sha: "a".repeat(40) }]);
    },
  });
  const result = await feed.getPortfolio(base);
  assert.equal(peak, 4);
  assert.equal(active, 0);
  assert.equal(result.github?.repositories, 13);
  assert.deepEqual(
    result.projects
      .slice(base.projects.length)
      .map((project) => project.repository?.id),
    Array.from({ length: 13 }, (_, i) => i + 1),
  );
});
