import React, { useState, useMemo, useRef } from 'react';
import { 
  BookOpen, 
  Search, 
  Plus, 
  Download, 
  Upload, 
  GripVertical, 
  Trash2, 
  Tag, 
  Sparkles, 
  FileCode2, 
  CheckCircle2, 
  Layers, 
  Cpu, 
  Table2, 
  ExternalLink,
  Info,
  Shield,
  RotateCcw,
  Zap,
  Timer,
  Sliders,
  Filter
} from 'lucide-react';
import { 
  LadderSnippet, 
  SnippetCategory, 
  ThemeStyle, 
  LadderRung, 
  LadderElementType, 
  LadderElement 
} from '../types/plc';

interface LibraryPanelProps {
  snippets: LadderSnippet[];
  onInsertSnippet: (snippet: LadderSnippet, targetIndex?: number) => void;
  onOpenSaveModal: () => void;
  onDeleteSnippet: (snippetId: string) => void;
  onImportSnippets: (jsonText: string) => void;
  onExportSnippets: () => void;
  theme: ThemeStyle;
  selectedRung?: LadderRung | null;
}

const CATEGORY_STYLES: Record<SnippetCategory, { bg: string; text: string; border: string }> = {
  'Motors & Drives': { bg: 'bg-blue-950/60', text: 'text-blue-300', border: 'border-blue-800/60' },
  'Timers & Counters': { bg: 'bg-amber-950/60', text: 'text-amber-300', border: 'border-amber-800/60' },
  'Safety': { bg: 'bg-rose-950/60', text: 'text-rose-300', border: 'border-rose-800/60' },
  'Interlocks': { bg: 'bg-purple-950/60', text: 'text-purple-300', border: 'border-purple-800/60' },
  'Process': { bg: 'bg-emerald-950/60', text: 'text-emerald-300', border: 'border-emerald-800/60' },
  'Custom': { bg: 'bg-cyan-950/60', text: 'text-cyan-300', border: 'border-cyan-800/60' },
};

