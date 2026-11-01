(() => {
  const { W, H } = G;
  const CONFIRM_MS = 1800;

  function drawOffice(ctx, t) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#26303a");
    g.addColorStop(1, "#161c22");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // recruitment posters on the wall
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(40, 40, 80, 100);
    ctx.fillRect(W - 120, 40, 80, 100);
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font = "bold 11px Segoe UI, Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("WE WANT", 80, 80);
    ctx.fillText("YOU", 80, 96);
    ctx.fillText("TOP", W - 80, 80);
    ctx.fillText("SECRET", W - 80, 96);
    // desk
    ctx.fillStyle = "#4a3a2a";
    ctx.fillRect(0, H - 90, W, 90);
  }

  function drawCareer(ctx, id, x, y, sel, t) {
    const c = G.CAREERS[id];
    const pulse = sel ? 1 + Math.sin(t * 6) * 0.08 : 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pulse, pulse);
    const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 60);
    glow.addColorStop(0, c.color);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = sel ? 0.55 : 0.25;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.font = "40px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(c.emoji, x, y);
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = sel ? c.color : "rgba(255,255,255,0.7)";
    ctx.font = "bold 12px Segoe UI, Roboto, sans-serif";
    ctx.fillText(c.short, x, y + 58);
  }

  G.c4level1 = {
    title: "Level 1 — Carrièrekeuze (21 jaar)",
    intro:
      "Je bent 21 en volwassen. Tijd om te kiezen wat je met je leven doet.<br>" +
      "Kies met <strong>← →</strong> en bevestig met <strong>SPATIE</strong>, of tik op een icoon.<br>" +
      "<strong>Elke carrière heeft zijn eigen levels</strong> en een eigen eindbaas. Speel later opnieuw om de andere te zien!",

    drawBackground(ctx, t) {
      drawOffice(ctx, t);
      G.drawKid(ctx, W / 2, H - 60, 1.1, G.playerKidLook(), { adult: true, t });
    },

    start(api) {
      this.api = api;
      this.ids = G.CAREER_IDS;
      this.choice = G.makeChoice(this.ids.map((id) => G.CAREERS[id].short));
      this.choice.selected = Math.max(0, this.ids.findIndex((id) => G.careerReady(id)));
      this.msg = 0;
      this.phase = "choose";
      this.timer = 0;
      const n = this.ids.length;
      this.xs = this.ids.map((_, i) => W / 2 + (i - (n - 1) / 2) * Math.min(210, (W - 60) / n));
      this.iconY = 140;
    },

    onDirection(dx) {
      if (this.phase === "choose") this.choice.onDirection(dx);
    },

    onAction() {
      if (this.phase === "choose") this.pick(this.choice.selected);
    },

    onPointer(x, y) {
      if (this.phase !== "choose") return;
      for (let i = 0; i < this.ids.length; i++) {
        if (Math.hypot(x - this.xs[i], y - this.iconY) < 60) {
          this.choice.selected = i;
          this.pick(i);
          return;
        }
      }
    },

    pick(i) {
      if (!G.careerReady(this.ids[i])) {
        this.msg = 1500;
        return;
      }
      this.picked = this.ids[i];
      G.setCareer(this.picked);
      this.phase = "confirm";
      this.timer = CONFIRM_MS;
    },

    update(dt) {
      this.msg = Math.max(0, this.msg - dt);
      if (this.phase !== "confirm") return;
      this.timer -= dt;
      if (this.timer <= 0) this.api.complete();
    },

    render(ctx, t) {
      drawOffice(ctx, t);
      this.ids.forEach((id, i) => {
        ctx.globalAlpha = G.careerReady(id) ? 1 : 0.35;
        drawCareer(ctx, id, this.xs[i], this.iconY, this.phase === "choose" ? i === this.choice.selected : id === this.picked, t);
        if (!G.careerReady(id)) {
          ctx.fillStyle = "#fff";
          ctx.font = "bold 10px Segoe UI, Roboto, sans-serif";
          ctx.fillText("binnenkort", this.xs[i], this.iconY + 78);
        }
        ctx.globalAlpha = 1;
      });
      if (this.msg > 0) G.drawBanner(ctx, "Deze carrière komt binnenkort!", "#ffd24a", 300);
      const look = this.phase === "confirm" && this.picked === "soldaat" ? G.soldierLook() : G.playerKidLook();
      G.drawKid(ctx, W / 2, H - 60, 1.1, look, { adult: true, t });
      if (this.phase === "confirm" && this.picked === "soldaat") G.drawHelmet(ctx, W / 2, H - 60, 1.1);
      if (this.phase === "choose") {
        // five careers don't fit as buttons: show the selected one's full name
        const sel = G.CAREERS[this.ids[this.choice.selected]];
        ctx.fillStyle = sel.color;
        ctx.font = "bold 20px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(sel.label, W / 2, 255);
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.font = "12px Segoe UI, Roboto, sans-serif";
        ctx.fillText("← → kiezen · SPATIE bevestigen (of tik op een icoon)", W / 2, H - 10);
      }
      else G.drawBanner(ctx, `Je wordt: ${G.CAREERS[this.picked].label}`, G.CAREERS[this.picked].color, 270);
    },

    hud() {
      return this.phase === "choose" ? "Kies je carrière" : "";
    },
  };
})();
