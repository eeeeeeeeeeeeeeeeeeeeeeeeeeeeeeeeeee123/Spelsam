(() => {
  const { W, H } = G;
  // the arena is bigger than the screen; the camera follows you
  const WW = 900;
  const WH = 700;
  const PLAYER_SPEED = 160;
  const BOT_SPEED = 100;
  const R = 11;
  const HP = 3;
  const BOT_HP = 2;
  const SHOT_COOLDOWN = 380;
  const BOLT_SPEED = 470;
  const BOT_COUNT = 9;
  const ZONE_START = Math.min(WW, WH) / 2 - 10;
  const ZONE_MIN = 70;
  const SHRINK_MS = 50000;
  const ZONE_DMG_MS = 900;
  const BOT_SHOOT_MS = 1150;
  const BOT_RANGE = 260;
  const PREFERRED = 150;
  const COLORS = ["#ff5a5a", "#5aa0ff", "#f0c030", "#9a5ae0", "#50c070", "#e070b0", "#60d0d0", "#d08030", "#8090ff"];

  // cover blocks
  const WALLS = [
    { x: 160, y: 140, w: 90, h: 24 }, { x: 650, y: 140, w: 90, h: 24 },
    { x: 160, y: 536, w: 90, h: 24 }, { x: 650, y: 536, w: 90, h: 24 },
    { x: 420, y: 250, w: 60, h: 60 }, { x: 420, y: 390, w: 60, h: 60 },
    { x: 290, y: 330, w: 24, h: 80 }, { x: 586, y: 290, w: 24, h: 80 },
    { x: 90, y: 330, w: 70, h: 24 }, { x: 740, y: 346, w: 70, h: 24 },
    { x: 330, y: 70, w: 24, h: 70 }, { x: 546, y: 560, w: 24, h: 70 },
  ];

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const inWall = (x, y, pad = 0) => WALLS.some((w) => x > w.x - pad && x < w.x + w.w + pad && y > w.y - pad && y < w.y + w.h + pad);

  // push a circle out of walls and keep it inside the arena
  function collide(o) {
    for (const w of WALLS) {
      const cx = G.clamp(o.x, w.x, w.x + w.w);
      const cy = G.clamp(o.y, w.y, w.y + w.h);
      const dx = o.x - cx, dy = o.y - cy;
      const d = Math.hypot(dx, dy);
      if (d < R) {
        if (d > 0) {
          o.x = cx + (dx / d) * R;
          o.y = cy + (dy / d) * R;
        } else {
          o.y = w.y - R;
        }
      }
    }
    o.x = G.clamp(o.x, R + 4, WW - R - 4);
    o.y = G.clamp(o.y, R + 4, WH - R - 4);
  }

  function lineOfSight(a, b) {
    const steps = Math.ceil(dist(a, b) / 12);
    for (let i = 1; i < steps; i++) {
      const k = i / steps;
      if (inWall(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k)) return false;
    }
    return true;
  }

  function drawFloor(ctx) {
    ctx.fillStyle = "#0c0e1c";
    ctx.fillRect(-50, -50, WW + 100, WH + 100);
    ctx.fillStyle = "#15182a";
    ctx.fillRect(0, 0, WW, WH);
    ctx.strokeStyle = "rgba(90,120,255,0.08)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= WW; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, WH);
      ctx.stroke();
    }
    for (let y = 0; y <= WH; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WW, y);
      ctx.stroke();
    }
    ctx.strokeStyle = "#5a7aff";
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, WW - 4, WH - 4);
  }

  function drawWalls(ctx) {
    for (const w of WALLS) {
      ctx.fillStyle = "#2a2f55";
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.strokeStyle = "#7a8aff";
      ctx.lineWidth = 2;
      ctx.strokeRect(w.x + 1, w.y + 1, w.w - 2, w.h - 2);
    }
  }

  G.c3level6 = {
    title: "Level 6 — Lasergame (16 jaar)",
    intro:
      "Een grote lasergame-arena: <strong>10 spelers, 1 winnaar</strong>. Wees de laatste die overblijft!<br>" +
      "Loop met de <strong>pijltjes / WASD</strong>, mik met de <strong>muis</strong>, schiet met <strong>klik</strong> of <strong>SPATIE</strong>. Schuil achter de <strong>muurtjes</strong>.<br>" +
      "De <strong>veilige zone</strong> (paarse cirkel) krimpt — blijf erin! Rechtsboven zie je de kaart.",

    drawBackground(ctx, t) {
      ctx.save();
      ctx.translate(-(WW - W) / 2, -(WH - H) / 2);
      drawFloor(ctx);
      drawWalls(ctx);
      ctx.restore();
    },

    start(api) {
      this.api = api;
      this.player = { x: WW / 2, y: WH / 2 + 60, hp: HP, facing: 1, alive: true, hit: 0 };
      this.aimScreen = { x: W / 2, y: 60 };
      this.cam = { x: 0, y: 0 };
      this.cooldown = 0;
      this.bolts = [];
      this.popups = [];
      this.flash = 0;
      this.zone0 = { x: WW / 2, y: WH / 2 };
      // the final circle always ends fully inside the arena
      this.zoneTarget = { x: ZONE_MIN + 60 + Math.random() * (WW - 2 * ZONE_MIN - 120), y: ZONE_MIN + 60 + Math.random() * (WH - 2 * ZONE_MIN - 120) };
      this.zone = { ...this.zone0 };
      this.zoneR = ZONE_START;
      this.zoneTimer = ZONE_DMG_MS;
      this.elapsed = 0;
      this.over = false;
      this.bots = [];
      for (let i = 0; i < BOT_COUNT; i++) {
        const a = (i / BOT_COUNT) * Math.PI * 2;
        const b = {
          x: WW / 2 + Math.cos(a) * 280,
          y: WH / 2 + Math.sin(a) * 230,
          hp: BOT_HP,
          color: COLORS[i],
          look: G.randomLook({ shirt: [COLORS[i]] }),
          alive: true,
          goal: null,
          goalT: 0,
          strafe: Math.random() < 0.5 ? 1 : -1,
          strafeT: 800 + Math.random() * 1200,
          shootT: 1200 + Math.random() * 1800,
          facing: 1,
          hit: 0,
        };
        collide(b);
        this.bots.push(b);
      }
      this.updateCam();
    },

    updateCam() {
      const p = this.player;
      this.cam.x = G.clamp(p.x - W / 2, 0, WW - W);
      this.cam.y = G.clamp(p.y - H / 2, 0, WH - H);
    },

    aimWorld() {
      return { x: this.aimScreen.x + this.cam.x, y: this.aimScreen.y + this.cam.y };
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x: x - this.cam.x, y: y - this.cam.y, color, life: 700 });
    },

    aliveCount() {
      return (this.player.alive ? 1 : 0) + this.bots.filter((b) => b.alive).length;
    },

    doShoot() {
      if (this.over || !this.player.alive || this.cooldown > 0) return;
      this.cooldown = SHOT_COOLDOWN;
      const p = this.player;
      const aim = this.aimWorld();
      const d = dist(p, aim) || 1;
      this.bolts.push({ x: p.x, y: p.y, vx: ((aim.x - p.x) / d) * BOLT_SPEED, vy: ((aim.y - p.y) / d) * BOLT_SPEED, own: p });
    },

    onAction() { this.doShoot(); },
    onPointer(x, y) { this.aimScreen = { x, y }; this.doShoot(); },
    onPointerMove(x, y) { this.aimScreen = { x, y }; },

    botShoot(b, target) {
      const spread = (Math.random() - 0.5) * 0.28;
      const ang = Math.atan2(target.y - b.y, target.x - b.x) + spread;
      this.bolts.push({ x: b.x, y: b.y, vx: Math.cos(ang) * BOLT_SPEED * 0.8, vy: Math.sin(ang) * BOLT_SPEED * 0.8, own: b });
    },

    nearestTarget(b) {
      let best = null, bd = 1e9;
      const cand = this.bots.filter((o) => o.alive && o !== b).concat(this.player.alive ? [this.player] : []);
      for (const c of cand) {
        const d = dist(b, c);
        if (d < bd) { bd = d; best = c; }
      }
      return { best, bd };
    },

    // a random free point inside the safe zone
    zonePoint() {
      for (let i = 0; i < 20; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * Math.max(10, this.zoneR - 30);
        const pt = { x: this.zone.x + Math.cos(a) * r, y: this.zone.y + Math.sin(a) * r };
        if (pt.x > 30 && pt.x < WW - 30 && pt.y > 30 && pt.y < WH - 30 && !inWall(pt.x, pt.y, R + 4)) return pt;
      }
      return { ...this.zone };
    },

    update(dt, t) {
      if (this.over) return;
      const s = dt / 1000;
      this.cooldown = Math.max(0, this.cooldown - dt);
      this.flash = Math.max(0, this.flash - dt);
      this.popups = G.updatePopups(this.popups, dt);
      if (G.held.action) this.doShoot();
      this.elapsed += dt;

      // zone: shrinks and drifts so it always stays inside the arena
      const k = Math.min(1, this.elapsed / SHRINK_MS);
      this.zoneR = ZONE_START + (ZONE_MIN - ZONE_START) * k;
      this.zone.x = this.zone0.x + (this.zoneTarget.x - this.zone0.x) * k;
      this.zone.y = this.zone0.y + (this.zoneTarget.y - this.zone0.y) * k;

      const p = this.player;
      if (p.alive) {
        p.hit = Math.max(0, p.hit - dt);
        const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
        const my = (G.held.down ? 1 : 0) - (G.held.up ? 1 : 0);
        if (mx || my) {
          const len = Math.hypot(mx, my);
          p.x += (mx / len) * PLAYER_SPEED * s;
          p.y += (my / len) * PLAYER_SPEED * s;
          collide(p);
        }
        p.facing = this.aimWorld().x >= p.x ? 1 : -1;
        p.moving = !!(mx || my);
        this.zoneTimer -= dt;
        if (dist(p, this.zone) > this.zoneR && this.zoneTimer <= 0) {
          this.zoneTimer = ZONE_DMG_MS;
          p.hp--;
          this.flash = 300;
          this.popup("ZONE!", p.x, p.y - 34, "#c070ff");
          if (p.hp <= 0) { p.alive = false; this.lose(); return; }
        }
      }
      this.updateCam();

      // bots: get into the zone, keep a fighting distance and strafe
      for (const b of this.bots) {
        if (!b.alive) continue;
        b.hit = Math.max(0, b.hit - dt);
        b.goalT -= dt;
        b.strafeT -= dt;
        if (b.strafeT <= 0) { b.strafe = -b.strafe; b.strafeT = 700 + Math.random() * 1300; }
        const { best, bd } = this.nearestTarget(b);
        let vx = 0, vy = 0;
        const outside = dist(b, this.zone) > this.zoneR - 25;
        if (outside || !best || bd > BOT_RANGE + 60) {
          if (!b.goal || b.goalT <= 0 || dist(b, b.goal) < 20 || dist(b.goal, this.zone) > this.zoneR - 20) {
            b.goal = this.zonePoint();
            b.goalT = 2500;
          }
          const d = dist(b, b.goal) || 1;
          vx = (b.goal.x - b.x) / d;
          vy = (b.goal.y - b.y) / d;
        } else {
          const ux = (best.x - b.x) / (bd || 1), uy = (best.y - b.y) / (bd || 1);
          const close = bd < PREFERRED - 30 ? -1 : bd > PREFERRED + 30 ? 1 : 0;
          vx = ux * close * 0.8 + -uy * b.strafe * 0.7;
          vy = uy * close * 0.8 + ux * b.strafe * 0.7;
          b.facing = ux >= 0 ? 1 : -1;
        }
        // keep away from other bots
        for (const o of this.bots) {
          if (o === b || !o.alive) continue;
          const d = dist(b, o);
          if (d < 40 && d > 0) { vx += ((b.x - o.x) / d) * 0.8; vy += ((b.y - o.y) / d) * 0.8; }
        }
        const len = Math.hypot(vx, vy);
        if (len > 0) {
          const ox = b.x, oy = b.y;
          b.x += (vx / len) * BOT_SPEED * s;
          b.y += (vy / len) * BOT_SPEED * s;
          collide(b);
          // stuck on a wall: pick a new goal
          if (Math.hypot(b.x - ox, b.y - oy) < BOT_SPEED * s * 0.3) { b.goal = this.zonePoint(); b.strafe = -b.strafe; }
          if (Math.abs(vx) > 0.2 && (outside || !best || bd > BOT_RANGE + 60)) b.facing = vx > 0 ? 1 : -1;
        }
        b.moving = len > 0;
        if (dist(b, this.zone) > this.zoneR) {
          b.zoneT = (b.zoneT || 0) + dt;
          if (b.zoneT > 1500) { b.zoneT = 0; b.hp--; if (b.hp <= 0) { b.alive = false; this.popup("UIT", b.x, b.y - 30, "#c070ff"); } }
        }
        b.shootT -= dt;
        if (b.shootT <= 0 && best && bd < BOT_RANGE && lineOfSight(b, best)) {
          b.shootT = BOT_SHOOT_MS + Math.random() * 700;
          this.botShoot(b, best);
        }
      }

      // bolts
      for (const bo of this.bolts) {
        bo.x += bo.vx * s; bo.y += bo.vy * s;
        if (bo.x < 0 || bo.x > WW || bo.y < 0 || bo.y > WH || inWall(bo.x, bo.y)) { bo.done = true; continue; }
        for (const b of this.bots) {
          if (!b.alive || bo.own === b || dist(bo, b) > R + 4) continue;
          bo.done = true;
          b.hp--;
          b.hit = 150;
          if (b.hp <= 0) { b.alive = false; this.popup("UIT", b.x, b.y - 30, bo.own === p ? "#6ee07a" : "#ff9a9a"); }
          break;
        }
        if (!bo.done && bo.own !== p && p.alive && dist(bo, p) < R + 4) {
          bo.done = true; p.hp--; p.hit = 200; this.flash = 300; this.popup("-1", p.x, p.y - 34, "#ff6b6b");
          if (p.hp <= 0) { p.alive = false; this.lose(); return; }
        }
      }
      this.bolts = this.bolts.filter((bo) => !bo.done);

      if (this.aliveCount() <= 1 && p.alive) {
        this.over = true;
        this.api.complete();
      }
    },

    lose() {
      this.over = true;
      this.api.fail("Je bent afgeschoten. Niet de laatste man.");
    },

    render(ctx, t) {
      ctx.save();
      ctx.translate(-this.cam.x, -this.cam.y);
      drawFloor(ctx);

      // danger outside the zone
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, WW, WH);
      ctx.arc(this.zone.x, this.zone.y, this.zoneR, 0, Math.PI * 2, true);
      ctx.fillStyle = "rgba(140, 40, 180, 0.28)";
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = "#c070ff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.zone.x, this.zone.y, this.zoneR, 0, Math.PI * 2);
      ctx.stroke();

      drawWalls(ctx);

      // players as kids with a glowing vest, sorted back to front
      const actors = this.bots.filter((b) => b.alive).map((b) => ({ o: b, look: b.look, vest: b.color }));
      if (this.player.alive) actors.push({ o: this.player, look: G.playerKidLook(), vest: "#ffffff", me: true });
      actors.sort((a, b) => a.o.y - b.o.y);
      for (const a of actors) {
        const o = a.o;
        G.drawKid(ctx, o.x, o.y + 16, 0.5, a.look, { t, facing: o.facing, pose: o.moving ? "walk" : "stand", flash: o.hit > 0, armAngle: -0.1 });
        ctx.strokeStyle = a.vest;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(o.x - 6, o.y - 9, 12, 12, 3);
        ctx.stroke();
        ctx.fillStyle = a.vest;
        ctx.beginPath();
        ctx.arc(o.x, o.y - 3, 2, 0, Math.PI * 2);
        ctx.fill();
        if (a.me) {
          ctx.fillStyle = "#6effa0";
          ctx.beginPath();
          ctx.moveTo(o.x, o.y - 36);
          ctx.lineTo(o.x - 5, o.y - 44);
          ctx.lineTo(o.x + 5, o.y - 44);
          ctx.fill();
        }
      }

      if (this.player.alive) {
        const aim = this.aimWorld();
        ctx.strokeStyle = "rgba(110,255,160,0.35)";
        ctx.setLineDash([3, 5]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(this.player.x, this.player.y);
        ctx.lineTo(aim.x, aim.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      for (const bo of this.bolts) {
        ctx.strokeStyle = bo.own === this.player ? "#6effa0" : "#ff6060";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(bo.x, bo.y);
        ctx.lineTo(bo.x - bo.vx * 0.025, bo.y - bo.vy * 0.025);
        ctx.stroke();
      }
      ctx.restore();

      if (this.flash > 0) { ctx.fillStyle = `rgba(200,40,40,${0.25 * (this.flash / 300)})`; ctx.fillRect(0, 0, W, H); }

      // minimap
      const mw = 110, mh = (mw * WH) / WW, mx = W - mw - 10, my = 36;
      const sc = mw / WW;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(mx, my, mw, mh);
      ctx.strokeStyle = "#c070ff";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(mx + this.zone.x * sc, my + this.zone.y * sc, this.zoneR * sc, 0, Math.PI * 2);
      ctx.stroke();
      for (const b of this.bots) if (b.alive) { ctx.fillStyle = b.color; ctx.fillRect(mx + b.x * sc - 1.5, my + b.y * sc - 1.5, 3, 3); }
      if (this.player.alive) { ctx.fillStyle = "#6effa0"; ctx.fillRect(mx + this.player.x * sc - 2, my + this.player.y * sc - 2, 4, 4); }
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.strokeRect(mx + this.cam.x * sc, my + this.cam.y * sc, W * sc, H * sc);

      ctx.fillStyle = "#ff6b6b";
      ctx.font = "18px Segoe UI, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("❤".repeat(Math.max(0, this.player.hp)), 12, 26);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`Over: ${this.aliveCount()}`, W - 12, 26);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return `Spelers over: ${this.aliveCount()} · ❤ ${Math.max(0, this.player.hp)}`;
    },
  };
})();
