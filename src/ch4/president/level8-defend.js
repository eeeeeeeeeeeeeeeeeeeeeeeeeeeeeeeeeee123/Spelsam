(() => {
  const { W, H } = G;
  const GUN = { x: W / 2, y: 268 };
  const LAWN = 395;
  const HOUSE_HP = 100;
  const FIRE_MS = 70;
  const SPIN_MS = 350;
  const HEAT_PER_SHOT = 2;
  const COOL = 32;
  const OVERHEAT_MS = 1400;
  const BULLET_SPEED = 950;
  const WAVES = [
    { ufos: 4, walkersPerUfo: 2, tripod: false },
    { ufos: 6, walkersPerUfo: 2, tripod: false },
    { ufos: 5, walkersPerUfo: 3, tripod: true },
  ];
  const UFO_HP = 6;
  const WALKER_HP = 2;
  const WALKER_SPEED = 28;
  const WALKER_DMG = 6;
  const TRIPOD_HP = 40;
  const BEAM_WARN = 1200;
  const BEAM_MS = 900;
  const BEAM_DMG = 14;

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function drawWhiteHouse(ctx, t, hp) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#1a1030");
    g.addColorStop(1, "#4a2a5a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // the mothership looms in the sky
    ctx.fillStyle = "rgba(120,255,180,0.12)";
    ctx.beginPath();
    ctx.ellipse(W / 2, -30, 300, 80, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3a6a4a";
    ctx.fillRect(0, LAWN, W, H - LAWN);
    // White House
    const dmg = 1 - hp / HOUSE_HP;
    ctx.fillStyle = "#e8e8e0";
    ctx.fillRect(140, 290, 260, 105);
    ctx.fillRect(220, 260, 100, 30);
    ctx.beginPath();
    ctx.moveTo(210, 262);
    ctx.lineTo(270, 236);
    ctx.lineTo(330, 262);
    ctx.fill();
    ctx.fillStyle = "#c8c8c0";
    for (let x = 230; x < 320; x += 18) ctx.fillRect(x, 266, 6, 40);
    ctx.fillStyle = "#3a4a5a";
    for (let x = 156; x < 390; x += 32) {
      ctx.fillRect(x, 310, 14, 20);
      ctx.fillRect(x, 350, 14, 20);
    }
    // damage: scorch marks and fire
    if (dmg > 0.2) {
      ctx.fillStyle = "rgba(30,20,20,0.5)";
      ctx.beginPath();
      ctx.arc(180, 320, 20 * dmg + 6, 0, Math.PI * 2);
      ctx.arc(360, 350, 24 * dmg + 6, 0, Math.PI * 2);
      ctx.fill();
    }
    if (dmg > 0.5) {
      ctx.fillStyle = `rgba(255,${120 + Math.random() * 80},40,0.8)`;
      ctx.beginPath();
      ctx.arc(180, 300 - Math.random() * 6, 8, 0, Math.PI * 2);
      ctx.arc(360, 330 - Math.random() * 6, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#c02020";
    ctx.fillRect(268, 210, 2, 26);
    ctx.fillRect(270, 210, 16, 10);
  }

  function drawUfo(ctx, u, t) {
    ctx.save();
    ctx.translate(u.x, u.y);
    ctx.fillStyle = u.flash > 0 ? "#fff" : "#9aa8b8";
    ctx.beginPath();
    ctx.ellipse(0, 0, 30, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(120,255,180,0.7)";
    ctx.beginPath();
    ctx.ellipse(0, -6, 13, 9, 0, Math.PI, 0);
    ctx.fill();
    for (let i = -2; i <= 2; i++) {
      ctx.fillStyle = Math.floor(t * 6 + i) % 2 ? "#ffd24a" : "#ff4040";
      ctx.beginPath();
      ctx.arc(i * 11, 3, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    if (u.beam > 0) {
      ctx.fillStyle = "rgba(120,255,180,0.25)";
      ctx.beginPath();
      ctx.moveTo(-10, 6);
      ctx.lineTo(10, 6);
      ctx.lineTo(24, LAWN - u.y);
      ctx.lineTo(-24, LAWN - u.y);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawWalker(ctx, a, t) {
    const step = Math.sin(t * 10 + a.seed) * 3;
    ctx.fillStyle = a.flash > 0 ? "#fff" : "#6ae07a";
    ctx.beginPath();
    ctx.ellipse(a.x, a.y - 22, 9, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(a.x - 5, a.y - 14, 10, 12);
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.ellipse(a.x - 3, a.y - 24, 3, 4, -0.3, 0, Math.PI * 2);
    ctx.ellipse(a.x + 3, a.y - 24, 3, 4, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#4ab05a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(a.x - 3, a.y - 2);
    ctx.lineTo(a.x - 4 + step, a.y + 6);
    ctx.moveTo(a.x + 3, a.y - 2);
    ctx.lineTo(a.x + 4 - step, a.y + 6);
    ctx.stroke();
  }

  G.CAREER_LEVELS.president[8] = {
    title: "Level 8 — Witte Huis verdedigen (28 jaar)",
    intro:
      "<strong>Aliens</strong> landen op het gazon van het Witte Huis! Jij staat op het dak achter een <strong>gouden minigun</strong>.<br>" +
      "Mik met de <strong>muis</strong>, houd <strong>klik</strong> of <strong>SPATIE</strong> ingedrukt (opstarten duurt even, te lang = <strong>oververhit</strong>).<br>" +
      "Schiet de <strong>UFO's</strong> voor ze aliens droppen, en de aliens voor ze bij het huis zijn. In golf 3 komt een <strong>driepoot</strong> met een laserstraal!",

    drawBackground(ctx, t) {
      drawWhiteHouse(ctx, t, HOUSE_HP);
    },

    start(api) {
      this.api = api;
      this.hp = HOUSE_HP;
      this.aim = { x: W / 2, y: 150 };
      this.fire = 0;
      this.spin = 0;
      this.heat = 0;
      this.overheat = 0;
      this.bullets = [];
      this.ufos = [];
      this.walkers = [];
      this.tripod = null;
      this.wave = 0;
      this.toSpawn = WAVES[0].ufos;
      this.spawnTimer = 1200;
      this.gap = 0;
      this.flash = 0;
      this.popups = [];
      this.over = false;
      this.won = 0;
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 800 });
    },

    onAction() {},
    onPointer(x, y) { this.aim = { x, y }; },
    onPointerMove(x, y) { this.aim = { x, y }; },

    hurt(dmg, text, x) {
      this.hp -= dmg;
      this.flash = 250;
      this.popup(text, x, 300, "#ff6b6b");
      if (this.hp <= 0) {
        this.over = true;
        this.api.fail("Het Witte Huis is ingenomen door de aliens!");
      }
    },

    update(dt, t) {
      if (this.over) return;
      const s = dt / 1000;
      this.fire = Math.max(0, this.fire - dt);
      this.flash = Math.max(0, this.flash - dt);
      this.popups = G.updatePopups(this.popups, dt);
      if (this.won) {
        this.won -= dt;
        if (this.won <= 0) {
          this.over = true;
          this.api.complete();
        }
        return;
      }

      // minigun
      const held = G.held.action || G.mouseDown;
      if (this.overheat > 0) {
        this.overheat -= dt;
        this.spin = 0;
        if (this.overheat <= 0) this.heat = 40;
      } else {
        this.heat = Math.max(0, this.heat - COOL * s);
        this.spin = held ? Math.min(SPIN_MS, this.spin + dt) : Math.max(0, this.spin - dt * 2);
        if (held && this.spin >= SPIN_MS && this.fire <= 0) {
          this.fire = FIRE_MS;
          this.heat += HEAT_PER_SHOT;
          if (this.heat >= 100) {
            this.heat = 100;
            this.overheat = OVERHEAT_MS;
            this.popup("OVERVERHIT!", GUN.x, GUN.y - 30, "#ff8a3a");
          }
          const ang = Math.atan2(this.aim.y - GUN.y, this.aim.x - GUN.x) + (Math.random() - 0.5) * 0.06;
          this.bullets.push({ x: GUN.x, y: GUN.y, vx: Math.cos(ang) * BULLET_SPEED, vy: Math.sin(ang) * BULLET_SPEED });
        }
      }

      // waves
      const wv = WAVES[this.wave];
      if (this.gap > 0) {
        this.gap -= dt;
        if (this.gap <= 0) {
          this.wave++;
          if (this.wave >= WAVES.length) {
            this.won = 2500;
            return;
          }
          this.toSpawn = WAVES[this.wave].ufos;
          this.spawnTimer = 800;
          if (WAVES[this.wave].tripod) {
            this.tripod = { x: W + 60, hp: TRIPOD_HP, state: "walk", timer: 0, flash: 0 };
            this.popup("Een DRIEPOOT!", W / 2, 120, "#ff8a3a");
          }
        }
      } else {
        this.spawnTimer -= dt;
        if (this.toSpawn > 0 && this.spawnTimer <= 0) {
          this.toSpawn--;
          this.spawnTimer = 1500 + Math.random() * 900;
          const dir = Math.random() < 0.5 ? 1 : -1;
          this.ufos.push({ x: dir > 0 ? -40 : W + 40, y: 60 + Math.random() * 90, dir, hp: UFO_HP, drops: wv.walkersPerUfo, dropT: 900 + Math.random() * 800, flash: 0, beam: 0 });
        }
        if (this.toSpawn <= 0 && !this.ufos.length && !this.walkers.length && (!this.tripod || this.tripod.hp <= 0)) {
          this.gap = 2200;
          if (this.wave < WAVES.length - 1) this.popup(`Golf ${this.wave + 1} overleefd!`, W / 2, 140, "#6ee07a");
        }
      }

      for (const u of this.ufos) {
        u.flash = Math.max(0, u.flash - dt);
        u.beam = Math.max(0, u.beam - dt);
        u.x += u.dir * 60 * s;
        u.dropT -= dt;
        if (u.drops > 0 && u.dropT <= 0 && u.x > 30 && u.x < W - 30) {
          u.drops--;
          u.dropT = 1300;
          u.beam = 500;
          this.walkers.push({ x: u.x, y: LAWN + 20 + Math.random() * 25, hp: WALKER_HP, flash: 0, seed: Math.random() * 10 });
        }
        if (u.x < -60 || u.x > W + 60) u.done = true;
      }
      this.ufos = this.ufos.filter((u) => !u.done);

      for (const a of this.walkers) {
        a.flash = Math.max(0, a.flash - dt);
        const tx = a.x < W / 2 ? 150 : 390;
        a.x += Math.sign(tx - a.x) * WALKER_SPEED * s;
        a.y += Math.sign(400 - a.y) * 8 * s;
        if (Math.abs(a.x - tx) < 4) {
          a.done = true;
          this.hurt(WALKER_DMG, "Alien binnen!", a.x);
          if (this.over) return;
        }
      }
      this.walkers = this.walkers.filter((a) => !a.done);

      const tp = this.tripod;
      if (tp && tp.hp > 0) {
        tp.flash = Math.max(0, tp.flash - dt);
        tp.timer -= dt;
        if (tp.state === "walk") {
          tp.x -= 30 * s;
          if (tp.x < W - 80) {
            tp.state = "warn";
            tp.timer = BEAM_WARN;
          }
        } else if (tp.state === "warn" && tp.timer <= 0) {
          tp.state = "beam";
          tp.timer = BEAM_MS;
          this.hurt(BEAM_DMG, "LASERSTRAAL!", 300);
          if (this.over) return;
        } else if (tp.state === "beam" && tp.timer <= 0) {
          tp.state = "cool";
          tp.timer = 2400;
        } else if (tp.state === "cool" && tp.timer <= 0) {
          tp.state = "warn";
          tp.timer = BEAM_WARN;
        }
      }

      for (const b of this.bullets) {
        b.x += b.vx * s;
        b.y += b.vy * s;
        if (b.x < -10 || b.x > W + 10 || b.y < -10 || b.y > H + 10) { b.done = true; continue; }
        for (const u of this.ufos) {
          if (Math.abs(b.x - u.x) < 30 && Math.abs(b.y - u.y) < 12) {
            b.done = true;
            u.hp--;
            u.flash = 70;
            if (u.hp <= 0) {
              u.done = true;
              this.popup("UFO NEER!", u.x, u.y - 20, "#6ee07a");
            }
            break;
          }
        }
        if (b.done) continue;
        for (const a of this.walkers) {
          if (dist(b, { x: a.x, y: a.y - 16 }) < 13) {
            b.done = true;
            a.hp--;
            a.flash = 80;
            if (a.hp <= 0) a.done = true;
            break;
          }
        }
        if (b.done) continue;
        if (tp && tp.hp > 0 && Math.abs(b.x - tp.x) < 26 && b.y > 160 && b.y < 210) {
          b.done = true;
          tp.hp--;
          tp.flash = 70;
          if (tp.hp <= 0) this.popup("DRIEPOOT VERNIETIGD!", tp.x, 150, "#6ee07a");
        }
      }
      this.bullets = this.bullets.filter((b) => !b.done);
      this.ufos = this.ufos.filter((u) => !u.done);
      this.walkers = this.walkers.filter((a) => !a.done);
    },

    render(ctx, t) {
      drawWhiteHouse(ctx, t, this.hp);
      const tp = this.tripod;
      if (tp && tp.hp > 0) {
        ctx.strokeStyle = "#5a6a7a";
        ctx.lineWidth = 5;
        for (const lx of [-28, 0, 28]) {
          ctx.beginPath();
          ctx.moveTo(tp.x, 190);
          ctx.lineTo(tp.x + lx + Math.sin(t * 3 + lx) * 6, LAWN + 30);
          ctx.stroke();
        }
        ctx.fillStyle = tp.flash > 0 ? "#fff" : "#7a8a9a";
        ctx.beginPath();
        ctx.ellipse(tp.x, 185, 30, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = tp.state === "warn" ? (Math.floor(t * 12) % 2 ? "#ff3030" : "#ffd24a") : "#6affb0";
        ctx.beginPath();
        ctx.arc(tp.x - 22, 188, 7, 0, Math.PI * 2);
        ctx.fill();
        if (tp.state === "beam") {
          ctx.strokeStyle = "rgba(255,60,60,0.9)";
          ctx.lineWidth = 8;
          ctx.beginPath();
          ctx.moveTo(tp.x - 22, 188);
          ctx.lineTo(300, 330);
          ctx.stroke();
        }
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(tp.x - 30, 156, 60, 5);
        ctx.fillStyle = "#e05050";
        ctx.fillRect(tp.x - 30, 156, 60 * (tp.hp / TRIPOD_HP), 5);
      }
      for (const u of this.ufos) drawUfo(ctx, u, t);
      for (const a of this.walkers) drawWalker(ctx, a, t);

      // you on the roof with the golden minigun
      G.drawKid(ctx, GUN.x - 16, GUN.y + 26, 0.55, G.presLook(), { adult: true, t, armAngle: -0.3 });
      G.drawQuiff(ctx, GUN.x - 16, GUN.y + 26, 0.55);
      const ang = Math.atan2(this.aim.y - GUN.y, this.aim.x - GUN.x);
      ctx.save();
      ctx.translate(GUN.x, GUN.y);
      ctx.rotate(ang);
      ctx.fillStyle = this.overheat > 0 ? "#c04020" : "#f0c030";
      ctx.fillRect(-6, -6, 16, 12);
      const spinA = (this.spin / SPIN_MS) * t * 40;
      for (let k = 0; k < 3; k++) ctx.fillRect(8, -5 + ((k * 4 + spinA) % 12), 32, 2.5);
      if (this.fire > FIRE_MS / 2) {
        ctx.fillStyle = "#fff4b0";
        ctx.beginPath();
        ctx.arc(44, 0, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      ctx.fillStyle = "#ffe066";
      for (const b of this.bullets) ctx.fillRect(b.x - 2, b.y - 1, 5, 2);
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.aim.x, this.aim.y, 10, 0, Math.PI * 2);
      ctx.moveTo(this.aim.x - 15, this.aim.y);
      ctx.lineTo(this.aim.x + 15, this.aim.y);
      ctx.moveTo(this.aim.x, this.aim.y - 15);
      ctx.lineTo(this.aim.x, this.aim.y + 15);
      ctx.stroke();

      if (this.flash > 0) {
        ctx.fillStyle = `rgba(200,40,40,${0.25 * (this.flash / 250)})`;
        ctx.fillRect(0, 0, W, H);
      }
      if (this.won) G.drawBanner(ctx, "Het Witte Huis houdt stand!", "#6ee07a", 140);
      else if (this.gap > 0 && this.wave < WAVES.length - 1) G.drawBanner(ctx, `Golf ${this.wave + 2} komt eraan...`, "#ffe066", 140);

      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(10, 10, 160, 12);
      ctx.fillStyle = this.hp > 40 ? "#6ee07a" : "#ff5050";
      ctx.fillRect(10, 10, 160 * Math.max(0, this.hp / HOUSE_HP), 12);
      ctx.fillStyle = this.overheat > 0 ? "#ff5030" : "#ffd24a";
      ctx.fillRect(10, 26, this.heat, 6);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("WITTE HUIS", 14, 20);
      ctx.font = "bold 13px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`Golf ${Math.min(WAVES.length, this.wave + 1)}/${WAVES.length}`, W - 12, 22);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return `Golf ${Math.min(WAVES.length, this.wave + 1)}/${WAVES.length} · Witte Huis ${Math.max(0, Math.round(this.hp))}`;
    },
  };
})();
