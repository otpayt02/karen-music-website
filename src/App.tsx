import { useEffect, useMemo, useState } from "react";
import { api } from "./services";
import type { ImportReview, Song } from "./types";
import "./index.css";

const blankSong = (): Song => ({
  title: "",
  title_karen: "",
  category: "",
  key: "",
  current_key: "",
  original_key: "",
  style: "",
  tempo: "",
  notes: "",
  chart_json: { sections: [], raw: "" },
  lyrics_json: [],
  metadata_json: {},
  tags_json: [],
});

const chartText = (song: Song) => {
  if (typeof song.chart_json?.raw === "string") return song.chart_json.raw;
  const sections = Array.isArray(song.chart_json?.sections) ? song.chart_json.sections : [];
  if (!sections.length) return "";
  return sections
    .map((section: any) => {
      const title = section?.type || section?.title || "Section";
      const measures = Array.isArray(section?.measures) ? section.measures : [];
      const body = measures
        .map((measure: any) => {
          const beats = Array.isArray(measure?.beats) ? measure.beats : [];
          return beats.map((beat: any) => beat?.chord || beat?.label || "").join(" / ");
        })
        .filter(Boolean)
        .join(" | ");
      return body ? `${title}: ${body}` : title;
    })
    .join("\n");
};

const lyricsText = (song: Song) => {
  if (!Array.isArray(song.lyrics_json)) return "";
  return song.lyrics_json
    .map((line: any) => {
      if (typeof line === "string") return line;
      return [line.title, line.karenText, line.romanization, line.translation].filter(Boolean).join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
};

function Field({
  label,
  value,
  placeholder,
  onChange,
  wide = false,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "field field-wide" : "field"}>
      <span>{label}</span>
      <input value={value || ""} onChange={(event) => onChange(event.target.value)} placeholder={placeholder || label} />
    </label>
  );
}

function WorkspaceTab({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button className={active ? "workspace-tab active" : "workspace-tab"} onClick={onClick} type="button">
      {children}
    </button>
  );
}

function SongLibrary({
  songs,
  selectedId,
  onSelect,
  onDelete,
}: {
  songs: Song[];
  selectedId?: number;
  onSelect: (song: Song) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <section className="library-panel" aria-label="Song library">
      <div className="table-head">
        <span>#</span>
        <span>Title</span>
        <span>Karen Title</span>
        <span>Key</span>
        <span>Style</span>
        <span>Updated</span>
      </div>
      <div className="song-list">
        {songs.map((item, index) => (
          <button
            className={item.id === selectedId ? "song-row selected" : "song-row"}
            key={item.id || `${item.title}-${index}`}
            onClick={() => onSelect(item)}
            type="button"
          >
            <span className="song-number">{String(index + 1).padStart(3, "0")}</span>
            <span className="song-title-cell">
              <strong>{item.title || "Untitled"}</strong>
              <small>{item.category || "Uncategorized"}</small>
            </span>
            <span className="karen-cell">{item.title_karen || "-"}</span>
            <span>{item.key || item.current_key || "-"}</span>
            <span>{item.style || "-"}</span>
            <span className="row-actions">
              <small>{item.updated_at ? item.updated_at.slice(0, 10) : "-"}</small>
              {item.id ? (
                <span
                  className="delete-row"
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete(item.id!);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      onDelete(item.id!);
                    }
                  }}
                >
                  Delete
                </span>
              ) : null}
            </span>
          </button>
        ))}
        {!songs.length ? <div className="empty-state">No songs found. Create a new song or adjust the search.</div> : null}
      </div>
    </section>
  );
}

function Inspector({ song, onChange }: { song: Song; onChange: (song: Song) => void }) {
  const set = (key: keyof Song, value: string) => onChange({ ...song, [key]: value });
  const setTags = (value: string) =>
    onChange({
      ...song,
      tags_json: value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    });

  return (
    <aside className="inspector">
      <div className="panel-title">
        <span>Details</span>
        <small>Song properties</small>
      </div>
      <div className="field-grid">
        <Field label="Title" value={song.title} onChange={(value) => set("title", value)} wide />
        <Field label="Karen Title" value={song.title_karen} onChange={(value) => set("title_karen", value)} wide />
        <Field label="Key" value={song.key || song.current_key} onChange={(value) => set("key", value)} />
        <Field label="Current Key" value={song.current_key} onChange={(value) => set("current_key", value)} />
        <Field label="Original Key" value={song.original_key} onChange={(value) => set("original_key", value)} />
        <Field label="Tempo" value={song.tempo} onChange={(value) => set("tempo", value)} placeholder="72 BPM" />
        <Field label="Collection" value={song.category} onChange={(value) => set("category", value)} />
        <Field label="Style" value={song.style} onChange={(value) => set("style", value)} />
        <Field label="Tags" value={(song.tags_json || []).join(", ")} onChange={setTags} wide />
      </div>
      <label className="field notes-field">
        <span>Director Notes</span>
        <textarea value={song.notes || ""} onChange={(event) => set("notes", event.target.value)} placeholder="Arrangement notes, service use, vocalist cues..." />
      </label>
      <div className="language-card">
        <span>Language Direction</span>
        <div className="segmented">
          <button type="button">LTR</button>
          <button className="active" type="button">Karen text</button>
        </div>
      </div>
    </aside>
  );
}

