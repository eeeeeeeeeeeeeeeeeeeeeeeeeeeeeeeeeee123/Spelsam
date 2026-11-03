(() => {
  const { W, H } = G;
  const FLOOR = 350;
  const CABIN_W = 1900;
  const COCKPIT_X = CABIN_W - 120;
  const RUN = 130;
  const HP = 5;
  const INVULN_MS = 900;
  const FIRE_MS = 220;
  const BULLET_SPEED = 680;
  const ENEMY_HP = 2;
  const ENEMY_AIM = 1150;
  const SHOT_SPEED = 340;
  const CHEST = 44;
  const LOW = 14;
  const LEADER_HP = 16;
  const TURB_EVERY = [8000, 11000];
  const TURB_WARN = 1100;
  const TURB_MS = 1600;
  const CRASH_MS = 80000;
  const SPAWN_AT = [250, 450, 650, 850, 1050, 1250, 1450];

  function drawCabin(ctx, cam, t, tilt) {
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(tilt);
    ctx.translate(-W / 2, -H / 2);
    ctx.fillStyle = "#e8e4dc";
    ctx.fillRect(-40, -40, W + 80, H + 80);
    // round windows with clouds and blue sky outside
    for (let x = -(cam % 90) + 20; x < W + 40; x += 90) {
      ctx.fillStyle = "#8ac0e8";
      ctx.beginPath();
      ctx.ellipse(x, 150, 16, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.beginPath();
      ctx.arc(x - 4 + ((t * 30) % 20), 156, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#1c2a5a";
    ctx.fillRect(-40, 196, W + 80, 10);
    ctx.fillStyle = "#c8a050";
    ctx.fillRect(-40, 206, W + 80, 3);
    // carpet
    ctx.fillStyle = "#2a3a6a";
    ctx.fillRect(-40, FLOOR, W + 80, H - FLOOR + 40);
    ctx.fillStyle = "rgba(240,192,48,0.25)";
    for (let x = -(cam % 60); x < W + 40; x += 60) ctx.fillRect(x, FLOOR + 30, 30, 4);
    // leather seats
    for (let wx = 160; wx < COCKPIT_X - 40; wx += 200) {
      const x = wx - cam;
      if (x < -60 || x > W + 60) continue;
      ctx.fillStyle = "#6a4a2a";
      ctx.fillRect(x - 22, FLOOR - 52, 44, 52);
      ctx.fillStyle = "#7a5a3a";
      ctx.fillRect(x - 26, FLOOR - 24, 52, 24);
    }
    // cockpit door
    const cx = COCKPIT_X + 60 - cam;
    if (cx < W + 60) {
      ctx.fillStyle = "#3a3a44";
      ctx.fillRect(cx, FLOOR - 140, 50, 140);
      ctx.fillStyle = "#f0c030";
      ctx.font = "bold 9px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("COCKPIT", cx + 25, FLOOR - 146);
    }
    ctx.restore();
  }

  G.CAREER_LEVELS.president[5] = {
    title: "Level 5 — Air Force One heroveren (25 jaar)",
    intro:
      "Kapers hebben <strong>Air Force One</strong> overgenomen terwijl jij aan boord bent. Vecht je binnen <strong>80 seconden</strong> naar de <strong>cockpit</strong>, anders stort het toestel neer!<br>" +
      "<strong>← →</strong> lopen, <strong>↓</strong> bukken achter de stoelen (hoge kogels gaan over je heen). Mik met de <strong>muis</strong>, schiet je gouden pistool met <strong>klik</strong> / <strong>SPATIE</strong>.<br>" +
      "Bij <strong>TURBULENTIE</strong> schud je alle kanten op. De kaper-leider heeft een <strong>hagelgeweer</strong>: daarvan gaat ook een kogel laag!",

    drawBackground(ctx, t) {
      drawCabin(ctx, 0, t, 0);
    },

    start(api) {
      this.api = api;
      this.p = { x: 60, hp: HP, invuln: 0, facing: 1, duck: false };
      this.aim = { x: 400, y: FLOOR - 50 };
      this.cam = 0;
      this.fire = 0;
      this.bullets = [];
      this.shots = [];
      this.enemies = [];
      this.spawned = new Set();
      this.turb = 0;
      this.turbWarn = 0;
      this.turbTimer = 6000;
      this.leader = null;
      this.flash = 0;
      this.popups = [];
      this.over = false;
      this.won = 0;
      this.time = 0;
      this.left = CRASH_MS;
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 800 });
    },

    gun() {
      return { x: this.p.x, y: FLOOR - (this.p.duck ? 24 : 50) };
    },

    doFire() {
      if (this.over || this.won || this.fire > 0) return;
      this.fire = FIRE_MS;
      const g = this.gun();
      const wob = this.turb > 0 ? (Math.random() - 0.5) * 0.3 : 0;
      const ang = Math.atan2(this.aim.y - g.y, this.aim.x + this.cam - g.x) + wob;
      this.bullets.push({ x: g.x, y: g.y, vx: Math.cos(ang) * BULLET_SPEED, vy: Math.sin(ang) * BULLET_SPEED });
    },

    onAction() { this.doFire(); },
    onPointer(x, y) { this.aim = { x, y }; this.doFire(); },
    onPointerMove(x, y) { this.aim = { x, y }; },

    hurt() {
      const p = this.p;
      if (p.invuln > 0 || this.over) return;
      p.hp--;
      p.invuln = INVULN_MS;
      this.flash = 300;
      this.popup("-1 ❤", p.x - this.cam, FLOOR - 90, "#ff6b6b");
      if (p.hp <= 0) {
        this.over = true;
        this.api.fail("De kapers hebben Air Force One in handen gehouden.");
      }
    },

    update(dt) {
      if (this.over) return;
      const s = dt / 1000;
      const p = this.p;
      this.time += dt;
      this.fire = Math.max(0, this.fire - dt);
      this.flash = Math.max(0, this.flash - dt);
      p.invuln = Math.max(0, p.invuln - dt);
      this.popups = G.updatePopups(this.popups, dt);

      if (this.won) {
        this.won -= dt;
        if (this.won <= 0) {
          this.over = true;
          this.api.complete();
        }
        return;
      }
      if (G.held.action) this.doFire();
      this.left -= dt;
      if (this.left <= 0) {
        this.over = true;
        this.api.fail("Niemand vliegt het toestel... Air Force One stort neer!");
        return;
      }

      // turbulence: warning, then everyone gets thrown around
      if (this.turb > 0) this.turb -= dt;
      else if (this.turbWarn > 0) {
        this.turbWarn -= dt;
        if (this.turbWarn <= 0) this.turb = TURB_MS;
      } else {
        this.turbTimer -= dt;
        if (this.turbTimer <= 0) {
          this.turbTimer = TURB_EVERY[0] + Math.random() * (TURB_EVERY[1] - TURB_EVERY[0]);
          this.turbWarn = TURB_WARN;
        }
      }

      p.duck = !!G.held.down;
      const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
      if (!p.duck) p.x += mx * RUN * s;
      if (this.turb > 0) p.x += Math.sin(this.time / 90) * 90 * s;
      if (mx) p.facing = mx;
      const maxX = this.leader && this.leader.hp > 0 ? this.leader.x - 50 : CABIN_W - 30;
      p.x = G.clamp(p.x, 20, maxX);
      this.cam = G.clamp(p.x - 180, 0, CABIN_W - W);

      // hijackers pop up from behind the seats as you come closer
      for (const at of SPAWN_AT) {
        if (!this.spawned.has(at) && p.x > at - 120) {
          this.spawned.add(at);
          const n = at > 900 ? 2 : 1;
          for (let k = 0; k < n; k++) this.enemies.push({ x: at + 200 + k * 70, hp: ENEMY_HP, up: 0, timer: ENEMY_AIM + k * 400, flash: 0, look: { ...G.ENEMY_LOOK(), shirt: "#2a2a2a" } });
        }
      }
      if (!this.leader && p.x > COCKPIT_X - 330) {
        this.leader = { x: COCKPIT_X + 20, hp: LEADER_HP, timer: 1500, flash: 0, look: { ...G.SKINS.wit, hair: "stekels", hairColor: "#c02020", eyes: G.EYES.blauw, gender: "jongen", shirt: "#111", pants: "#111" } };
        this.popup("De kaper-leider!", W / 2, 110, "#ff8a3a");
      }

      for (const e of this.enemies) {
        e.flash = Math.max(0, e.flash - dt);
        if (e.dead) {
          e.timer -= dt;
          continue;
        }
        e.up = Math.min(1, e.up + dt / 300);
        if (e.up < 1) continue;
        e.timer -= dt;
        if (e.timer <= 0) {
          e.timer = ENEMY_AIM + Math.random() * 500;
          const dir = p.x < e.x ? -1 : 1;
          this.shots.push({ x: e.x + dir * 16, y: FLOOR - CHEST, vx: dir * SHOT_SPEED });
        }
      }
      this.enemies = this.enemies.filter((e) => !e.dead || e.timer > 0);

      const L = this.leader;
      if (L && L.hp > 0) {
        L.flash = Math.max(0, L.flash - dt);
        L.timer -= dt;
        if (L.timer <= 0) {
          L.timer = 1500 + Math.random() * 500;
          // shotgun: two high pellets and one low one
          for (const y of [CHEST + 8, CHEST - 4, LOW]) this.shots.push({ x: L.x - 20, y: FLOOR - y, vx: -SHOT_SPEED * 1.15 });
        }
      }

      for (const b of this.shots) {
        b.x += b.vx * s;
        if (this.turb > 0) b.y += Math.sin(this.time / 70 + b.x) * 30 * s;
        const height = FLOOR - b.y;
        const hitsMe = p.duck ? height < 30 : height < 70;
        if (Math.abs(b.x - p.x) < 10 && hitsMe) {
          b.done = true;
          this.hurt();
          if (this.over) return;
        }
        if (b.x < this.cam - 40 || b.x > this.cam + W + 40) b.done = true;
      }
      this.shots = this.shots.filter((b) => !b.done);

      for (const b of this.bullets) {
        b.x += b.vx * s;
        b.y += b.vy * s;
        if (b.x < this.cam - 20 || b.x > this.cam + W + 20 || b.y < 0 || b.y > FLOOR + 10) {
          b.done = true;
          continue;
        }
        for (const e of this.enemies) {
          if (e.dead || e.up < 0.6) continue;
          if (Math.abs(b.x - e.x) < 12 && b.y > FLOOR - 75 && b.y < FLOOR - 20) {
            b.done = true;
            e.hp--;
            e.flash = 100;
            if (e.hp <= 0) {
              e.dead = true;
              e.timer = 600;
              this.popup("RAAK", e.x - this.cam, FLOOR - 90, "#6ee07a");
            }
            break;
          }
        }
        if (!b.done && L && L.hp > 0 && Math.abs(b.x - L.x) < 16 && b.y > FLOOR - 90 && b.y < FLOOR) {
          b.done = true;
          L.hp--;
          L.flash = 100;
          if (L.hp <= 0) {
            this.won = 2600;
            this.shots = [];
            this.popup("Air Force One is weer van jou!", W / 2, 110, "#6ee07a");
          }
        }
      }
      this.bullets = this.bullets.filter((b) => !b.done);
    },

    render(ctx, t) {
      const p = this.p;
      const tilt = this.turb > 0 ? Math.sin(this.time / 120) * 0.05 : 0;
      drawCabin(ctx, this.cam, t, tilt);
      const cam = this.cam;

      // oxygen masks dangle during turbulence
      if (this.turb > 0) {
        ctx.strokeStyle = "#ccc";
        ctx.fillStyle = "#f0e070";
        for (let x = -(cam % 100) + 40; x < W; x += 100) {
          const sw = Math.sin(t * 9 + x) * 8;
          ctx.beginPath();
          ctx.moveTo(x, 210);
          ctx.lineTo(x + sw, 250);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(x + sw, 254, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      for (const e of this.enemies) {
        const sx = e.x - cam;
        if (sx < -40 || sx > W + 40) continue;
        ctx.save();
        ctx.beginPath();
        ctx.rect(sx - 40, 0, 80, FLOOR - 20);
        ctx.clip();
        const hand = G.drawKid(ctx, sx, FLOOR + (1 - e.up) * 60 + (e.dead ? (1 - e.timer / 600) * 60 : 0), 0.75, e.look, { adult: true, t, facing: p.x < e.x ? -1 : 1, armAngle: -0.05, flash: e.flash > 0, dizzy: e.dead, angry: !e.dead });
        if (!e.dead && e.up >= 1) G.drawPistol(ctx, hand.x, hand.y, p.x < e.x ? Math.PI : 0, 0.7, "#333");
        ctx.restore();
        // seat in front of them
        ctx.fillStyle = "#6a4a2a";
        ctx.fillRect(sx - 22, FLOOR - 40, 44, 40);
        if (!e.dead && e.up >= 1) {
          const k = 1 - e.timer / ENEMY_AIM;
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(sx - 16, FLOOR - 98, 32, 4);
          ctx.fillStyle = "#ff4040";
          ctx.fillRect(sx - 16, FLOOR - 98, 32 * G.clamp(k, 0, 1), 4);
        }
      }

      const L = this.leader;
      if (L) {
        const sx = L.x - cam;
        const hand = G.drawKid(ctx, sx, FLOOR, 0.9, L.look, { adult: true, t, facing: -1, flash: L.flash > 0, armAngle: 0, angry: L.hp > 0, pose: L.hp > 0 ? "stand" : "down", dizzy: L.hp <= 0 });
        if (L.hp > 0) {
          ctx.fillStyle = "#3a2a1a";
          ctx.fillRect(hand.x - 30, hand.y - 4, 34, 8);
          ctx.fillStyle = "#333";
          ctx.fillRect(hand.x - 34, hand.y - 3, 10, 6);
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(sx - 30, FLOOR - 116, 60, 6);
          ctx.fillStyle = "#e05050";
          ctx.fillRect(sx - 30, FLOOR - 116, 60 * (L.hp / LEADER_HP), 6);
        }
      }

      // the president
      const g = this.gun();
      const px = p.x - cam;
      const ang = Math.atan2(this.aim.y - g.y, this.aim.x - px);
      const facing = this.aim.x >= px ? 1 : -1;
      ctx.globalAlpha = p.invuln > 0 && Math.floor(t * 12) % 2 ? 0.5 : 1;
      if (p.duck) {
        G.drawKid(ctx, px, FLOOR, 0.8, G.presLook(), { adult: true, t: 0, pose: "crawl" });
      } else {
        const hand = G.drawKid(ctx, px, FLOOR, 0.8, G.presLook(), { adult: true, t, facing, pose: G.held.left || G.held.right ? "walk" : "stand", armAngle: G.clamp(facing === 1 ? ang : Math.PI - ang, -1.4, 0.8) });
        G.drawQuiff(ctx, px, FLOOR, 0.8, facing);
        G.drawTie(ctx, px, FLOOR, 0.8);
        G.drawPistol(ctx, hand.x, hand.y, ang, 0.75, "#f0c030");
      }
      ctx.globalAlpha = 1;

      ctx.fillStyle = "#ffe066";
      for (const b of this.bullets) ctx.fillRect(b.x - cam - 2, b.y - 1, 5, 2);
      ctx.fillStyle = "#ff6040";
      for (const b of this.shots) ctx.fillRect(b.x - cam - 4, b.y - 1.5, 8, 3);

      ctx.strokeStyle = "rgba(0,0,0,0.75)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.aim.x, this.aim.y, 8, 0, Math.PI * 2);
      ctx.stroke();

      if (this.turbWarn > 0) G.drawBanner(ctx, "TURBULENTIE! Hou je vast!", "#ffd24a", 80);
      if (this.flash > 0) {
        ctx.fillStyle = `rgba(200,40,40,${0.3 * (this.flash / 300)})`;
        ctx.fillRect(0, 0, W, H);
      }
      if (this.won) G.drawBanner(ctx, "Air Force One heroverd!", "#6ee07a", 120);

      ctx.fillStyle = "#ff6b6b";
      ctx.font = "18px Segoe UI, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("❤".repeat(Math.max(0, p.hp)), 12, 26);
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(W - 170, 14, 156, 8);
      ctx.fillStyle = "#f0c030";
      ctx.fillRect(W - 170, 14, 156 * Math.min(1, p.x / COCKPIT_X), 8);
      ctx.fillStyle = "#333";
      ctx.font = "bold 10px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`NAAR DE COCKPIT · ${Math.ceil(this.left / 1000)}s`, W - 14, 36);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return "Air Force One · naar de cockpit";
    },
  };
})();
