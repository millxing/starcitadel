window.SC = window.SC || {};

SC.Menu = class Menu {
    constructor() {
        this.visible = false;
        this.listeningAction = null; // which action is being remapped
        this._onKeyCapture = null;
        this._build();
    }

    _build() {
        // Backdrop
        this.overlay = document.createElement('div');
        this.overlay.id = 'pauseOverlay';
        Object.assign(this.overlay.style, {
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0, 0, 8, 0.85)',
            display: 'none',
            justifyContent: 'center', alignItems: 'center',
            zIndex: 1000,
            cursor: 'default',
        });

        // Menu panel
        const panel = document.createElement('div');
        Object.assign(panel.style, {
            background: 'rgba(0, 4, 20, 0.95)',
            border: '2px solid #00ffff',
            borderRadius: '8px',
            padding: '30px 40px',
            minWidth: '380px',
            maxWidth: '460px',
            fontFamily: '"Courier New", monospace',
            color: '#00ffff',
            boxShadow: '0 0 30px rgba(0, 255, 255, 0.15), inset 0 0 30px rgba(0, 255, 255, 0.05)',
        });

        // Title
        const title = document.createElement('div');
        title.textContent = '═══ PAUSED ═══';
        Object.assign(title.style, {
            textAlign: 'center', fontSize: '22px', fontWeight: 'bold',
            color: '#ffff33', marginBottom: '24px',
            textShadow: '0 0 12px rgba(255, 255, 51, 0.6)',
        });
        panel.appendChild(title);

        // Controls section (hidden on touch devices — no keyboard to remap)
        this.bindingButtons = {};
        if (!SC.isTouchDevice) {
            const ctrlHeader = this._sectionHeader('CONTROLS');
            panel.appendChild(ctrlHeader);

            const actions = [
                { key: 'left', label: 'Left' },
                { key: 'right', label: 'Right' },
                { key: 'thrust', label: 'Thrust' },
                { key: 'fire', label: 'Fire' },
                { key: 'pause', label: 'Pause' },
            ];

            for (const action of actions) {
                const row = this._bindingRow(action.key, action.label);
                panel.appendChild(row);
            }

            // Spacer
            panel.appendChild(this._spacer(20));
        }

        // Settings section
        const settingsHeader = this._sectionHeader('SETTINGS');
        panel.appendChild(settingsHeader);

        this.enemySlider = this._sliderRow('Mine Speed', SC.enemySpeedMult, (val) => {
            SC.enemySpeedMult = val;
            SC.saveSettings();
        });
        panel.appendChild(this.enemySlider.row);

        this.shipSlider = this._sliderRow('Ship Speed', SC.shipSpeedMult, (val) => {
            SC.shipSpeedMult = val;
            SC.saveSettings();
        });
        panel.appendChild(this.shipSlider.row);

        this.rotateSlider = this._sliderRow('Rotation', SC.rotateSpeedMult, (val) => {
            SC.rotateSpeedMult = val;
            SC.saveSettings();
        }, 0.25, 1.5, 0.25);
        panel.appendChild(this.rotateSlider.row);

        // Spacer
        panel.appendChild(this._spacer(12));

        // Audio section
        const audioHeader = this._sectionHeader('AUDIO');
        panel.appendChild(audioHeader);

        const savedVol = parseFloat(localStorage.getItem('starcitadel_volume') || '0.4');
        this.volumeSlider = this._sliderRow('Volume', savedVol, (val) => {
            if (SC.game && SC.game.audio && SC.game.audio.masterGain) {
                SC.game.audio.masterGain.gain.value = val;
            }
            localStorage.setItem('starcitadel_volume', val.toString());
        }, 0, 1, 0.1);
        panel.appendChild(this.volumeSlider.row);

        // Spacer
        panel.appendChild(this._spacer(24));

        // Resume button
        const resumeBtn = document.createElement('button');
        resumeBtn.textContent = SC.isTouchDevice ? 'RESUME' : 'RESUME (P)';
        Object.assign(resumeBtn.style, {
            display: 'block', margin: '0 auto', padding: '10px 32px',
            background: 'transparent', border: '2px solid #00ffff',
            borderRadius: '4px', color: '#00ffff', fontSize: '16px',
            fontFamily: '"Courier New", monospace', cursor: 'pointer',
            textShadow: '0 0 8px rgba(0, 255, 255, 0.4)',
            transition: 'all 0.15s',
        });
        resumeBtn.addEventListener('mouseenter', () => {
            resumeBtn.style.background = 'rgba(0, 255, 255, 0.15)';
            resumeBtn.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.3)';
        });
        resumeBtn.addEventListener('mouseleave', () => {
            resumeBtn.style.background = 'transparent';
            resumeBtn.style.boxShadow = 'none';
        });
        resumeBtn.addEventListener('click', () => {
            if (SC.game) SC.game.resume();
        });
        panel.appendChild(resumeBtn);

        this.overlay.appendChild(panel);
        document.body.appendChild(this.overlay);
    }

    _sectionHeader(text) {
        const h = document.createElement('div');
        h.textContent = text;
        Object.assign(h.style, {
            fontSize: '14px', color: '#4488ff', marginBottom: '10px',
            textShadow: '0 0 6px rgba(68, 136, 255, 0.4)',
            letterSpacing: '2px',
        });
        return h;
    }

    _spacer(px) {
        const s = document.createElement('div');
        s.style.height = px + 'px';
        return s;
    }

    _bindingRow(actionKey, label) {
        const row = document.createElement('div');
        Object.assign(row.style, {
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '6px', padding: '4px 0',
        });

        const lbl = document.createElement('span');
        lbl.textContent = label;
        Object.assign(lbl.style, { fontSize: '15px', color: '#aaddff' });

        const btn = document.createElement('button');
        btn.textContent = SC.keyBindings[actionKey].label;
        Object.assign(btn.style, {
            background: 'rgba(0, 255, 255, 0.08)', border: '1px solid #336688',
            borderRadius: '3px', color: '#00ffff', fontSize: '14px',
            fontFamily: '"Courier New", monospace', cursor: 'pointer',
            padding: '4px 14px', minWidth: '140px', textAlign: 'center',
            transition: 'all 0.15s',
        });
        btn.addEventListener('mouseenter', () => {
            if (this.listeningAction !== actionKey) {
                btn.style.borderColor = '#00ffff';
                btn.style.background = 'rgba(0, 255, 255, 0.15)';
            }
        });
        btn.addEventListener('mouseleave', () => {
            if (this.listeningAction !== actionKey) {
                btn.style.borderColor = '#336688';
                btn.style.background = 'rgba(0, 255, 255, 0.08)';
            }
        });
        btn.addEventListener('click', () => {
            this._startListening(actionKey);
        });

        this.bindingButtons[actionKey] = btn;

        row.appendChild(lbl);
        row.appendChild(btn);
        return row;
    }

    _sliderRow(label, initialValue, onChange, min, max, step) {
        min = min !== undefined ? min : 0.25;
        max = max !== undefined ? max : 2;
        step = step !== undefined ? step : 0.25;
        const row = document.createElement('div');
        Object.assign(row.style, {
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '8px', padding: '4px 0',
        });

        const lbl = document.createElement('span');
        lbl.textContent = label;
        Object.assign(lbl.style, { fontSize: '15px', color: '#aaddff', minWidth: '110px' });

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = min.toString();
        slider.max = max.toString();
        slider.step = step.toString();
        slider.value = initialValue.toString();
        Object.assign(slider.style, {
            flex: '1', margin: '0 12px', accentColor: '#00ffff',
            cursor: 'pointer',
        });

        const valDisplay = document.createElement('span');
        valDisplay.textContent = initialValue.toFixed(2) + 'x';
        Object.assign(valDisplay.style, {
            fontSize: '14px', color: '#ffff33', minWidth: '50px', textAlign: 'right',
            textShadow: '0 0 6px rgba(255, 255, 51, 0.3)',
        });

        slider.addEventListener('input', () => {
            const val = parseFloat(slider.value);
            valDisplay.textContent = val.toFixed(2) + 'x';
            onChange(val);
        });

        row.appendChild(lbl);
        row.appendChild(slider);
        row.appendChild(valDisplay);

        return { row, slider, valDisplay };
    }

    _startListening(actionKey) {
        // Cancel any previous listening
        this._stopListening();

        this.listeningAction = actionKey;
        const btn = this.bindingButtons[actionKey];
        btn.textContent = 'PRESS A KEY...';
        btn.style.borderColor = '#ffff33';
        btn.style.background = 'rgba(255, 255, 51, 0.15)';
        btn.style.color = '#ffff33';

        this._onKeyCapture = (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Ignore modifier-only keys
            if (['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight',
                 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight'].includes(e.code)) {
                return;
            }

            // Escape cancels
            if (e.code === 'Escape') {
                this._stopListening();
                return;
            }

            // Rebind
            SC.rebindKey(actionKey, e.code);
            this._stopListening();
            this._syncBindings();
        };

        // Use capture phase to intercept before game input
        window.addEventListener('keydown', this._onKeyCapture, true);
    }

    _stopListening() {
        if (this._onKeyCapture) {
            window.removeEventListener('keydown', this._onKeyCapture, true);
            this._onKeyCapture = null;
        }
        if (this.listeningAction) {
            const btn = this.bindingButtons[this.listeningAction];
            btn.style.borderColor = '#336688';
            btn.style.background = 'rgba(0, 255, 255, 0.08)';
            btn.style.color = '#00ffff';
            btn.textContent = SC.keyBindings[this.listeningAction].label;
            this.listeningAction = null;
        }
    }

    _syncBindings() {
        for (const actionKey of Object.keys(this.bindingButtons)) {
            this.bindingButtons[actionKey].textContent = SC.keyBindings[actionKey].label;
        }
    }

    show() {
        this._stopListening();
        this._syncBindings();
        this.enemySlider.slider.value = SC.enemySpeedMult.toString();
        this.enemySlider.valDisplay.textContent = SC.enemySpeedMult.toFixed(2) + 'x';
        this.shipSlider.slider.value = SC.shipSpeedMult.toString();
        this.shipSlider.valDisplay.textContent = SC.shipSpeedMult.toFixed(2) + 'x';
        this.rotateSlider.slider.value = SC.rotateSpeedMult.toString();
        this.rotateSlider.valDisplay.textContent = SC.rotateSpeedMult.toFixed(2) + 'x';
        const vol = parseFloat(localStorage.getItem('starcitadel_volume') || '0.4');
        this.volumeSlider.slider.value = vol.toString();
        this.volumeSlider.valDisplay.textContent = vol.toFixed(2) + 'x';
        this.overlay.style.display = 'flex';
        this.visible = true;
        document.body.style.cursor = 'default';
    }

    hide() {
        this._stopListening();
        this.overlay.style.display = 'none';
        this.visible = false;
        document.body.style.cursor = 'none';
    }
};
