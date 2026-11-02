(() => {
  const { W, H } = G;
  const R = 10;
  const SPEED = 95;
  const SNEAK = 48;
  const VIEW_LEN = 120;
  const VIEW_ARC = 0.55;
  const CAM_LEN = 150;
  const CAM_ARC = 0.3;
  const ALERT_UP = 60;
  const ALERT_DOWN = 22;
  const TAKEDOWN_R = 34;
  const PINS = 3;
  const GUARD_SPEED = 40;
  const WALLS = [
    { x: 0, y: 0, w: W, h: 20 }, { x: 0, y: H - 14, w: W, h: 14 }, { x: 0, y: 0, w: 14, h: H }, { x: W - 14, y: 0, w: 14, h: H },
    // cell block
    { x: 14, y: 330, w: 110, h: 8 }, { x: 116, y: 338, w: 8, h: 34 }, { x: 116, y: 410, w: 8, h: 26 },
    { x: 150, y: 330, w: 90, h: 106 }, { x: 270, y: 330, w: 90, h: 106 },
    // middle blocks
    { x: 150, y: 150, w: 110, h: 110 }, { x: 320, y: 150, w: 110, h: 110 },
    // gear room
    { x: 14, y: 130, w: 100, h: 8 }, { x: 106, y: 20, w: 8, h: 70 },
  ];
  const CELL_DOOR = { x: 116, y: 372, w: 8, h: 38 };
  const GEAR = { x: 55, y: 70 };
  const EXIT = { x: W - 30, y: 40, w: 16, h: 70 };
  const ROUTES = [
    [{ x: 450, y: 300 }, { x: 140, y: 300 }],
    [{ x: 290, y: 60 }, { x: 290, y: 300 }],
    [{ x: 470, y: 120 }, { x: 470, y: 400 }, { x: 400, y: 400 }],
  ];
  const CAMERA = { x: 290, y: 140, base: Math.PI / 2, sweep: 1.1, speed: 0.7 };

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

  G.CAREER_LEVELS.spion[7] = {
    title: "Level 7 — Ontsnapping uit de cel (27 jaar)",
    intro:
      "Je zit in een cel. Gelukkig heb je een <strong>haarspeld</strong> verstopt...<br>" +
      "1. Kraak het slot: <strong>SPATIE</strong> als de pin in het <strong>groen</strong> staat (fout = lawaai!).<br>" +
      "2. Sluip (<strong>SPATIE</strong> ingedrukt = stil) naar je <strong>spullen</strong> linksboven en dan naar de <strong>uitgang</strong> rechtsboven. Sta achter een bewaker en druk <strong>SPATIE</strong> om hem uit te schakelen. Blijf uit zijn zicht en uit de <strong>camera</strong>!",

    drawBackground(ctx, t) {
      this.drawMap(ctx, t, true);
    },

    start(api) {
      this.api = api;
      this.p = { x: 60, y: 390, facing: 1, moving: false };
      this.phase = "lock";
      this.pin = 0;
      this.pinT = Math.random() * 5;
      this.zone = 0.3 + Math.random() * 0.4;
      this.alert = 0;
      this.hasGear = false;
      this.time = 0;
      this.guards = ROUTES.map((r, i) => ({ x: r[0].x, y: r[0].y, route: r, wp: 1, angle: 0, down: false, look: G.NK_LOOK(), wait: 0 }));
      this.popups = [];
      this.over = false;
      this.won = 0;
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 900 });
    },

    blocked(x, y) {
      const door = this.phase === "lock" ? [CELL_DOOR] : [];
      return WALLS.concat(door).some((w) => x > w.x && x < w.x + w.w && y > w.y && y < w.y + w.h);
    },
    collide(o) {
      const walls = this.phase === "lock" ? WALLS.concat([CELL_DOOR]) : WALLS;
      for (const w of walls) {
        const cx = G.clamp(o.x, w.x, w.x + w.w), cy = G.clamp(o.y, w.y, w.y + w.h);
        const d = Math.hypot(o.x - cx, o.y - cy);
        if (d < R && d > 0) {
          o.x = cx + ((o.x - cx) / d) * R;
          o.y = cy + ((o.y - cy) / d) * R;
        }
      }
    },
    sight(a, b) {
      const n = Math.ceil(dist(a, b) / 6);
      for (let i = 1; i < n; i++) if (this.blocked(a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n)) return false;
      return true;
    },
    sees(g, p) {
      if (g.down || dist(g, p) > VIEW_LEN) return false;
      if (Math.abs(angDiff(Math.atan2(p.y - g.y, p.x - g.x), g.angle)) > VIEW_ARC) return false;
      return this.sight(g, p);
    },
    camAngle() {
      return CAMERA.base + Math.sin(this.time / 1000 * CAMERA.speed) * CAMERA.sweep;
    },

    pinPos() {
      return (Math.sin(this.pinT * (2.2 + this.pin * 0.5)) + 1) / 2;
    },

    onAction() {
      if (this.over || this.won) return;
      if (this.phase === "lock") {
        if (Math.abs(this.pinPos() - this.zone) < 0.1) {
          this.pin++;
          this.popup("klik", this.p.x, this.p.y - 40, "#6ee07a");
          if (this.pin >= PINS) {
            this.phase = "sneak";
            this.popup("Celdeur open!", 120, 320, "#6ee07a");
          } else this.zone = 0.2 + Math.random() * 0.6;
        } else {
          this.alert = Math.min(100, this.alert + 25);
          this.popup("KLANG! Lawaai!", this.p.x, this.p.y - 40, "#ff6b6b");
        }
        return;
      }
      // takedown from behind
      const p = this.p;
      for (const g of this.guards) {
        if (g.down || dist(g, p) > TAKEDOWN_R) continue;
        if (this.sees(g, p)) {
          this.alert = Math.min(100, this.alert + 40);
          this.popup("Hij zag je aankomen!", g.x, g.y - 40, "#ff6b6b");
        } else {
          g.down = true;
          this.popup("Uitgeschakeld!", g.x, g.y - 40, "#6ee07a");
        }
        return;
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

      if (this.phase === "lock") this.pinT += s;

      // guards walk their rounds
      for (const g of this.guards) {
        if (g.down) continue;
        if (g.wait > 0) {
          g.wait -= dt;
          g.angle += Math.sin(this.time / 300) * 0.02;
          continue;
        }
        const wp = g.route[g.wp];
        const d = dist(g, wp);
        if (d < 3) {
          g.wp = (g.wp + 1) % g.route.length;
          g.wait = 900;
        } else {
          g.angle = Math.atan2(wp.y - g.y, wp.x - g.x);
          g.x += ((wp.x - g.x) / d) * GUARD_SPEED * s;
          g.y += ((wp.y - g.y) / d) * GUARD_SPEED * s;
        }
      }

      if (this.phase === "sneak") {
        const sneak = !!G.held.action;
        const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
        const my = (G.held.down ? 1 : 0) - (G.held.up ? 1 : 0);
        p.moving = !!(mx || my);
        if (p.moving) {
          const len = Math.hypot(mx, my);
          const sp = sneak ? SNEAK : SPEED;
          p.x += (mx / len) * sp * s;
          p.y += (my / len) * sp * s;
          if (mx) p.facing = mx;
          this.collide(p);
        }
        if (!this.hasGear && dist(p, GEAR) < 22) {
          this.hasGear = true;
          this.popup("Spullen terug! Nu naar de uitgang", GEAR.x + 60, GEAR.y - 20, "#6ee07a");
        }
        if (this.hasGear && p.x > EXIT.x - 12 && p.y > EXIT.y && p.y < EXIT.y + EXIT.h) {
          this.won = 1600;
          return;
        }
        if (!this.hasGear && p.x > EXIT.x - 12 && p.y > EXIT.y && p.y < EXIT.y + EXIT.h && !this.toldGear) {
          this.toldGear = true;
          this.popup("Eerst je spullen halen!", p.x - 60, p.y - 30, "#ffd24a");
        }

        // spotted? running (not sneaking) right next to a guard is heard too
        let seen = this.guards.some((g) => this.sees(g, p) || (!g.down && !sneak && p.moving && dist(g, p) < 45));
        const ca = this.camAngle();
        if (dist(CAMERA, p) < CAM_LEN && Math.abs(angDiff(Math.atan2(p.y - CAMERA.y, p.x - CAMERA.x), ca)) < CAM_ARC && this.sight(CAMERA, p)) seen = true;
        this.seen = seen;
        this.alert = G.clamp(this.alert + (seen ? ALERT_UP : -ALERT_DOWN) * s, 0, 100);
      } else this.alert = Math.max(0, this.alert - ALERT_DOWN * 0.5 * s);

      if (this.alert >= 100) {
        this.over = true;
        this.api.fail("ALARM! Ze slepen je terug de cel in.");
      }
    },

    drawMap(ctx, t, preview) {
      ctx.fillStyle = "#3a3a3e";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#2e2e32";
      for (let x = 14; x < W; x += 30) ctx.fillRect(x, 0, 1, H);
      for (const w of WALLS) {
        ctx.fillStyle = "#1e1e22";
        ctx.fillRect(w.x, w.y, w.w, w.h);
      }
      // cell door bars
      const open = !preview && this.phase !== "lock";
      ctx.strokeStyle = "#8a8a8a";
      ctx.lineWidth = 2;
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.moveTo(CELL_DOOR.x + 4, CELL_DOOR.y + k * 10 + (open ? -30 : 0));
        ctx.lineTo(CELL_DOOR.x + 4, CELL_DOOR.y + k * 10 + 8 + (open ? -30 : 0));
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = "bold 10px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("CEL", 60, 352);
      // gear and exit
      if (preview || !this.hasGear) {
        ctx.fillStyle = "#8a6a3a";
        ctx.fillRect(GEAR.x - 12, GEAR.y - 8, 24, 16);
        ctx.fillStyle = "#ffd24a";
        ctx.fillText("SPULLEN", GEAR.x, GEAR.y - 14);
      }
      ctx.fillStyle = "#2a6a3a";
      ctx.fillRect(EXIT.x, EXIT.y, EXIT.w, EXIT.h);
      ctx.fillStyle = "#6ee07a";
      ctx.save();
      ctx.translate(EXIT.x - 6, EXIT.y + EXIT.h / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText("UITGANG", 0, 0);
      ctx.restore();
      // camera
      const ca = preview ? CAMERA.base : this.camAngle();
      ctx.fillStyle = "rgba(255,80,80,0.15)";
      ctx.beginPath();
      ctx.moveTo(CAMERA.x, CAMERA.y);
      ctx.arc(CAMERA.x, CAMERA.y, CAM_LEN, ca - CAM_ARC, ca + CAM_ARC);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#555";
      ctx.fillRect(CAMERA.x - 7, CAMERA.y - 5, 14, 10);
      ctx.fillStyle = Math.floor(t * 2) % 2 ? "#ff3030" : "#600";
      ctx.beginPath();
      ctx.arc(CAMERA.x + 4, CAMERA.y, 2, 0, Math.PI * 2);
      ctx.fill();
    },

    render(ctx, t) {
      this.drawMap(ctx, t, false);
      const p = this.p;

      for (const g of this.guards) {
        if (!g.down) {
          ctx.fillStyle = "rgba(255,200,80,0.13)";
          ctx.beginPath();
          ctx.moveTo(g.x, g.y);
          ctx.arc(g.x, g.y, VIEW_LEN, g.angle - VIEW_ARC, g.angle + VIEW_ARC);
          ctx.closePath();
          ctx.fill();
        }
        const facing = Math.cos(g.angle) >= 0 ? 1 : -1;
        G.drawKid(ctx, g.x, g.y + 12, 0.42, g.look, { adult: true, t, facing, pose: g.down ? "down" : g.wait > 0 ? "stand" : "walk", dizzy: g.down });
        if (!g.down) G.drawCap(ctx, g.x, g.y + 12, 0.42, facing);
        if (!g.down && this.phase === "sneak" && dist(g, p) < TAKEDOWN_R && !this.sees(g, p)) {
          ctx.fillStyle = "#6ee07a";
          ctx.font = "bold 11px Segoe UI, Roboto, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("SPATIE!", g.x, g.y - 34);
        }
      }

      if (G.held.action && this.phase === "sneak") G.drawKid(ctx, p.x, p.y + 6, 0.42, { ...G.playerKidLook(), shirt: "#8a8a7a", pants: "#7a7a6a" }, { adult: true, t: p.moving ? t : 0, pose: "crawl" });
      else G.drawKid(ctx, p.x, p.y + 12, 0.42, this.hasGear ? G.spyLook() : { ...G.playerKidLook(), shirt: "#8a8a7a", pants: "#7a7a6a" }, { adult: true, t, facing: p.facing, pose: p.moving ? "walk" : "stand" });
      if (this.hasGear && !G.held.action) G.drawShades(ctx, p.x, p.y + 12, 0.42, p.facing);
      if (this.seen) {
        ctx.fillStyle = "#ff4040";
        ctx.font = "bold 20px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("!", p.x, p.y - 30);
      }

      if (this.phase === "lock") {
        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.fillRect(160, 140, 220, 120);
        ctx.fillStyle = "#b08a30";
        ctx.fillRect(190, 160, 160, 70);
        for (let i = 0; i < PINS; i++) {
          const x = 230 + i * 40;
          ctx.fillStyle = "#3a2a10";
          ctx.fillRect(x - 8, 165, 16, 60);
          if (i < this.pin) {
            ctx.fillStyle = "#6ee07a";
            ctx.fillRect(x - 6, 167, 12, 20);
          } else if (i === this.pin) {
            ctx.fillStyle = "rgba(110,224,122,0.5)";
            ctx.fillRect(x - 8, 167 + this.zone * 50 - 7, 16, 14);
            ctx.fillStyle = "#e8e8e8";
            ctx.fillRect(x - 6, 167 + this.pinPos() * 50 - 3, 12, 6);
          }
        }
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Celdeur kraken: SPATIE in het groen", 270, 250);
      }
      if (this.won) G.drawBanner(ctx, "Ontsnapt!", "#6ee07a", H / 2);

      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(W - 170, H - 12, 156, 8);
      ctx.fillStyle = this.alert > 60 ? "#ff4040" : "#ffd24a";
      ctx.fillRect(W - 170, H - 12, 156 * (this.alert / 100), 8);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`ALARM · ${this.hasGear ? "spullen ✔ → uitgang" : "haal je spullen"}`, W - 16, H - 16);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return this.phase === "lock" ? "Celdeur kraken" : this.hasGear ? "Naar de uitgang" : "Haal je spullen";
    },
  };
})();
