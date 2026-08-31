import React, { useState } from 'react';
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
  AlertCircle,
  PanelRightClose,
  PanelRight,
  Layers,
  ChevronRight,
  Info,
  Zap,
  Radio
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
  isOpen: boolean;
  onToggleOpen: () => void;
  panelWidth: number;
  onChangeWidth?: (width: number) => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  selectedElement,
  selectedRung,
  ioTags,
  onUpdateElement,
  theme,
  simStatus,
  scanTimeMs,
  isOpen,
  onToggleOpen,
  panelWidth,
  onChangeWidth,
}) => {
  const [activeTab, setActiveTab] = useState<'properties' | 'telemetry' | 'tags'>('properties');

  if (!isOpen) {
    return (
      <aside className={`w-8 shrink-0 flex flex-col items-center py-2 border-l transition-all select-none ${
        theme === 'modern'
          ? 'bg-white border-[#e5e5ea]'
          : 'bg-[#111114] border-slate-800'
      }`}>
        <button
          onClick={onToggleOpen}
          className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Expand Properties Inspector Panel"
        >
          <PanelRight className="w-4 h-4" />
        </button>
      </aside>
    );
  }

  const handleAddressChange = (addrStr: string) => {
    if (!selectedElement) return;
    const parsed = defaultDialect.parseAddress(addrStr);
    if (parsed) {
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
    if (!selectedElement) return;
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
    <aside 
      style={{ width: `${panelWidth}px` }}
      className={`shrink-0 border-l flex flex-col select-none overflow-hidden transition-all duration-200 ${
        theme === 'modern'
          ? 'bg-[#f8f9fa] border-[#e5e5ea] text-[#1d1d1f]'
          : theme === 'legacy'
          ? 'bg-[#ece9d8] border-[#808080] text-black win-border-outset text-xs'
          : theme === 'cyberpunk'
          ? 'bg-[#0b0b12] border-[#00ffff]/20 text-[#e5e2e1]'
          : 'bg-[#111114] border-slate-800 text-slate-300'
      }`}
    >
      {/* Header */}
      <div className={`h-10 px-3 border-b flex items-center justify-between shrink-0 font-bold text-xs ${
        theme === 'modern' ? 'bg-white border-[#e5e5ea]' : 'bg-[#141418] border-slate-800 text-slate-300'
      }`}>
        <div className="flex items-center gap-1.5 text-slate-200">
          <Sliders className="w-3.5 h-3.5 text-blue-400" />
          <span className="truncate">
            {selectedElement ? `Properties: ${selectedElement.type}` : 'Inspector & Telemetry'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {onChangeWidth && (
            <div className="flex items-center bg-slate-800/80 rounded px-1 text-[10px] font-mono text-slate-400 mr-1">
              <button 
                onClick={() => onChangeWidth(260)} 
                className={`px-1 py-0.5 hover:text-white ${panelWidth === 260 ? 'text-blue-400 font-bold' : ''}`}
                title="Compact (260px)"
              >
                S
              </button>
              <button 
                onClick={() => onChangeWidth(300)} 
                className={`px-1 py-0.5 hover:text-white ${panelWidth === 300 ? 'text-blue-400 font-bold' : ''}`}
                title="Standard (300px)"
              >
                M
              </button>
              <button 
                onClick={() => onChangeWidth(350)} 
                className={`px-1 py-0.5 hover:text-white ${panelWidth === 350 ? 'text-blue-400 font-bold' : ''}`}
                title="Wide (350px)"
              >
                L
              </button>
            </div>
          )}
          <button
            onClick={onToggleOpen}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Collapse Inspector"
          >
            <PanelRightClose className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-800 bg-[#16161a] text-[11px] font-semibold text-slate-400 shrink-0">
        <button
          onClick={() => setActiveTab('properties')}
          className={`flex-1 py-1.5 text-center transition-colors ${
            activeTab === 'properties'
              ? 'text-blue-400 border-b-2 border-blue-500 bg-[#1a1a20]'
              : 'hover:text-slate-200'
          }`}
        >
          Properties
        </button>
        <button
          onClick={() => setActiveTab('telemetry')}
          className={`flex-1 py-1.5 text-center transition-colors ${
            activeTab === 'telemetry'
              ? 'text-blue-400 border-b-2 border-blue-500 bg-[#1a1a20]'
              : 'hover:text-slate-200'
          }`}
        >
          CPU Telemetry
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5 text-xs">
        {activeTab === 'properties' && selectedElement && (
          <>
            {/* Quick Tag Selector dropdown */}
            <div className="space-y-1">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Bind to I/O Tag:
              </label>
              <select
                onChange={(e) => handleTagSelection(e.target.value)}
                className="w-full px-2 py-1.5 bg-[#16161a] border border-slate-800 rounded text-xs text-slate-200 focus:border-blue-500 outline-none"
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
            <div className="space-y-1">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                PLC Address:
              </label>
              <input
                type="text"
                value={selectedElement.address?.rawString || ''}
                onChange={(e) => handleAddressChange(e.target.value)}
                placeholder="e.g. I0.0, Q0.0, M0.0, T1, C1"
                className="w-full px-2 py-1.5 bg-[#16161a] border border-slate-800 rounded text-xs text-slate-200 font-mono focus:border-blue-500 outline-none"
              />
            </div>

            {/* Symbol Name */}
            <div className="space-y-1">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Symbol / Tag Name:
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
                className="w-full px-2 py-1.5 bg-[#16161a] border border-slate-800 rounded text-xs text-slate-200 font-mono focus:border-blue-500 outline-none"
              />
            </div>

            {/* Comment / Annotation */}
            <div className="space-y-1">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
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
                placeholder="Functional description of this instruction..."
                className="w-full px-2 py-1.5 bg-[#16161a] border border-slate-800 rounded text-xs text-slate-200 focus:border-blue-500 outline-none resize-none"
              />
            </div>

            {/* Timer Specific parameters (PT) */}
            {(selectedElement.type === 'TON' || selectedElement.type === 'TOF') && (
              <div className="p-2.5 bg-[#16161a] border border-cyan-500/30 rounded-lg space-y-2">
                <div className="flex items-center gap-1.5 text-cyan-400 font-semibold text-[11px]">
                  <Clock className="w-3.5 h-3.5" /> Timer Parameters
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">
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
                    className="w-full px-2 py-1 bg-[#111114] border border-slate-800 rounded text-xs font-mono text-cyan-300 outline-none"
                  />
                </div>
              </div>
            )}

            {/* Counter Specific parameters (PV) */}
            {selectedElement.type === 'CTU' && (
              <div className="p-2.5 bg-[#16161a] border border-teal-500/30 rounded-lg space-y-2">
                <div className="flex items-center gap-1.5 text-teal-400 font-semibold text-[11px]">
                  <Hash className="w-3.5 h-3.5" /> Counter Parameters
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">
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
                    className="w-full px-2 py-1 bg-[#111114] border border-slate-800 rounded text-xs font-mono text-teal-300 outline-none"
                  />
                </div>
              </div>
            )}

            {/* Real-time Status state badge */}
            <div className="p-2.5 rounded-lg bg-[#16161a] border border-slate-800 text-[11px] space-y-1 font-mono">
              <div className="text-slate-400 text-[10px]">Runtime Energized State:</div>
              <div className={`font-bold flex items-center gap-1.5 ${
                selectedElement.isEnergized ? 'text-emerald-400' : 'text-slate-500'
              }`}>
                <span className={`w-2 h-2 rounded-full ${selectedElement.isEnergized ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-slate-600'}`}></span>
                <span>{selectedElement.isEnergized ? 'HIGH / CONDUCTING (1)' : 'LOW / OPEN (0)'}</span>
              </div>
            </div>
          </>
        )}

        {activeTab === 'properties' && !selectedElement && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-[#16161a] border border-slate-800 text-center space-y-2">
              <Sliders className="w-6 h-6 text-slate-500 mx-auto opacity-40" />
              <p className="text-xs text-slate-400 font-medium">
                Select any ladder contact, coil, or timer in the canvas to inspect and edit its properties.
              </p>
            </div>

            {selectedRung && (
              <div className="p-3 rounded-lg bg-[#16161a] border border-slate-800 space-y-2 text-xs">
                <div className="font-bold text-slate-200 flex items-center justify-between">
                  <span>Rung {selectedRung.number} Active</span>
                  <span className="text-[10px] font-mono text-blue-400">
                    {selectedRung.elements.length} Elements
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {selectedRung.comment || '// No comment configured for this rung'}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'telemetry' && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-[#16161a] border border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px]">
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" /> CPU Telemetry
                </span>
                <span className={`w-2 h-2 rounded-full ${simStatus === 'RUNNING' ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`}></span>
              </div>
              <div className="flex justify-between font-mono text-[11px] text-slate-300">
                <span>PLC Status:</span>
                <span className={`font-bold ${simStatus === 'RUNNING' ? 'text-emerald-400' : 'text-slate-400'}`}>{simStatus}</span>
              </div>
              <div className="flex justify-between font-mono text-[11px] text-slate-300">
                <span>Scan Cycle:</span>
                <span className="text-blue-400 font-bold">{scanTimeMs} ms</span>
              </div>
              <div className="flex justify-between font-mono text-[11px] text-slate-300">
                <span>Configured Tags:</span>
                <span>{ioTags.length} tags</span>
              </div>
            </div>

            {/* Tag Quick Watch */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1">
                Active Tags Watch ({ioTags.slice(0, 6).length})
              </span>
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                {ioTags.slice(0, 8).map((t) => (
                  <div key={t.id} className="p-1.5 rounded bg-[#16161a] border border-slate-800 flex justify-between items-center text-[10px] font-mono">
                    <span className="text-slate-400">{t.symbol} ({t.address.rawString})</span>
                    <span className={`font-bold px-1.5 py-0.5 rounded ${t.currentValue ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'}`}>
                      {t.currentValue ? '1' : '0'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
