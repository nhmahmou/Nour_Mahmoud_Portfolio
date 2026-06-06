'use strict';

const queryOne = (selector, root = document) => root.querySelector(selector);
const queryAll = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const metric = (label, value) => `<span class="metric"><i>${label}</i> ${value}</span>`;
const PLACEHOLDER = 'data:image/svg+xml;utf8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675"><rect width="100%" height="100%" fill="#0a1016"/><text x="50%" y="50%" fill="#263543" font-family="Segoe UI,Arial" font-size="44" text-anchor="middle" dominant-baseline="middle">image</text></svg>`);

function safeImg(el) {
  el.onerror = () => { el.src = PLACEHOLDER; el.onerror = null; };
}
function validSrc(m) {
  if (!m) return false;
  if (m.type === 'yt') return !!(m.id || m.url); // YouTube items have url, not src
  return typeof m.src === 'string' && m.src.trim().length > 0;
}
function sanitizeProject(p) { if (Array.isArray(p.media)) p.media = p.media.filter(validSrc); return p; }
function safeRun(name, fn) { try { fn(); } catch (e) { console.error(`[render error] ${name}:`, e); } }

function extractYoutubeId(url) {
  if (!url) return null;
  const s = String(url);
  const m = s.match(/v=([A-Za-z0-9_-]{6,})/) || s.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/) || s.match(/embed\/([A-Za-z0-9_-]{6,})/);
  const id = m ? m[1] : null;
  return id ? id.replace(/[^A-Za-z0-9_-].*$/, '') : null;
}
function setBestYoutubeThumbnail(el, videoId) {
  const bases = [`https://i.ytimg.com/vi/${videoId}`, `https://img.youtube.com/vi/${videoId}`];
  const names = ['maxresdefault.jpg', 'sddefault.jpg', 'hqdefault.jpg', 'mqdefault.jpg', 'default.jpg'];
  const queue = [];
  bases.forEach(b => names.forEach(n => queue.push(`${b}/${n}`)));
  const tryNext = () => { if (queue.length) el.src = queue.shift(); };
  el.onload = () => { if (el.naturalWidth <= 200 || el.naturalHeight <= 120) tryNext(); };
  el.onerror = tryNext;
  tryNext();
}
function firstMediaImageSrc(p) { const i = (p.media||[]).find(x => x.type==='img'&&x.src); return i?i.src:null; }
function firstMediaVideoSrc(p) { const i = (p.media||[]).find(x => x.type==='clip'&&x.src); return i?i.src:null; }
function firstMediaYtId(p) { const i = (p.media||[]).find(x => x.type==='yt'&&(x.id||x.url)); return i?(i.id||extractYoutubeId(i.url)):null; }

function setCoverWithFallback(el, project) {
  const ytId    = firstMediaYtId(project);
  const ytThumb = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null;
  const primary  = project.cover || firstMediaImageSrc(project) || ytThumb || '';
  const fallback = firstMediaImageSrc(project) || firstMediaVideoSrc(project) || ytThumb || '';
  const isVideo  = s => s && (s.endsWith('.mp4')||s.endsWith('.webm')||s.endsWith('.mov'));

  function swapToVideo(parent, src, className) {
    const v = document.createElement('video');
    v.className = className; v.setAttribute('muted',''); v.setAttribute('playsinline',''); v.setAttribute('preload','metadata');
    v.src = encodeURI(src); v.style.pointerEvents = 'none';
    v.addEventListener('loadedmetadata', () => { v.currentTime=0.1; v.pause(); }, {once:true});
    v.addEventListener('seeked', () => { v.pause(); }, {once:true});
    parent.replaceChild(v, parent.querySelector('img, video') || v);
  }

  if (isVideo(primary) && el.tagName==='IMG') { swapToVideo(el.parentElement, primary, el.className); return; }
  el.alt = `${project.title} cover`;
  el.src = encodeURI(primary);
  if (project.cover2x) {
    el.srcset = `${encodeURI(primary)} 1x, ${encodeURI(project.cover2x)} 2x`;
    el.sizes  = '(max-width:720px) 92vw, 420px';
  } else { el.removeAttribute('srcset'); el.removeAttribute('sizes'); }
  el.onerror = () => {
    if (fallback && el.src !== encodeURI(fallback)) {
      if (isVideo(fallback) && el.tagName==='IMG') { swapToVideo(el.parentElement, fallback, el.className); }
      else { el.src = encodeURI(fallback); }
    } else if (ytThumb && el.src !== ytThumb) {
      el.src = ytThumb;
    } else { el.src = PLACEHOLDER; }
    el.onerror = null;
  };
}


// ── Skills ────────────────────────────────────────────────────────────────────
const SKILL_LOGOS = {
  'Languages and Markup': [
    { title:'C++',        src:'assets/logos/Cplusplus.png' },
    { title:'C#',         src:'assets/logos/csharp.png' },
    { title:'Java',       src:'assets/logos/java.png' },
    { title:'C',          src:'assets/logos/c.png' },
    { title:'Python',     src:'assets/logos/python.png' },
    { title:'JavaScript', src:'assets/logos/javascript.png' },
    { title:'HTML',       src:'assets/logos/html.png' },
    { title:'CSS',        src:'assets/logos/css.png' },
    { title:'SQL',        src:'assets/logos/sql.png' },
  ],
  'Frameworks and Engines': [
    { title:'Unity',     src:'assets/logos/unity.png' },
    { title:'Unreal',    src:'assets/logos/unreal.png' },
    { title:'Godot',     src:'assets/logos/godot.png' },
    { title:'SDL2',      src:'assets/logos/sdl2.png' },
    { title:'Spring',    src:'assets/logos/spring.png' },
    { title:'Hibernate', src:'assets/logos/hibernate.png' },
    { title:'REST',      src:'assets/logos/rest.png' },
    { title:'React',     src:'assets/logos/react.png' },
    { title:'Bootstrap', src:'assets/logos/bootstrap.png' },
    { title:'WebGL',     src:'assets/logos/webgl.png' },
  ],
  'Systems, DevOps and Tools': [
    { title:'Linux',          src:'assets/logos/linux.png' },
    { title:'Git',            src:'assets/logos/git.png' },
    { title:'GitHub Actions', src:'assets/logos/githubactions.png' },
    { title:'Jenkins',        src:'assets/logos/jenkins.png' },
    { title:'ZeroMQ',         src:'assets/logos/zeromq.png' },
    { title:'Maven',          src:'assets/logos/maven.png' },
    { title:'npm',            src:'assets/logos/npm.png' },
    { title:'Tomcat',         src:'assets/logos/tomcat.png' },
  ],
  'Design, Research and Viz': [
    { title:'Figma',      src:'assets/logos/figma.png' },
    { title:'Jupyter',    src:'assets/logos/jupyter.png' },
    { title:'Matplotlib', src:'assets/logos/matplotlib.png' },
    { title:'Overleaf',   src:'assets/logos/overleaf.png' },
  ],
};

function renderSkillsLogos() {
  const container = queryOne('#skillsLogoWrap');
  if (!container) return;
  container.innerHTML = '';
  Object.entries(SKILL_LOGOS).forEach(([groupName, items]) => {
    const sec = document.createElement('section');
    sec.className = 'skills-logo-group'; sec.dataset.animate = 'reveal';
    sec.innerHTML = `<h3>${groupName}</h3><ul class="logo-grid" role="list"></ul>`;
    const ul = sec.querySelector('.logo-grid');
    items.forEach(({title, src}) => {
      const li = document.createElement('li'); li.className = 'logo-card';
      li.innerHTML = `<div class="logo-img-wrap"><img alt="${title}" loading="lazy" /></div><div class="logo-title">${title}</div>`;
      const img = queryOne('img', li);
      img.onerror = () => {
        li.classList.add('logo-missing');
        li.querySelector('.logo-img-wrap').innerHTML = `<span class="logo-fallback">${title[0]}</span>`;
      };
      img.src = encodeURI(src);
      ul.appendChild(li);
    });
    container.appendChild(sec);
  });
}


