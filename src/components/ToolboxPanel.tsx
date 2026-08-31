import React from 'react';
import { 
  CircleDot, 
  Disc, 
  Circle, 
  CheckCircle2, 
  XCircle, 
  GitFork, 
  Timer, 
  TimerOff, 
  PlusCircle, 
  Scale, 
  ArrowRightLeft,
  Plus
} from 'lucide-react';
import { LadderElementType, ThemeStyle } from '../types/plc';

interface ToolboxPanelProps {
  onAddElement: (type: LadderElementType) => void;
  onAddRung: () => void;
  theme: ThemeStyle;
}

export const ToolboxPanel: React.FC<ToolboxPanelProps> = ({
  onAddElement,
  onAddRung,
  theme,
}) => {
  const tools: { type: LadderElementType; name: string; subtitle: string; icon: React.ReactNode; color: string }[] = [
    {
      type: 'NO_CONTACT',
      name: 'NO Contact',
      subtitle: 'Normally Open (Examine IF Closed / 1)',
      icon: <CircleDot className="w-5 h-5 text-blue-400" />,
      color: 'border-blue-500/30 hover:border-blue-400',
    },
    {
      type: 'NC_CONTACT',
      name: 'NC Contact',
      subtitle: 'Normally Closed (Examine IF Open / 0)',
      icon: <Disc className="w-5 h-5 text-blue-400" />,
      color: 'border-blue-500/30 hover:border-blue-400',
    },
    {
      type: 'COIL',
      name: 'Output Coil',
      subtitle: 'Energizes target output tag (Q / M)',
      icon: <Circle className="w-5 h-5 text-amber-400" />,
      color: 'border-amber-500/30 hover:border-amber-400',
    },
    {
      type: 'SET_COIL',
      name: 'Set Coil (S)',
      subtitle: 'Latches output bit to 1 upon trigger',
      icon: <CheckCircle2 className="w-5 h-5 text-green-400" />,
      color: 'border-green-500/30 hover:border-green-400',
    },
    {
      type: 'RESET_COIL',
      name: 'Reset Coil (R)',
      subtitle: 'Unlatches output bit to 0 upon trigger',
      icon: <XCircle className="w-5 h-5 text-red-400" />,
      color: 'border-red-500/30 hover:border-red-400',
    },
    {
      type: 'BRANCH',
      name: 'Parallel Branch',
      subtitle: 'Parallel OR logic (Seal-in latch branch)',
      icon: <GitFork className="w-5 h-5 text-purple-400" />,
      color: 'border-purple-500/30 hover:border-purple-400',
    },
    {
      type: 'TON',
      name: 'TON Timer',
      subtitle: 'On-Delay Timer (Delays activation by PT)',
      icon: <Timer className="w-5 h-5 text-cyan-400" />,
      color: 'border-cyan-500/30 hover:border-cyan-400',
    },
    {
      type: 'TOF',
      name: 'TOF Timer',
      subtitle: 'Off-Delay Timer (Keeps output active)',
      icon: <TimerOff className="w-5 h-5 text-cyan-400" />,
      color: 'border-cyan-500/30 hover:border-cyan-400',
    },
    {
      type: 'CTU',
      name: 'CTU Counter',
      subtitle: 'Count Up on rising edge pulses (PV)',
      icon: <PlusCircle className="w-5 h-5 text-emerald-400" />,
      color: 'border-emerald-500/30 hover:border-emerald-400',
    },
  ];

  return (
    <aside className={`w-64 shrink-0 flex flex-col border-r select-none overflow-hidden transition-colors ${
      theme === 'modern'
        ? 'bg-[#f5f5f7] border-[#e5e5ea] text-[#1d1d1f]'
        : theme === 'legacy'
        ? 'bg-[#ece9d8] border-[#808080] text-black win-border-outset text-xs'
        : theme === 'cyberpunk'
        ? 'bg-[#0f0f18]/90 border-[#00ffff]/20 text-[#e5e2e1]'
        : 'bg-[#111114] border-slate-800 text-slate-300'
    }`}>
      {/* Header */}
      <div className={`h-10 px-3 border-b flex items-center justify-between shrink-0 font-bold text-[10px] tracking-widest uppercase ${
        theme === 'modern' ? 'bg-white border-[#e5e5ea]' : 'bg-[#111114] border-slate-800 text-slate-400'
      }`}>
        <span className="flex items-center gap-1.5">
          Toolbox Instructions
        </span>
        <button
          onClick={onAddRung}
          className="px-2.5 py-1 rounded text-[10px] font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1 shadow-xs transition-all active:scale-95"
          title="Insert a new ladder rung at the bottom"
        >
          <Plus className="w-3 h-3" /> Add Rung
        </button>
      </div>

      {/* Tools List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">
          Logic Elements
        </div>

        <div className="flex flex-col gap-1.5">
          {tools.map((tool) => (
            <button
              key={tool.type}
              onClick={() => onAddElement(tool.type)}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', tool.type);
              }}
              className={`p-2 rounded border text-left flex items-center gap-2.5 transition-all cursor-pointer group ${
                theme === 'modern'
                  ? 'bg-white hover:bg-blue-50/50 hover:border-blue-400 shadow-xs border-[#e5e5ea]'
                  : theme === 'cyberpunk'
                  ? 'bg-[#151522] border-[#00ffff]/20 hover:border-[#00ffff] hover:shadow-[0_0_8px_rgba(0,255,255,0.3)]'
                  : 'bg-[#1a1a1e] hover:bg-slate-800/80 border-slate-700/80 hover:border-blue-500'
              }`}
            >
              <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center border ${
                theme === 'modern'
                  ? 'bg-gray-50 border-gray-200'
                  : 'bg-[#0a0a0c] border-slate-800'
              }`}>
                {tool.icon}
              </div>

              <div className="flex flex-col min-w-0">
                <span className="font-bold text-xs text-slate-200 group-hover:text-blue-400 transition-colors">
                  {tool.name}
                </span>
                <span className="text-[10px] font-mono text-slate-500 truncate mt-0.5">
                  {tool.subtitle}
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-auto p-2.5 rounded bg-[#1a1a1e] border border-slate-800 text-[11px] text-slate-400 space-y-1">
          <div className="font-bold text-slate-300 text-xs flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Live Simulation Tip
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Click any contact in the ladder workspace during simulation to instantly flip its TRUE/FALSE state.
          </p>
        </div>
      </div>
    </aside>
  );
};
