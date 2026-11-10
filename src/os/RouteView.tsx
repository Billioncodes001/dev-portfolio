import { lazy, memo, Suspense, useEffect } from "react";
import { unlock } from "./secrets";
import { useNarrow } from "./util";
import { Link, Route, Routes } from "react-router-dom";
import Home from "../components/Home";

const Projects = lazy(() => import("../components/Projects"));
const ProjectDetail = lazy(() => import("../components/ProjectDetail"));
const About = lazy(() => import("../components/AboutPage"));
const Gallery = lazy(() => import("../components/Gallery"));
const Experience = lazy(() => import("../components/ExperiencePage"));
const Skills = lazy(() => import("../components/SkillsPage"));
const Education = lazy(() => import("../components/EducationPage"));
const Blog = lazy(() => import("../components/Blog"));
const Achievements = lazy(() => import("../components/Achievements"));
const Testimonials = lazy(() => import("../components/Testimonials"));
const Contact = lazy(() => import("../components/Contact"));
const Press = lazy(() => import("../components/Press"));

function NotFound() {
  useEffect(() => unlock("lost"), []);
  // Same as the footer: on the desktop, "/" alone is the empty home screen.
  const narrow = useNarrow();
  return (
    <section className="load-state">
      <p className="eyebrow">404 / Uncharted territory</p>
      <h1>This page took a wrong turn.</h1>
      <p>You found a secret, though. Let's get you back to something good.</p>
      <Link
        className="button primary"
        to="/"
        state={narrow ? undefined : { open: "welcome" }}
      >
        Back to home
      </Link>
    </section>
  );
}

/**
 * Renders one page at a fixed path. Each window owns its own path, so several
 * pages can be open side by side while links inside them still use the router.
 * Memoised so dragging a window never re-renders the page inside it.
 */
const RouteView = memo(function RouteView({ path }: { path: string }) {
  return (
    <Suspense
      fallback={
        <div className="load-state" role="status">
          Opening…
        </div>
      }
    >
      {/* Keyed by path so each page change fades in. */}
      <div className="os-route" key={path}>
        <Routes location={path}>
          <Route path="/" element={<Home />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:slug" element={<ProjectDetail />} />
          <Route path="/about" element={<About />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/experience" element={<Experience />} />
          <Route path="/skills" element={<Skills />} />
          <Route path="/education" element={<Education />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/testimonials" element={<Testimonials />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/press" element={<Press />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </Suspense>
  );
});

export default RouteView;
