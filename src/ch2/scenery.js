(() => {
  const { W, H } = G;
  const SHIRTS = ["#e05a5a", "#5aa0e0", "#f0b43c", "#6cc46c", "#b07ad8", "#ef8a3c"];

  G.randomLook = (extra = {}) => {
    const skin = G.pick(["wit", "zwart"]);
    const gender = G.pick(["jongen", "meisje"]);
    return {
      ...G.SKINS[skin],
      hair: G.pick(["kort", "lang", "krullen", "stekels"]),
      hairColor: G.pick([G.HAIR_COLOR, "#1a1212", "#8a5a2b", "#d9a441"]),
      eyes: G.pick(Object.values(G.EYES)),
      gender,
      shirt: G.pick(SHIRTS),
      ...extra,
    };
  };

  G.parentLooks = () => {
    const skin = G.SKINS[G.appearance.skin];
    return {
      mom: { ...skin, hair: "lang", hairColor: G.HAIR_COLOR, eyes: G.EYES.bruin, gender: "meisje", shirt: "#c05a8a", pants: "#3c3552" },
      dad: { ...skin, hair: "kort", hairColor: "#2a1a12", eyes: G.EYES.bruin, gender: "jongen", shirt: "#3f7a5a", pants: "#2f3b55" },
    };
  };

  G.drawRoom = (ctx, wall, floor, floorY = H * 0.62) => {
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, W, floorY);
    ctx.fillStyle = floor;
    ctx.fillRect(0, floorY, W, H - floorY);
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(0, floorY - 6, W, 6);
  };

  G.drawWindow = (ctx, x, y, w, h) => {
    ctx.fillStyle = "#bfe3ff";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 5;
    ctx.strokeRect(x, y, w, h);
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w / 2, y + h);
    ctx.moveTo(x, y + h / 2);
    ctx.lineTo(x + w, y + h / 2);
    ctx.stroke();
  };

  G.drawClassroom = (ctx) => {
    G.drawRoom(ctx, "#f3e6c8", "#b98a5a", H * 0.6);
    ctx.fillStyle = "#2f4a3a";
    ctx.fillRect(W * 0.52, 40, W * 0.42, 110);
    ctx.strokeStyle = "#8a6a44";
    ctx.lineWidth = 6;
    ctx.strokeRect(W * 0.52, 40, W * 0.42, 110);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "18px Segoe UI, Roboto, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("3 + 4 = 7", W * 0.56, 80);
    ctx.fillText("Rekenen", W * 0.56, 110);
    G.drawWindow(ctx, 30, 40, 120, 90);
  };

  G.drawDesk = (ctx, x, y) => {
    ctx.fillStyle = "#c79a62";
    ctx.fillRect(x - 40, y - 34, 80, 10);
    ctx.fillStyle = "#8a6a44";
    ctx.fillRect(x - 36, y - 24, 6, 24);
    ctx.fillRect(x + 30, y - 24, 6, 24);
  };

  G.drawChair = (ctx, x, y, angle = 0, s = 1) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(s, s);
    ctx.fillStyle = "#d65a3a";
    ctx.fillRect(-14, -30, 4, 30);
    ctx.fillRect(-14, -10, 26, 5);
    ctx.fillStyle = "#555";
    ctx.fillRect(-12, -5, 3, 18);
    ctx.fillRect(8, -5, 3, 18);
    ctx.restore();
  };

  G.drawPoliceLights = (ctx, t) => {
    const on = Math.floor(t * 6) % 2 === 0;
    ctx.fillStyle = on ? "rgba(255, 40, 60, 0.18)" : "rgba(40, 90, 255, 0.18)";
    ctx.fillRect(0, 0, W, H);
  };
})();
