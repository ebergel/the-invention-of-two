/**
 * Interactive Multimedia Widgets embedded inside the "What Is Life" Wiki articles:
 * 1. entity-swatches     — Live-animated Canvas2D entity cards
 * 2. platt-game          — Interactive Duke "Monkeys Pay Per View" choice lab
 * 3. gini-playground     — Draggable 6-male baby-distribution Gini calculator
 * 4. handicap-tradeoff   — Zahavi's Handicap / Peacock tail vs. famine slider + live male preview
 * 5. brain-sim           — Exact Platt common-currency utility brain simulator
 * Plus interactive Pop-Quiz handler with warm Teacher-of-the-Year feedback.
 */

import { computeGini } from './genetics.js';
import { ATLAS_EPOCHS, ATLAS_NODES, ATLAS_EDGES } from './tebAtlasData.js';

let activeRafIds = [];

export function cleanupWidgets() {
  for (const id of activeRafIds) cancelAnimationFrame(id);
  activeRafIds = [];
}

export function mountWidgets(container) {
  cleanupWidgets();

  container.querySelectorAll('.widget-mount').forEach((el) => {
    const type = el.dataset.widget;
    if (type === 'entity-swatches') mountEntitySwatches(el);
    else if (type === 'platt-game') mountPlattGame(el);
    else if (type === 'gini-playground') mountGiniPlayground(el);
    else if (type === 'handicap-tradeoff') mountHandicapTradeoff(el);
    else if (type === 'brain-sim') mountBrainSim(el);
    else if (type === 'teb-ladder') mountTebLadder(el);
    else if (type === 'imprinting-tug') mountImprintingTug(el);
    else if (type === 'monogamy-abm') mountMonogamyAbm(el);
    else if (type === 'asr-explorer') mountAsrExplorer(el);
    else if (type === 'teb-atlas') mountTebAtlas(el);
  });

  mountQuizzes(container);
}

/* ============================================================================
 * 1. LIVE-ANIMATED ENTITY SWATCHES
 * ========================================================================== */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawMaleGlyph(ctx, cx, cy, isAlpha, displayVal = 0.72, t = 0) {
  const r = 14;
  ctx.save();
  ctx.translate(cx, cy);

  if (isAlpha) {
    const pulse = 0.65 + 0.35 * Math.sin(t * 0.06);
    ctx.strokeStyle = `rgba(196, 181, 253, ${pulse.toFixed(2)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r + 7, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (displayVal > 0.08) {
    const plumeLen = r + 3 + displayVal * 17;
    const spread = 0.25 + displayVal * 0.45;
    ctx.strokeStyle = `rgba(251, 113, 133, ${(0.45 + displayVal * 0.5).toFixed(2)})`;
    ctx.lineWidth = 1.6 + displayVal * 1.6;
    for (let ray = -2; ray <= 2; ray++) {
      const ang = Math.PI + ray * (spread * 0.52);
      ctx.beginPath();
      ctx.moveTo(-r * 0.65, 0);
      ctx.lineTo(Math.cos(ang) * plumeLen, Math.sin(ang) * plumeLen);
      ctx.stroke();
    }
  }

  ctx.fillStyle = '#7dd3fc';
  ctx.beginPath();
  ctx.moveTo(r + 6.5, 0);
  ctx.lineTo(r - 1, -4);
  ctx.lineTo(r - 1, 4);
  ctx.closePath();
  ctx.fill();

  const s = r * 1.08;
  ctx.fillStyle = '#0284c7';
  ctx.strokeStyle = '#7dd3fc';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(s * 0.92, -s * 0.32);
  ctx.lineTo(s * 0.92, s * 0.38);
  ctx.lineTo(0, s);
  ctx.lineTo(-s * 0.92, s * 0.38);
  ctx.lineTo(-s * 0.92, -s * 0.32);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 17px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('♂', 0, 1);

  if (isAlpha) {
    ctx.save();
    ctx.translate(0, -r - 9.5 + Math.sin(t * 0.08) * 1.2);
    ctx.fillStyle = '#fde047';
    ctx.strokeStyle = '#a16207';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-6.5, 3.5);
    ctx.lineTo(-7.5, -3.5);
    ctx.lineTo(-2.8, 0);
    ctx.lineTo(0, -5.5);
    ctx.lineTo(2.8, 0);
    ctx.lineTo(7.5, -3.5);
    ctx.lineTo(6.5, 3.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.fillStyle = 'rgba(15,23,42,0.85)';
  ctx.fillRect(-10, r + 4.5, 20, 3);
  ctx.fillStyle = '#4ade80';
  ctx.fillRect(-10, r + 4.5, 16, 3);

  ctx.restore();
}

function mountEntitySwatches(el) {
  const items = [
    {
      type: 'male',
      title: '♂ Male (Blue Shield)',
      desc: 'Angular hexagon with upright ♂. Rear coral fan shows his costly display gene; bar below = energy.',
    },
    {
      type: 'alpha',
      title: '♛ Alpha Male (Top 16%)',
      desc: 'Golden crown + violet halo mark top dominance rank. Smart rivals with high w_status yield to him.',
    },
    {
      type: 'female',
      title: '♀ Female (Amber Circle)',
      desc: 'Warm circle with upright ♀. Pulsing golden aura means she is fertile & evaluating arriving suitors.',
    },
    {
      type: 'food',
      title: '🍓 Food / Cherry Juice',
      desc: 'Glossy red berries with green leaves. Eating them fuels survival, speed, displays, and babies.',
    },
    {
      type: 'decoy',
      title: '📺 Supernormal Decoy Screen',
      desc: 'Glowing magenta monitor radiating fake ♀ waves. Captivated males orbit it and bleed red juice!',
    },
    {
      type: 'asexual',
      title: '◎ Asexual Clone',
      desc: 'Emerald cell active in Exp 2 (control). Eats berries and splits in two with zero mating drama.',
    },
  ];

  el.innerHTML = `<div class="swatch-grid">${items
    .map(
      (it) => `
      <div class="swatch-card">
        <canvas class="swatch-cv" data-entity="${it.type}" width="90" height="72"></canvas>
        <div>
          <h4>${it.title}</h4>
          <p>${it.desc}</p>
        </div>
      </div>`
    )
    .join('')}</div>`;

  const canvases = Array.from(el.querySelectorAll('.swatch-cv'));
  let tick = 0;

  function drawFrame() {
    tick++;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const cv of canvases) {
      const w = 90;
      const h = 72;
      if (cv.width !== w * dpr || cv.height !== h * dpr) {
        cv.width = w * dpr;
        cv.height = h * dpr;
        cv.style.width = `${w}px`;
        cv.style.height = `${h}px`;
      }
      const ctx = cv.getContext('2d');
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#080c14';
      ctx.fillRect(0, 0, w, h);

      const type = cv.dataset.entity;
      const cx = w / 2;
      const cy = h / 2;

      if (type === 'male') {
        drawMaleGlyph(ctx, cx + 4, cy, false, 0.72, tick);
      } else if (type === 'alpha') {
        drawMaleGlyph(ctx, cx + 4, cy + 4, true, 0.85, tick);
      } else if (type === 'female') {
        const r = 14;
        const pulse = 0.5 + 0.5 * Math.sin(tick * 0.08);
        ctx.strokeStyle = `rgba(251, 191, 36, ${(0.35 + 0.55 * pulse).toFixed(2)})`;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 5 + pulse * 4, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#d97706';
        ctx.strokeStyle = '#fde68a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fffbeb';
        ctx.font = '800 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('♀', cx, cy + 1);
      } else if (type === 'food') {
        const s = 13.5 * (1 + 0.07 * Math.sin(tick * 0.07));
        ctx.save();
        ctx.translate(cx, cy + 3);
        ctx.fillStyle = 'rgba(255, 59, 92, 0.22)';
        ctx.beginPath();
        ctx.arc(0, 0, s * 1.55, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ff2e55';
        ctx.beginPath();
        ctx.moveTo(0, s * 1.05);
        ctx.bezierCurveTo(-s * 1.15, s * 0.35, -s * 1.05, -s * 0.85, 0, -s * 0.58);
        ctx.bezierCurveTo(s * 1.05, -s * 0.85, s * 1.15, s * 0.35, 0, s * 1.05);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.45);
        ctx.lineTo(-s * 0.72, -s * 0.92);
        ctx.lineTo(-s * 0.22, -s * 0.72);
        ctx.lineTo(0, -s * 1.25);
        ctx.lineTo(s * 0.22, -s * 0.72);
        ctx.lineTo(s * 0.72, -s * 0.92);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#fef08a';
        ctx.fillRect(-5, -2, 2.2, 2.2);
        ctx.fillRect(3, -1, 2.2, 2.2);
        ctx.fillRect(-1, 5, 2.2, 2.2);
        ctx.restore();
      } else if (type === 'decoy') {
        for (let wv = 0; wv < 2; wv++) {
          const p = (tick * 0.018 + wv * 0.5) % 1;
          ctx.strokeStyle = `rgba(232, 121, 249, ${((1 - p) * 0.55).toFixed(2)})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(cx, cy - 2, 16 + p * 18, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = '#240938';
        ctx.strokeStyle = '#f0abfc';
        ctx.lineWidth = 2;
        roundRect(ctx, cx - 18, cy - 14, 36, 24, 5);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#d946ef';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy + 10);
        ctx.lineTo(cx, cy + 16);
        ctx.moveTo(cx - 9, cy + 16);
        ctx.lineTo(cx + 9, cy + 16);
        ctx.stroke();

        const fl = 0.65 + 0.35 * Math.sin(tick * 0.22);
        ctx.fillStyle = `rgba(253, 164, 175, ${fl.toFixed(2)})`;
        ctx.font = '800 15px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('♀', cx, cy - 1);
      } else if (type === 'asexual') {
        const box = 26;
        ctx.fillStyle = '#059669';
        ctx.strokeStyle = '#6ee7b7';
        ctx.lineWidth = 2;
        roundRect(ctx, cx - box / 2, cy - box / 2, box, box, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ecfdf5';
        ctx.font = '700 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('◎', cx, cy + 1);
      }
      ctx.restore();
    }
    activeRafIds.push(requestAnimationFrame(drawFrame));
  }
  activeRafIds.push(requestAnimationFrame(drawFrame));
}

