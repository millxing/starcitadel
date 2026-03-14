window.SC = window.SC || {};

SC.HUD = class HUD {
    draw(renderer, score, lives, level, highScore) {
        const C = SC.CONST;
        // Score top-left
        renderer.drawText(
            score.toString().padStart(6, '0'),
            80, 30, 22, C.COLOR_HUD, 'center', 6
        );

        // High score below score
        if (highScore > 0) {
            renderer.drawText(
                'High Score = ' + highScore,
                80, 54, 12, '#ffff33', 'center', 3
            );
        }

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

    drawTitle(renderer, highScore) {
        const cx = renderer.w / 2;
        const cy = renderer.h / 2;

        // Title ABOVE the castle rings
        renderer.drawText('STAR CITADEL', cx, cy - 250, 48, '#ffff33', 'center', 20);

        if (SC.isTouchDevice) {
            renderer.drawText('TAP TO START', cx, cy - 200, 20, '#ffffff', 'center', 8);
            renderer.drawText('USE ON-SCREEN CONTROLS', cx, cy + 210, 15, '#4488ff', 'center', 5);
            if (highScore > 0) {
                renderer.drawText('High Score = ' + highScore, cx, cy + 245, 16, '#ffff33', 'center', 4);
            }
        } else {
            const b = SC.keyBindings;

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

            // High score below controls
            if (highScore > 0) {
                renderer.drawText('High Score = ' + highScore, cx, pauseY + 35, 16, '#ffff33', 'center', 4);
            }
        }
    }

    drawGameOver(renderer, score, highScore) {
        const cx = renderer.w / 2;
        const cy = renderer.h / 2;

        // Above the castle
        renderer.drawText('GAME OVER', cx, cy - 260, 40, '#ff3333', 'center', 15);
        if (SC.isTouchDevice) {
            renderer.drawText('TAP TO CONTINUE', cx, cy - 218, 18, '#4488ff', 'center', 6);
        } else {
            renderer.drawText('PRESS ' + SC.keyBindings.fire.label + ' TO RESTART', cx, cy - 218, 18, '#4488ff', 'center', 6);
        }

        // Below the castle
        renderer.drawText('SCORE: ' + score, cx, cy + 240, 24, '#ffffff', 'center', 8);
        if (highScore > 0) {
            renderer.drawText('HIGH SCORE: ' + highScore, cx, cy + 275, 20, '#ffff33', 'center', 6);
        }
    }
};
