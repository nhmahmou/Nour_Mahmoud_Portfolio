'use strict';

/* ===== Helpers ===== */
const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const metric = (label, value) => `<span class="metric"><i>${label}</i> ${value}</span>`;
const PLACEHOLDER = 'data:image/svg+xml;utf8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675"><rect width="100%" height="100%" fill="#0a1016"/><text x="50%" y="50%" fill="#263543" font-family="Segoe UI,Arial" font-size="44" text-anchor="middle" dominant-baseline="middle">image</text></svg>`);

/* safety + utils */
function safeImg(img){ img.onerror = () => { img.src = PLACEHOLDER; img.onerror = null; }; }
function validSrc(x){ return x && typeof x.src==='string' && x.src.trim().length>0; }
function sanitizeProject(p){ if (Array.isArray(p.media)) p.media = p.media.filter(validSrc); return p; }
function safeRun(name, fn){ try{ fn(); } catch(e){ console.error(`[render error] ${name}:`, e); } }

function ytid(url){
  if(!url) return null;
  const s = String(url);
  const m1 = s.match(/v=([A-Za-z0-9_-]{6,})/);
  const m2 = s.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
  const m3 = s.match(/embed\/([A-Za-z0-9_-]{6,})/);
  const id = (m1 && m1[1]) || (m2 && m2[1]) || (m3 && m3[1]) || null;
  return id ? id.replace(/[^A-Za-z0-9_-].*$/, '') : null;
}
function setBestYtThumb(imgEl, id){
  const bases = [`https://i.ytimg.com/vi/${id}`, `https://img.youtube.com/vi/${id}`];
  const names = ["maxresdefault.jpg","sddefault.jpg","hqdefault.jpg","mqdefault.jpg","default.jpg"];
  const q=[]; bases.forEach(b=>names.forEach(n=>q.push(`${b}/${n}`)));
  const next=()=>{ if(!q.length) return; imgEl.src=q.shift(); };
  imgEl.onload = ()=>{ if (imgEl.naturalWidth <= 200 || imgEl.naturalHeight <= 120) next(); };
  imgEl.onerror = next; next();
}

/* cover fallback */
function firstMediaImageSrc(project){ const m=(project.media||[]).find(x=>x.type==='img'&&x.src); return m?m.src:null; }
function setCoverWithFallback(imgEl, project) {
  const primary  = project.cover || firstMediaImageSrc(project) || '';
  const fallback = firstMediaImageSrc(project);

  imgEl.alt = `${project.title} cover`;
  imgEl.src = encodeURI(primary);

  // ✅ Retina support (if you provide a 2× asset)
  if (project.cover2x) {
    imgEl.srcset = `${encodeURI(primary)} 1x, ${encodeURI(project.cover2x)} 2x`;
    // rough size hint so the browser picks the right density
    imgEl.sizes  = '(max-width: 720px) 92vw, 420px';
  } else {
    imgEl.removeAttribute('srcset');
    imgEl.removeAttribute('sizes');
  }

  imgEl.onerror = () => {
    if (fallback && imgEl.src !== encodeURI(fallback)) imgEl.src = encodeURI(fallback);
    else imgEl.src = PLACEHOLDER;
    imgEl.onerror = null;
  };
}


/* ===== Skills (logos) ===== */
const SKILL_LOGOS = {
  'Languages & Markup': [
    { title:'C++',        src:'assets/logos/Cplusplus.png' },
    { title:'C',          src:'assets/logos/c.png' },
    { title:'Java',       src:'assets/logos/java.png' },
    { title:'Python',     src:'assets/logos/python.png' },
    { title:'JavaScript', src:'assets/logos/javascript.png' },
    { title:'HTML',       src:'assets/logos/html.png' },
    { title:'CSS',        src:'assets/logos/css.png' },
    { title:'SQL',        src:'assets/logos/sql.png' },
  ],
  'Frameworks & Engines': [
    { title:'SDL2',      src:'assets/logos/sdl2.png' },
    { title:'Godot',     src:'assets/logos/godot.png' },
    { title:'Unreal',    src:'assets/logos/unreal.png' },
    { title:'Spring',    src:'assets/logos/spring.png' },
    { title:'Hibernate', src:'assets/logos/hibernate.png' },
    { title:'REST',      src:'assets/logos/rest.png' },
    { title:'React',     src:'assets/logos/react.png' },
    { title:'Bootstrap', src:'assets/logos/bootstrap.png' },
    { title:'WebGL', src:'assets/logos/webgl.png' }
  ],
  'Systems, DevOps & Tools': [
    { title:'Linux',   src:'assets/logos/linux.png' },
    { title:'Git',     src:'assets/logos/git.png' },
    { title:'ZeroMQ',  src:'assets/logos/zeromq.png' },
    { title:'Maven',   src:'assets/logos/maven.png' },
    { title:'npm',     src:'assets/logos/npm.png' },
    { title:'Tomcat',  src:'assets/logos/tomcat.png' },
  ],
  'Design, Research & Viz': [
    { title:'Figma',       src:'assets/logos/figma.png' },
    { title:'Jupyter',     src:'assets/logos/jupyter.png' },
    { title:'Matplotlib',  src:'assets/logos/matplotlib.png' },
    { title:'Overleaf',    src:'assets/logos/overleaf.png' },
  ],
};

function renderSkillsLogos(){
  const wrap = $('#skillsLogoWrap'); if(!wrap) return; wrap.innerHTML='';
  Object.entries(SKILL_LOGOS).forEach(([group, items])=>{
    const sec = document.createElement('section');
    sec.className='skills-logo-group'; sec.dataset.animate='reveal';
    sec.innerHTML = `<h3>${group}</h3><ul class="logo-grid" role="list"></ul>`;
    const ul = sec.querySelector('.logo-grid');
    items.forEach(({title, src})=>{
      const li = document.createElement('li'); li.className='logo-card';
      li.innerHTML = `
        <div class="logo-img-wrap"><img alt="${title}" loading="lazy" /></div>
        <div class="logo-title">${title}</div>`;
      const img = $('img', li);
      img.onerror = () => {
        li.classList.add('logo-missing');
        li.querySelector('.logo-img-wrap').innerHTML = `<span class="logo-fallback">${title[0]}</span>`;
      };
      img.src = encodeURI(src);
      ul.appendChild(li);
    });
    wrap.appendChild(sec);
  });
}

