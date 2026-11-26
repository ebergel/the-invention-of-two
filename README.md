# THE INVENTION OF TWO

**A zero-dependency, first-principles evolutionary emergence observatory — with zero hard-coded `'M'` or `'F'` sexes.**

> Guided by **Evolutionary Occam's Razor**: isolate the minimum primordial set of physical, ecological, and genetic conditions where a Target Emergent Behaviour (**TEB**) arises spontaneously — and verify every claim with explicit **Negative Controls** that fail when the load-bearing condition is removed.

---

## Live Online Observatory (GitHub Pages)

- **Primary Genesis Observatory (*The Invention of Two*):** https://ebergel.github.io/the-invention-of-two/
- **Synced Multimedia Wiki, Project Charter & TEB Atlas:** https://ebergel.github.io/the-invention-of-two/guide.html
- **Take-01 Archive (*Mating Systems & Decoy Traps*):** https://ebergel.github.io/the-invention-of-two/take01.html

---

## Local Quick Start (Zero Dependencies)

Requires **Node.js ≥ 20** (no `npm install` needed).

```bash
npm start
# or: node server.mjs
```

Then open in your browser:

| Route | Experience |
| --- | --- |
| **`http://127.0.0.1:4173/`** | **Primary Genesis Observatory (*The Invention of Two*)** — zero hard-coded sexes, live Y-Fork Spectrogram, Red Queen 8-bit Immune Radar, and interactive physics interventions. |
| **`http://127.0.0.1:4173/guide.html`** | **Synced Multimedia Wiki, Project Charter & TEB Atlas** — 20 interactive articles, 45-term glossary, and evolutionary transition DAG. |
| **`http://127.0.0.1:4173/take01.html`** | **Take-01 Archive (*Mating Systems & Decoy Traps*)** — preserved pre-labeled ♂/♀ simulator (Bateman's Principle, Platt 2005 valuation, supernormal decoys, and learning vs. novelty). |

---

## The 4 Built-In Observatory Experiments

Every organism in `src/genesis/` begins symmetric with continuous traits (`recombine`, `gameteSize = 0.50`, `postCare`, `speed`) and an 8-bit molecular `immuneLock`:

1. **Full Genesis (`0 → Sex → Two`):** Starts ~70% clonal & 100% symmetric (`0.50`) with co-evolving 8-bit parasites. Negative frequency-dependent selection (Red Queen) drives sexual recombination upward and expands immune-lock diversity, after which yolk biophysics tears `0.50` isogamy into twin micro/macro sexes.
2. **The Invention of Two (`Y-Fork`):** Starts 100% sexual at uniform `0.50` gamete size (`zygoteK = 0.49`). Under Parker–Baker–Smith cytoplasmic yolk physics (`Y = s₁² + s₂²`), the live spectrogram spontaneously Y-forks into electric-cyan micro-gamete seekers and golden-amber macro-egg vessels.
3. **Negative Control — Clones Win (`Parasites OFF`):** Proves sex was not smuggled in. Without parasites, the true two-fold cost of sex causes asexual clones to crush sexual lineages head-to-head.
4. **Negative Control — No Split (`Benign Ocean, K = 0.015`):** Proves two sexes were not hard-coded. When tiny+tiny zygotes survive easily, disruptive pressure vanishes and the ocean collapses to ~97% uniform small isogamy.

---

## Automated Verification

```bash
npm test          # Runs Genesis (4 tests, 3-replicate ensembles) + Take-01 (5 tests)
npm run check     # Syntax-checks all ES modules + validates Wiki internal links
```

---

## Project Architecture & Governance

- **[`PROJECT_CHARTER.md`](PROJECT_CHARTER.md)** — Single source of truth for objectives, active equations, identified invariants, explicit model idealizations, and test gates.
- **`src/genesis/`** — Headless simulation engine (`engine.js`, `config.js`), continuous bioluminescent Canvas2D microscopy renderer (`renderer.js`), spectrogram & radar charts (`charts.js`), and interactive controller (`main.js`).
- **`src/`** — Synced Wiki content (`wikiData.js`, `wikiWidgets.js`, `tebAtlasData.js`) and preserved Take-01 engine modules.
- **Git Lineage:** Original Take 01 is permanently tagged at `v0.1-take01-mating-lab`.

---

## Contributing & License

Contributions, ablations, and falsification tests are welcome — see [`CONTRIBUTING.md`](CONTRIBUTING.md) for our **Evolutionary Occam's Razor** guidelines.

Licensed under the [MIT License](LICENSE).
