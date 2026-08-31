// ---- Addressing (dialect-agnostic internal representation) ----
export type MemoryArea = 'INPUT' | 'OUTPUT' | 'MEMORY' | 'TIMER' | 'COUNTER' | 'DATA_BLOCK';

export type DataType = 'BOOL' | 'BYTE' | 'WORD' | 'DWORD' | 'INT' | 'REAL' | 'TIMER' | 'COUNTER';

export interface Address {
  area: MemoryArea;
  byte: number;
  bit?: number;        // undefined for word/dword access
  dataBlock?: number;  // Siemens-style DB index, undefined otherwise
  dataType: DataType;
  rawString: string;
}

export interface InstructionDefinition {
  type: LadderElementType;
  name: string;
  category: 'Bit Logic' | 'Timers' | 'Counters' | 'Comparator' | 'Math';
  description: string;
  icon: string;
}

export interface PLCDialect {
  id: string;                 // e.g. "siemens-s7-1200", "delta-dvp"
  name: string;
  parseAddress(raw: string): Address | null;
  formatAddress(addr: Address): string;
  validateAddress(raw: string): { valid: boolean; error?: string };
  instructionSet: InstructionDefinition[];
}

// ---- Ladder Elements ----
export type LadderElementType = 
  | 'NO_CONTACT' 
  | 'NC_CONTACT' 
  | 'COIL' 
  | 'SET_COIL' 
  | 'RESET_COIL'
  | 'TON' 
  | 'TOF' 
  | 'TP' 
  | 'CTU' 
  | 'CTD' 
  | 'CTUD' 
  | 'COMPARE' 
  | 'MOVE'
  | 'BRANCH';

export interface LadderElement {
  id: string;
  type: LadderElementType;
  address?: Address;
  symbol?: string;
  comment?: string;
  params?: {
    presetTimeMs?: number;   // For TON/TOF/TP (e.g. 3000ms)
    elapsedTimeMs?: number;
    presetCount?: number;    // For CTU/CTD
    currentCount?: number;
    compareOp?: '==' | '!=' | '>' | '<' | '>=' | '<=';
    compareVal?: number;
    subBranch?: LadderElement[]; // For parallel branches
    [key: string]: any;
  };
  // Dynamic runtime state calculated during simulation:
  isEnergized?: boolean;
  powerPassed?: boolean;
}

export interface LadderBranch {
  id: string;
  elements: LadderElement[];
}

export interface LadderRung {
  id: string;
  number: number;
  comment?: string;
  elements: LadderElement[];   // Main series line of contacts, branches, coils
  isEnergized?: boolean;       // Overall rung output energized state
}

// ---- Ladder Snippet & Library System ----
export type SnippetCategory = 
  | 'Motors & Drives' 
  | 'Timers & Counters' 
  | 'Safety' 
  | 'Interlocks' 
  | 'Process' 
  | 'Custom';

export interface LadderSnippet {
  id: string;
  name: string;
  category: SnippetCategory;
  description: string;
  createdAt: string;
  isBuiltIn?: boolean;
  rung: LadderRung;
  ioTags: IOTag[]; // Associated IOTag definitions packaged with this rung
  author?: string;
}

// ---- I/O Tag (shared by Ladder, Electrical, 3D, HMI, SCADA) ----
export interface IOTag {
  id: string;
  symbol: string;              // e.g. "START_PB"
  address: Address;
  dataType: DataType;
  description: string;
  physicalDevice?: string;     // links to an electrical component id
  simulationObjectId?: string; // links to a 3D scene object id
  currentValue: boolean | number;
  isForced?: boolean;          // Software force state
  forcedValue?: boolean | number;
}

// ---- Project file (versioned) ----
export interface ProjectFile {
  formatVersion: '1.0';
  project: {
    id: string;
    name: string;
    author?: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
  };
  plc: {
    dialect: string;
    scanCycleMs: number;
    cpuModel: string;
  };
  ladder: LadderRung[];
  ioMap: IOTag[];
}

// ---- Simulation & IDE State ----
export type SimulationStatus = 'OFFLINE' | 'RUNNING' | 'PAUSED' | 'SINGLE_STEP';

export interface DiagnosticItem {
  id: string;
  type: 'ERROR' | 'WARNING' | 'INFO';
  code: string;
  message: string;
  location?: {
    rungNumber?: number;
    elementId?: string;
    tagSymbol?: string;
  };
  timestamp: string;
}

export type ThemeStyle = 'industrial' | 'modern' | 'cyberpunk' | 'legacy' | 'edu';

export type ActiveBottomTab = 'tags' | 'watch' | 'errors' | 'warnings' | 'messages' | 'output';

export type ActiveSideNav = 'project' | 'toolbox' | 'variables' | 'twin3d' | 'library' | 'network' | 'settings' | 'console';
