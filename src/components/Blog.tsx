import { useDeferredValue, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Search } from "lucide-react";
import { usePortfolio } from "../hooks/usePortfolio";
import { ContactBanner, PageIntro } from "./UI";

export default function Blog() {
  const data = usePortfolio();
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("All topics");
  const search = useDeferredValue(query.toLowerCase().trim());
  const tags = [...new Set(data.blogs.flatMap((post) => post.tags))].sort();
  const posts = data.blogs.filter(
    (post) =>
      (topic === "All topics" || post.tags.includes(topic)) &&
      (post.title + " " + post.excerpt + " " + post.tags.join(" "))
        .toLowerCase()
        .includes(search),
  );
  return (
    <>
      <PageIntro label="Notes & ideas" title="Thinking out" accent="loud.">
        <p>
          On building software, learning along the way,
          <br />
          and the people at the heart of technology.
        </p>
        <p>Published writing will appear here once its source is confirmed.</p>
      </PageIntro>
      <section className="container writing-section">
        <div className="project-toolbar">
          <label className="search-field">
            <Search size={17} />
            <input
              type="search"
              placeholder="Search writing..."
              aria-label="Search writing"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            className="topic-select"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            aria-label="Filter writing by topic"
          >
            <option>All topics</option>
            {tags.map((tag) => (
              <option key={tag}>{tag}</option>
            ))}
          </select>
        </div>
        <p className="result-count" role="status">
          {posts.length} articles
        </p>
        <div className="writing-grid">
          {posts.map((post, index) => (
            <article key={post.id} className="writing-card">
              <div
                className={"writing-art visual-" + (index % 4)}
                aria-hidden="true"
              >
                <span>{post.tags[0]}</span>
                <span className="writing-glyph">
                  {["{ }", "Aa", "</>", "↗", "[ ]", "✳"][index % 6]}
                </span>
                <span>{post.readTime}</span>
              </div>
              <p className="eyebrow">
                {new Date(post.date + "T12:00:00Z").toLocaleDateString(
                  "en-GB",
                  {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    timeZone: "UTC",
                  },
                )}{" "}
                / {post.readTime}
              </p>
              <h2>
                <a href={post.url} target="_blank" rel="noreferrer">
                  {post.title}
                  <ArrowUpRight size={20} />
                </a>
              </h2>
              <p>{post.excerpt}</p>
              <div className="tags">
                {post.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
        {!posts.length && (
          <div className="empty-state">
            <h2>
              {data.blogs.length
                ? "No articles found."
                : "Notes are taking shape."}
            </h2>
            {!data.blogs.length && (
              <p>
                <Link to="/projects">
                  Explore reviewed project work in the meantime.
                </Link>
              </p>
            )}
            <button
              className="button"
              onClick={() => {
                setQuery("");
                setTopic("All topics");
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </section>
      <ContactBanner />
    </>
  );
}
