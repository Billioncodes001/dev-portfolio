import { Link } from "react-router-dom";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { usePortfolio } from "../hooks/usePortfolio";
import {
  assetUrl,
  ContactBanner,
  Markdown,
  PageIntro,
  SocialLinks,
} from "./UI";

export default function AboutPage() {
  const data = usePortfolio();
  return (
    <>
      <PageIntro
        label="A little about me"
        title="Engineer. Builder."
        accent="Human."
      >
        <p>
          I like understanding how things work.
          <br />
          And making them work a little better for people.
        </p>
      </PageIntro>
      <section className="container about-grid">
        <div className="about-portrait">
          <img
            src={assetUrl(data.about.imageSource)}
            alt={data.home.name}
            width="430"
            height="374"
          />
          <span>
            {data.home.name}
            <span>BEHIND THE CODE</span>
          </span>
        </div>
        <div className="about-story">
          <p className="eyebrow">Hello, I'm Josiah</p>
          <h2>
            Curiosity is
            <br />
            the <em>common thread.</em>
          </h2>
          <Markdown>{data.about.about}</Markdown>
          <p>
            My interest in cybersecurity keeps me thinking about trust: how we
            protect people, handle information, and build responsibly.
          </p>
          <div className="about-actions">
            {data.resume && (
              <a
                className="button primary"
                href={data.resume}
                target="_blank"
                rel="noreferrer"
              >
                View my resume <ArrowUpRight size={17} />
              </a>
            )}
            <SocialLinks />
          </div>
        </div>
      </section>
      <section
        className="container biography-context"
        aria-label="More of my story"
      >
        <article>
          <p className="eyebrow">Beyond engineering</p>
          <h2>
            Showing up <em>for students.</em>
          </h2>
          <p>
            From student representation to advocacy for reliable campus
            electricity, unionism is part of my story. My experience page brings
            together the roles and public coverage.
          </p>
          <Link className="text-link" to="/experience#leadership">
            Explore my union work <ArrowRight size={17} />
          </Link>
        </article>
        <article>
          <p className="eyebrow">Ideas & perspective</p>
          <h2>
            Technology <em>as opportunity.</em>
          </h2>
          <p>
            In January 2023, I wrote about connecting African tech talent with
            international companies through Billioncodes and online education.
          </p>
          <a
            className="text-link"
            href="https://medium.com/@jhardeyemor/unlocking-the-potential-of-connecting-african-tech-talent-with-international-companies-3ec008a0577d"
            target="_blank"
            rel="noreferrer"
          >
            Read the article on Medium <ArrowUpRight size={17} />
          </a>
        </article>
        <Link className="text-link" to="/gallery">
          Visit the gallery <ArrowRight size={17} />
        </Link>
      </section>
      <section className="container principles">
        <div className="section-heading">
          <div>
            <p className="eyebrow">How I approach the work</p>
            <h2>
              Intention in <em>every layer.</em>
            </h2>
          </div>
        </div>
        <div className="principle-grid">
          {[
            [
              "01",
              "Understand first.",
              "Listen, ask questions, and get close to the problem before reaching for a solution.",
            ],
            [
              "02",
              "Keep it thoughtful.",
              "Make the interface clear, the implementation understandable, and the details count.",
            ],
            [
              "03",
              "Keep learning.",
              "Stay open to better ways of working. Make room for feedback, iteration, and new ideas.",
            ],
          ].map(([n, title, body]) => (
            <article key={n}>
              <span className="eyebrow">{n}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
        <Link className="text-link" to="/experience">
          Explore my experience <ArrowRight size={17} />
        </Link>
      </section>
      <ContactBanner />
    </>
  );
}
