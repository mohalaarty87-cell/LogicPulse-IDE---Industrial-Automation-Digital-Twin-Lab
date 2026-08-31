import { Address, MemoryArea, DataType, PLCDialect, InstructionDefinition } from '../types/plc';

// Siemens S7-1200 Address Parser & Validator
export class SiemensDialect implements PLCDialect {
  id = 'siemens-s7-1200';
  name = 'Siemens S7-1200 / TIA Portal';

  instructionSet: InstructionDefinition[] = [
    { type: 'NO_CONTACT', name: 'NO Contact (Normally Open)', category: 'Bit Logic', description: 'Examines for 1 (True / High signal)', icon: 'adjust' },
    { type: 'NC_CONTACT', name: 'NC Contact (Normally Closed)', category: 'Bit Logic', description: 'Examines for 0 (Inverted / Low signal)', icon: 'radio_button_checked' },
    { type: 'COIL', name: 'Output Coil', category: 'Bit Logic', description: 'Sets target bit based on rung power flow', icon: 'trip_origin' },
    { type: 'SET_COIL', name: 'Set Coil (S)', category: 'Bit Logic', description: 'Latches target bit ON when energized', icon: 'check_circle' },
    { type: 'RESET_COIL', name: 'Reset Coil (R)', category: 'Bit Logic', description: 'Unlatches target bit to OFF when energized', icon: 'cancel' },
    { type: 'BRANCH', name: 'Parallel Branch (OR)', category: 'Bit Logic', description: 'Creates parallel logic execution path (e.g. Seal-in)', icon: 'account_tree' },
    { type: 'TON', name: 'TON (On-Delay Timer)', category: 'Timers', description: 'Delays turning output ON by Preset Time (PT)', icon: 'timer' },
    { type: 'TOF', name: 'TOF (Off-Delay Timer)', category: 'Timers', description: 'Delays turning output OFF after input drops', icon: 'timer_off' },
    { type: 'TP', name: 'TP (Pulse Timer)', category: 'Timers', description: 'Generates pulse of fixed duration PT', icon: 'flash_on' },
    { type: 'CTU', name: 'CTU (Count Up)', category: 'Counters', description: 'Increments CV on rising edge up to PV', icon: 'plus_one' },
    { type: 'CTD', name: 'CTD (Count Down)', category: 'Counters', description: 'Decrements CV on rising edge down to 0', icon: 'exposure_minus_1' },
    { type: 'CTUD', name: 'CTUD (Count Up/Down)', category: 'Counters', description: 'Bidirectional counter with CU and CD inputs', icon: 'swap_vert' },
    { type: 'COMPARE', name: 'Comparator (CMP ==, >, <)', category: 'Comparator', description: 'Compares numerical values / registers', icon: 'compare_arrows' },
  ];

