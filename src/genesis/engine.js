/**
 * THE INVENTION OF TWO — Headless First-Principles Evolutionary Engine
 *
 * Zero hard-coded 'M' or 'F' sexes. Every organism has continuous, symmetric traits:
 *   - recombine   [0..1]: probability of sexual gamete fusion vs. asexual mitosis
 *   - gameteSize  [0.06..0.94]: size of gametes produced (count = Budget / size)
 *   - postCare    [0..1]: willingness to linger near & provision own recent zygotes
 *   - speed       [0.25..0.95]: swimming velocity vs. quadratic metabolic burn
 *   - immuneLock  [0..255]: 8-bit molecular lock defending against co-evolving parasites
 *
 * Emergent TEBs tested genuinely (with negative controls):
 *   TEB 1 (Red Queen): 8-bit parasites break clonal monocultures -> sexual recombination invades
 *   TEB 2 (Parker-Baker-Smith 1972): sigmoid zygote survival splits 0.50 isogamy -> twin micro/macro sexes
 *   TEB 3 (Emergent Care Divergence): macro-gamete makers vs. micro-gamete makers diverge in post-fusion care
 */

import { GENESIS_DEFAULTS, GENESIS_EXPERIMENTS } from './config.js';

let nextOrgId = 1;
let nextGameteId = 1;
let nextParasiteId = 1;

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function rand(lo, hi) {
  return lo + Math.random() * (hi - lo);
}

function randNormal() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Count set bits in an 8-bit integer (Hamming weight) */
function popcount8(x) {
  let c = 0;
  let n = x & 0xff;
  while (n) {
    n &= n - 1;
    c++;
  }
  return c;
}

/** Randomly mutate an 8-bit lock/key with per-bit probability */
function mutateBits8(val, bitRate) {
  let out = val & 0xff;
  for (let b = 0; b < 8; b++) {
    if (Math.random() < bitRate) {
      out ^= 1 << b;
    }
  }
  return out;
}

/** Bitwise sexual recombination of two 8-bit immune locks */
function recombineBits8(lockA, lockB, bitMutRate) {
  let child = 0;
  for (let b = 0; b < 8; b++) {
    const bit = Math.random() < 0.5 ? (lockA >> b) & 1 : (lockB >> b) & 1;
    child |= bit << b;
  }
  return mutateBits8(child, bitMutRate);
}

export class GenesisEngine {
  constructor(experimentId = 'full_genesis', overrides = {}) {
    this.params = { ...GENESIS_DEFAULTS, ...overrides };
    this.currentExperiment = null;
    this.loadExperiment(experimentId, overrides);
  }

  loadExperiment(experimentId, overrides = {}) {
    const exp = GENESIS_EXPERIMENTS.find((e) => e.id === experimentId) || GENESIS_EXPERIMENTS[0];
    this.currentExperiment = exp;
    this.params = {
      ...GENESIS_DEFAULTS,
      ...exp.params,
      ...overrides,
    };
    this.reset(exp.seed);
  }

  reset(seedCfg = null) {
    const seed = seedCfg || (this.currentExperiment ? this.currentExperiment.seed : GENESIS_EXPERIMENTS[0].seed);
    nextOrgId = 1;
    nextGameteId = 1;
    nextParasiteId = 1;

    this.tick = 0;
    this.generationMax = 1;
    this.totalClonalBirths = 0;
    this.totalSexualBirths = 0;
    this.totalInfections = 0;
    this.totalFailedZygotes = 0;
    this.selectedOrgId = null;

    this.organisms = [];
    this.gametes = [];
    this.nutrients = [];
    this.parasites = [];
    this.effects = [];

    // Drifting nutrient clouds
    this.clusters = [];
    for (let i = 0; i < this.params.clusterCount; i++) {
      this.clusters.push({
        x: rand(120, this.params.worldWidth - 120),
        y: rand(100, this.params.worldHeight - 100),
        vx: rand(-0.2, 0.2),
        vy: rand(-0.2, 0.2),
        radius: rand(100, 155),
      });
    }

    for (let i = 0; i < this.params.nutrientTarget; i++) this.spawnNutrient();

    // Seed initial symmetric organisms (ZERO sex labels!)
    // In low-diversity Red Queen starts, clones share 2 ancient founder locks while rare sexuals already carry varied locks
    const founderLocks = [0b10101010, 0b01010101];
    for (let i = 0; i < this.params.initialPopulation; i++) {
      const gSize = clamp(seed.gameteSizeMean + randNormal() * seed.gameteSizeStd, 0.06, 0.94);
      const recomb = clamp(seed.recombineMean + randNormal() * seed.recombineStd, 0.01, 0.99);
      const lock =
        seed.immuneDiversity === 'low'
          ? recomb >= 0.5
            ? Math.floor(Math.random() * 256)
            : founderLocks[i % founderLocks.length]
          : Math.floor(Math.random() * 256);

      this.organisms.push(
        this.createOrganism({
          x: rand(50, this.params.worldWidth - 50),
          y: rand(50, this.params.worldHeight - 50),
          genome: {
            recombine: recomb,
            gameteSize: gSize,
            postCare: clamp(0.25 + randNormal() * 0.14, 0.01, 0.95),
            speed: clamp(0.55 + randNormal() * 0.12, 0.25, 0.95),
          },
          immuneLock: lock,
          generation: 1,
          energy: rand(56, 86),
          age: Math.floor(rand(40, 260)),
        })
      );
    }

    // Seed co-evolving parasites if enabled
    if (this.params.parasitesEnabled) {
      for (let i = 0; i < this.params.parasiteTarget; i++) {
        // Seed initial parasite keys near existing host locks so Red Queen engages immediately
        const host = this.organisms[i % this.organisms.length];
        const key = mutateBits8(host.immuneLock, 0.03);
        this.spawnParasite(null, null, key);
      }
    }

    // Telemetry histories
    this.history = [];
    this.waterfall = []; // Array of 20-bin gameteSize density histograms over time!
    this.milestones = [];
    this.firedMilestones = new Set();

    this.recordSnapshot();
    this.addMilestone(
      'Primordial Ocean Seeded',
      this.currentExperiment
        ? `${this.currentExperiment.title}`
        : 'Symmetric organisms initialized with zero hard-coded sexes.'
    );
  }

