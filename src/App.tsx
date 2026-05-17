/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Upload, 
  Trash2, 
  Download, 
  RefreshCw, 
  Plus, 
  FileJson,
  Image as ImageIcon,
  Type as TypeIcon,
  Save,
  CheckCircle2,
  AlertCircle,
  FileText,
  Keyboard as KeyboardIcon,
  X,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DictionaryEntry, ProcessingResult, ProjectState, CorrectionRecord } from './types';
import { processDictionaryImage } from './services/geminiService';
import { AgentService } from './services/agentService';
import * as pdfjs from 'pdfjs-dist';

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Keyboard characters for S'gaw Karen
const KAREN_CHARS = {
  consonants: ['က', 'ခ', 'ဂ', 'ဃ', 'င', 'စ', 'ဆ', 'ည', 'တ', 'ထ', 'ဒ', 'ဓ', 'န', 'ပ', 'ဖ', 'ဘ', 'မ', 'ယ', 'ရ', 'လ', 'ဝ', 'သ', 'ဟ', 'အ', 'ၡ', 'ဧ'],
  medials: ['ျ', 'ြ', 'ွ', 'ှ', 'ၠ'],
  vowels: ['ာ', 'ိ', 'ီ', 'ု', 'ူ', 'ဲ', 'ံ', 'ၢ', '့'],
  tones: ['ါ', 'ၢ်', 'ာ်', 'း', 'ၣ်', 'ၤ', '်'],
  digits: ['၀', '၁', '၂', '၃', '၄', '၅', '၆', '၇', '၈', '၉'],
};

interface KeyboardProps {
  onInsert: (char: string) => void;
  onClose: () => void;
  position?: { x: number, y: number } | null;
}

