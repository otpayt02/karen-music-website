/**
 * event-tags.js
 * Karen Music Director — Section Position Tracker & Color Coding
 * --------------------------------------------------------------
 * Spec §5: Adds data-section attributes to chart section blocks
 * so CSS in print-overrides.css can apply color coding.
 * Also drives the on-screen section tracker badge (§5.2).
 *
 * Does NOT change any chord logic, editor state, or save/load.
 */

(function () {
  'use strict';

  /* ----------------------------------------------------------
     SECTION NAME → CSS slug mapping
     Normalizes any label variation to a consistent slug.
  ---------------------------------------------------------- */
  const SECTION_SLUGS = {
    'intro':       'intro',
    'introduction':'intro',
    'verse':       'verse',
    'v':           'verse',
    'pre-chorus':  'pre-chorus',
    'prechorus':   'pre-chorus',
    'pre chorus':  'pre-chorus',
    'chorus':      'chorus',
    'ch':          'chorus',
    'refrain':     'chorus',
    'bridge':      'bridge',
    'br':          'bridge',
    'solo':        'solo',
    'interlude':   'solo',
    'ending':      'ending',
    'outro':       'ending',
    'tag':         'ending',
    'coda':        'ending',
  };

  const SECTION_COLORS = {
    'intro':      '#3b82f6',
    'verse':      '#f59e0b',
    'pre-chorus': '#8b5cf6',
    'chorus':     '#10b981',
    'bridge':     '#ec4899',
    'solo':       '#eab308',
    'ending':     '#0ea5e9',
  };

  function slugify(label) {
    if (!label) return '';
    const clean = label.toLowerCase().replace(/[^a-z\-\s]/g, '').trim();
    return SECTION_SLUGS[clean] || clean.replace(/\s+/g, '-');
  }

  /* ----------------------------------------------------------
     TAG SECTION BLOCKS
     Finds section header elements, reads their label, and:
     1. Sets data-section on the parent block
     2. Adds section-{slug} class to parent block
     3. Injects a colour-coded .section-tag pill beside the label
  ---------------------------------------------------------- */
  function tagSectionBlocks() {
    const headerSelectors = [
      '.chart-section-header',
      '.section-header',
      '.section-label',
      '.row-section-label',
      '[data-role="section-header"]',
    ];

    const headers = document.querySelectorAll(headerSelectors.join(','));

    headers.forEach(header => {
      const rawLabel = (header.dataset.section || header.textContent || '').trim();
      const slug = slugify(rawLabel);
      if (!slug) return;

      // Find the parent section block
      const block = (
        header.closest('.chart-section') ||
        header.closest('.section-block') ||
        header.closest('.section-row') ||
        header.parentElement
      );

      if (block) {
        block.setAttribute('data-section', slug);
        // Remove any previously set section-* classes, then add new one
        block.className = block.className
          .split(' ')
          .filter(c => !c.startsWith('section-'))
          .join(' ');
        block.classList.add(`section-${slug.replace('-', '')}`);
        // Also keep hyphenated version for pre-chorus
        if (slug.includes('-')) {
          block.classList.add(`section-${slug}`);
        }
      }

      // Inject tag pill if not already present
      if (!header.querySelector('.section-tag')) {
        const tag = document.createElement('span');
        tag.className = `section-tag tag-${slug.replace('-', '')} tag-${slug}`;
        tag.dataset.section = slug;
        tag.textContent = rawLabel;
        tag.style.cssText = [
          `background:${hexToAlpha(SECTION_COLORS[slug] || '#888', 0.15)}`,
          `color:${SECTION_COLORS[slug] || '#555'}`,
          `border:1px solid ${hexToAlpha(SECTION_COLORS[slug] || '#888', 0.35)}`,
        ].join(';');
        // Insert at beginning of header
        header.insertBefore(tag, header.firstChild);
      }
    });
  }

  /* Simple hex → rgba helper */
  function hexToAlpha(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  /* ----------------------------------------------------------
     SECTION POSITION TRACKER
     A fixed badge that shows the current section name as the
     musician scrolls through the chart on screen.
  ---------------------------------------------------------- */
  let trackerEl = null;
  let trackerTimeout = null;

  function buildTracker() {
    if (document.getElementById('section-position-tracker')) {
      trackerEl = document.getElementById('section-position-tracker');
      return;
    }
    trackerEl = document.createElement('div');
    trackerEl.id = 'section-position-tracker';
    trackerEl.setAttribute('aria-live', 'polite');
    trackerEl.setAttribute('aria-atomic', 'true');
    trackerEl.innerHTML = '<span class="tracker-dot"></span><span class="tracker-label"></span>';
    document.body.appendChild(trackerEl);
  }

  function showTracker(sectionSlug, labelText) {
    if (!trackerEl) return;
    const dot   = trackerEl.querySelector('.tracker-dot');
    const label = trackerEl.querySelector('.tracker-label');
    if (label)  label.textContent = labelText || sectionSlug;
    if (dot)    dot.style.color   = SECTION_COLORS[sectionSlug] || '#fff';
    trackerEl.style.display = 'flex';
    trackerEl.classList.remove('hidden');

    clearTimeout(trackerTimeout);
    trackerTimeout = setTimeout(() => {
      if (trackerEl) trackerEl.classList.add('hidden');
    }, 2200);
  }

  /* Intersection Observer: watch section headers scroll into view */
  function initTracker() {
    buildTracker();

    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -60% 0px',  // fires when header is near top of viewport
      threshold: 0,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const header = entry.target;
        const rawLabel = (header.dataset.section || header.textContent || '').trim();
        const slug = slugify(rawLabel);
        if (slug) showTracker(slug, rawLabel);
      });
    }, observerOptions);

    const sectionHeaders = document.querySelectorAll(
      '.chart-section-header, .section-header, .section-label, [data-role="section-header"]'
    );
    sectionHeaders.forEach(el => observer.observe(el));
  }

  /* ----------------------------------------------------------
     MUTATION OBSERVER
     Re-tags when the chart is re-rendered (song load / key change)
  ---------------------------------------------------------- */
  function watchForChartChanges() {
    const target = (
      document.querySelector('.print-area') ||
      document.getElementById('print-area') ||
      document.querySelector('.chart-print-wrapper') ||
      document.querySelector('.chart-container') ||
      document.body
    );

    const mo = new MutationObserver(() => {
      tagSectionBlocks();
      initTracker();
    });

    mo.observe(target, { childList: true, subtree: true });
  }

  /* ----------------------------------------------------------
     INIT
  ---------------------------------------------------------- */
  function init() {
    tagSectionBlocks();
    initTracker();
    watchForChartChanges();

    // Also re-run on custom song-loaded events
    const events = ['song-loaded', 'songLoaded', 'chart-rendered', 'printReady'];
    events.forEach(evt => {
      document.addEventListener(evt, () => {
        tagSectionBlocks();
        initTracker();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ----------------------------------------------------------
     PUBLIC API  (window.EventTags)
  ---------------------------------------------------------- */
  window.EventTags = {
    tagSectionBlocks,
    slugify,
    showTracker,
    getSectionColors: () => ({ ...SECTION_COLORS }),
    getSectionSlugs:  () => ({ ...SECTION_SLUGS }),
  };

}());
