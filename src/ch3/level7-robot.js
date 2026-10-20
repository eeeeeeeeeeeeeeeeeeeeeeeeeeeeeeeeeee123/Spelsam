(() => {
  const { W, H } = G;
  const SPEED = 130;
  const TURN = 6;
  const BOOST_SPEED = 320;
  const BOOST_MS = 230;
  const BOOST_COOLDOWN = 1100;
  const SAW_MS = 450;
  const SAW_COOLDOWN = 1000;
  const SAW_RANGE = 40;
  const SAW_ARC = 0.7; // the saw only cuts in front of you
  const SAW_DMG = 9;
  const BOOST_DMG = 7;
  const RAM_DMG = 9;
  const RAM_COOLDOWN = 900;
  const KNOCK = 55;
  const BOOST_KNOCK = 150;
  const ORBIT = 85;
  const ARENA = { x: 40, y: 70, w: W - 80, h: H - 100 };
  const ROUNDS = [
    { hp: 30, spd: 105, dash: 230, col: "#d05030", name: "Brander" },
    { hp: 40, spd: 120, dash: 260, col: "#30a0d0", name: "Kraker" },
    { hp: 50, spd: 135, dash: 290, col: "#a040d0", name: "Sloper" },
  ];
  const KO_MS = 1400;

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  const clampArena = (p, r) => {
    p.x = G.clamp(p.x, ARENA.x + r, ARENA.x + ARENA.w - r);
    p.y = G.clamp(p.y, ARENA.y + r, ARENA.y + ARENA.h - r);
  };

  function drawRobot(ctx, r, t, body, saw, sawReady) {
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(r.angle || 0);
    // saw blade on the front
    ctx.fillStyle = saw ? "#eee" : sawReady ? "#999" : "#555";
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + (saw ? t * 30 : 0);
      ctx.lineTo(20 + Math.cos(a) * 11, Math.sin(a) * 11);
      ctx.lineTo(20 + Math.cos(a + 0.2) * 7, Math.sin(a + 0.2) * 7);
    }
    ctx.fill();
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
      "Je zaag zit alleen aan de <strong>voorkant</strong>! De vijand probeert om je heen te rijden en je van <strong>achteren of opzij</strong> te rammen. Blijf hem aankijken. 3 rondes, elke robot sterker.",

    drawBackground(ctx, t) {
      this.drawArena(ctx);
    },

    drawArena(ctx) {
      ctx.fillStyle = "#2a2a30";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#3a3a44";
      ctx.fillRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      for (let x = ARENA.x; x < ARENA.x + ARENA.w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, ARENA.y);
        ctx.lineTo(x, ARENA.y + ARENA.h);
        ctx.stroke();
      }
      ctx.strokeStyle = "#ffd24a";
      ctx.lineWidth = 3;
      ctx.strokeRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);
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
      this.enemy = { x: ARENA.x + ARENA.w - 60, y: H / 2, hp: r.hp, maxHp: r.hp, spd: r.spd, dash: r.dash, col: r.col, name: r.name, angle: Math.PI, ramCd: 0, flash: 0, state: "circle", timer: 1200, side: 1 };
    },

    popup(text, x, y, color) { this.popups.push({ text, x, y, color, life: 700 }); },

    onAction() {
      const p = this.player;
      if (this.over || this.ko || p.sawCd > 0) return;
      p.saw = SAW_MS;
      p.sawCd = SAW_COOLDOWN;
    },

    onDirection() {},

    tryBoost() {
      const p = this.player;
      if (this.over || this.ko || p.boostCd > 0) return;
      p.boost = BOOST_MS;
      p.boostCd = BOOST_COOLDOWN;
    },

    // is `o` in front of the player, inside the saw's arc?
    inFront(o) {
      const p = this.player;
      return Math.abs(angDiff(Math.atan2(o.y - p.y, o.x - p.x), p.angle)) < SAW_ARC;
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
            p.x = ARENA.x + 60; p.y = H / 2; p.angle = 0; p.hp = Math.min(50, p.hp + 15);
            this.spawnEnemy();
          } else { this.over = true; this.api.fail("Je robot ging kapot in de arena."); }
        }
        return;
      }

      // player: steer, robot turns smoothly toward the stick direction
      const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
      const my = (G.held.down ? 1 : 0) - (G.held.up ? 1 : 0);
      const spd = p.boost > 0 ? BOOST_SPEED : SPEED;
      if (mx || my) {
        const want = Math.atan2(my, mx);
        p.angle += G.clamp(angDiff(want, p.angle), -TURN * s, TURN * s);
        const len = Math.hypot(mx, my);
        p.x += (mx / len) * spd * s;
        p.y += (my / len) * spd * s;
      } else if (p.boost > 0) {
        p.x += Math.cos(p.angle) * spd * s;
        p.y += Math.sin(p.angle) * spd * s;
      }
      clampArena(p, 15);

      // enemy AI: circle around you, then dash in from the side or back
      e.ramCd = Math.max(0, e.ramCd - dt);
      e.timer -= dt;
      const d = dist(e, p) || 1;
      const toP = Math.atan2(p.y - e.y, p.x - e.x);
      const behind = !this.inFront(e);
      if (e.state === "circle") {
        const around = Math.atan2(e.y - p.y, e.x - p.x) + e.side * 0.5;
        const tx = p.x + Math.cos(around) * ORBIT, ty = p.y + Math.sin(around) * ORBIT;
        const td = Math.hypot(tx - e.x, ty - e.y) || 1;
        e.x += ((tx - e.x) / td) * e.spd * s;
        e.y += ((ty - e.y) / td) * e.spd * s;
        e.angle = toP;
        // when it's behind you (or your saw is cooling down), it attacks
        if (e.timer <= 0 && (behind || p.sawCd > 300)) {
          e.state = "dash";
          e.timer = 650;
        }
        // in front of an active saw? dodge to the other side
        if (p.saw > 0 && !behind && d < 90) e.side = Math.sign(angDiff(Math.atan2(e.y - p.y, e.x - p.x), p.angle)) || 1;
      } else if (e.state === "dash") {
        e.angle += G.clamp(angDiff(toP, e.angle), -4 * s, 4 * s);
        e.x += Math.cos(e.angle) * e.dash * s;
        e.y += Math.sin(e.angle) * e.dash * s;
        if (e.timer <= 0) {
          e.state = "circle";
          e.timer = 900 + Math.random() * 900;
          if (Math.random() < 0.4) e.side = -e.side;
        }
      }
      clampArena(e, 15);

      // collisions
      if (dist(e, p) < 34) {
        const front = this.inFront(e);
        if (p.saw > 0 && front) {
          // ran into your saw
          e.hp -= SAW_DMG;
          e.flash = 150;
          p.saw = 0;
          this.knock(e, p, KNOCK * 1.5);
          this.popup(`-${SAW_DMG}`, e.x, e.y - 26, "#ffe066");
          e.state = "circle";
          e.timer = 1000;
        } else if (p.boost > 0 && front) {
          e.hp -= BOOST_DMG;
          e.flash = 150;
          p.boost = 0;
          this.knock(e, p, BOOST_KNOCK);
          this.popup(`-${BOOST_DMG}`, e.x, e.y - 26, "#ffe066");
        } else if (e.ramCd <= 0) {
          e.ramCd = RAM_COOLDOWN;
          const dmg = front ? Math.round(RAM_DMG * 0.6) : RAM_DMG;
          p.hp -= dmg;
          p.flash = 200;
          this.knock(p, e, KNOCK);
          this.knock(e, p, 20);
          this.popup(front ? `-${dmg}` : `-${dmg} van achteren!`, p.x, p.y - 26, "#ff6b6b");
          e.state = "circle";
          e.timer = 1100;
        }
      }

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
      this.drawArena(ctx);
      const p = this.player, e = this.enemy;
      if (e.state === "dash" && !this.ko) {
        ctx.strokeStyle = "rgba(255,80,80,0.5)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.x - Math.cos(e.angle) * 30, e.y - Math.sin(e.angle) * 30);
        ctx.stroke();
      }
      if (!(this.ko && this.koWho === "enemy")) drawRobot(ctx, e, t, e.col, false, false);
      if (!(this.ko && this.koWho === "player")) {
        // saw arc indicator
        ctx.fillStyle = p.saw > 0 ? "rgba(255,224,102,0.25)" : "rgba(255,255,255,0.06)";
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.arc(p.x, p.y, SAW_RANGE + 8, p.angle - SAW_ARC, p.angle + SAW_ARC);
        ctx.closePath();
        ctx.fill();
        drawRobot(ctx, p, t, "#4a8a4a", p.saw > 0, p.sawCd <= 0);
      }

      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(e.x - 18, e.y - 28, 36, 5);
      ctx.fillStyle = "#e05050";
      ctx.fillRect(e.x - 18, e.y - 28, 36 * Math.max(0, e.hp / e.maxHp), 5);

      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(16, 20, 160, 14);
      ctx.fillStyle = "#6ee07a";
      ctx.fillRect(16, 20, 160 * Math.max(0, p.hp / 50), 14);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 13px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`Ronde ${this.round + 1} / ${ROUNDS.length} · ${e.name}`, W - 12, 32);
      ctx.textAlign = "left";
      ctx.fillStyle = p.sawCd > 0 ? "#888" : "#ffd24a";
      ctx.fillText(p.sawCd > 0 ? "zaag…" : "SPATIE zaag", 16, 50);
      ctx.fillStyle = p.boostCd > 0 ? "#888" : "#ffd24a";
      ctx.fillText(p.boostCd > 0 ? "boost…" : "B boost", 110, 50);

      if (this.ko) G.drawBanner(ctx, this.koWho === "enemy" ? "Vijand kapot!" : "Je robot is kapot...", this.koWho === "enemy" ? "#6ee07a" : "#ff6b6b", 60);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return `Ronde ${this.round + 1}/${ROUNDS.length} · robot ${Math.max(0, Math.round(this.player.hp))}`;
    },
  };
})();
