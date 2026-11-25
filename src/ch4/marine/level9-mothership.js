(() => {
  const { W, H } = G;
  const SEG = 40;
  const SCROLL = 170;
  const LENGTH = 5600;
  const SPEED = 210;
  const SHIP_R = 10;
  const HP = 5;
  const INVULN_MS = 1100;
  const FIRE_MS = 170;
  const BOLT_SPEED = 620;
  const TURRET_HP = 3;
  const CORE = { x: 430, y: 225 };
  const CORE_R = 32;
  const SHIELD_R = 72;
  const CORE_HP = 24;
  const ARCS = 3;
  const ARC_SIZE = (80 * Math.PI) / 180;

  function buildTunnel() {
    const n = Math.ceil((LENGTH + W * 2) / SEG);
    const top = [], bot = [];
    let c = 225, gap = 230;
    for (let i = 0; i < n; i++) {
      const k = i / n;
      const target = 170 - k * 30;
      gap += (target - gap) * 0.05 + (Math.random() - 0.5) * 8;
      c += (Math.random() - 0.5) * 40;
      c = G.clamp(c, 60 + gap / 2, H - 20 - gap / 2);
      top.push(c - gap / 2);
      bot.push(c + gap / 2);
    }
    // the first screen is wide and straight
    for (let i = 0; i < Math.ceil(W / SEG) + 2; i++) {
      top[i] = 70;
      bot[i] = H - 30;
    }
    return { top, bot };
  }

  G.CAREER_LEVELS.marine[9] = {
    title: "Level 9 — Het moederschip (29 jaar)",
    intro:
      "Je bent 29. Boven de aarde hangt het <strong>moederschip</strong>: hetzelfde schip waarmee de aliens ooit het <strong>Witte Huis van President Goudkuif</strong> aanvielen.<br>" +
      "Vlieg met <strong>pijltjes / WASD</strong> door de <strong>tunnels</strong> naar binnen en schiet met <strong>SPATIE</strong> / <strong>klik</strong>. Raak de wanden niet en schiet de geschutskoepels kapot.<br>" +
      "In het hart staat de <strong>reactor</strong> met een draaiend schild: schiet door de <strong>gaten</strong> in het schild!",

    drawBackground(ctx) {
      ctx.fillStyle = "#0a0614";
      ctx.fillRect(0, 0, W, H);
    },

    start(api) {
      this.api = api;
      this.phase = "tunnel";
      this.tunnel = buildTunnel();
      this.dist = 0;
      this.ship = { x: 80, y: H / 2, hp: HP, invuln: 0 };
      this.turrets = [];
      for (let wx = 700; wx < LENGTH - 200; wx += 260 + Math.random() * 160) this.turrets.push({ wx, top: Math.random() < 0.5, hp: TURRET_HP, fireT: Math.random() * 1500, flash: 0 });
      this.drones = [];
      this.droneT = 3000;
      this.bolts = [];
      this.shots = [];
      this.sparks = [];
      this.fire = 0;
      this.popups = [];
      this.flash = 0;
      this.over = false;
      this.won = 0;
      this.core = null;
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 1100 });
    },

    wallAt(wx) {
      const { top, bot } = this.tunnel;
      const i = Math.floor(wx / SEG), f = wx / SEG - i;
      const ia = G.clamp(i, 0, top.length - 1), ib = G.clamp(i + 1, 0, top.length - 1);
      return { top: top[ia] + (top[ib] - top[ia]) * f, bot: bot[ia] + (bot[ib] - bot[ia]) * f };
    },

    doFire() {
      if (this.over || this.won || this.fire > 0) return;
      this.fire = FIRE_MS;
      const sh = this.ship;
      this.bolts.push({ x: sh.x + 16, y: sh.y, vx: BOLT_SPEED, vy: 0 });
    },
    onAction() { this.doFire(); },
    onPointer() { this.doFire(); },

    hurt(text = "-1 ❤") {
      const sh = this.ship;
      if (sh.invuln > 0 || this.over || this.won) return;
      sh.hp--;
      sh.invuln = INVULN_MS;
      this.flash = 300;
      this.popup(text, sh.x, sh.y - 24, "#ff6b6b");
      if (sh.hp <= 0) {
        this.over = true;
        this.api.fail("Je schip is neergeschoten in het moederschip.");
      }
    },

    startReactor() {
      this.phase = "reactor";
      this.core = { hp: CORE_HP, rot: 0, burstT: 2000, flash: 0, burstRot: 0 };
      this.turrets = [];
      this.drones = [];
      this.shots = [];
      this.popup("De reactor! Schiet door de gaten in het schild.", W / 2, 70, "#7affd0");
    },

    shieldBlocks(x, y) {
      const a = Math.atan2(y - CORE.y, x - CORE.x);
      for (let i = 0; i < ARCS; i++) {
        const start = this.core.rot + (i * Math.PI * 2) / ARCS;
        const d = Math.atan2(Math.sin(a - start), Math.cos(a - start));
        if (d >= 0 && d <= ARC_SIZE) return true;
      }
      return false;
    },

    update(dt) {
      if (this.over) return;
      const s = dt / 1000;
      const sh = this.ship;
      this.popups = G.updatePopups(this.popups, dt);
      this.flash = Math.max(0, this.flash - dt);
      this.fire = Math.max(0, this.fire - dt);
      sh.invuln = Math.max(0, sh.invuln - dt);
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
      if (G.held.action || G.mouseDown) this.doFire();

      const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
      const my = (G.held.down ? 1 : 0) - (G.held.up ? 1 : 0);
      if (mx || my) {
        const len = Math.hypot(mx, my);
        sh.x += (mx / len) * SPEED * s;
        sh.y += (my / len) * SPEED * s;
      }
      sh.x = G.clamp(sh.x, 24, this.phase === "tunnel" ? 300 : 280);
      sh.y = G.clamp(sh.y, 50, H - 16);

      if (this.phase === "tunnel") {
        this.dist += SCROLL * s;
        const wall = this.wallAt(this.dist + sh.x);
        if (sh.y - SHIP_R < wall.top || sh.y + SHIP_R > wall.bot) {
          this.hurt("De wand! -1 ❤");
          sh.y = (wall.top + wall.bot) / 2;
        }
        if (this.over) return;
        if (this.dist >= LENGTH) {
          this.startReactor();
          return;
        }
        // turrets on the walls
        for (const tr of this.turrets) {
          tr.flash = Math.max(0, tr.flash - dt);
          const sx = tr.wx - this.dist;
          if (tr.hp <= 0 || sx < -20 || sx > W + 20) continue;
          const w = this.wallAt(tr.wx);
          tr.x = sx;
          tr.y = tr.top ? w.top + 8 : w.bot - 8;
          tr.fireT -= dt;
          if (tr.fireT <= 0 && sx < W - 20 && sx > sh.x + 40) {
            tr.fireT = 1700;
            const a = Math.atan2(sh.y - tr.y, sh.x - tr.x);
            this.shots.push({ x: tr.x, y: tr.y, vx: Math.cos(a) * 200 - SCROLL * 0.3, vy: Math.sin(a) * 200 });
          }
        }
        this.droneT -= dt;
        if (this.droneT <= 0) {
          this.droneT = 2600 + Math.random() * 1600;
          const w = this.wallAt(this.dist + W);
          this.drones.push({ x: W + 20, baseY: (w.top + w.bot) / 2, ph: Math.random() * 6, hp: 1 });
        }
        for (const d of this.drones) {
          d.x -= (SCROLL + 70) * s;
          d.ph += s * 3;
          const w = this.wallAt(this.dist + d.x);
          d.y = G.clamp(d.baseY + Math.sin(d.ph) * 50, w.top + 14, w.bot - 14);
          if (Math.hypot(d.x - sh.x, d.y - sh.y) < SHIP_R + 10) {
            d.dead = true;
            this.hurt();
          }
        }
        this.drones = this.drones.filter((d) => !d.dead && d.x > -30);
      } else {
        const c = this.core;
        c.flash = Math.max(0, c.flash - dt);
        c.rot += s * (c.hp < CORE_HP / 2 ? 1.25 : 0.9);
        c.burstT -= dt;
        if (c.burstT <= 0) {
          c.burstT = c.hp < CORE_HP / 2 ? 1500 : 1900;
          c.burstRot += 0.35;
          const n = c.hp < CORE_HP / 2 ? 12 : 10;
          for (let i = 0; i < n; i++) {
            const a = c.burstRot + (i / n) * Math.PI * 2;
            this.shots.push({ x: CORE.x + Math.cos(a) * 40, y: CORE.y + Math.sin(a) * 40, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140 });
          }
        }
      }

      for (const sp of this.shots) {
        sp.x += sp.vx * s;
        sp.y += sp.vy * s;
        if (sp.x < -10 || sp.x > W + 10 || sp.y < 30 || sp.y > H + 10) sp.done = true;
        else if (Math.hypot(sp.x - sh.x, sp.y - sh.y) < SHIP_R + 3) {
          sp.done = true;
          this.hurt();
        }
      }
      this.shots = this.shots.filter((sp) => !sp.done);
      if (this.over) return;

      for (const b of this.bolts) {
        const ox = b.x;
        b.x += b.vx * s;
        if (b.x > W + 10) {
          b.done = true;
          continue;
        }
        if (this.phase === "tunnel") {
          const w = this.wallAt(this.dist + b.x);
          if (b.y < w.top || b.y > w.bot) {
            b.done = true;
            continue;
          }
          for (const tr of this.turrets) {
            if (tr.hp <= 0 || tr.x === undefined || Math.hypot(tr.x - b.x, tr.y - b.y) > 14) continue;
            b.done = true;
            tr.hp--;
            tr.flash = 90;
            if (tr.hp <= 0) this.popup("Koepel kapot!", tr.x, tr.y + (tr.top ? 30 : -20), "#6ee07a");
            break;
          }
          for (const d of this.drones) {
            if (b.done || d.dead || Math.hypot(d.x - b.x, d.y - b.y) > 13) continue;
            b.done = true;
            d.dead = true;
          }
        } else {
          const c = this.core;
          const dOld = Math.hypot(ox - CORE.x, b.y - CORE.y), dNew = Math.hypot(b.x - CORE.x, b.y - CORE.y);
          if (dOld > SHIELD_R && dNew <= SHIELD_R && this.shieldBlocks(b.x, b.y)) {
            b.done = true;
            for (let i = 0; i < 4; i++) this.sparks.push({ x: b.x, y: b.y, vx: -Math.random() * 150, vy: (Math.random() - 0.5) * 150, life: 250 });
            continue;
          }
          if (dNew < CORE_R) {
            b.done = true;
            c.hp--;
            c.flash = 90;
            if (c.hp <= 0) {
              this.won = 3200;
              this.shots = [];
              this.popup("De reactor ontploft! Wegwezen!", W / 2, 80, "#6ee07a");
            }
          }
        }
      }
      this.bolts = this.bolts.filter((b) => !b.done);
    },

    render(ctx, t) {
      ctx.fillStyle = "#0a0614";
      ctx.fillRect(0, 0, W, H);
      const sh = this.ship;
      if (this.phase === "tunnel") {
        // glowing corridor
        ctx.fillStyle = "#1a0c2a";
        ctx.fillRect(0, 40, W, H - 40);
        for (let x = -((this.dist * 0.5) % 60); x < W; x += 60) {
          ctx.fillStyle = "rgba(160,90,255,0.08)";
          ctx.fillRect(x, 40, 4, H);
        }
        const drawWall = (isTop) => {
          ctx.beginPath();
          ctx.moveTo(0, isTop ? 0 : H);
          for (let x = 0; x <= W; x += 10) {
            const w = this.wallAt(this.dist + x);
            ctx.lineTo(x, isTop ? w.top : w.bot);
          }
          ctx.lineTo(W, isTop ? 0 : H);
          ctx.closePath();
          ctx.fillStyle = "#3a2a5a";
          ctx.fill();
          ctx.strokeStyle = "#a070ff";
          ctx.lineWidth = 2;
          ctx.stroke();
        };
        drawWall(true);
        drawWall(false);
        for (const tr of this.turrets) {
          if (tr.hp <= 0 || tr.x === undefined || tr.x < -20 || tr.x > W + 20) continue;
          ctx.fillStyle = tr.flash > 0 ? "#fff" : "#7a5aaa";
          ctx.beginPath();
          ctx.arc(tr.x, tr.y + (tr.top ? -8 : 8), 13, tr.top ? 0 : Math.PI, tr.top ? Math.PI : 0);
          ctx.fill();
          ctx.fillStyle = "#ff4060";
          ctx.beginPath();
          ctx.arc(tr.x, tr.y + (tr.top ? -2 : 2), 4, 0, Math.PI * 2);
          ctx.fill();
        }
        for (const d of this.drones) {
          ctx.fillStyle = "#b0ff70";
          ctx.beginPath();
          ctx.moveTo(d.x - 10, d.y);
          ctx.lineTo(d.x, d.y - 8);
          ctx.lineTo(d.x + 10, d.y);
          ctx.lineTo(d.x, d.y + 8);
          ctx.fill();
          ctx.fillStyle = "#111";
          ctx.beginPath();
          ctx.arc(d.x - 2, d.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        // progress
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(W / 2 - 100, 12, 200, 8);
        ctx.fillStyle = "#a070ff";
        ctx.fillRect(W / 2 - 100, 12, 200 * Math.min(1, this.dist / LENGTH), 8);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 9px Segoe UI, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("NAAR DE REACTOR", W / 2, 32);
      } else {
        const c = this.core;
        ctx.fillStyle = "#140a24";
        ctx.fillRect(0, 40, W, H - 40);
        for (let i = 0; i < 12; i++) {
          ctx.strokeStyle = `rgba(160,90,255,${0.08 + 0.05 * Math.sin(t * 3 + i)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(CORE.x, CORE.y, 90 + i * 30, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (!this.won || Math.floor(t * 12) % 2) {
          const g = ctx.createRadialGradient(CORE.x, CORE.y, 4, CORE.x, CORE.y, CORE_R);
          g.addColorStop(0, "#fff");
          g.addColorStop(0.5, c.flash > 0 ? "#fff" : "#b0ff70");
          g.addColorStop(1, "#3a8a2a");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(CORE.x, CORE.y, CORE_R + Math.sin(t * 8) * 2, 0, Math.PI * 2);
          ctx.fill();
        }
        if (!this.won) {
          ctx.strokeStyle = "#5aaaff";
          ctx.lineWidth = 8;
          for (let i = 0; i < ARCS; i++) {
            const start = c.rot + (i * Math.PI * 2) / ARCS;
            ctx.beginPath();
            ctx.arc(CORE.x, CORE.y, SHIELD_R, start, start + ARC_SIZE);
            ctx.stroke();
          }
        }
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(W / 2 - 110, 12, 220, 10);
        ctx.fillStyle = "#b0ff70";
        ctx.fillRect(W / 2 - 110, 12, 220 * Math.max(0, c.hp / CORE_HP), 10);
        if (this.won) {
          ctx.fillStyle = `rgba(255,255,255,${Math.max(0, 0.6 - this.won / 6000)})`;
          ctx.fillRect(0, 0, W, H);
        }
      }
      ctx.fillStyle = "#ff7090";
      for (const sp of this.shots) {
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#9fd3ff";
      for (const sp of this.sparks) ctx.fillRect(sp.x, sp.y, 2, 2);
      ctx.fillStyle = "#7affd0";
      for (const b of this.bolts) ctx.fillRect(b.x - 6, b.y - 1.5, 12, 3);

      // your ship
      ctx.save();
      ctx.globalAlpha = sh.invuln > 0 && Math.floor(t * 10) % 2 ? 0.4 : 1;
      ctx.translate(sh.x, sh.y);
      ctx.fillStyle = `rgba(255,${150 + Math.random() * 80},60,0.9)`;
      ctx.beginPath();
      ctx.moveTo(-10, -4);
      ctx.lineTo(-20 - Math.random() * 8, 0);
      ctx.lineTo(-10, 4);
      ctx.fill();
      ctx.fillStyle = "#d8e0ea";
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(-10, -10);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-10, 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#7affd0";
      ctx.beginPath();
      ctx.ellipse(3, 0, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;

      if (this.flash > 0) {
        ctx.fillStyle = `rgba(200,40,40,${0.3 * (this.flash / 300)})`;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.fillStyle = "#ff6b6b";
      ctx.font = "16px Segoe UI, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("❤".repeat(Math.max(0, sh.hp)), 12, 26);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return this.phase === "tunnel" ? `Moederschip · ${Math.min(100, Math.round((this.dist / LENGTH) * 100))}%` : `Reactor ${Math.max(0, this.core.hp)}/${CORE_HP}`;
    },
  };
})();
