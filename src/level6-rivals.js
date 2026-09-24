(() => {
  const { CELL } = G;

  function drawBackground(ctx, t) {
    G.fillBackdrop(ctx, "#4a2358", "#2e1538");
    G.drawFloaters(ctx, t, "rgba(220, 180, 255, 0.08)", 14, 8);
    G.drawGrid(ctx, 0.035);
  }

  function drawRival(ctx, cell, t, angle) {
    const c = G.cellCenter(cell);
    const a = angle + Math.sin(t * 2) * 0.3;
    const pts = G.freeSpermPoints(c.x, c.y, a, 4, 6);
    G.drawSperm(ctx, pts, a, 9, t, G.RIVAL_PALETTE, 2);
  }

  G.level6 = G.makeSnakeLevel({
    title: "Level 6 — De concurrentie",
    intro:
      "Duizenden andere <strong>zaadcellen</strong> willen ook naar de eicel.<br>" +
      "Schakel er <strong>10</strong> uit door ertegenaan te zwemmen. Je wordt groter bij elke concurrent.<br>" +
      "Raak de rand of je eigen staart niet.",
    target: 10,
    itemLabel: "Concurrenten",
    drawBackground,
    drawItem: drawRival,
  });
})();
