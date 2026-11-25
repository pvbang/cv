/* CV World — Bootstrap, Software-WebGL-Safe Loop, Controls, Multi-Portal Warp, Weather, Camera & Auto Tour */
(function () {
    'use strict';
    const $ = id => document.getElementById(id);
    const canvas = $('gl');
    const isTouch = ('ontouchstart' in window) && window.matchMedia('(pointer: coarse)').matches;
    const G = { state: 'loading', last: 0, t: 0, frame: 0, areaT: 0, tour: null, hurtFlash: 0 };
    window.CVG = G;

    function fail(msg) { const el = $('ldTxt'); el.style.color = '#f87171'; el.textContent = msg; }
    if (!window.THREE) { fail('Could not load three.js (an Internet connection is needed the first time). Please reload the page.'); return; }

    const W = window.CVW, E = window.CVE, P = window.CVP, X = window.CVX, A = window.CVA, U = window.CVU, M = window.CVM, CV = window.CV_DATA;
    const step = (p, t) => { $('ldBar').style.width = p + '%'; $('ldTxt').textContent = t; };
    const wait = () => new Promise(r => setTimeout(r, 26));

    /* ---------- Software-WebGL Frame Pacing (WebGL2 fenceSync) ---------- */
    let swGl = null;
    function scheduleNext(fn) {
        if (!E.isSoftwareGl) { requestAnimationFrame(fn); return; }
        if (!swGl && E.renderer) swGl = E.renderer.getContext();
        if (swGl && typeof WebGL2RenderingContext !== 'undefined' && swGl instanceof WebGL2RenderingContext) {
            const sync = swGl.fenceSync(swGl.SYNC_GPU_COMMANDS_COMPLETE, 0);
            swGl.flush();
            (function poll() {
                if (swGl.clientWaitSync(sync, 0, 0) === swGl.TIMEOUT_EXPIRED) { setTimeout(poll, 5); return; }
                swGl.deleteSync(sync);
                setTimeout(() => requestAnimationFrame(fn), 80);
            })();
        } else {
            setTimeout(() => requestAnimationFrame(fn), 80);
        }
    }

    async function boot() {
        try {
            step(10, 'Sculpting mountains, caves, volcano & biomes…'); await wait();
            W.buildAll(CV);
            step(45, 'Building pixel-art shaders & voxel chunks…'); await wait();
            E.init(canvas);
            step(78, 'Summoning NPCs, animals, monsters & portals…'); await wait();
            X.init(); M.init(); U.buildMap(); U.load(); U.applyLoaded();
            P.bindInput(canvas); bindUI(); P.onEvent = onPlayerEvent;
            const s = W.landmarks.spawn; P.teleport(s.x, s.y, s.z, 0);
            U.buildHotbar(); U.itemNameReady = true;
            U.updateHealth(P.hp, P.maxHp); U.updateXp(P.xp, P.level);
            U.refreshHUD(); E.updateSky(P.pos, P.heldEmit());

            X.onShard = id => {
                A.play('shard');
                U.toast('💎', 'shard', 'Knowledge Shard ' + X.collected.size + '/' + CV.shards.length, CV.shards[id]);
                U.refreshHUD(); U.checkAchv();
            };

            let portalCd = 0;
            const DIM_DESCS = {
                overworld: { col: 'rgba(56,189,248,0.85)', burst: 0x38bdf8, msg: 'Returned to the Overworld CV Island!' },
                nether:    { col: 'rgba(255,92,24,0.88)',  burst: 0xff6a1a, msg: 'Lava seas, crimson fungi forests & the Nether Fortress await!' },
                aether:    { col: 'rgba(125,228,255,0.88)', burst: 0x7dd3fc, msg: 'Low gravity! Leap across floating Sky Islands & the Golden Temple.' },
                cosmos:    { col: 'rgba(192,132,252,0.88)', burst: 0xc084fc, msg: 'Lunar gravity! Drift among floating asteroids & the Cosmic Citadel.' },
                dungeon:   { col: 'rgba(52,211,153,0.88)',  burst: 0x34d399, msg: 'Multi-wing ancient fortress — explore the Treasury, Library & Amethyst Sanctum!' }
            };

            G.travelToDimension = function (dimId, spotId) {
                if (!W.DIM_META[dimId]) return;
                portalCd = performance.now();
                A.play('portal');
                const meta = DIM_DESCS[dimId] || DIM_DESCS.overworld;
                const ov = $('warpOverlay');
                if (ov) {
                    ov.style.background = 'radial-gradient(circle, ' + meta.col + ', rgba(10, 8, 28, 0.96))';
                    ov.classList.add('on');
                }
                setTimeout(() => {
                    W.switchDimension(dimId);
                    E.rebuildAllChunks();
                    X.rebuildForDimension();
                    M.rebuildForDimension();
                    U.buildMap();
                    const sp = (spotId && W.landmarks[spotId]) || W.landmarks.spawn || { x: 0, y: W.BASE + 2, z: 0 };
                    const yaw = dimId === 'overworld' ? 0 : Math.PI;
                    P.teleport(sp.x, sp.y, sp.z, yaw);
                    E.updateSky(P.pos, P.heldEmit());
                    X.burst(P.pos.x, P.pos.y + 1, P.pos.z, meta.burst, 38, 6.5, 2.5);
                    U.visitedDims.add(dimId);
                    U.checkAchv();
                    U.refreshHUD();
                    U.syncSettingsUI();
                    const dm = W.DIM_META[dimId];
                    U.toast(dm.icon, 'shard', dm.name, meta.msg);
                    if (ov) setTimeout(() => ov.classList.remove('on'), 180);
                }, 130);
            };
            U.onTravelDim = dimId => G.travelToDimension(dimId, 'spawn');

            X.onPortal = portal => {
                const now = performance.now();
                if (now - portalCd < 3200) return;
                portalCd = now;
                if (portal.id === 'contact') {
                    A.play('portal');
                    const c = W.landmarks.contact;
                    P.teleport(c.x, c.y, c.z, Math.PI);
                    U.openSection('contact');
                } else if (portal.toDim) {
                    G.travelToDimension(portal.toDim, portal.toSpot);
                }
            };

            step(100, 'Ready!'); await wait();
            $('loading').classList.add('out'); setTimeout(() => $('loading').remove(), 550);
            $('menu').classList.remove('hidden'); G.state = 'menu';
            if (U.visited.size || X.collected.size) {
                $('btnPlay').textContent = '▶ CONTINUE JOURNEY (' + U.visited.size + '/6 · ' + X.collected.size + '/12💎)';
            }
            G.last = performance.now();
            scheduleNext(loop);
        } catch (e) { console.error(e); fail('Startup error: ' + e.message); }
    }

    /* ---------- Play State & Non-Intrusive Pointer Lock UX ---------- */
    function overlayOpen() { return U.panelOpen || U.mapOpen || U.cpOpen || U.finaleOpen || U.helpOpen || U.invOpen; }
    function syncEnabled() {
        P.enabled = G.state === 'play' && !overlayOpen();
        P.canInteract = P.enabled && !U.dialogOpen;
        const tip = $('lockTip');
        if (tip) tip.classList.toggle('hidden', isTouch || G.state !== 'play' || P.locked || overlayOpen() || U.dialogOpen);
    }

    G.play = function () {
        A.init(); G.state = 'play';
        $('menu').classList.add('hidden'); $('pause').classList.add('hidden'); $('hud').classList.remove('hidden');
        if (isTouch) { $('touch').classList.remove('hidden'); P.locked = true; }
        else P.lock(canvas);
        if (!U.introDone) {
            U.introDone = true;
            setTimeout(() => U.hint('Talk to Bang (E) · 1-4 tools, 5-9 blocks · F5 camera · U rain · G peaceful · H guide'), 600);
            setTimeout(() => U.hint(null), 6500);
        }
        syncEnabled();
    };

    U.onResume = function () {
        syncEnabled();
        if (G.state === 'play' && !overlayOpen() && !isTouch) P.lock(canvas);
    };

    function showPause() {
        if (G.state !== 'play') return;
        G.state = 'pause';
        if (document.exitPointerLock) document.exitPointerLock();
        $('pause').classList.remove('hidden');
        syncEnabled();
    }

    function resume() {
        $('pause').classList.add('hidden');
        G.state = 'play';
        if (isTouch) P.locked = true; else P.lock(canvas);
        syncEnabled();
    }

    /* ---------- Quick Mode Toggles ---------- */
    function cycleCamera() {
        E.camMode = (E.camMode + 1) % 3;
        const names = ['1st Person', '3rd Person (Back)', '3rd Person (Front)'];
        const btn = $('btnCam'); if (btn) btn.title = 'Camera: ' + names[E.camMode];
        U.toast('🎥', '', 'Camera View', names[E.camMode]);
        U.syncSettingsUI();
    }

    function toggleWeather() {
        const w = X.toggleWeather();
        const btn = $('btnWeather'); if (btn) btn.textContent = w === 'rain' ? '🌧️' : '☀️';
        U.toast(w === 'rain' ? '🌧️' : '☀️', '', 'Weather', w === 'rain' ? 'Rain & alpine snowfall enabled' : 'Clear skies restored');
        U.syncSettingsUI();
    }

    function togglePeaceful() {
        M.peaceful = !M.peaceful;
        const btn = $('btnPeace'); if (btn) btn.textContent = M.peaceful ? '🕊️' : '⚔️';
        U.toast(M.peaceful ? '🕊️' : '⚔️', '', 'Difficulty', M.peaceful ? 'Peaceful Mode — monsters hidden' : 'Adventure Mode — monsters active in caves & wilderness');
        U.syncSettingsUI();
    }

    /* ---------- Auto Tour ---------- */
    G.startTour = function () {
        A.init();
        if (W.dim !== 'overworld') {
            W.switchDimension('overworld');
            E.rebuildAllChunks(); X.rebuildForDimension(); M.rebuildForDimension(); U.buildMap();
        }
        $('menu').classList.add('hidden'); $('hud').classList.remove('hidden'); G.state = 'tour';
        const stops = CV.landmarks.map(l => ({ l, y: W.BASE })).concat([
            { l: { name: 'Dimensional Gateways', x: -16, z: -18, icon: '🌀' }, y: W.BASE + 2 },
            { l: { name: 'Cherry Blossom Grove', x: -58, z: 44, icon: '🌸' }, y: W.WATER + 2 },
            { l: { name: 'Secret Alpine Summit', x: -56, z: -54, icon: '🏔️' }, y: W.topY(-56, -54) },
            { l: { name: 'Volcanic Caldera', x: 64, z: -56, icon: '🌋' }, y: 15 }
        ]);
        G.tour = { i: 0, t: 0, stops, dur: 5.2 };
        P.enabled = false; P.canInteract = false;
        U.hint('Scenic Auto Tour — click or press Esc to take control');
        showTourToast();
    };
    function showTourToast() { const s = G.tour.stops[G.tour.i].l; U.toast(s.icon || '📍', '', 'Stop ' + (G.tour.i + 1) + '/' + G.tour.stops.length, s.name); }
    function endTour() { G.tour = null; U.hint(null); const s = W.landmarks.spawn; P.teleport(s.x, s.y, s.z, 0); G.play(); }
    function updateTour(dt) {
        const T = G.tour; T.t += dt;
        if (T.t > T.dur) { T.t = 0; T.i++; if (T.i >= T.stops.length) { endTour(); return; } showTourToast(); }
        const s = T.stops[T.i], a = T.t * 0.36 + T.i, R = 18, y = s.y + 10 + Math.sin(T.t) * 1.6;
        const cam = E.camera; cam.position.set(s.l.x + Math.cos(a) * R, y, s.l.z + Math.sin(a) * R);
        cam.lookAt(s.l.x, s.y + 5, s.l.z); P.pos.set(s.l.x, s.y + 2, s.l.z);
        $('locName').textContent = s.l.name;
    }

    /* ---------- Player Events ---------- */
    const ORE_SET = new Set([W.B.COAL, W.B.IRON, W.B.GOLD_ORE, W.B.DIAMOND, W.B.REDSTONE_ORE, W.B.EMERALD, W.B.AMETHYST]);

    function onPlayerEvent(k, d) {
        if (k === 'step') A.play('step', d);
        else if (k === 'mineTick') { A.play('mineTick'); if (d) X.burst(d.x + 0.5, d.y + 0.5, d.z + 0.5, 0xcccccc, 3, 2.5, 9); }
        else if (k === 'break') {
            A.play('break');
            X.blockBurst(d.x, d.y, d.z, d.id);
            if (ORE_SET.has(d.id)) X.spawnXp(d.x + 0.5, d.y + 0.5, d.z + 0.5, d.id === W.B.DIAMOND || d.id === W.B.EMERALD ? 4 : 2);
        }
        else if (k === 'hit') {
            A.play(d.killed ? 'mobdie' : 'hurt');
            X.burst(d.x, d.y, d.z, d.killed ? 0xffffff : 0xd83a3a, d.killed ? 20 : 7, 3.6, 8);
            if (d.killed) {
                U.kills++;
                if (d.hostile) U.monsterKills++;
                U.checkAchv();
            }
        }
        else if (k === 'place') { A.play('place'); U.placed++; if (U.placed % 5 === 0) U.checkAchv(); }
        else if (k === 'infoHit' || k === 'interact') U.openInfo(d);
        else if (k === 'hotbar') U.buildHotbar();
        else if (k === 'fly') U.toast(d ? '🕊️' : '🚶', '', d ? 'Flight Mode' : 'Walking Mode', d ? 'Space up · Shift/Q down · double-tap Space to land' : 'Gravity restored');
        else if (k === 'lock') syncEnabled();
        else if (k === 'key') onKey(d);
        else if (k === 'playerHurt') {
            A.play('playerHurt');
            G.hurtFlash = 0.45;
            U.updateHealth(P.hp, P.maxHp);
        }
        else if (k === 'heal') U.updateHealth(P.hp, P.maxHp);
        else if (k === 'respawn') {
            A.play('portal');
            U.updateHealth(P.hp, P.maxHp);
            U.toast('❤️', '', 'Respawned', 'Returned safely to Spawn Plaza');
        }
        else if (k === 'lava') {
            A.play('lava');
            X.burst(P.pos.x, P.pos.y + 0.5, P.pos.z, 0xff6a1a, 10, 4.2, 4);
        }
        else if (k === 'voidRescue') {
            A.play('portal');
            X.burst(P.pos.x, P.pos.y + 0.8, P.pos.z, 0x7dd3fc, 24, 5.2, 2);
            U.toast('✨', '', 'Void Rescue', 'Lifted safely back onto the ' + W.dimMeta.name + ' sanctuary');
        }
        else if (k === 'xp') U.updateXp(d.xp, d.level);
        else if (k === 'levelUp') {
            A.play('levelup');
            U.toast('⭐', 'achv', 'Level Up!', 'Reached Explorer Level ' + d);
        }
    }

    function interact() {
        if (U.dialogOpen) { U.advanceDialog(); return; }
        const n = X.nearestNPC(P.pos, 3.6);
        if (n) { U.startDialog(n); return; }
        if (P.target) {
            const i = W.infoMap.get(P.target.x + ',' + P.target.y + ',' + P.target.z);
            if (i) U.openInfo(i);
        }
    }

    function onKey(e) {
        if (e.__cvHandled) return; e.__cvHandled = true;
        if (G.state === 'tour') { if (e.code === 'Escape') endTour(); return; }
        if (G.state === 'pause') { if (e.code === 'Escape') resume(); return; }
        if (G.state !== 'play') return;

        if (e.code === 'Escape') {
            if (U.panelOpen) U.closePanel();
            else if (U.mapOpen) U.closeMap();
            else if (U.cpOpen) U.closeCompendium();
            else if (U.helpOpen) U.closeHelp();
            else if (U.invOpen) U.closeInventory();
            else if (U.finaleOpen) closeFinale();
            else if (U.dialogOpen) U.closeDialog();
            else showPause();
            syncEnabled();
            return;
        }
        if (e.repeat) return;
        if (e.code === 'KeyE') { if (U.panelOpen) U.closePanel(); else if (!overlayOpen()) interact(); }
        else if (e.code === 'KeyC') { if (U.cpOpen) U.closeCompendium(); else if (!overlayOpen()) U.openCompendium(); }
        else if (e.code === 'KeyM' || e.code === 'KeyT') { if (U.mapOpen) U.closeMap(); else if (!overlayOpen()) U.openMap(); }
        else if (e.code === 'KeyH') { if (U.helpOpen) U.closeHelp(); else if (!overlayOpen()) U.openHelp(); }
        else if (e.code === 'Tab') { e.preventDefault(); if (U.invOpen) U.closeInventory(); else if (!overlayOpen()) U.openInventory(); }
        else if (e.code === 'F5' || e.code === 'KeyR') { e.preventDefault(); if (!overlayOpen()) cycleCamera(); }
        else if (e.code === 'KeyU') { if (!overlayOpen()) toggleWeather(); }
        else if (e.code === 'KeyG') { if (!overlayOpen()) togglePeaceful(); }
        else if (e.code === 'F2') { e.preventDefault(); screenshot(); }
        else if (e.code === 'F3') { e.preventDefault(); G.debug = !G.debug; $('debug').classList.toggle('hidden', !G.debug); }
        else if (e.code === 'KeyF') { E.fastTime = !E.fastTime; U.toast('⏩', '', 'Day/Night Cycle', E.fastTime ? 'Fast-forward 14x' : 'Normal speed'); U.syncSettingsUI(); }
        syncEnabled();
    }

    function screenshot() {
        E.renderer.render(E.scene, E.camera);
        canvas.toBlob(b => {
            if (!b) return;
            const a = document.createElement('a'); a.href = URL.createObjectURL(b);
            a.download = 'cv-world-' + Date.now() + '.png'; a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        });
        U.toast('📷', '', 'Screenshot Saved', 'Saved PNG to downloads');
    }

    function closeFinale() { U.finaleOpen = false; $('finale').classList.add('hidden'); U.onResume(); }

    /* ---------- UI Bindings ---------- */
    function bindUI() {
        $('btnPlay').onclick = G.play;
        $('btnTour').onclick = G.startTour;
        $('btnResume').onclick = resume;
        $('btnCompendium').onclick = () => { $('pause').classList.add('hidden'); G.state = 'play'; U.openCompendium(); syncEnabled(); };
        $('btnMapP').onclick = () => { $('pause').classList.add('hidden'); G.state = 'play'; U.openMap(); syncEnabled(); };
        $('btnHelpP').onclick = () => { $('pause').classList.add('hidden'); G.state = 'play'; U.openHelp(); syncEnabled(); };
        $('btnHelpM').onclick = () => U.openHelp();

        $('pnClose').onclick = () => { U.closePanel(); syncEnabled(); };
        $('panel').addEventListener('mousedown', e => { if (e.target === $('panel')) { U.closePanel(); syncEnabled(); } });
        $('bmClose').onclick = () => { U.closeMap(); syncEnabled(); };
        $('cpClose').onclick = () => { U.closeCompendium(); syncEnabled(); };
        $('btnFinClose').onclick = () => { closeFinale(); syncEnabled(); };
        $('hpClose').onclick = () => { if (G.state === 'menu') { U.closeHelp(true); return; } U.closeHelp(); syncEnabled(); };
        $('invClose').onclick = () => { U.closeInventory(); syncEnabled(); };

        // Top-right HUD quick buttons
        $('btnMap').onclick = () => { if (G.state === 'play' && !overlayOpen()) { U.openMap(); syncEnabled(); } };
        $('btnCV').onclick = () => { if (G.state === 'play' && !overlayOpen()) { U.openCompendium(); syncEnabled(); } };
        $('btnHelp').onclick = () => { if (G.state === 'play' && !overlayOpen()) { U.openHelp(); syncEnabled(); } };
        $('btnSound').onclick = () => { A.setMuted(!A.muted); $('btnSound').textContent = A.muted ? '🔇' : '🔊'; };
        if ($('btnCam')) $('btnCam').onclick = () => { if (G.state === 'play') cycleCamera(); };
        if ($('btnWeather')) $('btnWeather').onclick = () => { if (G.state === 'play') toggleWeather(); };
        if ($('btnPeace')) $('btnPeace').onclick = () => { if (G.state === 'play') togglePeaceful(); };
        if ($('btnPauseHud')) $('btnPauseHud').onclick = () => { if (G.state === 'play' && !overlayOpen()) showPause(); };

        // Compendium tabs
        document.querySelectorAll('#cpTabs .tab-btn').forEach(b => {
            b.onclick = () => U.setCompendiumTab(b.dataset.tab);
        });
        // Inventory category tabs
        document.querySelectorAll('#invTabs .tab-btn').forEach(b => {
            b.onclick = () => U.setInvCat(b.dataset.cat);
        });

        // Settings buttons inside Help/Settings modal
        if ($('setPeaceful')) $('setPeaceful').onclick = () => { togglePeaceful(); A.play('click'); };
        if ($('setWeather')) $('setWeather').onclick = () => { toggleWeather(); A.play('click'); };
        if ($('setFastTime')) $('setFastTime').onclick = () => { E.fastTime = !E.fastTime; U.syncSettingsUI(); A.play('click'); };
        if ($('setCam')) $('setCam').onclick = () => { cycleCamera(); A.play('click'); };
        if ($('setFog')) $('setFog').oninput = e => { E.setFogDist(+e.target.value); const v = $('setFogVal'); if (v) v.textContent = e.target.value + 'm'; };
        if ($('setSens')) $('setSens').oninput = e => { P.sens = (+e.target.value) / 10000; const v = $('setSensVal'); if (v) v.textContent = (P.sens * 1000).toFixed(1); };
        if ($('btnResetProg')) $('btnResetProg').onclick = () => {
            const b = $('btnResetProg');
            if (b.dataset.confirm !== '1') {
                b.dataset.confirm = '1'; b.textContent = 'Click again to confirm reset';
                setTimeout(() => { b.dataset.confirm = ''; b.textContent = 'Reset Saved Progress'; }, 3500);
            } else { U.resetProgress(); }
        };

        $('dialog').onclick = () => U.advanceDialog();
        canvas.addEventListener('mousedown', () => {
            if (G.state === 'tour') endTour();
            else if (U.dialogOpen) U.advanceDialog();
        }, true);

        document.addEventListener('keydown', e => {
            if (G.state === 'pause' || G.state === 'tour') { onKey(e); return; }
            if (G.state !== 'play' || P.enabled) return;
            if (e.code === 'Escape' || e.code === 'KeyE' || (e.code === 'KeyH' && U.helpOpen) || (e.code === 'Tab' && U.invOpen) || (e.code === 'KeyC' && U.cpOpen) || ((e.code === 'KeyM' || e.code === 'KeyT') && U.mapOpen)) {
                e.preventDefault(); onKey(e); syncEnabled();
            }
        });
        setupTouch();
    }

    function setupTouch() {
        if (!isTouch) return;
        const joy = $('joy'), k = $('joyK'); let jid = null, lid = null, lx = 0, ly = 0;
        function jm(t) {
            const r = joy.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
            let dx = t.clientX - cx, dy = t.clientY - cy;
            const m = r.width / 2, l = Math.hypot(dx, dy);
            if (l > m) { dx *= m / l; dy *= m / l; }
            k.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
            P.touch.mx = dx / m; P.touch.mz = dy / m; P.touch.active = true;
        }
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

    /* ---------- Main Loop ---------- */
    function loop(now) {
        const dt = Math.min(0.05, (now - G.last) / 1000 || 0.016);
        G.last = now; G.t += dt; G.frame++;

        if (G.state === 'tour') {
            updateTour(dt);
        } else if (G.state === 'play' || G.state === 'menu' || G.state === 'pause') {
            if (G.state === 'play') {
                syncEnabled();
                if (P.enabled) P.update(dt);
                else { P.keys = {}; P.vel.x *= 0.8; P.vel.z *= 0.8; P.update(dt * (U.dialogOpen ? 1 : 0)); }
                U.playTime += dt;
            } else {
                // Scenic menu orbit showcasing the plaza, towers, mountains & volcano horizon
                const a = G.t * 0.11;
                E.camera.position.set(Math.cos(a) * 24, W.BASE + 14.5, Math.sin(a) * 24 + 2);
                E.camera.lookAt(0, W.BASE + 3.5, 0);
            }
        }

        E.advance(dt);
        if (E.dirty.size) E.flushDirty();
        const cp = E.camera.position;
        E.updateSky(cp, G.state === 'play' ? P.heldEmit() : 0);

        const actorPos = G.state === 'tour' ? cp : P.pos;
        X.update(dt, G.t, actorPos);
        M.update(dt, G.t, actorPos);

        if (G.state === 'play') hud(dt);
        E.renderer.render(E.scene, E.camera);
        scheduleNext(loop);
    }

    function hud(dt) {
        $('waterOverlay').classList.toggle('on', !!P.headInWater);
        if ($('lavaOverlay')) $('lavaOverlay').classList.toggle('on', !!P.inLava);
        if (G.hurtFlash > 0) {
            G.hurtFlash = Math.max(0, G.hurtFlash - dt);
            if ($('hurtOverlay')) $('hurtOverlay').style.opacity = (G.hurtFlash * 1.4).toFixed(2);
        } else if ($('hurtOverlay') && $('hurtOverlay').style.opacity !== '0') {
            $('hurtOverlay').style.opacity = '0';
        }

        if (P.inWater && !G.wasWater) A.play('splash');
        G.wasWater = P.inWater;
        if (P.vel.y > 8 && G.lastVy <= 8) A.play('jump');
        G.lastVy = P.vel.y;

        // Auto-close NPC dialogue if player walks away
        if (U.dialogOpen) {
            const active = U.activeNpc();
            if (active && active.dist > 7.2) U.closeDialog(true);
        }

        if (G.debug && G.frame % 10 === 0) {
            const fps = Math.round(1 / Math.max(dt, 0.001)), p = P.pos, t = P.target;
            const dirs = ['South (+Z)', 'West (-X)', 'North (-Z)', 'East (+X)'];
            const bx = Math.floor(p.x), by = Math.floor(p.y + 1), bz = Math.floor(p.z);
            const sl = W.getSkyLight(bx, by, bz), bl = W.getBlockLight(bx, by, bz);
            const bi = W.biomeMap[Math.max(0, Math.min(W.SZ - 1, bz + W.OZ)) * W.SX + Math.max(0, Math.min(W.SX - 1, bx + W.OX))];
            $('debug').textContent =
                'CV World · ' + fps + ' fps (' + (E.isSoftwareGl ? 'SoftwareGL' : 'WebGL GPU') + ')\n' +
                'Dim: ' + W.dimMeta.name + ' (g=' + W.dimMeta.gravity + 'x)  XYZ: ' + p.x.toFixed(1) + ' / ' + p.y.toFixed(1) + ' / ' + p.z.toFixed(1) + '\n' +
                'Facing: ' + dirs[Math.round((((P.yaw % 6.2832) + 6.2832) % 6.2832) / 1.5708) % 4] + '  Pitch: ' + (P.pitch * 57.3).toFixed(0) + '°\n' +
                'Area: ' + U.areaAt(p.x, p.z) + (W.dim === 'overworld' ? '  Biome: ' + (W.BIOME_NAMES[bi] || '?') : '') + '\n' +
                'Light: Sky ' + sl + '/15  Block ' + bl + '/15  Weather: ' + X.weather + '\n' +
                'Time: ' + E.timeLabel() + '  Mobs: ' + M.list.filter(m => !m.dead).length + '  Cam: ' + ['1P', '3P-B', '3P-F'][E.camMode] + '\n' +
                'Target: ' + (t ? W.DEF[t.id].name + ' [' + t.x + ',' + t.y + ',' + t.z + ']' : 'none');
        }

        if (G.frame % 6 === 0) {
            U.drawMinimap(P.pos, P.yaw);
            if (W.dim === 'nether') $('timeTxt').textContent = 'Eternal Ember 🔥';
            else if (W.dim === 'cosmos') $('timeTxt').textContent = 'Starlight 🌌';
            else if (W.dim === 'dungeon') $('timeTxt').textContent = 'Abyssal Depths 🏰';
            else if (W.dim === 'aether') $('timeTxt').textContent = 'Eternal Noon ☁️';
            else {
                const icon = X.weather === 'rain' ? '🌧️' : (E.isNight ? '🌙' : '☀️');
                $('timeTxt').textContent = E.timeLabel() + ' ' + icon;
            }
        }

        G.areaT += dt;
        if (G.areaT > 0.4) {
            G.areaT = 0;
            if (W.dim === 'overworld') {
                if (!U.delved) {
                    for (const d of W.dungeons) {
                        if (Math.abs(P.pos.x - (d.rx + 5)) < 4 && Math.abs(P.pos.z - d.rz) < 4 && P.pos.y < 14) {
                            U.delved = true; U.checkAchv();
                        }
                    }
                }
                if (!U.volcanoFound && Math.hypot(P.pos.x - 64, P.pos.z + 56) < 20) {
                    U.volcanoFound = true; U.checkAchv();
                }
                CV.landmarks.forEach(l => { if (Math.hypot(P.pos.x - l.x, P.pos.z - l.z) < 13) U.visitArea(l.id); });
                if (G.frame % 120 === 0 && E.isNight) U.checkAchv();
            } else if (W.dim === 'dungeon' && !U.delved && P.pos.z < -30) {
                U.delved = true; U.checkAchv();
            }
            $('locName').textContent = U.areaAt(P.pos.x, P.pos.z);
        }

        // Context interaction prompt & crosshair state
        const n = X.nearestNPC(P.pos, 3.6); let hot = false;
        if (U.dialogOpen) U.hint(null);
        else if (P.enabled && n) { U.hint('[E] Talk to ' + n.data.name + ' (' + n.data.role + ')'); hot = true; }
        else if (P.enabled && P.target) {
            const i = W.infoMap.get(P.target.x + ',' + P.target.y + ',' + P.target.z);
            const held = P.held(), CI = window.CVI, tid = P.target.id, bt = CI.bestTool(tid);
            if (i) { U.hint('[E] or Right-Click: View "' + i.label + '"'); hot = true; }
            else if (P.mouseDown && bt && !(CI.isTool(held) && CI.TOOLS[held].eff === (bt === 'pickaxe' ? 'pick' : bt)) && P.breakT > 0.6) {
                U.hint('Tip: Use a ' + bt + ' (keys 1-4) to mine ' + W.DEF[tid].name + ' faster');
            } else if (!U.panelOpen && !(U.introDone && G.t < 6.5)) U.hint(null);
        } else if (!(U.introDone && G.t < 6.5)) U.hint(null);
        $('crosshair').classList.toggle('hot', hot);
    }

    boot();
})();
