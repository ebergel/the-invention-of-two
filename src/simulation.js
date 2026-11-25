/**
 * Pure headless Agent-Based Evolutionary Simulation Engine.
 * Models anisogamy, sexual vs. asexual reproduction, Platt's (2005)
 * common-currency neuroeconomic valuation (foraging vs. female cues vs.
 * dominant rival monitoring), Zahavi's costly display, and supernormal
 * stimulus ("pay-per-view" decoy) traps.
 *
 * Zero DOM dependencies — can run in both browser and Node.js test harness.
 */

import { DEFAULT_PARAMS, EXPERIMENTS } from './config.js';
import {
  clamp,
  randRange,
  createSeedGenome,
  recombineGenomes,
  cloneGenome,
  computePlattAssay,
  computeGini,
} from './genetics.js';

let nextAgentId = 1;
let nextDecoyId = 1;
let nextFoodId = 1;

export class EvolutionSimulation {
  constructor(initialExperimentId = 'sexual_emergence', customParams = {}) {
    this.params = { ...DEFAULT_PARAMS, ...customParams };
    this.currentExperiment = null;
    this.loadExperiment(initialExperimentId, customParams);
  }

  loadExperiment(experimentId, overrides = {}) {
    const exp = EXPERIMENTS.find((e) => e.id === experimentId) || EXPERIMENTS[0];
    this.currentExperiment = exp;
    this.params = {
      ...DEFAULT_PARAMS,
      ...exp.params,
      ...overrides,
    };
    this.reset(exp.seedProfile);
  }

  reset(seedProfile = null) {
    const profile = seedProfile || (this.currentExperiment ? this.currentExperiment.seedProfile : 'naive');
    nextAgentId = 1;
    nextDecoyId = 1;
    nextFoodId = 1;

    this.tick = 0;
    this.generationMax = 1;
    this.totalBirths = 0;
    this.totalContests = 0;
    this.totalDecoyTrappedTicks = 0;
    this.selectedAgentId = null;

    this.agents = [];
    this.foods = [];
    this.decoys = [];
    this.effects = []; // Transient visual events (mating bursts, contest sparks, juice drains)
    this.tethers = []; // Current-tick attention/assessment/trap lines for renderer

    // Ecological nutrient hotspots ("cherry juice" clusters)
    this.clusters = [];
    for (let i = 0; i < this.params.foodClusterCount; i++) {
      this.clusters.push({
        x: randRange(120, this.params.worldWidth - 120),
        y: randRange(100, this.params.worldHeight - 100),
        vx: randRange(-0.18, 0.18),
        vy: randRange(-0.18, 0.18),
        radius: randRange(95, 155),
      });
    }

    // Seed initial nutrients
    for (let i = 0; i < this.params.foodTargetCount; i++) {
      this.spawnFood();
    }

    // Seed initial population
    const n = this.params.initialPopulation;
    for (let i = 0; i < n; i++) {
      const sex = this.params.regime === 'asexual' ? 'A' : i % 2 === 0 ? 'M' : 'F';
      const agent = this.createAgent({
        x: randRange(60, this.params.worldWidth - 60),
        y: randRange(60, this.params.worldHeight - 60),
        sex,
        genome: createSeedGenome(profile),
        generation: 1,
        energy: randRange(62, 95),
        age: Math.floor(randRange(120, 520)), // Start mixed adult/juvenile so action begins promptly
      });
      this.agents.push(agent);
    }

    // Seed decoys if configured
    for (let i = 0; i < this.params.decoyCount; i++) {
      this.addDecoy();
    }

    // Rolling cohort archive of completed adult lives for clean Bateman statistics
    this.completedMales = [];
    this.completedFemales = [];
    this.completedAsexual = [];

    // Time series history (sampled every 25 ticks)
    this.history = [];
    this.milestones = [];
    this.firedMilestoneFlags = new Set();

    this.updateDominanceRanks();
    this.recordMetricsSnapshot();
    this.addMilestone(
      'Lab Initialized',
      this.currentExperiment
        ? `${this.currentExperiment.title}: ${this.currentExperiment.subtitle}.`
        : 'Custom sandbox initialized.'
    );
  }

  createAgent({ x, y, sex, genome, generation = 1, energy = 58, age = 0, parentIds = [] }) {
    const angle = randRange(0, Math.PI * 2);
    return {
      id: nextAgentId++,
      x,
      y,
      vx: Math.cos(angle) * 0.5,
      vy: Math.sin(angle) * 0.5,
      heading: angle,
      sex, // 'M' | 'F' | 'A'
      genome,
      generation,
      parentIds,
      energy,
      maxEnergy: 140,
      age,
      cooldown: Math.floor(randRange(0, 30)),
      receptiveWait: 0,
      offspringCount: 0,
      contestWins: 0,
      contestLosses: 0,
      contestScore: 0,
      dominance: 0.5,
      statusRank: 0.5, // 0..1 percentile among living males
      isAlpha: false,
      state: 'forage', // 'forage' | 'pursue_female' | 'trapped_decoy' | 'yield_alpha' | 'contest' | 'receptive'
      captivatedByDecoyId: null,
      trappedTicks: 0,
      decoyHabituation: 0, // 0..1 learned resistance when learningEnabled is true
      // Live utility breakdown for the Agent Inspector
      utilities: {
        food: 0,
        female: 0,
        rival: 0,
        decoy: 0,
      },
      focusTarget: null, // { type, x, y, id }
      pulsePhase: randRange(0, Math.PI * 2),
    };
  }

