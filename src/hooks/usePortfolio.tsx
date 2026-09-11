import { createContext, useContext, type ReactNode } from "react";
import { portfolioSchema, type Portfolio } from "../../shared/schema";
import { useApi } from "./useApi";
import { ArrowUpRight, RefreshCw } from "lucide-react";

const PortfolioContext = createContext<Portfolio | null>(null);
const parse = (value: unknown) => portfolioSchema.parse(value);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const { data, loading, error, refetch } = useApi(
    "/api/portfolio",
    parse,
    60_000,
  );
  if (loading)
    return (
      <div className="load-state" role="status">
        <span className="loader-mark">
          ja<span>.</span>
        </span>
        <p>Putting the details together...</p>
        <div className="loading-line" />
      </div>
    );
  if (!data)
    return (
      <section className="load-state">
        <p className="eyebrow">A small interruption</p>
        <h1>Let's try that again.</h1>
        <p role="alert">{error}</p>
        <button className="button primary" onClick={refetch}>
          Reload portfolio <RefreshCw size={16} />
        </button>
        <a className="text-link" href="mailto:jhardeyemor@gmail.com">
          Get in touch by email <ArrowUpRight size={16} />
        </a>
      </section>
    );
  return (
    <PortfolioContext.Provider value={data}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const data = useContext(PortfolioContext);
  if (!data) throw new Error("PortfolioProvider is required");
  return data;
}
