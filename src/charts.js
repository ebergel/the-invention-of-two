/**
 * Real-time HiDPI Canvas2D Scientific Telemetry Charts:
 * 1. Evolutionary Trait Trajectories (w_mate, w_status, display, choosiness, discernment)
 * 2. Bateman's Principle: Male vs. Female Reproductive Offspring Histogram
 * 3. Deaner, Khera & Platt (2005) Pay-Per-View Neuroeconomic PSE Assay
 */

import { TRAIT_META } from './config.js';

function prepCanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(180, Math.floor(rect.width));
  const h = Math.max(90, Math.floor(rect.height));
  if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

/**
 * 1. Multi-line Evolutionary Trait History Chart
 */
export function drawTraitChart(canvas, history) {
  const { ctx, w, h } = prepCanvas(canvas);
  const padL = 30;
  const padR = 10;
  const padT = 10;
  const padB = 20;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  // Horizontal reference grid (0.0, 0.25, 0.5, 0.75, 1.0)
  ctx.font = '500 9px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for (let i = 0; i <= 4; i++) {
    const frac = i / 4;
    const y = padT + plotH * (1 - frac);
    ctx.strokeStyle = i === 0 ? 'rgba(148,163,184,0.22)' : 'rgba(148,163,184,0.09)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(w - padR, y);
    ctx.stroke();

    ctx.fillStyle = 'rgba(148, 163, 184, 0.65)';
    ctx.fillText(frac.toFixed(2), padL - 5, y);
  }

  if (!history || history.length < 2) {
    ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
    ctx.textAlign = 'center';
    ctx.fillText('Collecting generational telemetry...', padL + plotW / 2, padT + plotH / 2);
    ctx.restore();
    return;
  }

  const keys = ['w_mate', 'w_status', 'display', 'choosiness', 'discernment'];
  const n = history.length;

  for (const key of keys) {
    const color = TRAIT_META[key].color;
    ctx.strokeStyle = color;
    ctx.lineWidth = key === 'w_mate' || key === 'discernment' ? 2.1 : 1.5;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = padL + (i / (n - 1)) * plotW;
      const y = padT + (1 - history[i][key]) * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // End dot
    const lastY = padT + (1 - history[n - 1][key]) * plotH;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(padL + plotW, lastY, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // X-axis labels
  ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText(`t=${history[0].tick}`, padL, h - 13);
  ctx.textAlign = 'right';
  ctx.fillText(`t=${history[n - 1].tick} (Gen ${history[n - 1].gen})`, w - padR, h - 13);

  ctx.restore();
}

/**
 * 2. Bateman's Principle: Offspring Distribution Histogram (Male vs Female or Asexual)
 */
export function drawBatemanChart(canvas, bateman, regime) {
  const { ctx, w, h } = prepCanvas(canvas);
  const padL = 26;
  const padR = 8;
  const padT = 14;
  const padB = 22;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const labels = ['0', '1', '2', '3', '4', '5+'];
  const maleBins = bateman.maleHist;
  const femaleBins = bateman.femaleHist;
  const asexualBins = bateman.asexualHist;

  let maxVal = 0.25;
  const checkArr = regime === 'sexual' ? maleBins.concat(femaleBins) : asexualBins;
  for (const v of checkArr) if (v > maxVal) maxVal = v;
  maxVal = Math.min(1, maxVal * 1.15);

  // Subtle baseline & mid line
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padL, padT + plotH);
  ctx.lineTo(w - padR, padT + plotH);
  ctx.stroke();

  ctx.font = '500 9px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${Math.round(maxVal * 100)}%`, padL - 4, padT + 4);
  ctx.fillText('0%', padL - 4, padT + plotH);

  const groupW = plotW / labels.length;

  for (let i = 0; i < labels.length; i++) {
    const gx = padL + i * groupW;

    if (regime === 'sexual') {
      const bw = Math.max(6, groupW * 0.34);
      const mh = (maleBins[i] / maxVal) * plotH;
      const fh = (femaleBins[i] / maxVal) * plotH;

      // Male bar (cyan)
      ctx.fillStyle = i === 0 ? 'rgba(56, 189, 248, 0.92)' : 'rgba(56, 189, 248, 0.75)';
      ctx.fillRect(gx + groupW * 0.14, padT + plotH - mh, bw, mh);

      // Female bar (amber)
      ctx.fillStyle = 'rgba(251, 191, 36, 0.85)';
      ctx.fillRect(gx + groupW * 0.14 + bw + 2, padT + plotH - fh, bw, fh);
    } else {
      const bw = Math.max(10, groupW * 0.54);
      const ah = (asexualBins[i] / maxVal) * plotH;
      ctx.fillStyle = 'rgba(52, 211, 153, 0.82)';
      ctx.fillRect(gx + (groupW - bw) / 2, padT + plotH - ah, bw, ah);
    }

    // Bucket label
    ctx.fillStyle = 'rgba(203, 213, 225, 0.78)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(labels[i], gx + groupW / 2, padT + plotH + 5);
  }

  ctx.restore();
}

/**
 * 3. Deaner, Khera & Platt (2005) Pay-Per-View Diverging PSE Chart
 */
export function drawPlattChart(canvas, platt) {
  const { ctx, w, h } = prepCanvas(canvas);
  const labelW = 104;
  const padR = 42;
  const padT = 10;
  const padB = 18;
  const chartW = Math.max(60, w - labelW - padR);
  const chartH = h - padT - padB;

  // Range: -25% (requires bribe) to +45% (willingly sacrifices cherry juice)
  const minPSE = -25;
  const maxPSE = 45;
  const zeroX = labelW + ((0 - minPSE) / (maxPSE - minPSE)) * chartW;

  // Zero axis line
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(zeroX, padT - 2);
  ctx.lineTo(zeroX, padT + chartH + 2);
  ctx.stroke();

  const rows = [
    { label: 'Female Cue', val: platt.femaleCuePSE, color: '#fbbf24' },
    { label: 'Alpha Male', val: platt.dominantMalePSE, color: '#a78bfa' },
    { label: 'Subord. (Ref)', val: platt.subordinateMalePSE, color: '#64748b' },
  ];

  const rowH = chartH / rows.length;
  ctx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const cy = padT + i * rowH + rowH / 2;
    const barH = Math.min(14, rowH * 0.56);

    // Row label
    ctx.fillStyle = 'rgba(226, 232, 240, 0.88)';
    ctx.textAlign = 'right';
    ctx.fillText(r.label, labelW - 8, cy);

    // Bar
    const clamped = Math.max(minPSE, Math.min(maxPSE, r.val));
    const endX = labelW + ((clamped - minPSE) / (maxPSE - minPSE)) * chartW;
    const bx = Math.min(zeroX, endX);
    const bw = Math.max(2, Math.abs(endX - zeroX));

    ctx.fillStyle = r.color;
    ctx.fillRect(bx, cy - barH / 2, bw, barH);

    // Numeric value
    ctx.fillStyle = r.val >= 0 ? '#f8fafc' : '#94a3b8';
    ctx.textAlign = 'left';
    const sign = r.val > 0 ? '+' : '';
    ctx.fillText(`${sign}${r.val.toFixed(1)}%`, w - padR + 6, cy);
  }

  // Axis caption
  ctx.font = '500 8.5px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('← Demanded Bribe   |   Cherry Juice Sacrificed →', labelW + chartW * 0.5, h - 12);

  ctx.restore();
}
