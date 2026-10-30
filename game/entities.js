/* CV World — NPCs, Knowledge Shards, 3D signs, portal, particles, clouds */
(function () {
    'use strict';
    const W = window.CVW, E = window.CVE, CV = window.CV_DATA;
    const X = { npcs: [], shards: [], signs: [], clouds: [], particles: [], portal: null, collected: new Set() };
    window.CVX = X;

    function hex(c) { return '#' + c.toString(16).padStart(6, '0'); }

    /* ---------- 3D text signs (canvas sprites) ---------- */
    function makeSign(s) {
        const c = document.createElement('canvas'), g = c.getContext('2d');
        const fs = 56;
        g.font = '700 ' + fs + 'px "JetBrains Mono", monospace';
        const w = Math.ceil(g.measureText(s.text).width) + 48;
        c.width = w; c.height = fs + 36;
        g.font = '700 ' + fs + 'px "JetBrains Mono", monospace';
        g.fillStyle = 'rgba(8,12,24,.72)'; g.beginPath();
        if (g.roundRect) g.roundRect(0, 0, c.width, c.height, 14); else g.rect(0, 0, c.width, c.height);
        g.fill();
        g.strokeStyle = s.color; g.lineWidth = 4; g.stroke();
        g.fillStyle = s.color; g.textBaseline = 'middle'; g.fillText(s.text, 24, c.height / 2 + 3);
        const tex = new THREE.CanvasTexture(c); tex.minFilter = THREE.LinearFilter;
        const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: true }));
        const h = 0.55 * s.size; spr.scale.set(h * c.width / c.height, h, 1);
        spr.position.set(s.x, s.y, s.z);
        return spr;
    }

    /* ---------- Minecraft-style NPCs (boxes) ---------- */
    function box(w, h, d, color, x, y, z) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color }));
        m.position.set(x, y, z); return m;
    }
    function makeNPC(n) {
        const g = new THREE.Group();
        const skin = 0xe8b98a, shirt = n.color, pants = 0x2b3350;
        g.add(box(0.5, 0.5, 0.5, skin, 0, 1.55, 0));
        g.add(box(0.52, 0.18, 0.52, n.id === 'bang' ? 0x1a1a22 : 0x4a3322, 0, 1.78, 0));
        const eyeL = box(0.08, 0.08, 0.02, 0x111111, -0.12, 1.57, 0.26), eyeR = box(0.08, 0.08, 0.02, 0x111111, 0.12, 1.57, 0.26);
        g.add(eyeL); g.add(eyeR);
        g.add(box(0.5, 0.75, 0.25, shirt, 0, 0.98, 0));
        const armL = box(0.2, 0.7, 0.2, skin, -0.36, 1.0, 0), armR = box(0.2, 0.7, 0.2, skin, 0.36, 1.0, 0);
        g.add(armL); g.add(armR);
        g.add(box(0.22, 0.6, 0.22, pants, -0.12, 0.3, 0)); g.add(box(0.22, 0.6, 0.22, pants, 0.12, 0.3, 0));
        g.userData = { armL, armR };
        // name label
        const lbl = makeSign({ text: n.name + ' · ' + n.role, x: 0, y: 2.35, z: 0, color: hex(n.color), size: 0.55 });
        g.add(lbl);
        // blinking "!" marker
        const ex = makeSign({ text: '!', x: 0, y: 2.8, z: 0, color: '#ffe14d', size: 0.7 }); g.add(ex); g.userData.ex = ex;
        return g;
    }

    /* ---------- Knowledge Shard ---------- */
    function makeShard() {
        const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.28), new THREE.MeshBasicMaterial({ color: 0x4ff2e4 }));
        const o = new THREE.Mesh(new THREE.OctahedronGeometry(0.42), new THREE.MeshBasicMaterial({ color: 0x4ff2e4, transparent: true, opacity: 0.25, wireframe: true }));
        const g = new THREE.Group(); g.add(m); g.add(o); return g;
    }

    X.init = function () {
        // signs
        W.signs.forEach(s => { const spr = makeSign(s); E.scene.add(spr); X.signs.push(spr); });
        // NPC
        CV.npcs.forEach(n => {
            const y = W.topY(n.x, n.z) + 1;
            const mesh = makeNPC(n); mesh.position.set(n.x + 0.5, y, n.z + 0.5);
            E.scene.add(mesh);
            X.npcs.push({ data: n, mesh, baseY: y, talked: false, phase: Math.random() * 6 });
        });
        // shards
        W.shardSpots.forEach(s => {
            const m = makeShard(); m.position.set(s.x, s.y, s.z); E.scene.add(m);
            X.shards.push({ id: s.id, mesh: m, base: s.y, got: false });
        });
        // portal (XY plane at the contact landmark)
        const lp = W.landmarks.contact.portal;
        const pg = new THREE.PlaneGeometry(5, 6);
        const pm = new THREE.ShaderMaterial({
            transparent: true, side: THREE.DoubleSide, depthWrite: false,
            uniforms: { t: { value: 0 } },
            vertexShader: 'varying vec2 v; void main(){ v=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
            fragmentShader: 'varying vec2 v; uniform float t; void main(){ vec2 p=v-.5; float r=length(p); float a=atan(p.y,p.x); float w=sin(a*4.+t*2.-r*14.)*.5+.5; vec3 c=mix(vec3(.55,.1,.85),vec3(1.,.3,.7),w); gl_FragColor=vec4(c*(.6+.6*w), .78*(1.-smoothstep(.35,.52,r*.9+abs(p.x)*0.2))+.15); }'
        });
        const pmesh = new THREE.Mesh(pg, pm); pmesh.position.set(lp.x + 0.5, lp.y + 0.2, lp.z + 0.5);
        E.scene.add(pmesh); X.portal = { mesh: pmesh, mat: pm, x: lp.x, y: lp.y, z: lp.z };
        // clouds
        const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, fog: false });
        for (let i = 0; i < 34; i++) {
            const g = new THREE.Group();
            const n = 3 + (Math.random() * 4 | 0);
            for (let k = 0; k < n; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(6 + Math.random() * 6, 2, 5 + Math.random() * 5), mat); b.position.set(k * 5 - n * 2.5, Math.random() * 0.6, (Math.random() - 0.5) * 5); g.add(b); }
            g.position.set((Math.random() - 0.5) * 360, 52 + Math.random() * 8, (Math.random() - 0.5) * 360);
            E.scene.add(g); X.clouds.push(g);
        }
        // particles (burst pool)
        const geo = new THREE.BufferGeometry(), N = 200;
        geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 3).fill(-9999), 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3));
        X.pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.18, vertexColors: true, transparent: true, depthWrite: false }));
        X.pts.frustumCulled = false; E.scene.add(X.pts);
        X.pool = []; for (let i = 0; i < N; i++) X.pool.push({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), c: new THREE.Color() });
        X.poolIdx = 0;
    };

    X.burst = function (x, y, z, color, n, spd) {
        const c = new THREE.Color(color);
        for (let i = 0; i < n; i++) {
            const p = X.pool[X.poolIdx++ % X.pool.length];
            p.life = 0.7 + Math.random() * 0.5; p.p.set(x, y, z); p.c.copy(c);
            p.v.set((Math.random() - 0.5) * spd, Math.random() * spd, (Math.random() - 0.5) * spd);
        }
    };
    X.blockBurst = function (x, y, z, id) {
        const d = W.DEF[id]; const t = d ? d.side : 3;
        const px = (t % W.COLS) * W.TILE + 8, py = Math.floor(t / W.COLS) * W.TILE + 8;
        const dt = E.atlas.getContext('2d').getImageData(px, py, 1, 1).data;
        X.burst(x + 0.5, y + 0.5, z + 0.5, (dt[0] << 16) | (dt[1] << 8) | dt[2], 10, 4);
    };

    X.update = function (dt, t, ppos) {
        // NPC: look at the player + wave
        X.npcs.forEach(n => {
            const dx = ppos.x - n.mesh.position.x, dz = ppos.z - n.mesh.position.z, d = Math.hypot(dx, dz);
            n.dist = d;
            if (d < 14) n.mesh.rotation.y = Math.atan2(dx, dz);
            const sw = Math.sin(t * 3 + n.phase) * (d < 5 ? 0.9 : 0.15);
            n.mesh.userData.armR.rotation.x = d < 5 ? -2.4 + sw * 0.3 : sw * 0.3;
            n.mesh.userData.armL.rotation.x = -sw * 0.2;
            n.mesh.userData.ex.visible = !n.talked;
            n.mesh.userData.ex.position.y = 2.8 + Math.sin(t * 3 + n.phase) * 0.08;
        });
        // shards
        X.shards.forEach(s => {
            if (s.got) return;
            s.mesh.rotation.y = t * 1.8; s.mesh.position.y = s.base + Math.sin(t * 2 + s.id) * 0.18;
            const dx = ppos.x - s.mesh.position.x, dy = ppos.y + 0.9 - s.mesh.position.y, dz = ppos.z - s.mesh.position.z;
            if (dx * dx + dy * dy + dz * dz < 2.2) { s.got = true; s.mesh.visible = false; X.collected.add(s.id); X.burst(s.mesh.position.x, s.mesh.position.y, s.mesh.position.z, 0x4ff2e4, 30, 5); if (X.onShard) X.onShard(s.id); }
        });
        // portal
        if (X.portal) {
            X.portal.mat.uniforms.t.value = t;
            const q = X.portal;
            if (Math.abs(ppos.x - (q.x + 0.5)) < 2 && Math.abs(ppos.z - (q.z + 0.5)) < 1.2 && ppos.y > q.y - 3 && ppos.y < q.y + 5) { if (X.onPortal) X.onPortal(); }
        }
        // clouds
        X.clouds.forEach(c => { c.position.x += dt * 1.2; if (c.position.x > 190) c.position.x = -190; });
        // particles
        const pos = X.pts.geometry.attributes.position, col = X.pts.geometry.attributes.color;
        X.pool.forEach((p, i) => {
            if (p.life > 0) {
                p.life -= dt; p.v.y -= 9 * dt; p.p.addScaledVector(p.v, dt);
                pos.setXYZ(i, p.p.x, p.p.y, p.p.z); col.setXYZ(i, p.c.r, p.c.g, p.c.b);
            } else pos.setXYZ(i, 0, -9999, 0);
        });
        pos.needsUpdate = true; col.needsUpdate = true;
    };

    X.nearestNPC = function (ppos, r) {
        let best = null, bd = r || 3.2;
        X.npcs.forEach(n => { if (n.dist < bd) { bd = n.dist; best = n; } });
        return best;
    };
})();
