/**
 * renderer.js
 * Reads role-specific JSON, builds all scenes and modals dynamically.
 * Replaces static scene-section.html and modal-layer.html patterns.
 */

/* ── Helpers ──────────────────────────────────── */
function makeBubbleId(sceneId, index) {
  const letter = String.fromCharCode(97 + index);
  return `${sceneId}-${letter}`;
}

function buildBubbles(scene, bubbles) {
  return (bubbles || []).map((b, i) => {
    const id = b.id || makeBubbleId(scene.id, i);
    return `<div class="bubble" id="${id}" data-modal="${b.modal}">${b.label}</div>`;
  }).join('');
}

function buildModals(modals) {
  if (!modals) return;
  const frag = document.createDocumentFragment();
  Object.entries(modals).forEach(([id, m]) => {
    const dialog = document.createElement('dialog');
    dialog.id = id;
    dialog.innerHTML = `
      <h3>${m.title}</h3>
      ${m.body.split('\n').filter(Boolean).map(p => `<p>${p}</p>`).join('')}
      <button class="close-modal">Close</button>
    `;
    frag.appendChild(dialog);
  });
  document.body.appendChild(frag);
}

function setupModalHandlers() {
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-modal]');
    if (trigger) {
      e.preventDefault();
      const modal = document.getElementById(trigger.getAttribute('data-modal'));
      if (modal) {
        syncModalAvatar(trigger, modal);
        modal.showModal();
      }
      return;
    }
    const closeBtn = e.target.closest('.close-modal');
    if (closeBtn) {
      closeBtn.closest('dialog').close();
    }
  });
}

function syncModalAvatar(trigger, modal) {
  const bubbleImg = trigger.querySelector('img');
  let modalImg = modal.querySelector('.modal-avatar');
  if (bubbleImg) {
    if (!modalImg) {
      modalImg = document.createElement('img');
      modalImg.className = 'modal-avatar';
      modal.prepend(modalImg);
    }
    modalImg.src = bubbleImg.src;
    modalImg.style.display = 'block';
  } else if (modalImg) {
    modalImg.style.display = 'none';
  }
}

(async function main() {
  try {
    /* ── 1. Load data ─────────────────────────────────── */
    const params = new URLSearchParams(window.location.search);
    const role = params.get('role') || 'sample';
    const response = await fetch(`data/${role}.json`);
    if (!response.ok) {
      document.querySelector('.presentation-container').innerHTML =
        `<p style="padding:4rem;text-align:center;">Could not load <strong>data/${role}.json</strong> (${response.status}). Try a different <code>?role=</code> parameter.</p>`;
      return;
    }
    const data = await response.json();

  /* ── 2. Apply theme (if provided) ──────────────── */
  if (data.theme) {
    Object.entries(data.theme).forEach(([prop, val]) => {
      if (prop.startsWith('--')) {
        document.documentElement.style.setProperty(prop, val);
      }
    });
  }

  document.title = data.title;

  const logo = document.querySelector('.company-logo');
  if (logo && data.logo) logo.src = data.logo;

  const container = document.querySelector('.presentation-container');
  if (!container) return;

  /* ── 3. Build scenes ──────────────────────────────── */
  const sceneElements = [];

  data.scenes.forEach((scene, i) => {
    const section = document.createElement('section');
    section.id = scene.id;
    section.classList.add('scene');

    if (scene.theme === 'dark') section.classList.add('theme-dark');
    if (scene.type === 'hero') section.classList.add('hero');
    if (scene.layout) section.classList.add(scene.layout);
    if (scene.type === 'reversed') section.classList.add('layout-reversed');
    if (scene.bgClass) section.classList.add(scene.bgClass);

    // SVG background mask style
    if (scene.mask) {
      const maskVar = getComputedStyle(document.documentElement)
        .getPropertyValue(`--svg-${scene.mask}`).trim();
      if (maskVar) {
        section.style.setProperty('--mask-url', maskVar);
        if (scene.maskSide) section.style.setProperty(`--mask-${scene.maskSide}`, '0');
      }
    }

    // Line canvas for scenes that have keyword–bubble connections
    const needsLines = scene.type === 'standard' || scene.type === 'reversed';
    if (needsLines) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.classList.add('line-canvas');
      section.appendChild(svg);
    }

    // Build inner content
    switch (scene.type) {
      case 'hero':      buildHero(section, scene);      break;
      case 'standard':  buildStandard(section, scene);   break;
      case 'reversed':  buildStandard(section, scene);   break;
      case 'pipeline':  buildPipeline(section, scene);     break;
      case 'credits':   buildCredits(section, scene);     break;
      case 'tree':      buildTree(section, scene);         break;
      default:          buildStandard(section, scene);
    }

    container.appendChild(section);
    sceneElements.push(section);
  });

  /* ── 4. Build modals ──────────────────────────────── */
  buildModals(data.modals);

  /* ── 5. Modal open/close wiring ──────────────────── */
  setupModalHandlers();

  /* ── 6. Tracker ───────────────────────────────────── */
  const tracker = document.getElementById('scene-tracker');
  if (tracker) {
    data.scenes.forEach((scene) => {
      const dot = document.createElement('div');
      dot.className = 'tracker-dot';
      dot.dataset.target = scene.id;
      dot.dataset.title = scene.title || '';
      dot.addEventListener('click', () => {
        document.getElementById(scene.id)?.scrollIntoView({ behavior: 'smooth' });
      });
      tracker.appendChild(dot);
    });
  }

  /* ── 7. Observer & scene-loaded events ────────────── */
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-active');
        setTimeout(() => drawLinesForScene(entry.target), 400);
        document.querySelectorAll('.tracker-dot').forEach(d => d.classList.remove('is-active'));
        const dot = document.querySelector(`.tracker-dot[data-target="${entry.target.id}"]`);
        if (dot) dot.classList.add('is-active');
      } else {
        entry.target.classList.remove('is-active');
        clearLinesForScene(entry.target);
      }
    });
  }, { threshold: 0.5 });

  sceneElements.forEach((el) => observer.observe(el));

  /* ── 8. Resize handler for line redraw ────────────── */
  window.addEventListener('resize', () => {
    const active = document.querySelector('.scene.is-active');
    if (active) drawLinesForScene(active);
  });
  } catch (err) {
    document.querySelector('.presentation-container').innerHTML =
      `<p style="padding:4rem;text-align:center;">Error loading presentation: ${err.message}</p>`;
  }
})();

