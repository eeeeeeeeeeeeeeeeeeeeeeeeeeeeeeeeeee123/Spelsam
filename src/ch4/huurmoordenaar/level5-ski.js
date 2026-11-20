(() => {
  const { W, H } = G;
  const PY = 340;
  const STEER = 190;
  const SCROLL = 210;
  const HP = 4;
  const INVULN_MS = 1000;
  const CRASH_MS = 700;
  const JUMP_MS = 650;
  const FIRE_MS = 280;
  const BULLET_SPEED = 620;
  const TARGET_HP = 18;
  const RUN_MS = 60000;
  const DYNAMITE_WARN = 1100;
  const DYNAMITE_R = 34;
  const TARGET_LOOK = { ...G.SKINS.wit, hair: "kort", hairColor: "#d8a040", eyes: G.EYES.blauw, gender: "jongen", shirt: "#e04020", pants: "#2a2a3a" };

  G.CAREER_LEVELS.huurmoordenaar[5] = {
    title: "Level 5 — Skiachtervolging in de Alpen (25 jaar)",
    intro:
      "Je doelwit, een wapenhandelaar, ziet je aankomen en vlucht op <strong>ski's</strong> de berg af!<br>" +
      "Stuur met <strong>← →</strong> tussen de bomen door. <strong>Schansen</strong> laten je springen (over alles heen). Mik met de <strong>muis</strong> en schiet met <strong>klik</strong> / <strong>SPATIE</strong>.<br>" +
      "Hij gooit <strong>dynamiet</strong> achter zich (rode cirkel = wegwezen). Pak hem voor hij beneden in de <strong>gondel</strong> stapt (60 seconden)!",

    drawBackground(ctx, t) {
      this.scroll = 0;
      this.drawSlope(ctx, 0);
    },

    drawSlope(ctx, scroll) {
      ctx.fillStyle = "#f4f8fc";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(160,190,220,0.35)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 10; i++) {
        const y = ((i * 70 - scroll) % (H + 70) + H + 70) % (H + 70) - 35;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.quadraticCurveTo(W / 2, y + 30, W, y);
        ctx.stroke();
      }
      // piste edges
      ctx.fillStyle = "#d8e4ee";
      ctx.fillRect(0, 0, 30, H);
      ctx.fillRect(W - 30, 0, 30, H);
    },

    start(api) {
      this.api = api;
      this.p = { x: W / 2, hp: HP, invuln: 0, crash: 0, jump: 0 };
      this.aim = { x: W / 2, y: 120 };
      this.target = { x: W / 2, y: 110, hp: TARGET_HP, flash: 0, t: 0, dyn: 3000 };
      this.scroll = 0;
      this.time = RUN_MS;
      this.fire = 0;
      this.bullets = [];
      this.objects = [];
      this.objTimer = 0;
      this.dynamite = [];
      this.popups = [];
      this.flash = 0;
      this.over = false;
      this.won = 0;
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 800 });
    },

    doFire() {
      if (this.over || this.won || this.fire > 0 || this.p.crash > 0) return;
      this.fire = FIRE_MS;
      const p = this.p;
      const d = Math.hypot(this.aim.x - p.x, this.aim.y - (PY - 30)) || 1;
      this.bullets.push({ x: p.x, y: PY - 30, vx: ((this.aim.x - p.x) / d) * BULLET_SPEED, vy: ((this.aim.y - (PY - 30)) / d) * BULLET_SPEED });
    },

    onAction() { this.doFire(); },
    onPointer(x, y) { this.aim = { x, y }; this.doFire(); },
    onPointerMove(x, y) { this.aim = { x, y }; },

    hurt(text) {
      const p = this.p;
      if (p.invuln > 0 || p.jump > 0 || this.over) return;
      p.hp--;
      p.invuln = INVULN_MS;
      p.crash = CRASH_MS;
      this.flash = 300;
      this.popup(text, p.x, PY - 50, "#ff6b6b");
      if (p.hp <= 0) {
        this.over = true;
        this.api.fail("Je bent gecrasht. Het doelwit skiet ervandoor.");
      }
    },

    update(dt, t) {
      if (this.over) return;
      const s = dt / 1000;
      const p = this.p, tg = this.target;
      this.fire = Math.max(0, this.fire - dt);
      this.flash = Math.max(0, this.flash - dt);
      p.invuln = Math.max(0, p.invuln - dt);
      p.crash = Math.max(0, p.crash - dt);
      p.jump = Math.max(0, p.jump - dt);
      tg.flash = Math.max(0, tg.flash - dt);
      this.popups = G.updatePopups(this.popups, dt);
      if (this.won) {
        this.won -= dt;
        if (this.won <= 0) {
          this.over = true;
          this.api.complete();
        }
        return;
      }
      if (G.held.action || G.mouseDown) this.doFire();

      this.time -= dt;
      if (this.time <= 0) {
        this.over = true;
        this.api.fail("Hij stapte beneden in de gondel en is ontsnapt.");
        return;
      }

      const speed = p.crash > 0 ? SCROLL * 0.35 : SCROLL;
      this.scroll += speed * s;
      const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
      if (p.crash <= 0) p.x = G.clamp(p.x + mx * STEER * s, 40, W - 40);

      // trees, rocks and ramps come up the slope toward you
      this.objTimer -= speed * s;
      if (this.objTimer <= 0) {
        this.objTimer = 55 + Math.random() * 45;
        const r = Math.random();
        this.objects.push({ kind: r < 0.12 ? "ramp" : r < 0.3 ? "rock" : "tree", x: 45 + Math.random() * (W - 90), y: H + 30 });
      }
      for (const o of this.objects) {
        o.y -= speed * s;
        if (o.hit || p.jump > 0) continue;
        if (Math.abs(o.x - p.x) < (o.kind === "ramp" ? 22 : 16) && Math.abs(o.y - PY) < 14) {
          o.hit = true;
          if (o.kind === "ramp") {
            p.jump = JUMP_MS;
            this.popup("SPRONG!", p.x, PY - 50, "#6ee07a");
          } else this.hurt(o.kind === "tree" ? "BOOM!" : "ROTS!");
          if (this.over) return;
        }
      }
      this.objects = this.objects.filter((o) => o.y > -40);

      // the target weaves down ahead of you and throws dynamite back
      tg.t += s;
      tg.x = G.clamp(W / 2 + Math.sin(tg.t * 1.1) * 170 + Math.sin(tg.t * 2.9) * 50, 50, W - 50);
      tg.dyn -= dt;
      if (tg.dyn <= 0) {
        tg.dyn = 2600 + Math.random() * 1400;
        this.dynamite.push({ x: G.clamp(p.x + (Math.random() - 0.5) * 80, 50, W - 50), y: PY - 30 + Math.random() * 40, warn: DYNAMITE_WARN, boom: 0 });
      }
      for (const dn of this.dynamite) {
        if (dn.warn > 0) {
          dn.warn -= dt;
          if (dn.warn <= 0) {
            dn.boom = 450;
            if (Math.abs(dn.x - p.x) < DYNAMITE_R && Math.abs(dn.y - PY) < DYNAMITE_R) this.hurt("BOEM!");
          }
        } else {
          dn.boom -= dt;
          if (dn.boom <= 0) dn.done = true;
        }
      }
      this.dynamite = this.dynamite.filter((dn) => !dn.done);
      if (this.over) return;

      for (const b of this.bullets) {
        b.x += b.vx * s;
        b.y += b.vy * s;
        if (b.y < -10 || b.x < -10 || b.x > W + 10 || b.y > H) { b.done = true; continue; }
        if (Math.abs(b.x - tg.x) < 13 && b.y > tg.y - 34 && b.y < tg.y + 4) {
          b.done = true;
          tg.hp--;
          tg.flash = 100;
          if (tg.hp <= 0) {
            this.won = 2600;
            this.popup("Contract voltooid!", tg.x, tg.y - 40, "#6ee07a");
          }
        }
      }
      this.bullets = this.bullets.filter((b) => !b.done);
    },

    render(ctx, t) {
      this.drawSlope(ctx, this.scroll);
      const p = this.p, tg = this.target;
      for (const o of this.objects) {
        if (o.kind === "tree") {
          ctx.fillStyle = "#5a3a1a";
          ctx.fillRect(o.x - 3, o.y - 6, 6, 10);
          ctx.fillStyle = "#2a5a3a";
          ctx.beginPath();
          ctx.moveTo(o.x, o.y - 40);
          ctx.lineTo(o.x - 16, o.y - 4);
          ctx.lineTo(o.x + 16, o.y - 4);
          ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.moveTo(o.x, o.y - 40);
          ctx.lineTo(o.x - 6, o.y - 28);
          ctx.lineTo(o.x + 6, o.y - 28);
          ctx.fill();
        } else if (o.kind === "rock") {
          ctx.fillStyle = "#7a7a80";
          ctx.beginPath();
          ctx.ellipse(o.x, o.y, 14, 9, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = "#c8d8e8";
          ctx.beginPath();
          ctx.moveTo(o.x - 22, o.y + 6);
          ctx.lineTo(o.x + 22, o.y + 6);
          ctx.lineTo(o.x + 16, o.y - 10);
          ctx.lineTo(o.x - 16, o.y - 10);
          ctx.fill();
          ctx.fillStyle = "#ff8a3a";
          ctx.fillRect(o.x - 22, o.y + 4, 44, 3);
        }
      }
      for (const dn of this.dynamite) {
        if (dn.warn > 0) {
          ctx.strokeStyle = `rgba(255,40,40,${0.5 + 0.4 * Math.sin(t * 20)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(dn.x, dn.y, DYNAMITE_R, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = "#c02020";
          ctx.fillRect(dn.x - 2, dn.y - 6, 4, 12);
        } else {
          const k = dn.boom / 450;
          ctx.fillStyle = `rgba(255,${130 + k * 100},40,${k})`;
          ctx.beginPath();
          ctx.arc(dn.x, dn.y, DYNAMITE_R * (1.2 - k * 0.2), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // target skier
      if (tg.hp > 0 || Math.floor(t * 8) % 2) {
        G.drawKid(ctx, tg.x, tg.y, 0.6, TARGET_LOOK, { adult: true, t, facing: Math.cos(tg.t * 0.9) >= 0 ? 1 : -1, flash: tg.flash > 0, pose: tg.hp > 0 ? "stand" : "down", dizzy: tg.hp <= 0 });
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(tg.x - 12, tg.y + 2);
        ctx.lineTo(tg.x + 12, tg.y + 2);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(tg.x - 20, tg.y - 64, 40, 4);
      ctx.fillStyle = "#e05050";
      ctx.fillRect(tg.x - 20, tg.y - 64, 40 * Math.max(0, tg.hp / TARGET_HP), 4);

      // you
      const lift = p.jump > 0 ? Math.sin((1 - p.jump / JUMP_MS) * Math.PI) * 26 : 0;
      if (lift) {
        ctx.fillStyle = "rgba(0,0,0,0.15)";
        ctx.beginPath();
        ctx.ellipse(p.x, PY + 4, 14, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = p.invuln > 0 && Math.floor(t * 12) % 2 ? 0.5 : 1;
      const skiLook = { ...G.hitLook(), shirt: "#2a2a2a" };
      G.drawKid(ctx, p.x, PY - lift, 0.62, skiLook, { adult: true, t, pose: p.crash > 0 ? "down" : "stand", dizzy: p.crash > 0, armAngle: -1 });
      ctx.strokeStyle = "#c02020";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p.x - 13, PY + 2 - lift);
      ctx.lineTo(p.x + 13, PY + 2 - lift);
      ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.fillStyle = "#333";
      for (const b of this.bullets) ctx.fillRect(b.x - 1, b.y - 3, 2, 6);
      ctx.strokeStyle = "rgba(40,40,60,0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.aim.x, this.aim.y, 9, 0, Math.PI * 2);
      ctx.moveTo(this.aim.x - 14, this.aim.y);
      ctx.lineTo(this.aim.x + 14, this.aim.y);
      ctx.stroke();

      if (this.flash > 0) {
        ctx.fillStyle = `rgba(200,40,40,${0.25 * (this.flash / 300)})`;
        ctx.fillRect(0, 0, W, H);
      }
      if (this.won) G.drawBanner(ctx, "Contract voltooid op de piste!", "#2a8a4a", H / 2);
      ctx.fillStyle = "#c02020";
      ctx.font = "18px Segoe UI, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("❤".repeat(Math.max(0, p.hp)), 12, 26);
      ctx.fillStyle = "#333";
      ctx.font = "bold 13px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`Gondel over ${Math.ceil(this.time / 1000)}s`, W - 12, 24);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return `Skiachtervolging · nog ${Math.ceil(this.time / 1000)}s`;
    },
  };
})();
