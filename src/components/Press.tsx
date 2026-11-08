import { useState } from "react";
import { ArrowUpRight, Megaphone, Newspaper } from "lucide-react";
import { usePortfolio } from "../hooks/usePortfolio";
import { ContactBanner, PageIntro } from "./UI";

const when = (date: string) =>
  new Date(date + "T12:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/**
 * Coverage of Josiah's student-union work, newest first, plus the statements
 * he has issued as Coordinator. Every item links to where it was published.
 */
export default function Press() {
  const { press } = usePortfolio();
  const [kind, setKind] = useState<"all" | "coverage" | "statement">("all");
  const items = [...press]
    .filter((item) => kind === "all" || item.kind === kind)
    .sort((a, b) => b.date.localeCompare(a.date));
  const filters = [
    ["all", "Everything"],
    ["coverage", "News coverage"],
    ["statement", "Statements"],
  ] as const;
  return (
    <>
      <PageIntro label="Press & statements" title="In the" accent="news.">
        <p>
          Reporting on my work with NANS Southwest Zone D, and the statements
          I've issued as Coordinator. Each one links to where it was published.
        </p>
      </PageIntro>
      <section className="container recognition-section">
        <div className="filter-list">
          {filters.map(([id, label]) => (
            <button
              key={id}
              aria-pressed={kind === id}
              className={kind === id ? "selected" : ""}
              onClick={() => setKind(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="recognition-grid">
          {items.map((item) => (
            <article key={item.href}>
              <div className="recognition-top">
                {item.kind === "coverage" ? (
                  <Newspaper size={30} strokeWidth={1.4} />
                ) : (
                  <Megaphone size={30} strokeWidth={1.4} />
                )}
                <span className="eyebrow">
                  {item.outlet} / {when(item.date)}
                </span>
              </div>
              <h2>{item.headline}</h2>
              <p>{item.summary}</p>
              <a
                className="text-link"
                href={item.href}
                target="_blank"
                rel="noreferrer"
              >
                {item.kind === "coverage"
                  ? "Read the article"
                  : "Read the statement"}{" "}
                <ArrowUpRight size={15} />
              </a>
            </article>
          ))}
        </div>
      </section>
      <ContactBanner />
    </>
  );
}
