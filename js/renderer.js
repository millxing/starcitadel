window.SC = window.SC || {};

SC.Renderer = class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.w = this.canvas.width;
        this.h = this.canvas.height;
        this.cx = this.w / 2;
        this.cy = this.h / 2;
    }

    clear() {
        this.ctx.fillStyle = SC.CONST.COLOR_BG;
        this.ctx.fillRect(0, 0, this.w, this.h);
    }

    setGlow(color, blur) {
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = blur;
    }

    clearGlow() {
        this.ctx.shadowBlur = 0;
        this.ctx.shadowColor = 'transparent';
    }

    drawLine(x1, y1, x2, y2, color, width, glow) {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = color;
        ctx.lineWidth = width || 1.5;
        if (glow !== false) this.setGlow(color, glow || 10);
        ctx.stroke();
        this.clearGlow();
    }

    drawArc(cx, cy, radius, startAngle, endAngle, color, width, glow) {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, startAngle, endAngle);
        ctx.strokeStyle = color;
        ctx.lineWidth = width || 2;
        if (glow !== false) this.setGlow(color, glow || 12);
        ctx.stroke();
        this.clearGlow();
    }

    drawCircle(cx, cy, radius, color, width, glow) {
        this.drawArc(cx, cy, radius, 0, Math.PI * 2, color, width, glow);
    }

    drawFilledCircle(cx, cy, radius, color, glow) {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        if (glow !== false) this.setGlow(color, glow || 10);
        ctx.fill();
        this.clearGlow();
    }

    drawPolygon(points, color, width, glow) {
        const ctx = this.ctx;
        if (points.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();
        ctx.strokeStyle = color;
        ctx.lineWidth = width || 1.5;
        if (glow !== false) this.setGlow(color, glow || 10);
        ctx.stroke();
        this.clearGlow();
    }

    drawText(text, x, y, size, color, align, glow) {
        const ctx = this.ctx;
        ctx.font = `${size}px "Courier New", monospace`;
        ctx.textAlign = align || 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color;
        if (glow !== false) this.setGlow(color, glow || 8);
        ctx.fillText(text, x, y);
        this.clearGlow();
    }
};
