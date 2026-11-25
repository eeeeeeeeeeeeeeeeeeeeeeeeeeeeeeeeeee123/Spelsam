(() => {
  const { W, H } = G;
  const ROOM = { x: 20, y: 44, w: W - 40, h: H - 54 };
  const R = 14;
  const THRUST = 320;
  const DAMP = 0.35;
  const MAX_V = 260;
  const BUMP_V = 175;
  const HP = 3;
  const RING_R = 26;
  const RING_PASS = 20;
  const RINGS = 8;
  const RING_MS = 50000;
  const TARGETS = 8;
  const SHOOT_MS = 35000;
  const FIRE_MS = 260;
  const BOLT_SPEED = 560;
  const RECOIL = 75;
  const RING_SPOTS = [
    { x: 120, y: 110 }, { x: 420, y: 100 }, { x: 270, y: 240 }, { x: 90, y: 380 },
    { x: 460, y: 390 }, { x: 300, y: 120 }, { x: 160, y: 250 }, { x: 400, y: 260 },
    { x: 250, y: 390 }, { x: 470, y: 200 },
  ];

  function drawGym(ctx, t) {
    ctx.fillStyle = "#0c1020";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#1a2236";
    ctx.fillRect(ROOM.x, ROOM.y, ROOM.w, ROOM.h);
    ctx.strokeStyle = "rgba(122,255,208,0.08)";
    ctx.lineWidth = 1;
    for (let x = ROOM.x; x <= ROOM.x + ROOM.w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, ROOM.y);
      ctx.lineTo(x, ROOM.y + ROOM.h);
      ctx.stroke();
    }
    for (let y = ROOM.y; y <= ROOM.y + ROOM.h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(ROOM.x, y);
      ctx.lineTo(ROOM.x + ROOM.w, y);
      ctx.stroke();
    }
    // padded walls with warning stripes
    ctx.strokeStyle = "#e0c040";
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 10]);
    ctx.strokeRect(ROOM.x, ROOM.y, ROOM.w, ROOM.h);
    ctx.setLineDash([]);
    // porthole with earth
    ctx.fillStyle = "#05060c";
    ctx.beginPath();
    ctx.arc(W - 70, 22, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3a7ad0";
    ctx.beginPath();
    ctx.arc(W - 66 + Math.sin((t || 0) * 0.2) * 2, 26, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#4aa04a";
    ctx.fillRect(W - 70, 24, 5, 3);
  }

  G.CAREER_LEVELS.marine[2] = {
    title: "Level 2 — Ruimte-academie (22 jaar)",
    intro:
      "Je bent 22 en begint op de <strong>ruimte-academie</strong>. Training in de <strong>gewichtloze zaal</strong>: je zweeft en remt niet vanzelf af!<br>" +
      "Deel 1: geef gas met <strong>pijltjes / WASD</strong> en vlieg door de <strong>8 ringen</strong> op volgorde. Knal niet te hard tegen de muur (3 ❤).<br>" +
      "Deel 2: schiet <strong>8 doelen</strong> met de <strong>muis</strong> / <strong>SPATIE</strong>. Pas op: elk schot duwt je <strong>achteruit</strong>!",

    drawBackground(ctx, t) {
      drawGym(ctx, t);
    },

    start(api) {
      this.api = api;
      this.phase = "rings";
      this.p = { x: 60, y: H - 60, vx: 0, vy: 0, hp: HP, invuln: 0, facing: 1, tx: 0, ty: 0 };
      const spots = G.shuffle(RING_SPOTS).slice(0, RINGS);
      this.rings = spots.map((s, i) => ({ ...s, n: i + 1, done: false }));
      this.next = 0;
      this.timer = RING_MS;
      this.targets = [];
      this.bolts = [];
      this.aim = { x: W / 2, y: H / 2 };
      this.fire = 0;
      this.popups = [];
      this.flash = 0;
      this.over = false;
      this.won = 0;
      this.pause = 0;
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 1100 });
    },

    startShooting() {
      this.phase = "shoot";
      this.timer = SHOOT_MS;
      this.pause = 1500;
      this.targets = [];
      for (let i = 0; i < TARGETS; i++) {
        const a = Math.random() * Math.PI * 2;
        this.targets.push({ x: 80 + Math.random() * (W - 160), y: 90 + Math.random() * (H - 180), vx: Math.cos(a) * 45, vy: Math.sin(a) * 45, hit: false, spin: Math.random() * 6 });
      }
      this.popup("Deel 2: schieten!", W / 2, 120, "#7affd0");
    },

    doFire() {
      if (this.phase !== "shoot" || this.over || this.won || this.fire > 0 || this.pause > 0) return;
      this.fire = FIRE_MS;
      const p = this.p;
      const d = Math.hypot(this.aim.x - p.x, this.aim.y - p.y) || 1;
      const dx = (this.aim.x - p.x) / d, dy = (this.aim.y - p.y) / d;
      this.bolts.push({ x: p.x + dx * 16, y: p.y - 4 + dy * 16, vx: dx * BOLT_SPEED, vy: dy * BOLT_SPEED });
      // recoil in zero gravity
      p.vx -= dx * RECOIL;
      p.vy -= dy * RECOIL;
    },
    onAction() { this.doFire(); },
    onPointer(x, y) { this.aim = { x, y }; this.doFire(); },
    onPointerMove(x, y) { this.aim = { x, y }; },

    hurt() {
      const p = this.p;
      if (p.invuln > 0) return;
      p.hp--;
      p.invuln = 900;
      this.flash = 300;
      this.popup("AU! De muur!", p.x, p.y - 40, "#ff6b6b");
      if (p.hp <= 0) {
        this.over = true;
        this.api.fail("Je bent te vaak tegen de muur geknald. De instructeur stuurt je naar de ziekenboeg.");
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
      if (this.pause > 0) {
        this.pause -= dt;
      } else {
        this.timer -= dt;
        if (this.timer <= 0) {
          this.over = true;
          this.api.fail(this.phase === "rings" ? "Te langzaam door de ringen. Nog een keer, cadet!" : "De tijd is op: niet alle doelen geraakt.");
          return;
        }
      }
      if (G.held.action) this.doFire();

      // thrusters
      p.tx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
      p.ty = (G.held.down ? 1 : 0) - (G.held.up ? 1 : 0);
      if (p.tx || p.ty) {
        const len = Math.hypot(p.tx, p.ty);
        p.vx += (p.tx / len) * THRUST * s;
        p.vy += (p.ty / len) * THRUST * s;
      }
      if (p.tx) p.facing = p.tx;
      if (this.phase === "shoot") p.facing = this.aim.x >= p.x ? 1 : -1;
      p.vx *= 1 - DAMP * s;
      p.vy *= 1 - DAMP * s;
      const sp = Math.hypot(p.vx, p.vy);
      if (sp > MAX_V) {
        p.vx *= MAX_V / sp;
        p.vy *= MAX_V / sp;
      }
      p.x += p.vx * s;
      p.y += p.vy * s;
      // bounce off the padded walls
      const bounce = (v) => {
        if (Math.abs(v) > BUMP_V) this.hurt();
        return -v * 0.6;
      };
      if (p.x < ROOM.x + R) { p.x = ROOM.x + R; p.vx = bounce(p.vx); }
      if (p.x > ROOM.x + ROOM.w - R) { p.x = ROOM.x + ROOM.w - R; p.vx = bounce(p.vx); }
      if (p.y < ROOM.y + R) { p.y = ROOM.y + R; p.vy = bounce(p.vy); }
      if (p.y > ROOM.y + ROOM.h - R) { p.y = ROOM.y + ROOM.h - R; p.vy = bounce(p.vy); }
      if (this.over) return;

      if (this.phase === "rings") {
        const r = this.rings[this.next];
        if (Math.hypot(r.x - p.x, r.y - p.y) < RING_PASS) {
          r.done = true;
          this.next++;
          this.popup(`Ring ${r.n} ✓`, r.x, r.y - 30, "#7affd0");
          if (this.next >= this.rings.length) this.startShooting();
        }
        return;
      }

      for (const tg of this.targets) {
        if (tg.hit) continue;
        tg.spin += s * 2;
        tg.x += tg.vx * s;
        tg.y += tg.vy * s;
        if (tg.x < ROOM.x + 20 || tg.x > ROOM.x + ROOM.w - 20) tg.vx *= -1;
        if (tg.y < ROOM.y + 20 || tg.y > ROOM.y + ROOM.h - 20) tg.vy *= -1;
      }
      for (const b of this.bolts) {
        b.x += b.vx * s;
        b.y += b.vy * s;
        if (b.x < ROOM.x || b.x > ROOM.x + ROOM.w || b.y < ROOM.y || b.y > ROOM.y + ROOM.h) b.done = true;
        for (const tg of this.targets) {
          if (tg.hit || b.done || Math.hypot(tg.x - b.x, tg.y - b.y) > 16) continue;
          tg.hit = true;
          b.done = true;
          this.popup("RAAK", tg.x, tg.y - 20, "#6ee07a");
        }
      }
      this.bolts = this.bolts.filter((b) => !b.done);
      if (this.targets.every((tg) => tg.hit)) {
        this.won = 2200;
        this.popup("Geslaagd voor de academie!", W / 2, 120, "#6ee07a");
      }
    },

    render(ctx, t) {
      drawGym(ctx, t);
      const p = this.p;

      if (this.phase === "rings") {
        for (let i = this.rings.length - 1; i >= 0; i--) {
          const r = this.rings[i];
          if (r.done) continue;
          const isNext = i === this.next;
          ctx.strokeStyle = isNext ? "#7affd0" : "rgba(160,170,200,0.35)";
          ctx.lineWidth = isNext ? 5 : 3;
          ctx.beginPath();
          ctx.arc(r.x, r.y, RING_R + (isNext ? Math.sin(t * 6) * 2 : 0), 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = isNext ? "#7affd0" : "rgba(200,210,230,0.5)";
          ctx.font = "bold 14px Segoe UI, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(r.n, r.x, r.y + 5);
        }
        const r = this.rings[this.next];
        if (r) {
          ctx.strokeStyle = "rgba(122,255,208,0.25)";
          ctx.setLineDash([4, 6]);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(r.x, r.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      } else {
        for (const tg of this.targets) {
          if (tg.hit) continue;
          ctx.save();
          ctx.translate(tg.x, tg.y);
          ctx.scale(Math.cos(tg.spin), 1);
          for (const [rad, col] of [[14, "#e04040"], [10, "#fff"], [6, "#e04040"], [2.5, "#fff"]]) {
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.arc(0, 0, rad, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
        ctx.fillStyle = "#7affd0";
        for (const b of this.bolts) {
          ctx.beginPath();
          ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // jet flames opposite to thrust
      if (p.tx || p.ty) {
        const len = Math.hypot(p.tx, p.ty);
        ctx.fillStyle = `rgba(255,${160 + Math.random() * 60},60,0.85)`;
        ctx.beginPath();
        ctx.arc(p.x - (p.tx / len) * 18, p.y - (p.ty / len) * 18, 5 + Math.random() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      // floating astronaut, tilting with speed
      ctx.save();
      ctx.globalAlpha = p.invuln > 0 && Math.floor(t * 12) % 2 ? 0.5 : 1;
      ctx.translate(p.x, p.y);
      ctx.rotate(G.clamp(p.vx * 0.002, -0.4, 0.4));
      const ang = Math.atan2(this.aim.y - p.y, this.aim.x - p.x);
      const armAngle = this.phase === "shoot" ? G.clamp(p.facing === 1 ? ang : Math.PI - ang, -1.4, 1) : -0.6;
      const hand = G.drawKid(ctx, 0, 24, 0.42, G.marineLook(), { adult: true, t, facing: p.facing, pose: "stand", armAngle });
      G.drawSpaceHelmet(ctx, 0, 24, 0.42, p.facing);
      if (this.phase === "shoot") G.drawLaserGun(ctx, hand, ang - G.clamp(p.vx * 0.002, -0.4, 0.4), p.facing, 0.5, this.fire > FIRE_MS - 80);
      ctx.restore();
      ctx.globalAlpha = 1;

      if (this.phase === "shoot") {
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.aim.x, this.aim.y, 8, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (this.flash > 0) {
        ctx.fillStyle = `rgba(200,40,40,${0.3 * (this.flash / 300)})`;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.fillStyle = "#ff6b6b";
      ctx.font = "16px Segoe UI, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("❤".repeat(Math.max(0, p.hp)), 14, 30);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px Segoe UI, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`${Math.max(0, Math.ceil(this.timer / 1000))}s`, W - 100, 28);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return this.phase === "rings"
        ? `Ringen ${this.next}/${RINGS}`
        : `Doelen ${this.targets.filter((tg) => tg.hit).length}/${TARGETS}`;
    },
  };
})();