/* ===== Projects ===== */
const PROJECTS = [
  {
  slug: 'unmasking',
  title: 'Unmasking Reality — Narrative-Driven 2D Game (Godot)',
  featured: true,
  cover: 'assets/Unmasking Reality/unmasking_reality.png',
  role: 'Lead Developer & Narrative Designer • Team of 3',
  tech: 'Godot 4.3 • GDScript • custom shaders • branching dialogue • physics/projectiles • UI systems',
  blurb:
    'A narrative-driven 2D experience about emotional repression and identity, built entirely in Godot 4.3. Features custom shader-based world color transitions, emotional dialogue trees, and multiple game modes. Designed, scripted, and developed over 100+ hours while leading and adapting within a small, mixed-skill team.',
  tags: ['Game Dev', 'Design', 'Systems'],
  metrics: [
    metric('Engine', 'Godot 4.3'),
    metric('Time', '100+ hrs'),
    metric('Team', '3 (lead developer)')
  ],
  links: [
    { label: 'Full Gameplay (YouTube)', href: 'https://youtu.be/TXDZXRTnTpQ?si=8XA5MGTNBeGaI66O' }
  ],
  case: {
    problem:
      'Design and implement a short but meaningful 2D game exploring emotional suppression through environmental storytelling and player choice — within a strict academic timeline and with a team of varying skill levels.',
    role:
      'Led all programming, shader development, and system design in Godot. Directed teammates on narrative and art contributions while integrating their work into a cohesive final product. Balanced creative direction, leadership, and technical implementation under tight deadlines.',
    tech: [
      'Godot 4.3 (GDScript)',
      'Custom GLSL-like shader pipelines for dynamic color transitions',
      'Dialogue system with branching choices and emotional state tracking',
      'Physics/projectile system with collision layers and damage logic',
      'UI/menu flow for multi-mode gameplay (Short / Medium / Long)'
    ],
    decisions: [
      'Developed a real-time shader system to gradually shift the world from monochrome to color, representing emotional awakening.',
      'Scripted branching emotional dialogue paths aligned with player choices (Anger, Hope, Sadness, Fear).',
      'Designed modular scene transitions and data-driven dialogue files for scalability and reuse.',
      'Implemented basic projectile physics and enemy interactions to complement narrative pacing.',
      'Created three difficulty/mode settings that alter dialogue density and playtime length (Short / Medium / Long).',
      'Adapted leadership style to a small multidisciplinary team, assigning tasks by individual strength and maintaining project momentum when others fell behind.'
    ],
    results: [
      'Delivered a fully playable 2D narrative experience with complete start-to-end progression.',
      'Demonstrated use of shaders for emotional storytelling and aesthetic transformation.',
      'Integrated dialogue logic, physics, and art assets into a unified engine flow.',
      'Gained deep understanding of the Godot pipeline, shader graphing, and system organization.',
      'Showcased resilience and adaptability by bridging leadership and technical roles effectively.'
    ],
    details: [
      'Explores emotional awareness through visual storytelling and player agency.',
      'Custom shaders written from scratch to handle layered post-processing color shifts.',
      'Led a mixed-skill team; served as the technical and creative backbone of the project.',
      'Inspired by psychological themes of repression, perception, and self-discovery.'
    ]
  },
  media: [
    { type: 'img', src: 'assets/Unmasking Reality/menu.png' },
    { type: 'clip', src: 'assets/Unmasking Reality/Unmasking Reality - Color Progress.mp4' },
    { type: 'clip', src: 'assets/Unmasking Reality/naviagtion_short.mp4' },
    { type: 'clip', src: 'assets/Unmasking Reality/dialogue_short.mp4' },
    { type: 'clip', src: 'assets/Unmasking Reality/book_short.mp4' },
    { type: 'img', src: 'assets/Unmasking Reality/book.png' },
    { type: 'img', src: 'assets/Unmasking Reality/combat.png' },
    { type: 'img', src: 'assets/Unmasking Reality/dialogue.png' },
    { type: 'img', src: 'assets/Unmasking Reality/end.png' },
    { type: 'img', src: 'assets/Unmasking Reality/grocery.png' },
    { type: 'img', src: 'assets/Unmasking Reality/school.png' },
    { type: 'img', src: 'assets/Unmasking Reality/splash.png' }
  ]
},
  {
    slug: 'engine',
    title: 'SDL2 Game Engine — Multiplayer Physics & Collision',
    blurb:
      'From scratch engine with component entities, tuned collision/physics, multithreaded update loop, and a ZeroMQ networking layer. Used to ship Bubble Shooter and Space Invaders.',
    featured: true,
    cover: 'assets/Engine/bubbleshooter.png',
    role: 'Developer & Team Leader',
    tech: 'SDL2 • ZeroMQ • C++ • Multithreading',
    tags: ['Game Dev', 'Software Dev'],
    metrics: [
      metric('Stack', 'C++/SDL2/ZeroMQ'),
      metric('Team', '3'),
      metric('Time', '4 months')
    ],
    links: [
      { label: 'Bubble Shooter Gameplay', href: 'https://youtu.be/qsilTsw9pNc' },
      { label: 'Space Invaders Gameplay', href: 'https://youtu.be/lLaX0yUeW2k' }
    ],
    case: {
      problem:
        'Prototype a small 2D engine to support quick gameplay iteration and a basic multiplayer experiment, without relying on existing engines.',
      role:
        'Led gameplay and systems programming; designed component entity model and collision pipeline; implemented ZeroMQ networking prototype and multithreaded update to keep input responsive.',
      tech: ['C++', 'SDL2', 'ZeroMQ (Router/Dealer)', 'Multithreading'],
      decisions: [
        'Component-style entities for fast feature iteration (gameplay code stays decoupled).',
        'Collision pipeline with sweep tests and resolution for floor/wall/platform/bounce.',
        'ZeroMQ Router/Dealer for ordered broadcast of client input; explicit disconnect handling.',
        'Threaded update loop to keep rendering/input responsive under load.'
      ],
      results: [
        'Engine used to ship two demos: Bubble Shooter and Space Invaders.',
        'Stable 60 FPS on mid-range hardware with multiple entities and collision.',
        'Networking prototype validated message ordering and disconnect flows.'
      ],
      details: [
        'Built in 4 months alongside classes; rapid ramp-up on ZeroMQ and networking.',
        'Team of 3; contributed leadership and coordination.'
      ]
    },
    media: [
      { type: 'img', src: 'assets/Engine/bubbleshooter.png' },
      { type: 'img', src: 'assets/Engine/space-invaders.png' }
    ]
  },
  {
  slug: 'first-platformer',
  title: 'First Platformer — Early Prototype (Godot)',
  blurb:
    'A short 2-minute Godot prototype built from a tutorial foundation and then extended with my own mechanics: refined jump feel, enemy patrols, hazards, and a clean reset loop. This is where I tuned platformer fundamentals before larger systems.',
  featured: false,
  cover: 'assets/Game/platformer.png',
  tags: ['Game Dev', 'Prototype'],
  metrics: [
    metric('Engine', 'Godot'),
    metric('Length', '~2 min'),
    metric('Focus', 'Core Mechanics'),
    metric('Built from', 'Tutorial + Extensions')
  ],
  links: [
    { label: 'Tutorial (YouTube)', href: 'https://www.youtube.com/watch?v=LOhfqjmasi0' }
  ],
  case: {
    summary:
      'Started from a YouTube tutorial (linked) to bootstrap core systems, then customized the movement, collisions, and game loop to learn the feel and structure of 2D platformers.',
    learning: [
      'Tilemap collisions, hazards (death zones), and checkpoint/reset.',
      'Basic enemy AI (patrol, player hit detection) with simple state handling.',
      'Scene/Node organization and signal-based UI/messages in Godot.'
    ],
    extensions: [
      'Coyote time and early-jump buffering experiments for smoother controls.',
      'Adjusted gravity/jump params, acceleration/deceleration, and friction.',
      'Implemented enemy patrol routes and contact damage with invulnerability window.',
      'Clean restart flow and minimal HUD prompts for quick iteration.'
    ],
    reflection:
      'Using a tutorial as a scaffold let me focus on feel and structure. These fundamentals informed my later work on Unmasking Reality and the C++/SDL2 engine.'
  },
  heroClip: 'assets/Game/platformer.mp4',
  media: [
    { type: 'clip', src: 'assets/Game/First Game.mp4' },
    { type: 'img',  src: 'assets/Game/platformer.png' },
    { type: 'yt',   url: 'https://www.youtube.com/watch?v=LOhfqjmasi0' }
  ]
}
,  {
  slug: 'ai-initiative',
  title: 'Applied AI Systems — Search, Optimization & Interaction',
  featured: true,
  cover: 'assets/AI/cover.png',
  role: 'Java Developer • Interactive AI Visualization & Systems Design',
  tech: 'Java • Swing • A* • Genetic Algorithm • Simulated Annealing • Client–Server • Dual-Map Planning',
  blurb:
    'A semester-long initiative exploring applied artificial intelligence through six projects — from interactive A* search visualizations and GUI-driven optimization to networked human-AI competition and dual-map planning games. Focused on making algorithms tangible through visualization, interactivity, and design.',
  tags: ['AI/Algorithms', 'Software Dev', 'Human–AI Interaction'],
  metrics: [
    metric('Lang', 'Java'),
    metric('Projects', '6'),
    metric('Focus', 'AI + UX')
  ],
  case: {
    problem:
      'How can classical AI algorithms be made interpretable, interactive, and engaging for both developers and learners?',
    role:
      'Designed, programmed, and iteratively expanded six Java-based AI systems, integrating algorithmic logic with usability principles. Focused on turning passive simulations into interactive experiences.',
    tech: [
      'Java Swing (GUIs, threading, timers)',
      'A* search & visualization',
      'Simulated Annealing & Genetic Algorithm',
      'Socket-based networking',
      'Dual-map human-AI interaction'
    ],
    decisions: [
      'Added a real-time control GUI to visualize a robot’s A* pathfinding, with node coloring and cost labels for debugging.',
      'Implemented Genetic Algorithm vs. Simulated Annealing comparison for task assignment, introducing an algorithm selector for live switching.',
      'Developed client–server Connect Four for real-time human vs. AI matches using Java Sockets.',
      'Built a dual-map planning simulation where human and AI agents race through mirrored environments, integrating countdowns, difficulty scaling, and winner display.',
      'Unified the applications under a consistent focus on explainability and interactivity: visuals, controls, and learning feedback.'
    ],
    results: [
      'Enhanced algorithm interpretability through visualization and interactive control panels.',
      'Improved user engagement and debugging capability across all simulations.',
      'Demonstrated full-stack AI system design from algorithm logic to GUI and networked interaction.',
    ],
    details: [
      'Each system was independently designed, implemented, and documented.',
      'Learned applied AI patterns  and event-driven programming across 6 iterations.',
      'Experience bridges algorithmic rigor with user-centric system design.'
    ]
  },
  media: [
    { type: 'img', src: 'assets/AI/ps01.png' },
    { type: 'img', src: 'assets/AI/ps01-1.png' },
    { type: 'img', src: 'assets/AI/ps02-1.png' },
    { type: 'img', src: 'assets/AI/ps04.png' },
    { type: 'img', src: 'assets/AI/ps04-1.png' },
    { type: 'img', src: 'assets/AI/ps05-1.png' },
    { type: 'img', src: 'assets/AI/ps06.png' }
  ]
},
  {
  slug: 'coffeemaker',
  title: 'CoffeeMaker — Full-Stack Java + React (Spring Boot REST)',
  featured: true,
  cover:  'assets/Full Stack/Homepage.png',
  tags: ['Software Dev', 'Full Stack', 'Team Project'],
  blurb:
    'Collaborative full-stack web app for managing recipes, ingredients, and inventory. Built with a Java Spring Boot REST backend, React frontend, and MySQL database, following agile sprint cycles and peer-review workflows.',
  metrics: [
    metric('Backend', 'Spring Boot + Hibernate'),
    metric('Frontend', 'React + JS'),
    metric('Database', 'MySQL'),
    metric('Team', '4-person agile')
  ],
  links: [
    { label: '(private — request access)', href: '#contact' }
  ],
  case: {
    problem:
      'Develop a production-style full-stack system to manage coffee recipes, ingredients, and inventory with a REST API, database persistence, and an interactive UI—mirroring professional development practices.',
    role:
      'Backend + integration developer on a 3-person team. Implemented core API endpoints, database entities, and React-frontend integration. Managed issues and PRs through GitHub, contributed to wikis, and collaborated in agile sprints using story points and weekly reviews.',
    tech: [
      'Java • Spring Boot (Web, JPA/Hibernate)',
      'React (JSX, Components, Axios)',
      'MySQL • RESTful APIs • JSON',
      'CI/CD (GitHub Actions) • Agile (sprints, story points)',
      'JUnit & Postman for testing and endpoint verification'
    ],
    decisions: [
      'Implemented layered architecture (Controller → Service → Repository) for clear separation of concerns.',
      'Used JPA annotations for entity relationships and validation (e.g., non-null and numeric constraints).',
      'Connected React frontend to REST endpoints using Axios for real-time inventory and recipe updates.',
      'Documented APIs and data flow in team wiki for consistent reference and onboarding.',
      'Followed professional workflow: issue tracking, pull requests with reviews, and weekly retrospectives.'
    ],
    results: [
      'Delivered a fully functional system supporting CRUD for recipes, ingredients, and inventory.',
      'Achieved stable integration between Spring Boot backend and React frontend.',
      'Developed teamwork, version control discipline, and agile communication skills.',
      'Learned the end-to-end lifecycle of professional software development.'
    ],
    details: [
      'Simulates a real-world production workflow with continuous integration and versioned deployment.',
      'Frontend built with React for modularity and responsive UI.',
      'Backend emphasizes maintainability and test coverage.',
      'Experience directly transferable to modern enterprise stacks.'
    ]
  },
  media: [
    { type:'img', src:'assets/Full Stack/Homepage.png' },
    { type:'img', src:'assets/Full Stack/Add Ingredient.png' },
    { type:'img', src:'assets/Full Stack/Add Recipe.png' },
    { type:'img', src:'assets/Full Stack/Edit Recipe.png' },
    { type:'img', src:'assets/Full Stack/Update Inventory.png' }
  ]
}

,
  {
  slug: 'rofial',
  title: 'Rofial Beauty — Live Shopify E-Commerce Website',
  blurb:
    'Full Shopify build and long-term operations for a boutique fashion brand. Customized theme from scratch, implemented SEO, automated email flows, managed inventory, and improved visibility across Google and social platforms.',
  featured: false,
  cover: 'assets/rofial.png',
  role:'Web Developer',
  tech: 'Shopify • CSS • Google Ads • Mailchimp • Canva',
  tags: ['Software Dev', 'HCI/UX', 'E-Commerce'],
  metrics: [
    metric('Platform', 'Shopify'),
    metric('Active', '2020 – Present'),
    metric('Growth', '↑ visibility + engagement')
  ],
  links: [
    { label: 'Visit Live Site', href: 'https://rofialbeauty.com' }
  ],
  case: {
    problem:
      'Rofial Beauty needed a modern online storefront to showcase high-end designer dresses, manage stock, and connect online discovery with in-store visits. The goal was to improve visibility and streamline operations while maintaining a consistent brand aesthetic.',
    role:
      'Developed and maintained the entire Shopify site from the ground up, customizing theme Liquid templates and CSS, setting up product collections, automated emails, and analytics. Coordinated directly with store owners and designers to align the digital experience with real-world inventory and events.',
    tech: [
      'Shopify (Liquid, theme customization)',
      'Google Analytics & Google Merchant Center',
      'SEO optimization + Google Ads campaigns',
      'Mailchimp automation & tagging flows',
      'Canva for product visuals and marketing assets'
    ],
    decisions: [
      'Customized a Shopify theme to match brand aesthetics and improved navigation/UI for mobile users.',
      'Implemented full inventory management with dynamic collections and accurate variant tracking.',
      'Integrated Google Analytics, Merchant Center, and Ads for better performance tracking and outreach.',
      'Created automated Mailchimp campaigns to re-engage customers and promote new arrivals.',
      'Refined UX across multiple iterations based on owner and customer feedback.'
    ],
    results: [
      'Increased local and online visibility; customers began visiting the website before in-store visits.',
      'Improved product discovery and contact inquiries through SEO and clearer layout.',
      'Streamlined operations for owners — automated inventory updates and email notifications.',
      'Established a sustainable digital presence that continues to operate today.'
    ],
    details: [
      'Site live and maintained on request; continuously updated with new product lines.',
      'Collaborated with designers and owners to ensure accurate branding and catalog updates.',
      'Experience reinforced skills in front-end customization, UX iteration, and real-world e-commerce operations.'
    ]
  },
  media: [
    { type: 'img', src: 'assets/rofial beauty/homepage.png' },
    { type: 'img', src: 'assets/rofial beauty/product.png' },
    { type: 'img', src: 'assets/rofial beauty/collection.png' },
    { type: 'img', src: 'assets/rofial beauty/checkout.png' }
  ]
},
  {
  slug: 'civiceye',
  title: 'CivicEye — UX Research & Figma Wireframes',
  blurb:
    'Designed and tested a civic engagement platform from low-fi wireframes to high-fi prototypes in Figma. Focused on simplifying event discovery and safety reporting through iterative user feedback and usability testing.',
  featured: false,
  cover: 'assets/civiceye.png',
  tags: ['HCI/UX', 'Research', 'Prototyping'],
  metrics: [
    metric('Tool', 'Figma'),
    metric('Method', 'User Study'),
    metric('Focus', 'Usability & Accessibility')
  ],
  case: {
    problem:
      'CivicEye aimed to help users discover local events, report safety issues, and stay connected to their community. The challenge was balancing rich functionality with a simple, intuitive interface that wouldn’t overwhelm users.',
    role:
      'Led interaction design and usability testing. Built lo-fi wireframes, transitioned to high-fi prototypes in Figma, and participated in structured user studies to evaluate flow efficiency and visual hierarchy.',
    tech: [
      'Figma (Wireframing + Prototyping)',
      'Qualitative user testing',
      'Iterative redesigns based on usability metrics',
      'Accessibility and visual hierarchy tuning'
    ],
    decisions: [
      'Started with broad brainstorming to map core tasks like event discovery and safety updates, then narrowed focus to essential flows.',
      'Conducted usability tests where participants completed defined tasks; recorded issues in navigation clarity and visual overload.',
      'Redesigned layouts to separate dense screens, prioritize key actions, and improve visual grouping.',
      'Refined color contrast, alignment, and spacing to enhance accessibility and readability.',
      'Integrated user feedback in multiple rounds of redesign to strengthen overall clarity and task flow.'
    ],
    results: [
      'Reduced cognitive load by simplifying complex screens and separating decision points.',
      'Improved navigation clarity and visual hierarchy across all tested flows.',
      'Gained practical experience in usability study design — planning, execution, and analysis.',
      'Developed a strong foundation in user-centered design and iterative feedback loops.'
    ],
    details: [
      'Learned that good design is not just aesthetic — it’s about predictable behavior and tested understanding.',
      'Grew confidence using Figma for complex, multi-screen prototypes with linked interactions.',
      'Refined communication and analytical skills while interpreting user data and translating it into design improvements.'
    ]
  },
  media: [
    { type: 'clip', src: 'assets/HCI-Figma/CivicEye-demo.mp4' },
    { type: 'img',  src: 'assets/HCI-Figma/homepage.png' },
    { type: 'img',  src: 'assets/HCI-Figma/event-flow.png' },
    { type: 'img',  src: 'assets/HCI-Figma/report-flow.png' }
  ]
},
  {
  slug: 'puzzlescript',
  title: 'PuzzleScript — 4-Level Puzzle Design Series',
  blurb:
    'A four-level puzzle series exploring progressive mechanic teaching, player readability, and iteration in PuzzleScript. Each level was tested, refined, and designed to communicate rules through play alone.',
  featured: false,
  cover: 'assets/PuzzleScript/cover.png',
  tags: ['Game Dev', 'Design', 'Systems Thinking'],
  metrics: [
    metric('Engine', 'PuzzleScript'),
    metric('Levels', '4'),
    metric('Focus', 'Mechanics & Readability')
  ],
  links: [
    { label: 'Watch Level 5', href: 'https://youtu.be/kVCxY8kH0YQ?si=1hPc6EA3H4kbxQPg' },
    { label: 'Watch Level 4', href: 'https://youtu.be/BTsr58-offg?si=bHZTsqWoc4aZiT2b' },
    { label: 'Watch Level 3', href: 'https://youtu.be/_x87yj5ztG8?si=myGqYlJaYArZI9oO' }
  ],
  case: {
    problem:
      'Design a cohesive set of Sokoban-style puzzles where each level introduces and reinforces mechanics through discovery, not text, emphasizing clarity and fair challenge.',
    role:
      'Handled end-to-end design: puzzle concepting, iteration, balancing, and player feedback. Focused on delivering readable, concise puzzles that reward observation and pattern recognition.',
    tech: [
      'PuzzleScript (logic-based ruleset + level scripting)',
      'Iterative playtesting and player feedback',
      'Constraint-based puzzle composition and difficulty tuning'
    ],
    decisions: [
      'Introduced one new mechanic per level to ensure clear learning progression.',
      'Applied symmetry and minimalism for intuitive understanding of spatial relationships.',
      'Iterated on feedback to remove unintended solutions and streamline movement flow.',
      'Used visual framing to guide player attention without explicit cues.'
    ],
    results: [
      'Delivered four levels demonstrating clean progression from introduction to mastery.',
      'Refined player flow to reduce frustration and emphasize discovery.',
      'Strengthened puzzle readability and “aha” satisfaction moments through iteration.'
    ],
    details: [
      'Explored puzzle literacy—teaching mechanics through player interaction alone.',
      'Practiced iterative design and rapid playtesting under tight scope.',
      'Learned how visual and logical clarity intersect in systems design.'
    ]
  },
  media: [
    { type: 'img', src: 'assets/PuzzleScript/Level 1.png' },
    { type: 'img', src: 'assets/PuzzleScript/Level 2.png' },
    { type: 'img', src: 'assets/PuzzleScript/Level 3.png' },
    { type: 'img', src: 'assets/PuzzleScript/Level 4.png' }
  ]
}

,
  {
  slug: 'twine',
  title: 'Twine — Echoes of the Self & (HG) Recreation',
  blurb:
    'Two interactive fiction pieces prototyped in Twine: an original branching narrative (Echoes of the Self) and a rapid reconstruction of a Hunger Games scene to practice pacing, choice impact, and state tracking.',
  featured: false,
  cover: 'assets/Twine/cover.png',
  tags: ['Game Dev', 'Narrative Design', 'Prototyping'],
  metrics: [
    metric('Engine', 'Twine'),
    metric('Focus', 'Branching & State'),
    metric('Deliverables', '2 stories')
  ],
  case: {
    problem:
      'Explore how branching narrative, player agency, and stateful choices can convey character and theme without heavy mechanics or visuals.',
    role:
      'Designed and authored all passages, choice structures, and state logic. Focused on pacing, clarity, and conveying tone through micro-choices.',
    tech: [
      'Twine',
      'Variables for state, flags, and conditional reveals',
      'Reusable passage structures for consistent pacing'
    ],
    decisions: [
      'Structured choices around emotional intent (curiosity, defiance, empathy) to shape tone, not just plot direction.',
      'Used state variables to unlock/alter passages, reflecting prior choices and reinforcing narrative consequences.',
      'Iterated passage length and link density to keep reading flow high while preserving meaningful decisions.',
      'Prototyped a Hunger Games scene to benchmark pacing and learn how to translate cinematic beats into interactive text.'
    ],
    results: [
      'Delivered two readable, replayable pieces with clear tone shifts based on player intent.',
      'Improved feel of agency via subtle state-based reveals and callbacks.',
      'Built portable narrative scaffolds that can be reused for future projects.'
    ],
    details: [
      'Practiced narrative economy, short passages, deliberate choices, strong cadence.',
      'Strengthened skills in state management, conditional text, and pacing.',
      'Foundation for future hybrid narrative + mechanics projects.'
    ]
  },
  media: [
    { type: 'img', src: 'assets/Twine/cover.png' },
    { type: 'img', src: 'assets/Twine/thg-2.png' },
    { type: 'img', src: 'assets/Twine/thg-cover.png' }
  ]
}
,
  {
  slug: 'hci-research',
  title: 'HCI Research — Social Metacognition in Collaborative Debugging',
  blurb:
    'Studied how pairs of students coordinate while debugging code. Built Python pipelines to generate Δ-heatmaps and event-locked plots that reveal when metacognitive prompts improve collaboration and problem-solving.',
  featured: false,
  cover: 'assets/research.png',
  tags: ['HCI/UX', 'Research', 'Software Dev', 'Data Analysis'],
  metrics: [
    metric('Annotated', '2,700 turns'),
    metric('Methods', 'Δ-heatmaps, event-locked'),
    metric('Stack', 'Python/Jupyter/Matplotlib')
  ],
  case: {
    problem:
      'How do pairs of novice programmers communicate, coordinate, and self-monitor while debugging—and which conversational moves correlate with successful progress?',
    role:
      'Led data wrangling and analysis. Built reproducible Python notebooks to align timeline events (errors, tests, code edits) with dialogue, and visualize behavioral changes around key moments.',
    tech: [
      'Python (pandas, numpy)',
      'Jupyter notebooks & Matplotlib',
      'Custom Δ-heatmap generator',
      'Event alignment: code edits, test outcomes, pauses'
    ],
    decisions: [
      'Aligned dialogue turns to concrete debugging events (e.g., first failure, successful test) to enable event-locked comparisons.',
      'Computed pre/post windows to produce Δ-heatmaps that highlight shifts in participation, question-asking, and strategy talk.',
      'Created reusable plotting utilities for cohort-level and pair-level analysis, enabling quick hypothesis iteration.',
      'Standardized annotation schema and validated agreement to ensure reliable labels for metacognitive behaviors.'
    ],
    results: [
      'Surfaced patterns where explicit planning/monitoring talk often precedes successful fixes within short windows after failures.',
      'Identified coordination breakdowns (e.g., prolonged monologues, low question density) that correlate with stalls.',
      'Delivered figures and summaries that informed study debriefs and instructor recommendations.'
    ],
    details: [
      '2,700+ dialogue turns annotated with strong inter-rater agreement.',
      'Pipelines emphasize reproducibility and parameterized windows for sensitivity checks.',
      'Experience at the intersection of HCI, learning sciences, and software engineering education.'
    ]
  },
  media: [
    { type: 'img', src: 'assets/research/graphex.png' }
  ]
}
,
  { slug:'video-editing', title:'Video Editing — reel & clips',
    blurb:'Cuts showing pacing, transitions, timing.',
    featured:false, cover:'assets/Video Editing/cover.png', tags:['Video'],
    media:[{type:'clip', src:'assets/Video Editing/MEA 100 - Video 2 Finished-1.mp4'}]
  }
];

