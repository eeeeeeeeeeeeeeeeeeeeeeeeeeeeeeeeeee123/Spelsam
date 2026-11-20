(() => {
  const { W, H } = G;
  // part 1: shooting range
  const TARGETS = 18;
  const HOSTAGES = 5;
  const NEED = 10;
  const MAX_HOSTAGE = 2;
  const UP_MS = 1300;
  const LANES = [{ y: 150, s: 0.55 }, { y: 230, s: 0.7 }, { y: 320, s: 0.85 }];
  // part 2: stealth room
  const R = 10;
  const SPEED = 110;
  const ROOM_MS = 30000;
  const VIEW_LEN = 120;
  const VIEW_ARC = 0.5;
  const ALERT_UP = 70;
  const ALERT_DOWN = 25;
  const WALLS = [{ x: 150, y: 90, w: 20, h: 200 }, { x: 290, y: 180, w: 20, h: 230 }, { x: 410, y: 60, w: 20, h: 200 }];
  const EXIT = { x: W - 40, y: 360, w: 26, h: 60 };
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  const INSTRUCTOR = { ...G.SKINS.wit, hair: "kort", hairColor: "#bbb", eyes: G.EYES.blauw, gender: "jongen", shirt: "#2a2a2a", pants: "#2a2a2a" };

  G.CAREER_LEVELS.huurmoordenaar[2] = {
    title: "Level 2 — Het Bureau: toelatingstest (22 jaar)",
    intro:
      "Een geheim <strong>Bureau</strong> wil je inhuren. Eerst twee tests.<br>" +
      "<strong>1. Schietbaan:</strong> schiet de <strong>rode</strong> doelwitten (klik), niet de <strong>blauwe gijzelaars</strong>. Raak er minstens 10 van de 13, en maximaal 2 gijzelaars.<br>" +
      "<strong>2. Sluiptest:</strong> kom binnen <strong>30 seconden</strong> bij de groene uitgang zonder door de bewakers gezien te worden (<strong>pijltjes</strong>, <strong>SPATIE</strong> ingedrukt = sluipen).",

    drawBackground(ctx, t) {
      this.drawRange(ctx);
    },

    drawRange(ctx) {
      ctx.fillStyle = "#2a2a30";
      ctx.fillRect(0, 0, W, H);
      for (const l of LANES) {
        ctx.fillStyle = "#3a3a42";
        ctx.fillRect(0, l.y, W, 8);
      }
      ctx.fillStyle = "#4a4038";
      ctx.fillRect(0, H - 50, W, 50);
      ctx.fillStyle = "#c0a020";
      for (let x = 0; x < W; x += 40) ctx.fillRect(x, H - 52, 20, 4);
    },

    start(api) {
      this.api = api;
      this.phase = "range";
      this.aim = { x: W / 2, y: 200 };
      this.targets = [];
      this.spawned = 0;
      // exactly 13 targets and 5 hostages, in random order
      this.plan = G.shuffle(Array.from({ length: TARGETS }, (_, i) => i < HOSTAGES));
      this.spawnTimer = 800;
      this.hits = 0;
      this.hostage = 0;
      this.shots = [];
      this.popups = [];
      this.over = false;
      this.p = { x: 40, y: 380, facing: 1, moving: false };
      this.guards = [
        { x: 220, y: 120, route: [{ x: 220, y: 120 }, { x: 220, y: 380 }], wp: 1, angle: Math.PI / 2, wait: 0, look: G.ENEMY_LOOK() },
        { x: 360, y: 400, route: [{ x: 360, y: 400 }, { x: 360, y: 90 }], wp: 1, angle: -Math.PI / 2, wait: 0, look: G.ENEMY_LOOK() },
        { x: 480, y: 120, route: [{ x: 480, y: 120 }, { x: 480, y: 300 }], wp: 1, angle: Math.PI / 2, wait: 0, look: G.ENEMY_LOOK() },
      ];
      this.alert = 0;
      this.time = ROOM_MS;
      this.transition = 0;
      this.won = 0;
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 800 });
    },

    onPointer(x, y) {
      this.aim = { x, y };
      if (this.phase !== "range" || this.over) return;
      this.shots.push({ x, y, life: 150 });
      for (const tg of this.targets) {
        if (tg.done || tg.up < 0.6) continue;
        const l = LANES[tg.lane];
        if (Math.abs(x - tg.x) < 22 * l.s && y > l.y - 90 * l.s && y < l.y) {
          tg.done = true;
          tg.hit = 400;
          if (tg.hostage) {
            this.hostage++;
            this.popup("GIJZELAAR!", tg.x, l.y - 100 * l.s, "#ff4040");
            if (this.hostage > MAX_HOSTAGE) {
              this.over = true;
              this.api.fail("Te veel gijzelaars geraakt. Het Bureau wil je niet.");
            }
          } else {
            this.hits++;
            this.popup("RAAK", tg.x, l.y - 100 * l.s, "#6ee07a");
          }
          return;
        }
      }
    },
    onPointerMove(x, y) {
      this.aim = { x, y };
    },
    onAction() {
      if (this.phase === "range") this.onPointer(this.aim.x, this.aim.y);
    },

    blocked(x, y) {
      return WALLS.some((w) => x > w.x - R && x < w.x + w.w + R && y > w.y - R && y < w.y + w.h + R);
    },
    sight(a, b) {
      const n = Math.ceil(dist(a, b) / 6);
      for (let i = 1; i < n; i++) {
        const x = a.x + ((b.x - a.x) * i) / n, y = a.y + ((b.y - a.y) * i) / n;
        if (WALLS.some((w) => x > w.x && x < w.x + w.w && y > w.y && y < w.y + w.h)) return false;
      }
      return true;
    },

    update(dt) {
      if (this.over) return;
      const s = dt / 1000;
      this.popups = G.updatePopups(this.popups, dt);
      for (const sh of this.shots) sh.life -= dt;
      this.shots = this.shots.filter((sh) => sh.life > 0);

      if (this.phase === "range") {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0 && this.spawned < TARGETS) {
          this.spawned++;
          this.spawnTimer = 700 + Math.random() * 500;
          const lane = G.randInt(LANES.length);
          const dir = Math.random() < 0.5 ? 1 : -1;
          this.targets.push({ lane, x: 60 + Math.random() * (W - 120), vx: dir * (30 + Math.random() * 50), up: 0, timer: UP_MS, hostage: this.plan[this.spawned - 1], done: false, hit: 0 });
        }
        for (const tg of this.targets) {
          if (tg.done) {
            tg.hit -= dt;
            continue;
          }
          tg.up = Math.min(1, tg.up + dt / 180);
          tg.x = G.clamp(tg.x + tg.vx * s, 30, W - 30);
          tg.timer -= dt;
          if (tg.timer <= 0) tg.done = true;
        }
        this.targets = this.targets.filter((tg) => !tg.done || tg.hit > 0);
        if (this.spawned >= TARGETS && !this.targets.length) {
          if (this.hits >= NEED) {
            this.phase = "between";
            this.transition = 1800;
          } else {
            this.over = true;
            this.api.fail(`Maar ${this.hits} raak. Het Bureau wilde er minstens ${NEED}.`);
          }
        }
        return;
      }
      if (this.phase === "between") {
        this.transition -= dt;
        if (this.transition <= 0) this.phase = "room";
        return;
      }
      if (this.won) {
        this.won -= dt;
        if (this.won <= 0) {
          this.over = true;
          this.api.complete();
        }
        return;
      }

      // stealth room
      this.time -= dt;
      if (this.time <= 0) {
        this.over = true;
        this.api.fail("Te langzaam. De tijd voor de sluiptest is op.");
        return;
      }
      const p = this.p;
      const sneak = !!G.held.action;
      const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
      const my = (G.held.down ? 1 : 0) - (G.held.up ? 1 : 0);
      p.moving = !!(mx || my);
      if (p.moving) {
        const len = Math.hypot(mx, my);
        const sp = sneak ? SPEED * 0.5 : SPEED;
        const nx = G.clamp(p.x + (mx / len) * sp * s, 14, W - 14);
        const ny = G.clamp(p.y + (my / len) * sp * s, 40, H - 14);
        if (!this.blocked(nx, p.y)) p.x = nx;
        if (!this.blocked(p.x, ny)) p.y = ny;
        if (mx) p.facing = mx;
      }
      for (const g of this.guards) {
        if (g.wait > 0) {
          g.wait -= dt;
          continue;
        }
        const wp = g.route[g.wp];
        const d = dist(g, wp);
        if (d < 3) {
          g.wp = (g.wp + 1) % g.route.length;
          g.wait = 800;
        } else {
          g.angle = Math.atan2(wp.y - g.y, wp.x - g.x);
          g.x += ((wp.x - g.x) / d) * 45 * s;
          g.y += ((wp.y - g.y) / d) * 45 * s;
        }
      }
      let seen = false;
      for (const g of this.guards) {
        if (dist(g, p) < VIEW_LEN && Math.abs(angDiff(Math.atan2(p.y - g.y, p.x - g.x), g.angle)) < VIEW_ARC && this.sight(g, p)) seen = true;
        if (!sneak && p.moving && dist(g, p) < 40) seen = true;
      }
      this.seen = seen;
      this.alert = G.clamp(this.alert + (seen ? ALERT_UP : -ALERT_DOWN) * s, 0, 100);
      if (this.alert >= 100) {
        this.over = true;
        this.api.fail("Gezien! Een huurmoordenaar moet onzichtbaar zijn.");
        return;
      }
      if (p.x > EXIT.x - 6 && p.y > EXIT.y && p.y < EXIT.y + EXIT.h) this.won = 1600;
    },

    render(ctx, t) {
      if (this.phase === "range" || this.phase === "between") {
        this.drawRange(ctx);
        for (const tg of this.targets) {
          const l = LANES[tg.lane];
          const fold = tg.done ? Math.max(0, tg.hit / 400) : tg.up;
          ctx.save();
          ctx.translate(tg.x, l.y);
          ctx.scale(1, fold);
          ctx.fillStyle = tg.hostage ? "#4a7ad0" : "#d04a4a";
          ctx.beginPath();
          ctx.arc(0, -78 * l.s, 14 * l.s, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(-18 * l.s, -64 * l.s, 36 * l.s, 64 * l.s);
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(0, -40 * l.s, 9 * l.s, 0, Math.PI * 2);
          ctx.fill();
          if (tg.hostage) {
            ctx.font = `bold ${Math.round(16 * l.s)}px Segoe UI, Roboto, sans-serif`;
            ctx.textAlign = "center";
            ctx.fillText("🙋", 0, -96 * l.s);
          }
          ctx.restore();
        }
        for (const sh of this.shots) {
          ctx.fillStyle = `rgba(255,220,80,${sh.life / 150})`;
          ctx.beginPath();
          ctx.arc(sh.x, sh.y, 5, 0, Math.PI * 2);
          ctx.fill();
        }
        G.drawKid(ctx, W - 50, H - 10, 0.8, INSTRUCTOR, { adult: true, t, facing: -1 });
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.aim.x, this.aim.y, 9, 0, Math.PI * 2);
        ctx.moveTo(this.aim.x - 14, this.aim.y);
        ctx.lineTo(this.aim.x + 14, this.aim.y);
        ctx.moveTo(this.aim.x, this.aim.y - 14);
        ctx.lineTo(this.aim.x, this.aim.y + 14);
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 13px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`Raak ${this.hits}/${NEED} · gijzelaars ${this.hostage}/${MAX_HOSTAGE} · ronde ${this.spawned}/${TARGETS}`, 12, 24);
        if (this.phase === "between") G.drawBanner(ctx, "Geslaagd! Nu de sluiptest...", "#6ee07a", 200);
      } else {
        ctx.fillStyle = "#30343c";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#3a3e48";
        ctx.fillRect(10, 30, W - 20, H - 40);
        for (const w of WALLS) {
          ctx.fillStyle = "#1e2028";
          ctx.fillRect(w.x, w.y, w.w, w.h);
        }
        ctx.fillStyle = "#2a8a4a";
        ctx.fillRect(EXIT.x, EXIT.y, EXIT.w, EXIT.h);
        const p = this.p;
        for (const g of this.guards) {
          ctx.fillStyle = "rgba(255,200,80,0.14)";
          ctx.beginPath();
          ctx.moveTo(g.x, g.y);
          ctx.arc(g.x, g.y, VIEW_LEN, g.angle - VIEW_ARC, g.angle + VIEW_ARC);
          ctx.closePath();
          ctx.fill();
          G.drawKid(ctx, g.x, g.y + 12, 0.42, g.look, { adult: true, t, facing: Math.cos(g.angle) >= 0 ? 1 : -1, pose: g.wait > 0 ? "stand" : "walk" });
        }
        if (G.held.action) G.drawKid(ctx, p.x, p.y + 6, 0.42, G.hitLook(), { adult: true, t: p.moving ? t : 0, pose: "crawl" });
        else {
          G.drawKid(ctx, p.x, p.y + 12, 0.42, G.hitLook(), { adult: true, t, facing: p.facing, pose: p.moving ? "walk" : "stand" });
          G.drawTie(ctx, p.x, p.y + 12, 0.42);
        }
        if (this.seen) {
          ctx.fillStyle = "#ff4040";
          ctx.font = "bold 20px Segoe UI, Roboto, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("!", p.x, p.y - 30);
        }
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(W - 170, 8, 156, 10);
        ctx.fillStyle = this.alert > 60 ? "#ff4040" : "#ffd24a";
        ctx.fillRect(W - 170, 8, 156 * (this.alert / 100), 10);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`Sluiptest · nog ${Math.ceil(this.time / 1000)}s`, 12, 22);
        if (this.won) G.drawBanner(ctx, "Aangenomen! Welkom bij het Bureau.", "#6ee07a", H / 2);
      }
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return this.phase === "room" ? "Sluiptest" : "Schietbaan";
    },
  };
})();
