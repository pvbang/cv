/* CV World — dữ liệu CV của Phan Van Bang (nguồn: index.html) */
(function () {
    'use strict';

    const CV = {
        name: 'PHAN VAN BANG',
        title: 'AI Engineer',
        tagline: 'Multi-Agent Systems • RAG Pipelines • Voice AI • IoT',
        status: 'Open to full-time roles & freelance projects',
        contact: {
            email: 'phanvanbang.id@gmail.com',
            phone: '+84 329 958 001',
            github: 'https://github.com/pvbang',
            linkedin: 'https://linkedin.com/in/pvbang',
            cvPdf: '../files/PhanVanBang_AIEngineer_CV.pdf'
        },
        about: [
            'AI Engineer with 3+ years of professional experience and 50+ projects spanning Multi-Agent Systems, RAG pipelines, Voice AI, IoT, Computer Vision, Game Development, Trading Automation and AI Video Production.',
            'Author of the open-source Nexus multi-agent platform: ~236K lines of first-party code, 197 MCP tool registrations, structured agent debate, hybrid RAG + GraphRAG and continual learning, plus a LangGraph repair assistant with 3,300+ test functions.'
        ],
        stats: [
            { value: '3+', label: 'Years Experience' },
            { value: '236K', label: 'Lines in Nexus (OSS)' },
            { value: '9', label: 'Chat Channels' },
            { value: '50+', label: 'AI Projects' }
        ],
        goals: {
            short: 'Contribute as an AI Engineer at a product-driven company, applying Multi-Agent Systems and RAG expertise to build scalable AI solutions.',
            long: 'Grow into a Senior AI Engineer / Tech Lead role, driving AI architecture decisions, mentoring teammates, and publishing open-source AI tooling.'
        },
        skills: [
            { cat: 'Languages', items: ['Python', 'TypeScript/JavaScript', 'C#', 'Java', 'Go', 'Rust', 'C++', 'C'] },
            { cat: 'AI & LLM', items: ['LLM', 'Context Engineering', 'Fine-tuning (LoRA, QLoRA)', 'RAG & GraphRAG', 'Multi-Agent Orchestration', 'Structured Agent Debate', 'Agentic Reasoning Loop', 'Self-Reflection & Critic Agent', 'Autonomous Goal Engine', 'Smart Model Routing', 'Dreaming Engine', 'Tree Search Planning', 'Continual Learning (XSkill)', 'MCP Protocol (197 tools)'] },
            { cat: 'Voice AI', items: ['OpenAI Whisper STT', 'TTS (OpenAI/Fish/ElevenLabs)', 'VAD', 'Full-Duplex Voice Chat'] },
            { cat: 'Computer Vision', items: ['Face Similarity API', 'PaddleOCR-VL', 'SAM3', 'Stable Diffusion', 'ComfyUI', 'Face Fusion'] },
            { cat: 'NLP', items: ['spaCy (VI + EN)', 'BGE Embeddings', 'Tesseract Vietnamese OCR', 'Text Chunking Strategies'] },
            { cat: 'Frameworks', items: ['LangChain', 'LlamaIndex', 'FastAPI', 'CrewAI', 'AutoGen', 'Unsloth', 'TorchRL', 'Streamlit', 'React', 'Next.js', 'Spring Boot', 'Laravel'] },
            { cat: 'Databases', items: ['PostgreSQL + pgvector', 'Qdrant', 'Faiss', 'Chroma', 'MySQL', 'MongoDB', 'Firebase', 'Neo4j'] },
            { cat: 'Architecture', items: ['Microservices', 'RESTful API', 'WebSocket', 'SSE Streaming', 'Docker Compose', 'Celery + Redis', 'MCP (OAuth 2.1 PKCE)', 'MQTT (IoT)'] },
            { cat: 'DevOps & Cloud', items: ['AWS (S3, EC2)', 'Docker Hub', 'Cloudflare', 'GitHub Actions', 'Vercel', 'VPS & Nginx', 'RunPod GPU', "Let's Encrypt SSL"] },
            { cat: 'Game & Mobile', items: ['Unity 3D / 2D', 'C#', 'C++ / OpenGL', 'React Native', 'Android (Java)', 'Flutter', 'Firebase'] },
            { cat: 'Trading & Automation', items: ['MQL5 Expert Advisors', 'Risk Management Design', 'Binance API', 'TA Signals', 'N8N', 'Chrome Extensions'] },
            { cat: 'Content & Video', items: ['AI Video Production', 'Scriptwriting', 'Copywriting & Brand Voice', 'FFmpeg', 'CapCut', 'TTS / Voiceover'] },
            { cat: 'AI Dev Tools', items: ['Cursor', 'Claude Code', 'Codex', 'Roo Code', 'Git', 'Playwright', 'Pytest'] }
        ],
        experience: [
            {
                role: 'Freelance AI & Software Engineer',
                org: 'Self-employed',
                period: '08/2026 - Present',
                bullets: [
                    'Built an AI vehicle-repair assistant: 6-node LangGraph agent, 16-intent classifier, hybrid dense + BM25 retrieval in Qdrant, cited answers over SSE, 398 test files.',
                    'Built M-Auto, an AI YouTube studio (49K lines Python): 10-stage pipeline, FFmpeg rendering (Ken Burns, karaoke captions), YouTube resumable upload, AI quality critic.',
                    'Developed and sell B. Nexus Quantum, a ~27K-line MQL5 trading EA (11 modules, 21 entry modes) with a Next.js + Prisma + PayOS licensing website.',
                    'Open-sourced the Nexus multi-agent platform and dev tools (mcp-prune, sentinel-scan, rail-probe) plus a Next.js AI SaaS starter kit.'
                ]
            },
            {
                role: 'AI Engineer',
                org: 'MekongAI',
                period: '06/2023 - 07/2026',
                bullets: [
                    'Built and maintained 50+ AI projects across 8+ business domains (Legal, Education, Recruitment, POS, Healthcare, Crypto, Social Media, Content).',
                    'Architected a Multi-Agent Orchestration System with 190+ MCP tools, structured debate, XSkill continual learning — 9 chat channels.',
                    'Developed Nexus core agent system: Planning → Think → Discuss → Execute → Report pipeline, self-reflection, goal engine, beam-search tree planning.',
                    'Implemented Dreaming Engine with 3-phase background memory promotion (Light → Deep → REM) for continual knowledge consolidation.',
                    'Production RAG pipeline: hybrid search + reranking, GraphRAG, multi-modal document processing over large internal knowledge bases.',
                    'Full-Duplex Voice AI (Whisper STT + custom TTS + VAD) with sub-second response, deployed on ESP32 IoT devices.',
                    'Face similarity API and CV pipelines (SAM3, PaddleOCR-VL on RunPod GPU serverless).',
                    'AI recruitment platform with CV parsing, Vietnamese NLP (spaCy), vector job-candidate matching.',
                    'Fine-tuned Llama 3.1 (8B/70B) with Unsloth: trajectory compression → SFT pipeline.',
                    'AI learning platform with ComfyUI + LLM content generation — cut authoring time for 3 English centers.',
                    'Microservices (FastAPI, Docker Compose, Celery + Redis, WebSocket, SSE) and full DevOps (AWS, CI/CD, Nginx, VPS).'
                ]
            }
        ],
        projects: [
            { n: '01', cat: 'Multi-Agent System', name: 'MekongAI Nexus', sub: 'Multi-Agent Orchestration System', desc: 'Open-source multi-agent platform: structured debate, 4-layer memory, hybrid RAG with RRF and reranking, OAuth 2.1 MCP, circuit breaker + provider fallback. ~236K lines, 197 tool registrations, 1,373 test functions.', tech: ['Python', 'FastAPI', 'LangChain', 'MCP', 'Redis', 'Docker'] },
            { n: '02', cat: 'AI Content Platform', name: 'MekongAI Knowlympic', sub: 'AI Learning Content Platform', desc: 'Automated educational content generation using ComfyUI workflows and LLM pipelines — large question banks with RAG-powered retrieval and quality validation.', tech: ['Python', 'ComfyUI', 'RAG', 'LLM', 'PostgreSQL'] },
            { n: '03', cat: 'AI Personality', name: 'MekongAI MetaHuman', sub: 'AI Personality Platform', desc: 'AI personality system with customizable personas, voice cloning, multi-modal interactions, and context-persistent memory.', tech: ['Python', 'TTS', 'LLM', 'WebSocket', 'React'] },
            { n: '04', cat: 'IoT + AI', name: 'ESP32 AI Bot', sub: 'IoT Voice Assistant', desc: 'Hardware voice assistant on ESP32 with real-time STT/TTS, LLM over WebSocket, VAD, sub-second end-to-end response.', tech: ['ESP32', 'Whisper', 'WebSocket', 'FastAPI', 'VAD'] },
            { n: '05', cat: 'AI Recruitment', name: 'AI Recruitment Platform', sub: 'NLP Matching', desc: 'CV parsing, Vietnamese NLP matching, vector similarity job-candidate search, spaCy VI + EN dual pipeline.', tech: ['FastAPI', 'Qdrant', 'spaCy', 'OCR', 'AWS S3'] },
            { n: '06', cat: 'Multi-Agent Content', name: 'AI Content Generator', sub: 'Multi-Platform Content', desc: 'Agents auto-generate Facebook, Instagram, TikTok content with RAG-based brand voice learning. Pipeline: Research → Write → Edit → Publish.', tech: ['CrewAI', 'Streamlit', 'Qdrant', 'RAG'] },
            { n: '07', cat: 'Video/Photo Analysis', name: 'MekongAI TikVault', sub: 'AI Video/Photo Analysis', desc: 'Video/photo analysis with Google Gemini: categorization, trend detection, engagement prediction.', tech: ['FastAPI', 'React 19', 'MongoDB', 'Gemini'] },
            { n: '08', cat: 'Crypto Trading', name: 'Real-time Crypto Monitor', sub: 'Trading Signal System', desc: 'Real-time crypto monitoring with MA crossover signals, automated Telegram alerts, multi-exchange aggregation.', tech: ['Streamlit', 'Binance API', 'Telegram Bot', 'TA'] },
            { n: '09', cat: 'Client Project', name: 'AI Vehicle-Repair Assistant', sub: 'LangGraph Diagnostic Agent', desc: '6-node LangGraph pipeline for multi-DTC repair queries: hybrid dense + BM25, LLM reranking, cited SSE streaming, 264 API routes, S3 backups, 3,320 tests.', tech: ['LangGraph', 'FastAPI', 'MongoDB', 'Qdrant', 'S3'] },
            { n: '10', cat: 'AI Video', name: 'M-Auto', sub: 'AI YouTube Video Studio', desc: 'Idea-to-upload pipeline: 11 niches, 12 personas, AI images, TTS, FFmpeg (Ken Burns, xfade, karaoke captions), Shorts cropping, AI quality critic.', tech: ['Python', 'Streamlit', 'FFmpeg', 'Edge-TTS'] },
            { n: '11', cat: 'Trading', name: 'B. Nexus Quantum', sub: 'MetaTrader 5 Expert Advisor', desc: 'Commercial ~27K-line MQL5 EA: 21 entry modes, 18-layer scoring, 5-tier DCA, Smart Trim, adaptive recovery, 14+ risk layers. Sold on MQL5 Market + PayOS site.', tech: ['MQL5', 'Risk Mgmt', 'Next.js', 'PayOS'] },
            { n: '12', cat: 'Open Source', name: 'mcp-prune / sentinel-scan / rail-probe', sub: 'Developer Tools', desc: 'mcp-prune cuts MCP tool-schema tokens 73.8%; sentinel-scan zero-dep JS/TS security scanner; rail-probe classifies API liveness.', tech: ['Node.js', 'CLI', 'npm'] },
            { n: '13', cat: 'Game Dev', name: 'Eternal Odyssey', sub: 'Unity 3D Action RPG', desc: 'Team-of-two Unity RPG (174 C# files): custom Firebase Realtime online play, NavMesh AI with 7-skill combos, drag-drop inventory, quests, in-game AI lore assistant. Plus 2D platformer and C++/OpenGL racing game.', tech: ['Unity', 'C#', 'C++', 'OpenGL'] },
            { n: '14', cat: 'Mobile', name: 'Android Chat & React Native Apps', sub: 'Messaging, Learning & Voice', desc: 'Android chat with media + Jitsi calls (Firebase); Vocab Master learning app with OpenAI; TransVoiceHub speech-to-text/translate/TTS.', tech: ['Java', 'Firebase', 'React Native'] },
            { n: '15', cat: 'Web', name: 'Laravel, Java & Blockchain Web Apps', sub: 'Shop, Restaurant, Meeting, Blockchain', desc: 'Laravel shoe shop & restaurant manager, Java meeting app with screen sharing, Angular + Truffle + IPFS blockchain demo.', tech: ['Laravel', 'PHP', 'Java', 'Angular', 'Truffle'] },
            { n: '16', cat: 'Content & Copywriting', name: 'AI Copywriting & Social Content', sub: 'Brand-Voice Content Systems', desc: 'Multi-agent pipelines researching, writing, editing, publishing in a learned brand voice; TikTok/YouTube analysis with Gemini.', tech: ['CrewAI', 'Gemini', 'RAG', 'Copywriting'] }
        ],
        education: {
            degree: 'B.Eng. in Information Technology',
            school: 'Vietnam-Korea University of ICT (VKU)',
            place: 'Da Nang, Vietnam',
            period: '2020 - 2025',
            coursework: ['Machine Learning', 'Deep Learning', 'Natural Language Processing', 'Software Engineering']
        },
        certs: [
            'Deep Learning & NLP coursework (VKU)',
            'LangChain & LLM Application Development',
            'LLM Fine-tuning (Unsloth, LoRA/QLoRA)',
            'Multi-agent platform published open source (github.com/pvbang/nexus)'
        ],
        languages: [
            { name: 'Vietnamese', level: 'Native' },
            { name: 'English', level: 'Professional Working' }
        ],
        softSkills: [
            'Self-learning', 'Rapid adaptation', 'Technical Communication', 'Clear documentation',
            'Problem Decomposition', 'Analytical thinking', 'Team Collaboration', 'Technical leadership',
            'Ownership Mindset', 'Deadline-driven execution', 'Multi-domain AI Expertise', 'End-to-End Product Dev'
        ]
    };

    /* 12 viên Knowledge Shard — mỗi viên mở khoá một sự thật thú vị trong CV */
    CV.shards = [
        'Tác giả open-source Nexus: ~236K dòng code, 197 MCP tool registrations!',
        'Nexus có 1.373 test functions (Pytest) — quality là ưu tiên số 1.',
        'Dreaming Engine: bộ nhớ "ngủ" 3 pha Light → Deep → REM để tự học liên tục.',
        'Voice AI full-duplex chạy trên chip ESP32, phản hồi dưới 1 giây.',
        'B. Nexus Quantum: EA MQL5 ~27K dòng, 21 entry modes, 14+ lớp rủi ro.',
        'M-Auto: studio YouTube AI 10 giai đoạn, render FFmpeg + karaoke captions.',
        'Đã fine-tune Llama 3.1 8B/70B bằng Unsloth (LoRA/QLoRA).',
        'Hệ thống chat AI trả lời khách trên 9 kênh cùng lúc.',
        'Đã xây 50+ dự án AI across 8+ ngành: Legal, Education, Healthcare, Crypto...',
        'LangGraph repair assistant: 3.320 test functions cho khách hàng.',
        'Từng dev game Unity 3D RPG 174 file C# với online play qua Firebase.',
        'mcp-prune cắt 73.8% token tool-schema — tool tối ưu cho LLM context.'
    ];

    /* 6 landmark chính trên bản đồ */
    CV.landmarks = [
        { id: 'about', name: 'About Tower', sign: 'ABOUT ME', color: 0x00d4ff, x: 0, z: -18, icon: '👤' },
        { id: 'skills', name: 'Skills Garden', sign: 'SKILLS', color: 0x22c55e, x: -26, z: 2, icon: '🧪' },
        { id: 'experience', name: 'Experience Hall', sign: 'EXPERIENCE', color: 0xf59e0b, x: -14, z: 24, icon: '💼' },
        { id: 'projects', name: 'Projects District', sign: 'PROJECTS', color: 0xa855f7, x: 22, z: 16, icon: '🏗️' },
        { id: 'education', name: 'VKU Campus', sign: 'EDUCATION', color: 0x3b82f6, x: 28, z: -12, icon: '🎓' },
        { id: 'contact', name: 'Contact Portal', sign: 'CONTACT', color: 0xec4899, x: 0, z: 34, icon: '📮' }
    ];

    /* Lời thoại NPC */
    CV.npcs = [
        {
            id: 'bang', name: 'Bang', role: 'Chủ CV — AI Engineer', x: 2, z: -6, color: 0x00d4ff,
            lines: [
                'Chào bạn! Tôi là Bang, chủ nhân của thế giới này. Chào mừng đến CV World!',
                'Mỗi công trình ở đây kể một phần câu chuyện nghề nghiệp của tôi: About Tower, Skills Garden, Experience Hall, Projects District...',
                'Hãy thu thập 12 Knowledge Shard lấp lánh quanh map — mỗi viên là một câu chuyện hay về dự án của tôi.',
                'Nhấn C để mở CV Compendium xem đầy đủ hồ sơ, nhấn E khi đứng gần biển hiệu để xem chi tiết. Chúc bạn chơi vui!'
            ]
        },
        {
            id: 'lead', name: 'Tech Lead', role: 'MekongAI', x: -14, z: 18, color: 0xf59e0b,
            lines: [
                'Bang từng là AI Engineer của chúng tôi suốt 06/2023 - 07/2026.',
                'Cậu ấy xây hệ Multi-Agent 190+ MCP tools, Dreaming Engine và pipeline RAG hybrid cho production.',
                '50+ dự án AI, 8+ ngành kinh doanh — từ Legal tới Healthcare. Rất đáng tin!'
            ]
        },
        {
            id: 'trader', name: 'Merchant', role: 'Trading & Game Dev', x: 22, z: 10, color: 0xa855f7,
            lines: [
                'Bạn cần EA trading hay game Unity? Bang đều làm được đấy!',
                'B. Nexus Quantum — EA MQL5 ~27K dòng đang bán trên MQL5 Market, có cả web licensing PayOS.',
                'Eternal Odyssey — game RPG Unity 174 file C# với online play. Ấn tượng chưa?'
            ]
        },
        {
            id: 'prof', name: 'Professor', role: 'VKU Da Nang', x: 28, z: -6, color: 0x3b82f6,
            lines: [
                'Bang tốt nghiệp Kỹ sư Công nghệ Thông tin — Trường Đại học CNTT & TT Việt-Hàn (VKU), Đà Nẵng.',
                'Chuyên môn cậu ấy: Machine Learning, Deep Learning, NLP, Software Engineering.',
                'Và quan trọng nhất: cậu ấy không bao giờ ngừng tự học. Tinh thần đó rất quý!'
            ]
        }
    ];

    window.CV_DATA = CV;
})();
