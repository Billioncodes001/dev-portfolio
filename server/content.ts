import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  portfolioSchema,
  repositoryPreviewsSchema,
  releaseManifestSchema,
} from "../shared/schema";
import { attachReleases } from "../shared/releases";

export async function loadReleases(publicDir: string) {
  return releaseManifestSchema.parse(
    JSON.parse(
      await readFile(join(publicDir, "profile", "releases.json"), "utf8"),
    ),
  );
}

export async function loadRepositoryPreviews(publicDir: string) {
  const raw = await readFile(
    join(publicDir, "profile", "repository-previews.json"),
    "utf8",
  );
  return repositoryPreviewsSchema.parse(JSON.parse(raw));
}

export async function loadPortfolio(publicDir: string) {
  const names = [
    "home",
    "about",
    "projects",
    "experiences",
    "skills",
    "education",
    "social",
    "navbar",
    "blog",
    "achievements",
    "testimonials",
  ];
  const values = await Promise.all(
    names.map(async (name) =>
      JSON.parse(
        await readFile(join(publicDir, "profile", name + ".json"), "utf8"),
      ),
    ),
  );
  const content = Object.fromEntries(
    names.map((name, index) => [name, values[index]]),
  );
  return portfolioSchema.parse({
    home: content.home,
    about: content.about,
    projects: attachReleases(
      content.projects.projects,
      await loadReleases(publicDir),
    ),
    experiences: content.experiences.experiences,
    skills: content.skills.skills,
    education: content.education.education,
    social: content.social.social,
    resume: content.navbar.sections.find(
      (section: { title: string }) => section.title === "Resume",
    )?.href,
    blogs: content.blog.blogs,
    achievements: content.achievements.achievements,
    testimonials: content.testimonials.testimonials,
  });
}
