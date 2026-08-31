import React from 'react';
import { 
  Sliders, 
  Tag, 
  HelpCircle, 
  Activity, 
  Cpu, 
  Sparkles, 
  Clock, 
  Hash, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { LadderElement, LadderRung, IOTag, ThemeStyle, SimulationStatus } from '../types/plc';
import { defaultDialect } from '../utils/addressParser';

interface InspectorPanelProps {
  selectedElement: LadderElement | null;
  selectedRung: LadderRung | null;
  ioTags: IOTag[];
  onUpdateElement: (updated: LadderElement) => void;
  theme: ThemeStyle;
  simStatus: SimulationStatus;
  scanTimeMs: number;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  selectedElement,
  selectedRung,
  ioTags,
  onUpdateElement,
  theme,
  simStatus,
  scanTimeMs,
}) => {
  if (!selectedElement) {
    return (
      <aside className={`w-64 shrink-0 border-l flex flex-col p-4 select-none transition-colors ${
        theme === 'modern'
          ? 'bg-[#f5f5f7] border-[#e5e5ea] text-[#1d1d1f]'
          : theme === 'legacy'
          ? 'bg-[#ece9d8] border-[#808080] text-black win-border-outset text-xs'
          : theme === 'cyberpunk'
          ? 'bg-[#0f0f18]/90 border-[#00ffff]/20 text-[#e5e2e1]'
          : 'bg-[#202020] border-[#2e2e2e] text-[#e5e2e1]'
      }`}>
        <div className="flex items-center gap-2 pb-3 border-b border-neutral-700/50 font-bold text-xs uppercase tracking-wider text-neutral-400">
          <Sliders className="w-3.5 h-3.5 text-blue-400" />
          <span>Properties Inspector</span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-neutral-500">
          <Sliders className="w-8 h-8 opacity-30 mb-2" />
          <p className="text-xs">Select any contact, coil, timer or rung in the diagram to inspect and edit its parameters.</p>
        </div>

        {/* Live Diagnostics Card */}
        <div className="p-3 rounded bg-neutral-900/80 border border-neutral-800 text-xs space-y-2">
          <div className="flex items-center justify-between text-neutral-400 font-semibold text-[11px]">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" /> CPU Telemetry
            </span>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-ping"></span>
          </div>
          <div className="flex justify-between font-mono text-[11px] text-neutral-300">
            <span>Status:</span>
            <span className="font-bold text-green-400">{simStatus}</span>
          </div>
          <div className="flex justify-between font-mono text-[11px] text-neutral-300">
            <span>Scan Cycle:</span>
            <span>{scanTimeMs} ms</span>
          </div>
          <div className="flex justify-between font-mono text-[11px] text-neutral-300">
            <span>Configured Tags:</span>
            <span>{ioTags.length} tags</span>
          </div>
        </div>
      </aside>
    );
  }

  const handleAddressChange = (addrStr: string) => {
    const parsed = defaultDialect.parseAddress(addrStr);
    if (parsed) {
      // Find matching tag if exists
      const matchTag = ioTags.find(
        (t) => t.address.rawString.toUpperCase() === addrStr.toUpperCase()
      );
      onUpdateElement({
        ...selectedElement,
        address: parsed,
        symbol: matchTag ? matchTag.symbol : selectedElement.symbol,
      });
    } else {
      onUpdateElement({
        ...selectedElement,
        address: {
          area: 'INPUT',
          byte: 0,
          bit: 0,
          dataType: 'BOOL',
          rawString: addrStr,
        },
      });
    }
  };

  const handleTagSelection = (tagId: string) => {
    const tag = ioTags.find((t) => t.id === tagId);
    if (tag) {
      onUpdateElement({
        ...selectedElement,
        address: tag.address,
        symbol: tag.symbol,
        comment: tag.description,
      });
    }
  };

  return (
    <aside className={`w-72 shrink-0 border-l flex flex-col select-none overflow-y-auto transition-colors ${
      theme === 'modern'
        ? 'bg-[#f5f5f7] border-[#e5e5ea] text-[#1d1d1f]'
        : theme === 'legacy'
        ? 'bg-[#ece9d8] border-[#808080] text-black win-border-outset text-xs'
        : theme === 'cyberpunk'
        ? 'bg-[#0f0f18]/90 border-[#00ffff]/20 text-[#e5e2e1]'
        : 'bg-[#202020] border-[#2e2e2e] text-[#e5e2e1]'
    }`}>
      {/* Header */}
      <div className={`h-8 px-3 border-b flex items-center justify-between shrink-0 font-bold text-[11px] uppercase tracking-wider ${
        theme === 'modern' ? 'bg-white border-[#e5e5ea]' : 'bg-[#282828] border-[#383838]'
      }`}>
        <span className="flex items-center gap-1.5 text-neutral-300">
          <Sliders className="w-3.5 h-3.5 text-blue-400" />
          <span>Properties: {selectedElement.type}</span>
        </span>
      </div>

      <div className="p-3.5 space-y-4 text-xs">
        {/* Quick Tag Selector dropdown */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold text-neutral-400">
            Bind to I/O Tag:
          </label>
          <select
            onChange={(e) => handleTagSelection(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-xs text-neutral-200 focus:border-blue-500 outline-none"
            value={ioTags.find((t) => t.symbol === selectedElement.symbol)?.id || ''}
          >
            <option value="">-- Choose existing tag --</option>
            {ioTags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.symbol} ({t.address.rawString}) - {t.description || t.dataType}
              </option>
            ))}
          </select>
        </div>

        {/* Address Input */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold text-neutral-400">
            Address (Siemens S7-1200):
          </label>
          <input
            type="text"
            value={selectedElement.address?.rawString || ''}
            onChange={(e) => handleAddressChange(e.target.value)}
            placeholder="e.g. I0.0, Q0.0, M0.0, T1, C1"
            className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-xs text-neutral-200 font-mono focus:border-blue-500 outline-none"
          />
        </div>

        {/* Symbol Name */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold text-neutral-400">
            Symbol Identifier:
          </label>
          <input
            type="text"
            value={selectedElement.symbol || ''}
            onChange={(e) =>
              onUpdateElement({
                ...selectedElement,
                symbol: e.target.value.toUpperCase(),
              })
            }
            placeholder="e.g. START_PB, MOTOR_RUN"
            className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-xs text-neutral-200 font-mono focus:border-blue-500 outline-none"
          />
        </div>

        {/* Comment / Annotation */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold text-neutral-400">
            Description / Comment:
          </label>
          <textarea
            rows={2}
            value={selectedElement.comment || ''}
            onChange={(e) =>
              onUpdateElement({
                ...selectedElement,
                comment: e.target.value,
              })
            }
            placeholder="Operational purpose of this element..."
            className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-xs text-neutral-200 focus:border-blue-500 outline-none resize-none"
          />
        </div>

        {/* Timer Specific parameters (PT) */}
        {(selectedElement.type === 'TON' || selectedElement.type === 'TOF') && (
          <div className="p-3 bg-neutral-900/90 border border-cyan-500/30 rounded space-y-2">
            <div className="flex items-center gap-1.5 text-cyan-400 font-semibold text-[11px]">
              <Clock className="w-3.5 h-3.5" /> Timer Parameters
            </div>
            <div>
              <label className="text-[11px] text-neutral-400 block mb-1">
                Preset Time PT (ms):
              </label>
              <input
                type="number"
                step="500"
                min="100"
                max="60000"
                value={selectedElement.params?.presetTimeMs || 3000}
                onChange={(e) =>
                  onUpdateElement({
                    ...selectedElement,
                    params: {
                      ...selectedElement.params,
                      presetTimeMs: parseInt(e.target.value, 10) || 1000,
                    },
                  })
                }
                className="w-full px-2 py-1 bg-neutral-950 border border-neutral-700 rounded text-xs font-mono text-cyan-300"
              />
            </div>
          </div>
        )}

        {/* Counter Specific parameters (PV) */}
        {selectedElement.type === 'CTU' && (
          <div className="p-3 bg-neutral-900/90 border border-emerald-500/30 rounded space-y-2">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
              <Hash className="w-3.5 h-3.5" /> Counter Parameters
            </div>
            <div>
              <label className="text-[11px] text-neutral-400 block mb-1">
                Preset Count PV:
              </label>
              <input
                type="number"
                step="1"
                min="1"
                max="1000"
                value={selectedElement.params?.presetCount || 5}
                onChange={(e) =>
                  onUpdateElement({
                    ...selectedElement,
                    params: {
                      ...selectedElement.params,
                      presetCount: parseInt(e.target.value, 10) || 1,
                    },
                  })
                }
                className="w-full px-2 py-1 bg-neutral-950 border border-neutral-700 rounded text-xs font-mono text-emerald-300"
              />
            </div>
          </div>
        )}

        {/* Real-time Status state badge */}
        <div className="p-3 rounded bg-neutral-900/50 border border-neutral-800 text-[11px] space-y-1 font-mono">
          <div className="text-neutral-400">Runtime Energized:</div>
          <div className={`font-bold flex items-center gap-1.5 ${
            selectedElement.isEnergized ? 'text-green-400' : 'text-neutral-500'
          }`}>
            <span className={`w-2 h-2 rounded-full ${selectedElement.isEnergized ? 'bg-green-400 shadow-[0_0_6px_#4ade80]' : 'bg-neutral-600'}`}></span>
            <span>{selectedElement.isEnergized ? 'HIGH / CONDUCTING (1)' : 'LOW / OPEN (0)'}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
