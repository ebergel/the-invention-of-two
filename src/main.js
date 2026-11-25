/**
 * UI Controller & Animation Loop for "What Is Life" Laboratory
 * Chapter: The Role of Sexual Reproduction
 */

import { EXPERIMENTS, TRAIT_META } from './config.js';
import { EvolutionSimulation } from './simulation.js';
import { SimulationRenderer } from './renderer.js';
import { drawTraitChart, drawBatemanChart, drawPlattChart } from './charts.js';

const urlExp = new URLSearchParams(window.location.search).get('exp');
const initialExp = EXPERIMENTS.some((e) => e.id === urlExp) ? urlExp : 'sexual_emergence';
const sim = new EvolutionSimulation(initialExp);
const canvas = document.getElementById('sim-canvas');
const renderer = new SimulationRenderer(canvas);

// Runtime state
let isRunning = true;
let speedMultiplier = 2; // Start at 2x so evolutionary dynamics feel crisp & alive immediately
let uiFrameCounter = 0;

// DOM refs
const elGen = document.getElementById('stat-gen');
const elTick = document.getElementById('stat-tick');
const elPop = document.getElementById('stat-pop');
const elSexRatio = document.getElementById('stat-sex-ratio');
const elTrapped = document.getElementById('stat-trapped');
const elExpPills = document.getElementById('experiment-pills');
const elExpTitle = document.getElementById('exp-title');
const elExpHypothesis = document.getElementById('exp-hypothesis');
const elMilestoneTitle = document.getElementById('milestone-title');
const elMilestoneText = document.getElementById('milestone-text');
const elMilestoneLog = document.getElementById('milestone-log');

const chartTraits = document.getElementById('chart-traits');
const chartBateman = document.getElementById('chart-bateman');
const chartPlatt = document.getElementById('chart-platt');
const elTraitLegend = document.getElementById('trait-legend');

const elMaleGini = document.getElementById('val-male-gini');
const elFemaleGini = document.getElementById('val-female-gini');
const elDeltaGini = document.getElementById('val-delta-gini');
const elMaleZero = document.getElementById('val-male-zero');
const elFemaleZero = document.getElementById('val-female-zero');
const elTopShare = document.getElementById('val-top-share');
const elBatemanSample = document.getElementById('bateman-sample');

const elDecoyVulnBar = document.getElementById('bar-decoy-vuln');
const elDecoyVulnVal = document.getElementById('val-decoy-vuln');
const elDriftBadge = document.getElementById('drift-badge');
const elLblHabituation = document.getElementById('lbl-habituation');

const elInspId = document.getElementById('insp-id');
const elInspBody = document.getElementById('inspector-body');

// Controls refs
const btnPlay = document.getElementById('btn-play');
const btnStep = document.getElementById('btn-step');
const btnReset = document.getElementById('btn-reset');
const btnQuickDecoy = document.getElementById('btn-quick-decoy');
const ctrlAnisogamy = document.getElementById('ctrl-anisogamy');
const ctrlChoosiness = document.getElementById('ctrl-choosiness');
const ctrlContest = document.getElementById('ctrl-contest');
const ctrlFood = document.getElementById('ctrl-food');
const ctrlMutation = document.getElementById('ctrl-mutation');
const ctrlDecoys = document.getElementById('ctrl-decoys');
const ctrlSalience = document.getElementById('ctrl-salience');
const ctrlDrain = document.getElementById('ctrl-drain');
const ctrlLearning = document.getElementById('ctrl-learning');
const ctrlNovelty = document.getElementById('ctrl-novelty');
const wrapNovelty = document.getElementById('wrap-novelty');

const lblAnisogamy = document.getElementById('lbl-anisogamy');
const lblChoosiness = document.getElementById('lbl-choosiness');
const lblContest = document.getElementById('lbl-contest');
const lblFood = document.getElementById('lbl-food');
const lblMutation = document.getElementById('lbl-mutation');
const lblDecoys = document.getElementById('lbl-decoys');
const lblSalience = document.getElementById('lbl-salience');
const lblDrain = document.getElementById('lbl-drain');

