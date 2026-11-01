(() => {
  const { W, H } = G;
  const R = 12;
  const SPEED = 150;
  const HP = 5;
  const INVULN_MS = 700;
  const FIRE_MS = 170;
  const BULLET_SPEED = 650;
  const MARINE_HP = 22;
  const MARINE_SPEED = 120;
  const BOLT_SPEED = 270;
  const NADE_WARN = 1100;
  const NADE_R = 52;
  const INTRO_MS = 2600;
  const CRATES = [
    { x: 110, y: 120, w: 50, h: 40 }, { x: 380, y: 110, w: 50, h: 40 },
    { x: 245, y: 200, w: 50, h: 50 }, { x: 90, y: 300, w: 50, h: 40 },
    { x: 400, y: 300, w: 50, h: 40 }, { x: 240, y: 360, w: 60, h: 30 },
  ];
  const MARINE_LOOK = { ...G.SKINS.wit, hair: "kort", hairColor: "#ddd", eyes: G.EYES.blauw, gender: "jongen", shirt: "#e8eef4", pants: "#c8d0d8" };

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const inCrate = (x, y) => CRATES.some((c) => x > c.x && x < c.x + c.w && y > c.y && y < c.y + c.h);
  function collide(o) {
    for (const c of CRATES) {
      const cx = G.clamp(o.x, c.x, c.x + c.w), cy = G.clamp(o.y, c.y, c.y + c.h);
      const d = Math.hypot(o.x - cx, o.y - cy);
      if (d < R && d > 0) {
        o.x = cx + ((o.x - cx) / d) * R;
        o.y = cy + ((o.y - cy) / d) * R;
      }
    }
    o.x = G.clamp(o.x, R + 20, W - R - 20);
    o.y = G.clamp(o.y, R + 50, H - R - 10);
  }
  function lineOfSight(a, b) {
    const n = Math.ceil(dist(a, b) / 8);
    for (let i = 1; i < n; i++) if (inCrate(a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n)) return false;
    return true;
  }

  function drawBase(ctx, t) {
    ctx.fillStyle = "#1a2218";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#24301f";
    ctx.fillRect(20, 50, W - 40, H - 60);
    // searchlight sweep
    const a = Math.sin(t * 0.6) * 0.8;
    ctx.fillStyle = "rgba(255,255,220,0.05)";
    ctx.beginPath();
    ctx.moveTo(W / 2, 40);
    ctx.lineTo(W / 2 + Math.sin(a - 0.2) * 600, 40 + Math.cos(a - 0.2) * 600);
    ctx.lineTo(W / 2 + Math.sin(a + 0.2) * 600, 40 + Math.cos(a + 0.2) * 600);
    ctx.fill();
    // fence
    ctx.strokeStyle = "rgba(200,200,200,0.25)";
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 50, W - 40, H - 60);
    // crashed capsule in the corner
    ctx.fillStyle = "#c8ccd4";
    ctx.beginPath();
    ctx.ellipse(W - 70, 80, 30, 18, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,140,40,0.6)";
    ctx.beginPath();
    ctx.arc(W - 90, 92, 6 + Math.sin(t * 10) * 2, 0, Math.PI * 2);
    ctx.fill();
    for (const c of CRATES) {
      ctx.fillStyle = "#7a5a32";
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.strokeStyle = "#5a3a1a";
      ctx.lineWidth = 2;
      ctx.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(c.x + c.w, c.y + c.h);
      ctx.stroke();
    }
  }

  G.CAREER_LEVELS.soldaat[7] = {
    title: "Level 7 — Vreemde bezoeker (27 jaar)",
    intro:
      "Midden in de nacht stort er een <strong>capsule</strong> neer naast je basis. Er stapt iemand uit in een <strong>ruimtepak</strong>...<br>" +
      "Hij denkt dat jij een alien bent. Jij denkt hetzelfde. <strong>Duel tussen de kratten!</strong><br>" +
      "Lopen met <strong>pijltjes / WASD</strong>, mik met de <strong>muis</strong>, schiet met <strong>klik</strong> / <strong>SPATIE</strong>. Kratten houden kogels tegen. Rode cirkel = plasmagranaat: wegwezen!",

    drawBackground(ctx, t) {
      drawBase(ctx, t);
    },

    start(api) {
      this.api = api;
      this.p = { x: 80, y: 220, hp: HP, invuln: 0, facing: 1, moving: false };
      this.m = { x: W - 90, y: 140, hp: MARINE_HP, state: "talk", timer: INTRO_MS, cover: null, flash: 0, facing: -1, cycle: 0, burst: 0 };
      this.aim = { x: W - 90, y: 140 };
      this.fire = 0;
      this.bullets = [];
      this.bolts = [];
      this.nades = [];
      this.flash = 0;
      this.popups = [];
      this.over = false;
      this.won = 0;
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 800 });
    },

    doFire() {
      if (this.over || this.won || this.fire > 0 || this.m.state === "talk") return;
      this.fire = FIRE_MS;
      const p = this.p;
      const d = dist(p, this.aim) || 1;
      this.bullets.push({ x: p.x, y: p.y - 10, vx: ((this.aim.x - p.x) / d) * BULLET_SPEED, vy: ((this.aim.y - p.y) / d) * BULLET_SPEED });
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
      this.popup("-1 ❤", p.x, p.y - 40, "#ff6b6b");
      if (p.hp <= 0) {
        this.over = true;
        this.api.fail("De bezoeker uit de ruimte was sneller dan jij.");
      }
    },

    // a spot behind a crate, seen from the player
    pickCover() {
      const p = this.p;
      let best = null, bd = -1;
      for (const c of CRATES) {
        const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
        const d = Math.hypot(cx - p.x, cy - p.y) || 1;
        const spot = { x: cx + ((cx - p.x) / d) * (Math.max(c.w, c.h) / 2 + 18), y: cy + ((cy - p.y) / d) * (Math.max(c.w, c.h) / 2 + 18) };
        const score = Math.min(d, 260) + Math.random() * 80 - (c === this.m.lastCover ? 200 : 0);
        if (spot.x > 40 && spot.x < W - 40 && spot.y > 60 && spot.y < H - 20 && score > bd) {
          bd = score;
          best = { spot, crate: c };
        }
      }
      this.m.lastCover = best.crate;
      return best.spot;
    },

    update(dt, t) {
      if (this.over) return;
      const s = dt / 1000;
      const p = this.p, m = this.m;
      this.fire = Math.max(0, this.fire - dt);
      this.flash = Math.max(0, this.flash - dt);
      p.invuln = Math.max(0, p.invuln - dt);
      m.flash = Math.max(0, m.flash - dt);
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

      const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
      const my = (G.held.down ? 1 : 0) - (G.held.up ? 1 : 0);
      p.moving = !!(mx || my);
      if (p.moving && m.state !== "talk") {
        const len = Math.hypot(mx, my);
        p.x += (mx / len) * SPEED * s;
        p.y += (my / len) * SPEED * s;
        collide(p);
      }
      p.facing = this.aim.x >= p.x ? 1 : -1;
      m.facing = p.x >= m.x ? 1 : -1;

      // marine: hide, peek out and shoot, sometimes lob a plasma grenade
      m.timer -= dt;
      if (m.state === "talk") {
        if (m.timer <= 0) {
          m.state = "move";
          m.cover = this.pickCover();
        }
      } else if (m.state === "move") {
        const d = dist(m, m.cover);
        if (d > 4) {
          m.x += ((m.cover.x - m.x) / d) * MARINE_SPEED * s;
          m.y += ((m.cover.y - m.y) / d) * MARINE_SPEED * s;
          collide(m);
        }
        if (d < 6 || m.timer < -2500) {
          m.state = "hide";
          m.timer = 700 + Math.random() * 700;
        }
      } else if (m.state === "hide" && m.timer <= 0) {
        m.cycle++;
        if (m.cycle % 3 === 0) {
          this.nades.push({ x: p.x, y: p.y, warn: NADE_WARN, boom: 0 });
          m.state = "move";
          m.timer = 0;
          m.cover = this.pickCover();
        } else {
          // step out sideways to get a line of sight
          const d = dist(m, p) || 1;
          const side = Math.random() < 0.5 ? 1 : -1;
          m.peek = { x: G.clamp(m.x + (-(p.y - m.y) / d) * 40 * side, 40, W - 40), y: G.clamp(m.y + ((p.x - m.x) / d) * 40 * side, 60, H - 20) };
          m.state = "peek";
          m.timer = 650;
        }
      } else if (m.state === "peek") {
        const d = dist(m, m.peek);
        if (d > 3) {
          m.x += ((m.peek.x - m.x) / d) * MARINE_SPEED * s;
          m.y += ((m.peek.y - m.y) / d) * MARINE_SPEED * s;
          collide(m);
        }
        if (m.timer <= 0) {
          m.state = "shoot";
          m.timer = 900;
          m.burst = 0;
          m.shots = 0;
        }
      } else if (m.state === "shoot") {
        m.burst -= dt;
        if (m.burst <= 0 && m.shots < 3 && lineOfSight(m, p)) {
          m.burst = 220;
          m.shots++;
          const d = dist(m, p) || 1;
          const spread = (Math.random() - 0.5) * 0.12;
          const ang = Math.atan2(p.y - m.y, p.x - m.x) + spread;
          this.bolts.push({ x: m.x, y: m.y - 10, vx: Math.cos(ang) * BOLT_SPEED, vy: Math.sin(ang) * BOLT_SPEED });
        }
        if (m.timer <= 0) {
          m.state = "move";
          m.timer = 0;
          m.cover = this.pickCover();
        }
      }

      for (const n of this.nades) {
        if (n.warn > 0) {
          n.warn -= dt;
          if (n.warn <= 0) {
            n.boom = 400;
            if (dist(n, p) < NADE_R) this.hurt();
          }
        } else {
          n.boom -= dt;
          if (n.boom <= 0) n.done = true;
        }
      }
      this.nades = this.nades.filter((n) => !n.done);

      for (const b of this.bolts) {
        b.x += b.vx * s;
        b.y += b.vy * s;
        if (b.x < 0 || b.x > W || b.y < 0 || b.y > H || inCrate(b.x, b.y)) b.done = true;
        else if (dist(b, { x: p.x, y: p.y - 10 }) < R + 4) {
          b.done = true;
          this.hurt();
        }
      }
      this.bolts = this.bolts.filter((b) => !b.done);
      if (this.over) return;

      for (const b of this.bullets) {
        b.x += b.vx * s;
        b.y += b.vy * s;
        if (b.x < 0 || b.x > W || b.y < 0 || b.y > H || inCrate(b.x, b.y)) b.done = true;
        else if (dist(b, { x: m.x, y: m.y - 10 }) < R + 4) {
          b.done = true;
          m.hp--;
          m.flash = 90;
          if (m.hp <= 0) {
            this.won = 3200;
            this.bolts = [];
            this.nades = [];
          }
        }
      }
      this.bullets = this.bullets.filter((b) => !b.done);
    },

    render(ctx, t) {
      drawBase(ctx, t);
      const p = this.p, m = this.m;

      for (const n of this.nades) {
        if (n.warn > 0) {
          ctx.strokeStyle = `rgba(160,80,255,${0.5 + 0.4 * Math.sin(t * 20)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(n.x, n.y, NADE_R, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = "#b080ff";
          ctx.beginPath();
          ctx.arc(n.x, n.y, 5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = `rgba(170,90,255,${n.boom / 400 * 0.7})`;
          ctx.beginPath();
          ctx.arc(n.x, n.y, NADE_R, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // marine
      const mHand = G.drawKid(ctx, m.x, m.y + 14, 0.5, MARINE_LOOK, { adult: true, t, facing: m.facing, pose: this.won ? "down" : m.state === "move" ? "walk" : "stand", flash: m.flash > 0, dizzy: !!this.won, armAngle: -0.1 });
      if (!this.won) {
        // space helmet with glowing visor
        ctx.strokeStyle = "rgba(220,230,240,0.9)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(m.x + m.facing, m.y + 14 - 76 * 0.5, 11, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "rgba(122,255,208,0.35)";
        ctx.beginPath();
        ctx.arc(m.x + m.facing * 3, m.y + 14 - 76 * 0.5, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#c8d0e0";
        ctx.fillRect(mHand.x - (m.facing < 0 ? 18 : 0), mHand.y - 3, 18, 6);
        ctx.fillStyle = "#7affd0";
        ctx.fillRect(mHand.x + m.facing * 16 - 2, mHand.y - 2, 4, 4);
      }
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(m.x - 18, m.y - 38, 36, 4);
      ctx.fillStyle = "#7affd0";
      ctx.fillRect(m.x - 18, m.y - 38, 36 * Math.max(0, m.hp / MARINE_HP), 4);

      // you
      const ang = Math.atan2(this.aim.y - p.y, this.aim.x - p.x);
      const hand = G.drawKid(ctx, p.x, p.y + 14, 0.5, G.soldierLook(), { adult: true, t, facing: p.facing, pose: p.moving ? "walk" : "stand", flash: p.invuln > 0, armAngle: G.clamp(p.facing === 1 ? ang : Math.PI - ang, -1.4, 1) });
      G.drawHelmet(ctx, p.x, p.y + 14, 0.5, p.facing);
      G.drawRifle(ctx, hand, ang, p.facing, 0.55, this.fire > FIRE_MS / 2);

      ctx.fillStyle = "#ffe066";
      for (const b of this.bullets) ctx.fillRect(b.x - 2, b.y - 1, 4, 2);
      for (const b of this.bolts) {
        ctx.fillStyle = "#7affd0";
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(122,255,208,0.3)";
        ctx.beginPath();
        ctx.arc(b.x - b.vx * 0.03, b.y - b.vy * 0.03, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.aim.x, this.aim.y, 8, 0, Math.PI * 2);
      ctx.stroke();

      if (m.state === "talk") {
        const k = m.timer > INTRO_MS / 2;
        G.drawBubble(ctx, k ? m.x : p.x, (k ? m.y : p.y) - 46, k ? "Een ALIEN?! Niet schieten... of toch wel!" : "Een alien in mijn basis?!");
      }
      if (this.won) {
        G.drawBanner(ctx, "Bezoeker uitgeschakeld!", "#6ee07a", 90);
        if (this.won < 2000) G.drawBubble(ctx, m.x, m.y - 30, "Ik ben... geen alien... ik kom van het ruimtestation...");
      }
      if (this.flash > 0) {
        ctx.fillStyle = `rgba(200,40,40,${0.3 * (this.flash / 300)})`;
        ctx.fillRect(0, 0, W, H);
      }

      ctx.fillStyle = "#ff6b6b";
      ctx.font = "18px Segoe UI, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("❤".repeat(Math.max(0, p.hp)), 12, 30);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("👽 Space marine", W - 14, 30);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return `Duel · bezoeker ${Math.max(0, this.m.hp)}/${MARINE_HP}`;
    },
  };
})();
