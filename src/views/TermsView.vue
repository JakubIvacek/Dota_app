<template>
  <div class="legal">
    <h1>Podmienky používania</h1>
    <p class="muted">Platné od 2026-07-11.</p>

    <section>
      <h2>Čo je Dota Stats</h2>
      <p>
        Dota Stats je neoficiálny, fanúšikovský nástroj na prehľad Dota 2 štatistík.
        Nie je vytvorený, sponzorovaný ani schválený spoločnosťou Valve Corporation.
        <strong>Dota 2</strong>, <strong>Steam</strong> a súvisiace ochranné známky
        patria Valve Corporation.
      </p>
    </section>

    <section>
      <h2>Zdroj dát</h2>
      <p>
        Všetky zobrazené štatistiky (matche, hrdinovia, rebríčky) pochádzajú z
        verejného <a href="https://www.opendota.com/" target="_blank" rel="noopener">OpenDota API</a>
        a zo Steam CDN (ikony hrdinov/itemov). Dota Stats tieto dáta len zobrazuje —
        nezasahuje do nich a nezaručuje ich presnosť, úplnosť ani dostupnosť.
        OpenDota je nezávislý projekt s vlastnou infraštruktúrou; ak je dočasne
        pomalý alebo nedostupný, appka to nedokáže ovplyvniť.
      </p>
    </section>

    <section>
      <h2>Bez záruky</h2>
      <p>
        Appka je poskytovaná „tak ako je" (as is), zadarmo, bez akejkoľvek záruky.
        Nie je určená ako jediný zdroj pravdy pre súťažné alebo komerčné rozhodnutia.
      </p>
    </section>

    <section>
      <h2>Kontakt</h2>
      <p>
        Otázky, chyby alebo návrhy patria na
        <a href="https://github.com/JakubIvacek/Dota_app" target="_blank" rel="noopener">GitHub</a>
        — otvor issue.
      </p>
    </section>
  </div>
</template>

<style scoped>
.legal {
  max-width: 640px;
  margin: 0 auto;
}

.legal h1 {
  margin-bottom: var(--space-1);
}

.legal section {
  margin-top: var(--space-6);
}

.legal h2 {
  font-size: var(--text-md);
  margin-bottom: var(--space-2);
}

.legal p {
  color: var(--ink-2);
  line-height: 1.65;
}

.legal a {
  color: var(--accent);
}
</style>