// ── Projects ──────────────────────────────────────────────────────────────────
const PROJECTS = [
  // ── 1. WolfCafe ─────────────────────────────────────────────────────────────
  {
    slug: 'wolfcafe',
    title: 'WolfCafe: Full-Stack Cafe Management and E-Commerce Platform',
    featured: true,
    cover: 'assets/Full Stack/Manager - Manage Recipes-1.png',
    role: 'Frontend Lead, Backend Coordinator',
    tech: 'React | Spring Boot | MySQL | REST APIs | JWT | Vitest',
    tags: ['Software Dev', 'Team Project'],
    blurb: 'Frontend lead and backend coordinator on a 6-person agile team delivering a production-ready cafe management and e-commerce platform.',
    metrics: [
      metric('Backend', 'Spring Boot + Hibernate'),
      metric('Frontend', 'React + Vitest'),
      metric('Database', 'MySQL'),
      metric('Team', '6-person agile')
    ],
    links: [],
    case: {
      problem: 'Build a production-ready full-stack cafe management and e-commerce platform with role-based access control, order processing, inventory management, and an intuitive UI.',
      role: 'Frontend lead and backend coordinator on a 6-person agile team. Led frontend development with React, implemented UI components, role-based navigation, and automated testing. Coordinated backend API design and managed GitHub workflows, PR reviews, and agile sprint planning.',
      tech: [
        'Java, Spring Boot (Web, JPA/Hibernate)',
        'JWT authentication and authorization',
        'React (JSX, Components, Axios)',
        'Vitest and React Testing Library',
        'MySQL, RESTful APIs, JSON',
        'CI/CD (GitHub Actions), Agile (sprints, story points)',
      ],
      decisions: [
        'Architected and built the React frontend with role-specific navigation, recipe variants (S/M/L), guest checkout, order pickup by number, and order history.',
        'Designed a 5-role access control system (Admin, Manager, Barista, Customer, Guest) with JWT authentication and SHA-256 password hashing.',
        'Implemented a layered backend (Controller, Service, Repository) in Spring Boot with Hibernate ORM for maintainability and testability.',
        'Established automated testing with Vitest and React Testing Library, and coordinated GitHub PR reviews, sprint planning, and retrospectives.',
      ],
      results: [
        'Delivered a production-ready platform with 5 user roles, JWT authentication, and comprehensive order management.',
        'Led frontend architecture and coordinated backend API design across a 6-person team.',
        'Built advanced features: recipe variants (S/M/L), order pickup by number, guest checkout, and full order history.',
        'Designed scalable layered architecture for maintainability and testability.',
      ],
      details: [
        'Modern, responsive UI with dark mode and role-specific navigation.',
        'Professional development: agile sprints, PR reviews, system test plans.',
      ]
    },
    media: [
      { type:'img', src:'assets/Full Stack/Manager - Manage Recipes-1.png' },
      { type:'img', src:'assets/Full Stack/Manager - Items.png' },
      { type:'img', src:'assets/Full Stack/Manager - Add items - Success.png' },
      { type:'img', src:'assets/Full Stack/Manager - List Recipes.png' },
      { type:'img', src:'assets/Full Stack/Manager - Order history.png' },
      { type:'img', src:'assets/Full Stack/Manager - Update Inventory - Success.png' },
      { type:'img', src:'assets/Full Stack/Manager - Add Ingredients - Success.png' },
      { type:'img', src:'assets/Full Stack/Manager - Edit items - Success.png' }
    ]
  },

  // ── 2. C++ Game Engine ───────────────────────────────────────────────────────
  {
    slug: 'engine',
    title: 'Custom 2D Game Engine with Multiplayer (C++)',
    featured: true,
    cover: 'assets/Engine/bubbleshooter.png',
    role: 'Lead Developer and Team Coordinator',
    tech: 'C++ | SDL2 | ZeroMQ | Multithreading | Networking',
    tags: ['Software Dev', 'Systems', 'Game Dev'],
    blurb: 'Led a 3-person team building a 2D engine from scratch in C++ over 4 months, no existing engine. Component-entity architecture, decoupled collision pipeline, multithreaded update loop at 60 FPS, and a ZeroMQ networking layer. Shipped two complete games on it.',
    metrics: [
      metric('Stack', 'C++, SDL2, ZeroMQ'),
      metric('Team', '3'),
      metric('Time', '4 months')
    ],
    links: [
      { label: 'Bubble Shooter Gameplay', href: 'https://youtu.be/qsilTsw9pNc' },
      { label: 'Space Invaders Gameplay', href: 'https://youtu.be/lLaX0yUeW2k' }
    ],
    case: {
      problem: 'Build a 2D game engine from scratch in C++, no existing engine, to support fast gameplay iteration and a real multiplayer experiment.',
      role: 'Led a 3-person team. Architected the component-entity system and collision pipeline, implemented the ZeroMQ networking layer and multithreaded update loop, and coordinated technical decisions across the team.',
      tech: [
        'C++',
        'SDL2',
        'ZeroMQ (Router/Dealer)',
        'Multithreading and concurrency',
        'Client-server networking',
      ],
      decisions: [
        'Architected a component-entity system with a decoupled collision pipeline supporting floor, wall, platform, and bounce resolution.',
        'Implemented a ZeroMQ Router/Dealer networking layer for ordered client-input broadcast and explicit disconnect handling across multiplayer sessions.',
        'Built a multithreaded update loop to keep rendering and input responsive under load, holding a stable 60 FPS on mid-range hardware.',
        'Shipped two complete games (Bubble Shooter, Space Invaders) on the engine, validating the architecture end-to-end.',
      ],
      results: [
        'Held a stable 60 FPS on mid-range hardware under complex collision and entity load.',
        'Demonstrated reliable message ordering and disconnect handling over the network.',
        'Delivered a working engine in four months alongside coursework.',
        'Validated architecture by shipping two complete, playable games.',
      ],
      details: [
        'Built in 4 months with rapid ramp-up on ZeroMQ and networking.',
        'Team of 3; led architecture and coordination.',
      ]
    },
    media: [
      { type: 'img', src: 'assets/Engine/bubbleshooter.png' },
      { type: 'img', src: 'assets/Engine/space-invaders.png' }
    ]
  },

  // ── 3. Unity Debugging Plugin ────────────────────────────────────────────────
  {
    slug: 'unity-plugin',
    title: 'Unity Debugging Plugin for Block-Based Programming',
    featured: true,
    cover: 'https://img.youtube.com/vi/7zX9MTJdZtc/hqdefault.jpg',
    role: 'Systems Architect and Developer',
    tech: 'C# | Unity | Modular Architecture | Coroutines',
    tags: ['Software Dev', 'Systems'],
    blurb: 'A modular Unity plugin for an education nonprofit that teaches debugging through block-based coding games. Designed host-agnostic so it integrates with any block-based coding game without coupling to a specific host.',
    metrics: [
      metric('Lang', 'C# / Unity'),
      metric('Client', 'Katabasis (nonprofit)'),
      metric('Pattern', 'Adapter, modular'),
    ],
    links: [],
    case: {
      problem: 'Build a reusable Unity plugin that teaches debugging concepts through block-based coding games, designed to integrate with any host program without coupling to its internals.',
      role: 'Designed and implemented the plugin architecture on a team building for the nonprofit Katabasis. Owned the debugging-interface architecture, adapter pattern, and all three learning modes.',
      tech: [
        'C# (Unity, coroutines, ScriptableObjects)',
        'Host-agnostic adapter pattern',
        'Drag-and-drop categorization UI',
        'Coroutine-driven animation and sequencing',
        'Modular, independently testable components',
      ],
      decisions: [
        'Designed a host-agnostic adapter so the plugin integrates with any block-based coding game, decoupling the interface from any specific host through abstraction.',
        'Analyzed the host system architecture to define clean module boundaries, building reusable, independently testable components.',
        'Implemented three learning modes in C# (code reading, step-through tracing, reflection) with quiz logic, coroutine-driven animation, and drag-and-drop categorization.',
        'Used a data-driven design so new game integrations could be added through configuration rather than new code.',
      ],
      results: [
        'Delivered a fully modular plugin that integrates with any block-based coding game host without changes to the core plugin.',
        'Three distinct learning modes covering reading, tracing, and reflection with animated feedback.',
        'Reusable components independently testable outside of any specific game context.',
        'Built for real classroom use by the nonprofit Katabasis.',
      ],
      details: [
        'Built on a team for the education nonprofit Katabasis.',
        'Architecture prioritized extensibility: new modes and host adapters require no changes to core logic.',
      ]
    },
    media: [
      { type: 'yt',  url: 'https://youtu.be/7zX9MTJdZtc' }
    ],
    links: [
      { label: 'Play on itch.io', href: 'https://nhmahmou.itch.io/itsy' },
      { label: 'Watch gameplay',  href: 'https://youtu.be/7zX9MTJdZtc' },
    ],
  },

  // ── 4. Unreal Paleontologist Simulation ──────────────────────────────────────
  {
    slug: 'unreal-sim',
    title: 'Unreal Paleontologist Simulation',
    featured: true,
    cover: 'https://img.youtube.com/vi/yZsLqBfUFx4/hqdefault.jpg',
    role: 'Lead: Fossil Reconstruction System',
    tech: 'Unreal Engine 5 | C++ | Blueprints | Data-Driven Design',
    tags: ['Software Dev', 'Systems', 'Game Dev'],
    blurb: 'Built for the NC Museum of Natural Sciences. A stylized paleontology game in Unreal Engine 5 where I led the fossil reconstruction system: drag-and-drop bone placement, species tracking, inventory with duplicate detection, and a persistent HUD.',
    metrics: [
      metric('Engine', 'Unreal Engine 5'),
      metric('Client', 'NC Museum of Natural Sciences'),
      metric('Pattern', 'Data-driven, Blueprints'),
    ],
    links: [],
    case: {
      problem: 'Build an educational paleontology simulation for the NC Museum of Natural Sciences where visitors reconstruct dinosaur fossils through drag-and-drop gameplay.',
      role: 'Led development of the fossil reconstruction system on a team project. Owned the reconstruction manager, inventory component, species registry, and HUD wiring.',
      tech: [
        'Unreal Engine 5 (Blueprints, C++)',
        'Drag-and-drop bone placement system',
        'Species progress tracking and data-driven species registry',
        'Unified inventory with duplicate detection and filtering',
        'Persistent HUD wired via event dispatchers for real-time updates',
      ],
      decisions: [
        'Led development of the fossil reconstruction system: drag-and-drop bone placement, species progress tracking, and a unified inventory with duplicate detection and filtering.',
        'Architected reusable Blueprint systems (reconstruction manager, inventory component, data-driven species registry) and a persistent HUD wired via event dispatchers for real-time updates.',
        'Built on a team using a data-driven design so new dinosaur species could be added through configuration rather than new code.',
      ],
      results: [
        'Delivered a complete fossil reconstruction system with drag-and-drop interaction, progress tracking, and inventory management.',
        'Data-driven species registry allows new dinosaurs to be added through configuration with no code changes.',
        'HUD updates in real-time via event dispatchers, decoupling UI from game logic.',
        'Built for actual museum deployment at the NC Museum of Natural Sciences.',
      ],
      details: [
        'Built for a real museum client: NC Museum of Natural Sciences.',
        'Data-driven architecture makes the system extensible to new species without engineering changes.',
      ]
    },
    media: [
      { type: 'yt',  url: 'https://youtu.be/yZsLqBfUFx4' }
    ]
  },

  // ── 5. HCI Research ──────────────────────────────────────────────────────────
  {
    slug: 'hci-research',
    title: 'HCI Research: Social Metacognition in Collaborative Debugging',
    featured: true,
    cover: 'assets/research.png',
    role: 'Research Assistant (NSF REU)',
    tech: 'Python | Jupyter | Matplotlib | Data Analysis',
    tags: ['Research', 'Software Dev', 'HCI/UX', 'AI/Algorithms'],
    blurb: 'NSF REU research on how teams self-monitor while debugging. Built Python pipelines aligning 2,700+ annotated dialogue turns to debugging events. Co-authored a paper accepted to HCII 2026.',
    metrics: [
      metric('Annotated', '2,700 turns'),
      metric('Methods', 'delta-heatmaps, event-locked'),
      metric('Stack', 'Python / Jupyter / Matplotlib'),
      metric('Publication', 'HCII 2026 (accepted)')
    ],
    case: {
      problem: 'How do teams of professional programmers communicate and self-monitor while debugging, and which talk patterns link to success?',
      role: 'Led data wrangling and analysis. Built Python pipelines to align dialogue with debugging events (errors, tests, edits) and visualize shifts around key moments.',
      tech: [
        'Python (pandas, numpy)',
        'Jupyter and Matplotlib',
        'Delta-heatmaps and event-locked plots',
        'Annotation pipeline with inter-rater agreement',
      ],
      decisions: [
        'Aligned dialogue to debugging events (first failure, first pass) for event-locked comparison.',
        'Used pre/post windows and delta-heatmaps to show shifts in participation and strategy talk.',
        'Built reusable plotting for team-level and cohort-level analysis.',
        'Standardized annotations and checked inter-rater agreement for metacognitive labels.',
      ],
      results: [
        'Planning and monitoring talk often preceded successful fixes soon after failures.',
        'Found coordination breakdowns (long monologues, few questions) that matched stalls.',
        'Co-authored a paper accepted to the HCII 2026 conference on social metacognition in successful vs. unsuccessful teams.',
        'Reached strong inter-rater agreement (Jaccard > 0.80) across 2,700+ annotated dialogue turns.',
      ],
      details: [
        '2,700+ turns annotated with strong inter-rater agreement.',
        'Reproducible pipelines. Findings relevant to HCI and team collaboration practice.',
      ]
    },
    media: [
      { type: 'img', src: 'assets/research/graphex.png' }
    ]
  },

  // ── 6. Neon Battlezone ───────────────────────────────────────────────────────
  {
    slug: 'cg-animation',
    title: 'Neon Battlezone: 3D Arcade Game with AI Combat (WebGL)',
    featured: false,
    cover: 'assets/CG/Game.mp4',
    role: 'Solo Developer',
    tech: 'WebGL | GLSL | AI | Game Systems',
    tags: ['Software Dev', 'Computer Graphics', 'AI/Algorithms', 'Game Dev'],
    blurb: 'A complete 3D arcade game built solo from scratch in WebGL. Custom rendering pipeline with neon shaders, AI-controlled enemies that track and fire, wave-based progression, ability upgrades, and a full game loop.',
    metrics: [
      metric('Type', 'Full Game'),
      metric('Engine', 'WebGL'),
      metric('Features', 'AI, Combat, Progression')
    ],
    case: {
      problem: 'Build a complete 3D game from scratch in WebGL, combining a custom rendering pipeline, AI-driven combat, and full game progression.',
      role: 'Solo developer. Built the WebGL rendering pipeline and shaders, AI enemy behavior, wave spawning and progression, the ability-upgrade system, and the full game loop.',
      tech: [
        'WebGL rendering pipeline with custom shaders',
        'AI tracking and targeting',
        'Projectile and combat systems',
        'Wave-based progression',
        'Game-state management',
      ],
      decisions: [
        'Built a custom WebGL rendering pipeline from scratch, including neon shaders for glow effects and real-time lighting.',
        'Designed AI enemy behavior: player tracking, firing logic, and dynamic spawning that scales across progressive waves.',
        'Implemented a wave-based ability-upgrade system and a complete game loop with health, win/lose states, and start-to-finish progression.',
      ],
      results: [
        'Delivered a fully playable 3D game with complete start-to-end progression and win/lose states.',
        'AI systems create engaging combat encounters with tracking and shooting behaviors.',
        'Progressive difficulty system with ability upgrades that reward player success.',
      ],
      details: [
        'Complete arcade-style game: AI combat, wave progression, ability upgrades, win/lose states.',
        'Neon aesthetic with custom shader-based lighting and visual effects.',
      ]
    },
    media: [
      { type: 'clip', src: 'assets/CG/Game.mp4', alt: 'Neon Battlezone 3D game demo' }
    ]
  },

  // ── 7. Applied AI Systems ────────────────────────────────────────────────────
  {
    slug: 'ai-initiative',
    title: 'Applied AI Systems: Search, Optimization and Interaction (Java)',
    featured: false,
    cover: 'assets/AI/cover.png',
    role: 'Designer and Developer',
    tech: 'Java | A* | Genetic Algorithms | Simulated Annealing',
    tags: ['AI/Algorithms', 'Software Dev'],
    blurb: 'Five interactive Java applications that turn classical AI algorithms into visual, controllable tools. A* search visualization, genetic algorithms vs. simulated annealing, and a human-vs-AI planning simulation.',
    metrics: [
      metric('Lang', 'Java'),
      metric('Projects', '5'),
      metric('Focus', 'AI + Visualization')
    ],
    case: {
      problem: 'Make classical AI algorithms interpretable and interactive for developers and learners.',
      role: 'Designed and built five Java AI systems, pairing algorithmic logic with interactive visualization.',
      tech: [
        'Java (Swing, threading, timers)',
        'A* search and visualization',
        'Genetic Algorithm and Simulated Annealing',
        'Dual-map human-vs-AI planning',
      ],
      decisions: [
        'Built a real-time A* pathfinding visualizer with node coloring, cost labels, and interactive controls for stepping through and debugging the search.',
        'Implemented a Genetic Algorithm vs. Simulated Annealing comparison tool with a live selector for side-by-side optimization analysis.',
        'Developed a dual-map human-vs-AI planning simulation with countdown timers, difficulty scaling, and win-state display.',
        'Unified all five systems around explainability and interactivity, pairing algorithmic rigor with user-centered design.',
      ],
      results: [
        'Enhanced algorithm interpretability through visualization and interactive control panels.',
        'Demonstrated full AI system design from algorithm logic to GUI and interaction.',
        'Five independently designed, implemented, and documented AI systems.',
      ],
      details: [
        'A live, interactive A* visualizer built in the same spirit is playable in the Interactive section of this site.',
      ]
    },
    media: [
      { type: 'img', src: 'assets/AI/ps01.png' },
      { type: 'img', src: 'assets/AI/ps01-1.png' },
      { type: 'img', src: 'assets/AI/ps02-1.png' },
      { type: 'img', src: 'assets/AI/ps05-1.png' },
      { type: 'img', src: 'assets/AI/ps06.png' }
    ]
  },

  // ── 8. Rofial Beauty ─────────────────────────────────────────────────────────
  {
    slug: 'rofial',
    title: 'Rofial Beauty: Live Production E-Commerce (Shopify)',
    featured: false,
    cover: 'assets/rofial.png',
    role: 'Sole Developer and Technical Operator',
    tech: 'Shopify | Liquid | HTML/CSS | JavaScript | SEO',
    tags: ['Software Dev', 'E-Commerce'],
    blurb: 'Sole developer and technical operator for a boutique fashion brand\'s production e-commerce site, live and maintained since 2020. Customized from scratch in Liquid, HTML, CSS, and JavaScript.',
    metrics: [
      metric('Platform', 'Shopify'),
      metric('Active', '2020 to Present'),
      metric('Growth', 'Increased visibility')
    ],
    links: [
      { label: 'Visit Live Site', href: 'https://rofialbeauty.com' }
    ],
    case: {
      problem: 'Build and operate a modern online storefront for a boutique brand, customized from the ground up, with real SEO, inventory management, and email automation.',
      role: 'Sole developer building and maintaining a production Shopify e-commerce site since 2020. Customized the theme architecture, implemented SEO strategy, automated marketing workflows, and manage full-stack operations.',
      tech: [
        'Shopify (Liquid, theme customization)',
        'HTML, CSS, JavaScript (responsive, mobile-first)',
        'Google Analytics and Google Merchant Center',
        'SEO optimization and Google Ads',
        'Mailchimp automation and tagging flows',
      ],
      decisions: [
        'Customized a Shopify theme architecture from scratch (Liquid, HTML, CSS, JavaScript) into a responsive, mobile-first storefront matching the brand.',
        'Built automated Mailchimp email flows for customer re-engagement and new-arrival campaigns.',
        'Implemented SEO and Google Merchant Center integration to improve product discoverability.',
        'Managed a full inventory system with dynamic collections and variant tracking, shipping iterative updates against client feedback over multiple years.',
      ],
      results: [
        'Built and launched a production e-commerce site that has operated continuously since 2020.',
        'Increased online visibility and customer engagement, driving pre-visit website traffic to the physical store.',
        'Improved product discovery through SEO optimization and intuitive navigation.',
        'Maintained a long-term client relationship with ongoing updates and responsive support.',
      ],
      details: [
        'Site live and maintained since 2020; continuously updated with new product lines.',
        'Collaborated with designers and owners to ensure accurate branding and catalog updates.',
      ]
    },
    media: [
      { type: 'img', src: 'assets/rofial beauty/homepage.png' },
      { type: 'img', src: 'assets/rofial beauty/product.png' },
      { type: 'img', src: 'assets/rofial beauty/collection.png' },
      { type: 'img', src: 'assets/rofial beauty/checkout.png' }
    ]
  },

  // ── 9. Unmasking Reality ─────────────────────────────────────────────────────
  {
    slug: 'unmasking',
    title: 'Unmasking Reality: Narrative 2D Game (Godot)',
    featured: false,
    cover: 'assets/Unmasking Reality/unmasking.jpg',
    role: 'Sole Programmer and Technical Director',
    tech: 'Godot | GDScript | Custom Shaders',
    tags: ['Software Dev', 'Game Dev', 'Computer Graphics'],
    blurb: 'Sole programmer and technical director on a 3-person team. Custom shaders transition the world from monochrome to full color based on player progress. Branching dialogue system with emotional-state tracking across four narrative paths.',
    metrics: [
      metric('Engine', 'Godot 4.3'),
      metric('Time', '100+ hrs'),
      metric('Team', '3 (sole programmer)')
    ],
    links: [
      { label: 'Full gameplay (YouTube)', href: 'https://www.youtube.com/watch?v=TXDZXRTnTpQ' }
    ],
    case: {
      problem: 'Design and implement a short 2D game exploring emotional suppression through environmental storytelling and player choice, within a strict academic timeline.',
      role: 'Led all programming, shader development, and system design in Godot. Directed teammates on narrative and art contributions while integrating their work into a cohesive final product.',
      tech: [
        'Godot 4.3 (GDScript)',
        'Custom shaders for dynamic color transitions',
        'Branching dialogue system with emotional-state tracking',
        'Physics and projectile system with collision layers',
        'UI and menu flow for multi-mode gameplay (Short, Medium, Long)',
      ],
      decisions: [
        'Wrote custom shaders that transition the world from monochrome to full color based on player progress, a core storytelling mechanic.',
        'Built a branching dialogue system with emotional-state tracking across four narrative paths, driven by data files for scalability.',
        'Designed modular scene transitions and implemented projectile physics with collision layers.',
        'Coordinated a mixed-skill team, integrating art and narrative contributions into a cohesive Godot pipeline.',
      ],
      results: [
        'Delivered a fully playable 2D narrative experience with complete start-to-end progression.',
        'Custom shaders used as a storytelling mechanic, not just aesthetics.',
        'Integrated dialogue logic, physics, and art assets into a unified engine flow.',
      ],
      details: [
        'Custom shaders written from scratch for layered post-processing color shifts.',
        'Led a mixed-skill team; served as the technical and creative backbone of the project.',
      ]
    },
    media: [
      { type: 'clip', src: 'assets/Unmasking Reality/Unmasking Reality - Color Progress.mp4' },
      { type: 'img', src: 'assets/Unmasking Reality/splash.png' },
      { type: 'img', src: 'assets/Unmasking Reality/menu.png' },
      { type: 'img', src: 'assets/Unmasking Reality/book.png' },
      { type: 'img', src: 'assets/Unmasking Reality/combat.png' },
      { type: 'img', src: 'assets/Unmasking Reality/dialogue.png' },
      { type: 'img', src: 'assets/Unmasking Reality/end.png' },
      { type: 'img', src: 'assets/Unmasking Reality/grocery.png' },
      { type: 'img', src: 'assets/Unmasking Reality/school.png' },
      { type: 'img', src: 'assets/Unmasking Reality/unmasking.jpg' },
      { type: 'img', src: 'assets/Unmasking Reality/unmasking_reality.png' },
      { type: 'clip', src: 'assets/Unmasking Reality/book_short.mp4' },
      { type: 'clip', src: 'assets/Unmasking Reality/dialogue_short.mp4' },
      { type: 'clip', src: 'assets/Unmasking Reality/naviagtion_short.mp4' },
      { type: 'yt', url: 'https://www.youtube.com/watch?v=TXDZXRTnTpQ' }
    ]
  },

  // ── 10. Connect Four ─────────────────────────────────────────────────────────
  {
    slug: 'connect-four',
    title: 'Connect Four: Networked Human vs. AI (Java)',
    featured: false,
    cover: 'assets/AI/ps04.png',
    role: 'Solo Developer',
    tech: 'Java | Sockets | Client-Server | Swing',
    tags: ['Software Dev', 'Systems', 'AI/Algorithms', 'Game Dev'],
    blurb: 'Networked human-vs-AI Connect Four. Client-server architecture over Java sockets with game logic, win detection, an AI opponent, and a Swing GUI.',
    metrics: [
      metric('Lang', 'Java'),
      metric('Architecture', 'Client-Server'),
      metric('Focus', 'Networking + AI')
    ],
    case: {
      problem: 'Build a playable Connect Four game where a human plays against an AI over the network, with a clean separation between client (UI) and server (game + AI logic).',
      role: 'Solo developer. Implemented game rules and win detection, socket-based client-server communication, a simple AI opponent, and a Swing GUI.',
      tech: [
        'Java Sockets (client-server)',
        'Java Swing (GUI)',
        'Game logic and win detection',
        'AI opponent',
      ],
      decisions: [
        'Separated client (display, input) and server (game state, AI) so multiple clients can connect to the same server.',
        'Used sockets for real-time move exchange between client and server.',
        'Implemented a simple AI for the server so the human always plays against the computer.',
      ],
      results: [
        'Delivered a working human vs. AI Connect Four game over the network.',
        'Combined game logic, networking, and GUI in one cohesive project.',
      ],
      details: [
        'Real-time human vs. AI Connect Four using Java Sockets.',
        'Client-server architecture with a Swing GUI.',
      ]
    },
    media: [
      { type: 'img', src: 'assets/AI/ps04.png' },
      { type: 'img', src: 'assets/AI/ps04-1.png' }
    ]
  },

  // ── 11. 3D Rasterization ─────────────────────────────────────────────────────
  {
    slug: 'cg-rasterization',
    title: '3D Rasterization: Transforms, Lighting and Interactive Rendering (WebGL)',
    featured: false,
    cover: 'assets/CG/Eclipse.mp4',
    role: 'Solo Developer',
    tech: 'WebGL | GLSL | glMatrix',
    tags: ['Software Dev', 'Computer Graphics'],
    blurb: 'A full 3D rasterization pipeline in WebGL: vertex and fragment shaders, Blinn-Phong per-fragment lighting, perspective projection, and interactive camera and model controls.',
    metrics: [
      metric('Engine', 'WebGL'),
      metric('Shading', 'Blinn-Phong'),
      metric('Focus', 'Rasterization Pipeline')
    ],
    case: {
      problem: 'Implement a complete 3D rasterization pipeline in WebGL with proper transforms, lighting, and interactive controls.',
      role: 'Solo developer implementing the full graphics pipeline: vertex and fragment shaders, matrix transformations, and interactive keyboard controls.',
      tech: [
        'WebGL (vertex and fragment shaders)',
        'Blinn-Phong lighting model (ambient, diffuse, specular) in fragment shaders',
        'glMatrix for matrix operations',
        'Per-fragment shading, perspective projection and view transforms',
      ],
      decisions: [
        'Implemented per-fragment shading in fragment shaders for accurate lighting calculations at each pixel.',
        'Used glMatrix for efficient matrix operations (model, view, projection transforms).',
        'Designed interactive keyboard controls for real-time view translation and rotation.',
        'Applied inverse transpose of modeling transform to vertex normals for correct lighting under transformations.',
      ],
      results: [
        'Rendered 3D triangles with accurate Blinn-Phong lighting and perspective projection.',
        'Interactive view controls with real-time camera movement and rotation.',
        'Demonstrated understanding of the complete graphics pipeline from 3D coordinates to screen pixels.',
      ],
      details: [
        'Rasterization pipeline: vertex processing, primitive assembly, rasterization, fragment shading.',
        'Interactive controls for view translation (WASD, QE) and rotation (shift+WASD).',
      ]
    },
    media: [
      { type: 'clip', src: 'assets/CG/Eclipse.mp4', alt: 'Lighting and rendering of 3D models' },
      { type: 'clip', src: 'assets/CG/Selection.mp4', alt: 'Interactive model selection and transformation' }
    ]
  },

  // ── 12. Ray Tracing ──────────────────────────────────────────────────────────
  {
    slug: 'cg-raytracing',
    title: 'Ray Tracing: Global Illumination and Scene Recreation (WebGL)',
    featured: false,
    cover: 'assets/CG/Minecraft.mp4',
    role: 'Solo Developer',
    tech: 'WebGL | Ray Tracing | GLSL',
    tags: ['Software Dev', 'Computer Graphics'],
    blurb: 'A ray-traced, navigable Minecraft-style scene with recursive reflections, shadow rays, and physically-based materials. Fully interactive with player movement controls.',
    metrics: [
      metric('Method', 'Ray Tracing'),
      metric('Scene', 'Minecraft Recreation'),
      metric('Rendering', 'Global Illumination')
    ],
    case: {
      problem: 'Recreate an interactive Minecraft scene using ray tracing to demonstrate global illumination, shadows, and reflections.',
      role: 'Solo developer implementing ray tracing algorithms and interactive scene navigation.',
      tech: [
        'Ray tracing algorithms',
        'Intersection testing (spheres, triangles, planes)',
        'Global illumination calculations',
        'Shadow ray casting and reflection',
        'Material property modeling',
      ],
      decisions: [
        'Implemented recursive ray tracing for accurate reflections and refractions with depth limits.',
        'Used efficient intersection algorithms for different primitive types.',
        'Applied Monte Carlo sampling for soft shadows and area light sources.',
        'Implemented material models supporting diffuse, specular, and reflective properties.',
      ],
      results: [
        'Recreated an interactive Minecraft scene with physically-based lighting and shadows.',
        'Player movement controls allow full navigation through the 3D environment.',
        'Demonstrated understanding of global illumination and physically-based rendering.',
      ],
      details: [
        'Ray tracing pipeline: ray generation, intersection testing, shading, recursive reflection.',
        'Material models: Lambertian diffuse, Phong specular, and perfect mirrors.',
      ]
    },
    media: [
      { type: 'clip', src: 'assets/CG/Minecraft.mp4', alt: 'Ray tracing rendering with global illumination' }
    ]
  },

  // ── 13. CivicEye ─────────────────────────────────────────────────────────────
  {
    slug: 'civiceye',
    title: 'CivicEye: UX Research and Figma Prototyping',
    featured: false,
    cover: 'assets/civiceye.png',
    role: 'Interaction Designer and UX Researcher',
    tech: 'Figma | User Research | Prototyping',
    tags: ['HCI/UX', 'Research'],
    blurb: 'UX research and prototyping for a civic-engagement platform. Lo-fi wireframes to high-fi Figma prototypes, refined through structured usability testing.',
    metrics: [
      metric('Tool', 'Figma'),
      metric('Method', 'User Study'),
      metric('Focus', 'Usability and Accessibility')
    ],
    case: {
      problem: 'CivicEye aimed to help users discover local events, report safety issues, and stay connected to their community while keeping the interface simple and intuitive.',
      role: 'Led interaction design and usability testing. Built lo-fi wireframes, transitioned to high-fi prototypes in Figma, and ran structured user studies.',
      tech: [
        'Figma (Wireframing and Prototyping)',
        'Qualitative user testing',
        'Iterative redesigns based on usability metrics',
        'Accessibility and visual hierarchy tuning',
      ],
      decisions: [
        'Started with broad brainstorming to map core tasks, then narrowed focus to essential flows.',
        'Conducted usability tests where participants completed defined tasks; recorded issues in navigation clarity.',
        'Redesigned layouts to separate dense screens, prioritize key actions, and improve visual grouping.',
        'Refined color contrast, alignment, and spacing to enhance accessibility and readability.',
      ],
      results: [
        'Reduced cognitive load by simplifying complex screens and separating decision points.',
        'Improved navigation clarity and visual hierarchy across all tested flows.',
        'Gained practical experience in usability study design including planning, execution, and analysis.',
      ],
      details: [
        'Multi-screen Figma prototype with linked interactions and iterative user feedback.',
        'Good design requires predictable behavior and tested understanding, not just aesthetics.',
      ]
    },
    media: [
      { type: 'clip', src: 'assets/HCI-Figma/CivicEye-demo.mp4' },
      { type: 'img',  src: 'assets/HCI-Figma/homepage.png' },
      { type: 'img',  src: 'assets/HCI-Figma/event-flow.png' },
      { type: 'img',  src: 'assets/HCI-Figma/report-flow.png' }
    ]
  },

  // ── 14. Narrative and Puzzle Prototypes ──────────────────────────────────────
  {
    slug: 'narrative-prototypes',
    title: 'Narrative and Puzzle Prototyping (Twine, PuzzleScript)',
    featured: false,
    cover: 'assets/Twine/cover.png',
    role: 'Designer and Author',
    tech: 'Twine | PuzzleScript | State Management | Systems Thinking',
    tags: ['Game Dev', 'Design'],
    blurb: 'Rapid game prototypes in lightweight engines to explore early-stage design concepts. Branching narrative with stateful choices in Twine; progressive Sokoban-style puzzles in PuzzleScript.',
    metrics: [
      metric('Engines', 'Twine, PuzzleScript'),
      metric('Focus', 'Branching and State'),
      metric('Deliverables', '3 prototypes')
    ],
    links: [
      { label: 'Watch Level 5', href: 'https://youtu.be/kVCxY8kH0YQ?si=1hPc6EA3H4kbxQPg' },
      { label: 'Watch Level 4', href: 'https://youtu.be/BTsr58-offg?si=bHZTsqWoc4aZiT2b' },
      { label: 'Watch Level 3', href: 'https://youtu.be/_x87yj5ztG8?si=myGqYlJaYArZI9oO' }
    ],
    case: {
      problem: 'Explore how branching narrative and progressive mechanics can teach design principles through rapid prototyping.',
      role: 'Designed and authored all passages, choice structures, state logic, and puzzle levels. Focused on fast iteration and player readability.',
      tech: [
        'Twine (variables for state, flags, and conditional reveals)',
        'PuzzleScript (logic-based ruleset and level scripting)',
        'Iterative playtesting and player feedback',
        'Constraint-based puzzle composition',
      ],
      decisions: [
        'Built a branching dialogue prototype in Twine with layered choices that shape emotional tone and outcomes, with state variables for conditional reveals.',
        'Designed a Sokoban-style puzzle series in PuzzleScript with progressive mechanics and logical sequencing across levels.',
        'Focused on fast iteration, player readability, and the balance between challenge and flow.',
        'Introduced one new mechanic per puzzle level to ensure clear learning progression.',
      ],
      results: [
        'Delivered readable, replayable prototypes with clear tone shifts and progression.',
        'Strengthened skills in state management, conditional text, and pacing.',
        'Practiced narrative economy and iterative design under tight scope.',
      ],
      details: [
        'Rapid prototyping to explore early-stage design concepts.',
        'Foundation for future hybrid narrative and mechanics projects.',
      ]
    },
    media: [
      { type: 'img', src: 'assets/Twine/cover.png' },
      { type: 'img', src: 'assets/Twine/thg-2.png' },
      { type: 'img', src: 'assets/Twine/thg-cover.png' },
      { type: 'img', src: 'assets/PuzzleScript/Level 1.png' },
      { type: 'img', src: 'assets/PuzzleScript/Level 2.png' },
      { type: 'img', src: 'assets/PuzzleScript/Level 3.png' },
      { type: 'img', src: 'assets/PuzzleScript/Level 4.png' }
    ]
  }
];

