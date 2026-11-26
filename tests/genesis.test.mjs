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

test('TEB 2 (The Invention of Two): 0.50 Isogamy spontaneously Y-forks into micro & macro sexes (3-run ensemble)', () => {
  const runs = [];
  for (let r = 0; r < 3; r++) {
    const sim = new GenesisEngine('invention_of_two');
    const start = sim.getMetrics();
    assert.ok(start.midFrac >= 0.85, `Expected symmetric isogamous start, got midFrac=${start.midFrac}`);
    let best = start;
    for (let t = 1; t <= 6500; t++) {
      sim.step();
      if (t >= 3000 && t % 250 === 0) {
        const m = sim.getMetrics();
        if (m.bifurcationIndex > best.bifurcationIndex) best = m;
        if (m.bifurcationIndex >= 0.55 && m.midFrac < 0.25 && m.smallFrac >= 0.12 && m.largeFrac >= 0.12) {
          best = m;
          break;
        }
      }
    }
    runs.push({
      tick: best.tick,
      small: best.smallFrac,
      mid: best.midFrac,
      large: best.largeFrac,
      bif: best.bifurcationIndex,
      gen: best.generationMax,
    });
  }
  console.log('Invention of Two (3 replicates):', runs);
  const passed = runs.filter((x) => x.bif >= 0.32 && x.small >= 0.10 && x.large >= 0.10 && x.mid < 0.42).length;
  assert.ok(passed >= 2, `Expected >=2/3 replicates to Y-fork cleanly, got ${passed}/3: ${JSON.stringify(runs)}`);
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

test('TEB 1 + TEB 2 (Full Genesis): Red Queen parasites ignite sex & lock diversity (3-run ensemble)', () => {
  const runs = [];
  for (let r = 0; r < 3; r++) {
    const sim = new GenesisEngine('full_genesis');
    const start = sim.getMetrics();
    let best = start;
    for (let t = 1; t <= 5500; t++) {
      sim.step();
      if (t >= 2750 && t % 250 === 0) {
        const m = sim.getMetrics();
        if (m.meanRecombine > best.meanRecombine) best = m;
        if (m.meanRecombine > start.meanRecombine + 0.30 && m.immuneDiversity > start.immuneDiversity) {
          best = m;
          break;
        }
      }
    }
    runs.push({
      tick: best.tick,
      startRecomb: start.meanRecombine,
      endRecomb: best.meanRecombine,
      startImmDiv: start.immuneDiversity,
      endImmDiv: best.immuneDiversity,
      bif: best.bifurcationIndex,
      infections: best.totalInfections,
    });
  }
  console.log('Full Genesis (3 replicates):', runs);
  const passed = runs.filter(
    (x) => x.endRecomb > x.startRecomb + 0.25 && x.endImmDiv > x.startImmDiv
  ).length;
  assert.ok(
    passed >= 2,
    `Expected >=2/3 replicates to show Red Queen sexual surge + immune diversity expansion, got ${passed}/3`
  );
});
