# OpenDota API — field notes (match timeline data)

Reference notes on OpenDota `/matches/{id}` fields for features we might build
on top of the match detail page (item build timeline, kill/death timeline,
ward heatmap, draft, skill order). Not a backlog — see [TODO.md](./TODO.md)
for actual planned work. Verified against a real parsed match
(`GET /matches/8898084910`) on 2026-07-15.

**All of these require a *parsed* match** (same gate as `radiant_gold_adv` /
`radiant_xp_adv`, already used for the gold/XP chart — see
`src/views/MatchDetailView.vue`). Unparsed matches return `null`/missing for
every field below.

## Item purchase time

`players[].purchase_log`: array of `{ time: number, key: string }`.

- `time` is seconds relative to the horn (0:00) — **negative values are
  pre-game buys** (e.g. `time: -89` = bought 89s before creeps spawn).
- `key` is the item's internal name (same keys as `item_0`..`item_5`, usable
  with the existing `itemImageUrl()` / item map in `src/api/opendota.ts`).
- This is a full build-order log, not just final items — includes
  consumables, upgrades, and items later sold/replaced.

```json
{ "time": -89, "key": "tango" }
{ "time": -89, "key": "gauntlets" }
```

Enough to build a "build order" timeline list per player (time + item icon),
similar in spirit to the gold/XP chart but as a horizontal timeline/list
rather than a line chart.

## Lane / ward heatmap

`players[].lane_pos`: nested dict, **not an array** —
`{ [x: string]: { [y: string]: count } }`. Keys are stringified integer grid
coordinates (map position bucket, not raw world coords), values are how many
recorded ticks the player spent at that (x, y) cell. This is the raw data
Dotabuff/OpenDota use for laning-phase heatmaps.

```json
{ "64": { "124": 4 }, "65": { ...}, ... }
```

To render: iterate `Object.entries` twice (outer x, inner y), plot as a
heatmap/scatter overlay on a minimap image. Would need a minimap asset and a
grid-coordinate → pixel mapping (OpenDota's own web client open-sources this
logic if we need a reference).

Ward placements are separate and *do* carry real map coordinates + time:

- `players[].obs_log` / `sen_log`: array of `{ time, x, y, ... }` for
  observer/sentry ward placements (`obs_left_log` / `sen_left_log` for when
  they expired/were destroyed).

## Kills / deaths — with time

- `players[].kills_log`: array of `{ time, key }` where `key` is the **victim's**
  hero NPC name (e.g. `npc_dota_hero_earth_spirit`) — i.e. this player's kills,
  with timestamps.

  ```json
  { "time": 1043, "key": "npc_dota_hero_largo" }
  ```

- There is **no direct "my death times" field** on a player object.
  `players[].deaths` is just a final count; `life_state` is an aggregate
  `{ "0": secondsAlive, "1": secondsDying, "2": secondsDead }`, not a
  timeline.
- To get a given player's death timeline, cross-reference: scan every
  *other* player's `kills_log` for entries whose `key` matches this player's
  hero NPC name. That yields `{ time, killedBy: player }` pairs.
- `teamfights[]` (top-level, not per-player) gives grouped death events:
  `{ start, end, last_death, deaths, players: [...] }`, each player entry has
  a `deaths` count and `deaths_pos` for that fight, but not exact per-death
  timestamps beyond the fight's `start`/`end`/`last_death` window.

So: a kills timeline is a direct read; a deaths timeline needs the
cross-referencing step above (still fully derivable client-side, no extra
API calls — one full match payload already has every player's `kills_log`).

## Runes

`players[].runes_log`: array of `{ time, key }`, `key` is the rune type as a
numeric string (rune type enum — needs a lookup table, e.g. `"5"` = haste,
`"8"` = bounty, etc. — check OpenDota's `rune_types` constants or Dota's own
`DOTA_RUNE_*` enum for the full mapping before shipping this).

```json
{ "time": 5, "key": "5" }
{ "time": 843, "key": "8" }
```

`players[].rune_pickups` is just the aggregate count, no times.

## Draft (picks/bans) timings

- `picks_bans` (top-level array): `{ is_pick, hero_id, team, order }` — **no
  timestamp**, just draft order. Present on this match (Captains Mode).
- `draft_timings` (top-level array) is the one that *would* carry per-pick
  timing (`{ order, pick, active_team, hero_id, player_slot, extra_time,
  total_time_taken }`), but it **was empty (`[]`) on the match we checked**.
  Likely only populated for matches where OpenDota captured the live draft
  phase (mostly high-profile pro matches with dedicated draft coverage) —
  don't assume it's reliably available; treat as "nice to have if present,"
  and always fall back to `picks_bans` (order only, no clock) when empty.

## Skill (ability) order

`players[].ability_upgrades_arr`: flat array of **ability IDs in pick
order** — not names, not timestamps, and **not reliably `index 0 = level 1`
either**: it only records skill points the player actually *spent*. Points
can be banked (spent later, or never) — perfectly legal in Dota — and any
banked level is silently omitted from the array, so `arrayIndex + 1` only
equals the real hero level if the player never banked a single point.
Confirmed against live matches: a level-22 hero can have as few as 18
entries. The only levels guaranteed by the data are talents (always taken at
10/15/20/25) — we tried anchoring the array to those and interpolating the
rest, but the interpolated levels are still a guess for anything between two
talents, and looked more confusing than useful. `src/views/MatchDetailView.vue`
now just shows pick order (1st, 2nd, 3rd… pick), not level.

```json
[5008, 5009, 5009, 5007, 5009, 5010, 5009, 5008]
```

Needs a numeric ability-ID → ability-name/icon lookup (OpenDota's
`constants/ability_ids.json`, not currently fetched anywhere in
`src/api/opendota.ts` — would be a new lookup table alongside the existing
hero/item maps). No per-level timestamp is included; only ordering. If a
"skill built at minute X" view is wanted, it'd have to be inferred from XP
totals (`xp_t` per-minute array) against level thresholds, which is an
approximation, not exact.

## Related fields not asked about but useful alongside these

- `players[].buyback_log`: `{ time, ... }` — buyback timestamps.
- `players[].purchase_tpscroll` / `item_uses`: item *usage* counts (not
  necessarily timed) — separate from `purchase_log` (buying).
- `players[].gold_t` / `xp_t` / `lh_t` / `dn_t`: per-minute arrays (same
  cadence as `radiant_gold_adv`) for gold, XP, last hits, denies — already
  the same shape/pattern as the chart we just built, just per-player instead
  of team-level.
