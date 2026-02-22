// strict mode so we don't accidentally use globals / typos etc
'use strict';

// --- helpers: grab one element or all matching
const queryOne = (selector, root = document) => {
  return root.querySelector(selector);
};
const queryAll = (selector, root = document) => {
  return Array.from(root.querySelectorAll(selector));
};
// wraps label + value in the metric span markup
const metric = (label, value) => {
  return `<span class="metric"><i>${label}</i> ${value}</span>`;
};
const PLACEHOLDER = 'data:image/svg+xml;utf8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675"><rect width="100%" height="100%" fill="#0a1016"/><text x="50%" y="50%" fill="#263543" font-family="Segoe UI,Arial" font-size="44" text-anchor="middle" dominant-baseline="middle">image</text></svg>`);

// if image fails to load, swap in placeholder so we don't get broken icons
function safeImg(imageElement) {
  imageElement.onerror = () => {
    imageElement.src = PLACEHOLDER;
    imageElement.onerror = null;
  };
}
// media item has a real src string
function validSrc(mediaItem) {
  return mediaItem &&
    typeof mediaItem.src === 'string' &&
    mediaItem.src.trim().length > 0;
}
// strip out any bad media entries from a project
function sanitizeProject(project) {
  if (Array.isArray(project.media)) {
    project.media = project.media.filter(validSrc);
  }
  return project;
}
// run a callback, log if it throws (so one broken section doesn't kill the whole page)
function safeRun(componentName, callback) {
  try {
    callback();
  } catch (error) {
    console.error(`[render error] ${componentName}:`, error);
  }
}

// pull youtube video id from url (handles watch, youtu.be, embed)
function extractYoutubeId(url) {
  if (!url)
    return null;
  const urlString = String(url);
  const matchWithV = urlString.match(/v=([A-Za-z0-9_-]{6,})/);
  const matchShortUrl = urlString.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
  const matchEmbed = urlString.match(/embed\/([A-Za-z0-9_-]{6,})/);
  const videoId = (matchWithV && matchWithV[1]) || (matchShortUrl && matchShortUrl[1]) || (matchEmbed && matchEmbed[1]) || null;
  return videoId ? videoId.replace(/[^A-Za-z0-9_-].*$/, '') : null;
}
// try best thumbnail first (maxres, sd, hq...) and fall back to next if too small
function setBestYoutubeThumbnail(imageElement, videoId) {
  const baseUrls = [`https://i.ytimg.com/vi/${videoId}`, `https://img.youtube.com/vi/${videoId}`];
  const thumbnailNames = ["maxresdefault.jpg", "sddefault.jpg", "hqdefault.jpg", "mqdefault.jpg", "default.jpg"];
  const urlQueue = [];
  baseUrls.forEach(baseUrl => {
    thumbnailNames.forEach(name => urlQueue.push(`${baseUrl}/${name}`));
  });
  const tryNextUrl = () => {
    if (!urlQueue.length) return;
    imageElement.src = urlQueue.shift();
  };
  imageElement.onload = () => {
    if (imageElement.naturalWidth <= 200 || imageElement.naturalHeight <= 120) {
      tryNextUrl();
    }
  };
  imageElement.onerror = tryNextUrl;
  tryNextUrl();
}

// first image in project.media, or null
function firstMediaImageSrc(project) {
  const mediaItem = (project.media || []).find(item => item.type === 'img' && item.src);
  return mediaItem ? mediaItem.src : null;
}
// first video clip in project.media, or null
function firstMediaVideoSrc(project) {
  const mediaItem = (project.media || []).find(item => item.type === 'clip' && item.src);
  return mediaItem ? mediaItem.src : null;
}
// set card cover: primary or fallback, and if it's a video we show first frame only (no autoplay)
function setCoverWithFallback(imageElement, project) {
  const primary  = project.cover || firstMediaImageSrc(project) || '';
  const fallback = firstMediaImageSrc(project) || firstMediaVideoSrc(project) || '';
  const isVideo = primary && (primary.endsWith('.mp4') || primary.endsWith('.webm') || primary.endsWith('.mov'));

  // cover is a video -> replace img with a video element, just first frame
  if (isVideo && imageElement.tagName === 'IMG') {
    const parent = imageElement.parentElement;
    const video = document.createElement('video');
    video.className = imageElement.className;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('preload', 'metadata');
    video.src = encodeURI(primary);
    video.alt = `${project.title} cover`;
    // sizing from css (.thumb), we just disable pointer so it doesn't play on click
    video.style.pointerEvents = 'none';
    // get to first frame and stay paused
    video.addEventListener('loadedmetadata', () => {
      video.currentTime = 0.1;
      video.pause();
    }, {once: true});
    video.addEventListener('seeked', () => {
      video.pause(); // Keep it paused after seeking
    }, {once: true});
    parent.replaceChild(video, imageElement);
    return;
  }

  imageElement.alt = `${project.title} cover`;
  imageElement.src = encodeURI(primary);

  // optional 2x asset for retina
  if (project.cover2x) {
    imageElement.srcset = `${encodeURI(primary)} 1x, ${encodeURI(project.cover2x)} 2x`;
    imageElement.sizes  = '(max-width: 720px) 92vw, 420px';
  } else {
    imageElement.removeAttribute('srcset');
    imageElement.removeAttribute('sizes');
  }

  imageElement.onerror = () => {
    if (fallback && imageElement.src !== encodeURI(fallback)) {
      const isFallbackVideo = fallback && (fallback.endsWith('.mp4') || fallback.endsWith('.webm') || fallback.endsWith('.mov'));
      if (isFallbackVideo && imageElement.tagName === 'IMG') {
        const parent = imageElement.parentElement;
        const video = document.createElement('video');
        video.className = imageElement.className;
        video.setAttribute('muted', '');
        video.setAttribute('playsinline', '');
        video.setAttribute('preload', 'metadata');
        video.src = encodeURI(fallback);
        video.alt = `${project.title} cover`;
        video.style.pointerEvents = 'none';
        video.addEventListener('loadedmetadata', () => {
          video.currentTime = 0.1;
          video.pause();
        }, {once: true});
        video.addEventListener('seeked', () => {
          video.pause();
        }, {once: true});
        parent.replaceChild(video, imageElement);
      } else {
        imageElement.src = encodeURI(fallback);
      }
    } else {
      imageElement.src = PLACEHOLDER;
    }
    imageElement.onerror = null;
  };
}


