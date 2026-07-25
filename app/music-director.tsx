"use client";

import { ChangeEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

type Chord = { root: string; minor?: boolean; flat?: boolean };
type Beat = { chord: Chord | null };
type Measure = { beats: Beat[] };
type Section = { id: string; name: string; preMeasure: Measure | null; measures: Measure[] };
type Song = {
  id?: number;
  titleKaren: string;
  titleEnglish: string;
  style: string;
  key: string;
  bpm: number;
  meter: string;
  group: string;
  instruments: string[];
  lyrics: string;
  sections: Section[];
  updatedAt?: string;
};

const instrumentOptions = ["Piano 1", "Piano 2", "Acoustic Guitar", "Bass", "Drums", "Strings"];
const createMeasure = (count = 4): Measure => ({ beats: Array.from({ length: count }, () => ({ chord: null })) });
const demoSong = (): Song => ({
  titleKaren: "တၢ်သးဝံၣ်အဒိ",
  titleEnglish: "Practice Song",
  style: "Worship",
  key: "G",
  bpm: 76,
  meter: "4/4",
  group: "Sunday Team",
  instruments: ["Piano 1", "Acoustic Guitar"],
  lyrics: "Verse 1\nAdd approved S’gaw Karen and English lyrics here.\n\nChorus\nThis hosted chart uses demonstration content only.",
  sections: [
    {
      id: crypto.randomUUID(),
      name: "INTRO",
      preMeasure: null,
      measures: [createMeasure(), createMeasure(), createMeasure(), createMeasure()],
    },
    {
      id: crypto.randomUUID(),
      name: "VERSE",
      preMeasure: null,
      measures: [createMeasure(), createMeasure(), createMeasure(), createMeasure()],
    },
    {
      id: crypto.randomUUID(),
      name: "CHORUS",
      preMeasure: null,
      measures: [createMeasure(), createMeasure(), createMeasure(), createMeasure()],
    },
  ],
});

function chordLabel(chord: Chord | null) {
  if (!chord) return "";
  return `${chord.root}${chord.flat ? "♭" : ""}${chord.minor ? "m" : ""}`;
}

export function MusicDirector() {
  const [song, setSong] = useState<Song>(() => demoSong());
  const [tab, setTab] = useState<"chart" | "lyrics" | "database">("chart");
  const [selected, setSelected] = useState({ section: 0, measure: 0, beat: 0, pre: false });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [newSongOpen, setNewSongOpen] = useState(false);
  const [instrumentOpen, setInstrumentOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [status, setStatus] = useState("Demo chart, not yet saved");
  const [songs, setSongs] = useState<Song[]>([]);
  const [search, setSearch] = useState("");
  const [zoom, setZoom] = useState(100);
  const fileInput = useRef<HTMLInputElement>(null);

  const activeMeasure = useMemo(() => {
    const section = song.sections[selected.section];
    return selected.pre ? section?.preMeasure : section?.measures[selected.measure];
  }, [song, selected]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.appReady = "true";
    if (window.matchMedia("(max-width: 900px)").matches) setSidebarOpen(false);
    return () => {
      delete document.documentElement.dataset.appReady;
    };
  }, []);

  useEffect(() => {
    const handleVariableMeasure = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      if (event.ctrlKey && !event.altKey && !event.metaKey && /^[1-6]$/.test(event.key)) {
        event.preventDefault();
        event.stopPropagation();
        insertMeasure(Number(event.key));
      }
    };
    document.addEventListener("keydown", handleVariableMeasure, true);
    return () => document.removeEventListener("keydown", handleVariableMeasure, true);
  }, [selected.section, selected.measure, selected.pre]);

  useEffect(() => {
    fetch("/api/songs")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => setSongs(data.songs ?? []))
      .catch(() => setStatus("Hosted library is unavailable; this draft remains local"));
  }, []);

  function updateSong(patch: Partial<Song>) {
    setSong((current) => ({ ...current, ...patch }));
    setStatus("Unsaved changes");
  }

  function updateBeat(root: string) {
    setSong((current) => {
      const next = structuredClone(current);
      const section = next.sections[selected.section];
      const measure = selected.pre ? section.preMeasure : section.measures[selected.measure];
      if (!measure) return current;
      const currentChord = measure.beats[selected.beat].chord;
      if (root === "m" && currentChord) currentChord.minor = !currentChord.minor;
      else if (root === "b" && currentChord) currentChord.flat = !currentChord.flat;
      else measure.beats[selected.beat].chord = { root: root.toUpperCase() };
      return next;
    });
    setStatus("Unsaved changes");
  }

  function insertMeasure(beatCount: number) {
    if (selected.pre) return;
    setSong((current) => {
      const next = structuredClone(current);
      next.sections[selected.section].measures.splice(selected.measure + 1, 0, createMeasure(beatCount));
      return next;
    });
    setSelected((current) => ({ ...current, measure: current.measure + 1, beat: 0, pre: false }));
    setStatus(`Inserted ${beatCount}-beat measure`);
  }

  function handleEditorKey(event: KeyboardEvent<HTMLElement>) {
    if (/^[a-gA-G]$/.test(event.key)) {
      event.preventDefault();
      updateBeat(event.key);
      return;
    }
    if (event.key === "m" || event.key === "b") {
      event.preventDefault();
      updateBeat(event.key);
      return;
    }
    if (event.key === "Backspace") {
      event.preventDefault();
      const section = song.sections[selected.section];
      if (selected.pre && section.preMeasure?.beats.every((beat) => !beat.chord)) {
        setSong((current) => {
          const next = structuredClone(current);
          next.sections[selected.section].preMeasure = null;
          return next;
        });
        setSelected((current) => ({ ...current, pre: false, measure: 0, beat: 0 }));
        setStatus("Pre-measure removed");
      } else if (activeMeasure) {
        setSong((current) => {
          const next = structuredClone(current);
          const targetSection = next.sections[selected.section];
          const measure = selected.pre ? targetSection.preMeasure : targetSection.measures[selected.measure];
          if (measure) measure.beats[selected.beat].chord = null;
          return next;
        });
      }
    }
    if (event.key === "ArrowRight" && activeMeasure) {
      event.preventDefault();
      setSelected((current) => {
        if (current.beat < activeMeasure.beats.length - 1) return { ...current, beat: current.beat + 1 };
        const section = song.sections[current.section];
        if (!current.pre && current.measure < section.measures.length - 1) return { ...current, measure: current.measure + 1, beat: 0 };
        return current;
      });
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setSelected((current) => ({ ...current, beat: Math.max(0, current.beat - 1) }));
    }
  }

  async function saveSong() {
    setStatus("Saving");
    try {
      const response = await fetch("/api/songs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(song),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Save failed");
      const saved = data.song as Song;
      setSong(saved);
      setSongs((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setStatus("Saved to hosted library");
    } catch {
      setStatus("Save failed; export this draft before leaving");
    }
  }

  function exportSong() {
    const blob = new Blob([JSON.stringify(song, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${song.titleEnglish || "song"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus("Song exported");
  }

  function importSong(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result)) as Song;
        if (!Array.isArray(imported.sections)) throw new Error();
        setSong({ ...imported, id: undefined });
        setSelected({ section: 0, measure: 0, beat: 0, pre: false });
        setStatus("Imported for review; press Save after checking");
      } catch {
        setStatus("Import could not be read; choose a Karen Music JSON export");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function startNewSong() {
    setSong(demoSong());
    setNewSongOpen(false);
    setStatus("New unsaved song");
  }

  const filteredSongs = songs.filter((item) =>
    `${item.titleKaren} ${item.titleEnglish} ${item.key} ${item.style}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="app-shell" onKeyDownCapture={handleEditorKey}>
      <header className="app-header">
        <div className="brand">
          <button className="icon-button" onClick={() => setSidebarOpen((value) => !value)} aria-label="Toggle song details">☰</button>
          <div>
            <strong>Karen Music Director</strong>
            <span>ကညီတၢ်သးဝံၣ်</span>
          </div>
        </div>
        <nav className="global-actions" aria-label="Song actions">
          <button onClick={() => setNewSongOpen(true)}>New song</button>
          <button onClick={saveSong} className="primary">Save</button>
          <button onClick={() => fileInput.current?.click()}>Import</button>
          <button onClick={exportSong}>Export</button>
          <button onClick={() => window.print()}>Print</button>
          <button onClick={() => setTheme((value) => value === "dark" ? "light" : "dark")} aria-label="Toggle color theme">{theme === "dark" ? "Light" : "Dark"}</button>
          <input ref={fileInput} type="file" accept=".json,application/json" onChange={importSong} hidden />
        </nav>
      </header>

      <div className={`workspace ${sidebarOpen ? "" : "sidebar-collapsed"}`}>
        <aside className="sidebar" aria-label="Song details">
          <div className="sidebar-heading">
            <span>Song details</span>
            <button className="icon-button" onClick={() => setSidebarOpen(false)} aria-label="Close song details">×</button>
          </div>
          <label>Karen title<input lang="kar" value={song.titleKaren} onChange={(event) => updateSong({ titleKaren: event.target.value })} /></label>
          <label>English title<input value={song.titleEnglish} onChange={(event) => updateSong({ titleEnglish: event.target.value })} /></label>
          <div className="field-pair">
            <label>Key<select value={song.key} onChange={(event) => updateSong({ key: event.target.value })}>{["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"].map((key) => <option key={key}>{key}</option>)}</select></label>
            <label>Style<input value={song.style} onChange={(event) => updateSong({ style: event.target.value })} /></label>
          </div>
          <div className="field-pair">
            <label>BPM<input type="number" value={song.bpm} onChange={(event) => updateSong({ bpm: Number(event.target.value) })} /></label>
            <label>Meter<select value={song.meter} onChange={(event) => updateSong({ meter: event.target.value })}>{["4/4", "3/4", "5/5", "6/8"].map((meter) => <option key={meter}>{meter}</option>)}</select></label>
          </div>
          <label>Group<input value={song.group} onChange={(event) => updateSong({ group: event.target.value })} /></label>
          <div className="instrument-field">
            <span>Print instruments</span>
            <button onClick={() => setInstrumentOpen((value) => !value)} aria-expanded={instrumentOpen}>
              {song.instruments.length ? song.instruments.join(", ") : "Reference only"}
            </button>
            {instrumentOpen && <div className="instrument-menu">
              {instrumentOptions.map((instrument) => <label key={instrument}>
                <input
                  type="checkbox"
                  checked={song.instruments.includes(instrument)}
                  onChange={() => updateSong({
                    instruments: song.instruments.includes(instrument)
                      ? song.instruments.filter((item) => item !== instrument)
                      : [...song.instruments, instrument],
                  })}
                />
                {instrument}
              </label>)}
            </div>}
          </div>
          <div className="shortcut-note">
            <strong>Keyboard</strong>
            <span>A–G enters chords</span>
            <span>Ctrl+1–6 inserts a measure</span>
            <span>Arrow keys move the cursor</span>
          </div>
        </aside>

        <section className="editor-stage" aria-label="Music editor">
          <div className="command-bar">
            <div className="song-position">
              <span className="eyebrow">Active chart</span>
              <strong>{song.key} · {song.style}</strong>
            </div>
            <div className="view-controls" aria-label="View controls">
              <button onClick={() => setZoom((value) => Math.max(70, value - 10))} aria-label="Zoom out">−</button>
              <output>{zoom}%</output>
              <button onClick={() => setZoom((value) => Math.min(140, value + 10))} aria-label="Zoom in">+</button>
              <button onClick={() => setZoom(100)}>Fit</button>
            </div>
            <span className="status" aria-live="polite">{status}</span>
          </div>

          <div className="paper-area">
            <div className="paper-tabs" role="tablist" aria-label="Song work surfaces">
              {(["chart", "lyrics", "database"] as const).map((name) => (
                <button key={name} role="tab" aria-selected={tab === name} onClick={() => setTab(name)}>{name}</button>
              ))}
            </div>

            {tab === "chart" && <article className="paper chart-paper" tabIndex={0} style={{ "--paper-zoom": zoom / 100 } as React.CSSProperties}>
              <header className="paper-header">
                <div><input aria-label="Karen title on paper" lang="kar" placeholder="Karen title" value={song.titleKaren} onChange={(event) => updateSong({ titleKaren: event.target.value })} /><input aria-label="English title on paper" placeholder="English title" value={song.titleEnglish} onChange={(event) => updateSong({ titleEnglish: event.target.value })} /></div>
                <input aria-label="Song style on paper" value={song.style} onChange={(event) => updateSong({ style: event.target.value })} />
                <select aria-label="Song key on paper" value={song.key} onChange={(event) => updateSong({ key: event.target.value })}>{["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"].map((key) => <option key={key}>{key}</option>)}</select>
              </header>
              <div className="chart-body">
                {song.sections.map((section, sectionIndex) => <section className="chart-section" key={section.id}>
                  <div className="section-title"><span>{section.name}</span><button aria-label={`Remove ${section.name}`}>×</button></div>
                  <div className="measure-row">
                    {section.preMeasure && <MeasureView measure={section.preMeasure} active={selected.section === sectionIndex && selected.pre} onBeat={(beat) => setSelected({ section: sectionIndex, measure: 0, beat, pre: true })} pre />}
                    {section.measures.map((measure, measureIndex) => <MeasureView
                      key={`${section.id}-${measureIndex}`}
                      measure={measure}
                      active={selected.section === sectionIndex && selected.measure === measureIndex && !selected.pre}
                      activeBeat={selected.section === sectionIndex && selected.measure === measureIndex && !selected.pre ? selected.beat : -1}
                      onBeat={(beat) => setSelected({ section: sectionIndex, measure: measureIndex, beat, pre: false })}
                    />)}
                    <button className="row-stepper" onClick={() => {
                      setSelected({ section: sectionIndex, measure: section.measures.length - 1, beat: 0, pre: false });
                      insertMeasure(Number(song.meter.split("/")[0]) || 4);
                    }} aria-label={`Add measure to ${section.name}`}>+</button>
                  </div>
                </section>)}
              </div>
              <footer className="paper-footer">
                <span>{song.bpm} BPM, {song.meter}</span>
                <span>{song.instruments[0] || "Reference"}</span>
                <input aria-label="Group on paper" placeholder="Group" value={song.group} onChange={(event) => updateSong({ group: event.target.value })} />
              </footer>
            </article>}

            {tab === "lyrics" && <article className="paper lyrics-paper">
              <header><div><strong lang="kar">{song.titleKaren || "Karen title"}</strong><span>{song.titleEnglish || "English title"}</span></div><span>{song.key}</span></header>
              <textarea aria-label="Song lyrics" value={song.lyrics} onChange={(event) => updateSong({ lyrics: event.target.value })} placeholder="Lyrics" />
            </article>}

            {tab === "database" && <article className="paper database-paper">
              <header><div><strong>Song library</strong><span>Approved hosted charts</span></div><span>{songs.length} songs</span></header>
              <input className="library-search" type="search" placeholder="Search titles, key, or style" value={search} onChange={(event) => setSearch(event.target.value)} />
              <div className="song-list">
                {filteredSongs.length === 0 ? <div className="empty-state"><strong>No hosted songs yet</strong><span>Save a reviewed, sanitized chart to add it to this private library.</span></div> :
                  filteredSongs.map((item) => <button key={item.id} onClick={() => { setSong(item); setTab("chart"); setStatus("Loaded from hosted library"); }}>
                    <span lang="kar">{item.titleKaren}</span><strong>{item.titleEnglish}</strong><small>{item.key} · {item.style} · {item.meter}</small>
                  </button>)}
              </div>
            </article>}
          </div>
        </section>
      </div>

      <nav className="mobile-toolbar" aria-label="Mobile editor tools">
        <button onClick={() => setSidebarOpen(true)}>Details</button>
        <button onClick={() => setTab("chart")} aria-current={tab === "chart"}>Chart</button>
        <button onClick={() => insertMeasure(Number(song.meter.split("/")[0]) || 4)}>+ Measure</button>
        <button onClick={saveSong}>Save</button>
        <button onClick={() => window.print()}>Print</button>
      </nav>

      {newSongOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setNewSongOpen(false)}>
        <section className="modal" role="dialog" aria-modal="true" aria-labelledby="new-song-title">
          <header><div><span className="eyebrow">New chart</span><h2 id="new-song-title">Start with song details</h2></div><button className="icon-button" onClick={() => setNewSongOpen(false)} aria-label="Close new song dialog">×</button></header>
          <p>This creates an unsaved demonstration chart. Add only approved, sanitized song content before saving it online.</p>
          <div className="modal-actions"><button onClick={() => setNewSongOpen(false)}>Cancel</button><button className="primary" onClick={startNewSong}>Create chart</button></div>
        </section>
      </div>}
    </main>
  );
}

function MeasureView({ measure, active, activeBeat = -1, onBeat, pre = false }: { measure: Measure; active: boolean; activeBeat?: number; onBeat: (beat: number) => void; pre?: boolean }) {
  return <div className={`measure ${active ? "active-measure" : ""} ${pre ? "pre-measure" : ""}`} style={{ gridTemplateColumns: `repeat(${measure.beats.length}, minmax(28px, 1fr))` }}>
    {measure.beats.map((beat, index) => <button
      key={index}
      className={activeBeat === index ? "active-beat" : ""}
      onClick={() => onBeat(index)}
      aria-label={`${pre ? "Pre-measure" : "Measure"} beat ${index + 1}${beat.chord ? `, ${chordLabel(beat.chord)}` : ""}`}
    >{chordLabel(beat.chord)}</button>)}
  </div>;
}
