import { useEffect, useRef } from "react";

export const ADMIN_STATS_POLL_MS = 5_000;
export const ADMIN_CHARTS_POLL_MS = 15_000;

export function useIntervalPoll(
  callback: () => void | Promise<void>,
  delayMs: number | null,
  deps: unknown[] = [],
) {
  const saved = useRef(callback);
  saved.current = callback;

  useEffect(() => {
    if (delayMs === null) return;

    const run = () => {
      if (document.visibilityState === "visible") {
        void saved.current();
      }
    };

    run();
    const timerId = window.setInterval(run, delayMs);
    const onVisibility = () => run();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(timerId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delayMs, ...deps]);
}
