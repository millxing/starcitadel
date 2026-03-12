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
        this.pulsars = [];
        this.clusters = [];
        this.shootingStars = [];
        this._shootingStarTimer = 0;
        this.nebulaCanvas = null;
        this._nebulaW = 0;
        this._nebulaH = 0;
    }

    initStars(w, h) {
        this.stars = [];
        this.pulsars = [];
        this.clusters = [];
        this.shootingStars = [];
        this._shootingStarTimer = 0;

        // Regular dim stars
        for (let i = 0; i < 160; i++) {
            this.stars.push({
                x: Math.random() * w,
                y: Math.random() * h,
                brightness: 0.4 + Math.random() * 0.4,
                phase: Math.random() * Math.PI * 2,
                size: 0.8 + Math.random() * 1.2,
                bright: false
            });
        }
        // Bright feature stars — larger, brighter, with glow
        for (let i = 0; i < 25; i++) {
            this.stars.push({
                x: Math.random() * w,
                y: Math.random() * h,
                brightness: 0.7 + Math.random() * 0.3,
                phase: Math.random() * Math.PI * 2,
                size: 1.5 + Math.random() * 1.0,
                bright: true
            });
        }

        // Pulsars — 2-3 stars that do sharp periodic flashes
        for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
            this.pulsars.push({
                x: Math.random() * w,
                y: Math.random() * h,
                period: 5 + Math.random() * 4,     // 5-9 second cycle
                phase: Math.random() * Math.PI * 2,
                color: ['#ffffff', '#aaccff', '#ffccaa'][Math.floor(Math.random() * 3)],
                size: 1.2 + Math.random() * 0.8,
            });
        }

        // Star clusters — 3-5 dense groups of tiny stars
        for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {
            const cx = Math.random() * w;
            const cy = Math.random() * h;
            const spread = 15 + Math.random() * 25;
            const count = 12 + Math.floor(Math.random() * 12);
            const clusterStars = [];
            for (let j = 0; j < count; j++) {
                // Gaussian-ish distribution via sum of randoms
                const dx = (Math.random() + Math.random() + Math.random() - 1.5) * spread;
                const dy = (Math.random() + Math.random() + Math.random() - 1.5) * spread;
                clusterStars.push({
                    x: cx + dx,
                    y: cy + dy,
                    size: 0.4 + Math.random() * 0.8,
                    brightness: 0.3 + Math.random() * 0.5,
                    phase: Math.random() * Math.PI * 2,
                });
            }
            this.clusters.push(clusterStars);
        }

        this._generateBackground(w, h);
    }

    // Pre-render static background layers (nebulae, galaxies, dust) to offscreen canvas
    _generateBackground(w, h) {
        this._nebulaW = w;
        this._nebulaH = h;
        const off = document.createElement('canvas');
        off.width = w;
        off.height = h;
        const ctx = off.getContext('2d');

        const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

        // Helper: draw an elliptical gradient blob
        const drawBlob = (cx, cy, rx, ry, angle, color, alpha, stops) => {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(angle);
            ctx.scale(1, ry / rx);
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
            if (stops) {
                for (const [pos, aMult] of stops) {
                    grad.addColorStop(pos, rgba(color, alpha * aMult));
                }
            } else {
                grad.addColorStop(0, rgba(color, alpha));
                grad.addColorStop(0.3, rgba(color, alpha * 0.7));
                grad.addColorStop(0.6, rgba(color, alpha * 0.3));
                grad.addColorStop(1, rgba(color, 0));
            }
            ctx.fillStyle = grad;
            ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
            ctx.restore();
        };

        // ========== DUST LANES ==========
        // Dark translucent bands that dim what's behind them
        if (SC.dustLanesEnabled) {
            const laneCount = 2 + Math.floor(Math.random() * 2);
            for (let i = 0; i < laneCount; i++) {
                ctx.save();
                const cx = Math.random() * w;
                const cy = Math.random() * h;
                const angle = Math.random() * Math.PI;
                const laneW = Math.min(w, h) * (0.4 + Math.random() * 0.5);
                const laneH = laneW * (0.04 + Math.random() * 0.06);
                ctx.translate(cx, cy);
                ctx.rotate(angle);
                // Main dark band
                const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, laneW * 0.5);
                grad.addColorStop(0, 'rgba(0, 0, 4, 0.12)');
                grad.addColorStop(0.5, 'rgba(0, 0, 4, 0.08)');
                grad.addColorStop(1, 'rgba(0, 0, 4, 0)');
                ctx.scale(1, laneH / (laneW * 0.5));
                ctx.fillStyle = grad;
                ctx.fillRect(-laneW * 0.5, -laneW * 0.5, laneW, laneW);
                ctx.restore();
                // Add a subtle brown/reddish edge tint
                drawBlob(cx, cy, laneW * 0.45, laneH * 1.5, angle,
                    [60, 30, 20], 0.02, null);
            }
        }

        // ========== NEBULAE ==========
        if (SC.nebulaeEnabled) {
            const palettes = [
                [[80, 60, 180], [120, 80, 220], [60, 100, 200], [150, 60, 180]],
                [[200, 80, 30], [180, 50, 50], [220, 120, 40], [160, 40, 60]],
                [[140, 130, 40], [80, 130, 60], [160, 140, 50], [100, 150, 80]],
                [[180, 40, 120], [200, 60, 100], [160, 50, 140], [220, 80, 130]],
                [[160, 30, 30], [180, 60, 20], [140, 40, 50], [200, 80, 30]],
                [[40, 140, 140], [180, 130, 50], [60, 160, 120], [80, 180, 160]],
                [[40, 160, 200], [120, 60, 180], [60, 120, 200], [80, 80, 220]],
                [[200, 70, 80], [180, 90, 60], [210, 100, 100], [230, 80, 70]],
                [[40, 80, 180], [50, 150, 160], [60, 100, 200], [30, 120, 180]],
            ];

            const count = 4 + Math.floor(Math.random() * 4);
            for (let i = 0; i < count; i++) {
                const palette = palettes[Math.floor(Math.random() * palettes.length)];
                const cx = Math.random() * w;
                const cy = Math.random() * h;
                const baseR = Math.min(w, h) * (0.18 + Math.random() * 0.22);
                const angle = Math.random() * Math.PI * 2;

                // Broad diffuse glow
                drawBlob(cx, cy, baseR * 1.4, baseR * (0.6 + Math.random() * 0.5),
                    angle, palette[0], 0.04 + Math.random() * 0.02,
                    [[0, 0.6], [0.25, 0.8], [0.5, 0.5], [0.8, 0.2], [1, 0]]);

                // Medium elliptical clouds
                const cloudCount = 4 + Math.floor(Math.random() * 4);
                for (let j = 0; j < cloudCount; j++) {
                    const color = palette[j % palette.length];
                    const dist = baseR * (0.1 + Math.random() * 0.6);
                    const a = angle + (Math.random() - 0.5) * 1.5;
                    drawBlob(cx + Math.cos(a) * dist, cy + Math.sin(a) * dist,
                        baseR * (0.25 + Math.random() * 0.4),
                        baseR * (0.25 + Math.random() * 0.4) * (0.3 + Math.random() * 0.5),
                        angle + (Math.random() - 0.5) * 0.8, color,
                        0.04 + Math.random() * 0.04, null);
                }

                // Wispy filaments
                const filCount = 3 + Math.floor(Math.random() * 4);
                for (let j = 0; j < filCount; j++) {
                    const color = palette[(j + 1) % palette.length];
                    const dist = baseR * (0.2 + Math.random() * 0.7);
                    const a = angle + (Math.random() - 0.5) * 2;
                    const rx = baseR * (0.3 + Math.random() * 0.5);
                    drawBlob(cx + Math.cos(a) * dist, cy + Math.sin(a) * dist,
                        rx, rx * (0.08 + Math.random() * 0.15),
                        a + (Math.random() - 0.5) * 0.6, color,
                        0.03 + Math.random() * 0.04,
                        [[0, 1], [0.2, 0.8], [0.5, 0.4], [0.8, 0.15], [1, 0]]);
                }

                // Bright knots
                const knotCount = 2 + Math.floor(Math.random() * 3);
                for (let j = 0; j < knotCount; j++) {
                    const color = palette[j % palette.length];
                    const bright = [Math.min(255, color[0] + 60), Math.min(255, color[1] + 60), Math.min(255, color[2] + 60)];
                    const dist = baseR * Math.random() * 0.4;
                    const a = Math.random() * Math.PI * 2;
                    const kr = baseR * (0.06 + Math.random() * 0.1);
                    drawBlob(cx + Math.cos(a) * dist, cy + Math.sin(a) * dist,
                        kr, kr * (0.6 + Math.random() * 0.4),
                        Math.random() * Math.PI, bright, 0.06 + Math.random() * 0.05,
                        [[0, 1], [0.3, 0.7], [0.6, 0.3], [1, 0]]);
                }

                // Micro-detail puffs
                const puffCount = 8 + Math.floor(Math.random() * 10);
                for (let j = 0; j < puffCount; j++) {
                    const color = palette[Math.floor(Math.random() * palette.length)];
                    const dist = baseR * (0.1 + Math.random() * 0.9);
                    const a = Math.random() * Math.PI * 2;
                    const pr = baseR * (0.04 + Math.random() * 0.08);
                    drawBlob(cx + Math.cos(a) * dist, cy + Math.sin(a) * dist,
                        pr, pr * (0.5 + Math.random() * 0.5),
                        Math.random() * Math.PI, color, 0.02 + Math.random() * 0.04, null);
                }
            }
        }

        // ========== DISTANT GALAXIES ==========
        if (SC.galaxiesEnabled) {
            const galCount = 2 + Math.floor(Math.random() * 2);
            for (let i = 0; i < galCount; i++) {
                const gx = Math.random() * w;
                const gy = Math.random() * h;
                const gAngle = Math.random() * Math.PI * 2;
                const gSize = 8 + Math.random() * 18;
                const tilt = 0.3 + Math.random() * 0.5; // edge-on to face-on
                const isSpiral = Math.random() > 0.3;
                const gColor = [
                    [200, 190, 160], // warm white
                    [160, 180, 220], // cool blue
                    [220, 200, 150], // golden
                ][Math.floor(Math.random() * 3)];

                if (isSpiral) {
                    // Draw spiral arms as arced blobs
                    const armCount = 2;
                    for (let arm = 0; arm < armCount; arm++) {
                        const armOffset = (arm / armCount) * Math.PI * 2;
                        for (let t = 0; t < 8; t++) {
                            const theta = armOffset + t * 0.4;
                            const r = gSize * (0.15 + t * 0.1);
                            const ax = gx + Math.cos(gAngle + theta) * r;
                            const ay = gy + Math.sin(gAngle + theta) * r * tilt;
                            const dotR = gSize * (0.12 - t * 0.008);
                            const alpha = 0.06 - t * 0.005;
                            if (alpha > 0 && dotR > 0) {
                                drawBlob(ax, ay, dotR, dotR * tilt, gAngle,
                                    gColor, alpha, null);
                            }
                        }
                    }
                }
                // Central bulge (both spiral and elliptical)
                drawBlob(gx, gy, gSize * 0.35, gSize * 0.35 * tilt, gAngle,
                    gColor, 0.1 + Math.random() * 0.04,
                    [[0, 1], [0.4, 0.6], [0.8, 0.2], [1, 0]]);
                // Faint outer halo
                drawBlob(gx, gy, gSize * 0.7, gSize * 0.7 * tilt, gAngle,
                    gColor, 0.03,
                    [[0, 0.5], [0.5, 0.3], [1, 0]]);
            }
        }

        this.nebulaCanvas = off;
    }

    regenerateBackground() {
        if (this._nebulaW > 0) this._generateBackground(this._nebulaW, this._nebulaH);
    }

    // Alias for backward compat with menu toggle
    regenerateNebulae() { this.regenerateBackground(); }

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

        // Shooting stars — spawn one every 8-18 seconds
        if (SC.shootingStarsEnabled && this._nebulaW > 0) {
            this._shootingStarTimer -= dt;
            if (this._shootingStarTimer <= 0) {
                this._shootingStarTimer = 8 + Math.random() * 10;
                const w = this._nebulaW;
                const h = this._nebulaH;
                // Random direction biased downward
                const angle = (0.3 + Math.random() * 0.8) * (Math.random() > 0.5 ? 1 : -1);
                const speed = 600 + Math.random() * 600;
                // Start from a random edge
                const startX = Math.random() * w;
                const startY = Math.random() * h * 0.3; // top third
                const life = 0.6 + Math.random() * 0.5;
                this.shootingStars.push({
                    x: startX, y: startY,
                    vx: Math.cos(angle) * speed,
                    vy: Math.abs(Math.sin(angle)) * speed, // always downward
                    life: life, maxLife: life,
                    trail: [],
                });
            }
        }

        // Update active shooting stars
        for (let i = this.shootingStars.length - 1; i >= 0; i--) {
            const ss = this.shootingStars[i];
            ss.trail.push({ x: ss.x, y: ss.y });
            if (ss.trail.length > 20) ss.trail.shift();
            ss.x += ss.vx * dt;
            ss.y += ss.vy * dt;
            ss.life -= dt;
            if (ss.life <= 0) this.shootingStars.splice(i, 1);
        }
    }

    drawStars(renderer, time) {
        const ctx = renderer.ctx;

        // Draw pre-rendered background (nebulae, galaxies, dust lanes)
        if (this.nebulaCanvas) {
            ctx.drawImage(this.nebulaCanvas, 0, 0);
        }

        // Star clusters
        if (SC.starClustersEnabled) {
            for (const cluster of this.clusters) {
                for (const s of cluster) {
                    const flicker = 0.7 + 0.3 * Math.sin(time * 2 + s.phase);
                    ctx.globalAlpha = s.brightness * flicker;
                    ctx.fillStyle = '#ccddff';
                    ctx.fillRect(s.x, s.y, s.size, s.size);
                }
            }
        }

        // Regular and bright stars
        for (const star of this.stars) {
            const flicker = 0.7 + 0.3 * Math.sin(time * 1.5 + star.phase);
            const alpha = star.brightness * flicker;

            if (star.bright) {
                const glow = star.size * 3;
                ctx.globalAlpha = alpha * 0.2;
                ctx.fillStyle = '#ccddff';
                ctx.beginPath();
                ctx.arc(star.x, star.y, glow, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = '#ddeeff';
                ctx.fillRect(star.x - star.size / 2, star.y - star.size / 2, star.size, star.size);
            } else {
                ctx.globalAlpha = alpha;
                ctx.fillStyle = '#bbccee';
                ctx.fillRect(star.x, star.y, star.size, star.size);
            }
        }

        // Pulsars — sharp periodic flash
        if (SC.pulsarsEnabled) {
            for (const p of this.pulsars) {
                const cycle = ((time + p.phase) % p.period) / p.period;
                // Sharp flash at cycle=0, quick falloff
                const flash = Math.max(0, 1 - cycle * 8); // bright for ~12% of cycle
                const baseAlpha = 0.3; // dim baseline
                const alpha = baseAlpha + flash * 0.7;
                const glowSize = p.size * (2 + flash * 8);

                // Glow halo during flash
                if (flash > 0.01) {
                    ctx.globalAlpha = flash * 0.3;
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
                    ctx.fill();
                }
                // Core
                ctx.globalAlpha = alpha;
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
            }
        }

        // Shooting stars
        if (SC.shootingStarsEnabled) {
            for (const ss of this.shootingStars) {
                const lifeRatio = ss.life / ss.maxLife;
                // Draw trail — line for smooth appearance
                if (ss.trail.length > 1) {
                    for (let i = 1; i < ss.trail.length; i++) {
                        const prev = ss.trail[i - 1];
                        const cur = ss.trail[i];
                        const t = i / ss.trail.length;
                        ctx.globalAlpha = t * 0.7 * lifeRatio;
                        ctx.strokeStyle = '#ffffff';
                        ctx.lineWidth = t * 2;
                        ctx.beginPath();
                        ctx.moveTo(prev.x, prev.y);
                        ctx.lineTo(cur.x, cur.y);
                        ctx.stroke();
                    }
                    // Line from last trail point to head
                    const last = ss.trail[ss.trail.length - 1];
                    ctx.globalAlpha = 0.8 * lifeRatio;
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(last.x, last.y);
                    ctx.lineTo(ss.x, ss.y);
                    ctx.stroke();
                }
                // Bright head
                ctx.globalAlpha = lifeRatio;
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(ss.x, ss.y, 2, 0, Math.PI * 2);
                ctx.fill();
                // Head glow
                ctx.globalAlpha = lifeRatio * 0.4;
                ctx.beginPath();
                ctx.arc(ss.x, ss.y, 6, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.globalAlpha = 1;
    }

    drawParticles(renderer) {
        for (const p of this.particles) {
            p.draw(renderer);
        }
    }
};