  spawnFood(customX = null, customY = null) {
    let x, y;
    if (customX !== null && customY !== null) {
      x = clamp(customX, 24, this.params.worldWidth - 24);
      y = clamp(customY, 24, this.params.worldHeight - 24);
    } else if (this.clusters.length > 0 && Math.random() < 0.82) {
      const c = this.clusters[Math.floor(Math.random() * this.clusters.length)];
      const r = Math.sqrt(Math.random()) * c.radius;
      const theta = Math.random() * Math.PI * 2;
      x = clamp(c.x + Math.cos(theta) * r, 24, this.params.worldWidth - 24);
      y = clamp(c.y + Math.sin(theta) * r, 24, this.params.worldHeight - 24);
    } else {
      x = randRange(28, this.params.worldWidth - 28);
      y = randRange(28, this.params.worldHeight - 28);
    }

    this.foods.push({
      id: nextFoodId++,
      x,
      y,
      energy: this.params.foodEnergyValue,
      radius: randRange(3.4, 4.8),
      phase: randRange(0, Math.PI * 2),
    });
  }

  addDecoy(customX = null, customY = null) {
    const pad = 115;
    let x = customX;
    let y = customY;
    if (x === null || y === null) {
      // Spread decoys comfortably across the arena
      let bestX = randRange(pad, this.params.worldWidth - pad);
      let bestY = randRange(pad, this.params.worldHeight - pad);
      let bestMinDist = -1;
      for (let attempt = 0; attempt < 12; attempt++) {
        const cx = randRange(pad, this.params.worldWidth - pad);
        const cy = randRange(pad, this.params.worldHeight - pad);
        let minD = Infinity;
        for (const d of this.decoys) {
          const dist = Math.hypot(cx - d.x, cy - d.y);
          if (dist < minD) minD = dist;
        }
        if (minD > bestMinDist) {
          bestMinDist = minD;
          bestX = cx;
          bestY = cy;
        }
      }
      x = bestX;
      y = bestY;
    }

    const decoy = {
      id: nextDecoyId++,
      x: clamp(x, 60, this.params.worldWidth - 60),
      y: clamp(y, 60, this.params.worldHeight - 60),
      radius: this.params.decoyRadius,
      phase: randRange(0, Math.PI * 2),
      captivatedCount: 0,
      totalJuiceDrained: 0,
    };
    this.decoys.push(decoy);
    this.params.decoyCount = this.decoys.length;
    return decoy;
  }

  removeDecoyNear(x, y, maxDist = 42) {
    let idx = -1;
    let bestD = maxDist;
    for (let i = 0; i < this.decoys.length; i++) {
      const d = Math.hypot(this.decoys[i].x - x, this.decoys[i].y - y);
      if (d < bestD) {
        bestD = d;
        idx = i;
      }
    }
    if (idx !== -1) {
      this.decoys.splice(idx, 1);
      this.params.decoyCount = this.decoys.length;
      return true;
    }
    return false;
  }

  clearDecoys() {
    this.decoys = [];
    this.params.decoyCount = 0;
  }

  syncDecoyCount(targetCount) {
    const target = Math.max(0, Math.min(12, Math.round(targetCount)));
    while (this.decoys.length < target) this.addDecoy();
    while (this.decoys.length > target) this.decoys.pop();
    this.params.decoyCount = this.decoys.length;
  }

  setRegime(regime) {
    if (regime === this.params.regime) return;
    this.params.regime = regime;
    // Convert existing population smoothly so the user can even flip regimes live!
    for (let i = 0; i < this.agents.length; i++) {
      this.agents[i].sex = regime === 'asexual' ? 'A' : i % 2 === 0 ? 'M' : 'F';
      this.agents[i].captivatedByDecoyId = null;
    }
    this.addMilestone(
      regime === 'sexual' ? 'Sexual Regime Enabled' : 'Asexual Regime Enabled',
      regime === 'sexual'
        ? 'Anisogamy active: males now compete and pay neuroeconomic costs for mating cues.'
        : 'Clonal reproduction active: pure metabolic foraging optimization.'
    );
  }

  triggerBottleneck() {
    if (this.agents.length <= 28) return;
    // Remove 45% of lowest-energy individuals (environmental stress test)
    const sorted = this.agents.slice().sort((a, b) => b.energy - a.energy);
    const keepCount = Math.max(24, Math.floor(sorted.length * 0.55));
    const survivors = new Set(sorted.slice(0, keepCount).map((a) => a.id));
    for (const a of this.agents) {
      if (!survivors.has(a.id)) {
        this.archiveCompletedLife(a);
      }
    }
    this.agents = this.agents.filter((a) => survivors.has(a.id));
    this.addMilestone(
      'Ecological Bottleneck',
      `Resource shock culled the weakest 45%; ${this.agents.length} highest-vigor organisms survived.`
    );
  }

  findAgentAt(x, y, maxDist = 26) {
    let best = null;
    let bestD = maxDist;
    for (const a of this.agents) {
      const d = Math.hypot(a.x - x, a.y - y);
      if (d < bestD) {
        bestD = d;
        best = a;
      }
    }
    return best;
  }

  addEffect(type, x, y, color, extra = {}) {
    if (this.effects.length > 140) this.effects.shift();
    this.effects.push({
      type, // 'mate' | 'contest' | 'birth' | 'juice_drain' | 'death'
      x,
      y,
      color,
      age: 0,
      maxAge: extra.maxAge || 28,
      ...extra,
    });
  }

  addMilestone(title, text) {
    this.milestones.unshift({
      tick: this.tick,
      gen: this.generationMax,
      title,
      text,
    });
    if (this.milestones.length > 24) this.milestones.pop();
  }

  updateDominanceRanks() {
    const males = [];
    for (const a of this.agents) {
      if (a.sex === 'M') {
        const vigor = clamp(a.energy / 115, 0, 1.15);
        const contestBonus = clamp(a.contestScore * 0.08, -0.2, 0.35);
        a.dominance = clamp(
          0.46 * vigor + 0.36 * a.genome.display + 0.18 * (0.5 + contestBonus),
          0.02,
          1.2
        );
        males.push(a);
      } else {
        a.dominance = clamp(a.energy / 120, 0.05, 1);
        a.statusRank = 0.5;
        a.isAlpha = false;
      }
    }

    if (males.length === 0) return;
    males.sort((a, b) => a.dominance - b.dominance);
    const denom = Math.max(1, males.length - 1);
    for (let i = 0; i < males.length; i++) {
      males[i].statusRank = i / denom;
      males[i].isAlpha = males[i].statusRank >= 0.84 && males[i].age >= this.params.maturityAge;
    }
  }

