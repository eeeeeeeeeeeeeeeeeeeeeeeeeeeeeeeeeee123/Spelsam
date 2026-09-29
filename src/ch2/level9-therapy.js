(() => {
  const { W, H } = G;
  const HUG_MS = 3000;
  const HIT_MS = 1800;
  const PLAYER = { x: 160, y: 370 };
  const THERAPIST = { x: 390, y: 370 };
  const THERAPIST_LOOK = { ...G.SKINS.zwart, hair: "krullen", hairColor: "#1a1212", eyes: G.EYES.bruin, gender: "meisje", shirt: "#3aa39a", pants: "#34425a" };
  const CATCH_TARGET = 15;
  const MAX_ANGRY = 3;
  const SPAWN_MS = 600;
  const GOOD_CHANCE = 0.58;
  const CATCHER_Y = 405;
  const CATCHER_SPEED = 280;
  const CATCH_R = 28;

  function drawHeart(ctx, x, y, r) {
    ctx.fillStyle = "#ff6b8a";
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.9);
    ctx.bezierCurveTo(x - r * 1.4, y - r * 0.2, x - r * 0.6, y - r * 1.2, x, y - r * 0.4);
    ctx.bezierCurveTo(x + r * 0.6, y - r * 1.2, x + r * 1.4, y - r * 0.2, x, y + r * 0.9);
    ctx.fill();
  }

  function drawStar(ctx, x, y, r) {
    ctx.fillStyle = "#ffe066";
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 === 0 ? r : r * 0.45;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.fill();
  }

  function drawAngry(ctx, x, y, r, t) {
    ctx.fillStyle = "#3a2f3f";
    for (const [dx, dy, rr] of [[-0.5, 0.1, 0.6], [0.5, 0.1, 0.6], [0, -0.3, 0.7], [0, 0.3, 0.6]]) {
      ctx.beginPath();
      ctx.arc(x + dx * r, y + dy * r, rr * r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "#ff4d4d";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 8 + Math.sin(t * 20) * 1);
    ctx.lineTo(x + 2, y);
    ctx.lineTo(x - 2, y + 2);
    ctx.lineTo(x + 5, y + 11);
    ctx.stroke();
  }

  function drawMindScape(ctx, t) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#2a1f4a");
    g.addColorStop(1, "#5a3a7a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    G.drawFloaters(ctx, t, "rgba(255, 255, 255, 0.06)", 18, 6);
  }

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
    title: "Level 9 — Therapie (9 jaar)",
    intro:
      "Je bent weer thuis en gaat naar <strong>therapie</strong> om met je boosheid te leren omgaan. Dit is je laatste sessie.<br>" +
      `Vang eerst <strong>${CATCH_TARGET} goede gedachten</strong> (hartjes en sterren) met <strong>← →</strong>. Ontwijk de <strong>boze wolkjes</strong>: ${MAX_ANGRY} keer boos kost een hartje.<br>` +
      "Soms moet je een keuze maken: kies met <strong>← →</strong> en bevestig met <strong>SPATIE</strong>, of tik op een knop.",

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
      this.phase = "catch";
      this.timer = 0;
      this.catcherX = W / 2;
      this.thoughts = [];
      this.spawn = 400;
      this.caught = 0;
      this.angry = 0;
      this.flash = 0;
      this.popups = [];
    },

    updateCatch(dt) {
      const s = dt / 1000;
      this.flash = Math.max(0, this.flash - dt);
      this.popups = G.updatePopups(this.popups, dt);
      const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
      this.catcherX = G.clamp(this.catcherX + mx * CATCHER_SPEED * s, 30, W - 30);
      this.spawn -= dt;
      if (this.spawn <= 0) {
        this.spawn = SPAWN_MS;
        const good = Math.random() < GOOD_CHANCE;
        this.thoughts.push({ x: 30 + Math.random() * (W - 60), y: -20, vy: 140 + Math.random() * 90, good, kind: good ? G.pick(["heart", "star"]) : "angry" });
      }
      for (const th of this.thoughts) {
        th.y += th.vy * s;
        if (th.y > CATCHER_Y - 40 && th.y < CATCHER_Y + 10 && Math.abs(th.x - this.catcherX) < CATCH_R) {
          th.done = true;
          if (th.good) {
            this.caught++;
            this.popups.push({ text: "+1", x: th.x, y: th.y - 20, color: "#6ee07a", life: 600 });
          } else {
            this.angry++;
            this.flash = 400;
            this.popups.push({ text: "Grrr!", x: th.x, y: th.y - 20, color: "#ff6b6b", life: 700 });
            if (this.angry >= MAX_ANGRY) {
              this.api.fail("Je liet je meeslepen door boze gedachten.");
              return;
            }
          }
        } else if (th.y > H + 20) th.done = true;
      }
      this.thoughts = this.thoughts.filter((th) => !th.done);
      if (this.caught >= CATCH_TARGET) this.phase = "talk";
    },

    renderCatch(ctx, t) {
      drawMindScape(ctx, t);
      if (this.flash > 0) {
        ctx.fillStyle = `rgba(255, 60, 60, ${0.25 * (this.flash / 400)})`;
        ctx.fillRect(0, 0, W, H);
      }
      for (const th of this.thoughts) {
        if (th.kind === "heart") drawHeart(ctx, th.x, th.y, 13);
        else if (th.kind === "star") drawStar(ctx, th.x, th.y, 14);
        else drawAngry(ctx, th.x, th.y, 17, t);
      }
      G.drawKid(ctx, this.catcherX, CATCHER_Y + 30, 0.8, G.playerKidLook(), { t, armAngle: -1.6, angry: this.flash > 0 });
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(W / 2 - 130, 10, 260, 28);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 15px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`Goed: ${this.caught} / ${CATCH_TARGET} · Boos: ${this.angry} / ${MAX_ANGRY}`, W / 2, 29);
      G.drawPopups(ctx, this.popups);
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
      if (this.phase === "catch") {
        this.updateCatch(dt);
        return;
      }
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
      if (this.phase === "catch") {
        this.renderCatch(ctx, t);
        return;
      }
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
      if (this.phase === "catch") return `Gedachten: ${this.caught} / ${CATCH_TARGET}`;
      return this.phase === "choose" ? "Wat doe je?" : "";
    },
  };
})();