// Featured slugs - used only to sort featured cards to the top of the project grid
const FEATURED_SLUGS = ['wolfcafe', 'engine', 'unity-plugin', 'unreal-sim', 'hci-research'];


// ── Render: project grid with collapse ───────────────────────────────────────
const TOTAL_PROJECTS = PROJECTS.length;

function renderProjects() {
  const grid = queryOne('#projectGrid');
  const tpl  = queryOne('#cardTpl');
  const showAllWrap = queryOne('#showAllWrap');
  if (!grid || !tpl) return;
  grid.innerHTML = '';

  // Sort: featured projects first (in FEATURED_SLUGS order), then the rest
  const sorted = [
    ...FEATURED_SLUGS.map(s => PROJECTS.find(p => p.slug === s)).filter(Boolean),
    ...PROJECTS.filter(p => !FEATURED_SLUGS.includes(p.slug))
  ];

  sorted.forEach((project, idx) => {
    const card = tpl.content.firstElementChild.cloneNode(true);
    card.dataset.slug = project.slug;
    card.dataset.tags = (project.tags||[]).join(',');
    setCoverWithFallback(queryOne('.thumb', card), project);
    queryOne('.card-title', card).textContent = project.title;
    queryOne('.card-blurb', card).textContent = project.blurb;
    queryOne('.badge',      card).style.display = project.featured ? 'inline-flex' : 'none';
    queryOne('.metrics',    card).innerHTML = (project.metrics||[]).join('');
    const tagWrap = queryOne('.tags', card);
    (project.tags||[]).forEach(t => {
      const s = document.createElement('span'); s.className='kbd'; s.textContent=t; tagWrap.appendChild(s);
    });
    const linkWrap = queryOne('.links', card);
    (project.links||[]).forEach(l => {
      const a = document.createElement('a'); a.className='btn btn-sm'; a.href=l.href; a.target='_blank'; a.rel='noopener'; a.textContent=l.label;
      a.addEventListener('click', e => e.stopPropagation(), {capture:true});
      linkWrap.appendChild(a);
    });
    queryOne('.view-details', card).addEventListener('click', e => { e.stopPropagation(); openModal(project.slug); });
    card.addEventListener('click',   () => openModal(project.slug));
    card.addEventListener('keydown', e => { if (e.key==='Enter') openModal(project.slug); });
    if (idx > 5) card.classList.add('is-hidden-extra');
    grid.appendChild(card);
  });

  if (showAllWrap) {
    showAllWrap.style.display = 'flex';
    const btn = queryOne('#showAllProjects');
    if (btn) btn.textContent = `Show all projects (${sorted.length})`;
  }
}


