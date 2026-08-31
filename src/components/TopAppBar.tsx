import React, { useState } from 'react';
import { 
  Play, 
  Square, 
  Pause, 
  StepForward, 
  Save, 
  Download, 
  Upload, 
  FolderOpen, 
  Plus, 
  RotateCcw, 
  RotateCw, 
  Settings, 
  HelpCircle, 
  Cpu, 
  Sparkles, 
  Palette,
  CheckCircle2,
  AlertTriangle,
  Box,
  Workflow,
  Table2
} from 'lucide-react';
import { SimulationStatus, ThemeStyle, ProjectFile, ActiveSideNav } from '../types/plc';

interface TopAppBarProps {
  project: ProjectFile;
  simStatus: SimulationStatus;
  theme: ThemeStyle;
  scanTimeMs: number;
  activeNav?: ActiveSideNav;
  onSelectNav?: (nav: ActiveSideNav) => void;
  onRunSim: () => void;
  onStopSim: () => void;
  onPauseSim: () => void;
  onStepSim: () => void;
  onSaveProject: () => void;
  onExportProject: () => void;
  onImportClick: () => void;
  onNewProject: () => void;
  onOpenProjectList: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onThemeChange: (theme: ThemeStyle) => void;
  onOpenHelp: () => void;
  errorCount: number;
  warningCount: number;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  project,
  simStatus,
  theme,
  scanTimeMs,
  activeNav,
  onSelectNav,
  onRunSim,
  onStopSim,
  onPauseSim,
  onStepSim,
  onSaveProject,
  onExportProject,
  onImportClick,
  onNewProject,
  onOpenProjectList,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onThemeChange,
  onOpenHelp,
  errorCount,
  warningCount,
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const isSimRunning = simStatus === 'RUNNING';

  const toggleMenu = (menu: string) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const closeMenu = () => setActiveMenu(null);

