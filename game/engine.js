/* CV World — Three.js Engine: Padded-Atlas Chunk Mesher, Warm-Sun/Cool-Shadow Shaders, Animated Water/Lava/Sway,
   Infinite Ocean Skirt, Multi-Dimension Skyboxes (Overworld, Nether, Aether Cloud Sea, Cosmos Nebula + Ringed Planet, Dungeon),
   3D Voxel Held Item & 3rd-Person Character */
(function () {
    'use strict';
    const W = window.CVW, DEF = W.DEF, B = W.B;
    const CS = 16;
    const ATLAS_PX = W.COLS * W.STRIDE;
    const TILE_UV = W.TILE / ATLAS_PX;
    const PAD_UV = W.PAD_PX / ATLAS_PX;
    const STRIDE_UV = W.STRIDE / ATLAS_PX;

    const E = {
        chunks: new Map(), dirty: new Set(),
        time: 0.28, dayLen: 360, fastTime: false, isNight: false, dayFactor: 1,
        rainAmt: 0, camMode: 0, fogDist: 155, isSoftwareGl: false
    };
    window.CVE = E;

    const FACES = [
        { d: [0, 1, 0], k: 'top', s: 1.0, v: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], ao: [[[0, 1, 1], [-1, 1, 0], [-1, 1, 1]], [[0, 1, 1], [1, 1, 0], [1, 1, 1]], [[0, 1, -1], [1, 1, 0], [1, 1, -1]], [[0, 1, -1], [-1, 1, 0], [-1, 1, -1]]] },
        { d: [0, -1, 0], k: 'bot', s: 0.56, v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], ao: null },
        { d: [0, 0, 1], k: 'side', s: 0.86, v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], ao: [[[0, -1, 1], [-1, 0, 1], [-1, -1, 1]], [[0, -1, 1], [1, 0, 1], [1, -1, 1]], [[0, 1, 1], [1, 0, 1], [1, 1, 1]], [[0, 1, 1], [-1, 0, 1], [-1, 1, 1]]] },
        { d: [0, 0, -1], k: 'side', s: 0.78, v: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], ao: [[[0, -1, -1], [1, 0, -1], [1, -1, -1]], [[0, -1, -1], [-1, 0, -1], [-1, -1, -1]], [[0, 1, -1], [-1, 0, -1], [-1, 1, -1]], [[0, 1, -1], [1, 0, -1], [1, 1, -1]]] },
        { d: [1, 0, 0], k: 'side', s: 0.89, v: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], ao: [[[1, -1, 0], [1, 0, 1], [1, -1, 1]], [[1, -1, 0], [1, 0, -1], [1, -1, -1]], [[1, 1, 0], [1, 0, -1], [1, 1, -1]], [[1, 1, 0], [1, 0, 1], [1, 1, 1]]] },
        { d: [-1, 0, 0], k: 'side', s: 0.74, v: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], ao: [[[-1, -1, 0], [-1, 0, -1], [-1, -1, -1]], [[-1, -1, 0], [-1, 0, 1], [-1, -1, 1]], [[-1, 1, 0], [-1, 0, 1], [-1, 1, 1]], [[-1, 1, 0], [-1, 0, -1], [-1, 1, -1]]] }
    ];
    const UVS = [[0, 0], [1, 0], [1, 1], [0, 1]];
    const occ = (x, y, z) => { const b = W.get(x, y, z); return b !== 0 && DEF[b].opaque; };
    const AO_CURVE = [1.0, 0.84, 0.68, 0.50];

    function tileUV(tile) {
        const u0 = (tile % W.COLS) * STRIDE_UV + PAD_UV;
        const v1 = 1.0 - (Math.floor(tile / W.COLS) * STRIDE_UV + PAD_UV);
        return [u0, v1 - TILE_UV];
    }

    /* ---------- Custom GLSL Voxel Shaders (Warm Sun / Cool Sky Ambient + Dynamic Torch + Water / Lava / Sway) ---------- */
    function makeVoxelMat(opts) {
        const isWater = !!opts.water;
        const isLava = !!opts.lava;
        const isSway = !!opts.sway;
        const isCutout = !!opts.cutout;
        const isGlow = !!opts.glow;

        return new THREE.ShaderMaterial({
            uniforms: {
                uMap: { value: E.tex },
                uTime: E.uTime,
                uSkyColor: E.uSkyColor,
                uSunColor: E.uSunColor,
                uAmbientColor: E.uAmbientColor,
                uSunLevel: E.uSunLevel,
                uFogColor: E.uFogColor,
                uFogNear: E.uFogNear,
                uFogFar: E.uFogFar,
                uRain: E.uRain,
                uUnderwater: E.uUnderwater,
                uPlayerLightPos: E.uPlayerLightPos,
                uPlayerLightStr: E.uPlayerLightStr,
                uTileUV: { value: TILE_UV }
            },
            transparent: isWater || !!opts.translucent,
            depthWrite: !(isWater || !!opts.translucent),
            side: (isWater || isCutout) ? THREE.DoubleSide : THREE.FrontSide,
            vertexShader: `
                attribute vec3 aLight; // x=skyLight, y=blockLight, z=faceShade*ao
                varying vec2 vUv;
                varying vec3 vLight;
                varying vec3 vWorldPos;
                varying float vDist;
                uniform float uTime;
                uniform float uRain;

                void main() {
                    vUv = uv;
                    vLight = aLight;
                    vec3 pos = position;
                    vec4 wp = modelMatrix * vec4(pos, 1.0);

                    ${isSway ? `
                    float wind = 0.042 + uRain * 0.048;
                    float phase = wp.x * 0.7 + wp.z * 0.5 + wp.y * 0.35;
                    wp.x += sin(uTime * 2.1 + phase) * wind;
                    wp.z += cos(uTime * 1.7 + phase * 1.2) * wind * 0.8;
                    ` : ''}

                    ${isWater ? `
                    float wave = sin(wp.x * 0.9 + uTime * 2.3) * 0.045 + cos(wp.z * 1.05 + uTime * 1.9) * 0.04;
                    wp.y += wave;
                    ` : ''}

                    ${isLava ? `
                    float swell = sin(wp.x * 0.75 + uTime * 1.35) * cos(wp.z * 0.75 - uTime * 1.1) * 0.032;
                    wp.y += swell;
                    ` : ''}

                    vWorldPos = wp.xyz;
                    vec4 mv = viewMatrix * wp;
                    vDist = length(mv.xyz);
                    gl_Position = projectionMatrix * mv;
                }
            `,
            fragmentShader: `
                uniform sampler2D uMap;
                uniform float uTime;
                uniform vec3 uSkyColor;
                uniform vec3 uSunColor;
                uniform vec3 uAmbientColor;
                uniform float uSunLevel;
                uniform vec3 uFogColor;
                uniform float uFogNear;
                uniform float uFogFar;
                uniform float uUnderwater;
                uniform vec3 uPlayerLightPos;
                uniform float uPlayerLightStr;
                uniform float uTileUV;

                varying vec2 vUv;
                varying vec3 vLight;
                varying vec3 vWorldPos;
                varying float vDist;

                void main() {
                    vec2 uv = vUv;
                    ${isWater ? `
                    // Seamless smooth turquoise water wave shimmer inside padded tile
                    vec2 tileOrigin = floor(vUv / ${STRIDE_UV.toFixed(6)}) * ${STRIDE_UV.toFixed(6)} + vec2(${PAD_UV.toFixed(6)});
                    vec2 local = fract((vUv - tileOrigin) / uTileUV + vec2(uTime * 0.055, uTime * 0.035));
                    uv = tileOrigin + local * uTileUV;
                    ` : ''}
                    ${isLava ? `
                    vec2 tileOrigin = floor(vUv / ${STRIDE_UV.toFixed(6)}) * ${STRIDE_UV.toFixed(6)} + vec2(${PAD_UV.toFixed(6)});
                    vec2 local = fract((vUv - tileOrigin) / uTileUV + vec2(uTime * 0.022, sin(uTime * 0.55 + vWorldPos.x * 0.35) * 0.03));
                    uv = tileOrigin + local * uTileUV;
                    ` : ''}

                    vec4 tex = texture2D(uMap, uv);
                    ${isCutout ? 'if (tex.a < 0.45) discard;' : ''}

                    float skyL = vLight.x;
                    float blkL = vLight.y;
                    float shade = vLight.z;

                    // Dynamic held torch / lantern real-time point light
                    float pDist = length(vWorldPos - uPlayerLightPos);
                    float dynL = uPlayerLightStr * clamp(1.0 - pDist / 13.0, 0.0, 1.0);
                    dynL = dynL * dynL;

                    float flicker = 0.965 + 0.035 * sin(uTime * 7.5 + vWorldPos.x * 1.4 + vWorldPos.z * 1.2);
                    float totalBlk = clamp(max(blkL, dynL) * flicker, 0.0, 1.0);

                    // Warm sunlit highlight on top/bright faces + cool sky-tinted ambient in shadows!
                    vec3 skyLit = mix(uAmbientColor, uSunColor, clamp((shade - 0.52) * 1.9, 0.0, 1.0));
                    vec3 lightCol = skyLit * (0.14 + skyL * uSunLevel * 0.92);
                    vec3 torchCol = vec3(1.06, 0.74, 0.42) * pow(totalBlk, 1.15) * 1.12;
                    vec3 lit = max(lightCol, torchCol) + torchCol * 0.24;
                    lit = max(lit, uAmbientColor * 0.22);

                    vec3 color = tex.rgb * lit * shade;

                    ${isGlow ? 'color = max(color, tex.rgb * (0.94 + 0.08 * sin(uTime * 3.0 + vWorldPos.x)));' : ''}
                    ${isLava ? `
                    float pulse = 0.90 + 0.14 * sin(uTime * 2.8 + vWorldPos.x * 0.9 + vWorldPos.z * 0.7);
                    color = tex.rgb * pulse * vec3(1.16, 1.02, 0.88);
                    ` : ''}
                    ${isWater ? `
                    float caust = pow(max(0.0, sin(vWorldPos.x * 1.9 + uTime * 2.2) * cos(vWorldPos.z * 1.9 - uTime * 1.8)), 3.0);
                    float fresnel = clamp(vDist / 90.0, 0.0, 0.45);
                    color = mix(color, uSkyColor * 1.05, 0.22 + fresnel * 0.42) + vec3(0.32, 0.55, 0.65) * caust * (0.28 + uSunLevel * 0.48);
                    ` : ''}

                    float fogF = smoothstep(uFogNear, uFogFar, vDist);
                    vec3 fCol = mix(uFogColor, vec3(0.08, 0.26, 0.52), uUnderwater);
                    if (uUnderwater > 0.5) fogF = smoothstep(4.0, 32.0, vDist);
                    color = mix(color, fCol, fogF);

                    float alpha = ${isWater ? '0.80' : (opts.translucent ? '0.72' : 'tex.a')};
                    gl_FragColor = vec4(color, alpha);
                }
            `
        });
    }

    function pushBoxPart(bu, x0, y0, z0, x1, y1, z1, tile, sl, bl, shadeMul) {
        const [tx, ty] = tileUV(tile);
        const faces = [
            { v: [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], s: 1.0 },
            { v: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], s: 0.6 },
            { v: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], s: 0.88 },
            { v: [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], s: 0.82 },
            { v: [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], s: 0.90 },
            { v: [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], s: 0.78 }
        ];
        for (let f = 0; f < 6; f++) {
            const F = faces[f], base = bu.n, sh = F.s * (shadeMul || 1);
            for (let i = 0; i < 4; i++) {
                bu.p.push(F.v[i][0], F.v[i][1], F.v[i][2]);
                bu.u.push(tx + UVS[i][0] * TILE_UV, ty + UVS[i][1] * TILE_UV);
                bu.l.push(sl, bl, sh);
            }
            bu.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
            bu.n += 4;
        }
    }

    function buildChunk(cx, cz) {
        const x0 = cx * CS - W.OX, z0 = cz * CS - W.OZ;
        const Bufs = () => ({ p: [], u: [], l: [], i: [], n: 0 });
        const opa = Bufs(), cut = Bufs(), sway = Bufs(), wat = Bufs(), lav = Bufs(), glw = Bufs(), trn = Bufs();

        for (let y = 0; y < W.SY; y++) for (let lz = 0; lz < CS; lz++) for (let lx = 0; lx < CS; lx++) {
            const wx = x0 + lx, wz = z0 + lz, id = W.get(wx, y, wz);
            if (!id) continue;
            const df = DEF[id];

            // 3D Voxel Torch / Soul Torch Geometry
            if (df.torch) {
                const sl = W.getSkyLight(wx, y, wz) / 15, bl = 1.0;
                const isSoul = id === B.SOUL_TORCH;
                pushBoxPart(opa, wx + 0.43, y, wz + 0.43, wx + 0.57, y + 0.58, wz + 0.57, 7, sl, bl, 1.0);
                pushBoxPart(glw, wx + 0.41, y + 0.56, wz + 0.41, wx + 0.59, y + 0.76, wz + 0.59, isSoul ? 67 : 18, 1.0, 1.0, 1.15);
                continue;
            }

            // Crossed foliage / flowers / corals / vines
            if (df.cross) {
                const bu = df.emit >= 10 ? glw : (df.sway ? sway : cut);
                const [tx, ty] = tileUV(df.side);
                const sl = W.getSkyLight(wx, y, wz) / 15;
                const bl = Math.max(W.getBlockLight(wx, y, wz), df.emit || 0) / 15;
                const quads = [
                    [[wx + 0.14, y, wz + 0.14], [wx + 0.86, y, wz + 0.86], [wx + 0.86, y + 0.94, wz + 0.86], [wx + 0.14, y + 0.94, wz + 0.14]],
                    [[wx + 0.86, y, wz + 0.14], [wx + 0.14, y, wz + 0.86], [wx + 0.14, y + 0.94, wz + 0.86], [wx + 0.86, y + 0.94, wz + 0.14]]
                ];
                for (const q of quads) {
                    const base = bu.n;
                    for (let v = 0; v < 4; v++) {
                        bu.p.push(q[v][0], q[v][1], q[v][2]);
                        bu.u.push(tx + UVS[v][0] * TILE_UV, ty + UVS[v][1] * TILE_UV);
                        bu.l.push(sl, bl, v >= 2 ? 1.0 : 0.78);
                    }
                    bu.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
                    bu.n += 4;
                }
                continue;
            }

            const bu = df.lava ? lav : (df.liquid ? wat : (df.translucent ? trn : (df.light ? glw : (df.sway ? sway : (df.cutout ? cut : opa)))));

            for (let f = 0; f < 6; f++) {
                const F = FACES[f], nx = wx + F.d[0], ny = y + F.d[1], nz = wz + F.d[2];
                const nb = W.get(nx, ny, nz);
                if (df.liquid) {
                    if (nb === id) continue;
                    if (nb && DEF[nb].opaque) continue;
                } else if (df.translucent) {
                    if (nb === id || (nb && DEF[nb].opaque)) continue;
                } else if (df.cutout) {
                    if (nb === id && id === B.GLASS) continue;
                    if (nb && DEF[nb].opaque) continue;
                } else {
                    if (nb && DEF[nb].opaque) continue;
                }

                const [tx, ty] = tileUV(df[F.k]);
                const sl = W.getSkyLight(nx, ny, nz) / 15;
                const bl = Math.max(W.getBlockLight(nx, ny, nz), df.emit || 0) / 15;
                const drop = (df.liquid && f === 0 && W.get(wx, y + 1, wz) !== id) ? -0.10 : 0;
                const base = bu.n;
                const aov = [1, 1, 1, 1];

                for (let v = 0; v < 4; v++) {
                    const vv = F.v[v];
                    bu.p.push(wx + vv[0], y + vv[1] + (vv[1] === 1 ? drop : 0), wz + vv[2]);
                    bu.u.push(tx + UVS[v][0] * TILE_UV, ty + UVS[v][1] * TILE_UV);
                    let ao = 1.0;
                    if (F.ao && !df.liquid && !df.light) {
                        const a = F.ao[v];
                        const s1 = occ(wx + a[0][0], y + a[0][1], wz + a[0][2]) ? 1 : 0;
                        const s2 = occ(wx + a[1][0], y + a[1][1], wz + a[1][2]) ? 1 : 0;
                        const cr = (s1 && s2) ? 1 : (occ(wx + a[2][0], y + a[2][1], wz + a[2][2]) ? 1 : 0);
                        ao = AO_CURVE[s1 + s2 + cr];
                    }
                    aov[v] = ao;
                    bu.l.push(sl, bl, F.s * ao);
                }
                if (aov[0] + aov[2] < aov[1] + aov[3]) {
                    bu.i.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
                } else {
                    bu.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
                }
                bu.n += 4;
            }
        }

        const grp = new THREE.Group();
        const mk = (b, mat, ro) => {
            if (!b.n) return;
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3));
            g.setAttribute('uv', new THREE.Float32BufferAttribute(b.u, 2));
            g.setAttribute('aLight', new THREE.Float32BufferAttribute(b.l, 3));
            g.setIndex(b.i);
            const m = new THREE.Mesh(g, mat);
            if (ro) m.renderOrder = ro;
            grp.add(m);
        };
        mk(opa, E.mats.opa, 0);
        mk(cut, E.mats.cut, 0);
        mk(sway, E.mats.sway, 0);
        mk(glw, E.mats.glow, 0);
        mk(lav, E.mats.lava, 1);
        mk(trn, E.mats.trn, 2);
        mk(wat, E.mats.water, 3);
        return grp;
    }

    function disposeGrp(g) {
        g.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    }

    E.rebuildChunk = function (cx, cz) {
        const ncx = Math.ceil(W.SX / CS), ncz = Math.ceil(W.SZ / CS);
        if (cx < 0 || cz < 0 || cx >= ncx || cz >= ncz) return;
        const k = cx + ',' + cz, old = E.chunks.get(k);
        if (old) { E.scene.remove(old); disposeGrp(old); }
        const g = buildChunk(cx, cz);
        E.scene.add(g); E.chunks.set(k, g);
    };

    E.rebuildAllChunks = function () {
        E.chunks.forEach(g => { E.scene.remove(g); disposeGrp(g); });
        E.chunks.clear();
        E.dirty.clear();
        const ncx = Math.ceil(W.SX / CS), ncz = Math.ceil(W.SZ / CS);
        for (let cz = 0; cz < ncz; cz++) for (let cx = 0; cx < ncx; cx++) E.rebuildChunk(cx, cz);

        // Toggle dimension-specific world horizon props
        if (E.oceanSkirt) E.oceanSkirt.visible = (W.dim === 'overworld');
        if (E.aetherSea) E.aetherSea.visible = (W.dim === 'aether');
        if (E.cosmosProps) E.cosmosProps.visible = (W.dim === 'cosmos');
        if (E.sun) E.sun.visible = (W.dim === 'overworld' || W.dim === 'aether');
        if (E.moon) E.moon.visible = (W.dim === 'overworld');
    };

    E.markDirty = function (wx, wz) {
        const cx = Math.floor((wx + W.OX) / CS), cz = Math.floor((wz + W.OZ) / CS);
        const lx = ((wx + W.OX) % CS + CS) % CS, lz = ((wz + W.OZ) % CS + CS) % CS;
        E.dirty.add(cx + ',' + cz);
        if (lx === 0) E.dirty.add((cx - 1) + ',' + cz);
        if (lx === CS - 1) E.dirty.add((cx + 1) + ',' + cz);
        if (lz === 0) E.dirty.add(cx + ',' + (cz - 1));
        if (lz === CS - 1) E.dirty.add(cx + ',' + (cz + 1));
    };

    E.flushDirty = function () {
        const lim = E.isSoftwareGl ? 6 : 16;
        let done = 0;
        for (const k of E.dirty) {
            E.dirty.delete(k);
            const [cx, cz] = k.split(',').map(Number);
            E.rebuildChunk(cx, cz);
            if (++done >= lim) break;
        }
    };

    /* ---------- Initialization ---------- */
    E.init = function (canvas) {
        E.isSoftwareGl = (() => {
            try {
                const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
                if (!gl) return false;
                const dbg = gl.getExtension('WEBGL_debug_renderer_info');
                const ren = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '';
                return /SwiftShader|llvmpipe|Software|Mesa OffScreen/i.test(ren || '');
            } catch (err) { return false; }
        })();

        const r = new THREE.WebGLRenderer({ canvas, antialias: !E.isSoftwareGl, powerPreference: 'high-performance' });
        r.setPixelRatio(E.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
        r.setSize(window.innerWidth, window.innerHeight);
        canvas.addEventListener('webglcontextlost', e => e.preventDefault(), false);

        E.renderer = r;
        E.scene = new THREE.Scene();
        E.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.08, 420);
        E.camera.rotation.order = 'YXZ';
        E.scene.add(E.camera);

        E.uTime = { value: 0 };
        E.uSkyColor = { value: new THREE.Color(0x88c9ff) };
        E.uSunColor = { value: new THREE.Color(0xfff7e6) };
        E.uAmbientColor = { value: new THREE.Color(0x8db3e0) };
        E.uSunLevel = { value: 1.0 };
        E.uFogColor = { value: new THREE.Color(0x9bd3ff) };
        E.uFogNear = { value: 78.0 };
        E.uFogFar = { value: E.fogDist };
        E.uRain = { value: 0.0 };
        E.uUnderwater = { value: 0.0 };
        E.uPlayerLightPos = { value: new THREE.Vector3() };
        E.uPlayerLightStr = { value: 0.0 };
        E.uSunDir = { value: new THREE.Vector3(0.4, 0.85, 0.25).normalize() };

        const atlas = W.buildAtlas();
        const tex = new THREE.CanvasTexture(atlas);
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        tex.generateMipmaps = false;
        E.atlas = atlas; E.tex = tex;

        E.mats = {
            opa: makeVoxelMat({}),
            cut: makeVoxelMat({ cutout: true }),
            sway: makeVoxelMat({ cutout: true, sway: true }),
            water: makeVoxelMat({ water: true }),
            trn: makeVoxelMat({ translucent: true }),
            lava: makeVoxelMat({ lava: true }),
            glow: makeVoxelMat({ glow: true })
        };

        E.scene.fog = new THREE.Fog(0x9bd3ff, 78, E.fogDist);
        E.scene.background = new THREE.Color(0x9bd3ff);

        /* --- Multi-Dimension Procedural Sky Dome (Overworld, Nether, Aether, Cosmos Nebula, Dungeon) --- */
        E.skyUniforms = {
            uTop: { value: new THREE.Color(0x2e7de5) },
            uHorizon: { value: new THREE.Color(0xa6dcff) },
            uGlow: { value: new THREE.Color(0xff9b54) },
            uGlowAmt: { value: 0 },
            uSunDir: E.uSunDir,
            uTime: E.uTime,
            uNebula: { value: 0 }
        };
        E.skyDome = new THREE.Mesh(
            new THREE.SphereGeometry(310, 28, 18),
            new THREE.ShaderMaterial({
                side: THREE.BackSide, depthWrite: false, fog: false,
                uniforms: E.skyUniforms,
                vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
                fragmentShader: `
                    uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uGlow;
                    uniform float uGlowAmt; uniform vec3 uSunDir; uniform float uTime; uniform float uNebula;
                    varying vec3 vDir;
                    void main() {
                        float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
                        vec3 col = mix(uHorizon, uTop, pow(clamp(vDir.y, 0.0, 1.0), 0.52));
                        if (uNebula > 0.5) {
                            // Cosmic swirling galaxy & nebula ribbons!
                            float band = sin(vDir.x * 4.5 + vDir.z * 3.0 + sin(vDir.y * 6.0 + uTime * 0.08)) * 0.5 + 0.5;
                            float milky = exp(-pow(vDir.y * 2.4 - vDir.x * 0.8, 2.0) * 3.5);
                            col += mix(vec3(0.32, 0.08, 0.58), vec3(0.08, 0.45, 0.68), band) * milky * 0.85;
                            col += vec3(0.75, 0.25, 0.85) * pow(band * milky, 3.0) * 0.5;
                        } else {
                            float sunDot = max(dot(normalize(vDir), normalize(uSunDir)), 0.0);
                            col += uGlow * pow(sunDot, 5.5) * (0.28 + uGlowAmt * 0.72);
                            col = mix(col, uGlow, uGlowAmt * (1.0 - smoothstep(0.0, 0.34, clamp(vDir.y, 0.0, 1.0))) * 0.44);
                        }
                        gl_FragColor = vec4(col, 1.0);
                    }
                `
            })
        );
        E.skyDome.renderOrder = -10;
        E.scene.add(E.skyDome);

        /* --- Infinite Animated Ocean Skirt around Overworld (ZERO cut-off world edges!) --- */
        const skirtGeo = new THREE.RingGeometry(108, 420, 48, 2);
        skirtGeo.rotateX(-Math.PI / 2);
        E.oceanSkirt = new THREE.Mesh(skirtGeo, new THREE.ShaderMaterial({
            transparent: false, depthWrite: true,
            uniforms: { uTime: E.uTime, uSkyColor: E.uSkyColor, uFogColor: E.uFogColor, uSunLevel: E.uSunLevel, uFogNear: E.uFogNear, uFogFar: E.uFogFar },
            vertexShader: 'varying vec3 vWp; varying float vDist; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vWp = wp.xyz; vec4 mv = viewMatrix * wp; vDist = length(mv.xyz); gl_Position = projectionMatrix * mv; }',
            fragmentShader: `
                uniform float uTime; uniform vec3 uSkyColor; uniform vec3 uFogColor; uniform float uSunLevel; uniform float uFogNear; uniform float uFogFar;
                varying vec3 vWp; varying float vDist;
                void main() {
                    float w = sin(vWp.x * 0.28 + uTime * 1.6) * cos(vWp.z * 0.28 - uTime * 1.2) * 0.5 + 0.5;
                    vec3 deep = vec3(0.11, 0.44, 0.74) * (0.22 + uSunLevel * 0.82);
                    vec3 col = mix(deep, uSkyColor * 0.92, 0.32 + w * 0.14);
                    float fogF = smoothstep(uFogNear * 0.85, uFogFar * 1.25, vDist);
                    gl_FragColor = vec4(mix(col, uFogColor, fogF), 1.0);
                }
            `
        }));
        E.oceanSkirt.position.y = 10.9;
        E.scene.add(E.oceanSkirt);

        /* --- Aether Dimension Radiant Cloud Sea far below floating islands --- */
        const aSeaGeo = new THREE.PlaneGeometry(760, 760);
        aSeaGeo.rotateX(-Math.PI / 2);
        E.aetherSea = new THREE.Mesh(aSeaGeo, new THREE.ShaderMaterial({
            transparent: true, depthWrite: false,
            uniforms: { uTime: E.uTime },
            vertexShader: 'varying vec2 vUv; void main(){ vUv = uv * 12.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
            fragmentShader: `
                uniform float uTime; varying vec2 vUv;
                void main() {
                    float c = sin(vUv.x * 1.8 + uTime * 0.12) * cos(vUv.y * 1.8 - uTime * 0.08) * 0.5 + 0.5;
                    vec3 col = mix(vec3(0.82, 0.92, 1.0), vec3(1.0, 0.97, 0.88), c);
                    gl_FragColor = vec4(col, 0.86);
                }
            `
        }));
        E.aetherSea.position.y = -6;
        E.aetherSea.visible = false;
        E.scene.add(E.aetherSea);

        /* --- Cosmos Dimension Giant Ringed Planet & Orbiting Moon --- */
        E.cosmosProps = new THREE.Group();
        const planet = new THREE.Mesh(new THREE.SphereGeometry(26, 20, 16), new THREE.MeshBasicMaterial({ color: 0x7c3aed, fog: false }));
        const ring = new THREE.Mesh(new THREE.RingGeometry(34, 52, 40), new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45, side: THREE.DoubleSide, fog: false }));
        ring.rotation.x = 1.2; ring.rotation.y = 0.35;
        const pGrp = new THREE.Group(); pGrp.add(planet); pGrp.add(ring); pGrp.position.set(-140, 95, -165);
        const moon2 = new THREE.Mesh(new THREE.SphereGeometry(11, 16, 12), new THREE.MeshBasicMaterial({ color: 0xf0abfc, fog: false }));
        moon2.position.set(130, 82, 120);
        E.cosmosProps.add(pGrp); E.cosmosProps.add(moon2);
        E.cosmosProps.userData = { pGrp, moon2 };
        E.cosmosProps.visible = false;
        E.scene.add(E.cosmosProps);

        // Target outline, 10-stage crack overlay, placement ghost
        const eg = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.003, 1.003, 1.003));
        E.outline = new THREE.Group();
        E.outlineEdge = new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color: 0x38f2e6, transparent: true, opacity: 0.95 }));
        E.outlineFill = new THREE.Mesh(new THREE.BoxGeometry(1.004, 1.004, 1.004), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
        E.outline.add(E.outlineFill); E.outline.add(E.outlineEdge);
        E.outline.visible = false; E.scene.add(E.outline);
        E.pop = 0;

        const cc = document.createElement('canvas'); cc.width = 160; cc.height = 16;
        const cg = cc.getContext('2d'); let seed = 7;
        const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        for (let st = 0; st < 10; st++) {
            const branches = 2 + st;
            for (let b = 0; b < branches; b++) {
                let x = st * 16 + 8, y = 8, ang = (b / branches) * Math.PI * 2 + rnd() * 0.4;
                for (let step = 0; step < 3 + st * 0.8; step++) {
                    x += Math.cos(ang + (rnd() - 0.5) * 1.1) * 2;
                    y += Math.sin(ang + (rnd() - 0.5) * 1.1) * 2;
                    cg.fillStyle = 'rgba(10,10,12,' + (0.5 + st * 0.04) + ')';
                    cg.fillRect(Math.max(st * 16, Math.min(st * 16 + 15, x | 0)), Math.max(0, Math.min(15, y | 0)), 1, 1);
                }
            }
        }
        const ct = new THREE.CanvasTexture(cc); ct.magFilter = THREE.NearestFilter; ct.minFilter = THREE.NearestFilter; ct.generateMipmaps = false;
        ct.repeat.set(0.1, 1); ct.wrapS = THREE.ClampToEdgeWrapping;
        E.crackTex = ct;
        E.crack = new THREE.Mesh(new THREE.BoxGeometry(1.006, 1.006, 1.006), new THREE.MeshBasicMaterial({ map: ct, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
        E.crack.visible = false; E.scene.add(E.crack);

        E.ghost = new THREE.Group();
        E.ghostFill = new THREE.Mesh(new THREE.BoxGeometry(0.985, 0.985, 0.985), new THREE.MeshBasicMaterial({ color: 0x66ffcc, transparent: true, opacity: 0.22, depthWrite: false }));
        E.ghostEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.88 }));
        E.ghost.add(E.ghostFill); E.ghost.add(E.ghostEdge); E.ghost.visible = false; E.scene.add(E.ghost);

        E.hand = new THREE.Group(); E.hand.renderOrder = 999; E.camera.add(E.hand);
        E.setHand(null);

        E.playerModel = buildPlayerModel();
        E.playerModel.visible = false;
        E.scene.add(E.playerModel);

        // Stars (used both in Overworld Night & always-bright in Cosmos!)
        const sp = [], sc = [];
        for (let i = 0; i < 850; i++) {
            const a = Math.random() * Math.PI * 2, b = Math.acos(Math.random() * 1.92 - 0.92), R = 275;
            sp.push(Math.cos(a) * Math.sin(b) * R, Math.cos(b) * R, Math.sin(a) * Math.sin(b) * R);
            const tint = Math.random();
            sc.push(tint > 0.72 ? 0.78 : 1, tint > 0.42 ? 0.92 : 1, tint < 0.3 ? 0.85 : 1);
        }
        const sg = new THREE.BufferGeometry();
        sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
        sg.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
        E.stars = new THREE.Points(sg, new THREE.PointsMaterial({ vertexColors: true, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false }));
        E.scene.add(E.stars);

        function makeCelestial(isSun) {
            const cv = document.createElement('canvas'); cv.width = cv.height = 32;
            const g = cv.getContext('2d');
            if (isSun) {
                g.fillStyle = 'rgba(255,224,130,0.22)'; g.fillRect(2, 2, 28, 28);
                g.fillStyle = 'rgba(255,238,160,0.45)'; g.fillRect(6, 6, 20, 20);
                g.fillStyle = '#fff9d6'; g.fillRect(9, 9, 14, 14);
                g.fillStyle = '#ffffff'; g.fillRect(11, 11, 10, 10);
            } else {
                g.fillStyle = 'rgba(180,210,255,0.2)'; g.fillRect(5, 5, 22, 22);
                g.fillStyle = '#e5eeff'; g.fillRect(9, 9, 14, 14);
                g.fillStyle = '#bccce8'; g.fillRect(11, 11, 4, 3); g.fillRect(17, 16, 4, 4); g.fillRect(12, 18, 3, 2);
            }
            const t = new THREE.CanvasTexture(cv); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
            const m = new THREE.Mesh(new THREE.PlaneGeometry(isSun ? 48 : 34, isSun ? 48 : 34), new THREE.MeshBasicMaterial({ map: t, transparent: true, fog: false, depthWrite: false }));
            m.renderOrder = -2; E.scene.add(m); return m;
        }
        E.sun = makeCelestial(true);
        E.moon = makeCelestial(false);

        window.addEventListener('resize', () => E.resize());
        E.rebuildAllChunks();
    };

    /* ---------- 3D Voxel Extruded Tool & Mini-Block Builder ---------- */
    function extrudeIcon3D(canvasIcon) {
        const ctx = canvasIcon.getContext('2d'), w = canvasIcon.width, h = canvasIcon.height;
        const img = ctx.getImageData(0, 0, w, h).data;
        const pos = [], col = [], idx = [];
        let n = 0;
        const sc = 0.024, depth = 0.026;
        const occP = (x, y) => (x >= 0 && x < w && y >= 0 && y < h && img[(y * w + x) * 4 + 3] > 120);
        const addFace = (verts, r, g, b, sh) => {
            const base = n;
            for (let i = 0; i < 4; i++) { pos.push(verts[i][0], verts[i][1], verts[i][2]); col.push(r * sh, g * sh, b * sh); }
            idx.push(base, base + 1, base + 2, base, base + 2, base + 3); n += 4;
        };
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            if (!occP(x, y)) continue;
            const o = (y * w + x) * 4, r = img[o] / 255, g = img[o + 1] / 255, b = img[o + 2] / 255;
            const x0 = (x - w / 2) * sc, x1 = x0 + sc, y1 = (h / 2 - y) * sc, y0 = y1 - sc, z0 = -depth / 2, z1 = depth / 2;
            addFace([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], r, g, b, 1.0);
            addFace([[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], r, g, b, 0.85);
            if (!occP(x - 1, y)) addFace([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], r, g, b, 0.72);
            if (!occP(x + 1, y)) addFace([[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], r, g, b, 0.8);
            if (!occP(x, y - 1)) addFace([[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], r, g, b, 0.95);
            if (!occP(x, y + 1)) addFace([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], r, g, b, 0.6);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
        geo.setIndex(idx);
        return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, depthTest: false, fog: false }));
    }

    function makeMiniBlock3D(id) {
        const df = DEF[id], pos = [], col = [], uv = [], idx = [];
        let n = 0; const s = 0.11;
        for (let f = 0; f < 6; f++) {
            const F = FACES[f], [tx, ty] = tileUV(df[F.k]), base = n;
            for (let v = 0; v < 4; v++) {
                const vv = F.v[v];
                pos.push((vv[0] - 0.5) * 2 * s, (vv[1] - 0.5) * 2 * s, (vv[2] - 0.5) * 2 * s);
                col.push(F.s, F.s, F.s);
                uv.push(tx + UVS[v][0] * TILE_UV, ty + UVS[v][1] * TILE_UV);
            }
            idx.push(base, base + 1, base + 2, base, base + 2, base + 3); n += 4;
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        g.setIndex(idx);
        return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: E.tex, vertexColors: true, transparent: !!(df.cutout || df.translucent), alphaTest: df.cutout ? 0.45 : 0, depthTest: false, fog: false }));
    }

    E.setHand = function (item) {
        const H = E.hand;
        while (H.children.length) {
            const m = H.children[0]; H.remove(m);
            m.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
        }
        const I = window.CVI, grp = new THREE.Group();
        let base;
        if (I && I.isTool(item)) {
            grp.add(extrudeIcon3D(I.icon(item)));
            base = { p: [0.34, -0.26, -0.56], r: [0.18, -0.68, -0.15] };
        } else if (I && I.isBlock(item) && (item === B.TORCH || item === B.SOUL_TORCH)) {
            const stick = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.24, 0.045), new THREE.MeshBasicMaterial({ color: 0x8a5a2c, depthTest: false, fog: false }));
            const tip = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.065, 0.056), new THREE.MeshBasicMaterial({ color: item === B.SOUL_TORCH ? 0x22d3ee : 0xffd24d, depthTest: false, fog: false }));
            tip.position.y = 0.14; grp.add(stick); grp.add(tip);
            base = { p: [0.34, -0.26, -0.52], r: [0.22, -0.25, 0.1] };
        } else if (I && I.isBlock(item)) {
            grp.add(makeMiniBlock3D(item));
            base = { p: [0.33, -0.27, -0.56], r: [0.18, 0.65, -0.05] };
        } else {
            const arm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.36), new THREE.MeshBasicMaterial({ color: 0xe8b98a, depthTest: false, fog: false }));
            const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.125, 0.2), new THREE.MeshBasicMaterial({ color: 0x0ea5e9, depthTest: false, fog: false }));
            sleeve.position.z = 0.12; grp.add(arm); grp.add(sleeve);
            base = { p: [0.32, -0.27, -0.48], r: [0.15, -0.22, 0.08] };
        }
        grp.traverse(o => { o.renderOrder = 999; o.frustumCulled = false; });
        H.add(grp); E.handBase = base; E.equipT = 1;
        if (E.playerModel) E.updatePlayerHeldItem(item);
    };

    E.handBob = 0; E.equipT = 0;
    E.updateHand = function (dt, swing, moving) {
        E.hand.visible = (E.camMode === 0);
        if (!E.handBase || !E.hand.visible) return;
        if (moving) E.handBob += dt * 9.5;
        if (E.equipT > 0) E.equipT = Math.max(0, E.equipT - dt * 5.0);
        const s = Math.sin(swing * Math.PI), b = E.handBase, amp = moving ? 1 : 0;
        const bx = Math.sin(E.handBob) * 0.015 * amp, by = Math.abs(Math.cos(E.handBob)) * 0.014 * amp;
        const eq = E.equipT * E.equipT;
        E.hand.position.set(b.p[0] + bx - s * 0.11, b.p[1] - by - s * 0.05 - eq * 0.22, b.p[2] - s * 0.14);
        E.hand.rotation.set(b.r[0] - s * 0.95 - eq * 0.4, b.r[1] + s * 0.35, b.r[2] + s * 0.42);
    };

    /* ---------- 3rd-Person Player Character Model ---------- */
    function buildPlayerModel() {
        const g = new THREE.Group();
        const mk = (w, h, d, col, x, y, z, pivY) => {
            const grp = new THREE.Group();
            const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: col }));
            if (pivY) m.position.y = -h / 2;
            grp.add(m); grp.position.set(x, y, z); return grp;
        };
        const fc = document.createElement('canvas'); fc.width = 8; fc.height = 8;
        const fg = fc.getContext('2d');
        fg.fillStyle = '#e8b98a'; fg.fillRect(0, 0, 8, 8);
        fg.fillStyle = '#1b1d24'; fg.fillRect(0, 0, 8, 2); fg.fillRect(0, 2, 1, 2); fg.fillRect(7, 2, 1, 2);
        fg.fillStyle = '#ffffff'; fg.fillRect(1, 4, 2, 1); fg.fillRect(5, 4, 2, 1);
        fg.fillStyle = '#0ea5e9'; fg.fillRect(2, 4, 1, 1); fg.fillRect(5, 4, 1, 1);
        fg.fillStyle = '#c48660'; fg.fillRect(3, 6, 2, 1);
        const fTex = new THREE.CanvasTexture(fc); fTex.magFilter = THREE.NearestFilter; fTex.minFilter = THREE.NearestFilter;
        const head = new THREE.Group(); head.position.set(0, 1.44, 0);
        const skinM = new THREE.MeshBasicMaterial({ color: 0xe8b98a }), hairM = new THREE.MeshBasicMaterial({ color: 0x1b1d24 });
        const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.46), [skinM, skinM, hairM, skinM, new THREE.MeshBasicMaterial({ map: fTex }), hairM]);
        headMesh.position.y = 0.23; head.add(headMesh); g.add(head);

        const body = mk(0.48, 0.70, 0.26, 0x0ea5e9, 0, 1.07, 0);
        body.add(mk(0.18, 0.18, 0.04, 0x38bdf8, 0, 0.10, 0.13));
        body.add(mk(0.42, 0.48, 0.14, 0x1e293b, 0, 0.04, -0.18));
        g.add(body);

        const armL = mk(0.19, 0.66, 0.19, 0x0ea5e9, -0.34, 1.38, 0, true); armL.add(mk(0.19, 0.22, 0.19, 0xe8b98a, 0, -0.55, 0)); g.add(armL);
        const armR = mk(0.19, 0.66, 0.19, 0x0ea5e9, 0.34, 1.38, 0, true); armR.add(mk(0.19, 0.22, 0.19, 0xe8b98a, 0, -0.55, 0));
        const handSlot = new THREE.Group(); handSlot.position.set(0, -0.58, 0.16); armR.add(handSlot); g.add(armR);

        const legL = mk(0.21, 0.68, 0.21, 0x26324d, -0.12, 0.70, 0, true); legL.add(mk(0.22, 0.15, 0.23, 0x111827, 0, -0.61, 0.01)); g.add(legL);
        const legR = mk(0.21, 0.68, 0.21, 0x26324d, 0.12, 0.70, 0, true); legR.add(mk(0.22, 0.15, 0.23, 0x111827, 0, -0.61, 0.01)); g.add(legR);

        g.userData = { head, armL, armR, legL, legR, handSlot, walkPhase: 0 };
        return g;
    }

    E.updatePlayerHeldItem = function (item) {
        const slot = E.playerModel && E.playerModel.userData.handSlot; if (!slot) return;
        while (slot.children.length) { const c = slot.children[0]; slot.remove(c); c.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); }
        const I = window.CVI; if (!I || item === null || item === undefined) return;
        let mesh = null;
        if (I.isTool(item)) { mesh = extrudeIcon3D(I.icon(item)); mesh.scale.setScalar(1.35); mesh.rotation.set(0.3, Math.PI / 2, 0); mesh.position.set(0, 0.05, 0.16); }
        else if (I.isBlock(item)) { mesh = makeMiniBlock3D(item); mesh.scale.setScalar(1.25); mesh.position.set(0, 0, 0.08); }
        if (mesh) { mesh.traverse(o => { if (o.material) o.material.depthTest = true; }); slot.add(mesh); }
    };

    E.updatePlayerModel = function (pos, yaw, pitch, speed, swing, dt) {
        const pm = E.playerModel; if (!pm) return;
        pm.visible = (E.camMode > 0);
        if (!pm.visible) return;
        pm.position.set(pos.x, pos.y, pos.z);
        pm.rotation.y = yaw + Math.PI;
        const u = pm.userData;
        u.head.rotation.x = -pitch * 0.85;
        if (speed > 0.3) u.walkPhase += dt * speed * 2.1; else u.walkPhase *= 0.85;
        const sw = speed > 0.3 ? Math.sin(u.walkPhase) * 0.72 : 0;
        u.legL.rotation.x = sw; u.legR.rotation.x = -sw;
        u.armL.rotation.x = -sw * 0.8;
        u.armR.rotation.x = swing > 0 ? (-1.45 * Math.sin(swing * Math.PI)) : sw * 0.8;
    };

    /* ---------- Target Outline, Crack, Ghost, Raycast ---------- */
    E.setOutline = function (t, dt) {
        if (!t) { E.outline.visible = false; E.lastT = null; return; }
        const k = t.x + ',' + t.y + ',' + t.z;
        if (k !== E.lastT) { E.lastT = k; E.pop = 1; }
        if (E.pop > 0) E.pop = Math.max(0, E.pop - (dt || 0.016) * 8);
        const info = W.infoMap.has(k);
        E.outline.visible = true;
        E.outline.position.set(t.x + 0.5, t.y + 0.5, t.z + 0.5);
        E.outline.scale.setScalar(1 + E.pop * 0.032);
        E.outlineEdge.material.color.setHex(info ? 0x38f2e6 : 0xffffff);
        E.outlineFill.material.color.setHex(info ? 0x38f2e6 : 0xffffff);
        E.outlineFill.material.opacity = info ? 0.14 : 0.06;
    };
    E.setCrack = function (x, y, z, st) {
        if (st < 0) { E.crack.visible = false; return; }
        E.crack.visible = true; E.crack.position.set(x + 0.5, y + 0.5, z + 0.5);
        E.crackTex.offset.x = Math.min(9, st) * 0.1;
    };
    E.setGhost = function (x, y, z, air, dt) {
        if (x === null) { E.ghost.visible = false; return; }
        E.ghost.visible = true; E.ghost.position.set(x + 0.5, y + 0.5, z + 0.5);
        E.ghostT = (E.ghostT || 0) + (dt || 0.016) * 4;
        const p = Math.sin(E.ghostT) * 0.5 + 0.5;
        E.ghostFill.material.color.setHex(air ? 0x38bdf8 : 0x4ade80);
        E.ghostFill.material.opacity = (air ? 0.16 : 0.12) + p * 0.09;
    };
    E.setFov = function (f) { if (Math.abs(E.camera.fov - f) > 0.05) { E.camera.fov = f; E.camera.updateProjectionMatrix(); } };
    E.setFogDist = function (far) {
        E.fogDist = far;
        E.uFogFar.value = far;
        E.uFogNear.value = Math.max(24, far * 0.50);
        E.scene.fog.near = E.uFogNear.value;
        E.scene.fog.far = far;
    };
    E.resize = function () { E.camera.aspect = window.innerWidth / window.innerHeight; E.camera.updateProjectionMatrix(); E.renderer.setSize(window.innerWidth, window.innerHeight); };

    /* ---------- Multi-Dimension Sky, Sun/Moon/Stars & Lighting Uniforms ---------- */
    const _c1 = new THREE.Color(), _c2 = new THREE.Color(), _c3 = new THREE.Color();
    E.updateSky = function (camPos, heldEmit) {
        const dim = W.dim || 'overworld';
        E.skyDome.position.copy(camPos);
        E.stars.position.copy(camPos);
        if (E.cosmosProps && E.cosmosProps.visible) {
            E.cosmosProps.position.copy(camPos);
            E.cosmosProps.userData.pGrp.rotation.y += 0.0015;
        }
        E.uPlayerLightPos.value.copy(camPos);
        E.uPlayerLightStr.value = heldEmit ? Math.min(1.0, heldEmit / 14) : 0;

        if (dim === 'nether') {
            E.skyUniforms.uNebula.value = 0;
            E.skyUniforms.uTop.value.setHex(0x28080a);
            E.skyUniforms.uHorizon.value.setHex(0x5c1812);
            E.skyUniforms.uGlow.value.setHex(0xff5514);
            E.skyUniforms.uGlowAmt.value = 0.65;
            E.uSkyColor.value.setHex(0x5c1812);
            E.uSunColor.value.setHex(0xffb48a);
            E.uAmbientColor.value.setHex(0x7a3428);
            E.uFogColor.value.setHex(0x47120e);
            E.scene.fog.color.copy(E.uFogColor.value);
            E.scene.background.copy(E.uFogColor.value);
            E.uSunLevel.value = 0.72;
            E.uFogNear.value = 26; E.uFogFar.value = Math.min(E.fogDist, 98);
            E.stars.material.opacity = 0;
            E.dayFactor = 0.45; E.isNight = false;
            return;
        }

        if (dim === 'dungeon') {
            E.skyUniforms.uNebula.value = 0;
            E.skyUniforms.uTop.value.setHex(0x070c14);
            E.skyUniforms.uHorizon.value.setHex(0x101c28);
            E.skyUniforms.uGlowAmt.value = 0;
            E.uSkyColor.value.setHex(0x101c28);
            E.uSunColor.value.setHex(0x9ec5dc);
            E.uAmbientColor.value.setHex(0x456078);
            E.uFogColor.value.setHex(0x0c1520);
            E.scene.fog.color.copy(E.uFogColor.value);
            E.scene.background.copy(E.uFogColor.value);
            E.uSunLevel.value = 0.55;
            E.uFogNear.value = 18; E.uFogFar.value = 76;
            E.stars.material.opacity = 0;
            E.dayFactor = 0.35; E.isNight = true;
            return;
        }

        if (dim === 'cosmos') {
            E.skyUniforms.uNebula.value = 1;
            E.skyUniforms.uTop.value.setHex(0x060414);
            E.skyUniforms.uHorizon.value.setHex(0x140a2a);
            E.skyUniforms.uGlowAmt.value = 0;
            E.uSkyColor.value.setHex(0x1e133d);
            E.uSunColor.value.setHex(0xe9d5ff);
            E.uAmbientColor.value.setHex(0x7c69b8);
            E.uFogColor.value.setHex(0x110a24);
            E.scene.fog.color.copy(E.uFogColor.value);
            E.scene.background.copy(E.uFogColor.value);
            E.uSunLevel.value = 0.88;
            E.uFogNear.value = 60; E.uFogFar.value = Math.max(E.fogDist, 165);
            E.stars.material.opacity = 0.96;
            E.dayFactor = 0.65; E.isNight = true;
            return;
        }

        if (dim === 'aether') {
            E.skyUniforms.uNebula.value = 0;
            E.skyUniforms.uTop.value.setHex(0x2890e8);
            E.skyUniforms.uHorizon.value.setHex(0xd8f4ff);
            E.skyUniforms.uGlow.value.setHex(0xffe699);
            E.skyUniforms.uGlowAmt.value = 0.42;
            E.uSkyColor.value.setHex(0xa6e3ff);
            E.uSunColor.value.setHex(0xfffbe6);
            E.uAmbientColor.value.setHex(0x9ed4f5);
            E.uFogColor.value.setHex(0xcceeff);
            E.scene.fog.color.copy(E.uFogColor.value);
            E.scene.background.copy(E.uFogColor.value);
            E.uSunLevel.value = 1.05;
            E.uFogNear.value = 72; E.uFogFar.value = Math.max(E.fogDist, 165);
            E.stars.material.opacity = 0;
            E.sun.position.set(camPos.x + 80, camPos.y + 150, camPos.z - 120); E.sun.lookAt(camPos);
            E.uSunDir.value.set(0.38, 0.72, -0.58).normalize();
            E.dayFactor = 1.0; E.isNight = false;
            return;
        }

        // Default: Overworld dynamic Day/Night/Sunset/Rain
        E.skyUniforms.uNebula.value = 0;
        E.uFogNear.value = Math.max(24, E.fogDist * 0.50);
        E.uFogFar.value = E.fogDist;
        const a = E.time * Math.PI * 2;
        const sunH = Math.sin(a), sunX = Math.cos(a), R = 240;
        E.sun.position.set(camPos.x + sunX * R, camPos.y + sunH * R, camPos.z - 55); E.sun.lookAt(camPos);
        E.moon.position.set(camPos.x - sunX * R, camPos.y - sunH * R, camPos.z + 55); E.moon.lookAt(camPos);
        E.uSunDir.value.set(sunX, sunH, -0.22).normalize();

        const day = Math.max(0, Math.min(1, (sunH + 0.14) * 2.5));
        const dusk = Math.max(0, 1 - Math.abs(sunH) * 4.5);
        const rain = E.rainAmt || 0;

        _c1.setHex(0x081022).lerp(_c2.setHex(0x2d7ce0), day).lerp(_c3.setHex(0x475569), rain * 0.58);
        E.skyUniforms.uTop.value.copy(_c1);
        _c1.setHex(0x14203b).lerp(_c2.setHex(0xa8ddff), day).lerp(_c3.setHex(0xff924c), dusk * 0.65 * (1 - rain * 0.6)).lerp(_c3.setHex(0x64748b), rain * 0.52);
        E.skyUniforms.uHorizon.value.copy(_c1);
        E.skyUniforms.uGlowAmt.value = dusk * (1 - rain * 0.7);

        E.uSkyColor.value.copy(_c1);
        E.uFogColor.value.copy(_c1);
        E.scene.fog.color.copy(_c1);
        E.scene.background.copy(_c1);
        E.uSunColor.value.setHex(0x9bb5e8).lerp(_c2.setHex(0xfff8e7), day).lerp(_c3.setHex(0xffc999), dusk * 0.55);
        E.uAmbientColor.value.setHex(0x3a4d78).lerp(_c2.setHex(0x88b3e0), day);
        E.uSunLevel.value = (0.20 + day * 0.85) * (1 - rain * 0.25);
        E.uRain.value = rain;
        E.stars.material.opacity = Math.max(0, (-sunH - 0.04) * 2.6) * (1 - rain * 0.85);
        E.isNight = sunH < -0.04;
        E.dayFactor = day;
    };

    E.timeLabel = function () {
        if (W.dim !== 'overworld') return W.dimMeta.name;
        const h = ((E.time * 24 + 6) % 24);
        const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
        return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
    };

    /* ---------- DDA Voxel Raycast ---------- */
    E.raycast = function (o, d, maxD) {
        let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
        const sx = d.x > 0 ? 1 : -1, sy = d.y > 0 ? 1 : -1, sz = d.z > 0 ? 1 : -1;
        const tdx = Math.abs(1 / (d.x || 1e-9)), tdy = Math.abs(1 / (d.y || 1e-9)), tdz = Math.abs(1 / (d.z || 1e-9));
        let tmx = ((sx > 0 ? x + 1 - o.x : o.x - x)) * tdx;
        let tmy = ((sy > 0 ? y + 1 - o.y : o.y - y)) * tdy;
        let tmz = ((sz > 0 ? z + 1 - o.z : o.z - z)) * tdz;
        let nx = 0, ny = 0, nz = 0, dist = 0;
        for (let i = 0; i < 64; i++) {
            const id = W.get(x, y, z);
            if (id && !DEF[id].liquid) return { x, y, z, nx, ny, nz, id, dist };
            if (tmx < tmy && tmx < tmz) { dist = tmx; tmx += tdx; x += sx; nx = -sx; ny = nz = 0; }
            else if (tmy < tmz) { dist = tmy; tmy += tdy; y += sy; ny = -sy; nx = nz = 0; }
            else { dist = tmz; tmz += tdz; z += sz; nz = -sz; nx = ny = 0; }
            if (dist > maxD) break;
        }
        return null;
    };

    E.setBlock = function (x, y, z, id) {
        if (!W.inb(x, y, z)) return;
        const old = W.get(x, y, z);
        if (old === id) return;
        W.set(x, y, z, id);
        W.relightAround(x, y, z, 15);
        const minCx = Math.floor((x - 15 + W.OX) / CS), maxCx = Math.floor((x + 15 + W.OX) / CS);
        const minCz = Math.floor((z - 15 + W.OZ) / CS), maxCz = Math.floor((z + 15 + W.OZ) / CS);
        for (let cz = minCz; cz <= maxCz; cz++) for (let cx = minCx; cx <= maxCx; cx++) E.dirty.add(cx + ',' + cz);
        E.markDirty(x, z);
        if (id === B.TORCH || id === B.SOUL_TORCH) W.emitters.torches.push([x + 0.5, y + 0.72, z + 0.5, id === B.SOUL_TORCH ? 1 : 0]);
    };

    E.advance = function (dt) {
        E.uTime.value += dt;
        E.time = (E.time + dt / E.dayLen * (E.fastTime ? 14 : 1)) % 1;
    };
})();
