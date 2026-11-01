(() => {
  const { W, H } = G;
  const ROOF = 300; // feet on the wagon roofs
  const WAGON_W = 220;
  const GAP = 34;
  const WAGONS = 8;
  const LOCO_X = WAGONS * (WAGON_W + GAP);
  const LOCO_W = 210;
  const WORLD_W = LOCO_X + LOCO_W;
  const RUN = 150;
  const JUMP_V = 470;
  const GRAVITY = 1400;
  const HP = 5;
  const INVULN_MS = 1000;
  const BRIDGE_MS = 100000;
  const FIRE_MS = 200;
  const BULLET_SPEED = 720;
  const TRAIN_SPEED = 420; // how fast the scenery (and tunnels) rush past
  const TUNNEL_EVERY = [6000, 9000];
  const TUNNEL_LEN = 360;
  const TUNNEL_WARN = 1500;
  const ENEMY_HP = 2;
  const ENEMY_AIM = 1100;
  const ENEMY_SHOT = 360;
  const LEADER_HP = 20;
  const CHEST = 42; // bullets fly at chest height: duck under them

  const wagonX = (i) => i * (WAGON_W + GAP);
  const overGap = (x) => {
    if (x >= LOCO_X) return false;
    const local = x % (WAGON_W + GAP);
    return local > WAGON_W;
  };

  function drawScenery(ctx, scroll) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#f2b46a");
    g.addColorStop(1, "#e8c890");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#d89a58";
    ctx.beginPath();
    ctx.moveTo(0, 230);
    for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 230 - Math.sin((x + scroll * 0.15) * 0.01) * 35);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.fill();
    // telegraph poles whizzing by
    ctx.fillStyle = "#6a4a2a";
    const off = (scroll * 1.0) % 180;
    for (let x = -off; x < W + 20; x += 180) {
      ctx.fillRect(x, 200, 5, 180);
      ctx.fillRect(x - 12, 206, 30, 4);
    }
    ctx.fillStyle = "#8a6a4a";
    ctx.fillRect(0, ROOF + 92, W, H - ROOF - 92);
    ctx.fillStyle = "#5a4a3a";
    ctx.fillRect(0, ROOF + 92, W, 6);
  }

  function drawTrain(ctx, cam, t) {
    for (let i = 0; i < WAGONS; i++) {
      const x = wagonX(i) - cam;
      if (x > W || x + WAGON_W < 0) continue;
      ctx.fillStyle = ["#7a3a2a", "#3a5a6a", "#6a6a3a", "#5a3a5a", "#3a6a4a"][i % 5];
      ctx.fillRect(x, ROOF, WAGON_W, 78);
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(x, ROOF, WAGON_W, 6);
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      for (let k = 14; k < WAGON_W; k += 34) ctx.fillRect(x + k, ROOF + 20, 4, 50);
      // hatch
      ctx.fillStyle = "#2a2a2a";
      ctx.fillRect(x + WAGON_W / 2 - 18, ROOF - 3, 36, 5);
      ctx.fillStyle = "#222";
      for (const wx of [24, WAGON_W - 24]) {
        ctx.beginPath();
        ctx.arc(x + wx, ROOF + 84, 12, 0, Math.PI * 2);
        ctx.fill();
      }
      // coupling
      ctx.fillStyle = "#444";
      ctx.fillRect(x + WAGON_W, ROOF + 60, GAP, 6);
    }
    const lx = LOCO_X - cam;
    if (lx < W) {
      ctx.fillStyle = "#2a2a30";
      ctx.fillRect(lx, ROOF, LOCO_W, 78);
      ctx.fillStyle = "#3a3a44";
      ctx.fillRect(lx + 20, ROOF - 50, 70, 50);
      ctx.fillStyle = "rgba(160,200,230,0.6)";
      ctx.fillRect(lx + 30, ROOF - 42, 22, 18);
      ctx.fillStyle = "#222";
      ctx.fillRect(lx + LOCO_W - 50, ROOF - 40, 22, 40);
      ctx.fillStyle = "rgba(90,90,90,0.5)";
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.arc(lx + LOCO_W - 40 - k * 26 - ((t * 60) % 26), ROOF - 52 - k * 10, 10 + k * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#222";
      for (const wx of [30, 100, 170]) {
        ctx.beginPath();
        ctx.arc(lx + wx, ROOF + 84, 14, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  G.CAREER_LEVELS.soldaat[5] = {
    title: "Level 5 — Gekaapte trein (25 jaar)",
    intro:
      "Kapers hebben een trein met een geheim wapen gestolen. Jij springt op de achterste wagon.<br>" +
      "<strong>← →</strong> lopen, <strong>↑</strong> springen over de gaten, <strong>↓</strong> bukken voor <strong>tunnels</strong> en kogels. Mik met de <strong>muis</strong>, schiet met <strong>klik</strong> / <strong>SPATIE</strong>.<br>" +
      "Versla de <strong>kaper-leider</strong> op de locomotief voordat de trein de kapotte <strong>brug</strong> bereikt!",

    drawBackground(ctx, t) {
      drawScenery(ctx, 0);
      drawTrain(ctx, 0, t);
      G.drawKid(ctx, 60, ROOF, 0.75, G.soldierLook(), { adult: true, t });
      G.drawHelmet(ctx, 60, ROOF, 0.75);
    },

    start(api) {
      this.api = api;
      this.p = { x: 50, y: 0, vy: 0, hp: HP, invuln: 0, facing: 1, duck: false, safeX: 50 };
      this.aim = { x: 400, y: ROOF - 40 };
      this.cam = 0;
      this.scroll = 0;
      this.fire = 0;
      this.bullets = [];
      this.enemyShots = [];
      this.enemies = [];
      this.spawnedWagon = -1;
      this.tunnel = null;
      this.tunnelTimer = 3500;
      this.time = BRIDGE_MS;
      this.leader = null;
      this.flash = 0;
      this.popups = [];
      this.over = false;
      this.won = 0;
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 800 });
    },

    gunPos() {
      return { x: this.p.x, y: ROOF + this.p.y - (this.p.duck ? 22 : 46) };
    },

    doFire() {
      if (this.over || this.won || this.fire > 0) return;
      this.fire = FIRE_MS;
      const g = this.gunPos();
      const ax = this.aim.x + this.cam, ay = this.aim.y;
      const d = Math.hypot(ax - g.x, ay - g.y) || 1;
      this.bullets.push({ x: g.x, y: g.y, vx: ((ax - g.x) / d) * BULLET_SPEED, vy: ((ay - g.y) / d) * BULLET_SPEED });
    },

    onAction() { this.doFire(); },
    onPointer(x, y) { this.aim = { x, y }; this.doFire(); },
    onPointerMove(x, y) { this.aim = { x, y }; },

    hurt(text) {
      const p = this.p;
      if (p.invuln > 0 || this.over) return;
      p.hp--;
      p.invuln = INVULN_MS;
      this.flash = 300;
      this.popup(text, p.x - this.cam, ROOF + p.y - 90, "#ff6b6b");
      if (p.hp <= 0) {
        this.over = true;
        this.api.fail("Je bent van de trein gevallen. De kapers zijn ontsnapt.");
      }
    },

    spawnWagon(i) {
      // a couple of kidnappers climb out of the hatch of the next wagon
      const n = 1 + Math.min(2, Math.floor((i + 1) / 3));
      for (let k = 0; k < n; k++) {
        this.enemies.push({
          x: wagonX(i) + WAGON_W / 2 + (k - (n - 1) / 2) * 50,
          hp: ENEMY_HP,
          state: "emerge",
          timer: 500 + k * 500,
          up: 0,
          look: G.ENEMY_LOOK(),
          flash: 0,
        });
      }
    },

    update(dt, t) {
      if (this.over) return;
      const s = dt / 1000;
      const p = this.p;
      this.fire = Math.max(0, this.fire - dt);
      this.flash = Math.max(0, this.flash - dt);
      p.invuln = Math.max(0, p.invuln - dt);
      this.popups = G.updatePopups(this.popups, dt);
      this.scroll += TRAIN_SPEED * s;
      if (G.held.action) this.doFire();

      if (this.won) {
        this.won -= dt;
        if (this.won <= 0) {
          this.over = true;
          this.api.complete();
        }
        return;
      }

      this.time -= dt;
      if (this.time <= 0) {
        this.over = true;
        this.api.fail("De trein reed de kapotte brug op... Te laat!");
        return;
      }

      // movement
      const grounded = p.y >= 0;
      p.duck = grounded && G.held.down;
      const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
      if (!p.duck) p.x += mx * RUN * s;
      if (mx) p.facing = mx;
      const maxX = this.leader && this.leader.hp > 0 ? this.leader.x - 40 : WORLD_W - 20;
      p.x = G.clamp(p.x, 20, maxX);
      if (G.held.up && grounded && !p.duck) p.vy = -JUMP_V;
      p.vy += GRAVITY * s;
      p.y = Math.min(0, p.y + p.vy * s);
      if (p.y >= 0) p.vy = 0;
      if (p.y >= 0 && overGap(p.x)) {
        this.hurt("GEVALLEN!");
        p.x = p.safeX;
        p.y = 0;
        if (this.over) return;
      } else if (p.y >= 0) p.safeX = p.x;
      this.cam = G.clamp(p.x - 180, 0, WORLD_W - W);

      // wagons ahead fill with kidnappers as you go
      const wagon = Math.min(WAGONS - 1, Math.floor(p.x / (WAGON_W + GAP)));
      if (p.x < LOCO_X && wagon + 1 > this.spawnedWagon && wagon + 1 < WAGONS) {
        this.spawnedWagon = wagon + 1;
        this.spawnWagon(wagon + 1);
      }
      if (!this.leader && p.x > LOCO_X - 140) {
        this.leader = { x: LOCO_X + LOCO_W - 40, hp: LEADER_HP, state: "aim", timer: 1400, flash: 0, look: { ...G.ENEMY_LOOK(), shirt: "#2a2a2a" } };
        this.popup("De kaper-leider!", W / 2, 120, "#ff8a3a");
      }

      // tunnels: warning, then the ceiling rushes past - duck!
      if (!this.tunnel) {
        this.tunnelTimer -= dt;
        if (this.tunnelTimer <= 0) {
          this.tunnel = { sx: W + TRAIN_SPEED * (TUNNEL_WARN / 1000), warn: TUNNEL_WARN };
          this.tunnelTimer = TUNNEL_EVERY[0] + Math.random() * (TUNNEL_EVERY[1] - TUNNEL_EVERY[0]);
        }
      } else {
        const tn = this.tunnel;
        tn.sx -= TRAIN_SPEED * s;
        tn.warn -= dt;
        const px = p.x - this.cam;
        if (px > tn.sx && px < tn.sx + TUNNEL_LEN && !p.duck) this.hurt("TUNNEL! Bukken!");
        if (tn.sx + TUNNEL_LEN < -20) this.tunnel = null;
        if (this.over) return;
      }

      // kidnappers
      for (const e of this.enemies) {
        e.flash = Math.max(0, e.flash - dt);
        if (e.dead) {
          e.timer -= dt;
          continue;
        }
        e.timer -= dt;
        if (e.state === "emerge") {
          if (e.timer <= 0) {
            e.up = Math.min(1, e.up + dt / 300);
            if (e.up >= 1) {
              e.state = "aim";
              e.timer = ENEMY_AIM;
            }
          }
        } else if (e.state === "aim" && e.timer <= 0) {
          const dir = p.x < e.x ? -1 : 1;
          this.enemyShots.push({ x: e.x + dir * 20, y: ROOF - CHEST, vx: dir * ENEMY_SHOT });
          e.state = "aim";
          e.timer = ENEMY_AIM + Math.random() * 600;
        }
      }
      this.enemies = this.enemies.filter((e) => !e.dead || e.timer > 0);

      // leader with a minigun: aims, sweeps, reloads
      const L = this.leader;
      if (L && L.hp > 0) {
        L.flash = Math.max(0, L.flash - dt);
        L.timer -= dt;
        if (L.state === "aim" && L.timer <= 0) {
          L.state = "sweep";
          L.timer = 1300;
          L.burst = 0;
        } else if (L.state === "sweep") {
          L.burst -= dt;
          if (L.burst <= 0) {
            L.burst = 90;
            this.enemyShots.push({ x: L.x - 26, y: ROOF - CHEST + (Math.random() - 0.5) * 8, vx: -ENEMY_SHOT * 1.4 });
          }
          if (L.timer <= 0) {
            L.state = "reload";
            L.timer = 1600;
          }
        } else if (L.state === "reload" && L.timer <= 0) {
          L.state = "aim";
          L.timer = 900;
        }
      }

      // enemy bullets fly at chest height: ducking dodges them
      for (const b of this.enemyShots) {
        b.x += b.vx * s;
        if (Math.abs(b.x - p.x) < 10 && !p.duck && p.y > -30) {
          b.done = true;
          this.hurt("-1 ❤");
          if (this.over) return;
        }
        if (b.x < this.cam - 40 || b.x > this.cam + W + 40) b.done = true;
      }
      this.enemyShots = this.enemyShots.filter((b) => !b.done);

      // your bullets
      for (const b of this.bullets) {
        b.x += b.vx * s;
        b.y += b.vy * s;
        if (b.x < this.cam - 20 || b.x > this.cam + W + 20 || b.y < -20 || b.y > H) {
          b.done = true;
          continue;
        }
        for (const e of this.enemies) {
          if (e.dead || e.up < 0.6) continue;
          if (Math.abs(b.x - e.x) < 12 && b.y > ROOF - 70 && b.y < ROOF) {
            b.done = true;
            e.hp--;
            e.flash = 100;
            if (e.hp <= 0) {
              e.dead = true;
              e.timer = 600;
              this.popup("RAAK", e.x - this.cam, ROOF - 80, "#6ee07a");
            }
            break;
          }
        }
        if (!b.done && L && L.hp > 0 && Math.abs(b.x - L.x) < 16 && b.y > ROOF - 90 && b.y < ROOF) {
          b.done = true;
          L.hp--;
          L.flash = 100;
          if (L.hp <= 0) {
            this.won = 2200;
            this.enemyShots = [];
            this.popup("Trein gestopt!", W / 2, 120, "#6ee07a");
          }
        }
      }
      this.bullets = this.bullets.filter((b) => !b.done);
    },

    render(ctx, t) {
      const p = this.p;
      const cam = this.cam;
      drawScenery(ctx, this.scroll);
      drawTrain(ctx, cam, t);

      for (const e of this.enemies) {
        const sx = e.x - cam;
        if (sx < -40 || sx > W + 40) continue;
        ctx.save();
        ctx.beginPath();
        ctx.rect(sx - 40, 0, 80, ROOF);
        ctx.clip();
        const hand = G.drawKid(ctx, sx, ROOF + (1 - e.up) * 70 + (e.dead ? (1 - e.timer / 600) * 70 : 0), 0.72, e.look, {
          adult: true, t, facing: p.x < e.x ? -1 : 1, armAngle: -0.05, flash: e.flash > 0, dizzy: e.dead, angry: !e.dead,
        });
        if (!e.dead && e.up >= 1) G.drawRifle(ctx, hand, p.x < e.x ? Math.PI : 0, p.x < e.x ? -1 : 1, 0.7);
        ctx.restore();
        if (!e.dead && e.state === "aim" && e.up >= 1) {
          const k = 1 - e.timer / ENEMY_AIM;
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(sx - 16, ROOF - 82, 32, 4);
          ctx.fillStyle = "#ff4040";
          ctx.fillRect(sx - 16, ROOF - 82, 32 * Math.max(0, k), 4);
        }
      }

      const L = this.leader;
      if (L) {
        const sx = L.x - cam;
        const hand = G.drawKid(ctx, sx, ROOF, 0.85, L.look, { adult: true, t, facing: -1, armAngle: 0, flash: L.flash > 0, pose: L.hp > 0 ? "stand" : "down", dizzy: L.hp <= 0, angry: true });
        if (L.hp > 0) {
          ctx.fillStyle = "#3a3a3a";
          ctx.fillRect(hand.x - 34, hand.y - 6, 36, 12);
          for (let k = 0; k < 3; k++) ctx.fillRect(hand.x - 46, hand.y - 5 + k * 4, 14, 2);
          if (L.state === "aim") {
            ctx.strokeStyle = "rgba(255,40,40,0.6)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(hand.x - 46, hand.y);
            ctx.lineTo(0, ROOF - CHEST);
            ctx.stroke();
          }
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(sx - 30, ROOF - 108, 60, 6);
          ctx.fillStyle = "#e05050";
          ctx.fillRect(sx - 30, ROOF - 108, 60 * (L.hp / LEADER_HP), 6);
          if (L.state === "reload") {
            ctx.fillStyle = "#6ee07a";
            ctx.font = "bold 11px Segoe UI, Roboto, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("HERLAADT — NU!", sx, ROOF - 114);
          }
        }
      }

      // player
      const px = p.x - cam;
      const fy = ROOF + p.y;
      const g = this.gunPos();
      const ang = Math.atan2(this.aim.y - g.y, this.aim.x - (g.x - cam));
      const facing = this.aim.x >= px ? 1 : -1;
      if (p.duck) {
        G.drawKid(ctx, px, fy, 0.75, G.soldierLook(), { adult: true, t: 0, pose: "crawl", flash: p.invuln > 0 });
      } else {
        const hand = G.drawKid(ctx, px, fy, 0.75, G.soldierLook(), { adult: true, t, facing, pose: G.held.left || G.held.right ? "walk" : "stand", flash: p.invuln > 0, armAngle: G.clamp(facing === 1 ? ang : Math.PI - ang, -1.4, 0.8) });
        G.drawHelmet(ctx, px, fy, 0.75, facing);
        G.drawRifle(ctx, hand, ang, facing, 0.75, this.fire > FIRE_MS / 2);
      }

      ctx.fillStyle = "#ffe066";
      for (const b of this.bullets) ctx.fillRect(b.x - cam - 2, b.y - 1, 5, 2);
      ctx.fillStyle = "#ff6040";
      for (const b of this.enemyShots) ctx.fillRect(b.x - cam - 4, b.y - 1.5, 8, 3);

      // tunnel
      const tn = this.tunnel;
      if (tn) {
        if (tn.warn > 0) G.drawBanner(ctx, "TUNNEL! Bukken met ↓", "#ffd24a", 90);
        ctx.fillStyle = "#3a2a1a";
        ctx.fillRect(tn.sx, 0, TUNNEL_LEN, ROOF - 70);
        ctx.fillStyle = "#5a4a3a";
        ctx.fillRect(tn.sx - 14, 0, 14, ROOF - 40);
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(tn.sx, ROOF - 70, TUNNEL_LEN, H - ROOF + 70);
      }

      if (this.flash > 0) {
        ctx.fillStyle = `rgba(200,40,40,${0.3 * (this.flash / 300)})`;
        ctx.fillRect(0, 0, W, H);
      }

      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.aim.x, this.aim.y, 9, 0, Math.PI * 2);
      ctx.stroke();

      // HUD
      ctx.fillStyle = "#ff6b6b";
      ctx.font = "18px Segoe UI, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("❤".repeat(Math.max(0, p.hp)), 12, 24);
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(W - 170, 12, 156, 10);
      ctx.fillStyle = this.time < 20000 ? "#ff5050" : "#ffd24a";
      ctx.fillRect(W - 170, 12, 156 * (1 - this.time / BRIDGE_MS), 10);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`BRUG over ${Math.ceil(this.time / 1000)}s`, W - 14, 36);
      if (this.won) G.drawBanner(ctx, "Trein gestopt!", "#6ee07a", 140);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return `Gekaapte trein · brug over ${Math.ceil(this.time / 1000)}s`;
    },
  };
})();
