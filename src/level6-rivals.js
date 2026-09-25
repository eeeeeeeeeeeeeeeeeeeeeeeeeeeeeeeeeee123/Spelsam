(() => {
  const { CELL, COLS, ROWS, W } = G;
  const TARGET = 10;
  const ON_MAP = 3;
  const MAX_MISSES = 3;
  const BULLET_CELLS_PER_S = 25;
  const NOTICE_MS = 1200;

  const same = (a, b) => a && b && a.x === b.x && a.y === b.y;

  function drawBackground(ctx, t) {
    G.fillBackdrop(ctx, "#4a2358", "#2e1538");
    G.drawFloaters(ctx, t, "rgba(220, 180, 255, 0.08)", 14, 8);
    G.drawGrid(ctx, 0.035);
  }

  // Cartoon pistol pointing right in local coordinates.
  function drawPistol(ctx, x, y, angle, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    if (Math.cos(angle) < -0.01) ctx.scale(1, -1);
    ctx.scale(scale, scale);
    ctx.fillStyle = "#5c6470";
    ctx.fillRect(-8, -6, 20, 7);
    ctx.fillStyle = "#3b414a";
    ctx.fillRect(-8, 0, 7, 10);
    ctx.fillStyle = "#8e98a6";
    ctx.fillRect(-6, -5, 16, 2);
    ctx.fillStyle = "#ff8fb1";
    ctx.fillRect(10, -6, 3, 3);
    ctx.restore();
  }

  function addRival(L) {
    const head = L.body[0];
    const pos = L.spawnFree((p) => Math.abs(p.x - head.x) + Math.abs(p.y - head.y) < 4);
    L.rivals.push({ ...pos, angle: Math.random() * Math.PI * 2 });
  }

  function notice(L, text, color) {
    L.notice = { text, color, life: NOTICE_MS };
  }

  function miss(L) {
    L.misses++;
    if (L.misses >= MAX_MISSES) L.fail("Je hebt 3 keer gemist!");
    else notice(L, `Mis! (${L.misses} / ${MAX_MISSES})`, "#ff6b6b");
  }

  function hit(L, index) {
    L.rivals.splice(index, 1);
    L.count++;
    L.grow();
    L.bullet = null;
    if (L.count >= TARGET) {
      L.win();
      return;
    }
    notice(L, "Raak!", "#a0ffb4");
    if (L.count + L.rivals.length < TARGET) addRival(L);
  }

  G.level6 = G.makeSnakeLevel({
    title: "Level 6 — De concurrentie",
    intro:
      "Duizenden andere <strong>zaadcellen</strong> willen ook naar de eicel. Schakel er <strong>10</strong> uit.<br>" +
      "Zoek eerst het <strong>pistool</strong> en zwem eroverheen. Kijk dan recht naar een concurrent (zelfde rij of kolom) en schiet met <strong>SPATIE</strong>. " +
      "Je wordt groter bij elke raak schot.<br>" +
      "<strong>3 keer mis</strong>, tegen een concurrent <strong>botsen</strong>, de rand of je eigen staart raken kost een hartje.",
    target: TARGET,
    drawBackground,

    setup(L) {
      L.rivals = [];
      L.gun = L.spawnFree();
      L.hasGun = false;
      L.misses = 0;
      L.bullet = null;
      L.notice = null;
      for (let i = 0; i < ON_MAP; i++) addRival(L);
    },

    blocked(L, p) {
      return same(L.gun, p) || (L.rivals || []).some((r) => same(r, p));
    },

    hazard(L, next) {
      return L.rivals.some((r) => same(r, next)) ? "Je botste tegen een andere zaadcel!" : null;
    },

    onEnter(L, next) {
      if (same(L.gun, next)) {
        L.gun = null;
        L.hasGun = true;
        notice(L, "Pistool opgepakt! Schiet met SPATIE", "#ffe066");
      }
    },

    onAction(L) {
      if (!L.hasGun) {
        notice(L, "Pak eerst het pistool!", "#ffe066");
        return;
      }
      if (L.bullet) return;
      const head = L.body[0];
      L.bullet = { ox: head.x, oy: head.y, dx: L.dir.x, dy: L.dir.y, travelled: 0, checked: 0 };
    },

    tick(L, dt) {
      if (L.notice) {
        L.notice.life -= dt;
        if (L.notice.life <= 0) L.notice = null;
      }
      const b = L.bullet;
      if (!b) return;
      b.travelled += (BULLET_CELLS_PER_S * dt) / 1000;
      while (b.checked < Math.floor(b.travelled)) {
        b.checked++;
        const x = b.ox + b.dx * b.checked;
        const y = b.oy + b.dy * b.checked;
        if (x < 0 || x >= COLS || y < 0 || y >= ROWS) {
          L.bullet = null;
          miss(L);
          return;
        }
        const i = L.rivals.findIndex((r) => r.x === x && r.y === y);
        if (i >= 0) {
          hit(L, i);
          return;
        }
      }
    },

    drawExtras(L, ctx, t) {
      if (L.gun) {
        const c = G.cellCenter(L.gun);
        const glow = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, CELL * 0.7);
        glow.addColorStop(0, `rgba(255, 224, 102, ${0.45 + Math.sin(t * 5) * 0.2})`);
        glow.addColorStop(1, "rgba(255, 224, 102, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(c.x, c.y, CELL * 0.7, 0, Math.PI * 2);
        ctx.fill();
        drawPistol(ctx, c.x, c.y + Math.sin(t * 3) * 2, 0, 1.1);
      }
      for (const r of L.rivals) {
        const c = G.cellCenter(r);
        const a = r.angle + Math.sin(t * 2 + r.x) * 0.3;
        G.drawSperm(ctx, G.freeSpermPoints(c.x, c.y, a, 4, 6), a, 9, t, G.RIVAL_PALETTE, 2);
      }
      const b = L.bullet;
      if (b) {
        const x = (b.ox + b.dx * b.travelled) * CELL + CELL / 2;
        const y = (b.oy + b.dy * b.travelled) * CELL + CELL / 2;
        ctx.fillStyle = "#ffe066";
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 224, 102, 0.4)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - b.dx * 16, y - b.dy * 16);
        ctx.stroke();
      }
    },

    drawOverlay(L, ctx, t) {
      if (L.hasGun) {
        const c = G.cellCenter(L.body[0]);
        const angle = Math.atan2(L.dir.y, L.dir.x);
        const r = L.headRadius();
        drawPistol(ctx, c.x + Math.cos(angle) * r * 0.9, c.y + Math.sin(angle) * r * 0.9, angle, 0.8);
      }
      ctx.font = "bold 14px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillText(`Missers: ${"✗".repeat(L.misses)}${"·".repeat(MAX_MISSES - L.misses)}`, 10, 20);
      if (L.notice) {
        ctx.globalAlpha = Math.min(1, L.notice.life / 300);
        ctx.fillStyle = L.notice.color;
        ctx.font = "bold 18px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(L.notice.text, W / 2, 26);
        ctx.globalAlpha = 1;
      }
    },

    hud(L) {
      return `Uitgeschakeld: ${L.count} / ${TARGET} · Pistool: ${L.hasGun ? "ja" : "nee"}`;
    },
  });
})();
