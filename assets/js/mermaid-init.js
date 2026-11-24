// assets/js/mermaid-init.js

const MERMAID_CDN_URLS = [
  'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs',
  'https://unpkg.com/mermaid@11/dist/mermaid.esm.min.mjs',
];

const MERMAID_CONFIG = {
  startOnLoad: false,
  securityLevel: 'strict',
  theme: 'base',
  fontFamily: '"Noto Sans", Arial, "Microsoft YaHei", "微软雅黑", sans-serif',
  themeVariables: {
    fontFamily: '"Noto Sans", Arial, "Microsoft YaHei", "微软雅黑", sans-serif',
    fontSize: '14px',
    background: '#edf2f2',
    primaryColor: '#eef4f4',
    primaryTextColor: '#001515',
    primaryBorderColor: '#008b8b',
    lineColor: '#006464',
    secondaryColor: '#d4e2e2',
    secondaryTextColor: '#001515',
    secondaryBorderColor: '#006464',
    tertiaryColor: '#f5f8f8',
    tertiaryTextColor: '#001515',
    tertiaryBorderColor: '#9eb1b1',
    clusterBkg: '#e6efef',
    clusterBorder: '#008b8b',
    edgeLabelBackground: '#edf2f2',
    actorBkg: '#eef4f4',
    actorBorder: '#008b8b',
    actorTextColor: '#001515',
    actorLineColor: '#006464',
    signalColor: '#001515',
    signalTextColor: '#001515',
    labelBoxBkgColor: '#edf2f2',
    labelBoxBorderColor: '#008b8b',
    labelTextColor: '#001515',
    noteBkgColor: '#f5f8f8',
    noteBorderColor: '#008b8b',
    noteTextColor: '#001515',
    activationBkgColor: '#d4e2e2',
    activationBorderColor: '#008b8b',
  },
  flowchart: {
    htmlLabels: true,
    useMaxWidth: false,
    curve: 'basis',
  },
  sequence: {
    useMaxWidth: false,
    wrap: true,
  },
};

const ZOOM_MIN = 1.0;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.25;

/**
 * Dynamically import Mermaid ESM with ordered CDN fallback.
 */
async function loadMermaid() {
  let lastError = null;
  for (const url of MERMAID_CDN_URLS) {
    try {
      const mod = await import(url);
      if (mod && mod.default) {
        return mod.default;
      }
    } catch (err) {
      lastError = err;
      console.warn(`[mermaid] Failed to load from ${url}:`, err);
    }
  }
  throw lastError || new Error('All Mermaid CDN sources failed to load.');
}

/**
 * Collect unique Kramdown/Rouge Mermaid code blocks in document order.
 */
function collectMermaidBlocks() {
  const codeNodes = document.querySelectorAll(
    'div.language-mermaid code, pre > code.language-mermaid'
  );
  const seenWrappers = new Set();
  const blocks = [];

  codeNodes.forEach((codeEl) => {
    const wrapper = codeEl.closest('div.language-mermaid') || codeEl.closest('pre');
    if (!wrapper || seenWrappers.has(wrapper)) {
      return;
    }
    seenWrappers.add(wrapper);
    const source = (codeEl.textContent || '').trim();
    if (source) {
      blocks.push({ wrapper, source });
    }
  });

  return blocks;
}

/**
 * Singleton Lightbox mounted directly on document.body to avoid section transform clipping.
 */
const lightbox = (() => {
  let overlay = null;
  let canvas = null;
  let zoomLabel = null;
  let currentZoom = 1.0;
  let lastFocusedElement = null;

  function applyZoom() {
    if (!canvas || !zoomLabel) return;
    const svg = canvas.querySelector('svg');
    if (svg) {
      svg.style.transform = currentZoom === 1.0 ? '' : `scale(${currentZoom})`;
      svg.style.transformOrigin = 'top left';
    }
    zoomLabel.textContent = `${Math.round(currentZoom * 100)}%`;
  }

  function close() {
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    canvas.innerHTML = '';
    document.body.classList.remove('mermaid-lightbox-open');
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
    lastFocusedElement = null;
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      close();
    }
  }

  function ensureMounted() {
    if (overlay) return;

    overlay = document.createElement('div');
    overlay.className = 'mermaid-lightbox';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Mermaid 图表放大预览');
    overlay.hidden = true;

    const dialog = document.createElement('div');
    dialog.className = 'mermaid-lightbox-dialog';

    const header = document.createElement('div');
    header.className = 'mermaid-lightbox-header';

    const title = document.createElement('span');
    title.className = 'mermaid-lightbox-title';
    title.textContent = 'Mermaid 图表预览';

    const controls = document.createElement('div');
    controls.className = 'mermaid-lightbox-controls';

    const zoomOutBtn = document.createElement('button');
    zoomOutBtn.type = 'button';
    zoomOutBtn.className = 'mermaid-btn';
    zoomOutBtn.textContent = '−';
    zoomOutBtn.setAttribute('aria-label', '缩小');
    zoomOutBtn.addEventListener('click', () => {
      currentZoom = Math.max(ZOOM_MIN, +(currentZoom - ZOOM_STEP).toFixed(2));
      applyZoom();
    });

    zoomLabel = document.createElement('span');
    zoomLabel.className = 'mermaid-lightbox-zoom';
    zoomLabel.textContent = '100%';

    const zoomInBtn = document.createElement('button');
    zoomInBtn.type = 'button';
    zoomInBtn.className = 'mermaid-btn';
    zoomInBtn.textContent = '+';
    zoomInBtn.setAttribute('aria-label', '放大');
    zoomInBtn.addEventListener('click', () => {
      currentZoom = Math.min(ZOOM_MAX, +(currentZoom + ZOOM_STEP).toFixed(2));
      applyZoom();
    });

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'mermaid-btn';
    resetBtn.textContent = '重置';
    resetBtn.addEventListener('click', () => {
      currentZoom = 1.0;
      applyZoom();
    });

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'mermaid-btn mermaid-btn-close';
    closeBtn.textContent = '关闭';
    closeBtn.setAttribute('aria-label', '关闭预览');
    closeBtn.addEventListener('click', close);

    controls.append(zoomOutBtn, zoomLabel, zoomInBtn, resetBtn, closeBtn);
    header.append(title, controls);

    canvas = document.createElement('div');
    canvas.className = 'mermaid-lightbox-body';

    dialog.append(header, canvas);
    overlay.appendChild(dialog);

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        close();
      }
    });

    document.addEventListener('keydown', handleKeyDown);
    document.body.appendChild(overlay);
  }

  function open(svgElement, triggerEl) {
    ensureMounted();
    lastFocusedElement = triggerEl || document.activeElement;
    currentZoom = 1.0;
    canvas.innerHTML = '';

    const clonedSvg = svgElement.cloneNode(true);
    clonedSvg.removeAttribute('id');
    canvas.appendChild(clonedSvg);

    overlay.hidden = false;
    document.body.classList.add('mermaid-lightbox-open');
    applyZoom();

    const closeBtn = overlay.querySelector('.mermaid-btn-close');
    if (closeBtn) closeBtn.focus();
  }

  return { open, close };
})();

