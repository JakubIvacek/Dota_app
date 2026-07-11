<template>
  <div class="legal">
    <h1>Ochrana súkromia</h1>
    <p class="muted">Platné od 2026-07-11.</p>

    <section>
      <h2>Žiadny backend, žiadny účet</h2>
      <p>
        Dota Stats nemá vlastný server ani databázu — je to čisto frontendová appka.
        Nezbiera, neukladá ani neposiela žiadne osobné údaje na žiadny server pod
        našou kontrolou. Neexistuje registrácia ani prihlásenie.
      </p>
    </section>

    <section>
      <h2>Čo sa ukladá lokálne v prehliadači</h2>
      <p>Appka si do <code>localStorage</code> tvojho prehliadača ukladá len:</p>
      <ul>
        <li>nedávno pozreté hráčske profily (na zobrazenie histórie na hlavnej stránke),</li>
        <li>obľúbených hráčov, ak si niekoho označíš hviezdičkou,</li>
        <li>cache konštánt hrdinov/itemov od OpenDota (kvôli rýchlosti, nemenia sa často).</li>
      </ul>
      <p>
        Toto všetko ostáva výhradne v tvojom prehliadači, nikam sa neodosiela a
        vieš to kedykoľvek vymazať cez nastavenia prehliadača (vymazanie dát stránky).
      </p>
    </section>

    <section>
      <h2>Žiadne cookies, žiadna analytika</h2>
      <p>
        Appka nepoužíva cookies, sledovacie pixely ani analytické nástroje tretích strán.
      </p>
    </section>

    <section>
      <h2>Externé requesty</h2>
      <p>
        Keď si prezeráš štatistiky, tvoj prehliadač posiela requesty priamo na
        <a href="https://www.opendota.com/" target="_blank" rel="noopener">OpenDota API</a>
        (dáta o matchoch/hráčoch) a na Steam CDN (ikony hrdinov a itemov). Tieto
        requesty neprechádzajú cez žiadny náš server. Ako s dátami narába OpenDota,
        popisujú vo svojich vlastných podmienkach.
      </p>
    </section>

    <section>
      <h2>Kontakt</h2>
      <p>
        Otázky ohľadom súkromia patria na
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

.legal p,
.legal li {
  color: var(--ink-2);
  line-height: 1.65;
}

.legal ul {
  padding-left: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.legal a {
  color: var(--accent);
}

.legal code {
  background: var(--surface-2);
  border-radius: var(--radius-sm);
  padding: 0.1rem 0.35rem;
  font-size: var(--text-sm);
}
</style>
