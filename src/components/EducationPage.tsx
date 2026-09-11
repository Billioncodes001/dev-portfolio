import { GraduationCap } from "lucide-react";
import { usePortfolio } from "../hooks/usePortfolio";
import { ContactBanner, PageIntro } from "./UI";

export default function EducationPage() {
  const data = usePortfolio();
  return (
    <>
      <PageIntro label="Education" title="A foundation for" accent="curiosity.">
        <p>
          Formal learning laid the groundwork.
          <br />
          Building things keeps the learning going.
        </p>
      </PageIntro>
      <section className="container education-list">
        {data.education.map((item) => (
          <article key={item.title}>
            <span className="education-icon">
              <GraduationCap size={30} strokeWidth={1.5} />
            </span>
            <div>
              <p className="eyebrow">{item.title}</p>
              <h2>{item.cardTitle}</h2>
              <p>{item.cardSubtitle}</p>
            </div>
            <span className="tag">{item.cardDetailedText}</span>
          </article>
        ))}
      </section>
      <ContactBanner />
    </>
  );
}