  createOrganism({ x, y, genome, immuneLock, generation = 1, energy = 46, age = 0, origin = 'seed' }) {
    const heading = rand(0, Math.PI * 2);
    return {
      id: nextOrgId++,
      x,
      y,
      vx: Math.cos(heading) * 0.6,
      vy: Math.sin(heading) * 0.6,
      heading,
      genome,
      immuneLock: immuneLock & 0xff,
      generation,
      energy,
      maxEnergy: 135,
      age,
      cooldown: Math.floor(rand(0, 25)),
      offspringCount: 0,
      infectionsTaken: 0,
      infectedFlash: 0,
      careTimer: 0,
      careTargetId: null,
      origin, // 'seed' | 'clone' | 'fusion'
      pulsePhase: rand(0, Math.PI * 2),
    };
  }

  spawnNutrient(cx = null, cy = null) {
    let x, y;
    if (cx !== null && cy !== null) {
      x = clamp(cx, 20, this.params.worldWidth - 20);
      y = clamp(cy, 20, this.params.worldHeight - 20);
    } else if (this.clusters.length > 0 && Math.random() < 0.84) {
      const c = this.clusters[Math.floor(Math.random() * this.clusters.length)];
      const r = Math.sqrt(Math.random()) * c.radius;
      const th = rand(0, Math.PI * 2);
      x = clamp(c.x + Math.cos(th) * r, 20, this.params.worldWidth - 20);
      y = clamp(c.y + Math.sin(th) * r, 20, this.params.worldHeight - 20);
    } else {
      x = rand(24, this.params.worldWidth - 24);
      y = rand(24, this.params.worldHeight - 24);
    }
    this.nutrients.push({
      x,
      y,
      energy: this.params.nutrientEnergy,
      phase: rand(0, Math.PI * 2),
    });
  }

  spawnParasite(cx = null, cy = null, key = null) {
    const x = cx !== null ? clamp(cx, 16, this.params.worldWidth - 16) : rand(24, this.params.worldWidth - 24);
    const y = cy !== null ? clamp(cy, 16, this.params.worldHeight - 16) : rand(24, this.params.worldHeight - 24);
    const ang = rand(0, Math.PI * 2);
    const k = key !== null ? key & 0xff : Math.floor(Math.random() * 256);
    this.parasites.push({
      id: nextParasiteId++,
      x,
      y,
      vx: Math.cos(ang) * 0.95,
      vy: Math.sin(ang) * 0.95,
      key: k,
      age: 0,
      maxAge: this.params.parasiteLifespan + Math.floor(rand(-40, 40)),
      phase: rand(0, Math.PI * 2),
    });
  }

  triggerOutbreakAt(x, y) {
    // Find nearest host lock and seed a burst of targeted parasites
    let lock = Math.floor(Math.random() * 256);
    let bestD = Infinity;
    for (const o of this.organisms) {
      const d = Math.hypot(o.x - x, o.y - y);
      if (d < bestD) {
        bestD = d;
        lock = o.immuneLock;
      }
    }
    this.params.parasitesEnabled = true;
    for (let i = 0; i < 18; i++) {
      const ang = rand(0, Math.PI * 2);
      const r = rand(0, 42);
      this.spawnParasite(x + Math.cos(ang) * r, y + Math.sin(ang) * r, mutateBits8(lock, 0.08));
    }
    this.addEffect('outbreak', x, y, '#ff3b5c', { maxAge: 34 });
  }

