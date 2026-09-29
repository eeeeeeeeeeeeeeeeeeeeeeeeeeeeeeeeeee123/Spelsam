(() => {
  const { W, H } = G;
  const HITS_NEEDED = 3;
  const TANK = 8;
  const COOLDOWN = 350;
  const FLIGHT_MS = 350;
  const AIM_SPEED = 260;
  const RUN_Y = 330;
  const RUN_MIN = 190;
  const RUN_MAX = 500;
  const RUN_SPEED = 150;
  const RUN_SPEEDUP = 55;
  const CAUGHT_MS = 2400;
  const EXPELLED_MS = 2600;
  const PLAYER = { x: 80, y: 425 };
  const TEACHER_LOOK = { ...G.SKINS.wit, hair: "lang", hairColor: "#b07a3a", eyes: G.EYES.groen, gender: "meisje", shirt: "#7a5ac0", pants: "#3a3550" };

  // Bright plastic toy water pistol with a tank on top.
  function drawWaterPistol(ctx, x, y, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    if (Math.cos(angle) < -0.01) ctx.scale(1, -1);
    ctx.fillStyle = "#3fd46a";
    ctx.beginPath();
    ctx.roundRect(-8, -6, 26, 9, 4);
    ctx.fill();
    ctx.fillStyle = "#ff8a1a";
    ctx.fillRect(18, -4, 6, 5);
    ctx.fillRect(-8, 1, 7, 11);
    ctx.fillStyle = "rgba(120, 200, 255, 0.85)";
    ctx.beginPath();
    ctx.roundRect(-4, -15, 14, 10, 4);
    ctx.fill();
    ctx.restore();
  }

  function teacherBox(tx) {
    return { x: tx - 20, y: RUN_Y - 112, w: 40, h: 108 };
  }

  G.c2level7 = {
    title: "Level 7 — In de klas (7 jaar)",
    intro:
      "Een gewone schooldag... of niet?<br>" +
      "Mik met de <strong>muis</strong> (of de <strong>pijltjes</strong>) en spuit met <strong>SPATIE</strong> of een <strong>klik</strong>. Let op: je tank is niet oneindig.",

    drawBackground(ctx, t) {
      G.drawClassroom(ctx);
      G.drawKid(ctx, 330, RUN_Y, 1.1, TEACHER_LOOK, { adult: true, facing: -1, t });
      G.drawKid(ctx, PLAYER.x, PLAYER.y, 1.05, G.playerKidLook(), { t });
    },

    start(api) {
      this.api = api;
      this.script = G.makeScript([
        { who: "teacher", text: "Jij blijft vandaag na!", ms: 1700 },
        { who: "player", text: "Dat is niet eerlijk!", ms: 1500 },
      ]);
      this.phase = "argue";
      this.timer = 0;
      this.teacher = { x: 330, dir: -1, facing: -1 };
      this.aim = { x: 330, y: 250 };
      this.squirts = [];
      this.splashes = [];
      this.drops = [];
      this.water = TANK;
      this.hits = 0;
      this.cooldown = 0;
      this.popups = [];
    },

    fire() {
      if (this.phase !== "aim" || this.cooldown > 0 || this.water <= 0) return;
      this.cooldown = COOLDOWN;
      this.water--;
      const from = this.gunTip || { x: PLAYER.x + 30, y: PLAYER.y - 45 };
      this.squirts.push({ from: { ...from }, to: { ...this.aim }, k: 0 });
    },

    onAction() {
      this.fire();
    },

    onPointer(x, y) {
      this.aim = { x, y };
      this.fire();
    },

    onPointerMove(x, y) {
      this.aim = { x, y };
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 800 });
    },

    update(dt) {
      const s = dt / 1000;
      this.popups = G.updatePopups(this.popups, dt);
      for (const d of this.drops) {
        d.y += d.vy * s;
        d.vy += 400 * s;
        d.life -= dt;
      }
      this.drops = this.drops.filter((d) => d.life > 0);
      for (const sp of this.splashes) sp.life -= dt;
      this.splashes = this.splashes.filter((sp) => sp.life > 0);

      if (this.phase === "argue") {
        this.script.update(dt);
        if (this.script.done()) this.phase = "aim";
        return;
      }
      if (this.phase === "caught" || this.phase === "expelled") {
        if (Math.random() < 0.5) this.drip();
        this.timer -= dt;
        if (this.timer > 0) return;
        if (this.phase === "caught") {
          this.phase = "expelled";
          this.timer = EXPELLED_MS;
        } else this.api.complete();
        return;
      }

      this.cooldown = Math.max(0, this.cooldown - dt);
      const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
      const my = (G.held.down ? 1 : 0) - (G.held.up ? 1 : 0);
      if (mx || my) {
        this.aim.x = G.clamp(this.aim.x + mx * AIM_SPEED * s, 0, W);
        this.aim.y = G.clamp(this.aim.y + my * AIM_SPEED * s, 0, H);
      }

      const tc = this.teacher;
      const speed = RUN_SPEED + this.hits * RUN_SPEEDUP;
      tc.x += tc.dir * speed * s;
      if (tc.x < RUN_MIN || tc.x > RUN_MAX || Math.random() < 0.004) {
        tc.x = G.clamp(tc.x, RUN_MIN, RUN_MAX);
        tc.dir *= -1;
      }
      tc.facing = tc.dir;
      if (Math.random() < 0.12 * this.hits) this.drip();

      for (const sq of this.squirts) {
        sq.k += dt / FLIGHT_MS;
        if (sq.k < 1) continue;
        sq.done = true;
        const b = teacherBox(tc.x);
        const hit = sq.to.x > b.x && sq.to.x < b.x + b.w && sq.to.y > b.y && sq.to.y < b.y + b.h;
        this.splashes.push({ x: sq.to.x, y: sq.to.y, life: 350, big: hit });
        if (!hit) continue;
        this.hits++;
        this.popup(this.hits < HITS_NEEDED ? "Hé!!" : "KLETSNAT!", tc.x, RUN_Y - 60, "#7fd1ff");
        if (this.hits >= HITS_NEEDED) {
          this.phase = "caught";
          this.timer = CAUGHT_MS;
          this.squirts = [];
          return;
        }
      }
      this.squirts = this.squirts.filter((sq) => !sq.done);

      if (this.water <= 0 && !this.squirts.length && this.hits < HITS_NEEDED) {
        this.api.fail("Je water is op!");
      }
    },

    drip() {
      const tc = this.teacher;
      this.drops.push({ x: tc.x - 14 + Math.random() * 28, y: RUN_Y - 100 + Math.random() * 60, vy: 20, life: 500 });
    },

    render(ctx, t) {
      G.drawClassroom(ctx);
      const tc = this.teacher;
      const running = this.phase === "aim";
      G.drawKid(ctx, tc.x, RUN_Y, 1.1, TEACHER_LOOK, {
        adult: true,
        facing: tc.facing,
        t,
        pose: running ? "walk" : "stand",
        angry: this.phase !== "aim" || this.hits > 0,
      });
      ctx.fillStyle = "#7fc4ff";
      for (const d of this.drops) {
        ctx.beginPath();
        ctx.arc(d.x, d.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      const angle = Math.atan2(this.aim.y - (PLAYER.y - 45), this.aim.x - PLAYER.x);
      const hand = G.drawKid(ctx, PLAYER.x, PLAYER.y, 1.05, G.playerKidLook(), { t, armAngle: G.clamp(angle, -0.3, 0.6), sad: this.phase === "expelled" });
      if (this.phase !== "expelled") drawWaterPistol(ctx, hand.x, hand.y, angle);
      this.gunTip = { x: hand.x + Math.cos(angle) * 22, y: hand.y + Math.sin(angle) * 22 };

      for (const sq of this.squirts) {
        const n = 8;
        for (let i = 0; i < n; i++) {
          const k = Math.max(0, sq.k - i * 0.05);
          const x = sq.from.x + (sq.to.x - sq.from.x) * k;
          const y = sq.from.y + (sq.to.y - sq.from.y) * k - Math.sin(k * Math.PI) * 20;
          ctx.fillStyle = `rgba(110, 190, 255, ${0.9 - i * 0.1})`;
          ctx.beginPath();
          ctx.arc(x, y, 4 - i * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      for (const sp of this.splashes) {
        const k = 1 - sp.life / 350;
        ctx.strokeStyle = `rgba(110, 190, 255, ${1 - k})`;
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const r = (sp.big ? 16 : 9) * (0.4 + k);
          ctx.beginPath();
          ctx.moveTo(sp.x + Math.cos(a) * r * 0.4, sp.y + Math.sin(a) * r * 0.4);
          ctx.lineTo(sp.x + Math.cos(a) * r, sp.y + Math.sin(a) * r);
          ctx.stroke();
        }
      }

      if (this.phase === "aim") {
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.aim.x, this.aim.y, 10, 0, Math.PI * 2);
        ctx.moveTo(this.aim.x - 15, this.aim.y);
        ctx.lineTo(this.aim.x + 15, this.aim.y);
        ctx.moveTo(this.aim.x, this.aim.y - 15);
        ctx.lineTo(this.aim.x, this.aim.y + 15);
        ctx.stroke();

        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(16, 16, 124, 14);
        ctx.fillStyle = "#6ec0ff";
        ctx.fillRect(16, 16, 124 * (this.water / TANK), 14);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 11px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("WATER", 20, 27);
      }

      const line = this.phase === "argue" ? this.script.current() : null;
      if (line) {
        const x = line.who === "player" ? PLAYER.x + 30 : tc.x;
        const y = line.who === "player" ? PLAYER.y - 115 : RUN_Y - 140;
        G.drawBubble(ctx, x, y, line.text);
      }
      if (this.phase === "caught") G.drawBubble(ctx, tc.x, RUN_Y - 140, "NAAR DE DIRECTEUR!", "#ffdede");
      if (this.phase === "expelled") G.drawBanner(ctx, "Je wordt van school gestuurd...", "#ff9f6b", 70);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      if (this.phase === "aim") return `Raak: ${this.hits} / ${HITS_NEEDED} · Water: ${this.water}`;
      return "";
    },
  };
})();