  step() {
    this.tick++;
    this.tethers = [];

    // 1. Drift food clusters & replenish cherry juice
    for (const c of this.clusters) {
      c.x += c.vx;
      c.y += c.vy;
      if (c.x < 100 || c.x > this.params.worldWidth - 100) c.vx *= -1;
      if (c.y < 90 || c.y > this.params.worldHeight - 90) c.vy *= -1;
    }

    const deficit = this.params.foodTargetCount - this.foods.length;
    if (deficit > 0) {
      const rate = this.params.foodSpawnRate * (deficit > 35 ? 1.5 : 1.0);
      const guaranteed = Math.floor(rate);
      for (let i = 0; i < guaranteed; i++) this.spawnFood();
      if (Math.random() < rate - guaranteed) this.spawnFood();
    }

    // Reset decoy counters for this tick
    for (const d of this.decoys) {
      d.captivatedCount = 0;
      d.phase += 0.05;
    }

    // Recompute dominance ranks every 4 ticks
    if (this.tick % 4 === 0) {
      this.updateDominanceRanks();
    }

    const newOffspring = [];
    const senseR = this.params.senseRadius;
    const senseR2 = senseR * senseR;

    // 2. Agent perception, neuroeconomic decision-making, movement & interactions
    for (let i = 0; i < this.agents.length; i++) {
      const a = this.agents[i];
      a.age++;
      a.pulsePhase += 0.08;
      if (a.cooldown > 0) a.cooldown--;
      a.contestScore *= 0.996; // Slow decay of contest reputation
      a.captivatedByDecoyId = null;
      a.focusTarget = null;

      const isMature = a.age >= this.params.maturityAge;

      // Locate nearest food
      let nearestFood = null;
      let nearestFoodDist2 = senseR2 * 1.45;
      for (let f = 0; f < this.foods.length; f++) {
        const food = this.foods[f];
        const dx = food.x - a.x;
        const dy = food.y - a.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < nearestFoodDist2) {
          nearestFoodDist2 = d2;
          nearestFood = food;
        }
      }

      const maxSpeed = 1.05 + a.genome.forage_speed * 2.15;
      let desiredVx = a.vx;
      let desiredVy = a.vy;

      if (a.sex === 'M' && this.params.regime === 'sexual') {
        // === MALE NEUROECONOMIC ALLOCATION (PLATT 2005 ENGINE) ===
        const hunger = clamp(1.18 - a.energy / 118, 0.08, 1.35);
        const uFood = nearestFood
          ? (hunger * 1.65) / (Math.sqrt(nearestFoodDist2) / 55 + 0.55)
          : 0;

        // Scan nearby receptive females & male rivals
        let bestFemale = null;
        let bestFemaleUtility = 0;
        let closestStrongerRival = null;
        let closestStrongerDist = Infinity;
        let closestWeakerRival = null;
        let closestWeakerDist = Infinity;
        let closestAnyRival = null;
        let closestAnyRivalDist = Infinity;

        const canMate = isMature && a.cooldown <= 0 && a.energy >= this.params.reproEnergyMinMale;
        const femaleSenseR = senseR * (0.62 + 0.78 * a.genome.w_mate);

        for (let j = 0; j < this.agents.length; j++) {
          if (i === j) continue;
          const other = this.agents[j];
          const dx = other.x - a.x;
          const dy = other.y - a.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > femaleSenseR * femaleSenseR && d2 > senseR2) continue;
          const dist = Math.sqrt(d2);

          if (other.sex === 'F' && canMate && dist <= femaleSenseR && this.isFemaleReceptive(other)) {
            const u = (a.genome.w_mate * 2.85) / (dist / 64 + 0.42);
            if (u > bestFemaleUtility) {
              bestFemaleUtility = u;
              bestFemale = other;
            }
          } else if (other.sex === 'M' && dist <= senseR && other.age >= this.params.maturityAge && isMature) {
            if (dist < closestAnyRivalDist) {
              closestAnyRivalDist = dist;
              closestAnyRival = other;
            }
            if (other.dominance > a.dominance + 0.06 && dist < closestStrongerDist) {
              closestStrongerDist = dist;
              closestStrongerRival = other;
            } else if (other.dominance < a.dominance - 0.05 && dist < closestWeakerDist) {
              closestWeakerDist = dist;
              closestWeakerRival = other;
            }
          }
        }

        // Scan Supernormal Decoys ("Pixels on a Screen")
        let bestDecoy = null;
        let bestDecoyUtility = 0;
        let bestDecoyDist = Infinity;
        if (!this.params.learningEnabled) {
          a.decoyHabituation = 0;
        } else if (this.params.decoyNoveltyRefresh && a.decoyHabituation > 0.1 && Math.random() < 0.015) {
          // Variable-ratio novelty refresh partially defeats habituation (incentive salience re-hook)
          a.decoyHabituation *= 0.35;
        }

        if (isMature && this.decoys.length > 0) {
          // Cognitive filter (genetic discernment) + optional individual learning (habituation)
          const geneticFilter = Math.max(0.03, Math.pow(1 - a.genome.discernment, 1.45));
          const learnedFilter = this.params.learningEnabled
            ? Math.max(0.05, 1 - a.decoyHabituation * 0.95)
            : 1.0;
          const perceivedSalience = this.params.decoySalience * geneticFilter * learnedFilter;
          const decoyRange = senseR * 2.05;

          for (const decoy of this.decoys) {
            const dx = decoy.x - a.x;
            const dy = decoy.y - a.y;
            const dist = Math.hypot(dx, dy);
            if (dist > decoyRange) continue;
            const u = (a.genome.w_mate * perceivedSalience * 2.65) / (dist / 85 + 0.38);
            if (u > bestDecoyUtility) {
              bestDecoyUtility = u;
              bestDecoy = decoy;
              bestDecoyDist = dist;
            }
          }
        }

        // Rival-assessment utility (Platt's omitted axis: paying attention to dominant males)
        const rivalAwarenessRadius = this.params.contestRadius * (1.25 + a.genome.w_status * 1.4);
        let uRival = 0;
        if (closestStrongerRival && closestStrongerDist < rivalAwarenessRadius) {
          uRival = (a.genome.w_status * 2.4) / (closestStrongerDist / 40 + 0.35);
        }

        a.utilities.food = +uFood.toFixed(2);
        a.utilities.female = +bestFemaleUtility.toFixed(2);
        a.utilities.rival = +uRival.toFixed(2);
        a.utilities.decoy = +bestDecoyUtility.toFixed(2);

        // Choose dominant behavioral drive via common-currency comparison
        // 1) High w_status males detect and sidestep stronger alphas before a costly clash
        if (
          closestStrongerRival &&
          closestStrongerDist < rivalAwarenessRadius &&
          a.genome.w_status > 0.35 &&
          uRival > Math.max(uFood, bestFemaleUtility) * 0.62
        ) {
          a.state = 'yield_alpha';
          const awayAngle = Math.atan2(a.y - closestStrongerRival.y, a.x - closestStrongerRival.x);
          // Tangential evasion so they keep patrolling rather than cornering
          const steerAngle = awayAngle + (a.id % 2 === 0 ? 0.45 : -0.45);
          desiredVx = Math.cos(steerAngle) * maxSpeed;
          desiredVy = Math.sin(steerAngle) * maxSpeed;
          a.focusTarget = {
            type: 'alpha',
            x: closestStrongerRival.x,
            y: closestStrongerRival.y,
            id: closestStrongerRival.id,
          };
          this.tethers.push({
            type: 'assess_alpha',
            x1: a.x,
            y1: a.y,
            x2: closestStrongerRival.x,
            y2: closestStrongerRival.y,
          });
        } else if (bestDecoy && bestDecoyUtility > uFood && bestDecoyUtility >= bestFemaleUtility * 0.92) {
          // 2) Hijacked by Supernormal Stimulus ("Pay-Per-View" Pixels Trap!)
          a.state = 'trapped_decoy';
          a.captivatedByDecoyId = bestDecoy.id;
          a.focusTarget = { type: 'decoy', x: bestDecoy.x, y: bestDecoy.y, id: bestDecoy.id };
          const dx = bestDecoy.x - a.x;
          const dy = bestDecoy.y - a.y;

          if (bestDecoyDist > bestDecoy.radius * 0.62) {
            const ang = Math.atan2(dy, dx);
            desiredVx = Math.cos(ang) * maxSpeed * 0.98;
            desiredVy = Math.sin(ang) * maxSpeed * 0.98;
            if (bestDecoyDist < bestDecoy.radius * 1.45) {
              bestDecoy.captivatedCount++;
              a.energy -= this.params.decoyJuiceDrain * 0.35;
              if (this.params.learningEnabled) {
                a.decoyHabituation = Math.min(1, a.decoyHabituation + this.params.habituationRate * 0.5);
              }
            }
          } else {
            // Orbit hypnotically inside the glow of the screen, paying cherry juice!
            const ang = Math.atan2(dy, dx) + 1.38;
            desiredVx = Math.cos(ang) * maxSpeed * 0.42;
            desiredVy = Math.sin(ang) * maxSpeed * 0.42;
            const drain = this.params.decoyJuiceDrain * (0.7 + 0.75 * a.genome.w_mate);
            a.energy -= drain;
            a.trappedTicks++;
            this.totalDecoyTrappedTicks++;
            bestDecoy.captivatedCount++;
            bestDecoy.totalJuiceDrained += drain;
            if (this.params.learningEnabled) {
              // Real vertebrates learn from zero-payoff experience and habituate within one lifetime
              a.decoyHabituation = Math.min(1, a.decoyHabituation + this.params.habituationRate);
            }

            if (Math.random() < 0.16) {
              this.addEffect('juice_drain', a.x, a.y, '#ff3b5c', {
                tx: bestDecoy.x,
                ty: bestDecoy.y,
                maxAge: 20,
              });
            }
          }
          this.tethers.push({
            type: 'decoy_trap',
            x1: a.x,
            y1: a.y,
            x2: bestDecoy.x,
            y2: bestDecoy.y,
          });
        } else if (bestFemale && bestFemaleUtility > uFood) {
          // 3) Pursuing a real fertile female
          a.state = 'pursue_female';
          a.focusTarget = { type: 'female', x: bestFemale.x, y: bestFemale.y, id: bestFemale.id };
          const ang = Math.atan2(bestFemale.y - a.y, bestFemale.x - a.x);
          desiredVx = Math.cos(ang) * maxSpeed * 1.06;
          desiredVy = Math.sin(ang) * maxSpeed * 1.06;

          this.tethers.push({
            type: 'pursue_female',
            x1: a.x,
            y1: a.y,
            x2: bestFemale.x,
            y2: bestFemale.y,
          });

          // High w_status dominant male actively intimidates/displaces a weaker nearby competitor
          if (
            closestWeakerRival &&
            closestWeakerDist < this.params.contestRadius * 1.05 &&
            a.genome.w_status > 0.45 &&
            Math.random() < 0.18
          ) {
            const pushAng = Math.atan2(closestWeakerRival.y - a.y, closestWeakerRival.x - a.x);
            closestWeakerRival.vx += Math.cos(pushAng) * 2.2;
            closestWeakerRival.vy += Math.sin(pushAng) * 2.2;
            closestWeakerRival.energy -= this.params.contestEnergyCost * 0.25;
            a.contestScore += 0.35;
          }

          // Attempt mating if within mateRadius
          const distToFemale = Math.hypot(bestFemale.x - a.x, bestFemale.y - a.y);
          if (distToFemale <= this.params.mateRadius) {
            this.attemptMating(a, bestFemale, newOffspring);
          }
        } else if (nearestFood) {
          // 4) Foraging for cherry juice
          a.state = 'forage';
          a.focusTarget = { type: 'food', x: nearestFood.x, y: nearestFood.y, id: nearestFood.id };
          const ang = Math.atan2(nearestFood.y - a.y, nearestFood.x - a.x);
          desiredVx = Math.cos(ang) * maxSpeed;
          desiredVy = Math.sin(ang) * maxSpeed;
        } else {
          // 5) Exploratory roaming
          a.state = 'forage';
          const wander = a.heading + randRange(-0.28, 0.28);
          desiredVx = Math.cos(wander) * maxSpeed * 0.72;
          desiredVy = Math.sin(wander) * maxSpeed * 0.72;
        }

        // Physical male-male contest check:
        // Males that blunder too close to another mature male (especially low w_status or competing near a female) clash!
        if (
          closestAnyRival &&
          closestAnyRivalDist < this.params.contestRadius * 0.56 &&
          a.id < closestAnyRival.id && // Handle each pair once per tick
          this.params.contestEnergyCost > 0 &&
          a.state !== 'yield_alpha' &&
          closestAnyRival.state !== 'yield_alpha' &&
          Math.random() < 0.16
        ) {
          this.resolveMaleContest(a, closestAnyRival);
        }
      } else if (a.sex === 'F' && this.params.regime === 'sexual') {
        // === FEMALE BEHAVIOR: SURVIVAL, FORAGING & SELECTIVE RECEPTIVITY ===
        const receptive = this.isFemaleReceptive(a);
        if (receptive) {
          a.receptiveWait++;
          a.state = 'receptive';
        } else {
          a.receptiveWait = 0;
          a.state = 'forage';
        }

        a.utilities.food = nearestFood ? 1.5 : 0;
        a.utilities.female = 0;
        a.utilities.rival = 0;
        a.utilities.decoy = 0;

        if (nearestFood) {
          const ang = Math.atan2(nearestFood.y - a.y, nearestFood.x - a.x);
          desiredVx = Math.cos(ang) * maxSpeed * (receptive ? 0.78 : 1.0);
          desiredVy = Math.sin(ang) * maxSpeed * (receptive ? 0.78 : 1.0);
        } else {
          const wander = a.heading + randRange(-0.22, 0.22);
          desiredVx = Math.cos(wander) * maxSpeed * 0.65;
          desiredVy = Math.sin(wander) * maxSpeed * 0.65;
        }
      } else {
        // === ASEXUAL CONTROL REGIME: PURE JUICE OPTIMIZATION ===
        a.state = 'forage';
        a.utilities.food = nearestFood ? 1.8 : 0;
        a.utilities.female = 0;
        a.utilities.rival = 0;
        a.utilities.decoy = 0;

        if (nearestFood) {
          const ang = Math.atan2(nearestFood.y - a.y, nearestFood.x - a.x);
          desiredVx = Math.cos(ang) * maxSpeed;
          desiredVy = Math.sin(ang) * maxSpeed;
        } else {
          const wander = a.heading + randRange(-0.24, 0.24);
          desiredVx = Math.cos(wander) * maxSpeed * 0.7;
          desiredVy = Math.sin(wander) * maxSpeed * 0.7;
        }

        // Clonal division when energy threshold met
        if (
          isMature &&
          a.energy >= this.params.asexualSplitThreshold &&
          a.cooldown <= 0 &&
          this.agents.length + newOffspring.length < this.params.maxPopulation
        ) {
          a.energy -= this.params.asexualSplitCost;
          a.cooldown = 72;
          a.offspringCount++;
          const childGen = a.generation + 1;
          if (childGen > this.generationMax) this.generationMax = childGen;
          this.totalBirths++;
          newOffspring.push(
            this.createAgent({
              x: clamp(a.x + randRange(-14, 14), 24, this.params.worldWidth - 24),
              y: clamp(a.y + randRange(-14, 14), 24, this.params.worldHeight - 24),
              sex: 'A',
              genome: cloneGenome(a.genome, this.params.mutationRate, this.params.mutationScale),
              generation: childGen,
              energy: this.params.asexualSplitCost * 0.92,
              age: 0,
              parentIds: [a.id],
            })
          );
          this.addEffect('birth', a.x, a.y, '#34d399', { maxAge: 26 });
        }
      }