// skill logos by category (used below)
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

// build the skills section: one group per category, grid of logos
function renderSkillsLogos() {
  const container = queryOne('#skillsLogoWrap');
  if (!container)
    return;
  container.innerHTML = '';
  Object.entries(SKILL_LOGOS).forEach(([groupName, skillItems]) => {
    const sectionElement = document.createElement('section');
    sectionElement.className='skills-logo-group'; sectionElement.dataset.animate='reveal';
    sectionElement.innerHTML = `<h3>${groupName}</h3><ul class="logo-grid" role="list"></ul>`;
    const listElement = sectionElement.querySelector('.logo-grid');
    skillItems.forEach(({title, src})=>{
      const listItem = document.createElement('li'); listItem.className='logo-card';
      listItem.innerHTML = `
        <div class="logo-img-wrap"><img alt="${title}" loading="lazy" /></div>
        <div class="logo-title">${title}</div>`;
      const logoImage = queryOne('img', listItem);
      logoImage.onerror = () => {
        listItem.classList.add('logo-missing');
        listItem.querySelector('.logo-img-wrap').innerHTML = `<span class="logo-fallback">${title[0]}</span>`;
      };
      logoImage.src = encodeURI(src);
      listElement.appendChild(listItem);
    });
    container.appendChild(sectionElement);
  });
}