/* ============================================================================
 * 2. PLATT "PAY-PER-VIEW" INTERACTIVE CHOICE EXPLORER
 * ========================================================================== */
function mountPlattGame(el) {
  const scenarios = [
    {
      id: 'female',
      tab: '1. ♀ Fertile Female Cue',
      rightTitle: 'Photo: Female Hindquarters',
      rightIcon: '♀',
      rightAccent: '#fbbf24',
      juiceOffer: '~85% Cherry Juice (illustrative −15% cost)',
      verdict: 'MONKEYS PAID THE JUICE! (+PSE)',
      verdictColor: '#fbbf24',
      explain:
        'Male macaques willingly gave up sweet cherry juice just to look at a brief photo of a fertile female! In nature, spotting reproductive opportunity is worth burning survival calories.',
    },
    {
      id: 'alpha',
      tab: '2. ♛ Alpha Male Face (The Surprise!)',
      rightTitle: 'Photo: High-Status Alpha Male',
      rightIcon: '♛',
      rightAccent: '#a78bfa',
      juiceOffer: '~88% Cherry Juice (illustrative −12% cost)',
      verdict: 'MONKEYS PAID JUICE FOR THIS TOO! (+PSE)',
      verdictColor: '#a78bfa',
      explain:
        'The viral video left this out! Male monkeys ALSO sacrificed cherry juice to view dominant male faces. Why? Knowing who the boss is — and what mood he’s in — prevents fatal fights and reveals coalition politics!',
    },
    {
      id: 'subordinate',
      tab: '3. ♂ Subordinate Male Face',
      rightTitle: 'Photo: Low-Status Subordinate',
      rightIcon: '♂',
      rightAccent: '#94a3b8',
      juiceOffer: '~112% Cherry Juice (illustrative +12% BRIBE!)',
      verdict: 'MONKEYS DEMANDED EXTRA JUICE TO LOOK! (−PSE)',
      verdictColor: '#fb7185',
      explain:
        'Unless the scientists paid them an extra juice bonus, males ignored low-status faces and picked the plain gray square instead! Low-ranking rivals aren’t worth spending attention currency on.',
    },
  ];

  let active = 0;

  function render() {
    const s = scenarios[active];
    el.innerHTML = `
      <div class="widget-box">
        <div class="platt-tabs">
          ${scenarios
            .map(
              (sc, i) =>
                `<button class="w-pill ${i === active ? 'active' : ''}" data-idx="${i}">${sc.tab}</button>`
            )
            .join('')}
        </div>
        <div class="platt-arena">
          <div class="platt-choice">
            <span class="pc-kicker">LOOK LEFT (SAFE BASELINE)</span>
            <div class="pc-screen neutral">◻</div>
            <strong>100% Cherry Juice</strong>
            <small>Plain gray square</small>
          </div>
          <div class="platt-vs">VS</div>
          <div class="platt-choice" style="border-color:${s.rightAccent}">
            <span class="pc-kicker">LOOK RIGHT (SOCIAL CUE)</span>
            <div class="pc-screen" style="border-color:${s.rightAccent};color:${s.rightAccent}">${s.rightIcon}</div>
            <strong style="color:${s.rightAccent}">${s.juiceOffer}</strong>
            <small>${s.rightTitle}</small>
          </div>
        </div>
        <div class="platt-result" style="border-left-color:${s.verdictColor}">
          <strong style="color:${s.verdictColor}">${s.verdict}</strong>
          <p>${s.explain}</p>
        </div>
      </div>
    `;

    el.querySelectorAll('.w-pill').forEach((b) =>
      b.addEventListener('click', () => {
        active = Number(b.dataset.idx);
        render();
      })
    );
  }
  render();
}

/* ============================================================================
 * 3. INTERACTIVE GINI COEFFICIENT PLAYGROUND
 * ========================================================================== */
function mountGiniPlayground(el) {
  let counts = [6, 4, 2, 0, 0, 0];

  const presets = [
    { label: 'Fair Clones (Gini 0.00)', vals: [2, 2, 2, 2, 2, 2] },
    { label: 'Steady Females (Low Gini)', vals: [3, 3, 2, 2, 1, 1] },
    { label: 'Alpha Tournament (High Gini)', vals: [7, 4, 1, 0, 0, 0] },
    { label: 'One King Rules All', vals: [12, 0, 0, 0, 0, 0] },
  ];

  el.innerHTML = `
    <div class="widget-box">
      <div class="gini-presets">
        ${presets.map((p, i) => `<button class="w-pill" data-p="${i}">${p.label}</button>`).join('')}
      </div>
      <div class="gini-sliders-grid" id="gp-sliders"></div>
      <div class="gini-readout">
        <div class="gr-stat"><span>Gini Score</span><strong id="gp-gini">0.00</strong></div>
        <div class="gr-stat"><span>Childless (0)</span><strong id="gp-zero">0%</strong></div>
        <div class="gr-stat"><span>Top Male Share</span><strong id="gp-top">0%</strong></div>
        <div class="gr-stat"><span>Total Babies</span><strong id="gp-sum">12</strong></div>
      </div>
      <div class="gini-teacher" id="gp-comment"></div>
    </div>
  `;

  const slidersWrap = el.querySelector('#gp-sliders');

  function updateStats() {
    const g = computeGini(counts);
    const total = counts.reduce((a, b) => a + b, 0);
    const zeros = counts.filter((v) => v === 0).length;
    const maxVal = Math.max(...counts);
    const topShare = total > 0 ? Math.round((maxVal / total) * 100) : 0;

    el.querySelector('#gp-gini').textContent = g.toFixed(2);
    el.querySelector('#gp-zero').textContent = `${Math.round((zeros / counts.length) * 100)}%`;
    el.querySelector('#gp-top').textContent = `${topShare}%`;
    el.querySelector('#gp-sum').textContent = `${total}`;

    let msg = '';
    if (total === 0) {
      msg = '🧑‍🏫 Nobody had any babies yet — extinction! Drag a slider up to bring the population back.';
    } else if (g < 0.15) {
      msg = '🧑‍🏫 Super equal! Every individual leaves nearly the same number of kids — just like an Asexual Control or low-competition world.';
    } else if (g < 0.42) {
      msg = '🧑‍🏫 Mild inequality — very typical of Females under anisogamy, where almost every healthy adult reproduces at a steady pace.';
    } else if (g < 0.68) {
      msg = '🧑‍🏫 Now sexual selection is heating up! A couple of strong Alphas are pulling ahead while several males leave zero offspring.';
    } else {
      msg = '🧑‍🏫 Extreme winner-take-most tournament! This is why males evolve wild displays, big brains for tracking rivals, and intense mating drive.';
    }
    el.querySelector('#gp-comment').textContent = msg;
  }

  function renderSliders() {
    slidersWrap.innerHTML = counts
      .map(
        (v, i) => `
      <div class="gp-col">
        <div class="gp-bar-wrap">
          <div class="gp-bar" style="height:${Math.min(100, (v / 12) * 100)}%"></div>
        </div>
        <strong class="gp-num">${v}</strong>
        <input type="range" min="0" max="12" value="${v}" data-i="${i}" />
        <span class="gp-lbl">♂ #${i + 1}</span>
      </div>`
      )
      .join('');

    slidersWrap.querySelectorAll('input').forEach((inp) => {
      inp.addEventListener('input', () => {
        const idx = Number(inp.dataset.i);
        counts[idx] = Number(inp.value);
        const col = inp.closest('.gp-col');
        col.querySelector('.gp-num').textContent = `${counts[idx]}`;
        col.querySelector('.gp-bar').style.height = `${Math.min(100, (counts[idx] / 12) * 100)}%`;
        updateStats();
      });
    });
    updateStats();
  }

  el.querySelectorAll('[data-p]').forEach((btn) =>
    btn.addEventListener('click', () => {
      counts = presets[Number(btn.dataset.p)].vals.slice();
      renderSliders();
    })
  );

  renderSliders();
}