// ── Filters ───────────────────────────────────────────────────────────────────
function initFilters() {
  const chips = queryAll('.chip[data-filter]');
  if (!chips.length) return;
  const showAllWrap = queryOne('#showAllWrap');
  const showAllBtn  = queryOne('#showAllProjects');
  let allShown = false;

  const applyFilter = tag => {
    const val = (tag||'all').toLowerCase();
    chips.forEach(c => {
      const active = c.dataset.filter.toLowerCase() === val;
      c.setAttribute('aria-pressed', String(active));
      c.classList.toggle('active', active);
    });
    queryAll('#projectGrid .card').forEach(card => {
      const cardTags = (card.dataset.tags||'').toLowerCase();
      const visible = val==='all' || cardTags.split(',').map(t=>t.trim()).includes(val);
      card.style.display = visible ? '' : 'none';
      if (val!=='all') card.classList.remove('is-hidden-extra');
    });
    if (val==='all' && !allShown) {
      queryAll('#projectGrid .card').forEach((c,i) => { if(i>5) c.classList.add('is-hidden-extra'); });
      if (showAllWrap) showAllWrap.style.display = 'flex';
    } else {
      if (showAllWrap) showAllWrap.style.display = 'none';
    }
  };

  chips.forEach(c => c.addEventListener('click', () => applyFilter(c.dataset.filter)));

  if (showAllBtn) {
    showAllBtn.addEventListener('click', () => {
      allShown = true;
      queryAll('#projectGrid .card').forEach(c => c.classList.remove('is-hidden-extra'));
      if (showAllWrap) showAllWrap.style.display = 'none';
    });
  }

  applyFilter('all');
}


