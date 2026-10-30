/* CV World — items: tools + blocks that can sit in the hotbar, mining speed per tool, icons */
(function () {
    'use strict';
    const W = window.CVW, E = window.CVE, B = W.B, DEF = W.DEF;
    const I = {};
    window.CVI = I;

    /* tool: attack damage, mining speed multiplier on its matching block class */
    I.TOOLS = {
        pickaxe: { name: 'Pickaxe', dmg: 3, eff: 'pick', speed: 6 },
        axe: { name: 'Axe', dmg: 4, eff: 'axe', speed: 6 },
        shovel: { name: 'Shovel', dmg: 2.5, eff: 'shovel', speed: 6 },
        sword: { name: 'Sword', dmg: 6, eff: 'sword', speed: 1.6 }
    };
    I.isTool = it => typeof it === 'string';
    I.isBlock = it => typeof it === 'number' && it > 0 && !!DEF[it];
    I.name = it => I.isTool(it) ? I.TOOLS[it].name : (I.isBlock(it) ? DEF[it].name : 'Empty hand');
    I.damage = it => I.isTool(it) ? I.TOOLS[it].dmg : 1.5;

    /* block class + hardness (seconds by bare hand); the matching tool divides it by its speed */
    const HARD = {};
    function cls(c, h, ids) { ids.forEach(id => { HARD[id] = [c, h]; }); }
    cls('shovel', 0.75, [B.GRASS, B.DIRT, B.SAND, B.GRAVEL, B.SNOW]);
    cls('axe', 1.6, [B.LOG, B.PLANKS, B.BOOKS]);
    cls('pick', 3.5, [B.STONE, B.COBBLE, B.STONEBRICK, B.BRICK, B.SANDSTONE, B.MOSSY, B.QUARTZ, B.C_CYAN, B.C_GREEN, B.C_ORANGE, B.C_PURPLE, B.C_BLUE, B.C_PINK, B.C_YELLOW, B.C_RED, B.C_BLACK]);
    cls('pick', 4.5, [B.COAL, B.IRON, B.GOLD, B.DIAMOND]);
    cls('pick', 12, [B.OBSIDIAN]);
    cls('none', 0.35, [B.LEAVES, B.SPRUCE, B.GLASS, B.WOOL_W, B.WOOL_R, B.GLOW, B.LAMP, B.CACTUS]);
    cls('none', 0.05, [B.TALLGRASS, B.FLOWER_R, B.FLOWER_Y]);

    I.dig = function (id, it) {
        const h = HARD[id] || ['pick', 3.5];
        const t = I.isTool(it) ? I.TOOLS[it] : null;
        if (!t) return h[1];
        if (h[0] === t.eff) return Math.max(0.12, h[1] / t.speed);
        if (t.eff === 'sword') return h[0] === 'none' ? h[1] * 0.6 : h[1] / 1.3;
        return h[1];
    };
    /* which tool is the right one for a block (used by hints) */
    I.bestTool = id => { const h = HARD[id]; return h && h[0] !== 'none' ? h[0] === 'pick' ? 'pickaxe' : h[0] : null; };

    /* ---------- icons (16x16) ---------- */
    const cache = {};
    function toolIcon(name) {
        const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d');
        const px = (x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };
        const L = '#e4ebee', D = '#97a5ac', S1 = '#7a4e22', S2 = '#a56f36';
        const stick = (x0, y0, n) => { for (let i = 0; i < n; i++) { px(x0 + i, y0 - i, S1); px(x0 + i + 1, y0 - i, S2); } };
        const fill = (pts, a, b) => pts.forEach((p, i) => px(p[0], p[1], i % 3 === 2 ? b : a));
        if (name === 'pickaxe') {
            stick(2, 14, 9);
            fill([[3, 6], [4, 4], [5, 3], [6, 2], [7, 2], [8, 2], [9, 2], [10, 3], [11, 4], [12, 5], [13, 7], [13, 8], [4, 5], [5, 4], [6, 3], [7, 3], [8, 3], [9, 3], [10, 4], [11, 5], [12, 6]], L, D);
        } else if (name === 'axe') {
            stick(2, 14, 9);
            fill([[7, 2], [8, 2], [9, 2], [10, 3], [11, 4], [12, 5], [12, 6], [11, 7], [10, 7], [9, 6], [8, 5], [8, 4], [8, 3], [9, 3], [9, 4], [9, 5], [10, 4], [10, 5], [10, 6], [11, 5], [11, 6]], L, D);
        } else if (name === 'shovel') {
            stick(2, 14, 8);
            fill([[11, 1], [12, 1], [13, 2], [13, 3], [13, 4], [12, 5], [11, 5], [10, 4], [10, 3], [10, 2], [11, 2], [11, 3], [11, 4], [12, 2], [12, 3], [12, 4]], L, D);
        } else if (name === 'sword') {
            for (let i = 0; i < 9; i++) { px(5 + i, 11 - i, L); px(6 + i, 11 - i, D); px(5 + i, 10 - i, D); }
            for (let i = 0; i < 4; i++) { px(3 + i, 9 + i, S2); px(4 + i, 9 + i, S1); }
            px(3, 12, S1); px(2, 13, S1); px(2, 14, S2); px(1, 14, S1);
        }
        return c;
    }
    function blockIcon(id) {
        const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
        const d = DEF[id]; if (!d) return c;
        const t = d.side; g.drawImage(E.atlas, (t % W.COLS) * W.TILE, Math.floor(t / W.COLS) * W.TILE, W.TILE, W.TILE, 0, 0, 16, 16);
        return c;
    }
    I.icon = it => { const k = String(it); if (!cache[k]) cache[k] = I.isTool(it) ? toolIcon(it) : blockIcon(it); return cache[k]; };
    /* fresh canvas copy (the hotbar / inventory attach one per slot) */
    I.iconCanvas = it => {
        const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
        if (it !== null && it !== undefined && (I.isTool(it) || I.isBlock(it))) g.drawImage(I.icon(it), 0, 0);
        return c;
    };
    /* everything the inventory offers: tools first, then every placeable block */
    I.catalog = () => Object.keys(I.TOOLS).concat(Object.keys(DEF).map(Number).filter(id => DEF[id].place));
})();
