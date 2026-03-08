window.SC = window.SC || {};

SC.Mine = class Mine {
    constructor(cx, cy, speed, ringSystem, ringIndex) {
        this.speed = speed;
        this.alive = true;
        this.spawnTimer = 1.0;
        this.pulsePhase = Math.random() * Math.PI * 2;

        // Wander: gentle oscillation so mines don't cluster
        this.wanderPhase = Math.random() * Math.PI * 2;
        this.wanderFreq = 0.5 + Math.random() * 1.0;

        // Attach to a ring segment during spawn
        if (ringSystem && ringSystem.rings[ringIndex] && ringSystem.rings[ringIndex].radius > 10) {
            this.attachedRing = ringSystem.rings[ringIndex];
            this.attachAngle = Math.random() * Math.PI * 2;
            this.ringCx = cx;
            this.ringCy = cy;
            this.pos = new SC.Vec2(
                cx + Math.cos(this.attachAngle) * this.attachedRing.radius,
                cy + Math.sin(this.attachAngle) * this.attachedRing.radius
            );
            this.vel = new SC.Vec2(0, 0);
        } else {
            // Fallback: spawn from center
            this.attachedRing = null;
            this.pos = new SC.Vec2(cx, cy);
            this.vel = new SC.Vec2(
                (Math.random() - 0.5) * speed,
                (Math.random() - 0.5) * speed
            );
        }
    }

    update(dt, playerPos, w, h) {
        this.pulsePhase += dt * 8;

        if (this.spawnTimer > 0) {
            this.spawnTimer -= dt;

            if (this.attachedRing) {
                // Ride the ring rotation
                this.attachAngle += this.attachedRing.rotationSpeed * (SC.enemySpeedMult || 1) * dt;
                this.pos = new SC.Vec2(
                    this.ringCx + Math.cos(this.attachAngle) * this.attachedRing.radius,
                    this.ringCy + Math.sin(this.attachAngle) * this.attachedRing.radius
                );

                if (this.spawnTimer <= 0) {
                    // Detach: launch outward from ring
                    const outDir = new SC.Vec2(
                        Math.cos(this.attachAngle),
                        Math.sin(this.attachAngle)
                    );
                    this.vel = outDir.scale(this.speed);
                    this.attachedRing = null;
                }
                return;
            }

            // Fallback drift from center
            this.pos = this.pos.add(this.vel.scale(dt));
            return;
        }

        // Wander: gentle sine oscillation so mines spread slightly
        this.wanderPhase += this.wanderFreq * dt;
        const wanderOffset = Math.sin(this.wanderPhase) * 0.15; // ±~8 degrees

        // Homing: steer toward player with slight wander offset
        const toPlayer = playerPos.sub(this.pos).normalize().rotate(wanderOffset);
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