/* ===== Featured picker (EASY MODE) =====
   Choose which projects appear in the Featured section (and order) by slug.
   Just edit the array below. Slugs must match entries in PROJECTS above.
*/
const FEATURED_SLUGS = ['engine', 'rofial', 'ai-initiative']; // ← edit this list to control Featured

// Build FEATURED list from PROJECTS using the slugs above.
const FEATURED = FEATURED_SLUGS
  .map(slug => PROJECTS.find(p => p.slug === slug))
  .filter(Boolean);

/* ===== Renderers ===== */
function renderFeatured(){
  const grid=$('#featuredGrid'), tpl=$('#featTpl'); if(!grid||!tpl) return;
  grid.innerHTML='';
  FEATURED.forEach(p=>{
    const node=tpl.content.firstElementChild.cloneNode(true);
    node.dataset.slug=p.slug;
    const featImg=$('.feat-img',node); setCoverWithFallback(featImg,p);
    $('.feat-title',node).textContent=p.title;
    $('.feat-blurb',node).textContent=p.blurb;
    $('.feat-role',node).textContent=p.role||'';
    $('.feat-tech',node).textContent=p.tech||'';
    $('.metrics',node).innerHTML=(p.metrics||[]).join('');
    $('.view-details',node).addEventListener('click',e=>{e.stopPropagation();openModal(p.slug);});
    const watchBtn=$('.watch-btn',node);
    if((p.watch||[]).length){watchBtn.href=p.watch[0];watchBtn.target='_blank';watchBtn.rel='noopener';}
    else watchBtn.style.display='none';
    node.addEventListener('click',()=>openModal(p.slug));
    grid.appendChild(node);
  });
}

