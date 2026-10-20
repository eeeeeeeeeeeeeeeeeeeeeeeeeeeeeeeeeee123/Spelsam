(() => {
  const { W, H } = G;
  const FLOOR_Y = 330;
  const ROUND_MS = 25000;
  const ROUNDS = 3;
  const BREAK_MS = 2600;
  const BREAK_HEAL = 15;
  const PLAYER_X0 = 180;
  const ENEMY_X0 = 360;
  const MOVE_SPEED = 130;
  const REACH = 115;
  const JAB_DMG = 5;
  const UPPER_DMG = 14;
  const COUNTER_MULT = 1.8;
  const JAB_MS = 220;
  const UPPER_MS = 420;
  const UPPER_COST = 30;
  const STAM_MAX = 100;
  const STAM_REGEN = 22;
  // enemy punches: yellow jab (block it), red haymaker (step back!)
  const ATTACKS = {
    jab: { windup: 600, dmg: 9, blocked: 1, color: "rgba(255,224,102,0.75)" },
    combo: { windup: 330, dmg: 7, blocked: 1, color: "rgba(255,224,102,0.75)" },
    hook: { windup: 950, dmg: 18, blocked: 8, color: "rgba(255,70,70,0.8)" },
  };
  const PERFECT_MS = 240;
  const STAGGER_MS = 1000;
  const RECOVER_MS = 650;
  const APPROACH = 90;
  const COUNT_MS = 3200;
  const GETUP_HP = 45;
  const KO_MS = 2600;
  const ENEMY_LOOK = { ...G.SKINS.zwart, hair: "kort", hairColor: "#1a1212", eyes: G.EYES.bruin, gender: "jongen", shirt: "#c23030", pants: "#2a2a3a" };
  const REF_LOOK = { ...G.SKINS.wit, hair: "kort", hairColor: "#6a6a6a", eyes: G.EYES.blauw, gender: "jongen", shirt: "#f0f0f0", pants: "#222" };
  const COACH_TIPS = [
    "Coach: \"Blok de gele stoten op het laatste moment = COUNTER!\"",
    "Coach: \"Rode handschoen? Stap naar achteren, niet blokken!\"",
    "Coach: \"Spaar je kracht voor de uppercut als hij wankelt!\"",
  ];

  const CROWD = [];
  for (let i = 0; i < 34; i++) {
    CROWD.push({ x: 8 + i * 16 + Math.random() * 6, y: 70 + (i % 3) * 10 + Math.random() * 4, c: G.pick(["#3a3040", "#4a3a50", "#2f2a3a", "#55405a"]), seed: Math.random() * 10 });
  }

  function drawRing(ctx, t, hype) {
    ctx.fillStyle = "#1a1420";
    ctx.fillRect(0, 0, W, H);
    // spotlights
    const g = ctx.createRadialGradient(W / 2, 0, 20, W / 2, 0, 380);
    g.addColorStop(0, "rgba(255,240,200,0.18)");
    g.addColorStop(1, "rgba(255,240,200,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // crowd
    for (const c of CROWD) {
      const jump = Math.max(0, Math.sin((t || 0) * (4 + hype * 6) + c.seed)) * (2 + hype * 6);
      ctx.fillStyle = c.c;
      ctx.beginPath();
      ctx.arc(c.x, c.y - jump, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(c.x - 8, c.y + 5 - jump, 16, 20);
    }
    // camera flashes
    if (Math.random() < 0.04 + hype * 0.15) {
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.beginPath();
      ctx.arc(Math.random() * W, 70 + Math.random() * 30, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // canvas floor + ropes
    ctx.fillStyle = "#c8b89a";
    ctx.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(0, FLOOR_Y, W, 6);
    ctx.fillStyle = "#2a50a0";
    ctx.font = "bold 22px Segoe UI, Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("BOKSCLUB", W / 2, FLOOR_Y + 60);
    ctx.lineWidth = 4;
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = ["#d04040", "#f0f0f0", "#3060d0"][i];
      const y = 120 + i * 28;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.fillStyle = "#555";
    ctx.fillRect(20, 110, 12, FLOOR_Y - 110);
    ctx.fillRect(W - 32, 110, 12, FLOOR_Y - 110);
  }

  function drawBoxer(ctx, x, look, facing, t, o) {
    const duck = o.block ? 14 : 0;
    const hand = G.drawKid(ctx, x, FLOOR_Y + 40 - duck, 1.25, look, {
      adult: true,
      facing,
      t,
      armAngle: o.armAngle,
      flash: o.flash,
      dizzy: o.dizzy,
      pose: o.down ? "down" : "stand",
    });
    if (!o.down) {
      ctx.fillStyle = o.gloves || "#d02020";
      ctx.beginPath();
      ctx.arc(hand.x, hand.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + facing * 16, FLOOR_Y - 12 - duck, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    return hand;
  }

  G.c3level4 = {
    title: "Level 4 — Boksclub (14 jaar)",
    intro:
      "Je eerste echte bokswedstrijd: <strong>3 rondes</strong> voor een vol publiek.<br>" +
      "<strong>← →</strong> bewegen, <strong>↑</strong> = jab, <strong>SPATIE</strong> = uppercut (kost kracht), <strong>↓</strong> = blokken.<br>" +
      "<strong>Gele</strong> handschoen = blokken (op het laatste moment = <strong>COUNTER</strong>). <strong>Rode</strong> handschoen = zware stoot: stap naar achteren!<br>" +
      "Sla hem twee keer neer voor een knock-out, of win op punten.",

    drawBackground(ctx, t) {
      drawRing(ctx, t, 0);
      drawBoxer(ctx, PLAYER_X0, G.playerKidLook(), 1, t, { armAngle: -0.4, gloves: "#2060d0" });
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
      this.blockSince = 0;
      this.enemy = { state: "idle", timer: 900, flash: 0, attack: null, knockdowns: 0, speed: 1 };
      this.pflash = 0;
      this.shake = 0;
      this.hype = 0;
      this.round = 1;
      this.time = ROUND_MS;
      this.breakTimer = 0;
      this.tip = COACH_TIPS[0];
      this.popups = [];
      this.ko = 0;
      this.koWho = null;
      this.over = false;
      this.now = 0;
      this.landed = 0;
    },

    popup(text, x, color, y = 150) {
      this.popups.push({ text, x, y, color, life: 800 });
    },

    reach() {
      return Math.abs(this.px - this.ex) < REACH;
    },

    punch(type) {
      if (this.over || this.ko || this.breakTimer > 0 || this.enemy.state === "down" || this.pAttack > 0) return;
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

    enemyAttack(kind) {
      const e = this.enemy;
      e.state = "windup";
      e.attack = kind;
      e.timer = ATTACKS[kind].windup * e.speed;
    },

    update(dt) {
      if (this.over) return;
      const s = dt / 1000;
      this.now += dt;
      const e = this.enemy;
      this.popups = G.updatePopups(this.popups, dt);
      this.pflash = Math.max(0, this.pflash - dt);
      this.shake = Math.max(0, this.shake - dt);
      this.hype = Math.max(0, this.hype - s * 0.6);
      e.flash = Math.max(0, e.flash - dt);
      this.stam = Math.min(STAM_MAX, this.stam + STAM_REGEN * s);
      const blocking = !!G.held.down && this.pAttack <= 0;
      if (blocking && !this.block) this.blockSince = this.now;
      this.block = blocking;

      if (this.ko) {
        this.ko -= dt;
        if (this.ko <= 0) {
          this.over = true;
          if (this.koWho === "enemy") this.api.complete();
          else this.api.fail("Knock-out! Je ging tegen de grond.");
        }
        return;
      }

      // corner break between rounds
      if (this.breakTimer > 0) {
        this.breakTimer -= dt;
        this.px += (PLAYER_X0 - this.px) * Math.min(1, s * 4);
        this.ex += (ENEMY_X0 - this.ex) * Math.min(1, s * 4);
        if (this.breakTimer <= 0) {
          e.state = "idle";
          e.timer = 800;
        }
        return;
      }

      // knockdown count
      if (e.state === "down") {
        e.timer -= dt;
        if (e.timer <= 0) {
          e.state = "idle";
          e.timer = 900;
          this.ehp = GETUP_HP;
          e.speed = 0.82;
          this.popup("Hij staat weer op... en is BOOS!", W / 2, "#ff9a5a", 200);
        }
        return;
      }

      this.time -= dt;
      if (this.time <= 0) {
        if (this.round >= ROUNDS) {
          this.over = true;
          if (this.php >= this.ehp) this.api.complete();
          else this.api.fail("De bel ging. De jury gaf je tegenstander de winst.");
          return;
        }
        this.round++;
        this.time = ROUND_MS;
        this.breakTimer = BREAK_MS;
        this.php = Math.min(100, this.php + BREAK_HEAL);
        this.ehp = Math.min(100, this.ehp + BREAK_HEAL / 2);
        this.tip = COACH_TIPS[(this.round - 1) % COACH_TIPS.length];
        this.pAttack = 0;
        return;
      }

      if (this.pAttack <= 0 && !this.block) {
        const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
        this.px = G.clamp(this.px + mx * MOVE_SPEED * s, 70, W - 120);
      }

      // player attack resolves mid-animation
      if (this.pAttack > 0) {
        const dur = this.pAttackType === "upper" ? UPPER_MS : JAB_MS;
        if (!this.pLanded && this.pAttack < dur * 0.6) {
          this.pLanded = true;
          if (this.reach()) {
            const counter = e.state === "stagger";
            let dmg = this.pAttackType === "upper" ? UPPER_DMG : JAB_DMG;
            if (counter) dmg = Math.round(dmg * COUNTER_MULT);
            // a punch during his windup interrupts a jab
            if (e.state === "windup" && e.attack !== "hook" && this.pAttackType === "upper") {
              e.state = "stagger";
              e.timer = STAGGER_MS * 0.6;
            }
            this.ehp = Math.max(0, this.ehp - dmg);
            this.landed++;
            e.flash = 250;
            this.shake = this.pAttackType === "upper" ? 220 : 90;
            this.hype = Math.min(1, this.hype + (this.pAttackType === "upper" ? 0.35 : 0.12));
            this.ex += (this.ex - this.px > 0 ? 1 : -1) * (this.pAttackType === "upper" ? 24 : 10);
            this.ex = G.clamp(this.ex, 70, W - 70);
            this.popup(counter ? `COUNTER -${dmg}` : `-${dmg}`, this.ex, counter ? "#ffb02e" : "#ffe066");
            if (this.ehp <= 0) {
              e.knockdowns++;
              this.hype = 1;
              if (e.knockdowns >= 2) {
                this.ko = KO_MS;
                this.koWho = "enemy";
              } else {
                e.state = "down";
                e.timer = COUNT_MS;
              }
            }
          }
        }
        this.pAttack -= dt;
      }

      // enemy AI
      e.timer -= dt;
      if (e.state === "idle") {
        const gap = Math.abs(this.px - this.ex);
        if (gap > REACH - 10) this.ex += (this.px > this.ex ? 1 : -1) * APPROACH * s;
        else if (gap < 70) this.ex += (this.px > this.ex ? -1 : 1) * APPROACH * 0.6 * s;
        if (this.reach() && e.timer <= 0) this.enemyAttack(Math.random() < 0.3 ? "hook" : "jab");
      } else if (e.state === "windup" && e.timer <= 0) {
        const a = ATTACKS[e.attack];
        e.state = "punch";
        e.timer = RECOVER_MS;
        if (!this.reach()) {
          this.popup("gemist!", this.ex, "#cfcfcf");
        } else if (this.block) {
          const perfect = e.attack !== "hook" && this.now - this.blockSince < PERFECT_MS;
          this.php = Math.max(0, this.php - (perfect ? 0 : a.blocked));
          if (perfect) {
            e.state = "stagger";
            e.timer = STAGGER_MS;
            this.popup("PERFECT! Sla nu!", this.px, "#6ee07a");
          } else this.popup(e.attack === "hook" ? `blok -${a.blocked}` : "blok", this.px, "#9fd3ff");
        } else {
          this.php = Math.max(0, this.php - a.dmg);
          this.pflash = 300;
          this.shake = e.attack === "hook" ? 300 : 120;
          this.popup(`-${a.dmg}`, this.px, "#ff6b6b");
        }
        if (this.php <= 0) {
          this.ko = KO_MS;
          this.koWho = "player";
          return;
        }
        // sometimes he follows a jab with a quick second one
        if (e.state === "punch" && e.attack === "jab" && Math.random() < 0.35) {
          e.timer = 120;
          e.next = "combo";
        } else e.next = null;
      } else if (e.state === "punch" && e.timer <= 0) {
        if (e.next) {
          this.enemyAttack(e.next);
          e.next = null;
        } else {
          e.state = "idle";
          e.timer = (400 + Math.random() * 700) * e.speed;
        }
      } else if (e.state === "stagger" && e.timer <= 0) {
        e.state = "idle";
        e.timer = 500;
      }
    },

    render(ctx, t) {
      ctx.save();
      if (this.shake > 0) ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 6);
      drawRing(ctx, t, this.hype);
      const e = this.enemy;
      const facing = this.ex >= this.px ? 1 : -1;
      const pArm = this.pAttack > 0 ? (this.pAttackType === "upper" ? -1.3 : -0.2) : this.block ? -1.2 : -0.5;
      const eArm = e.state === "windup" ? -1.5 : e.state === "punch" ? 0.1 : e.state === "stagger" ? 0.8 : -0.5;
      const eDown = e.state === "down" || (this.ko && this.koWho === "enemy");

      const drawP = () => drawBoxer(ctx, this.px, G.playerKidLook(), facing, t, { armAngle: pArm, flash: this.pflash > 0, block: this.block, down: this.ko && this.koWho === "player", gloves: "#2060d0" });
      const drawE = () => {
        const hand = drawBoxer(ctx, this.ex, ENEMY_LOOK, -facing, t, { armAngle: eArm, flash: e.flash > 0, down: eDown, dizzy: e.state === "stagger" || eDown });
        if (e.state === "windup") {
          ctx.fillStyle = ATTACKS[e.attack].color;
          ctx.beginPath();
          ctx.arc(hand.x, hand.y, e.attack === "hook" ? 17 : 13, 0, Math.PI * 2);
          ctx.fill();
        }
      };
      if (this.px <= this.ex) { drawP(); drawE(); } else { drawE(); drawP(); }

      // referee counts during a knockdown
      if (e.state === "down") {
        G.drawKid(ctx, W / 2, FLOOR_Y + 30, 1.05, REF_LOOK, { adult: true, t, armAngle: -1.4 });
        const n = Math.min(3, Math.floor((COUNT_MS - e.timer) / 1000) + 1);
        G.drawBanner(ctx, `${n}...`, "#ffe066", 90);
      }
      ctx.restore();

      // HP + stamina
      ctx.fillStyle = "rgba(0,0,0,0.5)";
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
      ctx.fillText(`Ronde ${this.round}/${ROUNDS} · ${Math.ceil(this.time / 1000)}s`, W / 2, 30);
      ctx.textAlign = "right";
      ctx.fillText("👊".repeat(e.knockdowns) || " ", W - 16, 50);

      if (this.breakTimer > 0) {
        G.drawBanner(ctx, `Ronde ${this.round}!`, "#ffe066", 80);
        G.drawBubble(ctx, W / 2, 200, this.tip);
      }
      if (this.ko) G.drawBanner(ctx, this.koWho === "enemy" ? "KNOCK-OUT!" : "Je ligt neer...", this.koWho === "enemy" ? "#6ee07a" : "#ff6b6b", 80);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return `Ronde ${this.round}/${ROUNDS} · Jij ${Math.round(this.php)} — Tegenstander ${Math.round(this.ehp)}`;
    },
  };
})();
