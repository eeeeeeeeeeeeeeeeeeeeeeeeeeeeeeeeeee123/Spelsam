(() => {
  const { CELL } = G;

  function drawBackground(ctx, t) {
    G.fillBackdrop(ctx, "#5a1f3d", "#3a1330");
    // acid bubbles drifting upward
    G.drawFloaters(ctx, t, "rgba(170, 255, 120, 0.18)", 18, 18);
    G.drawGrid(ctx, 0.035);
  }

  function drawMilk(ctx, cell, t) {
    const cx = cell.x * CELL + CELL / 2;
    const cy = cell.y * CELL + CELL / 2 + Math.sin(t * 3) * 1.5;
    const topW = CELL * 0.62;
    const botW = CELL * 0.46;
    const h = CELL * 0.7;
    const top = cy - h / 2;
    const bot = cy + h / 2;

    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.arc(cx, cy, CELL * 0.55, 0, Math.PI * 2);
    ctx.fill();

    // glass
    ctx.fillStyle = "rgba(220, 235, 255, 0.35)";
    ctx.beginPath();
    ctx.moveTo(cx - topW / 2, top);
    ctx.lineTo(cx + topW / 2, top);
    ctx.lineTo(cx + botW / 2, bot);
    ctx.lineTo(cx - botW / 2, bot);
    ctx.closePath();
    ctx.fill();

    // milk inside
    const milkTop = top + h * 0.22;
    const k = (milkTop - top) / h;
    const wAtMilk = topW - (topW - botW) * k;
    ctx.fillStyle = "#fbfbf7";
    ctx.beginPath();
    ctx.moveTo(cx - wAtMilk / 2 + 1, milkTop);
    ctx.lineTo(cx + wAtMilk / 2 - 1, milkTop);
    ctx.lineTo(cx + botW / 2 - 1, bot - 1);
    ctx.lineTo(cx - botW / 2 + 1, bot - 1);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#6fb6ff";
    ctx.fillRect(cx - wAtMilk / 2 + 2, cy + 1, wAtMilk - 4, 3);
  }

  G.level1 = G.makeSnakeLevel({
    title: "Level 1 — De vagina",
    intro:
      "Het is hier <strong>zuur</strong>! Vang <strong>10 melkbekers</strong> om het zuur te neutraliseren.<br>" +
      "Bestuur met de <strong>pijltjes</strong> of <strong>WASD</strong>. Raak de rand of je eigen staart niet.",
    target: 10,
    itemLabel: "Melkbekers",
    drawBackground,
    drawItem: drawMilk,
  });
})();
