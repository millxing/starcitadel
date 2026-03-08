window.SC = window.SC || {};

SC.Particle = class Particle {
    constructor(x, y, vx, vy, color, life, size) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.life = life;
        this.maxLife = life;
        this.size = size || 2;
        this.alive = true;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vx *= 0.98;
        this.vy *= 0.98;
        this.life -= dt;
        if (this.life <= 0) this.alive = false;
    }

    draw(renderer) {
        const alpha = Math.max(0, this.life / this.maxLife);
        const ctx = renderer.ctx;
        ctx.globalAlpha = alpha;
        renderer.drawFilledCircle(this.x, this.y, this.size * alpha, this.color, 6 * alpha);
        ctx.globalAlpha = 1;
    }
};

SC.ParticleSystem = class ParticleSystem {
    constructor() {
        this.particles = [];
        this.stars = [];
    }

    initStars(w, h) {
        this.stars = [];
        for (let i = 0; i < 120; i++) {
            this.stars.push({
                x: Math.random() * w,
                y: Math.random() * h,
                brightness: 0.2 + Math.random() * 0.5,
                phase: Math.random() * Math.PI * 2,
                size: 0.5 + Math.random() * 1.2
            });
        }
    }

    emit(x, y, count, color, speed, life, size) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = speed * (0.3 + Math.random() * 0.7);
            this.particles.push(new SC.Particle(
                x, y,
                Math.cos(angle) * spd,
                Math.sin(angle) * spd,
                color,
                life * (0.5 + Math.random() * 0.5),
                size || 2
            ));
        }
    }

    emitRing(x, y, count, color, radius, life) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const spd = radius / life;
            this.particles.push(new SC.Particle(
                x, y,
                Math.cos(angle) * spd,
                Math.sin(angle) * spd,
                color,
                life * (0.7 + Math.random() * 0.3),
                2
            ));
        }
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(dt);
            if (!this.particles[i].alive) {
                this.particles.splice(i, 1);
            }
        }
    }

    drawStars(renderer, time) {
        const ctx = renderer.ctx;
        for (const star of this.stars) {
            const flicker = 0.7 + 0.3 * Math.sin(time * 1.5 + star.phase);
            const alpha = star.brightness * flicker;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#aabbdd';
            ctx.fillRect(star.x, star.y, star.size, star.size);
        }
        ctx.globalAlpha = 1;
    }

    drawParticles(renderer) {
        for (const p of this.particles) {
            p.draw(renderer);
        }
    }
};
