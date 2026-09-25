(() => {
  const STORAGE_KEY = "spelsam-appearance";

  G.SKINS = {
    wit: { skin: "#f7c9b2", shade: "#e3a58c" },
    zwart: { skin: "#7a4a32", shade: "#5c3522" },
  };
  G.EYES = { blauw: "#3d8be0", bruin: "#6b3f1f", groen: "#3fa45b" };
  G.HAIR_COLOR = "#3b2418";

  G.APPEARANCE_OPTIONS = {
    gender: [["jongen", "Jongen"], ["meisje", "Meisje"]],
    skin: [["wit", "Wit"], ["zwart", "Zwart"]],
    hair: [["kort", "Kort"], ["lang", "Lang"], ["krullen", "Krullen"], ["stekels", "Stekels"]],
    eyes: [["blauw", "Blauw"], ["bruin", "Bruin"], ["groen", "Groen"]],
  };

  const DEFAULT = { gender: "jongen", skin: "wit", hair: "kort", eyes: "bruin" };

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved) return { ...DEFAULT, ...saved };
    } catch (e) {
      // storage can be unavailable (private mode); fall back to defaults
    }
    return null;
  }

  G.appearance = load() || { ...DEFAULT };
  G.hasSavedAppearance = () => load() !== null;

  // Look used by drawKid for the player.
  G.playerKidLook = () => {
    const a = G.appearance;
    return {
      ...G.SKINS[a.skin],
      hair: a.hair,
      hairColor: G.HAIR_COLOR,
      eyes: G.EYES[a.eyes],
      gender: a.gender,
      shirt: a.gender === "meisje" ? "#e0679c" : "#4f8fdc",
    };
  };

  function applyToFetus() {
    const s = G.SKINS[G.appearance.skin];
    G.PLAYER_LOOK = { skin: s.skin, shade: s.shade, hair: G.HAIR_COLOR };
    G.TWIN_LOOK = { skin: s.skin, shade: s.shade, hair: "#1d1418" };
  }

  G.setAppearance = (a) => {
    G.appearance = { ...a };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(G.appearance));
    } catch (e) {
      // not persisted, but still applied for this session
    }
    applyToFetus();
  };

  applyToFetus();

  function drawHair(ctx, style, color, back) {
    ctx.fillStyle = color;
    if (back) {
      if (style === "lang") {
        ctx.beginPath();
        ctx.roundRect(-14, -60, 22, 30, 6);
        ctx.fill();
      }
      return;
    }
    if (style === "kort" || style === "lang") {
      ctx.beginPath();
      ctx.arc(2, -52, 16, Math.PI * 1.02, Math.PI * 1.95);
      ctx.lineTo(10, -60);
      ctx.quadraticCurveTo(2, -58, -14, -50);
      ctx.fill();
    } else if (style === "krullen") {
      for (const [cx, cy] of [[-10, -60], [-3, -66], [6, -66], [13, -61], [-13, -52], [-7, -55]]) {
        ctx.beginPath();
        ctx.arc(cx, cy, 6.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (style === "stekels") {
      ctx.beginPath();
      ctx.moveTo(-14, -54);
      for (let i = 0; i < 5; i++) {
        const x = -12 + i * 6;
        ctx.lineTo(x, -74 + (i % 2) * 4);
        ctx.lineTo(x + 4, -62);
      }
      ctx.lineTo(16, -56);
      ctx.quadraticCurveTo(2, -66, -14, -54);
      ctx.fill();
    }
  }

  function drawFace(ctx, look, o) {
    ctx.fillStyle = look.shade;
    ctx.beginPath();
    ctx.arc(-3, -51, 3.5, 0, Math.PI * 2);
    ctx.fill();

    if (o.dizzy) {
      ctx.strokeStyle = "#2a1a22";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(6, -57);
      ctx.lineTo(12, -51);
      ctx.moveTo(12, -57);
      ctx.lineTo(6, -51);
      ctx.stroke();
    } else if (o.eyesClosed) {
      ctx.strokeStyle = "#2a1a22";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(9, -54, 3, 0.2, Math.PI - 0.2);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(9, -54, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = look.eyes || "#6b3f1f";
      ctx.beginPath();
      ctx.arc(10, -54, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#111";
      ctx.beginPath();
      ctx.arc(10.5, -54, 1.2, 0, Math.PI * 2);
      ctx.fill();
      if (look.gender === "meisje") {
        ctx.strokeStyle = "#2a1a22";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(8, -58);
        ctx.lineTo(7, -61);
        ctx.moveTo(11, -58);
        ctx.lineTo(11, -61);
        ctx.stroke();
      }
    }
    if (o.angry) {
      ctx.strokeStyle = "#2a1a22";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(4, -62);
      ctx.lineTo(14, -59);
      ctx.stroke();
    }
    ctx.strokeStyle = "#2a1a22";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    if (o.sad || o.crying) ctx.arc(12, -42, 3.5, Math.PI + 0.3, -0.3);
    else ctx.arc(12, -46, 3.5, 0.3, Math.PI - 0.3);
    ctx.stroke();
    if (o.crying) {
      ctx.fillStyle = "#7fd1ff";
      const drop = (o.t * 40) % 14;
      ctx.beginPath();
      ctx.arc(9, -49 + drop, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Head centred at (2, -52) in local coords.
  function drawHead(ctx, look, o) {
    drawHair(ctx, look.hair, look.hairColor, true);
    ctx.fillStyle = look.skin;
    ctx.beginPath();
    ctx.arc(2, -52, 16, 0, Math.PI * 2);
    ctx.fill();
    drawHair(ctx, look.hair, look.hairColor, false);
    drawFace(ctx, look, o);
  }

  // Cartoon person in local coords (feet at 0, facing right); facing -1 mirrors.
  // Returns the hand position in world coords.
  G.drawKid = (ctx, x, y, s, look, o = {}) => {
    const facing = o.facing || 1;
    const t = o.t || 0;
    const pose = o.pose || "stand";
    const legLen = o.adult ? 30 : o.baby ? 10 : 18;
    const torsoLen = o.adult ? 30 : o.baby ? 16 : 22;
    const hip = -legLen;
    const shoulderY = hip - torsoLen + 8;
    const headLift = hip - torsoLen + 38;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing * s, s);
    if (o.flash) ctx.globalAlpha = 0.45 + 0.45 * Math.abs(Math.sin(t * 40));

    if (pose === "crawl" || pose === "down") {
      const down = pose === "down";
      const k = down ? 0 : Math.sin(t * 8);
      ctx.fillStyle = look.shade;
      ctx.beginPath();
      ctx.ellipse(-10 - k * 3, -5, 6, 5, 0, 0, Math.PI * 2);
      ctx.ellipse(12 + k * 3, -4, 5, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = look.shirt;
      ctx.beginPath();
      ctx.ellipse(0, -13, 17, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f4f4f4";
      ctx.beginPath();
      ctx.arc(-13, -12, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // head drawn upright so the face reads clearly
      const headX = x + facing * 20 * s;
      const headY = y - 20 * s;
      ctx.save();
      ctx.translate(headX, headY);
      ctx.scale(facing * s * 0.85, s * 0.85);
      ctx.translate(-2, 52);
      if (o.flash) ctx.globalAlpha = 0.45 + 0.45 * Math.abs(Math.sin(t * 40));
      drawHead(ctx, look, { ...o, t });
      ctx.restore();
      if (o.dizzy) G.drawStars(ctx, headX, headY - 22 * s, s, t);
      return { x: x + facing * 22 * s, y: y - 6 * s };
    }

    // legs
    const swing = pose === "walk" ? Math.sin(t * 10) * 6 : 0;
    ctx.strokeStyle = look.pants || "#34497a";
    ctx.lineWidth = o.baby ? 7 : 8;
    ctx.lineCap = "round";
    ctx.beginPath();
    if (pose === "sit") {
      ctx.moveTo(-3, hip);
      ctx.lineTo(10, hip);
      ctx.lineTo(10, hip + legLen * 0.8);
      ctx.moveTo(3, hip);
      ctx.lineTo(14, hip);
      ctx.lineTo(14, hip + legLen * 0.8);
    } else {
      ctx.moveTo(-3, hip);
      ctx.lineTo(-3 + swing, -2);
      ctx.moveTo(4, hip);
      ctx.lineTo(4 - swing, -2);
    }
    ctx.stroke();

    // torso
    ctx.fillStyle = look.shirt;
    ctx.beginPath();
    ctx.roundRect(-10, hip - torsoLen, 20, torsoLen + 2, 7);
    ctx.fill();
    if (o.baby) {
      ctx.fillStyle = "#f4f4f4";
      ctx.beginPath();
      ctx.roundRect(-10, hip - 6, 20, 10, 5);
      ctx.fill();
    } else if (look.gender === "meisje" && !o.adult) {
      ctx.fillStyle = look.shirt;
      ctx.beginPath();
      ctx.moveTo(-10, hip - 4);
      ctx.lineTo(10, hip - 4);
      ctx.lineTo(14, hip + 6);
      ctx.lineTo(-14, hip + 6);
      ctx.closePath();
      ctx.fill();
    }

    // arm: armAngle in local coords (0 = forward, negative = up)
    const armAngle = o.armAngle ?? Math.PI / 2 - 0.25 + (pose === "walk" ? Math.sin(t * 10) * 0.3 : 0);
    const armLen = o.adult ? 20 : 15;
    const hx = 2 + Math.cos(armAngle) * armLen;
    const hy = shoulderY + Math.sin(armAngle) * armLen;
    ctx.strokeStyle = look.skin;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(2, shoulderY);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    ctx.fillStyle = look.shade;
    ctx.beginPath();
    ctx.arc(hx, hy, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // head last, so arms never cover the face
    ctx.save();
    ctx.translate(0, headLift);
    drawHead(ctx, look, { ...o, t });
    ctx.restore();

    ctx.restore();

    const headTop = y + (headLift - 70) * s;
    if (o.dizzy) G.drawStars(ctx, x + facing * 2 * s, headTop, s, t);
    return { x: x + facing * hx * s, y: y + hy * s };
  };

  G.drawStars = (ctx, x, y, s, t) => {
    ctx.fillStyle = "#ffe066";
    for (let i = 0; i < 3; i++) {
      const a = t * 4 + (i * Math.PI * 2) / 3;
      const sx = x + Math.cos(a) * 20 * s;
      const sy = y + Math.sin(a) * 6 * s;
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const r = k % 2 === 0 ? 6 : 2.5;
        const aa = (k / 10) * Math.PI * 2 - Math.PI / 2;
        ctx.lineTo(sx + Math.cos(aa) * r, sy + Math.sin(aa) * r);
      }
      ctx.fill();
    }
  };

  // World angle for something held in a hand of a figure facing `facing`.
  G.heldAngle = (localAngle, facing) => (facing === 1 ? localAngle : Math.PI - localAngle);

  // Cartoon pistol pointing along `angle`.
  G.drawPistol = (ctx, x, y, angle, scale, color = "#5c6470") => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    if (Math.cos(angle) < -0.01) ctx.scale(1, -1);
    ctx.scale(scale, scale);
    ctx.fillStyle = color;
    ctx.fillRect(-8, -6, 20, 7);
    ctx.fillStyle = "#3b414a";
    ctx.fillRect(-8, 0, 7, 10);
    ctx.fillStyle = "#8e98a6";
    ctx.fillRect(-6, -5, 16, 2);
    ctx.fillStyle = "#ff8fb1";
    ctx.fillRect(10, -6, 3, 3);
    ctx.restore();
  };

  G.drawBubble = (ctx, x, y, text, color = "#ffffff") => {
    ctx.font = "bold 14px Segoe UI, Roboto, sans-serif";
    const w = Math.min(ctx.measureText(text).width + 20, G.W - 20);
    const bx = G.clamp(x - w / 2, 10, G.W - w - 10);
    const by = y - 34;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(bx, by, w, 28, 10);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(G.clamp(x - 6, bx + 8, bx + w - 20), by + 27);
    ctx.lineTo(G.clamp(x, bx + 14, bx + w - 14), by + 38);
    ctx.lineTo(G.clamp(x + 6, bx + 20, bx + w - 8), by + 27);
    ctx.fill();
    ctx.fillStyle = "#1c1a2a";
    ctx.textAlign = "center";
    ctx.fillText(text, bx + w / 2, by + 19);
  };

  // Plays a list of {who, text, ms} lines; returns the current line or null.
  G.makeScript = (lines) => ({
    lines,
    index: 0,
    left: lines.length ? lines[0].ms : 0,
    update(dt) {
      if (this.index >= this.lines.length) return;
      this.left -= dt;
      if (this.left <= 0) {
        this.index++;
        if (this.index < this.lines.length) this.left = this.lines[this.index].ms;
      }
    },
    current() {
      return this.lines[this.index] || null;
    },
    done() {
      return this.index >= this.lines.length;
    },
  });

  // On-canvas choice buttons, selectable with ←/→ + SPACE or by tapping.
  G.makeChoice = (options) => ({
    options,
    selected: 0,
    rects: [],
    onDirection(dx) {
      if (dx) this.selected = G.clamp(this.selected + dx, 0, this.options.length - 1);
    },
    hit(x, y) {
      return this.rects.findIndex((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    },
    draw(ctx, t) {
      const n = this.options.length;
      const gap = n > 2 ? 14 : 30;
      const w = Math.min(180, (G.W - 40 - gap * (n - 1)) / n);
      const total = n * w + (n - 1) * gap;
      const y = G.H - 70;
      this.rects = this.options.map((_, i) => ({ x: G.W / 2 - total / 2 + i * (w + gap), y, w, h: 46 }));
      this.options.forEach((label, i) => {
        const r = this.rects[i];
        const sel = i === this.selected;
        ctx.fillStyle = sel ? `rgba(255, 224, 102, ${0.85 + Math.sin(t * 6) * 0.15})` : "rgba(20, 16, 36, 0.8)";
        ctx.beginPath();
        ctx.roundRect(r.x, r.y, r.w, r.h, 23);
        ctx.fill();
        ctx.fillStyle = sel ? "#1c1a2a" : "#eef2ff";
        ctx.font = "bold 16px Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(label, r.x + r.w / 2, r.y + 29);
      });
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "12px Segoe UI, Roboto, sans-serif";
      ctx.fillText("← → kiezen · SPATIE bevestigen (of tik)", G.W / 2, G.H - 12);
    },
  });
})();
