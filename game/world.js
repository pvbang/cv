/* CV World — block data, procedural texture atlas, terrain generation */
(function () {
    'use strict';

    const SX = 192, SY = 64, SZ = 192;     // world size (blocks)
    const OX = 96, OZ = 96;                // x,z logic ∈ [-96,96) -> index = +OX/OZ
    const WATER = 7;                       // water level
    const BASE = 10;                       // ground height for structures

    /* ---------- Block registry ---------- */
    const B = {
        AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, SAND: 4, LOG: 5, LEAVES: 6, PLANKS: 7, GLASS: 8,
        BRICK: 9, WATER: 10, COBBLE: 11, GLOW: 12, SNOW: 13, QUARTZ: 14, GOLD: 15, OBSIDIAN: 16,
        BOOKS: 17, INFO: 18, C_CYAN: 19, C_GREEN: 20, C_ORANGE: 21, C_PURPLE: 22, C_BLUE: 23,
        C_PINK: 24, STONEBRICK: 25, DIAMOND: 26, WOOL_W: 27, WOOL_R: 28, LAMP: 29, GRAVEL: 30,
        C_YELLOW: 31, C_RED: 32, C_BLACK: 33,
        SANDSTONE: 34, CACTUS: 35, COAL: 36, IRON: 37, MOSSY: 38, TALLGRASS: 39, FLOWER_R: 40, FLOWER_Y: 41, SPRUCE: 42
    };

    // [top, side, bottom] tile index + flags
    const DEF = {};
    function def(id, name, tiles, o) {
        const t = tiles.length === 1 ? [tiles[0], tiles[0], tiles[0]] : tiles;
        DEF[id] = Object.assign({ name, top: t[0], side: t[1], bottom: t[2], solid: true, opaque: true, place: true }, o || {});
    }
    def(B.GRASS, 'Grass', [0, 1, 2]);
    def(B.DIRT, 'Dirt', [2]);
    def(B.STONE, 'Stone', [3]);
    def(B.SAND, 'Sand', [4]);
    def(B.LOG, 'Oak Log', [6, 5, 6]);
    def(B.LEAVES, 'Leaves', [7], { opaque: false, cutout: true, sway: true });
    def(B.PLANKS, 'Planks', [8]);
    def(B.GLASS, 'Glass', [9], { opaque: false, cutout: true });
    def(B.BRICK, 'Bricks', [10]);
    def(B.WATER, 'Water', [11], { solid: false, opaque: false, liquid: true, place: false });
    def(B.COBBLE, 'Cobblestone', [12]);
    def(B.GLOW, 'Glowstone', [13], { light: true });
    def(B.SNOW, 'Snow', [14]);
    def(B.QUARTZ, 'Quartz', [15]);
    def(B.GOLD, 'Gold Block', [16]);
    def(B.OBSIDIAN, 'Obsidian', [17]);
    def(B.BOOKS, 'Bookshelf', [8, 18, 8]);
    def(B.INFO, 'Info Block', [19], { light: true, place: false });
    def(B.C_CYAN, 'Cyan Concrete', [20]);
    def(B.C_GREEN, 'Green Concrete', [21]);
    def(B.C_ORANGE, 'Orange Concrete', [22]);
    def(B.C_PURPLE, 'Purple Concrete', [23]);
    def(B.C_BLUE, 'Blue Concrete', [24]);
    def(B.C_PINK, 'Pink Concrete', [25]);
    def(B.STONEBRICK, 'Stone Bricks', [26]);
    def(B.DIAMOND, 'Diamond Ore', [28]);
    def(B.WOOL_W, 'White Wool', [29]);
    def(B.WOOL_R, 'Red Wool', [30]);
    def(B.LAMP, 'Lamp', [32], { light: true });
    def(B.GRAVEL, 'Gravel', [33]);
    def(B.C_YELLOW, 'Yellow Concrete', [35]);
    def(B.C_RED, 'Red Concrete', [36]);
    def(B.C_BLACK, 'Black Concrete', [37]);
    def(B.SANDSTONE, 'Sandstone', [38]);
    def(B.CACTUS, 'Cactus', [40, 39, 40], { opaque: false });
    def(B.COAL, 'Coal Ore', [41]);
    def(B.IRON, 'Iron Ore', [42]);
    def(B.MOSSY, 'Mossy Cobblestone', [43]);
    def(B.TALLGRASS, 'Tall Grass', [44], { solid: false, opaque: false, cross: true, place: false });
    def(B.FLOWER_R, 'Poppy', [45], { solid: false, opaque: false, cross: true });
    def(B.FLOWER_Y, 'Dandelion', [46], { solid: false, opaque: false, cross: true });
    def(B.SPRUCE, 'Spruce Leaves', [47], { opaque: false, cutout: true, sway: true });
    DEF[B.AIR] = { name: 'Air', solid: false, opaque: false };

    const CONCRETE_BY_NAME = { cyan: B.C_CYAN, green: B.C_GREEN, orange: B.C_ORANGE, purple: B.C_PURPLE, blue: B.C_BLUE, pink: B.C_PINK, yellow: B.C_YELLOW, red: B.C_RED };
    const CONCRETE_LIST = [B.C_CYAN, B.C_GREEN, B.C_ORANGE, B.C_PURPLE, B.C_BLUE, B.C_PINK, B.C_YELLOW, B.C_RED];

    /* ---------- RNG / noise ---------- */
    function mulberry32(a) {
        return function () {
            a |= 0; a = a + 0x6D2B79F5 | 0;
            let t = Math.imul(a ^ a >>> 15, 1 | a);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }
    function hash2(x, z, seed) {
        let h = (x * 374761393 + z * 668265263 + seed * 69069) | 0;
        h = (h ^ (h >>> 13)) * 1274126177 | 0;
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    }
    function smooth(t) { return t * t * (3 - 2 * t); }
    function vnoise(x, z, seed) {
        const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
        const a = hash2(xi, zi, seed), b = hash2(xi + 1, zi, seed), c = hash2(xi, zi + 1, seed), d = hash2(xi + 1, zi + 1, seed);
        const u = smooth(xf), v = smooth(zf);
        return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    }
    function hash3(x, y, z, seed) {
        let h = (x * 374761393 + y * 1274126177 + z * 668265263 + seed * 69069) | 0;
        h = (h ^ (h >>> 13)) * 1274126177 | 0;
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    }
    function vnoise3(x, y, z, seed) {
        const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
        const u = smooth(x - xi), v = smooth(y - yi), w = smooth(z - zi);
        const L = (a, b, t) => a + (b - a) * t;
        return L(
            L(L(hash3(xi, yi, zi, seed), hash3(xi + 1, yi, zi, seed), u), L(hash3(xi, yi + 1, zi, seed), hash3(xi + 1, yi + 1, zi, seed), u), v),
            L(L(hash3(xi, yi, zi + 1, seed), hash3(xi + 1, yi, zi + 1, seed), u), L(hash3(xi, yi + 1, zi + 1, seed), hash3(xi + 1, yi + 1, zi + 1, seed), u), v), w);
    }
    function fbm(x, z, seed) {
        return vnoise(x * 0.05, z * 0.05, seed) * 0.55 + vnoise(x * 0.11, z * 0.11, seed + 7) * 0.3 + vnoise(x * 0.25, z * 0.25, seed + 13) * 0.15;
    }

    /* ---------- Texture atlas (procedural pixel art) ---------- */
    const TILE = 16, COLS = 8;
    function buildAtlas() {
        const cv = document.createElement('canvas');
        cv.width = cv.height = TILE * COLS;
        const g = cv.getContext('2d');
        const rnd = mulberry32(1337);
        function px(t, x, y, c) { g.fillStyle = c; g.fillRect((t % COLS) * TILE + x, Math.floor(t / COLS) * TILE + y, 1, 1); }
        function shade(hex, f) {
            const r = Math.max(0, Math.min(255, ((hex >> 16) & 255) * f | 0)), gg = Math.max(0, Math.min(255, ((hex >> 8) & 255) * f | 0)), b = Math.max(0, Math.min(255, (hex & 255) * f | 0));
            return 'rgb(' + r + ',' + gg + ',' + b + ')';
        }
        function noisy(t, base, v, fn) {
            for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
                let f = 1 + (rnd() - 0.5) * v;
                if (fn) { const r = fn(x, y); if (r === false) continue; if (typeof r === 'number') f *= r; }
                px(t, x, y, shade(base, f));
            }
        }
        function clear(t) { g.clearRect((t % COLS) * TILE, Math.floor(t / COLS) * TILE, TILE, TILE); }

        noisy(0, 0x5fa83a, 0.28);                                   // grass top
        noisy(2, 0x86592d, 0.3);                                    // dirt
        noisy(1, 0x86592d, 0.3);                                    // grass side
        for (let x = 0; x < TILE; x++) { const h = 3 + (rnd() * 3 | 0); for (let y = 0; y < h; y++) px(1, x, y, shade(0x5fa83a, 1 + (rnd() - 0.5) * 0.3)); }
        noisy(3, 0x7d7d7d, 0.22, (x, y) => ((x * 7 + y * 13) % 11 === 0 ? 0.82 : 1));       // stone
        noisy(4, 0xdcd09a, 0.12);                                   // sand
        noisy(5, 0x6b5030, 0.2, (x) => (x % 4 === 1 ? 0.8 : 1));   // log side
        noisy(6, 0xa5864f, 0.12, (x, y) => { const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); return (d | 0) % 3 === 0 ? 0.85 : 1; });
        clear(7); for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) if (rnd() > 0.16) px(7, x, y, shade(0x3f8a2a, 0.7 + rnd() * 0.5));   // leaves
        noisy(8, 0xb08850, 0.1, (x, y) => (y % 8 === 7 ? 0.7 : (x === 0 && y > 7 ? 0.85 : 1)));   // planks
        clear(9); for (let i = 0; i < TILE; i++) { px(9, i, 0, 'rgba(200,235,255,.9)'); px(9, i, 15, 'rgba(200,235,255,.9)'); px(9, 0, i, 'rgba(200,235,255,.9)'); px(9, 15, i, 'rgba(200,235,255,.9)'); }
        px(9, 3, 3, 'rgba(255,255,255,.8)'); px(9, 4, 4, 'rgba(255,255,255,.8)'); px(9, 5, 5, 'rgba(255,255,255,.6)'); px(9, 3, 4, 'rgba(255,255,255,.5)');
        noisy(10, 0x9b4a3a, 0.14, (x, y) => ((y % 4 === 3) || ((x + (y >> 2) * 4) % 8 === 7) ? 0.62 : 1));  // brick
        noisy(11, 0x2d6fdc, 0.12, (x, y) => ((x + y) % 5 === 0 ? 1.15 : 1));          // water
        noisy(12, 0x6e6e6e, 0.3, (x, y) => (((x >> 2) + (y >> 2)) % 2 ? 0.8 : 1.05)); // cobble
        noisy(13, 0xf3c95c, 0.35, (x, y) => ((x * 3 + y * 5) % 7 === 0 ? 1.3 : 1));    // glowstone
        noisy(14, 0xf4f8fb, 0.06);                                  // snow
        noisy(15, 0xeee9e0, 0.05, (x, y) => ((x === 0 || y === 0) ? 0.92 : 1));        // quartz
        noisy(16, 0xf6d54a, 0.1, (x, y) => ((x === 0 || y === 0 || x === 15 || y === 15) ? 0.82 : (x + y === 10 ? 1.25 : 1)));  // gold
        noisy(17, 0x1a1030, 0.35, (x, y) => ((x * y) % 9 === 0 ? 2 : 1));              // obsidian
        noisy(18, 0x8a6a3a, 0.08, (x, y) => {                       // bookshelf side
            if (y < 2 || y > 13 || y === 7 || y === 8) return 0.72;
            return false;
        });
        const bookCols = [0xb33, 0x36a, 0x3a5, 0xa83, 0x83a];
        for (let row = 0; row < 2; row++) for (let x = 0; x < TILE; x++) {
            const col = [0xbb3333, 0x3366aa, 0x33aa55, 0xaa8833, 0x8833aa][(x >> 1) % 5];
            for (let y = 0; y < 5; y++) { if (!(x % 2 === 1 && y === 0)) px(18, x, (row ? 9 : 2) + y, shade(col, 0.85 + rnd() * 0.3)); }
        }
        // info block: cyan glow background + letter "i"
        noisy(19, 0x0e5a78, 0.08, (x, y) => ((x < 1 || y < 1 || x > 14 || y > 14) ? 1.9 : 1));
        for (let y = 3; y < 13; y++) for (let x = 6; x < 10; x++) {
            if (y === 3 || y === 4) { if (x >= 6 && x <= 9) px(19, x, y, '#bdf6ff'); } else if (y === 5) { /* gap */ } else if (x >= 7 && x <= 9) px(19, x, y, '#bdf6ff');
        }
        px(19, 6, 3, '#4de0ff'); px(19, 6, 4, '#4de0ff');
        const conc = [0x1ab5d4, 0x2fa84a, 0xe8841c, 0x8a3fd0, 0x2f5fd0, 0xe0509a];
        conc.forEach((c, i) => noisy(20 + i, c, 0.06));
        noisy(26, 0x7a7a7a, 0.14, (x, y) => ((y % 8 === 7) || ((x + (y >> 3) * 8) % 16 === 15) ? 0.7 : 1));   // stone brick
        noisy(28, 0x7d7d7d, 0.2);                                                       // diamond ore
        [[3, 3], [4, 3], [3, 4], [10, 5], [11, 5], [10, 6], [6, 10], [7, 10], [6, 11], [12, 11], [12, 12], [11, 12]].forEach(p => px(28, p[0], p[1], '#4ff2e4'));
        noisy(29, 0xf0f0f0, 0.08);
        noisy(30, 0xc83232, 0.1);
        noisy(32, 0xffe9a8, 0.1, (x, y) => ((x < 2 || y < 2 || x > 13 || y > 13) ? 0.6 : 1.1));
        noisy(33, 0x8a8683, 0.4, (x, y) => (((x * 5 + y * 3) % 6 < 2) ? 0.7 : 1));
        noisy(35, 0xf2c81e, 0.06);
        noisy(36, 0xc83428, 0.06);
        noisy(37, 0x1c1c22, 0.08);
        noisy(38, 0xd9c98a, 0.1, (x, y) => (y % 5 === 4 ? 0.82 : 1));                  // sandstone
        noisy(39, 0x2f7d32, 0.16, (x) => (x % 5 === 0 ? 0.72 : 1));                    // cactus side
        [[2, 3], [7, 9], [12, 5], [4, 12], [10, 1], [14, 11]].forEach(p => px(39, p[0], p[1], '#e8f5d0'));
        noisy(40, 0x2f7d32, 0.12, (x, y) => ((x > 2 && x < 13 && y > 2 && y < 13) ? 1.15 : 0.8));   // cactus top
        noisy(41, 0x7d7d7d, 0.2);                                                       // coal ore
        [[3, 3], [4, 3], [4, 4], [10, 6], [11, 6], [11, 7], [10, 7], [6, 11], [7, 11], [7, 12], [12, 12]].forEach(p => px(41, p[0], p[1], '#1b1b1f'));
        noisy(42, 0x7d7d7d, 0.2);                                                       // iron ore
        [[3, 4], [4, 4], [3, 5], [9, 3], [10, 3], [10, 4], [7, 10], [8, 10], [8, 11], [12, 9], [12, 10]].forEach(p => px(42, p[0], p[1], '#d9a47a'));
        noisy(43, 0x6e6e6e, 0.3, (x, y) => (((x >> 2) + (y >> 2)) % 2 ? 0.8 : 1.05));   // mossy cobble
        for (let i = 0; i < 70; i++) px(43, rnd() * TILE | 0, rnd() * TILE | 0, shade(0x4f8a3a, 0.75 + rnd() * 0.4));
        clear(44); for (let x = 1; x < TILE; x += 2) { const h = 5 + (rnd() * 8 | 0); for (let y = TILE - h; y < TILE; y++) px(44, x, y, shade(0x5fa83a, 0.7 + rnd() * 0.5)); }   // tall grass
        clear(45); for (let y = 6; y < TILE; y++) px(45, 7, y, '#3f8a2a'); [[6, 3], [7, 3], [8, 3], [6, 4], [7, 4], [8, 4], [7, 2], [7, 5], [5, 4], [9, 4]].forEach(p => px(45, p[0], p[1], p[0] === 7 && p[1] === 4 ? '#ffd23a' : '#e0302a'));
        clear(46); for (let y = 7; y < TILE; y++) px(46, 7, y, '#3f8a2a'); [[6, 4], [7, 4], [8, 4], [6, 5], [7, 5], [8, 5], [7, 3], [7, 6]].forEach(p => px(46, p[0], p[1], '#fcd934'));
        clear(47); for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) if (rnd() > 0.12) px(47, x, y, shade(0x2d6a3c, 0.65 + rnd() * 0.5));   // spruce leaves
        return cv;
    }

    /* ---------- World data ---------- */
    const data = new Uint8Array(SX * SY * SZ);
    const heightMap = new Int16Array(SX * SZ);
    function idx(x, y, z) { return (y * SZ + (z + OZ)) * SX + (x + OX); }
    function inb(x, y, z) { return x >= -OX && x < SX - OX && z >= -OZ && z < SZ - OZ && y >= 0 && y < SY; }
    function get(x, y, z) { return inb(x, y, z) ? data[idx(x, y, z)] : (y < 0 ? B.STONE : 0); }
    function setRaw(x, y, z, id) { if (inb(x, y, z)) data[idx(x, y, z)] = id; }
    function topY(x, z) { for (let y = SY - 1; y >= 0; y--) { const b = get(x, y, z); if (b && DEF[b].solid) return y; } return 0; }

    /* ---------- Terrain ---------- */
    const BIOME = { PLAINS: 0, FOREST: 1, DESERT: 2, SNOW: 3, OCEAN: 4 };
    const biomeMap = new Uint8Array(SX * SZ);
    const sstep = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
    function biomeAt(x, z) {
        const r = Math.hypot(x, z);
        if (r < 46) return BIOME.FOREST;
        const t = vnoise(x * 0.016 + 50, z * 0.016, 101), m = vnoise(x * 0.02, z * 0.02 + 80, 202);
        if (t < 0.36) return BIOME.SNOW;
        if (t > 0.64 && m < 0.55) return BIOME.DESERT;
        if (m > 0.52) return BIOME.FOREST;
        return BIOME.PLAINS;
    }
    function terrainHeight(x, z) {
        const n = fbm(x, z, 11);
        let h = 6 + n * 14;
        // flat central area = BASE
        const d = Math.hypot(x * 0.8, z * 0.9);
        const flat = 1 - Math.min(1, Math.max(0, (d - 30) / 14));
        h = h * (1 - flat) + BASE * flat;
        // far lands: oceans, mountain ranges, rolling hills
        const r = Math.hypot(x, z), w = sstep((r - 48) / 24);
        if (w > 0) {
            let hf = 8 + n * 12 + vnoise(x * 0.12, z * 0.12, 77) * 3;
            const m3 = vnoise(x * 0.022, z * 0.022 + 500, 303);
            const bio = biomeAt(x, z);
            if (m3 > 0.56) hf += (m3 - 0.56) * (bio === BIOME.DESERT ? 45 : 105);
            const c = vnoise(x * 0.017 + 300, z * 0.017, 404);
            if (c < 0.3) hf -= (0.3 - c) * 70;
            h = h * (1 - w) + hf * w;
        }
        // secret mountain (north-west)
        const md = Math.hypot(x + 38, z + 36);
        if (md < 16) h = Math.max(h, 14 + (1 - md / 16) * 22);
        // lake (south-east)
        const ld = Math.hypot(x - 36, z - 36);
        if (ld < 9) h = Math.min(h, 5 - (1 - ld / 9) * 2);
        // moat to the south-west
        const wd = Math.hypot(x + 40, z - 22);
        if (wd < 8) h = Math.min(h, 5 - (1 - wd / 8) * 2);
        // island rim: the world is surrounded by sea
        const edge = Math.max(Math.abs(x), Math.abs(z));
        if (edge > 78) { const k = sstep((edge - 78) / 14); h = h * (1 - k) + 3 * k; }
        return Math.max(2, Math.min(SY - 10, Math.round(h)));
    }

    function generate() {
        data.fill(0);
        for (let x = -OX; x < SX - OX; x++) for (let z = -OZ; z < SZ - OZ; z++) {
            const h = terrainHeight(x, z), bio = biomeAt(x, z), r = Math.hypot(x, z);
            heightMap[(z + OZ) * SX + (x + OX)] = h;
            biomeMap[(z + OZ) * SX + (x + OX)] = h <= WATER ? BIOME.OCEAN : bio;
            const beach = h <= WATER + 1;
            // cave tubes + caverns; a noise mask lets some caves break out to the surface (natural entrances)
            const mouth = r > 52 && vnoise(x * 0.035 + 900, z * 0.035, 606) > 0.64 && h > WATER + 2;
            const top = mouth ? h : h - 4;
            for (let y = 0; y <= h; y++) {
                let b = B.STONE;
                if (y === h) {
                    if (beach) b = B.SAND;
                    else if (h > 40) b = B.SNOW;
                    else if (h > 30) b = B.STONE;
                    else b = bio === BIOME.DESERT ? B.SAND : (bio === BIOME.SNOW ? B.SNOW : B.GRASS);
                } else if (y >= h - 3) {
                    if (beach) b = B.SAND;
                    else if (h > 30) b = B.STONE;
                    else b = bio === BIOME.DESERT ? B.SANDSTONE : B.DIRT;
                } else if (y > 1) {
                    const hh = hash3(x, y, z, 31);
                    if (y < 44 && hh < 0.012) b = B.COAL;
                    else if (y < 26 && hh > 0.992) b = B.IRON;
                    else if (y < 13 && hh > 0.9975) b = B.DIAMOND;
                    else if (y < 9 && hh > 0.9955 && hh < 0.9965) b = B.GOLD;
                    else if (y < 14 && hh > 0.985 && hh < 0.988) b = B.GRAVEL;
                }
                // carve caves (never in the central build area, never the bedrock layer)
                if (y > 2 && y <= top && r > 40 && b !== B.SAND) {
                    const a1 = vnoise3(x * 0.07, y * 0.10, z * 0.07, 5), a2 = vnoise3(x * 0.07 + 100, y * 0.10, z * 0.07 + 100, 6);
                    const big = vnoise3(x * 0.045, y * 0.07, z * 0.045, 9);
                    if ((Math.abs(a1 - 0.5) < 0.05 && Math.abs(a2 - 0.5) < 0.05) || (big > 0.74 && y < h - 6)) b = B.AIR;
                }
                setRaw(x, y, z, b);
            }
            for (let y = h + 1; y <= WATER; y++) setRaw(x, y, z, B.WATER);
        }
    }

    /* ---------- Structure-building helpers ---------- */
    function box(x0, y0, z0, x1, y1, z1, id) {
        for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++)
            for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
                for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) setRaw(x, y, z, id);
    }
    function hollow(x0, y0, z0, x1, y1, z1, id) {
        for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
            if (x === x0 || x === x1 || z === z0 || z === z1 || y === y0 || y === y1) setRaw(x, y, z, id);
            else setRaw(x, y, z, B.AIR);
        }
    }
    /* flatten + lay a dirt foundation for a rectangle, clearing everything above it */
    function pad(x0, z0, x1, z1, y, top, below, clearH) {
        for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
            for (let yy = y - 6; yy < y; yy++) if (get(x, yy, z) === B.AIR || get(x, yy, z) === B.WATER) setRaw(x, yy, z, below || B.STONE);
            setRaw(x, y, z, top);
            for (let yy = y + 1; yy <= y + (clearH || 20); yy++) setRaw(x, yy, z, B.AIR);
        }
    }
    function hline(x0, z0, x1, z1, y, id, w) {
        const dx = x1 - x0, dz = z1 - z0, n = Math.max(Math.abs(dx), Math.abs(dz));
        for (let i = 0; i <= n; i++) {
            const x = Math.round(x0 + dx * i / n), z = Math.round(z0 + dz * i / n);
            for (let a = -w; a <= w; a++) for (let b = -w; b <= w; b++) {
                const xx = x + a, zz = z + b;
                if (!inb(xx, y, zz)) continue;
                // path: placed on the current ground / bridge over water
                let yy = y;
                setRaw(xx, yy, zz, id);
                for (let c = yy + 1; c <= yy + 4; c++) setRaw(xx, c, zz, B.AIR);
                for (let c = yy - 1; c >= yy - 6; c--) { const bb = get(xx, c, zz); if (bb === B.AIR || bb === B.WATER) setRaw(xx, c, zz, B.DIRT); else break; }
            }
        }
    }
    function tree(x, z, rnd) {
        const y = topY(x, z);
        if (get(x, y, z) !== B.GRASS) return false;
        const h = 4 + (rnd() * 3 | 0);
        for (let i = 1; i <= h; i++) setRaw(x, y + i, z, B.LOG);
        for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let dy = h - 1; dy <= h + 2; dy++) {
            const r = Math.abs(dx) + Math.abs(dz);
            if (dy >= h + 1 && r > 2) continue;
            if (dy === h + 2 && r > 1) continue;
            if (r > 3) continue;
            if (!(dx === 0 && dz === 0 && dy <= h) && get(x + dx, y + dy, z + dz) === B.AIR && (r < 3 || rnd() > 0.5)) setRaw(x + dx, y + dy, z + dz, B.LEAVES);
        }
        return true;
    }

    /* ---------- Info blocks (interaction points) ---------- */
    const infoMap = new Map();        // key "x,y,z" -> {type, id, label}
    const infoList = [];
    function addInfo(x, y, z, type, id, label) {
        setRaw(x, y, z, B.INFO);
        const rec = { x, y, z, type, id, label };
        infoMap.set(x + ',' + y + ',' + z, rec);
        infoList.push(rec);
        return rec;
    }

    const landmarks = {};     // id -> {x,z,y,spawnX,spawnZ}
    const signs = [];         // 3D sign: {text, x,y,z, color, size}

    function addSign(text, x, y, z, color, size) { signs.push({ text, x: x + 0.5, y, z: z + 0.5, color, size: size || 1 }); }

    /* ---------- Structures ---------- */
    function buildSpawn(CV) {
        // Central plaza
        pad(-8, -8, 8, 8, BASE, B.STONEBRICK, B.STONE, 24);
        for (let x = -8; x <= 8; x++) for (let z = -8; z <= 8; z++) if ((x + z) % 2 === 0 && Math.abs(x) < 8 && Math.abs(z) < 8) setRaw(x, BASE, z, B.QUARTZ);
        // fountain
        box(-2, BASE, -2, 2, BASE + 1, 2, B.STONEBRICK); box(-1, BASE + 1, -1, 1, BASE + 1, 1, B.WATER);
        box(0, BASE + 1, 0, 0, BASE + 4, 0, B.QUARTZ); setRaw(0, BASE + 5, 0, B.GLOW);
        // lamp posts at the 4 corners
        [[-7, -7], [7, -7], [-7, 7], [7, 7]].forEach(p => { box(p[0], BASE + 1, p[1], p[0], BASE + 4, p[1], B.COBBLE); setRaw(p[0], BASE + 5, p[1], B.LAMP); });
        // welcome gate to the south
        box(-3, BASE + 1, 8, -3, BASE + 5, 8, B.PLANKS); box(3, BASE + 1, 8, 3, BASE + 5, 8, B.PLANKS); box(-3, BASE + 6, 8, 3, BASE + 6, 8, B.PLANKS);
        addSign('WELCOME TO CV WORLD', 0, BASE + 8.2, 8, '#00d4ff', 1.5);
        addSign('Phan Van Bang  •  AI Engineer', 0, BASE + 7.0, 8, '#ffffff', 1.0);
        landmarks.spawn = { x: 0, z: 4, y: BASE + 1 };
    }

    function buildAbout(CV) {
        const cx = 0, cz = -18, W = 4;
        pad(cx - 9, cz - 9, cx + 9, cz + 9, BASE, B.STONEBRICK, B.STONE, 30);
        // 9x9 tower, 20 tall
        hollow(cx - W, BASE + 1, cz - W, cx + W, BASE + 20, cz + W, B.QUARTZ);
        box(cx - W, BASE + 1, cz - W, cx - W, BASE + 20, cz - W, B.C_CYAN); box(cx + W, BASE + 1, cz - W, cx + W, BASE + 20, cz - W, B.C_CYAN);
        box(cx - W, BASE + 1, cz + W, cx - W, BASE + 20, cz + W, B.C_CYAN); box(cx + W, BASE + 1, cz + W, cx + W, BASE + 20, cz + W, B.C_CYAN);
        // glass windows
        for (let y = BASE + 4; y <= BASE + 18; y += 4) for (let o = -2; o <= 2; o += 2) {
            box(cx + o, y, cz - W, cx + o, y + 1, cz - W, B.GLASS); box(cx + o, y, cz + W, cx + o, y + 1, cz + W, B.GLASS);
            box(cx - W, y, cz + o, cx - W, y + 1, cz + o, B.GLASS); box(cx + W, y, cz + o, cx + W, y + 1, cz + o, B.GLASS);
        }
        // floor slab
        for (let y = BASE + 7; y <= BASE + 19; y += 6) box(cx - W + 1, y, cz - W + 1, cx + W - 1, y, cz + W - 1, B.PLANKS);
        // main door facing south (+z)
        box(cx - 1, BASE + 1, cz + W, cx + 1, BASE + 3, cz + W, B.AIR);
        // roof + lights
        box(cx - W - 1, BASE + 21, cz - W - 1, cx + W + 1, BASE + 21, cz + W + 1, B.C_CYAN);
        box(cx - 1, BASE + 22, cz - 1, cx + 1, BASE + 24, cz + 1, B.QUARTZ); setRaw(cx, BASE + 25, cz, B.GLOW);
        // bookshelves + info
        box(cx - 3, BASE + 1, cz - 3, cx - 3, BASE + 2, cz + 3, B.BOOKS); box(cx + 3, BASE + 1, cz - 3, cx + 3, BASE + 2, cz + 3, B.BOOKS);
        box(cx - 1, BASE + 1, cz - 1, cx + 1, BASE + 1, cz + 1, B.GOLD);
        addInfo(cx, BASE + 2, cz, 'about', 'about', 'About Me');
        // add one "goals" info block on the upper floor
        box(cx - 1, BASE + 7, cz - 1, cx + 1, BASE + 7, cz + 1, B.GOLD);
        addInfo(cx, BASE + 8, cz, 'goals', 'goals', 'Career Goals');
        // quick climb: a ladder column made of stair blocks (spiral staircase)
        let sx = cx - 3, sz = cz - 3, sy = BASE + 1;
        const ring = [];
        for (let i = -3; i <= 3; i++) ring.push([cx + i, cz - 3]);
        for (let i = -2; i <= 3; i++) ring.push([cx + 3, cz + i]);
        for (let i = 2; i >= -3; i--) ring.push([cx + i, cz + 3]);
        for (let i = 2; i >= -2; i--) ring.push([cx - 3, cz + i]);
        // steps: full blocks, rising one step every 3 tiles (the player jumps)
        // Simplified: a straight staircase inside the east wall
        for (let i = 0; i < 6; i++) { box(cx + W - 1, BASE + 1 + i, cz - 3 + i, cx + W - 1, BASE + 1 + i, cz - 3 + i, B.PLANKS); }
        box(cx + 3, BASE + 7, cz + 3, cx + 3, BASE + 7, cz + 3, B.PLANKS);
        // small railing & sign
        addSign('ABOUT ME', cx, BASE + 23.2, cz + W + 0.0, '#00d4ff', 2.0);
        addSign('AI Engineer • 3+ years • 50+ projects', cx, BASE + 6.4, cz + W + 1, '#9be8ff', 0.8);
        landmarks.about = { x: cx, z: cz + W + 4, y: BASE + 1 };
    }

    function buildSkills(CV) {
        const cx = -26, cz = 2;
        pad(cx - 12, cz - 12, cx + 12, cz + 12, BASE, B.GRASS, B.DIRT, 12);
        // wooden fence
        for (let i = -12; i <= 12; i++) {
            [[cx + i, cz - 12], [cx + i, cz + 12], [cx - 12, cz + i], [cx + 12, cz + i]].forEach(p => { setRaw(p[0], BASE + 1, p[1], B.PLANKS); });
        }
        // east entrance (facing spawn)
        box(cx + 12, BASE + 1, cz - 1, cx + 12, BASE + 1, cz + 1, B.AIR);
        box(cx + 12, BASE + 2, cz - 2, cx + 12, BASE + 3, cz - 2, B.LOG); box(cx + 12, BASE + 2, cz + 2, cx + 12, BASE + 3, cz + 2, B.LOG); box(cx + 12, BASE + 4, cz - 2, cx + 12, BASE + 4, cz + 2, B.PLANKS);
        const colors = [B.C_CYAN, B.C_GREEN, B.C_ORANGE, B.C_PURPLE, B.C_BLUE, B.C_PINK, B.C_YELLOW, B.C_RED];
        CV.skills.forEach((s, i) => {
            const col = i % 4, row = (i / 4) | 0;
            const px = cx - 9 + col * 6, pz = cz - 9 + row * 6;
            const c = colors[i % colors.length];
            box(px - 1, BASE, pz - 1, px + 1, BASE, pz + 1, c);
            box(px, BASE + 1, pz, px, BASE + 1, pz, B.QUARTZ);
            addInfo(px, BASE + 2, pz, 'skill', i, s.cat);
            box(px - 1, BASE + 1, pz - 1, px - 1, BASE + 1, pz - 1, B.LAMP); box(px + 1, BASE + 1, pz + 1, px + 1, BASE + 1, pz + 1, B.LAMP);
            addSign(s.cat, px, BASE + 3.9, pz, '#d9ffe5', 0.75);
        });
        addSign('SKILLS GARDEN', cx + 12, BASE + 6, cz, '#22c55e', 1.8);
        landmarks.skills = { x: cx + 14, z: cz, y: BASE + 1 };
    }

    function buildExperience(CV) {
        const cx = -14, cz = 25;
        pad(cx - 11, cz - 8, cx + 11, cz + 8, BASE, B.STONEBRICK, B.STONE, 14);
        hollow(cx - 9, BASE + 1, cz - 6, cx + 9, BASE + 8, cz + 6, B.BRICK);
        // wood + gold frame
        [-9, 9].forEach(dx => [-6, 6].forEach(dz => box(cx + dx, BASE + 1, cz + dz, cx + dx, BASE + 8, cz + dz, B.LOG)));
        box(cx - 9, BASE + 8, cz - 6, cx + 9, BASE + 8, cz + 6, B.PLANKS);
        box(cx - 9, BASE + 7, cz - 6, cx + 9, BASE + 7, cz - 6, B.GOLD);
        box(cx - 8, BASE + 7, cz + 6, cx + 8, BASE + 7, cz + 6, B.GOLD);
        // windows
        for (let o = -7; o <= 7; o += 4) { box(cx + o, BASE + 3, cz - 6, cx + o + 1, BASE + 5, cz - 6, B.GLASS); box(cx + o, BASE + 3, cz + 6, cx + o + 1, BASE + 5, cz + 6, B.GLASS); }
        // main door to the north (-z, facing spawn)
        box(cx - 1, BASE + 1, cz - 6, cx + 1, BASE + 3, cz - 6, B.AIR);
        // red carpet
        box(cx - 1, BASE, cz - 6, cx + 1, BASE, cz + 5, B.WOOL_R);
        // 2 display pedestals
        [[-5, 0], [5, 1]].forEach((p, i) => {
            const px = cx + p[0], pz = cz + 1;
            box(px - 1, BASE + 1, pz - 1, px + 1, BASE + 1, pz + 1, B.GOLD);
            box(px, BASE + 2, pz, px, BASE + 2, pz, B.QUARTZ);
            addInfo(px, BASE + 3, pz, 'exp', i, CV.experience[i].role);
            addSign(CV.experience[i].org, px, BASE + 5.2, pz, i ? '#ffd88a' : '#ffffff', 0.95);
            addSign(CV.experience[i].period, px, BASE + 4.3, pz, '#ffb84d', 0.7);
        });
        // lights
        box(cx - 8, BASE + 7, cz, cx - 8, BASE + 7, cz, B.LAMP); box(cx + 8, BASE + 7, cz, cx + 8, BASE + 7, cz, B.LAMP); box(cx, BASE + 7, cz + 3, cx, BASE + 7, cz + 3, B.LAMP);
        addSign('EXPERIENCE HALL', cx, BASE + 10.2, cz - 6.5, '#f59e0b', 1.8);
        landmarks.experience = { x: cx, z: cz - 10, y: BASE + 1 };
    }

    function buildProjects(CV) {
        const cx = 22, cz = 14;
        pad(cx - 17, cz - 17, cx + 17, cz + 17, BASE, B.GRAVEL, B.STONE, 14);
        // central cobblestone path
        const colors = CONCRETE_LIST;
        CV.projects.forEach((p, i) => {
            const col = i % 4, row = (i / 4) | 0;
            const hx = cx - 12 + col * 8, hz = cz - 12 + row * 8;
            const c = colors[i % colors.length];
            pad(hx - 3, hz - 3, hx + 3, hz + 3, BASE, B.STONEBRICK, B.STONE, 8);
            hollow(hx - 2, BASE + 1, hz - 2, hx + 2, BASE + 4, hz + 2, c);
            box(hx - 3, BASE + 5, hz - 3, hx + 3, BASE + 5, hz + 3, B.C_BLACK);
            box(hx - 2, BASE + 5, hz - 2, hx + 2, BASE + 5, hz + 2, c);
            // door facing west (-x) toward spawn
            box(hx - 2, BASE + 1, hz, hx - 2, BASE + 2, hz, B.AIR);
            setRaw(hx + 2, BASE + 2, hz, B.GLASS); box(hx, BASE + 2, hz - 2, hx, BASE + 3, hz - 2, B.GLASS); box(hx, BASE + 2, hz + 2, hx, BASE + 3, hz + 2, B.GLASS);
            setRaw(hx, BASE + 1, hz, B.QUARTZ);
            addInfo(hx, BASE + 2, hz, 'project', i, p.name);
            setRaw(hx + 1, BASE + 4, hz, B.LAMP);
            addSign(p.n + ' ' + p.name, hx, BASE + 7.0, hz, '#e9d5ff', 0.8);
        });
        addSign('PROJECTS DISTRICT', cx - 18, BASE + 7, cz - 4, '#a855f7', 1.8);
        landmarks.projects = { x: cx - 18, z: cz, y: BASE + 1 };
    }

    function buildEducation(CV) {
        const cx = 28, cz = -12;
        pad(cx - 8, cz - 7, cx + 8, cz + 7, BASE, B.QUARTZ, B.STONE, 14);
        // steps
        box(cx - 7, BASE + 1, cz - 6, cx + 7, BASE + 1, cz + 6, B.STONEBRICK);
        box(cx - 6, BASE + 2, cz - 5, cx + 6, BASE + 2, cz + 5, B.STONEBRICK);
        // columns
        [-6, -3, 0, 3, 6].forEach(dx => { box(cx + dx, BASE + 3, cz - 5, cx + dx, BASE + 8, cz - 5, B.QUARTZ); box(cx + dx, BASE + 3, cz + 5, cx + dx, BASE + 8, cz + 5, B.QUARTZ); });
        box(cx - 6, BASE + 9, cz - 5, cx + 6, BASE + 9, cz + 5, B.C_BLUE);
        box(cx - 5, BASE + 10, cz - 4, cx + 5, BASE + 10, cz + 4, B.QUARTZ);
        box(cx - 3, BASE + 11, cz - 3, cx + 3, BASE + 11, cz + 3, B.C_BLUE);
        // 3 pedestals
        const ped = [[-4, 'edu', 0, 'Education'], [0, 'certs', 0, 'Certs & Languages'], [4, 'soft', 0, 'Soft Skills']];
        ped.forEach(p => {
            const px = cx + p[0], pz = cz;
            box(px, BASE + 3, pz, px, BASE + 3, pz, B.GOLD);
            addInfo(px, BASE + 4, pz, p[1], p[2], p[3]);
            addSign(p[3], px, BASE + 6.2, pz, '#9ec5ff', 0.85);
        });
        // lights
        [-6, 6].forEach(dx => setRaw(cx + dx, BASE + 3, cz, B.LAMP));
        addSign('VKU CAMPUS', cx, BASE + 13.0, cz, '#3b82f6', 1.8);
        addSign('B.Eng. Information Technology', cx, BASE + 12.0, cz, '#bcd4ff', 0.8);
        landmarks.education = { x: cx - 10, z: cz, y: BASE + 1 };
    }

    function buildContact(CV) {
        const cx = 0, cz = 34;
        pad(cx - 8, cz - 8, cx + 8, cz + 8, BASE, B.STONEBRICK, B.STONE, 14);
        // 6x7 obsidian portal frame (XY plane, facing north)
        for (let y = 0; y < 7; y++) for (let x = -3; x <= 3; x++) {
            const edge = (y === 0 || y === 6 || x === -3 || x === 3);
            if (edge) setRaw(cx + x, BASE + 1 + y, cz + 3, y % 3 === 0 && (x === -3 || x === 3) ? B.GLOW : B.OBSIDIAN);
        }
        // interaction pedestal
        box(cx - 1, BASE + 1, cz - 2, cx + 1, BASE + 1, cz - 2, B.GOLD);
        addInfo(cx, BASE + 2, cz - 2, 'contact', 'contact', 'Contact');
        // mailbox
        box(cx + 5, BASE + 1, cz - 3, cx + 5, BASE + 2, cz - 3, B.C_RED);
        addInfo(cx + 5, BASE + 3, cz - 3, 'cvdl', 'cvdl', 'Download CV');
        addSign('Download CV (PDF)', cx + 5, BASE + 4.6, cz - 3, '#ffb3d9', 0.8);
        box(cx - 5, BASE + 1, cz - 3, cx - 5, BASE + 2, cz - 3, B.C_BLUE);
        addInfo(cx - 5, BASE + 3, cz - 3, 'hire', 'hire', 'Hire Me');
        addSign('HIRE ME', cx - 5, BASE + 4.6, cz - 3, '#9ec5ff', 0.9);
        addSign('CONTACT PORTAL', cx, BASE + 9.0, cz + 3, '#ec4899', 1.8);
        addSign('Step into the portal to say hello', cx, BASE + 8.0, cz + 3, '#ffc0e0', 0.8);
        landmarks.contact = { x: cx, z: cz - 6, y: BASE + 1, portal: { x: cx, y: BASE + 4, z: cz + 3 } };
    }

    function buildSecret(CV) {
        // north-west summit
        const cx = -38, cz = -36;
        let top = 0; for (let x = cx - 3; x <= cx + 3; x++) for (let z = cz - 3; z <= cz + 3; z++) top = Math.max(top, topY(x, z));
        pad(cx - 2, cz - 2, cx + 2, cz + 2, top, B.SNOW, B.STONE, 12);
        box(cx - 1, top + 1, cz - 1, cx + 1, top + 1, cz + 1, B.DIAMOND);
        box(cx, top + 2, cz, cx, top + 2, cz, B.GOLD);
        addInfo(cx, top + 3, cz, 'secret', 'secret', 'Secret Summit');
        [[-2, -2], [2, -2], [-2, 2], [2, 2]].forEach(p => { box(cx + p[0], top + 1, cz + p[1], cx + p[0], top + 3, cz + p[1], B.OBSIDIAN); setRaw(cx + p[0], top + 4, cz + p[1], B.GLOW); });
        addSign('SECRET SUMMIT', cx, top + 6, cz, '#4ff2e4', 1.4);
        landmarks.secret = { x: cx + 3, z: cz + 3, y: top + 2 };
    }

    function buildPaths() {
        const L = landmarks;
        const P = (a, b) => hline(a[0], a[1], b[0], b[1], BASE, B.GRAVEL, 1);
        P([0, 8], [0, 26]);                                // spawn -> contact
        P([0, -8], [0, -12]);                              // spawn -> about
        P([-8, 0], [-14, 2]);                              // -> skills
        P([8, 0], [10, 0]); P([10, 0], [10, 14]); P([10, 14], [4, 14]); // -> projects
        P([8, -4], [18, -12]);                             // -> education
        P([-4, 8], [-14, 18]);                             // -> experience
        // cover the main paths with quartz for clarity
    }

    /* ---------- Dungeons: stair-shaft from the surface down to a mossy chamber with loot ---------- */
    const reserved = [];      // [x, z, radius] spots decorate() must leave alone
    const dungeons = [];
    function buildDungeons(rnd) {
        let tries = 0;
        while (dungeons.length < 7 && tries++ < 600) {
            const sx = ((rnd() * 150) | 0) - 75, sz = ((rnd() * 150) | 0) - 75;
            if (Math.hypot(sx, sz) < 56) continue;
            if (dungeons.some(d => Math.hypot(d.x - sx, d.z - sz) < 34)) continue;
            const h = terrainHeight(sx, sz);
            if (h < 17 || h > 34) continue;
            const L = h - 8, rx = sx + L, rz = sz;          // chamber is straight ahead along +x at the bottom of the stairs
            if (rx + 6 > 76) continue;
            let ok = true;
            for (let dx = 0; dx <= L + 10 && ok; dx += 3) if (terrainHeight(sx + dx, sz) <= WATER + 1) ok = false;
            if (!ok || terrainHeight(rx + 4, rz) < 15) continue;
            // stairway
            for (let i = 0; i <= L; i++) for (let dz = -1; dz <= 1; dz++) {
                const x = sx + i, y = h - i, z = sz + dz;
                for (let yy = y; yy <= y + 3; yy++) setRaw(x, yy, z, B.AIR);
                setRaw(x, y - 1, z, i % 2 ? B.MOSSY : B.STONEBRICK);
                setRaw(x, y + 4, z, B.COBBLE);
                if (dz) { for (let yy = y; yy <= y + 3; yy++) setRaw(x, yy, sz + dz * 2, B.COBBLE); }
                if (i === 0) setRaw(x, y + 4, z, B.AIR);
            }
            // chamber 9 x 5 x 9 (interior)
            hollow(rx, 7, rz - 5, rx + 10, 13, rz + 5, B.MOSSY);
            box(rx + 1, 7, rz - 4, rx + 9, 7, rz + 4, B.STONEBRICK);
            for (let k = 0; k < 18; k++) setRaw(rx + 1 + (rnd() * 9 | 0), 7, rz - 4 + (rnd() * 9 | 0), B.MOSSY);
            setRaw(rx, 8, rz, B.AIR); setRaw(rx, 9, rz, B.AIR); setRaw(rx, 8, rz - 1, B.AIR); setRaw(rx, 9, rz - 1, B.AIR); setRaw(rx, 8, rz + 1, B.AIR); setRaw(rx, 9, rz + 1, B.AIR);
            [[1, -4], [9, -4], [1, 4], [9, 4]].forEach(p => { box(rx + p[0], 8, rz + p[1], rx + p[0], 11, rz + p[1], B.STONEBRICK); setRaw(rx + p[0], 12, rz + p[1], B.GLOW); });
            // treasure
            box(rx + 5, 8, rz, rx + 5, 8, rz, B.GOLD); setRaw(rx + 5, 9, rz, B.DIAMOND); setRaw(rx + 4, 8, rz, B.GLOW); setRaw(rx + 6, 8, rz, B.GLOW);
            addSign('DUNGEON TREASURE', rx + 5, 11.2, rz, '#f6d54a', 0.9);
            // surface marker
            for (const dz of [-3, 3]) { box(sx, h + 1, sz + dz, sx, h + 3, sz + dz, B.STONEBRICK); setRaw(sx, h + 4, sz + dz, B.LAMP); }
            addSign('DUNGEON', sx, h + 5.4, sz, '#a8d8a0', 1);
            dungeons.push({ x: sx, z: sz, rx, rz });
            reserved.push([sx, sz, 8]);
        }
    }

    function spruce(x, z, rnd) {
        const y = topY(x, z); const g = get(x, y, z);
        if (g !== B.SNOW && g !== B.GRASS) return false;
        const h = 6 + (rnd() * 4 | 0);
        for (let i = 1; i <= h; i++) setRaw(x, y + i, z, B.LOG);
        for (let dy = 2; dy <= h + 1; dy++) {
            const rr = Math.max(0, Math.min(3, Math.floor((h + 1 - dy) / 2) + (dy < h - 2 ? 1 : 0))) , r = dy === h + 1 ? 0 : rr;
            for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
                if (Math.abs(dx) + Math.abs(dz) > r + 1) continue;
                if (get(x + dx, y + dy, z + dz) === B.AIR) setRaw(x + dx, y + dy, z + dz, B.SPRUCE);
            }
        }
        return true;
    }
    function cactus(x, z, rnd) {
        const y = topY(x, z); if (get(x, y, z) !== B.SAND || y <= WATER + 1) return false;
        const h = 1 + (rnd() * 3 | 0);
        for (let i = 1; i <= h; i++) setRaw(x, y + i, z, B.CACTUS);
        return true;
    }

    function decorate(rnd) {
        // trees, cacti and plants outside the structure areas
        function clear(x, z) {
            if (Math.hypot(x, z) < 12) return false;
            const zones = [[0, -18, 11], [-26, 2, 16], [-14, 25, 14], [22, 14, 22], [28, -12, 12], [0, 34, 11], [-38, -36, 7]];
            if (reserved.some(q => Math.hypot(x - q[0], z - q[1]) < q[2])) return false;
            return !zones.some(q => Math.hypot(x - q[0], z - q[1]) < q[2]);
        }
        let placed = 0, tries = 0;
        while (placed < 900 && tries < 14000) {
            tries++;
            const x = ((rnd() * SX) | 0) - OX, z = ((rnd() * SZ) | 0) - OZ;
            if (x < -OX + 3 || x > SX - OX - 4 || z < -OZ + 3 || z > SZ - OZ - 4) continue;
            if (!clear(x, z)) continue;
            const bio = biomeMap[(z + OZ) * SX + (x + OX)];
            const dens = bio === BIOME.FOREST ? 1 : bio === BIOME.PLAINS ? 0.16 : bio === BIOME.SNOW ? 0.6 : bio === BIOME.DESERT ? 0.35 : 0;
            if (rnd() > dens) continue;
            const ok = bio === BIOME.SNOW ? spruce(x, z, rnd) : bio === BIOME.DESERT ? cactus(x, z, rnd) : tree(x, z, rnd);
            if (ok) placed++;
        }
        // grass tufts and flowers
        for (let x = -OX + 2; x < SX - OX - 2; x++) for (let z = -OZ + 2; z < SZ - OZ - 2; z++) {
            const bio = biomeMap[(z + OZ) * SX + (x + OX)];
            if (bio !== BIOME.PLAINS && bio !== BIOME.FOREST) continue;
            const h = heightMap[(z + OZ) * SX + (x + OX)], y = h + 1;
            if (get(x, h, z) !== B.GRASS || get(x, y, z) !== B.AIR || !clear(x, z)) continue;
            const q = rnd();
            if (q < 0.10) setRaw(x, y, z, B.TALLGRASS);
            else if (q < 0.118) setRaw(x, y, z, B.FLOWER_R);
            else if (q < 0.136) setRaw(x, y, z, B.FLOWER_Y);
        }
    }

    /* ---------- Shards (Knowledge) ---------- */
    const shardSpots = [];
    function placeShards(CV, rnd) {
        const L = landmarks;
        const fixed = [
            [0, -9], [-18, -6], [-34, 6], [-22, 14], [-8, 30], [14, 30],
            [30, 20], [14, 2], [36, -12], [20, -26], [-20, -30], [-38, -26]
        ];
        for (let i = 0; i < CV.shards.length; i++) {
            let [x, z] = fixed[i];
            const y = topY(x, z) + 2;
            shardSpots.push({ id: i, x: x + 0.5, y: y, z: z + 0.5 });
        }
    }

    function buildAll(CV) {
        const rnd = mulberry32(2026);
        generate();
        buildPaths();
        buildSpawn(CV);
        buildAbout(CV);
        buildSkills(CV);
        buildExperience(CV);
        buildProjects(CV);
        buildEducation(CV);
        buildContact(CV);
        buildDungeons(rnd);
        decorate(rnd);
        buildSecret(CV);
        // paths are placed afterwards (to overlay the terrain); they run before the pads so only the gaps between pads remain
        placeShards(CV, rnd);
        // final heightMap
        for (let x = -OX; x < SX - OX; x++) for (let z = -OZ; z < SZ - OZ; z++) heightMap[(z + OZ) * SX + (x + OX)] = topY(x, z);
    }

    window.CVW = {
        SX, SY, SZ, OX, OZ, WATER, BASE, B, DEF, TILE, COLS, CONCRETE_BY_NAME, CONCRETE_LIST,
        data, heightMap, idx, inb, get, set: setRaw, topY, buildAtlas, buildAll,
        infoMap, infoList, landmarks, signs, shardSpots, mulberry32, biomeMap, BIOME, dungeons
    };
})();
