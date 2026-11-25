(() => {
  const { W, H } = G;
  // part 1: the cell
  const BEND_PER_PRESS = 2.5;
  const CAUGHT_LOSS = 35;
  const STRIKES = 3;
  const CELL_MS = 45000;
  const TURN_WARN = 550;
  // part 2: sneaking out
  const ROOM = { x: 20, y: 44, w: W - 40, h: H - 54 };
  const R = 11;
  const SPEED = 125;
  const HP = 4;
  const INVULN_MS = 900;
  const FIRE_MS = 220;
  const BOLT_SPEED = 600;
  const GUARD_HP = 2;
  const GUARD_SPEED = 45;
  const CONE = 0.55;
  const CONE_LEN = 130;
  const SEE_MS = 650;
  const GUARD_FIRE = 1000;
  const WALLS = [
    { x: 120, y: 44, w: 16, h: 250 }, { x: 120, y: 350, w: 16, h: 90 },
    { x: 240, y: 150, w: 16, h: 290 },
    { x: 380, y: 44, w: 16, h: 280 },
    { x: 256, y: 240, w: 70, h: 16 },
  ];
  const LOCKER = { x: 300, y: 70 };
  const POD = { x: 470, y: 392, w: 46, h: 44 };
  const PATROLS = [
    [{ x: 36, y: 170 }, { x: 104, y: 170 }],
    [{ x: 152, y: 215 }, { x: 226, y: 215 }],
    [{ x: 272, y: 160 }, { x: 366, y: 160 }],
    [{ x: 412, y: 290 }, { x: 506, y: 290 }],
  ];

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const inWall = (x, y) => WALLS.some((w) => x > w.x && x < w.x + w.w && y > w.y && y < w.y + w.h);
  const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  function collide(o) {
    for (const w of WALLS) {
      const cx = G.clamp(o.x, w.x, w.x + w.w), cy = G.clamp(o.y, w.y, w.y + w.h);
      const d = Math.hypot(o.x - cx, o.y - cy);
      if (d < R && d > 0) {
        o.x = cx + ((o.x - cx) / d) * R;
        o.y = cy + ((o.y - cy) / d) * R;
      }
    }
    o.x = G.clamp(o.x, ROOM.x + R, ROOM.x + ROOM.w - R);
    o.y = G.clamp(o.y, ROOM.y + R, ROOM.y + ROOM.h - R);
  }
  function lineOfSight(a, b) {
    const n = Math.ceil(dist(a, b) / 6);
    for (let i = 1; i < n; i++) if (inWall(a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n)) return false;
    return true;
  }

  function drawCellScene(ctx, t, bend, guard) {
    ctx.fillStyle = "#1a1028";
    ctx.fillRect(0, 0, W, H);
    // organic alien walls
    ctx.fillStyle = "#2a1a3a";
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.ellipse(i * 70, 60 + Math.sin(i * 1.7) * 12, 50, 40, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#3a2050";
    ctx.fillRect(0, 360, W, H - 360);
    // glowing pods on the wall
    for (const x of [330, 420, 500]) {
      ctx.fillStyle = `rgba(160,255,120,${0.4 + 0.2 * Math.sin((t || 0) * 2 + x)})`;
      ctx.beginPath();
      ctx.ellipse(x, 200, 14, 24, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // the cell
    ctx.fillStyle = "#24142e";
    ctx.fillRect(20, 120, 200, 240);
    ctx.strokeStyle = "#8aff7a";
    ctx.lineWidth = 6;
    for (let i = 0; i < 6; i++) {
      const x = 40 + i * 34;
      // the two middle bars bend apart
      const k = i === 2 ? -1 : i === 3 ? 1 : 0;
      const b = (bend || 0) / 100;
      ctx.beginPath();
      ctx.moveTo(x, 120);
      ctx.quadraticCurveTo(x + k * b * 30, 240, x, 360);
      ctx.stroke();
    }
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(26, 120);
    ctx.lineTo(214, 120);
    ctx.stroke();
  }

  function drawLab(ctx, t, gunTaken) {
    ctx.fillStyle = "#140c20";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#2a1c3a";
    ctx.fillRect(ROOM.x, ROOM.y, ROOM.w, ROOM.h);
    ctx.fillStyle = "#30203f";
    for (let x = ROOM.x; x < ROOM.x + ROOM.w; x += 30) for (let y = ROOM.y; y < ROOM.y + ROOM.h; y += 30) if (((x + y) / 30) % 2 === 0) ctx.fillRect(x, y, 30, 30);
    for (const w of WALLS) {
      ctx.fillStyle = "#5a3a7a";
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.fillStyle = "#8aff7a";
      ctx.fillRect(w.x + w.w / 2 - 1, w.y + 4, 2, w.h - 8);
    }
    // your cell (open)
    ctx.strokeStyle = "#8aff7a";
    ctx.lineWidth = 3;
    ctx.strokeRect(24, 380, 60, 56);
    // the locker with your laser gun
    ctx.fillStyle = gunTaken ? "#3a3a4a" : "#6a6a8a";
    ctx.fillRect(LOCKER.x - 16, LOCKER.y - 20, 32, 40);
    if (!gunTaken) {
      ctx.fillStyle = "#7affd0";
      ctx.font = "bold 16px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("🔫", LOCKER.x, LOCKER.y + 6 + Math.sin((t || 0) * 4) * 2);
    }
    // escape pod
    ctx.fillStyle = "#c8d0e0";
    ctx.beginPath();
    ctx.roundRect(POD.x, POD.y, POD.w, POD.h, 16);
    ctx.fill();
    ctx.fillStyle = "#7affd0";
    ctx.beginPath();
    ctx.arc(POD.x + POD.w / 2, POD.y + 18, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 9px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("CAPSULE", POD.x + POD.w / 2, POD.y + 38);
  }

  G.CAREER_LEVELS.marine[6] = {
    title: "Level 6 — Gevangen op de alienplaneet (26 jaar)",
    intro:
      "Je bent 26. Je schip is neergeschoten boven een <strong>alienplaneet</strong> en jij zit in een <strong>alien-cel</strong>.<br>" +
      "Deel 1: <strong>ram op SPATIE</strong> om de tralies te verbuigen, maar alleen als de bewaker <strong>wegkijkt</strong>! Bij het <strong>?</strong> draait hij zich om. 3× betrapt = vast.<br>" +
      "Deel 2: sluip langs de bewakers (blijf uit hun <strong>lichtkegel</strong>), pak je <strong>laserpistool</strong> uit de kast en vlucht naar de <strong>capsule</strong>. Met je pistool kun je terugschieten (<strong>muis</strong> / <strong>SPATIE</strong>).",

    drawBackground(ctx, t) {
      drawCellScene(ctx, t, 0, null);
    },

    start(api) {
      this.api = api;
      this.phase = "cell";
      this.bend = 0;
      this.strikes = 0;
      this.cellT = CELL_MS;
      this.lastPress = -9999;
      this.clock = 0;
      // corridor guard: walks, sometimes turns to look at you
      this.cg = { x: 420, dir: 1, looking: false, warn: 0, timer: 2500 + Math.random() * 1500 };
      this.popups = [];
      this.flash = 0;
      this.over = false;
      this.won = 0;
      this.shake = 0;
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 1100 });
    },

    startSneak() {
      this.phase = "sneak";
      this.p = { x: 54, y: 400, hp: HP, invuln: 0, facing: 1, moving: false };
      this.gun = false;
      this.guards = PATROLS.map((path, i) => ({ x: path[0].x, y: path[0].y, path, leg: 1, wait: 600 + i * 300, angle: Math.atan2(path[1].y - path[0].y, path[1].x - path[0].x), hp: GUARD_HP, flash: 0, see: 0, alert: false, fireT: GUARD_FIRE, seed: i * 2.1, down: false }));
      this.aim = { x: 300, y: 200 };
      this.fire = 0;
      this.bolts = [];
      this.plasma = [];
      this.popup("Uit de cel! Pak je laserpistool.", W / 2, 110, "#7affd0");
    },

    onAction() {
      if (this.over || this.won) return;
      if (this.phase === "cell") {
        this.lastPress = this.clock;
        const g = this.cg;
        if (g.looking) {
          this.strikes++;
          this.bend = Math.max(0, this.bend - CAUGHT_LOSS);
          this.flash = 350;
          this.popup("BETRAPT! Hij duwt de tralies terug.", W / 2, 90, "#ff6b6b");
          g.looking = true;
          g.timer = 1200;
          if (this.strikes >= STRIKES) {
            this.over = true;
            this.api.fail("De bewaker heeft je te vaak betrapt. Je zit nog steeds in de cel.");
          }
          return;
        }
        this.bend = Math.min(100, this.bend + BEND_PER_PRESS);
        this.shake = 120;
        if (this.bend >= 100) {
          this.popup("De tralies zijn verbogen!", W / 2, 90, "#6ee07a");
          this.startSneak();
        }
        return;
      }
      this.doFire();
    },
    onPointer(x, y) {
      this.aim = { x, y };
      if (this.phase === "sneak") this.doFire();
    },
    onPointerMove(x, y) {
      this.aim = { x, y };
    },

    doFire() {
      if (this.phase !== "sneak" || !this.gun || this.fire > 0 || this.over || this.won) return;
      this.fire = FIRE_MS;
      const p = this.p;
      const d = dist(p, this.aim) || 1;
      this.bolts.push({ x: p.x, y: p.y - 8, vx: ((this.aim.x - p.x) / d) * BOLT_SPEED, vy: ((this.aim.y - p.y + 8) / d) * BOLT_SPEED });
    },

    hurt() {
      const p = this.p;
      if (p.invuln > 0 || this.over || this.won) return;
      p.hp--;
      p.invuln = INVULN_MS;
      this.flash = 300;
      this.popup("-1 ❤", p.x, p.y - 40, "#ff6b6b");
      if (p.hp <= 0) {
        this.over = true;
        this.api.fail("De alienbewakers hebben je uitgeschakeld.");
      }
    },

    sees(g, o) {
      if (g.down) return false;
      const d = dist(g, o);
      if (d > CONE_LEN) return false;
      if (d > 26 && Math.abs(angDiff(Math.atan2(o.y - g.y, o.x - g.x), g.angle)) > CONE) return false;
      return lineOfSight(g, o);
    },

    update(dt) {
      if (this.over) return;
      const s = dt / 1000;
      this.clock += dt;
      this.popups = G.updatePopups(this.popups, dt);
      this.flash = Math.max(0, this.flash - dt);
      this.shake = Math.max(0, this.shake - dt);
      if (this.won) {
        this.won -= dt;
        if (this.won <= 0) {
          this.over = true;
          this.api.complete();
        }
        return;
      }

      if (this.phase === "cell") {
        this.cellT -= dt;
        if (this.cellT <= 0) {
          this.over = true;
          this.api.fail("Te laat: de aliens komen je halen voor hun experimenten.");
          return;
        }
        const g = this.cg;
        g.timer -= dt;
        if (g.looking) {
          if (g.timer <= 0) {
            g.looking = false;
            g.timer = 1800 + Math.random() * 2600;
          }
        } else {
          g.x += g.dir * 40 * s;
          if (g.x > 500 || g.x < 300) g.dir *= -1;
          if (g.warn > 0) {
            g.warn -= dt;
            if (g.warn <= 0) {
              g.looking = true;
              g.timer = 1000 + Math.random() * 1000;
            }
          } else if (g.timer <= 0) g.warn = TURN_WARN;
        }
        return;
      }

      // sneaking
      const p = this.p;
      this.fire = Math.max(0, this.fire - dt);
      p.invuln = Math.max(0, p.invuln - dt);
      if (G.held.action || G.mouseDown) this.doFire();
      const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
      const my = (G.held.down ? 1 : 0) - (G.held.up ? 1 : 0);
      p.moving = !!(mx || my);
      if (p.moving) {
        const len = Math.hypot(mx, my);
        p.x += (mx / len) * SPEED * s;
        p.y += (my / len) * SPEED * s;
        collide(p);
        if (mx) p.facing = mx;
      }
      if (this.gun) p.facing = this.aim.x >= p.x ? 1 : -1;
      if (!this.gun && dist(p, LOCKER) < 30) {
        this.gun = true;
        this.popup("Laserpistool terug! Nu kun je terugschieten.", W / 2, 110, "#7affd0");
      }
      if (p.x > POD.x - 4 && p.y > POD.y - 4) {
        this.won = 2400;
        this.popup("De capsule schiet weg van de planeet!", W / 2, 110, "#6ee07a");
        return;
      }

      for (const g of this.guards) {
        g.flash = Math.max(0, g.flash - dt);
        if (g.down) continue;
        const seen = this.sees(g, p);
        if (g.alert) {
          g.angle = Math.atan2(p.y - g.y, p.x - g.x);
          if (seen) {
            g.fireT -= dt;
            if (g.fireT <= 0) {
              g.fireT = GUARD_FIRE;
              this.plasma.push({ x: g.x, y: g.y - 10, vx: Math.cos(g.angle) * 230, vy: Math.sin(g.angle) * 230 });
            }
          } else {
            g.see = Math.max(0, g.see - dt / 2500);
            if (g.see <= 0) g.alert = false;
          }
          continue;
        }
        if (seen) {
          g.see += dt / SEE_MS;
          if (g.see >= 1) {
            if (!this.gun) {
              this.over = true;
              this.api.fail("Gesnapt! De bewakers sleuren je terug de cel in.");
              return;
            }
            g.alert = true;
            g.fireT = 400;
            this.popup("!", g.x, g.y - 40, "#ff4040");
          }
          continue;
        }
        g.see = Math.max(0, g.see - dt / 1500);
        // patrol
        if (g.wait > 0) {
          g.wait -= dt;
          continue;
        }
        const wp = g.path[g.leg];
        const d = dist(g, wp);
        if (d < 3) {
          g.leg = 1 - g.leg;
          g.wait = 1300;
          // turn around on the spot
          const nw = g.path[g.leg];
          g.angle = Math.atan2(nw.y - g.y, nw.x - g.x);
          continue;
        }
        const ta = Math.atan2(wp.y - g.y, wp.x - g.x);
        g.angle += angDiff(ta, g.angle) * Math.min(1, s * 10);
        g.x += ((wp.x - g.x) / d) * GUARD_SPEED * s;
        g.y += ((wp.y - g.y) / d) * GUARD_SPEED * s;
      }

      for (const pl of this.plasma) {
        pl.x += pl.vx * s;
        pl.y += pl.vy * s;
        if (inWall(pl.x, pl.y) || pl.x < ROOM.x || pl.x > ROOM.x + ROOM.w || pl.y < ROOM.y || pl.y > ROOM.y + ROOM.h) pl.done = true;
        else if (Math.hypot(pl.x - p.x, pl.y - (p.y - 8)) < R + 3) {
          pl.done = true;
          this.hurt();
        }
      }
      this.plasma = this.plasma.filter((pl) => !pl.done);
      if (this.over) return;
      for (const b of this.bolts) {
        b.x += b.vx * s;
        b.y += b.vy * s;
        if (inWall(b.x, b.y) || b.x < ROOM.x || b.x > ROOM.x + ROOM.w || b.y < ROOM.y || b.y > ROOM.y + ROOM.h) {
          b.done = true;
          continue;
        }
        for (const g of this.guards) {
          if (g.down || Math.hypot(g.x - b.x, g.y - 10 - b.y) > 14) continue;
          b.done = true;
          g.hp--;
          g.flash = 90;
          g.alert = true;
          g.see = 1;
          if (g.hp <= 0) {
            g.down = true;
            this.popup("Verdoofd!", g.x, g.y - 34, "#7affd0");
          }
          break;
        }
      }
      this.bolts = this.bolts.filter((b) => !b.done);
    },

    render(ctx, t) {
      if (this.phase === "cell") {
        const g = this.cg;
        ctx.save();
        if (this.shake > 0) ctx.translate((Math.random() - 0.5) * 4, 0);
        drawCellScene(ctx, t, this.bend, g);
        ctx.restore();
        // you, pulling at the bars
        const pulling = this.clock - this.lastPress < 250;
        G.drawKid(ctx, 120, 340, 0.6, G.marineLook(), { adult: true, t, facing: 1, pose: "stand", armAngle: pulling ? -0.2 : 0.6, angry: pulling });
        G.drawSpaceHelmet(ctx, 120, 340, 0.6, 1);
        // the guard: facing you (looking) or walking with its back turned
        const facing = g.looking ? -1 : g.dir;
        G.drawAlien(ctx, g.x, 360, 1.2, t, { still: g.looking, seed: 1, color: "#8a6ae0" });
        ctx.fillStyle = "#3a2a60";
        ctx.fillRect(g.x + (facing > 0 ? 6 : -30), 330, 24, 6);
        if (!g.looking) {
          // back turned: cover the eyes with the back of the head
          ctx.fillStyle = "#7a5ad0";
          ctx.beginPath();
          ctx.ellipse(g.x, 360 - 36, 14, 16, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        if (g.warn > 0) {
          ctx.fillStyle = "#ffd24a";
          ctx.font = "bold 30px Segoe UI, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("?", g.x, 270);
        }
        if (g.looking) {
          ctx.fillStyle = "#ff4040";
          ctx.font = "bold 14px Segoe UI, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("KIJKT!", g.x, 272);
        }
        // bend meter
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(30, 380, 180, 14);
        ctx.fillStyle = "#8aff7a";
        ctx.fillRect(30, 380, 180 * (this.bend / 100), 14);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px Segoe UI, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`TRALIES ${Math.round(this.bend)}%`, 120, 391);
        ctx.fillStyle = "#ff6b6b";
        ctx.font = "bold 13px Segoe UI, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`Betrapt ${this.strikes}/${STRIKES}`, 14, 26);
        ctx.fillStyle = "#fff";
        ctx.textAlign = "right";
        ctx.fillText(`${Math.max(0, Math.ceil(this.cellT / 1000))}s`, W - 14, 26);
      } else {
        drawLab(ctx, t, this.gun);
        const p = this.p;
        for (const g of this.guards) {
          if (!g.down) {
            ctx.fillStyle = g.alert ? "rgba(255,60,60,0.22)" : g.see > 0 ? "rgba(255,200,60,0.25)" : "rgba(160,255,120,0.14)";
            ctx.beginPath();
            ctx.moveTo(g.x, g.y);
            // the cone stops at walls
            for (let i = 0; i <= 12; i++) {
              const a = g.angle - CONE + (i / 12) * CONE * 2;
              let len = CONE_LEN;
              for (let k = 6; k <= CONE_LEN; k += 6) if (inWall(g.x + Math.cos(a) * k, g.y + Math.sin(a) * k)) { len = k; break; }
              ctx.lineTo(g.x + Math.cos(a) * len, g.y + Math.sin(a) * len);
            }
            ctx.closePath();
            ctx.fill();
          }
          ctx.save();
          if (g.down) {
            ctx.translate(g.x, g.y);
            ctx.rotate(Math.PI / 2);
            ctx.translate(-g.x, -g.y);
          }
          G.drawAlien(ctx, g.x, g.y + 8, 0.55, t, { flash: g.flash > 0, seed: g.seed, still: g.down, color: "#8a6ae0" });
          ctx.restore();
          if (!g.down && g.see > 0 && !g.alert) {
            ctx.fillStyle = "#ffd24a";
            ctx.fillRect(g.x - 12, g.y - 34, 24 * Math.min(1, g.see), 3);
          }
        }
        ctx.fillStyle = "#b0ff70";
        for (const pl of this.plasma) {
          ctx.beginPath();
          ctx.arc(pl.x, pl.y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "#7affd0";
        for (const b of this.bolts) {
          ctx.beginPath();
          ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        const ang = Math.atan2(this.aim.y - p.y, this.aim.x - p.x);
        ctx.globalAlpha = p.invuln > 0 && Math.floor(t * 12) % 2 ? 0.5 : 1;
        const hand = G.drawKid(ctx, p.x, p.y + 12, 0.42, G.marineLook(), { adult: true, t, facing: p.facing, pose: p.moving ? "walk" : "stand", armAngle: this.gun ? G.clamp(p.facing === 1 ? ang : Math.PI - ang, -1.4, 1) : 0.2 });
        G.drawSpaceHelmet(ctx, p.x, p.y + 12, 0.42, p.facing);
        if (this.gun) G.drawLaserGun(ctx, hand, ang, p.facing, 0.5, this.fire > FIRE_MS - 60);
        ctx.globalAlpha = 1;
        if (this.gun) {
          ctx.strokeStyle = "rgba(255,255,255,0.8)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(this.aim.x, this.aim.y, 8, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = "#ff6b6b";
        ctx.font = "16px Segoe UI, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("❤".repeat(Math.max(0, p.hp)), 14, 30);
        ctx.fillStyle = "#7affd0";
        ctx.font = "bold 13px Segoe UI, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(this.gun ? "Naar de capsule!" : "Pak je laserpistool 🔫", W - 14, 30);
      }
      if (this.flash > 0) {
        ctx.fillStyle = `rgba(200,40,40,${0.3 * (this.flash / 350)})`;
        ctx.fillRect(0, 0, W, H);
      }
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return this.phase === "cell" ? `Tralies ${Math.round(this.bend)}%` : this.gun ? "Vlucht naar de capsule" : "Sluip naar je pistool";
    },
  };
})();
