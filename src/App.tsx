import { Component, useEffect, useMemo, useState } from "react";
import { api } from "./services";
import type { ImportReview, Setlist, SetlistItem, Song } from "./types";
import { SETLIST_GROUPS } from "./types";
import { ALL_KEYS, normalizeChart, semitonesBetween, transposeChart, chordStateName } from "./music";
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
  youtubeUrl: "",
  facebookUrl: "",
  performanceUrl: "",
});

const chartText = (song: Song) => {
  if (typeof song.chart_json?.raw === "string" && song.chart_json.raw) return song.chart_json.raw;
  const sections = Array.isArray(song.chart_json?.sections) ? song.chart_json.sections : [];
  if (!sections.length) return "";
  return sections
    .map((section: any) => {
      const title = section?.type || section?.title || "Section";
      const measures = Array.isArray(section?.measures) ? section.measures : [];
      const body = measures
        .map((measure: any) => {
          const beats = Array.isArray(measure?.beats) ? measure.beats : [];
          return beats
            .map((beat: any) => {
              if (!beat || typeof beat !== "object") return "";
              if (typeof beat.chord === "string" && beat.chord) return beat.chord;
              const name = chordStateName(beat.chordState);
              if (name && beat.bass) return `${name}/${beat.bass}`;
              return name || beat?.label || "";
            })
            .join(" / ");
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
      if (!line || typeof line !== "object") return "";
      return [line.title, line.karenText, line.romanization, line.translation].filter(Boolean).join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
};

export function youtubeEmbedId(url: string): string | null {
  if (!url) return null;
  const match = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/.exec(url);
  return match ? match[1] : null;
}

// ---------------------------------------------------------------------------
// Error boundary: one bad song must never blank the whole app (the live-site
// crash). The library stays alive; the broken song shows an error card.
// ---------------------------------------------------------------------------
class ErrorBoundary extends Component<
  { children: React.ReactNode; resetKey?: string | number; fallbackTitle?: string },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidUpdate(prev: { resetKey?: string | number }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="song-error-card" role="alert">
          <strong>{this.props.fallbackTitle || "This song"} could not be displayed.</strong>
          <p>
            The rest of the library is unaffected. This song's saved data looks damaged — opening it in an
            older version of the site used to blank the whole page.
          </p>
          <small>{this.state.error.message}</small>
        </div>
      );
    }
    return this.props.children;
  }
}

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

function KeyField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value || ""} onChange={(event) => onChange(event.target.value)} aria-label={label}>
        <option value="">—</option>
        {ALL_KEYS.map((key) => (
          <option key={key} value={key}>{key}</option>
        ))}
        {value && !ALL_KEYS.includes(value) ? <option value={value}>{value} (custom)</option> : null}
      </select>
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
  totalCount,
  selectedId,
  duplicateTitles,
  onSelect,
  onDelete,
}: {
  songs: Song[];
  totalCount: number;
  selectedId?: number;
  duplicateTitles: Map<string, number>;
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
        <span>Style · Group</span>
        <span>Updated</span>
      </div>
      <div className="song-list">
        {songs.map((item, index) => {
          const dupCount = duplicateTitles.get((item.title || "").trim().toLowerCase()) || 0;
          return (
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
                {dupCount > 1 ? (
                  <span className="duplicate-badge" title="Another song in the library has this same title — check before Sunday">
                    Duplicate title ×{dupCount}
                  </span>
                ) : null}
              </span>
              <span className="karen-cell">{item.title_karen || "-"}</span>
              <span>{item.key || item.current_key || "-"}</span>
              <span>{[item.style, item.category].filter(Boolean).join(" · ") || "-"}</span>
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
          );
        })}
        {!songs.length && totalCount > 0 ? (
          <div className="empty-state">No songs match your search. Clear the search or filters to see the whole library.</div>
        ) : null}
        {!songs.length && totalCount === 0 ? (
          <div className="empty-state">No songs in the library yet — create a new song or import one to get started.</div>
        ) : null}
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
        <KeyField label="Key" value={song.key || song.current_key} onChange={(value) => { set("key", value); }} />
        <KeyField label="Current Key" value={song.current_key} onChange={(value) => set("current_key", value)} />
        <KeyField label="Original Key" value={song.original_key} onChange={(value) => set("original_key", value)} />
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

function ReferencesPanel({ song, onChange }: { song: Song; onChange: (song: Song) => void }) {
  const set = (key: keyof Song, value: string) => onChange({ ...song, [key]: value });
  const embedId = youtubeEmbedId(song.youtubeUrl || "");
  return (
    <aside className="references-panel">
      <div className="panel-title">
        <span>References</span>
        <small>Listen before Sunday</small>
      </div>
      <div className="field-grid">
        <Field label="YouTube URL" value={song.youtubeUrl || ""} onChange={(value) => set("youtubeUrl", value)} placeholder="https://www.youtube.com/watch?v=…" wide />
        <Field label="Facebook URL" value={song.facebookUrl || ""} onChange={(value) => set("facebookUrl", value)} placeholder="https://www.facebook.com/…" wide />
        <Field label="Our performance URL" value={song.performanceUrl || ""} onChange={(value) => set("performanceUrl", value)} placeholder="Link to the church's own performance" wide />
      </div>
      <div className="reference-links">
        {song.youtubeUrl ? <a href={song.youtubeUrl} target="_blank" rel="noreferrer">▶ YouTube</a> : null}
        {song.facebookUrl ? <a href={song.facebookUrl} target="_blank" rel="noreferrer">▶ Facebook</a> : null}
        {song.performanceUrl ? <a href={song.performanceUrl} target="_blank" rel="noreferrer">▶ Our performance</a> : null}
        {!song.youtubeUrl && !song.facebookUrl && !song.performanceUrl ? <small>No reference links yet.</small> : null}
      </div>
      {embedId ? (
        <div className="youtube-embed">
          <iframe
            src={`https://www.youtube.com/embed/${embedId}`}
            title={`YouTube reference for ${song.title || "song"}`}
            allow="accelerometer; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : null}
    </aside>
  );
}

function Workspace({
  song,
  activeTab,
  setActiveTab,
  onChange,
  onNotice,
}: {
  song: Song;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onChange: (song: Song) => void;
  onNotice: (message: string) => void;
}) {
  const setChart = (value: string) => onChange({ ...song, chart_json: { ...(song.chart_json || {}), raw: value, sections: song.chart_json?.sections || [] } });
  const setLyrics = (value: string) => onChange({ ...song, lyrics_json: value.split(/\n{2,}|\n/).filter(Boolean) });
  const [transposeTarget, setTransposeTarget] = useState("");

  const applyNormalize = () => {
    const { chart, changed } = normalizeChart(song.chart_json);
    if (!changed) {
      onNotice("Normalize: chords are already in normalized spelling.");
      return;
    }
    onChange({ ...song, chart_json: chart });
    onNotice("Normalize: chord spellings normalized (sharps preferred, Gb kept). Review, then Save.");
  };

  const applyTranspose = () => {
    const from = song.current_key || song.key || "";
    if (!transposeTarget || !from) {
      onNotice("Transpose: set the song's current key and pick a target key first.");
      return;
    }
    const semitones = semitonesBetween(from, transposeTarget);
    if (semitones === null) {
      onNotice(`Transpose: could not read the key "${from}".`);
      return;
    }
    if (semitones === 0) {
      onNotice(`Transpose: already in ${transposeTarget}.`);
      return;
    }
    const { chart } = transposeChart(song.chart_json, semitones, transposeTarget);
    onChange({ ...song, chart_json: chart, key: transposeTarget, current_key: transposeTarget });
    onNotice(`Transposed ${from} → ${transposeTarget} on the working copy. Review, then Save.`);
  };

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
            <label className="transpose-control">
              Transpose to
              <select value={transposeTarget} onChange={(event) => setTransposeTarget(event.target.value)} aria-label="Transpose target key">
                <option value="">Key…</option>
                {ALL_KEYS.map((key) => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
            </label>
            <button type="button" onClick={applyTranspose}>Transpose</button>
            <button type="button" onClick={applyNormalize}>Normalize</button>
            <button type="button">Add Section</button>
          </div>
          <textarea className="chart-editor" value={chartText(song)} onChange={(event) => setChart(event.target.value)} placeholder="Intro: | D | G | D | A |&#10;Verse 1: | D | Bm | G | D |" />
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

// ---------------------------------------------------------------------------
// Setlist ("This Week")
// ---------------------------------------------------------------------------
const SETLIST_STORAGE_KEY = "km-setlist-v1";

function nextSunday(from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
  return d.toISOString().slice(0, 10);
}

function loadSetlist(): Setlist {
  try {
    const raw = localStorage.getItem(SETLIST_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && Array.isArray(parsed.items)) {
        return {
          date: typeof parsed.date === "string" ? parsed.date : nextSunday(),
          items: parsed.items.filter((i: any) => i && typeof i.title === "string"),
          copiesPerGroup: parsed.copiesPerGroup && typeof parsed.copiesPerGroup === "object" ? parsed.copiesPerGroup : {},
        };
      }
    }
  } catch {
    /* fall through to a fresh setlist */
  }
  return { date: nextSunday(), items: [], copiesPerGroup: { "Praise & Worship": 10, Kids: 15, Youth: 10, Choir: 8, Solo: 2 } };
}

function SetlistPanel({
  songs,
  setlist,
  onChange,
  onPrintPacket,
  onNotice,
}: {
  songs: Song[];
  setlist: Setlist;
  onChange: (setlist: Setlist) => void;
  onPrintPacket: () => void;
  onNotice: (message: string) => void;
}) {
  const [addId, setAddId] = useState("");
  const songById = useMemo(() => new Map(songs.filter((s) => s.id).map((s) => [s.id!, s])), [songs]);

  const setItems = (items: SetlistItem[]) => onChange({ ...setlist, items });
  const move = (index: number, delta: number) => {
    const next = [...setlist.items];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
  };
  const addSong = (song: Song, group: string) => {
    if (song.id && setlist.items.some((i) => i.songId === song.id)) {
      onNotice(`"${song.title}" is already on this week's setlist.`);
      return;
    }
    setItems([...setlist.items, { songId: song.id, title: song.title || "Untitled", group }]);
  };
  const summary = () => {
    const dateLabel = new Date(`${setlist.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    const lines = [`Karen Music — Setlist for ${dateLabel}`, ""];
    setlist.items.forEach((item, i) => {
      const song = item.songId ? songById.get(item.songId) : undefined;
      const key = song?.current_key || song?.key || "";
      lines.push(`${i + 1}. ${item.title}${key ? ` (key of ${key})` : ""} — ${item.group}`);
      const ref = song?.youtubeUrl || song?.facebookUrl || song?.performanceUrl;
      if (ref) lines.push(`   Listen: ${ref}`);
    });
    return lines.join("\n");
  };
  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summary());
      onNotice("Setlist summary copied — paste it into the team chat.");
    } catch {
      onNotice("Copy failed — your browser blocked clipboard access.");
    }
  };

  return (
    <section className="setlist-panel" aria-label="This week setlist">
      <div className="panel-title">
        <span>This Week</span>
        <small>Sunday setlist</small>
      </div>
      <div className="setlist-controls">
        <label className="field">
          <span>Sunday date</span>
          <input type="date" value={setlist.date} onChange={(event) => onChange({ ...setlist, date: event.target.value })} />
        </label>
        <label className="field">
          <span>Add a song</span>
          <select value={addId} onChange={(event) => setAddId(event.target.value)} aria-label="Song to add to setlist">
            <option value="">Choose from library…</option>
            {songs.map((s) => (
              <option key={s.id || s.title} value={s.id || ""}>{s.title || "Untitled"}</option>
            ))}
          </select>
        </label>
        <button
          className="quiet-action"
          type="button"
          onClick={() => {
            const song = songs.find((s) => String(s.id) === addId);
            if (song) addSong(song, SETLIST_GROUPS.includes(song.category as any) ? song.category : "Praise & Worship");
          }}
        >
          Add to setlist
        </button>
      </div>
      <ol className="setlist-items">
        {setlist.items.map((item, index) => {
          const song = item.songId ? songById.get(item.songId) : undefined;
          return (
            <li key={`${item.songId || item.title}-${index}`} className="setlist-item">
              <span className="setlist-position">{index + 1}</span>
              <span className="setlist-title">
                <strong>{item.title}</strong>
                {song ? <small>{[song.current_key || song.key, song.style].filter(Boolean).join(" · ")}</small> : <small>Not in library</small>}
                {song?.youtubeUrl || song?.facebookUrl || song?.performanceUrl ? (
                  <span className="setlist-refs">
                    {song.youtubeUrl ? <a href={song.youtubeUrl} target="_blank" rel="noreferrer">YouTube</a> : null}
                    {song.facebookUrl ? <a href={song.facebookUrl} target="_blank" rel="noreferrer">Facebook</a> : null}
                    {song.performanceUrl ? <a href={song.performanceUrl} target="_blank" rel="noreferrer">Performance</a> : null}
                  </span>
                ) : null}
              </span>
              <select
                value={item.group}
                aria-label={`Group for ${item.title}`}
                onChange={(event) => {
                  const next = [...setlist.items];
                  next[index] = { ...item, group: event.target.value };
                  setItems(next);
                }}
              >
                {SETLIST_GROUPS.map((group) => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
              <span className="setlist-move">
                <button type="button" onClick={() => move(index, -1)} aria-label="Move up">↑</button>
                <button type="button" onClick={() => move(index, 1)} aria-label="Move down">↓</button>
                <button type="button" onClick={() => setItems(setlist.items.filter((_, i) => i !== index))} aria-label="Remove">✕</button>
              </span>
            </li>
          );
        })}
        {!setlist.items.length ? <li className="empty-state">No songs picked yet for this Sunday.</li> : null}
      </ol>
      <div className="copies-controls" aria-label="Copies per group">
        <span>Copies per group:</span>
        {SETLIST_GROUPS.map((group) => (
          <label key={group}>
            {group}
            <input
              type="number"
              min={0}
              max={200}
              value={setlist.copiesPerGroup[group] ?? 0}
              onChange={(event) => onChange({ ...setlist, copiesPerGroup: { ...setlist.copiesPerGroup, [group]: Number(event.target.value) || 0 } })}
            />
          </label>
        ))}
      </div>
      <div className="setlist-actions">
        <button className="primary-action" type="button" onClick={onPrintPacket} disabled={!setlist.items.length}>Print packet</button>
        <button className="quiet-action" type="button" onClick={copySummary} disabled={!setlist.items.length}>Copy setlist for the team</button>
      </div>
    </section>
  );
}

function PrintPacket({ setlist, songs }: { setlist: Setlist; songs: Song[] }) {
  const songById = useMemo(() => new Map(songs.filter((s) => s.id).map((s) => [s.id!, s])), [songs]);
  const dateLabel = new Date(`${setlist.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  return (
    <div className="print-packet" aria-hidden="true">
      <div className="packet-cover">
        <h1>Sunday Setlist — {dateLabel}</h1>
        <ol>
          {setlist.items.map((item, i) => (
            <li key={i}>{item.title} — {item.group} (×{setlist.copiesPerGroup[item.group] ?? 0} copies)</li>
          ))}
        </ol>
      </div>
      {setlist.items.map((item, i) => {
        const song = item.songId ? songById.get(item.songId) : undefined;
        if (!song) return null;
        return (
          <article className="packet-song" key={`${item.songId}-${i}`}>
            <header>
              <h2>{i + 1}. {song.title}</h2>
              {song.title_karen ? <p className="packet-karen">{song.title_karen}</p> : null}
              <p className="packet-meta">
                {item.group} · Key {song.current_key || song.key || "-"} · {song.style || ""} · Tempo {song.tempo || "-"} ·
                Print {setlist.copiesPerGroup[item.group] ?? 0} copies for {item.group}
              </p>
            </header>
            <pre>{chartText(song) || "No chart saved for this song yet."}</pre>
            {lyricsText(song) ? <pre className="packet-lyrics">{lyricsText(song)}</pre> : null}
          </article>
        );
      })}
    </div>
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
      <button className="primary-action" type="button" onClick={() => window.print()}>Print song</button>
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
  const [styleFilter, setStyleFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [review, setReview] = useState<ImportReview | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState("chart");
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState("");
  const [setlist, setSetlist] = useState<Setlist>(loadSetlist);
  const [printingPacket, setPrintingPacket] = useState(false);
  const [libraryTotal, setLibraryTotal] = useState(0);

  const refresh = async (nextQuery = query) => {
    try {
      const rows = await api.listSongs(nextQuery);
      setSongs(rows);
      if (!nextQuery) setLibraryTotal(rows.length);
    } catch {
      setNotice("Could not load songs from the database — keeping the last list shown.");
    }
  };

  useEffect(() => {
    refresh();
    api.getSettings().then(setSettings).catch(() => setSettings({}));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SETLIST_STORAGE_KEY, JSON.stringify(setlist));
    } catch {
      /* storage unavailable — setlist still works for this session */
    }
  }, [setlist]);

  useEffect(() => {
    if (!printingPacket) return;
    const clear = () => setPrintingPacket(false);
    window.addEventListener("afterprint", clear);
    const timer = window.setTimeout(() => window.print(), 60);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("afterprint", clear);
    };
  }, [printingPacket]);

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

  const styleOptions = useMemo(
    () => [...new Set(songs.map((s) => s.style).filter(Boolean))].sort(),
    [songs],
  );
  const groupOptions = useMemo(
    () => [...new Set(songs.map((s) => s.category).filter(Boolean))].sort(),
    [songs],
  );
  const duplicateTitles = useMemo(() => {
    const counts = new Map<string, number>();
    songs.forEach((s) => {
      const key = (s.title || "").trim().toLowerCase();
      if (key) counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [songs]);
  const visibleSongs = useMemo(
    () =>
      songs.filter(
        (s) =>
          (!styleFilter || s.style === styleFilter) &&
          (!groupFilter || s.category === groupFilter),
      ),
    [songs, styleFilter, groupFilter],
  );

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
    <div className={printingPacket ? "app-root printing-packet" : "app-root"}>
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
                placeholder="Search titles, key, or style..."
                aria-label="Search song database"
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

          {notice ? (
            <div className="notice-bar" role="status">
              <span>{notice}</span>
              <button type="button" onClick={() => setNotice("")} aria-label="Dismiss notice">✕</button>
            </div>
          ) : null}

          <section className="stats-row" aria-label="Library status">
            <div><strong>{selectedStats.total}</strong><span>Songs</span></div>
            <div><strong>{selectedStats.collections}</strong><span>Collections</span></div>
            <div><strong>{selectedStats.selected}</strong><span>Current file</span></div>
            <div><strong>{dirty ? "Unsaved" : "Synced"}</strong><span>Database</span></div>
          </section>

          <section className="filter-bar" aria-label="Library filters">
            <span className="filter-label">Style:</span>
            <button type="button" className={!styleFilter ? "chip active" : "chip"} onClick={() => setStyleFilter("")}>All styles</button>
            {styleOptions.map((style) => (
              <button
                type="button"
                key={style}
                className={styleFilter === style ? "chip active" : "chip"}
                onClick={() => setStyleFilter(styleFilter === style ? "" : style)}
              >
                {style}
              </button>
            ))}
            <span className="filter-label">Group:</span>
            <button type="button" className={!groupFilter ? "chip active" : "chip"} onClick={() => setGroupFilter("")}>All groups</button>
            {groupOptions.map((group) => (
              <button
                type="button"
                key={group}
                className={groupFilter === group ? "chip active" : "chip"}
                onClick={() => setGroupFilter(groupFilter === group ? "" : group)}
              >
                {group}
              </button>
            ))}
          </section>

          <div className="work-grid">
            <div className="center-stack">
              <SongLibrary
                songs={visibleSongs}
                totalCount={libraryTotal}
                selectedId={song.id}
                duplicateTitles={duplicateTitles}
                onSelect={(item) => { setSong(item); setDirty(false); }}
                onDelete={deleteSong}
              />
              <ErrorBoundary resetKey={song.id || song.title} fallbackTitle={song.title || "This song"}>
                <Workspace song={song} activeTab={activeTab} setActiveTab={setActiveTab} onChange={updateSong} onNotice={setNotice} />
              </ErrorBoundary>
              <SetlistPanel songs={songs} setlist={setlist} onChange={setSetlist} onPrintPacket={() => setPrintingPacket(true)} onNotice={setNotice} />
              <SettingsPanel settings={settings} onChange={setSettings} onSave={() => api.saveSettings(settings)} />
            </div>
            <div className="right-stack">
              <Inspector song={song} onChange={updateSong} />
              <ReferencesPanel song={song} onChange={updateSong} />
              <ErrorBoundary resetKey={`print-${song.id || song.title}`} fallbackTitle="Print preview">
                <PrintPreview song={song} />
              </ErrorBoundary>
            </div>
          </div>
        </main>

        {review ? <ReviewDrawer review={review} onApply={applyReview} onDismiss={() => setReview(null)} /> : null}
      </div>
      {printingPacket ? <PrintPacket setlist={setlist} songs={songs} /> : null}
    </div>
  );
}
