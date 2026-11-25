(() => {
  const { W, H } = G;
  const GROUND = 392;
  const SPEED = 95;
  const JET = 1100;
  const GRAV = 700;
  const FUEL_MAX = 100;
  const MECH_HP = 100;
  const FIRE_MS = 110;
  const BULLET_SPEED = 720;
  const ROCKET_MS = 3200;
  const ROCKET_DMG = 4;
  const LOB_G = 420;
  const LOB_DMG = 9;
  const BOMB_DMG = 7;
  const BEAM_WARN = 1300;
  const BEAM_MS = 600;
  const BEAM_DMG = 18;
  const TANK_HP = 12;
  const SAUCER_HP = 7;
  const BOSS_HP = 70;
  const WAVES = [
    { tanks: 2, saucers: 1 },
    { tanks: 3, saucers: 2 },
    { boss: true, saucers: 2 },
  ];

  function drawField(ctx, t) {
    const g = ctx.createLinearGradient(0, 0, 0, GROUND);
    g.addColorStop(0, "#3a1a3a");
    g.addColorStop(1, "#a0503a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, GROUND);
    // two moons
    ctx.fillStyle = "rgba(255,220,180,0.8)";
    ctx.beginPath();
    ctx.arc(400, 80, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(180,220,255,0.6)";
    ctx.beginPath();
    ctx.arc(450, 58, 12, 0, Math.PI * 2);
    ctx.fill();
    // alien rock spires
    ctx.fillStyle = "#5a2a3a";
    for (const [x, h] of [[30, 120], [210, 80], [330, 140], [470, 100], [520, 60]]) {
      ctx.beginPath();
      ctx.moveTo(x - 24, GROUND);
      ctx.lineTo(x - 6, GROUND - h);
      ctx.lineTo(x + 8, GROUND - h + 16);
      ctx.lineTo(x + 26, GROUND);
      ctx.fill();
    }
    ctx.fillStyle = "#4a2a20";
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = "#5a3428";
    for (let x = ((-(t || 0) * 0) % 40); x < W; x += 40) ctx.fillRect(x, GROUND + 6, 20, 4);
  }

  function drawMech(ctx, m, t, aim, flash) {
    const step = m.moving && m.onGround ? Math.sin(t * 9) * 8 : 0;
    const bx = m.x, by = m.y - 50;
    // legs
    ctx.strokeStyle = flash ? "#fff" : "#5a6a7a";
    ctx.lineWidth = 9;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(bx - 12, by + 14);
    ctx.lineTo(bx - 20 + step, by + 32);
    ctx.lineTo(bx - 14 + step, m.y);
    ctx.moveTo(bx + 12, by + 14);
    ctx.lineTo(bx + 20 - step, by + 32);
    ctx.lineTo(bx + 14 - step, m.y);
    ctx.stroke();
    ctx.lineCap = "butt";
    ctx.fillStyle = "#3a4450";
    ctx.fillRect(bx - 24 + step, m.y - 4, 18, 6);
    ctx.fillRect(bx + 6 - step, m.y - 4, 18, 6);
    // body
    ctx.fillStyle = flash ? "#fff" : "#8a9aaa";
    ctx.beginPath();
    ctx.roundRect(bx - 28, by - 30, 56, 46, 10);
    ctx.fill();
    ctx.fillStyle = "#e0c040";
    ctx.fillRect(bx - 28, by + 6, 56, 4);
    // cockpit with you inside
    ctx.fillStyle = "rgba(122,255,208,0.35)";
    ctx.beginPath();
    ctx.arc(bx, by - 12, 13, 0, Math.PI * 2);
    ctx.fill();
    const look = G.marineLook();
    ctx.fillStyle = look.skin;
    ctx.beginPath();
    ctx.arc(bx + m.facing * 2, by - 12, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#e0e8f0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bx, by - 12, 13, 0, Math.PI * 2);
    ctx.stroke();
    // jet flames
    if (m.jet) {
      ctx.fillStyle = `rgba(255,${150 + Math.random() * 90},60,0.9)`;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(bx + s * 22 - 5, by + 16);
        ctx.lineTo(bx + s * 22, by + 34 + Math.random() * 12);
        ctx.lineTo(bx + s * 22 + 5, by + 16);
        ctx.fill();
      }
    }
    // gun arm
    const ang = Math.atan2(aim.y - (by - 6), aim.x - bx);
    ctx.save();
    ctx.translate(bx, by - 6);
    ctx.rotate(ang);
    ctx.fillStyle = "#4a5460";
    ctx.fillRect(10, -6, 36, 12);
    ctx.fillStyle = "#2a3038";
    ctx.fillRect(40, -4, 14, 8);
    ctx.restore();
    // rocket pod
    ctx.fillStyle = m.rocketReady ? "#d04040" : "#6a3a3a";
    ctx.fillRect(bx - m.facing * 30 - 8, by - 38, 16, 14);
  }

  function drawTank(ctx, e, t) {
    const hover = Math.sin(t * 4 + e.seed) * 2;
    const y = GROUND - 16 + hover;
    ctx.fillStyle = "rgba(122,255,160,0.25)";
    ctx.beginPath();
    ctx.ellipse(e.x, GROUND - 2, 30, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = e.flash > 0 ? "#fff" : e.boss ? "#6a3a8a" : "#4a8a4a";
    const s = e.boss ? 1.8 : 1;
    ctx.beginPath();
    ctx.ellipse(e.x, y - 6 * s, 30 * s, 12 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = e.flash > 0 ? "#fff" : e.boss ? "#8a5aaa" : "#6aaa5a";
    ctx.beginPath();
    ctx.arc(e.x, y - 16 * s, 12 * s, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = "#2a4a2a";
    ctx.lineWidth = 5 * s;
    ctx.beginPath();
    ctx.moveTo(e.x, y - 20 * s);
    ctx.lineTo(e.x - 24 * s, y - 30 * s);
    ctx.stroke();
    // little alien pilot
    ctx.fillStyle = "#b0ff70";
    ctx.beginPath();
    ctx.arc(e.x + 4 * s, y - 22 * s, 4 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(e.x - 24 * s, y - 44 * s, 48 * s, 4);
    ctx.fillStyle = "#b0ff70";
    ctx.fillRect(e.x - 24 * s, y - 44 * s, 48 * s * Math.max(0, e.hp / e.maxHp), 4);
  }

  function drawSaucer(ctx, e, t) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.fillStyle = e.flash > 0 ? "#fff" : "#9aa8b8";
    ctx.beginPath();
    ctx.ellipse(0, 0, 26, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(120,255,180,0.7)";
    ctx.beginPath();
    ctx.ellipse(0, -5, 11, 8, 0, Math.PI, 0);
    ctx.fill();
    for (let i = -2; i <= 2; i++) {
      ctx.fillStyle = Math.floor(t * 6 + i) % 2 ? "#ffd24a" : "#ff4040";
      ctx.beginPath();
      ctx.arc(i * 9, 3, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  G.CAREER_LEVELS.marine[8] = {
    title: "Level 8 — Mech-gevecht (28 jaar)",
    intro:
      "Je bent 28 en terug op de alienplaneet, nu in een enorme <strong>gevechtsmech</strong>. De aliens sturen hun <strong>tanks</strong> en <strong>UFO's</strong> op je af.<br>" +
      "<strong>← →</strong> = lopen, <strong>↑</strong> = straalmotoren (springen/zweven), <strong>↓</strong> = <strong>raketten</strong>. Mik met de <strong>muis</strong> en houd <strong>klik</strong> / <strong>SPATIE</strong> ingedrukt voor je machinegeweer.<br>" +
      "Paarse bollen komen in een boog: loop weg van de rode cirkel. In golf 3 komt een <strong>reuzentank</strong> met een laserstraal: <strong>spring eroverheen</strong>!",

    drawBackground(ctx, t) {
      drawField(ctx, t);
    },

    start(api) {
      this.api = api;
      this.m = { x: 100, y: GROUND, vy: 0, hp: MECH_HP, fuel: FUEL_MAX, facing: 1, moving: false, onGround: true, jet: false, rocketT: 0, rocketReady: true, flash: 0 };
      this.aim = { x: 400, y: GROUND - 30 };
      this.fire = 0;
      this.bullets = [];
      this.rockets = [];
      this.enemies = [];
      this.lobs = [];
      this.bombs = [];
      this.beam = null;
      this.booms = [];
      this.wave = 0;
      this.waveDelay = 1500;
      this.queue = [];
      this.spawnT = 0;
      this.popups = [];
      this.flash = 0;
      this.over = false;
      this.won = 0;
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 1100 });
    },

    startWave() {
      const w = WAVES[this.wave];
      this.queue = [];
      if (w.boss) this.queue.push("boss");
      for (let i = 0; i < (w.tanks || 0); i++) this.queue.push("tank");
      for (let i = 0; i < w.saucers; i++) this.queue.push("saucer");
      this.spawnT = 0;
      this.popup(w.boss ? "Golf 3: de REUZENTANK!" : `Golf ${this.wave + 1}/${WAVES.length}`, W / 2, 110, w.boss ? "#ff8a3a" : "#7affd0");
    },

    spawn(kind) {
      if (kind === "saucer") this.enemies.push({ kind, x: W + 30, y: 70 + Math.random() * 80, hp: SAUCER_HP, maxHp: SAUCER_HP, flash: 0, vx: -70, bombT: 1500, seed: Math.random() * 9 });
      else {
        const boss = kind === "boss";
        this.enemies.push({ kind: "tank", boss, x: W + 50, stopX: boss ? 440 : 300 + Math.random() * 190, hp: boss ? BOSS_HP : TANK_HP, maxHp: boss ? BOSS_HP : TANK_HP, flash: 0, fireT: 1500 + Math.random() * 1000, beamT: 4000, seed: Math.random() * 9 });
      }
    },

    doFire() {
      if (this.over || this.won || this.fire > 0) return;
      this.fire = FIRE_MS;
      const m = this.m;
      const ox = m.x, oy = m.y - 56;
      const a = Math.atan2(this.aim.y - oy, this.aim.x - ox) + (Math.random() - 0.5) * 0.05;
      this.bullets.push({ x: ox + Math.cos(a) * 50, y: oy + Math.sin(a) * 50, vx: Math.cos(a) * BULLET_SPEED, vy: Math.sin(a) * BULLET_SPEED });
    },
    onAction() { this.doFire(); },
    onPointer(x, y) { this.aim = { x, y }; this.doFire(); },
    onPointerMove(x, y) { this.aim = { x, y }; },

    fireRockets() {
      const m = this.m;
      if (m.rocketT > 0 || this.over || this.won || !this.enemies.length) return;
      m.rocketT = ROCKET_MS;
      for (let i = 0; i < 3; i++) this.rockets.push({ x: m.x - m.facing * 30, y: m.y - 88, vx: (i - 1) * 60, vy: -260, life: 2500, target: null });
    },

    hurt(dmg, text) {
      const m = this.m;
      if (this.over || this.won) return;
      m.hp -= dmg;
      m.flash = 120;
      this.flash = 250;
      this.popup(text || `-${dmg}`, m.x, m.y - 110, "#ff6b6b");
      if (m.hp <= 0) {
        this.over = true;
        this.api.fail("Je mech is uit elkaar geschoten. Je klimt er nog net op tijd uit...");
      }
    },

    hitsMech(x, y, pad = 0) {
      const m = this.m;
      return x > m.x - 30 - pad && x < m.x + 30 + pad && y > m.y - 92 - pad && y < m.y + pad;
    },

    update(dt) {
      if (this.over) return;
      const s = dt / 1000;
      const m = this.m;
      this.popups = G.updatePopups(this.popups, dt);
      this.flash = Math.max(0, this.flash - dt);
      this.fire = Math.max(0, this.fire - dt);
      m.flash = Math.max(0, m.flash - dt);
      m.rocketT = Math.max(0, m.rocketT - dt);
      m.rocketReady = m.rocketT <= 0;
      for (const b of this.booms) b.life -= dt;
      this.booms = this.booms.filter((b) => b.life > 0);
      if (this.won) {
        this.won -= dt;
        if (this.won <= 0) {
          this.over = true;
          this.api.complete();
        }
        return;
      }
      if (G.held.action || G.mouseDown) this.doFire();
      if (G.held.down) this.fireRockets();

      // walking and jump jets
      const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
      m.moving = !!mx;
      m.x = G.clamp(m.x + mx * SPEED * s, 34, W - 34);
      m.facing = this.aim.x >= m.x ? 1 : -1;
      m.jet = G.held.up && m.fuel > 0;
      if (m.jet) {
        m.vy -= JET * s;
        m.fuel = Math.max(0, m.fuel - 45 * s);
      } else if (m.onGround) m.fuel = Math.min(FUEL_MAX, m.fuel + 35 * s);
      m.vy += GRAV * s;
      m.vy = Math.max(m.vy, -260);
      m.y += m.vy * s;
      if (m.y < 140) {
        m.y = 140;
        m.vy = Math.max(0, m.vy);
      }
      m.onGround = m.y >= GROUND;
      if (m.onGround) {
        m.y = GROUND;
        m.vy = 0;
      }

      // waves
      if (!this.queue.length && !this.enemies.length) {
        this.waveDelay -= dt;
        if (this.waveDelay <= 0) {
          if (this.wave >= WAVES.length) {
            this.won = 2600;
            this.popup("Alle alien-tanks vernietigd!", W / 2, 110, "#6ee07a");
            return;
          }
          this.startWave();
          this.wave++;
          this.waveDelay = 2000;
        }
      }
      this.spawnT -= dt;
      if (this.queue.length && this.spawnT <= 0) {
        this.spawn(this.queue.shift());
        this.spawnT = 1800;
      }
      // during the boss, ufos keep coming
      const boss = this.enemies.find((e) => e.boss);
      if (boss && !this.enemies.some((e) => e.kind === "saucer") && Math.random() < s / 6) this.spawn("saucer");

      for (const e of this.enemies) {
        e.flash = Math.max(0, e.flash - dt);
        if (e.kind === "saucer") {
          e.x += e.vx * s;
          if (e.x < 40) e.vx = Math.abs(e.vx);
          if (e.x > W - 40) e.vx = -Math.abs(e.vx);
          e.bombT -= dt;
          if (e.bombT <= 0 && Math.abs(e.x - m.x) < 70) {
            e.bombT = 1700;
            this.bombs.push({ x: e.x, y: e.y + 8, vy: 60 });
          }
          continue;
        }
        if (e.x > e.stopX) e.x -= 60 * s;
        e.fireT -= dt;
        if (e.fireT <= 0) {
          e.fireT = e.boss ? 2600 : 2400 + Math.random() * 1200;
          const shots = e.boss ? [-50, 0, 50] : [0];
          for (const off of shots) {
            const tx = G.clamp(m.x + off + (Math.random() - 0.5) * 30, 20, W - 20);
            const T = 1.4;
            const sx = e.x - 24 * (e.boss ? 1.8 : 1), sy = GROUND - 46;
            this.lobs.push({ x: sx, y: sy, vx: (tx - sx) / T, vy: (GROUND - sy - 0.5 * LOB_G * T * T) / T, tx });
          }
        }
        if (e.boss && e.x <= e.stopX + 1) {
          e.beamT -= dt;
          if (e.beamT <= 0 && !this.beam) {
            e.beamT = 6500;
            this.beam = { warn: BEAM_WARN, on: 0, y: GROUND - 30, from: e.x - 40 };
            this.popup("SPRING!", m.x, m.y - 120, "#ff4040");
          }
        }
      }

      if (this.beam) {
        const bm = this.beam;
        if (bm.warn > 0) {
          bm.warn -= dt;
          if (bm.warn <= 0) bm.on = BEAM_MS;
        } else {
          bm.on -= dt;
          if (m.x < bm.from && m.y > bm.y - 4 && m.y - 30 < bm.y + 12 && !bm.hit) {
            bm.hit = true;
            this.hurt(BEAM_DMG, "LASER!");
          }
          if (bm.on <= 0) this.beam = null;
        }
      }
      for (const l of this.lobs) {
        l.x += l.vx * s;
        l.vy += LOB_G * s;
        l.y += l.vy * s;
        if (this.hitsMech(l.x, l.y, 4)) {
          l.done = true;
          this.hurt(LOB_DMG);
          this.booms.push({ x: l.x, y: l.y, life: 300, r: 26 });
        } else if (l.y >= GROUND) {
          l.done = true;
          this.booms.push({ x: l.x, y: GROUND, life: 300, r: 26 });
          if (Math.abs(l.x - m.x) < 34 && m.y > GROUND - 30) this.hurt(LOB_DMG);
        }
      }
      this.lobs = this.lobs.filter((l) => !l.done);
      for (const b of this.bombs) {
        b.vy += 300 * s;
        b.y += b.vy * s;
        if (this.hitsMech(b.x, b.y, 3)) {
          b.done = true;
          this.hurt(BOMB_DMG);
          this.booms.push({ x: b.x, y: b.y, life: 300, r: 20 });
        } else if (b.y >= GROUND) {
          b.done = true;
          this.booms.push({ x: b.x, y: GROUND, life: 300, r: 20 });
        }
      }
      this.bombs = this.bombs.filter((b) => !b.done);
      if (this.over) return;

      const damage = (e, dmg) => {
        e.hp -= dmg;
        e.flash = 80;
        if (e.hp <= 0 && !e.dead) {
          e.dead = true;
          this.booms.push({ x: e.x, y: e.kind === "saucer" ? e.y : GROUND - 20, life: 500, r: e.boss ? 70 : 34 });
          this.popup(e.boss ? "REUZENTANK KAPOT!" : "Boem!", e.x, (e.kind === "saucer" ? e.y : GROUND - 60) - 20, "#6ee07a");
          if (e.boss) this.beam = null;
        }
      };
      const hitBox = (e, x, y) => {
        if (e.kind === "saucer") return Math.abs(x - e.x) < 27 && Math.abs(y - e.y) < 11;
        const sc = e.boss ? 1.8 : 1;
        return Math.abs(x - e.x) < 32 * sc && y > GROUND - 44 * sc && y < GROUND;
      };
      for (const b of this.bullets) {
        b.x += b.vx * s;
        b.y += b.vy * s;
        if (b.x < -10 || b.x > W + 10 || b.y < -10 || b.y > GROUND) b.done = true;
        for (const e of this.enemies) {
          if (b.done || e.dead || !hitBox(e, b.x, b.y)) continue;
          b.done = true;
          damage(e, 1);
        }
      }
      this.bullets = this.bullets.filter((b) => !b.done);
      for (const r of this.rockets) {
        r.life -= dt;
        if (!r.target || r.target.dead) r.target = this.enemies.filter((e) => !e.dead).sort((a, b) => Math.abs(a.x - r.x) - Math.abs(b.x - r.x))[0];
        if (r.target) {
          const ty = r.target.kind === "saucer" ? r.target.y : GROUND - 20;
          const d = Math.hypot(r.target.x - r.x, ty - r.y) || 1;
          r.vx += ((r.target.x - r.x) / d) * 900 * s;
          r.vy += ((ty - r.y) / d) * 900 * s;
          const sp = Math.hypot(r.vx, r.vy);
          if (sp > 380) {
            r.vx *= 380 / sp;
            r.vy *= 380 / sp;
          }
        }
        r.x += r.vx * s;
        r.y += r.vy * s;
        for (const e of this.enemies) {
          if (r.life <= 0 || e.dead || !hitBox(e, r.x, r.y)) continue;
          r.life = 0;
          damage(e, ROCKET_DMG);
          this.booms.push({ x: r.x, y: r.y, life: 250, r: 16 });
        }
        if (r.y > GROUND) r.life = 0;
      }
      this.rockets = this.rockets.filter((r) => r.life > 0);
      this.enemies = this.enemies.filter((e) => !e.dead);
    },

    render(ctx, t) {
      drawField(ctx, t);
      const m = this.m;
      if (this.beam) {
        const bm = this.beam;
        if (bm.warn > 0) {
          ctx.fillStyle = `rgba(255,40,40,${0.15 + 0.15 * Math.sin(t * 25)})`;
          ctx.fillRect(0, bm.y - 4, bm.from, 16);
        } else {
          ctx.fillStyle = "rgba(255,80,200,0.9)";
          ctx.fillRect(0, bm.y, bm.from, 10);
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.fillRect(0, bm.y + 3, bm.from, 4);
        }
      }
      for (const e of this.enemies) (e.kind === "saucer" ? drawSaucer : drawTank)(ctx, e, t);
      for (const l of this.lobs) {
        ctx.strokeStyle = "rgba(255,60,60,0.6)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(l.tx, GROUND, 30, 6, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#c070ff";
        ctx.beginPath();
        ctx.arc(l.x, l.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#2a2a2a";
      for (const b of this.bombs) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      drawMech(ctx, m, t, this.aim, m.flash > 0);
      ctx.fillStyle = "#ffe066";
      for (const b of this.bullets) ctx.fillRect(b.x - 2, b.y - 2, 4, 4);
      for (const r of this.rockets) {
        ctx.fillStyle = "#e04040";
        ctx.beginPath();
        ctx.arc(r.x, r.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,200,80,0.6)";
        ctx.beginPath();
        ctx.arc(r.x - r.vx * 0.02, r.y - r.vy * 0.02, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const b of this.booms) {
        ctx.fillStyle = `rgba(255,${140 + Math.random() * 80},40,${b.life / 500})`;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * (1.2 - b.life / 600), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.aim.x, this.aim.y, 9, 0, Math.PI * 2);
      ctx.moveTo(this.aim.x - 13, this.aim.y);
      ctx.lineTo(this.aim.x + 13, this.aim.y);
      ctx.stroke();

      if (this.flash > 0) {
        ctx.fillStyle = `rgba(200,40,40,${0.25 * (this.flash / 250)})`;
        ctx.fillRect(0, 0, W, H);
      }
      // gauges
      const bar = (y, v, col, label) => {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(12, y, 140, 10);
        ctx.fillStyle = col;
        ctx.fillRect(12, y, 140 * Math.max(0, v), 10);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 9px Segoe UI, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(label, 16, y + 8);
      };
      bar(10, m.hp / MECH_HP, m.hp < 30 ? "#ff5050" : "#6ee07a", `MECH ${Math.max(0, Math.round(m.hp))}`);
      bar(24, m.fuel / FUEL_MAX, "#ffb040", "STRAALMOTOR");
      bar(38, 1 - m.rocketT / ROCKET_MS, m.rocketReady ? "#e04040" : "#6a3a3a", m.rocketReady ? "RAKETTEN KLAAR (↓)" : "RAKETTEN...");
      const boss = this.enemies.find((e) => e.boss);
      if (boss) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(W / 2 - 110, 12, 220, 10);
        ctx.fillStyle = "#c070ff";
        ctx.fillRect(W / 2 - 110, 12, 220 * Math.max(0, boss.hp / BOSS_HP), 10);
      }
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return `Mech ${Math.max(0, Math.round(this.m.hp))}% · golf ${Math.min(this.wave, WAVES.length)}/${WAVES.length}`;
    },
  };
})();