  addEffect(type, x, y, color, extra = {}) {
    if (this.effects.length > 160) this.effects.shift();
    this.effects.push({ type, x, y, color, age: 0, maxAge: extra.maxAge || 28, ...extra });
  }

  addMilestone(title, text) {
    this.milestones.unshift({ tick: this.tick, gen: this.generationMax, title, text });
    if (this.milestones.length > 20) this.milestones.pop();
  }

  findOrganismAt(x, y, maxDist = 26) {
    let best = null;
    let bestD = maxDist;
    for (const o of this.organisms) {
      const d = Math.hypot(o.x - x, o.y - y);
      if (d < bestD) {
        bestD = d;
        best = o;
      }
    }
    return best;
  }

  step() {
    this.tick++;
    const W = this.params.worldWidth;
    const H = this.params.worldHeight;

    // 1. Drift nutrient clusters & replenish nutrients
    for (const c of this.clusters) {
      c.x += c.vx;
      c.y += c.vy;
      if (c.x < 95 || c.x > W - 95) c.vx *= -1;
      if (c.y < 95 || c.y > H - 95) c.vy *= -1;
    }

    const nutDeficit = this.params.nutrientTarget - this.nutrients.length;
    if (nutDeficit > 0) {
      const rate = this.params.nutrientSpawnRate * (nutDeficit > 35 ? 1.4 : 1.0);
      const g = Math.floor(rate);
      for (let i = 0; i < g; i++) this.spawnNutrient();
      if (Math.random() < rate - g) this.spawnNutrient();
    }

    // 2. Maintain co-evolving parasite reservoir if enabled
    if (this.params.parasitesEnabled) {
      if (this.parasites.length < this.params.parasiteTarget * 0.55 && this.organisms.length > 0) {
        // Environmental spillover samples an existing host lock with mutation
        const host = this.organisms[Math.floor(Math.random() * this.organisms.length)];
        this.spawnParasite(null, null, mutateBits8(host.immuneLock, 0.16));
      }
    } else if (this.parasites.length > 0) {
      this.parasites = [];
    }

    const newborns = [];

    // 3. Update Adult Organisms (foraging, post-care, asexual vs. sexual spawning)
    for (let i = 0; i < this.organisms.length; i++) {
      const o = this.organisms[i];
      o.age++;
      o.pulsePhase += 0.07;
      if (o.cooldown > 0) o.cooldown--;
      if (o.infectedFlash > 0) o.infectedFlash--;
      if (o.careTimer > 0) o.careTimer--;

      const maxSpeed = 1.0 + o.genome.speed * 2.05;

      // Post-fusion care behavior (if lingering near own newborn to share energy & shield from parasites)
      let careChild = null;
      if (o.careTimer > 0 && o.careTargetId !== null && o.energy > 34) {
        careChild = this.organisms.find((c) => c.id === o.careTargetId && c.age < this.params.maturityAge);
      }

      // Nearest nutrient
      let bestNut = null;
      let bestNutD2 = 210 * 210;
      for (let n = 0; n < this.nutrients.length; n++) {
        const nut = this.nutrients[n];
        const dx = nut.x - o.x;
        const dy = nut.y - o.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestNutD2) {
          bestNutD2 = d2;
          bestNut = nut;
        }
      }

      let dvx = o.vx;
      let dvy = o.vy;

      if (careChild && o.energy > 46) {
        const dx = careChild.x - o.x;
        const dy = careChild.y - o.y;
        const d = Math.hypot(dx, dy);
        if (d > 26) {
          const ang = Math.atan2(dy, dx);
          dvx = Math.cos(ang) * maxSpeed * 0.9;
          dvy = Math.sin(ang) * maxSpeed * 0.9;
        } else {
          // Gently transfer provisioning energy to the juvenile
          const gift = 0.24 * o.genome.postCare;
          o.energy -= gift;
          careChild.energy = Math.min(careChild.maxEnergy, careChild.energy + gift * 0.95);
          dvx = o.vx * 0.6;
          dvy = o.vy * 0.6;
        }
      } else if (bestNut) {
        const ang = Math.atan2(bestNut.y - o.y, bestNut.x - o.x);
        dvx = Math.cos(ang) * maxSpeed;
        dvy = Math.sin(ang) * maxSpeed;
      } else {
        const w = o.heading + rand(-0.28, 0.28);
        dvx = Math.cos(w) * maxSpeed * 0.72;
        dvy = Math.sin(w) * maxSpeed * 0.72;
      }

      o.vx = o.vx * 0.74 + dvx * 0.26;
      o.vy = o.vy * 0.74 + dvy * 0.26;
      o.x += o.vx;
      o.y += o.vy;
      if (Math.hypot(o.vx, o.vy) > 0.04) o.heading = Math.atan2(o.vy, o.vx);

      // Soft reflection at ocean boundaries
      const pad = 20;
      if (o.x < pad) { o.x = pad; o.vx = Math.abs(o.vx); }
      else if (o.x > W - pad) { o.x = W - pad; o.vx = -Math.abs(o.vx); }
      if (o.y < pad) { o.y = pad; o.vy = Math.abs(o.vy); }
      else if (o.y > H - pad) { o.y = H - pad; o.vy = -Math.abs(o.vy); }

      // Eat nutrient on contact
      for (let n = this.nutrients.length - 1; n >= 0; n--) {
        const nut = this.nutrients[n];
        const dx = nut.x - o.x;
        const dy = nut.y - o.y;
        if (dx * dx + dy * dy < 16 * 16) {
          o.energy = Math.min(o.maxEnergy, o.energy + nut.energy);
          this.nutrients.splice(n, 1);
          break;
        }
      }

      // Reproduction when mature, healthy (not actively sick), off cooldown, and energy >= reproThreshold
      if (
        o.age >= this.params.maturityAge &&
        o.cooldown <= 0 &&
        o.infectedFlash <= 0 &&
        o.energy >= this.params.reproThreshold &&
        this.organisms.length + newborns.length < this.params.maxPopulation
      ) {
        // Thresholded reproductive mode: < 0.50 clonal lineage vs >= 0.50 sexual lineage
        // (Cleanly compares obligate cloning vs obligate sexual fusion per Hamilton 1980)
        if (o.genome.recombine >= 0.5) {
          // === SEXUAL GAMETE RELEASE (FIXED BUDGET B DIVIDED BY GAMETE SIZE!) ===
          o.energy -= this.params.reproBudget;
          o.cooldown = this.params.sexCooldown;

          const gSize = o.genome.gameteSize;
          // Linear biomass budget B divided by gamete cost (s + 0.02 structural overhead):
          // gSize=0.90 -> ~1.14 large eggs; gSize=0.50 -> ~2.02 medium gametes; gSize=0.08 -> ~10.5 fast seekers!
          const expectedCount = clamp(1.05 / (0.02 + gSize), 1.0, 20.0);
          const count = Math.floor(expectedCount) + (Math.random() < expectedCount - Math.floor(expectedCount) ? 1 : 0);
          for (let k = 0; k < count; k++) {
            const ang = rand(0, Math.PI * 2);
            const gSpeed = 0.3 + 3.4 * (1 - gSize);
            // Scatter fast micro-gametes wider so a swarm explores multiple eggs rather than piling on one!
            const spawnDist = 10 + 18 * (1 - gSize);
            this.gametes.push({
              id: nextGameteId++,
              parentId: o.id,
              parentRef: o,
              x: clamp(o.x + Math.cos(ang) * spawnDist, 14, W - 14),
              y: clamp(o.y + Math.sin(ang) * spawnDist, 14, H - 14),
              vx: Math.cos(ang) * gSpeed,
              vy: Math.sin(ang) * gSpeed,
              size: gSize,
              genome: { ...o.genome },
              immuneLock: o.immuneLock,
              generation: o.generation,
              age: 0,
              maxAge: Math.round(this.params.gameteLifespan * (0.68 + 0.72 * gSize)),
            });
          }
          this.addEffect('spawn_gamete', o.x, o.y, gSize < 0.35 ? '#38bdf8' : gSize > 0.65 ? '#fbbf24' : '#94a3b8', {
            maxAge: 18,
          });
        } else {
          // === ASEXUAL CLONAL MITOSIS (ZERO TWO-FOLD COST!) ===
          o.energy -= this.params.reproBudget;
          o.cooldown = this.params.cloneCooldown;
          o.offspringCount++;
          this.totalClonalBirths++;

          const childGen = o.generation + 1;
          if (childGen > this.generationMax) this.generationMax = childGen;
          const child = this.createOrganism({
            x: clamp(o.x + rand(-14, 14), 22, W - 22),
            y: clamp(o.y + rand(-14, 14), 22, H - 22),
            genome: this.mutateGenome(o.genome),
            immuneLock: mutateBits8(o.immuneLock, this.params.immuneMutationRate * 0.45),
            generation: childGen,
            energy: 42,
            age: 0,
            origin: 'clone',
          });
          newborns.push(child);
          this.addEffect('mitosis', o.x, o.y, '#34d399', { maxAge: 24 });
        }
      }

      // Metabolic burn
      const spNorm = Math.hypot(o.vx, o.vy) / 3.0;
      const crowding =
        this.organisms.length > this.params.maxPopulation * 0.8
          ? 1 + ((this.organisms.length - this.params.maxPopulation * 0.8) / 35) * 0.55
          : 1;
      o.energy -= (this.params.baseMetabolism + this.params.speedCost * spNorm * spNorm) * crowding;
    }

