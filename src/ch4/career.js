(() => {
  // Chapter 4: the career picked in level 1 decides every level after it.
  G.career = null;

  G.CAREERS = {
    soldaat: { label: "Amerikaanse soldaat", short: "Soldaat", color: "#6aa0ff", emoji: "🪖" },
    spion: { label: "Spion in Noord-Korea", short: "Spion", color: "#ff6a6a", emoji: "🕵️" },
    president: { label: "President Goudkuif", short: "President", color: "#ffd24a", emoji: "🎩" },
    huurmoordenaar: { label: "Huurmoordenaar", short: "Huurmoordenaar", color: "#c0c0c0", emoji: "🎯" },
    marine: { label: "Space marine", short: "Space marine", color: "#7affd0", emoji: "👽" },
  };
  G.CAREER_IDS = Object.keys(G.CAREERS);

  G.setCareer = (id) => {
    G.career = id;
  };

  // levels 2..10 per career, filled in by each career's level files
  G.CAREER_LEVELS = {};
  for (const id of G.CAREER_IDS) G.CAREER_LEVELS[id] = {};
  // a career is playable once its final level exists
  G.careerReady = (id) => !!G.CAREER_LEVELS[id][10];

  const careerId = () => (G.CAREERS[G.career] ? G.career : "soldaat");

  function placeholder(n) {
    return {
      get title() {
        return `Level ${n} — ${G.CAREERS[careerId()].short}: nog in aanbouw`;
      },
      intro: "Dit level wordt nog gebouwd. Klik op <strong>Start level</strong> om door te gaan.",
      drawBackground(ctx) {
        ctx.fillStyle = "#1a1a24";
        ctx.fillRect(0, 0, G.W, G.H);
      },
      start(api) {
        this.api = api;
        this.done = false;
      },
      update() {
        if (!this.done) {
          this.done = true;
          this.api.complete();
        }
      },
      render(ctx) {
        this.drawBackground(ctx);
      },
      hud() {
        return "";
      },
    };
  }
  const placeholders = {};

  // A chapter slot that behaves like whichever career level belongs in it.
  G.careerSlot = (n) =>
    new Proxy(
      {},
      {
        get(_, prop) {
          const id = careerId();
          const L = G.CAREER_LEVELS[id][n] || (placeholders[`${id}${n}`] ||= placeholder(n));
          const v = L[prop];
          return typeof v === "function" ? v.bind(L) : v;
        },
      },
    );

  // soldier gear
  G.soldierLook = (base = G.playerKidLook()) => ({ ...base, shirt: "#5a6a3a", pants: "#4a4a32" });
  G.ENEMY_LOOK = () => G.randomLook({ shirt: "#8a7a5a", pants: "#5a4a3a", hairColor: "#1a1212" });

  // helmet on top of a G.drawKid figure drawn at (x, y) with scale s
  G.drawHelmet = (ctx, x, y, s, facing = 1, adult = true, color = "#4a5a2a") => {
    const cx = x + facing * 2 * s;
    const cy = y + ((adult ? -22 : -2) - 54) * s;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, 17 * s, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(cx - 19 * s, cy - 1 * s, 38 * s, 4 * s);
  };

  // spy gear: dark suit, sunglasses
  G.spyLook = (base = G.playerKidLook()) => ({ ...base, shirt: "#22242c", pants: "#15161a" });
  G.drawShades = (ctx, x, y, s, facing = 1, adult = true) => {
    const ey = y + ((adult ? -22 : -2) - 55) * s;
    ctx.fillStyle = "#0a0a0a";
    ctx.beginPath();
    ctx.roundRect(x + facing * 1 * s - (facing < 0 ? 15 * s : 0), ey - 3 * s, 15 * s, 6 * s, 2 * s);
    ctx.fill();
  };
  // North Korean guards and police: olive uniform with a peaked cap
  G.NK_LOOK = () => ({ ...G.randomLook({ shirt: "#5a6040", pants: "#4a5034", hairColor: "#1a1212", hair: "kort" }), ...G.SKINS.wit });
  G.drawCap = (ctx, x, y, s, facing = 1, adult = true, color = "#5a6040") => {
    const cx = x + facing * 2 * s;
    const cy = y + ((adult ? -22 : -2) - 62) * s;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 18 * s, 7 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c02020";
    ctx.fillRect(cx - 16 * s, cy + 3 * s, 32 * s, 3 * s);
    ctx.fillStyle = "#222";
    ctx.fillRect(cx + (facing > 0 ? 4 : -18) * s, cy + 6 * s, 14 * s, 3 * s);
  };

  // President Goudkuif: navy suit, red tie, a golden quiff
  G.presLook = (base = G.playerKidLook()) => ({ ...base, shirt: "#1c2a5a", pants: "#141c3a", hairColor: "#f0c030", hair: "kort" });
  G.drawQuiff = (ctx, x, y, s, facing = 1, adult = true) => {
    const hy = y + ((adult ? -22 : -2) - 66) * s;
    ctx.fillStyle = "#f0c030";
    ctx.beginPath();
    ctx.ellipse(x + facing * 6 * s, hy, 16 * s, 7 * s, facing * -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffe070";
    ctx.beginPath();
    ctx.ellipse(x + facing * 10 * s, hy - 2 * s, 7 * s, 3 * s, facing * -0.35, 0, Math.PI * 2);
    ctx.fill();
  };
  G.drawTie = (ctx, x, y, s, adult = true) => {
    const ty = y + ((adult ? -30 : -18) - (adult ? 26 : 18)) * s;
    ctx.fillStyle = "#c02020";
    ctx.fillRect(x - 1.5 * s, ty, 3 * s, 14 * s);
  };

  // the hitman: black suit, red tie
  G.hitLook = (base = G.playerKidLook()) => ({ ...base, shirt: "#141414", pants: "#141414", hairColor: "#2a1a12", hair: "kort" });

  // simple rifle in the hand returned by G.drawKid
  G.drawRifle = (ctx, hand, angle, facing, s = 1, flash = false) => {
    ctx.save();
    ctx.translate(hand.x, hand.y);
    ctx.rotate(angle);
    if (facing < 0) ctx.scale(1, -1);
    ctx.scale(s, s);
    ctx.fillStyle = "#222";
    ctx.fillRect(-4, -3, 36, 6);
    ctx.fillRect(6, 3, 6, 9);
    ctx.fillStyle = "#5a3a1a";
    ctx.fillRect(-12, -2, 9, 7);
    if (flash) {
      ctx.fillStyle = "#ffd24a";
      ctx.beginPath();
      ctx.arc(36, 0, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  // the space marine: white suit, bubble helmet, laser gun
  G.marineLook = (base = G.playerKidLook()) => ({ ...base, shirt: "#d8e0ea", pants: "#a8b4c4" });
  G.drawSpaceHelmet = (ctx, x, y, s, facing = 1, adult = true) => {
    const cx = x + facing * 2 * s;
    const cy = y + ((adult ? -22 : -2) - 53) * s;
    ctx.fillStyle = "rgba(122,255,208,0.18)";
    ctx.beginPath();
    ctx.arc(cx, cy, 24 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(225,235,245,0.95)";
    ctx.lineWidth = Math.max(1.5, 3 * s);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath();
    ctx.ellipse(cx - facing * 9 * s, cy - 10 * s, 5 * s, 3 * s, -0.5 * facing, 0, Math.PI * 2);
    ctx.fill();
  };
  G.drawLaserGun = (ctx, hand, angle, facing, s = 1, flash = false) => {
    ctx.save();
    ctx.translate(hand.x, hand.y);
    ctx.rotate(angle);
    if (facing < 0) ctx.scale(1, -1);
    ctx.scale(s, s);
    ctx.fillStyle = "#c8d0e0";
    ctx.fillRect(-6, -4, 30, 8);
    ctx.fillStyle = "#8a96aa";
    ctx.fillRect(4, 4, 6, 8);
    ctx.fillStyle = "#7affd0";
    ctx.fillRect(22, -2, 6, 4);
    if (flash) {
      ctx.fillStyle = "rgba(122,255,208,0.8)";
      ctx.beginPath();
      ctx.arc(30, 0, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };
  // little green alien standing with its feet at (x, y)
  G.drawAlien = (ctx, x, y, s, t, o = {}) => {
    const step = o.still ? 0 : Math.sin(t * 10 + (o.seed || 0)) * 3 * s;
    const body = o.flash ? "#fff" : o.color || "#6ae07a";
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(x, y - 30 * s, 12 * s, 14 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x - 7 * s, y - 20 * s, 14 * s, 14 * s);
    ctx.strokeStyle = body;
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(x - 5 * s, y - 42 * s);
    ctx.lineTo(x - 9 * s, y - 52 * s);
    ctx.moveTo(x + 5 * s, y - 42 * s);
    ctx.lineTo(x + 9 * s, y - 52 * s);
    ctx.stroke();
    ctx.fillStyle = "#ffd24a";
    ctx.beginPath();
    ctx.arc(x - 9 * s, y - 53 * s, 2.5 * s, 0, Math.PI * 2);
    ctx.arc(x + 9 * s, y - 53 * s, 2.5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.ellipse(x - 5 * s, y - 32 * s, 4 * s, 5.5 * s, -0.3, 0, Math.PI * 2);
    ctx.ellipse(x + 5 * s, y - 32 * s, 4 * s, 5.5 * s, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = o.flash ? "#ddd" : "#3a9a4a";
    ctx.lineWidth = 4 * s;
    ctx.beginPath();
    ctx.moveTo(x - 4 * s, y - 7 * s);
    ctx.lineTo(x - 5 * s + step, y);
    ctx.moveTo(x + 4 * s, y - 7 * s);
    ctx.lineTo(x + 5 * s - step, y);
    ctx.stroke();
  };
})();
