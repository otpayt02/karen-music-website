/**
 * print-preview.js
 * Karen Music Director — Print Template Switcher & Live Preview
 * -------------------------------------------------------------
 * Spec §6: Font / spacing / layout templates with live preview.
 * Does NOT touch any chord logic, editor state, or save/load.
 *
 * Templates defined here match the CSS variables in print-overrides.css.
 */

(function () {
  'use strict';

  /* ----------------------------------------------------------
     TEMPLATE DEFINITIONS
     Each entry maps to a [data-print-template] CSS class.
  ---------------------------------------------------------- */
  const TEMPLATES = [
    {
      id: 'classic',
      label: 'Classic',
      description: 'Fraunces titles · Instrument Sans body · balanced spacing',
      fontTitle: 'Fraunces',
      fontBody:  'Instrument Sans',
      fontSize:  '9.5pt',
      lineHeight: '1.25',
    },
    {
      id: 'clean-sans',
      label: 'Clean Sans',
      description: 'All-sans · tighter spacing · minimal',
      fontTitle: 'Instrument Sans',
      fontBody:  'Instrument Sans',
      fontSize:  '9pt',
      lineHeight: '1.2',
    },
    {
      id: 'mono-compact',
      label: 'Mono Compact',
      description: 'IBM Plex Mono throughout · maximum density',
      fontTitle: 'IBM Plex Mono',
      fontBody:  'IBM Plex Mono',
      fontSize:  '8.5pt',
      lineHeight: '1.15',
    },
    {
      id: 'airy',
      label: 'Airy',
      description: 'Fraunces titles · larger text · more breathing room',
      fontTitle: 'Fraunces',
      fontBody:  'Instrument Sans',
      fontSize:  '10pt',
      lineHeight: '1.4',
    },
    {
      id: 'myanmar-focus',
      label: 'Myanmar Focus',
      description: 'Noto Sans Myanmar throughout · Karen-script optimized',
      fontTitle: 'Noto Sans Myanmar',
      fontBody:  'Noto Sans Myanmar',
      fontSize:  '10pt',
      lineHeight: '1.3',
    },
  ];

  let activeTemplate = 'classic';

  /* ----------------------------------------------------------
     APPLY TEMPLATE
     Sets data-print-template on <html> so CSS vars kick in.
     Also injects inline CSS vars for immediate screen preview.
  ---------------------------------------------------------- */
  function applyTemplate(templateId) {
    const tpl = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0];
    activeTemplate = tpl.id;

    // Set attribute on <html> — CSS in print-overrides.css picks it up
    document.documentElement.setAttribute('data-print-template', tpl.id);

    // Also set inline CSS custom properties so preview panel reflects change instantly
    const root = document.documentElement;
    root.style.setProperty('--print-font-body',   `'${tpl.fontBody}', sans-serif`);
    root.style.setProperty('--print-font-title',  `'${tpl.fontTitle}', serif`);
    root.style.setProperty('--print-font-size',   tpl.fontSize);
    root.style.setProperty('--print-line-height', tpl.lineHeight);

    // Update active state on any rendered buttons
    document.querySelectorAll('.template-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.templateId === tpl.id);
    });

    // Persist choice for session
    try { window._printTemplate = tpl.id; } catch(e) {}
  }

  /* ----------------------------------------------------------
     BUILD TEMPLATE SWITCHER PANEL
     Renders a list of template buttons.
     Call renderTemplateSwitcher(containerEl) to inject.
  ---------------------------------------------------------- */
  function renderTemplateSwitcher(container) {
    if (!container) return;
    container.innerHTML = '';

    const panel = document.createElement('div');
    panel.className = 'print-template-panel';

    const heading = document.createElement('h4');
    heading.textContent = 'Print Templates';
    panel.appendChild(heading);

    TEMPLATES.forEach(tpl => {
      const btn = document.createElement('button');
      btn.className = 'template-option' + (tpl.id === activeTemplate ? ' active' : '');
      btn.dataset.templateId = tpl.id;
      btn.title = tpl.description;
      btn.innerHTML = `
        <span class="template-thumb" aria-hidden="true">
          <span class="t-line"></span>
          <span class="t-line"></span>
          <span class="t-line"></span>
        </span>
        <span class="template-label">${tpl.label}</span>
      `;
      btn.addEventListener('click', () => {
        applyTemplate(tpl.id);
        // If preview is open, refresh it
        if (document.getElementById('print-preview-overlay')?.classList.contains('open')) {
          refreshPreview();
        }
      });
      panel.appendChild(btn);
    });

    container.appendChild(panel);
  }

  /* ----------------------------------------------------------
     PRINT PREVIEW OVERLAY
     Clones the print area into a white A4-sized div so the
     user can see exactly what will print — including fonts,
     spacing, color coding — before hitting Ctrl+P.
  ---------------------------------------------------------- */
  function buildPreviewOverlay() {
    if (document.getElementById('print-preview-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'print-preview-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Print preview');

    overlay.innerHTML = `
      <div id="print-preview-inner">
        <button id="preview-close-btn" aria-label="Close preview">✕</button>
        <div id="preview-content"></div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.addEventListener('click', e => {
      if (e.target === overlay) closePreview();
    });
    overlay.querySelector('#preview-close-btn').addEventListener('click', closePreview);

    // Close on Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closePreview();
    });
  }

  function getPrintArea() {
    return (
      document.querySelector('.print-area') ||
      document.getElementById('print-area') ||
      document.querySelector('.chart-print-wrapper') ||
      document.querySelector('.chart-container') ||
      document.querySelector('main')
    );
  }

  function refreshPreview() {
    const src = getPrintArea();
    const dest = document.getElementById('preview-content');
    if (!src || !dest) return;

    // Deep clone — images included, scripts excluded
    const clone = src.cloneNode(true);

    // Remove non-print elements from clone
    clone.querySelectorAll('.no-print, .editor-toolbar, button:not(.print-keep), .sidebar, nav, .modal, .overlay').forEach(el => el.remove());

    // Apply template font vars to clone via inline style
    const tpl = TEMPLATES.find(t => t.id === activeTemplate) || TEMPLATES[0];
    clone.style.fontFamily  = `'${tpl.fontBody}', sans-serif`;
    clone.style.fontSize    = tpl.fontSize;
    clone.style.lineHeight  = tpl.lineHeight;

    dest.innerHTML = '';
    dest.appendChild(clone);
  }

  function openPreview() {
    buildPreviewOverlay();
    refreshPreview();
    const overlay = document.getElementById('print-preview-overlay');
    if (overlay) {
      overlay.classList.add('open');
      overlay.focus();
    }
  }

  function closePreview() {
    const overlay = document.getElementById('print-preview-overlay');
    if (overlay) overlay.classList.remove('open');
  }

  /* ----------------------------------------------------------
     INJECT PREVIEW + TEMPLATE BUTTONS into existing print
     toolbar if present, otherwise append to body.
  ---------------------------------------------------------- */
  function injectUI() {
    // Look for existing print toolbar / print button area
    const printBtn = (
      document.querySelector('[data-action="print"]') ||
      document.querySelector('.print-btn') ||
      document.querySelector('#print-btn') ||
      document.querySelector('button.print') ||
      // fall back: find any button whose text includes 'print'
      Array.from(document.querySelectorAll('button')).find(b =>
        /print/i.test(b.textContent) || /print/i.test(b.dataset.action || '')
      )
    );

    // ── Template switcher container ──
    let switcherContainer = document.getElementById('print-template-switcher');
    if (!switcherContainer) {
      switcherContainer = document.createElement('div');
      switcherContainer.id = 'print-template-switcher';
      switcherContainer.className = 'no-print';

      if (printBtn && printBtn.parentElement) {
        printBtn.parentElement.insertBefore(switcherContainer, printBtn.nextSibling);
      } else {
        // Fallback: float panel in bottom-right corner
        switcherContainer.style.cssText = [
          'position:fixed', 'bottom:80px', 'right:16px',
          'z-index:9000', 'max-width:220px',
        ].join(';');
        document.body.appendChild(switcherContainer);
      }
    }
    renderTemplateSwitcher(switcherContainer);

    // ── Preview button ──
    if (!document.getElementById('print-preview-btn')) {
      const previewBtn = document.createElement('button');
      previewBtn.id = 'print-preview-btn';
      previewBtn.className = 'no-print';
      previewBtn.textContent = '👁 Preview Print';
      previewBtn.style.cssText = [
        'display:inline-flex', 'align-items:center', 'gap:6px',
        'padding:6px 14px', 'border-radius:6px',
        'background:#2a2a2a', 'border:1px solid #444',
        'color:#ccc', 'font-size:0.82em', 'cursor:pointer',
        'margin-left:8px',
      ].join(';');
      previewBtn.addEventListener('click', openPreview);

      if (printBtn && printBtn.parentElement) {
        printBtn.parentElement.insertBefore(previewBtn, printBtn.nextSibling);
      } else {
        document.body.appendChild(previewBtn);
      }
    }
  }

  /* ----------------------------------------------------------
     OVERRIDE BPM LOCATION
     Moves BPM from header to footer at print time by:
     1. Hiding .header-bpm / .print-bpm-header (done in CSS)
     2. Injecting a .footer-bpm span into .print-footer if absent
  ---------------------------------------------------------- */
  function moveBpmToFooter() {
    const footer = (
      document.querySelector('.print-footer') ||
      document.getElementById('print-footer') ||
      document.querySelector('.song-print-footer')
    );
    if (!footer) return;

    if (footer.querySelector('.footer-bpm')) return; // already there

    // Try to read BPM from header element or song data
    const headerBpm = (
      document.querySelector('.header-bpm') ||
      document.querySelector('.header-tempo') ||
      document.querySelector('.print-bpm-header') ||
      document.querySelector('[data-print-field="tempo"]')
    );

    const bpmText = headerBpm
      ? headerBpm.textContent.trim()
      : (window._currentSong?.tempo ? window._currentSong.tempo + ' BPM' : '');

    if (!bpmText) return;

    const bpmSpan = document.createElement('span');
    bpmSpan.className = 'footer-bpm print-bpm-footer';
    bpmSpan.textContent = bpmText;
    footer.appendChild(bpmSpan);
  }

  /* ----------------------------------------------------------
     KOREAN TITLE PRIORITY
     Ensures the Karen (Myanmar) title renders first in the
     DOM order inside the title block, so it prints on top.
  ---------------------------------------------------------- */
  function reorderTitleBlock() {
    const blocks = document.querySelectorAll(
      '.print-title-block, .song-print-title-block'
    );
    blocks.forEach(block => {
      const karen = block.querySelector(
        '.print-title-karen, .song-title-karen-print'
      );
      const english = block.querySelector(
        '.print-title-english, .song-title-english-print, .print-title, .song-print-title'
      );
      if (karen && english && block.firstElementChild !== karen) {
        block.insertBefore(karen, block.firstChild);
      }
    });
  }

  /* ----------------------------------------------------------
     INIT  — run after DOM is ready
  ---------------------------------------------------------- */
  function init() {
    applyTemplate(activeTemplate);
    injectUI();
    moveBpmToFooter();
    reorderTitleBlock();

    // Re-run BPM + title order whenever a song loads
    // Listen for any custom song-loaded / song-rendered events
    const events = ['song-loaded', 'songLoaded', 'chart-rendered', 'printReady'];
    events.forEach(evt => {
      document.addEventListener(evt, () => {
        moveBpmToFooter();
        reorderTitleBlock();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ----------------------------------------------------------
     PUBLIC API  (window.PrintPreview)
  ---------------------------------------------------------- */
  window.PrintPreview = {
    applyTemplate,
    openPreview,
    closePreview,
    refreshPreview,
    renderTemplateSwitcher,
    moveBpmToFooter,
    reorderTitleBlock,
    getTemplates: () => TEMPLATES,
    getActive:    () => activeTemplate,
  };

}());
