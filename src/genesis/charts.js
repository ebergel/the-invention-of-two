/**
 * THE INVENTION OF TWO — Signature Observatory Charts
 *   1. Live Y-Fork Gamete-Size Waterfall Spectrogram (20 density bins x time)
 *   2. Red Queen 32-Sector Immune-Lock vs. Parasite-Key Radar Ring
 *   3. Evolutionary Regime Curves (% Sexual, Bifurcation Index, Immune Diversity, Care Divergence)
 */

import { gameteSizeColor } from './renderer.js';

function prepCanvas(canvas, cssHeight = null) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(220, canvas.clientWidth || 340);
  const h = cssHeight || canvas.clientHeight || 160;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

/**
 * 1. Live Y-Fork Gamete-Size Waterfall Spectrogram
 * X-axis = evolutionary time (left -> right)
 * Y-axis = gameteSize 0.0 (bottom, Cyan) -> 0.5 (middle, Isogamy) -> 1.0 (top, Amber)
 */
export function drawWaterfall(canvas, sim) {
  const { ctx, w, h } = prepCanvas(canvas, 178);
  const padL = 44;
  const padR = 46;
  const padT = 14;
  const padB = 22;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  ctx.fillStyle = '#050c18';
  ctx.fillRect(0, 0, w, h);

  // Subtle horizontal bands for Micro (<0.34), Mid, Macro (>0.66)
  const yMacroLine = padT + plotH * (1 - 0.66);
  const yMidLine = padT + plotH * 0.5;
  const yMicroLine = padT + plotH * (1 - 0.34);

  ctx.fillStyle = 'rgba(251, 191, 36, 0.045)';
  ctx.fillRect(padL, padT, plotW, yMacroLine - padT);
  ctx.fillStyle = 'rgba(34, 211, 238, 0.045)';
  ctx.fillRect(padL, yMicroLine, plotW, padT + plotH - yMicroLine);

  // Waterfall spectrogram cells
  const frames = sim.waterfall;
  const maxCols = 140;
  const colW = plotW / maxCols;
  const binCount = 20;
  const binH = plotH / binCount;

  for (let c = 0; c < frames.length; c++) {
    const bins = frames[c];
    const x = padL + c * colW;
    for (let b = 0; b < binCount; b++) {
      const val = bins[b];
      if (val <= 0.002) continue;
      // Nonlinear intensity boost so thin emerging branches glow vividly
      const intensity = Math.min(1, Math.pow(val * 3.8, 0.72));
      const gsCenter = (b + 0.5) / binCount;
      const y = padT + plotH - (b + 1) * binH;
      ctx.fillStyle = gameteSizeColor(gsCenter, 0.12 + intensity * 0.88);
      ctx.fillRect(x, y, Math.ceil(colW + 0.6), Math.ceil(binH + 0.5));
    }
  }

  // Reference lines
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
  ctx.setLineDash([3, 3]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padL, yMidLine);
  ctx.lineTo(padL + plotW, yMidLine);
  ctx.stroke();
  ctx.setLineDash([]);

  // Current right-hand live distribution strip
  const live = frames.length > 0 ? frames[frames.length - 1] : null;
  if (live) {
    const stripX = padL + plotW + 6;
    const stripW = padR - 12;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(stripX, padT, stripW, plotH);
    const maxBin = Math.max(0.18, ...live);
    for (let b = 0; b < binCount; b++) {
      const val = live[b];
      if (val <= 0) continue;
      const bw = Math.max(1.5, (val / maxBin) * (stripW - 2));
      const y = padT + plotH - (b + 1) * binH;
      ctx.fillStyle = gameteSizeColor((b + 0.5) / binCount, 0.92);
      ctx.fillRect(stripX + 1, y + 0.5, bw, Math.max(1.5, binH - 1));
    }
  }

  // Frame border
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
  ctx.lineWidth = 1;
  ctx.strokeRect(padL, padT, plotW, plotH);

  // Y-axis labels
  ctx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fbbf24';
  ctx.fillText('1.0', padL - 6, padT + 4);
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('0.5', padL - 6, yMidLine);
  ctx.fillStyle = '#22d3ee';
  ctx.fillText('0.0', padL - 6, padT + plotH - 4);

  // X-axis caption
  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Evolutionary Time →', padL, h - 7);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('NOW', w - 8, h - 7);
}

/**
 * 2. Red Queen 32-Sector Immune-Lock vs. Parasite-Key Radar Ring
 */
