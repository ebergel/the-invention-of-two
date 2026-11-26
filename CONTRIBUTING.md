# Contributing to *The Invention of Two*

This project is an open-science laboratory built around **Evolutionary Occam's Razor**. Before opening a pull request or proposing a new Target Emergent Behaviour (TEB), please align with four core principles:

## 1. Zero-Label Formulation (Never Smuggle the Conclusion)
Do not hard-code the emergent property you want to explain. If you want a behaviour to emerge (sexes, cooperation, mate guarding, signaling, speciation), express only lower-level physical constraints, energy budgets, geometry, and evolvable continuous or bitwise traits.

## 2. Mandatory Negative Controls
Every new emergence experiment must ship with at least one **Negative Control** (in `tests/`) proving that removing the hypothesized selective pressure genuinely suppresses the emergent behaviour.

## 3. Keep Lab, Wiki, and Charter Strictly Synchronized
When changing simulation rules, equations, or experiments:
- Update [`PROJECT_CHARTER.md`](PROJECT_CHARTER.md) with any new invariants or known idealizations.
- Sync the corresponding article & TEB Atlas status in `src/wikiData.js` and `src/tebAtlasData.js`.
- Keep all automated checks green:

```bash
npm run check
npm test
```

## 4. Stay Zero-Dependency & Reproducible
The browser observatory and headless Node.js engine intentionally use pure ES modules, Canvas2D, and Node's built-in `node:test` runner so anyone can clone, run, inspect, and audit every line of physics without build-chain lock-in.
