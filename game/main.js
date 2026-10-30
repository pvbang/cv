/* CV World — khởi tạo, vòng lặp chính, điều khiển, tham quan tự động */
(function () {
    'use strict';
    const $ = id => document.getElementById(id);
    const canvas = $('gl');
    const isTouch = ('ontouchstart' in window) && window.matchMedia('(pointer: coarse)').matches;
    const G = { state: 'loading', last: 0, t: 0, frame: 0, areaT: 0, tour: null };
    window.CVG = G;

    function fail(msg) { const el = $('ldTxt'); el.style.color = '#f87171'; el.textContent = msg; }
    if (!window.THREE) { fail('Không tải được three.js (cần Internet lần đầu). Hãy tải lại trang.'); return; }

    const W = window.CVW, E = window.CVE, P = window.CVP, X = window.CVX, A = window.CVA, U = window.CVU, CV = window.CV_DATA;
    const step = (p, t) => { $('ldBar').style.width = p + '%'; $('ldTxt').textContent = t; };
    const wait = () => new Promise(r => setTimeout(r, 30));

    async function boot() {
        try {
            step(8, 'Tạo địa hình…'); await wait();
            W.buildAll(CV);
            step(40, 'Dựng công trình & chunk…'); await wait();
            E.init(canvas);
            step(75, 'Triệu hồi NPC & Knowledge Shard…'); await wait();
            X.init(); U.buildMap(); U.load(); U.applyLoaded();
            P.bindInput(canvas); bindUI(); P.onEvent = onPlayerEvent;
            const s = W.landmarks.spawn; P.teleport(s.x, s.y, s.z, 0);
            U.buildHotbar(); U.refreshHUD(); E.updateSky(P.pos);
            X.onShard = id => { A.play('shard'); U.toast('💎', 'shard', 'Knowledge Shard ' + (X.collected.size) + '/' + CV.shards.length, CV.shards[id]); U.refreshHUD(); U.checkAchv(); };
            let pc = 0; X.onPortal = () => { const n = performance.now(); if (n - pc < 4000) return; pc = n; A.play('portal'); const c = W.landmarks.contact; P.teleport(c.x, c.y, c.z, Math.PI); U.openSection('contact'); };
            step(100, 'Sẵn sàng!'); await wait();
            $('loading').classList.add('out'); setTimeout(() => $('loading').remove(), 600);
            $('menu').classList.remove('hidden'); G.state = 'menu';
            if (U.visited.size || X.collected.size) $('btnPlay').textContent = '▶ TIẾP TỤC HÀNH TRÌNH (' + U.visited.size + '/6 · ' + X.collected.size + '/12💎)';
            requestAnimationFrame(loop);
        } catch (e) { console.error(e); fail('Lỗi khởi tạo: ' + e.message); }
    }

    /* ---------- trạng thái chơi ---------- */
    function overlayOpen() { return U.panelOpen || U.mapOpen || U.cpOpen || U.finaleOpen; }
    function syncEnabled() { P.enabled = G.state === 'play' && !overlayOpen(); P.canInteract = P.enabled && !U.dialogOpen; }

    G.play = function () {
        A.init(); G.state = 'play'; $('menu').classList.add('hidden'); $('pause').classList.add('hidden'); $('hud').classList.remove('hidden');
        if (isTouch) { $('touch').classList.remove('hidden'); P.locked = true; } else lockSoon();
        if (!U.introDone) { U.introDone = true; setTimeout(() => U.hint('Đi tới NPC "Bang" gần đó rồi nhấn E để nói chuyện'), 600); setTimeout(() => U.hint(null), 6000); }
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

    /* ---------- tham quan tự động ---------- */
    G.startTour = function () {
        A.init(); $('menu').classList.add('hidden'); $('hud').classList.remove('hidden'); G.state = 'tour';
        const stops = CV.landmarks.map(l => ({ l, y: W.BASE })).concat([{ l: { name: 'Secret Summit', x: -38, z: -36, sign: 'SECRET', icon: '🏔️', color: 0x4ff2e4 }, y: W.topY(-38, -36) }]);
        G.tour = { i: 0, t: 0, stops, dur: 5 };
        P.enabled = false; P.canInteract = false; U.hint('Tham quan tự động — click hoặc nhấn Esc để tự chơi'); showTourToast();
    };
    function showTourToast() { const s = G.tour.stops[G.tour.i].l; U.toast(s.icon || '📍', '', 'Điểm ' + (G.tour.i + 1) + '/' + G.tour.stops.length, s.name); }
    function endTour() { G.tour = null; U.hint(null); const s = W.landmarks.spawn; P.teleport(s.x, s.y, s.z, 0); G.play(); }
    function updateTour(dt) {
        const T = G.tour; T.t += dt;
        if (T.t > T.dur) { T.t = 0; T.i++; if (T.i >= T.stops.length) { endTour(); return; } showTourToast(); }
        const s = T.stops[T.i], a = T.t * 0.35 + T.i, R = 17, y = s.y + 9 + Math.sin(T.t) * 1.5;
        const cam = E.camera; cam.position.set(s.l.x + Math.cos(a) * R, y, s.l.z + Math.sin(a) * R);
        cam.lookAt(s.l.x, s.y + 6, s.l.z); P.pos.set(s.l.x, s.y + 2, s.l.z);
        U.areaOn = s.l.name; $('locName').textContent = s.l.name;
    }

    /* ---------- sự kiện từ player ---------- */
    function onPlayerEvent(k, d) {
        if (k === 'step') A.play('step');
        else if (k === 'break') { A.play('break'); X.blockBurst(d.x, d.y, d.z, d.id); }
        else if (k === 'place') { A.play('place'); U.placed++; if (U.placed % 5 === 0) U.checkAchv(); }
        else if (k === 'infoHit' || k === 'interact') U.openInfo(d);
        else if (k === 'hotbar') U.buildHotbar();
        else if (k === 'fly') U.toast(d ? '🕊️' : '🚶', '', d ? 'Chế độ bay' : 'Chế độ đi bộ', d ? 'Space bay lên · Shift/Q xuống · bấm đúp Space để tắt' : 'Đã tắt chế độ bay');
        else if (k === 'lock') { if (!d && G.state === 'play' && !overlayOpen()) showPause(); }
        else if (k === 'key') onKey(d);
    }

    function interact() {
        if (U.dialogOpen) { U.advanceDialog(); return; }
        const n = X.nearestNPC(P.pos, 3.4); if (n) { U.startDialog(n); return; }
        if (P.target) { const i = W.infoMap.get(P.target.x + ',' + P.target.y + ',' + P.target.z); if (i) U.openInfo(i); }
    }

    function onKey(e) {
        if (G.state === 'tour') { if (e.code === 'Escape') endTour(); return; }
        if (G.state === 'pause') { if (e.code === 'Escape') resume(); return; }
        if (G.state !== 'play') return;
        if (e.code === 'Escape') { if (U.panelOpen) U.closePanel(); else if (U.mapOpen) U.closeMap(); else if (U.cpOpen) U.closeCompendium(); else if (U.finaleOpen) closeFinale(); else if (U.dialogOpen) U.advanceDialog(); else showPause(); return; }
        if (e.repeat) return;
        if (e.code === 'KeyE') { if (U.panelOpen) U.closePanel(); else if (!overlayOpen()) interact(); }
        else if (e.code === 'KeyC') { if (U.cpOpen) U.closeCompendium(); else if (!overlayOpen()) U.openCompendium(); }
        else if (e.code === 'KeyM' || e.code === 'KeyT') { if (U.mapOpen) U.closeMap(); else if (!overlayOpen()) U.openMap(); }
        else if (e.code === 'KeyF') { E.fastTime = !E.fastTime; U.toast('⏩', '', 'Thời gian', E.fastTime ? 'Tua nhanh ngày/đêm' : 'Tốc độ bình thường'); }
        syncEnabled();
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
        $('btnSound').onclick = () => { A.setMuted(!A.muted); $('btnSound').textContent = A.muted ? '🔇' : '🔊'; };
        $('dialog').onclick = () => U.advanceDialog();
        canvas.addEventListener('mousedown', () => { if (G.state === 'tour') endTour(); else if (U.dialogOpen) U.advanceDialog(); }, true);
        canvas.addEventListener('click', () => { if (G.state === 'play' && !isTouch && !P.locked && !overlayOpen()) lockSoon(); });
        document.addEventListener('keydown', e => { if (G.state === 'pause' || G.state === 'tour') onKey(e); });
        // đóng panel/map/compendium bằng E/Esc khi pointer đã unlock: onKey đã xử lý qua P.onEvent('key') (P.enabled có thể false) -> dự phòng:
        document.addEventListener('keydown', e => {
            if (G.state !== 'play' || P.enabled) return;
            if (e.code === 'Escape' || e.code === 'KeyE' || (e.code === 'KeyC' && U.cpOpen) || ((e.code === 'KeyM' || e.code === 'KeyT') && U.mapOpen)) { e.preventDefault(); onKey(e); syncEnabled(); }
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
        hold($('tBreak'), () => { P.mouseDown = true; P.breakBlock(); }, () => { P.mouseDown = false; });
        hold($('tPlace'), () => P.placeBlock());
        hold($('tMenu'), () => { if (!overlayOpen()) { U.openCompendium(); syncEnabled(); } });
    }

    /* ---------- vòng lặp ---------- */
    function loop(now) {
        requestAnimationFrame(loop);
        const dt = Math.min(0.05, (now - G.last) / 1000 || 0.016); G.last = now; G.t += dt; G.frame++;
        if (G.state === 'tour') { updateTour(dt); }
        else if (G.state === 'play' || G.state === 'menu' || G.state === 'pause') {
            if (G.state === 'play') { syncEnabled(); if (P.enabled) P.update(dt); else { P.keys = {}; P.vel.x *= 0.8; P.vel.z *= 0.8; P.update(dt * (U.dialogOpen ? 1 : 0)); } U.playTime += dt; }
            else { // menu: camera xoay chậm quanh quảng trường
                const a = G.t * 0.12; E.camera.position.set(Math.cos(a) * 22, W.BASE + 14, Math.sin(a) * 22 + 2); E.camera.lookAt(0, W.BASE + 3, 0);
            }
        }
        E.advance(dt); if (E.dirty.size) E.flushDirty();
        const cp = E.camera.position; E.updateSky(cp);
        X.update(dt, G.t, G.state === 'tour' ? cp : P.pos);
        if (G.state === 'play') hud(dt);
        E.renderer.render(E.scene, E.camera);
    }

    function hud(dt) {
        $('waterOverlay').classList.toggle('on', !!P.headInWater);
        if (P.inWater && !G.wasWater) A.play('splash'); G.wasWater = P.inWater;
        if (P.vel.y > 8 && G.lastVy <= 8) A.play('jump'); G.lastVy = P.vel.y;
        if (G.frame % 6 === 0) { U.drawMinimap(P.pos, P.yaw); $('timeTxt').textContent = E.timeLabel() + (E.isNight ? ' 🌙' : ' ☀️'); }
        G.areaT += dt;
        if (G.areaT > 0.4) {
            G.areaT = 0; $('locName').textContent = U.areaAt(P.pos.x, P.pos.z);
            CV.landmarks.forEach(l => { if (Math.hypot(P.pos.x - l.x, P.pos.z - l.z) < 12) U.visitArea(l.id); });
            if (G.frame % 120 === 0 && E.isNight) U.checkAchv();
        }
        // gợi ý tương tác
        const n = X.nearestNPC(P.pos, 3.4); let hot = false;
        if (U.dialogOpen) U.hint(null);
        else if (P.enabled && n) { U.hint('[E] Nói chuyện với ' + n.data.name); hot = true; }
        else if (P.enabled && P.target) {
            const i = W.infoMap.get(P.target.x + ',' + P.target.y + ',' + P.target.z);
            if (i) { U.hint('[E] / Chuột phải: xem "' + i.label + '"'); hot = true; } else if (!U.panelOpen && !(U.introDone && G.t < 6)) U.hint(null);
        } else if (!(U.introDone && G.t < 6)) U.hint(null);
        $('crosshair').classList.toggle('hot', hot);
    }

    boot();
})();
