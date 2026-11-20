(() => {
  const { W, H } = G;
  const R = 10;
  const SPEED = 105;
  const VIEW_LEN = 120;
  const VIEW_ARC = 0.6;
  const TAKEDOWN_R = 30;
  const SUS_IDLE = 3;
  const SUS_TRAY = -8;
  const SUS_SERVE = -22;
  const SUS_LATE = 18;
  const SUS_SEEN = 45;
  const ORDER_EVERY = 6500;
  const ORDER_MS = 16000;
  const BAR = { x: 70, y: 70 };
  const GATE = { x: W / 2 - 25, w: 50 };
  const WC = { x: 440, y: 20, w: 86, h: 100 };
  const WALLS = [
    { x: 432, y: 20, w: 8, h: 108 }, { x: 432, y: 120, w: 34, h: 8 }, { x: 500, y: 120, w: 26, h: 8 },
  ];
  const TABLES = [{ x: 140, y: 190 }, { x: 270, y: 150 }, { x: 400, y: 200 }, { x: 140, y: 330 }, { x: 400, y: 340 }];
  const DON_TABLE = 1;
  // the don's evening: his table, the dance floor, the restroom, the bar
  const DON_ROUTE = [
    { x: 270, y: 128, wait: 7000 },
    { x: 270, y: 270, wait: 6500 },
    { x: 483, y: 140, wait: 0 },
    { x: 483, y: 70, wait: 5500, inside: true },
    { x: 483, y: 140, wait: 0 },
    { x: 100, y: 95, wait: 5000 },
  ];
  const DON_LOOK = { ...G.SKINS.wit, hair: "kort", hairColor: "#9a9a9a", eyes: G.EYES.bruin, gender: "jongen", shirt: "#f0f0f0", pants: "#1a1a1a" };
  const GUARD_LOOK = { ...G.SKINS.zwart, hair: "kort", hairColor: "#1a1212", eyes: G.EYES.bruin, gender: "jongen", shirt: "#1a1a1a", pants: "#1a1a1a" };

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  const inRect = (p, r) => p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h;

  G.CAREER_LEVELS.huurmoordenaar[4] = {
    title: "Level 4 — Maffiabruiloft (24 jaar)",
    intro:
      "Je doelwit: <strong>Don Pastrami</strong> op de bruiloft van zijn dochter. Jij bent vermomd als <strong>ober</strong>.<br>" +
      "Speel je rol: haal een dienblad aan de <strong>bar</strong> (SPATIE) en breng het naar de tafel met een <strong>!</strong> (SPATIE). Een ober die niks doet valt op.<br>" +
      "De <strong>lijfwacht</strong> wijkt niet van de Don, behalve als die naar het <strong>toilet</strong> gaat... Sta naast de Don waar de lijfwacht je niet ziet en druk <strong>SPATIE</strong>. Ontsnap dan via de <strong>poort</strong> onderaan.",

    drawBackground(ctx, t) {
      this.drawGarden(ctx, t);
    },

    start(api) {
      this.api = api;
      this.p = { x: W / 2, y: H - 40, facing: 1, moving: false, tray: false };
      this.sus = 0;
      this.orders = [];
      this.orderTimer = 2500;
      this.don = { x: 270, y: 128, wp: 0, wait: 4000, down: false, inside: false };
      this.guard = { x: 300, y: 128, angle: Math.PI / 2 };
      this.targetDown = false;
      this.popups = [];
      this.over = false;
      this.won = 0;
      this.time = 0;
      this.guestLooks ||= TABLES.map(() => [G.randomLook(), G.randomLook()]);
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 1000 });
    },

    addSus(n, text, x, y) {
      this.sus = G.clamp(this.sus + n, 0, 100);
      if (text) this.popup(text, x, y, n > 0 ? "#ff6b6b" : "#6ee07a");
      if (this.sus >= 100) {
        this.over = true;
        this.api.fail("De familie heeft je door. Dit wordt geen leuke bruiloft voor jou...");
      }
    },

    blocked(x, y, r = R) {
      return WALLS.some((w) => x > w.x - r && x < w.x + w.w + r && y > w.y - r && y < w.y + w.h + r);
    },
    sight(a, b) {
      const n = Math.ceil(dist(a, b) / 6);
      for (let i = 1; i < n; i++) if (this.blocked(a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n, 0)) return false;
      return true;
    },
    guardSees(p) {
      const g = this.guard;
      return dist(g, p) < VIEW_LEN && Math.abs(angDiff(Math.atan2(p.y - g.y, p.x - g.x), g.angle)) < VIEW_ARC && this.sight(g, p);
    },

    onAction() {
      if (this.over || this.won) return;
      const p = this.p;
      // the hit
      if (!this.targetDown && dist(p, this.don) < TAKEDOWN_R) {
        if (this.guardSees(p)) {
          this.addSus(100, "De lijfwacht zag het!", this.guard.x, this.guard.y - 30);
        } else {
          this.targetDown = true;
          this.don.down = true;
          this.popup("Contract voltooid. Rustig naar de poort...", this.don.x, this.don.y - 30, "#6ee07a");
        }
        return;
      }
      if (!p.tray && dist(p, BAR) < 34) {
        p.tray = true;
        this.popup("Dienblad gepakt", p.x, p.y - 30, "#cfe8ff");
        return;
      }
      if (p.tray) {
        const o = this.orders.find((o) => dist(TABLES[o.table], p) < 50);
        if (o) {
          o.done = true;
          p.tray = false;
          this.addSus(SUS_SERVE, "Grazie!", p.x, p.y - 30);
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
        const nx = G.clamp(p.x + (mx / len) * SPEED * s, 16, W - 16);
        const ny = G.clamp(p.y + (my / len) * SPEED * s, 30, H - 10);
        if (!this.blocked(nx, p.y)) p.x = nx;
        if (!this.blocked(p.x, ny)) p.y = ny;
        if (mx) p.facing = mx;
      }
      if (this.targetDown && p.y > H - 16 && p.x > GATE.x && p.x < GATE.x + GATE.w) {
        this.won = 1800;
        return;
      }

      // play your part: idle waiters look suspicious
      if (!this.targetDown) this.addSus((p.tray ? SUS_TRAY : SUS_IDLE) * s);
      if (this.over) return;

      // drink orders
      this.orderTimer -= dt;
      if (this.orderTimer <= 0 && !this.targetDown) {
        this.orderTimer = ORDER_EVERY;
        const free = TABLES.map((_, i) => i).filter((i) => i !== DON_TABLE && !this.orders.some((o) => o.table === i));
        if (free.length) this.orders.push({ table: G.pick(free), timer: ORDER_MS });
      }
      for (const o of this.orders) {
        o.timer -= dt;
        if (o.timer <= 0 && !o.done) {
          o.done = true;
          this.addSus(SUS_LATE, "De gasten klagen over de ober!", TABLES[o.table].x, TABLES[o.table].y - 30);
          if (this.over) return;
        }
      }
      this.orders = this.orders.filter((o) => !o.done);

      // the don walks his rounds, the bodyguard sticks with him
      const d = this.don;
      if (!d.down) {
        if (d.wait > 0) d.wait -= dt;
        else {
          const wp = DON_ROUTE[(d.wp + 1) % DON_ROUTE.length];
          const dd = dist(d, wp);
          if (dd < 2) {
            d.wp = (d.wp + 1) % DON_ROUTE.length;
            d.wait = wp.wait;
            d.inside = !!wp.inside;
          } else {
            d.x += ((wp.x - d.x) / dd) * 40 * s;
            d.y += ((wp.y - d.y) / dd) * 40 * s;
          }
        }
      }
      const g = this.guard;
      // stays at the restroom door while the don is inside, else beside him
      const post = d.inside ? { x: 483, y: 150 } : { x: d.x + 30, y: d.y + 12 };
      const gd = dist(g, post);
      if (gd > 2) {
        g.x += ((post.x - g.x) / gd) * Math.min(gd, 60 * s);
        g.y += ((post.y - g.y) / gd) * Math.min(gd, 60 * s);
      }
      if (d.inside) g.angle = Math.PI / 2 + Math.sin(this.time / 800) * 0.7;
      else if (this.targetDown) g.angle = Math.atan2(p.y - g.y, p.x - g.x) + Math.sin(this.time / 300) * 0.9;
      else g.angle = Math.atan2(d.y - g.y, d.x - g.x) + Math.PI + Math.sin(this.time / 600) * 1.1;

      // standing near the don without a reason
      if (!this.targetDown && dist(p, d) < 60 && !p.tray && this.guardSees(p)) this.addSus(SUS_SEEN * s);
      if (this.targetDown && this.guardSees(p) && dist(p, g) < 90) this.addSus(SUS_SEEN * 1.5 * s);
      this.seen = this.guardSees(p) && dist(p, d) < 70;
    },

    drawGarden(ctx, t) {
      ctx.fillStyle = "#4a7a3a";
      ctx.fillRect(0, 0, W, H);
      // dance floor
      ctx.fillStyle = "#c8b890";
      ctx.fillRect(210, 240, 120, 70);
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.strokeRect(210, 240, 120, 70);
      // string lights
      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = ["#ffd24a", "#ff8a8a", "#ffffff"][i % 3];
        ctx.beginPath();
        ctx.arc(20 + i * 45, 14 + Math.sin(i) * 4, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      // bar
      ctx.fillStyle = "#6a4a2a";
      ctx.fillRect(BAR.x - 50, BAR.y - 30, 70, 22);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 9px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("BAR", BAR.x - 15, BAR.y - 15);
      // restroom
      ctx.fillStyle = "#c8c0b0";
      ctx.fillRect(WC.x, WC.y, WC.w, WC.h);
      ctx.fillStyle = "#3a3a3a";
      ctx.fillText("🚻 TOILET", WC.x + WC.w / 2 + 4, WC.y + 14);
      for (const w of WALLS) {
        ctx.fillStyle = "#8a7a6a";
        ctx.fillRect(w.x, w.y, w.w, w.h);
      }
      for (const [i, tb] of TABLES.entries()) {
        ctx.fillStyle = i === DON_TABLE ? "#f8f0e0" : "#f0f0f0";
        ctx.beginPath();
        ctx.arc(tb.x, tb.y, 26, 0, Math.PI * 2);
        ctx.fill();
        if (i === DON_TABLE) {
          ctx.fillStyle = "#f8f0d0";
          ctx.beginPath();
          ctx.arc(tb.x, tb.y, 8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // gate
      ctx.fillStyle = "#3a3a3a";
      ctx.fillRect(0, H - 6, GATE.x, 6);
      ctx.fillRect(GATE.x + GATE.w, H - 6, W, 6);
    },

    render(ctx, t) {
      this.drawGarden(ctx, t);
      const p = this.p, d = this.don, g = this.guard;
      for (const [i, tb] of TABLES.entries()) {
        if (i === DON_TABLE) continue;
        const looks = this.guestLooks[i];
        G.drawKid(ctx, tb.x - 30, tb.y + 10, 0.38, looks[0], { adult: true, t, pose: "sit", facing: 1 });
        G.drawKid(ctx, tb.x + 30, tb.y + 10, 0.38, looks[1], { adult: true, t, pose: "sit", facing: -1 });
      }
      for (const o of this.orders) {
        const tb = TABLES[o.table];
        ctx.fillStyle = o.timer < 5000 ? "#ff6040" : "#ffd24a";
        ctx.font = "bold 18px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("!", tb.x, tb.y - 30);
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(tb.x - 16, tb.y - 26, 32, 4);
        ctx.fillStyle = "#ffd24a";
        ctx.fillRect(tb.x - 16, tb.y - 26, 32 * (o.timer / ORDER_MS), 4);
      }

      // bodyguard's view
      ctx.fillStyle = "rgba(255,80,80,0.15)";
      ctx.beginPath();
      ctx.moveTo(g.x, g.y);
      ctx.arc(g.x, g.y, VIEW_LEN, g.angle - VIEW_ARC, g.angle + VIEW_ARC);
      ctx.closePath();
      ctx.fill();

      if (!d.inside || d.down) {
        G.drawKid(ctx, d.x, d.y + 12, 0.46, DON_LOOK, { adult: true, t, pose: d.down ? "down" : d.wait > 0 ? "stand" : "walk", dizzy: d.down });
        if (!d.down) {
          ctx.fillStyle = "#c02020";
          ctx.beginPath();
          ctx.arc(d.x + 5, d.y - 14, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#ff4040";
          ctx.font = "bold 10px Segoe UI, Roboto, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("DON PASTRAMI", d.x, d.y - 32);
        }
      }
      G.drawKid(ctx, g.x, g.y + 12, 0.48, GUARD_LOOK, { adult: true, t, facing: Math.cos(g.angle) >= 0 ? 1 : -1, angry: true });
      G.drawShades(ctx, g.x, g.y + 12, 0.48, Math.cos(g.angle) >= 0 ? 1 : -1);

      const waiter = { ...G.hitLook(), shirt: "#f4f4f4", pants: "#141414" };
      const hand = G.drawKid(ctx, p.x, p.y + 12, 0.44, waiter, { adult: true, t, facing: p.facing, pose: p.moving ? "walk" : "stand", armAngle: p.tray ? -0.6 : undefined });
      G.drawTie(ctx, p.x, p.y + 12, 0.44);
      if (p.tray) {
        ctx.fillStyle = "#c0c0c0";
        ctx.beginPath();
        ctx.ellipse(hand.x + p.facing * 4, hand.y - 4, 10, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(240,200,80,0.9)";
        ctx.fillRect(hand.x + p.facing * 4 - 4, hand.y - 12, 3, 7);
        ctx.fillRect(hand.x + p.facing * 4 + 2, hand.y - 12, 3, 7);
      }
      if (!this.targetDown && dist(p, d) < TAKEDOWN_R && !d.down) {
        ctx.fillStyle = this.guardSees(p) ? "#ff6b6b" : "#6ee07a";
        ctx.font = "bold 11px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(this.guardSees(p) ? "lijfwacht kijkt!" : "SPATIE!", p.x, p.y - 34);
      }
      if (this.seen) {
        ctx.fillStyle = "#ff4040";
        ctx.font = "bold 18px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("?", p.x, p.y - 46);
      }

      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(W - 170, H - 22, 156, 10);
      ctx.fillStyle = this.sus > 60 ? "#ff4040" : "#ffd24a";
      ctx.fillRect(W - 170, H - 22, 156 * (this.sus / 100), 10);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(this.targetDown ? "VERDACHT · naar de poort!" : `VERDACHT · ${p.tray ? "dienblad ✔" : "haal een dienblad"}`, W - 14, H - 26);
      if (this.won) G.drawBanner(ctx, "Weg van de bruiloft. Contract voltooid.", "#6ee07a", H / 2);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return this.targetDown ? "Naar de poort" : "Speel ober, wacht op je kans";
    },
  };
})();
