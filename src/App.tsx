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
  chart_json: { sections: [] },
  lyrics_json: [],
  metadata_json: {},
  tags_json: [],
});

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="panel"><h2>{title}</h2>{children}</section>;
}

function SongManager({ songs, onSelect, onDelete }: any) {
  return <Panel title="Song Manager"><div className="list">{songs.map((song: Song) => <button key={song.id} className="list-item" onClick={() => onSelect(song)}><strong>{song.title || "Untitled"}</strong><span>{song.key} · {song.style}</span><em>{song.title_karen}</em><small>{song.updated_at}</small><span className="tag">{song.category || "Uncategorized"}</span><a onClick={(e) => { e.stopPropagation(); onDelete(song.id!); }}>Delete</a></button>)}</div></Panel>;
}

function MetadataEditor({ song, onChange }: any) {
  const set = (k: keyof Song, v: string) => onChange({ ...song, [k]: v });
  return <Panel title="Metadata Editor"><div className="grid"><input value={song.title} onChange={(e) => set("title", e.target.value)} placeholder="Song title" /><input value={song.title_karen} onChange={(e) => set("title_karen", e.target.value)} placeholder="Karen title" /><input value={song.key} onChange={(e) => set("key", e.target.value)} placeholder="Key" /><input value={song.current_key} onChange={(e) => set("current_key", e.target.value)} placeholder="Current key" /><input value={song.original_key} onChange={(e) => set("original_key", e.target.value)} placeholder="Original key" /><input value={song.tempo} onChange={(e) => set("tempo", e.target.value)} placeholder="Tempo / BPM" /><input value={song.category} onChange={(e) => set("category", e.target.value)} placeholder="Category" /><input value={song.style} onChange={(e) => set("style", e.target.value)} placeholder="Style" /></div><textarea value={song.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Notes" /></Panel>;
}

function ChartEditor({ song, onChange }: any) {
  const set = (v: string) => onChange({ ...song, chart_json: { ...song.chart_json, raw: v } });
  return <Panel title="Chord Chart Editor"><textarea className="chart" value={song.chart_json.raw || ""} onChange={(e) => set(e.target.value)} placeholder="Chord chart text / structure" /><div className="muted">Autosave draft enabled</div></Panel>;
}

function LyricsBlocks({ song, onChange }: any) {
  const lines = song.lyrics_json.join("\n");
  return <Panel title="Lyrics / Karen Text"><textarea className="lyrics" value={lines} onChange={(e) => onChange({ ...song, lyrics_json: e.target.value.split(/\n+/).filter(Boolean) })} placeholder="Lyrics, Karen text, translation blocks" /></Panel>;
}

function PreviewPane({ song }: any) {
  return <Panel title="Print / Export Preview"><div className="preview"><div><strong>{song.title || "Untitled"}</strong><div>{song.title_karen}</div><div>{song.key} · {song.tempo} BPM</div></div><pre>{JSON.stringify(song.chart_json, null, 2)}</pre></div></Panel>;
}

function SettingsPanel({ settings, onChange }: any) {
  return <Panel title="Settings"><input value={settings.default_song_dir || ""} onChange={(e) => onChange({ ...settings, default_song_dir: e.target.value })} placeholder="Default folder" /><input value={settings.alt_song_dir || ""} onChange={(e) => onChange({ ...settings, alt_song_dir: e.target.value })} placeholder="Alt folder" /></Panel>;
}

export default function App() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [song, setSong] = useState<Song>(blankSong());
  const [query, setQuery] = useState("");
  const [review, setReview] = useState<ImportReview | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});

  const refresh = async () => setSongs(await api.listSongs(query));
  useEffect(() => { refresh(); api.getSettings().then(setSettings); }, []);
  useEffect(() => { const t = setTimeout(() => api.saveSong(song).then(refresh).catch(() => {}), 1000); return () => clearTimeout(t); }, [song]);

  const save = async () => { const saved = await api.saveSong(song); setSong(saved); refresh(); };
  const del = async (id: number) => { await api.deleteSong(id); refresh(); };
  const importPng = async (file: File) => setReview(await api.importPng(file));
  const applyReview = () => setSong({ ...song, ...review!, chart_json: review?.chart_json || song.chart_json, lyrics_json: review?.lyrics_json || song.lyrics_json, metadata_json: review?.metadata_json || song.metadata_json, tags_json: review?.tags_json || song.tags_json });

  return <div className="app"><header><div><h1>Karen Music Director</h1><p>Desktop/web chord-chart editor with SQLite, OCR import, and export preview.</p></div><div className="actions"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search songs" /><button onClick={refresh}>Search</button><button onClick={() => setSong(blankSong())}>New Song</button><button onClick={save}>Save</button><label className="file"><input type="file" accept=".png,image/png" onChange={(e) => e.target.files?.[0] && importPng(e.target.files[0])} />Import PNG</label></div></header><main><SongManager songs={songs} onSelect={setSong} onDelete={del} /><MetadataEditor song={song} onChange={setSong} /><ChartEditor song={song} onChange={setSong} /><LyricsBlocks song={song} onChange={setSong} /><PreviewPane song={song} /><SettingsPanel settings={settings} onChange={setSettings} /></main>{review && <aside className="review"><h3>OCR Review</h3><p>Confidence: {Math.round(review.confidence * 100)}%</p><pre>{JSON.stringify(review.warnings, null, 2)}</pre><button onClick={applyReview}>Apply import</button><button onClick={() => setReview(null)}>Dismiss</button></aside>}</div>;
}
