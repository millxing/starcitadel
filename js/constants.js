window.SC = window.SC || {};

SC.CONST = {
    // Player
    PLAYER_ROTATE_SPEED: 3.5,
    PLAYER_THRUST: 320,
    PLAYER_DRAG: 0.008,
    PLAYER_MAX_SPEED: 350,
    PLAYER_SIZE: 14,
    PLAYER_FIRE_COOLDOWN: 0.2,
    PLAYER_INVULN_TIME: 2.5,
    STARTING_LIVES: 3,

    // Bullets
    BULLET_SPEED: 500,
    BULLET_LIFETIME: 1.4,
    BULLET_RADIUS: 2,

    // Rings
    RING_OUTER_RADIUS: 160,
    RING_MIDDLE_RADIUS: 120,
    RING_INNER_RADIUS: 80,
    RING_THICKNESS: 4,
    RING_SEGMENT_COUNT: 12,
    RING_GAP_DEGREES: 5,
    RING_BASE_SPEED: 0.7,
    RING_SPEED_INCREMENT: 0.06,

    // Cannon
    CANNON_RADIUS: 18,
    CANNON_INNER_RADIUS: 16,
    CANNON_TRACK_SPEED_BASE: 1.2,
    CANNON_TRACK_SPEED_INCREMENT: 0.15,
    CANNON_FIRE_COOLDOWN: 2.0,
    CANNON_FIRE_COOLDOWN_DECREMENT: 0.1,
    CANNON_FIRE_COOLDOWN_MIN: 0.8,
    CANNON_BULLET_SPEED: 420,
    CANNON_BULLET_SPEED_INCREMENT: 20,
    CANNON_BULLET_SPEED_MAX: 600,
    CANNON_BULLET_RADIUS: 12,

    // Mines
    MINE_COUNT: 3,
    MINE_COUNT_MAX: 6,
    MINE_COUNT_LEVEL_INTERVAL: 3,
    MINE_SPEED_BASE: 90,
    MINE_SPEED_INCREMENT: 8,
    MINE_SPEED_MAX: 350,
    MINE_TURN_RATE: 2.2,
    MINE_RADIUS: 3,
    MINE_SPAWN_DELAY: 2.0,

    // Hyperspace
    HYPERSPACE_SCORE_INTERVAL: 2500,
    HYPERSPACE_MIN_DIST: 200,

    // Countermeasures
    COUNTERMEASURE_SCORE_INTERVAL: 1000,
    COUNTERMEASURE_COUNT: 3,
    COUNTERMEASURE_LIFETIME: 10.0,
    COUNTERMEASURE_FADE_TIME: 2.0,
    COUNTERMEASURE_SPEED: 60,
    COUNTERMEASURE_RADIUS: 3,
    COLOR_COUNTERMEASURE: '#33ff66',

    // Scoring
    SCORE_OUTER: 10,
    SCORE_MIDDLE: 20,
    SCORE_INNER: 30,
    CANNON_DESTROY_BONUS: 500,
    EXTRA_LIFE_SCORE: 10000,

    // Colors
    COLOR_OUTER_RING: '#ff3333',
    COLOR_OUTER_RING_DIM: '#991111',
    COLOR_MIDDLE_RING: '#ff8833',
    COLOR_MIDDLE_RING_DIM: '#994411',
    COLOR_INNER_RING: '#ffff33',
    COLOR_INNER_RING_DIM: '#999911',
    COLOR_SHIP: '#00ffff',
    COLOR_BULLET: '#ffffff',
    COLOR_CANNON: '#ffff00',
    COLOR_CANNON_BULLET: '#ff4444',
    COLOR_MINE: '#ff44ff',
    COLOR_HUD: '#4488ff',
    COLOR_BG: '#000008',
};

// Speed multipliers (adjusted via pause menu, persisted)
SC.shipSpeedMult = 1.25;
SC.enemySpeedMult = 0.75;
SC.rotateSpeedMult = 0.5;
SC.nebulaeEnabled = true;
SC.galaxiesEnabled = true;
SC.shootingStarsEnabled = false;
SC.starClustersEnabled = true;
SC.dustLanesEnabled = true;
SC.pulsarsEnabled = false;

(function() {
    try {
        const saved = localStorage.getItem('starcitadel_settings');
        if (saved) {
            const s = JSON.parse(saved);
            if (typeof s.shipSpeedMult === 'number') SC.shipSpeedMult = s.shipSpeedMult;
            if (typeof s.enemySpeedMult === 'number') SC.enemySpeedMult = s.enemySpeedMult;
            if (typeof s.rotateSpeedMult === 'number') SC.rotateSpeedMult = s.rotateSpeedMult;
            if (typeof s.nebulaeEnabled === 'boolean') SC.nebulaeEnabled = s.nebulaeEnabled;
            if (typeof s.galaxiesEnabled === 'boolean') SC.galaxiesEnabled = s.galaxiesEnabled;
            if (typeof s.shootingStarsEnabled === 'boolean') SC.shootingStarsEnabled = s.shootingStarsEnabled;
            if (typeof s.starClustersEnabled === 'boolean') SC.starClustersEnabled = s.starClustersEnabled;
            if (typeof s.dustLanesEnabled === 'boolean') SC.dustLanesEnabled = s.dustLanesEnabled;
            if (typeof s.pulsarsEnabled === 'boolean') SC.pulsarsEnabled = s.pulsarsEnabled;
        }
    } catch (e) { /* ignore */ }
})();

SC.saveSettings = function() {
    localStorage.setItem('starcitadel_settings', JSON.stringify({
        shipSpeedMult: SC.shipSpeedMult,
        enemySpeedMult: SC.enemySpeedMult,
        rotateSpeedMult: SC.rotateSpeedMult,
        nebulaeEnabled: SC.nebulaeEnabled,
        galaxiesEnabled: SC.galaxiesEnabled,
        shootingStarsEnabled: SC.shootingStarsEnabled,
        starClustersEnabled: SC.starClustersEnabled,
        dustLanesEnabled: SC.dustLanesEnabled,
        pulsarsEnabled: SC.pulsarsEnabled,
    }));
};
