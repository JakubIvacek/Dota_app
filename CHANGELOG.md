# Changelog

All notable changes to this project are documented in this file.

Format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
`package.json`'s version has stayed at `0.0.0` throughout development so far —
everything before today is grouped into a single retroactive `[0.1.0]`
summary below rather than reconstructed into per-commit version numbers.
Real semantic version bumps start from the next release onward (see the
`/release` command, which bumps `package.json` and should keep this file in
sync going forward).

New work should be added under `[Unreleased]` as it happens, then moved into
a dated version section when released.

## [Unreleased]

## [0.13.0] — 2026-07-19

### Added

- "Players to explore" section on the home page: scouts a pool of ~50 active
  pro players from the top 30 teams by rating (OpenDota `/teams` +
  `/proPlayers`) and shows a random sample of 8 — real, live profiles instead
  of hardcoded account IDs, since Steam personanames can't be trusted to
  identify who an ID actually belongs to. Section order is now Favorites (if
  any) → Recently viewed → Players to explore → Updates, and the
  Favorites/suggested sections hide entirely instead of showing an
  empty-state message.
- Roshan and tower/barracks event markers on the match Gold/XP advantage
  chart, alongside the existing hero-kill markers — sourced from OpenDota's
  `objectives` data (now typed as `MatchObjective`). Roshan uses the actual
  creature silhouette from OpenDota's own MIT-licensed icon set; tower/rax
  use small hand-drawn pictograms, since no verified Steam CDN asset exists
  for these.
- Item-purchase icon markers on the per-player Gold/XP timeline chart,
  reusing the same marker mechanism. Consumables (wards, tp scrolls, smoke,
  tangoes) are filtered out to avoid flooding the timeline; build-defining
  component items like Blink Dagger are kept.

### Fixed

- Kill-marker stacks in a single time bucket are now capped at 5 visible
  icons, with a "+N" badge for the rest, instead of growing an unbounded
  vertical column that could run off the chart edge.
