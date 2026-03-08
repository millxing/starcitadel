window.SC = window.SC || {};

const TWO_PI = Math.PI * 2;

SC.RingSegment = class RingSegment {
    constructor(index) {
        this.index = index;
        this.health = 2; // 2=full, 1=damaged, 0=destroyed
        const segAngle = TWO_PI / SC.CONST.RING_SEGMENT_COUNT;
        const gapRad = SC.CONST.RING_GAP_DEGREES * Math.PI / 180;
        this.localStart = index * segAngle + gapRad / 2;
        this.arcLength = segAngle - gapRad;
    }

    reset() { this.health = 2; }
};

SC.Ring = class Ring {
    constructor(radius, speed, color, dimColor) {
        this.radius = radius;
        this.targetRadius = radius;
        this.rotationOffset = 0;
        this.rotationSpeed = speed;
        this.color = color;
        this.dimColor = dimColor;
        this.segments = [];
        for (let i = 0; i < SC.CONST.RING_SEGMENT_COUNT; i++) {
            this.segments.push(new SC.RingSegment(i));
        }
    }

    update(dt) {
        this.rotationOffset += this.rotationSpeed * (SC.enemySpeedMult || 1) * dt;
        // Animate radius toward target
        if (Math.abs(this.radius - this.targetRadius) > 0.5) {
            this.radius += (this.targetRadius - this.radius) * 4 * dt;
        } else {
            this.radius = this.targetRadius;
        }
    }

    getSegmentWorldAngles(index) {
        const seg = this.segments[index];
        return {
            start: SC.normalizeAngle(seg.localStart + this.rotationOffset),
            end: SC.normalizeAngle(seg.localStart + seg.arcLength + this.rotationOffset)
        };
    }

    aliveCount() {
        let c = 0;
        for (const s of this.segments) if (s.health > 0) c++;
        return c;
    }

    isFullyDestroyed() {
        return this.aliveCount() === 0;
    }

    reset() {
        for (const s of this.segments) s.reset();
    }

    draw(renderer, cx, cy) {
        for (let i = 0; i < this.segments.length; i++) {
            const seg = this.segments[i];
            if (seg.health <= 0) continue;
            const { start, end } = this.getSegmentWorldAngles(i);
            const color = seg.health === 2 ? this.color : this.dimColor;
            const width = seg.health === 2 ? SC.CONST.RING_THICKNESS : SC.CONST.RING_THICKNESS * 0.6;
            const glow = seg.health === 2 ? 12 : 6;
            renderer.drawArc(cx, cy, this.radius, start, end, color, width, glow);
        }
    }
};

