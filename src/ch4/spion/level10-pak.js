(() => {
  const { W, H } = G;
  const R = 12;
  const SPEED = 155;
  const HP = 6;
  const INVULN_MS = 800;
  const FIRE_MS = 260;
  const BULLET_SPEED = 620;
  const COUNTDOWN_MS = 100000;
  const HACK_MS = 2600;
  const PAK_SPEED = 55;
  const PAK_STUN = 1600;
  const PAK_AIM = 1200;
  const PAK_SHOT = 300;
  const DOG_SPEED = 120;
  const DOG_HP = 3;
  const DOG_RESPAWN = 7000;
  const SILO = { x: W / 2, y: 225, r: 62 };
  const PANELS = [{ x: 64, y: 84 }, { x: W - 64, y: 84 }, { x: W / 2, y: H - 40 }];
  const CRATES = [{ x: 130, y: 250, w: 40, h: 40 }, { x: 370, y: 250, w: 40, h: 40 }, { x: 250, y: 90, w: 40, h: 30 }];
  const PAK_LOOK = { ...G.SKINS.wit, hair: "kort", hairColor: "#1a1212", eyes: G.EYES.bruin, gender: "jongen", shirt: "#4a5034", pants: "#3a4028" };

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const inCrate = (x, y) => CRATES.some((c) => x > c.x && x < c.x + c.w && y > c.y && y < c.y + c.h) || Math.hypot(x - SILO.x, y - SILO.y) < SILO.r;
  function collide(o, r = R) {
    for (const c of CRATES) {
      const cx = G.clamp(o.x, c.x, c.x + c.w), cy = G.clamp(o.y, c.y, c.y + c.h);
      const d = Math.hypot(o.x - cx, o.y - cy);
      if (d < r && d > 0) {
        o.x = cx + ((o.x - cx) / d) * r;
        o.y = cy + ((o.y - cy) / d) * r;
      }
    }
    const d = Math.hypot(o.x - SILO.x, o.y - SILO.y);
    if (d < SILO.r + r) {
      o.x = SILO.x + ((o.x - SILO.x) / (d || 1)) * (SILO.r + r);
      o.y = SILO.y + ((o.y - SILO.y) / (d || 1)) * (SILO.r + r);
    }
    o.x = G.clamp(o.x, r + 14, W - r - 14);
    o.y = G.clamp(o.y, r + 40, H - r - 8);
  }
  function sight(a, b) {
    const n = Math.ceil(dist(a, b) / 8);
    for (let i = 1; i < n; i++) if (inCrate(a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n)) return false;
    return true;
  }

  function drawDog(ctx, d, t) {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.scale(d.facing, 1);
    ctx.fillStyle = d.flash > 0 ? "#fff" : "#8a8e96";
    ctx.fillRect(-12, -10, 24, 10);
    ctx.fillRect(8, -16, 10, 8);
    ctx.fillStyle = "#ff3030";
    ctx.fillRect(14, -14, 3, 3);
    ctx.fillStyle = "#555";
    const step = Math.sin(t * 20) * 3;
    ctx.fillRect(-10, 0, 3, 8 + step);
    ctx.fillRect(7, 0, 3, 8 - step);
    ctx.restore();
  }

  G.CAREER_LEVELS.spion[10] = {
    title: "Level 10 — Eindbaas: Generaal Pak (30 jaar)",
    intro:
      "Het document onthult het plan: <strong>Generaal Pak</strong>, hoofd van de geheime politie, gaat een raket lanceren. Jij sluipt zijn basis binnen.<br>" +
      "Saboteer de <strong>3 bedieningspanelen</strong> voor de raket opstijgt: ga erbij staan en houd <strong>SPATIE</strong> ingedrukt.<br>" +
      "Pak schiet op je (rode lijn) en zijn <strong>robothonden</strong> bijten. Schiet Pak met de <strong>muis</strong>/<strong>klik</strong> om hem even te verdoven, schiet de honden kapot.",

    drawBackground(ctx, t) {
      this.drawBase(ctx, t, 0);
    },

    start(api) {
      this.api = api;
      this.p = { x: W / 2, y: H - 90, hp: HP, invuln: 0, facing: 1, moving: false };
      this.aim = { x: W / 2, y: 120 };
      this.fire = 0;
      this.bullets = [];
      this.shots = [];
      this.countdown = COUNTDOWN_MS;
      this.panels = PANELS.map((pn) => ({ ...pn, progress: 0, done: false }));
      this.pak = { x: W / 2, y: 70, stun: 0, aim: PAK_AIM + 800, flash: 0, facing: 1 };
      this.dogs = [0, 1].map((i) => ({ x: i ? W - 40 : 40, y: H / 2, hp: DOG_HP, dead: 0, flash: 0, facing: 1 }));
      this.popups = [];
      this.flash = 0;
      this.over = false;
      this.won = 0;
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 900 });
    },

    hacking() {
      return G.held.action && this.panels.find((pn) => !pn.done && dist(pn, this.p) < 30);
    },

    doFire() {
      if (this.over || this.won || this.fire > 0) return;
      this.fire = FIRE_MS;
      const p = this.p;
      const d = dist(p, this.aim) || 1;
      this.bullets.push({ x: p.x, y: p.y - 10, vx: ((this.aim.x - p.x) / d) * BULLET_SPEED, vy: ((this.aim.y - p.y) / d) * BULLET_SPEED });
    },

    onAction() {
      if (!this.hacking()) this.doFire();
    },
    onPointer(x, y) {
      this.aim = { x, y };
      this.doFire();
    },
    onPointerMove(x, y) {
      this.aim = { x, y };
    },

    hurt(text) {
      const p = this.p;
      if (p.invuln > 0 || this.over || this.won) return;
      p.hp--;
      p.invuln = INVULN_MS;
      this.flash = 300;
      this.popup(text, p.x, p.y - 40, "#ff6b6b");
      for (const pn of this.panels) if (!pn.done) pn.progress = Math.max(0, pn.progress - 600);
      if (p.hp <= 0) {
        this.over = true;
        this.api.fail("Generaal Pak heeft je te pakken. De raket stijgt op...");
      }
    },

    update(dt, t) {
      if (this.over) return;
      const s = dt / 1000;
      const p = this.p, k = this.pak;
      this.fire = Math.max(0, this.fire - dt);
      this.flash = Math.max(0, this.flash - dt);
      p.invuln = Math.max(0, p.invuln - dt);
      k.flash = Math.max(0, k.flash - dt);
      this.popups = G.updatePopups(this.popups, dt);

      if (this.won) {
        this.won -= dt;
        if (this.won <= 0) {
          this.over = true;
          this.api.complete();
        }
        return;
      }

      this.countdown -= dt;
      if (this.countdown <= 0) {
        this.over = true;
        this.api.fail("De raket is gelanceerd... Te laat!");
        return;
      }

      // sabotage: hold SPACE at a panel
      const hack = this.hacking();
      if (hack) {
        hack.progress += dt;
        if (hack.progress >= HACK_MS) {
          hack.done = true;
          const left = this.panels.filter((pn) => !pn.done).length;
          this.popup(left ? `Paneel gesaboteerd! Nog ${left}` : "ALLE PANELEN KAPOT!", hack.x, hack.y - 30, "#6ee07a");
          if (!left) {
            this.won = 4200;
            this.shots = [];
            return;
          }
        }
      } else {
        if (G.held.action) this.doFire();
        const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
        const my = (G.held.down ? 1 : 0) - (G.held.up ? 1 : 0);
        p.moving = !!(mx || my);
        if (p.moving) {
          const len = Math.hypot(mx, my);
          p.x += (mx / len) * SPEED * s;
          p.y += (my / len) * SPEED * s;
          collide(p);
        }
      }
      p.facing = this.aim.x >= p.x ? 1 : -1;

      // General Pak: walks after you, aims, fires
      if (k.stun > 0) k.stun -= dt;
      else {
        const d = dist(k, p);
        k.facing = p.x >= k.x ? 1 : -1;
        if (d > 150) {
          k.x += ((p.x - k.x) / d) * PAK_SPEED * s;
          k.y += ((p.y - k.y) / d) * PAK_SPEED * s;
          collide(k);
        }
        if (sight(k, p)) {
          k.aim -= dt;
          if (k.aim <= 0) {
            k.aim = PAK_AIM + Math.random() * 600;
            const a = Math.atan2(p.y - k.y, p.x - k.x);
            for (const off of [-0.08, 0.08]) this.shots.push({ x: k.x, y: k.y - 10, vx: Math.cos(a + off) * PAK_SHOT, vy: Math.sin(a + off) * PAK_SHOT });
          }
        } else k.aim = Math.max(k.aim, 500);
      }

      // robot dogs
      for (const dg of this.dogs) {
        dg.flash = Math.max(0, dg.flash - dt);
        if (dg.dead > 0) {
          dg.dead -= dt;
          if (dg.dead <= 0) {
            dg.hp = DOG_HP;
            dg.x = Math.random() < 0.5 ? 30 : W - 30;
            dg.y = 60;
          }
          continue;
        }
        const d = dist(dg, p) || 1;
        dg.facing = p.x >= dg.x ? 1 : -1;
        dg.x += ((p.x - dg.x) / d) * DOG_SPEED * s;
        dg.y += ((p.y - dg.y) / d) * DOG_SPEED * s;
        collide(dg, 10);
        if (d < 22) {
          this.hurt("Hap!");
          dg.x -= ((p.x - dg.x) / d) * 50;
          dg.y -= ((p.y - dg.y) / d) * 50;
          collide(dg, 10);
        }
      }

      for (const b of this.shots) {
        b.x += b.vx * s;
        b.y += b.vy * s;
        if (b.x < 0 || b.x > W || b.y < 30 || b.y > H || inCrate(b.x, b.y)) b.done = true;
        else if (dist(b, { x: p.x, y: p.y - 10 }) < R + 3) {
          b.done = true;
          this.hurt("-1 ❤");
        }
      }
      this.shots = this.shots.filter((b) => !b.done);
      if (this.over) return;

      for (const b of this.bullets) {
        b.x += b.vx * s;
        b.y += b.vy * s;
        if (b.x < 0 || b.x > W || b.y < 30 || b.y > H || inCrate(b.x, b.y)) { b.done = true; continue; }
        for (const dg of this.dogs) {
          if (dg.dead > 0 || dist(b, { x: dg.x, y: dg.y - 6 }) > 14) continue;
          b.done = true;
          dg.hp--;
          dg.flash = 90;
          if (dg.hp <= 0) {
            dg.dead = DOG_RESPAWN;
            this.popup("Hond kapot!", dg.x, dg.y - 20, "#6ee07a");
          }
          break;
        }
        if (!b.done && dist(b, { x: k.x, y: k.y - 10 }) < R + 4) {
          b.done = true;
          k.stun = PAK_STUN;
          k.flash = 120;
          this.popup("Verdoofd!", k.x, k.y - 40, "#ffd24a");
        }
      }
      this.bullets = this.bullets.filter((b) => !b.done);
    },

    drawBase(ctx, t, launch) {
      ctx.fillStyle = "#2a2e2a";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#353a35";
      ctx.fillRect(14, 40, W - 28, H - 48);
      ctx.fillStyle = "#c0a020";
      for (let k = 0; k < 12; k++) ctx.fillRect(16 + k * 46, 40, 22, 4);
      // silo with the rocket
      ctx.fillStyle = "#1a1c1a";
      ctx.beginPath();
      ctx.arc(SILO.x, SILO.y, SILO.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#c0a020";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.save();
      ctx.translate(SILO.x, SILO.y);
      ctx.rotate(launch);
      ctx.fillStyle = "#e8e8e0";
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#c02020";
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = "#c02020";
        ctx.save();
        ctx.rotate((i * Math.PI) / 2);
        ctx.fillRect(22, -5, 14, 10);
        ctx.restore();
      }
      ctx.restore();
      for (const c of CRATES) {
        ctx.fillStyle = "#5a4a32";
        ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.strokeStyle = "#3a2a1a";
        ctx.lineWidth = 2;
        ctx.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
      }
    },

    render(ctx, t) {
      const p = this.p, k = this.pak;
      const fizzle = this.won ? 1 - this.won / 4200 : 0;
      this.drawBase(ctx, t, fizzle * 3);

      for (const pn of this.panels) {
        ctx.fillStyle = pn.done ? "#2a2a2a" : "#3a5a7a";
        ctx.fillRect(pn.x - 16, pn.y - 12, 32, 24);
        ctx.fillStyle = pn.done ? "#ff4040" : Math.floor(t * 3) % 2 ? "#6ee07a" : "#2a6a3a";
        ctx.fillRect(pn.x - 10, pn.y - 6, 20, 8);
        if (pn.done) {
          ctx.fillStyle = "rgba(90,90,90,0.5)";
          ctx.beginPath();
          ctx.arc(pn.x + Math.sin(t * 3) * 3, pn.y - 20 - ((t * 20) % 15), 7, 0, Math.PI * 2);
          ctx.fill();
        } else if (pn.progress > 0) {
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(pn.x - 20, pn.y - 24, 40, 5);
          ctx.fillStyle = "#6ee07a";
          ctx.fillRect(pn.x - 20, pn.y - 24, 40 * (pn.progress / HACK_MS), 5);
        }
        if (!pn.done && dist(pn, p) < 30 && !G.held.action) {
          ctx.fillStyle = "#6ee07a";
          ctx.font = "bold 10px Segoe UI, Roboto, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("houd SPATIE", pn.x, pn.y + 26);
        }
      }

      for (const dg of this.dogs) if (dg.dead <= 0) drawDog(ctx, dg, t);

      // Pak
      if (!k.stun && sight(k, p) && k.aim < 500) {
        ctx.strokeStyle = "rgba(255,40,40,0.55)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(k.x, k.y - 10);
        ctx.lineTo(p.x, p.y - 10);
        ctx.stroke();
      }
      const kHand = G.drawKid(ctx, k.x, k.y + 14, 0.6, PAK_LOOK, { adult: true, t, facing: k.facing, angry: true, flash: k.flash > 0, dizzy: k.stun > 0 || fizzle > 0.5, pose: fizzle > 0.5 ? "down" : "stand", armAngle: -0.1 });
      G.drawCap(ctx, k.x, k.y + 14, 0.6, k.facing, true, "#4a5034");
      if (fizzle <= 0.5) G.drawPistol(ctx, kHand.x, kHand.y, Math.atan2(p.y - k.y, p.x - k.x), 0.6, "#333");
      ctx.fillStyle = "#ffd24a";
      ctx.fillRect(k.x - 6, k.y - 12, 3, 3);
      ctx.fillRect(k.x + 1, k.y - 12, 3, 3);

      // you
      const ang = Math.atan2(this.aim.y - p.y, this.aim.x - p.x);
      const hacking = this.hacking();
      const hand = G.drawKid(ctx, p.x, p.y + 14, 0.5, G.spyLook(), { adult: true, t, facing: p.facing, pose: p.moving && !hacking ? "walk" : "stand", flash: p.invuln > 0, armAngle: hacking ? -0.6 : G.clamp(p.facing === 1 ? ang : Math.PI - ang, -1.4, 1) });
      G.drawShades(ctx, p.x, p.y + 14, 0.5, p.facing);
      if (!hacking) G.drawPistol(ctx, hand.x, hand.y, ang, 0.7);

      ctx.fillStyle = "#333";
      for (const b of this.bullets) ctx.fillRect(b.x - 2, b.y - 1, 4, 2);
      ctx.fillStyle = "#ff5030";
      for (const b of this.shots) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.aim.x, this.aim.y, 8, 0, Math.PI * 2);
      ctx.stroke();

      if (this.flash > 0) {
        ctx.fillStyle = `rgba(200,40,40,${0.3 * (this.flash / 300)})`;
        ctx.fillRect(0, 0, W, H);
      }
      if (this.won) {
        ctx.fillStyle = `rgba(255,${160 + fizzle * 80},60,${Math.max(0, 0.5 - fizzle * 0.5)})`;
        ctx.beginPath();
        ctx.arc(SILO.x, SILO.y, 40 + fizzle * 180, 0, Math.PI * 2);
        ctx.fill();
        G.drawBanner(ctx, "Raket gesaboteerd! Missie geslaagd!", "#6ee07a", 120);
        if (fizzle > 0.4) G.drawBubble(ctx, k.x, k.y - 40, "Nee! Mijn raket!");
      }

      // HUD: countdown
      const secs = Math.ceil(this.countdown / 1000);
      ctx.fillStyle = secs <= 20 ? "#ff4040" : "#fff";
      ctx.font = "bold 18px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`LANCERING OVER ${secs}s`, W / 2, 28);
      ctx.fillStyle = "#ff6b6b";
      ctx.font = "16px Segoe UI, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("❤".repeat(Math.max(0, p.hp)), 12, 28);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`Panelen ${this.panels.filter((pn) => pn.done).length}/3`, W - 12, 26);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return `Panelen ${this.panels.filter((pn) => pn.done).length}/3 · lancering over ${Math.ceil(this.countdown / 1000)}s`;
    },
  };
})();
