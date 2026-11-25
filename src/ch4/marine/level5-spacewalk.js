(() => {
  const { W, H } = G;
  const HULL = 330;
  const R = 13;
  const THRUST = 260;
  const DAMP = 0.7;
  const MAX_V = 200;
  const HP = 3;
  const INVULN_MS = 1000;
  const O2_DRAIN = 3.5;
  const O2_TANK = 35;
  const FIX_MS = 3000;
  const LEAKS = [80, 230, 380];
  const HATCH = { x: 490, w: 40 };
  const JET_W = 12;
  const JET_H = 95;
  const JET_PUSH = 420;
  const STARS = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * HULL, b: 0.3 + Math.random() * 0.7 }));

  function drawOutside(ctx, t) {
    ctx.fillStyle = "#03040a";
    ctx.fillRect(0, 0, W, H);
    for (const s of STARS) {
      ctx.fillStyle = `rgba(255,255,255,${s.b})`;
      ctx.fillRect(s.x, s.y, 1.5, 1.5);
    }
    // the earth far below
    const g = ctx.createRadialGradient(430, 90, 10, 430, 90, 70);
    g.addColorStop(0, "#5a9aea");
    g.addColorStop(1, "#1a3a7a");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(430, 90, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(90,170,80,0.8)";
    ctx.beginPath();
    ctx.ellipse(410 + Math.sin((t || 0) * 0.1) * 4, 80, 18, 10, 0.4, 0, Math.PI * 2);
    ctx.ellipse(450, 110, 12, 7, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // the hull of your ship
    ctx.fillStyle = "#8a929e";
    ctx.fillRect(0, HULL, W, H - HULL);
    ctx.fillStyle = "#7a828e";
    for (let x = 0; x < W; x += 60) ctx.fillRect(x + 2, HULL + 4, 56, H - HULL - 8);
    ctx.fillStyle = "#5a626e";
    for (let x = 6; x < W; x += 20) {
      ctx.beginPath();
      ctx.arc(x, HULL + 8, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#e0c040";
    ctx.fillRect(0, HULL - 3, W, 3);
    // the airlock hatch
    ctx.fillStyle = "#3a424e";
    ctx.fillRect(HATCH.x, HULL - 2, HATCH.w, 14);
    ctx.fillStyle = "#7affd0";
    ctx.fillRect(HATCH.x + 4, HULL + 2, HATCH.w - 8, 4);
  }

  G.CAREER_LEVELS.marine[5] = {
    title: "Level 5 — Ruimtewandeling (25 jaar)",
    intro:
      "Je bent 25. Je schip heeft <strong>3 lekken</strong> in de romp en jij moet naar buiten om ze te dichten. Zonder zwaartekracht!<br>" +
      "Vlieg met je <strong>jetpack</strong> (<strong>pijltjes / WASD</strong>). Hang naast een lek en houd <strong>SPATIE</strong> ingedrukt om te lassen (een klap van puin kost de helft van je laswerk). Het lek blaast je weg als je er recht boven hangt!<br>" +
      "Let op je <strong>zuurstof</strong> (pak de blauwe flessen) en ontwijk het <strong>ruimtepuin</strong>. Daarna terug naar de <strong>luchtsluis</strong>.",

    drawBackground(ctx, t) {
      drawOutside(ctx, t);
    },

    start(api) {
      this.api = api;
      this.p = { x: HATCH.x + 20, y: HULL - 30, vx: 0, vy: 0, hp: HP, invuln: 0, facing: -1, tx: 0, ty: 0, welding: false };
      this.o2 = 100;
      this.leaks = LEAKS.map((x) => ({ x, prog: 0, done: false }));
      this.tanks = [];
      this.tankTimer = 6000;
      this.debris = [];
      this.debrisTimer = 3000;
      this.time = 0;
      this.popups = [];
      this.flash = 0;
      this.over = false;
      this.won = 0;
      this.sparks = [];
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 1100 });
    },

    allFixed() {
      return this.leaks.every((l) => l.done);
    },

    hurt(d) {
      const p = this.p;
      if (p.invuln > 0 || this.over || this.won) return;
      p.hp--;
      p.invuln = INVULN_MS;
      this.flash = 300;
      p.vx += d.vx * 0.6;
      p.vy += (p.y < d.y ? -1 : 1) * 80;
      this.popup("Puin! -1 ❤", p.x, p.y - 40, "#ff6b6b");
      // the blow knocks your welder loose: half the progress is lost
      for (const l of this.leaks) if (!l.done) l.prog *= 0.5;
      if (p.hp <= 0) {
        this.over = true;
        this.api.fail("Je pak is lek geslagen door het ruimtepuin.");
      }
    },

    update(dt) {
      if (this.over) return;
      const s = dt / 1000;
      const p = this.p;
      this.time += dt;
      this.popups = G.updatePopups(this.popups, dt);
      this.flash = Math.max(0, this.flash - dt);
      p.invuln = Math.max(0, p.invuln - dt);
      for (const sp of this.sparks) {
        sp.x += sp.vx * s;
        sp.y += sp.vy * s;
        sp.life -= dt;
      }
      this.sparks = this.sparks.filter((sp) => sp.life > 0);
      if (this.won) {
        this.won -= dt;
        if (this.won <= 0) {
          this.over = true;
          this.api.complete();
        }
        return;
      }

      this.o2 -= O2_DRAIN * s;
      if (this.o2 <= 0) {
        this.over = true;
        this.api.fail("Je zuurstof is op. Je zweeft weg in de ruimte...");
        return;
      }

      // jetpack
      p.tx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
      p.ty = (G.held.down ? 1 : 0) - (G.held.up ? 1 : 0);
      if (p.tx || p.ty) {
        const len = Math.hypot(p.tx, p.ty);
        p.vx += (p.tx / len) * THRUST * s;
        p.vy += (p.ty / len) * THRUST * s;
      }
      if (p.tx) p.facing = p.tx;
      // gas jets from the leaks push you up and away
      for (const l of this.leaks) {
        if (l.done) continue;
        if (Math.abs(p.x - l.x) < JET_W + R * 0.5 && p.y > HULL - JET_H) {
          p.vy -= JET_PUSH * s;
          p.vx += Math.sign(p.x - l.x || 1) * 120 * s;
        }
      }
      p.vx *= 1 - DAMP * s;
      p.vy *= 1 - DAMP * s;
      const sp = Math.hypot(p.vx, p.vy);
      if (sp > MAX_V) {
        p.vx *= MAX_V / sp;
        p.vy *= MAX_V / sp;
      }
      p.x += p.vx * s;
      p.y += p.vy * s;
      if (p.x < R) { p.x = R; p.vx = Math.abs(p.vx) * 0.5; }
      if (p.x > W - R) { p.x = W - R; p.vx = -Math.abs(p.vx) * 0.5; }
      if (p.y < 50) { p.y = 50; p.vy = Math.abs(p.vy) * 0.5; }
      if (p.y > HULL - R - 6) { p.y = HULL - R - 6; p.vy = -Math.abs(p.vy) * 0.3; }

      // welding
      p.welding = false;
      if (G.held.action) {
        const l = this.leaks.find((q) => !q.done && Math.abs(q.x - p.x) < 40 && p.y > HULL - 60);
        if (l) {
          p.welding = true;
          l.prog += dt;
          if (Math.random() < 0.5) this.sparks.push({ x: l.x + Math.sign(p.x - l.x) * 6, y: HULL - 4, vx: (Math.random() - 0.5) * 120, vy: -Math.random() * 120, life: 300 });
          if (l.prog >= FIX_MS) {
            l.done = true;
            const left = this.leaks.filter((q) => !q.done).length;
            this.popup(left ? `Lek gedicht! Nog ${left}` : "Alle lekken dicht! Terug naar de luchtsluis!", left ? l.x : W / 2, left ? HULL - 80 : 120, "#6ee07a");
          }
        }
      }
      if (this.allFixed() && p.x > HATCH.x && p.x < HATCH.x + HATCH.w && p.y > HULL - 50) {
        this.won = 2200;
        this.popup("Veilig terug in het schip!", W / 2, 120, "#6ee07a");
      }

      // oxygen tanks drift by
      this.tankTimer -= dt;
      if (this.tankTimer <= 0 && this.tanks.length < 2) {
        this.tankTimer = 7000 + Math.random() * 3000;
        this.tanks.push({ x: 60 + Math.random() * (W - 120), y: 80 + Math.random() * 160, t: Math.random() * 6 });
      }
      for (const tk of this.tanks) {
        tk.t += s;
        tk.y += Math.sin(tk.t * 1.5) * 10 * s;
        if (Math.hypot(tk.x - p.x, tk.y - p.y) < 22) {
          tk.got = true;
          this.o2 = Math.min(100, this.o2 + O2_TANK);
          this.popup(`+${O2_TANK}% zuurstof`, tk.x, tk.y - 20, "#6ab0ff");
        }
      }
      this.tanks = this.tanks.filter((tk) => !tk.got);

      // space debris with a warning
      this.debrisTimer -= dt;
      if (this.debrisTimer <= 0) {
        const rate = Math.max(900, 2000 - this.time / 30);
        this.debrisTimer = rate + Math.random() * 1000;
        const y = 70 + Math.random() * (HULL - 100);
        this.debris.push({ x: W + 160, y, vx: -(150 + Math.random() * 80), rot: 0, size: 8 + Math.random() * 8, warn: 1000 });
      }
      for (const d of this.debris) {
        d.warn -= dt;
        d.x += d.vx * s;
        d.rot += s * 3;
        if (Math.hypot(d.x - p.x, d.y - (p.y - 6)) < d.size + R) this.hurt(d);
      }
      this.debris = this.debris.filter((d) => d.x > -40);
    },

    render(ctx, t) {
      drawOutside(ctx, t);
      const p = this.p;
      for (const l of this.leaks) {
        if (l.done) {
          ctx.fillStyle = "#c08a40";
          ctx.fillRect(l.x - 9, HULL - 4, 18, 6);
          continue;
        }
        // the gas jet
        for (let i = 0; i < 6; i++) {
          const k = ((t * 3 + i / 6) % 1);
          ctx.fillStyle = `rgba(230,240,255,${0.85 * (1 - k)})`;
          ctx.beginPath();
          ctx.arc(l.x + Math.sin(t * 9 + i) * 4, HULL - k * JET_H, 4 + k * 10, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "#1a1a1a";
        ctx.beginPath();
        ctx.ellipse(l.x, HULL - 1, 7, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        if (l.prog > 0) {
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(l.x - 20, HULL + 10, 40, 5);
          ctx.fillStyle = "#e0c040";
          ctx.fillRect(l.x - 20, HULL + 10, 40 * (l.prog / FIX_MS), 5);
        }
      }
      for (const tk of this.tanks) {
        ctx.fillStyle = "#3a7ae0";
        ctx.beginPath();
        ctx.roundRect(tk.x - 6, tk.y - 12, 12, 24, 5);
        ctx.fill();
        ctx.fillStyle = "#ddd";
        ctx.fillRect(tk.x - 3, tk.y - 16, 6, 4);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 8px Segoe UI, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("O₂", tk.x, tk.y + 3);
      }
      for (const d of this.debris) {
        if (d.x > W + 4) {
          if (d.warn < 1000 && Math.floor(t * 10) % 2) {
            ctx.fillStyle = "#ff4040";
            ctx.font = "bold 20px Segoe UI, sans-serif";
            ctx.textAlign = "right";
            ctx.fillText("◀!", W - 6, d.y + 7);
          }
          continue;
        }
        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.rotate(d.rot);
        ctx.fillStyle = "#9a8a7a";
        ctx.fillRect(-d.size, -d.size * 0.5, d.size * 2, d.size);
        ctx.fillStyle = "#6a5a4a";
        ctx.fillRect(-d.size * 0.4, -d.size, d.size * 0.6, d.size * 2);
        ctx.restore();
      }
      ctx.fillStyle = "#ffd24a";
      for (const sp of this.sparks) ctx.fillRect(sp.x, sp.y, 2, 2);

      // jet flames
      if (p.tx || p.ty) {
        const len = Math.hypot(p.tx, p.ty);
        ctx.fillStyle = `rgba(255,${160 + Math.random() * 60},60,0.85)`;
        ctx.beginPath();
        ctx.arc(p.x - (p.tx / len) * 18, p.y - 4 - (p.ty / len) * 18, 4 + Math.random() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.save();
      ctx.globalAlpha = p.invuln > 0 && Math.floor(t * 12) % 2 ? 0.5 : 1;
      ctx.translate(p.x, p.y);
      ctx.rotate(G.clamp(p.vx * 0.003, -0.4, 0.4));
      ctx.fillStyle = "#c8d0dc";
      ctx.fillRect(-p.facing * 12 - 5, -18, 10, 18);
      G.drawKid(ctx, 0, 18, 0.4, G.marineLook(), { adult: true, t, facing: p.facing, pose: "stand", armAngle: p.welding ? 0.9 : -0.3 });
      G.drawSpaceHelmet(ctx, 0, 18, 0.4, p.facing);
      ctx.restore();
      ctx.globalAlpha = 1;

      if (this.flash > 0) {
        ctx.fillStyle = `rgba(200,40,40,${0.3 * (this.flash / 300)})`;
        ctx.fillRect(0, 0, W, H);
      }
      // oxygen bar
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(W / 2 - 100, 10, 200, 12);
      ctx.fillStyle = this.o2 < 25 && Math.floor(t * 6) % 2 ? "#ff4040" : "#6ab0ff";
      ctx.fillRect(W / 2 - 100, 10, 200 * Math.max(0, this.o2 / 100), 12);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`ZUURSTOF ${Math.max(0, Math.round(this.o2))}%`, W / 2, 20);
      ctx.fillStyle = "#ff6b6b";
      ctx.font = "16px Segoe UI, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("❤".repeat(Math.max(0, p.hp)), 14, 24);
      if (this.allFixed() && !this.won) {
        ctx.fillStyle = "#7affd0";
        ctx.font = "bold 13px Segoe UI, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("▼ luchtsluis", HATCH.x + HATCH.w / 2, HULL - 46 + Math.sin(t * 5) * 3);
      }
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return `Lekken ${this.leaks.filter((l) => l.done).length}/3 · zuurstof ${Math.max(0, Math.round(this.o2))}%`;
    },
  };
})();