// Build Experiment Preset Pills
function initExperimentBar() {
  elExpPills.innerHTML = '';
  for (const exp of EXPERIMENTS) {
    const btn = document.createElement('button');
    btn.className = 'exp-pill' + (exp.id === sim.currentExperiment.id ? ' active' : '');
    btn.textContent = exp.shortName;
    btn.dataset.expId = exp.id;
    btn.addEventListener('click', () => {
      sim.loadExperiment(exp.id);
      syncExperimentUI();
      syncControlsFromSim();
      updateTelemetryUI(true);
    });
    elExpPills.appendChild(btn);
  }
  syncExperimentUI();
}

function syncExperimentUI() {
  const exp = sim.currentExperiment;
  elExpTitle.textContent = exp.title;
  elExpHypothesis.textContent = exp.hypothesis;
  for (const pill of elExpPills.querySelectorAll('.exp-pill')) {
    pill.classList.toggle('active', pill.dataset.expId === exp.id);
  }
}

function syncControlsFromSim() {
  const p = sim.params;
  ctrlAnisogamy.value = p.anisogamyRatio;
  lblAnisogamy.textContent = `${p.anisogamyRatio.toFixed(1)}×`;

  ctrlChoosiness.value = p.femaleChoosinessBias;
  lblChoosiness.textContent = p.femaleChoosinessBias.toFixed(2);

  ctrlContest.value = p.contestEnergyCost;
  lblContest.textContent = `${p.contestEnergyCost}`;

  ctrlFood.value = p.foodTargetCount;
  lblFood.textContent = `${p.foodTargetCount}`;

  ctrlMutation.value = p.mutationRate;
  lblMutation.textContent = `${Math.round(p.mutationRate * 100)}%`;

  ctrlDecoys.value = sim.decoys.length;
  lblDecoys.textContent = `${sim.decoys.length}`;

  ctrlSalience.value = p.decoySalience;
  lblSalience.textContent = `${p.decoySalience.toFixed(2)}×`;

  ctrlDrain.value = p.decoyJuiceDrain;
  lblDrain.textContent = p.decoyJuiceDrain.toFixed(2);

  ctrlLearning.checked = Boolean(p.learningEnabled);
  ctrlNovelty.checked = Boolean(p.decoyNoveltyRefresh);
  ctrlNovelty.disabled = !p.learningEnabled;
  wrapNovelty.classList.toggle('disabled', !p.learningEnabled);

  document.getElementById('regime-sexual').classList.toggle('active', p.regime === 'sexual');
  document.getElementById('regime-asexual').classList.toggle('active', p.regime === 'asexual');
}

// Speed selector sync (default 2x)
function setSpeed(val) {
  speedMultiplier = val;
  for (const btn of document.querySelectorAll('.speed-btn')) {
    btn.classList.toggle('active', Number(btn.dataset.speed) === val);
  }
}
setSpeed(2);

// Wire Transport
btnPlay.addEventListener('click', () => {
  isRunning = !isRunning;
  btnPlay.textContent = isRunning ? 'Pause' : 'Play';
});

btnStep.addEventListener('click', () => {
  isRunning = false;
  btnPlay.textContent = 'Play';
  sim.step();
  renderer.render(sim);
  updateTelemetryUI(true);
});

btnReset.addEventListener('click', () => {
  sim.loadExperiment(sim.currentExperiment.id);
  syncControlsFromSim();
  updateTelemetryUI(true);
});

for (const btn of document.querySelectorAll('.speed-btn')) {
  btn.addEventListener('click', () => setSpeed(Number(btn.dataset.speed)));
}

// Spacebar play/pause
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
    e.preventDefault();
    isRunning = !isRunning;
    btnPlay.textContent = isRunning ? 'Pause' : 'Play';
  }
});