SC.RingSystem = class RingSystem {
    constructor(cx, cy) {
        this.cx = cx;
        this.cy = cy;
        this.rings = []; // [outer, middle, inner]
        this.initRings(1);
    }

    initRings(level) {
        const C = SC.CONST;
        const speedMult = 1 + C.RING_SPEED_INCREMENT * (level - 1);
        const baseSpeed = C.RING_BASE_SPEED * speedMult;

        this.rings = [
            new SC.Ring(C.RING_OUTER_RADIUS, baseSpeed, C.COLOR_OUTER_RING, C.COLOR_OUTER_RING_DIM),
            new SC.Ring(C.RING_MIDDLE_RADIUS, -baseSpeed * 0.8, C.COLOR_MIDDLE_RING, C.COLOR_MIDDLE_RING_DIM),
            new SC.Ring(C.RING_INNER_RADIUS, baseSpeed * 0.6, C.COLOR_INNER_RING, C.COLOR_INNER_RING_DIM),
        ];
    }

    initRingsAnimated(level) {
        const C = SC.CONST;
        const speedMult = 1 + C.RING_SPEED_INCREMENT * (level - 1);
        const baseSpeed = C.RING_BASE_SPEED * speedMult;

        // Rings start at radius 0 and grow outward to their targets
        this.rings = [
            new SC.Ring(0, baseSpeed, C.COLOR_OUTER_RING, C.COLOR_OUTER_RING_DIM),
            new SC.Ring(0, -baseSpeed * 0.8, C.COLOR_MIDDLE_RING, C.COLOR_MIDDLE_RING_DIM),
            new SC.Ring(0, baseSpeed * 0.6, C.COLOR_INNER_RING, C.COLOR_INNER_RING_DIM),
        ];
        this.rings[0].targetRadius = C.RING_OUTER_RADIUS;
        this.rings[1].targetRadius = C.RING_MIDDLE_RADIUS;
        this.rings[2].targetRadius = C.RING_INNER_RADIUS;
    }

    setCenter(cx, cy) {
        this.cx = cx;
        this.cy = cy;
    }

    update(dt) {
        for (const ring of this.rings) ring.update(dt);
    }

    checkExpansion() {
        const outer = this.rings[0];
        if (!outer.isFullyDestroyed()) return false;

        const C = SC.CONST;
        // Middle becomes outer
        this.rings[0] = this.rings[1];
        this.rings[0].targetRadius = C.RING_OUTER_RADIUS;
        this.rings[0].color = C.COLOR_OUTER_RING;
        this.rings[0].dimColor = C.COLOR_OUTER_RING_DIM;

        // Inner becomes middle
        this.rings[1] = this.rings[2];
        this.rings[1].targetRadius = C.RING_MIDDLE_RADIUS;
        this.rings[1].color = C.COLOR_MIDDLE_RING;
        this.rings[1].dimColor = C.COLOR_MIDDLE_RING_DIM;

        // New inner ring
        const speed = -this.rings[1].rotationSpeed * 0.75;
        const newRing = new SC.Ring(20, speed, C.COLOR_INNER_RING, C.COLOR_INNER_RING_DIM);
        newRing.targetRadius = C.RING_INNER_RADIUS;
        this.rings[2] = newRing;

        return true;
    }

    isAngleBlocked(ringIndex, theta) {
        const ring = this.rings[ringIndex];
        for (let i = 0; i < ring.segments.length; i++) {
            if (ring.segments[i].health <= 0) continue;
            const { start, end } = ring.getSegmentWorldAngles(i);
            if (SC.angleInArc(theta, start, end)) return true;
        }
        return false;
    }

    hasLineOfSight(targetPos) {
        const angle = Math.atan2(targetPos.y - this.cy, targetPos.x - this.cx);
        for (let r = 0; r < 3; r++) {
            if (this.isAngleBlocked(r, angle)) return false;
        }
        return true;
    }

    // Predict whether cannon bullet will pass through all rings unobstructed,
    // accounting for ring rotation during bullet travel time.
    hasPredictedLineOfSight(angle, bulletSpeed) {
        const C = SC.CONST;
        bulletSpeed = bulletSpeed || C.CANNON_BULLET_SPEED;
        for (let r = 2; r >= 0; r--) { // inner to outer
            const ring = this.rings[r];
            // Skip rings too small to block (e.g. during growth animation)
            if (ring.radius < C.CANNON_RADIUS + C.CANNON_BULLET_RADIUS) continue;
            // Time for bullet to travel from cannon edge to this ring
            const travelTime = (ring.radius - C.CANNON_RADIUS) / bulletSpeed;
            // Where will this ring be rotated to when the bullet arrives?
            const futureOffset = ring.rotationOffset + ring.rotationSpeed * (SC.enemySpeedMult || 1) * travelTime;
            // Angular margin to account for bullet radius
            const margin = (C.CANNON_BULLET_RADIUS + 2) / ring.radius;

            for (let i = 0; i < ring.segments.length; i++) {
                const seg = ring.segments[i];
                if (seg.health <= 0) continue;
                // Expand segment arc by bullet margin so cannon doesn't fire too close to edges
                const start = SC.normalizeAngle(seg.localStart + futureOffset - margin);
                const end = SC.normalizeAngle(seg.localStart + seg.arcLength + futureOffset + margin);
                if (SC.angleInArc(angle, start, end)) return false;
            }
        }
        return true;
    }

    handleBulletCollision(bullet) {
        const dx = bullet.pos.x - this.cx;
        const dy = bullet.pos.y - this.cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        const C = SC.CONST;
        const threshold = C.RING_THICKNESS / 2 + C.BULLET_RADIUS + 4;

        for (let r = 0; r < 3; r++) {
            const ring = this.rings[r];
            if (Math.abs(dist - ring.radius) > threshold) continue;

            for (let i = 0; i < ring.segments.length; i++) {
                const seg = ring.segments[i];
                if (seg.health <= 0) continue;
                const { start, end } = ring.getSegmentWorldAngles(i);
                if (SC.angleInArc(angle, start, end)) {
                    seg.health--;
                    bullet.alive = false;
                    const points = [C.SCORE_OUTER, C.SCORE_MIDDLE, C.SCORE_INNER][r];
                    // Get segment midpoint for particles
                    const midAngle = SC.normalizeAngle(start + ((end - start + TWO_PI) % TWO_PI) / 2);
                    return {
                        hit: true,
                        ringIndex: r,
                        segmentIndex: i,
                        points: points,
                        x: this.cx + Math.cos(midAngle) * ring.radius,
                        y: this.cy + Math.sin(midAngle) * ring.radius,
                        color: ring.color
                    };
                }
            }
        }

        // Check cannon hit
        if (dist < C.CANNON_RADIUS + C.BULLET_RADIUS) {
            bullet.alive = false;
            return { hit: true, cannon: true, points: C.CANNON_DESTROY_BONUS };
        }

        return { hit: false };
    }

    // Check if a position collides with any ring segment. Returns { hit, ringIndex, normalX, normalY }
    checkShipCollision(pos, shipRadius) {
        const dx = pos.x - this.cx;
        const dy = pos.y - this.cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        const C = SC.CONST;
        const threshold = C.RING_THICKNESS / 2 + shipRadius;

        for (let r = 0; r < 3; r++) {
            const ring = this.rings[r];
            if (Math.abs(dist - ring.radius) > threshold) continue;

            for (let i = 0; i < ring.segments.length; i++) {
                const seg = ring.segments[i];
                if (seg.health <= 0) continue;
                const { start, end } = ring.getSegmentWorldAngles(i);
                if (SC.angleInArc(angle, start, end)) {
                    // Normal points radially outward from center
                    const nx = dx / dist;
                    const ny = dy / dist;
                    return { hit: true, ringIndex: r, normalX: nx, normalY: ny, radius: ring.radius };
                }
            }
        }
        return { hit: false };
    }

    // Check cannon bullet vs ring segments (blocks bullet, no damage to ring)
    checkCannonBulletCollision(bullet) {
        const dx = bullet.pos.x - this.cx;
        const dy = bullet.pos.y - this.cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        const C = SC.CONST;
        const threshold = C.RING_THICKNESS / 2 + C.CANNON_BULLET_RADIUS + 2;

        for (let r = 2; r >= 0; r--) { // inner to outer (bullet travels outward)
            const ring = this.rings[r];
            if (Math.abs(dist - ring.radius) > threshold) continue;

            for (let i = 0; i < ring.segments.length; i++) {
                const seg = ring.segments[i];
                if (seg.health <= 0) continue;
                const { start, end } = ring.getSegmentWorldAngles(i);
                if (SC.angleInArc(angle, start, end)) {
                    return true; // blocked
                }
            }
        }
        return false;
    }

    draw(renderer) {
        for (let r = 2; r >= 0; r--) {
            this.rings[r].draw(renderer, this.cx, this.cy);
        }
    }
};
