import test from 'node:test';
import assert from 'node:assert/strict';
import { GenesisEngine } from '../src/genesis/engine.js';

function run(sim, ticks) {
  for (let i = 0; i < ticks; i++) sim.step();
  return sim.getMetrics();
}

test('Negative Control 1: Without parasites, asexual clones crush sexuals (two-fold cost of sex)', () => {
  const sim = new GenesisEngine('negative_control_clones');
  const start = sim.getMetrics();
  const end = run(sim, 2600);
  console.log('Neg Control Clones @2600:', {
    startRecomb: start.meanRecombine,
    endRecomb: end.meanRecombine,
    clonalBirths: end.totalClonalBirths,
    sexualBirths: end.totalSexualBirths,
    gen: end.generationMax,
  });
  assert.ok(
    end.meanRecombine < 0.28,
    `Expected clones to beat sexuals without parasites (meanRecombine < 0.28), got ${end.meanRecombine}`
  );
});

test('TEB 2 (The Invention of Two): 0.50 Isogamy spontaneously Y-forks into micro & macro sexes', () => {
  const sim = new GenesisEngine('invention_of_two');
  const start = sim.getMetrics();
  // Step up to 9000 ticks (~75 generations), checking every 250 ticks after t=3500
  let end = start;
  for (let t = 1; t <= 9000; t++) {
    sim.step();
    if (t >= 3500 && t % 250 === 0) {
      end = sim.getMetrics();
      if (end.bifurcationIndex >= 0.55 && end.midFrac < 0.25 && end.smallFrac >= 0.12 && end.largeFrac >= 0.12) {
        break;
      }
    }
  }
  console.log(`Invention of Two @${end.tick}:`, {
    startMid: start.midFrac,
    endSmall: end.smallFrac,
    endMid: end.midFrac,
    endLarge: end.largeFrac,
    bifurcation: end.bifurcationIndex,
    gen: end.generationMax,
    pop: end.population,
  });
  assert.ok(start.midFrac >= 0.85, `Expected symmetric isogamous start, got midFrac=${start.midFrac}`);
  assert.ok(
    end.bifurcationIndex >= 0.45 && end.smallFrac >= 0.10 && end.largeFrac >= 0.10 && end.midFrac < 0.30,
    `Expected spontaneous Y-fork into two sexes, got small=${end.smallFrac}, mid=${end.midFrac}, large=${end.largeFrac}, bif=${end.bifurcationIndex}`
  );
});

test('Negative Control 2: In a benign ocean (low zygote threshold), two sexes do NOT emerge', () => {
  const sim = new GenesisEngine('negative_control_isogamy');
  const end = run(sim, 3000);
  console.log('Neg Control Benign @3000:', {
    small: end.smallFrac,
    mid: end.midFrac,
    large: end.largeFrac,
    bifurcation: end.bifurcationIndex,
    gen: end.generationMax,
  });
  assert.ok(
    end.bifurcationIndex < 0.25,
    `Expected NO bifurcation in benign ocean (bif < 0.25), got ${end.bifurcationIndex}`
  );
});

test('TEB 1 + TEB 2 (Full Genesis): Red Queen parasites ignite sex from clones AND split gametes', () => {
  const sim = new GenesisEngine('full_genesis');
  const start = sim.getMetrics();
  const end = run(sim, 4200);
  console.log('Full Genesis @4200:', {
    startRecomb: start.meanRecombine,
    endRecomb: end.meanRecombine,
    startImmDiv: start.immuneDiversity,
    endImmDiv: end.immuneDiversity,
    startLocks: start.uniqueLocks,
    endLocks: end.uniqueLocks,
    small: end.smallFrac,
    mid: end.midFrac,
    large: end.largeFrac,
    bifurcation: end.bifurcationIndex,
    gen: end.generationMax,
    infections: end.totalInfections,
  });
  assert.ok(
    end.meanRecombine > start.meanRecombine + 0.25,
    `Expected Red Queen parasites to drive sex upward, start=${start.meanRecombine}, end=${end.meanRecombine}`
  );
  assert.ok(
    end.immuneDiversity > start.immuneDiversity,
    `Expected Shannon immune lock diversity to expand, start=${start.immuneDiversity}, end=${end.immuneDiversity}`
  );
});
