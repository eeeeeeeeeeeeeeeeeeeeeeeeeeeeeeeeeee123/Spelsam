(() => {
  const { W, H } = G;
  const GANG_LOOK = {
    skin: "#c68e6e",
    shade: "#a8715a",
    hair: "kort",
    hairColor: "#1a1212",
    eyes: G.EYES.bruin,
    gender: "jongen",
    shirt: "#2a2f45",
    pants: "#1c2030",
  };

  function drawCourt(ctx) {
    ctx.fillStyle = "#8fc5e8";
    ctx.fillRect(0, 0, W, 170);
    ctx.fillStyle = "#c46b3f";
    ctx.fillRect(0, 170, W, H - 170);
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(W / 2, 170, 90, 0, Math.PI);
    ctx.stroke();
    // fence
    ctx.strokeStyle = "rgba(80, 80, 80, 0.5)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 14) {
      ctx.beginPath();
      ctx.moveTo(x, 90);
      ctx.lineTo(x + 40, 170);
      ctx.moveTo(x + 40, 90);
      ctx.lineTo(x, 170);
      ctx.stroke();
    }
    // hoop
    ctx.fillStyle = "#555";
    ctx.fillRect(W / 2 - 3, 60, 6, 110);
    ctx.fillStyle = "#fff";
    ctx.fillRect(W / 2 - 34, 36, 68, 44);
    ctx.strokeStyle = "#e0453a";
    ctx.lineWidth = 3;
    ctx.strokeRect(W / 2 - 14, 52, 28, 20);
    ctx.beginPath();
    ctx.ellipse(W / 2, 82, 16, 4, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawBasketball(ctx, x, y) {
    ctx.fillStyle = "#e8742f";
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#5a2a10";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x - 9, y);
    ctx.lineTo(x + 9, y);
    ctx.moveTo(x, y - 9);
    ctx.lineTo(x, y + 9);
    ctx.stroke();
  }

  let friends = [];

  function drawFriends(ctx, t, spots = [[70, 200, 1], [W - 70, 200, -1]], mood = { sad: true }) {
    if (!friends.length) friends = [G.randomLook(), G.randomLook()];
    spots.forEach(([x, y, facing], i) => G.drawKid(ctx, x, y, 0.75, friends[i], { t, facing, ...mood }));
  }

  // ---- 3-pointer power meter, played before the fight ----
  const MAKES_NEEDED = 3;
  const MAX_SHOTS = 7;
  const ZONE_CENTER = 0.72;
  const ZONE_WIDTHS = [0.22, 0.16, 0.11];
  const CHARGE_PERIOD = 1100;
  const FLIGHT_MS = 800;
  const RESULT_MS = 700;
  const FLOOR_Y = 390;
  const RIM = { x: 452, y: 176, halfW: 18 };
  const BOARD_X = 478;
  const SHOOTER = { x: 110, y: FLOOR_Y };
  const METER = { x: 26, y: 110, w: 16, h: 220 };

  function drawSideCourt(ctx, t) {
    ctx.fillStyle = "#8fc5e8";
    ctx.fillRect(0, 0, W, FLOOR_Y - 60);
    ctx.strokeStyle = "rgba(80, 80, 80, 0.4)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 14) {
      ctx.beginPath();
      ctx.moveTo(x, 200);
      ctx.lineTo(x + 40, FLOOR_Y - 60);
      ctx.moveTo(x + 40, 200);
      ctx.lineTo(x, FLOOR_Y - 60);
      ctx.stroke();
    }
    ctx.fillStyle = "#c46b3f";
    ctx.fillRect(0, FLOOR_Y - 60, W, H - FLOOR_Y + 60);
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(SHOOTER.x + 30, FLOOR_Y - 40);
    ctx.lineTo(SHOOTER.x + 30, H);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "bold 12px Segoe UI, Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("3PT", SHOOTER.x + 30, H - 10);
    // hoop
    ctx.fillStyle = "#555";
    ctx.fillRect(BOARD_X + 22, 120, 8, FLOOR_Y - 120);
    ctx.fillRect(BOARD_X + 4, 150, 22, 6);
    ctx.fillStyle = "#fff";
    ctx.fillRect(BOARD_X, 110, 6, 80);
    ctx.strokeStyle = "#e0453a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(RIM.x - RIM.halfW, RIM.y);
    ctx.lineTo(BOARD_X, RIM.y);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= 4; i++) {
      const x = RIM.x - RIM.halfW + (i * (BOARD_X - RIM.x + RIM.halfW)) / 4;
      ctx.beginPath();
      ctx.moveTo(x, RIM.y);
      ctx.lineTo(RIM.x + (x - RIM.x) * 0.5, RIM.y + 28 + Math.sin(t * 3 + i) * 1.5);
      ctx.stroke();
    }
  }

  function makeThreePointers(api) {
    return {
      makes: 0,
      shots: 0,
      charging: false,
      charge: 0,
      ball: null,
      celebrate: 0,
      finished: false,
      failed: false,

      zone() {
        const w = ZONE_WIDTHS[Math.min(this.makes, ZONE_WIDTHS.length - 1)];
        return [ZONE_CENTER - w / 2, ZONE_CENTER + w / 2];
      },

      power() {
        const x = (this.charge % CHARGE_PERIOD) / CHARGE_PERIOD;
        return x < 0.5 ? x * 2 : 2 - x * 2;
      },

      fire(p, hand) {
        this.shots++;
        const [lo, hi] = this.zone();
        const outcome = p < lo ? "short" : p > hi ? "long" : "made";
        let end;
        if (outcome === "made") end = { x: RIM.x, y: RIM.y - 4 };
        else if (outcome === "short") end = { x: hand.x + (RIM.x - RIM.halfW - 6 - hand.x) * Math.max(0.45, p / lo), y: RIM.y };
        else end = { x: BOARD_X - 6, y: RIM.y - 30 - (p - hi) * 80 };
        this.ball = { start: { ...hand }, end, outcome, k: 0, after: 0, x: hand.x, y: hand.y };
      },

      update(dt) {
        if (this.finished || this.failed) return;
        if (this.celebrate > 0) {
          this.celebrate -= dt;
          if (this.celebrate <= 0) this.finished = true;
          return;
        }
        const b = this.ball;
        if (b) {
          if (b.k < 1) {
            b.k = Math.min(1, b.k + dt / FLIGHT_MS);
            b.x = b.start.x + (b.end.x - b.start.x) * b.k;
            b.y = b.start.y + (b.end.y - b.start.y) * b.k - 160 * 4 * b.k * (1 - b.k);
            return;
          }
          b.after += dt;
          const a = b.after / RESULT_MS;
          if (b.outcome === "made") b.y = b.end.y + a * 70;
          else if (b.outcome === "short") {
            b.x = b.end.x - a * 25;
            b.y = b.end.y + a * a * (FLOOR_Y - 12 - b.end.y);
          } else {
            b.x = b.end.x - a * 90;
            b.y = b.end.y + a * a * (FLOOR_Y - 12 - b.end.y);
          }
          if (b.after < RESULT_MS) return;
          this.ball = null;
          if (b.outcome === "made") this.makes++;
          if (this.makes >= MAKES_NEEDED) this.celebrate = 1000;
          else if (this.shots >= MAX_SHOTS) {
            this.failed = true;
            api.fail(`Te veel gemist: ${this.makes} van de ${MAKES_NEEDED} driepunters.`);
          }
          return;
        }
        if (G.held.action) {
          if (!this.charging) {
            this.charging = true;
            this.charge = 0;
          }
          this.charge += dt;
        } else if (this.charging) {
          this.charging = false;
          this.fire(this.power(), this.hand || { x: SHOOTER.x + 14, y: SHOOTER.y - 70 });
        }
      },

      render(ctx, t) {
        drawSideCourt(ctx, t);
        drawFriends(ctx, t, [[230, FLOOR_Y - 55, 1], [330, FLOOR_Y - 55, 1]], {});
        const aiming = this.charging || (this.ball && this.ball.k < 0.3);
        this.hand = G.drawKid(ctx, SHOOTER.x, SHOOTER.y, 1.05, G.playerKidLook(), { t, armAngle: aiming ? -1.5 : -0.5 });
        const b = this.ball;
        if (b) drawBasketball(ctx, b.x, b.y);
        else if (!this.celebrate) drawBasketball(ctx, this.hand.x + 4, this.hand.y - 8);

        const [lo, hi] = this.zone();
        const m = METER;
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(m.x, m.y, m.w, m.h);
        ctx.fillStyle = "#6ee07a";
        ctx.fillRect(m.x, m.y + m.h * (1 - hi), m.w, m.h * (hi - lo));
        const p = this.charging ? this.power() : 0;
        ctx.fillStyle = "#fff";
        ctx.fillRect(m.x - 4, m.y + m.h * (1 - p) - 2, m.w + 8, 4);

        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(W / 2 - 120, 10, 240, 28);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 15px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`Raak: ${this.makes} / ${MAKES_NEEDED} · Ballen: ${MAX_SHOTS - this.shots}`, W / 2, 29);
        if (!this.shots && !this.charging) G.drawBanner(ctx, "Houd SPATIE vast, laat los in het groen", "#ffe066", H - 30);

        if (b && b.k >= 1) {
          const text = b.outcome === "made" ? "SWISH!" : b.outcome === "short" ? "Te kort!" : "Te hard!";
          ctx.fillStyle = b.outcome === "made" ? "#6ee07a" : "#ff6b6b";
          ctx.font = "bold 30px Segoe UI, Roboto, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(text, RIM.x - 60, RIM.y - 60);
        }
        if (this.celebrate > 0) G.drawBanner(ctx, "3 van de 3!", "#6ee07a", 90);
      },

      done() {
        return this.finished;
      },

      hud() {
        return `Driepunters: ${this.makes} / ${MAKES_NEEDED}`;
      },
    };
  }

  G.c2level6 = G.makeFightLevel({
    title: "Level 6 — Het basketbalveld (6 jaar)",
    intro:
      "Een middagje basketballen met je vrienden. Maak eerst <strong>3 driepunters</strong>: houd <strong>SPATIE</strong> ingedrukt en laat los als de streep in het groen staat.<br>" +
      "Daarna: <strong>pijltjes</strong> = lopen, <strong>SPATIE</strong> = slaan, <strong>B</strong> ingedrukt houden = blokken. Licht een vuist <strong>geel</strong> op? Dan komt er een klap aan.",
    makePrelude: makeThreePointers,
    bounds: { minX: 50, maxX: W - 50, minY: 250, maxY: H - 20 },
    labels: { player: "Jij", enemy: "Bendelid" },
    enemySpeed: 145,
    stats: { windupMs: 380, recoverMs: 600, enemyDamage: 30, parryChance: 0.75 },
    winText: "K.O.! Jij wint.",
    loseReason: "Het bendelid was sterker. Je verloor het gevecht.",
    script: [
      { who: "enemy", text: "Hé jij. Geef me die bal.", ms: 2000 },
      { who: "player", text: "Nee, wij zijn aan het spelen.", ms: 2000 },
      { who: "enemy", text: "Wát zei je?! Kom maar op dan!", ms: 2000 },
    ],

    drawBackground(ctx, t) {
      drawCourt(ctx);
      drawFriends(ctx, t);
    },

    drawIdle(ctx, t) {
      const hand = G.drawKid(ctx, 150, 340, 1, G.playerKidLook(), { t, armAngle: 0.4 });
      drawBasketball(ctx, hand.x + 6, hand.y);
    },

    drawActor(ctx, who, pos, facing, stance, t) {
      if (who === "enemy") {
        const hand = G.drawKid(ctx, pos.x, pos.y, 1.05, GANG_LOOK, { adult: true, pose: stance.dizzy ? "down" : "stand", facing, t, armAngle: stance.dizzy ? undefined : stance.angle, angry: stance.angry, dizzy: stance.dizzy, flash: stance.flash });
        if (stance.glow) {
          ctx.fillStyle = "rgba(255, 224, 102, 0.6)";
          ctx.beginPath();
          ctx.arc(hand.x, hand.y, 12, 0, Math.PI * 2);
          ctx.fill();
        }
        return;
      }
      G.drawKid(ctx, pos.x, pos.y, 1, G.playerKidLook(), { facing, t, armAngle: stance.angle, flash: stance.flash });
    },
  });
})();
