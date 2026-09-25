(() => {
  const { W, H } = G;
  const PLAYER_SPEED = 180;
  const PLAYER_RANGE = 90;
  const PLAYER_COOLDOWN = 380;
  const SWING_MS = 180;
  const TRIGGER = 80;
  const RANGE = 95;
  const WINDUP_MS = 500;
  const RECOVER_MS = 800;
  const ENEMY_DAMAGE = 25;
  const OPEN_DAMAGE = 20;
  const GUARDED_DAMAGE = 10;
  const PARRY_CHANCE = 0.6;
  const KNOCKBACK = 45;
  const FINISH_MS = 1600;

  G.FIGHT_ANGLES = { idle: -0.9, raised: -1.8, struck: 0.6 };

  function drawHpBar(ctx, label, hp, alignRight) {
    const w = 190;
    const x = 16;
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

  // Telegraphed melee duel: the enemy approaches, winds up (glows) and
  // strikes; the player dodges and punishes during the enemy's recovery.
  // cfg: title, intro, bounds, labels, enemySpeed, script, winText,
  // loseReason, drawBackground(ctx,t), drawIdle(ctx,t),
  // drawActor(ctx, who, pos, facing, stance, t).
  G.makeFightLevel = (cfg) => {
    const bounds = cfg.bounds;
    const clampPos = (p) => {
      p.x = G.clamp(p.x, bounds.minX, bounds.maxX);
      p.y = G.clamp(p.y, bounds.minY, bounds.maxY);
    };
    const push = (target, from, amount) => {
      const d = Math.hypot(target.x - from.x, target.y - from.y) || 1;
      target.x += ((target.x - from.x) / d) * amount;
      target.y += ((target.y - from.y) / d) * amount;
      clampPos(target);
    };

    return {
      title: cfg.title,
      intro: cfg.intro,

      drawBackground(ctx, t) {
        cfg.drawBackground(ctx, t);
        cfg.drawIdle(ctx, t);
      },

      start(api) {
        this.api = api;
        const y = (bounds.minY + bounds.maxY) / 2;
        this.player = { x: 150, y, hp: 100, swing: 0, cooldown: 0, flash: 0 };
        this.enemy = { x: W - 150, y, hp: 100, state: "approach", timer: 0, flash: 0 };
        this.popups = [];
        this.finishing = 0;
        this.script = G.makeScript(cfg.script || []);
      },

      popup(text, x, y, color) {
        this.popups.push({ text, x, y, color, life: 800 });
      },

      distance() {
        return Math.hypot(this.player.x - this.enemy.x, this.player.y - this.enemy.y);
      },

      onAction() {
        const p = this.player;
        if (!this.script.done() || this.finishing > 0 || p.cooldown > 0) return;
        p.swing = SWING_MS;
        p.cooldown = PLAYER_COOLDOWN;
        if (this.distance() > PLAYER_RANGE) return;

        const e = this.enemy;
        const open = e.state === "recover";
        if (!open && Math.random() < PARRY_CHANCE) {
          this.popup("Geblokt!", e.x, e.y - 80, "#9fd3ff");
          return;
        }
        const dmg = open ? OPEN_DAMAGE : GUARDED_DAMAGE;
        e.hp -= dmg;
        e.flash = 300;
        this.popup(`-${dmg}`, e.x, e.y - 80, "#ffe066");
        push(e, p, KNOCKBACK);
        if (e.hp <= 0) {
          this.finishing = FINISH_MS;
        } else if (e.state === "windup") {
          e.state = "recover";
          e.timer = RECOVER_MS;
        }
      },

      update(dt) {
        const s = dt / 1000;
        const p = this.player;
        const e = this.enemy;

        if (!this.script.done()) {
          this.script.update(dt);
          return;
        }

        for (const pop of this.popups) {
          pop.life -= dt;
          pop.y -= 30 * s;
        }
        this.popups = this.popups.filter((pop) => pop.life > 0);
        p.swing = Math.max(0, p.swing - dt);
        p.cooldown = Math.max(0, p.cooldown - dt);
        p.flash = Math.max(0, p.flash - dt);
        e.flash = Math.max(0, e.flash - dt);

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
        e.timer -= dt;
        switch (e.state) {
          case "approach":
            if (dist < TRIGGER) {
              e.state = "windup";
              e.timer = WINDUP_MS;
              break;
            }
            e.x += ((p.x - e.x) / dist) * cfg.enemySpeed * s;
            e.y += ((p.y - e.y) / dist) * cfg.enemySpeed * s;
            clampPos(e);
            break;
          case "windup":
            if (e.timer <= 0) {
              e.state = "swing";
              e.timer = SWING_MS;
              if (dist < RANGE) {
                p.hp -= ENEMY_DAMAGE;
                p.flash = 400;
                this.popup(`-${ENEMY_DAMAGE}`, p.x, p.y - 80, "#ff6b6b");
                push(p, e, KNOCKBACK);
                if (p.hp <= 0) this.api.fail(cfg.loseReason);
              }
            }
            break;
          case "swing":
            if (e.timer <= 0) {
              e.state = "recover";
              e.timer = RECOVER_MS;
            }
            break;
          case "recover":
            e.x -= ((p.x - e.x) / (dist || 1)) * 50 * s;
            e.y -= ((p.y - e.y) / (dist || 1)) * 50 * s;
            clampPos(e);
            if (e.timer <= 0) e.state = "approach";
            break;
        }
      },

      render(ctx, t) {
        cfg.drawBackground(ctx, t);
        const p = this.player;
        const e = this.enemy;
        const pf = e.x >= p.x ? 1 : -1;
        const A = G.FIGHT_ANGLES;

        let pa = A.idle;
        if (p.swing > 0) pa = A.raised + (A.struck - A.raised) * (1 - p.swing / SWING_MS);
        let ea = A.idle;
        if (e.state === "windup") ea = A.raised;
        else if (e.state === "swing") ea = A.struck;

        const beaten = this.finishing > 0;
        cfg.drawActor(ctx, "enemy", e, -pf, { angle: ea, glow: e.state === "windup" && !beaten, flash: e.flash > 0, dizzy: beaten, angry: !beaten }, t);
        cfg.drawActor(ctx, "player", p, pf, { angle: pa, glow: false, flash: p.flash > 0 }, t);

        const line = this.script.current();
        if (line) {
          const who = line.who === "player" ? p : e;
          G.drawBubble(ctx, who.x, who.y - 110, line.text);
          return;
        }

        drawHpBar(ctx, cfg.labels.player, p.hp, false);
        drawHpBar(ctx, cfg.labels.enemy, e.hp, true);

        ctx.textAlign = "center";
        ctx.font = "bold 16px Segoe UI, Roboto, sans-serif";
        for (const pop of this.popups) {
          ctx.globalAlpha = Math.min(1, pop.life / 400);
          ctx.fillStyle = pop.color;
          ctx.fillText(pop.text, pop.x, pop.y);
        }
        ctx.globalAlpha = 1;

        if (beaten) {
          ctx.fillStyle = "#ffe066";
          ctx.font = "bold 26px Segoe UI, Roboto, sans-serif";
          ctx.fillText(cfg.winText, W / 2, H - 30);
        }
      },

      hud() {
        if (!this.script.done()) return "...";
        return `${cfg.labels.player} ${Math.max(0, this.player.hp)} — ${cfg.labels.enemy} ${Math.max(0, this.enemy.hp)}`;
      },
    };
  };
})();