  parseAddress(raw: string): Address | null {
    if (!raw) return null;
    const clean = raw.trim().toUpperCase();

    // 1. Digital Inputs: I0.0 to I127.7 or %I0.0
    const inputBitMatch = clean.match(/^%?I(\d+)\.([0-7])$/);
    if (inputBitMatch) {
      return {
        area: 'INPUT',
        byte: parseInt(inputBitMatch[1], 10),
        bit: parseInt(inputBitMatch[2], 10),
        dataType: 'BOOL',
        rawString: `I${inputBitMatch[1]}.${inputBitMatch[2]}`,
      };
    }

    // 2. Digital Outputs: Q0.0 to Q127.7 or %Q0.0
    const outputBitMatch = clean.match(/^%?Q(\d+)\.([0-7])$/);
    if (outputBitMatch) {
      return {
        area: 'OUTPUT',
        byte: parseInt(outputBitMatch[1], 10),
        bit: parseInt(outputBitMatch[2], 10),
        dataType: 'BOOL',
        rawString: `Q${outputBitMatch[1]}.${outputBitMatch[2]}`,
      };
    }

    // 3. Memory Bits (Flags/Merkers): M0.0 to M255.7 or %M0.0
    const memoryBitMatch = clean.match(/^%?M(\d+)\.([0-7])$/);
    if (memoryBitMatch) {
      return {
        area: 'MEMORY',
        byte: parseInt(memoryBitMatch[1], 10),
        bit: parseInt(memoryBitMatch[2], 10),
        dataType: 'BOOL',
        rawString: `M${memoryBitMatch[1]}.${memoryBitMatch[2]}`,
      };
    }

    // 4. Data Block Bits: DB1.DBX0.0 or DB10.DBX4.2
    const dbBitMatch = clean.match(/^%?DB(\d+)\.DBX(\d+)\.([0-7])$/);
    if (dbBitMatch) {
      return {
        area: 'DATA_BLOCK',
        dataBlock: parseInt(dbBitMatch[1], 10),
        byte: parseInt(dbBitMatch[2], 10),
        bit: parseInt(dbBitMatch[3], 10),
        dataType: 'BOOL',
        rawString: `DB${dbBitMatch[1]}.DBX${dbBitMatch[2]}.${dbBitMatch[3]}`,
      };
    }

    // 5. Timers: T1 to T255
    const timerMatch = clean.match(/^%?T(\d+)$/);
    if (timerMatch) {
      return {
        area: 'TIMER',
        byte: parseInt(timerMatch[1], 10),
        dataType: 'TIMER',
        rawString: `T${timerMatch[1]}`,
      };
    }

    // 6. Counters: C1 to C255
    const counterMatch = clean.match(/^%?C(\d+)$/);
    if (counterMatch) {
      return {
        area: 'COUNTER',
        byte: parseInt(counterMatch[1], 10),
        dataType: 'COUNTER',
        rawString: `C${counterMatch[1]}`,
      };
    }

    // 7. Word/DWord access: IW0, QW0, MW0, MD0, DB1.DBD0
    const mwMatch = clean.match(/^%?MW(\d+)$/);
    if (mwMatch) {
      return {
        area: 'MEMORY',
        byte: parseInt(mwMatch[1], 10),
        dataType: 'WORD',
        rawString: `MW${mwMatch[1]}`,
      };
    }
    const mdMatch = clean.match(/^%?MD(\d+)$/);
    if (mdMatch) {
      return {
        area: 'MEMORY',
        byte: parseInt(mdMatch[1], 10),
        dataType: 'DWORD',
        rawString: `MD${mdMatch[1]}`,
      };
    }
    const iwMatch = clean.match(/^%?IW(\d+)$/);
    if (iwMatch) {
      return {
        area: 'INPUT',
        byte: parseInt(iwMatch[1], 10),
        dataType: 'WORD',
        rawString: `IW${iwMatch[1]}`,
      };
    }
    const qwMatch = clean.match(/^%?QW(\d+)$/);
    if (qwMatch) {
      return {
        area: 'OUTPUT',
        byte: parseInt(qwMatch[1], 10),
        dataType: 'WORD',
        rawString: `QW${qwMatch[1]}`,
      };
    }

    return null;
  }

  formatAddress(addr: Address): string {
    if (addr.rawString) return addr.rawString;
    if (addr.area === 'INPUT' && addr.bit !== undefined) return `I${addr.byte}.${addr.bit}`;
    if (addr.area === 'OUTPUT' && addr.bit !== undefined) return `Q${addr.byte}.${addr.bit}`;
    if (addr.area === 'MEMORY' && addr.bit !== undefined) return `M${addr.byte}.${addr.bit}`;
    if (addr.area === 'DATA_BLOCK' && addr.dataBlock !== undefined && addr.bit !== undefined) {
      return `DB${addr.dataBlock}.DBX${addr.byte}.${addr.bit}`;
    }
    if (addr.area === 'TIMER') return `T${addr.byte}`;
    if (addr.area === 'COUNTER') return `C${addr.byte}`;
    return `${addr.area}_${addr.byte}`;
  }

  validateAddress(raw: string): { valid: boolean; error?: string } {
    if (!raw || raw.trim() === '') {
      return { valid: false, error: 'Address cannot be empty' };
    }
    const parsed = this.parseAddress(raw);
    if (!parsed) {
      return {
        valid: false,
        error: 'Invalid address syntax. Expected Siemens format e.g. I0.0, Q0.0, M0.0, DB1.DBX0.0, T1, C1',
      };
    }
    return { valid: true };
  }
}

export const defaultDialect = new SiemensDialect();

// Helper to normalize and check for duplicates in I/O Map
export function findDuplicateAddresses(tags: { id: string; symbol: string; address: Address }[]) {
  const addressMap = new Map<string, string[]>();
  const symbolMap = new Map<string, string[]>();

  for (const tag of tags) {
    const addrKey = tag.address.rawString || defaultDialect.formatAddress(tag.address);
    const symKey = tag.symbol.trim().toUpperCase();

    if (!addressMap.has(addrKey)) {
      addressMap.set(addrKey, []);
    }
    addressMap.get(addrKey)!.push(tag.symbol);

    if (symKey) {
      if (!symbolMap.has(symKey)) {
        symbolMap.set(symKey, []);
      }
      symbolMap.get(symKey)!.push(tag.id);
    }
  }

  const conflicts: { address: string; symbols: string[] }[] = [];
  addressMap.forEach((symbols, addr) => {
    if (symbols.length > 1) {
      conflicts.push({ address: addr, symbols });
    }
  });

  const duplicateSymbols: string[] = [];
  symbolMap.forEach((ids, sym) => {
    if (ids.length > 1) {
      duplicateSymbols.push(sym);
    }
  });

  return { conflicts, duplicateSymbols };
}
