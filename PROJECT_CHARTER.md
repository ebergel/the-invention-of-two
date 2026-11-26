# Project Charter — *What Is Life* Evolutionary Emergence Lab

> **Single Source of Truth** syncing the live Observatory (`/`), the Multimedia Wiki (`/guide.html`), the Take-01 Archive (`/take01.html`), and automated verification (`tests/`).
> Established before connecting formal scientific rigor / Lantern methods so objectives, invariants, and assumptions remain 100% explicit.

---

## 1. Core Objective
Build a falsifiable, first-principles evolutionary laboratory guided by **Evolutionary Occam's Razor**:
- Isolate the **minimum primordial set of physical, ecological, and genetic conditions** under which a Target Emergent Behaviour (**TEB**) arises spontaneously — **without hard-coding the target concept**.
- Separate **Origin** (invasion from rarity / symmetry breaking), **Equilibrium** (stable persistence or oscillation), and **Hysteresis / Lock-In** (whether the behaviour survives if the original trigger is removed).
- Pair every claimed emergence with explicit **Negative Controls** that fail cleanly when the load-bearing physical condition is removed.

---

## 2. Project Lineage & Historical Attribution

| Milestone | Route / Git Ref | Paradigm | Core Contribution |
| --- | --- | --- | --- |
| **Take 01 — Mating Systems & Traps** | `/take01.html` · Tag `v0.1-take01-mating-lab` (`d19401f`) | **Pre-Labeled Sexes (`'M'` / `'F'`)** | Bateman's Principle, Fisherian runaway, Platt (2005) social-cue valuation, supernormal decoy traps, individual learning vs. variable-ratio novelty, 18-page Multimedia Wiki & TEB Atlas. |
| **Take 02 — *Gnothi Seauton*: The Invention of Two** | `/` (`index.html`) · Promoted to `main` | **True Emergence (Zero `'M'`/`'F'` in Code)** | Prompted by an open *"Know thyself"* freedom challenge; Antigravity chose to abolish hard-coded sex labels, introduce co-evolving 8-bit Red Queen parasites, implement Parker–Baker–Smith yolk biophysics, and bake falsification Negative Controls into the Observatory. |
| **Next Phase — Formal Scientific Rigor** | *Upcoming (gated on Charter lock-in)* | **Ablation, Phase Diagrams & Lantern Methods** | Systematic invariant isolation, multi-seed sweeps, parameter phase maps, and hysteresis testing. |

---

## 3. Active Minimal Model (`/` — *The Invention of Two*)

**Banned Words in Engine & Renderer (`src/genesis/`):** `'M'`, `'F'`, `male`, `female`, `sex`.

### Continuous Organism State ([src/genesis/engine.js](src/genesis/engine.js))
Every organism is initialized symmetrically with five evolvable / inheritable properties:
- `recombine` ∈ `[0.01, 0.99]` — reproductive mode (`< 0.50` clonal mitosis vs. `≥ 0.50` sexual gamete fusion)
- `gameteSize` ∈ `[0.06, 0.94]` — starts unimodal at `0.50` (isogamy); fixed energy budget gives `count(s) = clamp(1.05 / (0.02 + s), 1, 20)`
- `postCare` ∈ `[0.01, 0.98]` — willingness to linger near and provision own recent zygotes
- `speed` ∈ `[0.25, 0.95]` — swimming speed vs. quadratic metabolic burn
- `immuneLock` ∈ `[0..255]` — 8-bit molecular lock defending against co-evolving 8-bit parasites

### Load-Bearing Physical Rules ([src/genesis/config.js](src/genesis/config.js))
1. **Two-Fold Cost of Sex (Energy Conservation):** Clonal mitosis turns one parent's budget into one daughter (`energy = 42`); sexual fusion requires two gametes from two distinct parents to create one zygote (`energy ≤ 40`).
2. **Red Queen Lock-and-Key Parasites:** Parasites carry an 8-bit `key`, crack hosts matching `≥ 7/8` bits (`parasiteDamage = 92` in Full Genesis), and replicate winning keys — creating negative frequency-dependent selection against clonal monocultures.
3. **Parker–Baker–Smith Cytoplasmic Yolk Biophysics:** Usable yolk scales superlinearly (`Y = s₁² + s₂²`); zygote viability follows a Hill curve `S(Y) = Y⁵ / (Y⁵ + K⁵)` with `K = 0.49` (harsh ocean) vs. `K = 0.015` (benign control). Geometric fusion radius scales purely as cell radii `1.6 + (s₁ + s₂) × 14.5`, and chemotactic plume strength scales with emitting volume `s³`.
4. **Segregating Gamete-Size Locus (Identified Genetic Invariant):** `gameteSize` segregates intact (`Parent A` OR `Parent B`) rather than blending `(A + B) / 2`, preventing intermediate hybrids from collapsing anisogamy every generation.

---

## 4. Explicit Core Assumptions & Known Idealizations
To preserve epistemic honesty, the current minimal model explicitly acknowledges:
1. **Single-locus segregating `gameteSize`:** Models a haploid mating-type / sex-determining locus; does not yet simulate the evolutionary origin of suppressed recombination (linkage lock-in) from blending polygenic traits.
2. **Thresholded obligate sex (`recombine ≥ 0.50`):** Cleanly contrasts obligate cloning vs. obligate sex (Hamilton 1980), setting aside facultative *Daphnia*-style switching for now.
3. **High parasite virulence & specificity:** Overcoming the two-fold cost via Red Queen alone requires strong virulence (`92`) and narrow lock specificity (`≥ 7/8` bits). We do *not* claim parasites are the sole historical origin of eukaryotic sex (DNA repair and Hill–Robertson interference act alongside them in nature).
4. **2D broadcast spawning & 8-bit immunity:** Idealized stand-ins for 3D marine hydrodynamics and multi-locus MHC / innate–adaptive immune cascades.
5. **Weak post-fusion care divergence (TEB 3):** In broadcast spawners without internal fertilization, gestation, or paternity-certainty asymmetry, macro-makers and micro-makers show only subtle care divergence — confirming empirically that gamete size alone does not mechanically dictate parental care (Kokko & Jennions 2008).

---

## 5. Automated Verification & Negative Controls
Both test suites must pass cleanly before any release or methodology shift:
- **Genesis Emergence & Falsification Suite** (`node --test tests/genesis.test.mjs` — 4 tests, including 3-replicate stochastic ensembles):
  1. *Negative Control 1 (Parasites OFF):* Clones crush sexual lineages (`meanRecombine < 0.28`).
  2. *TEB 2 (The Invention of Two, 3 replicates):* `0.50` isogamy spontaneously Y-forks into micro & macro sexes (`≥ 2/3` replicates hitting `bifurcationIndex ≥ 0.32`, both tails `≥ 10%`, middle valley `< 42%`).
  3. *Negative Control 2 (Benign Ocean, `K = 0.015`):* Disruptive pressure vanishes; two sexes do **not** emerge (`bifurcationIndex < 0.25`).
  4. *Full Genesis (`0 → Sex → Two`, 3 replicates):* Red Queen parasites drive recombination upward (`+0.25+`) and expand Shannon immune diversity across `≥ 2/3` independent replicates.
- **Take-01 Archive Suite** (`node --test tests/simulation.test.mjs` — 5 tests): Preserves regression safety for the archived Mating Systems Lab.
