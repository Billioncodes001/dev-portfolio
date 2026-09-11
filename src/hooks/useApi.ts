import { useEffect, useRef, useState } from "react";

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}
export function useApi<T>(
  url: string,
  parse: (value: unknown) => T,
  refreshIntervalMs = 0,
) {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });
  const [attempt, setAttempt] = useState(0);
  const previousUrl = useRef(url);
  useEffect(() => {
    if (!refreshIntervalMs) return;
    const refresh = () => {
      if (document.visibilityState === "visible")
        setAttempt((value) => value + 1);
    };
    const interval = window.setInterval(refresh, refreshIntervalMs);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [refreshIntervalMs]);

  useEffect(() => {
    const controller = new AbortController();
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 12000);
    const changed = previousUrl.current !== url;
    previousUrl.current = url;
    setState((previous) => ({
      data: changed ? null : previous.data,
      loading: changed || !previous.data,
      error: null,
    }));
    async function load() {
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!response.ok)
          throw new Error("Content is temporarily unavailable.");
        const data = parse(await response.json());
        if (!controller.signal.aborted)
          setState({ data, loading: false, error: null });
      } catch {
        if (!controller.signal.aborted || timedOut)
          setState((previous) => ({
            ...previous,
            loading: false,
            error: timedOut
              ? "The connection took too long."
              : "The portfolio could not be loaded.",
          }));
      } finally {
        window.clearTimeout(timeout);
      }
    }
    void load();
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [url, parse, attempt]);
  return { ...state, refetch: () => setAttempt((value) => value + 1) };
}
