(() => {
  const CELL = 30;
  const COLS = 18;
  const ROWS = 15;
  const TARGET_EGGS = 15;
  const STEP_MS = 150;

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const confettiCanvas = document.getElementById("confettiCanvas");
  const confettiCtx = confettiCanvas.getContext("2d");

  const scoreEl = document.getElementById("score");

  const startScreen = document.getElementById("startScreen");
  const winScreen = document.getElementById("winScreen");

  const startBtn = document.getElementById("startBtn");
  const playAgainBtn = document.getElementById("playAgainBtn");

  let sperm, dir, nextDir, egg, score, acc, lastTime;
  let animFrame = 0;
  let state = "idle"; // idle | playing | win
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
    acc = 0;
    lastTime = performance.now();
    animFrame = 0;
    egg = spawnEgg();
    scoreEl.textContent = "0";
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
    const newHead = {
      x: (head.x + dir.x + COLS) % COLS,
      y: (head.y + dir.y + ROWS) % ROWS,
    };

    sperm.unshift(newHead);

    if (newHead.x === egg.x && newHead.y === egg.y) {
      score++;
      scoreEl.textContent = String(score);

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

  function headSize() {
    return Math.min(CELL * 0.5, CELL * 0.34 + score * 0.35);
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
    const r = CELL * 0.4;

    const grad = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, r);
    grad.addColorStop(0, "#fff6e0");
    grad.addColorStop(0.5, "#ffd873");
    grad.addColorStop(1, "#ffb648");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 220, 150, 0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }

  // Converts a grid cell to pixel-space center, unwrapping around the torus
  // edges relative to a reference point so a wrapped body doesn't draw a
  // line straight across the board.
  function toPixel(cell, ref) {
    let x = cell.x;
    let y = cell.y;
    if (ref) {
      if (x - ref.x > COLS / 2) x -= COLS;
      if (ref.x - x > COLS / 2) x += COLS;
      if (y - ref.y > ROWS / 2) y -= ROWS;
      if (ref.y - y > ROWS / 2) y += ROWS;
    }
    return { x: x * CELL + CELL / 2, y: y * CELL + CELL / 2 };
  }

  function drawSperm() {
    // Build a continuous, unwrapped point path through the whole body so the
    // flagellum reads as one long tapering, wiggling tail behind an
    // almond-shaped head, rather than a chain of separate blobs.
    const points = [];
    let ref = sperm[0];
    for (const seg of sperm) {
      const p = toPixel(seg, ref);
      points.push(p);
      ref = { x: p.x / CELL, y: p.y / CELL };
    }

    // extend a fine whip tip beyond the last real segment for extra realism
    const last = points[points.length - 1];
    const prev = points[points.length - 2] || last;
    let tdx = last.x - prev.x;
    let tdy = last.y - prev.y;
    const tlen = Math.hypot(tdx, tdy) || 1;
    tdx /= tlen;
    tdy /= tlen;
    const tipExtra = 3;
    for (let i = 1; i <= tipExtra; i++) {
      points.push({
        x: last.x + tdx * CELL * 0.6 * i,
        y: last.y + tdy * CELL * 0.6 * i,
      });
    }

    // wiggle each point perpendicular to the local path direction
    const wiggled = points.map((p, i) => {
      if (i === 0) return p;
      const a = points[i - 1];
      let dx = p.x - a.x;
      let dy = p.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const t = i / points.length;
      const amp = CELL * 0.22 * t;
      const wave = Math.sin(animFrame * 0.25 - i * 0.9) * amp;
      return { x: p.x + nx * wave, y: p.y + ny * wave };
    });

    // draw the flagellum as a tapering, translucent stroked path
    const segCount = wiggled.length - 1;
    for (let i = 0; i < segCount; i++) {
      const t = i / segCount;
      const width = Math.max(0.6, 3.2 * (1 - t));
      const alpha = 0.85 * (1 - t * 0.6);
      ctx.strokeStyle = `rgba(232, 226, 210, ${alpha})`;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(wiggled[i].x, wiggled[i].y);
      ctx.lineTo(wiggled[i + 1].x, wiggled[i + 1].y);
      ctx.stroke();
    }

    // head: an almond/oval shape typical of a real sperm cell
    const head = sperm[0];
    const hx = head.x * CELL + CELL / 2;
    const hy = head.y * CELL + CELL / 2;
    const r = headSize();
    const angle = Math.atan2(dir.y, dir.x);

    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(angle);

    const grad = ctx.createRadialGradient(
      -r * 0.2,
      -r * 0.2,
      r * 0.1,
      0,
      0,
      r * 1.2
    );
    grad.addColorStop(0, "#fffaf0");
    grad.addColorStop(0.55, "#f0e6cf");
    grad.addColorStop(1, "#d8c9a8");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.15, r * 0.78, 0, 0, Math.PI * 2);
    ctx.fill();

    // acrosome cap: darker crescent over the front half of the head
    ctx.fillStyle = "rgba(150, 130, 95, 0.35)";
    ctx.beginPath();
    ctx.ellipse(r * 0.25, 0, r * 0.72, r * 0.55, 0, -Math.PI / 2, Math.PI / 2);
    ctx.fill();

    ctx.restore();
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

    while (acc >= STEP_MS) {
      step();
      acc -= STEP_MS;
      if (state !== "playing") break;
    }

    render();
    requestAnimationFrame(loop);
  }

  function startGame() {
    resetGame();
    state = "playing";
    startScreen.classList.add("hidden");
    winScreen.classList.add("hidden");
    stopConfetti();
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  startBtn.addEventListener("click", startGame);
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
