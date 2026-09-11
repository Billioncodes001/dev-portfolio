import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Award } from "lucide-react";
import { usePortfolio } from "../hooks/usePortfolio";
import { ContactBanner, PageIntro } from "./UI";

export default function Achievements() {
  const data = usePortfolio();
  const [category, setCategory] = useState("All");
  const categories = [
    "All",
    ...new Set(data.achievements.map((item) => item.category)),
  ];
  return (
    <>
      <PageIntro
        label="Recognition & learning"
        title="Milestones along"
        accent="the way."
      >
        <p>
          Awards and credentials will be listed here when supporting evidence is
          available.
        </p>
      </PageIntro>
      <section className="container recognition-section">
        <div className="filter-list">
          {categories.map((item) => (
            <button
              aria-pressed={category === item}
              className={category === item ? "selected" : ""}
              key={item}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="recognition-grid">
          {data.achievements
            .filter((item) => category === "All" || item.category === category)
            .map((item) => (
              <article key={item.id}>
                <div className="recognition-top">
                  <Award size={30} strokeWidth={1.4} />
                  <span className="eyebrow">
                    {item.category} / {item.date.slice(0, 4)}
                  </span>
                </div>
                <h2>{item.title}</h2>
                <p className="company-name">{item.organization}</p>
                <p>{item.description}</p>
                <div className="tags">
                  {item.skills.map((skill) => (
                    <span key={skill}>{skill}</span>
                  ))}
                </div>
                {item.link && (
                  <a
                    className="text-link"
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Visit organization <ArrowUpRight size={16} />
                  </a>
                )}
              </article>
            ))}
        </div>
      </section>
      {!data.achievements.length && (
        <section className="container empty-state">
          <h2>Evidence in the work.</h2>
          <p>
            For now, explore the documented project releases and their
            verification notes.
          </p>
          <Link className="button" to="/projects">
            Explore reviewed work
          </Link>
        </section>
      )}
      <ContactBanner />
    </>
  );
}
