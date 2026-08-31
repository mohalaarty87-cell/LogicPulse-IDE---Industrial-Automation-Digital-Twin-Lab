import { LadderRung, LadderElement, IOTag, Address, DataType } from '../types/plc';
import { defaultDialect } from '../utils/addressParser';

export interface ScanResult {
  scanCycleMs: number;
  scanCount: number;
  timestamp: number;
  evaluatedRungs: LadderRung[];
  updatedTags: IOTag[];
}

export class SimulationEngine {
  private lastTimestamp: number = 0;
  private scanCount: number = 0;
  private timerStates: Map<string, { accumulatedMs: number; done: boolean; running: boolean; prevInput: boolean }> = new Map();
  private counterStates: Map<string, { currentCount: number; done: boolean; prevInput: boolean }> = new Map();
  private edgeStates: Map<string, boolean> = new Map();

  constructor() {
    this.reset();
  }

  reset() {
    this.lastTimestamp = 0;
    this.scanCount = 0;
    this.timerStates.clear();
    this.counterStates.clear();
    this.edgeStates.clear();
  }

  // Helper to read current value of an address or tag
  private readTagValue(addr: Address | undefined, symbol: string | undefined, tagMap: Map<string, IOTag>): boolean | number {
    if (!addr && !symbol) return false;

    // Search by address raw string or symbol
    if (addr) {
      const formatted = addr.rawString || defaultDialect.formatAddress(addr);
      for (const tag of tagMap.values()) {
        const tagAddr = tag.address.rawString || defaultDialect.formatAddress(tag.address);
        if (tagAddr === formatted) {
          return tag.isForced && tag.forcedValue !== undefined ? tag.forcedValue : tag.currentValue;
        }
      }
    }

    if (symbol) {
      const tag = tagMap.get(symbol.toUpperCase());
      if (tag) {
        return tag.isForced && tag.forcedValue !== undefined ? tag.forcedValue : tag.currentValue;
      }
    }

    return false;
  }

  // Helper to write value to a tag
  private writeTagValue(
    addr: Address | undefined,
    symbol: string | undefined,
    value: boolean | number,
    tagMap: Map<string, IOTag>,
    updatedMap: Map<string, IOTag>
  ) {
    if (!addr && !symbol) return;

    let targetTag: IOTag | undefined;

    if (addr) {
      const formatted = addr.rawString || defaultDialect.formatAddress(addr);
      for (const tag of tagMap.values()) {
        const tagAddr = tag.address.rawString || defaultDialect.formatAddress(tag.address);
        if (tagAddr === formatted) {
          targetTag = tag;
          break;
        }
      }
    }

    if (!targetTag && symbol) {
      targetTag = tagMap.get(symbol.toUpperCase());
    }

    if (targetTag) {
      if (!targetTag.isForced) {
        targetTag.currentValue = value;
      }
      updatedMap.set(targetTag.id, targetTag);
    }
  }

