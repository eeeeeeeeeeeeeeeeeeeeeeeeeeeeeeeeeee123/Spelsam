(() => {
  const { W, H } = G;
  const DECK = 300;
  const DECK_L = 50;
  const DECK_R = W - 50;
  const SEA = 330;
  const SPEED = 150;
  const HP = 6;
  const INVULN_MS = 800;
  const PUNCH_R = 44;
  const PUNCH_COOLDOWN = 380;
  const KNOCK = 60;
  const FIRE_MS = 260;
  const BULLET_SPEED = 620;
  const PIRATE_HP = 2;
  const PIRATE_SPEED = 60;
  const SWING_WARN = 550;
  const BOAT_HP = 3;
  const BOAT_SPEED = 45;
  const BOAT_EVERY = [3200, 4800];
  const SURVIVE_MS = 60000;

  const PIRATE_LOOK = () => G.randomLook({ shirt: G.pick(["#c02020", "#2a2a2a", "#e8e0d0"]), pants: "#3a2a1a" });

  function drawSeaAndYacht(ctx, t) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#f0a860");
    g.addColorStop(0.5, "#f8d090");
    g.addColorStop(1, "#80b8d8");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#f8e0a0";
    ctx.beginPath();
    ctx.arc(W - 90, 90, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2a7aa8";
    ctx.fillRect(0, SEA, W, H - SEA);
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2;
    for (let y = SEA + 14; y < H; y += 22) {
      ctx.beginPath();
      for (let x = 0; x <= W; x += 20) ctx.lineTo(x, y + Math.sin(x * 0.05 + t * 2 + y) * 3);
      ctx.stroke();
    }
    // the golden yacht
    ctx.fillStyle = "#f4f4f0";
    ctx.beginPath();
    ctx.moveTo(DECK_L - 30, DECK);
    ctx.lineTo(DECK_R + 40, DECK);
    ctx.lineTo(DECK_R + 10, SEA + 20);
    ctx.lineTo(DECK_L - 10, SEA + 20);
    ctx.fill();
    ctx.fillStyle = "#f0c030";
    ctx.fillRect(DECK_L - 26, DECK + 6, DECK_R - DECK_L + 60, 5);
    ctx.fillStyle = "#e8e4dc";
    ctx.fillRect(170, DECK - 70, 200, 70);
    ctx.fillStyle = "rgba(120,170,210,0.7)";
    for (let x = 182; x < 360; x += 40) ctx.fillRect(x, DECK - 58, 26, 18);
    ctx.fillStyle = "#c8a878";
    ctx.fillRect(DECK_L - 26, DECK - 4, DECK_R - DECK_L + 60, 4);
    ctx.fillStyle = "#f0c030";
    ctx.font = "bold 11px Segoe UI, Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("GOUDKUIF ONE", W / 2, DECK + 30);
  }

  function drawBoat(ctx, b, t) {
    const bob = Math.sin(t * 4 + b.x) * 2;
    ctx.save();
    ctx.translate(b.x, b.y + bob);
    ctx.scale(b.dir, 1);
    ctx.fillStyle = b.flash > 0 ? "#fff" : "#2a2a2a";
    ctx.beginPath();
    ctx.moveTo(-34, -8);
    ctx.lineTo(30, -8);
    ctx.lineTo(42, -2);
    ctx.lineTo(28, 8);
    ctx.lineTo(-30, 8);
    ctx.fill();
    ctx.fillStyle = "#c02020";
    ctx.fillRect(-10, -18, 18, 10);
    // skull flag
    ctx.fillStyle = "#111";
    ctx.fillRect(-26, -34, 2, 26);
    ctx.fillRect(-24, -34, 14, 9);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-17, -30, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // wake
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.beginPath();
    ctx.ellipse(-40, 4, 10, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  G.CAREER_LEVELS.president[6] = {
    title: "Level 6 — Piraten op het jacht (26 jaar)",
    intro:
      "Vakantie op je gouden jacht... tot er <strong>piraten</strong> komen! Houd het jacht <strong>60 seconden</strong> vol tot de kustwacht er is.<br>" +
      "<strong>← →</strong> lopen over het dek, <strong>SPATIE</strong> = vuistslag (sla ze <strong>overboord</strong>!). Licht hun sabel <strong>rood</strong> op? Ga weg of sla eerst.<br>" +
      "Schiet hun <strong>speedboten</strong> kapot met de <strong>muis</strong> (<strong>klik</strong>) voor ze aanleggen: elke boot brengt 2 piraten.",

    drawBackground(ctx, t) {
      drawSeaAndYacht(ctx, t);
    },

    start(api) {
      this.api = api;
      this.p = { x: W / 2, hp: HP, invuln: 0, facing: 1, punch: 0, punchCd: 0, moving: false };
      this.aim = { x: 100, y: 380 };
      this.fire = 0;
      this.bullets = [];
      this.boats = [];
      this.boatTimer = 1500;
      this.pirates = [];
      this.splashes = [];
      this.time = SURVIVE_MS;
      this.popups = [];
      this.flash = 0;
      this.over = false;
      this.sunk = 0;
      this.overboard = 0;
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 800 });
    },

    onAction() {
      const p = this.p;
      if (this.over || p.punchCd > 0) return;
      p.punch = 200;
      p.punchCd = PUNCH_COOLDOWN;
      for (const pr of this.pirates) {
        if (pr.state === "climb" || pr.state === "fall") continue;
        const dx = pr.x - p.x;
        if (Math.abs(dx) < PUNCH_R && Math.sign(dx || p.facing) === p.facing) {
          pr.hp--;
          pr.x += p.facing * KNOCK;
          pr.flash = 120;
          pr.state = "walk";
          pr.timer = 600;
          this.popup("POW!", pr.x, DECK - 70, "#ffd24a");
        }
      }
    },

    doFire() {
      if (this.over || this.fire > 0) return;
      this.fire = FIRE_MS;
      const g = { x: this.p.x, y: DECK - 42 };
      const d = Math.hypot(this.aim.x - g.x, this.aim.y - g.y) || 1;
      this.bullets.push({ x: g.x, y: g.y, vx: ((this.aim.x - g.x) / d) * BULLET_SPEED, vy: ((this.aim.y - g.y) / d) * BULLET_SPEED });
    },

    onPointer(x, y) { this.aim = { x, y }; this.doFire(); },
    onPointerMove(x, y) { this.aim = { x, y }; },

    hurt() {
      const p = this.p;
      if (p.invuln > 0 || this.over) return;
      p.hp--;
      p.invuln = INVULN_MS;
      this.flash = 300;
      this.popup("-1 ❤", p.x, DECK - 90, "#ff6b6b");
      if (p.hp <= 0) {
        this.over = true;
        this.api.fail("De piraten hebben je jacht gekaapt!");
      }
    },

    update(dt, t) {
      if (this.over) return;
      const s = dt / 1000;
      const p = this.p;
      this.fire = Math.max(0, this.fire - dt);
      this.flash = Math.max(0, this.flash - dt);
      p.invuln = Math.max(0, p.invuln - dt);
      p.punch = Math.max(0, p.punch - dt);
      p.punchCd = Math.max(0, p.punchCd - dt);
      this.popups = G.updatePopups(this.popups, dt);
      if (G.mouseDown) this.doFire();

      this.time -= dt;
      if (this.time <= 0) {
        this.over = true;
        this.api.complete();
        return;
      }

      const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
      p.moving = !!mx;
      p.x = G.clamp(p.x + mx * SPEED * s, DECK_L + 10, DECK_R - 10);
      if (mx) p.facing = mx;

      // speedboats race in from both sides
      this.boatTimer -= dt;
      if (this.boatTimer <= 0) {
        const k = 1 - this.time / SURVIVE_MS;
        this.boatTimer = BOAT_EVERY[0] - k * 900 + Math.random() * (BOAT_EVERY[1] - BOAT_EVERY[0]);
        const dir = Math.random() < 0.5 ? 1 : -1;
        this.boats.push({ x: dir > 0 ? -50 : W + 50, y: SEA + 40 + Math.random() * 60, dir, hp: BOAT_HP, flash: 0 });
      }
      for (const b of this.boats) {
        b.flash = Math.max(0, b.flash - dt);
        b.x += b.dir * BOAT_SPEED * (1.2 + (1 - this.time / SURVIVE_MS) * 0.6) * s;
        const dock = b.dir > 0 ? DECK_L - 10 : DECK_R + 10;
        if ((b.dir > 0 && b.x >= dock) || (b.dir < 0 && b.x <= dock)) {
          b.done = true;
          for (let k = 0; k < 2; k++) {
            this.pirates.push({ x: b.dir > 0 ? DECK_L + 6 + k * 8 : DECK_R - 6 - k * 8, hp: PIRATE_HP, state: "climb", timer: 700 + k * 700, flash: 0, look: PIRATE_LOOK(), facing: b.dir });
          }
          this.popup("PIRATEN AAN BOORD!", dock, DECK - 60, "#ff8a3a");
        }
      }
      this.boats = this.boats.filter((b) => !b.done);

      // pirates: climb aboard, walk up, wind up a sabre swing
      for (const pr of this.pirates) {
        pr.flash = Math.max(0, pr.flash - dt);
        pr.timer -= dt;
        if (pr.state === "climb") {
          if (pr.timer <= 0) pr.state = "walk";
          continue;
        }
        if (pr.state === "fall") {
          pr.fall += dt;
          if (pr.fall > 700) pr.done = true;
          continue;
        }
        if (pr.hp <= 0 || pr.x < DECK_L - 4 || pr.x > DECK_R + 4) {
          pr.state = "fall";
          pr.fall = 0;
          this.overboard++;
          this.splashes.push({ x: G.clamp(pr.x, 20, W - 20), life: 700 });
          this.popup("OVERBOORD!", pr.x, DECK - 80, "#6ee07a");
          continue;
        }
        pr.facing = p.x >= pr.x ? 1 : -1;
        const d = Math.abs(p.x - pr.x);
        if (pr.state === "walk") {
          if (d > 34) pr.x += pr.facing * PIRATE_SPEED * s;
          else if (pr.timer <= 0) {
            pr.state = "swing";
            pr.timer = SWING_WARN;
          }
        } else if (pr.state === "swing" && pr.timer <= 0) {
          if (Math.abs(p.x - pr.x) < 46) this.hurt();
          pr.state = "walk";
          pr.timer = 900 + Math.random() * 500;
          if (this.over) return;
        }
      }
      // keep pirates from stacking on one spot
      for (let i = 0; i < this.pirates.length; i++)
        for (let j = i + 1; j < this.pirates.length; j++) {
          const a = this.pirates[i], b = this.pirates[j];
          if (a.state !== "walk" && a.state !== "swing") continue;
          if (Math.abs(a.x - b.x) < 18) {
            const push = (18 - Math.abs(a.x - b.x)) / 2;
            a.x += a.x < b.x ? -push : push;
            b.x += a.x < b.x ? push : -push;
          }
        }
      this.pirates = this.pirates.filter((pr) => !pr.done);
      for (const sp of this.splashes) sp.life -= dt;
      this.splashes = this.splashes.filter((sp) => sp.life > 0);

      for (const b of this.bullets) {
        b.x += b.vx * s;
        b.y += b.vy * s;
        if (b.x < -10 || b.x > W + 10 || b.y < -10 || b.y > H + 10) { b.done = true; continue; }
        for (const bt of this.boats) {
          if (Math.abs(b.x - bt.x) < 38 && Math.abs(b.y - bt.y) < 16) {
            b.done = true;
            bt.hp--;
            bt.flash = 90;
            if (bt.hp <= 0) {
              bt.done = true;
              this.sunk++;
              this.splashes.push({ x: bt.x, life: 900, big: true, y: bt.y });
              this.popup("GEZONKEN!", bt.x, bt.y - 30, "#6ee07a");
            }
            break;
          }
        }
        if (b.done) continue;
        for (const pr of this.pirates) {
          if (pr.state === "climb" || pr.state === "fall") continue;
          if (Math.abs(b.x - pr.x) < 10 && b.y > DECK - 60 && b.y < DECK) {
            b.done = true;
            pr.hp--;
            pr.flash = 100;
            break;
          }
        }
      }
      this.bullets = this.bullets.filter((b) => !b.done);
      this.boats = this.boats.filter((b) => !b.done);
    },

    render(ctx, t) {
      drawSeaAndYacht(ctx, t);
      const p = this.p;
      for (const b of this.boats) drawBoat(ctx, b, t);
      for (const sp of this.splashes) {
        const k = sp.life / (sp.big ? 900 : 700);
        ctx.fillStyle = `rgba(255,255,255,${k})`;
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath();
          ctx.arc(sp.x + i * 8, (sp.y || SEA + 6) - (1 - k) * 30 * (1 - Math.abs(i) * 0.3), 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      for (const pr of this.pirates) {
        let y = DECK;
        if (pr.state === "climb") y = DECK + 40 * Math.max(0, pr.timer / 700);
        if (pr.state === "fall") y = DECK + (pr.fall / 700) * 80;
        if (pr.state === "fall" && pr.fall > 400) continue;
        const hand = G.drawKid(ctx, pr.x, y, 0.62, pr.look, { adult: true, t, facing: pr.facing, pose: pr.state === "walk" ? "walk" : "stand", flash: pr.flash > 0, angry: true, armAngle: pr.state === "swing" ? -1.5 : -0.2, dizzy: pr.state === "fall" });
        // bandana + sabre
        ctx.fillStyle = "#c02020";
        ctx.fillRect(pr.x - 10, y - 62 * 0.62 - 14, 20, 4);
        ctx.strokeStyle = pr.state === "swing" ? "#ff4040" : "#d0d4d8";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(hand.x, hand.y);
        ctx.quadraticCurveTo(hand.x + pr.facing * 10, hand.y - 18, hand.x + pr.facing * 4, hand.y - 26);
        ctx.stroke();
      }

      ctx.globalAlpha = p.invuln > 0 && Math.floor(t * 12) % 2 ? 0.5 : 1;
      const look = { ...G.presLook(), shirt: "#f0f0f0", pants: "#1c2a5a" };
      const hand = G.drawKid(ctx, p.x, DECK, 0.65, look, { adult: true, t, facing: p.facing, pose: p.moving ? "walk" : "stand", armAngle: p.punch > 0 ? 0 : -0.5 });
      G.drawQuiff(ctx, p.x, DECK, 0.65, p.facing);
      if (p.punch > 0) {
        ctx.font = "14px serif";
        ctx.textAlign = "center";
        ctx.fillText("👊", hand.x + p.facing * 8, hand.y + 4);
      }
      ctx.globalAlpha = 1;

      ctx.fillStyle = "#ffe066";
      for (const b of this.bullets) ctx.fillRect(b.x - 2, b.y - 1, 4, 2);
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.aim.x, this.aim.y, 8, 0, Math.PI * 2);
      ctx.stroke();

      if (this.flash > 0) {
        ctx.fillStyle = `rgba(200,40,40,${0.3 * (this.flash / 300)})`;
        ctx.fillRect(0, 0, W, H);
      }

      ctx.fillStyle = "#c02020";
      ctx.font = "18px Segoe UI, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("❤".repeat(Math.max(0, p.hp)), 12, 26);
      ctx.fillStyle = "#3a2a1a";
      ctx.font = "bold 13px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`Kustwacht over ${Math.ceil(this.time / 1000)}s · gezonken ${this.sunk} · overboord ${this.overboard}`, W - 12, 24);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return `Kustwacht over ${Math.ceil(this.time / 1000)}s`;
    },
  };
})();
