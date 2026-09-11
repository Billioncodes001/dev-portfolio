import { lazy, Suspense, useEffect, useRef } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import NavBar from "./components/NavBar";
import Home from "./components/Home";
import { PortfolioProvider } from "./hooks/usePortfolio";
import { Footer } from "./components/UI";
import { pageTitles } from "../shared/paths";

const Projects = lazy(() => import("./components/Projects"));
const ProjectDetail = lazy(() => import("./components/ProjectDetail"));
const About = lazy(() => import("./components/AboutPage"));
const Experience = lazy(() => import("./components/ExperiencePage"));
const Skills = lazy(() => import("./components/SkillsPage"));
const Education = lazy(() => import("./components/EducationPage"));
const Blog = lazy(() => import("./components/Blog"));
const Achievements = lazy(() => import("./components/Achievements"));
const Testimonials = lazy(() => import("./components/Testimonials"));
const Contact = lazy(() => import("./components/Contact"));

export default function MainApp() {
  const { pathname, hash } = useLocation();
  const previousPath = useRef(pathname);
  useEffect(() => {
    document.title =
      (pageTitles[pathname] ||
        (pathname.startsWith("/projects/") ? "Project" : "Page not found")) +
      " | Josiah Adeyemo";
    if (previousPath.current !== pathname) {
      if (!hash) window.scrollTo({ top: 0, behavior: "instant" });
      document.getElementById("main-content")?.focus({ preventScroll: true });
      previousPath.current = pathname;
    }
  }, [pathname, hash]);
  return (
    <div id="top">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <NavBar />
      <main id="main-content" tabIndex={-1}>
        <PortfolioProvider>
          <Suspense
            fallback={
              <div className="load-state" role="status">
                Loading this chapter...
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:slug" element={<ProjectDetail />} />
              <Route path="/about" element={<About />} />
              <Route path="/experience" element={<Experience />} />
              <Route path="/skills" element={<Skills />} />
              <Route path="/education" element={<Education />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/achievements" element={<Achievements />} />
              <Route path="/testimonials" element={<Testimonials />} />
              <Route path="/contact" element={<Contact />} />
              <Route
                path="*"
                element={
                  <section className="load-state">
                    <p className="eyebrow">404 / Uncharted territory</p>
                    <h1>This page took a wrong turn.</h1>
                    <p>Let's get you back to something good.</p>
                    <Link className="button primary" to="/">
                      Back to home
                    </Link>
                  </section>
                }
              />
            </Routes>
          </Suspense>
        </PortfolioProvider>
      </main>
      <Footer />
    </div>
  );
}
