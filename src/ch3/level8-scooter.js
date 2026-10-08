(() => {
  const { W, H } = G;
  const ROAD = { x: 70, w: W - 140 };
  const SCROLL = 150;
  const PLAYER_SPEED = 170;
  const SURVIVE_MS = 60000;
  const SHOT_COOLDOWN = 300;
  const BULLET_SPEED = 600;
  const OBST_MS = 1400;
  const POLICE_MS = 5000;
  const POLICE_SPEED = 70;
  const TIRE_HP = 3;
  const CATCH_RANGE = 90;
  const CATCH_RATE = 26;
  const CATCH_DRAIN = 20;

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function drawCar(ctx, x, y, color, police, t) {
    ctx.fillStyle = color;
    ctx.fillRect(x - 15, y - 24, 30, 48);
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillRect(x - 11, y - 16, 22, 12);
    ctx.fillStyle = "#222";
    ctx.fillRect(x - 17, y - 20, 4, 10);
    ctx.fillRect(x + 13, y - 20, 4, 10);
    ctx.fillRect(x - 17, y + 10, 4, 10);
    ctx.fillRect(x + 13, y + 10, 4, 10);
    if (police) {
      const on = Math.floor((t || 0) * 8) % 2 === 0;
      ctx.fillStyle = on ? "#ff3030" : "#3060ff";
      ctx.fillRect(x - 9, y - 26, 8, 5);
      ctx.fillStyle = on ? "#3060ff" : "#ff3030";
      ctx.fillRect(x + 1, y - 26, 8, 5);
    }
  }

  G.c3level8 = {
    title: "Level 8 — Politieachtervolging (18 jaar)",
    intro:
      "Na een avondje uit zit de politie achter je aan op de scooter.<br>" +
      "Stuur met de <strong>pijltjes / WASD</strong> en ontwijk auto's.<br>" +
      "Schiet op de <strong>banden</strong> van de politieauto's: mik met de <strong>muis</strong>, schiet met <strong>klik</strong> of <strong>SPATIE</strong>. Ze tollen weg. Ontkom <strong>60 seconden</strong>!",

    drawBackground(ctx, t) {
      this.drawRoad(ctx, 0);
    },

    drawRoad(ctx, scroll) {
      ctx.fillStyle = "#2a2a2a";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#3a5a3a";
      ctx.fillRect(0, 0, ROAD.x, H);
      ctx.fillStyle = "#3a5a3a";
      ctx.fillRect(ROAD.x + ROAD.w, 0, W - ROAD.x - ROAD.w, H);
      ctx.fillStyle = "#555";
      ctx.fillRect(ROAD.x - 4, 0, 4, H);
      ctx.fillRect(ROAD.x + ROAD.w, 0, 4, H);
      ctx.fillStyle = "#e8d060";
      const off = (scroll || 0) % 60;
      for (let i = -1; i < H / 60 + 1; i++) {
        ctx.fillRect(W / 2 - 3, i * 60 + off, 6, 32);
      }
    },

    start(api) {
      this.api = api;
      this.player = { x: W / 2, y: H - 70 };
      this.aim = { x: W / 2, y: 120 };
      this.cooldown = 0;
      this.bullets = [];
      this.obstacles = [];
      this.police = [];
      this.scroll = 0;
      this.time = SURVIVE_MS;
      this.obstTimer = 1000;
      this.policeTimer = 2500;
      this.catch = 0;
      this.flash = 0;
      this.crash = 0;
      this.popups = [];
      this.over = false;
    },

    popup(text, x, y, color) { this.popups.push({ text, x, y, color, life: 700 }); },

    doShoot() {
      if (this.over || this.cooldown > 0) return;
      this.cooldown = SHOT_COOLDOWN;
      const p = this.player;
      const d = dist(p, this.aim) || 1;
      this.bullets.push({ x: p.x, y: p.y - 20, vx: ((this.aim.x - p.x) / d) * BULLET_SPEED, vy: ((this.aim.y - (p.y - 20)) / d) * BULLET_SPEED });
    },

    onAction() { this.doShoot(); },
    onPointer(x, y) { this.aim = { x, y }; this.doShoot(); },
    onPointerMove(x, y) { this.aim = { x, y }; },

    update(dt, t) {
      if (this.over) return;
      const s = dt / 1000;
      this.cooldown = Math.max(0, this.cooldown - dt);
      this.flash = Math.max(0, this.flash - dt);
      this.crash = Math.max(0, this.crash - dt);
      this.popups = G.updatePopups(this.popups, dt);
      if (G.held.action) this.doShoot();
      this.scroll += SCROLL * s;

      this.time -= dt;
      if (this.time <= 0) { this.over = true; this.api.complete(); return; }

      // player move
      const p = this.player;
      const slow = this.crash > 0 ? 0.3 : 1;
      const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
      const my = (G.held.down ? 1 : 0) - (G.held.up ? 1 : 0);
      p.x = G.clamp(p.x + mx * PLAYER_SPEED * slow * s, ROAD.x + 16, ROAD.x + ROAD.w - 16);
      p.y = G.clamp(p.y + my * PLAYER_SPEED * slow * s, 120, H - 30);

      // spawn obstacles
      this.obstTimer -= dt;
      if (this.obstTimer <= 0) {
        this.obstTimer = OBST_MS - Math.min(700, this.scroll * 0.02) + Math.random() * 500;
        this.obstacles.push({ x: ROAD.x + 20 + Math.random() * (ROAD.w - 40), y: -30, col: G.pick(["#5080c0", "#c0a050", "#50a060", "#9050a0"]) });
      }
      for (const o of this.obstacles) {
        o.y += SCROLL * s;
        if (!o.hit && dist(o, p) < 30) { o.hit = true; this.crash = 600; this.flash = 300; this.catch = Math.min(100, this.catch + 18); this.popup("CRASH!", p.x, p.y - 30, "#ff6b6b"); }
      }
      this.obstacles = this.obstacles.filter((o) => o.y < H + 40);

      // spawn police
      this.policeTimer -= dt;
      if (this.policeTimer <= 0 && this.police.length < 2) {
        this.policeTimer = POLICE_MS;
        this.police.push({ x: ROAD.x + 30 + Math.random() * (ROAD.w - 60), y: H + 30, tire: TIRE_HP, spin: 0 });
      }
      let chasing = false;
      for (const c of this.police) {
        if (c.spin > 0) { c.spin -= dt; c.y += SCROLL * 1.5 * s; c.x += c.spinVx * s; continue; }
        // drive up toward player
        const dx = p.x - c.x;
        c.x += Math.sign(dx) * Math.min(Math.abs(dx), POLICE_SPEED * s);
        if (c.y > p.y + 40) c.y -= (POLICE_SPEED * 0.7) * s;
        else c.y += (SCROLL * 0.02) * s;
        if (dist(c, p) < CATCH_RANGE) chasing = true;
      }
      this.police = this.police.filter((c) => c.y < H + 60 && !(c.spin > 0 && c.y > H + 40));

      this.catch += (chasing ? CATCH_RATE : -CATCH_DRAIN) * s;
      this.catch = G.clamp(this.catch, 0, 100);
      if (this.catch >= 100) { this.over = true; this.api.fail("De politie heeft je klemgereden!"); return; }

      // bullets
      for (const b of this.bullets) {
        b.x += b.vx * s; b.y += b.vy * s;
        if (b.y < -10 || b.x < -10 || b.x > W + 10 || b.y > H + 10) { b.done = true; continue; }
        for (const c of this.police) {
          if (c.spin > 0) continue;
          if (dist(b, { x: c.x, y: c.y + 16 }) < 20) { b.done = true; c.tire--; this.popup("", c.x, c.y, "#fff"); if (c.tire <= 0) { c.spin = 1200; c.spinVx = (Math.random() < 0.5 ? -1 : 1) * 160; this.popup("WEG!", c.x, c.y - 20, "#6ee07a"); this.catch = Math.max(0, this.catch - 15); } break; }
        }
      }
      this.bullets = this.bullets.filter((b) => !b.done);
    },

    render(ctx, t) {
      this.drawRoad(ctx, this.scroll);
      for (const o of this.obstacles) drawCar(ctx, o.x, o.y, o.col, false, t);
      for (const c of this.police) {
        ctx.save();
        if (c.spin > 0) { ctx.translate(c.x, c.y); ctx.rotate((1200 - c.spin) * 0.02); ctx.translate(-c.x, -c.y); }
        drawCar(ctx, c.x, c.y, "#e8e8e8", true, t);
        ctx.restore();
        if (c.spin <= 0) {
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(c.x - 15, c.y - 34, 30, 4);
          ctx.fillStyle = "#ffd24a";
          ctx.fillRect(c.x - 15, c.y - 34, 30 * (c.tire / TIRE_HP), 4);
        }
      }

      // scooter
      const p = this.player;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.fillStyle = "#d03030";
      ctx.fillRect(-9, -16, 18, 32);
      ctx.fillStyle = "#222";
      ctx.fillRect(-9, -20, 18, 6);
      ctx.fillRect(-9, 14, 18, 6);
      ctx.restore();
      G.drawKid(ctx, p.x, p.y + 6, 0.5, G.playerKidLook(), { t, armAngle: -0.3 });

      for (const b of this.bullets) { ctx.fillStyle = "#ffe066"; ctx.fillRect(b.x - 2, b.y - 2, 4, 4); }

      // crosshair
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.aim.x, this.aim.y, 8, 0, Math.PI * 2);
      ctx.stroke();

      if (this.flash > 0) { ctx.fillStyle = `rgba(200,40,40,${0.25 * (this.flash / 300)})`; ctx.fillRect(0, 0, W, H); }

      // HUD: catch meter + timer
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(16, 16, 150, 12);
      ctx.fillStyle = this.catch > 70 ? "#ff5050" : "#ffd24a";
      ctx.fillRect(16, 16, 150 * (this.catch / 100), 12);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("GEPAKT", 20, 26);
      ctx.textAlign = "right";
      ctx.font = "bold 15px Segoe UI, Roboto, sans-serif";
      ctx.fillText(`${Math.ceil(this.time / 1000)}s`, W - 16, 28);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return `Ontkom · nog ${Math.ceil(this.time / 1000)}s`;
    },
  };
})();
