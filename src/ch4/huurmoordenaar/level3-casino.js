(() => {
  const { W, H } = G;
  const R = 10;
  const SPEED = 100;
  const VIEW_LEN = 115;
  const VIEW_ARC = 0.55;
  const ENFORCER_R = 60; // the bodyguard sees through your disguise up close
  const ALERT_UP = 65;
  const ALERT_DOWN = 20;
  const TAKEDOWN_R = 30;
  const STAFF = { x: 14, y: 320, w: 150, h: 116 };
  const VIP = { x: 350, y: 20, w: 176, h: 160 };
  const WALLS = [
    // staff room (door on the right side)
    { x: 14, y: 312, w: 150, h: 8 }, { x: 160, y: 312, w: 8, h: 30 }, { x: 160, y: 410, w: 8, h: 26 },
    // VIP room (door at the bottom)
    { x: 342, y: 20, w: 8, h: 168 }, { x: 342, y: 180, w: 40, h: 8 }, { x: 452, y: 180, w: 74, h: 8 },
  ];
  const UNIFORM = { x: 60, y: 400 };
  const EXIT = { x: 250, y: H - 20, w: 40 };
  const TABLES = [{ x: 120, y: 110 }, { x: 240, y: 110 }, { x: 260, y: 250 }, { x: 420, y: 300 }];
  const TARGET_LOOK = { ...G.SKINS.wit, hair: "kort", hairColor: "#f0f0f0", eyes: G.EYES.bruin, gender: "jongen", shirt: "#f0e8d0", pants: "#3a2a1a" };
  const GUEST_SHIRTS = ["#c04060", "#4060c0", "#40a060", "#c0a040"];
  let guestLooks = null;
  const GUARD_LOOK = () => ({ ...G.ENEMY_LOOK(), shirt: "#1a1a2a", pants: "#1a1a2a" });

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const inRect = (p, r) => p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h;
  const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

  G.CAREER_LEVELS.huurmoordenaar[3] = {
    title: "Level 3 — Casino Royale (23 jaar)",
    intro:
      "Je eerste contract: de corrupte <strong>casinobaas</strong> in zijn VIP-kamer (rechtsboven).<br>" +
      "Pak eerst het <strong>croupier-uniform</strong> in de personeelsruimte (linksonder). Zonder uniform mag je niet in de personeelsruimte of de VIP-kamer gezien worden.<br>" +
      "De <strong>lijfwacht</strong> naast de baas ziet van dichtbij door je vermomming. Sluip achter de baas als de lijfwacht wegkijkt en druk <strong>SPATIE</strong>. Ontsnap daarna via de <strong>uitgang</strong> onderaan.",

    drawBackground(ctx, t) {
      this.drawFloor(ctx, t);
    },

    start(api) {
      this.api = api;
      this.p = { x: 270, y: 420, facing: 1, moving: false };
      this.disguise = false;
      this.targetDown = false;
      this.alert = 0;
      this.time = 0;
      this.guards = [
        { x: 90, y: 360, route: [{ x: 50, y: 350 }, { x: 140, y: 350 }, { x: 140, y: 420 }], wp: 1, angle: 0, wait: 0, look: GUARD_LOOK() },
        { x: 417, y: 214, route: [{ x: 417, y: 214 }], wp: 0, angle: Math.PI / 2, wait: 0, look: GUARD_LOOK(), post: true },
      ];
      this.target = { x: 498, y: 66, down: false };
      this.enforcer = { x: 462, y: 132, angle: 0, turn: 1, pause: 0, look: { ...GUARD_LOOK(), hair: "stekels" } };
      this.popups = [];
      this.over = false;
      this.won = 0;
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 1000 });
    },

    blocked(x, y, r = R) {
      return WALLS.some((w) => x > w.x - r && x < w.x + w.w + r && y > w.y - r && y < w.y + w.h + r);
    },
    sight(a, b) {
      const n = Math.ceil(dist(a, b) / 6);
      for (let i = 1; i < n; i++) if (this.blocked(a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n, 0)) return false;
      return true;
    },
    looksAt(g, p, len = VIEW_LEN) {
      return dist(g, p) < len && Math.abs(angDiff(Math.atan2(p.y - g.y, p.x - g.x), g.angle)) < VIEW_ARC && this.sight(g, p);
    },
    // where you are not supposed to be, given what you wear
    trespassing() {
      const p = this.p;
      return (inRect(p, STAFF) || inRect(p, VIP)) && !this.disguise;
    },

    onAction() {
      if (this.over || this.won) return;
      const p = this.p;
      if (!this.targetDown && dist(p, this.target) < TAKEDOWN_R) {
        if (this.looksAt(this.enforcer, p, VIEW_LEN + 40)) {
          this.alert = Math.min(100, this.alert + 60);
          this.popup("De lijfwacht zag het!", this.enforcer.x, this.enforcer.y - 30, "#ff6b6b");
        } else {
          this.targetDown = true;
          this.target.down = true;
          this.popup("Contract voltooid! Nu wegwezen.", this.target.x - 60, this.target.y - 30, "#6ee07a");
        }
      }
    },

    update(dt) {
      if (this.over) return;
      const s = dt / 1000;
      this.time += dt;
      this.popups = G.updatePopups(this.popups, dt);
      const p = this.p;
      if (this.won) {
        this.won -= dt;
        if (this.won <= 0) {
          this.over = true;
          this.api.complete();
        }
        return;
      }

      const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
      const my = (G.held.down ? 1 : 0) - (G.held.up ? 1 : 0);
      p.moving = !!(mx || my);
      if (p.moving) {
        const len = Math.hypot(mx, my);
        const nx = G.clamp(p.x + (mx / len) * SPEED * s, 22, W - 22);
        const ny = G.clamp(p.y + (my / len) * SPEED * s, 30, H - 12);
        if (!this.blocked(nx, p.y)) p.x = nx;
        if (!this.blocked(p.x, ny)) p.y = ny;
        if (mx) p.facing = mx;
      }
      if (!this.disguise && dist(p, UNIFORM) < 20) {
        this.disguise = true;
        this.popup("Croupier-uniform aan!", p.x, p.y - 30, "#6ee07a");
      }
      if (this.targetDown && p.y > H - 22 && p.x > EXIT.x && p.x < EXIT.x + EXIT.w) {
        this.won = 1800;
        return;
      }

      for (const g of this.guards) {
        if (g.post) {
          g.angle = Math.PI / 2 + Math.sin(this.time / 1100) * 0.9;
          continue;
        }
        if (g.wait > 0) {
          g.wait -= dt;
          continue;
        }
        const wp = g.route[g.wp];
        const d = dist(g, wp);
        if (d < 3) {
          g.wp = (g.wp + 1) % g.route.length;
          g.wait = 900;
        } else {
          g.angle = Math.atan2(wp.y - g.y, wp.x - g.x);
          g.x += ((wp.x - g.x) / d) * 42 * s;
          g.y += ((wp.y - g.y) / d) * 42 * s;
        }
      }
      // the bodyguard sweeps the room, pausing now and then
      const e = this.enforcer;
      if (e.pause > 0) e.pause -= dt;
      else {
        e.angle += e.turn * 0.9 * s;
        if (Math.random() < 0.006) {
          e.pause = 1200;
          if (Math.random() < 0.5) e.turn = -e.turn;
        }
      }

      let seen = false;
      if (this.trespassing()) for (const g of this.guards) if (this.looksAt(g, p)) seen = true;
      if (inRect(p, VIP)) {
        if (!this.disguise && this.looksAt(e, p)) seen = true;
        if (this.disguise && dist(e, p) < ENFORCER_R && this.looksAt(e, p)) seen = true;
      }
      // after the hit, the bodyguard is on edge: he spots you from further away
      if (this.targetDown && inRect(p, VIP) && dist(e, p) < ENFORCER_R * 1.3 && this.looksAt(e, p)) seen = true;
      this.seen = seen;
      this.alert = G.clamp(this.alert + (seen ? ALERT_UP : -ALERT_DOWN) * s, 0, 100);
      if (this.alert >= 100) {
        this.over = true;
        this.api.fail("De beveiliging heeft je door. Je wordt het casino uit gesleept.");
      }
    },

    drawFloor(ctx, t) {
      ctx.fillStyle = "#4a1a24";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(255,210,74,0.06)";
      for (let x = 0; x < W; x += 40) for (let y = 0; y < H; y += 40) if ((x + y) % 80 === 0) ctx.fillRect(x, y, 40, 40);
      ctx.fillStyle = "#2a2a34";
      ctx.fillRect(STAFF.x, STAFF.y, STAFF.w, STAFF.h);
      ctx.fillStyle = "#2a1a2a";
      ctx.fillRect(VIP.x, VIP.y, VIP.w, VIP.h);
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = "bold 10px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("PERSONEEL", STAFF.x + STAFF.w / 2, STAFF.y + 22);
      ctx.fillText("VIP", VIP.x + VIP.w / 2, VIP.y + 16);
      for (const tb of TABLES) {
        ctx.fillStyle = "#1a6a3a";
        ctx.beginPath();
        ctx.ellipse(tb.x, tb.y, 40, 22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#6a4a2a";
        ctx.lineWidth = 4;
        ctx.stroke();
      }
      // VIP card table
      ctx.fillStyle = "#1a6a3a";
      ctx.fillRect(482, 30, 40, 70);
      // slot machines
      for (let k = 0; k < 4; k++) {
        ctx.fillStyle = "#8a6a2a";
        ctx.fillRect(40 + k * 34, 200, 24, 34);
        ctx.fillStyle = Math.floor((t || 0) * 4 + k) % 2 ? "#ffd24a" : "#ff6060";
        ctx.fillRect(44 + k * 34, 206, 16, 8);
      }
      for (const w of WALLS) {
        ctx.fillStyle = "#c8a050";
        ctx.fillRect(w.x, w.y, w.w, w.h);
      }
      ctx.fillStyle = "#2a8a4a";
      ctx.fillRect(EXIT.x, H - 8, EXIT.w, 8);
    },

    render(ctx, t) {
      this.drawFloor(ctx, t);
      const p = this.p;
      if (!this.disguise) {
        ctx.fillStyle = "#f0f0f0";
        ctx.fillRect(UNIFORM.x - 10, UNIFORM.y - 8, 20, 14);
        ctx.fillStyle = "#c02020";
        ctx.fillRect(UNIFORM.x - 2, UNIFORM.y - 8, 4, 8);
        ctx.fillStyle = "#ffd24a";
        ctx.font = "bold 9px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("UNIFORM", UNIFORM.x, UNIFORM.y - 14);
      }

      const cones = this.guards.concat([this.enforcer]);
      for (const g of cones) {
        ctx.fillStyle = g === this.enforcer ? "rgba(255,80,80,0.16)" : "rgba(255,200,80,0.13)";
        ctx.beginPath();
        ctx.moveTo(g.x, g.y);
        ctx.arc(g.x, g.y, VIEW_LEN, g.angle - VIEW_ARC, g.angle + VIEW_ARC);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = "rgba(255,80,80,0.4)";
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.arc(this.enforcer.x, this.enforcer.y, ENFORCER_R, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // a few guests at the tables
      guestLooks ||= TABLES.map((_, i) => G.randomLook({ shirt: GUEST_SHIRTS[i] }));
      for (const [i, tb] of TABLES.entries()) G.drawKid(ctx, tb.x - 30, tb.y + 4, 0.38, guestLooks[i], { adult: true, t, pose: "sit", facing: 1 });
      for (const g of this.guards) G.drawKid(ctx, g.x, g.y + 12, 0.42, g.look, { adult: true, t, facing: Math.cos(g.angle) >= 0 ? 1 : -1, pose: g.wait > 0 || g.post ? "stand" : "walk" });
      G.drawKid(ctx, this.enforcer.x, this.enforcer.y + 12, 0.46, this.enforcer.look, { adult: true, t, facing: Math.cos(this.enforcer.angle) >= 0 ? 1 : -1, angry: true });
      G.drawShades(ctx, this.enforcer.x, this.enforcer.y + 12, 0.46, Math.cos(this.enforcer.angle) >= 0 ? 1 : -1);
      G.drawKid(ctx, this.target.x, this.target.y + 12, 0.46, TARGET_LOOK, { adult: true, t, facing: 1, pose: this.target.down ? "down" : "sit", dizzy: this.target.down });
      if (!this.target.down) {
        ctx.fillStyle = "#ff4040";
        ctx.font = "bold 10px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("DOELWIT", this.target.x, this.target.y - 30);
      }
      if (!this.targetDown && dist(p, this.target) < TAKEDOWN_R) {
        ctx.fillStyle = "#6ee07a";
        ctx.fillText("SPATIE!", p.x, p.y - 34);
      }

      const look = this.disguise ? { ...G.hitLook(), shirt: "#f0f0f0", pants: "#141414" } : G.hitLook();
      G.drawKid(ctx, p.x, p.y + 12, 0.42, look, { adult: true, t, facing: p.facing, pose: p.moving ? "walk" : "stand" });
      G.drawTie(ctx, p.x, p.y + 12, 0.42);
      if (this.seen) {
        ctx.fillStyle = "#ff4040";
        ctx.font = "bold 20px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("!", p.x, p.y - 30);
      }

      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(10, 8, 150, 10);
      ctx.fillStyle = this.alert > 60 ? "#ff4040" : "#ffd24a";
      ctx.fillRect(10, 8, 150 * (this.alert / 100), 10);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`ALARM · ${this.disguise ? "vermomd als croupier" : "geen vermomming"} · ${this.targetDown ? "→ uitgang!" : "doelwit: VIP"}`, 12, 30);
      if (this.won) G.drawBanner(ctx, "Ontsnapt! Eerste contract voltooid.", "#6ee07a", H / 2);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return this.targetDown ? "Naar de uitgang" : this.disguise ? "Naar de VIP-kamer" : "Pak het uniform";
    },
  };
})();
