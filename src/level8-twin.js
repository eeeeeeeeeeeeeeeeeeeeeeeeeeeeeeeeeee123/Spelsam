(() => {
  const { W, H } = G;
  const REVEAL_MS = 1800;
  const BITES = 5;
  const ZONE_W = 0.2;
  const MARKER_MS = 900;
  const SEQUENCES = [4, 5, 6];
  const TWIN_MS = 24000;
  const TWIN_BITE_SHARE = 0.4;
  const SCALE = 1.3;
  const PLAYER = { x: 150, y: 290, facing: 1 };
  const TWIN = { x: 390, y: 290, facing: -1 };
  const PLACENTA = { x: W / 2, y: 58 };
  const ARROWS = { "0,-1": "↑", "0,1": "↓", "-1,0": "←", "1,0": "→" };
  const DIRS = [[0, -1], [0, 1], [-1, 0], [1, 0]];
  const SWORD_ANGLE = -0.6;

  function drawPlacenta(ctx, t) {
    ctx.fillStyle = "#7a1f3d";
    ctx.beginPath();
    ctx.ellipse(PLACENTA.x, PLACENTA.y - 10, 90 + Math.sin(t) * 3, 38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 140, 170, 0.35)";
    ctx.lineWidth = 2;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(PLACENTA.x, PLACENTA.y + 10);
      ctx.quadraticCurveTo(PLACENTA.x + i * 18, PLACENTA.y - 10, PLACENTA.x + i * 28, PLACENTA.y - 30);
      ctx.stroke();
    }
  }

  function swordAngle(facing) {
    return facing === 1 ? SWORD_ANGLE : Math.PI - SWORD_ANGLE;
  }

  // Draws a fetus either still attached (bites < BITES) or holding its sword.
  function drawBaby(ctx, t, pos, look, attached, bites, sharp, opts) {
    G.drawFetus(ctx, pos.x, pos.y, SCALE, pos.facing, look, t, opts);
    if (attached) {
      const belly = G.bellyButton(pos.x, pos.y, SCALE, pos.facing);
      const anchor = { x: PLACENTA.x - pos.facing * 30, y: PLACENTA.y + 18 };
      G.drawCord(ctx, belly, anchor, t, bites);
    } else {
      const angle = swordAngle(pos.facing);
      const hand = G.drawArm(ctx, pos.x, pos.y, SCALE, pos.facing, angle, look);
      G.drawCordSword(ctx, hand, angle, 70, sharp, false);
    }
  }

  G.level8 = {
    title: "Level 8 — De buik",
    intro:
      "Een paar maanden later... Je groeit in de buik. Maar wacht: <strong>je bent niet alleen!</strong><br>" +
      "Bijt je <strong>navelstreng</strong> door: druk op <strong>SPATIE</strong> als het streepje in het groene vak staat (5 keer).<br>" +
      "Kerf er dan een <strong>zwaard</strong> van door de <strong>pijltjes</strong> na te typen. Je tweeling doet hetzelfde: wees sneller!",

    drawBackground(ctx, t) {
      G.drawWomb(ctx, t);
      drawPlacenta(ctx, t);
      drawBaby(ctx, t, PLAYER, G.PLAYER_LOOK, true, 0, 0, {});
    },

    start(api) {
      this.api = api;
      this.reveal = REVEAL_MS;
      this.phase = "bite";
      this.bites = 0;
      this.marker = 0;
      this.markerDir = 1;
      this.zone = this.newZone();
      this.missFlash = 0;
      this.sequences = SEQUENCES.map((n) => Array.from({ length: n }, () => G.pick(DIRS)));
      this.seqIndex = 0;
      this.keyIndex = 0;
      this.wrongFlash = 0;
      this.twin = 0;
    },

    newZone() {
      return 0.1 + Math.random() * (0.8 - ZONE_W);
    },

    playerSharp() {
      const total = SEQUENCES.reduce((a, b) => a + b, 0);
      const done = SEQUENCES.slice(0, this.seqIndex).reduce((a, b) => a + b, 0) + this.keyIndex;
      return done / total;
    },

    onAction() {
      if (this.reveal > 0 || this.phase !== "bite") return;
      if (this.marker >= this.zone && this.marker <= this.zone + ZONE_W) {
        this.bites++;
        this.zone = this.newZone();
        if (this.bites >= BITES) this.phase = "carve";
      } else {
        this.missFlash = 300;
      }
    },

    onDirection(dx, dy, repeat) {
      if (this.reveal > 0 || this.phase !== "carve" || repeat) return;
      const seq = this.sequences[this.seqIndex];
      const [ex, ey] = seq[this.keyIndex];
      if (dx === ex && dy === ey) {
        this.keyIndex++;
        if (this.keyIndex >= seq.length) {
          this.seqIndex++;
          this.keyIndex = 0;
          if (this.seqIndex >= this.sequences.length) this.api.complete();
        }
      } else {
        this.keyIndex = 0;
        this.wrongFlash = 300;
      }
    },

    update(dt) {
      if (this.reveal > 0) {
        this.reveal -= dt;
        return;
      }
      this.missFlash = Math.max(0, this.missFlash - dt);
      this.wrongFlash = Math.max(0, this.wrongFlash - dt);
      this.marker += (this.markerDir * dt) / MARKER_MS;
      if (this.marker >= 1) {
        this.marker = 1;
        this.markerDir = -1;
      } else if (this.marker <= 0) {
        this.marker = 0;
        this.markerDir = 1;
      }
      this.twin += dt / TWIN_MS;
      if (this.twin >= 1) this.api.fail("Je tweeling had het zwaard eerder af!");
    },

    render(ctx, t) {
      const revealK = 1 - Math.max(0, this.reveal) / REVEAL_MS;
      G.drawWomb(ctx, t);
      drawPlacenta(ctx, t);
      const twinAttached = this.twin < TWIN_BITE_SHARE;
      const twinBites = Math.floor((this.twin / TWIN_BITE_SHARE) * BITES);
      const twinSharp = Math.max(0, (this.twin - TWIN_BITE_SHARE) / (1 - TWIN_BITE_SHARE));
      ctx.save();
      ctx.globalAlpha = revealK;
      drawBaby(ctx, t, TWIN, G.TWIN_LOOK, twinAttached, twinBites, twinSharp, {});
      ctx.restore();

      const attached = this.phase === "bite";
      drawBaby(ctx, t, PLAYER, G.PLAYER_LOOK, attached, this.bites, this.playerSharp(), {});

      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.font = "bold 13px Segoe UI, Roboto, sans-serif";
      ctx.fillText("Jij", PLAYER.x, PLAYER.y + 80);
      if (revealK > 0.3) ctx.fillText("Tweeling", TWIN.x, TWIN.y + 80);

      if (this.reveal > 0) {
        ctx.fillStyle = "#ffe066";
        ctx.font = "bold 30px Segoe UI, Roboto, sans-serif";
        ctx.fillText("Je hebt een TWEELING!", W / 2, H / 2 - 20);
        return;
      }

      // twin progress
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(W - 170, 110, 150, 6);
      ctx.fillStyle = "#ff8fb1";
      ctx.fillRect(W - 170, 110, 150 * Math.min(1, this.twin), 6);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "12px Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("Tweeling", W - 20, 104);

      const barX = W / 2 - 150;
      const barY = H - 42;
      ctx.textAlign = "center";
      if (this.phase === "bite") {
        ctx.fillStyle = this.missFlash > 0 ? "rgba(255,80,80,0.5)" : "rgba(0,0,0,0.35)";
        ctx.fillRect(barX, barY, 300, 16);
        ctx.fillStyle = "#6ee07a";
        ctx.fillRect(barX + this.zone * 300, barY, ZONE_W * 300, 16);
        ctx.fillStyle = "#fff";
        ctx.fillRect(barX + this.marker * 300 - 2, barY - 4, 4, 24);
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.font = "bold 14px Segoe UI, Roboto, sans-serif";
        ctx.fillText(`Bijt! SPATIE in het groen (${this.bites} / ${BITES})`, W / 2, barY - 12);
      } else {
        const seq = this.sequences[this.seqIndex];
        ctx.font = "bold 14px Segoe UI, Roboto, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.fillText(`Kerf je zwaard (${this.seqIndex + 1} / ${this.sequences.length})`, W / 2, barY - 16);
        ctx.font = "bold 30px Segoe UI, Roboto, sans-serif";
        const spacing = 38;
        const startX = W / 2 - ((seq.length - 1) * spacing) / 2;
        seq.forEach(([dx, dy], i) => {
          if (this.wrongFlash > 0) ctx.fillStyle = "#ff6b6b";
          else ctx.fillStyle = i < this.keyIndex ? "#6ee07a" : "rgba(255,255,255,0.9)";
          ctx.fillText(ARROWS[`${dx},${dy}`], startX + i * spacing, barY + 20);
        });
      }
    },

    hud() {
      if (this.reveal > 0) return "...";
      return this.phase === "bite" ? `Navelstreng: ${this.bites} / ${BITES} beten` : `Zwaard: ${Math.round(this.playerSharp() * 100)}%`;
    },
  };
})();
