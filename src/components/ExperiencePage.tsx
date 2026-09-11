import { ArrowUpRight } from "lucide-react";
import { usePortfolio } from "../hooks/usePortfolio";
import { ContactBanner, Markdown, PageIntro } from "./UI";

export default function ExperiencePage() {
  const data = usePortfolio();
  return (
    <>
      <PageIntro
        label="Experience / The journey so far"
        title="Different teams."
        accent="Shared ambition."
      >
        <p>
          Working across products, disciplines, and borders.
          <br />
          Every role has added a new perspective to my craft.
        </p>
        {data.resume && (
          <a
            className="text-link"
            href={data.resume}
            target="_blank"
            rel="noreferrer"
          >
            View full resume <ArrowUpRight size={17} />
          </a>
        )}
      </PageIntro>
      <section className="container timeline" aria-label="Work experience">
        {data.experiences.map((job, index) => (
          <article className="experience-row" key={job.title + job.subtitle}>
            <div className="experience-date">
              <span className="timeline-dot" />
              <span>{job.dateText}</span>
              <span className="eyebrow">
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>
            <div>
              <div className="experience-heading">
                <h2>{job.title}</h2>
                <span className="tag">{job.workType || "Experience"}</span>
              </div>
              <p className="company-name">{job.subtitle}</p>
              <ul>
                {job.workDescription.map((point) => (
                  <li key={point}>
                    <Markdown>{point}</Markdown>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </section>
      <ContactBanner />
    </>
  );
}
