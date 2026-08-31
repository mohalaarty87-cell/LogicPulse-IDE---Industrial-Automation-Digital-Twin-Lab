import React, { useState } from 'react';
import { 
  FolderOpen, 
  Workflow, 
  Table2, 
  BookOpen, 
  Network, 
  Settings, 
  Terminal, 
  Box, 
  Plus, 
  Trash2, 
  Cpu, 
  Layers, 
  Search, 
  ChevronRight, 
  ChevronDown, 
  FileCode2, 
  HardDrive, 
  Zap, 
  Server, 
  Radio, 
  ShieldCheck,
  CircleDot,
  Disc,
  Circle,
  CheckCircle2,
  XCircle,
  GitFork,
  Timer,
  TimerOff,
  PlusCircle,
  Sparkles,
  Sliders,
  PanelLeftClose,
  PanelLeft,
  ChevronLeft
} from 'lucide-react';
import { 
  ActiveSideNav, 
  ThemeStyle, 
  LadderElementType, 
  ProjectFile, 
  IOTag, 
  SimulationStatus,
  LadderRung 
} from '../types/plc';

interface LeftSidebarPanelProps {
  activeNav: ActiveSideNav;
  project: ProjectFile;
  theme: ThemeStyle;
  simStatus: SimulationStatus;
  scanTimeMs: number;
  isOpen: boolean;
  onToggleOpen: () => void;
  panelWidth: number;
  onChangeWidth?: (width: number) => void;
  onAddElement: (type: LadderElementType) => void;
  onAddRung: () => void;
  onSelectNav: (nav: ActiveSideNav) => void;
  onSelectRung?: (rungId: string) => void;
  selectedRungId?: string | null;
  onToggleTagValue?: (addressStr?: string, symbol?: string) => void;
  onToggleForce?: (tagId: string) => void;
  onUpdatePLCConfig?: (config: { dialect: string; scanCycleMs: number; cpuModel: string }) => void;
  onLoadTemplateLogic?: (templateName: string) => void;
}

