window.SC = window.SC || {};

SC.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

// Key code to human-readable label
SC.keyCodeToLabel = function(code) {
    const map = {
        'ArrowLeft': 'LEFT ARROW', 'ArrowRight': 'RIGHT ARROW',
        'ArrowUp': 'UP ARROW', 'ArrowDown': 'DOWN ARROW',
        'Space': 'SPACE', 'Enter': 'ENTER', 'Escape': 'ESCAPE',
        'ShiftLeft': 'LEFT SHIFT', 'ShiftRight': 'RIGHT SHIFT',
        'ControlLeft': 'LEFT CTRL', 'ControlRight': 'RIGHT CTRL',
        'AltLeft': 'LEFT ALT', 'AltRight': 'RIGHT ALT',
        'Tab': 'TAB', 'Backspace': 'BACKSPACE',
        'CapsLock': 'CAPS LOCK', 'Delete': 'DELETE',
    };
    if (map[code]) return map[code];
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    if (code.startsWith('Numpad')) return 'NUM ' + code.slice(6);
    return code.toUpperCase();
};

// Default key bindings
const defaultBindings = {
    left:   { code: 'ArrowLeft',  label: 'LEFT ARROW' },
    right:  { code: 'ArrowRight', label: 'RIGHT ARROW' },
    thrust: { code: 'ArrowUp',    label: 'UP ARROW' },
    fire:   { code: 'Space',      label: 'SPACE' },
    pause:  { code: 'KeyP',       label: 'P' },
};

// Load saved bindings or use defaults
function loadBindings() {
    try {
        const saved = localStorage.getItem('starcitadel_keys');
        if (saved) {
            const parsed = JSON.parse(saved);
            const bindings = {};
            for (const action of Object.keys(defaultBindings)) {
                if (parsed[action] && parsed[action].code) {
                    bindings[action] = {
                        code: parsed[action].code,
                        label: SC.keyCodeToLabel(parsed[action].code)
                    };
                } else {
                    bindings[action] = { ...defaultBindings[action] };
                }
            }
            return bindings;
        }
    } catch (e) { /* ignore */ }
    return JSON.parse(JSON.stringify(defaultBindings));
}

SC.keyBindings = loadBindings();

SC.saveBindings = function() {
    localStorage.setItem('starcitadel_keys', JSON.stringify(SC.keyBindings));
};

SC.rebindKey = function(action, code) {
    SC.keyBindings[action] = {
        code: code,
        label: SC.keyCodeToLabel(code)
    };
    SC.saveBindings();
};

SC.Input = class Input {
    constructor() {
        this.keys = {};
        this.prev = {};
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            // Prevent default for bound keys
            const boundCodes = Object.values(SC.keyBindings).map(b => b.code);
            if (boundCodes.includes(e.code) || ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
                e.preventDefault();
            }
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // On touch devices, tapping the canvas acts as Space (for title/gameover)
        if (SC.isTouchDevice) {
            document.getElementById('gameCanvas').addEventListener('touchstart', () => {
                this.keys['Space'] = true;
                requestAnimationFrame(() => { this.keys['Space'] = false; });
            }, { passive: false });
        }
    }

    isDown(code) { return !!this.keys[code]; }

    justPressed(code) {
        return !!this.keys[code] && !this.prev[code];
    }

    update() {
        this.prev = { ...this.keys };
    }

    get left() { return this.isDown(SC.keyBindings.left.code) || this.isDown('_touch_left'); }
    get right() { return this.isDown(SC.keyBindings.right.code) || this.isDown('_touch_right'); }
    get thrust() { return this.isDown(SC.keyBindings.thrust.code) || this.isDown('_touch_thrust'); }
    get fire() { return this.isDown(SC.keyBindings.fire.code) || this.isDown('_touch_fire'); }
    get pause() { return this.justPressed(SC.keyBindings.pause.code) || this.justPressed('_touch_pause'); }
    get anyKey() {
        return Object.values(this.keys).some(v => v);
    }
};
