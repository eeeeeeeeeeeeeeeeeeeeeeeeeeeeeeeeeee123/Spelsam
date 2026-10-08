(() => {
  const { W, H } = G;
  const SURVIVE_MS = 30000;
  const PLAYER_SPEED = 185;
  const R = 13;
  const CHASER_SPEED = 120;
  const SHOVE_RANGE = 46;
  const SHOVE_COOLDOWN = 650;
  const SHOVE_BACK = 70;
  const STUN_MS = 1100;
  const GRAB_RANGE = 20;
  const GRAB_FILL = 42;
  const GRAB_DRAIN = 55;
  const BOUNDS = { minX: 20, maxX: W - 20, minY: 70, maxY: H - 20 };

  function drawYard(ctx) {
    ctx.fillStyle = "#b7b1a6";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 3;
    ctx.strokeRect(30, 80, W - 60, H - 110);
    // trash can in the corner (what they want to stuff you in)
    ctx.fillStyle = "#4a7a4a";
    ctx.fillRect(W - 70, 30, 34, 40);
    ctx.fillStyle = "#3a5f3a";
    ctx.fillRect(W - 74, 26, 42, 8);
    ctx.fillStyle = "#2a2a2a";
    ctx.font = "9px Segoe UI, Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PRULLENBAK", W - 53, 90);
  }

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  G.c3level3 = {
    title: "Level 3 — Ontgroening (13 jaar)",
    intro:
      "Je eerste dag op de middelbare. Ouderejaars willen je in de <strong>prullenbak</strong> stoppen!<br>" +
      "Ren met de <strong>pijltjes / WASD</strong>. Duw ze weg met <strong>SPATIE</strong> als ze dichtbij zijn.<br>" +
      "Pakken ze je beet? <strong>Ram op SPATIE</strong> om los te komen. Overleef <strong>30 seconden</strong>.",

    drawBackground(ctx) {
      drawYard(ctx);
    },

    start(api) {
      this.api = api;
      this.player = { x: W / 2, y: H - 70, facing: 1, moving: false };
      this.cooldown = 0;
      this.grab = 0;
      this.time = SURVIVE_MS;
      this.popups = [];
      this.flash = 0;
      this.over = false;
      this.chasers = [];
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        this.chasers.push({
          x: W / 2 + Math.cos(a) * 180,
          y: 180 + Math.sin(a) * 90,
          stun: 0,
          look: G.randomLook({ shirt: ["#8a2b4a", "#2b4a8a", "#6a2b8a", "#8a6a2b"][i % 4] }),
        });
      }
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 700 });
    },

    onAction() {
      if (this.over) return;
      const p = this.player;
      if (this.grab > 0) {
        this.grab = Math.max(0, this.grab - 7);
        return;
      }
      if (this.cooldown > 0) return;
      this.cooldown = SHOVE_COOLDOWN;
      let shoved = false;
      for (const c of this.chasers) {
        if (c.stun > 0) continue;
        const d = dist(c, p);
        if (d < SHOVE_RANGE) {
          c.x += ((c.x - p.x) / (d || 1)) * SHOVE_BACK;
          c.y += ((c.y - p.y) / (d || 1)) * SHOVE_BACK;
          c.stun = STUN_MS;
          shoved = true;
        }
      }
      if (shoved) this.popup("Wegwezen!", p.x, p.y - 60, "#6ee07a");
    },

    update(dt) {
      if (this.over) return;
      const s = dt / 1000;
      this.cooldown = Math.max(0, this.cooldown - dt);
      this.flash = Math.max(0, this.flash - dt);
      this.popups = G.updatePopups(this.popups, dt);
      const p = this.player;

      this.time -= dt;
      if (this.time <= 0) {
        this.over = true;
        this.api.complete();
        return;
      }

      let grabbers = 0;
      for (const c of this.chasers) {
        c.stun = Math.max(0, c.stun - dt);
        if (c.stun > 0) continue;
        const d = dist(c, p) || 1;
        c.x += ((p.x - c.x) / d) * CHASER_SPEED * s;
        c.y += ((p.y - c.y) / d) * CHASER_SPEED * s;
        if (d < GRAB_RANGE) grabbers++;
      }

      const moving = !this.grab && (G.held.left || G.held.right || G.held.up || G.held.down);
      if (grabbers > 0) {
        this.grab = Math.min(100, this.grab + GRAB_FILL * grabbers * s);
        this.flash = 200;
        if (this.grab >= 100) {
          this.over = true;
          this.api.fail("Ze stopten je in de prullenbak!");
          return;
        }
      } else {
        this.grab = Math.max(0, this.grab - GRAB_DRAIN * s);
      }

      if (this.grab < 60) {
        const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
        const my = (G.held.down ? 1 : 0) - (G.held.up ? 1 : 0);
        if (mx || my) {
          const len = Math.hypot(mx, my);
          const slow = this.grab > 0 ? 0.4 : 1;
          p.x += (mx / len) * PLAYER_SPEED * slow * s;
          p.y += (my / len) * PLAYER_SPEED * slow * s;
          if (mx) p.facing = mx;
          p.moving = true;
        } else p.moving = false;
        p.x = G.clamp(p.x, BOUNDS.minX, BOUNDS.maxX);
        p.y = G.clamp(p.y, BOUNDS.minY, BOUNDS.maxY);
      }
    },

    render(ctx, t) {
      drawYard(ctx);
      const p = this.player;
      const actors = this.chasers.map((c) => ({ y: c.y, draw: () => G.drawKid(ctx, c.x, c.y + 14, 0.62, c.look, { t, facing: p.x < c.x ? -1 : 1, pose: c.stun > 0 ? "down" : "walk", angry: true, dizzy: c.stun > 0 }) }));
      actors.push({ y: p.y, draw: () => G.drawKid(ctx, p.x, p.y + 14, 0.62, G.playerKidLook(), { t, facing: p.facing, pose: p.moving ? "walk" : "stand", crying: this.grab > 30 }) });
      actors.sort((a, b) => a.y - b.y).forEach((a) => a.draw());

      if (this.flash > 0) {
        ctx.fillStyle = `rgba(200,40,40,${0.25 * (this.flash / 200)})`;
        ctx.fillRect(0, 0, W, H);
      }

      // timer bar
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(30, 50, W - 60, 12);
      ctx.fillStyle = "#6ee07a";
      ctx.fillRect(30, 50, (W - 60) * (1 - this.time / SURVIVE_MS), 12);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`Overleef: nog ${Math.ceil(this.time / 1000)}s`, W / 2, 34);

      if (this.grab > 0) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(p.x - 40, p.y - 78, 80, 10);
        ctx.fillStyle = "#ff5a5a";
        ctx.fillRect(p.x - 40, p.y - 78, 80 * (this.grab / 100), 10);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 11px Segoe UI, Roboto, sans-serif";
        ctx.fillText("RAM SPATIE!", p.x, p.y - 84);
      }
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return `Overleef · nog ${Math.ceil(this.time / 1000)}s`;
    },
  };
})();