/* ============================================================================
 * 4. ZAHAVI HANDICAP / PEACOCK TAIL TRADE-OFF WIDGET
 * ========================================================================== */
function mountHandicapTradeoff(el) {
  el.innerHTML = `
    <div class="widget-box handicap-grid">
      <div class="hc-left">
        <canvas id="hc-canvas" width="150" height="120"></canvas>
        <label class="hc-slider-lbl">
          <span>Tail Display Gene: <strong id="hc-val">55%</strong></span>
          <input type="range" id="hc-range" min="5" max="99" value="55" />
        </label>
        <label class="d-check" style="font-size:12.5px">
          <input type="checkbox" id="hc-famine" /> Simulate Famine (Half Food!)
        </label>
      </div>
      <div class="hc-right">
        <div class="hc-bar-row"><span>♀ Female Approval</span><div class="wbar"><div id="hc-attract" class="wbar-fill amber"></div></div><strong id="hc-attract-v">0%</strong></div>
        <div class="hc-bar-row"><span>🔥 Metabolic Burn</span><div class="wbar"><div id="hc-burn" class="wbar-fill crimson"></div></div><strong id="hc-burn-v">0%</strong></div>
        <div class="hc-bar-row"><span>🧬 Net Fitness Score</span><div class="wbar"><div id="hc-fit" class="wbar-fill emerald"></div></div><strong id="hc-fit-v">0</strong></div>
        <div id="hc-note" class="hc-note"></div>
      </div>
    </div>
  `;

  const cv = el.querySelector('#hc-canvas');
  const range = el.querySelector('#hc-range');
  const famineCb = el.querySelector('#hc-famine');

  function update() {
    const d = Number(range.value) / 100;
    const famine = famineCb.checked;
    el.querySelector('#hc-val').textContent = `${Math.round(d * 100)}%`;

    // Draw live male with dynamic tail size
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = 150 * dpr;
    cv.height = 120 * dpr;
    cv.style.width = '150px';
    cv.style.height = '120px';
    const ctx = cv.getContext('2d');
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, 0, 150, 120);
    drawMaleGlyph(ctx, 88, 60, d > 0.78 && !famine, d, 0);
    ctx.restore();

    const attract = Math.min(98, Math.round(12 + d * 88));
    const burn = Math.min(100, Math.round((15 + Math.pow(d, 1.35) * 72) * (famine ? 1.45 : 1)));
    const survival = Math.max(0.05, 1 - burn / 118);
    const fitness = Math.round(attract * survival);

    el.querySelector('#hc-attract').style.width = `${attract}%`;
    el.querySelector('#hc-attract-v').textContent = `${attract}%`;
    el.querySelector('#hc-burn').style.width = `${burn}%`;
    el.querySelector('#hc-burn-v').textContent = `${burn}%`;
    el.querySelector('#hc-fit').style.width = `${Math.min(100, fitness * 1.4)}%`;
    el.querySelector('#hc-fit-v').textContent = `${fitness}`;

    let note = '';
    if (d < 0.25) {
      note = 'Too plain! He saves tons of calories and lives long, but choosy females swipe left.';
    } else if (famine && d > 0.65) {
      note = '☠️ Survival Cliff! During a famine, that gorgeous massive plume drains his cherry juice before he can even find a mate.';
    } else if (d > 0.82) {
      note = '🦚 Peacock Zone! Super attractive to females, but living right on the razor edge of starvation.';
    } else {
      note = '✨ Sweet Spot! Impressive enough to pass female inspection while keeping enough energy left to survive.';
    }
    el.querySelector('#hc-note').textContent = note;
  }

  range.addEventListener('input', update);
  famineCb.addEventListener('change', update);
  update();
}

/* ============================================================================
 * 5. INTERACTIVE PLATT COMMON-CURRENCY MALE BRAIN SIMULATOR
 * ========================================================================== */
function mountBrainSim(el) {
  el.innerHTML = `
    <div class="widget-box brain-grid">
      <div class="brain-controls">
        <label class="d-slider">
          <div class="ds-head"><span>🍓 Cherry Juice (Energy)</span><strong id="bs-lbl-e">70 / 140</strong></div>
          <input type="range" id="bs-e" min="10" max="135" value="70" />
        </label>
        <label class="d-slider">
          <div class="ds-head"><span><code>w_mate</code> — Mating Drive</span><strong id="bs-lbl-m">78%</strong></div>
          <input type="range" id="bs-m" min="5" max="98" value="78" />
        </label>
        <label class="d-slider">
          <div class="ds-head"><span><code>w_status</code> — Rival Tracking</span><strong id="bs-lbl-s">55%</strong></div>
          <input type="range" id="bs-s" min="5" max="98" value="55" />
        </label>
        <label class="d-slider">
          <div class="ds-head"><span><code>discernment</code> — Fake Filter</span><strong id="bs-lbl-d">12%</strong></div>
          <input type="range" id="bs-d" min="2" max="98" value="12" />
        </label>
        <div class="bs-checks">
          <label class="d-check"><input type="checkbox" id="bs-decoy" checked /> 📺 Supernormal Decoy Nearby</label>
          <label class="d-check"><input type="checkbox" id="bs-alpha" /> ♛ Stronger Alpha Nearby</label>
        </div>
      </div>

      <div class="brain-right">
        <div id="bs-bars" class="bs-bars"></div>
        <div id="bs-verdict" class="verdict-box">
          <span class="verdict-kicker">WINNING CHOICE THIS TICK</span>
          <strong id="bs-title">—</strong>
          <p id="bs-explain">—</p>
        </div>
        <div class="bs-archs">
          <button class="w-pill" data-arch="scrolling">Scrolling at 2 AM (Trapped)</button>
          <button class="w-pill" data-arch="smart">Saw Through the Fake</button>
          <button class="w-pill" data-arch="hungry">Way Too Hungry</button>
          <button class="w-pill" data-arch="tactician">Alpha-Smart Strategist</button>
        </div>
      </div>
    </div>
  `;

  const eEl = el.querySelector('#bs-e');
  const mEl = el.querySelector('#bs-m');
  const sEl = el.querySelector('#bs-s');
  const dEl = el.querySelector('#bs-d');
  const decoyEl = el.querySelector('#bs-decoy');
  const alphaEl = el.querySelector('#bs-alpha');

  function update() {
    const energy = Number(eEl.value);
    const wMate = Number(mEl.value) / 100;
    const wStatus = Number(sEl.value) / 100;
    const discern = Number(dEl.value) / 100;
    const hasDecoy = decoyEl.checked;
    const hasAlpha = alphaEl.checked;

    el.querySelector('#bs-lbl-e').textContent = `${energy} / 140`;
    el.querySelector('#bs-lbl-m').textContent = `${Math.round(wMate * 100)}%`;
    el.querySelector('#bs-lbl-s').textContent = `${Math.round(wStatus * 100)}%`;
    el.querySelector('#bs-lbl-d').textContent = `${Math.round(discern * 100)}%`;

    const hunger = Math.max(0.08, Math.min(1.35, 1.18 - energy / 118));
    const uFood = (hunger * 1.65) / (60 / 55 + 0.55);
    const uFemale = energy >= 30 ? (wMate * 2.85) / (75 / 64 + 0.42) : 0;
    const perceivedSalience = 2.6 * Math.max(0.03, Math.pow(1 - discern, 1.45));
    const uDecoy = hasDecoy ? (wMate * perceivedSalience * 2.65) / (85 / 85 + 0.38) : 0;
    const uRival = hasAlpha ? (wStatus * 2.4) / (40 / 40 + 0.35) : 0;

    const maxU = Math.max(2.6, uFood, uFemale, uDecoy, uRival);
    const rows = [
      { label: '🍓 Cherry Juice', val: uFood, color: '#ff3b5c' },
      { label: '♀ Fertile Female', val: uFemale, color: '#fbbf24' },
      { label: '♛ Alpha Rival', val: uRival, color: '#a78bfa' },
      { label: '📺 Pixel Decoy', val: uDecoy, color: '#e879f9' },
    ];

    el.querySelector('#bs-bars').innerHTML = rows
      .map(
        (r) => `
      <div class="hc-bar-row">
        <span>${r.label}</span>
        <div class="wbar"><div class="wbar-fill" style="width:${Math.min(100, (r.val / maxU) * 100).toFixed(1)}%;background:${r.color}"></div></div>
        <strong style="color:${r.color}">${r.val.toFixed(2)}</strong>
      </div>`
      )
      .join('');

    const vBox = el.querySelector('#bs-verdict');
    const title = el.querySelector('#bs-title');
    const explain = el.querySelector('#bs-explain');

    if (hasAlpha && wStatus > 0.35 && uRival > Math.max(uFood, uFemale) * 0.62) {
      vBox.style.borderLeftColor = '#a78bfa';
      title.style.color = '#c4b5fd';
      title.textContent = 'DODGE THE ALPHA RIVAL';
      explain.textContent =
        'Street-smart move! His high w_status spotted a stronger Alpha and steered away before getting smashed in a losing fight.';
    } else if (hasDecoy && uDecoy > uFood && uDecoy >= uFemale * 0.92) {
      vBox.style.borderLeftColor = '#e879f9';
      title.style.color = '#f0abfc';
      title.textContent = 'HYPNOTIZED BY THE DECOY SCREEN!';
      explain.textContent =
        'Hook, line, and sinker. High mating drive + weak discernment made the glowing pixels outscore real food AND real females — bleeding his cherry juice for zero babies.';
    } else if (uFemale > uFood) {
      vBox.style.borderLeftColor = '#fbbf24';
      title.style.color = '#fde047';
      title.textContent = 'CHASE THE REAL FERTILE FEMALE';
      explain.textContent =
        'He has enough juice in the tank (and ignored any fake screens), so he sprints toward real reproductive payoff!';
    } else {
      vBox.style.borderLeftColor = '#ff3b5c';
      title.style.color = '#fda4af';
      title.textContent = 'EAT BERRIES (SURVIVAL FIRST)';
      explain.textContent =
        'Hunger wins the scoreboard right now. Refilling his energy tank keeps him alive and restores his future dominance.';
    }
  }

  [eEl, mEl, sEl, dEl, decoyEl, alphaEl].forEach((x) => x.addEventListener('input', update));

  const archs = {
    scrolling: { e: 75, m: 84, s: 50, d: 10, decoy: true, alpha: false },
    smart: { e: 75, m: 80, s: 60, d: 78, decoy: true, alpha: false },
    hungry: { e: 16, m: 68, s: 45, d: 18, decoy: true, alpha: false },
    tactician: { e: 82, m: 70, s: 85, d: 60, decoy: false, alpha: true },
  };
  el.querySelectorAll('[data-arch]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const a = archs[btn.dataset.arch];
      eEl.value = a.e;
      mEl.value = a.m;
      sEl.value = a.s;
      dEl.value = a.d;
      decoyEl.checked = a.decoy;
      alphaEl.checked = a.alpha;
      update();
    })
  );

  update();
}

