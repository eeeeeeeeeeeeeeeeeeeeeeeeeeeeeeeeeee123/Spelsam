(() => {
  const { W, H } = G;
  const R = 17;
  const SPEED = 85;
  const TURN = 2.2;
  const TURRET_TURN = 3.2;
  const HP = 10;
  const RELOAD_MS = 900;
  const SHELL_SPEED = 380;
  const ENEMY_HP = 3;
  const ENEMY_TOTAL = 5;
  const ENEMY_MAX = 2;
  const ENEMY_SPEED = 55;
  const ENEMY_RELOAD = 2800;
  const ENEMY_SHELL = 235;
  const RUINS = [
    { x: 120, y: 90, w: 60, h: 40 }, { x: 330, y: 70, w: 40, h: 70 },
    { x: 230, y: 200, w: 80, h: 40 }, { x: 70, y: 280, w: 50, h: 60 },
    { x: 400, y: 260, w: 70, h: 40 }, { x: 250, y: 340, w: 40, h: 50 },
  ];
  const SPAWNS = [{ x: W - 40, y: 60 }, { x: W - 40, y: H - 40 }, { x: W / 2, y: 40 }];

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  const inRuin = (x, y) => RUINS.some((r) => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h);
  function collide(o) {
    for (const r of RUINS) {
      const cx = G.clamp(o.x, r.x, r.x + r.w), cy = G.clamp(o.y, r.y, r.y + r.h);
      const d = Math.hypot(o.x - cx, o.y - cy);
      if (d < R && d > 0) {
        o.x = cx + ((o.x - cx) / d) * R;
        o.y = cy + ((o.y - cy) / d) * R;
      }
    }
    o.x = G.clamp(o.x, R, W - R);
    o.y = G.clamp(o.y, R + 30, H - R);
  }
  function lineOfSight(a, b) {
    const n = Math.ceil(dist(a, b) / 10);
    for (let i = 1; i < n; i++) if (inRuin(a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n)) return false;
    return true;
  }

  function drawTank(ctx, t, body, turret, flash) {
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(t.angle);
    ctx.fillStyle = "#222";
    ctx.fillRect(-20, -17, 40, 7);
    ctx.fillRect(-20, 10, 40, 7);
    ctx.fillStyle = flash ? "#fff" : body;
    ctx.fillRect(-17, -12, 34, 24);
    ctx.restore();
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(t.turret);
    ctx.fillStyle = flash ? "#fff" : turret;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(0, -3, 28, 6);
    ctx.restore();
  }

  function drawField(ctx) {
    ctx.fillStyle = "#8a8064";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(0,0,0,0.06)";
    for (let i = 0; i < 30; i++) {
      ctx.beginPath();
      ctx.arc((i * 137) % W, 40 + ((i * 89) % (H - 40)), 6 + (i % 4) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const r of RUINS) {
      ctx.fillStyle = "#6a6258";
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = "#7a7268";
      ctx.fillRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8);
      ctx.fillStyle = "#5a5248";
      ctx.fillRect(r.x + r.w * 0.3, r.y, 6, r.h * 0.6);
    }
  }

  G.CAREER_LEVELS.soldaat[9] = {
    title: "Level 9 — Tankgevecht (29 jaar)",
    intro:
      "Je commandeert een <strong>tank</strong> in een verwoeste stad. Er komen <strong>5 vijandelijke tanks</strong> op je af.<br>" +
      "<strong>↑ ↓</strong> rijden, <strong>← →</strong> draaien. De <strong>loop</strong> richt naar de <strong>muis</strong>, vuren met <strong>klik</strong> / <strong>SPATIE</strong> (herladen duurt even).<br>" +
      "Ruïnes houden granaten tegen: gebruik ze als dekking!",

    drawBackground(ctx) {
      drawField(ctx);
      drawTank(ctx, { x: 60, y: H / 2, angle: 0, turret: 0 }, "#5a6a3a", "#4a5a2a", false);
    },

    start(api) {
      this.api = api;
      this.p = { x: 60, y: H / 2, angle: 0, turret: 0, hp: HP, reload: 0, flash: 0 };
      this.aim = { x: W / 2, y: H / 2 };
      this.enemies = [];
      this.spawned = 0;
      this.killed = 0;
      this.spawnTimer = 800;
      this.shells = [];
      this.booms = [];
      this.popups = [];
      this.flash = 0;
      this.over = false;
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 800 });
    },

    shoot(from, angle, speed, own) {
      this.shells.push({ x: from.x + Math.cos(angle) * 28, y: from.y + Math.sin(angle) * 28, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, own });
    },

    doFire() {
      const p = this.p;
      if (this.over || p.reload > 0) return;
      p.reload = RELOAD_MS;
      this.shoot(p, p.turret, SHELL_SPEED, true);
    },

    onAction() { this.doFire(); },
    onPointer(x, y) { this.aim = { x, y }; this.doFire(); },
    onPointerMove(x, y) { this.aim = { x, y }; },

    boom(x, y, big) {
      this.booms.push({ x, y, life: big ? 600 : 300, big });
    },

    update(dt) {
      if (this.over) return;
      const s = dt / 1000;
      const p = this.p;
      p.reload = Math.max(0, p.reload - dt);
      p.flash = Math.max(0, p.flash - dt);
      this.flash = Math.max(0, this.flash - dt);
      this.popups = G.updatePopups(this.popups, dt);
      for (const b of this.booms) b.life -= dt;
      this.booms = this.booms.filter((b) => b.life > 0);
      if (G.held.action) this.doFire();

      // driving: tank controls
      const turn = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
      const drive = (G.held.up ? 1 : 0) - (G.held.down ? 0.6 : 0);
      p.angle += turn * TURN * s;
      p.x += Math.cos(p.angle) * drive * SPEED * s;
      p.y += Math.sin(p.angle) * drive * SPEED * s;
      collide(p);
      const want = Math.atan2(this.aim.y - p.y, this.aim.x - p.x);
      p.turret += G.clamp(angDiff(want, p.turret), -TURRET_TURN * s, TURRET_TURN * s);

      // enemies roll in two at a time
      this.spawnTimer -= dt;
      const alive = this.enemies.filter((e) => !e.dead);
      if (this.spawnTimer <= 0 && alive.length < ENEMY_MAX && this.spawned < ENEMY_TOTAL) {
        this.spawnTimer = 2500;
        const sp = SPAWNS[this.spawned % SPAWNS.length];
        this.enemies.push({ x: sp.x, y: sp.y, angle: Math.PI, turret: Math.PI, hp: ENEMY_HP, reload: 1500 + Math.random() * 1000, flash: 0, goal: null, goalT: 0 });
        this.spawned++;
      }

      for (const e of this.enemies) {
        if (e.dead) continue;
        e.flash = Math.max(0, e.flash - dt);
        e.reload -= dt;
        e.goalT -= dt;
        const sees = lineOfSight(e, p);
        // drive toward a spot that has a view on you
        if (!e.goal || e.goalT <= 0 || dist(e, e.goal) < 12) {
          let best = null;
          for (let i = 0; i < 12; i++) {
            const c = { x: 40 + Math.random() * (W - 80), y: 60 + Math.random() * (H - 90) };
            if (inRuin(c.x, c.y)) continue;
            const d = dist(c, p);
            if (d < 140 || d > 320) continue;
            if (lineOfSight(c, p)) { best = c; break; }
            best = best || c;
          }
          e.goal = best || { x: e.x, y: e.y };
          e.goalT = 3500;
        }
        const ga = Math.atan2(e.goal.y - e.y, e.goal.x - e.x);
        e.angle += G.clamp(angDiff(ga, e.angle), -TURN * 0.8 * s, TURN * 0.8 * s);
        if (dist(e, e.goal) > 12 && Math.abs(angDiff(ga, e.angle)) < 0.8) {
          const ox = e.x, oy = e.y;
          e.x += Math.cos(e.angle) * ENEMY_SPEED * s;
          e.y += Math.sin(e.angle) * ENEMY_SPEED * s;
          collide(e);
          if (Math.hypot(e.x - ox, e.y - oy) < ENEMY_SPEED * s * 0.3) e.goalT = 0;
        }
        const ta = Math.atan2(p.y - e.y, p.x - e.x);
        e.turret += G.clamp(angDiff(ta, e.turret), -TURRET_TURN * 0.6 * s, TURRET_TURN * 0.6 * s);
        if (sees && e.reload <= 0 && Math.abs(angDiff(ta, e.turret)) < 0.12) {
          e.reload = ENEMY_RELOAD + Math.random() * 800;
          this.shoot(e, e.turret, ENEMY_SHELL, false);
        }
      }

      for (const sh of this.shells) {
        sh.x += sh.vx * s;
        sh.y += sh.vy * s;
        if (sh.x < 0 || sh.x > W || sh.y < 0 || sh.y > H || inRuin(sh.x, sh.y)) {
          sh.done = true;
          this.boom(sh.x, sh.y, false);
          continue;
        }
        if (sh.own) {
          for (const e of this.enemies) {
            if (e.dead || dist(sh, e) > R + 3) continue;
            sh.done = true;
            e.hp--;
            e.flash = 120;
            this.boom(sh.x, sh.y, false);
            if (e.hp <= 0) {
              e.dead = true;
              this.killed++;
              this.boom(e.x, e.y, true);
              this.popup("TANK KAPOT!", e.x, e.y - 30, "#6ee07a");
              if (this.killed >= ENEMY_TOTAL) {
                this.over = true;
                this.api.complete();
                return;
              }
            }
            break;
          }
        } else if (dist(sh, p) < R + 3) {
          sh.done = true;
          p.hp--;
          p.flash = 150;
          this.flash = 300;
          this.boom(sh.x, sh.y, false);
          this.popup("-1 pantser", p.x, p.y - 30, "#ff6b6b");
          if (p.hp <= 0) {
            this.over = true;
            this.api.fail("Je tank is uitgeschakeld.");
            return;
          }
        }
      }
      this.shells = this.shells.filter((sh) => !sh.done);
    },

    render(ctx, t) {
      drawField(ctx);
      for (const e of this.enemies) {
        if (e.dead) {
          ctx.fillStyle = "#2a2622";
          ctx.save();
          ctx.translate(e.x, e.y);
          ctx.rotate(e.angle);
          ctx.fillRect(-18, -14, 36, 28);
          ctx.restore();
          ctx.fillStyle = "rgba(60,60,60,0.4)";
          ctx.beginPath();
          ctx.arc(e.x + Math.sin(t * 2) * 3, e.y - 20 - ((t * 15) % 15), 10, 0, Math.PI * 2);
          ctx.fill();
          continue;
        }
        drawTank(ctx, e, "#8a5a3a", "#6a4a2a", e.flash > 0);
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(e.x - 16, e.y - 28, 32, 4);
        ctx.fillStyle = "#e05050";
        ctx.fillRect(e.x - 16, e.y - 28, 32 * (e.hp / ENEMY_HP), 4);
        if (e.reload < 500 && lineOfSight(e, this.p)) {
          ctx.strokeStyle = "rgba(255,60,60,0.4)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(e.x, e.y);
          ctx.lineTo(e.x + Math.cos(e.turret) * 600, e.y + Math.sin(e.turret) * 600);
          ctx.stroke();
        }
      }
      drawTank(ctx, this.p, "#5a6a3a", "#4a5a2a", this.p.flash > 0);

      for (const sh of this.shells) {
        ctx.fillStyle = sh.own ? "#ffe066" : "#ff7040";
        ctx.beginPath();
        ctx.arc(sh.x, sh.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const b of this.booms) {
        const k = b.life / (b.big ? 600 : 300);
        ctx.fillStyle = `rgba(255,${140 + k * 80},40,${k})`;
        ctx.beginPath();
        ctx.arc(b.x, b.y, (b.big ? 34 : 14) * (1.3 - k * 0.3), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.aim.x, this.aim.y, 9, 0, Math.PI * 2);
      ctx.stroke();

      if (this.flash > 0) {
        ctx.fillStyle = `rgba(200,40,40,${0.25 * (this.flash / 300)})`;
        ctx.fillRect(0, 0, W, H);
      }

      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(10, 8, 160, 12);
      ctx.fillRect(10, 24, 80, 6);
      ctx.fillStyle = "#6ee07a";
      ctx.fillRect(10, 8, 160 * (this.p.hp / HP), 12);
      ctx.fillStyle = this.p.reload > 0 ? "#888" : "#ffd24a";
      ctx.fillRect(10, 24, 80 * (1 - this.p.reload / RELOAD_MS), 6);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 13px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`Tanks: ${this.killed}/${ENEMY_TOTAL}`, W - 12, 22);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return `Vijandelijke tanks ${this.killed}/${ENEMY_TOTAL} · pantser ${this.p.hp}`;
    },
  };
})();
