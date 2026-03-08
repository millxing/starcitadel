window.SC = window.SC || {};

SC.Player = class Player {
    constructor(x, y) {
        this.pos = new SC.Vec2(x, y);
        this.vel = new SC.Vec2(0, 0);
        this.angle = -Math.PI / 2; // facing up
        this.alive = true;
        this.invulnTimer = 0;
        this.fireCooldown = 0;
        this.thrustOn = false;
    }

    update(dt, input, w, h) {
        if (!this.alive) return;

        const C = SC.CONST;
        const sm = SC.shipSpeedMult || 1;

        // Rotate (uses its own multiplier)
        const rm = SC.rotateSpeedMult || 1;
        if (input.left) this.angle -= C.PLAYER_ROTATE_SPEED * rm * dt;
        if (input.right) this.angle += C.PLAYER_ROTATE_SPEED * rm * dt;

        // Thrust
        this.thrustOn = input.thrust;
        if (input.thrust) {
            const dir = SC.Vec2.fromAngle(this.angle);
            this.vel = this.vel.add(dir.scale(C.PLAYER_THRUST * sm * dt));
        }

        // Drag
        this.vel = this.vel.scale(1 - C.PLAYER_DRAG);

        // Speed cap
        const maxSpd = C.PLAYER_MAX_SPEED * sm;
        const spd = this.vel.mag();
        if (spd > maxSpd) {
            this.vel = this.vel.scale(maxSpd / spd);
        }

        // Move
        this.pos = this.pos.add(this.vel.scale(dt));

        // Wrap
        if (this.pos.x < 0) this.pos.x += w;
        if (this.pos.x > w) this.pos.x -= w;
        if (this.pos.y < 0) this.pos.y += h;
        if (this.pos.y > h) this.pos.y -= h;

        // Cooldowns
        if (this.fireCooldown > 0) this.fireCooldown -= dt;
        if (this.invulnTimer > 0) this.invulnTimer -= dt;
    }

    fire() {
        if (!this.alive || this.fireCooldown > 0) return null;
        this.fireCooldown = SC.CONST.PLAYER_FIRE_COOLDOWN;
        const dir = SC.Vec2.fromAngle(this.angle);
        const tip = this.pos.add(dir.scale(SC.CONST.PLAYER_SIZE));
        const bSpd = SC.CONST.BULLET_SPEED * (SC.shipSpeedMult || 1);
        return new SC.Bullet(tip.x, tip.y, dir.x * bSpd, dir.y * bSpd);
    }

    getVertices() {
        const s = SC.CONST.PLAYER_SIZE;
        const nose = SC.Vec2.fromAngle(this.angle).scale(s);
        const left = SC.Vec2.fromAngle(this.angle + 2.4).scale(s * 0.7);
        const right = SC.Vec2.fromAngle(this.angle - 2.4).scale(s * 0.7);
        return [
            this.pos.add(nose),
            this.pos.add(left),
            this.pos.add(right)
        ];
    }

    draw(renderer, time) {
        if (!this.alive) return;

        // Blink during invulnerability
        if (this.invulnTimer > 0 && Math.floor(time * 10) % 2 === 0) return;

        const verts = this.getVertices();
        renderer.drawPolygon(verts, SC.CONST.COLOR_SHIP, 1.5, 10);

        // Thrust flame
        if (this.thrustOn) {
            const s = SC.CONST.PLAYER_SIZE;
            const back = SC.Vec2.fromAngle(this.angle + Math.PI).scale(s * 0.7);
            const flameLen = s * (0.4 + Math.random() * 0.4);
            const flameTip = this.pos.add(SC.Vec2.fromAngle(this.angle + Math.PI).scale(s * 0.7 + flameLen));
            const fl = this.pos.add(SC.Vec2.fromAngle(this.angle + Math.PI + 0.3).scale(s * 0.45));
            const fr = this.pos.add(SC.Vec2.fromAngle(this.angle + Math.PI - 0.3).scale(s * 0.45));
            renderer.drawPolygon([fl, flameTip, fr], '#ff8800', 1, 8);
        }
    }

    reset(x, y) {
        this.pos = new SC.Vec2(x, y);
        this.vel = new SC.Vec2(0, 0);
        this.angle = -Math.PI / 2;
        this.alive = true;
        this.invulnTimer = SC.CONST.PLAYER_INVULN_TIME;
        this.fireCooldown = 0;
    }
};
