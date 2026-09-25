(() => {
  const { W, H } = G;
  const CLASS_MS = 3800;
  const ROUND_END_MS = 1700;
  const WINS_NEEDED = 3;
  const PLAYER_SPEED = 150;
  const BODY_R = 13;
  const SHOT_COOLDOWN = 350;
  const BALL_SPEED = 480;
  const BALL_RANGE = 520;
  const BULLY_SPEED = 110;
  const BULLY_SHOT_GAP = 260;
  const BULLY_JITTER = 0.13;
  const PLAYER_PAINT = "#2f8cff";
  const BULLY_PAINT = "#ff7a1a";
  const BUNKERS = [
    { x: 170, y: 120, r: 26, color: "#e04a8a" },
    { x: 370, y: 120, r: 26, color: "#3fb6a8" },
    { x: 270, y: 225, r: 34, color: "#f0c030" },
    { x: 170, y: 330, r: 26, color: "#3fb6a8" },
    { x: 370, y: 330, r: 26, color: "#e04a8a" },
    { x: 115, y: 225, r: 20, color: "#8a6ad8" },
    { x: 425, y: 225, r: 20, color: "#8a6ad8" },
  ];

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function segmentHitsCircle(a, b, c) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy || 1;
    const k = G.clamp(((c.x - a.x) * dx + (c.y - a.y) * dy) / len2, 0, 1);
    return Math.hypot(a.x + dx * k - c.x, a.y + dy * k - c.y) < c.r;
  }

  const clearShot = (a, b) => !BUNKERS.some((c) => segmentHitsCircle(a, b, c));

  function pushOut(p) {
    for (const c of BUNKERS) {
      const d = dist(p, c);
      if (d < c.r + BODY_R && d > 0) {
        p.x = c.x + ((p.x - c.x) / d) * (c.r + BODY_R);
        p.y = c.y + ((p.y - c.y) / d) * (c.r + BODY_R);
      }
    }
    p.x = G.clamp(p.x, 25, W - 25);
    p.y = G.clamp(p.y, 60, H - 15);
  }

  function drawField(ctx) {
    ctx.fillStyle = "#6f9a4a";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#86ad5a";
    for (let i = 0; i < 30; i++) {
      ctx.beginPath();
      ctx.ellipse((i * 131) % W, 60 + ((i * 71) % (H - 60)), 30, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(20, 20, 20, 0.5)";
    ctx.lineWidth = 2;
    for (let x = 0; x < W; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 20);
      ctx.lineTo(x + 16, 46);
      ctx.moveTo(x + 16, 20);
      ctx.lineTo(x, 46);
      ctx.stroke();
    }
    ctx.fillStyle = "#2b2b2b";
    ctx.fillRect(0, 44, W, 4);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px Segoe UI, Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PAINTBALLPARK", W / 2, 16);
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 50);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawBunkers(ctx) {
    for (const b of BUNKERS) {
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.beginPath();
      ctx.ellipse(b.x + 5, b.y + 8, b.r, b.r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.beginPath();
      ctx.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawSplat(ctx, s) {
    ctx.fillStyle = s.color;
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r = s.r * (i % 2 ? 0.6 : 1) * (0.8 + ((s.seed * (i + 1)) % 1) * 0.4);
      ctx.lineTo(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r);
    }
    ctx.fill();
  }

  // Paintball player with a mask; returns the hand position.
  function drawBaller(ctx, x, y, look, facing, t, opts) {
    const s = 0.6;
    const hand = G.drawKid(ctx, x, y, s, look, { facing, t, armAngle: -0.1, pose: opts.moving ? "walk" : "stand", flash: opts.flash });
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.roundRect(x + facing * 3 * s - 11 * s, y - 59 * s, 22 * s, 9 * s, 4);
    ctx.fill();
    ctx.fillStyle = "rgba(120, 200, 255, 0.8)";
    ctx.beginPath();
    ctx.roundRect(x + facing * 5 * s - 7 * s, y - 57.5 * s, 14 * s, 5 * s, 3);
    ctx.fill();
    G.drawPistol(ctx, hand.x, hand.y, facing === 1 ? 0 : Math.PI, 0.75, "#2b3a4a");
    ctx.fillStyle = opts.paint;
    ctx.beginPath();
    ctx.arc(hand.x - facing * 2, hand.y - 9, 4, 0, Math.PI * 2);
    ctx.fill();
    return hand;
  }

  function renderClass(ctx, t, k, bullyLook) {
    G.drawClassroom(ctx);
    G.drawDesk(ctx, 150, 360);
    G.drawDesk(ctx, 380, 360);
    G.drawKid(ctx, 150, 360, 1, G.playerKidLook(), { pose: "sit", t, crying: k > 0.4 && k < 0.7 });
    G.drawKid(ctx, 380, 360, 1, bullyLook, { pose: "sit", facing: -1, t, angry: true, armAngle: k < 0.35 ? -1.2 : 0 });
    if (k > 0.12 && k < 0.4) {
      const f = (k - 0.12) / 0.28;
      ctx.fillStyle = "#f4f4f4";
      ctx.beginPath();
      ctx.arc(370 - f * 210, 300 - Math.sin(f * Math.PI) * 60, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (k > 0.4 && k < 0.7) G.drawBubble(ctx, 150, 270, "Au!");
    if (k >= 0.7) {
      G.drawBubble(ctx, 150, 270, "Jij en ik. Na school. Paintball!");
      G.drawBubble(ctx, 380, 270, "Deal. Je gaat eraan.");
    }
  }

  G.c2level4 = {
    title: "Level 4 — De uitdaging (6 jaar)",
    intro:
      "Loop met de <strong>pijltjes / WASD</strong>. Mik met de <strong>muis</strong> en schiet door te <strong>klikken</strong>, " +
      "of druk op <strong>SPATIE</strong> om recht op je tegenstander te schieten.<br>" +
      `Gebruik de bunkers als dekking. Wie het eerst <strong>${WINS_NEEDED} rondes</strong> wint, wint.`,

    drawBackground(ctx) {
      G.drawClassroom(ctx);
    },

    start(api) {
      this.api = api;
      this.phase = "class";
      this.timer = CLASS_MS;
      this.bullyLook = G.randomLook({ shirt: "#8a2b2b" });
      this.score = { player: 0, bully: 0 };
      this.splats = [];
      this.aim = null;
      this.popups = [];
      this.over = false;
      this.resetRound();
    },

    resetRound() {
      this.player = { x: 50, y: 225, facing: 1, moving: false, flash: 0 };
      this.bully = { x: W - 50, y: 225, state: "move", timer: 0, target: null, shots: 0, flash: 0 };
      this.pickCover();
      this.balls = [];
      this.cooldown = 0;
    },

    pickCover() {
      const b = this.bully;
      const options = BUNKERS.filter((c) => c.x >= 260);
      const c = G.pick(options);
      const d = dist(c, this.player) || 1;
      b.cover = c;
      b.target = { x: c.x + ((c.x - this.player.x) / d) * (c.r + 18), y: c.y + ((c.y - this.player.y) / d) * (c.r + 18) };
      b.state = "move";
    },

    shoot(from, tx, ty, owner) {
      const d = Math.hypot(tx - from.x, ty - from.y) || 1;
      this.balls.push({ x: from.x, y: from.y, vx: ((tx - from.x) / d) * BALL_SPEED, vy: ((ty - from.y) / d) * BALL_SPEED, travelled: 0, owner });
    },

    playerShoot(tx, ty) {
      if (this.phase !== "round" || this.over || this.cooldown > 0) return;
      this.cooldown = SHOT_COOLDOWN;
      const p = this.player;
      p.facing = tx >= p.x ? 1 : -1;
      this.shoot({ x: p.x, y: p.y - 22 }, tx, ty, "player");
    },

    onAction() {
      this.playerShoot(this.bully.x, this.bully.y - 22);
    },

    onPointer(x, y) {
      this.playerShoot(x, y);
    },

    onPointerMove(x, y) {
      this.aim = { x, y };
    },

    endRound(winner) {
      this.score[winner]++;
      this.phase = "roundEnd";
      this.timer = ROUND_END_MS;
      this.roundWinner = winner;
    },

    updateBully(dt) {
      const s = dt / 1000;
      const b = this.bully;
      const p = this.player;
      b.timer -= dt;
      const moveTo = (target) => {
        const d = dist(b, target);
        if (d < 4) return true;
        b.x += ((target.x - b.x) / d) * BULLY_SPEED * s;
        b.y += ((target.y - b.y) / d) * BULLY_SPEED * s;
        pushOut(b);
        return false;
      };
      if (b.state === "move") {
        if (moveTo(b.target)) {
          b.state = "hide";
          b.timer = 700 + Math.random() * 900;
        }
      } else if (b.state === "hide") {
        if (b.timer <= 0) {
          const c = b.cover;
          const d = dist(c, p) || 1;
          const side = Math.random() < 0.5 ? 1 : -1;
          const px = -(c.y - p.y) / d;
          const py = (c.x - p.x) / d;
          b.peek = { x: b.target.x + px * side * (c.r + 14), y: b.target.y + py * side * (c.r + 14) };
          b.state = "peek";
        }
      } else if (b.state === "peek") {
        if (moveTo(b.peek)) {
          b.state = "fire";
          b.shots = 1 + G.randInt(2);
          b.timer = 150;
        }
      } else if (b.state === "fire") {
        if (b.timer <= 0) {
          const from = { x: b.x, y: b.y - 22 };
          const to = { x: p.x, y: p.y - 22 };
          if (clearShot(from, to)) {
            const a = Math.atan2(to.y - from.y, to.x - from.x) + (Math.random() - 0.5) * 2 * BULLY_JITTER;
            this.shoot(from, from.x + Math.cos(a) * 100, from.y + Math.sin(a) * 100, "bully");
          }
          b.shots--;
          b.timer = BULLY_SHOT_GAP;
          if (b.shots <= 0) {
            if (Math.random() < 0.35) this.pickCover();
            else b.state = "back";
          }
        }
      } else if (b.state === "back") {
        if (moveTo(b.target)) {
          b.state = "hide";
          b.timer = 900 + Math.random() * 900;
        }
      }
    },

    update(dt) {
      const s = dt / 1000;
      this.popups = G.updatePopups(this.popups, dt);
      if (this.phase === "class") {
        this.timer -= dt;
        if (this.timer <= 0) this.phase = "round";
        return;
      }
      if (this.over) return;
      if (this.phase === "roundEnd") {
        this.timer -= dt;
        if (this.timer > 0) return;
        if (this.score.player >= WINS_NEEDED) {
          this.over = true;
          this.api.complete();
        } else if (this.score.bully >= WINS_NEEDED) {
          this.over = true;
          this.api.fail("Je tegenstander won het potje paintball.");
        } else {
          this.resetRound();
          this.phase = "round";
        }
        return;
      }

      const p = this.player;
      this.cooldown = Math.max(0, this.cooldown - dt);
      const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
      const my = (G.held.down ? 1 : 0) - (G.held.up ? 1 : 0);
      p.moving = !!(mx || my);
      if (p.moving) {
        const len = Math.hypot(mx, my);
        p.x += (mx / len) * PLAYER_SPEED * s;
        p.y += (my / len) * PLAYER_SPEED * s;
        if (mx) p.facing = mx;
        pushOut(p);
      }
      this.updateBully(dt);

      for (const ball of this.balls) {
        ball.x += ball.vx * s;
        ball.y += ball.vy * s;
        ball.travelled += BALL_SPEED * s;
        const color = ball.owner === "player" ? PLAYER_PAINT : BULLY_PAINT;
        const bunker = BUNKERS.find((c) => dist(ball, c) < c.r);
        if (bunker || ball.travelled > BALL_RANGE || ball.x < 0 || ball.x > W || ball.y < 50 || ball.y > H) {
          ball.done = true;
          this.splats.push({ x: ball.x, y: ball.y, r: 7, color, seed: Math.random() });
          continue;
        }
        const victim = ball.owner === "player" ? this.bully : this.player;
        if (Math.hypot(ball.x - victim.x, ball.y - (victim.y - 22)) < BODY_R + 4) {
          ball.done = true;
          victim.flash = 500;
          this.splats.push({ x: ball.x, y: ball.y + 18, r: 12, color, seed: Math.random() });
          this.popup("UIT!", victim.x, victim.y - 60, "#ffffff");
          this.endRound(ball.owner);
          break;
        }
      }
      this.balls = this.balls.filter((ball) => !ball.done);
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 1000 });
    },

    render(ctx, t) {
      if (this.phase === "class") {
        renderClass(ctx, t, 1 - this.timer / CLASS_MS, this.bullyLook);
        return;
      }
      drawField(ctx);
      for (const sp of this.splats) drawSplat(ctx, sp);
      drawBunkers(ctx);
      for (const sp of this.splats) if (BUNKERS.some((c) => dist(sp, c) < c.r + 2)) drawSplat(ctx, sp);

      const p = this.player;
      const b = this.bully;
      const actors = [
        { y: b.y, draw: () => drawBaller(ctx, b.x, b.y, this.bullyLook, p.x < b.x ? -1 : 1, t, { paint: BULLY_PAINT, flash: b.flash > 0, moving: b.state !== "hide" && b.state !== "fire" }) },
        { y: p.y, draw: () => drawBaller(ctx, p.x, p.y, G.playerKidLook(), p.facing, t, { paint: PLAYER_PAINT, flash: p.flash > 0, moving: p.moving }) },
      ].sort((a, c) => a.y - c.y);
      for (const a of actors) a.draw();

      for (const ball of this.balls) {
        ctx.fillStyle = ball.owner === "player" ? PLAYER_PAINT : BULLY_PAINT;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      if (this.aim && this.phase === "round") {
        ctx.strokeStyle = "rgba(255,255,255,0.45)";
        ctx.setLineDash([4, 6]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 22);
        ctx.lineTo(this.aim.x, this.aim.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(W / 2 - 70, 52, 140, 26);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 15px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`Jij ${this.score.player} – ${this.score.bully} Pester`, W / 2, 70);

      if (this.phase === "roundEnd") {
        const won = this.roundWinner === "player";
        G.drawBanner(ctx, won ? "Raak! Ronde voor jou." : "Geraakt! Ronde voor de pester.", won ? "#6ee07a" : "#ff9f6b", H - 40);
      }
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      if (this.phase === "class") return "...";
      return `Rondes: ${this.score.player} – ${this.score.bully} (eerste tot ${WINS_NEEDED})`;
    },
  };
})();
