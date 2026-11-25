/**
 * Genetics, inheritance, recombination, mutation, and the
 * Deaner, Khera & Platt (2005) Neuroeconomic "Pay-Per-View" Assay.
 */

export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

export function randRange(min, max) {
  return min + Math.random() * (max - min);
}

/** Box-Muller approximate standard normal */
export function randNormal() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Create an initial genome based on the experiment's starting profile.
 */
export function createSeedGenome(profile = 'naive') {
  switch (profile) {
    case 'evolved_high_drive':
      // Represents a population already adapted to an ancestral world without fake decoys:
      // high mating drive, strong rival monitoring, very low cognitive filter for fake screens.
      return {
        w_mate: clamp(0.74 + randNormal() * 0.12, 0.25, 0.98),
        w_status: clamp(0.62 + randNormal() * 0.14, 0.15, 0.95),
        display: clamp(0.55 + randNormal() * 0.15, 0.1, 0.95),
        choosiness: clamp(0.58 + randNormal() * 0.14, 0.15, 0.95),
        discernment: clamp(0.11 + Math.abs(randNormal()) * 0.08, 0.02, 0.35),
        forage_speed: clamp(0.58 + randNormal() * 0.12, 0.25, 0.95),
      };

    case 'naive_status':
      return {
        w_mate: clamp(0.52 + randNormal() * 0.18, 0.1, 0.92),
        w_status: clamp(0.22 + randNormal() * 0.15, 0.02, 0.65),
        display: clamp(0.35 + randNormal() * 0.18, 0.05, 0.85),
        choosiness: clamp(0.45 + randNormal() * 0.18, 0.08, 0.88),
        discernment: clamp(0.12 + randNormal() * 0.08, 0.02, 0.4),
        forage_speed: clamp(0.54 + randNormal() * 0.14, 0.25, 0.95),
      };

    case 'ornament_seed':
      return {
        w_mate: clamp(0.6 + randNormal() * 0.15, 0.15, 0.95),
        w_status: clamp(0.45 + randNormal() * 0.16, 0.1, 0.9),
        display: clamp(0.38 + randNormal() * 0.2, 0.05, 0.85),
        choosiness: clamp(0.52 + randNormal() * 0.2, 0.1, 0.92),
        discernment: clamp(0.1 + randNormal() * 0.08, 0.02, 0.35),
        forage_speed: clamp(0.56 + randNormal() * 0.14, 0.25, 0.95),
      };

    case 'mixed':
      return {
        w_mate: clamp(0.42 + randNormal() * 0.22, 0.04, 0.92),
        w_status: clamp(0.42 + randNormal() * 0.22, 0.04, 0.92),
        display: clamp(0.42 + randNormal() * 0.22, 0.04, 0.92),
        choosiness: clamp(0.42 + randNormal() * 0.22, 0.04, 0.92),
        discernment: clamp(0.25 + randNormal() * 0.16, 0.02, 0.75),
        forage_speed: clamp(0.52 + randNormal() * 0.16, 0.25, 0.95),
      };

    case 'naive':
    default:
      return {
        w_mate: clamp(0.34 + randNormal() * 0.2, 0.04, 0.88),
        w_status: clamp(0.34 + randNormal() * 0.2, 0.04, 0.88),
        display: clamp(0.28 + randNormal() * 0.18, 0.03, 0.82),
        choosiness: clamp(0.36 + randNormal() * 0.18, 0.05, 0.85),
        discernment: clamp(0.12 + randNormal() * 0.1, 0.02, 0.45),
        forage_speed: clamp(0.52 + randNormal() * 0.15, 0.25, 0.95),
      };
  }
}

const GENOME_KEYS = [
  'w_mate',
  'w_status',
  'display',
  'choosiness',
  'discernment',
  'forage_speed',
];

/**
 * Sexual recombination (Mendelian blend + independent assortment) + mutation.
 */