// ── Experience timeline ───────────────────────────────────────────────────────
function renderExperience() {
  const container = queryOne('#timeline');
  if (!container) return;
  container.innerHTML = '';

  const EXPERIENCE = [
    {
      when: 'Jan 2026 – May 2026',
      title: 'Research Assistant (NSF REU, HCI)',
      org: 'NC State University', place: 'Raleigh, NC',
      bullets: [
        'Annotated 2,700 dialogue turns across 10 teams of three professional programmers; reached strong inter-rater agreement (Jaccard > 0.80).',
        'Analyzed team interactions and metacognition with Python and Jupyter; built event-locked and aggregate visualizations.',
        'Found patterns linking planning and monitoring talk to successful fixes; informed recommendations for instructors and tool builders.',
        'Volunteered at VL/HCC: registration and check-in for researchers and professionals.',
        'Co-authored a paper accepted to the HCII 2026 conference on social metacognition in successful vs. unsuccessful teams.',
      ],
      tags: ['Research','Python','HCI','Data Viz','HCII 2026']
    },
    {
      when: 'Aug 2024 – May 2026',
      title: 'Computer Science Ambassador (Volunteer)',
      org: 'NC State University', place: 'Raleigh, NC',
      bullets: [
        'Represented the CSC department in outreach, campus tours, and events; explained the program and its hands-on project culture.',
        'Highlighted signature coursework and student opportunities to prospective students and families.',
        'Coordinated with faculty and peer ambassador teams to plan and execute events.',
      ],
      tags: ['Outreach','Communication','Leadership','Events']
    },
    {
      when: 'Aug 2024 – May 2026',
      title: 'Teaching Assistant Senate Member',
      org: 'NC State University', place: 'Raleigh, NC',
      bullets: [
        'Elected member of the TA Senate, a selective body that shapes TA policy and pedagogy across the department.',
        'Led 5+ GitHub workshops to strengthen course-wide version control fluency (branching, PRs, code reviews).',
        'Researched UTA impact; proposed course-level improvements informed by student and TA feedback.',
        'Conducted lab observations using a standardized form to evaluate TA practices and student support.',
        'Participated in behavioral interviews to help select and place new TAs.',
      ],
      tags: ['Teaching','Leadership','Git','Program Improvement','Hiring']
    },
    {
      when: 'Aug 2023 – May 2026',
      title: 'Undergraduate TA: Intro Java and Data Structures and Algorithms',
      org: 'NC State University', place: 'Raleigh, NC',
      bullets: [
        'Supported 400+ students across five semesters as a TA for Intro to Java (CSC 116) and Data Structures and Algorithms (CSC 316).',
        'Explained complex topics in multiple ways: visuals, analogies, and step-throughs, and in non-technical terms when needed.',
        'Helped students debug complex programs by instrumenting code, designing tests, and isolating defects methodically.',
        'Delivered rubric-based feedback at scale while promoting inclusive, collaborative learning norms.',
      ],
      tags: ['Teaching','Java','Algorithms','Mentoring','Debugging']
    },
    {
      when: '2020 – Present',
      title: 'Operator: Rofial Beauty (Shopify)',
      org: 'Rofial Beauty', place: 'Remote',
      bullets: [
        'Built and customized a Shopify theme from scratch in Liquid, HTML, CSS, and JavaScript; iterated UX with owners across multiple releases.',
        'Implemented SEO and Google Merchant Center; ran Google Ads; automated email flows with Mailchimp.',
        'Managed inventory and collections for designer products; produced product visuals in Canva.',
        'Improved local visibility and inbound inquiries; continue maintenance and updates on request.',
      ],
      tags: ['Shopify','E-commerce','SEO','Analytics','UX']
    }
  ];

  EXPERIENCE.forEach(e => {
    const item = document.createElement('div'); item.className = 'item';
    item.innerHTML = `
      <div class="muted time">${e.when}</div>
      <div>
        <h4>${e.title}</h4>
        <div class="place">${e.org} &bull; ${e.place}</div>
        <ul>${(e.bullets||[]).map(b=>`<li>${b}</li>`).join('')}</ul>
        <div class="tags" style="margin-top:6px">${(e.tags||[]).map(t=>`<span class="kbd">${t}</span>`).join('')}</div>
      </div>`;
    container.appendChild(item);
  });
}


// ── Coursework ────────────────────────────────────────────────────────────────
function renderCoursework() {
  const grid = queryOne('#courseworkGrid');
  if (!grid) return;
  grid.innerHTML = '';
  const COURSEWORK = [
    { name:'Operating Systems',            details:'C, threads, semaphores and monitors, sockets and TCP, CODA, assembly' },
    { name:'Software Engineering',         details:'Java, Spring Boot, REST, Hibernate, SQL/MySQL, CI/CD, PR reviews, issues and wiki' },
    { name:'Data Structures and Algorithms', details:'Java, complexity, trees/graphs, hashing, maps, runtime complexity' },
    { name:'Networks',                     details:'Sockets, client/server, TCP/UDP basics' },
    { name:'HCI / UX',                     details:'Research methods, prototyping, usability, Figma flows' },
    { name:'Game Dev',                     details:'SDL2, collision, feel tuning, engine patterns' },
    { name:'Computer Graphics',            details:'Rendering pipeline, transforms and camera, rasterization, textures and sampling, lighting and shading' }
  ];
  COURSEWORK.forEach(c => {
    const card = document.createElement('div'); card.className = 'skill';
    card.innerHTML = `<div class="skill-top"><b>${c.name}</b></div><div class="muted">${c.details}</div>`;
    grid.appendChild(card);
  });
}


// ── Reveal on scroll + navbar shadow ─────────────────────────────────────────
function initRevealOnScroll() {
  const els = document.querySelectorAll('[data-animate="reveal"]');
  const mobile = window.innerWidth <= 720;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-visible'); observer.unobserve(e.target); } });
  }, { threshold: mobile ? 0.05 : 0.12, rootMargin: mobile ? '50px' : '0px' });
  els.forEach(el => observer.observe(el));
  if (mobile) setTimeout(() => els.forEach(el => { if (!el.classList.contains('is-visible')) el.classList.add('is-visible'); }), 500);
  window.addEventListener('scroll', () => {
    const nav = document.querySelector('.navbar');
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 6);
  }, { passive: true });
}


// ── Modal ─────────────────────────────────────────────────────────────────────
(function initModal() {
  const modal = queryOne('#projectModal');
  if (!modal) return;
  const titleEl    = queryOne('#modalTitle');
  const blurbEl    = queryOne('#modalBlurb');
  const metricsEl  = queryOne('#modalMetrics');
  const mediaStage = queryOne('#mediaStage');
  const caseSecs   = queryOne('#caseSections');
  const linksEl    = queryOne('#modalLinks');
  const prevBtn    = queryOne('.prev', modal);
  const nextBtn    = queryOne('.next', modal);
  let items = [], idx = 0;

  function renderMedia() {
    mediaStage.innerHTML = '';
    // update 1/N counter
    const counter = queryOne('#mediaCounter');
    if (counter) counter.textContent = items.length > 1 ? `${idx + 1} / ${items.length}` : '';
    if (!items.length) { mediaStage.innerHTML = '<div class="muted">No media</div>'; return; }
    const cur = items[idx];
    if (cur.type==='clip' && cur.src) {
      const v = document.createElement('video');
      Object.assign(v, {muted:true, playsInline:true, loop:true, autoplay:true, controls:true});
      ['muted','playsinline','loop','autoplay','controls'].forEach(a => v.setAttribute(a,''));
      v.src = encodeURI(cur.src);
      if (cur.src.includes('Selection.mp4')) v.style.objectPosition = 'center 85%';
      mediaStage.appendChild(v);
      const play = () => v.play().catch(()=>{});
      v.addEventListener('loadedmetadata', play, {once:true});
      v.addEventListener('canplay', play, {once:true});
      queueMicrotask(play);
    } else if (cur.type==='img' && cur.src) {
      const img = document.createElement('img'); img.alt=''; img.src=encodeURI(cur.src);
      safeImg(img); mediaStage.appendChild(img);
    } else if (cur.type==='yt' && (cur.id||cur.url)) {
      const vid = cur.id || extractYoutubeId(cur.url);
      // Lite embed: show thumbnail, click to load iframe
      const wrap = document.createElement('div'); wrap.className='yt-lite';
      const thumb = document.createElement('img'); thumb.alt='Play video'; thumb.className='yt-lite-thumb';
      setBestYoutubeThumbnail(thumb, vid);
      const btn = document.createElement('button'); btn.className='yt-lite-btn'; btn.setAttribute('aria-label','Play video');
      btn.innerHTML='<svg viewBox="0 0 68 48" width="68" height="48"><path d="M66.5 7.7a8.5 8.5 0 0 0-6-6C56.1 0 34 0 34 0S11.9 0 7.5 1.7a8.5 8.5 0 0 0-6 6C0 12.1 0 24 0 24s0 11.9 1.5 16.3a8.5 8.5 0 0 0 6 6C11.9 48 34 48 34 48s22.1 0 26.5-1.7a8.5 8.5 0 0 0 6-6C68 35.9 68 24 68 24s0-11.9-1.5-16.3z" fill="#ff0000"/><path d="M27 34l18-10-18-10v20z" fill="#fff"/></svg>';
      wrap.appendChild(thumb); wrap.appendChild(btn);
      wrap.addEventListener('click', () => {
        const iframe = document.createElement('iframe');
        iframe.className = 'yt-embed';
        iframe.src = `https://www.youtube.com/embed/${vid}?autoplay=1&rel=0&modestbranding=1`;
        iframe.allow = 'autoplay; fullscreen; picture-in-picture';
        iframe.allowFullscreen = true;
        iframe.setAttribute('frameborder','0');
        iframe.style.width = '100%';
        wrap.replaceWith(iframe);
      });
      mediaStage.appendChild(wrap);
    } else { mediaStage.innerHTML = '<div class="muted">Unsupported media</div>'; }
  }

  function setCase(project) {
    titleEl.textContent  = project.title  || '';
    blurbEl.textContent  = project.blurb  || '';
    metricsEl.innerHTML  = (project.metrics||[]).join('');
    caseSecs.innerHTML   = '';
    const c = project.case || {};
    const sec = (h,body) => caseSecs.insertAdjacentHTML('beforeend', `<section><h4>${h}</h4>${body}</section>`);
    const ul  = arr => `<ul>${arr.map(x=>`<li>${x}</li>`).join('')}</ul>`;
    if (c.summary)                                   sec('Overview',       `<p>${c.summary}</p>`);
    if (Array.isArray(c.learning)&&c.learning.length) sec('What I Learned', ul(c.learning));
    if (c.reflection)                                sec('Reflection',     `<p>${c.reflection}</p>`);
    if (c.problem)                                   sec('Problem',        `<p>${c.problem}</p>`);
    if (c.role||c.tech) {
      const techStr = Array.isArray(c.tech) ? c.tech.join(', ') : (c.tech||'');
      sec('Role and Tech', ul([c.role, techStr].filter(Boolean)));
    }
    if (Array.isArray(c.decisions)&&c.decisions.length) sec('Key Decisions', ul(c.decisions));
    if (Array.isArray(c.results)  &&c.results.length)   sec('Results',       ul(c.results));
    if (Array.isArray(c.details)  &&c.details.length)   sec('Highlights',    ul(c.details));
    if (!caseSecs.children.length) sec('Details', '<p class="muted">More info coming soon.</p>');
    linksEl.innerHTML = '';
    (project.links||[]).forEach(l => linksEl.insertAdjacentHTML('beforeend',
      `<a class="btn btn-sm" href="${l.href}" target="_blank" rel="noopener">${l.label}</a>`));
    items = project.media || []; idx = 0;
    if (prevBtn && nextBtn) {
      const show = items.length > 1;
      prevBtn.style.display = show ? 'flex' : 'none';
      nextBtn.style.display = show ? 'flex' : 'none';
    }
    renderMedia();
  }

  function show() {
    modal.hidden = false; document.body.classList.add('modal-open');
    const sy = window.scrollY;
    document.body.style.position = 'fixed'; document.body.style.top = `-${sy}px`; document.body.style.width = '100%';
  }
  function hide() {
    modal.hidden = true; document.body.classList.remove('modal-open');
    const sy = document.body.style.top;
    document.body.style.position = ''; document.body.style.top = ''; document.body.style.width = '';
    if (sy) window.scrollTo(0, parseInt(sy||'0') * -1);
    mediaStage.querySelectorAll('video').forEach(v => { try { v.pause(); } catch {} });
    mediaStage.innerHTML = '';
  }

  queryOne('.modal-close',    modal).addEventListener('click', hide);
  queryOne('.modal-backdrop', modal).addEventListener('click', hide);
  window.addEventListener('keydown', e => { if (!modal.hidden && e.key==='Escape') hide(); });
  prevBtn.addEventListener('click', () => { if (!items.length) return; idx=(idx-1+items.length)%items.length; renderMedia(); });
  nextBtn.addEventListener('click', () => { if (!items.length) return; idx=(idx+1)%items.length; renderMedia(); });

  window.openModal = slug => {
    const p = PROJECTS.find(x=>x.slug===slug);
    if (p) { setCase(p); show(); }
  };
})();


