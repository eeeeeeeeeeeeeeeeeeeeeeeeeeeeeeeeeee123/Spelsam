(() => {
  const { W, H } = G;
  const ROAD_Y = 250;
  const CROWD_Y = 380;
  const ME_X = W / 2;
  const SPEED = 55; // parade speed
  const ROCKETS = 6;
  const NEED = 4;
  const CUE_EVERY = [2200, 3200];
  const CUE_WINDOW = 1100;
  const SUS_MISS = 30;
  const SUS_WRONG = 15;
  const SUS_CAUGHT = 45;
  const SUS_DOWN = 4;
  const FRAME = { x: ME_X - 55, w: 110 };
  // the cues the cheerleaders on the stand shout
  const CUES = [
    { key: "left", label: "KLAPPEN!", icon: "←", emoji: "👏" },
    { key: "right", label: "JUICHEN!", icon: "→", emoji: "🙌" },
    { key: "down", label: "BUIGEN!", icon: "↓", emoji: "🙇" },
  ];

  function drawSquare(ctx, t) {
    ctx.fillStyle = "#8ab0d0";
    ctx.fillRect(0, 0, W, H);
    // big building with banners
    ctx.fillStyle = "#d8d0c0";
    ctx.fillRect(40, 40, W - 80, 140);
    ctx.fillStyle = "#c8c0b0";
    for (let x = 60; x < W - 60; x += 46) ctx.fillRect(x, 50, 14, 120);
    ctx.fillStyle = "#c02020";
    for (let x = 90; x < W - 80; x += 120) {
      ctx.fillRect(x, 40, 30, 70);
      ctx.fillStyle = "#ffd24a";
      ctx.beginPath();
      ctx.arc(x + 15, 60, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#c02020";
    }
    // tribune
    ctx.fillStyle = "#6a6050";
    ctx.fillRect(W / 2 - 90, 150, 180, 30);
    ctx.fillStyle = "#b8a888";
    ctx.fillRect(0, 180, W, ROAD_Y + 30 - 180);
    ctx.fillStyle = "#9a9080";
    ctx.fillRect(0, ROAD_Y + 30, W, H - ROAD_Y - 30);
  }

  function drawRocket(ctx, r, t) {
    ctx.save();
    ctx.translate(r.x, ROAD_Y + 10);
    ctx.fillStyle = "#4a5a3a";
    ctx.fillRect(-70, -26, 140, 26);
    ctx.fillRect(56, -44, 26, 44);
    ctx.fillStyle = "rgba(160,200,230,0.6)";
    ctx.fillRect(62, -40, 16, 12);
    ctx.fillStyle = "#222";
    for (const wx of [-50, -20, 10, 66]) {
      ctx.beginPath();
      ctx.arc(wx, 2, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    // the rocket itself
    ctx.fillStyle = "#e8e8e0";
    ctx.fillRect(-80, -42, 120, 16);
    ctx.fillStyle = "#c02020";
    ctx.beginPath();
    ctx.moveTo(40, -42);
    ctx.lineTo(60, -34);
    ctx.lineTo(40, -26);
    ctx.fill();
    ctx.fillRect(-80, -46, 10, 24);
    ctx.fillStyle = "#333";
    ctx.font = "bold 9px Segoe UI, Roboto, sans-serif";
    ctx.fillText(r.code, -50, -30);
    ctx.restore();
  }

  G.CAREER_LEVELS.spion[4] = {
    title: "Level 4 — Militaire parade (24 jaar)",
    intro:
      "Vermomd sta je tussen het publiek bij een grote parade. Er rijden <strong>6 raketten</strong> voorbij: maak er minstens <strong>4 foto's</strong> van.<br>" +
      "Foto maken: <strong>SPATIE</strong> als een raket in je <strong>kader</strong> staat. Maar niet als de <strong>agent</strong> naar je kijkt (rode ogen)!<br>" +
      "Doe ook mee met het publiek: <strong>←</strong> klappen, <strong>→</strong> juichen, <strong>↓</strong> buigen als het wordt geroepen. Val je te veel op, dan word je opgepakt.",

    drawBackground(ctx, t) {
      drawSquare(ctx, t);
    },

    start(api) {
      this.api = api;
      this.sus = 0;
      this.photos = 0;
      this.flashT = 0;
      this.rockets = [];
      for (let i = 0; i < ROCKETS; i++) this.rockets.push({ x: -120 - i * 340, code: `HW-${10 + i * 7}`, shot: false, gone: false });
      this.marchers = [];
      for (let i = 0; i < 40; i++) this.marchers.push({ x: -40 - i * 60 - (i % 6) * 20, row: i % 2, look: G.NK_LOOK() });
      this.crowd = [];
      for (let i = 0; i < 14; i++) {
        const x = 20 + i * 40;
        if (Math.abs(x - ME_X) < 24) continue;
        this.crowd.push({ x, look: G.randomLook({ shirt: G.pick(["#3a3a3a", "#4a4a5a", "#5a4a3a"]), ...G.SKINS.wit, hairColor: "#1a1212" }), act: null, actT: 0 });
      }
      this.cue = null;
      this.cueTimer = 2000;
      this.myAct = null;
      this.myActT = 0;
      this.agent = { look: 0, state: "away", timer: 2500 };
      this.popups = [];
      this.over = false;
      this.done = 0;
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 900 });
    },

    addSus(n, text) {
      this.sus = Math.min(100, this.sus + n);
      this.popup(text, ME_X, CROWD_Y - 90, "#ff6b6b");
      if (this.sus >= 100) {
        this.over = true;
        this.api.fail("Je viel op. De geheime politie neemt je mee...");
      }
    },

    act(key) {
      this.myAct = key;
      this.myActT = 500;
      if (!this.cue || this.cue.answered) {
        this.addSus(SUS_WRONG, "Waarom doe jij dat nu?");
        return;
      }
      if (key === this.cue.key) {
        this.cue.answered = true;
        this.popup("Goed meegedaan", ME_X, CROWD_Y - 90, "#6ee07a");
      } else {
        this.cue.answered = true;
        this.addSus(SUS_WRONG, "Verkeerd gebaar!");
      }
    },

    onDirection(dx, dy, repeat) {
      if (repeat || this.over) return;
      if (dx < 0) this.act("left");
      else if (dx > 0) this.act("right");
      else if (dy > 0) this.act("down");
    },

    onAction() {
      if (this.over || this.done) return;
      this.flashT = 200;
      const r = this.rockets.find((r) => !r.shot && r.x > FRAME.x && r.x < FRAME.x + FRAME.w);
      if (this.agent.state === "look") {
        this.addSus(SUS_CAUGHT, "De agent zag je camera!");
        return;
      }
      if (r) {
        r.shot = true;
        this.photos++;
        this.popup(`Foto ${this.photos}! ${r.code}`, ME_X, CROWD_Y - 110, "#6ee07a");
      } else this.popup("Niks op de foto...", ME_X, CROWD_Y - 110, "#ffd24a");
    },

    update(dt) {
      if (this.over) return;
      const s = dt / 1000;
      this.flashT = Math.max(0, this.flashT - dt);
      this.myActT = Math.max(0, this.myActT - dt);
      this.popups = G.updatePopups(this.popups, dt);
      this.sus = Math.max(0, this.sus - SUS_DOWN * s);

      if (this.done) {
        this.done -= dt;
        if (this.done <= 0) {
          this.over = true;
          if (this.photos >= NEED) this.api.complete();
          else this.api.fail(`Maar ${this.photos} foto's. Je opdrachtgever wilde er minstens ${NEED}.`);
        }
        return;
      }

      for (const r of this.rockets) {
        r.x += SPEED * s;
        if (r.x > W + 120) r.gone = true;
      }
      for (const m of this.marchers) m.x += SPEED * s;
      if (this.rockets.every((r) => r.gone)) {
        this.done = 1500;
        return;
      }

      // cues from the tribune
      if (this.cue) {
        this.cue.timer -= dt;
        if (this.cue.timer <= 0) {
          if (!this.cue.answered) this.addSus(SUS_MISS, "Jij deed niet mee!");
          this.cue = null;
        }
      } else {
        this.cueTimer -= dt;
        if (this.cueTimer <= 0) {
          this.cueTimer = CUE_EVERY[0] + Math.random() * (CUE_EVERY[1] - CUE_EVERY[0]);
          this.cue = { ...G.pick(CUES), timer: CUE_WINDOW, answered: false };
          for (const c of this.crowd) {
            c.act = this.cue.key;
            c.actT = 300 + Math.random() * 300;
          }
        }
      }
      for (const c of this.crowd) {
        if (c.actT > 0) c.actT -= dt;
        if (c.actT <= -500) c.act = null;
      }

      // the secret police agent in the crowd turns his head now and then
      const a = this.agent;
      a.timer -= dt;
      if (a.timer <= 0) {
        if (a.state === "away") { a.state = "turning"; a.timer = 700; }
        else if (a.state === "turning") { a.state = "look"; a.timer = 1300 + Math.random() * 900; }
        else { a.state = "away"; a.timer = 1800 + Math.random() * 2200; }
      }
    },

    render(ctx, t) {
      drawSquare(ctx, t);
      // marching soldiers behind the rockets
      for (const m of this.marchers) {
        if (m.x < -20 || m.x > W + 20) continue;
        const y = ROAD_Y - 6 + m.row * 10;
        const step = Math.sin(t * 8 + m.x) * 4;
        G.drawKid(ctx, m.x, y + Math.abs(step) * 0.3, 0.4, m.look, { adult: true, t, pose: "walk" });
        G.drawCap(ctx, m.x, y, 0.4, 1);
      }
      for (const r of this.rockets) if (r.x > -150 && r.x < W + 150) drawRocket(ctx, r, t);

      // camera frame (your viewfinder)
      ctx.strokeStyle = this.agent.state === "look" ? "rgba(255,80,80,0.8)" : "rgba(255,255,255,0.8)";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(FRAME.x, ROAD_Y - 70, FRAME.w, 90);
      ctx.setLineDash([]);
      if (this.flashT > 0) {
        ctx.fillStyle = `rgba(255,255,255,${this.flashT / 200 * 0.6})`;
        ctx.fillRect(FRAME.x, ROAD_Y - 70, FRAME.w, 90);
      }

      // the crowd, with you in the middle
      for (const c of this.crowd) {
        const arm = c.act === "left" ? -0.4 : c.act === "right" ? -1.5 : undefined;
        G.drawKid(ctx, c.x, CROWD_Y + (c.act === "down" ? 10 : 0), 0.75, c.look, { adult: true, t, facing: -1, armAngle: c.actT > 0 || c.act ? arm : undefined });
      }
      const myArm = this.myActT > 0 ? (this.myAct === "left" ? -0.4 : this.myAct === "right" ? -1.5 : undefined) : -0.9;
      G.drawKid(ctx, ME_X, CROWD_Y + (this.myActT > 0 && this.myAct === "down" ? 10 : 0), 0.75, { ...G.playerKidLook(), shirt: "#4a4a54", pants: "#2a2a30" }, { adult: true, t, facing: -1, armAngle: myArm });
      ctx.fillStyle = "#222";
      ctx.fillRect(ME_X - 26, CROWD_Y - 52, 14, 10);
      ctx.fillStyle = "#6effa0";
      ctx.beginPath();
      ctx.moveTo(ME_X, CROWD_Y - 98);
      ctx.lineTo(ME_X - 7, CROWD_Y - 108);
      ctx.lineTo(ME_X + 7, CROWD_Y - 108);
      ctx.fill();
      ctx.font = "bold 10px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("JIJ", ME_X, CROWD_Y - 111);

      // the agent at the edge of the crowd
      const a = this.agent;
      const ax = 70;
      G.drawKid(ctx, ax, CROWD_Y + 6, 0.78, { ...G.SKINS.wit, hair: "kort", hairColor: "#1a1212", eyes: G.EYES.bruin, gender: "jongen", shirt: "#111", pants: "#111" }, { adult: true, t, facing: a.state === "away" ? -1 : 1, angry: a.state === "look" });
      G.drawShades(ctx, ax, CROWD_Y + 6, 0.78, a.state === "away" ? -1 : 1);
      if (a.state === "turning") {
        ctx.fillStyle = "#ffd24a";
        ctx.font = "bold 18px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("?", ax, CROWD_Y - 80);
      } else if (a.state === "look") {
        ctx.fillStyle = "#ff3030";
        ctx.beginPath();
        ctx.arc(ax + 6, CROWD_Y - 52, 3, 0, Math.PI * 2);
        ctx.arc(ax + 12, CROWD_Y - 52, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = "bold 12px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("👁 KIJKT", ax, CROWD_Y - 80);
      }

      // cue banner
      if (this.cue && !this.cue.answered) {
        const k = this.cue.timer / CUE_WINDOW;
        G.drawBanner(ctx, `${this.cue.emoji} ${this.cue.label} (${this.cue.icon})`, "#ffd24a", 210);
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(W / 2 - 60, 228, 120, 5);
        ctx.fillStyle = "#ffd24a";
        ctx.fillRect(W / 2 - 60, 228, 120 * k, 5);
      }

      // HUD
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(10, 10, 160, 12);
      ctx.fillStyle = this.sus > 60 ? "#ff4040" : "#ffd24a";
      ctx.fillRect(10, 10, 160 * (this.sus / 100), 12);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("VERDACHT", 14, 34);
      ctx.font = "bold 14px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`📷 ${this.photos}/${NEED}  ·  raketten ${this.rockets.filter((r) => r.gone).length}/${ROCKETS}`, W - 12, 22);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return `Foto's ${this.photos}/${NEED} · verdacht ${Math.round(this.sus)}%`;
    },
  };
})();
