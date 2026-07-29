import { a as require_react, o as __toESM, t as require_jsx_runtime } from "../index.js";
//#region app/music-director.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var instrumentOptions = [
	"Piano 1",
	"Piano 2",
	"Acoustic Guitar",
	"Bass",
	"Drums",
	"Strings"
];
var cueAbbreviationOptions = [
	"P1",
	"P2",
	"AG",
	"EG",
	"B",
	"D",
	"STR"
];
var sectionOptions = [
	"INTRO",
	"VERSE",
	"PRE-CHORUS",
	"CHORUS",
	"BRIDGE",
	"SOLO",
	"ENDING"
];
var songGroupOptions = [
	"Praise & Worship",
	"Kids",
	"Youth",
	"Choir",
	"Solo"
];
var MIN_BPM = 55;
var MAX_BPM = 155;
var KAREN_LAYOUT = [
	"က",
	"ခ",
	"ဂ",
	"ဃ",
	"င",
	"စ",
	"ဆ",
	"ၡ",
	"ည",
	"ယ",
	"ရ",
	"လ",
	"ဝ",
	"သ",
	"မ",
	"ဘ",
	"ဖ",
	"ပ",
	"န",
	"ဒ",
	"ထ",
	"တ",
	"ဟ",
	"အ",
	"ဧ",
	"ါ",
	"ံ",
	"ိ",
	"ီ",
	"ု",
	"ူ",
	"ဲ",
	"ၢ",
	"့",
	"်",
	"း",
	"ၢ်",
	"ာ်",
	"ၣ်",
	"ၤ",
	"ှ",
	"ၠ",
	"ြ",
	"ျ",
	"ွ",
	"ဝ",
	"၁",
	"၂",
	"၃",
	"၄",
	"၅",
	"၆",
	"၇",
	"၈",
	"၉"
];
var KAREN_GROUPS = [
	{
		label: "Numbers",
		keys: KAREN_LAYOUT.slice(45)
	},
	{
		label: "Tones",
		keys: KAREN_LAYOUT.slice(35, 40)
	},
	{
		label: "Consonants",
		keys: KAREN_LAYOUT.slice(0, 25)
	},
	{
		label: "Vowels",
		keys: KAREN_LAYOUT.slice(25, 35)
	},
	{
		label: "Medials",
		keys: KAREN_LAYOUT.slice(40, 45)
	}
];
var KAREN_HOTKEYS = "abcdefghijklmnopqrstuvwxyz".split("").reduce((map, key, index) => {
	map[key] = {
		base: KAREN_LAYOUT[index] || "",
		shift: KAREN_LAYOUT[index + 26] || ""
	};
	return map;
}, {});
var DEFAULT_MEASURES_PER_ROW = 8;
var MIN_MEASURES_PER_ROW = 4;
var MAX_MEASURES_PER_ROW = 16;
var createMeasure = (count = 4) => ({ beats: Array.from({ length: count }, () => ({ chord: null })) });
var clampZoom = (value) => Math.min(175, Math.max(55, value));
var nextZoom = (current, direction) => clampZoom(Math.round(current * (direction > 0 ? 1.12 : 1 / 1.12)));
function clampBpm(value) {
	return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(Number(value) || 76)));
}
function normalizeSongGroup(value) {
	const group = value?.trim().toLowerCase() ?? "";
	if (group.includes("praise") || group.includes("worship")) return "Praise & Worship";
	if (group.includes("kid")) return "Kids";
	if (group.includes("youth")) return "Youth";
	if (group.includes("choir")) return "Choir";
	if (group.includes("solo")) return "Solo";
	return "Praise & Worship";
}
function normalizeSongMetadata(song) {
	return {
		...song,
		bpm: clampBpm(song.bpm),
		group: normalizeSongGroup(song.group)
	};
}
function paginationItems(current, total) {
	if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
	const pages = [...new Set([
		1,
		2,
		total - 1,
		total,
		current - 1,
		current,
		current + 1
	])].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
	const items = [];
	pages.forEach((page, index) => {
		if (index > 0 && page - pages[index - 1] > 1) items.push("ellipsis");
		items.push(page);
	});
	return items;
}
function clampMeasuresPerRow(value) {
	return Math.max(MIN_MEASURES_PER_ROW, Math.min(MAX_MEASURES_PER_ROW, Math.round(value)));
}
function rowsForSection(section) {
	const rows = [];
	let start = 0;
	let rowIndex = 0;
	while (start < section.measures.length) {
		const cap = clampMeasuresPerRow(section.rowMeasureCounts?.[rowIndex] ?? section.measuresPerRow ?? DEFAULT_MEASURES_PER_ROW);
		rows.push({
			start,
			measures: section.measures.slice(start, start + cap),
			cap,
			rowIndex
		});
		start += cap;
		rowIndex += 1;
	}
	return rows;
}
function sectionTone(name) {
	return `section-tone-${name.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "")}`;
}
function measureWidthWeight(measure) {
	const longestChord = measure.beats.reduce((longest, beat) => {
		const value = `${chordLabel(beat.chord)}${beat.bass ? `/${beat.bass}` : ""}`;
		return Math.max(longest, Array.from(value).length);
	}, 0);
	const chordDensity = measure.beats.reduce((total, beat) => total + (beat.chord ? 1 : 0), 0);
	const complexity = Math.max(0, longestChord - 2) * .16 + Math.max(0, measure.beats.length - 4) * .08 + Math.max(0, chordDensity - 2) * .035;
	return Math.min(1.72, 1 + complexity);
}
function rowGridTemplate(measures, capacity) {
	const used = measures.map((measure) => `minmax(0, ${measureWidthWeight(measure).toFixed(2)}fr)`);
	const empty = Array.from({ length: Math.max(0, capacity - measures.length) }, () => "minmax(0, 1fr)");
	return [...used, ...empty].join(" ");
}
function totalLeadSlots(measure) {
	return measure.beats.reduce((total, _beat, index) => total + (measure.leadSlotsByBeat?.[index] ?? 4), 0);
}
function normalizeLeadSlots(measure) {
	return measure.beats.map((_beat, index) => measure.leadSlotsByBeat?.[index] ?? 4);
}
function leadBeatForSlot(measure, slotIndex) {
	let cursor = 0;
	const counts = normalizeLeadSlots(measure);
	for (let beatIndex = 0; beatIndex < counts.length; beatIndex += 1) {
		cursor += counts[beatIndex];
		if (slotIndex < cursor) return beatIndex;
	}
	return Math.max(0, counts.length - 1);
}
function resizeLeadBeat(measure, beatIndex, nextCount) {
	const previousCounts = normalizeLeadSlots(measure);
	const previousCells = measure.rowLeadView ?? [];
	const groups = [];
	let cursor = 0;
	previousCounts.forEach((count) => {
		groups.push(previousCells.slice(cursor, cursor + count));
		cursor += count;
	});
	previousCounts[beatIndex] = nextCount;
	groups[beatIndex] = Array.from({ length: nextCount }, (_, index) => groups[beatIndex]?.[index] || "");
	measure.leadSlotsByBeat = previousCounts;
	measure.rowLeadView = groups.flat();
}
function cueRowKey(song, location) {
	const section = song.sections[location.section];
	const row = rowsForSection(section).find((candidate) => location.measure >= candidate.start && location.measure < candidate.start + candidate.measures.length);
	return `${section.id}:${row?.rowIndex ?? 0}`;
}
function orderedRange(range) {
	return range.start.measure * 100 + range.start.beat <= range.end.measure * 100 + range.end.beat ? range : {
		...range,
		start: range.end,
		end: range.start
	};
}
function beatKey(section, measure, beat, pre = false) {
	return `${section}:${pre ? "pre" : measure}:${beat}`;
}
function beatIsEmpty(beat) {
	return !beat?.chord && !beat?.bass && !beat?.circle && !beat?.dot && !beat?.xMarks && !beat?.manualUnderline;
}
var demoSong = () => ({
	titleKaren: "တၢ်သးဝံၣ်အဒိ",
	titleEnglish: "Practice Song",
	style: "Worship",
	key: "G",
	bpm: 76,
	meter: "4/4",
	group: "Praise & Worship",
	instruments: ["Piano 1", "Acoustic Guitar"],
	sourceKind: "synthetic",
	reviewState: "reviewed",
	lyrics: "Verse 1\nAdd approved S’gaw Karen and English lyrics here.\n\nChorus\nThis hosted chart uses demonstration content only.",
	sections: [
		{
			id: crypto.randomUUID(),
			name: "INTRO",
			preMeasure: null,
			measures: [
				createMeasure(),
				createMeasure(),
				createMeasure(),
				createMeasure()
			],
			measuresPerRow: DEFAULT_MEASURES_PER_ROW
		},
		{
			id: crypto.randomUUID(),
			name: "VERSE",
			preMeasure: null,
			measures: [
				createMeasure(),
				createMeasure(),
				createMeasure(),
				createMeasure()
			],
			measuresPerRow: DEFAULT_MEASURES_PER_ROW
		},
		{
			id: crypto.randomUUID(),
			name: "CHORUS",
			preMeasure: null,
			measures: [
				createMeasure(),
				createMeasure(),
				createMeasure(),
				createMeasure()
			],
			measuresPerRow: DEFAULT_MEASURES_PER_ROW
		}
	]
});
function chordLabel(chord) {
	if (!chord) return "";
	const quality = chord.quality === "triangle7" ? "Δ7" : chord.quality || "";
	return `${chord.root}${chord.flat ? "♭" : ""}${chord.minor ? "m" : ""}${chord.seven ? "₇" : ""}${quality}`;
}
function ChordNotation({ chord }) {
	if (!chord) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "chord-root",
			children: chord.root
		}),
		chord.flat && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "chord-flat",
			children: "♭"
		}),
		chord.minor && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "chord-minor",
			children: "m"
		}),
		chord.seven && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "chord-seven",
			children: "₇"
		}),
		chord.quality && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "chord-quality",
			children: chord.quality === "triangle7" ? "Δ7" : chord.quality
		})
	] });
}
function MusicDirector({ viewer = { authenticated: false } }) {
	const [song, setSong] = (0, import_react.useState)(() => demoSong());
	const [tab, setTab] = (0, import_react.useState)("chart");
	const [selected, setSelected] = (0, import_react.useState)({
		section: 0,
		measure: 0,
		beat: 0,
		pre: false
	});
	const [sidebarOpen, setSidebarOpen] = (0, import_react.useState)(true);
	const [newSongOpen, setNewSongOpen] = (0, import_react.useState)(false);
	const [sectionModalOpen, setSectionModalOpen] = (0, import_react.useState)(false);
	const [sectionInsertIndex, setSectionInsertIndex] = (0, import_react.useState)(null);
	const [leadModalOpen, setLeadModalOpen] = (0, import_react.useState)(false);
	const [shortcutsOpen, setShortcutsOpen] = (0, import_react.useState)(false);
	const [printRoomOpen, setPrintRoomOpen] = (0, import_react.useState)(false);
	const [printPage, setPrintPage] = (0, import_react.useState)(1);
	const [instrumentOpen, setInstrumentOpen] = (0, import_react.useState)(false);
	const [theme, setTheme] = (0, import_react.useState)("dark");
	const [karenTitleKeyboardEnabled, setKarenTitleKeyboardEnabled] = (0, import_react.useState)(true);
	const [status, setStatus] = (0, import_react.useState)(viewer.authenticated ? "Demo chart, not yet saved" : "Local synthetic demo; sign in to use the private library");
	const [songs, setSongs] = (0, import_react.useState)([]);
	const [search, setSearch] = (0, import_react.useState)("");
	const [zoom, setZoom] = (0, import_react.useState)(100);
	const [pendingBass, setPendingBass] = (0, import_react.useState)(false);
	const [pendingSuperscript, setPendingSuperscript] = (0, import_react.useState)(false);
	const [pendingSlur, setPendingSlur] = (0, import_react.useState)(null);
	const [pendingOnly, setPendingOnly] = (0, import_react.useState)(null);
	const [activeCueSlot, setActiveCueSlot] = (0, import_react.useState)(0);
	const [importReview, setImportReview] = (0, import_react.useState)(null);
	const [importReviewConfirmed, setImportReviewConfirmed] = (0, import_react.useState)(false);
	const [saveReviewOpen, setSaveReviewOpen] = (0, import_react.useState)(false);
	const [saveReviewConfirmed, setSaveReviewConfirmed] = (0, import_react.useState)(false);
	const [karenKeyboardOpen, setKarenKeyboardOpen] = (0, import_react.useState)(false);
	const [karenTargetLabel, setKarenTargetLabel] = (0, import_react.useState)("Karen text");
	const [karenPreview, setKarenPreview] = (0, import_react.useState)("");
	const fileInput = (0, import_react.useRef)(null);
	const printButton = (0, import_react.useRef)(null);
	const editorTarget = (0, import_react.useRef)(null);
	const undoHistory = (0, import_react.useRef)([]);
	const redoHistory = (0, import_react.useRef)([]);
	const leadInputs = (0, import_react.useRef)([]);
	const karenTarget = (0, import_react.useRef)(null);
	const karenSuppressOpen = (0, import_react.useRef)(false);
	const karenUndoHistory = (0, import_react.useRef)([]);
	const karenRedoHistory = (0, import_react.useRef)([]);
	const activeMeasure = (0, import_react.useMemo)(() => {
		const section = song.sections[selected.section];
		return selected.pre ? section?.preMeasure : section?.measures[selected.measure];
	}, [song, selected]);
	const printCopies = (0, import_react.useMemo)(() => [...song.instruments, "Reference"], [song.instruments]);
	const commitSong = (0, import_react.useCallback)((mutator, message = "Unsaved changes") => {
		setSong((current) => {
			undoHistory.current.push(structuredClone(current));
			if (undoHistory.current.length > 80) undoHistory.current.shift();
			redoHistory.current = [];
			const next = structuredClone(current);
			mutator(next);
			return next;
		});
		setStatus(message);
	}, []);
	const insertMeasure = (0, import_react.useCallback)((beatCount) => {
		if (selected.pre) return;
		commitSong((next) => {
			next.sections[selected.section].measures.splice(selected.measure + 1, 0, createMeasure(beatCount));
		}, `Inserted ${beatCount}-beat measure`);
		setSelected((current) => ({
			...current,
			measure: current.measure + 1,
			beat: 0,
			pre: false
		}));
	}, [
		commitSong,
		selected.measure,
		selected.pre,
		selected.section
	]);
	(0, import_react.useEffect)(() => {
		document.documentElement.dataset.theme = theme;
	}, [theme]);
	(0, import_react.useEffect)(() => {
		if (!window.matchMedia("(max-width: 900px)").matches) return;
		const frame = window.requestAnimationFrame(() => setSidebarOpen(false));
		return () => window.cancelAnimationFrame(frame);
	}, []);
	(0, import_react.useEffect)(() => {
		document.documentElement.dataset.appReady = "true";
		return () => {
			delete document.documentElement.dataset.appReady;
		};
	}, []);
	(0, import_react.useEffect)(() => {
		if (!printRoomOpen) return;
		const closeOnEscape = (event) => {
			if (event.key === "Escape") {
				setPrintRoomOpen(false);
				printButton.current?.focus();
			}
		};
		document.addEventListener("keydown", closeOnEscape);
		return () => document.removeEventListener("keydown", closeOnEscape);
	}, [printRoomOpen]);
	(0, import_react.useEffect)(() => {
		const handleVariableMeasure = (event) => {
			if (event.target?.matches("input, textarea, select, [contenteditable='true']")) return;
			if (event.ctrlKey && !event.altKey && !event.metaKey && /^[1-6]$/.test(event.key)) {
				event.preventDefault();
				event.stopPropagation();
				insertMeasure(Number(event.key));
			}
		};
		document.addEventListener("keydown", handleVariableMeasure, true);
		return () => document.removeEventListener("keydown", handleVariableMeasure, true);
	}, [insertMeasure]);
	(0, import_react.useEffect)(() => {
		if (!viewer.authenticated) return;
		fetch("/api/songs").then((response) => response.ok ? response.json() : Promise.reject()).then((data) => {
			setSongs((data.songs ?? []).map((item) => normalizeSongMetadata(item)));
			if (data.warning) setStatus(data.warning);
		}).catch(() => setStatus("Hosted library is unavailable; this draft remains local"));
	}, [viewer.authenticated]);
	function updateSong(patch) {
		setSong((current) => ({
			...current,
			...patch
		}));
		setStatus("Unsaved changes");
	}
	function activeBeatFrom(target, location = selected) {
		const section = target.sections[location.section];
		return (location.pre ? section?.preMeasure : section?.measures[location.measure])?.beats[location.beat];
	}
	function mutateActiveBeat(mutator, message = "Unsaved changes") {
		commitSong((next) => {
			const section = next.sections[selected.section];
			const measure = selected.pre ? section?.preMeasure : section?.measures[selected.measure];
			const beat = measure?.beats[selected.beat];
			if (beat && measure) mutator(beat, measure);
		}, message);
	}
	function undo() {
		const previous = undoHistory.current.pop();
		if (!previous) return;
		redoHistory.current.push(structuredClone(song));
		setSong(previous);
		setStatus("Undid chart edit");
	}
	function redo() {
		const next = redoHistory.current.pop();
		if (!next) return;
		undoHistory.current.push(structuredClone(song));
		setSong(next);
		setStatus("Redid chart edit");
	}
	function leadLocation(delta) {
		if (selected.pre) return delta > 0 ? {
			section: selected.section,
			measure: 0,
			beat: 0,
			pre: false
		} : null;
		const section = song.sections[selected.section];
		if (delta < 0 && selected.measure > 0) return {
			section: selected.section,
			measure: selected.measure - 1,
			beat: 0,
			pre: false
		};
		if (delta < 0 && selected.measure === 0 && section.preMeasure) return {
			section: selected.section,
			measure: 0,
			beat: 0,
			pre: true
		};
		if (delta > 0 && selected.measure < section.measures.length - 1) return {
			section: selected.section,
			measure: selected.measure + 1,
			beat: 0,
			pre: false
		};
		const nextSectionIndex = selected.section + delta;
		const nextSection = song.sections[nextSectionIndex];
		if (!nextSection) return null;
		if (delta > 0 && nextSection.preMeasure) return {
			section: nextSectionIndex,
			measure: 0,
			beat: 0,
			pre: true
		};
		return {
			section: nextSectionIndex,
			measure: delta > 0 ? 0 : nextSection.measures.length - 1,
			beat: 0,
			pre: false
		};
	}
	function shiftLeadMeasure(delta) {
		const location = leadLocation(delta);
		if (!location) return;
		setSelected(location);
		setStatus(`Lead editor moved to ${song.sections[location.section].name} ${location.pre ? "pre-section" : `measure ${location.measure + 1}`}`);
		requestAnimationFrame(() => leadInputs.current[0]?.focus());
	}
	function adjustLeadBaseOctave(delta) {
		commitSong((next) => {
			const section = next.sections[selected.section];
			const measure = selected.pre ? section.preMeasure : section.measures[selected.measure];
			if (!measure) return;
			measure.leadEnabled = true;
			measure.leadBaseOctave = Math.max(1, Math.min(8, (measure.leadBaseOctave ?? 4) + delta));
		}, "Lead base octave changed");
	}
	function adjustLeadNote(index, delta) {
		commitSong((next) => {
			const section = next.sections[selected.section];
			const measure = selected.pre ? section.preMeasure : section.measures[selected.measure];
			if (!measure) return;
			measure.leadEnabled = true;
			measure.rowLeadView ??= Array.from({ length: totalLeadSlots(measure) }, () => "");
			const current = measure.rowLeadView[index] || "";
			if (!current) return;
			const bare = current.replace(/^[\^_]+/, "");
			const level = current.slice(0, current.length - bare.length).split("").reduce((value, marker) => value + (marker === "^" ? 1 : -1), 0);
			const nextLevel = Math.max(-2, Math.min(2, level + delta));
			measure.rowLeadView[index] = `${nextLevel > 0 ? "^".repeat(nextLevel) : "_".repeat(Math.abs(nextLevel))}${bare}`;
		}, "Lead note octave changed");
	}
	function handleLeadModalKey(event) {
		const key = event.key;
		const inputIndex = leadInputs.current.findIndex((input) => input === event.target);
		if (key === "Escape") {
			event.preventDefault();
			setLeadModalOpen(false);
			editorTarget.current?.focus();
			return;
		}
		if (event.ctrlKey && key.toLowerCase() === "z") {
			event.preventDefault();
			undo();
			return;
		}
		if (event.ctrlKey && key.toLowerCase() === "y") {
			event.preventDefault();
			redo();
			return;
		}
		if (event.ctrlKey && key === "ArrowLeft") {
			event.preventDefault();
			shiftLeadMeasure(-1);
			return;
		}
		if (event.ctrlKey && key === "ArrowRight") {
			event.preventDefault();
			shiftLeadMeasure(1);
			return;
		}
		if (event.ctrlKey && key === "ArrowUp") {
			event.preventDefault();
			adjustLeadBaseOctave(1);
			return;
		}
		if (event.ctrlKey && key === "ArrowDown") {
			event.preventDefault();
			adjustLeadBaseOctave(-1);
			return;
		}
		if (inputIndex < 0) return;
		if (key === "ArrowLeft") {
			event.preventDefault();
			leadInputs.current[Math.max(0, inputIndex - 1)]?.focus();
		} else if (key === "ArrowRight" || key === "Enter") {
			event.preventDefault();
			leadInputs.current[Math.min(leadInputs.current.length - 1, inputIndex + 1)]?.focus();
		} else if (key === "ArrowUp") {
			event.preventDefault();
			adjustLeadNote(inputIndex, 1);
		} else if (key === "ArrowDown") {
			event.preventDefault();
			adjustLeadNote(inputIndex, -1);
		}
	}
	function setCueRangeEndpoint(endpoint) {
		if (selected.pre) return;
		const currentLocation = {
			section: selected.section,
			measure: selected.measure,
			beat: selected.beat
		};
		const rowKey = cueRowKey(song, currentLocation);
		commitSong((next) => {
			next.instrumentCueRanges ??= [];
			let range = next.instrumentCueRanges.filter((range) => range.rowKey === rowKey)[activeCueSlot];
			if (!range) {
				range = {
					id: crypto.randomUUID(),
					rowKey,
					abbr: cueAbbreviationOptions[0],
					start: currentLocation,
					end: currentLocation
				};
				next.instrumentCueRanges.push(range);
			}
			range[endpoint] = currentLocation;
			Object.assign(range, orderedRange(range));
		}, `Instrument cue ${endpoint} set`);
	}
	function setCueRangeAbbreviation(abbr) {
		if (selected.pre) return;
		const currentLocation = {
			section: selected.section,
			measure: selected.measure,
			beat: selected.beat
		};
		const rowKey = cueRowKey(song, currentLocation);
		commitSong((next) => {
			next.instrumentCueRanges ??= [];
			let range = next.instrumentCueRanges.filter((range) => range.rowKey === rowKey)[activeCueSlot];
			if (!range) {
				range = {
					id: crypto.randomUUID(),
					rowKey,
					abbr,
					start: currentLocation,
					end: currentLocation
				};
				next.instrumentCueRanges.push(range);
			} else range.abbr = abbr;
		}, "Instrument cue label changed");
	}
	function clearCueRange() {
		if (selected.pre) return;
		const rowKey = cueRowKey(song, selected);
		commitSong((next) => {
			const target = (next.instrumentCueRanges ?? []).filter((range) => range.rowKey === rowKey)[activeCueSlot];
			if (target) next.instrumentCueRanges = (next.instrumentCueRanges ?? []).filter((range) => range.id !== target.id);
		}, "Instrument cue range cleared");
	}
	function openKarenKeyboard(target) {
		if (karenSuppressOpen.current) return;
		karenTarget.current = target;
		setKarenTargetLabel(target.getAttribute("aria-label") || target.labels?.[0]?.textContent?.trim() || target.placeholder || "Karen text");
		setKarenPreview(target.value);
		setKarenKeyboardOpen(true);
	}
	function closeKarenKeyboard() {
		const target = karenTarget.current;
		setKarenKeyboardOpen(false);
		karenSuppressOpen.current = true;
		requestAnimationFrame(() => {
			target?.focus({ preventScroll: true });
			karenSuppressOpen.current = false;
		});
	}
	function setKarenTargetValue(target, value, caret) {
		setKarenPreview(value);
		const field = target.dataset.karenField;
		if (field === "titleKaren") updateSong({ titleKaren: value });
		const prototype = target instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
		const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
		if (!field && setter) {
			setter.call(target, value);
			target.dispatchEvent(new Event("input", { bubbles: true }));
		}
		requestAnimationFrame(() => {
			target.focus();
			target.setSelectionRange(caret, caret);
		});
	}
	function insertKarenCharacter(character) {
		const target = karenTarget.current;
		if (!target) return;
		const start = target.selectionStart ?? target.value.length;
		const end = target.selectionEnd ?? start;
		karenUndoHistory.current.push({
			element: target,
			value: target.value,
			caret: start
		});
		karenRedoHistory.current = [];
		setKarenTargetValue(target, `${target.value.slice(0, start)}${character}${target.value.slice(end)}`, start + character.length);
	}
	function karenBackspace() {
		const target = karenTarget.current;
		if (!target) return;
		const start = target.selectionStart ?? target.value.length;
		const end = target.selectionEnd ?? start;
		if (start === 0 && end === 0) return;
		karenUndoHistory.current.push({
			element: target,
			value: target.value,
			caret: start
		});
		karenRedoHistory.current = [];
		const deleteStart = start === end ? Array.from(target.value.slice(0, start)).slice(0, -1).join("").length : start;
		setKarenTargetValue(target, `${target.value.slice(0, deleteStart)}${target.value.slice(end)}`, deleteStart);
	}
	function restoreKarenHistory(source, destination) {
		const snapshot = source.current.pop();
		const target = karenTarget.current;
		if (!snapshot || !target) return;
		destination.current.push({
			element: target,
			value: target.value,
			caret: target.selectionStart ?? target.value.length
		});
		karenTarget.current = snapshot.element;
		setKarenTargetValue(snapshot.element, snapshot.value, snapshot.caret);
	}
	function handleKarenKeyboardKey(event) {
		const lower = event.key.toLowerCase();
		if (event.key === "Enter") {
			event.preventDefault();
			setStatus(`${karenTargetLabel} updated`);
			closeKarenKeyboard();
			return;
		}
		if (event.key === "Escape") {
			event.preventDefault();
			closeKarenKeyboard();
			return;
		}
		if (event.key === "Backspace") {
			event.preventDefault();
			karenBackspace();
			return;
		}
		if (event.ctrlKey && lower === "z") {
			event.preventDefault();
			restoreKarenHistory(karenUndoHistory, karenRedoHistory);
			return;
		}
		if (event.ctrlKey && lower === "y") {
			event.preventDefault();
			restoreKarenHistory(karenRedoHistory, karenUndoHistory);
			return;
		}
		if (!event.ctrlKey && !event.altKey && !event.metaKey && /^[a-z]$/.test(lower)) {
			const character = KAREN_HOTKEYS[lower]?.[event.shiftKey ? "shift" : "base"];
			if (character) {
				event.preventDefault();
				insertKarenCharacter(character);
			}
		}
	}
	function addSection(name) {
		const index = sectionInsertIndex ?? song.sections.length;
		commitSong((next) => {
			next.sections.splice(index, 0, {
				id: crypto.randomUUID(),
				name,
				preMeasure: null,
				measures: [createMeasure(Number(next.meter.split("/")[0]) || 4)],
				measuresPerRow: DEFAULT_MEASURES_PER_ROW
			});
		}, `Added ${name}`);
		setSelected({
			section: index,
			measure: 0,
			beat: 0,
			pre: false
		});
		setSectionModalOpen(false);
		setSectionInsertIndex(null);
	}
	function removeSection(sectionIndex) {
		if (song.sections.length <= 1) return;
		commitSong((next) => {
			next.sections.splice(sectionIndex, 1);
		}, "Section removed");
		setSelected({
			section: Math.max(0, sectionIndex - 1),
			measure: 0,
			beat: 0,
			pre: false
		});
	}
	function changeRowCap(sectionIndex, rowIndex, delta) {
		commitSong((next) => {
			const section = next.sections[sectionIndex];
			section.rowMeasureCounts ??= [];
			const current = section.rowMeasureCounts[rowIndex] ?? section.measuresPerRow ?? DEFAULT_MEASURES_PER_ROW;
			section.rowMeasureCounts[rowIndex] = clampMeasuresPerRow(current + delta);
		}, "Measures per row changed");
	}
	function togglePreMeasure(sectionIndex) {
		const hadPreMeasure = Boolean(song.sections[sectionIndex]?.preMeasure);
		commitSong((next) => {
			const section = next.sections[sectionIndex];
			section.preMeasure = section.preMeasure ? null : createMeasure(1);
			if (section.preMeasure) section.preMeasure.leadSlotsByBeat = [6];
		}, hadPreMeasure ? "Pre-measure removed" : "Pre-measure added");
		setSelected(hadPreMeasure ? {
			section: sectionIndex,
			measure: 0,
			beat: 0,
			pre: false
		} : {
			section: sectionIndex,
			measure: 0,
			beat: 0,
			pre: true
		});
		requestAnimationFrame(() => editorTarget.current?.focus());
	}
	function handleTextFocus(event) {
		if (!karenTitleKeyboardEnabled) return;
		const target = event.target;
		if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
		if (target.dataset.karenField !== "titleKaren") return;
		openKarenKeyboard(target);
	}
	function moveRight(createAtEnd = false) {
		if (!activeMeasure) return;
		if (selected.pre) {
			setSelected({
				...selected,
				pre: false,
				measure: 0,
				beat: 0
			});
			return;
		}
		if (selected.beat < activeMeasure.beats.length - 1) {
			setSelected({
				...selected,
				beat: selected.beat + 1
			});
			return;
		}
		const section = song.sections[selected.section];
		if (selected.measure < section.measures.length - 1) {
			setSelected({
				...selected,
				measure: selected.measure + 1,
				beat: 0
			});
			return;
		}
		if (createAtEnd) insertMeasure(Number(song.meter.split("/")[0]) || 4);
	}
	function moveLeft() {
		if (selected.beat > 0) {
			setSelected({
				...selected,
				beat: selected.beat - 1
			});
			return;
		}
		if (selected.pre) return;
		if (selected.measure > 0) {
			const previous = song.sections[selected.section].measures[selected.measure - 1];
			setSelected({
				...selected,
				measure: selected.measure - 1,
				beat: previous.beats.length - 1
			});
			return;
		}
		if (song.sections[selected.section].preMeasure) setSelected({
			...selected,
			pre: true,
			beat: 0
		});
	}
	function moveVertical(direction) {
		const section = song.sections[selected.section];
		if (!section || selected.pre) return;
		const rows = rowsForSection(section);
		const currentRow = rows.findIndex((row) => selected.measure >= row.start && selected.measure < row.start + row.measures.length);
		const target = rows[currentRow + direction];
		if (target) {
			const offset = selected.measure - rows[currentRow].start;
			const measure = target.start + Math.min(offset, target.measures.length - 1);
			setSelected({
				...selected,
				measure,
				beat: Math.min(selected.beat, section.measures[measure].beats.length - 1)
			});
			return;
		}
		const sectionIndex = selected.section + direction;
		const nextSection = song.sections[sectionIndex];
		if (!nextSection) return;
		const nextRows = rowsForSection(nextSection);
		const targetRow = direction > 0 ? nextRows[0] : nextRows[nextRows.length - 1];
		const measure = direction > 0 ? targetRow.start : targetRow.start + targetRow.measures.length - 1;
		setSelected({
			section: sectionIndex,
			measure,
			beat: Math.min(selected.beat, nextSection.measures[measure].beats.length - 1),
			pre: false
		});
	}
	function splitMeasure() {
		if (!activeMeasure || selected.pre) return;
		const keep = Math.max(1, selected.beat + 1);
		commitSong((next) => {
			const section = next.sections[selected.section];
			section.measures[selected.measure].beats = section.measures[selected.measure].beats.slice(0, keep);
			section.measures.splice(selected.measure + 1, 0, createMeasure(Number(next.meter.split("/")[0]) || 4));
		}, "Measure split");
		setSelected({
			...selected,
			measure: selected.measure + 1,
			beat: 0
		});
	}
	function deleteCurrentMeasure() {
		if (selected.pre) {
			commitSong((next) => {
				next.sections[selected.section].preMeasure = null;
			}, "Pre-measure removed");
			setSelected({
				...selected,
				pre: false,
				measure: 0,
				beat: 0
			});
			return;
		}
		if (song.sections[selected.section].measures.length === 1) {
			removeSection(selected.section);
			return;
		}
		commitSong((next) => {
			next.sections[selected.section].measures.splice(selected.measure, 1);
		}, "Measure removed");
		setSelected({
			...selected,
			measure: Math.max(0, selected.measure - 1),
			beat: 0
		});
	}
	function smartBackspace() {
		const beat = activeBeatFrom(song);
		const section = song.sections[selected.section];
		if (selected.pre && beatIsEmpty(beat)) {
			deleteCurrentMeasure();
			return;
		}
		if (beat && !beatIsEmpty(beat)) {
			mutateActiveBeat((target) => {
				if (target.bass) target.bass = "";
				else if (target.xMarks) target.xMarks = Math.max(0, target.xMarks - 1);
				else if (target.dot) target.dot = false;
				else if (target.circle) target.circle = false;
				else if (target.manualUnderline) target.manualUnderline = false;
				else if (target.chord?.quality) target.chord.quality = "";
				else if (target.chord?.seven) target.chord.seven = false;
				else if (target.chord?.minor) target.chord.minor = false;
				else if (target.chord?.flat) target.chord.flat = false;
				else target.chord = null;
			});
			return;
		}
		if (!selected.pre && selected.beat === 0 && selected.measure === section.measures.length - 1 && section.measures.length > 1 && activeMeasure?.beats.every(beatIsEmpty)) {
			deleteCurrentMeasure();
			return;
		}
		moveLeft();
	}
	function handleEditorKey(event) {
		const target = event.target;
		const key = event.key;
		const lower = key.toLowerCase();
		if (sectionModalOpen) {
			if (key === "Escape") {
				event.preventDefault();
				setSectionModalOpen(false);
				return;
			}
			const sectionKeyMap = {
				i: "INTRO",
				v: "VERSE",
				p: "PRE-CHORUS",
				c: "CHORUS",
				b: "BRIDGE",
				s: "SOLO",
				e: "ENDING"
			};
			if (sectionKeyMap[lower]) {
				event.preventDefault();
				addSection(sectionKeyMap[lower]);
			}
			return;
		}
		if (karenKeyboardOpen) {
			handleKarenKeyboardKey(event);
			return;
		}
		if (leadModalOpen || importReview || saveReviewOpen || newSongOpen || printRoomOpen) return;
		if (target.matches("input, textarea, select, [contenteditable='true']")) return;
		if (key === "?" || event.shiftKey && key === "/") {
			event.preventDefault();
			setShortcutsOpen((open) => !open);
			return;
		}
		if (event.ctrlKey && lower === "p") {
			event.preventDefault();
			openPrintRoom();
			return;
		}
		if (event.ctrlKey && lower === "z") {
			event.preventDefault();
			undo();
			return;
		}
		if (event.ctrlKey && lower === "y") {
			event.preventDefault();
			redo();
			return;
		}
		if (event.ctrlKey && !event.altKey && !event.metaKey && /^[1-6]$/.test(key)) {
			event.preventDefault();
			insertMeasure(Number(key));
			return;
		}
		if (event.ctrlKey && !event.altKey && !event.metaKey && (lower === "s" || lower === "a")) {
			event.preventDefault();
			mutateActiveBeat((beat) => {
				if (beat.chord) beat.chord.quality = lower === "s" ? "sus" : "aug";
			});
			return;
		}
		if (key === "Enter") {
			event.preventDefault();
			setSectionInsertIndex(null);
			setSectionModalOpen(true);
			return;
		}
		if (key === "Escape") {
			event.preventDefault();
			setPendingBass(false);
			setPendingSuperscript(false);
			setPendingOnly(null);
			setPendingSlur(null);
			return;
		}
		if (key === "Delete") {
			event.preventDefault();
			deleteCurrentMeasure();
			return;
		}
		if (key === "Backspace") {
			event.preventDefault();
			smartBackspace();
			return;
		}
		if (key === "ArrowRight") {
			event.preventDefault();
			moveRight(true);
			return;
		}
		if (key === "ArrowLeft") {
			event.preventDefault();
			moveLeft();
			return;
		}
		if (key === "ArrowDown") {
			event.preventDefault();
			moveVertical(1);
			return;
		}
		if (key === "ArrowUp") {
			event.preventDefault();
			moveVertical(-1);
			return;
		}
		if (event.ctrlKey && (event.code === "Space" || key === " ")) {
			event.preventDefault();
			insertMeasure(selected.beat + 1);
			return;
		}
		if (key === " ") {
			event.preventDefault();
			moveRight(true);
			return;
		}
		if (key === "Tab") {
			event.preventDefault();
			if (event.ctrlKey) splitMeasure();
			else insertMeasure(Number(song.meter.split("/")[0]) || 4);
			return;
		}
		if (lower === "l") {
			event.preventDefault();
			setKarenKeyboardOpen(false);
			setLeadModalOpen(true);
			return;
		}
		if (lower === "r") {
			event.preventDefault();
			mutateActiveBeat((_beat, measure) => {
				measure.roll = !measure.roll;
			}, "Measure roll changed");
			return;
		}
		if (lower === "o") {
			event.preventDefault();
			mutateActiveBeat((beat) => {
				beat.circle = !beat.circle;
				if (beat.circle) {
					beat.dot = false;
					beat.xMarks = 0;
				}
			});
			return;
		}
		if (lower === "x") {
			event.preventDefault();
			mutateActiveBeat((beat) => {
				beat.xMarks = ((beat.xMarks || 0) + 1) % 5;
			});
			return;
		}
		if (key === ".") {
			event.preventDefault();
			mutateActiveBeat((beat) => {
				if (beat.chord) beat.dot = !beat.dot;
			});
			return;
		}
		if (lower === "s") {
			event.preventDefault();
			const current = beatKey(selected.section, selected.measure, selected.beat, selected.pre);
			if (!pendingSlur) setPendingSlur(current);
			else {
				commitSong((next) => {
					next.slurs = [...next.slurs || [], {
						start: pendingSlur,
						end: current
					}];
				}, "Slur added");
				setPendingSlur(null);
			}
			return;
		}
		if (key === ",") {
			event.preventDefault();
			const current = beatKey(selected.section, selected.measure, selected.beat, selected.pre);
			if (!pendingOnly) setPendingOnly(current);
			else {
				commitSong((next) => {
					next.onlySpans = [...next.onlySpans || [], {
						start: pendingOnly,
						end: current
					}];
				}, "Only / All In cue added");
				setPendingOnly(null);
			}
			return;
		}
		if (key === "/") {
			event.preventDefault();
			const beat = activeBeatFrom(song);
			if (!beat?.chord) return;
			if (beat.bass) mutateActiveBeat((targetBeat) => {
				targetBeat.bass = "";
			});
			else setPendingBass(true);
			return;
		}
		if (pendingBass && /^[a-gA-G]$/.test(key)) {
			event.preventDefault();
			mutateActiveBeat((beat) => {
				beat.bass = key.toUpperCase();
			}, "Bass note added");
			setPendingBass(false);
			return;
		}
		if (lower === "t") {
			event.preventDefault();
			setPendingSuperscript(true);
			return;
		}
		if (key === "7") {
			event.preventDefault();
			mutateActiveBeat((beat) => {
				if (!beat.chord) return;
				if (pendingSuperscript) beat.chord.quality = "triangle7";
				else beat.chord.seven = !beat.chord.seven;
			});
			setPendingSuperscript(false);
			return;
		}
		if (pendingSuperscript && (key === "8" || key === "9")) {
			event.preventDefault();
			mutateActiveBeat((beat) => {
				if (beat.chord) beat.chord.quality = key === "8" ? "sus" : "aug";
			});
			setPendingSuperscript(false);
			return;
		}
		if (lower === "m") {
			event.preventDefault();
			mutateActiveBeat((beat) => {
				if (beat.chord) beat.chord.minor = !beat.chord.minor;
			});
			return;
		}
		if (lower === "b") {
			event.preventDefault();
			mutateActiveBeat((beat) => {
				if (beat.chord) beat.chord.flat = !beat.chord.flat;
				else beat.chord = { root: "B" };
			});
			return;
		}
		if (/^[a-gA-G]$/.test(key)) {
			event.preventDefault();
			mutateActiveBeat((beat) => {
				beat.chord = { root: key.toUpperCase() };
			});
		}
	}
	async function saveSong() {
		setStatus("Saving");
		try {
			const response = await fetch("/api/songs", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					...song,
					saveApproval: {
						reviewed: true,
						syntheticOrApproved: true
					}
				})
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.error || "Save failed");
			const saved = normalizeSongMetadata(data.song);
			setSong(saved);
			setSongs((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
			setStatus("Saved to hosted library");
			setSaveReviewOpen(false);
			setSaveReviewConfirmed(false);
		} catch {
			setStatus("Save failed; export this draft before leaving");
		}
	}
	function requestSaveSong() {
		setKarenKeyboardOpen(false);
		setSaveReviewConfirmed(false);
		setSaveReviewOpen(true);
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
	function importSong(event) {
		const file = event.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			try {
				const imported = JSON.parse(String(reader.result));
				if (!Array.isArray(imported.sections)) throw new Error();
				const fallback = demoSong();
				const candidate = {
					...fallback,
					...imported,
					id: void 0,
					bpm: clampBpm(imported.bpm),
					group: normalizeSongGroup(imported.group),
					sourceKind: "imported-json",
					reviewState: "draft",
					instruments: Array.isArray(imported.instruments) ? imported.instruments.filter((instrument) => typeof instrument === "string").slice(0, 12) : fallback.instruments,
					sections: imported.sections.filter((section) => Boolean(section && typeof section === "object" && Array.isArray(section.measures)))
				};
				if (!candidate.sections.length) throw new Error();
				const warnings = [!candidate.titleEnglish?.trim() ? "English title is missing." : "", candidate.sections.some((section) => section.measures.some((measure) => !Array.isArray(measure.beats))) ? "One or more measures need beat review." : ""].filter(Boolean);
				setImportReview({
					filename: file.name,
					source: "Karen Music JSON",
					sectionCount: candidate.sections.length,
					measureCount: candidate.sections.reduce((total, section) => total + section.measures.length, 0),
					warnings,
					candidate
				});
				setImportReviewConfirmed(false);
				setStatus("Import ready for review; the editor has not changed");
			} catch {
				setStatus("Import could not be read; choose a Karen Music JSON export");
			}
		};
		reader.readAsText(file);
		event.target.value = "";
	}
	function applyImportReview() {
		if (!importReview || !importReviewConfirmed) return;
		setKarenKeyboardOpen(false);
		setSong({
			...importReview.candidate,
			id: void 0,
			reviewState: "reviewed"
		});
		setSelected({
			section: 0,
			measure: 0,
			beat: 0,
			pre: false
		});
		setImportReview(null);
		setImportReviewConfirmed(false);
		setStatus("Imported as an unsaved reviewed draft");
		requestAnimationFrame(() => editorTarget.current?.focus());
	}
	function startNewSong() {
		setSong(demoSong());
		setNewSongOpen(false);
		setStatus("New unsaved song");
	}
	function openPrintRoom() {
		setKarenKeyboardOpen(false);
		setPrintPage(1);
		setPrintRoomOpen(true);
	}
	const filteredSongs = songs.filter((item) => `${item.titleKaren} ${item.titleEnglish} ${item.key} ${item.style}`.toLowerCase().includes(search.toLowerCase()));
	const activeCueRowKey = selected.pre ? "" : cueRowKey(song, selected);
	const activeCueRanges = (song.instrumentCueRanges ?? []).filter((range) => range.rowKey === activeCueRowKey).slice(0, 2);
	const activeCueRange = activeCueRanges[activeCueSlot];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "app-shell",
		onKeyDownCapture: handleEditorKey,
		onFocusCapture: handleTextFocus,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "app-header",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "brand",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "icon-button",
						onClick: () => setSidebarOpen((value) => !value),
						"aria-label": "Toggle song details",
						children: "☰"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Karen Music Director" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "ကညီတၢ်သးဝံၣ်" })] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
					className: "global-actions",
					"aria-label": "Song actions",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => {
								setKarenKeyboardOpen(false);
								setNewSongOpen(true);
							},
							children: "New song"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: requestSaveSong,
							className: "primary",
							children: "Save"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => {
								setKarenKeyboardOpen(false);
								fileInput.current?.click();
							},
							children: "Import"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: exportSong,
							children: "Export"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							ref: printButton,
							onClick: openPrintRoom,
							children: "Print"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
							className: "settings-menu",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", { children: "Settings" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: karenTitleKeyboardEnabled,
								onChange: (event) => {
									setKarenTitleKeyboardEnabled(event.target.checked);
									if (!event.target.checked) setKarenKeyboardOpen(false);
								}
							}), "Karen title keyboard"] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setTheme((value) => value === "dark" ? "light" : "dark"),
								"aria-label": "Toggle color theme",
								children: theme === "dark" ? "Light theme" : "Dark theme"
							})] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							ref: fileInput,
							type: "file",
							accept: ".json,application/json",
							onChange: importSong,
							hidden: true
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: `workspace ${sidebarOpen ? "" : "sidebar-collapsed"}`,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
					className: "sidebar",
					"aria-label": "Song details",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "sidebar-heading",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Song details" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "icon-button",
								onClick: () => setSidebarOpen(false),
								"aria-label": "Close song details",
								children: "×"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["Karen title", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							"aria-label": "Karen title",
							lang: "kar",
							dir: "ltr",
							"data-karen-field": "titleKaren",
							value: song.titleKaren,
							onChange: (event) => updateSong({ titleKaren: event.target.value })
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["English title", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "parenthesized-field",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									"aria-hidden": "true",
									children: "("
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									"data-karen-exempt": "true",
									value: song.titleEnglish,
									onChange: (event) => updateSong({ titleEnglish: event.target.value })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									"aria-hidden": "true",
									children: ")"
								})
							]
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "field-pair",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["Key", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								value: song.key,
								onChange: (event) => updateSong({ key: event.target.value }),
								children: [
									"C",
									"D♭",
									"D",
									"E♭",
									"E",
									"F",
									"G♭",
									"G",
									"A♭",
									"A",
									"B♭",
									"B"
								].map((key) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: key }, key))
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["Style", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: song.style,
								onChange: (event) => updateSong({ style: event.target.value })
							})] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "field-pair",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "bpm-field",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["BPM ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("output", { children: song.bpm })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "bpm-slider",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: MIN_BPM }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "range",
											min: MIN_BPM,
											max: MAX_BPM,
											step: "1",
											value: song.bpm,
											"aria-label": "BPM",
											"aria-valuetext": `${song.bpm} beats per minute`,
											onChange: (event) => updateSong({ bpm: clampBpm(Number(event.target.value)) })
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: MAX_BPM })
									]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["Meter", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								value: song.meter,
								onChange: (event) => updateSong({ meter: event.target.value }),
								children: [
									"4/4",
									"3/4",
									"5/5",
									"6/8"
								].map((meter) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: meter }, meter))
							})] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["Group", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							value: song.group,
							onChange: (event) => updateSong({ group: event.target.value }),
							children: songGroupOptions.map((group) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: group }, group))
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "instrument-field",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Print instruments" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => setInstrumentOpen((value) => !value),
									"aria-expanded": instrumentOpen,
									children: song.instruments.length ? song.instruments.join(", ") : "Reference only"
								}),
								instrumentOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "instrument-menu",
									children: instrumentOptions.map((instrument) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "checkbox",
										checked: song.instruments.includes(instrument),
										onChange: () => updateSong({ instruments: song.instruments.includes(instrument) ? song.instruments.filter((item) => item !== instrument) : [...song.instruments, instrument] })
									}), instrument] }, instrument))
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "shortcut-note",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Keyboard" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "A-G enters chords" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Ctrl+1-6 inserts a measure" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Arrow keys move the cursor" })
							]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "editor-stage",
					"aria-label": "Music editor",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "command-bar",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "song-position",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "eyebrow",
									children: "Active chart"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [
									song.key,
									" / ",
									song.style
								] })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "view-controls",
								"aria-label": "View controls",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => setZoom((value) => nextZoom(value, -1)),
										"aria-label": "Zoom out",
										children: "−"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("output", { children: [zoom, "%"] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => setZoom((value) => nextZoom(value, 1)),
										"aria-label": "Zoom in",
										children: "+"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => setZoom(100),
										children: "100%"
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "status",
								"aria-live": "polite",
								children: status
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "paper-area",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "paper-tabs",
								role: "tablist",
								"aria-label": "Song work surfaces",
								children: [
									"chart",
									"lyrics",
									"database"
								].map((name) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									role: "tab",
									"aria-selected": tab === name,
									onClick: () => setTab(name),
									children: name
								}, name))
							}),
							tab === "chart" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
								className: "paper chart-paper",
								tabIndex: 0,
								ref: editorTarget,
								"aria-label": "Chord chart editor",
								style: { "--paper-scale": zoom / 100 },
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
										className: "paper-header",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												"aria-label": "Karen title on paper",
												lang: "kar",
												dir: "ltr",
												"data-karen-field": "titleKaren",
												placeholder: "Karen title",
												value: song.titleKaren,
												onChange: (event) => updateSong({ titleKaren: event.target.value })
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "parenthesized-field paper-english-title",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														"aria-hidden": "true",
														children: "("
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
														"data-karen-exempt": "true",
														"aria-label": "English title on paper",
														placeholder: "English title",
														value: song.titleEnglish,
														onChange: (event) => updateSong({ titleEnglish: event.target.value })
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														"aria-hidden": "true",
														children: ")"
													})
												]
											})] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												"aria-label": "Song style on paper",
												value: song.style,
												onChange: (event) => updateSong({ style: event.target.value })
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
												"aria-label": "Song key on paper",
												value: song.key,
												onChange: (event) => updateSong({ key: event.target.value }),
												children: [
													"C",
													"D♭",
													"D",
													"E♭",
													"E",
													"F",
													"G♭",
													"G",
													"A♭",
													"A",
													"B♭",
													"B"
												].map((key) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: key }, key))
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "chart-body",
										children: [song.sections.map((section, sectionIndex) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "section-block",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												className: "section-insert",
												onClick: () => {
													setSectionInsertIndex(sectionIndex);
													setSectionModalOpen(true);
												},
												"aria-label": `Insert section before ${section.name}`,
												children: "+"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
												className: `chart-section ${sectionTone(section.name)}`,
												"data-section-type": section.name,
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
														className: "section-title",
														children: [
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																className: `premeasure-toggle ${section.preMeasure ? "active" : ""}`,
																onClick: () => togglePreMeasure(sectionIndex),
																"aria-label": `Toggle one-beat pre-measure for ${section.name}`,
																"aria-pressed": Boolean(section.preMeasure)
															}),
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: section.name }),
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																className: "section-delete",
																onClick: () => removeSection(sectionIndex),
																"aria-label": `Remove ${section.name}`,
																children: "×"
															})
														]
													}),
													rowsForSection(section).map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "chart-row-wrap",
														children: [
															row.rowIndex === 0 && section.preMeasure && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MeasureView, {
																measure: section.preMeasure,
																active: selected.section === sectionIndex && selected.pre,
																activeBeat: selected.section === sectionIndex && selected.pre ? selected.beat : -1,
																onBeat: (beat) => setSelected({
																	section: sectionIndex,
																	measure: 0,
																	beat,
																	pre: true
																}),
																pre: true
															}),
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
																className: "measure-row",
																style: { gridTemplateColumns: rowGridTemplate(row.measures, row.cap) },
																children: row.measures.map((measure, rowOffset) => {
																	const measureIndex = row.start + rowOffset;
																	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MeasureView, {
																		measure,
																		active: selected.section === sectionIndex && selected.measure === measureIndex && !selected.pre,
																		activeBeat: selected.section === sectionIndex && selected.measure === measureIndex && !selected.pre ? selected.beat : -1,
																		onBeat: (beat) => setSelected({
																			section: sectionIndex,
																			measure: measureIndex,
																			beat,
																			pre: false
																		}),
																		ending: measureIndex === section.measures.length - 1,
																		slurPending: pendingSlur === beatKey(sectionIndex, measureIndex, selected.beat),
																		onlyPending: pendingOnly === beatKey(sectionIndex, measureIndex, selected.beat),
																		cueStarts: measure.beats.map((_beat, beatIndex) => (song.instrumentCueRanges ?? []).filter((range) => range.start.section === sectionIndex && range.start.measure === measureIndex && range.start.beat === beatIndex).map((range) => range.abbr)),
																		cueEnds: measure.beats.map((_beat, beatIndex) => (song.instrumentCueRanges ?? []).filter((range) => range.end.section === sectionIndex && range.end.measure === measureIndex && range.end.beat === beatIndex).map((range) => range.abbr))
																	}, `${section.id}-${measureIndex}`);
																})
															}),
															/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
																className: "row-density",
																"aria-label": `Measures in row: ${row.cap}`,
																children: [
																	/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																		onClick: () => changeRowCap(sectionIndex, row.rowIndex, 1),
																		"aria-label": "More measures in this row",
																		children: "▲"
																	}),
																	/* @__PURE__ */ (0, import_jsx_runtime.jsx)("output", { children: row.cap }),
																	/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																		onClick: () => changeRowCap(sectionIndex, row.rowIndex, -1),
																		"aria-label": "Fewer measures in this row",
																		children: "▼"
																	})
																]
															})
														]
													}, `${section.id}-row-${row.rowIndex}`)),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														className: "add-measure",
														onClick: () => {
															const measure = section.measures.length - 1;
															const beatCount = Number(song.meter.split("/")[0]) || 4;
															commitSong((next) => {
																next.sections[sectionIndex].measures.push(createMeasure(beatCount));
															}, `Inserted ${beatCount}-beat measure`);
															setSelected({
																section: sectionIndex,
																measure: measure + 1,
																beat: 0,
																pre: false
															});
														},
														children: "+ Measure"
													})
												]
											})]
										}, section.id)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											className: "section-insert section-insert-last",
											onClick: () => {
												setSectionInsertIndex(song.sections.length);
												setSectionModalOpen(true);
											},
											children: "+ Add section"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", {
										className: "paper-footer",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
												song.bpm,
												" BPM, ",
												song.meter
											] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
												className: "paper-instrument-picker",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", {
													"aria-label": "Choose centered footer instruments",
													children: song.instruments.length ? song.instruments.join(" / ") : "Reference"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "paper-instrument-menu",
													children: instrumentOptions.map((instrument) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
														type: "checkbox",
														checked: song.instruments.includes(instrument),
														onChange: () => updateSong({ instruments: song.instruments.includes(instrument) ? song.instruments.filter((item) => item !== instrument) : [...song.instruments, instrument] })
													}), instrument] }, instrument))
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
												"aria-label": "Group on paper",
												value: song.group,
												onChange: (event) => updateSong({ group: event.target.value }),
												children: songGroupOptions.map((group) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: group }, group))
											})
										]
									})
								]
							}),
							tab === "lyrics" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
								className: "paper lyrics-paper",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
									lang: "kar",
									children: song.titleKaren || "Karen title"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: song.titleEnglish || "English title" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: song.key })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
									"aria-label": "Song lyrics",
									lang: "kar",
									dir: "ltr",
									value: song.lyrics,
									onChange: (event) => updateSong({ lyrics: event.target.value }),
									placeholder: "Lyrics"
								})]
							}),
							tab === "database" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
								className: "paper database-paper",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Song library" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Approved hosted charts" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [songs.length, " songs"] })] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										className: "library-search",
										type: "search",
										placeholder: "Search titles, key, or style",
										value: search,
										onChange: (event) => setSearch(event.target.value)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "song-list",
										children: filteredSongs.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "empty-state",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "No hosted songs yet" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Save a reviewed, sanitized chart to add it to this private library." })]
										}) : filteredSongs.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											onClick: () => {
												setSong(normalizeSongMetadata(item));
												setTab("chart");
												setStatus("Loaded from hosted library");
											},
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													lang: "kar",
													children: item.titleKaren
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: item.titleEnglish }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
													item.key,
													", ",
													item.style,
													", ",
													item.meter
												] })
											]
										}, item.id))
									})
								]
							})
						]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
				className: "mobile-toolbar",
				"aria-label": "Mobile editor tools",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => setSidebarOpen(true),
						children: "Details"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => setTab("chart"),
						"aria-current": tab === "chart",
						children: "Chart"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => insertMeasure(Number(song.meter.split("/")[0]) || 4),
						children: "+ Measure"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: requestSaveSong,
						children: "Save"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: openPrintRoom,
						children: "Print"
					})
				]
			}),
			newSongOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "modal-backdrop",
				role: "presentation",
				onMouseDown: (event) => event.target === event.currentTarget && setNewSongOpen(false),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "modal",
					role: "dialog",
					"aria-modal": "true",
					"aria-labelledby": "new-song-title",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "eyebrow",
							children: "New chart"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							id: "new-song-title",
							children: "Start with song details"
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "icon-button",
							onClick: () => setNewSongOpen(false),
							"aria-label": "Close new song dialog",
							children: "×"
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "This creates an unsaved demonstration chart. Add only approved, sanitized song content before saving it online." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "modal-actions",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setNewSongOpen(false),
								children: "Cancel"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "primary",
								onClick: startNewSong,
								children: "Create chart"
							})]
						})
					]
				})
			}),
			sectionModalOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "modal-backdrop",
				role: "presentation",
				onMouseDown: (event) => event.target === event.currentTarget && setSectionModalOpen(false),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "modal section-modal",
					role: "dialog",
					"aria-modal": "true",
					"aria-labelledby": "section-modal-title",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "eyebrow",
						children: "Chart structure"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						id: "section-modal-title",
						children: "Add section"
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "icon-button",
						onClick: () => setSectionModalOpen(false),
						"aria-label": "Close section dialog",
						children: "×"
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "section-choice-grid",
						children: sectionOptions.map((name) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => addSection(name),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("kbd", { children: name === "PRE-CHORUS" ? "P" : name[0] }), name]
						}, name))
					})]
				})
			}),
			leadModalOpen && activeMeasure && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "modal-backdrop",
				role: "presentation",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "modal lead-modal",
					role: "dialog",
					"aria-modal": "true",
					"aria-labelledby": "lead-modal-title",
					onKeyDownCapture: handleLeadModalKey,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
							className: "lead-modal-header",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "lead-measure-nav",
									onClick: () => shiftLeadMeasure(-1),
									disabled: !leadLocation(-1),
									"aria-label": "Previous lead measure",
									children: "‹"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "eyebrow",
										children: song.sections[selected.section].name
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
										id: "lead-modal-title",
										children: "Lead melody"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "lead-measure-label",
										children: selected.pre ? "Pre-section" : `Measure ${selected.measure + 1}`
									})
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "lead-measure-nav",
									onClick: () => shiftLeadMeasure(1),
									disabled: !leadLocation(1),
									"aria-label": "Next lead measure",
									children: "›"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "icon-button",
									onClick: () => {
										setLeadModalOpen(false);
										editorTarget.current?.focus();
									},
									"aria-label": "Close lead melody dialog",
									children: "×"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "lead-settings",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["Base octave", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								value: activeMeasure.leadBaseOctave ?? 4,
								onChange: (event) => commitSong((next) => {
									const section = next.sections[selected.section];
									const measure = selected.pre ? section.preMeasure : section.measures[selected.measure];
									if (measure) {
										measure.leadEnabled = true;
										measure.leadBaseOctave = Number(event.target.value);
									}
								}, "Lead octave changed"),
								children: Array.from({ length: 8 }, (_, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: index + 1 }, index + 1))
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "lead-beat-settings",
								"aria-label": "Spaces per beat",
								children: activeMeasure.beats.map((_beat, beatIndex) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
									"Beat ",
									beatIndex + 1,
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
										value: activeMeasure.leadSlotsByBeat?.[beatIndex] ?? 4,
										onChange: (event) => commitSong((next) => {
											const section = next.sections[selected.section];
											const measure = selected.pre ? section.preMeasure : section.measures[selected.measure];
											if (!measure) return;
											measure.leadEnabled = true;
											resizeLeadBeat(measure, beatIndex, Number(event.target.value));
										}, `Beat ${beatIndex + 1} spacing changed`),
										children: (selected.pre ? [
											1,
											2,
											3,
											4,
											5,
											6
										] : [
											3,
											4,
											6
										]).map((count) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: count }, count))
									})
								] }, beatIndex))
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "lead-note-grid",
							style: { "--lead-columns": totalLeadSlots(activeMeasure) },
							children: Array.from({ length: totalLeadSlots(activeMeasure) }, (_, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								ref: (element) => {
									leadInputs.current[index] = element;
								},
								"data-lead-slot": index,
								"aria-label": `Lead note slot ${index + 1}`,
								value: activeMeasure.rowLeadView?.[index] || "",
								maxLength: 4,
								onFocus: () => setSelected((current) => ({
									...current,
									beat: leadBeatForSlot(activeMeasure, index)
								})),
								onChange: (event) => commitSong((next) => {
									const section = next.sections[selected.section];
									const measure = selected.pre ? section.preMeasure : section.measures[selected.measure];
									if (!measure) return;
									measure.leadEnabled = true;
									measure.leadSlotsByBeat ??= measure.beats.map(() => 4);
									measure.rowLeadView ??= Array.from({ length: totalLeadSlots(measure) }, () => "");
									measure.rowLeadView[index] = event.target.value;
								}, "Lead note changed")
							}, index))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "lead-grid-actions",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => {
										const focused = leadInputs.current.findIndex((input) => input === document.activeElement);
										if (focused >= 0) commitSong((next) => {
											const section = next.sections[selected.section];
											const measure = selected.pre ? section.preMeasure : section.measures[selected.measure];
											if (measure?.rowLeadView) measure.rowLeadView[focused] = "";
										}, "Lead note cleared");
									},
									children: "Clear note"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => commitSong((next) => {
										const section = next.sections[selected.section];
										const measure = selected.pre ? section.preMeasure : section.measures[selected.measure];
										if (measure) measure.rowLeadView = Array.from({ length: totalLeadSlots(measure) }, () => "");
									}, "Lead measure cleared"),
									children: "Clear measure"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: undo,
									children: "Undo"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: redo,
									children: "Redo"
								})
							]
						}),
						!selected.pre && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
							className: "cue-range-editor",
							"aria-labelledby": "cue-range-title",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "eyebrow",
									children: "Instrument cues"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
									id: "cue-range-title",
									children: "Two ranges per visual row"
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "cue-range-slots",
									children: [0, 1].map((slot) => {
										const range = activeCueRanges[slot];
										return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											className: activeCueSlot === slot ? "selected" : "",
											onClick: () => setActiveCueSlot(slot),
											children: range ? `${range.abbr}: M${range.start.measure + 1}.${range.start.beat + 1}–M${range.end.measure + 1}.${range.end.beat + 1}` : `Range ${slot + 1}`
										}, slot);
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "cue-abbreviations",
									"aria-label": "Cue abbreviations",
									children: cueAbbreviationOptions.map((abbr) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: activeCueRange?.abbr === abbr ? "selected" : "",
										onClick: () => setCueRangeAbbreviation(abbr),
										children: abbr
									}, abbr))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "cue-range-actions",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => setCueRangeEndpoint("start"),
											children: "Start here"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => setCueRangeEndpoint("end"),
											children: "End here"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: clearCueRange,
											children: "Clear range"
										})
									]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "modal-note",
							children: "Left/Right moves lead slots. Ctrl+Left/Right changes measure. Up/Down changes a note octave. Ctrl+Up/Down changes base octave. Ctrl+Z/Y undo or redo."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "modal-actions",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "primary",
								onClick: () => {
									setLeadModalOpen(false);
									editorTarget.current?.focus();
								},
								children: "Done"
							})
						})
					]
				})
			}),
			importReview && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "modal-backdrop",
				role: "presentation",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "modal import-review-modal",
					role: "dialog",
					"aria-modal": "true",
					"aria-labelledby": "import-review-title",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "eyebrow",
							children: "Unsaved import review"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							id: "import-review-title",
							children: "Review before replacing the editor"
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "icon-button",
							onClick: () => {
								setImportReview(null);
								setImportReviewConfirmed(false);
								setStatus("Import canceled; editor unchanged");
							},
							"aria-label": "Close import review",
							children: "×"
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
							className: "review-facts",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "File" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: importReview.filename })] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Source" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: importReview.source })] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Sections" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: importReview.sectionCount })] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Measures" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: importReview.measureCount })] })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: `review-warning ${importReview.warnings.length ? "attention" : "clear"}`,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: importReview.warnings.length ? "Review needed" : "Structure check passed" }), importReview.warnings.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { children: importReview.warnings.map((warning) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: warning }, warning)) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "No structural warnings were detected. Musical accuracy still needs human review." })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "review-check",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: importReviewConfirmed,
								onChange: (event) => setImportReviewConfirmed(event.target.checked)
							}), "Replace the current editor with this unsaved draft. I will verify the chart before Save."]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Import never writes to the hosted library. Save has a separate identity and approval gate." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "modal-actions",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => {
									setImportReview(null);
									setImportReviewConfirmed(false);
									setStatus("Import canceled; editor unchanged");
								},
								children: "Cancel"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "primary",
								disabled: !importReviewConfirmed,
								onClick: applyImportReview,
								children: "Load unsaved draft"
							})]
						})
					]
				})
			}),
			saveReviewOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "modal-backdrop",
				role: "presentation",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "modal save-review-modal",
					role: "dialog",
					"aria-modal": "true",
					"aria-labelledby": "save-review-title",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "eyebrow",
							children: "Private hosted persistence"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							id: "save-review-title",
							children: "Confirm this chart is safe to save"
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "icon-button",
							onClick: () => setSaveReviewOpen(false),
							"aria-label": "Close save review",
							children: "×"
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: viewer.authenticated ? `This chart will be stored in ${viewer.displayName || "your"} private hosted library and separated from other users.` : "Sign in through the hosted site before saving. Local preview edits and exports still work." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "review-check",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: saveReviewConfirmed,
								disabled: !viewer.authenticated,
								onChange: (event) => setSaveReviewConfirmed(event.target.checked)
							}), "This chart contains synthetic content only, or every song element was explicitly approved and sanitized for hosting."]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "persistence-boundary",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Never included automatically" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "`songs.db`, desktop charts, images, provider payloads, credentials, and unsaved imports." })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "modal-actions",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setSaveReviewOpen(false),
								children: "Cancel"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "primary",
								disabled: !viewer.authenticated || !saveReviewConfirmed,
								onClick: saveSong,
								children: "Save to private library"
							})]
						})
					]
				})
			}),
			karenKeyboardOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "karen-keyboard-overlay",
				role: "presentation",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
					className: "karen-keyboard-tray",
					role: "dialog",
					"aria-modal": "true",
					"aria-label": "Karen keyboard",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "eyebrow",
								children: "Typing into"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: karenTargetLabel })] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "karen-hotkey-note",
								children: "Enter applies · Esc closes · A–Z maps"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "icon-button",
								onClick: closeKarenKeyboard,
								"aria-label": "Close Karen keyboard",
								children: "×"
							})
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "karen-focus-preview",
							lang: "kar",
							children: karenPreview || "…"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "karen-keyboard-groups",
							children: [KAREN_GROUPS.map((group) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
								className: `karen-keyboard-group karen-${group.label.toLowerCase()}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: group.label }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: group.keys.map((character, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "floating-key",
									style: { "--key-index": index },
									lang: "kar",
									"aria-label": `Karen key ${character}`,
									onMouseDown: (event) => event.preventDefault(),
									onClick: () => insertKarenCharacter(character),
									children: character
								}, `${group.label}-${index}`)) })]
							}, group.label)), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
								className: "karen-keyboard-group karen-commands",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Commands" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => restoreKarenHistory(karenUndoHistory, karenRedoHistory),
										children: "Undo"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => restoreKarenHistory(karenRedoHistory, karenUndoHistory),
										children: "Redo"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: karenBackspace,
										"aria-label": "Karen keyboard backspace",
										children: "⌫"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => {
											setStatus(`${karenTargetLabel} updated`);
											closeKarenKeyboard();
										},
										children: "Enter"
									})
								] })]
							})]
						})
					]
				})
			}),
			shortcutsOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				className: "shortcut-panel",
				"aria-label": "Keyboard shortcuts",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Keyboard shortcuts" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Legacy chord-entry contract" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "icon-button",
					onClick: () => setShortcutsOpen(false),
					"aria-label": "Close shortcuts",
					children: "×"
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Arrows / Space" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: "Move by beat or row; moving past the final beat creates a measure." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Tab" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: "Insert a full measure after the current one." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Ctrl+Space" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: "Insert a measure using the current beat number." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Ctrl+Tab" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: "Split after the active beat." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Ctrl+1-6" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: "Insert an exact 1-6 beat measure." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Backspace / Delete" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: "Smart-delete the latest mark, or remove the measure." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "A-G / B / M" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: "Root chord; B toggles flat after a root; M toggles minor." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "7 / T+7/8/9" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: "Seventh, triangle seventh, sus, or aug." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "/ then A-G" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: "Add a slash-bass note." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: ". / X / O / R" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: "Push, x marks, circle, or measure roll." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "S / comma" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: "Start or finish a slur or Only / All In span." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "L" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: "Open lead melody editing." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Lead arrows" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: "Left/Right moves slots; Ctrl+Left/Right changes measure; Up/Down changes note octave; Ctrl+Up/Down changes base octave." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Karen A-Z" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: "While the Karen keyboard is open, type A-Z or Shift+A-Z; Escape closes, Backspace deletes, and Ctrl+Z/Y undo or redo." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Enter" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: "Open Add Section; use I, V, P, C, B, S, or E." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Ctrl+Z / Ctrl+Y" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: "Undo or redo chart edits." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Ctrl+P / ?" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: "Open print room or this guide." })
				] })]
			}),
			printRoomOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "print-room-overlay",
				role: "presentation",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "print-room",
					role: "dialog",
					"aria-modal": "true",
					"aria-labelledby": "print-room-title",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
							className: "print-room-toolbar",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "print-room-kicker",
									children: "Print room"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									id: "print-room-title",
									children: "One physical page per copy"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [printCopies.length, " Letter pages: one per instrument plus Reference."] })
							] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "print-room-actions",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => setPrintRoomOpen(false),
									children: "Back to editor"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "primary",
									onClick: () => window.print(),
									children: "Print all copies"
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "print-preview-screen",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PrintSheet, {
								song,
								instrument: printCopies[printPage - 1],
								editable: true,
								onUpdate: updateSong
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
							className: "print-pagination",
							"aria-label": "Printout pages",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => setPrintPage((page) => Math.max(1, page - 1)),
									disabled: printPage === 1,
									"aria-label": "Previous printout page",
									children: "Previous"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "print-page-numbers",
									children: paginationItems(printPage, printCopies.length).map((item, index) => item === "ellipsis" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										"aria-hidden": "true",
										children: "…"
									}, `ellipsis-${index}`) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => setPrintPage(item),
										"aria-current": printPage === item ? "page" : void 0,
										"aria-label": `Show printout page ${item}, ${printCopies[item - 1]}`,
										children: item
									}, item))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => setPrintPage((page) => Math.min(printCopies.length, page + 1)),
									disabled: printPage === printCopies.length,
									"aria-label": "Next printout page",
									children: "Next"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "print-page-caption",
							"aria-live": "polite",
							children: [
								"Page ",
								printPage,
								" of ",
								printCopies.length,
								": ",
								printCopies[printPage - 1]
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "print-stack",
							"aria-hidden": "true",
							children: printCopies.map((instrument) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PrintSheet, {
								song,
								instrument
							}, instrument))
						})
					]
				})
			})
		]
	});
}
function MeasureView({ measure, active, activeBeat = -1, onBeat, pre = false, ending = false, slurPending = false, onlyPending = false, cueStarts = [], cueEnds = [] }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `measure ${active ? "active-measure" : ""} ${pre ? "pre-measure" : ""} ${ending ? "ending-bar" : ""} ${measure.roll ? "has-roll" : ""}`,
		children: [
			measure.leadEnabled && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "lead-row",
				style: { gridTemplateColumns: `repeat(${totalLeadSlots(measure)}, minmax(0, 1fr))` },
				children: Array.from({ length: totalLeadSlots(measure) }, (_, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: measure.rowLeadView?.[index] || "" }, index))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "beat-row",
				style: { gridTemplateColumns: `repeat(${measure.beats.length}, minmax(0, 1fr))` },
				children: measure.beats.map((beat, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					className: `${activeBeat === index ? "active-beat" : ""} ${slurPending && activeBeat === index ? "slur-pending" : ""} ${onlyPending && activeBeat === index ? "only-pending" : ""} ${cueStarts[index]?.length ? "lead-range-start" : ""} ${cueEnds[index]?.length ? "lead-range-end" : ""}`,
					onClick: () => onBeat(index),
					"aria-label": `${pre ? "Pre-measure" : "Measure"} beat ${index + 1}${beat.chord ? `, ${chordLabel(beat.chord)}` : ""}${cueStarts[index]?.length ? `, ${cueStarts[index].join(", ")} cue starts` : ""}${cueEnds[index]?.length ? `, ${cueEnds[index].join(", ")} cue ends` : ""}`,
					"data-cue-start": cueStarts[index]?.join(",") || void 0,
					"data-cue-end": cueEnds[index]?.join(",") || void 0,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: `chord ${beat.circle ? "circled" : ""}`,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChordNotation, { chord: beat.chord })
						}),
						(beat.dot || beat.xMarks || beat.manualUnderline || beat.bass) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "rhythm-marks",
							children: [
								beat.dot && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "push-dot",
									children: "•"
								}),
								Boolean(beat.xMarks) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "x".repeat(beat.xMarks || 0) }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "underline" })
							]
						}),
						beat.bass && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "bass-note",
							children: beat.bass
						})
					]
				}, index))
			}),
			measure.roll && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "roll-label",
				children: "Roll"
			})
		]
	});
}
function PrintSheet({ song, instrument, editable = false, onUpdate }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "print-sheet",
		"data-print-page": instrument,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "print-sheet-header",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [editable ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						"aria-label": "Karen title in print preview",
						lang: "kar",
						value: song.titleKaren,
						onChange: (event) => onUpdate?.({ titleKaren: event.target.value })
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
						lang: "kar",
						children: song.titleKaren
					}), editable ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "parenthesized-field",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								"aria-hidden": "true",
								children: "("
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								"data-karen-exempt": "true",
								"aria-label": "English title in print preview",
								value: song.titleEnglish,
								onChange: (event) => onUpdate?.({ titleEnglish: event.target.value })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								"aria-hidden": "true",
								children: ")"
							})
						]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
						"(",
						song.titleEnglish,
						")"
					] })] }),
					editable ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						"aria-label": "Song style in print preview",
						value: song.style,
						onChange: (event) => onUpdate?.({ style: event.target.value })
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: song.style }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: song.key })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "print-sheet-body",
				children: song.sections.map((section, sectionIndex) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: `print-section ${sectionTone(section.name)}`,
					"data-section-type": section.name,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: section.name }), rowsForSection(section).map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "print-row-wrap",
						children: [row.rowIndex === 0 && section.preMeasure && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PrintMeasure, {
							measure: section.preMeasure,
							pre: true
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "print-measure-row",
							style: { gridTemplateColumns: rowGridTemplate(row.measures, row.cap) },
							children: row.measures.map((measure, rowOffset) => {
								const measureIndex = row.start + rowOffset;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PrintMeasure, {
									measure,
									ending: measureIndex === section.measures.length - 1,
									cueStarts: measure.beats.map((_beat, beatIndex) => (song.instrumentCueRanges ?? []).filter((range) => range.start.section === sectionIndex && range.start.measure === measureIndex && range.start.beat === beatIndex).map((range) => range.abbr)),
									cueEnds: measure.beats.map((_beat, beatIndex) => (song.instrumentCueRanges ?? []).filter((range) => range.end.section === sectionIndex && range.end.measure === measureIndex && range.end.beat === beatIndex).map((range) => range.abbr))
								}, `${section.id}-print-${measureIndex}`);
							})
						})]
					}, `${section.id}-print-row-${row.rowIndex}`))]
				}, section.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", {
				className: "print-sheet-footer",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
						song.bpm,
						" BPM, ",
						song.meter
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: instrument }),
					editable ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						"aria-label": "Group in print preview",
						value: song.group,
						onChange: (event) => onUpdate?.({ group: event.target.value }),
						children: songGroupOptions.map((group) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: group }, group))
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: song.group })
				]
			})
		]
	});
}
function PrintMeasure({ measure, pre = false, ending = false, cueStarts = [], cueEnds = [] }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `print-measure ${pre ? "is-pre-measure" : ""} ${ending ? "ending-bar" : ""}`,
		children: [
			measure.leadEnabled && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "print-lead-row",
				style: { gridTemplateColumns: `repeat(${measure.rowLeadView?.length || 1}, minmax(0, 1fr))` },
				children: (measure.rowLeadView || []).map((note, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: note }, index))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "print-beat-row",
				style: { gridTemplateColumns: `repeat(${measure.beats.length}, minmax(0, 1fr))` },
				children: measure.beats.map((beat, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: `${cueStarts[index]?.length ? "lead-range-start" : ""} ${cueEnds[index]?.length ? "lead-range-end" : ""}`,
					"data-cue-start": cueStarts[index]?.join(",") || void 0,
					"data-cue-end": cueEnds[index]?.join(",") || void 0,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
							className: beat.circle ? "circled" : "",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChordNotation, { chord: beat.chord })
						}),
						(beat.dot || beat.xMarks || beat.manualUnderline || beat.bass) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [beat.dot ? "•" : "", "x".repeat(beat.xMarks || 0)] }),
						beat.bass && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("em", { children: beat.bass })
					]
				}, index))
			}),
			measure.roll && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "print-roll-label",
				children: "Roll"
			})
		]
	});
}
//#endregion
export { MusicDirector };
