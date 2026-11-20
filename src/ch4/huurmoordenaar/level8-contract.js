(() => {
  const { W, H } = G;
  const ZOOM = 2.3;
  const SCOPE_R = 80;
  const HITS = 3;
  const HEAT = 2;
  const STRIKES = 2;
  const MOVE_MS = 700;
  const LIGHT_DELAY = 1700;
  const RECOIL_MS = 700;
  const SPEECH_MS = 80000;
  const LECTERN = { x: 270, y: 300 };
  const STAGE_Y = 340;
  const WINDOW_SHIFT = [-70, 0, 70];
  const AGENT_LOOK = { ...G.SKINS.wit, hair: "kort", hairColor: "#1a1212", eyes: G.EYES.bruin, gender: "jongen", shirt: "#111", pants: "#111" };
  const OUTCOMES = [
    { text: "KARTON! Het was een kartonnen bordje...", kind: "karton" },
    { text: "ROBOT! Een robot-dubbelganger, vol vonken!", kind: "robot" },
    { text: "Je schoot zijn GOUDEN KUIF eraf!", kind: "kuif" },
  ];

  function drawScene(ctx, t, shift, s) {
    ctx.save();
    ctx.translate(shift, 0);
    ctx.fillStyle = "#8ab8e0";
    ctx.fillRect(-100, 0, W + 200, H);
    ctx.fillStyle = "#6a9a4a";
    ctx.fillRect(-100, 200, W + 200, H);
    // crowd
    for (let i = 0; i < 22; i++) {
      ctx.fillStyle = ["#c04040", "#4060c0", "#40a060", "#c0a040"][i % 4];
      const x = -60 + i * 30;
      ctx.beginPath();
      ctx.arc(x, 395, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x - 8, 403, 16, 20);
    }
    // stage
    ctx.fillStyle = "#3a3a5a";
    ctx.fillRect(100, STAGE_Y, 340, 30);
    ctx.fillStyle = "#c02020";
    ctx.fillRect(100, STAGE_Y - 120, 340, 8);
    for (const fx of [120, 410]) {
      for (let k = 0; k < 6; k++) {
        ctx.fillStyle = k % 2 ? "#fff" : "#c02020";
        ctx.fillRect(fx, 230 + k * 4, 24, 4);
      }
      ctx.fillStyle = "#1c2a7a";
      ctx.fillRect(fx, 230, 10, 12);
    }
    // the speaker
    if (s.pres.visible) {
      const y = STAGE_Y + (s.pres.duck ? 40 : 0);
      if (s.pres.fallen) {
        ctx.save();
        ctx.translate(LECTERN.x, STAGE_Y);
        ctx.rotate(-1.2);
        G.drawKid(ctx, 0, 0, 0.6, G.presLook(), { adult: true, t });
        ctx.restore();
      } else {
        G.drawKid(ctx, LECTERN.x, y, 0.6, G.presLook(), { adult: true, t, armAngle: -1.2 });
        if (!s.pres.bald) G.drawQuiff(ctx, LECTERN.x, y, 0.6);
        G.drawTie(ctx, LECTERN.x, y, 0.6);
        if (s.pres.kind === "robot" && s.sparks > 0) {
          ctx.fillStyle = "#ffe066";
          for (let k = 0; k < 6; k++) ctx.fillRect(LECTERN.x - 8 + Math.random() * 16, y - 50 + Math.random() * 20, 2, 2);
        }
      }
    }
    // lectern in front of him
    ctx.fillStyle = "#6a4a2a";
    ctx.beginPath();
    ctx.moveTo(LECTERN.x - 24, STAGE_Y - 28);
    ctx.lineTo(LECTERN.x + 24, STAGE_Y - 28);
    ctx.lineTo(LECTERN.x + 18, STAGE_Y);
    ctx.lineTo(LECTERN.x - 18, STAGE_Y);
    ctx.fill();
    ctx.fillStyle = "#f0c030";
    ctx.beginPath();
    ctx.arc(LECTERN.x, STAGE_Y - 16, 6, 0, Math.PI * 2);
    ctx.fill();
    // agents walking in front of the stage
    for (const a of s.agents) G.drawKid(ctx, a.x, STAGE_Y + 6, 0.62, AGENT_LOOK, { adult: true, t, facing: a.dir, pose: "walk" });
    for (const a of s.agents) G.drawShades(ctx, a.x, STAGE_Y + 6, 0.62, a.dir);
    // the wig flying off
    if (s.wig) {
      ctx.fillStyle = "#f0c030";
      ctx.beginPath();
      ctx.ellipse(s.wig.x, s.wig.y, 9, 4, s.wig.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  G.CAREER_LEVELS.huurmoordenaar[8] = {
    title: "Level 8 — Contract: President Goudkuif (28 jaar)",
    intro:
      "Je nieuwe contract: <strong>President Goudkuif</strong> tijdens zijn speech. Jij ligt met je sluipschuttersgeweer in een raam aan de overkant.<br>" +
      "Mik met de <strong>muis</strong>, schiet met <strong>klik</strong> / <strong>SPATIE</strong> als hij boven het spreekgestoelte uitkomt. Raak geen <strong>agenten</strong>!<br>" +
      "Na elk schot zoekt een <strong>zoeklicht</strong> je raam: wissel snel van raam met <strong>← →</strong>. De speech duurt <strong>80 seconden</strong>. Er zit een verrassing in dit contract...",

    drawBackground(ctx, t) {
      drawScene(ctx, t, 0, { pres: { visible: true }, agents: [] });
    },

    start(api) {
      this.api = api;
      this.aim = { x: LECTERN.x, y: 260 };
      this.win = 1;
      this.shift = 0;
      this.moving = 0;
      this.recoil = 0;
      this.hits = 0;
      this.heat = HEAT;
      this.strikes = 0;
      this.light = null;
      this.pres = { visible: true, duck: false, timer: 2500, kind: OUTCOMES[0].kind, fallen: false, bald: false };
      this.agents = [];
      this.agentTimer = 3000;
      this.sparks = 0;
      this.wig = null;
      this.respawn = 0;
      this.popups = [];
      this.marks = [];
      this.over = false;
      this.won = 0;
      this.speech = SPEECH_MS;
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 1500 });
    },

    onDirection(dx, dy, repeat) {
      if (repeat || this.over || this.won || !dx || this.moving > 0) return;
      const nw = G.clamp(this.win + dx, 0, 2);
      if (nw === this.win) return;
      this.win = nw;
      this.moving = MOVE_MS;
    },

    onPointer(x, y) {
      this.aim = { x, y };
      this.shoot();
    },
    onPointerMove(x, y) {
      this.aim = { x, y };
    },
    onAction() {
      this.shoot();
    },

    shoot() {
      if (this.over || this.won || this.recoil > 0 || this.moving > 0) return;
      this.recoil = RECOIL_MS;
      const wx = this.aim.x - this.shift, wy = this.aim.y;
      this.marks.push({ x: wx, y: wy, life: 1200 });
      // a searchlight starts hunting for the shooter's window
      if (!this.light) this.light = { target: this.win, timer: LIGHT_DELAY, sweep: 0 };
      // did we hit an agent?
      for (const a of this.agents) {
        if (Math.abs(wx - a.x) < 10 && wy > STAGE_Y - 55 && wy < STAGE_Y) {
          this.strikes++;
          this.popup("Je raakte een AGENT!", W / 2, 80, "#ff4040");
          if (this.strikes >= STRIKES) {
            this.over = true;
            this.api.fail("Je raakte agenten. Het Bureau trekt het contract in.");
          }
          return;
        }
      }
      const pr = this.pres;
      const headY = STAGE_Y + (-22 - 52) * 0.6;
      if (pr.visible && !pr.duck && !pr.fallen && Math.abs(wx - (LECTERN.x + 1)) < 12 && wy > headY - 16 && wy < headY + 14) {
        const out = OUTCOMES[this.hits];
        this.hits++;
        this.popup(out.text, W / 2, 70, out.kind === "kuif" ? "#ffd24a" : "#6ee07a");
        if (out.kind === "kuif") {
          pr.bald = true;
          this.wig = { x: LECTERN.x, y: headY - 12, vx: 90, vy: -160, r: 0 };
          this.won = 3600;
          this.light = null;
        } else {
          if (out.kind === "robot") this.sparks = 1500;
          pr.fallen = true;
          this.respawn = 2600;
        }
      } else this.popup("Mis!", this.aim.x, this.aim.y - 20, "#ffd24a");
    },

    update(dt) {
      if (this.over) return;
      const s = dt / 1000;
      this.recoil = Math.max(0, this.recoil - dt);
      this.sparks = Math.max(0, this.sparks - dt);
      this.popups = G.updatePopups(this.popups, dt);
      for (const m of this.marks) m.life -= dt;
      this.marks = this.marks.filter((m) => m.life > 0);
      if (this.wig) {
        this.wig.vy += 400 * s;
        this.wig.x += this.wig.vx * s;
        this.wig.y += this.wig.vy * s;
        this.wig.r += 8 * s;
      }
      if (this.won) {
        this.won -= dt;
        if (this.won <= 0) {
          this.over = true;
          this.api.complete();
        }
        return;
      }

      this.speech -= dt;
      if (this.speech <= 0) {
        this.over = true;
        this.api.fail("De speech is voorbij. Goudkuif is weggereden in zijn limousine.");
        return;
      }

      // moving between windows shifts your view
      if (this.moving > 0) this.moving -= dt;
      this.shift += (WINDOW_SHIFT[this.win] - this.shift) * Math.min(1, s * 8);

      // the searchlight
      if (this.light) {
        const l = this.light;
        l.timer -= dt;
        if (l.timer <= 0) {
          if (this.win === l.target && this.moving <= 0) {
            this.heat--;
            this.popup("Het zoeklicht vond je raam!", W / 2, 110, "#ff6b6b");
            if (this.heat <= 0) {
              this.over = true;
              this.api.fail("De geheime dienst heeft je raam gevonden. Je moet vluchten.");
              return;
            }
          } else this.popup("Net op tijd verkast!", W / 2, 110, "#9fd3ff");
          this.light = null;
        }
      }

      // the speaker pops up and ducks behind the lectern
      const pr = this.pres;
      if (this.respawn > 0) {
        this.respawn -= dt;
        if (this.respawn <= 0) {
          this.pres = { visible: true, duck: true, timer: 1200, kind: OUTCOMES[this.hits].kind, fallen: false, bald: false };
          this.popup(this.hits === 1 ? "Daar staat hij weer...?" : "Nóg een Goudkuif?!", W / 2, 90, "#ffe066");
        }
      } else if (!pr.fallen) {
        pr.timer -= dt;
        if (pr.timer <= 0) {
          pr.duck = !pr.duck;
          pr.timer = pr.duck ? 900 + Math.random() * 1000 : 1400 + Math.random() * 1600;
        }
      }

      // agents cross the stage now and then
      this.agentTimer -= dt;
      if (this.agentTimer <= 0) {
        this.agentTimer = 2500 + Math.random() * 2500;
        const dir = Math.random() < 0.5 ? 1 : -1;
        this.agents.push({ x: dir > 0 ? 90 : 450, dir });
      }
      for (const a of this.agents) a.x += a.dir * 55 * s;
      this.agents = this.agents.filter((a) => a.x > 80 && a.x < 460);
    },

    render(ctx, t) {
      const state = { pres: this.pres, agents: this.agents, sparks: this.sparks, wig: this.wig };
      // naked eye: dim
      drawScene(ctx, t, this.shift, state);
      ctx.fillStyle = "rgba(10,14,20,0.55)";
      ctx.fillRect(0, 0, W, H);
      // scope
      const a = this.aim;
      const kick = this.recoil > RECOIL_MS - 200 ? ((this.recoil - (RECOIL_MS - 200)) / 200) * 12 : 0;
      ctx.save();
      ctx.beginPath();
      ctx.arc(a.x, a.y, SCOPE_R, 0, Math.PI * 2);
      ctx.clip();
      ctx.translate(a.x, a.y - kick);
      ctx.scale(ZOOM, ZOOM);
      ctx.translate(-a.x, -a.y);
      drawScene(ctx, t, this.shift, state);
      for (const m of this.marks) {
        ctx.fillStyle = `rgba(60,40,30,${m.life / 1200})`;
        ctx.beginPath();
        ctx.arc(m.x + this.shift, m.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(a.x - SCOPE_R, a.y);
      ctx.lineTo(a.x + SCOPE_R, a.y);
      ctx.moveTo(a.x, a.y - SCOPE_R);
      ctx.lineTo(a.x, a.y + SCOPE_R);
      ctx.stroke();
      ctx.strokeStyle = "#222";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(a.x, a.y, SCOPE_R, 0, Math.PI * 2);
      ctx.stroke();

      // your three windows
      for (let i = 0; i < 3; i++) {
        const x = W / 2 - 90 + i * 90;
        ctx.fillStyle = i === this.win ? "#6ee07a" : "rgba(255,255,255,0.3)";
        ctx.fillRect(x - 16, H - 28, 32, 20);
        if (this.light && this.light.target === i) {
          ctx.fillStyle = `rgba(255,250,200,${0.4 + 0.4 * Math.sin(t * 15)})`;
          ctx.fillRect(x - 16, H - 28, 32, 20);
        }
      }
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(this.moving > 0 ? "verhuizen..." : "← → ander raam", W / 2, H - 34);
      if (this.light) G.drawBanner(ctx, "ZOEKLICHT! Wissel van raam!", "#ffe066", 150);

      ctx.textAlign = "left";
      ctx.font = "bold 13px Segoe UI, Roboto, sans-serif";
      ctx.fillText(`Raak ${this.hits}/${HITS} · gezien ${HEAT - this.heat}/${HEAT} · agenten ${this.strikes}/${STRIKES}`, 12, 22);
      if (this.won) {
        G.drawBanner(ctx, "De opdrachtgever wilde... alleen zijn kuif!", "#ffd24a", 200);
        if (this.won < 2400) G.drawBanner(ctx, "Contract voltooid. 💇", "#6ee07a", 250);
      }
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return `Contract Goudkuif · raak ${this.hits}/${HITS} · speech nog ${Math.max(0, Math.ceil(this.speech / 1000))}s`;
    },
  };
})();
