import React from 'react';
import { 
  X, 
  BookOpen, 
  Zap, 
  HelpCircle, 
  Keyboard, 
  Terminal, 
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface QuickHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickHelpModal: React.FC<QuickHelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
      <div className="bg-[#1e1e1e] border border-[#333333] rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-700/60 flex items-center justify-between bg-[#252525]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0066ff] flex items-center justify-center text-white">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-neutral-100">Ladder Logic & PLC Studio Guide</h2>
              <p className="text-xs text-neutral-400">Industrial Automation reference & keyboard shortcuts</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-neutral-300">
          {/* Section 1: Ladder Concepts */}
          <div className="space-y-2">
            <h3 className="font-bold text-neutral-100 flex items-center gap-1.5 text-sm">
              <Zap className="w-4 h-4 text-cyan-400" /> Core Ladder Logic Fundamentals
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
              <div className="p-3 rounded bg-neutral-900/70 border border-neutral-800 space-y-1">
                <span className="font-semibold text-blue-400 block">NO Contact (Normally Open - Examine ON)</span>
                <p className="text-neutral-400 leading-relaxed">
                  Passes power to the right when its bound signal is <strong>1 (TRUE / High)</strong>. If signal is 0, path is open.
                </p>
              </div>
              <div className="p-3 rounded bg-neutral-900/70 border border-neutral-800 space-y-1">
                <span className="font-semibold text-blue-400 block">NC Contact (Normally Closed - Examine OFF)</span>
                <p className="text-neutral-400 leading-relaxed">
                  Passes power to the right when its bound signal is <strong>0 (FALSE / Low)</strong>. Opens when signal is 1.
                </p>
              </div>
              <div className="p-3 rounded bg-neutral-900/70 border border-neutral-800 space-y-1">
                <span className="font-semibold text-amber-400 block">Standard Output Coil</span>
                <p className="text-neutral-400 leading-relaxed">
                  Turns <strong>ON (1)</strong> when rung power reaches it, and <strong>OFF (0)</strong> when power continuity drops.
                </p>
              </div>
              <div className="p-3 rounded bg-neutral-900/70 border border-neutral-800 space-y-1">
                <span className="font-semibold text-purple-400 block">Parallel Branch (Seal-In / Latch)</span>
                <p className="text-neutral-400 leading-relaxed">
                  Provides an alternative OR path to maintain power to the output contactor even after releasing a momentary pushbutton.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Address Formats */}
          <div className="space-y-2">
            <h3 className="font-bold text-neutral-100 flex items-center gap-1.5 text-sm">
              <Terminal className="w-4 h-4 text-amber-400" /> Siemens S7-1200 Address Syntax
            </h3>
            <div className="p-3 rounded bg-neutral-900/90 border border-neutral-800 font-mono text-[11px] space-y-1.5">
              <div className="flex justify-between border-b border-neutral-800 pb-1">
                <span className="text-blue-400">I0.0 - I127.7</span>
                <span className="text-neutral-400">Digital Physical Inputs (Pushbuttons, Sensors)</span>
              </div>
              <div className="flex justify-between border-b border-neutral-800 pb-1">
                <span className="text-amber-400">Q0.0 - Q127.7</span>
                <span className="text-neutral-400">Digital Physical Outputs (Motors, Valves, Lamps)</span>
              </div>
              <div className="flex justify-between border-b border-neutral-800 pb-1">
                <span className="text-green-400">M0.0 - M255.7</span>
                <span className="text-neutral-400">Internal Merker / Flag Memory Bits</span>
              </div>
              <div className="flex justify-between border-b border-neutral-800 pb-1">
                <span className="text-cyan-400">T1 - T255</span>
                <span className="text-neutral-400">Timer Function Blocks (TON, TOF)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-400">C1 - C255</span>
                <span className="text-neutral-400">Counter Function Blocks (CTU, CTD)</span>
              </div>
            </div>
          </div>

          {/* Section 3: Keyboard Shortcuts */}
          <div className="space-y-2">
            <h3 className="font-bold text-neutral-100 flex items-center gap-1.5 text-sm">
              <Keyboard className="w-4 h-4 text-purple-400" /> Keyboard Shortcuts
            </h3>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex justify-between p-2 rounded bg-neutral-900/50 border border-neutral-800">
                <span className="text-neutral-400">Save Project</span>
                <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 font-mono text-neutral-200 border border-neutral-700">Ctrl + S</kbd>
              </div>
              <div className="flex justify-between p-2 rounded bg-neutral-900/50 border border-neutral-800">
                <span className="text-neutral-400">Undo / Redo</span>
                <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 font-mono text-neutral-200 border border-neutral-700">Ctrl + Z / Y</kbd>
              </div>
              <div className="flex justify-between p-2 rounded bg-neutral-900/50 border border-neutral-800">
                <span className="text-neutral-400">Delete Element</span>
                <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 font-mono text-neutral-200 border border-neutral-700">Delete</kbd>
              </div>
              <div className="flex justify-between p-2 rounded bg-neutral-900/50 border border-neutral-800">
                <span className="text-neutral-400">Toggle Contact (Sim)</span>
                <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 font-mono text-neutral-200 border border-neutral-700">Click Contact</kbd>
              </div>
            </div>
          </div>

          {/* Section 4: Developer Credit */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/40 via-neutral-900/80 to-blue-950/30 border border-emerald-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-neutral-100 text-sm">Eng. Alaa Mohammed</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                    Lead Developer & Architect
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  تم التصميم والتطوير بواسطة: <strong className="text-neutral-200">المهندس علاء محمد (Eng. Alaa Mohammed)</strong> — مهندس نظم التحكم والأتمتة الصناعية.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-700/60 bg-[#252525] flex items-center justify-between">
          <div className="text-[11px] text-neutral-400 font-mono">
            Designed for Industrial Automation & Digital Twin Systems
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#0066ff] hover:bg-[#0052cc] text-white text-xs font-semibold cursor-pointer transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
