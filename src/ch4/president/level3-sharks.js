(() => {
  const { W, H } = G;
  const TANK = { x: 30, y: 70, w: W - 60, h: H - 90 };
  const SWIM = 105;
  const OXY_MAX = 100;
  const OXY_DRAIN = 3.6;
  const BUBBLE_REFILL = 30;
  const BUBBLE_MS = 6500;
  const BOLT_MS = 2600;
  const HP = 4;
  const INVULN_MS = 900;
  const PUNCH_R = 46;
  const PUNCH_COOLDOWN = 450;
  const STUN_MS = 1800;
  const SHARK_SPEED = 55;
  const CHARGE_SPEED = 230;
  const WARN_MS = 650;
  const BOLTS = [{ x: 200, y: TANK.y + 14 }, { x: 250, y: TANK.y + 14 }, { x: 300, y: TANK.y + 14 }, { x: 350, y: TANK.y + 14 }];
  const VENTS = [{ x: 90, y: TANK.y + TANK.h - 14 }, { x: W - 90, y: TANK.y + TANK.h - 14 }];
  const SAAI = { ...G.SKINS.wit, hair: "kort", hairColor: "#8a8a8a", eyes: G.EYES.blauw, gender: "jongen", shirt: "#4a4a4a", pants: "#2a2a2a" };

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function drawShark(ctx, s, t) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.scale(s.dir, 1);
    const wag = Math.sin(t * (s.state === "charge" ? 20 : 8)) * 0.25;
    ctx.fillStyle = s.stun > 0 ? "#9aa4b0" : s.flash > 0 ? "#fff" : "#6a7a8a";
    ctx.beginPath();
    ctx.ellipse(0, 0, 40, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(-38, 0);
    ctx.rotate(wag);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-18, -14);
    ctx.lineTo(-14, 0);
    ctx.lineTo(-18, 14);
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(-4, -11);
    ctx.lineTo(8, -28);
    ctx.lineTo(14, -11);
    ctx.fill();
    ctx.fillStyle = "#e8eef4";
    ctx.beginPath();
    ctx.ellipse(6, 5, 30, 6, 0, 0, Math.PI);
    ctx.fill();
    // eye + jaws (open while charging)
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(24, -3, 2.5, 0, Math.PI * 2);
    ctx.fill();
    if (s.state === "warn" || s.state === "charge") {
      ctx.fillStyle = "#8a2020";
      ctx.beginPath();
      ctx.moveTo(40, 0);
      ctx.lineTo(24, 4);
      ctx.lineTo(40, 9);
      ctx.fill();
      ctx.fillStyle = "#fff";
      for (let k = 0; k < 3; k++) ctx.fillRect(28 + k * 4, 3, 2, 3);
    }
    if (s.stun > 0) {
      ctx.scale(s.dir, 1);
      G.drawStars(ctx, 0, -30, 0.6, t);
    }
    ctx.restore();
  }

  G.CAREER_LEVELS.president[3] = {
    title: "Level 3 — Haaiengala (23 jaar)",
    intro:
      "Op een chique gala duwt <strong>Senator Saai</strong> je in de <strong>haaientank</strong>!<br>" +
      "Zwem met de <strong>pijltjes / WASD</strong>. Opent een haai zijn bek? Dan komt hij op je af: <strong>SPATIE</strong> = klap op zijn neus (dan zwemt hij duizelig weg).<br>" +
      "Draai de <strong>4 bouten</strong> van het luik los (erbij zwemmen en <strong>SPATIE</strong> ingedrukt houden). Je <strong>lucht</strong> raakt op: pak de <strong>luchtbellen</strong> onderin.",

    drawBackground(ctx, t) {
      this.drawTank(ctx, t);
    },

    drawTank(ctx, t) {
      ctx.fillStyle = "#2a1e30";
      ctx.fillRect(0, 0, W, H);
      // gala hall: chandelier and guests behind the glass
      ctx.fillStyle = "#ffd24a";
      ctx.beginPath();
      ctx.arc(W / 2 + 110, 18, 9, 0, Math.PI * 2);
      ctx.fill();
      const g = ctx.createLinearGradient(0, TANK.y, 0, TANK.y + TANK.h);
      g.addColorStop(0, "#1a6a9a");
      g.addColorStop(1, "#0a2a4a");
      ctx.fillStyle = g;
      ctx.fillRect(TANK.x, TANK.y, TANK.w, TANK.h);
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      for (let i = 0; i < 6; i++) {
        const x = TANK.x + ((i * 97 + (t || 0) * 12) % TANK.w);
        ctx.fillRect(x, TANK.y, 14, TANK.h);
      }
      ctx.fillStyle = "#c8b080";
      ctx.fillRect(TANK.x, TANK.y + TANK.h - 10, TANK.w, 10);
      ctx.strokeStyle = "rgba(200,230,255,0.6)";
      ctx.lineWidth = 4;
      ctx.strokeRect(TANK.x, TANK.y, TANK.w, TANK.h);
      // hatch on top
      ctx.fillStyle = "#6a6a72";
      ctx.fillRect(180, TANK.y - 6, 190, 14);
      for (const v of VENTS) {
        ctx.fillStyle = "#4a4a52";
        ctx.fillRect(v.x - 14, v.y - 4, 28, 8);
      }
    },

    start(api) {
      this.api = api;
      this.p = { x: W / 2, y: TANK.y + 150, hp: HP, invuln: 0, facing: 1, punch: 0, punchCd: 0 };
      this.oxy = OXY_MAX;
      this.bolts = BOLTS.map((b) => ({ ...b, progress: 0, done: false }));
      this.bubbles = [];
      this.bubbleTimer = 2500;
      this.sharks = [
        { x: 120, y: TANK.y + 80, dir: 1, state: "patrol", timer: 2500, stun: 0, flash: 0, vx: 0, vy: 0 },
        { x: W - 120, y: TANK.y + 260, dir: -1, state: "patrol", timer: 4200, stun: 0, flash: 0, vx: 0, vy: 0 },
      ];
      this.third = false;
      this.popups = [];
      this.flash = 0;
      this.over = false;
      this.won = 0;
      this.saaiT = 2500;
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 800 });
    },

    unscrewing() {
      return G.held.action && this.bolts.find((b) => !b.done && dist(b, this.p) < 26);
    },

    onAction() {
      const p = this.p;
      if (this.over || this.won || p.punchCd > 0 || this.unscrewing()) return;
      p.punch = 220;
      p.punchCd = PUNCH_COOLDOWN;
      for (const s of this.sharks) {
        if (s.stun > 0) continue;
        // the nose sits at the front of the shark
        const nose = { x: s.x + s.dir * 38, y: s.y };
        if (dist(nose, p) < PUNCH_R) {
          s.stun = STUN_MS;
          s.flash = 150;
          s.state = "flee";
          s.dir = -s.dir;
          this.popup("BAM! Op de neus!", s.x, s.y - 30, "#6ee07a");
        }
      }
    },

    hurt() {
      const p = this.p;
      if (p.invuln > 0) return;
      p.hp--;
      p.invuln = INVULN_MS;
      this.flash = 300;
      this.popup("HAP! -1 ❤", p.x, p.y - 30, "#ff6b6b");
      if (p.hp <= 0) {
        this.over = true;
        this.api.fail("De haaien waren sterker. Senator Saai lacht in zijn vuistje.");
      }
    },

    update(dt) {
      if (this.over) return;
      const s = dt / 1000;
      const p = this.p;
      this.popups = G.updatePopups(this.popups, dt);
      this.flash = Math.max(0, this.flash - dt);
      p.invuln = Math.max(0, p.invuln - dt);
      p.punchCd = Math.max(0, p.punchCd - dt);
      p.punch = Math.max(0, p.punch - dt);
      this.saaiT -= dt;

      if (this.won) {
        this.won -= dt;
        p.y -= 60 * s;
        if (this.won <= 0) {
          this.over = true;
          this.api.complete();
        }
        return;
      }

      this.oxy -= OXY_DRAIN * s;
      if (this.oxy <= 0) {
        this.over = true;
        this.api.fail("Je lucht is op! Gelukkig vist de geheime dienst je eruit... probeer opnieuw.");
        return;
      }

      const bolt = this.unscrewing();
      if (bolt) {
        bolt.progress += dt;
        if (bolt.progress >= BOLT_MS) {
          bolt.done = true;
          const left = this.bolts.filter((b) => !b.done).length;
          this.popup(left ? `Bout los! Nog ${left}` : "LUIK OPEN!", bolt.x, bolt.y + 30, "#6ee07a");
          if (!left) {
            this.won = 1800;
            return;
          }
          if (left === 2 && !this.third) {
            this.third = true;
            this.sharks.push({ x: TANK.x + 20, y: TANK.y + 200, dir: 1, state: "patrol", timer: 1500, stun: 0, flash: 0, vx: 0, vy: 0 });
            this.popup("Nog een haai!", W / 2, TANK.y + 200, "#ff8a3a");
          }
        }
      } else {
        const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
        const my = (G.held.down ? 1 : 0) - (G.held.up ? 1 : 0);
        if (mx || my) {
          const len = Math.hypot(mx, my);
          p.x += (mx / len) * SWIM * s;
          p.y += (my / len) * SWIM * s;
          if (mx) p.facing = mx;
        } else p.y += 6 * s; // slowly sink
        p.x = G.clamp(p.x, TANK.x + 16, TANK.x + TANK.w - 16);
        p.y = G.clamp(p.y, TANK.y + 20, TANK.y + TANK.h - 24);
      }

      // air bubbles rise from the vents now and then
      this.bubbleTimer -= dt;
      if (this.bubbleTimer <= 0) {
        this.bubbleTimer = BUBBLE_MS;
        const v = G.pick(VENTS);
        this.bubbles.push({ x: v.x, y: v.y - 10, life: 4500 });
      }
      for (const b of this.bubbles) {
        b.life -= dt;
        b.y -= 22 * s;
        b.x += Math.sin(b.life / 300) * 10 * s;
        if (dist(b, p) < 24) {
          b.life = 0;
          this.oxy = Math.min(OXY_MAX, this.oxy + BUBBLE_REFILL);
          this.popup("+lucht", p.x, p.y - 30, "#9fd3ff");
        }
      }
      this.bubbles = this.bubbles.filter((b) => b.life > 0 && b.y > TANK.y + 20);

      // sharks: patrol, then open jaws and charge at you
      for (const sh of this.sharks) {
        sh.flash = Math.max(0, sh.flash - dt);
        sh.timer -= dt;
        if (sh.stun > 0) {
          sh.stun -= dt;
          sh.x += sh.dir * 70 * s;
          if (sh.x < TANK.x + 50 || sh.x > TANK.x + TANK.w - 50) sh.dir = -sh.dir;
          if (sh.stun <= 0) {
            sh.state = "patrol";
            sh.timer = 1800 + Math.random() * 1500;
          }
          continue;
        }
        if (sh.state === "patrol") {
          sh.x += sh.dir * SHARK_SPEED * s;
          sh.y += Math.sin(sh.timer / 400) * 12 * s;
          if (sh.x < TANK.x + 50 || sh.x > TANK.x + TANK.w - 50) sh.dir = -sh.dir;
          if (sh.timer <= 0) {
            sh.state = "warn";
            sh.timer = WARN_MS;
            sh.dir = p.x >= sh.x ? 1 : -1;
          }
        } else if (sh.state === "warn") {
          sh.dir = p.x >= sh.x ? 1 : -1;
          if (sh.timer <= 0) {
            const d = dist(sh, p) || 1;
            sh.vx = ((p.x - sh.x) / d) * CHARGE_SPEED;
            sh.vy = ((p.y - sh.y) / d) * CHARGE_SPEED;
            sh.state = "charge";
            sh.timer = 1100;
          }
        } else if (sh.state === "charge") {
          sh.x += sh.vx * s;
          sh.y += sh.vy * s;
          sh.dir = sh.vx >= 0 ? 1 : -1;
          if (dist({ x: sh.x + sh.dir * 30, y: sh.y }, p) < 22) {
            this.hurt();
            sh.state = "patrol";
            sh.timer = 2200;
            if (this.over) return;
          }
          if (sh.timer <= 0) {
            sh.state = "patrol";
            sh.timer = 1300 + Math.random() * 1300;
          }
        }
        sh.x = G.clamp(sh.x, TANK.x + 40, TANK.x + TANK.w - 40);
        sh.y = G.clamp(sh.y, TANK.y + 30, TANK.y + TANK.h - 30);
      }
    },

    render(ctx, t) {
      this.drawTank(ctx, t);
      const p = this.p;

      // Senator Saai laughing outside the tank
      G.drawKid(ctx, W - 16, TANK.y - 2, 0.55, SAAI, { adult: true, t, facing: -1 });
      if (this.saaiT > 0) G.drawBubble(ctx, W - 70, TANK.y - 60, "Zwem lekker, Goudkuif!");

      for (const b of this.bolts) {
        ctx.fillStyle = b.done ? "#3a3a3a" : "#c8c8d0";
        ctx.beginPath();
        ctx.arc(b.x, b.y, 7, 0, Math.PI * 2);
        ctx.fill();
        if (!b.done && b.progress > 0) {
          ctx.fillStyle = "#6ee07a";
          ctx.fillRect(b.x - 12, b.y + 12, 24 * (b.progress / BOLT_MS), 4);
        }
        if (!b.done && dist(b, p) < 26 && !G.held.action) {
          ctx.fillStyle = "#6ee07a";
          ctx.font = "bold 10px Segoe UI, Roboto, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("houd SPATIE", b.x, b.y + 26);
        }
      }

      for (const b of this.bubbles) {
        ctx.strokeStyle = "rgba(220,240,255,0.9)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "rgba(220,240,255,0.25)";
        ctx.fill();
      }

      for (const sh of this.sharks) drawShark(ctx, sh, t);

      // you, swimming in your suit
      ctx.globalAlpha = p.invuln > 0 && Math.floor(t * 12) % 2 ? 0.5 : 1;
      G.drawKid(ctx, p.x, p.y + 20, 0.5, G.presLook(), { adult: true, t, facing: p.facing, pose: "walk", armAngle: p.punch > 0 ? 0 : -1.2 });
      G.drawQuiff(ctx, p.x, p.y + 20, 0.5, p.facing);
      ctx.globalAlpha = 1;
      if (p.punch > 0) {
        ctx.fillStyle = "#ffd24a";
        ctx.font = "bold 14px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("👊", p.x + p.facing * 22, p.y - 6);
      }

      if (this.flash > 0) {
        ctx.fillStyle = `rgba(200,40,40,${0.25 * (this.flash / 300)})`;
        ctx.fillRect(0, 0, W, H);
      }
      if (this.won) G.drawBanner(ctx, "Je bent eruit! Saai is woest.", "#6ee07a", H / 2);

      // HUD: hearts + air
      ctx.fillStyle = "#ff6b6b";
      ctx.font = "16px Segoe UI, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("❤".repeat(Math.max(0, p.hp)), 12, 26);
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(110, 14, 150, 12);
      ctx.fillStyle = this.oxy < 30 ? "#ff5050" : "#9fd3ff";
      ctx.fillRect(110, 14, 150 * (this.oxy / OXY_MAX), 12);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px Segoe UI, Roboto, sans-serif";
      ctx.fillText("LUCHT", 116, 24);
      ctx.textAlign = "right";
      ctx.font = "bold 12px Segoe UI, Roboto, sans-serif";
      ctx.fillText(`Bouten ${this.bolts.filter((b) => b.done).length}/${BOLTS.length}`, W - 12, 24);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return `Haaientank · lucht ${Math.round(this.oxy)}%`;
    },
  };
})();
