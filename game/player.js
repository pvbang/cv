/* CV World — player: controls, AABB physics, swimming, flying, breaking/placing blocks */
(function () {
    'use strict';
    const W = window.CVW, E = window.CVE, DEF = W.DEF, B = W.B;
    const HALF = 0.3, HEIGHT = 1.8, EYE = 1.62, REACH = 5.5;

    const P = {
        pos: new THREE.Vector3(0.5, W.BASE + 2, 4.5), vel: new THREE.Vector3(),
        yaw: Math.PI, pitch: 0, onGround: false, inWater: false, flying: false,
        keys: {}, locked: false, target: null, hotbar: [], sel: 0,
        breakT: 0, breaking: null, lastSpace: 0, sprint: false,
        touch: { mx: 0, mz: 0, jump: false, active: false },
        steps: 0, canInteract: true, onEvent: function () { }
    };
    window.CVP = P;

    /* mining time depends on the block and on the tool in hand (see items.js) */
    P.breakTime = function (id) { return window.CVI.dig(id, P.held()); };
    /* hotbar slots hold a tool name (string) or a block id (number); null = empty hand */
    P.hotbar = ['pickaxe', 'axe', 'shovel', 'sword', B.PLANKS, B.COBBLE, B.GLASS, B.BRICK, B.GLOW];
    P.held = function () { const it = P.hotbar[P.sel]; return it === undefined ? null : it; };
    P.holdingBlock = function () { return window.CVI.isBlock(P.held()); };
    P.swing = 0; P.attackCd = 0; P.skipMine = false;

    function solidAt(x, y, z) { const id = W.get(Math.floor(x), Math.floor(y), Math.floor(z)); return id !== 0 && DEF[id].solid; }
    function collides(px, py, pz) {
        for (let x = Math.floor(px - HALF); x <= Math.floor(px + HALF); x++)
            for (let y = Math.floor(py); y <= Math.floor(py + HEIGHT - 0.01); y++)
                for (let z = Math.floor(pz - HALF); z <= Math.floor(pz + HALF); z++)
                    if (solidAt(x, y, z)) return true;
        return false;
    }
    P.collides = collides;

    P.teleport = function (x, y, z, yaw) {
        P.pos.set(x + 0.5, y, z + 0.5); P.vel.set(0, 0, 0);
        if (yaw !== undefined) P.yaw = yaw; P.pitch = 0;
        // push up if stuck
        let g = 0; while (collides(P.pos.x, P.pos.y, P.pos.z) && g++ < 40) P.pos.y += 1;
    };

    P.eye = function () { return new THREE.Vector3(P.pos.x, P.pos.y + EYE, P.pos.z); };
    P.dir = function () {
        const cp = Math.cos(P.pitch);
        return new THREE.Vector3(-Math.sin(P.yaw) * cp, Math.sin(P.pitch), -Math.cos(P.yaw) * cp);
    };

    function move(dt) {
        const k = P.keys;
        let fx = 0, fz = 0;
        if (k['KeyW'] || k['ArrowUp']) fz -= 1;
        if (k['KeyS'] || k['ArrowDown']) fz += 1;
        if (k['KeyA'] || k['ArrowLeft']) fx -= 1;
        if (k['KeyD'] || k['ArrowRight']) fx += 1;
        if (P.touch.active) { fx += P.touch.mx; fz += P.touch.mz; }
        const len = Math.hypot(fx, fz); if (len > 1) { fx /= len; fz /= len; }
        P.sprint = (!!(k['ShiftLeft'] || k['ShiftRight'] || k['ControlLeft']) || (P.touch.active && len > 0.9)) && len > 0.1;
        let speed = P.flying ? (P.sprint ? 18 : 10) : (P.sprint ? 6.4 : 4.4);
        if (P.inWater) speed *= 0.55;
        const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
        const wx = fx * cy + fz * sy, wz = -fx * sy + fz * cy;
        const accel = P.onGround || P.flying ? 14 : 5;
        P.vel.x += (wx * speed - P.vel.x) * Math.min(1, accel * dt);
        P.vel.z += (wz * speed - P.vel.z) * Math.min(1, accel * dt);

        const jump = k['Space'] || P.touch.jump;
        if (P.flying) {
            const up = jump ? 1 : 0, dn = (k['ShiftLeft'] || k['KeyQ']) ? 1 : 0;
            P.vel.y += ((up - dn) * speed * 0.8 - P.vel.y) * Math.min(1, 10 * dt);
        } else if (P.inWater) {
            P.vel.y += (jump ? 3.2 : -2.2 - P.vel.y) * Math.min(1, 4 * dt) * (jump ? 1 : 0.5) ;
            if (jump) P.vel.y = Math.min(P.vel.y + 14 * dt, 3.6);
            P.vel.y -= 4 * dt;
        } else {
            P.vel.y -= 28 * dt;
            if (P.vel.y < -50) P.vel.y = -50;
            if (jump && P.onGround) { P.vel.y = 8.6; P.onGround = false; }
        }

        // integrate per axis (avoids tunnelling through blocks)
        const steps = Math.ceil(Math.max(Math.abs(P.vel.x), Math.abs(P.vel.y), Math.abs(P.vel.z)) * dt / 0.25) || 1;
        const sdt = dt / steps;
        for (let s = 0; s < steps; s++) {
            let nx = P.pos.x + P.vel.x * sdt;
            if (collides(nx, P.pos.y, P.pos.z)) {
                // auto step up one-block ledges
                if (P.onGround && !collides(nx, P.pos.y + 1.01, P.pos.z) ) { P.pos.y += 1.001; P.pos.x = nx; }
                else P.vel.x = 0;
            } else P.pos.x = nx;
            let nz = P.pos.z + P.vel.z * sdt;
            if (collides(P.pos.x, P.pos.y, nz)) {
                if (P.onGround && !collides(P.pos.x, P.pos.y + 1.01, nz)) { P.pos.y += 1.001; P.pos.z = nz; }
                else P.vel.z = 0;
            } else P.pos.z = nz;
            let ny = P.pos.y + P.vel.y * sdt;
            if (collides(P.pos.x, ny, P.pos.z)) {
                if (P.vel.y < 0) { P.onGround = true; P.pos.y = Math.floor(P.pos.y + 0.0001) ; if (collides(P.pos.x, P.pos.y, P.pos.z)) P.pos.y += 1; }
                P.vel.y = 0;
            } else { P.pos.y = ny; if (P.vel.y !== 0) P.onGround = false; }
            if (!P.flying && P.vel.y <= 0 && collides(P.pos.x, P.pos.y - 0.02, P.pos.z)) P.onGround = true;
        }
        if (P.flying && P.onGround) P.flying = false;

        const wb = W.get(Math.floor(P.pos.x), Math.floor(P.pos.y + 0.9), Math.floor(P.pos.z));
        P.inWater = wb === B.WATER;
        P.headInWater = W.get(Math.floor(P.pos.x), Math.floor(P.pos.y + EYE), Math.floor(P.pos.z)) === B.WATER;

        // map bounds + falling out of the world
        const lim = W.OX - 1.5;
        P.pos.x = Math.max(-lim, Math.min(lim, P.pos.x)); P.pos.z = Math.max(-lim, Math.min(lim, P.pos.z));
        if (P.pos.y < -10) { const s = W.landmarks.spawn; P.teleport(s.x, s.y + 1, s.z); }

        // footstep sounds
        const hs = Math.hypot(P.vel.x, P.vel.z);
        if (P.onGround && hs > 1) { P.steps += hs * dt; if (P.steps > 2.1) { P.steps = 0; P.onEvent('step'); } }
    }

    P.update = function (dt) {
        move(dt);
        // camera
        E.camera.position.set(P.pos.x, P.pos.y + EYE, P.pos.z);
        E.camera.rotation.set(P.pitch, P.yaw, 0);
        // field of view: widens while sprinting, narrows while zooming (hold V)
        const fovT = P.keys['KeyV'] ? 28 : (P.sprint ? 80 : 72);
        E.setFov(E.camera.fov + (fovT - E.camera.fov) * Math.min(1, 10 * dt));
        // targeting
        P.target = P.canInteract ? E.raycast(P.eye(), P.dir(), REACH) : null;
        E.setOutline(P.target, dt);
        // placement cell: next to the targeted face, or floating in mid-air when nothing is hit
        P.place = null;
        if (P.canInteract) {
            const t = P.target; let x, y, z, air = false;
            if (t && t.dist <= REACH) {
                // placing onto a plant replaces it, like Minecraft; otherwise build against the targeted face
                if (DEF[t.id].cross) { x = t.x; y = t.y; z = t.z; } else { x = t.x + t.nx; y = t.y + t.ny; z = t.z + t.nz; }
            } else {
                const e = P.eye(), d = P.dir(), r = P.airReach;
                x = Math.floor(e.x + d.x * r); y = Math.floor(e.y + d.y * r); z = Math.floor(e.z + d.z * r); air = true;
            }
            if (P.holdingBlock() && P.canPlaceAt(x, y, z) && !(t && W.infoMap.has(t.x + ',' + t.y + ',' + t.z))) P.place = { x, y, z, air };
        }
        // the placement preview only exists while a block is in hand (tools and an empty hand show just the target outline)
        E.setGhost(P.place ? P.place.x : null, P.place ? P.place.y : 0, P.place ? P.place.z : 0, P.place && P.place.air, dt);
        // held item in the first-person hand
        const held = P.held(); if (P.handItem !== held) { P.handItem = held; E.setHand(held); }
        if (P.attackCd > 0) P.attackCd -= dt;
        // mining (hold left mouse): progress with crack animation, like survival Minecraft
        const key = P.target ? P.target.x + ',' + P.target.y + ',' + P.target.z : null;
        if (P.mouseDown && !P.skipMine && P.target && !W.infoMap.has(key) && !(P.target.id === B.OBSIDIAN && P.target.y <= 0)) {
            if (P.breaking !== key) { P.breaking = key; P.breakT = 0; }
            P.breakT += dt;
            const total = P.breakTime(P.target.id), t = P.target;
            if (P.breakT >= total) { P.breakT = 0; P.breaking = null; E.setCrack(0, 0, 0, -1); P.breakBlock(); }
            else E.setCrack(t.x, t.y, t.z, Math.floor(P.breakT / total * 10));
            if (P.swing <= 0.02) P.swing = 0.32;                   // keep swinging smoothly while mining
        } else { P.breaking = null; P.breakT = 0; E.setCrack(0, 0, 0, -1); }
        if (P.swing > 0) P.swing = Math.max(0, P.swing - dt);
        E.updateHand(dt, P.swing / 0.32, Math.hypot(P.vel.x, P.vel.z) > 1 && P.onGround ? 1 : 0);
    };

    /* left click on a mob: damage + knockback. Returns true when something was hit. */
    P.attack = function () {
        if (!window.CVM || P.attackCd > 0) return false;
        const e = P.eye(), d = P.dir();
        const hit = window.CVM.hit(e, d, 3.6, P.target ? P.target.dist : 99, window.CVI.damage(P.held()));
        if (hit) { P.attackCd = 0.4; P.swing = 0.32; P.onEvent('hit', hit); }
        return !!hit;
    };

    /* click on a block: info blocks open their panel immediately */
    P.startBreak = function () {
        const t = P.target; if (!t) return;
        const info = W.infoMap.get(t.x + ',' + t.y + ',' + t.z);
        if (info) P.onEvent('infoHit', info);
    };

    P.breakBlock = function () {
        const t = P.target; if (!t) return;
        if (W.infoMap.has(t.x + ',' + t.y + ',' + t.z)) return;           // info block: cannot be broken
        if (t.id === B.OBSIDIAN && t.y <= 0) return;
        E.setBlock(t.x, t.y, t.z, 0); P.onEvent('break', t);
    };
    P.airReach = 3.5;
    P.canPlaceAt = function (x, y, z) {
        if (!W.inb(x, y, z)) return false;
        const cur = W.get(x, y, z); if (cur && !DEF[cur].liquid && !DEF[cur].cross) return false;
        const px = P.pos.x, py = P.pos.y, pz = P.pos.z;
        return !(x + 1 > px - HALF && x < px + HALF && z + 1 > pz - HALF && z < pz + HALF && y + 1 > py && y < py + HEIGHT);
    };
    P.placeBlock = function () {
        const t = P.target;
        const info = t && W.infoMap.get(t.x + ',' + t.y + ',' + t.z);
        if (info) { P.onEvent('interact', info); return; }
        const id = P.held(); if (!window.CVI.isBlock(id) || !P.place) return;
        const x = P.place.x, y = P.place.y, z = P.place.z;
        P.swing = 0.32;
        E.setBlock(x, y, z, id); P.onEvent('place', { x, y, z, id });
    };

    /* left button pressed (mouse or touch): hit a mob if one is in the crosshair, otherwise start mining */
    P.leftDown = function () {
        P.breakT = 0; P.swing = 0.32;
        if (P.attack()) { P.skipMine = true; P.mouseDown = true; return; }
        P.skipMine = false; P.mouseDown = true; P.startBreak();
    };
    /* middle click: pick the targeted block into the hotbar (selects it if already there) */
    P.pick = function () {
        const t = P.target; if (!t || !DEF[t.id].place) return;
        let i = P.hotbar.indexOf(t.id);
        if (i < 0) { i = window.CVI.isBlock(P.held()) || P.held() === null ? P.sel : P.hotbar.findIndex(h => !window.CVI.isTool(h)); if (i < 0) i = P.sel; P.hotbar[i] = t.id; }
        P.sel = i; P.onEvent('hotbar');
    };

    /* ---------- input ---------- */
    P.bindInput = function (canvas) {
        document.addEventListener('keydown', e => {
            if (!P.enabled) return;
            if (e.code === 'Space' && !e.repeat) {
                const now = performance.now();
                if (now - P.lastSpace < 280) { P.flying = !P.flying; P.vel.y = 0; P.onEvent('fly', P.flying); }
                P.lastSpace = now;
            }
            P.keys[e.code] = true;
            if (e.code >= 'Digit1' && e.code <= 'Digit9') { P.sel = +e.code.slice(5) - 1; P.onEvent('hotbar'); }
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
            P.onEvent('key', e);
        });
        document.addEventListener('keyup', e => { P.keys[e.code] = false; });
        window.addEventListener('blur', () => { P.keys = {}; P.mouseDown = false; });
        document.addEventListener('mousemove', e => {
            if (!P.locked) return;
            P.yaw -= e.movementX * 0.0022;
            P.pitch = Math.max(-1.55, Math.min(1.55, P.pitch - e.movementY * 0.0022));
        });
        canvas.addEventListener('mousedown', e => {
            if (!P.locked || !P.enabled) return;
            if (e.button === 0) { P.leftDown(); }
            if (e.button === 2) P.placeBlock();
            if (e.button === 1) { P.pick(); e.preventDefault(); }
        });
        document.addEventListener('mouseup', () => { P.mouseDown = false; P.skipMine = false; });
        canvas.addEventListener('contextmenu', e => e.preventDefault());
        document.addEventListener('wheel', e => {
            if (!P.locked) return;
            if (P.keys['AltLeft']) { P.airReach = Math.max(2, Math.min(8, P.airReach + (e.deltaY > 0 ? -0.5 : 0.5))); return; }
            P.sel = (P.sel + (e.deltaY > 0 ? 1 : 8)) % 9; P.onEvent('hotbar');
        }, { passive: true });
        document.addEventListener('pointerlockchange', () => {
            P.locked = document.pointerLockElement === canvas; P.onEvent('lock', P.locked);
        });
    };

    P.lock = function (canvas) { if (canvas.requestPointerLock) { try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => { }); } catch (e) { } } };
})();
