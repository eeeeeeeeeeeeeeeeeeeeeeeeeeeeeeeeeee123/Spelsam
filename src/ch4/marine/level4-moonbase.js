(() => {
  const { W, H } = G;
  const ROOM = { x: 20, y: 44, w: W - 40, h: H - 54 };
  const R = 11;
  const SPEED = 140;
  const HP = 5;
  const INVULN_MS = 900;
  const FIRE_MS = 180;
  const BOLT_SPEED = 600;
  const ALIEN_HP = 2;
  const ALIEN_SPEED = 85;
  const LIGHT_SLOW = 0.35;
  const CONE = 0.5;
  const CONE_LEN = 210;
  const FIX_MS = 2200;
  const FIX_R = 38;
  const MAX_ALIENS = 7;
  const WALLS = [
    { x: 180, y: 44, w: 16, h: 76 }, { x: 180, y: 180, w: 16, h: 140 }, { x: 180, y: 380, w: 16, h: 60 },
    { x: 344, y: 44, w: 16, h: 176 }, { x: 344, y: 280, w: 16, h: 100 },
    { x: 20, y: 240, w: 50, h: 16 }, { x: 130, y: 240, w: 50, h: 16 },
    { x: 360, y: 200, w: 50, h: 16 }, { x: 470, y: 200, w: 50, h: 16 },
  ];
  const FUSES = [{ x: 50, y: 74 }, { x: 50, y: 410 }, { x: 490, y: 80 }];
  const EXIT = { x: 470, y: 396, w: 46, h: 40 };
  const VENTS = [{ x: 270, y: 62 }, { x: 110, y: 320 }, { x: 440, y: 330 }, { x: 270, y: 422 }, { x: 110, y: 150 }];

  const inWall = (x, y, m = 0) => WALLS.some((w) => x > w.x - m && x < w.x + w.w + m && y > w.y - m && y < w.y + w.h + m);
  function collide(o, r = R) {
    for (const w of WALLS) {
      const cx = G.clamp(o.x, w.x, w.x + w.w), cy = G.clamp(o.y, w.y, w.y + w.h);
      const d = Math.hypot(o.x - cx, o.y - cy);
      if (d < r) {
        if (d > 0) {
          o.x = cx + ((o.x - cx) / d) * r;
          o.y = cy + ((o.y - cy) / d) * r;
        } else o.y = w.y - r;
      }
    }
    o.x = G.clamp(o.x, ROOM.x + r, ROOM.x + ROOM.w - r);
    o.y = G.clamp(o.y, ROOM.y + r, ROOM.y + ROOM.h - r);
  }
  // flow field: every cell knows its step-distance to the player, so aliens walk around walls
  const CELL = 15;
  const GW = Math.ceil(W / CELL), GH = Math.ceil(H / CELL);
  const OPEN = [];
  for (let gy = 0; gy < GH; gy++)
    for (let gx = 0; gx < GW; gx++) {
      const x = gx * CELL + CELL / 2, y = gy * CELL + CELL / 2;
      OPEN[gy * GW + gx] = x > ROOM.x + 8 && x < ROOM.x + ROOM.w - 8 && y > ROOM.y + 8 && y < ROOM.y + ROOM.h - 8 && !inWall(x, y, 9);
    }
  function flowField(px, py) {
    const dist = new Int16Array(GW * GH).fill(-1);
    const sx = G.clamp(Math.floor(px / CELL), 0, GW - 1), sy = G.clamp(Math.floor(py / CELL), 0, GH - 1);
    const q = [sy * GW + sx];
    dist[q[0]] = 0;
    for (let i = 0; i < q.length; i++) {
      const c = q[i], cx = c % GW, cy = (c - cx) / GW;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
        const n = ny * GW + nx;
        if (dist[n] >= 0 || !OPEN[n]) continue;
        dist[n] = dist[c] + 1;
        q.push(n);
      }
    }
    return dist;
  }
  const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

  let dark = null;
  function darkCanvas() {
    if (!dark) {
      dark = document.createElement("canvas");
      dark.width = W;
      dark.height = H;
    }
    return dark;
  }

  function drawBase(ctx, t, lightsOn, fuses) {
    ctx.fillStyle = "#101418";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#3a4048";
    ctx.fillRect(ROOM.x, ROOM.y, ROOM.w, ROOM.h);
    ctx.fillStyle = "#343a42";
    for (let x = ROOM.x; x < ROOM.x + ROOM.w; x += 30) for (let y = ROOM.y; y < ROOM.y + ROOM.h; y += 30) if (((x + y) / 30) % 2 === 0) ctx.fillRect(x, y, 30, 30);
    for (const v of VENTS) {
      ctx.fillStyle = "#1a1e22";
      ctx.fillRect(v.x - 14, v.y - 9, 28, 18);
      ctx.strokeStyle = "#5a6068";
      ctx.lineWidth = 2;
      for (let i = -8; i <= 8; i += 5) {
        ctx.beginPath();
        ctx.moveTo(v.x + i, v.y - 8);
        ctx.lineTo(v.x + i, v.y + 8);
        ctx.stroke();
      }
    }
    for (const w of WALLS) {
      ctx.fillStyle = "#8a929c";
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.fillStyle = "#6a727c";
      ctx.fillRect(w.x + 3, w.y + 3, w.w - 6, w.h - 6);
    }
    FUSES.forEach((f, i) => {
      const done = fuses && fuses[i].done;
      ctx.fillStyle = "#2a2e34";
      ctx.fillRect(f.x - 12, f.y - 16, 24, 32);
      ctx.fillStyle = done ? "#6ee07a" : Math.floor((t || 0) * 4) % 2 ? "#ff4040" : "#802020";
      ctx.beginPath();
      ctx.arc(f.x, f.y - 6, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e0c040";
      ctx.font = "bold 12px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("⚡", f.x, f.y + 10);
    });
    ctx.fillStyle = lightsOn ? "#2a6a3a" : "#4a2a2a";
    ctx.fillRect(EXIT.x, EXIT.y, EXIT.w, EXIT.h);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 10px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(lightsOn ? "UITGANG" : "DICHT", EXIT.x + EXIT.w / 2, EXIT.y + 24);
  }

  G.CAREER_LEVELS.marine[4] = {
    title: "Level 4 — Maanbasis in de storing (24 jaar)",
    intro:
      "Je bent 24. Op de <strong>maanbasis</strong> is de stroom uitgevallen en het is aardedonker. En er kruipt iets door de <strong>ventilatieschachten</strong>...<br>" +
      "Lopen met <strong>pijltjes / WASD</strong>. Je <strong>zaklamp</strong> schijnt naar de <strong>muis</strong>; in het licht zie je de aliens en worden ze traag. Schieten met <strong>klik</strong> / <strong>SPATIE</strong>.<br>" +
      "Blijf even bij de <strong>3 stroomkasten ⚡</strong> staan om ze te maken. Dan gaat het licht aan en opent de <strong>uitgang</strong>.",

    drawBackground(ctx, t) {
      drawBase(ctx, t, false, null);
    },

    start(api) {
      this.api = api;
      this.p = { x: 270, y: 250, hp: HP, invuln: 0, facing: 1, moving: false, dir: 0 };
      this.aim = { x: 330, y: 250 };
      this.mouse = false;
      this.fuses = FUSES.map(() => ({ done: false, prog: 0 }));
      this.lightsOn = false;
      this.aliens = [];
      this.spawnTimer = 2500;
      this.field = null;
      this.fieldT = 0;
      this.bolts = [];
      this.fire = 0;
      this.popups = [];
      this.flash = 0;
      this.over = false;
      this.won = 0;
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 1100 });
    },

    lightAngle() {
      const p = this.p;
      return this.mouse ? Math.atan2(this.aim.y - (p.y - 10), this.aim.x - p.x) : p.dir;
    },

    inLight(o) {
      if (this.lightsOn) return true;
      const p = this.p;
      const d = Math.hypot(o.x - p.x, o.y - p.y);
      if (d < 40) return true;
      return d < CONE_LEN && Math.abs(angDiff(Math.atan2(o.y - p.y, o.x - p.x), this.lightAngle())) < CONE;
    },

    doFire() {
      if (this.over || this.won || this.fire > 0) return;
      this.fire = FIRE_MS;
      const p = this.p;
      const a = this.lightAngle();
      this.bolts.push({ x: p.x + Math.cos(a) * 14, y: p.y - 8 + Math.sin(a) * 14, vx: Math.cos(a) * BOLT_SPEED, vy: Math.sin(a) * BOLT_SPEED });
    },
    onAction() { this.doFire(); },
    onPointer(x, y) { this.aim = { x, y }; this.mouse = true; this.doFire(); },
    onPointerMove(x, y) { this.aim = { x, y }; this.mouse = true; },

    hurt() {
      const p = this.p;
      if (p.invuln > 0 || this.over || this.won) return;
      p.hp--;
      p.invuln = INVULN_MS;
      this.flash = 300;
      this.popup("-1 ❤", p.x, p.y - 40, "#ff6b6b");
      if (p.hp <= 0) {
        this.over = true;
        this.api.fail("De aliens uit de ventilatie hebben je te pakken gekregen.");
      }
    },

    update(dt) {
      if (this.over) return;
      const s = dt / 1000;
      const p = this.p;
      this.popups = G.updatePopups(this.popups, dt);
      this.flash = Math.max(0, this.flash - dt);
      this.fire = Math.max(0, this.fire - dt);
      p.invuln = Math.max(0, p.invuln - dt);
      if (this.won) {
        this.won -= dt;
        if (this.won <= 0) {
          this.over = true;
          this.api.complete();
        }
        return;
      }
      if (G.held.action || G.mouseDown) this.doFire();

      const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
      const my = (G.held.down ? 1 : 0) - (G.held.up ? 1 : 0);
      p.moving = !!(mx || my);
      if (p.moving) {
        const len = Math.hypot(mx, my);
        p.x += (mx / len) * SPEED * s;
        p.y += (my / len) * SPEED * s;
        collide(p);
        p.dir = Math.atan2(my, mx);
      }
      p.facing = Math.cos(this.lightAngle()) >= 0 ? 1 : -1;

      // repair the fuse boxes by standing next to them
      this.fuses.forEach((fs, i) => {
        if (fs.done) return;
        const f = FUSES[i];
        if (Math.hypot(f.x - p.x, f.y - p.y) < FIX_R) {
          fs.prog += dt;
          if (fs.prog >= FIX_MS) {
            fs.done = true;
            const left = this.fuses.filter((q) => !q.done).length;
            this.popup(left ? `Stroomkast gemaakt! Nog ${left}` : "STROOM HERSTELD!", f.x + 60, f.y, "#6ee07a");
            if (!left) {
              this.lightsOn = true;
              for (const a of this.aliens) a.flee = true;
            }
          }
        } else fs.prog = Math.max(0, fs.prog - dt * 0.5);
      });
      if (this.lightsOn && p.x > EXIT.x - 4 && p.y > EXIT.y - 4) {
        this.won = 2200;
        this.popup("Ontsnapt uit de maanbasis!", W / 2, 120, "#6ee07a");
      }

      // aliens crawl out of the vents (until the lights come back)
      const fixed = this.fuses.filter((q) => q.done).length;
      this.spawnTimer -= dt;
      if (!this.lightsOn && this.spawnTimer <= 0 && this.aliens.length < MAX_ALIENS) {
        this.spawnTimer = 3000 - fixed * 600 + Math.random() * 1000;
        const far = VENTS.filter((v) => Math.hypot(v.x - p.x, v.y - p.y) > 120);
        const v = G.pick(far.length ? far : VENTS);
        this.aliens.push({ x: v.x, y: v.y, hp: ALIEN_HP, flash: 0, seed: Math.random() * 9, lit: false, flee: false, wob: Math.random() * 6 });
      }
      this.fieldT -= dt;
      if (this.fieldT <= 0 || !this.field) {
        this.fieldT = 250;
        this.field = flowField(p.x, p.y);
      }
      for (const a of this.aliens) {
        a.flash = Math.max(0, a.flash - dt);
        a.lit = this.inLight(a);
        if (a.flee) {
          const v = VENTS.reduce((b, q) => (Math.hypot(q.x - a.x, q.y - a.y) < Math.hypot(b.x - a.x, b.y - a.y) ? q : b));
          const d = Math.hypot(v.x - a.x, v.y - a.y) || 1;
          a.x += ((v.x - a.x) / d) * 120 * s;
          a.y += ((v.y - a.y) / d) * 120 * s;
          if (d < 6) a.dead = true;
          continue;
        }
        a.wob += s * 3;
        const d = Math.hypot(p.x - a.x, p.y - a.y) || 1;
        const sp = ALIEN_SPEED * (a.lit ? LIGHT_SLOW : 1);
        // head for the neighbouring cell that is closest to you
        let tx = p.x, ty = p.y;
        const gx = Math.floor(a.x / CELL), gy = Math.floor(a.y / CELL);
        const here = this.field[gy * GW + gx];
        if (d > 40 && here > 0) {
          let best = here;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
            const nx = gx + dx, ny = gy + dy;
            if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
            const v = this.field[ny * GW + nx];
            // diagonal only when both side cells are open
            if (dx && dy && (!OPEN[gy * GW + nx] || !OPEN[ny * GW + gx])) continue;
            if (v >= 0 && v < best) {
              best = v;
              tx = nx * CELL + CELL / 2;
              ty = ny * CELL + CELL / 2;
            }
          }
        }
        const td = Math.hypot(tx - a.x, ty - a.y) || 1;
        a.x += ((tx - a.x) / td) * sp * s + Math.cos(a.wob) * 12 * s;
        a.y += ((ty - a.y) / td) * sp * s + Math.sin(a.wob) * 12 * s;
        collide(a, 7);
        if (d < R + 10) this.hurt();
      }
      this.aliens = this.aliens.filter((a) => !a.dead);
      if (this.over) return;

      for (const b of this.bolts) {
        b.x += b.vx * s;
        b.y += b.vy * s;
        if (b.x < ROOM.x || b.x > ROOM.x + ROOM.w || b.y < ROOM.y || b.y > ROOM.y + ROOM.h || inWall(b.x, b.y)) {
          b.done = true;
          continue;
        }
        for (const a of this.aliens) {
          if (a.dead || a.flee || Math.hypot(a.x - b.x, a.y - 8 - b.y) > 14) continue;
          b.done = true;
          a.hp--;
          a.flash = 90;
          if (a.hp <= 0) {
            a.dead = true;
            this.popup("Splat!", a.x, a.y - 30, "#6ae07a");
          }
          break;
        }
      }
      this.bolts = this.bolts.filter((b) => !b.done);
      this.aliens = this.aliens.filter((a) => !a.dead);
    },

    render(ctx, t) {
      drawBase(ctx, t, this.lightsOn, this.fuses);
      const p = this.p;
      for (const a of this.aliens) G.drawAlien(ctx, a.x, a.y + 6, 0.5, t, { flash: a.flash > 0, seed: a.seed });
      ctx.fillStyle = "#b0ffd8";
      for (const b of this.bolts) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      const la = this.lightAngle();
      ctx.globalAlpha = p.invuln > 0 && Math.floor(t * 12) % 2 ? 0.5 : 1;
      const hand = G.drawKid(ctx, p.x, p.y + 12, 0.42, G.marineLook(), { adult: true, t, facing: p.facing, pose: p.moving ? "walk" : "stand", armAngle: G.clamp(p.facing === 1 ? la : Math.PI - la, -1.4, 1) });
      G.drawSpaceHelmet(ctx, p.x, p.y + 12, 0.42, p.facing);
      G.drawLaserGun(ctx, hand, la, p.facing, 0.5, this.fire > FIRE_MS - 60);
      ctx.globalAlpha = 1;

      // the darkness with your flashlight cut out of it
      if (!this.lightsOn) {
        const dc = darkCanvas();
        const d = dc.getContext("2d");
        d.globalCompositeOperation = "source-over";
        d.clearRect(0, 0, W, H);
        d.fillStyle = "rgba(0,0,6,0.94)";
        d.fillRect(0, 0, W, H);
        d.globalCompositeOperation = "destination-out";
        const g = d.createRadialGradient(p.x, p.y, 10, p.x, p.y, CONE_LEN);
        g.addColorStop(0, "rgba(0,0,0,1)");
        g.addColorStop(0.7, "rgba(0,0,0,0.85)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        d.fillStyle = g;
        d.beginPath();
        d.moveTo(p.x, p.y - 8);
        d.arc(p.x, p.y - 8, CONE_LEN, la - CONE, la + CONE);
        d.closePath();
        d.fill();
        const g2 = d.createRadialGradient(p.x, p.y, 5, p.x, p.y, 44);
        g2.addColorStop(0, "rgba(0,0,0,0.9)");
        g2.addColorStop(1, "rgba(0,0,0,0)");
        d.fillStyle = g2;
        d.beginPath();
        d.arc(p.x, p.y, 44, 0, Math.PI * 2);
        d.fill();
        // the fuse box lamps stay faintly visible
        for (const f of FUSES) {
          d.fillStyle = "rgba(0,0,0,0.5)";
          d.beginPath();
          d.arc(f.x, f.y, 16, 0, Math.PI * 2);
          d.fill();
        }
        ctx.drawImage(dc, 0, 0);
        // glowing eyes in the dark
        for (const a of this.aliens) {
          if (a.lit) continue;
          ctx.fillStyle = `rgba(255,230,80,${0.55 + 0.25 * Math.sin(t * 5 + a.seed)})`;
          ctx.beginPath();
          ctx.arc(a.x - 3, a.y - 10, 1.8, 0, Math.PI * 2);
          ctx.arc(a.x + 3, a.y - 10, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // repair progress rings
      this.fuses.forEach((fs, i) => {
        if (fs.done || fs.prog <= 0) return;
        const f = FUSES[i];
        ctx.strokeStyle = "#e0c040";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 22, -Math.PI / 2, -Math.PI / 2 + (fs.prog / FIX_MS) * Math.PI * 2);
        ctx.stroke();
      });

      if (this.flash > 0) {
        ctx.fillStyle = `rgba(200,40,40,${0.3 * (this.flash / 300)})`;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.fillStyle = "#ff6b6b";
      ctx.font = "16px Segoe UI, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("❤".repeat(Math.max(0, p.hp)), 14, 30);
      ctx.fillStyle = "#e0c040";
      ctx.font = "bold 13px Segoe UI, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(this.lightsOn ? "Stroom hersteld → uitgang!" : `Stroomkasten ${this.fuses.filter((q) => q.done).length}/3`, W - 14, 30);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return this.lightsOn ? "Naar de uitgang!" : `Stroomkasten ${this.fuses.filter((q) => q.done).length}/3`;
    },
  };
})();
