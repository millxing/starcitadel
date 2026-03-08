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
        this.audio.playGameStart();
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

        // Spawn initial mines with staggered delays
        const mineCount = this.getMineCount();
        for (let i = 0; i < mineCount; i++) {
            this.mineRespawnTimers.push(1 + i * 0.8);
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

        // Clear old mine respawn timers, schedule new mines
        this.mineRespawnTimers = [];
        const currentMines = this.mines.length;
        const needed = Math.max(0, this.getMineCount() - currentMines);
        for (let i = 0; i < needed; i++) {
            this.mineRespawnTimers.push(2 + i * 0.8);
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
        this.audio.stopThrust();
        this.audio.stopHum();
        this._wasThrustOn = false;
        if (this.touchControls) this.touchControls.hide();
        this.menu.show();
    }

    resume() {
        if (this.state !== 'paused') return;
        this.state = 'playing';
        this.menu.hide();
        if (this.touchControls) this.touchControls.show();
        this.audio.startHum();
        // Clear input state so held keys from menu don't carry over
        this.input.keys = {};
        this.input.prev = {};
    }

    update(dt) {
        this.time += dt;

        if (this.state === 'title') {
            if (this.input.justPressed(SC.keyBindings.fire.code) || this.input.justPressed('Space')) {
                this.startGame();
            }
            this.input.update();
            return;
        }

        if (this.state === 'gameover') {
            if (this.input.justPressed(SC.keyBindings.fire.code) || this.input.justPressed('Space')) {
                this.state = 'title';
                this.audio.stopHum();
            }
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
            if (this.levelTransitionTimer <= 0) {
                this.state = 'playing';
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
            if (m.alive) m.update(dt, this.player.pos, w, h);
        }
        this.mines = this.mines.filter(m => m.alive);

        // Mine respawn
        for (let i = 0; i < this.mineRespawnTimers.length; i++) {
            this.mineRespawnTimers[i] -= dt;
            if (this.mineRespawnTimers[i] <= 0) {
                this.mines.push(new SC.Mine(r.cx, r.cy, this.getMineSpeed()));
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
            if (!mine.alive || mine.spawnTimer > 0) continue;
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
                if (!mine.alive || mine.spawnTimer > 0) continue;
                if (bullet.pos.distTo(mine.pos) < C.BULLET_RADIUS + C.MINE_RADIUS + 2) {
                    bullet.alive = false;
                    mine.alive = false;
                    this.particles.emit(mine.pos.x, mine.pos.y, 6, '#ffffff', 60, 0.4, 1.5);
                    this.audio.playMineDestroyed();
                    // Schedule respawn
                    this.mineRespawnTimers.push(SC.CONST.MINE_SPAWN_DELAY);
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
            this.audio.stopHum();
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

        // Big explosion
        this.particles.emit(cx, cy, 60, '#ffff00', 200, 1.2, 3);
        this.particles.emit(cx, cy, 40, '#ff8800', 150, 1.0, 2);
        this.particles.emit(cx, cy, 30, '#ffffff', 250, 0.8, 2);
        this.particles.emitRing(cx, cy, 32, '#ff4400', 180, 0.8);

        this.cannon.alive = false;
        this.addScore(SC.CONST.CANNON_DESTROY_BONUS);
        this.audio.playCannonDestroyed();
        this.audio.stopHum();

        // Don't clear mines/bullets — they stay active during transition
        // so the player can still be hit by a last cannon shot or mine

        // Level transition — game keeps running
        this.state = 'levelTransition';
        this.levelTransitionTimer = 2.0;
        this.audio.playLevelComplete();
    }


    draw() {
        const r = this.renderer;
        r.clear();

        // Stars always drawn
        this.particles.drawStars(r, this.time);

        if (this.state === 'title') {
            // Draw decorative rings on title
            this.drawTitleRings();
            this.hud.drawTitle(r);
            return;
        }

        if (this.state === 'gameover') {
            this.hud.drawGameOver(r, this.score, this.highScore);
            this.particles.drawParticles(r);
            return;
        }

        // Playing, paused, or level transition — draw the game world
        if (this.ringSystem) this.ringSystem.draw(r);
        if (this.cannon && this.cannon.alive) this.cannon.draw(r);

        for (const b of this.bullets) b.draw(r);
        for (const cb of this.cannonBullets) cb.draw(r);
        for (const m of this.mines) m.draw(r);

        if (this.player) this.player.draw(r, this.time);

        this.particles.drawParticles(r);

        if (this.state === 'playing' || this.state === 'paused' || this.state === 'levelTransition') {
            this.hud.draw(r, this.score, this.lives, this.level);
        }

        if (this.state === 'levelTransition') {
            r.drawText('LEVEL ' + (this.level + 1), r.cx, r.cy, 36, '#ffffff', 'center', 12);
        }
    }

    drawTitleRings() {
        const r = this.renderer;
        const cx = r.cx;
        const cy = r.cy;
        const t = this.time;

        // Decorative rotating rings
        for (let ring = 0; ring < 3; ring++) {
            const radius = [160, 120, 80][ring];
            const color = [SC.CONST.COLOR_OUTER_RING, SC.CONST.COLOR_MIDDLE_RING, SC.CONST.COLOR_INNER_RING][ring];
            const speed = [1, -0.8, 0.6][ring];
            const segAngle = Math.PI * 2 / 12;
            const gapRad = 3 * Math.PI / 180;

            for (let i = 0; i < 12; i++) {
                const start = i * segAngle + gapRad / 2 + t * speed;
                const end = start + segAngle - gapRad;
                r.drawArc(cx, cy, radius, start, end, color, 3, 10);
            }
        }

        // Cannon
        r.drawCircle(cx, cy, 18, SC.CONST.COLOR_CANNON, 2, 12);
        r.drawFilledCircle(cx, cy, 8, SC.CONST.COLOR_CANNON, 8);
    }
};
