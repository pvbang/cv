/* CV World — synthesized WebAudio SFX & C418-inspired ambient piano soundtrack (zero external files) */
(function () {
    'use strict';
    const A = { ctx: null, muted: false, master: null, music: null };
    window.CVA = A;

    A.init = function () {
        if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
        const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
        A.ctx = new C(); A.master = A.ctx.createGain();
        A.master.gain.value = A.muted ? 0 : 0.58;
        A.master.connect(A.ctx.destination);
        A.startMusic();
    };
    A.setMuted = function (m) { A.muted = m; if (A.master) A.master.gain.value = m ? 0 : 0.58; };

    function tone(f, dur, type, vol, when, slideTo) {
        if (!A.ctx || A.muted) return;
        const t0 = A.ctx.currentTime + (when || 0);
        const o = A.ctx.createOscillator(), g = A.ctx.createGain();
        o.type = type || 'square'; o.frequency.setValueAtTime(f, t0);
        if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
        g.gain.setValueAtTime(vol || 0.1, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g); g.connect(A.master); o.start(t0); o.stop(t0 + dur + 0.03);
    }
    function noise(dur, vol, freq, q) {
        if (!A.ctx || A.muted) return;
        const n = Math.max(64, (A.ctx.sampleRate * dur) | 0);
        const b = A.ctx.createBuffer(1, n, A.ctx.sampleRate), d = b.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
        const s = A.ctx.createBufferSource(); s.buffer = b;
        const f = A.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 800; f.Q.value = q || 1;
        const g = A.ctx.createGain(); g.gain.value = vol || 0.2;
        s.connect(f); f.connect(g); g.connect(A.master); s.start();
    }

    A.play = function (k, sub) {
        switch (k) {
            case 'step': {
                const map = { grass: [650, 0.06], stone: [1100, 0.08], wood: [420, 0.09], sand: [1400, 0.05], snow: [1900, 0.05], water: [380, 0.11] };
                const s = map[sub] || map.stone;
                noise(0.06, s[1], s[0] + Math.random() * 220, 1.2);
                if (sub === 'wood') tone(140 + Math.random() * 30, 0.04, 'triangle', 0.04);
                break;
            }
            case 'mineTick': noise(0.045, 0.09, 950 + Math.random() * 350, 1.5); break;
            case 'break': noise(0.16, 0.22, 620); tone(125, 0.09, 'square', 0.05, 0, 75); break;
            case 'place': noise(0.07, 0.16, 1150); tone(210, 0.06, 'triangle', 0.07, 0, 150); break;
            case 'jump': tone(260, 0.1, 'sine', 0.05, 0, 480); break;
            case 'shard': [587.3, 880, 1174.7, 1568].forEach((f, i) => tone(f, 0.22, 'triangle', 0.11, i * 0.065)); break;
            case 'xp': tone(820 + Math.random() * 340, 0.09, 'sine', 0.08, 0, 1280); break;
            case 'levelup': [523, 659, 784, 1047, 1318].forEach((f, i) => tone(f, 0.22, 'triangle', 0.11, i * 0.075)); break;
            case 'open': tone(520, 0.09, 'triangle', 0.09); tone(780, 0.13, 'triangle', 0.09, 0.06); break;
            case 'close': tone(520, 0.09, 'triangle', 0.07, 0, 320); break;
            case 'talk': tone(190 + Math.random() * 110, 0.045, 'triangle', 0.045); break;
            case 'achv': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, 'triangle', 0.13, i * 0.095)); break;
            case 'portal': tone(110, 0.8, 'sawtooth', 0.07, 0, 580); tone(220, 0.8, 'sine', 0.09, 0.06, 880); break;
            case 'splash': noise(0.28, 0.22, 420, 0.8); break;
            case 'lava': noise(0.24, 0.24, 2400, 0.7); tone(95, 0.18, 'sawtooth', 0.06, 0, 55); break;
            case 'hurt': noise(0.1, 0.18, 320); tone(240, 0.12, 'sawtooth', 0.07, 0, 130); break;
            case 'playerHurt': noise(0.14, 0.24, 240); tone(160, 0.18, 'sawtooth', 0.11, 0, 72); break;
            case 'mobdie': tone(290, 0.28, 'sawtooth', 0.08, 0, 68); noise(0.2, 0.16, 260); break;
            case 'hiss': noise(0.45, 0.2, 3200, 1.8); tone(780, 0.4, 'sawtooth', 0.03, 0, 1400); break;
            case 'boom': noise(0.55, 0.35, 160, 0.5); tone(95, 0.45, 'sine', 0.22, 0, 28); break;
            case 'bow': tone(420, 0.09, 'triangle', 0.08, 0, 190); noise(0.06, 0.08, 1800); break;
            case 'click': tone(720, 0.035, 'triangle', 0.05); break;
        }
    };

    /* Gentle C418-inspired ambient piano/chime progression */
    A.startMusic = function () {
        if (!A.ctx) return;
        const chords = [
            [261.63, 329.63, 392.00, 493.88], // Cmaj7
            [220.00, 261.63, 329.63, 392.00], // Am7
            [174.61, 220.00, 261.63, 329.63], // Fmaj7
            [196.00, 246.94, 293.66, 392.00]  // G6
        ];
        let step = 0;
        function note() {
            if (!A.ctx) return;
            if (!A.muted && Math.random() > 0.22) {
                const ch = chords[((step / 4) | 0) % chords.length];
                const f = ch[(Math.random() * ch.length) | 0] * (Math.random() > 0.72 ? 2 : 1);
                const t0 = A.ctx.currentTime;
                const o = A.ctx.createOscillator(), g = A.ctx.createGain();
                o.type = 'sine'; o.frequency.value = f;
                g.gain.setValueAtTime(0.0001, t0);
                g.gain.linearRampToValueAtTime(0.042, t0 + 0.12);
                g.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.8);
                o.connect(g); g.connect(A.master); o.start(t0); o.stop(t0 + 4.0);
            }
            step++;
            A.music = setTimeout(note, 1500 + Math.random() * 1900);
        }
        note();
    };
})();
