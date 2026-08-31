import React from 'react';
import { 
  X, 
  FolderOpen, 
  Plus, 
  Download, 
  Upload, 
  Cpu, 
  Check, 
  Sparkles, 
  FileCode2,
  Calendar,
  Layers
} from 'lucide-react';
import { ProjectFile } from '../types/plc';
import { sampleProjects } from '../data/sampleProjects';

interface ProjectExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProjectId: string;
  allProjects: ProjectFile[];
  onSelectProject: (proj: ProjectFile) => void;
  onNewProject: () => void;
  onExportProject: (proj: ProjectFile) => void;
  onImportClick: () => void;
}

export const ProjectExplorerModal: React.FC<ProjectExplorerModalProps> = ({
  isOpen,
  onClose,
  currentProjectId,
  allProjects,
  onSelectProject,
  onNewProject,
  onExportProject,
  onImportClick,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
      <div className="bg-[#1e1e1e] border border-[#333333] rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-700/60 flex items-center justify-between bg-[#252525]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0066ff] flex items-center justify-center text-white">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-neutral-100">Project Manager & Presets</h2>
              <p className="text-xs text-neutral-400">Open pre-built industrial labs or start a new PLC project</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="p-4 bg-[#181818] border-b border-neutral-800 flex items-center justify-between gap-3 flex-wrap">
          <button
            onClick={() => {
              onNewProject();
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-[#0066ff] hover:bg-[#0052cc] text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Blank Project</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onImportClick}
              className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 flex items-center gap-1.5 border border-neutral-700"
            >
              <Upload className="w-3.5 h-3.5 text-purple-400" />
              <span>Import JSON</span>
            </button>
          </div>
        </div>

        {/* Projects List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider px-1">
            Pre-built Digital Twin Labs & Saved Projects
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {allProjects.map((proj) => {
              const isCurrent = proj.project.id === currentProjectId;

              return (
                <div
                  key={proj.project.id}
                  onClick={() => {
                    onSelectProject(proj);
                    onClose();
                  }}
                  className={`p-3.5 rounded-lg border transition-all cursor-pointer flex flex-col justify-between group ${
                    isCurrent
                      ? 'border-[#0066ff] bg-blue-600/10 ring-1 ring-blue-500'
                      : 'border-neutral-800 bg-neutral-900/60 hover:border-neutral-600 hover:bg-neutral-800/50'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-xs text-neutral-100 group-hover:text-blue-400 transition-colors">
                        {proj.project.name}
                      </h3>
                      {isCurrent && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold shrink-0">
                          Active
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                      {proj.project.description || 'Standard Industrial Ladder Logic project.'}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-neutral-800/80 flex items-center justify-between text-[10px] font-mono text-neutral-500">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-neutral-400" />
                      {proj.ladder?.length || 0} Rungs | {proj.ioMap?.length || 0} Tags
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onExportProject(proj);
                      }}
                      className="p-1 rounded text-neutral-400 hover:text-cyan-400"
                      title="Download JSON file"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
