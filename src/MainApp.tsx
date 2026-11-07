import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { PortfolioProvider } from "./hooks/usePortfolio";
import { pageTitles } from "../shared/paths";
import OS, { Boot, type Phase, type Theme } from "./os/OS";

const BOOTED = "ja-os-booted";

function initialTheme(): Theme {
  try {
    return localStorage.getItem("portfolio-theme") === "dark"
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}

/** Shared deep links skip straight to the page; first visits get the full boot. */
function initialPhase(pathname: string): Phase {
  if (pathname !== "/") return "desktop";
  try {
    if (sessionStorage.getItem(BOOTED)) return "desktop";
  } catch {
    /* Without storage every visit simply boots. */
  }
  return "boot";
}

export default function MainApp() {
  const { pathname } = useLocation();
  const [phase, setPhase] = useState<Phase>(() => initialPhase(pathname));
  const [theme, setTheme] = useState(initialTheme);

  useEffect(() => {
    document.title =
      (pageTitles[pathname] ||
        (pathname.startsWith("/projects/") ? "Project" : "Page not found")) +
      " | Comr. Josiah Adeyemo";
  }, [pathname]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("portfolio-theme", theme);
    } catch {
      /* The theme still works when storage is unavailable. */
    }
  }, [theme]);
  useEffect(() => {
    if (phase === "boot") return;
    try {
      sessionStorage.setItem(BOOTED, "1");
    } catch {
      /* Storage is optional. */
    }
  }, [phase]);

  return (
    <div id="top">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <PortfolioProvider>
        {phase !== "boot" && (
          <OS
            phase={phase}
            setPhase={setPhase}
            theme={theme}
            setTheme={setTheme}
          />
        )}
      </PortfolioProvider>
      {phase === "boot" && <Boot onDone={() => setPhase("lock")} />}
    </div>
  );
}
