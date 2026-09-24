(() => {
  const { W, H } = G;
  const WORDS_PER_GAME = 3;
  const FEEDBACK_MS = 3000;

  const WORDS = [
    ["zaadcel", "De mannelijke geslachtscel: een kop vol DNA en een staart om mee te zwemmen."],
    ["eicel", "De vrouwelijke geslachtscel, de grootste cel van het menselijk lichaam."],
    ["vagina", "De eerste etappe: een zure omgeving die bacteriën en veel zaadcellen tegenhoudt."],
    ["baarmoederhals", "De nauwe doorgang tussen vagina en baarmoeder, afgesloten met slijm."],
    ["baarmoeder", "Hier nestelt het embryo zich later en groeit de baby."],
    ["eileider", "De buis tussen eierstok en baarmoeder. Hier vindt de bevruchting plaats."],
    ["eierstok", "Maakt eicellen en hormonen. Elke maand komt er één eicel vrij."],
    ["eisprong", "Het moment dat een eicel vrijkomt uit de eierstok."],
    ["bevruchting", "Zaadcel en eicel versmelten tot één nieuwe cel."],
    ["acrosoom", "Het kapje op de kop van de zaadcel, vol enzymen om de eicel open te breken."],
    ["zweepstaart", "De staart waarmee de zaadcel zwemt."],
    ["trilhaartjes", "Kleine haartjes in de eileider die de eicel richting baarmoeder duwen."],
    ["baarmoederslijm", "Rond de eisprong wordt dit slijm dunner, zodat zaadcellen erdoor kunnen."],
    ["witte bloedcel", "Afweercel die zaadcellen als indringers ziet en opruimt."],
    ["celkern", "Het deel van de cel waar het DNA zit."],
    ["chromosomen", "Dragers van het DNA. Een zaadcel en een eicel hebben er elk 23."],
    ["zygote", "De allereerste cel na de bevruchting."],
    ["embryo", "De zygote deelt zich steeds verder en wordt een embryo."],
    ["innesteling", "Het embryo nestelt zich in de wand van de baarmoeder."],
    ["placenta", "De moederkoek: voedt de baby via de navelstreng."],
  ];

  const panel = document.getElementById("wordPanel");
  const targetEl = document.getElementById("wordTarget");
  const inputEl = document.getElementById("wordInput");
  const timerEl = document.getElementById("wordTimer");
  const feedbackEl = document.getElementById("wordFeedback");

  const normalize = (s) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const timeFor = (word) => 8000 + word.length * 400;

  function drawBackground(ctx, t) {
    G.fillBackdrop(ctx, "#5e1f4a", "#3d1334");
    // the uterus splits into two fallopian tubes
    ctx.strokeStyle = "rgba(255, 170, 210, 0.25)";
    ctx.lineWidth = 46;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(W / 2, H + 20);
    ctx.lineTo(W / 2, H * 0.6);
    ctx.quadraticCurveTo(W / 2, H * 0.35, W * 0.12, H * 0.12);
    ctx.moveTo(W / 2, H * 0.6);
    ctx.quadraticCurveTo(W / 2, H * 0.35, W * 0.88, H * 0.12);
    ctx.stroke();
    G.drawFloaters(ctx, t, "rgba(255, 200, 230, 0.08)", 10, 6);
    const angle = -Math.PI / 2;
    G.drawSperm(ctx, G.freeSpermPoints(W / 2, H * 0.78, angle, 5, 7), angle, 10, t);
  }

  const level = {
    title: "Level 4 — Welke eileider?",
    intro:
      "Je staat op de splitsing: maar <strong>één eileider</strong> heeft een eicel.<br>" +
      `Typ <strong>${WORDS_PER_GAME} biologische woorden</strong> goed over om de juiste weg te vinden. ` +
      "<strong>1 letter fout</strong> mag. Druk op <strong>Enter</strong> om te bevestigen.",

    drawBackground,

    start(api) {
      this.api = api;
      this.words = G.shuffle(WORDS).slice(0, WORDS_PER_GAME);
      this.index = 0;
      this.active = true;
      panel.classList.remove("hidden");
      this.showWord();
    },

    showWord() {
      const [word] = this.words[this.index];
      this.timeLeft = timeFor(word);
      this.feedbackLeft = 0;
      targetEl.textContent = word;
      feedbackEl.textContent = "";
      feedbackEl.className = "";
      inputEl.value = "";
      inputEl.disabled = false;
      inputEl.focus();
    },

    submit() {
      if (!this.active || this.feedbackLeft > 0) return;
      const [word, explanation] = this.words[this.index];
      if (G.levenshtein(normalize(inputEl.value), word) <= 1) {
        feedbackEl.textContent = `Goed! ${explanation}`;
        feedbackEl.className = "good";
        inputEl.disabled = true;
        this.feedbackLeft = FEEDBACK_MS;
      } else {
        this.api.fail(`Fout getypt! Het woord was "${word}".`);
      }
    },

    update(dt) {
      if (this.feedbackLeft > 0) {
        this.feedbackLeft -= dt;
        if (this.feedbackLeft <= 0) {
          this.index++;
          if (this.index >= this.words.length) this.api.complete();
          else this.showWord();
        }
        return;
      }
      this.timeLeft -= dt;
      const [word] = this.words[this.index];
      timerEl.style.width = `${Math.max(0, this.timeLeft / timeFor(word)) * 100}%`;
      if (this.timeLeft <= 0) this.api.fail(`Tijd is op! Het woord was "${word}".`);
    },

    stop() {
      this.active = false;
      panel.classList.add("hidden");
      inputEl.blur();
    },

    render(ctx, t) {
      drawBackground(ctx, t);
    },

    hud() {
      return `Woord ${Math.min(this.index + 1, WORDS_PER_GAME)} / ${WORDS_PER_GAME}`;
    },
  };

  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      level.submit();
    }
  });
  document.getElementById("wordSubmit").addEventListener("click", () => level.submit());

  G.level4 = level;
})();
