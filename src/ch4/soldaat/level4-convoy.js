(() => {
  const { W, H } = G;
  const ROAD_Y = 380;
  const GUN = { x: 150, y: ROAD_Y - 62 };
  const SCROLL = 120;
  const SURVIVE_MS = 50000;
  const CONVOY_HP = 100;
  const FIRE_MS = 90;
  const BULLET_SPEED = 900;
  const HEAT_PER_SHOT = 4;
  const COOL = 30; // per second
  const OVERHEAT_MS = 1600;
  const ENEMY_HP = 3;
  const AIM_MS = 1300; // time an enemy needs before firing
  const SHOT_DMG = 6;
  const RPG_DMG = 18;
  const RPG_SPEED = 200;

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function drawHumvee(ctx, x, y, t, color = "#8a8a5a") {
    const bounce = Math.sin(t * 14) * 1.2;
    ctx.save();
    ctx.translate(x, y + bounce);
    ctx.fillStyle = color;
    ctx.fillRect(-60, -34, 120, 30);
    ctx.fillRect(-40, -52, 70, 20);
    ctx.fillStyle = "rgba(160,200,230,0.6)";
    ctx.fillRect(-34, -48, 26, 13);
    ctx.fillRect(-4, -48, 26, 13);
    ctx.fillStyle = "#222";
    for (const wx of [-38, 38]) {
      ctx.beginPath();
      ctx.arc(wx, -4, 13, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawTruck(ctx, x, y, t) {
    const bounce = Math.sin(t * 13 + 1) * 1.2;
    ctx.save();
    ctx.translate(x, y + bounce);
    ctx.fillStyle = "#6a6a4a";
    ctx.fillRect(-70, -60, 100, 56);
    ctx.fillStyle = "#7a7a5a";
    ctx.fillRect(30, -44, 40, 40);
    ctx.fillStyle = "rgba(160,200,230,0.6)";
    ctx.fillRect(48, -40, 18, 14);
    ctx.fillStyle = "#222";
    for (const wx of [-50, -20, 50]) {
      ctx.beginPath();
      ctx.arc(wx, -4, 12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawDesert(ctx, scroll) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#f0c890");
    g.addColorStop(1, "#d8a868");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // far dunes
    ctx.fillStyle = "#d0a060";
    ctx.beginPath();
    ctx.moveTo(0, 200);
    for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 200 - Math.sin((x + scroll * 0.2) * 0.012) * 30);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.fill();
    ctx.fillStyle = "#c89050";
    ctx.beginPath();
    ctx.moveTo(0, 270);
    for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 270 - Math.sin((x + scroll * 0.5) * 0.02) * 20);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.fill();
    // road
    ctx.fillStyle = "#6a5a48";
    ctx.fillRect(0, ROAD_Y - 10, W, 40);
    ctx.fillStyle = "#e8d8a0";
    const off = scroll % 60;
    for (let x = -off; x < W; x += 60) ctx.fillRect(x, ROAD_Y + 8, 30, 4);
  }

  function drawCover(ctx, c) {
    if (c.kind === "house") {
      ctx.fillStyle = "#c8a878";
      ctx.fillRect(c.x - 40, c.y - 60, 80, 60);
      ctx.fillStyle = "#a88858";
      ctx.fillRect(c.x - 44, c.y - 66, 88, 8);
      ctx.fillStyle = "#3a2a1a";
      ctx.fillRect(c.x - 12, c.y - 46, 24, 22);
    } else {
      ctx.fillStyle = "#9a7a5a";
      ctx.beginPath();
      ctx.ellipse(c.x, c.y - 10, 42, 22, 0, Math.PI, 0);
      ctx.fill();
    }
  }

  G.CAREER_LEVELS.soldaat[4] = {
    title: "Level 4 — Konvooi (24 jaar)",
    intro:
      "Je bemant het <strong>machinegeweer</strong> op de Humvee die een bevoorradingstruck begeleidt.<br>" +
      "Mik met de <strong>muis</strong>, schiet met <strong>klik</strong> / <strong>SPATIE</strong> (ingedrukt houden = vuren). Te lang vuren = <strong>oververhit</strong>!<br>" +
      "Vijanden die opduiken richten eerst (rode balk): schiet ze eerst. <strong>Raketten</strong> kun je uit de lucht schieten. Bescherm het konvooi <strong>50 seconden</strong>.",

    drawBackground(ctx, t) {
      drawDesert(ctx, 0);
      drawTruck(ctx, 330, ROAD_Y + 8, t);
      drawHumvee(ctx, GUN.x, ROAD_Y + 8, t);
    },

    start(api) {
      this.api = api;
      this.hp = CONVOY_HP;
      this.time = SURVIVE_MS;
      this.scroll = 0;
      this.aim = { x: W / 2, y: 200 };
      this.fire = 0;
      this.heat = 0;
      this.overheat = 0;
      this.bullets = [];
      this.enemies = [];
      this.rpgs = [];
      this.spawnTimer = 1200;
      this.flash = 0;
      this.popups = [];
      this.kills = 0;
      this.over = false;
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 700 });
    },

    doFire() {
      if (this.over || this.fire > 0 || this.overheat > 0) return;
      this.fire = FIRE_MS;
      this.heat += HEAT_PER_SHOT;
      if (this.heat >= 100) {
        this.heat = 100;
        this.overheat = OVERHEAT_MS;
        this.popup("OVERVERHIT!", GUN.x, GUN.y - 40, "#ff8a3a");
      }
      const spread = (Math.random() - 0.5) * 0.04;
      const ang = Math.atan2(this.aim.y - GUN.y, this.aim.x - GUN.x) + spread;
      this.bullets.push({ x: GUN.x, y: GUN.y, vx: Math.cos(ang) * BULLET_SPEED, vy: Math.sin(ang) * BULLET_SPEED });
    },

    onAction() { this.doFire(); },
    onPointer(x, y) { this.aim = { x, y }; this.doFire(); },
    onPointerMove(x, y) { this.aim = { x, y }; },

    spawn() {
      const kind = Math.random() < 0.5 ? "house" : "rock";
      const y = 200 + Math.random() * 90;
      this.enemies.push({ x: W + 50, y, kind, hp: ENEMY_HP, state: "hidden", timer: 400 + Math.random() * 600, rpg: Math.random() < 0.3, look: G.ENEMY_LOOK(), flash: 0 });
    },

    hurt(dmg, text) {
      this.hp -= dmg;
      this.flash = 250;
      this.popup(text, 260, ROAD_Y - 80, "#ff6b6b");
      if (this.hp <= 0) {
        this.over = true;
        this.api.fail("Het konvooi is vernietigd.");
      }
    },

    update(dt, t) {
      if (this.over) return;
      const s = dt / 1000;
      this.fire = Math.max(0, this.fire - dt);
      this.flash = Math.max(0, this.flash - dt);
      this.popups = G.updatePopups(this.popups, dt);
      if (this.overheat > 0) {
        this.overheat -= dt;
        if (this.overheat <= 0) this.heat = 40;
      } else this.heat = Math.max(0, this.heat - COOL * s);
      if (G.held.action) this.doFire();
      this.scroll += SCROLL * s;

      this.time -= dt;
      if (this.time <= 0) {
        this.over = true;
        this.api.complete();
        return;
      }

      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        const k = 1 - this.time / SURVIVE_MS;
        this.spawnTimer = 1500 - k * 600 + Math.random() * 700;
        this.spawn();
      }

      for (const e of this.enemies) {
        e.x -= SCROLL * 0.6 * s;
        e.flash = Math.max(0, e.flash - dt);
        e.timer -= dt;
        if (e.state === "hidden" && e.timer <= 0 && e.x < W - 40) {
          e.state = "aim";
          e.timer = AIM_MS;
        } else if (e.state === "aim" && e.timer <= 0) {
          if (e.rpg) {
            const tx = 240, ty = ROAD_Y - 30;
            const d = Math.hypot(tx - e.x, ty - (e.y - 40)) || 1;
            this.rpgs.push({ x: e.x, y: e.y - 40, vx: ((tx - e.x) / d) * RPG_SPEED, vy: ((ty - (e.y - 40)) / d) * RPG_SPEED });
          } else this.hurt(SHOT_DMG, `-${SHOT_DMG}`);
          e.state = "duck";
          e.timer = 1200;
        } else if (e.state === "duck" && e.timer <= 0) {
          e.state = "aim";
          e.timer = AIM_MS;
        }
        if (this.over) return;
      }
      this.enemies = this.enemies.filter((e) => e.x > -60 && !e.dead);

      for (const r of this.rpgs) {
        r.x += r.vx * s;
        r.y += r.vy * s;
        if (r.y >= ROAD_Y - 40) {
          r.done = true;
          this.hurt(RPG_DMG, "RAKET! -" + RPG_DMG);
          if (this.over) return;
        }
      }

      for (const b of this.bullets) {
        b.x += b.vx * s;
        b.y += b.vy * s;
        if (b.x < -10 || b.x > W + 10 || b.y < -10 || b.y > H + 10) { b.done = true; continue; }
        for (const r of this.rpgs) {
          if (!r.done && dist(b, r) < 14) {
            r.done = true;
            b.done = true;
            this.popup("RAKET WEG!", r.x, r.y - 10, "#6ee07a");
            break;
          }
        }
        if (b.done) continue;
        for (const e of this.enemies) {
          if (e.state === "hidden" || e.dead) continue;
          if (Math.abs(b.x - e.x) < 12 && b.y > e.y - 62 && b.y < e.y - 20) {
            b.done = true;
            e.hp--;
            e.flash = 80;
            if (e.hp <= 0) {
              e.dead = true;
              this.kills++;
              this.popup("RAAK", e.x, e.y - 70, "#6ee07a");
            }
            break;
          }
        }
      }
      this.bullets = this.bullets.filter((b) => !b.done);
      this.rpgs = this.rpgs.filter((r) => !r.done);
    },

    render(ctx, t) {
      drawDesert(ctx, this.scroll);

      // enemies behind their cover
      for (const e of this.enemies) {
        const up = e.state === "aim" ? 1 : e.state === "duck" ? 0.25 : 0;
        if (up > 0) {
          const hand = G.drawKid(ctx, e.x, e.y - 8 + (1 - up) * 40, 0.6, e.look, { adult: true, t, facing: -1, armAngle: -0.1, flash: e.flash > 0 });
          if (up === 1) {
            if (e.rpg) {
              ctx.fillStyle = "#4a5a3a";
              ctx.fillRect(hand.x - 22, hand.y - 6, 30, 7);
            } else G.drawRifle(ctx, hand, Math.PI, -1, 0.6);
            // aim bar
            const k = 1 - e.timer / AIM_MS;
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.fillRect(e.x - 16, e.y - 74, 32, 4);
            ctx.fillStyle = e.rpg ? "#ff8a3a" : "#ff4040";
            ctx.fillRect(e.x - 16, e.y - 74, 32 * k, 4);
          }
        }
        drawCover(ctx, e);
      }

      drawTruck(ctx, 330, ROAD_Y + 8, t);
      drawHumvee(ctx, GUN.x, ROAD_Y + 8, t);

      // gunner + turret
      const ang = Math.atan2(this.aim.y - GUN.y, this.aim.x - GUN.x);
      G.drawKid(ctx, GUN.x - 6, GUN.y + 26, 0.6, G.soldierLook(), { adult: true, t, armAngle: -0.4 });
      G.drawHelmet(ctx, GUN.x - 6, GUN.y + 26, 0.6);
      ctx.save();
      ctx.translate(GUN.x, GUN.y);
      ctx.rotate(ang);
      ctx.fillStyle = this.overheat > 0 ? "#c04020" : "#2a2a2a";
      ctx.fillRect(0, -4, 44, 8);
      ctx.fillRect(-8, -7, 14, 14);
      if (this.fire > FIRE_MS / 2) {
        ctx.fillStyle = "#ffd24a";
        ctx.beginPath();
        ctx.arc(48, 0, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      ctx.fillStyle = "#ffe066";
      for (const b of this.bullets) ctx.fillRect(b.x - 2, b.y - 1, 5, 2);
      for (const r of this.rpgs) {
        ctx.save();
        ctx.translate(r.x, r.y);
        ctx.rotate(Math.atan2(r.vy, r.vx));
        ctx.fillStyle = "#4a4a3a";
        ctx.fillRect(-12, -3, 18, 6);
        ctx.fillStyle = "#c03020";
        ctx.beginPath();
        ctx.moveTo(6, -4);
        ctx.lineTo(14, 0);
        ctx.lineTo(6, 4);
        ctx.fill();
        ctx.fillStyle = `rgba(255,${150 + Math.random() * 100},40,0.9)`;
        ctx.beginPath();
        ctx.arc(-14, 0, 4 + Math.random() * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // crosshair
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.aim.x, this.aim.y, 9, 0, Math.PI * 2);
      ctx.moveTo(this.aim.x - 14, this.aim.y);
      ctx.lineTo(this.aim.x + 14, this.aim.y);
      ctx.moveTo(this.aim.x, this.aim.y - 14);
      ctx.lineTo(this.aim.x, this.aim.y + 14);
      ctx.stroke();

      if (this.flash > 0) {
        ctx.fillStyle = `rgba(200,40,40,${0.25 * (this.flash / 250)})`;
        ctx.fillRect(0, 0, W, H);
      }

      // HUD
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(14, 14, 160, 12);
      ctx.fillRect(14, 32, 100, 7);
      ctx.fillStyle = "#6ee07a";
      ctx.fillRect(14, 14, 160 * Math.max(0, this.hp / CONVOY_HP), 12);
      ctx.fillStyle = this.overheat > 0 ? "#ff5030" : this.heat > 70 ? "#ffa030" : "#ffd24a";
      ctx.fillRect(14, 32, this.heat, 7);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("KONVOOI", 18, 24);
      ctx.fillText(this.overheat > 0 ? "OVERVERHIT" : "HITTE", 120, 39);
      ctx.font = "bold 15px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`${Math.ceil(this.time / 1000)}s`, W - 14, 26);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return `Konvooi ${Math.max(0, Math.round(this.hp))} · nog ${Math.ceil(this.time / 1000)}s`;
    },
  };
})();