/* ============================================================================
 * 6. TEB INTERACTIVE WIDGETS (LADDER, IMPRINTING TUG-OF-WAR, MONOGAMY ABM)
 * ========================================================================== */
function mountTebLadder(el) {
  const tebs = [
    {
      id: 'sex',
      num: 'TEB 1',
      name: 'Asexual → Sexual Reproduction',
      status: '✓ EMERGENT & VERIFIED on Main (Genesis Lab + Negative Control 1)',
      advantage: 'Recombining DNA across lineages outruns fast-evolving parasites and combines good mutations faster than solo clonal branching.',
      jump: 'Unlocks genetic diversity, two-parent recombination, and eventually specialized sexes & mate competition.',
      needed: 'LIVE IN GENESIS LAB (/): Co-evolving 8-bit lock-and-key parasites + evolvable recombine gene competing against asexual clones under true two-fold energy conservation.',
      falsify: 'VERIFIED BY NEGATIVE CONTROL 1: With parasites OFF, clones crush sexuals (<15%). With parasites ON (Exp 1), sexual recombination surges to ~80%+ and Shannon immune diversity expands!',
      page: 'genesis-lab',
    },
    {
      id: 'oogamy',
      num: 'TEB 2',
      name: 'Isogamy → Anisogamy → Two Sexes',
      status: '✓ EMERGENT & VERIFIED on Main (Zero Hard-Coded M/F + Negative Control 2)',
      advantage: 'Disruptive selection on gamete size vs. number: tiny mobile gametes maximize search encounters; huge nutrient-rich gametes maximize zygote survival.',
      jump: 'Spontaneously invents two distinct biological sexes (egg-makers vs. sperm-makers) from one symmetric 0.50 starting population.',
      needed: 'LIVE IN GENESIS LAB (/): Zero M/F labels; continuous gameteSize gene starting at 0.50, fixed budget count(s), superlinear yolk survival S(Y), and segregating gamete-size inheritance.',
      falsify: 'VERIFIED BY NEGATIVE CONTROL 2: At K=0.49 (Exp 2), 0.50 isogamy Y-forks into ~45% Micro + ~45% Macro (bifurcation > 0.60). At K=0.015 (Exp 4), ocean stays ~97% small isogamy — zero split!',
      page: 'genesis-lab',
    },
    {
      id: 'provisioning',
      num: 'TEB 3',
      name: 'Eggs → Maternal Provisioning & Imprinting',
      status: 'Not yet modeled (post-fertilization transfer needed)',
      advantage: 'Supplying nutrients AFTER fertilization (placenta/lactation) produces larger, more competitive babies without requiring massive pre-laid eggs.',
      jump: 'Sparks an intra-genomic tug-of-war (David Haig): paternal genes pull for more maternal energy while maternal genes restrain — evolving genomic imprinting and locking out parthenogenesis!',
      needed: 'Track separate maternal vs. paternal alleles for an embryo "demand" gene, plus ongoing energy transfer during gestation that trades off against the mother’s survival for future litters.',
      falsify: 'Imprinting asymmetry (paternal demand > maternal demand) should emerge ONLY under ongoing post-fertilization provisioning + multiple paternity, and vanish in strict egg-layers or strict lifelong monogamy.',
      page: 'teb-provisioning',
    },
    {
      id: 'monogamy',
      num: 'TEB 4',
      name: 'Social Monogamy & Mate Guarding',
      status: 'Ready to prototype next (Gomes et al., 2018 blueprint)',
      advantage: 'When receptive females are scarce (male-biased ASR) or far apart (high dispersion), guarding one partner guarantees paternity better than wandering empty space.',
      jump: 'Shifts males from pure tournament rivalry into pair-living, territorial defense, and eventually biparental care.',
      needed: 'Add an evolvable "guard_tendency" gene, tunable Adult Sex Ratio (ASR), adjustable female territory spacing, breeding-season length, and extra-pair copulation (EPC) leakage.',
      falsify: 'Reproduce Gomes et al. (2018): monogamy should dominate under male-biased ASR + efficient guarding, collapse under female-biased ASR, and track female dispersion when EPC leaks.',
      page: 'teb-monogamy',
    },
    {
      id: 'ovulation',
      num: 'TEB 5',
      name: 'Concealed Ovulation',
      status: 'Currently females broadcast bright golden receptivity rings',
      advantage: 'Hiding the exact fertile window may confuse paternity (deterring male infanticide) or force males to stick around longer to secure paternity.',
      jump: 'Replaces short, frantic fertile-window scrambles with extended courtship, longer pair-bonds, and complex social negotiation.',
      needed: 'Make the female fertility ring’s visibility an evolvable gene ("signal_strength": 0→1) AND introduce either male infanticide risk or male mate-guarding/care benefits.',
      falsify: 'Compare which ecology actually drives signal_strength → 0: does hiding ovulation evolve under infanticide risk, under male-care incentives, or fail to evolve when males simply ignore silent females?',
      page: 'teb-concealed-ovulation',
    },
    {
      id: 'sex_ratios',
      num: 'TEB 6',
      name: 'Adult Sex Ratio (ASR) Allocation & Sex Change',
      status: 'Birth ratio hard-coded 50/50 today (target: emergent ASR & sex change)',
      advantage: 'Via the Fisher condition, the rarer sex averages k× more offspring — rewarding parents who bias offspring sex OR adults who socially change sex (clownfish, wrasses, gobies) when local ASR skews!',
      jump: 'Turns sex ratio from a fixed background constant into a living demographic feedback loop linking mortality, climate/temperature (ESD), parental care, mating systems, and population viability.',
      needed: 'Add an evolvable "son_ratio" gene, differential sex mortality / harassment, optional environmental sex determination (ESD), and a costly local-ASR-triggered sex-change gene (protandry/protogyny).',
      falsify: 'Test Fisher’s Equal Allocation: perturb ASR to 20% or 80% male and verify selection pulls birth allocation back toward parity — OR shifts toward the "cheaper" sex when raising one sex costs less energy!',
      page: 'teb-sex-ratios',
    },
  ];

  let active = 0;

  function render() {
    const t = tebs[active];
    el.innerHTML = `
      <div class="widget-box">
        <div class="platt-tabs">
          ${tebs
            .map(
              (item, i) =>
                `<button class="w-pill ${i === active ? 'active' : ''}" data-ti="${i}">${item.num}: ${item.name.split('→').pop().trim()}</button>`
            )
            .join('')}
        </div>
        <div class="teb-detail">
          <div class="teb-detail-head">
            <h4>${t.num} · ${t.name}</h4>
            <span class="teb-status">${t.status}</span>
          </div>
          <div class="teb-grid">
            <div class="teb-cell"><span>Competitive Advantage</span><p>${t.advantage}</p></div>
            <div class="teb-cell"><span>Jump in Complexity</span><p>${t.jump}</p></div>
            <div class="teb-cell"><span>Minimal Simulator Rules Needed</span><p>${t.needed}</p></div>
            <div class="teb-cell"><span>How We Test Real Emergence</span><p>${t.falsify}</p></div>
          </div>
        </div>
      </div>
    `;
    el.querySelectorAll('[data-ti]').forEach((b) =>
      b.addEventListener('click', () => {
        active = Number(b.dataset.ti);
        render();
      })
    );
  }
  render();
}

