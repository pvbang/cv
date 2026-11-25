/* CV World — tools, 3D isometric block icons, mining hardness, categorized inventory catalog */
(function () {
    'use strict';
    const W = window.CVW, E = window.CVE, B = W.B, DEF = W.DEF;
    const I = {};
    window.CVI = I;

    I.TOOLS = {
        pickaxe: { name: 'Diamond Pickaxe', dmg: 4, eff: 'pick', speed: 7.5 },
        axe: { name: 'Diamond Axe', dmg: 5, eff: 'axe', speed: 7.5 },
        shovel: { name: 'Diamond Shovel', dmg: 3, eff: 'shovel', speed: 7.5 },
        sword: { name: 'Diamond Sword', dmg: 7, eff: 'sword', speed: 1.8 }
    };
    I.isTool = it => typeof it === 'string';
    I.isBlock = it => typeof it === 'number' && it > 0 && !!DEF[it];
    I.name = it => I.isTool(it) ? I.TOOLS[it].name : (I.isBlock(it) ? DEF[it].name : 'Empty Hand');
    I.damage = it => I.isTool(it) ? I.TOOLS[it].dmg : 1.5;

    const HARD = {};
    function cls(c, h, ids) { ids.forEach(id => { if (id !== undefined) HARD[id] = [c, h]; }); }
    cls('shovel', 0.7, [B.GRASS, B.DIRT, B.SAND, B.GRAVEL, B.SNOW, B.SNOW_GRASS, B.SOUL_SAND, B.AETHER_GRASS, B.CRIMSON_NYLIUM, B.WARPED_NYLIUM]);
    cls('axe', 1.4, [B.LOG, B.BIRCH_LOG, B.CHERRY_LOG, B.PLANKS, B.CHERRY_PLANKS, B.SPRUCE_PLANKS, B.BOOKSHELF, B.CRAFTING, B.CHEST, B.CRIMSON_CAP, B.WARPED_CAP]);
    cls('pick', 2.4, [B.NETHERRACK, B.END_STONE, B.AETHER_STONE, B.NETHER_BRICK, B.PURPUR]);
    cls('pick', 3.0, [B.STONE, B.COBBLE, B.STONEBRICK, B.BRICK, B.SANDSTONE, B.MOSSY, B.QUARTZ, B.BASALT, B.MAGMA, B.FURNACE, B.ICE, B.DEEPSLATE, B.VOID_STONE,
        B.C_CYAN, B.C_GREEN, B.C_ORANGE, B.C_PURPLE, B.C_BLUE, B.C_PINK, B.C_YELLOW, B.C_RED, B.C_BLACK]);
    cls('pick', 4.0, [B.COAL, B.IRON, B.IRON_BLOCK, B.GOLD_ORE, B.GOLD, B.DIAMOND, B.DIAMOND_BLOCK, B.EMERALD, B.EMERALD_BLOCK, B.REDSTONE_ORE, B.AMETHYST, B.SKY_CRYSTAL, B.STAR_CRYSTAL]);
    cls('pick', 10.0, [B.OBSIDIAN, B.CRYING_OBS]);
    cls('none', 0.3, [B.LEAVES, B.BIRCH_LEAVES, B.CHERRY_LEAVES, B.SPRUCE, B.GLASS, B.WOOL_W, B.WOOL_R, B.WOOL_B, B.WOOL_G, B.GLOW, B.LAMP, B.SEA_LANTERN, B.SHROOMLIGHT, B.CLOUD_BLOCK, B.CACTUS, B.TNT]);
    cls('none', 0.05, [B.TALLGRASS, B.FERN, B.FLOWER_R, B.FLOWER_Y, B.FLOWER_B, B.FLOWER_P, B.MUSHROOM_R, B.SUGARCANE, B.CORAL_R, B.CORAL_B, B.SEAGRASS, B.GLOW_VINE, B.TORCH, B.SOUL_TORCH]);

    I.dig = function (id, it) {
        if (id === B.BEDROCK) return Infinity;
        const h = HARD[id] || ['pick', 3.2];
        const t = I.isTool(it) ? I.TOOLS[it] : null;
        if (!t) return h[1];
        if (h[0] === t.eff) return Math.max(0.1, h[1] / t.speed);
        if (t.eff === 'sword') return h[0] === 'none' ? h[1] * 0.55 : h[1] / 1.3;
        return h[1];
    };
    I.bestTool = id => { const h = HARD[id]; return h && h[0] !== 'none' ? (h[0] === 'pick' ? 'pickaxe' : h[0]) : null; };

    /* ---------- Crisp Pixel Tool Icons (16x16) & Isometric 3D Block Icons (32x32) ---------- */
    const cache = {};
    function toolIcon(name) {
        const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d');
        const px = (x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };
        const HI = '#a8fff7', L = '#42e3d6', D = '#1e9e97', O = '#0e4d52';
        const S1 = '#6b421c', S2 = '#9c6632';
        const stick = (x0, y0, n) => { for (let i = 0; i < n; i++) { px(x0 + i, y0 - i, S1); px(x0 + i + 1, y0 - i, S2); } };
        const paint = (pts) => pts.forEach(([x, y, t]) => px(x, y, t === 3 ? HI : t === 2 ? L : t === 1 ? D : O));

        if (name === 'pickaxe') {
            stick(2, 14, 9);
            paint([
                [4, 2, 0], [5, 1, 0], [6, 1, 0], [7, 1, 0], [8, 1, 0], [9, 1, 0], [10, 2, 0], [11, 3, 0], [12, 4, 0], [13, 5, 0], [14, 6, 0], [14, 7, 0], [14, 8, 0],
                [4, 3, 2], [5, 2, 3], [6, 2, 3], [7, 2, 2], [8, 2, 2], [9, 2, 3], [10, 3, 2], [11, 4, 2], [12, 5, 2], [13, 6, 2], [13, 7, 1], [13, 8, 1],
                [5, 3, 1], [6, 3, 2], [7, 3, 1], [8, 3, 1], [9, 3, 2], [10, 4, 1], [11, 5, 1], [12, 6, 1], [12, 7, 0]
            ]);
        } else if (name === 'axe') {
            stick(2, 14, 9);
            paint([
                [7, 1, 0], [8, 1, 0], [9, 1, 0], [10, 2, 0], [11, 3, 0], [12, 4, 0], [13, 5, 0], [13, 6, 0], [12, 7, 0], [11, 8, 0], [10, 8, 0],
                [7, 2, 3], [8, 2, 3], [9, 2, 2], [10, 3, 3], [11, 4, 2], [12, 5, 2], [12, 6, 1], [11, 7, 1], [10, 7, 1],
                [8, 3, 2], [9, 3, 2], [9, 4, 1], [10, 4, 2], [10, 5, 1], [10, 6, 1], [11, 5, 2], [11, 6, 1], [8, 4, 1]
            ]);
        } else if (name === 'shovel') {
            stick(2, 14, 8);
            paint([
                [10, 1, 0], [11, 0, 0], [12, 0, 0], [13, 1, 0], [14, 2, 0], [14, 3, 0], [14, 4, 0], [13, 5, 0], [12, 6, 0], [10, 5, 0], [9, 4, 0], [9, 2, 0],
                [11, 1, 3], [12, 1, 3], [13, 2, 2], [13, 3, 2], [13, 4, 1], [12, 5, 1], [11, 5, 1], [10, 4, 2], [10, 3, 2], [10, 2, 3], [11, 2, 3], [11, 3, 2], [11, 4, 1], [12, 2, 2], [12, 3, 2], [12, 4, 1]
            ]);
        } else if (name === 'sword') {
            for (let i = 0; i < 9; i++) {
                px(5 + i, 10 - i, i > 6 ? HI : L);
                px(6 + i, 10 - i, D);
                px(5 + i, 9 - i, i > 5 ? HI : L);
            }
            px(14, 1, HI); px(14, 2, L); px(13, 1, HI);
            // Crossguard & hilt
            for (let i = 0; i < 5; i++) { px(2 + i, 8 + i, O); px(3 + i, 8 + i, D); }
            px(3, 12, S1); px(2, 13, S2); px(1, 14, D); px(2, 14, L);
        }
        return c;
    }

    /* Render true 3D isometric Minecraft block preview into a 32x32 canvas (padded atlas aware!) */
    function blockIcon(id) {
        const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d');
        g.imageSmoothingEnabled = false;
        const d = DEF[id]; if (!d) return c;
        const STR = W.STRIDE || W.TILE, PAD = W.PAD_PX || 0;
        if (d.cross || d.torch) {
            const t = d.side;
            g.drawImage(E.atlas, (t % W.COLS) * STR + PAD, Math.floor(t / W.COLS) * STR + PAD, W.TILE, W.TILE, 2, 2, 28, 28);
            return c;
        }
        const drawTile = (tileIdx, a, b, c2, d2, e, f, shadeAlpha) => {
            g.save();
            g.setTransform(a, b, c2, d2, e, f);
            g.drawImage(E.atlas, (tileIdx % W.COLS) * STR + PAD, Math.floor(tileIdx / W.COLS) * STR + PAD, W.TILE, W.TILE, 0, 0, 16, 16);
            if (shadeAlpha > 0) { g.fillStyle = 'rgba(0,0,0,' + shadeAlpha + ')'; g.fillRect(0, 0, 16, 16); }
            g.restore();
        };
        // Top diamond
        drawTile(d.top, 0.82, 0.42, -0.82, 0.42, 16, 2.2, 0);
        // Left face
        drawTile(d.side, 0.82, 0.42, 0, 0.94, 2.88, 8.92, 0.16);
        // Right face
        drawTile(d.side, 0.82, -0.42, 0, 0.94, 16, 15.64, 0.34);
        return c;
    }

    I.icon = it => {
        const k = String(it);
        if (!cache[k]) cache[k] = I.isTool(it) ? toolIcon(it) : blockIcon(it);
        return cache[k];
    };

    I.iconCanvas = it => {
        const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d');
        g.imageSmoothingEnabled = false;
        if (it !== null && it !== undefined && (I.isTool(it) || I.isBlock(it))) {
            const src = I.icon(it);
            g.drawImage(src, 0, 0, src.width, src.height, 0, 0, 32, 32);
        }
        return c;
    };

    I.catalog = (cat) => {
        const tools = Object.keys(I.TOOLS);
        const blocks = Object.keys(DEF).map(Number).filter(id => DEF[id].place);
        if (!cat || cat === 'all') return tools.concat(blocks);
        if (cat === 'tools') return tools;
        return blocks.filter(id => DEF[id].cat === cat);
    };
})();
