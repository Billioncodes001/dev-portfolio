import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ArrowUpRight, Menu, Moon, Sun, X } from "lucide-react";

const links = [
  { to: "/", label: "Home" },
  { to: "/projects", label: "Work" },
  { to: "/about", label: "About" },
  { to: "/experience", label: "Experience" },
];
function initialTheme() {
  try {
    return localStorage.getItem("portfolio-theme") === "dark"
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}
export default function NavBar() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(initialTheme);
  const location = useLocation();
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("portfolio-theme", theme);
    } catch {
      /* The theme still works when storage is unavailable. */
    }
  }, [theme]);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);
  return (
    <header className="site-header">
      <div className="container nav-inner">
        <Link className="brand" to="/" aria-label="Josiah Adeyemo home">
          <span className="brand-mark">
            ja<span>.</span>
          </span>
          <span className="brand-name">
            Josiah Adeyemo<span>Software Engineer</span>
          </span>
        </Link>
        <nav
          className={"main-nav " + (open ? "is-open" : "")}
          id="main-navigation"
          aria-label="Main navigation"
        >
          {links.map((link) => (
            <NavLink end={link.to === "/"} key={link.to} to={link.to}>
              {link.label}
            </NavLink>
          ))}
          <Link to="/contact" className="mobile-contact">
            Let's talk <ArrowUpRight size={16} />
          </Link>
        </nav>
        <div className="nav-actions">
          <button
            className="icon-button theme-button"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            aria-label={
              "Switch to " + (theme === "light" ? "dark" : "light") + " theme"
            }
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <Link className="button nav-contact" to="/contact">
            Let's talk <ArrowUpRight size={16} />
          </Link>
          <button
            ref={toggle}
            className="icon-button menu-toggle"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="main-navigation"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  );
}