function renderProjects(){
  const grid=$('#projectGrid'), tpl=$('#cardTpl'); if(!grid||!tpl) return;
  grid.innerHTML='';
  PROJECTS.forEach(p=>{
    const node=tpl.content.firstElementChild.cloneNode(true);
    node.dataset.slug=p.slug; node.dataset.tags=(p.tags||[]).join(',');
    const img=$('.thumb',node); setCoverWithFallback(img,p);
    $('.card-title',node).textContent=p.title;
    $('.card-blurb',node).textContent=p.blurb;
    $('.badge',node).style.display=p.featured?'inline-flex':'none';
    $('.metrics',node).innerHTML=(p.metrics||[]).join('');
    const tagWrap=$('.tags',node); (p.tags||[]).forEach(t=>{const s=document.createElement('span');s.className='kbd';s.textContent=t;tagWrap.appendChild(s);});
    const linksWrap=$('.links',node); (p.links||[]).forEach(l=>{const a=document.createElement('a');a.className='btn btn-sm';a.href=l.href;a.target='_blank';a.rel='noopener';a.textContent=l.label;a.addEventListener('click',e=>e.stopPropagation(),{capture:true});linksWrap.appendChild(a);});
    $('.view-details',node).addEventListener('click',e=>{e.stopPropagation();openModal(p.slug);});
    node.addEventListener('click',()=>openModal(p.slug));
    node.addEventListener('keydown',e=>{if(e.key==='Enter')openModal(p.slug);});
    grid.appendChild(node);
  });
}