// ── Contact form - EmailJS (sends directly to nour.004@hotmail.com) ───────────
// Already configured:  service_id = service_ezzhv5t  |  public_key = NPl365R9CGlL_PRUe
// Still needed:        template_id - go to emailjs.com → Email Templates → Create New Template
//   Set To Email = nour.004@hotmail.com, add {{from_name}} {{from_email}} {{message}} in body
//   Save → copy the Template ID (e.g. template_abc123) → paste below
const EMAILJS_SERVICE_ID  = 'service_ezzhv5t';
const EMAILJS_TEMPLATE_ID = 'template_oeqc32q';
const EMAILJS_PUBLIC_KEY  = 'NPl365R9CGlL_PRUe';

function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;
  const statusEl = form.querySelector('.form-status');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (statusEl) { statusEl.textContent = 'Sending...'; statusEl.className = 'form-status'; }

    if (EMAILJS_TEMPLATE_ID === 'YOUR_TEMPLATE_ID') {
      if (statusEl) { statusEl.textContent = 'Almost there - just add the template ID (see code comment). Email nour.004@hotmail.com in the meantime.'; statusEl.className = 'form-status err'; }
      return;
    }

    try {
      const result = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          from_name:  form.querySelector('[name=name]')?.value    || '',
          from_email: form.querySelector('[name=email]')?.value   || '',
          message:    form.querySelector('[name=message]')?.value || '',
        },
        EMAILJS_PUBLIC_KEY
      );
      if (result.status === 200) {
        if (statusEl) { statusEl.textContent = 'Sent! I will get back to you shortly.'; statusEl.className = 'form-status ok'; }
        form.reset();
      } else throw new Error(`status ${result.status}`);
    } catch (err) {
      console.error('[contact form]', err);
      if (statusEl) { statusEl.textContent = 'Something went wrong. Email nour.004@hotmail.com directly.'; statusEl.className = 'form-status err'; }
    }
  });
}


// ── A* pathfinding visualizer ─────────────────────────────────────────────────
function initAstar() {
  const mount = document.getElementById('astar-app');
  if (!mount) return;
  const COLS = 25, ROWS = 15;
  let grid, start, end, running = false, speed = 30;

  mount.innerHTML = `
    <div class="astar-controls">
      <button class="btn btn-sm btn-primary" data-act="run">Run A*</button>
      <button class="btn btn-sm btn-ghost"   data-act="clearPath">Clear path</button>
      <button class="btn btn-sm btn-ghost"   data-act="reset">Reset</button>
      <button class="btn btn-sm btn-ghost"   data-act="maze">Random maze</button>
      <label class="astar-speed">Speed
        <input type="range" min="1" max="60" value="${speed}" data-act="speed" aria-label="Animation speed">
      </label>
    </div>
    <div class="astar-status" id="astar-status">Click "Run A*" - or draw walls first, then run</div>
    <div class="astar-grid" id="astar-grid" role="grid" aria-label="A star pathfinding grid"></div>
    <div class="astar-legend">
      <span class="astar-legend-item"><span class="astar-legend-swatch" style="background:#22c55e"></span>Start</span>
      <span class="astar-legend-item"><span class="astar-legend-swatch" style="background:#ef4444"></span>Goal</span>
      <span class="astar-legend-item"><span class="astar-legend-swatch" style="background:#1e1530"></span>Wall</span>
      <span class="astar-legend-item"><span class="astar-legend-swatch" style="background:#fbbf24"></span>Frontier (open list)</span>
      <span class="astar-legend-item"><span class="astar-legend-swatch" style="background:#a78bfa"></span>Explored (closed set)</span>
      <span class="astar-legend-item"><span class="astar-legend-swatch" style="background:#8b3ff0"></span>Shortest path</span>
    </div>`;

  const gridEl = mount.querySelector('#astar-grid');
  gridEl.style.setProperty('--cols', COLS);

  function blank() {
    grid  = Array.from({length:ROWS}, (_,r) => Array.from({length:COLS}, (_,c) => ({r,c,wall:false,g:Infinity,f:Infinity,prev:null})));
    start = grid[Math.floor(ROWS/2)][2];
    end   = grid[Math.floor(ROWS/2)][COLS-3];
  }
  function draw() {
    gridEl.innerHTML = '';
    for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) {
      const cell = grid[r][c], d = document.createElement('div');
      d.className = 'astar-cell';
      if      (cell===start) d.classList.add('is-start');
      else if (cell===end)   d.classList.add('is-end');
      else if (cell.wall)    d.classList.add('is-wall');
      d.dataset.r=r; d.dataset.c=c;
      gridEl.appendChild(d);
    }
  }
  const cellEl = (r,c) => gridEl.children[r*COLS+c];

  let painting = false;
  gridEl.addEventListener('mousedown', e => { if (running) return; painting=true; toggle(e); });
  gridEl.addEventListener('mousemove', e => { if (painting) toggle(e); });
  window.addEventListener('mouseup',   () => painting=false);
  gridEl.addEventListener('click',     e => { if (!running) toggle(e); });
  function toggle(e) {
    const t = e.target.closest('.astar-cell'); if (!t) return;
    const cell = grid[+t.dataset.r][+t.dataset.c];
    if (cell===start||cell===end) return;
    cell.wall = !cell.wall;
    t.classList.toggle('is-wall', cell.wall);
  }

  const h = (a,b) => Math.abs(a.r-b.r) + Math.abs(a.c-b.c);
  const neighbors = cell => {
    const out=[]; const {r,c}=cell;
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc]) => {
      const nr=r+dr, nc=c+dc;
      if (nr>=0&&nr<ROWS&&nc>=0&&nc<COLS&&!grid[nr][nc].wall) out.push(grid[nr][nc]);
    });
    return out;
  };
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const statusEl = () => mount.querySelector('#astar-status');
  async function run() {
    if (running) return; running=true; clearPathClasses();
    grid.flat().forEach(c => { c.g=Infinity; c.f=Infinity; c.prev=null; });
    start.g=0; start.f=h(start,end);
    const open=[start]; let steps=0;
    statusEl().textContent = 'Searching…';
    while (open.length) {
      open.sort((a,b)=>a.f-b.f);
      const cur=open.shift(); steps++;
      if (cur===end) {
        const pathLen = await tracePath(cur);
        statusEl().textContent = `Found shortest path (${pathLen} steps) - explored ${steps} nodes`;
        running=false; return;
      }
      if (cur!==start) cellEl(cur.r,cur.c).classList.add('is-closed');
      for (const nb of neighbors(cur)) {
        const tg=cur.g+1;
        if (tg<nb.g) {
          nb.prev=cur; nb.g=tg; nb.f=tg+h(nb,end);
          if (!open.includes(nb)) { open.push(nb); if (nb!==end) cellEl(nb.r,nb.c).classList.add('is-open'); }
        }
      }
      await sleep(61-speed);
    }
    statusEl().textContent = 'No path exists - the goal is completely blocked';
    running=false;
  }
  async function tracePath(node) {
    const path=[]; let cur=node;
    while (cur) { path.unshift(cur); cur=cur.prev; }
    for (const c of path) { if (c!==start&&c!==end) { cellEl(c.r,c.c).classList.add('is-path'); await sleep(18); } }
    return path.length - 2;
  }
  function clearPathClasses() {
    gridEl.querySelectorAll('.is-open,.is-closed,.is-path').forEach(el => el.classList.remove('is-open','is-closed','is-path'));
  }

  mount.addEventListener('click', e => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if      (act==='run')       run();
    else if (act==='clearPath') { if (!running) clearPathClasses(); }
    else if (act==='reset')     { if (!running) { blank(); draw(); } }
    else if (act==='maze')      { if (!running) { blank(); grid.flat().forEach(c => { if (c!==start&&c!==end&&Math.random()<0.28) c.wall=true; }); draw(); } }
  });
  mount.addEventListener('input', e => { if (e.target.dataset.act==='speed') speed=+e.target.value; });

  blank(); draw();
}