  // Evaluate a series of elements on a rung or branch
  private evaluateBranch(
    elements: LadderElement[],
    initialPower: boolean,
    deltaMs: number,
    tagMap: Map<string, IOTag>,
    updatedMap: Map<string, IOTag>
  ): { finalPower: boolean; evaluatedElements: LadderElement[] } {
    let currentPower = initialPower;
    const evaluatedElements: LadderElement[] = [];

    for (const elem of elements) {
      const evaluated = { ...elem };

      if (elem.type === 'NO_CONTACT') {
        const bitVal = Boolean(this.readTagValue(elem.address, elem.symbol, tagMap));
        evaluated.isEnergized = bitVal;
        currentPower = currentPower && bitVal;
        evaluated.powerPassed = currentPower;
      } else if (elem.type === 'NC_CONTACT') {
        const bitVal = Boolean(this.readTagValue(elem.address, elem.symbol, tagMap));
        evaluated.isEnergized = !bitVal;
        currentPower = currentPower && !bitVal;
        evaluated.powerPassed = currentPower;
      } else if (elem.type === 'BRANCH') {
        // Parallel branch: evaluate main branch and sub branch
        const subBranchElements = elem.params?.subBranch || [];
        const mainBranchPower = currentPower;
        const subResult = this.evaluateBranch(subBranchElements, mainBranchPower, deltaMs, tagMap, updatedMap);
        
        // Branch passes power if either branch conducts
        const branchConducted = currentPower || subResult.finalPower;
        evaluated.isEnergized = branchConducted;
        evaluated.powerPassed = branchConducted;
        evaluated.params = {
          ...evaluated.params,
          subBranch: subResult.evaluatedElements,
        };
        currentPower = branchConducted;
      } else if (elem.type === 'TON') {
        // On-Delay Timer
        const key = elem.id;
        const presetMs = elem.params?.presetTimeMs || 3000;
        let tState = this.timerStates.get(key) || { accumulatedMs: 0, done: false, running: false, prevInput: false };

        if (currentPower) {
          tState.running = true;
          tState.accumulatedMs = Math.min(presetMs, tState.accumulatedMs + deltaMs);
          tState.done = tState.accumulatedMs >= presetMs;
        } else {
          tState.running = false;
          tState.accumulatedMs = 0;
          tState.done = false;
        }
        tState.prevInput = currentPower;
        this.timerStates.set(key, tState);

        evaluated.isEnergized = tState.done;
        evaluated.powerPassed = currentPower && tState.done;
        evaluated.params = {
          ...evaluated.params,
          elapsedTimeMs: Math.round(tState.accumulatedMs),
          presetTimeMs: presetMs,
        };

        // Write timer output bit if mapped
        if (elem.address || elem.symbol) {
          this.writeTagValue(elem.address, elem.symbol, tState.done, tagMap, updatedMap);
        }
      } else if (elem.type === 'TOF') {
        // Off-Delay Timer
        const key = elem.id;
        const presetMs = elem.params?.presetTimeMs || 3000;
        let tState = this.timerStates.get(key) || { accumulatedMs: 0, done: false, running: false, prevInput: false };

        if (currentPower) {
          tState.running = false;
          tState.accumulatedMs = 0;
          tState.done = true;
        } else {
          if (tState.done) {
            tState.running = true;
            tState.accumulatedMs = Math.min(presetMs, tState.accumulatedMs + deltaMs);
            if (tState.accumulatedMs >= presetMs) {
              tState.done = false;
              tState.running = false;
            }
          }
        }
        tState.prevInput = currentPower;
        this.timerStates.set(key, tState);

        evaluated.isEnergized = tState.done;
        evaluated.powerPassed = tState.done;
        evaluated.params = {
          ...evaluated.params,
          elapsedTimeMs: Math.round(tState.accumulatedMs),
          presetTimeMs: presetMs,
        };

        if (elem.address || elem.symbol) {
          this.writeTagValue(elem.address, elem.symbol, tState.done, tagMap, updatedMap);
        }
      } else if (elem.type === 'CTU') {
        // Count Up Counter
        const key = elem.id;
        const presetCount = elem.params?.presetCount || 5;
        let cState = this.counterStates.get(key) || { currentCount: 0, done: false, prevInput: false };

        // Positive edge detection
        if (currentPower && !cState.prevInput) {
          cState.currentCount = cState.currentCount + 1;
        }
        cState.done = cState.currentCount >= presetCount;
        cState.prevInput = currentPower;
        this.counterStates.set(key, cState);

        evaluated.isEnergized = cState.done;
        evaluated.powerPassed = cState.done;
        evaluated.params = {
          ...evaluated.params,
          currentCount: cState.currentCount,
          presetCount: presetCount,
        };

        if (elem.address || elem.symbol) {
          this.writeTagValue(elem.address, elem.symbol, cState.done, tagMap, updatedMap);
        }
      } else if (elem.type === 'COIL') {
        evaluated.isEnergized = currentPower;
        evaluated.powerPassed = currentPower;
        this.writeTagValue(elem.address, elem.symbol, currentPower, tagMap, updatedMap);
      } else if (elem.type === 'SET_COIL') {
        evaluated.isEnergized = currentPower;
        evaluated.powerPassed = currentPower;
        if (currentPower) {
          this.writeTagValue(elem.address, elem.symbol, true, tagMap, updatedMap);
        }
      } else if (elem.type === 'RESET_COIL') {
        evaluated.isEnergized = currentPower;
        evaluated.powerPassed = currentPower;
        if (currentPower) {
          this.writeTagValue(elem.address, elem.symbol, false, tagMap, updatedMap);
        }
      } else {
        evaluated.isEnergized = currentPower;
        evaluated.powerPassed = currentPower;
      }

      evaluatedElements.push(evaluated);
    }

    return { finalPower: currentPower, evaluatedElements };
  }

  // Run a single full deterministic PLC scan cycle
  public executeScan(rungs: LadderRung[], tags: IOTag[], forcedDeltaMs?: number): ScanResult {
    const now = Date.now();
    const deltaMs = forcedDeltaMs ?? (this.lastTimestamp > 0 ? Math.max(1, Math.min(100, now - this.lastTimestamp)) : 20);
    this.lastTimestamp = now;
    this.scanCount++;

    // Prepare fast lookup maps
    const tagMap = new Map<string, IOTag>();
    tags.forEach((t) => tagMap.set(t.symbol.toUpperCase(), { ...t }));
    const updatedMap = new Map<string, IOTag>();

    const evaluatedRungs: LadderRung[] = [];

    // Evaluate each rung from top to bottom
    for (const rung of rungs) {
      // Left power rail is energized (TRUE)
      const { finalPower, evaluatedElements } = this.evaluateBranch(
        rung.elements,
        true,
        deltaMs,
        tagMap,
        updatedMap
      );

      evaluatedRungs.push({
        ...rung,
        elements: evaluatedElements,
        isEnergized: finalPower,
      });
    }

    // Merge updated tag values back into array
    const finalTags = tags.map((t) => {
      const updated = updatedMap.get(t.id);
      return updated ? { ...updated } : { ...t };
    });

    return {
      scanCycleMs: deltaMs,
      scanCount: this.scanCount,
      timestamp: now,
      evaluatedRungs,
      updatedTags: finalTags,
    };
  }
}
