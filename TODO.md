# TODO / Backlog

Unfinished or only-planned items, pulled out of the README (previously
"Open questions" and the sketched-out "🔜 Phase 5"). Finished work is
documented in [CHANGELOG.md](./CHANGELOG.md), not here.

## Backlog

- **Real-time match tracking** (GSI, websockets) — nice to have.
- **Custom replay parser** — only if the app ever diverges from the OpenDota
  API.
- **Show numeric MMR on `PlayerView`/`LeaderboardView`** — `PlayerProfile`
  (`src/types/opendota.ts`) only carries `rank_tier` and `leaderboard_rank`
  today (rendered via `RankBadge.vue`); there's no raw MMR number anywhere.
  OpenDota's `/players/{id}` also exposes `solo_competitive_rank` and
  `competitive_rank`, but Valve stopped populating those for most accounts
  years ago (`null` unless the player opted into the old public MMR API), so
  this is only reliably possible for the Immortal bracket via the existing
  `leaderboard_rank` (already shown). Investigate whether `solo_competitive_rank`
  /`competitive_rank` are non-null for the current test account
  (`scarecr0w`, ID 156058300) or any others before committing to UI work —
  if they're consistently null, this isn't buildable without a different
  data source.

- **Skill-build grid shows pick order, not real hero level** —
  `skillBuild()` (`src/views/MatchDetailView.vue`) labels each ability pip
  with its index in `ability_upgrades_arr` (1st pick, 2nd pick, …), not the
  hero's actual level at that pick, because OpenDota's array only records
  points the player actually spent and silently omits any level where a
  point was banked for later (legal in Dota, common once a build's core
  spells are maxed) — confirmed a level-22 hero with only 18 entries. Tried
  anchoring talents to their real levels (10/15/20/25, the one thing the data
  does guarantee) and interpolating the picks between them, but the
  interpolated levels between two talents are still an unverifiable guess and
  looked more confusing than useful (isolated icons with empty gaps before
  them), so it was reverted — see `OPENDOTA_API_NOTES.md` "Skill (ability)
  order" for the full writeup. Revisit if OpenDota ever exposes real
  per-pick level/timestamp data (nothing in the current `/matches/{id}`
  player payload has it — checked every field).

## Known upstream issues

- **OpenDota `/search` is unreliable** (times out with a Cloudflare 524 on
  their origin, unrelated to CORS/proxy/rate-limits — every other OpenDota
  endpoint works fine). Reported upstream via a GitHub issue on
  `odota/core`/`odota/opendota-api`. Mitigated client-side for now: shorter
  fail-fast timeout for this one endpoint (`SEARCH_TIMEOUT_MS`,
  `src/api/opendota.ts`), `SearchBox` recognizes a pasted account ID or
  Steam/Dotabuff/OpenDota/Stratz profile link and navigates straight to the
  profile (`src/utils/accountId.ts`), and the search error state now shows a
  hint to try that instead (`search.hint` i18n key). Revisit if this stays
  broken for a long time — see the chat log for a self-hosted BE-proxy option
  that was considered and deliberately skipped (doesn't fix the root cause,
  breaks the "no custom backend" decision for a small gain).

## 3D hero models (stretch goal)

Instead of 2D icons in the match detail, a rotatable static 3D model of the
hero (a single default pose, no animations — no skeleton/keyframes, just a
frozen mesh).

**Extraction (one-time, offline, not at app runtime):**
1. Tool: [Source 2 Viewer](https://github.com/ValveResourceFormat/ValveResourceFormat)
   (open-source), run against a local Dota 2 install (`game/dota/pak01_dir.vpk`)
   — **not** Workshop files, those only contain cosmetics, not the base hero
   bodies
2. Export the mesh in its default/idle pose directly as a static `.glb`
   (Source 2 Viewer supports this natively, no animation retargeting needed)
3. Check textures/materials — some Source 2 material setups don't map 1:1 to
   glTF PBR, may need manual tweaking in Blender or shader code

**Storage:**
- Static `.glb` files (roughly 1–5 MB/hero), `/public/models/{hero_id}.glb`;
  if there end up being many, move them out of the build (e.g. Supabase
  Storage)

**Frontend:**
- Three.js, `GLTFLoader` keyed by `hero_id`, `OrbitControls`, ambient +
  directional light
- Render into a `<canvas>` in the match detail component

**Approach:** proof of concept on 3–5 of the most-played heroes, validate the
full pipeline (extraction → glTF → loader → rotation), then scale up.
Legally gray area for a private project — don't host Valve assets publicly,
provide the extraction script instead.
