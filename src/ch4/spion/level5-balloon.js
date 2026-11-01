(() => {
  const { W, H } = G;
  const BX = 150; // the balloon stays here on screen, the land scrolls
  const SCROLL = 70;
  const LIFT = 150;
  const SINK = 55;
  const VMAX = 70;
  const GRAVITY = 260;
  const HP = 3;
  const PACKAGES = 12;
  const TARGETS = 8;
  const NEED = 5;
  const TARGET_GAP = 520;
  const HIT_R = 30;
  const LIGHT_LEN = 330;
  const LIGHT_ARC = 0.13;
  const FLAK_WARN = 900;
  const FLAK_R = 34;
  const STARS = Array.from({ length: 45 }, () => ({ x: Math.random() * W, y: Math.random() * 220 }));

  // ground height at world x: rolling hills with a few sharp peaks
  const groundY = (wx) => {
    let y = H - 45 - Math.sin(wx * 0.006) * 22 - Math.sin(wx * 0.017) * 10;
    for (const px of [900, 2100, 3300, 4400]) {
      const d = Math.abs(wx - px);
      if (d < 130) y -= (1 - d / 130) * 190;
    }
    return y;
  };

  G.CAREER_LEVELS.spion[5] = {
    title: "Level 5 — Ballonmissie (25 jaar)",
    intro:
      "Met een luchtballon zweef je 's nachts over Noord-Korea om <strong>pakketjes</strong> met nieuws en radio's te droppen.<br>" +
      "<strong>↑</strong> ingedrukt = brander aan (stijgen), loslaten = zakken. Pas op voor <strong>bergtoppen</strong>.<br>" +
      "<strong>SPATIE</strong> = pakketje droppen. Het valt even: drop als het <strong>verlichte kruis</strong> onder het <strong>witte pijltje</strong> staat. Blijf uit de <strong>zoeklichten</strong>: daar komt luchtafweer op af. Raak <strong>5 doelen</strong>.",

    drawBackground(ctx, t) {
      this.scroll = 0;
      this.drawWorld(ctx, t, 0);
    },

    start(api) {
      this.api = api;
      this.y = 140;
      this.vy = 0;
      this.hp = HP;
      this.flash = 0;
      this.invuln = 0;
      this.scroll = 0;
      this.packages = PACKAGES;
      this.drops = [];
      this.hits = 0;
      this.targets = [];
      for (let i = 0; i < TARGETS; i++) this.targets.push({ wx: 700 + i * TARGET_GAP + (Math.random() - 0.5) * 120, hit: false });
      this.lights = [];
      for (let i = 0; i < 7; i++) this.lights.push({ wx: 1100 + i * 600 + Math.random() * 200, speed: 0.6 + Math.random() * 0.5, seed: Math.random() * 6, seen: 0 });
      this.flak = [];
      this.flakTimer = 4000;
      this.popups = [];
      this.over = false;
      this.done = 0;
      this.time = 0;
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 900 });
    },

    onAction() {
      if (this.over || this.done || this.packages <= 0) return;
      this.packages--;
      this.drops.push({ x: BX, y: this.y + 30, vy: 0 });
    },

    lightAngle(l) {
      return -Math.PI / 2 + Math.sin(this.time / 1000 * l.speed + l.seed) * 0.85;
    },

    hurt(text) {
      if (this.invuln > 0) return;
      this.hp--;
      this.invuln = 1200;
      this.flash = 400;
      this.popup(text, BX, this.y - 60, "#ff6b6b");
      if (this.hp <= 0) {
        this.over = true;
        this.api.fail("Je ballon is neergehaald.");
      }
    },

    update(dt) {
      if (this.over) return;
      const s = dt / 1000;
      this.time += dt;
      this.flash = Math.max(0, this.flash - dt);
      this.invuln = Math.max(0, this.invuln - dt);
      this.popups = G.updatePopups(this.popups, dt);

      if (this.done) {
        this.done -= dt;
        if (this.done <= 0) {
          this.over = true;
          if (this.hits >= NEED) this.api.complete();
          else this.api.fail(`Maar ${this.hits} doelen geraakt. Er waren er ${NEED} nodig.`);
        }
        return;
      }

      this.scroll += SCROLL * s;
      // burner: lift while held, otherwise slowly sink
      this.vy += (G.held.up ? -LIFT : SINK) * s;
      this.vy = G.clamp(this.vy, -VMAX, VMAX);
      this.y += this.vy * s;
      if (this.y < 50) {
        this.y = 50;
        this.vy = 0;
      }
      // the basket must stay above the ground
      const gy = groundY(this.scroll + BX);
      if (this.y + 34 > gy) {
        this.y = gy - 34;
        this.vy = -60;
        this.hurt("BOTSING!");
        if (this.over) return;
      }

      // packages fall straight down beneath you while the land slides by
      for (const d of this.drops) {
        d.vy += GRAVITY * s;
        d.y += d.vy * s;
        const wx = this.scroll + d.x;
        if (d.y >= groundY(wx)) {
          d.done = true;
          const tg = this.targets.find((tg) => !tg.hit && Math.abs(tg.wx - wx) < HIT_R);
          if (tg) {
            tg.hit = true;
            this.hits++;
            this.popup(`Raak! ${this.hits}/${NEED}`, d.x, d.y - 30, "#6ee07a");
          } else this.popup("mis", d.x, d.y - 20, "#ffd24a");
        }
      }
      this.drops = this.drops.filter((d) => !d.done);

      // searchlights: get caught and the flak comes for you
      const balloon = { x: BX, y: this.y };
      for (const l of this.lights) {
        const sx = l.wx - this.scroll;
        if (sx < -50 || sx > W + 50) continue;
        const src = { x: sx, y: groundY(l.wx) };
        const a = Math.atan2(balloon.y - src.y, balloon.x - src.x);
        const ang = this.lightAngle(l);
        const inBeam = Math.hypot(balloon.x - src.x, balloon.y - src.y) < LIGHT_LEN && Math.abs(Math.atan2(Math.sin(a - ang), Math.cos(a - ang))) < LIGHT_ARC;
        if (inBeam) {
          l.seen += dt;
          if (l.seen > 350) {
            l.seen = -900;
            this.flak.push({ x: BX + 10, y: this.y + (Math.random() - 0.5) * 20, warn: FLAK_WARN, boom: 0, scroll: true });
            this.popup("GEZIEN!", BX, this.y - 70, "#ff4040");
          }
        } else l.seen = Math.min(l.seen + dt, 0);
      }
      // random flak too
      this.flakTimer -= dt;
      if (this.flakTimer <= 0) {
        this.flakTimer = 2600 + Math.random() * 1600;
        this.flak.push({ x: BX + 40 + Math.random() * 160, y: 60 + Math.random() * 220, warn: FLAK_WARN + 300, boom: 0, scroll: true });
      }
      for (const f of this.flak) {
        if (f.scroll) f.x -= SCROLL * s;
        if (f.warn > 0) {
          f.warn -= dt;
          if (f.warn <= 0) {
            f.boom = 450;
            if (Math.hypot(BX - f.x, this.y - 10 - f.y) < FLAK_R + 18) this.hurt("Luchtafweer!");
          }
        } else {
          f.boom -= dt;
          if (f.boom <= 0) f.done = true;
        }
        if (this.over) return;
      }
      this.flak = this.flak.filter((f) => !f.done);

      const last = this.targets[this.targets.length - 1];
      if (last.wx - this.scroll < -80 && !this.drops.length) this.done = 1200;
    },

    drawWorld(ctx, t, scroll) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#0a0e22");
      g.addColorStop(1, "#1a2040");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      for (const st of STARS) ctx.fillRect(((st.x - scroll * 0.05) % W + W) % W, st.y, 1.5, 1.5);
      ctx.fillStyle = "#e8e8d0";
      ctx.beginPath();
      ctx.arc(W - 80, 60, 18, 0, Math.PI * 2);
      ctx.fill();
      // land
      ctx.fillStyle = "#121a12";
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 8) ctx.lineTo(x, groundY(scroll + x));
      ctx.lineTo(W, H);
      ctx.fill();
    },

    render(ctx, t) {
      this.drawWorld(ctx, t, this.scroll);

      // targets: villages with a lit cross
      for (const tg of this.targets) {
        const sx = tg.wx - this.scroll;
        if (sx < -40 || sx > W + 40) continue;
        const gy = groundY(tg.wx);
        ctx.fillStyle = "#2a2a22";
        ctx.fillRect(sx - 34, gy - 16, 18, 16);
        ctx.fillRect(sx + 18, gy - 14, 16, 14);
        ctx.fillStyle = "rgba(255,220,120,0.8)";
        ctx.fillRect(sx - 30, gy - 11, 4, 4);
        ctx.fillRect(sx + 23, gy - 9, 4, 4);
        ctx.strokeStyle = tg.hit ? "#6ee07a" : `rgba(255,220,80,${0.6 + 0.4 * Math.sin(t * 6)})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(sx - 9, gy - 9);
        ctx.lineTo(sx + 9, gy + 3);
        ctx.moveTo(sx + 9, gy - 9);
        ctx.lineTo(sx - 9, gy + 3);
        ctx.stroke();
      }

      // searchlights
      for (const l of this.lights) {
        const sx = l.wx - this.scroll;
        if (sx < -60 || sx > W + 60) continue;
        const gy = groundY(l.wx);
        const a = this.lightAngle(l);
        const g = ctx.createRadialGradient(sx, gy, 4, sx, gy, LIGHT_LEN);
        g.addColorStop(0, "rgba(255,250,200,0.4)");
        g.addColorStop(1, "rgba(255,250,200,0.03)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(sx, gy);
        ctx.arc(sx, gy, LIGHT_LEN, a - LIGHT_ARC, a + LIGHT_ARC);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#555";
        ctx.fillRect(sx - 6, gy - 8, 12, 8);
      }

      // drop guide: a package lands right below you after it falls, by then
      // the land has slid on - so a cross under this marker gets hit
      const fall = Math.sqrt((2 * Math.max(0, groundY(this.scroll + BX) - this.y - 30)) / GRAVITY);
      const mx = BX + SCROLL * fall;
      const my = groundY(this.scroll + mx);
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.setLineDash([3, 6]);
      ctx.beginPath();
      ctx.moveTo(BX, this.y + 36);
      ctx.lineTo(mx, my - 14);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.beginPath();
      ctx.moveTo(mx, my - 6);
      ctx.lineTo(mx - 6, my - 16);
      ctx.lineTo(mx + 6, my - 16);
      ctx.fill();

      for (const d of this.drops) {
        ctx.fillStyle = "#c8a060";
        ctx.fillRect(d.x - 5, d.y - 5, 10, 10);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(d.x - 5, d.y - 5);
        ctx.lineTo(d.x, d.y - 12);
        ctx.lineTo(d.x + 5, d.y - 5);
        ctx.stroke();
      }

      // balloon
      const by = this.y;
      ctx.globalAlpha = this.invuln > 0 && Math.floor(t * 12) % 2 ? 0.5 : 1;
      ctx.fillStyle = "#c04040";
      ctx.beginPath();
      ctx.ellipse(BX, by - 28, 28, 34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e0c040";
      ctx.fillRect(BX - 28, by - 30, 56, 6);
      ctx.strokeStyle = "#8a6a3a";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(BX - 18, by);
      ctx.lineTo(BX - 9, by + 22);
      ctx.moveTo(BX + 18, by);
      ctx.lineTo(BX + 9, by + 22);
      ctx.stroke();
      if (G.held.up) {
        ctx.fillStyle = `rgba(255,${150 + Math.random() * 100},40,0.9)`;
        ctx.beginPath();
        ctx.arc(BX, by + 6, 5 + Math.random() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#8a6a3a";
      ctx.fillRect(BX - 11, by + 22, 22, 14);
      G.drawKid(ctx, BX, by + 30, 0.35, G.spyLook(), { adult: true, t });
      ctx.globalAlpha = 1;

      for (const f of this.flak) {
        if (f.warn > 0) {
          const k = 1 - f.warn / FLAK_WARN;
          ctx.strokeStyle = `rgba(255,60,60,${0.4 + 0.5 * G.clamp(k, 0, 1)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(f.x, f.y, FLAK_R * (1.4 - G.clamp(k, 0, 1) * 0.4), 0, Math.PI * 2);
          ctx.stroke();
        } else {
          const k = f.boom / 450;
          ctx.fillStyle = `rgba(255,${120 + k * 100},40,${k})`;
          ctx.beginPath();
          ctx.arc(f.x, f.y, FLAK_R, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (this.flash > 0) {
        ctx.fillStyle = `rgba(200,40,40,${0.3 * (this.flash / 400)})`;
        ctx.fillRect(0, 0, W, H);
      }

      ctx.fillStyle = "#ff6b6b";
      ctx.font = "18px Segoe UI, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("❤".repeat(Math.max(0, this.hp)), 12, 26);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 13px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`Doelen ${this.hits}/${NEED} · pakketjes ${this.packages}`, W - 12, 24);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return `Doelen ${this.hits}/${NEED} · pakketjes ${this.packages}`;
    },
  };
})();