/* ===========================================================
   SCENE BUILDERS
   =========================================================== */

function buildHero(section, scene) {
  section.innerHTML = `
    <h1>${scene.headline}</h1>
    <p>${scene.subtitle || ''}</p>
  `;
}

function buildStandard(section, scene) {
  const wrapper = document.createElement('div');
  wrapper.className = 'scene-content';

  wrapper.innerHTML = `
    <div class="col col-highlight">
      <h1 class="huge-highlight">${scene.highlight || ''}</h1>
    </div>
    <div class="col col-text">
      ${scene.heading ? `<h2>${scene.heading}</h2>` : ''}
      ${(scene.paragraphs || []).map(p => `<p>${p}</p>`).join('')}
    </div>
    <div class="col col-media">
      ${buildBubbles(scene, scene.bubbles)}
      ${scene.image ? `<img src="${scene.image}" alt="${scene.imageAlt || ''}" class="large-image" />` : ''}
    </div>
  `;

  section.appendChild(wrapper);
}

function buildPipeline(section, scene) {
  const wrapper = document.createElement('div');
  wrapper.className = 'scene-content flex-column';
  wrapper.innerHTML = `
    <div class="title container" style="text-align: center; margin-bottom: 3rem;">
      <h1 class="huge-highlight" style="font-size: 3rem;">${scene.headline}</h1>
      <p>${scene.subtitle || ''}</p>
    </div>
    <div class="pipeline-container">
      <div class="pipeline-flow">
        ${(scene.steps || []).map(s => `
          <div class="flow-step">
            <span class="flow-label">${s.label}</span>
            <a href="#" class="flow-node" data-modal="${s.modal}">${s.node}</a>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  section.appendChild(wrapper);
}

