import test from 'node:test';
import assert from 'node:assert/strict';
import { EvolutionSimulation } from '../src/simulation.js';
import { EXPERIMENTS } from '../src/config.js';

function runTicks(sim, ticks) {
  for (let i = 0; i < ticks; i++) sim.step();
  return sim.getMetrics();
}

test('All 5 experiments run stably without NaNs or collapse', () => {
  for (const exp of EXPERIMENTS) {
    const sim = new EvolutionSimulation(exp.id);
    const m = runTicks(sim, 600);
    assert.ok(m.population >= sim.params.minPopulationFloor, `${exp.id} population collapsed: ${m.population}`);
    assert.ok(m.population <= sim.params.maxPopulation + 5, `${exp.id} population overflowed: ${m.population}`);
    assert.ok(Number.isFinite(m.avgEnergy), `${exp.id} avgEnergy is NaN`);
    assert.ok(Number.isFinite(m.bateman.maleGini), `${exp.id} maleGini is NaN`);
    assert.ok(m.generationMax >= 2, `${exp.id} failed to reproduce: gen=${m.generationMax}`);
  }
});

test("Bateman's Principle emerges under sexual reproduction with anisogamy", () => {
  const sim = new EvolutionSimulation('sexual_emergence');
  const m = runTicks(sim, 1800);
  console.log('Sexual emergence @1800:', {
    pop: m.population,
    gen: m.generationMax,
    maleGini: m.bateman.maleGini,
    femaleGini: m.bateman.femaleGini,
    topMaleSharePct: m.bateman.topMaleSharePct,
    traits: m.traits,
    platt: m.platt,
  });
  assert.ok(
    m.bateman.maleGini > m.bateman.femaleGini,
    `Expected maleGini (${m.bateman.maleGini}) > femaleGini (${m.bateman.femaleGini})`
  );
  assert.ok(
    m.bateman.topMaleSharePct >= 38,
    `Expected top 20% males to sire >=38% of offspring, got ${m.bateman.topMaleSharePct}%`
  );
  assert.ok(m.platt.femaleCuePSE > 0, `Expected positive female cue PSE, got ${m.platt.femaleCuePSE}`);
  assert.ok(m.platt.dominantMalePSE > 0, `Expected positive dominant male PSE, got ${m.platt.dominantMalePSE}`);
  assert.ok(m.platt.subordinateMalePSE < 0, `Expected negative subordinate male PSE, got ${m.platt.subordinateMalePSE}`);
});

test('Asexual control purges costly display traits compared to sexual runaway', () => {
  const asexual = new EvolutionSimulation('asexual_control');
  const mAsexStart = asexual.getMetrics();
  const mAsexEnd = runTicks(asexual, 2400);

  const runaway = new EvolutionSimulation('runaway_handicap');
  const mSexEnd = runTicks(runaway, 2400);

  console.log('Asexual vs Runaway @2400:', {
    asexDisplayStart: mAsexStart.traits.display,
    asexDisplayEnd: mAsexEnd.traits.display,
    runawayDisplayEnd: mSexEnd.traits.display,
    asexGini: mAsexEnd.bateman.asexualGini,
  });

  assert.ok(
    mAsexEnd.traits.display < mSexEnd.traits.display,
    `Expected asexual display (${mAsexEnd.traits.display}) < sexual runaway display (${mSexEnd.traits.display})`
  );
});

test('Supernormal decoys trap high-drive males and drive evolutionary counter-adaptation', () => {
  const sim = new EvolutionSimulation('pay_per_view_trap');
  const startM = sim.getMetrics();
  const startSuscept = startM.traits.w_mate * (1 - startM.traits.discernment);

  // Check early trap engagement and composite evolutionary shift across ~20 generations
  let peakTrappedPct = 0;
  for (let t = 0; t < 3000; t++) {
    sim.step();
    if (t % 25 === 0) {
      const m = sim.latestMetrics;
      if (m && m.trappedPct > peakTrappedPct) peakTrappedPct = m.trappedPct;
    }
  }
  const endM = sim.getMetrics();
  const endSuscept = endM.traits.w_mate * (1 - endM.traits.discernment);
  console.log('Pay-Per-View Trap @3000:', {
    peakTrappedPct,
    endTrappedPct: endM.trappedPct,
    startSuscept: +startSuscept.toFixed(3),
    endSuscept: +endSuscept.toFixed(3),
    startDiscern: startM.traits.discernment,
    endDiscern: endM.traits.discernment,
    endWMate: endM.traits.w_mate,
    gen: endM.generationMax,
  });

  assert.ok(peakTrappedPct >= 15, `Expected supernormal decoys to trap >=15% of males at peak, got ${peakTrappedPct}%`);
  assert.ok(
    endSuscept < startSuscept - 0.03,
    `Expected composite decoy susceptibility to decline via discernment up and/or w_mate down: start=${startSuscept.toFixed(3)}, end=${endSuscept.toFixed(3)}`
  );
});

test('Individual learning collapses static decoy traps rapidly; variable-ratio novelty re-hooks learners', () => {
  const staticLearn = new EvolutionSimulation('pay_per_view_trap', {
    learningEnabled: true,
    decoyNoveltyRefresh: false,
  });
  const mStatic = runTicks(staticLearn, 600);

  const noveltyLearn = new EvolutionSimulation('pay_per_view_trap', {
    learningEnabled: true,
    decoyNoveltyRefresh: true,
  });
  const mNovelty = runTicks(noveltyLearn, 600);

  const noLearn = new EvolutionSimulation('pay_per_view_trap', {
    learningEnabled: false,
  });
  const mNoLearn = runTicks(noLearn, 600);

  console.log('Learning vs Novelty @600:', {
    noLearnTrappedTicks: noLearn.totalDecoyTrappedTicks,
    staticLearnTrappedTicks: staticLearn.totalDecoyTrappedTicks,
    noveltyLearnTrappedTicks: noveltyLearn.totalDecoyTrappedTicks,
    staticAvgHab: mStatic.avgHabituationPct,
    noveltyAvgHab: mNovelty.avgHabituationPct,
    nEff: mNoLearn.nEff,
    driftLevel: mNoLearn.driftLevel,
  });

  assert.ok(
    staticLearn.totalDecoyTrappedTicks < noLearn.totalDecoyTrappedTicks,
    `Expected individual learning (${staticLearn.totalDecoyTrappedTicks}) to reduce trapped ticks vs no learning (${noLearn.totalDecoyTrappedTicks})`
  );
  assert.ok(
    noveltyLearn.totalDecoyTrappedTicks > staticLearn.totalDecoyTrappedTicks,
    `Expected variable-ratio novelty (${noveltyLearn.totalDecoyTrappedTicks}) to trap more ticks than static learning (${staticLearn.totalDecoyTrappedTicks})`
  );
  assert.ok(mNoLearn.nEff > 0 && typeof mNoLearn.driftLevel === 'string');
});
