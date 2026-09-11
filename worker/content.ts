import gallery from "../public/profile/gallery.json";
import leadership from "../public/profile/leadership.json";
import home from "../public/profile/home.json";
import about from "../public/profile/about.json";
import projects from "../public/profile/projects.json";
import experiences from "../public/profile/experiences.json";
import skills from "../public/profile/skills.json";
import education from "../public/profile/education.json";
import social from "../public/profile/social.json";
import navbar from "../public/profile/navbar.json";
import blog from "../public/profile/blog.json";
import achievements from "../public/profile/achievements.json";
import testimonials from "../public/profile/testimonials.json";
import releaseData from "../public/profile/releases.json";
import previewData from "../public/profile/repository-previews.json";
import {
  portfolioSchema,
  projectSchema,
  releaseManifestSchema,
  repositoryPreviewsSchema,
} from "../shared/schema";
import { attachReleases } from "../shared/releases";

export const releases = releaseManifestSchema.parse(releaseData);
export const previews = repositoryPreviewsSchema.parse(previewData);
export const portfolio = portfolioSchema.parse({
  home,
  about,
  gallery: gallery.items,
  leadership: leadership.entries,
  projects: attachReleases(
    projects.projects.map((project) => projectSchema.parse(project)),
    releases,
  ),
  experiences: experiences.experiences,
  skills: skills.skills,
  education: education.education,
  social: social.social,
  resume: navbar.sections.find((section) => section.title === "Resume")?.href,
  blogs: blog.blogs,
  achievements: achievements.achievements,
  testimonials: testimonials.testimonials,
});
