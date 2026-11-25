/**
 * Bioluminescent Scientific Laboratory Canvas2D Renderer
 * Designed for instant visual clarity:
 * - Males: Angular electric-cyan shield with upright ♂ sign, directional pointer,
 *   Zahavi display tail plume, and crown for Alphas.
 * - Females: Warm amber-gold circle with upright ♀ sign and pulsing fertility halo when receptive.
 * - Asexuals: Emerald rounded-cell with upright ◎ division sign.
 * - Food / Cherry Juice: Glossy vector berry/fruit with bright green leaf crown (unmistakably food!).
 * - Supernormal Decoys: Glowing holographic magenta screen with animated pixel-lure icon.
 */

export class SimulationRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.options = {
      showTethers: true,
      showHalos: true,
      showClusters: true,
      colorMode: 'sex', // 'sex' | 'w_mate' | 'discernment' | 'display'
    };
    this.hoverWorld = null;
    this.activeTool = 'inspect'; // 'inspect' | 'decoy' | 'food'
  }

  /** Convert client mouse coordinates to logical world coordinates */
  screenToWorld(clientX, clientY, sim) {
    const rect = this.canvas.getBoundingClientRect();
    const sx = (clientX - rect.left) / rect.width;
    const sy = (clientY - rect.top) / rect.height;
    return {
      x: sx * sim.params.worldWidth,
      y: sy * sim.params.worldHeight,
    };
  }

  resizeIfNeeded() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    const targetW = Math.max(300, Math.floor(rect.width * dpr));
    const targetH = Math.max(200, Math.floor(rect.height * dpr));
    if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
    }
    return { w: this.canvas.width, h: this.canvas.height, dpr };
  }

  render(sim) {
    const { w, h } = this.resizeIfNeeded();
    const ctx = this.ctx;
    const scaleX = w / sim.params.worldWidth;
    const scaleY = h / sim.params.worldHeight;

    ctx.save();
    // Deep obsidian lab background
    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, 0, w, h);

    ctx.scale(scaleX, scaleY);
    const W = sim.params.worldWidth;
    const H = sim.params.worldHeight;

    // 1. Subtle calibrated laboratory grid
    this.drawGrid(ctx, W, H);

    // 2. Soft nutrient hotspot nebulae
    if (this.options.showClusters) {
      this.drawClusters(ctx, sim.clusters);
    }

    // 3. Food / Cherry-Berry Juice items
    this.drawFoods(ctx, sim.foods, sim.tick);

    // 4. Supernormal Decoys ("Pixels on a Screen")
    this.drawDecoys(ctx, sim.decoys, sim.tick);

    // 5. Behavioral attention / assessment / trap tethers
    if (this.options.showTethers) {
      this.drawTethers(ctx, sim.tethers);
    }

    // 6. Organisms (draw juveniles first, then mature, then selected on top)
    let selectedAgent = null;
    for (let i = 0; i < sim.agents.length; i++) {
      const a = sim.agents[i];
      if (a.id === sim.selectedAgentId) {
        selectedAgent = a;
        continue;
      }
      this.drawAgent(ctx, a, false, sim.params);
    }
    if (selectedAgent) {
      this.drawAgent(ctx, selectedAgent, true, sim.params);
    }

    // 7. Transient visual bursts (mating, contest sparks, juice drain)
    this.drawEffects(ctx, sim.effects);

    // 8. Tool cursor preview
    if (this.hoverWorld && this.activeTool !== 'inspect') {
      this.drawToolPreview(ctx, this.hoverWorld, this.activeTool, sim.params);
    }

    ctx.restore();
  }

  drawGrid(ctx, W, H) {
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.05)';
    ctx.lineWidth = 1;
    const step = 64;
    ctx.beginPath();
    for (let x = step; x < W; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
    }
    for (let y = step; y < H; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.stroke();

    // Subtle corner brackets
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
    const m = 18;
    ctx.beginPath();
    ctx.moveTo(m, m + 10);
    ctx.lineTo(m, m);
    ctx.lineTo(m + 10, m);
    ctx.moveTo(W - m - 10, m);
    ctx.lineTo(W - m, m);
    ctx.lineTo(W - m, m + 10);
    ctx.moveTo(m, H - m - 10);
    ctx.lineTo(m, H - m);
    ctx.lineTo(m + 10, H - m);
    ctx.moveTo(W - m - 10, H - m);
    ctx.lineTo(W - m, H - m);
    ctx.lineTo(W - m, H - m - 10);
    ctx.stroke();
  }

  drawClusters(ctx, clusters) {
    for (const c of clusters) {
      const grad = ctx.createRadialGradient(c.x, c.y, 8, c.x, c.y, c.radius * 1.15);
      grad.addColorStop(0, 'rgba(34, 197, 94, 0.065)');
      grad.addColorStop(0.5, 'rgba(255, 59, 92, 0.04)');
      grad.addColorStop(1, 'rgba(255, 59, 92, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius * 1.15, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Draw unmistakable glossy red berry/strawberry food with bright green leafy crown
   * so food ("comida / cherry juice") stands out instantly from all organisms.
   */
  drawFoods(ctx, foods, tick) {
    for (let i = 0; i < foods.length; i++) {
      const f = foods[i];
      const pulse = 1 + Math.sin(tick * 0.045 + f.phase) * 0.08;
      const s = 5.6 * pulse;

      ctx.save();
      ctx.translate(f.x, f.y);

      // Soft warm food aura
      ctx.fillStyle = 'rgba(255, 59, 92, 0.16)';
      ctx.beginPath();
      ctx.arc(0, 0.5, s * 1.65, 0, Math.PI * 2);
      ctx.fill();

      // Strawberry / berry body (plump heart-tapered crimson fruit)
      ctx.fillStyle = '#ff2e55';
      ctx.beginPath();
      ctx.moveTo(0, s * 1.05); // bottom tip
      ctx.bezierCurveTo(-s * 1.15, s * 0.35, -s * 1.05, -s * 0.85, 0, -s * 0.58);
      ctx.bezierCurveTo(s * 1.05, -s * 0.85, s * 1.15, s * 0.35, 0, s * 1.05);
      ctx.closePath();
      ctx.fill();

      // Crisp bright-green leafy crown (calyx) — instant visual cue for fruit/food!
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

      // Tiny golden berry seeds + gloss dot
      ctx.fillStyle = 'rgba(254, 240, 138, 0.88)';
      ctx.fillRect(-s * 0.36, -s * 0.12, 1.2, 1.2);
      ctx.fillRect(s * 0.22, -s * 0.06, 1.2, 1.2);
      ctx.fillRect(-s * 0.08, s * 0.36, 1.2, 1.2);

      ctx.restore();
    }
  }

  drawDecoys(ctx, decoys, tick) {
    for (const d of decoys) {
      // Expanding hypnotic interference waves
      for (let w = 0; w < 3; w++) {
        const progress = (tick * 0.015 + w / 3 + d.phase * 0.1) % 1;
        const rad = 18 + progress * (d.radius * 1.35);
        const alpha = (1 - progress) * 0.36;
        ctx.strokeStyle = `rgba(232, 121, 249, ${alpha.toFixed(3)})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(d.x, d.y, rad, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Ambient magenta trap aura
      const grad = ctx.createRadialGradient(d.x, d.y, 10, d.x, d.y, d.radius * 1.18);
      grad.addColorStop(0, 'rgba(232, 121, 249, 0.34)');
      grad.addColorStop(0.55, 'rgba(192, 38, 211, 0.12)');
      grad.addColorStop(1, 'rgba(192, 38, 211, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.radius * 1.18, 0, Math.PI * 2);
      ctx.fill();

      // Holographic "Screen / Pixels" icon with antenna & fake female-lure symbol
      const sw = 34;
      const sh = 24;
      ctx.save();
      ctx.translate(d.x, d.y);

      // Outer neon glow frame
      ctx.fillStyle = '#240938';
      ctx.strokeStyle = '#f0abfc';
      ctx.lineWidth = 2.2;
      this.roundRect(ctx, -sw / 2, -sh / 2, sw, sh, 5);
      ctx.fill();
      ctx.stroke();

      // Stand base so it unmistakably reads as a screen/monitor
      ctx.strokeStyle = '#d946ef';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, sh / 2);
      ctx.lineTo(0, sh / 2 + 4);
      ctx.moveTo(-8, sh / 2 + 4);
      ctx.lineTo(8, sh / 2 + 4);
      ctx.stroke();

      // Glowing pixel-grid flicker inside screen
      const flicker = 0.65 + 0.35 * Math.sin(tick * 0.2 + d.id);
      ctx.fillStyle = `rgba(244, 114, 182, ${(0.22 * flicker).toFixed(2)})`;
      ctx.fillRect(-sw / 2 + 3, -sh / 2 + 3, sw - 6, sh - 6);

      // Fake shimmering female-cue lure glyph inside the screen
      ctx.font = '700 13px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(253, 164, 175, ${flicker.toFixed(2)})`;
      ctx.fillText('♀', 0, 0.5);

      // Clear label badge below screen
      ctx.font = '700 9.5px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#fae8ff';
      ctx.fillText(
        d.captivatedCount > 0 ? `SCREEN · ${d.captivatedCount} TRAPPED` : 'DECOY SCREEN',
        0,
        sh / 2 + 7
      );
      ctx.restore();
    }
  }

  drawTethers(ctx, tethers) {
    ctx.save();
    for (let i = 0; i < tethers.length; i++) {
      const t = tethers[i];
      ctx.beginPath();
      if (t.type === 'decoy_trap') {
        ctx.strokeStyle = 'rgba(232, 121, 249, 0.58)';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([4, 4]);
      } else if (t.type === 'assess_alpha') {
        ctx.strokeStyle = 'rgba(167, 139, 250, 0.42)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([2, 4]);
      } else {
        // pursue_female
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.28)';
        ctx.lineWidth = 1.1;
        ctx.setLineDash([3, 5]);
      }
      ctx.moveTo(t.x1, t.y1);
      ctx.lineTo(t.x2, t.y2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  }

  getAgentFill(a) {
    if (this.options.colorMode === 'sex') {
      if (a.sex === 'M') return a.captivatedByDecoyId !== null ? '#a21caf' : '#0284c7';
      if (a.sex === 'F') return '#d97706';
      return '#059669';
    }
    const val = a.genome[this.options.colorMode] ?? 0.5;
    const hue = 220 - val * 200;
    return `hsl(${hue.toFixed(0)}, 75%, 38%)`;
  }

  getAgentStroke(a) {
    if (this.options.colorMode === 'sex') {
      if (a.sex === 'M') return a.captivatedByDecoyId !== null ? '#f0abfc' : '#7dd3fc';
      if (a.sex === 'F') return '#fde68a';
      return '#6ee7b7';
    }
    const val = a.genome[this.options.colorMode] ?? 0.5;
    const hue = 220 - val * 200;
    return `hsl(${hue.toFixed(0)}, 92%, 72%)`;
  }

  drawAgent(ctx, a, isSelected, params) {
    const isMature = a.age >= params.maturityAge;
    const r = isMature ? 10.5 : 7.0;
    const energyRatio = Math.max(0, Math.min(1, a.energy / a.maxEnergy));
    const fill = this.getAgentFill(a);
    const stroke = this.getAgentStroke(a);

    ctx.save();
    ctx.translate(a.x, a.y);

    // 1. Selection reticle, sensing range & live state tag
    if (isSelected) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(0, 0, params.senseRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, r + 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 2. Status / Receptivity / Decoy Halos
    if (this.options.showHalos) {
      if (a.sex === 'F' && a.state === 'receptive') {
        const pulse = 0.5 + 0.5 * Math.sin(a.pulsePhase * 1.4);
        ctx.strokeStyle = `rgba(251, 191, 36, ${(0.38 + 0.5 * pulse).toFixed(2)})`;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(0, 0, r + 4.5 + pulse * 3.5, 0, Math.PI * 2);
        ctx.stroke();
      } else if (a.sex === 'M' && a.isAlpha) {
        ctx.strokeStyle = 'rgba(196, 181, 253, 0.85)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, 0, r + 5.5, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (a.captivatedByDecoyId !== null) {
        ctx.strokeStyle = 'rgba(232, 121, 249, 0.92)';
        ctx.lineWidth = 2.0;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(0, 0, r + 5.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // 3. Directional features (rotated to heading): Male display plume & nose pointer
    ctx.save();
    ctx.rotate(a.heading);

    if (a.sex === 'M' && isMature && a.genome.display > 0.14) {
      // Vivid peacock-like costly display fan behind the male
      const d = a.genome.display;
      const plumeLen = r + 4 + d * 13;
      const spread = 0.34 + d * 0.45;
      ctx.strokeStyle =
        a.captivatedByDecoyId !== null
          ? 'rgba(240, 171, 252, 0.78)'
          : `rgba(251, 113, 133, ${(0.45 + d * 0.52).toFixed(2)})`;
      ctx.lineWidth = 1.6 + d * 1.4;
      for (let ray = -2; ray <= 2; ray++) {
        const ang = Math.PI + ray * (spread * 0.55);
        ctx.beginPath();
        ctx.moveTo(-r * 0.7, 0);
        ctx.lineTo(Math.cos(ang) * plumeLen, Math.sin(ang) * plumeLen);
        ctx.stroke();
      }
    }

    // Subtle directional nose pointer on outer rim so movement direction stays obvious
    ctx.fillStyle = stroke;
    ctx.beginPath();
    ctx.moveTo(r + 5.5, 0);
    ctx.lineTo(r - 0.5, -3.4);
    ctx.lineTo(r - 0.5, 3.4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // 4. Vastly distinct body silhouettes + upright ♂ / ♀ / ◎ signs!
    if (a.sex === 'M') {
      // MALES: Crisp angular diamond / hexagonal shield (cool electric blue)
      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = isMature ? 2.0 : 1.4;
      ctx.beginPath();
      const s = r * 1.08;
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.92, -s * 0.32);
      ctx.lineTo(s * 0.92, s * 0.38);
      ctx.lineTo(0, s);
      ctx.lineTo(-s * 0.92, s * 0.38);
      ctx.lineTo(-s * 0.92, -s * 0.32);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Upright crisp ♂ symbol
      ctx.fillStyle = '#ffffff';
      ctx.font = `800 ${isMature ? 13 : 9.5}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('♂', 0, 0.5);

      // Alpha Crown floating right above top-status males
      if (a.isAlpha && this.options.showHalos) {
        this.drawCrown(ctx, 0, -r - 7.5);
      }
    } else if (a.sex === 'F') {
      // FEMALES: Soft warm glowing circle (amber-gold / rose)
      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = isMature ? 2.1 : 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Subtle inner warm glow when receptive
      if (a.state === 'receptive') {
        ctx.fillStyle = 'rgba(254, 243, 199, 0.28)';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
        ctx.fill();
      }

      // Upright crisp ♀ symbol
      ctx.fillStyle = '#fffbeb';
      ctx.font = `800 ${isMature ? 13.5 : 10}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('♀', 0, 0.5);
    } else {
      // ASEXUAL CONTROL: Emerald rounded square cell
      const box = r * 1.75;
      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.8;
      this.roundRect(ctx, -box / 2, -box / 2, box, box, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ecfdf5';
      ctx.font = `700 ${isMature ? 11.5 : 8.5}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('◎', 0, 0.5);
    }

    // 5. Tiny crisp energy ("juice") bar directly beneath mature organisms
    if (isMature) {
      const bw = 15;
      const bh = 2.4;
      const by = r + 3.2;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
      ctx.fillRect(-bw / 2, by, bw, bh);
      ctx.fillStyle = energyRatio < 0.25 ? '#ff3b5c' : energyRatio < 0.55 ? '#fbbf24' : '#4ade80';
      ctx.fillRect(-bw / 2, by, bw * energyRatio, bh);
    }

    // 6. Floating label for selected organism
    if (isSelected) {
      const tag = `#${a.id} ${a.sex === 'M' ? (a.isAlpha ? '♂ ALPHA' : '♂ MALE') : a.sex === 'F' ? '♀ FEMALE' : '◎ CLONAL'}`;
      ctx.font = '700 10px ui-monospace, SFMono-Regular, Menlo, monospace';
      const tw = ctx.measureText(tag).width + 10;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      this.roundRect(ctx, -tw / 2, -r - 27, tw, 15, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tag, 0, -r - 19.5);
    }

    ctx.restore();
  }

  drawCrown(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#fde047';
    ctx.strokeStyle = '#a16207';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-5.5, 3);
    ctx.lineTo(-6.5, -3);
    ctx.lineTo(-2.5, 0);
    ctx.lineTo(0, -4.5);
    ctx.lineTo(2.5, 0);
    ctx.lineTo(6.5, -3);
    ctx.lineTo(5.5, 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  drawEffects(ctx, effects) {
    for (let i = 0; i < effects.length; i++) {
      const e = effects[i];
      const t = e.age / e.maxAge;
      const alpha = 1 - t;

      if (e.type === 'mate' || e.type === 'birth') {
        ctx.strokeStyle =
          e.type === 'mate'
            ? `rgba(251, 191, 36, ${(alpha * 0.9).toFixed(2)})`
            : `rgba(52, 211, 153, ${(alpha * 0.9).toFixed(2)})`;
        ctx.lineWidth = 2.4 * alpha;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 10 + t * 26, 0, Math.PI * 2);
        ctx.stroke();

        if (e.type === 'mate' && t < 0.7) {
          ctx.fillStyle = `rgba(254, 240, 138, ${((0.7 - t) * 1.4).toFixed(2)})`;
          ctx.font = '700 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('♥', e.x, e.y - 8 - t * 14);
        }
      } else if (e.type === 'contest') {
        ctx.strokeStyle = `rgba(249, 115, 22, ${(alpha * 0.95).toFixed(2)})`;
        ctx.lineWidth = 2.2;
        const r = 6 + t * 18;
        for (let k = 0; k < 6; k++) {
          const ang = (k / 6) * Math.PI * 2 + t * 0.6;
          ctx.beginPath();
          ctx.moveTo(e.x + Math.cos(ang) * (r * 0.35), e.y + Math.sin(ang) * (r * 0.35));
          ctx.lineTo(e.x + Math.cos(ang) * r, e.y + Math.sin(ang) * r);
          ctx.stroke();
        }
      } else if (e.type === 'juice_drain' && e.tx !== undefined) {
        // Siphoned red juice droplet pulled from male into the decoy screen
        const px = e.x + (e.tx - e.x) * t;
        const py = e.y + (e.ty - e.y) * t;
        ctx.fillStyle = `rgba(255, 59, 92, ${(alpha * 0.95).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(px, py, 3.0, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.type === 'death') {
        ctx.strokeStyle = `rgba(148, 163, 184, ${(alpha * 0.5).toFixed(2)})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 6 + t * 14, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  drawToolPreview(ctx, pos, tool, params) {
    ctx.save();
    if (tool === 'decoy') {
      ctx.strokeStyle = 'rgba(232, 121, 249, 0.75)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, params.decoyRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#f0abfc';
      ctx.font = '700 10px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('CLICK TO PLACE / REMOVE DECOY SCREEN', pos.x, pos.y - 14);
    } else if (tool === 'food') {
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.8)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 48, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#86efac';
      ctx.font = '700 10px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('CLICK TO DROP FOOD (BERRIES / JUICE)', pos.x, pos.y - 14);
    }
    ctx.restore();
  }

  roundRect(ctx, x, y, w, h, r) {
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
}
