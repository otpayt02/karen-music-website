/**
 * print-preview.js  v2
 * Karen Music Director — Print Preview & Template Switcher
 * ---------------------------------------------------------
 * FIXED: Preview was empty because getPrintArea() couldn't find
 * the right container. Now we build the full print document
 * from scratch by reading all live DOM fields directly.
 *
 * Rules from spec (June 2026):
 *  - Header:   Karen title (big/bold) → English title (small, parentheses)
 *              Song style (same size as Karen title)
 *              NO dates, NO original key, NO Karen translations except title
 *  - Footer:   BPM on the LEFT  |  Category/instruments on the RIGHT
 *              No divider line between footer and body
 *  - Body:     Full chord chart — sections color-coded
 *  - Sidebar:  date created, date performed, original key live there only
 */

(function () {
  'use strict';

  /* ──────────────────────────────────────────────────────────
     TEMPLATES
  ────────────────────────────────────────────────────────── */
  const TEMPLATES = [
    ['clean-mono','Clean Mono','IBM Plex Mono','Instrument Sans','8.8pt','1.18'],
    ['church-bulletin','Church Bulletin','Fraunces','Instrument Sans','9.5pt','1.28'],
    ['minimal','Minimal','Instrument Sans','Instrument Sans','9pt','1.24'],
    ['bold-impact','Bold Impact','Instrument Sans','IBM Plex Mono','9.6pt','1.16'],
    ['handwritten','Handwritten Feel','Fraunces','Instrument Sans','9.8pt','1.32'],
    ['newspaper','Newspaper','Fraunces','IBM Plex Mono','8.8pt','1.2'],
    ['jazz-club','Jazz Club','Fraunces','Instrument Sans','9.4pt','1.3'],
    ['kids-youth','Kids / Youth','Instrument Sans','Instrument Sans','10pt','1.34'],
    ['rehearsal','Rehearsal Sheet','IBM Plex Mono','IBM Plex Mono','8.5pt','1.14'],
    ['modern-worship','Modern Worship','Instrument Sans','Instrument Sans','9.6pt','1.3'],
    ['hymnal','Hymnal Classic','Fraunces','Noto Sans Myanmar','9.3pt','1.26'],
    ['lofi-draft','Lo-Fi Draft','IBM Plex Mono','IBM Plex Mono','8.7pt','1.2'],
    ['score-sheet','Score Sheet','Fraunces','IBM Plex Mono','8.8pt','1.16'],
    ['presentation','Presentation','Instrument Sans','Instrument Sans','11pt','1.42'],
    ['night-session','Night Session','Instrument Sans','IBM Plex Mono','9.2pt','1.25'],
    ['archive','Archive','Fraunces','Instrument Sans','9pt','1.2'],
    ['orchestra','Orchestra','Fraunces','Fraunces','10pt','1.34'],
    ['songwriter','Songwriter','Instrument Sans','Fraunces','9.4pt','1.28'],
    ['blueprint','Blueprint','IBM Plex Mono','Fraunces','8.9pt','1.19'],
  ].map(([id,label,fontTitle,fontBody,fontSize,lineHeight]) => ({id,label,fontTitle,fontBody,fontSize,lineHeight}));

  const STYLE_PRESETS = [
    { id: 'classic', label: 'Classic Ledger', template: 'clean-mono', fontBody: 'Instrument Sans', fontTitle: 'Fraunces', fontSize: '9.5pt', lineHeight: '1.25', sectionStyle: 'bold', bodyScale: '1', titleScale: '1' },
    { id: 'clean', label: 'Clean Panel', template: 'clean-mono', fontBody: 'Instrument Sans', fontTitle: 'Instrument Sans', fontSize: '9pt', lineHeight: '1.2', sectionStyle: 'caps', bodyScale: '0.94', titleScale: '0.96' },
    { id: 'church', label: 'Church Bulletin', template: 'church-bulletin', fontBody: 'Fraunces', fontTitle: 'Fraunces', fontSize: '9.6pt', lineHeight: '1.28', sectionStyle: 'italic', bodyScale: '1.04', titleScale: '1.03' },
    { id: 'minimal', label: 'Minimal Sheet', template: 'minimal', fontBody: 'Instrument Sans', fontTitle: 'Instrument Sans', fontSize: '8.9pt', lineHeight: '1.16', sectionStyle: 'smallcaps', bodyScale: '0.9', titleScale: '0.94' },
    { id: 'bold', label: 'Bold Console', template: 'bold-impact', fontBody: 'Instrument Sans', fontTitle: 'Instrument Sans', fontSize: '9.6pt', lineHeight: '1.16', sectionStyle: 'bold', bodyScale: '1.08', titleScale: '1.12' },
    { id: 'orchestral', label: 'Orchestral', template: 'orchestra', fontBody: 'Fraunces', fontTitle: 'Fraunces', fontSize: '10pt', lineHeight: '1.34', sectionStyle: 'italic', bodyScale: '1.1', titleScale: '1.08' },
    { id: 'songwriter', label: 'Songwriter', template: 'songwriter', fontBody: 'Instrument Sans', fontTitle: 'Fraunces', fontSize: '9.4pt', lineHeight: '1.28', sectionStyle: 'smallcaps', bodyScale: '0.98', titleScale: '1.04' },
    { id: 'blueprint', label: 'Blueprint', template: 'blueprint', fontBody: 'IBM Plex Mono', fontTitle: 'Fraunces', fontSize: '8.9pt', lineHeight: '1.19', sectionStyle: 'caps', bodyScale: '0.92', titleScale: '0.98' },
  ];

  let activeTemplate = localStorage.getItem('karenMusicPrintTheme') || 'clean-mono';
  let activeTypography = {
    fontBody: 'Instrument Sans',
    fontTitle: 'Fraunces',
    fontSize: '9.5pt',
    lineHeight: '1.25',
    sectionStyle: 'bold',
    bodyScale: '1',
    titleScale: '1',
  };

  /* ──────────────────────────────────────────────────────────
     TEMPLATE APPLICATION
  ────────────────────────────────────────────────────────── */
  function applyTemplate(id) {
    const tpl = TEMPLATES.find(t => t.id === id) || TEMPLATES[0];
    activeTemplate = tpl.id;
    const root = document.documentElement;
    root.setAttribute('data-print-template', tpl.id);
    root.style.setProperty('--print-font-body',   `'${tpl.fontBody}', sans-serif`);
    root.style.setProperty('--print-font-title',  `'${tpl.fontTitle}', serif`);
    root.style.setProperty('--print-font-size',   tpl.fontSize);
    root.style.setProperty('--print-line-height', tpl.lineHeight);
    document.querySelectorAll('.template-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.templateId === tpl.id);
    });
    localStorage.setItem('karenMusicPrintTheme', tpl.id);
    try { window._printTemplate = tpl.id; } catch(e) {}
  }

  function applyLiveTypography(overrides = {}) {
    const root = document.documentElement;
    activeTypography = { ...activeTypography, ...overrides };
    if (overrides.fontBody) root.style.setProperty('--print-font-body', `'${overrides.fontBody}', sans-serif`);
    if (overrides.fontTitle) root.style.setProperty('--print-font-title', `'${overrides.fontTitle}', serif`);
    if (overrides.fontSize) root.style.setProperty('--print-font-size', overrides.fontSize);
    if (overrides.lineHeight) root.style.setProperty('--print-line-height', overrides.lineHeight);
    if (overrides.bodyScale) root.style.setProperty('--print-body-scale', overrides.bodyScale);
    if (overrides.titleScale) root.style.setProperty('--print-title-scale', overrides.titleScale);
    if (overrides.sectionStyle) root.dataset.printSectionStyle = overrides.sectionStyle;
    try { window._printTypography = { ...overrides }; } catch(e) {}
  }

  /* ──────────────────────────────────────────────────────────
     READ SONG DATA FROM LIVE DOM
     Tries every selector variant that could exist in index.html.
     Falls back to window._currentSong if JS exposes it.
  ────────────────────────────────────────────────────────── */
  function readField(selectors) {
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el) {
          const val = (el.value !== undefined ? el.value : el.textContent || '').trim();
          if (val) return val;
        }
      } catch(e) {}
    }
    return '';
  }

  function getSongData() {
    // Try window._currentSong first (set by app JS on song load)
    const cs = window._currentSong || window.currentSong || {};

    const titleKaren = readField([
      '#songTitleKaren', '#title_karen', '#titleKaren', '[name="title_karen"]',
      '.title-karen-input', '.karen-title-field',
      '#song-title-karen', '.song-title-karen',
    ]) || cs.title_karen || cs.titleKaren || '';

    const titleEnglish = readField([
      '#songTitle', '#title', '#song-title', '[name="title"]',
      '.title-input', '.english-title-field',
      '#song-title-english', '.song-title-english',
    ]) || cs.title || '';

    const style = readField([
      '#songStyle', '#style', '[name="style"]', '.style-select', '.song-style',
      '#song-style', 'select[name="style"]',
    ]) || cs.style || '';

    const tempo = readField([
      '#songTempo', '#tempo', '[name="tempo"]', '.tempo-input', '.bpm-input',
      '#bpm', '.song-tempo',
    ]) || cs.tempo || '';

    const key = readField([
      '#songKey', '#key', '#current_key', '[name="key"]', '[name="current_key"]',
      '.key-select', '.key-input', '#song-key',
    ]) || cs.current_key || cs.key || '';

    const category = readField([
      '#songCategory', '#category', '[name="category"]', '.category-select',
      '#song-category', 'select[name="category"]',
    ]) || cs.category || '';

    const beatsPerMeasure = Number(
      readField(['#songBeatsPerMeasure', '[name="beatsPerMeasure"]', '.beats-per-measure'])
      || cs.beatsPerMeasure
      || window.state?.beatsPerMeasure
      || 4
    ) || 4;

    const instruments = readField([
      '#songInstruments', '#instruments', '[name="instruments"]', '.instruments-input',
      '#song-instruments', '.song-instruments',
    ]) || cs.instruments || '';

    return { titleKaren, titleEnglish, style, tempo, key, category, instruments, beatsPerMeasure };
  }

  /* ──────────────────────────────────────────────────────────
     FIND CHORD CHART BODY
     Tries every selector that the app might use for the
     rendered chord chart area.
  ────────────────────────────────────────────────────────── */
  function getChordChartEl() {
    const candidates = [
      '#chart-output',
      '#chartOutput',
      '#chord-chart',
      '#chordChart',
      '.chart-output',
      '.chord-chart',
      '.chart-body',
      '.chart-render',
      '.print-area',
      '#print-area',
      '.chart-print-wrapper',
      '.chart-container',
      '#chart-container',
      '.chart-area',
      '#chart-area',
      '.song-chart',
      '#song-chart',
      '.render-area',
      '#render-area',
    ];
    for (const sel of candidates) {
      const el = document.querySelector(sel);
      if (el && el.children.length > 0) return el;
    }
    // Last resort: find the largest div that contains measure/chord elements
    const measureContainers = [
      ...document.querySelectorAll('div')
    ].filter(div => {
      return div.querySelector('.measure, .chord-cell, .chart-section, .section-block, .chart-row, .measure-row');
    });
    if (measureContainers.length > 0) {
      // Return the outermost one
      return measureContainers.reduce((outer, el) => {
        return outer.contains(el) ? outer : el;
      });
    }
    return null;
  }

  /* ──────────────────────────────────────────────────────────
     BUILD PRINT DOCUMENT HTML
     Constructs the full printout: header + chart body + footer.
     This is what goes into the preview overlay AND what
     @media print will render.
  ────────────────────────────────────────────────────────── */
  function buildPrintDoc(forPreview) {
    const song = getSongData();
    const tpl  = TEMPLATES.find(t => t.id === activeTemplate) || TEMPLATES[0];

    // ── Header ──────────────────────────────────────────────
    // Karen title: big + bold   (replaces where English used to be)
    // English title: small, parentheses, not bold  (replaces where Karen used to be)
    // Style: same large size as Karen title
    // Key shown small beside style
    // NO dates, NO original key, NO Karen translation rows

    const karenTitleHtml = song.titleKaren
      ? `<div class="pp-title-karen">${esc(song.titleKaren)}</div>`
      : `<div class="pp-title-karen pp-placeholder">(No Karen title)</div>`;

    const englishTitleHtml = song.titleEnglish
      ? `<div class="pp-title-english">(${esc(song.titleEnglish)})</div>`
      : '';

    const styleHtml = song.style
      ? `<div class="pp-style">${esc(song.style)}${song.key ? `<span class="pp-key"> — ${esc(song.key)}</span>` : ''}</div>`
      : (song.key ? `<div class="pp-style"><span class="pp-key">${esc(song.key)}</span></div>` : '');

    // ── Footer ──────────────────────────────────────────────
    // LEFT:  BPM
    // RIGHT: Category · Instruments

    const bpmParts = [];
    if (song.beatsPerMeasure) {
      const meter = Number(song.beatsPerMeasure) === 6 ? '6/8' : `${Number(song.beatsPerMeasure) || 4}/4`;
      bpmParts.push(esc(meter));
    }
    if (song.tempo) bpmParts.push(`${esc(song.tempo)} BPM`);
    const bpmHtml = bpmParts.length
      ? `<span class="pp-footer-bpm">${bpmParts.join(' • ')}</span>`
      : '';

    const categoryParts = [song.category].filter(Boolean);
    const categoryHtml = categoryParts.length
      ? `<span class="pp-footer-category">${categoryParts.map(esc).join(' · ')}</span>`
      : '';
    const instrumentParts = String(song.instruments || '')
      .split(/[,\n]/)
      .map(v => v.trim())
      .filter(Boolean);
    const instrumentHtml = instrumentParts.length
      ? `<details class="pp-footer-instruments" open>
           <summary>${esc('Instruments')}</summary>
           <div class="pp-footer-instruments-list">${instrumentParts.map(name => `<span>${esc(name)}</span>`).join('')}</div>
         </details>`
      : '';

    // ── Chart body ──────────────────────────────────────────
    const chartEl = getChordChartEl();
    let chartHtml = '';
    if (chartEl) {
      const clone = chartEl.cloneNode(true);
      // Strip elements that should never print
      clone.querySelectorAll([
        '.no-print',
        '.editor-toolbar',
        'button:not(.print-keep)',
        '.sidebar',
        'nav',
        '.modal',
        '.overlay',
        '.karen-translation-row',
        '.translation-row',
        '[data-role="translation"]',
        '.chord-translation',
        '.lyrics-karen',
        '.lyric-karen',
        '[data-field="date_created"]',
        '[data-field="date_performed"]',
        '[data-field="original_key"]',
        '[data-print-field="date_created"]',
        '[data-print-field="date_performed"]',
        '[data-print-field="original_key"]',
        '.print-date-created',
        '.print-date-performed',
        '.print-original-key',
        // Also strip any inline BPM/tempo in the chart header — it goes to footer
        '.header-bpm', '.header-tempo', '.print-bpm-header', '.print-tempo-header',
      ].join(',')).forEach(el => el.remove());
      clone.id = '';
      clone.classList.add('pp-page');
      clone.querySelectorAll('.paper-footer-dates').forEach(el => el.remove());
      return clone.outerHTML;
    } else {
      chartHtml = '<p class="pp-no-chart">No chord chart loaded. Open a song first, then click Preview Print.</p>';
    }

    // ── Assemble ────────────────────────────────────────────
    const fontImport = forPreview ? '' : ''; // fonts already loaded in <head>

    return `
<div class="pp-page" style="font-family:'${tpl.fontBody}',sans-serif;font-size:${tpl.fontSize};line-height:${tpl.lineHeight};color:#000;">
  <div class="pp-header">
    <div class="pp-title-block">
      ${karenTitleHtml}
      ${englishTitleHtml}
    </div>
    ${styleHtml}
  </div>
  <div class="pp-body">
    ${chartHtml}
  </div>
  <div class="pp-footer">
      <div class="pp-footer-left">${bpmHtml}</div>
    <div class="pp-footer-center">${instrumentHtml}</div>
    <div class="pp-footer-right">${categoryHtml}</div>
  </div>
</div>
    `.trim();
  }

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ──────────────────────────────────────────────────────────
     PREVIEW OVERLAY
  ────────────────────────────────────────────────────────── */
  function buildPreviewOverlay() {
    if (document.getElementById('print-preview-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'print-preview-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Print preview');

    overlay.innerHTML = `
      <div id="print-preview-inner">
        <div id="preview-toolbar">
          <span id="preview-toolbar-title">Print Preview</span>
          <div id="preview-toolbar-templates"></div>
          <button id="preview-save-changes" title="Save preview settings">Save changes</button>
          <button id="preview-print-now" title="Print now">🖨 Print</button>
          <button id="preview-close-btn" aria-label="Close preview">✕</button>
        </div>
        <div id="preview-controls" class="preview-controls">
          <label>
            <span>Theme</span>
            <select id="preview-theme-select"></select>
          </label>
          <label>
            <span>Font family</span>
            <select id="preview-font-select">
              <option value="Instrument Sans">Instrument Sans</option>
              <option value="Fraunces">Fraunces</option>
              <option value="IBM Plex Mono">IBM Plex Mono</option>
              <option value="Noto Sans Myanmar">Noto Sans Myanmar</option>
              <option value="Georgia">Georgia</option>
              <option value="Arial Narrow">Arial Narrow</option>
            </select>
          </label>
          <label>
            <span>Title family</span>
            <select id="preview-title-font-select">
              <option value="Fraunces">Fraunces</option>
              <option value="Instrument Sans">Instrument Sans</option>
              <option value="IBM Plex Mono">IBM Plex Mono</option>
              <option value="Noto Sans Myanmar">Noto Sans Myanmar</option>
              <option value="Georgia">Georgia</option>
            </select>
          </label>
          <label>
            <span>Line spacing</span>
            <input id="preview-line-spacing" type="range" min="1.05" max="1.5" step="0.01" value="1.25">
          </label>
          <label>
            <span>Section labels</span>
            <select id="preview-section-style">
              <option value="bold">Bold</option>
              <option value="italic">Italic</option>
              <option value="smallcaps">Small caps</option>
              <option value="caps">All caps</option>
            </select>
          </label>
          <label>
            <span>Body scale</span>
            <input id="preview-body-scale" type="range" min="0.86" max="1.18" step="0.01" value="1">
          </label>
        </div>
        <div id="preview-content"></div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.addEventListener('click', e => { if (e.target === overlay) closePreview(); });
    overlay.querySelector('#preview-close-btn').addEventListener('click', closePreview);
    overlay.querySelector('#preview-save-changes').addEventListener('click', () => {
      persistPreviewSettings();
      refreshPreview();
      const btn = overlay.querySelector('#preview-save-changes');
      const original = btn.textContent;
      btn.textContent = 'Saved';
      setTimeout(() => { btn.textContent = original; }, 1200);
    });
    overlay.querySelector('#preview-print-now').addEventListener('click', () => {
      closePreview();
      setTimeout(() => {
        if (typeof window.printInstrumentPackets === 'function') {
          window.printInstrumentPackets();
        } else {
          window.print();
        }
      }, 100);
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closePreview(); });

    // Render template buttons inside toolbar
    renderTemplateSwitcher(overlay.querySelector('#preview-toolbar-templates'));
    const themeSelect = overlay.querySelector('#preview-theme-select');
    const fontSelect = overlay.querySelector('#preview-font-select');
    const titleFontSelect = overlay.querySelector('#preview-title-font-select');
    const lineSpacing = overlay.querySelector('#preview-line-spacing');
    const sectionStyle = overlay.querySelector('#preview-section-style');
    const bodyScale = overlay.querySelector('#preview-body-scale');
    if (themeSelect) {
      themeSelect.innerHTML = STYLE_PRESETS.map(p => `<option value="${p.id}">${p.label}</option>`).join('');
      themeSelect.value = STYLE_PRESETS.find(p => p.template === activeTemplate)?.id || 'classic';
      themeSelect.addEventListener('change', () => {
        const preset = STYLE_PRESETS.find(p => p.id === themeSelect.value) || STYLE_PRESETS[0];
        applyTemplate(preset.template);
        applyLiveTypography(preset);
        refreshPreview();
      });
    }
    [fontSelect, titleFontSelect, lineSpacing, sectionStyle, bodyScale].forEach(el => {
      if (!el) return;
      el.addEventListener('input', () => {
        applyLiveTypography({
          fontBody: fontSelect?.value || 'Instrument Sans',
          fontTitle: titleFontSelect?.value || 'Fraunces',
          lineHeight: lineSpacing?.value || '1.25',
          sectionStyle: sectionStyle?.value || 'bold',
          bodyScale: bodyScale?.value || '1',
        });
        refreshPreview();
      });
    });
    applySavedPreviewSettings();
  }

  function persistPreviewSettings() {
    const overlay = document.getElementById('print-preview-overlay');
    if (!overlay) return;
    const themeSelect = overlay.querySelector('#preview-theme-select');
    const fontSelect = overlay.querySelector('#preview-font-select');
    const titleFontSelect = overlay.querySelector('#preview-title-font-select');
    const lineSpacing = overlay.querySelector('#preview-line-spacing');
    const sectionStyle = overlay.querySelector('#preview-section-style');
    const bodyScale = overlay.querySelector('#preview-body-scale');
    const preset = STYLE_PRESETS.find(p => p.id === themeSelect?.value) || STYLE_PRESETS[0];
    const settings = {
      templateId: preset.template,
      presetId: preset.id,
      fontBody: fontSelect?.value || 'Instrument Sans',
      fontTitle: titleFontSelect?.value || 'Fraunces',
      fontSize: preset.fontSize,
      lineHeight: lineSpacing?.value || preset.lineHeight,
      sectionStyle: sectionStyle?.value || preset.sectionStyle,
      bodyScale: bodyScale?.value || '1',
      titleScale: preset.titleScale || '1',
    };
    localStorage.setItem('karenMusicPrintPreviewSettings', JSON.stringify(settings));
    applyTemplate(settings.templateId);
    applyLiveTypography(settings);
  }

  function applySavedPreviewSettings() {
    const overlay = document.getElementById('print-preview-overlay');
    if (!overlay) return;
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem('karenMusicPrintPreviewSettings') || 'null'); } catch(e) {}
    const preset = saved
      ? (STYLE_PRESETS.find(p => p.id === saved.presetId) || STYLE_PRESETS.find(p => p.template === saved.templateId))
      : STYLE_PRESETS.find(p => p.template === activeTemplate) || STYLE_PRESETS[0];
    const themeSelect = overlay.querySelector('#preview-theme-select');
    const fontSelect = overlay.querySelector('#preview-font-select');
    const titleFontSelect = overlay.querySelector('#preview-title-font-select');
    const lineSpacing = overlay.querySelector('#preview-line-spacing');
    const sectionStyle = overlay.querySelector('#preview-section-style');
    const bodyScale = overlay.querySelector('#preview-body-scale');
    if (themeSelect) themeSelect.value = preset?.id || 'classic';
    if (fontSelect && saved?.fontBody) fontSelect.value = saved.fontBody;
    if (titleFontSelect && saved?.fontTitle) titleFontSelect.value = saved.fontTitle;
    if (lineSpacing && saved?.lineHeight) lineSpacing.value = saved.lineHeight;
    if (sectionStyle && saved?.sectionStyle) sectionStyle.value = saved.sectionStyle;
    if (bodyScale && saved?.bodyScale) bodyScale.value = saved.bodyScale;
    applyTemplate(preset?.template || activeTemplate);
    applyLiveTypography({
      fontBody: saved?.fontBody || preset?.fontBody || 'Instrument Sans',
      fontTitle: saved?.fontTitle || preset?.fontTitle || 'Fraunces',
      fontSize: saved?.fontSize || preset?.fontSize || '9.5pt',
      lineHeight: saved?.lineHeight || preset?.lineHeight || '1.25',
      sectionStyle: saved?.sectionStyle || preset?.sectionStyle || 'bold',
      bodyScale: saved?.bodyScale || '1',
      titleScale: saved?.titleScale || preset?.titleScale || '1',
    });
  }

  function refreshPreview() {
    const dest = document.getElementById('preview-content');
    if (!dest) return;
    dest.innerHTML = buildPrintDoc(true);
    injectPreviewStyles(dest);
  }

  // Inject scoped styles into the preview content so it looks right on screen
  function injectPreviewStyles(container) {
    const existing = document.getElementById('pp-preview-styles');
    if (existing) return;
    const style = document.createElement('style');
    style.id = 'pp-preview-styles';
    style.textContent = `
      .pp-page { padding: 0; }
      .pp-page {
        width: 100%;
        max-width: 8.5in;
        overflow: hidden;
      }
      .pp-header {
        padding-bottom: 6px;
        margin-bottom: 8px;
        border-bottom: none;
      }
      .pp-title-karen {
        font-size: calc(18pt * var(--print-title-scale, 1));
        font-weight: 800;
        font-family: 'Noto Sans Myanmar','Fraunces',serif;
        line-height: 1.1;
        color: #000;
        margin-bottom: 1px;
      }
      .pp-title-karen.pp-placeholder { color: #aaa; font-style: italic; }
      .pp-title-english {
        font-size: 9pt;
        font-weight: 400;
        color: #444;
        margin-bottom: 4px;
      }
      .pp-style {
        font-size: calc(18pt * var(--print-title-scale, 1));
        font-weight: 700;
        color: #000;
        margin-top: 2px;
      }
      .pp-key {
        font-size: 10pt;
        font-weight: 400;
        color: #555;
      }
      .pp-body {
        flex: 1;
        margin-bottom: 8px;
        overflow: hidden;
        transform: scale(var(--print-body-scale, 1));
        transform-origin: top left;
        width: calc(100% / var(--print-body-scale, 1));
      }
      .pp-no-chart {
        color: #888;
        font-style: italic;
        padding: 20px 0;
        text-align: center;
      }
      .pp-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 4px;
        border-top: none;
        font-size: 8pt;
        color: #333;
        gap: 12px;
      }
      .pp-footer-bpm {
        font-weight: 700;
        font-size: 8pt;
        letter-spacing: 0.05em;
      }
      .pp-footer-category {
        font-size: 8pt;
        color: #555;
        text-align: right;
      }
      .pp-footer-center {
        flex: 1 1 auto;
        text-align: center;
      }
      .pp-footer-instruments {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .pp-footer-instruments summary {
        cursor: pointer;
        list-style: none;
        font-size: 7.5pt;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #222;
      }
      .pp-footer-instruments summary::-webkit-details-marker {
        display: none;
      }
      .pp-footer-instruments-list {
        display: inline-flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-left: 8px;
        justify-content: center;
      }
      .pp-footer-instruments-list span {
        display: inline-flex;
        align-items: center;
        padding: 1px 7px;
        border-radius: 999px;
        border: 1px solid rgba(0,0,0,0.2);
        font-size: 7.6pt;
        background: rgba(0,0,0,0.03);
      }
      .pp-body * {
        max-width: 100%;
        box-sizing: border-box;
      }
      .pp-body .measure,
      .pp-body .beat,
      .pp-body .line,
      .pp-body .section {
        min-width: 0;
        overflow: hidden;
      }
      .pp-body .measure-row {
        flex-wrap: wrap;
        gap: 4px;
      }
      .pp-body .beat {
        flex: 0 1 auto;
      }
      .pp-header {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 10px 18px;
        align-items: end;
      }
      .pp-title-block {
        min-width: 0;
        display: grid;
        gap: 2px;
      }
      .pp-footer-left,
      .pp-footer-right {
        min-width: 0;
      }
      .pp-footer-left {
        text-align: left;
      }
      .pp-footer-right {
        text-align: right;
      }
      .pp-footer-category {
        display: inline-block;
        max-width: 100%;
      }
    `;
    document.head.appendChild(style);
  }

  function openPreview() {
    buildPreviewOverlay();
    refreshPreview();
    const overlay = document.getElementById('print-preview-overlay');
    if (overlay) {
      overlay.classList.add('open');
      overlay.querySelector('#preview-content')?.focus();
    }
  }

  function closePreview() {
    const overlay = document.getElementById('print-preview-overlay');
    if (overlay) overlay.classList.remove('open');
  }

  /* ──────────────────────────────────────────────────────────
     TEMPLATE SWITCHER PANEL
  ────────────────────────────────────────────────────────── */
  function renderTemplateSwitcher(container) {
    if (!container) return;
    container.innerHTML = '';
    TEMPLATES.forEach(tpl => {
      const btn = document.createElement('button');
      btn.className = 'template-option' + (tpl.id === activeTemplate ? ' active' : '');
      btn.dataset.templateId = tpl.id;
      btn.title = tpl.label;
      btn.textContent = tpl.label;
      btn.addEventListener('click', () => {
        applyTemplate(tpl.id);
        if (document.getElementById('print-preview-overlay')?.classList.contains('open')) {
          refreshPreview();
        }
      });
      container.appendChild(btn);
    });
  }

  /* ──────────────────────────────────────────────────────────
     INJECT UI  (Preview button + template switcher near Print btn)
  ────────────────────────────────────────────────────────── */
  function injectUI() {
    const printBtn = (
      document.querySelector('[data-action="print"]') ||
      document.querySelector('.print-btn') ||
      document.querySelector('#print-btn') ||
      document.querySelector('button.print') ||
      Array.from(document.querySelectorAll('button')).find(b =>
        /print/i.test(b.textContent) || /print/i.test(b.dataset.action || '')
      )
    );

    if (!document.getElementById('print-preview-btn')) {
      const btn = document.createElement('button');
      btn.id = 'print-preview-btn';
      btn.className = 'no-print';
      btn.textContent = '👁 Preview Print';
      btn.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:6px;background:#2a2a2a;border:1px solid #444;color:#ccc;font-size:0.82em;cursor:pointer;margin-left:8px;';
      btn.addEventListener('click', openPreview);
      if (printBtn?.parentElement) {
        printBtn.parentElement.insertBefore(btn, printBtn.nextSibling);
      } else {
        Object.assign(btn.style, { position:'fixed', bottom:'24px', right:'16px', zIndex:'9000' });
        document.body.appendChild(btn);
      }
    }

    if (!document.getElementById('section-position-tracker')) {
      const tracker = document.createElement('button');
      tracker.id = 'section-position-tracker';
      tracker.className = 'no-print';
      tracker.type = 'button';
      tracker.disabled = true;
      tracker.textContent = 'Position Tracker — Coming Soon';
      tracker.title = 'Coming soon';
      tracker.style.cssText = 'margin-left:8px;opacity:.52;cursor:not-allowed;padding:6px 12px;border-radius:6px;border:1px solid #555;background:#1c1c1c;color:#888;font-size:0.82em;';
      if (printBtn?.parentElement) {
        printBtn.parentElement.insertBefore(tracker, printBtn.nextSibling);
      } else {
        document.body.appendChild(tracker);
      }
    }

    // Floating template switcher (only if not already in toolbar)
    let switcher = document.getElementById('print-template-switcher');
    if (!switcher) {
      switcher = document.createElement('div');
      switcher.id = 'print-template-switcher';
      switcher.className = 'no-print print-template-panel';
      switcher.style.cssText = 'position:fixed;bottom:62px;right:16px;z-index:9000;display:none;';
      renderTemplateSwitcher(switcher);
      document.body.appendChild(switcher);
    }
  }

  function toggleThemeDrawer(force) {
    const switcher = document.getElementById('print-template-switcher');
    if (!switcher) return;
    const shouldOpen = typeof force === 'boolean' ? force : !switcher.classList.contains('is-open');
    switcher.classList.toggle('is-open', shouldOpen);
    switcher.style.display = shouldOpen ? 'grid' : 'none';
  }

  /* ──────────────────────────────────────────────────────────
     INJECT @MEDIA PRINT RULES for the pp-* classes
     So the real Ctrl+P output also uses the same layout.
  ────────────────────────────────────────────────────────── */
  function injectPrintRules() {
    if (document.getElementById('pp-print-rules')) return;
    const style = document.createElement('style');
    style.id = 'pp-print-rules';
    style.textContent = `
      @media print {
        /* Build the same header/footer structure at real print time */
        .pp-header { border-bottom: none !important; margin-bottom: 6pt; }
        .pp-title-karen { font-size: 18pt !important; font-weight: 800 !important; font-family: 'Noto Sans Myanmar','Fraunces',serif !important; }
        .pp-title-english { font-size: 9pt !important; font-weight: 400 !important; color: #444 !important; }
        .pp-style { font-size: 18pt !important; font-weight: 700 !important; }
        .pp-footer { display: flex !important; justify-content: space-between !important; border-top: none !important; padding-top: 3pt !important; font-size: 8pt !important; }
        .pp-footer-bpm { font-weight: 700 !important; }
        .pp-no-chart { display: none !important; }
      }
    `;
    document.head.appendChild(style);
  }

  /* ──────────────────────────────────────────────────────────
     MOVE BPM TO FOOTER  (for legacy print markup that doesn't
     use the pp-* classes)
  ────────────────────────────────────────────────────────── */
  function normalizeBpmText(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    return /bpm/i.test(text) ? text : `${text} BPM`;
  }

  function getLegacyPrintSheets() {
    return Array.from(document.querySelectorAll('#print-batch .chart-container, #chart-container'))
      .filter((sheet, index, all) => all.indexOf(sheet) === index);
  }

  function setTextIfDifferent(el, text) {
    if (!el || !text) return;
    if (el.textContent.trim() !== text) el.textContent = text;
  }

  function applySpecToLegacySheet(sheet) {
    const song = getSongData();
    const karenTitle = song.titleKaren || '';
    const englishTitle = song.titleEnglish ? `(${song.titleEnglish})` : '';
    const tempo = normalizeBpmText(song.tempo);
    const rightFooter = [song.category, song.instruments].filter(Boolean).join(' · ');

    const karenEl = sheet.querySelector('#ph-title-karen, .print-title-karen, .song-title-karen-print');
    const englishEl = sheet.querySelector('#ph-title-english, .print-title-english, .song-title-english-print, .print-title, .song-print-title');
    setTextIfDifferent(karenEl, karenTitle);
    setTextIfDifferent(englishEl, englishTitle);
    karenEl?.classList.add('print-spec-title-karen');
    englishEl?.classList.add('print-spec-title-english');

    const styleEl = sheet.querySelector('#ph-style-english, .print-style, .song-print-style');
    if (styleEl) {
      styleEl.classList.add('print-spec-style');
      if (song.style) setTextIfDifferent(styleEl, song.style);
    }

    const headerTempo = sheet.querySelector('.paper-head-tempo, .header-bpm, .header-tempo, .print-bpm-header, .print-tempo-header');
    headerTempo?.classList.add('print-spec-header-tempo');

    const footer = sheet.querySelector('.paper-footer, .print-footer, #print-footer, .song-print-footer');
    if (footer) {
      let left = footer.querySelector('#ph-footer-left, .footer-bpm, .print-bpm-footer, .print-tempo-footer');
      if (!left) {
        left = document.createElement('span');
        left.id = 'ph-footer-left';
        left.className = 'footer-bpm print-bpm-footer';
        footer.prepend(left);
      }
      setTextIfDifferent(left, tempo);

      let right = footer.querySelector('#ph-footer-right, .footer-category, .print-category-footer');
      if (!right) {
        right = document.createElement('span');
        right.id = 'ph-footer-right';
        right.className = 'footer-category print-category-footer';
        footer.appendChild(right);
      }
      setTextIfDifferent(right, rightFooter);
    }
  }

  function applyPrintSpecToLegacySheets() {
    getLegacyPrintSheets().forEach(applySpecToLegacySheet);
  }

  function moveBpmToFooter() {
    applyPrintSpecToLegacySheets();
  }

  function hasInstrumentPrintBatch() {
    const batch = document.getElementById('print-batch');
    if (!batch || batch.querySelectorAll('.chart-container').length === 0) return false;
    const style = window.getComputedStyle(batch);
    return style.display !== 'none' && style.visibility !== 'hidden';
  }

  function ensureCtrlPrintHost() {
    let host = document.getElementById('pp-print-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'pp-print-host';
      host.setAttribute('aria-hidden', 'true');
      document.body.appendChild(host);
    }
    return host;
  }

  function preparePrintOutput() {
    applyPrintSpecToLegacySheets();

    // Every print entry point must use the same per-instrument packet. This
    // includes Print, Preview Print, and the browser/desktop Ctrl+P command.
    if (!hasInstrumentPrintBatch() && typeof window.buildPrintBatch === 'function') {
      window.buildPrintBatch();
    }

    if (hasInstrumentPrintBatch()) {
      document.body.classList.remove('pp-print-host-active');
      return;
    }

    const host = ensureCtrlPrintHost();
    host.innerHTML = buildPrintDoc(false);
    document.body.classList.add('pp-print-host-active');
  }

  function cleanupPrintOutput() {
    document.body.classList.remove('pp-print-host-active');
  }

  /* ──────────────────────────────────────────────────────────
     INIT
  ────────────────────────────────────────────────────────── */
  function init() {
    applyTemplate(activeTemplate);
    injectUI();
    injectPrintRules();
    moveBpmToFooter();
    window.addEventListener('beforeprint', preparePrintOutput);
    window.addEventListener('afterprint', cleanupPrintOutput);

    const events = ['song-loaded', 'songLoaded', 'chart-rendered', 'printReady'];
    events.forEach(evt => {
      document.addEventListener(evt, () => {
        applyPrintSpecToLegacySheets();
        if (document.body.classList.contains('pp-print-host-active')) preparePrintOutput();
        // Refresh open preview if a song just loaded
        if (document.getElementById('print-preview-overlay')?.classList.contains('open')) {
          refreshPreview();
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ──────────────────────────────────────────────────────────
     PUBLIC API
  ────────────────────────────────────────────────────────── */
  window.PrintPreview = {
    applyTemplate, openPreview, closePreview, refreshPreview,
    renderTemplateSwitcher, toggleThemeDrawer, moveBpmToFooter, applyPrintSpecToLegacySheets, preparePrintOutput, cleanupPrintOutput, buildPrintDoc,
    getSongData, getChordChartEl,
    getTemplates: () => TEMPLATES,
    getActive:    () => activeTemplate,
  };

}());
