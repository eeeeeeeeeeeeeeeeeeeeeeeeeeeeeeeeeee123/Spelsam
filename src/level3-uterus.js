(() => {
  const { CELL, COLS, ROWS, W } = G;
  const DURATION_MS = 30000;
  const WAVE_MS = 1600;
  const FALL_CELLS_PER_S = 3;
  const GAP = 3;
  const SIZES = [1, 1, 2, 2, 3];

  function drawBackground(ctx, t) {
    G.fillBackdrop(ctx, "#7a2340", "#521632");
    G.drawFloaters(ctx, t, "rgba(255, 180, 200, 0.1)", 16, -10);
    G.drawGrid(ctx, 0.03);
  }

  function drawWbc(ctx, b, t) {
    const r = b.size * CELL * 0.46;
    const cx = (b.x + b.size / 2) * CELL;
    const cy = (b.y + b.size / 2) * CELL;

    ctx.fillStyle = "rgba(245, 245, 255, 0.92)";
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const wob = 1 + Math.sin(a * 5 + t * 3 + b.seed) * 0.06;
      const x = cx + Math.cos(a) * r * wob;
      const y = cy + Math.sin(a) * r * wob;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.fill();

    // lobed nucleus, typical of a neutrophil
    ctx.fillStyle = "rgba(125, 80, 190, 0.8)";
    for (let i = 0; i < 3; i++) {
      const a = b.seed + i * 2.1;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * r * 0.32, cy + Math.sin(a) * r * 0.32, r * 0.26, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  G.level3 = {
    title: "Level 3 — De baarmoeder",
    intro:
      "<strong>Witte bloedcellen</strong> zien je als indringer en komen van boven op je af!<br>" +
      `Ontwijk ze <strong>${DURATION_MS / 1000} seconden</strong> lang. Bewegen met de <strong>pijltjes</strong> of <strong>WASD</strong>.`,

    drawBackground,

    start(api) {
      this.api = api;
      this.player = { x: Math.floor(COLS / 2), y: ROWS - 2 };
      this.facing = -Math.PI / 2;
      this.blobs = [];
      this.elapsed = 0;
      this.waveTimer = 0;
    },

    spawnWave() {
      const gap = G.randInt(COLS - GAP + 1);
      let x = G.randInt(2);
      while (x < COLS) {
        const size = G.pick(SIZES);
        const fits = x + size <= COLS;
        const hitsGap = x < gap + GAP && x + size > gap;
        if (fits && !hitsGap && Math.random() < 0.6) {
          this.blobs.push({ x, y: -size, size, seed: Math.random() * 10 });
          x += size + 1 + G.randInt(2);
        } else {
          x += 1;
        }
      }
    },

    onDirection(dx, dy) {
      this.player.x = G.clamp(this.player.x + dx, 0, COLS - 1);
      this.player.y = G.clamp(this.player.y + dy, 0, ROWS - 1);
      this.facing = Math.atan2(dy, dx);
    },

    update(dt) {
      this.elapsed += dt;
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) {
        this.spawnWave();
        this.waveTimer = WAVE_MS;
      }

      const fall = (FALL_CELLS_PER_S * dt) / 1000;
      for (const b of this.blobs) b.y += fall;
      this.blobs = this.blobs.filter((b) => b.y < ROWS + 1);

      const px = this.player.x + 0.5;
      const py = this.player.y + 0.5;
      for (const b of this.blobs) {
        const bx = b.x + b.size / 2;
        const by = b.y + b.size / 2;
        if (Math.hypot(px - bx, py - by) < b.size * 0.44 + 0.3) {
          this.api.fail("Een witte bloedcel heeft je gepakt!");
          return;
        }
      }

      if (this.elapsed >= DURATION_MS) this.api.complete();
    },

    render(ctx, t) {
      drawBackground(ctx, t);
      for (const b of this.blobs) drawWbc(ctx, b, t);
      const c = G.cellCenter(this.player);
      G.drawSperm(ctx, G.freeSpermPoints(c.x, c.y, this.facing, 5, 6), this.facing, 9, t);

      const pct = Math.min(1, this.elapsed / DURATION_MS);
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(0, 0, W, 5);
      ctx.fillStyle = "#a0ffb4";
      ctx.fillRect(0, 0, W * pct, 5);
    },

    hud() {
      const left = Math.max(0, (DURATION_MS - this.elapsed) / 1000);
      return `Overleven: nog ${left.toFixed(0)}s`;
    },
  };
})();