// Quick Inject Decoy button
btnQuickDecoy.addEventListener('click', () => {
  sim.addDecoy();
  syncControlsFromSim();
  sim.addMilestone(
    'Supernormal Decoy Injected',
    `Active decoys: ${sim.decoys.length}. Watch high w_mate / low discernment males get hijacked.`
  );
  updateTelemetryUI(true);
});

// Stage Tools & Overlays
for (const btn of document.querySelectorAll('.tool-btn')) {
  btn.addEventListener('click', () => {
    renderer.activeTool = btn.dataset.tool;
    for (const b of document.querySelectorAll('.tool-btn')) {
      b.classList.toggle('active', b === btn);
    }
  });
}

document.getElementById('opt-tethers').addEventListener('change', (e) => {
  renderer.options.showTethers = e.target.checked;
});

document.getElementById('opt-halos').addEventListener('change', (e) => {
  renderer.options.showHalos = e.target.checked;
});

document.getElementById('opt-colormode').addEventListener('change', (e) => {
  renderer.options.colorMode = e.target.value;
});

// Canvas Interactions
canvas.addEventListener('mousemove', (e) => {
  renderer.hoverWorld = renderer.screenToWorld(e.clientX, e.clientY, sim);
});

canvas.addEventListener('mouseleave', () => {
  renderer.hoverWorld = null;
});

canvas.addEventListener('click', (e) => {
  const pos = renderer.screenToWorld(e.clientX, e.clientY, sim);

  if (renderer.activeTool === 'decoy') {
    const removed = sim.removeDecoyNear(pos.x, pos.y, 44);
    if (!removed) sim.addDecoy(pos.x, pos.y);
    syncControlsFromSim();
    return;
  }

  if (renderer.activeTool === 'food') {
    for (let k = 0; k < 14; k++) {
      const ang = Math.random() * Math.PI * 2;
      const r = Math.random() * 44;
      sim.spawnFood(pos.x + Math.cos(ang) * r, pos.y + Math.sin(ang) * r);
    }
    return;
  }

  // Inspect tool
  const hit = sim.findAgentAt(pos.x, pos.y, 26);
  sim.selectedAgentId = hit ? hit.id : null;
  if (hit) {
    switchTab('inspector');
    renderInspector();
  }
});

// Right-pane Tabs
function switchTab(tabName) {
  for (const b of document.querySelectorAll('.tab-btn')) {
    b.classList.toggle('active', b.dataset.tab === tabName);
  }
  for (const p of document.querySelectorAll('.tab-panel')) {
    p.classList.toggle('active', p.id === `tab-${tabName}`);
  }
  if (tabName === 'telemetry') {
    updateTelemetryUI(true);
  }
}

for (const b of document.querySelectorAll('.tab-btn')) {
  b.addEventListener('click', () => switchTab(b.dataset.tab));
}

// Lab Parameter Controls
for (const btn of document.querySelectorAll('.seg-btn')) {
  btn.addEventListener('click', () => {
    sim.setRegime(btn.dataset.regime);
    syncControlsFromSim();
    updateTelemetryUI(true);
  });
}

ctrlAnisogamy.addEventListener('input', () => {
  sim.params.anisogamyRatio = parseFloat(ctrlAnisogamy.value);
  lblAnisogamy.textContent = `${sim.params.anisogamyRatio.toFixed(1)}×`;
});

ctrlChoosiness.addEventListener('input', () => {
  sim.params.femaleChoosinessBias = parseFloat(ctrlChoosiness.value);
  lblChoosiness.textContent = sim.params.femaleChoosinessBias.toFixed(2);
});

ctrlContest.addEventListener('input', () => {
  sim.params.contestEnergyCost = parseInt(ctrlContest.value, 10);
  lblContest.textContent = `${sim.params.contestEnergyCost}`;
});

ctrlFood.addEventListener('input', () => {
  sim.params.foodTargetCount = parseInt(ctrlFood.value, 10);
  sim.params.foodSpawnRate = +(sim.params.foodTargetCount / 84).toFixed(2);
  lblFood.textContent = `${sim.params.foodTargetCount}`;
});

