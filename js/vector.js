window.SC = window.SC || {};

SC.Vec2 = class Vec2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    add(v) { return new Vec2(this.x + v.x, this.y + v.y); }
    sub(v) { return new Vec2(this.x - v.x, this.y - v.y); }
    scale(s) { return new Vec2(this.x * s, this.y * s); }

    rotate(rad) {
        const c = Math.cos(rad), s = Math.sin(rad);
        return new Vec2(this.x * c - this.y * s, this.x * s + this.y * c);
    }

    mag() { return Math.sqrt(this.x * this.x + this.y * this.y); }

    normalize() {
        const m = this.mag();
        return m > 0 ? this.scale(1 / m) : new Vec2(0, 0);
    }

    dot(v) { return this.x * v.x + this.y * v.y; }
    distTo(v) { return this.sub(v).mag(); }
    angle() { return Math.atan2(this.y, this.x); }
    clone() { return new Vec2(this.x, this.y); }

    static fromAngle(rad) {
        return new Vec2(Math.cos(rad), Math.sin(rad));
    }
};

SC.normalizeAngle = function(a) {
    a = a % (Math.PI * 2);
    if (a < 0) a += Math.PI * 2;
    return a;
};

SC.angleInArc = function(theta, arcStart, arcEnd) {
    theta = SC.normalizeAngle(theta);
    arcStart = SC.normalizeAngle(arcStart);
    arcEnd = SC.normalizeAngle(arcEnd);
    if (arcStart <= arcEnd) {
        return theta >= arcStart && theta <= arcEnd;
    }
    return theta >= arcStart || theta <= arcEnd;
};
