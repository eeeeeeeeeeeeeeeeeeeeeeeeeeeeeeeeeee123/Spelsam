(() => {
  const { W, H } = G;
  const PLAYER_SPEED = 115;
  const CONE_RANGE = 130;
  const CONE_HALF = 0.5;
  const MAX_SCARES = 3;
  const RUSTLE_MS = 850;
  const POP_MS = 900;
  const SCARE_RANGE = 55;
  const REARM_MS = 1800;
  const START = { x: 50, y: H - 50 };
  const GOAL = { x: W - 55, y: 55, r: 26 };

  const TREES = [];
  function buildTrees() {
    TREES.length = 0;
    const rng = () => Math.random();
    for (let i = 0; i < 26; i++) {
      const x = 40 + rng() * (W - 80);
      const y = 40 + rng() * (H - 80);
      if (Math.hypot(x - START.x, y - START.y) < 70) continue;
      if (Math.hypot(x - GOAL.x, y - GOAL.y) < 70) continue;
      TREES.push({ x, y, r: 12 + rng() * 6 });
    }
  }

  const LEADER_LOOK = { ...G.SKINS.wit, hair: "kort", hairColor: "#2a1a12", eyes: G.EYES.bruin, gender: "jongen", shirt: "#3a4a2a", pants: "#2a2a1a" };

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function collide(p) {
    for (const tr of TREES) {
      const d = dist(p, tr);
      const rr = tr.r + 11;
      if (d < rr && d > 0) {
        p.x = tr.x + ((p.x - tr.x) / d) * rr;
        p.y = tr.y + ((p.y - tr.y) / d) * rr;
      }
    }
    p.x = G.clamp(p.x, 14, W - 14);
    p.y = G.clamp(p.y, 14, H - 14);
  }

  function litBy(cone, p) {
    if (dist(cone, p) > CONE_RANGE) return 0;
    let diff = Math.atan2(p.y - cone.y, p.x - cone.x) - cone.angle;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    const edge = CONE_HALF;
    if (Math.abs(diff) > edge) return 0;
    return 1 - dist(cone, p) / CONE_RANGE;
  }

  G.c3level2 = {
    title: "Level 2 — Kampdropping (12 jaar)",
    intro:
      "Op schoolkamp word je 's nachts in het bos gedropt. Vind de weg terug naar het <strong>kampvuur</strong>.<br>" +
      "Loop met de <strong>pijltjes / WASD</strong>; je zaklamp schijnt vooruit.<br>" +
      "Pas op: <strong>kampleiders</strong> verstoppen zich. Zie je een <strong>struik ritselen</strong>? Loop weg voor ze je laten schrikken! 3 keer schrikken en je raakt in paniek.",

    drawBackground(ctx, t) {
      ctx.fillStyle = "#0a0f08";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ff8a3c";
      ctx.beginPath();
      ctx.arc(GOAL.x, GOAL.y, GOAL.r, 0, Math.PI * 2);
      ctx.fill();
    },

    start(api) {
      this.api = api;
      buildTrees();
      this.player = { x: START.x, y: START.y };
      this.angle = -Math.PI / 4;
      this.scares = 0;
      this.flash = 0;
      this.popups = [];
      this.leaders = [];
      const spots = G.shuffle(TREES.slice()).slice(0, 5);
      for (const s of spots) {
        this.leaders.push({ x: s.x, y: s.y - 18, state: "idle", timer: 1000 + Math.random() * 2500 });
      }
      this.over = false;
    },

    update(dt, t) {
      if (this.over) return;
      const s = dt / 1000;
      this.flash = Math.max(0, this.flash - dt);
      this.popups = G.updatePopups(this.popups, dt);
      const p = this.player;
      const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
      const my = (G.held.down ? 1 : 0) - (G.held.up ? 1 : 0);
      if (mx || my) {
        const len = Math.hypot(mx, my);
        p.x += (mx / len) * PLAYER_SPEED * s;
        p.y += (my / len) * PLAYER_SPEED * s;
        this.angle = Math.atan2(my, mx);
        collide(p);
      }

      for (const l of this.leaders) {
        l.timer -= dt;
        if (l.state === "idle" && l.timer <= 0) {
          if (dist(l, p) < CONE_RANGE) {
            l.state = "rustle";
            l.timer = RUSTLE_MS;
          } else {
            l.timer = 600;
          }
        } else if (l.state === "rustle" && l.timer <= 0) {
          l.state = "pop";
          l.timer = POP_MS;
          if (dist(l, p) < SCARE_RANGE) {
            this.scares++;
            this.flash = 500;
            this.popups.push({ text: "BOO!", x: l.x, y: l.y - 30, color: "#ff5a5a", life: 800 });
            if (this.scares >= MAX_SCARES) {
              this.over = true;
              this.api.fail("Je schrok je rot en rende in paniek de verkeerde kant op!");
              return;
            }
          }
        } else if (l.state === "pop" && l.timer <= 0) {
          l.state = "idle";
          l.timer = REARM_MS + Math.random() * 1500;
        }
      }

      if (dist(p, GOAL) < GOAL.r + 10) {
        this.over = true;
        this.api.complete();
      }
    },

    render(ctx, t) {
      ctx.fillStyle = "#0a0f08";
      ctx.fillRect(0, 0, W, H);
      const p = this.player;
      const cone = { x: p.x, y: p.y, angle: this.angle };

      // flashlight cone
      const grad = ctx.createRadialGradient(p.x, p.y, 8, p.x, p.y, CONE_RANGE);
      grad.addColorStop(0, "rgba(255, 245, 200, 0.5)");
      grad.addColorStop(1, "rgba(255, 245, 200, 0)");
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.arc(p.x, p.y, CONE_RANGE, this.angle - CONE_HALF, this.angle + CONE_HALF);
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();

      // campfire glow (always faintly visible)
      const fg = ctx.createRadialGradient(GOAL.x, GOAL.y, 4, GOAL.x, GOAL.y, 60);
      fg.addColorStop(0, "rgba(255, 150, 60, 0.8)");
      fg.addColorStop(1, "rgba(255, 150, 60, 0)");
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(GOAL.x, GOAL.y, 60, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = "26px serif";
      ctx.textAlign = "center";
      ctx.fillText("🔥", GOAL.x, GOAL.y + 9);

      // trees revealed by cone
      for (const tr of TREES) {
        const lit = litBy(cone, tr);
        if (lit <= 0.02) continue;
        ctx.globalAlpha = Math.min(1, lit + 0.15);
        ctx.fillStyle = "#1a3a1a";
        ctx.beginPath();
        ctx.arc(tr.x, tr.y - tr.r, tr.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#3a2a1a";
        ctx.fillRect(tr.x - 3, tr.y, 6, tr.r);
        ctx.globalAlpha = 1;
      }

      // leaders
      for (const l of this.leaders) {
        if (l.state === "rustle") {
          const sway = Math.sin(t * 30) * 4;
          ctx.fillStyle = "#2a5a2a";
          ctx.beginPath();
          ctx.arc(l.x + sway, l.y + 12, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#ffe066";
          ctx.font = "bold 14px Segoe UI, Roboto, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("!", l.x, l.y - 14);
        } else if (l.state === "pop") {
          G.drawKid(ctx, l.x, l.y + 26, 0.55, LEADER_LOOK, { t, angry: true, armAngle: -1.4 });
        }
      }

      if (this.flash > 0) {
        ctx.fillStyle = `rgba(120, 20, 20, ${0.3 * (this.flash / 500)})`;
        ctx.fillRect(0, 0, W, H);
      }

      G.drawKid(ctx, p.x, p.y + 14, 0.5, G.playerKidLook(), { t, facing: Math.cos(this.angle) >= 0 ? 1 : -1, crying: this.flash > 0 });

      ctx.fillStyle = "#fff";
      ctx.font = "bold 13px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`Schrik: ${"😱".repeat(this.scares)}${"·".repeat(MAX_SCARES - this.scares)}`, 12, 22);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      const d = Math.round(Math.hypot(this.player.x - GOAL.x, this.player.y - GOAL.y));
      return `Naar het kampvuur · schrik ${this.scares}/${MAX_SCARES}`;
    },
  };
})();
