window.SC = window.SC || {};

SC.TouchControls = class TouchControls {
    constructor(input) {
        this.input = input;
        this.container = null;
        this.buttons = {};
        this.touchMap = {};

        if (!SC.isTouchDevice) return;

        this._build();
        this._attachEvents();
    }

    _build() {
        this.container = document.createElement('div');
        this.container.id = 'touchControls';
        Object.assign(this.container.style, {
            position: 'fixed', top: '0', left: '0',
            width: '100%', height: '100%',
            pointerEvents: 'none', zIndex: '500',
        });

        // Left pair: LEFT and RIGHT
        const leftGroup = this._createGroup('left');
        Object.assign(leftGroup.style, {
            position: 'absolute',
            bottom: 'max(80px, env(safe-area-inset-bottom, 0px) + 60px)',
            left: '20px',
            display: 'flex', gap: '15px',
        });
        this.buttons.left = this._createButton('\u25C0', 'left');
        this.buttons.right = this._createButton('\u25B6', 'right');
        leftGroup.appendChild(this.buttons.left);
        leftGroup.appendChild(this.buttons.right);

        // Right pair: THRUST and FIRE
        const rightGroup = this._createGroup('right');
        Object.assign(rightGroup.style, {
            position: 'absolute',
            bottom: 'max(80px, env(safe-area-inset-bottom, 0px) + 60px)',
            right: '20px',
            display: 'flex', gap: '15px',
        });
        this.buttons.thrust = this._createButton('\u25B2', 'thrust');
        this.buttons.fire = this._createButton('\u25CF', 'fire');
        rightGroup.appendChild(this.buttons.thrust);
        rightGroup.appendChild(this.buttons.fire);

        // Pause button: top-left, below the HUD score row
        this.buttons.pause = this._createButton('\u2759\u2759', 'pause');
        Object.assign(this.buttons.pause.style, {
            position: 'absolute',
            top: 'max(58px, env(safe-area-inset-top, 0px) + 54px)',
            left: '15px',
            width: '44px', height: '44px',
            fontSize: '14px',
            opacity: '0.5',
        });

        this.container.appendChild(leftGroup);
        this.container.appendChild(rightGroup);
        this.container.appendChild(this.buttons.pause);
        document.body.appendChild(this.container);
    }

    _createGroup() {
        const g = document.createElement('div');
        g.style.pointerEvents = 'auto';
        return g;
    }

    _createButton(label, action) {
        const btn = document.createElement('div');
        btn.textContent = label;
        btn.dataset.action = action;

        const isFireBtn = action === 'fire';
        const isThrustBtn = action === 'thrust';
        const borderColor = isFireBtn ? 'rgba(255, 255, 255, 0.4)'
            : isThrustBtn ? 'rgba(255, 136, 0, 0.4)'
            : 'rgba(0, 255, 255, 0.4)';
        const textColor = isFireBtn ? 'rgba(255, 255, 255, 0.7)'
            : isThrustBtn ? 'rgba(255, 136, 0, 0.7)'
            : 'rgba(0, 255, 255, 0.7)';
        const glowColor = isFireBtn ? 'rgba(255, 255, 255, 0.15)'
            : isThrustBtn ? 'rgba(255, 136, 0, 0.15)'
            : 'rgba(0, 255, 255, 0.15)';

        Object.assign(btn.style, {
            width: '70px', height: '70px',
            borderRadius: '50%',
            border: '2px solid ' + borderColor,
            background: 'rgba(0, 8, 20, 0.3)',
            color: textColor,
            fontFamily: '"Courier New", monospace',
            fontSize: '20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'auto',
            boxShadow: '0 0 8px ' + glowColor + ', inset 0 0 8px rgba(0, 255, 255, 0.05)',
            textShadow: '0 0 6px ' + glowColor,
            WebkitTapHighlightColor: 'transparent',
        });

        // Store colors for active state
        btn._borderColor = borderColor;
        btn._activeBorder = isFireBtn ? 'rgba(255, 255, 255, 0.8)'
            : isThrustBtn ? 'rgba(255, 136, 0, 0.8)'
            : 'rgba(0, 255, 255, 0.8)';
        btn._activeGlow = isFireBtn ? 'rgba(255, 255, 255, 0.4)'
            : isThrustBtn ? 'rgba(255, 136, 0, 0.4)'
            : 'rgba(0, 255, 255, 0.4)';

        return btn;
    }

    _attachEvents() {
        const syntheticCodes = {
            left: '_touch_left',
            right: '_touch_right',
            thrust: '_touch_thrust',
            fire: '_touch_fire',
            pause: '_touch_pause',
        };

        for (const [action, btn] of Object.entries(this.buttons)) {
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                for (const touch of e.changedTouches) {
                    this.touchMap[touch.identifier] = action;
                }
                this._setPressed(action, true, syntheticCodes[action]);
            }, { passive: false });

            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                for (const touch of e.changedTouches) {
                    delete this.touchMap[touch.identifier];
                }
                const stillActive = Object.values(this.touchMap).includes(action);
                this._setPressed(action, stillActive, syntheticCodes[action]);
            }, { passive: false });

            btn.addEventListener('touchcancel', (e) => {
                for (const touch of e.changedTouches) {
                    delete this.touchMap[touch.identifier];
                }
                const stillActive = Object.values(this.touchMap).includes(action);
                this._setPressed(action, stillActive, syntheticCodes[action]);
            }, { passive: false });
        }
    }

    _setPressed(action, pressed, code) {
        if (action === 'pause') {
            // Pause uses justPressed, so pulse it for one frame
            if (pressed) {
                this.input.keys[code] = true;
                requestAnimationFrame(() => { this.input.keys[code] = false; });
            }
        } else {
            this.input.keys[code] = pressed;
        }

        // Visual feedback
        const btn = this.buttons[action];
        if (pressed) {
            btn.style.borderColor = btn._activeBorder;
            btn.style.background = 'rgba(0, 8, 20, 0.5)';
            btn.style.boxShadow = '0 0 15px ' + btn._activeGlow + ', inset 0 0 10px rgba(0, 255, 255, 0.1)';
        } else {
            btn.style.borderColor = btn._borderColor;
            btn.style.background = 'rgba(0, 8, 20, 0.3)';
            btn.style.boxShadow = '0 0 8px rgba(0, 255, 255, 0.15), inset 0 0 8px rgba(0, 255, 255, 0.05)';
        }
    }

    show() {
        if (this.container) this.container.style.display = 'block';
    }

    hide() {
        if (this.container) this.container.style.display = 'none';
        // Release all active touches
        for (const action of Object.keys(this.buttons)) {
            this.input.keys['_touch_' + action] = false;
        }
        this.touchMap = {};
    }
};
