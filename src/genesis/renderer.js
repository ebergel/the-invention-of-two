/**
 * THE INVENTION OF TWO — Bioluminescent Deep-Sea Microscopy Renderer
 *
 * ZERO hard-coded 'M' or 'F' visual branches.
 * Every organism's color, morphology, and halo are pure continuous functions of its genome:
 *   - recombine < 0.5  -> Emerald-mint clonal cell with mitotic division ring
 *   - recombine >= 0.5 -> Continuous spectrum by gameteSize:
 *       0.06 (Micro) = Electric Cyan darting cell
 *       0.50 (Iso)   = Opalescent Silver-Teal symmetric cell
 *       0.94 (Macro) = Radiant Golden-Amber yolk-filled vessel
 */

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Pure continuous RGB interpolation from gameteSize [0..1] (Cyan -> Silver-Teal -> Amber) */
export function gameteSizeColor(gs, alpha = 1) {
  const s = clamp(gs, 0, 1);
  let r, g, b;
  if (s < 0.5) {
    const t = s / 0.5;
    // Electric Cyan (34, 211, 238) -> Silver-Teal (148, 196, 206)
    r = lerp(34, 148, t);
    g = lerp(211, 196, t);
    b = lerp(238, 206, t);
  } else {
    const t = (s - 0.5) / 0.5;
    // Silver-Teal (148, 196, 206) -> Golden Amber (251, 191, 36)
    r = lerp(148, 251, t);
    g = lerp(196, 191, t);
    b = lerp(206, 36, t);
  }
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`;
}

export class GenesisRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.overlays = {
      gametes: true,
      pheromones: true,
      parasites: true,
      immuneRings: false,
      careTethers: true,
    };
    this.hoverPos = null;
    this.activeTool = 'inspect';
  }

  render(sim) {
    const ctx = this.ctx;
    const W = sim.params.worldWidth;
    const H = sim.params.worldHeight;
    if (this.canvas.width !== W || this.canvas.height !== H) {
      this.canvas.width = W;
      this.canvas.height = H;
    }

    // 1. Deep abyssal ocean gradient
    const bg = ctx.createRadialGradient(W * 0.5, H * 0.45, 60, W * 0.5, H * 0.5, Math.max(W, H) * 0.72);
    bg.addColorStop(0, '#071426');
    bg.addColorStop(0.55, '#040c18');
    bg.addColorStop(1, '#02060d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Subtle scientific microscope grid
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.045)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 80; x < W; x += 80) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
    }
    for (let y = 80; y < H; y += 80) {
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.stroke();

    // 2. Drifting bioluminescent nutrient clouds
    for (const c of sim.clusters) {
      const grad = ctx.createRadialGradient(c.x, c.y, 6, c.x, c.y, c.radius);
      grad.addColorStop(0, 'rgba(16, 185, 129, 0.095)');
      grad.addColorStop(0.55, 'rgba(20, 184, 166, 0.035)');
      grad.addColorStop(1, 'rgba(16, 185, 129, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Nutrients (micro-plankton specks)
    for (let i = 0; i < sim.nutrients.length; i++) {
      const n = sim.nutrients[i];
      const pulse = 0.72 + 0.28 * Math.sin(sim.tick * 0.05 + n.phase);
      ctx.fillStyle = `rgba(52, 211, 153, ${0.42 * pulse})`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, 2.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Gametes & Chemotactic Pheromone Halos
    if (this.overlays.gametes) {
      for (let i = 0; i < sim.gametes.length; i++) {
        const g = sim.gametes[i];
        const fade = clamp(1 - g.age / g.maxAge, 0.2, 1);

        // Chemotactic pheromone halo scales smoothly with cell volume (size^2.5)
        if (this.overlays.pheromones && g.size > 0.42) {
          const haloR = 8 + Math.pow(g.size, 2.2) * 32;
          const halo = ctx.createRadialGradient(g.x, g.y, 1, g.x, g.y, haloR);
          halo.addColorStop(0, gameteSizeColor(g.size, 0.22 * fade));
          halo.addColorStop(1, gameteSizeColor(g.size, 0));
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(g.x, g.y, haloR, 0, Math.PI * 2);
          ctx.fill();
        }

        // Comet tail for fast gametes
        const speed = Math.hypot(g.vx, g.vy);
        if (speed > 0.9) {
          const tailLen = 3.5 + (1 - g.size) * 7.5;
          const ux = g.vx / speed;
          const uy = g.vy / speed;
          ctx.strokeStyle = gameteSizeColor(g.size, 0.5 * fade);
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(g.x, g.y);
          ctx.lineTo(g.x - ux * tailLen, g.y - uy * tailLen);
          ctx.stroke();
        }

        // Gamete core radius maps smoothly to gameteSize
        const r = 1.8 + g.size * 5.2;
        ctx.fillStyle = gameteSizeColor(g.size, 0.88 * fade);
        ctx.beginPath();
        ctx.arc(g.x, g.y, r, 0, Math.PI * 2);
        ctx.fill();

        if (g.size > 0.62) {
          // Bright yolk nucleus inside large gametes
          ctx.fillStyle = `rgba(255, 251, 235, ${0.75 * fade})`;
          ctx.beginPath();
          ctx.arc(g.x, g.y, r * 0.42, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 5. Post-fusion care tethers (continuous — no sex labels!)
    if (this.overlays.careTethers) {
      const byId = new Map();
      for (const o of sim.organisms) byId.set(o.id, o);
      for (const o of sim.organisms) {
        if (o.careTimer > 0 && o.careTargetId !== null) {
          const child = byId.get(o.careTargetId);
          if (child) {
            ctx.strokeStyle = gameteSizeColor(o.genome.gameteSize, 0.55);
            ctx.lineWidth = 1.6;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(o.x, o.y);
            ctx.lineTo(child.x, child.y);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }
    }

    // 6. Organisms (Clonal = Emerald-Mint; Sexual = Continuous Cyan -> Silver -> Amber)
    for (let i = 0; i < sim.organisms.length; i++) {
      const o = sim.organisms[i];
      this.drawOrganism(ctx, o, o.id === sim.selectedOrgId);
    }

    // 7. Co-evolving 8-bit Parasites (crimson viral motes)
    if (this.overlays.parasites && sim.parasites.length > 0) {
      for (let i = 0; i < sim.parasites.length; i++) {
        const p = sim.parasites[i];
        const r = 2.4;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.phase);
        ctx.strokeStyle = 'rgba(251, 113, 133, 0.85)';
        ctx.lineWidth = 1.05;
        ctx.beginPath();
        for (let s = 0; s < 5; s++) {
          const a = (s * Math.PI * 2) / 5;
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * (r + 2.3), Math.sin(a) * (r + 2.3));
        }
        ctx.stroke();
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // 8. Transient bioluminescent effects
    for (let i = 0; i < sim.effects.length; i++) {
      const fx = sim.effects[i];
      const t = fx.age / fx.maxAge;
      const alpha = 1 - t;
      ctx.save();
      if (fx.type === 'fusion') {
        const r = 4 + t * 24;
        ctx.strokeStyle = `rgba(240, 171, 252, ${alpha * 0.85})`;
        ctx.lineWidth = 2.2 * alpha;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.65})`;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, 4 * alpha, 0, Math.PI * 2);
        ctx.fill();
      } else if (fx.type === 'mitosis') {
        const r = 4 + t * 18;
        ctx.strokeStyle = `rgba(52, 211, 153, ${alpha * 0.75})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (fx.type === 'infect') {
        const r = 5 + t * 16;
        ctx.strokeStyle = `rgba(255, 59, 92, ${alpha * 0.9})`;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (fx.type === 'outbreak') {
        const r = 10 + t * 65;
        ctx.strokeStyle = `rgba(244, 63, 94, ${alpha * 0.85})`;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (fx.type === 'zygote_fail') {
        const r = 3 + t * 7;
        ctx.strokeStyle = `rgba(148, 163, 184, ${alpha * 0.35})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (fx.type === 'spawn_gamete') {
        const r = 5 + t * 14;
        ctx.strokeStyle = fx.color;
        ctx.globalAlpha = alpha * 0.35;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 9. Interactive tool cursor reticle
    if (this.hoverPos && this.activeTool !== 'inspect') {
      const { x, y } = this.hoverPos;
      ctx.save();
      ctx.strokeStyle = this.activeTool === 'outbreak' ? 'rgba(244, 63, 94, 0.75)' : 'rgba(52, 211, 153, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(x, y, this.activeTool === 'outbreak' ? 42 : 34, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  drawOrganism(ctx, o, isSelected) {
    const isSexual = o.genome.recombine >= 0.5;
    const gs = o.genome.gameteSize;
    const isJuvenile = o.age < 32;
    const baseR = isJuvenile ? 5.2 : 7.4 + (isSexual ? gs * 3.8 : 1.0);
    const breath = 1 + 0.05 * Math.sin(o.pulsePhase);
    const r = baseR * breath;

    const primary = isSexual ? gameteSizeColor(gs, 0.94) : 'rgba(52, 211, 153, 0.92)';
    const glow = isSexual ? gameteSizeColor(gs, 0.24) : 'rgba(16, 185, 129, 0.22)';

    ctx.save();
    ctx.translate(o.x, o.y);

    // Outer bioluminescent halo
    const aura = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 2.2);
    aura.addColorStop(0, o.infectedFlash > 0 ? 'rgba(244, 63, 94, 0.55)' : glow);
    aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Optional 8-bit molecular immune lock ring (always shown on selected organism!)
    if (this.overlays.immuneRings || isSelected) {
      const ringR = r + 4.8;
      for (let b = 0; b < 8; b++) {
        const a0 = (b * Math.PI * 2) / 8 - Math.PI / 2;
        const a1 = a0 + Math.PI / 4 - 0.14;
        const bitOn = (o.immuneLock >> b) & 1;
        ctx.strokeStyle = bitOn ? 'rgba(56, 189, 248, 0.92)' : 'rgba(100, 116, 139, 0.25)';
        ctx.lineWidth = isSelected ? 2.4 : 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, ringR, a0, a1);
        ctx.stroke();
      }
    }

    // Rotate into heading for streamlined morphology
    ctx.rotate(o.heading);

    if (!isSexual) {
      // Clonal cell: soft emerald circle with inner mitosis ring
      ctx.fillStyle = o.infectedFlash > 0 ? '#fb7185' : primary;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(236, 253, 245, 0.72)';
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.48, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Sexual cell: continuous morph from sleek cyan teardrop (gs->0) to round amber yolk vessel (gs->1)
      const stretch = 1 + (1 - gs) * 0.42;
      const squish = 1 - (1 - gs) * 0.24;

      ctx.fillStyle = o.infectedFlash > 0 ? '#fb7185' : primary;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * stretch, r * squish, 0, 0, Math.PI * 2);
      ctx.fill();

      // Subtle trailing flagellum proportional to (1 - gs)
      if (gs < 0.55) {
        const wave = Math.sin(o.pulsePhase * 3.2) * 2.8;
        ctx.strokeStyle = gameteSizeColor(gs, 0.65);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-r * stretch, 0);
        ctx.quadraticCurveTo(-r * stretch - 5, wave, -r * stretch - 10 * (1 - gs), -wave * 0.7);
        ctx.stroke();
      }

      // Internal yolk granules proportional to gs (continuous!)
      if (gs > 0.52) {
        const yolkAlpha = clamp((gs - 0.45) * 1.4, 0.15, 0.85);
        ctx.fillStyle = `rgba(255, 251, 235, ${yolkAlpha})`;
        ctx.beginPath();
        ctx.arc(r * 0.18, -r * 0.18, r * 0.24 * gs, 0, Math.PI * 2);
        ctx.arc(-r * 0.22, r * 0.15, r * 0.2 * gs, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Crisp luminous nucleus
        ctx.fillStyle = 'rgba(240, 249, 255, 0.78)';
        ctx.beginPath();
        ctx.arc(r * 0.2, 0, r * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Selected targeting reticle
    if (isSelected) {
      ctx.rotate(-o.heading);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, r + 9.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}