export function recombineGenomes(motherG, fatherG, mutationRate, mutationScale) {
  const child = {};
  for (const key of GENOME_KEYS) {
    // Independent assortment with slight continuous quantitative blending
    const r = Math.random();
    let val;
    if (r < 0.35) val = motherG[key];
    else if (r < 0.7) val = fatherG[key];
    else val = 0.5 * (motherG[key] + fatherG[key]);

    if (Math.random() < mutationRate) {
      val += randNormal() * mutationScale;
    }
    const minBound = key === 'forage_speed' ? 0.2 : 0.01;
    child[key] = clamp(val, minBound, 0.99);
  }
  return child;
}

/**
 * Asexual clonal inheritance + mutation.
 */
export function cloneGenome(parentG, mutationRate, mutationScale) {
  const child = {};
  for (const key of GENOME_KEYS) {
    let val = parentG[key];
    if (Math.random() < mutationRate) {
      val += randNormal() * mutationScale;
    }
    const minBound = key === 'forage_speed' ? 0.2 : 0.01;
    child[key] = clamp(val, minBound, 0.99);
  }
  return child;
}

/**
 * Compute the Deaner, Khera & Platt (2005) "Pay-Per-View" Assay
 * across the currently living male population (or asexual agents as control).
 *
 * Returns Point of Subjective Equivalence (PSE) as % of a standard cherry-juice
 * reward an average agent willingly sacrifices (+) or demands as extra bribe (-)
 * to view each social/sexual stimulus class.
 */
export function computePlattAssay(agents, params) {
  const sample =
    params.regime === 'sexual'
      ? agents.filter((a) => a.sex === 'M')
      : agents;

  if (sample.length === 0) {
    return {
      femaleCuePSE: 0,
      dominantMalePSE: 0,
      subordinateMalePSE: 0,
      decoyVulnerability: 0,
      sampleSize: 0,
    };
  }

  let sumFemale = 0;
  let sumDominant = 0;
  let sumSubordinate = 0;
  let sumDecoyVuln = 0;

  for (const a of sample) {
    const g = a.genome;
    // Willingness to sacrifice juice for fertile female visual cue (% of reward, up to ~48%)
    // Well-fed males (high energy) willingly pay more juice than starving males.
    const energyFactor = 0.72 + 0.42 * clamp(a.energy / 120, 0, 1.15);
    const femalePSE =
      params.regime === 'sexual'
        ? (g.w_mate * 44 - 4) * energyFactor
        : g.w_mate * 8 - 6;

    // Willingness to sacrifice juice to monitor a dominant/alpha male face (Platt's omitted finding)
    const domPSE =
      params.regime === 'sexual'
        ? g.w_status * 34 - 3
        : g.w_status * 6 - 5;

    // Subordinate faces carry low strategic value — macaques required a juice "overpayment" (negative PSE)
    const subPSE =
      params.regime === 'sexual'
        ? -(4 + g.w_status * 16)
        : -6;

    // Effective hijack vulnerability if exposed to a supernormal decoy
    const decoySusceptibility = clamp(
      g.w_mate * (1 - g.discernment * 0.92) * (params.decoySalience / 2.35),
      0,
      1
    );

    sumFemale += femalePSE;
    sumDominant += domPSE;
    sumSubordinate += subPSE;
    sumDecoyVuln += decoySusceptibility * 100;
  }

  const n = sample.length;
  return {
    femaleCuePSE: +(sumFemale / n).toFixed(1),
    dominantMalePSE: +(sumDominant / n).toFixed(1),
    subordinateMalePSE: +(sumSubordinate / n).toFixed(1),
    decoyVulnerability: +(sumDecoyVuln / n).toFixed(1),
    sampleSize: n,
  };
}

/**
 * Compute Gini coefficient for an array of non-negative numbers (e.g. offspring counts).
 * 0 = perfect equality, -> 1 = extreme winner-take-most concentration.
 */
export function computeGini(values) {
  const n = values.length;
  if (n === 0) return 0;
  let total = 0;
  for (let i = 0; i < n; i++) total += values[i];
  if (total === 0) return 0;

  const sorted = values.slice().sort((a, b) => a - b);
  let weightedSum = 0;
  for (let i = 0; i < n; i++) {
    weightedSum += (2 * (i + 1) - n - 1) * sorted[i];
  }
  return clamp(weightedSum / (n * total), 0, 1);
}
