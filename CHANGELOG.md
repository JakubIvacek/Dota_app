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