// all projects (order = display order; featured is controlled by FEATURED_SLUGS)
const PROJECTS = [
  {
  slug: 'wolfcafe',
  title: 'WolfCafe: Full-Stack Cafe Management & E-Commerce Platform',
  featured: true,
  cover:  'assets/Full Stack/Homepage.png',
  role: 'Frontend Lead • Backend Coordinator',
  tech: 'React • Spring Boot • MySQL • JWT • Vitest • Lombok',
  tags: ['Software Dev', 'Full Stack', 'Team Project', 'E-Commerce'],
  blurb:
    'Led frontend development and coordinated backend architecture for a production-ready full-stack cafe management platform. Built with Spring Boot REST API, React frontend, and MySQL. Implemented 5-role access control, JWT authentication, automated testing, and advanced order management. Coordinated 6-person agile team, established testing infrastructure, and delivered scalable e-commerce features including recipe variants, guest checkout, and order history.',
  metrics: [
    metric('Backend', 'Spring Boot + Hibernate + Lombok'),
    metric('Frontend', 'React + Vitest'),
    metric('Database', 'MySQL'),
    metric('Team', '6-person agile')
  ],
  links: [],
  case: {
    problem:
      'Build a production-ready full-stack cafe management and e-commerce platform with role-based access control, order processing, inventory management, and an intuitive UI. Implement advanced features including multi-role user system, recipe variants, order management workflows, guest checkout, and comprehensive order history.',
    role:
      'Frontend lead and backend coordinator on a 6-person agile team. Led frontend development with React, implemented UI components, role-based navigation, and automated testing infrastructure. Coordinated backend development, contributing to API endpoint design, database entities, and JWT authentication. Managed issues and PRs through GitHub, created system test plans, wrote unit tests, contributed to project management plans, and collaborated in agile sprints using story points and weekly reviews.',
    tech: [
      'Java • Spring Boot (Web, JPA/Hibernate)',
      'Lombok for code generation',
      'JWT authentication & authorization',
      'React (JSX, Components, Axios)',
      'Vitest & React Testing Library',
      'MySQL • RESTful APIs • JSON',
      'CI/CD (GitHub Actions) • Agile (sprints, story points)',
      'JUnit, Postman, and automated frontend testing'
    ],
    decisions: [
      'Implemented layered architecture (Controller → Service → Repository) for clear separation of concerns.',
      'Used JPA annotations and Lombok for entity relationships, validation, and reduced boilerplate code.',
      'Designed role-based access control system with five distinct roles: Admin, Manager, Barista, Customer, and Guest.',
      'Implemented JWT authentication with SHA256-encrypted secrets for secure token-based authentication.',
      'Created role-specific homepages and navigation for each user type, improving workflow efficiency.',
      'Built order pickup system allowing baristas to complete orders by order number regardless of active filter.',
      'Implemented recipe variants (S/M/L) with size-based pricing and ingredient requirements.',
      'Added active/inactive toggle for items and recipes without deletion, improving inventory management.',
      'Developed comprehensive order history system accessible to Admin, Manager, and Barista roles.',
      'Implemented guest checkout flow enabling anonymous orders without account creation.',
      'Modernized UI with dark mode featuring gold and brown aesthetics and fully responsive layout.',
      'Integrated Vitest and React Testing Library with 3 fully passing tests and infrastructure for expansion.',
      'Connected React frontend to REST endpoints using Axios for real-time updates across all features.',
      'Created system test plans, unit tests, project management documentation, and team collaboration guides.',
      'Followed professional workflow: issue tracking, pull requests with reviews, weekly retrospectives, and iterative development.'
    ],
    results: [
      'Delivered production-ready full-stack platform with 5 user roles, JWT authentication, and comprehensive order management.',
      'Led frontend architecture and coordinated backend API design, ensuring seamless integration across 6-person team.',
      'Established automated testing infrastructure with Vitest and React Testing Library, creating foundation for scalable test coverage.',
      'Implemented role-based access control system supporting Admin, Manager, Barista, Customer, and Guest workflows.',
      'Built advanced features: recipe variants (S/M/L), order pickup by number, guest checkout, and comprehensive order history.',
      'Created modern, responsive UI with dark mode and role-specific navigation, improving workflow efficiency for all user types.',
      'Coordinated cross-functional development, managing GitHub workflows, PR reviews, and agile sprint planning.',
      'Designed scalable architecture with layered separation (Controller → Service → Repository) for maintainability and testability.'
    ],
    details: [
      'Production-ready system with role-based access control, JWT authentication, and comprehensive order management.',
      'Advanced features: recipe variants (S/M/L), active/inactive toggles, order pickup by number, guest checkout, order history.',
      'Modern UI/UX with dark mode, role-specific navigation, and fully responsive design for desktop and mobile.',
      'Automated testing infrastructure with Vitest, React Testing Library, and 3 passing tests with expansion capability.',
      'Professional development practices: system test plans, unit tests, project management plans, agile sprints, and team collaboration.',
      'Experience directly transferable to modern enterprise stacks with emphasis on security, testing, and maintainability.'
    ]
  },
  media: [
    { type:'img', src:'assets/Full Stack/Homepage.png' },
    { type:'img', src:'assets/Full Stack/Add Ingredient.png' },
    { type:'img', src:'assets/Full Stack/Add Recipe.png' },
    { type:'img', src:'assets/Full Stack/Edit Recipe.png' },
    { type:'img', src:'assets/Full Stack/Update Inventory.png' }
  ]
},
  {
    slug: 'engine',
    title: 'SDL2 Game Engine: Multiplayer Physics & Collision',
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
      'Led team of 3 developers; architected component entity system and collision pipeline; implemented ZeroMQ networking layer and multithreaded update loop. Coordinated gameplay programming, systems design, and technical decisions across the team.',
      tech: ['C++', 'SDL2', 'ZeroMQ (Router/Dealer)', 'Multithreading'],
      decisions: [
        'Component-style entities for fast feature iteration (gameplay code stays decoupled).',
        'Collision pipeline with sweep tests and resolution for floor/wall/platform/bounce.',
        'ZeroMQ Router/Dealer for ordered broadcast of client input; explicit disconnect handling.',
        'Threaded update loop to keep rendering/input responsive under load.'
      ],
    results: [
      'Shipped two complete games (Bubble Shooter, Space Invaders) using the custom engine.',
      'Achieved stable 60 FPS performance on mid-range hardware with complex collision and entity systems.',
      'Validated networking architecture with ZeroMQ, demonstrating reliable message ordering and disconnect handling.',
      'Led team to deliver production-ready engine in 4 months while balancing academic coursework.'
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
  slug: 'rofial',
  title: 'Rofial Beauty: Live Shopify E-Commerce Website',
  blurb:
    'Full Shopify build and long-term operations for a boutique fashion brand. Customized theme from scratch, implemented SEO, automated email flows, managed inventory, and improved visibility across Google and social platforms.',
  featured: true,
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
      'Sole developer building and maintaining production Shopify e-commerce site since 2020. Customized theme architecture, implemented SEO strategy, automated marketing workflows, and managed full-stack operations. Coordinated with business owners and designers to align technical implementation with business goals and brand requirements.',
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
      'Built and launched production e-commerce site that has operated continuously since 2020.',
      'Increased online visibility and customer engagement, driving pre-visit website traffic to physical store.',
      'Improved product discovery through SEO optimization and intuitive navigation, increasing contact inquiries.',
      'Streamlined business operations with automated inventory management and email marketing workflows.',
      'Maintained long-term client relationship with ongoing updates and responsive support.'
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
    slug: 'cg-animation',
    title: 'Neon Battlezone: Full 3D Game with AI & Combat Systems',
    blurb:
      'Built a complete arcade-style 3D game in WebGL featuring a neon battlezone arena. Players battle AI-controlled tanks that track and shoot, with progressive ability upgrades after each wave, win/lose states, and full game loop. Demonstrates AI pathfinding, tracking, and real-time combat systems.',
    featured: false,
    cover: 'assets/CG/Game.mp4',
    role: 'Solo Developer',
    tech: 'WebGL • GLSL • AI Systems • Combat',
    tags: ['Game Dev', 'Software Dev', 'Computer Graphics'],
    metrics: [
      metric('Type', 'Full Game'),
      metric('Engine', 'WebGL'),
      metric('Features', 'AI • Combat • Progression')
    ],
    case: {
      problem:
        'Build a complete 3D game from scratch in WebGL, combining AI systems, combat mechanics, and game progression. Create an engaging arcade-style experience with win/lose states and progressive difficulty.',
      role:
        'Solo developer building the entire game. Implemented AI tank tracking and shooting behaviors, wave-based enemy spawning, ability upgrade system, win/lose state management, and full game loop.',
      tech: [
        'WebGL rendering pipeline with custom shaders',
        'AI pathfinding and tracking algorithms',
        'Combat system with projectile physics',
        'Wave-based enemy spawning and progression',
        'Ability upgrade system with per-wave scaling',
        'Game state management (win/lose conditions)',
        'Neon aesthetic rendering and lighting'
      ],
      decisions: [
        'Designed AI tank behavior system with player tracking, shooting mechanics, and pathfinding.',
        'Created wave-based progression system where abilities upgrade after each completed wave.',
        'Built complete game loop with win conditions (surviving all waves) and lose conditions (player health depletion).',
        'Implemented neon aesthetic with custom shaders for glowing effects and vibrant colors.',
        'Designed ability system that scales in power and variety as players progress through waves.'
      ],
      results: [
        'Delivered a fully playable 3D game with complete start-to-end progression and win/lose states.',
        'Implemented AI systems that create engaging combat encounters with tracking and shooting behaviors.',
        'Created progressive difficulty system with ability upgrades that reward player success.',
        'Built reusable systems for AI behavior, combat, and game state management.'
      ],
      details: [
        'Complete arcade-style game: AI combat → wave progression → ability upgrades → win/lose states.',
        'Neon battlezone aesthetic with custom shader-based lighting and visual effects.',
        'AI tank system with player tracking, shooting mechanics, and dynamic enemy spawning.',
        'Progressive ability system that increases in power and variety after each wave.',
        'Full game loop with health management, wave progression, and victory/defeat conditions.'
      ]
    },
    media: [
      { type: 'clip', src: 'assets/CG/Game.mp4', alt: 'Video demonstrating Neon Battlezone 3D game with AI tanks and combat' }
    ]
  },
  {
  slug: 'hci-research',
  title: 'HCI Research: Social Metacognition in Collaborative Debugging',
  blurb:
    'Studied how teams of three professional programmers work together while debugging. Built Python pipelines for Δ-heatmaps and event-locked plots to see when the way they talk and plan ties to success. Paper accepted to HCII on social metacognition in successful vs. unsuccessful teams.',
  featured: false,
  cover: 'assets/research.png',
  tags: ['HCI/UX', 'Research', 'Software Dev', 'Data Analysis'],
  metrics: [
    metric('Annotated', '2,700 turns'),
    metric('Team size', '3'),
    metric('Methods', 'Δ-heatmaps, event-locked'),
    metric('Stack', 'Python/Jupyter/Matplotlib'),
    metric('Publication', 'HCII (accepted)')
  ],
  case: {
    problem:
      'How do teams of three professional programmers communicate and self-monitor while debugging? What talk patterns link to success?',
    role:
      'Led data wrangling and analysis. Built Python notebooks to line up dialogue with debugging events (errors, tests, edits) and visualize changes around key moments.',
    tech: [
      'Python (pandas, numpy)',
      'Jupyter & Matplotlib',
      'Δ-heatmap generator',
      'Event alignment (edits, tests, pauses)'
    ],
    decisions: [
      'Aligned dialogue to debugging events (e.g. first failure, first pass) for event-locked comparison.',
      'Used pre/post windows and Δ-heatmaps to show shifts in participation and strategy talk.',
      'Reusable plotting for team-level and cohort-level analysis.',
      'Standardized annotations and checked agreement for metacognitive labels.'
    ],
    results: [
      'Planning and monitoring talk often preceded successful fixes soon after failures.',
      'Found coordination breakdowns (e.g. long monologues, few questions) that matched stalls.',
      'Paper accepted to HCII on social metacognition in successful vs. unsuccessful teams.',
      'Findings informed recommendations for instructors, tool builders, and collaboration best practices.'
    ],
    details: [
      '2,700+ turns annotated with strong agreement. HCII paper on social metacognition in successful vs. unsuccessful teams.',
      'Reproducible pipelines. Relevant to HCI and team collaboration practice.'
    ]
  },
  media: [
    { type: 'img', src: 'assets/research/graphex.png' }
  ]
},
  {
  slug: 'unmasking',
  title: 'Unmasking Reality: Narrative-Driven 2D Game (Godot)',
  blurb:
    'A narrative-driven 2D experience about emotional repression and identity, built entirely in Godot 4.3. Features custom shader-based world color transitions, emotional dialogue trees, and multiple game modes. Designed, scripted, and developed over 100+ hours while leading and adapting within a small, mixed-skill team.',
  featured: false,
  cover: 'assets/Unmasking Reality/unmasking.jpg',
  role: 'Lead Developer',
  tech: 'Godot 4.3 • GDScript • Custom Shaders • Dialogue System',
  tags: ['Game Dev', 'Software Dev', 'Narrative Design'],
  metrics: [
    metric('Engine', 'Godot 4.3'),
    metric('Time', '100+ hrs'),
    metric('Team', '3 (lead developer)')
  ],
  links: [
    { label: 'Full gameplay (YouTube)', href: 'https://www.youtube.com/watch?v=TXDZXRTnTpQ' }
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
  {
  slug: 'ai-initiative',
  title: 'Applied AI Systems: Search, Optimization & Interaction',
  featured: false,
  cover: 'assets/AI/cover.png',
  role: 'Java Developer • Interactive AI Visualization & Systems Design',
  tech: 'Java • Swing • A* • Genetic Algorithm • Simulated Annealing • Dual-Map Planning',
  blurb:
    'A semester-long initiative exploring applied AI through five projects. Includes interactive A* search visualizations, GUI-driven optimization, and dual-map planning games. Focused on making algorithms tangible through visualization, interactivity, and design.',
  tags: ['AI/Algorithms', 'Software Dev', 'Human–AI Interaction'],
  metrics: [
    metric('Lang', 'Java'),
    metric('Projects', '5'),
    metric('Focus', 'AI + UX')
  ],
  case: {
    problem:
      'How can classical AI algorithms be made interpretable, interactive, and engaging for both developers and learners?',
    role:
      'Designed, programmed, and iteratively expanded five Java-based AI systems, integrating algorithmic logic with usability principles. Focused on turning passive simulations into interactive experiences.',
    tech: [
      'Java Swing (GUIs, threading, timers)',
      'A* search & visualization',
      'Simulated Annealing & Genetic Algorithm',
      'Dual-map human-AI interaction'
    ],
    decisions: [
      'Added a real-time control GUI to visualize a robot’s A* pathfinding, with node coloring and cost labels for debugging.',
      'Implemented Genetic Algorithm vs. Simulated Annealing comparison for task assignment, introducing an algorithm selector for live switching.',
      'Built a dual-map planning simulation where human and AI agents race through mirrored environments, integrating countdowns, difficulty scaling, and winner display.',
      'Unified the applications under a consistent focus on explainability and interactivity: visuals, controls, and learning feedback.'
    ],
    results: [
      'Enhanced algorithm interpretability through visualization and interactive control panels.',
      'Improved user engagement and debugging capability across all simulations.',
      'Demonstrated full-stack AI system design from algorithm logic to GUI and networked interaction.'
    ],
    details: [
      'Each system was independently designed, implemented, and documented.',
      'Learned applied AI patterns and event-driven programming across 5 iterations.',
      'Experience bridges algorithmic rigor with user-centric system design.'
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
  {
  slug: 'connect-four',
  title: 'Connect Four: Human vs. AI (Java)',
  blurb:
    'Client-server Connect Four game for real-time human vs. AI matches. Built with Java Sockets so multiple clients can play against the same AI; focused on game logic, networking, and a simple Swing GUI.',
  featured: false,
  cover: 'assets/AI/ps04.png',
  role: 'Solo Developer',
  tech: 'Java • Swing • Sockets • Game AI',
  tags: ['Game Dev', 'Software Dev', 'AI/Algorithms'],
  metrics: [
    metric('Lang', 'Java'),
    metric('Architecture', 'Client–Server'),
    metric('Focus', 'Networking + AI')
  ],
  case: {
    problem:
      'Build a playable Connect Four game where a human plays against an AI over the network, with a clear separation between client (UI) and server (game + AI logic).',
    role:
      'Solo developer. Implemented game rules and win detection, socket-based client-server communication, a simple AI opponent, and a Swing GUI for the board and moves.',
    tech: [
      'Java Sockets (client-server)',
      'Java Swing (GUI)',
      'Game logic and win detection',
      'AI opponent'
    ],
    decisions: [
      'Separated client (display, input) and server (game state, AI) so multiple clients can connect to the same server.',
      'Used sockets for real-time move exchange between client and server.',
      'Implemented a simple AI for the server so the human always plays against the computer.'
    ],
    results: [
      'Delivered a working human vs. AI Connect Four game over the network.',
      'Reinforced socket programming and client-server design.',
      'Combined game logic, networking, and GUI in one project.'
    ],
    details: [
      'Real-time human vs. AI Connect Four using Java Sockets.',
      'Client-server architecture; Swing GUI. Good fit for Game Dev and networking practice.'
    ]
  },
  media: [
    { type: 'img', src: 'assets/AI/ps04.png' },
    { type: 'img', src: 'assets/AI/ps04-1.png' }
  ]
},
  {
  slug: 'cg-rasterization',
  title: '3D Rasterization: Transforms, Lighting & Interactive Rendering',
  blurb:
    'Implemented WebGL rasterization pipeline with Blinn-Phong lighting, interactive view transformations, and model selection. Features per-fragment shading, perspective projection, and real-time camera controls.',
  featured: false,
  cover: 'assets/CG/Eclipse.mp4',
  role: 'Solo Developer',
  tech: 'WebGL • GLSL • glMatrix',
  tags: ['Software Dev', 'Computer Graphics'],
  metrics: [
    metric('Engine', 'WebGL'),
    metric('Shading', 'Blinn-Phong'),
    metric('Focus', 'Rasterization Pipeline')
  ],
  case: {
    problem:
      'Implement a complete 3D rasterization pipeline using WebGL to render triangles with proper transforms, lighting, and interactive controls. Demonstrate understanding of the graphics pipeline from modeling to screen space.',
    role:
      'Solo developer implementing the full graphics pipeline. Built vertex and fragment shaders, implemented matrix transformations, and created interactive keyboard controls for view manipulation and model selection.',
    tech: [
      'WebGL (vertex/fragment shaders)',
      'Blinn-Phong lighting model (ambient, diffuse, specular) in fragment shaders',
      'glMatrix for matrix operations',
      'Per-fragment shading, perspective projection and view transforms'
    ],
    decisions: [
      'Implemented per-fragment shading in fragment shaders for accurate lighting calculations at each pixel.',
      'Used glMatrix library for efficient matrix operations (model, view, projection transforms).',
      'Designed interactive keyboard controls for real-time view translation and rotation (WASD, QE, arrow keys).',
      'Implemented model selection with 20% uniform scaling to highlight selected triangle sets.',
      'Applied inverse transpose of modeling transform to vertex normals for correct lighting under transformations.',
      'Separated view controls from model transforms to allow independent manipulation of camera and objects.'
    ],
    results: [
      'Successfully rendered 3D triangles with accurate lighting and perspective projection.',
      'Implemented interactive view controls allowing real-time camera movement and rotation.',
      'Created model selection system with visual feedback through scaling.',
      'Demonstrated understanding of the complete graphics pipeline from 3D coordinates to screen pixels.',
      'Applied proper matrix transformations for model, view, and projection spaces.'
    ],
    details: [
      'Rasterization pipeline: vertex processing → primitive assembly → rasterization → fragment shading.',
      'Blinn-Phong illumination model with ambient, diffuse, and specular components.',
      'Interactive controls for view translation (WASD, QE) and rotation (shift+WASD).',
      'Model selection and transformation system with independent transform matrices per triangle set.',
      'Proper handling of vertex normals under transformations using inverse transpose matrix.'
    ]
  },
  media: [
    { type: 'clip', src: 'assets/CG/Eclipse.mp4', alt: 'Video showing lighting and rendering of 3D models' },
    { type: 'clip', src: 'assets/CG/Selection.mp4', alt: 'Video demonstrating interactive model selection and transformation' }
  ]
},
  {
    slug: 'cg-raytracing',
    title: 'Ray Tracing: Minecraft Scene Recreation & Global Illumination',
    blurb:
      'Recreated an interactive Minecraft scene using ray tracing with global illumination, reflections, and advanced lighting models. Features fully navigable 3D environment with Minecraft-style blocks, accurate shadows, reflections, and photorealistic rendering.',
    featured: false,
    cover: 'assets/CG/Minecraft.mp4',
    role: 'Solo Developer',
    tech: 'WebGL • Ray Tracing • GLSL',
    tags: ['Software Dev', 'Computer Graphics'],
    metrics: [
      metric('Method', 'Ray Tracing'),
      metric('Scene', 'Minecraft Recreation'),
      metric('Rendering', 'Global Illumination')
    ],
    case: {
      problem:
        'Recreate an interactive Minecraft scene using ray tracing to demonstrate advanced rendering techniques. Build a navigable 3D environment with accurate lighting, shadows, reflections, and material properties that captures the aesthetic of Minecraft blocks.',
      role:
        'Solo developer implementing ray tracing algorithms and interactive scene navigation. Built ray generation, intersection tests, and shading calculations. Implemented player movement controls and scene composition with Minecraft-style block geometry.',
      tech: [
        'Ray tracing algorithms',
        'Intersection testing (spheres, triangles, planes)',
        'Global illumination calculations',
        'Shadow ray casting',
        'Reflection and refraction',
        'Material property modeling'
      ],
      decisions: [
        'Implemented recursive ray tracing for accurate reflections and refractions with depth limits.',
        'Used efficient intersection algorithms for different primitive types (spheres, triangles, planes).',
        'Applied Monte Carlo sampling for soft shadows and area light sources.',
        'Implemented material models supporting diffuse, specular, and reflective properties.',
        'Optimized ray traversal using spatial acceleration structures where applicable.',
        'Designed scene description format for flexible scene composition and material assignment.'
      ],
      results: [
        'Successfully recreated an interactive Minecraft scene with photorealistic lighting and shadows.',
        'Implemented player movement controls allowing full navigation through the 3D environment.',
        'Created block-based scene composition matching Minecraft aesthetic and geometry.',
        'Demonstrated understanding of global illumination and physically-based rendering concepts.',
        'Achieved high-quality renders with accurate reflections and material properties.'
      ],
      details: [
        'Interactive ray-traced Minecraft scene with player movement and camera controls.',
        'Block-based geometry system supporting Minecraft-style voxel rendering.',
        'Ray tracing pipeline: ray generation → intersection testing → shading → recursive reflection/refraction.',
        'Support for multiple light sources with accurate shadow calculations.',
        'Material models including Lambertian diffuse, Phong specular, and perfect mirrors.'
      ]
    },
    media: [
      { type: 'clip', src: 'assets/CG/Minecraft.mp4', alt: 'Video demonstrating ray tracing rendering with global illumination' }
  ]
},
  {
  slug: 'civiceye',
  title: 'CivicEye: UX Research & Figma Wireframes',
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
      'Gained practical experience in usability study design including planning, execution, and analysis.',
      'Developed a strong foundation in user-centered design and iterative feedback loops.'
    ],
    details: [
      'Learned that good design is not just aesthetic. It requires predictable behavior and tested understanding.',
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
  title: 'PuzzleScript: 4-Level Puzzle Design Series',
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
      'Explored puzzle literacy by teaching mechanics through player interaction alone.',
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
  title: 'Twine: Echoes of the Self & (HG) Recreation',
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
];

// which slugs show in the featured strip (edit this list to change)
const FEATURED_SLUGS = ['wolfcafe', 'engine', 'rofial'];
const FEATURED = FEATURED_SLUGS
  .map(slug => PROJECTS.find(project => project.slug === slug))
  .filter(Boolean);

// fill the featured strip from FEATURED (clone template, set cover/title/blurb/etc, wire click)
function renderFeatured() {
  const grid = queryOne('#featuredGrid');
  const template = queryOne('#featTpl');
  if (!grid || !template)
    return;
  grid.innerHTML = '';
  FEATURED.forEach(project => {
    const cardNode = template.content.firstElementChild.cloneNode(true);
    cardNode.dataset.slug = project.slug;
    const featuredImage = queryOne('.feat-img', cardNode);
    setCoverWithFallback(featuredImage, project);
    queryOne('.feat-title', cardNode).textContent = project.title;
    queryOne('.feat-blurb', cardNode).textContent = project.blurb;
    queryOne('.feat-role', cardNode).textContent = project.role || '';
    queryOne('.feat-tech', cardNode).textContent = project.tech || '';
    queryOne('.metrics', cardNode).innerHTML = (project.metrics || []).join('');
    queryOne('.view-details', cardNode).addEventListener('click', event => {
      event.stopPropagation();
      openModal(project.slug);
    });
    const watchButton = queryOne('.watch-btn', cardNode);
    if ((project.watch || []).length) {
      watchButton.href = project.watch[0];
      watchButton.target = '_blank';
      watchButton.rel = 'noopener';
    } else {
      watchButton.style.display = 'none';
    }
    cardNode.addEventListener('click', () => openModal(project.slug));
    grid.appendChild(cardNode);
  });
}

// same idea but for full project grid: cards with thumb, title, blurb, tags, links, open modal on click
function renderProjects() {
  const grid = queryOne('#projectGrid');
  const template = queryOne('#cardTpl');
  if (!grid || !template) return;
  grid.innerHTML = '';
  PROJECTS.forEach(project => {
    const cardNode = template.content.firstElementChild.cloneNode(true);
    cardNode.dataset.slug = project.slug;
    cardNode.dataset.tags = (project.tags || []).join(',');
    const thumbImage = queryOne('.thumb', cardNode);
    setCoverWithFallback(thumbImage, project);
    queryOne('.card-title', cardNode).textContent = project.title;
    queryOne('.card-blurb', cardNode).textContent = project.blurb;
    queryOne('.badge', cardNode).style.display = project.featured ? 'inline-flex' : 'none';
    queryOne('.metrics', cardNode).innerHTML = (project.metrics || []).join('');
    const tagContainer = queryOne('.tags', cardNode);
    (project.tags || []).forEach(tag => {
      const tagSpan = document.createElement('span');
      tagSpan.className = 'kbd';
      tagSpan.textContent = tag;
      tagContainer.appendChild(tagSpan);
    });
    const linksContainer = queryOne('.links', cardNode);
    (project.links || []).forEach(linkItem => {
      const anchor = document.createElement('a');
      anchor.className = 'btn btn-sm';
      anchor.href = linkItem.href;
      anchor.target = '_blank';
      anchor.rel = 'noopener';
      anchor.textContent = linkItem.label;
      anchor.addEventListener('click', event => event.stopPropagation(), { capture: true });
      linksContainer.appendChild(anchor);
    });
    queryOne('.view-details', cardNode).addEventListener('click', event => {
      event.stopPropagation();
      openModal(project.slug);
    });
    cardNode.addEventListener('click', () => openModal(project.slug));
    cardNode.addEventListener('keydown', event => {
      if (event.key === 'Enter') openModal(project.slug);
    });
    grid.appendChild(cardNode);
  });
}

// timeline entries (hardcoded here, could move to data later)
function renderExperience() {
  const timelineContainer = queryOne('#timeline');
  if (!timelineContainer)
    return;
  timelineContainer.innerHTML = '';

  const EXPERIENCE = [
    {
      when: 'May 2025 - Present',
      title: 'Research Assistant (NSF REU, HCI)',
      place: 'Raleigh, NC',
      org: 'NC State University',
      bullets: [
        'Annotated 2,700 dialogue turns across 10 teams of three professional programmers; strong inter-rater agreement.',
        'Analyzed team interactions and metacognition with Python/Jupyter; event-locked and aggregate visuals.',
        'Found patterns linking planning/monitoring talk to successful fixes; informed recommendations for instructors, tool builders, and best practices.',
        'Volunteered at VL/HCC: registration and check-in for researchers and professionals.',
        'Co-authored HCII-accepted paper on social metacognition in successful vs. unsuccessful teams.'
      ],
      tags: ['Research','Python','HCI','Data Viz','Events']
    },
    {
      when: 'Aug 2024 - Present',
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
      when: 'Aug 2024 - Present',
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
      when: 'Aug 2023 - Present',
      title: 'Undergraduate TA: Java & Data Structures',
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
      when: '2020 - Present',
      title: 'Operator: Rofial Beauty (Shopify)',
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

  EXPERIENCE.forEach(experienceEntry=>{
    const item = document.createElement('div'); item.className='item';
    item.innerHTML = `
      <div class="muted time">${experienceEntry.when}</div>
      <div>
        <h4>${experienceEntry.title}</h4>
        <div class="place">${experienceEntry.org} • ${experienceEntry.place}</div>
        <ul>${(experienceEntry.bullets||[]).map(bullet=>`<li>${bullet}</li>`).join('')}</ul>
        <div class="tags" style="margin-top:6px">${(experienceEntry.tags||[]).map(tag=>`<span class="kbd">${tag}</span>`).join('')}</div>
      </div>`;
    timelineContainer.appendChild(item);
  });
}


// coursework cards from a small list
function renderCoursework() {
  const courseworkGrid = queryOne('#courseworkGrid');
  if (!courseworkGrid)
    return;
  courseworkGrid.innerHTML = '';
  const COURSEWORK = [
    { name:'Operating Systems', details:'C, threads, semaphores/monitors, sockets/TCP, CODA, assembly' },
    { name:'Software Engineering', details:'Java, Spring Boot, REST, Hibernate, SQL/MySQL, CI/CD, PR reviews, issues/wiki' },
    { name:'Data Structures & Algorithms', details:'Java, complexity, trees/graphs, hashing, maps, runtime complexity' },
    { name:'Networks', details:'Sockets, client/server, TCP/UDP basics' },
    { name:'HCI / UX', details:'Research methods, prototyping, usability, Figma flows' },
    { name:'Game Dev', details:'SDL2, collision, feel tuning; engine patterns' },
    { name:'Computer Graphics', details:'Rendering pipeline; transforms/camera; rasterization; textures/sampling; lighting/shading' }
  ];
  COURSEWORK.forEach(course => {
    const card = document.createElement('div');
    card.className = 'skill';
    card.innerHTML = `<div class="skill-top"><b>${course.name}</b></div><div class="muted">${course.details}</div>`;
    courseworkGrid.appendChild(card);
  });
}

// filter chips: when you click one, show only cards that have that tag (or all)
function initFilters() {
  const filterChips = queryAll('.chip[data-filter]');
  if (!filterChips.length)
    return;
  const applyFilter = selectedTag => {
    const filterValue = (selectedTag || 'all').toLowerCase();
    filterChips.forEach(chip => {
      chip.setAttribute('aria-pressed', (chip.dataset.filter.toLowerCase() === filterValue).toString());
    });
    filterChips.forEach(chip => {
      chip.classList.toggle('active', chip.dataset.filter.toLowerCase() === filterValue);
    });
    queryAll('#projectGrid .card').forEach(card => {
      const cardTags = (card.dataset.tags || '').toLowerCase();
      const isVisible = filterValue === 'all' || cardTags.split(',').map(tag => tag.trim()).includes(filterValue);
      card.style.display = isVisible ? '' : 'none';
    });
  };
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => applyFilter(chip.dataset.filter));
  });
  applyFilter('all');
}

// sections with data-animate="reveal" fade in when they scroll into view; also toggle navbar shadow on scroll
function initRevealOnScroll() {
  const elementsToReveal = document.querySelectorAll('[data-animate="reveal"]');
  const isMobile = window.innerWidth <= 720;
  const threshold = isMobile ? 0.05 : 0.12;
  const intersectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        intersectionObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: threshold,
    rootMargin: isMobile ? '50px' : '0px'
  });
  elementsToReveal.forEach(element => intersectionObserver.observe(element));
  // on mobile sometimes the observer misses, so after a bit just show everything
  if (isMobile) {
    setTimeout(() => {
      elementsToReveal.forEach(element => {
        if (!element.classList.contains('is-visible')) {
          element.classList.add('is-visible');
        }
      });
    }, 500);
  }
  window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    navbar.classList.toggle('scrolled', window.scrollY > 6);
  }, { passive: true });
}

// modal: open by slug, show title/blurb/metrics/case study + media carousel + links
(function initModal() {
  const modal = queryOne('#projectModal');
  if (!modal)
    return;
  const titleElement = queryOne('#modalTitle');
  const blurbElement = queryOne('#modalBlurb');
  const metricsElement = queryOne('#modalMetrics');
  const mediaStage = queryOne('#mediaStage');
  const caseSections = queryOne('#caseSections');
  const linksElement = queryOne('#modalLinks');
  const previousButton = queryOne('.prev', modal);
  const nextButton = queryOne('.next', modal);
  let mediaItems = [];
  let currentMediaIndex = 0;

  // draw current media item (video, img, or yt embed placeholder)
  function renderMedia() {
    mediaStage.innerHTML = '';
    if (!mediaItems.length) {
      mediaStage.innerHTML = '<div class="muted">No media</div>';
      return;
    }
    const currentMedia = mediaItems[currentMediaIndex];
    if (currentMedia.type === 'clip' && currentMedia.src) {
      const videoElement = document.createElement('video');
      videoElement.muted = true;
      videoElement.playsInline = true;
      videoElement.loop = true;
      videoElement.autoplay = true;
      videoElement.controls = true;
      videoElement.setAttribute('muted', '');
      videoElement.setAttribute('playsinline', '');
      videoElement.setAttribute('loop', '');
      videoElement.setAttribute('autoplay', '');
      videoElement.setAttribute('controls', '');
      videoElement.src = encodeURI(currentMedia.src);
      // selection demo video: show more of the bottom
      if (currentMedia.src.includes('Selection.mp4')) {
        videoElement.style.objectPosition = 'center 85%';
      }
      mediaStage.appendChild(videoElement);
      const playVideo = () => {
        videoElement.play().catch(() => {});
      };
      videoElement.addEventListener('loadedmetadata', playVideo, { once: true });
      videoElement.addEventListener('canplay', playVideo, { once: true });
      queueMicrotask(playVideo);
    } else if (currentMedia.type === 'img' && currentMedia.src) {
      const imageElement = document.createElement('img');
      imageElement.alt = '';
      imageElement.src = encodeURI(currentMedia.src);
      safeImg(imageElement);
      mediaStage.appendChild(imageElement);
    } else if (currentMedia.type === 'yt' && (currentMedia.id || currentMedia.url)) {
      const youtubeVideoId = currentMedia.id || extractYoutubeId(currentMedia.url);
      const youtubeHeroDiv = document.createElement('div');
      youtubeHeroDiv.className = 'yt-hero';
      const thumbnailImage = document.createElement('img');
      thumbnailImage.alt = 'YouTube thumbnail';
      setBestYoutubeThumbnail(thumbnailImage, youtubeVideoId);
      const playLink = document.createElement('a');
      playLink.href = `https://youtu.be/${youtubeVideoId}`;
      playLink.target = '_blank';
      playLink.rel = 'noopener';
      playLink.className = 'yt-play';
      playLink.textContent = '▶';
      youtubeHeroDiv.appendChild(thumbnailImage);
      youtubeHeroDiv.appendChild(playLink);
      mediaStage.appendChild(youtubeHeroDiv);
    } else {
      mediaStage.innerHTML = '<div class="muted">Unsupported media</div>';
    }
  }

// fill modal with this project's content (header + case sections + links + media)
function setCase(project) {
  titleElement.textContent = project.title || '';
  blurbElement.textContent = project.blurb || '';
  metricsElement.innerHTML = (project.metrics || []).join('');

  caseSections.innerHTML = '';
  const caseData = project.case || {};

  // learning-style projects: summary, what i learned, reflection
  if (caseData.summary) {
    caseSections.insertAdjacentHTML(
      'beforeend',
      `<section><h4>Overview</h4><p>${caseData.summary}</p></section>`
    );
  }
  if (Array.isArray(caseData.learning) && caseData.learning.length) {
    caseSections.insertAdjacentHTML(
      'beforeend',
      `<section><h4>What I Learned</h4><ul>${caseData.learning.map(listItem=>`<li>${listItem}</li>`).join('')}</ul></section>`
    );
  }
  if (caseData.reflection) {
    caseSections.insertAdjacentHTML(
      'beforeend',
      `<section><h4>Reflection</h4><p>${caseData.reflection}</p></section>`
    );
  }

  // full case study: problem, role & tech, decisions, results, highlights
  if (caseData.problem) {
    caseSections.insertAdjacentHTML(
      'beforeend',
      `<section><h4>Problem</h4><p>${caseData.problem}</p></section>`
    );
  }

  if (caseData.role || caseData.tech) {
    caseSections.insertAdjacentHTML(
      'beforeend',
      `<section><h4>Role & Tech</h4>
         <ul>
           ${caseData.role ? `<li>${caseData.role}</li>` : ''}
           ${caseData.tech ? `<li>${(Array.isArray(caseData.tech) ? caseData.tech.join(', ') : caseData.tech)}</li>` : ''}
         </ul>
       </section>`
    );
  }

  if (Array.isArray(caseData.decisions) && caseData.decisions.length) {
    caseSections.insertAdjacentHTML(
      'beforeend',
      `<section><h4>Key Decisions</h4><ul>${caseData.decisions.map(decision=>`<li>${decision}</li>`).join('')}</ul></section>`
    );
  }

  if (Array.isArray(caseData.results) && caseData.results.length) {
    caseSections.insertAdjacentHTML(
      'beforeend',
      `<section><h4>Results</h4><ul>${caseData.results.map(result=>`<li>${result}</li>`).join('')}</ul></section>`
    );
  }

  if (Array.isArray(caseData.details) && caseData.details.length) {
    caseSections.insertAdjacentHTML(
      'beforeend',
      `<section><h4>Highlights</h4><ul>${caseData.details.map(highlight=>`<li>${highlight}</li>`).join('')}</ul></section>`
    );
  }

  // nothing matched? show a placeholder
  if (!caseSections.children.length) {
    caseSections.insertAdjacentHTML(
      'beforeend',
      `<section><h4>Details</h4><p class="muted">More info coming soon.</p></section>`
    );
  }

  linksElement.innerHTML = '';
  (project.links || []).forEach(linkItem => {
    linksElement.insertAdjacentHTML(
      'beforeend',
      `<a class="btn btn-sm" href="${linkItem.href}" target="_blank" rel="noopener">${linkItem.label}</a>`
    );
  });

  mediaItems = (project.media || []);
  currentMediaIndex = 0;
  // hide prev/next when there's only one thing to show
  if (previousButton && nextButton) {
    if(mediaItems.length <= 1){
      previousButton.style.display = 'none';
      nextButton.style.display = 'none';
    } else {
      previousButton.style.display = 'flex';
      nextButton.style.display = 'flex';
    }
  }
  renderMedia();
}


  function show() {
    modal.hidden = false;
    document.body.classList.add('modal-open');
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
  }
  function hide() {
    modal.hidden = true;
    document.body.classList.remove('modal-open');
    const scrollY = document.body.style.top;
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    if (scrollY) {
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
    mediaStage.querySelectorAll('video').forEach(videoElement => {
      try {
        videoElement.pause();
      } catch {}
    });
    mediaStage.innerHTML = '';
  }
  queryOne('.modal-close', modal).addEventListener('click', hide);
  queryOne('.modal-backdrop', modal).addEventListener('click', hide);
  window.addEventListener('keydown', event => {
    if (!modal.hidden && event.key === 'Escape') 
      hide();
  });
  previousButton.addEventListener('click', () => {
    if (!mediaItems.length) 
      return;
    currentMediaIndex = (currentMediaIndex - 1 + mediaItems.length) % mediaItems.length;
    renderMedia();
  });
  nextButton.addEventListener('click', () => {
    if (!mediaItems.length) 
      return;
    currentMediaIndex = (currentMediaIndex + 1) % mediaItems.length;
    renderMedia();
  });

  window.openModal = slug => {
    const project = PROJECTS.find(proj => proj.slug === slug) || FEATURED.find(proj => proj.slug === slug);
    if (project) {
      setCase(project);
      show();
    }
  };
})();

// contact form posts to google apps script; we show sending/sent/error in .form-status
function initContactForm() {
  const form = document.getElementById("contactForm");
  if (!form)
    return;

  const statusElement = form.querySelector(".form-status");
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyC2HkMbsMcMJuB3foHbyVlnOQfoF5ns6E5yM5h1kGUcLYmrykzJqpaO06ba3YTwu_e3g/exec";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (statusElement) {
      statusElement.textContent = "Sending…";
    }

    const formData = new FormData(form);

    try {
      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        body: formData
      });

      let success = false;
      try {
        const data = await response.json();
        success = data && data.success;
      } catch {
        success = response.ok;
      }

      if (success) {
        if (statusElement) {
          statusElement.textContent = "Sent! I will respond to your message shortly.";
        }
        form.reset();
      } else {
        throw new Error("Submission failed");
      }
    } catch (error) {
      console.error(error);
      if (statusElement) {
        statusElement.textContent = "Something went wrong. Please try again.";
      }
    }
  });
}

// on load: theme, sanitize projects, run all renderers and inits, set footer year + navbar shadow
document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('theme-light-purple');

  for (let i = 0; i < PROJECTS.length; i++) {
    PROJECTS[i] = sanitizeProject(PROJECTS[i]);
  }

  safeRun('renderSkillsLogos', renderSkillsLogos);
  safeRun('renderFeatured', renderFeatured);
  safeRun('renderProjects', renderProjects);
  safeRun('renderExperience', renderExperience);
  safeRun('renderCoursework', renderCoursework);
  safeRun('initFilters', initFilters);
  safeRun('initRevealOnScroll', initRevealOnScroll);
  safeRun('initContactForm', initContactForm);

  const yearElement = document.querySelector('#year');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  const navbar = document.querySelector('.navbar');
  if (navbar) {
    navbar.classList.toggle('scrolled', window.scrollY > 6);
  }
});