ctrlMutation.addEventListener('input', () => {
  sim.params.mutationRate = parseFloat(ctrlMutation.value);
  lblMutation.textContent = `${Math.round(sim.params.mutationRate * 100)}%`;
});

ctrlDecoys.addEventListener('input', () => {
  sim.syncDecoyCount(parseInt(ctrlDecoys.value, 10));
  lblDecoys.textContent = `${sim.decoys.length}`;
});

ctrlSalience.addEventListener('input', () => {
  sim.params.decoySalience = parseFloat(ctrlSalience.value);
  lblSalience.textContent = `${sim.params.decoySalience.toFixed(2)}×`;
});

ctrlDrain.addEventListener('input', () => {
  sim.params.decoyJuiceDrain = parseFloat(ctrlDrain.value);
  lblDrain.textContent = sim.params.decoyJuiceDrain.toFixed(2);
});

ctrlLearning.addEventListener('change', () => {
  sim.params.learningEnabled = ctrlLearning.checked;
  ctrlNovelty.disabled = !ctrlLearning.checked;
  wrapNovelty.classList.toggle('disabled', !ctrlLearning.checked);
  if (!ctrlLearning.checked) {
    sim.params.decoyNoveltyRefresh = false;
    ctrlNovelty.checked = false;
  }
  sim.addMilestone(
    ctrlLearning.checked ? 'Individual Learning Enabled' : 'Individual Learning Disabled',
    ctrlLearning.checked
      ? 'Males now habituate to zero-payoff decoys within a single lifetime instead of needing 20 generations of genetic evolution.'
      : 'Hard-wired instinct mode: males can only escape decoys via multi-generation genetic selection.'
  );
  updateTelemetryUI(true);
});

ctrlNovelty.addEventListener('change', () => {
  sim.params.decoyNoveltyRefresh = ctrlNovelty.checked;
  sim.addMilestone(
    ctrlNovelty.checked ? 'Variable-Ratio Novelty Active' : 'Static Decoys Restored',
    ctrlNovelty.checked
      ? 'Decoy screens now periodically refresh novelty, partially defeating vertebrate habituation.'
      : 'Decoy screens are static again — learning males can fully habituate.'
  );
  updateTelemetryUI(true);
});

document.getElementById('btn-add-3-decoys').addEventListener('click', () => {
  for (let i = 0; i < 3; i++) sim.addDecoy();
  syncControlsFromSim();
  sim.addMilestone(
    'Decoy Surge (+3)',
    `Now running ${sim.decoys.length} supernormal decoys across the arena.`
  );
  updateTelemetryUI(true);
});

document.getElementById('btn-clear-decoys').addEventListener('click', () => {
  sim.clearDecoys();
  syncControlsFromSim();
  updateTelemetryUI(true);
});

document.getElementById('btn-bottleneck').addEventListener('click', () => {
  sim.triggerBottleneck();
  updateTelemetryUI(true);
});

// Build Trait Legend DOM
function renderTraitLegend(traits) {
  const keys = ['w_mate', 'w_status', 'display', 'choosiness', 'discernment'];
  elTraitLegend.innerHTML = keys
    .map((k) => {
      const meta = TRAIT_META[k];
      return `
        <div class="trait-item" title="${meta.desc}">
          <span class="trait-item-left">
            <i class="trait-swatch" style="background:${meta.color}"></i>
            <span>${meta.label}</span>
          </span>
          <strong class="trait-val">${(traits[k] * 100).toFixed(0)}%</strong>
        </div>
      `;
    })
    .join('');
}

