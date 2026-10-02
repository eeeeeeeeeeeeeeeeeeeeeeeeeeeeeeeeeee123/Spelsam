(() => {
  const { W, H } = G;
  const SLEEP_MS = 2600;
  const DISSOLVE_MS = 1600;
  const WAKE_MS = 1800;
  const CEREMONY_MS = 4200;
  const PLAYER_SPEED = 175;
  const PLAYER_HP = 4;
  const INVULN_MS = 1200;
  const BOUNDS = { minX: 20, maxX: W - 20, minY: 200, maxY: H - 15 };
  const SHOT_COOLDOWN = 240;
  const LIGHT_SPEED = 560;
  const BOSS_HP = 9;
  const BOSS_Y = 110;
  const BODY_R = 78;
  const EYE_R = 30;
  const EYE_OPEN_MS = 2200;
  const PHASES = [
    { closedMs: 1700, volleyMs: 2000, orbs: 3, orbSpeed: 140, sway: 50 },
    { closedMs: 1500, volleyMs: 1700, orbs: 3, orbSpeed: 160, sway: 80, minions: true },
    { closedMs: 1300, volleyMs: 1400, orbs: 4, orbSpeed: 175, sway: 110, minions: true, slams: true },
  ];
  const MINION_MS = 3400;
  const MINION_MAX = 2;
  const MINION_SPEED = 60;
  const SLAM_MS = 4200;
  const SLAM_WARN_MS = 1100;
  const SLAM_HIT_MS = 300;
  const SLAM_W = 70;
  const PRINCIPAL_LOOK = { ...G.SKINS.wit, hair: "kort", hairColor: "#8a8a8a", eyes: G.EYES.blauw, gender: "jongen", shirt: "#3a5a8a", pants: "#2a3040" };

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function drawGraduationHall(ctx, t) {
    G.drawRoom(ctx, "#dfe8f5", "#9a7a5a", 280);
    ctx.fillStyle = "#b03a4a";
    ctx.fillRect(0, 0, W, 26);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px Segoe UI, Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("GEFELICITEERD GROEP 8!", W / 2, 19);
    const colors = ["#e05a5a", "#5aa0e0", "#f0b43c", "#6cc46c", "#b07ad8"];
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.moveTo(i * 40, 26);
      ctx.lineTo(i * 40 + 40, 26);
      ctx.lineTo(i * 40 + 20, 50 + Math.sin(t * 2 + i) * 3);
      ctx.fill();
    }
  }

  function drawDiploma(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = "#fff8e6";
    ctx.fillRect(-18, -6, 36, 12);
    ctx.fillStyle = "#e8dcc0";
    ctx.beginPath();
    ctx.arc(-18, 0, 6, 0, Math.PI * 2);
    ctx.arc(18, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#b03a4a";
    ctx.fillRect(-3, -7, 6, 14);
    ctx.restore();
  }

  function drawNight(ctx, t, rage) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, `rgb(${20 + rage * 40}, 10, 35)`);
    g.addColorStop(1, "#2a1540");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    G.drawFloaters(ctx, t, "rgba(180, 120, 255, 0.07)", 20, -8);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(0, BOUNDS.minY - 20, W, 4);
  }

  function drawBedroom(ctx, t, morning) {
    ctx.fillStyle = morning ? "#f3e2c8" : "#1c2340";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = morning ? "#bfe3ff" : "#0c1024";
    ctx.fillRect(60, 60, 120, 90);
    if (!morning) {
      ctx.fillStyle = "#f4f1c0";
      ctx.beginPath();
      ctx.arc(140, 90, 14, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = morning ? "#8a6a4a" : "#3a2a4a";
    ctx.fillRect(0, 330, W, H - 330);
    ctx.fillStyle = "#6a4a8a";
    ctx.fillRect(250, 300, 220, 40);
    ctx.fillStyle = "#d0c0e0";
    ctx.fillRect(250, 290, 60, 18);
    ctx.fillStyle = "#8a70b0";
    ctx.fillRect(300, 280, 170, 30);
  }

  function drawBoss(ctx, b, t) {
    const x = b.x;
    const y = b.y;
    const fade = b.fade ?? 1;
    ctx.save();
    ctx.globalAlpha = fade;
    // tentacles
    ctx.strokeStyle = `rgba(20, 8, 30, 0.95)`;
    ctx.lineCap = "round";
    for (let i = 0; i < 6; i++) {
      const side = i < 3 ? -1 : 1;
      const k = (i % 3) + 1;
      const wave = Math.sin(t * 2.5 + i) * 25;
      ctx.lineWidth = 16 - k * 3;
      ctx.beginPath();
      ctx.moveTo(x + side * 30, y + 30);
      ctx.bezierCurveTo(x + side * (60 + k * 30), y + 60 + wave, x + side * (40 + k * 45), y + 110 - wave, x + side * (70 + k * 40), y + 150 + wave * 0.5);
      ctx.stroke();
    }
    // body
    const scale = b.scale ?? 1;
    ctx.fillStyle = "#140a20";
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const r = BODY_R * scale * (1 + Math.sin(a * 6 + t * 3) * 0.06 + Math.sin(a * 3 - t * 2) * 0.04);
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.85);
    }
    ctx.fill();
    // horns
    ctx.fillStyle = "#2a1540";
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + side * 35 * scale, y - 45 * scale);
      ctx.lineTo(x + side * 60 * scale, y - 95 * scale);
      ctx.lineTo(x + side * 55 * scale, y - 40 * scale);
      ctx.fill();
    }
    // eye
    if (b.eyeOpen) {
      ctx.fillStyle = "#f4ecff";
      ctx.beginPath();
      ctx.ellipse(x, y, EYE_R * scale, EYE_R * 0.8 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = b.flash > 0 ? "#ffffff" : "#e02040";
      ctx.beginPath();
      ctx.arc(x + b.look.x * 8, y + b.look.y * 6, 12 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(x + b.look.x * 9, y + b.look.y * 7, 5 * scale, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = "#e02040";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - EYE_R * scale, y);
      ctx.quadraticCurveTo(x, y + 8, x + EYE_R * scale, y);
      ctx.stroke();
    }
    // teeth
    ctx.fillStyle = "#e8e0f0";
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * 10 * scale - 5, y + 40 * scale);
      ctx.lineTo(x + i * 10 * scale + 5, y + 40 * scale);
      ctx.lineTo(x + i * 10 * scale, y + 52 * scale);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawMinion(ctx, m, t) {
    ctx.fillStyle = "#1a0e28";
    ctx.beginPath();
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const r = 14 * (1 + Math.sin(a * 4 + t * 6 + m.seed) * 0.15);
      ctx.lineTo(m.x + Math.cos(a) * r, m.y + Math.sin(a) * r);
    }
    ctx.fill();
    ctx.fillStyle = "#ff4060";
    ctx.beginPath();
    ctx.arc(m.x - 5, m.y - 3, 2.5, 0, Math.PI * 2);
    ctx.arc(m.x + 5, m.y - 3, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawFlashlight(ctx, hand, angle) {
    ctx.save();
    ctx.translate(hand.x, hand.y);
    ctx.rotate(angle);
    ctx.fillStyle = "#3a3a44";
    ctx.fillRect(-4, -4, 16, 8);
    ctx.fillStyle = "#ffe066";
    ctx.fillRect(12, -5, 4, 10);
    ctx.restore();
  }

  G.c2level10 = {
    title: "Level 10 — De laatste nacht (10 jaar)",
    intro:
      "De avond voor de diploma-uitreiking. Tijd om te slapen...<br>" +
      "<strong>Pijltjes / WASD</strong> = lopen. Mik met de <strong>muis</strong> en <strong>klik</strong> om te schieten (of <strong>SPATIE</strong> om te schieten waar je mikt).<br>" +
      `Zoek de zwakke plek. Je kunt <strong>${PLAYER_HP} klappen</strong> hebben.`,

    drawBackground(ctx, t) {
      drawBedroom(ctx, t, false);
    },

    start(api) {
      this.api = api;
      this.phase = "sleep";
      this.timer = SLEEP_MS;
      this.player = { x: W / 2, y: 380, hp: PLAYER_HP, invuln: 0, facing: 1, moving: false };
      this.boss = { x: W / 2, y: BOSS_Y, hp: BOSS_HP, eyeOpen: false, eyeTimer: PHASES[0].closedMs, volley: 1500, minion: MINION_MS, slam: SLAM_MS, flash: 0, look: { x: 0, y: 1 } };
      this.lights = [];
      this.orbs = [];
      this.minions = [];
      this.slamZone = null;
      this.cooldown = 0;
      this.aim = { x: W / 2, y: BOSS_Y };
      this.popups = [];
      this.time = 0;
    },

    stage() {
      const lost = BOSS_HP - this.boss.hp;
      return Math.min(PHASES.length - 1, Math.floor((lost / BOSS_HP) * PHASES.length));
    },

    shoot(tx, ty) {
      if (this.phase !== "fight" || this.cooldown > 0) return;
      this.cooldown = SHOT_COOLDOWN;
      const p = this.player;
      const from = { x: p.x, y: p.y - 40 };
      const d = Math.hypot(tx - from.x, ty - from.y) || 1;
      this.lights.push({ x: from.x, y: from.y, vx: ((tx - from.x) / d) * LIGHT_SPEED, vy: ((ty - from.y) / d) * LIGHT_SPEED });
    },

    onPointer(x, y) {
      this.aim = { x, y };
      this.shoot(x, y);
    },

    onPointerMove(x, y) {
      this.aim = { x, y };
    },

    onAction() {
      this.shoot(this.aim.x, this.aim.y);
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 800 });
    },

    hurt() {
      const p = this.player;
      if (p.invuln > 0) return;
      p.hp--;
      p.invuln = INVULN_MS;
      this.popup("AU!", p.x, p.y - 70, "#ff6b6b");
      if (p.hp <= 0) this.api.fail("De nachtmerrie was te sterk.");
    },

    update(dt) {
      const s = dt / 1000;
      this.time += s;
      this.popups = G.updatePopups(this.popups, dt);
      if (this.phase !== "fight") {
        this.timer -= dt;
        if (this.phase === "dissolve") {
          const k = 1 - this.timer / DISSOLVE_MS;
          this.boss.fade = 1 - k;
          this.boss.scale = 1 + k * 0.4;
        }
        if (this.timer > 0) return;
        const next = { sleep: ["fight", 0], dissolve: ["wake", WAKE_MS], wake: ["ceremony", CEREMONY_MS] }[this.phase];
        if (next) [this.phase, this.timer] = next;
        else this.api.complete();
        return;
      }

      const p = this.player;
      const b = this.boss;
      const ph = PHASES[this.stage()];
      this.cooldown = Math.max(0, this.cooldown - dt);
      p.invuln = Math.max(0, p.invuln - dt);
      b.flash = Math.max(0, b.flash - dt);

      const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
      const my = (G.held.down ? 1 : 0) - (G.held.up ? 1 : 0);
      p.moving = !!(mx || my);
      if (p.moving) {
        const len = Math.hypot(mx, my);
        p.x = G.clamp(p.x + (mx / len) * PLAYER_SPEED * s, BOUNDS.minX, BOUNDS.maxX);
        p.y = G.clamp(p.y + (my / len) * PLAYER_SPEED * s, BOUNDS.minY, BOUNDS.maxY);
      }
      p.facing = this.aim.x >= p.x ? 1 : -1;

      b.x = W / 2 + Math.sin(this.time * 0.7) * ph.sway;
      const toP = { x: p.x - b.x, y: p.y - b.y };
      const tl = Math.hypot(toP.x, toP.y) || 1;
      b.look = { x: toP.x / tl, y: toP.y / tl };

      b.eyeTimer -= dt;
      if (b.eyeTimer <= 0) {
        b.eyeOpen = !b.eyeOpen;
        b.eyeTimer = b.eyeOpen ? EYE_OPEN_MS : ph.closedMs;
      }

      b.volley -= dt;
      if (b.volley <= 0) {
        b.volley = ph.volleyMs;
        const base = Math.atan2(p.y - b.y, p.x - b.x);
        for (let i = 0; i < ph.orbs; i++) {
          const a = base + (i - (ph.orbs - 1) / 2) * 0.25;
          this.orbs.push({ x: b.x, y: b.y + 40, vx: Math.cos(a) * ph.orbSpeed, vy: Math.sin(a) * ph.orbSpeed });
        }
      }

      if (ph.minions) {
        b.minion -= dt;
        if (b.minion <= 0) {
          b.minion = MINION_MS;
          if (this.minions.length < MINION_MAX) this.minions.push({ x: b.x, y: b.y + 60, seed: Math.random() * 10 });
        }
      }

      if (ph.slams) {
        if (this.slamZone) {
          this.slamZone.left -= dt;
          if (this.slamZone.left <= 0 && !this.slamZone.hit) {
            this.slamZone.hit = true;
            this.slamZone.left = SLAM_HIT_MS;
            if (Math.abs(p.x - this.slamZone.x) < SLAM_W / 2 + 8) this.hurt();
          } else if (this.slamZone.left <= 0) this.slamZone = null;
        } else {
          b.slam -= dt;
          if (b.slam <= 0) {
            b.slam = SLAM_MS;
            this.slamZone = { x: p.x, left: SLAM_WARN_MS, hit: false };
          }
        }
      }

      for (const o of this.orbs) {
        o.x += o.vx * s;
        o.y += o.vy * s;
        if (dist(o, { x: p.x, y: p.y - 30 }) < 16) {
          o.done = true;
          this.hurt();
        } else if (o.x < -20 || o.x > W + 20 || o.y > H + 20) o.done = true;
      }
      this.orbs = this.orbs.filter((o) => !o.done);

      for (const m of this.minions) {
        const d = dist(m, { x: p.x, y: p.y - 30 }) || 1;
        m.x += ((p.x - m.x) / d) * MINION_SPEED * s;
        m.y += ((p.y - 30 - m.y) / d) * MINION_SPEED * s;
        if (d < 20) {
          m.done = true;
          this.hurt();
        }
      }

      for (const l of this.lights) {
        l.x += l.vx * s;
        l.y += l.vy * s;
        if (l.x < -10 || l.x > W + 10 || l.y < -10 || l.y > H + 10) {
          l.done = true;
          continue;
        }
        const m = this.minions.find((mn) => !mn.done && dist(mn, l) < 18);
        if (m) {
          m.done = true;
          l.done = true;
          this.popup("Poef!", m.x, m.y - 20, "#c9a0ff");
          continue;
        }
        if (b.eyeOpen && dist(l, b) < EYE_R + 4) {
          l.done = true;
          b.hp--;
          b.flash = 250;
          b.eyeOpen = false;
          b.eyeTimer = ph.closedMs;
          this.popup("RAAK!", b.x, b.y - 60, "#ffe066");
          if (b.hp <= 0) {
            this.phase = "dissolve";
            this.timer = DISSOLVE_MS;
            this.orbs = [];
            this.minions = [];
            this.slamZone = null;
            return;
          }
        } else if (!b.eyeOpen && dist(l, b) < BODY_R * 0.8) {
          l.done = true;
          this.popup("...", l.x, l.y, "#8a70b0");
        }
      }
      this.lights = this.lights.filter((l) => !l.done);
      this.minions = this.minions.filter((m) => !m.done);
    },

    renderCeremony(ctx, t) {
      drawGraduationHall(ctx, t);
      const k = Math.min(1, (1 - this.timer / CEREMONY_MS) * 2);
      G.drawKid(ctx, 360, 390, 1.25, PRINCIPAL_LOOK, { adult: true, facing: -1, t, armAngle: 0.1 });
      const hand = G.drawKid(ctx, 170 + k * 90, 390, 1.15, G.playerKidLook(), { t, pose: k < 1 ? "walk" : "stand", armAngle: k >= 1 ? 0.15 : undefined });
      drawDiploma(ctx, k >= 1 ? hand.x + 14 : 330, k >= 1 ? hand.y : 330, 1.4);
      G.drawBanner(ctx, "Gefeliciteerd met je diploma!", "#6ee07a", 110);
    },

    render(ctx, t) {
      if (this.phase === "sleep") {
        drawBedroom(ctx, t, false);
        G.drawKid(ctx, 330, 300, 1, G.playerKidLook(), { pose: "down", eyesClosed: true, t });
        const k = 1 - this.timer / SLEEP_MS;
        G.drawBanner(ctx, "Die nacht...", "#c9a0ff", 60);
        if (k > 0.6) {
          ctx.fillStyle = `rgba(40, 10, 60, ${(k - 0.6) * 2.5})`;
          ctx.fillRect(0, 0, W, H);
        }
        return;
      }
      if (this.phase === "wake") {
        drawBedroom(ctx, t, true);
        G.drawKid(ctx, 330, 300, 1, G.playerKidLook(), { pose: "down", t });
        G.drawBanner(ctx, "Je wordt wakker. Het was maar een droom!", "#ffe066", 70);
        return;
      }
      if (this.phase === "ceremony") {
        this.renderCeremony(ctx, t);
        return;
      }

      const rage = this.stage() / (PHASES.length - 1);
      drawNight(ctx, t, rage);
      const b = this.boss;
      if (this.slamZone) {
        const hit = this.slamZone.hit;
        ctx.fillStyle = hit ? "rgba(20, 8, 30, 0.9)" : `rgba(255, 50, 80, ${0.2 + Math.sin(t * 20) * 0.1})`;
        ctx.fillRect(this.slamZone.x - SLAM_W / 2, hit ? 0 : BOUNDS.minY - 20, SLAM_W, H);
      }
      drawBoss(ctx, b, t);
      for (const m of this.minions) drawMinion(ctx, m, t);

      ctx.fillStyle = "#2a0a3a";
      for (const o of this.orbs) {
        ctx.beginPath();
        ctx.arc(o.x, o.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#a040ff";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      const p = this.player;
      if (!(p.invuln > 0 && Math.floor(t * 20) % 2)) {
        const angle = Math.atan2(this.aim.y - (p.y - 40), this.aim.x - p.x);
        const local = p.facing === 1 ? angle : Math.PI - angle;
        const hand = G.drawKid(ctx, p.x, p.y, 0.8, G.playerKidLook(), { t, facing: p.facing, pose: p.moving ? "walk" : "stand", armAngle: G.clamp(local, -1.6, 0.8) });
        drawFlashlight(ctx, hand, angle);
      }

      ctx.fillStyle = "#fff6c0";
      for (const l of this.lights) {
        ctx.beginPath();
        ctx.arc(l.x, l.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      if (this.phase === "fight") {
        ctx.strokeStyle = "rgba(255, 246, 192, 0.35)";
        ctx.setLineDash([4, 6]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 40);
        ctx.lineTo(this.aim.x, this.aim.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(W / 2 - 110, 8, 220, 12);
      ctx.fillStyle = "#e02040";
      ctx.fillRect(W / 2 - 110, 8, 220 * Math.max(0, b.hp / BOSS_HP), 12);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("DE NACHTMERRIE", W / 2, 34);
      ctx.textAlign = "left";
      ctx.font = "18px Segoe UI, sans-serif";
      ctx.fillText("❤".repeat(Math.max(0, p.hp)), 12, 26);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      if (this.phase !== "fight" && this.phase !== "dissolve") return "";
      return `Nachtmerrie: ${Math.max(0, Math.round((this.boss.hp / BOSS_HP) * 100))}% · Fase ${this.stage() + 1} / ${PHASES.length}`;
    },
  };
})();
