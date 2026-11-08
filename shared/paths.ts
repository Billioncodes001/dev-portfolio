export const pageTitles: Record<string, string> = {
  "/": "Software Engineer",
  "/projects": "Selected Work",
  "/about": "About",
  "/gallery": "Gallery",
  "/experience": "Experience",
  "/skills": "Toolkit",
  "/education": "Education",
  "/blog": "Writing",
  "/achievements": "Recognition",
  "/testimonials": "Kind Words",
  "/contact": "Get in Touch",
  "/pocket": "ja. pocket",
  "/press": "In the News",
};

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const projectSlug = (project: { title: string; slug?: string }) =>
  project.slug || slugify(project.title);
