(() => {
  const { W, H } = G;
  const QUESTIONS = 10;
  const PASS = 7;
  const TIME_MS = 20000;
  const FEEDBACK_MS = 1200;
  const CEREMONY_MS = 4200;
  const TEACHER_LOOK = { ...G.SKINS.wit, hair: "kort", hairColor: "#8a8a8a", eyes: G.EYES.blauw, gender: "jongen", shirt: "#3a5a8a", pants: "#2a3040" };

  const TAAL = [
    ["Hij ___ morgen twaalf.", "wordt", ["word", "wort"]],
    ["Ik ___ elke dag naar school.", "fiets", ["fietst", "fiest"]],
    ["___ jij ook mee naar de film?", "Ga", ["Gaat", "Gat"]],
    ["Zij ___ een mooie tekening.", "maakt", ["maak", "maakd"]],
    ["Gisteren ___ ik voetbal.", "speelde", ["speelden", "speelte"]],
    ["Het meervoud van 'kind' is:", "kinderen", ["kinds", "kindes"]],
    ["Welk woord is goed gespeld?", "eigenlijk", ["eigelijk", "eiglijk"]],
    ["Welk woord is goed gespeld?", "meteen", ["metteen", "meeteen"]],
    ["Welk woord is goed gespeld?", "centimeter", ["sentimeter", "centiemeter"]],
  ];

  const TOPO = [
    ["Wat is de hoofdstad van Nederland?", "Amsterdam", ["Den Haag", "Rotterdam"]],
    ["In welke provincie ligt Eindhoven?", "Noord-Brabant", ["Limburg", "Gelderland"]],
    ["Welke rivier stroomt door Nijmegen?", "Waal", ["Maas", "IJssel"]],
    ["Wat is de hoofdstad van België?", "Brussel", ["Antwerpen", "Gent"]],
    ["In welke provincie ligt Maastricht?", "Limburg", ["Zeeland", "Noord-Brabant"]],
    ["Wat is de hoofdstad van Frankrijk?", "Parijs", ["Lyon", "Marseille"]],
    ["Welke zee ligt ten westen van Nederland?", "Noordzee", ["Oostzee", "Middellandse Zee"]],
    ["Hoeveel provincies heeft Nederland?", "12", ["10", "14"]],
    ["In welke provincie ligt Leeuwarden?", "Friesland", ["Groningen", "Drenthe"]],
  ];

  function mathQuestion() {
    const kind = G.randInt(4);
    let q;
    let answer;
    if (kind === 0) {
      const a = 3 + G.randInt(10);
      const b = 3 + G.randInt(10);
      q = `${a} × ${b} =`;
      answer = a * b;
    } else if (kind === 1) {
      const a = 120 + G.randInt(800);
      const b = 40 + G.randInt(300);
      q = `${a} + ${b} =`;
      answer = a + b;
    } else if (kind === 2) {
      const a = 300 + G.randInt(600);
      const b = 20 + G.randInt(250);
      q = `${a} − ${b} =`;
      answer = a - b;
    } else {
      const b = 2 + G.randInt(9);
      answer = 2 + G.randInt(12);
      q = `${answer * b} : ${b} =`;
    }
    const wrong = new Set();
    while (wrong.size < 2) {
      const w = answer + (G.randInt(2) ? 1 : -1) * (1 + G.randInt(kind === 0 ? 12 : 10));
      if (w !== answer && w >= 0) wrong.add(w);
    }
    return { subject: "Rekenen", text: q, answer: String(answer), wrong: [...wrong].map(String) };
  }

  function makeTest() {
    const fromBank = (bank, subject, n) =>
      G.shuffle(bank)
        .slice(0, n)
        .map(([text, answer, wrong]) => ({ subject, text, answer, wrong }));
    const list = [
      ...Array.from({ length: 4 }, mathQuestion),
      ...fromBank(TAAL, "Taal", 3),
      ...fromBank(TOPO, "Topografie", 3),
    ];
    return G.shuffle(list).map((q) => ({ ...q, options: G.shuffle([q.answer, ...q.wrong]) }));
  }

  function drawHall(ctx, t) {
    G.drawRoom(ctx, "#dfe8f5", "#9a7a5a", 280);
    ctx.fillStyle = "#b03a4a";
    ctx.fillRect(0, 0, W, 26);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px Segoe UI, Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("GEFELICITEERD GROEP 8!", W / 2, 19);
    const colors = ["#e05a5a", "#5aa0e0", "#f0b43c", "#6cc46c", "#b07ad8"];
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.moveTo(i * 40, 26);
      ctx.lineTo(i * 40 + 40, 26);
      ctx.lineTo(i * 40 + 20, 50 + Math.sin(t * 2 + i) * 3);
      ctx.fill();
    }
  }

  function drawDiploma(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = "#fff8e6";
    ctx.fillRect(-18, -6, 36, 12);
    ctx.fillStyle = "#e8dcc0";
    ctx.beginPath();
    ctx.arc(-18, 0, 6, 0, Math.PI * 2);
    ctx.arc(18, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#b03a4a";
    ctx.fillRect(-3, -7, 6, 14);
    ctx.restore();
  }

  function wrapText(ctx, text, x, y, maxW, lineH) {
    const words = text.split(" ");
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, y);
        line = word;
        y += lineH;
      } else line = test;
    }
    ctx.fillText(line, x, y);
  }

  G.c2level10 = {
    title: "Level 10 — Groep 8 (12 jaar)",
    intro:
      "Het laatste jaar van de basisschool: tijd voor de <strong>eindtoets</strong>!<br>" +
      `Je krijgt ${QUESTIONS} vragen over rekenen, taal en topografie. Kies met <strong>← →</strong> en bevestig met <strong>SPATIE</strong>, of tik op een antwoord.<br>` +
      `Je hebt er minstens <strong>${PASS}</strong> goed nodig.`,

    drawBackground(ctx) {
      G.drawClassroom(ctx);
    },

    start(api) {
      this.api = api;
      this.test = makeTest();
      this.index = 0;
      this.correct = 0;
      this.phase = "question";
      this.timeLeft = TIME_MS;
      this.feedback = null;
      this.choice = G.makeChoice(this.test[0].options);
    },

    onDirection(dx) {
      if (this.phase === "question") this.choice.onDirection(dx);
    },

    onAction() {
      if (this.phase === "question") this.answer(this.choice.selected);
    },

    onPointer(x, y) {
      if (this.phase !== "question") return;
      const i = this.choice.hit(x, y);
      if (i >= 0) this.answer(i);
    },

    answer(i) {
      const q = this.test[this.index];
      const ok = i >= 0 && q.options[i] === q.answer;
      if (ok) this.correct++;
      this.feedback = { ok, text: ok ? "Goed!" : `Fout: het was ${q.answer}` };
      this.phase = "feedback";
      this.timer = FEEDBACK_MS;
    },

    next() {
      this.index++;
      if (this.index < this.test.length) {
        this.phase = "question";
        this.timeLeft = TIME_MS;
        this.choice = G.makeChoice(this.test[this.index].options);
        return;
      }
      if (this.correct >= PASS) {
        this.phase = "ceremony";
        this.timer = CEREMONY_MS;
      } else {
        this.api.fail(`Gezakt: ${this.correct} van de ${QUESTIONS} goed. Je had er ${PASS} nodig.`);
      }
    },

    update(dt) {
      if (this.phase === "question") {
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) this.answer(-1);
        return;
      }
      this.timer -= dt;
      if (this.timer > 0) return;
      if (this.phase === "feedback") this.next();
      else if (this.phase === "ceremony") this.api.complete();
    },

    render(ctx, t) {
      if (this.phase === "ceremony") {
        drawHall(ctx, t);
        const k = Math.min(1, (1 - this.timer / CEREMONY_MS) * 2);
        G.drawKid(ctx, 360, 390, 1.25, TEACHER_LOOK, { adult: true, facing: -1, t, armAngle: 0.1 });
        const hand = G.drawKid(ctx, 170 + k * 90, 390, 1.15, G.playerKidLook(), { t, pose: k < 1 ? "walk" : "stand", armAngle: k >= 1 ? -1.9 : undefined });
        drawDiploma(ctx, k >= 1 ? hand.x : 330, k >= 1 ? hand.y - 6 : 330, 1.4);
        G.drawBanner(ctx, `Geslaagd! ${this.correct} / ${QUESTIONS}`, "#6ee07a", 110);
        return;
      }

      G.drawClassroom(ctx);
      ctx.fillStyle = "rgba(10, 8, 24, 0.82)";
      ctx.beginPath();
      ctx.roundRect(30, 40, W - 60, 270, 18);
      ctx.fill();

      const q = this.test[this.index];
      ctx.textAlign = "left";
      ctx.fillStyle = "#9fd3ff";
      ctx.font = "bold 14px Segoe UI, Roboto, sans-serif";
      ctx.fillText(`Vraag ${this.index + 1} / ${QUESTIONS} · ${q.subject}`, 54, 72);
      ctx.textAlign = "right";
      ctx.fillStyle = "#a0ffb4";
      ctx.fillText(`Goed: ${this.correct}`, W - 54, 72);

      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      ctx.font = q.subject === "Rekenen" ? "bold 40px Segoe UI, Roboto, sans-serif" : "bold 22px Segoe UI, Roboto, sans-serif";
      wrapText(ctx, q.text, W / 2, q.subject === "Rekenen" ? 175 : 150, W - 120, 30);

      if (this.phase === "question") {
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.fillRect(54, 280, W - 108, 6);
        ctx.fillStyle = "#ffd873";
        ctx.fillRect(54, 280, (W - 108) * Math.max(0, this.timeLeft / TIME_MS), 6);
        this.choice.draw(ctx, t);
      } else if (this.feedback) {
        G.drawBanner(ctx, this.feedback.text, this.feedback.ok ? "#6ee07a" : "#ff6b6b", 250);
      }
    },

    hud() {
      if (this.phase === "ceremony") return "";
      return `Eindtoets: vraag ${Math.min(this.index + 1, QUESTIONS)} / ${QUESTIONS} · goed: ${this.correct}`;
    },
  };
})();
