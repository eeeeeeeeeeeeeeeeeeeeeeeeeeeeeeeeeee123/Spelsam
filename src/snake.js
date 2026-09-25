(() => {
  const { CELL, COLS, ROWS } = G;
  const STEP_MS = 150;
  const QUEUE_MAX = 3;

  // Classic Snake: walls and own tail are fatal. Levels customise it through
  // optional cfg hooks (setup, hazard, onEnter, onAction, tick, draw*, hud).
  G.makeSnakeLevel = (cfg) => ({
    title: cfg.title,
    intro: cfg.intro,
    drawBackground: cfg.drawBackground,

    start(api) {
      this.api = api;
      const cx = Math.floor(COLS / 2);
      const cy = Math.floor(ROWS / 2);
      this.body = [
        { x: cx, y: cy },
        { x: cx - 1, y: cy },
        { x: cx - 2, y: cy },
      ];
      this.dir = { x: 1, y: 0 };
      this.queue = [];
      this.count = 0;
      this.acc = 0;
      this.pendingGrowth = 0;
      this.ended = false;
      if (cfg.drawItem) {
        this.item = this.spawnFree();
        this.itemAngle = Math.random() * Math.PI * 2;
      }
      cfg.setup?.(this);
    },

    fail(reason) {
      if (this.ended) return;
      this.ended = true;
      this.api.fail(reason);
    },

    win() {
      if (this.ended) return;
      this.ended = true;
      this.api.complete();
    },

    grow() {
      this.pendingGrowth++;
    },

    isFree(p) {
      return !this.body.some((s) => s.x === p.x && s.y === p.y) && !cfg.blocked?.(this, p);
    },

    // Random free cell, never on the outer border.
    spawnFree(avoid) {
      let pos;
      do {
        pos = { x: 1 + G.randInt(COLS - 2), y: 1 + G.randInt(ROWS - 2) };
      } while (!this.isFree(pos) || (avoid && avoid(pos)));
      return pos;
    },

    onDirection(dx, dy) {
      const last = this.queue.length ? this.queue[this.queue.length - 1] : this.dir;
      if ((last.x === dx && last.y === dy) || (last.x === -dx && last.y === -dy)) return;
      if (this.queue.length >= QUEUE_MAX) return;
      this.queue.push({ x: dx, y: dy });
      // Turn right away instead of waiting for the next tick.
      if (this.acc >= STEP_MS / 2 && !this.ended) {
        this.acc = 0;
        this.step();
      }
    },

    onAction() {
      if (!this.ended) cfg.onAction?.(this);
    },

    update(dt) {
      this.acc += dt;
      while (this.acc >= STEP_MS && !this.ended) {
        this.acc -= STEP_MS;
        this.step();
      }
      if (!this.ended) cfg.tick?.(this, dt);
    },

    step() {
      if (this.queue.length) this.dir = this.queue.shift();
      const head = this.body[0];
      const next = { x: head.x + this.dir.x, y: head.y + this.dir.y };

      if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS) {
        this.fail("Je botste tegen de rand!");
        return;
      }

      const eats = this.item && next.x === this.item.x && next.y === this.item.y;
      const growing = eats || this.pendingGrowth > 0;
      // The tail cell frees up this tick unless we grow, so it's safe to enter.
      const blocking = growing ? this.body : this.body.slice(0, -1);
      if (blocking.some((s) => s.x === next.x && s.y === next.y)) {
        this.fail("Je raakte je eigen staart!");
        return;
      }
      const hazard = cfg.hazard?.(this, next);
      if (hazard) {
        this.fail(hazard);
        return;
      }

      this.body.unshift(next);
      if (!growing) this.body.pop();
      else if (!eats) this.pendingGrowth--;

      if (eats) {
        this.count++;
        if (this.count >= cfg.target) {
          this.win();
          return;
        }
        this.item = this.spawnFree();
        this.itemAngle = Math.random() * Math.PI * 2;
      }
      cfg.onEnter?.(this, next);
    },

    headRadius() {
      return CELL * 0.3 + this.count * 0.9;
    },

    render(ctx, t) {
      cfg.drawBackground(ctx, t);
      if (cfg.drawItem) cfg.drawItem(ctx, this.item, t, this.itemAngle);
      cfg.drawExtras?.(this, ctx, t);
      const points = this.body.map(G.cellCenter);
      const angle = Math.atan2(this.dir.y, this.dir.x);
      G.drawSperm(ctx, points, angle, this.headRadius(), t);
      cfg.drawOverlay?.(this, ctx, t);
    },

    hud() {
      return cfg.hud ? cfg.hud(this) : `${cfg.itemLabel}: ${this.count} / ${cfg.target}`;
    },
  });
})();
