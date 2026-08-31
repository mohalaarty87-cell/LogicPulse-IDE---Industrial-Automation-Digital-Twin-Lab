import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  ArrowRight, 
  Sparkles, 
  Edit2, 
  Check, 
  Zap, 
  Info,
  Hand,
  MousePointer,
  Move
} from 'lucide-react';
import { LadderRung, LadderElement, LadderElementType, SimulationStatus, ThemeStyle, IOTag } from '../types/plc';

interface LadderCanvasProps {
  rungs: LadderRung[];
  selectedElementId: string | null;
  selectedRungId: string | null;
  onSelectElement: (elementId: string, rungId: string) => void;
  onSelectRung: (rungId: string) => void;
  onToggleContactValue: (addressStr?: string, symbol?: string) => void;
  onDeleteElement: (elementId: string, rungId: string) => void;
  onMoveElement: (elementId: string, rungId: string, direction: 'left' | 'right') => void;
  onAddRung: () => void;
  onDeleteRung: (rungId: string) => void;
  onUpdateRungComment: (rungId: string, comment: string) => void;
  onAddElementToRung: (rungId: string, type: LadderElementType) => void;
  simStatus: SimulationStatus;
  theme: ThemeStyle;
  ioTags: IOTag[];
}

export const LadderCanvas: React.FC<LadderCanvasProps> = ({
  rungs,
  selectedElementId,
  selectedRungId,
  onSelectElement,
  onSelectRung,
  onToggleContactValue,
  onDeleteElement,
  onMoveElement,
  onAddRung,
  onDeleteRung,
  onUpdateRungComment,
  onAddElementToRung,
  simStatus,
  theme,
  ioTags,
}) => {
  const [zoom, setZoom] = useState(1);
  const [editingCommentRungId, setEditingCommentRungId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  
  // Drag-to-scroll (Pan) states
  const [isPanMode, setIsPanMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number }>({
    x: 0,
    y: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });

  const isSimRunning = simStatus === 'RUNNING' || simStatus === 'PAUSED' || simStatus === 'SINGLE_STEP';

  const handleZoomIn = () => setZoom((z) => Math.min(1.8, Math.round((z + 0.15) * 100) / 100));
  const handleZoomOut = () => setZoom((z) => Math.max(0.6, Math.round((z - 0.15) * 100) / 100));
  const handleResetZoom = () => setZoom(1);

  const startEditComment = (rung: LadderRung) => {
    setEditingCommentRungId(rung.id);
    setCommentText(rung.comment || '');
  };

  const saveComment = (rungId: string) => {
    onUpdateRungComment(rungId, commentText);
    setEditingCommentRungId(null);
  };

  // Helper to find associated tag value
  const getTagValue = (addrStr?: string, symbol?: string): boolean => {
    if (!addrStr && !symbol) return false;
    const found = ioTags.find(
      (t) => (t.symbol && symbol && t.symbol.toUpperCase() === symbol.toUpperCase()) ||
             (t.address.rawString && addrStr && t.address.rawString.toUpperCase() === addrStr.toUpperCase())
    );
    if (found) {
      return Boolean(found.isForced && found.forcedValue !== undefined ? found.forcedValue : found.currentValue);
    }
    return false;
  };

  // -------------------------------------------------------------
  // Drag-to-Scroll (Pan) Event Handlers
  // -------------------------------------------------------------
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only initiate drag-to-scroll if middle mouse button, or pan mode is active, or space/alt pressed,
    // or if the click is on the grid background canvas itself (not on buttons or inputs)
    const target = e.target as HTMLElement;
    const isInteractiveTag = target.closest('button') || target.closest('input') || target.closest('.group');
    
    // If middle click OR pan mode OR background click
    if (e.button === 1 || isPanMode || (!isInteractiveTag && e.button === 0)) {
      if (!scrollContainerRef.current) return;
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        scrollLeft: scrollContainerRef.current.scrollLeft,
        scrollTop: scrollContainerRef.current.scrollTop,
      };
      e.preventDefault();
    }
  }, [isPanMode]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !scrollContainerRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    scrollContainerRef.current.scrollLeft = dragStartRef.current.scrollLeft - dx;
    scrollContainerRef.current.scrollTop = dragStartRef.current.scrollTop - dy;
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Global mouseup / mouseleave listener to prevent stuck dragging
  useEffect(() => {
    const handleGlobalUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleGlobalUp);
    return () => window.removeEventListener('mouseup', handleGlobalUp);
  }, []);

  // Keyboard shortcut: hold Space or toggle pan mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !editingCommentRungId && (e.target as HTMLElement).tagName !== 'INPUT') {
        setIsPanMode(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsPanMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [editingCommentRungId]);

  // Render individual ladder element
  const renderElement = (elem: LadderElement, rung: LadderRung, isSubBranch = false) => {
    const isSelected = selectedElementId === elem.id;
    const isEnergized = Boolean(elem.isEnergized);
    const powerPassed = Boolean(elem.powerPassed);
    const addr = elem.address?.rawString || '';
    const sym = elem.symbol || '';
    const isInputArea = elem.address?.area === 'INPUT';
    const isOutputArea = elem.address?.area === 'OUTPUT';

    // In simulation mode, clicking contact toggles its tag value
    const handleElementClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isDragging) return;
      onSelectElement(elem.id, rung.id);
      if (isSimRunning && (elem.type === 'NO_CONTACT' || elem.type === 'NC_CONTACT')) {
        onToggleContactValue(addr, sym);
      }
    };

    if (elem.type === 'BRANCH') {
      const subBranchElements = elem.params?.subBranch || [];
      return (
        <div 
          key={elem.id} 
          onClick={handleElementClick}
          className={`ladder-element-enter relative p-2.5 rounded-lg border flex flex-col items-center gap-2 cursor-pointer transition-all duration-200 ${
            isSelected 
              ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-400 scale-[1.02]' 
              : 'border-neutral-700/60 bg-neutral-900/40 hover:border-neutral-500 hover:scale-[1.01]'
          }`}
        >
          {/* Main branch indicator label */}
          <div className="flex items-center justify-between w-full text-[9px] font-mono text-purple-400 uppercase">
            <span>Branch (OR Latch)</span>
            {isSelected && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteElement(elem.id, rung.id);
                }}
                className="text-red-400 hover:text-red-300 p-0.5 transition-transform hover:scale-110"
                title="Delete branch"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Sub Branch elements row */}
          <div className="flex items-center gap-4 bg-neutral-950/60 p-2 rounded-md border border-dashed border-purple-500/30 transition-colors">
            {subBranchElements.length === 0 ? (
              <span className="text-[10px] text-neutral-500 italic px-2">
                Empty Branch - Select to configure
              </span>
            ) : (
              subBranchElements.map((subElem) => renderElement(subElem, rung, true))
            )}
          </div>
        </div>
      );
    }

    if (elem.type === 'TON' || elem.type === 'TOF') {
      const elapsed = elem.params?.elapsedTimeMs || 0;
      const preset = elem.params?.presetTimeMs || 3000;
      const progressPercent = Math.min(100, Math.round((elapsed / preset) * 100));

      return (
        <div
          key={elem.id}
          onClick={handleElementClick}
          className={`ladder-element-enter flex flex-col items-center bg-[#111114] p-2.5 rounded-lg border transition-all duration-200 cursor-pointer select-none ${
            isSelected
              ? 'border-blue-500 ring-2 ring-blue-500/50 scale-[1.02]'
              : 'border-slate-700 hover:border-slate-500 hover:scale-[1.01]'
          } ${isEnergized ? 'border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.5)]' : ''}`}
        >
          <div className="text-[11px] font-mono font-bold text-blue-400 transition-colors">
            {elem.type} ({addr || sym || 'Timer'})
          </div>
          <div className="w-24 bg-[#0a0a0c] border border-slate-800 rounded p-1.5 my-1 text-[10px] font-mono text-center transition-colors">
            <div className="text-slate-400">PT: {preset}ms</div>
            <div className={`font-bold transition-colors duration-150 ${isEnergized ? 'text-emerald-400' : 'text-blue-300'}`}>
              ET: {elapsed}ms
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div
                className="bg-blue-500 h-full transition-all duration-100 ease-out"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 font-mono transition-colors">{sym}</span>
        </div>
      );
    }

    if (elem.type === 'CTU') {
      const count = elem.params?.currentCount || 0;
      const preset = elem.params?.presetCount || 5;

      return (
        <div
          key={elem.id}
          onClick={handleElementClick}
          className={`ladder-element-enter flex flex-col items-center bg-[#111114] p-2.5 rounded-lg border transition-all duration-200 cursor-pointer select-none ${
            isSelected
              ? 'border-blue-500 ring-2 ring-blue-500/50 scale-[1.02]'
              : 'border-slate-700 hover:border-slate-500 hover:scale-[1.01]'
          } ${isEnergized ? 'border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.5)]' : ''}`}
        >
          <div className="text-[11px] font-mono font-bold text-emerald-400 transition-colors">
            CTU ({addr || sym || 'Counter'})
          </div>
          <div className="w-24 bg-[#0a0a0c] border border-slate-800 rounded p-1.5 my-1 text-[10px] font-mono text-center transition-colors">
            <div className="text-slate-400">PV: {preset}</div>
            <div className={`font-bold transition-colors duration-150 ${isEnergized ? 'text-emerald-400' : 'text-emerald-300'}`}>
              CV: {count}
            </div>
          </div>
          <span className="text-[10px] text-slate-400 font-mono transition-colors">{sym}</span>
        </div>
      );
    }

    // Default Contacts & Coils
    const isContact = elem.type === 'NO_CONTACT' || elem.type === 'NC_CONTACT';
    const isCoil = elem.type === 'COIL' || elem.type === 'SET_COIL' || elem.type === 'RESET_COIL';

    return (
      <div
        key={elem.id}
        onClick={handleElementClick}
        className={`ladder-element-enter flex flex-col items-center px-3 py-1 rounded-lg transition-all duration-200 cursor-pointer select-none relative group ${
          isSelected
            ? 'bg-blue-600/15 ring-1 ring-blue-500 scale-105'
            : 'hover:bg-slate-800/40 hover:scale-[1.02]'
        }`}
      >
        {/* Address identifier at top */}
        <span className={`font-mono text-xs font-bold mb-1 transition-colors duration-200 ${
          isOutputArea || isCoil
            ? 'text-amber-400'
            : isInputArea
            ? 'text-blue-400'
            : 'text-slate-300'
        }`}>
          {addr || (isCoil ? 'Q0.0' : 'I0.0')}
        </span>

        {/* Visual Symbol Graphic matching screenshots */}
        {isContact && (
          <div className={`w-10 h-10 border-2 flex items-center justify-center relative rounded-md transition-all duration-200 ${
            theme === 'modern' ? 'bg-white' : 'bg-[#0a0a0c]'
          } ${
            isEnergized && isSimRunning
              ? 'border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)] bg-emerald-500/15 text-emerald-400 scale-105'
              : isSelected
              ? 'border-blue-400 text-blue-400'
              : 'border-slate-600 text-slate-400 hover:border-slate-400'
          }`}>
            {/* Center contact bars */}
            <div className={`w-[2px] h-4 transition-colors duration-200 ${
              isEnergized && isSimRunning ? 'bg-emerald-400' : 'bg-slate-400'
            }`}></div>
            <div className={`w-4 h-full bg-transparent border-x-2 absolute transition-colors duration-200 ${
              isEnergized && isSimRunning ? 'border-emerald-400' : 'border-slate-400'
            }`}></div>

            {/* If Normally Closed (NC), draw diagonal slash */}
            {elem.type === 'NC_CONTACT' && (
              <div className={`absolute w-full h-[2px] rotate-45 transition-colors duration-200 ${
                isEnergized && isSimRunning ? 'bg-emerald-400' : 'bg-slate-400'
              }`}></div>
            )}

            {/* Click to toggle hint in sim mode */}
            {isSimRunning && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-black shadow-[0_0_6px_#34d399] animate-pulse" title="Active in Simulation"></span>
            )}
          </div>
        )}

        {isCoil && (
          <div className={`w-10 h-10 border-2 rounded-full flex items-center justify-center font-mono font-bold text-xs transition-all duration-200 ${
            theme === 'modern' ? 'bg-white' : 'bg-[#0a0a0c]'
          } ${
            isEnergized && isSimRunning
              ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[0_0_16px_rgba(52,211,153,0.7)] scale-105'
              : isSelected
              ? 'border-blue-400 text-blue-400'
              : 'border-slate-600 text-slate-400 hover:border-slate-400'
          }`}>
            {elem.type === 'SET_COIL' && 'S'}
            {elem.type === 'RESET_COIL' && 'R'}
          </div>
        )}

        {/* Symbol / Tag description name at bottom */}
        <span className="font-mono text-[10px] text-slate-400 mt-1 max-w-[90px] truncate text-center font-medium transition-colors">
          {sym || (isCoil ? 'OUTPUT_COIL' : 'CONTACT')}
        </span>

        {/* Floating Quick Action Overlay when selected */}
        {isSelected && (
          <div className="absolute -top-9 flex items-center gap-1 bg-[#1a1a1e] border border-slate-700 shadow-2xl rounded-md px-1.5 py-0.5 z-20 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveElement(elem.id, rung.id, 'left');
              }}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
              title="Move element Left"
            >
              <ArrowLeft className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveElement(elem.id, rung.id, 'right');
              }}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
              title="Move element Right"
            >
              <ArrowRight className="w-3 h-3" />
            </button>
            <div className="w-[1px] h-3 bg-slate-700 mx-0.5"></div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteElement(elem.id, rung.id);
              }}
              className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-950/40 transition-colors"
              title="Delete element"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#131313]">
      {/* Top Header of Ladder Workspace */}
      <div className={`h-10 px-4 border-b flex items-center justify-between shrink-0 font-bold text-xs select-none ${
        theme === 'modern' ? 'bg-white border-[#e5e5ea]' : 'bg-[#111114] border-slate-800 text-slate-300'
      }`}>
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          <span className="font-bold text-slate-200 text-xs tracking-wide">
            Main_OB1 (Ladder Diagram Editor)
          </span>
          <span className="text-[10px] text-slate-500 font-mono px-1.5 py-0.5 rounded bg-[#1a1a1e] border border-slate-800">
            {rungs.length} Rungs
          </span>
        </div>

        {/* Zoom, Drag-to-Scroll and View controls */}
        <div className="flex items-center gap-2">
          {/* Pan / Drag-to-Scroll Mode Toggle */}
          <button
            onClick={() => setIsPanMode((p) => !p)}
            className={`px-2 py-1 rounded text-xs flex items-center gap-1.5 font-mono transition-all ${
              isPanMode
                ? 'bg-blue-600 text-white shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Toggle Drag-to-Scroll Pan Mode (or Hold Spacebar)"
          >
            <Hand className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium hidden sm:inline">
              {isPanMode ? 'Pan: ON' : 'Pan'}
            </span>
          </button>

          <div className="w-[1px] h-4 bg-slate-800 mx-0.5"></div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Reset Zoom (100%)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-slate-400 min-w-[38px] text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Main Ladder Diagram Canvas Area with Interactive Drag-to-Scroll */}
      <div 
        ref={scrollContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={`flex-1 relative overflow-auto p-6 select-none transition-colors duration-300 ${
          isDragging
            ? 'cursor-grabbing'
            : isPanMode
            ? 'cursor-grab'
            : 'cursor-default'
        } ${
          theme === 'modern'
            ? 'ladder-grid-modern bg-[#f9f9fb]'
            : theme === 'legacy'
            ? 'ladder-grid-legacy bg-[#ffffff]'
            : theme === 'cyberpunk'
            ? 'ladder-grid-cyber bg-[#07070b]'
            : 'ladder-grid-industrial bg-[#050507]'
        }`}
      >
        {/* Container with Zoom transform */}
        <div 
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
          className="relative min-w-[780px] pb-16 transition-transform duration-100 ease-out"
        >
          {/* Left Power Rail (L+ 24V / Phase - RED) */}
          <div className="absolute top-0 bottom-0 left-8 w-[3px] bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.4)] z-10 transition-colors">
            <div className="absolute -top-4 -left-3 text-[9px] font-mono font-bold text-red-400 bg-[#111114] px-1.5 py-0.5 rounded border border-red-900/60 shadow-md">
              L+
            </div>
          </div>

          {/* Right Power Rail (N / 0V - BLUE) */}
          <div className="absolute top-0 bottom-0 right-8 w-[3px] bg-[#3b82f6] shadow-[0_0_8px_rgba(59,130,246,0.4)] z-10 transition-colors">
            <div className="absolute -top-4 -right-3 text-[9px] font-mono font-bold text-blue-400 bg-[#111114] px-1.5 py-0.5 rounded border border-blue-900/60 shadow-md">
              N
            </div>
          </div>

          {/* Rung List with Smooth Mount / Modify Animations */}
          <div className="flex flex-col gap-6 pt-2">
            {rungs.map((rung, index) => {
              const isRungSelected = selectedRungId === rung.id;
              const isRungEnergized = Boolean(rung.isEnergized && isSimRunning);

              return (
                <div
                  key={rung.id}
                  onClick={() => onSelectRung(rung.id)}
                  className={`ladder-rung-enter relative flex flex-col rounded-lg transition-all duration-200 group ${
                    isRungSelected
                      ? 'bg-slate-900/40 ring-1 ring-blue-500 shadow-md'
                      : 'hover:bg-slate-900/20'
                  }`}
                >
                  {/* Rung Comment Header */}
                  <div className="pl-12 pr-12 pb-1.5 flex items-center justify-between text-xs text-slate-400">
                    {editingCommentRungId === rung.id ? (
                      <div className="flex items-center gap-2 w-full animate-in fade-in duration-150">
                        <input
                          type="text"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveComment(rung.id)}
                          placeholder="Add rung comment or description..."
                          className="flex-1 px-2.5 py-1 bg-[#1a1a1e] border border-blue-500 rounded text-xs text-slate-200 outline-none shadow-inner"
                          autoFocus
                        />
                        <button
                          onClick={() => saveComment(rung.id)}
                          className="p-1 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditComment(rung);
                        }}
                        className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200 transition-colors"
                      >
                        <span className="font-mono text-[11px] text-slate-500 group-hover:text-slate-400 transition-colors">
                          {rung.comment || `// Rung ${rung.number}`}
                        </span>
                        <Edit2 className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100 text-slate-400 transition-opacity" />
                      </div>
                    )}

                    {/* Rung Controls */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddElementToRung(rung.id, 'NO_CONTACT');
                        }}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-blue-400 font-mono border border-slate-700 transition-colors hover:border-blue-500"
                        title="Add NO Contact to Rung"
                      >
                        + Contact
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddElementToRung(rung.id, 'COIL');
                        }}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-amber-400 font-mono border border-slate-700 transition-colors hover:border-amber-500"
                        title="Add Coil to Rung"
                      >
                        + Coil
                      </button>
                      {rungs.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteRung(rung.id);
                          }}
                          className="p-1 rounded text-red-400 hover:bg-red-500/20 transition-colors"
                          title="Delete Rung"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Rung Horizontal Power Line & Elements Container */}
                  <div className="relative min-h-[78px] pl-12 pr-12 flex items-center">
                    {/* Rung Number Box on Left */}
                    <div className="absolute left-0 w-8 h-full flex items-center justify-center font-mono font-bold text-xs text-slate-500 border-r border-slate-800 select-none">
                      {rung.number}
                    </div>

                    {/* Continuous Wire Line across the rung */}
                    <div className={`absolute top-1/2 left-8 right-8 h-[2px] -translate-y-1/2 z-0 transition-all duration-200 ${
                      isRungEnergized
                        ? 'energized-wire'
                        : 'bg-slate-700 group-hover:bg-slate-600'
                    }`}></div>

                    {/* Logic Elements along the rung */}
                    <div className="relative z-10 flex w-full justify-between items-center px-4">
                      {/* Left Contacts Section */}
                      <div className="flex items-center gap-4 flex-wrap">
                        {rung.elements
                          .filter((e) => e.type !== 'COIL' && e.type !== 'SET_COIL' && e.type !== 'RESET_COIL')
                          .map((elem) => renderElement(elem, rung))}
                      </div>

                      {/* Right Coils Section */}
                      <div className="flex items-center gap-4 ml-auto">
                        {rung.elements
                          .filter((e) => e.type === 'COIL' || e.type === 'SET_COIL' || e.type === 'RESET_COIL')
                          .map((elem) => renderElement(elem, rung))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add Next Rung Prompt Button */}
            <div className="pl-12 pr-12 pt-2">
              <button
                onClick={onAddRung}
                className="w-full py-2.5 rounded-lg border border-dashed border-slate-700 hover:border-blue-500 hover:bg-slate-800/40 text-slate-400 hover:text-blue-400 transition-all duration-200 flex items-center justify-center gap-2 text-xs font-bold hover:scale-[1.005]"
              >
                <Plus className="w-4 h-4" />
                <span>Add Ladder Rung (Rung {rungs.length})</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
