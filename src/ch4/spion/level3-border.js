(() => {
  const { W, H } = G;
  const SPEED = 105;
  const SNEAK = 50;
  const ALERT_UP = 55;
  const ALERT_DOWN = 30;
  const MINE_R = 11;
  const BEEP_R = 70;
  const REVEAL_R = 60;
  const LIGHT_LEN = 250;
  const NIGHT_MS = 90000;
  const LIGHT_ARC = 0.17;
  const VIEW_LEN = 115;
  const VIEW_ARC = 0.5;
  const DOG_NOSE = 55;
  const DOG_NOSE_SNEAK = 30;
  const FENCE_Y = 46;
  const FIELD = { y1: 175, y2: 250 };
  const BUSHES = [{ x: 90, y: 300, r: 22 }, { x: 300, y: 285, r: 20 }, { x: 460, y: 140, r: 22 }, { x: 170, y: 110, r: 20 }, { x: 420, y: 380, r: 20 }];
  const TOWERS = [
    { x: 30, y: 210, base: 0, sweep: 0.9, speed: 0.55 },
    { x: W - 30, y: 330, base: Math.PI, sweep: 0.9, speed: 0.7 },
  ];

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const inCone = (src, ang, len, arc, p) => {
    if (dist(src, p) > len) return false;
    const a = Math.atan2(p.y - src.y, p.x - src.x);
    return Math.abs(Math.atan2(Math.sin(a - ang), Math.cos(a - ang))) < arc;
  };

  G.CAREER_LEVELS.spion[3] = {
    title: "Level 3 — Over de grens (23 jaar)",
    intro:
      "Je sluipt 's nachts Noord-Korea binnen. Bereik het <strong>gat in het hek</strong> bovenaan, vóór <strong>zonsopgang</strong> (90 seconden).<br>" +
      "Lopen met <strong>pijltjes / WASD</strong>, <strong>SPATIE</strong> ingedrukt = sluipen (traag maar stil). In een <strong>struik</strong> ben je onzichtbaar als je sluipt.<br>" +
      "Blijf uit de <strong>zoeklichten</strong> en het zicht van de <strong>bewakers</strong>; honden ruiken je van dichtbij. In het <strong>mijnenveld</strong> laat je detector mijnen in de buurt <strong>rood oplichten</strong>: loop eromheen!",

    drawBackground(ctx, t) {
      this.drawField(ctx, t, true);
    },

    start(api) {
      this.api = api;
      this.p = { x: W / 2, y: H - 22, facing: 1, moving: false };
      this.alert = 0;
      this.hole = { x: 90 + Math.random() * (W - 180), y: FENCE_Y };
      // three hidden safe paths run straight through the minefield
      this.paths = [0, 1, 2].map((i) => 60 + i * 170 + Math.random() * 80);
      this.mines = [];
      for (let tries = 0; this.mines.length < 14 && tries < 500; tries++) {
        const m = { x: 20 + Math.random() * (W - 40), y: FIELD.y1 + 8 + Math.random() * (FIELD.y2 - FIELD.y1 - 16) };
        if (this.paths.some((x) => Math.abs(m.x - x) < 32)) continue;
        if (this.mines.every((o) => dist(o, m) > 34)) this.mines.push(m);
      }
      this.guards = [
        { y: 125, x: 100, dir: 1, min: 60, max: 480, speed: 42, dog: true, look: G.NK_LOOK() },
        { y: 345, x: 470, dir: 1, min: 60, max: 480, speed: 36, dog: false, look: G.NK_LOOK() },
      ];
      this.beep = 0;
      this.boom = 0;
      this.over = false;
      this.won = 0;
      this.time = 0;
      this.left = NIGHT_MS;
    },

    hidden() {
      const p = this.p;
      return G.held.action && BUSHES.some((b) => dist(b, p) < b.r);
    },

    lightAngle(tw) {
      return tw.base + Math.sin(this.time / 1000 * tw.speed) * tw.sweep;
    },

    update(dt) {
      if (this.over) return;
      const s = dt / 1000;
      this.time += dt;
      const p = this.p;

      if (this.boom) {
        this.boom -= dt;
        if (this.boom <= 0) {
          this.over = true;
          this.api.fail("BOEM! Je stapte op een landmijn.");
        }
        return;
      }
      if (this.won) {
        this.won -= dt;
        if (this.won <= 0) {
          this.over = true;
          this.api.complete();
        }
        return;
      }

      this.left -= dt;
      if (this.left <= 0) {
        this.over = true;
        this.api.fail("De zon komt op. In het daglicht zien ze je meteen.");
        return;
      }

      const sneak = !!G.held.action;
      const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
      const my = (G.held.down ? 1 : 0) - (G.held.up ? 1 : 0);
      p.moving = !!(mx || my);
      if (p.moving) {
        const len = Math.hypot(mx, my);
        const sp = sneak ? SNEAK : SPEED;
        p.x = G.clamp(p.x + (mx / len) * sp * s, 12, W - 12);
        p.y = G.clamp(p.y + (my / len) * sp * s, FENCE_Y + 4, H - 12);
        if (mx) p.facing = mx;
      }
      // the fence only lets you through at the hole
      if (p.y < FENCE_Y + 14 && Math.abs(p.x - this.hole.x) > 18) p.y = FENCE_Y + 14;
      if (p.y < FENCE_Y + 8 && Math.abs(p.x - this.hole.x) <= 18) {
        this.won = 1500;
        return;
      }

      for (const g of this.guards) {
        g.x += g.dir * g.speed * s;
        if (g.x > g.max || g.x < g.min) {
          g.dir = -g.dir;
          g.x = G.clamp(g.x, g.min, g.max);
        }
      }

      // mines
      let nearest = 1e9;
      for (const m of this.mines) {
        const d = dist(m, p);
        nearest = Math.min(nearest, d);
        if (d < MINE_R) {
          this.boom = 900;
          this.boomAt = { ...m };
          return;
        }
      }
      this.nearest = nearest;

      // being seen
      let seen = false;
      const hidden = this.hidden();
      if (!hidden) {
        for (const tw of TOWERS) if (inCone(tw, this.lightAngle(tw), LIGHT_LEN, LIGHT_ARC, p)) seen = true;
        for (const g of this.guards) {
          if (inCone(g, g.dir > 0 ? 0 : Math.PI, VIEW_LEN, VIEW_ARC, p)) seen = true;
          if (g.dog) {
            const dog = { x: g.x - g.dir * 26, y: g.y + 6 };
            if (dist(dog, p) < (sneak ? DOG_NOSE_SNEAK : DOG_NOSE)) seen = true;
          }
        }
      }
      this.seen = seen;
      this.alert = G.clamp(this.alert + (seen ? ALERT_UP : -ALERT_DOWN) * s, 0, 100);
      if (this.alert >= 100) {
        this.over = true;
        this.api.fail("Je bent gezien! De grenswacht slaat alarm.");
      }
    },

    drawField(ctx, t, preview) {
      ctx.fillStyle = "#0e1410";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#141c14";
      ctx.fillRect(0, FIELD.y1, W, FIELD.y2 - FIELD.y1);
      ctx.fillStyle = "rgba(200,60,60,0.5)";
      ctx.font = "bold 10px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "left";
      for (let x = 10; x < W; x += 120) ctx.fillText("⚠ MIJNEN", x, FIELD.y1 - 4);
      // fence
      ctx.strokeStyle = "#7a7a7a";
      ctx.lineWidth = 2;
      for (let x = 0; x < W; x += 12) {
        ctx.beginPath();
        ctx.moveTo(x, FENCE_Y - 26);
        ctx.lineTo(x + 12, FENCE_Y);
        ctx.moveTo(x + 12, FENCE_Y - 26);
        ctx.lineTo(x, FENCE_Y);
        ctx.stroke();
      }
      const hx = preview ? W / 2 : this.hole.x;
      ctx.fillStyle = "#0e1410";
      ctx.fillRect(hx - 16, FENCE_Y - 28, 32, 30);
      ctx.fillStyle = "#6ee07a";
      ctx.font = "bold 11px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("GAT", hx, FENCE_Y + 14);
      for (const b of BUSHES) {
        ctx.fillStyle = "#1e3a1e";
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }
      // towers + searchlights
      for (const tw of TOWERS) {
        const a = preview ? tw.base : this.lightAngle(tw);
        const g = ctx.createRadialGradient(tw.x, tw.y, 5, tw.x, tw.y, LIGHT_LEN);
        g.addColorStop(0, "rgba(255,250,200,0.45)");
        g.addColorStop(1, "rgba(255,250,200,0.05)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(tw.x, tw.y);
        ctx.arc(tw.x, tw.y, LIGHT_LEN, a - LIGHT_ARC, a + LIGHT_ARC);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#4a4a4a";
        ctx.fillRect(tw.x - 12, tw.y - 12, 24, 24);
      }
    },

    render(ctx, t) {
      this.drawField(ctx, t, false);
      const p = this.p;

      for (const g of this.guards) {
        const ang = g.dir > 0 ? 0 : Math.PI;
        ctx.fillStyle = "rgba(255,80,80,0.12)";
        ctx.beginPath();
        ctx.moveTo(g.x, g.y);
        ctx.arc(g.x, g.y, VIEW_LEN, ang - VIEW_ARC, ang + VIEW_ARC);
        ctx.closePath();
        ctx.fill();
        G.drawKid(ctx, g.x, g.y + 14, 0.45, g.look, { adult: true, t, facing: g.dir, pose: "walk" });
        G.drawCap(ctx, g.x, g.y + 14, 0.45, g.dir);
        if (g.dog) {
          const dx = g.x - g.dir * 26, dy = g.y + 8;
          ctx.fillStyle = "#3a2a1a";
          ctx.beginPath();
          ctx.ellipse(dx, dy, 11, 5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(dx + g.dir * 11, dy - 4, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "rgba(255,200,120,0.25)";
          ctx.setLineDash([2, 4]);
          ctx.beginPath();
          ctx.arc(dx, dy, G.held.action ? DOG_NOSE_SNEAK : DOG_NOSE, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // the detector reveals mines close by
      for (const m of this.mines) {
        const d = dist(m, p);
        if (d > REVEAL_R) continue;
        const k = 1 - d / REVEAL_R;
        ctx.fillStyle = `rgba(255,60,60,${0.25 + k * 0.6 * ((Math.sin(t * 12) + 1) / 2)})`;
        ctx.beginPath();
        ctx.arc(m.x, m.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(255,60,60,${0.2 + k * 0.4})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(m.x, m.y, MINE_R + 12, 0, Math.PI * 2);
        ctx.stroke();
      }

      // mine detector ring around you, redder when close
      if (p.y > FIELD.y1 - 40 && p.y < FIELD.y2 + 40 && this.nearest < BEEP_R) {
        const k = 1 - this.nearest / BEEP_R;
        const pulse = (Math.sin(t * (6 + k * 30)) + 1) / 2;
        ctx.strokeStyle = `rgba(255,${Math.round(220 - k * 200)},60,${0.3 + pulse * 0.6})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 18 + k * 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(pulse > 0.5 ? "PIEP" : "", p.x, p.y - 36);
      }

      const hidden = this.hidden();
      ctx.globalAlpha = hidden ? 0.45 : 1;
      if (G.held.action) G.drawKid(ctx, p.x, p.y + 6, 0.45, G.spyLook(), { adult: true, t: p.moving ? t : 0, pose: "crawl" });
      else {
        G.drawKid(ctx, p.x, p.y + 14, 0.45, G.spyLook(), { adult: true, t, facing: p.facing, pose: p.moving ? "walk" : "stand" });
        G.drawShades(ctx, p.x, p.y + 14, 0.45, p.facing);
      }
      ctx.globalAlpha = 1;

      if (this.boom) {
        const k = 1 - this.boom / 900;
        ctx.fillStyle = `rgba(255,${150 + k * 100},40,${1 - k})`;
        ctx.beginPath();
        ctx.arc(this.boomAt.x, this.boomAt.y, 20 + k * 80, 0, Math.PI * 2);
        ctx.fill();
      }
      if (this.seen) {
        ctx.fillStyle = "#ff4040";
        ctx.font = "bold 22px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("!", p.x, p.y - 34);
      }
      if (this.won) G.drawBanner(ctx, "Je bent erdoor!", "#6ee07a", H / 2);

      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(W - 170, H - 22, 160, 12);
      ctx.fillStyle = this.alert > 60 ? "#ff4040" : "#ffd24a";
      ctx.fillRect(W - 170, H - 22, 160 * (this.alert / 100), 12);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("ALARM", W - 12, H - 26);
      ctx.font = "bold 13px Segoe UI, Roboto, sans-serif";
      ctx.fillText(`Zonsopgang over ${Math.ceil(this.left / 1000)}s`, W - 12, 20);
      ctx.font = "bold 10px Segoe UI, Roboto, sans-serif";
      if (hidden) {
        ctx.textAlign = "left";
        ctx.fillText("verstopt", 12, H - 12);
      }
    },

    hud() {
      return `Over de grens · alarm ${Math.round(this.alert)}%`;
    },
  };
})();