- The kill-marker tooltip could disappear before the pointer reached it (a
  gap between marker and tooltip raced against the tooltip's own unmount),
  making a long, scrollable kill list impossible to actually scroll through.
  Closing is now debounced and cancelled on re-entry to either the marker or
  the tooltip itself.
- Tooltip rows now show each event's own icon (hero/Roshan/tower/rax/item)
  instead of a repeated Radiant/Dire glyph that carried no information once
  grouped by team.
- Roshan/objective/item-purchase tooltip text shortened (e.g. "Tier 3 Mid
  Tower · 12:34" instead of "Tier 3 Mid Tower destroyed at 12:34") after
  longer real-world labels overflowed the tooltip's fixed width.
- `LineChart.vue`'s minimum inter-bucket spacing increased — the first,
  edge-clamped bucket could end up only ~2px from its neighbor on longer
  matches with dense marker data, visually overlapping.

## [0.12.1] — 2026-07-18

### Fixed

- Kill-marker bucket spacing on the Gold/XP advantage chart now widens the
  grouping window only as much as the available horizontal space actually
  needs, instead of a fixed 1-minute window that could visually overlap on
  long matches or narrow viewports.
- Clicking or hovering a stacked group of kill markers now shows every kill
  in that time window at once (hero, team, time), instead of one tooltip per
  icon.
- The kill-list tooltip is now clamped to the chart's currently visible
  (scrolled) viewport instead of the full underlying canvas, so it no longer
  drifts far from the clicked icon or gets cut off near the chart's edge.

## [0.12.0] — 2026-07-17

### Added

- Kill-event markers on the match Gold/XP advantage chart: Radiant/Dire kill
  icons positioned by time above/below the team-split chart, grouped into
  per-minute stacks so simultaneous kills don't overlap, with a hover tooltip
  (hero + team glyph + time) and edge-clamping so first/last-minute kills
  stay inside the chart bounds.

### Fixed

- Kill-marker icons stayed hoverable instead of losing pointer events when
  Chart.js's own tooltip was active.
- Chart tooltip is now pinned to the chart's vertical center via a custom
  Chart.js tooltip positioner, so it no longer overlaps the kill-marker icon
  rows at the top/bottom edges.

## [0.11.1] — 2026-07-16

### Fixed

- Removed the "Updates" link from the footer nav — it duplicated the top nav
  link and didn't belong there.

## [0.11.0] — 2026-07-15

### Changed

- Match detail visual-hierarchy pass: the score is now the page's primary
  focal point (larger, with a soft glow on the winning side's digits, verdict
  line sized down); K/D/A, GPM/XPM, and DMG table columns are emphasized over
  the muted Net/LH-DN columns for faster scanning; MVP rows get a gold tint,
  hover glow, and a filled star tag; item icons have more breathing room and
  a hover scale; section spacing widened; card borders softened app-wide
  (shadow + gradient carry definition instead of a harder border).
- Removed the blue "this is you" row highlight from the match detail
  scoreboard (desktop table and mobile cards) — MVP styling now applies
  uniformly regardless of whose row it is.
- `LineChart.vue`: tooltip is now themed to match the app surface (rounded,
  tokenized colors) instead of Chart.js's unstyled default; the legend is a
  real HTML element above the canvas instead of Chart.js's canvas-drawn one,
  since the latter's layout math couldn't produce a reliable gap to the plot
  area; the "nice" y-axis bound rounds in finer steps and drops the extra 10%
  padding, so a `teamSplit` chart with a big swing no longer inflates the
  axis range far beyond the actual data (e.g. ~58k of data no longer forces
  a 100k-scale axis).

## [0.10.0] — 2026-07-15

### Added

- Match detail Gold & XP advantage chart now visually splits into
  Radiant/Dire zones around a symmetric, zero-centered y-axis (rounded to a
  "nice" bound with padding), with edge team labels, a brighter zero line,
  and `M:SS` x-axis labels — closer to the in-game client's advantage graph.
  Opt-in via a new `teamSplit` prop on `LineChart.vue`; other charts using
  the component are unaffected.

## [0.9.0] — 2026-07-14

### Added

- Match detail page now has a "‹ Back" link in the header, returning to the
  Matches tab of whichever player's profile it was opened from (falls back
  to home if opened directly with no player context).

## [0.8.0] — 2026-07-14

### Added

- Heroes table on the player profile now renders as a stacked card list
  below 720px instead of scrolling horizontally, with a "Sort by"
  dropdown + direction toggle since the desktop table's clickable column
  headers don't carry over to cards.
- Match detail Radiant/Dire player tables now render as a stacked card
  list below 720px instead of scrolling horizontally — level, K/D/A, net
  worth, GPM/XPM, LH/DN, damage, and items are all visible without
  scrolling.

### Changed

- Match detail score header and team section headings now use the actual
  Radiant/Dire faction icons instead of plain triangle glyphs.

## [0.7.0] — 2026-07-12

### Added

- New `/updates` page showing official Dota 2 patch notes pulled from the
  Steam News API (proxied under `/steamnews` in dev and via a Vercel
  rewrite), with a "Latest Dota 2 updates" teaser section on the homepage
  and nav/footer links.
- Matches table now renders as a stacked card list below 720px instead of
  scrolling horizontally — hero, result, K/D/A, duration, mode, and
  time-ago are all visible without scrolling. Cards get a green/red
  left-border and tint matching the win/loss badge color.

### Changed

- Homepage and header search boxes unified into one compact pill design;
  the header search box now always renders, including on the homepage, so
  the header no longer resizes when navigating between pages.
- Nav links (Leaderboards/Updates) sized up slightly with more spacing
  between them.
- News excerpt stripper also strips Steam's `{STEAM_CLAN_*}` image
  placeholders and bare CDN URLs that were leaking into excerpt text.

### Fixed

- Player profile tabs now center instead of left-aligning when wrapped to
  their own row on mobile.

## [0.6.0] — 2026-07-12

### Added

- Homepage "Product Tour" section (`ProductTour` component) — a preview of
  the player dashboard (winrate/avg-match stats + GPM/XPM trend chart, same
  colors as the real dashboard chart), rank tracking, hero performance,
  match timeline, and a leaderboard card linking to `/leaderboard`. Includes
  notes that every match shows the full 10-player roster and that some
  players keep their match history private.
- Favorites and Recently Viewed now always render, with empty-state copy
  when there's nothing yet, and a chevron affordance on `PlayerLinkCard`.

### Changed

- Removed the homepage "My Profile" card; the app has no saved-profile
  feature, favorites/recently-viewed already serve as quick access.
- Homepage hero copy rewritten (heading, tagline, eyebrow) to describe
  searching a player rather than restating the app name.
- The header's compact search box no longer duplicates the large hero
  search on the homepage; it still shows on every other page.
- Recently Viewed capped to 4 cards on the homepage.
- All new/changed homepage strings added across all 10 locales.

## [0.5.1] — 2026-07-12

### Fixed

- Mobile layout: fixed page-level horizontal overflow that occurred across
  most views on narrow viewports. Root causes: `.container` had no explicit
  `width: 100%` so it wouldn't reliably stretch to the viewport once a wide
  table was nested inside it; the header search input had a hardcoded
  `220px` width that couldn't shrink; the home page's ambient glow decoration
  bled past the viewport edge; and `.chart-grid`'s `minmax(320px, 1fr)`
  didn't fit inside a 320px viewport once padding is subtracted.
- Data tables (Leaderboard, Heroes, Matches, and the two Dashboard tables)
  now scroll horizontally inside a `.table-scroll` wrapper instead of
  overflowing the page, matching the pattern already used on the match
  detail scoreboard.
- Header now wraps into two rows on narrow screens instead of overflowing:
  brand + nav on the first row (nav right-aligned), search + language
  switcher sharing the second row (search fills the row instead of leaving
  a gap at its old desktop width).
- Leaderboard region tabs, player-profile tabs, and search-result rows now
  wrap instead of overflowing on narrow screens.
- Dashboard stat cards now form an even 2×2 grid on mobile instead of the
  all-time winrate card staying full-width and leaving "Avg match" stranded
  alone on its own row.
- Activity heatmap no longer squishes to illegible cell sizes on mobile —
  it keeps its native cell size and scrolls horizontally, opening scrolled
  to the most recent week.

### Added

- `StatCard` optional `show-badge` prop — renders a W/L pill next to the
  value (used on the "Last match" card) so the result isn't carried by
  color alone.

## [0.5.0] — 2026-07-12

### Added

- Rank medal badges (official Valve rank icons + star overlay) next to the
  player name on the profile page, home "my profile" card, and player link
  cards.
- Dashboard "Avg match" stat card (GPM/XPM and K/D average over the last 100
  matches) and "Last match" stat card (duration, GPM/XPM, KDA, win/loss
  tone), replacing a wins/losses card that duplicated info already shown in
  the all-time winrate card's sub-line.

### Changed

- Header: search box moved left (next to nav), language switcher moved right
  with a globe icon + short language code instead of the full spelled-out
  name.
- Footer copyright line now credits "byKeno".
- All-time winrate stat card's sub-line now includes the total game count;
  last-100 winrate card now shows a win/loss breakdown line so it doesn't
  read as empty.
- KDA and GPM/XPM trend charts use short date labels (no year) so X-axis
  ticks stop overlapping.
- `StatCard` content is vertically centered so cards in the same row align
  regardless of sub-line length.

## [0.4.0] — 2026-07-12

### Added

- Consistent loading states across the app: a shared `Skeleton.vue` component
  (row/line/avatar/block variants) replaces the per-view
  `.skeleton-table`/`.skeleton-row`/`.skeleton-profile`/`.skeleton-match` CSS
  that had been duplicated across Dashboard, Leaderboard, Search, Heroes,
  Matches, Player, and Match Detail views.
- Home page now shows a skeleton for the "my profile" card while it loads
  (previously fetched but never surfaced its own loading state).
- Search box shows a spinner and disables the button while a submit is in
  flight.
- A global top-of-page progress bar (`TopProgressBar.vue`), wired to both
  route navigation and a new `useGlobalLoading()` signal in `useAsync`, so it
  reflects real OpenDota request latency, not just route/chunk loading.
  Delay-show/hold-before-hide avoids flicker on fast responses.

### Changed

- Two-pass visual polish: app-wide button press feedback and card hover
  lift, a rebuilt `SearchBox` with real depth (surface, border, focus glow,
  search icon), an ambient hero glow and staggered card entrance on the home
  page, leading glyphs on status/error boxes, and remaining hardcoded
  spacing/weight values replaced with design tokens.

### Fixed

- `useAsync`'s new pending-request counter had a self-triggering infinite
  reactive loop (`pendingCount.value++` read-then-wrote a ref inside its own
  tracked effect scope), which pegged the CPU and broke `npm run dev`. Fixed
  by keeping a plain counter and only ever assigning the reactive
  projection, never reading it, from inside the effect.

## [0.3.0] — 2026-07-12

### Added

- Live deploy on Vercel (<https://dota-stats-by-keno.vercel.app/>): `vercel.json`
  adds a SPA rewrite fallback (client-side routes like `/player/:accountId`
  now resolve on direct load/refresh, not just in-app navigation) and a
  `/valve` rewrite proxying `www.dota2.com/webapi` for production, replacing
  the dev-only Vite proxy from `vite.config.ts` so Leaderboards works in prod.
- `LICENSE` (MIT).
- Vercel Web Analytics (`@vercel/analytics/vue`), tracking pageviews across
  route changes via a single `<Analytics />` component in `App.vue`.

## [0.2.0] — 2026-07-11

### Added

- Multi-language support (i18n) via `vue-i18n`: English (default), Slovak,
  Russian, Ukrainian, German, Portuguese (Brazil), Spanish (Latin America),
  Simplified Chinese, Filipino, and Turkish, with a language switcher in the
  topbar and a persisted locale (`dotastats:locale`).
- `CHANGELOG.md`.

### Changed

- Date and relative-time formatting (`formatDate`, `timeAgo`) now follow the
  active locale via `Intl.DateTimeFormat` / `Intl.RelativeTimeFormat` instead
  of being hardcoded to `sk-SK`.

## [0.1.0] — Historical summary (through 2026-07-11)

### Added

- Phase 1 MVP: Vue 3 + Vite frontend over the public OpenDota API —
  dashboard, matches list, match detail, hero stats.
- Phase 2: guest mode — player search by name or account ID, home page with
  an own-profile card and recently viewed players.
- Phase 3: deeper stats (trends, breakdowns).
- Phase 4: favorite players.
- Auto-request replay parse for unparsed matches, polling until chart data
  becomes available.
- Overview: GitHub-style activity heatmap, reordered dashboard sections.
- Matches: infinite scroll via OpenDota offset pagination.
- Leaderboards: Valve division rankings via a dev-server proxy (Valve's
  leaderboard API doesn't send CORS headers).
- Design pass: visual language, win/loss tones, Radiant/Dire team identity.
- Design pass: systemized design-token set, `WinrateBar`/`TeamGlyph` shared
  components.
- Redesign: premium visual pass (skeleton loaders, card hover/focus states,
  bento stat layout, Chart.js theming via CSS custom properties), a real
  logo/favicon, a site footer, and Terms/Privacy pages.

### Fixed

- Resilience: OpenDota requests now time out client-side (12s) instead of
  hanging on slow/degraded endpoints; added a "Refresh from OpenDota" action
  for players OpenDota hasn't indexed yet.
