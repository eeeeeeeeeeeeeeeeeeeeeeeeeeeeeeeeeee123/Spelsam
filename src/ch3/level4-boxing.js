(() => {
  const { W, H } = G;
  const FLOOR_Y = 330;
  const MATCH_MS = 60000;
  const PLAYER_X0 = 180;
  const ENEMY_X0 = 360;
  const MOVE_SPEED = 120;
  const REACH = 115;
  const JAB_DMG = 5;
  const UPPER_DMG = 14;
  const ENEMY_DMG = 11;
  const JAB_MS = 220;
  const UPPER_MS = 420;
  const UPPER_COST = 30;
  const BLOCK_DMG = 2;
  const ENEMY_WINDUP = 620;
  const ENEMY_RECOVER = 700;
  const ENEMY_APPROACH = 90;
  const STAM_MAX = 100;
  const STAM_REGEN = 22;
  const KO_MS = 2600;
  const ENEMY_LOOK = { ...G.SKINS.zwart, hair: "kort", hairColor: "#1a1212", eyes: G.EYES.bruin, gender: "jongen", shirt: "#c23030", pants: "#2a2a3a" };

  function drawRing(ctx) {
    ctx.fillStyle = "#2a2030";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#c8b89a";
    ctx.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
    ctx.strokeStyle = "#d04040";
    ctx.lineWidth = 4;
    for (let i = 0; i < 3; i++) {
      const y = 110 + i * 28;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.fillStyle = "#555";
    ctx.fillRect(20, 100, 12, FLOOR_Y - 100);
    ctx.fillRect(W - 32, 100, 12, FLOOR_Y - 100);
  }

  function drawBoxer(ctx, x, look, facing, t, o) {
    const duck = o.block ? 14 : 0;
    const hand = G.drawKid(ctx, x, FLOOR_Y + 40 - duck, 1.25, look, {
      adult: true,
      facing,
      t,
      armAngle: o.armAngle,
      flash: o.flash,
      dizzy: o.ko,
      pose: o.ko ? "down" : "stand",
    });
    // boxing gloves
    if (!o.ko) {
      ctx.fillStyle = "#d02020";
      ctx.beginPath();
      ctx.arc(hand.x, hand.y, 8, 0, Math.PI * 2);
      ctx.fill();
      const gx = x + facing * 16;
      ctx.beginPath();
      ctx.arc(gx, FLOOR_Y - 12 - duck, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    return hand;
  }

  G.c3level4 = {
    title: "Level 4 — Boksclub (14 jaar)",
    intro:
      "Je wordt lid van de boksclub en stapt de ring in.<br>" +
      "<strong>← →</strong> bewegen, <strong>↑</strong> = jab, <strong>SPATIE</strong> = uppercut (kost kracht), <strong>↓</strong> = blokken.<br>" +
      "Licht zijn handschoen <strong>geel</strong> op? Blok of ga weg. Sla hem knock-out!",

    drawBackground(ctx, t) {
      drawRing(ctx);
      drawBoxer(ctx, PLAYER_X0, G.playerKidLook(), 1, t, { armAngle: -0.4 });
      drawBoxer(ctx, ENEMY_X0, ENEMY_LOOK, -1, t, { armAngle: -0.4 });
    },

    start(api) {
      this.api = api;
      this.px = PLAYER_X0;
      this.ex = ENEMY_X0;
      this.php = 100;
      this.ehp = 100;
      this.stam = STAM_MAX;
      this.pAttack = 0;
      this.pAttackType = null;
      this.block = false;
      this.enemy = { state: "idle", timer: 900, flash: 0 };
      this.pflash = 0;
      this.time = MATCH_MS;
      this.popups = [];
      this.ko = 0;
      this.koWho = null;
      this.over = false;
    },

    popup(text, x, color) {
      this.popups.push({ text, x, y: 150, color, life: 700 });
    },

    reach() {
      return Math.abs(this.px - this.ex) < REACH;
    },

    punch(type) {
      if (this.over || this.ko || this.pAttack > 0) return;
      if (type === "upper") {
        if (this.stam < UPPER_COST) return;
        this.stam -= UPPER_COST;
        this.pAttack = UPPER_MS;
      } else {
        this.pAttack = JAB_MS;
      }
      this.pAttackType = type;
      this.pLanded = false;
    },

    onAction() {
      this.punch("upper");
    },

    onDirection(dx, dy, repeat) {
      if (repeat || this.over) return;
      if (dy < 0) this.punch("jab");
    },

    update(dt) {
      if (this.over) return;
      const s = dt / 1000;
      this.popups = G.updatePopups(this.popups, dt);
      this.pflash = Math.max(0, this.pflash - dt);
      this.enemy.flash = Math.max(0, this.enemy.flash - dt);
      this.stam = Math.min(STAM_MAX, this.stam + STAM_REGEN * s);
      this.block = !!G.held.down && this.pAttack <= 0;

      if (this.ko) {
        this.ko -= dt;
        if (this.ko <= 0) {
          this.over = true;
          if (this.koWho === "enemy") this.api.complete();
          else this.api.fail("Knock-out! Je ging tegen de grond.");
        }
        return;
      }

      this.time -= dt;
      if (this.time <= 0) {
        this.over = true;
        if (this.php >= this.ehp) this.api.complete();
        else this.api.fail("De bel ging. Je tegenstander had meer punten.");
        return;
      }

      // player movement
      if (this.pAttack <= 0 && !this.block) {
        const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
        this.px = G.clamp(this.px + mx * MOVE_SPEED * s, 70, W - 120);
      }

      // player attack resolve (hit at mid-animation)
      if (this.pAttack > 0) {
        const dur = this.pAttackType === "upper" ? UPPER_MS : JAB_MS;
        if (!this.pLanded && this.pAttack < dur * 0.6) {
          this.pLanded = true;
          if (this.reach()) {
            const dmg = this.pAttackType === "upper" ? UPPER_DMG : JAB_DMG;
            this.ehp = Math.max(0, this.ehp - dmg);
            this.enemy.flash = 250;
            this.ex += (this.ex - this.px > 0 ? 1 : -1) * (this.pAttackType === "upper" ? 24 : 10);
            this.ex = G.clamp(this.ex, 70, W - 70);
            this.popup(`-${dmg}`, this.ex, "#ffe066");
            if (this.ehp <= 0) {
              this.ko = KO_MS;
              this.koWho = "enemy";
            }
          }
        }
        this.pAttack -= dt;
      }

      // enemy AI
      const e = this.enemy;
      e.timer -= dt;
      if (e.state === "idle") {
        if (!this.reach()) {
          this.ex += (this.px > this.ex ? 1 : -1) * ENEMY_APPROACH * s;
        } else if (e.timer <= 0) {
          e.state = "windup";
          e.timer = ENEMY_WINDUP;
        }
      } else if (e.state === "windup" && e.timer <= 0) {
        e.state = "punch";
        e.timer = ENEMY_RECOVER;
        if (this.reach()) {
          if (this.block) {
            this.php = Math.max(0, this.php - BLOCK_DMG);
            this.popup("blok", this.px, "#9fd3ff");
          } else {
            this.php = Math.max(0, this.php - ENEMY_DMG);
            this.pflash = 300;
            this.popup(`-${ENEMY_DMG}`, this.px, "#ff6b6b");
            if (this.php <= 0) {
              this.ko = KO_MS;
              this.koWho = "player";
            }
          }
        }
      } else if (e.state === "punch" && e.timer <= 0) {
        e.state = "idle";
        e.timer = 400 + Math.random() * 700;
      }
    },

    render(ctx, t) {
      drawRing(ctx);
      const e = this.enemy;
      const facing = this.ex >= this.px ? 1 : -1;
      const pArm = this.pAttack > 0 ? (this.pAttackType === "upper" ? -1.3 : -0.2) : this.block ? -1.2 : -0.5;
      const eArm = e.state === "windup" ? -1.5 : e.state === "punch" ? 0.1 : -0.5;

      // draw back-to-front by x
      const drawP = () => drawBoxer(ctx, this.px, G.playerKidLook(), facing, t, { armAngle: pArm, flash: this.pflash > 0, block: this.block, ko: this.ko && this.koWho === "player" });
      const drawE = () => {
        const hand = drawBoxer(ctx, this.ex, ENEMY_LOOK, -facing, t, { armAngle: eArm, flash: e.flash > 0, ko: this.ko && this.koWho === "enemy" });
        if (e.state === "windup") {
          ctx.fillStyle = "rgba(255,224,102,0.7)";
          ctx.beginPath();
          ctx.arc(hand.x, hand.y, 13, 0, Math.PI * 2);
          ctx.fill();
        }
      };
      if (this.px <= this.ex) { drawP(); drawE(); } else { drawE(); drawP(); }

      // HP + stamina
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(16, 20, 180, 14);
      ctx.fillRect(W - 196, 20, 180, 14);
      ctx.fillStyle = "#6ee07a";
      ctx.fillRect(16, 20, 180 * (this.php / 100), 14);
      ctx.fillStyle = "#e05050";
      ctx.fillRect(W - 16 - 180 * (this.ehp / 100), 20, 180 * (this.ehp / 100), 14);
      ctx.fillStyle = "#5a7ac0";
      ctx.fillRect(16, 38, 120 * (this.stam / STAM_MAX), 5);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${Math.ceil(this.time / 1000)}s`, W / 2, 30);

      if (this.ko) G.drawBanner(ctx, this.koWho === "enemy" ? "KNOCK-OUT!" : "Je ligt neer...", this.koWho === "enemy" ? "#6ee07a" : "#ff6b6b", 80);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return `Jij ${this.php} — Tegenstander ${this.ehp}`;
    },
  };
})();
