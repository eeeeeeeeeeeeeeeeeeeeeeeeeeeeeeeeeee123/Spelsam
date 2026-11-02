(() => {
  const { W, H } = G;
  const R = 12;
  const SPEED = 150;
  const HP = 5;
  const INVULN_MS = 700;
  const FIRE_MS = 300;
  const BULLET_SPEED = 620;
  const FOE_HP = 18;
  const FOE_SPEED = 135;
  const KNIFE_SPEED = 290;
  const SMOKE_MS = 900;
  const INTRO_MS = 2800;
  const COUNTERS = [
    { x: 90, y: 90, w: 120, h: 26 }, { x: 330, y: 90, w: 120, h: 26 },
    { x: 60, y: 210, w: 26, h: 90 }, { x: 454, y: 210, w: 26, h: 90 },
    { x: 200, y: 330, w: 140, h: 26 }, { x: 240, y: 200, w: 60, h: 50 },
  ];
  const FOE_LOOK = { ...G.SKINS.wit, hair: "kort", hairColor: "#d8d8d8", eyes: G.EYES.blauw, gender: "jongen", shirt: "#141414", pants: "#141414" };

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const inCounter = (x, y) => COUNTERS.some((c) => x > c.x && x < c.x + c.w && y > c.y && y < c.y + c.h);
  function collide(o) {
    for (const c of COUNTERS) {
      const cx = G.clamp(o.x, c.x, c.x + c.w), cy = G.clamp(o.y, c.y, c.y + c.h);
      const d = Math.hypot(o.x - cx, o.y - cy);
      if (d < R && d > 0) {
        o.x = cx + ((o.x - cx) / d) * R;
        o.y = cy + ((o.y - cy) / d) * R;
      }
    }
    o.x = G.clamp(o.x, R + 16, W - R - 16);
    o.y = G.clamp(o.y, R + 46, H - R - 10);
  }
  function freeSpot() {
    for (let i = 0; i < 30; i++) {
      const s = { x: 40 + Math.random() * (W - 80), y: 70 + Math.random() * (H - 100) };
      if (!COUNTERS.some((c) => s.x > c.x - 16 && s.x < c.x + c.w + 16 && s.y > c.y - 16 && s.y < c.y + c.h + 16)) return s;
    }
    return { x: W / 2, y: H - 40 };
  }

  function drawKitchen(ctx, t) {
    ctx.fillStyle = "#d8d8d0";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#c8c8c0";
    for (let x = 0; x < W; x += 30) for (let y = 40; y < H; y += 30) if ((x + y) % 60 === 0) ctx.fillRect(x, y, 30, 30);
    ctx.fillStyle = "#5a5a5a";
    ctx.fillRect(0, 0, W, 40);
    ctx.fillStyle = "#e8e8e8";
    ctx.font = "bold 12px Segoe UI, Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("HOTEL YANGGAKDO — KEUKEN", W / 2, 26);
    for (const c of COUNTERS) {
      ctx.fillStyle = "#9aa0a8";
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.fillStyle = "#b8bec6";
      ctx.fillRect(c.x + 3, c.y + 3, c.w - 6, c.h - 6);
    }
    // pans and steam on the counters
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    for (const c of COUNTERS.slice(0, 2)) {
      ctx.beginPath();
      ctx.arc(c.x + 30, c.y - 8 - Math.sin(t * 4) * 3, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  G.CAREER_LEVELS.spion[8] = {
    title: "Level 8 — Duel: de Huurmoordenaar (28 jaar)",
    intro:
      "Na je ontsnapping ga je achter een <strong>geheim document</strong> aan in een hotel in Pyongyang. Maar je bent niet de enige...<br>" +
      "Een <strong>huurmoordenaar</strong> wil het ook. Hij gooit <strong>messen</strong> en verdwijnt in een <strong>rookbom</strong> (let op het rode <strong>!</strong> waar hij weer opduikt).<br>" +
      "Lopen met <strong>pijltjes / WASD</strong>, mik met de <strong>muis</strong>, schiet met <strong>klik</strong> / <strong>SPATIE</strong>. De keukenbanken houden alles tegen.",

    drawBackground(ctx, t) {
      drawKitchen(ctx, t);
    },

    start(api) {
      this.api = api;
      this.p = { x: 60, y: H - 50, hp: HP, invuln: 0, facing: 1, moving: false };
      this.f = { x: W - 70, y: 70, hp: FOE_HP, state: "talk", timer: INTRO_MS, flash: 0, facing: -1, goal: null, cycle: 0, vis: 1 };
      this.aim = { x: W - 70, y: 70 };
      this.fire = 0;
      this.bullets = [];
      this.knives = [];
      this.popups = [];
      this.flash = 0;
      this.over = false;
      this.won = 0;
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 800 });
    },

    doFire() {
      if (this.over || this.won || this.fire > 0 || this.f.state === "talk") return;
      this.fire = FIRE_MS;
      const p = this.p;
      const d = dist(p, this.aim) || 1;
      this.bullets.push({ x: p.x, y: p.y - 10, vx: ((this.aim.x - p.x) / d) * BULLET_SPEED, vy: ((this.aim.y - p.y) / d) * BULLET_SPEED });
    },

    onAction() { this.doFire(); },
    onPointer(x, y) { this.aim = { x, y }; this.doFire(); },
    onPointerMove(x, y) { this.aim = { x, y }; },

    hurt() {
      const p = this.p;
      if (p.invuln > 0 || this.over) return;
      p.hp--;
      p.invuln = INVULN_MS;
      this.flash = 300;
      this.popup("-1 ❤", p.x, p.y - 40, "#ff6b6b");
      if (p.hp <= 0) {
        this.over = true;
        this.api.fail("De huurmoordenaar was je te snel af.");
      }
    },

    throwKnives() {
      const f = this.f, p = this.p;
      const base = Math.atan2(p.y - f.y, p.x - f.x);
      for (const off of [-0.22, 0, 0.22]) this.knives.push({ x: f.x, y: f.y - 10, vx: Math.cos(base + off) * KNIFE_SPEED, vy: Math.sin(base + off) * KNIFE_SPEED, rot: 0 });
    },

    update(dt) {
      if (this.over) return;
      const s = dt / 1000;
      const p = this.p, f = this.f;
      this.fire = Math.max(0, this.fire - dt);
      this.flash = Math.max(0, this.flash - dt);
      p.invuln = Math.max(0, p.invuln - dt);
      f.flash = Math.max(0, f.flash - dt);
      this.popups = G.updatePopups(this.popups, dt);

      if (this.won) {
        this.won -= dt;
        if (this.won <= 0) {
          this.over = true;
          this.api.complete();
        }
        return;
      }
      if (G.held.action) this.doFire();

      const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
      const my = (G.held.down ? 1 : 0) - (G.held.up ? 1 : 0);
      p.moving = !!(mx || my) && f.state !== "talk";
      if (p.moving) {
        const len = Math.hypot(mx, my);
        p.x += (mx / len) * SPEED * s;
        p.y += (my / len) * SPEED * s;
        collide(p);
      }
      p.facing = this.aim.x >= p.x ? 1 : -1;
      f.facing = p.x >= f.x ? 1 : -1;

      // assassin: dash to a spot, throw knives, every third round vanish in smoke
      f.timer -= dt;
      if (f.state === "talk") {
        if (f.timer <= 0) {
          f.state = "dash";
          f.goal = freeSpot();
          f.timer = 1500;
        }
      } else if (f.state === "dash") {
        const d = dist(f, f.goal);
        if (d > 4) {
          f.x += ((f.goal.x - f.x) / d) * FOE_SPEED * s;
          f.y += ((f.goal.y - f.y) / d) * FOE_SPEED * s;
          collide(f);
        }
        if (d < 6 || f.timer <= 0) {
          f.state = "windup";
          f.timer = 550;
        }
      } else if (f.state === "windup" && f.timer <= 0) {
        this.throwKnives();
        f.cycle++;
        if (f.cycle % 3 === 0) {
          f.state = "smoke";
          f.timer = SMOKE_MS;
          f.smokeAt = { x: f.x, y: f.y };
          // reappear behind you
          const a = Math.atan2(p.y - f.y, p.x - f.x);
          const spot = { x: G.clamp(p.x + Math.cos(a) * 90, 40, W - 40), y: G.clamp(p.y + Math.sin(a) * 90, 70, H - 30) };
          f.reappear = inCounter(spot.x, spot.y) ? freeSpot() : spot;
        } else {
          f.state = "dash";
          f.goal = freeSpot();
          f.timer = 1500;
        }
      } else if (f.state === "smoke") {
        f.vis = Math.max(0, f.timer / SMOKE_MS);
        if (f.timer <= 0) {
          f.x = f.reappear.x;
          f.y = f.reappear.y;
          f.vis = 1;
          f.state = "windup";
          f.timer = 650;
          f.cycle++;
        }
      }

      for (const k of this.knives) {
        k.x += k.vx * s;
        k.y += k.vy * s;
        k.rot += 18 * s;
        if (k.x < 0 || k.x > W || k.y < 40 || k.y > H || inCounter(k.x, k.y)) k.done = true;
        else if (dist(k, { x: p.x, y: p.y - 10 }) < R + 3) {
          k.done = true;
          this.hurt();
        }
      }
      this.knives = this.knives.filter((k) => !k.done);
      if (this.over) return;

      for (const b of this.bullets) {
        b.x += b.vx * s;
        b.y += b.vy * s;
        if (b.x < 0 || b.x > W || b.y < 40 || b.y > H || inCounter(b.x, b.y)) b.done = true;
        else if (f.state !== "smoke" && dist(b, { x: f.x, y: f.y - 10 }) < R + 4) {
          b.done = true;
          f.hp--;
          f.flash = 90;
          if (f.hp <= 0) {
            this.won = 3000;
            this.knives = [];
          }
        }
      }
      this.bullets = this.bullets.filter((b) => !b.done);
    },

    render(ctx, t) {
      drawKitchen(ctx, t);
      const p = this.p, f = this.f;

      if (f.state === "smoke") {
        ctx.fillStyle = `rgba(90,90,90,${0.6 * f.vis + 0.2})`;
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.arc(f.smokeAt.x + Math.cos(i * 1.3 + t) * 12, f.smokeAt.y - 10 + Math.sin(i * 1.7 + t) * 10, 16 + (1 - f.vis) * 14, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "#ff3030";
        ctx.font = "bold 22px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("!", f.reappear.x, f.reappear.y - 24);
      }
      if (f.state !== "smoke") {
        const hand = G.drawKid(ctx, f.x, f.y + 14, 0.5, FOE_LOOK, { adult: true, t, facing: f.facing, pose: this.won ? "down" : f.state === "dash" ? "walk" : "stand", flash: f.flash > 0, dizzy: !!this.won, angry: !this.won, armAngle: f.state === "windup" ? -1.4 : -0.1 });
        if (!this.won) {
          ctx.fillStyle = "#c02020";
          ctx.fillRect(f.x - 1, f.y - 16, 3, 10);
          if (f.state === "windup") {
            ctx.fillStyle = "#d8dce0";
            ctx.fillRect(hand.x - 2, hand.y - 10, 4, 10);
          }
        }
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(f.x - 18, f.y - 38, 36, 4);
        ctx.fillStyle = "#c0c0c0";
        ctx.fillRect(f.x - 18, f.y - 38, 36 * Math.max(0, f.hp / FOE_HP), 4);
      }

      const ang = Math.atan2(this.aim.y - p.y, this.aim.x - p.x);
      const hand = G.drawKid(ctx, p.x, p.y + 14, 0.5, G.spyLook(), { adult: true, t, facing: p.facing, pose: p.moving ? "walk" : "stand", flash: p.invuln > 0, armAngle: G.clamp(p.facing === 1 ? ang : Math.PI - ang, -1.4, 1) });
      G.drawShades(ctx, p.x, p.y + 14, 0.5, p.facing);
      G.drawPistol(ctx, hand.x, hand.y, ang, 0.7);

      ctx.fillStyle = "#333";
      for (const b of this.bullets) ctx.fillRect(b.x - 2, b.y - 1, 4, 2);
      for (const k of this.knives) {
        ctx.save();
        ctx.translate(k.x, k.y);
        ctx.rotate(k.rot);
        ctx.fillStyle = "#c8ccd0";
        ctx.fillRect(-7, -1.5, 10, 3);
        ctx.fillStyle = "#3a2a1a";
        ctx.fillRect(3, -2, 5, 4);
        ctx.restore();
      }

      ctx.strokeStyle = "rgba(0,0,0,0.7)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.aim.x, this.aim.y, 8, 0, Math.PI * 2);
      ctx.stroke();

      if (f.state === "talk") {
        const first = f.timer > INTRO_MS / 2;
        G.drawBubble(ctx, first ? f.x : p.x, (first ? f.y : p.y) - 46, first ? "Dat document is van mij, spion." : "Droom maar lekker verder.");
      }
      if (this.won) {
        G.drawBanner(ctx, "Huurmoordenaar verslagen!", "#6ee07a", 100);
        if (this.won < 2000) G.drawBubble(ctx, p.x, p.y - 46, "Het document is van mij.");
      }
      if (this.flash > 0) {
        ctx.fillStyle = `rgba(200,40,40,${0.3 * (this.flash / 300)})`;
        ctx.fillRect(0, 0, W, H);
      }

      ctx.fillStyle = "#ff6b6b";
      ctx.font = "18px Segoe UI, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("❤".repeat(Math.max(0, p.hp)), 12, 64);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return `Duel · huurmoordenaar ${Math.max(0, this.f.hp)}/${FOE_HP}`;
    },
  };
})();
