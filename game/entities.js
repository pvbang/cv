/* CV World — Textured NPCs, Knowledge Shards, Multi-Portals, Dynamic Clouds, Weather, Ambient Particles & XP Orbs */
(function () {
    'use strict';
    const W = window.CVW, E = window.CVE, CV = window.CV_DATA;
    const X = {
        npcs: [], shards: [], signs: [], clouds: [], portals: [],
        particles: [], xpOrbs: [], collected: new Set(), talkedIds: new Set(),
        weather: 'clear', rainT: 0
    };
    window.CVX = X;

    function hex(c) { return '#' + c.toString(16).padStart(6, '0'); }

    /* ---------- Crisp 3D Floating Canvas Signs ---------- */
    function makeSign(s) {
        const c = document.createElement('canvas'), g = c.getContext('2d');
        const fs = 52;
        const font = '700 ' + fs + 'px "JetBrains Mono", monospace';
        g.font = font;
        const w = Math.ceil(g.measureText(s.text).width) + 52;
        c.width = w; c.height = fs + 34;
        g.font = font;
        g.fillStyle = 'rgba(7, 11, 22, 0.82)';
        g.beginPath();
        if (g.roundRect) g.roundRect(2, 2, c.width - 4, c.height - 4, 12); else g.rect(2, 2, c.width - 4, c.height - 4);
        g.fill();
        g.strokeStyle = s.color; g.lineWidth = 4; g.stroke();
        g.fillStyle = s.color; g.textBaseline = 'middle';
        g.fillText(s.text, 26, c.height / 2 + 2);
        const tex = new THREE.CanvasTexture(c);
        tex.minFilter = THREE.LinearFilter;
        const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: true }));
        const h = 0.54 * s.size;
        spr.scale.set(h * c.width / c.height, h, 1);
        spr.position.set(s.x, s.y, s.z);
        return spr;
    }

    /* ---------- Pixel-Art Textured Minecraft NPCs ---------- */
    function makeNpcFaceTex(id, blink) {
        const c = document.createElement('canvas'); c.width = 8; c.height = 8;
        const g = c.getContext('2d');
        const skin = id === 'prof' ? '#e5b88f' : (id === 'trader' ? '#d9a476' : '#ecc198');
        const hair = id === 'bang' ? '#191d28' : (id === 'prof' ? '#5c6678' : (id === 'lead' ? '#3a2718' : '#4f2c1b'));
        g.fillStyle = skin; g.fillRect(0, 0, 8, 8);
        // Hair fringe
        g.fillStyle = hair; g.fillRect(0, 0, 8, 2);
        if (id === 'bang') { g.fillRect(0, 2, 1, 2); g.fillRect(7, 2, 1, 2); g.fillRect(2, 2, 3, 1); }
        else if (id === 'prof') { g.fillRect(0, 2, 1, 1); g.fillRect(7, 2, 1, 1); }
        else if (id === 'trader') { g.fillStyle = '#c2410c'; g.fillRect(0, 0, 8, 2); g.fillStyle = '#fbbf24'; g.fillRect(3, 1, 2, 1); }
        // Eyes
        if (blink) {
            g.fillStyle = '#7a523c'; g.fillRect(1, 4, 2, 1); g.fillRect(5, 4, 2, 1);
        } else {
            g.fillStyle = '#ffffff'; g.fillRect(1, 4, 2, 1); g.fillRect(5, 4, 2, 1);
            g.fillStyle = id === 'bang' ? '#0ea5e9' : '#1e293b';
            g.fillRect(2, 4, 1, 1); g.fillRect(5, 4, 1, 1);
        }
        // Glasses for Professor
        if (id === 'prof') {
            g.fillStyle = 'rgba(180,235,255,0.45)'; g.fillRect(1, 3, 2, 2); g.fillRect(5, 3, 2, 2);
            g.fillStyle = '#334155'; g.fillRect(3, 4, 2, 1);
        }
        // Smile / Beard
        if (id === 'lead') {
            g.fillStyle = '#4a301e'; g.fillRect(2, 6, 4, 2);
            g.fillStyle = '#c88c66'; g.fillRect(3, 6, 2, 1);
        } else {
            g.fillStyle = '#b97b58'; g.fillRect(3, 6, 2, 1);
        }
        const t = new THREE.CanvasTexture(c);
        t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
        return t;
    }

    function makeShirtTex(hexColor, id) {
        const c = document.createElement('canvas'); c.width = 8; c.height = 12;
        const g = c.getContext('2d');
        g.fillStyle = hex(hexColor); g.fillRect(0, 0, 8, 12);
        // Shading borders
        g.fillStyle = 'rgba(0,0,0,0.16)'; g.fillRect(0, 0, 1, 12); g.fillRect(7, 0, 1, 12); g.fillRect(0, 11, 8, 1);
        g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(1, 0, 6, 1);
        // Outfit details
        if (id === 'bang') {
            // Tech hoodie zipper + cyan glowing badge
            g.fillStyle = '#0f172a'; g.fillRect(3, 1, 2, 10);
            g.fillStyle = '#38bdf8'; g.fillRect(3, 3, 2, 2);
            g.fillStyle = '#e2e8f0'; g.fillRect(2, 1, 1, 2); g.fillRect(5, 1, 1, 2);
        } else if (id === 'prof') {
            // Blazer + tie
            g.fillStyle = '#f8fafc'; g.fillRect(3, 0, 2, 7);
            g.fillStyle = '#ef4444'; g.fillRect(3, 1, 2, 5);
        } else if (id === 'trader') {
            // Vest + gold belt buckle
            g.fillStyle = '#78350f'; g.fillRect(0, 8, 8, 2);
            g.fillStyle = '#facc15'; g.fillRect(3, 8, 2, 2);
        } else {
            // Lead jacket stripe
            g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(1, 4, 6, 1);
            g.fillStyle = '#1e293b'; g.fillRect(0, 9, 8, 2);
        }
        const t = new THREE.CanvasTexture(c);
        t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
        return t;
    }

    function makeNPC(n) {
        const g = new THREE.Group();
        const skinHex = n.id === 'prof' ? 0xe5b88f : (n.id === 'trader' ? 0xd9a476 : 0xecc198);
        const hairHex = n.id === 'bang' ? 0x191d28 : (n.id === 'prof' ? 0x5c6678 : (n.id === 'lead' ? 0x3a2718 : 0x4f2c1b));
        const pantsHex = n.id === 'prof' ? 0x334155 : 0x24304a;

        const faceTex = makeNpcFaceTex(n.id, false);
        const blinkTex = makeNpcFaceTex(n.id, true);
        const shirtTex = makeShirtTex(n.color, n.id);

        const bodyMats = [];
        const addMat = m => { bodyMats.push(m); return m; };

        // Head pivot at neck
        const headGroup = new THREE.Group();
        headGroup.position.set(0, 1.38, 0);
        const headSide = addMat(new THREE.MeshBasicMaterial({ color: skinHex }));
        const headHair = addMat(new THREE.MeshBasicMaterial({ color: hairHex }));
        const headFace = addMat(new THREE.MeshBasicMaterial({ map: faceTex }));
        const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.48), [headSide, headSide, headHair, headSide, headFace, headHair]);
        headMesh.position.y = 0.24;
        headGroup.add(headMesh);
        // Hair cap volume
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.51, 0.14, 0.51), headHair);
        cap.position.set(0, 0.44, -0.01);
        headGroup.add(cap);
        g.add(headGroup);

        // Torso
        const torsoMat = addMat(new THREE.MeshBasicMaterial({ map: shirtTex }));
        const torsoSide = addMat(new THREE.MeshBasicMaterial({ color: n.color }));
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.72, 0.26), [torsoSide, torsoSide, torsoSide, torsoSide, torsoMat, torsoSide]);
        torso.position.set(0, 1.02, 0);
        g.add(torso);

        // Articulated Arms (pivoting at shoulder)
        const armMat = addMat(new THREE.MeshBasicMaterial({ color: n.color }));
        const handMat = addMat(new THREE.MeshBasicMaterial({ color: skinHex }));
        function makeArm(sx) {
            const ag = new THREE.Group(); ag.position.set(sx, 1.32, 0);
            const sl = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.42, 0.2), armMat); sl.position.y = -0.21;
            const hd = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.28, 0.19), handMat); hd.position.y = -0.54;
            ag.add(sl); ag.add(hd); return ag;
        }
        const armL = makeArm(-0.35), armR = makeArm(0.35);
        g.add(armL); g.add(armR);

        // Legs + Boots
        const legMat = addMat(new THREE.MeshBasicMaterial({ color: pantsHex }));
        const bootMat = addMat(new THREE.MeshBasicMaterial({ color: 0x161a24 }));
        [-0.12, 0.12].forEach(lx => {
            const lg = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.52, 0.22), legMat); lg.position.set(lx, 0.4, 0);
            const bt = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.15, 0.24), bootMat); bt.position.set(lx, 0.075, 0.01);
            g.add(lg); g.add(bt);
        });

        // Floating nameplate + animated "!" quest icon
        const lbl = makeSign({ text: n.name + ' · ' + n.role, x: 0, y: 2.32, z: 0, color: hex(n.color), size: 0.54 });
        g.add(lbl);
        const ex = makeSign({ text: '!', x: 0, y: 2.78, z: 0, color: '#ffe14d', size: 0.68 });
        g.add(ex);

        g.userData = { headGroup, armL, armR, ex, headFace, faceTex, blinkTex, bodyMats, torso };
        return g;
    }

    /* ---------- Knowledge Shard (Glowing Crystal + Vertical Beacon) ---------- */
    function makeShard() {
        const g = new THREE.Group();
        const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), new THREE.MeshBasicMaterial({ color: 0x5efcf0 }));
        const shell = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.32, wireframe: true }));
        const beam = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.18, 5.5, 6, 1, true),
            new THREE.MeshBasicMaterial({ color: 0x38f2e6, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })
        );
        beam.position.y = 2.6;
        g.add(core); g.add(shell); g.add(beam);
        g.userData = { core, shell, beam };
        return g;
    }

    /* ---------- Swirling Dimensional Portal Shader ---------- */
    function makePortalMesh(p) {
        const pg = new THREE.PlaneGeometry(p.w || 5, p.h || 5);
        const ca = p.colorA || [0.55, 0.1, 0.9];
        const cb = p.colorB || [1.0, 0.25, 0.72];
        const pm = new THREE.ShaderMaterial({
            transparent: true, side: THREE.DoubleSide, depthWrite: false,
            uniforms: {
                t: { value: 0 },
                uColA: { value: new THREE.Vector3(ca[0], ca[1], ca[2]) },
                uColB: { value: new THREE.Vector3(cb[0], cb[1], cb[2]) }
            },
            vertexShader: 'varying vec2 v; void main(){ v=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
            fragmentShader: `
                varying vec2 v;
                uniform float t;
                uniform vec3 uColA;
                uniform vec3 uColB;
                void main() {
                    vec2 q = v - 0.5;
                    float r = length(q);
                    float a = atan(q.y, q.x);
                    float swirl = sin(a * 5.0 + t * 3.0 - r * 16.0) * 0.5 + 0.5;
                    float ripple = sin(r * 26.0 - t * 4.2 + sin(a * 3.0 - t) * 1.4) * 0.5 + 0.5;
                    float m = mix(swirl, ripple, 0.45);
                    vec3 c = mix(uColA, uColB, m);
                    c += vec3(0.35, 0.3, 0.45) * pow(m, 3.0) * (1.0 - r);
                    float edge = smoothstep(0.50, 0.38, max(abs(q.x), abs(q.y)));
                    float alpha = (0.62 + 0.30 * m) * (0.35 + 0.65 * edge);
                    gl_FragColor = vec4(c, alpha);
                }
            `
        });
        const mesh = new THREE.Mesh(pg, pm);
        mesh.position.set(p.x + 0.5, p.y + 0.2, p.z + 0.5);
        E.scene.add(mesh);
        return { data: p, mesh, mat: pm };
    }

    /* ---------- Weather System (Rain & Biome Snow) ---------- */
    const RAIN_N = 520;
    let rainMesh = null, rainPos = null, rainVel = null, rainMat = null;

    function initWeather() {
        rainPos = new Float32Array(RAIN_N * 3);
        rainVel = new Float32Array(RAIN_N);
        for (let i = 0; i < RAIN_N; i++) {
            rainPos[i * 3] = (Math.random() - 0.5) * 34;
            rainPos[i * 3 + 1] = Math.random() * 24;
            rainPos[i * 3 + 2] = (Math.random() - 0.5) * 34;
            rainVel[i] = 0.8 + Math.random() * 0.45;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
        rainMat = new THREE.PointsMaterial({
            color: 0xaad4ff, size: 0.22, transparent: true, opacity: 0, depthWrite: false, fog: false
        });
        rainMesh = new THREE.Points(geo, rainMat);
        rainMesh.frustumCulled = false;
        rainMesh.visible = false;
        E.scene.add(rainMesh);
    }

    X.setWeather = function (w) { X.weather = w; };
    X.toggleWeather = function () { X.weather = X.weather === 'rain' ? 'clear' : 'rain'; return X.weather; };

    /* ---------- Dimension-Aware Entity Population & Cleanup ---------- */
    function disposeGroup(obj) {
        E.scene.remove(obj);
        obj.traverse(c => {
            if (c.geometry) c.geometry.dispose();
            if (c.material) {
                const mats = Array.isArray(c.material) ? c.material : [c.material];
                mats.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
            }
        });
    }

    function populateDimensionEntities() {
        // 3D Signs for active dimension
        W.signs.forEach(s => { const spr = makeSign(s); E.scene.add(spr); X.signs.push(spr); });

        // NPCs & Knowledge Shards live in the Overworld CV Island
        if (W.dim === 'overworld') {
            CV.npcs.forEach(n => {
                const y = W.topY(n.x, n.z) + 1;
                const mesh = makeNPC(n);
                mesh.position.set(n.x + 0.5, y, n.z + 0.5);
                E.scene.add(mesh);
                X.npcs.push({
                    data: n, mesh, baseY: y,
                    talked: X.talkedIds.has(n.id),
                    phase: Math.random() * 6, blinkT: 2 + Math.random() * 4, dist: 99
                });
            });

            W.shardSpots.forEach(s => {
                const m = makeShard(); m.position.set(s.x, s.y, s.z);
                const got = X.collected.has(s.id);
                m.visible = !got;
                E.scene.add(m);
                X.shards.push({ id: s.id, mesh: m, base: s.y, got });
            });
        }

        // Swirling Dimensional Portals for active dimension
        X.portal = null;
        W.portals.forEach(p => {
            const po = makePortalMesh(p);
            X.portals.push(po);
            if (p.id === 'contact') X.portal = po;
        });

        // Sync high-altitude clouds visibility & altitude for active dimension
        const showClouds = !!(W.dimMeta && W.dimMeta.hasClouds);
        const cloudBaseY = W.dim === 'aether' ? 68 : 84;
        X.clouds.forEach(c => {
            c.visible = showClouds;
            c.position.y = cloudBaseY + (c.userData.yOff || 0);
        });
        if (!showClouds) { X.weather = 'clear'; X.rainT = 0; }
    }

    X.rebuildForDimension = function () {
        // Preserve talked NPC IDs before removing Overworld NPCs
        X.npcs.forEach(n => { if (n.talked) X.talkedIds.add(n.data.id); });
        X.signs.forEach(disposeGroup); X.signs.length = 0;
        X.npcs.forEach(n => disposeGroup(n.mesh)); X.npcs.length = 0;
        X.shards.forEach(s => disposeGroup(s.mesh)); X.shards.length = 0;
        X.portals.forEach(po => {
            E.scene.remove(po.mesh);
            po.mesh.geometry.dispose();
            po.mat.dispose();
        });
        X.portals.length = 0;
        X.xpOrbs.forEach(o => { E.scene.remove(o.mesh); o.mesh.material.dispose(); });
        X.xpOrbs.length = 0;
        // Clear active particle pool immediately so Nether embers don't linger in Aether
        if (X.pool) for (let i = 0; i < X.pool.length; i++) X.pool[i].life = 0;

        populateDimensionEntities();
    };

    /* ---------- Initialization ---------- */
    X.init = function () {
        // Sculpted High-Altitude Cumulus Clouds (Y = 84..95 — far above all mountain peaks!)
        X.cloudMatTop = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.80, depthWrite: false, fog: true });
        X.cloudMatSide = new THREE.MeshBasicMaterial({ color: 0xeaf2fb, transparent: true, opacity: 0.78, depthWrite: false, fog: true });
        X.cloudMatBot = new THREE.MeshBasicMaterial({ color: 0xcbdcf2, transparent: true, opacity: 0.76, depthWrite: false, fog: true });
        const cloudMats = [X.cloudMatSide, X.cloudMatSide, X.cloudMatTop, X.cloudMatBot, X.cloudMatSide, X.cloudMatSide];
        const cCount = E.isSoftwareGl ? 18 : 30;
        for (let i = 0; i < cCount; i++) {
            const g = new THREE.Group();
            // Soft tiered cumulus: wide airy base + raised central billow puffs
            const baseW = 14 + Math.random() * 14, baseD = 10 + Math.random() * 10;
            const base = new THREE.Mesh(new THREE.BoxGeometry(baseW, 1.35, baseD), cloudMats);
            g.add(base);
            const puffs = 2 + (Math.random() * 3 | 0);
            for (let k = 0; k < puffs; k++) {
                const pw = baseW * (0.42 + Math.random() * 0.28);
                const pd = baseD * (0.42 + Math.random() * 0.30);
                const ph = 1.2 + Math.random() * 1.1;
                const puff = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, pd), cloudMats);
                puff.position.set((Math.random() - 0.5) * baseW * 0.45, 0.75 + ph * 0.35, (Math.random() - 0.5) * baseD * 0.42);
                g.add(puff);
            }
            const yOff = Math.random() * 11;
            g.position.set((Math.random() - 0.5) * 460, 84 + yOff, (Math.random() - 0.5) * 460);
            g.userData = { spd: 0.55 + Math.random() * 0.65, yOff };
            E.scene.add(g);
            X.clouds.push(g);
        }

        // General Particle Pool (N = 480)
        const N = 480;
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 3).fill(-9999), 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3));
        X.pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.22, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false }));
        X.pts.frustumCulled = false;
        E.scene.add(X.pts);
        X.pool = [];
        for (let i = 0; i < N; i++) X.pool.push({ life: 0, grav: 9, drag: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), c: new THREE.Color() });
        X.poolIdx = 0;

        initWeather();
        populateDimensionEntities();
    };

    /* ---------- Particle Spawners ---------- */
    X.spawnParticle = function (x, y, z, vx, vy, vz, color, life, grav, drag) {
        const p = X.pool[X.poolIdx++ % X.pool.length];
        p.life = life || 0.9;
        p.grav = grav !== undefined ? grav : 9;
        p.drag = drag || 0;
        p.p.set(x, y, z);
        p.v.set(vx, vy, vz);
        p.c.setHex(color);
    };

    X.burst = function (x, y, z, color, n, spd, grav) {
        for (let i = 0; i < n; i++) {
            X.spawnParticle(
                x, y, z,
                (Math.random() - 0.5) * spd,
                Math.random() * spd * 0.9 + 0.6,
                (Math.random() - 0.5) * spd,
                color,
                0.55 + Math.random() * 0.55,
                grav !== undefined ? grav : 9.5,
                0.8
            );
        }
    };

    X.blockBurst = function (x, y, z, id) {
        const d = W.DEF[id]; const t = d ? d.side : 3;
        const ctx = E.atlas.getContext('2d');
        const STR = W.STRIDE || W.TILE, PAD = W.PAD_PX || 0;
        for (let k = 0; k < 4; k++) {
            const px = (t % W.COLS) * STR + PAD + 3 + ((k * 7) % (W.TILE - 5));
            const py = Math.floor(t / W.COLS) * STR + PAD + 3 + ((k * 5) % (W.TILE - 5));
            const dt = ctx.getImageData(px, py, 1, 1).data;
            X.burst(x + 0.5, y + 0.5, z + 0.5, (dt[0] << 16) | (dt[1] << 8) | dt[2], 5, 4.6, 11);
        }
    };

    /* ---------- Magnetic Glowing XP Orbs ---------- */
    const xpGeo = new THREE.OctahedronGeometry(0.14, 0);
    X.spawnXp = function (x, y, z, count) {
        const n = Math.min(10, Math.max(1, count || 2));
        for (let i = 0; i < n; i++) {
            const mat = new THREE.MeshBasicMaterial({ color: i % 2 ? 0x86efac : 0xfde047 });
            const m = new THREE.Mesh(xpGeo, mat);
            m.position.set(x, y + 0.3, z);
            E.scene.add(m);
            X.xpOrbs.push({
                mesh: m,
                vx: (Math.random() - 0.5) * 4.5,
                vy: 2.5 + Math.random() * 2.5,
                vz: (Math.random() - 0.5) * 4.5,
                life: 32,
                phase: Math.random() * 6.28
            });
        }
    };

    /* ---------- Ambient World Emitters (Lava, Torches, Waterfalls, Cherry Petals, Fireflies, Portals) ---------- */
    let emitAcc = 0;
    function updateAmbientEmitters(dt, ppos) {
        emitAcc += dt;
        if (emitAcc < 0.08) return;
        emitAcc = 0;
        const px = ppos.x, pz = ppos.z;

        // Torch flames & Soul Torch blue flames
        const torches = W.emitters.torches;
        for (let i = 0; i < torches.length; i++) {
            const e = torches[i];
            const dx = e[0] - px, dz = e[2] - pz;
            if (dx * dx + dz * dz > 38 * 38 || Math.random() > 0.22) continue;
            const isSoul = e[3] === 1;
            const col = isSoul ? (Math.random() < 0.7 ? 0x22d3ee : 0xa5f3fc) : (Math.random() < 0.65 ? 0xffae2b : 0x6b7280);
            X.spawnParticle(
                e[0] + (Math.random() - 0.5) * 0.14, e[1], e[2] + (Math.random() - 0.5) * 0.14,
                (Math.random() - 0.5) * 0.25, 0.7 + Math.random() * 0.6, (Math.random() - 0.5) * 0.25,
                col, 0.55 + Math.random() * 0.4, -0.3, 0.5
            );
        }

        // Lava sparks & rising magma embers
        const lavas = W.emitters.lava;
        for (let i = 0; i < lavas.length; i++) {
            const e = lavas[i];
            const dx = e[0] - px, dz = e[2] - pz;
            if (dx * dx + dz * dz > 52 * 52 || Math.random() > 0.25) continue;
            X.spawnParticle(
                e[0] + (Math.random() - 0.5) * 1.2, e[1], e[2] + (Math.random() - 0.5) * 1.2,
                (Math.random() - 0.5) * 1.4, 2.2 + Math.random() * 2.5, (Math.random() - 0.5) * 1.4,
                Math.random() < 0.5 ? 0xff5a1f : 0xffd23f, 0.9 + Math.random() * 0.7, 3.2, 0.3
            );
        }

        // Waterfall mist spray
        const wfs = W.emitters.waterfalls;
        for (let i = 0; i < wfs.length; i++) {
            const e = wfs[i];
            const dx = e[0] - px, dz = e[2] - pz;
            if (dx * dx + dz * dz > 54 * 54) continue;
            for (let k = 0; k < 2; k++) {
                X.spawnParticle(
                    e[0] + (Math.random() - 0.5) * 2.2, e[1] + Math.random() * 0.6, e[2] + (Math.random() - 0.5) * 1.4,
                    (Math.random() - 0.5) * 1.6, 1.4 + Math.random() * 1.4, (Math.random() - 0.5) * 1.6,
                    0xdff4ff, 0.8 + Math.random() * 0.5, 2.0, 0.6
                );
            }
        }

        // Drifting Cherry Blossom Petals
        const cherries = W.emitters.cherry;
        for (let i = 0; i < cherries.length; i++) {
            const e = cherries[i];
            const dx = e[0] - px, dz = e[2] - pz;
            if (dx * dx + dz * dz > 46 * 46 || Math.random() > 0.16) continue;
            X.spawnParticle(
                e[0] + (Math.random() - 0.5) * 5.0, e[1] + Math.random() * 1.5, e[2] + (Math.random() - 0.5) * 5.0,
                0.6 + Math.random() * 0.6, -0.6 - Math.random() * 0.4, (Math.random() - 0.5) * 0.8,
                Math.random() < 0.5 ? 0xf9a8d4 : 0xfbcfe8, 2.8 + Math.random() * 1.4, 0.08, 0.2
            );
        }

        // Nighttime glowing Fireflies (Overworld)
        if (W.dim === 'overworld' && (E.isNight || E.dayFactor < 0.3)) {
            const ff = W.emitters.fireflies;
            for (let i = 0; i < ff.length; i++) {
                const e = ff[i];
                const dx = e[0] - px, dz = e[2] - pz;
                if (dx * dx + dz * dz > 42 * 42 || Math.random() > 0.18) continue;
                X.spawnParticle(
                    e[0] + (Math.random() - 0.5) * 4.0, e[1] + Math.random() * 2.0, e[2] + (Math.random() - 0.5) * 4.0,
                    (Math.random() - 0.5) * 0.9, (Math.random() - 0.3) * 0.5, (Math.random() - 0.5) * 0.9,
                    0xd9f99d, 1.8 + Math.random() * 1.2, -0.05, 0.4
                );
            }
        }

        // Signature Atmospheric Particles per Dimension!
        if (W.dim === 'nether') {
            for (let k = 0; k < 3; k++) {
                X.spawnParticle(
                    px + (Math.random() - 0.5) * 28, ppos.y - 2 + Math.random() * 12, pz + (Math.random() - 0.5) * 28,
                    (Math.random() - 0.5) * 0.8, 0.8 + Math.random() * 1.1, (Math.random() - 0.5) * 0.8,
                    Math.random() < 0.65 ? 0xff6a1a : 0xfde047, 1.8 + Math.random() * 1.2, -0.2, 0.3
                );
            }
        } else if (W.dim === 'aether') {
            for (let k = 0; k < 2; k++) {
                X.spawnParticle(
                    px + (Math.random() - 0.5) * 28, ppos.y - 1 + Math.random() * 10, pz + (Math.random() - 0.5) * 28,
                    0.9 + Math.random() * 0.7, 0.2 + Math.random() * 0.4, (Math.random() - 0.5) * 0.5,
                    Math.random() < 0.5 ? 0xfef08a : 0xbae6fd, 2.2 + Math.random() * 1.2, -0.04, 0.2
                );
            }
        } else if (W.dim === 'cosmos') {
            for (let k = 0; k < 3; k++) {
                X.spawnParticle(
                    px + (Math.random() - 0.5) * 32, ppos.y - 3 + Math.random() * 14, pz + (Math.random() - 0.5) * 32,
                    (Math.random() - 0.5) * 0.4, (Math.random() - 0.4) * 0.35, (Math.random() - 0.5) * 0.4,
                    Math.random() < 0.55 ? 0xd8b4fe : 0x67e8f9, 2.4 + Math.random() * 1.4, 0.0, 0.1
                );
            }
        } else if (W.dim === 'dungeon') {
            if (Math.random() < 0.55) {
                X.spawnParticle(
                    px + (Math.random() - 0.5) * 18, ppos.y + Math.random() * 6, pz + (Math.random() - 0.5) * 18,
                    (Math.random() - 0.5) * 0.25, -0.15, (Math.random() - 0.5) * 0.25,
                    0x6ee7b7, 1.8, 0.0, 0.2
                );
            }
        }

        // Swirling Portal magic sparkles matching each portal's custom palette
        for (let i = 0; i < X.portals.length; i++) {
            const q = X.portals[i].data;
            const dx = q.x - px, dz = q.z - pz;
            if (dx * dx + dz * dz > 38 * 38) continue;
            const ca = q.colorA || [0.6, 0.2, 1.0], cb = q.colorB || [0.9, 0.3, 0.9];
            const src = Math.random() < 0.5 ? ca : cb;
            const col = ((Math.min(255, src[0] * 255) | 0) << 16) | ((Math.min(255, src[1] * 255) | 0) << 8) | (Math.min(255, src[2] * 255) | 0);
            X.spawnParticle(
                q.x + 0.5 + (Math.random() - 0.5) * (q.w || 4),
                q.y + (Math.random() - 0.5) * (q.h || 4),
                q.z + 0.5 + (Math.random() - 0.5) * 1.2,
                (Math.random() - 0.5) * 0.9, 0.4 + Math.random() * 0.8, (Math.random() - 0.5) * 0.9,
                col, 1.1, -0.2, 0.5
            );
        }
    }

    /* ---------- Helper: Light-level tinting for entities ---------- */
    const _tintCol = new THREE.Color();
    function lightTintAt(x, y, z) {
        const bx = Math.floor(x), by = Math.floor(y), bz = Math.floor(z);
        const sl = W.getSkyLight(bx, by, bz) / 15;
        const bl = W.getBlockLight(bx, by, bz) / 15;
        const day = E.dayFactor !== undefined ? E.dayFactor : 1;
        const amb = 0.24 + day * 0.76;
        const s = Math.max(sl * amb, bl * 0.95, 0.22);
        return Math.min(1.05, s);
    }

    /* ---------- Frame Update ---------- */
    X.update = function (dt, t, ppos) {
        // 1. NPCs: look at player, blink, wave, breathe & light-level tint
        const dayTint = E.dayFactor !== undefined ? E.dayFactor : 1;
        for (let i = 0; i < X.npcs.length; i++) {
            const n = X.npcs[i];
            const u = n.mesh.userData;
            const dx = ppos.x - n.mesh.position.x, dz = ppos.z - n.mesh.position.z;
            const d = Math.hypot(dx, dz);
            n.dist = d;

            if (d < 16) {
                const targetYaw = Math.atan2(dx, dz);
                let diff = targetYaw - n.mesh.rotation.y;
                diff = Math.atan2(Math.sin(diff), Math.cos(diff));
                n.mesh.rotation.y += diff * Math.min(1, 5.5 * dt);
                const dy = (ppos.y + 1.6) - (n.mesh.position.y + 1.6);
                u.headGroup.rotation.x = Math.max(-0.45, Math.min(0.45, -Math.atan2(dy, Math.max(1.2, d))));
            } else {
                u.headGroup.rotation.x *= 0.92;
            }

            // Natural waving & breathing
            const sw = Math.sin(t * 3.2 + n.phase) * (d < 5.5 ? 0.95 : 0.14);
            u.armR.rotation.x = d < 5.5 ? -2.35 + sw * 0.35 : sw * 0.28;
            u.armR.rotation.z = d < 5.5 ? 0.25 + Math.sin(t * 6 + n.phase) * 0.18 : 0.05;
            u.armL.rotation.x = -sw * 0.22;
            u.torso.scale.y = 1 + Math.sin(t * 2.2 + n.phase) * 0.015;

            // Blinking eyes
            n.blinkT -= dt;
            if (n.blinkT <= 0) {
                n.blinkT = 2.8 + Math.random() * 3.5;
                u.headFace.map = u.blinkTex; u.headFace.needsUpdate = true;
                setTimeout(() => { if (u.headFace) { u.headFace.map = u.faceTex; u.headFace.needsUpdate = true; } }, 140);
            }

            u.ex.visible = !n.talked;
            u.ex.position.y = 2.78 + Math.sin(t * 3.4 + n.phase) * 0.10;

            // Light-level tint so NPCs blend naturally into night/dusk
            const lt = lightTintAt(n.mesh.position.x, n.mesh.position.y + 1, n.mesh.position.z);
            for (let m = 0; m < u.bodyMats.length; m++) {
                const mat = u.bodyMats[m];
                if (!mat.userData.baseCol) mat.userData.baseCol = mat.color.clone();
                mat.color.copy(mat.userData.baseCol).multiplyScalar(lt);
            }
        }

        // 2. Knowledge Shards
        for (let i = 0; i < X.shards.length; i++) {
            const s = X.shards[i];
            if (s.got) continue;
            s.mesh.rotation.y = t * 1.9;
            s.mesh.userData.shell.rotation.y = -t * 2.6;
            s.mesh.userData.shell.rotation.x = Math.sin(t * 1.4 + s.id) * 0.4;
            s.mesh.position.y = s.base + Math.sin(t * 2.2 + s.id) * 0.2;
            const dx = ppos.x - s.mesh.position.x, dy = ppos.y + 0.9 - s.mesh.position.y, dz = ppos.z - s.mesh.position.z;
            if (dx * dx + dy * dy + dz * dz < 2.3) {
                s.got = true; s.mesh.visible = false; X.collected.add(s.id);
                X.burst(s.mesh.position.x, s.mesh.position.y, s.mesh.position.z, 0x4ff2e4, 34, 5.5, 4);
                X.spawnXp(s.mesh.position.x, s.mesh.position.y, s.mesh.position.z, 5);
                if (X.onShard) X.onShard(s.id);
            }
        }

        // 3. Portals (Contact + Volcanic/Summit Two-Way Warp)
        for (let i = 0; i < X.portals.length; i++) {
            const po = X.portals[i];
            po.mat.uniforms.t.value = t;
            const q = po.data;
            const hw = (q.w || 4) * 0.46;
            const hh = (q.h || 5) * 0.55;
            if (Math.abs(ppos.x - (q.x + 0.5)) < hw && Math.abs(ppos.z - (q.z + 0.5)) < 1.15 && Math.abs(ppos.y + 0.9 - q.y) < hh) {
                if (X.onPortal) X.onPortal(q);
            }
        }

        // 4. High-Altitude Cumulus Clouds drift + sunlit / sunset / Aether coloring
        const canWeather = W.dim === 'overworld';
        const rainTarget = (canWeather && X.weather === 'rain') ? 1 : 0;
        X.rainT += (rainTarget - X.rainT) * Math.min(1, dt * 1.2);
        E.rainAmt = X.rainT;

        if (W.dim === 'aether') {
            X.cloudMatTop.color.setRGB(1.0, 0.99, 0.95);
            X.cloudMatSide.color.setRGB(0.93, 0.96, 1.0);
            X.cloudMatBot.color.setRGB(0.80, 0.89, 0.98);
        } else {
            const dusk = Math.max(0, 1 - Math.abs(dayTint - 0.32) * 3.2);
            const rTop = (0.20 + dayTint * 0.80) * (1 - X.rainT * 0.35) + dusk * 0.14;
            const gTop = (0.24 + dayTint * 0.76) * (1 - X.rainT * 0.35) + dusk * 0.04;
            const bTop = (0.36 + dayTint * 0.64) * (1 - X.rainT * 0.30) - dusk * 0.10;
            X.cloudMatTop.color.setRGB(Math.min(1, rTop), Math.min(1, gTop), Math.max(0.18, Math.min(1, bTop)));
            X.cloudMatSide.color.setRGB(Math.min(1, rTop * 0.92), Math.min(1, gTop * 0.94), Math.max(0.16, Math.min(1, bTop * 0.96)));
            X.cloudMatBot.color.setRGB(Math.min(1, rTop * 0.78), Math.min(1, gTop * 0.83), Math.max(0.14, Math.min(1, bTop * 0.92)));
        }

        if (W.dimMeta && W.dimMeta.hasClouds) {
            for (let i = 0; i < X.clouds.length; i++) {
                const c = X.clouds[i];
                c.position.x += dt * c.userData.spd * (1 + X.rainT * 1.4);
                if (c.position.x > 235) c.position.x = -235;
            }
        }

        // 5. Weather precipitation (Rain vs Snowflakes in Cold Biomes)
        if (rainMesh) {
            const active = X.rainT > 0.04;
            rainMesh.visible = active;
            if (active) {
                const bx = Math.max(0, Math.min(W.SX - 1, Math.floor(ppos.x) + W.OX));
                const bz = Math.max(0, Math.min(W.SZ - 1, Math.floor(ppos.z) + W.OZ));
                const bio = W.biomeMap[bz * W.SX + bx];
                const isSnow = bio === W.BIOME.SNOW || ppos.y > 38;
                rainMat.color.setHex(isSnow ? 0xf0f9ff : 0x8fc7ff);
                rainMat.size = isSnow ? 0.28 : 0.19;
                rainMat.opacity = X.rainT * (isSnow ? 0.88 : 0.65);

                const fallSpd = isSnow ? 3.4 : 18.5;
                const driftX = isSnow ? Math.sin(t * 1.4) * 1.6 : 1.8;
                for (let i = 0; i < RAIN_N; i++) {
                    const o = i * 3;
                    rainPos[o] += driftX * dt;
                    rainPos[o + 1] -= fallSpd * rainVel[i] * dt;
                    // Wrap inside 34x24x34 box around camera/player
                    if (rainPos[o + 1] < ppos.y - 6) {
                        rainPos[o] = ppos.x + (Math.random() - 0.5) * 34;
                        rainPos[o + 1] = ppos.y + 14 + Math.random() * 8;
                        rainPos[o + 2] = ppos.z + (Math.random() - 0.5) * 34;
                    }
                    if (rainPos[o] - ppos.x > 17) rainPos[o] -= 34;
                    else if (rainPos[o] - ppos.x < -17) rainPos[o] += 34;
                    if (rainPos[o + 2] - ppos.z > 17) rainPos[o + 2] -= 34;
                    else if (rainPos[o + 2] - ppos.z < -17) rainPos[o + 2] += 34;
                }
                rainMesh.geometry.attributes.position.needsUpdate = true;
            }
        }

        // 6. Ambient World Emitters
        updateAmbientEmitters(dt, ppos);

        // 7. Particle Pool integration
        const pos = X.pts.geometry.attributes.position, col = X.pts.geometry.attributes.color;
        for (let i = 0; i < X.pool.length; i++) {
            const p = X.pool[i];
            if (p.life > 0) {
                p.life -= dt;
                p.v.y -= p.grav * dt;
                if (p.drag) {
                    const d = Math.max(0, 1 - p.drag * dt);
                    p.v.x *= d; p.v.z *= d;
                }
                p.p.addScaledVector(p.v, dt);
                pos.setXYZ(i, p.p.x, p.p.y, p.p.z);
                col.setXYZ(i, p.c.r, p.c.g, p.c.b);
            } else {
                pos.setXYZ(i, 0, -9999, 0);
            }
        }
        pos.needsUpdate = true; col.needsUpdate = true;

        // 8. Magnetic XP Orbs
        const P = window.CVP, A = window.CVA;
        for (let i = X.xpOrbs.length - 1; i >= 0; i--) {
            const o = X.xpOrbs[i];
            o.life -= dt;
            const m = o.mesh;
            const dx = ppos.x - m.position.x, dy = (ppos.y + 0.9) - m.position.y, dz = ppos.z - m.position.z;
            const dist = Math.hypot(dx, dy, dz);
            if (dist < 1.15) {
                E.scene.remove(m); m.material.dispose(); X.xpOrbs.splice(i, 1);
                if (P && P.addXp) P.addXp(1);
                if (A) A.play('xp');
                continue;
            }
            if (dist < 5.5) {
                const pull = (1 - dist / 5.5) * 22 * dt;
                o.vx += (dx / dist) * pull; o.vy += (dy / dist) * pull; o.vz += (dz / dist) * pull;
                o.vx *= 0.9; o.vy *= 0.9; o.vz *= 0.9;
            } else {
                o.vy -= 14 * dt;
                const bx = Math.floor(m.position.x), bz = Math.floor(m.position.z);
                const ny = m.position.y + o.vy * dt;
                const below = W.get(bx, Math.floor(ny - 0.18), bz);
                if (below && W.DEF[below].solid) {
                    m.position.y = Math.floor(ny - 0.18) + 1.18; o.vy = Math.abs(o.vy) * 0.35; o.vx *= 0.7; o.vz *= 0.7;
                }
            }
            m.position.x += o.vx * dt; m.position.y += o.vy * dt; m.position.z += o.vz * dt;
            m.rotation.y = t * 4 + o.phase;
            const sc = 0.85 + Math.sin(t * 8 + o.phase) * 0.2;
            m.scale.setScalar(sc);
            if (o.life <= 0) { E.scene.remove(m); m.material.dispose(); X.xpOrbs.splice(i, 1); }
        }
    };

    X.nearestNPC = function (ppos, r) {
        let best = null, bd = r || 3.4;
        for (let i = 0; i < X.npcs.length; i++) {
            const n = X.npcs[i];
            if (n.dist < bd) { bd = n.dist; best = n; }
        }
        return best;
    };
})();
