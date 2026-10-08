(() => {
  const { W, H } = G;
  const PLAYER_SPEED = 150;
  const BOT_SPEED = 95;
  const R = 11;
  const HP = 3;
  const SHOT_COOLDOWN = 420;
  const BOLT_SPEED = 430;
  const BOT_COUNT = 9;
  const ZONE_START = 320;
  const ZONE_MIN = 60;
  const SHRINK_MS = 42000;
  const ZONE_DMG_MS = 900;
  const BOT_SHOOT_MS = 1100;
  const COLORS = ["#ff5a5a", "#5aa0ff", "#f0c030", "#9a5ae0", "#50c070", "#e070b0", "#60d0d0", "#d08030", "#8090ff"];

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  G.c3level6 = {
    title: "Level 6 — Lasergame (16 jaar)",
    intro:
      "Een lasergame-arena: <strong>10 spelers, 1 winnaar</strong>. Jij bent de laatste die overblijft, of niet.<br>" +
      "Loop met de <strong>pijltjes / WASD</strong>, mik met de <strong>muis</strong>, schiet met <strong>klik</strong> of <strong>SPATIE</strong> (2 rake schoten = uit).<br>" +
      "De <strong>veilige zone</strong> krimpt — blijf erin!",

    drawBackground(ctx, t) {
      ctx.fillStyle = "#15182a";
      ctx.fillRect(0, 0, W, H);
    },

    start(api) {
      this.api = api;
      this.player = { x: W / 2, y: H / 2, hp: HP, facing: 1, alive: true };
      this.aim = { x: W / 2, y: 60 };
      this.cooldown = 0;
      this.bolts = [];
      this.popups = [];
      this.flash = 0;
      this.zoneR = ZONE_START;
      this.zone = { x: W / 2, y: H / 2 };
      this.zoneTarget = { x: 100 + Math.random() * (W - 200), y: 100 + Math.random() * (H - 200) };
      this.zoneTimer = ZONE_DMG_MS;
      this.elapsed = 0;
      this.over = false;
      this.bots = [];
      for (let i = 0; i < BOT_COUNT; i++) {
        const a = (i / BOT_COUNT) * Math.PI * 2;
        this.bots.push({
          x: W / 2 + Math.cos(a) * 150,
          y: H / 2 + Math.sin(a) * 110,
          hp: 2,
          color: COLORS[i],
          alive: true,
          wander: Math.random() * Math.PI * 2,
          wanderT: 0,
          shootT: 1000 + Math.random() * 1500,
          hit: 0,
        });
      }
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 700 });
    },

    aliveCount() {
      return (this.player.alive ? 1 : 0) + this.bots.filter((b) => b.alive).length;
    },

    doShoot() {
      if (this.over || !this.player.alive || this.cooldown > 0) return;
      this.cooldown = SHOT_COOLDOWN;
      const p = this.player;
      const d = dist(p, this.aim) || 1;
      this.bolts.push({ x: p.x, y: p.y, vx: ((this.aim.x - p.x) / d) * BOLT_SPEED, vy: ((this.aim.y - p.y) / d) * BOLT_SPEED, own: "p" });
    },

    onAction() { this.doShoot(); },
    onPointer(x, y) { this.aim = { x, y }; this.doShoot(); },
    onPointerMove(x, y) { this.aim = { x, y }; },

    botShoot(b, target) {
      const d = dist(b, target) || 1;
      const spread = (Math.random() - 0.5) * 0.3;
      const ang = Math.atan2(target.y - b.y, target.x - b.x) + spread;
      this.bolts.push({ x: b.x, y: b.y, vx: Math.cos(ang) * BOLT_SPEED * 0.8, vy: Math.sin(ang) * BOLT_SPEED * 0.8, own: "b" });
    },

    nearestTarget(b) {
      let best = null, bd = 1e9;
      const cand = this.bots.filter((o) => o.alive && o !== b).concat(this.player.alive ? [this.player] : []);
      for (const c of cand) {
        const d = dist(b, c);
        if (d < bd) { bd = d; best = c; }
      }
      return { best, bd };
    },

    update(dt, t) {
      if (this.over) return;
      const s = dt / 1000;
      this.cooldown = Math.max(0, this.cooldown - dt);
      this.flash = Math.max(0, this.flash - dt);
      this.popups = G.updatePopups(this.popups, dt);
      if (G.held.action) this.doShoot();
      this.elapsed += dt;

      // zone shrink
      const k = Math.min(1, this.elapsed / SHRINK_MS);
      this.zoneR = ZONE_START + (ZONE_MIN - ZONE_START) * k;
      this.zone.x += (this.zoneTarget.x - this.zone.x) * Math.min(1, s * 0.4);
      this.zone.y += (this.zoneTarget.y - this.zone.y) * Math.min(1, s * 0.4);

      // player
      const p = this.player;
      if (p.alive) {
        const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
        const my = (G.held.down ? 1 : 0) - (G.held.up ? 1 : 0);
        if (mx || my) {
          const len = Math.hypot(mx, my);
          p.x = G.clamp(p.x + (mx / len) * PLAYER_SPEED * s, R, W - R);
          p.y = G.clamp(p.y + (my / len) * PLAYER_SPEED * s, R, H - R);
          if (mx) p.facing = mx;
        }
        this.zoneTimer -= dt;
        if (dist(p, this.zone) > this.zoneR && this.zoneTimer <= 0) {
          this.zoneTimer = ZONE_DMG_MS;
          p.hp--;
          this.flash = 300;
          this.popup("ZONE!", p.x, p.y - 30, "#c070ff");
          if (p.hp <= 0) { p.alive = false; this.lose(); return; }
        }
      }

      // bots
      for (const b of this.bots) {
        if (!b.alive) continue;
        b.hit = Math.max(0, b.hit - dt);
        b.wanderT -= dt;
        const { best, bd } = this.nearestTarget(b);
        // steer: toward zone center if outside, else toward/strafe target
        let tx, ty;
        if (dist(b, this.zone) > this.zoneR - 20) { tx = this.zone.x; ty = this.zone.y; }
        else if (best && bd < 220) { tx = best.x; ty = best.y; }
        else {
          if (b.wanderT <= 0) { b.wander = Math.random() * Math.PI * 2; b.wanderT = 900; }
          tx = b.x + Math.cos(b.wander) * 40; ty = b.y + Math.sin(b.wander) * 40;
        }
        const d = Math.hypot(tx - b.x, ty - b.y) || 1;
        b.x = G.clamp(b.x + ((tx - b.x) / d) * BOT_SPEED * s, R, W - R);
        b.y = G.clamp(b.y + ((ty - b.y) / d) * BOT_SPEED * s, R, H - R);
        if (dist(b, this.zone) > this.zoneR) { b.hp -= 0; b.zoneT = (b.zoneT || 0) + dt; if (b.zoneT > 1500) { b.zoneT = 0; b.hp--; if (b.hp <= 0) b.alive = false; } }
        b.shootT -= dt;
        if (b.shootT <= 0 && best && bd < 240) { b.shootT = BOT_SHOOT_MS + Math.random() * 600; this.botShoot(b, best); }
      }

      // bolts
      for (const bo of this.bolts) {
        bo.x += bo.vx * s; bo.y += bo.vy * s;
        if (bo.x < -10 || bo.x > W + 10 || bo.y < -10 || bo.y > H + 10) { bo.done = true; continue; }
        if (bo.own === "p") {
          for (const b of this.bots) {
            if (b.alive && dist(bo, b) < R + 3) { bo.done = true; b.hp--; b.hit = 150; if (b.hp <= 0) { b.alive = false; this.popup("UIT", b.x, b.y - 24, "#6ee07a"); } break; }
          }
        } else if (p.alive && dist(bo, p) < R + 3) {
          bo.done = true; p.hp--; this.flash = 300; this.popup("-1", p.x, p.y - 30, "#ff6b6b");
          if (p.hp <= 0) { p.alive = false; this.lose(); return; }
        }
      }
      this.bolts = this.bolts.filter((bo) => !bo.done);

      if (this.aliveCount() <= 1 && p.alive) {
        this.over = true;
        this.api.complete();
      }
    },

    lose() {
      this.over = true;
      this.api.fail("Je bent afgeschoten. Niet de laatste man.");
    },

    render(ctx, t) {
      ctx.fillStyle = "#15182a";
      ctx.fillRect(0, 0, W, H);
      // danger outside zone
      ctx.save();
      ctx.fillStyle = "rgba(140, 40, 180, 0.18)";
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(this.zone.x, this.zone.y, this.zoneR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = "#c070ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.zone.x, this.zone.y, this.zoneR, 0, Math.PI * 2);
      ctx.stroke();

      const drawTagger = (x, y, color, facing, hit) => {
        ctx.fillStyle = hit ? "#fff" : color;
        ctx.beginPath();
        ctx.arc(x, y, R, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(x - (facing < 0 ? R : 0), y - 3, R, 6);
        // vest glow
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, R - 3, 0, Math.PI * 2);
        ctx.stroke();
      };

      for (const b of this.bots) if (b.alive) drawTagger(b.x, b.y, b.color, 1, b.hit > 0);
      if (this.player.alive) {
        drawTagger(this.player.x, this.player.y, "#ffffff", this.player.facing, false);
        // aim line
        ctx.strokeStyle = "rgba(255,255,255,0.4)";
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.moveTo(this.player.x, this.player.y);
        ctx.lineTo(this.aim.x, this.aim.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      for (const bo of this.bolts) {
        ctx.strokeStyle = bo.own === "p" ? "#6effa0" : "#ff6060";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(bo.x, bo.y);
        ctx.lineTo(bo.x - bo.vx * 0.02, bo.y - bo.vy * 0.02);
        ctx.stroke();
      }

      if (this.flash > 0) { ctx.fillStyle = `rgba(200,40,40,${0.25 * (this.flash / 300)})`; ctx.fillRect(0, 0, W, H); }

      ctx.fillStyle = "#fff";
      ctx.font = "18px Segoe UI, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("❤".repeat(Math.max(0, this.player.hp)), 12, 26);
      ctx.font = "bold 14px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`Over: ${this.aliveCount()}`, W - 12, 26);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return `Spelers over: ${this.aliveCount()} · ❤ ${Math.max(0, this.player.hp)}`;
    },
  };
})();
