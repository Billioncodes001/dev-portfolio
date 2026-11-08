import { z } from "zod";

const text = z.string().trim().min(1);
const webUrl = z
  .url()
  .refine((value) => /^https?:\/\//i.test(value), "Use an HTTP or HTTPS URL");
const asset = text.refine(
  (value) => /^\/?images\/[\w./-]+$/.test(value) && !value.includes(".."),
  "Invalid image path",
);
const link = z.object({ text, href: webUrl });

export const projectReleaseSchema = z.object({
  stage: z.enum([
    "local-tool",
    "private-pilot",
    "browser-tool",
    "developer-tool",
  ]),
  checkedOn: z.iso.date(),
  commit: z.string().regex(/^[a-f0-9]{40}$/),
  summary: text.max(500),
  verification: text.max(500),
  setupUrl: webUrl,
  ciUrl: webUrl.optional(),
  notes: z.array(text.max(300)).min(1).max(8),
  limitations: z.array(text.max(300)).min(1).max(8),
});
export const releaseManifestSchema = z
  .record(z.string().regex(/^[a-z\d-]+\/[a-z\d._-]+$/i), projectReleaseSchema)
  .superRefine((records, ctx) => {
    const seen = new Set<string>();
    for (const [key, release] of Object.entries(records)) {
      if (seen.has(key.toLowerCase()))
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: "Duplicate repository identity",
        });
      seen.add(key.toLowerCase());
      for (const [field, href] of [
        ["setupUrl", release.setupUrl],
        ["ciUrl", release.ciUrl],
      ] as const) {
        if (!href) continue;
        const url = new URL(href);
        const parts = url.pathname.split("/").filter(Boolean);
        if (
          url.username ||
          url.password ||
          url.origin !== "https://github.com" ||
          parts.slice(0, 2).join("/").toLowerCase() !== key.toLowerCase() ||
          (field === "ciUrl" &&
            !/^actions\/runs\/\d+$/.test(parts.slice(2).join("/")))
        )
          ctx.addIssue({
            code: "custom",
            path: [key, field],
            message: "Release links must belong to this GitHub repository",
          });
      }
    }
  });
export type ProjectRelease = z.infer<typeof projectReleaseSchema>;

export const repositoryPreviewsSchema = z.record(
  z.string().regex(/^[a-z\d-]+\/[a-z\d._-]+$/i),
  asset,
);

export const repositorySchema = z.object({
  id: z.number().int().positive(),
  name: text,
  fullName: text,
  url: webUrl,
  description: text,
  language: text.nullable(),
  topics: z.array(text),
  stars: z.number().int().nonnegative(),
  updatedAt: z.iso.datetime(),
  homepage: webUrl.optional(),
});

export const projectSchema = z.object({
  title: text,
  bodyText: text,
  image: asset.optional(),
  links: z.array(link).default([]),
  tags: z.array(text).default([]),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  source: z.enum(["curated", "github"]).default("curated"),
  sourceVisibility: z.enum(["public", "private"]).optional(),
  repository: repositorySchema.optional(),
  rebuildNote: text.optional(),
  release: projectReleaseSchema.optional(),
});

export const portfolioSchema = z.object({
  home: z.object({ name: text, roles: z.array(text).min(1) }),
  about: z.object({ about: text, imageSource: asset }),
  leadership: z
    .array(
      z.object({
        title: text,
        organization: text,
        period: text,
        description: text,
        sources: z.array(link).min(1),
      }),
    )
    .default([]),
  press: z
    .array(
      z.object({
        kind: z.enum(["coverage", "statement"]),
        outlet: text,
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        headline: text,
        summary: text,
        href: webUrl,
      }),
    )
    .default([]),
  gallery: z
    .array(
      z.object({
        id: text,
        title: text,
        category: text,
        image: asset,
        alt: text,
        caption: text,
      }),
    )
    .default([]),
  projects: z.array(projectSchema),
  github: z
    .object({
      username: text,
      status: z.enum(["live", "cached", "unavailable"]),
      syncedAt: z.iso.datetime().nullable(),
      repositories: z.number().int().nonnegative(),
    })
    .optional(),
  experiences: z.array(
    z.object({
      title: text,
      subtitle: text,
      dateText: text,
      workType: text.optional(),
      workDescription: z.array(text),
    }),
  ),
  skills: z.array(
    z.object({
      title: text,
      items: z.array(z.object({ title: text, icon: asset })),
    }),
  ),
  education: z.array(
    z.object({
      title: text,
      cardTitle: text,
      cardSubtitle: text,
      cardDetailedText: text,
    }),
  ),
  social: z.array(
    z.object({
      network: text,
      href: text.refine((value) => /^(https?:\/\/|mailto:)/i.test(value)),
    }),
  ),
  resume: webUrl.optional(),
  blogs: z.array(
    z.object({
      id: z.number(),
      title: text,
      excerpt: text,
      date: text,
      readTime: text,
      tags: z.array(text),
      url: webUrl,
      featured: z.boolean(),
      author: text,
    }),
  ),
  achievements: z.array(
    z.object({
      id: z.number(),
      title: text,
      category: text,
      organization: text,
      date: text,
      description: text,
      skills: z.array(text),
      link: webUrl.nullable().optional(),
    }),
  ),
  testimonials: z.array(
    z.object({
      id: z.number(),
      name: text,
      position: text,
      company: text,
      testimonial: text,
      project: text,
    }),
  ),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(100),
  email: z
    .string()
    .trim()
    .pipe(z.email("Please enter a valid email address.").max(254)),
  service: z.enum([
    "Web development",
    "Backend & APIs",
    "Collaboration",
    "Something else",
  ]),
  message: z
    .string()
    .trim()
    .min(20, "Please include at least 20 characters.")
    .max(5000, "Please keep your message under 5,000 characters."),
  website: z.string().max(200).optional().default(""),
});

export type Portfolio = z.infer<typeof portfolioSchema>;
export type Project = z.infer<typeof projectSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
