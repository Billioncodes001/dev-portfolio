import { usePortfolio } from "../hooks/usePortfolio";
import { Link } from "react-router-dom";
import { ContactBanner, PageIntro } from "./UI";

export default function Testimonials() {
  const data = usePortfolio();
  return (
    <>
      <PageIntro label="Kind words" title="Better work," accent="together.">
        <p>Verified testimonials will be shared here with permission.</p>
      </PageIntro>
      <section className="container testimonial-grid">
        {data.testimonials.map((item) => (
          <figure key={item.id}>
            <span className="quote-mark" aria-hidden="true">
              “
            </span>
            <blockquote>{item.testimonial}</blockquote>
            <figcaption>
              <span className="avatar">
                {item.name
                  .split(" ")
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <div>
                <strong>{item.name}</strong>
                <span>
                  {item.position}, {item.company}
                </span>
              </div>
            </figcaption>
            <p className="eyebrow">{item.project}</p>
          </figure>
        ))}
      </section>
      {!data.testimonials.length && (
        <section className="container empty-state">
          <h2>Let the work speak.</h2>
          <p>
            Explore project screenshots, reviewed source revisions, test
            evidence, and clearly stated limitations.
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