  return (
    <header className={`h-14 px-4 border-b flex items-center justify-between shrink-0 select-none z-50 transition-colors ${
      theme === 'modern'
        ? 'bg-white border-[#e5e5ea] text-[#1d1d1f] shadow-xs'
        : theme === 'legacy'
        ? 'bg-[#ece9d8] border-[#808080] text-black win-border-outset text-xs'
        : theme === 'cyberpunk'
        ? 'bg-[#0f0f18]/90 backdrop-blur-md border-[#00ffff]/30 text-[#e5e2e1]'
        : 'bg-[#111114] border-slate-800 text-slate-300'
    }`}>
      {/* Left branding & Menus */}
      <div className="flex items-center gap-4 h-full">
        {/* Brand logo & name */}
        <div className="flex items-center gap-2.5 pr-2">
          <div className="w-6 h-6 bg-emerald-500 rounded-sm flex items-center justify-center text-black font-bold text-xs italic shadow-[0_0_10px_rgba(16,185,129,0.3)]">
            DT
          </div>
          <div className="flex items-baseline gap-1.5 font-bold tracking-wider text-xs">
            <span className="text-white">DIGITAL TWIN LAB</span>
            <span className="text-[10px] font-mono text-slate-500 font-normal">v2.0</span>
          </div>
        </div>

        {/* Vertical divider */}
        <div className="h-4 w-[1px] bg-slate-700 hidden sm:block"></div>

        {/* Dropdown Menus */}
        <nav className="flex items-center gap-1 h-full text-xs font-medium relative">
          {/* File Menu */}
          <div className="relative">
            <button
              id="menu-file-btn"
              onClick={() => toggleMenu('file')}
              className={`px-2.5 py-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1 ${
                activeMenu === 'file' ? 'bg-slate-800 text-white' : ''
              }`}
            >
              File
            </button>
            {activeMenu === 'file' && (
              <div 
                className="absolute top-full left-0 mt-1.5 w-56 bg-[#1a1a1e] border border-slate-800 shadow-2xl rounded-md py-1.5 z-50 text-xs text-slate-200"
                onMouseLeave={closeMenu}
              >
                <button
                  onClick={() => { onNewProject(); closeMenu(); }}
                  className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-800 hover:text-white text-left"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-400" /> New Project
                </button>
                <button
                  onClick={() => { onOpenProjectList(); closeMenu(); }}
                  className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-800 hover:text-white text-left"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-amber-400" /> Open / Sample Projects...
                </button>
                <div className="my-1 border-t border-slate-800"></div>
                <button
                  onClick={() => { onSaveProject(); closeMenu(); }}
                  className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-800 hover:text-white text-left"
                >
                  <span className="flex items-center gap-2">
                    <Save className="w-3.5 h-3.5 text-emerald-400" /> Save Project
                  </span>
                  <span className="text-slate-500 text-[10px] font-mono">Ctrl+S</span>
                </button>
                <button
                  onClick={() => { onExportProject(); closeMenu(); }}
                  className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-800 hover:text-white text-left"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" /> Export JSON (.json)
                </button>
                <button
                  onClick={() => { onImportClick(); closeMenu(); }}
                  className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-800 hover:text-white text-left"
                >
                  <Upload className="w-3.5 h-3.5 text-purple-400" /> Import JSON (.json)
                </button>
              </div>
            )}
          </div>

          {/* Edit Menu */}
          <div className="relative">
            <button
              onClick={() => toggleMenu('edit')}
              className={`px-2.5 py-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1 ${
                activeMenu === 'edit' ? 'bg-slate-800 text-white' : ''
              }`}
            >
              Edit
            </button>
            {activeMenu === 'edit' && (
              <div 
                className="absolute top-full left-0 mt-1.5 w-48 bg-[#1a1a1e] border border-slate-800 shadow-2xl rounded-md py-1.5 z-50 text-xs text-slate-200"
                onMouseLeave={closeMenu}
              >
                <button
                  disabled={!canUndo}
                  onClick={() => { onUndo(); closeMenu(); }}
                  className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-800 hover:text-white text-left disabled:opacity-30"
                >
                  <span className="flex items-center gap-2">
                    <RotateCcw className="w-3.5 h-3.5" /> Undo
                  </span>
                  <span className="text-slate-500 text-[10px] font-mono">Ctrl+Z</span>
                </button>
                <button
                  disabled={!canRedo}
                  onClick={() => { onRedo(); closeMenu(); }}
                  className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-800 hover:text-white text-left disabled:opacity-30"
                >
                  <span className="flex items-center gap-2">
                    <RotateCw className="w-3.5 h-3.5" /> Redo
                  </span>
                  <span className="text-slate-500 text-[10px] font-mono">Ctrl+Y</span>
                </button>
              </div>
            )}
          </div>

          {/* Project Menu */}
          <div className="relative">
            <button
              onClick={() => { onOpenProjectList(); }}
              className="px-2.5 py-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Project
            </button>
          </div>

          {/* Simulation Menu */}
          <div className="relative">
            <button
              onClick={() => toggleMenu('sim')}
              className={`px-2.5 py-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1 ${
                activeMenu === 'sim' ? 'bg-slate-800 text-white' : ''
              }`}
            >
              Simulation
            </button>
            {activeMenu === 'sim' && (
              <div 
                className="absolute top-full left-0 mt-1.5 w-52 bg-[#1a1a1e] border border-slate-800 shadow-2xl rounded-md py-1.5 z-50 text-xs text-slate-200"
                onMouseLeave={closeMenu}
              >
                <button
                  onClick={() => { onRunSim(); closeMenu(); }}
                  className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-800 hover:text-white text-left text-emerald-400"
                >
                  <Play className="w-3.5 h-3.5" /> Start Scan Loop
                </button>
                <button
                  onClick={() => { onStepSim(); closeMenu(); }}
                  className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-800 hover:text-white text-left text-amber-400"
                >
                  <StepForward className="w-3.5 h-3.5" /> Single Step Scan
                </button>
                <button
                  onClick={() => { onPauseSim(); closeMenu(); }}
                  className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-800 hover:text-white text-left text-blue-400"
                >
                  <Pause className="w-3.5 h-3.5" /> Pause Scan
                </button>
                <button
                  onClick={() => { onStopSim(); closeMenu(); }}
                  className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-800 hover:text-white text-left text-red-400"
                >
                  <Square className="w-3.5 h-3.5" /> Stop & Reset Logic
                </button>
              </div>
            )}
          </div>

          {/* Theme selector */}
          <div className="relative">
            <button
              onClick={() => toggleMenu('theme')}
              className={`px-2.5 py-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1 ${
                activeMenu === 'theme' ? 'bg-slate-800 text-white' : ''
              }`}
            >
              <Palette className="w-3 h-3 text-purple-400" />
              Theme
            </button>
            {activeMenu === 'theme' && (
              <div 
                className="absolute top-full left-0 mt-1.5 w-52 bg-[#1a1a1e] border border-slate-800 shadow-2xl rounded-md py-1.5 z-50 text-xs text-slate-200"
                onMouseLeave={closeMenu}
              >
                <button
                  onClick={() => { onThemeChange('industrial'); closeMenu(); }}
                  className={`w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-800 hover:text-white text-left ${
                    theme === 'industrial' ? 'bg-slate-800 font-bold text-emerald-400' : ''
                  }`}
                >
                  <span>Elegant Dark</span>
                  {theme === 'industrial' && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => { onThemeChange('modern'); closeMenu(); }}
                  className={`w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-800 hover:text-white text-left ${
                    theme === 'modern' ? 'bg-slate-800 font-bold text-blue-300' : ''
                  }`}
                >
                  <span>Clean Light</span>
                  {theme === 'modern' && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => { onThemeChange('cyberpunk'); closeMenu(); }}
                  className={`w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-800 hover:text-white text-left ${
                    theme === 'cyberpunk' ? 'bg-slate-800 font-bold text-cyan-300' : ''
                  }`}
                >
                  <span>Cyberpunk Neon</span>
                  {theme === 'cyberpunk' && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => { onThemeChange('legacy'); closeMenu(); }}
                  className={`w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-800 hover:text-white text-left ${
                    theme === 'legacy' ? 'bg-slate-800 font-bold text-blue-300' : ''
                  }`}
                >
                  <span>Classic Win32</span>
                  {theme === 'legacy' && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Center View Selector & project name banner */}
      <div className="flex items-center gap-3">
        {onSelectNav && (
          <div className="flex items-center gap-1 bg-[#1a1a1e] p-1 rounded-md border border-slate-800 text-xs">
            <button
              onClick={() => onSelectNav('toolbox')}
              className={`px-3 py-1 rounded font-semibold flex items-center gap-1.5 transition-all ${
                activeNav === 'toolbox' || activeNav === 'project'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Workflow className="w-3.5 h-3.5" />
              <span>Ladder Editor</span>
            </button>

            <button
              onClick={() => onSelectNav('variables')}
              className={`px-3 py-1 rounded font-semibold flex items-center gap-1.5 transition-all ${
                activeNav === 'variables'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" />
              <span>I/O Variables</span>
            </button>

            <button
              onClick={() => onSelectNav('twin3d')}
              className={`px-3 py-1 rounded font-semibold flex items-center gap-1.5 transition-all ${
                activeNav === 'twin3d'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-blue-400 hover:text-white hover:bg-blue-950/40 border border-blue-500/30'
              }`}
            >
              <Box className="w-3.5 h-3.5 text-blue-400" />
              <span>3D Digital Twin</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            </button>
          </div>
        )}

        <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded bg-[#1a1a1e] border border-slate-800 text-xs font-mono">
          <span className="text-slate-500">PLC:</span>
          <span className="text-blue-400 font-semibold">{project.plc.dialect}</span>
        </div>
      </div>

      {/* Right Controls (Run, Stop, Step, Save) */}
      <div className="flex items-center gap-3 h-full">
        {/* Simulation Controls */}
        <div className="flex items-center gap-2">
          <button
            id="run-sim-btn"
            onClick={onRunSim}
            className={`h-8 px-3.5 rounded text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 ${
              isSimRunning
                ? 'bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                : 'bg-emerald-600/10 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-600/20'
            }`}
            title="Start Continuous Scan Cycle"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isSimRunning ? 'RUNNING' : 'RUN'}</span>
          </button>

          {isSimRunning && (
            <button
              onClick={onPauseSim}
              className="h-8 px-2.5 bg-amber-600/10 text-amber-400 border border-amber-500/30 hover:bg-amber-600/20 rounded text-xs font-bold flex items-center gap-1"
              title="Pause Scan Execution"
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onStepSim}
            className="h-8 px-3 bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 rounded text-xs font-bold flex items-center gap-1.5"
            title="Execute Single Scan Cycle (Step)"
          >
            <StepForward className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">STEP</span>
          </button>

          <button
            id="stop-sim-btn"
            onClick={onStopSim}
            className="h-8 px-3 bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 rounded text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
            title="Stop Simulation and Reset All Outputs"
          >
            <Square className="w-3.5 h-3.5 fill-current text-red-400" />
            <span>STOP</span>
          </button>
        </div>

        {/* Separator */}
        <div className="w-[1px] h-5 bg-slate-700"></div>

        {/* Save Button */}
        <button
          onClick={onSaveProject}
          className="h-8 px-4 rounded bg-blue-600 text-white hover:bg-blue-500 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
          title="Save Project (IndexedDB)"
        >
          <Save className="w-3.5 h-3.5" />
          <span>SAVE</span>
        </button>

        {/* Help button */}
        <button
          onClick={onOpenHelp}
          className="p-2 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Quick Ladder Logic Guide & Shortcuts"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
