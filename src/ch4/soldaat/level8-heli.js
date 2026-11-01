(() => {
  const { W, H } = G;
  const GROUND = 385;
  const GUN = { x: 92, y: 118 };
  const LZ_X = 110;
  const TEAM = 4;
  const TEAM_HP = 2;
  const TEAM_SPEED = 13;
  const MAX_LOST = 2;
  const HELI_HP = 4;
  const FIRE_MS = 60;
  const SPIN_MS = 450; // minigun has to spin up
  const HEAT_PER_SHOT = 2.2;
  const COOL = 35;
  const OVERHEAT_MS = 1500;
  const BULLET_SPEED = 1000;
  const ENEMY_HP = 3;
  const AIM_MS = 1600;
  const RPG_SPEED = 210;

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function drawJungle(ctx, t) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#9ac8d8");
    g.addColorStop(1, "#c8e0c0");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#3a6a3a";
    for (let i = 0; i < 14; i++) {
      const x = 180 + i * 28;
      ctx.beginPath();
      ctx.arc(x, 250 + (i % 3) * 10, 34, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#6a8a4a";
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = "#5a7a3a";
    ctx.fillRect(0, GROUND, W, 4);
    // landing zone
    ctx.strokeStyle = "#f0f0f0";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(LZ_X, GROUND + 12, 50, 10, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#f0f0f0";
    ctx.font = "bold 14px Segoe UI, Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("H", LZ_X, GROUND + 17);
    // purple smoke marks the LZ
    ctx.fillStyle = "rgba(170,90,220,0.25)";
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.arc(LZ_X + 40 + Math.sin(t + k) * 6, GROUND - 10 - k * 20 - ((t * 20) % 20), 10 + k * 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawHeli(ctx, t, flash) {
    ctx.save();
    ctx.translate(0, Math.sin(t * 3) * 3);
    ctx.fillStyle = flash ? "#fff" : "#4a5a3a";
    ctx.beginPath();
    ctx.roundRect(-30, 70, 130, 60, 18);
    ctx.fill();
    ctx.fillRect(-90, 88, 70, 12);
    ctx.fillStyle = "#222";
    ctx.fillRect(40, 54, 6, 18);
    // rotor blur
    ctx.fillStyle = "rgba(30,30,30,0.35)";
    ctx.fillRect(-60, 50, 210, 5);
    ctx.fillStyle = "rgba(160,200,230,0.6)";
    ctx.fillRect(70, 82, 26, 22);
    // open door
    ctx.fillStyle = "#1a1a12";
    ctx.fillRect(30, 84, 44, 40);
    ctx.fillStyle = "#333";
    ctx.fillRect(-10, 130, 100, 4);
    ctx.restore();
  }

  G.CAREER_LEVELS.soldaat[8] = {
    title: "Level 8 — Helikopter-boordschutter (28 jaar)",
    intro:
      "Je team zit vast in de jungle. Jij hangt in de deur van de helikopter achter een <strong>minigun</strong>.<br>" +
      "Mik met de <strong>muis</strong>, houd <strong>klik</strong> / <strong>SPATIE</strong> ingedrukt (de minigun moet even opstarten). Niet te lang: <strong>oververhitting</strong>!<br>" +
      "Bescherm je team tot ze bij de <strong>landingsplek</strong> zijn. Schiet ook de <strong>raketten</strong> op de heli neer. Verlies je 2 teamleden, dan is de missie mislukt.",

    drawBackground(ctx, t) {
      drawJungle(ctx, t);
      drawHeli(ctx, t, false);
    },

    start(api) {
      this.api = api;
      this.aim = { x: 350, y: 300 };
      this.fire = 0;
      this.spin = 0;
      this.heat = 0;
      this.overheat = 0;
      this.heliHp = HELI_HP;
      this.heliFlash = 0;
      this.bullets = [];
      this.enemies = [];
      this.rpgs = [];
      this.spawnTimer = 1500;
      this.popups = [];
      this.lost = 0;
      this.flash = 0;
      this.over = false;
      this.team = [];
      for (let i = 0; i < TEAM; i++) this.team.push({ x: W - 30 - i * 26, hp: TEAM_HP, flash: 0, look: G.soldierLook(G.randomLook()), safe: false, dead: false });
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 800 });
    },

    onAction() {},
    onPointer(x, y) { this.aim = { x, y }; },
    onPointerMove(x, y) { this.aim = { x, y }; },

    update(dt, t) {
      if (this.over) return;
      const s = dt / 1000;
      this.fire = Math.max(0, this.fire - dt);
      this.flash = Math.max(0, this.flash - dt);
      this.heliFlash = Math.max(0, this.heliFlash - dt);
      this.popups = G.updatePopups(this.popups, dt);

      // minigun: spin up while held, then fire fast and heat up
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
            this.popup("OVERVERHIT!", GUN.x + 40, GUN.y - 20, "#ff8a3a");
          }
          const spread = (Math.random() - 0.5) * 0.06;
          const ang = Math.atan2(this.aim.y - GUN.y, this.aim.x - GUN.x) + spread;
          this.bullets.push({ x: GUN.x, y: GUN.y, vx: Math.cos(ang) * BULLET_SPEED, vy: Math.sin(ang) * BULLET_SPEED });
        }
      }

      // the team runs for the LZ
      for (const m of this.team) {
        m.flash = Math.max(0, m.flash - dt);
        if (m.dead || m.safe) continue;
        m.x -= TEAM_SPEED * s * (1 + Math.sin(t * 2 + m.x) * 0.3);
        if (m.x <= LZ_X + 10) {
          m.safe = true;
          this.popup("Aan boord!", m.x, GROUND - 60, "#6ee07a");
        }
      }
      const running = this.team.filter((m) => !m.dead && !m.safe);
      if (!running.length) {
        this.over = true;
        this.api.complete();
        return;
      }

      // enemies come out of the tree line, behind and around the team
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = 1300 + Math.random() * 900;
        const rear = Math.max(...running.map((m) => m.x));
        const x = G.clamp(rear - 80 + Math.random() * 260, 180, W - 15);
        this.enemies.push({ x, y: 285 + Math.random() * 70, hp: ENEMY_HP, up: 0, timer: AIM_MS, rpg: Math.random() < 0.25, look: G.ENEMY_LOOK(), flash: 0 });
      }
      for (const e of this.enemies) {
        e.flash = Math.max(0, e.flash - dt);
        if (e.dead) {
          e.timer -= dt;
          continue;
        }
        e.up = Math.min(1, e.up + dt / 300);
        if (e.up < 1) continue;
        e.timer -= dt;
        if (e.timer <= 0) {
          e.timer = AIM_MS + Math.random() * 600;
          if (e.rpg) {
            const ty = 100;
            const d = Math.hypot(GUN.x + 20 - e.x, ty - e.y) || 1;
            this.rpgs.push({ x: e.x, y: e.y - 30, vx: ((GUN.x + 20 - e.x) / d) * RPG_SPEED, vy: ((ty - e.y) / d) * RPG_SPEED });
          } else {
            const targets = this.team.filter((m) => !m.dead && !m.safe);
            const tg = targets.reduce((a, m) => (Math.abs(m.x - e.x) < Math.abs(a.x - e.x) ? m : a));
            tg.hp--;
            tg.flash = 300;
            this.popup("-1", tg.x, GROUND - 60, "#ff6b6b");
            if (tg.hp <= 0) {
              tg.dead = true;
              this.lost++;
              this.flash = 400;
              this.popup("MAN DOWN!", tg.x, GROUND - 70, "#ff4040");
              if (this.lost >= MAX_LOST) {
                this.over = true;
                this.api.fail("Je verloor te veel teamleden.");
                return;
              }
            }
          }
        }
      }
      this.enemies = this.enemies.filter((e) => !e.dead || e.timer > 0);

      for (const r of this.rpgs) {
        r.x += r.vx * s;
        r.y += r.vy * s;
        if (r.x < GUN.x + 40) {
          r.done = true;
          this.heliHp--;
          this.heliFlash = 300;
          this.flash = 300;
          this.popup("HELI GERAAKT!", GUN.x + 40, GUN.y - 30, "#ff4040");
          if (this.heliHp <= 0) {
            this.over = true;
            this.api.fail("De helikopter werd neergeschoten.");
            return;
          }
        }
      }

      for (const b of this.bullets) {
        b.x += b.vx * s;
        b.y += b.vy * s;
        if (b.x > W + 10 || b.y > H + 10 || b.y < -10) { b.done = true; continue; }
        for (const r of this.rpgs) {
          if (!r.done && dist(b, r) < 14) {
            r.done = true;
            b.done = true;
            this.popup("RAKET WEG!", r.x, r.y - 12, "#6ee07a");
            break;
          }
        }
        if (b.done) continue;
        for (const e of this.enemies) {
          if (e.dead || e.up < 0.6) continue;
          if (Math.abs(b.x - e.x) < 10 && b.y > e.y - 50 && b.y < e.y) {
            b.done = true;
            e.hp--;
            e.flash = 80;
            if (e.hp <= 0) {
              e.dead = true;
              e.timer = 500;
            }
            break;
          }
        }
      }
      this.bullets = this.bullets.filter((b) => !b.done);
      this.rpgs = this.rpgs.filter((r) => !r.done);
    },

    render(ctx, t) {
      drawJungle(ctx, t);

      for (const e of this.enemies) {
        const hand = G.drawKid(ctx, e.x, e.y + (1 - e.up) * 30, 0.5, e.look, { adult: true, t, facing: -1, armAngle: -0.3, flash: e.flash > 0, pose: e.dead ? "down" : "stand", angry: true });
        if (!e.dead && e.up >= 1) {
          if (e.rpg) {
            ctx.fillStyle = "#4a5a3a";
            ctx.fillRect(hand.x - 18, hand.y - 8, 24, 6);
          } else G.drawRifle(ctx, hand, Math.PI + 0.3, -1, 0.5);
          const k = 1 - e.timer / AIM_MS;
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(e.x - 14, e.y - 58, 28, 4);
          ctx.fillStyle = e.rpg ? "#ff8a3a" : "#ff4040";
          ctx.fillRect(e.x - 14, e.y - 58, 28 * G.clamp(k, 0, 1), 4);
        }
        // bush in front
        ctx.fillStyle = "#2f5a2f";
        ctx.beginPath();
        ctx.arc(e.x, e.y + 4, 22, Math.PI, 0);
        ctx.fill();
      }

      for (const m of this.team) {
        if (m.safe) continue;
        G.drawKid(ctx, m.x, GROUND + 4, 0.55, m.look, { adult: true, t, facing: -1, pose: m.dead ? "down" : "walk", flash: m.flash > 0, dizzy: m.dead });
        if (!m.dead) {
          G.drawHelmet(ctx, m.x, GROUND + 4, 0.55, -1);
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(m.x - 12, GROUND - 58, 24, 3);
          ctx.fillStyle = "#6ee07a";
          ctx.fillRect(m.x - 12, GROUND - 58, 24 * (m.hp / TEAM_HP), 3);
        }
      }

      drawHeli(ctx, t, this.heliFlash > 0);
      G.drawKid(ctx, GUN.x - 30, GUN.y + 22, 0.5, G.soldierLook(), { adult: true, t, armAngle: -0.2 });
      G.drawHelmet(ctx, GUN.x - 30, GUN.y + 22, 0.5);
      const ang = Math.atan2(this.aim.y - GUN.y, this.aim.x - GUN.x);
      ctx.save();
      ctx.translate(GUN.x, GUN.y);
      ctx.rotate(ang);
      ctx.fillStyle = this.overheat > 0 ? "#c04020" : "#2a2a2a";
      ctx.fillRect(-6, -6, 16, 12);
      const spinA = (this.spin / SPIN_MS) * t * 40;
      for (let k = 0; k < 3; k++) ctx.fillRect(8, -5 + ((k * 4 + spinA) % 12), 34, 2.5);
      if (this.fire > FIRE_MS / 2) {
        ctx.fillStyle = "#ffd24a";
        ctx.beginPath();
        ctx.arc(46, 0, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      ctx.fillStyle = "#ffe066";
      for (const b of this.bullets) ctx.fillRect(b.x - 2, b.y - 1, 5, 2);
      for (const r of this.rpgs) {
        ctx.fillStyle = "#4a4a3a";
        ctx.fillRect(r.x - 8, r.y - 3, 16, 6);
        ctx.fillStyle = `rgba(255,${150 + Math.random() * 100},40,0.9)`;
        ctx.beginPath();
        ctx.arc(r.x + 10, r.y, 4 + Math.random() * 2, 0, Math.PI * 2);
        ctx.fill();
      }

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
        ctx.fillStyle = `rgba(200,40,40,${0.25 * (this.flash / 400)})`;
        ctx.fillRect(0, 0, W, H);
      }

      // HUD
      const safe = this.team.filter((m) => m.safe).length;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(W - 180, 10, 170, 50);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`Team aan boord: ${safe}/${TEAM}`, W - 172, 28);
      ctx.fillText(`Heli: ${"■".repeat(this.heliHp)}${"□".repeat(HELI_HP - this.heliHp)}  ·  verloren ${this.lost}/${MAX_LOST}`, W - 172, 48);
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(10, H - 18, 100, 8);
      ctx.fillStyle = this.overheat > 0 ? "#ff5030" : this.heat > 70 ? "#ffa030" : "#ffd24a";
      ctx.fillRect(10, H - 18, this.heat, 8);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px Segoe UI, Roboto, sans-serif";
      ctx.fillText(this.overheat > 0 ? "OVERVERHIT" : "HITTE", 116, H - 11);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return `Team aan boord ${this.team.filter((m) => m.safe).length}/${TEAM}`;
    },
  };
})();
