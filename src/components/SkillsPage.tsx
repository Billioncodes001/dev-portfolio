import { usePortfolio } from "../hooks/usePortfolio";
import { ContactBanner, PageIntro } from "./UI";

export default function SkillsPage() {
  const data = usePortfolio();
  return (
    <>
      <PageIntro
        label="The toolkit"
        title="The right tools."
        accent="For the right reasons."
      >
        <p>
          Languages, frameworks, and platforms I've worked with.
          <br />
          The goal stays the same: build something useful, and build it well.
        </p>
      </PageIntro>
      <section className="container skills-grid">
        {data.skills.map((group, index) => (
          <article className="skill-group" key={group.title}>
            <span className="eyebrow">
              0{index + 1} / {group.items.length} technologies
            </span>
            <h2>{group.title}</h2>
            <div className="skill-items">
              {group.items.map((item) => (
                <span key={item.title}>{item.title}</span>
              ))}
            </div>
          </article>
        ))}
      </section>
      <ContactBanner />
    </>
  );
}
