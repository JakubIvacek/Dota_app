## Git workflow

- NIKDY necommituj priamo na `main`.
- Každú zmenu rob na novej feature vetve: `feat/...`, `fix/...`, `docs/...`, `chore/...`.
- Po dokončení: push vetvy, otvor PR cez `gh pr create --fill`,
  a hneď ho mergni cez `gh pr merge --merge --delete-branch` (bez review, som jediný maintainer).
- Jeden logický celok = jeden PR. Väčšie úlohy pokojne rozdeľ na viac menších PR.
- PR titul píš výstižne (zobrazuje sa v histórii), body môže byť stručné.