export function drawRedQueenRadar(canvas, sim) {
  const { ctx, w, h } = prepCanvas(canvas, 178);
  const m = sim.latestMetrics || sim.getMetrics();

  ctx.fillStyle = '#050c18';
  ctx.fillRect(0, 0, w, h);

  const cx = w * 0.42;
  const cy = h * 0.52;
  const maxR = Math.min(w * 0.34, h * 0.4);
  const innerR = maxR * 0.34;

  // Concentric radar rings
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
  ctx.lineWidth = 1;
  for (const frac of [0.34, 0.67, 1.0]) {
    ctx.beginPath();
    ctx.arc(cx, cy, maxR * frac, 0, Math.PI * 2);
    ctx.stroke();
  }

  const hostMax = Math.max(4, ...m.hostRadar);
  const paraMax = Math.max(6, ...m.parasiteRadar);
  const sectors = 32;

  // Draw Host Immune Lock distribution (Cyan-Emerald polygon + spokes)
  ctx.beginPath();
  for (let i = 0; i < sectors; i++) {
    const a = (i / sectors) * Math.PI * 2 - Math.PI / 2;
    const r = innerR + (m.hostRadar[i] / hostMax) * (maxR - innerR);
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(34, 211, 238, 0.18)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.9)';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Draw Parasite Key distribution (Crimson polygon chasing hosts!)
  if (sim.params.parasitesEnabled && m.parasiteCount > 0) {
    ctx.beginPath();
    for (let i = 0; i < sectors; i++) {
      const a = (i / sectors) * Math.PI * 2 - Math.PI / 2;
      const r = innerR + (m.parasiteRadar[i] / paraMax) * (maxR - innerR) * 0.92;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(244, 63, 94, 0.22)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(251, 113, 133, 0.95)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Center numeric readout
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 13px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(`${m.uniqueLocks}`, cx, cy - 5);
  ctx.font = '600 8.5px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = '#64748b';
  ctx.fillText('LOCKS', cx, cy + 8);

  // Right-side legend & Red Queen stats
  const lx = cx + maxR + 18;
  ctx.textAlign = 'left';
  ctx.font = '600 10px ui-sans-serif, system-ui, sans-serif';

  ctx.fillStyle = '#38bdf8';
  ctx.fillText('● Host 8-bit Locks', lx, 34);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 10px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(`Diversity: ${Math.round(m.immuneDiversity * 100)}%`, lx + 10, 49);

  ctx.font = '600 10px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = sim.params.parasitesEnabled ? '#fb7185' : '#64748b';
  ctx.fillText(sim.params.parasitesEnabled ? '● Parasite Keys' : '○ Parasites OFF', lx, 78);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 10px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(`Active: ${m.parasiteCount}`, lx + 10, 93);
  ctx.fillText(`Hits: ${m.totalInfections}`, lx + 10, 108);

  ctx.font = '600 9.5px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = sim.params.parasitesEnabled ? '#f43f5e' : '#34d399';
  ctx.fillText(sim.params.parasitesEnabled ? 'ARMS RACE LIVE' : 'NO PARASITES', lx, 140);
}

/**
 * 3. Evolutionary Regime Curves
 */
export function drawRegimeCurves(canvas, sim) {
  const { ctx, w, h } = prepCanvas(canvas, 152);
  const padL = 34;
  const padR = 12;
  const padT = 18;
  const padB = 20;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  ctx.fillStyle = '#050c18';
  ctx.fillRect(0, 0, w, h);

  // Horizontal gridlines (0%, 50%, 100%)
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.13)';
  ctx.lineWidth = 1;
  ctx.font = '600 9.5px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for (const pct of [0, 0.5, 1]) {
    const y = padT + plotH * (1 - pct);
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.stroke();
    ctx.fillText(`${Math.round(pct * 100)}%`, padL - 5, y);
  }

  const hist = sim.history;
  if (hist.length >= 2) {
    const drawLine = (key, color, dashed = false) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = dashed ? 1.3 : 2.0;
      if (dashed) ctx.setLineDash([4, 3]);
      ctx.beginPath();
      for (let i = 0; i < hist.length; i++) {
        const x = padL + (i / Math.max(1, hist.length - 1)) * plotW;
        const y = padT + plotH * (1 - Math.max(0, Math.min(1, hist[i][key])));
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    };

    drawLine('immuneDiv', '#34d399');
    drawLine('recombine', '#c084fc');
    drawLine('bifurcation', '#fbbf24');
    drawLine('largeCare', 'rgba(251, 191, 36, 0.6)', true);
    drawLine('smallCare', 'rgba(34, 211, 238, 0.6)', true);
  }

  // Top legend
  ctx.font = '600 9.5px ui-sans-serif, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const items = [
    ['% Sexual', '#c084fc'],
    ['Bifurcation', '#fbbf24'],
    ['Immune Div', '#34d399'],
    ['Care (S/L)', '#94a3b8'],
  ];
  let lx = padL;
  for (const [label, col] of items) {
    ctx.fillStyle = col;
    ctx.fillText(`━ ${label}`, lx, 8);
    lx += ctx.measureText(`━ ${label}`).width + 10;
  }

  ctx.fillStyle = '#64748b';
  ctx.font = '500 9.5px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(`Tick ${sim.tick} · Gen ${sim.generationMax}`, padL, h - 7);
}
