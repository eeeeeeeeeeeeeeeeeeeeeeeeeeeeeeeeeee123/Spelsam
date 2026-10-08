(() => {
  const { W, H } = G;
  const IDS = ["drank", "drugs", "gokken"];
  const CONFIRM_MS = 1600;

  function drawRoom(ctx, t) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#2a2440");
    g.addColorStop(1, "#1a1528");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // neon floor glow
    ctx.fillStyle = "rgba(120, 80, 200, 0.12)";
    ctx.fillRect(0, H - 90, W, 90);
    G.drawFloaters(ctx, t, "rgba(180, 140, 255, 0.08)", 14, -6);
  }

  function drawVice(ctx, id, x, y, sel, t) {
    const a = G.ADDICTIONS[id];
    const pulse = sel ? 1 + Math.sin(t * 6) * 0.08 : 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pulse, pulse);
    // glow disc
    const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 52);
    glow.addColorStop(0, a.color);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = sel ? 0.55 : 0.28;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();

    ctx.font = "44px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(a.emoji, x, y);
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = sel ? a.color : "rgba(255,255,255,0.7)";
    ctx.font = "bold 16px Segoe UI, Roboto, sans-serif";
    ctx.fillText(a.label, x, y + 58);
  }

  G.c3level1 = {
    title: "Level 1 — De eerste keer (11 jaar)",
    intro:
      "Als tiener kom je in verleiding. <strong>Kies je verslaving</strong> voor dit hoofdstuk.<br>" +
      "Kies met <strong>← →</strong> en bevestig met <strong>SPATIE</strong>, of tik op een icoon.<br>" +
      "Je verslaving komt aan het eind als eindbaas terug.",

    drawBackground(ctx, t) {
      drawRoom(ctx, t);
      G.drawKid(ctx, W / 2, H - 70, 1.1, G.playerKidLook(), { t });
    },

    start(api) {
      this.api = api;
      this.choice = G.makeChoice(IDS.map((id) => G.ADDICTIONS[id].label));
      this.phase = "choose";
      this.timer = 0;
      this.xs = [W / 2 - 150, W / 2, W / 2 + 150];
      this.iconY = 150;
    },

    onDirection(dx) {
      if (this.phase === "choose") this.choice.onDirection(dx);
    },

    onAction() {
      if (this.phase === "choose") this.pick(this.choice.selected);
    },

    onPointer(x, y) {
      if (this.phase !== "choose") return;
      for (let i = 0; i < 3; i++) {
        if (Math.hypot(x - this.xs[i], y - this.iconY) < 55) {
          this.choice.selected = i;
          this.pick(i);
          return;
        }
      }
      const i = this.choice.hit(x, y);
      if (i >= 0) this.pick(i);
    },

    pick(i) {
      this.picked = IDS[i];
      G.setAddiction(this.picked);
      this.phase = "confirm";
      this.timer = CONFIRM_MS;
    },

    update(dt) {
      if (this.phase !== "confirm") return;
      this.timer -= dt;
      if (this.timer <= 0) this.api.complete();
    },

    render(ctx, t) {
      drawRoom(ctx, t);
      const selId = IDS[this.choice.selected];
      for (let i = 0; i < 3; i++) {
        drawVice(ctx, IDS[i], this.xs[i], this.iconY, this.phase === "choose" ? i === this.choice.selected : IDS[i] === this.picked, t);
      }
      G.drawKid(ctx, W / 2, H - 70, 1.1, G.playerKidLook(), { t, angry: this.phase === "confirm" });

      if (this.phase === "choose") {
        this.choice.draw(ctx, t);
        ctx.fillStyle = G.ADDICTIONS[selId].color;
        ctx.font = "bold 18px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(G.ADDICTIONS[selId].label, W / 2, 250);
      } else {
        G.drawBanner(ctx, `Je kiest: ${G.ADDICTIONS[this.picked].label}`, G.ADDICTIONS[this.picked].color, H - 40);
      }
    },

    hud() {
      return this.phase === "choose" ? "Kies je verslaving" : "";
    },
  };
})();