function buildCredits(section, scene) {
  const wrapper = document.createElement('div');
  wrapper.className = 'scene-content';
  wrapper.innerHTML = `
    <div class="col col-text">
      ${(scene.paragraphs || []).map(p => `<p>${p}</p>`).join('')}
      ${(scene.links || []).length ? `
        <div class="links-container" style="margin-top: 2rem;">
          <ul style="list-style: none; padding: 0;">
            ${scene.links.map(l => `
              <li style="margin-bottom: 0.5rem;">
                <a href="${l.url}" target="_blank" class="keyword" style="text-decoration: none;">${l.text}</a>
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}
      ${scene.postscript ? `<p style="margin-top: 3rem; font-size: 0.9rem; font-style: italic; opacity: 0.8;">${scene.postscript}</p>` : ''}
    </div>
    <div class="col col-media">
      ${scene.image ? `<img src="${scene.image}" alt="${scene.imageAlt || ''}" class="large-image" />` : ''}
    </div>
  `;
  section.appendChild(wrapper);
}

/* ===========================================================
   TREE BUILDER
   =========================================================== */

function buildTree(section, scene) {
  const wrapper = document.createElement('div');
  wrapper.className = 'scene-content flex-column tree';

  let html = '';
  if (scene.headline || scene.subtitle) {
    html += `<div class="title container" style="text-align:center;margin-bottom:2rem;">
      ${scene.headline ? `<h1 class="huge-highlight" style="font-size:2.5rem;">${scene.headline}</h1>` : ''}
      ${scene.subtitle ? `<p>${scene.subtitle}</p>` : ''}
    </div>`;
  }
  html += renderTreeNodes(scene.tree);
  wrapper.innerHTML = html;
  section.appendChild(wrapper);
}

function renderTreeNodes(nodes) {
  if (!nodes || nodes.length === 0) return '';
  let html = '<ul>';
  nodes.forEach(node => {
    if (node.modal) {
      html += `<li>
      <a href="#" class="tree-node" data-modal="${node.modal}">${node.label}</a>`;
    } else {
      html += `<li>
      <span class="tree-node">${node.label}</span>`;
    }
    if (node.children && node.children.length > 0) {
      html += renderTreeNodes(node.children);
    }
    html += '</li>';
  });
  html += '</ul>';
  return html;
}

/* ===========================================================
   LINE DRAWING (unchanged logic from original script.js)
   =========================================================== */

function drawLinesForScene(scene) {
  const svgCanvas = scene.querySelector('.line-canvas');
  if (!svgCanvas) return;
  clearLinesForScene(scene);

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <linearGradient id="fade-standard" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color: var(--color-accent); stop-opacity: 0"/>
      <stop offset="80%" style="stop-color: var(--color-accent); stop-opacity: 0.5"/>
      <stop offset="150%" style="stop-color: var(--color-accent); stop-opacity: 1"/>
    </linearGradient>
    <linearGradient id="fade-reversed" x1="100%" y1="0%" x2="0%" y2="0%">
      <stop offset="0%" style="stop-color: var(--color-accent); stop-opacity: 0"/>
      <stop offset="80%" style="stop-color: var(--color-accent); stop-opacity: 0.5"/>
      <stop offset="150%" style="stop-color: var(--color-accent); stop-opacity: 1"/>
    </linearGradient>
  `;
  svgCanvas.appendChild(defs);

  const keywords = scene.querySelectorAll('.keyword');
  const sceneRect = scene.getBoundingClientRect();
  const isReversed = scene.classList.contains('layout-reversed');

  keywords.forEach((kw) => {
    const target = document.getElementById(kw.getAttribute('data-link'));
    if (!target) return;

    const keyRect = kw.getBoundingClientRect();
    const bubRect = target.getBoundingClientRect();

    const startX = isReversed ? (keyRect.left - sceneRect.left) : (keyRect.right - sceneRect.left);
    const startY = keyRect.top - sceneRect.top + keyRect.height / 2;
    const endX = isReversed ? (bubRect.right - sceneRect.left) : (bubRect.left - sceneRect.left);
    const endY = bubRect.top - sceneRect.top + bubRect.height / 2;

    const ctrl = 80;
    const cx1 = isReversed ? startX - ctrl : startX + ctrl;
    const cx2 = isReversed ? endX + ctrl : endX - ctrl;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${startX} ${startY} C ${cx1} ${startY}, ${cx2} ${endY}, ${endX} ${endY}`);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', `url(#${isReversed ? 'fade-reversed' : 'fade-standard'})`);
    path.setAttribute('stroke-width', '2');
    svgCanvas.appendChild(path);

    const len = path.getTotalLength();
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len;
    // Force reflow so the browser paints the initial hidden state
    // before we kick off the transition animation.
    void path.getBoundingClientRect();
    path.style.transition = 'stroke-dashoffset 1.5s ease-in-out';
    path.style.strokeDashoffset = '0';

    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', endX);
    dot.setAttribute('cy', endY);
    dot.setAttribute('r', '4');
    dot.style.fill = 'var(--color-accent)';
    dot.style.opacity = '0';
    dot.style.transition = 'opacity 0.3s ease-in-out 1.2s';
    svgCanvas.appendChild(dot);
    // Same reflow trick for the dot fade-in
    void dot.getBoundingClientRect();
    dot.style.opacity = '1';
  });
}

function clearLinesForScene(scene) {
  const svg = scene.querySelector('.line-canvas');
  if (svg) svg.innerHTML = '';
}