function mountImprintingTug(el) {
  el.innerHTML = `
    <div class="widget-box">
      <div class="tug-mode-row">
        <button class="w-pill active" data-tmode="placenta">🤰 Placental Provisioning (Live Tug-of-War)</button>
        <button class="w-pill" data-tmode="egg">🥚 Fixed Egg Yolk (No Post-Fertilization Control)</button>
        <button class="w-pill" data-tmode="partheno">🧬 2× Maternal Genomes (Mammal Parthenogenesis Test)</button>
      </div>

      <div class="brain-grid">
        <div class="brain-controls">
          <label class="d-slider">
            <div class="ds-head"><span>♂ Paternal Allele ("Extract Nutrients!")</span><strong id="tug-p-lbl">78%</strong></div>
            <input type="range" id="tug-p" min="0" max="100" value="78" />
          </label>
          <label class="d-slider">
            <div class="ds-head"><span>♀ Maternal Allele ("Restrain &amp; Save for Future Kids")</span><strong id="tug-m-lbl">68%</strong></div>
            <input type="range" id="tug-m" min="0" max="100" value="68" />
          </label>
        </div>

        <div class="brain-right">
          <div class="hc-bar-row"><span>🍼 Baby Nutrient Pull</span><div class="wbar"><div id="tug-pull-bar" class="wbar-fill amber"></div></div><strong id="tug-pull-v">0%</strong></div>
          <div class="hc-bar-row"><span>♀ Mother Reserve Left</span><div class="wbar"><div id="tug-mom-bar" class="wbar-fill emerald"></div></div><strong id="tug-mom-v">0%</strong></div>
          <div class="hc-bar-row"><span>⚡ Intra-Genomic Conflict</span><div class="wbar"><div id="tug-conf-bar" class="wbar-fill crimson"></div></div><strong id="tug-conf-v">0%</strong></div>
          <div id="tug-verdict" class="verdict-box">
            <span class="verdict-kicker">EVOLUTIONARY OUTCOME</span>
            <strong id="tug-title">—</strong>
            <p id="tug-explain">—</p>
          </div>
        </div>
      </div>
    </div>
  `;

  let mode = 'placenta';
  const pEl = el.querySelector('#tug-p');
  const mEl = el.querySelector('#tug-m');

  function update() {
    const p = Number(pEl.value);
    const m = Number(mEl.value);
    el.querySelector('#tug-p-lbl').textContent = `${p}%`;
    el.querySelector('#tug-m-lbl').textContent = `${m}%`;

    let pull = 50;
    let momReserve = 50;
    let conflict = 0;
    let title = '';
    let explain = '';
    let border = '#38bdf8';

    if (mode === 'egg') {
      pull = 50;
      momReserve = 68;
      conflict = 6;
      border = '#34d399';
      title = 'FIXED YOLK PACKAGE · NO TUG-OF-WAR';
      explain =
        'Once an egg is laid (birds, reptiles), the embryo cannot negotiate for extra glucose from mom! Selection for opposing paternal/maternal imprints stays weak or absent.';
    } else if (mode === 'partheno') {
      pull = Math.max(8, Math.round(52 - m * 0.55));
      momReserve = 90;
      conflict = 92;
      border = '#ff3b5c';
      title = 'EMBRYO GROWTH COLLAPSE (DEVELOPMENTAL LOCK-IN!)';
      explain =
        'Two maternal genomes = double growth-restraint and ZERO paternal growth-promoting signals! The placenta fails to form properly — explaining why placental mammals cannot pull off viable parthenogenesis, whereas many egg-laying reptiles and birds can.';
    } else {
      pull = Math.max(10, Math.min(98, Math.round(50 + (p - m) * 0.65)));
      momReserve = Math.max(5, Math.min(96, Math.round(100 - pull * 0.88)));
      conflict = Math.round(Math.min(100, (p + m) * 0.55));

      if (pull > 76) {
        border = '#fb7185';
        title = 'OVER-EXTRACTION · MOTHER DEPLETED';
        explain =
          'Paternal growth push overpowered maternal restraint! This baby is huge, but the mother burns out and loses future litters — creating fierce selection for stronger maternal restraint.';
      } else if (pull < 32) {
        border = '#fbbf24';
        title = 'UNDER-PROVISIONED · SMALL OFFSPRING';
        explain =
          'Maternal restraint dominated. The mother stays healthy for future broods, but this baby is undersized — creating selection for stronger paternal extraction alleles.';
      } else {
        border = '#a78bfa';
        title = 'TENSE EQUILIBRIUM (HAIG’S IMPRINTING STANDOFF)';
        explain =
          'Both alleles are pulling HARD in opposite directions (just like mammalian placentas and the live-bearing fish Poeciliopsis prolifica!), landing on a balanced baby size only because both sides cancel out!';
      }
    }

    el.querySelector('#tug-pull-bar').style.width = `${pull}%`;
    el.querySelector('#tug-pull-v').textContent = `${pull}%`;
    el.querySelector('#tug-mom-bar').style.width = `${momReserve}%`;
    el.querySelector('#tug-mom-v').textContent = `${momReserve}%`;
    el.querySelector('#tug-conf-bar').style.width = `${conflict}%`;
    el.querySelector('#tug-conf-v').textContent = `${conflict}%`;
    el.querySelector('#tug-verdict').style.borderLeftColor = border;
    el.querySelector('#tug-title').style.color = border;
    el.querySelector('#tug-title').textContent = title;
    el.querySelector('#tug-explain').textContent = explain;
  }

  el.querySelectorAll('[data-tmode]').forEach((b) =>
    b.addEventListener('click', () => {
      mode = b.dataset.tmode;
      el.querySelectorAll('[data-tmode]').forEach((x) => x.classList.toggle('active', x === b));
      pEl.disabled = mode !== 'placenta';
      update();
    })
  );
  pEl.addEventListener('input', update);
  mEl.addEventListener('input', update);
  update();
}