function Workspace({
  song,
  activeTab,
  setActiveTab,
  onChange,
}: {
  song: Song;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onChange: (song: Song) => void;
}) {
  const setChart = (value: string) => onChange({ ...song, chart_json: { ...(song.chart_json || {}), raw: value } });
  const setLyrics = (value: string) => onChange({ ...song, lyrics_json: value.split(/\n{2,}|\n/).filter(Boolean) });

  return (
    <section className="workspace">
      <div className="workspace-header">
        <div>
          <p className="eyebrow">Current chart</p>
          <h2>{song.title || "New Song"}</h2>
          <div className="meta-strip">
            <span>Key: {song.key || song.current_key || "-"}</span>
            <span>Tempo: {song.tempo || "-"}</span>
            <span>Collection: {song.category || "Uncategorized"}</span>
          </div>
        </div>
        <div className="workspace-tabs" role="tablist" aria-label="Workspace views">
          <WorkspaceTab active={activeTab === "chart"} onClick={() => setActiveTab("chart")}>Chart</WorkspaceTab>
          <WorkspaceTab active={activeTab === "lyrics"} onClick={() => setActiveTab("lyrics")}>Lyrics</WorkspaceTab>
          <WorkspaceTab active={activeTab === "notes"} onClick={() => setActiveTab("notes")}>Notes</WorkspaceTab>
        </div>
      </div>
      {activeTab === "chart" ? (
        <div className="editor-surface">
          <div className="editor-toolbar">
            <span>Autosave ready</span>
            <button type="button">Transpose</button>
            <button type="button">Add Section</button>
            <button type="button">Format</button>
          </div>
          <textarea className="chart-editor" value={chartText(song)} onChange={(event) => setChart(event.target.value)} placeholder="Intro: | D | G | D | A |\nVerse 1: | D | Bm | G | D |" />
        </div>
      ) : null}
      {activeTab === "lyrics" ? (
        <div className="editor-surface">
          <div className="editor-toolbar">
            <span>Karen lyrics and translation blocks</span>
            <button type="button">Timing Map</button>
          </div>
          <textarea className="lyrics-editor" value={lyricsText(song)} onChange={(event) => setLyrics(event.target.value)} placeholder="Karen lyrics, romanization, and translation..." />
        </div>
      ) : null}
      {activeTab === "notes" ? (
        <div className="editor-surface">
          <div className="editor-toolbar">
            <span>Planning notes</span>
          </div>
          <textarea className="lyrics-editor" value={song.notes || ""} onChange={(event) => onChange({ ...song, notes: event.target.value })} placeholder="Service flow, singers, instruments, reminders..." />
        </div>
      ) : null}
    </section>
  );
}

function PrintPreview({ song }: { song: Song }) {
  return (
    <aside className="print-preview">
      <div className="panel-title">
        <span>Print Preview</span>
        <small>A4 chord sheet</small>
      </div>
      <div className="paper-preview">
        <div className="paper-title">{song.title || "Untitled"}</div>
        <div className="paper-karen">{song.title_karen}</div>
        <div className="paper-meta">
          <span>Key {song.key || song.current_key || "-"}</span>
          <span>Tempo {song.tempo || "-"}</span>
        </div>
        <pre>{chartText(song) || "Chart preview will appear here."}</pre>
      </div>
      <div className="print-options">
        <label><input type="checkbox" defaultChecked /> Title</label>
        <label><input type="checkbox" defaultChecked /> Metadata</label>
        <label><input type="checkbox" defaultChecked /> Section labels</label>
      </div>
      <button className="primary-action" type="button" onClick={() => window.print()}>Print</button>
    </aside>
  );
}

function SettingsPanel({
  settings,
  onChange,
  onSave,
}: {
  settings: Record<string, string>;
  onChange: (settings: Record<string, string>) => void;
  onSave: () => void;
}) {
  return (
    <section className="settings-panel">
      <div className="panel-title">
        <span>Storage</span>
        <small>Local database folders</small>
      </div>
      <Field label="Default Folder" value={settings.default_song_dir || ""} onChange={(value) => onChange({ ...settings, default_song_dir: value })} wide />
      <Field label="Alternate Folder" value={settings.alt_song_dir || ""} onChange={(value) => onChange({ ...settings, alt_song_dir: value })} wide />
      <button className="quiet-action" type="button" onClick={onSave}>Save Settings</button>
    </section>
  );
}

