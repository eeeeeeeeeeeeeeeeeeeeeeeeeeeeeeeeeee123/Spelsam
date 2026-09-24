(() => {
  const CELL = 20;
  const COLS = 30;
  const ROWS = 30;
  const TARGET_EGGS = 15;
  const BASE_STEP_MS = 160;
  const MIN_STEP_MS = 80;

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const confettiCanvas = document.getElementById("confettiCanvas");
  const confettiCtx = confettiCanvas.getContext("2d");

  const scoreEl = document.getElementById("score");
  const speedEl = document.getElementById("speedDisplay");
  const finalScoreEl = document.getElementById("finalScore");

  const startScreen = document.getElementById("startScreen");
  const gameOverScreen = document.getElementById("gameOverScreen");
  const winScreen = document.getElementById("winScreen");

  const startBtn = document.getElementById("startBtn");
  const retryBtn = document.getElementById("retryBtn");
  const playAgainBtn = document.getElementById("playAgainBtn");

  let sperm, dir, nextDir, egg, score, alive, stepMs, acc, lastTime;
  let animFrame = 0;
  let state = "idle"; // idle | playing | gameover | win
  let confettiParticles = [];
  let confettiRunning = false;

  function resetGame() {
    const cx = Math.floor(COLS / 2);
    const cy = Math.floor(ROWS / 2);
    sperm = [
      { x: cx, y: cy },
      { x: cx - 1, y: cy },
      { x: cx - 2, y: cy },
    ];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score = 0;
    alive = true;
    stepMs = BASE_STEP_MS;
    acc = 0;
    lastTime = performance.now();
    animFrame = 0;
    egg = spawnEgg();
    scoreEl.textContent = "0";
    speedEl.textContent = "1x";
  }

  function spawnEgg() {
    let pos;
    do {
      pos = {
        x: Math.floor(Math.random() * COLS),
        y: Math.floor(Math.random() * ROWS),
      };
    } while (sperm.some((s) => s.x === pos.x && s.y === pos.y));
    return pos;
  }

  function setDirection(dx, dy) {
    if (dir.x === -dx && dir.y === -dy) return; // no reversing into self
    nextDir = { x: dx, y: dy };
  }

  window.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowUp":
      case "w":
      case "W":
        setDirection(0, -1);
        break;
      case "ArrowDown":
      case "s":
      case "S":
        setDirection(0, 1);
        break;
      case "ArrowLeft":
      case "a":
      case "A":
        setDirection(-1, 0);
        break;
      case "ArrowRight":
      case "d":
      case "D":
        setDirection(1, 0);
        break;
    }
  });

  document.querySelectorAll("#touchControls button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const d = btn.dataset.dir;
      if (d === "up") setDirection(0, -1);
      if (d === "down") setDirection(0, 1);
      if (d === "left") setDirection(-1, 0);
      if (d === "right") setDirection(1, 0);
    });
  });

  function step() {
    dir = nextDir;
    const head = sperm[0];
    const newHead = { x: head.x + dir.x, y: head.y + dir.y };

    if (
      newHead.x < 0 ||
      newHead.x >= COLS ||
      newHead.y < 0 ||
      newHead.y >= ROWS ||
      sperm.some((s) => s.x === newHead.x && s.y === newHead.y)
    ) {
      alive = false;
      state = "gameover";
      finalScoreEl.textContent = String(score);
      gameOverScreen.classList.remove("hidden");
      return;
    }

    sperm.unshift(newHead);

    if (newHead.x === egg.x && newHead.y === egg.y) {
      score++;
      scoreEl.textContent = String(score);
      stepMs = Math.max(MIN_STEP_MS, BASE_STEP_MS - score * 5);
      speedEl.textContent = (BASE_STEP_MS / stepMs).toFixed(1) + "x";

      if (score >= TARGET_EGGS) {
        state = "win";
        winScreen.classList.remove("hidden");
        startConfetti();
        return;
      }
      egg = spawnEgg();
    } else {
      sperm.pop();
    }
  }

  function headRadius() {
    return Math.min(CELL * 0.55, CELL * 0.32 + score * 0.6);
  }

  function drawBackground() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#1a2147";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL, 0);
      ctx.lineTo(x * CELL, ROWS * CELL);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL);
      ctx.lineTo(COLS * CELL, y * CELL);
      ctx.stroke();
    }
  }

  function drawEgg() {
    const cx = egg.x * CELL + CELL / 2;
    const cy = egg.y * CELL + CELL / 2;
    const r = CELL * 0.42;

    const grad = ctx.createRadialGradient(cx - 3, cy - 3, 2, cx, cy, r);
    grad.addColorStop(0, "#fff6e0");
    grad.addColorStop(0.5, "#ffd873");
    grad.addColorStop(1, "#ffb648");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSperm() {
    // tail (flagellum) wiggling behind the last body segment
    const tail = sperm[sperm.length - 1];
    const prev = sperm[sperm.length - 2] || tail;
    const dx = tail.x - prev.x || 1;
    const dy = tail.y - prev.y || 0;

    ctx.strokeStyle = "#7fd1ff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    let sx = tail.x * CELL + CELL / 2;
    let sy = tail.y * CELL + CELL / 2;
    ctx.moveTo(sx, sy);
    const segments = 5;
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const wave = Math.sin(animFrame * 0.3 + i) * (CELL * 0.35) * t;
      const px = sx + dx * CELL * t * 1.3;
      const py = sy + dy * CELL * t * 1.3 + (dx !== 0 ? wave : 0);
      const py2 = sy + dy * CELL * t * 1.3;
      const px2 = px + (dy !== 0 ? wave : 0);
      ctx.lineTo(dx !== 0 ? px2 : px, dy !== 0 ? py2 : py);
    }
    ctx.stroke();

    // body segments (excluding head), shrinking toward tail
    for (let i = sperm.length - 1; i >= 1; i--) {
      const seg = sperm[i];
      const cx = seg.x * CELL + CELL / 2;
      const cy = seg.y * CELL + CELL / 2;
      const shrink = 1 - (i / sperm.length) * 0.4;
      const r = headRadius() * 0.75 * shrink;
      ctx.fillStyle = `rgba(140, 190, 255, ${0.5 + shrink * 0.4})`;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // head
    const head = sperm[0];
    const hx = head.x * CELL + CELL / 2;
    const hy = head.y * CELL + CELL / 2;
    const r = headRadius();

    const grad = ctx.createRadialGradient(hx - 2, hy - 2, 1, hx, hy, r);
    grad.addColorStop(0, "#eaf7ff");
    grad.addColorStop(1, "#5fb4ff");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(
      hx,
      hy,
      r * 1.1,
      r * 0.9,
      Math.atan2(dir.y, dir.x),
      0,
      Math.PI * 2
    );
    ctx.fill();

    // little eyes for personality
    const eyeOffsetX = dir.x * r * 0.4 - dir.y * r * 0.3;
    const eyeOffsetY = dir.y * r * 0.4 + dir.x * r * 0.3;
    ctx.fillStyle = "#12203a";
    ctx.beginPath();
    ctx.arc(hx + eyeOffsetX, hy + eyeOffsetY, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
  }

  function render() {
    drawBackground();
    drawEgg();
    drawSperm();
  }

  function loop(timestamp) {
    if (state !== "playing") return;
    const delta = timestamp - lastTime;
    lastTime = timestamp;
    acc += delta;
    animFrame++;

    while (acc >= stepMs) {
      if (alive) step();
      acc -= stepMs;
      if (state !== "playing") break;
    }

    render();
    requestAnimationFrame(loop);
  }

  function startGame() {
    resetGame();
    state = "playing";
    startScreen.classList.add("hidden");
    gameOverScreen.classList.add("hidden");
    winScreen.classList.add("hidden");
    stopConfetti();
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  startBtn.addEventListener("click", startGame);
  retryBtn.addEventListener("click", startGame);
  playAgainBtn.addEventListener("click", startGame);

  // ---- Confetti ----
  const confettiColors = ["#ff8fb1", "#7fd1ff", "#ffd873", "#a0ffb4", "#c9a0ff"];

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
        color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
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
    if (!confettiRunning) return;
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    let anyActive = false;
    for (const p of confettiParticles) {
      p.y += p.speedY;
      p.x += p.speedX;
      p.rotation += p.rotSpeed;
      if (p.y < confettiCanvas.height + 20) anyActive = true;

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

    if (state === "win") {
      requestAnimationFrame(confettiLoop);
    } else {
      confettiRunning = false;
    }
  }

  // initial idle render
  resetGame();
  render();
})();
