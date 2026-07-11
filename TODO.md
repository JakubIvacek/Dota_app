# TODO / Backlog

Unfinished or only-planned items, pulled out of the README (previously
"Open questions" and the sketched-out "🔜 Phase 5"). Finished work is
documented in [CHANGELOG.md](./CHANGELOG.md), not here.

## Backlog

- **Vercel deploy** — frontend-only, so free (`vercel.json` or import the
  repo via the Vercel dashboard, build command `npm run build`, output
  `dist/`). Blocker: the `/valve` proxy in `vite.config.ts` (Valve's
  leaderboard webapi doesn't send CORS headers) only works in the dev/preview
  server — production needs a Vercel rewrite or serverless function to
  `www.dota2.com/webapi`, otherwise the Leaderboards page breaks on CORS.
  For now the app only runs locally.
- **Real-time match tracking** (GSI, websockets) — nice to have.
- **Custom replay parser** — only if the app ever diverges from the OpenDota
  API.

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