function ReviewDrawer({
  review,
  onApply,
  onDismiss,
}: {
  review: ImportReview;
  onApply: () => void;
  onDismiss: () => void;
}) {
  return (
    <aside className="review-drawer">
      <div>
        <p className="eyebrow">OCR Review</p>
        <h3>{review.title || "Imported chart"}</h3>
        <p>Confidence: {Math.round((review.confidence || 0) * 100)}%</p>
      </div>
      <pre>{JSON.stringify(review.warnings || [], null, 2)}</pre>
      <div className="drawer-actions">
        <button className="primary-action" onClick={onApply} type="button">Apply Import</button>
        <button className="quiet-action" onClick={onDismiss} type="button">Dismiss</button>
      </div>
    </aside>
  );
}

export default function App() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [song, setSong] = useState<Song>(blankSong());
  const [query, setQuery] = useState("");
  const [review, setReview] = useState<ImportReview | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState("chart");
  const [dirty, setDirty] = useState(false);

  const refresh = async (nextQuery = query) => setSongs(await api.listSongs(nextQuery));

  useEffect(() => {
    refresh();
    api.getSettings().then(setSettings).catch(() => setSettings({}));
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const timer = window.setTimeout(() => {
      api.saveSong(song)
        .then((saved) => {
          setSong(saved);
          setDirty(false);
          refresh();
        })
        .catch(() => {});
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [song, dirty]);

  const selectedStats = useMemo(() => {
    const collections = new Set(songs.map((item) => item.category).filter(Boolean));
    return {
      total: songs.length,
      collections: collections.size,
      selected: song.id ? "Saved" : "Draft",
    };
  }, [songs, song.id]);

  const updateSong = (nextSong: Song) => {
    setSong(nextSong);
    setDirty(true);
  };

  const save = async () => {
    const saved = await api.saveSong(song);
    setSong(saved);
    setDirty(false);
    await refresh();
  };

  const deleteSong = async (id: number) => {
    await api.deleteSong(id);
    if (song.id === id) setSong(blankSong());
    await refresh();
  };

  const importPng = async (file: File) => setReview(await api.importPng(file));

  const exportJson = async () => {
    const payload = await api.exportJson();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "karen-music-library.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const applyReview = () => {
    if (!review) return;
    updateSong({
      ...song,
      ...review,
      chart_json: review.chart_json || song.chart_json,
      lyrics_json: review.lyrics_json || song.lyrics_json,
      metadata_json: review.metadata_json || song.metadata_json,
      tags_json: review.tags_json || song.tags_json,
    });
    setReview(null);
  };

  return (
    <div className="app-shell">
      <nav className="nav-rail" aria-label="Primary navigation">
        <div className="brand-mark">KM</div>
        <button className="nav-item active" type="button">Library</button>
        <button className="nav-item" type="button">Chart</button>
        <button className="nav-item" type="button">Lyrics</button>
        <button className="nav-item" type="button">Print</button>
        <button className="nav-item bottom" type="button">Settings</button>
      </nav>

      <main className="app-main">
        <header className="top-bar">
          <div>
            <p className="eyebrow">Music director database</p>
            <h1>Karen Music Director</h1>
          </div>
          <div className="top-actions">
            <input
              className="search-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && refresh()}
              placeholder="Search songs..."
            />
            <button className="quiet-action" onClick={() => refresh()} type="button">Search</button>
            <button className="quiet-action" onClick={() => setSong(blankSong())} type="button">New</button>
            <button className="primary-action" onClick={save} type="button">{dirty ? "Save Draft" : "Save"}</button>
            <label className="file-action">
              Import PNG
              <input type="file" accept=".png,image/png" onChange={(event) => event.target.files?.[0] && importPng(event.target.files[0])} />
            </label>
            <button className="quiet-action" onClick={exportJson} type="button">Export</button>
          </div>
        </header>

        <section className="stats-row" aria-label="Library status">
          <div><strong>{selectedStats.total}</strong><span>Songs</span></div>
          <div><strong>{selectedStats.collections}</strong><span>Collections</span></div>
          <div><strong>{selectedStats.selected}</strong><span>Current file</span></div>
          <div><strong>{dirty ? "Unsaved" : "Synced"}</strong><span>Database</span></div>
        </section>

        <div className="work-grid">
          <div className="center-stack">
            <SongLibrary songs={songs} selectedId={song.id} onSelect={(item) => { setSong(item); setDirty(false); }} onDelete={deleteSong} />
            <Workspace song={song} activeTab={activeTab} setActiveTab={setActiveTab} onChange={updateSong} />
            <SettingsPanel settings={settings} onChange={setSettings} onSave={() => api.saveSettings(settings)} />
          </div>
          <div className="right-stack">
            <Inspector song={song} onChange={updateSong} />
            <PrintPreview song={song} />
          </div>
        </div>
      </main>

      {review ? <ReviewDrawer review={review} onApply={applyReview} onDismiss={() => setReview(null)} /> : null}
    </div>
  );
}
