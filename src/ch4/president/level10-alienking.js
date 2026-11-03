(() => {
  const { W, H } = G;
  const SPEED = 200;
  const HP = 6;
  const INVULN_MS = 1000;
  const FIRE_MS = 160;
  const BULLET_SPEED = 620;
  const BOSS_HP = 55;
  const BOSS = { x: 440, y: H / 2 };
  const EYE_R = 22;
  const EYE_OPEN_MS = 2600;
  const EYE_CLOSED_MS = 1800;
  const SWEEP_WARN = 950;
  const SWEEP_MS = 700;
  const BAND = 70;
  const LASER_WARN = 1100;
  const LASER_MS = 800;

  function drawShip(ctx, x, y, flash) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = flash ? 0.5 : 1;
    ctx.fillStyle = "#e8e8f0";
    ctx.beginPath();
    ctx.moveTo(30, 0);
    ctx.lineTo(-18, -14);
    ctx.lineTo(-12, 0);
    ctx.lineTo(-18, 14);
    ctx.fill();
    ctx.fillStyle = "#1c2a5a";
    ctx.fillRect(-14, -3, 30, 6);
    ctx.fillStyle = "#f0c030";
    ctx.fillRect(-18, -16, 10, 3);
    ctx.fillRect(-18, 13, 10, 3);
    ctx.fillStyle = `rgba(255,${150 + Math.random() * 100},40,0.9)`;
    ctx.beginPath();
    ctx.moveTo(-14, -5);
    ctx.lineTo(-26 - Math.random() * 8, 0);
    ctx.lineTo(-14, 5);
    ctx.fill();
    ctx.restore();
  }

  G.CAREER_LEVELS.president[10] = {
    title: "Level 10 — Eindbaas: De Alienkoning (30 jaar)",
    intro:
      "Je bent 30 en vliegt het <strong>moederschip</strong> binnen. Daar wacht de <strong>Alienkoning</strong>.<br>" +
      "Vliegen met de <strong>pijltjes / WASD</strong>, schieten met <strong>SPATIE</strong> of de <strong>muis</strong>. Je raakt hem alleen in zijn <strong>oog als het open is</strong>.<br>" +
      "Rode strook = daar zwiept een <strong>tentakel</strong> doorheen. Rode lijn = <strong>laseroog</strong>. Hoe bozer hij wordt, hoe meer hij doet!",

    drawBackground(ctx, t) {
      this.drawHall(ctx, t);
      this.drawKing(ctx, t, { eye: 1, flash: 0, hp: BOSS_HP, phase: 0 });
    },

    drawHall(ctx, t) {
      ctx.fillStyle = "#0a1a14";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(110,255,180,0.08)";
      ctx.lineWidth = 2;
      for (let x = -((t * 40) % 60); x < W; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 30, H);
        ctx.stroke();
      }
    },

    drawKing(ctx, t, b) {
      const bob = Math.sin(t * 1.5) * 6;
      const x = BOSS.x, y = BOSS.y + bob;
      // tentacles
      for (let i = 0; i < 6; i++) {
        ctx.strokeStyle = "#3a8a5a";
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(x - 10, y + 40);
        const a = Math.sin(t * 2 + i) * 30;
        ctx.quadraticCurveTo(x - 60 - i * 6, y + 70 + a, x - 30 + i * 22, H + 10);
        ctx.stroke();
      }
      // head
      ctx.fillStyle = b.flash > 0 ? "#fff" : ["#5ac07a", "#6ac060", "#c0a040"][b.phase];
      ctx.beginPath();
      ctx.ellipse(x, y, 90, 110, 0, 0, Math.PI * 2);
      ctx.fill();
      // crown
      ctx.fillStyle = "#f0c030";
      ctx.beginPath();
      ctx.moveTo(x - 50, y - 96);
      for (let i = 0; i <= 5; i++) ctx.lineTo(x - 50 + i * 20, y - (i % 2 ? 140 : 108));
      ctx.lineTo(x + 50, y - 96);
      ctx.fill();
      // the big eye (weak spot)
      ctx.fillStyle = "#f8f8e8";
      ctx.beginPath();
      ctx.ellipse(x - 30, y - 20, EYE_R + 8, (EYE_R + 4) * b.eye + 2, 0, 0, Math.PI * 2);
      ctx.fill();
      if (b.eye > 0.2) {
        ctx.fillStyle = "#c02020";
        ctx.beginPath();
        ctx.arc(x - 34, y - 20, 11 * b.eye, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "#2a5a3a";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(x - 30, y - 20, EYE_R + 8, (EYE_R + 4) * b.eye + 2, 0, 0, Math.PI * 2);
      ctx.stroke();
      // mouth
      ctx.fillStyle = "#1a2a1a";
      ctx.beginPath();
      ctx.ellipse(x - 36, y + 40, 26, 10 + Math.sin(t * 6) * 3, 0, 0, Math.PI * 2);
      ctx.fill();
    },

    start(api) {
      this.api = api;
      this.p = { x: 90, y: H / 2, hp: HP, invuln: 0 };
      this.boss = { hp: BOSS_HP, flash: 0, eye: 0, eyeOpen: false, eyeT: 1500, phase: 0, atk: 2000, ting: 0 };
      this.fire = 0;
      this.bullets = [];
      this.orbs = [];
      this.sweeps = [];
      this.lasers = [];
      this.minions = [];
      this.popups = [];
      this.flash = 0;
      this.over = false;
      this.won = 0;
      this.time = 0;
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 800 });
    },

    doFire() {
      if (this.over || this.won || this.fire > 0) return;
      this.fire = FIRE_MS;
      this.bullets.push({ x: this.p.x + 28, y: this.p.y, vx: BULLET_SPEED, vy: 0 });
    },
    onAction() { this.doFire(); },
    onPointer() { this.doFire(); },

    hurt() {
      const p = this.p;
      if (p.invuln > 0 || this.over || this.won) return;
      p.hp--;
      p.invuln = INVULN_MS;
      this.flash = 300;
      this.popup("-1 ❤", p.x, p.y - 30, "#ff6b6b");
      if (p.hp <= 0) {
        this.over = true;
        this.api.fail("De Alienkoning heeft gewonnen... de aarde is van hem.");
      }
    },

    attack() {
      const b = this.boss, p = this.p;
      const options = ["sweep", "orbs"];
      if (b.phase >= 1) options.push("laser", "laser");
      if (b.phase >= 2) options.push("minions");
      const a = G.pick(options);
      if (a === "sweep") {
        const n = b.phase >= 2 ? 2 : 1;
        for (let i = 0; i < n; i++) {
          const y = i === 0 ? G.clamp(p.y, BAND / 2, H - BAND / 2) : G.clamp(p.y + (Math.random() < 0.5 ? -1 : 1) * 140, BAND / 2, H - BAND / 2);
          this.sweeps.push({ y, warn: SWEEP_WARN, hit: SWEEP_MS });
        }
      } else if (a === "orbs") {
        const n = 5 + b.phase * 2;
        for (let i = 0; i < n; i++) {
          const ang = Math.PI + (i - (n - 1) / 2) * 0.22;
          this.orbs.push({ x: BOSS.x - 36, y: BOSS.y + 40, vx: Math.cos(ang) * 170, vy: Math.sin(ang) * 170 });
        }
      } else if (a === "laser") {
        const from = { x: BOSS.x - 34, y: BOSS.y - 20 };
        this.lasers.push({ from, ang: Math.atan2(p.y - from.y, p.x - from.x), warn: LASER_WARN, hit: LASER_MS });
      } else {
        for (let i = 0; i < 3; i++) this.minions.push({ x: BOSS.x - 60, y: 80 + i * 140, hp: 2, t: i, flash: 0 });
      }
    },

    update(dt, t) {
      if (this.over) return;
      const s = dt / 1000;
      const p = this.p, b = this.boss;
      this.time += dt;
      this.fire = Math.max(0, this.fire - dt);
      this.flash = Math.max(0, this.flash - dt);
      p.invuln = Math.max(0, p.invuln - dt);
      b.flash = Math.max(0, b.flash - dt);
      b.ting = Math.max(0, b.ting - dt);
      this.popups = G.updatePopups(this.popups, dt);

      if (this.won) {
        this.won -= dt;
        if (this.won <= 0) {
          this.over = true;
          this.api.complete();
        }
        return;
      }
      if (G.held.action || G.mouseDown) this.doFire();

      const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
      const my = (G.held.down ? 1 : 0) - (G.held.up ? 1 : 0);
      if (mx || my) {
        const len = Math.hypot(mx, my);
        p.x = G.clamp(p.x + (mx / len) * SPEED * s, 30, 320);
        p.y = G.clamp(p.y + (my / len) * SPEED * s, 24, H - 24);
      }

      // eye opens and closes
      b.eyeT -= dt;
      if (b.eyeT <= 0) {
        b.eyeOpen = !b.eyeOpen;
        b.eyeT = b.eyeOpen ? EYE_OPEN_MS : EYE_CLOSED_MS - b.phase * 300;
      }
      b.eye += ((b.eyeOpen ? 1 : 0) - b.eye) * Math.min(1, s * 8);

      b.atk -= dt;
      if (b.atk <= 0) {
        b.atk = 2400 - b.phase * 450 + Math.random() * 700;
        this.attack();
      }

      for (const sw of this.sweeps) {
        if (sw.warn > 0) sw.warn -= dt;
        else {
          sw.hit -= dt;
          if (Math.abs(p.y - sw.y) < BAND / 2) this.hurt();
          if (sw.hit <= 0) sw.done = true;
        }
      }
      for (const l of this.lasers) {
        if (l.warn > 0) l.warn -= dt;
        else {
          l.hit -= dt;
          // distance from you to the beam line
          const dx = p.x - l.from.x, dy = p.y - l.from.y;
          const along = dx * Math.cos(l.ang) + dy * Math.sin(l.ang);
          const off = Math.abs(-dx * Math.sin(l.ang) + dy * Math.cos(l.ang));
          if (along > 0 && off < 16) this.hurt();
          if (l.hit <= 0) l.done = true;
        }
      }
      for (const o of this.orbs) {
        o.x += o.vx * s;
        o.y += o.vy * s;
        if (Math.hypot(o.x - p.x, o.y - p.y) < 14) {
          o.done = true;
          this.hurt();
        }
        if (o.x < -10 || o.y < -10 || o.y > H + 10) o.done = true;
      }
      for (const m of this.minions) {
        m.flash = Math.max(0, m.flash - dt);
        m.t += s;
        const d = Math.hypot(p.x - m.x, p.y - m.y) || 1;
        m.x += ((p.x - m.x) / d) * 90 * s;
        m.y += ((p.y - m.y) / d) * 90 * s + Math.sin(m.t * 4) * 30 * s;
        if (d < 20) {
          m.done = true;
          this.hurt();
        }
      }
      if (this.over) return;

      for (const bl of this.bullets) {
        bl.x += bl.vx * s;
        if (bl.x > W + 10) { bl.done = true; continue; }
        for (const m of this.minions) {
          if (m.done || Math.hypot(bl.x - m.x, bl.y - m.y) > 14) continue;
          bl.done = true;
          m.hp--;
          m.flash = 80;
          if (m.hp <= 0) m.done = true;
          break;
        }
        if (bl.done) continue;
        const eye = { x: BOSS.x - 30, y: BOSS.y - 20 + Math.sin(t * 1.5) * 6 };
        // shots at eye height hit the eye as soon as they reach the face
        if (Math.abs(bl.y - eye.y) < EYE_R + 6 && bl.x > BOSS.x - 95) {
          bl.done = true;
          if (b.eye > 0.6) {
            b.hp--;
            b.flash = 70;
            const phase = b.hp <= BOSS_HP / 3 ? 2 : b.hp <= (BOSS_HP * 2) / 3 ? 1 : 0;
            if (phase > b.phase) {
              b.phase = phase;
              this.popup(phase === 1 ? "Hij wordt BOOS! Laseroog!" : "WOEDEND! Hij roept hulp!", BOSS.x - 60, 60, "#ff8a3a");
            }
            if (b.hp <= 0) {
              this.won = 3500;
              this.sweeps = [];
              this.lasers = [];
              this.orbs = [];
              this.minions = [];
            }
          } else {
            b.ting = 120;
          }
        } else if (((bl.x - BOSS.x) / 90) ** 2 + ((bl.y - BOSS.y) / 110) ** 2 < 1) bl.done = true;
      }
      for (const key of ["bullets", "orbs", "sweeps", "lasers", "minions"]) this[key] = this[key].filter((o) => !o.done);
    },

    render(ctx, t) {
      this.drawHall(ctx, t);
      const b = this.boss, p = this.p;
      if (!this.won || Math.floor(t * 10) % 2) this.drawKing(ctx, t, b);

      for (const sw of this.sweeps) {
        if (sw.warn > 0) {
          ctx.fillStyle = `rgba(255,50,50,${0.15 + 0.12 * Math.sin(t * 20)})`;
          ctx.fillRect(0, sw.y - BAND / 2, BOSS.x - 60, BAND);
        } else {
          const k = 1 - sw.hit / SWEEP_MS;
          ctx.fillStyle = "#3a8a5a";
          ctx.beginPath();
          ctx.roundRect(BOSS.x - 70 - k * (BOSS.x - 40), sw.y - 16, BOSS.x - 20, 32, 16);
          ctx.fill();
        }
      }
      for (const l of this.lasers) {
        ctx.strokeStyle = l.warn > 0 ? `rgba(255,40,40,${0.3 + 0.3 * Math.sin(t * 25)})` : "rgba(255,60,60,0.9)";
        ctx.lineWidth = l.warn > 0 ? 2 : 22;
        ctx.beginPath();
        ctx.moveTo(l.from.x, l.from.y);
        ctx.lineTo(l.from.x + Math.cos(l.ang) * 900, l.from.y + Math.sin(l.ang) * 900);
        ctx.stroke();
      }
      ctx.fillStyle = "#a0ff60";
      for (const o of this.orbs) {
        ctx.beginPath();
        ctx.arc(o.x, o.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const m of this.minions) {
        ctx.fillStyle = m.flash > 0 ? "#fff" : "#6ae07a";
        ctx.beginPath();
        ctx.ellipse(m.x, m.y, 13, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#111";
        ctx.fillRect(m.x - 5, m.y - 3, 3, 4);
        ctx.fillRect(m.x + 2, m.y - 3, 3, 4);
      }

      drawShip(ctx, p.x, p.y, p.invuln > 0 && Math.floor(t * 12) % 2);
      ctx.fillStyle = "#ffe066";
      for (const bl of this.bullets) ctx.fillRect(bl.x - 4, bl.y - 1, 8, 2);
      if (b.ting > 0) {
        ctx.fillStyle = "#fff";
        ctx.font = "bold 11px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("TING! Oog dicht", BOSS.x - 30, BOSS.y - 70);
      }

      if (this.flash > 0) {
        ctx.fillStyle = `rgba(200,40,40,${0.3 * (this.flash / 300)})`;
        ctx.fillRect(0, 0, W, H);
      }
      if (this.won) {
        const k = 1 - this.won / 3500;
        ctx.fillStyle = `rgba(255,${150 + k * 100},60,${Math.max(0, 0.6 - k * 0.6)})`;
        ctx.beginPath();
        ctx.arc(BOSS.x, BOSS.y, 60 + k * 300, 0, Math.PI * 2);
        ctx.fill();
        G.drawBanner(ctx, "De Alienkoning is verslagen! De aarde is gered!", "#6ee07a", 110);
      }

      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(W / 2 - 130, 10, 260, 10);
      ctx.fillStyle = ["#6affb0", "#ffd24a", "#ff5050"][b.phase];
      ctx.fillRect(W / 2 - 130, 10, 260 * Math.max(0, b.hp / BOSS_HP), 10);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`De Alienkoning — fase ${b.phase + 1}/3`, W / 2, 32);
      ctx.fillStyle = "#ff6b6b";
      ctx.font = "16px Segoe UI, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("❤".repeat(Math.max(0, p.hp)), 12, 26);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return `De Alienkoning ${Math.max(0, this.boss.hp)}/${BOSS_HP}`;
    },
  };
})();
