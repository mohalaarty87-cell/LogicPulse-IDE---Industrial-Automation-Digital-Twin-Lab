import React from 'react';
import { 
  FolderOpen, 
  Workflow, 
  Table2, 
  BookOpen, 
  Network, 
  Settings, 
  Terminal,
  Layers,
  Sparkles,
  Box
} from 'lucide-react';
import { ActiveSideNav, ThemeStyle } from '../types/plc';

interface SideNavBarProps {
  activeNav: ActiveSideNav;
  onSelectNav: (nav: ActiveSideNav) => void;
  theme: ThemeStyle;
}

export const SideNavBar: React.FC<SideNavBarProps> = ({
  activeNav,
  onSelectNav,
  theme,
}) => {
  const items: { id: ActiveSideNav; label: string; icon: React.ReactNode }[] = [
    { id: 'project', label: 'Project', icon: <FolderOpen className="w-5 h-5" /> },
    { id: 'toolbox', label: 'Toolbox', icon: <Workflow className="w-5 h-5" /> },
    { id: 'variables', label: 'Variables', icon: <Table2 className="w-5 h-5" /> },
    { id: 'twin3d', label: '3D Twin', icon: <Box className="w-5 h-5 text-blue-400" /> },
    { id: 'library', label: 'Library', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'network', label: 'Network', icon: <Network className="w-5 h-5" /> },
  ];

  return (
    <nav className={`w-14 shrink-0 flex flex-col items-center py-2.5 border-r select-none z-40 transition-colors ${
      theme === 'modern'
        ? 'bg-white border-[#e5e5ea] text-[#86868b]'
        : theme === 'legacy'
        ? 'bg-[#ece9d8] border-[#808080] win-border-outset text-black'
        : theme === 'cyberpunk'
        ? 'bg-[#0a0a0f]/95 border-[#00ffff]/20 text-[#8c90a1]'
        : 'bg-[#111114] border-slate-800 text-slate-500'
    }`}>
      {/* Primary Navigation Items */}
      <div className="flex flex-col gap-2 w-full px-1.5">
        {items.map((item) => {
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectNav(item.id)}
              className={`w-full aspect-square rounded flex flex-col items-center justify-center gap-1 transition-all group ${
                isActive
                  ? theme === 'cyberpunk'
                    ? 'bg-[#00ffff]/20 text-[#00ffff] border-l-2 border-[#00ffff] shadow-[0_0_8px_#00ffff]'
                    : theme === 'modern'
                    ? 'bg-[#0066cc] text-white shadow-sm'
                    : 'bg-slate-800 text-white border-l-2 border-blue-500'
                  : 'hover:bg-slate-800/60 hover:text-slate-200'
              }`}
              title={item.label}
            >
              {item.icon}
              <span className="text-[9px] font-semibold tracking-tight uppercase scale-90 truncate max-w-full">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bottom utility items */}
      <div className="mt-auto flex flex-col gap-2 w-full px-1.5 pt-2 border-t border-slate-800">
        <button
          onClick={() => onSelectNav('settings')}
          className={`w-full aspect-square rounded flex flex-col items-center justify-center gap-1 transition-all ${
            activeNav === 'settings'
              ? 'bg-slate-800 text-white border-l-2 border-blue-500'
              : 'hover:bg-slate-800/60 hover:text-slate-200'
          }`}
          title="PLC Hardware & Scan Configuration"
        >
          <Settings className="w-4 h-4" />
          <span className="text-[9px] font-medium scale-90">Config</span>
        </button>

        <button
          onClick={() => onSelectNav('console')}
          className={`w-full aspect-square rounded flex flex-col items-center justify-center gap-1 transition-all ${
            activeNav === 'console'
              ? 'bg-slate-800 text-white border-l-2 border-blue-500'
              : 'hover:bg-slate-800/60 hover:text-slate-200'
          }`}
          title="Console & I/O Diagnostics"
        >
          <Terminal className="w-4 h-4" />
          <span className="text-[9px] font-medium scale-90">Console</span>
        </button>
      </div>
    </nav>
  );
};
