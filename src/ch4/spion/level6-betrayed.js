(() => {
  const { W, H } = G;
  const FLOOR = 360;
  const ROOF_START = 1350;
  const END_X = 2750;
  const RUN = 180;
  const CHASE = 152;
  const START_GAP = 170;
  const JUMP_V = 460;
  const GRAVITY = 1350;
  const STUMBLE_MS = 550;
  const CAM_X = 200;
  const TALK = [
    { who: "contact", text: "Heb je de foto's van de parade?" },
    { who: "me", text: "Hier, in deze envelop." },
    { who: "contact", text: "Mooi... Sorry, vriend." },
  ];
  // jump over low things, duck under high things, jump the gaps between roofs
  const COURSE = [
    { type: "table", x: 420 }, { type: "pan", x: 600 }, { type: "table", x: 760 }, { type: "pot", x: 900 },
    { type: "pan", x: 1040 }, { type: "table", x: 1180 },
    { type: "gap", x: 1480, w: 70 }, { type: "laundry", x: 1650 }, { type: "chimney", x: 1800 },
    { type: "gap", x: 1950, w: 80 }, { type: "laundry", x: 2120 }, { type: "chimney", x: 2260 },
    { type: "gap", x: 2400, w: 90 }, { type: "laundry", x: 2580 },
  ];
  const LOW = { table: 30, pot: 34, chimney: 40 };
  const CONTACT_LOOK = { ...G.SKINS.wit, hair: "kort", hairColor: "#1a1212", eyes: G.EYES.bruin, gender: "jongen", shirt: "#5a4a3a", pants: "#3a2a1a" };
  const AGENT_LOOK = { ...G.SKINS.wit, hair: "kort", hairColor: "#1a1212", eyes: G.EYES.bruin, gender: "jongen", shirt: "#111", pants: "#111" };

  function drawBackdrop(ctx, cam, t) {
    if (cam < ROOF_START - 200) {
      // tea house / kitchen
      ctx.fillStyle = "#3a2a24";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#4a3a30";
      for (let x = -(cam * 0.6) % 90; x < W; x += 90) ctx.fillRect(x, 60, 60, 80);
      ctx.fillStyle = "#c8b8a0";
      ctx.fillRect(0, FLOOR, W, H - FLOOR);
      ctx.fillStyle = "#b8a890";
      for (let x = -(cam % 40); x < W; x += 40) ctx.fillRect(x, FLOOR, 2, H - FLOOR);
    }
    const rx = ROOF_START - 200 - cam;
    if (rx < W) {
      // night sky over the rooftops
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#0a0e22");
      g.addColorStop(1, "#2a2a44");
      ctx.fillStyle = g;
      ctx.fillRect(Math.max(0, rx), 0, W, H);
      ctx.fillStyle = "#151828";
      for (let i = 0; i < 12; i++) {
        const x = Math.max(rx, ((i * 110 - cam * 0.3) % (W + 200) + W + 200) % (W + 200) - 100);
        ctx.fillRect(x, 180 + (i % 3) * 30, 70, 200);
      }
      ctx.fillStyle = "#4a3a3a";
      ctx.fillRect(Math.max(0, rx), FLOOR, W, H - FLOOR);
      ctx.fillStyle = "#5a4a4a";
      ctx.fillRect(Math.max(0, rx), FLOOR, W, 6);
    }
  }

  G.CAREER_LEVELS.spion[6] = {
    title: "Level 6 — Verraden (26 jaar)",
    intro:
      "Je geeft de foto's van de parade af aan je contactpersoon in een theehuis in Pyongyang...<br>" +
      "Als het misgaat: <strong>VLUCHT</strong>! Houd <strong>→</strong> ingedrukt om te rennen, <strong>↑</strong> springen over tafels, pannen en tussen de daken, <strong>↓</strong> bukken onder vliegende pannen en waslijnen.<br>" +
      "Struikel je, dan halen de agenten je in.",

    drawBackground(ctx, t) {
      drawBackdrop(ctx, 0, t);
    },

    start(api) {
      this.api = api;
      this.p = { x: 120, y: 0, vy: 0, duck: false, stumble: 0 };
      this.chaserX = this.p.x - START_GAP;
      this.phase = "talk";
      this.line = 0;
      this.timer = 1600;
      this.over = false;
      this.popups = [];
    },

    stumble(text) {
      this.p.stumble = STUMBLE_MS;
      this.popups.push({ text, x: CAM_X, y: FLOOR - 110, color: "#ff6b6b", life: 700 });
    },

    update(dt) {
      if (this.over) return;
      const s = dt / 1000;
      const p = this.p;
      this.popups = G.updatePopups(this.popups, dt);
      this.timer -= dt;

      if (this.phase === "talk") {
        if (this.timer <= 0) {
          this.line++;
          this.timer = 1600;
          if (this.line >= TALK.length) {
            this.phase = "trap";
            this.timer = 1500;
          }
        }
        return;
      }
      if (this.phase === "trap") {
        if (this.timer <= 0) this.phase = "run";
        return;
      }
      if (this.phase === "caught") {
        if (this.timer <= 0) {
          this.over = true;
          this.api.complete();
        }
        return;
      }

      // chasers keep coming
      this.chaserX += CHASE * s;
      if (this.chaserX >= p.x - 14) {
        this.over = true;
        this.api.fail("De agenten hebben je ingehaald. Probeer opnieuw!");
        return;
      }

      if (p.stumble > 0) {
        p.stumble -= dt;
        return;
      }
      const grounded = p.y >= 0;
      p.duck = grounded && G.held.down;
      const speed = G.held.right ? (p.duck ? RUN * 0.55 : RUN) : 0;
      if (G.held.up && grounded && !p.duck) p.vy = -JUMP_V;
      p.vy += GRAVITY * s;
      p.y = Math.min(0, p.y + p.vy * s);
      if (p.y >= 0) p.vy = 0;
      const nx = p.x + speed * s;

      for (const o of COURSE) {
        if (o.hit) continue;
        if (o.type === "gap") {
          if (p.y >= 0 && nx > o.x + 8 && nx < o.x + o.w - 8) {
            this.over = true;
            this.api.fail("Je viel tussen de daken. Probeer opnieuw!");
            return;
          }
          continue;
        }
        if (!(p.x <= o.x && nx > o.x)) continue;
        if (LOW[o.type] && -p.y < LOW[o.type]) {
          o.hit = true;
          this.stumble("Struikel!");
          return;
        }
        if ((o.type === "pan" || o.type === "laundry") && !p.duck) {
          o.hit = true;
          this.stumble(o.type === "pan" ? "BONK! Pan!" : "In de was!");
          return;
        }
      }
      p.x = nx;

      if (p.x >= END_X) {
        this.phase = "caught";
        this.timer = 4200;
        this.ambush = [0, 1, 2, 3].map(() => G.NK_LOOK());
      }
    },

    render(ctx, t) {
      const p = this.p;
      const cam = Math.max(0, p.x - CAM_X);
      drawBackdrop(ctx, cam, t);

      // course
      for (const o of COURSE) {
        const x = o.x - cam;
        if (x < -120 || x > W + 120) continue;
        if (o.type === "table") {
          ctx.fillStyle = "#6a4a2a";
          ctx.fillRect(x - 6, FLOOR - 28, 44, 6);
          ctx.fillRect(x - 2, FLOOR - 22, 4, 22);
          ctx.fillRect(x + 30, FLOOR - 22, 4, 22);
          ctx.fillStyle = "#e8e0d0";
          ctx.fillRect(x + 8, FLOOR - 36, 8, 8);
        } else if (o.type === "pot") {
          ctx.fillStyle = "#555";
          ctx.fillRect(x - 4, FLOOR - 30, 34, 30);
          ctx.fillStyle = "rgba(255,255,255,0.4)";
          ctx.beginPath();
          ctx.arc(x + 12, FLOOR - 40 - Math.sin(t * 5) * 4, 8, 0, Math.PI * 2);
          ctx.fill();
        } else if (o.type === "pan") {
          // a pan flying at head height (a cook throws it)
          const yy = FLOOR - 62 + Math.sin(t * 8 + o.x) * 3;
          ctx.fillStyle = "#333";
          ctx.beginPath();
          ctx.ellipse(x + 10, yy, 13, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(x + 22, yy - 2, 14, 4);
        } else if (o.type === "gap") {
          ctx.fillStyle = "#0a0a14";
          ctx.fillRect(x, FLOOR, o.w, H - FLOOR);
        } else if (o.type === "laundry") {
          ctx.strokeStyle = "#ccc";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x - 40, FLOOR - 74);
          ctx.quadraticCurveTo(x + 10, FLOOR - 64, x + 60, FLOOR - 74);
          ctx.stroke();
          ctx.fillStyle = "#d8d8f0";
          ctx.fillRect(x - 10, FLOOR - 70, 18, 22);
          ctx.fillStyle = "#f0c8c8";
          ctx.fillRect(x + 16, FLOOR - 69, 14, 18);
        } else if (o.type === "chimney") {
          ctx.fillStyle = "#6a4a3a";
          ctx.fillRect(x, FLOOR - 40, 24, 40);
        }
      }

      if (this.phase === "talk" || this.phase === "trap") {
        G.drawKid(ctx, 120, FLOOR, 1, G.spyLook(), { adult: true, t, pose: "sit" });
        G.drawShades(ctx, 120, FLOOR, 1);
        G.drawKid(ctx, 230, FLOOR, 1, CONTACT_LOOK, { adult: true, t, pose: "sit", facing: -1 });
        ctx.fillStyle = "#6a4a2a";
        ctx.fillRect(140, FLOOR - 40, 70, 8);
        if (this.phase === "talk") {
          const l = TALK[Math.min(this.line, TALK.length - 1)];
          G.drawBubble(ctx, l.who === "me" ? 130 : 230, FLOOR - 120, l.text);
        } else {
          for (let i = 0; i < 3; i++) G.drawKid(ctx, 340 + i * 50, FLOOR, 1, AGENT_LOOK, { adult: true, t, facing: -1, angry: true, armAngle: 0 });
          G.drawBanner(ctx, "VALSTRIK! Rennen!", "#ff4040", 120);
        }
        return;
      }

      // agents chasing
      const cx = this.chaserX - cam;
      for (let i = 0; i < 3; i++) {
        const ax = cx - i * 34;
        if (ax < -40) continue;
        G.drawKid(ctx, ax, FLOOR, 0.95, AGENT_LOOK, { adult: true, t: t + i, pose: "walk", angry: true, armAngle: -0.2 });
        G.drawShades(ctx, ax, FLOOR, 0.95);
      }

      // you
      const px = p.x - cam;
      if (p.duck) G.drawKid(ctx, px, FLOOR + p.y, 0.95, G.spyLook(), { adult: true, t, pose: "crawl" });
      else {
        G.drawKid(ctx, px, FLOOR + p.y, 0.95, G.spyLook(), { adult: true, t, pose: G.held.right && p.y >= 0 ? "walk" : "stand", dizzy: p.stumble > 0 });
        G.drawShades(ctx, px, FLOOR + p.y, 0.95);
      }

      if (this.phase === "caught") {
        // ambush on the last roof: spotlight, net, rifles
        const k = 1 - this.timer / 4200;
        ctx.fillStyle = `rgba(255,255,220,${Math.min(0.35, k)})`;
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px - 70, FLOOR);
        ctx.lineTo(px + 70, FLOOR);
        ctx.fill();
        for (let i = 0; i < 4; i++) {
          const gx = px + 110 + i * 34;
          const hand = G.drawKid(ctx, gx, FLOOR, 0.95, this.ambush[i], { adult: true, t: 0, facing: -1, armAngle: 0 });
          G.drawCap(ctx, gx, FLOOR, 0.95, -1);
          G.drawRifle(ctx, hand, Math.PI, -1, 0.9);
        }
        if (k > 0.35) {
          ctx.strokeStyle = "rgba(200,200,200,0.8)";
          ctx.lineWidth = 1;
          for (let i = -4; i <= 4; i++) {
            ctx.beginPath();
            ctx.moveTo(px + i * 10, FLOOR - 100);
            ctx.lineTo(px + i * 12, FLOOR);
            ctx.stroke();
          }
        }
        ctx.fillStyle = `rgba(0,0,0,${Math.max(0, k - 0.55) * 2.2})`;
        ctx.fillRect(0, 0, W, H);
        if (k > 0.5) {
          ctx.fillStyle = "#fff";
          ctx.font = "bold 22px Segoe UI, Roboto, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Iemand heeft je verraden...", W / 2, H / 2);
        }
        return;
      }

      // distance to the agents
      const gap = p.x - this.chaserX;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(10, 10, 170, 12);
      ctx.fillStyle = gap < 70 ? "#ff4040" : "#ffd24a";
      ctx.fillRect(10, 10, 170 * G.clamp(gap / START_GAP, 0, 1), 12);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("VOORSPRONG", 14, 34);
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(W - 170, 12, 156, 8);
      ctx.fillStyle = "#6ee07a";
      ctx.fillRect(W - 170, 12, 156 * Math.min(1, p.x / END_X), 8);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return this.phase === "run" ? "Vlucht!" : "";
    },
  };
})();
