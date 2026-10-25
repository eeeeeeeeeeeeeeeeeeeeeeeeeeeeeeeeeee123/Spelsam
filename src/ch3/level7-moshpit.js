(() => {
  const { W, H } = G;
  const STAGE_H = 78;
  const PIT = { x: 30, y: 92, w: W - 60, h: H - 112 };
  const ZONE = { x: 150, y: 100, w: W - 300, h: 95 }; // "vooraan", right in front of the stage
  const CIRCLE = { x: W / 2, y: 285, r: 85 };
  const PLAYER_SPEED = 145;
  const ENERGY = 100;
  const BUMP_DMG = 6;
  const SURF_DMG = 15;
  const WALL_DMG = 12;
  const INVULN_MS = 600;
  const SHOVE_RANGE = 58;
  const SHOVE_COOLDOWN = 550;
  const SHOVE_BACK = 65;
  const STUN_MS = 900;
  const SONG_MS = 22000;
  const SONGS = 3;
  const PAUSE_MS = 2600;
  const ZONE_FILL = 22; // per second outside the front zone
  const ZONE_DRAIN = 30;
  const SURF_WARN = 1200;
  const MOSHERS = 14;
  const SONG_NAMES = ["Nummer 1: opwarmen", "Nummer 2: CIRCLE PIT!", "Nummer 3: WALL OF DEATH!"];

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const inRect = (p, r) => p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h;
  const clampPit = (p) => {
    p.x = G.clamp(p.x, PIT.x + 10, PIT.x + PIT.w - 10);
    p.y = G.clamp(p.y, PIT.y + 10, PIT.y + PIT.h - 4);
  };

  const BAND = [
    { x: W / 2 - 120, look: { ...G.SKINS.wit, hair: "lang", hairColor: "#1a1212", eyes: G.EYES.blauw, gender: "jongen", shirt: "#222", pants: "#111" }, inst: "guitar" },
    { x: W / 2, look: { ...G.SKINS.zwart, hair: "stekels", hairColor: "#d02020", eyes: G.EYES.bruin, gender: "meisje", shirt: "#3a1a3a", pants: "#111" }, inst: "mic" },
    { x: W / 2 + 120, look: { ...G.SKINS.wit, hair: "krullen", hairColor: "#d9a441", eyes: G.EYES.groen, gender: "jongen", shirt: "#1a2a3a", pants: "#111" }, inst: "guitar" },
  ];

  function drawStage(ctx, t, intensity) {
    ctx.fillStyle = "#08060e";
    ctx.fillRect(0, 0, W, H);
    // light beams
    for (let i = 0; i < 5; i++) {
      const a = Math.sin(t * (0.8 + i * 0.3) + i) * 0.5;
      const col = ["255,60,60", "60,140,255", "255,210,60", "180,60,255", "60,255,160"][i];
      ctx.fillStyle = `rgba(${col},${0.06 + intensity * 0.08})`;
      ctx.beginPath();
      ctx.moveTo(60 + i * 105, 0);
      ctx.lineTo(60 + i * 105 + Math.sin(a) * 260 - 50, H);
      ctx.lineTo(60 + i * 105 + Math.sin(a) * 260 + 50, H);
      ctx.fill();
    }
    // stage
    ctx.fillStyle = "#1e1a28";
    ctx.fillRect(0, 0, W, STAGE_H);
    ctx.fillStyle = "#3a3448";
    ctx.fillRect(0, STAGE_H - 8, W, 8);
    // speakers
    for (const x of [8, W - 50]) {
      ctx.fillStyle = "#111";
      ctx.fillRect(x, 8, 42, 62);
      ctx.fillStyle = "#333";
      const pump = 1 + Math.max(0, Math.sin(t * 14)) * 0.15 * intensity;
      ctx.beginPath();
      ctx.arc(x + 21, 28, 10 * pump, 0, Math.PI * 2);
      ctx.arc(x + 21, 54, 13 * pump, 0, Math.PI * 2);
      ctx.fill();
    }
    // band
    for (const m of BAND) {
      const bang = intensity > 0 ? Math.abs(Math.sin(t * 9 + m.x)) * 4 : 0;
      G.drawKid(ctx, m.x, STAGE_H - 6 + bang * 0.3, 0.62, m.look, { adult: true, t, armAngle: m.inst === "mic" ? -1.2 : 0.3 });
      if (m.inst === "guitar") {
        ctx.fillStyle = "#b03030";
        ctx.beginPath();
        ctx.ellipse(m.x + 4, STAGE_H - 30, 8, 6, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#5a3a1a";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(m.x + 4, STAGE_H - 30);
        ctx.lineTo(m.x + 22, STAGE_H - 44);
        ctx.stroke();
      }
    }
    // crowd barrier + front zone marking
    ctx.fillStyle = "#777";
    ctx.fillRect(0, STAGE_H + 2, W, 5);
    ctx.fillStyle = "#2a2234";
    ctx.fillRect(PIT.x, PIT.y, PIT.w, PIT.h);
    ctx.strokeStyle = "rgba(255,210,74,0.55)";
    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 2;
    ctx.strokeRect(ZONE.x, ZONE.y, ZONE.w, ZONE.h);
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255,210,74,0.5)";
    ctx.font = "bold 12px Segoe UI, Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("VOORAAN", ZONE.x + ZONE.w / 2, ZONE.y + ZONE.h - 6);
  }

  G.c3level7 = {
    title: "Level 7 — Festival-moshpit (17 jaar)",
    intro:
      "Je eerste festival! Je staat <strong>vooraan</strong> bij je favoriete band. Dan begint de <strong>moshpit</strong>...<br>" +
      "Loop met de <strong>pijltjes / WASD</strong>, <strong>duw</strong> mensen weg met <strong>SPATIE</strong>. Blijf in het gele vak <strong>VOORAAN</strong>.<br>" +
      "Een <strong>schaduw</strong> op de grond = er valt een <strong>crowdsurfer</strong>: ga opzij! Overleef <strong>3 nummers</strong>: opwarmen, circle pit en de wall of death.",

    drawBackground(ctx, t) {
      drawStage(ctx, t, 0);
      G.drawKid(ctx, W / 2, ZONE.y + 70, 0.55, G.playerKidLook(), { adult: true, t });
    },

    start(api) {
      this.api = api;
      this.player = { x: W / 2, y: ZONE.y + 55, energy: ENERGY, invuln: 0, stun: 0, facing: 1, moving: false };
      this.cooldown = 0;
      this.song = 0;
      this.time = SONG_MS;
      this.pause = 0;
      this.zoneMeter = 0;
      this.surfers = [];
      this.surfTimer = 2500;
      this.wall = null;
      this.secondWall = false;
      this.flash = 0;
      this.popups = [];
      this.notes = 0;
      this.over = false;
      this.moshers = [];
      for (let i = 0; i < MOSHERS; i++) {
        this.moshers.push({
          x: PIT.x + 30 + Math.random() * (PIT.w - 60),
          y: PIT.y + 40 + Math.random() * (PIT.h - 60),
          vx: 0,
          vy: 0,
          rush: 0,
          rushCd: 1500 + Math.random() * 3000,
          stun: 0,
          circle: i % 2 === 0,
          ang: Math.random() * Math.PI * 2,
          seed: Math.random() * 10,
          look: G.randomLook({ shirt: G.pick(["#111", "#222", "#3a1a1a", "#1a1a3a", "#2a2a2a", "#5a1a1a"]) }),
        });
      }
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 800 });
    },

    onAction() {
      const p = this.player;
      if (this.over || this.cooldown > 0 || p.stun > 0) return;
      this.cooldown = SHOVE_COOLDOWN;
      let shoved = 0;
      for (const m of this.moshers) {
        const d = dist(m, p);
        if (d < SHOVE_RANGE) {
          m.x += ((m.x - p.x) / (d || 1)) * SHOVE_BACK;
          m.y += ((m.y - p.y) / (d || 1)) * SHOVE_BACK;
          m.stun = STUN_MS;
          m.rush = 0;
          clampPit(m);
          shoved++;
        }
      }
      if (shoved) this.popup(shoved > 1 ? "WEG JULLIE!" : "Duw!", p.x, p.y - 50, "#6ee07a");
    },

    hurt(dmg, text, from) {
      const p = this.player;
      if (p.invuln > 0 || this.over) return;
      p.energy -= dmg;
      p.invuln = INVULN_MS;
      this.flash = 250;
      this.popup(text, p.x, p.y - 50, "#ff6b6b");
      if (from) {
        const d = dist(p, from) || 1;
        p.x += ((p.x - from.x) / d) * 38;
        p.y += ((p.y - from.y) / d) * 38;
        clampPit(p);
      }
      if (p.energy <= 0) {
        this.over = true;
        this.api.fail("Je bent vertrapt in de moshpit. Even bijkomen bij de EHBO...");
      }
    },

    startWall() {
      // two rows of moshers line up on the sides, then charge the middle
      const rows = 5;
      const gapL = G.randInt(rows), gapR = G.randInt(rows);
      this.wall = { phase: "line", timer: 1800, runners: [] };
      for (let i = 0; i < rows; i++) {
        const y = PIT.y + 30 + (i + 0.5) * ((PIT.h - 40) / rows);
        if (i !== gapL) this.wall.runners.push({ x: PIT.x + 14, y, dir: 1, look: G.randomLook({ shirt: "#222" }) });
        if (i !== gapR) this.wall.runners.push({ x: PIT.x + PIT.w - 14, y, dir: -1, look: G.randomLook({ shirt: "#3a1a1a" }) });
      }
    },

    update(dt, t) {
      if (this.over) return;
      const s = dt / 1000;
      const p = this.player;
      this.cooldown = Math.max(0, this.cooldown - dt);
      this.flash = Math.max(0, this.flash - dt);
      p.invuln = Math.max(0, p.invuln - dt);
      p.stun = Math.max(0, p.stun - dt);
      this.popups = G.updatePopups(this.popups, dt);

      // between songs: breather
      if (this.pause > 0) {
        this.pause -= dt;
        if (this.pause <= 0 && this.song === 2) this.startWall();
        return;
      }

      this.time -= dt;
      if (this.time <= 0) {
        this.song++;
        if (this.song >= SONGS) {
          this.over = true;
          this.api.complete();
          return;
        }
        this.time = SONG_MS;
        this.pause = PAUSE_MS;
        this.surfers = [];
        p.energy = Math.min(ENERGY, p.energy + 35);
        this.popup("+35 energie", p.x, p.y - 50, "#6ee07a");
        return;
      }

      // player
      if (p.stun <= 0) {
        const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
        const my = (G.held.down ? 1 : 0) - (G.held.up ? 1 : 0);
        p.moving = !!(mx || my);
        if (p.moving) {
          const len = Math.hypot(mx, my);
          p.x += (mx / len) * PLAYER_SPEED * s;
          p.y += (my / len) * PLAYER_SPEED * s;
          if (mx) p.facing = mx;
        }
      }
      clampPit(p);

      // front-zone meter
      if (inRect(p, ZONE)) this.zoneMeter = Math.max(0, this.zoneMeter - ZONE_DRAIN * s);
      else this.zoneMeter += ZONE_FILL * s;
      if (this.zoneMeter >= 100) {
        this.over = true;
        this.api.fail("Je bent je plek vooraan kwijt. Nu sta je achter een lange gast...");
        return;
      }

      // moshers
      const circlePit = this.song >= 1;
      for (const m of this.moshers) {
        m.stun = Math.max(0, m.stun - dt);
        if (m.stun > 0) continue;
        let tx, ty, speed;
        if (circlePit && m.circle) {
          m.ang += s * 1.6;
          tx = CIRCLE.x + Math.cos(m.ang) * CIRCLE.r;
          ty = CIRCLE.y + Math.sin(m.ang) * CIRCLE.r * 0.7;
          speed = 170;
        } else {
          m.rushCd -= dt;
          if (m.rush > 0) {
            m.rush -= dt;
            m.x += m.vx * s;
            m.y += m.vy * s;
            clampPit(m);
            continue;
          }
          if (m.rushCd <= 0) {
            // charge: half the time straight at you
            const aim = Math.random() < 0.5 ? p : { x: PIT.x + Math.random() * PIT.w, y: PIT.y + Math.random() * PIT.h };
            const d = dist(aim, m) || 1;
            const sp = 210 + this.song * 25;
            m.vx = ((aim.x - m.x) / d) * sp;
            m.vy = ((aim.y - m.y) / d) * sp;
            m.rush = 650;
            m.rushCd = (3200 - this.song * 450) + Math.random() * 2200;
            continue;
          }
          // pogo around a little
          tx = m.x + Math.sin(t * 2 + m.seed) * 20;
          ty = m.y + Math.cos(t * 1.7 + m.seed) * 20;
          speed = 40;
        }
        const d = Math.hypot(tx - m.x, ty - m.y) || 1;
        m.vx = ((tx - m.x) / d) * speed;
        m.vy = ((ty - m.y) / d) * speed;
        m.x += m.vx * Math.min(1, d / (speed * s)) * s;
        m.y += m.vy * Math.min(1, d / (speed * s)) * s;
        clampPit(m);
      }

      // bumps: fast moshers send you flying, slow ones just jostle
      for (const m of this.moshers) {
        if (m.stun > 0) continue;
        const d = dist(m, p);
        if (d < 24) {
          const fast = Math.hypot(m.vx, m.vy) > 120;
          if (fast) {
            this.hurt(BUMP_DMG, `-${BUMP_DMG}`, m);
            m.rush = 0;
          } else if (d > 0) {
            p.x += ((p.x - m.x) / d) * 20 * s;
            p.y += ((p.y - m.y) / d) * 20 * s;
          }
        }
      }

      // crowd surfers: shadow first, then they drop
      this.surfTimer -= dt;
      if (this.surfTimer <= 0) {
        this.surfTimer = (2600 - this.song * 600) + Math.random() * 1200;
        const near = Math.random() < 0.7;
        this.surfers.push({
          x: G.clamp(near ? p.x + (Math.random() - 0.5) * 80 : PIT.x + Math.random() * PIT.w, PIT.x + 20, PIT.x + PIT.w - 20),
          y: G.clamp(near ? p.y + (Math.random() - 0.5) * 60 : PIT.y + Math.random() * PIT.h, PIT.y + 20, PIT.y + PIT.h - 10),
          timer: SURF_WARN,
          look: G.randomLook(),
        });
      }
      for (const sf of this.surfers) {
        sf.timer -= dt;
        if (sf.timer <= 0 && !sf.landed) {
          sf.landed = true;
          sf.timer = 700;
          if (dist(sf, p) < 30) {
            this.hurt(SURF_DMG, "CROWDSURFER!", sf);
            p.stun = 500;
          }
        }
        if (sf.landed && sf.timer <= 0) sf.done = true;
      }
      this.surfers = this.surfers.filter((sf) => !sf.done);

      // wall of death: a second one halfway the last song
      if (this.song === 2 && !this.wall && !this.secondWall && this.time < SONG_MS / 2) {
        this.secondWall = true;
        this.startWall();
      }
      if (this.wall) {
        const w = this.wall;
        w.timer -= dt;
        if (w.phase === "line" && w.timer <= 0) {
          w.phase = "charge";
          this.popup("GAAN!!!", W / 2, PIT.y + 30, "#ff4040");
        } else if (w.phase === "charge") {
          for (const r of w.runners) {
            r.x += r.dir * 230 * s;
            if (Math.abs(r.x - p.x) < 20 && Math.abs(r.y - p.y) < 22) this.hurt(WALL_DMG, "WALL OF DEATH!", { x: r.x - r.dir * 10, y: p.y });
          }
          if (w.runners.every((r) => (r.dir > 0 ? r.x > PIT.x + PIT.w : r.x < PIT.x))) this.wall = null;
        }
      }
    },

    render(ctx, t) {
      const playing = this.pause <= 0;
      drawStage(ctx, t, playing ? 1 : 0.3);
      const p = this.player;

      // surfer shadows
      for (const sf of this.surfers) {
        if (sf.landed) continue;
        const k = 1 - sf.timer / SURF_WARN;
        ctx.fillStyle = `rgba(0,0,0,${0.25 + k * 0.45})`;
        ctx.beginPath();
        ctx.ellipse(sf.x, sf.y + 4, 14 + k * 14, 6 + k * 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(255,80,80,${0.4 + 0.4 * Math.sin(t * 18)})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // ring under you so you can find yourself in the crowd
      ctx.strokeStyle = "#6effa0";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 6, 16, 6, 0, 0, Math.PI * 2);
      ctx.stroke();

      // people, sorted back to front
      const actors = this.moshers.map((m) => ({
        y: m.y,
        draw: () => G.drawKid(ctx, m.x, m.y + 6 - (m.stun > 0 ? 0 : Math.abs(Math.sin(t * 10 + m.seed)) * 5), 0.55, m.look, {
          adult: true, t, facing: m.vx >= 0 ? 1 : -1, pose: m.stun > 0 ? "down" : Math.hypot(m.vx, m.vy) > 60 ? "walk" : "stand", dizzy: m.stun > 0, angry: m.rush > 0, armAngle: -1.3,
        }),
      }));
      if (this.wall) for (const r of this.wall.runners) actors.push({ y: r.y, draw: () => G.drawKid(ctx, r.x, r.y + 6, 0.55, r.look, { adult: true, t, facing: r.dir, pose: this.wall.phase === "charge" ? "walk" : "stand", angry: true, armAngle: -1.4 }) });
      for (const sf of this.surfers) if (sf.landed) actors.push({ y: sf.y, draw: () => G.drawKid(ctx, sf.x, sf.y + 6, 0.55, sf.look, { adult: true, t, pose: "down", dizzy: true }) });
      actors.push({ y: p.y, draw: () => G.drawKid(ctx, p.x, p.y + 6, 0.55, G.playerKidLook(), { adult: true, t, facing: p.facing, pose: p.stun > 0 ? "down" : p.moving ? "walk" : "stand", flash: p.invuln > 0, dizzy: p.stun > 0, armAngle: playing ? -1.4 : undefined }) });
      actors.sort((a, b) => a.y - b.y).forEach((a) => a.draw());

      // falling surfers above their shadow
      for (const sf of this.surfers) {
        if (sf.landed) continue;
        const k = 1 - sf.timer / SURF_WARN;
        G.drawKid(ctx, sf.x, sf.y - (1 - k) * 140, 0.55, sf.look, { adult: true, t, pose: "down" });
      }

      // arrow above you
      ctx.fillStyle = "#6effa0";
      const ay = p.y - 52 + Math.sin(t * 6) * 3;
      ctx.beginPath();
      ctx.moveTo(p.x, ay + 8);
      ctx.lineTo(p.x - 7, ay - 2);
      ctx.lineTo(p.x + 7, ay - 2);
      ctx.fill();
      ctx.font = "bold 10px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("JIJ", p.x, ay - 5);

      if (this.wall && this.wall.phase === "line") G.drawBanner(ctx, "WALL OF DEATH! Zoek een gat!", "#ff6b6b", 230);
      if (this.flash > 0) {
        ctx.fillStyle = `rgba(200,40,40,${0.25 * (this.flash / 250)})`;
        ctx.fillRect(0, 0, W, H);
      }

      // HUD
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(10, H - 18, 150, 10);
      ctx.fillRect(W - 160, H - 18, 150, 10);
      ctx.fillStyle = "#6ee07a";
      ctx.fillRect(10, H - 18, 150 * Math.max(0, p.energy / ENERGY), 10);
      ctx.fillStyle = this.zoneMeter > 60 ? "#ff5050" : "#ffd24a";
      ctx.fillRect(W - 160, H - 18, 150 * (this.zoneMeter / 100), 10);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("ENERGIE", 12, H - 21);
      ctx.textAlign = "right";
      ctx.fillText("PLEK KWIJT", W - 10, H - 21);
      ctx.textAlign = "center";
      ctx.font = "bold 13px Segoe UI, Roboto, sans-serif";
      if (playing) ctx.fillText(`${SONG_NAMES[this.song]} · ${Math.ceil(this.time / 1000)}s`, W / 2, H - 24);
      if (!playing && !this.over) G.drawBanner(ctx, SONG_NAMES[this.song], "#ffe066", 240);
      if (playing && Math.floor(t * 3) % 2 === 0) {
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.font = "16px serif";
        ctx.fillText("♪", 120 + Math.sin(t) * 40, 50);
        ctx.fillText("♫", W - 120 + Math.cos(t) * 40, 40);
      }
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return `Nummer ${this.song + 1}/${SONGS} · energie ${Math.max(0, Math.round(this.player.energy))}`;
    },
  };
})();
