(() => {
  const { W, H } = G;
  const LANES = [175, 275, 375];
  const PLAYER_X = 95;
  const ENEMY_X = 452;
  const BLOCK_X = 450;
  const TARGET = 5;
  const MAX_HITS = 2;
  const SEQ_LEN = 3;
  const DODGE_MS = 2200;
  const SHOT_COOLDOWN = 450;
  const BULLET_SPEED = 600;
  const ARROWS = { "0,-1": "↑", "0,1": "↓", "-1,0": "←", "1,0": "→" };
  const DIRS = [[0, -1], [0, 1], [-1, 0], [1, 0]];
  const BLOCK_COLORS = ["#e05a5a", "#5aa0e0", "#f0b43c"];

  function drawArena(ctx, t) {
    ctx.fillStyle = "#cfe8ff";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#9fd0f5";
    for (let i = 0; i < 3; i++) ctx.fillRect(0, LANES[i] - 38, W, 46);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    for (let i = 0; i < 20; i++) {
      const x = (i * 97) % W;
      const y = 110 + ((i * 53) % 300);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // playpen fence
    ctx.fillStyle = "#f7d774";
    ctx.fillRect(0, 88, W, 8);
    for (let x = 10; x < W; x += 26) ctx.fillRect(x, 50, 6, 46);
    ctx.fillRect(0, 48, W, 6);
    ctx.fillStyle = "#e05a8a";
    ctx.font = "bold 22px Segoe UI, Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("BABY ARENA", W / 2, 34);
  }

  function drawBlock(ctx, lane) {
    const y = LANES[lane];
    ctx.fillStyle = BLOCK_COLORS[lane];
    ctx.fillRect(BLOCK_X - 22, y - 44, 44, 44);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "bold 24px Segoe UI, Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ABC"[lane], BLOCK_X, y - 14);
  }

  function newEnemy(lane) {
    return { lane, look: G.randomLook(), state: "cover", timer: 800 + Math.random() * 1500, flash: 0 };
  }

  G.c2level1 = {
    title: "Level 1 — De baby-arena (0 jaar)",
    intro:
      "Je belandt in de <strong>baby-arena</strong>! Schakel <strong>5 baby's</strong> uit met je <strong>SPATIE</strong>-pistool. " +
      "Je schiet recht vooruit, en alleen een baby die boven zijn blok uitkomt kun je raken.<br>" +
      "Richt een baby op jou? Dan verschijnen er <strong>pijltjes</strong>: typ ze snel in de goede volgorde na om weg te kruipen. " +
      "Te langzaam of fout = geraakt. <strong>2 keer geraakt</strong> kost een hartje.",

    drawBackground(ctx, t) {
      drawArena(ctx, t);
      for (let i = 0; i < 3; i++) drawBlock(ctx, i);
      G.drawKid(ctx, PLAYER_X, LANES[1], 0.9, G.playerKidLook(), { pose: "crawl", baby: true, t });
    },

    start(api) {
      this.api = api;
      this.lane = 1;
      this.y = LANES[1];
      this.hits = 0;
      this.flash = 0;
      this.defeated = 0;
      this.cooldown = 0;
      this.bullets = [];
      this.enemyShots = [];
      this.popups = [];
      this.enemies = [0, 1, 2].map(newEnemy);
      this.attack = null;
      this.attackTimer = 2200;
      this.over = false;
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 700 });
    },

    onAction() {
      if (this.over || this.cooldown > 0) return;
      this.cooldown = SHOT_COOLDOWN;
      this.bullets.push({ x: PLAYER_X + 30, lane: this.lane });
    },

    onDirection(dx, dy, repeat) {
      const a = this.attack;
      if (!a || repeat || this.over) return;
      const [ex, ey] = a.seq[a.index];
      if (dx === ex && dy === ey) {
        a.index++;
        if (a.index >= a.seq.length) this.dodge();
      } else {
        this.getHit("Verkeerde pijl!");
      }
    },

    dodge() {
      const from = this.lane;
      this.lane = from === 1 ? G.pick([0, 2]) : 1;
      this.enemyShots.push({ lane: from, x: ENEMY_X - 30 });
      this.popup("Weggekropen!", PLAYER_X + 30, LANES[this.lane] - 70, "#6ee07a");
      this.endAttack();
    },

    getHit(reason) {
      this.enemyShots.push({ lane: this.lane, x: ENEMY_X - 30 });
      this.hits++;
      this.flash = 500;
      this.popup(`AU! ${reason}`, PLAYER_X + 40, LANES[this.lane] - 70, "#ff6b6b");
      this.endAttack();
      if (this.hits >= MAX_HITS) {
        this.over = true;
        this.api.fail("Je bent 2 keer geraakt!");
      }
    },

    endAttack() {
      this.attack = null;
      this.attackTimer = 2400 + Math.random() * 900;
    },

    startAttack() {
      const candidates = this.enemies.filter((e) => e.state === "cover" || e.state === "peek");
      if (!candidates.length) {
        this.attackTimer = 500;
        return;
      }
      const shooter = G.pick(candidates);
      shooter.state = "peek";
      shooter.timer = DODGE_MS + 400;
      this.attack = {
        shooter,
        seq: Array.from({ length: SEQ_LEN }, () => G.pick(DIRS)),
        index: 0,
        left: DODGE_MS,
      };
    },

    update(dt) {
      const s = dt / 1000;
      this.cooldown = Math.max(0, this.cooldown - dt);
      this.flash = Math.max(0, this.flash - dt);
      this.popups = G.updatePopups(this.popups, dt);
      this.y += (LANES[this.lane] - this.y) * Math.min(1, dt / 120);

      for (const e of this.enemies) {
        e.flash = Math.max(0, e.flash - dt);
        e.timer -= dt;
        if (e.timer > 0) continue;
        if (e.state === "cover") {
          e.state = "peek";
          e.timer = 1300 + Math.random() * 900;
        } else if (e.state === "peek") {
          if (this.attack && this.attack.shooter === e) continue;
          e.state = "cover";
          e.timer = 900 + Math.random() * 1600;
        } else if (e.state === "down") {
          e.state = "empty";
          e.timer = 800;
        } else if (e.state === "empty" && this.defeated + this.activeEnemies() < TARGET) {
          Object.assign(e, newEnemy(e.lane));
        }
      }

      for (const b of this.bullets) b.x += BULLET_SPEED * s;
      for (const b of this.bullets) {
        if (b.x < BLOCK_X - 22) continue;
        b.done = true;
        const e = this.enemies[b.lane];
        if (e.state === "peek") {
          e.state = "down";
          e.timer = 1200;
          e.flash = 400;
          this.defeated++;
          this.popup("PAF!", ENEMY_X, LANES[b.lane] - 80, "#ffe066");
          if (this.attack && this.attack.shooter === e) {
            this.popup("Gered!", PLAYER_X + 30, LANES[this.lane] - 70, "#6ee07a");
            this.endAttack();
          }
          if (this.defeated >= TARGET) {
            this.over = true;
            this.api.complete();
            return;
          }
        } else {
          this.popup("Tok!", BLOCK_X, LANES[b.lane] - 50, "#ffffff");
        }
      }
      this.bullets = this.bullets.filter((b) => !b.done);

      for (const sh of this.enemyShots) sh.x -= BULLET_SPEED * s;
      this.enemyShots = this.enemyShots.filter((sh) => sh.x > -20);

      if (this.attack) {
        this.attack.left -= dt;
        if (this.attack.left <= 0) this.getHit("Te langzaam!");
      } else {
        this.attackTimer -= dt;
        if (this.attackTimer <= 0) this.startAttack();
      }
    },

    activeEnemies() {
      return this.enemies.filter((e) => e.state === "cover" || e.state === "peek").length;
    },

    render(ctx, t) {
      drawArena(ctx, t);

      for (const e of this.enemies) {
        const y = LANES[e.lane];
        if (e.state === "empty") {
          drawBlock(ctx, e.lane);
          continue;
        }
        if (e.state === "down") {
          G.drawKid(ctx, ENEMY_X + 45, y, 0.9, e.look, { pose: "down", baby: true, dizzy: true, facing: -1, t });
          drawBlock(ctx, e.lane);
          continue;
        }
        const peek = e.state === "peek";
        const hand = G.drawKid(ctx, ENEMY_X, y + (peek ? -30 : 4), 0.9, e.look, {
          baby: true,
          facing: -1,
          t,
          flash: e.flash > 0,
          angry: peek,
          armAngle: peek ? -0.1 : Math.PI / 2,
        });
        if (peek) G.drawPistol(ctx, hand.x, hand.y, Math.PI, 0.9, "#f07a3c");
        drawBlock(ctx, e.lane);
      }

      const a = this.attack;
      if (a) {
        const sy = LANES[a.shooter.lane] - 40;
        ctx.strokeStyle = `rgba(255, 60, 60, ${0.5 + Math.sin(t * 20) * 0.3})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(ENEMY_X - 30, sy);
        ctx.lineTo(PLAYER_X + 20, this.y - 20);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#ff4d4d";
        ctx.font = "bold 30px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("!", ENEMY_X, sy - 50);
      }

      const hand = G.drawKid(ctx, PLAYER_X, this.y, 0.9, G.playerKidLook(), {
        pose: "crawl",
        baby: true,
        t,
        flash: this.flash > 0,
      });
      G.drawPistol(ctx, hand.x + 6, hand.y - 8, 0, 0.9);

      ctx.fillStyle = "#ffe066";
      for (const b of this.bullets) {
        ctx.beginPath();
        ctx.arc(b.x, LANES[b.lane] - 22, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#ff7a3c";
      for (const sh of this.enemyShots) {
        ctx.beginPath();
        ctx.arc(sh.x, LANES[sh.lane] - 22, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      if (a) {
        const bx = PLAYER_X + 40;
        const by = this.y - 118;
        ctx.fillStyle = "rgba(20, 16, 36, 0.85)";
        ctx.beginPath();
        ctx.roundRect(bx - 10, by - 8, 150, 58, 12);
        ctx.fill();
        ctx.font = "bold 28px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        a.seq.forEach(([dx, dy], i) => {
          ctx.fillStyle = i < a.index ? "#6ee07a" : "#ffffff";
          ctx.fillText(ARROWS[`${dx},${dy}`], bx + 25 + i * 40, by + 26);
        });
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fillRect(bx, by + 38, 130, 5);
        ctx.fillStyle = "#ff6b6b";
        ctx.fillRect(bx, by + 38, 130 * Math.max(0, a.left / DODGE_MS), 5);
      }

      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return `Uitgeschakeld: ${this.defeated} / ${TARGET} · Geraakt: ${this.hits} / ${MAX_HITS}`;
    },
  };
})();