// ── Connect Four: Minimax AI ──────────────────────────────────────────────────
function initConnectFour() {
  const mount = document.getElementById('c4-app');
  if (!mount) return;

  const ROWS = 6, COLS = 7, DEPTH = 5;
  const HUMAN = 1, AI = 2;
  let board, turn, over;

  const css = `
    .c4-wrap{display:flex;flex-direction:column;align-items:center;gap:12px;padding:16px 0;}
    .c4-status{font-size:0.95rem;font-weight:600;color:var(--brand);min-height:1.4em;text-align:center;}
    .c4-board{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;background:var(--brand);padding:10px;border-radius:12px;}
    .c4-cell{width:clamp(32px,6vw,52px);height:clamp(32px,6vw,52px);border-radius:50%;background:var(--bg);cursor:pointer;transition:background .15s;}
    .c4-cell.p1{background:#ef4444;}
    .c4-cell.p2{background:#f59e0b;}
    .c4-cell.win-flash{animation:c4flash .5s ease infinite alternate;}
    @keyframes c4flash{from{opacity:1}to{opacity:.3}}
    .c4-btn{margin-top:4px;}
    .c4-legend{display:flex;gap:16px;font-size:0.82rem;color:var(--muted);align-items:center;}
    .c4-dot{width:12px;height:12px;border-radius:50%;display:inline-block;margin-right:4px;}
  `;
  const style = document.createElement('style'); style.textContent = css; mount.appendChild(style);

  const wrap   = document.createElement('div'); wrap.className = 'c4-wrap';
  const status = document.createElement('div'); status.className = 'c4-status';
  const boardEl= document.createElement('div'); boardEl.className = 'c4-board';
  const legend = document.createElement('div'); legend.className = 'c4-legend';
  legend.innerHTML = '<span><span class="c4-dot" style="background:#ef4444"></span>You</span><span><span class="c4-dot" style="background:#f59e0b"></span>AI (Minimax)</span>';
  const btn    = document.createElement('button'); btn.className = 'btn btn-sm btn-ghost c4-btn'; btn.textContent = 'New Game';
  btn.addEventListener('click', startGame);
  wrap.append(status, boardEl, legend, btn);
  mount.appendChild(wrap);

  function makeBoard() { return Array.from({length:ROWS}, () => new Array(COLS).fill(0)); }

  function startGame() {
    board = makeBoard(); turn = HUMAN; over = false;
    renderBoard(); status.textContent = 'Your turn - click a column';
  }

  function renderBoard() {
    boardEl.innerHTML = '';
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = document.createElement('div');
        cell.className = 'c4-cell' + (board[r][c] === 1 ? ' p1' : board[r][c] === 2 ? ' p2' : '');
        cell.dataset.col = c;
        boardEl.appendChild(cell);
      }
    }
  }

  function flashWin(cells) {
    cells.forEach(([r,c]) => {
      const idx = r * COLS + c;
      boardEl.children[idx].classList.add('win-flash');
    });
  }

  function drop(col, player) {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][col] === 0) { board[r][col] = player; return r; }
    }
    return -1;
  }

  function undrop(col) {
    for (let r = 0; r < ROWS; r++) {
      if (board[r][col] !== 0) { board[r][col] = 0; return; }
    }
  }

  function validCols() {
    const cols = [];
    for (let c = 0; c < COLS; c++) if (board[0][c] === 0) cols.push(c);
    return cols;
  }

  function checkWin(player) {
    // horizontal
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c <= COLS-4; c++)
        if ([0,1,2,3].every(i => board[r][c+i]===player)) return [[r,c],[r,c+1],[r,c+2],[r,c+3]];
    // vertical
    for (let r = 0; r <= ROWS-4; r++)
      for (let c = 0; c < COLS; c++)
        if ([0,1,2,3].every(i => board[r+i][c]===player)) return [[r,c],[r+1,c],[r+2,c],[r+3,c]];
    // diag \
    for (let r = 0; r <= ROWS-4; r++)
      for (let c = 0; c <= COLS-4; c++)
        if ([0,1,2,3].every(i => board[r+i][c+i]===player)) return [[r,c],[r+1,c+1],[r+2,c+2],[r+3,c+3]];
    // diag /
    for (let r = 3; r < ROWS; r++)
      for (let c = 0; c <= COLS-4; c++)
        if ([0,1,2,3].every(i => board[r-i][c+i]===player)) return [[r,c],[r-1,c+1],[r-2,c+2],[r-3,c+3]];
    return null;
  }

  function scoreWindow(w, player) {
    const opp = player === AI ? HUMAN : AI;
    const p = w.filter(x=>x===player).length, o = w.filter(x=>x===opp).length, e = w.filter(x=>x===0).length;
    if (p===4) return 100; if (p===3&&e===1) return 5; if (p===2&&e===2) return 2;
    if (o===3&&e===1) return -4;
    return 0;
  }

  function scoreBoard(player) {
    let score = 0;
    // centre column bonus
    const centre = board.map(r=>r[3]);
    score += centre.filter(x=>x===player).length * 3;
    // horizontal
    for (let r=0;r<ROWS;r++) for (let c=0;c<=COLS-4;c++) score+=scoreWindow([board[r][c],board[r][c+1],board[r][c+2],board[r][c+3]],player);
    // vertical
    for (let r=0;r<=ROWS-4;r++) for (let c=0;c<COLS;c++) score+=scoreWindow([board[r][c],board[r+1][c],board[r+2][c],board[r+3][c]],player);
    // diag \
    for (let r=0;r<=ROWS-4;r++) for (let c=0;c<=COLS-4;c++) score+=scoreWindow([board[r][c],board[r+1][c+1],board[r+2][c+2],board[r+3][c+3]],player);
    // diag /
    for (let r=3;r<ROWS;r++) for (let c=0;c<=COLS-4;c++) score+=scoreWindow([board[r][c],board[r-1][c+1],board[r-2][c+2],board[r-3][c+3]],player);
    return score;
  }

  function minimax(depth, alpha, beta, maximizing) {
    if (checkWin(AI))    return  10000 + depth;
    if (checkWin(HUMAN)) return -10000 - depth;
    const cols = validCols();
    if (!cols.length || depth === 0) return scoreBoard(AI);
    if (maximizing) {
      let best = -Infinity;
      for (const c of cols) {
        drop(c, AI); const val = minimax(depth-1, alpha, beta, false); undrop(c);
        best = Math.max(best, val); alpha = Math.max(alpha, best);
        if (alpha >= beta) break;
      }
      return best;
    } else {
      let best = Infinity;
      for (const c of cols) {
        drop(c, HUMAN); const val = minimax(depth-1, alpha, beta, true); undrop(c);
        best = Math.min(best, val); beta = Math.min(beta, best);
        if (alpha >= beta) break;
      }
      return best;
    }
  }

  function aiMove() {
    const cols = validCols();
    let bestVal = -Infinity, bestCol = cols[Math.floor(cols.length/2)];
    for (const c of cols) {
      drop(c, AI); const val = minimax(DEPTH-1, -Infinity, Infinity, false); undrop(c);
      if (val > bestVal) { bestVal = val; bestCol = c; }
    }
    return bestCol;
  }

  boardEl.addEventListener('click', e => {
    if (over || turn !== HUMAN) return;
    const col = +e.target.dataset.col;
    if (isNaN(col)) return;
    if (board[0][col] !== 0) return;
    drop(col, HUMAN);
    renderBoard();
    const hw = checkWin(HUMAN);
    if (hw) { over=true; status.textContent='🎉 You win!'; flashWin(hw); return; }
    if (!validCols().length) { over=true; status.textContent="It's a draw!"; return; }
    turn = AI; status.textContent = 'AI is thinking…';
    setTimeout(() => {
      const ac = aiMove(); drop(ac, AI); renderBoard();
      const aw = checkWin(AI);
      if (aw) { over=true; status.textContent='AI wins! Try again?'; flashWin(aw); return; }
      if (!validCols().length) { over=true; status.textContent="It's a draw!"; return; }
      turn = HUMAN; status.textContent = 'Your turn';
    }, 80);
  });

  startGame();
}


