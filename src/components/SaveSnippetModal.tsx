import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  BookOpen, 
  Check, 
  Layers, 
  Sparkles, 
  Table2, 
  Tag, 
  Sliders, 
  FolderPlus,
  Info,
  Cpu,
  CheckSquare,
  Square
} from 'lucide-react';
import { 
  ProjectFile, 
  LadderRung, 
  LadderSnippet, 
  SnippetCategory, 
  IOTag, 
  ThemeStyle 
} from '../types/plc';
import { snippetStorage } from '../storage/snippetStorage';

interface SaveSnippetModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectFile;
  initialRungId?: string | null;
  onSaveSnippet: (snippet: LadderSnippet) => void;
  theme: ThemeStyle;
}

const CATEGORIES: SnippetCategory[] = [
  'Motors & Drives',
  'Timers & Counters',
  'Safety',
  'Interlocks',
  'Process',
  'Custom',
];

export const SaveSnippetModal: React.FC<SaveSnippetModalProps> = ({
  isOpen,
  onClose,
  project,
  initialRungId,
  onSaveSnippet,
  theme,
}) => {
  const [selectedRungId, setSelectedRungId] = useState<string>('');
  const [snippetName, setSnippetName] = useState<string>('');
  const [category, setCategory] = useState<SnippetCategory>('Custom');
  const [description, setDescription] = useState<string>('');
  const [author, setAuthor] = useState<string>('Control Engineer');
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());

  // Find the selected rung
  const currentRung: LadderRung | undefined = useMemo(() => {
    return project.ladder.find((r) => r.id === selectedRungId) || project.ladder[0];
  }, [project.ladder, selectedRungId]);

  // Extract referenced IOTags for the chosen rung
  const detectedTags: IOTag[] = useMemo(() => {
    if (!currentRung) return [];
    return snippetStorage.extractReferencedTags(currentRung, project.ioMap);
  }, [currentRung, project.ioMap]);

  // Initialize or update fields when modal opens or initialRungId changes
  useEffect(() => {
    if (isOpen) {
      const targetRung = project.ladder.find((r) => r.id === initialRungId) || project.ladder[0];
      if (targetRung) {
        setSelectedRungId(targetRung.id);
        const cleanName = targetRung.comment 
          ? targetRung.comment.replace(/^\/\/\s*Rung\s*\d+:?\s*/i, '')
          : `Custom Rung ${targetRung.number} Logic`;
        setSnippetName(cleanName || `Rung ${targetRung.number} Snippet`);
        setDescription(targetRung.comment || 'Custom ladder rung snippet with I/O tags');
      }
    }
  }, [isOpen, initialRungId, project.ladder]);

  // When detected tags change, default to selecting all of them
  useEffect(() => {
    const allTagIds = new Set(detectedTags.map((t) => t.id));
    setSelectedTagIds(allTagIds);
  }, [detectedTags]);

  if (!isOpen || !currentRung) return null;

  const toggleTagSelection = (tagId: string) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  };

  const toggleSelectAllTags = () => {
    if (selectedTagIds.size === detectedTags.length) {
      setSelectedTagIds(new Set());
    } else {
      setSelectedTagIds(new Set(detectedTags.map((t) => t.id)));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!snippetName.trim()) return;

    // Filter tags that user chose to include
    const tagsToPackage = detectedTags.filter((t) => selectedTagIds.has(t.id));

    const newSnippet: LadderSnippet = {
      id: `snip_user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: snippetName.trim(),
      category,
      description: description.trim(),
      author: author.trim() || 'Control Engineer',
      createdAt: new Date().toISOString(),
      isBuiltIn: false,
      rung: currentRung,
      ioTags: tagsToPackage,
    };

    onSaveSnippet(newSnippet);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-in fade-in duration-200">
      <div className="bg-[#18181b] border border-slate-700/80 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-[#1f1f23]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white shadow-[0_0_12px_rgba(147,51,234,0.4)]">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                Save Rung as Snippet
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60">
                  Rung {currentRung.number}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Store this ladder configuration & its referenced I/O tags in your reusable snippet library
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSave} className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
          {/* Source Rung Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
              <span>Source Ladder Rung:</span>
              <span className="text-[10px] font-normal text-slate-400">
                Contains {currentRung.elements.length} ladder elements
              </span>
            </label>
            <select
              value={selectedRungId}
              onChange={(e) => setSelectedRungId(e.target.value)}
              className="w-full px-3 py-2 bg-[#121215] border border-slate-700 rounded-lg text-slate-200 text-xs font-mono outline-none focus:border-purple-500 transition-colors"
            >
              {project.ladder.map((r) => (
                <option key={r.id} value={r.id}>
                  Rung {r.number}: {r.comment || `(${r.elements.length} elements)`}
                </option>
              ))}
            </select>
          </div>

          {/* Snippet Name & Category Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300">
                Snippet Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={snippetName}
                onChange={(e) => setSnippetName(e.target.value)}
                placeholder="e.g. Tank Pump Auto-Drain Circuit"
                className="w-full px-3 py-2 bg-[#121215] border border-slate-700 rounded-lg text-slate-100 text-xs outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as SnippetCategory)}
                className="w-full px-3 py-2 bg-[#121215] border border-slate-700 rounded-lg text-slate-200 text-xs outline-none focus:border-purple-500 transition-colors"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description & Author */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300">Description / Operation Logic</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe how the contacts, latching, and outputs work..."
                className="w-full px-3 py-2 bg-[#121215] border border-slate-700 rounded-lg text-slate-200 text-xs outline-none focus:border-purple-500 resize-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300">Author</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Author name or division"
                className="w-full px-3 py-2 bg-[#121215] border border-slate-700 rounded-lg text-slate-200 text-xs outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>

          {/* Associated I/O Tag Definitions (Interactive Package List) */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Table2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-bold text-[11px] text-slate-200">
                  Associated I/O Tags ({selectedTagIds.size}/{detectedTags.length})
                </span>
              </div>
              {detectedTags.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectAllTags}
                  className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors"
                >
                  {selectedTagIds.size === detectedTags.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            <p className="text-[10px] text-slate-400">
              When dragged or inserted into any project, these I/O tag definitions will automatically import into the project's variable table if they do not already exist.
            </p>

            {detectedTags.length === 0 ? (
              <div className="p-3 rounded-lg bg-[#121215] border border-slate-800 text-slate-500 text-center text-[11px]">
                No specific addresses or variables found in this rung.
              </div>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-1.5 rounded-lg border border-slate-800 bg-[#121215] p-1.5">
                {detectedTags.map((tag) => {
                  const isChecked = selectedTagIds.has(tag.id);
                  const isInput = tag.address.area === 'INPUT';
                  return (
                    <div
                      key={tag.id}
                      onClick={() => toggleTagSelection(tag.id)}
                      className={`px-2.5 py-1.5 rounded cursor-pointer transition-all flex items-center justify-between border ${
                        isChecked
                          ? 'bg-purple-950/30 border-purple-800/50 text-slate-200'
                          : 'bg-[#18181c] border-slate-800/80 text-slate-500 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isChecked ? (
                          <CheckSquare className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        )}
                        <span className={`font-mono font-bold text-[10px] px-1 py-0.2 rounded ${
                          isInput ? 'bg-blue-950/80 text-blue-300 border border-blue-800/60' : 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                        }`}>
                          {tag.address.rawString}
                        </span>
                        <span className="font-semibold text-slate-200 truncate">
                          {tag.symbol}
                        </span>
                      </div>

                      <span className="text-[10px] text-slate-400 truncate max-w-[200px]">
                        {tag.description || 'PLC Variable'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Miniature Elements Schematic Summary */}
          <div className="p-3 rounded-lg bg-[#121215] border border-slate-800 space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Circuit Schematic Sequence:
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 font-mono text-[10px] text-slate-300">
              <span className="px-1.5 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-800/60 font-bold">
                L+ (24V)
              </span>
              <span className="text-slate-600">→</span>
              {currentRung.elements.map((el, i) => (
                <React.Fragment key={el.id}>
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200">
                    {el.type === 'BRANCH' ? 'BRANCH[OR]' : `${el.type} (${el.symbol || el.address?.rawString || '?'})`}
                  </span>
                  {i < currentRung.elements.length - 1 && (
                    <span className="text-slate-600">→</span>
                  )}
                </React.Fragment>
              ))}
              <span className="text-slate-600">→</span>
              <span className="px-1.5 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/60 font-bold">
                N (0V)
              </span>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-[0_0_12px_rgba(147,51,234,0.4)] transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save to Snippet Library</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
