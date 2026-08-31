import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Lock, 
  Unlock, 
  Filter,
  Layers,
  Edit2,
  CheckSquare,
  Square,
  MinusSquare,
  X,
  Zap,
  PowerOff
} from 'lucide-react';
import { IOTag, DataType, Address, ThemeStyle, SimulationStatus } from '../types/plc';
import { defaultDialect, findDuplicateAddresses } from '../utils/addressParser';

interface IOTableProps {
  tags: IOTag[];
  onAddTag: (tag: IOTag) => void;
  onUpdateTag: (tag: IOTag) => void;
  onDeleteTag: (tagId: string) => void;
  onDeleteTags?: (tagIds: string[]) => void;
  onToggleForce: (tagId: string) => void;
  onBulkToggleForce?: (tagIds: string[], targetState?: boolean) => void;
  onBulkSetValues?: (tagIds: string[], val: boolean | number) => void;
  onToggleValue: (tagId: string) => void;
  theme: ThemeStyle;
  simStatus: SimulationStatus;
}

export const IOTable: React.FC<IOTableProps> = ({
  tags,
  onAddTag,
  onUpdateTag,
  onDeleteTag,
  onDeleteTags,
  onToggleForce,
  onBulkToggleForce,
  onBulkSetValues,
  onToggleValue,
  theme,
  simStatus,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [areaFilter, setAreaFilter] = useState<'ALL' | 'INPUT' | 'OUTPUT' | 'MEMORY' | 'TIMER' | 'COUNTER'>('ALL');
  const [editingTagId, setEditingTagId] = useState<string | null>(null);

  // Multi-selection state
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [lastSelectedTagId, setLastSelectedTagId] = useState<string | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  // New tag quick input state
  const [newSymbol, setNewSymbol] = useState('');
  const [newAddressStr, setNewAddressStr] = useState('');
  const [newType, setNewType] = useState<DataType>('BOOL');
  const [newDescription, setNewDescription] = useState('');
  const [addressError, setAddressError] = useState<string | null>(null);

  const { conflicts } = findDuplicateAddresses(tags);
  const conflictAddressSet = useMemo(() => new Set(conflicts.map((c) => c.address)), [conflicts]);

  const filteredTags = useMemo(() => {
    return tags.filter((t) => {
      const matchesSearch = 
        t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.address.rawString.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesArea = areaFilter === 'ALL' || t.address.area === areaFilter;
      return matchesSearch && matchesArea;
    });
  }, [tags, searchQuery, areaFilter]);

  // Selected tags objects
  const selectedTags = useMemo(() => {
    return tags.filter((t) => selectedTagIds.has(t.id));
  }, [tags, selectedTagIds]);

  const allFilteredSelected = filteredTags.length > 0 && filteredTags.every((t) => selectedTagIds.has(t.id));
  const someFilteredSelected = filteredTags.some((t) => selectedTagIds.has(t.id));
  const isIndeterminate = someFilteredSelected && !allFilteredSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  // Handle multi-select toggle with Shift+Click support
  const handleToggleSelect = (tagId: string, e?: React.MouseEvent) => {
    const next = new Set(selectedTagIds);

    if (e && e.shiftKey && lastSelectedTagId && lastSelectedTagId !== tagId) {
      const idx1 = filteredTags.findIndex((t) => t.id === lastSelectedTagId);
      const idx2 = filteredTags.findIndex((t) => t.id === tagId);
      if (idx1 !== -1 && idx2 !== -1) {
        const start = Math.min(idx1, idx2);
        const end = Math.max(idx1, idx2);
        for (let i = start; i <= end; i++) {
          next.add(filteredTags[i].id);
        }
        setSelectedTagIds(next);
        setLastSelectedTagId(tagId);
        return;
      }
    }

    if (next.has(tagId)) {
      next.delete(tagId);
    } else {
      next.add(tagId);
    }
    setSelectedTagIds(next);
    setLastSelectedTagId(tagId);
  };

  const handleToggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      const next = new Set(selectedTagIds);
      filteredTags.forEach((t) => next.delete(t.id));
      setSelectedTagIds(next);
    } else {
      const next = new Set(selectedTagIds);
      filteredTags.forEach((t) => next.add(t.id));
      setSelectedTagIds(next);
    }
  };

  const handleClearSelection = () => {
    setSelectedTagIds(new Set());
    setLastSelectedTagId(null);
  };

  // Bulk operations
  const handleBulkDelete = () => {
    if (selectedTagIds.size === 0) return;
    const ids = Array.from(selectedTagIds);
    if (onDeleteTags) {
      onDeleteTags(ids);
    } else {
      ids.forEach((id) => onDeleteTag(id));
    }
    setSelectedTagIds(new Set());
    setLastSelectedTagId(null);
  };

  const handleBulkToggleForceAction = (targetState?: boolean) => {
    if (selectedTagIds.size === 0) return;
    const ids = Array.from(selectedTagIds);
    if (onBulkToggleForce) {
      onBulkToggleForce(ids, targetState);
    } else {
      ids.forEach((id) => onToggleForce(id));
    }
  };

  const handleBulkSetBooleanValues = (val: boolean) => {
    if (selectedTagIds.size === 0) return;
    const boolIds = selectedTags.filter((t) => t.dataType === 'BOOL').map((t) => t.id);
    if (boolIds.length === 0) return;

    if (onBulkSetValues) {
      onBulkSetValues(boolIds, val);
    } else {
      boolIds.forEach((id) => {
        const tag = tags.find((t) => t.id === id);
        if (tag && tag.currentValue !== val) {
          onToggleValue(id);
        }
      });
    }
  };

  const handleAddNewTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim()) return;

    const validation = defaultDialect.validateAddress(newAddressStr);
    if (!validation.valid) {
      setAddressError(validation.error || 'Invalid address');
      return;
    }

    const parsedAddr = defaultDialect.parseAddress(newAddressStr);
    if (!parsedAddr) {
      setAddressError('Invalid address');
      return;
    }

    const newTag: IOTag = {
      id: `tag_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      symbol: newSymbol.trim().toUpperCase(),
      address: parsedAddr,
      dataType: newType,
      description: newDescription.trim(),
      currentValue: newType === 'BOOL' ? false : 0,
      isForced: false,
    };

    onAddTag(newTag);
    setNewSymbol('');
    setNewAddressStr('');
    setNewDescription('');
    setAddressError(null);
  };

  const selectedCount = selectedTagIds.size;
  const hasSelected = selectedCount > 0;
  const hasSelectedBools = selectedTags.some((t) => t.dataType === 'BOOL');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`flex-1 flex flex-col h-full overflow-hidden select-none ${
        theme === 'modern' ? 'bg-white text-slate-900' : 'bg-[#0a0a0c] text-slate-200'
      }`}
    >
      {/* Table Toolbar */}
      <div className={`p-3 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
        theme === 'modern' ? 'bg-[#f5f5f7] border-slate-200' : 'bg-[#111114] border-slate-800'
      }`}>
        {/* Left: Search & Filter */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Tag / Address..."
              className="pl-8 pr-3 py-1 bg-[#1a1a1e] border border-slate-700 rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-48 transition-colors"
            />
          </div>

          {/* Area filter chips */}
          <div className="flex items-center gap-1 bg-[#1a1a1e] p-0.5 rounded border border-slate-800 text-[11px] font-mono">
            {(['ALL', 'INPUT', 'OUTPUT', 'MEMORY', 'TIMER', 'COUNTER'] as const).map((area) => (
              <button
                key={area}
                onClick={() => setAreaFilter(area)}
                className={`relative px-2.5 py-0.5 rounded transition-all cursor-pointer ${
                  areaFilter === area
                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {area}
              </button>
            ))}
          </div>
        </div>

        {/* Right side: Bulk Action Buttons & Stats */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Bulk Force & Bulk Delete Toolbar Buttons */}
          <button
            onClick={() => handleBulkToggleForceAction()}
            disabled={!hasSelected}
            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
              hasSelected
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30 cursor-pointer shadow-xs active:scale-95'
                : 'bg-slate-800/40 text-slate-500 border border-slate-800 cursor-not-allowed'
            }`}
            title={hasSelected ? `Bulk Force toggle for ${selectedCount} selected tags` : 'Select tags using checkboxes to Bulk Force'}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Bulk Force {hasSelected ? `(${selectedCount})` : ''}</span>
          </button>

          <button
            onClick={handleBulkDelete}
            disabled={!hasSelected}
            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
              hasSelected
                ? 'bg-red-500/20 text-red-300 border border-red-500/50 hover:bg-red-600 hover:text-white cursor-pointer shadow-xs active:scale-95'
                : 'bg-slate-800/40 text-slate-500 border border-slate-800 cursor-not-allowed'
            }`}
            title={hasSelected ? `Bulk Delete ${selectedCount} selected tags` : 'Select tags using checkboxes to Bulk Delete'}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Bulk Delete {hasSelected ? `(${selectedCount})` : ''}</span>
          </button>

          {conflicts.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {conflicts.length} Conflict{conflicts.length !== 1 ? 's' : ''} ({conflicts[0].address})
              </span>
            </div>
          )}

          <div className="text-[11px] font-mono text-slate-500 px-2 py-0.5 rounded bg-[#1a1a1e] border border-slate-800">
            Total: <span className="text-slate-300 font-bold">{tags.length}</span>
            {hasSelected && <span className="text-blue-400 ml-1 font-bold">({selectedCount} sel)</span>}
          </div>
        </div>
      </div>

      {/* Floating / Sticky Bulk Action Bar when items are selected */}
      <AnimatePresence>
        {hasSelected && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="overflow-hidden bg-[#1a1a24] border-b border-blue-500/40"
          >
            <div className="px-4 py-2 flex items-center justify-between gap-3 text-xs flex-wrap shadow-lg">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/40 font-mono font-bold text-xs flex items-center gap-1">
                  <CheckSquare className="w-3.5 h-3.5" />
                  {selectedCount} Tag{selectedCount !== 1 ? 's' : ''} Selected
                </span>

                <button
                  onClick={handleClearSelection}
                  className="text-[11px] text-slate-400 hover:text-slate-200 underline cursor-pointer ml-1"
                >
                  Clear Selection
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Force Actions */}
                <div className="flex items-center gap-1 bg-[#111114] p-1 rounded border border-slate-700">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold px-1">
                    Force:
                  </span>
                  <button
                    onClick={() => handleBulkToggleForceAction()}
                    className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                    title="Invert Force state of all selected tags"
                  >
                    <Lock className="w-3 h-3" /> Toggle
                  </button>
                  <button
                    onClick={() => handleBulkToggleForceAction(true)}
                    className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 font-medium text-[11px] transition-colors cursor-pointer"
                    title="Lock / Force all selected tags"
                  >
                    Lock All
                  </button>
                  <button
                    onClick={() => handleBulkToggleForceAction(false)}
                    className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 font-medium text-[11px] transition-colors cursor-pointer"
                    title="Unlock / Release all force overrides"
                  >
                    Release All
                  </button>
                </div>

                {/* Boolean Value Set Actions */}
                {hasSelectedBools && (
                  <div className="flex items-center gap-1 bg-[#111114] p-1 rounded border border-slate-700">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold px-1">
                      Set Val:
                    </span>
                    <button
                      onClick={() => handleBulkSetBooleanValues(true)}
                      className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                      title="Set all selected BOOL tags to TRUE (1)"
                    >
                      <Zap className="w-3 h-3" /> TRUE (1)
                    </button>
                    <button
                      onClick={() => handleBulkSetBooleanValues(false)}
                      className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                      title="Set all selected BOOL tags to FALSE (0)"
                    >
                      <PowerOff className="w-3 h-3" /> FALSE (0)
                    </button>
                  </div>
                )}

                {/* Bulk Delete */}
                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1 rounded bg-red-600/20 text-red-300 border border-red-500/50 hover:bg-red-600 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
                  title="Delete all selected tags from project"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Bulk Delete ({selectedCount})</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Add Tag Bar */}
      <form
        onSubmit={handleAddNewTag}
        className={`px-3 py-2 border-b flex items-center gap-2 text-xs flex-wrap ${
          theme === 'modern' ? 'bg-[#fafafa] border-slate-200' : 'bg-[#141418] border-slate-800'
        }`}
      >
        <div className="font-bold text-slate-400 text-[10px] uppercase tracking-wider mr-1">
          + Add Tag:
        </div>

        <input
          type="text"
          placeholder="Symbol (e.g. START_PB)"
          value={newSymbol}
          onChange={(e) => setNewSymbol(e.target.value)}
          className="px-2.5 py-1 bg-[#1a1a1e] border border-slate-700 rounded text-xs text-slate-200 focus:border-blue-500 outline-none w-36 font-mono font-medium"
          required
        />

        <input
          type="text"
          placeholder="Address (e.g. I0.0, Q0.0)"
          value={newAddressStr}
          onChange={(e) => {
            setNewAddressStr(e.target.value);
            setAddressError(null);
          }}
          className={`px-2.5 py-1 bg-[#1a1a1e] border rounded text-xs text-slate-200 focus:border-blue-500 outline-none w-32 font-mono ${
            addressError ? 'border-red-500 text-red-300' : 'border-slate-700'
          }`}
          required
        />

        <select
          value={newType}
          onChange={(e) => setNewType(e.target.value as DataType)}
          className="px-2 py-1 bg-[#1a1a1e] border border-slate-700 rounded text-xs text-slate-200 focus:border-blue-500 outline-none font-mono"
        >
          <option value="BOOL">BOOL</option>
          <option value="INT">INT</option>
          <option value="WORD">WORD</option>
          <option value="DWORD">DWORD</option>
          <option value="REAL">REAL</option>
          <option value="TIMER">TIMER</option>
          <option value="COUNTER">COUNTER</option>
        </select>

        <input
          type="text"
          placeholder="Description (Optional)"
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          className="flex-1 min-w-[140px] px-2.5 py-1 bg-[#1a1a1e] border border-slate-700 rounded text-xs text-slate-200 focus:border-blue-500 outline-none"
        />

        <button
          type="submit"
          className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1 shrink-0 shadow-xs transition-all active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>

        {addressError && (
          <div className="w-full text-red-400 text-[11px] mt-1 font-mono">
            {addressError}
          </div>
        )}
      </form>

      {/* Main Table View */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className={`sticky top-0 z-10 text-[10px] font-mono uppercase tracking-wider ${
            theme === 'modern' 
              ? 'bg-slate-100 text-slate-600 border-b border-slate-200' 
              : 'bg-[#111114] text-slate-400 border-b border-slate-800'
          }`}>
            <tr>
              {/* Checkbox column */}
              <th className="p-2.5 pl-3 w-9 text-center">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={handleToggleSelectAllFiltered}
                  className="w-4 h-4 rounded border-slate-700 bg-[#1a1a1e] text-blue-600 focus:ring-0 cursor-pointer accent-blue-600"
                  title={allFilteredSelected ? 'Deselect All' : 'Select All Filtered Tags'}
                />
              </th>
              <th className="p-2.5">Symbol Name</th>
              <th className="p-2.5">Address</th>
              <th className="p-2.5">Data Type</th>
              <th className="p-2.5">Value (Live)</th>
              <th className="p-2.5">Force</th>
              <th className="p-2.5">Description</th>
              <th className="p-2.5 pr-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredTags.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-500 font-mono text-xs">
                  No I/O tags found matching filter
                </td>
              </tr>
            ) : (
              filteredTags.map((tag) => {
                const isConflict = conflictAddressSet.has(tag.address.rawString);
                const isBool = tag.dataType === 'BOOL';
                const isSelected = selectedTagIds.has(tag.id);
                const liveValue = tag.isForced && tag.forcedValue !== undefined ? tag.forcedValue : tag.currentValue;

                return (
                  <motion.tr
                    key={tag.id}
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={(e) => {
                      // If clicking row itself and not an interactive button/input, toggle selection
                      if (
                        (e.target as HTMLElement).tagName !== 'BUTTON' && 
                        (e.target as HTMLElement).tagName !== 'INPUT' &&
                        (e.target as HTMLElement).tagName !== 'SPAN'
                      ) {
                        handleToggleSelect(tag.id, e);
                      }
                    }}
                    className={`transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600/10 text-white'
                        : isConflict
                        ? 'bg-amber-500/10 hover:bg-amber-500/15'
                        : 'hover:bg-slate-800/40 text-slate-300'
                    }`}
                  >
                    {/* Multi-select Checkbox */}
                    <td className="p-2.5 pl-3 w-9 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleToggleSelect(tag.id, e as any)}
                        className="w-4 h-4 rounded border-slate-700 bg-[#1a1a1e] text-blue-600 focus:ring-0 cursor-pointer accent-blue-600"
                        title="Select tag for bulk action"
                      />
                    </td>

                    {/* Symbol */}
                    <td className="p-2.5 font-mono font-bold text-slate-200">
                      <span className="flex items-center gap-1.5">
                        {tag.symbol}
                        {isConflict && (
                          <span title="Address conflict" className="text-amber-400">
                            <AlertTriangle className="w-3 h-3" />
                          </span>
                        )}
                      </span>
                    </td>

                    {/* Address */}
                    <td className="p-2.5 font-mono">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        tag.address.area === 'INPUT'
                          ? 'bg-blue-950/60 text-blue-300 border border-blue-800/80'
                          : tag.address.area === 'OUTPUT'
                          ? 'bg-amber-950/60 text-amber-300 border border-amber-800/80'
                          : tag.address.area === 'TIMER'
                          ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/80'
                          : tag.address.area === 'COUNTER'
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/80'
                          : 'bg-[#1a1a1e] text-slate-300 border border-slate-700'
                      }`}>
                        {tag.address.rawString}
                      </span>
                    </td>

                    {/* Type */}
                    <td className="p-2.5 font-mono text-slate-400 text-[11px]">
                      {tag.dataType}
                    </td>

                    {/* Value */}
                    <td className="p-2.5" onClick={(e) => e.stopPropagation()}>
                      {isBool ? (
                        <button
                          onClick={() => onToggleValue(tag.id)}
                          className={`px-2.5 py-0.5 rounded font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            Boolean(liveValue)
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                              : 'bg-[#1a1a1e] text-slate-400 border border-slate-700 hover:text-slate-300'
                          }`}
                          title="Click to toggle value in simulation"
                        >
                          <span className={`w-2 h-2 rounded-full ${Boolean(liveValue) ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}></span>
                          <span>{Boolean(liveValue) ? 'TRUE (1)' : 'FALSE (0)'}</span>
                        </button>
                      ) : (
                        <span className="font-mono text-slate-200 font-semibold px-2 py-0.5 rounded bg-[#1a1a1e] border border-slate-800">
                          {String(liveValue)}
                        </span>
                      )}
                    </td>

                    {/* Force */}
                    <td className="p-2.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onToggleForce(tag.id)}
                        className={`p-1.5 rounded transition-all cursor-pointer ${
                          tag.isForced
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                            : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                        }`}
                        title={tag.isForced ? 'Forced value active (Click to release)' : 'Click to force value'}
                      >
                        {tag.isForced ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>
                    </td>

                    {/* Description */}
                    <td className="p-2.5 text-slate-400 max-w-[200px] truncate">
                      {tag.description || '-'}
                    </td>

                    {/* Delete Action */}
                    <td className="p-2.5 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onDeleteTag(tag.id)}
                        className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Delete Tag"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};