function KarenKeyboard({ onInsert, onClose, position }: KeyboardProps) {
  const style = position 
    ? { top: Math.min(position.y, window.innerHeight - 300), left: Math.min(position.x, window.innerWidth - 380), position: 'fixed' as const } 
    : { bottom: 48, right: 48, position: 'fixed' as const };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={style}
      className={`w-96 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 z-[100] backdrop-blur-xl`}
    >
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <KeyboardIcon className="w-4 h-4 text-emerald-500" />
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Karen Unicode Input</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded-md transition-colors">
          <X className="w-4 h-4 text-zinc-500" />
        </button>
      </div>

      <div className="mb-6 p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
        <p className="text-[8px] uppercase tracking-widest text-emerald-500 font-bold mb-1">Structural Rule:</p>
        <p className="text-[10px] text-zinc-400 font-mono">[Consonant] + [Medial] + [Vowel] + [Tone]</p>
      </div>

      <div className="space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
        <div>
          <p className="text-[9px] text-zinc-600 uppercase font-bold tracking-tighter mb-3">Consonants</p>
          <div className="grid grid-cols-6 gap-1.5">
            {KAREN_CHARS.consonants.map(char => (
              <button 
                key={char} 
                onClick={() => onInsert(char)}
                className="h-9 flex items-center justify-center bg-zinc-800 hover:bg-emerald-600 hover:text-white rounded-lg text-lg font-serif transition-all"
              >
                {char}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[9px] text-zinc-600 uppercase font-bold tracking-tighter mb-3">Independents</p>
          <div className="grid grid-cols-6 gap-1.5">
            {KAREN_CHARS.independents.map(char => (
              <button 
                key={char} 
                onClick={() => onInsert(char)}
                className="h-9 flex items-center justify-center bg-zinc-800 hover:bg-emerald-600 hover:text-white rounded-lg text-lg font-serif transition-all"
              >
                {char}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[9px] text-zinc-600 uppercase font-bold tracking-tighter mb-3">Medials</p>
          <div className="grid grid-cols-5 gap-1.5">
            {KAREN_CHARS.medials.map(char => (
              <button 
                key={char} 
                onClick={() => onInsert(char)}
                className="h-9 flex items-center justify-center bg-zinc-800 hover:bg-emerald-600 hover:text-white rounded-lg text-lg font-serif transition-all"
              >
                ◌{char}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[9px] text-zinc-600 uppercase font-bold tracking-tighter mb-3">Vowels & Tones</p>
          <div className="grid grid-cols-7 gap-1.5">
            {[...KAREN_CHARS.vowels, ...KAREN_CHARS.tones].map(char => (
              <button 
                key={char} 
                onClick={() => onInsert(char)}
                className="h-9 flex items-center justify-center bg-zinc-800 hover:bg-emerald-600 hover:text-white rounded-lg text-lg font-serif transition-all"
              >
                ◌{char.replace('ၢ်', 'ၢ်').replace('ာ်', 'ာ်')}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[9px] text-zinc-600 uppercase font-bold tracking-tighter mb-3">Digits</p>
          <div className="grid grid-cols-10 gap-1.5">
            {KAREN_CHARS.digits.map(char => (
              <button 
                key={char} 
                onClick={() => onInsert(char)}
                className="h-8 flex items-center justify-center bg-zinc-900 border border-zinc-800 hover:border-emerald-500 rounded text-sm transition-all"
              >
                {char}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function App() {
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [splits, setSplits] = useState<string[]>([]);
  const [status, setStatus] = useState<{ type: 'info' | 'success' | 'error', message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pdfPages, setPdfPages] = useState<{ b64: string, pageNum?: number }[]>([]);
  const [isAutoProcessing, setIsAutoProcessing] = useState(false);
  const [projectState, setProjectState] = useState<ProjectState>({
    lastProcessedPage: 1,
    totalEntries: 0,
    isAutoPilot: false
  });
  
  // Keyboard & Correction State
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [showGlobalFixForm, setShowGlobalFixForm] = useState(false);
  const [globalFixData, setGlobalFixData] = useState({ pattern: '', replacement: '', type: 'headword' as CorrectionRecord['type'] });
  const [focusedField, setFocusedField] = useState<{ id: string, field: 'karen' | 'definitions' } | null>(null);
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());
  const activeInputRef = useRef<HTMLTextAreaElement | null>(null);

  const toggleHistory = (id: string) => {
    setExpandedHistory(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Load from Server on mount
  useEffect(() => {
    fetch('/api/dictionary').then(res => res.json()).then(data => {
      if (data && Array.isArray(data) && data.length > 0) setEntries(data);
    });
    fetch('/api/progress').then(res => res.json()).then(data => {
      if (data && data.lastProcessedPage) setProjectState(data);
    });
  }, []);

  // Save to Server when entries change
  useEffect(() => {
    if (entries.length > 0) {
      fetch('/api/dictionary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entries)
      });
    }
  }, [entries]);

  // Auto-Pilot Trigger
  useEffect(() => {
    if (isAutoProcessing && splits.length > 0 && !isProcessing && currentImage) {
      const timer = setTimeout(() => {
        processCurrentSplits();
      }, 1000); // Small delay to let UI breathe
      return () => clearTimeout(timer);
    }
  }, [isAutoProcessing, splits, isProcessing, currentImage]);

  const [contextMenuPos, setContextMenuPos] = useState<{ x: number, y: number } | null>(null);

  const handleContextMenu = (e: React.MouseEvent<HTMLTextAreaElement>, id: string, field: 'karen' | 'definitions') => {
    const textarea = e.target as HTMLTextAreaElement;
    if (textarea.selectionStart !== textarea.selectionEnd) {
      e.preventDefault();
      setContextMenuPos({ x: e.clientX, y: e.clientY });
      setFocusedField({ id, field });
      activeInputRef.current = textarea;
      setShowKeyboard(true);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset processing state
    setEntries([]);
    setPdfPages([]);
    setSplits([]);
    setCurrentImage(null);

    if (file.type === 'application/pdf') {
      await processPdf(file);
    } else {
      processImage(file);
    }
  };

  const processImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      setCurrentImage(b64);
      createSplits(b64);
    };
    reader.readAsDataURL(file);
  };

  const processPdf = async (file: File) => {
    setStatus({ type: 'info', message: 'Extracting pages from PDF...' });
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    
    // Resume logic
    const startPage = projectState.lastProcessedPage || 1;
    const endPage = Math.min(startPage + 9, pdf.numPages);
    
    const pages: { b64: string, pageNum: number }[] = [];
    for (let i = startPage; i <= endPage; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) continue;

      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({ canvasContext: context, viewport, canvas }).promise;
      pages.push({ b64: canvas.toDataURL('image/jpeg'), pageNum: i });
    }
    
    setPdfPages(pages);
    if (pages.length > 0) {
      setCurrentImage(pages[0].b64);
      createSplits(pages[0].b64);
      setStatus({ type: 'success', message: `Extracted ${pdf.numPages} pages. First page ready for processing.` });
    }
    
    if (pdf.numPages > 10) {
      setStatus({ type: 'info', message: `Extracted first 10 pages of ${pdf.numPages}. Scale accordingly.` });
    }
  };

  const createSplits = (base64: string) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // 1. Intelligent Crop (Find Content Boundaries)
      let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
      const threshold = 240; // Sensitivity for "not white"

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const idx = (y * canvas.width + x) * 4;
          const r = data[idx], g = data[idx+1], b = data[idx+2];
          if (r < threshold || g < threshold || b < threshold) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }

      // Add small padding to crop
      const padding = 20;
      minX = Math.max(0, minX - padding);
      minY = Math.max(0, minY - padding);
      maxX = Math.min(canvas.width, maxX + padding);
      maxY = Math.min(canvas.height, maxY + padding);

      const croppedWidth = maxX - minX;
      const croppedHeight = maxY - minY;

      // Create a temporary canvas for the cropped image
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = croppedWidth;
      cropCanvas.height = croppedHeight;
      const cropCtx = cropCanvas.getContext('2d');
      if (!cropCtx) return;
      cropCtx.drawImage(img, minX, minY, croppedWidth, croppedHeight, 0, 0, croppedWidth, croppedHeight);

      // 2. Tri-Section Content-Aware Splitting
      const findSafeSplit = (targetY: number) => {
        const searchRange = Math.floor(croppedHeight * 0.05); // 5% range
        const cropData = cropCtx.getImageData(0, 0, croppedWidth, croppedHeight).data;

        let bestY = targetY;
        let maxWhite = -1;

        for (let y = targetY - searchRange; y < targetY + searchRange; y++) {
          if (y < 0 || y >= croppedHeight) continue;
          let whitePixels = 0;
          for (let x = 0; x < croppedWidth; x++) {
            const idx = (y * croppedWidth + x) * 4;
            if (cropData[idx] > 250 && cropData[idx+1] > 250 && cropData[idx+2] > 250) {
              whitePixels++;
            }
          }
          if (whitePixels > maxWhite) {
            maxWhite = whitePixels;
            bestY = y;
          }
        }
        return bestY;
      };

      const split1 = findSafeSplit(Math.floor(croppedHeight / 3));
      const split2 = findSafeSplit(Math.floor((croppedHeight / 3) * 2));

      const finalSplits: string[] = [];
      const sectionHeights = [split1, split2 - split1, croppedHeight - split2];
      const startYs = [0, split1, split2];

      const splitCanvas = document.createElement('canvas');
      splitCanvas.width = croppedWidth;
      const splitCtx = splitCanvas.getContext('2d');
      if (!splitCtx) return;

      sectionHeights.forEach((h, i) => {
        splitCanvas.height = h;
        splitCtx.drawImage(cropCanvas, 0, startYs[i], croppedWidth, h, 0, 0, croppedWidth, h);
        finalSplits.push(splitCanvas.toDataURL('image/jpeg', 0.9));
      });

      setSplits(finalSplits);
      setStatus({ type: 'info', message: 'Page cropped and split into 3 content-aware sections.' });
    };
    img.src = base64;
  };

  const processCurrentSplits = async () => {
    if (splits.length === 0) return;
    setIsProcessing(true);
    setStatus({ type: 'info', message: 'OCR in progress... Converting Karen script to Unicode.' });
    
    try {
      let newEntries: DictionaryEntry[] = [];
      
      for (let i = 0; i < splits.length; i++) {
        const base64 = splits[i].split(',')[1];
        const pageNumFromState = projectState.lastProcessedPage; // Passing the page explicitly based on state
        const result: ProcessingResult = await processDictionaryImage(base64, 'image/jpeg', pageNumFromState);
        
        const timestamp = Date.now();
        const mappedResults: DictionaryEntry[] = result.entries.map((item, index) => ({
          id: `${timestamp}-${i}-${index}`,
          karen: item.karen,
          definitions: item.definitions,
          page: item.page || pageNumFromState,
          flag: item.flag,
          status: item.status || (item.flag ? 'unsure' as const : 'correct' as const),
          _is_example_sentence: item._is_example_sentence,
          example_sentence: item.example_sentence,
          original_karen: item.original_karen,
          part_of_speech: item.part_of_speech,
          interchangeable_with: item.interchangeable_with,
          etymology: item.etymology,
          ditto_of: item.ditto_of,
          related_headwords: item.related_headwords,
          compound_entry: item.compound_entry,
          cross_reference: item.cross_reference,
          history: [],
          timestamp
        }));
        
        newEntries = [...newEntries, ...mappedResults];
      }

      setEntries(prev => {
        const combined = [...prev, ...newEntries];
        if (combined.length === 0) return [];
        const merged: DictionaryEntry[] = [{ ...combined[0], definitions: [...combined[0].definitions], history: [...(combined[0].history || [])] }];
        for (let j = 1; j < combined.length; j++) {
          const current = combined[j];
          const last = merged[merged.length - 1];
          if (current.karen.trim() === last.karen.trim()) {
            last.definitions = [...last.definitions, ...current.definitions];
            // keep the flag if any of them were flagged
            last.flag = last.flag || current.flag;
            if (current.status === 'unsure' || current.status === 'needs_correction') {
              last.status = current.status;
            }
          } else {
            merged.push({ ...current, definitions: [...current.definitions], history: [...(current.history || [])] });
          }
        }
        return merged;
      });

      setProjectState(prev => ({ 
        ...prev, 
        lastProcessedPage: prev.lastProcessedPage + 1,
        totalEntries: prev.totalEntries + newEntries.length 
      }));
      
      setStatus({ type: 'success', message: `Successfully added ${newEntries.length} new entries. Resuming from page ${projectState.lastProcessedPage + 1}.` });
      
      // If we have more PDF pages, we could auto-advance here
      if (pdfPages.length > 1) {
        const remaining = pdfPages.slice(1);
        setPdfPages(remaining);
        setCurrentImage(remaining[0].b64);
        createSplits(remaining[0].b64);
      } else {
        setCurrentImage(null);
        setSplits([]);
      }
    } catch (error) {
      console.error('Processing failed', error);
      setStatus({ type: 'error', message: 'Failed to process images. Please check the console for details.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteEntry = (id: string) => {
    setEntries(entries.filter(e => e.id !== id));
  };

  const updateEntry = (id: string, field: 'karen' | 'definitions', value: string | string[]) => {
    setEntries(entries.map(e => {
      if (e.id !== id) return e;
      const historyRecord = {
        timestamp: Date.now(),
        karen: e.karen,
        definitions: e.definitions,
        agentCorrected: false,
        reason: 'Manual user edit'
      };
      
      const updated = { 
        ...e, 
        [field]: value, 
        history: [...(e.history || []), historyRecord] 
      };

      // Background log
      AgentService.logGroundTruthCorrection(e, updated, e.page);
      
      return updated;
    }));
  };

  const exportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(entries, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "sk_dictionary.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const clearAll = () => {
    if (confirm('Are you sure you want to clear the entire dictionary?')) {
      setEntries([]);
      localStorage.removeItem('sk_dictionary');
    }
  };

  const handleKeyboardInsert = (char: string) => {
    if (!focusedField || !activeInputRef.current) return;
    
    const textarea = activeInputRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    const newValue = text.substring(0, start) + char + text.substring(end);
    if (focusedField.field === 'definitions') {
      updateEntry(focusedField.id, focusedField.field, newValue.split('\n'));
    } else {
      updateEntry(focusedField.id, focusedField.field, newValue);
    }
    
    // Maintain cursor position after update
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + char.length, start + char.length);
    }, 0);
  };

  const applyGlobalCorrection = async () => {
    if (!globalFixData.pattern) return;
    
    await AgentService.logCorrection(globalFixData.pattern, globalFixData.replacement, globalFixData.type);
    const memory = await AgentService.getMemory();
    const updated = AgentService.applyGlobalFixes(entries, memory);
    
    setEntries(updated);
    setShowGlobalFixForm(false);
    setGlobalFixData({ pattern: '', replacement: '', type: 'headword' });
    setStatus({ type: 'success', message: `Global fix applied. Character memory updated.` });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans selection:bg-emerald-500/30 selection:text-white">
      {/* Keyboard & Modal Layer */}
      <AnimatePresence>
        {showKeyboard && (
          <KarenKeyboard 
            onInsert={handleKeyboardInsert} 
            onClose={() => {
              setShowKeyboard(false);
              setContextMenuPos(null);
            }} 
            position={contextMenuPos}
          />
        )}
        
        {showGlobalFixForm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white tracking-tight">Global Prediction Fix</h3>
                <button onClick={() => setShowGlobalFixForm(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed uppercase tracking-widest font-bold">The agent will fix all current entries and remember this for all future crops.</p>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Target Pattern (Mistake)</label>
                  <input 
                    value={globalFixData.pattern} 
                    onChange={e => setGlobalFixData(prev => ({...prev, pattern: e.target.value}))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white focus:border-emerald-500 outline-none"
                    placeholder="e.g. ကဆိ"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Replacement (Ground Truth)</label>
                  <input 
                    value={globalFixData.replacement} 
                    onChange={e => setGlobalFixData(prev => ({...prev, replacement: e.target.value}))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white focus:border-emerald-500 outline-none"
                    placeholder="e.g. ကဆၧ"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                   {['headword', 'definition'].map(t => (
                     <button
                        key={t}
                        onClick={() => setGlobalFixData(prev => ({...prev, type: t as any}))}
                        className={`py-3 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all ${globalFixData.type === t ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/20' : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}
                     >
                       Fix {t}
                     </button>
                   ))}
                </div>
              </div>

              <button 
                onClick={applyGlobalCorrection}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase text-sm tracking-widest rounded-xl transition-all shadow-xl shadow-emerald-900/40"
              >
                Apply & Remember Fix
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Header */}
      <header className="border-b border-zinc-800 p-6 flex justify-between items-center bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-900/20">SK</div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white flex items-center gap-2">
              KarenLex <span className="text-emerald-400">Unicode Sync</span>
            </h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-medium mt-0.5">Vision Model Active • v1.0</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowGlobalFixForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-emerald-600/20 hover:text-emerald-400 text-zinc-400 text-xs uppercase font-bold tracking-widest rounded-md border border-zinc-700 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Global Fix
          </button>
          <button 
            onClick={exportJson}
            disabled={entries.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs uppercase font-bold tracking-widest rounded-md border border-zinc-700 transition-all disabled:opacity-20"
          >
            <Download className="w-4 h-4" />
            Export Dictionary
          </button>
          <button 
            onClick={clearAll}
            disabled={entries.length === 0}
            className="p-2 text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-[380px_1fr] min-h-[calc(100vh-88px)]">
        {/* Sidebar: Controls */}
        <aside className="border-r border-zinc-800 p-8 space-y-8 bg-zinc-900/30">
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-6">01. Source Material</h2>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-800 rounded-2xl p-10 flex flex-col items-center justify-center gap-4 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all cursor-pointer group bg-zinc-900/50"
            >
              <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:border-emerald-500 group-hover:text-white transition-all duration-300">
                <FileText className="w-7 h-7" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-zinc-200">Upload PDF or Image</p>
                <p className="text-[10px] uppercase tracking-wider opacity-40 mt-1">Full Dictionary PDF supported</p>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                accept="image/*,application/pdf"
              />
            </div>
          </section>

          {currentImage && (
            <motion.section 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">02. Split Preview</h2>
              <div className="grid grid-cols-1 gap-3">
                  {splits.map((s, i) => (
                  <div key={i} className="relative border border-zinc-800 rounded-xl overflow-hidden bg-black/40 group">
                    <img src={s} className="w-full h-auto transition-transform duration-500 group-hover:scale-105" referrerPolicy="no-referrer" />
                    <div className="absolute top-3 left-3 bg-zinc-900/90 backdrop-blur-sm text-emerald-400 text-[9px] px-2.5 py-1 rounded-full border border-emerald-500/30 font-bold uppercase tracking-wider">
                      Section {i + 1}
                    </div>
                  </div>
                ))}
              </div>
              <button 
                onClick={processCurrentSplits}
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-3 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase text-sm tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-900/20 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none"
              >
                {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                {isProcessing ? 'Processing OCR...' : 'Run OCR Conversion'}
              </button>

              <div className="flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${isAutoProcessing ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`}></div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Auto-Pilot Mode</span>
                </div>
                <button 
                  onClick={() => setIsAutoProcessing(!isAutoProcessing)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${isAutoProcessing ? 'bg-emerald-600' : 'bg-zinc-700'}`}
                >
                  <motion.div 
                    animate={{ x: isAutoProcessing ? 20 : 2 }}
                    initial={false}
                    className="absolute top-1 left-0 w-3 h-3 bg-white rounded-full shadow-sm"
                  />
                </button>
              </div>
            </motion.section>
          )}

          {status && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`p-4 rounded-xl flex items-start gap-3 border ${
                status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 
                status.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 
                'bg-zinc-800/50 border-zinc-700/50 text-zinc-300'
              }`}
            >
              {status.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : 
               status.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : 
               <RefreshCw className="w-5 h-5 shrink-0 animate-spin" />}
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold tracking-widest opacity-50">{status.type}</p>
                <p className="text-xs leading-relaxed font-medium">{status.message}</p>
              </div>
            </motion.div>
          )}

          <div className="pt-8 mt-auto border-t border-zinc-800">
            <div className="p-5 rounded-2xl border border-zinc-800 bg-black/40">
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-3">Teaching Strategy</div>
              <p className="text-xs leading-relaxed text-zinc-400">
                To train an AI on S'gaw Karen, use a <strong>Custom Tokenizer</strong> with Myanmar Unicode support and a <strong>RAG-enhanced Agent</strong> for dictionary lookup.
              </p>
            </div>
          </div>
        </aside>

        {/* Content: Dictionary Grid */}
        <section className="p-10 bg-zinc-950">
          <div className="flex justify-between items-end mb-10">
            <div className="space-y-1">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">03. Unicode Dictionary Result</h2>
              <p className="text-5xl font-semibold tracking-tight text-white flex items-center gap-4">
                {entries.length} 
                <span className="text-sm font-sans uppercase tracking-[0.3em] font-light text-zinc-600 block mt-auto pb-1">Verified Records</span>
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden shadow-2xl">
            <div className="grid grid-cols-[240px_1fr_80px] border-b border-zinc-800 bg-zinc-900/80 text-zinc-400 uppercase font-bold text-[10px] tracking-widest py-4 px-8">
              <div>Karen Headword</div>
              <div>Unicode Translation / Entry</div>
              <div className="text-right">Manage</div>
            </div>
            
            <AnimatePresence mode="popLayout">
              {entries.length === 0 ? (
                <div className="p-32 text-center flex flex-col items-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 text-zinc-600">
                    <ImageIcon className="w-10 h-10" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-medium text-zinc-400">Digital Archive Empty</p>
                    <p className="text-xs uppercase tracking-widest text-zinc-600 max-w-xs mx-auto">Upload dictionary source material to begin the Unicode synchronization process.</p>
                  </div>
                </div>
              ) : (
                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                  {entries.map((entry) => {
                    const colorClass = entry.status === 'correct' ? 'text-emerald-400' :
                                       entry.status === 'needs_correction' ? 'text-amber-400' :
                                       entry.status === 'unsure' ? 'text-red-400' : 'text-emerald-400';
                    const statusDotClass = entry.status === 'correct' ? 'bg-emerald-500' :
                                           entry.status === 'needs_correction' ? 'bg-amber-500' :
                                           entry.status === 'unsure' ? 'bg-red-500' : 'bg-emerald-500';
                    const isExpanded = expandedHistory.has(entry.id);

                    return (
                      <motion.div 
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        key={entry.id} 
                        className="flex flex-col border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-all group"
                      >
                        <div className="grid grid-cols-[240px_1fr_80px] items-stretch min-h-[100px]">
                          <div className="p-6 border-r border-zinc-800/50 flex flex-col bg-zinc-900/30">
                            {entry.flag && (
                              <div className="mb-2 flex items-center gap-1.5 text-[9px] font-bold text-red-400 uppercase tracking-widest bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 w-fit">
                                <AlertCircle className="w-3 h-3" /> Flagged
                              </div>
                            )}
                            <textarea
                              value={entry.karen}
                              onFocus={(e) => {
                                setFocusedField({ id: entry.id, field: 'karen' });
                                activeInputRef.current = e.target as HTMLTextAreaElement;
                                setShowKeyboard(true);
                                setContextMenuPos(null);
                              }}
                              onContextMenu={(e) => handleContextMenu(e, entry.id, 'karen')}
                              onChange={(e) => updateEntry(entry.id, 'karen', e.target.value)}
                              className={`w-full flex-1 bg-transparent border-none resize-none focus:ring-0 font-serif font-medium p-0 text-2xl KarenUnicode ${colorClass}`}
                              rows={2}
                            />
                             <div className="mt-4 flex items-center gap-2 relative">
                              <span className={`w-1.5 h-1.5 rounded-full ${statusDotClass}`}></span>
                              <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
                                {entry.page ? `Page ${entry.page}` : 'Unicode Block'}
                              </span>
                            </div>
                          </div>
                          <div className="p-6 relative">
                            <textarea
                              value={entry.definitions.join('\n')}
                              onFocus={(e) => {
                                setFocusedField({ id: entry.id, field: 'definitions' });
                                activeInputRef.current = e.target as HTMLTextAreaElement;
                                setShowKeyboard(true);
                                setContextMenuPos(null);
                              }}
                              onContextMenu={(e) => handleContextMenu(e, entry.id, 'definitions')}
                              onChange={(e) => updateEntry(entry.id, 'definitions', e.target.value.split('\n'))}
                              className="w-full bg-transparent border-none resize-none focus:ring-0 p-0 text-sm leading-relaxed text-zinc-400 hover:text-zinc-200 transition-colors"
                              style={{ minHeight: '60px' }}
                            />
                            
                            {/* Metadata Badges */}
                            <div className="mt-4 flex flex-wrap gap-2">
                              {entry.part_of_speech && (
                                <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400/80 bg-emerald-500/10 px-2 py-1 rounded">
                                  {entry.part_of_speech}
                                </span>
                              )}
                              {entry._is_example_sentence && (
                                <span className="text-[10px] uppercase font-bold tracking-widest text-blue-400/80 bg-blue-500/10 px-2 py-1 rounded">
                                  Example
                                </span>
                              )}
                              {entry.example_sentence && (
                                <div className="w-full mt-2 text-xs text-zinc-500 italic border-l-2 border-zinc-800 pl-3">
                                  <span className="font-serif KarenUnicode mr-2 text-zinc-400 not-italic">{entry.example_sentence}</span>
                                </div>
                              )}
                              {entry.interchangeable_with && entry.interchangeable_with.length > 0 && (
                                <span className="text-[10px] font-medium text-zinc-500 bg-zinc-800/80 px-2 py-1 rounded">
                                  ≈ <span className="font-serif KarenUnicode">{entry.interchangeable_with.join(', ')}</span>
                                </span>
                              )}
                              {entry.etymology && (
                                <span className="text-[10px] font-medium text-zinc-500 bg-zinc-800/80 px-2 py-1 rounded">
                                  From <span className="font-serif KarenUnicode">{entry.etymology}</span>
                                </span>
                              )}
                              {entry.ditto_of && (
                                <span className="text-[10px] font-medium text-zinc-500 bg-zinc-800/80 px-2 py-1 rounded">
                                  Ditto: <span className="font-serif KarenUnicode">{entry.ditto_of}</span>
                                </span>
                              )}
                              {entry.related_headwords && entry.related_headwords.length > 0 && (
                                <span className="text-[10px] font-medium text-zinc-500 bg-zinc-800/80 px-2 py-1 rounded">
                                  See also: <span className="font-serif KarenUnicode">{entry.related_headwords.join(', ')}</span>
                                </span>
                              )}
                              {entry.compound_entry && (
                                <span className="text-[10px] uppercase font-bold tracking-widest text-purple-400/80 bg-purple-500/10 px-2 py-1 rounded flex items-center gap-1">
                                  Compound <span className="font-serif KarenUnicode ml-1 not-italic">{entry.compound_entry}</span>
                                </span>
                              )}
                              {entry.cross_reference && (
                                <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400/80 bg-amber-500/10 px-2 py-1 rounded flex items-center gap-1">
                                  Cf. <span className="font-serif KarenUnicode ml-1 not-italic">{entry.cross_reference}</span>
                                </span>
                              )}
                              {entry.original_karen && entry.original_karen !== entry.karen && (
                                <span className="text-[10px] font-medium text-red-400/80 bg-red-500/10 px-2 py-1 rounded flex items-center gap-1">
                                  OCR: <span className="font-serif KarenUnicode line-through">{entry.original_karen}</span>
                                </span>
                              )}
                            </div>

                            <div className="absolute top-2 right-4 opacity-0 group-hover:opacity-30 transition-opacity">
                              <Save className="w-3 h-3" />
                            </div>
                          </div>
                          <div className="flex flex-col items-center justify-center gap-2 bg-black/20 opacity-0 group-hover:opacity-100 transition-all border-l border-zinc-800/50">
                            <button 
                              onClick={() => deleteEntry(entry.id)}
                              className="w-10 h-10 rounded-full hover:bg-red-500/10 hover:text-red-400 flex items-center justify-center transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            {entry.history && entry.history.length > 0 && (
                              <button 
                                onClick={() => toggleHistory(entry.id)}
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isExpanded ? 'bg-emerald-500/10 text-emerald-400' : 'hover:bg-zinc-800 text-zinc-500'}`}
                              >
                                <History className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <AnimatePresence>
                          {isExpanded && entry.history && entry.history.length > 0 && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden bg-zinc-950 border-t border-zinc-800/50"
                            >
                              <div className="p-6">
                                <h5 className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-4">Version History</h5>
                                <div className="space-y-4">
                                  {entry.history.map((hist, idx) => (
                                    <div key={idx} className="flex gap-4 items-start text-xs font-mono">
                                      <div className="w-32 text-zinc-600 shrink-0 mt-1">{new Date(hist.timestamp).toLocaleTimeString()}</div>
                                      <div className="flex-1 space-y-1 bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/50">
                                        <div className="text-zinc-300 flex items-center gap-2">
                                          <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-sans">Karen:</span> 
                                          <span className="font-serif KarenUnicode text-base">{hist.karen}</span>
                                        </div>
                                        <div className="text-zinc-400">
                                          <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-sans mr-2">Defs:</span> 
                                          {hist.definitions.join(', ')}
                                        </div>
                                        {hist.reason && (
                                          <div className="text-emerald-500/80 text-[10px] mt-2 font-sans italic flex items-center gap-1.5 before:content-[''] before:w-3 before:h-px before:bg-emerald-500/30">
                                            {hist.reason}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-16 grid grid-cols-3 gap-8">
             <div className="p-8 rounded-2xl border border-zinc-800 bg-zinc-900/20 space-y-4">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                <h4 className="text-xs font-bold uppercase tracking-widest text-white">OCR Integrity</h4>
                <p className="text-xs leading-relaxed text-zinc-500">Dual-slice processing ensures the vision model captures fine details of the Karen script without font bleeding.</p>
             </div>
             <div className="p-8 rounded-2xl border border-zinc-800 bg-zinc-900/20 space-y-4">
                <RefreshCw className="w-6 h-6 text-emerald-500" />
                <h4 className="text-xs font-bold uppercase tracking-widest text-white">Unicode Mapping</h4>
                <p className="text-xs leading-relaxed text-zinc-500">Automatic translation from legacy KNU-font mappings to standard Myanmar Unicode range (U+1000–U+109F).</p>
             </div>
             <div className="p-8 rounded-2xl border border-zinc-800 bg-zinc-900/20 space-y-4">
                <FileJson className="w-6 h-6 text-emerald-500" />
                <h4 className="text-xs font-bold uppercase tracking-widest text-white">Dataset Ready</h4>
                <p className="text-xs leading-relaxed text-zinc-500">Perfectly formatted JSON structure optimized for training LLMs or population into vector databases for RAG.</p>
             </div>
          </div>
        </section>
      </main>

      {/* Footer bar */}
      <footer className="h-10 bg-emerald-600 px-8 flex items-center justify-between text-white text-[11px] font-medium tracking-wide">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
          Ready for processing batch images. Current stack size: {entries.length} records.
        </div>
        <div className="flex gap-8 uppercase tracking-widest text-[9px] font-bold">
          <span className="opacity-80">Session: Active</span>
          <span className="opacity-80">Agent: Linguistic RAG-Parser</span>
        </div>
      </footer>
    </div>
  );
}