      // Smooth steering inertia
      a.vx = a.vx * 0.72 + desiredVx * 0.28;
      a.vy = a.vy * 0.72 + desiredVy * 0.28;
      a.x += a.vx;
      a.y += a.vy;
      if (Math.hypot(a.vx, a.vy) > 0.05) {
        a.heading = Math.atan2(a.vy, a.vx);
      }

      // Soft boundary reflection
      const margin = 20;
      if (a.x < margin) {
        a.x = margin;
        a.vx = Math.abs(a.vx);
      } else if (a.x > this.params.worldWidth - margin) {
        a.x = this.params.worldWidth - margin;
        a.vx = -Math.abs(a.vx);
      }
      if (a.y < margin) {
        a.y = margin;
        a.vy = Math.abs(a.vy);
      } else if (a.y > this.params.worldHeight - margin) {
        a.y = this.params.worldHeight - margin;
        a.vy = -Math.abs(a.vy);
      }

      // Eat cherry juice on contact
      for (let f = this.foods.length - 1; f >= 0; f--) {
        const food = this.foods[f];
        const dx = food.x - a.x;
        const dy = food.y - a.y;
        if (dx * dx + dy * dy < 15 * 15) {
          a.energy = Math.min(a.maxEnergy, a.energy + food.energy);
          this.foods.splice(f, 1);
          break;
        }
      }

