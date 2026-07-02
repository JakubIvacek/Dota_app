# Dota Stats App

Osobný Dota 2 štatistický nástroj inšpirovaný Dotabuff/OpenDota. Frontend-only —
**rozhodnutie z 2026-07-03: žiadny vlastný backend**, cachovanie rieši in-memory
cache + localStorage priamo v appke.

## Cieľ

Prehľadné zobrazenie vlastných aj cudzích Dota 2 štatistík — matche, winrate podľa
hrdinov, detail konkrétneho matchu (itemizácia, gold/XP graf), trendy v čase.
Postavené nad verejným [OpenDota API](https://docs.opendota.com/), takže netreba
riešiť vlastný replay parser.

## Spustenie

```bash
npm install
npm run dev
```

Vlastný profil: skopíruj `.env.example` do `.env.local` a nastav `VITE_ACCOUNT_ID`
(Friend Code z Dota profilu). Bez neho appka funguje v guest móde cez search.

## Roadmap

### ✅ Fáza 1 — MVP (hotové 3. 7. 2026)

- Vue 3 + Vite + TypeScript, Chart.js, vue-router
- Priame volania na OpenDota API, in-memory cache s TTL (rate limit ~60 req/min),
  hero/item konštanty v localStorage
- Obrazovky: **Dashboard** (winrate, graf v čase, top hrdinovia), **Matches list**,
  **Match detail** (scoreboard, itemizácia, gold/XP graf z `radiant_gold_adv`),
  **Hero stats** (triediteľná tabuľka)

### ✅ Fáza 2 — Guest mód (hotové 3. 7. 2026, bez backendu)

- `/player/:accountId` routy s tabmi Overview / Matches / Heroes
- Search podľa mena (OpenDota `/search`) aj číselného account ID
- Home page: veľký search, karta „Môj profil“, nedávno pozreté profily (localStorage)
- Klikateľné mená hráčov v match detaile → ich profily; zvýraznenie riadku sleduje
  profil, z ktorého bol match otvorený
- ~~Spring Boot backend na cachovanie~~ — zrušené, frontend cache stačí

### ~~Fáza 3 — Účty~~ (zrušené)

Email/heslo, Steam OpenID, uložené preferencie — padlo spolu s backendom.
Obľúbené veci sa riešia v localStorage (Fáza 4). Keby sa appka niekedy stala
verejnou multi-user službou, tu je pôvodná úvaha: Steam OpenID je bezpečný
(redirect na `steamcommunity.com`), ale nie ako jediná možnosť.

### 🔜 Fáza 3 — Hlbšie štatistiky

- Filter matchov podľa hrdinu (a prípadne módu/výsledku)
- Rolling-window winrate graf (napr. okno 20 matchov) namiesto kumulatívneho —
  kumulatívny na začiatku divoko skáče pri malej vzorke
- KDA / GPM / XPM trendy v čase
- Winrate podľa game módu (All Pick vs Turbo vs Ranked…)

### 🔜 Fáza 4 — Obľúbení hráči

- Hviezdička na profile hráča (toggle)
- Sekcia „Obľúbení“ na home page nad „Nedávno pozreté“
- localStorage, rovnaký princíp ako história (`useRecentPlayers` → `useFavorites`)

### 🔜 Fáza 5 — 3D hero modely (stretch goal)

Namiesto 2D ikon v match detaile rotovateľný statický 3D model hrdinu
(jedna default póza, bez animácií — žiadny skeleton/keyframes, len zamrznutý mesh).

**Extrakcia (jednorazovo, offline, nie za behu appky):**
1. Nástroj: [Source 2 Viewer](https://github.com/ValveResourceFormat/ValveResourceFormat)
   (open-source), spustiť nad lokálnou inštaláciou Dota 2 (`game/dota/pak01_dir.vpk`)
   — **nie** Workshop súbory, tie obsahujú len cosmetics, nie základné telá hrdinov
2. Exportovať mesh v default/idle póze priamo ako statický `.glb` (Source 2 Viewer
   toto vie natívne, netreba riešiť animation retargeting)
3. Skontrolovať textúry/materiály — niektoré Source 2 material setupy sa nemapujú
   1:1 na glTF PBR, môže byť treba ručne doladiť v Blenderi alebo shader kóde

**Ukladanie:**
- Statické `.glb` súbory (rádovo 1–5 MB/hrdina), `/public/models/{hero_id}.glb`;
  keby ich bolo veľa, presunúť mimo build (napr. Supabase Storage)

**Frontend:**
- Three.js, `GLTFLoader` podľa `hero_id`, `OrbitControls`, ambient + directional light
- Render do `<canvas>` v match detail komponente

**Postup:** proof of concept na 3–5 najhranejších hrdinoch, overiť celý pipeline
(extrakcia → glTF → loader → rotovanie), až potom škálovať. Legálne šedá zóna pre
privátny projekt — nehostovať Valve assety verejne, radšej poskytnúť extrakčný skript.

## Tech stack

- **Frontend:** Vue 3 + Vite + TypeScript, Chart.js na grafy
- **Dáta:** OpenDota API (public), Steam CDN pre hero/item ikony
- **Perzistencia:** localStorage (história, neskôr obľúbení) — žiadna DB, žiadny backend

## Kľúčové OpenDota endpointy

- `GET /players/{account_id}` — profil, rank
- `GET /players/{account_id}/matches` — posledné matche
- `GET /players/{account_id}/heroes` — winrate/games per hero
- `GET /players/{account_id}/wl` — win/loss split
- `GET /matches/{match_id}` — detail matchu (items, gold/XP graf cez čas)
- `GET /search?q=` — hľadanie hráčov podľa mena (pozor, vie trvať aj ~7 s)

**Poznámka:** aby boli vidieť detailné dáta matchu (items cez čas, gold/xp graf),
treba mať v Dota klientovi zapnuté `Settings → Advanced Options → Expose Public
Match Data` — inak sa replay neparsuje a API vráti len základné info.

## Otvorené otázky / na doriešenie neskôr

- Deploy na web (GitHub Pages/Netlify/Vercel) — frontend-only, takže zadarmo;
  zatiaľ beží len lokálne
- Real-time match tracking (GSI, websockety) — nice to have
- Vlastný replay parser — len ak by sa appka niekedy odklonila od OpenDota
