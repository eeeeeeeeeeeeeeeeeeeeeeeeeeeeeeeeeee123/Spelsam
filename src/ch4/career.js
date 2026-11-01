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
  // a career is playable once its levels exist
  G.careerReady = (id) => Object.keys(G.CAREER_LEVELS[id]).length > 0;

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
