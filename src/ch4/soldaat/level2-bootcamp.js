(() => {
  const { W, H } = G;
  const GROUND = 370;
  const RUN = 180;
  const CRAWL = 70;
  const MUD = 0.45;
  const JUMP_V = 430;
  const GRAVITY = 1300;
  const CLIMB_MS = 650;
  const STUMBLE_MS = 800;
  const TIME_MS = 45000;
  const CAM_X = 140;
  // the obstacle course, left to right
  const COURSE = [
    { type: "hurdle", x: 420 },
    { type: "hurdle", x: 620 },
    { type: "wire", x: 820, w: 160 },
    { type: "wall", x: 1120 },
    { type: "mud", x: 1300, w: 140 },
    { type: "hurdle", x: 1520 },
    { type: "hurdle", x: 1640 },
    { type: "wire", x: 1820, w: 200 },
    { type: "wall", x: 2140 },
    { type: "mud", x: 2300, w: 120 },
    { type: "hurdle", x: 2480 },
    { type: "wire", x: 2620, w: 140 },
    { type: "wall", x: 2880 },
  ];
  const FINISH = 3100;
  const SHOUTS = ["Sneller, rekruut!", "Mijn oma loopt harder!", "Doorlopen! DOORLOPEN!", "Dit is geen wandeling!", "Benen bewegen, soldaat!"];
  const STUMBLE_SHOUTS = ["Opstaan! NU!", "Ben je aan het slapen?!", "Twintig push-ups straks!"];
  const SARGE = { ...G.SKINS.zwart, hair: "kort", hairColor: "#1a1212", eyes: G.EYES.bruin, gender: "jongen", shirt: "#4a5a2a", pants: "#3a3a28" };

  function drawCourse(ctx, cam, t) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#8ac0e8");
    g.addColorStop(1, "#d8e8c0");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // distant barracks
    ctx.fillStyle = "#9aa080";
    for (let i = 0; i < 8; i++) {
      const x = ((i * 260 - cam * 0.3) % 2080 + 2080) % 2080 - 200;
      ctx.fillRect(x, GROUND - 90, 150, 90);
      ctx.fillStyle = "#7a8060";
      ctx.fillRect(x - 6, GROUND - 100, 162, 12);
      ctx.fillStyle = "#9aa080";
    }
    ctx.fillStyle = "#8a7a50";
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = "#6a5a38";
    ctx.fillRect(0, GROUND, W, 5);

    for (const o of COURSE) {
      const x = o.x - cam;
      if (x > W + 220 || x + (o.w || 30) < -20) continue;
      if (o.type === "hurdle") {
        ctx.fillStyle = "#c04030";
        ctx.fillRect(x, GROUND - 34, 6, 34);
        ctx.fillRect(x + 20, GROUND - 34, 6, 34);
        ctx.fillStyle = "#f0f0f0";
        ctx.fillRect(x - 2, GROUND - 36, 30, 6);
      } else if (o.type === "wire") {
        ctx.strokeStyle = "#555";
        ctx.lineWidth = 2;
        for (let k = 0; k <= o.w; k += 40) {
          ctx.beginPath();
          ctx.moveTo(x + k, GROUND);
          ctx.lineTo(x + k, GROUND - 32);
          ctx.stroke();
        }
        ctx.strokeStyle = "#aaa";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let k = 0; k <= o.w; k += 6) ctx.lineTo(x + k, GROUND - 30 + Math.sin(k * 0.6) * 3);
        ctx.stroke();
        ctx.fillStyle = "#ccc";
        for (let k = 0; k <= o.w; k += 12) ctx.fillRect(x + k, GROUND - 32, 2, 4);
      } else if (o.type === "wall") {
        ctx.fillStyle = "#7a5a3a";
        ctx.fillRect(x, GROUND - 80, 22, 80);
        ctx.strokeStyle = "#5a3a1a";
        for (let k = 0; k < 80; k += 16) {
          ctx.beginPath();
          ctx.moveTo(x, GROUND - k);
          ctx.lineTo(x + 22, GROUND - k);
          ctx.stroke();
        }
      } else if (o.type === "mud") {
        ctx.fillStyle = "#4a3420";
        ctx.beginPath();
        ctx.ellipse(x + o.w / 2, GROUND + 4, o.w / 2, 10, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // finish flag
    const fx = FINISH - cam;
    if (fx < W + 40) {
      ctx.fillStyle = "#ddd";
      ctx.fillRect(fx, GROUND - 120, 4, 120);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
        ctx.fillStyle = (r + c) % 2 ? "#111" : "#fff";
        ctx.fillRect(fx + 4 + c * 8, GROUND - 120 + r * 8 + Math.sin(t * 6 + c) * 2, 8, 8);
      }
    }
  }

  G.CAREER_LEVELS.soldaat[2] = {
    title: "Level 2 — Bootcamp (22 jaar)",
    intro:
      "Welkom in het leger, rekruut! De drill sergeant jaagt je over de <strong>stormbaan</strong>.<br>" +
      "<strong>→</strong> rennen, <strong>↑</strong> springen over hekjes, <strong>↓</strong> kruipen onder prikkeldraad, <strong>↑</strong> vasthouden tegen een muur = klimmen. Modder maakt je traag.<br>" +
      "Haal de finish binnen <strong>45 seconden</strong>!",

    drawBackground(ctx, t) {
      drawCourse(ctx, 0, t);
      G.drawKid(ctx, CAM_X, GROUND, 0.9, G.soldierLook(), { adult: true, t });
      G.drawHelmet(ctx, CAM_X, GROUND, 0.9);
    },

    start(api) {
      this.api = api;
      this.p = { x: 60, y: 0, vy: 0, crawl: false, climb: 0, stumble: 0, climbWall: null };
      this.course = COURSE;
      this.time = TIME_MS;
      this.shout = { text: "Lopen, rekruut!", life: 2000 };
      this.shoutTimer = 4000;
      this.over = false;
      this.cleared = new Set();
    },

    say(text) {
      this.shout = { text, life: 1800 };
    },

    stumble() {
      this.p.stumble = STUMBLE_MS;
      this.say(G.pick(STUMBLE_SHOUTS));
    },

    update(dt) {
      if (this.over) return;
      const s = dt / 1000;
      const p = this.p;
      this.time -= dt;
      this.shout.life -= dt;
      this.shoutTimer -= dt;
      if (this.shoutTimer <= 0) {
        this.shoutTimer = 3500 + Math.random() * 2000;
        this.say(G.pick(SHOUTS));
      }
      if (this.time <= 0) {
        this.over = true;
        this.api.fail("Te langzaam! De sergeant stuurt je terug naar de start.");
        return;
      }

      if (p.climb > 0) {
        p.climb -= dt;
        if (p.climb <= 0) p.x = p.climbWall.x + 30;
        return;
      }
      if (p.stumble > 0) {
        p.stumble -= dt;
        return;
      }

      const grounded = p.y >= 0;
      const inWire = COURSE.some((o) => o.type === "wire" && p.x > o.x && p.x < o.x + o.w);
      // under the wire you can only crawl
      p.crawl = grounded && (G.held.down || inWire);
      let speed = G.held.right ? (p.crawl ? CRAWL : RUN) : 0;
      if (G.held.left) speed = -RUN * 0.5;
      const inMud = COURSE.some((o) => o.type === "mud" && p.x > o.x && p.x < o.x + o.w);
      if (inMud && grounded) speed *= MUD;

      if (G.held.up && grounded && !p.crawl) {
        const wall = COURSE.find((o) => o.type === "wall" && o.x - p.x >= 0 && o.x - p.x < 26);
        if (wall) {
          p.climb = CLIMB_MS;
          p.climbWall = wall;
          return;
        }
        p.vy = -JUMP_V;
      }
      p.vy += GRAVITY * s;
      p.y = Math.min(0, p.y + p.vy * s);
      if (p.y >= 0) p.vy = 0;

      const nx = Math.max(20, p.x + speed * s);
      for (const o of COURSE) {
        // crossing the front edge of an obstacle
        const edge = o.type === "hurdle" ? o.x - 8 : o.type === "wire" ? o.x : o.type === "wall" ? o.x - 10 : null;
        if (edge === null || !(p.x <= edge && nx > edge)) continue;
        if (o.type === "hurdle" && -p.y < 36) {
          p.x = edge - 4;
          this.stumble();
          return;
        }
        if (o.type === "wire" && !p.crawl) {
          p.x = edge - 14;
          this.stumble();
          return;
        }
        if (o.type === "wall") {
          p.x = edge;
          return;
        }
      }
      p.x = nx;

      if (p.x >= FINISH) {
        this.over = true;
        this.api.complete();
      }
    },

    render(ctx, t) {
      const p = this.p;
      const cam = Math.max(0, p.x - CAM_X);
      drawCourse(ctx, cam, t);
      const sx = p.x - cam;

      // drill sergeant chasing behind
      const sgX = Math.max(30, sx - 110);
      G.drawKid(ctx, sgX, GROUND, 0.95, SARGE, { adult: true, t, pose: "walk", angry: true, armAngle: -1.2 });
      ctx.fillStyle = "#7a5a2a";
      ctx.beginPath();
      ctx.ellipse(sgX + 2, GROUND - 92, 20, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(sgX - 8, GROUND - 104, 20, 12);
      if (this.shout.life > 0) G.drawBubble(ctx, sgX + 10, GROUND - 120, this.shout.text);

      let wy = GROUND + p.y;
      if (p.climb > 0) {
        const k = 1 - p.climb / CLIMB_MS;
        const wx = p.climbWall.x - cam;
        G.drawKid(ctx, wx - 6 + k * 30, GROUND - Math.sin(k * Math.PI) * 90 - k * 0, 0.9, G.soldierLook(), { adult: true, t, armAngle: -1.5 });
        G.drawHelmet(ctx, wx - 6 + k * 30, GROUND - Math.sin(k * Math.PI) * 90, 0.9);
      } else if (p.crawl) {
        G.drawKid(ctx, sx, wy, 0.9, G.soldierLook(), { adult: true, t: G.held.right ? t : 0, pose: "crawl" });
      } else {
        G.drawKid(ctx, sx, wy, 0.9, G.soldierLook(), { adult: true, t, pose: G.held.right && p.y >= 0 ? "walk" : "stand", dizzy: p.stumble > 0 });
        G.drawHelmet(ctx, sx, wy, 0.9);
      }

      // progress + timer
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(16, 16, W - 32, 10);
      ctx.fillStyle = "#6ee07a";
      ctx.fillRect(16, 16, (W - 32) * Math.min(1, p.x / FINISH), 10);
      ctx.fillStyle = this.time < 10000 ? "#ff5050" : "#fff";
      ctx.font = "bold 15px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`${Math.ceil(this.time / 1000)}s`, W - 16, 46);
    },

    hud() {
      return `Stormbaan · nog ${Math.ceil(this.time / 1000)}s`;
    },
  };
})();
