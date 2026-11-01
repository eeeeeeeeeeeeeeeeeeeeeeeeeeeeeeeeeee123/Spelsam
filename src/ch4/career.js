(() => {
  // Chapter 4: the career picked in level 1 decides every level after it.
  G.career = null;

  G.CAREERS = {
    soldaat: { label: "Amerikaanse soldaat", short: "Soldaat", color: "#6aa0ff", emoji: "🪖" },
    spion: { label: "Spion in Noord-Korea", short: "Spion", color: "#ff6a6a", emoji: "🕵️" },
    president: { label: "Parodie-president", short: "President", color: "#ffd24a", emoji: "🎩" },
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
})();