/* Experience */
function renderExperience(){
  const wrap = $('#timeline'); if(!wrap) return; wrap.innerHTML='';

  const EXPERIENCE = [
    {
      when: 'May 2025 – Present',
      title: 'Research Assistant (NSF REU, HCI)',
      place: 'Raleigh, NC',
      org: 'NC State University',
      bullets: [
        'Annotated 2,700 dialogue turns across 10 student teams; achieved strong inter-rater agreement (Jaccard > .80).',
        'Used Python/Jupyter to analyze data for patterns in team interactions and in metacognition/social-metacognition usage both at aggregate scale and in event-locked windows (±90 seconds); created clear visuals to surface trends.',
        'Surfaced patterns where planning/monitoring talk often preceded successful fixes; informed study debriefs and instructor recommendations.',
        'Volunteered at a VL/HCC research event: supported on-site registration and check-in for attending researchers & professionals.',
        'Co-authored a research paper based on these findings, submitted to ACM CHI 2026 for publication in the Human-Computer Interaction track.'
      ],
      tags: ['Research','Python','HCI','Data Viz','Events']
    },
    {
      when: 'Aug 2024 – Present',
      title: 'Computer Science Ambassador (Volunteer)',
      place: 'Raleigh, NC',
      org: 'NC State University',
      bullets: [
        'Represented the CSC department in outreach, campus tours, and events; explained what we learn at NCSU and what differentiates our program (hands-on projects, labs, and community).',
        'Highlighted signature coursework/projects and student opportunities to prospective students & families.',
        'Coordinated with faculty/staff and peer ambassador teams to plan and execute events smoothly.'
      ],
      tags: ['Outreach','Communication','Leadership','Events']
    },
    {
      when: 'Aug 2024 – Present',
      title: 'Teacher Assistant Senate Member',
      place: 'Raleigh, NC',
      org: 'NC State University',
      bullets: [
        'Led 5+ GitHub workshops to strengthen course-wide version control fluency (branching, PRs, code reviews).',
        'Researched UTA impact; proposed course-level improvements informed by student/TA feedback.',
        'Conduct ongoing lab observations using a standardized form to evaluate TA practices and student support.',
        'Participate in behavioral interviews to help select and place new TAs.'
      ],
      tags: ['Teaching','Leadership','Git','Program Improvement','Hiring']
    },
    {
      when: 'Aug 2023 – Present',
      title: 'Undergraduate TA — Java & Data Structures',
      place: 'Raleigh, NC',
      org: 'NC State University',
      bullets: [
        'Mentored 400+ students across Intro Java and DSA; guided recursion, sorting, and DS implementations.',
        'Explain complex topics in multiple ways (visuals, analogies, step-throughs) and in non-technical terms when needed.',
        'Help students debug complex programs by instrumenting code, designing tests, and isolating defects methodically.',
        'Delivered rubric-based feedback at scale while promoting inclusive, collaborative learning norms.'
      ],
      tags: ['Teaching','Java','Algorithms','Mentoring','Debugging']
    },
    {
      when: '2020 – Present',
      title: 'Operator — Rofial Beauty (Shopify)',
      place: 'Remote',
      org: 'Rofial Beauty',
      bullets: [
        'Built and customized a Shopify theme from scratch (Liquid/CSS); iterated UX with owners over multiple releases.',
        'Implemented SEO + Google Merchant Center; ran Google Ads; automated email flows with Mailchimp.',
        'Managed inventory/collections for designer products; produced product visuals in Canva.',
        'Improved local visibility and inbound inquiries; continue maintenance/updates on request.'
      ],
      tags: ['Shopify','E-commerce','SEO','Analytics','UX']
    }
  ];

  EXPERIENCE.forEach(e=>{
    const item = document.createElement('div'); item.className='item';
    item.innerHTML = `
      <div class="muted time">${e.when}</div>
      <div>
        <h4>${e.title}</h4>
        <div class="place">${e.org} • ${e.place}</div>
        <ul>${(e.bullets||[]).map(b=>`<li>${b}</li>`).join('')}</ul>
        <div class="tags" style="margin-top:6px">${(e.tags||[]).map(t=>`<span class="kbd">${t}</span>`).join('')}</div>
      </div>`;
    wrap.appendChild(item);
  });
}