    // 4. Update Gametes: Chemotaxis, Swimming & Fusion (Parker-Baker-Smith Physics!)
    const usedGameteIds = new Set();
    for (let i = 0; i < this.gametes.length; i++) {
      const g = this.gametes[i];
      if (usedGameteIds.has(g.id)) continue;
      g.age++;

      const gSpeed = 0.35 + 3.1 * (1 - g.size);
      const searchR = 44 + 175 * (1 - g.size); // Tiny gametes actively seek large chemical plumes!
      const searchR2 = searchR * searchR;

      let bestPartner = null;
      let bestScore = 0.00055; // Sensory threshold: chemical plume must exceed ocean background noise

      for (let j = 0; j < this.gametes.length; j++) {
        if (i === j) continue;
        const other = this.gametes[j];
        if (usedGameteIds.has(other.id)) continue;
        if (other.parentId === g.parentId) continue; // Prevent self-fertilization

        const dx = other.x - g.x;
        const dy = other.y - g.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > searchR2) continue;

        const dist = Math.sqrt(d2);
        // Pure geometric contact can ALWAYS fuse (even for small isogamous gametes in benign oceans!)
        const fuseR = this.params.gameteFuseRadius + (g.size + other.size) * 14.5;
        if (dist <= fuseR) {
          usedGameteIds.add(g.id);
          usedGameteIds.add(other.id);
          this.resolveGameteFusion(g, other, newborns);
          bestPartner = null;
          break;
        }

        // Chemical plume strength scales with emitting cell's volume (size^3 / distance)
        const beacon = (Math.pow(other.size, 3) + 0.004) / (dist + 14);
        if (beacon > bestScore) {
          bestScore = beacon;
          bestPartner = other;
        }
      }

