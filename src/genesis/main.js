/**
 * THE INVENTION OF TWO — Interactive Observatory Controller
 */

import { GENESIS_EXPERIMENTS } from './config.js';
import { GenesisEngine } from './engine.js';
import { GenesisRenderer, gameteSizeColor } from './renderer.js';
import { drawWaterfall, drawRedQueenRadar, drawRegimeCurves } from './charts.js';

const sim = new GenesisEngine('invention_of_two');
const oceanCanvas = document.getElementById('ocean-canvas');
const renderer = new GenesisRenderer(oceanCanvas);

const waterfallCanvas = document.getElementById('chart-waterfall');
const radarCanvas = document.getElementById('chart-radar');
const curvesCanvas = document.getElementById('chart-curves');

let running = true;
let speed = 2;
let frameCount = 0;
let lastMilestoneCount = 0;

// --- Populate Experiment Preset Bar ---
const expStrip = document.getElementById('experiment-strip');

function renderExperimentBar() {
  expStrip.innerHTML = '';
  for (const exp of GENESIS_EXPERIMENTS) {
    const isNeg = exp.id.startsWith('negative_control');
    const btn = document.createElement('button');
    btn.className = `exp-pill${sim.currentExperiment.id === exp.id ? ' active' : ''}${isNeg ? ' neg' : ''}`;
    btn.innerHTML = `
      <span class="exp-pill-top">
        <span class="exp-pill-name">${exp.shortName}</span>
        ${isNeg ? '<span class="neg-badge">CONTROL</span>' : '<span class="teb-badge">EMERGENCE</span>'}
      </span>
    `;
    btn.title = exp.subtitle;
    btn.addEventListener('click', () => loadExperiment(exp.id));
    expStrip.appendChild(btn);
  }
}

function loadExperiment(expId) {
  sim.loadExperiment(expId);
  lastMilestoneCount = sim.milestones.length;
  syncControlsFromSim();
  renderExperimentBar();
  updateHypothesisCard();
  updateMetricsUI();
  renderMilestones();
  renderInspector();
  drawAllCharts();
}

function updateHypothesisCard() {
  const exp = sim.currentExperiment;
  document.getElementById('hyp-title').textContent = exp.title;
  document.getElementById('hyp-text').textContent = exp.hypothesis;
}

// --- Transport Controls ---
const btnPlay = document.getElementById('btn-play');
const btnStep = document.getElementById('btn-step');
const btnReset = document.getElementById('btn-reset');
const speedBtns = document.querySelectorAll('.speed-btn');

btnPlay.addEventListener('click', () => {
  running = !running;
  btnPlay.textContent = running ? '⏸ Pause' : '▶ Play';
  btnPlay.classList.toggle('paused', !running);
});

btnStep.addEventListener('click', () => {
  running = false;
  btnPlay.textContent = '▶ Play';
  btnPlay.classList.add('paused', true);
  for (let i = 0; i < 5; i++) sim.step();
  sim.recordSnapshot();
  updateAllUI();
});

btnReset.addEventListener('click', () => {
  loadExperiment(sim.currentExperiment.id);
});

speedBtns.forEach((b) => {
  b.addEventListener('click', () => {
    speed = Number(b.dataset.speed);
    speedBtns.forEach((x) => x.classList.toggle('active', x === b));
  });
});

// --- Tabs (Right Workbench) ---
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');
tabBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    tabBtns.forEach((b) => b.classList.toggle('active', b === btn));
    tabPanels.forEach((p) => p.classList.toggle('active', p.id === `tab-${target}`));
    if (target === 'observatory') {
      requestAnimationFrame(drawAllCharts);
    }
  });
});

// --- Ocean Interactive Tools & Overlays ---
const toolBtns = document.querySelectorAll('.tool-btn');
toolBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    renderer.activeTool = btn.dataset.tool;
    toolBtns.forEach((b) => b.classList.toggle('active', b === btn));
    oceanCanvas.style.cursor = renderer.activeTool === 'inspect' ? 'pointer' : 'crosshair';
  });
});