/**
 * Build interactive container wrapping rendered SVG and toggleable source code.
 */
function buildDiagramContainer(svgMarkup, bindFunctions, source) {
  const container = document.createElement('div');
  container.className = 'mermaid-container';

  const toolbar = document.createElement('div');
  toolbar.className = 'mermaid-toolbar';

  const badge = document.createElement('span');
  badge.className = 'mermaid-badge';
  badge.textContent = 'Mermaid';

  const actions = document.createElement('div');
  actions.className = 'mermaid-actions';

  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'mermaid-btn';
  toggleBtn.textContent = '源码';
  toggleBtn.setAttribute('aria-pressed', 'false');

  const zoomBtn = document.createElement('button');
  zoomBtn.type = 'button';
  zoomBtn.className = 'mermaid-btn';
  zoomBtn.textContent = '放大查看';

  actions.append(toggleBtn, zoomBtn);
  toolbar.append(badge, actions);

  const stage = document.createElement('div');
  stage.className = 'mermaid-stage';
  stage.innerHTML = svgMarkup;
  if (typeof bindFunctions === 'function') {
    bindFunctions(stage);
  }

  const sourceWrap = document.createElement('div');
  sourceWrap.className = 'mermaid-source';
  sourceWrap.hidden = true;

  const pre = document.createElement('pre');
  const code = document.createElement('code');
  code.textContent = source;
  pre.appendChild(code);
  sourceWrap.appendChild(pre);

  toggleBtn.addEventListener('click', () => {
    const showingSource = !sourceWrap.hidden;
    sourceWrap.hidden = showingSource;
    stage.hidden = !showingSource;
    zoomBtn.disabled = !showingSource;
    toggleBtn.textContent = showingSource ? '源码' : '图表';
    toggleBtn.setAttribute('aria-pressed', String(!showingSource));
  });

  zoomBtn.addEventListener('click', () => {
    const svgEl = stage.querySelector('svg');
    if (svgEl) {
      lightbox.open(svgEl, zoomBtn);
    }
  });

  container.append(toolbar, stage, sourceWrap);
  return container;
}

/**
 * Attach non-destructive error notice while preserving original source block.
 */
function renderErrorFallback(wrapper, error) {
  const banner = document.createElement('div');
  banner.className = 'mermaid-error-banner';
  banner.setAttribute('role', 'alert');

  const summary = document.createElement('span');
  summary.textContent = 'Mermaid 图表渲染失败，已保留原始源码。';
  banner.appendChild(summary);

  if (error && error.message) {
    banner.title = error.message;
  }

  if (wrapper.parentNode) {
    wrapper.parentNode.insertBefore(banner, wrapper);
  }
}

async function initMermaid() {
  const blocks = collectMermaidBlocks();
  if (blocks.length === 0) {
    return;
  }

  let mermaid;
  try {
    mermaid = await loadMermaid();
  } catch (err) {
    console.warn('[mermaid] Unable to load Mermaid runtime; keeping raw code blocks.', err);
    return;
  }

  mermaid.initialize(MERMAID_CONFIG);

  const runToken = Date.now().toString(36);
  for (let i = 0; i < blocks.length; i += 1) {
    const { wrapper, source } = blocks[i];
    const renderId = `mermaid-svg-${runToken}-${i}`;

    try {
      const { svg, bindFunctions } = await mermaid.render(renderId, source);
      const container = buildDiagramContainer(svg, bindFunctions, source);
      if (wrapper.parentNode) {
        wrapper.parentNode.replaceChild(container, wrapper);
      }
    } catch (err) {
      // Remove any stray error SVG Mermaid v11 may append to document.body
      const strayEl = document.getElementById(`d${renderId}`);
      if (strayEl && strayEl.parentNode) {
        strayEl.parentNode.removeChild(strayEl);
      }
      console.warn(`[mermaid] Diagram #${i + 1} failed to render:`, err);
      renderErrorFallback(wrapper, err);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    void initMermaid();
  });
} else {
  void initMermaid();
}