function mountMonogamyAbm(el) {
  el.innerHTML = `
    <div class="widget-box brain-grid">
      <div class="brain-controls">
        <label class="d-slider">
          <div class="ds-head"><span>♂ Adult Sex Ratio (ASR: % Males)</span><strong id="ma-asr-lbl">50% (Equal)</strong></div>
          <input type="range" id="ma-asr" min="43" max="56" step="1" value="50" />
        </label>
        <label class="d-slider">
          <div class="ds-head"><span>📍 Female Dispersion (Spacing)</span><strong id="ma-disp-lbl">20 patches</strong></div>
          <input type="range" id="ma-disp" min="5" max="35" step="5" value="20" />
        </label>
        <label class="d-slider">
          <div class="ds-head"><span>⏱ Breeding Season Duration</span><strong id="ma-seas-lbl">400 ticks</strong></div>
          <input type="range" id="ma-seas" min="200" max="800" step="100" value="400" />
        </label>
        <div class="bs-checks">
          <label class="d-check"><input type="checkbox" id="ma-guard" checked /> 🛡️ Efficient Mate Guarding (No Extra-Pair Copulation)</label>
        </div>
        <div class="bs-archs">
          <button class="w-pill" data-mp="male_biased">Male-Biased + Guarding</button>
          <button class="w-pill" data-mp="female_biased">Female-Biased (Polygamy)</button>
          <button class="w-pill" data-mp="epc_dispersed">EPC Leaks + High Dispersion</button>
        </div>
      </div>

      <div class="brain-right">
        <div class="hc-bar-row"><span>💑 Predicted Monogamy</span><div class="wbar"><div id="ma-mono-bar" class="wbar-fill emerald"></div></div><strong id="ma-mono-v">0%</strong></div>
        <div class="hc-bar-row"><span>🏃 Wandering Polygamy</span><div class="wbar"><div id="ma-poly-bar" class="wbar-fill amber"></div></div><strong id="ma-poly-v">0%</strong></div>
        <div id="ma-verdict" class="verdict-box">
          <span class="verdict-kicker">GOMES ET AL. (2018) ABM PREDICTION</span>
          <strong id="ma-title">—</strong>
          <p id="ma-explain">—</p>
        </div>
        <div class="hc-note" style="font-size:11.8px">
          Normalized regression weights from Gomes et al. (2018), Table 3 (<em>R²</em> = 0.53 full / 0.78 fixed refractory): <strong>ASR (+0.59)</strong> &gt; <strong>Dispersion (+0.29)</strong> &gt; <strong>Season (−0.22)</strong> &gt; <strong>EPC (−0.15)</strong>.
        </div>
      </div>
    </div>
  `;

  const asrEl = el.querySelector('#ma-asr');
  const dispEl = el.querySelector('#ma-disp');
  const seasEl = el.querySelector('#ma-seas');
  const guardEl = el.querySelector('#ma-guard');

  function update() {
    const asr = Number(asrEl.value); // 43..56
    const disp = Number(dispEl.value); // 5..35
    const seas = Number(seasEl.value); // 200..800
    const guard = guardEl.checked;

    const asrTag = asr < 48 ? 'Female-Biased' : asr > 52 ? 'Male-Biased' : 'Balanced';
    el.querySelector('#ma-asr-lbl').textContent = `${asr}% (${asrTag})`;
    el.querySelector('#ma-disp-lbl').textContent = `${disp} patches`;
    el.querySelector('#ma-seas-lbl').textContent = `${seas} ticks`;

    // Normalized [0..1] predictors mirroring Gomes et al. (2018) Table 3 + Fig. 1 interactions
    const nAsr = (asr - 43) / (56 - 43);
    const nDisp = (disp - 5) / (35 - 5);
    const nSeas = (seas - 200) / (800 - 200);
    const epc = guard ? 0 : 1;

    // Linear-plus-interaction response faithfully reflecting Fig. 1 patterns
    let score = 0.24 + 0.59 * nAsr + 0.29 * nDisp - 0.22 * nSeas - 0.20 * epc;
    if (guard && asr >= 53) score += 0.16; // Strong ceiling near ~90% when male-biased + efficient guarding
    if (epc && asr >= 53) score += 0.14 * (nDisp - 0.5); // Dispersion dominates when EPC leaks
    if (asr <= 45 && seas >= 600) score -= 0.14; // Long seasons + female surplus strongly favor polygamy

    const monoPct = Math.round(Math.max(4, Math.min(96, score * 100)));
    const polyPct = 100 - monoPct;

    el.querySelector('#ma-mono-bar').style.width = `${monoPct}%`;
    el.querySelector('#ma-mono-v').textContent = `${monoPct}%`;
    el.querySelector('#ma-poly-bar').style.width = `${polyPct}%`;
    el.querySelector('#ma-poly-v').textContent = `${polyPct}%`;

    const vBox = el.querySelector('#ma-verdict');
    const title = el.querySelector('#ma-title');
    const explain = el.querySelector('#ma-explain');

    if (monoPct >= 65) {
      vBox.style.borderLeftColor = '#34d399';
      title.style.color = '#6ee7b7';
      title.textContent = 'SOCIAL MONOGAMY DOMINATES';
      explain.textContent = guard
        ? 'Receptive females are scarce or widely spaced, and guarding prevents extra-pair copulation — staying with one partner beats gambling on finding another.'
        : 'Even with leaky mate guarding, high female dispersion and/or short seasons make wandering too costly to beat staying put.';
    } else if (monoPct <= 38) {
      vBox.style.borderLeftColor = '#fbbf24';
      title.style.color = '#fde047';
      title.textContent = 'WANDERING POLYGAMY DOMINATES';
      explain.textContent =
        'Plentiful females, long breeding seasons, or frequent extra-pair copulations let wandering males out-reproduce guarders who sit beside one pregnant female.';
    } else {
      vBox.style.borderLeftColor = '#38bdf8';
      title.style.color = '#7dd3fc';
      title.textContent = 'CONTESTED TRANSITION ZONE';
      explain.textContent =
        'Both strategies remain competitive! Notice how sensitive this boundary is to female spacing and whether mate guarding actually blocks extra-pair copulation.';
    }
  }

  [asrEl, dispEl, seasEl, guardEl].forEach((x) => x.addEventListener('input', update));
  const presets = {
    male_biased: { asr: 56, disp: 20, seas: 300, guard: true },
    female_biased: { asr: 43, disp: 10, seas: 700, guard: true },
    epc_dispersed: { asr: 55, disp: 35, seas: 200, guard: false },
  };
  el.querySelectorAll('[data-mp]').forEach((b) =>
    b.addEventListener('click', () => {
      const p = presets[b.dataset.mp];
      asrEl.value = p.asr;
      dispEl.value = p.disp;
      seasEl.value = p.seas;
      guardEl.checked = p.guard;
      update();
    })
  );
  update();
}

function mountAsrExplorer(el) {
  el.innerHTML = `
    <div class="widget-box">
      <label class="d-slider">
        <div class="ds-head">
          <span>Adult Sex Ratio (ASR = Proportion of Adult Males)</span>
          <strong id="asr-val-lbl">50% Male (Balanced 1:1)</strong>
        </div>
        <input type="range" id="asr-slider" min="15" max="85" step="1" value="50" />
      </label>

      <div class="bs-archs">
        <button class="w-pill" data-asrv="25">25% ♂ (Mountain Gorilla / Polygyny)</button>
        <button class="w-pill" data-asrv="52">52% ♂ (Laysan Albatross / Monogamy)</button>
        <button class="w-pill" data-asrv="78">78% ♂ (African Jacana / Sex-Role Reversal)</button>
      </div>

      <div class="gini-readout">
        <div class="gr-stat"><span>Rarer Sex Payoff (Fisher)</span><strong id="asr-fisher">1.0×</strong></div>
        <div class="gr-stat"><span>Dominant Mating System</span><strong id="asr-sys" style="font-size:13.5px">—</strong></div>
        <div class="gr-stat"><span>Predicted Care Bias</span><strong id="asr-care" style="font-size:13.5px">—</strong></div>
        <div class="gr-stat"><span>Male Size Dimorphism</span><strong id="asr-dim" style="font-size:13.5px">—</strong></div>
      </div>

      <div id="asr-verdict" class="verdict-box">
        <span class="verdict-kicker" id="asr-anchor">REAL-WORLD ANCHOR (SCHACHT ET AL., 2022)</span>
        <strong id="asr-title">—</strong>
        <p id="asr-explain">—</p>
      </div>
    </div>
  `;

  const slider = el.querySelector('#asr-slider');

  function update() {
    const pct = Number(slider.value);
    const p = pct / 100;
    const rarerMultiplier = p >= 0.5 ? p / (1 - p) : (1 - p) / p;
    const rarerSex = p > 50 / 100 ? '♀ Females' : p < 50 / 100 ? '♂ Males' : 'Equal';

    const tag = pct < 42 ? 'Female-Skewed' : pct > 58 ? 'Male-Skewed' : 'Near Parity';
    el.querySelector('#asr-val-lbl').textContent = `${pct}% Male (${tag})`;
    el.querySelector('#asr-fisher').textContent =
      pct === 50 ? '1.0× (Tie)' : `${rarerMultiplier.toFixed(1)}× (${rarerSex})`;

    const vBox = el.querySelector('#asr-verdict');
    const title = el.querySelector('#asr-title');
    const explain = el.querySelector('#asr-explain');

    if (pct < 42) {
      el.querySelector('#asr-sys').textContent = 'Polygyny';
      el.querySelector('#asr-care').textContent = 'Female-biased';
      el.querySelector('#asr-dim').textContent = 'HIGHEST (♂ > ♀)';
      vBox.style.borderLeftColor = '#fbbf24';
      title.style.color = '#fde047';
      title.textContent = 'FEMALE EXCESS → POLYGYNY & PEAK MALE SKEW (Surprising Darwin!)';
      explain.textContent =
        'Contrary to Darwin’s 1871 guess, birds & mammals show the LARGEST male size dimorphism and male reproductive skew here (e.g. mountain gorillas). Because each male averages >1 mate, top males can monopolize harems while abandoning parental care. In humans: more female-headed households & short-term concurrency.';
    } else if (pct <= 58) {
      el.querySelector('#asr-sys').textContent = 'Monogamy';
      el.querySelector('#asr-care').textContent = 'Biparental';
      el.querySelector('#asr-dim').textContent = 'Moderate / Low';
      vBox.style.borderLeftColor = '#34d399';
      title.style.color = '#6ee7b7';
      title.textContent = 'EVEN TO SLIGHT MALE EXCESS → MONOGAMY & BIPARENTAL CARE';
      explain.textContent =
        'Characteristic of pair-living species like Laysan albatrosses. Balanced ratios maximize population growth in monogamous species. With slight male excess, females gain bargaining power and males commit more to pair-bonds and care.';
    } else {
      el.querySelector('#asr-sys').textContent = 'Polyandry / Reversal';
      el.querySelector('#asr-care').textContent = 'Male-biased';
      el.querySelector('#asr-dim').textContent = 'Reversed (♀ > ♂)';
      vBox.style.borderLeftColor = '#a78bfa';
      title.style.color = '#c4b5fd';
      title.textContent = 'STRONG MALE EXCESS → MALE CARE, POLYANDRY & HARASSMENT RISK';
      explain.textContent =
        'When males far outnumber females, females become very choosy, divorce/switch partners faster (e.g. Schistosoma parasites), and sex-role reversal emerges (e.g. African jacana where larger females compete for caring males). Danger zone: excess male harassment can kill females and crash population growth (e.g. Hermann’s tortoise)!';
    }
  }

  slider.addEventListener('input', update);
  el.querySelectorAll('[data-asrv]').forEach((b) =>
    b.addEventListener('click', () => {
      slider.value = b.dataset.asrv;
      update();
    })
  );
  update();
}

/* ============================================================================
 * 7. INTERACTIVE TEB ATLAS (SVG DEPENDENCY GRAPH: PROKARYOTE -> HUMAN)
 * ========================================================================== */
