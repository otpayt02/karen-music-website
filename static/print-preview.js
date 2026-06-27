/*
  ============================================================
  KAREN MUSIC WEBSITE — PRINT PREVIEW (print-preview.js)
  Version 2.0 — All visual-only. Zero logic/data changes.
  ============================================================
  Injects:
    · #print-preview-btn  (fixed "Print Preview" button)
    · #print-preview-overlay  (backdrop)
    · #print-preview-drawer   (side panel with controls)
    · #position-tracker-stub  (stub for a future feature)

  Reads BPM from the song chart and moves it to the footer.
  Applies CSS variable overrides to .chart-container for live preview.
  ============================================================
*/

(function () {
  'use strict';

  /* -----------------------------------------------------------
     TEMPLATES (Items 15-16)
     5 distinct layout/style templates.
  ----------------------------------------------------------- */
  const TEMPLATES = [
    {
      id:   'clean',
      name: 'Clean',
      desc: 'Sans-serif, tight',
      vars: {
        '--pt-font':                   '"Instrument Sans", "Helvetica Neue", Arial, sans-serif',
        '--pt-leading':                '1.2',
        '--pt-section-style':          'normal',
        '--pt-section-style-transform':'uppercase',
        '--pt-section-style-italic':   'normal',
        '--pt-size':                   '0.82em',
      },
    },
    {
      id:   'church-bulletin',
      name: 'Church Bulletin',
      desc: 'Serif, classic spacing',
      vars: {
        '--pt-font':                   '"Fraunces", "Georgia", "Times New Roman", serif',
        '--pt-leading':                '1.35',
        '--pt-section-style':          'small-caps',
        '--pt-section-style-transform':'none',
        '--pt-section-style-italic':   'normal',
        '--pt-size':                   '0.84em',
      },
    },
    {
      id:   'minimal',
      name: 'Minimal',
      desc: 'Mono, very compact',
      vars: {
        '--pt-font':                   '"IBM Plex Mono", "Courier New", Courier, monospace',
        '--pt-leading':                '1.1',
        '--pt-section-style':          'normal',
        '--pt-section-style-transform':'uppercase',
        '--pt-section-style-italic':   'normal',
        '--pt-size':                   '0.78em',
      },
    },
    {
      id:   'bold',
      name: 'Bold',
      desc: 'High contrast, airy',
      vars: {
        '--pt-font':                   '"Instrument Sans", "Helvetica Neue", Arial, sans-serif',
        '--pt-leading':                '1.45',
        '--pt-section-style':          'normal',
        '--pt-section-style-transform':'uppercase',
        '--pt-section-style-italic':   'normal',
        '--pt-size':                   '0.88em',
      },
    },
    {
      id:   'classic',
      name: 'Classic',
      desc: 'Fraunces, wide leading',
      vars: {
        '--pt-font':                   '"Fraunces", "Palatino Linotype", "Book Antiqua", Palatino, serif',
        '--pt-leading':                '1.5',
        '--pt-section-style':          'small-caps',
        '--pt-section-style-transform':'none',
        '--pt-section-style-italic':   'italic',
        '--pt-size':                   '0.85em',
      },
    },
  ];

  /* -----------------------------------------------------------
     STATE
  ----------------------------------------------------------- */
  const state = {
    activeTemplate: null,
    font:    null,
    leading: null,
    sectionStyle: null,
    committed: {},
  };

  /* -----------------------------------------------------------
     HELPERS
  ----------------------------------------------------------- */
  function getChartContainer() {
    return document.querySelector('#print-batch .chart-container') ||
           document.querySelector('.chart-container') ||
           document.querySelector('#print-batch');
  }

  function applyVars(vars) {
    const el = getChartContainer();
    if (!el) return;
    Object.entries(vars).forEach(([k, v]) => el.style.setProperty(k, v));
  }

  function clearAllVars() {
    const el = getChartContainer();
    if (!el) return;
    const allKeys = TEMPLATES.flatMap(t => Object.keys(t.vars));
    const dedupe = [...new Set(allKeys)];
    dedupe.forEach(k => el.style.removeProperty(k));
  }

  /* -----------------------------------------------------------
     BPM -> FOOTER (Item 7)
     Reads beats-per-measure value and injects into footer center.
  ----------------------------------------------------------- */
  function moveBpmToFooter() {
    const bpmSources = [
      '[data-field="beats_per_measure"]',
      '.paper-bpm',
      '.ph-bpm-center',
      '[data-bpm]',
    ];
    let bpmText = '';
    for (const sel of bpmSources) {
      const el = document.querySelector('#print-batch ' + sel);
      if (el) {
        bpmText = (el.dataset.bpm || el.textContent || '').trim();
        if (bpmText) break;
      }
    }

    const batch = document.querySelector('#print-batch');
    if (!bpmText && batch) {
      bpmText = batch.dataset.bpm || batch.dataset.beatsPerMeasure || '';
    }

    if (!bpmText) return;

    const footer = document.querySelector('#print-batch .paper-footer');
    if (!footer) return;

    let slot = footer.querySelector('#ph-footer-center');
    if (!slot) {
      slot = document.createElement('div');
      slot.id = 'ph-footer-center';
      slot.className = 'ph-footer-center';
      const children = footer.children;
      if (children.length >= 2) {
        footer.insertBefore(slot, children[1]);
      } else {
        footer.appendChild(slot);
      }
    }
    slot.textContent = '\u2669 = ' + bpmText + ' beats/measure';
  }

  /* -----------------------------------------------------------
     SECTION COLOR DATA ATTRIBUTE INJECTION (Item 13)
     Infers section type from label text if not already set.
  ----------------------------------------------------------- */
  function injectSectionTypes() {
    const sections = document.querySelectorAll('#print-batch .section');
    sections.forEach(sec => {
      if (sec.dataset.sectionType) return;
      const label = sec.querySelector('.section-header, .section-title, .section-name, [data-role="section-label"]');
      if (!label) return;
      const text = label.textContent.trim().toLowerCase().replace(/[^a-z\s]/g, '').trim();
      let type = 'default';
      if (/verse/.test(text))                          type = 'verse';
      else if (/chorus/.test(text))                    type = 'chorus';
      else if (/pre.?chorus|prechorus/.test(text))     type = 'pre-chorus';
      else if (/intro/.test(text))                     type = 'intro';
      else if (/outro/.test(text))                     type = 'outro';
      else if (/ending/.test(text))                    type = 'ending';
      else if (/bridge/.test(text))                    type = 'bridge';
      else if (/solo/.test(text))                      type = 'solo';
      sec.setAttribute('data-section-type', type);
      sec.setAttribute('data-stype', type);
    });
  }

  /* -----------------------------------------------------------
     POSITION TRACKER STUB (Item 19)
  ----------------------------------------------------------- */
  function injectPositionTrackerStub() {
    if (document.getElementById('position-tracker-stub')) return;
    const toolbar = document.querySelector('.song-actions, .print-actions, .action-bar, .toolbar');
    const stub = document.createElement('button');
    stub.id = 'position-tracker-stub';
    stub.disabled = true;
    stub.title = 'Coming soon \u2014 track instrument positions on stage';
    stub.textContent = 'Position Tracker \u2014 Coming Soon';
    if (toolbar) {
      toolbar.appendChild(stub);
    } else {
      stub.style.cssText = 'position:fixed;bottom:20px;left:20px;z-index:8000;';
      document.body.appendChild(stub);
    }
  }

  /* -----------------------------------------------------------
     DRAWER HTML (Items 15-18)
  ----------------------------------------------------------- */
  function buildDrawer() {
    const FONT_OPTIONS = [
      { value: '"IBM Plex Mono","Courier New",monospace',             label: 'Monospace (default)' },
      { value: '"Instrument Sans","Helvetica Neue",Arial,sans-serif', label: 'Instrument Sans' },
      { value: '"Fraunces","Georgia","Times New Roman",serif',        label: 'Fraunces (Serif)' },
      { value: '"Fraunces","Palatino Linotype","Book Antiqua",serif', label: 'Classic Serif' },
      { value: '"Noto Sans Myanmar",sans-serif',                      label: 'Noto Myanmar' },
    ];

    const SECTION_STYLE_OPTIONS = [
      { value: 'normal',      label: 'Normal' },
      { value: 'small-caps',  label: 'Small Caps' },
      { value: 'uppercase',   label: 'ALL CAPS' },
      { value: 'italic',      label: 'Italic' },
    ];

    const templateGrid = TEMPLATES.map(t =>
      '<button class="ppv-template-btn" data-template="' + t.id + '" aria-label="Template: ' + t.name + '">' +
      '<span class="ppv-template-name">' + t.name + '</span>' +
      '<span class="ppv-template-desc">' + t.desc + '</span>' +
      '</button>'
    ).join('');

    const fontOptions = FONT_OPTIONS.map(o =>
      '<option value="' + o.value + '">' + o.label + '</option>'
    ).join('');

    const sectionOptions = SECTION_STYLE_OPTIONS.map(o =>
      '<option value="' + o.value + '">' + o.label + '</option>'
    ).join('');

    return [
      '<div id="print-preview-overlay" role="dialog" aria-modal="true" aria-label="Print Preview Panel">',
      '  <div id="print-preview-drawer">',
      '    <div id="print-preview-header">',
      '      <h3>\uD83D\uDDA8 Print Preview</h3>',
      '      <button id="print-preview-close" aria-label="Close preview panel">\u2715</button>',
      '    </div>',
      '    <div id="print-preview-body">',
      '      <div class="ppv-group">',
      '        <span class="ppv-label">Templates</span>',
      '        <div class="ppv-templates">' + templateGrid + '</div>',
      '      </div>',
      '      <div class="ppv-group">',
      '        <label class="ppv-label" for="ppv-font">Font Family</label>',
      '        <select id="ppv-font" class="ppv-control">' + fontOptions + '</select>',
      '      </div>',
      '      <div class="ppv-group">',
      '        <label class="ppv-label" for="ppv-leading">',
      '          Line Spacing <span id="ppv-leading-val" style="float:right;color:#9999cc">1.25</span>',
      '        </label>',
      '        <input id="ppv-leading" class="ppv-control" type="range" min="1.0" max="2.0" step="0.05" value="1.25">',
      '      </div>',
      '      <div class="ppv-group">',
      '        <label class="ppv-label" for="ppv-section-style">Section Label Style</label>',
      '        <select id="ppv-section-style" class="ppv-control">' + sectionOptions + '</select>',
      '      </div>',
      '    </div>',
      '    <div id="print-preview-footer">',
      '      <button id="ppv-reset-btn" type="button">Reset</button>',
      '      <button id="ppv-apply-btn" type="button">Apply to Print</button>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('\n');
  }

  /* -----------------------------------------------------------
     TRIGGER BUTTON
  ----------------------------------------------------------- */
  function buildBtn() {
    const btn = document.createElement('button');
    btn.id = 'print-preview-btn';
    btn.setAttribute('aria-label', 'Open print preview panel');
    btn.textContent = '\uD83D\uDDA8 Preview';
    return btn;
  }

  /* -----------------------------------------------------------
     LIVE-PREVIEW APPLIER
  ----------------------------------------------------------- */
  function applyLive() {
    const el = getChartContainer();
    if (!el) return;

    const fontSel = document.getElementById('ppv-font');
    if (fontSel && fontSel.value)
      el.style.setProperty('--pt-font', fontSel.value);

    const leadingInput = document.getElementById('ppv-leading');
    if (leadingInput)
      el.style.setProperty('--pt-leading', leadingInput.value);

    const styleSel = document.getElementById('ppv-section-style');
    if (styleSel) {
      const val = styleSel.value;
      if (val === 'uppercase') {
        el.style.setProperty('--pt-section-style', 'normal');
        el.style.setProperty('--pt-section-style-transform', 'uppercase');
        el.style.setProperty('--pt-section-style-italic', 'normal');
      } else if (val === 'italic') {
        el.style.setProperty('--pt-section-style', 'normal');
        el.style.setProperty('--pt-section-style-transform', 'none');
        el.style.setProperty('--pt-section-style-italic', 'italic');
      } else {
        el.style.setProperty('--pt-section-style', val);
        el.style.setProperty('--pt-section-style-transform', 'none');
        el.style.setProperty('--pt-section-style-italic', 'normal');
      }
    }
  }

  /* -----------------------------------------------------------
     APPLY TEMPLATE
  ----------------------------------------------------------- */
  function applyTemplate(id) {
    const t = TEMPLATES.find(t => t.id === id);
    if (!t) return;
    applyVars(t.vars);
    state.activeTemplate = id;

    const fontSel = document.getElementById('ppv-font');
    if (fontSel && t.vars['--pt-font']) fontSel.value = t.vars['--pt-font'];

    const leadingInput = document.getElementById('ppv-leading');
    const leadingVal   = document.getElementById('ppv-leading-val');
    if (leadingInput && t.vars['--pt-leading']) {
      leadingInput.value = t.vars['--pt-leading'];
      if (leadingVal) leadingVal.textContent = t.vars['--pt-leading'];
    }

    const styleSel = document.getElementById('ppv-section-style');
    if (styleSel) {
      if (t.vars['--pt-section-style-transform'] === 'uppercase') styleSel.value = 'uppercase';
      else if (t.vars['--pt-section-style-italic'] === 'italic') styleSel.value = 'italic';
      else styleSel.value = t.vars['--pt-section-style'] || 'normal';
    }

    document.querySelectorAll('.ppv-template-btn').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.template === id);
    });
  }

  /* -----------------------------------------------------------
     RESET
  ----------------------------------------------------------- */
  function resetAll() {
    clearAllVars();
    state.activeTemplate = null;
    document.querySelectorAll('.ppv-template-btn').forEach(b => b.classList.remove('is-active'));
    const leadingInput = document.getElementById('ppv-leading');
    const leadingVal   = document.getElementById('ppv-leading-val');
    if (leadingInput) { leadingInput.value = '1.25'; }
    if (leadingVal)   { leadingVal.textContent = '1.25'; }
    const fontSel = document.getElementById('ppv-font');
    if (fontSel) fontSel.selectedIndex = 0;
    const styleSel = document.getElementById('ppv-section-style');
    if (styleSel) styleSel.selectedIndex = 0;
  }

  /* -----------------------------------------------------------
     COMMIT APPLIED STYLES
  ----------------------------------------------------------- */
  function commitStyles() {
    const el = getChartContainer();
    if (!el) return;
    const vars = {};
    ['--pt-font','--pt-leading','--pt-section-style',
     '--pt-section-style-transform','--pt-section-style-italic','--pt-size'
    ].forEach(k => {
      const v = el.style.getPropertyValue(k);
      if (v) vars[k] = v;
    });

    state.committed = vars;

    let styleTag = document.getElementById('ppv-committed-styles');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'ppv-committed-styles';
      document.head.appendChild(styleTag);
    }
    const rules = Object.entries(vars).map(([k, v]) => k + ': ' + v + ';').join('\n  ');
    styleTag.textContent = rules
      ? '#print-batch .chart-container,\n.chart-container {\n  ' + rules + '\n}'
      : '';
  }

  /* -----------------------------------------------------------
     DRAWER OPEN / CLOSE
  ----------------------------------------------------------- */
  function openDrawer() {
    const overlay = document.getElementById('print-preview-overlay');
    if (overlay) overlay.classList.add('open');
    injectSectionTypes();
    moveBpmToFooter();
  }

  function closeDrawer() {
    const overlay = document.getElementById('print-preview-overlay');
    if (overlay) overlay.classList.remove('open');
  }

  /* -----------------------------------------------------------
     WIRE UP EVENT LISTENERS
  ----------------------------------------------------------- */
  function wireEvents() {
    const btn = document.getElementById('print-preview-btn');
    if (btn) btn.addEventListener('click', openDrawer);

    const closeBtn = document.getElementById('print-preview-close');
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

    const overlay = document.getElementById('print-preview-overlay');
    if (overlay) {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) closeDrawer();
      });
    }

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeDrawer();
    });

    document.querySelectorAll('.ppv-template-btn').forEach(btn => {
      btn.addEventListener('click', () => applyTemplate(btn.dataset.template));
    });

    const fontSel = document.getElementById('ppv-font');
    if (fontSel) fontSel.addEventListener('change', applyLive);

    const leadingInput = document.getElementById('ppv-leading');
    const leadingVal   = document.getElementById('ppv-leading-val');
    if (leadingInput) {
      leadingInput.addEventListener('input', () => {
        if (leadingVal) leadingVal.textContent = leadingInput.value;
        applyLive();
      });
    }

    const styleSel = document.getElementById('ppv-section-style');
    if (styleSel) styleSel.addEventListener('change', applyLive);

    const resetBtn = document.getElementById('ppv-reset-btn');
    if (resetBtn) resetBtn.addEventListener('click', resetAll);

    const applyBtn = document.getElementById('ppv-apply-btn');
    if (applyBtn) applyBtn.addEventListener('click', () => {
      commitStyles();
      closeDrawer();
    });
  }

  /* -----------------------------------------------------------
     INIT
  ----------------------------------------------------------- */
  function init() {
    if (document.getElementById('print-preview-btn')) return;

    document.body.appendChild(buildBtn());

    const drawerWrapper = document.createElement('div');
    drawerWrapper.innerHTML = buildDrawer();
    document.body.appendChild(drawerWrapper.firstElementChild);

    injectPositionTrackerStub();
    wireEvents();

    setTimeout(() => {
      moveBpmToFooter();
      injectSectionTypes();
    }, 800);

    const observer = new MutationObserver(() => {
      moveBpmToFooter();
      injectSectionTypes();
    });
    const batch = document.getElementById('print-batch') || document.body;
    observer.observe(batch, { childList: true, subtree: true });
  }

  /* -----------------------------------------------------------
     BOOTSTRAP
  ----------------------------------------------------------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 0);
  }

})();
