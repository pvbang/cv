/* CV World — UI: panel nội dung CV, hội thoại, minimap, bản đồ, compendium, thành tựu, tiến độ */
(function () {
    'use strict';
    const W = window.CVW, E = window.CVE, P = window.CVP, X = window.CVX, A = window.CVA, CV = window.CV_DATA;
    const $ = id => document.getElementById(id);
    const U = { panelOpen: false, dialogOpen: false, mapOpen: false, cpOpen: false, visited: new Set(), seen: new Set(), achv: new Set(), curInfo: null };
    window.CVU = U;

    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const tags = (a, cls) => '<div class="tags">' + a.map(t => '<span class="tag ' + (cls || '') + '">' + esc(t) + '</span>').join('') + '</div>';

    /* ---------- nội dung các panel ---------- */
    const SECTIONS = {
        about: { ic: '👤', kicker: 'About Me', title: CV.name + ' — ' + CV.title, area: 'about', html: () =>
            CV.about.map(p => '<p>' + esc(p) + '</p>').join('') +
            '<div class="stat-row">' + CV.stats.map(s => '<div class="stat"><b>' + s.value + '</b><span>' + s.label + '</span></div>').join('') + '</div>' +
            '<h4>Trạng thái</h4><p>🟢 ' + esc(CV.status) + '</p>' },
        goals: { ic: '🎯', kicker: 'Career Goals', title: 'Mục tiêu nghề nghiệp', area: 'about', html: () =>
            '<div class="goal"><small>Short-term</small>' + esc(CV.goals.short) + '</div><div class="goal l"><small>Long-term</small>' + esc(CV.goals.long) + '</div>' +
            '<h4>Điểm mạnh nổi bật</h4>' + tags(['Multi-Agent Systems', 'Hybrid RAG + GraphRAG', 'Voice AI', 'IoT', 'MCP Protocol', 'Production DevOps', 'Open Source'], 'p') },
        skill: { ic: '🧪', kicker: 'Technical Skills', area: 'skills',
            title: d => CV.skills[d].cat, html: d => '<p>Nhóm kỹ năng <b>' + esc(CV.skills[d].cat) + '</b> (' + CV.skills[d].items.length + ' mục):</p>' + tags(CV.skills[d].items) +
                '<h4>Mẹo</h4><p style="color:#8b9ab5">Còn ' + (CV.skills.length - 1) + ' bệ kỹ năng khác trong khu vườn — ghé thăm đủ để mở khoá thành tựu.</p>' },
        exp: { ic: '💼', kicker: 'Work Experience', area: 'experience',
            title: d => CV.experience[d].role + ' @ ' + CV.experience[d].org, html: d => { const e = CV.experience[d]; return '<p>🗓️ <b>' + esc(e.period) + '</b> · ' + esc(e.org) + '</p><ul class="bul">' + e.bullets.map(b => '<li>' + esc(b) + '</li>').join('') + '</ul>'; } },
        project: { ic: '🏗️', kicker: 'Key Project', area: 'projects',
            title: d => CV.projects[d].n + ' · ' + CV.projects[d].name, html: d => { const p = CV.projects[d]; return '<p><span class="tag p">' + esc(p.cat) + '</span> &nbsp;<b>' + esc(p.sub) + '</b></p><p>' + esc(p.desc) + '</p><h4>Tech stack</h4>' + tags(p.tech); } },
        edu: { ic: '🎓', kicker: 'Education', area: 'education', title: () => CV.education.degree, html: () => { const e = CV.education; return '<p><b>' + esc(e.school) + '</b><br>' + esc(e.place) + ' · ' + esc(e.period) + '</p><h4>Relevant coursework</h4>' + tags(e.coursework); } },
        certs: { ic: '📜', kicker: 'Certifications & Languages', area: 'education', title: () => 'Học tập & Ngôn ngữ', html: () =>
            '<h4>Languages</h4>' + CV.languages.map(l => '<div class="lang-row"><b>' + l.name + '</b><span>' + l.level + '</span></div>').join('') + '<h4>Learning & Practice</h4><ul class="bul">' + CV.certs.map(c => '<li>' + esc(c) + '</li>').join('') + '</ul>' },
        soft: { ic: '🤝', kicker: 'Soft Skills', area: 'education', title: () => 'Kỹ năng mềm', html: () => tags(CV.softSkills, 'p') },
        contact: { ic: '📮', kicker: 'Get In Touch', area: 'contact', title: () => 'Liên hệ với Bang', html: () => {
            const c = CV.contact; return '<p>Tôi đang mở đón các cơ hội mới nơi tôi có thể đóng góp chuyên môn AI engineering. Hãy liên hệ nhé!</p>' +
                '<a class="ct-link" href="mailto:' + c.email + '"><i>✉️</i><div><b>' + c.email + '</b><small>Email</small></div></a>' +
                '<a class="ct-link" href="tel:+84329958001"><i>📞</i><div><b>' + c.phone + '</b><small>Điện thoại / Zalo</small></div></a>' +
                '<a class="ct-link" href="' + c.github + '" target="_blank" rel="noopener"><i>🐙</i><div><b>github.com/pvbang</b><small>GitHub</small></div></a>' +
                '<a class="ct-link" href="' + c.linkedin + '" target="_blank" rel="noopener"><i>💼</i><div><b>linkedin.com/in/pvbang</b><small>LinkedIn</small></div></a>'; } },
        cvdl: { ic: '⬇️', kicker: 'Download', area: 'contact', title: () => 'Tải CV của Bang', html: () =>
            '<a class="ct-link" href="' + CV.contact.cvPdf + '" target="_blank" rel="noopener"><i>🤖</i><div><b>AI Engineer CV (PDF)</b><small>Bản chính</small></div></a>' +
            '<a class="ct-link" href="../files/PhanVanBang_GameDeveloper_CV.pdf" target="_blank" rel="noopener"><i>🎮</i><div><b>Game Developer CV</b><small>PDF</small></div></a>' +
            '<a class="ct-link" href="../files/PhanVanBang_TradingDeveloper_CV.pdf" target="_blank" rel="noopener"><i>📈</i><div><b>Trading Systems CV</b><small>PDF</small></div></a>' +
            '<a class="ct-link" href="../files/PhanVanBang_ContentVideo_CV.pdf" target="_blank" rel="noopener"><i>🎬</i><div><b>Content & Video CV</b><small>PDF</small></div></a>' },
        hire: { ic: '🚀', kicker: 'Hire Me', title: () => 'Vì sao nên mời Bang?', area: 'contact', html: () =>
            '<ul class="bul"><li><b>Ship được sản phẩm thật:</b> 50+ dự án AI, 8+ ngành, từ Legal tới Healthcare.</li><li><b>Chiều sâu kỹ thuật:</b> Nexus open-source ~236K dòng, 197 MCP tools, 1.373 test.</li><li><b>Full-stack end-to-end:</b> từ nghiên cứu, RAG, voice, đến DevOps & thanh toán.</li><li><b>Chất lượng:</b> hàng nghìn test function, CI/CD, giám sát & fallback.</li><li><b>Tự chủ & học nhanh:</b> tự xây & bán sản phẩm (EA trading, studio video AI).</li></ul>' +
            '<a class="ct-link" href="mailto:' + CV.contact.email + '?subject=Hiring%20inquiry%20-%20Phan%20Van%20Bang"><i>✉️</i><div><b>Gửi email ngay</b><small>' + CV.contact.email + '</small></div></a>' },
        secret: { ic: '💎', kicker: 'Secret Summit', title: () => 'Bạn đã tìm thấy đỉnh núi bí mật!', area: 'secret', html: () =>
            '<p>Chúc mừng! Rất ít nhà tuyển dụng leo tới đây 🏔️. Đây là điều tôi không ghi trong CV:</p><ul class="bul"><li>Tôi thích <b>biến ý tưởng thành sản phẩm chạy được</b> — kể cả khi nó là một thế giới Minecraft trong trình duyệt.</li><li>Tôi từng làm game Unity, nên rất thích những dự án có yếu tố tương tác &amp; trải nghiệm.</li><li>Cả thế giới này được viết bằng JavaScript thuần + three.js, không dùng asset ngoài.</li></ul><p>Nếu bạn thích cách tôi làm việc, hãy nhắn cho tôi nhé 🚀</p>' }
    };
    U.SECTIONS = SECTIONS;

    /* ---------- toast ---------- */
    U.toast = function (icon, kind, title, desc) {
        const t = document.createElement('div'); t.className = 'toast ' + (kind || '');
        t.innerHTML = '<div class="ti">' + icon + '</div><div><div class="tt">' + esc(title) + '</div><div class="td">' + esc(desc) + '</div></div>';
        $('toasts').appendChild(t); setTimeout(() => t.remove(), 5000);
        while ($('toasts').children.length > 3) $('toasts').firstChild.remove();
    };
    U.hint = function (txt) { const h = $('hint'); if (txt) { h.textContent = txt; h.classList.add('show'); } else h.classList.remove('show'); };

    /* ---------- thành tựu ---------- */
    const ACHV = [
        { id: 'first', ic: '👋', t: 'Bước đầu tiên', d: 'Mở thông tin CV đầu tiên.', test: () => U.seen.size >= 1 },
        { id: 'chat', ic: '🗣️', t: 'Người thích trò chuyện', d: 'Nói chuyện với cả 4 NPC.', test: () => X.npcs.every(n => n.talked) },
        { id: 'skills', ic: '🧪', t: 'Nhà sưu tầm kỹ năng', d: 'Xem 6 nhóm kỹ năng khác nhau.', test: () => [...U.seen].filter(k => k.startsWith('skill:')).length >= 6 },
        { id: 'projects', ic: '🏗️', t: 'Kiến trúc sư', d: 'Xem 8 dự án.', test: () => [...U.seen].filter(k => k.startsWith('project:')).length >= 8 },
        { id: 'allproj', ic: '🏙️', t: 'Thanh tra dự án', d: 'Xem đủ 16 dự án.', test: () => [...U.seen].filter(k => k.startsWith('project:')).length >= 16 },
        { id: 'exp', ic: '💼', t: 'Kinh nghiệm thực chiến', d: 'Xem cả 2 vị trí công việc.', test: () => U.seen.has('exp:0') && U.seen.has('exp:1') },
        { id: 'shards6', ic: '💎', t: 'Thợ mỏ tri thức', d: 'Thu thập 6 Knowledge Shard.', test: () => X.collected.size >= 6 },
        { id: 'shards12', ic: '👑', t: 'Bậc thầy tri thức', d: 'Thu thập đủ 12 Knowledge Shard.', test: () => X.collected.size >= 12 },
        { id: 'tour', ic: '🧭', t: 'Nhà thám hiểm', d: 'Ghé thăm cả 6 khu vực chính.', test: () => U.visited.size >= 6 },
        { id: 'secret', ic: '🏔️', t: 'Người leo núi', d: 'Tìm thấy Secret Summit.', test: () => U.seen.has('secret:secret') },
        { id: 'builder', ic: '🧱', t: 'Thợ xây', d: 'Đặt 20 khối.', test: () => U.placed >= 20 },
        { id: 'night', ic: '🌙', t: 'Cú đêm', d: 'Đang chơi vào ban đêm.', test: () => E.isNight && U.playTime > 20 },
        { id: 'contact', ic: '📮', t: 'Kết nối', d: 'Mở trang Contact / Hire Me.', test: () => U.seen.has('contact:contact') || U.seen.has('hire:hire') }
    ];
    U.placed = 0; U.playTime = 0;
    U.checkAchv = function () {
        ACHV.forEach(a => { if (!U.achv.has(a.id) && a.test()) { U.achv.add(a.id); U.toast(a.ic, 'achv', 'Thành tựu mở khoá', a.t + ' — ' + a.d); A.play('achv'); } });
        U.save();
        if (U.achv.has('shards12') && U.achv.has('tour') && !U.finaleShown) { U.finaleShown = true; setTimeout(U.showFinale, 2500); }
    };

    /* ---------- lưu tiến độ ---------- */
    const KEY = 'cvworld.v1';
    U.save = function () {
        try { localStorage.setItem(KEY, JSON.stringify({ v: [...U.visited], s: [...U.seen], a: [...U.achv], c: [...X.collected], t: [...X.npcs.filter(n => n.talked).map(n => n.data.id)], f: !!U.finaleShown })); } catch (e) { }
    };
    U.load = function () {
        try {
            const j = JSON.parse(localStorage.getItem(KEY) || 'null'); if (!j) return;
            (j.v || []).forEach(v => U.visited.add(v)); (j.s || []).forEach(v => U.seen.add(v)); (j.a || []).forEach(v => U.achv.add(v)); (j.c || []).forEach(v => X.collected.add(v));
            U.finaleShown = !!j.f; U.savedTalk = j.t || [];
        } catch (e) { }
    };
    U.applyLoaded = function () {
        X.shards.forEach(s => { if (X.collected.has(s.id)) { s.got = true; s.mesh.visible = false; } });
        X.npcs.forEach(n => { if ((U.savedTalk || []).includes(n.data.id)) n.talked = true; });
    };
    U.resetProgress = function () { try { localStorage.removeItem(KEY); } catch (e) { } location.reload(); };

    /* ---------- panel ---------- */
    let curKey = null, panelList = [];
    U.openInfo = function (info) {
        const S = SECTIONS[info.type]; if (!S) return;
        U.curInfo = info;
        const d = info.id;
        $('pnIc').textContent = S.ic; $('pnKicker').textContent = S.kicker;
        $('pnTitle').textContent = typeof S.title === 'function' ? S.title(d) : S.title;
        $('pnBody').innerHTML = S.html(d); $('pnBody').scrollTop = 0;
        // điều hướng trước/sau cho nhóm (skill/project/exp)
        const nav = $('pnNav'); nav.innerHTML = '';
        const grp = (info.type === 'skill' || info.type === 'project' || info.type === 'exp') ? W.infoList.filter(i => i.type === info.type) : null;
        if (grp && grp.length > 1) {
            const i = grp.indexOf(info);
            const mk = (txt, to) => { const b = document.createElement('button'); b.className = 'pn-nav-btn'; b.textContent = txt; b.onclick = () => { A.play('click'); U.openInfo(to); }; return b; };
            nav.appendChild(mk('◀ Trước', grp[(i - 1 + grp.length) % grp.length])); nav.appendChild(document.createTextNode(' ' + (i + 1) + '/' + grp.length + ' ')); nav.appendChild(mk('Sau ▶', grp[(i + 1) % grp.length]));
        }
        $('panel').classList.remove('hidden'); U.panelOpen = true; curKey = info.type + ':' + info.id;
        U.seen.add(curKey);
        if (S.area) U.visitArea(S.area);
        A.play('open'); if (document.exitPointerLock) document.exitPointerLock();
        U.checkAchv(); U.refreshHUD();
    };
    U.openSection = function (type, id) { U.openInfo({ type, id: id === undefined ? type : id }); };
    U.closePanel = function () { if (!U.panelOpen) return; $('panel').classList.add('hidden'); U.panelOpen = false; A.play('close'); U.afterClose(); };
    U.afterClose = function () { if (U.onResume) U.onResume(); };

    /* ---------- hội thoại ---------- */
    let dlNpc = null, dlIdx = 0, typeTimer = null, typeFull = '';
    function typeText(txt) {
        clearInterval(typeTimer); typeFull = txt; const el = $('dlText'); el.textContent = ''; let i = 0;
        typeTimer = setInterval(() => { i += 2; el.textContent = txt.slice(0, i); if (i % 6 === 0) A.play('talk'); if (i >= txt.length) { clearInterval(typeTimer); typeTimer = null; } }, 22);
    }
    U.startDialog = function (npc) {
        dlNpc = npc; dlIdx = 0; U.dialogOpen = true; npc.talked = true;
        $('dlName').textContent = npc.data.name + ' — ' + npc.data.role; $('dialog').classList.remove('hidden'); typeText(npc.data.lines[0]);
        A.play('open'); U.checkAchv();
    };
    U.advanceDialog = function () {
        if (!U.dialogOpen) return;
        if (typeTimer) { clearInterval(typeTimer); typeTimer = null; $('dlText').textContent = typeFull; return; }
        dlIdx++;
        if (dlIdx >= dlNpc.data.lines.length) { U.dialogOpen = false; $('dialog').classList.add('hidden'); A.play('close'); U.checkAchv(); if (dlNpc.data.id === 'bang') U.setQuest(); return; }
        typeText(dlNpc.data.lines[dlIdx]);
    };

    /* ---------- tiến độ & nhiệm vụ ---------- */
    const AREAS = ['about', 'skills', 'experience', 'projects', 'education', 'contact'];
    U.visitArea = function (a) { if (AREAS.includes(a) && !U.visited.has(a)) { U.visited.add(a); const L = CV.landmarks.find(l => l.id === a); U.toast(L.icon, '', 'Khu vực mới', 'Bạn đã khám phá ' + L.name + ' (' + U.visited.size + '/6)'); U.checkAchv(); } U.refreshHUD(); };
    U.refreshHUD = function () {
        $('visitTxt').textContent = U.visited.size + '/6'; $('shardTxt').textContent = X.collected.size + '/' + CV.shards.length; U.setQuest();
    };
    U.setQuest = function () {
        let q;
        if (!X.npcs.find(n => n.data.id === 'bang').talked) q = 'Tìm Bang (NPC áo xanh gần quảng trường) và nói chuyện bằng phím E.';
        else if (U.visited.size < 6) { const next = CV.landmarks.find(l => !U.visited.has(l.id)); q = 'Ghé thăm ' + next.name + ' (' + U.visited.size + '/6 khu vực). Nhấn T để dịch chuyển nhanh.'; }
        else if (X.collected.size < CV.shards.length) q = 'Thu thập Knowledge Shard lấp lánh (' + X.collected.size + '/' + CV.shards.length + '). Nhìn lên minimap: chấm xanh ngọc.';
        else q = 'Hoàn tất! Hãy liên hệ Bang tại Contact Portal 🎉';
        $('questTxt').textContent = q;
    };
    U.showFinale = function () {
        $('finTxt').textContent = 'Bạn đã khám phá toàn bộ CV World: ' + U.visited.size + '/6 khu vực, ' + X.collected.size + '/12 Knowledge Shard và ' + U.achv.size + ' thành tựu. Nếu bạn thấy tôi phù hợp, hãy liên hệ nhé!';
        $('finale').classList.remove('hidden'); if (document.exitPointerLock) document.exitPointerLock(); U.finaleOpen = true; A.play('achv');
    };

    /* ---------- vùng hiện tại ---------- */
    U.areaAt = function (x, z) {
        let best = 'Wilderness', bd = 1e9;
        const zones = [['Spawn Plaza', 0, 0, 13], ['About Tower', 0, -18, 12], ['Skills Garden', -26, 2, 16], ['Experience Hall', -14, 25, 14], ['Projects District', 22, 14, 24], ['VKU Campus', 28, -12, 12], ['Contact Portal', 0, 34, 11], ['Secret Summit', -38, -36, 9]];
        zones.forEach(q => { const d = Math.hypot(x - q[1], z - q[2]); if (d < q[3] && d < bd) { bd = d; best = q[0]; } });
        return best;
    };

    /* ---------- minimap ---------- */
    let mmBase = null;
    function buildMapBase() {
        const S = 96, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), im = g.createImageData(S, S);
        const col = {}; col[W.B.GRASS] = [92, 160, 62]; col[W.B.SAND] = [214, 200, 150]; col[W.B.WATER] = [48, 100, 210]; col[W.B.STONE] = [125, 125, 125]; col[W.B.SNOW] = [240, 245, 250]; col[W.B.DIRT] = [130, 90, 50]; col[W.B.LEAVES] = [50, 120, 40]; col[W.B.GRAVEL] = [160, 156, 150]; col[W.B.STONEBRICK] = [140, 140, 145]; col[W.B.QUARTZ] = [235, 232, 225];
        for (let x = 0; x < S; x++) for (let z = 0; z < S; z++) {
            const wx = x - W.OX, wz = z - W.OZ; let y = W.SY - 1, id = 0;
            for (; y >= 0; y--) { id = W.get(wx, y, wz); if (id) break; }
            let cc = col[id]; if (!cc) { const d = W.DEF[id]; cc = (d && d.light) ? [255, 220, 120] : [170, 120, 90]; if (id >= W.B.C_CYAN && id <= W.B.C_PINK) cc = [150, 100, 210]; }
            const sh = 0.75 + Math.min(0.35, y / 80);
            const i = (z * S + x) * 4; im.data[i] = cc[0] * sh; im.data[i + 1] = cc[1] * sh; im.data[i + 2] = cc[2] * sh; im.data[i + 3] = 255;
        }
        g.putImageData(im, 0, 0); return c;
    }
    U.buildMap = function () { mmBase = buildMapBase(); };
    function drawMap(ctx, size, centered, pos, yaw, big) {
        ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, size, size);
        const S = 96;
        if (centered) { // minimap xoay theo hướng nhìn, bán kính 28 ô
            const R = 28, sc = size / (R * 2);
            ctx.save(); ctx.translate(size / 2, size / 2); ctx.rotate(yaw); ctx.scale(sc, sc); ctx.translate(-(pos.x + W.OX), -(pos.z + W.OZ));
            ctx.drawImage(mmBase, 0, 0); drawMarkers(ctx, 1 / sc * 5); ctx.restore();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(size / 2, size / 2 - 7); ctx.lineTo(size / 2 + 5, size / 2 + 6); ctx.lineTo(size / 2 - 5, size / 2 + 6); ctx.closePath(); ctx.fill();
        } else {
            const sc = size / S; ctx.save(); ctx.scale(sc, sc); ctx.drawImage(mmBase, 0, 0); drawMarkers(ctx, 2.2, true); ctx.restore();
            ctx.save(); ctx.translate((pos.x + W.OX) * sc, (pos.z + W.OZ) * sc); ctx.rotate(-yaw + Math.PI); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(7, 8); ctx.lineTo(-7, 8); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
        }
    }
    function drawMarkers(ctx, r, labels) {
        CV.landmarks.forEach(l => { ctx.fillStyle = '#' + l.color.toString(16).padStart(6, '0'); ctx.strokeStyle = '#000'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.arc(l.x + W.OX, l.z + W.OZ, r * 0.6, 0, 7); ctx.fill(); ctx.stroke(); if (labels) { ctx.fillStyle = '#fff'; ctx.font = '3px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(l.sign, l.x + W.OX, l.z + W.OZ - 3.2); } });
        X.shards.forEach(s => { if (!s.got) { ctx.fillStyle = '#4ff2e4'; ctx.fillRect(s.mesh.position.x + W.OX - r * 0.3, s.mesh.position.z + W.OZ - r * 0.3, r * 0.6, r * 0.6); } });
        X.npcs.forEach(n => { ctx.fillStyle = '#ffe14d'; ctx.fillRect(n.mesh.position.x + W.OX - r * 0.25, n.mesh.position.z + W.OZ - r * 0.25, r * 0.5, r * 0.5); });
    }
    U.drawMinimap = function (pos, yaw) { if (mmBase) drawMap($('mm').getContext('2d'), 160, true, pos, yaw); };

    /* ---------- bản đồ lớn + dịch chuyển ---------- */
    U.openMap = function () {
        if (U.mapOpen) return; U.mapOpen = true; $('bigmap').classList.remove('hidden'); if (document.exitPointerLock) document.exitPointerLock();
        drawMap($('bmc').getContext('2d'), 520, false, P.pos, P.yaw, true);
        const list = $('bmList'); list.innerHTML = '';
        const spots = [{ id: 'spawn', n: 'Spawn Plaza', ic: '🏠', area: null }].concat(CV.landmarks.map(l => ({ id: l.id, n: l.name, ic: l.icon, area: l.id })), [{ id: 'secret', n: 'Secret Summit', ic: '🏔️', area: 'secret' }]);
        spots.forEach(s => {
            const b = document.createElement('button'); b.className = 'tp-btn';
            b.innerHTML = '<span>' + s.ic + '</span><span>' + esc(s.n) + '</span>' + (s.area && U.visited.has(s.area) ? '<span class="ok">✔</span>' : '');
            b.onclick = () => { const L = W.landmarks[s.id]; U.closeMap(); P.teleport(L.x, L.y, L.z, s.id === 'contact' ? Math.PI : (s.id === 'about' ? 0 : undefined)); if (s.id === 'about') P.yaw = 0; A.play('portal'); U.hint(null); };
            list.appendChild(b);
        });
        A.play('open');
    };
    U.closeMap = function () { if (!U.mapOpen) return; U.mapOpen = false; $('bigmap').classList.add('hidden'); A.play('close'); U.afterClose(); };

    /* ---------- compendium ---------- */
    const CPI = [
        { ic: '👤', t: 'About Me', s: 'Giới thiệu & số liệu', key: 'about:about', open: ['about', 'about'] },
        { ic: '🎯', t: 'Career Goals', s: 'Mục tiêu ngắn hạn & dài hạn', key: 'goals:goals', open: ['goals', 'goals'] },
        { ic: '🧪', t: 'Technical Skills', s: '13 nhóm kỹ năng', key: 'skill:', multi: 'skill', open: ['skill', 0] },
        { ic: '💼', t: 'Work Experience', s: '2 vị trí', key: 'exp:', multi: 'exp', open: ['exp', 0] },
        { ic: '🏗️', t: 'Key Projects', s: '16 dự án', key: 'project:', multi: 'project', open: ['project', 0] },
        { ic: '🎓', t: 'Education', s: 'VKU — B.Eng. IT', key: 'edu:edu', open: ['edu', 'edu'] },
        { ic: '📜', t: 'Certifications & Languages', s: '', key: 'certs:certs', open: ['certs', 'certs'] },
        { ic: '🤝', t: 'Soft Skills', s: '', key: 'soft:soft', open: ['soft', 'soft'] },
        { ic: '📮', t: 'Contact', s: 'Email, GitHub, LinkedIn', key: 'contact:contact', open: ['contact', 'contact'] }
    ];
    U.openCompendium = function () {
        U.cpOpen = true; $('compendium').classList.remove('hidden'); if (document.exitPointerLock) document.exitPointerLock();
        const l = $('cpList'); l.innerHTML = '';
        CPI.forEach(it => {
            const done = it.multi ? [...U.seen].some(k => k.startsWith(it.key)) : U.seen.has(it.key);
            const cnt = it.multi ? [...U.seen].filter(k => k.startsWith(it.key)).length : (done ? 1 : 0);
            const b = document.createElement('button'); b.className = 'cp-item' + (done ? '' : ' lock');
            b.innerHTML = '<span class="ci">' + (done ? it.ic : '🔒') + '</span><span><b>' + it.t + '</b><small>' + (done ? it.s : 'Chưa khám phá — tìm trong thế giới') + '</small></span><span class="st">' + (it.multi ? cnt + ' đã xem' : (done ? '✔' : '')) + '</span>';
            b.onclick = () => { if (!done) return; U.closeCompendium(true); U.openSection(it.open[0], it.open[1]); };
            l.appendChild(b);
        });
        A.play('open');
    };
    U.closeCompendium = function (silent) { if (!U.cpOpen) return; U.cpOpen = false; $('compendium').classList.add('hidden'); if (!silent) { A.play('close'); U.afterClose(); } };

    /* ---------- hotbar ---------- */
    U.buildHotbar = function () {
        const hb = $('hotbar'); hb.innerHTML = '';
        for (let i = 0; i < 9; i++) {
            const s = document.createElement('div'); s.className = 'slot' + (i === P.sel ? ' sel' : ''); s.innerHTML = '<span>' + (i + 1) + '</span>';
            const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
            const d = W.DEF[P.hotbar[i]]; if (d) { const t = d.side; g.drawImage(E.atlas, (t % W.COLS) * W.TILE, Math.floor(t / W.COLS) * W.TILE, W.TILE, W.TILE, 0, 0, 16, 16); }
            s.appendChild(c); s.title = d ? d.name : ''; s.onclick = () => { P.sel = i; U.buildHotbar(); }; hb.appendChild(s);
        }
    };
})();