export const LibraryPanel: React.FC<LibraryPanelProps> = ({
  snippets,
  onInsertSnippet,
  onOpenSaveModal,
  onDeleteSnippet,
  onImportSnippets,
  onExportSnippets,
  theme,
  selectedRung,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [expandedSnippetId, setExpandedSnippetId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const categories = useMemo(() => {
    const list: string[] = ['ALL', 'Custom', 'Motors & Drives', 'Timers & Counters', 'Safety', 'Process'];
    return list;
  }, []);

  // Filtered snippets based on search and category
  const filteredSnippets = useMemo(() => {
    return snippets.filter((s) => {
      const matchesCat = 
        selectedCategory === 'ALL' ||
        (selectedCategory === 'Custom' && !s.isBuiltIn) ||
        s.category === selectedCategory;

      if (!matchesCat) return false;

      if (!searchTerm.trim()) return true;

      const q = searchTerm.toLowerCase();
      const inName = s.name.toLowerCase().includes(q);
      const inDesc = s.description.toLowerCase().includes(q);
      const inCat = s.category.toLowerCase().includes(q);
      const inTags = s.ioTags?.some(
        (t) => t.symbol.toLowerCase().includes(q) || t.address.rawString.toLowerCase().includes(q)
      );

      return inName || inDesc || inCat || inTags;
    });
  }, [snippets, selectedCategory, searchTerm]);

  // Handle Drag Start
  const handleDragStart = (e: React.DragEvent, snippet: LadderSnippet) => {
    const dragData = {
      type: 'LADDER_SNIPPET',
      snippet,
    };
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'copy';

    // Set custom drag preview styling
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.add('opacity-50');
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.remove('opacity-50');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        onImportSnippets(text);
      } catch (err: any) {
        alert(`Failed to import snippets: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full overflow-hidden select-none font-sans text-xs">
      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col gap-2 p-2.5 pb-2 border-b border-slate-800 bg-[#141418]/60 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-purple-400" />
            <span className="font-bold text-slate-100 text-xs tracking-wide">
              Snippet Library
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="Import Snippets (.json)"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onExportSnippets}
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="Export Snippet Library (.json)"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Save Active Rung Button */}
        <button
          onClick={onOpenSaveModal}
          className="w-full py-1.5 px-2.5 rounded-lg bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(147,51,234,0.3)] transition-all cursor-pointer hover:scale-[1.01]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Save Current Rung as Snippet</span>
        </button>

        {/* Search Input */}
        <div className="relative mt-1">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search snippets, tags, logic..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1.5 bg-[#18181c] border border-slate-700/70 rounded-md text-xs text-slate-200 outline-none focus:border-purple-500 transition-colors placeholder:text-slate-500"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto py-1 no-scrollbar text-[10px]">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            const count = snippets.filter((s) => {
              if (cat === 'ALL') return true;
              if (cat === 'Custom') return !s.isBuiltIn;
              return s.category === cat;
            }).length;

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-0.5 rounded-full font-medium whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-purple-600 text-white font-bold shadow-xs'
                    : 'bg-[#1a1a20] text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Drag & Drop Guidance Banner */}
      <div className="px-3 py-1.5 bg-purple-950/20 border-b border-purple-900/30 flex items-center justify-between text-[10px] text-purple-300">
        <span className="flex items-center gap-1.5">
          <GripVertical className="w-3 h-3 text-purple-400" />
          <span>Drag card directly into Ladder Canvas</span>
        </span>
        <span className="text-[9px] text-purple-400/80 font-mono">
          Auto-imports I/O
        </span>
      </div>

      {/* Snippet Card List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2.5">
        {filteredSnippets.length === 0 ? (
          <div className="p-6 rounded-lg bg-[#141418] border border-slate-800 text-center text-slate-500 space-y-2 my-4">
            <BookOpen className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-xs font-semibold text-slate-400">No Snippets Found</p>
            <p className="text-[11px] text-slate-500">
              {selectedCategory === 'Custom'
                ? 'Save your active project rungs as reusable snippets with the button above!'
                : 'Try adjusting your search terms or category filter.'}
            </p>
          </div>
        ) : (
          filteredSnippets.map((snippet) => {
            const catStyle = CATEGORY_STYLES[snippet.category] || CATEGORY_STYLES['Custom'];
            const isExpanded = expandedSnippetId === snippet.id;

            return (
              <div
                key={snippet.id}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, snippet)}
                onDragEnd={handleDragEnd}
                className="group relative rounded-lg bg-[#18181c] border border-slate-800 hover:border-purple-500/60 shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing hover:shadow-[0_4px_16px_rgba(0,0,0,0.4)] flex flex-col overflow-hidden"
              >
                {/* Drag Handle Indicator Strip */}
                <div className="px-2.5 py-1.5 bg-[#1e1e24] border-b border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <GripVertical className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-400 transition-colors shrink-0" />
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
                      {snippet.category}
                    </span>
                    {snippet.isBuiltIn && (
                      <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        Preset
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {!snippet.isBuiltIn && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete custom snippet "${snippet.name}"?`)) {
                            onDeleteSnippet(snippet.id);
                          }
                        }}
                        className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-950/40 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete Snippet"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-2.5 flex flex-col gap-2">
                  <div className="flex flex-col">
                    <span className="font-bold text-xs text-slate-100 group-hover:text-purple-300 transition-colors">
                      {snippet.name}
                    </span>
                    <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                      {snippet.description}
                    </p>
                  </div>

                  {/* Circuit Flow Preview Bar */}
                  <div className="p-1.5 rounded bg-[#121215] border border-slate-800/80 flex items-center gap-1 overflow-x-auto text-[9px] font-mono text-slate-400">
                    <span className="text-red-400 font-bold">L+</span>
                    <span>→</span>
                    {snippet.rung.elements.slice(0, 4).map((el, i) => (
                      <React.Fragment key={el.id || i}>
                        <span className="px-1 py-0.2 rounded bg-slate-800 text-slate-200 border border-slate-700 truncate max-w-[70px]">
                          {el.symbol || el.address?.rawString || el.type}
                        </span>
                        {i < Math.min(snippet.rung.elements.length, 4) - 1 && <span>→</span>}
                      </React.Fragment>
                    ))}
                    {snippet.rung.elements.length > 4 && (
                      <span className="text-slate-500">+{snippet.rung.elements.length - 4}</span>
                    )}
                    <span>→</span>
                    <span className="text-blue-400 font-bold">N</span>
                  </div>

                  {/* Associated I/O Tag Chips */}
                  {snippet.ioTags && snippet.ioTags.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Table2 className="w-2.5 h-2.5 text-emerald-400" />
                        <span>Included I/O Tags ({snippet.ioTags.length}):</span>
                      </span>

                      <div className="flex items-center flex-wrap gap-1">
                        {snippet.ioTags.map((tag) => {
                          const isInput = tag.address.area === 'INPUT';
                          return (
                            <span
                              key={tag.id || tag.address.rawString}
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                                isInput
                                  ? 'bg-blue-950/40 text-blue-300 border-blue-800/40'
                                  : 'bg-amber-950/40 text-amber-300 border-amber-800/40'
                              }`}
                              title={`${tag.symbol} (${tag.address.rawString}): ${tag.description}`}
                            >
                              <span className="font-bold">{tag.address.rawString}</span>
                              <span className="text-slate-300">{tag.symbol}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Primary Insertion Action Button */}
                  <button
                    onClick={() => onInsertSnippet(snippet)}
                    className="mt-1 w-full py-1.5 rounded-md bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/40 hover:border-purple-400 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
                    title="Insert this snippet as a new rung in the active project"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Insert into Project</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
