/* CV World — synthesized WebAudio sound (no files needed) */
(function () {
    'use strict';
    const A = { ctx: null, muted: false, master: null, music: null };
    window.CVA = A;

    A.init = function () {
        if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
        const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
        A.ctx = new C(); A.master = A.ctx.createGain(); A.master.gain.value = A.muted ? 0 : 0.6; A.master.connect(A.ctx.destination);
        A.startMusic();
    };
    A.setMuted = function (m) { A.muted = m; if (A.master) A.master.gain.value = m ? 0 : 0.6; };

    function tone(f, dur, type, vol, when, slideTo) {
        if (!A.ctx || A.muted) return;
        const t0 = A.ctx.currentTime + (when || 0);
        const o = A.ctx.createOscillator(), g = A.ctx.createGain();
        o.type = type || 'square'; o.frequency.setValueAtTime(f, t0);
        if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
        g.gain.setValueAtTime(vol || 0.1, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g); g.connect(A.master); o.start(t0); o.stop(t0 + dur + 0.02);
    }
    function noise(dur, vol, hp) {
        if (!A.ctx || A.muted) return;
        const n = A.ctx.sampleRate * dur | 0, b = A.ctx.createBuffer(1, n, A.ctx.sampleRate), d = b.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
        const s = A.ctx.createBufferSource(); s.buffer = b;
        const f = A.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = hp || 800;
        const g = A.ctx.createGain(); g.gain.value = vol || 0.2;
        s.connect(f); f.connect(g); g.connect(A.master); s.start();
    }

    A.play = function (k) {
        switch (k) {
            case 'step': noise(0.06, 0.07, 500 + Math.random() * 300); break;
            case 'break': noise(0.16, 0.22, 600); tone(110, 0.1, 'square', 0.05); break;
            case 'place': noise(0.07, 0.16, 1100); tone(220, 0.06, 'square', 0.05); break;
            case 'jump': tone(300, 0.1, 'sine', 0.05, 0, 500); break;
            case 'shard': [660, 880, 1320].forEach((f, i) => tone(f, 0.18, 'triangle', 0.12, i * 0.07)); break;
            case 'open': tone(520, 0.1, 'triangle', 0.1); tone(780, 0.14, 'triangle', 0.1, 0.07); break;
            case 'close': tone(520, 0.1, 'triangle', 0.08, 0, 330); break;
            case 'talk': tone(180 + Math.random() * 90, 0.05, 'square', 0.04); break;
            case 'achv': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.13, i * 0.1)); break;
            case 'portal': tone(120, 0.7, 'sawtooth', 0.08, 0, 600); tone(180, 0.7, 'sine', 0.08, 0.05, 900); break;
            case 'splash': noise(0.25, 0.2, 400); break;
            case 'hurt': noise(0.1, 0.18, 300); tone(260, 0.12, 'sawtooth', 0.07, 0, 150); break;
            case 'mobdie': tone(300, 0.3, 'sawtooth', 0.08, 0, 70); noise(0.2, 0.15, 250); break;
            case 'click': tone(700, 0.04, 'square', 0.05); break;
        }
    };

    /* ambient music: pad + slow pentatonic arpeggio */
    A.startMusic = function () {
        if (!A.ctx) return;
        const scale = [261.6, 293.7, 329.6, 392, 440, 523.2, 587.3, 659.3];
        let i = 0;
        function note() {
            if (!A.ctx) return;
            if (!A.muted && Math.random() > 0.25) {
                const f = scale[(Math.random() * scale.length) | 0] / (Math.random() > 0.7 ? 2 : 1);
                const t0 = A.ctx.currentTime, o = A.ctx.createOscillator(), g = A.ctx.createGain();
                o.type = 'sine'; o.frequency.value = f;
                g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.045, t0 + 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.2);
                o.connect(g); g.connect(A.master); o.start(t0); o.stop(t0 + 3.3);
            }
            i++; A.music = setTimeout(note, 1400 + Math.random() * 1600);
        }
        note();
    };
})();
