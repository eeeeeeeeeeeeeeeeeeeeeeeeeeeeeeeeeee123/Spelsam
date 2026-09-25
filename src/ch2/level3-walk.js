(() => {
  const { CELL, COLS, ROWS, W } = G;
  const START = { x: 1, y: 13 };
  const GOAL = { x: 16, y: 1 };
  const LEGOS = 28;
  const CAR_ROW = 7;
  const CAT_COL = 9;
  const CAR_SPEED = 3;
  const CAT_SPEED = 2;
  const LEGO_COLORS = ["#e04545", "#3f7fe0", "#f0c030", "#3fb65a"];

  const key = (p) => `${p.x},${p.y}`;

  function hasPath(blocked) {
    const seen = new Set([key(START)]);
    const queue = [START];
    while (queue.length) {
      const p = queue.shift();
      if (p.x === GOAL.x && p.y === GOAL.y) return true;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = { x: p.x + dx, y: p.y + dy };
        if (n.x < 0 || n.x >= COLS || n.y < 0 || n.y >= ROWS) continue;
        if (blocked.has(key(n)) || seen.has(key(n))) continue;
        seen.add(key(n));
        queue.push(n);
      }
    }
    return false;
  }

  function makeLegos() {
    for (;;) {
      const legos = new Map();
      while (legos.size < LEGOS) {
        const p = { x: G.randInt(COLS), y: G.randInt(ROWS) };
        const nearStart = Math.abs(p.x - START.x) + Math.abs(p.y - START.y) < 3;
        const nearGoal = Math.abs(p.x - GOAL.x) + Math.abs(p.y - GOAL.y) < 3;
        if (nearStart || nearGoal || p.y === CAR_ROW || p.x === CAT_COL) continue;
        legos.set(key(p), G.pick(LEGO_COLORS));
      }
      if (hasPath(legos)) return legos;
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

  function drawCar(ctx, x) {
    const px = x * CELL;
    const py = CAR_ROW * CELL;
    ctx.fillStyle = "#e0453a";
    ctx.fillRect(px + 2, py + 10, CELL - 4, 12);
    ctx.fillRect(px + 7, py + 4, CELL - 14, 8);
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.arc(px + 8, py + 23, 4, 0, Math.PI * 2);
    ctx.arc(px + CELL - 8, py + 23, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCat(ctx, y, t) {
    const cx = CAT_COL * CELL + CELL / 2;
    const cy = y * CELL + CELL / 2 + 3;
    ctx.fillStyle = "#6b6b6b";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 3, 11, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy - 7, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 11);
    ctx.lineTo(cx - 4, cy - 18);
    ctx.lineTo(cx - 1, cy - 12);
    ctx.moveTo(cx + 6, cy - 11);
    ctx.lineTo(cx + 4, cy - 18);
    ctx.lineTo(cx + 1, cy - 12);
    ctx.fill();
    ctx.strokeStyle = "#6b6b6b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx + 10, cy + 4);
    ctx.quadraticCurveTo(cx + 18, cy - 4 + Math.sin(t * 4) * 4, cx + 14, cy - 12);
    ctx.stroke();
  }

  G.c2level3 = {
    title: "Level 3 — Leren lopen (3 jaar)",
    intro:
      "Je leert <strong>lopen</strong>! Loop naar je ouder in de hoek. Elke druk op <strong>W A S D</strong> (of de pijltjes) is één stapje.<br>" +
      "Stap niet op <strong>lego</strong> en kijk uit voor de <strong>speelgoedauto</strong> en de <strong>kat</strong>. Vallen kost een hartje.",

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
      this.car = { x: 0, dir: 1 };
      this.cat = { y: 2, dir: 1 };
      this.over = false;
    },

    onDirection(dx, dy, repeat) {
      if (repeat || this.over) return;
      const nx = G.clamp(this.player.x + dx, 0, COLS - 1);
      const ny = G.clamp(this.player.y + dy, 0, ROWS - 1);
      if (dx) this.facing = dx;
      this.player = { x: nx, y: ny };
      this.walk = 250;
      if (this.legos.has(key(this.player))) {
        this.fall("Au! Je stapte op een lego en viel.");
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
      if (p.y === CAR_ROW && Math.abs(this.car.x + 0.5 - (p.x + 0.5)) < 0.8) this.fall("De speelgoedauto reed je omver!");
      else if (p.x === CAT_COL && Math.abs(this.cat.y - p.y) < 0.8) this.fall("Je struikelde over de kat!");
    },

    update(dt) {
      const s = dt / 1000;
      this.walk = Math.max(0, this.walk - dt);
      this.car.x += this.car.dir * CAR_SPEED * s;
      if (this.car.x <= 0 || this.car.x >= COLS - 1) {
        this.car.x = G.clamp(this.car.x, 0, COLS - 1);
        this.car.dir *= -1;
      }
      this.cat.y += this.cat.dir * CAT_SPEED * s;
      if (this.cat.y <= 0 || this.cat.y >= ROWS - 1) {
        this.cat.y = G.clamp(this.cat.y, 0, ROWS - 1);
        this.cat.dir *= -1;
      }
      if (!this.over) this.checkMovers();
    },

    render(ctx, t) {
      drawCarpet(ctx);
      ctx.fillStyle = "rgba(90, 60, 30, 0.15)";
      ctx.fillRect(0, CAR_ROW * CELL, W, CELL);
      ctx.fillRect(CAT_COL * CELL, 0, CELL, ROWS * CELL);
      for (const [k, color] of this.legos) {
        const [x, y] = k.split(",").map(Number);
        drawLego(ctx, x, y, color);
      }
      drawCar(ctx, this.car.x);
      drawCat(ctx, this.cat.y, t);

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
      const d = Math.abs(this.player.x - GOAL.x) + Math.abs(this.player.y - GOAL.y);
      return `Nog ${d} stapjes naar je ouder`;
    },
  };
})();
