import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ProjectFile, 
  LadderRung, 
  LadderElement, 
  LadderElementType, 
  IOTag, 
  SimulationStatus, 
  ThemeStyle, 
  ActiveSideNav, 
  ActiveBottomTab,
  DiagnosticItem,
  Address
} from './types/plc';
import { SimulationEngine } from './engine/simulationEngine';
import { projectStorage } from './storage/projectStorage';
import { sampleProjects } from './data/sampleProjects';
import { defaultDialect, findDuplicateAddresses } from './utils/addressParser';

import { TopAppBar } from './components/TopAppBar';
import { SideNavBar } from './components/SideNavBar';
import { ToolboxPanel } from './components/ToolboxPanel';
import { LadderCanvas } from './components/LadderCanvas';
import { IOTable } from './components/IOTable';
import { DigitalTwin3D } from './components/DigitalTwin3D';
import { InspectorPanel } from './components/InspectorPanel';
import { BottomPanel } from './components/BottomPanel';
import { ProjectExplorerModal } from './components/ProjectExplorerModal';
import { QuickHelpModal } from './components/QuickHelpModal';

import confetti from 'canvas-confetti';

export function App() {
  // Active Project State
  const [project, setProject] = useState<ProjectFile>(sampleProjects[0]);
  const [allProjects, setAllProjects] = useState<ProjectFile[]>(sampleProjects);
  const [isLoaded, setIsLoaded] = useState(false);

  // Undo / Redo History
  const [history, setHistory] = useState<ProjectFile[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Active Selection
  const [selectedRungId, setSelectedRungId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // UI Navigation & Layout
  const [activeNav, setActiveNav] = useState<ActiveSideNav>('toolbox');
  const [activeBottomTab, setActiveBottomTab] = useState<ActiveBottomTab>('watch');
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(true);
  const [theme, setTheme] = useState<ThemeStyle>('industrial');

  // Modals
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // Simulation State
  const [simStatus, setSimStatus] = useState<SimulationStatus>('OFFLINE');
  const [scanTimeMs, setScanTimeMs] = useState(20);
  const [scanCount, setScanCount] = useState(0);

  // References
  const simEngineRef = useRef<SimulationEngine>(new SimulationEngine());
  const simIntervalRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load initial project from IndexedDB
  useEffect(() => {
    async function init() {
      try {
        const loaded = await projectStorage.loadActiveProject();
        const storedList = await projectStorage.listAllProjects();
        setProject(loaded);
        setAllProjects(storedList);
        setSelectedRungId(loaded.ladder[0]?.id || null);
        setHistory([loaded]);
        setHistoryIndex(0);
      } catch (err) {
        console.warn('Init project load error:', err);
      } finally {
        setIsLoaded(true);
      }
    }
    init();
  }, []);

  // Update history on state change
  const pushHistory = useCallback((newProject: ProjectFile) => {
    setHistory((prev) => {
      const upToCurrent = prev.slice(0, historyIndex + 1);
      return [...upToCurrent, newProject];
    });
    setHistoryIndex((prev) => prev + 1);
    setProject(newProject);
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1;
      setHistoryIndex(targetIndex);
      setProject(history[targetIndex]);
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const targetIndex = historyIndex + 1;
      setHistoryIndex(targetIndex);
      setProject(history[targetIndex]);
    }
  }, [historyIndex, history]);

  // Diagnostics evaluation
  const diagnostics: DiagnosticItem[] = React.useMemo(() => {
    const list: DiagnosticItem[] = [];
    const { conflicts } = findDuplicateAddresses(project.ioMap);

    // Duplicate address check
    conflicts.forEach((c) => {
      list.push({
        id: `conf_${c.address}`,
        type: 'WARNING',
        code: 'W001_DUPLICATE_ADDR',
        message: `Duplicate address ${c.address} assigned to symbols: ${c.symbols.join(', ')}`,
        timestamp: new Date().toLocaleTimeString(),
      });
    });

    // Check rungs with missing coils
    project.ladder.forEach((rung) => {
      const hasCoil = rung.elements.some((e) => e.type === 'COIL' || e.type === 'SET_COIL' || e.type === 'RESET_COIL' || e.type === 'TON' || e.type === 'TOF' || e.type === 'CTU');
      if (!hasCoil) {
        list.push({
          id: `rung_no_coil_${rung.id}`,
          type: 'INFO',
          code: 'I002_NO_OUTPUT_COIL',
          message: `Rung ${rung.number} has no active output coil or timer block.`,
          location: { rungNumber: rung.number },
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    });

    return list;
  }, [project]);

  // Execute a single scan step
  const executeScanStep = useCallback(() => {
    const res = simEngineRef.current.executeScan(project.ladder, project.ioMap, project.plc.scanCycleMs);
    setScanCount(res.scanCount);
    setScanTimeMs(res.scanCycleMs);

    // Update evaluated rungs & tag states
    setProject((prev) => ({
      ...prev,
      ladder: res.evaluatedRungs,
      ioMap: res.updatedTags,
    }));
  }, [project.ladder, project.ioMap, project.plc.scanCycleMs]);

  // Simulation execution loop
  useEffect(() => {
    if (simStatus === 'RUNNING') {
      simIntervalRef.current = window.setInterval(() => {
        executeScanStep();
      }, project.plc.scanCycleMs || 20);
    } else {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
    }

    return () => {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
      }
    };
  }, [simStatus, executeScanStep, project.plc.scanCycleMs]);

  // Simulation Handlers
  const handleRunSim = () => {
    setSimStatus('RUNNING');
  };

  const handlePauseSim = () => {
    setSimStatus('PAUSED');
  };

  const handleStepSim = () => {
    setSimStatus('SINGLE_STEP');
    executeScanStep();
  };

  const handleStopSim = () => {
    setSimStatus('OFFLINE');
    simEngineRef.current.reset();

    // Reset non-forced tags and de-energize rungs
    setProject((prev) => ({
      ...prev,
      ladder: prev.ladder.map((r) => ({
        ...r,
        isEnergized: false,
        elements: r.elements.map((e) => ({
          ...e,
          isEnergized: false,
          powerPassed: false,
          params: {
            ...e.params,
            elapsedTimeMs: 0,
            currentCount: 0,
          },
        })),
      })),
      ioMap: prev.ioMap.map((t) => ({
        ...t,
        currentValue: t.isForced && t.forcedValue !== undefined ? t.forcedValue : (t.dataType === 'BOOL' ? false : 0),
      })),
    }));
  };

  // Toggle digital value of a contact / tag
  const handleToggleContactValue = (addressStr?: string, symbol?: string) => {
    setProject((prev) => {
      const updatedTags = prev.ioMap.map((tag) => {
        const isMatch =
          (symbol && tag.symbol.toUpperCase() === symbol.toUpperCase()) ||
          (addressStr && tag.address.rawString.toUpperCase() === addressStr.toUpperCase());

        if (isMatch && tag.dataType === 'BOOL') {
          const newVal = !tag.currentValue;
          if (newVal) {
            // Optional mini confetti when turning on a primary start button
            if (tag.symbol.includes('START') || tag.symbol.includes('RUN')) {
              try {
                confetti({ particleCount: 30, spread: 60, origin: { y: 0.8 } });
              } catch (e) {}
            }
          }
          return {
            ...tag,
            currentValue: newVal,
            forcedValue: tag.isForced ? newVal : tag.forcedValue,
          };
        }
        return tag;
      });

      return {
        ...prev,
        ioMap: updatedTags,
      };
    });
  };

  // Toggle force state of a tag
  const handleToggleForce = (tagId: string) => {
    setProject((prev) => {
      const updatedTags = prev.ioMap.map((t) => {
        if (t.id === tagId) {
          const nextForced = !t.isForced;
          return {
            ...t,
            isForced: nextForced,
            forcedValue: nextForced ? t.currentValue : undefined,
          };
        }
        return t;
      });
      return { ...prev, ioMap: updatedTags };
    });
  };

  // Direct toggle value of a tag in table / watch
  const handleToggleTagValue = (tagId: string) => {
    setProject((prev) => {
      const updatedTags = prev.ioMap.map((t) => {
        if (t.id === tagId && t.dataType === 'BOOL') {
          const nextVal = !t.currentValue;
          return {
            ...t,
            currentValue: nextVal,
            forcedValue: t.isForced ? nextVal : t.forcedValue,
          };
        }
        return t;
      });
      return { ...prev, ioMap: updatedTags };
    });
  };

  // ---- Ladder Editing Functions ----
  const handleAddRung = () => {
    const newRungNumber = project.ladder.length;
    const newRung: LadderRung = {
      id: `rung_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      number: newRungNumber,
      comment: `Rung ${newRungNumber}: New logic path`,
      elements: [
        {
          id: `elem_no_${Date.now()}`,
          type: 'NO_CONTACT',
          address: { area: 'INPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'I0.0' },
          symbol: 'START_PB',
        },
        {
          id: `elem_coil_${Date.now()}`,
          type: 'COIL',
          address: { area: 'OUTPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'Q0.0' },
          symbol: 'MOTOR_OUT',
        },
      ],
    };

    const updated: ProjectFile = {
      ...project,
      ladder: [...project.ladder, newRung],
    };
    pushHistory(updated);
    setSelectedRungId(newRung.id);
  };

  const handleDeleteRung = (rungId: string) => {
    if (project.ladder.length <= 1) return;
    const updatedLadder = project.ladder
      .filter((r) => r.id !== rungId)
      .map((r, idx) => ({ ...r, number: idx }));

    const updated: ProjectFile = {
      ...project,
      ladder: updatedLadder,
    };
    pushHistory(updated);
    if (selectedRungId === rungId) {
      setSelectedRungId(updatedLadder[0]?.id || null);
    }
  };

  const handleUpdateRungComment = (rungId: string, comment: string) => {
    const updated: ProjectFile = {
      ...project,
      ladder: project.ladder.map((r) => (r.id === rungId ? { ...r, comment } : r)),
    };
    pushHistory(updated);
  };

  const handleAddElementToRung = (rungId: string, type: LadderElementType) => {
    const newElem: LadderElement = {
      id: `elem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      address:
        type === 'COIL' || type === 'SET_COIL' || type === 'RESET_COIL'
          ? { area: 'OUTPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'Q0.0' }
          : type === 'TON' || type === 'TOF'
          ? { area: 'TIMER', byte: 1, dataType: 'TIMER', rawString: 'T1' }
          : type === 'CTU'
          ? { area: 'COUNTER', byte: 1, dataType: 'COUNTER', rawString: 'C1' }
          : { area: 'INPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'I0.0' },
      symbol:
        type === 'COIL' ? 'OUTPUT_VAL' :
        type === 'TON' ? 'TIMER_1' :
        type === 'CTU' ? 'COUNTER_1' : 'INPUT_SIG',
      params:
        type === 'TON' || type === 'TOF' ? { presetTimeMs: 3000, elapsedTimeMs: 0 } :
        type === 'CTU' ? { presetCount: 5, currentCount: 0 } :
        type === 'BRANCH' ? { subBranch: [] } : {},
    };

    const updated: ProjectFile = {
      ...project,
      ladder: project.ladder.map((r) => {
        if (r.id === rungId) {
          // If coil, append at the end; if contact, insert before coils
          if (type === 'COIL' || type === 'SET_COIL' || type === 'RESET_COIL') {
            return { ...r, elements: [...r.elements, newElem] };
          } else {
            const coils = r.elements.filter((e) => e.type === 'COIL' || e.type === 'SET_COIL' || e.type === 'RESET_COIL');
            const nonCoils = r.elements.filter((e) => e.type !== 'COIL' && e.type !== 'SET_COIL' && e.type !== 'RESET_COIL');
            return { ...r, elements: [...nonCoils, newElem, ...coils] };
          }
        }
        return r;
      }),
    };

    pushHistory(updated);
    setSelectedElementId(newElem.id);
  };

  const handleAddElementFromToolbox = (type: LadderElementType) => {
    const targetRungId = selectedRungId || project.ladder[0]?.id;
    if (targetRungId) {
      handleAddElementToRung(targetRungId, type);
    }
  };

  const handleDeleteElement = (elementId: string, rungId: string) => {
    const updated: ProjectFile = {
      ...project,
      ladder: project.ladder.map((r) => {
        if (r.id === rungId) {
          return {
            ...r,
            elements: r.elements.filter((e) => e.id !== elementId),
          };
        }
        return r;
      }),
    };
    pushHistory(updated);
    if (selectedElementId === elementId) {
      setSelectedElementId(null);
    }
  };

  const handleMoveElement = (elementId: string, rungId: string, direction: 'left' | 'right') => {
    const updated: ProjectFile = {
      ...project,
      ladder: project.ladder.map((r) => {
        if (r.id === rungId) {
          const index = r.elements.findIndex((e) => e.id === elementId);
          if (index === -1) return r;
          const targetIndex = direction === 'left' ? index - 1 : index + 1;
          if (targetIndex < 0 || targetIndex >= r.elements.length) return r;

          const copy = [...r.elements];
          const [moved] = copy.splice(index, 1);
          copy.splice(targetIndex, 0, moved);
          return { ...r, elements: copy };
        }
        return r;
      }),
    };
    pushHistory(updated);
  };

  const handleUpdateElement = (updatedElem: LadderElement) => {
    const updated: ProjectFile = {
      ...project,
      ladder: project.ladder.map((r) => ({
        ...r,
        elements: r.elements.map((e) => (e.id === updatedElem.id ? updatedElem : e)),
      })),
    };
    pushHistory(updated);
  };

  // ---- I/O Tag CRUD ----
  const handleAddTag = (newTag: IOTag) => {
    const updated: ProjectFile = {
      ...project,
      ioMap: [...project.ioMap, newTag],
    };
    pushHistory(updated);
  };

  const handleUpdateTag = (updatedTag: IOTag) => {
    const updated: ProjectFile = {
      ...project,
      ioMap: project.ioMap.map((t) => (t.id === updatedTag.id ? updatedTag : t)),
    };
    pushHistory(updated);
  };

  const handleDeleteTag = (tagId: string) => {
    const updated: ProjectFile = {
      ...project,
      ioMap: project.ioMap.filter((t) => t.id !== tagId),
    };
    pushHistory(updated);
  };

  const handleDeleteTags = (tagIds: string[]) => {
    const idSet = new Set(tagIds);
    const updated: ProjectFile = {
      ...project,
      ioMap: project.ioMap.filter((t) => !idSet.has(t.id)),
    };
    pushHistory(updated);
  };

  const handleBulkToggleForce = (tagIds: string[], targetState?: boolean) => {
    const idSet = new Set(tagIds);
    setProject((prev) => {
      const updatedTags = prev.ioMap.map((t) => {
        if (idSet.has(t.id)) {
          const nextForced = targetState !== undefined ? targetState : !t.isForced;
          return {
            ...t,
            isForced: nextForced,
            forcedValue: nextForced ? (t.forcedValue !== undefined ? t.forcedValue : t.currentValue) : undefined,
          };
        }
        return t;
      });
      return { ...prev, ioMap: updatedTags };
    });
  };

  const handleBulkSetValues = (tagIds: string[], val: boolean | number) => {
    const idSet = new Set(tagIds);
    setProject((prev) => {
      const updatedTags = prev.ioMap.map((t) => {
        if (idSet.has(t.id)) {
          return {
            ...t,
            currentValue: val,
            forcedValue: t.isForced ? val : t.forcedValue,
          };
        }
        return t;
      });
      return { ...prev, ioMap: updatedTags };
    });
  };

  // ---- Project Storage Actions ----
  const handleSaveProject = async () => {
    await projectStorage.saveProject(project);
    const updatedList = await projectStorage.listAllProjects();
    setAllProjects(updatedList);
  };

  const handleExportProject = (projToExport?: ProjectFile) => {
    projectStorage.exportProjectJSON(projToExport || project);
  };

  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const imported = projectStorage.parseImportedJSON(text);
        setProject(imported);
        pushHistory(imported);
        await projectStorage.saveProject(imported);
        const list = await projectStorage.listAllProjects();
        setAllProjects(list);
      } catch (err: any) {
        alert(`Failed to import JSON project: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleNewProject = () => {
    const newProj: ProjectFile = {
      formatVersion: '1.0',
      project: {
        id: `proj_${Date.now()}`,
        name: 'Untitled PLC Project',
        author: 'Automation Engineer',
        description: 'New standard industrial ladder diagram project',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      plc: {
        dialect: 'siemens-s7-1200',
        scanCycleMs: 20,
        cpuModel: 'CPU 1214C DC/DC/DC',
      },
      ioMap: [
        {
          id: 'tag_i0',
          symbol: 'START_PB',
          address: { area: 'INPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'I0.0' },
          dataType: 'BOOL',
          description: 'Start Pushbutton (NO)',
          currentValue: false,
        },
        {
          id: 'tag_q0',
          symbol: 'MOTOR_OUT',
          address: { area: 'OUTPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'Q0.0' },
          dataType: 'BOOL',
          description: 'Main Contactor Output',
          currentValue: false,
        },
      ],
      ladder: [
        {
          id: 'rung_0',
          number: 0,
          comment: 'Rung 0: Initial Line',
          elements: [
            {
              id: 'elem_i0',
              type: 'NO_CONTACT',
              address: { area: 'INPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'I0.0' },
              symbol: 'START_PB',
            },
            {
              id: 'elem_q0',
              type: 'COIL',
              address: { area: 'OUTPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'Q0.0' },
              symbol: 'MOTOR_OUT',
            },
          ],
        },
      ],
    };

    setProject(newProj);
    pushHistory(newProj);
    setSelectedRungId(newProj.ladder[0].id);
    setSelectedElementId(null);
  };

  const handleSelectProject = (selected: ProjectFile) => {
    setProject(selected);
    pushHistory(selected);
    setSelectedRungId(selected.ladder[0]?.id || null);
    setSelectedElementId(null);
  };

  // Keyboard Shortcuts (Ctrl+S, Ctrl+Z, Ctrl+Y, Delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveProject();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Delete' && selectedElementId && selectedRungId) {
        // Prevent delete if focused on input/textarea
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
          return;
        }
        e.preventDefault();
        handleDeleteElement(selectedElementId, selectedRungId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, selectedRungId, handleUndo, handleRedo, project]);

  // Selected element lookup
  const selectedElement: LadderElement | null = React.useMemo(() => {
    if (!selectedElementId) return null;
    for (const rung of project.ladder) {
      const found = rung.elements.find((e) => e.id === selectedElementId);
      if (found) return found;
      // Search in branches
      for (const elem of rung.elements) {
        if (elem.params?.subBranch) {
          const subFound = elem.params.subBranch.find((se: LadderElement) => se.id === selectedElementId);
          if (subFound) return subFound;
        }
      }
    }
    return null;
  }, [project.ladder, selectedElementId]);

  const selectedRung: LadderRung | null = React.useMemo(() => {
    return project.ladder.find((r) => r.id === selectedRungId) || null;
  }, [project.ladder, selectedRungId]);

  if (!isLoaded) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#121212] text-neutral-300 font-mono text-xs">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
          <span>Booting LogicPulse Digital Twin Engine...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden font-sans select-none ${
      theme === 'modern'
        ? 'bg-[#f5f5f7] text-[#1d1d1f]'
        : theme === 'legacy'
        ? 'bg-[#ece9d8] text-black'
        : theme === 'cyberpunk'
        ? 'bg-[#0a0a0f] text-[#e5e2e1]'
        : 'bg-[#121212] text-[#e5e2e1]'
    }`}>
      {/* Hidden file input for project import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportFileSelect}
        className="hidden"
      />

      {/* Top Application Bar */}
      <TopAppBar
        project={project}
        simStatus={simStatus}
        theme={theme}
        scanTimeMs={scanTimeMs}
        activeNav={activeNav}
        onSelectNav={setActiveNav}
        onRunSim={handleRunSim}
        onStopSim={handleStopSim}
        onPauseSim={handlePauseSim}
        onStepSim={handleStepSim}
        onSaveProject={handleSaveProject}
        onExportProject={() => handleExportProject(project)}
        onImportClick={() => fileInputRef.current?.click()}
        onNewProject={handleNewProject}
        onOpenProjectList={() => setIsProjectModalOpen(true)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onThemeChange={setTheme}
        onOpenHelp={() => setIsHelpModalOpen(true)}
        errorCount={diagnostics.filter((d) => d.type === 'ERROR').length}
        warningCount={diagnostics.filter((d) => d.type === 'WARNING').length}
      />

      {/* Main Studio Body Workspace */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Side Activity Navigation Bar */}
        <SideNavBar
          activeNav={activeNav}
          onSelectNav={setActiveNav}
          theme={theme}
        />

        {/* Dynamic Left Panel (Toolbox / Project List / Library) */}
        {activeNav === 'toolbox' && (
          <ToolboxPanel
            onAddElement={handleAddElementFromToolbox}
            onAddRung={handleAddRung}
            theme={theme}
          />
        )}

        {/* Center Workspace (Ladder Diagram Canvas, 3D Digital Twin, or I/O Variables Table) */}
        {activeNav === 'variables' ? (
          <IOTable
            tags={project.ioMap}
            onAddTag={handleAddTag}
            onUpdateTag={handleUpdateTag}
            onDeleteTag={handleDeleteTag}
            onDeleteTags={handleDeleteTags}
            onToggleForce={handleToggleForce}
            onBulkToggleForce={handleBulkToggleForce}
            onBulkSetValues={handleBulkSetValues}
            onToggleValue={handleToggleTagValue}
            theme={theme}
            simStatus={simStatus}
          />
        ) : activeNav === 'twin3d' ? (
          <DigitalTwin3D
            project={project}
            simStatus={simStatus}
            onToggleTagValue={handleToggleTagValue}
            onToggleForce={handleToggleForce}
            theme={theme}
          />
        ) : (
          <LadderCanvas
            rungs={project.ladder}
            selectedElementId={selectedElementId}
            selectedRungId={selectedRungId}
            onSelectElement={(elemId, rungId) => {
              setSelectedElementId(elemId);
              setSelectedRungId(rungId);
            }}
            onSelectRung={(rungId) => setSelectedRungId(rungId)}
            onToggleContactValue={handleToggleContactValue}
            onDeleteElement={handleDeleteElement}
            onMoveElement={handleMoveElement}
            onAddRung={handleAddRung}
            onDeleteRung={handleDeleteRung}
            onUpdateRungComment={handleUpdateRungComment}
            onAddElementToRung={handleAddElementToRung}
            simStatus={simStatus}
            theme={theme}
            ioTags={project.ioMap}
          />
        )}

        {/* Right Properties Inspector Panel */}
        <InspectorPanel
          selectedElement={selectedElement}
          selectedRung={selectedRung}
          ioTags={project.ioMap}
          onUpdateElement={handleUpdateElement}
          theme={theme}
          simStatus={simStatus}
          scanTimeMs={scanTimeMs}
        />
      </div>

      {/* Bottom Multi-Tab Diagnostic & Telemetry Console */}
      <BottomPanel
        activeTab={activeBottomTab}
        onSelectTab={setActiveBottomTab}
        isOpen={isBottomPanelOpen}
        onToggleOpen={() => setIsBottomPanelOpen(!isBottomPanelOpen)}
        tags={project.ioMap}
        diagnostics={diagnostics}
        theme={theme}
        simStatus={simStatus}
        scanCount={scanCount}
        scanTimeMs={scanTimeMs}
        onToggleTagValue={handleToggleTagValue}
        onToggleForce={handleToggleForce}
      />

      {/* Modals */}
      <ProjectExplorerModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        currentProjectId={project.project.id}
        allProjects={allProjects}
        onSelectProject={handleSelectProject}
        onNewProject={handleNewProject}
        onExportProject={handleExportProject}
        onImportClick={() => fileInputRef.current?.click()}
      />

      <QuickHelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />
    </div>
  );
}
export default App;
