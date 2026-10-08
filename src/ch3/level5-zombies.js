(() => {
  const { W, H } = G;
  const GUN = { x: W / 2, y: H - 36 };
  const BASE_Y = H - 52;
  const MAG = 30;
  const RELOAD_MS = 1600;
  const FIRE_MS = 95;
  const BULLET_SPEED = 820;
  const PLAYER_HP = 4;
  const Z_SPEED = 26;
  const Z_HP = 2;
  const BIG_HP = 24;
  const WAVES = [6, 9, 12, 15];
  const WAVE_GAP = 2200;

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function drawScene(ctx, t) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0a0a20");
    g.addColorStop(1, "#1a1030");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // moon
    ctx.fillStyle = "#e8e8d0";
    ctx.beginPath();
    ctx.arc(W - 70, 60, 26, 0, Math.PI * 2);
    ctx.fill();
    // street / horizon
    ctx.fillStyle = "#15102a";
    ctx.fillRect(0, 90, W, 30);
    // rooftop
    ctx.fillStyle = "#3a2a3a";
    ctx.fillRect(0, BASE_Y + 20, W, H - BASE_Y - 20);
    ctx.fillStyle = "#2a1f2a";
    ctx.fillRect(0, BASE_Y + 16, W, 6);
  }

  function drawZombie(ctx, z, t) {
    const scale = z.big ? 1.9 : 1;
    const wob = Math.sin(t * 6 + z.seed) * 3 * scale;
    ctx.fillStyle = z.flash > 0 ? "#fff" : "#4a7a3a";
    ctx.save();
    ctx.translate(z.x, z.y + wob);
    ctx.scale(scale, scale);
    // body
    ctx.fillRect(-8, -22, 16, 24);
    // head
    ctx.beginPath();
    ctx.arc(0, -28, 8, 0, Math.PI * 2);
    ctx.fill();
    // eyes
    ctx.fillStyle = "#ff3030";
    ctx.fillRect(-4, -30, 3, 3);
    ctx.fillRect(2, -30, 3, 3);
    // arms out
    ctx.strokeStyle = z.flash > 0 ? "#fff" : "#3a5f2a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-8, -16);
    ctx.lineTo(-16, -20);
    ctx.moveTo(8, -16);
    ctx.lineTo(16, -20);
    ctx.stroke();
    ctx.restore();
    if (z.big) {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(z.x - 26, z.y - 64, 52, 5);
      ctx.fillStyle = "#e05050";
      ctx.fillRect(z.x - 26, z.y - 64, 52 * (z.hp / BIG_HP), 5);
    }
  }

  G.c3level5 = {
    title: "Level 5 — Zombienacht (15 jaar)",
    intro:
      "Op het nieuws: een zombie-uitbraak! 's Nachts klimmen ze tegen je huis op.<br>" +
      "Sta op je dak en mik met de <strong>muis</strong>, schiet met <strong>klik</strong> of <strong>SPATIE</strong>.<br>" +
      "Je magazijn heeft 30 kogels; leeg = automatisch herladen. Overleef alle golven!",

    drawBackground(ctx, t) {
      drawScene(ctx, t);
      // the player with AK on the roof
      const hand = G.drawKid(ctx, GUN.x, BASE_Y + 20, 1.1, G.playerKidLook(), { t, armAngle: -0.3 });
      ctx.save();
      ctx.translate(hand.x, hand.y);
      ctx.rotate(-0.4);
      ctx.fillStyle = "#222";
      ctx.fillRect(0, -3, 34, 6);
      ctx.fillRect(6, 3, 8, 10);
      ctx.restore();
    },

    start(api) {
      this.api = api;
      this.aim = { x: W / 2, y: 120 };
      this.ammo = MAG;
      this.reload = 0;
      this.fire = 0;
      this.hp = PLAYER_HP;
      this.bullets = [];
      this.zombies = [];
      this.waveIndex = 0;
      this.toSpawn = 0;
      this.spawnTimer = 800;
      this.waveTimer = 0;
      this.phase = "wave";
      this.flash = 0;
      this.popups = [];
      this.over = false;
      this.startWave();
    },

    startWave() {
      this.toSpawn = this.waveIndex < WAVES.length ? WAVES[this.waveIndex] : 1;
      this.bigWave = this.waveIndex >= WAVES.length;
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 700 });
    },

    doFire() {
      if (this.over || this.reload > 0 || this.fire > 0) return;
      if (this.ammo <= 0) {
        this.reload = RELOAD_MS;
        return;
      }
      this.ammo--;
      this.fire = FIRE_MS;
      const d = dist(GUN, this.aim) || 1;
      this.bullets.push({ x: GUN.x, y: GUN.y - 20, vx: ((this.aim.x - GUN.x) / d) * BULLET_SPEED, vy: ((this.aim.y - (GUN.y - 20)) / d) * BULLET_SPEED });
      if (this.ammo <= 0) this.reload = RELOAD_MS;
    },

    onAction() {
      this.doFire();
    },
    onPointer(x, y) {
      this.aim = { x, y };
      this.doFire();
    },
    onPointerMove(x, y) {
      this.aim = { x, y };
    },

    spawnZombie(big) {
      const side = Math.random() < 0.5 ? 0 : 1;
      const x = side ? W + 20 : -20;
      const y = 95 + Math.random() * 20;
      this.zombies.push({ x, y, hp: big ? BIG_HP : Z_HP, big, flash: 0, seed: Math.random() * 10 });
    },

    update(dt, t) {
      if (this.over) return;
      const s = dt / 1000;
      this.fire = Math.max(0, this.fire - dt);
      this.flash = Math.max(0, this.flash - dt);
      this.popups = G.updatePopups(this.popups, dt);
      if (this.reload > 0) {
        this.reload -= dt;
        if (this.reload <= 0) this.ammo = MAG;
      }
      // continuous fire while held
      if (G.held.action) this.doFire();

      // spawning
      if (this.phase === "wave") {
        if (this.toSpawn > 0) {
          this.spawnTimer -= dt;
          if (this.spawnTimer <= 0) {
            this.spawnTimer = this.bigWave ? 9999 : 500 + Math.random() * 500;
            this.spawnZombie(this.bigWave);
            this.toSpawn--;
          }
        } else if (this.zombies.length === 0) {
          if (this.bigWave) {
            this.over = true;
            this.api.complete();
            return;
          }
          this.phase = "gap";
          this.waveTimer = WAVE_GAP;
        }
      } else if (this.phase === "gap") {
        this.waveTimer -= dt;
        if (this.waveTimer <= 0) {
          this.waveIndex++;
          this.phase = "wave";
          this.spawnTimer = 400;
          this.startWave();
        }
      }

      for (const z of this.zombies) {
        z.flash = Math.max(0, z.flash - dt);
        // move toward base x then climb
        const tx = GUN.x;
        const dx = tx - z.x;
        if (Math.abs(dx) > 4) z.x += Math.sign(dx) * Z_SPEED * s * (z.big ? 0.7 : 1);
        else z.y += (z.big ? 0.6 : 1) * Z_SPEED * s;
        if (z.y >= BASE_Y - 4) {
          z.done = true;
          this.hp--;
          this.flash = 350;
          this.popup("AU!", GUN.x, BASE_Y - 30, "#ff6b6b");
          if (this.hp <= 0) {
            this.over = true;
            this.api.fail("De zombies kwamen op je dak!");
            return;
          }
        }
      }

      for (const b of this.bullets) {
        b.x += b.vx * s;
        b.y += b.vy * s;
        if (b.x < -10 || b.x > W + 10 || b.y < -10 || b.y > H + 10) {
          b.done = true;
          continue;
        }
        for (const z of this.zombies) {
          if (z.done) continue;
          if (dist(b, { x: z.x, y: z.y - 20 }) < (z.big ? 34 : 15)) {
            b.done = true;
            z.hp--;
            z.flash = 90;
            if (z.hp <= 0) {
              z.done = true;
              this.popup(z.big ? "VERSLAGEN!" : "", z.x, z.y - 30, "#6ee07a");
            }
            break;
          }
        }
      }
      this.bullets = this.bullets.filter((b) => !b.done);
      this.zombies = this.zombies.filter((z) => !z.done);
    },

    render(ctx, t) {
      drawScene(ctx, t);
      for (const z of this.zombies) drawZombie(ctx, z, t);

      // player + gun aiming
      const angle = Math.atan2(this.aim.y - (GUN.y - 20), this.aim.x - GUN.x);
      const facing = this.aim.x >= GUN.x ? 1 : -1;
      const hand = G.drawKid(ctx, GUN.x, BASE_Y + 20, 1.1, G.playerKidLook(), { t, facing, armAngle: G.clamp(facing === 1 ? angle : Math.PI - angle, -1.5, 0.5) });
      ctx.save();
      ctx.translate(hand.x, hand.y);
      ctx.rotate(angle);
      if (facing < 0) ctx.scale(1, -1);
      ctx.fillStyle = "#222";
      ctx.fillRect(0, -3, 36, 6);
      ctx.fillRect(8, 3, 8, 11);
      if (this.fire > 0) {
        ctx.fillStyle = "#ffd24a";
        ctx.beginPath();
        ctx.arc(38, 0, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      ctx.fillStyle = "#ffe066";
      for (const b of this.bullets) {
        ctx.fillRect(b.x - 2, b.y - 1, 5, 2);
      }

      // crosshair
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.aim.x, this.aim.y, 9, 0, Math.PI * 2);
      ctx.moveTo(this.aim.x - 14, this.aim.y);
      ctx.lineTo(this.aim.x + 14, this.aim.y);
      ctx.moveTo(this.aim.x, this.aim.y - 14);
      ctx.lineTo(this.aim.x, this.aim.y + 14);
      ctx.stroke();

      if (this.flash > 0) {
        ctx.fillStyle = `rgba(200,40,40,${0.3 * (this.flash / 350)})`;
        ctx.fillRect(0, 0, W, H);
      }

      // HUD
      ctx.fillStyle = "#fff";
      ctx.font = "18px Segoe UI, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("❤".repeat(Math.max(0, this.hp)), 12, 26);
      ctx.font = "bold 14px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "right";
      ctx.fillStyle = this.reload > 0 ? "#ffd24a" : "#fff";
      ctx.fillText(this.reload > 0 ? "HERLADEN..." : `${this.ammo} / ${MAG}`, W - 12, 26);
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      const wnum = this.bigWave ? "BAAS" : `${this.waveIndex + 1} / ${WAVES.length + 1}`;
      ctx.fillText(this.phase === "gap" ? "Volgende golf..." : `Golf ${wnum}`, W / 2, 20);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return this.bigWave ? "Grote zombie!" : `Golf ${this.waveIndex + 1} / ${WAVES.length + 1}`;
    },
  };
})();
