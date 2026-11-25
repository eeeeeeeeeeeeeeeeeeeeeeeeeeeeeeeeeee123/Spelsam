(() => {
  const { W, H } = G;
  const TURN = 3.6;
  const THRUST = 240;
  const DAMP = 0.5;
  const MAX_V = 280;
  const FIRE_MS = 220;
  const BOLT_SPEED = 520;
  const BOLT_LIFE = 900;
  const HP = 3;
  const INVULN_MS = 2000;
  const SHIP_R = 11;
  const SIZES = { 3: { r: 34, speed: 40, score: 1 }, 2: { r: 20, speed: 65, score: 1 }, 1: { r: 11, speed: 95, score: 1 } };
  const WAVES = [3, 4, 5];
  const STARS = Array.from({ length: 80 }, () => ({ x: Math.random() * W, y: Math.random() * H, b: 0.3 + Math.random() * 0.7 }));

  const wrap = (o, m = 0) => {
    if (o.x < -m) o.x += W + 2 * m;
    if (o.x > W + m) o.x -= W + 2 * m;
    if (o.y < -m) o.y += H + 2 * m;
    if (o.y > H + m) o.y -= H + 2 * m;
  };

  function drawSpace(ctx, t) {
    ctx.fillStyle = "#04050c";
    ctx.fillRect(0, 0, W, H);
    for (const s of STARS) {
      ctx.fillStyle = `rgba(255,255,255,${s.b * (0.7 + 0.3 * Math.sin((t || 0) * 2 + s.x))})`;
      ctx.fillRect(s.x, s.y, 1.5, 1.5);
    }
    // distant base where you are heading
    ctx.fillStyle = "rgba(122,255,208,0.12)";
    ctx.beginPath();
    ctx.arc(W - 40, 60, 30, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawShip(ctx, x, y, a, thrust, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(a);
    if (thrust) {
      ctx.fillStyle = `rgba(255,${150 + Math.random() * 80},60,0.9)`;
      ctx.beginPath();
      ctx.moveTo(-10, -5);
      ctx.lineTo(-20 - Math.random() * 8, 0);
      ctx.lineTo(-10, 5);
      ctx.fill();
    }
    ctx.fillStyle = "#d8e0ea";
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(-10, -11);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-10, 11);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#7affd0";
    ctx.beginPath();
    ctx.ellipse(3, 0, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  G.CAREER_LEVELS.marine[3] = {
    title: "Level 3 — Asteroïdenveld (23 jaar)",
    intro:
      "Je bent 23 en krijgt je eigen <strong>ruimteschip</strong>. Op weg naar de basis vlieg je een <strong>asteroïdenveld</strong> in.<br>" +
      "<strong>← →</strong> = draaien, <strong>↑</strong> = gas, <strong>↓</strong> = remmen, <strong>SPATIE</strong> / <strong>klik</strong> = schieten. Wie de rand uitvliegt komt er aan de andere kant weer in.<br>" +
      "Grote stenen breken in kleinere. Maak <strong>3 golven</strong> schoon. Je schip kan 3 klappen hebben.",

    drawBackground(ctx, t) {
      drawSpace(ctx, t);
    },

    start(api) {
      this.api = api;
      this.ship = { x: W / 2, y: H / 2, a: -Math.PI / 2, vx: 0, vy: 0, hp: HP, invuln: 1500, thrust: false };
      this.rocks = [];
      this.bolts = [];
      this.debris = [];
      this.wave = 0;
      this.fire = 0;
      this.popups = [];
      this.flash = 0;
      this.over = false;
      this.won = 0;
      this.waveDelay = 0;
      this.spawnWave();
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 1100 });
    },

    makeRock(x, y, size, dir) {
      const sz = SIZES[size];
      const a = dir ?? Math.random() * Math.PI * 2;
      const sp = sz.speed * (0.8 + Math.random() * 0.5);
      const pts = Array.from({ length: 9 }, () => 0.75 + Math.random() * 0.35);
      return { x, y, size, r: sz.r, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: 0, vr: (Math.random() - 0.5) * 2, pts, flash: 0 };
    },

    spawnWave() {
      const n = WAVES[this.wave];
      const sh = this.ship;
      for (let i = 0; i < n; i++) {
        let x, y;
        do {
          x = Math.random() * W;
          y = Math.random() * H;
        } while (Math.hypot(x - sh.x, y - sh.y) < 170);
        this.rocks.push(this.makeRock(x, y, 3));
      }
      this.popup(`Golf ${this.wave + 1}/${WAVES.length}`, W / 2, 100, "#7affd0");
    },

    doFire() {
      if (this.over || this.won || this.fire > 0) return;
      this.fire = FIRE_MS;
      const sh = this.ship;
      this.bolts.push({ x: sh.x + Math.cos(sh.a) * 16, y: sh.y + Math.sin(sh.a) * 16, vx: Math.cos(sh.a) * BOLT_SPEED + sh.vx, vy: Math.sin(sh.a) * BOLT_SPEED + sh.vy, life: BOLT_LIFE });
    },
    onAction() { this.doFire(); },
    onPointer() { this.doFire(); },

    hurt(rock) {
      const sh = this.ship;
      if (sh.invuln > 0) return;
      sh.hp--;
      sh.invuln = INVULN_MS;
      this.flash = 350;
      // knocked away from the rock
      const d = Math.hypot(sh.x - rock.x, sh.y - rock.y) || 1;
      sh.vx = ((sh.x - rock.x) / d) * 160;
      sh.vy = ((sh.y - rock.y) / d) * 160;
      this.popup("KLAP!", sh.x, sh.y - 24, "#ff6b6b");
      if (sh.hp <= 0) {
        this.over = true;
        this.api.fail("Je schip is verpletterd door de asteroïden.");
      }
    },

    breakRock(r) {
      r.dead = true;
      for (let i = 0; i < 6; i++) {
        const a = Math.random() * Math.PI * 2;
        this.debris.push({ x: r.x, y: r.y, vx: Math.cos(a) * 80, vy: Math.sin(a) * 80, life: 500 });
      }
      if (r.size > 1) {
        const base = Math.atan2(r.vy, r.vx);
        this.rocks.push(this.makeRock(r.x, r.y, r.size - 1, base + 0.7));
        this.rocks.push(this.makeRock(r.x, r.y, r.size - 1, base - 0.7));
      }
    },

    update(dt) {
      if (this.over) return;
      const s = dt / 1000;
      const sh = this.ship;
      this.popups = G.updatePopups(this.popups, dt);
      this.flash = Math.max(0, this.flash - dt);
      this.fire = Math.max(0, this.fire - dt);
      sh.invuln = Math.max(0, sh.invuln - dt);
      if (this.won) {
        this.won -= dt;
        if (this.won <= 0) {
          this.over = true;
          this.api.complete();
        }
      }
      if (G.held.action) this.doFire();

      if (G.held.left) sh.a -= TURN * s;
      if (G.held.right) sh.a += TURN * s;
      sh.thrust = !!G.held.up;
      if (sh.thrust) {
        sh.vx += Math.cos(sh.a) * THRUST * s;
        sh.vy += Math.sin(sh.a) * THRUST * s;
      }
      const damp = G.held.down ? 3 : DAMP;
      sh.vx *= 1 - Math.min(1, damp * s);
      sh.vy *= 1 - Math.min(1, damp * s);
      const sp = Math.hypot(sh.vx, sh.vy);
      if (sp > MAX_V) {
        sh.vx *= MAX_V / sp;
        sh.vy *= MAX_V / sp;
      }
      sh.x += sh.vx * s;
      sh.y += sh.vy * s;
      wrap(sh);

      for (const r of this.rocks) {
        r.x += r.vx * s;
        r.y += r.vy * s;
        r.rot += r.vr * s;
        r.flash = Math.max(0, r.flash - dt);
        wrap(r, r.r);
        if (!this.won && Math.hypot(r.x - sh.x, r.y - sh.y) < r.r * 0.85 + SHIP_R) this.hurt(r);
      }
      if (this.over) return;
      for (const b of this.bolts) {
        b.x += b.vx * s;
        b.y += b.vy * s;
        b.life -= dt;
        wrap(b);
        for (const r of this.rocks) {
          if (r.dead || Math.hypot(r.x - b.x, r.y - b.y) > r.r) continue;
          b.life = 0;
          this.breakRock(r);
          break;
        }
      }
      this.bolts = this.bolts.filter((b) => b.life > 0);
      this.rocks = this.rocks.filter((r) => !r.dead);
      for (const d of this.debris) {
        d.x += d.vx * s;
        d.y += d.vy * s;
        d.life -= dt;
      }
      this.debris = this.debris.filter((d) => d.life > 0);

      if (!this.won && this.rocks.length === 0) {
        if (this.waveDelay <= 0) this.waveDelay = 1500;
        this.waveDelay -= dt;
        if (this.waveDelay <= 0) {
          this.wave++;
          if (this.wave >= WAVES.length) {
            this.won = 2400;
            this.popup("Het veld is veilig! Op naar de maanbasis.", W / 2, 120, "#6ee07a");
          } else {
            sh.invuln = Math.max(sh.invuln, 1200);
            this.spawnWave();
          }
        }
      }
    },

    render(ctx, t) {
      drawSpace(ctx, t);
      for (const r of this.rocks) {
        ctx.save();
        ctx.translate(r.x, r.y);
        ctx.rotate(r.rot);
        ctx.fillStyle = "#7a6a5a";
        ctx.beginPath();
        r.pts.forEach((k, i) => {
          const a = (i / r.pts.length) * Math.PI * 2;
          const px = Math.cos(a) * r.r * k, py = Math.sin(a) * r.r * k;
          if (i) ctx.lineTo(px, py);
          else ctx.moveTo(px, py);
        });
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#5a4c40";
        ctx.beginPath();
        ctx.arc(r.r * 0.25, -r.r * 0.2, r.r * 0.22, 0, Math.PI * 2);
        ctx.arc(-r.r * 0.3, r.r * 0.25, r.r * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = "#c8b8a0";
      for (const d of this.debris) ctx.fillRect(d.x, d.y, 2, 2);
      ctx.fillStyle = "#7affd0";
      for (const b of this.bolts) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      const sh = this.ship;
      drawShip(ctx, sh.x, sh.y, sh.a, sh.thrust, sh.invuln > 0 && Math.floor(t * 10) % 2 ? 0.4 : 1);

      if (this.flash > 0) {
        ctx.fillStyle = `rgba(200,40,40,${0.3 * (this.flash / 350)})`;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.fillStyle = "#ff6b6b";
      ctx.font = "16px Segoe UI, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("❤".repeat(Math.max(0, sh.hp)), 14, 26);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return `Golf ${Math.min(this.wave + 1, WAVES.length)}/${WAVES.length} · stenen ${this.rocks.length}`;
    },
  };
})();
