/* CV World — ambient animals (box models) that wander the overworld, plus birds and fish */
(function () {
    'use strict';
    const W = window.CVW, E = window.CVE;
    const M = { list: [] };
    window.CVM = M;

    const mat = c => new THREE.MeshBasicMaterial({ color: c });
    function part(w, h, d, c, x, y, z, pivotY) {
        const g = new THREE.Group(), m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
        m.position.y = pivotY ? -h / 2 : 0; g.add(m); g.position.set(x, y, z); return g;
    }

    /* each kind: body builder returns { group, legs[], head } */
    const KINDS = {
        cow: {
            biomes: [0, 1], n: 16, speed: 0.9, radius: 0.5, hp: 10, h: 1.4,
            build() {
                const g = new THREE.Group(), body = part(0.9, 0.7, 1.3, 0x4a3a30, 0, 1.0, 0); g.add(body);
                const spot = part(0.5, 0.72, 0.5, 0xf2f2f2, 0.12, 1.0, 0.1); g.add(spot);
                const head = part(0.55, 0.55, 0.5, 0x4a3a30, 0, 1.25, 0.85); g.add(head);
                head.add(part(0.3, 0.2, 0.05, 0xd9b3a0, 0, -0.12, 0.26));
                const legs = [[-0.3, -0.5], [0.3, -0.5], [-0.3, 0.5], [0.3, 0.5]].map(p => { const l = part(0.2, 0.65, 0.2, 0x3a2c24, p[0], 0.65, p[1], true); g.add(l); return l; });
                return { group: g, legs, head };
            }
        },
        pig: {
            biomes: [0, 1], n: 12, speed: 0.9, radius: 0.4, hp: 10, h: 0.95,
            build() {
                const g = new THREE.Group(); g.add(part(0.7, 0.55, 1.0, 0xf0a0a8, 0, 0.7, 0));
                const head = part(0.5, 0.45, 0.45, 0xf0a0a8, 0, 0.78, 0.68); g.add(head);
                head.add(part(0.28, 0.18, 0.1, 0xd97585, 0, -0.06, 0.26));
                const legs = [[-0.22, -0.32], [0.22, -0.32], [-0.22, 0.32], [0.22, 0.32]].map(p => { const l = part(0.18, 0.4, 0.18, 0xe08e98, p[0], 0.42, p[1], true); g.add(l); return l; });
                return { group: g, legs, head };
            }
        },
        sheep: {
            biomes: [0, 1, 3], n: 14, speed: 0.8, radius: 0.45, hp: 8, h: 1.4,
            build() {
                const g = new THREE.Group(); g.add(part(0.85, 0.75, 1.15, 0xeeeeee, 0, 0.95, 0));
                const head = part(0.4, 0.45, 0.4, 0xc9a88a, 0, 1.15, 0.72); g.add(head);
                const legs = [[-0.25, -0.4], [0.25, -0.4], [-0.25, 0.4], [0.25, 0.4]].map(p => { const l = part(0.17, 0.55, 0.17, 0xc9a88a, p[0], 0.57, p[1], true); g.add(l); return l; });
                return { group: g, legs, head };
            }
        },
        chicken: {
            biomes: [0, 1, 2], n: 10, speed: 1.1, radius: 0.25, hp: 4, h: 0.9,
            build() {
                const g = new THREE.Group(); g.add(part(0.35, 0.35, 0.5, 0xf7f7f7, 0, 0.5, 0));
                const head = part(0.2, 0.25, 0.2, 0xf7f7f7, 0, 0.78, 0.28); g.add(head);
                head.add(part(0.1, 0.07, 0.1, 0xf2a60d, 0, -0.02, 0.14)); head.add(part(0.06, 0.08, 0.1, 0xd02828, 0, -0.1, 0.12));
                g.add(part(0.3, 0.05, 0.3, 0xe8e8e8, 0, 0.55, -0.32));
                const legs = [[-0.09, 0], [0.09, 0]].map(p => { const l = part(0.05, 0.3, 0.05, 0xf2a60d, p[0], 0.32, p[1], true); g.add(l); return l; });
                return { group: g, legs, head };
            }
        }
    };

    function groundAt(x, z) { return W.topY(Math.floor(x), Math.floor(z)); }

    M.init = function () {
        const rnd = W.mulberry32(4242);
        Object.keys(KINDS).forEach(k => {
            const K = KINDS[k]; let n = 0, tries = 0;
            while (n < K.n && tries++ < 800) {
                const x = ((rnd() * (W.SX - 20)) | 0) - W.OX + 10, z = ((rnd() * (W.SZ - 20)) | 0) - W.OZ + 10;
                if (Math.hypot(x, z) < 14) continue;
                const bio = W.biomeMap[(z + W.OZ) * W.SX + (x + W.OX)];
                if (!K.biomes.includes(bio)) continue;
                const y = groundAt(x, z), top = W.get(x, y, z);
                if (y <= W.WATER + 1 || (top !== W.B.GRASS && top !== W.B.SNOW && top !== W.B.SAND)) continue;
                if (W.get(x, y + 1, z) !== 0 && !W.DEF[W.get(x, y + 1, z)].cross) continue;
                const body = K.build(); body.group.position.set(x + 0.5, y + 1, z + 0.5); body.group.rotation.y = rnd() * 6.28;
                E.scene.add(body.group);
                M.list.push({ kind: k, K, body, x: x + 0.5, y: y + 1, z: z + 0.5, hx: x + 0.5, hz: z + 0.5, yaw: rnd() * 6.28, tYaw: 0, state: 'idle', timer: rnd() * 3, phase: rnd() * 6, wob: 0, hp: K.hp, hurt: 0, panic: 0, kx: 0, kz: 0, dead: 0 });
                body.meshes = []; body.group.traverse(o => { if (o.isMesh) { o.userData.c0 = o.material.color.getHex(); body.meshes.push(o); } });
                n++;
            }
        });
        // birds: slow circling flocks
        M.birds = [];
        for (let i = 0; i < 14; i++) {
            const g = new THREE.Group(), b = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.25), mat(0x30343c));
            const wl = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.03, 0.2), mat(0x30343c)), wr = wl.clone();
            wl.position.x = -0.4; wr.position.x = 0.4; g.add(b); g.add(wl); g.add(wr);
            g.userData = { wl, wr, cx: (rnd() - 0.5) * 140, cz: (rnd() - 0.5) * 140, r: 14 + rnd() * 28, h: 34 + rnd() * 12, sp: 0.15 + rnd() * 0.15, ph: rnd() * 6.28 };
            E.scene.add(g); M.birds.push(g);
        }
        // fish: swim around in deep water
        M.fish = [];
        let ft = 0;
        while (M.fish.length < 40 && ft++ < 4000) {
            const x = ((rnd() * W.SX) | 0) - W.OX, z = ((rnd() * W.SZ) | 0) - W.OZ, h = W.topY(x, z);
            if (h > W.WATER - 2 || W.get(x, W.WATER, z) !== W.B.WATER) continue;
            const f = new THREE.Group(); f.add(part(0.4, 0.2, 0.15, 0xf2994a, 0, 0, 0)); f.add(part(0.12, 0.2, 0.05, 0xe0802a, -0.26, 0, 0));
            f.position.set(x + 0.5, Math.max(h + 1.5, W.WATER - 1.8 - rnd() * 1.5), z + 0.5);
            f.userData = { x: x + 0.5, z: z + 0.5, a: rnd() * 6.28, sp: 0.5 + rnd() * 0.6, y: f.position.y, t: rnd() * 6 };
            E.scene.add(f); M.fish.push(f);
        }
    };

    function blocked(x, y, z) {
        const id = W.get(Math.floor(x), Math.floor(y), Math.floor(z));
        return id !== 0 && W.DEF[id].solid;
    }

    /* ray (origin o, direction d) against each mob's box; returns the nearest mob within reach and in front of any block */
    M.hit = function (o, d, reach, blockDist, dmg) {
        let best = null, bt = Math.min(reach, blockDist);
        M.list.forEach(m => {
            if (m.dead) return;
            const r = m.K.radius + 0.15, cx = m.x - o.x, cy = m.y + m.K.h * 0.5 - o.y, cz = m.z - o.z;
            const t = cx * d.x + cy * d.y + cz * d.z; if (t < 0 || t > bt) return;
            const px = o.x + d.x * t - m.x, py = o.y + d.y * t - (m.y + m.K.h * 0.5), pz = o.z + d.z * t - m.z;
            if (Math.abs(px) < r && Math.abs(pz) < r && Math.abs(py) < m.K.h * 0.5 + 0.1) { best = m; bt = t; }
        });
        if (!best) return null;
        const m = best; m.hp -= dmg; m.hurt = 0.4; m.panic = 4; m.state = 'walk'; m.timer = 3;
        const l = Math.hypot(d.x, d.z) || 1; m.kx = d.x / l * 5; m.kz = d.z / l * 5;
        m.tYaw = Math.atan2(d.x, d.z);
        const killed = m.hp <= 0;
        if (killed) { m.dead = 40; m.body.group.visible = false; }
        return { mob: m, kind: m.kind, killed, x: m.x, y: m.y + m.K.h * 0.5, z: m.z };
    };

    M.update = function (dt, t, ppos) {
        M.list.forEach(m => {
            if (m.dead > 0) {       // respawn at home after a while
                m.dead -= dt;
                if (m.dead <= 0) { m.dead = 0; m.hp = m.K.hp; m.x = m.hx; m.z = m.hz; m.y = groundAt(m.x, m.z) + 1; m.panic = 0; m.kx = m.kz = 0; }
                return;
            }
            if (m.hurt > 0) { m.hurt -= dt; const red = m.hurt > 0; m.body.meshes.forEach(o => o.material.color.setHex(red ? 0xff5a5a : o.userData.c0)); }
            const dx = m.x - ppos.x, dz = m.z - ppos.z, d2 = dx * dx + dz * dz;
            if (d2 > 110 * 110) { m.body.group.visible = false; return; }
            m.body.group.visible = true;
            if (d2 > 60 * 60) return;
            m.timer -= dt;
            let spd = 0;
            if (m.panic > 0) { m.panic -= dt; m.state = 'walk'; m.timer = 1; spd = m.K.speed * 2.6; if (d2 < 100) m.tYaw = Math.atan2(dx, dz); }   // hurt: run away
            else if (d2 < 16 && m.kind !== 'sheep') { m.tYaw = Math.atan2(dx, dz); m.state = 'walk'; m.timer = 1.2; spd = m.K.speed * 2.4; }   // startled: run away
            else if (m.timer <= 0) {
                if (m.state === 'idle') { m.state = 'walk'; m.tYaw = Math.random() * 6.28; m.timer = 1.5 + Math.random() * 3; }
                else { m.state = 'idle'; m.timer = 1 + Math.random() * 4; }
            }
            if (m.state === 'walk' && spd === 0) spd = m.K.speed;
            // smooth turn
            let dy = m.tYaw - m.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); m.yaw += dy * Math.min(1, 5 * dt);
            if (m.state === 'walk') {
                const sx = Math.sin(m.yaw), cz = Math.cos(m.yaw), r = m.K.radius + 0.2;
                const nx = m.x + sx * spd * dt, nz = m.z + cz * spd * dt;
                const gy = groundAt(nx + sx * r, nz + cz * r) + 1;
                if (gy - m.y > 1.1 || (W.get(Math.floor(nx), gy - 1, Math.floor(nz)) === W.B.WATER) || gy <= W.WATER + 1) { m.tYaw += 2 + Math.random(); }
                else { m.x = nx; m.z = nz; m.y += (gy - m.y) * Math.min(1, 10 * dt); m.wob += dt * spd * 5; }
            }
            // knockback slides the mob, decaying quickly
            if (m.kx || m.kz) {
                const kx = m.x + m.kx * dt, kz = m.z + m.kz * dt;
                if (groundAt(kx, kz) + 1 - m.y <= 1.1 && groundAt(kx, kz) + 1 > W.WATER + 1) { m.x = kx; m.z = kz; }
                m.kx *= Math.max(0, 1 - 8 * dt); m.kz *= Math.max(0, 1 - 8 * dt); if (Math.abs(m.kx) + Math.abs(m.kz) < 0.1) m.kx = m.kz = 0;
            }
            const g = m.body.group; g.position.set(m.x, m.y + (m.hurt > 0 ? 0.08 : 0), m.z); g.rotation.y = m.yaw; g.rotation.z = m.hurt > 0 ? 0.25 : 0;
            const sw = m.state === 'walk' ? Math.sin(m.wob * 2) * 0.6 : 0;
            m.body.legs.forEach((l, i) => { l.rotation.x = (i % 2 ? -sw : sw) * (i > 1 ? -1 : 1); });
            if (m.body.head) m.body.head.rotation.x = m.state === 'idle' ? Math.sin(t * 1.2 + m.phase) * 0.25 + 0.15 : 0;
        });
        M.birds.forEach(b => {
            const u = b.userData, a = t * u.sp + u.ph;
            b.position.set(u.cx + Math.cos(a) * u.r, u.h + Math.sin(t * 0.7 + u.ph) * 1.5, u.cz + Math.sin(a) * u.r);
            b.rotation.y = -a;
            const f = Math.sin(t * 7 + u.ph) * 0.5; u.wl.rotation.z = f; u.wr.rotation.z = -f;
        });
        M.fish.forEach(f => {
            const u = f.userData; u.t += dt; u.a += Math.sin(u.t * 0.7) * dt * 0.8;
            const nx = u.x + Math.cos(u.a) * u.sp * dt, nz = u.z + Math.sin(u.a) * u.sp * dt;
            if (W.get(Math.floor(nx), Math.floor(u.y), Math.floor(nz)) === W.B.WATER) { u.x = nx; u.z = nz; } else u.a += 2.4;
            f.position.set(u.x, u.y + Math.sin(u.t * 2) * 0.08, u.z); f.rotation.y = -u.a;
        });
    };
})();