      // Metabolic expenditure (including Zahavi display handicap & cognitive filter overhead)
      const speedNorm = Math.hypot(a.vx, a.vy) / 3.0;
      const expressesDisplay = a.sex === 'M' || a.sex === 'A';
      const displayBurn = expressesDisplay ? this.params.displayCostFactor * Math.pow(a.genome.display, 1.35) : 0;
      const cognitiveBurn =
        this.params.discernmentCostFactor * a.genome.discernment +
        (a.sex === 'A' ? 0.015 * (a.genome.w_mate + a.genome.w_status) : 0);

      // Gentle density-dependent pressure near carrying capacity
      const crowdingFactor =
        this.agents.length > this.params.maxPopulation * 0.85
          ? 1 + ((this.agents.length - this.params.maxPopulation * 0.85) / 40) * 0.45
          : 1;

      const totalBurn =
        (this.params.baseMetabolism +
          this.params.speedCostFactor * speedNorm * speedNorm +
          displayBurn +
          cognitiveBurn) *
        crowdingFactor;

      a.energy -= totalBurn;
    }

    // 3. Add newborn offspring
    for (const child of newOffspring) {
      this.agents.push(child);
    }

    // 4. Mortality (starvation or senescence)
    for (let i = this.agents.length - 1; i >= 0; i--) {
      const a = this.agents[i];
      if (a.energy <= 0 || a.age >= this.params.maxAge) {
        this.archiveCompletedLife(a);
        this.addEffect('death', a.x, a.y, a.sex === 'M' ? '#38bdf8' : a.sex === 'F' ? '#fbbf24' : '#34d399', {
          maxAge: 20,
        });
        if (this.selectedAgentId === a.id) this.selectedAgentId = null;
        this.agents.splice(i, 1);
      }
    }

    // Soft ecological floor so dramatic decoy/runaway crashes don't leave a dead empty canvas
    if (this.agents.length < this.params.minPopulationFloor) {
      this.ecologicalRescue();
    }

    // 5. Update transient visual effects
    for (let i = this.effects.length - 1; i >= 0; i--) {
      this.effects[i].age++;
      if (this.effects[i].age >= this.effects[i].maxAge) {
        this.effects.splice(i, 1);
      }
    }

    // 6. Telemetry snapshot & emergent milestone detection
    if (this.tick % 25 === 0) {
      this.recordMetricsSnapshot();
      this.detectEmergentMilestones();
    }
  }

  isFemaleReceptive(f) {
    return (
      f.sex === 'F' &&
      f.age >= this.params.maturityAge &&
      f.cooldown <= 0 &&
      f.energy >= this.params.reproEnergyMinFemale
    );
  }

  resolveMaleContest(m1, m2) {
    this.totalContests++;
    const p1 = m1.dominance + randRange(-0.14, 0.14);
    const p2 = m2.dominance + randRange(-0.14, 0.14);
    const winner = p1 >= p2 ? m1 : m2;
    const loser = p1 >= p2 ? m2 : m1;

    const cost = this.params.contestEnergyCost;
    // Winner pays modest contest cost; loser pays heavy penalty + gets knocked away
    winner.energy -= cost * 0.42;
    loser.energy -= cost * 1.15;
    winner.contestWins++;
    winner.contestScore += 1.0;
    loser.contestLosses++;
    loser.contestScore -= 0.7;
    winner.state = 'contest';
    loser.state = 'contest';

    const pushAng = Math.atan2(loser.y - winner.y, loser.x - winner.x);
    loser.vx += Math.cos(pushAng) * 3.4;
    loser.vy += Math.sin(pushAng) * 3.4;

    this.addEffect('contest', (m1.x + m2.x) * 0.5, (m1.y + m2.y) * 0.5, '#f97316', {
      maxAge: 22,
    });
  }

  attemptMating(male, female, newOffspring) {
    if (this.agents.length + newOffspring.length >= this.params.maxPopulation) return;
    if (!this.isFemaleReceptive(female)) return;

    // Female mate choice: evaluates male vigor (honest energy state), costly display, and dominance rank
    const vigor = clamp(male.energy / 110, 0, 1.1);
    const maleQuality = 0.40 * vigor + 0.42 * male.genome.display + 0.18 * male.statusRank;

    // Selectivity threshold scales with female's choosiness gene & experiment bias,
    // relaxing slightly if she has waited a long time receptive without finding a qualified suitor
    const patienceRelax = Math.min(0.22, female.receptiveWait * 0.00055);
    const threshold = clamp(
      this.params.femaleChoosinessBias * (0.20 + 0.62 * female.genome.choosiness) - patienceRelax,
      0.04,
      0.86
    );

    if (maleQuality < threshold) {
      // Rejected! Male incurs minor courtship cost and bounces slightly
      male.energy -= 1.8;
      male.cooldown = 14;
      const bounceAng = Math.atan2(male.y - female.y, male.x - female.x);
      male.vx += Math.cos(bounceAng) * 1.6;
      male.vy += Math.sin(bounceAng) * 1.6;
      return;
    }

    // Mating accepted! Apply exact anisogamy ratio (r = female investment / male investment)
    // At 1.0x both sexes pay equal energy and cooldown; higher ratios shift investment onto females.
    const r = Math.max(1.0, this.params.anisogamyRatio);
    const femaleShare = r / (r + 1);
    const maleShare = 1 / (r + 1);
    const totalCoupleCost = this.params.baseFemaleMateCost + this.params.baseMaleMateCost;
    const totalCoupleCooldown = this.params.femaleCooldown + this.params.maleCooldown;

    const femaleCost = clamp(totalCoupleCost * femaleShare, 14, 62);
    const maleCost = clamp(totalCoupleCost * maleShare, 4, 40);

    female.energy -= femaleCost;
    female.cooldown = Math.max(12, Math.round(totalCoupleCooldown * femaleShare));
    female.receptiveWait = 0;
    female.offspringCount++;

    male.energy -= maleCost;
    male.cooldown = Math.max(12, Math.round(totalCoupleCooldown * maleShare));
    male.offspringCount++;

    const childGen = Math.max(male.generation, female.generation) + 1;
    if (childGen > this.generationMax) this.generationMax = childGen;
    this.totalBirths++;

    // Keep sex ratio roughly balanced (with slight natural Fisherian 50/50 variance)
    const childSex = Math.random() < 0.5 ? 'M' : 'F';
    const childGenome = recombineGenomes(
      female.genome,
      male.genome,
      this.params.mutationRate,
      this.params.mutationScale
    );

    newOffspring.push(
      this.createAgent({
        x: clamp(female.x + randRange(-12, 12), 24, this.params.worldWidth - 24),
        y: clamp(female.y + randRange(-12, 12), 24, this.params.worldHeight - 24),
        sex: childSex,
        genome: childGenome,
        generation: childGen,
        energy: 54,
        age: 0,
        parentIds: [female.id, male.id],
      })
    );

    this.addEffect('mate', (male.x + female.x) * 0.5, (male.y + female.y) * 0.5, '#fbbf24', {
      maxAge: 34,
    });
  }

  archiveCompletedLife(agent) {
    // Only count individuals that reached maturity (or reproduced) in reproductive inequality metrics
    if (agent.age < this.params.maturityAge && agent.offspringCount === 0) return;
    if (agent.sex === 'M') {
      this.completedMales.push(agent.offspringCount);
      if (this.completedMales.length > 180) this.completedMales.shift();
    } else if (agent.sex === 'F') {
      this.completedFemales.push(agent.offspringCount);
      if (this.completedFemales.length > 180) this.completedFemales.shift();
    } else {
      this.completedAsexual.push(agent.offspringCount);
      if (this.completedAsexual.length > 180) this.completedAsexual.shift();
    }
  }

  ecologicalRescue() {
    // Immigration / lineage rescue from surviving genomes (or seed if none)
    const needed = this.params.minPopulationFloor - this.agents.length;
    for (let k = 0; k < needed; k++) {
      const donor = this.agents.length > 0 ? this.agents[Math.floor(Math.random() * this.agents.length)] : null;
      const genome = donor
        ? cloneGenome(donor.genome, 0.35, 0.14)
        : createSeedGenome(this.currentExperiment ? this.currentExperiment.seedProfile : 'naive');

      let sex = 'A';
      if (this.params.regime === 'sexual') {
        const mCount = this.agents.filter((a) => a.sex === 'M').length;
        const fCount = this.agents.filter((a) => a.sex === 'F').length;
        sex = mCount <= fCount ? 'M' : 'F';
      }
      this.agents.push(
        this.createAgent({
          x: randRange(60, this.params.worldWidth - 60),
          y: randRange(60, this.params.worldHeight - 60),
          sex,
          genome,
          generation: Math.max(1, this.generationMax),
          energy: 78,
          age: this.params.maturityAge,
        })
      );
    }
  }

  /**
   * Compute live population metrics, evolutionary trait averages,
   * Bateman's Principle reproductive inequality (Male vs Female Gini + histograms),
   * and Platt Pay-Per-View Assay.
   */
  getMetrics() {
    const n = this.agents.length;
    let males = 0;
    let females = 0;
    let asexuals = 0;
    let trappedMales = 0;

    let sumWMate = 0;
    let sumWStatus = 0;
    let sumDisplay = 0;
    let sumChoosiness = 0;
    let sumDiscernment = 0;
    let sumSpeed = 0;
    let sumEnergy = 0;

    const livingMatureMaleOffspring = [];
    const livingMatureFemaleOffspring = [];
    const livingMatureAsexualOffspring = [];

    for (const a of this.agents) {
      sumWMate += a.genome.w_mate;
      sumWStatus += a.genome.w_status;
      sumDisplay += a.genome.display;
      sumChoosiness += a.genome.choosiness;
      sumDiscernment += a.genome.discernment;
      sumSpeed += a.genome.forage_speed;
      sumEnergy += a.energy;

      if (a.sex === 'M') {
        males++;
        if (a.captivatedByDecoyId !== null) trappedMales++;
        if (a.age >= this.params.maturityAge + 140 || a.offspringCount > 0) {
          livingMatureMaleOffspring.push(a.offspringCount);
        }
      } else if (a.sex === 'F') {
        females++;
        if (a.age >= this.params.maturityAge + 140 || a.offspringCount > 0) {
          livingMatureFemaleOffspring.push(a.offspringCount);
        }
      } else {
        asexuals++;
        if (a.age >= this.params.maturityAge + 140 || a.offspringCount > 0) {
          livingMatureAsexualOffspring.push(a.offspringCount);
        }
      }
    }

    const denom = Math.max(1, n);
    const traits = {
      w_mate: +(sumWMate / denom).toFixed(3),
      w_status: +(sumWStatus / denom).toFixed(3),
      display: +(sumDisplay / denom).toFixed(3),
      choosiness: +(sumChoosiness / denom).toFixed(3),
      discernment: +(sumDiscernment / denom).toFixed(3),
      forage_speed: +(sumSpeed / denom).toFixed(3),
    };

    // Prefer completed adult cohorts once enough have accumulated; blend with senior living adults early on
    const maleCohort =
      this.completedMales.length >= 25
        ? this.completedMales
        : this.completedMales.concat(livingMatureMaleOffspring);
    const femaleCohort =
      this.completedFemales.length >= 25
        ? this.completedFemales
        : this.completedFemales.concat(livingMatureFemaleOffspring);
    const asexualCohort =
      this.completedAsexual.length >= 25
        ? this.completedAsexual
        : this.completedAsexual.concat(livingMatureAsexualOffspring);

    const maleGini = +computeGini(maleCohort).toFixed(3);
    const femaleGini = +computeGini(femaleCohort).toFixed(3);
    const asexualGini = +computeGini(asexualCohort).toFixed(3);
    const deltaGini = +(maleGini - femaleGini).toFixed(3);

    const maleZeroPct =
      maleCohort.length > 0
        ? +((maleCohort.filter((c) => c === 0).length / maleCohort.length) * 100).toFixed(1)
        : 0;
    const femaleZeroPct =
      femaleCohort.length > 0
        ? +((femaleCohort.filter((c) => c === 0).length / femaleCohort.length) * 100).toFixed(1)
        : 0;

    // Top 20% male share of total male-sired offspring
    let topMaleSharePct = 0;
    if (maleCohort.length >= 5) {
      const totalOff = maleCohort.reduce((acc, v) => acc + v, 0);
      if (totalOff > 0) {
        const sorted = maleCohort.slice().sort((a, b) => b - a);
        const topK = Math.max(1, Math.ceil(sorted.length * 0.2));
        const topSum = sorted.slice(0, topK).reduce((acc, v) => acc + v, 0);
        topMaleSharePct = +((topSum / totalOff) * 100).toFixed(1);
      }
    }

    // Offspring count histograms (buckets: 0, 1, 2, 3, 4, 5+)
    const buildHist = (arr) => {
      const bins = [0, 0, 0, 0, 0, 0];
      for (const v of arr) {
        bins[Math.min(5, v)]++;
      }
      const total = Math.max(1, arr.length);
      return bins.map((b) => +(b / total).toFixed(3));
    };

    const platt = computePlattAssay(this.agents, this.params);
    const trappedPct = males > 0 ? +((trappedMales / males) * 100).toFixed(1) : 0;

    // Effective breeding population size (Wright's sex-skew Ne approximation) & drift indicator
    let nEff = 0;
    if (this.params.regime === 'sexual') {
      const nmBreed = maleCohort.filter((c) => c > 0).length;
      const nfBreed = femaleCohort.filter((c) => c > 0).length;
      if (nmBreed > 0 && nfBreed > 0) {
        nEff = Math.round((4 * nmBreed * nfBreed) / (nmBreed + nfBreed));
      } else {
        nEff = Math.round(n * 0.5);
      }
    } else {
      nEff = Math.max(1, asexualCohort.filter((c) => c > 0).length || Math.round(n * 0.6));
    }
    const driftLevel = nEff < 55 ? 'High Drift' : nEff < 110 ? 'Moderate Drift' : 'Lower Drift';

    let sumHab = 0;
    for (const a of this.agents) {
      if (a.sex === 'M') sumHab += a.decoyHabituation;
    }
    const avgHabituationPct = males > 0 ? +((sumHab / males) * 100).toFixed(1) : 0;

    return {
      tick: this.tick,
      generationMax: this.generationMax,
      population: n,
      males,
      females,
      asexuals,
      foodCount: this.foods.length,
      decoyCount: this.decoys.length,
      avgEnergy: +(sumEnergy / denom).toFixed(1),
      trappedMales,
      trappedPct,
      avgHabituationPct,
      nEff,
      driftLevel,
      traits,
      bateman: {
        maleGini,
        femaleGini,
        deltaGini,
        asexualGini,
        maleZeroPct,
        femaleZeroPct,
        topMaleSharePct,
        maleHist: buildHist(maleCohort),
        femaleHist: buildHist(femaleCohort),
        asexualHist: buildHist(asexualCohort),
        maleSampleSize: maleCohort.length,
        femaleSampleSize: femaleCohort.length,
        asexualSampleSize: asexualCohort.length,
      },
      platt,
    };
  }

  recordMetricsSnapshot() {
    const m = this.getMetrics();
    this.history.push({
      tick: m.tick,
      gen: m.generationMax,
      pop: m.population,
      w_mate: m.traits.w_mate,
      w_status: m.traits.w_status,
      display: m.traits.display,
      choosiness: m.traits.choosiness,
      discernment: m.traits.discernment,
      maleGini: m.bateman.maleGini,
      femaleGini: m.bateman.femaleGini,
      trappedPct: m.trappedPct,
    });
    if (this.history.length > 260) {
      this.history.shift();
    }
    this.latestMetrics = m;
    return m;
  }

  detectEmergentMilestones() {
    const m = this.latestMetrics;
    if (!m) return;

    if (
      this.params.regime === 'sexual' &&
      !this.firedMilestoneFlags.has('bateman_skew') &&
      m.bateman.maleSampleSize >= 25 &&
      m.bateman.maleGini - m.bateman.femaleGini >= 0.14 &&
      m.bateman.maleGini >= 0.45
    ) {
      this.firedMilestoneFlags.add('bateman_skew');
      this.addMilestone(
        "Bateman's Skew Emerged",
        `Male reproductive Gini (${m.bateman.maleGini.toFixed(2)}) now exceeds female Gini (${m.bateman.femaleGini.toFixed(2)}); top 20% of males sire ${m.bateman.topMaleSharePct}% of offspring.`
      );
    }

    if (
      this.decoys.length > 0 &&
      !this.firedMilestoneFlags.has('decoy_hijack') &&
      m.trappedPct >= 28
    ) {
      this.firedMilestoneFlags.add('decoy_hijack');
      this.addMilestone(
        'Supernormal Trap Active',
        `${m.trappedPct}% of males are currently burning "cherry juice" on zero-fitness decoys instead of foraging or mating.`
      );
    }

    if (
      this.decoys.length > 0 &&
      !this.firedMilestoneFlags.has('discernment_evolved') &&
      this.history.length > 10 &&
      m.traits.discernment - this.history[0].discernment >= 0.14
    ) {
      this.firedMilestoneFlags.add('discernment_evolved');
      this.addMilestone(
        'Counter-Adaptation: Cue Discernment',
        `Natural & sexual selection pushed mean Cue Discernment up to ${(m.traits.discernment * 100).toFixed(0)}%, resisting the decoy trap.`
      );
    }

    if (
      this.params.regime === 'sexual' &&
      !this.firedMilestoneFlags.has('platt_status_surge') &&
      this.history.length > 10 &&
      m.traits.w_status - this.history[0].w_status >= 0.14
    ) {
      this.firedMilestoneFlags.add('platt_status_surge');
      this.addMilestone(
        'Status-Tracking Evolved',
        `Rival Tracking (w_status) climbed to ${(m.traits.w_status * 100).toFixed(0)}% as males evolved to monitor alphas and avoid losing fights.`
      );
    }

    if (
      this.params.regime === 'sexual' &&
      !this.firedMilestoneFlags.has('runaway_ornament') &&
      m.traits.display >= 0.68
    ) {
      this.firedMilestoneFlags.add('runaway_ornament');
      this.addMilestone(
        'Fisherian Runaway Display',
        `Mean Costly Display hit ${(m.traits.display * 100).toFixed(0)}% — sexual selection is now driving heavy metabolic ornaments.`
      );
    }
  }
}
