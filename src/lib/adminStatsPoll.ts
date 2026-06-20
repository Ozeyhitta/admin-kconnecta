import { useEffect, useRef } from "react";

// ── Polling intervals ──────────────────────────────────────────────────────────
// Realtime: online users — fast because it changes every few seconds
export const ADMIN_ONLINE_POLL_MS = 15_000;

// Activity logs — moderate, user tolerates 60s staleness
export const ADMIN_ACTIVITY_POLL_MS = 60_000;

// Time-based metric cards (StatsOverview) — 2 minutes
export const ADMIN_STATS_POLL_MS = 120_000;

// Heavy charts (ActivityHourCard, ActivityDayCard, NewUsersAnalytics) — 1 minute
export const ADMIN_CHARTS_POLL_MS = 60_000;

// System overview (total counts that rarely change) — 5 minutes
export const ADMIN_SYSTEM_POLL_MS = 300_000;

// Admin inbox badge — fast so new alerts appear quickly
export const ADMIN_INBOX_POLL_MS = 15_000;

// ── useIntervalPoll ────────────────────────────────────────────────────────────

export function useIntervalPoll(
  callback: () => void | Promise<void>,
  delayMs: number | null,
  deps: unknown[] = [],
) {
  const saved = useRef(callback);
  saved.current = callback;

  useEffect(() => {
    const run = () => {
      if (document.visibilityState === "visible") {
        void saved.current();
      }
    };

    // Always fetch once on mount / when deps change (e.g. date filter).
    // When delayMs is null, skip interval polling only.
    run();

    if (delayMs === null) return;

    const timerId = window.setInterval(run, delayMs);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void saved.current();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(timerId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delayMs, ...deps]);
}
