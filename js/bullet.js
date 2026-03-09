window.SC = window.SC || {};

SC.Bullet = class Bullet {
    constructor(x, y, vx, vy) {
        this.pos = new SC.Vec2(x, y);
        this.vel = new SC.Vec2(vx, vy);
        this.alive = true;
        this.lifetime = SC.CONST.BULLET_LIFETIME;
    }

    update(dt, w, h) {
        this.pos = this.pos.add(this.vel.scale(dt));
        this.lifetime -= dt;
        if (this.lifetime <= 0) this.alive = false;

        // Wrap
        if (this.pos.x < 0) this.pos.x += w;
        if (this.pos.x > w) this.pos.x -= w;
        if (this.pos.y < 0) this.pos.y += h;
        if (this.pos.y > h) this.pos.y -= h;
    }

    draw(renderer) {
        if (!this.alive) return;
        renderer.drawFilledCircle(this.pos.x, this.pos.y, SC.CONST.BULLET_RADIUS, SC.CONST.COLOR_BULLET, 8);
    }
};

SC.CannonBullet = class CannonBullet {
    constructor(x, y, vx, vy) {
        this.pos = new SC.Vec2(x, y);
        this.vel = new SC.Vec2(vx, vy);
        this.alive = true;
        this.lifetime = 3.0;
        this.phase = Math.random() * Math.PI * 2;
    }

    update(dt, w, h) {
        this.pos = this.pos.add(this.vel.scale(dt));
        this.lifetime -= dt;
        this.phase += dt * 12; // spin/pulse speed
        if (this.lifetime <= 0) this.alive = false;

        // Despawn off-screen (no wrap for cannon bullets)
        if (this.pos.x < -50 || this.pos.x > w + 50 ||
            this.pos.y < -50 || this.pos.y > h + 50) {
            this.alive = false;
        }
    }

    draw(renderer) {
        if (!this.alive) return;
        const C = SC.CONST;
        const r = C.CANNON_BULLET_RADIUS;
        const pulse = 0.7 + 0.3 * Math.sin(this.phase * 3);
        const glow = 18 * pulse;
        const x = this.pos.x;
        const y = this.pos.y;
        const color = C.COLOR_CANNON_BULLET;

        // Pulsing asterisk — 3 lines through center, slowly rotating
        const spokes = 3;
        for (let i = 0; i < spokes; i++) {
            const angle = this.phase + (i * Math.PI / spokes);
            const dx = Math.cos(angle) * r * pulse;
            const dy = Math.sin(angle) * r * pulse;
            renderer.drawLine(x - dx, y - dy, x + dx, y + dy, color, 2.5, glow);
        }
    }
};
