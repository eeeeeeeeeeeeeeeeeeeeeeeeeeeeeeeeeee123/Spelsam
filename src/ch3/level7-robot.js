(() => {
  const { W, H } = G;
  const SPEED = 125;
  const BOOST_SPEED = 300;
  const BOOST_MS = 220;
  const BOOST_COOLDOWN = 1100;
  const SAW_MS = 500;
  const SAW_COOLDOWN = 650;
  const SAW_RANGE = 34;
  const SAW_DMG = 10;
  const BOOST_DMG = 6;
  const RAM_DMG = 8;
  const RAM_COOLDOWN = 900;
  const KNOCK = 60;
  const BOOST_KNOCK = 150;
  const PIT = { x: W / 2, y: H / 2, r: 46 };
  const ARENA = { x: 40, y: 70, w: W - 80, h: H - 100 };
  const ROUNDS = [{ hp: 30, spd: 95, col: "#d05030" }, { hp: 45, spd: 115, col: "#30a0d0" }, { hp: 60, spd: 140, col: "#a040d0" }];
  const KO_MS = 1400;

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const clampArena = (p, r) => {
    p.x = G.clamp(p.x, ARENA.x + r, ARENA.x + ARENA.w - r);
    p.y = G.clamp(p.y, ARENA.y + r, ARENA.y + ARENA.h - r);
  };

  function drawRobot(ctx, r, t, body, saw) {
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(r.angle || 0);
    if (saw) {
      ctx.fillStyle = "#ccc";
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + t * 30;
        ctx.lineTo(Math.cos(a) * 22, Math.sin(a) * 22);
        ctx.lineTo(Math.cos(a + 0.2) * 15, Math.sin(a + 0.2) * 15);
      }
      ctx.fill();
    }
    ctx.fillStyle = r.flash > 0 ? "#fff" : body;
    ctx.fillRect(-15, -15, 30, 30);
    ctx.fillStyle = "#222";
    ctx.fillRect(-15, -18, 30, 5);
    ctx.fillRect(-15, 13, 30, 5);
    ctx.fillStyle = "#ffe066";
    ctx.beginPath();
    ctx.arc(8, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  G.c3level7 = {
    title: "Level 7 — Robotarena (17 jaar)",
    intro:
      "Je bouwt een vechtrobot voor de arena.<br>" +
      "Rijd met de <strong>pijltjes / WASD</strong>, zaag met <strong>SPATIE</strong>, <strong>boost</strong> met <strong>B</strong>.<br>" +
      "Sla de vijand kapot of duw hem in de <strong>vuurput</strong> in het midden. 3 rondes, elke robot sterker.",

    drawBackground(ctx, t) {
      this.drawArena(ctx, t);
    },

    drawArena(ctx, t) {
      ctx.fillStyle = "#2a2a30";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#3a3a44";
      ctx.fillRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);
      ctx.strokeStyle = "#ffd24a";
      ctx.lineWidth = 3;
      ctx.strokeRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);
      // pit
      const g = ctx.createRadialGradient(PIT.x, PIT.y, 6, PIT.x, PIT.y, PIT.r);
      g.addColorStop(0, "#ffd24a");
      g.addColorStop(0.5, "#ff6a1a");
      g.addColorStop(1, "#8a1a1a");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(PIT.x, PIT.y, PIT.r + Math.sin((t || 0) * 5) * 2, 0, Math.PI * 2);
      ctx.fill();
    },

    start(api) {
      this.api = api;
      this.round = 0;
      this.player = { x: ARENA.x + 60, y: H / 2, hp: 50, angle: 0, boost: 0, boostCd: 0, saw: 0, sawCd: 0, flash: 0 };
      this.spawnEnemy();
      this.popups = [];
      this.ko = 0;
      this.koWho = null;
      this.over = false;
    },

    spawnEnemy() {
      const r = ROUNDS[this.round];
      this.enemy = { x: ARENA.x + ARENA.w - 60, y: H / 2, hp: r.hp, maxHp: r.hp, spd: r.spd, col: r.col, angle: Math.PI, ramCd: 0, flash: 0 };
    },

    popup(text, x, y, color) { this.popups.push({ text, x, y, color, life: 700 }); },

    onAction() {
      const p = this.player;
      if (this.over || this.ko || p.sawCd > 0) return;
      p.saw = SAW_MS;
      p.sawCd = SAW_COOLDOWN;
    },

    onDirection(dx, dy, repeat) {},

    tryBoost() {
      const p = this.player;
      if (this.over || this.ko || p.boostCd > 0) return;
      p.boost = BOOST_MS;
      p.boostCd = BOOST_COOLDOWN;
    },

    update(dt, t) {
      if (this.over) return;
      const s = dt / 1000;
      this.popups = G.updatePopups(this.popups, dt);
      const p = this.player, e = this.enemy;
      p.flash = Math.max(0, p.flash - dt);
      e.flash = Math.max(0, e.flash - dt);
      p.boostCd = Math.max(0, p.boostCd - dt);
      p.sawCd = Math.max(0, p.sawCd - dt);
      if (p.saw > 0) p.saw -= dt;
      if (p.boost > 0) p.boost -= dt;
      if (G.held.block) this.tryBoost();

      if (this.ko) {
        this.ko -= dt;
        if (this.ko <= 0) {
          if (this.koWho === "enemy") {
            this.round++;
            if (this.round >= ROUNDS.length) { this.over = true; this.api.complete(); return; }
            this.ko = 0; this.koWho = null;
            this.player.x = ARENA.x + 60; this.player.y = H / 2; this.player.hp = Math.min(50, this.player.hp + 15);
            this.spawnEnemy();
          } else { this.over = true; this.api.fail("Je robot ging kapot in de arena."); }
        }
        return;
      }

      // player move
      const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
      const my = (G.held.down ? 1 : 0) - (G.held.up ? 1 : 0);
      const spd = p.boost > 0 ? BOOST_SPEED : SPEED;
      if (mx || my) {
        const len = Math.hypot(mx, my);
        p.x += (mx / len) * spd * s;
        p.y += (my / len) * spd * s;
        p.angle = Math.atan2(my, mx);
      }
      clampArena(p, 15);

      // enemy AI: drive at player and ram
      e.ramCd = Math.max(0, e.ramCd - dt);
      const d = dist(e, p) || 1;
      e.angle = Math.atan2(p.y - e.y, p.x - e.x);
      e.x += ((p.x - e.x) / d) * e.spd * s;
      e.y += ((p.y - e.y) / d) * e.spd * s;
      clampArena(e, 15);

      // collision / combat
      if (d < 34) {
        // player saw damages enemy
        if (p.saw > 0 && dist(p, e) < SAW_RANGE) {
          e.hp -= SAW_DMG * s * 6;
          e.flash = 120;
          this.knock(e, p, KNOCK * s * 6);
        }
        if (p.boost > 0) {
          e.hp -= BOOST_DMG;
          e.flash = 150;
          this.knock(e, p, BOOST_KNOCK);
          p.boost = 0;
        }
        // enemy rams player
        if (e.ramCd <= 0 && p.boost <= 0 && p.saw <= 0) {
          e.ramCd = RAM_COOLDOWN;
          p.hp -= RAM_DMG;
          p.flash = 200;
          this.knock(p, e, KNOCK);
          this.popup(`-${RAM_DMG}`, p.x, p.y - 26, "#ff6b6b");
        }
      }

      // pit damage
      if (dist(p, PIT) < PIT.r - 6) { p.hp -= 30 * s; p.flash = 100; }
      if (dist(e, PIT) < PIT.r - 6) { e.hp -= 40 * s; e.flash = 100; }

      if (e.hp <= 0) { this.ko = KO_MS; this.koWho = "enemy"; this.popup("KAPOT!", e.x, e.y - 30, "#6ee07a"); }
      else if (p.hp <= 0) { this.ko = KO_MS; this.koWho = "player"; }
    },

    knock(a, from, amt) {
      const d = dist(a, from) || 1;
      a.x += ((a.x - from.x) / d) * amt;
      a.y += ((a.y - from.y) / d) * amt;
      clampArena(a, 15);
    },

    render(ctx, t) {
      this.drawArena(ctx, t);
      const p = this.player, e = this.enemy;
      if (!(this.ko && this.koWho === "enemy")) drawRobot(ctx, e, t, e.flash > 0 ? "#fff" : e.col, false);
      if (!(this.ko && this.koWho === "player")) drawRobot(ctx, p, t, "#4a8a4a", p.saw > 0);

      // enemy hp bar
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(e.x - 18, e.y - 28, 36, 5);
      ctx.fillStyle = "#e05050";
      ctx.fillRect(e.x - 18, e.y - 28, 36 * Math.max(0, e.hp / e.maxHp), 5);

      // HUD
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(16, 20, 160, 14);
      ctx.fillStyle = "#6ee07a";
      ctx.fillRect(16, 20, 160 * Math.max(0, p.hp / 50), 14);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 13px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`Ronde ${this.round + 1} / ${ROUNDS.length}`, W - 12, 32);
      ctx.textAlign = "left";
      ctx.fillStyle = p.boostCd > 0 ? "#888" : "#ffd24a";
      ctx.fillText(p.boostCd > 0 ? "boost…" : "B boost", 16, 48);

      if (this.ko) G.drawBanner(ctx, this.koWho === "enemy" ? "Vijand kapot!" : "Je robot is kapot...", this.koWho === "enemy" ? "#6ee07a" : "#ff6b6b", 60);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return `Ronde ${this.round + 1}/${ROUNDS.length} · robot ${Math.max(0, Math.round(this.player.hp))}`;
    },
  };
})();
