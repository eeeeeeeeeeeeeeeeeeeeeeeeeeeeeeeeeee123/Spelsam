(() => {
  const { W, H } = G;
  const BEATEN_MS = 2600;
  const CALM_MS = 3000;
  const PLAYER = { x: 150, y: 360 };
  const PROVOKER = { x: 390, y: 360 };

  function drawCanteen(ctx) {
    G.drawRoom(ctx, "#b8bec6", "#8d949c", 250);
    ctx.fillStyle = "#6c737b";
    for (let x = 30; x < W; x += 90) ctx.fillRect(x, 40, 60, 80);
    ctx.fillStyle = "#9aa4ad";
    for (let x = 36; x < W; x += 90) {
      for (let i = 0; i < 5; i++) ctx.fillRect(x + i * 12, 40, 4, 80);
    }
    ctx.fillStyle = "#e6e6e6";
    ctx.font = "bold 14px Segoe UI, Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("JEUGDINRICHTING — KANTINE", W / 2, 160);
    ctx.fillStyle = "#7a6048";
    ctx.fillRect(80, 330, 160, 12);
  }

  G.c2level8 = {
    title: "Level 8 — De kantine (10 jaar)",
    intro:
      "Je zit in de kantine.<br>" +
      "Soms moet je een keuze maken: kies met <strong>← →</strong> en bevestig met <strong>SPATIE</strong>, of tik op een knop. Denk goed na...",

    drawBackground(ctx, t) {
      drawCanteen(ctx);
      G.drawKid(ctx, PLAYER.x, PLAYER.y, 1.1, G.playerKidLook(), { pose: "sit", t });
    },

    start(api) {
      this.api = api;
      this.provokerLook = G.randomLook({ shirt: "#5a5f66" });
      this.script = G.makeScript([
        { who: "provoker", text: "Hé, nieuwe. Jij bent echt een loser.", ms: 2200 },
        { who: "provoker", text: "Wat ga je doen dan? Durf je niet of zo?", ms: 2200 },
      ]);
      this.choice = G.makeChoice(["Vechten", "Niet vechten"]);
      this.phase = "talk";
      this.timer = 0;
    },

    onDirection(dx) {
      if (this.phase === "choose") this.choice.onDirection(dx);
    },

    onAction() {
      if (this.phase === "choose") this.pick(this.choice.selected);
    },

    onPointer(x, y) {
      if (this.phase !== "choose") return;
      const i = this.choice.hit(x, y);
      if (i >= 0) this.pick(i);
    },

    pick(i) {
      this.phase = i === 0 ? "beaten" : "calm";
      this.timer = i === 0 ? BEATEN_MS : CALM_MS;
    },

    update(dt) {
      if (this.phase === "talk") {
        this.script.update(dt);
        if (this.script.done()) this.phase = "choose";
        return;
      }
      if (this.phase === "choose") return;
      this.timer -= dt;
      if (this.timer > 0) return;
      if (this.phase === "beaten") this.api.fail("Je koos voor vechten en werd helemaal in elkaar geslagen.");
      else this.api.complete();
    },

    render(ctx, t) {
      drawCanteen(ctx);
      if (this.phase === "beaten") {
        G.drawKid(ctx, PLAYER.x + 60, PLAYER.y, 1.1, G.playerKidLook(), { pose: "down", dizzy: true, t });
        ctx.fillStyle = "rgba(200, 200, 200, 0.85)";
        for (let i = 0; i < 9; i++) {
          const a = t * 5 + i;
          ctx.beginPath();
          ctx.arc(PLAYER.x + 70 + Math.cos(a) * 55, PLAYER.y - 60 + Math.sin(a * 1.3) * 40, 26, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "#ff4d4d";
        ctx.font = "bold 30px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(Math.floor(t * 4) % 2 ? "DREUN!" : "BAM!", PLAYER.x + 70 + Math.sin(t * 7) * 30, PLAYER.y - 130);
        return;
      }

      G.drawKid(ctx, PROVOKER.x, PROVOKER.y, 1.15, this.provokerLook, { facing: -1, t, angry: this.phase !== "calm" });
      if (this.phase === "calm") {
        const k = 1 - this.timer / CALM_MS;
        G.drawKid(ctx, PLAYER.x - k * 90, PLAYER.y, 1.1, G.playerKidLook(), { pose: "walk", facing: -1, t });
        G.drawBubble(ctx, PLAYER.x - k * 90, PLAYER.y - 120, "Nee. Het is het niet waard.");
        if (k > 0.4) G.drawBanner(ctx, "Goed gedaan! Weglopen is sterker.", "#6ee07a", 70);
        return;
      }

      G.drawKid(ctx, PLAYER.x, PLAYER.y, 1.1, G.playerKidLook(), { pose: "sit", t });
      const line = this.script.current();
      if (line) G.drawBubble(ctx, PROVOKER.x, PROVOKER.y - 135, line.text);
      if (this.phase === "choose") {
        G.drawBubble(ctx, PROVOKER.x, PROVOKER.y - 135, "Nou? Kom dan!");
        this.choice.draw(ctx, t);
      }
    },

    hud() {
      return this.phase === "choose" ? "Wat doe je?" : "";
    },
  };
})();
