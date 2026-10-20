(() => {
  const { W, H } = G;
  const PLAYER = { x: W / 2 - 92 };
  const DATE = { x: W / 2 + 92 };
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

  const SEAT_Y = 252;
  const SCALE = 1.15;
  // in the sit pose the hips sit 30px (adult) above the feet line
  const SIT_Y = SEAT_Y + 30 * SCALE;
  const TABLE = { x: W / 2, top: 236, w: 150 };

  function drawCafe(ctx, t) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#2a1f3a");
    g.addColorStop(1, "#3a2a4a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // floor
    ctx.fillStyle = "#2a2030";
    ctx.fillRect(0, SIT_Y - 4, W, H - SIT_Y + 4);
    // string lights
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.beginPath();
    ctx.moveTo(0, 30);
    for (let i = 0; i < 9; i++) ctx.lineTo(i * 70, 40 + Math.sin(i) * 8);
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = ["#ffd24a", "#ff8a8a", "#8affd0"][i % 3];
      ctx.beginPath();
      ctx.arc(30 + i * 70, 40 + Math.sin(i) * 8, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawChair(ctx, x, facing) {
    ctx.fillStyle = "#6a3a2a";
    // backrest behind the person
    ctx.fillRect(x - facing * 22 - 3, SEAT_Y - 52, 6, 56);
    // seat
    ctx.fillRect(x - facing * 22, SEAT_Y, facing * 40, 7);
    // legs
    ctx.fillRect(x - facing * 20 - 2, SEAT_Y + 7, 4, SIT_Y - SEAT_Y - 7);
    ctx.fillRect(x + facing * 14 - 2, SEAT_Y + 7, 4, SIT_Y - SEAT_Y - 7);
  }

  function drawTable(ctx, t) {
    const { x, top, w } = TABLE;
    ctx.fillStyle = "#5a3a2a";
    ctx.fillRect(x - 6, top + 8, 12, SIT_Y - top - 8);
    ctx.fillRect(x - 30, SIT_Y - 6, 60, 6);
    ctx.fillStyle = "#7a4e36";
    ctx.beginPath();
    ctx.roundRect(x - w / 2, top, w, 10, 4);
    ctx.fill();
    // candle
    ctx.fillStyle = "#f4ead0";
    ctx.fillRect(x - 3, top - 14, 6, 14);
    ctx.fillStyle = `rgba(255,200,60,${0.8 + Math.sin(t * 9) * 0.2})`;
    ctx.beginPath();
    ctx.ellipse(x, top - 18, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // two drinks
    for (const dx of [-45, 45]) {
      ctx.fillStyle = "rgba(200,230,255,0.5)";
      ctx.fillRect(x + dx - 5, top - 16, 10, 16);
      ctx.fillStyle = "#e86a8a";
      ctx.fillRect(x + dx - 4, top - 9, 8, 8);
    }
  }

  function drawScene(ctx, t, o = {}) {
    drawCafe(ctx, t);
    drawChair(ctx, DATE.x, -1);
    drawChair(ctx, o.px ?? PLAYER.x, 1);
    G.drawKid(ctx, DATE.x, SIT_Y, SCALE, DATE_LOOK, { adult: true, pose: o.stand ? "stand" : "sit", facing: -1, t, sad: o.sad, eyesClosed: o.kiss });
    G.drawKid(ctx, o.px ?? PLAYER.x, SIT_Y, SCALE, G.playerKidLook(), { adult: true, pose: o.stand ? "stand" : "sit", facing: 1, t, eyesClosed: o.kiss });
    if (!o.stand) drawTable(ctx, t);
  }

  G.c3level9 = {
    title: "Level 9 — De date (19 jaar)",
    intro:
      "Je hebt een <strong>date</strong> met een leuk meisje. Maak een goede indruk.<br>" +
      "Kies steeds de <strong>juiste zin</strong> met <strong>↑ ↓</strong> en <strong>SPATIE</strong>, of tik.<br>" +
      "<strong>Respect en luisteren</strong> is de sleutel — opdringerig zijn verpest het.",

    drawBackground(ctx, t) {
      drawScene(ctx, t);
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
      this.choice = G.makeChoice(sc.options, { list: true });
      this.phase = "talk";
      this.lineTimer = 1500;
    },

    onDirection(dx, dy) {
      if (this.phase === "choose") this.choice.onDirection(dx, dy);
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
      const sc = SCENES[this.index];

      if (this.phase === "kiss" || this.phase === "fade") {
        // they stand up outside, she by the door, you step closer
        const k = this.phase === "kiss" ? 1 - this.timer / KISS_MS : 1;
        const px = PLAYER.x + (DATE.x - 46 - PLAYER.x) * Math.min(1, k);
        drawCafe(ctx, t);
        G.drawKid(ctx, DATE.x, SIT_Y, SCALE, DATE_LOOK, { adult: true, facing: -1, t, eyesClosed: k > 0.7 });
        G.drawKid(ctx, px, SIT_Y, SCALE, G.playerKidLook(), { adult: true, facing: 1, t, eyesClosed: k > 0.7 });
        if (this.phase === "kiss" && k > 0.6) {
          ctx.font = "22px serif";
          ctx.textAlign = "center";
          ctx.fillText("❤", (px + DATE.x) / 2, SIT_Y - 125 + Math.sin(t * 4) * 6);
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

      drawScene(ctx, t, { sad: this.phase === "reject" });

      if (this.phase === "reject") {
        G.drawBanner(ctx, "Ze loopt weg...", "#ff6b6b", 70);
        G.drawBubble(ctx, DATE.x, SIT_Y - 128, "Sorry, ik ga naar huis.");
        return;
      }

      // hearts meter
      ctx.font = "16px serif";
      ctx.textAlign = "left";
      ctx.fillText("❤".repeat(this.affection) + "♡".repeat(SCENES.length - this.affection), 14, 24);

      if (this.phase === "talk" || this.phase === "choose") {
        G.drawBubble(ctx, DATE.x - 20, SIT_Y - 140, sc.line);
      }
      if (this.phase === "choose") this.choice.draw(ctx, t);
    },

    hud() {
      return this.phase === "choose" ? "Kies de juiste zin" : "";
    },
  };
})();
