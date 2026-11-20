(() => {
  const { W, H } = G;
  const R = 12;
  const SPEED = 155;
  const HP = 7;
  const INVULN_MS = 800;
  const FIRE_MS = 200;
  const BULLET_SPEED = 640;
  const BOSS_HP = 40;
  const BOSS_R = 22;
  const SHIELD_ON = 2800;
  const SHIELD_OFF = 2000;
  const BURST_MS = 1900;
  const SHOT_SPEED = 300;
  const LASER_WARN = 1000;
  const LASER_SPEED = 150;
  const LASER_GAP = 70;
  const DRONE_HP = 2;
  const PILLARS = [{ x: 110, y: 120, w: 30, h: 30 }, { x: 400, y: 120, w: 30, h: 30 }, { x: 110, y: 320, w: 30, h: 30 }, { x: 400, y: 320, w: 30, h: 30 }];
  const ROOM = { x: 16, y: 40, w: W - 32, h: H - 50 };
  const DIRECTOR_LOOK = { ...G.SKINS.wit, hair: "kort", hairColor: "#e8e8e8", eyes: G.EYES.blauw, gender: "jongen", shirt: "#e8e0d0", pants: "#2a2a30" };

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const inPillar = (x, y) => PILLARS.some((c) => x > c.x && x < c.x + c.w && y > c.y && y < c.y + c.h);
  function collide(o, r = R) {
    for (const c of PILLARS) {
      const cx = G.clamp(o.x, c.x, c.x + c.w), cy = G.clamp(o.y, c.y, c.y + c.h);
      const d = Math.hypot(o.x - cx, o.y - cy);
      if (d < r && d > 0) {
        o.x = cx + ((o.x - cx) / d) * r;
        o.y = cy + ((o.y - cy) / d) * r;
      }
    }
    o.x = G.clamp(o.x, ROOM.x + r, ROOM.x + ROOM.w - r);
    o.y = G.clamp(o.y, ROOM.y + r, ROOM.y + ROOM.h - r);
  }

  G.CAREER_LEVELS.huurmoordenaar[10] = {
    title: "Level 10 — Eindbaas: De Directeur (30 jaar)",
    intro:
      "Je bent 30. Eén contract nog: de <strong>Directeur</strong> van het Bureau, in zijn penthouse.<br>" +
      "Hij heeft een <strong>energieschild</strong>: als het blauw is gaan kogels er niet door. Schiet als het <strong>uit</strong> is. Hij stuurt <strong>drones</strong> op je af.<br>" +
      "Pas op voor het <strong>laserraster</strong> dat door de kamer schuift: loop door het <strong>gat</strong>! Pilaren houden kogels tegen, maar geen lasers.",

    drawBackground(ctx, t) {
      this.drawRoom(ctx, t);
    },

    drawRoom(ctx, t) {
      ctx.fillStyle = "#0e1018";
      ctx.fillRect(0, 0, W, H);
      // city lights through the windows
      for (let i = 0; i < 30; i++) {
        ctx.fillStyle = `rgba(255,${200 + (i % 3) * 20},120,${0.3 + 0.3 * Math.sin((t || 0) + i)})`;
        ctx.fillRect((i * 53) % W, 6 + (i % 4) * 7, 3, 3);
      }
      ctx.fillStyle = "#2a2a34";
      ctx.fillRect(ROOM.x, ROOM.y, ROOM.w, ROOM.h);
      ctx.fillStyle = "#34343e";
      for (let x = ROOM.x; x < ROOM.x + ROOM.w; x += 40) for (let y = ROOM.y; y < ROOM.y + ROOM.h; y += 40) if ((x + y) % 80 === 0) ctx.fillRect(x, y, 40, 40);
      for (const c of PILLARS) {
        ctx.fillStyle = "#c8c0b0";
        ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.fillStyle = "#a8a090";
        ctx.fillRect(c.x + 4, c.y + 4, c.w - 8, c.h - 8);
      }
      ctx.fillStyle = "#5a3a2a";
      ctx.fillRect(W / 2 - 40, 60, 80, 24);
    },

    start(api) {
      this.api = api;
      this.p = { x: W / 2, y: H - 60, hp: HP, invuln: 0, facing: 1, moving: false };
      this.b = { x: W / 2, y: 120, hp: BOSS_HP, shield: true, shieldT: SHIELD_ON, burst: BURST_MS, flash: 0, ting: 0, goal: null, goalT: 0, phase: 0 };
      this.aim = { x: W / 2, y: 120 };
      this.fire = 0;
      this.bullets = [];
      this.shots = [];
      this.lasers = [];
      this.laserTimer = 3500;
      this.drones = [];
      this.droneTimer = 5000;
      this.popups = [];
      this.flash = 0;
      this.over = false;
      this.won = 0;
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 900 });
    },

    doFire() {
      if (this.over || this.won || this.fire > 0) return;
      this.fire = FIRE_MS;
      const p = this.p;
      const d = dist(p, this.aim) || 1;
      this.bullets.push({ x: p.x, y: p.y - 10, vx: ((this.aim.x - p.x) / d) * BULLET_SPEED, vy: ((this.aim.y - p.y) / d) * BULLET_SPEED });
    },
    onAction() { this.doFire(); },
    onPointer(x, y) { this.aim = { x, y }; this.doFire(); },
    onPointerMove(x, y) { this.aim = { x, y }; },

    hurt(text = "-1 ❤") {
      const p = this.p;
      if (p.invuln > 0 || this.over || this.won) return;
      p.hp--;
      p.invuln = INVULN_MS;
      this.flash = 300;
      this.popup(text, p.x, p.y - 40, "#ff6b6b");
      if (p.hp <= 0) {
        this.over = true;
        this.api.fail("De Directeur blijft de baas van het Bureau.");
      }
    },

    spawnLaser() {
      const horizontal = Math.random() < 0.5;
      const span = horizontal ? ROOM.w : ROOM.h;
      const gap = (horizontal ? ROOM.x : ROOM.y) + 40 + Math.random() * (span - 80 - LASER_GAP);
      const fromStart = Math.random() < 0.5;
      // horizontal laser: a line along x that sweeps up or down
      this.lasers.push({ horizontal, gap, pos: horizontal ? (fromStart ? ROOM.y : ROOM.y + ROOM.h) : (fromStart ? ROOM.x : ROOM.x + ROOM.w), dir: fromStart ? 1 : -1, warn: LASER_WARN });
    },

    update(dt, t) {
      if (this.over) return;
      const s = dt / 1000;
      const p = this.p, b = this.b;
      this.fire = Math.max(0, this.fire - dt);
      this.flash = Math.max(0, this.flash - dt);
      p.invuln = Math.max(0, p.invuln - dt);
      b.flash = Math.max(0, b.flash - dt);
      b.ting = Math.max(0, b.ting - dt);
      this.popups = G.updatePopups(this.popups, dt);
      if (this.won) {
        this.won -= dt;
        if (this.won <= 0) {
          this.over = true;
          this.api.complete();
        }
        return;
      }
      if (G.held.action) this.doFire();

      const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
      const my = (G.held.down ? 1 : 0) - (G.held.up ? 1 : 0);
      p.moving = !!(mx || my);
      if (p.moving) {
        const len = Math.hypot(mx, my);
        p.x += (mx / len) * SPEED * s;
        p.y += (my / len) * SPEED * s;
        collide(p);
      }
      p.facing = this.aim.x >= p.x ? 1 : -1;

      // the director: shield cycle, strolls around, fires bursts
      b.shieldT -= dt;
      if (b.shieldT <= 0) {
        b.shield = !b.shield;
        b.shieldT = b.shield ? SHIELD_ON - b.phase * 400 : SHIELD_OFF;
      }
      b.goalT -= dt;
      if (!b.goal || b.goalT <= 0 || dist(b, b.goal) < 6) {
        b.goal = { x: 80 + Math.random() * (W - 160), y: 80 + Math.random() * 150 };
        b.goalT = 2500;
      }
      const gd = dist(b, b.goal) || 1;
      b.x += ((b.goal.x - b.x) / gd) * 50 * s;
      b.y += ((b.goal.y - b.y) / gd) * 50 * s;
      collide(b, BOSS_R);
      b.burst -= dt;
      if (b.burst <= 0) {
        b.burst = BURST_MS - b.phase * 300;
        const a = Math.atan2(p.y - b.y, p.x - b.x);
        for (const off of [-0.12, 0, 0.12]) this.shots.push({ x: b.x, y: b.y - 8, vx: Math.cos(a + off) * SHOT_SPEED, vy: Math.sin(a + off) * SHOT_SPEED });
      }

      // sweeping laser grids
      this.laserTimer -= dt;
      if (this.laserTimer <= 0) {
        this.laserTimer = 4200 - b.phase * 1300 + Math.random() * 1000;
        this.spawnLaser();
      }
      for (const l of this.lasers) {
        if (l.warn > 0) {
          l.warn -= dt;
          continue;
        }
        l.pos += l.dir * LASER_SPEED * (1 + b.phase * 0.3) * s;
        const along = l.horizontal ? p.x : p.y;
        const across = l.horizontal ? p.y : p.x;
        if (Math.abs(across - l.pos) < 8 && !(along > l.gap && along < l.gap + LASER_GAP)) this.hurt("LASER!");
        const end = l.horizontal ? (l.dir > 0 ? ROOM.y + ROOM.h : ROOM.y) : (l.dir > 0 ? ROOM.x + ROOM.w : ROOM.x);
        if ((l.dir > 0 && l.pos > end) || (l.dir < 0 && l.pos < end)) l.done = true;
      }
      this.lasers = this.lasers.filter((l) => !l.done);

      // drones
      this.droneTimer -= dt;
      if (this.droneTimer <= 0 && this.drones.length < 2 + b.phase) {
        this.droneTimer = 7000;
        this.drones.push({ x: b.x, y: b.y, a: Math.random() * 6, hp: DRONE_HP, shoot: 1500, flash: 0 });
        this.popup("Drone!", b.x, b.y - 40, "#ffd24a");
      }
      for (const d of this.drones) {
        d.flash = Math.max(0, d.flash - dt);
        d.a += s * 1.4;
        const tx = p.x + Math.cos(d.a) * 110, ty = p.y + Math.sin(d.a) * 90;
        d.x += (tx - d.x) * Math.min(1, s * 1.5);
        d.y += (ty - d.y) * Math.min(1, s * 1.5);
        d.shoot -= dt;
        if (d.shoot <= 0) {
          d.shoot = 1800 + Math.random() * 800;
          const a = Math.atan2(p.y - d.y, p.x - d.x);
          this.shots.push({ x: d.x, y: d.y, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, drone: true });
        }
      }

      for (const sh of this.shots) {
        sh.x += sh.vx * s;
        sh.y += sh.vy * s;
        if (sh.x < ROOM.x || sh.x > ROOM.x + ROOM.w || sh.y < ROOM.y || sh.y > ROOM.y + ROOM.h || inPillar(sh.x, sh.y)) sh.done = true;
        else if (dist(sh, { x: p.x, y: p.y - 8 }) < R + 3) {
          sh.done = true;
          this.hurt();
        }
      }
      this.shots = this.shots.filter((sh) => !sh.done);
      if (this.over) return;

      for (const bl of this.bullets) {
        bl.x += bl.vx * s;
        bl.y += bl.vy * s;
        if (bl.x < ROOM.x || bl.x > ROOM.x + ROOM.w || bl.y < ROOM.y || bl.y > ROOM.y + ROOM.h || inPillar(bl.x, bl.y)) { bl.done = true; continue; }
        for (const d of this.drones) {
          if (d.dead || dist(bl, d) > 12) continue;
          bl.done = true;
          d.hp--;
          d.flash = 80;
          if (d.hp <= 0) {
            d.dead = true;
            this.popup("Drone neer", d.x, d.y - 20, "#6ee07a");
          }
          break;
        }
        if (bl.done) continue;
        if (dist(bl, b) < BOSS_R + (b.shield ? 10 : 0)) {
          bl.done = true;
          if (b.shield) {
            b.ting = 120;
          } else {
            b.hp--;
            b.flash = 90;
            if (b.phase === 0 && b.hp <= BOSS_HP / 2) {
              b.phase = 1;
              this.popup("De Directeur wordt woedend!", b.x, b.y - 50, "#ff8a3a");
            }
            if (b.hp <= 0) {
              this.won = 3200;
              this.lasers = [];
              this.shots = [];
              this.drones = [];
            }
          }
        }
      }
      this.bullets = this.bullets.filter((bl) => !bl.done);
      this.drones = this.drones.filter((d) => !d.dead);
    },

    render(ctx, t) {
      this.drawRoom(ctx, t);
      const p = this.p, b = this.b;

      for (const l of this.lasers) {
        const warn = l.warn > 0;
        ctx.strokeStyle = warn ? `rgba(255,40,40,${0.3 + 0.3 * Math.sin(t * 25)})` : "rgba(255,40,40,0.95)";
        ctx.lineWidth = warn ? 2 : 4;
        ctx.beginPath();
        if (l.horizontal) {
          ctx.moveTo(ROOM.x, l.pos);
          ctx.lineTo(l.gap, l.pos);
          ctx.moveTo(l.gap + LASER_GAP, l.pos);
          ctx.lineTo(ROOM.x + ROOM.w, l.pos);
        } else {
          ctx.moveTo(l.pos, ROOM.y);
          ctx.lineTo(l.pos, l.gap);
          ctx.moveTo(l.pos, l.gap + LASER_GAP);
          ctx.lineTo(l.pos, ROOM.y + ROOM.h);
        }
        ctx.stroke();
        // highlight the gap
        ctx.fillStyle = "rgba(110,224,122,0.35)";
        if (l.horizontal) ctx.fillRect(l.gap, l.pos - 4, LASER_GAP, 8);
        else ctx.fillRect(l.pos - 4, l.gap, 8, LASER_GAP);
      }

      for (const d of this.drones) {
        ctx.fillStyle = d.flash > 0 ? "#fff" : "#6a6a7a";
        ctx.beginPath();
        ctx.ellipse(d.x, d.y, 10, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(200,200,220,0.6)";
        ctx.beginPath();
        ctx.moveTo(d.x - 14, d.y - 6);
        ctx.lineTo(d.x + 14, d.y - 6);
        ctx.stroke();
        ctx.fillStyle = "#ff3030";
        ctx.fillRect(d.x - 1, d.y - 1, 2, 2);
      }

      // the director in his white suit
      if (!this.won || Math.floor(t * 10) % 2) {
        const hand = G.drawKid(ctx, b.x, b.y + 14, 0.6, DIRECTOR_LOOK, { adult: true, t, facing: p.x >= b.x ? 1 : -1, flash: b.flash > 0, angry: b.hp > 0, dizzy: b.hp <= 0, pose: b.hp > 0 ? "walk" : "down", armAngle: -0.1 });
        G.drawTie(ctx, b.x, b.y + 14, 0.6);
        if (b.hp > 0) G.drawPistol(ctx, hand.x, hand.y, Math.atan2(p.y - b.y, p.x - b.x), 0.6, "#c0a030");
        if (b.shield && b.hp > 0) {
          ctx.strokeStyle = b.ting > 0 ? "#fff" : `rgba(90,170,255,${0.6 + 0.3 * Math.sin(t * 8)})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(b.x, b.y - 8, BOSS_R + 10, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = "rgba(90,170,255,0.12)";
          ctx.fill();
        }
      }

      const ang = Math.atan2(this.aim.y - p.y, this.aim.x - p.x);
      ctx.globalAlpha = p.invuln > 0 && Math.floor(t * 12) % 2 ? 0.5 : 1;
      const hand = G.drawKid(ctx, p.x, p.y + 14, 0.5, G.hitLook(), { adult: true, t, facing: p.facing, pose: p.moving ? "walk" : "stand", armAngle: G.clamp(p.facing === 1 ? ang : Math.PI - ang, -1.4, 1) });
      G.drawTie(ctx, p.x, p.y + 14, 0.5);
      G.drawPistol(ctx, hand.x, hand.y, ang, 0.7);
      ctx.globalAlpha = 1;

      ctx.fillStyle = "#ffe066";
      for (const bl of this.bullets) ctx.fillRect(bl.x - 2, bl.y - 1, 4, 2);
      for (const sh of this.shots) {
        ctx.fillStyle = sh.drone ? "#ff60c0" : "#ff5030";
        ctx.beginPath();
        ctx.arc(sh.x, sh.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.aim.x, this.aim.y, 8, 0, Math.PI * 2);
      ctx.stroke();

      if (this.flash > 0) {
        ctx.fillStyle = `rgba(200,40,40,${0.3 * (this.flash / 300)})`;
        ctx.fillRect(0, 0, W, H);
      }
      if (this.won) G.drawBanner(ctx, "De Directeur is verslagen. Jij bent nu de baas.", "#6ee07a", 100);

      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(W / 2 - 120, 4, 240, 10);
      ctx.fillStyle = b.phase ? "#ff5050" : "#e0c040";
      ctx.fillRect(W / 2 - 120, 4, 240 * Math.max(0, b.hp / BOSS_HP), 10);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(b.shield ? "SCHILD AAN" : "SCHILD UIT — SCHIETEN!", W / 2, 28);
      ctx.fillStyle = "#ff6b6b";
      ctx.font = "16px Segoe UI, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("❤".repeat(Math.max(0, p.hp)), 12, 30);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return `De Directeur ${Math.max(0, this.b.hp)}/${BOSS_HP}`;
    },
  };
})();
