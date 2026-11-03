(() => {
  const { W, H } = G;
  const SPEED = 200;
  const HP = 5;
  const INVULN_MS = 1000;
  const FIRE_MS = 170;
  const BULLET_SPEED = 600;
  const FLIGHT_MS = 60000;
  const SPREAD_MS = 8000;
  const SHIELD_MS = 6000;
  const STARS = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * H, z: 0.3 + Math.random() * 1.2 }));

  function drawShip(ctx, x, y, t, shield, flash) {
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
    ctx.fillStyle = "rgba(140,200,255,0.8)";
    ctx.beginPath();
    ctx.ellipse(8, 0, 7, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255,${150 + Math.random() * 100},40,0.9)`;
    ctx.beginPath();
    ctx.moveTo(-14, -5);
    ctx.lineTo(-26 - Math.random() * 8, 0);
    ctx.lineTo(-14, 5);
    ctx.fill();
    if (shield) {
      ctx.strokeStyle = `rgba(120,220,255,${0.5 + 0.3 * Math.sin(t * 10)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(2, 0, 28, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  G.CAREER_LEVELS.president[9] = {
    title: "Level 9 — Ruimtereis (29 jaar)",
    intro:
      "De aliens vluchten naar hun <strong>moederschip</strong>. Jij stapt in de <strong>Space Force One</strong> en gaat erachteraan!<br>" +
      "Vliegen met de <strong>pijltjes / WASD</strong>, schieten met <strong>SPATIE</strong> (ingedrukt houden) of de <strong>muis</strong>.<br>" +
      "Ontwijk <strong>meteorieten</strong> en UFO-schoten. Pak <strong>power-ups</strong>: 🔱 driedubbel schot, 🛡️ schild. Overleef de reis van <strong>60 seconden</strong>!",

    drawBackground(ctx, t) {
      this.drawSpace(ctx, t, 0);
      drawShip(ctx, 90, H / 2, t, false, false);
    },

    drawSpace(ctx, t, scroll) {
      ctx.fillStyle = "#06061a";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#fff";
      for (const st of STARS) {
        const x = (((st.x - scroll * st.z) % W) + W) % W;
        ctx.globalAlpha = st.z / 1.5;
        ctx.fillRect(x, st.y, st.z * 1.5, st.z * 1.5);
      }
      ctx.globalAlpha = 1;
      // Earth shrinking behind you, the mothership growing ahead
      const k = Math.min(1, scroll / 9000);
      ctx.fillStyle = "#2a6ab8";
      ctx.beginPath();
      ctx.arc(-60 - k * 120, H - 40, 120 * (1 - k * 0.7), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(120,255,180,0.25)";
      ctx.beginPath();
      ctx.ellipse(W + 160 - k * 180, H / 2, 60 + k * 120, 30 + k * 60, 0, 0, Math.PI * 2);
      ctx.fill();
    },

    start(api) {
      this.api = api;
      this.p = { x: 90, y: H / 2, hp: HP, invuln: 0, spread: 0, shield: 0 };
      this.time = FLIGHT_MS;
      this.scroll = 0;
      this.fire = 0;
      this.bullets = [];
      this.enemies = [];
      this.enemyShots = [];
      this.rocks = [];
      this.pickups = [];
      this.waveTimer = 1500;
      this.rockTimer = 2500;
      this.pickupTimer = 9000;
      this.popups = [];
      this.flash = 0;
      this.over = false;
      this.booms = [];
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 800 });
    },

    doFire() {
      if (this.over || this.fire > 0) return;
      this.fire = FIRE_MS;
      const p = this.p;
      const angles = p.spread > 0 ? [-0.18, 0, 0.18] : [0];
      for (const a of angles) this.bullets.push({ x: p.x + 28, y: p.y, vx: Math.cos(a) * BULLET_SPEED, vy: Math.sin(a) * BULLET_SPEED });
    },

    onAction() { this.doFire(); },
    onPointer() { this.doFire(); },

    hurt() {
      const p = this.p;
      if (p.invuln > 0 || this.over) return;
      if (p.shield > 0) {
        p.shield = 0;
        p.invuln = 600;
        this.popup("Schild weg!", p.x, p.y - 30, "#9fd3ff");
        return;
      }
      p.hp--;
      p.invuln = INVULN_MS;
      this.flash = 300;
      this.popup("-1 ❤", p.x, p.y - 30, "#ff6b6b");
      if (p.hp <= 0) {
        this.over = true;
        this.api.fail("De Space Force One is neergeschoten.");
      }
    },

    boom(x, y) {
      this.booms.push({ x, y, life: 400 });
    },

    spawnWave() {
      const kind = G.pick(["line", "sine", "shooter"]);
      const y0 = 60 + Math.random() * (H - 120);
      for (let i = 0; i < (kind === "shooter" ? 2 : 5); i++) {
        this.enemies.push({ kind, x: W + 30 + i * 46, y: kind === "shooter" ? 80 + i * (H - 160) : y0, y0, hp: kind === "shooter" ? 4 : 1, t: i * 0.4, shoot: 1200 + Math.random() * 800, flash: 0 });
      }
    },

    update(dt, t) {
      if (this.over) return;
      const s = dt / 1000;
      const p = this.p;
      this.scroll += 150 * s;
      this.fire = Math.max(0, this.fire - dt);
      this.flash = Math.max(0, this.flash - dt);
      p.invuln = Math.max(0, p.invuln - dt);
      p.spread = Math.max(0, p.spread - dt);
      p.shield = Math.max(0, p.shield - dt);
      this.popups = G.updatePopups(this.popups, dt);
      for (const b of this.booms) b.life -= dt;
      this.booms = this.booms.filter((b) => b.life > 0);
      if (G.held.action || G.mouseDown) this.doFire();

      this.time -= dt;
      if (this.time <= 0) {
        this.over = true;
        this.api.complete();
        return;
      }

      const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
      const my = (G.held.down ? 1 : 0) - (G.held.up ? 1 : 0);
      if (mx || my) {
        const len = Math.hypot(mx, my);
        p.x = G.clamp(p.x + (mx / len) * SPEED * s, 30, W - 200);
        p.y = G.clamp(p.y + (my / len) * SPEED * s, 24, H - 24);
      }

      const k = 1 - this.time / FLIGHT_MS;
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) {
        this.waveTimer = 3200 - k * 1200 + Math.random() * 800;
        this.spawnWave();
      }
      this.rockTimer -= dt;
      if (this.rockTimer <= 0) {
        this.rockTimer = 1700 - k * 600 + Math.random() * 900;
        this.rocks.push({ x: W + 30, y: 30 + Math.random() * (H - 60), r: 12 + Math.random() * 16, vx: -(120 + Math.random() * 90), vy: (Math.random() - 0.5) * 40, rot: 0, hp: 3 });
      }
      this.pickupTimer -= dt;
      if (this.pickupTimer <= 0) {
        this.pickupTimer = 9000 + Math.random() * 4000;
        this.pickups.push({ kind: Math.random() < 0.5 ? "spread" : "shield", x: W + 20, y: 50 + Math.random() * (H - 100) });
      }

      for (const e of this.enemies) {
        e.flash = Math.max(0, e.flash - dt);
        e.t += s;
        if (e.kind === "line") e.x -= 150 * s;
        else if (e.kind === "sine") {
          e.x -= 130 * s;
          e.y = e.y0 + Math.sin(e.t * 3) * 70;
        } else {
          e.x = Math.max(W - 90, e.x - 90 * s);
          e.y += Math.sin(e.t * 1.5) * 50 * s;
          e.shoot -= dt;
          if (e.shoot <= 0) {
            e.shoot = 1500 + Math.random() * 700;
            const a = Math.atan2(p.y - e.y, p.x - e.x);
            this.enemyShots.push({ x: e.x - 16, y: e.y, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220 });
          }
          e.life = (e.life || 0) + dt;
          if (e.life > 9000) e.x -= 400 * s;
        }
        if (Math.hypot(e.x - p.x, e.y - p.y) < 24) {
          e.dead = true;
          this.boom(e.x, e.y);
          this.hurt();
        }
        if (e.x < -40) e.dead = true;
      }
      for (const r of this.rocks) {
        r.x += r.vx * s;
        r.y += r.vy * s;
        r.rot += s;
        if (Math.hypot(r.x - p.x, r.y - p.y) < r.r + 12) {
          r.dead = true;
          this.boom(r.x, r.y);
          this.hurt();
        }
        if (r.x < -40) r.dead = true;
      }
      for (const b of this.enemyShots) {
        b.x += b.vx * s;
        b.y += b.vy * s;
        if (Math.hypot(b.x - p.x, b.y - p.y) < 14) {
          b.dead = true;
          this.hurt();
        }
        if (b.x < -10 || b.x > W + 10 || b.y < -10 || b.y > H + 10) b.dead = true;
      }
      for (const u of this.pickups) {
        u.x -= 90 * s;
        if (Math.hypot(u.x - p.x, u.y - p.y) < 24) {
          u.dead = true;
          if (u.kind === "spread") p.spread = SPREAD_MS;
          else p.shield = SHIELD_MS;
          this.popup(u.kind === "spread" ? "DRIEDUBBEL SCHOT!" : "SCHILD!", p.x, p.y - 30, "#ffd24a");
        }
        if (u.x < -20) u.dead = true;
      }
      if (this.over) return;

      for (const b of this.bullets) {
        b.x += b.vx * s;
        b.y += b.vy * s;
        if (b.x > W + 10 || b.y < -10 || b.y > H + 10) { b.dead = true; continue; }
        for (const e of this.enemies) {
          if (e.dead || Math.hypot(b.x - e.x, b.y - e.y) > 16) continue;
          b.dead = true;
          e.hp--;
          e.flash = 80;
          if (e.hp <= 0) {
            e.dead = true;
            this.boom(e.x, e.y);
          }
          break;
        }
        if (b.dead) continue;
        for (const r of this.rocks) {
          if (r.dead || Math.hypot(b.x - r.x, b.y - r.y) > r.r) continue;
          b.dead = true;
          r.hp--;
          if (r.hp <= 0) {
            r.dead = true;
            this.boom(r.x, r.y);
          }
          break;
        }
      }
      for (const key of ["bullets", "enemies", "rocks", "enemyShots", "pickups"]) this[key] = this[key].filter((o) => !o.dead);
    },

    render(ctx, t) {
      this.drawSpace(ctx, t, this.scroll);
      for (const r of this.rocks) {
        ctx.save();
        ctx.translate(r.x, r.y);
        ctx.rotate(r.rot);
        ctx.fillStyle = "#6a5a4a";
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const rr = r.r * (0.8 + ((i * 37) % 10) / 40);
          ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.fill();
        ctx.restore();
      }
      for (const e of this.enemies) {
        ctx.fillStyle = e.flash > 0 ? "#fff" : e.kind === "shooter" ? "#c060e0" : "#8ab0c0";
        ctx.beginPath();
        ctx.ellipse(e.x, e.y, e.kind === "shooter" ? 22 : 15, e.kind === "shooter" ? 9 : 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(120,255,180,0.8)";
        ctx.beginPath();
        ctx.ellipse(e.x, e.y - 4, 7, 5, 0, Math.PI, 0);
        ctx.fill();
      }
      for (const u of this.pickups) {
        ctx.fillStyle = "rgba(255,210,74,0.25)";
        ctx.beginPath();
        ctx.arc(u.x, u.y, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = "16px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(u.kind === "spread" ? "🔱" : "🛡️", u.x, u.y);
        ctx.textBaseline = "alphabetic";
      }
      const p = this.p;
      drawShip(ctx, p.x, p.y, t, p.shield > 0, p.invuln > 0 && Math.floor(t * 12) % 2);
      ctx.fillStyle = "#ffe066";
      for (const b of this.bullets) ctx.fillRect(b.x - 4, b.y - 1, 8, 2);
      ctx.fillStyle = "#ff60c0";
      for (const b of this.enemyShots) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const b of this.booms) {
        const k = b.life / 400;
        ctx.fillStyle = `rgba(255,${150 + k * 80},40,${k})`;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 22 * (1.3 - k * 0.3), 0, Math.PI * 2);
        ctx.fill();
      }
      if (this.flash > 0) {
        ctx.fillStyle = `rgba(200,40,40,${0.25 * (this.flash / 300)})`;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.fillStyle = "#ff6b6b";
      ctx.font = "18px Segoe UI, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("❤".repeat(Math.max(0, p.hp)), 12, 26);
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fillRect(W - 170, 14, 156, 8);
      ctx.fillStyle = "#6affb0";
      ctx.fillRect(W - 170, 14, 156 * (1 - this.time / FLIGHT_MS), 8);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`MOEDERSCHIP over ${Math.ceil(this.time / 1000)}s`, W - 14, 36);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return `Naar het moederschip · ${Math.ceil(this.time / 1000)}s`;
    },
  };
})();
