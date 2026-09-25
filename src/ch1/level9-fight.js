(() => {
  const { W, H } = G;
  const SCALE = 1.1;

  G.level9 = G.makeFightLevel({
    title: "Level 9 — Het gevecht",
    intro:
      "Er kan er maar één als eerste geboren worden!<br>" +
      "Zwem rond met de <strong>pijltjes</strong> en sla met <strong>SPATIE</strong>. " +
      "Licht het zwaard van je tweeling <strong>geel</strong> op? Dan gaat die uithalen: <strong>zwem weg!</strong><br>" +
      "Sla vooral terug net na een uithaal: dan staat je tweeling open. Anders blokt die vaak.",
    bounds: { minX: 50, maxX: W - 50, minY: 110, maxY: H - 60 },
    labels: { player: "Jij", enemy: "Tweeling" },
    enemySpeed: 105,
    winText: "Gewonnen! Jij wordt eerst geboren!",
    loseReason: "Je tweeling was sterker. Je bent uitgeschakeld!",

    drawBackground: G.drawWomb,

    drawIdle(ctx, t) {
      G.drawFetus(ctx, 150, 280, SCALE, 1, G.PLAYER_LOOK, t);
      G.drawFetus(ctx, 390, 280, SCALE, -1, G.TWIN_LOOK, t);
    },

    drawActor(ctx, who, pos, facing, stance, t) {
      const look = who === "player" ? G.PLAYER_LOOK : G.TWIN_LOOK;
      const y = pos.y + Math.sin(t * 2 + (who === "player" ? 0 : 1)) * 4;
      G.drawFetus(ctx, pos.x, y, SCALE, facing, look, t, stance);
      if (stance.dizzy) return;
      const angle = G.heldAngle(stance.angle, facing);
      const hand = G.drawArm(ctx, pos.x, y, SCALE, facing, angle, look);
      G.drawCordSword(ctx, hand, angle, 62, 1, stance.glow);
    },
  });
})();