// ── Planning Agent visualizer ────────────────────────────────────────────────
function initPlanningAgent() {
  const mount = document.getElementById('planning-app');
  if (!mount) return;

  const CELL = 48;
  // Grid layout: 0=empty, W=wall, C=chip, K=key, D=door, E=exit, A=agent
  const LAYOUTS = [
    // Level 1
    ['.........',
     '...W.W...',
     '..CW.WC..',
     '...W.W...',
     '....K....',
     '..WWDWW..',
     '....A....',
     '....E....'],
    // Level 2
    ['W.W.W.W.W',
     '..C.K.C..',
     'W.W.W.W.W',
     '....A....',
     'W.WWDWW.W',
     '....E....',
     'W.......W'],
  ];

  let layoutIdx = 0, grid, rows, cols, agentPos, chips, keys, doors, exitPos;
  let animHandle = null, path = [], pathStep = 0, inventory = {chips:0, keys:0};
  let subgoalLog = [];

  const css = `
    .pa-wrap{display:flex;flex-direction:column;align-items:center;gap:14px;padding:16px 0;font-size:.9rem;}
    .pa-top{display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:center;}
    .pa-canvas{border-radius:10px;display:block;cursor:default;image-rendering:pixelated;}
    .pa-log{width:100%;max-width:480px;max-height:90px;overflow-y:auto;background:var(--chip);border-radius:8px;padding:8px 12px;font-size:.8rem;color:var(--muted);font-family:monospace;}
    .pa-inv{font-size:.85rem;color:var(--muted);}
  `;
  const style = document.createElement('style'); style.textContent = css; mount.appendChild(style);

  const wrap    = document.createElement('div'); wrap.className = 'pa-wrap';
  const top     = document.createElement('div'); top.className  = 'pa-top';
  const runBtn  = document.createElement('button'); runBtn.className = 'btn btn-sm btn-primary'; runBtn.textContent = 'Run Agent';
  const resetBtn= document.createElement('button'); resetBtn.className = 'btn btn-sm btn-ghost'; resetBtn.textContent = 'Reset';
  const lvlBtn  = document.createElement('button'); lvlBtn.className = 'btn btn-sm btn-ghost'; lvlBtn.textContent = 'Next Level';
  const inv     = document.createElement('div'); inv.className = 'pa-inv';
  top.append(runBtn, resetBtn, lvlBtn, inv);
  const canvas  = document.createElement('canvas'); canvas.className = 'pa-canvas';
  const log     = document.createElement('div'); log.className = 'pa-log'; log.textContent = 'Press "Run Agent" to watch it solve the puzzle.';
  wrap.append(top, canvas, log);
  mount.appendChild(wrap);

  const COLORS = {
    '.': '#f3e8ff', W: '#4c1d95', C: '#3b82f6', K: '#f59e0b',
    D: '#dc2626', E: '#10b981', A: '#8b3ff0'
  };
  const LABELS = { C:'💎', K:'🔑', D:'🚪', E:'🏁', A:'🤖' };

  function parseLayout(idx) {
    const raw = LAYOUTS[idx % LAYOUTS.length];
    rows = raw.length; cols = raw[0].length;
    canvas.width = cols * CELL; canvas.height = rows * CELL;
    grid = raw.map(r => r.split(''));
    chips = []; keys = []; doors = []; exitPos = null; agentPos = null;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const t = grid[r][c];
      if (t==='C') chips.push({r,c,collected:false});
      else if (t==='K') keys.push({r,c,collected:false});
      else if (t==='D') doors.push({r,c,open:false});
      else if (t==='E') exitPos = {r,c};
      else if (t==='A') agentPos = {r,c};
    }
    inventory = {chips:0, keys:0};
    path = []; pathStep = 0; subgoalLog = [];
  }

  function draw() {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for (let r=0;r<rows;r++) for (let c=0;c<cols;c++) {
      const t = grid[r][c];
      ctx.fillStyle = t==='W' ? COLORS.W : COLORS['.'];
      ctx.fillRect(c*CELL,r*CELL,CELL,CELL);
      ctx.strokeStyle='rgba(139,63,240,.12)'; ctx.lineWidth=1;
      ctx.strokeRect(c*CELL,r*CELL,CELL,CELL);
      if (LABELS[t]) {
        ctx.font = `${CELL*.55}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(LABELS[t], c*CELL+CELL/2, r*CELL+CELL/2);
      }
    }
    // draw path trail
    path.slice(0, pathStep).forEach(([pr,pc]) => {
      ctx.fillStyle = 'rgba(139,63,240,.18)';
      ctx.beginPath(); ctx.arc(pc*CELL+CELL/2,pr*CELL+CELL/2,CELL*.2,0,Math.PI*2); ctx.fill();
    });
    // draw agent
    if (agentPos) {
      ctx.font = `${CELL*.65}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('🤖', agentPos.c*CELL+CELL/2, agentPos.r*CELL+CELL/2);
    }
    inv.textContent = `💎 ×${inventory.chips}  🔑 ×${inventory.keys}`;
  }

  function heuristic(a, b) { return Math.abs(a.r-b.r)+Math.abs(a.c-b.c); }

  function astar(start, goal, openDoors) {
    const key = p => `${p.r},${p.c}`;
    const open = []; const closed = new Set();
    const g = {[key(start)]:0}; const parent = {[key(start)]:null};
    open.push({...start, f:heuristic(start,goal)});
    while (open.length) {
      open.sort((a,b)=>a.f-b.f);
      const cur = open.shift();
      if (cur.r===goal.r&&cur.c===goal.c) {
        const path=[]; let n=key(cur);
        while(parent[n]){path.unshift(parent[n].split(',').map(Number));n=parent[n];}
        path.push([goal.r,goal.c]); return path;
      }
      const ck=key(cur); if(closed.has(ck)) continue; closed.add(ck);
      for (const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const nr=cur.r+dr, nc=cur.c+dc;
        if(nr<0||nr>=rows||nc<0||nc>=cols) continue;
        const t=grid[nr][nc];
        if(t==='W') continue;
        if(t==='D'&&!openDoors.has(`${nr},${nc}`)) continue;
        const nk=`${nr},${nc}`;
        const ng=(g[ck]||0)+1;
        if(closed.has(nk)||ng>=(g[nk]??Infinity)) continue;
        g[nk]=ng; parent[nk]=`${cur.r},${cur.c}`;
        open.push({r:nr,c:nc,f:ng+heuristic({r:nr,c:nc},goal)});
      }
    }
    return null;
  }

  function addLog(msg) { subgoalLog.push(msg); log.innerHTML = subgoalLog.map(m=>`<div>${m}</div>`).join(''); log.scrollTop=log.scrollHeight; }

  function buildPlan() {
    // priority: chips first, then keys, then open doors (if have key), then exit
    const openDoors = new Set(doors.filter(d=>d.open).map(d=>`${d.r},${d.c}`));
    const remaining = [];
    chips.filter(c=>!c.collected).forEach(c=>remaining.push({type:'chip',target:c}));
    keys.filter(k=>!k.collected).forEach(k=>remaining.push({type:'key',target:k}));
    // sort by manhattan distance from agent
    remaining.sort((a,b)=>heuristic(agentPos,a.target)-heuristic(agentPos,b.target));
    // can we open a door? (need a key in inventory or about to collect one)
    const lockedDoors = doors.filter(d=>!d.open);
    if (!remaining.length && lockedDoors.length && inventory.keys > 0) {
      const nearest = lockedDoors.sort((a,b)=>heuristic(agentPos,a)-heuristic(agentPos,b))[0];
      remaining.push({type:'door',target:nearest});
    }
    if (!remaining.length && exitPos) remaining.push({type:'exit',target:exitPos});
    return remaining;
  }

  function runAgent() {
    if (animHandle) clearTimeout(animHandle);
    path=[]; pathStep=0;
    const openDoors = new Set(doors.filter(d=>d.open).map(d=>`${d.r},${d.c}`));

    function step() {
      // if currently walking a path, advance one step
      if (path.length && pathStep < path.length) {
        const [nr,nc] = path[pathStep++];
        agentPos = {r:nr,c:nc};
        // collect chip/key/open door at new pos
        chips.forEach(c=>{ if(!c.collected&&c.r===nr&&c.c===nc){ c.collected=true; grid[nr][nc]='.'; inventory.chips++; addLog(`✅ Collected chip at (${nr},${nc})`); }});
        keys.forEach(k=>{ if(!k.collected&&k.r===nr&&k.c===nc){ k.collected=true; grid[nr][nc]='.'; inventory.keys++; addLog(`🔑 Grabbed key at (${nr},${nc})`); }});
        doors.forEach(d=>{ if(!d.open&&d.r===nr&&d.c===nc&&inventory.keys>0){ d.open=true; grid[nr][nc]='.'; inventory.keys--; openDoors.add(`${nr},${nc}`); addLog(`🚪 Opened door at (${nr},${nc})`); }});
        if(exitPos&&nr===exitPos.r&&nc===exitPos.c){ addLog('🏁 Reached exit! Puzzle solved!'); draw(); return; }
        draw();
        animHandle=setTimeout(step,160);
        return;
      }
      // plan next subgoal
      const plan = buildPlan();
      if (!plan.length) { addLog('✨ Nothing left to do!'); draw(); return; }
      const next = plan[0];
      const t = next.target;
      addLog(`🗺 Planning path to ${next.type} at (${t.r},${t.c})…`);
      const newPath = astar(agentPos, {r:t.r,c:t.c}, openDoors);
      if (!newPath) { addLog(`⚠ No path to ${next.type} - skipping`);
        // mark unreachable as skip
        if(next.type==='chip') next.target.collected=true;
        if(next.type==='key')  next.target.collected=true;
        animHandle=setTimeout(step,400); return;
      }
      path=newPath; pathStep=0;
      animHandle=setTimeout(step,160);
    }
    addLog('▶ Agent started planning…');
    step();
  }

  runBtn.addEventListener('click', runAgent);
  resetBtn.addEventListener('click', () => {
    if(animHandle) clearTimeout(animHandle);
    parseLayout(layoutIdx); log.textContent='Press "Run Agent" to watch it solve the puzzle.'; draw();
  });
  lvlBtn.addEventListener('click', () => {
    if(animHandle) clearTimeout(animHandle);
    layoutIdx++; parseLayout(layoutIdx); log.textContent='New level loaded. Press "Run Agent".'; draw();
  });

  parseLayout(layoutIdx); draw();
}


// ── Demo tab switcher (pauses/restarts iframes on switch) ────────────────────
function initDemoTabs() {
  const tabs   = queryAll('.demo-tab');
  const panels = queryAll('.demo-panel');
  if (!tabs.length) return;

  const loaded   = new Set();
  const savedSrc = {};  // panelId -> iframe src while paused

  function getIframe(panel) { return panel.querySelector('iframe'); }

  function activate(panelId) {
    // ── pause the currently visible panel ──
    const prev = document.querySelector('.demo-panel:not(.is-hidden)');
    if (prev && prev.id !== panelId) {
      const iframe = getIframe(prev);
      if (iframe && iframe.src && !iframe.src.endsWith('about:blank') && iframe.src !== '') {
        savedSrc[prev.id] = iframe.src;
        iframe.src = 'about:blank'; // stop game/audio/animation
      }
    }

    // ── switch visibility ──
    tabs.forEach(t => {
      const on = t.dataset.panel === panelId;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', String(on));
    });

    panels.forEach(p => {
      const on = p.id === panelId;
      p.classList.toggle('is-hidden', !on);
      if (!on) return;

      const iframe = getIframe(p);
      if (!iframe) return;

      if (!loaded.has(panelId) && iframe.dataset.src) {
        // first time: lazy-load
        loaded.add(panelId);
        iframe.src = iframe.dataset.src;
        iframe.removeAttribute('data-src');
      } else if (savedSrc[panelId]) {
        // returning: reload from saved src (restarts the game fresh)
        iframe.src = savedSrc[panelId];
        delete savedSrc[panelId];
      }
    });
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => activate(tab.dataset.panel));
    tab.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); const n=tabs[(i+1)%tabs.length]; n.focus(); activate(n.dataset.panel); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); const n=tabs[(i-1+tabs.length)%tabs.length]; n.focus(); activate(n.dataset.panel); }
    });
  });

  activate('panel-itsy');
}


// ── Cmd-K palette ─────────────────────────────────────────────────────────────
function initCmdK() {
  const root  = document.getElementById('cmdk');  if (!root)  return;
  const input = document.getElementById('cmdk-input');
  const list  = document.getElementById('cmdk-list');
  const ITEMS = [
    { label:'Home / Hero',              hash:'#home',        kw:'top start intro' },
    { label:'Interactive / Live Demos', hash:'#interactive', kw:'a star astar webgl playable demo' },
    { label:'Projects',                 hash:'#projects',    kw:'all work portfolio best featured highlights' },
    { label:'Skills',                   hash:'#skills',      kw:'tech stack languages' },
    { label:'Experience',               hash:'#experience',  kw:'work roles ta research' },
    { label:'Coursework',               hash:'#coursework',  kw:'classes courses' },
    { label:'Contact',                  hash:'#contactForm', kw:'email reach hire' },
    { label:'Resume (PDF)',             href:'assets/Nour Mahmoud _ General.pdf', kw:'cv download resume' }
  ];
  let active=0, filtered=ITEMS.slice();

  const isOpen = () => root.classList.contains('is-open');
  const open   = () => { root.classList.add('is-open'); input.value=''; render(ITEMS); input.focus(); };
  const close  = () => { root.classList.remove('is-open'); };
  const go    = item => {
    close();
    if (item.href) { window.open(item.href,'_blank','noopener'); return; }
    const target = document.querySelector(item.hash);
    if (target) target.scrollIntoView({behavior:'smooth', block:'start'});
  };

  function render(items) {
    filtered=items; active=0;
    list.innerHTML = items.map((it,i) =>
      `<div class="cmdk-item${i===0?' is-active':''}" role="option" data-i="${i}">${it.label}</div>`).join('');
  }
  function filter(q) {
    q=q.trim().toLowerCase();
    render(q ? ITEMS.filter(it=>(it.label+' '+it.kw).toLowerCase().includes(q)) : ITEMS);
  }
  function move(d) {
    const els = list.querySelectorAll('.cmdk-item'); if (!els.length) return;
    els[active]?.classList.remove('is-active');
    active = (active+d+els.length) % els.length;
    els[active].classList.add('is-active');
    els[active].scrollIntoView({block:'nearest'});
  }

  document.querySelectorAll('.cmdk-hint').forEach(btn => btn.addEventListener('click', open));

  window.addEventListener('keydown', e => {
    if ((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='k') { e.preventDefault(); isOpen() ? close() : open(); return; }
    if (root.hidden) return;
    if      (e.key==='Escape')    close();
    else if (e.key==='ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key==='ArrowUp')   { e.preventDefault(); move(-1); }
    else if (e.key==='Enter')     { e.preventDefault(); if (filtered[active]) go(filtered[active]); }
  });
  input.addEventListener('input', () => filter(input.value));
  list.addEventListener('click',  e => { const li=e.target.closest('.cmdk-item'); if (li) go(filtered[+li.dataset.i]); });
  root.addEventListener('click', e => { if (!e.target.closest('.cmdk-panel')) close(); });
}


// ── Bootstrap ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  PROJECTS.forEach((p, i) => PROJECTS[i] = sanitizeProject(p));

  safeRun('renderSkillsLogos',  renderSkillsLogos);
  safeRun('renderProjects',     renderProjects);
  safeRun('renderExperience',   renderExperience);
  safeRun('renderCoursework',   renderCoursework);
  safeRun('initFilters',        initFilters);
  safeRun('initRevealOnScroll', initRevealOnScroll);
  safeRun('initContactForm',  initContactForm);
  safeRun('initAstar',        initAstar);
  safeRun('initConnectFour',  initConnectFour);
  safeRun('initDemoTabs',     initDemoTabs);
  safeRun('initCmdK',       initCmdK);

  // footer year auto-updates each year
  const yearEl = document.querySelector('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const navbar = document.querySelector('.navbar');
  if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 6);
});

