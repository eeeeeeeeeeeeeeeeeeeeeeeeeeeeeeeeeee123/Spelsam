(() => {
  const { W, H } = G;
  const ARENA = { x: 20, y: 196, w: W - 40, h: H - 206 };
  const R = 11;
  const SPEED = 160;
  const HP = 7;
  const INVULN_MS = 900;
  const FIRE_MS = 150;
  const BOLT_SPEED = 640;
  const QUEEN = { x: W / 2, y: 110 };
  const SACS = [{ dx: -95, dy: 40 }, { dx: 0, dy: 62 }, { dx: 95, dy: 40 }];
  const SAC_HP = 14;
  const SAC_R = 18;
  const SAC_OPEN = 2600;
  const SAC_CLOSED = 2600;
  const HEAD_HP = 34;
  const HEAD = { dx: 0, dy: -30, r: 24 };
  const EGG_HP = 2;
  const HATCH_MS = 3200;
  const BUG_SPEED = 115;
  const MAX_BUGS = 9;
  const ACID_WARN = 1100;
  const ACID_R = 30;
  const PUDDLE_MS = 3200;

  function drawHive(ctx, t) {
    ctx.fillStyle = "#120a10";
    ctx.fillRect(0, 0, W, H);
    // slimy hive walls
    ctx.fillStyle = "#2a1424";
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      ctx.ellipse(i * 50, 20 + Math.sin(i * 2.3) * 10, 40, 60, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#2a1a1e";
    ctx.fillRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);
    ctx.fillStyle = "#34202a";
    for (let i = 0; i < 26; i++) {
      ctx.beginPath();
      ctx.ellipse(30 + ((i * 97) % 480), 210 + ((i * 53) % 220), 18, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(200,255,120,0.3)";
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(ARENA.x, ARENA.y);
    ctx.lineTo(ARENA.x + ARENA.w, ARENA.y);
    ctx.stroke();
    ctx.setLineDash([]);
    // dripping slime
    for (let i = 0; i < 8; i++) {
      const x = 40 + i * 65;
      const len = 20 + ((((t || 0) * 30 + i * 37) % 60));
      ctx.fillStyle = "rgba(170,255,90,0.35)";
      ctx.fillRect(x, 0, 3, len);
    }
  }

  function drawQueen(ctx, q, t) {
    const x = QUEEN.x, y = QUEEN.y + Math.sin(t * 1.5) * 4;
    // legs
    ctx.strokeStyle = "#4a2a5a";
    ctx.lineWidth = 8;
    for (const s of [-1, 1])
      for (let i = 0; i < 3; i++) {
        const sway = Math.sin(t * 3 + i) * 6;
        ctx.beginPath();
        ctx.moveTo(x + s * 50, y + 10 + i * 18);
        ctx.lineTo(x + s * (120 + i * 20), y - 10 + i * 30 + sway);
        ctx.lineTo(x + s * (150 + i * 18), y + 50 + i * 28 + sway);
        ctx.stroke();
      }
    // abdomen
    ctx.fillStyle = q.hurtFlash > 0 ? "#fff" : "#6a3a7a";
    ctx.beginPath();
    ctx.ellipse(x, y + 40, 125, 50, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5a2a6a";
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.ellipse(x + i * 45, y + 40, 14, 40, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // egg sacs
    q.sacs.forEach((sc, i) => {
      const s = SACS[i];
      const sx = x + s.dx, sy = y + s.dy;
      if (sc.hp <= 0) {
        ctx.fillStyle = "#2a1a2a";
        ctx.beginPath();
        ctx.ellipse(sx, sy, 12, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      const glow = sc.open ? 0.75 + 0.25 * Math.sin(t * 12) : 0.2;
      ctx.fillStyle = sc.flash > 0 ? "#fff" : sc.open ? `rgba(255,140,60,${glow})` : "#4a2a50";
      ctx.beginPath();
      ctx.arc(sx, sy, SAC_R, 0, Math.PI * 2);
      ctx.fill();
      if (!sc.open) {
        // armoured plates
        ctx.strokeStyle = "#7a5a8a";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(sx - SAC_R, sy);
        ctx.lineTo(sx + SAC_R, sy);
        ctx.moveTo(sx, sy - SAC_R);
        ctx.lineTo(sx, sy + SAC_R);
        ctx.stroke();
      } else if (sc.warnClose) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(sx - 16, sy + SAC_R + 4, 32, 3);
      ctx.fillStyle = "#ff9a40";
      ctx.fillRect(sx - 16, sy + SAC_R + 4, 32 * (sc.hp / SAC_HP), 3);
    });
    // head
    const hx = x + HEAD.dx, hy = y + HEAD.dy;
    const exposed = q.sacs.every((sc) => sc.hp <= 0);
    ctx.fillStyle = q.headFlash > 0 ? "#fff" : exposed ? "#9a4aaa" : "#7a4a8a";
    ctx.beginPath();
    ctx.ellipse(hx, hy, 40, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    // crown of horns
    ctx.fillStyle = "#c0a0d0";
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(hx + i * 14 - 5, hy - 24);
      ctx.lineTo(hx + i * 16, hy - 46 - (i === 0 ? 10 : 0));
      ctx.lineTo(hx + i * 14 + 5, hy - 24);
      ctx.fill();
    }
    // eyes
    ctx.fillStyle = exposed ? "#ff3030" : "#ffd24a";
    for (const [ex, ey] of [[-16, -6], [16, -6], [-8, -14], [8, -14]]) {
      ctx.beginPath();
      ctx.arc(hx + ex, hy + ey, exposed ? 5 : 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // mandibles
    ctx.strokeStyle = "#c0a0d0";
    ctx.lineWidth = 4;
    const open = Math.sin(t * 6) * 4 + (q.spit > 0 ? 8 : 0);
    ctx.beginPath();
    ctx.moveTo(hx - 10, hy + 18);
    ctx.lineTo(hx - 14 - open, hy + 32);
    ctx.moveTo(hx + 10, hy + 18);
    ctx.lineTo(hx + 14 + open, hy + 32);
    ctx.stroke();
    if (exposed) {
      ctx.strokeStyle = `rgba(255,60,60,${0.5 + 0.4 * Math.sin(t * 10)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(hx, hy, HEAD.r + 10, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  G.CAREER_LEVELS.marine[10] = {
    title: "Level 10 — Eindbaas: de Zwermkoningin (30 jaar)",
    intro:
      "Je bent 30. Diep in het nest wacht de <strong>Zwermkoningin</strong>, de moeder van alle aliens.<br>" +
      "Ze legt <strong>eitjes</strong> die uitkomen in snelle <strong>zwermbeestjes</strong>: schiet de eitjes kapot voor ze uitkomen! Ze spuwt ook <strong>zuur</strong> (rode cirkel = wegwezen).<br>" +
      "Haar zwakke plekken zijn de <strong>3 eierzakken</strong>: alleen als ze <strong>oranje open</strong> gloeien kun je ze raken. Daarna ligt haar <strong>kop</strong> open. Lopen met <strong>WASD / pijltjes</strong>, mik met de <strong>muis</strong>.",

    drawBackground(ctx, t) {
      drawHive(ctx, t);
    },

    start(api) {
      this.api = api;
      this.p = { x: W / 2, y: H - 50, hp: HP, invuln: 0, facing: 1, moving: false };
      this.q = {
        sacs: SACS.map((_, i) => ({ hp: SAC_HP, open: false, timer: 1500 + i * 1300, flash: 0, warnClose: false })),
        headHp: HEAD_HP,
        headFlash: 0,
        hurtFlash: 0,
        eggT: 2200,
        acidT: 3500,
        spit: 0,
      };
      this.aim = { x: W / 2, y: 150 };
      this.fire = 0;
      this.bolts = [];
      this.eggs = [];
      this.bugs = [];
      this.acid = [];
      this.puddles = [];
      this.popups = [];
      this.flash = 0;
      this.over = false;
      this.won = 0;
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 1100 });
    },

    phase2() {
      return this.q.sacs.every((sc) => sc.hp <= 0);
    },

    doFire() {
      if (this.over || this.won || this.fire > 0) return;
      this.fire = FIRE_MS;
      const p = this.p;
      const ox = p.x, oy = p.y - 10;
      const d = Math.hypot(this.aim.x - ox, this.aim.y - oy) || 1;
      this.bolts.push({ x: ox, y: oy, vx: ((this.aim.x - ox) / d) * BOLT_SPEED, vy: ((this.aim.y - oy) / d) * BOLT_SPEED });
    },
    onAction() { this.doFire(); },
    onPointer(x, y) { this.aim = { x, y }; this.doFire(); },
    onPointerMove(x, y) { this.aim = { x, y }; },

    hurt(text = "-1 ❤") {
      const p = this.p;
      if (p.invuln > 0 || this.over || this.won) return;
      p.hp--;
      p.invuln = INVULN_MS;
      this.flash = 300;
      this.popup(text, p.x, p.y - 40, "#ff6b6b");
      if (p.hp <= 0) {
        this.over = true;
        this.api.fail("De zwerm heeft je overweldigd. De koningin regeert verder.");
      }
    },

    update(dt, t) {
      if (this.over) return;
      const s = dt / 1000;
      const p = this.p, q = this.q;
      this.popups = G.updatePopups(this.popups, dt);
      this.flash = Math.max(0, this.flash - dt);
      this.fire = Math.max(0, this.fire - dt);
      p.invuln = Math.max(0, p.invuln - dt);
      q.headFlash = Math.max(0, q.headFlash - dt);
      q.hurtFlash = Math.max(0, q.hurtFlash - dt);
      q.spit = Math.max(0, q.spit - dt);
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
      p.moving = !!(mx || my);
      if (p.moving) {
        const len = Math.hypot(mx, my);
        p.x += (mx / len) * SPEED * s;
        p.y += (my / len) * SPEED * s;
      }
      p.x = G.clamp(p.x, ARENA.x + R, ARENA.x + ARENA.w - R);
      p.y = G.clamp(p.y, ARENA.y + R + 20, ARENA.y + ARENA.h - R);
      p.facing = this.aim.x >= p.x ? 1 : -1;

      const p2 = this.phase2();
      // sacs open and close in turns
      for (const sc of q.sacs) {
        sc.flash = Math.max(0, sc.flash - dt);
        if (sc.hp <= 0) continue;
        sc.timer -= dt;
        sc.warnClose = sc.open && sc.timer < 500;
        if (sc.timer <= 0) {
          sc.open = !sc.open;
          sc.timer = sc.open ? SAC_OPEN : SAC_CLOSED;
        }
      }
      // eggs
      q.eggT -= dt;
      if (q.eggT <= 0) {
        q.eggT = p2 ? 2600 : 3300;
        const n = p2 ? 2 : 1;
        for (let i = 0; i < n; i++) {
          const tx = 50 + Math.random() * (W - 100), ty = ARENA.y + 40 + Math.random() * 120;
          this.eggs.push({ x: QUEEN.x + (Math.random() - 0.5) * 60, y: QUEEN.y + 80, tx, ty, hp: EGG_HP, hatch: HATCH_MS, flash: 0 });
        }
      }
      for (const e of this.eggs) {
        e.flash = Math.max(0, e.flash - dt);
        e.x += (e.tx - e.x) * Math.min(1, s * 3);
        e.y += (e.ty - e.y) * Math.min(1, s * 3);
        e.hatch -= dt;
        if (e.hatch <= 0) {
          e.dead = true;
          const n = this.bugs.length < MAX_BUGS ? 2 : 0;
          for (let i = 0; i < n; i++) this.bugs.push({ x: e.x + (i ? 6 : -6), y: e.y, seed: Math.random() * 9, flash: 0 });
        }
      }
      this.eggs = this.eggs.filter((e) => !e.dead);
      for (const b of this.bugs) {
        const d = Math.hypot(p.x - b.x, p.y - b.y) || 1;
        b.seed += s * 6;
        b.x += ((p.x - b.x) / d) * BUG_SPEED * s + Math.cos(b.seed) * 40 * s;
        b.y += ((p.y - b.y) / d) * BUG_SPEED * s + Math.sin(b.seed) * 40 * s;
        b.y = Math.max(b.y, ARENA.y + 4);
        if (d < R + 8) {
          b.dead = true;
          this.hurt("Gebeten! -1 ❤");
        }
      }
      this.bugs = this.bugs.filter((b) => !b.dead);
      // acid spit
      q.acidT -= dt;
      if (q.acidT <= 0) {
        q.acidT = p2 ? 1900 : 3200;
        q.spit = 400;
        const n = p2 ? 3 : 2;
        for (let i = 0; i < n; i++) {
          const tx = G.clamp(p.x + (i ? (Math.random() - 0.5) * 160 : 0), 40, W - 40);
          const ty = G.clamp(p.y + (i ? (Math.random() - 0.5) * 100 : 0), ARENA.y + 30, ARENA.y + ARENA.h - 20);
          this.acid.push({ x: tx, y: ty, warn: ACID_WARN });
        }
      }
      for (const a of this.acid) {
        a.warn -= dt;
        if (a.warn <= 0) {
          a.done = true;
          this.puddles.push({ x: a.x, y: a.y, life: PUDDLE_MS });
          if (Math.hypot(a.x - p.x, a.y - p.y) < ACID_R) this.hurt("Zuur! -1 ❤");
        }
      }
      this.acid = this.acid.filter((a) => !a.done);
      for (const pd of this.puddles) {
        pd.life -= dt;
        if (Math.hypot(pd.x - p.x, pd.y - p.y) < ACID_R * 0.7) this.hurt("Zuur! -1 ❤");
      }
      this.puddles = this.puddles.filter((pd) => pd.life > 0);
      if (this.over) return;

      // your shots
      const qy = QUEEN.y + Math.sin(t * 1.5) * 4;
      for (const bl of this.bolts) {
        bl.x += bl.vx * s;
        bl.y += bl.vy * s;
        if (bl.x < 0 || bl.x > W || bl.y < 0 || bl.y > H) {
          bl.done = true;
          continue;
        }
        for (const b of this.bugs) {
          if (b.dead || Math.hypot(b.x - bl.x, b.y - bl.y) > 11) continue;
          b.dead = true;
          bl.done = true;
          break;
        }
        if (bl.done) continue;
        for (const e of this.eggs) {
          if (e.dead || Math.hypot(e.x - bl.x, e.y - bl.y) > 11) continue;
          bl.done = true;
          e.hp--;
          e.flash = 80;
          if (e.hp <= 0) e.dead = true;
          break;
        }
        if (bl.done) continue;
        q.sacs.forEach((sc, i) => {
          if (bl.done || sc.hp <= 0) return;
          const sx = QUEEN.x + SACS[i].dx, sy = qy + SACS[i].dy;
          if (Math.hypot(sx - bl.x, sy - bl.y) > SAC_R + 2) return;
          bl.done = true;
          if (!sc.open) return;
          sc.hp--;
          sc.flash = 80;
          q.hurtFlash = 60;
          if (sc.hp <= 0) {
            const left = q.sacs.filter((x) => x.hp > 0).length;
            this.popup(left ? `Eierzak kapot! Nog ${left}` : "Haar KOP ligt open!", sx, sy - 30, "#6ee07a");
          }
        });
        if (bl.done) continue;
        // the head: only hurts once the sacs are gone, otherwise the armour stops the shot
        const hx = QUEEN.x + HEAD.dx, hy = qy + HEAD.dy;
        if (Math.hypot(hx - bl.x, hy - bl.y) < HEAD.r + 6) {
          bl.done = true;
          if (p2) {
            q.headHp--;
            q.headFlash = 80;
            if (q.headHp <= 0) {
              this.won = 3600;
              this.bugs = [];
              this.eggs = [];
              this.acid = [];
              this.popup("De Zwermkoningin is verslagen!", W / 2, 180, "#6ee07a");
            }
          }
          continue;
        }
        // the rest of her body soaks up shots (until her head is exposed)
        const nearSac = q.sacs.some((sc, i) => sc.hp > 0 && Math.hypot(QUEEN.x + SACS[i].dx - bl.x, qy + SACS[i].dy - bl.y) < SAC_R + 16);
        if (!p2 && !nearSac && bl.y < qy + 90 && Math.abs(bl.x - QUEEN.x) < 125 && ((bl.x - QUEEN.x) / 125) ** 2 + ((bl.y - qy - 40) / 50) ** 2 < 1) bl.done = true;
      }
      this.bolts = this.bolts.filter((bl) => !bl.done);
      this.bugs = this.bugs.filter((b) => !b.dead);
      this.eggs = this.eggs.filter((e) => !e.dead);
    },

    render(ctx, t) {
      drawHive(ctx, t);
      const p = this.p, q = this.q;
      if (!this.won || Math.floor(t * 10) % 2) drawQueen(ctx, q, t);
      for (const pd of this.puddles) {
        ctx.fillStyle = `rgba(170,255,60,${0.35 * Math.min(1, pd.life / 600)})`;
        ctx.beginPath();
        ctx.ellipse(pd.x, pd.y, ACID_R * 0.8, ACID_R * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const a of this.acid) {
        ctx.strokeStyle = `rgba(255,60,60,${0.5 + 0.4 * Math.sin(t * 20)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(a.x, a.y, ACID_R, ACID_R * 0.55, 0, 0, Math.PI * 2);
        ctx.stroke();
        // the glob falling in
        const k = a.warn / ACID_WARN;
        ctx.fillStyle = "#aaff3c";
        ctx.beginPath();
        ctx.arc(a.x + (QUEEN.x - a.x) * k, a.y + (QUEEN.y + 10 - a.y) * k - Math.sin((1 - k) * Math.PI) * 60, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const e of this.eggs) {
        const wob = e.hatch < 1000 ? Math.sin(t * 30) * 2 : 0;
        ctx.fillStyle = e.flash > 0 ? "#fff" : "#e8d8b0";
        ctx.beginPath();
        ctx.ellipse(e.x + wob, e.y, 8, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(120,200,60,${0.3 + 0.5 * (1 - e.hatch / HATCH_MS)})`;
        ctx.beginPath();
        ctx.ellipse(e.x + wob, e.y + 2, 4, 6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const b of this.bugs) {
        ctx.fillStyle = "#8a4a9a";
        ctx.beginPath();
        ctx.ellipse(b.x, b.y, 8, 6, Math.atan2(p.y - b.y, p.x - b.x), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#5a2a6a";
        ctx.lineWidth = 2;
        for (const sd of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(b.x - 4, b.y + sd * 4);
          ctx.lineTo(b.x - 8, b.y + sd * (8 + Math.sin(t * 20 + b.seed) * 2));
          ctx.moveTo(b.x + 4, b.y + sd * 4);
          ctx.lineTo(b.x + 8, b.y + sd * (8 - Math.sin(t * 20 + b.seed) * 2));
          ctx.stroke();
        }
        ctx.fillStyle = "#ffd24a";
        ctx.fillRect(b.x - 1, b.y - 2, 2, 2);
      }
      ctx.fillStyle = "#7affd0";
      for (const bl of this.bolts) {
        ctx.beginPath();
        ctx.arc(bl.x, bl.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      const ang = Math.atan2(this.aim.y - p.y, this.aim.x - p.x);
      ctx.globalAlpha = p.invuln > 0 && Math.floor(t * 12) % 2 ? 0.5 : 1;
      const hand = G.drawKid(ctx, p.x, p.y + 12, 0.45, G.marineLook(), { adult: true, t, facing: p.facing, pose: p.moving ? "walk" : "stand", armAngle: G.clamp(p.facing === 1 ? ang : Math.PI - ang, -1.4, 1) });
      G.drawSpaceHelmet(ctx, p.x, p.y + 12, 0.45, p.facing);
      G.drawLaserGun(ctx, hand, ang, p.facing, 0.55, this.fire > FIRE_MS - 60);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.aim.x, this.aim.y, 8, 0, Math.PI * 2);
      ctx.stroke();

      if (this.flash > 0) {
        ctx.fillStyle = `rgba(200,40,40,${0.3 * (this.flash / 300)})`;
        ctx.fillRect(0, 0, W, H);
      }
      if (this.won) G.drawBanner(ctx, "De Zwermkoningin is verslagen!", "#6ee07a", 300);
      // boss bar
      const p2 = this.phase2();
      const total = SAC_HP * 3 + HEAD_HP;
      const left = q.sacs.reduce((a, sc) => a + Math.max(0, sc.hp), 0) + Math.max(0, q.headHp);
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(W / 2 - 120, 6, 240, 10);
      ctx.fillStyle = p2 ? "#ff5050" : "#ff9a40";
      ctx.fillRect(W / 2 - 120, 6, 240 * (left / total), 10);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 9px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(p2 ? "SCHIET OP HAAR KOP!" : "RAAK DE OPEN EIERZAKKEN", W / 2, 26);
      ctx.fillStyle = "#ff6b6b";
      ctx.font = "16px Segoe UI, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("❤".repeat(Math.max(0, p.hp)), 12, 22);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return this.phase2() ? `Koningin: kop ${Math.max(0, this.q.headHp)}/${HEAD_HP}` : `Eierzakken ${this.q.sacs.filter((sc) => sc.hp <= 0).length}/3`;
    },
  };
})();
