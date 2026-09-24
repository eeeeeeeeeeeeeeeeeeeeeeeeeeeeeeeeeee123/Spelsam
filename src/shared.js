window.G = window.G || {};

(() => {
  const CELL = 30;
  const COLS = 18;
  const ROWS = 15;

  G.CELL = CELL;
  G.COLS = COLS;
  G.ROWS = ROWS;
  G.W = COLS * CELL;
  G.H = ROWS * CELL;

  G.randInt = (n) => Math.floor(Math.random() * n);
  G.pick = (arr) => arr[G.randInt(arr.length)];
  G.clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  G.shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = G.randInt(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  G.cellCenter = (c) => ({ x: c.x * CELL + CELL / 2, y: c.y * CELL + CELL / 2 });

  G.PLAYER_PALETTE = {
    head: ["#fffaf0", "#f0e6cf", "#d8c9a8"],
    cap: "rgba(150, 130, 95, 0.35)",
    tail: [232, 226, 210],
  };

  G.RIVAL_PALETTE = {
    head: ["#eef2f6", "#b9c4cf", "#8e9aa6"],
    cap: "rgba(60, 70, 90, 0.45)",
    tail: [165, 178, 195],
  };

  // Points trailing straight behind a head at (x, y) facing `angle`.
  G.freeSpermPoints = (x, y, angle, segments, segLen) => {
    const pts = [];
    for (let i = 0; i <= segments; i++) {
      pts.push({
        x: x - Math.cos(angle) * segLen * i,
        y: y - Math.sin(angle) * segLen * i,
      });
    }
    return pts;
  };

  // Draws a sperm cell: almond head at points[0], a tapering wiggling
  // flagellum through the remaining points plus a fine whip tip.
  G.drawSperm = (ctx, points, angle, headR, t, palette = G.PLAYER_PALETTE, tipExtra = 3) => {
    const pts = points.slice();
    if (pts.length > 1 && tipExtra > 0) {
      const last = pts[pts.length - 1];
      const prev = pts[pts.length - 2];
      const len = Math.hypot(last.x - prev.x, last.y - prev.y) || 1;
      const ux = (last.x - prev.x) / len;
      const uy = (last.y - prev.y) / len;
      const step = headR * 1.1;
      for (let i = 1; i <= tipExtra; i++) {
        pts.push({ x: last.x + ux * step * i, y: last.y + uy * step * i });
      }
    }

    const wiggled = pts.map((p, i) => {
      if (i === 0) return p;
      const a = pts[i - 1];
      const len = Math.hypot(p.x - a.x, p.y - a.y) || 1;
      const nx = -(p.y - a.y) / len;
      const ny = (p.x - a.x) / len;
      const k = i / pts.length;
      const wave = Math.sin(t * 9 - i * 0.9) * headR * 0.55 * k;
      return { x: p.x + nx * wave, y: p.y + ny * wave };
    });

    const [tr, tg, tb] = palette.tail;
    const baseWidth = 1.5 + headR * 0.2;
    ctx.lineCap = "round";
    for (let i = 0; i < wiggled.length - 1; i++) {
      const k = i / (wiggled.length - 1);
      ctx.strokeStyle = `rgba(${tr}, ${tg}, ${tb}, ${0.9 * (1 - k * 0.6)})`;
      ctx.lineWidth = Math.max(0.6, baseWidth * (1 - k));
      ctx.beginPath();
      ctx.moveTo(wiggled[i].x, wiggled[i].y);
      ctx.lineTo(wiggled[i + 1].x, wiggled[i + 1].y);
      ctx.stroke();
    }

    const head = pts[0];
    ctx.save();
    ctx.translate(head.x, head.y);
    ctx.rotate(angle);
    const grad = ctx.createRadialGradient(-headR * 0.2, -headR * 0.2, headR * 0.1, 0, 0, headR * 1.2);
    grad.addColorStop(0, palette.head[0]);
    grad.addColorStop(0.55, palette.head[1]);
    grad.addColorStop(1, palette.head[2]);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, headR * 1.15, headR * 0.78, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = palette.cap;
    ctx.beginPath();
    ctx.ellipse(headR * 0.25, 0, headR * 0.72, headR * 0.55, 0, -Math.PI / 2, Math.PI / 2);
    ctx.fill();
    ctx.restore();
  };

  G.fillBackdrop = (ctx, top, bottom) => {
    const grad = ctx.createLinearGradient(0, 0, 0, G.H);
    grad.addColorStop(0, top);
    grad.addColorStop(1, bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, G.W, G.H);
  };

  G.drawGrid = (ctx, alpha = 0.04) => {
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= COLS; x++) {
      ctx.moveTo(x * CELL, 0);
      ctx.lineTo(x * CELL, G.H);
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.moveTo(0, y * CELL);
      ctx.lineTo(G.W, y * CELL);
    }
    ctx.stroke();
  };

  // Deterministic floating blobs for ambient background texture.
  G.drawFloaters = (ctx, t, color, count = 14, speed = 12) => {
    ctx.fillStyle = color;
    for (let i = 0; i < count; i++) {
      const seed = i * 97.13;
      const x = (Math.sin(seed) * 0.5 + 0.5) * G.W;
      const baseY = (Math.cos(seed * 1.7) * 0.5 + 0.5) * G.H;
      const y = (baseY - t * speed * (0.5 + (i % 3) * 0.3) + G.H * 10) % G.H;
      const r = 3 + (i % 4) * 2;
      ctx.beginPath();
      ctx.arc(x + Math.sin(t + i) * 6, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  G.levenshtein = (a, b) => {
    const m = a.length;
    const n = b.length;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      }
      prev = cur;
    }
    return prev[n];
  };
})();
