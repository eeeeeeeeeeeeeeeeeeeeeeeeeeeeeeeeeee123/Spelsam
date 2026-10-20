(() => {
  const { W, H } = G;
  const PLAYER_SPEED = 135;
  const CONE_RANGE = 140;
  const CONE_HALF = 0.55;
  const MAX_HITS = 3;
  const HIT_RANGE = 22;
  const INVULN_MS = 1400;
  const JASON_SPEED = 72;
  const JASON_TELEPORT_DIST = 230;
  const JASON_TELEPORT_MS = 5500;
  const FREDDY_SPEED = 92;
  const FREDDY_VANISH_MS = 6500;
  const FREDDY_WARN_MS = 900;
  const START = { x: 50, y: H - 50 };
  const GOAL = { x: W - 55, y: 55, r: 26 };

  const TREES = [];
  function buildTrees() {
    TREES.length = 0;
    for (let i = 0; i < 26; i++) {
      const x = 40 + Math.random() * (W - 80);
      const y = 40 + Math.random() * (H - 80);
      if (Math.hypot(x - START.x, y - START.y) < 80) continue;
      if (Math.hypot(x - GOAL.x, y - GOAL.y) < 70) continue;
      TREES.push({ x, y, r: 12 + Math.random() * 6 });
    }
  }

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function collide(p, r = 11) {
    for (const tr of TREES) {
      const d = dist(p, tr);
      const rr = tr.r + r;
      if (d < rr && d > 0) {
        p.x = tr.x + ((p.x - tr.x) / d) * rr;
        p.y = tr.y + ((p.y - tr.y) / d) * rr;
      }
    }
    p.x = G.clamp(p.x, 14, W - 14);
    p.y = G.clamp(p.y, 14, H - 14);
  }

  function litBy(cone, p) {
    if (dist(cone, p) > CONE_RANGE) return 0;
    let diff = Math.atan2(p.y - cone.y, p.x - cone.x) - cone.angle;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    if (Math.abs(diff) > CONE_HALF) return 0;
    return 1 - dist(cone, p) / CONE_RANGE;
  }

  // Hockey-mask slasher: slow, relentless, machete.
  function drawJason(ctx, m, t, alpha) {
    const bob = Math.sin(t * 5) * 1.5;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(m.x, m.y + bob);
    // legs
    ctx.strokeStyle = "#2a2a22";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-4, 4);
    ctx.lineTo(-5 + Math.sin(t * 6) * 3, 18);
    ctx.moveTo(4, 4);
    ctx.lineTo(5 - Math.sin(t * 6) * 3, 18);
    ctx.stroke();
    // jacket
    ctx.fillStyle = "#4a4a38";
    ctx.beginPath();
    ctx.roundRect(-11, -22, 22, 28, 5);
    ctx.fill();
    // machete arm
    ctx.strokeStyle = "#4a4a38";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(m.facing * 9, -16);
    ctx.lineTo(m.facing * 18, -6);
    ctx.stroke();
    ctx.strokeStyle = "#c8ccd0";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(m.facing * 18, -6);
    ctx.lineTo(m.facing * 30, -24);
    ctx.stroke();
    // mask
    ctx.fillStyle = "#efeadc";
    ctx.beginPath();
    ctx.ellipse(0, -32, 10, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.ellipse(-4, -34, 2.6, 2, 0, 0, Math.PI * 2);
    ctx.ellipse(4, -34, 2.6, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    for (const [hx, hy] of [[-2, -27], [2, -27], [0, -24], [-5, -29], [5, -29]]) ctx.fillRect(hx - 0.7, hy - 0.7, 1.4, 1.4);
    ctx.fillStyle = "#c02020";
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * 7, -40);
      ctx.lineTo(sx * 4, -37);
      ctx.lineTo(sx * 8, -37);
      ctx.fill();
    }
    ctx.restore();
  }

  // Dream slasher: striped sweater, hat, claw glove.
  function drawFreddy(ctx, m, t, alpha) {
    const sway = Math.sin(t * 7) * 2;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(m.x, m.y);
    ctx.strokeStyle = "#3a2a1a";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-4, 4);
    ctx.lineTo(-5 + Math.sin(t * 8) * 3, 18);
    ctx.moveTo(4, 4);
    ctx.lineTo(5 - Math.sin(t * 8) * 3, 18);
    ctx.stroke();
    // striped sweater
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? "#2a6a2a" : "#b02020";
      ctx.fillRect(-10, -22 + i * 4.5, 20, 4.5);
    }
    // claw arm raised
    ctx.strokeStyle = "#b02020";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(m.facing * 8, -18);
    ctx.lineTo(m.facing * 18, -26 + sway);
    ctx.stroke();
    ctx.strokeStyle = "#d8dce0";
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(m.facing * 18, -26 + sway);
      ctx.lineTo(m.facing * (24 + i * 2), -40 + i * 3 + sway);
      ctx.stroke();
    }
    // burnt face
    ctx.fillStyle = "#b86a50";
    ctx.beginPath();
    ctx.arc(0, -30, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7a3a2a";
    ctx.beginPath();
    ctx.arc(-3, -27, 3, 0, Math.PI * 2);
    ctx.arc(4, -32, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffe066";
    ctx.fillRect(-5, -33, 3, 2);
    ctx.fillRect(2, -33, 3, 2);
    // hat
    ctx.fillStyle = "#5a3a1a";
    ctx.fillRect(-14, -38, 28, 3);
    ctx.beginPath();
    ctx.roundRect(-8, -48, 16, 11, 3);
    ctx.fill();
    ctx.restore();
  }

  G.c3level2 = {
    title: "Level 2 — Kampdropping (12 jaar)",
    intro:
      "Op schoolkamp word je 's nachts in het bos gedropt. Vind de weg terug naar het <strong>kampvuur</strong>.<br>" +
      "Loop met de <strong>pijltjes / WASD</strong>; je zaklamp schijnt vooruit.<br>" +
      "Maar je bent niet alleen: <strong>Jason</strong> met zijn hockeymasker sjokt achter je aan en duikt soms ineens achter je op. " +
      "<strong>Freddy</strong> met zijn klauwhandschoen verdwijnt en verschijnt weer (let op het rode <strong>!</strong>). Ontwijk ze! 3 keer geraakt en het is mis.",

    drawBackground(ctx, t) {
      ctx.fillStyle = "#0a0f08";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ff8a3c";
      ctx.beginPath();
      ctx.arc(GOAL.x, GOAL.y, GOAL.r, 0, Math.PI * 2);
      ctx.fill();
      drawJason(ctx, { x: W / 2 - 60, y: H / 2, facing: 1 }, t, 0.5);
      drawFreddy(ctx, { x: W / 2 + 60, y: H / 2, facing: -1 }, t, 0.5);
    },

    start(api) {
      this.api = api;
      buildTrees();
      this.player = { x: START.x, y: START.y };
      this.angle = -Math.PI / 4;
      this.hits = 0;
      this.invuln = 0;
      this.flash = 0;
      this.popups = [];
      this.jason = { x: W / 2, y: H - 30, facing: -1, pause: 1500, teleport: JASON_TELEPORT_MS };
      this.freddy = { x: W - 40, y: H / 2, facing: -1, pause: 2500, vanish: FREDDY_VANISH_MS, state: "walk", warn: 0, wx: 0, wy: 0, seed: Math.random() * 10 };
      this.time = 0;
      this.over = false;
    },

    // a spot about `r` px from the player, outside the trees and on screen
    spotNear(r, prefer) {
      const p = this.player;
      for (let i = 0; i < 20; i++) {
        const a = prefer !== undefined && i < 10 ? prefer + (Math.random() - 0.5) * 1.2 : Math.random() * Math.PI * 2;
        const s = { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r };
        if (s.x < 20 || s.x > W - 20 || s.y < 20 || s.y > H - 20) continue;
        if (TREES.some((tr) => dist(tr, s) < tr.r + 14)) continue;
        if (dist(s, GOAL) < 60) continue;
        return s;
      }
      return { x: G.clamp(p.x + r, 20, W - 20), y: G.clamp(p.y, 20, H - 20) };
    },

    chase(m, speed, s, wobble) {
      const p = this.player;
      const d = dist(m, p) || 1;
      let vx = (p.x - m.x) / d;
      let vy = (p.y - m.y) / d;
      if (wobble) {
        const w = Math.sin(this.time / 300 + m.seed) * 0.8;
        const nx = -vy, ny = vx;
        vx += nx * w;
        vy += ny * w;
        const l = Math.hypot(vx, vy) || 1;
        vx /= l;
        vy /= l;
      }
      m.x += vx * speed * s;
      m.y += vy * speed * s;
      if (vx) m.facing = vx > 0 ? 1 : -1;
      collide(m, 9);
    },

    hit(m, text) {
      if (this.invuln > 0) return;
      const p = this.player;
      this.hits++;
      this.invuln = INVULN_MS;
      this.flash = 500;
      this.popups.push({ text, x: p.x, y: p.y - 40, color: "#ff5a5a", life: 900 });
      const d = dist(p, m) || 1;
      p.x += ((p.x - m.x) / d) * 30;
      p.y += ((p.y - m.y) / d) * 30;
      collide(p);
      m.pause = 1200;
      if (this.hits >= MAX_HITS) {
        this.over = true;
        this.api.fail("Ze hebben je te pakken gekregen in het donkere bos!");
      }
    },

    update(dt, t) {
      if (this.over) return;
      const s = dt / 1000;
      this.time += dt;
      this.flash = Math.max(0, this.flash - dt);
      this.invuln = Math.max(0, this.invuln - dt);
      this.popups = G.updatePopups(this.popups, dt);
      const p = this.player;
      const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
      const my = (G.held.down ? 1 : 0) - (G.held.up ? 1 : 0);
      if (mx || my) {
        const len = Math.hypot(mx, my);
        p.x += (mx / len) * PLAYER_SPEED * s;
        p.y += (my / len) * PLAYER_SPEED * s;
        this.angle = Math.atan2(my, mx);
        collide(p);
      }

      // Jason: walks at you; when far behind he suddenly shows up behind you
      const j = this.jason;
      j.pause = Math.max(0, j.pause - dt);
      j.teleport -= dt;
      if (j.pause <= 0) this.chase(j, JASON_SPEED, s, false);
      if (j.teleport <= 0 && dist(j, p) > JASON_TELEPORT_DIST) {
        const spot = this.spotNear(150, this.angle + Math.PI);
        j.x = spot.x;
        j.y = spot.y;
        j.pause = 700;
        j.teleport = JASON_TELEPORT_MS;
        this.popups.push({ text: "ki ki ki... ma ma ma...", x: j.x, y: j.y - 50, color: "#cfcfcf", life: 1400 });
      } else if (j.teleport <= 0) j.teleport = 1500;

      // Freddy: weaves toward you, vanishes and reappears with a warning
      const f = this.freddy;
      f.pause = Math.max(0, f.pause - dt);
      if (f.state === "walk") {
        f.vanish -= dt;
        if (f.pause <= 0) this.chase(f, FREDDY_SPEED, s, true);
        if (f.vanish <= 0) {
          f.state = "warn";
          f.warn = FREDDY_WARN_MS;
          const spot = this.spotNear(130);
          f.wx = spot.x;
          f.wy = spot.y;
        }
      } else if (f.state === "warn") {
        f.warn -= dt;
        if (f.warn <= 0) {
          f.state = "walk";
          f.x = f.wx;
          f.y = f.wy;
          f.pause = 400;
          f.vanish = FREDDY_VANISH_MS;
          this.popups.push({ text: "Zoete dromen...", x: f.x, y: f.y - 50, color: "#ff8a8a", life: 1200 });
        }
      }

      if (dist(j, p) < HIT_RANGE) this.hit(j, "AU! Jason!");
      if (f.state === "walk" && dist(f, p) < HIT_RANGE) this.hit(f, "AU! Freddy!");
      if (this.over) return;

      if (dist(p, GOAL) < GOAL.r + 10) {
        this.over = true;
        this.api.complete();
      }
    },

    render(ctx, t) {
      ctx.fillStyle = "#0a0f08";
      ctx.fillRect(0, 0, W, H);
      const p = this.player;
      const cone = { x: p.x, y: p.y, angle: this.angle };

      const grad = ctx.createRadialGradient(p.x, p.y, 8, p.x, p.y, CONE_RANGE);
      grad.addColorStop(0, "rgba(255, 245, 200, 0.5)");
      grad.addColorStop(1, "rgba(255, 245, 200, 0)");
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.arc(p.x, p.y, CONE_RANGE, this.angle - CONE_HALF, this.angle + CONE_HALF);
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();

      const fg = ctx.createRadialGradient(GOAL.x, GOAL.y, 4, GOAL.x, GOAL.y, 60);
      fg.addColorStop(0, "rgba(255, 150, 60, 0.8)");
      fg.addColorStop(1, "rgba(255, 150, 60, 0)");
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(GOAL.x, GOAL.y, 60, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = "26px serif";
      ctx.textAlign = "center";
      ctx.fillText("🔥", GOAL.x, GOAL.y + 9);

      for (const tr of TREES) {
        const lit = Math.max(litBy(cone, tr), dist(tr, p) < 45 ? 0.35 : 0);
        if (lit <= 0.02) continue;
        ctx.globalAlpha = Math.min(1, lit + 0.15);
        ctx.fillStyle = "#1a3a1a";
        ctx.beginPath();
        ctx.arc(tr.x, tr.y - tr.r, tr.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#3a2a1a";
        ctx.fillRect(tr.x - 3, tr.y, 6, tr.r);
        ctx.globalAlpha = 1;
      }

      // slashers: faint in the dark, clear in the light
      const vis = (m) => Math.min(1, 0.35 + litBy(cone, m) * 1.5 + (dist(m, p) < 70 ? 0.4 : 0));
      const j = this.jason, f = this.freddy;
      drawJason(ctx, j, t, vis(j));
      if (f.state === "walk") drawFreddy(ctx, f, t, vis(f));
      else {
        // warning where Freddy will appear
        const k = 1 - f.warn / FREDDY_WARN_MS;
        ctx.strokeStyle = `rgba(255,60,60,${0.4 + 0.4 * Math.sin(t * 20)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(f.wx, f.wy - 15, 22 - k * 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#ff4040";
        ctx.font = "bold 18px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("!", f.wx, f.wy - 40);
      }

      if (this.flash > 0) {
        ctx.fillStyle = `rgba(120, 20, 20, ${0.3 * (this.flash / 500)})`;
        ctx.fillRect(0, 0, W, H);
      }

      G.drawKid(ctx, p.x, p.y + 14, 0.5, G.playerKidLook(), { t, facing: Math.cos(this.angle) >= 0 ? 1 : -1, crying: this.flash > 0, flash: this.invuln > 0 });

      ctx.fillStyle = "#fff";
      ctx.font = "bold 13px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`Geraakt: ${"🩸".repeat(this.hits)}${"·".repeat(MAX_HITS - this.hits)}`, 12, 22);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return `Naar het kampvuur · geraakt ${this.hits}/${MAX_HITS}`;
    },
  };
})();
