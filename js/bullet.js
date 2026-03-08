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
    }

    update(dt, w, h) {
        this.pos = this.pos.add(this.vel.scale(dt));
        this.lifetime -= dt;
        if (this.lifetime <= 0) this.alive = false;

        // Despawn off-screen (no wrap for cannon bullets)
        if (this.pos.x < -50 || this.pos.x > w + 50 ||
            this.pos.y < -50 || this.pos.y > h + 50) {
            this.alive = false;
        }
    }

    draw(renderer) {
        if (!this.alive) return;
        renderer.drawFilledCircle(this.pos.x, this.pos.y, SC.CONST.CANNON_BULLET_RADIUS, SC.CONST.COLOR_CANNON_BULLET, 14);
    }
};
