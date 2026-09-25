(() => {
  const { W, H } = G;
  const GANG_LOOK = {
    skin: "#c68e6e",
    shade: "#a8715a",
    hair: "kort",
    hairColor: "#1a1212",
    eyes: G.EYES.bruin,
    gender: "jongen",
    shirt: "#2a2f45",
    pants: "#1c2030",
  };

  function drawCourt(ctx) {
    ctx.fillStyle = "#8fc5e8";
    ctx.fillRect(0, 0, W, 170);
    ctx.fillStyle = "#c46b3f";
    ctx.fillRect(0, 170, W, H - 170);
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(W / 2, 170, 90, 0, Math.PI);
    ctx.stroke();
    // fence
    ctx.strokeStyle = "rgba(80, 80, 80, 0.5)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 14) {
      ctx.beginPath();
      ctx.moveTo(x, 90);
      ctx.lineTo(x + 40, 170);
      ctx.moveTo(x + 40, 90);
      ctx.lineTo(x, 170);
      ctx.stroke();
    }
    // hoop
    ctx.fillStyle = "#555";
    ctx.fillRect(W / 2 - 3, 60, 6, 110);
    ctx.fillStyle = "#fff";
    ctx.fillRect(W / 2 - 34, 36, 68, 44);
    ctx.strokeStyle = "#e0453a";
    ctx.lineWidth = 3;
    ctx.strokeRect(W / 2 - 14, 52, 28, 20);
    ctx.beginPath();
    ctx.ellipse(W / 2, 82, 16, 4, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawBasketball(ctx, x, y) {
    ctx.fillStyle = "#e8742f";
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#5a2a10";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x - 9, y);
    ctx.lineTo(x + 9, y);
    ctx.moveTo(x, y - 9);
    ctx.lineTo(x, y + 9);
    ctx.stroke();
  }

  let friends = [];

  function drawFriends(ctx, t) {
    if (!friends.length) friends = [G.randomLook(), G.randomLook()];
    G.drawKid(ctx, 70, 200, 0.75, friends[0], { t, sad: true });
    G.drawKid(ctx, W - 70, 200, 0.75, friends[1], { t, facing: -1, sad: true });
  }

  G.c2level6 = G.makeFightLevel({
    title: "Level 6 — Het basketbalveld (9 jaar)",
    intro:
      "Een middagje basketballen met je vrienden.<br>" +
      "<strong>Pijltjes</strong> = lopen, <strong>SPATIE</strong> = slaan, <strong>B</strong> ingedrukt houden = blokken.<br>" +
      "Licht een vuist <strong>geel</strong> op? Dan komt er een klap aan.",
    bounds: { minX: 50, maxX: W - 50, minY: 250, maxY: H - 20 },
    labels: { player: "Jij", enemy: "Bendelid" },
    enemySpeed: 115,
    winText: "Gewonnen. Maar was die bal het echt waard?",
    loseReason: "Het bendelid was sterker. Je verloor het gevecht.",
    script: [
      { who: "enemy", text: "Hé jij. Geef me die bal.", ms: 2000 },
      { who: "player", text: "Nee, wij zijn aan het spelen.", ms: 2000 },
      { who: "enemy", text: "Wát zei je?! Kom maar op dan!", ms: 2000 },
    ],

    drawBackground(ctx, t) {
      drawCourt(ctx);
      drawFriends(ctx, t);
    },

    drawIdle(ctx, t) {
      const hand = G.drawKid(ctx, 150, 340, 1, G.playerKidLook(), { t, armAngle: 0.4 });
      drawBasketball(ctx, hand.x + 6, hand.y);
    },

    drawActor(ctx, who, pos, facing, stance, t) {
      if (who === "enemy") {
        const hand = G.drawKid(ctx, pos.x, pos.y, 1.05, GANG_LOOK, { adult: true, pose: stance.dizzy ? "down" : "stand", facing, t, armAngle: stance.dizzy ? undefined : stance.angle, angry: stance.angry, dizzy: stance.dizzy, flash: stance.flash });
        if (stance.glow) {
          ctx.fillStyle = "rgba(255, 224, 102, 0.6)";
          ctx.beginPath();
          ctx.arc(hand.x, hand.y, 12, 0, Math.PI * 2);
          ctx.fill();
        }
        return;
      }
      G.drawKid(ctx, pos.x, pos.y, 1, G.playerKidLook(), { facing, t, armAngle: stance.angle, flash: stance.flash });
    },
  });
})();
