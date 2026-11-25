/* CV World — Multi-Dimension Voxel World (Overworld, Nether, Aether Sky Islands, Cosmos, Abyssal Dungeon),
   Padded Zero-Bleed Painterly Pixel Atlas, Slope-Aware Mountains, Organic Trees & Dual-Channel BFS Lighting */
(function () {
    'use strict';

    /* ---------- World & Atlas Constants ---------- */
    // Padded atlas: 16x16 grid of 18x18 cells (16x16 crisp pixel art + 1px extruded border on all 4 sides = ZERO UV bleed!)
    const TILE = 16, PAD_PX = 1, STRIDE = TILE + PAD_PX * 2, COLS = 16;

    /* ---------- Deterministic RNG & Value/FBM Noise ---------- */
    function mulberry32(a) {
        return function () {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    function hash2(x, z, s) {
        let h = (x * 374761393 + z * 668265263 + (s || 0) * 1442695041) | 0;
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    }
    function hash3(x, y, z, s) {
        let h = (x * 374761393 + y * 1103515245 + z * 668265263 + (s || 0) * 2654435761) | 0;
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    }
    function vnoise(x, z, s) {
        const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
        const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
        const a = hash2(xi, zi, s), b = hash2(xi + 1, zi, s), c = hash2(xi, zi + 1, s), d = hash2(xi + 1, zi + 1, s);
        return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    }
    function vnoise3(x, y, z, s) {
        const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
        const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
        const c000 = hash3(xi, yi, zi, s), c100 = hash3(xi + 1, yi, zi, s), c010 = hash3(xi, yi + 1, zi, s), c110 = hash3(xi + 1, yi + 1, zi, s);
        const c001 = hash3(xi, yi, zi + 1, s), c101 = hash3(xi + 1, yi, zi + 1, s), c011 = hash3(xi, yi + 1, zi + 1, s), c111 = hash3(xi + 1, yi + 1, zi + 1, s);
        const x00 = c000 + (c100 - c000) * u, x10 = c010 + (c110 - c010) * u, x01 = c001 + (c101 - c001) * u, x11 = c011 + (c111 - c011) * u;
        const y0 = x00 + (x10 - x00) * v, y1 = x01 + (x11 - x01) * v;
        return y0 + (y1 - y0) * w;
    }
    function fbm(x, z, s) {
        return vnoise(x * 0.015, z * 0.015, s) * 0.56 + vnoise(x * 0.036, z * 0.036, s + 17) * 0.28 + vnoise(x * 0.08, z * 0.08, s + 31) * 0.16;
    }

    /* ---------- Block IDs (Overworld + Nether + Aether + Cosmos + Dungeon) ---------- */
    const B = {
        AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, COBBLE: 4, SAND: 5, WATER: 6, LOG: 7, PLANKS: 8, LEAVES: 9,
        SNOW: 10, GLASS: 11, BRICK: 12, STONEBRICK: 13, QUARTZ: 14, GOLD: 15, OBSIDIAN: 16, GLOW: 17,
        INFO: 18, BOOKSHELF: 19, GRAVEL: 20, IRON_BLOCK: 21,
        C_CYAN: 22, C_PURPLE: 23, C_GREEN: 24, C_ORANGE: 25, C_BLUE: 26, C_PINK: 27, C_YELLOW: 28, C_RED: 29, C_BLACK: 30,
        WOOL_W: 31, WOOL_R: 32, COAL: 33, IRON: 34, DIAMOND: 35,
        TALLGRASS: 36, FLOWER_R: 37, FLOWER_Y: 38, SPRUCE: 39, CACTUS: 40, SANDSTONE: 41, MOSSY: 42,
        LAVA: 43, BEDROCK: 44, TORCH: 45, MAGMA: 46, BASALT: 47,
        BIRCH_LOG: 48, BIRCH_LEAVES: 49, CHERRY_LOG: 50, CHERRY_LEAVES: 51,
        SPRUCE_PLANKS: 52, CHERRY_PLANKS: 53,
        GOLD_ORE: 54, REDSTONE_ORE: 55, EMERALD: 56, DIAMOND_BLOCK: 57, EMERALD_BLOCK: 58,
        AMETHYST: 59, ICE: 60, SEA_LANTERN: 61, LAMP: 62, CRYING_OBS: 63,
        FLOWER_B: 64, FLOWER_P: 65, FERN: 66, MUSHROOM_R: 67, SUGARCANE: 68,
        CORAL_R: 69, CORAL_B: 70, SEAGRASS: 71,
        CRAFTING: 72, FURNACE: 73, CHEST: 74, TNT: 75,
        SNOW_GRASS: 76, GLOW_VINE: 77, WOOL_B: 78, WOOL_G: 79,
        // Multi-Dimension Blocks
        NETHERRACK: 80, NETHER_BRICK: 81, SOUL_SAND: 82, SHROOMLIGHT: 83,
        CRIMSON_NYLIUM: 84, CRIMSON_CAP: 85, WARPED_NYLIUM: 86, WARPED_CAP: 87,
        AETHER_GRASS: 88, AETHER_STONE: 89, CLOUD_BLOCK: 90, SKY_CRYSTAL: 91,
        END_STONE: 92, PURPUR: 93, STAR_CRYSTAL: 94, VOID_STONE: 95,
        SOUL_TORCH: 96, DEEPSLATE: 97
    };

    const DEF = [];
    function def(id, name, o) {
        const t = o.t !== undefined ? o.t : 0;
        DEF[id] = {
            id, name,
            top: o.top !== undefined ? o.top : t,
            bot: o.bot !== undefined ? o.bot : (o.top !== undefined && o.side === undefined ? o.top : t),
            side: o.side !== undefined ? o.side : t,
            solid: o.solid !== undefined ? o.solid : true,
            opaque: o.opaque !== undefined ? o.opaque : true,
            liquid: !!o.liquid, lava: !!o.lava,
            cutout: !!o.cutout, translucent: !!o.translucent,
            cross: !!o.cross, sway: !!o.sway, torch: !!o.torch,
            emit: o.emit || (o.light ? 14 : 0),
            light: !!(o.light || (o.emit && o.emit >= 10)),
            place: o.place !== undefined ? o.place : true,
            cat: o.cat || 'building',
            step: o.step || 'stone'
        };
    }

    def(B.AIR, 'Air', { solid: false, opaque: false, place: false });
    def(B.GRASS, 'Grass Block', { top: 0, side: 1, bot: 2, cat: 'nature', step: 'grass' });
    def(B.DIRT, 'Dirt', { t: 2, cat: 'nature', step: 'dirt' });
    def(B.STONE, 'Stone', { t: 3, cat: 'building', step: 'stone' });
    def(B.COBBLE, 'Cobblestone', { t: 4, cat: 'building', step: 'stone' });
    def(B.SAND, 'Sand', { t: 5, cat: 'nature', step: 'sand' });
    def(B.WATER, 'Water', { t: 6, solid: false, opaque: false, liquid: true, translucent: true, place: false });
    def(B.LOG, 'Oak Log', { top: 8, bot: 8, side: 7, cat: 'nature', step: 'wood' });
    def(B.PLANKS, 'Oak Planks', { t: 9, cat: 'building', step: 'wood' });
    def(B.LEAVES, 'Oak Leaves', { t: 10, opaque: false, cutout: true, sway: true, cat: 'nature', step: 'grass' });
    def(B.SNOW, 'Snow Block', { t: 11, cat: 'nature', step: 'snow' });
    def(B.GLASS, 'Glass', { t: 12, opaque: false, cutout: true, cat: 'building', step: 'glass' });
    def(B.BRICK, 'Bricks', { t: 13, cat: 'building', step: 'stone' });
    def(B.STONEBRICK, 'Stone Bricks', { t: 14, cat: 'building', step: 'stone' });
    def(B.QUARTZ, 'Smooth Quartz', { t: 15, cat: 'building', step: 'stone' });
    def(B.GOLD, 'Gold Block', { t: 16, cat: 'decor', step: 'metal' });
    def(B.OBSIDIAN, 'Obsidian', { t: 17, cat: 'building', step: 'stone' });
    def(B.GLOW, 'Glowstone', { t: 18, emit: 15, light: true, cat: 'light', step: 'glass' });
    def(B.INFO, 'CV Info Block', { t: 19, emit: 13, light: true, place: false, step: 'glass' });
    def(B.BOOKSHELF, 'Bookshelf', { top: 9, bot: 9, side: 20, cat: 'decor', step: 'wood' });
    def(B.GRAVEL, 'Gravel', { t: 21, cat: 'nature', step: 'dirt' });
    def(B.IRON_BLOCK, 'Iron Block', { t: 22, cat: 'decor', step: 'metal' });

    const CCOLORS = [
        [B.C_CYAN, 'Cyan Concrete', 23], [B.C_PURPLE, 'Purple Concrete', 24], [B.C_GREEN, 'Green Concrete', 25],
        [B.C_ORANGE, 'Orange Concrete', 26], [B.C_BLUE, 'Blue Concrete', 27], [B.C_PINK, 'Pink Concrete', 28],
        [B.C_YELLOW, 'Yellow Concrete', 29], [B.C_RED, 'Red Concrete', 30], [B.C_BLACK, 'Black Concrete', 31]
    ];
    CCOLORS.forEach(c => def(c[0], c[1], { t: c[2], cat: 'building', step: 'stone' }));

    def(B.WOOL_W, 'White Wool', { t: 32, cat: 'decor', step: 'wool' });
    def(B.WOOL_R, 'Red Wool', { t: 33, cat: 'decor', step: 'wool' });
    def(B.COAL, 'Coal Ore', { t: 34, cat: 'nature', step: 'stone' });
    def(B.IRON, 'Iron Ore', { t: 35, cat: 'nature', step: 'stone' });
    def(B.DIAMOND, 'Diamond Ore', { t: 36, emit: 3, cat: 'nature', step: 'stone' });
    def(B.TALLGRASS, 'Tall Grass', { t: 37, solid: false, opaque: false, cutout: true, cross: true, sway: true, cat: 'nature', step: 'grass' });
    def(B.FLOWER_R, 'Red Poppy', { t: 38, solid: false, opaque: false, cutout: true, cross: true, sway: true, cat: 'nature', step: 'grass' });
    def(B.FLOWER_Y, 'Dandelion', { t: 39, solid: false, opaque: false, cutout: true, cross: true, sway: true, cat: 'nature', step: 'grass' });
    def(B.SPRUCE, 'Spruce Leaves', { t: 40, opaque: false, cutout: true, sway: true, cat: 'nature', step: 'grass' });
    def(B.CACTUS, 'Cactus', { top: 41, bot: 41, side: 42, cat: 'nature', step: 'grass' });
    def(B.SANDSTONE, 'Sandstone', { top: 43, bot: 43, side: 44, cat: 'building', step: 'stone' });
    def(B.MOSSY, 'Mossy Cobble', { t: 45, cat: 'building', step: 'stone' });

    def(B.LAVA, 'Lava', { t: 46, solid: false, opaque: false, liquid: true, lava: true, emit: 15, light: true, place: false });
    def(B.BEDROCK, 'Bedrock', { t: 47, place: false, cat: 'building', step: 'stone' });
    def(B.TORCH, 'Torch', { t: 48, solid: false, opaque: false, cutout: true, cross: true, torch: true, emit: 14, light: true, cat: 'light', step: 'wood' });
    def(B.MAGMA, 'Magma Block', { t: 49, emit: 9, cat: 'light', step: 'stone' });
    def(B.BASALT, 'Volcanic Basalt', { top: 51, bot: 51, side: 50, cat: 'building', step: 'stone' });
    def(B.BIRCH_LOG, 'Birch Log', { top: 53, bot: 53, side: 52, cat: 'nature', step: 'wood' });
    def(B.BIRCH_LEAVES, 'Birch Leaves', { t: 54, opaque: false, cutout: true, sway: true, cat: 'nature', step: 'grass' });
    def(B.CHERRY_LOG, 'Cherry Log', { top: 56, bot: 56, side: 55, cat: 'nature', step: 'wood' });
    def(B.CHERRY_LEAVES, 'Cherry Blossom', { t: 57, opaque: false, cutout: true, sway: true, cat: 'nature', step: 'grass' });
    def(B.SPRUCE_PLANKS, 'Spruce Planks', { t: 58, cat: 'building', step: 'wood' });
    def(B.CHERRY_PLANKS, 'Cherry Planks', { t: 59, cat: 'building', step: 'wood' });
    def(B.GOLD_ORE, 'Gold Ore', { t: 60, cat: 'nature', step: 'stone' });
    def(B.REDSTONE_ORE, 'Redstone Ore', { t: 61, emit: 5, cat: 'nature', step: 'stone' });
    def(B.EMERALD, 'Emerald Ore', { t: 62, emit: 3, cat: 'nature', step: 'stone' });
    def(B.DIAMOND_BLOCK, 'Diamond Block', { t: 63, cat: 'decor', step: 'metal' });
    def(B.EMERALD_BLOCK, 'Emerald Block', { t: 64, cat: 'decor', step: 'metal' });
    def(B.AMETHYST, 'Amethyst Crystal', { t: 65, emit: 7, cat: 'light', step: 'glass' });
    def(B.ICE, 'Glacier Ice', { t: 66, opaque: false, translucent: true, cat: 'nature', step: 'glass' });
    def(B.SEA_LANTERN, 'Sea Lantern', { t: 67, emit: 15, light: true, cat: 'light', step: 'glass' });
    def(B.LAMP, 'Redstone Lamp', { t: 68, emit: 15, light: true, cat: 'light', step: 'glass' });
    def(B.CRYING_OBS, 'Crying Obsidian', { t: 69, emit: 11, cat: 'light', step: 'stone' });
    def(B.FLOWER_B, 'Blue Orchid', { t: 70, solid: false, opaque: false, cutout: true, cross: true, sway: true, cat: 'nature', step: 'grass' });
    def(B.FLOWER_P, 'Pink Tulip', { t: 71, solid: false, opaque: false, cutout: true, cross: true, sway: true, cat: 'nature', step: 'grass' });
    def(B.FERN, 'Lush Fern', { t: 72, solid: false, opaque: false, cutout: true, cross: true, sway: true, cat: 'nature', step: 'grass' });
    def(B.MUSHROOM_R, 'Red Mushroom', { t: 73, solid: false, opaque: false, cutout: true, cross: true, cat: 'nature', step: 'grass' });
    def(B.SUGARCANE, 'Sugar Cane', { t: 74, solid: false, opaque: false, cutout: true, cross: true, sway: true, cat: 'nature', step: 'grass' });
    def(B.CORAL_R, 'Fire Coral', { t: 75, solid: false, opaque: false, cutout: true, cross: true, sway: true, emit: 4, cat: 'nature', step: 'stone' });
    def(B.CORAL_B, 'Tube Coral', { t: 76, solid: false, opaque: false, cutout: true, cross: true, sway: true, emit: 4, cat: 'nature', step: 'stone' });
    def(B.SEAGRASS, 'Seagrass', { t: 77, solid: false, opaque: false, cutout: true, cross: true, sway: true, place: false, step: 'grass' });
    def(B.CRAFTING, 'Crafting Table', { top: 78, bot: 9, side: 79, cat: 'decor', step: 'wood' });
    def(B.FURNACE, 'Furnace', { top: 81, bot: 81, side: 80, emit: 8, cat: 'decor', step: 'stone' });
    def(B.CHEST, 'Treasure Chest', { top: 83, bot: 83, side: 82, cat: 'decor', step: 'wood' });
    def(B.TNT, 'TNT', { top: 85, bot: 85, side: 84, cat: 'decor', step: 'wood' });
    def(B.SNOW_GRASS, 'Snowy Grass', { top: 11, side: 86, bot: 2, cat: 'nature', step: 'snow' });
    def(B.GLOW_VINE, 'Glow Vines', { t: 87, solid: false, opaque: false, cutout: true, cross: true, sway: true, emit: 12, light: true, cat: 'light', step: 'grass' });
    def(B.WOOL_B, 'Blue Wool', { t: 88, cat: 'decor', step: 'wool' });
    def(B.WOOL_G, 'Green Wool', { t: 89, cat: 'decor', step: 'wool' });

    // Multi-Dimension Blocks (90-108)
    def(B.NETHERRACK, 'Netherrack', { t: 90, cat: 'building', step: 'stone' });
    def(B.NETHER_BRICK, 'Nether Bricks', { t: 91, cat: 'building', step: 'stone' });
    def(B.SOUL_SAND, 'Soul Sand', { t: 92, cat: 'nature', step: 'sand' });
    def(B.SHROOMLIGHT, 'Shroomlight', { t: 93, emit: 15, light: true, cat: 'light', step: 'wood' });
    def(B.CRIMSON_NYLIUM, 'Crimson Nylium', { top: 94, side: 95, bot: 90, cat: 'nature', step: 'stone' });
    def(B.CRIMSON_CAP, 'Crimson Wart', { t: 96, cat: 'nature', step: 'wood' });
    def(B.WARPED_NYLIUM, 'Warped Nylium', { top: 97, side: 98, bot: 90, cat: 'nature', step: 'stone' });
    def(B.WARPED_CAP, 'Warped Wart', { t: 99, cat: 'nature', step: 'wood' });
    def(B.AETHER_GRASS, 'Sky Turf', { top: 100, side: 101, bot: 102, cat: 'nature', step: 'grass' });
    def(B.AETHER_STONE, 'Aether Holystone', { t: 102, cat: 'building', step: 'stone' });
    def(B.CLOUD_BLOCK, 'Aercloud', { t: 103, opaque: false, translucent: true, cat: 'nature', step: 'snow' });
    def(B.SKY_CRYSTAL, 'Sky Crystal', { t: 104, emit: 14, light: true, cat: 'light', step: 'glass' });
    def(B.END_STONE, 'End Stone', { t: 105, cat: 'building', step: 'stone' });
    def(B.PURPUR, 'Purpur Block', { t: 106, cat: 'building', step: 'stone' });
    def(B.STAR_CRYSTAL, 'Star Crystal', { t: 107, emit: 15, light: true, cat: 'light', step: 'glass' });
    def(B.VOID_STONE, 'Cosmic Obsidian', { t: 108, emit: 4, cat: 'building', step: 'stone' });
    def(B.SOUL_TORCH, 'Soul Torch', { t: 109, solid: false, opaque: false, cutout: true, cross: true, torch: true, emit: 13, light: true, cat: 'light', step: 'wood' });
    def(B.DEEPSLATE, 'Deepslate', { t: 110, cat: 'building', step: 'stone' });

    const CONCRETE_BY_NAME = { cyan: B.C_CYAN, purple: B.C_PURPLE, green: B.C_GREEN, orange: B.C_ORANGE, blue: B.C_BLUE, pink: B.C_PINK, yellow: B.C_YELLOW, red: B.C_RED, black: B.C_BLACK };
    const CONCRETE_LIST = [B.C_CYAN, B.C_PURPLE, B.C_GREEN, B.C_ORANGE, B.C_BLUE, B.C_PINK, B.C_YELLOW, B.C_RED];

    /* ---------- Painterly Padded Zero-Bleed 16x16 Pixel-Art Atlas (288x288, 18px stride) ---------- */
    function buildAtlas() {
        const cv = document.createElement('canvas');
        cv.width = COLS * STRIDE; cv.height = COLS * STRIDE;
        const g = cv.getContext('2d');
        const rnd = mulberry32(2026);
        const tileOrig = (idx) => [(idx % COLS) * STRIDE + PAD_PX, Math.floor(idx / COLS) * STRIDE + PAD_PX];

        function rgbStr(r, gr, b, a) {
            r = Math.max(0, Math.min(255, r | 0));
            gr = Math.max(0, Math.min(255, gr | 0));
            b = Math.max(0, Math.min(255, b | 0));
            return a !== undefined ? `rgba(${r},${gr},${b},${a})` : `rgb(${r},${gr},${b})`;
        }
        function shade(hex, k) { return rgbStr(((hex >> 16) & 255) * k, ((hex >> 8) & 255) * k, (hex & 255) * k); }
        function blend(h1, h2, t) {
            const r1 = (h1 >> 16) & 255, g1 = (h1 >> 8) & 255, b1 = h1 & 255;
            const r2 = (h2 >> 16) & 255, g2 = (h2 >> 8) & 255, b2 = h2 & 255;
            return rgbStr(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
        }
        function px(idx, x, y, col) {
            if (x < 0 || x >= 16 || y < 0 || y >= 16) return;
            const [ox, oy] = tileOrig(idx);
            g.fillStyle = col; g.fillRect(ox + x, oy + y, 1, 1);
        }
        function clear(idx) {
            const [ox, oy] = tileOrig(idx);
            g.clearRect(ox - PAD_PX, oy - PAD_PX, STRIDE, STRIDE);
        }
        function fillPal(idx, pal, fn) {
            for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
                const v = fn(x, y);
                const c = pal[Math.max(0, Math.min(pal.length - 1, v))];
                px(idx, x, y, typeof c === 'number' ? shade(c, 1) : c);
            }
        }
        // Soft painterly organic stone/earth pattern (coherent 2px clusters instead of harsh static)
        function organicRock(idx, pal) {
            const p = (x, y) => {
                const n = vnoise(x * 0.42 + idx * 3.1, y * 0.55 + idx * 1.7, idx + 7);
                const str = Math.sin(y * 0.85 + vnoise(x * 0.28, y * 0.25, idx + 31) * 2.2) * 0.12;
                return Math.floor((n + str) * pal.length);
            };
            fillPal(idx, pal, p);
        }
        function drawPlanks(idx, cBase, cHi, cDark, cSeam) {
            for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
                const row = y >> 2, ly = y & 3;
                const seamX = (row % 2 === 0 && x === 7) || (row % 2 === 1 && x === 13);
                if (ly === 3 || seamX) { px(idx, x, y, shade(cSeam, 1)); continue; }
                const grain = vnoise(x * 0.35 + row * 5, y * 1.2, idx + 11);
                let col = ly === 0 ? cHi : (grain > 0.62 ? cHi : (grain < 0.32 ? cDark : cBase));
                px(idx, x, y, shade(col, 1));
            }
        }
        function drawLeaves(idx, pal, density) {
            clear(idx);
            // Painterly 2x2 / 3x2 overlapping leaf clusters (rich Minecraft Jappa style)
            for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
                const c1 = vnoise(x * 0.48 + idx, y * 0.48, idx + 3);
                const c2 = hash2(x, y, idx + 19);
                const hole = ((x % 4 === 0 && y % 4 === 2) || (x % 4 === 2 && y % 4 === 0)) && c2 > density;
                if (hole) continue;
                const val = c1 * 0.72 + c2 * 0.28;
                const ci = Math.min(pal.length - 1, Math.floor(val * pal.length));
                px(idx, x, y, shade(pal[ci], 1));
            }
        }
        function drawBricks(idx, cBrick, cHi, cDark, cMortar) {
            for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
                const row = y >> 2, ly = y & 3, off = (row & 1) * 4, lx = (x + off) & 7;
                if (ly === 3 || lx === 7) { px(idx, x, y, shade(cMortar, 1)); continue; }
                if (ly === 0) { px(idx, x, y, shade(cHi, 1)); continue; }
                const v = vnoise(x * 0.5, y * 0.5, idx + 13);
                px(idx, x, y, shade(v > 0.65 ? cHi : (v < 0.3 ? cDark : cBrick), 1));
            }
        }
        function drawOre(idx, oreHex, hiHex) {
            organicRock(idx, [0x6e737b, 0x7c828a, 0x898f98, 0x959ba3]);
            const spots = [[3, 3], [4, 3], [3, 4], [10, 4], [11, 4], [11, 5], [6, 9], [7, 9], [6, 10], [12, 11], [11, 12], [12, 12], [3, 12], [4, 12]];
            spots.forEach((p, k) => {
                px(idx, p[0], p[1], shade(k % 3 === 0 ? hiHex : oreHex, 1));
                if (k % 3 === 1) px(idx, p[0], Math.min(15, p[1] + 1), shade(oreHex, 0.74));
            });
        }
        function drawMetal(idx, cMain, cHi, cMid, cEdge) {
            for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
                const border = x === 0 || y === 0 || x === 15 || y === 15;
                const bevel = x === 1 || y === 1;
                const inner = x === 14 || y === 14;
                const diag = (x + y) >= 10 && (x + y) <= 13;
                if (border) px(idx, x, y, shade(cEdge, 1));
                else if (bevel) px(idx, x, y, shade(cHi, 1));
                else if (inner) px(idx, x, y, shade(cMid, 1));
                else px(idx, x, y, shade(diag ? cHi : cMain, 0.96 + vnoise(x * 0.4, y * 0.4, idx) * 0.08));
            }
        }
        function drawConcrete(idx, hex) {
            for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
                const n = vnoise(x * 0.45, y * 0.45, idx + 41);
                px(idx, x, y, shade(hex, 0.94 + n * 0.11));
            }
        }

        // 0: Lush Meadow Grass Top (cohesive multi-tone emerald blades)
        fillPal(0, [0x4c9436, 0x5ba840, 0x67b64a, 0x76c456], (x, y) => {
            const n = vnoise(x * 0.55, y * 0.55, 10) * 0.7 + hash2(x, y, 11) * 0.3;
            return Math.floor(n * 4);
        });
        // 2: Warm Rich Dirt (soft earth clods)
        fillPal(2, [0x6e4a2c, 0x7d5533, 0x8a5f3b, 0x996d46], (x, y) => {
            const n = vnoise(x * 0.5, y * 0.5, 20) * 0.65 + hash2(x, y, 21) * 0.35;
            return Math.floor(n * 4);
        });
        // 1: Grass Side (rich dirt + soft cascading grass overhang)
        const fringe = [4, 5, 4, 3, 5, 6, 4, 3, 4, 5, 6, 4, 3, 5, 4, 4];
        fillPal(1, [0x6e4a2c, 0x7d5533, 0x8a5f3b, 0x996d46], (x, y) => Math.floor((vnoise(x * 0.5, y * 0.5, 20) * 0.65 + hash2(x, y, 21) * 0.35) * 4));
        for (let x = 0; x < 16; x++) {
            for (let y = 0; y < fringe[x]; y++) {
                px(1, x, y, shade(y === 0 ? 0x72c252 : (y === fringe[x] - 1 ? 0x458731 : 0x5aa640), 1));
            }
            px(1, x, fringe[x], shade(0x52351e, 1)); // subtle cast shadow under grass overhang!
        }

        // 3: Smooth Layered Stone (warm-cool natural limestone/granite feel)
        organicRock(3, [0x707680, 0x7e858f, 0x8a919b, 0x969da6]);
        // 4: Detailed Cobblestone
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
            const cell = ((x + ((y >> 2) & 1) * 3) % 5 === 0) || (y % 4 === 0);
            const hi = ((x + ((y >> 2) & 1) * 3) % 5 === 1) || (y % 4 === 1);
            px(4, x, y, shade(cell ? 0x565c66 : (hi ? 0x9da3ad : 0x7e848e), 0.95 + hash2(x, y, 44) * 0.1));
        }
        // 5: Warm Golden Beach Sand (gentle dune ripples)
        fillPal(5, [0xd4c188, 0xdfce96, 0xe8d9a6, 0xf0e4b8], (x, y) => {
            const w = Math.sin((x * 0.4 + y * 0.85)) * 0.35 + vnoise(x * 0.45, y * 0.45, 55) * 0.65;
            return Math.floor(Math.max(0, Math.min(0.99, w)) * 4);
        });
        // 6: Translucent Crystal Turquoise Water
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
            const w = Math.sin(x * 0.55 + y * 0.4) * 0.5 + 0.5;
            const sparkle = Math.sin(x * 1.1 - y * 0.7) > 0.78;
            px(6, x, y, sparkle ? 'rgba(180,238,255,0.88)' : blend(0x1f85cc, 0x45bce8, w));
        }
        // 7-8: Oak Log Bark & Rings
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
            const ridge = (x % 4 === 0) ? 0x523920 : ((x % 4 === 2) ? 0x785634 : 0x67482a);
            const knot = (x === 5 && y === 7) || (x === 11 && y === 12);
            px(7, x, y, shade(knot ? 0x422c17 : ridge, 0.94 + vnoise(x * 0.7, y * 0.35, 70) * 0.12));
            const r = Math.hypot(x - 7.5, y - 7.5);
            px(8, x, y, r > 6.4 ? shade(0x5c3f22, 1) : shade((Math.floor(r) % 2 === 0) ? 0xbfa06e : 0xa38252, 1));
        }
        // 9: Oak Planks
        drawPlanks(9, 0xb88950, 0xc99c62, 0xa2743e, 0x734e26);
        // 10: Lush Oak Leaves
        drawLeaves(10, [0x2c6e26, 0x3b8a32, 0x4da33f, 0x67ba50], 0.62);
        // 11: Crisp Pure Snow (gentle glacial blue micro-shade, zero dirt specks!)
        fillPal(11, [0xe6f1fa, 0xf0f7fc, 0xf7fbff, 0xffffff], (x, y) => Math.floor(vnoise(x * 0.38, y * 0.38, 111) * 4));
        // 12: Clean Framed Glass
        clear(12);
        for (let i = 0; i < 16; i++) {
            px(12, i, 0, 'rgba(215,244,255,0.92)'); px(12, i, 15, 'rgba(180,224,245,0.92)');
            px(12, 0, i, 'rgba(215,244,255,0.92)'); px(12, 15, i, 'rgba(180,224,245,0.92)');
        }
        [[3, 3], [4, 3], [3, 4], [5, 5], [11, 11], [12, 11], [11, 12]].forEach(p => px(12, p[0], p[1], 'rgba(255,255,255,0.88)'));
        // 13: Classic Terracotta Bricks
        drawBricks(13, 0xa84f3a, 0xbe6149, 0x8e3d2b, 0xd4cdc2);
        // 14: Architectural Stone Bricks
        drawBricks(14, 0x848b94, 0x99a0aa, 0x6f757e, 0x525760);
        // 15: Smooth Warm Quartz
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
            const e = x === 0 || y === 0 ? 0xfbf9f5 : (x === 15 || y === 15 ? 0xdcd6cb : 0xeee9e0);
            px(15, x, y, shade(e, 0.98 + vnoise(x * 0.4, y * 0.4, 150) * 0.04));
        }
        // 16: Polished Gold Block
        drawMetal(16, 0xf2c230, 0xfff08a, 0xd49b1a, 0xa8740e);
        // 17: Deep Violet-Black Obsidian
        organicRock(17, [0x110c1c, 0x1a132c, 0x261b40, 0x38285c]);
        // 18: Warm Amber Glowstone
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
            const v = vnoise(x * 0.65, y * 0.65, 180);
            px(18, x, y, shade(v > 0.72 ? 0xfff9cc : (v > 0.45 ? 0xffd56b : (v > 0.25 ? 0xd9922b : 0x8f591a)), 1));
        }
        // 19: Glowing Cyan CV Info Block
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
            const border = x === 0 || y === 0 || x === 15 || y === 15;
            const inner = x === 1 || y === 1 || x === 14 || y === 14;
            px(19, x, y, border ? '#38f2e6' : (inner ? '#0d6073' : '#0b2238'));
        }
        [[7, 3], [8, 3], [7, 4], [8, 4], [7, 6], [8, 6], [7, 7], [8, 7], [7, 8], [8, 8], [7, 9], [8, 9], [7, 10], [8, 10], [6, 11], [7, 11], [8, 11], [9, 11]].forEach(p => px(19, p[0], p[1], '#7cfcf5'));
        // 20: Bookshelf
        drawPlanks(20, 0xb88950, 0xc99c62, 0xa2743e, 0x734e26);
        const bkCols = [0xd9463e, 0x3b82f6, 0x22c55e, 0xf59e0b, 0xa855f7, 0x06b6d4, 0xec4899];
        [2, 9].forEach(ry => {
            for (let x = 1; x < 15; x++) {
                const c = bkCols[(x * 3 + ry) % bkCols.length], h = 4 + ((x + ry) % 2);
                for (let y = ry + (5 - h); y < ry + 5; y++) px(20, x, y, shade(c, y === ry + (5 - h) ? 1.15 : 0.9));
            }
        });
        // 21: River Gravel
        organicRock(21, [0x787572, 0x8c8985, 0x9e9b96, 0xb0ada7]);
        // 22: Polished Iron Block
        drawMetal(22, 0xd8dee6, 0xf4f7fa, 0xb6bec9, 0x87909c);

        // 23-31: Architectural Concretes
        [0x08b2d6, 0x8b46e5, 0x16a34a, 0xea6d14, 0x2563eb, 0xdb2777, 0xeab308, 0xdc2626, 0x1e2430].forEach((hex, i) => drawConcrete(23 + i, hex));
        // 32-33: Soft Wool
        organicRock(32, [0xe4e8ef, 0xedf1f6, 0xf4f7fb, 0xffffff]);
        organicRock(33, [0x9f2020, 0xb82828, 0xce3232, 0xdc4242]);
        // 34-36: Ores
        drawOre(34, 0x262930, 0x3d424d);
        drawOre(35, 0xd9a77e, 0xf5cca8);
        drawOre(36, 0x38e2d8, 0x9efcf8);

        // 37: Lush Tall Grass
        clear(37);
        [[3, 9], [5, 12], [7, 10], [9, 13], [11, 11], [13, 8]].forEach((b, bi) => {
            for (let y = 16 - b[1]; y < 16; y++) {
                const sway = (y < 9 ? (bi % 2 ? 1 : -1) : 0);
                px(37, b[0] + sway, y, shade(y < 8 ? 0x6ec94b : 0x438e2f, 1));
            }
        });
        // 38-39: Poppy & Dandelion
        const drawFlower = (idx, petal, center, stem) => {
            clear(idx);
            for (let y = 8; y < 16; y++) px(idx, 7 + (y < 11 ? 0 : 1), y, shade(stem || 0x3f8f2e, 1));
            px(idx, 6, 12, '#4ea83b'); px(idx, 9, 13, '#4ea83b');
            [[7, 5], [8, 5], [6, 6], [9, 6], [6, 7], [9, 7], [7, 8], [8, 8]].forEach(p => px(idx, p[0], p[1], petal));
            px(idx, 7, 6, center); px(idx, 8, 7, center);
        };
        drawFlower(38, '#ef4444', '#1f2937');
        drawFlower(39, '#fde047', '#f59e0b');
        // 40: Alpine Spruce Pine Needles (rich deep evergreen)
        drawLeaves(40, [0x1c4a32, 0x245e3e, 0x2f754d, 0x3f8c5e], 0.72);
        // 41-42: Cactus
        fillPal(41, [0x2a7531, 0x388e3c, 0x4ca34c], (x, y) => (x === 0 || y === 0 || x === 15 || y === 15) ? 0 : ((x + y) % 3 === 0 ? 2 : 1));
        fillPal(42, [0x266b2c, 0x368a3b, 0x4aa14b], (x, y) => (x % 4 === 0) ? 0 : ((x % 4 === 2) ? 2 : 1));
        for (let y = 2; y < 15; y += 4) { px(42, 0, y, '#173d1b'); px(42, 15, y, '#173d1b'); px(42, 8, y + 1, '#173d1b'); }
        // 43-44: Sandstone
        fillPal(43, [0xd1bc82, 0xdfd099, 0xe9dca9], (x, y) => Math.floor(vnoise(x * 0.45, y * 0.45, 43) * 3));
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
            const c = y < 3 ? 0xe9dca9 : (y === 3 ? 0xb59c62 : (y > 12 ? 0xc7b074 : 0xdcc88e));
            px(44, x, y, shade(c, 0.96 + vnoise(x * 0.5, y * 0.5, 44) * 0.08));
        }
        // 45: Mossy Stone
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
            const moss = vnoise(x * 0.48, y * 0.48, 45) > 0.52;
            const seam = ((x + ((y >> 2) & 1) * 3) % 5 === 0) || (y % 4 === 0);
            px(45, x, y, shade(moss ? (seam ? 0x35692b : 0x4d8c3a) : (seam ? 0x525860 : 0x7e858f), 1));
        }
        // 46: Glowing Molten Lava
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
            const n = vnoise(x * 0.42, y * 0.42, 46);
            px(46, x, y, n > 0.72 ? '#fff4a3' : (n > 0.5 ? '#ff9f1c' : (n > 0.28 ? '#f24a12' : '#9c1b0a')));
        }
        // 47: Bedrock
        organicRock(47, [0x1c1e24, 0x2e3138, 0x41454f, 0x545963]);
        // 48: Warm Torch
        clear(48);
        for (let y = 6; y < 16; y++) { px(48, 7, y, '#855326'); px(48, 8, y, '#693e18'); }
        px(48, 7, 5, '#ff8c1a'); px(48, 8, 5, '#ff5500');
        px(48, 7, 4, '#ffe066'); px(48, 8, 4, '#ffaa22');
        px(48, 7, 3, '#fff9cc');
        // 49: Cracked Glowing Magma
        organicRock(49, [0x2a1414, 0x3b1a16, 0x4d2219, 0x5c2b1e]);
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
            const c = Math.abs(vnoise(x * 0.45, y * 0.45, 49) - 0.5);
            if (c < 0.075) px(49, x, y, c < 0.03 ? '#ffe066' : '#ff6414');
        }
        // 50-51: Basalt
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
            const col = x % 4 === 0 ? 0x2c2f38 : (x % 4 === 2 ? 0x484d59 : 0x3a3e48);
            px(50, x, y, shade(col, 0.94 + vnoise(x * 0.4, y * 0.6, 50) * 0.12));
            px(51, x, y, shade((x === 0 || y === 0 || x === 15 || y === 15) ? 0x2c2f38 : 0x464b56, 0.95 + hash2(x, y, 51) * 0.1));
        }
        // 52-53: Birch Log
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
            const dash = (y % 5 === 1 && x >= 2 && x <= 5) || (y % 5 === 3 && x >= 9 && x <= 13);
            px(52, x, y, dash ? '#363636' : shade(0xebe8df, 0.95 + hash2(x, y, 52) * 0.06));
            const r = Math.hypot(x - 7.5, y - 7.5);
            px(53, x, y, r > 6.4 ? '#d9d5cb' : shade((Math.floor(r) % 2) ? 0xcab282 : 0xb59862, 1));
        }
        // 54: Sunlit Birch Leaves
        drawLeaves(54, [0x4b8736, 0x62a344, 0x7abb54, 0x94cf69], 0.58);
        // 55-56: Cherry Bark
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
            const line = y % 4 === 2 && (x % 6 < 3);
            px(55, x, y, shade(line ? 0x693a4b : 0x40212d, 0.95 + hash2(x, y, 55) * 0.1));
            const r = Math.hypot(x - 7.5, y - 7.5);
            px(56, x, y, r > 6.4 ? '#3d1f2a' : shade((Math.floor(r) % 2) ? 0xf0b4c4 : 0xdc93a8, 1));
        }
        // 57: Sakura Cherry Blossom Leaves
        drawLeaves(57, [0xd46d9b, 0xeb8cb8, 0xf7b0d2, 0xfdd5e8], 0.65);
        // 58-59: Spruce & Cherry Planks
        drawPlanks(58, 0x735030, 0x87603b, 0x614125, 0x422a16);
        drawPlanks(59, 0xe8a7ba, 0xf5c2d1, 0xd48ca3, 0xa8647b);
        // 60-62: Gold, Redstone, Emerald Ores
        drawOre(60, 0xf2be2c, 0xfff08a);
        drawOre(61, 0xd92626, 0xff7575);
        drawOre(62, 0x10b981, 0x6ee7b7);
        // 63-64: Diamond & Emerald Blocks
        drawMetal(63, 0x4be3d8, 0xb8fff9, 0x26b5ac, 0x16807a);
        drawMetal(64, 0x18c468, 0x7ff5b4, 0x11994e, 0x0b6b36);
        // 65: Amethyst Geode Crystal
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
            const facet = ((x + y) % 5 === 0) ? 0xd8b4fe : (((x - y + 16) % 5 === 0) ? 0x7e22ce : 0xa855f7);
            px(65, x, y, shade(facet, 0.94 + hash2(x, y, 65) * 0.12));
        }
        // 66: Glacier Ice
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
            const diag = Math.abs((x - y + 16) % 10 - 5) === 0;
            px(66, x, y, diag ? 'rgba(235,248,255,0.88)' : 'rgba(130,198,248,0.72)');
        }
        // 67: Sea Lantern
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
            const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
            px(67, x, y, d > 6.2 ? '#7ab8b2' : (d > 4.2 ? '#b8f0ec' : '#ebfffe'));
        }
        // 68: Warm Redstone Lamp
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
            const e = x === 0 || y === 0 || x === 15 || y === 15 || (x === 7 && y === 7);
            const d = Math.hypot(x - 7.5, y - 7.5);
            px(68, x, y, e ? '#6b4118' : (d < 4.8 ? '#fff6bf' : '#f2b84b'));
        }
        // 69: Crying Obsidian
        organicRock(69, [0x140d24, 0x201538, 0x2c1d4d, 0x3b2666]);
        [[3, 4], [4, 4], [11, 3], [12, 4], [6, 10], [7, 10], [7, 11], [12, 12]].forEach(p => px(69, p[0], p[1], '#b866ff'));
        // 70-71: Blue Orchid & Pink Tulip
        drawFlower(70, '#38bdf8', '#e0f2fe');
        drawFlower(71, '#f472b6', '#fce7f3');
        // 72: Fern
        clear(72);
        for (let y = 4; y < 16; y++) {
            px(72, 7, y, '#2e7d32'); px(72, 8, y, '#388e3c');
            if (y % 2 === 0) { const w = Math.min(5, (y - 2) >> 1); for (let d = 1; d <= w; d++) { px(72, 7 - d, y, '#4caf50'); px(72, 8 + d, y, '#43a047'); } }
        }
        // 73: Red Mushroom
        clear(73);
        for (let y = 11; y < 16; y++) { px(73, 7, y, '#f5ebd6'); px(73, 8, y, '#e6d7bd'); }
        for (let y = 7; y < 11; y++) for (let x = 4; x < 12; x++) px(73, x, y, (x === 6 && y === 8) || (x === 10 && y === 9) ? '#fff' : '#dc2626');
        // 74: Sugar Cane
        clear(74);
        [3, 7, 11].forEach((sx, k) => { for (let y = 0; y < 16; y++) { px(74, sx, y, y % 5 === 0 ? '#9be068' : '#65b842'); px(74, sx + 1, y, '#4f9c32'); } });
        // 75-77: Corals & Seagrass
        clear(75); clear(76); clear(77);
        for (let i = 0; i < 6; i++) {
            const bx = 2 + i * 2, h = 6 + (i % 3) * 3;
            for (let y = 16 - h; y < 16; y++) {
                px(75, bx, y, y < 10 ? '#ff6b6b' : '#dc2626'); px(75, bx + 1, y, '#fca5a5');
                px(76, bx, y, y < 10 ? '#60a5fa' : '#2563eb'); px(76, bx + 1, y, '#93c5fd');
            }
        }
        for (let i = 0; i < 5; i++) { const bx = 2 + i * 3, h = 7 + (i % 2) * 4; for (let y = 16 - h; y < 16; y++) px(77, bx + ((y >> 2) % 2), y, '#2ea86f'); }
        // 78-79: Crafting Table
        drawPlanks(78, 0xb88950, 0xc99c62, 0xa2743e, 0x734e26);
        for (let i = 2; i <= 13; i++) { px(78, i, 2, '#5c3c1e'); px(78, i, 13, '#5c3c1e'); px(78, 2, i, '#5c3c1e'); px(78, 13, i, '#5c3c1e'); px(78, i, 6, '#5c3c1e'); px(78, i, 9, '#5c3c1e'); px(78, 6, i, '#5c3c1e'); px(78, 9, i, '#5c3c1e'); }
        drawPlanks(79, 0xa87a42, 0xba8b52, 0x916734, 0x6b4820);
        for (let y = 0; y < 3; y++) for (let x = 0; x < 16; x++) px(79, x, y, '#734b24');
        for (let y = 5; y < 12; y++) { px(79, 4, y, '#9ca3af'); px(79, 11, y, '#cbd5e1'); }
        // 80-81: Furnace
        organicRock(80, [0x6d727a, 0x7b8089, 0x888d96]);
        for (let y = 9; y < 14; y++) for (let x = 4; x < 12; x++) px(80, x, y, y > 11 ? '#ff7b1c' : '#241818');
        for (let y = 3; y < 6; y++) for (let x = 4; x < 12; x++) px(80, x, y, '#2b2d33');
        organicRock(81, [0x70757d, 0x7e838c, 0x8b9099]);
        // 82-83: Chest
        drawPlanks(82, 0xb27932, 0xc48b41, 0x996626, 0x694418);
        drawPlanks(83, 0xb27932, 0xc48b41, 0x996626, 0x694418);
        for (let i = 0; i < 16; i++) { [82, 83].forEach(t => { px(t, i, 0, '#4a3016'); px(t, i, 15, '#4a3016'); px(t, 0, i, '#4a3016'); px(t, 15, i, '#4a3016'); }); px(82, i, 5, '#3b2510'); }
        for (let y = 4; y < 8; y++) for (let x = 7; x < 9; x++) px(82, x, y, '#f5d04c');
        // 84-85: TNT
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) px(84, x, y, (y >= 5 && y <= 10) ? '#f1f5f9' : shade(x % 3 === 0 ? 0xa82020 : 0xdc2626, 1));
        [[3, 6], [4, 6], [5, 6], [4, 7], [4, 8], [4, 9], [7, 6], [7, 7], [7, 8], [7, 9], [8, 7], [9, 8], [9, 6], [9, 7], [9, 9], [11, 6], [12, 6], [13, 6], [12, 7], [12, 8], [12, 9]].forEach(p => px(84, p[0], p[1], '#111827'));
        organicRock(85, [0x8c1d1d, 0xa82424, 0xc42d2d]);
        // 86: Snowy Grass Side
        fillPal(86, [0x6e4a2c, 0x7d5533, 0x8a5f3b, 0x996d46], (x, y) => Math.floor(vnoise(x * 0.5, y * 0.5, 20) * 4));
        for (let x = 0; x < 16; x++) for (let y = 0; y < fringe[x]; y++) px(86, x, y, y === fringe[x] - 1 ? '#cfe3f5' : '#f4f9fc');
        // 87: Glow Vines
        clear(87);
        [3, 8, 12].forEach((vx, idx) => {
            for (let y = 0; y < 15; y++) {
                px(87, vx + ((y >> 2) % 2), y, '#2e8b40');
                if (y % 4 === 2) px(87, vx - 1, y, '#47b854');
                if ((y + idx * 3) % 6 === 4) { px(87, vx + 1, y, '#ffe066'); px(87, vx + 1, y + 1, '#ff9e2c'); }
            }
        });
        // 88-89: Blue & Green Wool
        organicRock(88, [0x2563eb, 0x3b82f6, 0x60a5fa]);
        organicRock(89, [0x16a34a, 0x22c55e, 0x4ade80]);

        /* --- Multi-Dimension Block Textures (90-110) --- */
        // 90: Netherrack
        organicRock(90, [0x4c1818, 0x632020, 0x782828, 0x8a3330]);
        // 91: Nether Bricks
        drawBricks(91, 0x3b171f, 0x4d2029, 0x2b1016, 0x1c0a0e);
        // 92: Soul Sand
        organicRock(92, [0x3d2e24, 0x4d3b2e, 0x5c4738, 0x695242]);
        [[3, 4], [5, 4], [4, 6], [10, 9], [12, 9], [11, 11]].forEach(p => px(92, p[0], p[1], '#241a14'));
        // 93: Shroomlight (Warm glowing Nether lamp)
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
            const v = vnoise(x * 0.55, y * 0.55, 93);
            px(93, x, y, v > 0.72 ? '#fff4b8' : (v > 0.44 ? '#ff9f2e' : '#d95b16'));
        }
        // 94-95: Crimson Nylium
        organicRock(94, [0x781a2c, 0x992238, 0xb82e46, 0xd43d55]);
        organicRock(95, [0x4c1818, 0x632020, 0x782828]);
        for (let x = 0; x < 16; x++) for (let y = 0; y < fringe[x]; y++) px(95, x, y, y === fringe[x] - 1 ? '#781a2c' : '#b82e46');
        // 96: Crimson Wart
        organicRock(96, [0x6e0f1e, 0x8a1628, 0xa81f35, 0xc22b44]);
        // 97-98: Warped Nylium
        organicRock(97, [0x115e59, 0x14827a, 0x1ea398, 0x2dd4bf]);
        organicRock(98, [0x4c1818, 0x632020, 0x782828]);
        for (let x = 0; x < 16; x++) for (let y = 0; y < fringe[x]; y++) px(98, x, y, y === fringe[x] - 1 ? '#115e59' : '#1ea398');
        // 99: Warped Wart
        organicRock(99, [0x0f5c63, 0x147b85, 0x1ba1ad, 0x2cc7d4]);
        // 100-102: Aether Sky Turf & Holystone
        fillPal(100, [0x38b28a, 0x4cc99e, 0x66dbb2, 0x86ebd0], (x, y) => Math.floor(vnoise(x * 0.5, y * 0.5, 100) * 4));
        organicRock(102, [0xc9d2e0, 0xd8e0ec, 0xe6ecf5, 0xf2f6fc]);
        organicRock(101, [0xc9d2e0, 0xd8e0ec, 0xe6ecf5]);
        for (let x = 0; x < 16; x++) for (let y = 0; y < fringe[x]; y++) px(101, x, y, y === fringe[x] - 1 ? '#38b28a' : '#66dbb2');
        // 103: Aercloud (Soft glowing sky cloud block)
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
            const v = vnoise(x * 0.4, y * 0.4, 103);
            px(103, x, y, v > 0.5 ? 'rgba(255,253,245,0.84)' : 'rgba(224,240,255,0.78)');
        }
        // 104: Sky Crystal
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
            const d = Math.hypot(x - 7.5, y - 7.5);
            px(104, x, y, d < 4 ? '#fffbeb' : (d < 6.5 ? '#fde047' : '#38bdf8'));
        }
        // 105: End Stone
        organicRock(105, [0xc7c48f, 0xd9d6a3, 0xe8e5b7, 0xf2f0c9]);
        // 106: Purpur Cosmic Tiles
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
            const seam = (x === 0 || y === 0 || x === 8 || y === 8);
            const hi = (x === 1 || y === 1 || x === 9 || y === 9);
            px(106, x, y, shade(seam ? 0x6b4578 : (hi ? 0xc49ad4 : 0xa374b5), 1));
        }
        // 107: Star Crystal
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
            const d = Math.hypot(x - 7.5, y - 7.5);
            px(107, x, y, d < 3.6 ? '#ffffff' : (d < 6 ? '#f0abfc' : '#818cf8'));
        }
        // 108: Cosmic Void Stone
        organicRock(108, [0x090b1a, 0x10142b, 0x181f3d, 0x222b52]);
        [[3, 4], [11, 2], [8, 10], [13, 13], [4, 12]].forEach(p => px(108, p[0], p[1], '#7dd3fc'));
        // 109: Blue Soul Torch
        clear(109);
        for (let y = 6; y < 16; y++) { px(109, 7, y, '#594230'); px(109, 8, y, '#422e20'); }
        px(109, 7, 5, '#06b6d4'); px(109, 8, 5, '#0891b2');
        px(109, 7, 4, '#67e8f9'); px(109, 8, 4, '#22d3ee');
        px(109, 7, 3, '#ecfeff');
        // 110: Deepslate
        organicRock(110, [0x393d47, 0x454a57, 0x525866, 0x606675]);

        /* --- CRITICAL: Extrude 1px edge border around EVERY tile to 100% eliminate UV seam bleeding! --- */
        for (let idx = 0; idx < 112; idx++) {
            const [ox, oy] = tileOrig(idx);
            // Top & bottom edge extrusion
            g.drawImage(cv, ox, oy, TILE, 1, ox, oy - 1, TILE, 1);
            g.drawImage(cv, ox, oy + TILE - 1, TILE, 1, ox, oy + TILE, TILE, 1);
            // Left & right edge extrusion (including corners)
            g.drawImage(cv, ox, oy - 1, 1, STRIDE, ox - 1, oy - 1, 1, STRIDE);
            g.drawImage(cv, ox + TILE - 1, oy - 1, 1, STRIDE, ox + TILE, oy - 1, 1, STRIDE);
        }

        return cv;
    }

    /* ---------- Multi-Dimension State & Active World Buffer ---------- */
    const BIOME = { PLAINS: 0, FOREST: 1, DESERT: 2, SNOW: 3, OCEAN: 4, CHERRY: 5, VOLCANO: 6 };
    const BIOME_NAMES = ['Meadow Plains', 'Oak Forest', 'Golden Desert', 'Alpine Tundra', 'Deep Ocean', 'Cherry Blossom Grove', 'Volcanic Caldera'];

    const DIM_META = {
        overworld: { id: 'overworld', name: 'Overworld', icon: '🌍', sx: 224, sy: 96, sz: 224, water: 10, base: 14, gravity: 1.0, hasSky: true, hasClouds: true },
        nether:    { id: 'nether',    name: 'The Nether', icon: '🔥', sx: 128, sy: 80, sz: 128, water: 10, base: 20, gravity: 1.0, hasSky: false, hasClouds: false },
        aether:    { id: 'aether',    name: 'Aether Sky Islands', icon: '☁️', sx: 144, sy: 88, sz: 144, water: 0, base: 28, gravity: 0.62, hasSky: true, hasClouds: true },
        cosmos:    { id: 'cosmos',    name: 'The Cosmos', icon: '🌌', sx: 144, sy: 88, sz: 144, water: 0, base: 24, gravity: 0.42, hasSky: true, hasClouds: false },
        dungeon:   { id: 'dungeon',   name: 'Abyssal Dungeon', icon: '🏰', sx: 112, sy: 64, sz: 112, water: 0, base: 12, gravity: 1.0, hasSky: false, hasClouds: false }
    };

    const dimCache = {};
    let curDim = 'overworld';
    let SX = 224, SY = 96, SZ = 224, OX = 112, OZ = 112, WATER = 10, BASE = 14;
    let data, skyLight, blockLight, heightMap, biomeMap;
    let infoMap = new Map(), infoList = [], landmarks = {}, signs = [], portals = [], shardSpots = [], dungeons = [], emitters, protectedZones = [];
    let cachedCV = null;

    function syncExports() {
        const W = window.CVW; if (!W) return;
        W.SX = SX; W.SY = SY; W.SZ = SZ; W.OX = OX; W.OZ = OZ; W.WATER = WATER; W.BASE = BASE;
        W.dim = curDim; W.dimMeta = DIM_META[curDim];
        W.data = data; W.skyLight = skyLight; W.blockLight = blockLight; W.heightMap = heightMap; W.biomeMap = biomeMap;
        W.infoMap = infoMap; W.infoList = infoList; W.landmarks = landmarks; W.signs = signs;
        W.portals = portals; W.shardSpots = shardSpots; W.dungeons = dungeons; W.emitters = emitters;
    }

    function idx(x, y, z) { return (y * SZ + (z + OZ)) * SX + (x + OX); }
    function inb(x, y, z) { return x >= -OX && x < SX - OX && z >= -OZ && z < SZ - OZ && y >= 0 && y < SY; }
    function get(x, y, z) { return inb(x, y, z) ? data[idx(x, y, z)] : (y < 0 && curDim !== 'aether' && curDim !== 'cosmos' ? B.BEDROCK : 0); }
    function setRaw(x, y, z, id) { if (inb(x, y, z)) data[idx(x, y, z)] = id; }
    function topY(x, z) {
        for (let y = SY - 1; y >= 0; y--) {
            const b = get(x, y, z);
            if (b && DEF[b].solid) return y;
        }
        return 0;
    }
    function getSkyLight(x, y, z) { return inb(x, y, z) ? skyLight[idx(x, y, z)] : (y >= SY && DIM_META[curDim].hasSky ? 15 : 0); }
    function getBlockLight(x, y, z) { return inb(x, y, z) ? blockLight[idx(x, y, z)] : 0; }

    /* ---------- Fast BFS Dual-Channel Voxel Lighting Engine ---------- */
    const QMAX = 1 << 21;
    const lightQ = new Int32Array(QMAX);
    const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

    function lightAtten(id) {
        if (!id) return 1;
        const d = DEF[id];
        if (d.opaque) return 16;
        if (d.liquid) return 2;
        if (d.cutout && id !== B.GLASS) return 2;
        return 1;
    }

    function computeLighting() {
        const VOL = SX * SY * SZ;
        skyLight.fill(0);
        blockLight.fill(0);
        let qh = 0, qt = 0;
        const push = i => { lightQ[qt] = i; qt = (qt + 1) & (QMAX - 1); };
        const pop = () => { const i = lightQ[qh]; qh = (qh + 1) & (QMAX - 1); return i; };

        if (DIM_META[curDim].hasSky) {
            const baseSky = curDim === 'cosmos' ? 11 : 15;
            for (let z = 0; z < SZ; z++) for (let x = 0; x < SX; x++) {
                let lv = baseSky;
                for (let y = SY - 1; y >= 0; y--) {
                    const i = (y * SZ + z) * SX + x, id = data[i];
                    if (id) {
                        const d = DEF[id];
                        if (d.opaque) { lv = 0; break; }
                        if (d.liquid) lv = Math.max(0, lv - 2);
                        else if (d.cutout && id !== B.GLASS) lv = Math.max(0, lv - 1);
                    }
                    skyLight[i] = lv;
                    if (lv === 0) break;
                }
            }
            for (let y = 1; y < SY - 1; y++) {
                const yOff = y * SZ * SX;
                for (let z = 1; z < SZ - 1; z++) {
                    const row = yOff + z * SX;
                    for (let x = 1; x < SX - 1; x++) {
                        const i = row + x, lv = skyLight[i];
                        if (lv <= 1) continue;
                        if (
                            (!DEF[data[i + 1]].opaque && skyLight[i + 1] < lv - 1) ||
                            (!DEF[data[i - 1]].opaque && skyLight[i - 1] < lv - 1) ||
                            (!DEF[data[i + SX]].opaque && skyLight[i + SX] < lv - 1) ||
                            (!DEF[data[i - SX]].opaque && skyLight[i - SX] < lv - 1)
                        ) push(i);
                    }
                }
            }
            while (qh !== qt) {
                const i = pop(), lv = skyLight[i]; if (lv <= 1) continue;
                const x = i % SX, rem = (i / SX) | 0, z = rem % SZ, y = (rem / SZ) | 0;
                for (let d = 0; d < 6; d++) {
                    const nx = x + DIRS[d][0], ny = y + DIRS[d][1], nz = z + DIRS[d][2];
                    if (nx < 0 || nx >= SX || ny < 0 || ny >= SY || nz < 0 || nz >= SZ) continue;
                    const ni = (ny * SZ + nz) * SX + nx, att = lightAtten(data[ni]);
                    if (att >= 16) continue;
                    const nlv = lv - att;
                    if (nlv > skyLight[ni]) { skyLight[ni] = nlv; if (nlv > 1) push(ni); }
                }
            }
        } else {
            // Nether & Dungeon have a gentle base ambient light so ceilings & architecture stay readable
            skyLight.fill(curDim === 'nether' ? 6 : 4);
        }

        // Block Light BFS
        qh = 0; qt = 0;
        for (let i = 0; i < VOL; i++) {
            const id = data[i];
            if (id && DEF[id].emit > 0) { blockLight[i] = DEF[id].emit; push(i); }
        }
        while (qh !== qt) {
            const i = pop(), lv = blockLight[i]; if (lv <= 1) continue;
            const x = i % SX, rem = (i / SX) | 0, z = rem % SZ, y = (rem / SZ) | 0;
            for (let d = 0; d < 6; d++) {
                const nx = x + DIRS[d][0], ny = y + DIRS[d][1], nz = z + DIRS[d][2];
                if (nx < 0 || nx >= SX || ny < 0 || ny >= SY || nz < 0 || nz >= SZ) continue;
                const ni = (ny * SZ + nz) * SX + nx;
                if (data[ni] && DEF[data[ni]].opaque) continue;
                const nlv = lv - 1;
                if (nlv > blockLight[ni]) { blockLight[ni] = nlv; if (nlv > 1) push(ni); }
            }
        }
    }

    function relightAround(cx, cy, cz, R) {
        R = R || 15;
        const x0 = Math.max(0, cx + OX - R), x1 = Math.min(SX - 1, cx + OX + R);
        const z0 = Math.max(0, cz + OZ - R), z1 = Math.min(SZ - 1, cz + OZ + R);
        const y0 = Math.max(0, cy - R), y1 = Math.min(SY - 1, cy + R);
        let qh = 0, qt = 0;
        const push = i => { lightQ[qt] = i; qt = (qt + 1) & (QMAX - 1); };
        const pop = () => { const i = lightQ[qh]; qh = (qh + 1) & (QMAX - 1); return i; };

        if (DIM_META[curDim].hasSky) {
            const baseSky = curDim === 'cosmos' ? 11 : 15;
            for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
                let lv = baseSky;
                for (let y = SY - 1; y >= 0; y--) {
                    const i = (y * SZ + z) * SX + x, id = data[i];
                    if (id) {
                        const d = DEF[id];
                        if (d.opaque) lv = 0;
                        else if (d.liquid) lv = Math.max(0, lv - 2);
                        else if (d.cutout && id !== B.GLASS) lv = Math.max(0, lv - 1);
                    }
                    skyLight[i] = lv;
                    if (lv > 1 && y >= y0 && y <= y1) push(i);
                }
            }
            for (let y = y0; y <= y1; y++) {
                for (let z = z0; z <= z1; z++) {
                    const iL = (y * SZ + z) * SX + Math.max(0, x0 - 1); if (skyLight[iL] > 1) push(iL);
                    const iR = (y * SZ + z) * SX + Math.min(SX - 1, x1 + 1); if (skyLight[iR] > 1) push(iR);
                }
                for (let x = x0; x <= x1; x++) {
                    const iF = (y * SZ + Math.max(0, z0 - 1)) * SX + x; if (skyLight[iF] > 1) push(iF);
                    const iB = (y * SZ + Math.min(SZ - 1, z1 + 1)) * SX + x; if (skyLight[iB] > 1) push(iB);
                }
            }
            while (qh !== qt) {
                const i = pop(), lv = skyLight[i]; if (lv <= 1) continue;
                const x = i % SX, rem = (i / SX) | 0, z = rem % SZ, y = (rem / SZ) | 0;
                for (let d = 0; d < 6; d++) {
                    const nx = x + DIRS[d][0], ny = y + DIRS[d][1], nz = z + DIRS[d][2];
                    if (nx < x0 || nx > x1 || ny < y0 || ny > y1 || nz < z0 || nz > z1) continue;
                    const ni = (ny * SZ + nz) * SX + nx, att = lightAtten(data[ni]);
                    if (att >= 16) continue;
                    const nlv = lv - att;
                    if (nlv > skyLight[ni]) { skyLight[ni] = nlv; if (nlv > 1) push(ni); }
                }
            }
        }
        qh = 0; qt = 0;
        for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
            const i = (y * SZ + z) * SX + x, id = data[i];
            if (id && DEF[id].emit > 0) { blockLight[i] = DEF[id].emit; push(i); } else blockLight[i] = 0;
        }
        for (let y = y0; y <= y1; y++) {
            for (let z = z0; z <= z1; z++) {
                const iL = (y * SZ + z) * SX + Math.max(0, x0 - 1); if (blockLight[iL] > 1) push(iL);
                const iR = (y * SZ + z) * SX + Math.min(SX - 1, x1 + 1); if (blockLight[iR] > 1) push(iR);
            }
            for (let x = x0; x <= x1; x++) {
                const iF = (y * SZ + Math.max(0, z0 - 1)) * SX + x; if (blockLight[iF] > 1) push(iF);
                const iB = (y * SZ + Math.min(SZ - 1, z1 + 1)) * SX + x; if (blockLight[iB] > 1) push(iB);
            }
        }
        while (qh !== qt) {
            const i = pop(), lv = blockLight[i]; if (lv <= 1) continue;
            const x = i % SX, rem = (i / SX) | 0, z = rem % SZ, y = (rem / SZ) | 0;
            for (let d = 0; d < 6; d++) {
                const nx = x + DIRS[d][0], ny = y + DIRS[d][1], nz = z + DIRS[d][2];
                if (nx < x0 || nx > x1 || ny < y0 || ny > y1 || nz < z0 || nz > z1) continue;
                const ni = (ny * SZ + nz) * SX + nx;
                if (data[ni] && DEF[data[ni]].opaque) continue;
                const nlv = lv - 1;
                if (nlv > blockLight[ni]) { blockLight[ni] = nlv; if (nlv > 1) push(ni); }
            }
        }
    }

    /* ---------- Common Building Primitives ---------- */
    function box(x0, y0, z0, x1, y1, z1, b) {
        const ax = Math.min(x0, x1), bx = Math.max(x0, x1), ay = Math.min(y0, y1), by = Math.max(y0, y1), az = Math.min(z0, z1), bz = Math.max(z0, z1);
        for (let y = ay; y <= by; y++) for (let z = az; z <= bz; z++) for (let x = ax; x <= bx; x++) setRaw(x, y, z, b);
    }
    function hollow(x0, y0, z0, x1, y1, z1, b) {
        for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++)
            if (x === x0 || x === x1 || y === y0 || y === y1 || z === z0 || z === z1) setRaw(x, y, z, b);
    }
    function pad(x0, z0, x1, z1, y, topB, fillB, clearH) {
        for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
            for (let yy = Math.max(1, y - 6); yy < y; yy++) setRaw(x, yy, z, fillB);
            setRaw(x, y, z, topB);
            for (let yy = y + 1; yy <= y + (clearH || 14); yy++) setRaw(x, yy, z, B.AIR);
        }
    }
    function hline(x0, z0, x1, z1, y, b, border, w) {
        const dx = x1 - x0, dz = z1 - z0, n = Math.max(Math.abs(dx), Math.abs(dz));
        for (let i = 0; i <= n; i++) {
            const x = Math.round(x0 + dx * i / (n || 1)), z = Math.round(z0 + dz * i / (n || 1));
            for (let a = -w; a <= w; a++) for (let c = -w; c <= w; c++) {
                setRaw(x + a, y, z + c, (Math.abs(a) === w || Math.abs(c) === w) ? (border || b) : b);
                for (let yy = y + 1; yy <= y + 6; yy++) setRaw(x + a, yy, z + c, B.AIR);
            }
        }
    }
    function addSign(text, x, y, z, color, size) { signs.push({ text, x: x + 0.5, y, z: z + 0.5, color: color || '#ffffff', size: size || 1 }); }
    function addInfo(x, y, z, type, id, label) {
        setRaw(x, y, z, B.INFO);
        const o = { x, y, z, type, id, label };
        infoMap.set(x + ',' + y + ',' + z, o); infoList.push(o);
    }
    function placeTorch(x, y, z, soul) {
        setRaw(x, y, z, soul ? B.SOUL_TORCH : B.TORCH);
        emitters.torches.push([x + 0.5, y + 0.72, z + 0.5, soul ? 1 : 0]);
    }
    function protect(x0, z0, x1, z1) { protectedZones.push([Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)]); }
    function isProtected(x, y, z) {
        for (let i = 0; i < protectedZones.length; i++) {
            const p = protectedZones[i];
            if (x >= p[0] && x <= p[2] && z >= p[1] && z <= p[3]) return true;
        }
        return false;
    }

    function buildPortalFrame(cx, y0, cz, w, h, frameA, frameB, accent, id, toDim, toSpot, label, sub, colA, colB, signCol) {
        const hw = Math.floor(w / 2);
        for (let dy = 0; dy < h; dy++) for (let dx = -hw; dx <= hw; dx++) {
            const edge = dy === 0 || dy === h - 1 || dx === -hw || dx === hw;
            setRaw(cx + dx, y0 + dy, cz, edge ? ((dx + dy) % 2 === 0 ? frameA : frameB) : B.AIR);
        }
        if (accent) {
            setRaw(cx - hw - 1, y0, cz, accent); setRaw(cx + hw + 1, y0, cz, accent);
            placeTorch(cx - hw - 1, y0 + 1, cz, toDim === 'cosmos' || toDim === 'aether');
            placeTorch(cx + hw + 1, y0 + 1, cz, toDim === 'cosmos' || toDim === 'aether');
        }
        addSign(label, cx, y0 + h + 1.5, cz, signCol || '#ffffff', 1.25);
        if (sub) addSign(sub, cx, y0 + h + 0.55, cz, '#d8e4f5', 0.7);
        portals.push({
            id, toDim, toSpot,
            x: cx, y: y0 + h / 2, z: cz,
            w: w - 2, h: h - 2,
            colorA: colA, colorB: colB
        });
    }

    /* ========================================================================
       DIMENSION 1: OVERWORLD (Sculpted Alpine Peaks, Lush Biomes, CV Districts, 4 Dimensional Gateways!)
       ======================================================================== */
    const sstep = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };

    function biomeAt(x, z) {
        const r = Math.hypot(x, z);
        if (r < 48) return BIOME.FOREST;
        if (Math.hypot(x - 64, z + 56) < 26) return BIOME.VOLCANO;
        if (Math.hypot(x + 58, z - 44) < 30) return BIOME.CHERRY;
        if (Math.hypot(x - 64, z - 52) < 32) return BIOME.DESERT;
        if (Math.hypot(x + 56, z + 54) < 38) return BIOME.SNOW;
        const t = vnoise(x * 0.015 + 50, z * 0.015, 101);
        const m = vnoise(x * 0.018, z * 0.018 + 80, 202);
        if (t < 0.34) return BIOME.SNOW;
        if (t > 0.66 && m < 0.54) return BIOME.DESERT;
        if (m > 0.54) return BIOME.FOREST;
        return BIOME.PLAINS;
    }

    function terrainHeight(x, z) {
        const n = fbm(x, z, 11);
        let h = 11 + n * 15;

        // Smooth central CV valley
        const d = Math.hypot(x * 0.85, z * 0.85);
        const flat = 1 - sstep((d - 42) / 15);
        h = h * (1 - flat) + BASE * flat;

        // Outer wilderness: graceful rolling ridges & tapered mountains (NEVER flat-topped!)
        const r = Math.hypot(x, z), w = sstep((r - 50) / 22);
        if (w > 0) {
            const bio = biomeAt(x, z);
            let hf = 12 + n * 14 + vnoise(x * 0.09, z * 0.09, 77) * 3;
            const ridge = 1 - Math.abs(vnoise(x * 0.022, z * 0.022 + 500, 303) * 2 - 1);
            if (ridge > 0.52) {
                const amp = bio === BIOME.DESERT ? 18 : (bio === BIOME.SNOW ? 42 : 30);
                hf += Math.pow((ridge - 0.52) / 0.48, 1.75) * amp;
            }
            const cov = vnoise(x * 0.018 + 300, z * 0.018, 404);
            if (cov < 0.30) hf -= (0.30 - cov) * 42;
            h = h * (1 - w) + hf * w;
        }

        // NW Secret Alpine Peak (-56, -54): smooth conical mountain peaking cleanly at ~54 (well below SY=96!)
        const md = Math.hypot(x + 56, z + 54);
        if (md < 30) {
            const peak = 18 + Math.pow(1 - md / 30, 1.45) * 36 + vnoise(x * 0.12, z * 0.12, 91) * 3.5;
            h = Math.max(h, peak);
        }

        // NE Volcanic Caldera (64, -56): sloped obsidian cone + molten crater lake
        const vd = Math.hypot(x - 64, z + 56);
        if (vd < 26) {
            if (vd > 11) {
                const rim = 16 + Math.sin(((vd - 11) / 15) * Math.PI) * 22;
                h = Math.max(h, rim);
            } else {
                h = Math.min(h, 8 + (vd / 11) * 7);
            }
        }

        // Lakes & Bays
        const ld = Math.hypot(x - 52, z - 12);
        if (ld < 10) h = Math.min(h, 6 - (1 - ld / 10) * 3);
        const cherryPond = Math.hypot(x + 58, z - 44);
        if (cherryPond < 7) h = Math.min(h, 8 - (1 - cherryPond / 7) * 2);
        const bay = Math.hypot(x + 84, z - 4);
        if (bay < 22) h = Math.min(h, 4 + (bay / 22) * 5);

        // Smooth natural beach slope into Ocean around ENTIRE island perimeter (so island seamlessly joins infinite ocean skirt!)
        const edge = Math.max(Math.abs(x), Math.abs(z));
        if (edge > 78) {
            const k = sstep((edge - 78) / 24);
            h = h * (1 - k) + 4 * k;
        }
        return Math.max(2, Math.min(SY - 18, Math.round(h)));
    }

    function buildOverworld(CV) {
        const rnd = mulberry32(2026);
        const rawH = new Int16Array(SX * SZ);
        for (let z = 0; z < SZ; z++) for (let x = 0; x < SX; x++) {
            rawH[z * SX + x] = terrainHeight(x - OX, z - OZ);
        }
        // Smooth slope helper: check steepest neighbor drop
        const slopeAt = (ix, iz) => {
            const h = rawH[iz * SX + ix];
            let s = 0;
            if (ix > 0) s = Math.max(s, Math.abs(rawH[iz * SX + ix - 1] - h));
            if (ix < SX - 1) s = Math.max(s, Math.abs(rawH[iz * SX + ix + 1] - h));
            if (iz > 0) s = Math.max(s, Math.abs(rawH[(iz - 1) * SX + ix] - h));
            if (iz < SZ - 1) s = Math.max(s, Math.abs(rawH[(iz + 1) * SX + ix] - h));
            return s;
        };

        data.fill(0);
        for (let x = -OX; x < SX - OX; x++) for (let z = -OZ; z < SZ - OZ; z++) {
            const ix = x + OX, iz = z + OZ;
            const h = rawH[iz * SX + ix], slp = slopeAt(ix, iz);
            const bio = biomeAt(x, z), r = Math.hypot(x, z);
            heightMap[iz * SX + ix] = h;
            biomeMap[iz * SX + ix] = h <= WATER ? BIOME.OCEAN : bio;
            const beach = h <= WATER + 1 && bio !== BIOME.VOLCANO;
            const steep = slp >= 2;
            const mouth = r > 52 && vnoise(x * 0.032 + 900, z * 0.032, 606) > 0.63 && h > WATER + 3;
            const caveTop = mouth ? h : h - 4;

            for (let y = 0; y <= h; y++) {
                let b = B.STONE;
                if (y === 0) b = B.BEDROCK;
                else if (y === 1 && hash3(x, y, z, 19) < 0.5) b = B.BEDROCK;
                else if (y < 7) b = B.DEEPSLATE;
                else if (y === h) {
                    if (bio === BIOME.VOLCANO) b = (y <= 11 ? B.MAGMA : (hash2(x, z, 71) > 0.72 ? B.OBSIDIAN : B.BASALT));
                    else if (beach) b = B.SAND;
                    else if (steep) b = (y > 42 && slp === 2 && hash2(x, z, 53) > 0.65) ? B.COBBLE : B.STONE; // Clean rocky cliffs — ZERO white polka dots!
                    else if (h > 44) b = B.SNOW;
                    else if (bio === BIOME.DESERT) b = B.SAND;
                    else if (bio === BIOME.SNOW) b = (h > 21 ? B.SNOW : B.SNOW_GRASS);
                    else b = B.GRASS;
                } else if (y >= h - 3) {
                    if (bio === BIOME.VOLCANO) b = B.BASALT;
                    else if (beach) b = B.SAND;
                    else if (steep || h > 38) b = (y % 5 === 0 ? B.COBBLE : B.STONE); // Natural cliff rock strata
                    else b = bio === BIOME.DESERT ? B.SANDSTONE : B.DIRT;
                } else {
                    const hh = hash3(x, y, z, 31);
                    if (y < 52 && hh < 0.015) b = B.COAL;
                    else if (y < 34 && hh > 0.990) b = B.IRON;
                    else if (y < 18 && hh > 0.985 && hh <= 0.9885) b = B.GOLD_ORE;
                    else if (y < 14 && hh > 0.9970) b = B.DIAMOND;
                    else if (y < 16 && hh > 0.9950 && hh <= 0.9965) b = B.REDSTONE_ORE;
                    else if (y < 26 && bio === BIOME.SNOW && hh > 0.9935 && hh <= 0.9948) b = B.EMERALD;
                    else if (y < 18 && hh > 0.980 && hh <= 0.983) b = B.GRAVEL;
                }

                // 3D Caves with deep lava pools
                if (y > 2 && y <= caveTop && r > 46 && b !== B.SAND && bio !== BIOME.VOLCANO) {
                    const a1 = vnoise3(x * 0.065, y * 0.095, z * 0.065, 5);
                    const a2 = vnoise3(x * 0.065 + 100, y * 0.095, z * 0.065 + 100, 6);
                    const cavern = vnoise3(x * 0.042, y * 0.068, z * 0.042, 9);
                    if ((Math.abs(a1 - 0.5) < 0.052 && Math.abs(a2 - 0.5) < 0.052) || (cavern > 0.73 && y < h - 5)) {
                        if (y <= 4) {
                            b = B.LAVA;
                            if (y === 4 && hash2(x, z, 88) < 0.06) emitters.lava.push([x + 0.5, y + 1.0, z + 0.5]);
                        } else b = B.AIR;
                    }
                }
                setRaw(x, y, z, b);
            }

            // Fill water or caldera lava
            if (bio === BIOME.VOLCANO && h < 11) {
                for (let y = h + 1; y <= 11; y++) setRaw(x, y, z, B.LAVA);
                if (hash2(x, z, 99) < 0.08) emitters.lava.push([x + 0.5, 12.0, z + 0.5]);
            } else if (h < WATER) {
                for (let y = h + 1; y <= WATER; y++) setRaw(x, y, z, B.WATER);
            }
        }

        // Lush cave amethyst pockets & hanging glow vines
        for (let x = -OX + 14; x < SX - OX - 14; x += 2) for (let z = -OZ + 14; z < SZ - OZ - 14; z += 2) {
            if (Math.hypot(x, z) < 52) continue;
            for (let y = 7; y < 22; y++) {
                if (get(x, y, z) === B.AIR && get(x, y + 1, z) === B.STONE) {
                    const h3 = hash3(x, y, z, 412);
                    if (h3 < 0.022) {
                        const vl = 2 + ((h3 * 200) | 0) % 3;
                        for (let k = 0; k < vl; k++) if (get(x, y - k, z) === B.AIR) setRaw(x, y - k, z, B.GLOW_VINE);
                    } else if (h3 > 0.992) {
                        setRaw(x, y + 1, z, B.AMETHYST);
                        if (get(x + 1, y + 1, z) === B.STONE) setRaw(x + 1, y + 1, z, B.AMETHYST);
                    }
                }
            }
        }

        /* --- CV Buildings & Paths --- */
        const P = (a, b) => hline(a[0], a[1], b[0], b[1], BASE, B.STONEBRICK, B.QUARTZ, 1);
        P([0, 9], [0, 35]); P([0, -9], [0, -13]); P([-9, 0], [-16, 0]);
        P([9, 0], [12, 0]); P([12, 0], [12, 16]); P([9, -5], [20, -18]); P([-5, 9], [-18, 20]);

        // Spawn Plaza + Grand Dimensional Gateways Ring!
        pad(-9, -9, 9, 9, BASE, B.QUARTZ, B.STONE, 20);
        protect(-11, -11, 11, 11);
        for (let x = -8; x <= 8; x++) for (let z = -8; z <= 8; z++) {
            const d = Math.hypot(x, z);
            if (d < 8.5 && d > 7.3) setRaw(x, BASE, z, B.C_CYAN);
            else if (d < 3.4 && d > 2.3) setRaw(x, BASE, z, B.GOLD);
        }
        box(-2, BASE + 1, -2, 2, BASE + 1, 2, B.STONEBRICK);
        box(-1, BASE + 1, -1, 1, BASE + 1, 1, B.WATER);
        box(0, BASE + 1, 0, 0, BASE + 4, 0, B.QUARTZ);
        setRaw(0, BASE + 5, 0, B.SEA_LANTERN);
        [[-7, -7], [7, -7], [-7, 7], [7, 7]].forEach(p => {
            box(p[0], BASE + 1, p[1], p[0], BASE + 4, p[1], B.QUARTZ);
            setRaw(p[0], BASE + 5, p[1], B.SEA_LANTERN);
        });
        addSign('PHAN VAN BANG — CV WORLD', 0, BASE + 8.6, 0, '#38bdf8', 1.9);
        addSign('AI Engineer · Explore 6 CV Districts + 4 Portal Dimensions!', 0, BASE + 7.2, 0, '#e2e8f0', 0.9);
        landmarks.spawn = { x: 0, z: 6, y: BASE + 1 };

        // Grand Portal Sanctuary right beside Spawn (x=-12..-26, z=-16..-24) so players can IMMEDIATELY see & enter all 4 extra realms!
        const pgx = -16, pgz = -18;
        pad(pgx - 7, pgz - 5, pgx + 7, pgz + 5, BASE, B.STONEBRICK, B.STONE, 16);
        protect(pgx - 8, pgz - 6, pgx + 8, pgz + 6);
        P([-8, -8], [pgx + 5, pgz + 4]);
        addSign('DIMENSIONAL GATEWAYS', pgx, BASE + 8.2, pgz, '#fde047', 1.4);
        // 4 Iconic Realms Portals side-by-side!
        buildPortalFrame(pgx - 5, BASE + 1, pgz - 3, 5, 5, B.OBSIDIAN, B.CRYING_OBS, B.MAGMA, 'gate_nether', 'nether', 'spawn', 'THE NETHER', 'Lava & Fortress', [1.0, 0.25, 0.05], [0.8, 0.08, 0.95], '#ff7b29');
        buildPortalFrame(pgx + 5, BASE + 1, pgz - 3, 5, 5, B.GLOW, B.QUARTZ, B.SKY_CRYSTAL, 'gate_aether', 'aether', 'spawn', 'SKY ISLANDS', 'Floating Aether', [0.2, 0.85, 1.0], [1.0, 0.92, 0.45], '#7dd3fc');
        buildPortalFrame(pgx - 5, BASE + 1, pgz + 3, 5, 5, B.END_STONE, B.PURPUR, B.STAR_CRYSTAL, 'gate_cosmos', 'cosmos', 'spawn', 'THE COSMOS', 'Low-G Nebula', [0.45, 0.15, 0.95], [0.15, 0.85, 0.95], '#c084fc');
        buildPortalFrame(pgx + 5, BASE + 1, pgz + 3, 5, 5, B.MOSSY, B.EMERALD_BLOCK, B.LAMP, 'gate_dungeon', 'dungeon', 'spawn', 'ABYSSAL DUNGEON', 'Vaults & Monsters', [0.08, 0.82, 0.45], [0.05, 0.4, 0.35], '#34d399');

        // 1. About Tower (0, -22) — Clean staircase opening through BASE+7
        {
            const cx = 0, cz = -22;
            pad(cx - 7, cz - 7, cx + 7, cz + 7, BASE, B.STONEBRICK, B.STONE, 22);
            protect(cx - 8, cz - 8, cx + 8, cz + 8);
            hollow(cx - 5, BASE + 1, cz - 5, cx + 5, BASE + 7, cz + 5, B.QUARTZ);
            box(cx - 4, BASE + 2, cz - 4, cx + 4, BASE + 6, cz + 4, B.AIR);
            box(cx - 1, BASE + 1, cz + 5, cx + 1, BASE + 4, cz + 5, B.AIR);
            for (let dx = -3; dx <= 3; dx += 2) { setRaw(cx + dx, BASE + 3, cz - 5, B.GLASS); setRaw(cx + dx, BASE + 4, cz - 5, B.GLASS); }
            for (let dz = -3; dz <= 3; dz += 2) { setRaw(cx - 5, BASE + 3, cz + dz, B.GLASS); setRaw(cx + 5, BASE + 3, cz + dz, B.GLASS); }
            hollow(cx - 4, BASE + 8, cz - 4, cx + 4, BASE + 13, cz + 4, B.C_CYAN);
            box(cx - 3, BASE + 8, cz - 3, cx + 3, BASE + 12, cz + 3, B.AIR);
            for (let dx = -2; dx <= 2; dx++) { setRaw(cx + dx, BASE + 10, cz + 4, B.GLASS); setRaw(cx + dx, BASE + 10, cz - 4, B.GLASS); }
            for (let dz = -2; dz <= 2; dz++) { setRaw(cx - 4, BASE + 10, cz + dz, B.GLASS); setRaw(cx + 4, BASE + 10, cz + dz, B.GLASS); }
            box(cx - 5, BASE + 14, cz - 5, cx + 5, BASE + 14, cz + 5, B.QUARTZ);
            setRaw(cx, BASE + 15, cz, B.GOLD); setRaw(cx, BASE + 16, cz, B.SEA_LANTERN);
            for (let i = 0; i < 6; i++) { setRaw(cx + 3, BASE + 1 + i, cz - 3 + i, B.PLANKS); setRaw(cx + 3, BASE + 2 + i, cz - 3 + i, B.AIR); setRaw(cx + 3, BASE + 3 + i, cz - 3 + i, B.AIR); }
            box(cx + 3, BASE + 7, cz + 1, cx + 3, BASE + 7, cz + 3, B.AIR);
            box(cx - 4, BASE + 1, cz - 4, cx - 4, BASE + 4, cz + 2, B.BOOKSHELF);
            setRaw(cx - 4, BASE + 5, cz - 4, B.LAMP); setRaw(cx + 4, BASE + 5, cz - 4, B.LAMP);
            setRaw(cx - 3, BASE + 12, cz - 3, B.SEA_LANTERN); setRaw(cx + 3, BASE + 12, cz + 3, B.SEA_LANTERN);
            setRaw(cx, BASE + 1, cz - 1, B.QUARTZ); addInfo(cx, BASE + 2, cz - 1, 'about', 'about', 'About Me');
            setRaw(cx, BASE + 8, cz - 1, B.GOLD); addInfo(cx, BASE + 9, cz - 1, 'goals', 'goals', 'Career Goals');
            addSign('ABOUT ME', cx, BASE + 18.2, cz, '#38bdf8', 1.6);
            addSign('2F: Career Goals', cx, BASE + 16.9, cz, '#bae6fd', 0.8);
            landmarks.about = { x: cx, z: cz + 8, y: BASE + 1 };
        }

        // 2. Skills Garden (-28, 0)
        {
            const cx = -28, cz = 0;
            pad(cx - 12, cz - 12, cx + 12, cz + 12, BASE, B.GRASS, B.DIRT, 16);
            protect(cx - 13, cz - 13, cx + 13, cz + 13);
            for (let a = 0; a < 64; a++) {
                const ang = a / 64 * Math.PI * 2;
                setRaw(cx + Math.round(Math.cos(ang) * 11), BASE + 1, cz + Math.round(Math.sin(ang) * 11), B.LEAVES);
            }
            box(cx + 10, BASE + 1, cz - 2, cx + 12, BASE + 3, cz + 2, B.AIR);
            setRaw(cx + 11, BASE + 2, cz - 3, B.LAMP); setRaw(cx + 11, BASE + 2, cz + 3, B.LAMP);
            box(cx - 2, BASE, cz - 2, cx + 2, BASE, cz + 2, B.WATER);
            setRaw(cx, BASE + 1, cz, B.SEA_LANTERN);
            CV.skills.forEach((sk, i) => {
                const ang = (i / CV.skills.length) * Math.PI * 2;
                const px = cx + Math.round(Math.cos(ang) * 7.8), pz = cz + Math.round(Math.sin(ang) * 7.8);
                const col = CONCRETE_BY_NAME[sk.color] || B.C_CYAN;
                box(px, BASE + 1, pz, px, BASE + 2, pz, col);
                addInfo(px, BASE + 3, pz, 'skill', i, sk.cat);
                addSign(sk.cat, px, BASE + 4.4, pz, '#d8b4fe', 0.65);
            });
            addSign('SKILLS GARDEN', cx, BASE + 8.5, cz, '#a855f7', 1.6);
            landmarks.skills = { x: cx + 10, z: cz, y: BASE + 1 };
        }

        // 3. Experience Hall (-18, 28)
        {
            const cx = -18, cz = 28;
            pad(cx - 10, cz - 8, cx + 10, cz + 8, BASE, B.STONEBRICK, B.STONE, 18);
            protect(cx - 11, cz - 9, cx + 11, cz + 9);
            hollow(cx - 8, BASE + 1, cz - 6, cx + 8, BASE + 8, cz + 6, B.C_BLUE);
            box(cx - 7, BASE + 2, cz - 5, cx + 7, BASE + 7, cz + 5, B.AIR);
            box(cx - 2, BASE + 1, cz - 6, cx + 2, BASE + 4, cz - 6, B.AIR);
            for (let dx = -6; dx <= 6; dx += 3) { setRaw(cx + dx, BASE + 4, cz + 6, B.GLASS); setRaw(cx + dx, BASE + 5, cz + 6, B.GLASS); }
            for (let x = cx - 8; x <= cx + 8; x++) setRaw(x, BASE + 9, cz - 6, B.GOLD);
            setRaw(cx - 5, BASE + 7, cz, B.SEA_LANTERN); setRaw(cx + 5, BASE + 7, cz, B.SEA_LANTERN);
            setRaw(cx, BASE + 7, cz - 3, B.LAMP); setRaw(cx, BASE + 7, cz + 3, B.LAMP);
            CV.experience.forEach((ex, i) => {
                const px = cx + (i === 0 ? -4 : 4);
                box(px - 1, BASE + 1, cz + 2, px + 1, BASE + 1, cz + 2, B.GOLD);
                addInfo(px, BASE + 2, cz + 2, 'exp', i, ex.role);
                addSign(ex.role + ' @ ' + ex.org, px, BASE + 3.8, cz + 2, '#93c5fd', 0.72);
            });
            addSign('EXPERIENCE HALL', cx, BASE + 11.2, cz, '#3b82f6', 1.6);
            landmarks.experience = { x: cx, z: cz - 8, y: BASE + 1 };
        }

        // 4. Projects District (30, 16)
        {
            const cx = 30, cz = 16;
            pad(cx - 19, cz - 18, cx + 19, cz + 26, BASE, B.STONEBRICK, B.STONE, 16);
            protect(cx - 20, cz - 19, cx + 20, cz + 27);
            box(cx - 1, BASE, cz - 18, cx + 1, BASE, cz + 25, B.QUARTZ);
            box(cx - 18, BASE, cz - 1, cx + 18, BASE, cz + 1, B.QUARTZ);
            const catCol = { 'AI Platform': B.C_CYAN, 'AI Systems': B.C_PURPLE, 'Voice AI': B.C_PINK, 'Production AI': B.C_GREEN, 'Computer Vision': B.C_ORANGE, 'Hardware': B.C_YELLOW, 'FinTech': B.C_BLUE, 'Media AI': B.C_RED, 'Game Dev': B.C_PURPLE, 'Mobile': B.C_CYAN, 'Web': B.C_GREEN };
            CV.projects.forEach((pr, i) => {
                const col = i % 4, row = (i / 4) | 0;
                const px = cx - 14 + col * 9 + (col >= 2 ? 2 : 0);
                const pz = cz - 14 + row * 8 + (row >= 2 ? 2 : 0);
                const cb = catCol[pr.cat] || CONCRETE_LIST[i % CONCRETE_LIST.length];
                box(px - 2, BASE + 1, pz - 2, px + 2, BASE + 1, pz + 2, cb);
                for (let dx of [-2, 2]) for (let dz of [-2, 2]) box(px + dx, BASE + 2, pz + dz, px + dx, BASE + 4, pz + dz, B.QUARTZ);
                box(px - 2, BASE + 5, pz - 2, px + 2, BASE + 5, pz + 2, cb);
                setRaw(px, BASE + 4, pz, B.SEA_LANTERN);
                addInfo(px, BASE + 2, pz, 'project', i, pr.name);
                addSign(pr.n + ' ' + pr.name, px, BASE + 6.4, pz, '#ffffff', 0.62);
            });
            addSign('PROJECTS DISTRICT (18)', cx, BASE + 10.6, cz, '#f59e0b', 1.7);
            landmarks.projects = { x: cx - 18, z: cz, y: BASE + 1 };
        }

        // 5. Education Campus (30, -18)
        {
            const cx = 30, cz = -18;
            pad(cx - 9, cz - 8, cx + 9, cz + 8, BASE, B.GRASS, B.DIRT, 18);
            protect(cx - 10, cz - 9, cx + 10, cz + 9);
            hollow(cx - 7, BASE + 1, cz - 5, cx + 7, BASE + 7, cz + 5, B.BRICK);
            box(cx - 6, BASE + 2, cz - 4, cx + 6, BASE + 6, cz + 4, B.AIR);
            box(cx - 7, BASE + 1, cz - 2, cx - 7, BASE + 4, cz + 2, B.AIR);
            for (let dx = -5; dx <= 5; dx += 2) { setRaw(cx + dx, BASE + 3, cz - 5, B.GLASS); setRaw(cx + dx, BASE + 3, cz + 5, B.GLASS); }
            for (let y = 0; y < 4; y++) box(cx - 7 + y, BASE + 8 + y, cz - 5 + y, cx + 7 - y, BASE + 8 + y, cz + 5 - y, B.C_RED);
            box(cx + 5, BASE + 1, cz - 4, cx + 5, BASE + 5, cz + 4, B.BOOKSHELF);
            setRaw(cx, BASE + 6, cz, B.LAMP);
            addInfo(cx, BASE + 2, cz - 2, 'edu', 'edu', 'Education');
            addInfo(cx, BASE + 2, cz + 2, 'certs', 'certs', 'Certifications & Languages');
            addInfo(cx + 3, BASE + 2, cz, 'soft', 'soft', 'Soft Skills');
            addSign('VKU CAMPUS', cx, BASE + 13.4, cz, '#22c55e', 1.6);
            landmarks.education = { x: cx - 9, z: cz, y: BASE + 1 };
        }

        // 6. Contact Portal (0, 44)
        {
            const cx = 0, cz = 44;
            pad(cx - 9, cz - 8, cx + 9, cz + 8, BASE, B.STONEBRICK, B.STONE, 20);
            protect(cx - 10, cz - 9, cx + 10, cz + 9);
            for (let y = 0; y < 7; y++) for (let x = -3; x <= 3; x++) {
                if (y === 0 || y === 6 || x === -3 || x === 3) setRaw(cx + x, BASE + 1 + y, cz + 3, (x + y) % 2 ? B.OBSIDIAN : B.CRYING_OBS);
            }
            [[-4, 3], [4, 3]].forEach(p => { box(cx + p[0], BASE + 1, cz + p[1], cx + p[0], BASE + 3, cz + p[1], B.OBSIDIAN); setRaw(cx + p[0], BASE + 4, cz + p[1], B.AMETHYST); placeTorch(cx + p[0], BASE + 5, cz + p[1]); });
            box(cx - 1, BASE + 1, cz - 2, cx + 1, BASE + 1, cz - 2, B.GOLD);
            addInfo(cx, BASE + 2, cz - 2, 'contact', 'contact', 'Contact');
            box(cx + 5, BASE + 1, cz - 3, cx + 5, BASE + 2, cz - 3, B.C_RED); addInfo(cx + 5, BASE + 3, cz - 3, 'cvdl', 'cvdl', 'Download CV');
            box(cx - 5, BASE + 1, cz - 3, cx - 5, BASE + 2, cz - 3, B.C_BLUE); addInfo(cx - 5, BASE + 3, cz - 3, 'hire', 'hire', 'Hire Me');
            addSign('CONTACT PORTAL', cx, BASE + 9.4, cz + 3, '#ec4899', 1.8);
            const portal = { id: 'contact', x: cx, y: BASE + 4, z: cz + 3, w: 5, h: 5, colorA: [0.55, 0.1, 0.9], colorB: [1.0, 0.25, 0.72] };
            portals.push(portal);
            landmarks.contact = { x: cx, z: cz - 6, y: BASE + 1, portal };
        }

        // 7. Volcanic Caldera Portal -> Warps to THE NETHER!
        {
            const cx = 64, cz = -56, y = 13;
            pad(cx - 5, cz - 5, cx + 5, cz + 5, y, B.OBSIDIAN, B.BASALT, 16);
            protect(cx - 6, cz - 6, cx + 6, cz + 6);
            box(cx - 1, y, cz + 5, cx + 1, y, cz + 17, B.BASALT);
            for (let z = cz + 6; z <= cz + 16; z += 3) { placeTorch(cx - 1, y + 1, z); placeTorch(cx + 1, y + 1, z); }
            setRaw(cx, y + 1, cz + 2, B.CHEST);
            buildPortalFrame(cx, y + 1, cz - 2, 5, 6, B.OBSIDIAN, B.CRYING_OBS, B.MAGMA, 'volcano_nether', 'nether', 'spawn', 'NETHER PORTAL', 'Enter The Nether Dimension', [1.0, 0.28, 0.06], [0.78, 0.08, 0.95], '#ff7b29');
            landmarks.volcano = { x: cx, z: cz + 9, y: y + 1 };
        }

        // 8. Secret Alpine Summit -> Warps to AETHER SKY ISLANDS!
        {
            const cx = -56, cz = -54;
            let top = 0;
            for (let x = cx - 4; x <= cx + 4; x++) for (let z = cz - 4; z <= cz + 4; z++) top = Math.max(top, topY(x, z));
            top = Math.min(top, SY - 18);
            pad(cx - 5, cz - 5, cx + 5, cz + 5, top, B.SNOW, B.STONE, 14);
            protect(cx - 6, cz - 6, cx + 6, cz + 6);
            box(cx - 1, top + 1, cz - 1, cx + 1, top + 1, cz + 1, B.DIAMOND_BLOCK);
            setRaw(cx, top + 2, cz, B.GOLD); addInfo(cx, top + 3, cz, 'secret', 'secret', 'Secret Summit');
            buildPortalFrame(cx, top + 1, cz - 4, 5, 5, B.GLOW, B.QUARTZ, B.SKY_CRYSTAL, 'summit_aether', 'aether', 'spawn', 'AETHER SKY PORTAL', 'Ascend to Floating Sky Islands', [0.22, 0.85, 1.0], [1.0, 0.92, 0.45], '#7dd3fc');
            addSign('SECRET SUMMIT', cx, top + 7.6, cz, '#4ff2e4', 1.45);
            landmarks.secret = { x: cx + 4, z: cz + 4, y: top + 1 };
        }

        // 9. Desert Temple, Cherry Torii Shrine, Harbor Lighthouse, Alpine Waterfall
        const reserved = [];
        {
            const cx = 66, cz = 52, baseY = Math.max(WATER + 2, Math.min(20, topY(cx, cz)));
            pad(cx - 9, cz - 9, cx + 9, cz + 9, baseY, B.SANDSTONE, B.SANDSTONE, 16);
            for (let lvl = 0; lvl < 7; lvl++) { const rr = 7 - lvl; hollow(cx - rr, baseY + 1 + lvl, cz - rr, cx + rr, baseY + 1 + lvl, cz + rr, lvl % 2 === 0 ? B.SANDSTONE : B.C_ORANGE); }
            setRaw(cx, baseY + 8, cz, B.GOLD);
            box(cx - 1, baseY + 1, cz - 7, cx + 1, baseY + 3, cz - 4, B.AIR);
            box(cx - 4, baseY + 1, cz - 4, cx + 4, baseY + 4, cz + 4, B.AIR);
            setRaw(cx, baseY + 1, cz, B.CHEST); setRaw(cx - 2, baseY + 1, cz, B.GOLD); setRaw(cx + 2, baseY + 1, cz, B.DIAMOND_BLOCK);
            placeTorch(cx - 3, baseY + 2, cz - 3); placeTorch(cx + 3, baseY + 2, cz - 3); placeTorch(cx - 3, baseY + 2, cz + 3); placeTorch(cx + 3, baseY + 2, cz + 3);
            addSign('DESERT TEMPLE', cx, baseY + 10.2, cz, '#facc15', 1.3);
            reserved.push([cx, cz, 12]);
        }
        {
            const cx = -58, cz = 44, y = WATER + 1;
            box(cx - 1, y, cz - 8, cx + 1, y, cz + 8, B.CHERRY_PLANKS);
            box(cx - 2, y + 1, cz - 6, cx - 2, y + 5, cz - 6, B.C_RED); box(cx + 2, y + 1, cz - 6, cx + 2, y + 5, cz - 6, B.C_RED);
            box(cx - 3, y + 5, cz - 6, cx + 3, y + 5, cz - 6, B.C_RED); box(cx - 4, y + 6, cz - 6, cx + 4, y + 6, cz - 6, B.C_BLACK);
            setRaw(cx - 2, y + 1, cz + 6, B.LAMP); setRaw(cx + 2, y + 1, cz + 6, B.LAMP);
            addSign('CHERRY GROVE', cx, y + 8.0, cz - 6, '#f9a8d4', 1.3);
            reserved.push([cx, cz, 10]);
        }
        {
            const x0 = -70, z0 = 4, y = WATER + 1;
            box(x0 - 14, y, z0 - 1, x0 + 2, y, z0 + 1, B.SPRUCE_PLANKS);
            for (let x = x0 - 14; x <= x0; x += 4) { box(x, y - 5, z0 - 1, x, y - 1, z0 - 1, B.LOG); box(x, y - 5, z0 + 1, x, y - 1, z0 + 1, B.LOG); placeTorch(x, y + 1, z0 - 1); }
            const lx = x0 + 3, lz = z0 - 5, ly = Math.max(WATER + 1, topY(lx, lz));
            for (let dy = 0; dy < 14; dy++) hollow(lx - 2, ly + dy, lz - 2, lx + 2, ly + dy, lz + 2, ((dy / 2) | 0) % 2 === 0 ? B.WOOL_W : B.WOOL_R);
            hollow(lx - 2, ly + 14, lz - 2, lx + 2, ly + 16, lz + 2, B.GLASS); box(lx - 1, ly + 14, lz - 1, lx + 1, ly + 16, lz + 1, B.SEA_LANTERN);
            box(lx - 2, ly + 17, lz - 2, lx + 2, ly + 17, lz + 2, B.C_RED);
            addSign('HARBOR LIGHTHOUSE', lx, ly + 19.2, lz, '#fde047', 1.2);
            reserved.push([lx, lz, 10]);
        }
        {
            const wx = -44, wz = -46, top = topY(wx, wz);
            if (top > WATER + 8) {
                for (let y = top; y >= WATER; y--) { setRaw(wx, y, wz + 1, B.WATER); setRaw(wx + 1, y, wz + 1, B.WATER); }
                emitters.waterfalls.push([wx + 1, WATER + 1.2, wz + 1.5]);
            }
        }

        // Dungeons
        let dTries = 0;
        while (dungeons.length < 6 && dTries++ < 800) {
            const sx = ((rnd() * 160) | 0) - 80, sz = ((rnd() * 160) | 0) - 80;
            if (Math.hypot(sx, sz) < 56 || biomeAt(sx, sz) === BIOME.VOLCANO) continue;
            if (dungeons.some(d => Math.hypot(d.x - sx, d.z - sz) < 34)) continue;
            const h = terrainHeight(sx, sz); if (h < 18 || h > 34) continue;
            const L = h - 10, rx = sx + L, rz = sz; if (rx + 12 > 84) continue;
            if (terrainHeight(rx + 5, rz) < 16) continue;
            for (let i = 0; i <= L; i++) for (let dz = -1; dz <= 1; dz++) {
                const x = sx + i, y = h - i, z = sz + dz;
                for (let yy = y; yy <= y + 3; yy++) setRaw(x, yy, z, B.AIR);
                setRaw(x, y - 1, z, i % 2 ? B.MOSSY : B.STONEBRICK); setRaw(x, y + 4, z, B.COBBLE);
                if (dz) for (let yy = y; yy <= y + 3; yy++) setRaw(x, yy, sz + dz * 2, B.COBBLE);
                if (i === 0) setRaw(x, y + 4, z, B.AIR);
                if (i > 0 && i % 4 === 0 && dz === -1) placeTorch(x, y + 2, z);
            }
            hollow(rx, 8, rz - 5, rx + 10, 14, rz + 5, B.MOSSY);
            box(rx + 1, 8, rz - 4, rx + 9, 8, rz + 4, B.STONEBRICK);
            box(rx, 9, rz - 1, rx, 11, rz + 1, B.AIR);
            [[1, -4], [9, -4], [1, 4], [9, 4]].forEach(p => { box(rx + p[0], 9, rz + p[1], rx + p[0], 12, rz + p[1], B.STONEBRICK); setRaw(rx + p[0], 13, rz + p[1], B.GLOW); });
            box(rx + 4, 9, rz - 1, rx + 6, 9, rz + 1, B.GOLD); setRaw(rx + 5, 10, rz, B.CHEST); setRaw(rx + 5, 11, rz, B.DIAMOND_BLOCK);
            setRaw(sx - 1, h + 1, sz - 2, B.MOSSY); setRaw(sx - 1, h + 2, sz - 2, B.MOSSY); placeTorch(sx - 1, h + 3, sz - 2);
            setRaw(sx - 1, h + 1, sz + 2, B.MOSSY); setRaw(sx - 1, h + 2, sz + 2, B.MOSSY); placeTorch(sx - 1, h + 3, sz + 2);
            dungeons.push({ x: sx, z: sz, rx, rz }); reserved.push([sx, sz, 6]);
        }

        /* --- Organic, Slope-Checked Trees & Lush Ground Flora --- */
        const flatEnough = (x, z) => {
            const y = topY(x, z);
            return Math.abs(topY(x + 1, z) - y) <= 1 && Math.abs(topY(x - 1, z) - y) <= 1 && Math.abs(topY(x, z + 1) - y) <= 1 && Math.abs(topY(x, z - 1) - y) <= 1;
        };
        function oakTree(x, z) {
            if (!flatEnough(x, z)) return false;
            const y = topY(x, z); if (get(x, y, z) !== B.GRASS) return false;
            const h = 5 + (rnd() * 3 | 0);
            for (let i = 1; i <= h; i++) setRaw(x, y + i, z, B.LOG);
            // Lush asymmetric crown
            for (let dy = h - 2; dy <= h + 2; dy++) {
                const rad = dy === h + 2 ? 1.5 : (dy === h + 1 ? 2.4 : 2.9);
                for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
                    const d = Math.hypot(dx + (rnd() - 0.5) * 0.4, dz + (rnd() - 0.5) * 0.4);
                    if (d <= rad && !(dx === 0 && dz === 0 && dy <= h) && get(x + dx, y + dy, z + dz) === B.AIR) {
                        setRaw(x + dx, y + dy, z + dz, B.LEAVES);
                    }
                }
            }
            return true;
        }
        function birchTree(x, z) {
            if (!flatEnough(x, z)) return false;
            const y = topY(x, z); if (get(x, y, z) !== B.GRASS) return false;
            const h = 6 + (rnd() * 3 | 0);
            for (let i = 1; i <= h; i++) setRaw(x, y + i, z, B.BIRCH_LOG);
            for (let dy = h - 2; dy <= h + 2; dy++) {
                const rad = dy === h + 2 ? 1.3 : (dy === h + 1 ? 2.1 : 2.4);
                for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
                    if (Math.hypot(dx, dz) <= rad && !(dx === 0 && dz === 0 && dy <= h) && get(x + dx, y + dy, z + dz) === B.AIR && (Math.hypot(dx, dz) < 2 || rnd() > 0.35))
                        setRaw(x + dx, y + dy, z + dz, B.BIRCH_LEAVES);
                }
            }
            return true;
        }
        function cherryTree(x, z) {
            if (!flatEnough(x, z)) return false;
            const y = topY(x, z); if (get(x, y, z) !== B.GRASS) return false;
            const h = 5 + (rnd() * 2 | 0);
            const leanX = rnd() < 0.5 ? 1 : -1;
            for (let i = 1; i <= h; i++) setRaw(x + (i > 3 ? leanX : 0), y + i, z, B.CHERRY_LOG);
            const cx = x + leanX;
            for (let dy = h - 1; dy <= h + 2; dy++) {
                const maxR = dy === h + 2 ? 2.0 : (dy === h + 1 ? 3.2 : 3.6);
                for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) {
                    const d = Math.hypot(dx, dz);
                    if (d <= maxR && get(cx + dx, y + dy, z + dz) === B.AIR && (d < maxR - 0.8 || rnd() > 0.35)) {
                        setRaw(cx + dx, y + dy, z + dz, B.CHERRY_LEAVES);
                        // Graceful drooping blossom tips
                        if (dy === h - 1 && d > 2.0 && rnd() < 0.25 && get(cx + dx, y + dy - 1, z + dz) === B.AIR)
                            setRaw(cx + dx, y + dy - 1, z + dz, B.CHERRY_LEAVES);
                    }
                }
            }
            if (rnd() < 0.4) emitters.cherry.push([cx + 0.5, y + h, z + 0.5]);
            return true;
        }
        function spruceTree(x, z) {
            if (!flatEnough(x, z)) return false;
            const y = topY(x, z), g = get(x, y, z);
            if (g !== B.SNOW && g !== B.SNOW_GRASS && g !== B.GRASS) return false;
            const h = 7 + (rnd() * 4 | 0);
            for (let i = 1; i <= h; i++) setRaw(x, y + i, z, B.LOG);
            // Tiered airy Nordic pine silhouettes (alternating wide/narrow whorls!)
            for (let dy = 2; dy <= h + 2; dy++) {
                const frac = (h + 2 - dy) / h;
                const tier = (dy % 2 === 0) ? 1.0 : 0.62;
                const rad = dy === h + 2 ? 0 : (dy === h + 1 ? 1.0 : Math.min(3.1, Math.max(1.0, frac * 3.4 * tier)));
                const ri = Math.ceil(rad);
                for (let dx = -ri; dx <= ri; dx++) for (let dz = -ri; dz <= ri; dz++) {
                    if (Math.hypot(dx, dz) <= rad + 0.15 && !(dx === 0 && dz === 0 && dy <= h) && get(x + dx, y + dy, z + dz) === B.AIR) {
                        setRaw(x + dx, y + dy, z + dz, B.SPRUCE);
                    }
                }
            }
            return true;
        }
        function palmTree(x, z) {
            if (!flatEnough(x, z)) return false;
            const y = topY(x, z); if (get(x, y, z) !== B.SAND || y > WATER + 3 || y <= WATER) return false;
            const h = 5 + (rnd() * 2 | 0), dxL = rnd() < 0.5 ? 1 : -1;
            for (let i = 1; i <= h; i++) setRaw(x + (i > 2 ? dxL : 0) + (i > 4 ? dxL : 0), y + i, z, B.LOG);
            const tx = x + dxL * 2, ty = y + h;
            [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].forEach(d => {
                setRaw(tx + d[0], ty + 1, z + d[1], B.LEAVES);
                setRaw(tx + d[0] * 2, ty + 1, z + d[1] * 2, B.LEAVES);
                setRaw(tx + d[0] * 3, ty, z + d[1] * 3, B.LEAVES);
            });
            setRaw(tx, ty + 1, z, B.LEAVES);
            return true;
        }
        function cactus(x, z) {
            if (!flatEnough(x, z)) return false;
            const y = topY(x, z); if (get(x, y, z) !== B.SAND || y <= WATER + 2) return false;
            const h = 2 + (rnd() * 3 | 0);
            for (let i = 1; i <= h; i++) setRaw(x, y + i, z, B.CACTUS);
            return true;
        }

        const clearSpot = (x, z) => {
            if (Math.hypot(x, z) < 13) return false;
            if (isProtected(x, BASE, z)) return false;
            const zones = [[0, -22, 12], [-28, 0, 16], [-18, 28, 14], [30, 16, 25], [30, -18, 12], [0, 44, 12], [-56, -54, 10], [64, -56, 15]];
            if (reserved.some(q => Math.hypot(x - q[0], z - q[1]) < q[2])) return false;
            return !zones.some(q => Math.hypot(x - q[0], z - q[1]) < q[2]);
        };

        let placed = 0, tries = 0;
        while (placed < 880 && tries < 16000) {
            tries++;
            const x = ((rnd() * (SX - 16)) | 0) - OX + 8, z = ((rnd() * (SZ - 16)) | 0) - OZ + 8;
            if (!clearSpot(x, z)) continue;
            const bio = biomeMap[(z + OZ) * SX + (x + OX)];
            if (bio === BIOME.OCEAN || bio === BIOME.VOLCANO) continue;
            const dens = bio === BIOME.FOREST ? 0.85 : (bio === BIOME.CHERRY ? 0.85 : (bio === BIOME.SNOW ? 0.42 : (bio === BIOME.DESERT ? 0.25 : 0.16)));
            if (rnd() > dens) continue;
            let ok = false;
            const top = get(x, topY(x, z), z);
            if (top === B.SAND && topY(x, z) <= WATER + 2 && rnd() < 0.35) ok = palmTree(x, z);
            else if (bio === BIOME.SNOW) ok = spruceTree(x, z);
            else if (bio === BIOME.DESERT) ok = cactus(x, z);
            else if (bio === BIOME.CHERRY) ok = cherryTree(x, z);
            else ok = rnd() < 0.38 ? birchTree(x, z) : oakTree(x, z);
            if (ok) placed++;
        }

        // Ground flora & underwater reefs
        for (let x = -OX + 4; x < SX - OX - 4; x++) for (let z = -OZ + 4; z < SZ - OZ - 4; z++) {
            const bio = biomeMap[(z + OZ) * SX + (x + OX)];
            const h = heightMap[(z + OZ) * SX + (x + OX)], y = h + 1;
            if (bio === BIOME.OCEAN && h <= WATER - 2 && h >= 3) {
                const q = rnd();
                if (q < 0.04) setRaw(x, y, z, B.SEAGRASS);
                else if (q < 0.052) setRaw(x, y, z, q < 0.046 ? B.CORAL_R : B.CORAL_B);
                else if (q < 0.055) setRaw(x, h, z, B.SEA_LANTERN);
                continue;
            }
            if (!clearSpot(x, z)) continue;
            if (get(x, h, z) !== B.GRASS || get(x, y, z) !== B.AIR) continue;
            if (h === WATER + 1 && (get(x + 1, WATER, z) === B.WATER || get(x - 1, WATER, z) === B.WATER)) {
                if (rnd() < 0.22) { const ch = 2 + (rnd() * 2 | 0); for (let k = 0; k < ch; k++) setRaw(x, y + k, z, B.SUGARCANE); continue; }
            }
            const q = rnd();
            if (q < 0.085) setRaw(x, y, z, B.TALLGRASS);
            else if (q < 0.105) setRaw(x, y, z, B.FERN);
            else if (q < 0.120) setRaw(x, y, z, B.FLOWER_R);
            else if (q < 0.134) setRaw(x, y, z, B.FLOWER_Y);
            else if (q < 0.146) setRaw(x, y, z, bio === BIOME.CHERRY ? B.FLOWER_P : B.FLOWER_B);
            else if (q < 0.151 && bio === BIOME.FOREST) setRaw(x, y, z, B.MUSHROOM_R);
            if (q > 0.9965) emitters.fireflies.push([x + 0.5, y + 1.2, z + 0.5]);
        }

        // 12 Knowledge Shards
        const fixedShards = [[0, -11], [-18, -6], [-38, 6], [-24, 15], [-9, 34], [12, 34], [40, 22], [14, 2], [40, -16], [20, -30], [-28, -32], [-52, -46]];
        for (let i = 0; i < CV.shards.length; i++) {
            const [x, z] = fixedShards[i];
            shardSpots.push({ id: i, x: x + 0.5, y: topY(x, z) + 2, z: z + 0.5 });
        }
    }

    /* ========================================================================
       DIMENSION 2: THE NETHER (Địa Ngục — Lava Ocean, Basalt Pillars, Crimson/Warped Forests, Nether Fortress!)
       ======================================================================== */
    function buildNether() {
        const rnd = mulberry32(6661);
        data.fill(0);
        const LAVA_LVL = 13;

        for (let x = -OX; x < SX - OX; x++) for (let z = -OZ; z < SZ - OZ; z++) {
            const n = fbm(x * 1.6, z * 1.6, 71);
            const r = Math.hypot(x, z);
            const biome = vnoise(x * 0.032, z * 0.032, 77); // <0.36 Crimson, >0.64 Warped, middle Basalt/Wastes
            let floorH = Math.round(4 + n * 22 + (vnoise(x * 0.045, z * 0.045, 88) - 0.5) * 10);
            // Carve dramatic molten lava sea channel directly under the Nether Fortress bridge!
            if (z < -7 && z > -34 && Math.abs(x) < 18) floorH = Math.min(floorH, 7);
            if (r < 12) floorH = 20;
            const ceilH = Math.round(SY - 8 - fbm(x * 1.2 + 50, z * 1.2, 83) * 14);
            const edgeWall = Math.max(Math.abs(x), Math.abs(z)) > OX - 7;

            for (let y = 0; y < SY; y++) {
                let b = B.AIR;
                if (y === 0 || y === SY - 1) b = B.BEDROCK;
                else if (edgeWall) b = B.NETHERRACK;
                else if (y <= floorH) {
                    if (y === floorH && floorH > LAVA_LVL) {
                        if (biome < 0.36) b = B.CRIMSON_NYLIUM;
                        else if (biome > 0.64) b = B.WARPED_NYLIUM;
                        else b = (y < LAVA_LVL + 4 && hash2(x, z, 33) > 0.45) ? B.SOUL_SAND : (hash2(x, z, 44) > 0.72 ? B.MAGMA : B.NETHERRACK);
                    } else b = B.NETHERRACK;
                } else if (y >= ceilH) {
                    b = B.NETHERRACK;
                } else if (y <= LAVA_LVL) {
                    b = B.LAVA;
                    if (y === LAVA_LVL && hash2(x, z, 91) < 0.025) emitters.lava.push([x + 0.5, y + 1.0, z + 0.5]);
                }
                setRaw(x, y, z, b);
            }
            // Hanging Glowstone stalactites from cavern roof!
            if (!edgeWall && hash2(x, z, 123) < 0.008 && ceilH > 40) {
                const gl = 2 + ((rnd() * 4) | 0);
                for (let k = 0; k < gl; k++) setRaw(x, ceilH - 1 - k, z, B.GLOW);
            }
            // Basalt lava columns connecting floor to ceiling
            if (r > 18 && !edgeWall && hash2(x, z, 234) < 0.0018) {
                for (let y = floorH; y <= ceilH; y++) {
                    setRaw(x, y, z, B.BASALT); setRaw(x + 1, y, z, B.BASALT);
                    setRaw(x, y, z + 1, B.BASALT); setRaw(x + 1, y, z + 1, B.BASALT);
                }
            }
        }

        // Giant Crimson & Warped glowing Nether Fungi
        for (let i = 0; i < 65; i++) {
            const x = ((rnd() * (SX - 24)) | 0) - OX + 12, z = ((rnd() * (SZ - 24)) | 0) - OZ + 12;
            if (Math.hypot(x, z) < 16) continue;
            let y = 34; while (y > LAVA_LVL + 1 && !DEF[get(x, y, z)].solid) y--;
            const g = get(x, y, z);
            if (g !== B.CRIMSON_NYLIUM && g !== B.WARPED_NYLIUM) continue;
            const warped = g === B.WARPED_NYLIUM;
            const h = 4 + (rnd() * 4 | 0);
            for (let k = 1; k <= h; k++) setRaw(x, y + k, z, warped ? B.BASALT : B.CHERRY_LOG);
            for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
                if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
                setRaw(x + dx, y + h, z + dz, warped ? B.WARPED_CAP : B.CRIMSON_CAP);
                if (Math.abs(dx) <= 1 && Math.abs(dz) <= 1) setRaw(x + dx, y + h + 1, z + dz, warped ? B.WARPED_CAP : B.CRIMSON_CAP);
            }
            setRaw(x + 1, y + h - 1, z, B.SHROOMLIGHT); setRaw(x - 1, y + h - 1, z, B.SHROOMLIGHT);
        }

        // Nether Fortress Sanctuary & Lava Bridge (Center 0, 0 -> Fortress Keep at 0, -32)
        pad(-8, -8, 8, 8, 20, B.NETHER_BRICK, B.OBSIDIAN, 14);
        protect(-9, -9, 9, 9);
        buildPortalFrame(0, 21, 5, 5, 6, B.OBSIDIAN, B.CRYING_OBS, B.SHROOMLIGHT, 'nether_return', 'overworld', 'spawn', 'RETURN TO OVERWORLD', 'Step through to go home', [0.25, 0.9, 0.95], [0.55, 0.25, 1.0], '#38bdf8');
        addSign('THE NETHER REALM', 0, 29.5, 0, '#ff7b29', 1.7);

        // Fortress bridge across lava ocean to Crimson Keep
        box(-2, 20, -34, 2, 20, -8, B.NETHER_BRICK);
        for (let z = -32; z <= -10; z += 4) {
            setRaw(-2, 21, z, B.NETHER_BRICK); placeTorch(-2, 22, z, false);
            setRaw(2, 21, z, B.NETHER_BRICK); placeTorch(2, 22, z, false);
            box(-2, 10, z, -2, 19, z, B.NETHER_BRICK); box(2, 10, z, 2, 19, z, B.NETHER_BRICK);
        }
        // Fortress Keep & Treasure Room + Portal to Cosmos!
        pad(-9, -46, 9, -32, 20, B.NETHER_BRICK, B.NETHER_BRICK, 16);
        hollow(-8, 21, -45, 8, 30, -33, B.NETHER_BRICK);
        box(-7, 22, -44, 7, 29, -34, B.AIR);
        box(-2, 21, -33, 2, 25, -33, B.AIR);
        box(-2, 21, -40, 2, 21, -38, B.GOLD); setRaw(0, 22, -39, B.CHEST);
        setRaw(-6, 28, -43, B.SHROOMLIGHT); setRaw(6, 28, -43, B.SHROOMLIGHT); setRaw(-6, 28, -35, B.SHROOMLIGHT); setRaw(6, 28, -35, B.SHROOMLIGHT);
        addSign('CRIMSON FORTRESS', 0, 32.5, -39, '#fbbf24', 1.5);
        buildPortalFrame(0, 21, -44, 5, 5, B.END_STONE, B.PURPUR, B.STAR_CRYSTAL, 'nether_cosmos', 'cosmos', 'spawn', 'COSMOS PORTAL', 'Warp to Deep Space', [0.5, 0.15, 1.0], [0.15, 0.85, 1.0], '#c084fc');

        landmarks.spawn = { x: 0, z: 0, y: 21 };
        landmarks.fortress = { x: 0, z: -30, y: 21 };
    }

    /* ========================================================================
       DIMENSION 3: AETHER SKY ISLANDS (Đảo Lơ Lửng — Floating Islands, Cloud Bridges, Sky Temple & Waterfalls!)
       ======================================================================== */
    function buildAether() {
        const rnd = mulberry32(7777);
        data.fill(0);

        function skyIsland(cx, cy, cz, rx, rz, depth, topBlock) {
            for (let dx = -rx; dx <= rx; dx++) for (let dz = -rz; dz <= rz; dz++) {
                const d = Math.hypot(dx / rx, dz / rz);
                const wobble = vnoise((cx + dx) * 0.14, (cz + dz) * 0.14, cx + cz) * 0.25;
                if (d + wobble > 1.05) continue;
                const hill = Math.round(Math.max(0, (1 - d) * 3.5) + vnoise((cx + dx) * 0.12, (cz + dz) * 0.12, 19) * 2.5);
                const bot = Math.round(Math.pow(Math.max(0, 1 - d), 1.35) * depth + hash2(cx + dx, cz + dz, 3) * 2);
                const top = cy + hill;
                for (let y = cy - bot; y <= top; y++) {
                    if (y === top) setRaw(cx + dx, y, cz + dz, topBlock || B.AETHER_GRASS);
                    else if (y >= top - 2) setRaw(cx + dx, y, cz + dz, B.AETHER_STONE);
                    else setRaw(cx + dx, y, cz + dz, (hash3(cx + dx, y, cz + dz, 9) > 0.94 ? B.GOLD_ORE : B.AETHER_STONE));
                }
            }
        }

        // Main Central Sky Sanctuary Island
        skyIsland(0, 28, 0, 18, 18, 13, B.AETHER_GRASS);
        pad(-7, -7, 7, 7, 30, B.QUARTZ, B.AETHER_STONE, 18);
        protect(-9, -9, 9, 9);
        buildPortalFrame(0, 31, 6, 5, 5, B.GLOW, B.QUARTZ, B.SKY_CRYSTAL, 'aether_return', 'overworld', 'spawn', 'RETURN TO OVERWORLD', 'Descend to CV World', [0.2, 0.85, 1.0], [0.5, 0.95, 0.6], '#4ff2e4');
        addSign('AETHER SKY ISLANDS', 0, 39.5, 0, '#fde047', 1.75);
        addSign('Low Gravity · Jump high across floating islands!', 0, 38.2, 0, '#e0f2fe', 0.85);

        // Golden Sky Temple Island (North: 0, 40, -38)
        skyIsland(0, 38, -38, 14, 14, 11, B.AETHER_GRASS);
        pad(-7, -45, 7, -31, 40, B.QUARTZ, B.AETHER_STONE, 16);
        for (let dx of [-6, 0, 6]) for (let dz of [-44, -32]) box(dx, 41, dz, dx, 48, dz, B.QUARTZ);
        box(-7, 49, -45, 7, 49, -31, B.GOLD);
        box(-5, 50, -43, 5, 50, -33, B.SKY_CRYSTAL);
        setRaw(0, 41, -38, B.CHEST); setRaw(-2, 41, -38, B.DIAMOND_BLOCK); setRaw(2, 41, -38, B.EMERALD_BLOCK);
        addSign('GOLDEN SKY TEMPLE', 0, 52.8, -38, '#fde047', 1.5);
        // Glowing waterfall pouring off Temple edge into the clouds below!
        for (let y = 40; y >= 4; y--) { setRaw(8, y, -38, B.WATER); setRaw(8, y, -37, B.WATER); }
        emitters.waterfalls.push([8.5, 12, -37.5]);

        // Surrounding Floating Archipelago + Rainbow/Cloud Stepping Bridges!
        const islands = [
            [-34, 34, -18, 11, 11, 9],
            [34, 35, -14, 12, 11, 10],
            [-32, 26, 26, 12, 12, 9],
            [32, 32, 28, 11, 11, 9],
            [0, 34, 40, 10, 10, 8],
            [-46, 44, -42, 9, 9, 7],
            [46, 46, -40, 10, 10, 8]
        ];
        islands.forEach((is, idx) => {
            skyIsland(is[0], is[1], is[2], is[3], is[4], is[5], B.AETHER_GRASS);
            // Glowing crystal spire & cherry/birch tree on each island
            const ty = topY(is[0], is[2]);
            if (idx % 2 === 0) {
                box(is[0], ty + 1, is[2], is[0], ty + 5, is[2], B.CHERRY_LOG);
                for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) for (let dy = 4; dy <= 6; dy++) {
                    if (Math.hypot(dx, dz) <= (dy === 6 ? 1.8 : 3.0) && get(is[0] + dx, ty + dy, is[2] + dz) === B.AIR)
                        setRaw(is[0] + dx, ty + dy, is[2] + dz, B.CHERRY_LEAVES);
                }
                emitters.cherry.push([is[0] + 0.5, ty + 5, is[2] + 0.5]);
            } else {
                box(is[0], ty + 1, is[2], is[0], ty + 4, is[2], B.SKY_CRYSTAL);
            }
        });

        // Walkable Aercloud Sky-Bridges connecting Spawn Island -> Temple & Side Islands
        const bridge = (x0, y0, z0, x1, y1, z1) => {
            const n = Math.max(Math.abs(x1 - x0), Math.abs(z1 - z0));
            for (let i = 0; i <= n; i++) {
                const t = i / (n || 1);
                const x = Math.round(x0 + (x1 - x0) * t), z = Math.round(z0 + (z1 - z0) * t);
                const y = Math.round(y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * 3);
                box(x - 1, y, z - 1, x + 1, y, z + 1, B.CLOUD_BLOCK);
                if (i % 5 === 0) setRaw(x, y, z, B.SKY_CRYSTAL);
            }
        };
        bridge(0, 30, -10, 0, 40, -28);
        bridge(-12, 30, -6, -26, 35, -14);
        bridge(12, 30, -4, 26, 36, -12);
        bridge(-10, 30, 10, -24, 28, 20);
        bridge(10, 30, 10, 24, 33, 22);

        // Cosmic Warp Portal on East Island -> Jump straight to THE COSMOS!
        const ex = 34, ez = -14, ey = topY(ex, ez);
        buildPortalFrame(ex, ey + 1, ez, 5, 5, B.END_STONE, B.PURPUR, B.STAR_CRYSTAL, 'aether_cosmos', 'cosmos', 'spawn', 'COSMOS PORTAL', 'Ascend to Outer Space', [0.55, 0.2, 1.0], [0.2, 0.9, 1.0], '#c084fc');

        // Floating Golden Aercloud Banks around the void
        for (let i = 0; i < 28; i++) {
            const cx = ((rnd() * (SX - 20)) | 0) - OX + 10, cz = ((rnd() * (SZ - 20)) | 0) - OZ + 10, cy = 12 + (rnd() * 14 | 0);
            box(cx - 3, cy, cz - 2, cx + 3, cy + 1, cz + 2, B.CLOUD_BLOCK);
        }

        landmarks.spawn = { x: 0, z: 0, y: 31 };
        landmarks.temple = { x: 0, z: -30, y: 41 };
    }

    /* ========================================================================
       DIMENSION 4: THE COSMOS / THE END (Vũ Trụ — Lunar Low-G Asteroids, Obsidian Crystal Towers, Purpur Citadel!)
       ======================================================================== */
    function buildCosmos() {
        const rnd = mulberry32(9999);
        data.fill(0);

        function asteroid(cx, cy, cz, rx, ry, rz, matA, matB) {
            for (let dx = -rx; dx <= rx; dx++) for (let dy = -ry; dy <= ry; dy++) for (let dz = -rz; dz <= rz; dz++) {
                const d = Math.hypot(dx / rx, dy / ry, dz / rz);
                const n = vnoise3((cx + dx) * 0.16, (cy + dy) * 0.16, (cz + dz) * 0.16, cx + cz) * 0.28;
                if (d + n > 1.02) continue;
                setRaw(cx + dx, cy + dy, cz + dz, (dy > 0 && hash2(cx + dx, cz + dz, 7) > 0.22) ? matA : matB);
            }
        }

        // Main Central Cosmic Sanctuary Asteroid
        asteroid(0, 22, 0, 20, 7, 20, B.END_STONE, B.VOID_STONE);
        pad(-8, -8, 8, 8, 26, B.PURPUR, B.VOID_STONE, 18);
        protect(-10, -10, 10, 10);
        // Glowing Starlight Runway & Return Portal
        buildPortalFrame(0, 27, 6, 5, 5, B.OBSIDIAN, B.PURPUR, B.STAR_CRYSTAL, 'cosmos_return', 'overworld', 'spawn', 'RETURN TO OVERWORLD', 'Warp back to Earth', [0.2, 0.9, 0.95], [0.65, 0.3, 1.0], '#38bdf8');
        addSign('THE COSMOS — OUTER SPACE', 0, 35.5, 0, '#c084fc', 1.75);
        addSign('Lunar Gravity · Leap across floating asteroids & crystal towers!', 0, 34.2, 0, '#e9d5ff', 0.85);

        // Ring of 8 Iconic Obsidian Crystal Pillars around the central arena!
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            const px = Math.round(Math.cos(a) * 16), pz = Math.round(Math.sin(a) * 16);
            const h = 10 + (i % 3) * 5;
            box(px - 1, 22, pz - 1, px + 1, 22 + h, pz + 1, B.OBSIDIAN);
            setRaw(px, 23 + h, pz, B.STAR_CRYSTAL);
            setRaw(px, 24 + h, pz, B.AMETHYST);
            emitters.fireflies.push([px + 0.5, 25 + h, pz + 0.5]);
        }

        // Purpur Cosmic Observatory Citadel (North: 0, 34, -44)
        asteroid(0, 31, -44, 15, 7, 15, B.END_STONE, B.VOID_STONE);
        pad(-8, -52, 8, -36, 35, B.PURPUR, B.VOID_STONE, 20);
        hollow(-7, 36, -51, 7, 45, -37, B.PURPUR);
        box(-6, 37, -50, 6, 44, -38, B.AIR);
        box(-2, 36, -37, 2, 41, -37, B.AIR);
        for (let dx = -5; dx <= 5; dx += 2) { setRaw(dx, 40, -51, B.GLASS); setRaw(dx, 41, -51, B.GLASS); }
        box(-3, 46, -47, 3, 46, -41, B.STAR_CRYSTAL);
        setRaw(0, 36, -44, B.CHEST); setRaw(-2, 36, -44, B.DIAMOND_BLOCK); setRaw(2, 36, -44, B.GOLD);
        addSign('COSMIC CITADEL', 0, 48.8, -44, '#f0abfc', 1.5);
        // Starlight Stepping Asteroids connecting Arena -> Citadel
        for (let i = 1; i <= 4; i++) {
            const z = -14 - i * 5, y = 26 + i * 2;
            asteroid((i % 2 ? 3 : -3), y, z, 3, 2, 3, B.PURPUR, B.VOID_STONE);
            setRaw((i % 2 ? 3 : -3), y + 2, z, B.STAR_CRYSTAL);
        }

        // Floating Asteroid Belt & Amethyst Geodes all around Space!
        for (let i = 0; i < 24; i++) {
            const a = rnd() * Math.PI * 2, dist = 28 + rnd() * 34;
            const ax = Math.round(Math.cos(a) * dist), az = Math.round(Math.sin(a) * dist);
            if (Math.hypot(ax, az + 44) < 18) continue;
            const ay = 16 + ((rnd() * 32) | 0);
            const r = 3 + ((rnd() * 5) | 0);
            asteroid(ax, ay, az, r, Math.max(2, r - 2), r, i % 3 === 0 ? B.AMETHYST : B.END_STONE, B.VOID_STONE);
            if (rnd() < 0.55) setRaw(ax, ay + Math.max(2, r - 2) + 1, az, B.STAR_CRYSTAL);
        }

        landmarks.spawn = { x: 0, z: 0, y: 27 };
        landmarks.citadel = { x: 0, z: -34, y: 36 };
    }

    /* ========================================================================
       DIMENSION 5: ABYSSAL DUNGEON (Hầm Ngục Cổ Đại — Multi-Wing Vaulted Fortress, Lava Moats, Treasure Vaults!)
       ======================================================================== */
    function buildDungeonDim() {
        const rnd = mulberry32(4040);
        data.fill(B.DEEPSLATE);

        function room(x0, y0, z0, x1, y1, z1, floorB, wallB) {
            for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
                const edge = x === x0 || x === x1 || y === y0 || y === y1 || z === z0 || z === z1;
                if (!edge) setRaw(x, y, z, B.AIR);
                else if (y === y0) setRaw(x, y, z, floorB || B.STONEBRICK);
                else setRaw(x, y, z, hash3(x, y, z, 11) < 0.25 ? B.MOSSY : (wallB || B.STONEBRICK));
            }
        }

        // Central Entry Atrium
        room(-10, 10, -10, 10, 22, 10, B.STONEBRICK, B.STONEBRICK);
        protect(-10, -10, 10, 10);
        for (let dx of [-6, 6]) for (let dz of [-6, 6]) {
            box(dx, 11, dz, dx, 21, dz, B.MOSSY);
            setRaw(dx, 18, dz, B.LAMP);
            placeTorch(dx, 14, dz + (dz > 0 ? -1 : 1), true);
        }
        buildPortalFrame(0, 11, 7, 5, 5, B.MOSSY, B.EMERALD_BLOCK, B.LAMP, 'dungeon_return', 'overworld', 'spawn', 'RETURN TO OVERWORLD', 'Escape the Abyssal Dungeon', [0.1, 0.9, 0.55], [0.2, 0.7, 1.0], '#34d399');
        addSign('ABYSSAL DUNGEON', 0, 19.5, 0, '#34d399', 1.65);

        // 4 Corridors radiating N/S/E/W to specialized Vault Chambers!
        // North Corridor -> Lava Moat & Grand Boss Treasury
        room(-3, 10, -30, 3, 16, -9, B.STONEBRICK, B.MOSSY);
        for (let z = -26; z <= -12; z += 4) { placeTorch(-2, 13, z, false); placeTorch(2, 13, z, false); }
        room(-14, 8, -48, 14, 24, -29, B.DEEPSLATE, B.STONEBRICK);
        // Lava moat around central treasure dais!
        box(-12, 9, -46, 12, 10, -31, B.LAVA);
        for (let i = 0; i < 16; i++) emitters.lava.push([-10 + rnd() * 20, 11.2, -45 + rnd() * 14]);
        box(-5, 9, -43, 5, 11, -34, B.OBSIDIAN);
        box(-2, 11, -34, 2, 11, -30, B.STONEBRICK); // Bridge over lava!
        box(-2, 12, -40, 2, 12, -37, B.GOLD);
        setRaw(0, 13, -39, B.CHEST); setRaw(-2, 13, -39, B.DIAMOND_BLOCK); setRaw(2, 13, -39, B.EMERALD_BLOCK);
        setRaw(-10, 22, -44, B.GLOW); setRaw(10, 22, -44, B.GLOW); setRaw(-10, 22, -33, B.GLOW); setRaw(10, 22, -33, B.GLOW);
        addSign('GRAND TREASURY VAULT', 0, 18.5, -39, '#fbbf24', 1.45);
        // Secret Nether Portal at back of Treasury!
        buildPortalFrame(0, 12, -43, 5, 5, B.OBSIDIAN, B.CRYING_OBS, B.MAGMA, 'dungeon_nether', 'nether', 'spawn', 'NETHER RIFT', 'Descend into The Nether', [1.0, 0.25, 0.05], [0.85, 0.1, 0.95], '#ff7b29');

        // West Corridor -> Ancient Library Wing
        room(-28, 10, -3, -9, 16, 3, B.STONEBRICK, B.MOSSY);
        room(-44, 10, -12, -27, 21, 12, B.PLANKS, B.STONEBRICK);
        for (let z = -10; z <= 10; z += 4) { box(-42, 11, z, -30, 16, z, B.BOOKSHELF); box(-37, 11, z, -35, 15, z, B.AIR); }
        setRaw(-36, 19, 0, B.SEA_LANTERN); setRaw(-36, 11, 0, B.CHEST);
        addSign('FORGOTTEN LIBRARY', -36, 18.2, 0, '#7dd3fc', 1.3);

        // East Corridor -> Amethyst Crystal Cavern
        room(9, 10, -3, 28, 16, 3, B.STONEBRICK, B.MOSSY);
        room(27, 10, -12, 44, 22, 12, B.DEEPSLATE, B.AMETHYST);
        for (let i = 0; i < 14; i++) {
            const vx = 29 + (rnd() * 13 | 0), vz = -10 + (rnd() * 20 | 0);
            for (let k = 0; k < 4; k++) setRaw(vx, 21 - k, vz, B.GLOW_VINE);
        }
        box(34, 11, -2, 38, 11, 2, B.AMETHYST); setRaw(36, 12, 0, B.CHEST);
        addSign('AMETHYST SANCTUM', 36, 18.5, 0, '#d8b4fe', 1.3);

        landmarks.spawn = { x: 0, z: 0, y: 11 };
        landmarks.vault = { x: 0, z: -28, y: 12 };
    }

    /* ---------- Dimension Manager & Caching ---------- */
    function allocDim(dimId) {
        const m = DIM_META[dimId];
        SX = m.sx; SY = m.sy; SZ = m.sz; OX = SX >> 1; OZ = SZ >> 1; WATER = m.water; BASE = m.base;
        curDim = dimId;
        const VOL = SX * SY * SZ;
        data = new Uint8Array(VOL);
        skyLight = new Uint8Array(VOL);
        blockLight = new Uint8Array(VOL);
        heightMap = new Int16Array(SX * SZ);
        biomeMap = new Uint8Array(SX * SZ);
        infoMap = new Map(); infoList = []; landmarks = {}; signs = []; portals = []; shardSpots = []; dungeons = []; protectedZones = [];
        emitters = { lava: [], torches: [], waterfalls: [], cherry: [], fireflies: [] };
    }

    function saveDimToCache(dimId) {
        dimCache[dimId] = {
            SX, SY, SZ, OX, OZ, WATER, BASE,
            data, skyLight, blockLight, heightMap, biomeMap,
            infoMap, infoList, landmarks, signs, portals, shardSpots, dungeons, emitters, protectedZones
        };
    }

    function loadDimFromCache(dimId) {
        const c = dimCache[dimId];
        curDim = dimId;
        SX = c.SX; SY = c.SY; SZ = c.SZ; OX = c.OX; OZ = c.OZ; WATER = c.WATER; BASE = c.BASE;
        data = c.data; skyLight = c.skyLight; blockLight = c.blockLight; heightMap = c.heightMap; biomeMap = c.biomeMap;
        infoMap = c.infoMap; infoList = c.infoList; landmarks = c.landmarks; signs = c.signs;
        portals = c.portals; shardSpots = c.shardSpots; dungeons = c.dungeons; emitters = c.emitters; protectedZones = c.protectedZones;
        syncExports();
    }

    function switchDimension(dimId) {
        if (!DIM_META[dimId]) dimId = 'overworld';
        if (dimCache[dimId]) {
            loadDimFromCache(dimId);
            return;
        }
        allocDim(dimId);
        if (dimId === 'overworld') buildOverworld(cachedCV);
        else if (dimId === 'nether') buildNether();
        else if (dimId === 'aether') buildAether();
        else if (dimId === 'cosmos') buildCosmos();
        else if (dimId === 'dungeon') buildDungeonDim();

        for (let x = -OX; x < SX - OX; x++) for (let z = -OZ; z < SZ - OZ; z++) {
            heightMap[(z + OZ) * SX + (x + OX)] = topY(x, z);
        }
        computeLighting();
        saveDimToCache(dimId);
        syncExports();
    }

    function buildAll(CV) {
        cachedCV = CV;
        switchDimension('overworld');
    }

    window.CVW = {
        SX, SY, SZ, OX, OZ, WATER, BASE, B, DEF, TILE, PAD_PX, STRIDE, COLS, CONCRETE_BY_NAME, CONCRETE_LIST,
        DIM_META, dim: curDim, dimMeta: DIM_META.overworld,
        data, skyLight, blockLight, heightMap, idx, inb, get, set: setRaw, topY,
        getSkyLight, getBlockLight, computeLighting, relightAround,
        buildAtlas, buildAll, switchDimension, isProtected,
        infoMap, infoList, landmarks, signs, portals, shardSpots, emitters,
        mulberry32, biomeMap, BIOME, BIOME_NAMES, dungeons
    };
})();