// Render Inspector for Selected Organism
function renderInspector() {
  const agent = sim.agents.find((a) => a.id === sim.selectedAgentId);
  if (!agent) {
    elInspId.textContent = 'Click any organism';
    elInspBody.innerHTML = `<div class="inspector-empty">Select any organism in the habitat to inspect its live Platt common-currency utility brain (Food vs. Female vs. Alpha Rival vs. Decoy) and heritable genome.</div>`;
    return;
  }

  const sexLabel =
    agent.sex === 'M'
      ? agent.isAlpha
        ? '♂ Male (ALPHA)'
        : '♂ Male'
      : agent.sex === 'F'
      ? '♀ Female'
      : '◎ Asexual';

  const stateLabels = {
    forage: 'Foraging Cherry Juice',
    pursue_female: 'Pursuing Fertile Female',
    trapped_decoy: 'TRAPPED BY PIXEL DECOY',
    yield_alpha: 'Yielding to Alpha Rival',
    contest: 'Dominance Contest',
    receptive: 'Receptive (Evaluating Suitors)',
  };

  elInspId.textContent = `#${agent.id} · Gen ${agent.generation}`;

  const uMax = Math.max(2.5, agent.utilities.food, agent.utilities.female, agent.utilities.rival, agent.utilities.decoy);
  const bar = (label, val, max, color, displayVal) => {
    const pct = Math.min(100, Math.max(0, (val / max) * 100));
    return `
      <div class="bar-row">
        <span>${label}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${pct.toFixed(1)}%;background:${color}"></div></div>
        <span class="bar-num">${displayVal}</span>
      </div>
    `;
  };

  elInspBody.innerHTML = `
    <div class="insp-grid">
      <div class="insp-stat"><span>Role</span><strong>${sexLabel}</strong></div>
      <div class="insp-stat"><span>Juice Energy</span><strong>${agent.energy.toFixed(0)} / ${agent.maxEnergy}</strong></div>
      <div class="insp-stat"><span>Offspring</span><strong>${agent.offspringCount}</strong></div>
      <div class="insp-stat"><span>Status Rank</span><strong>${Math.round(agent.statusRank * 100)}th %</strong></div>
      <div class="insp-stat"><span>Contests W/L</span><strong>${agent.contestWins} / ${agent.contestLosses}</strong></div>
      <div class="insp-stat"><span>Decoy / Habituation</span><strong>${agent.trappedTicks}t · ${Math.round(agent.decoyHabituation * 100)}%</strong></div>
    </div>
    <div class="insp-stat" style="margin-bottom:6px">
      <span>Current Drive</span>
      <strong style="color:${agent.state === 'trapped_decoy' ? '#e879f9' : '#38bdf8'}">${stateLabels[agent.state] || agent.state}</strong>
    </div>

    <div class="insp-section-title">Live Common-Currency Utility (Platt Brain)</div>
    ${bar('Cherry Juice', agent.utilities.food, uMax, '#ff3b5c', agent.utilities.food.toFixed(2))}
    ${bar('Female Cue', agent.utilities.female, uMax, '#fbbf24', agent.utilities.female.toFixed(2))}
    ${bar('Alpha Rival', agent.utilities.rival, uMax, '#a78bfa', agent.utilities.rival.toFixed(2))}
    ${bar('Pixel Decoy', agent.utilities.decoy, uMax, '#e879f9', agent.utilities.decoy.toFixed(2))}

    <div class="insp-section-title">Heritable Genome (6 Genes)</div>
    ${bar('w_mate (Drive)', agent.genome.w_mate, 1, '#38bdf8', `${Math.round(agent.genome.w_mate * 100)}%`)}
    ${bar('w_status (Rank)', agent.genome.w_status, 1, '#a78bfa', `${Math.round(agent.genome.w_status * 100)}%`)}
    ${bar('Costly Display', agent.genome.display, 1, '#fb7185', `${Math.round(agent.genome.display * 100)}%`)}
    ${bar('Choosiness', agent.genome.choosiness, 1, '#fbbf24', `${Math.round(agent.genome.choosiness * 100)}%`)}
    ${bar('Discernment', agent.genome.discernment, 1, '#34d399', `${Math.round(agent.genome.discernment * 100)}%`)}
    ${bar('Forage Speed', agent.genome.forage_speed, 1, '#94a3b8', `${Math.round(agent.genome.forage_speed * 100)}%`)}
  `;
}

