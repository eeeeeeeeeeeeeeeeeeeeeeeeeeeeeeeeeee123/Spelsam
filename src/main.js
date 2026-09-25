(() => {
  const MAX_HEARTS = 3;
  const CHAPTERS = [
    {
      name: "Hoofdstuk 1: Van zaadcel tot baby",
      short: "H1",
      levels: [G.level1, G.level2, G.level3, G.level4, G.level5, G.level6, G.level7, G.level8, G.level9],
      win: {
        title: "Je bent geboren! 🎉",
        emoji: "👶",
        text: "Je hebt je tweeling verslagen en bent als eerste geboren. Je tweeling komt 5 minuten later: jij bent de oudste!",
      },
    },
    {
      name: "Hoofdstuk 2: Opgroeien (0–11 jaar)",
      short: "H2",
      levels: [G.c2level1, G.c2level2, G.c2level3, G.c2level4, G.c2level5, G.c2level6, G.c2level7, G.c2level8, G.c2level9],
      win: {
        title: "Je bent 11 jaar! 🎉",
        emoji: "🤗",
        text: "Je hebt geleerd dat weglopen en een knuffel sterker zijn dan vechten. Geweld heeft altijd gevolgen.",
      },
    },
  ];

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const confettiCanvas = document.getElementById("confettiCanvas");
  const confettiCtx = confettiCanvas.getContext("2d");
  const previewCanvas = document.getElementById("previewCanvas");
  const previewCtx = previewCanvas.getContext("2d");

  const $ = (id) => document.getElementById(id);
  const screens = {
    home: $("homeScreen"),
    creator: $("creatorScreen"),
    intro: $("introScreen"),
    fail: $("failScreen"),
    gameover: $("gameOverScreen"),
    win: $("winScreen"),
  };

  let chapter = 0;
  let levelIndex = 0;
  let hearts = MAX_HEARTS;
  let mode = "home"; // home | creator | intro | playing | failed | gameover | win
  let lastTime = performance.now();
  let draft = { ...G.appearance };

  const levels = () => CHAPTERS[chapter].levels;
  const level = () => levels()[levelIndex];

  function showScreen(name) {
    for (const [key, el] of Object.entries(screens)) el.classList.toggle("hidden", key !== name);
  }

  function showGameOver(title, reason, note) {
    mode = "gameover";
    $("gameOverTitle").textContent = title;
    $("gameOverReason").textContent = reason;
    $("gameOverNote").textContent = note;
    showScreen("gameover");
  }

  const api = {
    complete() {
      if (mode !== "playing") return;
      level().stop?.();
      if (levelIndex === levels().length - 1) showWin();
      else {
        levelIndex++;
        showIntro(true);
      }
    },
    fail(reason) {
      if (mode !== "playing") return;
      level().stop?.();
      hearts--;
      if (hearts <= 0) {
        showGameOver("Game Over 💥", reason, "Je hartjes zijn op. Terug naar level 1 van dit hoofdstuk!");
      } else {
        mode = "failed";
        $("failReason").textContent = reason;
        $("failHearts").textContent = `Nog ${hearts} ${hearts === 1 ? "hartje" : "hartjes"} over.`;
        showScreen("fail");
      }
    },
    restartChapter(reason) {
      if (mode !== "playing") return;
      level().stop?.();
      showGameOver("Helemaal opnieuw", reason, "Het maakt niet uit hoeveel hartjes je had.");
    },
  };

  function showWin() {
    mode = "win";
    const w = CHAPTERS[chapter].win;
    $("winTitle").textContent = w.title;
    $("baby").textContent = w.emoji;
    $("winText").textContent = w.text;
    $("nextChapterBtn").classList.toggle("hidden", chapter === CHAPTERS.length - 1);
    showScreen("win");
    startConfetti();
  }

  function showIntro(justCompleted) {
    mode = "intro";
    $("introDone").classList.toggle("hidden", !justCompleted);
    $("introDone").textContent = `Level ${levelIndex} gehaald!`;
    $("introTitle").textContent = level().title;
    $("introText").innerHTML = level().intro;
    showScreen("intro");
  }

  function playLevel() {
    level().start(api);
    mode = "playing";
    showScreen(null);
    lastTime = performance.now();
  }

  function startChapter(index) {
    chapter = index;
    hearts = MAX_HEARTS;
    levelIndex = 0;
    stopConfetti();
    showIntro(false);
  }

  function showHome() {
    mode = "home";
    stopConfetti();
    showScreen("home");
  }

  // ---- Character creator ----
  function buildCreator() {
    const box = $("creatorOptions");
    box.textContent = "";
    const titles = { gender: "Ik ben een", skin: "Huidskleur", hair: "Haar", eyes: "Oogkleur" };
    for (const [key, options] of Object.entries(G.APPEARANCE_OPTIONS)) {
      const row = document.createElement("div");
      row.className = "option-row";
      const label = document.createElement("span");
      label.className = "option-label";
      label.textContent = titles[key];
      row.appendChild(label);
      for (const [value, text] of options) {
        const b = document.createElement("button");
        b.className = "option" + (draft[key] === value ? " selected" : "");
        b.textContent = text;
        b.addEventListener("click", (e) => {
          e.currentTarget.blur();
          draft[key] = value;
          buildCreator();
        });
        row.appendChild(b);
      }
      box.appendChild(row);
    }
  }

  function showCreator() {
    mode = "creator";
    draft = { ...G.appearance };
    buildCreator();
    showScreen("creator");
  }

  function drawPreview(t) {
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    const look = {
      ...G.SKINS[draft.skin],
      hair: draft.hair,
      hairColor: G.HAIR_COLOR,
      eyes: G.EYES[draft.eyes],
      gender: draft.gender,
      shirt: draft.gender === "meisje" ? "#e0679c" : "#4f8fdc",
    };
    G.drawKid(previewCtx, previewCanvas.width / 2 - 4, previewCanvas.height - 8, 1.6, look, { t });
  }

  // ---- Main loop ----
  function renderHud() {
    const inGame = mode !== "home" && mode !== "creator";
    $("hud").classList.toggle("hidden", !inGame);
    $("levelLabel").textContent = inGame ? `${CHAPTERS[chapter].short} · Level ${levelIndex + 1} / ${levels().length}` : "Race naar het Leven";
    $("hearts").textContent = inGame ? "❤️".repeat(Math.max(0, hearts)) + "🤍".repeat(MAX_HEARTS - Math.max(0, hearts)) : "";
    $("progress").textContent = mode === "playing" || mode === "failed" ? level().hud() : "";
  }

  function frame(now) {
    const dt = Math.min(50, now - lastTime);
    lastTime = now;
    const t = now / 1000;

    if (mode === "playing") level().update(dt, t);
    if (mode === "playing" || mode === "failed" || mode === "gameover") level().render(ctx, t);
    else level().drawBackground(ctx, t);
    if (mode === "creator") drawPreview(t);

    renderHud();
    requestAnimationFrame(frame);
  }

  // ---- Input ----
  const KEY_DIRS = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    s: "down",
    a: "left",
    d: "right",
  };
  const DIR_VECTORS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

  // Held directions, for levels with free movement instead of discrete steps.
  G.held = { up: false, down: false, left: false, right: false };

  function direction(name, repeat) {
    G.held[name] = true;
    const [dx, dy] = DIR_VECTORS[name];
    if (mode === "playing") level().onDirection?.(dx, dy, repeat);
  }

  function action() {
    if (mode === "playing") level().onAction?.();
  }

  const keyName = (e) => KEY_DIRS[e.key.length === 1 ? e.key.toLowerCase() : e.key];

  window.addEventListener("keydown", (e) => {
    if (e.target instanceof HTMLInputElement) return;
    const name = keyName(e);
    if (name) {
      e.preventDefault();
      direction(name, e.repeat);
    } else if (e.code === "Space") {
      e.preventDefault();
      if (!e.repeat) action();
    }
  });

  window.addEventListener("keyup", (e) => {
    const name = keyName(e);
    if (name) G.held[name] = false;
  });

  window.addEventListener("blur", () => {
    for (const name of Object.keys(G.held)) G.held[name] = false;
  });

  document.querySelectorAll("#touchControls [data-dir]").forEach((btn) => {
    const name = btn.dataset.dir;
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      direction(name, false);
    });
    for (const type of ["pointerup", "pointercancel", "pointerleave"]) {
      btn.addEventListener(type, () => {
        G.held[name] = false;
      });
    }
  });
  $("actionBtn").addEventListener("pointerdown", (e) => {
    e.preventDefault();
    action();
  });

  function canvasPoint(e) {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * canvas.width) / r.width, y: ((e.clientY - r.top) * canvas.height) / r.height };
  }

  canvas.addEventListener("pointerdown", (e) => {
    if (mode !== "playing") return;
    const p = canvasPoint(e);
    if (level().onPointer) level().onPointer(p.x, p.y);
    else action();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (mode !== "playing" || !level().onPointerMove) return;
    const p = canvasPoint(e);
    level().onPointerMove(p.x, p.y);
  });

  // Buttons keep focus after a click, and Space would then re-trigger them.
  function onButton(id, fn) {
    $(id).addEventListener("click", (e) => {
      e.currentTarget.blur();
      fn();
    });
  }
  onButton("chapter1Btn", () => startChapter(0));
  onButton("chapter2Btn", () => startChapter(1));
  onButton("appearanceBtn", showCreator);
  onButton("creatorDoneBtn", () => {
    G.setAppearance(draft);
    showHome();
  });
  onButton("introBtn", playLevel);
  onButton("introMenuBtn", showHome);
  onButton("retryBtn", playLevel);
  onButton("failMenuBtn", showHome);
  onButton("restartBtn", () => startChapter(chapter));
  onButton("gameOverMenuBtn", showHome);
  onButton("nextChapterBtn", () => startChapter(chapter + 1));
  onButton("winMenuBtn", showHome);

  // ---- Confetti ----
  const confettiColors = ["#ff8fb1", "#7fd1ff", "#ffd873", "#a0ffb4", "#c9a0ff"];
  let confettiParticles = [];
  let confettiRunning = false;

  function startConfetti() {
    confettiParticles = [];
    for (let i = 0; i < 160; i++) {
      confettiParticles.push({
        x: Math.random() * confettiCanvas.width,
        y: -Math.random() * confettiCanvas.height,
        size: 4 + Math.random() * 6,
        speedY: 2 + Math.random() * 3,
        speedX: (Math.random() - 0.5) * 2,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        color: G.pick(confettiColors),
      });
    }
    confettiRunning = true;
    requestAnimationFrame(confettiLoop);
  }

  function stopConfetti() {
    confettiRunning = false;
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }

  function confettiLoop() {
    if (!confettiRunning || mode !== "win") {
      stopConfetti();
      return;
    }
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    for (const p of confettiParticles) {
      p.y += p.speedY;
      p.x += p.speedX;
      p.rotation += p.rotSpeed;
      confettiCtx.save();
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate(p.rotation);
      confettiCtx.fillStyle = p.color;
      confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      confettiCtx.restore();
      if (p.y > confettiCanvas.height + 20) {
        p.y = -20;
        p.x = Math.random() * confettiCanvas.width;
      }
    }
    requestAnimationFrame(confettiLoop);
  }

  if (G.hasSavedAppearance()) showHome();
  else showCreator();
  requestAnimationFrame(frame);
})();
