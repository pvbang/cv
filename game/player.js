/* CV World — player physics, health/XP, swimming, lava, flying, 1st/3rd person camera, block breaking/placing */
(function () {
    'use strict';
    const W = window.CVW, E = window.CVE, DEF = W.DEF, B = W.B;
    const HALF = 0.29, HEIGHT = 1.8, EYE = 1.62, REACH = 5.5;

    const P = {
        pos: new THREE.Vector3(0.5, W.BASE + 2, 5.5), vel: new THREE.Vector3(),
        yaw: Math.PI, pitch: 0, onGround: false, inWater: false, inLava: false, headInWater: false, flying: false,
        keys: {}, locked: false, target: null, hotbar: [], sel: 0,
        breakT: 0, breaking: null, lastSpace: 0, lastW: 0, sprint: false, sprintLatch: false,
        touch: { mx: 0, mz: 0, jump: false, active: false },
        steps: 0, canInteract: true, onEvent: function () { },
        hp: 20, maxHp: 20, invuln: 0, regenDelay: 0, xp: 0, level: 1,
        sens: 0.0022, lavaTick: 0, dragLook: false, lastMx: 0, lastMy: 0
    };
    window.CVP = P;

    P.breakTime = function (id) { return window.CVI.dig(id, P.held()); };
    P.hotbar = ['pickaxe', 'axe', 'shovel', 'sword', B.TORCH, B.PLANKS, B.STONEBRICK, B.GLASS, B.GLOW];
    P.held = function () { const it = P.hotbar[P.sel]; return it === undefined ? null : it; };
    P.holdingBlock = function () { return window.CVI.isBlock(P.held()); };
    P.heldEmit = function () {
        const it = P.held();
        return (typeof it === 'number' && DEF[it] && DEF[it].emit) ? DEF[it].emit : 0;
    };
    P.swing = 0; P.attackCd = 0; P.skipMine = false;

    const _eye = new THREE.Vector3(), _dir = new THREE.Vector3(), _camDir = new THREE.Vector3();

    function solidAt(x, y, z) { const id = W.get(Math.floor(x), Math.floor(y), Math.floor(z)); return id !== 0 && DEF[id].solid; }
    function collides(px, py, pz) {
        const x0 = Math.floor(px - HALF), x1 = Math.floor(px + HALF);
        const y0 = Math.floor(py), y1 = Math.floor(py + HEIGHT - 0.01);
        const z0 = Math.floor(pz - HALF), z1 = Math.floor(pz + HALF);
        for (let x = x0; x <= x1; x++)
            for (let y = y0; y <= y1; y++)
                for (let z = z0; z <= z1; z++)
                    if (solidAt(x, y, z)) return true;
        return false;
    }
    P.collides = collides;

    P.teleport = function (x, y, z, yaw) {
        P.pos.set(x + 0.5, y, z + 0.5); P.vel.set(0, 0, 0);
        if (yaw !== undefined) P.yaw = yaw; P.pitch = 0;
        let g = 0; while (collides(P.pos.x, P.pos.y, P.pos.z) && g++ < 48) P.pos.y += 1;
    };

    P.eye = function () { return _eye.set(P.pos.x, P.pos.y + EYE, P.pos.z); };
    P.dir = function () {
        const cp = Math.cos(P.pitch);
        return _dir.set(-Math.sin(P.yaw) * cp, Math.sin(P.pitch), -Math.cos(P.yaw) * cp);
    };

    P.hurt = function (dmg, kx, kz) {
        if (P.invuln > 0 || P.flying) return;
        P.hp = Math.max(0, P.hp - dmg);
        P.invuln = 0.65;
        P.regenDelay = 4.5;
        if (kx || kz) { P.vel.x += kx; P.vel.z += kz; P.vel.y = Math.max(P.vel.y, 4.8); }
        P.onEvent('playerHurt', { hp: P.hp, dmg });
        if (P.hp <= 0) {
            P.hp = P.maxHp; P.vel.set(0, 0, 0);
            const s = W.landmarks.spawn; P.teleport(s.x, s.y + 1, s.z, 0);
            P.onEvent('respawn');
        }
    };

    P.addXp = function (amt) {
        P.xp += amt;
        while (P.xp >= P.level * 10) {
            P.xp -= P.level * 10;
            P.level++;
            P.onEvent('levelUp', P.level);
        }
        P.onEvent('xp', { xp: P.xp, level: P.level });
    };

    function move(dt) {
        const k = P.keys;
        let fx = 0, fz = 0;
        if (k['KeyW'] || k['ArrowUp']) fz -= 1;
        if (k['KeyS'] || k['ArrowDown']) fz += 1;
        if (k['KeyA'] || k['ArrowLeft']) fx -= 1;
        if (k['KeyD'] || k['ArrowRight']) fx += 1;
        if (P.touch.active) { fx += P.touch.mx; fz += P.touch.mz; }
        const len = Math.hypot(fx, fz);
        if (len > 1) { fx /= len; fz /= len; }
        if (fz >= 0) P.sprintLatch = false;

        // While flying, Shift descends without toggling sprint speed wildly; Ctrl or double-W sprints!
        const sprintKey = P.flying ? !!k['ControlLeft'] : !!(k['ShiftLeft'] || k['ShiftRight'] || k['ControlLeft'] || P.sprintLatch);
        P.sprint = (sprintKey || (P.touch.active && len > 0.9)) && len > 0.1;

        let speed = P.flying ? (P.sprint ? 19 : 11) : (P.sprint ? 6.6 : 4.5);
        if (P.inWater) speed *= 0.62;
        if (P.inLava) speed *= 0.42;

        const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
        const wx = fx * cy + fz * sy, wz = -fx * sy + fz * cy;
        const accel = P.onGround || P.flying ? 15 : (P.inWater ? 8 : 5.5);
        P.vel.x += (wx * speed - P.vel.x) * Math.min(1, accel * dt);
        P.vel.z += (wz * speed - P.vel.z) * Math.min(1, accel * dt);

        const jump = k['Space'] || P.touch.jump;
        const grav = (W.dimMeta && W.dimMeta.gravity) || 1.0;
        if (P.flying) {
            const up = jump ? 1 : 0, dn = (k['ShiftLeft'] || k['ShiftRight'] || k['KeyQ']) ? 1 : 0;
            P.vel.y += ((up - dn) * speed * 0.85 - P.vel.y) * Math.min(1, 11 * dt);
        } else if (P.inWater || P.inLava) {
            // Smooth buoyancy & easy shore jump-out!
            if (jump) {
                const aboveWater = W.get(Math.floor(P.pos.x), Math.floor(P.pos.y + 1.15), Math.floor(P.pos.z)) !== B.WATER;
                const targetVy = aboveWater ? 6.8 : 4.2;
                P.vel.y += (targetVy - P.vel.y) * Math.min(1, 12 * dt);
            } else {
                P.vel.y += (-1.8 - P.vel.y) * Math.min(1, 4.5 * dt);
            }
        } else {
            P.vel.y -= 28 * grav * dt;
            const termVel = -48 * Math.sqrt(grav);
            if (P.vel.y < termVel) P.vel.y = termVel;
            if (jump && P.onGround) {
                // Slightly enhanced lunar/aether leap impulse for effortless island hopping
                P.vel.y = grav < 0.7 ? 9.5 : 8.9;
                P.onGround = false;
            }
        }

        // Sub-stepped axis-aligned AABB integration
        const steps = Math.ceil(Math.max(Math.abs(P.vel.x), Math.abs(P.vel.y), Math.abs(P.vel.z)) * dt / 0.22) || 1;
        const sdt = dt / steps;
        for (let s = 0; s < steps; s++) {
            const nx = P.pos.x + P.vel.x * sdt;
            if (collides(nx, P.pos.y, P.pos.z)) {
                if ((P.onGround || P.inWater) && !collides(nx, P.pos.y + 1.02, P.pos.z)) { P.pos.y += 1.01; P.pos.x = nx; }
                else P.vel.x = 0;
            } else P.pos.x = nx;

            const nz = P.pos.z + P.vel.z * sdt;
            if (collides(P.pos.x, P.pos.y, nz)) {
                if ((P.onGround || P.inWater) && !collides(P.pos.x, P.pos.y + 1.02, nz)) { P.pos.y += 1.01; P.pos.z = nz; }
                else P.vel.z = 0;
            } else P.pos.z = nz;

            const ny = P.pos.y + P.vel.y * sdt;
            if (collides(P.pos.x, ny, P.pos.z)) {
                if (P.vel.y < 0) {
                    P.onGround = true;
                    P.pos.y = Math.floor(ny) + 1.0;
                    if (collides(P.pos.x, P.pos.y, P.pos.z)) P.pos.y = Math.ceil(P.pos.y);
                } else if (P.vel.y > 0) {
                    P.pos.y = Math.floor(ny + HEIGHT) - HEIGHT - 0.002;
                }
                P.vel.y = 0;
            } else {
                P.pos.y = ny;
                if (P.vel.y !== 0) P.onGround = false;
            }
            if (!P.flying && P.vel.y <= 0 && collides(P.pos.x, P.pos.y - 0.03, P.pos.z)) P.onGround = true;
        }
        if (P.flying && P.onGround && (k['ShiftLeft'] || k['ShiftRight'] || k['KeyQ'])) P.flying = false;

        const feetB = W.get(Math.floor(P.pos.x), Math.floor(P.pos.y + 0.35), Math.floor(P.pos.z));
        const bodyB = W.get(Math.floor(P.pos.x), Math.floor(P.pos.y + 0.9), Math.floor(P.pos.z));
        const headB = W.get(Math.floor(P.pos.x), Math.floor(P.pos.y + EYE), Math.floor(P.pos.z));
        P.inWater = (feetB === B.WATER || bodyB === B.WATER);
        P.headInWater = (headB === B.WATER);
        P.inLava = (feetB === B.LAVA || bodyB === B.LAVA || headB === B.LAVA);

        if (P.inLava) {
            P.lavaTick -= dt;
            if (P.lavaTick <= 0) {
                P.lavaTick = 0.7;
                if (!P.flying) { P.vel.y = 7.2; P.hurt(2, 0, 0); }
                P.onEvent('lava');
            }
        } else P.lavaTick = 0;

        // World bounds & graceful void rescue in floating realms (Aether / Cosmos)
        const limX = W.OX - 2, limZ = W.OZ - 2;
        P.pos.x = Math.max(-limX, Math.min(limX, P.pos.x));
        P.pos.z = Math.max(-limZ, Math.min(limZ, P.pos.z));
        if (P.pos.y < -12) {
            const s = W.landmarks.spawn || { x: 0, y: W.BASE + 2, z: 0 };
            P.teleport(s.x, s.y + 1, s.z);
            P.vel.y = 4.2;
            P.onEvent('voidRescue');
        }

        // Surface-aware footsteps
        const hs = Math.hypot(P.vel.x, P.vel.z);
        if (P.onGround && hs > 0.8) {
            P.steps += hs * dt;
            if (P.steps > 2.05) {
                P.steps = 0;
                const under = W.get(Math.floor(P.pos.x), Math.floor(P.pos.y - 0.15), Math.floor(P.pos.z));
                P.onEvent('step', (DEF[under] && DEF[under].step) || 'stone');
            }
        }
    }

    function updateCamera() {
        const ex = P.pos.x, ey = P.pos.y + EYE, ez = P.pos.z;
        if (E.camMode === 0) {
            E.camera.position.set(ex, ey, ez);
            E.camera.rotation.set(P.pitch, P.yaw, 0);
        } else {
            // 3rd-person back (1) or front (2) with wall collision pullback
            const d = P.dir();
            const sign = E.camMode === 1 ? -1 : 1;
            _camDir.set(d.x * sign, d.y * sign, d.z * sign);
            let dist = 4.2;
            const hit = E.raycast(P.eye(), _camDir, dist + 0.4);
            if (hit) dist = Math.max(0.8, hit.dist - 0.35);
            E.camera.position.set(ex + _camDir.x * dist, ey + _camDir.y * dist + 0.25, ez + _camDir.z * dist);
            if (E.camMode === 1) {
                E.camera.rotation.set(P.pitch, P.yaw, 0);
            } else {
                E.camera.lookAt(ex, ey - 0.15, ez);
            }
        }
    }

    P.update = function (dt) {
        if (P.invuln > 0) P.invuln = Math.max(0, P.invuln - dt);
        if (P.regenDelay > 0) P.regenDelay -= dt;
        else if (P.hp < P.maxHp && !P.inLava) {
            P.hp = Math.min(P.maxHp, P.hp + dt * 1.2);
            P.onEvent('heal', P.hp);
        }

        move(dt);
        updateCamera();

        const fovT = P.keys['KeyV'] ? 28 : (P.sprint ? 80 : 72);
        E.setFov(E.camera.fov + (fovT - E.camera.fov) * Math.min(1, 10 * dt));
        E.uUnderwater.value = P.headInWater ? 1.0 : 0.0;

        // Voxel targeting
        P.target = P.canInteract ? E.raycast(P.eye(), P.dir(), REACH) : null;
        E.setOutline(P.target, dt);

        // Placement preview
        P.place = null;
        if (P.canInteract) {
            const t = P.target; let x, y, z, air = false;
            if (t && t.dist <= REACH) {
                if (DEF[t.id].cross && !DEF[t.id].torch) { x = t.x; y = t.y; z = t.z; }
                else { x = t.x + t.nx; y = t.y + t.ny; z = t.z + t.nz; }
            } else {
                const e = P.eye(), d = P.dir(), r = P.airReach;
                x = Math.floor(e.x + d.x * r); y = Math.floor(e.y + d.y * r); z = Math.floor(e.z + d.z * r); air = true;
            }
            if (P.holdingBlock() && P.canPlaceAt(x, y, z) && !(t && W.infoMap.has(t.x + ',' + t.y + ',' + t.z))) {
                P.place = { x, y, z, air };
            }
        }
        E.setGhost(P.place ? P.place.x : null, P.place ? P.place.y : 0, P.place ? P.place.z : 0, P.place && P.place.air, dt);

        // Held item & 3rd-person character animation
        const held = P.held();
        if (P.handItem !== held) { P.handItem = held; E.setHand(held); }
        if (P.attackCd > 0) P.attackCd -= dt;

        // Mining progress & crack animation
        const key = P.target ? P.target.x + ',' + P.target.y + ',' + P.target.z : null;
        const canBreak = P.target && !W.infoMap.has(key) && P.target.id !== B.BEDROCK && !(P.target.id === B.OBSIDIAN && P.target.y <= 1);
        if (P.mouseDown && !P.skipMine && canBreak) {
            if (P.breaking !== key) { P.breaking = key; P.breakT = 0; P.mineTick = 0; }
            P.breakT += dt; P.mineTick = (P.mineTick || 0) + dt;
            if (P.mineTick > 0.22) { P.mineTick = 0; P.onEvent('mineTick', P.target); }
            const total = P.breakTime(P.target.id), t = P.target;
            if (P.breakT >= total) { P.breakT = 0; P.breaking = null; E.setCrack(0, 0, 0, -1); P.breakBlock(); }
            else E.setCrack(t.x, t.y, t.z, Math.floor(P.breakT / total * 10));
            if (P.swing <= 0.02) P.swing = 0.30;
        } else {
            P.breaking = null; P.breakT = 0; E.setCrack(0, 0, 0, -1);
        }
        if (P.swing > 0) P.swing = Math.max(0, P.swing - dt);

        const hs = Math.hypot(P.vel.x, P.vel.z);
        E.updateHand(dt, P.swing / 0.30, hs > 0.9 && P.onGround ? 1 : 0);
        E.updatePlayerModel(P.pos, P.yaw, P.pitch, P.onGround ? hs : 0.4, P.swing / 0.30, dt);
    };

    P.attack = function () {
        if (!window.CVM || P.attackCd > 0) return false;
        const hit = window.CVM.hit(P.eye(), P.dir(), 3.8, P.target ? P.target.dist : 99, window.CVI.damage(P.held()));
        if (hit) { P.attackCd = 0.38; P.swing = 0.30; P.onEvent('hit', hit); }
        return !!hit;
    };

    P.startBreak = function () {
        const t = P.target; if (!t) return;
        const info = W.infoMap.get(t.x + ',' + t.y + ',' + t.z);
        if (info) P.onEvent('infoHit', info);
    };

    P.breakBlock = function () {
        const t = P.target; if (!t) return;
        if (W.infoMap.has(t.x + ',' + t.y + ',' + t.z) || t.id === B.BEDROCK) return;
        E.setBlock(t.x, t.y, t.z, 0);
        P.onEvent('break', t);
    };

    P.airReach = 3.5;
    P.canPlaceAt = function (x, y, z) {
        if (!W.inb(x, y, z)) return false;
        const cur = W.get(x, y, z);
        if (cur && !DEF[cur].liquid && !DEF[cur].cross) return false;
        const id = P.held();
        if (DEF[id] && !DEF[id].solid) return true; // Torches/flowers can sit anywhere
        const px = P.pos.x, py = P.pos.y, pz = P.pos.z;
        return !(x + 1 > px - HALF && x < px + HALF && z + 1 > pz - HALF && z < pz + HALF && y + 1 > py && y < py + HEIGHT);
    };

    P.placeBlock = function () {
        const t = P.target;
        const info = t && W.infoMap.get(t.x + ',' + t.y + ',' + t.z);
        if (info) { P.onEvent('interact', info); return; }
        const id = P.held(); if (!window.CVI.isBlock(id) || !P.place) return;
        const { x, y, z } = P.place;
        P.swing = 0.28;
        E.setBlock(x, y, z, id);
        P.onEvent('place', { x, y, z, id });
    };

    P.leftDown = function () {
        P.breakT = 0; P.swing = 0.30;
        if (P.attack()) { P.skipMine = true; P.mouseDown = true; return; }
        P.skipMine = false; P.mouseDown = true; P.startBreak();
    };

    P.pick = function () {
        const t = P.target; if (!t || !DEF[t.id].place) return;
        let i = P.hotbar.indexOf(t.id);
        if (i < 0) {
            i = window.CVI.isBlock(P.held()) || P.held() === null ? P.sel : P.hotbar.findIndex(h => !window.CVI.isTool(h));
            if (i < 0) i = P.sel;
            P.hotbar[i] = t.id;
        }
        P.sel = i; P.onEvent('hotbar');
    };

    /* ---------- Input Binding ---------- */
    P.bindInput = function (canvas) {
        document.addEventListener('keydown', e => {
            if (!P.enabled) return;
            if (e.code === 'Space' && !e.repeat) {
                const now = performance.now();
                if (now - P.lastSpace < 280) { P.flying = !P.flying; P.vel.y = 0; P.onEvent('fly', P.flying); }
                P.lastSpace = now;
            }
            if (e.code === 'KeyW' && !e.repeat) {
                const now = performance.now();
                if (now - P.lastW < 280) P.sprintLatch = true;
                P.lastW = now;
            }
            P.keys[e.code] = true;
            if (e.code >= 'Digit1' && e.code <= 'Digit9') { P.sel = +e.code.slice(5) - 1; P.onEvent('hotbar'); }
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'F5'].includes(e.code)) e.preventDefault();
            P.onEvent('key', e);
        });
        document.addEventListener('keyup', e => { P.keys[e.code] = false; });
        window.addEventListener('blur', () => { P.keys = {}; P.mouseDown = false; P.dragLook = false; });

        document.addEventListener('mousemove', e => {
            if (P.locked && P.enabled) {
                P.yaw -= e.movementX * P.sens;
                P.pitch = Math.max(-1.54, Math.min(1.54, P.pitch - e.movementY * P.sens));
            } else if (P.dragLook && P.enabled) {
                const dx = e.clientX - P.lastMx, dy = e.clientY - P.lastMy;
                P.lastMx = e.clientX; P.lastMy = e.clientY;
                P.yaw -= dx * P.sens * 1.4;
                P.pitch = Math.max(-1.54, Math.min(1.54, P.pitch - dy * P.sens * 1.4));
            }
        });

        canvas.addEventListener('mousedown', e => {
            if (!P.enabled) return;
            if (!P.locked) {
                P.lock(canvas);
                P.dragLook = true; P.lastMx = e.clientX; P.lastMy = e.clientY;
                return;
            }
            if (e.button === 0) P.leftDown();
            if (e.button === 2) P.placeBlock();
            if (e.button === 1) { P.pick(); e.preventDefault(); }
        });
        document.addEventListener('mouseup', () => { P.mouseDown = false; P.skipMine = false; P.dragLook = false; });
        canvas.addEventListener('contextmenu', e => e.preventDefault());

        document.addEventListener('wheel', e => {
            if (!P.enabled) return;
            if (P.keys['AltLeft']) { P.airReach = Math.max(2, Math.min(8, P.airReach + (e.deltaY > 0 ? -0.5 : 0.5))); return; }
            P.sel = (P.sel + (e.deltaY > 0 ? 1 : 8)) % 9;
            P.onEvent('hotbar');
        }, { passive: true });

        document.addEventListener('pointerlockchange', () => {
            P.locked = document.pointerLockElement === canvas;
            P.onEvent('lock', P.locked);
        });
    };

    P.lock = function (canvas) {
        if (canvas.requestPointerLock) {
            try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => { }); } catch (err) { }
        }
    };
})();
