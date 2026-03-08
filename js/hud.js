window.SC = window.SC || {};

SC.HUD = class HUD {
    draw(renderer, score, lives, level) {
        const C = SC.CONST;
        // Score top-left
        renderer.drawText(
            score.toString().padStart(6, '0'),
            80, 30, 22, C.COLOR_HUD, 'center', 6
        );

        // Level top-center
        renderer.drawText(
            'LEVEL ' + level,
            renderer.w / 2, 30, 16, C.COLOR_HUD, 'center', 4
        );

        // Lives top-right - draw small ship icons
        for (let i = 0; i < lives; i++) {
            const x = renderer.w - 30 - i * 25;
            const y = 30;
            const s = 8;
            const pts = [
                new SC.Vec2(x, y - s),
                new SC.Vec2(x - s * 0.6, y + s * 0.5),
                new SC.Vec2(x + s * 0.6, y + s * 0.5),
            ];
            renderer.drawPolygon(pts, C.COLOR_SHIP, 1, 4);
        }
    }

    drawTitle(renderer) {
        const cx = renderer.w / 2;
        const cy = renderer.h / 2;
        const b = SC.keyBindings;

        // Title ABOVE the castle rings
        renderer.drawText('STAR CITADEL', cx, cy - 250, 48, '#ffff33', 'center', 20);

        // Start prompt between title and castle
        renderer.drawText('PRESS ' + b.fire.label + ' TO START', cx, cy - 200, 20, '#ffffff', 'center', 8);

        // Controls in paired rows BELOW the castle rings
        const rows = [
            { left: { label: b.left.label, action: 'LEFT' }, right: { label: b.right.label, action: 'RIGHT' } },
            { left: { label: b.fire.label, action: 'FIRE' }, right: { label: b.thrust.label, action: 'THRUST' } },
        ];

        const colGap = 100;
        let y = cy + 200;
        const lineHeight = 26;

        for (let i = 0; i < rows.length; i++) {
            renderer.drawText(
                rows[i].left.label + ' = ' + rows[i].left.action,
                cx - colGap, y + i * lineHeight, 15, '#4488ff', 'center', 5
            );
            renderer.drawText(
                rows[i].right.label + ' = ' + rows[i].right.action,
                cx + colGap, y + i * lineHeight, 15, '#4488ff', 'center', 5
            );
        }

        // Pause centered on its own row
        const pauseY = y + rows.length * lineHeight;
        renderer.drawText(b.pause.label + ' = PAUSE', cx, pauseY, 15, '#4488ff', 'center', 5);
    }

    drawGameOver(renderer, score, highScore) {
        const cx = renderer.w / 2;
        const cy = renderer.h / 2;

        renderer.drawText('GAME OVER', cx, cy - 60, 40, '#ff3333', 'center', 15);
        renderer.drawText('SCORE: ' + score, cx, cy + 10, 24, '#ffffff', 'center', 8);
        if (highScore > 0) {
            renderer.drawText('HIGH SCORE: ' + highScore, cx, cy + 50, 20, '#ffff33', 'center', 6);
        }
        renderer.drawText('PRESS ' + SC.keyBindings.fire.label + ' TO RESTART', cx, cy + 100, 18, '#4488ff', 'center', 6);
    }
};
