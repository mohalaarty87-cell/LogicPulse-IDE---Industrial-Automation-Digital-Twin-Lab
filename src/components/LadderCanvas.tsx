import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
  Move,
  Activity,
  Gauge,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Radio,
  BookOpen,
  FolderPlus,
  ArrowDown
} from 'lucide-react';
import { 
  LadderRung, 
  LadderElement, 
  LadderElementType, 
  SimulationStatus, 
  ThemeStyle, 
  IOTag,
  LadderSnippet 
} from '../types/plc';

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
  scanCycleMs?: number;
  scanCount?: number;
  onInsertSnippet?: (snippet: LadderSnippet, targetIndex?: number) => void;
  onSaveRungAsSnippet?: (rungId: string) => void;
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
  scanCycleMs = 20,
  scanCount = 0,
  onInsertSnippet,
  onSaveRungAsSnippet,
}) => {
  const [zoom, setZoom] = useState(1);
  const [editingCommentRungId, setEditingCommentRungId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [dragOverDropIndex, setDragOverDropIndex] = useState<number | null>(null);
  
  // Power Flow Animation System States
  const [isFlowEnabled, setIsFlowEnabled] = useState(true);
  const [flowSpeed, setFlowSpeed] = useState<'1x' | '2x' | '0.5x'>('1x');
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [glowIntensity, setGlowIntensity] = useState<'high' | 'normal'>('high');

  // Drag and Drop Snippet handlers
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    if (dragOverDropIndex !== index) {
      setDragOverDropIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverDropIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverDropIndex(null);
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.type === 'LADDER_SNIPPET' && data.snippet) {
        onInsertSnippet?.(data.snippet, targetIndex);
      }
    } catch (err) {
      console.warn('Failed to parse dropped ladder snippet', err);
    }
  };

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
    const target = e.target as HTMLElement;
    const isInteractiveTag = target.closest('button') || target.closest('input') || target.closest('.group');
    
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

  // Global mouseup listener to prevent stuck dragging
  useEffect(() => {
    const handleGlobalUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleGlobalUp);
    return () => window.removeEventListener('mouseup', handleGlobalUp);
  }, []);

  // Keyboard shortcut: hold Space for pan mode
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

  // CSS classes for speed control
  const flowWireClass = useMemo(() => {
    if (!isFlowEnabled || !isSimRunning) return 'sim-flow-dormant';
    if (flowSpeed === '2x') return 'sim-flow-active sim-flow-active-fast';
    if (flowSpeed === '0.5x') return 'sim-flow-active sim-flow-active-slow';
    return 'sim-flow-active';
  }, [isFlowEnabled, isSimRunning, flowSpeed]);

  const flowElectronClass = useMemo(() => {
    if (flowSpeed === '2x') return 'sim-flow-electron sim-flow-electron-fast';
    if (flowSpeed === '0.5x') return 'sim-flow-electron sim-flow-electron-slow';
    return 'sim-flow-electron';
  }, [flowSpeed]);

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
      const branchConducting = Boolean(elem.powerPassed && isSimRunning);

      return (
        <div 
          key={elem.id} 
          onClick={handleElementClick}
          className={`ladder-element-enter relative p-2.5 rounded-lg border flex flex-col items-center gap-2 cursor-pointer transition-all duration-200 ${
            isSelected 
              ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-400 scale-[1.02]' 
              : 'border-neutral-700/60 bg-neutral-900/40 hover:border-neutral-500 hover:scale-[1.01]'
          } ${branchConducting ? 'border-purple-500/80 shadow-[0_0_14px_rgba(168,85,247,0.4)]' : ''}`}
        >
          {/* Main branch indicator label */}
          <div className="flex items-center justify-between w-full text-[9px] font-mono text-purple-400 uppercase">
            <span className="flex items-center gap-1 font-bold">
              <Zap className="w-2.5 h-2.5 text-purple-400" />
              <span>Branch (OR Latch)</span>
              {branchConducting && (
                <span className="text-[8px] bg-purple-500/20 text-purple-300 px-1 py-0.2 rounded border border-purple-500/40 animate-pulse">
                  FLOW ACTIVE
                </span>
              )}
            </span>
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

          {/* Sub Branch elements row with power conduit */}
          <div className={`flex items-center gap-4 bg-neutral-950/70 p-2 rounded-md border border-dashed transition-all relative ${
            branchConducting ? 'border-purple-500/60 shadow-inner' : 'border-purple-500/30'
          }`}>
            {subBranchElements.length === 0 ? (
              <span className="text-[10px] text-neutral-500 italic px-2">
                Empty Branch - Select to configure
              </span>
            ) : (
              subBranchElements.map((subElem, idx) => (
                <React.Fragment key={subElem.id}>
                  {idx > 0 && (
                    <div className="relative w-6 h-[2px] bg-purple-900/50">
                      {branchConducting && isFlowEnabled && (
                        <div className={`absolute inset-0 ${flowWireClass}`} />
                      )}
                    </div>
                  )}
                  {renderElement(subElem, rung, true)}
                </React.Fragment>
              ))
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
          className={`ladder-element-enter flex flex-col items-center bg-[#111114] p-2.5 rounded-lg border transition-all duration-200 cursor-pointer select-none relative ${
            isSelected
              ? 'border-blue-500 ring-2 ring-blue-500/50 scale-[1.02]'
              : 'border-slate-700 hover:border-slate-500 hover:scale-[1.01]'
          } ${isEnergized && isSimRunning ? 'border-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.6)] sim-magnetic-flux' : ''}`}
        >
          <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-blue-400 transition-colors">
            <Radio className="w-3 h-3 text-cyan-400" />
            <span>{elem.type} ({addr || sym || 'Timer'})</span>
          </div>
          <div className="w-24 bg-[#0a0a0c] border border-slate-800 rounded p-1.5 my-1 text-[10px] font-mono text-center transition-colors">
            <div className="text-slate-400">PT: {preset}ms</div>
            <div className={`font-bold transition-colors duration-150 ${isEnergized && isSimRunning ? 'text-emerald-400' : 'text-blue-300'}`}>
              ET: {elapsed}ms
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden relative">
              <div
                className={`h-full transition-all duration-100 ease-out ${isEnergized && isSimRunning ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-blue-500'}`}
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
          className={`ladder-element-enter flex flex-col items-center bg-[#111114] p-2.5 rounded-lg border transition-all duration-200 cursor-pointer select-none relative ${
            isSelected
              ? 'border-blue-500 ring-2 ring-blue-500/50 scale-[1.02]'
              : 'border-slate-700 hover:border-slate-500 hover:scale-[1.01]'
          } ${isEnergized && isSimRunning ? 'border-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.6)] sim-magnetic-flux' : ''}`}
        >
          <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-400 transition-colors">
            <Activity className="w-3 h-3 text-emerald-400" />
            <span>CTU ({addr || sym || 'Counter'})</span>
          </div>
          <div className="w-24 bg-[#0a0a0c] border border-slate-800 rounded p-1.5 my-1 text-[10px] font-mono text-center transition-colors">
            <div className="text-slate-400">PV: {preset}</div>
            <div className={`font-bold transition-colors duration-150 ${isEnergized && isSimRunning ? 'text-emerald-400' : 'text-emerald-300'}`}>
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
    const isConducting = isContact ? (isEnergized && isSimRunning) : (powerPassed && isSimRunning);

    return (
      <div
        key={elem.id}
        onClick={handleElementClick}
        className={`ladder-element-enter flex flex-col items-center px-2.5 py-1 rounded-lg transition-all duration-200 cursor-pointer select-none relative group ${
          isSelected
            ? 'bg-blue-600/15 ring-1 ring-blue-500 scale-105'
            : 'hover:bg-slate-800/40 hover:scale-[1.02]'
        }`}
      >
        {/* Address identifier at top */}
        <div className="flex items-center gap-1 mb-1">
          <span className={`font-mono text-xs font-bold transition-colors duration-200 ${
            isOutputArea || isCoil
              ? 'text-amber-400'
              : isInputArea
              ? 'text-blue-400'
              : 'text-slate-300'
          }`}>
            {addr || (isCoil ? 'Q0.0' : 'I0.0')}
          </span>
          {isSimRunning && isContact && isConducting && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
          )}
        </div>

        {/* Visual Symbol Graphic matching screenshots & Power Flow state */}
        {isContact && (
          <div className={`w-10 h-10 border-2 flex items-center justify-center relative rounded-md transition-all duration-200 ${
            theme === 'modern' ? 'bg-white' : 'bg-[#0a0a0c]'
          } ${
            isConducting
              ? 'border-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.7)] bg-emerald-500/20 text-emerald-400 scale-105'
              : isSelected
              ? 'border-blue-400 text-blue-400'
              : 'border-slate-600 text-slate-400 hover:border-slate-400'
          }`}>
            {/* Center contact conducting bars */}
            <div className={`w-[2px] h-4 transition-all duration-200 ${
              isConducting ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-slate-400'
            }`}></div>
            <div className={`w-4 h-full bg-transparent border-x-2 absolute transition-all duration-200 ${
              isConducting ? 'border-emerald-400 shadow-[0_0_6px_#34d399]' : 'border-slate-400'
            }`}></div>

            {/* If Normally Closed (NC), draw diagonal slash */}
            {elem.type === 'NC_CONTACT' && (
              <div className={`absolute w-full h-[2px] rotate-45 transition-colors duration-200 ${
                isConducting ? 'bg-emerald-400' : 'bg-slate-400'
              }`}></div>
            )}

            {/* Click to toggle hint in sim mode */}
            {isSimRunning && (
              <span 
                className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-black transition-all ${
                  isConducting 
                    ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse' 
                    : 'bg-slate-600 opacity-60'
                }`} 
                title={isConducting ? "Contact Closed (Passing Power)" : "Contact Open (Blocking Power - Click to Toggle)"}
              ></span>
            )}
          </div>
        )}

        {isCoil && (
          <div className={`w-10 h-10 border-2 rounded-full flex items-center justify-center font-mono font-bold text-xs transition-all duration-200 relative ${
            theme === 'modern' ? 'bg-white' : 'bg-[#0a0a0c]'
          } ${
            isEnergized && isSimRunning
              ? 'border-emerald-400 bg-emerald-500/25 text-emerald-300 shadow-[0_0_18px_rgba(52,211,153,0.85)] scale-105 sim-magnetic-flux'
              : isSelected
              ? 'border-blue-400 text-blue-400'
              : 'border-slate-600 text-slate-400 hover:border-slate-400'
          }`}>
            {elem.type === 'SET_COIL' && 'S'}
            {elem.type === 'RESET_COIL' && 'R'}
            {elem.type === 'COIL' && (isEnergized && isSimRunning ? '⚡' : '')}

            {/* Magnetic Actuation Ripple Rings when Coil is Energized */}
            {isEnergized && isSimRunning && (
              <div className="absolute -inset-1.5 rounded-full border border-emerald-400/40 animate-ping pointer-events-none"></div>
            )}
          </div>
        )}

        {/* Symbol / Tag description name at bottom */}
        <span className="font-mono text-[10px] text-slate-400 mt-1 max-w-[90px] truncate text-center font-medium transition-colors">
          {sym || (isCoil ? 'OUTPUT_COIL' : 'CONTACT')}
        </span>

        {/* Floating Quick Action Overlay when selected */}
        {isSelected && (
          <div className="absolute -top-9 flex items-center gap-1 bg-[#1a1a1e] border border-slate-700 shadow-2xl rounded-md px-1.5 py-0.5 z-30 animate-in fade-in zoom-in-95 duration-150">
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

  // Helper to render an animated power conduit wire segment
  const renderWireSegment = (isEnergized: boolean, widthClass = "w-8 sm:w-12") => {
    const active = isEnergized && isSimRunning;
    return (
      <div className={`relative ${widthClass} h-[3px] flex items-center transition-all duration-150`}>
        {/* Base Wire Conduit */}
        <div className={`w-full h-full rounded-full transition-all duration-200 ${
          active 
            ? flowWireClass
            : 'bg-slate-700 group-hover:bg-slate-600'
        }`}></div>

        {/* Traveling Electron Photon Particle Bead */}
        {active && isFlowEnabled && (
          <div className={flowElectronClass}></div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#131313]">
      {/* Top Header of Ladder Workspace & Simulation Flow HUD */}
      <div className={`h-11 px-4 border-b flex items-center justify-between shrink-0 font-bold text-xs select-none ${
        theme === 'modern' ? 'bg-white border-[#e5e5ea]' : 'bg-[#111114] border-slate-800 text-slate-300'
      }`}>
        {/* Title & Ladder Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isSimRunning ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse' : 'bg-blue-500'}`}></span>
            <span className="font-bold text-slate-200 text-xs tracking-wide">
              Main_OB1 (Ladder Editor)
            </span>
          </div>

          <span className="text-[10px] text-slate-400 font-mono px-2 py-0.5 rounded bg-[#1a1a1e] border border-slate-800">
            {rungs.length} Rungs
          </span>

          {/* Deterministic Scan Clock Synchronization Readout */}
          {isSimRunning && (
            <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-[10px] font-mono text-emerald-300">
              <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span>Scan: <strong>{scanCycleMs}ms</strong></span>
              <span className="text-slate-600">|</span>
              <span>Cycle #{scanCount}</span>
            </div>
          )}
        </div>

        {/* Simulation Flow Toolbar & View Controls */}
        <div className="flex items-center gap-2">
          {/* Power Flow Animation Toggle */}
          <div className="flex items-center gap-1 bg-[#1a1a1e] p-0.5 rounded border border-slate-800 text-xs">
            <button
              onClick={() => setIsFlowEnabled((f) => !f)}
              className={`px-2.5 py-1 rounded font-mono font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer ${
                isFlowEnabled && isSimRunning
                  ? 'bg-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                  : isFlowEnabled
                  ? 'bg-slate-800 text-emerald-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Toggle Power Conduction Real-time Flow Animation"
            >
              <Zap className={`w-3.5 h-3.5 ${isFlowEnabled && isSimRunning ? 'text-amber-300 animate-bounce' : 'text-slate-400'}`} />
              <span>Flow: {isFlowEnabled ? 'ON' : 'OFF'}</span>
            </button>

            {/* Flow Speed Selector */}
            {isFlowEnabled && (
              <div className="flex items-center border-l border-slate-700/60 pl-1">
                {(['0.5x', '1x', '2x'] as const).map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setFlowSpeed(spd)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                      flowSpeed === spd
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                    title={`Set Simulation Flow Animation Speed to ${spd}`}
                  >
                    {spd}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Conduction Trace Diagnostics Toggle */}
          <button
            onClick={() => setShowDiagnostics((d) => !d)}
            className={`px-2 py-1 rounded text-xs font-mono flex items-center gap-1 transition-all ${
              showDiagnostics
                ? 'bg-amber-600/90 text-white shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Toggle Live Circuit Conduction Diagnostics for each rung"
          >
            <Gauge className="w-3.5 h-3.5" />
            <span className="hidden lg:inline text-[11px]">Diagnostics</span>
          </button>

          <div className="w-[1px] h-4 bg-slate-800 mx-0.5"></div>

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
            <span className="text-[10px] font-mono text-slate-400 min-w-[34px] text-right">
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
          className="relative min-w-[840px] pb-16 transition-transform duration-100 ease-out"
        >
          {/* Left Power Rail (L+ 24V / Phase - RED) */}
          <div className="absolute top-0 bottom-0 left-8 w-[4px] bg-[#ef4444] shadow-[0_0_12px_rgba(239,68,68,0.6)] z-20 transition-colors">
            <div className="absolute -top-4 -left-3.5 text-[10px] font-mono font-bold text-red-300 bg-[#111114] px-1.5 py-0.5 rounded border border-red-800 shadow-lg flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping"></span>
              <span>L+ (24V)</span>
            </div>
          </div>

          {/* Right Power Rail (N / 0V - BLUE) */}
          <div className="absolute top-0 bottom-0 right-8 w-[4px] bg-[#3b82f6] shadow-[0_0_12px_rgba(59,130,246,0.6)] z-20 transition-colors">
            <div className="absolute -top-4 -right-3.5 text-[10px] font-mono font-bold text-blue-300 bg-[#111114] px-1.5 py-0.5 rounded border border-blue-800 shadow-lg flex items-center gap-1">
              <span>N (0V)</span>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            </div>
          </div>

          {/* Rung List with Smooth Mount / Modify Animations & Flow Conduits */}
          <div className="flex flex-col gap-6 pt-2">
            {rungs.map((rung, index) => {
              const isRungSelected = selectedRungId === rung.id;
              const isRungEnergized = Boolean(rung.isEnergized && isSimRunning);

              // Separate input elements from output coils
              const inputElements = rung.elements.filter(
                (e) => e.type !== 'COIL' && e.type !== 'SET_COIL' && e.type !== 'RESET_COIL'
              );
              const outputElements = rung.elements.filter(
                (e) => e.type === 'COIL' || e.type === 'SET_COIL' || e.type === 'RESET_COIL'
              );

              // Conduction breakdown for diagnostics
              const firstBrokenElem = inputElements.find((e) => !e.powerPassed);
              const isFullCircuit = isRungEnergized;

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
                  {/* Rung Comment & Diagnostics Header */}
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
                      <div className="flex items-center gap-3">
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditComment(rung);
                          }}
                          className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200 transition-colors"
                        >
                          <span className="font-mono text-[11px] text-slate-400 group-hover:text-slate-300 transition-colors font-semibold">
                            {rung.comment || `// Rung ${rung.number}`}
                          </span>
                          <Edit2 className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100 text-slate-400 transition-opacity" />
                        </div>

                        {/* Diagnostics Status Pill */}
                        {showDiagnostics && (
                          <div className={`px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1.5 transition-all ${
                            isFullCircuit
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                              : isSimRunning
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {isFullCircuit ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>Complete Power Conduction (100%)</span>
                              </>
                            ) : isSimRunning && firstBrokenElem ? (
                              <>
                                <AlertTriangle className="w-3 h-3 text-amber-400" />
                                <span>Open Circuit at [{firstBrokenElem.symbol || firstBrokenElem.address?.rawString || firstBrokenElem.type}]</span>
                              </>
                            ) : (
                              <span>Circuit Idle</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Rung Controls */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSaveRungAsSnippet?.(rung.id);
                        }}
                        className="px-2 py-0.5 rounded bg-purple-950/60 hover:bg-purple-900 text-[10px] text-purple-300 font-mono border border-purple-700/60 hover:border-purple-400 transition-colors flex items-center gap-1"
                        title="Save this rung & I/O tags as a reusable Library Snippet"
                      >
                        <BookOpen className="w-3 h-3" />
                        <span>Snippet</span>
                      </button>
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

                  {/* Drop Zone: Insert Above / Before Rung */}
                  <div
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`transition-all duration-200 ${
                      dragOverDropIndex === index
                        ? 'h-10 -my-1 mx-12 bg-purple-950/60 border-2 border-dashed border-purple-400 rounded-lg flex items-center justify-center gap-2 shadow-[0_0_16px_rgba(168,85,247,0.4)] z-30'
                        : 'h-0.5 opacity-0'
                    }`}
                  >
                    {dragOverDropIndex === index && (
                      <span className="text-xs font-mono font-bold text-purple-200 flex items-center gap-1.5 animate-pulse">
                        <ArrowDown className="w-3.5 h-3.5 text-purple-300" />
                        <span>Drop Snippet here to insert as Rung {index}</span>
                      </span>
                    )}
                  </div>

                  {/* Rung Horizontal Power Line & Elements Container */}
                  <div className="relative min-h-[82px] pl-12 pr-12 flex items-center">
                    {/* Rung Number Box on Left */}
                    <div className="absolute left-0 w-8 h-full flex items-center justify-center font-mono font-bold text-xs text-slate-500 border-r border-slate-800 select-none">
                      {rung.number}
                    </div>

                    {/* Interactive Multi-Segment Power Conduit Flow Layout */}
                    <div className="relative z-10 flex w-full justify-between items-center px-2">
                      {/* Left Contacts & Inputs Stream with Segmented Power Flow */}
                      <div className="flex items-center flex-wrap">
                        {/* Inlet Wire from Left Power Rail L+ (Always energized in sim mode) */}
                        {renderWireSegment(isSimRunning, "w-8 sm:w-10")}

                        {inputElements.map((elem, idx) => {
                          // Conduction power upstream entering this element
                          const powerEntering = idx === 0 ? isSimRunning : Boolean(inputElements[idx - 1].powerPassed && isSimRunning);
                          const powerLeaving = Boolean(elem.powerPassed && isSimRunning);

                          return (
                            <React.Fragment key={elem.id}>
                              {/* Render Ladder Element */}
                              {renderElement(elem, rung)}

                              {/* Inter-element connecting power conduit */}
                              {idx < inputElements.length - 1 && (
                                renderWireSegment(powerLeaving, "w-8 sm:w-12")
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>

                      {/* Bridge Conduit from Inputs Section to Output Coils Section */}
                      <div className="flex-1 mx-2 relative min-w-[24px]">
                        {(() => {
                          const bridgePower = inputElements.length > 0
                            ? Boolean(inputElements[inputElements.length - 1].powerPassed && isSimRunning)
                            : isSimRunning;
                          return renderWireSegment(bridgePower, "w-full");
                        })()}
                      </div>

                      {/* Right Output Coils & Return Path to N Rail */}
                      <div className="flex items-center ml-auto">
                        {outputElements.map((elem, idx) => {
                          const coilConducting = Boolean(elem.isEnergized && isSimRunning);

                          return (
                            <React.Fragment key={elem.id}>
                              {idx > 0 && renderWireSegment(coilConducting, "w-6 sm:w-8")}
                              {renderElement(elem, rung)}
                            </React.Fragment>
                          );
                        })}

                        {/* Outlet Wire to Right Neutral Rail (N) */}
                        {renderWireSegment(isRungEnergized, "w-8 sm:w-10")}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Bottom Drop Zone: Insert at End */}
            <div
              onDragOver={(e) => handleDragOver(e, rungs.length)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, rungs.length)}
              className={`transition-all duration-200 ${
                dragOverDropIndex === rungs.length
                  ? 'h-12 mx-12 my-2 bg-purple-950/60 border-2 border-dashed border-purple-400 rounded-lg flex items-center justify-center gap-2 shadow-[0_0_16px_rgba(168,85,247,0.4)] z-30'
                  : 'h-2 opacity-0'
              }`}
            >
              {dragOverDropIndex === rungs.length && (
                <span className="text-xs font-mono font-bold text-purple-200 flex items-center gap-1.5 animate-pulse">
                  <ArrowDown className="w-3.5 h-3.5 text-purple-300" />
                  <span>Drop Snippet here to append as Rung {rungs.length}</span>
                </span>
              )}
            </div>

            {/* Add Next Rung Prompt Button */}
            <div className="pl-12 pr-12 pt-1">
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
