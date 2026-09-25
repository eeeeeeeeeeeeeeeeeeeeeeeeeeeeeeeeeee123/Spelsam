(() => {
  const { W, H } = G;
  const TARGET = 7;
  const MATCH_MS = 75000;
  const PLAYER_SPEED = 170;
  const SLIDE_MS = 280;
  const SLIDE_SPEED = 340;
  const SLIDE_COOLDOWN = 700;
  const TACKLE_DIST = 30;
  const CARRIER_SPEED = 90;
  const RESPAWN_MS = 900;
  const MAX_YELLOW = 2;
  const GOAL = { x: 22, top: 170, bottom: 280 };
  const FIELD = { minX: 30, maxX: W - 30, minY: 70, maxY: H - 20 };
  const OPPONENT_SHIRT = "#d64541";

  function drawField(ctx) {
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = i % 2 ? "#4caf50" : "#45a049";
      ctx.fillRect((i * W) / 9, 0, W / 9 + 1, H);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 3;
    ctx.strokeRect(20, 50, W - 40, H - 60);
    ctx.beginPath();
    ctx.moveTo(W / 2, 50);
    ctx.lineTo(W / 2, H - 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(W / 2, (50 + H - 10) / 2, 50, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeRect(20, 150, 70, 150);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillRect(4, GOAL.top, 16, GOAL.bottom - GOAL.top);
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 1;
    for (let y = GOAL.top; y < GOAL.bottom; y += 8) {
      ctx.beginPath();
      ctx.moveTo(4, y);
      ctx.lineTo(20, y);
      ctx.stroke();
    }
  }

  function drawBall(ctx, x, y) {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.arc(x, y, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }

  G.c2level5 = {
    title: "Level 5 — Je eerste wedstrijd (7 jaar)",
    intro:
      "Je eerste voetbalwedstrijd! Maak minstens <strong>7 tackles</strong> voordat de wedstrijd voorbij is.<br>" +
      "Loop met de <strong>pijltjes / WASD</strong> en maak een sliding met <strong>SPATIE</strong> in de richting waarin je loopt.<br>" +
      "Tackle <strong>van voren of opzij</strong>. Van achteren is een overtreding: <strong>2 gele kaarten</strong> = rood = een hartje kwijt.",

    drawBackground(ctx) {
      drawField(ctx);
    },

    start(api) {
      this.api = api;
      this.player = { x: 130, y: 225, dir: { x: 1, y: 0 }, slide: 0, cooldown: 0, resolved: false, slideDir: null };
      this.tackles = 0;
      this.yellow = 0;
      this.goals = 0;
      this.time = MATCH_MS;
      this.carrier = null;
      this.respawn = 400;
      this.popups = [];
      this.over = false;
      this.oppLooks = [0, 1, 2].map(() => G.randomLook({ shirt: OPPONENT_SHIRT }));
      this.mates = [{ x: 250, y: 120 }, { x: 250, y: 340 }].map((m) => ({ ...m, look: G.randomLook({ shirt: G.playerKidLook().shirt }) }));
      this.lookIndex = 0;
    },

    spawnCarrier() {
      const y = 110 + Math.random() * 230;
      this.lookIndex = (this.lookIndex + 1) % this.oppLooks.length;
      this.carrier = { x: W - 50, y, baseY: y, phase: Math.random() * 6, vx: -1, vy: 0, down: 0, look: this.oppLooks[this.lookIndex] };
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 900 });
    },

    onAction() {
      const p = this.player;
      if (this.over || p.slide > 0 || p.cooldown > 0) return;
      p.slide = SLIDE_MS;
      p.cooldown = SLIDE_COOLDOWN;
      p.resolved = false;
      p.slideDir = { ...p.dir };
    },

    finish(ok, reason) {
      this.over = true;
      if (ok) this.api.complete();
      else this.api.fail(reason);
    },

    update(dt) {
      if (this.over) return;
      const s = dt / 1000;
      const p = this.player;
      this.popups = G.updatePopups(this.popups, dt);
      this.time -= dt;
      if (this.time <= 0) {
        this.finish(false, `De wedstrijd is afgelopen: maar ${this.tackles} van de ${TARGET} tackles.`);
        return;
      }

      p.cooldown = Math.max(0, p.cooldown - dt);
      if (p.slide > 0) {
        p.slide -= dt;
        p.x += p.slideDir.x * SLIDE_SPEED * s;
        p.y += p.slideDir.y * SLIDE_SPEED * s;
      } else {
        const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
        const my = (G.held.down ? 1 : 0) - (G.held.up ? 1 : 0);
        p.moving = !!(mx || my);
        if (p.moving) {
          const len = Math.hypot(mx, my);
          p.dir = { x: mx / len, y: my / len };
          p.x += p.dir.x * PLAYER_SPEED * s;
          p.y += p.dir.y * PLAYER_SPEED * s;
        }
      }
      p.x = G.clamp(p.x, FIELD.minX, FIELD.maxX);
      p.y = G.clamp(p.y, FIELD.minY, FIELD.maxY);

      const c = this.carrier;
      if (!c) {
        this.respawn -= dt;
        if (this.respawn <= 0) this.spawnCarrier();
        return;
      }
      if (c.down > 0) {
        c.down -= dt;
        if (c.down <= 0) {
          this.carrier = null;
          this.respawn = RESPAWN_MS;
        }
        return;
      }

      c.phase += s * 2;
      const tx = GOAL.x;
      const ty = (GOAL.top + GOAL.bottom) / 2 + Math.sin(c.phase) * 60;
      const d = Math.hypot(tx - c.x, ty - c.y) || 1;
      c.vx = (tx - c.x) / d;
      c.vy = (ty - c.y) / d;
      c.x += c.vx * CARRIER_SPEED * s;
      c.y += c.vy * CARRIER_SPEED * s;

      if (c.x < GOAL.x + 14) {
        this.goals++;
        this.popup("Tegengoal!", 90, 150, "#ff6b6b");
        this.carrier = null;
        this.respawn = RESPAWN_MS;
        return;
      }

      if (p.slide > 0 && !p.resolved && Math.hypot(p.x - c.x, p.y - c.y) < TACKLE_DIST) {
        p.resolved = true;
        const fromBehind = p.slideDir.x * c.vx + p.slideDir.y * c.vy > 0.6;
        if (fromBehind) {
          this.yellow++;
          if (this.yellow >= MAX_YELLOW) {
            this.finish(false, "Rode kaart! Twee keer van achteren getackeld.");
            return;
          }
          this.popup("Gele kaart!", p.x, p.y - 70, "#ffe066");
        } else {
          this.tackles++;
          c.down = 800;
          this.popup(`Tackle! ${this.tackles}/${TARGET}`, p.x, p.y - 70, "#6ee07a");
          if (this.tackles >= TARGET) this.finish(true);
        }
      }
    },

    render(ctx, t) {
      drawField(ctx);
      const p = this.player;
      const c = this.carrier;
      const actors = this.mates.map((m) => ({ y: m.y, draw: () => G.drawKid(ctx, m.x, m.y, 0.6, m.look, { t: t + m.x, pose: "stand" }) }));
      if (c) {
        actors.push({
          y: c.y,
          draw: () => {
            if (c.down > 0) G.drawKid(ctx, c.x, c.y, 0.6, c.look, { pose: "down", dizzy: true, t, facing: -1 });
            else {
              G.drawKid(ctx, c.x, c.y, 0.6, c.look, { pose: "walk", facing: c.vx < 0 ? -1 : 1, t });
              drawBall(ctx, c.x + c.vx * 14, c.y - 2);
            }
          },
        });
      }
      actors.push({
        y: p.y,
        draw: () => {
          const facing = p.dir.x < 0 ? -1 : 1;
          if (p.slide > 0) G.drawKid(ctx, p.x, p.y, 0.6, G.playerKidLook(), { pose: "down", facing, t });
          else G.drawKid(ctx, p.x, p.y, 0.6, G.playerKidLook(), { pose: p.moving ? "walk" : "stand", facing, t });
        },
      });
      actors.sort((a, b) => a.y - b.y).forEach((a) => a.draw());

      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(W / 2 - 110, 8, 220, 30);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 15px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "center";
      const secs = Math.max(0, Math.ceil(this.time / 1000));
      ctx.fillText(`Tijd ${secs}s · Tegengoals ${this.goals}`, W / 2, 28);
      if (this.yellow > 0) {
        ctx.fillStyle = "#ffe066";
        ctx.fillRect(W - 40, 12, 14, 20);
      }
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return `Tackles: ${this.tackles} / ${TARGET} · Gele kaarten: ${this.yellow}`;
    },
  };
})();