const overlayIds = [
  ['ov-gametes', 'gametes'],
  ['ov-pheromones', 'pheromones'],
  ['ov-parasites', 'parasites'],
  ['ov-locks', 'immuneRings'],
  ['ov-care', 'careTethers'],
];
overlayIds.forEach(([elId, key]) => {
  const cb = document.getElementById(elId);
  cb.checked = renderer.overlays[key];
  cb.addEventListener('change', () => {
    renderer.overlays[key] = cb.checked;
  });
});

function canvasCoords(evt) {
  const rect = oceanCanvas.getBoundingClientRect();
  return {
    x: ((evt.clientX - rect.left) / rect.width) * sim.params.worldWidth,
    y: ((evt.clientY - rect.top) / rect.height) * sim.params.worldHeight,
  };
}

oceanCanvas.addEventListener('mousemove', (evt) => {
  renderer.hoverPos = canvasCoords(evt);
});
oceanCanvas.addEventListener('mouseleave', () => {
  renderer.hoverPos = null;
});
oceanCanvas.addEventListener('click', (evt) => {
  const { x, y } = canvasCoords(evt);
  if (renderer.activeTool === 'inspect') {
    const found = sim.findOrganismAt(x, y, 28);
    sim.selectedOrgId = found ? found.id : null;
    if (found) {
      // Switch smoothly to inspector tab if user clicks a cell
      document.querySelector('[data-tab="inspector"]').click();
      renderInspector();
    }
  } else if (renderer.activeTool === 'outbreak') {
    sim.triggerOutbreakAt(x, y);
    syncControlsFromSim();
  } else if (renderer.activeTool === 'nutrients') {
    for (let i = 0; i < 16; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r = Math.random() * 34;
      sim.spawnNutrient(x + Math.cos(ang) * r, y + Math.sin(ang) * r);
    }
  }
});

// --- Physics Sliders & Live Interventions ---
const ctrlZygoteK = document.getElementById('ctrl-zygoteK');
const ctrlZygoteP = document.getElementById('ctrl-zygotePower');
const ctrlParasites = document.getElementById('ctrl-parasites');
const ctrlParaDmg = document.getElementById('ctrl-paraDamage');
const ctrlMutRate = document.getElementById('ctrl-mutRate');
const ctrlNutrients = document.getElementById('ctrl-nutrients');

function syncControlsFromSim() {
  ctrlZygoteK.value = sim.params.zygoteK;
  document.getElementById('val-zygoteK').textContent = sim.params.zygoteK.toFixed(2);
  ctrlZygoteP.value = sim.params.zygotePower;
  document.getElementById('val-zygotePower').textContent = sim.params.zygotePower.toFixed(1);
  ctrlParasites.checked = sim.params.parasitesEnabled;
  ctrlParaDmg.value = sim.params.parasiteDamage;
  document.getElementById('val-paraDamage').textContent = Math.round(sim.params.parasiteDamage);
  ctrlMutRate.value = sim.params.mutationRate;
  document.getElementById('val-mutRate').textContent = `${Math.round(sim.params.mutationRate * 100)}%`;
  ctrlNutrients.value = sim.params.nutrientTarget;
  document.getElementById('val-nutrients').textContent = sim.params.nutrientTarget;
}

ctrlZygoteK.addEventListener('input', () => {
  sim.params.zygoteK = Number(ctrlZygoteK.value);
  document.getElementById('val-zygoteK').textContent = sim.params.zygoteK.toFixed(2);
});
ctrlZygoteP.addEventListener('input', () => {
  sim.params.zygotePower = Number(ctrlZygoteP.value);
  document.getElementById('val-zygotePower').textContent = sim.params.zygotePower.toFixed(1);
});
ctrlParasites.addEventListener('change', () => {
  sim.params.parasitesEnabled = ctrlParasites.checked;
  if (ctrlParasites.checked && sim.parasites.length < 40) {
    sim.params.parasiteTarget = Math.max(240, sim.params.parasiteTarget || 260);
    for (let i = 0; i < 90; i++) {
      const host = sim.organisms[i % Math.max(1, sim.organisms.length)];
      sim.spawnParasite(null, null, host ? host.immuneLock : null);
    }
  }
});
ctrlParaDmg.addEventListener('input', () => {
  sim.params.parasiteDamage = Number(ctrlParaDmg.value);
  document.getElementById('val-paraDamage').textContent = Math.round(sim.params.parasiteDamage);
});
ctrlMutRate.addEventListener('input', () => {
  sim.params.mutationRate = Number(ctrlMutRate.value);
  document.getElementById('val-mutRate').textContent = `${Math.round(sim.params.mutationRate * 100)}%`;
});
ctrlNutrients.addEventListener('input', () => {
  sim.params.nutrientTarget = Number(ctrlNutrients.value);
  document.getElementById('val-nutrients').textContent = sim.params.nutrientTarget;
});