      if (usedGameteIds.has(g.id)) continue;

      if (bestPartner) {
        const ang = Math.atan2(bestPartner.y - g.y, bestPartner.x - g.x);
        g.vx = g.vx * 0.45 + Math.cos(ang) * gSpeed * 0.55;
        g.vy = g.vy * 0.45 + Math.sin(ang) * gSpeed * 0.55;
      } else {
        const wander = Math.atan2(g.vy, g.vx) + rand(-0.24, 0.24);
        g.vx = Math.cos(wander) * gSpeed;
        g.vy = Math.sin(wander) * gSpeed;
      }

      g.x += g.vx;
      g.y += g.vy;
      if (g.x < 12) { g.x = 12; g.vx = Math.abs(g.vx); }
      else if (g.x > W - 12) { g.x = W - 12; g.vx = -Math.abs(g.vx); }
      if (g.y < 12) { g.y = 12; g.vy = Math.abs(g.vy); }
      else if (g.y > H - 12) { g.y = H - 12; g.vy = -Math.abs(g.vy); }
    }

    // Prune fused or expired gametes (generous cap so micro-gamete swarms aren't artificially culled!)
    this.gametes = this.gametes.filter((g) => !usedGameteIds.has(g.id) && g.age < g.maxAge);
    if (this.gametes.length > 1400) {
      this.gametes.splice(0, this.gametes.length - 1400);
    }

    // 5. Update Co-Evolving 8-Bit Red Queen Parasites
    if (this.params.parasitesEnabled) {
      const newParasites = [];
      for (let p = this.parasites.length - 1; p >= 0; p--) {
        const par = this.parasites[p];
        par.age++;
        par.phase += 0.12;
        if (par.age >= par.maxAge) {
          this.parasites.splice(p, 1);
          continue;
        }

        // Slight local chemotaxis toward close matching hosts (models local transmission in dense clonal patches)
        let targetHost = null;
        let bestHostD2 = 78 * 78;
        for (let i = 0; i < this.organisms.length; i++) {
          const host = this.organisms[i];
          const dx = host.x - par.x;
          const dy = host.y - par.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < bestHostD2 && 8 - popcount8(host.immuneLock ^ par.key) >= this.params.parasiteMatchThreshold) {
            bestHostD2 = d2;
            targetHost = host;
          }
        }
        if (targetHost) {
          const ang = Math.atan2(targetHost.y - par.y, targetHost.x - par.x);
          par.vx = Math.cos(ang) * 1.45;
          par.vy = Math.sin(ang) * 1.45;
        } else {
          const ang = Math.atan2(par.vy, par.vx) + rand(-0.32, 0.32);
          par.vx = Math.cos(ang) * 1.15;
          par.vy = Math.sin(ang) * 1.15;
        }
        par.x += par.vx;
        par.y += par.vy;
        if (par.x < 12 || par.x > W - 12) par.vx *= -1;
        if (par.y < 12 || par.y > H - 12) par.vy *= -1;

        // Check host collision & 8-bit lock-and-key match
        for (let i = 0; i < this.organisms.length; i++) {
          const host = this.organisms[i];
          const dx = host.x - par.x;
          const dy = host.y - par.y;
          if (dx * dx + dy * dy < 17 * 17) {
            const matchBits = 8 - popcount8(host.immuneLock ^ par.key);
            if (matchBits >= this.params.parasiteMatchThreshold) {
              // Lock cracked! Drain host & replicate winning parasite key
              const severity = 1 + (matchBits - this.params.parasiteMatchThreshold) * 0.55;
              host.energy -= this.params.parasiteDamage * severity;
              host.infectionsTaken++;
              host.infectedFlash = 14;
              this.totalInfections++;
              this.addEffect('infect', host.x, host.y, '#ff3b5c', { maxAge: 16 });

              if (this.parasites.length + newParasites.length < this.params.parasiteTarget * 1.7) {
                for (let copy = 0; copy < 3; copy++) {
                  const ca = rand(0, Math.PI * 2);
                  newParasites.push({
                    id: nextParasiteId++,
                    x: clamp(host.x + Math.cos(ca) * 14, 14, W - 14),
                    y: clamp(host.y + Math.sin(ca) * 14, 14, H - 14),
                    vx: Math.cos(ca) * 1.35,
                    vy: Math.sin(ca) * 1.35,
                    key: mutateBits8(par.key, this.params.parasiteMutationRate),
                    age: 0,
                    maxAge: this.params.parasiteLifespan,
                    phase: rand(0, Math.PI * 2),
                  });
                }
              }
              this.parasites.splice(p, 1);
            }
            break;
          }
        }
      }
      for (const np of newParasites) this.parasites.push(np);
    }

    // 6. Add newborns & process mortality
    for (const nb of newborns) this.organisms.push(nb);

    for (let i = this.organisms.length - 1; i >= 0; i--) {
      const o = this.organisms[i];
      if (o.energy <= 0 || o.age >= this.params.maxAge) {
        if (this.selectedOrgId === o.id) this.selectedOrgId = null;
        this.organisms.splice(i, 1);
      }
    }

    if (this.organisms.length < this.params.minPopulationFloor) {
      this.ecologicalRescue();
    }

    // 7. Transient effects
    for (let i = this.effects.length - 1; i >= 0; i--) {
      this.effects[i].age++;
      if (this.effects[i].age >= this.effects[i].maxAge) this.effects.splice(i, 1);
    }

    // 8. Sample telemetry & detect emergent phase transitions
    if (this.tick % 25 === 0) {
      this.recordSnapshot();
      this.detectMilestones();
    }
  }

  resolveGameteFusion(g1, g2, newborns) {
    if (this.organisms.length + newborns.length >= this.params.maxPopulation) return;

    // Usable cytoplasmic yolk scales quadratically with cell radius (2D cross-section / stripped cytoplasm: s^2)
    // Two medium 0.50 cells carry 0.25 + 0.25 = 0.50 yolk vs. 0.90 egg + 0.10 sperm carrying 0.81 + 0.01 = 0.82 yolk!
    const totalYolk = g1.size * g1.size + g2.size * g2.size;
    const p = this.params.zygotePower;
    const K = this.params.zygoteK;
    const Yp = Math.pow(totalYolk, p);
    const Kp = Math.pow(K, p);
    const survivalProb = Yp / (Yp + Kp);

    if (Math.random() > survivalProb) {
      this.totalFailedZygotes++;
      this.addEffect('zygote_fail', (g1.x + g2.x) * 0.5, (g1.y + g2.y) * 0.5, '#64748b', { maxAge: 14 });
      return;
    }

    // Viable zygote!
    const childGenome = this.recombineGenomes(g1.genome, g2.genome);
    const childLock = recombineBits8(g1.immuneLock, g2.immuneLock, this.params.immuneMutationRate);
    const childGen = Math.max(g1.generation, g2.generation) + 1;
    if (childGen > this.generationMax) this.generationMax = childGen;
    this.totalSexualBirths++;

    // Conservation of energy: newborn zygote energy matches actual yolk energy (~36 max, same as clonal division!)
    const effectiveMass = Math.min(1.0, totalYolk);
    const startEnergy = clamp(18 + effectiveMass * 22, 18, 40);
    const cx = clamp((g1.x + g2.x) * 0.5, 22, this.params.worldWidth - 22);
    const cy = clamp((g1.y + g2.y) * 0.5, 22, this.params.worldHeight - 22);

    const child = this.createOrganism({
      x: cx,
      y: cy,
      genome: childGenome,
      immuneLock: childLock,
      generation: childGen,
      energy: startEnergy,
      age: 0,
      origin: 'fusion',
    });
    newborns.push(child);

    // Credit both parents & trigger optional post-fusion care if parent is nearby
    for (const g of [g1, g2]) {
      const p = g.parentRef;
      if (p && p.energy > 0) {
        p.offspringCount++;
        if (p.genome.postCare > 0.25 && Math.hypot(p.x - cx, p.y - cy) < 110) {
          p.careTargetId = child.id;
          p.careTimer = Math.round(p.genome.postCare * 75);
        }
      }
    }

    this.addEffect('fusion', cx, cy, '#f0abfc', { maxAge: 28 });
  }

  mutateGenome(g) {
    const m = (v, lo, hi) =>
      clamp(Math.random() < this.params.mutationRate ? v + randNormal() * this.params.mutationScale : v, lo, hi);
    return {
      recombine: m(g.recombine, 0.01, 0.99),
      gameteSize: m(g.gameteSize, 0.06, 0.94),
      postCare: m(g.postCare, 0.01, 0.98),
      speed: m(g.speed, 0.25, 0.95),
    };
  }

  /**
   * Mendelian segregation for gameteSize (inherits intact allele from Parent A OR Parent B,
   * preventing hybrid averaging from erasing disruptive speciation of sexes!),
   * plus quantitative assortment for continuous polygenic traits.
   */
  recombineGenomes(gA, gB) {
    const pick = (a, b) => {
      const r = Math.random();
      if (r < 0.42) return a;
      if (r < 0.84) return b;
      return 0.5 * (a + b);
    };
    const raw = {
      recombine: pick(gA.recombine, gB.recombine),
      gameteSize: Math.random() < 0.5 ? gA.gameteSize : gB.gameteSize, // Segregating mating-type/gamete allele!
      postCare: pick(gA.postCare, gB.postCare),
      speed: pick(gA.speed, gB.speed),
    };
    return this.mutateGenome(raw);
  }

  ecologicalRescue() {
    const needed = this.params.minPopulationFloor - this.organisms.length;
    for (let k = 0; k < needed; k++) {
      const donor = this.organisms.length > 0 ? this.organisms[Math.floor(Math.random() * this.organisms.length)] : null;
      this.organisms.push(
        this.createOrganism({
          x: rand(60, this.params.worldWidth - 60),
          y: rand(60, this.params.worldHeight - 60),
          genome: donor
            ? this.mutateGenome(donor.genome)
            : { recombine: 0.5, gameteSize: 0.5, postCare: 0.25, speed: 0.55 },
          immuneLock: Math.floor(Math.random() * 256),
          generation: Math.max(1, this.generationMax),
          energy: 72,
          age: this.params.maturityAge,
        })
      );
    }
  }

  getMetrics() {
    const n = this.organisms.length;
    const denom = Math.max(1, n);

    let sumRecomb = 0;
    let sumGSize = 0;
    let smallCount = 0; // Emergent micro-gamete ("sperm") makers (< 0.34)
    let midCount = 0;   // Isogamous middle [0.34 .. 0.66]
    let largeCount = 0; // Emergent macro-gamete ("egg") makers (> 0.66)
    let smallCareSum = 0;
    let largeCareSum = 0;

    // 20-bin gameteSize density histogram for the Y-fork spectrogram!
    const bins = new Array(20).fill(0);
    const lockCounts = new Map();

    // Fraction of population in sexual reproductive mode (recombine >= 0.5)
    let sexualCount = 0;
    for (const o of this.organisms) {
      if (o.genome.recombine >= 0.5) sexualCount++;
      sumRecomb += o.genome.recombine;
      const gs = o.genome.gameteSize;
      sumGSize += gs;
      const bi = clamp(Math.floor(gs * 20), 0, 19);
      bins[bi]++;

      if (gs < 0.34) {
        smallCount++;
        smallCareSum += o.genome.postCare;
      } else if (gs > 0.66) {
        largeCount++;
        largeCareSum += o.genome.postCare;
      } else {
        midCount++;
      }

      lockCounts.set(o.immuneLock, (lockCounts.get(o.immuneLock) || 0) + 1);
    }

    const density = bins.map((b) => +(b / denom).toFixed(3));
    const smallFrac = smallCount / denom;
    const midFrac = midCount / denom;
    const largeFrac = largeCount / denom;

    // Bimodality / Anisogamy Bifurcation Index [0..1]:
    // High ONLY when BOTH small and large tails are well-populated AND the middle valley is hollowed out!
    const balancedTails = 2 * Math.sqrt(smallFrac * largeFrac); // 1.0 when 50% small + 50% large
    const valleyDepth = clamp(1 - midFrac * 1.4, 0, 1);
    const bifurcationIndex = +(balancedTails * valleyDepth).toFixed(3);

    // Shannon diversity of 8-bit host immune locks (normalized 0..1 against max 64+ locks)
    let shannon = 0;
    for (const cnt of lockCounts.values()) {
      const p = cnt / denom;
      shannon -= p * Math.log2(p);
    }
    const immuneDiversity = +clamp(shannon / 6.0, 0, 1).toFixed(3);

    // 32-sector Red Queen radar distributions (grouping 256 locks into 32 angular bins of 8)
    const hostRadar = new Array(32).fill(0);
    for (const o of this.organisms) hostRadar[o.immuneLock >> 3]++;
    const parasiteRadar = new Array(32).fill(0);
    for (const p of this.parasites) parasiteRadar[p.key >> 3]++;

    return {
      tick: this.tick,
      generationMax: this.generationMax,
      population: n,
      gameteCount: this.gametes.length,
      parasiteCount: this.parasites.length,
      meanRecombine: +(sexualCount / denom).toFixed(3),
      meanGameteSize: +(sumGSize / denom).toFixed(3),
      smallFrac: +smallFrac.toFixed(3),
      midFrac: +midFrac.toFixed(3),
      largeFrac: +largeFrac.toFixed(3),
      smallCount,
      midCount,
      largeCount,
      smallCareMean: smallCount > 0 ? +(smallCareSum / smallCount).toFixed(3) : 0,
      largeCareMean: largeCount > 0 ? +(largeCareSum / largeCount).toFixed(3) : 0,
      bifurcationIndex,
      immuneDiversity,
      uniqueLocks: lockCounts.size,
      density,
      hostRadar,
      parasiteRadar,
      totalClonalBirths: this.totalClonalBirths,
      totalSexualBirths: this.totalSexualBirths,
      totalInfections: this.totalInfections,
    };
  }

  recordSnapshot() {
    const m = this.getMetrics();
    this.history.push({
      tick: m.tick,
      gen: m.generationMax,
      recombine: m.meanRecombine,
      bifurcation: m.bifurcationIndex,
      immuneDiv: m.immuneDiversity,
      smallCare: m.smallCareMean,
      largeCare: m.largeCareMean,
    });
    if (this.history.length > 220) this.history.shift();

    this.waterfall.push(m.density);
    if (this.waterfall.length > 140) this.waterfall.shift();

    this.latestMetrics = m;
    return m;
  }

  detectMilestones() {
    const m = this.latestMetrics;
    if (!m) return;

    if (
      !this.firedMilestones.has('sex_emerged') &&
      this.history.length > 6 &&
      this.history[0].recombine < 0.35 &&
      m.meanRecombine >= 0.62
    ) {
      this.firedMilestones.add('sex_emerged');
      this.addMilestone(
        'TEB 1 EMERGED: Sex Defeated Clones!',
        `Red Queen parasites broke clonal monocultures — sexual recombination surged from ${Math.round(this.history[0].recombine * 100)}% to ${Math.round(m.meanRecombine * 100)}%!`
      );
    }

    if (
      !this.firedMilestones.has('two_sexes_invented') &&
      m.bifurcationIndex >= 0.56 &&
      m.smallFrac >= 0.22 &&
      m.largeFrac >= 0.22
    ) {
      this.firedMilestones.add('two_sexes_invented');
      this.addMilestone(
        '⚡ TEB 2 EMERGED: Two Sexes Invented!',
        `Disruptive physics tore isogamy apart! Micro-gamete seekers (${Math.round(m.smallFrac * 100)}%) and macro-egg vessels (${Math.round(m.largeFrac * 100)}%) emerged with zero sex labels in code.`
      );
    }

    if (
      !this.firedMilestones.has('clones_won_control') &&
      !this.params.parasitesEnabled &&
      this.history.length > 8 &&
      this.history[0].recombine >= 0.4 &&
      m.meanRecombine <= 0.2
    ) {
      this.firedMilestones.add('clones_won_control');
      this.addMilestone(
        'Negative Control Verified: Clones Won',
        `Without parasites, the two-fold cost of sex drove sexual recombination down to ${Math.round(m.meanRecombine * 100)}%.`
      );
    }
  }
}