export const LeftSidebarPanel: React.FC<LeftSidebarPanelProps> = ({
  activeNav,
  project,
  theme,
  simStatus,
  scanTimeMs,
  isOpen,
  onToggleOpen,
  panelWidth,
  onChangeWidth,
  onAddElement,
  onAddRung,
  onSelectNav,
  onSelectRung,
  selectedRungId,
  onToggleTagValue,
  onToggleForce,
  onUpdatePLCConfig,
  onLoadTemplateLogic,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    program: true,
    blocks: true,
    io: true,
    hardware: true,
  });

  const toggleFolder = (folder: string) => {
    setExpandedFolders((prev) => ({ ...prev, [folder]: !prev[folder] }));
  };

  const tools: { type: LadderElementType; name: string; subtitle: string; icon: React.ReactNode; color: string; badge: string }[] = [
    {
      type: 'NO_CONTACT',
      name: 'NO Contact',
      subtitle: 'Normally Open (Examine ON / 1)',
      icon: <CircleDot className="w-4 h-4 text-blue-400" />,
      color: 'border-blue-500/30 hover:border-blue-400',
      badge: 'Bit Logic',
    },
    {
      type: 'NC_CONTACT',
      name: 'NC Contact',
      subtitle: 'Normally Closed (Examine OFF / 0)',
      icon: <Disc className="w-4 h-4 text-blue-400" />,
      color: 'border-blue-500/30 hover:border-blue-400',
      badge: 'Bit Logic',
    },
    {
      type: 'COIL',
      name: 'Standard Coil',
      subtitle: 'Output Coil (Q0.0 / M0.0)',
      icon: <Circle className="w-4 h-4 text-amber-400" />,
      color: 'border-amber-500/30 hover:border-amber-400',
      badge: 'Output',
    },
    {
      type: 'SET_COIL',
      name: 'Set Coil (S)',
      subtitle: 'Latches output to TRUE',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
      color: 'border-emerald-500/30 hover:border-emerald-400',
      badge: 'Latch',
    },
    {
      type: 'RESET_COIL',
      name: 'Reset Coil (R)',
      subtitle: 'Unlatches output to FALSE',
      icon: <XCircle className="w-4 h-4 text-rose-400" />,
      color: 'border-rose-500/30 hover:border-rose-400',
      badge: 'Latch',
    },
    {
      type: 'BRANCH',
      name: 'OR Branch (Latch)',
      subtitle: 'Parallel seal-in circuit',
      icon: <GitFork className="w-4 h-4 text-purple-400" />,
      color: 'border-purple-500/30 hover:border-purple-400',
      badge: 'Branch',
    },
    {
      type: 'TON',
      name: 'TON Timer',
      subtitle: 'On-Delay Timer (PT ms)',
      icon: <Timer className="w-4 h-4 text-cyan-400" />,
      color: 'border-cyan-500/30 hover:border-cyan-400',
      badge: 'Timer',
    },
    {
      type: 'TOF',
      name: 'TOF Timer',
      subtitle: 'Off-Delay Timer (PT ms)',
      icon: <TimerOff className="w-4 h-4 text-cyan-400" />,
      color: 'border-cyan-500/30 hover:border-cyan-400',
      badge: 'Timer',
    },
    {
      type: 'CTU',
      name: 'CTU Counter',
      subtitle: 'Up Counter on pulse',
      icon: <PlusCircle className="w-4 h-4 text-teal-400" />,
      color: 'border-teal-500/30 hover:border-teal-400',
      badge: 'Counter',
    },
  ];

  const libraryTemplates = [
    {
      id: 'dol_starter',
      name: 'Motor Starter (DOL)',
      desc: 'Direct-on-line start/stop with seal-in latch and overload safety NC contact',
      category: 'Motor Control',
    },
    {
      id: 'conveyor_sort',
      name: 'Conveyor Sorter & Ejector',
      desc: 'Pneumatic diverter trigger via optical photoelectric sensor and counter',
      category: 'Material Handling',
    },
    {
      id: 'traffic_lights',
      name: 'Traffic Signal Sequencer',
      desc: 'Cascading TON timers for Red / Yellow / Green automated cycle',
      category: 'Sequencing',
    },
    {
      id: 'tank_level',
      name: 'Pump Level Controller',
      desc: 'Dual float switch pump fill logic with high-level alarm buzzer',
      category: 'Process Control',
    },
  ];

  if (!isOpen) {
    return (
      <aside className={`w-8 shrink-0 flex flex-col items-center py-2 border-r transition-all select-none ${
        theme === 'modern'
          ? 'bg-white border-[#e5e5ea]'
          : 'bg-[#111114] border-slate-800'
      }`}>
        <button
          onClick={onToggleOpen}
          className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Expand Left Panel"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside 
      style={{ width: `${panelWidth}px` }}
      className={`shrink-0 flex flex-col border-r select-none overflow-hidden transition-all duration-200 ${
        theme === 'modern'
          ? 'bg-[#f8f9fa] border-[#e5e5ea] text-[#1d1d1f]'
          : theme === 'legacy'
          ? 'bg-[#ece9d8] border-[#808080] text-black win-border-outset text-xs'
          : theme === 'cyberpunk'
          ? 'bg-[#0b0b12] border-[#00ffff]/20 text-[#e5e2e1]'
          : 'bg-[#111114] border-slate-800 text-slate-300'
      }`}
    >
      {/* Panel Header */}
      <div className={`h-10 px-3 border-b flex items-center justify-between shrink-0 font-bold text-xs ${
        theme === 'modern' ? 'bg-white border-[#e5e5ea]' : 'bg-[#141418] border-slate-800 text-slate-300'
      }`}>
        <div className="flex items-center gap-2">
          {activeNav === 'toolbox' && <Workflow className="w-3.5 h-3.5 text-blue-400" />}
          {activeNav === 'project' && <FolderOpen className="w-3.5 h-3.5 text-amber-400" />}
          {activeNav === 'variables' && <Table2 className="w-3.5 h-3.5 text-emerald-400" />}
          {activeNav === 'twin3d' && <Box className="w-3.5 h-3.5 text-indigo-400" />}
          {activeNav === 'library' && <BookOpen className="w-3.5 h-3.5 text-purple-400" />}
          {activeNav === 'network' && <Network className="w-3.5 h-3.5 text-cyan-400" />}
          {activeNav === 'settings' && <Settings className="w-3.5 h-3.5 text-slate-400" />}
          {activeNav === 'console' && <Terminal className="w-3.5 h-3.5 text-emerald-400" />}
          <span className="capitalize tracking-wide font-semibold text-xs text-slate-200">
            {activeNav === 'toolbox' && 'Instruction Toolbox'}
            {activeNav === 'project' && 'Project Explorer'}
            {activeNav === 'variables' && 'I/O Tags & Memory'}
            {activeNav === 'twin3d' && 'Digital Twin 3D'}
            {activeNav === 'library' && 'Standard Logic Library'}
            {activeNav === 'network' && 'Fieldbus & Protocols'}
            {activeNav === 'settings' && 'PLC Hardware Settings'}
            {activeNav === 'console' && 'Diagnostic Console'}
          </span>
        </div>

        {/* Panel controls (width & collapse) */}
        <div className="flex items-center gap-1">
          {onChangeWidth && (
            <div className="flex items-center bg-slate-800/80 rounded px-1 text-[10px] font-mono text-slate-400 mr-1">
              <button 
                onClick={() => onChangeWidth(260)} 
                className={`px-1 py-0.5 hover:text-white ${panelWidth === 260 ? 'text-blue-400 font-bold' : ''}`}
                title="Compact Width (260px)"
              >
                S
              </button>
              <button 
                onClick={() => onChangeWidth(300)} 
                className={`px-1 py-0.5 hover:text-white ${panelWidth === 300 ? 'text-blue-400 font-bold' : ''}`}
                title="Standard Width (300px)"
              >
                M
              </button>
              <button 
                onClick={() => onChangeWidth(350)} 
                className={`px-1 py-0.5 hover:text-white ${panelWidth === 350 ? 'text-blue-400 font-bold' : ''}`}
                title="Wide Width (350px)"
              >
                L
              </button>
            </div>
          )}
          <button
            onClick={onToggleOpen}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Collapse Sidebar"
          >
            <PanelLeftClose className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Dynamic Content Body based on selected Tab */}
      <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-3">
        {/* VIEW 1: TOOLBOX */}
        {activeNav === 'toolbox' && (
          <>
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Logic Elements ({tools.length})
              </span>
              <button
                onClick={onAddRung}
                className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1 transition-all"
              >
                <Plus className="w-3 h-3" /> + Rung
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              {tools.map((tool) => (
                <button
                  key={tool.type}
                  onClick={() => onAddElement(tool.type)}
                  className={`p-2 rounded-md border text-left flex items-center justify-between transition-all cursor-pointer group bg-[#16161a] border-slate-800 hover:border-blue-500 hover:bg-slate-800/60 shadow-xs`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1 rounded bg-[#0f0f12] border border-slate-800 group-hover:border-slate-600 transition-colors">
                      {tool.icon}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-xs text-slate-200 group-hover:text-blue-300 truncate">
                        {tool.name}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate">
                        {tool.subtitle}
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60 shrink-0 ml-1">
                    {tool.badge}
                  </span>
                </button>
              ))}
            </div>

            {/* Quick insert instructions */}
            <div className="mt-auto p-2.5 rounded-lg bg-blue-950/20 border border-blue-900/40 text-[11px] text-slate-300">
              <span className="font-bold text-blue-400 block mb-0.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Quick Add Tip
              </span>
              Click any element above to append it directly into the active selected ladder rung.
            </div>
          </>
        )}

        {/* VIEW 2: PROJECT TREE EXPLORER */}
        {activeNav === 'project' && (
          <div className="flex flex-col gap-2 font-mono text-xs">
            {/* Search filter */}
            <div className="relative mb-1">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search project tree..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1 bg-[#16161a] border border-slate-800 rounded text-xs text-slate-200 outline-none focus:border-blue-500"
              />
            </div>

            {/* Tree nodes */}
            <div className="flex flex-col gap-1 text-[11px]">
              {/* PLC CPU Node */}
              <div 
                onClick={() => toggleFolder('hardware')}
                className="flex items-center gap-1.5 p-1.5 rounded hover:bg-slate-800/60 cursor-pointer text-slate-300"
              >
                {expandedFolders.hardware ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
                <Cpu className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-semibold">{project.plc.cpuModel || 'PLC_1 [CPU 1214C DC/DC/DC]'}</span>
              </div>

              {expandedFolders.hardware && (
                <div className="pl-6 flex flex-col gap-1 border-l border-slate-800 ml-3">
                  {/* Program blocks */}
                  <div 
                    onClick={() => toggleFolder('blocks')}
                    className="flex items-center gap-1.5 p-1 rounded hover:bg-slate-800/60 cursor-pointer text-slate-400"
                  >
                    {expandedFolders.blocks ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
                    <FolderOpen className="w-3 h-3 text-amber-400" />
                    <span>Program Blocks</span>
                  </div>

                  {expandedFolders.blocks && (
                    <div className="pl-5 flex flex-col gap-0.5 border-l border-slate-800 ml-2">
                      <div 
                        onClick={() => onSelectNav('toolbox')}
                        className="flex items-center gap-1.5 p-1 rounded bg-blue-950/40 text-blue-300 font-semibold cursor-pointer border border-blue-800/40"
                      >
                        <FileCode2 className="w-3 h-3 text-blue-400" />
                        <span>Main [OB1]</span>
                        <span className="ml-auto text-[9px] bg-blue-600/30 px-1 rounded text-blue-300">
                          {project.ladder.length} rungs
                        </span>
                      </div>

                      {project.ladder.map((rung) => (
                        <div
                          key={rung.id}
                          onClick={() => {
                            onSelectNav('toolbox');
                            onSelectRung?.(rung.id);
                          }}
                          className={`pl-5 py-0.5 text-[10px] cursor-pointer rounded flex items-center justify-between ${
                            selectedRungId === rung.id ? 'text-blue-400 font-bold bg-slate-800/80' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span>Rung {rung.number}</span>
                          <span className="text-[9px] text-slate-500">{rung.comment ? rung.comment.slice(0, 14) : ''}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* PLC Tags folder */}
                  <div 
                    onClick={() => onSelectNav('variables')}
                    className="flex items-center gap-1.5 p-1 rounded hover:bg-slate-800/60 cursor-pointer text-slate-400"
                  >
                    <Table2 className="w-3 h-3 text-emerald-400" />
                    <span>PLC Tag Table ({project.ioMap.length})</span>
                  </div>

                  {/* 3D Digital Twin model */}
                  <div 
                    onClick={() => onSelectNav('twin3d')}
                    className="flex items-center gap-1.5 p-1 rounded hover:bg-slate-800/60 cursor-pointer text-slate-400"
                  >
                    <Box className="w-3 h-3 text-indigo-400" />
                    <span>Digital Twin Simulation</span>
                  </div>
                </div>
              )}
            </div>

            {/* Project metadata footer */}
            <div className="mt-4 p-2 rounded bg-[#16161a] border border-slate-800 text-[10px] text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Project Name:</span>
                <span className="font-semibold text-slate-200">{project.project.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Dialect:</span>
                <span className="text-blue-400 font-mono">{project.plc.dialect}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Tags:</span>
                <span className="text-slate-200">{project.ioMap.length}</span>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: VARIABLES OVERVIEW */}
        {activeNav === 'variables' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Configured I/O Tags
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                {project.ioMap.length} Tags
              </span>
            </div>

            <div className="flex flex-col gap-1 max-h-[420px] overflow-y-auto pr-1">
              {project.ioMap.map((tag) => {
                const isForced = Boolean(tag.isForced);
                const val = Boolean(isForced && tag.forcedValue !== undefined ? tag.forcedValue : tag.currentValue);
                const isInput = tag.address.area === 'INPUT';

                return (
                  <div
                    key={tag.id}
                    className="p-1.5 rounded bg-[#16161a] border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition-colors"
                  >
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-mono text-[10px] font-bold ${isInput ? 'text-blue-400' : 'text-amber-400'}`}>
                          {tag.address.rawString}
                        </span>
                        <span className="font-semibold text-slate-200 truncate text-[11px]">
                          {tag.symbol}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-500 truncate">
                        {tag.description || 'PLC Variable'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onToggleTagValue?.(tag.address.rawString, tag.symbol)}
                        className={`w-6 h-5 rounded font-mono text-[10px] font-bold transition-all ${
                          val 
                            ? 'bg-emerald-500 text-black shadow-[0_0_8px_rgba(16,185,129,0.5)]' 
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                        title="Click to toggle tag value"
                      >
                        {val ? '1' : '0'}
                      </button>

                      {onToggleForce && (
                        <button
                          onClick={() => onToggleForce(tag.id)}
                          className={`px-1 py-0.5 rounded text-[8px] font-mono uppercase transition-colors ${
                            isForced ? 'bg-amber-600 text-white font-bold' : 'text-slate-500 hover:text-slate-300'
                          }`}
                          title="Toggle software force"
                        >
                          {isForced ? 'FRC' : 'F'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 4: DIGITAL TWIN CONTROLS */}
        {activeNav === 'twin3d' && (
          <div className="flex flex-col gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-indigo-950/20 border border-indigo-800/40 text-[11px] text-slate-300 space-y-2">
              <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                <Box className="w-3.5 h-3.5 text-indigo-400" /> Digital Twin Physics Scene
              </span>
              <p className="text-[10px] text-slate-400">
                Live 3D factory cell coupled to PLC scan cycle via real-time rigid-body physics.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                Connected Actuators & Sensors
              </span>

              <div className="p-2 rounded bg-[#16161a] border border-slate-800 flex justify-between items-center text-[11px]">
                <span className="text-slate-300">Conveyor Drive Motor:</span>
                <span className="font-mono text-amber-400 font-bold">Q0.0 (MOTOR_OUT)</span>
              </div>
              <div className="p-2 rounded bg-[#16161a] border border-slate-800 flex justify-between items-center text-[11px]">
                <span className="text-slate-300">Pneumatic Sorter Pusher:</span>
                <span className="font-mono text-amber-400 font-bold">Q0.1 (PUSHER_SOL)</span>
              </div>
              <div className="p-2 rounded bg-[#16161a] border border-slate-800 flex justify-between items-center text-[11px]">
                <span className="text-slate-300">Optical Sensor (Diverter):</span>
                <span className="font-mono text-blue-400 font-bold">I0.2 (PHOTO_SENSOR)</span>
              </div>
              <div className="p-2 rounded bg-[#16161a] border border-slate-800 flex justify-between items-center text-[11px]">
                <span className="text-slate-300">Exit End Sensor:</span>
                <span className="font-mono text-blue-400 font-bold">I0.3 (EXIT_SENSOR)</span>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 5: COMPONENT LIBRARY */}
        {activeNav === 'library' && (
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
              Industrial Logic Templates
            </span>
            <div className="flex flex-col gap-2">
              {libraryTemplates.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-lg bg-[#16161a] border border-slate-800 hover:border-purple-500/60 transition-all flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-purple-300">{item.name}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-950/60 text-purple-400 border border-purple-800/40">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    {item.desc}
                  </p>
                  <button
                    onClick={() => onLoadTemplateLogic?.(item.id)}
                    className="mt-1 w-full py-1 rounded bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/40 text-purple-300 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Load Logic Pattern
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 6: NETWORK & PROTOCOLS */}
        {activeNav === 'network' && (
          <div className="flex flex-col gap-2 text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
              Industrial Communications
            </span>
            <div className="p-2.5 rounded-lg bg-[#16161a] border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-400 flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5" /> Modbus TCP Server
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Port:</span>
                  <span className="text-slate-200">502</span>
                </div>
                <div className="flex justify-between">
                  <span>Holding Registers:</span>
                  <span className="text-slate-200">40001 - 40128</span>
                </div>
                <div className="flex justify-between">
                  <span>Coils:</span>
                  <span className="text-slate-200">00001 - 00064</span>
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#16161a] border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-400 flex items-center gap-1">
                  <Server className="w-3.5 h-3.5" /> PROFINET IO Device
                </span>
                <span className="text-[9px] font-mono px-1 bg-blue-950 text-blue-300 rounded border border-blue-800">
                  Ready
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Device Name:</span>
                  <span className="text-slate-200">plc-station-01</span>
                </div>
                <div className="flex justify-between">
                  <span>Cycle Reduction:</span>
                  <span className="text-slate-200">1 ms</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 7: HARDWARE & SETTINGS */}
        {activeNav === 'settings' && (
          <div className="flex flex-col gap-3 text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
              PLC Hardware Configuration
            </span>

            <div className="p-2.5 rounded-lg bg-[#16161a] border border-slate-800 space-y-2">
              <label className="text-[10px] text-slate-400 uppercase font-semibold">Address Dialect</label>
              <select
                value={project.plc.dialect}
                onChange={(e) => {
                  onUpdatePLCConfig?.({
                    ...project.plc,
                    dialect: e.target.value,
                  });
                }}
                className="w-full px-2 py-1 bg-[#111114] border border-slate-700 rounded text-xs text-slate-200 outline-none"
              >
                <option value="siemens-s7-1200">Siemens S7-1200 (I0.0, Q0.0, M0.0)</option>
                <option value="delta-dvp">Delta DVP (X0, Y0, M0)</option>
                <option value="iec-61131">IEC 61131-3 (%IX0.0, %QX0.0)</option>
              </select>
            </div>

            <div className="p-2.5 rounded-lg bg-[#16161a] border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-slate-400 uppercase font-semibold">Scan Cycle Target</label>
                <span className="font-mono text-blue-400 font-bold">{project.plc.scanCycleMs} ms</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={project.plc.scanCycleMs}
                onChange={(e) => {
                  onUpdatePLCConfig?.({
                    ...project.plc,
                    scanCycleMs: Number(e.target.value),
                  });
                }}
                className="w-full accent-blue-500"
              />
            </div>
          </div>
        )}

        {/* VIEW 8: DIAGNOSTICS & SCAN TRACE */}
        {activeNav === 'console' && (
          <div className="flex flex-col gap-2 text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
              Live CPU Telemetry
            </span>
            <div className="p-2.5 rounded-lg bg-[#16161a] border border-slate-800 space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Execution State:</span>
                <span className={`font-bold ${simStatus === 'RUNNING' ? 'text-emerald-400' : 'text-slate-300'}`}>
                  {simStatus}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Scan Cycle:</span>
                <span className="text-blue-400">{scanTimeMs} ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ladder Rungs:</span>
                <span className="text-slate-200">{project.ladder.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Active Tags:</span>
                <span className="text-slate-200">{project.ioMap.length}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
