import type { Project, ProjectRelease } from "./schema";

export const releaseLabels: Record<ProjectRelease["stage"], string> = {
  "local-tool": "Local tool",
  "private-pilot": "Private pilot",
  "browser-tool": "Browser-only tool",
  "developer-tool": "Developer tool",
};

export function repositoryKey(href: string): string | null {
  try {
    const url = new URL(href);
    if (url.username || url.password || url.origin !== "https://github.com")
      return null;
    const match = url.pathname.match(/^\/([a-z\d-]+\/[a-z\d._-]+)\/?$/i);
    return match ? match[1].replace(/\.git$/i, "").toLowerCase() : null;
  } catch {
    return null;
  }
}

// Local, reviewed release records are authoritative; GitHub descriptions are not verification.
export function attachReleases(
  projects: Project[],
  releases: Record<string, ProjectRelease>,
): Project[] {
  const byRepository = new Map(
    Object.entries(releases).map(([key, value]) => [key.toLowerCase(), value]),
  );
  return projects.map((project) => {
    const key = [
      project.repository?.url,
      ...project.links.map((link) => link.href),
    ]
      .filter((href): href is string => Boolean(href))
      .map(repositoryKey)
      .find((key) => key && byRepository.has(key));
    return key ? { ...project, release: byRepository.get(key) } : project;
  });
}
