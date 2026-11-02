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
  const CATCH_RANGE = 110;
  const CATCH_RATE = 48;
  const CATCH_DRAIN = 14;
  const WEAVE = 95;
  const BLOCK_MS = 5200;
  const BLOCK_GAP = 78;

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

  G.CAREER_LEVELS.spion[9] = {
    title: "Level 9 — Vlucht door Pyongyang (29 jaar)",
    intro:
      "Met het document op zak scheur je op een gestolen <strong>motor</strong> door Pyongyang, op weg naar de haven.<br>" +
      "Stuur met de <strong>pijltjes / WASD</strong>, ontwijk auto's en rij door het <strong>gat</strong> in de <strong>wegversperringen</strong>.<br>" +
      "Schiet op de <strong>banden</strong> van de politie: mik met de <strong>muis</strong>, schiet met <strong>klik</strong> of <strong>SPATIE</strong>. Haal de haven: <strong>60 seconden</strong>!",

    drawBackground(ctx, t) {
      this.drawRoad(ctx, 0);
    },

    drawRoad(ctx, scroll) {
      ctx.fillStyle = "#2a2a2a";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#8a8a84";
      ctx.fillRect(0, 0, ROAD.x, H);
      ctx.fillRect(ROAD.x + ROAD.w, 0, W - ROAD.x - ROAD.w, H);
      // grey apartment blocks along the boulevard
      const off2 = (scroll || 0) % 120;
      for (let y = -120 + off2; y < H; y += 120) {
        ctx.fillStyle = "#b8b4a8";
        ctx.fillRect(4, y, ROAD.x - 14, 96);
        ctx.fillRect(ROAD.x + ROAD.w + 10, y + 30, W - ROAD.x - ROAD.w - 14, 96);
        ctx.fillStyle = "#6a6a70";
        for (let k = 0; k < 4; k++) {
          ctx.fillRect(12, y + 8 + k * 22, 12, 10);
          ctx.fillRect(ROAD.x + ROAD.w + 20, y + 38 + k * 22, 12, 10);
        }
      }
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
      this.blocks = [];
      this.blockTimer = 3500;
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
        if (!o.hit && dist(o, p) < 24) { o.hit = true; this.crash = 600; this.flash = 300; this.catch = Math.min(100, this.catch + 18); this.popup("CRASH!", p.x, p.y - 30, "#ff6b6b"); }
      }
      this.obstacles = this.obstacles.filter((o) => o.y < H + 40);

      // roadblocks with one gap
      this.blockTimer -= dt;
      if (this.blockTimer <= 0) {
        this.blockTimer = BLOCK_MS + Math.random() * 1500;
        this.blocks.push({ y: -20, gap: ROAD.x + 20 + Math.random() * (ROAD.w - 40 - BLOCK_GAP), hit: false });
        this.obstacles = this.obstacles.filter((o) => o.y > 60);
      }
      for (const b of this.blocks) {
        b.y += SCROLL * s;
        if (!b.hit && Math.abs(b.y - p.y) < 14 && (p.x < b.gap + 10 || p.x > b.gap + BLOCK_GAP - 10)) {
          b.hit = true;
          this.crash = 900;
          this.flash = 400;
          this.catch = Math.min(100, this.catch + 30);
          this.popup("WEGVERSPERRING!", p.x, p.y - 30, "#ff6b6b");
        }
      }
      this.blocks = this.blocks.filter((b) => b.y < H + 30);

      // spawn police
      this.policeTimer -= dt;
      if (this.policeTimer <= 0 && this.police.length < 2) {
        this.policeTimer = POLICE_MS;
        this.police.push({ x: ROAD.x + 30 + Math.random() * (ROAD.w - 60), y: H + 30, tire: TIRE_HP, spin: 0, seed: Math.random() * 10, freq: 1.4 + Math.random() * 0.8 });
      }
      let chasing = false;
      for (const c of this.police) {
        if (c.spin > 0) { c.spin -= dt; c.y += SCROLL * 1.5 * s; c.x += c.spinVx * s; continue; }
        // weave criss-cross behind you instead of sitting straight on your tail
        const wt = this.scroll / SCROLL;
        let tx = p.x + Math.sin(wt * c.freq + c.seed) * WEAVE;
        const ty = p.y + 55 + Math.sin(wt * c.freq * 0.7 + c.seed * 2) * 30;
        // steer well clear of traffic ahead
        const ahead = this.obstacles.find((o) => !o.hit && o.y < c.y + 20 && c.y - o.y < 170 && Math.abs(o.x - c.x) < 46);
        const block = this.blocks.find((b) => b.y < c.y + 30 && c.y - b.y < 200);
        if (block) tx = block.gap + BLOCK_GAP / 2;
        else if (ahead) {
          const goRight = c.x >= ahead.x ? ahead.x + 60 < ROAD.x + ROAD.w - 16 : ahead.x - 60 < ROAD.x + 16;
          tx = ahead.x + (goRight ? 62 : -62);
        }
        const dx = tx - c.x;
        c.x += Math.sign(dx) * Math.min(Math.abs(dx), POLICE_SPEED * (ahead || block ? 2.6 : 1.5) * s);
        c.x = G.clamp(c.x, ROAD.x + 16, ROAD.x + ROAD.w - 16);
        // last resort: slide past a car instead of crashing into it
        for (const o of this.obstacles) {
          if (o.hit || Math.abs(o.y - c.y) > 46 || Math.abs(o.x - c.x) > 32) continue;
          c.x = G.clamp(c.x + (c.x >= o.x ? 1 : -1) * 32, ROAD.x + 16, ROAD.x + ROAD.w - 16);
        }
        const dy = G.clamp(ty, 140, H - 10) - c.y;
        c.y += Math.sign(dy) * Math.min(Math.abs(dy), POLICE_SPEED * 0.9 * s);
        if (dist(c, p) < CATCH_RANGE) chasing = true;
      }
      this.police = this.police.filter((c) => c.y < H + 60 && !(c.spin > 0 && c.y > H + 40));

      this.catch += (chasing ? CATCH_RATE : -CATCH_DRAIN) * s;
      this.catch = G.clamp(this.catch, 0, 100);
      if (this.catch >= 100) { this.over = true; this.api.fail("De politie heeft je klemgereden. Het document is weg!"); return; }

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
      for (const b of this.blocks) {
        for (let x = ROAD.x; x < ROAD.x + ROAD.w; x += 20) {
          if (x + 20 > b.gap && x < b.gap + BLOCK_GAP) continue;
          ctx.fillStyle = (x / 20) % 2 ? "#c02020" : "#f0f0f0";
          ctx.fillRect(x, b.y - 6, 20, 12);
        }
        ctx.fillStyle = "#6ee07a";
        ctx.font = "bold 10px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        if (b.y < H - 40) ctx.fillText("GAT", b.gap + BLOCK_GAP / 2, b.y + 4);
      }
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
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(-7, -18, 14, 36);
      ctx.fillStyle = "#222";
      ctx.fillRect(-9, -20, 18, 6);
      ctx.fillRect(-9, 14, 18, 6);
      ctx.restore();
      G.drawKid(ctx, p.x, p.y + 6, 0.4, G.spyLook(), { adult: true, t, armAngle: -0.3 });
      G.drawShades(ctx, p.x, p.y + 6, 0.4);

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
      return `Naar de haven · nog ${Math.ceil(this.time / 1000)}s`;
    },
  };
})();
