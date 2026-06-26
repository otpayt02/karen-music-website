/*
  ============================================================
  KAREN MUSIC WEBSITE — EVENT / HOLIDAY TAG SYSTEM
  Adds tag picker, filter bar, and section tag support.
  No application logic, DB schema, or data flow is changed.
  Tags are stored in localStorage keyed by song id.
  ============================================================
*/

(function () {
  'use strict';

  /* ───────────────────────────────────────
    TAG REGISTRY
    Each tag: { id, label, icon, group }
  ─────────────────────────────────────── */
  const TAG_REGISTRY = [
    /* Holidays */
    { id: 'christmas',    label: 'Christmas',       icon: '🎄', group: 'Holidays' },
    { id: 'easter',       label: 'Easter',          icon: '✝️',  group: 'Holidays' },
    { id: 'newyear',      label: 'New Year',        icon: '🎆', group: 'Holidays' },
    { id: 'thanksgiving', label: 'Thanksgiving',    icon: '🥎', group: 'Holidays' },
    { id: 'karennewyr',   label: 'Karen New Year',  icon: '🌺', group: 'Holidays' },
    /* Special Events */
    { id: 'communion',    label: 'Communion',       icon: '🍞', group: 'Special Events' },
    { id: 'baptism',      label: 'Baptism',         icon: '💧', group: 'Special Events' },
    { id: 'wedding',      label: 'Wedding',         icon: '💍', group: 'Special Events' },
    { id: 'funeral',      label: 'Funeral',         icon: '🕊️',  group: 'Special Events' },
    { id: 'dedication',   label: 'Dedication',      icon: '📖', group: 'Special Events' },
    { id: 'revival',      label: 'Revival',         icon: '🔥', group: 'Special Events' },
    { id: 'youth',        label: 'Youth',           icon: '🌟', group: 'Special Events' },
  ];

  const TAG_GROUPS = [...new Set(TAG_REGISTRY.map(t => t.group))];

  /* -------------------------------------------------------
    STORAGE helpers (keyed by song id from data-song-id)
  ------------------------------------------------------- */
  function storageKey(songId) {
    return `evt_tags_song_${songId}`;
  }

  function getTagsForSong(songId) {
    try {
      return JSON.parse(localStorage.getItem(storageKey(songId)) || '[]');
    } catch (_) { return []; }
  }

  function saveTagsForSong(songId, tags) {
    try {
      localStorage.setItem(storageKey(songId), JSON.stringify([...new Set(tags)]));
    } catch (_) {}
  }

  function addTagToSong(songId, tagId) {
    const current = getTagsForSong(songId);
    if (!current.includes(tagId)) {
      saveTagsForSong(songId, [...current, tagId]);
    }
  }

  function removeTagFromSong(songId, tagId) {
    saveTagsForSong(songId, getTagsForSong(songId).filter(t => t !== tagId));
  }

  /* -------------------------------------------------------
    BUILD a pill element
  ------------------------------------------------------- */
  function buildPill(tagId, removable, onRemove) {
    const def = TAG_REGISTRY.find(t => t.id === tagId);
    if (!def) return null;
    const pill = document.createElement('span');
    pill.className = 'event-tag';
    pill.dataset.tag = tagId;
    pill.innerHTML = `<span class="tag-icon">${def.icon}</span>${def.label}`;
    if (removable) {
      const rm = document.createElement('button');
      rm.className = 'tag-remove';
      rm.setAttribute('title', 'Remove tag');
      rm.setAttribute('aria-label', `Remove ${def.label} tag`);
      rm.textContent = '×';
      rm.addEventListener('click', e => {
        e.stopPropagation();
        onRemove(tagId);
      });
      pill.appendChild(rm);
    }
    return pill;
  }

  /* -------------------------------------------------------
    RENDER tags into a .tag-cluster element
  ------------------------------------------------------- */
  function renderTagCluster(clusterEl, songId) {
    clusterEl.innerHTML = '';
    const tags = getTagsForSong(songId);
    tags.forEach(tagId => {
      const pill = buildPill(tagId, true, (id) => {
        removeTagFromSong(songId, id);
        renderTagCluster(clusterEl, songId);
        refreshFilterBar();
        applyFilters();
      });
      if (pill) clusterEl.appendChild(pill);
    });
    /* Add-tag button */
    const addBtn = document.createElement('button');
    addBtn.className = 'tag-add-btn';
    addBtn.setAttribute('title', 'Add event / holiday tag');
    addBtn.innerHTML = '+ Tag';
    addBtn.addEventListener('click', e => {
      e.stopPropagation();
      openTagPicker(addBtn, songId, clusterEl);
    });
    clusterEl.appendChild(addBtn);
  }

  /* -------------------------------------------------------
    TAG PICKER
  ------------------------------------------------------- */
  let _activePicker = null;

  function closeActivePicker() {
    if (_activePicker) {
      _activePicker.remove();
      _activePicker = null;
    }
  }

  document.addEventListener('click', e => {
    if (_activePicker && !_activePicker.contains(e.target)) {
      closeActivePicker();
    }
  });

  function openTagPicker(anchorBtn, songId, clusterEl) {
    closeActivePicker();
    const picker = document.createElement('div');
    picker.className = 'tag-picker open';
    _activePicker = picker;

    const applied = getTagsForSong(songId);

    TAG_GROUPS.forEach(group => {
      const groupLabel = document.createElement('div');
      groupLabel.className = 'tag-picker-section-label';
      groupLabel.textContent = group;
      picker.appendChild(groupLabel);

      const row = document.createElement('div');
      row.className = 'tag-picker-row';

      TAG_REGISTRY.filter(t => t.group === group).forEach(def => {
        const opt = document.createElement('button');
        opt.className = 'tag-picker-option' + (applied.includes(def.id) ? ' is-applied' : '');
        opt.dataset.tag = def.id;
        opt.innerHTML = `${def.icon} ${def.label}`;
        if (!applied.includes(def.id)) {
          opt.addEventListener('click', e => {
            e.stopPropagation();
            addTagToSong(songId, def.id);
            closeActivePicker();
            renderTagCluster(clusterEl, songId);
            refreshFilterBar();
            applyFilters();
          });
        }
        row.appendChild(opt);
      });
      picker.appendChild(row);
    });

    /* Position below the anchor button */
    anchorBtn.style.position = 'relative';
    anchorBtn.appendChild(picker);
  }

  /* -------------------------------------------------------
    FILTER STATE
  ------------------------------------------------------- */
  let _activeFilters = new Set();

  function applyFilters() {
    document.querySelectorAll('.song-item[data-song-id]').forEach(item => {
      if (_activeFilters.size === 0) {
        item.classList.remove('tag-filtered-out');
        return;
      }
      const tags = getTagsForSong(item.dataset.songId);
      const matches = [..._activeFilters].every(f => tags.includes(f));
      item.classList.toggle('tag-filtered-out', !matches);
    });
  }

  /* -------------------------------------------------------
    FILTER BAR — injected above the song list
  ------------------------------------------------------- */
  function buildFilterBar() {
    if (document.getElementById('event-filter-bar')) return;

    /* Find the song list container */
    const songList =
      document.getElementById('song-list') ||
      document.querySelector('.song-list') ||
      document.querySelector('#sidebar .song-item')?.parentElement;

    if (!songList) return;

    const bar = document.createElement('div');
    bar.id = 'event-filter-bar';
    bar.innerHTML = `
      <div class="filter-bar-label">Filter by Tag</div>
      <div id="event-filter-tags"></div>
      <button id="filter-clear-btn" style="display:none">Clear filters</button>
    `;
    songList.parentElement.insertBefore(bar, songList);

    document.getElementById('filter-clear-btn').addEventListener('click', () => {
      _activeFilters.clear();
      refreshFilterBar();
      applyFilters();
    });

    refreshFilterBar();
  }

  function refreshFilterBar() {
    const container = document.getElementById('event-filter-tags');
    if (!container) return;
    container.innerHTML = '';

    /* Collect all tags currently in use across all songs */
    const usedTagIds = new Set();
    document.querySelectorAll('.song-item[data-song-id]').forEach(item => {
      getTagsForSong(item.dataset.songId).forEach(t => usedTagIds.add(t));
    });

    if (usedTagIds.size === 0) {
      container.innerHTML = '<span style="font-size:10px;color:#555;font-style:italic">No tags yet</span>';
      const clearBtn = document.getElementById('filter-clear-btn');
      if (clearBtn) clearBtn.style.display = 'none';
      return;
    }

    TAG_REGISTRY.filter(t => usedTagIds.has(t.id)).forEach(def => {
      const btn = document.createElement('button');
      btn.className = 'filter-tag-btn' + (_activeFilters.has(def.id) ? ' is-active' : '');
      btn.dataset.filterTag = def.id;
      btn.innerHTML = `${def.icon} ${def.label}`;
      btn.addEventListener('click', () => {
        if (_activeFilters.has(def.id)) {
          _activeFilters.delete(def.id);
        } else {
          _activeFilters.add(def.id);
        }
        refreshFilterBar();
        applyFilters();
      });
      container.appendChild(btn);
    });

    const clearBtn = document.getElementById('filter-clear-btn');
    if (clearBtn) {
      clearBtn.style.display = _activeFilters.size > 0 ? 'inline-block' : 'none';
    }
  }

  /* -------------------------------------------------------
    INJECT tag clusters into every .song-item
  ------------------------------------------------------- */
  function decorateSongItems() {
    document.querySelectorAll('.song-item').forEach(item => {
      /* Assign a stable ID if missing: use index or existing data attr */
      if (!item.dataset.songId) {
        /* Try to read an existing id attribute */
        const candidate =
          item.dataset.id ||
          item.getAttribute('data-id') ||
          item.id ||
          null;
        if (candidate) {
          item.dataset.songId = candidate;
        } else {
          /* Fallback: use text content hash */
          item.dataset.songId = 'song_' + btoa(encodeURIComponent((item.textContent || '').trim().slice(0, 40))).replace(/=/g, '').slice(0, 16);
        }
      }

      if (item.querySelector('.tag-cluster')) return; /* already decorated */

      const cluster = document.createElement('div');
      cluster.className = 'tag-cluster';
      item.appendChild(cluster);
      renderTagCluster(cluster, item.dataset.songId);
    });
  }

  /* -------------------------------------------------------
    OBSERVE for dynamically added song items (song list loads async)
  ------------------------------------------------------- */
  const _songObserver = new MutationObserver(() => {
    decorateSongItems();
    buildFilterBar();
    refreshFilterBar();
    applyFilters();
  });

  function startObserving() {
    const sidebar = document.getElementById('sidebar') || document.body;
    _songObserver.observe(sidebar, { childList: true, subtree: true });
  }

  /* -------------------------------------------------------
    INIT
  ------------------------------------------------------- */
  function init() {
    decorateSongItems();
    buildFilterBar();
    startObserving();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