document.getElementById('btn-global-outbreak').addEventListener('click', () => {
  sim.params.parasitesEnabled = true;
  sim.params.parasiteTarget = 290;
  for (let i = 0; i < 6; i++) {
    const o = sim.organisms[Math.floor(Math.random() * sim.organisms.length)];
    if (o) sim.triggerOutbreakAt(o.x, o.y);
  }
  syncControlsFromSim();
});

document.getElementById('btn-set-benign').addEventListener('click', () => {
  sim.params.zygoteK = 0.015;
  syncControlsFromSim();
});

document.getElementById('btn-set-harsh').addEventListener('click', () => {
  sim.params.zygoteK = 0.49;
  syncControlsFromSim();
});

// --- Manifesto Modal ("Gnothi Seauton") ---
const modal = document.getElementById('manifesto-modal');
document.getElementById('btn-manifesto').addEventListener('click', () => {
  modal.classList.add('open');
});
document.getElementById('btn-close-manifesto').addEventListener('click', () => {
  modal.classList.remove('open');
});
modal.addEventListener('click', (e) => {
  if (e.target === modal) modal.classList.remove('open');
});

// --- Milestone Toast ---
let toastTimer = null;
function showToast(title, text) {
  const toast = document.getElementById('milestone-toast');
  document.getElementById('toast-title').textContent = title;
  document.getElementById('toast-body').textContent = text;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 6500);
}

// --- Live Telemetry & Inspector Updates ---
function updateMetricsUI() {
  const m = sim.latestMetrics || sim.getMetrics();
  document.getElementById('kpi-gen').textContent = m.generationMax;
  document.getElementById('kpi-pop').textContent = m.population;
  document.getElementById('kpi-sex').textContent = `${Math.round(m.meanRecombine * 100)}%`;
  document.getElementById('kpi-bif').textContent = m.bifurcationIndex.toFixed(2);
  document.getElementById('kpi-locks').textContent = m.uniqueLocks;

  // Live 3-band gamete distribution bar under the spectrogram
  const sPct = Math.round(m.smallFrac * 100);
  const mPct = Math.round(m.midFrac * 100);
  const lPct = Math.max(0, 100 - sPct - mPct);
  document.getElementById('bar-small').style.width = `${sPct}%`;
  document.getElementById('bar-mid').style.width = `${mPct}%`;
  document.getElementById('bar-large').style.width = `${lPct}%`;
  document.getElementById('lbl-small').textContent = `Micro (<0.34): ${sPct}%`;
  document.getElementById('lbl-mid').textContent = `Iso (0.34–0.66): ${mPct}%`;
  document.getElementById('lbl-large').textContent = `Macro (>0.66): ${lPct}%`;

  // Care divergence readout
  document.getElementById('care-readout').textContent =
    `Post-Fusion Care — Micro-makers: ${m.smallCareMean.toFixed(2)} · Macro-makers: ${m.largeCareMean.toFixed(2)}`;
}

function renderMilestones() {
  const list = document.getElementById('milestone-list');
  list.innerHTML = sim.milestones
    .map(
      (ms) => `
      <div class="ms-item">
        <div class="ms-head">
          <span class="ms-title">${ms.title}</span>
          <span class="ms-meta">Gen ${ms.gen} · t=${ms.tick}</span>
        </div>
        <div class="ms-text">${ms.text}</div>
      </div>`
    )
    .join('');
}

