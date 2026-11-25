/**
 * Configuration, default parameters, and curated Laboratory Experiments
 * for "What Is Life" Lab — Chapter: The Role of Sexual Reproduction.
 */

export const DEFAULT_PARAMS = {
  // Regime: 'sexual' | 'asexual'
  regime: 'sexual',

  // World dimensions (logical simulation units)
  worldWidth: 1100,
  worldHeight: 740,

  // Carrying capacity & ecology (self-regulating via resource competition, not birth cap)
  initialPopulation: 96,
  maxPopulation: 260,
  minPopulationFloor: 28,
  foodTargetCount: 128,
  foodSpawnRate: 1.55,
  foodEnergyValue: 26,
  foodClusterCount: 5,

  // Metabolism & lifespan (tuned for lively generational turnover)
  baseMetabolism: 0.095,
  speedCostFactor: 0.12,
  displayCostFactor: 0.095,
  discernmentCostFactor: 0.022,
  maxAge: 1150,
  maturityAge: 90,

  // Anisogamy & reproduction
  anisogamyRatio: 4.5,
  baseMaleMateCost: 7,
  baseFemaleMateCost: 40,
  maleCooldown: 16,
  femaleCooldown: 115,
  reproEnergyMinFemale: 68,
  reproEnergyMinMale: 30,
  asexualSplitThreshold: 88,
  asexualSplitCost: 44,

  // Sexual selection & competition
  femaleChoosinessBias: 0.58,
  contestEnergyCost: 16,
  contestRadius: 48,
  mateRadius: 24,
  senseRadius: 195,

  // Evolution
  mutationRate: 0.24,
  mutationScale: 0.11,

  // Supernormal Stimuli ("Pay-Per-View" / Pixels on a Screen)
  decoyCount: 0,
  decoySalience: 2.55,
  decoyJuiceDrain: 0.34,
  decoyRadius: 76,

  // Individual Learning (Vertebrate Habituation vs. Novelty Refresh)
  learningEnabled: false,
  habituationRate: 0.022,
  decoyNoveltyRefresh: false,
};

export const TRAIT_META = {
  w_mate: {
    key: 'w_mate',
    label: 'Mating Drive',
    short: 'w_mate',
    color: '#38bdf8',
    desc: 'Willingness to sacrifice foraging ("cherry juice") to pursue female cues (Platt PSE).',
  },
  w_status: {
    key: 'w_status',
    label: 'Rival Tracking',
    short: 'w_status',
    color: '#a78bfa',
    desc: "Platt's omitted axis: attention paid to dominant rivals to avoid losing fights & contest weaker ones.",
  },
  display: {
    key: 'display',
    label: 'Costly Display',
    short: 'display',
    color: '#fb7185',
    desc: 'Metabolically expensive ornament/vigor signal favored by choosy females (Zahavi handicap).',
  },
  choosiness: {
    key: 'choosiness',
    label: 'Female Selectivity',
    short: 'choose',
    color: '#fbbf24',
    desc: 'Female quality threshold for accepting a suitor based on combined status & display.',
  },
  discernment: {
    key: 'discernment',
    label: 'Cue Discernment',
    short: 'discern',
    color: '#34d399',
    desc: 'Cognitive resistance to fake supernormal proxies ("pixels"), carrying a small neural energy cost.',
  },
};

export const EXPERIMENTS = [
  {
    id: 'sexual_emergence',
    shortName: '1. Anisogamy & Skew',
    title: 'Anisogamy & Male Competition',
    subtitle: 'Why sex splits fitness into survival vs. reproductive tournament',
    hypothesis:
      'Asymmetric parental investment (cheap sperm vs. costly gestation) creates winner-take-most male variance (high Male Gini). Males evolve high Mating Drive (w_mate) and costly displays even at the expense of energy reserves.',
    seedProfile: 'naive',
    params: {
      regime: 'sexual',
      anisogamyRatio: 4.5,
      foodTargetCount: 130,
      foodSpawnRate: 1.55,
      femaleChoosinessBias: 0.62,
      contestEnergyCost: 15,
      decoyCount: 0,
      mutationRate: 0.24,
      mutationScale: 0.11,
    },
  },
  {
    id: 'asexual_control',
    shortName: '2. Asexual Baseline',
    title: 'Asexual Control: Eat, Grow & Divide',
    subtitle: 'Without sexes, survival and solo clonal reproduction run on one aligned track',
    hypothesis:
      'In a clonal world, organisms still reproduce — they just eat, grow, and divide solo without needing a mate. Paying energy for ornaments, status tracking, or mating cues yields zero fitness gain, so costly displays decay and there is no male–female Gini split.',
    seedProfile: 'mixed',
    params: {
      regime: 'asexual',
      anisogamyRatio: 1.0,
      foodTargetCount: 125,
      foodSpawnRate: 1.45,
      femaleChoosinessBias: 0.0,
      contestEnergyCost: 0,
      decoyCount: 0,
      mutationRate: 0.24,
      mutationScale: 0.11,
    },
  },
  {
    id: 'platt_hierarchy',
    shortName: '3. Platt Rival Tracking',
    title: "Platt's Missing Half: Dominance & Status",
    subtitle: 'High-stakes contests force males to pay attention to Alpha rivals',
    hypothesis:
      'Deaner, Khera & Platt (2005) found male macaques also paid juice to view dominant male faces. When fights are costly, Rival Tracking (w_status) co-evolves with Mating Drive so males dodge alphas and displace weaker competitors.',
    seedProfile: 'naive_status',
    params: {
      regime: 'sexual',
      anisogamyRatio: 5.0,
      foodTargetCount: 120,
      foodSpawnRate: 1.45,
      femaleChoosinessBias: 0.65,
      contestEnergyCost: 28,
      decoyCount: 0,
      mutationRate: 0.26,
      mutationScale: 0.11,
    },
  },
  {
    id: 'pay_per_view_trap',
    shortName: '4. Pay-Per-View Trap',
    title: 'Supernormal Stimuli: The "Pixels" Trap',
    subtitle: 'Decoupling ancient reproductive cues from fitness payoff',
    hypothesis:
      'Drop high-salience, zero-fitness Decoy Beacons into an evolved high-drive population. High w_mate / low discernment males drain their "cherry juice" staring at decoys, handing reproductive victory to calmer or more discerning rivals.',
    seedProfile: 'evolved_high_drive',
    params: {
      regime: 'sexual',
      anisogamyRatio: 4.5,
      foodTargetCount: 135,
      foodSpawnRate: 1.6,
      femaleChoosinessBias: 0.65,
      contestEnergyCost: 14,
      decoyCount: 5,
      decoySalience: 2.7,
      decoyJuiceDrain: 0.36,
      mutationRate: 0.28,
      mutationScale: 0.12,
    },
  },
  {
    id: 'runaway_handicap',
    shortName: '5. Costly Ornaments',
    title: 'High Selectivity & Costly Ornaments',
    subtitle: 'Intense female selectivity pushing male displays toward the survival cliff',
    hypothesis:
      'With abundant food and an externally raised female selectivity bias (0.92), male display climbs toward the metabolic survival cliff. (Note: this tests strong directional mate choice rather than pure spontaneous Fisherian runaway.)',
    seedProfile: 'ornament_seed',
    params: {
      regime: 'sexual',
      anisogamyRatio: 5.5,
      foodTargetCount: 165,
      foodSpawnRate: 1.95,
      femaleChoosinessBias: 0.92,
      contestEnergyCost: 12,
      decoyCount: 0,
      mutationRate: 0.26,
      mutationScale: 0.12,
    },
  },
];
