import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { loadPortfolio, loadReleases } from "./content";
import { attachReleases, repositoryKey } from "../shared/releases";
import { releaseManifestSchema } from "../shared/schema";
import { createGitHubFeed } from "./github";

const releases = await loadReleases(resolve("public"));
const base = await loadPortfolio(resolve("public"));
const [key, release] = Object.entries(releases)[0];

test("release evidence belongs to one repository and cannot claim production certification", () => {
  assert.ok(releaseManifestSchema.safeParse(releases).success);
  for (const change of [
    { setupUrl: "https://github.com/another/project" },
    { setupUrl: "https://github.com.evil.test/" + key },
    { setupUrl: "https://someone:secret@github.com/" + key },
    { ciUrl: "https://github.com/" + key + "/issues/1" },
    { stage: "production-ready" },
    { commit: "main" },
    { checkedOn: "2026-02-30" },
    { limitations: [] },
  ])
    assert.equal(
      releaseManifestSchema.safeParse({ [key]: { ...release, ...change } })
        .success,
      false,
    );
  assert.equal(
    releaseManifestSchema.safeParse({
      [key]: release,
      [key.toUpperCase()]: release,
    }).success,
    false,
  );
});

test("release identity is case-insensitive but excludes foreign URLs and unknown repositories", () => {
  assert.equal(
    repositoryKey("https://github.com/" + key.toUpperCase() + ".git"),
    key,
  );
  assert.equal(repositoryKey("https://github.com/" + key + "/issues/1"), null);
  assert.equal(repositoryKey("https://gitlab.com/" + key), null);
  const unreviewed = { ...base.projects[0] };
  delete unreviewed.release;
  const projects = attachReleases(
    [
      {
        ...unreviewed,
        links: [
          { text: "Source", href: "https://github.com/" + key.toUpperCase() },
        ],
      },
      {
        ...unreviewed,
        links: [{ text: "Source", href: "https://github.com/unknown/repo" }],
      },
    ],
    releases,
  );
  assert.deepEqual(projects[0].release, release);
  assert.equal(projects[1].release, undefined);
});

test("disabled GitHub discovery preserves reviewed curated releases", async () => {
  const feed = createGitHubFeed({
    username: "billioncodes001",
    enabled: false,
    releases,
  });
  const result = await feed.getPortfolio(base);
  assert.ok(
    result.projects.some(
      (project) => project.release?.commit === release.commit,
    ),
  );
  assert.equal(result.projects.length, base.projects.length);
});

test("discovered releases survive outages but repository descriptions never grant verification", async () => {
  let offline = false;
  let now = 1_800_000_000_000;
  const [owner, name] = key.split("/");
  const repository = {
    id: 7001,
    name,
    full_name: key,
    owner: { login: owner },
    html_url: "https://github.com/" + key,
    description: "Production ready, according to an untrusted description.",
    homepage: null,
    language: "TypeScript",
    topics: [],
    private: false,
    fork: false,
    archived: false,
    disabled: false,
    size: 20,
    stargazers_count: 0,
    pushed_at: "2026-09-10T12:00:00Z",
    created_at: "2026-09-10T10:00:00Z",
  };
  const feed = createGitHubFeed({
    username: owner,
    releases,
    ttlMs: 100,
    now: () => now,
    fetcher: async () => {
      if (offline) throw new Error("offline");
      return Response.json([
        repository,
        {
          ...repository,
          id: 7002,
          name: "unreviewed",
          full_name: owner + "/unreviewed",
          html_url: "https://github.com/" + owner + "/unreviewed",
        },
      ]);
    },
  });
  const first = await feed.getPortfolio({ ...base, projects: [] });
  assert.equal(first.projects[0].release?.commit, release.commit);
  assert.equal(first.projects[1].release, undefined);
  offline = true;
  now += 101;
  const cached = await feed.getPortfolio({ ...base, projects: [] });
  assert.equal(cached.github?.status, "cached");
  assert.deepEqual(
    cached.projects.map((project) => project.release),
    first.projects.map((project) => project.release),
  );
});
