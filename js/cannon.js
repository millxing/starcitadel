window.SC = window.SC || {};

SC.Cannon = class Cannon {
    constructor(cx, cy) {
        this.pos = new SC.Vec2(cx, cy);
        this.aimAngle = 0;
        this.trackSpeed = SC.CONST.CANNON_TRACK_SPEED_BASE;
        this.fireCooldownTime = SC.CONST.CANNON_FIRE_COOLDOWN;
        this.bulletSpeed = SC.CONST.CANNON_BULLET_SPEED;
        this.fireTimer = this.fireCooldownTime;
        this.alive = true;
        this.pulsePhase = 0;
    }

    setLevel(level) {
        const C = SC.CONST;
        this.trackSpeed = C.CANNON_TRACK_SPEED_BASE +
            C.CANNON_TRACK_SPEED_INCREMENT * (level - 1);
        this.fireCooldownTime = Math.max(C.CANNON_FIRE_COOLDOWN_MIN,
            C.CANNON_FIRE_COOLDOWN - C.CANNON_FIRE_COOLDOWN_DECREMENT * (level - 1));
        this.bulletSpeed = Math.min(C.CANNON_BULLET_SPEED_MAX,
            C.CANNON_BULLET_SPEED + C.CANNON_BULLET_SPEED_INCREMENT * (level - 1));
    }

    update(dt, playerPos, ringSystem) {
        if (!this.alive) return;

        this.pulsePhase += dt * 3;

        // Track player
        const targetAngle = Math.atan2(
            playerPos.y - this.pos.y,
            playerPos.x - this.pos.x
        );

        let diff = SC.normalizeAngle(targetAngle - this.aimAngle);
        if (diff > Math.PI) diff -= Math.PI * 2;

        const maxTurn = this.trackSpeed * (SC.enemySpeedMult || 1) * dt;
        if (Math.abs(diff) < maxTurn) {
            this.aimAngle = targetAngle;
        } else {
            this.aimAngle += Math.sign(diff) * maxTurn;
        }
        this.aimAngle = SC.normalizeAngle(this.aimAngle);

        // Fire cooldown
        this.fireTimer -= dt;
    }

    tryFire(ringSystem, playerPos) {
        if (!this.alive || this.fireTimer > 0) return null;

        if (ringSystem.hasPredictedLineOfSight(this.aimAngle, this.bulletSpeed)) {
            this.fireTimer = this.fireCooldownTime;
            const dir = SC.Vec2.fromAngle(this.aimAngle);
            return new SC.CannonBullet(
                this.pos.x + dir.x * SC.CONST.CANNON_RADIUS,
                this.pos.y + dir.y * SC.CONST.CANNON_RADIUS,
                dir.x * this.bulletSpeed,
                dir.y * this.bulletSpeed
            );
        }
        return null;
    }

    draw(renderer) {
        if (!this.alive) return;

        const C = SC.CONST;
        const pulse = 0.8 + 0.2 * Math.sin(this.pulsePhase);

        // Outer ring of cannon
        renderer.drawCircle(this.pos.x, this.pos.y, C.CANNON_RADIUS, C.COLOR_CANNON, 2, 15 * pulse);

        // Inner core
        renderer.drawFilledCircle(this.pos.x, this.pos.y, C.CANNON_INNER_RADIUS, C.COLOR_CANNON, 10 * pulse);

        // Aim indicator line
        const dir = SC.Vec2.fromAngle(this.aimAngle);
        renderer.drawLine(
            this.pos.x + dir.x * C.CANNON_INNER_RADIUS,
            this.pos.y + dir.y * C.CANNON_INNER_RADIUS,
            this.pos.x + dir.x * C.CANNON_RADIUS,
            this.pos.y + dir.y * C.CANNON_RADIUS,
            C.COLOR_CANNON, 2, 8
        );
    }

    reset(cx, cy) {
        this.pos = new SC.Vec2(cx, cy);
        this.alive = true;
        this.fireTimer = this.fireCooldownTime * 2; // grace period at level start
    }
};
