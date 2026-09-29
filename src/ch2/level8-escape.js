(() => {
  const { W, H } = G;
  const PLAYER_SPEED = 115;
  const R = 10;
  const DETECT_MS = 450;
  const HIDE_RANGE = 24;
  const PICK_RANGE = 18;
  const GUARD_SPEED = 55;
  const GUARD_RANGE = 125;
  const GUARD_HALF = 0.5;
  const CAM_RANGE = 150;
  const CAM_HALF = 0.32;
  const START = { x: 40, y: 405 };
  const EXIT = { x: 505, y: 32, w: 26, h: 34 };

  // Walls as rectangles; gaps in them are the doorways.
  const WALLS = [
    { x: 0, y: 0, w: W, h: 8 },
    { x: 0, y: H - 8, w: W, h: 8 },
    { x: 0, y: 0, w: 8, h: H },
    { x: W - 8, y: 0, w: 8, h: H },
    { x: 0, y: 150, w: 190, h: 12 },
    { x: 270, y: 150, w: W - 270, h: 12 },
    { x: 0, y: 300, w: 330, h: 12 },
    { x: 410, y: 300, w: W - 410, h: 12 },
    { x: 330, y: 162, w: 12, h: 48 },
    { x: 150, y: 312, w: 12, h: 60 },
  ];
  const KEYS = [
    { x: 40, y: 45 },
    { x: 500, y: 250 },
    { x: 480, y: 400 },
  ];
  const LOCKERS = [
    { x: 215, y: 45 },
    { x: 40, y: 200 },
    { x: 400, y: 270 },
    { x: 300, y: 420 },
    { x: 110, y: 340 },
  ];
  const GUARD_ROUTES = [
    [{ x: 90, y: 90 }, { x: 440, y: 90 }],
    [{ x: 60, y: 230 }, { x: 480, y: 230 }],
    [{ x: 200, y: 360 }, { x: 480, y: 360 }, { x: 480, y: 420 }, { x: 200, y: 420 }],
  ];
  const CAMERAS = [
    { x: 230, y: 170, base: Math.PI / 2, sweep: 1.0, speed: 0.9 },
    { x: 522, y: 322, base: Math.PI * 0.85, sweep: 0.55, speed: 1.2 },
  ];

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function segHitsRect(a, b, r) {
    // Liang–Barsky clip of segment a→b against rect r.
    let t0 = 0;
    let t1 = 1;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const checks = [
      [-dx, a.x - r.x],
      [dx, r.x + r.w - a.x],
      [-dy, a.y - r.y],
      [dy, r.y + r.h - a.y],
    ];
    for (const [p, q] of checks) {
      if (p === 0) {
        if (q < 0) return false;
      } else {
        const t = q / p;
        if (p < 0) t0 = Math.max(t0, t);
        else t1 = Math.min(t1, t);
        if (t0 > t1) return false;
      }
    }
    return true;
  }

  const clearLine = (a, b) => !WALLS.some((w) => segHitsRect(a, b, w));

  function collide(p) {
    for (const w of WALLS) {
      const cx = G.clamp(p.x, w.x, w.x + w.w);
      const cy = G.clamp(p.y, w.y, w.y + w.h);
      const d = Math.hypot(p.x - cx, p.y - cy);
      if (d < R) {
        if (d === 0) continue;
        p.x = cx + ((p.x - cx) / d) * R;
        p.y = cy + ((p.y - cy) / d) * R;
      }
    }
  }

  function inCone(src, angle, range, half, p) {
    if (dist(src, p) > range) return false;
    let diff = Math.atan2(p.y - src.y, p.x - src.x) - angle;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    return Math.abs(diff) < half && clearLine(src, p);
  }

  function drawCone(ctx, src, angle, range, half, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(src.x, src.y);
    const steps = 18;
    for (let i = 0; i <= steps; i++) {
      const a = angle - half + (i / steps) * half * 2;
      let len = range;
      for (let d = 6; d <= range; d += 6) {
        if (!clearLine(src, { x: src.x + Math.cos(a) * d, y: src.y + Math.sin(a) * d })) {
          len = d - 6;
          break;
        }
      }
      ctx.lineTo(src.x + Math.cos(a) * len, src.y + Math.sin(a) * len);
    }
    ctx.closePath();
    ctx.fill();
  }

  function drawMap(ctx) {
    ctx.fillStyle = "#6f7680";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    for (let x = 0; x < W; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.fillStyle = "#2f343b";
    for (const w of WALLS) ctx.fillRect(w.x, w.y, w.w, w.h);
  }

  function drawLocker(ctx, l, occupied) {
    ctx.fillStyle = occupied ? "#4a6a9a" : "#5a7fb0";
    ctx.fillRect(l.x - 12, l.y - 16, 24, 32);
    ctx.strokeStyle = "#2c3e5a";
    ctx.lineWidth = 2;
    ctx.strokeRect(l.x - 12, l.y - 16, 24, 32);
    ctx.fillStyle = "#2c3e5a";
    for (let i = 0; i < 3; i++) ctx.fillRect(l.x - 7, l.y - 11 + i * 4, 14, 2);
  }

  function drawKey(ctx, k, t) {
    const y = k.y + Math.sin(t * 4 + k.x) * 2;
    ctx.fillStyle = `rgba(255, 224, 102, ${0.3 + Math.sin(t * 5) * 0.15})`;
    ctx.beginPath();
    ctx.arc(k.x, y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f0c030";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(k.x - 4, y, 4, 0, Math.PI * 2);
    ctx.moveTo(k.x, y);
    ctx.lineTo(k.x + 9, y);
    ctx.moveTo(k.x + 6, y);
    ctx.lineTo(k.x + 6, y + 4);
    ctx.stroke();
  }

  function drawCamera(ctx, c, angle) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(angle);
    ctx.fillStyle = "#222";
    ctx.fillRect(-4, -5, 14, 10);
    ctx.fillStyle = "#e04545";
    ctx.beginPath();
    ctx.arc(10, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const GUARD_LOOK = { ...G.SKINS.wit, hair: "kort", hairColor: "#2a1a12", eyes: G.EYES.bruin, gender: "jongen", shirt: "#2f3f5f", pants: "#1f2638" };

  G.c2level8 = {
    title: "Level 8 — Ontsnappen (8 jaar)",
    intro:
      "Je zit op een streng internaat. Tijd om te ontsnappen!<br>" +
      "Loop met de <strong>pijltjes / WASD</strong>. Pak <strong>3 sleutels</strong> en ren naar de <strong>uitgang</strong> rechtsboven.<br>" +
      "Blijf uit de lichtkegels van <strong>bewakers</strong> en <strong>camera's</strong>. Sta je bij een <strong>kast</strong>? Druk op <strong>SPATIE</strong> om je te verstoppen (en nog eens om eruit te komen).",

    drawBackground(ctx, t) {
      drawMap(ctx);
      for (const l of LOCKERS) drawLocker(ctx, l, false);
      for (const k of KEYS) drawKey(ctx, k, t);
    },

    start(api) {
      this.api = api;
      this.player = { ...START, facing: 1, moving: false };
      this.hidden = null;
      this.keys = KEYS.map((k) => ({ ...k, taken: false }));
      this.guards = GUARD_ROUTES.map((route) => ({ ...route[0], route, wp: 1, angle: 0, look: { ...GUARD_LOOK, skin: G.pick([G.SKINS.wit.skin, G.SKINS.zwart.skin]) } }));
      this.time = 0;
      this.detect = 0;
      this.over = false;
      this.popups = [];
    },

    keyCount() {
      return this.keys.filter((k) => k.taken).length;
    },

    camAngle(c) {
      return c.base + Math.sin(this.time * c.speed) * c.sweep;
    },

    onAction() {
      if (this.over) return;
      if (this.hidden) {
        this.hidden = null;
        return;
      }
      const l = LOCKERS.find((lk) => dist(lk, this.player) < HIDE_RANGE);
      if (l) {
        this.hidden = l;
        this.player.x = l.x;
        this.player.y = l.y + 18;
      }
    },

    seenBy() {
      if (this.hidden) return null;
      const p = this.player;
      for (const g of this.guards) if (inCone(g, g.angle, GUARD_RANGE, GUARD_HALF, p)) return "Een bewaker zag je!";
      for (const c of CAMERAS) if (inCone(c, this.camAngle(c), CAM_RANGE, CAM_HALF, p)) return "Een camera zag je!";
      return null;
    },

    update(dt) {
      if (this.over) return;
      const s = dt / 1000;
      this.time += s;
      this.popups = G.updatePopups(this.popups, dt);
      const p = this.player;

      if (!this.hidden) {
        const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
        const my = (G.held.down ? 1 : 0) - (G.held.up ? 1 : 0);
        p.moving = !!(mx || my);
        if (p.moving) {
          const len = Math.hypot(mx, my);
          p.x += (mx / len) * PLAYER_SPEED * s;
          p.y += (my / len) * PLAYER_SPEED * s;
          if (mx) p.facing = mx;
          collide(p);
        }
        for (const k of this.keys) {
          if (!k.taken && dist(k, p) < PICK_RANGE) {
            k.taken = true;
            this.popup(`Sleutel ${this.keyCount()} / ${KEYS.length}`, k.x, k.y - 20, "#ffe066");
          }
        }
        const atExit = p.x > EXIT.x - 6 && p.y < EXIT.y + EXIT.h + 6;
        if (atExit) {
          if (this.keyCount() >= KEYS.length) {
            this.over = true;
            this.api.complete();
            return;
          }
          if (!this.popups.length) this.popup("De deur zit op slot!", EXIT.x - 60, EXIT.y + 60, "#ff9f6b");
        }
      }

      for (const g of this.guards) {
        const target = g.route[g.wp];
        const d = dist(g, target);
        if (d < 3) g.wp = (g.wp + 1) % g.route.length;
        else {
          g.angle = Math.atan2(target.y - g.y, target.x - g.x);
          g.x += ((target.x - g.x) / d) * GUARD_SPEED * s;
          g.y += ((target.y - g.y) / d) * GUARD_SPEED * s;
        }
      }

      const seen = this.seenBy();
      if (seen) {
        this.detect += dt;
        if (this.detect >= DETECT_MS) {
          this.over = true;
          this.api.fail(`${seen} Je wordt teruggebracht naar je kamer.`);
        }
      } else this.detect = Math.max(0, this.detect - dt * 2);
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 900 });
    },

    render(ctx, t) {
      drawMap(ctx);
      const open = this.keyCount() >= KEYS.length;
      ctx.fillStyle = open ? "#6ee07a" : "#b04545";
      ctx.fillRect(EXIT.x, EXIT.y, EXIT.w, EXIT.h);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("EXIT", EXIT.x + EXIT.w / 2 - 44, EXIT.y + 22);

      for (const c of CAMERAS) drawCone(ctx, c, this.camAngle(c), CAM_RANGE, CAM_HALF, "rgba(255, 80, 80, 0.22)");
      for (const g of this.guards) drawCone(ctx, g, g.angle, GUARD_RANGE, GUARD_HALF, "rgba(255, 240, 150, 0.3)");
      for (const l of LOCKERS) drawLocker(ctx, l, this.hidden === l);
      for (const k of this.keys) if (!k.taken) drawKey(ctx, k, t);
      for (const c of CAMERAS) drawCamera(ctx, c, this.camAngle(c));

      const actors = this.guards.map((g) => ({ y: g.y, draw: () => G.drawKid(ctx, g.x, g.y + 12, 0.5, g.look, { adult: true, pose: "walk", facing: Math.cos(g.angle) >= 0 ? 1 : -1, t }) }));
      const p = this.player;
      if (!this.hidden) actors.push({ y: p.y, draw: () => G.drawKid(ctx, p.x, p.y + 12, 0.5, G.playerKidLook(), { pose: p.moving ? "walk" : "stand", facing: p.facing, t }) });
      actors.sort((a, b) => a.y - b.y).forEach((a) => a.draw());

      if (this.hidden) {
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("verstopt", this.hidden.x, this.hidden.y - 22);
      } else if (LOCKERS.some((l) => dist(l, p) < HIDE_RANGE)) {
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.font = "bold 12px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("SPATIE = verstoppen", p.x, p.y - 30);
      }

      if (this.detect > 0) {
        const k = Math.min(1, this.detect / DETECT_MS);
        ctx.fillStyle = `rgba(255, 60, 60, ${0.25 + k * 0.5})`;
        ctx.font = "bold 26px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("!", p.x, p.y - 28);
      }
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return `Sleutels: ${this.keyCount()} / ${KEYS.length}${this.hidden ? " · verstopt" : ""}`;
    },
  };
})();
