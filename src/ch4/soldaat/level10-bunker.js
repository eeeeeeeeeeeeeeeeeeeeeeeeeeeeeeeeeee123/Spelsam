(() => {
  const { W, H } = G;
  const R = 12;
  const SPEED = 160;
  const HP = 6;
  const ROOM_HEAL = 3;
  const INVULN_MS = 700;
  const FIRE_MS = 140;
  const BULLET_SPEED = 680;
  const GUARD_HP = 3;
  const GUARD_AIM = 1300;
  const GUARD_BOLT = 300;
  const TURRET_HP = 10;
  const BOSS_HP = 20;
  const BOSS_R = 28;
  const BOSS_TURN = 0.95;
  const BOSS_SPEED = 45;
  const SHIELD_ARC = 0.95; // front half-angle the shield covers
  const FLAME_LEN = 150;
  const FLAME_ARC = 0.38;
  const NADE_WARN = 1100;
  const NADE_R = 45;
  const DOOR = { x: W - 34, y: H / 2 - 35, w: 24, h: 70 };
  const ROOMS = [
    { pillars: [{ x: 170, y: 110, w: 36, h: 36 }, { x: 330, y: 300, w: 36, h: 36 }, { x: 330, y: 110, w: 36, h: 36 }], guards: [{ x: 420, y: 130 }, { x: 440, y: 330 }, { x: 260, y: 220 }] },
    { pillars: [{ x: 150, y: 150, w: 30, h: 60 }, { x: 150, y: 290, w: 30, h: 60 }, { x: 330, y: 220, w: 40, h: 40 }], guards: [{ x: 430, y: 120 }, { x: 430, y: 360 }], turret: { x: W / 2 + 60, y: 70 } },
    { pillars: [{ x: 120, y: 110, w: 30, h: 30 }, { x: 390, y: 110, w: 30, h: 30 }, { x: 120, y: 330, w: 30, h: 30 }, { x: 390, y: 330, w: 30, h: 30 }], boss: true },
  ];
  const GENERAL_LOOK = { ...G.SKINS.wit, hair: "kort", hairColor: "#cfcfcf", eyes: G.EYES.bruin, gender: "jongen", shirt: "#4a3a2a", pants: "#3a2a1a" };

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

  G.CAREER_LEVELS.soldaat[10] = {
    title: "Level 10 — Eindbaas: De Generaal (30 jaar)",
    intro:
      "Je bent 30 en sergeant. Laatste missie: de <strong>bunker van de vijandelijke generaal</strong>.<br>" +
      "Lopen met <strong>pijltjes / WASD</strong>, mik met de <strong>muis</strong>, schiet met <strong>klik</strong> / <strong>SPATIE</strong>. Maak <strong>3 kamers</strong> vrij, de deur rechts gaat dan open.<br>" +
      "De generaal zit in een <strong>mechapak</strong> met een <strong>schild</strong> aan de voorkant. Loop om hem heen en schiet op de <strong>brandstoftank op zijn rug</strong>!",

    drawBackground(ctx) {
      this.room = 0;
      this.drawRoom(ctx, 0);
    },

    start(api) {
      this.api = api;
      this.p = { x: 50, y: H / 2, hp: HP, invuln: 0, facing: 1, moving: false };
      this.aim = { x: W / 2, y: H / 2 };
      this.fire = 0;
      this.bullets = [];
      this.bolts = [];
      this.nades = [];
      this.popups = [];
      this.flash = 0;
      this.over = false;
      this.won = 0;
      this.enterRoom(0);
    },

    enterRoom(i) {
      this.room = i;
      const r = ROOMS[i];
      this.p.x = 50;
      this.p.y = H / 2;
      if (i > 0) {
        this.p.hp = Math.min(HP, this.p.hp + ROOM_HEAL);
        this.popup(`Kamer ${i + 1} · +${ROOM_HEAL} ❤`, W / 2, 80, "#6ee07a");
      }
      this.guards = r.guards ? r.guards.map((g) => ({ ...g, hp: GUARD_HP, timer: 900 + Math.random() * 800, flash: 0, look: G.ENEMY_LOOK(), dead: false })) : [];
      this.turret = r.turret ? { ...r.turret, hp: TURRET_HP, angle: Math.PI / 2, sweep: 1, burst: 0, flash: 0 } : null;
      this.boss = r.boss ? { x: W - 120, y: H / 2, angle: Math.PI, hp: BOSS_HP, state: "walk", timer: 1500, flash: 0, ting: 0, flame: 0 } : null;
      this.bolts = [];
      this.nades = [];
      this.bullets = [];
      this.doorOpen = false;
    },

    pillars() {
      return ROOMS[this.room].pillars;
    },
    blocked(x, y) {
      return this.pillars().some((c) => x > c.x && x < c.x + c.w && y > c.y && y < c.y + c.h);
    },
    collide(o, r = R) {
      for (const c of this.pillars()) {
        const cx = G.clamp(o.x, c.x, c.x + c.w), cy = G.clamp(o.y, c.y, c.y + c.h);
        const d = Math.hypot(o.x - cx, o.y - cy);
        if (d < r && d > 0) {
          o.x = cx + ((o.x - cx) / d) * r;
          o.y = cy + ((o.y - cy) / d) * r;
        }
      }
      o.x = G.clamp(o.x, r + 16, W - r - 16);
      o.y = G.clamp(o.y, r + 40, H - r - 10);
    },
    sight(a, b) {
      const n = Math.ceil(dist(a, b) / 8);
      for (let i = 1; i < n; i++) if (this.blocked(a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n)) return false;
      return true;
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 900 });
    },

    doFire() {
      if (this.over || this.won || this.fire > 0) return;
      this.fire = FIRE_MS;
      const p = this.p;
      const d = dist(p, this.aim) || 1;
      this.bullets.push({ x: p.x, y: p.y - 8, vx: ((this.aim.x - p.x) / d) * BULLET_SPEED, vy: ((this.aim.y - p.y) / d) * BULLET_SPEED });
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
        this.api.fail(this.boss ? "De generaal heeft gewonnen. Zoek zijn brandstoftank op zijn rug!" : "Je bent uitgeschakeld in de bunker.");
      }
    },

    updateBoss(dt, s) {
      const b = this.boss, p = this.p;
      b.flash = Math.max(0, b.flash - dt);
      b.ting = Math.max(0, b.ting - dt);
      b.timer -= dt;
      const toP = Math.atan2(p.y - b.y, p.x - b.x);
      const d = dist(b, p);
      const turnRate = b.state === "stunned" ? 0.3 : b.state === "flame" ? BOSS_TURN * 0.6 : BOSS_TURN;
      if (b.state !== "charge") b.angle += G.clamp(angDiff(toP, b.angle), -turnRate * s, turnRate * s);

      if (b.state === "walk") {
        if (d > 90) {
          b.x += Math.cos(b.angle) * BOSS_SPEED * s;
          b.y += Math.sin(b.angle) * BOSS_SPEED * s;
          this.collide(b, BOSS_R);
        }
        if (b.timer <= 0) {
          const facing = Math.abs(angDiff(toP, b.angle)) < 0.5;
          if (d < 170 && facing) { b.state = "flameWarn"; b.timer = 650; }
          else if (Math.random() < 0.5 && facing) { b.state = "chargeWarn"; b.timer = 750; }
          else {
            b.state = "walk";
            b.timer = 2200;
            for (let i = 0; i < 3; i++) this.nades.push({ x: G.clamp(p.x + (Math.random() - 0.5) * 120, 40, W - 40), y: G.clamp(p.y + (Math.random() - 0.5) * 100, 60, H - 20), warn: NADE_WARN + i * 150, boom: 0 });
            this.popup("RAKETTEN!", b.x, b.y - 50, "#ff8a3a");
          }
        }
      } else if (b.state === "flameWarn" && b.timer <= 0) {
        b.state = "flame";
        b.timer = 1300;
      } else if (b.state === "flame") {
        // inside the flame cone?
        if (d < FLAME_LEN + R && Math.abs(angDiff(toP, b.angle)) < FLAME_ARC) this.hurt("AU! VUUR!");
        if (b.timer <= 0) { b.state = "walk"; b.timer = 1800; }
      } else if (b.state === "chargeWarn" && b.timer <= 0) {
        b.state = "charge";
        b.timer = 700;
      } else if (b.state === "charge") {
        b.x += Math.cos(b.angle) * 330 * s;
        b.y += Math.sin(b.angle) * 330 * s;
        const ox = b.x, oy = b.y;
        this.collide(b, BOSS_R);
        if (dist(b, p) < BOSS_R + R) {
          this.hurt("GERAMD!");
          p.x += Math.cos(b.angle) * 40;
          p.y += Math.sin(b.angle) * 40;
          this.collide(p);
        }
        if (b.timer <= 0 || Math.hypot(ox - b.x, oy - b.y) > 1) {
          b.state = "stunned";
          b.timer = 2200;
          this.popup("Vast! Nu achter hem!", b.x, b.y - 50, "#6ee07a");
        }
      } else if (b.state === "stunned" && b.timer <= 0) {
        b.state = "walk";
        b.timer = 1200;
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
        this.collide(p);
      }
      p.facing = this.aim.x >= p.x ? 1 : -1;

      // door to the next room
      if (this.doorOpen && p.x > DOOR.x - 6 && p.y > DOOR.y && p.y < DOOR.y + DOOR.h) {
        this.enterRoom(this.room + 1);
        return;
      }

      // guards: aim (red line), then fire a bolt
      for (const g of this.guards) {
        if (g.dead) continue;
        g.flash = Math.max(0, g.flash - dt);
        if (!this.sight(g, p)) {
          g.timer = Math.max(g.timer, 500);
          continue;
        }
        g.timer -= dt;
        if (g.timer <= 0) {
          g.timer = GUARD_AIM + Math.random() * 500;
          const ang = Math.atan2(p.y - g.y, p.x - g.x) + (Math.random() - 0.5) * 0.1;
          this.bolts.push({ x: g.x, y: g.y - 8, vx: Math.cos(ang) * GUARD_BOLT, vy: Math.sin(ang) * GUARD_BOLT });
        }
      }

      // turret sweeps back and forth
      const tr = this.turret;
      if (tr && tr.hp > 0) {
        tr.flash = Math.max(0, tr.flash - dt);
        tr.angle += tr.sweep * 0.9 * s;
        if (tr.angle > Math.PI - 0.25) tr.sweep = -1;
        if (tr.angle < 0.25) tr.sweep = 1;
        tr.burst -= dt;
        if (tr.burst <= 0) {
          tr.burst = 160;
          this.bolts.push({ x: tr.x + Math.cos(tr.angle) * 20, y: tr.y + Math.sin(tr.angle) * 20, vx: Math.cos(tr.angle) * 330, vy: Math.sin(tr.angle) * 330 });
        }
      }

      if (this.boss && this.boss.hp > 0) this.updateBoss(dt, s);
      if (this.over) return;

      for (const n of this.nades) {
        if (n.warn > 0) {
          n.warn -= dt;
          if (n.warn <= 0) {
            n.boom = 400;
            if (dist(n, p) < NADE_R) this.hurt("BOEM!");
          }
        } else {
          n.boom -= dt;
          if (n.boom <= 0) n.done = true;
        }
      }
      this.nades = this.nades.filter((n) => !n.done);

      for (const b of this.bolts) {
        b.x += b.vx * s;
        b.y += b.vy * s;
        if (b.x < 0 || b.x > W || b.y < 0 || b.y > H || this.blocked(b.x, b.y)) b.done = true;
        else if (dist(b, { x: p.x, y: p.y - 8 }) < R + 3) {
          b.done = true;
          this.hurt();
        }
      }
      this.bolts = this.bolts.filter((b) => !b.done);
      if (this.over) return;

      for (const b of this.bullets) {
        b.x += b.vx * s;
        b.y += b.vy * s;
        if (b.x < 0 || b.x > W || b.y < 0 || b.y > H || this.blocked(b.x, b.y)) { b.done = true; continue; }
        for (const g of this.guards) {
          if (g.dead || dist(b, { x: g.x, y: g.y - 8 }) > R + 3) continue;
          b.done = true;
          g.hp--;
          g.flash = 90;
          if (g.hp <= 0) g.dead = true;
          break;
        }
        if (b.done) continue;
        if (tr && tr.hp > 0 && dist(b, tr) < 18) {
          b.done = true;
          tr.hp--;
          tr.flash = 90;
          if (tr.hp <= 0) this.popup("Geschut kapot!", tr.x, tr.y + 30, "#6ee07a");
          continue;
        }
        const B = this.boss;
        if (B && B.hp > 0 && dist(b, B) < BOSS_R) {
          b.done = true;
          // where did the bullet come from, seen from the general?
          const from = Math.atan2(-b.vy, -b.vx);
          if (Math.abs(angDiff(from, B.angle)) < SHIELD_ARC) {
            B.ting = 120;
            if (Math.random() < 0.15) this.popup("TING! Schild!", B.x, B.y - 50, "#cfcfcf");
          } else {
            B.hp--;
            B.flash = 90;
            if (B.hp <= 0) {
              this.won = 3000;
              this.bolts = [];
              this.nades = [];
            }
          }
        }
      }
      this.bullets = this.bullets.filter((b) => !b.done);

      // room cleared -> door opens
      if (!this.doorOpen && !this.boss && this.guards.every((g) => g.dead) && (!tr || tr.hp <= 0)) {
        this.doorOpen = true;
        this.popup("Deur open! →", W - 80, H / 2 - 50, "#6ee07a");
      }
    },

    drawRoom(ctx, i) {
      ctx.fillStyle = "#2a2a2e";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#3a3a40";
      ctx.fillRect(16, 40, W - 32, H - 50);
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      for (let x = 16; x < W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 40);
        ctx.lineTo(x, H - 10);
        ctx.stroke();
      }
      ctx.fillStyle = "#c0a020";
      for (let k = 0; k < 10; k++) ctx.fillRect(20 + k * 52, 40, 26, 5);
      for (const c of ROOMS[i].pillars) {
        ctx.fillStyle = "#55555c";
        ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.strokeStyle = "#6a6a72";
        ctx.lineWidth = 2;
        ctx.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
      }
      ctx.fillStyle = this.doorOpen ? "#2a6a3a" : "#6a2a2a";
      ctx.fillRect(DOOR.x, DOOR.y, DOOR.w, DOOR.h);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(i === ROOMS.length - 1 ? "" : this.doorOpen ? "OPEN" : "DICHT", DOOR.x + DOOR.w / 2, DOOR.y - 6);
    },

    render(ctx, t) {
      this.drawRoom(ctx, this.room);
      const p = this.p;

      for (const n of this.nades) {
        if (n.warn > 0) {
          ctx.strokeStyle = `rgba(255,60,60,${0.5 + 0.4 * Math.sin(t * 20)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(n.x, n.y, NADE_R, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.fillStyle = `rgba(255,140,40,${(n.boom / 400) * 0.8})`;
          ctx.beginPath();
          ctx.arc(n.x, n.y, NADE_R, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      for (const g of this.guards) {
        const facing = p.x >= g.x ? 1 : -1;
        const ang = Math.atan2(p.y - g.y, p.x - g.x);
        const hand = G.drawKid(ctx, g.x, g.y + 14, 0.5, g.look, { adult: true, t, facing, pose: g.dead ? "down" : "stand", flash: g.flash > 0, dizzy: g.dead, angry: !g.dead, armAngle: G.clamp(facing === 1 ? ang : Math.PI - ang, -1.4, 1) });
        if (!g.dead) {
          G.drawRifle(ctx, hand, ang, facing, 0.5);
          if (g.timer < 600 && this.sight(g, p)) {
            ctx.strokeStyle = "rgba(255,40,40,0.5)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(g.x, g.y - 8);
            ctx.lineTo(p.x, p.y - 8);
            ctx.stroke();
          }
        }
      }

      const tr = this.turret;
      if (tr) {
        ctx.fillStyle = tr.hp > 0 ? (tr.flash > 0 ? "#fff" : "#4a4a52") : "#2a2a2a";
        ctx.beginPath();
        ctx.arc(tr.x, tr.y, 16, 0, Math.PI * 2);
        ctx.fill();
        if (tr.hp > 0) {
          ctx.save();
          ctx.translate(tr.x, tr.y);
          ctx.rotate(tr.angle);
          ctx.fillStyle = "#222";
          ctx.fillRect(0, -4, 28, 8);
          ctx.restore();
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(tr.x - 16, tr.y - 26, 32, 4);
          ctx.fillStyle = "#e05050";
          ctx.fillRect(tr.x - 16, tr.y - 26, 32 * (tr.hp / TURRET_HP), 4);
        }
      }

      const B = this.boss;
      if (B) {
        // flame cone
        if (B.state === "flameWarn" || B.state === "flame") {
          ctx.fillStyle = B.state === "flame" ? `rgba(255,${120 + Math.random() * 80},30,0.75)` : `rgba(255,120,30,${0.15 + 0.15 * Math.sin(t * 25)})`;
          ctx.beginPath();
          ctx.moveTo(B.x, B.y);
          ctx.arc(B.x, B.y, FLAME_LEN, B.angle - FLAME_ARC, B.angle + FLAME_ARC);
          ctx.closePath();
          ctx.fill();
        }
        if (B.state === "chargeWarn") {
          ctx.strokeStyle = "rgba(255,40,40,0.6)";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(B.x, B.y);
          ctx.lineTo(B.x + Math.cos(B.angle) * 260, B.y + Math.sin(B.angle) * 260);
          ctx.stroke();
        }
        ctx.save();
        ctx.translate(B.x, B.y);
        ctx.rotate(B.angle);
        // fuel tank on the back
        ctx.fillStyle = B.hp > 0 ? (B.flash > 0 ? "#fff" : "#d04020") : "#333";
        ctx.beginPath();
        ctx.roundRect(-40, -12, 18, 24, 6);
        ctx.fill();
        ctx.fillStyle = "#ffd24a";
        ctx.fillRect(-36, -2, 10, 4);
        // body
        ctx.fillStyle = B.state === "stunned" ? "#6a6a5a" : "#5a5a4a";
        ctx.beginPath();
        ctx.arc(0, 0, BOSS_R - 4, 0, Math.PI * 2);
        ctx.fill();
        // shield arc in front
        ctx.strokeStyle = B.ting > 0 ? "#fff" : "#9ab0c8";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(0, 0, BOSS_R + 2, -SHIELD_ARC * 0.8, SHIELD_ARC * 0.8);
        ctx.stroke();
        // flamethrower nozzle
        ctx.fillStyle = "#2a2a2a";
        ctx.fillRect(BOSS_R - 6, 8, 18, 7);
        ctx.restore();
        // the general's head pokes out of the cockpit
        G.drawKid(ctx, B.x, B.y + 6, 0.35, GENERAL_LOOK, { adult: true, t, angry: B.hp > 0, dizzy: B.hp <= 0 || B.state === "stunned" });
        ctx.fillStyle = "#4a3a2a";
        ctx.fillRect(B.x - 8, B.y - 32, 16, 4);
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(W / 2 - 120, 12, 240, 10);
        ctx.fillStyle = "#e05050";
        ctx.fillRect(W / 2 - 120, 12, 240 * Math.max(0, B.hp / BOSS_HP), 10);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 11px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("De Generaal — schiet op de brandstoftank (rug)", W / 2, 34);
      }

      // you
      const ang = Math.atan2(this.aim.y - p.y, this.aim.x - p.x);
      const hand = G.drawKid(ctx, p.x, p.y + 14, 0.5, G.soldierLook(), { adult: true, t, facing: p.facing, pose: p.moving ? "walk" : "stand", flash: p.invuln > 0, armAngle: G.clamp(p.facing === 1 ? ang : Math.PI - ang, -1.4, 1) });
      G.drawHelmet(ctx, p.x, p.y + 14, 0.5, p.facing);
      G.drawRifle(ctx, hand, ang, p.facing, 0.55, this.fire > FIRE_MS / 2);

      ctx.fillStyle = "#ffe066";
      for (const b of this.bullets) ctx.fillRect(b.x - 2, b.y - 1, 4, 2);
      ctx.fillStyle = "#ff6040";
      for (const b of this.bolts) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
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
      if (this.won) {
        const k = 1 - this.won / 3000;
        ctx.fillStyle = `rgba(255,${150 + k * 100},40,${Math.max(0, 0.7 - k)})`;
        ctx.beginPath();
        ctx.arc(B.x, B.y, 40 + k * 200, 0, Math.PI * 2);
        ctx.fill();
        G.drawBanner(ctx, "De Generaal is verslagen!", "#6ee07a", 100);
      }

      ctx.fillStyle = "#ff6b6b";
      ctx.font = "18px Segoe UI, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("❤".repeat(Math.max(0, p.hp)), 12, 30);
      if (!B) {
        ctx.fillStyle = "#fff";
        ctx.font = "bold 13px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(`Kamer ${this.room + 1}/${ROOMS.length}`, W - 14, 28);
      }
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return this.boss ? `De Generaal ${Math.max(0, this.boss.hp)}/${BOSS_HP}` : `Bunker · kamer ${this.room + 1}/${ROOMS.length}`;
    },
  };
})();
