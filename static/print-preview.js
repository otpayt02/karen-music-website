/*
  ============================================================
  KAREN MUSIC WEBSITE — PRINT PREVIEW PANEL
  Injects the preview button + drawer into the page.
  No application logic is changed.
  ============================================================
*/

(function () {
  'use strict';

  /* ── 1. Inject "Preview Print Style" button into top bar ── */
  function injectPreviewButton() {
    if (document.getElementById('print-preview-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'print-preview-btn';
    btn.setAttribute('title', 'Preview print layout & style');
    btn.innerHTML = '🖨 Preview';
    btn.addEventListener('click', openPreviewDrawer);
    document.body.appendChild(btn);
  }

  /* ── 2. Build the drawer HTML ── */
  const TEMPLATES = [
    { id: 'clean',    name: 'Clean',          desc: 'Monospace, compact, tight spacing' },
    { id: 'bulletin', name: 'Church Bulletin', desc: 'Serif, small-caps sections, classic feel' },
    { id: 'minimal',  name: 'Minimal',         desc: 'Sans-serif, light weight, airy' },
    { id: 'bold',     name: 'Bold',            desc: 'Heavy mono, uppercase labels, dense' },
    { id: 'classic',  name: 'Classic',         desc: 'Traditional serif, italic sections' },
  ];

  const FONTS = [
    { value: '"IBM Plex Mono", monospace',              label: 'IBM Plex Mono (default)' },
    { value: '"Fraunces", Georgia, serif',               label: 'Fraunces (Serif)' },
    { value: '"Instrument Sans", "Segoe UI", sans-serif',label: 'Instrument Sans' },
    { value: '"Noto Sans Myanmar", sans-serif',          label: 'Noto Myanmar' },
    { value: '"Courier New", Courier, monospace',        label: 'Courier New' },
  ];

  const SECTION_STYLES = [
    { value: 'normal',     label: 'Normal' },
    { value: 'uppercase',  label: 'UPPERCASE' },
    { value: 'small-caps', label: 'Small Caps' },
    { value: 'italic',     label: 'Italic' },
  ];

  function buildDrawer() {
    const overlay = document.createElement('div');
    overlay.id = 'print-preview-overlay';

    overlay.innerHTML = `
      <div id="print-preview-drawer">
        <div id="print-preview-header">
          <h3>Print Style Preview</h3>
          <button id="print-preview-close" title="Close">✕</button>
        </div>

        <div id="print-preview-body">

          <!-- Template tiles -->
          <div class="ppv-group">
            <div class="ppv-label">Theme Templates</div>
            <div class="ppv-templates" id="ppv-template-grid"></div>
          </div>

          <!-- Font selector -->
          <div class="ppv-group">
            <div class="ppv-label">Font Family</div>
            <select class="ppv-control" id="ppv-font">
              ${FONTS.map(f => `<option value="${f.value}">${f.label}</option>`).join('')}
            </select>
          </div>

          <!-- Line spacing -->
          <div class="ppv-group">
            <div class="ppv-label">Line Spacing — <span id="ppv-leading-val">1.25</span></div>
            <input type="range" class="ppv-control" id="ppv-leading"
              min="1.0" max="1.8" step="0.05" value="1.25">
          </div>

          <!-- Section label style -->
          <div class="ppv-group">
            <div class="ppv-label">Section Label Style</div>
            <select class="ppv-control" id="ppv-section-style">
              ${SECTION_STYLES.map(s => `<option value="${s.value}">${s.label}</option>`).join('')}
            </select>
          </div>

        </div><!-- /body -->

        <div id="print-preview-footer">
          <button id="ppv-reset-btn">Reset</button>
          <button id="ppv-apply-btn">Apply &amp; Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    /* Populate template tiles */
    const grid = document.getElementById('ppv-template-grid');
    TEMPLATES.forEach(t => {
      const btn = document.createElement('button');
      btn.className = 'ppv-template-btn';
      btn.dataset.tplId = t.id;
      btn.innerHTML = `<span class="ppv-template-name">${t.name}</span><span class="ppv-template-desc">${t.desc}</span>`;
      btn.addEventListener('click', () => applyTemplate(t.id));
      grid.appendChild(btn);
    });

    /* Wire close */
    document.getElementById('print-preview-close').addEventListener('click', closePreviewDrawer);
    overlay.addEventListener('click', e => { if (e.target === overlay) closePreviewDrawer(); });

    /* Wire controls → live preview */
    document.getElementById('ppv-font').addEventListener('change', livePreview);
    document.getElementById('ppv-section-style').addEventListener('change', livePreview);
    document.getElementById('ppv-leading').addEventListener('input', function () {
      document.getElementById('ppv-leading-val').textContent = this.value;
      livePreview();
    });

    /* Apply & Reset */
    document.getElementById('ppv-apply-btn').addEventListener('click', applyAndClose);
    document.getElementById('ppv-reset-btn').addEventListener('click', resetStyles);
  }

  /* ── 3. Open / Close ── */
  function openPreviewDrawer() {
    if (!document.getElementById('print-preview-overlay')) buildDrawer();
    document.getElementById('print-preview-overlay').classList.add('open');
  }

  function closePreviewDrawer() {
    const overlay = document.getElementById('print-preview-overlay');
    if (overlay) overlay.classList.remove('open');
    clearLivePreview();
  }

  /* ── 4. Template application ── */
  function applyTemplate(id) {
    /* Update active tile */
    document.querySelectorAll('.ppv-template-btn').forEach(b => {
      b.classList.toggle('is-active', b.dataset.tplId === id);
    });

    /* Map template → control values */
    const maps = {
      clean:    { font: FONTS[0].value, leading: '1.25', sectionStyle: 'normal' },
      bulletin: { font: FONTS[1].value, leading: '1.35', sectionStyle: 'small-caps' },
      minimal:  { font: FONTS[2].value, leading: '1.18', sectionStyle: 'normal' },
      bold:     { font: FONTS[0].value, leading: '1.28', sectionStyle: 'uppercase' },
      classic:  { font: FONTS[1].value, leading: '1.40', sectionStyle: 'italic' },
    };
    const m = maps[id];
    if (!m) return;

    document.getElementById('ppv-font').value = m.font;
    document.getElementById('ppv-leading').value = m.leading;
    document.getElementById('ppv-leading-val').textContent = m.leading;
    document.getElementById('ppv-section-style').value = m.sectionStyle;

    livePreview();
  }

  /* ── 5. Live preview — applies vars to chart containers (screen only) ── */
  function livePreview() {
    const font   = document.getElementById('ppv-font').value;
    const lead   = document.getElementById('ppv-leading').value;
    const sStyle = document.getElementById('ppv-section-style').value;

    document.querySelectorAll('.chart-container').forEach(el => {
      el.style.setProperty('--pt-font', font);
      el.style.setProperty('--pt-leading', lead);
      el.style.setProperty('--pt-section-style', sStyle);
      el.dataset.ppvTheme = 'preview';
    });
  }

  function clearLivePreview() {
    document.querySelectorAll('.chart-container[data-ppv-theme]').forEach(el => {
      el.style.removeProperty('--pt-font');
      el.style.removeProperty('--pt-leading');
      el.style.removeProperty('--pt-section-style');
      delete el.dataset.ppvTheme;
    });
  }

  /* ── 6. Apply — write chosen vars to :root so they survive close ── */
  function applyAndClose() {
    const font   = document.getElementById('ppv-font').value;
    const lead   = document.getElementById('ppv-leading').value;
    const sStyle = document.getElementById('ppv-section-style').value;

    document.documentElement.style.setProperty('--print-font-family', font);
    document.documentElement.style.setProperty('--print-line-spacing', lead);
    document.documentElement.style.setProperty('--print-section-label-style', sStyle);

    /* Persist to localStorage so it survives reload */
    try {
      localStorage.setItem('ppv_font', font);
      localStorage.setItem('ppv_leading', lead);
      localStorage.setItem('ppv_section_style', sStyle);
    } catch (_) {}

    closePreviewDrawer();
  }

  /* ── 7. Reset ── */
  function resetStyles() {
    document.documentElement.style.removeProperty('--print-font-family');
    document.documentElement.style.removeProperty('--print-line-spacing');
    document.documentElement.style.removeProperty('--print-section-label-style');

    try {
      localStorage.removeItem('ppv_font');
      localStorage.removeItem('ppv_leading');
      localStorage.removeItem('ppv_section_style');
    } catch (_) {}

    /* Reset controls to defaults */
    if (document.getElementById('ppv-font')) {
      document.getElementById('ppv-font').value = FONTS[0].value;
      document.getElementById('ppv-leading').value = '1.25';
      document.getElementById('ppv-leading-val').textContent = '1.25';
      document.getElementById('ppv-section-style').value = 'normal';
    }

    clearLivePreview();

    document.querySelectorAll('.ppv-template-btn').forEach(b => b.classList.remove('is-active'));
  }

  /* ── 8. Restore saved prefs on load ── */
  function restoreSavedPrefs() {
    try {
      const font   = localStorage.getItem('ppv_font');
      const lead   = localStorage.getItem('ppv_leading');
      const sStyle = localStorage.getItem('ppv_section_style');
      if (font)   document.documentElement.style.setProperty('--print-font-family', font);
      if (lead)   document.documentElement.style.setProperty('--print-line-spacing', lead);
      if (sStyle) document.documentElement.style.setProperty('--print-section-label-style', sStyle);
    } catch (_) {}
  }

  /* ── 9. Inject Position Tracker stub ── */
  function injectPositionTrackerStub() {
    if (document.getElementById('position-tracker-stub')) return;
    /* Wait for the sidebar / main action area to be present */
    const target = document.querySelector('.action-grid') || document.querySelector('#sidebar');
    if (!target) return;
    const stub = document.createElement('button');
    stub.id = 'position-tracker-stub';
    stub.setAttribute('disabled', 'disabled');
    stub.setAttribute('aria-disabled', 'true');
    stub.setAttribute('title', 'Coming soon');
    stub.textContent = 'Position Tracker — Coming Soon';
    target.appendChild(stub);
  }

  /* ── 10. Move BPM to footer center (screen & print preview) ── */
  function moveBpmToFooter() {
    // Find all chart containers in print-batch
    document.querySelectorAll('#print-batch .chart-container').forEach(chart => {
      const footerCenter = chart.querySelector('#ph-footer-center');
      if (!footerCenter) return;
      // Look for a BPM element in the header
      const bpmEl = chart.querySelector('.paper-bpm, [data-field="beats_per_measure"], .ph-bpm-center');
      if (bpmEl && footerCenter.dataset.bpmMoved !== '1') {
        footerCenter.textContent = bpmEl.textContent || footerCenter.textContent;
        footerCenter.dataset.bpmMoved = '1';
      }
    });
  }

  /* ── Init ── */
  function init() {
    restoreSavedPrefs();
    injectPreviewButton();
    injectPositionTrackerStub();
    moveBpmToFooter();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
