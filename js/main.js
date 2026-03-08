window.SC = window.SC || {};

(function() {
    const canvas = document.getElementById('gameCanvas');
    const game = new SC.Game(canvas);
    SC.game = game; // expose for debugging

    let lastTime = 0;

    function gameLoop(timestamp) {
        const dt = Math.min((timestamp - lastTime) / 1000, 1 / 30);
        lastTime = timestamp;

        game.update(dt);
        game.draw();

        requestAnimationFrame(gameLoop);
    }

    requestAnimationFrame((timestamp) => {
        lastTime = timestamp;
        gameLoop(timestamp);
    });
})();