/* Coursework */
function renderCoursework(){
  const grid = $('#courseworkGrid'); if(!grid) return; grid.innerHTML='';
  const COURSEWORK = [
    { name:'Operating Systems', details:'C, threads, semaphores/monitors, sockets/TCP, CODA, assembly' },
    { name:'Software Engineering', details:'Java, Spring Boot, REST, Hibernate, SQL/MySQL, CI/CD, PR reviews, issues/wiki' },
    { name:'Data Structures & Algorithms', details:'Java, complexity, trees/graphs, hashing, maps, runtime complexity' },
    { name:'Networks', details:'Sockets, client/server, TCP/UDP basics' },
    { name:'HCI / UX', details:'Research methods, prototyping, usability, Figma flows' },
    { name:'Game Dev', details:'SDL2, collision, feel tuning; engine patterns' },
    { name:'Computer Graphics', details:'Rendering pipeline; transforms/camera; rasterization; textures/sampling; lighting/shading' }
  ];
  COURSEWORK.forEach(c=>{
    const card = document.createElement('div'); card.className='skill';
    card.innerHTML = `<div class="skill-top"><b>${c.name}</b></div><div class="muted">${c.details}</div>`;
    grid.appendChild(card);
  });
}

/* Filters */
function initFilters(){
  const chips=$$('.chip[data-filter]'); if(!chips.length) return;
  const set=tag=>{
    const t=(tag||'all').toLowerCase();
    chips.forEach(c=>c.setAttribute('aria-pressed',(c.dataset.filter.toLowerCase()===t).toString()));
    chips.forEach(c=>c.classList.toggle('active',c.dataset.filter.toLowerCase()===t));
    $$('#projectGrid .card').forEach(card=>{
      const tags=(card.dataset.tags||'').toLowerCase();
      const show=t==='all'||tags.split(',').map(s=>s.trim()).includes(t);
      card.style.display=show?'':'none';
    });
  };
  chips.forEach(ch=>ch.addEventListener('click',()=>set(ch.dataset.filter)));
  set('all');
}

