window.SC = window.SC || {};

SC.Countermeasure = class Countermeasure {
    constructor(x, y, shipAngle) {
        const C = SC.CONST;
        // Eject from the back of the ship with random spread
        const backAngle = shipAngle + Math.PI + (Math.random() - 0.5) * 1.2;
        const speed = C.COUNTERMEASURE_SPEED * (0.6 + Math.random() * 0.8);

        this.pos = new SC.Vec2(x, y);
        this.vel = new SC.Vec2(
            Math.cos(backAngle) * speed,
            Math.sin(backAngle) * speed
        );
        // Add slight spin for visual variety
        this.spinAngle = Math.random() * Math.PI * 2;
        this.spinSpeed = (Math.random() - 0.5) * 4;

        this.alive = true;
        this.lifetime = C.COUNTERMEASURE_LIFETIME;
        this.maxLifetime = C.COUNTERMEASURE_LIFETIME;
        this.fadeTime = C.COUNTERMEASURE_FADE_TIME;
    }

    update(dt, w, h) {
        if (!this.alive) return;

        this.lifetime -= dt;
        if (this.lifetime <= 0) {
            this.alive = false;
            return;
        }

        // Drift with slight drag
        this.vel = this.vel.scale(1 - 0.005);
        this.pos = this.pos.add(this.vel.scale(dt));
        this.spinAngle += this.spinSpeed * dt;

        // Wrap
        if (this.pos.x < 0) this.pos.x += w;
        if (this.pos.x > w) this.pos.x -= w;
        if (this.pos.y < 0) this.pos.y += h;
        if (this.pos.y > h) this.pos.y -= h;
    }

    draw(renderer) {
        if (!this.alive) return;

        const C = SC.CONST;
        const s = C.COUNTERMEASURE_RADIUS;

        // Fade out during last FADE_TIME seconds
        let alpha = 1;
        if (this.lifetime < this.fadeTime) {
            alpha = this.lifetime / this.fadeTime;
        }

        if (alpha < 1) {
            renderer.ctx.globalAlpha = alpha;
        }

        // Draw as a small triangle (different from mine's diamond)
        const a = this.spinAngle;
        const pts = [
            new SC.Vec2(
                this.pos.x + Math.cos(a) * s * 1.3,
                this.pos.y + Math.sin(a) * s * 1.3
            ),
            new SC.Vec2(
                this.pos.x + Math.cos(a + Math.PI * 2 / 3) * s,
                this.pos.y + Math.sin(a + Math.PI * 2 / 3) * s
            ),
            new SC.Vec2(
                this.pos.x + Math.cos(a + Math.PI * 4 / 3) * s,
                this.pos.y + Math.sin(a + Math.PI * 4 / 3) * s
            ),
        ];
        const pulse = 0.6 + 0.4 * Math.sin(this.lifetime * 6);
        renderer.drawPolygon(pts, C.COLOR_COUNTERMEASURE, 1.5, 8 * pulse);

        renderer.ctx.globalAlpha = 1;
    }
};
