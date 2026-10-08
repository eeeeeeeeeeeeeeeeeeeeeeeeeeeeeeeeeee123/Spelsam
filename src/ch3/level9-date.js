(() => {
  const { W, H } = G;
  const PLAYER = { x: 155, y: 330 };
  const DATE = { x: 385, y: 330 };
  const DATE_LOOK = { ...G.SKINS.wit, hair: "lang", hairColor: "#7a4a2a", eyes: G.EYES.groen, gender: "meisje", shirt: "#d070a0", pants: "#3a3550" };
  const FADE_MS = 2600;
  const KISS_MS = 1800;
  const REVEAL_MS = 1600;

  // Each scene: her line, then 3 options. `good` advances, anything else fails.
  const SCENES = [
    {
      line: "Hoi! Leuk dat je er bent.",
      options: ["Jij ook, je ziet er mooi uit.", "Eindelijk, ik stond te wachten.", "Kom, we gaan gelijk naar binnen."],
      good: 0,
      fail: "Je kwam bot over. Ze twijfelt nu al.",
    },
    {
      line: "Ik studeer trouwens diergeneeskunde.",
      options: ["Boeiend, vertel! Wat vind je het leukst?", "Oké. Ik heb honger.", "Saai, zullen we het over mij hebben?"],
      good: 0,
      fail: "Je liet geen interesse zien. Ze voelt zich niet gehoord.",
    },
    {
      line: "Ik vind dit eigenlijk best spannend, eerste date...",
      options: ["Geen stress, we doen het rustig aan.", "Nergens voor nodig, kom dichterbij.", "Ik niet hoor, ik doe dit vaak."],
      good: 0,
      fail: "Je zette haar onder druk. Dat voelt niet goed voor haar.",
    },
    {
      line: "Zullen we nog een stukje lopen?",
      options: ["Leuk, ik loop met je mee.", "Alleen als je daarna meegaat.", "Nee, ik wil nu naar huis."],
      good: 0,
      fail: "Je maakte er een eis van. Ze haakt af.",
    },
    {
      line: "Dit was een hele fijne avond...",
      options: ["Voor mij ook. Mag ik je zoenen?", "Mooi, ik kom mee naar binnen.", "Oké, doei dan maar."],
      good: 0,
      fail: "Je ging over haar grens heen. Ze gaat alleen naar binnen.",
      kiss: true,
    },
  ];

  function drawCafe(ctx, t) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#2a1f3a");
    g.addColorStop(1, "#3a2a4a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // string lights
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = ["#ffd24a", "#ff8a8a", "#8affd0"][i % 3];
      ctx.beginPath();
      ctx.arc(30 + i * 70, 40 + Math.sin(i) * 8, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // table
    ctx.fillStyle = "#5a3a2a";
    ctx.fillRect(W / 2 - 55, 360, 110, 50);
    ctx.fillStyle = "#6a4a3a";
    ctx.beginPath();
    ctx.ellipse(W / 2, 360, 60, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    // candle
    ctx.fillStyle = "#ffd24a";
    ctx.beginPath();
    ctx.arc(W / 2, 348, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  G.c3level9 = {
    title: "Level 9 — De date (19 jaar)",
    intro:
      "Je hebt een <strong>date</strong> met een leuk meisje. Maak een goede indruk.<br>" +
      "Kies steeds de <strong>juiste zin</strong> met <strong>← →</strong> en <strong>SPATIE</strong>, of tik.<br>" +
      "<strong>Respect en luisteren</strong> is de sleutel — opdringerig zijn verpest het.",

    drawBackground(ctx, t) {
      drawCafe(ctx, t);
      G.drawKid(ctx, DATE.x, DATE.y, 1.15, DATE_LOOK, { adult: true, pose: "sit", facing: -1, t });
      G.drawKid(ctx, PLAYER.x, PLAYER.y, 1.15, G.playerKidLook(), { adult: true, pose: "sit", t });
    },

    start(api) {
      this.api = api;
      this.index = 0;
      this.phase = "talk";
      this.timer = 0;
      this.affection = 0;
      this.setScene();
    },

    setScene() {
      const sc = SCENES[this.index];
      this.choice = G.makeChoice(sc.options);
      this.phase = "talk";
      this.lineTimer = 1500;
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
      const sc = SCENES[this.index];
      if (i !== sc.good) {
        this.phase = "reject";
        this.timer = REVEAL_MS;
        this.rejectMsg = sc.fail;
        return;
      }
      this.affection++;
      if (sc.kiss) {
        this.phase = "kiss";
        this.timer = KISS_MS;
      } else {
        this.index++;
        this.setScene();
      }
    },

    update(dt) {
      if (this.phase === "talk") {
        this.lineTimer -= dt;
        if (this.lineTimer <= 0) this.phase = "choose";
        return;
      }
      if (this.phase === "choose") return;
      this.timer -= dt;
      if (this.timer > 0) return;
      if (this.phase === "reject") {
        this.api.fail(this.rejectMsg);
      } else if (this.phase === "kiss") {
        this.phase = "fade";
        this.timer = FADE_MS;
      } else if (this.phase === "fade") {
        this.api.complete();
      }
    },

    render(ctx, t) {
      drawCafe(ctx, t);
      const sc = SCENES[this.index];

      if (this.phase === "kiss" || this.phase === "fade") {
        const k = this.phase === "kiss" ? 1 - this.timer / KISS_MS : 1;
        const px = PLAYER.x + (DATE.x - 70 - PLAYER.x) * Math.min(1, k);
        G.drawKid(ctx, DATE.x, DATE.y, 1.15, DATE_LOOK, { adult: true, facing: -1, t, eyesClosed: true });
        G.drawKid(ctx, px, PLAYER.y, 1.15, G.playerKidLook(), { adult: true, facing: 1, t, eyesClosed: true });
        if (this.phase === "kiss" && k > 0.6) {
          ctx.font = "22px serif";
          ctx.textAlign = "center";
          ctx.fillText("❤", (px + DATE.x) / 2, 250 + Math.sin(t * 4) * 6);
        }
        if (this.phase === "fade") {
          const f = 1 - this.timer / FADE_MS;
          ctx.fillStyle = `rgba(0,0,0,${Math.min(1, f * 1.5)})`;
          ctx.fillRect(0, 0, W, H);
          if (f > 0.5) {
            ctx.fillStyle = "#fff";
            ctx.font = "bold 24px Segoe UI, Roboto, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("De volgende ochtend…", W / 2, H / 2);
          }
        }
        return;
      }

      G.drawKid(ctx, DATE.x, DATE.y, 1.15, DATE_LOOK, { adult: true, pose: "sit", facing: -1, t, sad: this.phase === "reject" });
      G.drawKid(ctx, PLAYER.x, PLAYER.y, 1.15, G.playerKidLook(), { adult: true, pose: "sit", t });

      if (this.phase === "reject") {
        G.drawBanner(ctx, "Ze loopt weg...", "#ff6b6b", 70);
        G.drawBubble(ctx, DATE.x, DATE.y - 140, "Sorry, ik ga naar huis.");
        return;
      }

      // hearts meter
      ctx.font = "16px serif";
      ctx.textAlign = "left";
      ctx.fillText("❤".repeat(this.affection) + "♡".repeat(SCENES.length - this.affection), 14, 24);

      if (this.phase === "talk" || this.phase === "choose") {
        G.drawBubble(ctx, DATE.x, DATE.y - 150, sc.line);
      }
      if (this.phase === "choose") this.choice.draw(ctx, t);
    },

    hud() {
      return this.phase === "choose" ? "Kies de juiste zin" : "";
    },
  };
})();