/* Reveal on scroll + nav shadow */
function initRevealOnScroll(){
  const els=document.querySelectorAll('[data-animate="reveal"]');
  const io=new IntersectionObserver((ents)=>{ents.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target);}})},{threshold:.12});
  els.forEach(el=>io.observe(el));
  window.addEventListener('scroll',()=>{const n=document.querySelector('.navbar');if(!n)return;n.classList.toggle('scrolled',window.scrollY>6);},{passive:true});
}

/* Modal */
(function initModal(){
  const modal=$('#projectModal'); if(!modal) return;
  const titleEl=$('#modalTitle'), blurbEl=$('#modalBlurb'), metricsEl=$('#modalMetrics');
  const stage=$('#mediaStage'), sections=$('#caseSections'), linksEl=$('#modalLinks');
  const prevBtn=$('.prev',modal), nextBtn=$('.next',modal);
  let media=[], idx=0;

  function renderMedia(){
    stage.innerHTML='';
    if(!media.length){ stage.innerHTML='<div class="muted">No media</div>'; return; }
    const m=media[idx];
    if(m.type==='clip' && m.src){
      const v=document.createElement('video');
      v.setAttribute('muted',''); v.setAttribute('playsinline',''); v.setAttribute('loop',''); v.setAttribute('autoplay','');
      v.muted=true; v.playsInline=true; v.loop=true; v.autoplay=true; v.controls=false;
      v.style.height='100%'; v.style.width='auto'; v.style.objectFit='contain';
      const s=document.createElement('source'); s.src=encodeURI(m.src); s.type='video/mp4'; v.appendChild(s);
      const nudge=()=>{ try{ v.play(); }catch{} };
      v.addEventListener('loadeddata',nudge,{once:true}); v.addEventListener('canplay',nudge,{once:true});
      stage.appendChild(v); queueMicrotask(()=>{ try{ v.load(); v.play(); }catch{} });
    } else if(m.type==='img' && m.src){
      const img=document.createElement('img'); img.alt=''; img.src=encodeURI(m.src); safeImg(img); stage.appendChild(img);
    } else if(m.type==='yt' && (m.id||m.url)){
      const id=m.id||ytid(m.url);
      const hero=document.createElement('div'); hero.className='yt-hero';
      const thumb=document.createElement('img'); thumb.alt='YouTube thumbnail'; setBestYtThumb(thumb,id);
      const play=document.createElement('a'); play.href=`https://youtu.be/${id}`; play.target='_blank'; play.rel='noopener'; play.className='yt-play'; play.textContent='▶';
      hero.appendChild(thumb); hero.appendChild(play); stage.appendChild(hero);
    } else stage.innerHTML='<div class="muted">Unsupported media</div>';
  }

function setCase(p){
  // Header bits
  titleEl.textContent = p.title || '';
  blurbEl.textContent = p.blurb || '';
  metricsEl.innerHTML = (p.metrics || []).join('');

  // Clear sections
  sections.innerHTML = '';
  const c = p.case || {};

  // 1) Compact / learning-oriented projects (e.g., first-platformer)
  if (c.summary) {
    sections.insertAdjacentHTML(
      'beforeend',
      `<section><h4>Overview</h4><p>${c.summary}</p></section>`
    );
  }
  if (Array.isArray(c.learning) && c.learning.length) {
    sections.insertAdjacentHTML(
      'beforeend',
      `<section><h4>What I Learned</h4><ul>${c.learning.map(x=>`<li>${x}</li>`).join('')}</ul></section>`
    );
  }
  if (c.reflection) {
    sections.insertAdjacentHTML(
      'beforeend',
      `<section><h4>Reflection</h4><p>${c.reflection}</p></section>`
    );
  }

  // 2) Full case-study layout (for Engine / Unmasking / AI initiative)
  if (c.problem) {
    sections.insertAdjacentHTML(
      'beforeend',
      `<section><h4>Problem</h4><p>${c.problem}</p></section>`
    );
  }

  if (c.role || c.tech) {
    sections.insertAdjacentHTML(
      'beforeend',
      `<section><h4>Role & Tech</h4>
         <ul>
           ${c.role ? `<li>${c.role}</li>` : ''}
           ${c.tech ? `<li>${(Array.isArray(c.tech) ? c.tech.join(', ') : c.tech)}</li>` : ''}
         </ul>
       </section>`
    );
  }

  if (Array.isArray(c.decisions) && c.decisions.length) {
    sections.insertAdjacentHTML(
      'beforeend',
      `<section><h4>Key Decisions</h4><ul>${c.decisions.map(d=>`<li>${d}</li>`).join('')}</ul></section>`
    );
  }

  if (Array.isArray(c.results) && c.results.length) {
    sections.insertAdjacentHTML(
      'beforeend',
      `<section><h4>Results</h4><ul>${c.results.map(r=>`<li>${r}</li>`).join('')}</ul></section>`
    );
  }

  if (Array.isArray(c.details) && c.details.length) {
    sections.insertAdjacentHTML(
      'beforeend',
      `<section><h4>Highlights</h4><ul>${c.details.map(r=>`<li>${r}</li>`).join('')}</ul></section>`
    );
  }

  // Fallback: if nothing rendered, show a friendly placeholder
  if (!sections.children.length) {
    sections.insertAdjacentHTML(
      'beforeend',
      `<section><h4>Details</h4><p class="muted">More info coming soon.</p></section>`
    );
  }

  // Links (PDFs, videos, etc.)
  linksEl.innerHTML = '';
  (p.links || []).forEach(l=>{
    linksEl.insertAdjacentHTML(
      'beforeend',
      `<a class="btn btn-sm" href="${l.href}" target="_blank" rel="noopener">${l.label}</a>`
    );
  });

  // Media
  media = (p.media || []);
  idx = 0;
  renderMedia();
}


  function show(){ modal.hidden=false; }
  function hide(){ modal.hidden=true; stage.querySelectorAll('video').forEach(v=>{ try{ v.pause(); }catch{} }); stage.innerHTML=''; }
  $('.modal-close',modal).addEventListener('click',hide);
  $('.modal-backdrop',modal).addEventListener('click',hide);
  window.addEventListener('keydown',e=>{ if(!modal.hidden && e.key==='Escape') hide(); });
  prevBtn.addEventListener('click',()=>{ if(!media.length) return; idx=(idx-1+media.length)%media.length; renderMedia(); });
  nextBtn.addEventListener('click',()=>{ if(!media.length) return; idx=(idx+1)%media.length; renderMedia(); });

  window.openModal = slug => {
    const p = PROJECTS.find(x=>x.slug===slug) || FEATURED.find(x=>x.slug===slug);
    if(p){ setCase(p); show(); }
  };
})();

