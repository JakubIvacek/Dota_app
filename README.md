# Dota Stats App — návrh projektu

Osobný Dota 2 štatistický nástroj inšpirovaný Dotabuff/OpenDota. Začína ako privátny
side-project, s možnosťou rozšíriť na multi-user appku, ak to bude dávať zmysel.

## Cieľ

Prehľadné zobrazenie vlastných (a neskôr aj cudzích) Dota 2 štatistík — matche,
winrate podľa hrdinov, detail konkrétneho matchu (itemizácia, gold/XP graf),
trendy v čase. Postavené nad verejným [OpenDota API](https://docs.opendota.com/),
takže netreba riešiť vlastný replay parser.

## Fázy vývoja

### Fáza 1 — MVP (privátne, bez backendu)
- Frontend-only appka, natvrdo nastavené vlastné `account_id`
- Priame volania na OpenDota API (žiadna autentifikácia potrebná)
- Obrazovky:
  - **Dashboard** — celkový winrate, graf winrate v čase, obľúbení hrdinovia
  - **Matches list** — posledné matche (hrdina, výsledok, KDA, dĺžka)
  - **Match detail** — rozpis tímov, itemizácia, gold/XP graf (`radiant_gold_adv`)
  - **Hero stats** — tabuľka winrate/games per hero, triediteľná

### Fáza 2 — Guest mód pre viacerých
- Landing page s rýchlym vyhľadávaním (vlož Dota ID / Friend Code) → okamžité
  zobrazenie štatistík bez účtu, read-only
- Žiadne ukladanie dát, len fetch + zobrazenie
- Backend pridaný najmä kvôli cachovaniu (OpenDota rate limit ~60 req/min na free tier)

### Fáza 3 — Účty
- Email + heslo (Spring Security + bcrypt, email verifikácia, password reset)
- Steam OpenID ako alternatíva/doplnok neskôr, keď appka získa dôveru
  - Steam OpenID je bezpečný (redirect priamo na `steamcommunity.com`, appka
    nikdy nevidí heslo), ale veľa ľudí je voči nemu ostražitých kvôli scam stránkam,
    preto nie je jediná/povinná možnosť
- Uložené preferencie, obľúbení hráči/matche, možno porovnávanie s kamarátmi

## Tech stack

- **Frontend:** Vue 3 + Vite + TypeScript, Chart.js/ECharts na grafy
- **Backend:** Spring Boot (od fázy 2, kvôli cachovaniu a auth)
- **DB:** Postgres (alebo Supabase ako pri task trackeri — rýchlejší štart)
- **Dáta:** OpenDota API (public), Steam CDN pre hero/item ikony

## Dátový model (návrh, fáza 3)

```
users
  id
  auth_type        -- 'email' | 'steam' | 'guest'
  email             (nullable)
  password_hash     (nullable)
  steam_id          (nullable)
  dota_account_id   -- prepojenie na Dota profil
  created_at

cached_matches
  match_id (PK)
  account_id
  raw_data          -- JSON z OpenDota (matches/heroes/items/gold graph)
  fetched_at

favorites
  id
  user_id -> users.id
  target_type       -- 'player' | 'match'
  target_id
```

## Architektúra (fáza 2+)

```
[Browser / Vue app]
        |
        v
[Spring Boot backend]
   |            |
   v            v
[Postgres]   [OpenDota API]
 (cache,      (matches, players,
  users,       heroes, items)
  favorites)
```

- Backend funguje ako proxy + cache pred OpenDota, aby appka neprekračovala
  rate limity a fungovala aj keď je OpenDota pomalé/nedostupné
- Auth vrstva (Spring Security) rieši email/heslo aj neskôr Steam OpenID
- Guest requesty idú cez backend rovnako (kvôli cache), len sa nič neukladá
  k žiadnemu user účtu

## Kľúčové OpenDota endpointy

- `GET /players/{account_id}` — profil, MMR estimate
- `GET /players/{account_id}/matches` — posledné matche
- `GET /players/{account_id}/heroes` — winrate/games per hero
- `GET /players/{account_id}/wl` — win/loss split
- `GET /matches/{match_id}` — detail matchu (items, gold/XP graf cez čas)

**Poznámka:** aby boli vidieť detailné dáta matchu (items cez čas, gold/xp graf),
treba mať v Dota klientovi zapnuté `Settings → Advanced Options → Expose Public
Match Data` — inak sa replay neparsuje a API vráti len základné info.

### Fáza 4 — 3D hero modely (stretch goal)

Namiesto 2D ikon v match detaile zobraziť rotovateľný statický 3D model hrdinu
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
- Statické `.glb` súbory, **nie** v DB (binárne, rádovo 1–5MB/hrdina)
- Buď `/public/models/{hero_id}.glb` v projekte, alebo Supabase Storage (keď ich
  bude viac, aby sa zbytočne nenafukoval build appky)

**Frontend:**
- Three.js, `GLTFLoader` na načítanie modelu podľa `hero_id`
- `OrbitControls` na rotovanie myšou
- Základné osvetlenie (ambient + directional light)
- Render do `<canvas>` v match detail komponente, ako náhrada/doplnok 2D ikony

**Odporúčaný postup:**
- Proof of concept najprv na 3–5 najhranejších hrdinoch, overiť celý pipeline
  (extrakcia → glTF → loader → rotovanie), až potom prípadne škálovať na viac
- Legálne v šedej zóne pre privátny/malý projekt (bežné vo fanúšikovských
  projektoch), ale nehostovať cudzie Valve assety verejne/hromadne — radšej
  poskytnúť skript, nech si extrakciu spustí každý sám nad vlastnou inštaláciou hry

**Prekážky:** objem práce pri väčšom počte hrdinov, veľkosť súborov pri načítaní
viacerých modelov naraz, prípadné ručné doladenie material mappingu.

## Otvorené otázky / na doriešenie neskôr

- Real-time match tracking (GSI, websockety) — nice to have, nie MVP
- Vlastný replay parser — len ak by sa appka niekedy odklonila od OpenDota závislosti
- Škálovanie cache pri väčšom počte userov
