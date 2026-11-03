(() => {
  const { W, H } = G;
  const ROAD = { x: 90, w: W - 180 };
  const SCROLL = 160;
  const STEER = 150;
  const LIMO = { w: 34, h: 72 };
  const SUV = { w: 30, h: 52 };
  const HP = 100;
  const TIME_MS = 55000;
  const RAM_MS = 260;
  const RAM_SPEED = 300;
  const RAM_COOLDOWN = 850;
  const RIVAL_MS = 3800;
  const LUNGE_WARN = 700;
  const LUNGE_SPEED = 230;
  const LUNGE_DMG = 10;
  const RECOVER_MS = 1700;
  const EDGE_DMG = 6;
  const RIVAL_COLORS = ["#6a6a6a", "#4a4a4a", "#7a5a3a", "#3a4a5a"];

  const overlap = (a, aw, ah, b, bw, bh) => Math.abs(a.x - b.x) < (aw + bw) / 2 && Math.abs(a.y - b.y) < (ah + bh) / 2;

  function drawLimo(ctx, x, y, flash) {
    ctx.fillStyle = flash ? "#fff" : "#111";
    ctx.beginPath();
    ctx.roundRect(x - LIMO.w / 2, y - LIMO.h / 2, LIMO.w, LIMO.h, 8);
    ctx.fill();
    ctx.fillStyle = "rgba(140,170,200,0.55)";
    ctx.fillRect(x - 12, y - 30, 24, 10);
    ctx.fillRect(x - 12, y + 14, 24, 8);
    ctx.fillStyle = "#c02020";
    ctx.fillRect(x - 14, y - 36, 4, 4);
    ctx.fillStyle = "#2050c0";
    ctx.fillRect(x + 10, y - 36, 4, 4);
    ctx.fillStyle = "#f0c030";
    ctx.fillRect(x - 2, y - 4, 4, 8);
  }

  function drawSUV(ctx, r, t) {
    ctx.save();
    ctx.translate(r.x, r.y);
    if (r.wreck) ctx.rotate(r.wreck * 0.01);
    ctx.fillStyle = r.wreck ? "#2a2a2a" : r.flash > 0 ? "#fff" : r.col;
    ctx.fillRect(-SUV.w / 2, -SUV.h / 2, SUV.w, SUV.h);
    ctx.fillStyle = "rgba(160,190,220,0.5)";
    ctx.fillRect(-11, -18, 22, 9);
    // campaign sign on the roof
    ctx.fillStyle = "#e8e8e8";
    ctx.fillRect(-13, -2, 26, 10);
    ctx.fillStyle = "#333";
    ctx.font = "bold 6px Segoe UI, Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SAAI!", 0, 6);
    if (r.state === "warn" && Math.floor(t * 10) % 2) {
      ctx.fillStyle = "#ffb020";
      ctx.fillRect(r.side * (SUV.w / 2) - 3, -SUV.h / 2, 6, 6);
      ctx.fillRect(r.side * (SUV.w / 2) - 3, SUV.h / 2 - 6, 6, 6);
    }
    ctx.restore();
    if (r.wreck) {
      ctx.fillStyle = `rgba(255,${120 + Math.random() * 80},40,0.8)`;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 10 + Math.random() * 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  G.CAREER_LEVELS.president[2] = {
    title: "Level 2 — Kogelvrije limo (22 jaar)",
    intro:
      "Je bent kandidaat-president! Op weg naar je grote rally proberen de campagneteams van <strong>Senator Saai</strong> je limo van de weg te rijden.<br>" +
      "Stuur met de <strong>pijltjes / WASD</strong>. Knipperen ze met hun richtingaanwijzer? Dan rammen ze. Ontwijk ze, of <strong>ram terug</strong> met <strong>SPATIE</strong> (in de richting waarin je stuurt).<br>" +
      "Duw ze tegen de vangrail! Haal de rally (<strong>55 seconden</strong>).",

    drawBackground(ctx) {
      this.drawRoad(ctx, 0);
      drawLimo(ctx, W / 2, H - 90, false);
    },

    drawRoad(ctx, scroll) {
      ctx.fillStyle = "#2a2a2e";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#4a6a3a";
      ctx.fillRect(0, 0, ROAD.x - 6, H);
      ctx.fillRect(ROAD.x + ROAD.w + 6, 0, W, H);
      ctx.fillStyle = "#c8c8c8";
      ctx.fillRect(ROAD.x - 6, 0, 6, H);
      ctx.fillRect(ROAD.x + ROAD.w, 0, 6, H);
      // star-spangled campaign banners whizzing by
      const off = scroll % 140;
      for (let y = -140 + off; y < H; y += 140) {
        ctx.fillStyle = "#c02020";
        ctx.fillRect(14, y, 50, 24);
        ctx.fillRect(W - 64, y + 60, 50, 24);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 9px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("GOUDKUIF!", 39, y + 15);
        ctx.fillText("GOUDKUIF!", W - 39, y + 75);
      }
      ctx.fillStyle = "#e8d060";
      for (let y = -60 + (scroll % 60); y < H; y += 60) ctx.fillRect(W / 2 - 2, y, 4, 30);
    },

    start(api) {
      this.api = api;
      this.p = { x: W / 2, y: H - 90, vx: 0, ram: 0, ramCd: 0, ramDir: 1, flash: 0 };
      this.hp = HP;
      this.time = TIME_MS;
      this.scroll = 0;
      this.rivals = [];
      this.rivalTimer = 1800;
      this.wrecked = 0;
      this.edgeCd = 0;
      this.popups = [];
      this.shake = 0;
      this.over = false;
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 800 });
    },

    onAction() {
      const p = this.p;
      if (this.over || p.ramCd > 0) return;
      const dir = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
      const near = this.rivals.find((r) => !r.wreck && Math.abs(r.y - p.y) < 60);
      p.ramDir = dir || (near ? Math.sign(near.x - p.x) || 1 : 1);
      p.ram = RAM_MS;
      p.ramCd = RAM_COOLDOWN;
    },

    recover(r) {
      r.state = "recover";
      r.timer = RECOVER_MS;
    },

    hurt(dmg, text) {
      this.hp -= dmg;
      this.p.flash = 200;
      this.shake = 250;
      this.popup(text, this.p.x, this.p.y - 50, "#ff6b6b");
      if (this.hp <= 0) {
        this.over = true;
        this.api.fail("Je limo is van de weg gedrukt. Geen rally vandaag.");
      }
    },

    update(dt) {
      if (this.over) return;
      const s = dt / 1000;
      const p = this.p;
      this.scroll += SCROLL * s;
      this.popups = G.updatePopups(this.popups, dt);
      p.flash = Math.max(0, p.flash - dt);
      p.ramCd = Math.max(0, p.ramCd - dt);
      this.shake = Math.max(0, this.shake - dt);
      this.edgeCd = Math.max(0, this.edgeCd - dt);

      this.time -= dt;
      if (this.time <= 0) {
        this.over = true;
        this.api.complete();
        return;
      }

      // steering, ramming bursts sideways
      const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
      const my = (G.held.down ? 1 : 0) - (G.held.up ? 1 : 0);
      if (p.ram > 0) {
        p.ram -= dt;
        p.x += p.ramDir * RAM_SPEED * s;
      } else p.x += mx * STEER * s;
      p.y = G.clamp(p.y + my * STEER * 0.7 * s, 120, H - 50);
      const minX = ROAD.x + LIMO.w / 2, maxX = ROAD.x + ROAD.w - LIMO.w / 2;
      if (p.x < minX || p.x > maxX) {
        p.x = G.clamp(p.x, minX, maxX);
        if (this.edgeCd <= 0) {
          this.edgeCd = 700;
          this.hurt(EDGE_DMG, "Vangrail!");
          if (this.over) return;
        }
      }

      // rivals: catch up from behind, pull alongside, blink, then lunge
      this.rivalTimer -= dt;
      const alive = this.rivals.filter((r) => !r.wreck);
      if (this.rivalTimer <= 0 && alive.length < 2) {
        this.rivalTimer = RIVAL_MS - Math.min(1500, (TIME_MS - this.time) * 0.03) + Math.random() * 1200;
        const side = p.x < W / 2 ? 1 : Math.random() < 0.5 ? -1 : 1;
        this.rivals.push({ x: G.clamp(p.x + side * 70, ROAD.x + 20, ROAD.x + ROAD.w - 20), y: H + 40, col: G.pick(RIVAL_COLORS), state: "chase", timer: 0, side: -side, hits: 0, flash: 0, wreck: 0 });
      }
      for (const r of this.rivals) {
        r.flash = Math.max(0, r.flash - dt);
        if (r.wreck) {
          r.wreck += dt;
          r.y += SCROLL * s;
          continue;
        }
        if (r.state === "chase") {
          // drive up next to you
          const tx = G.clamp(p.x - r.side * 62, ROAD.x + SUV.w / 2, ROAD.x + ROAD.w - SUV.w / 2);
          r.x += Math.sign(tx - r.x) * Math.min(Math.abs(tx - r.x), 90 * s);
          r.y += Math.sign(p.y - r.y) * Math.min(Math.abs(p.y - r.y), 130 * s);
          if (Math.abs(r.y - p.y) < 8) {
            r.state = "warn";
            r.timer = LUNGE_WARN;
          }
        } else if (r.state === "warn") {
          r.y += Math.sign(p.y - r.y) * Math.min(Math.abs(p.y - r.y), 80 * s);
          r.timer -= dt;
          if (r.timer <= 0) {
            r.state = "lunge";
            r.timer = 420;
          }
        } else if (r.state === "lunge") {
          r.x += r.side * LUNGE_SPEED * s;
          r.timer -= dt;
          if (r.timer <= 0) this.recover(r);
        } else if (r.state === "recover") {
          // fall back a bit before trying again
          r.timer -= dt;
          r.y += 70 * s;
          r.x += Math.sign(r.x - p.x) * 40 * s;
          if (r.timer <= 0) {
            r.state = "chase";
            r.side = p.x > r.x ? 1 : -1;
          }
        }
        // collisions with the limo
        if (overlap(p, LIMO.w, LIMO.h, r, SUV.w, SUV.h)) {
          const away = Math.sign(r.x - p.x) || 1;
          if (p.ram > 0 && Math.sign(p.ramDir) === away) {
            r.x += away * 55;
            r.hits++;
            r.flash = 150;
            this.recover(r);
            p.ram = 0;
            this.popup("RAM!", r.x, r.y - 40, "#6ee07a");
          } else if (r.state === "lunge") {
            p.x -= away * 30;
            this.recover(r);
            r.x += away * 20;
            this.hurt(LUNGE_DMG, `-${LUNGE_DMG}`);
            if (this.over) return;
          } else {
            r.x += away * 4;
            p.x -= away * 4;
          }
        }
        // shoved into the barrier = wreck
        if (r.x < ROAD.x + SUV.w / 2 - 2 || r.x > ROAD.x + ROAD.w - SUV.w / 2 + 2 || r.hits >= 3) {
          r.wreck = 1;
          this.wrecked++;
          this.popup("WRAK!", r.x, r.y - 40, "#ffd24a");
        }
      }
      this.rivals = this.rivals.filter((r) => r.y < H + 80 && (!r.wreck || r.wreck < 3000));
    },

    render(ctx, t) {
      ctx.save();
      if (this.shake > 0) ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 4);
      this.drawRoad(ctx, this.scroll);
      for (const r of this.rivals) drawSUV(ctx, r, t);
      const p = this.p;
      drawLimo(ctx, p.x, p.y, p.flash > 0);
      if (p.ram > 0) {
        ctx.strokeStyle = "rgba(255,255,255,0.6)";
        ctx.lineWidth = 2;
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.moveTo(p.x - p.ramDir * (22 + k * 6), p.y - 20 + k * 20);
          ctx.lineTo(p.x - p.ramDir * (40 + k * 6), p.y - 20 + k * 20);
          ctx.stroke();
        }
      }
      for (const r of this.rivals) {
        if (r.state === "warn") {
          ctx.fillStyle = "#ffb020";
          ctx.font = "bold 18px Segoe UI, Roboto, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("!", r.x, r.y - 34);
        }
      }
      ctx.restore();

      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(10, 10, 160, 12);
      ctx.fillStyle = this.hp > 40 ? "#6ee07a" : "#ff5050";
      ctx.fillRect(10, 10, 160 * Math.max(0, this.hp / HP), 12);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("LIMO", 14, 34);
      ctx.fillStyle = p.ramCd > 0 ? "#888" : "#ffd24a";
      ctx.fillText(p.ramCd > 0 ? "ram…" : "SPATIE = ram", 60, 34);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`Rally over ${Math.ceil(this.time / 1000)}s · wrakken ${this.wrecked}`, W - 12, 22);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return `Naar de rally · nog ${Math.ceil(this.time / 1000)}s`;
    },
  };
})();
