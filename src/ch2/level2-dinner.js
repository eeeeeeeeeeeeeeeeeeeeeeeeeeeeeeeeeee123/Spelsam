(() => {
  const { W, H } = G;
  const TABLE_Y = 300;
  const BITES = 3;
  const FOODS = [
    { id: "broccoli", label: "Broccoli", x: 160 },
    { id: "biefstuk", label: "Biefstuk", x: 270 },
    { id: "chocola", label: "Chocola", x: 380 },
  ];
  const PRAISE_MS = 2000;
  const SPANK_MS = 2800;
  const MOM_LINES = ["Eerst je broccoli en biefstuk opeten!", "Anders krijg je straf, hoor.", "Eet maar lekker door."];

  function drawDining(ctx) {
    G.drawRoom(ctx, "#f6dcc0", "#a8744a", 250);
    G.drawWindow(ctx, 40, 40, 110, 90);
    ctx.fillStyle = "#e9b949";
    ctx.beginPath();
    ctx.arc(W / 2, 20, 16, 0, Math.PI);
    ctx.fill();
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, 20);
    ctx.stroke();
  }

  function drawTable(ctx) {
    ctx.fillStyle = "#8a5a36";
    ctx.fillRect(60, TABLE_Y, W - 120, 22);
    ctx.fillStyle = "#6e4526";
    ctx.fillRect(80, TABLE_Y + 22, 14, H - TABLE_Y - 22);
    ctx.fillRect(W - 94, TABLE_Y + 22, 14, H - TABLE_Y - 22);
    ctx.fillStyle = "#f4f1ea";
    ctx.fillRect(60, TABLE_Y - 3, W - 120, 4);
  }

  function drawFood(ctx, id, x, y, amount) {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(x, y, 42, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    if (amount <= 0) return;
    ctx.save();
    ctx.translate(x, y - 6);
    ctx.scale(0.4 + 0.6 * amount, 0.4 + 0.6 * amount);
    if (id === "broccoli") {
      ctx.fillStyle = "#6b9a3a";
      ctx.fillRect(-4, -8, 8, 12);
      ctx.fillStyle = "#3f8f3a";
      for (const [cx, cy] of [[-10, -14], [0, -20], [10, -14], [-5, -10], [6, -10]]) {
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (id === "biefstuk") {
      ctx.fillStyle = "#f3d9c4";
      ctx.beginPath();
      ctx.ellipse(0, -6, 26, 13, -0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#8a3b24";
      ctx.beginPath();
      ctx.ellipse(-2, -6, 22, 10, -0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#5e2414";
      ctx.lineWidth = 2;
      for (let i = -12; i <= 8; i += 7) {
        ctx.beginPath();
        ctx.moveTo(i, -12);
        ctx.lineTo(i + 6, 0);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = "#5a321c";
      ctx.fillRect(-22, -20, 44, 20);
      ctx.strokeStyle = "#3e2010";
      ctx.lineWidth = 2;
      for (let i = -11; i < 22; i += 11) {
        ctx.beginPath();
        ctx.moveTo(i, -20);
        ctx.lineTo(i, 0);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(-22, -10);
      ctx.lineTo(22, -10);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawFamily(ctx, t, childOpts) {
    const { mom, dad } = G.parentLooks();
    G.drawKid(ctx, 110, TABLE_Y + 20, 1.25, mom, { adult: true, pose: "sit", t });
    G.drawKid(ctx, 430, TABLE_Y + 20, 1.25, dad, { adult: true, pose: "sit", facing: -1, t });
    return G.drawKid(ctx, 270, TABLE_Y + 16, 1.1, G.playerKidLook(), { pose: "sit", t, ...childOpts });
  }

  G.c2level2 = {
    title: "Level 2 — Aan tafel (2 jaar)",
    intro:
      "Etenstijd met je ouders!<br>" +
      "<strong>Klik op het eten</strong>, of kies met <strong>← →</strong> en neem een hap met <strong>SPATIE</strong>. Luister goed naar je ouders.",

    drawBackground(ctx, t) {
      drawDining(ctx);
      drawFamily(ctx, t, {});
      drawTable(ctx);
      for (const f of FOODS) drawFood(ctx, f.id, f.x, TABLE_Y - 4, 1);
    },

    start(api) {
      this.api = api;
      this.bites = { broccoli: 0, biefstuk: 0 };
      this.selected = 0;
      this.phase = "eat";
      this.timer = 0;
      this.chew = 0;
      this.lineIndex = 0;
      this.lineTimer = 2600;
      this.rects = FOODS.map((f) => ({ x: f.x - 45, y: TABLE_Y - 50, w: 90, h: 64 }));
    },

    onDirection(dx) {
      if (this.phase !== "eat" || !dx) return;
      this.selected = G.clamp(this.selected + dx, 0, FOODS.length - 1);
    },

    onAction() {
      this.eat(this.selected);
    },

    onPointer(x, y) {
      const i = this.rects.findIndex((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
      if (i >= 0) {
        this.selected = i;
        this.eat(i);
      }
    },

    eat(i) {
      if (this.phase !== "eat") return;
      const food = FOODS[i];
      if (food.id === "chocola") {
        this.phase = "spank";
        this.timer = SPANK_MS;
        return;
      }
      if (this.bites[food.id] >= BITES) return;
      this.bites[food.id]++;
      this.chew = 350;
      if (this.bites.broccoli >= BITES && this.bites.biefstuk >= BITES) {
        this.phase = "praise";
        this.timer = PRAISE_MS;
      }
    },

    update(dt) {
      this.chew = Math.max(0, this.chew - dt);
      this.lineTimer -= dt;
      if (this.lineTimer <= 0) {
        this.lineIndex = (this.lineIndex + 1) % MOM_LINES.length;
        this.lineTimer = 2600;
      }
      if (this.phase === "eat") return;
      this.timer -= dt;
      if (this.timer > 0) return;
      if (this.phase === "praise") this.api.complete();
      else this.api.fail("Je at chocola in plaats van je broccoli en biefstuk: billenkoek!");
    },

    renderSpank(ctx, t) {
      // third-person: the camera pulls back to show the punishment
      G.drawRoom(ctx, "#f6dcc0", "#a8744a", 290);
      G.drawWindow(ctx, 60, 60, 100, 80);
      const { dad } = G.parentLooks();
      const s = 1.8;
      const px = 230;
      const py = 410;
      G.drawChair(ctx, px + 12, py, 0, 2.2);
      G.drawKid(ctx, px, py, s, dad, { adult: true, pose: "sit", t, armAngle: -2.6, angry: true });
      G.drawKid(ctx, px + 28, py - 50, 1.3, G.playerKidLook(), { pose: "down", t, crying: true });

      // the spanking arm is drawn over the child
      const swing = (Math.sin(t * 12) + 1) / 2;
      const a = -1.3 + swing * 2;
      const sx = px + 2 * s;
      const sy = py - 52 * s;
      const hx = sx + Math.cos(a) * 20 * s;
      const hy = sy + Math.sin(a) * 20 * s;
      ctx.strokeStyle = dad.skin;
      ctx.lineWidth = 6 * s;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(hx, hy);
      ctx.stroke();
      ctx.fillStyle = dad.shade;
      ctx.beginPath();
      ctx.arc(hx, hy, 3.5 * s, 0, Math.PI * 2);
      ctx.fill();

      if (swing > 0.75) {
        ctx.fillStyle = "#ff4d4d";
        ctx.font = "bold 40px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("PETS!", px + 110, py - 150);
      }
      G.drawBanner(ctx, "Billenkoek!", "#ff6b6b", 60);
    },

    render(ctx, t) {
      if (this.phase === "spank") {
        this.renderSpank(ctx, t);
        return;
      }
      drawDining(ctx);
      drawFamily(ctx, t, { armAngle: this.chew > 0 ? -1.4 : undefined });
      drawTable(ctx);
      FOODS.forEach((f, i) => {
        const left = f.id === "chocola" ? 1 : 1 - this.bites[f.id] / BITES;
        drawFood(ctx, f.id, f.x, TABLE_Y - 4, left);
        if (this.phase === "eat" && i === this.selected) {
          ctx.strokeStyle = `rgba(255, 224, 102, ${0.7 + Math.sin(t * 6) * 0.3})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(this.rects[i].x, this.rects[i].y, this.rects[i].w, this.rects[i].h, 12);
          ctx.stroke();
        }
        ctx.fillStyle = "#fff";
        ctx.font = "bold 13px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        const done = f.id !== "chocola" && this.bites[f.id] >= BITES;
        ctx.fillText(done ? "Op! ✓" : f.label, f.x, TABLE_Y + 40);
      });

      if (this.phase === "praise") {
        G.drawBubble(ctx, 110, 150, "Goed zo! Nu mag je een toetje.");
      } else {
        G.drawBubble(ctx, 110, 150, MOM_LINES[this.lineIndex]);
      }
    },

    hud() {
      return `Broccoli: ${this.bites.broccoli}/${BITES} · Biefstuk: ${this.bites.biefstuk}/${BITES}`;
    },
  };
})();