function mountTebAtlas(el) {
  const nodeMap = new Map(ATLAS_NODES.map((n) => [n.id, n]));
  let selectedId = 'sex_meiosis';
  let activeLens = 'all';
  let zoomPct = 100;

  // Compute full upstream ancestor set + direct downstream children for any node
  function getDependencySets(id) {
    const upstream = new Set();
    const queue = [id];
    while (queue.length > 0) {
      const cur = queue.shift();
      for (const e of ATLAS_EDGES) {
        if (e.to === cur && !upstream.has(e.from)) {
          upstream.add(e.from);
          queue.push(e.from);
        }
      }
    }
    const downstream = new Set();
    for (const e of ATLAS_EDGES) {
      if (e.from === id) downstream.add(e.to);
    }
    return { upstream, downstream };
  }

  function matchesLens(node) {
    if (activeLens === 'all') return true;
    if (activeLens === 'focal') return node.focal;
    if (activeLens === 'singular') return node.originType === 'singular';
    if (activeLens === 'convergent') return node.originType === 'convergent';
    if (activeLens === 'playable') return Boolean(node.playable);
    if (activeLens === 'debated') return node.epistemic === 'debated';
    return true;
  }

  function buildEdgePath(e) {
    const a = nodeMap.get(e.from);
    const b = nodeMap.get(e.to);
    if (!a || !b) return '';
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    // Gentle horizontal S-curve for forward edges; slight arc for same-column edges
    if (Math.abs(dx) < 35) {
      const cx = a.x + (dy > 0 ? 34 : -34);
      const cy = (a.y + b.y) * 0.5;
      return `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
    }
    const c1x = a.x + dx * 0.46;
    const c2x = b.x - dx * 0.46;
    return `M ${a.x} ${a.y} C ${c1x} ${a.y}, ${c2x} ${b.y}, ${b.x} ${b.y}`;
  }

  function render() {
    const { upstream, downstream } = getDependencySets(selectedId);
    const sel = nodeMap.get(selectedId) || ATLAS_NODES[0];
    const selEpoch = ATLAS_EPOCHS.find((ep) => ep.id === sel.epoch);

    const lenses = [
      { id: 'all', label: `All TEBs (${ATLAS_NODES.length})` },
      { id: 'focal', label: '🎯 Focal Trail (Prokaryote → Human)' },
      { id: 'singular', label: '⚡ 1× Singular Bottlenecks' },
      { id: 'convergent', label: '🔁 Convergent (N×)' },
      { id: 'playable', label: '🧪 Playable in This Lab' },
      { id: 'debated', label: '🔍 Order / Cause Debated' },
    ];

    const svgBands = ATLAS_EPOCHS.map(
      (ep) => `
      <g class="atlas-band">
        <rect x="${ep.x}" y="12" width="${ep.w}" height="524" rx="10" fill="${ep.color}" fill-opacity="0.045" stroke="${ep.color}" stroke-opacity="0.22" stroke-width="1" />
        <text x="${ep.x + ep.w / 2}" y="31" text-anchor="middle" fill="${ep.color}" font-size="11" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${ep.name}</text>
        <text x="${ep.x + ep.w / 2}" y="46" text-anchor="middle" fill="#94a3b8" font-size="9.5" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${ep.time}</text>
      </g>`
    ).join('');

    const svgEdges = ATLAS_EDGES.map((e) => {
      const isUpEdge = (upstream.has(e.from) || e.from === selectedId) && (upstream.has(e.to) || e.to === selectedId);
      const isDownEdge = e.from === selectedId && downstream.has(e.to);
      const isHighlighted = isUpEdge || isDownEdge;

      let stroke = '#475569';
      let opacity = 0.28;
      let width = 1.4;
      if (e.kind === 'eco') stroke = '#34d399';
      else if (e.kind === 'coevo') stroke = '#a78bfa';

      if (isUpEdge) {
        stroke = e.kind === 'eco' ? '#34d399' : '#38bdf8';
        opacity = 0.92;
        width = 2.4;
      } else if (isDownEdge) {
        stroke = '#fbbf24';
        opacity = 0.95;
        width = 2.6;
      } else if (activeLens !== 'all') {
        opacity = 0.14;
      }

      const dash = e.kind === 'eco' ? '6,4' : e.kind === 'coevo' ? '2,4' : 'none';
      return `<path d="${buildEdgePath(e)}" fill="none" stroke="${stroke}" stroke-opacity="${opacity}" stroke-width="${width}" stroke-dasharray="${dash}" marker-end="url(#arrow-${isDownEdge ? 'amber' : isUpEdge ? 'cyan' : 'dim'})" />`;
    }).join('');

    const svgNodes = ATLAS_NODES.map((n) => {
      const ep = ATLAS_EPOCHS.find((x) => x.id === n.epoch);
      const isSel = n.id === selectedId;
      const isUp = upstream.has(n.id);
      const isDown = downstream.has(n.id);
      const lensHit = matchesLens(n);

      const dimmed = activeLens !== 'all' && !lensHit && !isSel;
      const opacity = dimmed ? 0.22 : 1;

      const fill = isSel
        ? '#1e293b'
        : isUp
        ? '#0c2338'
        : isDown
        ? '#2a1f0a'
        : n.focal
        ? '#0f172a'
        : '#111622';

      const stroke = isSel
        ? '#ffffff'
        : isDown
        ? '#fbbf24'
        : isUp
        ? '#38bdf8'
        : n.playable && n.simTier === 'emergent'
        ? '#22d3ee'
        : n.playable
        ? '#e879f9'
        : ep.color;

      const strokeW = isSel ? 2.8 : isUp || isDown || n.playable ? 2.0 : 1.3;
      const dash = n.focal ? 'none' : '4,3';
      const lines = n.label.split('\n');
      const boxW = 104;
      const boxH = 44;

      // Tiny corner tag for Emergent vs Take-01 Archive vs 1x singular vs Nx convergent
      let badgeText = '';
      let badgeColor = '#94a3b8';
      if (n.playable && n.simTier === 'emergent') {
        badgeText = 'LIVE';
        badgeColor = '#22d3ee';
      } else if (n.playable) {
        badgeText = 'T01';
        badgeColor = '#e879f9';
      } else if (n.originType === 'singular') {
        badgeText = '1×';
        badgeColor = '#38bdf8';
      } else if (n.epistemic === 'debated') {
        badgeText = '?';
        badgeColor = '#fbbf24';
      } else if (n.originType === 'convergent') {
        badgeText = 'N×';
        badgeColor = '#34d399';
      }

      return `
        <g class="atlas-node ${isSel ? 'selected' : ''}" data-nid="${n.id}" transform="translate(${n.x}, ${n.y})" opacity="${opacity}" style="cursor:pointer">
          ${isSel ? `<rect x="${-boxW / 2 - 4}" y="${-boxH / 2 - 4}" width="${boxW + 8}" height="${boxH + 8}" rx="11" fill="none" stroke="#38bdf8" stroke-opacity="0.65" stroke-width="2" />` : ''}
          <rect x="${-boxW / 2}" y="${-boxH / 2}" width="${boxW}" height="${boxH}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}" stroke-dasharray="${dash}" />
          ${lines
            .map(
              (ln, idx) =>
                `<text x="0" y="${lines.length === 1 ? 4 : idx === 0 ? -4 : 10}" text-anchor="middle" fill="${isSel ? '#ffffff' : '#e2e8f0'}" font-size="10.2" font-weight="${isSel || n.focal ? '700' : '600'}" font-family="-apple-system, BlinkMacSystemFont, sans-serif">${ln}</text>`
            )
            .join('')}
          ${
            badgeText
              ? `<g transform="translate(${boxW / 2 - 12}, ${-boxH / 2 + 1})">
                  <rect x="-12" y="-7" width="24" height="13" rx="6" fill="#060910" stroke="${badgeColor}" stroke-width="1" />
                  <text x="0" y="2.5" text-anchor="middle" fill="${badgeColor}" font-size="8" font-weight="800" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${badgeText}</text>
                </g>`
              : ''
          }
        </g>
      `;
    }).join('');

    const upLabels = Array.from(upstream)
      .filter((id) => ATLAS_EDGES.some((e) => e.from === id && e.to === selectedId))
      .map((id) => `<button class="atlas-chip cyan" data-jump-node="${id}">← ${nodeMap.get(id).short}</button>`)
      .join('');
    const downLabels = Array.from(downstream)
      .map((id) => `<button class="atlas-chip amber" data-jump-node="${id}">${nodeMap.get(id).short} →</button>`)
      .join('');

    el.innerHTML = `
      <div class="atlas-shell">
        <div class="atlas-toolbar">
          <div class="atlas-lenses">
            ${lenses
              .map(
                (l) => `<button class="w-pill ${activeLens === l.id ? 'active' : ''}" data-lens="${l.id}">${l.label}</button>`
              )
              .join('')}
          </div>
          <div class="atlas-zoom">
            <button class="w-pill" data-zoom="-15" title="Zoom out">−</button>
            <span class="zoom-lbl">${zoomPct}%</span>
            <button class="w-pill" data-zoom="15" title="Zoom in">+</button>
          </div>
        </div>

        <div class="atlas-viewport">
          <svg
            class="atlas-svg"
            viewBox="0 0 1260 550"
            style="width:${Math.round(1260 * (zoomPct / 100))}px;height:${Math.round(550 * (zoomPct / 100))}px"
            role="img"
            aria-label="Interactive Target Emergent Behaviours Dependency Graph from Prokaryotes to Humans"
          >
            <defs>
              <marker id="arrow-dim" viewBox="0 0 10 10" refX="26" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
              </marker>
              <marker id="arrow-cyan" viewBox="0 0 10 10" refX="26" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
              </marker>
              <marker id="arrow-amber" viewBox="0 0 10 10" refX="26" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#fbbf24" />
              </marker>
            </defs>
            ${svgBands}
            <g class="atlas-edges">${svgEdges}</g>
            <g class="atlas-nodes">${svgNodes}</g>
          </svg>
        </div>

        <div class="atlas-legend">
          <span><i class="al-line solid"></i>Prerequisite</span>
          <span><i class="al-line eco"></i>Cross-Branch Ecological Unlock (e.g. O₂ / Plants)</span>
          <span><i class="al-line coevo"></i>Co-evolutionary Loop</span>
          <span><i class="al-box dashed"></i>Side Branch</span>
          <span><strong style="color:#38bdf8">1×</strong> Singular Bottleneck</span>
          <span><strong style="color:#34d399">N×</strong> Convergent</span>
          <span><strong style="color:#22d3ee">LIVE</strong> Emergent (Genesis Main)</span>
          <span><strong style="color:#e879f9">T01</strong> Take-01 Archive</span>
        </div>

        <div class="atlas-inspector">
          <div class="ai-head">
            <div>
              <div class="ai-kicker" style="color:${selEpoch.color}">${selEpoch.name} · ${sel.time}${sel.branch ? ` · SIDE BRANCH (${sel.branch})` : ' · FOCAL TRAIL'}</div>
              <h3>${sel.short}</h3>
            </div>
            <div class="ai-badges">
              ${sel.simTier === 'emergent' ? '<span class="ai-badge cyan">⚡ EMERGENT · ZERO HARD-CODING</span>' : sel.simTier === 'archive' ? '<span class="ai-badge slate">📦 TAKE-01 ARCHIVE</span>' : ''}
              <span class="ai-badge ${sel.originType === 'singular' ? 'cyan' : 'emerald'}">Origins: ${sel.origins}</span>
              <span class="ai-badge ${sel.epistemic === 'debated' ? 'amber' : 'slate'}">${sel.epistemic === 'debated' ? '🔍 Order / Cause Debated' : '✓ Well-Anchored'}</span>
            </div>
          </div>

          <div class="teb-grid">
            <div class="teb-cell"><span>Competitive Advantage</span><p>${sel.advantage}</p></div>
            <div class="teb-cell"><span>Jump in Complexity</span><p>${sel.jump}</p></div>
            <div class="teb-cell"><span>Step 0 Prerequisites</span><p>${sel.step0}</p></div>
            <div class="teb-cell"><span>🔍 Epistemic / Evidence Note</span><p>${sel.epistemicNote}</p></div>
          </div>

          <div class="ai-links-row">
            ${upLabels ? `<div class="ai-chain"><span>Direct Prerequisites:</span>${upLabels}</div>` : ''}
            ${downLabels ? `<div class="ai-chain"><span>Unlocks Next:</span>${downLabels}</div>` : ''}
          </div>

          ${
            sel.wikiPage || sel.labExp
              ? `<div class="ai-actions">
                  ${sel.wikiPage ? `<button class="wbtn" data-atlas-wiki="${sel.wikiPage}">📖 Read Full Wiki Article →</button>` : ''}
                  ${sel.labExp ? `<a class="wbtn wbtn-primary" href="${sel.labTarget || './take01.html'}?exp=${sel.labExp}">${sel.simTier === 'emergent' ? '⚡ Launch Genesis Observatory →' : '📦 Launch Take-01 Archive →'}</a>` : ''}
                </div>`
              : ''
          }
        </div>
      </div>
    `;

    // Bind node clicks
    el.querySelectorAll('[data-nid]').forEach((g) =>
      g.addEventListener('click', () => {
        selectedId = g.dataset.nid;
        render();
      })
    );

    // Bind quick jump chips
    el.querySelectorAll('[data-jump-node]').forEach((b) =>
      b.addEventListener('click', () => {
        selectedId = b.dataset.jumpNode;
        render();
      })
    );

    // Bind lens filters
    el.querySelectorAll('[data-lens]').forEach((b) =>
      b.addEventListener('click', () => {
        activeLens = b.dataset.lens;
        render();
      })
    );

    // Bind zoom buttons
    el.querySelectorAll('[data-zoom]').forEach((b) =>
      b.addEventListener('click', () => {
        zoomPct = Math.max(70, Math.min(145, zoomPct + Number(b.dataset.zoom)));
        render();
      })
    );

    // Bind internal Wiki navigation event
    el.querySelectorAll('[data-atlas-wiki]').forEach((b) =>
      b.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('wiki-navigate', { detail: { pageId: b.dataset.atlasWiki } }));
      })
    );
  }

  render();
}

/* ============================================================================
 * 8. INTERACTIVE POP-QUIZ HANDLER
 * ========================================================================== */
const QUIZ_RESPONSES = {
  'big-mystery': {
    right: '🎯 Nailed it! Survival is only step one — if your genes don’t make it into the next generation, evolution gives you a flat zero. That’s why sexual selection can push animals to take wild risks!',
    wrong: '😄 Good instinct from a health-class perspective — but evolution is ruthless! Living 200 years with 0 kids means your genes disappear forever. Try the other answer!',
  },
  anisogamy: {
    right: '🌟 Boom! You just predicted real marine biology (Trivers’ Parental Investment Theory)! Even though female seahorses still make larger eggs, male pregnancy flips TOTAL parental investment — so FEMALES become the showier, more competitive sex!',
    wrong: '🤔 Plot twist: nature actually breaks that stereotype! Even though egg vs. sperm starts the asymmetry, what ultimately drives competition is TOTAL parental investment. When male seahorses take over pregnancy, sex roles flip completely!',
  },
  supernormal: {
    right: '🧠 Spot on! Nature always had deceptive mimics (like bee orchids and femme-fatale fireflies), but filtering specifically for a brand-new artificial decoy burns neural energy without payoff until that specific decoy enters the habitat!',
    wrong: '😜 Watch out for the pop-science myth! Deception has existed in nature for millions of years — what was missing was THIS specific artificial decoy, so paying brain energy to filter it out gave zero benefit beforehand!',
  },
  'teb-imprinting': {
    right: '🧬 Exactly! In egg-laying birds and reptiles, the yolk is sealed before laying — no ongoing placental tug-of-war means no intense genomic imprinting, which is why occasional viable parthenogenesis still works in reptiles and birds!',
    wrong: '🤔 Think about when the nutrients are handed over! Once an egg is laid, the embryo can’t pull extra glucose out of mom’s bloodstream — so David Haig’s tug-of-war never gets going!',
  },
  'teb-monogamy': {
    right: '📊 Right on the money! Gomes et al. (2018) found that Adult Sex Ratio (ASR) had the single largest effect — BUT only when mate guarding actually prevented extra-pair copulations. Once EPC leaked, female dispersion took over!',
    wrong: '👀 Close! Check the interactive widget above: even when males outnumber females, if mate guarding fails (extra-pair copulation is allowed), monogamy drops sharply and female dispersion becomes decisive!',
  },
  'teb-asr': {
    right: '🤯 Boom! Even Charles Darwin guessed wrong on this one! Across birds and mammals (Liker et al. 2021; Schacht et al. 2022), male size dimorphism and male mating skew peak under FEMALE-skewed ASRs because abundant females let top males monopolize harems!',
    wrong: '😄 Don’t feel bad — Charles Darwin himself made that exact guess in 1871! Actual comparative data in birds and mammals shows the opposite: when females outnumber males, harem monopolization (polygyny) drives the fiercest male reproductive skew and largest male size dimorphism!',
  },
};

function mountQuizzes(container) {
  container.querySelectorAll('.quiz-box').forEach((box) => {
    const qId = box.dataset.quiz;
    const fb = box.querySelector('.quiz-feedback');
    box.querySelectorAll('.quiz-opt').forEach((btn) => {
      btn.addEventListener('click', () => {
        const isCorrect = btn.dataset.correct === 'true';
        box.querySelectorAll('.quiz-opt').forEach((b) => b.classList.remove('is-right', 'is-wrong'));
        btn.classList.add(isCorrect ? 'is-right' : 'is-wrong');
        fb.textContent = isCorrect ? QUIZ_RESPONSES[qId].right : QUIZ_RESPONSES[qId].wrong;
        fb.className = 'quiz-feedback show ' + (isCorrect ? 'ok' : 'nope');
      });
    });
  });
}