function renderMilestones() {
  if (sim.milestones.length > 0) {
    const latest = sim.milestones[0];
    elMilestoneTitle.textContent = latest.title;
    elMilestoneText.textContent = latest.text;
  }

  elMilestoneLog.innerHTML = sim.milestones
    .slice(0, 10)
    .map(
      (m) => `
      <li>
        <div class="ml-head">
          <strong>${m.title}</strong>
          <span>t=${m.tick} · Gen ${m.gen}</span>
        </div>
        <p>${m.text}</p>
      </li>
    `
    )
    .join('');
}

function updateTelemetryUI(forceCharts = false) {
  const m = sim.getMetrics();
  elGen.textContent = `${m.generationMax}`;
  elTick.textContent = `${m.tick}`;
  elPop.textContent = `${m.population}`;
  elSexRatio.textContent =
    sim.params.regime === 'sexual' ? `${m.males} / ${m.females}` : `${m.asexuals} clonal`;
  elTrapped.textContent = `${m.trappedPct.toFixed(0)}%`;

  // Bateman card
  if (sim.params.regime === 'sexual') {
    elMaleGini.textContent = m.bateman.maleGini.toFixed(2);
    elFemaleGini.textContent = m.bateman.femaleGini.toFixed(2);
    const dg = m.bateman.deltaGini;
    elDeltaGini.textContent = `${dg >= 0 ? '+' : ''}${dg.toFixed(2)}`;
    elMaleZero.textContent = `${m.bateman.maleZeroPct.toFixed(0)}% childless`;
    elFemaleZero.textContent = `${m.bateman.femaleZeroPct.toFixed(0)}% childless`;
    elTopShare.textContent = `${m.bateman.topMaleSharePct.toFixed(0)}%`;
    elBatemanSample.textContent = `♂ n=${m.bateman.maleSampleSize} · ♀ n=${m.bateman.femaleSampleSize}`;
  } else {
    elMaleGini.textContent = m.bateman.asexualGini.toFixed(2);
    elFemaleGini.textContent = '—';
    elDeltaGini.textContent = 'n/a';
    elMaleZero.textContent = 'clonal gini';
    elFemaleZero.textContent = 'no sexes';
    elTopShare.textContent = '—';
    elBatemanSample.textContent = `Clonal cohort n=${m.bateman.asexualSampleSize}`;
  }

  // Platt Decoy Vulnerability bar & Drift / Habituation indicators
  elDecoyVulnBar.style.width = `${Math.min(100, m.platt.decoyVulnerability)}%`;
  elDecoyVulnVal.textContent = `${m.platt.decoyVulnerability.toFixed(0)}%`;
  elDriftBadge.textContent = `Ne ≈ ${m.nEff} · ${m.driftLevel}`;
  elLblHabituation.textContent = sim.params.learningEnabled ? `${m.avgHabituationPct.toFixed(0)}%` : 'Off';

  renderTraitLegend(m.traits);
  renderMilestones();
  if (sim.selectedAgentId !== null) renderInspector();

  const telemetryVisible = document.getElementById('tab-telemetry').classList.contains('active');
  if (telemetryVisible || forceCharts) {
    drawTraitChart(chartTraits, sim.history);
    drawBatemanChart(chartBateman, m.bateman, sim.params.regime);
    drawPlattChart(chartPlatt, m.platt);
  }
}

// Main Animation Loop
function loop() {
  if (isRunning) {
    for (let s = 0; s < speedMultiplier; s++) {
      sim.step();
    }
  }

  renderer.render(sim);

  uiFrameCounter++;
  if (uiFrameCounter % 12 === 0) {
    updateTelemetryUI(false);
  }

  requestAnimationFrame(loop);
}

// Boot
initExperimentBar();
syncControlsFromSim();
updateTelemetryUI(true);
requestAnimationFrame(loop);
