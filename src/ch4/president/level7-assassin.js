(() => {
  const { W, H } = G;
  const HP = 4;
  const INVULN_MS = 700;
  const FIND = 3;
  const LOCK_MS = 850;
  const FLASH_MS = 1100;
  const DOT_SPEED = 120;
  const ME = { x: W / 2, y: 390 };
  const WINDOWS = [];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) WINDOWS.push({ x: 50 + c * 110, y: 70 + r * 70, w: 30, h: 36 });
  const FOE_HP = 7;
  const PEEK_AIM = 1100;
  const CHIMNEYS = [{ x: 120 }, { x: 270 }, { x: 420 }];
  const ROOF_Y = 300;
  const FOE_LOOK = { ...G.SKINS.wit, hair: "kort", hairColor: "#d8d8d8", eyes: G.EYES.blauw, gender: "jongen", shirt: "#141414", pants: "#141414" };

  G.CAREER_LEVELS.president[7] = {
    title: "Level 7 — Moordaanslag (27 jaar)",
    intro:
      "Je geeft een speech in het park... en er verschijnt een <strong>rood laserpuntje</strong>. Een <strong>huurmoordenaar</strong> heeft jou als contract!<br>" +
      "Komt het puntje op je af en gaat het <strong>knipperen</strong>? Duik achter het spreekgestoelte met <strong>↓</strong>. Na elk schot zie je een <strong>flits</strong> in een raam: <strong>klik op dat raam</strong>. Vind hem 3 keer.<br>" +
      "Dan ga je zelf het dak op: hij duikt op achter de schoorstenen. Schiet hem (<strong>klik</strong>), duik (<strong>↓</strong>) als hij richt.",

    drawBackground(ctx, t) {
      this.phase = "speech";
      this.drawPark(ctx, t);
    },

    drawPark(ctx, t) {
      ctx.fillStyle = "#8ab8e0";
      ctx.fillRect(0, 0, W, H);
      // buildings across the street
      ctx.fillStyle = "#b8b0a0";
      ctx.fillRect(20, 40, W - 40, 170);
      ctx.fillStyle = "#a8a090";
      ctx.fillRect(20, 30, W - 40, 12);
      for (const w of WINDOWS) {
        ctx.fillStyle = "#2a3040";
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.strokeStyle = "#e8e0d0";
        ctx.lineWidth = 2;
        ctx.strokeRect(w.x, w.y, w.w, w.h);
      }
      ctx.fillStyle = "#6a9a4a";
      ctx.fillRect(0, 210, W, H - 210);
      // crowd
      for (let i = 0; i < 16; i++) {
        ctx.fillStyle = ["#c04040", "#4060c0", "#40a060", "#c0a040"][i % 4];
        const x = 20 + i * 33;
        const jump = Math.max(0, Math.sin((t || 0) * 5 + i)) * 3;
        ctx.beginPath();
        ctx.arc(x, 250 - jump, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x - 8, 258 - jump, 16, 20);
      }
      // stage + flags
      ctx.fillStyle = "#3a3a5a";
      ctx.fillRect(0, 300, W, H - 300);
      for (const fx of [60, W - 60]) {
        ctx.fillStyle = "#888";
        ctx.fillRect(fx, 230, 3, 80);
        for (let k = 0; k < 6; k++) {
          ctx.fillStyle = k % 2 ? "#fff" : "#c02020";
          ctx.fillRect(fx + 3, 232 + k * 3, 30, 3);
        }
        ctx.fillStyle = "#1c2a7a";
        ctx.fillRect(fx + 3, 232, 12, 9);
      }
    },

    drawRoof(ctx, t) {
      ctx.fillStyle = "#28304a";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#f0e8c8";
      ctx.beginPath();
      ctx.arc(W - 70, 60, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#4a4048";
      ctx.fillRect(0, ROOF_Y, W, H - ROOF_Y);
      for (const c of CHIMNEYS) {
        ctx.fillStyle = "#7a4a3a";
        ctx.fillRect(c.x - 26, ROOF_Y - 110, 52, 110);
        ctx.fillStyle = "#5a3a2a";
        ctx.fillRect(c.x - 30, ROOF_Y - 116, 60, 8);
      }
      // your low wall in front
      ctx.fillStyle = "#5a5058";
      ctx.fillRect(W / 2 - 80, H - 60, 160, 60);
    },

    start(api) {
      this.api = api;
      this.phase = "speech";
      this.hp = HP;
      this.invuln = 0;
      this.flash = 0;
      this.found = 0;
      this.sniper = G.randInt(WINDOWS.length);
      this.dot = { x: 100, y: 300, vx: DOT_SPEED, vy: 40, lock: 0 };
      this.muzzle = 0;
      this.popups = [];
      this.over = false;
      this.won = 0;
      this.aim = { x: W / 2, y: 200 };
      this.fire = 0;
      this.duck = false;
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 900 });
    },

    hurt() {
      if (this.invuln > 0) return;
      this.hp--;
      this.invuln = INVULN_MS;
      this.flash = 350;
      this.popup("Geraakt! -1 ❤", ME.x, ME.y - 90, "#ff6b6b");
      if (this.hp <= 0) {
        this.over = true;
        this.api.fail("De huurmoordenaar heeft zijn contract uitgevoerd...");
      }
    },

    onPointer(x, y) {
      this.aim = { x, y };
      if (this.over || this.won) return;
      if (this.phase === "speech") {
        const w = WINDOWS.findIndex((w) => x > w.x - 6 && x < w.x + w.w + 6 && y > w.y - 6 && y < w.y + w.h + 6);
        if (w < 0) return;
        if (w === this.sniper && this.muzzle > 0) {
          this.found++;
          this.popup(this.found >= FIND ? "Daar zit hij! Erachteraan!" : `Gevonden! (${this.found}/${FIND}) Hij verkast...`, WINDOWS[w].x + 15, WINDOWS[w].y - 6, "#6ee07a");
          this.muzzle = 0;
          if (this.found >= FIND) {
            this.phase = "toRoof";
            this.timer = 1800;
          } else {
            let n;
            do n = G.randInt(WINDOWS.length); while (n === this.sniper);
            this.sniper = n;
          }
        } else this.popup("Niemand...", WINDOWS[w].x + 15, WINDOWS[w].y - 6, "#cfcfcf");
        return;
      }
      if (this.phase === "duel") this.shoot();
    },
    onPointerMove(x, y) {
      this.aim = { x, y };
    },
    onAction() {
      if (this.phase === "duel") this.shoot();
    },

    shoot() {
      if (this.fire > 0 || this.duck || this.won || this.foe.hp <= 0) return;
      this.fire = 240;
      const f = this.foe;
      const c = CHIMNEYS[f.at];
      const fx = c.x + f.side * 34;
      if (f.peek > 0.6 && Math.abs(this.aim.x - fx) < 16 && this.aim.y > ROOF_Y - 120 && this.aim.y < ROOF_Y - 40) {
        f.hp--;
        f.flash = 120;
        this.popup("RAAK", fx, ROOF_Y - 130, "#6ee07a");
        f.state = "hide";
        f.timer = 600;
        if (f.hp <= 0) {
          this.won = 2600;
          this.popup("Huurmoordenaar uitgeschakeld!", W / 2, 120, "#6ee07a");
        }
      }
    },

    update(dt, t) {
      if (this.over) return;
      const s = dt / 1000;
      this.invuln = Math.max(0, this.invuln - dt);
      this.flash = Math.max(0, this.flash - dt);
      this.fire = Math.max(0, this.fire - dt);
      this.muzzle = Math.max(0, this.muzzle - dt);
      this.popups = G.updatePopups(this.popups, dt);
      this.duck = !!G.held.down;

      if (this.won) {
        this.won -= dt;
        if (this.won <= 0) {
          this.over = true;
          this.api.complete();
        }
        return;
      }

      if (this.phase === "speech") {
        // the laser dot wanders, homes in on you, then locks and fires
        const d = this.dot;
        const head = { x: ME.x, y: ME.y - 70 };
        if (d.lock > 0) {
          d.lock -= dt;
          d.x += (head.x - d.x) * Math.min(1, s * 8);
          d.y += (head.y - d.y) * Math.min(1, s * 8);
          if (d.lock <= 0) {
            if (!this.duck) this.hurt();
            else this.popup("Gemist! Achter het katheder!", ME.x, ME.y - 110, "#9fd3ff");
            this.muzzle = FLASH_MS;
            d.x = 60 + Math.random() * (W - 120);
            d.y = 230 + Math.random() * 60;
            d.wander = 1400 + Math.random() * 900;
          }
          return;
        }
        d.wander = (d.wander ?? 1500) - dt;
        if (d.wander > 0) {
          d.x += d.vx * s;
          d.y += d.vy * s;
          if (d.x < 30 || d.x > W - 30) d.vx = -d.vx;
          if (d.y < 220 || d.y > 420) d.vy = -d.vy;
        } else {
          const dist = Math.hypot(head.x - d.x, head.y - d.y) || 1;
          d.x += ((head.x - d.x) / dist) * DOT_SPEED * 1.6 * s;
          d.y += ((head.y - d.y) / dist) * DOT_SPEED * 1.6 * s;
          if (dist < 12) d.lock = LOCK_MS;
        }
        return;
      }

      if (this.phase === "toRoof") {
        this.timer -= dt;
        if (this.timer <= 0) {
          this.phase = "duel";
          this.foe = { at: 1, side: 1, hp: FOE_HP, state: "hide", timer: 1200, peek: 0, flash: 0 };
        }
        return;
      }

      // duel: he hides behind a chimney, peeks out and aims
      const f = this.foe;
      f.flash = Math.max(0, f.flash - dt);
      f.timer -= dt;
      if (f.state === "hide") {
        f.peek = Math.max(0, f.peek - dt / 200);
        if (f.timer <= 0) {
          f.at = G.randInt(CHIMNEYS.length);
          f.side = Math.random() < 0.5 ? -1 : 1;
          f.state = "aim";
          f.timer = PEEK_AIM;
        }
      } else if (f.state === "aim") {
        f.peek = Math.min(1, f.peek + dt / 200);
        if (f.timer <= 0) {
          if (!this.duck) this.hurt();
          else this.popup("Net op tijd gedoken!", W / 2, H - 90, "#9fd3ff");
          f.state = "hide";
          f.timer = 800 + Math.random() * 700;
        }
      }
    },

    render(ctx, t) {
      if (this.phase === "speech" || this.phase === "toRoof") {
        this.drawPark(ctx, t);
        if (this.muzzle > 0) {
          const w = WINDOWS[this.sniper];
          const k = this.muzzle / FLASH_MS;
          ctx.fillStyle = `rgba(255,230,120,${k})`;
          ctx.beginPath();
          ctx.arc(w.x + w.w / 2, w.y + w.h / 2, 8 + (1 - k) * 8, 0, Math.PI * 2);
          ctx.fill();
        }
        // you at the lectern
        const y = this.duck ? ME.y + 34 : ME.y;
        ctx.globalAlpha = this.invuln > 0 && Math.floor(t * 12) % 2 ? 0.5 : 1;
        G.drawKid(ctx, ME.x, y, 0.95, G.presLook(), { adult: true, t, armAngle: this.duck ? 0.5 : -1.3 });
        G.drawQuiff(ctx, ME.x, y, 0.95);
        G.drawTie(ctx, ME.x, y, 0.95);
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#6a4a2a";
        ctx.beginPath();
        ctx.moveTo(ME.x - 38, ME.y - 46);
        ctx.lineTo(ME.x + 38, ME.y - 46);
        ctx.lineTo(ME.x + 30, H);
        ctx.lineTo(ME.x - 30, H);
        ctx.fill();
        ctx.fillStyle = "#f0c030";
        ctx.beginPath();
        ctx.arc(ME.x, ME.y - 16, 10, 0, Math.PI * 2);
        ctx.fill();
        if (this.phase === "speech") {
          const d = this.dot;
          const blink = d.lock > 0 && Math.floor(t * 16) % 2;
          ctx.fillStyle = blink ? "#ff0000" : "rgba(255,30,30,0.85)";
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.lock > 0 ? 5 : 3.5, 0, Math.PI * 2);
          ctx.fill();
          if (d.lock > 0) G.drawBanner(ctx, "↓ BUKKEN!", "#ff4040", 330);
          if (this.muzzle > 0) {
            ctx.fillStyle = "#fff";
            ctx.font = "bold 12px Segoe UI, Roboto, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("Klik op het raam van de flits!", W / 2, 228);
          }
        } else G.drawBanner(ctx, "Erachteraan, het dak op!", "#6ee07a", 230);
      } else {
        this.drawRoof(ctx, t);
        const f = this.foe;
        const c = CHIMNEYS[f.at];
        if (f.peek > 0 && !(this.won && f.hp <= 0 && this.won < 2000)) {
          const fx = c.x + f.side * (14 + f.peek * 20);
          const hand = G.drawKid(ctx, fx, ROOF_Y, 0.9, FOE_LOOK, { adult: true, t, facing: -f.side, flash: f.flash > 0, armAngle: 0.1, angry: f.hp > 0, dizzy: f.hp <= 0 });
          ctx.fillStyle = "#c02020";
          ctx.fillRect(fx - 1, ROOF_Y - 56, 3, 12);
          if (f.state === "aim") {
            ctx.fillStyle = "#222";
            ctx.fillRect(hand.x - 18, hand.y - 3, 28, 5);
            ctx.strokeStyle = "rgba(255,30,30,0.6)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(hand.x, hand.y);
            ctx.lineTo(W / 2, H - 70);
            ctx.stroke();
            const k = 1 - f.timer / PEEK_AIM;
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.fillRect(fx - 18, ROOF_Y - 106, 36, 5);
            ctx.fillStyle = "#ff4040";
            ctx.fillRect(fx - 18, ROOF_Y - 106, 36 * G.clamp(k, 0, 1), 5);
          }
        }
        // redraw chimney fronts so he hides behind them
        for (const ch of CHIMNEYS) {
          ctx.fillStyle = "#7a4a3a";
          ctx.fillRect(ch.x - 26, ROOF_Y - 110, 52, 110);
          ctx.fillStyle = "#5a3a2a";
          ctx.fillRect(ch.x - 30, ROOF_Y - 116, 60, 8);
        }
        if (f.peek > 0) {
          // only the edge of him sticks out past the chimney
          const fx = c.x + f.side * (14 + f.peek * 20);
          ctx.save();
          ctx.beginPath();
          ctx.rect(f.side > 0 ? c.x + 26 : 0, 0, f.side > 0 ? W : c.x - 26, H);
          ctx.clip();
          G.drawKid(ctx, fx, ROOF_Y, 0.9, FOE_LOOK, { adult: true, t, facing: -f.side, flash: f.flash > 0, armAngle: 0.1, angry: f.hp > 0, dizzy: f.hp <= 0 });
          ctx.restore();
        }
        // your view over the wall
        if (!this.duck) {
          ctx.strokeStyle = "rgba(255,255,255,0.85)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(this.aim.x, this.aim.y, 9, 0, Math.PI * 2);
          ctx.moveTo(this.aim.x - 14, this.aim.y);
          ctx.lineTo(this.aim.x + 14, this.aim.y);
          ctx.stroke();
        } else {
          ctx.fillStyle = "rgba(0,0,0,0.35)";
          ctx.fillRect(0, 0, W, H);
          G.drawBanner(ctx, "Gedoken", "#9fd3ff", H / 2);
        }
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(W / 2 - 100, 12, 200, 8);
        ctx.fillStyle = "#c0c0c0";
        ctx.fillRect(W / 2 - 100, 12, 200 * Math.max(0, f.hp / FOE_HP), 8);
      }

      if (this.flash > 0) {
        ctx.fillStyle = `rgba(200,40,40,${0.35 * (this.flash / 350)})`;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.fillStyle = "#ff6b6b";
      ctx.font = "18px Segoe UI, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("❤".repeat(Math.max(0, this.hp)), 12, 26);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "right";
      if (this.phase === "speech") ctx.fillText(`Sluipschutter gevonden ${this.found}/${FIND}`, W - 12, 24);
      if (this.won) G.drawBanner(ctx, "Je overleefde de aanslag!", "#6ee07a", 160);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return this.phase === "duel" ? "Dakduel" : `Sluipschutter gevonden ${this.found}/${FIND}`;
    },
  };
})();
