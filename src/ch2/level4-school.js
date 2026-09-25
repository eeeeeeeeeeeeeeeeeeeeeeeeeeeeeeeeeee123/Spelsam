(() => {
  const { W, H } = G;
  const CLASS_MS = 3200;
  const TARGET = 3;
  const PLAYER_SPEED = 150;
  const PLAYER_R = 12;
  const THROW_COOLDOWN = 600;
  const PROP_SPEED = 380;
  const PROP_RANGE = 280;
  const BULLY_SPEED = 70;
  const BULLY_THROW_MS = 2600;
  const BULLY_PROP_SPEED = 220;
  const STUN_MS = 700;
  const TEACHER_SPEED = 55;
  const ALERT_SPEED = 120;
  const ALERT_MS = 4500;
  const VIEW_RANGE = 170;
  const ALERT_RANGE = 210;
  const VIEW_HALF = 0.55;
  const COVERS = [
    { x: 150, y: 160, r: 28 },
    { x: 390, y: 130, r: 28 },
    { x: 270, y: 270, r: 30 },
    { x: 115, y: 350, r: 26 },
    { x: 430, y: 340, r: 28 },
  ];
  const PATROL = [
    { x: 70, y: 80 },
    { x: 470, y: 80 },
    { x: 470, y: 410 },
    { x: 70, y: 410 },
  ];

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function segmentHitsCircle(a, b, c) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy || 1;
    const k = G.clamp(((c.x - a.x) * dx + (c.y - a.y) * dy) / len2, 0, 1);
    return Math.hypot(a.x + dx * k - c.x, a.y + dy * k - c.y) < c.r;
  }

  function lineOfSight(a, b) {
    return !COVERS.some((c) => segmentHitsCircle(a, b, c));
  }

  function pushOut(p, r) {
    for (const c of COVERS) {
      const d = dist(p, c);
      if (d < c.r + r && d > 0) {
        p.x = c.x + ((p.x - c.x) / d) * (c.r + r);
        p.y = c.y + ((p.y - c.y) / d) * (c.r + r);
      }
    }
    p.x = G.clamp(p.x, 20, W - 20);
    p.y = G.clamp(p.y, 40, H - 20);
  }

  function randomSpot() {
    for (;;) {
      const p = { x: 60 + Math.random() * (W - 120), y: 70 + Math.random() * (H - 120) };
      if (COVERS.every((c) => dist(p, c) > c.r + 20)) return p;
    }
  }

  function drawPlayground(ctx, t) {
    ctx.fillStyle = "#b9b4aa";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 3;
    ctx.strokeRect(300, 380, 90, 50);
    for (let i = 0; i < 6; i++) ctx.strokeRect(40 + i * 28, 30, 26, 26);
    for (const c of COVERS) {
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.beginPath();
      ctx.ellipse(c.x + 6, c.y + 8, c.r, c.r * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3f8f3a";
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#57a84f";
      ctx.beginPath();
      ctx.arc(c.x - 8, c.y - 8, c.r * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawProp(ctx, p) {
    ctx.fillStyle = "#f4f4f4";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#c9c9c9";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  G.c2level4 = {
    title: "Level 4 — De pester (6 jaar)",
    intro:
      "In de klas gooit de <strong>pester</strong> een propje tegen je hoofd. In de pauze neem je wraak met <strong>propjes</strong>!<br>" +
      "Loop met de <strong>pijltjes / WASD</strong>. Gooi door te <strong>klikken</strong> waar je heen mikt (of <strong>SPATIE</strong> gooit naar de pester). Raak hem <strong>3 keer</strong>.<br>" +
      "Maar pas op voor de <strong>pleinwacht</strong>: gooi nooit in haar kijkveld. Na een treffer komt ze kijken waar je stond: <strong>ren weg en verstop je</strong> achter de bomen!",

    drawBackground(ctx, t) {
      G.drawClassroom(ctx);
    },

    start(api) {
      this.api = api;
      this.phase = "class";
      this.timer = CLASS_MS;
      this.player = { x: 70, y: 400, stun: 0, facing: 1 };
      this.bully = { ...randomSpot(), target: randomSpot(), pause: 0, throwTimer: BULLY_THROW_MS, flash: 0 };
      this.teacher = { x: PATROL[0].x, y: PATROL[0].y, wp: 1, angle: 0, alert: 0, spot: null };
      this.props = [];
      this.bullyProps = [];
      this.hits = 0;
      this.cooldown = 0;
      this.aim = null;
      this.popups = [];
      this.over = false;
      this.bullyLook = G.randomLook({ shirt: "#8a2b2b" });
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 800 });
    },

    viewAngle(t) {
      return this.teacher.angle + (this.teacher.alert > 0 ? Math.sin(t * 3) * 0.9 : Math.sin(t * 1.3) * 0.35);
    },

    sees(p) {
      const tc = this.teacher;
      const range = tc.alert > 0 ? ALERT_RANGE : VIEW_RANGE;
      if (dist(tc, p) > range) return false;
      let diff = Math.atan2(p.y - tc.y, p.x - tc.x) - this.viewAngle(this.now || 0);
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      return Math.abs(diff) < VIEW_HALF && lineOfSight(tc, p);
    },

    caught() {
      this.over = true;
      this.api.fail("De pleinwacht zag je! Je moet naar de directeur.");
    },

    throwAt(tx, ty) {
      if (this.phase !== "play" || this.over || this.cooldown > 0 || this.player.stun > 0) return;
      const p = this.player;
      const d = Math.hypot(tx - p.x, ty - p.y) || 1;
      this.cooldown = THROW_COOLDOWN;
      this.player.facing = tx >= p.x ? 1 : -1;
      this.props.push({ x: p.x, y: p.y - 20, vx: ((tx - p.x) / d) * PROP_SPEED, vy: ((ty - p.y) / d) * PROP_SPEED, travelled: 0, from: { x: p.x, y: p.y } });
      if (this.sees(p)) this.caught();
    },

    onAction() {
      this.throwAt(this.bully.x, this.bully.y);
    },

    onPointer(x, y) {
      this.throwAt(x, y);
    },

    onPointerMove(x, y) {
      this.aim = { x, y };
    },

    update(dt, t) {
      this.now = t;
      const s = dt / 1000;
      this.popups = G.updatePopups(this.popups, dt);
      if (this.phase === "class") {
        this.timer -= dt;
        if (this.timer <= 0) this.phase = "play";
        return;
      }
      if (this.over) return;

      const p = this.player;
      p.stun = Math.max(0, p.stun - dt);
      this.cooldown = Math.max(0, this.cooldown - dt);
      if (p.stun <= 0) {
        const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
        const my = (G.held.down ? 1 : 0) - (G.held.up ? 1 : 0);
        if (mx || my) {
          const len = Math.hypot(mx, my);
          p.x += (mx / len) * PLAYER_SPEED * s;
          p.y += (my / len) * PLAYER_SPEED * s;
          if (mx) p.facing = mx;
          p.moving = true;
        } else p.moving = false;
        pushOut(p, PLAYER_R);
      }

      const b = this.bully;
      b.flash = Math.max(0, b.flash - dt);
      if (b.pause > 0) b.pause -= dt;
      else {
        const d = dist(b, b.target);
        if (d < 5) {
          b.target = randomSpot();
          b.pause = 600 + Math.random() * 900;
        } else {
          b.x += ((b.target.x - b.x) / d) * BULLY_SPEED * s;
          b.y += ((b.target.y - b.y) / d) * BULLY_SPEED * s;
          pushOut(b, PLAYER_R);
        }
      }
      b.throwTimer -= dt;
      if (b.throwTimer <= 0) {
        b.throwTimer = BULLY_THROW_MS;
        const d = dist(b, p) || 1;
        if (d < 320) this.bullyProps.push({ x: b.x, y: b.y - 20, vx: ((p.x - b.x) / d) * BULLY_PROP_SPEED, vy: ((p.y - b.y) / d) * BULLY_PROP_SPEED, travelled: 0 });
      }

      const tc = this.teacher;
      if (tc.alert > 0) {
        tc.alert -= dt;
        const d = dist(tc, tc.spot);
        if (d > 4) {
          tc.angle = Math.atan2(tc.spot.y - tc.y, tc.spot.x - tc.x);
          tc.x += ((tc.spot.x - tc.x) / d) * ALERT_SPEED * s;
          tc.y += ((tc.spot.y - tc.y) / d) * ALERT_SPEED * s;
        }
        if (this.sees(p)) {
          this.caught();
          return;
        }
      } else {
        const wp = PATROL[tc.wp];
        const d = dist(tc, wp);
        if (d < 4) tc.wp = (tc.wp + 1) % PATROL.length;
        else {
          tc.angle = Math.atan2(wp.y - tc.y, wp.x - tc.x);
          tc.x += ((wp.x - tc.x) / d) * TEACHER_SPEED * s;
          tc.y += ((wp.y - tc.y) / d) * TEACHER_SPEED * s;
        }
      }

      for (const pr of this.props) {
        pr.x += pr.vx * s;
        pr.y += pr.vy * s;
        pr.travelled += PROP_SPEED * s;
        if (pr.travelled > PROP_RANGE || COVERS.some((c) => dist(pr, c) < c.r)) pr.done = true;
        else if (Math.hypot(pr.x - b.x, pr.y - (b.y - 20)) < 18) {
          pr.done = true;
          this.hits++;
          b.flash = 400;
          this.popup("Raak!", b.x, b.y - 60, "#ffe066");
          if (this.hits >= TARGET) {
            this.over = true;
            this.api.complete();
            return;
          }
          tc.alert = ALERT_MS;
          tc.spot = { ...pr.from };
          this.popup("Wat was dat?!", tc.x, tc.y - 60, "#ff9f6b");
        }
      }
      this.props = this.props.filter((pr) => !pr.done);

      for (const pr of this.bullyProps) {
        pr.x += pr.vx * s;
        pr.y += pr.vy * s;
        pr.travelled += BULLY_PROP_SPEED * s;
        if (pr.travelled > 340 || COVERS.some((c) => dist(pr, c) < c.r)) pr.done = true;
        else if (Math.hypot(pr.x - p.x, pr.y - (p.y - 20)) < 16) {
          pr.done = true;
          p.stun = STUN_MS;
          this.popup("Au!", p.x, p.y - 60, "#ff6b6b");
        }
      }
      this.bullyProps = this.bullyProps.filter((pr) => !pr.done);
    },

    renderClass(ctx, t) {
      G.drawClassroom(ctx);
      const k = 1 - this.timer / CLASS_MS;
      G.drawDesk(ctx, 150, 360);
      G.drawDesk(ctx, 380, 360);
      G.drawKid(ctx, 150, 360, 1, G.playerKidLook(), { pose: "sit", t, crying: k > 0.45 && k < 0.8 });
      const bullyLook = this.bullyLook;
      G.drawKid(ctx, 380, 360, 1, bullyLook, { pose: "sit", facing: -1, t, angry: true, armAngle: k < 0.4 ? -1.2 : 0 });
      if (k > 0.15 && k < 0.45) {
        const f = (k - 0.15) / 0.3;
        drawProp(ctx, { x: 370 - f * 210, y: 300 - Math.sin(f * Math.PI) * 60 });
      }
      if (k > 0.45 && k < 0.8) G.drawBubble(ctx, 150, 270, "Au!");
      if (k >= 0.8) G.drawBanner(ctx, "PAUZE!", "#ffe066", 200);
    },

    render(ctx, t) {
      if (this.phase === "class") {
        this.renderClass(ctx, t);
        return;
      }
      drawPlayground(ctx, t);
      const tc = this.teacher;
      const va = this.viewAngle(t);
      const range = tc.alert > 0 ? ALERT_RANGE : VIEW_RANGE;
      ctx.fillStyle = tc.alert > 0 ? "rgba(255, 70, 70, 0.28)" : "rgba(255, 230, 120, 0.3)";
      ctx.beginPath();
      ctx.moveTo(tc.x, tc.y);
      ctx.arc(tc.x, tc.y, range, va - VIEW_HALF, va + VIEW_HALF);
      ctx.closePath();
      ctx.fill();

      const b = this.bully;
      const bullyLook = this.bullyLook;
      const p = this.player;
      const actors = [
        { y: b.y, draw: () => G.drawKid(ctx, b.x, b.y, 0.6, bullyLook, { facing: p.x < b.x ? -1 : 1, t, angry: true, flash: b.flash > 0, pose: b.pause > 0 ? "stand" : "walk" }) },
        { y: tc.y, draw: () => G.drawKid(ctx, tc.x, tc.y, 0.75, { ...G.SKINS.wit, hair: "lang", hairColor: "#8a5a2b", eyes: G.EYES.blauw, gender: "meisje", shirt: "#f0b43c", pants: "#444" }, { adult: true, facing: Math.cos(va) >= 0 ? 1 : -1, t, pose: "walk" }) },
        { y: p.y, draw: () => G.drawKid(ctx, p.x, p.y, 0.6, G.playerKidLook(), { facing: p.facing, t, pose: p.moving ? "walk" : "stand", crying: p.stun > 0 }) },
      ].sort((a, c) => a.y - c.y);
      for (const a of actors) a.draw();

      for (const pr of this.props) drawProp(ctx, pr);
      for (const pr of this.bullyProps) drawProp(ctx, pr);

      if (this.aim) {
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.setLineDash([4, 6]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 20);
        ctx.lineTo(this.aim.x, this.aim.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (tc.alert > 0) {
        ctx.fillStyle = "#ff4d4d";
        ctx.font = "bold 26px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("!", tc.x, tc.y - 70);
      }
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      if (this.phase === "class") return "In de klas...";
      return `Raak: ${this.hits} / ${TARGET}${this.teacher.alert > 0 ? " · VERSTOP JE!" : ""}`;
    },
  };
})();
