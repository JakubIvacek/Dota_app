/** Read a CSS custom property from :root — single source of truth for chart
 * colors, so datasets stay in sync with tokens.css instead of duplicating hex values. */
export function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}
