/** Read a CSS custom property value from :root at call time.
 *  Call inside useEffect/useLayoutEffect so dark-mode class is already applied. */
export function getCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Common chart theme tokens resolved from CSS variables. */
export function getChartTheme() {
  return {
    gridLineColor: getCssVar("--border") || "#e5e7eb",
    mutedText: getCssVar("--muted-foreground") || "#717182",
    primary: getCssVar("--primary") || "#10b981",
    destructive: getCssVar("--destructive") || "#d4183d",
  };
}
