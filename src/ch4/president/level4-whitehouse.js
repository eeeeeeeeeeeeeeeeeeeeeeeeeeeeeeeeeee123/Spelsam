(() => {
  const { W, H } = G;
  const SETUP_MS = 40000;
  const MAX_TRAPS = 6;
  const SPEED = 140;
  const R = 10;
  const BURGLAR_HP = 5;
  const BURGLAR_SPEED = 38;
  const STUN_MS = 1600;
  const CRACK_MS = 3500;
  const HP = 3;
  const SWING_R = 34;
  const SWING_COOLDOWN = 500;
  const INVULN_MS = 900;
  const SAFE = { x: 270, y: 66 };

  // what's on offer, and which kind of spot each trap works best on
  const TRAPS = {
    knikkers: { label: "Knikkers", emoji: "🔵", count: 2, best: ["vloer"], ok: ["trap"], text: "glijdt uit over de knikkers" },
    verf: { label: "Verf", emoji: "🎨", count: 1, best: ["trap"], ok: ["vloer"], text: "glijdt van de geverfde trap" },
    klink: { label: "Gloeiende klink", emoji: "🔥", count: 1, best: ["deur"], ok: [], text: "pakt de gloeiende deurklink" },
    emmer: { label: "Emmer", emoji: "🪣", count: 1, best: ["deur"], ok: ["raam"], text: "krijgt een emmer op zijn hoofd" },
    strijkijzer: { label: "Strijkijzer", emoji: "🧲", count: 1, best: ["trap"], ok: ["deur", "raam"], text: "krijgt een strijkijzer tegen zijn kop" },
    hamster: { label: "Hamster", emoji: "🐹", count: 1, best: ["raam"], ok: ["vloer", "deur", "trap"], text: "schrikt zich rot van de hamster" },
  };
  const TRAP_IDS = Object.keys(TRAPS);
  const SPOTS = [
    { id: "voordeur", x: 270, y: 405, kind: "deur" },
    { id: "hal", x: 335, y: 335, kind: "vloer" },
    { id: "trap", x: 430, y: 255, kind: "trap" },
    { id: "gang-r", x: 385, y: 160, kind: "vloer" },
    { id: "raam", x: 62, y: 300, kind: "raam" },
    { id: "keuken", x: 110, y: 250, kind: "vloer" },
    { id: "keukendeur", x: 110, y: 192, kind: "deur" },
    { id: "oval", x: 270, y: 128, kind: "deur" },
  ];
  // the two burglars' routes to the safe, passing the spots in order
  const ROUTES = [
    [{ x: 270, y: 450 }, { x: 270, y: 405 }, { x: 270, y: 335 }, { x: 335, y: 335 }, { x: 430, y: 330 }, { x: 430, y: 255 }, { x: 430, y: 160 }, { x: 385, y: 160 }, { x: 270, y: 160 }, { x: 270, y: 128 }, SAFE],
    [{ x: 10, y: 300 }, { x: 62, y: 300 }, { x: 110, y: 300 }, { x: 110, y: 250 }, { x: 110, y: 192 }, { x: 110, y: 160 }, { x: 270, y: 160 }, { x: 270, y: 128 }, SAFE],
  ];
  const ROOMS = [
    { x: 200, y: 30, w: 140, h: 95, name: "OVAL OFFICE", col: "#3a3050" },
    { x: 40, y: 145, w: 460, h: 30, name: "", col: "#4a3a32" },
    { x: 40, y: 175, w: 150, h: 230, name: "KEUKEN", col: "#3a4648" },
    { x: 200, y: 290, w: 200, h: 140, name: "HAL", col: "#4a4038" },
    { x: 400, y: 175, w: 70, h: 180, name: "TRAP", col: "#3e3630" },
  ];
  // openings between the rooms
  const DOORS = [
    { x: 250, y: 110, w: 40, h: 50 }, { x: 90, y: 160, w: 40, h: 30 }, { x: 410, y: 160, w: 50, h: 30 }, { x: 385, y: 300, w: 30, h: 50 },
  ];
  const BURGLAR_LOOKS = [
    { ...G.SKINS.wit, hair: "kort", hairColor: "#1a1212", eyes: G.EYES.bruin, gender: "jongen", shirt: "#222", pants: "#222" },
    { ...G.SKINS.zwart, hair: "krullen", hairColor: "#1a1212", eyes: G.EYES.bruin, gender: "jongen", shirt: "#3a2a4a", pants: "#222" },
  ];

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const inHouse = (x, y) =>
    ROOMS.some((r) => x > r.x + 6 && x < r.x + r.w - 6 && y > r.y + 6 && y < r.y + r.h - 6) ||
    DOORS.some((d) => x > d.x && x < d.x + d.w && y > d.y && y < d.y + d.h);

  G.CAREER_LEVELS.president[4] = {
    title: "Level 4 — Het Witte Huis 's nachts (24 jaar)",
    intro:
      "Je bent president! Je eerste nacht in het Witte Huis... en er komen <strong>2 inbrekers</strong> voor de <strong>kluis</strong> in de Oval Office.<br>" +
      "<strong>Avond (40 sec):</strong> loop naar een lichtende plek en druk <strong>SPATIE</strong> om een val te kiezen (nog eens drukken = volgende soort). Max. 6 vallen. ⭐ = de beste val voor die plek.<br>" +
      "Klaar? Druk <strong>SPATIE</strong> ergens anders dan op een plek om de nacht te beginnen.<br><strong>Nacht:</strong> de inbrekers lopen hun route. Vallen verdoven ze. Geef ze met je <strong>golfclub</strong> een klap (<strong>SPATIE</strong>), het hardst als ze verdoofd zijn. Ze mogen de kluis niet kraken!",

    drawBackground(ctx, t) {
      this.phase = "setup";
      this.traps = {};
      this.drawHouse(ctx, t, true);
    },

    start(api) {
      this.api = api;
      this.phase = "setup";
      this.time = SETUP_MS;
      this.p = { x: 270, y: 160, hp: HP, invuln: 0, facing: 1, swing: 0, swingCd: 0, moving: false };
      this.traps = {}; // spot id -> trap id
      this.stock = Object.fromEntries(TRAP_IDS.map((id) => [id, TRAPS[id].count]));
      this.burglars = [];
      this.popups = [];
      this.flash = 0;
      this.over = false;
      this.won = 0;
      this.nightT = 0;
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 1100 });
    },

    spotHere() {
      return SPOTS.find((s) => dist(s, this.p) < 22);
    },

    trapCount() {
      return Object.keys(this.traps).length;
    },

    // cycle through the traps you still have for this spot: none -> each type -> none
    cycleTrap(spot) {
      const current = this.traps[spot.id];
      if (current) this.stock[current]++;
      delete this.traps[spot.id];
      const order = [null, ...TRAP_IDS];
      let i = order.indexOf(current || null);
      for (let k = 0; k < order.length; k++) {
        i = (i + 1) % order.length;
        const id = order[i];
        if (id === null) break;
        if (this.stock[id] > 0 && (this.trapCount() < MAX_TRAPS)) {
          this.traps[spot.id] = id;
          this.stock[id]--;
          break;
        }
      }
    },

    power(trapId, kind) {
      const t = TRAPS[trapId];
      return t.best.includes(kind) ? 2 : t.ok.includes(kind) ? 1 : 1;
    },

    onAction() {
      if (this.over || this.won) return;
      const p = this.p;
      if (this.phase === "setup") {
        const spot = this.spotHere();
        if (spot) this.cycleTrap(spot);
        else if (this.trapCount() > 0) this.startNight();
        return;
      }
      if (this.phase !== "night" || p.swingCd > 0) return;
      p.swing = 250;
      p.swingCd = SWING_COOLDOWN;
      for (const b of this.burglars) {
        if (b.hp <= 0 || dist(b, p) > SWING_R) continue;
        const dmg = b.stun > 0 ? 2 : 1;
        b.hp -= dmg;
        this.popup(b.stun > 0 ? `FORE! -${dmg}` : `Klap! -${dmg}`, b.x, b.y - 40, "#6ee07a");
        if (b.hp <= 0) {
          this.popup("Uitgeschakeld!", b.x, b.y - 56, "#ffd24a");
        } else if (b.stun <= 0) {
          // an awake burglar hits back
          b.angry = 700;
        }
        b.stun = Math.max(b.stun, 500);
        break;
      }
    },

    startNight() {
      this.phase = "night";
      this.nightT = 0;
      this.p.x = 270;
      this.p.y = 100;
      this.burglars = ROUTES.map((r, i) => ({ x: r[0].x, y: r[0].y, route: r, wp: 1, hp: BURGLAR_HP, stun: 0, delay: i * 2500, crack: 0, angry: 0, look: BURGLAR_LOOKS[i], hit: new Set(), facing: 1 }));
      this.popup("Het is nacht... ze komen eraan!", W / 2, 230, "#ffd24a");
    },

    update(dt) {
      if (this.over) return;
      const s = dt / 1000;
      const p = this.p;
      this.popups = G.updatePopups(this.popups, dt);
      this.flash = Math.max(0, this.flash - dt);
      p.invuln = Math.max(0, p.invuln - dt);
      p.swingCd = Math.max(0, p.swingCd - dt);
      p.swing = Math.max(0, p.swing - dt);

      if (this.won) {
        this.won -= dt;
        if (this.won <= 0) {
          this.over = true;
          this.api.complete();
        }
        return;
      }

      // moving around the house
      const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
      const my = (G.held.down ? 1 : 0) - (G.held.up ? 1 : 0);
      p.moving = !!(mx || my);
      if (p.moving) {
        const len = Math.hypot(mx, my);
        const nx = p.x + (mx / len) * SPEED * s, ny = p.y + (my / len) * SPEED * s;
        if (inHouse(nx, p.y)) p.x = nx;
        if (inHouse(p.x, ny)) p.y = ny;
        if (mx) p.facing = mx;
      }

      if (this.phase === "setup") {
        this.time -= dt;
        if (this.time <= 0) this.startNight();
        return;
      }

      // night
      this.nightT += dt;
      for (const b of this.burglars) {
        if (b.hp <= 0) continue;
        b.angry = Math.max(0, b.angry - dt);
        if (b.delay > 0) {
          b.delay -= dt;
          continue;
        }
        if (b.stun > 0) {
          b.stun -= dt;
          continue;
        }
        if (b.angry > 0 && dist(b, p) < 30 && p.invuln <= 0) {
          p.hp--;
          p.invuln = INVULN_MS;
          this.flash = 300;
          this.popup("Au! Hij slaat terug!", p.x, p.y - 40, "#ff6b6b");
          b.angry = 0;
          if (p.hp <= 0) {
            this.over = true;
            this.api.fail("De inbrekers hebben je uitgeschakeld en de kluis leeggeroofd.");
            return;
          }
        }
        if (b.wp >= b.route.length) {
          // at the safe: cracking it
          b.crack += dt;
          if (b.crack >= CRACK_MS) {
            this.over = true;
            this.api.fail("De kluis is gekraakt! De geheime staatsdocumenten zijn weg.");
            return;
          }
          continue;
        }
        const wp = b.route[b.wp];
        const d = dist(b, wp);
        if (d < 2) b.wp++;
        else {
          b.x += ((wp.x - b.x) / d) * BURGLAR_SPEED * s;
          b.y += ((wp.y - b.y) / d) * BURGLAR_SPEED * s;
          if (Math.abs(wp.x - b.x) > 1) b.facing = wp.x > b.x ? 1 : -1;
        }
        // trigger traps on the way
        for (const sp of SPOTS) {
          const trap = this.traps[sp.id];
          if (!trap || b.hit.has(sp.id) || dist(b, sp) > 14) continue;
          b.hit.add(sp.id);
          const dmg = this.power(trap, sp.kind);
          b.hp -= dmg;
          b.stun = STUN_MS * (dmg === 2 ? 1.3 : 1);
          b.fx = { emoji: TRAPS[trap].emoji, life: 1200 };
          this.popup(`${dmg === 2 ? "AAAH!" : "Au!"} Hij ${TRAPS[trap].text}! -${dmg}`, sp.x, sp.y - 30, dmg === 2 ? "#6ee07a" : "#ffd24a");
          if (b.hp <= 0) this.popup("Uitgeschakeld!", b.x, b.y - 56, "#ffd24a");
          // a trap only works once
          delete this.traps[sp.id];
        }
        if (b.fx) b.fx.life -= dt;
      }

      if (this.burglars.every((b) => b.hp <= 0)) this.won = 2200;
    },

    drawHouse(ctx, t, preview) {
      ctx.fillStyle = "#1a2216";
      ctx.fillRect(0, 0, W, H);
      const night = !preview && this.phase === "night";
      for (const r of ROOMS) {
        ctx.fillStyle = r.col;
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = "#e8e0d0";
        ctx.lineWidth = 3;
        ctx.strokeRect(r.x, r.y, r.w, r.h);
        if (r.name) {
          ctx.fillStyle = "rgba(255,255,255,0.3)";
          ctx.font = "bold 10px Segoe UI, Roboto, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(r.name, r.x + r.w / 2, r.y + 16);
        }
      }
      for (const d of DOORS) {
        ctx.fillStyle = "#4a3a32";
        ctx.fillRect(d.x + 3, d.y, d.w - 6, d.h);
      }
      // stair steps
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.lineWidth = 2;
      for (let y = 190; y < 350; y += 14) {
        ctx.beginPath();
        ctx.moveTo(404, y);
        ctx.lineTo(466, y);
        ctx.stroke();
      }
      // safe, desk, front door, kitchen window
      ctx.fillStyle = "#6a6a72";
      ctx.fillRect(SAFE.x - 14, SAFE.y - 22, 28, 22);
      ctx.fillStyle = "#ffd24a";
      ctx.beginPath();
      ctx.arc(SAFE.x, SAFE.y - 11, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#5a3a22";
      ctx.fillRect(225, 90, 90, 16);
      ctx.fillStyle = "#8a5a2a";
      ctx.fillRect(255, 428, 30, 6);
      ctx.fillStyle = "rgba(150,190,230,0.6)";
      ctx.fillRect(37, 285, 6, 30);
      // trap spots
      const show = preview || this.phase === "setup";
      for (const sp of SPOTS) {
        const trap = this.traps[sp.id];
        if (show) {
          ctx.strokeStyle = trap ? "rgba(110,224,122,0.9)" : `rgba(255,220,100,${0.4 + 0.3 * Math.sin((t || 0) * 4)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, 13, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = "rgba(255,255,255,0.5)";
          ctx.font = "9px Segoe UI, Roboto, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(sp.kind, sp.x, sp.y + 24);
        }
        if (trap) {
          ctx.font = "16px serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(TRAPS[trap].emoji, sp.x, sp.y);
          ctx.textBaseline = "alphabetic";
        }
      }
      if (night) {
        // darkness with a little moonlight
        ctx.fillStyle = "rgba(5,8,20,0.55)";
        ctx.fillRect(0, 0, W, H);
      }
    },

    render(ctx, t) {
      this.drawHouse(ctx, t, false);
      const p = this.p;

      for (const b of this.burglars) {
        if (b.delay > 0) continue;
        if (b.hp > 0 && b.stun <= 0) {
          // flashlight cone
          const wp = b.route[Math.min(b.wp, b.route.length - 1)];
          const a = Math.atan2(wp.y - b.y, wp.x - b.x);
          ctx.fillStyle = "rgba(255,250,200,0.18)";
          ctx.beginPath();
          ctx.moveTo(b.x, b.y);
          ctx.arc(b.x, b.y, 70, a - 0.35, a + 0.35);
          ctx.closePath();
          ctx.fill();
        }
        G.drawKid(ctx, b.x, b.y + 12, 0.45, b.look, { adult: true, t, facing: b.facing, pose: b.hp <= 0 ? "down" : b.stun > 0 ? "stand" : "walk", dizzy: b.stun > 0 || b.hp <= 0, angry: b.angry > 0 });
        // ski mask
        if (b.hp > 0) {
          ctx.fillStyle = "#111";
          ctx.fillRect(b.x - 6 + b.facing, b.y - 25, 12, 4);
        }
        if (b.fx && b.fx.life > 0) {
          ctx.font = "16px serif";
          ctx.textAlign = "center";
          ctx.fillText(b.fx.emoji, b.x + 14, b.y - 34);
        }
        if (b.hp > 0) {
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(b.x - 14, b.y - 44, 28, 4);
          ctx.fillStyle = "#e05050";
          ctx.fillRect(b.x - 14, b.y - 44, 28 * (b.hp / BURGLAR_HP), 4);
        }
        if (b.crack > 0 && b.hp > 0) {
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(SAFE.x - 24, SAFE.y - 36, 48, 6);
          ctx.fillStyle = "#ff4040";
          ctx.fillRect(SAFE.x - 24, SAFE.y - 36, 48 * (b.crack / CRACK_MS), 6);
          ctx.fillStyle = "#ff4040";
          ctx.font = "bold 11px Segoe UI, Roboto, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("KLUIS KRAKEN!", SAFE.x, SAFE.y - 42);
        }
      }

      // the president in pyjamas with a golf club
      ctx.globalAlpha = p.invuln > 0 && Math.floor(t * 12) % 2 ? 0.5 : 1;
      const look = this.phase === "night" ? { ...G.presLook(), shirt: "#6a8ac8", pants: "#6a8ac8" } : G.presLook();
      const hand = G.drawKid(ctx, p.x, p.y + 12, 0.45, look, { adult: true, t, facing: p.facing, pose: p.moving ? "walk" : "stand", armAngle: p.swing > 0 ? 0.3 : -1.2 });
      G.drawQuiff(ctx, p.x, p.y + 12, 0.45, p.facing);
      if (this.phase === "night") {
        ctx.save();
        ctx.translate(hand.x, hand.y);
        ctx.rotate(p.swing > 0 ? p.facing * 1.2 : -p.facing * 0.5);
        ctx.fillStyle = "#c8c8c8";
        ctx.fillRect(-1, -24, 2, 24);
        ctx.fillStyle = "#888";
        ctx.fillRect(-1 + p.facing * 0, -28, p.facing * 8, 5);
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      if (this.phase === "setup") {
        const spot = this.spotHere();
        // stock panel
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(W - 150, H - 120, 140, 110);
        ctx.font = "11px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "left";
        TRAP_IDS.forEach((id, i) => {
          const tr = TRAPS[id];
          const star = spot && tr.best.includes(spot.kind) ? " ⭐" : "";
          ctx.fillStyle = this.stock[id] > 0 ? "#fff" : "#777";
          ctx.fillText(`${tr.emoji} ${tr.label} ×${this.stock[id]}${star}`, W - 142, H - 102 + i * 16);
        });
        if (spot) {
          const tr = this.traps[spot.id];
          G.drawBubble(ctx, spot.x, spot.y - 30, tr ? `${TRAPS[tr].label} (SPATIE = andere)` : `${spot.kind}: SPATIE = val zetten`);
        }
        ctx.fillStyle = "#fff";
        ctx.font = "bold 14px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`Vallen ${this.trapCount()}/${MAX_TRAPS} · nacht over ${Math.ceil(this.time / 1000)}s${this.trapCount() && !spot ? " · SPATIE = klaar" : ""}`, W / 2, H - 6);
      } else {
        ctx.fillStyle = "#ff6b6b";
        ctx.font = "16px Segoe UI, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("❤".repeat(Math.max(0, p.hp)), 12, 22);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(`Inbrekers over: ${this.burglars.filter((b) => b.hp > 0).length}/2`, W - 12, 22);
      }
      if (this.flash > 0) {
        ctx.fillStyle = `rgba(200,40,40,${0.3 * (this.flash / 300)})`;
        ctx.fillRect(0, 0, W, H);
      }
      if (this.won) G.drawBanner(ctx, "Inbrekers verslagen! Het Witte Huis is veilig.", "#6ee07a", H / 2);
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return this.phase === "setup" ? `Vallen zetten · nacht over ${Math.ceil(this.time / 1000)}s` : "Verdedig de kluis!";
    },
  };
})();
