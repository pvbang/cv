/* CV World — Textured Passive Animals, Hostile Monsters (Zombie, Skeleton, Creeper, Spider, Slime), Arrows, Combat & XP */
(function () {
    'use strict';
    const W = window.CVW, E = window.CVE;
    const M = { list: [], birds: [], fish: [], arrows: [], peaceful: false };
    window.CVM = M;

    /* ---------- Pixel-Art Face & Hide CanvasTexture Builder ---------- */
    const texCache = {};
    function pixelTex(key, w, h, drawFn) {
        if (texCache[key]) return texCache[key];
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        drawFn(c.getContext('2d'), w, h);
        const t = new THREE.CanvasTexture(c);
        t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
        texCache[key] = t;
        return t;
    }

    function makeFace(key, bg, draw) {
        return pixelTex(key, 8, 8, (g) => {
            g.fillStyle = bg; g.fillRect(0, 0, 8, 8);
            // Subtle pixel noise
            for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
                if ((x * 7 + y * 13) % 5 === 0) { g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(x, y, 1, 1); }
                else if ((x * 11 + y * 3) % 7 === 0) { g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(x, y, 1, 1); }
            }
            draw(g);
        });
    }

    function matCol(c, opts) { return new THREE.MeshBasicMaterial(Object.assign({ color: c }, opts || {})); }
    function matTex(t, opts) { return new THREE.MeshBasicMaterial(Object.assign({ map: t }, opts || {})); }

    function part(w, h, d, m, x, y, z, pivotY) {
        const g = new THREE.Group();
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof m === 'number' ? matCol(m) : m);
        mesh.position.y = pivotY ? -h / 2 : 0;
        g.add(mesh); g.position.set(x, y, z);
        return g;
    }

    /* ---------- Floating Mini Health Bar for Damaged Mobs ---------- */
    function makeHpBar() {
        const c = document.createElement('canvas'); c.width = 48; c.height = 8;
        const g = c.getContext('2d');
        const t = new THREE.CanvasTexture(c);
        t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
        const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
        spr.scale.set(0.9, 0.16, 1);
        spr.visible = false;
        spr.userData = { c, g, t };
        return spr;
    }
    function updateHpBar(m) {
        const bar = m.body.hpBar; if (!bar) return;
        if (m.hp >= m.K.hp || m.dead) { bar.visible = false; return; }
        bar.visible = true;
        const { g, t } = bar.userData;
        const ratio = Math.max(0, m.hp / m.K.hp);
        g.clearRect(0, 0, 48, 8);
        g.fillStyle = 'rgba(8,10,16,0.85)'; g.fillRect(0, 0, 48, 8);
        g.fillStyle = ratio > 0.5 ? '#22c55e' : (ratio > 0.25 ? '#f59e0b' : '#ef4444');
        g.fillRect(2, 2, Math.round(44 * ratio), 4);
        t.needsUpdate = true;
    }

    /* ---------- Mob Definitions (Passive + Hostile) ---------- */
    const SHEEP_WOOLS = [0xf2f3f5, 0xede3d2, 0xf7b7d2, 0x7c5a44];

    const KINDS = {
        /* ===== PASSIVE ANIMALS ===== */
        cow: {
            biomes: [0, 1, 5], n: 15, speed: 0.95, radius: 0.5, hp: 10, h: 1.4, xp: 2,
            build() {
                const face = makeFace('cow_f', '#4a3a30', g => {
                    g.fillStyle = '#ffffff'; g.fillRect(1, 3, 1, 1); g.fillRect(6, 3, 1, 1);
                    g.fillStyle = '#111111'; g.fillRect(2, 3, 1, 1); g.fillRect(5, 3, 1, 1);
                    g.fillStyle = '#d9b3a0'; g.fillRect(1, 5, 6, 3);
                    g.fillStyle = '#5c4033'; g.fillRect(2, 6, 1, 1); g.fillRect(5, 6, 1, 1);
                });
                const hide = pixelTex('cow_h', 8, 8, g => {
                    g.fillStyle = '#4a3a30'; g.fillRect(0, 0, 8, 8);
                    g.fillStyle = '#ededed'; g.fillRect(1, 1, 3, 2); g.fillRect(5, 4, 3, 3); g.fillRect(0, 5, 2, 2);
                });
                const g = new THREE.Group();
                g.add(part(0.88, 0.7, 1.32, matTex(hide), 0, 1.0, 0));
                const head = part(0.54, 0.54, 0.48, [matCol(0x4a3a30), matCol(0x4a3a30), matCol(0x4a3a30), matCol(0x4a3a30), matTex(face), matCol(0x4a3a30)], 0, 1.24, 0.85);
                head.add(part(0.08, 0.16, 0.08, 0xd4d0c8, -0.24, 0.30, 0));
                head.add(part(0.08, 0.16, 0.08, 0xd4d0c8, 0.24, 0.30, 0));
                g.add(head);
                const legs = [[-0.28, -0.48], [0.28, -0.48], [-0.28, 0.48], [0.28, 0.48]].map(p => { const l = part(0.2, 0.65, 0.2, 0x3b2d24, p[0], 0.65, p[1], true); g.add(l); return l; });
                return { group: g, legs, head };
            }
        },
        pig: {
            biomes: [0, 1, 5], n: 12, speed: 1.0, radius: 0.42, hp: 10, h: 0.95, xp: 2,
            build() {
                const face = makeFace('pig_f', '#f2a2aa', g => {
                    g.fillStyle = '#ffffff'; g.fillRect(1, 3, 1, 1); g.fillRect(6, 3, 1, 1);
                    g.fillStyle = '#111111'; g.fillRect(0, 3, 1, 1); g.fillRect(7, 3, 1, 1);
                    g.fillStyle = '#e07a8a'; g.fillRect(2, 4, 4, 3);
                    g.fillStyle = '#7c2d3b'; g.fillRect(2, 5, 1, 1); g.fillRect(5, 5, 1, 1);
                });
                const g = new THREE.Group();
                g.add(part(0.72, 0.56, 1.02, 0xf0a0a8, 0, 0.70, 0));
                const head = part(0.5, 0.46, 0.46, [matCol(0xf0a0a8), matCol(0xf0a0a8), matCol(0xf0a0a8), matCol(0xf0a0a8), matTex(face), matCol(0xf0a0a8)], 0, 0.78, 0.68);
                head.add(part(0.28, 0.18, 0.1, 0xdc7787, 0, -0.06, 0.26));
                g.add(head);
                const legs = [[-0.22, -0.32], [0.22, -0.32], [-0.22, 0.32], [0.22, 0.32]].map(p => { const l = part(0.18, 0.42, 0.18, 0xe08e98, p[0], 0.42, p[1], true); g.add(l); return l; });
                return { group: g, legs, head };
            }
        },
        sheep: {
            biomes: [0, 1, 3, 5], n: 15, speed: 0.85, radius: 0.46, hp: 8, h: 1.4, xp: 2,
            build(rnd) {
                const wc = SHEEP_WOOLS[(rnd() * SHEEP_WOOLS.length) | 0];
                const face = makeFace('sheep_f', '#d7b497', g => {
                    g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, 8, 2); g.fillRect(0, 2, 1, 2); g.fillRect(7, 2, 1, 2);
                    g.fillStyle = '#ffffff'; g.fillRect(1, 3, 1, 1); g.fillRect(6, 3, 1, 1);
                    g.fillStyle = '#111111'; g.fillRect(2, 3, 1, 1); g.fillRect(5, 3, 1, 1);
                    g.fillStyle = '#e89ba8'; g.fillRect(3, 6, 2, 1);
                });
                const g = new THREE.Group();
                g.add(part(0.88, 0.78, 1.18, wc, 0, 0.96, 0));
                const head = part(0.42, 0.44, 0.44, [matCol(0xd7b497), matCol(0xd7b497), matCol(wc), matCol(0xd7b497), matTex(face), matCol(wc)], 0, 1.15, 0.72);
                g.add(head);
                const legs = [[-0.25, -0.4], [0.25, -0.4], [-0.25, 0.4], [0.25, 0.4]].map(p => { const l = part(0.18, 0.56, 0.18, 0xc9a88a, p[0], 0.56, p[1], true); g.add(l); return l; });
                return { group: g, legs, head };
            }
        },
        chicken: {
            biomes: [0, 1, 2, 5], n: 10, speed: 1.15, radius: 0.28, hp: 4, h: 0.9, xp: 1,
            build() {
                const face = makeFace('chk_f', '#f8fafc', g => {
                    g.fillStyle = '#111111'; g.fillRect(1, 3, 1, 1); g.fillRect(6, 3, 1, 1);
                });
                const g = new THREE.Group();
                g.add(part(0.36, 0.36, 0.5, 0xf8fafc, 0, 0.50, 0));
                const wL = part(0.06, 0.24, 0.38, 0xe2e8f0, -0.21, 0.52, 0);
                const wR = part(0.06, 0.24, 0.38, 0xe2e8f0, 0.21, 0.52, 0);
                g.add(wL); g.add(wR);
                const head = part(0.22, 0.26, 0.22, [matCol(0xf8fafc), matCol(0xf8fafc), matCol(0xf8fafc), matCol(0xf8fafc), matTex(face), matCol(0xf8fafc)], 0, 0.78, 0.28);
                head.add(part(0.11, 0.07, 0.12, 0xf59e0b, 0, -0.02, 0.15));
                head.add(part(0.06, 0.09, 0.08, 0xdc2626, 0, -0.10, 0.12));
                g.add(head);
                const legs = [[-0.09, 0], [0.09, 0]].map(p => { const l = part(0.05, 0.32, 0.05, 0xf59e0b, p[0], 0.32, p[1], true); g.add(l); return l; });
                return { group: g, legs, head, wings: [wL, wR] };
            }
        },
        fox: {
            biomes: [1, 3, 5], n: 10, speed: 1.45, radius: 0.38, hp: 10, h: 0.72, xp: 3,
            build(rnd) {
                const snow = rnd() < 0.25;
                const fur = snow ? 0xeef6ff : 0xe86c24;
                const dark = snow ? 0xb4c8dc : 0x2b1d18;
                const face = makeFace(snow ? 'fox_s' : 'fox_o', snow ? '#eef6ff' : '#e86c24', g => {
                    g.fillStyle = '#ffffff'; g.fillRect(0, 5, 8, 3);
                    g.fillStyle = '#111827'; g.fillRect(1, 3, 1, 1); g.fillRect(6, 3, 1, 1);
                    g.fillStyle = '#111827'; g.fillRect(3, 6, 2, 1);
                });
                const g = new THREE.Group();
                g.add(part(0.46, 0.4, 0.86, fur, 0, 0.52, 0));
                // Bushy white-tipped tail
                const tail = part(0.26, 0.24, 0.52, fur, 0, 0.48, -0.62);
                tail.add(part(0.24, 0.22, 0.18, 0xffffff, 0, 0, -0.32));
                g.add(tail);
                const head = part(0.42, 0.34, 0.38, [matCol(fur), matCol(fur), matCol(fur), matCol(0xffffff), matTex(face), matCol(fur)], 0, 0.58, 0.56);
                head.add(part(0.18, 0.14, 0.18, 0xffffff, 0, -0.07, 0.24));
                head.add(part(0.11, 0.14, 0.08, dark, -0.15, 0.22, -0.02));
                head.add(part(0.11, 0.14, 0.08, dark, 0.15, 0.22, -0.02));
                g.add(head);
                const legs = [[-0.15, -0.28], [0.15, -0.28], [-0.15, 0.28], [0.15, 0.28]].map(p => { const l = part(0.12, 0.34, 0.12, dark, p[0], 0.34, p[1], true); g.add(l); return l; });
                return { group: g, legs, head, tail };
            }
        },

        /* ===== HOSTILE MONSTERS ===== */
        zombie: {
            hostile: true, biomes: [0, 1, 2, 3, 5, 6], n: 14, speed: 1.85, radius: 0.4, hp: 18, h: 1.9, dmg: 3, range: 20, xp: 5, burnsInSun: true,
            build() {
                const face = makeFace('zom_f', '#528044', g => {
                    g.fillStyle = '#3b6132'; g.fillRect(0, 0, 8, 2);
                    g.fillStyle = '#182b14'; g.fillRect(1, 3, 2, 2); g.fillRect(5, 3, 2, 2);
                    g.fillStyle = '#2d4a26'; g.fillRect(2, 6, 4, 1);
                });
                const g = new THREE.Group();
                const head = part(0.48, 0.48, 0.48, [matCol(0x528044), matCol(0x528044), matCol(0x3b6132), matCol(0x466d3a), matTex(face), matCol(0x466d3a)], 0, 1.62, 0);
                g.add(head);
                g.add(part(0.48, 0.72, 0.25, 0x0e7490, 0, 1.02, 0));
                const armL = part(0.2, 0.68, 0.2, 0x528044, -0.35, 1.32, 0, true);
                const armR = part(0.2, 0.68, 0.2, 0x528044, 0.35, 1.32, 0, true);
                armL.rotation.x = -1.45; armR.rotation.x = -1.45;
                g.add(armL); g.add(armR);
                const legs = [[-0.12, 0], [0.12, 0]].map(p => { const l = part(0.21, 0.66, 0.21, 0x312e81, p[0], 0.66, p[1], true); g.add(l); return l; });
                return { group: g, legs, head, arms: [armL, armR] };
            }
        },
        skeleton: {
            hostile: true, biomes: [0, 1, 2, 3, 6], n: 10, speed: 1.75, radius: 0.38, hp: 16, h: 1.9, dmg: 2, range: 22, ranged: true, xp: 6, burnsInSun: true,
            build() {
                const face = makeFace('ske_f', '#dcdcdc', g => {
                    g.fillStyle = '#1f2937'; g.fillRect(1, 3, 2, 2); g.fillRect(5, 3, 2, 2);
                    g.fillStyle = '#4b5563'; g.fillRect(3, 5, 2, 1);
                    g.fillStyle = '#1f2937'; g.fillRect(1, 6, 6, 1);
                });
                const ribs = pixelTex('ske_r', 8, 12, g => {
                    g.fillStyle = '#c8c8c8'; g.fillRect(0, 0, 8, 12);
                    g.fillStyle = '#262626'; g.fillRect(1, 2, 6, 1); g.fillRect(1, 5, 6, 1); g.fillRect(1, 8, 6, 1);
                    g.fillStyle = '#e5e5e5'; g.fillRect(3, 0, 2, 12);
                });
                const g = new THREE.Group();
                const head = part(0.46, 0.46, 0.46, [matCol(0xd4d4d4), matCol(0xd4d4d4), matCol(0xdcdcdc), matCol(0xc4c4c4), matTex(face), matCol(0xd4d4d4)], 0, 1.62, 0);
                g.add(head);
                g.add(part(0.42, 0.72, 0.2, matTex(ribs), 0, 1.02, 0));
                const armL = part(0.11, 0.68, 0.11, 0xd4d4d4, -0.30, 1.32, 0, true);
                const armR = part(0.11, 0.68, 0.11, 0xd4d4d4, 0.30, 1.32, 0, true);
                armR.rotation.x = -1.45; armL.rotation.x = -1.25;
                // 3D Voxel Bow in right hand
                const bow = part(0.06, 0.62, 0.16, 0x7c4a1d, 0, -0.58, 0.18);
                armR.add(bow);
                g.add(armL); g.add(armR);
                const legs = [[-0.12, 0], [0.12, 0]].map(p => { const l = part(0.12, 0.66, 0.12, 0xc8c8c8, p[0], 0.66, p[1], true); g.add(l); return l; });
                return { group: g, legs, head, arms: [armL, armR] };
            }
        },
        creeper: {
            hostile: true, biomes: [0, 1, 2, 5, 6], n: 10, speed: 1.9, radius: 0.42, hp: 16, h: 1.72, dmg: 7, range: 19, creeper: true, xp: 7,
            build() {
                const face = makeFace('crp_f', '#3ea838', g => {
                    g.fillStyle = '#2d8228'; g.fillRect(0, 0, 2, 2); g.fillRect(6, 0, 2, 1); g.fillRect(3, 1, 2, 1);
                    g.fillStyle = '#0c140b';
                    g.fillRect(1, 2, 2, 2); g.fillRect(5, 2, 2, 2);
                    g.fillRect(3, 4, 2, 2);
                    g.fillRect(2, 5, 4, 2);
                    g.fillRect(2, 7, 1, 1); g.fillRect(5, 7, 1, 1);
                });
                const bodyTex = pixelTex('crp_b', 8, 12, g => {
                    g.fillStyle = '#3ea838'; g.fillRect(0, 0, 8, 12);
                    for (let y = 0; y < 12; y++) for (let x = 0; x < 8; x++) {
                        const h = (x * 13 + y * 29) % 7;
                        if (h === 0) { g.fillStyle = '#2a7525'; g.fillRect(x, y, 1, 1); }
                        else if (h === 1) { g.fillStyle = '#6ad162'; g.fillRect(x, y, 1, 1); }
                    }
                });
                const g = new THREE.Group();
                const head = part(0.5, 0.5, 0.5, [matTex(bodyTex), matTex(bodyTex), matTex(bodyTex), matTex(bodyTex), matTex(face), matTex(bodyTex)], 0, 1.45, 0);
                g.add(head);
                g.add(part(0.46, 0.78, 0.30, matTex(bodyTex), 0, 0.82, 0));
                const legs = [[-0.15, -0.2], [0.15, -0.2], [-0.15, 0.2], [0.15, 0.2]].map(p => { const l = part(0.2, 0.44, 0.2, matTex(bodyTex), p[0], 0.44, p[1], true); g.add(l); return l; });
                return { group: g, legs, head };
            }
        },
        spider: {
            hostile: true, biomes: [1, 2, 6], n: 9, speed: 2.35, radius: 0.58, hp: 14, h: 0.85, dmg: 2, range: 17, xp: 5,
            build() {
                const face = makeFace('spd_f', '#252229', g => {
                    g.fillStyle = '#ef4444'; g.fillRect(1, 3, 2, 1); g.fillRect(5, 3, 2, 1);
                    g.fillStyle = '#ff6b6b'; g.fillRect(2, 5, 1, 1); g.fillRect(5, 5, 1, 1);
                });
                const g = new THREE.Group();
                g.add(part(0.7, 0.45, 0.78, 0x26222b, 0, 0.46, -0.25));
                const head = part(0.48, 0.38, 0.42, [matCol(0x252229), matCol(0x252229), matCol(0x252229), matCol(0x252229), matTex(face), matCol(0x252229)], 0, 0.44, 0.34);
                g.add(head);
                const legs = [];
                for (let s = -1; s <= 1; s += 2) {
                    for (let k = 0; k < 4; k++) {
                        const l = part(0.72, 0.1, 0.1, 0x1c1922, s * 0.42, 0.40, -0.3 + k * 0.22);
                        l.rotation.z = s * -0.45;
                        g.add(l); legs.push(l);
                    }
                }
                return { group: g, legs, head, isSpider: true };
            }
        },
        slime: {
            hostile: true, biomes: [0, 1, 5], n: 8, speed: 1.5, radius: 0.48, hp: 12, h: 0.96, dmg: 2, range: 14, slime: true, xp: 4,
            build() {
                const face = makeFace('slm_f', '#5ac847', g => {
                    g.fillStyle = '#1b4715'; g.fillRect(1, 2, 2, 2); g.fillRect(5, 2, 2, 2);
                    g.fillStyle = '#1b4715'; g.fillRect(3, 5, 2, 1);
                });
                const g = new THREE.Group();
                const outer = new THREE.Mesh(
                    new THREE.BoxGeometry(0.92, 0.92, 0.92),
                    new THREE.MeshBasicMaterial({ color: 0x6ee755, transparent: true, opacity: 0.62 })
                );
                outer.position.y = 0.46;
                const inner = new THREE.Mesh(
                    new THREE.BoxGeometry(0.62, 0.62, 0.62),
                    [matCol(0x4cb838), matCol(0x4cb838), matCol(0x4cb838), matCol(0x4cb838), matTex(face), matCol(0x4cb838)]
                );
                inner.position.y = 0.46;
                g.add(inner); g.add(outer);
                return { group: g, legs: [], head: null, outer, inner };
            }
        },
        /* ===== DIMENSION-EXCLUSIVE CREATURES ===== */
        magmaSlime: {
            hostile: true, biomes: [], n: 0, speed: 1.7, radius: 0.5, hp: 18, h: 1.0, dmg: 4, range: 18, slime: true, xp: 6,
            build() {
                const face = makeFace('mag_f', '#241414', g => {
                    g.fillStyle = '#ff6a00'; g.fillRect(1, 2, 2, 2); g.fillRect(5, 2, 2, 2);
                    g.fillStyle = '#ffd54a'; g.fillRect(2, 3, 1, 1); g.fillRect(5, 3, 1, 1);
                    g.fillStyle = '#ff4500'; g.fillRect(1, 5, 6, 1);
                });
                const g = new THREE.Group();
                const outer = new THREE.Mesh(
                    new THREE.BoxGeometry(0.96, 0.96, 0.96),
                    [matCol(0x2a1414), matCol(0x2a1414), matCol(0x3a1814), matCol(0x1f0e0e), matTex(face), matCol(0x2a1414)]
                );
                outer.position.y = 0.48;
                const glowBand = new THREE.Mesh(new THREE.BoxGeometry(0.99, 0.16, 0.99), matCol(0xff7b1a));
                glowBand.position.y = 0.34;
                g.add(outer); g.add(glowBand);
                return { group: g, legs: [], head: null };
            }
        },
        witherSkeleton: {
            hostile: true, biomes: [], n: 0, speed: 2.05, radius: 0.42, hp: 22, h: 2.25, dmg: 5, range: 22, xp: 9,
            build() {
                const face = makeFace('wsk_f', '#242228', g => {
                    g.fillStyle = '#0c0b0e'; g.fillRect(1, 3, 2, 2); g.fillRect(5, 3, 2, 2);
                    g.fillStyle = '#f97316'; g.fillRect(2, 4, 1, 1); g.fillRect(5, 4, 1, 1);
                    g.fillStyle = '#111116'; g.fillRect(1, 6, 6, 1);
                });
                const g = new THREE.Group();
                const head = part(0.50, 0.50, 0.50, [matCol(0x242228), matCol(0x242228), matCol(0x1b191f), matCol(0x1b191f), matTex(face), matCol(0x242228)], 0, 1.96, 0);
                g.add(head);
                g.add(part(0.46, 0.86, 0.22, 0x1e1d24, 0, 1.24, 0));
                const armL = part(0.13, 0.82, 0.13, 0x26242c, -0.32, 1.62, 0, true);
                const armR = part(0.13, 0.82, 0.13, 0x26242c, 0.32, 1.62, 0, true);
                armR.rotation.x = -1.35;
                // Stone greatsword
                armR.add(part(0.08, 0.82, 0.12, 0x64748b, 0, -0.78, 0.24));
                g.add(armL); g.add(armR);
                const legs = [[-0.13, 0], [0.13, 0]].map(p => { const l = part(0.14, 0.82, 0.14, 0x201f26, p[0], 0.82, p[1], true); g.add(l); return l; });
                return { group: g, legs, head, arms: [armL, armR] };
            }
        },
        skySheep: {
            biomes: [], n: 0, speed: 0.9, radius: 0.46, hp: 10, h: 1.4, xp: 3,
            build(rnd) {
                const cols = [0xe0f2fe, 0xfef08a, 0xf5d0fe, 0xffffff];
                const wc = cols[(rnd() * cols.length) | 0];
                const face = makeFace('sks_f', '#f8fafc', g => {
                    g.fillStyle = '#bae6fd'; g.fillRect(0, 0, 8, 2);
                    g.fillStyle = '#38bdf8'; g.fillRect(1, 3, 2, 1); g.fillRect(5, 3, 2, 1);
                    g.fillStyle = '#0369a1'; g.fillRect(2, 3, 1, 1); g.fillRect(5, 3, 1, 1);
                    g.fillStyle = '#fda4af'; g.fillRect(3, 6, 2, 1);
                });
                const g = new THREE.Group();
                g.add(part(0.92, 0.80, 1.22, wc, 0, 0.98, 0));
                const head = part(0.42, 0.44, 0.44, [matCol(0xf1f5f9), matCol(0xf1f5f9), matCol(wc), matCol(0xf1f5f9), matTex(face), matCol(wc)], 0, 1.18, 0.74);
                g.add(head);
                const legs = [[-0.25, -0.4], [0.25, -0.4], [-0.25, 0.4], [0.25, 0.4]].map(p => { const l = part(0.18, 0.56, 0.18, 0xe2e8f0, p[0], 0.56, p[1], true); g.add(l); return l; });
                return { group: g, legs, head };
            }
        },
        enderman: {
            hostile: true, biomes: [], n: 0, speed: 2.25, radius: 0.42, hp: 26, h: 2.8, dmg: 5, range: 20, xp: 10,
            build() {
                const face = makeFace('end_f', '#0d0c14', g => {
                    g.fillStyle = '#f5d0fe'; g.fillRect(1, 3, 2, 1); g.fillRect(5, 3, 2, 1);
                    g.fillStyle = '#d946ef'; g.fillRect(2, 3, 1, 1); g.fillRect(5, 3, 1, 1);
                });
                const g = new THREE.Group();
                const head = part(0.48, 0.48, 0.48, [matCol(0x0d0c14), matCol(0x0d0c14), matCol(0x0d0c14), matCol(0x0d0c14), matTex(face), matCol(0x0d0c14)], 0, 2.52, 0);
                g.add(head);
                g.add(part(0.46, 0.82, 0.24, 0x13111c, 0, 1.84, 0));
                const armL = part(0.11, 1.38, 0.11, 0x0f0d17, -0.32, 2.22, 0, true);
                const armR = part(0.11, 1.38, 0.11, 0x0f0d17, 0.32, 2.22, 0, true);
                g.add(armL); g.add(armR);
                const legs = [[-0.14, 0], [0.14, 0]].map(p => { const l = part(0.12, 1.42, 0.12, 0x0f0d17, p[0], 1.42, p[1], true); g.add(l); return l; });
                return { group: g, legs, head, arms: [armL, armR] };
            }
        }
    };

    // Scans walkable floor height cleanly — handles Nether & Abyssal Dungeon ceilings!
    function floorAt(x, z, refY) {
        const bx = Math.floor(x), bz = Math.floor(z);
        if (W.dim === 'nether' || W.dim === 'dungeon') {
            const startY = refY !== undefined
                ? Math.min(W.SY - 3, Math.floor(refY) + 2)
                : (W.dim === 'nether' ? 40 : 21);
            for (let y = startY; y >= 2; y--) {
                const b = W.get(bx, y, bz);
                const abv = W.get(bx, y + 1, bz);
                if (b && W.DEF[b].solid && (!abv || !W.DEF[abv].solid)) return y;
            }
            return -1;
        }
        return W.topY(bx, bz);
    }
    function groundAt(x, z, refY) { return floorAt(x, z, refY); }

    function spawnMob(k, x, y, z, rnd, isDungeon) {
        const K = KINDS[k];
        const body = K.build(rnd);
        body.hpBar = makeHpBar();
        body.hpBar.position.set(0, K.h + 0.42, 0);
        body.group.add(body.hpBar);
        body.group.position.set(x, y, z);
        body.group.rotation.y = rnd() * 6.28;
        E.scene.add(body.group);
        body.meshes = [];
        body.group.traverse(o => {
            if (o.isMesh && o.material) {
                const mats = Array.isArray(o.material) ? o.material : [o.material];
                mats.forEach(mt => { if (mt.color) mt.userData.c0 = mt.color.clone(); });
                body.meshes.push(o);
            }
        });
        M.list.push({
            kind: k, K, body,
            x, y, z, hx: x, hy: y, hz: z,
            yaw: rnd() * 6.28, tYaw: 0, state: 'idle', timer: rnd() * 3, phase: rnd() * 6,
            wob: 0, hp: K.hp, hurt: 0, panic: 0, kx: 0, kz: 0, dead: 0,
            atkCd: 1.0, fuse: 0, hop: 0, burnT: 0, isDungeon: !!isDungeon
        });
    }

    function disposeMobGroup(grp) {
        E.scene.remove(grp);
        grp.traverse(o => {
            if (o.geometry) o.geometry.dispose();
            if (o.isSprite && o.material) {
                if (o.material.map) o.material.map.dispose();
                o.material.dispose();
            }
        });
    }

    M.clearAll = function () {
        M.list.forEach(m => disposeMobGroup(m.body.group)); M.list.length = 0;
        M.birds.forEach(b => disposeMobGroup(b)); M.birds.length = 0;
        M.fish.forEach(f => disposeMobGroup(f)); M.fish.length = 0;
        M.arrows.forEach(a => E.scene.remove(a.mesh)); M.arrows.length = 0;
    };

    function spawnDimensionMobs() {
        const dim = W.dim || 'overworld';
        const rnd = W.mulberry32(dim === 'overworld' ? 4242 : dim === 'nether' ? 6666 : dim === 'aether' ? 7777 : dim === 'cosmos' ? 8888 : 9999);

        if (dim === 'overworld') {
            Object.keys(KINDS).forEach(k => {
                const K = KINDS[k]; if (!K.n) return;
                let n = 0, tries = 0;
                const minR = K.hostile ? 48 : 16;
                while (n < K.n && tries++ < 1200) {
                    const x = ((rnd() * (W.SX - 24)) | 0) - W.OX + 12;
                    const z = ((rnd() * (W.SZ - 24)) | 0) - W.OZ + 12;
                    if (Math.hypot(x, z) < minR) continue;
                    if (K.hostile && W.isProtected(x, W.BASE, z)) continue;
                    const bio = W.biomeMap[(z + W.OZ) * W.SX + (x + W.OX)];
                    if (!K.biomes.includes(bio)) continue;
                    const y = floorAt(x, z), top = W.get(x, y, z);
                    if (y <= W.WATER + 1 || top === W.B.WATER || top === W.B.LAVA) continue;
                    if (!K.hostile && top !== W.B.GRASS && top !== W.B.SNOW && top !== W.B.SNOW_GRASS && top !== W.B.SAND) continue;
                    const abv = W.get(x, y + 1, z);
                    if (abv !== 0 && !W.DEF[abv].cross) continue;
                    spawnMob(k, x + 0.5, y + 1, z + 0.5, rnd, false);
                    n++;
                }
            });

            // Overworld dungeon guardians
            W.dungeons.forEach((d, idx) => {
                const kinds = ['zombie', 'skeleton', 'spider'];
                spawnMob(kinds[idx % 3], d.rx + 4.5, 9, d.rz + 0.5, rnd, true);
                spawnMob(kinds[(idx + 1) % 3], d.rx + 7.5, 9, d.rz - 1.5, rnd, true);
            });

            // Soaring Birds
            for (let i = 0; i < 16; i++) {
                const g = new THREE.Group();
                const col = i % 2 === 0 ? 0xf1f5f9 : 0x2c3240;
                const b = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.09, 0.28), matCol(col));
                const wl = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.03, 0.22), matCol(col));
                const wr = wl.clone();
                wl.position.x = -0.42; wr.position.x = 0.42;
                g.add(b); g.add(wl); g.add(wr);
                g.userData = { wl, wr, cx: (rnd() - 0.5) * 165, cz: (rnd() - 0.5) * 165, r: 16 + rnd() * 30, h: 42 + rnd() * 16, sp: 0.16 + rnd() * 0.16, ph: rnd() * 6.28 };
                E.scene.add(g); M.birds.push(g);
            }

            // Tropical Fish
            const fishCols = [0xf97316, 0x38bdf8, 0xfacc15, 0xf43f5e, 0xa855f7];
            let ft = 0;
            while (M.fish.length < 44 && ft++ < 4500) {
                const x = ((rnd() * W.SX) | 0) - W.OX, z = ((rnd() * W.SZ) | 0) - W.OZ, h = W.topY(x, z);
                if (h > W.WATER - 2 || W.get(x, W.WATER, z) !== W.B.WATER) continue;
                const fc = fishCols[M.fish.length % fishCols.length];
                const f = new THREE.Group();
                f.add(part(0.42, 0.22, 0.14, fc, 0, 0, 0));
                const tail = part(0.16, 0.22, 0.05, 0xfef08a, -0.28, 0, 0);
                f.add(tail);
                f.position.set(x + 0.5, Math.max(h + 1.5, W.WATER - 1.8 - rnd() * 1.6), z + 0.5);
                f.userData = { x: x + 0.5, z: z + 0.5, a: rnd() * 6.28, sp: 0.55 + rnd() * 0.7, y: f.position.y, t: rnd() * 6, tail };
                E.scene.add(f); M.fish.push(f);
            }
        } else if (dim === 'nether') {
            // Magma Slimes & Wither Skeletons across Nether terrain & Fortress!
            const spawnRandom = (kind, count) => {
                let n = 0, tries = 0;
                while (n < count && tries++ < 900) {
                    const x = ((rnd() * (W.SX - 20)) | 0) - W.OX + 10;
                    const z = ((rnd() * (W.SZ - 20)) | 0) - W.OZ + 10;
                    if (W.isProtected(x, 20, z)) continue;
                    const y = floorAt(x, z, 40);
                    if (y < 12 || y > 38) continue;
                    const top = W.get(x, y, z);
                    if (top === W.B.LAVA || top === W.B.MAGMA) continue;
                    if (W.get(x, y + 1, z) !== 0 || W.get(x, y + 2, z) !== 0) continue;
                    spawnMob(kind, x + 0.5, y + 1, z + 0.5, rnd, false);
                    n++;
                }
            };
            spawnRandom('magmaSlime', 10);
            spawnRandom('witherSkeleton', 8);
            spawnRandom('skeleton', 5);
        } else if (dim === 'aether') {
            // Peaceful Sky Sheep, Golden Foxes & High Soaring Golden Sky Birds!
            const spawnIsland = (kind, count) => {
                let n = 0, tries = 0;
                while (n < count && tries++ < 1200) {
                    const x = ((rnd() * (W.SX - 16)) | 0) - W.OX + 8;
                    const z = ((rnd() * (W.SZ - 16)) | 0) - W.OZ + 8;
                    const y = W.topY(x, z);
                    if (y < 14) continue;
                    const top = W.get(x, y, z);
                    if (top !== W.B.AETHER_GRASS && top !== W.B.CLOUD_BLOCK) continue;
                    if (W.get(x, y + 1, z) !== 0) continue;
                    spawnMob(kind, x + 0.5, y + 1, z + 0.5, rnd, false);
                    n++;
                }
            };
            spawnIsland('skySheep', 12);
            spawnIsland('fox', 5);
            for (let i = 0; i < 14; i++) {
                const g = new THREE.Group();
                const col = i % 2 === 0 ? 0xfef08a : 0x7dd3fc;
                const b = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.10, 0.30), matCol(col));
                const wl = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.03, 0.24), matCol(col));
                const wr = wl.clone();
                wl.position.x = -0.46; wr.position.x = 0.46;
                g.add(b); g.add(wl); g.add(wr);
                g.userData = { wl, wr, cx: (rnd() - 0.5) * 90, cz: (rnd() - 0.5) * 90, r: 12 + rnd() * 24, h: 46 + rnd() * 14, sp: 0.2 + rnd() * 0.18, ph: rnd() * 6.28 };
                E.scene.add(g); M.birds.push(g);
            }
        } else if (dim === 'cosmos') {
            // Void Endermen & Cosmic Slimes patrolling asteroids & Citadel!
            let n = 0, tries = 0;
            while (n < 12 && tries++ < 1200) {
                const x = ((rnd() * (W.SX - 18)) | 0) - W.OX + 9;
                const z = ((rnd() * (W.SZ - 18)) | 0) - W.OZ + 9;
                if (Math.hypot(x, z) < 10) continue;
                const y = W.topY(x, z);
                if (y < 14) continue;
                const top = W.get(x, y, z);
                if (top !== W.B.END_STONE && top !== W.B.PURPUR) continue;
                if (W.get(x, y + 1, z) !== 0 || W.get(x, y + 2, z) !== 0) continue;
                spawnMob(n < 9 ? 'enderman' : 'slime', x + 0.5, y + 1, z + 0.5, rnd, false);
                n++;
            }
        } else if (dim === 'dungeon') {
            // Guarded Abyssal Fortress wings (North Treasury, West Library, East Amethyst Sanctum)
            const spots = [
                ['zombie', 0, 11, -18], ['skeleton', -2, 11, -24], ['spider', 2, 11, -27],
                ['witherSkeleton', 0, 12, -37], ['skeleton', -3, 12, -39], ['zombie', 3, 12, -39],
                ['zombie', -18, 11, 0], ['skeleton', -34, 11, -5], ['spider', -38, 11, 5],
                ['spider', 18, 11, 0], ['skeleton', 34, 11, -6], ['zombie', 38, 11, 6]
            ];
            spots.forEach(s => spawnMob(s[0], s[1] + 0.5, s[2], s[3] + 0.5, rnd, true));
        }
    }

    M.init = function () { spawnDimensionMobs(); };
    M.rebuildForDimension = function () { M.clearAll(); spawnDimensionMobs(); };

    /* ---------- Skeleton Arrows ---------- */
    const arrowGeo = new THREE.BoxGeometry(0.06, 0.06, 0.55);
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
    function fireArrow(m, ppos) {
        const A = window.CVA;
        if (A) A.play('bow');
        const sx = m.x, sy = m.y + 1.35, sz = m.z;
        const dx = ppos.x - sx, dy = (ppos.y + 1.1) - sy, dz = ppos.z - sz;
        const d = Math.hypot(dx, dz) || 1;
        const spd = 17.5;
        const vx = (dx / d) * spd, vz = (dz / d) * spd;
        const vy = (dy / d) * spd + d * 0.24;
        const mesh = new THREE.Mesh(arrowGeo, arrowMat);
        mesh.position.set(sx, sy, sz);
        E.scene.add(mesh);
        M.arrows.push({ mesh, x: sx, y: sy, z: sz, vx, vy, vz, life: 4.0 });
    }

    /* ---------- Creeper Explosion (Protected-Zone Safe!) ---------- */
    function creeperBoom(m) {
        const X = window.CVX, P = window.CVP, A = window.CVA;
        if (A) A.play('boom');
        if (X) {
            X.burst(m.x, m.y + 0.8, m.z, 0xff7b29, 32, 8.5, 6);
            X.burst(m.x, m.y + 0.8, m.z, 0x9ca3af, 26, 6.5, 2);
        }
        // Damage player if nearby
        if (P) {
            const dx = P.pos.x - m.x, dy = P.pos.y - m.y, dz = P.pos.z - m.z;
            const dist = Math.hypot(dx, dy, dz);
            if (dist < 6.0) {
                const dmg = Math.max(2, Math.round((1 - dist / 6.0) * 9));
                const l = Math.hypot(dx, dz) || 1;
                P.hurt(dmg, (dx / l) * 9.5, (dz / l) * 9.5);
            }
        }
        // Carve crater ONLY on non-protected terrain blocks
        const cx = Math.floor(m.x), cy = Math.floor(m.y), cz = Math.floor(m.z);
        for (let dx = -2; dx <= 2; dx++) for (let dy = -1; dy <= 2; dy++) for (let dz = -2; dz <= 2; dz++) {
            if (dx * dx + dy * dy + dz * dz > 5) continue;
            const bx = cx + dx, by = cy + dy, bz = cz + dz;
            if (by <= 1 || W.isProtected(bx, by, bz)) continue;
            const id = W.get(bx, by, bz);
            if (!id || id === W.B.BEDROCK || id === W.B.OBSIDIAN || id === W.B.WATER || id === W.B.LAVA) continue;
            if (W.infoMap.has(bx + ',' + by + ',' + bz)) continue;
            E.setBlock(bx, by, bz, 0);
        }
        m.dead = 45; m.fuse = 0; m.body.group.visible = false;
    }

    /* ---------- Player Melee Attack Hit Detection ---------- */
    M.hit = function (o, d, reach, blockDist, dmg) {
        let best = null, bt = Math.min(reach, blockDist);
        for (let i = 0; i < M.list.length; i++) {
            const m = M.list[i];
            if (m.dead || (m.K.hostile && M.peaceful)) continue;
            const r = m.K.radius + 0.22;
            const cx = m.x - o.x, cy = m.y + m.K.h * 0.5 - o.y, cz = m.z - o.z;
            const t = cx * d.x + cy * d.y + cz * d.z;
            if (t < 0 || t > bt) continue;
            const px = o.x + d.x * t - m.x, py = o.y + d.y * t - (m.y + m.K.h * 0.5), pz = o.z + d.z * t - m.z;
            if (Math.abs(px) < r && Math.abs(pz) < r && Math.abs(py) < m.K.h * 0.5 + 0.18) { best = m; bt = t; }
        }
        if (!best) return null;
        const m = best;
        m.hp -= dmg; m.hurt = 0.36; m.fuse = Math.max(0, m.fuse - 0.5);
        if (!m.K.hostile) { m.panic = 4.5; m.state = 'walk'; m.timer = 3; }
        const l = Math.hypot(d.x, d.z) || 1;
        m.kx = (d.x / l) * 6.5; m.kz = (d.z / l) * 6.5;
        m.tYaw = Math.atan2(d.x, d.z);
        const killed = m.hp <= 0;
        updateHpBar(m);
        if (killed) {
            m.dead = m.K.hostile ? 55 : 40;
            m.body.group.visible = false;
            if (window.CVX) window.CVX.spawnXp(m.x, m.y + 0.4, m.z, m.K.xp || 2);
        }
        return { mob: m, kind: m.kind, hostile: !!m.K.hostile, killed, x: m.x, y: m.y + m.K.h * 0.5, z: m.z };
    };

    M.getNearbyHostiles = function () {
        if (M.peaceful) return [];
        const out = [];
        for (let i = 0; i < M.list.length; i++) {
            const m = M.list[i];
            if (m.K.hostile && !m.dead && m.body.group.visible) out.push(m);
        }
        return out;
    };

    /* ---------- Frame Update ---------- */
    M.update = function (dt, t, ppos) {
        const P = window.CVP, X = window.CVX, A = window.CVA;
        const day = E.dayFactor !== undefined ? E.dayFactor : 1;

        for (let i = 0; i < M.list.length; i++) {
            const m = M.list[i];
            if (m.dead > 0) {
                m.dead -= dt;
                if (m.dead <= 0) {
                    m.dead = 0; m.hp = m.K.hp; m.x = m.hx; m.z = m.hz;
                    m.y = m.isDungeon ? m.hy : (groundAt(m.x, m.z, m.hy) + 1);
                    m.panic = 0; m.kx = m.kz = 0; m.fuse = 0;
                    updateHpBar(m);
                }
                continue;
            }

            if (m.K.hostile && M.peaceful) { m.body.group.visible = false; continue; }

            const dx = ppos.x - m.x, dyP = ppos.y - m.y, dz = ppos.z - m.z;
            const d2 = dx * dx + dz * dz;
            if (d2 > 110 * 110) { m.body.group.visible = false; continue; }
            m.body.group.visible = true;
            if (d2 > 64 * 64) continue;

            const dist = Math.sqrt(d2);
            if (m.hurt > 0) m.hurt = Math.max(0, m.hurt - dt);
            if (m.atkCd > 0) m.atkCd -= dt;

            // Undead burn in direct Overworld sunlight!
            const sl = W.getSkyLight(Math.floor(m.x), Math.floor(m.y + 1), Math.floor(m.z));
            const bl = W.getBlockLight(Math.floor(m.x), Math.floor(m.y + 1), Math.floor(m.z));
            if (W.dim === 'overworld' && m.K.burnsInSun && !E.isNight && day > 0.72 && sl >= 13 && (E.rainAmt || 0) < 0.3) {
                m.burnT += dt;
                if (m.burnT > 1.2) {
                    m.burnT = 0;
                    m.hp -= 2; m.hurt = 0.25; updateHpBar(m);
                    if (X) X.burst(m.x, m.y + 1.2, m.z, 0xff7b29, 6, 2.5, -1);
                    if (m.hp <= 0) {
                        m.dead = 55; m.body.group.visible = false;
                        if (X) X.burst(m.x, m.y + 1.0, m.z, 0xffffff, 12, 3.0, 2);
                        continue;
                    }
                }
            }

            // AI State Machine
            m.timer -= dt;
            let spd = 0;
            const canAggro = m.K.hostile && !M.peaceful && (!P || !P.flying) && dist < m.K.range && Math.abs(dyP) < 8 && !W.isProtected(Math.floor(ppos.x), Math.floor(ppos.y), Math.floor(ppos.z));

            if (canAggro) {
                m.tYaw = Math.atan2(dx, dz);
                if (m.K.creeper) {
                    if (dist < 3.2) {
                        if (m.fuse === 0 && A) A.play('hiss');
                        m.fuse += dt; m.state = 'idle'; spd = 0;
                        if (m.fuse >= 1.35) { creeperBoom(m); continue; }
                    } else {
                        m.fuse = Math.max(0, m.fuse - dt * 1.4);
                        m.state = 'walk'; spd = m.K.speed;
                    }
                } else if (m.K.ranged) {
                    if (dist > 11) { m.state = 'walk'; spd = m.K.speed; }
                    else if (dist < 5.5) { m.tYaw = Math.atan2(-dx, -dz); m.state = 'walk'; spd = m.K.speed * 0.85; }
                    else { m.state = 'idle'; spd = 0; }
                    if (dist < 17 && m.atkCd <= 0) { m.atkCd = 2.1; fireArrow(m, ppos); }
                } else {
                    m.state = 'walk'; spd = m.K.speed;
                    if (dist < 1.65 && Math.abs(dyP) < 1.6 && m.atkCd <= 0 && P) {
                        m.atkCd = 1.05;
                        const l = dist || 1;
                        P.hurt(m.K.dmg || 2, (dx / l) * 5.2, (dz / l) * 5.2);
                    }
                }
            } else {
                m.fuse = Math.max(0, m.fuse - dt * 2);
                if (m.panic > 0) {
                    m.panic -= dt; m.state = 'walk'; m.timer = 1; spd = m.K.speed * 2.5;
                    if (d2 < 120) m.tYaw = Math.atan2(-dx, -dz);
                } else if (!m.K.hostile && d2 < 12 && m.kind !== 'sheep' && m.kind !== 'skySheep' && m.kind !== 'cow') {
                    m.tYaw = Math.atan2(-dx, -dz); m.state = 'walk'; m.timer = 1.1; spd = m.K.speed * 2.1;
                } else if (m.timer <= 0) {
                    if (m.state === 'idle') { m.state = 'walk'; m.tYaw = Math.random() * 6.28; m.timer = 1.5 + Math.random() * 3; }
                    else { m.state = 'idle'; m.timer = 1.2 + Math.random() * 3.8; }
                }
                if (m.state === 'walk' && spd === 0) spd = m.K.speed * (m.K.hostile ? 0.65 : 1);
            }

            // Smooth turn
            let dy = m.tYaw - m.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
            m.yaw += dy * Math.min(1, 6.5 * dt);

            // Movement & obstacle / lava / cliff / void / protected zone avoidance
            if (m.state === 'walk' && spd > 0) {
                const sx = Math.sin(m.yaw), cz = Math.cos(m.yaw), r = m.K.radius + 0.22;
                const nx = m.x + sx * spd * dt, nz = m.z + cz * spd * dt;
                const fx = Math.floor(nx + sx * r), fz = Math.floor(nz + cz * r);
                const gRaw = m.isDungeon ? (m.hy - 1) : groundAt(nx + sx * r, nz + cz * r, m.y);
                const gy = gRaw + 1;
                const floorB = W.get(fx, gRaw, fz);
                const headBlk = W.get(fx, Math.floor(m.y + 0.6), fz);
                const badWall = (m.isDungeon && headBlk && W.DEF[headBlk].solid) || (!m.isDungeon && (gRaw < 2 || Math.abs(gy - m.y) > 1.5));
                const badFloor = floorB === W.B.WATER || floorB === W.B.LAVA || (W.dim === 'overworld' && !m.isDungeon && gy <= W.WATER + 1);
                const badZone = m.K.hostile && W.isProtected(fx, gy, fz);
                if (badWall || badFloor || badZone) {
                    m.tYaw += 1.9 + Math.random() * 1.2;
                } else {
                    m.x = nx; m.z = nz;
                    if (!m.isDungeon) m.y += (gy - m.y) * Math.min(1, 10 * dt);
                    m.wob += dt * spd * 4.5;
                }
            }

            // Knockback decay
            if (m.kx || m.kz) {
                const kx = m.x + m.kx * dt, kz = m.z + m.kz * dt;
                const kgRaw = m.isDungeon ? (m.hy - 1) : groundAt(kx, kz, m.y);
                const kgy = kgRaw + 1;
                if (kgRaw >= 2 && Math.abs(kgy - m.y) <= 1.4 && (!m.isDungeon ? (W.dim !== 'overworld' || kgy > W.WATER + 1) : !W.DEF[W.get(Math.floor(kx), Math.floor(m.y + 0.5), Math.floor(kz))].solid)) {
                    m.x = kx; m.z = kz;
                }
                m.kx *= Math.max(0, 1 - 8 * dt); m.kz *= Math.max(0, 1 - 8 * dt);
                if (Math.abs(m.kx) + Math.abs(m.kz) < 0.08) m.kx = m.kz = 0;
            }

            // Slime bounce + Creeper fuse swell + Hurt flash + Light-level tint
            const g = m.body.group;
            let bounceY = 0;
            if (m.K.slime) {
                m.hop += dt * (m.state === 'walk' ? 6.5 : 2.5);
                bounceY = Math.max(0, Math.sin(m.hop)) * 0.55;
                const sq = bounceY > 0.05 ? 1 + bounceY * 0.25 : 0.88;
                g.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
            } else if (m.K.creeper && m.fuse > 0) {
                const s = 1 + m.fuse * 0.26;
                g.scale.set(s, 1 + m.fuse * 0.14, s);
            } else {
                g.scale.set(1, 1, 1);
            }

            g.position.set(m.x, m.y + bounceY + (m.hurt > 0 ? 0.1 : 0), m.z);
            g.rotation.y = m.yaw;
            g.rotation.z = m.hurt > 0 ? 0.22 : 0;

            // Animate legs, wings, tails, arms
            const sw = m.state === 'walk' ? Math.sin(m.wob * 2) * 0.62 : 0;
            if (m.body.isSpider) {
                m.body.legs.forEach((l, idx) => { l.rotation.y = Math.sin(m.wob * 3 + idx * 1.4) * 0.35; });
            } else {
                m.body.legs.forEach((l, idx) => { l.rotation.x = (idx % 2 ? -sw : sw) * (idx > 1 ? -1 : 1); });
            }
            if (m.body.wings) {
                const wf = m.state === 'walk' ? Math.abs(Math.sin(t * 14 + m.phase)) * 0.7 : 0;
                m.body.wings[0].rotation.z = wf; m.body.wings[1].rotation.z = -wf;
            }
            if (m.body.tail) m.body.tail.rotation.y = Math.sin(t * 4 + m.phase) * 0.25;
            if (m.body.head) m.body.head.rotation.x = m.state === 'idle' ? Math.sin(t * 1.3 + m.phase) * 0.22 + 0.1 : 0;

            // Color tinting (red hurt flash, creeper white fuse blink, or ambient light)
            const flashWhite = m.K.creeper && m.fuse > 0 && Math.floor(m.fuse * 12) % 2 === 0;
            const lt = Math.min(1.05, Math.max((sl / 15) * (0.24 + day * 0.76), (bl / 15) * 0.95, 0.22));
            for (let k = 0; k < m.body.meshes.length; k++) {
                const mesh = m.body.meshes[k];
                const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                for (let j = 0; j < mats.length; j++) {
                    const mt = mats[j]; if (!mt.userData.c0) continue;
                    if (m.hurt > 0) mt.color.setHex(0xff5252);
                    else if (flashWhite) mt.color.setHex(0xffffff);
                    else mt.color.copy(mt.userData.c0).multiplyScalar(lt);
                }
            }
        }

        // Update Skeleton Arrows
        for (let i = M.arrows.length - 1; i >= 0; i--) {
            const ar = M.arrows[i];
            ar.life -= dt;
            ar.vy -= 12 * dt;
            ar.x += ar.vx * dt; ar.y += ar.vy * dt; ar.z += ar.vz * dt;
            ar.mesh.position.set(ar.x, ar.y, ar.z);
            ar.mesh.lookAt(ar.x + ar.vx, ar.y + ar.vy, ar.z + ar.vz);
            const hitB = W.get(Math.floor(ar.x), Math.floor(ar.y), Math.floor(ar.z));
            const hitP = P && !P.flying && Math.hypot(ar.x - P.pos.x, ar.z - P.pos.z) < 0.65 && ar.y >= P.pos.y && ar.y <= P.pos.y + 1.85;
            if (hitP) {
                const l = Math.hypot(ar.vx, ar.vz) || 1;
                P.hurt(2, (ar.vx / l) * 4, (ar.vz / l) * 4);
                E.scene.remove(ar.mesh); M.arrows.splice(i, 1);
            } else if ((hitB && W.DEF[hitB].solid) || ar.life <= 0) {
                E.scene.remove(ar.mesh); M.arrows.splice(i, 1);
            }
        }

        // Soaring Birds
        for (let i = 0; i < M.birds.length; i++) {
            const b = M.birds[i], u = b.userData, a = t * u.sp + u.ph;
            b.position.set(u.cx + Math.cos(a) * u.r, u.h + Math.sin(t * 0.7 + u.ph) * 1.6, u.cz + Math.sin(a) * u.r);
            b.rotation.y = -a;
            const f = Math.sin(t * 7.5 + u.ph) * 0.55;
            u.wl.rotation.z = f; u.wr.rotation.z = -f;
        }

        // Swimming Fish
        for (let i = 0; i < M.fish.length; i++) {
            const f = M.fish[i], u = f.userData;
            u.t += dt; u.a += Math.sin(u.t * 0.7) * dt * 0.8;
            const nx = u.x + Math.cos(u.a) * u.sp * dt, nz = u.z + Math.sin(u.a) * u.sp * dt;
            if (W.get(Math.floor(nx), Math.floor(u.y), Math.floor(nz)) === W.B.WATER) { u.x = nx; u.z = nz; } else u.a += 2.4;
            f.position.set(u.x, u.y + Math.sin(u.t * 2.2) * 0.08, u.z);
            f.rotation.y = -u.a;
            if (u.tail) u.tail.rotation.y = Math.sin(u.t * 10) * 0.45;
        }
    };
})();
