window.SC = window.SC || {};

SC.Mine = class Mine {
    constructor(cx, cy, speed) {
        this.pos = new SC.Vec2(cx, cy);
        this.vel = new SC.Vec2(
            (Math.random() - 0.5) * speed,
            (Math.random() - 0.5) * speed
        );
        this.speed = speed;
        this.alive = true;
        this.spawnTimer = 1.0; // brief emergence period
        this.pulsePhase = Math.random() * Math.PI * 2;
    }

    update(dt, playerPos, w, h) {
        this.pulsePhase += dt * 8;

        if (this.spawnTimer > 0) {
            this.spawnTimer -= dt;
            // Move outward from center during spawn
            this.pos = this.pos.add(this.vel.scale(dt));
            return;
        }

        // Homing: steer toward player
        const toPlayer = playerPos.sub(this.pos).normalize();
        const currentDir = this.vel.normalize();
        const blended = currentDir.add(
            toPlayer.sub(currentDir).scale(SC.CONST.MINE_TURN_RATE * dt)
        ).normalize();

        const effectiveSpeed = this.speed * (SC.enemySpeedMult || 1);
        this.vel = blended.scale(effectiveSpeed);
        this.pos = this.pos.add(this.vel.scale(dt));

        // Wrap
        if (this.pos.x < 0) this.pos.x += w;
        if (this.pos.x > w) this.pos.x -= w;
        if (this.pos.y < 0) this.pos.y += h;
        if (this.pos.y > h) this.pos.y -= h;
    }

    draw(renderer) {
        if (!this.alive) return;

        const C = SC.CONST;
        const pulse = 0.7 + 0.3 * Math.sin(this.pulsePhase);

        if (this.spawnTimer > 0) {
            // Dim during spawn
            const alpha = 1 - this.spawnTimer;
            renderer.ctx.globalAlpha = alpha;
        }

        // Draw as small diamond shape
        const s = C.MINE_RADIUS;
        const pts = [
            new SC.Vec2(this.pos.x, this.pos.y - s),
            new SC.Vec2(this.pos.x + s, this.pos.y),
            new SC.Vec2(this.pos.x, this.pos.y + s),
            new SC.Vec2(this.pos.x - s, this.pos.y),
        ];
        renderer.drawPolygon(pts, C.COLOR_MINE, 1.5, 10 * pulse);
        renderer.ctx.globalAlpha = 1;
    }
};