function renderInspector() {
  const box = document.getElementById('inspector-card');
  const org = sim.organisms.find((o) => o.id === sim.selectedOrgId);
  if (!org) {
    box.innerHTML = `<div class="insp-empty">Click any living cell in the ocean to inspect its continuous genome and 8-bit molecular immune lock.<br><br>Notice: there is <strong>no sex property</strong> on this object — only continuous physics traits.</div>`;
    return;
  }

  const isSex = org.genome.recombine >= 0.5;
  const gs = org.genome.gameteSize;
  const modeLabel = !isSex
    ? 'Asexual Clonal (Mitosis)'
    : gs < 0.34
      ? 'Sexual · Emergent Micro-Gamete Seeker'
      : gs > 0.66
        ? 'Sexual · Emergent Macro-Egg Vessel'
        : 'Sexual · Symmetric Isogamous';

  const colorDot = isSex ? gameteSizeColor(gs, 1) : '#34d399';
  const bits = org.immuneLock.toString(2).padStart(8, '0');
  const bitPills = bits
    .split('')
    .map((b) => `<span class="bit-cell ${b === '1' ? 'on' : 'off'}">${b}</span>`)
    .join('');

  box.innerHTML = `
    <div class="insp-head">
      <span class="insp-swatch" style="background:${colorDot}"></span>
      <div>
        <div class="insp-id">Organism #${org.id} <span class="insp-gen">Gen ${org.generation} · ${org.origin}</span></div>
        <div class="insp-mode">${modeLabel}</div>
      </div>
    </div>
    <div class="insp-grid">
      <div class="insp-stat"><span>recombine</span><strong>${org.genome.recombine.toFixed(3)}</strong></div>
      <div class="insp-stat"><span>gameteSize</span><strong>${org.genome.gameteSize.toFixed(3)}</strong></div>
      <div class="insp-stat"><span>postCare</span><strong>${org.genome.postCare.toFixed(3)}</strong></div>
      <div class="insp-stat"><span>speed</span><strong>${org.genome.speed.toFixed(3)}</strong></div>
      <div class="insp-stat"><span>Energy</span><strong>${Math.round(org.energy)} / ${org.maxEnergy}</strong></div>
      <div class="insp-stat"><span>Offspring</span><strong>${org.offspringCount}</strong></div>
      <div class="insp-stat"><span>Age</span><strong>${org.age} / ${sim.params.maxAge}</strong></div>
      <div class="insp-stat"><span>Infections</span><strong>${org.infectionsTaken}</strong></div>
    </div>
    <div class="insp-lock-block">
      <div class="insp-lock-label">8-Bit Molecular Immune Lock (dec ${org.immuneLock})</div>
      <div class="bit-row">${bitPills}</div>
    </div>
  `;
}

function drawAllCharts() {
  drawWaterfall(waterfallCanvas, sim);
  drawRedQueenRadar(radarCanvas, sim);
  drawRegimeCurves(curvesCanvas, sim);
}

function updateAllUI() {
  renderer.render(sim);
  updateMetricsUI();
  drawAllCharts();
  renderInspector();
  if (sim.milestones.length !== lastMilestoneCount) {
    lastMilestoneCount = sim.milestones.length;
    renderMilestones();
    if (sim.milestones[0]) showToast(sim.milestones[0].title, sim.milestones[0].text);
  }
}

// --- Main Animation Loop ---
function loop() {
  if (running) {
    for (let s = 0; s < speed; s++) sim.step();
  }
  renderer.render(sim);
  frameCount++;
  if (frameCount % 6 === 0) {
    updateMetricsUI();
    drawAllCharts();
    if (sim.selectedOrgId !== null) renderInspector();
    if (sim.milestones.length !== lastMilestoneCount) {
      lastMilestoneCount = sim.milestones.length;
      renderMilestones();
      if (sim.milestones[0]) showToast(sim.milestones[0].title, sim.milestones[0].text);
    }
  }
  requestAnimationFrame(loop);
}

// Initial boot
syncControlsFromSim();
renderExperimentBar();
updateHypothesisCard();
updateAllUI();
requestAnimationFrame(loop);
