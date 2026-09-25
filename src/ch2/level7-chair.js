(() => {
  const { W, H } = G;
  const TARGET = 30;
  const THROW_MS = 700;
  const IMPACT_MS = 1400;
  const POLICE_MS = 3600;
  const PLAYER = { x: 150, y: 380 };
  const TEACHER = { x: 420, y: 380 };
  const TEACHER_LOOK = { ...G.SKINS.wit, hair: "lang", hairColor: "#b07a3a", eyes: G.EYES.groen, gender: "meisje", shirt: "#7a5ac0", pants: "#3a3550" };
  const POLICE_LOOK = { ...G.SKINS.wit, hair: "kort", hairColor: "#2a1a12", eyes: G.EYES.blauw, gender: "jongen", shirt: "#1f3a7a", pants: "#1a2440" };

  function teacherHead() {
    return { x: TEACHER.x, y: TEACHER.y - 105 };
  }

  G.c2level7 = {
    title: "Level 7 — Ruzie met de juf (10 jaar)",
    intro:
      "Je krijgt <strong>ruzie</strong> met je juf. Je wordt steeds bozer...<br>" +
      `Druk heel vaak op <strong>SPATIE</strong> (${TARGET} keer) om de stoel op te tillen en te gooien.`,

    drawBackground(ctx, t) {
      G.drawClassroom(ctx);
      G.drawKid(ctx, TEACHER.x, TEACHER.y, 1.1, TEACHER_LOOK, { adult: true, facing: -1, t });
      G.drawChair(ctx, PLAYER.x + 30, PLAYER.y, 0, 1.4);
      G.drawKid(ctx, PLAYER.x, PLAYER.y, 1.1, G.playerKidLook(), { t });
    },

    start(api) {
      this.api = api;
      this.script = G.makeScript([
        { who: "teacher", text: "Jij blijft vandaag na!", ms: 1900 },
        { who: "player", text: "Dat is niet eerlijk!", ms: 1700 },
        { who: "teacher", text: "Geen discussie. Ga zitten!", ms: 1900 },
      ]);
      this.presses = 0;
      this.phase = "argue";
      this.timer = 0;
    },

    onAction() {
      if (this.phase !== "rage") return;
      this.presses++;
      if (this.presses >= TARGET) {
        this.phase = "throw";
        this.timer = THROW_MS;
      }
    },

    update(dt) {
      if (this.phase === "argue") {
        this.script.update(dt);
        if (this.script.done()) this.phase = "rage";
        return;
      }
      if (this.phase === "rage") return;
      this.timer -= dt;
      if (this.timer > 0) return;
      if (this.phase === "throw") {
        this.phase = "impact";
        this.timer = IMPACT_MS;
      } else if (this.phase === "impact") {
        this.phase = "police";
        this.timer = POLICE_MS;
      } else if (this.phase === "police") {
        this.api.complete();
      }
    },

    render(ctx, t) {
      G.drawClassroom(ctx);
      const hit = this.phase === "impact" || this.phase === "police";
      G.drawKid(ctx, TEACHER.x, TEACHER.y, 1.1, TEACHER_LOOK, { adult: true, facing: -1, t, dizzy: hit, angry: this.phase === "argue" });

      const rage = Math.min(1, this.presses / TARGET);
      const lifting = this.phase === "rage" && this.presses > 0;
      const hand = G.drawKid(ctx, PLAYER.x, PLAYER.y, 1.1, G.playerKidLook(), {
        t,
        angry: this.phase !== "argue" && this.phase !== "police",
        sad: this.phase === "police",
        armAngle: lifting ? 0.9 - rage * 2.5 : undefined,
      });

      if (this.phase === "argue" || (this.phase === "rage" && this.presses === 0)) {
        G.drawChair(ctx, PLAYER.x + 30, PLAYER.y, 0, 1.4);
      } else if (this.phase === "rage") {
        G.drawChair(ctx, hand.x, hand.y + 20, -rage * 0.6, 1.4);
      } else if (this.phase === "throw") {
        const k = 1 - this.timer / THROW_MS;
        const head = teacherHead();
        const x = hand.x + (head.x - hand.x) * k;
        const y = hand.y + (head.y - hand.y) * k - Math.sin(k * Math.PI) * 80;
        G.drawChair(ctx, x, y, k * 6, 1.4);
      } else {
        G.drawChair(ctx, TEACHER.x - 40, TEACHER.y, 1.4, 1.4);
      }

      if (this.phase === "impact") {
        const head = teacherHead();
        ctx.fillStyle = "#ff4d4d";
        ctx.font = "bold 36px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("BONK!", head.x, head.y - 40);
      }

      if (this.phase === "police") {
        G.drawPoliceLights(ctx, t);
        const k = 1 - this.timer / POLICE_MS;
        const px = W + 40 - Math.min(1, k * 2.5) * 260;
        G.drawKid(ctx, px, PLAYER.y, 1.2, POLICE_LOOK, { adult: true, facing: -1, t, pose: k < 0.4 ? "walk" : "stand", armAngle: -0.2 });
        G.drawBanner(ctx, "Je wordt aangehouden.", "#ffffff", 70);
      }

      const line = this.phase === "argue" ? this.script.current() : null;
      if (line) {
        const who = line.who === "player" ? PLAYER : TEACHER;
        G.drawBubble(ctx, who.x, who.y - (line.who === "player" ? 120 : 150), line.text);
      }

      if (this.phase === "rage") {
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(20, 20, 200, 16);
        ctx.fillStyle = `rgb(255, ${Math.round(200 - rage * 170)}, 60)`;
        ctx.fillRect(20, 20, 200 * rage, 16);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("WOEDE", 26, 32);
        if (this.presses === 0) G.drawBanner(ctx, "Druk op SPATIE!", "#ffe066", H - 40);
      }
    },

    hud() {
      if (this.phase === "argue") return "...";
      if (this.phase === "rage") return `Woede: ${this.presses} / ${TARGET}`;
      return "";
    },
  };
})();
