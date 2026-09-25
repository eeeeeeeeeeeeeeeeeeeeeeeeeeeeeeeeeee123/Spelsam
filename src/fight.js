(() => {
  const { W, H } = G;
  const PLAYER_SPEED = 180;
  const BLOCK_SPEED_FACTOR = 0.4;
  const PLAYER_RANGE = 90;
  const PLAYER_COOLDOWN = 380;
  const SWING_MS = 180;
  const TRIGGER = 80;
  const RANGE = 95;
  const WINDUP_MS = 500;
  const RECOVER_MS = 800;
  const STAGGER_MS = 380;
  const ENEMY_DAMAGE = 25;
  const OPEN_DAMAGE = 20;
  const GUARDED_DAMAGE = 10;
  const CHIP_DAMAGE = 3;
  const PARRY_CHANCE = 0.6;
  const KNOCKBACK = 55;
  const BLOCK_KNOCKBACK = 22;
  const FINISH_MS = 1600;
  const HITSTOP_MS = 90;
  const STAMINA_MAX = 100;
  const BLOCK_COST = 35;
  const BLOCK_DRAIN = 8;
  const STAMINA_REGEN = 25;
  const GUARD_BREAK_MS = 700;
  const HIT_STUN_MS = 300;

  G.FIGHT_ANGLES = { idle: -0.9, raised: -1.8, struck: 0.6, guard: -1.35 };

  function drawBar(ctx, x, y, w, h, frac, color, alignRight) {
    const bx = alignRight ? W - x - w : x;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(bx, y, w, h);
    ctx.fillStyle = color;
    const fill = w * G.clamp(frac, 0, 1);
    ctx.fillRect(alignRight ? bx + w - fill : bx, y, fill, h);
  }

  function drawHpBar(ctx, label, hp, alignRight) {
    const color = hp > 40 ? "#6ee07a" : hp > 20 ? "#ffd873" : "#ff6b6b";
    drawBar(ctx, 16, 36, 190, 12, hp / 100, color, alignRight);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "bold 13px Segoe UI, Roboto, sans-serif";
    ctx.textAlign = alignRight ? "right" : "left";
    ctx.fillText(label, alignRight ? W - 16 : 16, 28);
  }

  function drawBurst(ctx, x, y, k, big) {
    const r = (big ? 30 : 18) * (0.6 + k * 0.6);
    ctx.globalAlpha = 1 - k;
    ctx.fillStyle = "#fff6c0";
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const rr = i % 2 === 0 ? r : r * 0.45;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x, y, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawDust(ctx, x, y, k) {
    ctx.fillStyle = `rgba(210, 200, 190, ${0.6 * (1 - k)})`;
    for (let i = 0; i < 5; i++) {
      const a = i * 1.26;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * 20 * k, y + Math.sin(a) * 8 * k, 6 + 10 * k, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Telegraphed melee duel: the enemy approaches, winds up (glows) and
  // strikes; the player dodges or blocks (B) and punishes the recovery.
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
        this.player = { x: 150, y, hp: 100, swing: 0, cooldown: 0, flash: 0, stamina: STAMINA_MAX, stun: 0 };
        this.enemy = { x: W - 150, y, hp: 100, state: "approach", timer: 0, flash: 0 };
        this.popups = [];
        this.effects = [];
        this.finishing = 0;
        this.hitStop = 0;
        this.shake = 0;
        this.shakeMag = 0;
        this.script = G.makeScript(cfg.script || []);
      },

      popup(text, x, y, color) {
        this.popups.push({ text, x, y, color, life: 800 });
      },

      impact(x, y, big) {
        this.effects.push({ type: "burst", x, y, life: 260, max: 260, big });
        this.effects.push({ type: "dust", x, y: y + 30, life: 450, max: 450 });
      },

      jolt(ms, mag, stop) {
        this.shake = Math.max(this.shake, ms);
        this.shakeMag = Math.max(this.shakeMag, mag);
        this.hitStop = Math.max(this.hitStop, stop);
      },

      blocking() {
        const p = this.player;
        return !!G.held.block && p.stun <= 0 && p.stamina > 0 && this.finishing <= 0;
      },

      distance() {
        return Math.hypot(this.player.x - this.enemy.x, this.player.y - this.enemy.y);
      },

      onAction() {
        const p = this.player;
        if (!this.script.done() || this.finishing > 0 || p.cooldown > 0 || p.stun > 0 || this.blocking()) return;
        p.swing = SWING_MS;
        p.cooldown = PLAYER_COOLDOWN;
        if (this.distance() > PLAYER_RANGE) return;

        const e = this.enemy;
        const mid = { x: (p.x + e.x) / 2, y: (p.y + e.y) / 2 - 50 };
        const open = e.state === "recover" || e.state === "stagger";
        if (!open && Math.random() < PARRY_CHANCE) {
          this.popup("Geblokt!", e.x, e.y - 90, "#9fd3ff");
          this.impact(mid.x, mid.y, false);
          this.jolt(120, 3, 0);
          return;
        }
        const dmg = open ? OPEN_DAMAGE : GUARDED_DAMAGE;
        e.hp -= dmg;
        e.flash = 300;
        this.popup(`-${dmg}`, e.x, e.y - 90, "#ffe066");
        this.impact(mid.x, mid.y, open);
        this.jolt(open ? 260 : 160, open ? 8 : 4, open ? HITSTOP_MS : HITSTOP_MS / 2);
        push(e, p, KNOCKBACK);
        if (e.hp <= 0) {
          this.finishing = FINISH_MS;
          this.jolt(400, 12, 160);
        } else {
          e.state = "stagger";
          e.timer = STAGGER_MS;
        }
      },

      enemyStrike(dist) {
        const p = this.player;
        const e = this.enemy;
        if (dist >= RANGE) return;
        const mid = { x: (p.x + e.x) / 2, y: (p.y + e.y) / 2 - 50 };
        if (this.blocking()) {
          p.stamina -= BLOCK_COST;
          p.hp -= CHIP_DAMAGE;
          this.impact(mid.x, mid.y, false);
          this.jolt(140, 4, 40);
          push(p, e, BLOCK_KNOCKBACK);
          if (p.stamina <= 0) {
            p.stamina = 0;
            p.stun = GUARD_BREAK_MS;
            this.popup("Dekking kapot!", p.x, p.y - 90, "#ff9f6b");
          } else {
            this.popup("Geblokt!", p.x, p.y - 90, "#9fd3ff");
          }
        } else {
          p.hp -= ENEMY_DAMAGE;
          p.flash = 400;
          p.stun = HIT_STUN_MS;
          this.popup(`-${ENEMY_DAMAGE}`, p.x, p.y - 90, "#ff6b6b");
          this.impact(mid.x, mid.y, true);
          this.jolt(320, 11, HITSTOP_MS + 30);
          push(p, e, KNOCKBACK);
        }
        if (p.hp <= 0) this.api.fail(cfg.loseReason);
      },

      update(dt) {
        const s = dt / 1000;
        const p = this.player;
        const e = this.enemy;

        if (!this.script.done()) {
          this.script.update(dt);
          return;
        }

        this.shake = Math.max(0, this.shake - dt);
        if (this.shake <= 0) this.shakeMag = 0;
        for (const fx of this.effects) fx.life -= dt;
        this.effects = this.effects.filter((fx) => fx.life > 0);
        this.popups = G.updatePopups(this.popups, dt);
        if (this.hitStop > 0) {
          this.hitStop -= dt;
          return;
        }

        p.swing = Math.max(0, p.swing - dt);
        p.cooldown = Math.max(0, p.cooldown - dt);
        p.flash = Math.max(0, p.flash - dt);
        p.stun = Math.max(0, p.stun - dt);
        e.flash = Math.max(0, e.flash - dt);
        const blocking = this.blocking();
        p.stamina = G.clamp(p.stamina + (blocking ? -BLOCK_DRAIN : STAMINA_REGEN) * s, 0, STAMINA_MAX);

        if (this.finishing > 0) {
          this.finishing -= dt;
          if (this.finishing <= 0) this.api.complete();
          return;
        }

        const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
        const my = (G.held.down ? 1 : 0) - (G.held.up ? 1 : 0);
        if ((mx || my) && p.stun <= 0) {
          const len = Math.hypot(mx, my);
          const speed = PLAYER_SPEED * (blocking ? BLOCK_SPEED_FACTOR : 1);
          p.x += (mx / len) * speed * s;
          p.y += (my / len) * speed * s;
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
              this.enemyStrike(dist);
            }
            break;
          case "swing":
            if (e.timer <= 0) {
              e.state = "recover";
              e.timer = RECOVER_MS;
            }
            break;
          case "stagger":
            if (e.timer <= 0) {
              e.state = "recover";
              e.timer = RECOVER_MS / 2;
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
        ctx.save();
        if (this.shake > 0) {
          const m = this.shakeMag * (this.shake / 320);
          ctx.translate((Math.random() - 0.5) * 2 * m, (Math.random() - 0.5) * 2 * m);
        }
        cfg.drawBackground(ctx, t);
        const p = this.player;
        const e = this.enemy;
        const pf = e.x >= p.x ? 1 : -1;
        const A = G.FIGHT_ANGLES;
        const blocking = this.blocking();

        let pa = A.idle;
        if (blocking) pa = A.guard;
        else if (p.swing > 0) pa = A.raised + (A.struck - A.raised) * (1 - p.swing / SWING_MS);
        let ea = A.idle;
        if (e.state === "windup") ea = A.raised;
        else if (e.state === "swing") ea = A.struck;
        else if (e.state === "stagger") ea = A.raised * 0.3;

        const beaten = this.finishing > 0;
        const lean = (pos, k) => ({ ...pos, x: pos.x + k });
        const eShift = e.state === "stagger" ? -pf * 6 : 0;
        cfg.drawActor(ctx, "enemy", lean(e, eShift), -pf, { angle: ea, glow: e.state === "windup" && !beaten, flash: e.flash > 0, dizzy: beaten, angry: !beaten }, t);
        cfg.drawActor(ctx, "player", p, pf, { angle: pa, glow: false, flash: p.flash > 0, dizzy: p.stun > HIT_STUN_MS }, t);

        for (const fx of this.effects) {
          const k = 1 - fx.life / fx.max;
          if (fx.type === "burst") drawBurst(ctx, fx.x, fx.y, k, fx.big);
          else drawDust(ctx, fx.x, fx.y, k);
        }
        ctx.restore();

        const line = this.script.current();
        if (line) {
          const who = line.who === "player" ? p : e;
          G.drawBubble(ctx, who.x, who.y - 110, line.text);
          return;
        }

        drawHpBar(ctx, cfg.labels.player, p.hp, false);
        drawHpBar(ctx, cfg.labels.enemy, e.hp, true);
        drawBar(ctx, 16, 52, 120, 5, p.stamina / STAMINA_MAX, blocking ? "#9fd3ff" : "#5a7ac0", false);
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.font = "11px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("B = blokken", 142, 58);

        G.drawPopups(ctx, this.popups);

        if (beaten) G.drawBanner(ctx, cfg.winText, "#ffe066", H - 40);
      },

      hud() {
        if (!this.script.done()) return "...";
        return `${cfg.labels.player} ${Math.max(0, this.player.hp)} — ${cfg.labels.enemy} ${Math.max(0, this.enemy.hp)}`;
      },
    };
  };
})();
