(() => {
  const { CELL, COLS, ROWS } = G;
  const STEP_MS = 150;

  // Classic Snake: walls and own tail are fatal, each pickup grows the cell.
  G.makeSnakeLevel = (cfg) => {
    const level = {
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
        this.nextDir = { x: 1, y: 0 };
        this.count = 0;
        this.acc = 0;
        this.item = this.spawnItem();
        this.itemAngle = Math.random() * Math.PI * 2;
      },

      spawnItem() {
        let pos;
        do {
          pos = { x: G.randInt(COLS), y: G.randInt(ROWS) };
        } while (this.body.some((s) => s.x === pos.x && s.y === pos.y));
        return pos;
      },

      onDirection(dx, dy) {
        if (this.dir.x === -dx && this.dir.y === -dy) return;
        this.nextDir = { x: dx, y: dy };
      },

      update(dt) {
        this.acc += dt;
        while (this.acc >= STEP_MS) {
          this.acc -= STEP_MS;
          if (!this.step()) return;
        }
      },

      step() {
        this.dir = this.nextDir;
        const head = this.body[0];
        const next = { x: head.x + this.dir.x, y: head.y + this.dir.y };

        if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS) {
          this.api.fail("Je botste tegen de rand!");
          return false;
        }

        const eating = next.x === this.item.x && next.y === this.item.y;
        // The tail cell frees up this tick unless we grow, so it's safe to enter.
        const blocking = eating ? this.body : this.body.slice(0, -1);
        if (blocking.some((s) => s.x === next.x && s.y === next.y)) {
          this.api.fail("Je raakte je eigen staart!");
          return false;
        }

        this.body.unshift(next);
        if (eating) {
          this.count++;
          if (this.count >= cfg.target) {
            this.api.complete();
            return false;
          }
          this.item = this.spawnItem();
          this.itemAngle = Math.random() * Math.PI * 2;
        } else {
          this.body.pop();
        }
        return true;
      },

      headRadius() {
        return CELL * 0.3 + this.count * 0.9;
      },

      render(ctx, t) {
        cfg.drawBackground(ctx, t);
        cfg.drawItem(ctx, this.item, t, this.itemAngle);
        const points = this.body.map(G.cellCenter);
        const angle = Math.atan2(this.dir.y, this.dir.x);
        G.drawSperm(ctx, points, angle, this.headRadius(), t);
      },

      hud() {
        return `${cfg.itemLabel}: ${this.count} / ${cfg.target}`;
      },
    };
    return level;
  };
})();
