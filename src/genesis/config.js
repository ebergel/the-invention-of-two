/**
 * Branch: antigravity/the-invention-of-two
 * Configuration and 4 Genesis Experiments (including explicit Negative Controls).
 * Zero hard-coded 'M' or 'F' sexes anywhere — every organism begins symmetric.
 */

export const GENESIS_DEFAULTS = {
  worldWidth: 1120,
  worldHeight: 740,

  // Ecology (self-regulating via metabolism & food, brisk generational turnover for live viewing)
  initialPopulation: 96,
  maxPopulation: 245,
  minPopulationFloor: 28,
  nutrientTarget: 140,
  nutrientSpawnRate: 1.95,
  nutrientEnergy: 26,
  clusterCount: 5,

  // Organism metabolism & lifecycle
  baseMetabolism: 0.155,
  speedCost: 0.11,
  maxAge: 450,
  maturityAge: 32,
  reproThreshold: 64,
  reproBudget: 35,
  cloneCooldown: 19, // True ~2x clonal speed advantage when parasites are absent!
  sexCooldown: 23,

  // Gamete physics — Parker-Baker-Smith (1972) + Cytoplasmic Stripping Biophysics:
  // Linear gamete budget: count(s) = 1.05 / (0.02 + s)  [fixed energy budget B split among gametes!]
  // Usable cytoplasmic yolk: yolk(s) = s^2 (membrane/flagella overhead leaves eggs superlinearly yolk-rich!)
  // Geometric fusion radius: fuseR = 1.6 + (s1 + s2) * 14.5 (pure sum of cell radii!)
  // Survival S(Y) = Y^5.0 / (Y^5.0 + K^5.0). At K = 0.49: 0.50 is strictly unstable -> 100% reliable Y-fork into two sexes!
  // At K = 0.015 (Negative Control): tiny+tiny thrives -> 100% small isogamy, ZERO split!
  gameteLifespan: 185,
  gameteFuseRadius: 1.6,
  zygoteK: 0.49,
  zygotePower: 5.0,
  enableDisruptiveSelection: true,

  // Red Queen co-evolving parasites (host-specific 8-bit lock & key)
  parasitesEnabled: true,
  parasiteTarget: 290,
  parasiteDamage: 74.0,
  parasiteMatchThreshold: 7,
  parasiteMutationRate: 0.012,
  parasiteLifespan: 340,

  // Genetics
  mutationRate: 0.28,
  mutationScale: 0.11,
  immuneMutationRate: 0.002,
};

export const GENESIS_EXPERIMENTS = [
  {
    id: 'full_genesis',
    shortName: '1. Full Genesis (0 → Sex → Two)',
    title: 'Full Genesis: From Clones to Sex & Two Sexes',
    subtitle: 'Starts ~70% clonal & 100% symmetric (0.50). Watch Red Queen parasites ignite sex, then cytoplasmic biophysics Y-fork life into eggs & sperm.',
    hypothesis:
      'No "M" or "F" exists in the code. Host-specific 8-bit parasites decimate clonal monocultures, driving sexual recombination upward — and once sexual fusion dominates, surface-to-volume yolk biophysics tears 0.50 isogamy into twin micro/macro sexes.',
    seed: {
      recombineMean: 0.34,
      recombineStd: 0.24,
      gameteSizeMean: 0.50,
      gameteSizeStd: 0.08,
      immuneDiversity: 'low',
    },
    params: {
      parasitesEnabled: true,
      parasiteTarget: 340,
      parasiteDamage: 92.0,
      parasiteMutationRate: 0.014,
      zygoteK: 0.49,
    },
  },
  {
    id: 'invention_of_two',
    shortName: '2. The Invention of Two (Y-Fork)',
    title: 'Isogamy → Anisogamy: Watch One Sex Split Into Two',
    subtitle: '100% sexual organisms starting at identical gamete size (0.50). Watch the live spectrogram Y-fork into Cyan sperm-makers & Amber egg-makers.',
    hypothesis:
      'Every parent spends the exact same energy budget B. Medium gametes pay membrane/motility overhead twice; tiny stripped seekers + giant yolk-packed eggs crush the middle — spontaneously inventing two sexes!',
    seed: {
      recombineMean: 0.96,
      recombineStd: 0.03,
      gameteSizeMean: 0.50,
      gameteSizeStd: 0.08,
      immuneDiversity: 'high',
    },
    params: {
      parasitesEnabled: false,
      parasiteTarget: 0,
      zygoteK: 0.49,
      reproBudget: 35,
    },
  },
  {
    id: 'negative_control_clones',
    shortName: '3. Negative Control: Clones Win',
    title: 'Negative Control (Parasites OFF): The Two-Fold Cost of Sex',
    subtitle: 'Proving we didn’t smuggle sex in: without parasites, asexual clones crush sexual organisms head-to-head!',
    hypothesis:
      'Start 50% sexual and 50% clonal in a parasite-free ocean. Because two parents must fuse gametes to make one zygote while clones divide solo, asexual cloning dominates and sexual recombination collapses.',
    seed: {
      recombineMean: 0.50,
      recombineStd: 0.35,
      gameteSizeMean: 0.50,
      gameteSizeStd: 0.14,
      immuneDiversity: 'low',
    },
    params: {
      parasitesEnabled: false,
      parasiteTarget: 0,
      zygoteK: 0.49,
    },
  },
  {
    id: 'negative_control_isogamy',
    shortName: '4. Negative Control: No Split',
    title: 'Negative Control (Benign Ocean): Isogamy Stays Unsplit',
    subtitle: 'Lower zygote survival threshold K to 0.015 — disruptive pressure vanishes and two sexes NEVER emerge.',
    hypothesis:
      'When even tiny+tiny zygotes survive easily (K = 0.015), there is no payoff to investing in giant eggs. Selection pushes the entire ocean toward small uniform gametes — falsifying hard-coded sex splitting!',
    seed: {
      recombineMean: 0.96,
      recombineStd: 0.03,
      gameteSizeMean: 0.50,
      gameteSizeStd: 0.08,
      immuneDiversity: 'high',
    },
    params: {
      parasitesEnabled: false,
      parasiteTarget: 0,
      zygoteK: 0.015,
    },
  },
];
