(() => {
  const { W, H } = G;

  G.drawWomb = (ctx, t) => {
    const g = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.7);
    g.addColorStop(0, "#9c3b55");
    g.addColorStop(0.7, "#6d2240");
    g.addColorStop(1, "#3e1026");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    G.drawFloaters(ctx, t, "rgba(255, 210, 220, 0.08)", 16, 4);
    // blood vessels in the uterine wall
    ctx.strokeStyle = "rgba(255, 120, 150, 0.12)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      const y = 30 + i * 80;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(W * 0.3, y + 40 * Math.sin(i), W * 0.6, y - 30, W, y + 20);
      ctx.stroke();
    }
  };

  // Local coordinates face right; `facing` of -1 mirrors the whole figure.
  G.drawFetus = (ctx, x, y, s, facing, look, t, opts = {}) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing * s, s);
    if (opts.flash) ctx.globalAlpha = 0.45 + 0.45 * Math.abs(Math.sin(t * 40));

    ctx.fillStyle = look.shade;
    ctx.beginPath();
    ctx.ellipse(-4, 36, 17, 10, 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = look.skin;
    ctx.beginPath();
    ctx.ellipse(0, 16, 20, 26, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(6, -20, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = look.hair;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(4, -44, 6, Math.PI * 0.9, Math.PI * 2.2);
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 120, 140, 0.35)";
    ctx.beginPath();
    ctx.arc(17, -11, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#3a2330";
    ctx.fillStyle = "#3a2330";
    ctx.lineWidth = 2;
    if (opts.dizzy) {
      ctx.beginPath();
      ctx.moveTo(12, -26);
      ctx.lineTo(19, -19);
      ctx.moveTo(19, -26);
      ctx.lineTo(12, -19);
      ctx.stroke();
    } else if (opts.angry) {
      ctx.beginPath();
      ctx.arc(16, -21, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(10, -30);
      ctx.lineTo(21, -26);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(16, -21, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(20, -9, 3, 0.2, Math.PI - 0.2);
    ctx.stroke();

    ctx.restore();

    if (opts.dizzy) {
      ctx.fillStyle = "#ffe066";
      for (let i = 0; i < 3; i++) {
        const a = t * 4 + (i * Math.PI * 2) / 3;
        const sx = x + facing * 6 * s + Math.cos(a) * 26 * s;
        const sy = y - 50 * s + Math.sin(a) * 7 * s;
        ctx.beginPath();
        for (let k = 0; k < 10; k++) {
          const r = k % 2 === 0 ? 6 : 2.5;
          const aa = (k / 10) * Math.PI * 2 - Math.PI / 2;
          ctx.lineTo(sx + Math.cos(aa) * r, sy + Math.sin(aa) * r);
        }
        ctx.fill();
      }
    }
  };

  G.shoulder = (x, y, s, facing) => ({ x: x + facing * 14 * s, y: y + 10 * s });
  G.bellyButton = (x, y, s, facing) => ({ x: x + facing * 14 * s, y: y + 26 * s });

  // Draws the arm from the shoulder toward `angle` and returns the hand position.
  G.drawArm = (ctx, x, y, s, facing, angle, look) => {
    const sh = G.shoulder(x, y, s, facing);
    const hand = { x: sh.x + Math.cos(angle) * 18 * s, y: sh.y + Math.sin(angle) * 18 * s };
    ctx.strokeStyle = look.skin;
    ctx.lineWidth = 8 * s;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(sh.x, sh.y);
    ctx.lineTo(hand.x, hand.y);
    ctx.stroke();
    ctx.fillStyle = look.shade;
    ctx.beginPath();
    ctx.arc(hand.x, hand.y, 4.5 * s, 0, Math.PI * 2);
    ctx.fill();
    return hand;
  };

  // Leaves the belly sideways before rising, so it never crosses the face.
  G.drawCord = (ctx, from, to, t, bites = 0) => {
    const mx = to.x + Math.sin(t * 1.5) * 12;
    const my = from.y + 10;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#c86b9a";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.quadraticCurveTo(mx, my, to.x, to.y);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 220, 235, 0.55)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 6]);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.quadraticCurveTo(mx, my, to.x, to.y);
    ctx.stroke();
    ctx.setLineDash([]);
    if (bites > 0) {
      ctx.fillStyle = "#5a1a35";
      for (let i = 0; i < bites; i++) {
        ctx.beginPath();
        ctx.arc(from.x + (i % 2 ? 3 : -3), from.y - 4 - i * 3, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  // Umbilical cord carved into a sword. `sharp` (0-1) grows the tip and glint.
  G.drawCordSword = (ctx, hand, angle, len, sharp, glow) => {
    ctx.save();
    ctx.translate(hand.x, hand.y);
    ctx.rotate(angle);
    if (glow) {
      ctx.shadowColor = "#ffe066";
      ctx.shadowBlur = 22;
    }
    ctx.fillStyle = "#7d3560";
    ctx.fillRect(-6, -4, 18, 8);
    ctx.fillStyle = "#b0507f";
    ctx.fillRect(11, -9, 5, 18);

    const bw = 7;
    const tip = 4 + 14 * sharp;
    ctx.fillStyle = glow ? "#ffd8ec" : "#c86b9a";
    ctx.beginPath();
    ctx.moveTo(16, -bw / 2);
    ctx.lineTo(len - tip, -bw / 2);
    ctx.lineTo(len, 0);
    ctx.lineTo(len - tip, bw / 2);
    ctx.lineTo(16, bw / 2);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = "rgba(255, 225, 240, 0.6)";
    ctx.lineWidth = 1.5;
    for (let x = 20; x < len - tip; x += 7) {
      ctx.beginPath();
      ctx.moveTo(x, -bw / 2);
      ctx.lineTo(x + 4, bw / 2);
      ctx.stroke();
    }
    if (sharp > 0.3) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${sharp * 0.8})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(18, -bw / 2);
      ctx.lineTo(len - tip, -bw / 2);
      ctx.lineTo(len, 0);
      ctx.stroke();
    }
    ctx.restore();
  };
})();
