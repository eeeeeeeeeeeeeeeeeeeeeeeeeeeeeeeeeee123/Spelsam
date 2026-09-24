(() => {
  const { W, H } = G;
  const TARGET = 40;
  const TIME_MS = 10000;
  const CHANNEL_W = 150;
  const STRANDS = 9;

  function drawChannel(ctx, t) {
    G.fillBackdrop(ctx, "#6b2445", "#4a1733");
    const left = W / 2 - CHANNEL_W / 2;

    ctx.fillStyle = "#8a3358";
    ctx.fillRect(0, 0, left, H);
    ctx.fillRect(left + CHANNEL_W, 0, W - left - CHANNEL_W, H);

    // soft wavy channel walls
    ctx.strokeStyle = "rgba(255, 170, 200, 0.35)";
    ctx.lineWidth = 3;
    for (const side of [left, left + CHANNEL_W]) {
      ctx.beginPath();
      for (let y = 0; y <= H; y += 10) {
        const x = side + Math.sin(y * 0.05 + t * 1.5) * 4;
        if (y === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(240, 220, 235, 0.08)";
    ctx.fillRect(left, 0, CHANNEL_W, H);
  }

  function spermY(progress) {
    return H - 50 - (H - 110) * progress;
  }

  G.level2 = {
    title: "Level 2 — De baarmoederhals",
    intro:
      "Een dikke laag <strong>slijm</strong> blokkeert de weg.<br>" +
      `Druk zo snel mogelijk op <strong>SPATIE</strong>: <strong>${TARGET} keer binnen ${TIME_MS / 1000} seconden</strong>.<br>` +
      "De tijd start bij je eerste druk.",

    drawBackground(ctx, t) {
      drawChannel(ctx, t);
      this.drawStrands(ctx, t, 0);
    },

    start(api) {
      this.api = api;
      this.presses = 0;
      this.elapsed = 0;
      this.running = false;
      this.shownProgress = 0;
    },

    onAction() {
      if (!this.running) this.running = true;
      this.presses++;
      if (this.presses >= TARGET) this.api.complete();
    },

    update(dt) {
      this.shownProgress += (this.presses / TARGET - this.shownProgress) * Math.min(1, dt / 80);
      if (!this.running) return;
      this.elapsed += dt;
      if (this.elapsed >= TIME_MS) this.api.fail("Te langzaam! Het slijm hield je tegen.");
    },

    drawStrands(ctx, t, progress) {
      const left = W / 2 - CHANNEL_W / 2;
      const sy = spermY(progress);
      for (let i = 0; i < STRANDS; i++) {
        const y = 40 + i * ((H - 120) / (STRANDS - 1));
        const broken = y > sy;
        ctx.strokeStyle = broken ? "rgba(255, 230, 240, 0.12)" : "rgba(255, 230, 240, 0.55)";
        ctx.lineWidth = broken ? 2 : 4;
        ctx.beginPath();
        if (broken) {
          ctx.moveTo(left, y);
          ctx.quadraticCurveTo(left + 25, y + 18, left + 40, y + 6);
          ctx.moveTo(left + CHANNEL_W, y);
          ctx.quadraticCurveTo(left + CHANNEL_W - 25, y + 18, left + CHANNEL_W - 40, y + 6);
        } else {
          ctx.moveTo(left, y);
          ctx.quadraticCurveTo(W / 2, y + Math.sin(t * 2 + i) * 10, left + CHANNEL_W, y);
        }
        ctx.stroke();
      }
    },

    render(ctx, t) {
      drawChannel(ctx, t);
      const p = this.shownProgress;
      this.drawStrands(ctx, t, p);
      const y = spermY(p) + Math.sin(t * 20) * (this.running ? 1.5 : 0);
      const angle = -Math.PI / 2;
      G.drawSperm(ctx, G.freeSpermPoints(W / 2, y, angle, 6, 7), angle, 10, t);

      const left = this.running ? Math.max(0, (TIME_MS - this.elapsed) / 1000) : TIME_MS / 1000;
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "bold 28px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${this.presses} / ${TARGET}`, W * 0.18, H / 2);
      ctx.fillText(`${left.toFixed(1)}s`, W * 0.82, H / 2);
      ctx.font = "13px Segoe UI, Roboto, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillText("spatie", W * 0.18, H / 2 + 22);
      ctx.fillText("tijd over", W * 0.82, H / 2 + 22);
    },

    hud() {
      return `Spatie: ${this.presses} / ${TARGET}`;
    },
  };
})();
