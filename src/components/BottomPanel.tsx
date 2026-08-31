import React from 'react';
import { 
  Table, 
  Activity, 
  AlertCircle, 
  AlertTriangle, 
  Terminal, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2,
  Lock,
  Unlock,
  Radio
} from 'lucide-react';
import { ActiveBottomTab, IOTag, DiagnosticItem, ThemeStyle, SimulationStatus } from '../types/plc';

interface BottomPanelProps {
  activeTab: ActiveBottomTab;
  onSelectTab: (tab: ActiveBottomTab) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  tags: IOTag[];
  diagnostics: DiagnosticItem[];
  theme: ThemeStyle;
  simStatus: SimulationStatus;
  scanCount: number;
  scanTimeMs: number;
  onToggleTagValue: (tagId: string) => void;
  onToggleForce: (tagId: string) => void;
}

export const BottomPanel: React.FC<BottomPanelProps> = ({
  activeTab,
  onSelectTab,
  isOpen,
  onToggleOpen,
  tags,
  diagnostics,
  theme,
  simStatus,
  scanCount,
  scanTimeMs,
  onToggleTagValue,
  onToggleForce,
}) => {
  const errors = diagnostics.filter((d) => d.type === 'ERROR');
  const warnings = diagnostics.filter((d) => d.type === 'WARNING');

  return (
    <div className={`shrink-0 border-t flex flex-col transition-all duration-200 select-none ${
      isOpen ? 'h-52' : 'h-8'
    } ${
      theme === 'modern'
        ? 'bg-white border-[#e5e5ea] text-[#1d1d1f]'
        : theme === 'legacy'
        ? 'bg-[#ece9d8] border-[#808080] text-black win-border-outset text-xs'
        : theme === 'cyberpunk'
        ? 'bg-[#0f0f18] border-[#00ffff]/20 text-[#e5e2e1]'
        : 'bg-[#1b1b1c] border-[#2e2e2e] text-[#e5e2e1]'
    }`}>
      {/* Tab Navigation Header */}
      <div className={`h-8 px-3 border-b flex items-center justify-between shrink-0 font-medium text-xs ${
        theme === 'modern' ? 'bg-[#f5f5f7] border-[#e5e5ea]' : 'bg-[#222222] border-[#2e2e2e]'
      }`}>
        <div className="flex items-center gap-1">
          {/* Watch Table Tab */}
          <button
            onClick={() => { onSelectTab('watch'); if (!isOpen) onToggleOpen(); }}
            className={`px-3 py-1 rounded-t flex items-center gap-1.5 transition-colors ${
              activeTab === 'watch' && isOpen
                ? 'bg-[#1b1b1c] text-blue-400 font-bold border-t-2 border-blue-500'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Watch Table</span>
          </button>

          {/* I/O Tags Tab */}
          <button
            onClick={() => { onSelectTab('tags'); if (!isOpen) onToggleOpen(); }}
            className={`px-3 py-1 rounded-t flex items-center gap-1.5 transition-colors ${
              activeTab === 'tags' && isOpen
                ? 'bg-[#1b1b1c] text-blue-400 font-bold border-t-2 border-blue-500'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>I/O Signals ({tags.length})</span>
          </button>

          {/* Diagnostics Tab */}
          <button
            onClick={() => { onSelectTab('errors'); if (!isOpen) onToggleOpen(); }}
            className={`px-3 py-1 rounded-t flex items-center gap-1.5 transition-colors ${
              activeTab === 'errors' && isOpen
                ? 'bg-[#1b1b1c] text-blue-400 font-bold border-t-2 border-blue-500'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {errors.length > 0 ? (
              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
            ) : warnings.length > 0 ? (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
            )}
            <span>Diagnostics ({errors.length} err, {warnings.length} warn)</span>
          </button>

          {/* Output Log */}
          <button
            onClick={() => { onSelectTab('output'); if (!isOpen) onToggleOpen(); }}
            className={`px-3 py-1 rounded-t flex items-center gap-1.5 transition-colors ${
              activeTab === 'output' && isOpen
                ? 'bg-[#1b1b1c] text-blue-400 font-bold border-t-2 border-blue-500'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>PLC Scan Log</span>
          </button>
        </div>

        {/* Right Info and Collapse toggle */}
        <div className="flex items-center gap-3 text-[11px] font-mono text-neutral-400">
          <span className="hidden sm:inline">Scans: {scanCount.toLocaleString()}</span>
          <button
            onClick={onToggleOpen}
            className="p-1 rounded hover:bg-neutral-700 text-neutral-400 hover:text-white"
            title={isOpen ? 'Collapse panel' : 'Expand panel'}
          >
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Panel Content Body */}
      {isOpen && (
        <div className="flex-1 overflow-auto p-3 font-mono text-xs">
          {/* Watch Table Mode */}
          {activeTab === 'watch' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {tags.map((tag) => {
                const isBool = tag.dataType === 'BOOL';
                const liveValue = tag.isForced && tag.forcedValue !== undefined ? tag.forcedValue : tag.currentValue;

                return (
                  <div
                    key={tag.id}
                    className="p-2 bg-neutral-900/80 border border-neutral-800 rounded flex items-center justify-between"
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-neutral-200 truncate">{tag.symbol}</span>
                        <span className="text-[10px] text-neutral-500">{tag.address.rawString}</span>
                      </div>
                      <span className="text-[10px] text-neutral-400 truncate">{tag.description || tag.dataType}</span>
                    </div>

                    {/* Quick Value Toggle Button */}
                    <div className="flex items-center gap-1">
                      {isBool ? (
                        <button
                          onClick={() => onToggleTagValue(tag.id)}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                            Boolean(liveValue)
                              ? 'bg-green-500/20 text-green-400 border border-green-500/40 shadow-[0_0_6px_rgba(74,222,163,0.3)]'
                              : 'bg-neutral-800 text-neutral-500 border border-neutral-700'
                          }`}
                        >
                          {Boolean(liveValue) ? '1 (ON)' : '0 (OFF)'}
                        </button>
                      ) : (
                        <span className="px-2 py-0.5 bg-neutral-800 rounded text-neutral-300 font-bold">
                          {String(liveValue)}
                        </span>
                      )}

                      <button
                        onClick={() => onToggleForce(tag.id)}
                        className={`p-1 rounded ${tag.isForced ? 'text-amber-400 bg-amber-500/20' : 'text-neutral-600 hover:text-neutral-400'}`}
                        title={tag.isForced ? 'Unforce' : 'Force Value'}
                      >
                        {tag.isForced ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* I/O Tags Mode */}
          {activeTab === 'tags' && (
            <div className="space-y-1">
              <div className="grid grid-cols-6 text-[10px] text-neutral-500 uppercase border-b border-neutral-800 pb-1">
                <span>Symbol</span>
                <span>Address</span>
                <span>Type</span>
                <span>State</span>
                <span>Force</span>
                <span>Description</span>
              </div>
              {tags.map((t) => (
                <div key={t.id} className="grid grid-cols-6 py-1 text-[11px] border-b border-neutral-900 items-center">
                  <span className="font-bold text-neutral-300">{t.symbol}</span>
                  <span className="text-blue-400">{t.address.rawString}</span>
                  <span className="text-neutral-400">{t.dataType}</span>
                  <span className={Boolean(t.currentValue) ? 'text-green-400 font-bold' : 'text-neutral-500'}>
                    {String(t.currentValue)}
                  </span>
                  <span>{t.isForced ? 'FORCED' : '-'}</span>
                  <span className="text-neutral-500 truncate">{t.description || '-'}</span>
                </div>
              ))}
            </div>
          )}

          {/* Diagnostics Mode */}
          {activeTab === 'errors' && (
            <div className="space-y-2">
              {diagnostics.length === 0 ? (
                <div className="flex items-center gap-2 text-green-400 py-4 justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>No syntax or configuration errors detected. PLC is scan-ready!</span>
                </div>
              ) : (
                diagnostics.map((d) => (
                  <div
                    key={d.id}
                    className={`p-2 rounded border flex items-center justify-between ${
                      d.type === 'ERROR'
                        ? 'bg-red-500/10 border-red-500/30 text-red-300'
                        : d.type === 'WARNING'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {d.type === 'ERROR' ? (
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                      <span>
                        <strong>[{d.code}]</strong> {d.message}
                      </span>
                    </div>
                    <span className="text-[10px] opacity-60">{d.timestamp}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Output Log */}
          {activeTab === 'output' && (
            <div className="font-mono text-xs space-y-1 text-neutral-300">
              <div className="text-neutral-500">[SYSTEM] LogicPulse Deterministic Engine initialized.</div>
              <div className="text-neutral-500">[INFO] S7-1200 CPU Emulation profile active. Scan Interval: {scanTimeMs}ms.</div>
              <div className="text-green-400">[SIM] Engine Status: {simStatus} (Total Scans: {scanCount})</div>
              {tags.filter(t => t.currentValue).map(t => (
                <div key={t.id} className="text-cyan-400">
                  [TAG_UPDATE] {t.symbol} ({t.address.rawString}) = TRUE
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