/* ===== Boot (hardened) ===== */
document.addEventListener('DOMContentLoaded', ()=>{
  for (let i=0;i<PROJECTS.length;i++) PROJECTS[i] = sanitizeProject(PROJECTS[i]);

  safeRun('renderSkillsLogos', renderSkillsLogos);
  safeRun('renderFeatured',     renderFeatured);
  safeRun('renderProjects',     renderProjects);
  safeRun('renderExperience',   renderExperience);
  safeRun('renderCoursework',   renderCoursework);
  safeRun('initFilters',        initFilters);
  safeRun('initRevealOnScroll', initRevealOnScroll);

  const y = document.querySelector('#year'); if (y) y.textContent = new Date().getFullYear();
  const n = document.querySelector('.navbar'); if (n) n.classList.toggle('scrolled', window.scrollY > 6);
});



/* ===== Request Access: prefill + focus contact form ===== */
(function(){
  function getContactForm(){ return document.querySelector('#contactForm') || document.querySelector('form[name="contact"]'); }
  function smoothToContact(){
    const el = document.querySelector('#contact');
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function prefillContact({ intent, project }={}){
    const form = getContactForm(); if (!form) return;
    const textarea = form.querySelector('textarea[name="message"]');
    const email = form.querySelector('input[name="email"]');
    const name = form.querySelector('input[name="name"]');
    const template =
`Hi Nour,

I'd like to request temporary, private access to review code and a walkthrough.
Project: ${project || '(please specify)'}
My organization / role: 
Reason for access: 
Preferred time for a quick call (optional): 

Thanks!`;
    if (textarea && intent === 'access') textarea.value = template;
    if (name && !name.value) name.focus(); else if (email && !email.value) email.focus(); else if (textarea) textarea.focus();
  }

  // Button click
  document.addEventListener('click', (e)=>{
    const a = e.target.closest('#reqAccessBtn,[data-intent="access"]');
    if (!a) return;
    e.preventDefault();
    // Try to infer project from data attribute if present
    const project = a.getAttribute('data-project') || '';
    prefillContact({ intent: 'access', project });
    smoothToContact();
  });

  // URL query support: ?intent=access&project=engine
  document.addEventListener('DOMContentLoaded', ()=>{
    const q = new URLSearchParams(location.search);
    const intent = q.get('intent');
    const project = q.get('project');
    if (intent === 'access') {
      prefillContact({ intent, project });
      // If user followed a link from elsewhere, ensure we scroll to the form
      smoothToContact();
    }
  });
})();
