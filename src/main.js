(() => {
  const LEVELS = [G.level1, G.level2, G.level3, G.level4, G.level5, G.level6, G.level7, G.level8, G.level9];
  const MAX_HEARTS = 3;

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const confettiCanvas = document.getElementById("confettiCanvas");
  const confettiCtx = confettiCanvas.getContext("2d");

  const levelLabel = document.getElementById("levelLabel");
  const heartsEl = document.getElementById("hearts");
  const progressEl = document.getElementById("progress");

  const screens = {
    start: document.getElementById("startScreen"),
    intro: document.getElementById("introScreen"),
    fail: document.getElementById("failScreen"),
    gameover: document.getElementById("gameOverScreen"),
    win: document.getElementById("winScreen"),
  };
  const introDone = document.getElementById("introDone");
  const introTitle = document.getElementById("introTitle");
  const introText = document.getElementById("introText");
  const failReason = document.getElementById("failReason");
  const failHearts = document.getElementById("failHearts");
  const gameOverReason = document.getElementById("gameOverReason");

  let levelIndex = 0;
  let hearts = MAX_HEARTS;
  let mode = "start"; // start | intro | playing | failed | gameover | win
  let lastTime = performance.now();

  const level = () => LEVELS[levelIndex];

  function showScreen(name) {
    for (const [key, el] of Object.entries(screens)) el.classList.toggle("hidden", key !== name);
  }

  const api = {
    complete() {
      if (mode !== "playing") return;
      level().stop?.();
      if (levelIndex === LEVELS.length - 1) {
        mode = "win";
        showScreen("win");
        startConfetti();
      } else {
        levelIndex++;
        showIntro(true);
      }
    },
    fail(reason) {
      if (mode !== "playing") return;
      level().stop?.();
      hearts--;
      if (hearts <= 0) {
        mode = "gameover";
        gameOverReason.textContent = reason;
        showScreen("gameover");
      } else {
        mode = "failed";
        failReason.textContent = reason;
        failHearts.textContent = `Nog ${hearts} ${hearts === 1 ? "hartje" : "hartjes"} over.`;
        showScreen("fail");
      }
    },
  };

  function showIntro(justCompleted) {
    mode = "intro";
    introDone.classList.toggle("hidden", !justCompleted);
    introDone.textContent = `Level ${levelIndex} gehaald!`;
    introTitle.textContent = level().title;
    introText.innerHTML = level().intro;
    showScreen("intro");
  }

  function playLevel() {
    level().start(api);
    mode = "playing";
    showScreen(null);
    lastTime = performance.now();
  }

  function newGame() {
    hearts = MAX_HEARTS;
    levelIndex = 0;
    stopConfetti();
    showIntro(false);
  }

  function renderHud() {
    levelLabel.textContent = mode === "start" ? "Race naar het Leven" : `Level ${levelIndex + 1} / ${LEVELS.length}`;
    heartsEl.textContent = "❤️".repeat(hearts) + "🤍".repeat(MAX_HEARTS - hearts);
    progressEl.textContent = mode === "playing" || mode === "failed" ? level().hud() : "";
  }

  function frame(now) {
    const dt = Math.min(50, now - lastTime);
    lastTime = now;
    const t = now / 1000;

    if (mode === "playing") level().update(dt);
    if (mode === "playing" || mode === "failed" || mode === "gameover") level().render(ctx, t);
    else level().drawBackground(ctx, t);

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
  document.getElementById("actionBtn").addEventListener("pointerdown", (e) => {
    e.preventDefault();
    action();
  });
  canvas.addEventListener("pointerdown", action);

  // Buttons keep focus after a click, and Space would then re-trigger them.
  function onButton(id, fn) {
    document.getElementById(id).addEventListener("click", (e) => {
      e.currentTarget.blur();
      fn();
    });
  }
  onButton("startBtn", newGame);
  onButton("introBtn", playLevel);
  onButton("retryBtn", playLevel);
  onButton("restartBtn", newGame);
  onButton("playAgainBtn", newGame);

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

  showScreen("start");
  requestAnimationFrame(frame);
})();
