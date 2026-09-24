(() => {
  const { CELL, COLS, ROWS, W, H } = G;
  const WORLD = 50;
  const TIME_MS = 45000;
  const CURRENT_MS = 500;
  const GRACE_MS = 1000;
  const CALM_MS = 2500;
  const SCENTS = 5;
  const MIN_X = 1;
  const MAX_X = COLS - 2;

  function drawWalls(ctx, t) {
    ctx.fillStyle = "#8f3a66";
    ctx.fillRect(0, 0, CELL, H);
    ctx.fillRect(W - CELL, 0, CELL, H);
    // cilia waving along both walls
    ctx.strokeStyle = "rgba(255, 200, 225, 0.7)";
    ctx.lineWidth = 2;
    for (let y = 6; y < H; y += 9) {
      const sway = Math.sin(t * 6 + y * 0.15) * 6;
      ctx.beginPath();
      ctx.moveTo(CELL, y);
      ctx.lineTo(CELL + 10, y + 6 + sway * 0.3);
      ctx.moveTo(W - CELL, y);
      ctx.lineTo(W - CELL - 10, y + 6 + sway * 0.3);
      ctx.stroke();
    }
  }

  function drawFlow(ctx, t) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 22; i++) {
      const x = CELL + ((i * 83) % (W - 2 * CELL));
      const y = ((i * 131) % H + t * 60) % H;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 12);
      ctx.lineTo(x - 4, y + 7);
      ctx.moveTo(x, y + 12);
      ctx.lineTo(x + 4, y + 7);
      ctx.stroke();
    }
  }

  function drawBackground(ctx, t) {
    G.fillBackdrop(ctx, "#5b2a5e", "#3c1a42");
    drawFlow(ctx, t);
    drawWalls(ctx, t);
  }

  G.level5 = {
    title: "Level 5 — De eileider",
    intro:
      "<strong>Trilhaartjes</strong> duwen je steeds terug. Tik telkens op <strong>↑</strong> om tegen de stroom in te zwemmen " +
      "(ingedrukt houden werkt niet!).<br>Ontwijk <strong>slijmklontjes</strong> en pak <strong>roze geurwolkjes</strong> van de eicel: " +
      `die zetten de stroom even stil. Haal de top binnen <strong>${TIME_MS / 1000} seconden</strong>.`,

    drawBackground,

    start(api) {
      this.api = api;
      this.player = { x: Math.floor(COLS / 2), y: WORLD - 3 };
      this.facing = -Math.PI / 2;
      this.elapsed = 0;
      this.currentTimer = GRACE_MS;
      this.calmLeft = 0;
      this.buildWorld();
    },

    buildWorld() {
      this.clumps = new Set();
      for (let row = 3; row < WORLD - 6; row += 3 + G.randInt(2)) {
        const w = 2 + G.randInt(4);
        const x = MIN_X + G.randInt(MAX_X - MIN_X - w + 2);
        for (let i = 0; i < w; i++) this.clumps.add(`${x + i},${row}`);
      }
      this.scents = [];
      while (this.scents.length < SCENTS) {
        const s = { x: MIN_X + G.randInt(MAX_X - MIN_X + 1), y: 4 + G.randInt(WORLD - 12) };
        if (!this.clumps.has(`${s.x},${s.y}`)) this.scents.push(s);
      }
    },

    blocked(x, y) {
      return x < MIN_X || x > MAX_X || this.clumps.has(`${x},${y}`);
    },

    onDirection(dx, dy, repeat) {
      if (repeat) return;
      const nx = this.player.x + dx;
      const ny = Math.min(WORLD - 1, this.player.y + dy);
      this.facing = Math.atan2(dy, dx);
      if (this.blocked(nx, ny)) return;
      this.player.x = nx;
      this.player.y = ny;
      this.collect();
      if (this.player.y <= 0) this.api.complete();
    },

    collect() {
      const i = this.scents.findIndex((s) => s.x === this.player.x && s.y === this.player.y);
      if (i >= 0) {
        this.scents.splice(i, 1);
        this.calmLeft = CALM_MS;
      }
    },

    update(dt) {
      this.elapsed += dt;
      if (this.elapsed >= TIME_MS) {
        this.api.fail("Te laat! De eicel is al verder gedreven.");
        return;
      }
      if (this.calmLeft > 0) {
        this.calmLeft -= dt;
        return;
      }
      this.currentTimer -= dt;
      if (this.currentTimer > 0) return;
      this.currentTimer = CURRENT_MS;
      const ny = this.player.y + 1;
      if (this.clumps.has(`${this.player.x},${ny}`)) return;
      if (ny >= WORLD) {
        this.api.fail("De stroom duwde je terug de baarmoeder in!");
        return;
      }
      this.player.y = ny;
      this.collect();
    },

    camTop() {
      return G.clamp(this.player.y - 9, 0, WORLD - ROWS);
    },

    render(ctx, t) {
      G.fillBackdrop(ctx, "#5b2a5e", "#3c1a42");
      if (this.calmLeft <= 0) drawFlow(ctx, t);
      const cam = this.camTop();

      if (cam < 2) {
        const glow = ctx.createLinearGradient(0, -cam * CELL, 0, (2 - cam) * CELL + CELL);
        glow.addColorStop(0, "rgba(255, 190, 230, 0.7)");
        glow.addColorStop(1, "rgba(255, 190, 230, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, W, (3 - cam) * CELL);
      }

      for (const key of this.clumps) {
        const [x, y] = key.split(",").map(Number);
        if (y < cam - 1 || y > cam + ROWS) continue;
        const sy = (y - cam) * CELL;
        ctx.fillStyle = "rgba(200, 225, 170, 0.75)";
        ctx.beginPath();
        ctx.ellipse(x * CELL + CELL / 2, sy + CELL / 2, CELL * 0.58, CELL * 0.42, Math.sin(x + y) * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const s of this.scents) {
        if (s.y < cam - 1 || s.y > cam + ROWS) continue;
        const cx = s.x * CELL + CELL / 2;
        const cy = (s.y - cam) * CELL + CELL / 2;
        const r = CELL * (0.4 + Math.sin(t * 4 + s.x) * 0.06);
        const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
        g.addColorStop(0, "rgba(255, 150, 210, 0.95)");
        g.addColorStop(1, "rgba(255, 150, 210, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }

      drawWalls(ctx, t);

      const px = this.player.x * CELL + CELL / 2;
      const py = (this.player.y - cam) * CELL + CELL / 2;
      G.drawSperm(ctx, G.freeSpermPoints(px, py, this.facing, 5, 6), this.facing, 9, t);

      const pct = 1 - this.player.y / (WORLD - 1);
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(W - 8, 10, 4, H - 20);
      ctx.fillStyle = "#ffb3dc";
      ctx.fillRect(W - 8, 10 + (H - 20) * (1 - pct), 4, (H - 20) * pct);

      if (this.calmLeft > 0) {
        ctx.fillStyle = "rgba(255, 190, 230, 0.9)";
        ctx.font = "bold 16px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Stroom staat stil!", W / 2, 24);
      }
    },

    hud() {
      const pct = Math.round((1 - this.player.y / (WORLD - 1)) * 100);
      const left = Math.max(0, (TIME_MS - this.elapsed) / 1000);
      return `Afstand: ${pct}% · Tijd: ${left.toFixed(0)}s`;
    },
  };
})();
