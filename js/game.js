window.SC = window.SC || {};

SC.Game = class Game {
    constructor(canvas) {
        this.renderer = new SC.Renderer(canvas);
        this.input = new SC.Input();
        this.touchControls = new SC.TouchControls(this.input);
        this.particles = new SC.ParticleSystem();
        this.hud = new SC.HUD();
        this.audio = new SC.Audio();
        this.menu = new SC.Menu();

        this.state = 'title'; // title, playing, paused, gameover, levelTransition
        this.score = 0;
        this.lives = 0;
        this.level = 0;
        this.highScore = parseInt(localStorage.getItem('starcitadel_high') || '0');
        this.time = 0;
        this.levelTransitionTimer = 0;

        this.player = null;
        this.bullets = [];
        this.cannonBullets = [];
        this.ringSystem = null;
        this.cannon = null;
        this.mines = [];
        this.mineRespawnTimers = [];

        this._bounceCooldown = 0;

        this.particles.initStars(this.renderer.w, this.renderer.h);
    }

    startGame() {
        this.score = 0;
        this.lives = SC.CONST.STARTING_LIVES;
        this.level = 0;
        this.state = 'playing';
        this.debris = [];
        this.audio.playGameStart();
        // Clear input so the Space/fire key that started the game doesn't auto-fire
        this.input.keys = {};
        this.input.prev = {};
        this.startLevel();
    }

    startLevel() {
        this.level++;
        this.audio.startHum();
        const r = this.renderer;
        const cx = r.cx;
        const cy = r.cy;

        this.ringSystem = new SC.RingSystem(cx, cy);
        this.ringSystem.initRings(this.level);

        this.cannon = new SC.Cannon(cx, cy);
        this.cannon.setLevel(this.level);

        // Spawn player far from center
        const spawnAngle = Math.random() * Math.PI * 2;
        const spawnDist = Math.min(r.w, r.h) * 0.4;
        this.player = new SC.Player(
            cx + Math.cos(spawnAngle) * spawnDist,
            cy + Math.sin(spawnAngle) * spawnDist
        );
        this.player.invulnTimer = SC.CONST.PLAYER_INVULN_TIME;

        this.bullets = [];
        this.cannonBullets = [];
        this.mines = [];
        this.mineRespawnTimers = [];

        // Spawn initial mines: one per ring, extras on outer
        const mineCount = this.getMineCount();
        for (let i = 0; i < mineCount; i++) {
            // First 3: inner(2), middle(1), outer(0); extras: outer(0)
            const ringIdx = i < 3 ? (2 - i) : 0;
            this.mineRespawnTimers.push({ timer: 1 + i * 0.8, ringIndex: ringIdx });
        }
    }

    startNextLevel() {
        this.level++;
        this.audio.startHum();
        const cx = this.renderer.cx;
        const cy = this.renderer.cy;

        // Create ring system with rings growing from center
        this.ringSystem = new SC.RingSystem(cx, cy);
        this.ringSystem.initRingsAnimated(this.level);

        // New cannon with extended grace period while rings grow
        this.cannon = new SC.Cannon(cx, cy);
        this.cannon.setLevel(this.level);
        this.cannon.fireTimer = this.cannon.fireCooldownTime * 3;

        // Keep player where they are — no teleport
        // Keep existing bullets and cannon bullets

        // Clear old mine respawn timers, schedule new mines one per ring, extras outer
        this.mineRespawnTimers = [];
        const currentMines = this.mines.length;
        const needed = Math.max(0, this.getMineCount() - currentMines);
        for (let i = 0; i < needed; i++) {
            const ringIdx = i < 3 ? (2 - i) : 0;
            this.mineRespawnTimers.push({ timer: 2 + i * 0.8, ringIndex: ringIdx });
        }
    }

    getMineSpeed() {
        return Math.min(SC.CONST.MINE_SPEED_MAX,
            SC.CONST.MINE_SPEED_BASE + SC.CONST.MINE_SPEED_INCREMENT * (this.level - 1));
    }

    getMineCount() {
        const C = SC.CONST;
        return Math.min(C.MINE_COUNT_MAX,
            C.MINE_COUNT + Math.floor((this.level - 1) / C.MINE_COUNT_LEVEL_INTERVAL));
    }

    addScore(points) {
        const oldScore = this.score;
        this.score += points;
        const threshold = SC.CONST.EXTRA_LIFE_SCORE;
        const oldMilestone = Math.floor(oldScore / threshold);
        const newMilestone = Math.floor(this.score / threshold);
        if (newMilestone > oldMilestone) {
            this.lives++;
            this.audio.playExtraLife();
        }
    }

    pause() {
        if (this.state !== 'playing') return;
        this.state = 'paused';
        this._pausedFrom = 'playing';
        this.audio.stopThrust();
        this.audio.stopHum();
        this._wasThrustOn = false;
        if (this.touchControls) this.touchControls.hide();
        this.menu.show();
    }

    resume() {
        if (this.state !== 'paused') return;
        const returnTo = this._pausedFrom || 'playing';
        this.state = returnTo;
        this._pausedFrom = null;
        this.menu.hide();
        if (returnTo === 'playing') {
            if (this.touchControls) this.touchControls.show();
            this.audio.startHum();
        }
        // Clear input state so held keys from menu don't carry over
        this.input.keys = {};
        this.input.prev = {};
    }

    update(dt) {
        this.time += dt;

        if (this.state === 'title') {
            if (this.input.justPressed(SC.keyBindings.fire.code) || this.input.justPressed('Space')) {
                this.startGame();
            } else if (this.input.justPressed(SC.keyBindings.pause.code)) {
                this.menu.show();
                this.state = 'paused';
                this._pausedFrom = 'title';
            }
            this.input.update();
            return;
        }

        if (this.state === 'gameover') {
            if (this.input.justPressed(SC.keyBindings.fire.code) || this.input.justPressed('Space')) {
                this.state = 'title';
                this.audio.stopHum();
            }

            // Keep the game world alive — rings spin, cannon tracks, mines roam
            const r = this.renderer;
            const w = r.w, h = r.h;
            if (this.ringSystem) {
                this.ringSystem.setCenter(r.cx, r.cy);
                this.ringSystem.update(dt);
            }
            if (this.cannon && this.cannon.alive) {
                // Cannon keeps tracking last known player position
                this.cannon.update(dt, this.player.pos, this.ringSystem);
            }
            for (const m of this.mines) {
                if (m.alive) m.update(dt, this.player.pos, w, h, this.ringSystem);
            }
            // Cannon bullets keep flying
            for (const cb of this.cannonBullets) cb.update(dt, w, h);
            this.cannonBullets = this.cannonBullets.filter(cb => cb.alive);
            // Cannon can still fire during game over
            if (this.cannon && this.cannon.alive) {
                const cb = this.cannon.tryFire(this.ringSystem, this.player.pos);
                if (cb) {
                    this.cannonBullets.push(cb);
                    this.audio.playCannonFire();
                }
            }
            // Cannon bullets blocked by rings
            for (const cb of this.cannonBullets) {
                if (!cb.alive) continue;
                if (this.ringSystem.checkCannonBulletCollision(cb)) {
                    cb.alive = false;
                }
            }
            this.particles.update(dt);
            this.input.update();
            return;
        }

        if (this.state === 'paused') {
            if (this.input.pause) {
                this.resume();
            }
            this.input.update();
            return;
        }

        if (this.state === 'levelTransition') {
            this.levelTransitionTimer -= dt;

            // Check if implosion completed — trigger explosion
            if (this._imploding && this.ringSystem.isCollapsed()) {
                this._triggerExplosion();
            }

            // Update debris
            if (this.debris && this.debris.length > 0) {
                for (const d of this.debris) d.update(dt);
                this.debris = this.debris.filter(d => d.alive);

                // Debris vs player (bounce, no damage)
                if (this.player.alive) {
                    const playerR = SC.CONST.PLAYER_SIZE * 0.5;
                    for (const d of this.debris) {
                        if (!d.alive) continue;
                        const dist = this.player.pos.distTo(d.pos);
                        if (dist < playerR + d.radius) {
                            // Push player away from debris
                            const pushDir = this.player.pos.sub(d.pos).normalize();
                            this.player.vel = pushDir.scale(200);
                            this.player.pos = d.pos.add(pushDir.scale(playerR + d.radius + 2));
                        }
                    }
                }
            }

            if (this.levelTransitionTimer <= 0) {
                this.state = 'playing';
                this.debris = [];
                this.startNextLevel();
                this.input.update();
                return;
            }
            // Fall through to run full game logic during transition
        }

        // --- Playing or levelTransition state ---

        // Check pause (only when playing, not during transition)
        if (this.state === 'playing' && this.input.pause) {
            this.pause();
            this.input.update();
            return;
        }

        const r = this.renderer;
        const w = r.w, h = r.h;

        // Update center position (in case of resize)
        if (this.ringSystem) {
            this.ringSystem.setCenter(r.cx, r.cy);
            this.cannon.pos = new SC.Vec2(r.cx, r.cy);
        }

        // Player
        this.player.update(dt, this.input, w, h);

        // Thrust audio
        if (this.player.alive && this.player.thrustOn && !this._wasThrustOn) {
            this.audio.startThrust();
        } else if ((!this.player.alive || !this.player.thrustOn) && this._wasThrustOn) {
            this.audio.stopThrust();
        }
        this._wasThrustOn = this.player.alive && this.player.thrustOn;

        // Fire
        if (this.input.fire && this.player.alive) {
            const b = this.player.fire();
            if (b) {
                this.bullets.push(b);
                this.audio.playFire();
            }
        }

        // Bullets
        for (const b of this.bullets) b.update(dt, w, h);
        this.bullets = this.bullets.filter(b => b.alive);

        // Cannon bullets
        for (const b of this.cannonBullets) b.update(dt, w, h);
        this.cannonBullets = this.cannonBullets.filter(b => b.alive);

        // Rings
        this.ringSystem.update(dt);

        // Cannon
        if (this.cannon.alive && this.player.alive) {
            this.cannon.update(dt, this.player.pos, this.ringSystem);
            const cb = this.cannon.tryFire(this.ringSystem, this.player.pos);
            if (cb) {
                this.cannonBullets.push(cb);
                this.audio.playCannonFire();
            }
        }

        // Mines
        for (const m of this.mines) {
            if (m.alive) m.update(dt, this.player.pos, w, h, this.ringSystem);
        }
        this.mines = this.mines.filter(m => m.alive);

        // Mine respawn
        for (let i = 0; i < this.mineRespawnTimers.length; i++) {
            this.mineRespawnTimers[i].timer -= dt;
            if (this.mineRespawnTimers[i].timer <= 0) {
                const ri = this.mineRespawnTimers[i].ringIndex;
                this.mines.push(new SC.Mine(r.cx, r.cy, this.getMineSpeed(), this.ringSystem, ri));
                this.mineRespawnTimers.splice(i, 1);
                i--;
            }
        }

        // Particles
        this.particles.update(dt);

        // Collisions
        this.handleCollisions(dt);

        this.input.update();
    }

    handleCollisions(dt) {
        const C = SC.CONST;

        // Player bullets vs ring segments
        for (const bullet of this.bullets) {
            if (!bullet.alive) continue;
            const result = this.ringSystem.handleBulletCollision(bullet);
            if (result.hit) {
                if (result.cannon && this.cannon.alive) {
                    this.cannonDestroyed();
                } else if (!result.cannon) {
                    this.addScore(result.points);
                    this.particles.emit(result.x, result.y, 8, result.color, 80, 0.5, 2);
                    this.audio.playRingHit(result.ringIndex);
                    // Check expansion after destroying a segment
                    if (this.ringSystem.checkExpansion()) {
                        this.particles.emitRing(this.renderer.cx, this.renderer.cy, 24, C.COLOR_OUTER_RING, 60, 0.6);
                        this.audio.playExpansion();
                    }
                }
            }
        }

        // Cannon bullets vs ring segments (blocked, no damage) — always checked
        for (const cb of this.cannonBullets) {
            if (!cb.alive) continue;
            if (this.ringSystem.checkCannonBulletCollision(cb)) {
                cb.alive = false;
                this.particles.emit(cb.pos.x, cb.pos.y, 4, '#ff4444', 40, 0.3, 1);
            }
        }

        if (!this.player.alive || this.player.invulnTimer > 0) return;

        const playerPos = this.player.pos;
        const playerR = C.PLAYER_SIZE * 0.5;

        // Mines vs player
        for (const mine of this.mines) {
            if (!mine.alive || mine.fadeIn > 0) continue;
            if (playerPos.distTo(mine.pos) < playerR + C.MINE_RADIUS) {
                this.playerDeath();
                return;
            }
        }

        // Cannon bullets vs player
        for (const cb of this.cannonBullets) {
            if (!cb.alive) continue;
            if (playerPos.distTo(cb.pos) < playerR + C.CANNON_BULLET_RADIUS) {
                this.playerDeath();
                return;
            }
        }

        // Ship vs ring segments (bounce off)
        if (this._bounceCooldown > 0) this._bounceCooldown -= dt;
        const shipCollision = this.ringSystem.checkShipCollision(playerPos, playerR);
        if (shipCollision.hit) {
            // Push player outward along normal
            const bounceForce = 180;
            this.player.vel = new SC.Vec2(
                shipCollision.normalX * bounceForce,
                shipCollision.normalY * bounceForce
            );
            // Nudge position outside the ring to prevent sticking
            const pushDist = shipCollision.radius + playerR + 2;
            this.player.pos = new SC.Vec2(
                this.ringSystem.cx + shipCollision.normalX * pushDist,
                this.ringSystem.cy + shipCollision.normalY * pushDist
            );
            if (this._bounceCooldown <= 0) {
                this.audio.playRingBounce();
                this.particles.emit(playerPos.x, playerPos.y, 6, '#00ffff', 60, 0.3, 1.5);
                this._bounceCooldown = 0.15;
            }
        }

        // Player bullets vs mines
        for (const bullet of this.bullets) {
            if (!bullet.alive) continue;
            for (const mine of this.mines) {
                if (!mine.alive || mine.fadeIn > 0) continue;
                if (bullet.pos.distTo(mine.pos) < C.BULLET_RADIUS + C.MINE_RADIUS + 2) {
                    bullet.alive = false;
                    mine.alive = false;
                    this.particles.emit(mine.pos.x, mine.pos.y, 6, '#ffffff', 60, 0.4, 1.5);
                    this.audio.playMineDestroyed();
                    // Schedule respawn on inner ring
                    this.mineRespawnTimers.push({ timer: SC.CONST.MINE_SPAWN_DELAY });
                    break;
                }
            }
        }
    }

    playerDeath() {
        this.particles.emit(this.player.pos.x, this.player.pos.y, 40, SC.CONST.COLOR_SHIP, 150, 1.0, 2.5);
        this.audio.stopThrust();
        this.audio.playPlayerDeath();
        this._wasThrustOn = false;
        this.player.alive = false;
        this.lives--;

        if (this.lives <= 0) {
            this.state = 'gameover';
            // Keep hum going — castle stays alive during game over
            if (this.score > this.highScore) {
                this.highScore = this.score;
                localStorage.setItem('starcitadel_high', this.highScore.toString());
            }
        } else {
            // Respawn after delay
            setTimeout(() => {
                if (this.state !== 'playing' && this.state !== 'levelTransition') return;
                const r = this.renderer;
                const spawnAngle = Math.random() * Math.PI * 2;
                const spawnDist = Math.min(r.w, r.h) * 0.4;
                this.player.reset(
                    r.cx + Math.cos(spawnAngle) * spawnDist,
                    r.cy + Math.sin(spawnAngle) * spawnDist
                );
            }, 1500);
        }
    }

    cannonDestroyed() {
        const cx = this.renderer.cx;
        const cy = this.renderer.cy;

        // Small initial burst at cannon
        this.particles.emit(cx, cy, 20, '#ffff00', 100, 0.5, 2);
        this.particles.emit(cx, cy, 15, '#ffffff', 80, 0.4, 1.5);

        this.cannon.alive = false;
        this.addScore(SC.CONST.CANNON_DESTROY_BONUS);
        this.audio.stopHum();

        // Start ring implosion — rings collapse toward center
        this.ringSystem.startCollapse();
        this._imploding = true;
        this._implodeExploded = false;
        this.debris = this.debris || [];

        // Don't clear mines/bullets — they stay active during transition

        // Level transition — game keeps running (longer to fit implosion + explosion)
        this.state = 'levelTransition';
        this.levelTransitionTimer = 3.0;
    }

    _triggerExplosion() {
        const cx = this.renderer.cx;
        const cy = this.renderer.cy;

        // Extract surviving segments as debris
        const debrisData = this.ringSystem.getDebrisData();
        for (const d of debrisData) {
            const outAngle = d.angle + (Math.random() - 0.5) * 0.5;
            const speed = 150 + Math.random() * 250;
            this.debris.push(new SC.Debris(
                d.x, d.y,
                Math.cos(outAngle) * speed,
                Math.sin(outAngle) * speed,
                d.lineLength,
                d.color
            ));
        }

        // Destroy all ring segments so they stop drawing
        for (const ring of this.ringSystem.rings) {
            for (const seg of ring.segments) seg.health = 0;
        }

        // Big explosion particles from center
        this.particles.emit(cx, cy, 150, '#ffff00', 350, 2.0, 4);
        this.particles.emit(cx, cy, 100, '#ff8800', 300, 1.8, 3.5);
        this.particles.emit(cx, cy, 80, '#ffffff', 400, 1.5, 3);
        this.particles.emit(cx, cy, 60, '#ff4400', 250, 1.6, 2.5);
        this.particles.emitRing(cx, cy, 60, '#ff4400', 320, 1.2);
        this.particles.emitRing(cx, cy, 40, '#ffff00', 200, 0.8);

        this.audio.playCannonDestroyed();
        this.audio.playLevelComplete();

        this._imploding = false;
        this._implodeExploded = true;
    }


    draw() {
        const r = this.renderer;
        r.clear();

        // Stars always drawn
        this.particles.drawStars(r, this.time);

        if (this.state === 'title') {
            // Draw decorative rings on title
            this.drawTitleRings();
            this.hud.drawTitle(r, this.highScore);
            return;
        }

        if (this.state === 'gameover') {
            // Draw the full game world (no player)
            if (this.ringSystem) this.ringSystem.draw(r);
            if (this.cannon && this.cannon.alive) this.cannon.draw(r);
            for (const cb of this.cannonBullets) cb.draw(r);
            for (const m of this.mines) m.draw(r);
            this.particles.drawParticles(r);
            this.hud.drawGameOver(r, this.score, this.highScore);
            return;
        }

        // Playing, paused, or level transition — draw the game world
        if (this.ringSystem) this.ringSystem.draw(r);
        if (this.cannon && this.cannon.alive) this.cannon.draw(r);

        for (const b of this.bullets) b.draw(r);
        for (const cb of this.cannonBullets) cb.draw(r);
        for (const m of this.mines) m.draw(r);

        if (this.player) this.player.draw(r, this.time);

        // Debris (flying ring segments after implosion)
        if (this.debris) {
            for (const d of this.debris) d.draw(r);
        }

        this.particles.drawParticles(r);

        if (this.state === 'playing' || this.state === 'paused' || this.state === 'levelTransition') {
            this.hud.draw(r, this.score, this.lives, this.level, this.highScore);
        }

        if (this.state === 'levelTransition') {
            // Show "LEVEL X" after explosion, not during implosion
            if (this._implodeExploded) {
                r.drawText('LEVEL ' + (this.level + 1), r.cx, r.cy, 36, '#ffffff', 'center', 12);
            }
        }
    }

    drawTitleRings() {
        const r = this.renderer;
        const cx = r.cx;
        const cy = r.cy;
        const t = this.time;

        // Decorative rotating rings (dodecagons)
        for (let ring = 0; ring < 3; ring++) {
            const radius = [160, 120, 80][ring];
            const color = [SC.CONST.COLOR_OUTER_RING, SC.CONST.COLOR_MIDDLE_RING, SC.CONST.COLOR_INNER_RING][ring];
            const speed = [1, -0.8, 0.6][ring];
            const n = 12;
            const segAngle = Math.PI * 2 / n;

            for (let i = 0; i < n; i++) {
                const a1 = i * segAngle + t * speed;
                const a2 = (i + 1) * segAngle + t * speed;
                r.drawLine(
                    cx + Math.cos(a1) * radius, cy + Math.sin(a1) * radius,
                    cx + Math.cos(a2) * radius, cy + Math.sin(a2) * radius,
                    color, 3, 8
                );
            }
        }

        // Cannon — rotating diamond
        const cannonAngle = t * 0.5;
        const cannonR = SC.CONST.CANNON_INNER_RADIUS;
        const cDir = SC.Vec2.fromAngle(cannonAngle);
        const cPerp = SC.Vec2.fromAngle(cannonAngle + Math.PI / 2);
        r.drawPolygon([
            { x: cx + cDir.x * cannonR * 1.8,  y: cy + cDir.y * cannonR * 1.8  },
            { x: cx + cPerp.x * cannonR * 1.0, y: cy + cPerp.y * cannonR * 1.0 },
            { x: cx - cDir.x * cannonR * 1.2,  y: cy - cDir.y * cannonR * 1.2  },
            { x: cx - cPerp.x * cannonR * 1.0, y: cy - cPerp.y * cannonR * 1.0 },
        ], SC.CONST.COLOR_CANNON, 2, 12);

        // Crossbar detail near front
        const barDist = cannonR * 0.7;
        const barHalf = cannonR * 0.45;
        const bx = cx + cDir.x * barDist;
        const by = cy + cDir.y * barDist;
        r.drawLine(
            bx + cPerp.x * barHalf, by + cPerp.y * barHalf,
            bx - cPerp.x * barHalf, by - cPerp.y * barHalf,
            SC.CONST.COLOR_CANNON, 1.5, 8
        );
    }
};
