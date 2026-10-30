/* CV World — bootstrap, main loop, controls, auto tour */
(function () {
    'use strict';
    const $ = id => document.getElementById(id);
    const canvas = $('gl');
    const isTouch = ('ontouchstart' in window) && window.matchMedia('(pointer: coarse)').matches;
    const G = { state: 'loading', last: 0, t: 0, frame: 0, areaT: 0, tour: null };
    window.CVG = G;

    function fail(msg) { const el = $('ldTxt'); el.style.color = '#f87171'; el.textContent = msg; }
    if (!window.THREE) { fail('Could not load three.js (an Internet connection is needed the first time). Please reload the page.'); return; }

    const W = window.CVW, E = window.CVE, P = window.CVP, X = window.CVX, A = window.CVA, U = window.CVU, CV = window.CV_DATA;
    const step = (p, t) => { $('ldBar').style.width = p + '%'; $('ldTxt').textContent = t; };
    const wait = () => new Promise(r => setTimeout(r, 30));

    async function boot() {
        try {
            step(8, 'Generating terrain…'); await wait();
            W.buildAll(CV);
            step(40, 'Building structures & chunks…'); await wait();
            E.init(canvas);
            step(75, 'Summoning NPCs & Knowledge Shards…'); await wait();
            X.init(); window.CVM.init(); U.buildMap(); U.load(); U.applyLoaded();
            P.bindInput(canvas); bindUI(); P.onEvent = onPlayerEvent;
            const s = W.landmarks.spawn; P.teleport(s.x, s.y, s.z, 0);
            U.buildHotbar(); U.itemNameReady = true; U.refreshHUD(); E.updateSky(P.pos);
            X.onShard = id => { A.play('shard'); U.toast('💎', 'shard', 'Knowledge Shard ' + (X.collected.size) + '/' + CV.shards.length, CV.shards[id]); U.refreshHUD(); U.checkAchv(); };
            let pc = 0; X.onPortal = () => { const n = performance.now(); if (n - pc < 4000) return; pc = n; A.play('portal'); const c = W.landmarks.contact; P.teleport(c.x, c.y, c.z, Math.PI); U.openSection('contact'); };
            step(100, 'Ready!'); await wait();
            $('loading').classList.add('out'); setTimeout(() => $('loading').remove(), 600);
            $('menu').classList.remove('hidden'); G.state = 'menu';
            if (U.visited.size || X.collected.size) $('btnPlay').textContent = '▶ CONTINUE JOURNEY (' + U.visited.size + '/6 · ' + X.collected.size + '/12💎)';
            requestAnimationFrame(loop);
        } catch (e) { console.error(e); fail('Startup error: ' + e.message); }
    }

    /* ---------- play state ---------- */
    function overlayOpen() { return U.panelOpen || U.mapOpen || U.cpOpen || U.finaleOpen || U.helpOpen || U.invOpen; }
    function syncEnabled() { P.enabled = G.state === 'play' && !overlayOpen(); P.canInteract = P.enabled && !U.dialogOpen; }

    G.play = function () {
        A.init(); G.state = 'play'; $('menu').classList.add('hidden'); $('pause').classList.add('hidden'); $('hud').classList.remove('hidden');
        if (isTouch) { $('touch').classList.remove('hidden'); P.locked = true; } else lockSoon();
        if (!U.introDone) { U.introDone = true; setTimeout(() => U.hint('Walk up to the NPC "Bang" and press E to talk. Keys 1-4 pick tools, 5-9 blocks. Press H for all controls'), 600); setTimeout(() => U.hint(null), 6000); }
        syncEnabled();
    };
    function lockSoon() {
        if (isTouch) return;
        P.lock(canvas);
        setTimeout(() => { if (G.state === 'play' && !P.locked && !overlayOpen()) showPause(); }, 600);
    }
    U.onResume = function () { syncEnabled(); if (G.state === 'play' && !overlayOpen()) lockSoon(); };
    function showPause() { if (G.state !== 'play') return; G.state = 'pause'; $('pause').classList.remove('hidden'); syncEnabled(); }
    function resume() { $('pause').classList.add('hidden'); G.state = 'play'; if (isTouch) P.locked = true; else lockSoon(); syncEnabled(); }

    /* ---------- auto tour ---------- */
    G.startTour = function () {
        A.init(); $('menu').classList.add('hidden'); $('hud').classList.remove('hidden'); G.state = 'tour';
        const stops = CV.landmarks.map(l => ({ l, y: W.BASE })).concat([{ l: { name: 'Secret Summit', x: -38, z: -36, sign: 'SECRET', icon: '🏔️', color: 0x4ff2e4 }, y: W.topY(-38, -36) }]);
        G.tour = { i: 0, t: 0, stops, dur: 5 };
        P.enabled = false; P.canInteract = false; U.hint('Auto tour: click or press Esc to take control'); showTourToast();
    };
    function showTourToast() { const s = G.tour.stops[G.tour.i].l; U.toast(s.icon || '📍', '', 'Stop ' + (G.tour.i + 1) + '/' + G.tour.stops.length, s.name); }
    function endTour() { G.tour = null; U.hint(null); const s = W.landmarks.spawn; P.teleport(s.x, s.y, s.z, 0); G.play(); }
    function updateTour(dt) {
        const T = G.tour; T.t += dt;
        if (T.t > T.dur) { T.t = 0; T.i++; if (T.i >= T.stops.length) { endTour(); return; } showTourToast(); }
        const s = T.stops[T.i], a = T.t * 0.35 + T.i, R = 17, y = s.y + 9 + Math.sin(T.t) * 1.5;
        const cam = E.camera; cam.position.set(s.l.x + Math.cos(a) * R, y, s.l.z + Math.sin(a) * R);
        cam.lookAt(s.l.x, s.y + 6, s.l.z); P.pos.set(s.l.x, s.y + 2, s.l.z);
        U.areaOn = s.l.name; $('locName').textContent = s.l.name;
    }

    /* ---------- player events ---------- */
    function onPlayerEvent(k, d) {
        if (k === 'step') A.play('step');
        else if (k === 'break') { A.play('break'); X.blockBurst(d.x, d.y, d.z, d.id); }
        else if (k === 'hit') { A.play(d.killed ? 'mobdie' : 'hurt'); X.burst(d.x, d.y, d.z, d.killed ? 0xffffff : 0xd83a3a, d.killed ? 18 : 6, 3.2); if (d.killed) { U.kills = (U.kills || 0) + 1; U.checkAchv(); } }
        else if (k === 'place') { A.play('place'); U.placed++; if (U.placed % 5 === 0) U.checkAchv(); }
        else if (k === 'infoHit' || k === 'interact') U.openInfo(d);
        else if (k === 'hotbar') U.buildHotbar();
        else if (k === 'fly') U.toast(d ? '🕊️' : '🚶', '', d ? 'Flying' : 'Walking', d ? 'Space up · Shift/Q down · double-tap Space to stop' : 'Flight disabled');
        else if (k === 'lock') { if (!d && G.state === 'play' && !overlayOpen()) showPause(); }
        else if (k === 'key') onKey(d);
    }

    function interact() {
        if (U.dialogOpen) { U.advanceDialog(); return; }
        const n = X.nearestNPC(P.pos, 3.4); if (n) { U.startDialog(n); return; }
        if (P.target) { const i = W.infoMap.get(P.target.x + ',' + P.target.y + ',' + P.target.z); if (i) U.openInfo(i); }
    }

    function onKey(e) {
        if (e.__cvHandled) return; e.__cvHandled = true;   // the same keydown can reach both listeners; handle it once
        if (G.state === 'tour') { if (e.code === 'Escape') endTour(); return; }
        if (G.state === 'pause') { if (e.code === 'Escape') resume(); return; }
        if (G.state !== 'play') return;
        if (e.code === 'Escape') { if (U.panelOpen) U.closePanel(); else if (U.mapOpen) U.closeMap(); else if (U.cpOpen) U.closeCompendium(); else if (U.helpOpen) U.closeHelp(); else if (U.invOpen) U.closeInventory(); else if (U.finaleOpen) closeFinale(); else if (U.dialogOpen) U.advanceDialog(); else showPause(); return; }
        if (e.repeat) return;
        if (e.code === 'KeyE') { if (U.panelOpen) U.closePanel(); else if (!overlayOpen()) interact(); }
        else if (e.code === 'KeyC') { if (U.cpOpen) U.closeCompendium(); else if (!overlayOpen()) U.openCompendium(); }
        else if (e.code === 'KeyM' || e.code === 'KeyT') { if (U.mapOpen) U.closeMap(); else if (!overlayOpen()) U.openMap(); }
        else if (e.code === 'KeyH') { if (U.helpOpen) U.closeHelp(); else if (!overlayOpen()) U.openHelp(); }
        else if (e.code === 'Tab') { if (U.invOpen) U.closeInventory(); else if (!overlayOpen()) U.openInventory(); }
        else if (e.code === 'F2') { screenshot(); }
        else if (e.code === 'F3') { G.debug = !G.debug; $('debug').classList.toggle('hidden', !G.debug); }
        else if (e.code === 'KeyF') { E.fastTime = !E.fastTime; U.toast('⏩', '', 'Time', E.fastTime ? 'Fast-forwarding the day/night cycle' : 'Normal speed'); }
        syncEnabled();
    }

    function screenshot() {
        E.renderer.render(E.scene, E.camera);
        canvas.toBlob(b => { if (!b) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'cv-world-' + Date.now() + '.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); });
        U.toast('📷', '', 'Screenshot saved', 'Check your downloads folder');
    }

    function closeFinale() { U.finaleOpen = false; $('finale').classList.add('hidden'); U.onResume(); }

    /* ---------- UI bindings ---------- */
    function bindUI() {
        $('btnPlay').onclick = G.play; $('btnTour').onclick = G.startTour;
        $('btnResume').onclick = resume;
        $('btnCompendium').onclick = () => { $('pause').classList.add('hidden'); G.state = 'play'; syncEnabled(); U.openCompendium(); syncEnabled(); };
        $('btnMapP').onclick = () => { $('pause').classList.add('hidden'); G.state = 'play'; syncEnabled(); U.openMap(); syncEnabled(); };
        $('pnClose').onclick = () => { U.closePanel(); syncEnabled(); };
        $('panel').addEventListener('mousedown', e => { if (e.target === $('panel')) { U.closePanel(); syncEnabled(); } });
        $('bmClose').onclick = () => { U.closeMap(); syncEnabled(); };
        $('cpClose').onclick = () => { U.closeCompendium(); syncEnabled(); };
        $('btnFinClose').onclick = () => { closeFinale(); syncEnabled(); };
        $('btnMap').onclick = () => { if (G.state === 'play' && !overlayOpen()) { U.openMap(); syncEnabled(); } };
        $('btnCV').onclick = () => { if (G.state === 'play' && !overlayOpen()) { U.openCompendium(); syncEnabled(); } };
        $('btnHelp').onclick = () => { if (G.state === 'play' && !overlayOpen()) { U.openHelp(); syncEnabled(); } };
        $('btnHelpP').onclick = () => { $('pause').classList.add('hidden'); G.state = 'play'; syncEnabled(); U.openHelp(); syncEnabled(); };
        $('btnHelpM').onclick = () => { U.openHelp(); };
        $('hpClose').onclick = () => { if (G.state === 'menu') { U.closeHelp(true); return; } U.closeHelp(); syncEnabled(); };
        $('invClose').onclick = () => { U.closeInventory(); syncEnabled(); };
        $('btnSound').onclick = () => { A.setMuted(!A.muted); $('btnSound').textContent = A.muted ? '🔇' : '🔊'; };
        $('dialog').onclick = () => U.advanceDialog();
        canvas.addEventListener('mousedown', () => { if (G.state === 'tour') endTour(); else if (U.dialogOpen) U.advanceDialog(); }, true);
        canvas.addEventListener('click', () => { if (G.state === 'play' && !isTouch && !P.locked && !overlayOpen()) lockSoon(); });
        document.addEventListener('keydown', e => { if (G.state === 'pause' || G.state === 'tour') onKey(e); });
        // close panel/map/compendium with E/Esc once the pointer is unlocked (P.enabled may be false), fallback handler:
        document.addEventListener('keydown', e => {
            if (G.state !== 'play' || P.enabled) return;
            if (e.code === 'Escape' || e.code === 'KeyE' || (e.code === 'KeyH' && U.helpOpen) || (e.code === 'Tab' && U.invOpen) || (e.code === 'KeyC' && U.cpOpen) || ((e.code === 'KeyM' || e.code === 'KeyT') && U.mapOpen)) { e.preventDefault(); onKey(e); syncEnabled(); }
        });
        setupTouch();
    }

    function setupTouch() {
        if (!isTouch) return;
        const joy = $('joy'), k = $('joyK'); let jid = null, lid = null, lx = 0, ly = 0;
        function jm(t) { const r = joy.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; let dx = t.clientX - cx, dy = t.clientY - cy; const m = r.width / 2, l = Math.hypot(dx, dy); if (l > m) { dx *= m / l; dy *= m / l; } k.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; P.touch.mx = dx / m; P.touch.mz = dy / m; P.touch.active = true; }
        joy.addEventListener('touchstart', e => { e.preventDefault(); jid = e.changedTouches[0].identifier; jm(e.changedTouches[0]); }, { passive: false });
        joy.addEventListener('touchmove', e => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === jid) jm(t); }, { passive: false });
        const je = e => { for (const t of e.changedTouches) if (t.identifier === jid) { jid = null; k.style.transform = ''; P.touch.mx = P.touch.mz = 0; P.touch.active = false; } };
        joy.addEventListener('touchend', je); joy.addEventListener('touchcancel', je);
        canvas.addEventListener('touchstart', e => { if (!P.enabled) return; const t = e.changedTouches[0]; lid = t.identifier; lx = t.clientX; ly = t.clientY; }, { passive: true });
        canvas.addEventListener('touchmove', e => { for (const t of e.changedTouches) if (t.identifier === lid) { P.yaw -= (t.clientX - lx) * 0.006; P.pitch = Math.max(-1.5, Math.min(1.5, P.pitch - (t.clientY - ly) * 0.006)); lx = t.clientX; ly = t.clientY; } }, { passive: true });
        const hold = (el, on, off) => { el.addEventListener('touchstart', e => { e.preventDefault(); on(); }, { passive: false }); el.addEventListener('touchend', e => { e.preventDefault(); off && off(); }, { passive: false }); };
        hold($('tJump'), () => { P.touch.jump = true; }, () => { P.touch.jump = false; });
        hold($('tAct'), () => { if (U.panelOpen) { U.closePanel(); syncEnabled(); } else if (P.enabled || U.dialogOpen) interact(); });
        hold($('tBreak'), () => { P.leftDown(); }, () => { P.mouseDown = false; P.skipMine = false; });
        hold($('tPlace'), () => P.placeBlock());
        hold($('tMenu'), () => { if (!overlayOpen()) { U.openCompendium(); syncEnabled(); } });
    }

    /* ---------- main loop ---------- */
    function loop(now) {
        requestAnimationFrame(loop);
        const dt = Math.min(0.05, (now - G.last) / 1000 || 0.016); G.last = now; G.t += dt; G.frame++;
        if (G.state === 'tour') { updateTour(dt); }
        else if (G.state === 'play' || G.state === 'menu' || G.state === 'pause') {
            if (G.state === 'play') { syncEnabled(); if (P.enabled) P.update(dt); else { P.keys = {}; P.vel.x *= 0.8; P.vel.z *= 0.8; P.update(dt * (U.dialogOpen ? 1 : 0)); } U.playTime += dt; }
            else { // menu: camera slowly orbits the plaza
                const a = G.t * 0.12; E.camera.position.set(Math.cos(a) * 22, W.BASE + 14, Math.sin(a) * 22 + 2); E.camera.lookAt(0, W.BASE + 3, 0);
            }
        }
        E.advance(dt); if (E.dirty.size) E.flushDirty();
        const cp = E.camera.position; E.updateSky(cp);
        X.update(dt, G.t, G.state === 'tour' ? cp : P.pos);
        window.CVM.update(dt, G.t, G.state === 'tour' ? cp : P.pos);
        if (G.state === 'play') hud(dt);
        E.renderer.render(E.scene, E.camera);
    }

    function hud(dt) {
        $('waterOverlay').classList.toggle('on', !!P.headInWater);
        if (P.inWater && !G.wasWater) A.play('splash'); G.wasWater = P.inWater;
        if (P.vel.y > 8 && G.lastVy <= 8) A.play('jump'); G.lastVy = P.vel.y;
        if (G.debug && G.frame % 10 === 0) {
            const fps = Math.round(1 / Math.max(dt, 0.001)), p = P.pos, t = P.target;
            const dirs = ['south', 'west', 'north', 'east'];
            $('debug').textContent = 'CV World  ' + fps + ' fps\nXYZ: ' + p.x.toFixed(2) + ' / ' + p.y.toFixed(2) + ' / ' + p.z.toFixed(2) +
                '\nFacing: ' + dirs[Math.round((((P.yaw % 6.2832) + 6.2832) % 6.2832) / 1.5708) % 4] + '  pitch ' + (P.pitch * 57.2958).toFixed(0) +
                '\nTime: ' + E.timeLabel() + '  Area: ' + U.areaAt(p.x, p.z) +
                '\nTarget: ' + (t ? W.DEF[t.id].name + ' ' + t.x + ' ' + t.y + ' ' + t.z : 'none') + '\nFlying: ' + P.flying + '  Sprint: ' + P.sprint;
        }
        if (G.frame % 6 === 0) { U.drawMinimap(P.pos, P.yaw); $('timeTxt').textContent = E.timeLabel() + (E.isNight ? ' 🌙' : ' ☀️'); }
        G.areaT += dt;
        if (G.areaT > 0.4) {
            G.areaT = 0;
            if (!U.delved) for (const d of W.dungeons) if (Math.abs(P.pos.x - (d.rx + 5)) < 3 && Math.abs(P.pos.z - d.rz) < 3 && P.pos.y < 12) { U.delved = true; U.checkAchv(); } $('locName').textContent = U.areaAt(P.pos.x, P.pos.z);
            CV.landmarks.forEach(l => { if (Math.hypot(P.pos.x - l.x, P.pos.z - l.z) < 12) U.visitArea(l.id); });
            if (G.frame % 120 === 0 && E.isNight) U.checkAchv();
        }
        // interaction hint
        const n = X.nearestNPC(P.pos, 3.4); let hot = false;
        if (U.dialogOpen) U.hint(null);
        else if (P.enabled && n) { U.hint('[E] Talk to ' + n.data.name); hot = true; }
        else if (P.enabled && P.target) {
            const i = W.infoMap.get(P.target.x + ',' + P.target.y + ',' + P.target.z);
            const held = P.held(), CI = window.CVI, tid = P.target.id, bt = CI.bestTool(tid);
            if (i) { U.hint('[E] / Right-click: view "' + i.label + '"'); hot = true; }
            else if (P.mouseDown && bt && !(CI.isTool(held) && CI.TOOLS[held].eff === (bt === 'pickaxe' ? 'pick' : bt)) && P.breakT > 0.6) U.hint('Tip: a ' + bt + ' mines ' + W.DEF[tid].name + ' much faster (select it with 1-4)');
            else if (!U.panelOpen && !(U.introDone && G.t < 6)) U.hint(null);
        } else if (!(U.introDone && G.t < 6)) U.hint(null);
        $('crosshair').classList.toggle('hot', hot);
    }

    boot();
})();
