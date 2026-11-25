/* CV World — UI: CV Panels, Dialogue, Hearts/XP HUD, Minimap/BigMap, Categorized Inventory, Compendium + Achievements, Settings */
(function () {
    'use strict';
    const W = window.CVW, E = window.CVE, P = window.CVP, X = window.CVX, A = window.CVA, CV = window.CV_DATA;
    const $ = id => document.getElementById(id);
    const U = {
        panelOpen: false, dialogOpen: false, mapOpen: false, cpOpen: false,
        helpOpen: false, invOpen: false, finaleOpen: false,
        visited: new Set(), visitedDims: new Set(['overworld']), seen: new Set(), achv: new Set(), curInfo: null,
        placed: 0, playTime: 0, kills: 0, monsterKills: 0, delved: false, volcanoFound: false,
        invCat: 'all', cpTab: 'cv'
    };
    window.CVU = U;

    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const tags = (a, cls) => '<div class="tags">' + a.map(t => '<span class="tag ' + (cls || '') + '">' + esc(t) + '</span>').join('') + '</div>';

    /* ---------- CV Content Panel Definitions ---------- */
    const SECTIONS = {
        about: {
            ic: '👤', kicker: 'About Me', title: CV.name + ' — ' + CV.title, area: 'about', html: () =>
                CV.about.map(p => '<p>' + esc(p) + '</p>').join('') +
                '<div class="stat-row">' + CV.stats.map(s => '<div class="stat"><b>' + s.value + '</b><span>' + s.label + '</span></div>').join('') + '</div>' +
                '<h4>Status</h4><p>🟢 ' + esc(CV.status) + '</p>'
        },
        goals: {
            ic: '🎯', kicker: 'Career Goals', title: 'Career goals', area: 'about', html: () =>
                '<div class="goal"><small>Short-term</small>' + esc(CV.goals.short) + '</div><div class="goal l"><small>Long-term</small>' + esc(CV.goals.long) + '</div>' +
                '<h4>Key strengths</h4>' + tags(['Multi-Agent Systems', 'Hybrid RAG + GraphRAG', 'Voice AI', 'IoT', 'MCP Protocol', 'Production DevOps', 'Open Source'], 'p')
        },
        skill: {
            ic: '🧪', kicker: 'Technical Skills', area: 'skills',
            title: d => CV.skills[d].cat, html: d => '<p>Skill group <b>' + esc(CV.skills[d].cat) + '</b> (' + CV.skills[d].items.length + ' items):</p>' + tags(CV.skills[d].items) +
                '<h4>Tip</h4><p class="mut-note">' + (CV.skills.length - 1) + ' more skill pedestals are waiting in the garden. Visit enough of them to unlock an achievement.</p>'
        },
        exp: {
            ic: '💼', kicker: 'Work Experience', area: 'experience',
            title: d => CV.experience[d].role + ' @ ' + CV.experience[d].org, html: d => { const e = CV.experience[d]; return '<p>🗓️ <b>' + esc(e.period) + '</b> · ' + esc(e.org) + '</p><ul class="bul">' + e.bullets.map(b => '<li>' + esc(b) + '</li>').join('') + '</ul>'; }
        },
        project: {
            ic: '🏗️', kicker: 'Key Project', area: 'projects',
            title: d => CV.projects[d].n + ' · ' + CV.projects[d].name, html: d => { const p = CV.projects[d]; return '<p><span class="tag p">' + esc(p.cat) + '</span> &nbsp;<b>' + esc(p.sub) + '</b></p><p>' + esc(p.desc) + '</p>' + (p.url ? '<p><a class="ct-link" href="' + esc(p.url) + '" target="_blank" rel="noopener"><i>🔗</i><div><b>Open project repository</b><small>' + esc(p.url.replace('https://', '').replace('http://', '')) + '</small></div></a></p>' : '') + '<h4>Tech stack</h4>' + tags(p.tech); }
        },
        edu: {
            ic: '🎓', kicker: 'Education', area: 'education', title: () => CV.education.degree, html: () => { const e = CV.education; return '<p><b>' + esc(e.school) + '</b><br>' + esc(e.place) + ' · ' + esc(e.period) + '</p><h4>Relevant coursework</h4>' + tags(e.coursework); }
        },
        certs: {
            ic: '📜', kicker: 'Certifications & Languages', area: 'education', title: () => 'Learning & Languages', html: () =>
                '<h4>Languages</h4>' + CV.languages.map(l => '<div class="lang-row"><b>' + l.name + '</b><span>' + l.level + '</span></div>').join('') + '<h4>Learning & Practice</h4><ul class="bul">' + CV.certs.map(c => '<li>' + esc(c) + '</li>').join('') + '</ul>'
        },
        soft: {
            ic: '🤝', kicker: 'Soft Skills', area: 'education', title: () => 'Soft skills', html: () => tags(CV.softSkills, 'p')
        },
        contact: {
            ic: '📮', kicker: 'Get In Touch', area: 'contact', title: () => 'Get in touch with Bang', html: () => {
                const c = CV.contact; return '<p>I am open to new opportunities where I can contribute my AI engineering expertise. Feel free to reach out!</p>' +
                    '<a class="ct-link" href="mailto:' + c.email + '"><i>✉️</i><div><b>' + c.email + '</b><small>Email</small></div></a>' +
                    '<a class="ct-link" href="tel:+84329958001"><i>📞</i><div><b>' + c.phone + '</b><small>Phone / Zalo</small></div></a>' +
                    '<a class="ct-link" href="' + c.github + '" target="_blank" rel="noopener"><i>🐙</i><div><b>github.com/pvbang</b><small>GitHub</small></div></a>' +
                    '<a class="ct-link" href="' + c.linkedin + '" target="_blank" rel="noopener"><i>💼</i><div><b>linkedin.com/in/pvbang</b><small>LinkedIn</small></div></a>';
            }
        },
        cvdl: {
            ic: '⬇️', kicker: 'Download', area: 'contact', title: () => "Download Bang's CV", html: () =>
                '<a class="ct-link" href="' + CV.contact.cvPdf + '" target="_blank" rel="noopener"><i>🤖</i><div><b>AI Engineer CV (PDF)</b><small>Main CV</small></div></a>' +
                '<a class="ct-link" href="../files/PhanVanBang_GameDeveloper_CV.pdf" target="_blank" rel="noopener"><i>🎮</i><div><b>Game Developer CV</b><small>PDF</small></div></a>' +
                '<a class="ct-link" href="../files/PhanVanBang_TradingDeveloper_CV.pdf" target="_blank" rel="noopener"><i>📈</i><div><b>Trading Systems CV</b><small>PDF</small></div></a>' +
                '<a class="ct-link" href="../files/PhanVanBang_ContentVideo_CV.pdf" target="_blank" rel="noopener"><i>🎬</i><div><b>Content & Video CV</b><small>PDF</small></div></a>'
        },
        hire: {
            ic: '🚀', kicker: 'Hire Me', title: () => 'Why hire Bang?', area: 'contact', html: () =>
                '<ul class="bul"><li><b>Ships real products:</b> 50+ projects across 8+ industries, from Legal to Healthcare.</li><li><b>Technical depth:</b> open-source Nexus with 192 registered MCP tools and 1,373 tests.</li><li><b>End-to-end full stack:</b> from research, RAG and voice to DevOps and payments.</li><li><b>Quality:</b> thousands of test functions, CI/CD, monitoring and fallbacks.</li><li><b>Self-driven, fast learner:</b> builds and sells own products (trading EA, AI video studio).</li></ul>' +
                '<a class="ct-link" href="mailto:' + CV.contact.email + '?subject=Hiring%20inquiry%20-%20Phan%20Van%20Bang"><i>✉️</i><div><b>Send an email now</b><small>' + CV.contact.email + '</small></div></a>'
        },
        secret: {
            ic: '💎', kicker: 'Secret Summit', title: () => 'You found the secret summit!', area: 'secret', html: () =>
                '<p>Congratulations! Very few recruiters climb up here 🏔️. Here is what I do not put in my CV:</p><ul class="bul"><li>I love <b>turning ideas into working products</b>, even when that product is a full voxel world right inside the browser.</li><li>I have built Unity games, so I enjoy projects with rich interaction, shaders, and experience design.</li><li>This entire world is procedural JavaScript + GLSL + Three.js, with zero external assets.</li><li>Try stepping into the glowing summit portal behind you to warp straight to the Volcanic Caldera!</li></ul><p>If you like how I work, send me a message 🚀</p>'
        }
    };
    U.SECTIONS = SECTIONS;

    /* ---------- Toasts & Action Hint ---------- */
    U.toast = function (icon, kind, title, desc) {
        const t = document.createElement('div'); t.className = 'toast ' + (kind || '');
        t.innerHTML = '<div class="ti">' + icon + '</div><div><div class="tt">' + esc(title) + '</div><div class="td">' + esc(desc) + '</div></div>';
        $('toasts').appendChild(t); setTimeout(() => t.remove(), 5000);
        while ($('toasts').children.length > 3) $('toasts').firstChild.remove();
    };
    U.hint = function (txt) {
        const h = $('hint'); if (!h) return;
        if (txt) { h.textContent = txt; h.classList.add('show'); } else h.classList.remove('show');
    };

    /* ---------- Health Hearts & XP Bar ---------- */
    U.updateHealth = function (hp, maxHp) {
        const row = $('hearts'); if (!row) return;
        const total = Math.ceil((maxHp || 20) / 2);
        let html = '';
        for (let i = 0; i < total; i++) {
            const val = hp - i * 2;
            const cls = val >= 1.5 ? 'full' : (val >= 0.5 ? 'half' : 'empty');
            html += '<span class="hrt ' + cls + '"></span>';
        }
        row.innerHTML = html;
    };

    U.updateXp = function (xp, level) {
        const fill = $('xpFill'), lvl = $('xpLvl');
        if (fill) fill.style.width = Math.min(100, (xp / Math.max(1, level * 10)) * 100) + '%';
        if (lvl) lvl.textContent = level;
    };

    /* ---------- Achievements ---------- */
    const ACHV = [
        { id: 'first', ic: '👋', t: 'First steps', d: 'Open your first piece of CV info.', test: () => U.seen.size >= 1 },
        { id: 'chat', ic: '🗣️', t: 'Chatterbox', d: 'Talk to all 4 NPCs.', test: () => X.talkedIds.size >= 4 || (X.npcs.length > 0 && X.npcs.every(n => n.talked)) },
        { id: 'skills', ic: '🧪', t: 'Skill collector', d: 'View 6 different skill groups.', test: () => [...U.seen].filter(k => k.startsWith('skill:')).length >= 6 },
        { id: 'projects', ic: '🏗️', t: 'Architect', d: 'View 8 projects.', test: () => [...U.seen].filter(k => k.startsWith('project:')).length >= 8 },
        { id: 'allproj', ic: '🏙️', t: 'Project inspector', d: 'View all 18 projects.', test: () => [...U.seen].filter(k => k.startsWith('project:')).length >= 18 },
        { id: 'exp', ic: '💼', t: 'Battle tested', d: 'View both work positions.', test: () => U.seen.has('exp:0') && U.seen.has('exp:1') },
        { id: 'shards6', ic: '💎', t: 'Knowledge miner', d: 'Collect 6 Knowledge Shards.', test: () => X.collected.size >= 6 },
        { id: 'shards12', ic: '👑', t: 'Knowledge master', d: 'Collect all 12 Knowledge Shards.', test: () => X.collected.size >= 12 },
        { id: 'tour', ic: '🧭', t: 'Explorer', d: 'Visit all 6 main CV districts.', test: () => U.visited.size >= 6 },
        { id: 'secret', ic: '🏔️', t: 'Mountaineer', d: 'Discover the Secret Alpine Summit.', test: () => U.seen.has('secret:secret') },
        { id: 'volcano', ic: '🌋', t: 'Volcano Explorer', d: 'Reach the Volcanic Caldera Portal.', test: () => U.volcanoFound },
        { id: 'nether', ic: '🔥', t: 'Into The Nether', d: 'Step through a portal into The Nether.', test: () => U.visitedDims.has('nether') },
        { id: 'aether', ic: '☁️', t: 'Sky Walker', d: 'Soar across the Aether Sky Islands.', test: () => U.visitedDims.has('aether') },
        { id: 'cosmos', ic: '🌌', t: 'Star Voyager', d: 'Enter the low-gravity Cosmos Nebula.', test: () => U.visitedDims.has('cosmos') },
        { id: 'dungeon_dim', ic: '🏰', t: 'Abyssal Raider', d: 'Conquer the Abyssal Dungeon realm.', test: () => U.visitedDims.has('dungeon') },
        { id: 'hunter', ic: '⚔️', t: 'Wilderness Hunter', d: 'Defeat 5 mobs with a sword or tool.', test: () => U.kills >= 5 },
        { id: 'slayer', ic: '🛡️', t: 'Monster Slayer', d: 'Defeat 3 hostile monsters.', test: () => U.monsterKills >= 3 },
        { id: 'delver', ic: '🕳️', t: 'Dungeon Delver', d: 'Reach the treasure vault of a dungeon.', test: () => U.delved },
        { id: 'builder', ic: '🧱', t: 'Master Builder', d: 'Place 20 blocks in the world.', test: () => U.placed >= 20 },
        { id: 'night', ic: '🌙', t: 'Night Owl', d: 'Keep exploring under the stars.', test: () => E.isNight && U.playTime > 20 },
        { id: 'contact', ic: '📮', t: 'Connected', d: 'Open the Contact or Hire Me page.', test: () => U.seen.has('contact:contact') || U.seen.has('hire:hire') }
    ];
    U.ACHV = ACHV;

    U.checkAchv = function () {
        ACHV.forEach(a => {
            if (!U.achv.has(a.id) && a.test()) {
                U.achv.add(a.id);
                U.toast(a.ic, 'achv', 'Achievement Unlocked', a.t + ' — ' + a.d);
                A.play('achv');
            }
        });
        U.save();
        if (U.achv.has('shards12') && U.achv.has('tour') && !U.finaleShown) {
            U.finaleShown = true;
            setTimeout(U.showFinale, 2500);
        }
    };

    /* ---------- Save / Load Progress ---------- */
    const KEY = 'cvworld.v1';
    U.save = function () {
        try {
            X.npcs.forEach(n => { if (n.talked) X.talkedIds.add(n.data.id); });
            localStorage.setItem(KEY, JSON.stringify({
                v: [...U.visited], vd: [...U.visitedDims], s: [...U.seen], a: [...U.achv], c: [...X.collected],
                t: [...X.talkedIds],
                f: !!U.finaleShown,
                k: U.kills, mk: U.monsterKills, pl: U.placed,
                dl: !!U.delved, vf: !!U.volcanoFound
            }));
        } catch (e) { }
    };
    U.load = function () {
        try {
            const j = JSON.parse(localStorage.getItem(KEY) || 'null'); if (!j) return;
            (j.v || []).forEach(v => U.visited.add(v));
            (j.vd || []).forEach(v => U.visitedDims.add(v));
            (j.s || []).forEach(v => U.seen.add(v));
            (j.a || []).forEach(v => U.achv.add(v));
            (j.c || []).forEach(v => X.collected.add(v));
            (j.t || []).forEach(v => X.talkedIds.add(v));
            U.finaleShown = !!j.f; U.savedTalk = j.t || [];
            U.kills = j.k || 0; U.monsterKills = j.mk || 0; U.placed = j.pl || 0;
            U.delved = !!j.dl; U.volcanoFound = !!j.vf;
        } catch (e) { }
    };
    U.applyLoaded = function () {
        X.shards.forEach(s => { if (X.collected.has(s.id)) { s.got = true; s.mesh.visible = false; } });
        X.npcs.forEach(n => { if (X.talkedIds.has(n.data.id)) n.talked = true; });
    };
    U.resetProgress = function () { try { localStorage.removeItem(KEY); } catch (e) { } location.reload(); };

    /* ---------- Content Panel ---------- */
    U.openInfo = function (info) {
        const S = SECTIONS[info.type]; if (!S) return;
        U.curInfo = info;
        const d = info.id;
        $('pnIc').textContent = S.ic; $('pnKicker').textContent = S.kicker;
        $('pnTitle').textContent = typeof S.title === 'function' ? S.title(d) : S.title;
        $('pnBody').innerHTML = S.html(d); $('pnBody').scrollTop = 0;

        const nav = $('pnNav'); nav.innerHTML = '';
        const grp = (info.type === 'skill' || info.type === 'project' || info.type === 'exp') ? W.infoList.filter(i => i.type === info.type) : null;
        if (grp && grp.length > 1) {
            const i = grp.indexOf(info);
            const mk = (txt, to) => { const b = document.createElement('button'); b.className = 'pn-nav-btn'; b.textContent = txt; b.onclick = () => { A.play('click'); U.openInfo(to); }; return b; };
            nav.appendChild(mk('◀ Prev', grp[(i - 1 + grp.length) % grp.length]));
            nav.appendChild(document.createTextNode(' ' + (i + 1) + '/' + grp.length + ' '));
            nav.appendChild(mk('Next ▶', grp[(i + 1) % grp.length]));
        }
        $('panel').classList.remove('hidden'); U.panelOpen = true;
        U.seen.add(info.type + ':' + info.id);
        if (S.area) U.visitArea(S.area);
        A.play('open'); if (document.exitPointerLock) document.exitPointerLock();
        U.checkAchv(); U.refreshHUD();
    };
    U.openSection = function (type, id) { U.openInfo({ type, id: id === undefined ? type : id }); };
    U.closePanel = function () { if (!U.panelOpen) return; $('panel').classList.add('hidden'); U.panelOpen = false; A.play('close'); U.afterClose(); };
    U.afterClose = function () { if (U.onResume) U.onResume(); };

    /* ---------- NPC Dialogue ---------- */
    let dlNpc = null, dlIdx = 0, typeTimer = null, typeFull = '';
    U.activeNpc = () => dlNpc;
    function typeText(txt) {
        clearInterval(typeTimer); typeFull = txt; const el = $('dlText'); el.textContent = ''; let i = 0;
        typeTimer = setInterval(() => {
            i += 2; el.textContent = txt.slice(0, i);
            if (i % 6 === 0) A.play('talk');
            if (i >= txt.length) { clearInterval(typeTimer); typeTimer = null; }
        }, 20);
    }
    U.startDialog = function (npc) {
        dlNpc = npc; dlIdx = 0; U.dialogOpen = true; npc.talked = true;
        X.talkedIds.add(npc.data.id);
        $('dlName').textContent = npc.data.name + ' — ' + npc.data.role;
        $('dialog').classList.remove('hidden');
        typeText(npc.data.lines[0]);
        A.play('open'); U.checkAchv();
    };
    U.closeDialog = function (silent) {
        if (!U.dialogOpen) return;
        clearInterval(typeTimer); typeTimer = null;
        U.dialogOpen = false; dlNpc = null;
        $('dialog').classList.add('hidden');
        if (!silent) A.play('close');
    };
    U.advanceDialog = function () {
        if (!U.dialogOpen) return;
        if (typeTimer) { clearInterval(typeTimer); typeTimer = null; $('dlText').textContent = typeFull; return; }
        dlIdx++;
        if (!dlNpc || dlIdx >= dlNpc.data.lines.length) {
            const wasBang = dlNpc && dlNpc.data.id === 'bang';
            U.closeDialog();
            U.checkAchv();
            if (wasBang) U.setQuest();
            return;
        }
        typeText(dlNpc.data.lines[dlIdx]);
    };

    /* ---------- Progress & Quests ---------- */
    const AREAS = ['about', 'skills', 'experience', 'projects', 'education', 'contact'];
    U.visitArea = function (a) {
        if (AREAS.includes(a) && !U.visited.has(a)) {
            U.visited.add(a);
            const L = CV.landmarks.find(l => l.id === a);
            if (L) U.toast(L.icon, '', 'District Discovered', L.name + ' (' + U.visited.size + '/6)');
            U.checkAchv();
        }
        U.refreshHUD();
    };
    U.refreshHUD = function () {
        $('visitTxt').textContent = U.visited.size + '/6';
        $('shardTxt').textContent = X.collected.size + '/' + CV.shards.length;
        U.setQuest();
    };
    U.setQuest = function () {
        let q;
        if (W.dim !== 'overworld') {
            const m = W.dimMeta;
            q = 'Exploring ' + m.icon + ' ' + m.name + '! Find glowing portals or press M to travel between realms.';
        } else if (!X.talkedIds.has('bang')) {
            q = 'Find Bang near Spawn Plaza (E) or step into the Dimensional Gateways nearby!';
        } else if (U.visited.size < 6) {
            const next = CV.landmarks.find(l => !U.visited.has(l.id));
            q = 'Explore ' + next.name + ' (' + U.visited.size + '/6) or warp into 4 Portal Dimensions (M).';
        } else if (X.collected.size < CV.shards.length) {
            q = 'Collect glowing Knowledge Shards (' + X.collected.size + '/' + CV.shards.length + ') — cyan dots on minimap.';
        } else if (U.visitedDims.size < 5) {
            q = 'Enter all 5 Portal Realms (' + U.visitedDims.size + '/5 visited) via the Dimensional Gateways!';
        } else {
            q = 'All CV districts, shards & 5 realms mastered! Visit the Contact Portal to connect.';
        }
        $('questTxt').textContent = q;
    };
    U.showFinale = function () {
        $('finTxt').textContent = 'You explored all of CV World: ' + U.visited.size + '/6 districts, ' + X.collected.size + '/12 Knowledge Shards and ' + U.achv.size + '/' + ACHV.length + ' achievements. Let\'s connect!';
        $('finale').classList.remove('hidden'); if (document.exitPointerLock) document.exitPointerLock(); U.finaleOpen = true; A.play('achv');
    };

    /* ---------- Current Area & Biome Lookup (All 5 Dimensions!) ---------- */
    U.areaAt = function (x, z) {
        if (W.dim === 'nether') {
            if (Math.hypot(x, z) < 12) return '🔥 Nether Sanctuary';
            if (Math.hypot(x, z + 38) < 18) return '🔥 Crimson Fortress';
            if (z < -12 && Math.abs(x) < 10) return '🔥 Basalt Bridge';
            return '🔥 Nether Lava Sea';
        }
        if (W.dim === 'aether') {
            if (Math.hypot(x, z) < 18) return '☁️ Sky Sanctuary';
            if (Math.hypot(x, z + 42) < 18) return '☁️ Golden Sky Temple';
            return '☁️ Floating Archipelago';
        }
        if (W.dim === 'cosmos') {
            if (Math.hypot(x, z) < 18) return '🌌 Cosmic Arena';
            if (Math.hypot(x, z + 44) < 18) return '🌌 Purpur Citadel';
            return '🌌 Asteroid Belt';
        }
        if (W.dim === 'dungeon') {
            if (Math.hypot(x, z) < 11) return '🏰 Abyssal Atrium';
            if (z < -28) return '🏰 Grand Treasury Vault';
            if (x < -25) return '🏰 Forgotten Library';
            if (x > 25) return '🏰 Amethyst Sanctum';
            return '🏰 Stone Corridors';
        }

        let best = null, bd = 1e9;
        const zones = [
            ['Spawn Plaza', 0, 0, 12],
            ['Dimensional Gateways', -16, -18, 11],
            ['About Tower', 0, -22, 11],
            ['Skills Garden', -28, 0, 15],
            ['Experience Hall', -18, 28, 14],
            ['Projects District', 30, 16, 24],
            ['VKU Campus', 30, -18, 12],
            ['Contact Portal', 0, 44, 12],
            ['Secret Summit', -56, -54, 12],
            ['Volcanic Caldera', 64, -56, 22],
            ['Cherry Grove', -58, 44, 22],
            ['Desert Temple', 68, 54, 15],
            ['Harbor Lighthouse', -70, 4, 15]
        ];
        zones.forEach(q => { const d = Math.hypot(x - q[1], z - q[2]); if (d < q[3] && d < bd) { bd = d; best = q[0]; } });
        if (best) return best;
        const gy = Math.floor(P.pos.y);
        for (const d of W.dungeons) if (Math.abs(x - (d.rx + 5)) < 7 && Math.abs(z - d.rz) < 6 && gy < 15) return 'Dungeon Vault';
        const ix = Math.floor(x) + W.OX, iz = Math.floor(z) + W.OZ;
        if (ix < 0 || ix >= W.SX || iz < 0 || iz >= W.SZ) return 'Open Ocean';
        const bi = W.biomeMap[iz * W.SX + ix];
        if (gy < 8 && Math.hypot(x, z) > 42) return 'Deep Caves';
        if (W.topY(Math.floor(x), Math.floor(z)) > 38) return 'Alpine Peaks';
        return W.BIOME_NAMES[bi] || 'Wilderness';
    };

    /* ---------- Minimap & Big Map (5-Dimension Aware!) ---------- */
    let mmBase = null;
    function buildMapBase() {
        const S = W.SX, c = document.createElement('canvas'); c.width = c.height = S;
        const g = c.getContext('2d'), im = g.createImageData(S, S);
        const B = W.B;
        const col = {};
        col[B.GRASS] = [90, 166, 60]; col[B.SAND] = [219, 204, 150]; col[B.WATER] = [44, 108, 214];
        col[B.STONE] = [126, 130, 136]; col[B.SNOW] = [242, 248, 255]; col[B.SNOW_GRASS] = [212, 232, 238];
        col[B.DIRT] = [132, 92, 54]; col[B.LEAVES] = [46, 122, 42]; col[B.BIRCH_LEAVES] = [94, 154, 70];
        col[B.CHERRY_LEAVES] = [240, 160, 198]; col[B.SPRUCE] = [38, 92, 62]; col[B.GRAVEL] = [156, 152, 146];
        col[B.STONEBRICK] = [142, 146, 154]; col[B.QUARTZ] = [238, 236, 228]; col[B.SANDSTONE] = [210, 192, 132];
        col[B.CACTUS] = [44, 128, 52]; col[B.MOSSY] = [92, 124, 82]; col[B.LAVA] = [255, 102, 24];
        col[B.MAGMA] = [176, 58, 24]; col[B.BASALT] = [66, 68, 76]; col[B.OBSIDIAN] = [40, 26, 60];
        col[B.CRYING_OBS] = [74, 34, 126]; col[B.ICE] = [146, 206, 250];
        col[B.AMETHYST] = [164, 96, 235]; col[B.GOLD] = [242, 202, 52]; col[B.DIAMOND_BLOCK] = [76, 232, 224];
        col[B.EMERALD_BLOCK] = [46, 204, 113];
        // New Dimension Blocks
        col[B.NETHERRACK] = [132, 42, 42]; col[B.NETHER_BRICK] = [64, 30, 38]; col[B.SOUL_SAND] = [92, 72, 58];
        col[B.SHROOMLIGHT] = [255, 188, 66]; col[B.CRIMSON_NYLIUM] = [168, 36, 52]; col[B.CRIMSON_CAP] = [140, 24, 42];
        col[B.WARPED_NYLIUM] = [32, 158, 144]; col[B.WARPED_CAP] = [24, 134, 126];
        col[B.AETHER_GRASS] = [106, 214, 196]; col[B.AETHER_STONE] = [188, 204, 226]; col[B.CLOUD_BLOCK] = [240, 248, 255];
        col[B.SKY_CRYSTAL] = [125, 228, 255]; col[B.END_STONE] = [222, 218, 168]; col[B.PURPUR] = [172, 124, 184];
        col[B.STAR_CRYSTAL] = [232, 121, 249]; col[B.VOID_STONE] = [28, 32, 54]; col[B.DEEPSLATE] = [62, 68, 82];

        const scanTop = W.dim === 'nether' ? 42 : (W.dim === 'dungeon' ? 20 : W.SY - 1);
        const voidCol = W.dim === 'aether' ? [144, 198, 246] : (W.dim === 'cosmos' ? [14, 12, 34] : (W.dim === 'dungeon' ? [26, 28, 38] : [36, 16, 16]));

        for (let x = 0; x < S; x++) for (let z = 0; z < S; z++) {
            const wx = x - W.OX, wz = z - W.OZ;
            let y = scanTop, id = 0;
            if (W.dim === 'dungeon' && W.get(wx, scanTop, wz) === B.DEEPSLATE) {
                id = 0; // Solid exterior rock wall around dungeon rooms
            } else {
                for (; y >= 0; y--) {
                    id = W.get(wx, y, wz);
                    if (id && !W.DEF[id].cross) break;
                }
            }
            let cc = id ? col[id] : voidCol;
            if (!cc) {
                const d = W.DEF[id];
                if (d && d.emit) cc = [255, 220, 110];
                else if (id >= B.C_CYAN && id <= B.C_BLACK) cc = [142, 108, 210];
                else cc = [162, 120, 86];
            }
            const sh = id ? (0.72 + Math.min(0.40, y / Math.max(40, scanTop))) : 1.0;
            const i = (z * S + x) * 4;
            im.data[i] = Math.min(255, cc[0] * sh);
            im.data[i + 1] = Math.min(255, cc[1] * sh);
            im.data[i + 2] = Math.min(255, cc[2] * sh);
            im.data[i + 3] = 255;
        }
        g.putImageData(im, 0, 0);
        return c;
    }
    U.buildMap = function () { mmBase = buildMapBase(); };

    function drawMarkers(ctx, r, labels) {
        if (W.dim === 'overworld') {
            CV.landmarks.forEach(l => {
                ctx.fillStyle = '#' + l.color.toString(16).padStart(6, '0');
                ctx.strokeStyle = '#000'; ctx.lineWidth = 0.45;
                ctx.beginPath(); ctx.arc(l.x + W.OX, l.z + W.OZ, r * 0.65, 0, 7); ctx.fill(); ctx.stroke();
                if (labels) {
                    ctx.fillStyle = '#fff'; ctx.font = 'bold 4px sans-serif'; ctx.textAlign = 'center';
                    ctx.fillText(l.sign, l.x + W.OX, l.z + W.OZ - 3.6);
                }
            });
            const extras = [
                { x: -16, z: -18, c: '#fde047', t: 'GATEWAYS' },
                { x: -56, z: -54, c: '#4ff2e4', t: 'SUMMIT' },
                { x: 64, z: -56, c: '#ff6a1a', t: 'VOLCANO' },
                { x: -58, z: 44, c: '#f9a8d4', t: 'CHERRY' },
                { x: 68, z: 54, c: '#facc15', t: 'PYRAMID' }
            ];
            extras.forEach(e => {
                ctx.fillStyle = e.c; ctx.strokeStyle = '#000'; ctx.lineWidth = 0.4;
                ctx.beginPath(); ctx.arc(e.x + W.OX, e.z + W.OZ, r * 0.55, 0, 7); ctx.fill(); ctx.stroke();
                if (labels) { ctx.fillStyle = e.c; ctx.font = 'bold 3.6px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(e.t, e.x + W.OX, e.z + W.OZ - 3.4); }
            });
            X.shards.forEach(s => { if (!s.got) { ctx.fillStyle = '#4ff2e4'; ctx.fillRect(s.mesh.position.x + W.OX - r * 0.3, s.mesh.position.z + W.OZ - r * 0.3, r * 0.6, r * 0.6); } });
            W.dungeons.forEach(d => { ctx.fillStyle = '#7bd88f'; ctx.strokeStyle = '#000'; ctx.lineWidth = 0.3; ctx.fillRect(d.x + W.OX - r * 0.32, d.z + W.OZ - r * 0.32, r * 0.64, r * 0.64); ctx.strokeRect(d.x + W.OX - r * 0.32, d.z + W.OZ - r * 0.32, r * 0.64, r * 0.64); });
            X.npcs.forEach(n => { ctx.fillStyle = '#ffe14d'; ctx.fillRect(n.mesh.position.x + W.OX - r * 0.28, n.mesh.position.z + W.OZ - r * 0.28, r * 0.56, r * 0.56); });
        } else {
            // Draw glowing Portal markers in extra dimensions
            W.portals.forEach(p => {
                ctx.fillStyle = '#e879f9'; ctx.strokeStyle = '#000'; ctx.lineWidth = 0.4;
                ctx.beginPath(); ctx.arc(p.x + W.OX, p.z + W.OZ, r * 0.65, 0, 7); ctx.fill(); ctx.stroke();
                if (labels) {
                    const dest = p.toDim && W.DIM_META[p.toDim] ? W.DIM_META[p.toDim].name.toUpperCase() : 'PORTAL';
                    ctx.fillStyle = '#f5d0fe'; ctx.font = 'bold 3.4px sans-serif'; ctx.textAlign = 'center';
                    ctx.fillText(dest, p.x + W.OX, p.z + W.OZ - 3.2);
                }
            });
        }
        // Red hostile mob blips on minimap
        if (!labels && window.CVM) {
            const hostiles = window.CVM.getNearbyHostiles();
            ctx.fillStyle = '#ef4444';
            for (let i = 0; i < hostiles.length; i++) {
                const m = hostiles[i];
                ctx.beginPath(); ctx.arc(m.x + W.OX, m.z + W.OZ, r * 0.28, 0, 7); ctx.fill();
            }
        }
    }

    function drawMap(ctx, size, centered, pos, yaw) {
        ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, size, size);
        const S = W.SX;
        if (centered) {
            const R = Math.min(42, S * 0.36), sc = size / (R * 2);
            ctx.save(); ctx.translate(size / 2, size / 2); ctx.rotate(yaw); ctx.scale(sc, sc); ctx.translate(-(pos.x + W.OX), -(pos.z + W.OZ));
            ctx.drawImage(mmBase, 0, 0); drawMarkers(ctx, 1 / sc * 5, false); ctx.restore();
            ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(size / 2, size / 2 - 7); ctx.lineTo(size / 2 + 5, size / 2 + 6); ctx.lineTo(size / 2 - 5, size / 2 + 6); ctx.closePath(); ctx.fill(); ctx.stroke();
        } else {
            const sc = size / S; ctx.save(); ctx.scale(sc, sc); ctx.drawImage(mmBase, 0, 0); drawMarkers(ctx, Math.max(1.8, S / 76), true); ctx.restore();
            ctx.save(); ctx.translate((pos.x + W.OX) * sc, (pos.z + W.OZ) * sc); ctx.rotate(-yaw + Math.PI);
            ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(7, 8); ctx.lineTo(-7, 8); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
        }
    }
    U.drawMinimap = function (pos, yaw) { if (mmBase) drawMap($('mm').getContext('2d'), 160, true, pos, yaw); };

    /* ---------- Big Map, Realm Switcher & Fast Travel ---------- */
    U.openMap = function () {
        if (U.mapOpen) return; U.mapOpen = true; $('bigmap').classList.remove('hidden');
        if (document.exitPointerLock) document.exitPointerLock();
        drawMap($('bmc').getContext('2d'), 520, false, P.pos, P.yaw);

        // Dimension Travel Tabs (All 5 Realms!)
        const dimBar = $('bmDims');
        if (dimBar) {
            dimBar.innerHTML = '';
            Object.values(W.DIM_META).forEach(dm => {
                const btn = document.createElement('button');
                btn.className = 'tab-btn' + (W.dim === dm.id ? ' active' : '');
                btn.innerHTML = dm.icon + ' ' + esc(dm.name) + (U.visitedDims.has(dm.id) && W.dim !== dm.id ? ' <span class="ok">✔</span>' : '');
                btn.onclick = () => {
                    if (W.dim === dm.id) return;
                    U.closeMap();
                    if (U.onTravelDim) U.onTravelDim(dm.id);
                };
                dimBar.appendChild(btn);
            });
        }

        const list = $('bmList'); list.innerHTML = '';
        let spots = [];
        if (W.dim === 'overworld') {
            spots = [
                { id: 'spawn', n: 'Spawn Plaza', ic: '🏠', area: null },
                { id: 'gateways', n: 'Portal Sanctuary', ic: '🌀', area: null, at: { x: -16, z: -13, y: W.BASE + 1 }, yaw: 0 }
            ].concat(
                CV.landmarks.map(l => ({ id: l.id, n: l.name, ic: l.icon, area: l.id })),
                [
                    { id: 'secret', n: 'Secret Summit', ic: '🏔️', area: 'secret' },
                    { id: 'volcano', n: 'Volcanic Portal', ic: '🌋', area: null },
                    { id: 'cherry', n: 'Cherry Grove', ic: '🌸', area: null, at: { x: -58, z: 51, y: W.topY(-58, 51) + 1 }, yaw: 0 },
                    { id: 'pyramid', n: 'Desert Temple', ic: '🏜️', area: null, at: { x: 68, z: 43, y: W.topY(68, 43) + 1 }, yaw: Math.PI },
                    { id: 'harbor', n: 'Harbor Pier', ic: '⚓', area: null, at: { x: -70, z: 4, y: W.WATER + 2 }, yaw: Math.PI / 2 }
                ],
                W.dungeons.slice(0, 4).map((d, i) => ({ id: 'dg' + i, n: 'Dungeon ' + (i + 1), ic: '🕳️', area: null, at: { x: d.x - 2, z: d.z, y: W.topY(d.x - 2, d.z) + 1 }, yaw: -Math.PI / 2 }))
            );
        } else if (W.dim === 'nether') {
            spots = [
                { id: 'spawn', n: 'Nether Sanctuary', ic: '🔥' },
                { id: 'fortress', n: 'Crimson Fortress', ic: '🏰' },
                { dim: 'overworld', n: 'Return to Overworld', ic: '🌍' }
            ];
        } else if (W.dim === 'aether') {
            spots = [
                { id: 'spawn', n: 'Sky Sanctuary', ic: '☁️' },
                { id: 'temple', n: 'Golden Sky Temple', ic: '🏛️' },
                { dim: 'overworld', n: 'Return to Overworld', ic: '🌍' }
            ];
        } else if (W.dim === 'cosmos') {
            spots = [
                { id: 'spawn', n: 'Cosmic Arena', ic: '🌌' },
                { id: 'citadel', n: 'Purpur Citadel', ic: '🔭' },
                { dim: 'overworld', n: 'Return to Overworld', ic: '🌍' }
            ];
        } else if (W.dim === 'dungeon') {
            spots = [
                { id: 'spawn', n: 'Abyssal Atrium', ic: '🏰' },
                { id: 'vault', n: 'Grand Treasury Vault', ic: '👑' },
                { id: 'lib', n: 'Forgotten Library', ic: '📚', at: { x: -30, z: 0, y: 11 }, yaw: Math.PI / 2 },
                { id: 'ame', n: 'Amethyst Sanctum', ic: '💎', at: { x: 30, z: 0, y: 11 }, yaw: -Math.PI / 2 },
                { dim: 'overworld', n: 'Return to Overworld', ic: '🌍' }
            ];
        }

        spots.forEach(s => {
            const b = document.createElement('button'); b.className = 'tp-btn';
            b.innerHTML = '<span>' + s.ic + '</span><span>' + esc(s.n) + '</span>' + (s.area && U.visited.has(s.area) ? '<span class="ok">✔</span>' : '');
            b.onclick = () => {
                U.closeMap();
                if (s.dim) { if (U.onTravelDim) U.onTravelDim(s.dim); return; }
                const L = s.at || W.landmarks[s.id] || W.landmarks.spawn;
                P.teleport(L.x, L.y, L.z, s.yaw !== undefined ? s.yaw : (s.id === 'contact' ? Math.PI : (s.id === 'about' ? 0 : undefined)));
                if (s.id === 'volcano') { U.volcanoFound = true; U.checkAchv(); }
                A.play('portal'); U.hint(null);
            };
            list.appendChild(b);
        });
        A.play('open');
    };
    U.closeMap = function () { if (!U.mapOpen) return; U.mapOpen = false; $('bigmap').classList.add('hidden'); A.play('close'); U.afterClose(); };

    /* ---------- Compendium (CV Passport + Achievements Tab) ---------- */
    const CPI = [
        { ic: '👤', t: 'About Me', s: 'Introduction & key numbers', key: 'about:about', open: ['about', 'about'] },
        { ic: '🎯', t: 'Career Goals', s: 'Short-term & long-term vision', key: 'goals:goals', open: ['goals', 'goals'] },
        { ic: '🧪', t: 'Technical Skills', s: CV.skills.length + ' skill groups', key: 'skill:', multi: 'skill', open: ['skill', 0] },
        { ic: '💼', t: 'Work Experience', s: CV.experience.length + ' positions', key: 'exp:', multi: 'exp', open: ['exp', 0] },
        { ic: '🏗️', t: 'Key Projects', s: CV.projects.length + ' real-world projects', key: 'project:', multi: 'project', open: ['project', 0] },
        { ic: '🎓', t: 'Education', s: 'VKU — B.Eng. IT', key: 'edu:edu', open: ['edu', 'edu'] },
        { ic: '📜', t: 'Certifications & Languages', s: 'English, continuous learning', key: 'certs:certs', open: ['certs', 'certs'] },
        { ic: '🤝', t: 'Soft Skills', s: 'Leadership, ownership & collaboration', key: 'soft:soft', open: ['soft', 'soft'] },
        { ic: '📮', t: 'Contact', s: 'Email, Phone, GitHub, LinkedIn', key: 'contact:contact', open: ['contact', 'contact'] }
    ];

    function renderCompendiumBody() {
        const l = $('cpList'); l.innerHTML = '';
        const tabs = document.querySelectorAll('#cpTabs .tab-btn');
        tabs.forEach(tb => tb.classList.toggle('active', tb.dataset.tab === U.cpTab));

        if (U.cpTab === 'achv') {
            ACHV.forEach(a => {
                const ok = U.achv.has(a.id);
                const div = document.createElement('div');
                div.className = 'cp-item' + (ok ? '' : ' lock');
                div.innerHTML = '<span class="ci">' + (ok ? a.ic : '🔒') + '</span><span><b>' + esc(a.t) + '</b><small>' + esc(a.d) + '</small></span><span class="st">' + (ok ? '✔ UNLOCKED' : '') + '</span>';
                l.appendChild(div);
            });
            return;
        }
        CPI.forEach(it => {
            const done = it.multi ? [...U.seen].some(k => k.startsWith(it.key)) : U.seen.has(it.key);
            const cnt = it.multi ? [...U.seen].filter(k => k.startsWith(it.key)).length : (done ? 1 : 0);
            const b = document.createElement('button'); b.className = 'cp-item' + (done ? '' : ' lock');
            b.innerHTML = '<span class="ci">' + (done ? it.ic : '🔒') + '</span><span><b>' + it.t + '</b><small>' + (done ? it.s : 'Not discovered yet — explore CV World to unlock') + '</small></span><span class="st">' + (it.multi ? cnt + ' viewed' : (done ? '✔' : '')) + '</span>';
            b.onclick = () => { if (!done) return; U.closeCompendium(true); U.openSection(it.open[0], it.open[1]); };
            l.appendChild(b);
        });
    }

    U.openCompendium = function (tab) {
        if (tab) U.cpTab = tab;
        U.cpOpen = true; $('compendium').classList.remove('hidden');
        if (document.exitPointerLock) document.exitPointerLock();
        const badge = $('cpAchvCount');
        if (badge) badge.textContent = U.achv.size + '/' + ACHV.length;
        renderCompendiumBody();
        A.play('open');
    };
    U.setCompendiumTab = function (tab) { U.cpTab = tab; renderCompendiumBody(); A.play('click'); };
    U.closeCompendium = function (silent) { if (!U.cpOpen) return; U.cpOpen = false; $('compendium').classList.add('hidden'); if (!silent) { A.play('close'); U.afterClose(); } };

    /* ---------- Help & World Settings Modal ---------- */
    U.syncSettingsUI = function () {
        const sp = $('setPeaceful'), sw = $('setWeather'), sf = $('setFastTime'), sfg = $('setFog'), ss = $('setSens'), sc = $('setCam');
        if (sp && window.CVM) sp.textContent = window.CVM.peaceful ? 'ON (No Monsters)' : 'OFF (Monsters Active)';
        if (sw) sw.textContent = X.weather === 'rain' ? 'Rain / Snow' : 'Clear Sky';
        if (sf) sf.textContent = E.fastTime ? 'Fast (14x)' : 'Normal (1x)';
        if (sfg) { sfg.value = Math.round(E.fogDist || 145); const v = $('setFogVal'); if (v) v.textContent = sfg.value + 'm'; }
        if (ss) { ss.value = Math.round((P.sens || 0.0022) * 10000); const v = $('setSensVal'); if (v) v.textContent = (P.sens * 1000).toFixed(1); }
        if (sc) sc.textContent = ['1st Person', '3rd Back', '3rd Front'][E.camMode || 0];
    };
    U.openHelp = function () {
        U.helpOpen = true; $('help').classList.remove('hidden');
        if (document.exitPointerLock) document.exitPointerLock();
        U.syncSettingsUI();
        A.play('open');
    };
    U.closeHelp = function (silent) { if (!U.helpOpen) return; U.helpOpen = false; $('help').classList.add('hidden'); if (!silent) { A.play('close'); U.afterClose(); } };

    /* ---------- Categorized Block & Tool Inventory ---------- */
    const slotCanvas = it => window.CVI.iconCanvas(it);
    function renderInvBar() {
        const bar = $('invBar'); bar.innerHTML = '';
        P.hotbar.forEach((id, i) => {
            const s = document.createElement('div'); s.className = 'slot' + (i === P.sel ? ' sel' : '');
            s.innerHTML = '<span>' + (i + 1) + '</span>'; s.appendChild(slotCanvas(id));
            s.onclick = () => { P.sel = i; U.buildHotbar(); renderInvBar(); A.play('click'); };
            bar.appendChild(s);
        });
    }
    function renderInvGrid() {
        const g = $('invGrid'); g.innerHTML = '';
        document.querySelectorAll('#invTabs .tab-btn').forEach(tb => tb.classList.toggle('active', tb.dataset.cat === U.invCat));
        window.CVI.catalog(U.invCat).forEach(id => {
            const nm = window.CVI.name(id), b = document.createElement('button');
            b.className = 'inv-item' + (window.CVI.isTool(id) ? ' tool' : '');
            b.title = nm; b.appendChild(slotCanvas(id));
            b.onmouseenter = () => { $('invName').textContent = nm; };
            b.onclick = () => { P.hotbar[P.sel] = id; U.buildHotbar(); renderInvBar(); A.play('click'); };
            g.appendChild(b);
        });
    }
    U.openInventory = function () {
        U.invOpen = true; $('inv').classList.remove('hidden');
        if (document.exitPointerLock) document.exitPointerLock();
        $('invName').textContent = 'Select a block or tool to assign to hotbar slot ' + (P.sel + 1);
        renderInvGrid(); renderInvBar(); A.play('open');
    };
    U.setInvCat = function (cat) { U.invCat = cat; renderInvGrid(); A.play('click'); };
    U.closeInventory = function (silent) { if (!U.invOpen) return; U.invOpen = false; $('inv').classList.add('hidden'); if (!silent) { A.play('close'); U.afterClose(); } };

    /* ---------- Hotbar ---------- */
    let nameT = null;
    U.showItemName = function (n) {
        const el = $('itemName'); if (!el) return;
        el.textContent = n; el.classList.add('show');
        clearTimeout(nameT); nameT = setTimeout(() => el.classList.remove('show'), 1500);
    };
    U.buildHotbar = function () {
        const hb = $('hotbar'); hb.innerHTML = '';
        for (let i = 0; i < 9; i++) {
            const s = document.createElement('div'); s.className = 'slot' + (i === P.sel ? ' sel' : '');
            s.innerHTML = '<span>' + (i + 1) + '</span>';
            const it = P.hotbar[i], nm = window.CVI.name(it), has = it !== null && it !== undefined;
            s.appendChild(slotCanvas(it)); s.title = has ? nm : '';
            if (i === P.sel && has && U.itemNameReady) U.showItemName(nm);
            s.onclick = () => { P.sel = i; U.buildHotbar(); };
            hb.appendChild(s);
        }
    };
})();
