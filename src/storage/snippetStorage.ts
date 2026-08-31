import { LadderSnippet, LadderRung, IOTag, LadderElement } from '../types/plc';

const SNIPPETS_STORAGE_KEY = 'logicpulse_custom_ladder_snippets';

// Built-in industrial logic snippet library
export const DEFAULT_BUILTIN_SNIPPETS: LadderSnippet[] = [
  {
    id: 'snip_dol_motor',
    name: 'Motor DOL Starter with Seal-In Latch',
    category: 'Motors & Drives',
    description: 'Standard 3-wire direct-on-line motor starter with latching auxiliary contact seal-in, stop pushbutton, and thermal overload trip protection.',
    createdAt: '2026-08-30T00:00:00Z',
    isBuiltIn: true,
    author: 'Siemens Industrial Library',
    rung: {
      id: 'rung_snip_dol',
      number: 0,
      comment: 'DOL Motor Starter with Start/Stop and Seal-in Latch',
      elements: [
        {
          id: 'elem_dol_branch',
          type: 'BRANCH',
          symbol: 'SEAL_IN',
          params: {
            subBranch: [
              {
                id: 'elem_dol_seal',
                type: 'NO_CONTACT',
                address: { area: 'OUTPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'Q0.0' },
                symbol: 'MOTOR_OUT',
                comment: 'Auxiliary Seal-in Contact',
              },
            ],
          },
        },
        {
          id: 'elem_dol_start',
          type: 'NO_CONTACT',
          address: { area: 'INPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'I0.0' },
          symbol: 'START_PB',
          comment: 'Start Pushbutton (NO)',
        },
        {
          id: 'elem_dol_stop',
          type: 'NC_CONTACT',
          address: { area: 'INPUT', byte: 0, bit: 1, dataType: 'BOOL', rawString: 'I0.1' },
          symbol: 'STOP_PB',
          comment: 'Stop Pushbutton (NC)',
        },
        {
          id: 'elem_dol_ol',
          type: 'NC_CONTACT',
          address: { area: 'INPUT', byte: 0, bit: 2, dataType: 'BOOL', rawString: 'I0.2' },
          symbol: 'OVERLOAD_TRIP',
          comment: 'Thermal Overload Trip Relay (NC)',
        },
        {
          id: 'elem_dol_coil',
          type: 'COIL',
          address: { area: 'OUTPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'Q0.0' },
          symbol: 'MOTOR_OUT',
          comment: 'Main Motor Drive Contactor',
        },
      ],
    },
    ioTags: [
      {
        id: 'tag_snip_start_pb',
        symbol: 'START_PB',
        address: { area: 'INPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'I0.0' },
        dataType: 'BOOL',
        description: 'Green Momentary Start Pushbutton (Normally Open)',
        currentValue: false,
      },
      {
        id: 'tag_snip_stop_pb',
        symbol: 'STOP_PB',
        address: { area: 'INPUT', byte: 0, bit: 1, dataType: 'BOOL', rawString: 'I0.1' },
        dataType: 'BOOL',
        description: 'Red Momentary Stop Pushbutton (Normally Closed in hardware)',
        currentValue: false,
      },
      {
        id: 'tag_snip_ol',
        symbol: 'OVERLOAD_TRIP',
        address: { area: 'INPUT', byte: 0, bit: 2, dataType: 'BOOL', rawString: 'I0.2' },
        dataType: 'BOOL',
        description: 'Bimetallic Thermal Overload Auxiliary Contact',
        currentValue: false,
      },
      {
        id: 'tag_snip_motor',
        symbol: 'MOTOR_OUT',
        address: { area: 'OUTPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'Q0.0' },
        dataType: 'BOOL',
        description: 'Main Drive Contactor Coil (KM1)',
        currentValue: false,
      },
    ],
  },
  {
    id: 'snip_fwd_rev',
    name: 'Forward / Reverse Interlocked Starter',
    category: 'Motors & Drives',
    description: 'Forward drive circuit protected by an electrical interlock normally-closed auxiliary contact from the reverse contactor.',
    createdAt: '2026-08-30T00:00:00Z',
    isBuiltIn: true,
    author: 'Industrial Drive Standards',
    rung: {
      id: 'rung_snip_fwd',
      number: 0,
      comment: 'Forward Motor Starter with Reverse Electrical Interlock',
      elements: [
        {
          id: 'elem_fwd_start',
          type: 'NO_CONTACT',
          address: { area: 'INPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'I0.0' },
          symbol: 'FWD_START',
          comment: 'Forward Command PB',
        },
        {
          id: 'elem_rev_interlock',
          type: 'NC_CONTACT',
          address: { area: 'OUTPUT', byte: 0, bit: 1, dataType: 'BOOL', rawString: 'Q0.1' },
          symbol: 'REV_COIL',
          comment: 'Electrical Interlock (NC Reverse Contact)',
        },
        {
          id: 'elem_fwd_stop',
          type: 'NC_CONTACT',
          address: { area: 'INPUT', byte: 0, bit: 2, dataType: 'BOOL', rawString: 'I0.2' },
          symbol: 'MASTER_STOP',
          comment: 'Master Stop PB',
        },
        {
          id: 'elem_fwd_coil',
          type: 'COIL',
          address: { area: 'OUTPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'Q0.0' },
          symbol: 'FWD_COIL',
          comment: 'Forward Direction Contactor',
        },
      ],
    },
    ioTags: [
      {
        id: 'tag_snip_fwd_start',
        symbol: 'FWD_START',
        address: { area: 'INPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'I0.0' },
        dataType: 'BOOL',
        description: 'Forward Motion Start Pushbutton',
        currentValue: false,
      },
      {
        id: 'tag_snip_rev_start',
        symbol: 'REV_START',
        address: { area: 'INPUT', byte: 0, bit: 1, dataType: 'BOOL', rawString: 'I0.1' },
        dataType: 'BOOL',
        description: 'Reverse Motion Start Pushbutton',
        currentValue: false,
      },
      {
        id: 'tag_snip_master_stop',
        symbol: 'MASTER_STOP',
        address: { area: 'INPUT', byte: 0, bit: 2, dataType: 'BOOL', rawString: 'I0.2' },
        dataType: 'BOOL',
        description: 'Main Drive Master Stop Button',
        currentValue: false,
      },
      {
        id: 'tag_snip_fwd_coil',
        symbol: 'FWD_COIL',
        address: { area: 'OUTPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'Q0.0' },
        dataType: 'BOOL',
        description: 'Forward Motion Power Contactor',
        currentValue: false,
      },
      {
        id: 'tag_snip_rev_coil',
        symbol: 'REV_COIL',
        address: { area: 'OUTPUT', byte: 0, bit: 1, dataType: 'BOOL', rawString: 'Q0.1' },
        dataType: 'BOOL',
        description: 'Reverse Motion Power Contactor',
        currentValue: false,
      },
    ],
  },
  {
    id: 'snip_conveyor_sorter',
    name: 'Conveyor Optical Sorter (TON Timer + Pusher)',
    category: 'Process',
    description: 'Optical detection of parts on conveyor belt feeding an On-Delay (TON 1500ms) timer before firing pneumatic diverter pusher solenoid.',
    createdAt: '2026-08-30T00:00:00Z',
    isBuiltIn: true,
    author: 'Material Handling Library',
    rung: {
      id: 'rung_snip_sorter',
      number: 0,
      comment: 'Optical Part Diverter Pusher with On-Delay Timer',
      elements: [
        {
          id: 'elem_snip_photo',
          type: 'NO_CONTACT',
          address: { area: 'INPUT', byte: 0, bit: 3, dataType: 'BOOL', rawString: 'I0.3' },
          symbol: 'PHOTO_SENSOR',
          comment: 'Reflective Optical Sensor',
        },
        {
          id: 'elem_snip_ton',
          type: 'TON',
          address: { area: 'TIMER', byte: 1, dataType: 'TIMER', rawString: 'T1' },
          symbol: 'PUSHER_DLY',
          comment: 'Part In-Flight Transit Delay',
          params: { presetTimeMs: 1500, elapsedTimeMs: 0 },
        },
        {
          id: 'elem_snip_pusher',
          type: 'COIL',
          address: { area: 'OUTPUT', byte: 0, bit: 2, dataType: 'BOOL', rawString: 'Q0.2' },
          symbol: 'PUSHER_SOL',
          comment: 'Pneumatic Diverter Solenoid Valve',
        },
      ],
    },
    ioTags: [
      {
        id: 'tag_snip_photo',
        symbol: 'PHOTO_SENSOR',
        address: { area: 'INPUT', byte: 0, bit: 3, dataType: 'BOOL', rawString: 'I0.3' },
        dataType: 'BOOL',
        description: 'Photoelectric Diffuse Sensor detecting arriving part',
        currentValue: false,
      },
      {
        id: 'tag_snip_pusher_dly',
        symbol: 'PUSHER_DLY',
        address: { area: 'TIMER', byte: 1, dataType: 'TIMER', rawString: 'T1' },
        dataType: 'TIMER',
        description: 'On-Delay Timer counting part transit to diverter gate',
        currentValue: false,
      },
      {
        id: 'tag_snip_pusher_sol',
        symbol: 'PUSHER_SOL',
        address: { area: 'OUTPUT', byte: 0, bit: 2, dataType: 'BOOL', rawString: 'Q0.2' },
        dataType: 'BOOL',
        description: '5/2-way Pneumatic Solenoid Valve Actuating Diverter Cylinder',
        currentValue: false,
      },
    ],
  },
  {
    id: 'snip_batch_counter',
    name: 'Batch Part Counter with Limit Preset (CTU)',
    category: 'Timers & Counters',
    description: 'High-speed count-up (CTU) accumulator counting passing parts up to preset target (10 parts) and triggering downstream batch alarm.',
    createdAt: '2026-08-30T00:00:00Z',
    isBuiltIn: true,
    author: 'Packaging Systems Lab',
    rung: {
      id: 'rung_snip_counter',
      number: 0,
      comment: 'Part Count-Up (CTU) with Target Alarm Trigger',
      elements: [
        {
          id: 'elem_snip_prox',
          type: 'NO_CONTACT',
          address: { area: 'INPUT', byte: 0, bit: 4, dataType: 'BOOL', rawString: 'I0.4' },
          symbol: 'PROX_SENSOR',
          comment: 'Inductive Proximity Sensor',
        },
        {
          id: 'elem_snip_ctu',
          type: 'CTU',
          address: { area: 'COUNTER', byte: 1, dataType: 'COUNTER', rawString: 'C1' },
          symbol: 'BATCH_CTR',
          comment: 'Batch Quantity Counter',
          params: { presetCount: 10, currentCount: 0 },
        },
        {
          id: 'elem_snip_alarm',
          type: 'COIL',
          address: { area: 'OUTPUT', byte: 0, bit: 3, dataType: 'BOOL', rawString: 'Q0.3' },
          symbol: 'BATCH_DONE',
          comment: 'Batch Complete Strobe Light',
        },
      ],
    },
    ioTags: [
      {
        id: 'tag_snip_prox',
        symbol: 'PROX_SENSOR',
        address: { area: 'INPUT', byte: 0, bit: 4, dataType: 'BOOL', rawString: 'I0.4' },
        dataType: 'BOOL',
        description: 'Inductive Proximity Sensor on Conveyor Wheel',
        currentValue: false,
      },
      {
        id: 'tag_snip_batch_ctr',
        symbol: 'BATCH_CTR',
        address: { area: 'COUNTER', byte: 1, dataType: 'COUNTER', rawString: 'C1' },
        dataType: 'COUNTER',
        description: 'CTU Up-Counter recording parts per batch',
        currentValue: 0,
      },
      {
        id: 'tag_snip_batch_done',
        symbol: 'BATCH_DONE',
        address: { area: 'OUTPUT', byte: 0, bit: 3, dataType: 'BOOL', rawString: 'Q0.3' },
        dataType: 'BOOL',
        description: 'Batch Complete Strobe & Audible Annunciator',
        currentValue: false,
      },
    ],
  },
  {
    id: 'snip_two_hand_safety',
    name: 'Two-Hand Anti-Tiedown Safety Circuit',
    category: 'Safety',
    description: 'Industrial machine safety interlock requiring concurrent left and right hand operator pushbuttons plus safety guard confirmation.',
    createdAt: '2026-08-30T00:00:00Z',
    isBuiltIn: true,
    author: 'Machinery Safety Standards ISO 13849',
    rung: {
      id: 'rung_snip_twohand',
      number: 0,
      comment: 'Two-Hand Concurrent Actuation with Safety Guard Interlock',
      elements: [
        {
          id: 'elem_snip_hand_l',
          type: 'NO_CONTACT',
          address: { area: 'INPUT', byte: 0, bit: 6, dataType: 'BOOL', rawString: 'I0.6' },
          symbol: 'PB_HAND_L',
          comment: 'Left Hand Control Button',
        },
        {
          id: 'elem_snip_hand_r',
          type: 'NO_CONTACT',
          address: { area: 'INPUT', byte: 0, bit: 7, dataType: 'BOOL', rawString: 'I0.7' },
          symbol: 'PB_HAND_R',
          comment: 'Right Hand Control Button',
        },
        {
          id: 'elem_snip_guard',
          type: 'NC_CONTACT',
          address: { area: 'INPUT', byte: 1, bit: 0, dataType: 'BOOL', rawString: 'I1.0' },
          symbol: 'SAFETY_GUARD',
          comment: 'Light Curtain / Door Interlock (NC)',
        },
        {
          id: 'elem_snip_press',
          type: 'COIL',
          address: { area: 'OUTPUT', byte: 0, bit: 4, dataType: 'BOOL', rawString: 'Q0.4' },
          symbol: 'PRESS_ACTUATE',
          comment: 'Hydraulic Press Ram Solenoid',
        },
      ],
    },
    ioTags: [
      {
        id: 'tag_snip_hand_l',
        symbol: 'PB_HAND_L',
        address: { area: 'INPUT', byte: 0, bit: 6, dataType: 'BOOL', rawString: 'I0.6' },
        dataType: 'BOOL',
        description: 'Operator Ergonomic Palm Button (Left Hand)',
        currentValue: false,
      },
      {
        id: 'tag_snip_hand_r',
        symbol: 'PB_HAND_R',
        address: { area: 'INPUT', byte: 0, bit: 7, dataType: 'BOOL', rawString: 'I0.7' },
        dataType: 'BOOL',
        description: 'Operator Ergonomic Palm Button (Right Hand)',
        currentValue: false,
      },
      {
        id: 'tag_snip_guard',
        symbol: 'SAFETY_GUARD',
        address: { area: 'INPUT', byte: 1, bit: 0, dataType: 'BOOL', rawString: 'I1.0' },
        dataType: 'BOOL',
        description: 'Type 4 Safety Light Curtain Muting Channel',
        currentValue: false,
      },
      {
        id: 'tag_snip_press',
        symbol: 'PRESS_ACTUATE',
        address: { area: 'OUTPUT', byte: 0, bit: 4, dataType: 'BOOL', rawString: 'Q0.4' },
        dataType: 'BOOL',
        description: 'Hydraulic Stamping Press Solenoid Valve',
        currentValue: false,
      },
    ],
  },
  {
    id: 'snip_estop_dual_channel',
    name: 'Dual-Channel Emergency Stop & Master Latch',
    category: 'Safety',
    description: 'Cat 4 / PLe certified dual-channel emergency stop monitor circuit with monitored reset pushbutton and latching safety master bit.',
    createdAt: '2026-08-30T00:00:00Z',
    isBuiltIn: true,
    author: 'Safety Automation Library',
    rung: {
      id: 'rung_snip_estop',
      number: 0,
      comment: 'Dual-Channel E-Stop Circuit with Reset Pushbutton',
      elements: [
        {
          id: 'elem_snip_estop_1',
          type: 'NC_CONTACT',
          address: { area: 'INPUT', byte: 1, bit: 1, dataType: 'BOOL', rawString: 'I1.1' },
          symbol: 'ESTOP_CH1',
          comment: 'E-Stop Red Mushroom Channel 1',
        },
        {
          id: 'elem_snip_estop_2',
          type: 'NC_CONTACT',
          address: { area: 'INPUT', byte: 1, bit: 2, dataType: 'BOOL', rawString: 'I1.2' },
          symbol: 'ESTOP_CH2',
          comment: 'E-Stop Red Mushroom Channel 2',
        },
        {
          id: 'elem_snip_s_reset',
          type: 'NO_CONTACT',
          address: { area: 'INPUT', byte: 1, bit: 3, dataType: 'BOOL', rawString: 'I1.3' },
          symbol: 'SAFETY_RESET',
          comment: 'Blue Safety Reset Pushbutton',
        },
        {
          id: 'elem_snip_s_ok',
          type: 'SET_COIL',
          address: { area: 'MEMORY', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'M0.0' },
          symbol: 'SAFETY_OK',
          comment: 'Master Safety Relay Latch Bit',
        },
      ],
    },
    ioTags: [
      {
        id: 'tag_snip_estop1',
        symbol: 'ESTOP_CH1',
        address: { area: 'INPUT', byte: 1, bit: 1, dataType: 'BOOL', rawString: 'I1.1' },
        dataType: 'BOOL',
        description: 'Emergency Stop Pushbutton Contact Block 1 (NC)',
        currentValue: false,
      },
      {
        id: 'tag_snip_estop2',
        symbol: 'ESTOP_CH2',
        address: { area: 'INPUT', byte: 1, bit: 2, dataType: 'BOOL', rawString: 'I1.2' },
        dataType: 'BOOL',
        description: 'Emergency Stop Pushbutton Contact Block 2 (NC)',
        currentValue: false,
      },
      {
        id: 'tag_snip_sreset',
        symbol: 'SAFETY_RESET',
        address: { area: 'INPUT', byte: 1, bit: 3, dataType: 'BOOL', rawString: 'I1.3' },
        dataType: 'BOOL',
        description: 'Blue Illuminated Manual Safety System Reset Button',
        currentValue: false,
      },
      {
        id: 'tag_snip_sok',
        symbol: 'SAFETY_OK',
        address: { area: 'MEMORY', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'M0.0' },
        dataType: 'BOOL',
        description: 'Master Safety Circuit Energized Internal Flag',
        currentValue: false,
      },
    ],
  },
  {
    id: 'snip_flasher_clock',
    name: 'Oscillating Beacon Flasher (500ms Clock)',
    category: 'Timers & Counters',
    description: 'Repetitive square-wave pulse generator using on-delay timer for pulsing warning beacon or buzzer alarm annunciator.',
    createdAt: '2026-08-30T00:00:00Z',
    isBuiltIn: true,
    author: 'Standard Utilities',
    rung: {
      id: 'rung_snip_flash',
      number: 0,
      comment: 'Periodic Pulse Oscillator Driving Warning Beacon',
      elements: [
        {
          id: 'elem_snip_alarm_en',
          type: 'NO_CONTACT',
          address: { area: 'MEMORY', byte: 0, bit: 2, dataType: 'BOOL', rawString: 'M0.2' },
          symbol: 'ALARM_ACTIVE',
          comment: 'Fault Alarm Active Flag',
        },
        {
          id: 'elem_snip_pulse_tmr',
          type: 'TON',
          address: { area: 'TIMER', byte: 2, dataType: 'TIMER', rawString: 'T2' },
          symbol: 'PULSE_GEN',
          comment: '500ms Duty Cycle Timer',
          params: { presetTimeMs: 500, elapsedTimeMs: 0 },
        },
        {
          id: 'elem_snip_beacon',
          type: 'COIL',
          address: { area: 'OUTPUT', byte: 0, bit: 5, dataType: 'BOOL', rawString: 'Q0.5' },
          symbol: 'BEACON_LIGHT',
          comment: 'Amber Warning Strobe Tower Light',
        },
      ],
    },
    ioTags: [
      {
        id: 'tag_snip_alarm_act',
        symbol: 'ALARM_ACTIVE',
        address: { area: 'MEMORY', byte: 0, bit: 2, dataType: 'BOOL', rawString: 'M0.2' },
        dataType: 'BOOL',
        description: 'Internal Bit indicating unacknowledged system fault',
        currentValue: false,
      },
      {
        id: 'tag_snip_pulse_tmr',
        symbol: 'PULSE_GEN',
        address: { area: 'TIMER', byte: 2, dataType: 'TIMER', rawString: 'T2' },
        dataType: 'TIMER',
        description: 'Timer generating 1Hz square-wave blink cycle',
        currentValue: false,
      },
      {
        id: 'tag_snip_beacon',
        symbol: 'BEACON_LIGHT',
        address: { area: 'OUTPUT', byte: 0, bit: 5, dataType: 'BOOL', rawString: 'Q0.5' },
        dataType: 'BOOL',
        description: 'Stack Light Yellow Indicator Flasher (Q0.5)',
        currentValue: false,
      },
    ],
  },
  {
    id: 'snip_tank_level',
    name: 'Dual-Level Sump Pump Control (High/Low Float)',
    category: 'Process',
    description: 'Level hysteresis pump control starting when high float level switch closes and continuing until low level float breaks.',
    createdAt: '2026-08-30T00:00:00Z',
    isBuiltIn: true,
    author: 'Wastewater & Fluid Control',
    rung: {
      id: 'rung_snip_tank',
      number: 0,
      comment: 'Sump Drainage Pump Latch with High/Low Level Floats',
      elements: [
        {
          id: 'elem_snip_tank_branch',
          type: 'BRANCH',
          symbol: 'PUMP_SEAL',
          params: {
            subBranch: [
              {
                id: 'elem_snip_pump_seal',
                type: 'NO_CONTACT',
                address: { area: 'OUTPUT', byte: 0, bit: 6, dataType: 'BOOL', rawString: 'Q0.6' },
                symbol: 'PUMP_MOTOR',
                comment: 'Pump Run Latch Auxiliary Contact',
              },
            ],
          },
        },
        {
          id: 'elem_snip_high_float',
          type: 'NO_CONTACT',
          address: { area: 'INPUT', byte: 1, bit: 4, dataType: 'BOOL', rawString: 'I1.4' },
          symbol: 'LEVEL_HIGH_SW',
          comment: 'High Level Alarm Float Switch (NO)',
        },
        {
          id: 'elem_snip_low_float',
          type: 'NC_CONTACT',
          address: { area: 'INPUT', byte: 1, bit: 5, dataType: 'BOOL', rawString: 'I1.5' },
          symbol: 'LEVEL_LOW_SW',
          comment: 'Low Level Cutoff Float Switch (NC)',
        },
        {
          id: 'elem_snip_pump_coil',
          type: 'COIL',
          address: { area: 'OUTPUT', byte: 0, bit: 6, dataType: 'BOOL', rawString: 'Q0.6' },
          symbol: 'PUMP_MOTOR',
          comment: 'Submersible Sump Pump Contactor',
        },
      ],
    },
    ioTags: [
      {
        id: 'tag_snip_high_sw',
        symbol: 'LEVEL_HIGH_SW',
        address: { area: 'INPUT', byte: 1, bit: 4, dataType: 'BOOL', rawString: 'I1.4' },
        dataType: 'BOOL',
        description: 'Upper Limit Float Switch in Sump Pit',
        currentValue: false,
      },
      {
        id: 'tag_snip_low_sw',
        symbol: 'LEVEL_LOW_SW',
        address: { area: 'INPUT', byte: 1, bit: 5, dataType: 'BOOL', rawString: 'I1.5' },
        dataType: 'BOOL',
        description: 'Lower Limit Dry-Run Protection Float Switch in Sump Pit',
        currentValue: false,
      },
      {
        id: 'tag_snip_pump_motor',
        symbol: 'PUMP_MOTOR',
        address: { area: 'OUTPUT', byte: 0, bit: 6, dataType: 'BOOL', rawString: 'Q0.6' },
        dataType: 'BOOL',
        description: 'Submersible Drainage Pump Contactor Starter (KM2)',
        currentValue: false,
      },
    ],
  },
];

class SnippetStorageManager {
  /**
   * Loads custom user-created snippets from localStorage
   */
  getCustomSnippets(): LadderSnippet[] {
    try {
      const raw = localStorage.getItem(SNIPPETS_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw) as LadderSnippet[];
      }
    } catch (err) {
      console.warn('Failed to parse custom snippets from localStorage', err);
    }
    return [];
  }

  /**
   * Returns all available snippets (built-in industrial presets + custom user snippets)
   */
  getAllSnippets(): LadderSnippet[] {
    const custom = this.getCustomSnippets();
    return [...custom, ...DEFAULT_BUILTIN_SNIPPETS];
  }

  /**
   * Saves a new or updated custom snippet to localStorage
   */
  saveSnippet(snippet: LadderSnippet): void {
    const custom = this.getCustomSnippets();
    const existingIndex = custom.findIndex((s) => s.id === snippet.id);
    if (existingIndex >= 0) {
      custom[existingIndex] = { ...snippet, createdAt: new Date().toISOString() };
    } else {
      custom.unshift({ ...snippet, isBuiltIn: false, createdAt: new Date().toISOString() });
    }

    try {
      localStorage.setItem(SNIPPETS_STORAGE_KEY, JSON.stringify(custom));
    } catch (err) {
      console.error('Failed to save snippet to localStorage', err);
    }
  }

  /**
   * Deletes a custom snippet by ID
   */
  deleteSnippet(snippetId: string): boolean {
    const custom = this.getCustomSnippets();
    const filtered = custom.filter((s) => s.id !== snippetId);
    if (filtered.length !== custom.length) {
      try {
        localStorage.setItem(SNIPPETS_STORAGE_KEY, JSON.stringify(filtered));
        return true;
      } catch (err) {
        console.error('Failed to delete snippet', err);
      }
    }
    return false;
  }

  /**
   * Exports all custom and built-in snippets as a JSON download
   */
  exportSnippetsJSON(): void {
    const all = this.getAllSnippets();
    const jsonStr = JSON.stringify(all, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ladder_snippets_library_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Imports snippets from a JSON string, merging with existing custom snippets
   */
  importSnippetsJSON(jsonStr: string): LadderSnippet[] {
    const parsed = JSON.parse(jsonStr) as LadderSnippet[];
    if (!Array.isArray(parsed)) {
      throw new Error('Invalid snippet file format: Expected an array of snippets.');
    }

    const validSnippets: LadderSnippet[] = [];
    for (const item of parsed) {
      if (item.name && item.rung && Array.isArray(item.rung.elements)) {
        validSnippets.push({
          ...item,
          id: `snip_imp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          isBuiltIn: false,
          createdAt: new Date().toISOString(),
          ioTags: item.ioTags || [],
        });
      }
    }

    const custom = this.getCustomSnippets();
    const merged = [...validSnippets, ...custom];
    localStorage.setItem(SNIPPETS_STORAGE_KEY, JSON.stringify(merged));
    return merged;
  }

  /**
   * Recursively extracts all referenced IOTags for a given rung based on its elements
   * and the current project's ioMap. If a tag is not found in ioMap, creates a valid default.
   */
  extractReferencedTags(rung: LadderRung, currentTags: IOTag[]): IOTag[] {
    const matchedTags: IOTag[] = [];
    const seenAddresses = new Set<string>();

    const checkElement = (elem: LadderElement) => {
      if (elem.address?.rawString) {
        const addrStr = elem.address.rawString;
        if (!seenAddresses.has(addrStr)) {
          seenAddresses.add(addrStr);
          // Look up in existing project tags by address or symbol
          const existing = currentTags.find(
            (t) => t.address.rawString === addrStr || (elem.symbol && t.symbol === elem.symbol)
          );

          if (existing) {
            matchedTags.push({ ...existing });
          } else {
            // Generate clean IOTag definition based on element
            matchedTags.push({
              id: `tag_gen_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              symbol: elem.symbol || addrStr.replace('.', '_'),
              address: { ...elem.address },
              dataType: elem.address.dataType || 'BOOL',
              description: elem.comment || `${elem.type} variable at ${addrStr}`,
              currentValue: elem.address.dataType === 'COUNTER' ? 0 : false,
            });
          }
        }
      }

      // Check subBranches
      if (elem.params?.subBranch && Array.isArray(elem.params.subBranch)) {
        elem.params.subBranch.forEach(checkElement);
      }
    };

    rung.elements.forEach(checkElement);
    return matchedTags;
  }

  /**
   * Deep clones a LadderRung, generating fresh unique IDs for the rung and all its elements
   */
  cloneRungWithFreshIds(rung: LadderRung, targetNumber: number): LadderRung {
    const cloneElement = (el: LadderElement): LadderElement => {
      const cloned: LadderElement = {
        ...el,
        id: `elem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        isEnergized: false,
        powerPassed: false,
      };

      if (el.params?.subBranch && Array.isArray(el.params.subBranch)) {
        cloned.params = {
          ...el.params,
          subBranch: el.params.subBranch.map(cloneElement),
        };
      }

      return cloned;
    };

    return {
      id: `rung_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      number: targetNumber,
      comment: rung.comment || `Rung ${targetNumber}`,
      elements: rung.elements.map(cloneElement),
      isEnergized: false,
    };
  }
}

export const snippetStorage = new SnippetStorageManager();
