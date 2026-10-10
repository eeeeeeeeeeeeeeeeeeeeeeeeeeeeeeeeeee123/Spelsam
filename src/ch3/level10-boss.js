(() => {
  const { W, H } = G;
  const FEET_Y = H - 22;
  const PLAYER_SPEED = 210;
  const PLAYER_HP = 5;
  const HIT_R = 18;
  const INVULN_MS = 900;
  const MAG = 30;
  const RELOAD_MS = 1600;
  const FIRE_MS = 95;
  const BULLET_SPEED = 820;
  const BOSS_HP = 160;
  const BOSS_Y = 120;
  const BOSS_R = 55;
  const WINDUP_MS = 700;
  const ATTACK_GAP = [1700, 1100];
  const STATUS_MS = 2600;
  const KO_MS = 1800;
  const NECK = 94;
  const POUR_TILT = Math.PI * 0.82;
  const SUITS = [
    { s: "♥", c: "#d02030" },
    { s: "♦", c: "#d02030" },
    { s: "♠", c: "#111" },
    { s: "♣", c: "#111" },
  ];
  const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  // Per-addiction boss config: name, look, hit effect, intro, fail message.
  const BOSSES = {
    drank: {
      name: "De Bierfles",
      status: "Dronken! Besturing omgedraaid",
      statusColor: "#ffd24a",
      bg: ["#2a1a0a", "#4a2f12"],
      intro:
        "Je drankgebruik is uit de hand gelopen. Het is een <strong>monster</strong> geworden: <strong>De Bierfles</strong>.<br>" +
        "Hij <strong>giet bier</strong> op je en schiet <strong>schuimballen</strong>. Geraakt = <strong>dronken</strong>: je besturing draait om.<br>" +
        "Loop met <strong>← →</strong> / <strong>A D</strong>, mik met de <strong>muis</strong>, schiet met <strong>klik</strong> of <strong>SPATIE</strong>. Versla je verslaving!",
      fail: "De drank won deze keer. Hulp vragen is geen zwakte.",
    },
    drugs: {
      name: "De Weedsigaar",
      status: "High! Je bent traag",
      statusColor: "#7fe08a",
      bg: ["#0f1f12", "#20352a"],
      intro:
        "Je drugsgebruik is uit de hand gelopen. Het is een <strong>monster</strong> geworden: <strong>De Weedsigaar</strong>.<br>" +
        "Hij <strong>blaast rookwolken</strong> op je en laat <strong>as</strong> regenen. In de rook = <strong>high</strong>: je wordt traag en ziet wazig. Schiet de wolken kapot!<br>" +
        "Loop met <strong>← →</strong> / <strong>A D</strong>, mik met de <strong>muis</strong>, schiet met <strong>klik</strong> of <strong>SPATIE</strong>. Versla je verslaving!",
      fail: "De drugs wonnen deze keer. Hulp vragen is geen zwakte.",
    },
    gokken: {
      name: "De Schoppenvrouw",
      status: "Inzet kwijt! −10 kogels",
      statusColor: "#ff6b9d",
      bg: ["#0a2a1a", "#103a26"],
      intro:
        "Je gokgedrag is uit de hand gelopen. Het is een <strong>monster</strong> geworden: <strong>De Schoppenvrouw</strong>.<br>" +
        "Ze gooit <strong>kaarten</strong> (aas t/m 10, harten, ruiten, schoppen en klaver) naar je. Geraakt = je verliest je <strong>inzet</strong>: 10 kogels weg.<br>" +
        "Loop met <strong>← →</strong> / <strong>A D</strong>, mik met de <strong>muis</strong>, schiet met <strong>klik</strong> of <strong>SPATIE</strong>. Versla je verslaving!",
      fail: "Het gokken won deze keer. Hulp vragen is geen zwakte.",
    },
  };

  const kind = () => (BOSSES[G.addiction] ? G.addiction : "drank");
  const cfg = () => BOSSES[kind()];

  function drawScene(ctx, t) {
    const [a, b] = cfg().bg;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, a);
    g.addColorStop(1, b);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    if (kind() === "gokken") {
      // casino felt with gold trim
      ctx.strokeStyle = "rgba(255,210,74,0.35)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(W / 2, H + 40, W * 0.62, 160, 0, Math.PI, 0);
      ctx.stroke();
    } else if (kind() === "drank") {
      // bar shelves
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      for (let i = 0; i < 3; i++) ctx.fillRect(0, 60 + i * 70, W, 6);
    } else {
      // drifting haze
      ctx.fillStyle = "rgba(180,220,180,0.05)";
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc((i * 110 + (t || 0) * 12) % (W + 100) - 50, 80 + (i % 3) * 90, 60, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, FEET_Y, W, H - FEET_Y);
  }

  function drawEyes(ctx, x, y, gap, look, angry) {
    for (const sx of [-1, 1]) {
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(x + sx * gap, y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#111";
      ctx.beginPath();
      ctx.arc(x + sx * gap + look.x * 3, y + look.y * 3, 3.5, 0, Math.PI * 2);
      ctx.fill();
      if (angry) {
        ctx.strokeStyle = "#111";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + sx * (gap + 9), y - 12);
        ctx.lineTo(x + sx * (gap - 6), y - 7);
        ctx.stroke();
      }
    }
  }

  function drawBottle(ctx, b, look, t) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.tilt);
    const glass = b.flash > 0 ? "#8e5a26" : "#7a4a1a";
    ctx.fillStyle = glass;
    ctx.beginPath();
    ctx.roundRect(-36, -20, 72, 95, 14);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-36, -10);
    ctx.lineTo(-13, -55);
    ctx.lineTo(13, -55);
    ctx.lineTo(36, -10);
    ctx.fill();
    ctx.fillRect(-13, -90, 26, 40);
    ctx.fillStyle = "#d4a017";
    ctx.fillRect(-15, -98, 30, 10);
    // shine
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(-28, -10, 8, 75);
    // label with face
    ctx.fillStyle = "#f2e6c0";
    ctx.fillRect(-32, 0, 64, 52);
    ctx.fillStyle = "#b02020";
    ctx.font = "bold 12px Segoe UI, Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("BIER", 0, 47);
    drawEyes(ctx, 0, 16, 13, look, true);
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 36, 8, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    // foam at the cap
    ctx.fillStyle = "#fffbe8";
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(i * 9, -100 + Math.sin(t * 6 + i) * 2, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCigar(ctx, b, look, t) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(Math.sin(t * 1.5) * 0.06);
    // cone: wide lit end left, filter right
    ctx.fillStyle = b.flash > 0 ? "#f6ead8" : "#e8e0c8";
    ctx.beginPath();
    ctx.moveTo(-95, -38);
    ctx.lineTo(80, -14);
    ctx.lineTo(80, 14);
    ctx.lineTo(-95, 38);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#c8a878";
    ctx.fillRect(80, -14, 22, 28);
    // green bits
    ctx.fillStyle = "#4a8a3a";
    for (let i = 0; i < 14; i++) {
      const px = -85 + ((i * 37) % 160);
      const py = ((i * 23) % 50) - 25;
      ctx.fillRect(px, py * (1 - (px + 95) / 200), 3, 3);
    }
    // glowing tip
    const glow = 0.7 + Math.sin(t * 8) * 0.3;
    ctx.fillStyle = `rgba(255,${90 + glow * 80},30,1)`;
    ctx.beginPath();
    ctx.ellipse(-95, 0, 9, 38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#555";
    ctx.beginPath();
    ctx.ellipse(-101, 0, 5, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    // face (sleepy, red eyes)
    for (const sx of [-1, 1]) {
      ctx.fillStyle = "#ffdada";
      ctx.beginPath();
      ctx.arc(-10 + sx * 15, -8, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#b02020";
      ctx.beginPath();
      ctx.arc(-10 + sx * 15 + look.x * 3, -6 + look.y * 2, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = b.flash > 0 ? "#f6ead8" : "#e8e0c8";
      ctx.fillRect(-10 + sx * 15 - 9, -17, 18, 7);
    }
    ctx.fillStyle = "#5a2020";
    ctx.beginPath();
    if (b.blowing) ctx.arc(-10, 14, 6, 0, Math.PI * 2);
    else ctx.arc(-10, 10, 10, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.fill();
    ctx.restore();
    // idle smoke from the tip
    ctx.fillStyle = "rgba(200,210,200,0.35)";
    for (let i = 0; i < 4; i++) {
      const k = (t * 0.6 + i / 4) % 1;
      ctx.beginPath();
      ctx.arc(b.x - 100 + Math.sin(k * 6 + i) * 8, b.y - 10 - k * 70, 6 + k * 14, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCard(ctx, x, y, w, h, rank, suit, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = suit.c;
    ctx.textAlign = "center";
    ctx.font = `bold ${Math.round(h * 0.32)}px Segoe UI, Roboto, sans-serif`;
    ctx.fillText(rank, 0, -h * 0.05);
    ctx.font = `${Math.round(h * 0.36)}px serif`;
    ctx.fillText(suit.s, 0, h * 0.38);
    ctx.restore();
  }

  function drawQueen(ctx, b, look, t) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(Math.sin(t * 1.2) * 0.05);
    ctx.fillStyle = b.flash > 0 ? "#fff0ee" : "#fdfbf4";
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-58, -80, 116, 160, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#111";
    ctx.textAlign = "center";
    ctx.font = "bold 18px Segoe UI, Roboto, sans-serif";
    ctx.fillText("Q", -44, -58);
    ctx.font = "16px serif";
    ctx.fillText("♠", -44, -42);
    ctx.save();
    ctx.rotate(Math.PI);
    ctx.font = "bold 18px Segoe UI, Roboto, sans-serif";
    ctx.fillText("Q", -44, -58);
    ctx.font = "16px serif";
    ctx.fillText("♠", -44, -42);
    ctx.restore();
    // dress
    ctx.fillStyle = "#2a3a8a";
    ctx.beginPath();
    ctx.moveTo(-34, 70);
    ctx.lineTo(-22, 8);
    ctx.lineTo(22, 8);
    ctx.lineTo(34, 70);
    ctx.fill();
    ctx.fillStyle = "#c02030";
    ctx.fillRect(-22, 8, 44, 10);
    // hair + face
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.ellipse(0, -14, 30, 34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f2d0b0";
    ctx.beginPath();
    ctx.ellipse(0, -10, 21, 25, 0, 0, Math.PI * 2);
    ctx.fill();
    // crown
    ctx.fillStyle = "#e8b820";
    ctx.beginPath();
    ctx.moveTo(-22, -38);
    ctx.lineTo(-22, -58);
    ctx.lineTo(-11, -46);
    ctx.lineTo(0, -62);
    ctx.lineTo(11, -46);
    ctx.lineTo(22, -58);
    ctx.lineTo(22, -38);
    ctx.fill();
    // narrow scheming eyes
    for (const sx of [-1, 1]) {
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.ellipse(sx * 9, -14, 6, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3a1a4a";
      ctx.beginPath();
      ctx.arc(sx * 9 + look.x * 2, -14 + look.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx * 15, -22);
      ctx.lineTo(sx * 4, -19);
      ctx.stroke();
    }
    // smirk
    ctx.strokeStyle = "#c02030";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-8, 2);
    ctx.quadraticCurveTo(2, 7, 10, -1);
    ctx.stroke();
    ctx.fillStyle = "#111";
    ctx.font = "26px serif";
    ctx.fillText("♠", 0, 66);
    ctx.restore();
  }

  G.c3level10 = {
    get title() {
      return `Level 10 — Eindbaas: ${cfg().name} (20 jaar)`;
    },
    get intro() {
      return cfg().intro;
    },

    drawBackground(ctx, t) {
      drawScene(ctx, t);
      const b = { x: W / 2, y: BOSS_Y, tilt: 0, flash: 0 };
      this.drawBoss(ctx, b, { x: 0, y: 1 }, t);
      G.drawKid(ctx, W / 2, FEET_Y, 0.9, G.playerKidLook(), { adult: true, t, armAngle: -0.6 });
    },

    drawBoss(ctx, b, look, t) {
      const k = kind();
      if (k === "drank") drawBottle(ctx, b, look, t);
      else if (k === "drugs") drawCigar(ctx, b, look, t);
      else drawQueen(ctx, b, look, t);
    },

    start(api) {
      this.api = api;
      this.kind = kind();
      this.player = { x: W / 2, hp: PLAYER_HP, invuln: 0, facing: 1 };
      this.boss = { x: W / 2, y: BOSS_Y, hp: BOSS_HP, tilt: 0, flash: 0, phase: 0, homeX: W / 2, blowing: 0 };
      this.aim = { x: W / 2, y: BOSS_Y };
      this.ammo = MAG;
      this.reload = 0;
      this.fire = 0;
      this.bullets = [];
      this.shots = [];
      this.queue = [];
      this.pour = null;
      this.attack = null;
      this.attackTimer = 1500;
      this.attackIndex = 0;
      this.status = 0;
      this.flash = 0;
      this.ko = 0;
      this.popups = [];
      this.over = false;
      this.time = 0;
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 900 });
    },

    hitsBoss(pt) {
      const b = this.boss;
      const dx = pt.x - b.x;
      const dy = pt.y - b.y;
      if (this.kind === "drugs") return Math.abs(dx) < 105 && Math.abs(dy) < 38 - dx * 0.1;
      if (this.kind === "gokken") return Math.abs(dx) < 58 && Math.abs(dy) < 80;
      return Math.hypot(dx, dy) < BOSS_R;
    },

    gunPos() {
      return { x: this.player.x, y: FEET_Y - 55 };
    },

    doFire() {
      if (this.over || this.ko || this.reload > 0 || this.fire > 0) return;
      if (this.ammo <= 0) {
        this.reload = RELOAD_MS;
        return;
      }
      this.ammo--;
      this.fire = FIRE_MS;
      const g = this.gunPos();
      const d = dist(g, this.aim) || 1;
      this.bullets.push({ x: g.x, y: g.y, vx: ((this.aim.x - g.x) / d) * BULLET_SPEED, vy: ((this.aim.y - g.y) / d) * BULLET_SPEED });
      if (this.ammo <= 0) this.reload = RELOAD_MS;
    },

    onAction() {
      this.doFire();
    },
    onPointer(x, y) {
      this.aim = { x, y };
      this.doFire();
    },
    onPointerMove(x, y) {
      this.aim = { x, y };
    },

    hurt(msg) {
      const p = this.player;
      if (p.invuln > 0 || this.over || this.ko) return;
      p.hp--;
      p.invuln = INVULN_MS;
      this.flash = 350;
      this.status = STATUS_MS;
      if (this.kind === "gokken") {
        this.ammo = Math.max(0, this.ammo - 10);
        if (this.ammo <= 0 && this.reload <= 0) this.reload = RELOAD_MS;
      }
      this.popup(msg || "−1 ❤", p.x, FEET_Y - 110, "#ff6b6b");
      if (p.hp <= 0) {
        this.over = true;
        this.api.fail(cfg().fail);
      }
    },

    // ---- attacks ------------------------------------------------------
    pickAttack() {
      const list = {
        drank: ["pour", "foam", "pour"],
        drugs: ["smoke", "ash", "smoke"],
        gokken: ["fan", "deal", "fan"],
      }[this.kind];
      const name = list[this.attackIndex++ % list.length];
      const p = this.player;
      this.attack = { name, windup: WINDUP_MS, targetX: G.clamp(p.x, 50, W - 50) };
    },

    launch(a) {
      const b = this.boss;
      const p = this.player;
      const enraged = b.phase === 1;
      const aimAt = (sx, sy, speed, spread) => {
        const ang = Math.atan2(FEET_Y - 40 - sy, p.x - sx) + spread;
        return { vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed };
      };
      if (a.name === "pour") {
        this.pour = { targetX: a.targetX, x: a.targetX, top: b.y, time: enraged ? 1600 : 1200, hit: false };
      } else if (a.name === "foam") {
        const n = enraged ? 7 : 5;
        for (let i = 0; i < n; i++) {
          const v = aimAt(b.x, b.y + 40, 170, (i - (n - 1) / 2) * 0.22);
          this.shots.push({ kind: "foam", x: b.x, y: b.y + 40, ...v, r: 11 });
        }
      } else if (a.name === "smoke") {
        const n = enraged ? 4 : 3;
        for (let i = 0; i < n; i++) {
          const v = aimAt(b.x - 10, b.y + 15, 70 + i * 18, (i - (n - 1) / 2) * 0.35);
          this.shots.push({ kind: "smoke", x: b.x - 10, y: b.y + 15, ...v, r: 18, grow: 10, hp: 3, flash: 0 });
        }
        b.blowing = 500;
      } else if (a.name === "ash") {
        const n = enraged ? 14 : 10;
        for (let i = 0; i < n; i++) {
          this.shots.push({ kind: "ash", x: 20 + Math.random() * (W - 40), y: -10 - Math.random() * 160, vx: 0, vy: 150 + Math.random() * 60, r: 6 });
        }
      } else if (a.name === "fan") {
        // wide fan with one card missing: that hole is your way out
        const n = enraged ? 7 : 5;
        const hole = Math.floor(Math.random() * n);
        for (let i = 0; i < n; i++) {
          if (i === hole) continue;
          const v = aimAt(b.x, b.y + 20, 190, (i - (n - 1) / 2) * 0.3);
          this.shots.push({ kind: "card", x: b.x, y: b.y + 20, ...v, r: 12, rot: 0, vr: 9, rank: G.pick(RANKS), suit: G.pick(SUITS) });
        }
      } else if (a.name === "deal") {
        // a quick burst of single cards dealt straight at you
        const n = enraged ? 6 : 4;
        for (let i = 0; i < n; i++) {
          this.queue.push({ delay: i * 220, fn: () => {
            const v = aimAt(b.x, b.y + 20, 300, 0);
            this.shots.push({ kind: "card", x: b.x, y: b.y + 20, ...v, r: 12, rot: 0, vr: 14, rank: G.pick(RANKS), suit: G.pick(SUITS) });
          } });
        }
      }
    },

    update(dt, t) {
      if (this.over) return;
      const s = dt / 1000;
      this.time += dt;
      const p = this.player;
      const b = this.boss;
      this.fire = Math.max(0, this.fire - dt);
      this.flash = Math.max(0, this.flash - dt);
      this.status = Math.max(0, this.status - dt);
      p.invuln = Math.max(0, p.invuln - dt);
      b.flash = Math.max(0, b.flash - dt);
      b.blowing = Math.max(0, b.blowing - dt);
      this.popups = G.updatePopups(this.popups, dt);
      if (this.reload > 0) {
        this.reload -= dt;
        if (this.reload <= 0) this.ammo = MAG;
      }

      if (this.ko) {
        this.ko -= dt;
        b.tilt += s * 3;
        b.y += s * 120;
        if (this.ko <= 0) {
          this.over = true;
          this.api.complete();
        }
        return;
      }

      if (G.held.action) this.doFire();

      // delayed attack pieces (dealt cards)
      for (const q of this.queue) {
        q.delay -= dt;
        if (q.delay <= 0) {
          q.done = true;
          q.fn();
        }
      }
      this.queue = this.queue.filter((q) => !q.done);

      // player move (drunk = inverted, high = slow)
      let mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
      if (this.status > 0 && this.kind === "drank") mx = -mx;
      const slow = this.status > 0 && this.kind === "drugs" ? 0.45 : 1;
      p.x = G.clamp(p.x + mx * PLAYER_SPEED * slow * s, 24, W - 24);
      if (mx) p.facing = mx > 0 ? 1 : -1;
      if (this.aim.x !== p.x) p.facing = this.aim.x > p.x ? 1 : -1;

      // boss movement
      const sway = b.phase === 1 ? 1.2 : 0.75;
      b.homeX = W / 2 + Math.sin((this.time / 1000) * sway) * 160;
      let targetX = b.homeX;
      let targetTilt = 0;
      if (this.attack && this.attack.name === "pour") {
        targetX = this.attack.targetX - NECK * Math.sin(POUR_TILT);
        targetTilt = POUR_TILT;
      } else if (this.pour) {
        targetX = this.pour.targetX - NECK * Math.sin(POUR_TILT);
        targetTilt = POUR_TILT;
      }
      b.x += (targetX - b.x) * Math.min(1, s * 5);
      if (this.kind === "drank") b.tilt += (targetTilt - b.tilt) * Math.min(1, s * 6);

      // attack cycle
      if (this.attack) {
        this.attack.windup -= dt;
        if (this.attack.windup <= 0) {
          this.launch(this.attack);
          this.attack = null;
          this.attackTimer = ATTACK_GAP[b.phase];
        }
      } else if (!this.pour) {
        this.attackTimer -= dt;
        if (this.attackTimer <= 0) this.pickAttack();
      }

      // beer stream
      if (this.pour) {
        this.pour.time -= dt;
        this.pour.x = b.x + NECK * Math.sin(b.tilt);
        this.pour.top = b.y - NECK * Math.cos(b.tilt);
        if (!this.pour.hit && Math.abs(p.x - this.pour.x) < 24 && p.invuln <= 0) {
          this.pour.hit = true;
          this.hurt();
        }
        if (this.pour.time <= 0) {
          this.pour = null;
          this.attackTimer = ATTACK_GAP[b.phase];
        }
      }

      // projectiles
      const pc = { x: p.x, y: FEET_Y - 40 };
      for (const sh of this.shots) {
        sh.x += sh.vx * s;
        sh.y += sh.vy * s;
        if (sh.rot !== undefined) sh.rot += sh.vr * s;
        if (sh.kind === "smoke") {
          sh.r = Math.min(46, sh.r + sh.grow * s);
          sh.flash = Math.max(0, sh.flash - dt);
          // smoke drifts toward you
          sh.vx += Math.sign(p.x - sh.x) * 18 * s;
        }
        if (sh.y > FEET_Y + 10 || sh.x < -60 || sh.x > W + 60) {
          sh.done = true;
          continue;
        }
        if (dist(sh, pc) < sh.r + HIT_R) {
          sh.done = true;
          this.hurt();
        }
      }

      // bullets
      for (const bl of this.bullets) {
        bl.x += bl.vx * s;
        bl.y += bl.vy * s;
        if (bl.x < -10 || bl.x > W + 10 || bl.y < -10 || bl.y > H + 10) {
          bl.done = true;
          continue;
        }
        // shoot smoke clouds apart
        for (const sh of this.shots) {
          if (sh.kind === "smoke" && !sh.done && dist(bl, sh) < sh.r) {
            bl.done = true;
            sh.flash = 80;
            if (--sh.hp <= 0) {
              sh.done = true;
              this.popup("weg!", sh.x, sh.y, "#cfe8cf");
            }
            break;
          }
        }
        if (bl.done) continue;
        if (this.hitsBoss(bl)) {
          bl.done = true;
          b.hp--;
          b.flash = 60;
          if (b.phase === 0 && b.hp <= BOSS_HP / 2) {
            b.phase = 1;
            this.popup("Hij wordt BOOS!", b.x, b.y + 90, "#ff6b6b");
          }
          if (b.hp <= 0) {
            this.ko = KO_MS;
            this.shots = [];
            this.queue = [];
            this.pour = null;
            this.attack = null;
            this.popup("VERSLAVING VERSLAGEN!", W / 2, H / 2, "#6ee07a");
          }
        }
      }
      this.bullets = this.bullets.filter((bl) => !bl.done);
      this.shots = this.shots.filter((sh) => !sh.done);
    },

    render(ctx, t) {
      drawScene(ctx, t);
      const p = this.player;
      const b = this.boss;
      const look = { x: G.clamp((p.x - b.x) / 200, -1, 1), y: 1 };

      // telegraph
      if (this.attack && this.attack.name === "pour") {
        ctx.fillStyle = `rgba(255,210,74,${0.12 + 0.1 * Math.sin(t * 20)})`;
        ctx.fillRect(this.attack.targetX - 24, 0, 48, FEET_Y);
      }
      if (this.attack && !this.ko) {
        ctx.fillStyle = "#ff6b6b";
        ctx.font = "bold 22px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("!", b.x + 70, b.y - 60);
      }

      // beer stream
      if (this.pour) {
        const top = this.pour.top;
        ctx.fillStyle = "rgba(240,180,40,0.85)";
        ctx.fillRect(this.pour.x - 14, top, 28, FEET_Y - top);
        ctx.fillStyle = "#fffbe8";
        for (let i = 0; i < 8; i++) {
          const yy = top + ((t * 400 + i * 40) % (FEET_Y - top));
          ctx.beginPath();
          ctx.arc(this.pour.x + Math.sin(i + t * 9) * 8, yy, 5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "rgba(240,180,40,0.6)";
        ctx.beginPath();
        ctx.ellipse(this.pour.x, FEET_Y, 50, 8, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      this.drawBoss(ctx, b, look, t);

      // projectiles
      for (const sh of this.shots) {
        if (sh.kind === "foam") {
          ctx.fillStyle = "#fffbe8";
          ctx.beginPath();
          ctx.arc(sh.x, sh.y, sh.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(240,180,40,0.7)";
          ctx.beginPath();
          ctx.arc(sh.x + 3, sh.y + 3, sh.r * 0.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (sh.kind === "smoke") {
          ctx.fillStyle = sh.flash > 0 ? "rgba(255,255,255,0.8)" : "rgba(190,210,190,0.7)";
          for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.arc(sh.x + Math.cos(i * 1.6 + t) * sh.r * 0.4, sh.y + Math.sin(i * 1.6 + t) * sh.r * 0.3, sh.r * 0.65, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (sh.kind === "ash") {
          ctx.fillStyle = "#ff8a30";
          ctx.beginPath();
          ctx.arc(sh.x, sh.y, sh.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#555";
          ctx.beginPath();
          ctx.arc(sh.x, sh.y - 3, sh.r * 0.6, 0, Math.PI * 2);
          ctx.fill();
        } else if (sh.kind === "card") {
          drawCard(ctx, sh.x, sh.y, 24, 34, sh.rank, sh.suit, sh.rot);
        }
      }

      // player + AK
      const g = this.gunPos();
      const angle = Math.atan2(this.aim.y - g.y, this.aim.x - g.x);
      const facing = this.aim.x >= p.x ? 1 : -1;
      const hand = G.drawKid(ctx, p.x, FEET_Y, 0.9, G.playerKidLook(), {
        adult: true,
        t,
        facing,
        flash: p.invuln > 0,
        dizzy: this.status > 0 && this.kind !== "gokken",
        armAngle: G.clamp(facing === 1 ? angle : Math.PI - angle, -1.5, 0.5),
      });
      ctx.save();
      ctx.translate(hand.x, hand.y);
      ctx.rotate(angle);
      if (facing < 0) ctx.scale(1, -1);
      ctx.fillStyle = "#222";
      ctx.fillRect(0, -3, 34, 6);
      ctx.fillRect(8, 3, 7, 10);
      if (this.fire > 0) {
        ctx.fillStyle = "#ffd24a";
        ctx.beginPath();
        ctx.arc(36, 0, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      ctx.fillStyle = "#ffe066";
      for (const bl of this.bullets) ctx.fillRect(bl.x - 2, bl.y - 1, 5, 2);

      // crosshair
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.aim.x, this.aim.y, 9, 0, Math.PI * 2);
      ctx.moveTo(this.aim.x - 14, this.aim.y);
      ctx.lineTo(this.aim.x + 14, this.aim.y);
      ctx.moveTo(this.aim.x, this.aim.y - 14);
      ctx.lineTo(this.aim.x, this.aim.y + 14);
      ctx.stroke();

      // status overlays
      if (this.status > 0) {
        const k = this.status / STATUS_MS;
        if (this.kind === "drank") {
          ctx.fillStyle = `rgba(255,190,40,${0.12 * k})`;
          ctx.fillRect(0, 0, W, H);
        } else if (this.kind === "drugs") {
          ctx.fillStyle = `rgba(150,200,150,${0.3 * k})`;
          ctx.fillRect(0, 0, W, H);
        }
        ctx.fillStyle = cfg().statusColor;
        ctx.font = "bold 13px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(cfg().status, W / 2, H - 6);
      }
      if (this.flash > 0) {
        ctx.fillStyle = `rgba(200,40,40,${0.3 * (this.flash / 350)})`;
        ctx.fillRect(0, 0, W, H);
      }

      // boss bar
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(W / 2 - 130, 10, 260, 12);
      ctx.fillStyle = b.phase === 1 ? "#ff5050" : "#e0a030";
      ctx.fillRect(W / 2 - 130, 10, 260 * Math.max(0, b.hp / BOSS_HP), 12);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(cfg().name, W / 2, 34);

      // player hud
      ctx.font = "18px Segoe UI, sans-serif";
      ctx.textAlign = "left";
      ctx.fillStyle = "#ff6b6b";
      ctx.fillText("❤".repeat(Math.max(0, p.hp)), 12, 26);
      ctx.font = "bold 14px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "right";
      ctx.fillStyle = this.reload > 0 ? "#ffd24a" : "#fff";
      ctx.fillText(this.reload > 0 ? "HERLADEN..." : `${this.ammo} / ${MAG}`, W - 12, 26);

      if (this.ko) G.drawBanner(ctx, "Je bent vrij!", "#6ee07a", 70);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return `${cfg().name} · ${Math.max(0, Math.ceil((this.boss.hp / BOSS_HP) * 100))}%`;
    },
  };
})();
