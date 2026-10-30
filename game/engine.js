/* CV World — renderer: chunk mesher (AO), ngày/đêm, raycast voxel. Cần three.js r128 (global THREE). */
(function () {
    'use strict';
    const W = window.CVW, B = W.B, DEF = W.DEF;
    const CS = 16;                                  // chunk size (x,z)
    const NCX = W.SX / CS, NCZ = W.SZ / CS;

    const E = { chunks: [], dirty: new Set(), time: 0.12, dayLen: 600, fastTime: false };
    window.CVE = E;

    /* mặt: [dx,dy,dz], 4 đỉnh (góc), shade, tile pick */
    const FACES = [
        { d: [0, 1, 0], k: 'top', s: 1.0, v: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
        { d: [0, -1, 0], k: 'bottom', s: 0.5, v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
        { d: [1, 0, 0], k: 'side', s: 0.82, v: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
        { d: [-1, 0, 0], k: 'side', s: 0.82, v: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
        { d: [0, 0, 1], k: 'side', s: 0.7, v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
        { d: [0, 0, -1], k: 'side', s: 0.7, v: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] }
    ];
    const UVS = [[0, 0], [1, 0], [1, 1], [0, 1]];

    function isOpaque(id) { return id !== 0 && DEF[id].opaque; }

    function newBuf() { return { p: [], c: [], u: [], i: [], n: 0 }; }

    function buildChunk(cx, cz) {
        const bufs = { solid: newBuf(), cut: newBuf(), water: newBuf(), glow: newBuf() };
        const x0 = cx * CS - W.OX, z0 = cz * CS - W.OZ;
        const T = 1 / W.COLS, PAD = 0.0005;
        for (let y = 0; y < W.SY; y++) for (let lz = 0; lz < CS; lz++) for (let lx = 0; lx < CS; lx++) {
            const x = x0 + lx, z = z0 + lz, id = W.get(x, y, z);
            if (!id) continue;
            const df = DEF[id];
            const buf = df.liquid ? bufs.water : (df.light ? bufs.glow : (df.cutout ? bufs.cut : bufs.solid));
            for (let f = 0; f < 6; f++) {
                const F = FACES[f], nx = x + F.d[0], ny = y + F.d[1], nz = z + F.d[2];
                const nid = W.get(nx, ny, nz);
                if (df.liquid) { if (f !== 0 || nid !== 0) continue; }   // nước: chỉ vẽ mặt trên khi phía trên là không khí
                else if (nid === id && df.cutout && id !== B.LEAVES) continue;
                else if (isOpaque(nid)) continue;
                const tile = df[F.k], tx = (tile % W.COLS) * T, ty = 1 - (Math.floor(tile / W.COLS) + 1) * T;
                const base = buf.n;
                for (let v = 0; v < 4; v++) {
                    const vv = F.v[v];
                    let px = lx + vv[0], py = y + vv[1], pz = lz + vv[2];
                    if (df.liquid && vv[1] === 1) py -= 0.12;
                    buf.p.push(px + cx * CS, py, pz + cz * CS);   // toạ độ chunk-space; E.group dịch về toạ độ logic
                    // AO
                    let shade = F.s;
                    if (!df.light && !df.liquid) {
                        const ax = vv[0] ? 1 : -1, ay = vv[1] ? 1 : -1, az = vv[2] ? 1 : -1;
                        let s1, s2, cr;
                        if (F.d[1] !== 0) { s1 = isOpaque(W.get(x + ax, y + F.d[1], z)); s2 = isOpaque(W.get(x, y + F.d[1], z + az)); cr = isOpaque(W.get(x + ax, y + F.d[1], z + az)); }
                        else if (F.d[0] !== 0) { s1 = isOpaque(W.get(x + F.d[0], y + ay, z)); s2 = isOpaque(W.get(x + F.d[0], y, z + az)); cr = isOpaque(W.get(x + F.d[0], y + ay, z + az)); }
                        else { s1 = isOpaque(W.get(x + ax, y, z + F.d[2])); s2 = isOpaque(W.get(x, y + ay, z + F.d[2])); cr = isOpaque(W.get(x + ax, y + ay, z + F.d[2])); }
                        const ao = (s1 && s2) ? 0 : 3 - (s1 + s2 + cr);
                        shade *= 0.55 + ao * 0.15;
                    }
                    buf.c.push(shade, shade, shade);
                    buf.u.push(tx + UVS[v][0] * T + (UVS[v][0] ? -PAD : PAD), ty + UVS[v][1] * T + (UVS[v][1] ? -PAD : PAD));
                }
                buf.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
                buf.n += 4;
            }
        }
        return bufs;
    }

    function toMesh(buf, mat) {
        if (!buf.n) return null;
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(buf.p, 3));
        g.setAttribute('color', new THREE.Float32BufferAttribute(buf.c, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(buf.u, 2));
        g.setIndex(buf.i);
        g.computeBoundingSphere();
        const m = new THREE.Mesh(g, mat);
        m.frustumCulled = true;
        return m;
    }

    E.rebuildChunk = function (cx, cz) {
        const k = cx + cz * NCX, old = E.chunks[k];
        if (old) old.meshes.forEach(m => { E.group.remove(m); m.geometry.dispose(); });
        const b = buildChunk(cx, cz), meshes = [];
        [[b.solid, E.mats.solid], [b.cut, E.mats.cut], [b.water, E.mats.water], [b.glow, E.mats.glow]].forEach(p => {
            const m = toMesh(p[0], p[1]);
            if (m) { if (p[1] === E.mats.water) m.renderOrder = 2; E.group.add(m); meshes.push(m); }
        });
        E.chunks[k] = { meshes };
    };

    E.markDirty = function (x, y, z) {
        const cx = Math.floor((x + W.OX) / CS), cz = Math.floor((z + W.OZ) / CS);
        const add = (a, b) => { if (a >= 0 && b >= 0 && a < NCX && b < NCZ) E.dirty.add(a + b * NCX); };
        add(cx, cz);
        const lx = (x + W.OX) - cx * CS, lz = (z + W.OZ) - cz * CS;
        if (lx === 0) add(cx - 1, cz); if (lx === CS - 1) add(cx + 1, cz);
        if (lz === 0) add(cx, cz - 1); if (lz === CS - 1) add(cx, cz + 1);
    };
    E.flushDirty = function () {
        E.dirty.forEach(k => E.rebuildChunk(k % NCX, (k / NCX) | 0));
        E.dirty.clear();
    };

    /* ---------- init ---------- */
    E.init = function (canvas) {
        const r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
        r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        r.setSize(window.innerWidth, window.innerHeight);
        E.renderer = r;
        E.scene = new THREE.Scene();
        E.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 220);
        E.camera.rotation.order = 'YXZ';
        E.scene.add(E.camera);
        E.group = new THREE.Group();
        E.group.position.set(-W.OX, 0, -W.OZ);        // chunk vertex dùng toạ độ [0,SX); dịch về toạ độ logic
        E.scene.add(E.group);

        const atlas = W.buildAtlas();
        const tex = new THREE.CanvasTexture(atlas);
        tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
        E.atlas = atlas; E.tex = tex;
        E.mats = {
            solid: new THREE.MeshBasicMaterial({ map: tex, vertexColors: true }),
            cut: new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }),
            water: new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, transparent: true, opacity: 0.68, depthWrite: false }),
            glow: new THREE.MeshBasicMaterial({ map: tex, vertexColors: true })
        };
        E.scene.fog = new THREE.Fog(0x9ad0ff, 50, 140);
        E.scene.background = new THREE.Color(0x9ad0ff);

        // outline block đang nhắm
        const eg = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002));
        E.outline = new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color: 0x00ffff }));
        E.outline.visible = false; E.scene.add(E.outline);

        // sao ban đêm
        const sp = [];
        for (let i = 0; i < 500; i++) {
            const a = Math.random() * Math.PI * 2, b = Math.acos(Math.random() * 0.95 + 0.05), R = 180;
            sp.push(Math.cos(a) * Math.sin(b) * R, Math.cos(b) * R, Math.sin(a) * Math.sin(b) * R);
        }
        const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
        E.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false }));
        E.scene.add(E.stars);

        // mặt trời + trăng (billboard đơn giản)
        function disc(col, s) {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshBasicMaterial({ color: col, fog: false, depthWrite: false }));
            m.renderOrder = -1; E.scene.add(m); return m;
        }
        E.sun = disc(0xfff3b0, 28); E.moon = disc(0xdfe8ff, 20);

        window.addEventListener('resize', () => E.resize());
        for (let cz = 0; cz < NCZ; cz++) for (let cx = 0; cx < NCX; cx++) E.rebuildChunk(cx, cz);
    };

    E.resize = function () {
        E.renderer.setSize(window.innerWidth, window.innerHeight);
        E.camera.aspect = window.innerWidth / window.innerHeight; E.camera.updateProjectionMatrix();
    };

    /* ---------- ngày / đêm ---------- */
    const SKY_DAY = new THREE.Color(0x8fcaff), SKY_DUSK = new THREE.Color(0xff9a5c), SKY_NIGHT = new THREE.Color(0x070b1c);
    const _c = new THREE.Color();
    E.updateSky = function (camPos) {
        const t = E.time;                              // 0..1, 0.25 = trưa? định nghĩa: 0=bình minh, 0.25=trưa, 0.5=hoàng hôn, 0.75=nửa đêm
        const ang = t * Math.PI * 2;
        const sunH = Math.sin(ang);                    // >0: ban ngày
        let day = Math.max(0, Math.min(1, sunH * 2.2 + 0.25));
        const dusk = Math.max(0, 1 - Math.abs(sunH) * 3.2) * (sunH > -0.3 ? 1 : 0);
        _c.copy(SKY_NIGHT).lerp(SKY_DAY, day).lerp(SKY_DUSK, dusk * 0.55);
        E.scene.background.copy(_c); E.scene.fog.color.copy(_c);
        const lum = 0.5 + day * 0.5;
        const tint = 1 - dusk * 0.12;
        ['solid', 'cut', 'water'].forEach(k => E.mats[k].color.setRGB(lum * tint, lum * (1 - dusk * 0.05), lum * (0.72 + day * 0.28)));
        E.mats.glow.color.setRGB(1, 1, 1);
        E.stars.material.opacity = Math.max(0, 1 - day * 2.5);
        E.stars.position.copy(camPos);
        const R = 150;
        E.sun.position.set(camPos.x + Math.cos(ang) * R, camPos.y + Math.sin(ang) * R, camPos.z + 30);
        E.moon.position.set(camPos.x - Math.cos(ang) * R, camPos.y - Math.sin(ang) * R, camPos.z - 30);
        E.sun.lookAt(camPos); E.moon.lookAt(camPos);
        E.sun.visible = sunH > -0.2; E.moon.visible = sunH < 0.2;
        E.isNight = sunH < -0.05;
        E.dayFactor = day;
    };
    E.timeLabel = function () {
        const h = ((E.time * 24 + 6) % 24 + 24) % 24;     // t=0 -> 06:00
        const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
        return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
    };

    /* ---------- raycast voxel (Amanatides-Woo) ---------- */
    E.raycast = function (o, d, max) {
        let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
        const sx = Math.sign(d.x), sy = Math.sign(d.y), sz = Math.sign(d.z);
        const tdx = d.x ? Math.abs(1 / d.x) : Infinity, tdy = d.y ? Math.abs(1 / d.y) : Infinity, tdz = d.z ? Math.abs(1 / d.z) : Infinity;
        let tx = d.x ? ((sx > 0 ? x + 1 - o.x : o.x - x) * tdx) : Infinity;
        let ty = d.y ? ((sy > 0 ? y + 1 - o.y : o.y - y) * tdy) : Infinity;
        let tz = d.z ? ((sz > 0 ? z + 1 - o.z : o.z - z) * tdz) : Infinity;
        let nx = 0, ny = 0, nz = 0, t = 0;
        while (t <= max) {
            const id = W.get(x, y, z);
            if (id && !DEF[id].liquid) return { x, y, z, id, nx, ny, nz, dist: t };
            if (tx < ty && tx < tz) { x += sx; t = tx; tx += tdx; nx = -sx; ny = 0; nz = 0; }
            else if (ty < tz) { y += sy; t = ty; ty += tdy; nx = 0; ny = -sy; nz = 0; }
            else { z += sz; t = tz; tz += tdz; nx = 0; ny = 0; nz = -sz; }
        }
        return null;
    };

    E.setBlock = function (x, y, z, id) {
        if (!W.inb(x, y, z)) return;
        W.set(x, y, z, id); E.markDirty(x, y, z);
    };

    E.advance = function (dt) {
        E.time = (E.time + dt / E.dayLen * (E.fastTime ? 12 : 1)) % 1;
    };
})();
