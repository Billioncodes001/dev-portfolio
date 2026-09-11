import { ArrowUpRight } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { usePortfolio } from "../hooks/usePortfolio";

export default function Leadership() {
  const { leadership } = usePortfolio();
  const { hash } = useLocation();
  useEffect(() => {
    if (hash === "#leadership")
      document.getElementById("leadership")?.scrollIntoView();
  }, [hash]);
  if (!leadership.length) return null;
  return (
    <section
      className="container leadership-section"
      id="leadership"
      aria-labelledby="leadership-title"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">Unionism / Representation / Service</p>
          <h2 id="leadership-title">
            A voice for <em>student welfare.</em>
          </h2>
        </div>
      </div>
      <div className="leadership-grid">
        {leadership.map((entry) => (
          <article key={entry.title}>
            <p className="eyebrow">{entry.period}</p>
            <h3>{entry.title}</h3>
            <p className="leadership-organization">{entry.organization}</p>
            <p>{entry.description}</p>
            <div className="source-links">
              {entry.sources.map((source) => (
                <a
                  className="text-link"
                  key={source.href}
                  href={source.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {source.text} <ArrowUpRight size={15} />
                </a>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
