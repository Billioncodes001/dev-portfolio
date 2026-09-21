import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import sharp from "sharp";
import { loadPortfolio, loadRepositoryPreviews } from "./content";
import { mergeProjects } from "../shared/github";

const privateSlugs = ["osint-neural", "vantage", "overlay-studio", "mymecho"];

test("private-source showcases publish only reviewed case-study links and decodable previews", async () => {
  const portfolio = await loadPortfolio(resolve("public"));
  for (const slug of privateSlugs) {
    const matches = portfolio.projects.filter(
      (project) => project.slug === slug,
    );
    assert.equal(matches.length, 1, slug);
    const project = matches[0];
    assert.equal(project.sourceVisibility, "private");
    assert.match(project.rebuildNote || "", /private/i);
    const expected = `https://github.com/Billioncodes001/dev-portfolio/blob/main/docs/projects/${slug}.md`;
    assert.ok(project.links.some((link) => link.href === expected));
    for (const link of project.links) {
      const url = new URL(link.href);
      if (url.hostname === "github.com") assert.equal(link.href, expected);
    }
    const document = await readFile(
      resolve("docs/projects", `${slug}.md`),
      "utf8",
    );
    assert.match(document, /## Verification/);
    assert.ok(document.includes(`../../public/${project.image}`));
    assert.doesNotMatch(document, /\/Users\/|file:\/\/|github_pat_/);
    const { info } = await sharp(resolve("public", project.image!))
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert.ok(info.width >= 1000 && info.height >= 700, slug);
  }
});

test("new public work has previews and GitHub discovery does not duplicate the curated studio", async () => {
  const portfolio = await loadPortfolio(resolve("public"));
  const previews = await loadRepositoryPreviews(resolve("public"));
  for (const name of ["tunji-ojo", "prank-studio"]) {
    const image = previews[`billioncodes001/${name}`];
    assert.ok(image);
    await sharp(resolve("public", image)).raw().toBuffer();
  }
  const merged = mergeProjects(
    portfolio.projects,
    [
      {
        id: 900000001,
        name: "prank-studio",
        fullName: "Billioncodes001/prank-studio",
        url: "https://github.com/Billioncodes001/prank-studio",
        description: "Fictional prop studio",
        language: "TypeScript",
        topics: [],
        stars: 0,
        updatedAt: "2026-09-21T00:00:00Z",
      },
    ],
    previews,
  );
  assert.equal(merged.length, portfolio.projects.length);
  assert.equal(
    merged.filter((project) => project.repository?.name === "prank-studio")
      .length,
    1,
  );
});
