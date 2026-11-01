(() => {
  const { W, H } = G;
  const PINS = 5;
  const STRIKES = 3;
  const SHIFT = 3;
  const WORDS = ["RAKET", "PARADE", "GENERAAL", "GEHEIM", "HAVEN", "BUNKER", "SPION", "GRENS"];
  const DISGUISES = [
    { q: "Missie: binnenkomen in een fabriek.", opts: ["Blauwe werkoverall", "Hawaïhemd met camera", "Smoking met strik"], good: 0 },
    { q: "Missie: drankjes serveren op een feest van generaals.", opts: ["Duikpak", "Wit ober-jasje met dienblad", "Clownspak"], good: 1 },
    { q: "Missie: opgaan in de menigte bij een parade.", opts: ["Neonroze trainingspak", "Cowboyhoed en laarzen", "Grijs pak met speldje"], good: 2 },
  ];
  const TEACHER = { ...G.SKINS.zwart, hair: "kort", hairColor: "#888", eyes: G.EYES.bruin, gender: "meisje", shirt: "#2a2a34", pants: "#15161a" };

  const encode = (w) => w.replace(/[A-Z]/g, (c) => String.fromCharCode(((c.charCodeAt(0) - 65 + SHIFT) % 26) + 65));

  function drawClassroom(ctx) {
    ctx.fillStyle = "#1e2430";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#2a3242";
    ctx.fillRect(0, H - 80, W, 80);
    // blackboard
    ctx.fillStyle = "#1a3a2a";
    ctx.fillRect(110, 30, 320, 150);
    ctx.strokeStyle = "#6a4a2a";
    ctx.lineWidth = 6;
    ctx.strokeRect(110, 30, 320, 150);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.font = "12px Segoe UI, Roboto, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("A→D  B→E  C→F ...", 124, 52);
  }

  G.CAREER_LEVELS.spion[2] = {
    title: "Level 2 — Spionnenschool (22 jaar)",
    intro:
      "Je wordt opgeleid als geheim agent. Drie examens:<br>" +
      "1. <strong>Slot kraken</strong>: druk op <strong>SPATIE</strong> als de pin in het <strong>groene</strong> vak staat.<br>" +
      "2. <strong>Codes kraken</strong>: elke letter is <strong>3 plaatsen opgeschoven</strong> (D = A). Kies het goede woord.<br>" +
      "3. <strong>Vermomming</strong>: kies wat past bij de missie. Kiezen met <strong>↑ ↓</strong> + <strong>SPATIE</strong>. Bij 3 fouten zak je.",

    drawBackground(ctx, t) {
      drawClassroom(ctx);
      G.drawKid(ctx, 470, H - 40, 1, TEACHER, { adult: true, t, armAngle: -1 });
    },

    start(api) {
      this.api = api;
      this.strikes = 0;
      this.phase = "lock";
      this.pin = 0;
      this.pinT = 0;
      this.newPin();
      this.round = 0;
      this.feedback = null;
      this.popups = [];
      this.over = false;
      this.words = G.shuffle(WORDS).slice(0, 3);
    },

    newPin() {
      this.zone = 0.2 + Math.random() * 0.5;
      this.pinSpeed = 2.4 + this.pin * 0.5;
      this.pinT = Math.random() * 6;
    },

    pinPos() {
      return (Math.sin(this.pinT * this.pinSpeed) + 1) / 2; // 0..1
    },

    say(text, good) {
      this.feedback = { text, good, life: 1300 };
    },

    strike(text) {
      this.strikes++;
      this.say(text, false);
      if (this.strikes >= STRIKES) {
        this.over = true;
        this.api.fail("Gezakt voor de spionnenschool. Drie fouten is te veel voor een geheim agent.");
      }
    },

    setupCode() {
      const w = this.words[this.round];
      const others = G.shuffle(WORDS.filter((x) => x !== w)).slice(0, 2);
      this.options = G.shuffle([w, ...others]);
      this.choice = G.makeChoice(this.options, { list: true });
      this.coded = encode(w);
      this.answer = w;
    },

    setupDisguise() {
      const d = DISGUISES[this.round];
      this.choice = G.makeChoice(d.opts, { list: true });
    },

    next() {
      if (this.phase === "lock") {
        this.phase = "code";
        this.round = 0;
        this.setupCode();
      } else if (this.phase === "code") {
        this.round++;
        if (this.round >= this.words.length) {
          this.phase = "disguise";
          this.round = 0;
          this.setupDisguise();
        } else this.setupCode();
      } else if (this.phase === "disguise") {
        this.round++;
        if (this.round >= DISGUISES.length) {
          this.phase = "done";
          this.doneT = 1600;
        } else this.setupDisguise();
      }
    },

    onDirection(dx, dy) {
      if (this.choice && this.phase !== "lock") this.choice.onDirection(dx, dy);
    },
    onPointer(x, y) {
      if (this.phase === "lock") return this.onAction();
      const i = this.choice ? this.choice.hit(x, y) : -1;
      if (i >= 0) {
        this.choice.selected = i;
        this.onAction();
      }
    },

    onAction() {
      if (this.over || this.phase === "done") return;
      if (this.phase === "lock") {
        const pos = this.pinPos();
        if (Math.abs(pos - this.zone) < 0.09) {
          this.pin++;
          this.say("Klik! Pin zit.", true);
          if (this.pin >= PINS) {
            this.say("Slot open!", true);
            this.next();
          } else this.newPin();
        } else this.strike("Pin geschoten... fout!");
        return;
      }
      if (this.phase === "code") {
        if (this.options[this.choice.selected] === this.answer) this.say(`Goed: ${this.coded} = ${this.answer}`, true);
        else this.strike(`Fout: ${this.coded} = ${this.answer}`);
        if (!this.over) this.next();
        return;
      }
      if (this.phase === "disguise") {
        const d = DISGUISES[this.round];
        if (this.choice.selected === d.good) this.say("Perfecte vermomming!", true);
        else this.strike(`Daarin val je op! Beter: ${d.opts[d.good]}`);
        if (!this.over) this.next();
      }
    },

    update(dt) {
      if (this.over) return;
      if (this.feedback) {
        this.feedback.life -= dt;
        if (this.feedback.life <= 0) this.feedback = null;
      }
      if (this.phase === "lock") this.pinT += dt / 1000;
      if (this.phase === "done") {
        this.doneT -= dt;
        if (this.doneT <= 0) {
          this.over = true;
          this.api.complete();
        }
      }
    },

    render(ctx, t) {
      drawClassroom(ctx);
      G.drawKid(ctx, 470, H - 40, 1, TEACHER, { adult: true, t, armAngle: -1 });
      ctx.textAlign = "center";

      if (this.phase === "lock") {
        // lock with pins
        ctx.fillStyle = "#b08a30";
        ctx.beginPath();
        ctx.roundRect(160, 60, 220, 110, 14);
        ctx.fill();
        for (let i = 0; i < PINS; i++) {
          const x = 190 + i * 40;
          ctx.fillStyle = "#3a2a10";
          ctx.fillRect(x - 8, 70, 16, 90);
          if (i < this.pin) {
            ctx.fillStyle = "#6ee07a";
            ctx.fillRect(x - 6, 72, 12, 30);
          } else if (i === this.pin) {
            const zy = 72 + this.zone * 80;
            ctx.fillStyle = "rgba(110,224,122,0.5)";
            ctx.fillRect(x - 8, zy - 8, 16, 16);
            const py = 72 + this.pinPos() * 80;
            ctx.fillStyle = "#e8e8e8";
            ctx.fillRect(x - 6, py - 3, 12, 6);
          }
        }
        ctx.fillStyle = "#fff";
        ctx.font = "bold 16px Segoe UI, Roboto, sans-serif";
        ctx.fillText(`Slot kraken: pin ${Math.min(PINS, this.pin + 1)}/${PINS} — SPATIE in het groen`, W / 2, 215);
      } else if (this.phase === "code") {
        ctx.fillStyle = "#e8f0e8";
        ctx.font = "bold 34px Courier New, monospace";
        ctx.fillText(this.coded, 270, 120);
        ctx.font = "13px Segoe UI, Roboto, sans-serif";
        ctx.fillText(`Code ${this.round + 1}/${this.words.length}: wat staat er?`, 270, 160);
        this.choice.draw(ctx, t);
      } else if (this.phase === "disguise") {
        ctx.fillStyle = "#e8f0e8";
        ctx.font = "bold 15px Segoe UI, Roboto, sans-serif";
        ctx.fillText(DISGUISES[this.round].q, 270, 110);
        ctx.font = "13px Segoe UI, Roboto, sans-serif";
        ctx.fillText(`Vermomming ${this.round + 1}/${DISGUISES.length}`, 270, 140);
        this.choice.draw(ctx, t);
      } else if (this.phase === "done") {
        G.drawBanner(ctx, "Geslaagd! Je bent geheim agent.", "#6ee07a", 120);
      }

      if (this.feedback) G.drawBubble(ctx, 450, H - 150, this.feedback.text, this.feedback.good ? "#d8ffd8" : "#ffd8d8");
      ctx.fillStyle = "#fff";
      ctx.font = "bold 13px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`Fouten: ${"✖".repeat(this.strikes)}${"·".repeat(STRIKES - this.strikes)}`, 12, 22);
    },

    hud() {
      return { lock: "Slot kraken", code: "Codes kraken", disguise: "Vermomming", done: "Geslaagd" }[this.phase];
    },
  };
})();
