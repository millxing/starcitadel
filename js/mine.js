window.SC = window.SC || {};

SC.Mine = class Mine {
    constructor(cx, cy, speed, ringSystem, startRingIndex) {
        this.speed = speed;
        this.alive = true;
        this.pulsePhase = Math.random() * Math.PI * 2;

        // Wander: gentle oscillation so mines don't cluster when free
        this.wanderPhase = Math.random() * Math.PI * 2;
        this.wanderFreq = 0.5 + Math.random() * 1.0;

        // Ring-riding state
        this.ringCx = cx;
        this.ringCy = cy;
        this.attached = false;
        this.attachedRing = null;
        this.attachAngle = Math.random() * Math.PI * 2;
        this.accumulatedRotation = 0;
        this.fadeIn = 1.0; // brief fade-in on spawn
        this.vel = new SC.Vec2(0, 0);

        // Attach to specified ring (default: innermost = 2)
        const ri = (startRingIndex != null) ? startRingIndex : 2;
        if (ringSystem && ringSystem.rings[ri] && ringSystem.rings[ri].radius > 10) {
            this.attached = true;
            this.attachedRing = ringSystem.rings[ri];
            this.pos = new SC.Vec2(
                cx + Math.cos(this.attachAngle) * this.attachedRing.radius,
                cy + Math.sin(this.attachAngle) * this.attachedRing.radius
            );
        } else {
            // Fallback: spawn from center
            this.pos = new SC.Vec2(cx, cy);
            this.vel = new SC.Vec2(
                (Math.random() - 0.5) * speed,
                (Math.random() - 0.5) * speed
            );
        }
    }

    detach() {
        this.attached = false;
        this.attachedRing = null;
        const outDir = new SC.Vec2(
            Math.cos(this.attachAngle),
            Math.sin(this.attachAngle)
        );
        this.vel = outDir.scale(this.speed);
    }

    update(dt, playerPos, w, h, ringSystem, countermeasures) {
        this.pulsePhase += dt * 8;
        if (this.fadeIn > 0) this.fadeIn -= dt;

        // --- Ring-riding phase ---
        if (this.attached && ringSystem) {
            // Check if our ring still exists and isn't collapsing/destroyed
            const idx = ringSystem.rings.indexOf(this.attachedRing);
            if (idx < 0 || this.attachedRing.collapsing ||
                this.attachedRing.isFullyDestroyed() || this.attachedRing.radius < 10) {
                this.detach();
                // Fall through to free-flying below
            } else {
                // Check if the segment under this mine was destroyed
                const segCount = SC.CONST.RING_SEGMENT_COUNT;
                const segAngle = Math.PI * 2 / segCount;
                const localAngle = SC.normalizeAngle(this.attachAngle - this.attachedRing.rotationOffset);
                const segIndex = Math.floor(localAngle / segAngle) % segCount;
                if (this.attachedRing.segments[segIndex].health <= 0) {
                    this.detach();
                    // Fall through to free-flying below
                } else {
                    // Ride the ring rotation
                    const rotDelta = this.attachedRing.rotationSpeed * (SC.enemySpeedMult || 1) * dt;
                    this.attachAngle += rotDelta;
                    this.accumulatedRotation += Math.abs(rotDelta);

                    this.ringCx = ringSystem.cx;
                    this.ringCy = ringSystem.cy;
                    this.pos = new SC.Vec2(
                        this.ringCx + Math.cos(this.attachAngle) * this.attachedRing.radius,
                        this.ringCy + Math.sin(this.attachAngle) * this.attachedRing.radius
                    );

                    // After quarter rotation, jump outward or release
                    if (this.accumulatedRotation >= Math.PI / 2) {
                        if (idx > 0) {
                            // Jump to next ring outward
                            this.attachedRing = ringSystem.rings[idx - 1];
                            this.accumulatedRotation = 0;
                        } else {
                            // On outer ring — release!
                            this.detach();
                        }
                    }
                    return;
                }
            }
        }

        // --- Free-flying homing behavior ---

        // Wander: gentle sine oscillation so mines spread slightly
        this.wanderPhase += this.wanderFreq * dt;
        const wanderOffset = Math.sin(this.wanderPhase) * 0.15; // ±~8 degrees

        // Determine target: track nearest countermeasure if closer than player
        let targetPos = playerPos;
        if (countermeasures && countermeasures.length > 0) {
            const distToPlayer = this.pos.distTo(playerPos);
            let closestCM = null;
            let closestDist = distToPlayer;
            for (const cm of countermeasures) {
                if (!cm.alive) continue;
                const d = this.pos.distTo(cm.pos);
                if (d < closestDist) {
                    closestDist = d;
                    closestCM = cm;
                }
            }
            if (closestCM) targetPos = closestCM.pos;
        }

        // Homing: steer toward target with slight wander offset
        const toPlayer = targetPos.sub(this.pos).normalize().rotate(wanderOffset);
        const currentDir = this.vel.normalize();
        const blended = currentDir.add(
            toPlayer.sub(currentDir).scale(SC.CONST.MINE_TURN_RATE * dt)
        ).normalize();

        const effectiveSpeed = this.speed * (SC.enemySpeedMult || 1);
        this.vel = blended.scale(effectiveSpeed);
        this.pos = this.pos.add(this.vel.scale(dt));

        // Collide with ring segments — mines must go around
        if (ringSystem) {
            const col = ringSystem.checkShipCollision(this.pos, SC.CONST.MINE_RADIUS);
            if (col.hit) {
                // Push mine back outside the ring and deflect velocity tangentially
                const nx = col.normalX;
                const ny = col.normalY;
                const dx = this.pos.x - ringSystem.cx;
                const dy = this.pos.y - ringSystem.cy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const outside = dist > col.radius;
                const pushDist = SC.CONST.MINE_RADIUS + SC.CONST.RING_THICKNESS / 2 + 1;
                if (outside) {
                    this.pos = new SC.Vec2(
                        ringSystem.cx + nx * (col.radius + pushDist),
                        ringSystem.cy + ny * (col.radius + pushDist)
                    );
                } else {
                    this.pos = new SC.Vec2(
                        ringSystem.cx + nx * (col.radius - pushDist),
                        ringSystem.cy + ny * (col.radius - pushDist)
                    );
                }
                // Deflect velocity to be tangential to ring
                const dot = this.vel.x * nx + this.vel.y * ny;
                this.vel = new SC.Vec2(this.vel.x - dot * nx, this.vel.y - dot * ny);
            }
        }

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

        if (this.fadeIn > 0) {
            renderer.ctx.globalAlpha = 1 - this.fadeIn;
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
