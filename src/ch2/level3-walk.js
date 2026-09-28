(() => {
  const { CELL, COLS, ROWS, W } = G;
  const START = { x: 1, y: 13 };
  const GOAL = { x: 16, y: 1 };
  const LEGOS = 26;
  // Moving hazards: cars drive along rows, pets walk along columns.
  const MOVERS = [
    { kind: "car", lane: 4, speed: 3.2, color: "#e0453a" },
    { kind: "car", lane: 8, speed: 4.4, color: "#3f7fe0" },
    { kind: "car", lane: 11, speed: 2.6, color: "#3fb65a" },
    { kind: "cat", lane: 6, speed: 2.3 },
    { kind: "dog", lane: 12, speed: 3.1 },
  ];
  const isLane = (p) => MOVERS.some((m) => (m.kind === "car" ? p.y === m.lane : p.x === m.lane));
  const LEGO_COLORS = ["#e04545", "#3f7fe0", "#f0c030", "#3fb65a"];

  const key = (p) => `${p.x},${p.y}`;

  // Steps from every free cell to the goal (BFS outward from the goal).
  function distances(blocked) {
    const dist = new Map([[key(GOAL), 0]]);
    const queue = [GOAL];
    while (queue.length) {
      const p = queue.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = { x: p.x + dx, y: p.y + dy };
        if (n.x < 0 || n.x >= COLS || n.y < 0 || n.y >= ROWS) continue;
        if (blocked.has(key(n)) || dist.has(key(n))) continue;
        dist.set(key(n), dist.get(key(p)) + 1);
        queue.push(n);
      }
    }
    return dist;
  }

  function makeLegos() {
    for (;;) {
      const legos = new Map();
      while (legos.size < LEGOS) {
        const p = { x: G.randInt(COLS), y: G.randInt(ROWS) };
        const nearStart = Math.abs(p.x - START.x) + Math.abs(p.y - START.y) < 3;
        const nearGoal = Math.abs(p.x - GOAL.x) + Math.abs(p.y - GOAL.y) < 3;
        if (nearStart || nearGoal || isLane(p)) continue;
        legos.set(key(p), G.pick(LEGO_COLORS));
      }
      if (distances(legos).has(key(START))) return legos;
    }
  }

  function drawCarpet(ctx) {
    ctx.fillStyle = "#e8d3b0";
    ctx.fillRect(0, 0, W, ROWS * CELL);
    ctx.fillStyle = "#d6b98f";
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if ((x + y) % 2 === 0) ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }
  }

  function drawLego(ctx, x, y, color) {
    const px = x * CELL + 5;
    const py = y * CELL + 9;
    ctx.fillStyle = color;
    ctx.fillRect(px, py, CELL - 10, CELL - 16);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.arc(px + 6 + i * 9, py - 1, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCar(ctx, x, row, color) {
    const px = x * CELL;
    const py = row * CELL;
    ctx.fillStyle = color;
    ctx.fillRect(px + 2, py + 10, CELL - 4, 12);
    ctx.fillRect(px + 7, py + 4, CELL - 14, 8);
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.arc(px + 8, py + 23, 4, 0, Math.PI * 2);
    ctx.arc(px + CELL - 8, py + 23, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPet(ctx, col, y, t, dog) {
    const cx = col * CELL + CELL / 2;
    const cy = y * CELL + CELL / 2 + 3;
    const fur = dog ? "#a0673a" : "#6b6b6b";
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 3, 11, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy - 7, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    if (dog) {
      ctx.ellipse(cx - 7, cy - 6, 3, 6, 0.3, 0, Math.PI * 2);
      ctx.ellipse(cx + 7, cy - 6, 3, 6, -0.3, 0, Math.PI * 2);
    } else {
      ctx.moveTo(cx - 6, cy - 11);
      ctx.lineTo(cx - 4, cy - 18);
      ctx.lineTo(cx - 1, cy - 12);
      ctx.moveTo(cx + 6, cy - 11);
      ctx.lineTo(cx + 4, cy - 18);
      ctx.lineTo(cx + 1, cy - 12);
    }
    ctx.fill();
    ctx.strokeStyle = fur;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx + 10, cy + 4);
    ctx.quadraticCurveTo(cx + 18, cy - 4 + Math.sin(t * 4) * 4, cx + 14, cy - 12);
    ctx.stroke();
  }

  G.c2level3 = {
    title: "Level 3 — Leren lopen (3 jaar)",
    intro:
      "Loop naar je ouder in de hoek. Elke druk op <strong>W A S D</strong> (of de pijltjes) is één stapje.<br>" +
      "Neem de <strong>snelste route</strong>: elke stap moet je dichterbij brengen. Wachten mag.<br>" +
      "Stap niet op <strong>lego</strong> en kijk uit voor alles wat beweegt.",

    drawBackground(ctx, t) {
      drawCarpet(ctx);
      const { mom } = G.parentLooks();
      G.drawKid(ctx, GOAL.x * CELL + CELL / 2, GOAL.y * CELL + CELL, 0.55, mom, { adult: true, facing: -1, armAngle: -0.6, t });
      G.drawKid(ctx, START.x * CELL + CELL / 2, START.y * CELL + CELL - 2, 0.42, G.playerKidLook(), { t });
    },

    start(api) {
      this.api = api;
      this.player = { ...START };
      this.facing = 1;
      this.walk = 0;
      this.legos = makeLegos();
      this.dist = distances(this.legos);
      this.budget = this.dist.get(key(START));
      this.steps = 0;
      this.movers = MOVERS.map((m) => ({ ...m, pos: Math.random() * (m.kind === "car" ? COLS - 1 : ROWS - 1), dir: Math.random() < 0.5 ? 1 : -1 }));
      this.over = false;
    },

    onDirection(dx, dy, repeat) {
      if (repeat || this.over) return;
      const nx = G.clamp(this.player.x + dx, 0, COLS - 1);
      const ny = G.clamp(this.player.y + dy, 0, ROWS - 1);
      if (dx) this.facing = dx;
      if (nx === this.player.x && ny === this.player.y) return;
      this.player = { x: nx, y: ny };
      this.steps++;
      this.walk = 250;
      if (this.legos.has(key(this.player))) {
        this.fall("Au! Je stapte op een lego en viel.");
        return;
      }
      if (this.steps + this.dist.get(key(this.player)) > this.budget) {
        this.fall("Omweg! Dat was niet de snelste route.");
        return;
      }
      this.checkMovers();
      if (!this.over && nx === GOAL.x && ny === GOAL.y) {
        this.over = true;
        this.api.complete();
      }
    },

    fall(reason) {
      this.over = true;
      this.api.fail(reason);
    },

    checkMovers() {
      const p = this.player;
      const reasons = { car: "Een speelgoedauto reed je omver!", cat: "Je struikelde over de kat!", dog: "De hond liep je omver!" };
      for (const m of this.movers) {
        const hit = m.kind === "car" ? p.y === m.lane && Math.abs(m.pos - p.x) < 0.8 : p.x === m.lane && Math.abs(m.pos - p.y) < 0.8;
        if (hit) {
          this.fall(reasons[m.kind]);
          return;
        }
      }
    },

    update(dt) {
      const s = dt / 1000;
      this.walk = Math.max(0, this.walk - dt);
      for (const m of this.movers) {
        const max = (m.kind === "car" ? COLS : ROWS) - 1;
        m.pos += m.dir * m.speed * s;
        if (m.pos <= 0 || m.pos >= max) {
          m.pos = G.clamp(m.pos, 0, max);
          m.dir *= -1;
        }
      }
      if (!this.over) this.checkMovers();
    },

    render(ctx, t) {
      drawCarpet(ctx);
      ctx.fillStyle = "rgba(90, 60, 30, 0.15)";
      for (const m of this.movers) {
        if (m.kind === "car") ctx.fillRect(0, m.lane * CELL, W, CELL);
        else ctx.fillRect(m.lane * CELL, 0, CELL, ROWS * CELL);
      }
      for (const [k, color] of this.legos) {
        const [x, y] = k.split(",").map(Number);
        drawLego(ctx, x, y, color);
      }
      for (const m of this.movers) {
        if (m.kind === "car") drawCar(ctx, m.pos, m.lane, m.color);
        else drawPet(ctx, m.lane, m.pos, t, m.kind === "dog");
      }

      const { mom } = G.parentLooks();
      G.drawKid(ctx, GOAL.x * CELL + CELL / 2, GOAL.y * CELL + CELL, 0.55, mom, { adult: true, facing: -1, armAngle: -0.6, t });
      G.drawBubble(ctx, GOAL.x * CELL - 40, GOAL.y * CELL + 60, "Kom maar!");

      const p = this.player;
      const wobble = Math.sin(t * 8) * 0.08;
      ctx.save();
      ctx.translate(p.x * CELL + CELL / 2, p.y * CELL + CELL - 2);
      ctx.rotate(wobble);
      G.drawKid(ctx, 0, 0, 0.42, G.playerKidLook(), { pose: this.walk > 0 ? "walk" : "stand", facing: this.facing, t, armAngle: -0.4 });
      ctx.restore();
    },

    hud() {
      return `Stapjes: ${this.steps} / ${this.budget}`;
    },
  };
})();
