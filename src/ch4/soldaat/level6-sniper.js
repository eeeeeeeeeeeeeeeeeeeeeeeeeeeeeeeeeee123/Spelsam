(() => {
  const { W, H } = G;
  const ZOOM = 2.4;
  const SCOPE_R = 85;
  const OFFICERS = 5;
  const SOLDIERS = 5;
  const CIVILIANS = 6;
  const AMMO = 12;
  const STRIKES = 2;
  const TIME_MS = 75000;
  const TRAVEL_MS = 280;
  const WIND_MS = 9000;
  const DRIFT = 12; // world px per wind step at the target
  const LANES = [
    { y: 200, s: 0.3 },
    { y: 255, s: 0.36 },
    { y: 320, s: 0.42 },
  ];
  const CIV_SHIRTS = ["#e05a8a", "#5ab0e0", "#f0c040", "#70c070", "#e0e0e0"];

  function drawVillage(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#c8d8e8");
    g.addColorStop(1, "#e8d8b8");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#b8a888";
    ctx.beginPath();
    ctx.moveTo(0, 150);
    for (let x = 0; x <= W; x += 30) ctx.lineTo(x, 150 - Math.sin(x * 0.01) * 25);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.fill();
    // houses along the streets
    const houses = [[30, 150, 70, 50], [140, 160, 60, 40], [250, 145, 80, 55], [380, 155, 60, 45], [470, 150, 60, 50],
      [20, 205, 90, 50], [330, 210, 80, 45], [450, 200, 70, 55]];
    for (const [x, y, w, h] of houses) {
      ctx.fillStyle = "#d8c8a0";
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "#a88860";
      ctx.fillRect(x - 3, y - 5, w + 6, 6);
      ctx.fillStyle = "#3a2a1a";
      ctx.fillRect(x + w / 2 - 5, y + h - 16, 10, 16);
      ctx.fillRect(x + 8, y + 10, 8, 8);
    }
    ctx.fillStyle = "#c8b890";
    for (const l of LANES) ctx.fillRect(0, l.y - 4, W, 8);
    // a tent and a jeep at the enemy camp
    ctx.fillStyle = "#6a7a4a";
    ctx.beginPath();
    ctx.moveTo(200, 250);
    ctx.lineTo(240, 215);
    ctx.lineTo(280, 250);
    ctx.fill();
  }

  G.CAREER_LEVELS.soldaat[6] = {
    title: "Level 6 — Sluipschutter (26 jaar)",
    intro:
      "Vanaf een heuvel kijk je door je <strong>scoop</strong> op een vijandelijk dorp. Schakel de <strong>5 officieren</strong> uit (rode baret).<br>" +
      "Beweeg de scoop met de <strong>muis</strong>, schiet met <strong>klik</strong> / <strong>SPATIE</strong>. Let op de <strong>wind</strong>: mik een stukje tegen de wind in.<br>" +
      "Je hebt <strong>12 kogels</strong>. Mis je, dan rennen ze weg. <strong>Burgers raken = missie mislukt</strong> (2 keer).",

    drawBackground(ctx) {
      drawVillage(ctx);
    },

    start(api) {
      this.api = api;
      this.aim = { x: W / 2, y: 250 };
      this.ammo = AMMO;
      this.strikes = 0;
      this.officers = OFFICERS;
      this.time = TIME_MS;
      this.wind = 0;
      this.windTimer = 0;
      this.shots = [];
      this.marks = [];
      this.popups = [];
      this.recoil = 0;
      this.over = false;
      this.people = [];
      const add = (kind) => {
        const lane = G.randInt(LANES.length);
        this.people.push({
          kind,
          lane,
          x: 30 + Math.random() * (W - 60),
          dir: Math.random() < 0.5 ? -1 : 1,
          speed: 14 + Math.random() * 14,
          pause: Math.random() * 2000,
          panic: 0,
          dead: false,
          look: kind === "civ" ? G.randomLook({ shirt: G.pick(CIV_SHIRTS) }) : G.ENEMY_LOOK(),
        });
      };
      for (let i = 0; i < OFFICERS; i++) add("officer");
      for (let i = 0; i < SOLDIERS; i++) add("soldier");
      for (let i = 0; i < CIVILIANS; i++) add("civ");
      this.newWind();
    },

    newWind() {
      this.wind = G.randInt(7) - 3; // -3..3
      this.windTimer = WIND_MS;
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 1000 });
    },

    onAction() {
      if (this.over || this.ammo <= 0 || this.recoil > 0) return;
      this.ammo--;
      this.recoil = 650;
      this.shots.push({ x: this.aim.x + this.wind * DRIFT, y: this.aim.y, t: TRAVEL_MS });
    },
    onPointer(x, y) {
      this.aim = { x, y };
      this.onAction();
    },
    onPointerMove(x, y) {
      this.aim = { x, y };
    },

    resolve(shot) {
      let hit = null;
      for (const p of this.people) {
        if (p.dead) continue;
        const l = LANES[p.lane];
        const h = 92 * l.s;
        if (Math.abs(shot.x - p.x) < 9 * l.s * 1.6 && shot.y < l.y && shot.y > l.y - h) {
          hit = p;
          break;
        }
      }
      this.marks.push({ x: shot.x, y: shot.y, life: 1500 });
      if (!hit) {
        // a miss: everyone nearby panics
        for (const p of this.people) if (!p.dead && Math.abs(p.x - shot.x) < 110) p.panic = 2600;
        this.popup("Mis!", this.aim.x, this.aim.y - 30, "#ffd24a");
        return;
      }
      hit.dead = true;
      const l = LANES[hit.lane];
      if (hit.kind === "civ") {
        this.strikes++;
        this.popup("BURGER!", hit.x, l.y - 50, "#ff4040");
        if (this.strikes >= STRIKES) {
          this.over = true;
          this.api.fail("Je raakte burgers. De missie wordt afgeblazen.");
          return;
        }
      } else if (hit.kind === "officer") {
        this.officers--;
        this.popup("OFFICIER!", hit.x, l.y - 50, "#6ee07a");
        if (this.officers <= 0) {
          this.over = true;
          this.api.complete();
          return;
        }
      } else this.popup("Soldaat", hit.x, l.y - 50, "#cfcfcf");
      for (const p of this.people) if (!p.dead && Math.abs(p.x - hit.x) < 140) p.panic = 2200;
    },

    update(dt) {
      if (this.over) return;
      const s = dt / 1000;
      this.recoil = Math.max(0, this.recoil - dt);
      this.popups = G.updatePopups(this.popups, dt);
      this.time -= dt;
      if (this.time <= 0) {
        this.over = true;
        this.api.fail("De officieren zijn vertrokken. Te laat.");
        return;
      }
      this.windTimer -= dt;
      if (this.windTimer <= 0) this.newWind();

      for (const sh of this.shots) {
        sh.t -= dt;
        if (sh.t <= 0) {
          sh.done = true;
          this.resolve(sh);
          if (this.over) return;
        }
      }
      this.shots = this.shots.filter((sh) => !sh.done);
      for (const m of this.marks) m.life -= dt;
      this.marks = this.marks.filter((m) => m.life > 0);
      if (this.ammo <= 0 && this.shots.length === 0) {
        this.over = true;
        this.api.fail("Je kogels zijn op en er lopen nog officieren rond.");
        return;
      }

      for (const p of this.people) {
        if (p.dead) continue;
        p.panic = Math.max(0, p.panic - dt);
        if (p.pause > 0 && !p.panic) {
          p.pause -= dt;
          continue;
        }
        const sp = p.panic ? p.speed * 4 : p.speed;
        p.x += p.dir * sp * s;
        if (p.x < 15 || p.x > W - 15) {
          p.dir = -p.dir;
          p.x = G.clamp(p.x, 15, W - 15);
        }
        if (!p.panic && Math.random() < 0.004) p.pause = 800 + Math.random() * 2000;
        if (!p.panic && Math.random() < 0.003) p.dir = -p.dir;
      }
    },

    drawPeople(ctx, t) {
      const sorted = this.people.slice().sort((a, b) => a.lane - b.lane);
      for (const p of sorted) {
        const l = LANES[p.lane];
        G.drawKid(ctx, p.x, l.y, l.s, p.look, { adult: true, t, facing: p.dir, pose: p.dead ? "down" : p.pause > 0 && !p.panic ? "stand" : "walk", crying: p.panic > 0 && p.kind === "civ" });
        if (p.kind === "officer" && !p.dead) {
          ctx.fillStyle = "#c02020";
          ctx.beginPath();
          ctx.ellipse(p.x + p.dir * 2 * l.s, l.y - 84 * l.s, 15 * l.s, 6 * l.s, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.kind === "soldier" && !p.dead) G.drawHelmet(ctx, p.x, l.y, l.s, p.dir, true, "#6a5a3a");
      }
    },

    render(ctx, t) {
      // the naked eye: dim and small
      drawVillage(ctx);
      this.drawPeople(ctx, t);
      ctx.fillStyle = "rgba(10,14,20,0.55)";
      ctx.fillRect(0, 0, W, H);

      // through the scope: zoomed in on the crosshair
      const a = this.aim;
      const kick = this.recoil > 450 ? (this.recoil - 450) / 200 * 10 : 0;
      ctx.save();
      ctx.beginPath();
      ctx.arc(a.x, a.y, SCOPE_R, 0, Math.PI * 2);
      ctx.clip();
      ctx.translate(a.x, a.y - kick);
      ctx.scale(ZOOM, ZOOM);
      ctx.translate(-a.x, -a.y);
      drawVillage(ctx);
      this.drawPeople(ctx, t);
      for (const m of this.marks) {
        ctx.fillStyle = `rgba(80,60,40,${m.life / 1500})`;
        ctx.beginPath();
        ctx.arc(m.x, m.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      // reticle with wind marks
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(a.x - SCOPE_R, a.y);
      ctx.lineTo(a.x + SCOPE_R, a.y);
      ctx.moveTo(a.x, a.y - SCOPE_R);
      ctx.lineTo(a.x, a.y + SCOPE_R);
      ctx.stroke();
      for (let k = -3; k <= 3; k++) {
        if (!k) continue;
        ctx.beginPath();
        ctx.arc(a.x + k * DRIFT * ZOOM, a.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = "#111";
        ctx.fill();
      }
      ctx.strokeStyle = "#222";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(a.x, a.y, SCOPE_R, 0, Math.PI * 2);
      ctx.stroke();

      // HUD: wind, ammo, officers
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(10, 10, 170, 54);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 13px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "left";
      const arrow = this.wind === 0 ? "geen" : (this.wind < 0 ? "← ".repeat(-this.wind) : "→ ".repeat(this.wind)).trim();
      ctx.fillText(`Wind: ${arrow}`, 18, 30);
      ctx.fillText(`Kogels: ${this.ammo}  ·  Burgers: ${this.strikes}/${STRIKES}`, 18, 52);
      ctx.textAlign = "right";
      ctx.fillText(`Officieren: ${OFFICERS - this.officers}/${OFFICERS}`, W - 14, 26);
      ctx.fillText(`${Math.ceil(this.time / 1000)}s`, W - 14, 46);
      if (this.wind !== 0) {
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.font = "11px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`mik ${Math.abs(this.wind)} stip${Math.abs(this.wind) > 1 ? "pen" : ""} naar ${this.wind > 0 ? "links" : "rechts"}`, a.x, a.y + SCOPE_R + 16);
      }
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return `Officieren ${OFFICERS - this.officers}/${OFFICERS} · kogels ${this.ammo}`;
    },
  };
})();
