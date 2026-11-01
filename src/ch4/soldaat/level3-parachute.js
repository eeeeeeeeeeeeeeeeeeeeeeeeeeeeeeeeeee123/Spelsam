(() => {
  const { W, H } = G;
  const START_ALT = 3000;
  const FREEFALL = 230; // meters per second
  const CHUTE = 70;
  const PULL_MAX = 900; // the chute only opens below this
  const PULL_MIN = 150; // below this it's too late
  const STEER = 190;
  const STEER_CHUTE = 120;
  const HP = 3;
  const FLAK_WARN = 850;
  const FLAK_R = 42;
  const LAND_R = 60;
  const PY = 170; // player screen height while falling

  G.CAREER_LEVELS.soldaat[3] = {
    title: "Level 3 — Parachutesprong (23 jaar)",
    intro:
      "Je eerste missie: een sprong boven vijandelijk gebied.<br>" +
      "Stuur met <strong>← →</strong>. Een <strong>rode cirkel</strong> = er ontploft luchtafweer: ga weg!<br>" +
      "Trek je parachute met <strong>SPATIE</strong> als er <strong>TREK NU!</strong> staat (onder 900 m), en land op het <strong>groene kruis</strong>.",

    drawBackground(ctx, t) {
      this.drawSky(ctx, START_ALT, t, 0);
      G.drawKid(ctx, W / 2, PY + 30, 0.7, G.soldierLook(), { adult: true, t, pose: "crawl" });
    },

    drawSky(ctx, alt, t, scroll) {
      const k = 1 - alt / START_ALT;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, `rgb(${20 + k * 60},${30 + k * 90},${70 + k * 120})`);
      g.addColorStop(1, `rgb(${60 + k * 100},${80 + k * 110},${110 + k * 90})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // clouds rushing up
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      for (let i = 0; i < 7; i++) {
        const y = ((i * 97 - scroll * 0.9) % (H + 120) + H + 120) % (H + 120) - 60;
        const x = (i * 173) % W;
        ctx.beginPath();
        ctx.ellipse(x, y, 70, 22, 0, 0, Math.PI * 2);
        ctx.ellipse(x + 40, y + 6, 50, 18, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    },

    start(api) {
      this.api = api;
      this.p = { x: W / 2, hp: HP, flash: 0 };
      this.alt = START_ALT;
      this.chute = false;
      this.scroll = 0;
      this.flak = [];
      this.flakTimer = 900;
      this.target = 90 + Math.random() * (W - 180);
      this.drift = 0;
      this.popups = [];
      this.over = false;
      this.landed = 0;
    },

    onAction() {
      if (this.over || this.chute) return;
      if (this.alt <= PULL_MAX && this.alt > PULL_MIN) {
        this.chute = true;
        this.popups.push({ text: "Parachute open!", x: this.p.x, y: PY - 60, color: "#6ee07a", life: 900 });
      } else if (this.alt > PULL_MAX) {
        this.popups.push({ text: "Nog te hoog!", x: this.p.x, y: PY - 60, color: "#ffd24a", life: 700 });
      }
    },

    // where the ground is on screen (it rises into view below 400 m)
    groundY() {
      return PY + 40 + Math.max(0, this.alt) * 0.55;
    },

    update(dt, t) {
      if (this.over) return;
      const s = dt / 1000;
      const p = this.p;
      p.flash = Math.max(0, p.flash - dt);
      this.popups = G.updatePopups(this.popups, dt);

      if (this.landed) {
        this.landed -= dt;
        if (this.landed <= 0) {
          this.over = true;
          if (Math.abs(p.x - this.target) < LAND_R) this.api.complete();
          else this.api.fail("Je landde naast de landingsplek, midden in vijandelijk gebied.");
        }
        return;
      }

      const fall = this.chute ? CHUTE : FREEFALL;
      this.alt -= fall * s;
      this.scroll += fall * s * (this.chute ? 2 : 1.4);

      const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
      if (this.chute) this.drift = Math.sin(t * 0.7) * 25;
      p.x = G.clamp(p.x + (mx * (this.chute ? STEER_CHUTE : STEER) + this.drift) * s, 20, W - 20);

      if (this.alt <= PULL_MIN && !this.chute) {
        this.over = true;
        this.api.fail("Je trok je parachute te laat!");
        return;
      }

      // flak: telegraphed bursts, more and more near you
      if (this.alt > 250) {
        this.flakTimer -= dt;
        if (this.flakTimer <= 0) {
          this.flakTimer = (this.chute ? 1150 : 650) + Math.random() * 400;
          const near = Math.random() < 0.6;
          this.flak.push({ x: near ? p.x + (Math.random() - 0.5) * 90 : 30 + Math.random() * (W - 60), y: PY + (Math.random() - 0.5) * 120, warn: FLAK_WARN, boom: 0 });
        }
      }
      for (const f of this.flak) {
        // the burst drifts up with the scenery
        f.y -= fall * s * 0.25;
        if (f.warn > 0) {
          f.warn -= dt;
          if (f.warn <= 0) {
            f.boom = 450;
            if (Math.hypot(p.x - f.x, PY - f.y) < FLAK_R) {
              p.hp--;
              p.flash = 400;
              this.popups.push({ text: "BOEM!", x: p.x, y: PY - 50, color: "#ff6b6b", life: 800 });
              if (p.hp <= 0) {
                this.over = true;
                this.api.fail("Geraakt door luchtafweer!");
                return;
              }
            }
          }
        } else {
          f.boom -= dt;
          if (f.boom <= 0) f.done = true;
        }
      }
      this.flak = this.flak.filter((f) => !f.done);

      if (this.alt <= 0) {
        this.alt = 0;
        this.landed = 900;
        this.flak = [];
      }
    },

    render(ctx, t) {
      this.drawSky(ctx, this.alt, t, this.scroll);
      const p = this.p;

      // ground + landing cross
      const gy = this.groundY();
      if (gy < H + 20) {
        ctx.fillStyle = "#5a7a3a";
        ctx.fillRect(0, gy, W, H - gy + 10);
        ctx.fillStyle = "#4a6a2a";
        for (let i = 0; i < 12; i++) ctx.fillRect((i * 53) % W, gy + 10 + (i % 3) * 14, 26, 6);
        ctx.strokeStyle = "#6effa0";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(this.target - 20, gy + 8);
        ctx.lineTo(this.target + 20, gy + 28);
        ctx.moveTo(this.target + 20, gy + 8);
        ctx.lineTo(this.target - 20, gy + 28);
        ctx.stroke();
      }
      // landing arrow while still high
      if (gy >= H) {
        ctx.fillStyle = "#6effa0";
        ctx.beginPath();
        ctx.moveTo(this.target, H - 6);
        ctx.lineTo(this.target - 10, H - 20);
        ctx.lineTo(this.target + 10, H - 20);
        ctx.fill();
        ctx.font = "bold 10px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("LANDEN", this.target, H - 24);
      }

      // flak
      for (const f of this.flak) {
        if (f.warn > 0) {
          const k = 1 - f.warn / FLAK_WARN;
          ctx.strokeStyle = `rgba(255,60,60,${0.4 + 0.5 * k})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(f.x, f.y, FLAK_R * (1.4 - k * 0.4), 0, Math.PI * 2);
          ctx.stroke();
        } else {
          const k = f.boom / 450;
          ctx.fillStyle = `rgba(255,${120 + k * 100},40,${k})`;
          ctx.beginPath();
          ctx.arc(f.x, f.y, FLAK_R * (1.1 - k * 0.3), 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `rgba(60,60,60,${k * 0.6})`;
          ctx.beginPath();
          ctx.arc(f.x + 8, f.y - 6, FLAK_R * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // player
      const py = this.landed ? Math.min(gy + 10, PY + 30) : PY;
      if (this.chute) {
        ctx.fillStyle = "#4a6a3a";
        ctx.beginPath();
        ctx.arc(p.x, py - 70, 44, Math.PI, 0);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = 1;
        for (const dx of [-42, -14, 14, 42]) {
          ctx.beginPath();
          ctx.moveTo(p.x + dx, py - 70);
          ctx.lineTo(p.x, py - 25);
          ctx.stroke();
        }
        G.drawKid(ctx, p.x, py + 30, 0.7, G.soldierLook(), { adult: true, t, armAngle: -1.4, flash: p.flash > 0 });
        G.drawHelmet(ctx, p.x, py + 30, 0.7);
      } else {
        G.drawKid(ctx, p.x, py + 10, 0.7, G.soldierLook(), { adult: true, t, pose: "crawl", flash: p.flash > 0 });
      }

      if (!this.chute && this.alt <= PULL_MAX && this.alt > PULL_MIN) G.drawBanner(ctx, "TREK NU! (SPATIE)", "#ffd24a", 300);

      // HUD
      ctx.fillStyle = "#ff6b6b";
      ctx.font = "18px Segoe UI, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("❤".repeat(Math.max(0, p.hp)), 12, 26);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 16px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`${Math.max(0, Math.round(this.alt))} m`, W - 14, 28);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return `Hoogte ${Math.max(0, Math.round(this.alt))} m`;
    },
  };
})();
