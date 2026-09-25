(() => {
  const { W, H } = G;
  const SCALE = 1.1;
  const BOUNDS = { minX: 50, maxX: W - 50, minY: 110, maxY: H - 60 };
  const PLAYER_SPEED = 180;
  const TWIN_SPEED = 105;
  const PLAYER_RANGE = 90;
  const PLAYER_COOLDOWN = 380;
  const SWING_MS = 180;
  const TWIN_TRIGGER = 80;
  const TWIN_RANGE = 95;
  const WINDUP_MS = 500;
  const RECOVER_MS = 800;
  const TWIN_DAMAGE = 25;
  const OPEN_DAMAGE = 20;
  const GUARDED_DAMAGE = 10;
  const PARRY_CHANCE = 0.6;
  const KNOCKBACK = 45;
  const FINISH_MS = 1600;

  const IDLE_ANGLE = -0.9;
  const RAISED_ANGLE = -1.8;
  const STRUCK_ANGLE = 0.6;

  const worldAngle = (a, facing) => (facing === 1 ? a : Math.PI - a);

  function clampPos(p) {
    p.x = G.clamp(p.x, BOUNDS.minX, BOUNDS.maxX);
    p.y = G.clamp(p.y, BOUNDS.minY, BOUNDS.maxY);
  }

  function push(target, from, amount) {
    const d = Math.hypot(target.x - from.x, target.y - from.y) || 1;
    target.x += ((target.x - from.x) / d) * amount;
    target.y += ((target.y - from.y) / d) * amount;
    clampPos(target);
  }

  function drawHpBar(ctx, x, label, hp, alignRight) {
    const w = 190;
    const bx = alignRight ? W - x - w : x;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(bx, 36, w, 12);
    ctx.fillStyle = hp > 40 ? "#6ee07a" : hp > 20 ? "#ffd873" : "#ff6b6b";
    const fill = (w * Math.max(0, hp)) / 100;
    ctx.fillRect(alignRight ? bx + w - fill : bx, 36, fill, 12);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "bold 13px Segoe UI, Roboto, sans-serif";
    ctx.textAlign = alignRight ? "right" : "left";
    ctx.fillText(label, alignRight ? W - x : x, 28);
  }

  G.level9 = {
    title: "Level 9 — Het gevecht",
    intro:
      "Er kan er maar één als eerste geboren worden!<br>" +
      "Zwem rond met de <strong>pijltjes</strong> en sla met <strong>SPATIE</strong>. " +
      "Licht het zwaard van je tweeling <strong>geel</strong> op? Dan gaat die uithalen: <strong>zwem weg!</strong><br>" +
      "Sla vooral terug net na een uithaal: dan staat je tweeling open. Anders blokt die vaak.",

    drawBackground(ctx, t) {
      G.drawWomb(ctx, t);
      G.drawFetus(ctx, 150, 280, SCALE, 1, G.PLAYER_LOOK, t);
      G.drawFetus(ctx, 390, 280, SCALE, -1, G.TWIN_LOOK, t);
    },

    start(api) {
      this.api = api;
      this.player = { x: 150, y: 280, hp: 100, swing: 0, cooldown: 0, flash: 0 };
      this.twin = { x: 390, y: 280, hp: 100, state: "approach", timer: 0, flash: 0 };
      this.popups = [];
      this.finishing = 0;
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 800 });
    },

    distance() {
      return Math.hypot(this.player.x - this.twin.x, this.player.y - this.twin.y);
    },

    onAction() {
      const p = this.player;
      if (this.finishing > 0 || p.cooldown > 0) return;
      p.swing = SWING_MS;
      p.cooldown = PLAYER_COOLDOWN;
      if (this.distance() > PLAYER_RANGE) return;

      const tw = this.twin;
      const open = tw.state === "recover";
      if (!open && Math.random() < PARRY_CHANCE) {
        this.popup("Geblokt!", tw.x, tw.y - 60, "#9fd3ff");
        return;
      }
      const dmg = open ? OPEN_DAMAGE : GUARDED_DAMAGE;
      tw.hp -= dmg;
      tw.flash = 300;
      this.popup(`-${dmg}`, tw.x, tw.y - 60, "#ffe066");
      push(tw, p, KNOCKBACK);
      if (tw.hp <= 0) {
        this.finishing = FINISH_MS;
      } else if (tw.state === "windup") {
        tw.state = "recover";
        tw.timer = RECOVER_MS;
      }
    },

    update(dt) {
      const s = dt / 1000;
      const p = this.player;
      const tw = this.twin;

      for (const pop of this.popups) {
        pop.life -= dt;
        pop.y -= 30 * s;
      }
      this.popups = this.popups.filter((pop) => pop.life > 0);
      p.swing = Math.max(0, p.swing - dt);
      p.cooldown = Math.max(0, p.cooldown - dt);
      p.flash = Math.max(0, p.flash - dt);
      tw.flash = Math.max(0, tw.flash - dt);

      if (this.finishing > 0) {
        this.finishing -= dt;
        if (this.finishing <= 0) this.api.complete();
        return;
      }

      const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
      const my = (G.held.down ? 1 : 0) - (G.held.up ? 1 : 0);
      if (mx || my) {
        const len = Math.hypot(mx, my);
        p.x += (mx / len) * PLAYER_SPEED * s;
        p.y += (my / len) * PLAYER_SPEED * s;
        clampPos(p);
      }

      const dist = this.distance();
      tw.timer -= dt;
      switch (tw.state) {
        case "approach": {
          if (dist < TWIN_TRIGGER) {
            tw.state = "windup";
            tw.timer = WINDUP_MS;
            break;
          }
          tw.x += ((p.x - tw.x) / dist) * TWIN_SPEED * s;
          tw.y += ((p.y - tw.y) / dist) * TWIN_SPEED * s;
          clampPos(tw);
          break;
        }
        case "windup":
          if (tw.timer <= 0) {
            tw.state = "swing";
            tw.timer = SWING_MS;
            if (dist < TWIN_RANGE) {
              p.hp -= TWIN_DAMAGE;
              p.flash = 400;
              this.popup(`-${TWIN_DAMAGE}`, p.x, p.y - 60, "#ff6b6b");
              push(p, tw, KNOCKBACK);
              if (p.hp <= 0) this.api.fail("Je tweeling was sterker. Je bent uitgeschakeld!");
            }
          }
          break;
        case "swing":
          if (tw.timer <= 0) {
            tw.state = "recover";
            tw.timer = RECOVER_MS;
          }
          break;
        case "recover":
          tw.x -= ((p.x - tw.x) / (dist || 1)) * 50 * s;
          tw.y -= ((p.y - tw.y) / (dist || 1)) * 50 * s;
          clampPos(tw);
          if (tw.timer <= 0) tw.state = "approach";
          break;
      }
    },

    render(ctx, t) {
      G.drawWomb(ctx, t);
      const p = this.player;
      const tw = this.twin;
      const pf = tw.x >= p.x ? 1 : -1;
      const tf = -pf;
      const bob = (k) => Math.sin(t * 2 + k) * 4;

      let pa = IDLE_ANGLE;
      if (p.swing > 0) pa = RAISED_ANGLE + (STRUCK_ANGLE - RAISED_ANGLE) * (1 - p.swing / SWING_MS);
      let ta = IDLE_ANGLE;
      if (tw.state === "windup") ta = RAISED_ANGLE;
      else if (tw.state === "swing") ta = STRUCK_ANGLE;

      const twinDizzy = this.finishing > 0;
      const actors = [
        { pos: tw, facing: tf, look: G.TWIN_LOOK, angle: ta, glow: tw.state === "windup" && !twinDizzy, opts: { flash: tw.flash > 0, dizzy: twinDizzy, angry: !twinDizzy }, k: 1 },
        { pos: p, facing: pf, look: G.PLAYER_LOOK, angle: pa, glow: false, opts: { flash: p.flash > 0 }, k: 0 },
      ];
      for (const a of actors) {
        const y = a.pos.y + bob(a.k);
        G.drawFetus(ctx, a.pos.x, y, SCALE, a.facing, a.look, t, a.opts);
        if (a.opts.dizzy) continue;
        const angle = worldAngle(a.angle, a.facing);
        const hand = G.drawArm(ctx, a.pos.x, y, SCALE, a.facing, angle, a.look);
        G.drawCordSword(ctx, hand, angle, 62, 1, a.glow);
      }

      drawHpBar(ctx, 16, "Jij", p.hp, false);
      drawHpBar(ctx, 16, "Tweeling", tw.hp, true);

      ctx.textAlign = "center";
      ctx.font = "bold 16px Segoe UI, Roboto, sans-serif";
      for (const pop of this.popups) {
        ctx.globalAlpha = Math.min(1, pop.life / 400);
        ctx.fillStyle = pop.color;
        ctx.fillText(pop.text, pop.x, pop.y);
      }
      ctx.globalAlpha = 1;

      if (twinDizzy) {
        ctx.fillStyle = "#ffe066";
        ctx.font = "bold 28px Segoe UI, Roboto, sans-serif";
        ctx.fillText("Gewonnen! Jij wordt eerst geboren!", W / 2, H - 30);
      }
    },

    hud() {
      return `Jij ${Math.max(0, this.player.hp)} — Tweeling ${Math.max(0, this.twin.hp)}`;
    },
  };
})();
