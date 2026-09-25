(() => {
  const { W, H } = G;
  const HUG_MS = 3000;
  const HIT_MS = 1800;
  const PLAYER = { x: 160, y: 370 };
  const THERAPIST = { x: 390, y: 370 };
  const THERAPIST_LOOK = { ...G.SKINS.zwart, hair: "krullen", hairColor: "#1a1212", eyes: G.EYES.bruin, gender: "meisje", shirt: "#3aa39a", pants: "#34425a" };

  function drawOffice(ctx, t) {
    G.drawRoom(ctx, "#e9e1f3", "#b9a58c", 260);
    G.drawWindow(ctx, W / 2 - 60, 40, 120, 90);
    ctx.fillStyle = "#6a8f5a";
    ctx.beginPath();
    ctx.ellipse(470, 210, 26, 40, Math.sin(t) * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#a0603a";
    ctx.fillRect(455, 240, 30, 26);
    ctx.fillStyle = "#7b5ea7";
    ctx.beginPath();
    ctx.roundRect(60, 300, 180, 50, 14);
    ctx.fill();
    ctx.fillStyle = "#c59b5a";
    ctx.beginPath();
    ctx.roundRect(340, 300, 110, 50, 12);
    ctx.fill();
  }

  function drawHearts(ctx, t, x, y) {
    ctx.fillStyle = "#ff6b8a";
    for (let i = 0; i < 4; i++) {
      const k = (t * 0.8 + i * 0.25) % 1;
      const hx = x + Math.sin(i * 2 + t) * 30;
      const hy = y - k * 90;
      ctx.globalAlpha = 1 - k;
      ctx.font = "22px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("❤", hx, hy);
    }
    ctx.globalAlpha = 1;
  }

  G.c2level9 = {
    title: "Level 9 — De laatste therapie (11 jaar)",
    intro:
      "Je bent uit de jeugdinrichting en in <strong>therapie</strong>. Dit is je <strong>allerlaatste sessie</strong>.<br>" +
      "Aan het eind maak je een keuze. Let op: een verkeerde keuze betekent dat je <strong>helemaal opnieuw</strong> begint, hoeveel hartjes je ook hebt.",

    drawBackground(ctx, t) {
      drawOffice(ctx, t);
      G.drawKid(ctx, THERAPIST.x, THERAPIST.y, 1.15, THERAPIST_LOOK, { adult: true, pose: "sit", facing: -1, t });
      G.drawKid(ctx, PLAYER.x, PLAYER.y, 1.1, G.playerKidLook(), { pose: "sit", t });
    },

    start(api) {
      this.api = api;
      this.script = G.makeScript([
        { who: "therapist", text: "Dit is onze laatste sessie.", ms: 2000 },
        { who: "therapist", text: "Ik ben trots op hoe ver je gekomen bent.", ms: 2400 },
        { who: "therapist", text: "Hoe voel je je nu?", ms: 1800 },
      ]);
      this.choice = G.makeChoice(["Knuffel geven", "Slaan"]);
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
      this.phase = i === 0 ? "hug" : "hit";
      this.timer = i === 0 ? HUG_MS : HIT_MS;
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
      if (this.phase === "hug") this.api.complete();
      else this.api.restartChapter("Je sloeg je therapeut. Alles wat je geleerd had is weg: je begint helemaal opnieuw.");
    },

    render(ctx, t) {
      drawOffice(ctx, t);
      if (this.phase === "hug") {
        const k = Math.min(1, (1 - this.timer / HUG_MS) * 2);
        const px = PLAYER.x + (THERAPIST.x - 55 - PLAYER.x) * k;
        G.drawKid(ctx, THERAPIST.x, THERAPIST.y, 1.15, THERAPIST_LOOK, { adult: true, facing: -1, t, armAngle: k >= 1 ? 0.2 : undefined });
        G.drawKid(ctx, px, PLAYER.y, 1.1, G.playerKidLook(), { pose: k < 1 ? "walk" : "stand", t, armAngle: k >= 1 ? -0.1 : undefined, eyesClosed: k >= 1 });
        if (k >= 1) {
          drawHearts(ctx, t, THERAPIST.x - 30, THERAPIST.y - 140);
          G.drawBanner(ctx, "Je hebt het gehaald!", "#6ee07a", 70);
        }
        return;
      }
      if (this.phase === "hit") {
        const k = 1 - this.timer / HIT_MS;
        G.drawKid(ctx, THERAPIST.x + 20, THERAPIST.y, 1.15, THERAPIST_LOOK, { adult: true, facing: -1, t, pose: k > 0.3 ? "down" : "stand", dizzy: k > 0.3 });
        G.drawKid(ctx, THERAPIST.x - 70, PLAYER.y, 1.1, G.playerKidLook(), { t, angry: true, armAngle: k < 0.3 ? -0.2 : 0 });
        G.drawBanner(ctx, "Nee...", "#ff6b6b", 70);
        return;
      }

      G.drawKid(ctx, THERAPIST.x, THERAPIST.y, 1.15, THERAPIST_LOOK, { adult: true, pose: "sit", facing: -1, t });
      G.drawKid(ctx, PLAYER.x, PLAYER.y, 1.1, G.playerKidLook(), { pose: "sit", t });
      const line = this.script.current();
      if (line) G.drawBubble(ctx, THERAPIST.x, THERAPIST.y - 150, line.text);
      if (this.phase === "choose") this.choice.draw(ctx, t);
    },

    hud() {
      return this.phase === "choose" ? "Wat doe je?" : "";
    },
  };
})();
