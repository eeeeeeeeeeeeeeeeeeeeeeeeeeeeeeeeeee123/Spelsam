(() => {
  const { W, H } = G;
  const FLOOR = 340;
  const WAGON_W = 520;
  const WAGONS = 3;
  const LEN = WAGON_W * WAGONS;
  const SPEED = 130;
  const TALK_R = 34;
  const STRIKES = 2;
  const SEARCH_MS = 100000;
  const TRAITS = {
    hoed: { label: "zwarte hoed" },
    snor: { label: "snor" },
    bril: { label: "bril" },
    litteken: { label: "litteken" },
    rodedas: { label: "rode das" },
    koffer: { label: "bruine koffer" },
  };
  const TRAIT_IDS = Object.keys(TRAITS);
  // roof duel
  const ROOF = 300;
  const DUEL_HP = 5;
  const FOE_HP = 8;
  const PEEK_AIM = 1000;
  const TUNNEL_EVERY = [5000, 7500];
  const TUNNEL_WARN = 1300;
  const TUNNEL_LEN = 300;
  const TRAIN_SPEED = 420;

  function drawTraits(ctx, x, y, s, facing, traits) {
    const hx = x + facing * 2 * s, hy = y + (-22 - 52) * s;
    if (traits.includes("hoed")) {
      ctx.fillStyle = "#111";
      ctx.fillRect(hx - 15 * s, hy - 16 * s, 30 * s, 4 * s);
      ctx.fillRect(hx - 9 * s, hy - 32 * s, 18 * s, 17 * s);
    }
    if (traits.includes("bril")) {
      ctx.strokeStyle = "#222";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(hx + facing * 5 * s, hy - 2 * s, 4 * s, 0, Math.PI * 2);
      ctx.arc(hx + facing * 13 * s, hy - 2 * s, 4 * s, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (traits.includes("snor")) {
      ctx.fillStyle = "#3a2010";
      ctx.beginPath();
      ctx.ellipse(hx + facing * 9 * s, hy + 7 * s, 6 * s, 2.2 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (traits.includes("litteken")) {
      ctx.strokeStyle = "#b02020";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hx - facing * 2 * s, hy - 6 * s);
      ctx.lineTo(hx + facing * 3 * s, hy + 8 * s);
      ctx.stroke();
    }
    if (traits.includes("rodedas")) G.drawTie(ctx, x, y, s);
    if (traits.includes("koffer")) {
      ctx.fillStyle = "#7a4a22";
      ctx.fillRect(x - facing * 26 * s - 10 * s, y - 22 * s, 20 * s, 16 * s);
      ctx.fillStyle = "#3a2a1a";
      ctx.fillRect(x - facing * 26 * s - 4 * s, y - 26 * s, 8 * s, 4 * s);
    }
  }

  function drawWagon(ctx, cam, t) {
    ctx.fillStyle = "#3a2a24";
    ctx.fillRect(0, 0, W, H);
    // windows with the landscape rushing by
    for (let x = -(cam % 110) + 20; x < W + 60; x += 110) {
      ctx.fillStyle = "#6a9ac0";
      ctx.fillRect(x, 120, 70, 70);
      ctx.fillStyle = "#4a7a4a";
      ctx.fillRect(x, 165 - ((t * 60 + x) % 20) * 0.2, 70, 25);
      ctx.strokeStyle = "#c8a050";
      ctx.lineWidth = 4;
      ctx.strokeRect(x, 120, 70, 70);
    }
    ctx.fillStyle = "#7a2a2a";
    ctx.fillRect(0, FLOOR, W, H - FLOOR);
    ctx.fillStyle = "#c8a050";
    ctx.fillRect(0, FLOOR, W, 4);
    // wagon doors
    for (let i = 1; i < WAGONS; i++) {
      const x = i * WAGON_W - cam;
      if (x < -40 || x > W + 40) continue;
      ctx.fillStyle = "#5a3a2a";
      ctx.fillRect(x - 18, 90, 36, FLOOR - 90);
      ctx.fillStyle = "#c8a050";
      ctx.fillRect(x + 8, 210, 5, 5);
    }
  }

  G.CAREER_LEVELS.huurmoordenaar[6] = {
    title: "Level 6 — De Oriënt-Express (26 jaar)",
    intro:
      "Je doelwit reist vermomd mee in de <strong>Oriënt-Express</strong>. Je dossier geeft <strong>3 kenmerken</strong>, maar je kent er pas één.<br>" +
      "Loop met <strong>← →</strong> door de wagons. Praat met de <strong>conducteur</strong> en zoek het <strong>briefje</strong> voor de andere kenmerken. Bij een passagier zie je zijn kenmerken. <strong>SPATIE</strong> = beschuldigen (2× fout = hij ontsnapt). Na <strong>100 seconden</strong> stopt de trein op het station.<br>" +
      "Daarna volgt een gevecht op het <strong>treindak</strong>: schiet met de <strong>muis</strong>, <strong>↓</strong> = bukken voor kogels en tunnels.",

    drawBackground(ctx, t) {
      drawWagon(ctx, 0, t);
    },

    start(api) {
      this.api = api;
      this.phase = "search";
      this.p = { x: 60, facing: 1, moving: false };
      this.cam = 0;
      this.strikes = 0;
      // dossier: three traits; the target has exactly these three, nobody else has all three
      this.dossier = G.shuffle(TRAIT_IDS).slice(0, 3);
      this.known = 1;
      this.passengers = [];
      const xs = [220, 380, 640, 820, 1000, 1200, 1400];
      const targetSpot = 1 + G.randInt(xs.length - 1);
      xs.forEach((x, i) => {
        let traits;
        if (i === targetSpot) traits = this.dossier.slice();
        else {
          do traits = G.shuffle(TRAIT_IDS).slice(0, 3);
          while (this.dossier.every((d) => traits.includes(d)));
          // most passengers share at least one clue, so you must look closely
          if (!traits.some((tr) => this.dossier.includes(tr))) traits[0] = G.pick(this.dossier);
        }
        this.passengers.push({ x, traits, target: i === targetSpot, look: G.randomLook(), sit: i % 2 === 0, accused: false });
      });
      this.conductor = { x: 560, talked: false };
      this.note = { x: 1300, found: false };
      this.popups = [];
      this.over = false;
      this.won = 0;
      this.flash = 0;
      this.searchT = SEARCH_MS;
    },

    popup(text, x, y, color) {
      this.popups.push({ text, x, y, color, life: 1200 });
    },

    nearPassenger() {
      return this.passengers.find((ps) => !ps.accused && Math.abs(ps.x - this.p.x) < TALK_R);
    },

    onAction() {
      if (this.over || this.won) return;
      if (this.phase === "search") {
        const ps = this.nearPassenger();
        if (!ps) return;
        ps.accused = true;
        if (ps.target) {
          this.popup("Hij is het! Hij vlucht het dak op!", W / 2, 80, "#6ee07a");
          this.phase = "toRoof";
          this.timer = 1800;
        } else {
          this.strikes++;
          this.popup("Verkeerde persoon! Hij is woedend.", ps.x - this.cam, FLOOR - 120, "#ff6b6b");
          if (this.strikes >= STRIKES) {
            this.over = true;
            this.api.fail("Je beschuldigde de verkeerde mensen. Het doelwit is gewaarschuwd en springt van de trein.");
          }
        }
        return;
      }
      if (this.phase === "duel") this.shoot();
    },

    onPointer(x, y) {
      this.aim = { x, y };
      if (this.phase === "duel") this.shoot();
    },
    onPointerMove(x, y) {
      this.aim = { x, y };
    },

    shoot() {
      if (this.fire > 0 || this.duck || this.won) return;
      this.fire = 260;
      const f = this.foe;
      if (f.hp > 0 && f.peek > 0.6 && Math.abs(this.aim.x - f.x) < 16 && this.aim.y > ROOF - 75 && this.aim.y < ROOF) {
        f.hp--;
        f.flash = 120;
        f.state = "hide";
        f.timer = 700;
        this.popup("RAAK", f.x, ROOF - 90, "#6ee07a");
        if (f.hp <= 0) {
          this.won = 2600;
          this.popup("Contract voltooid op de Oriënt-Express!", W / 2, 100, "#6ee07a");
        }
      }
    },

    hurt(text) {
      if (this.invuln > 0 || this.over) return;
      this.hp--;
      this.invuln = 900;
      this.flash = 300;
      this.popup(text, 110, ROOF - 100, "#ff6b6b");
      if (this.hp <= 0) {
        this.over = true;
        this.api.fail("Het doelwit won het gevecht op het treindak.");
      }
    },

    update(dt) {
      if (this.over) return;
      const s = dt / 1000;
      this.popups = G.updatePopups(this.popups, dt);
      this.flash = Math.max(0, this.flash - dt);
      if (this.won) {
        this.won -= dt;
        if (this.won <= 0) {
          this.over = true;
          this.api.complete();
        }
        return;
      }

      if (this.phase === "search") {
        this.searchT -= dt;
        if (this.searchT <= 0) {
          this.over = true;
          this.api.fail("De trein komt aan op het station. Het doelwit stapt uit en verdwijnt in de menigte.");
          return;
        }
        const p = this.p;
        const mx = (G.held.right ? 1 : 0) - (G.held.left ? 1 : 0);
        p.moving = !!mx;
        p.x = G.clamp(p.x + mx * SPEED * s, 30, LEN - 30);
        if (mx) p.facing = mx;
        this.cam = G.clamp(p.x - W / 2, 0, LEN - W);
        if (!this.conductor.talked && Math.abs(this.conductor.x - p.x) < TALK_R) {
          this.conductor.talked = true;
          this.known = Math.max(this.known, 2);
          this.popup(`Conducteur: "Ik zag iemand met een ${TRAITS[this.dossier[1]].label}..."`, W / 2, 70, "#ffe066");
        }
        if (!this.note.found && Math.abs(this.note.x - p.x) < TALK_R) {
          this.note.found = true;
          this.known = 3;
          this.popup(`Briefje: "...en een ${TRAITS[this.dossier[2]].label}."`, W / 2, 90, "#ffe066");
        }
        return;
      }
      if (this.phase === "toRoof") {
        this.timer -= dt;
        if (this.timer <= 0) {
          this.phase = "duel";
          const tgt = this.passengers.find((ps) => ps.target);
          this.foe = { x: 400, hp: FOE_HP, state: "hide", timer: 1200, peek: 0, flash: 0, look: tgt.look, traits: tgt.traits };
          this.hp = DUEL_HP;
          this.invuln = 0;
          this.fire = 0;
          this.duck = false;
          this.aim = { x: 400, y: ROOF - 40 };
          this.tunnel = null;
          this.tunnelTimer = 4000;
          this.scroll = 0;
        }
        return;
      }

      // roof duel
      this.scroll += TRAIN_SPEED * s;
      this.fire = Math.max(0, this.fire - dt);
      this.invuln = Math.max(0, this.invuln - dt);
      this.duck = !!G.held.down;
      const f = this.foe;
      f.flash = Math.max(0, f.flash - dt);
      f.timer -= dt;
      if (f.state === "hide") {
        f.peek = Math.max(0, f.peek - dt / 200);
        if (f.timer <= 0) {
          f.state = "aim";
          f.timer = PEEK_AIM;
          f.x = 300 + Math.random() * 180;
        }
      } else {
        f.peek = Math.min(1, f.peek + dt / 200);
        if (f.timer <= 0) {
          if (!this.duck) this.hurt("-1 ❤");
          else this.popup("Gedoken!", 110, ROOF - 100, "#9fd3ff");
          f.state = "hide";
          f.timer = 700 + Math.random() * 700;
        }
      }
      if (!this.tunnel) {
        this.tunnelTimer -= dt;
        if (this.tunnelTimer <= 0) {
          this.tunnelTimer = TUNNEL_EVERY[0] + Math.random() * (TUNNEL_EVERY[1] - TUNNEL_EVERY[0]);
          this.tunnel = { sx: W + TRAIN_SPEED * (TUNNEL_WARN / 1000), warn: TUNNEL_WARN };
        }
      } else {
        const tn = this.tunnel;
        tn.sx -= TRAIN_SPEED * s;
        tn.warn -= dt;
        if (tn.sx < 110 && tn.sx + TUNNEL_LEN > 110 && !this.duck) this.hurt("TUNNEL!");
        if (tn.sx + TUNNEL_LEN < -20) this.tunnel = null;
      }
    },

    render(ctx, t) {
      if (this.phase === "search" || this.phase === "toRoof") {
        drawWagon(ctx, this.cam, t);
        const p = this.p, cam = this.cam;
        // conductor and the note
        const cx = this.conductor.x - cam;
        G.drawKid(ctx, cx, FLOOR, 0.8, { ...G.SKINS.wit, hair: "kort", hairColor: "#888", eyes: G.EYES.blauw, gender: "jongen", shirt: "#2a3a6a", pants: "#2a3a6a" }, { adult: true, t, facing: -1 });
        ctx.fillStyle = "#2a3a6a";
        ctx.fillRect(cx - 9, FLOOR - 84, 20, 6);
        if (!this.note.found) {
          const nx = this.note.x - cam;
          ctx.fillStyle = "#f4ecd0";
          ctx.fillRect(nx - 8, FLOOR - 10, 16, 10);
          ctx.fillStyle = "#ffd24a";
          ctx.font = "bold 10px Segoe UI, Roboto, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("?", nx, FLOOR - 16);
        }
        for (const ps of this.passengers) {
          const sx = ps.x - cam;
          if (sx < -60 || sx > W + 60) continue;
          if (ps.sit) {
            ctx.fillStyle = "#6a3a2a";
            ctx.fillRect(sx - 4, FLOOR - 60, 30, 60);
          }
          const facing = ps.sit ? -1 : 1;
          G.drawKid(ctx, sx, FLOOR, 0.8, ps.look, { adult: true, t, facing, pose: ps.sit ? "sit" : "stand", angry: ps.accused && !ps.target });
          drawTraits(ctx, sx, FLOOR, 0.8, facing, ps.traits);
          if (Math.abs(ps.x - p.x) < TALK_R && !ps.accused && this.phase === "search") {
            const labels = ps.traits.map((tr) => TRAITS[tr].label).join(", ");
            G.drawBubble(ctx, sx, FLOOR - 110, `${labels} · SPATIE = beschuldigen`);
          }
        }
        G.drawKid(ctx, p.x - cam, FLOOR, 0.8, G.hitLook(), { adult: true, t, facing: p.facing, pose: p.moving ? "walk" : "stand" });
        G.drawTie(ctx, p.x - cam, FLOOR, 0.8);

        // the dossier
        ctx.fillStyle = "rgba(244,236,208,0.95)";
        ctx.fillRect(10, 10, 190, 76);
        ctx.fillStyle = "#3a2a1a";
        ctx.font = "bold 12px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("DOSSIER — het doelwit heeft:", 18, 28);
        ctx.font = "12px Segoe UI, Roboto, sans-serif";
        this.dossier.forEach((tr, i) => ctx.fillText(i < this.known ? `• ${TRAITS[tr].label}` : "• ???", 18, 46 + i * 15));
        ctx.textAlign = "right";
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px Segoe UI, Roboto, sans-serif";
        ctx.fillText(`Fout beschuldigd: ${this.strikes}/${STRIKES}`, W - 12, 22);
        ctx.fillText(`Wagon ${Math.min(WAGONS, Math.floor(p.x / WAGON_W) + 1)}/${WAGONS}`, W - 12, 40);
        if (this.phase === "toRoof") G.drawBanner(ctx, "Achter hem aan, het dak op!", "#6ee07a", H / 2);
      } else {
        // the roof
        ctx.fillStyle = "#8ab0d8";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#6a8a5a";
        for (let i = 0; i < 6; i++) {
          const x = ((i * 130 - this.scroll * 0.3) % (W + 130) + W + 130) % (W + 130) - 65;
          ctx.beginPath();
          ctx.moveTo(x - 80, ROOF + 40);
          ctx.lineTo(x, 180);
          ctx.lineTo(x + 80, ROOF + 40);
          ctx.fill();
        }
        ctx.fillStyle = "#3a2a24";
        ctx.fillRect(0, ROOF, W, H - ROOF);
        ctx.fillStyle = "#5a4a3a";
        ctx.fillRect(0, ROOF, W, 6);
        const f = this.foe;
        if (f.peek > 0) {
          const y = ROOF + (1 - f.peek) * 60;
          G.drawKid(ctx, f.x, y, 0.8, f.look, { adult: true, t, facing: -1, flash: f.flash > 0, angry: f.hp > 0, pose: f.hp > 0 ? "stand" : "down", dizzy: f.hp <= 0 });
          drawTraits(ctx, f.x, y, 0.8, -1, f.traits.filter((tr) => tr !== "koffer"));
          if (f.state === "aim" && f.hp > 0) {
            const k = 1 - f.timer / PEEK_AIM;
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.fillRect(f.x - 16, ROOF - 96, 32, 4);
            ctx.fillStyle = "#ff4040";
            ctx.fillRect(f.x - 16, ROOF - 96, 32 * G.clamp(k, 0, 1), 4);
          }
        }
        // you
        ctx.globalAlpha = this.invuln > 0 && Math.floor(t * 12) % 2 ? 0.5 : 1;
        if (this.duck) G.drawKid(ctx, 110, ROOF, 0.8, G.hitLook(), { adult: true, t: 0, pose: "crawl" });
        else {
          const hand = G.drawKid(ctx, 110, ROOF, 0.8, G.hitLook(), { adult: true, t, armAngle: -0.1 });
          G.drawTie(ctx, 110, ROOF, 0.8);
          G.drawPistol(ctx, hand.x, hand.y, Math.atan2(this.aim.y - hand.y, this.aim.x - hand.x), 0.7);
        }
        ctx.globalAlpha = 1;
        const tn = this.tunnel;
        if (tn) {
          if (tn.warn > 0) G.drawBanner(ctx, "TUNNEL! ↓ bukken", "#ffd24a", 90);
          ctx.fillStyle = "#3a2a1a";
          ctx.fillRect(tn.sx, 0, TUNNEL_LEN, ROOF - 60);
          ctx.fillStyle = "rgba(0,0,0,0.45)";
          ctx.fillRect(tn.sx, ROOF - 60, TUNNEL_LEN, H);
        }
        if (!this.duck) {
          ctx.strokeStyle = "rgba(255,255,255,0.85)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(this.aim.x, this.aim.y, 9, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = "#c02020";
        ctx.font = "18px Segoe UI, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("❤".repeat(Math.max(0, this.hp)), 12, 26);
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(W / 2 - 90, 12, 180, 8);
        ctx.fillStyle = "#e05050";
        ctx.fillRect(W / 2 - 90, 12, 180 * Math.max(0, f.hp / FOE_HP), 8);
        if (this.won) G.drawBanner(ctx, "Contract voltooid!", "#6ee07a", 140);
      }
      if (this.flash > 0) {
        ctx.fillStyle = `rgba(200,40,40,${0.3 * (this.flash / 300)})`;
        ctx.fillRect(0, 0, W, H);
      }
      G.drawPopups(ctx, this.popups);
    },

    hud() {
      return this.phase === "duel" ? `Gevecht op het treindak · doelwit ${Math.max(0, this.foe.hp)}/${FOE_HP}` : `Zoek het doelwit · station over ${Math.max(0, Math.ceil(this.searchT / 1000))}s`;
    },
  };
})();
