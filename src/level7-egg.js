(() => {
  const { W, H } = G;
  const CX = W / 2;
  const CY = H / 2;
  const ZONA_R = 95;
  const CORONA_R = 114;
  const CORONA_CELLS = 18;
  const ORBIT_R = 152;
  const LAYER_PRESSES = 25;
  const TOTAL_PRESSES = LAYER_PRESSES * 2;
  const SPAWN_MS = 900;
  const RIVAL_SPEED = 70;
  const SPAWN_DIST = 330;
  const TURN_STEP = 0.14;
  const HIT_DIST = 17;
  const FINISH_MS = 1600;

  function drawEgg(ctx, t, presses, glow) {
    const outer = ctx.createRadialGradient(CX, CY, 10, CX, CY, CORONA_R + 30);
    outer.addColorStop(0, "rgba(255, 220, 180, 0.25)");
    outer.addColorStop(1, "rgba(255, 220, 180, 0)");
    ctx.fillStyle = outer;
    ctx.beginPath();
    ctx.arc(CX, CY, CORONA_R + 30, 0, Math.PI * 2);
    ctx.fill();

    const coronaLeft = Math.round(CORONA_CELLS * (1 - Math.min(presses, LAYER_PRESSES) / LAYER_PRESSES));
    for (let i = 0; i < coronaLeft; i++) {
      const a = (i / CORONA_CELLS) * Math.PI * 2 + t * 0.1;
      ctx.fillStyle = "rgba(255, 214, 150, 0.85)";
      ctx.beginPath();
      ctx.arc(CX + Math.cos(a) * CORONA_R, CY + Math.sin(a) * CORONA_R, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    const body = ctx.createRadialGradient(CX - 25, CY - 25, 10, CX, CY, ZONA_R);
    body.addColorStop(0, "#fff6e0");
    body.addColorStop(0.6, "#ffd98a");
    body.addColorStop(1, "#f5b25a");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(CX, CY, ZONA_R, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = glow ? `rgba(255, 230, 120, ${0.6 + Math.sin(t * 12) * 0.4})` : "rgba(255, 245, 220, 0.9)";
    ctx.lineWidth = glow ? 8 : 5;
    ctx.beginPath();
    ctx.arc(CX, CY, ZONA_R, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "rgba(200, 140, 90, 0.5)";
    ctx.beginPath();
    ctx.arc(CX + 12, CY + 8, 22, 0, Math.PI * 2);
    ctx.fill();

    const cracks = Math.max(0, presses - LAYER_PRESSES);
    ctx.strokeStyle = "rgba(140, 80, 40, 0.7)";
    ctx.lineWidth = 2;
    for (let i = 0; i < cracks; i++) {
      const a = i * 2.39996;
      const r1 = ZONA_R - 2;
      const r2 = ZONA_R - 10 - (i % 3) * 5;
      ctx.beginPath();
      ctx.moveTo(CX + Math.cos(a) * r1, CY + Math.sin(a) * r1);
      ctx.lineTo(CX + Math.cos(a + 0.05) * r2, CY + Math.sin(a + 0.05) * r2);
      ctx.stroke();
    }
  }

  function drawBackground(ctx, t) {
    G.fillBackdrop(ctx, "#3d1a45", "#241029");
    G.drawFloaters(ctx, t, "rgba(255, 210, 240, 0.07)", 12, 5);
  }

  G.level7 = {
    title: "Level 7 — De eicel",
    intro:
      "Je bent bij de <strong>eicel</strong>! Druk op <strong>SPATIE</strong> om door de 2 lagen te breken: " +
      "eerst de <strong>corona radiata</strong>, dan de <strong>zona pellucida</strong>.<br>" +
      "Andere zaadcellen komen van alle kanten: ontwijk ze door rond de eicel te zwemmen met <strong>← →</strong>.",

    drawBackground(ctx, t) {
      drawBackground(ctx, t);
      drawEgg(ctx, t, 0, false);
    },

    start(api) {
      this.api = api;
      this.angle = Math.PI / 2;
      this.presses = 0;
      this.rivals = [];
      this.spawnTimer = SPAWN_MS;
      this.finishing = 0;
    },

    playerPos() {
      const k = this.finishing > 0 ? 1 - this.finishing / FINISH_MS : 0;
      const r = ORBIT_R - (ORBIT_R - 20) * k;
      return { x: CX + Math.cos(this.angle) * r, y: CY + Math.sin(this.angle) * r };
    },

    onDirection(dx) {
      if (this.finishing > 0 || dx === 0) return;
      this.angle += dx * TURN_STEP;
    },

    onAction() {
      if (this.finishing > 0) return;
      this.presses++;
      if (this.presses >= TOTAL_PRESSES) {
        this.finishing = FINISH_MS;
        for (const r of this.rivals) r.bounce = true;
      }
    },

    spawnRival() {
      const aimed = Math.random() < 0.5;
      const a = aimed ? this.angle + (Math.random() - 0.5) * 0.9 : Math.random() * Math.PI * 2;
      this.rivals.push({ a, dist: SPAWN_DIST, bounce: false });
    },

    update(dt) {
      if (this.finishing > 0) {
        this.finishing -= dt;
        for (const r of this.rivals) r.dist += (RIVAL_SPEED * 2 * dt) / 1000;
        if (this.finishing <= 0) this.api.complete();
        return;
      }

      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnRival();
        this.spawnTimer = SPAWN_MS;
      }

      const p = this.playerPos();
      for (const r of this.rivals) {
        r.dist -= (RIVAL_SPEED * dt) / 1000;
        const rx = CX + Math.cos(r.a) * r.dist;
        const ry = CY + Math.sin(r.a) * r.dist;
        if (Math.hypot(rx - p.x, ry - p.y) < HIT_DIST) {
          this.api.fail("Een andere zaadcel ramde je weg!");
          return;
        }
      }
      this.rivals = this.rivals.filter((r) => r.dist > CORONA_R + 8);
    },

    render(ctx, t) {
      drawBackground(ctx, t);
      drawEgg(ctx, t, this.presses, this.finishing > 0);

      for (const r of this.rivals) {
        const x = CX + Math.cos(r.a) * r.dist;
        const y = CY + Math.sin(r.a) * r.dist;
        const facing = r.bounce ? r.a : r.a + Math.PI;
        G.drawSperm(ctx, G.freeSpermPoints(x, y, facing, 4, 5), facing, 7, t, G.RIVAL_PALETTE, 2);
      }

      const p = this.playerPos();
      const facing = this.angle + Math.PI;
      G.drawSperm(ctx, G.freeSpermPoints(p.x, p.y, facing, 5, 6), facing, 10, t);

      const layer = this.presses < LAYER_PRESSES ? "Laag 1: corona radiata" : "Laag 2: zona pellucida";
      const layerPresses = this.presses < LAYER_PRESSES ? this.presses : this.presses - LAYER_PRESSES;
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "bold 15px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(this.finishing > 0 ? "Binnen! De schil verhardt..." : layer, 12, 24);
      if (this.finishing <= 0) {
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.fillRect(12, 32, 160, 6);
        ctx.fillStyle = "#ffd873";
        ctx.fillRect(12, 32, 160 * Math.min(1, layerPresses / LAYER_PRESSES), 6);
      }
    },

    hud() {
      return `Binnendringen: ${Math.round((Math.min(this.presses, TOTAL_PRESSES) / TOTAL_PRESSES) * 100)}%`;
    },
  };
})();
