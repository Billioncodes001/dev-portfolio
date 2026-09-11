import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Braces,
  Code2,
  Layers,
  MapPin,
} from "lucide-react";
import { usePortfolio } from "../hooks/usePortfolio";
import {
  assetUrl,
  ContactBanner,
  ProjectCard,
  SocialLinks,
  projectSlug,
} from "./UI";

export default function Home() {
  const data = usePortfolio();
  return (
    <>
      <section className="hero container">
        <div className="hero-copy">
          <p className="eyebrow hero-kicker">
            <span className="tiny-dot" />
            Engineer by craft. Curious by nature.
          </p>
          <h1>
            Thoughtful code.
            <br />
            Meaningful
            <br />
            <em>experiences</em>
            <span className="hero-period">.</span>
          </h1>
          <p className="hero-description">
            I'm <strong>{data.home.name}</strong>, a full-stack software
            engineer turning complex challenges into simple, human digital
            experiences.
          </p>
          <div className="hero-buttons">
            <Link className="button primary" to="/projects">
              Explore my work <ArrowUpRight size={18} />
            </Link>
            <Link className="button text-button" to="/about">
              A little about me <ArrowRight size={17} />
            </Link>
          </div>
          <div className="hero-footnote">
            <span>
              <MapPin size={14} />
              Based in Nigeria. Building beyond borders.
            </span>
            <SocialLinks />
          </div>
        </div>
        <div className="hero-art">
          <div className="art-grid" aria-hidden="true" />
          <span className="orbit-text" aria-hidden="true">
            A LITTLE CURIOSITY GOES A LONG WAY
          </span>
          <div className="portrait-frame">
            <img
              src={assetUrl(data.about.imageSource)}
              alt={data.home.name}
              width="430"
              height="374"
              fetchPriority="high"
            />
            <div className="portrait-caption">
              <span>Josiah Adeyemo</span>
              <span>THE HUMAN BEHIND THE CODE</span>
            </div>
          </div>
          <div className="craft-badge">
            <span className="badge-icon">
              <Braces size={22} />
            </span>
            <div>
              Made to work.
              <br />
              <strong>Built to matter.</strong>
            </div>
            <span className="badge-spark" aria-hidden="true">
              ✳
            </span>
          </div>
          <div className="art-coordinate">
            <span className="tiny-dot" /> Ideas → interfaces → impact
          </div>
          <span className="art-star" aria-hidden="true">
            ✳
          </span>
        </div>
      </section>
      <div className="craft-strip container">
        <span className="strip-label">A full-stack perspective</span>
        <div>
          <span>React</span>
          <i />
          TypeScript
          <i />
          <span>Node.js</span>
          <i />
          <span>Python</span>
          <i />
          <span>Cloud & APIs</span>
        </div>
        <a href="#selected-work" aria-label="Scroll to selected work">
          <ArrowDown size={18} />
        </a>
      </div>
      <section className="work-section container" id="selected-work">
        <div className="section-heading">
          <div>
            <p className="eyebrow">01 / Selected work</p>
            <h2>
              A few things I've
              <br />
              <em>put into the world.</em>
            </h2>
          </div>
          <Link className="text-link" to="/projects">
            View all projects{" "}
            <span className="count">{data.projects.length}</span>
            <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="project-grid">
          {data.projects.slice(0, 4).map((project, index) => (
            <ProjectCard
              key={projectSlug(project)}
              project={project}
              index={index}
            />
          ))}
        </div>
      </section>
      <section className="about-preview container">
        <div>
          <p className="eyebrow">02 / Beyond the screen</p>
          <h2>
            Good software starts
            <br />
            with <em>understanding people.</em>
          </h2>
        </div>
        <div>
          <p>
            I work across interfaces, APIs, and everything that connects them.
            My interests in cybersecurity and student advocacy shape how I think
            about building: with care for the people on the other side of the
            screen.
          </p>
          <Link className="text-link" to="/about">
            More about my approach <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
      <section className="capabilities container" aria-label="What I bring">
        <article>
          <Code2 size={25} strokeWidth={1.5} />
          <span>01</span>
          <h3>Interfaces with intention</h3>
          <p>
            Responsive, accessible experiences that make the complex feel
            effortless.
          </p>
        </article>
        <article>
          <Layers size={25} strokeWidth={1.5} />
          <span>02</span>
          <h3>Depth beyond the surface</h3>
          <p>
            Reliable APIs, thoughtful data models, and the systems behind great
            products.
          </p>
        </article>
        <article>
          <Braces size={25} strokeWidth={1.5} />
          <span>03</span>
          <h3>Care in the details</h3>
          <p>
            Maintainable code, considered interactions, and an appetite for
            learning.
          </p>
        </article>
      </section>
      <ContactBanner />
    </>
  );
}
