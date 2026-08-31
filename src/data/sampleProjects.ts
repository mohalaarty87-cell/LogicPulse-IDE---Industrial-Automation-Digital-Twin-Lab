import { ProjectFile } from '../types/plc';

export const sampleProjects: ProjectFile[] = [
  {
    formatVersion: '1.0',
    project: {
      id: 'proj_motor_start_stop',
      name: '01. Motor Start/Stop (Seal-in Circuit)',
      author: 'Industrial Automation Lab',
      description: 'Classic three-wire motor starter circuit with latching auxiliary contact seal-in and normally-closed stop button.',
      createdAt: '2026-08-30T00:00:00Z',
      updatedAt: '2026-08-30T00:00:00Z',
    },
    plc: {
      dialect: 'siemens-s7-1200',
      scanCycleMs: 20,
      cpuModel: 'CPU 1214C DC/DC/DC',
    },
    ioMap: [
      {
        id: 'tag_start',
        symbol: 'START_PB',
        address: { area: 'INPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'I0.0' },
        dataType: 'BOOL',
        description: 'Start Pushbutton (Normally Open)',
        currentValue: false,
      },
      {
        id: 'tag_stop',
        symbol: 'STOP_PB',
        address: { area: 'INPUT', byte: 0, bit: 1, dataType: 'BOOL', rawString: 'I0.1' },
        dataType: 'BOOL',
        description: 'Stop Pushbutton (Normally Closed in hardware: True when idle)',
        currentValue: false, // In ladder we examine NC contact, so 0 lets power pass
      },
      {
        id: 'tag_motor',
        symbol: 'MOTOR_OUT',
        address: { area: 'OUTPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'Q0.0' },
        dataType: 'BOOL',
        description: 'Main Drive Motor Contactor',
        currentValue: false,
      },
      {
        id: 'tag_overload',
        symbol: 'OVERLOAD_TRIP',
        address: { area: 'INPUT', byte: 0, bit: 2, dataType: 'BOOL', rawString: 'I0.2' },
        dataType: 'BOOL',
        description: 'Thermal Overload Relay Trip Contact (NC)',
        currentValue: false,
      },
    ],
    ladder: [
      {
        id: 'rung_0',
        number: 0,
        comment: 'Rung 0: Main Motor Start / Stop with Seal-in Contact',
        elements: [
          {
            id: 'elem_branch_seal',
            type: 'BRANCH',
            symbol: 'START_OR_SEAL',
            params: {
              subBranch: [
                {
                  id: 'elem_seal_contact',
                  type: 'NO_CONTACT',
                  address: { area: 'OUTPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'Q0.0' },
                  symbol: 'MOTOR_OUT',
                  comment: 'Auxiliary Seal-in contact',
                },
              ],
            },
          },
          {
            id: 'elem_start_pb',
            type: 'NO_CONTACT',
            address: { area: 'INPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'I0.0' },
            symbol: 'START_PB',
            comment: 'Start Button',
          },
          {
            id: 'elem_stop_pb',
            type: 'NC_CONTACT',
            address: { area: 'INPUT', byte: 0, bit: 1, dataType: 'BOOL', rawString: 'I0.1' },
            symbol: 'STOP_PB',
            comment: 'Stop Button (NC)',
          },
          {
            id: 'elem_motor_coil',
            type: 'COIL',
            address: { area: 'OUTPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'Q0.0' },
            symbol: 'MOTOR_OUT',
            comment: 'Drive Contactor Coil',
          },
        ],
      },
      {
        id: 'rung_1',
        number: 1,
        comment: 'Rung 1: Motor Running Pilot Lamp Indication',
        elements: [
          {
            id: 'elem_lamp_contact',
            type: 'NO_CONTACT',
            address: { area: 'OUTPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'Q0.0' },
            symbol: 'MOTOR_OUT',
          },
          {
            id: 'elem_lamp_coil',
            type: 'COIL',
            address: { area: 'OUTPUT', byte: 0, bit: 1, dataType: 'BOOL', rawString: 'Q0.1' },
            symbol: 'RUN_LAMP',
          },
        ],
      },
    ],
  },
  {
    formatVersion: '1.0',
    project: {
      id: 'proj_motor_fwd_rev',
      name: '02. Motor Forward / Reverse Interlock',
      author: 'Industrial Automation Lab',
      description: 'Reversible motor control with hardware & software cross-interlocking to prevent short-circuits.',
      createdAt: '2026-08-30T00:00:00Z',
      updatedAt: '2026-08-30T00:00:00Z',
    },
    plc: {
      dialect: 'siemens-s7-1200',
      scanCycleMs: 20,
      cpuModel: 'CPU 1214C DC/DC/DC',
    },
    ioMap: [
      {
        id: 'tag_fwd_pb',
        symbol: 'FWD_PB',
        address: { area: 'INPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'I0.0' },
        dataType: 'BOOL',
        description: 'Forward Pushbutton (NO)',
        currentValue: false,
      },
      {
        id: 'tag_rev_pb',
        symbol: 'REV_PB',
        address: { area: 'INPUT', byte: 0, bit: 1, dataType: 'BOOL', rawString: 'I0.1' },
        dataType: 'BOOL',
        description: 'Reverse Pushbutton (NO)',
        currentValue: false,
      },
      {
        id: 'tag_stop_pb',
        symbol: 'STOP_PB',
        address: { area: 'INPUT', byte: 0, bit: 2, dataType: 'BOOL', rawString: 'I0.2' },
        dataType: 'BOOL',
        description: 'Master Stop Pushbutton (NC)',
        currentValue: false,
      },
      {
        id: 'tag_fwd_coil',
        symbol: 'MOTOR_FWD',
        address: { area: 'OUTPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'Q0.0' },
        dataType: 'BOOL',
        description: 'Forward Direction Contactor',
        currentValue: false,
      },
      {
        id: 'tag_rev_coil',
        symbol: 'MOTOR_REV',
        address: { area: 'OUTPUT', byte: 0, bit: 1, dataType: 'BOOL', rawString: 'Q0.1' },
        dataType: 'BOOL',
        description: 'Reverse Direction Contactor',
        currentValue: false,
      },
    ],
    ladder: [
      {
        id: 'rung_0',
        number: 0,
        comment: 'Rung 0: Forward Direction with Reverse Interlock',
        elements: [
          {
            id: 'elem_fwd_branch',
            type: 'BRANCH',
            params: {
              subBranch: [
                {
                  id: 'elem_fwd_seal',
                  type: 'NO_CONTACT',
                  address: { area: 'OUTPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'Q0.0' },
                  symbol: 'MOTOR_FWD',
                },
              ],
            },
          },
          {
            id: 'elem_fwd_in',
            type: 'NO_CONTACT',
            address: { area: 'INPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'I0.0' },
            symbol: 'FWD_PB',
          },
          {
            id: 'elem_rev_interlock',
            type: 'NC_CONTACT',
            address: { area: 'OUTPUT', byte: 0, bit: 1, dataType: 'BOOL', rawString: 'Q0.1' },
            symbol: 'MOTOR_REV',
            comment: 'Interlock: Disable FWD when REV is active',
          },
          {
            id: 'elem_stop_fwd',
            type: 'NC_CONTACT',
            address: { area: 'INPUT', byte: 0, bit: 2, dataType: 'BOOL', rawString: 'I0.2' },
            symbol: 'STOP_PB',
          },
          {
            id: 'elem_fwd_out',
            type: 'COIL',
            address: { area: 'OUTPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'Q0.0' },
            symbol: 'MOTOR_FWD',
          },
        ],
      },
      {
        id: 'rung_1',
        number: 1,
        comment: 'Rung 1: Reverse Direction with Forward Interlock',
        elements: [
          {
            id: 'elem_rev_branch',
            type: 'BRANCH',
            params: {
              subBranch: [
                {
                  id: 'elem_rev_seal',
                  type: 'NO_CONTACT',
                  address: { area: 'OUTPUT', byte: 0, bit: 1, dataType: 'BOOL', rawString: 'Q0.1' },
                  symbol: 'MOTOR_REV',
                },
              ],
            },
          },
          {
            id: 'elem_rev_in',
            type: 'NO_CONTACT',
            address: { area: 'INPUT', byte: 0, bit: 1, dataType: 'BOOL', rawString: 'I0.1' },
            symbol: 'REV_PB',
          },
          {
            id: 'elem_fwd_interlock',
            type: 'NC_CONTACT',
            address: { area: 'OUTPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'Q0.0' },
            symbol: 'MOTOR_FWD',
            comment: 'Interlock: Disable REV when FWD is active',
          },
          {
            id: 'elem_stop_rev',
            type: 'NC_CONTACT',
            address: { area: 'INPUT', byte: 0, bit: 2, dataType: 'BOOL', rawString: 'I0.2' },
            symbol: 'STOP_PB',
          },
          {
            id: 'elem_rev_out',
            type: 'COIL',
            address: { area: 'OUTPUT', byte: 0, bit: 1, dataType: 'BOOL', rawString: 'Q0.1' },
            symbol: 'MOTOR_REV',
          },
        ],
      },
    ],
  },
  {
    formatVersion: '1.0',
    project: {
      id: 'proj_traffic_lights',
      name: '03. Traffic Light Sequencer (TON Timers)',
      author: 'Industrial Automation Lab',
      description: 'Automated 3-phase intersection traffic lights cycling Red -> Green -> Yellow using on-delay timers.',
      createdAt: '2026-08-30T00:00:00Z',
      updatedAt: '2026-08-30T00:00:00Z',
    },
    plc: {
      dialect: 'siemens-s7-1200',
      scanCycleMs: 20,
      cpuModel: 'CPU 1214C DC/DC/DC',
    },
    ioMap: [
      {
        id: 'tag_sys_enable',
        symbol: 'SYS_ENABLE',
        address: { area: 'INPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'I0.0' },
        dataType: 'BOOL',
        description: 'System Run Switch',
        currentValue: true,
      },
      {
        id: 'tag_red',
        symbol: 'LIGHT_RED',
        address: { area: 'OUTPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'Q0.0' },
        dataType: 'BOOL',
        description: 'Red Stop Lamp',
        currentValue: false,
      },
      {
        id: 'tag_yellow',
        symbol: 'LIGHT_YELLOW',
        address: { area: 'OUTPUT', byte: 0, bit: 1, dataType: 'BOOL', rawString: 'Q0.1' },
        dataType: 'BOOL',
        description: 'Yellow Caution Lamp',
        currentValue: false,
      },
      {
        id: 'tag_green',
        symbol: 'LIGHT_GREEN',
        address: { area: 'OUTPUT', byte: 0, bit: 2, dataType: 'BOOL', rawString: 'Q0.2' },
        dataType: 'BOOL',
        description: 'Green Go Lamp',
        currentValue: false,
      },
      {
        id: 'tag_t1_done',
        symbol: 'T_RED_DONE',
        address: { area: 'TIMER', byte: 1, dataType: 'TIMER', rawString: 'T1' },
        dataType: 'TIMER',
        description: 'Red Light Duration Timer (3s)',
        currentValue: false,
      },
    ],
    ladder: [
      {
        id: 'rung_0',
        number: 0,
        comment: 'Rung 0: Red Phase Timer (3000ms delay)',
        elements: [
          {
            id: 'elem_sys_en',
            type: 'NO_CONTACT',
            address: { area: 'INPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'I0.0' },
            symbol: 'SYS_ENABLE',
          },
          {
            id: 'elem_timer_1',
            type: 'TON',
            address: { area: 'TIMER', byte: 1, dataType: 'TIMER', rawString: 'T1' },
            symbol: 'T_RED_DONE',
            params: { presetTimeMs: 3000, elapsedTimeMs: 0 },
            comment: 'PT = 3000ms',
          },
        ],
      },
      {
        id: 'rung_1',
        number: 1,
        comment: 'Rung 1: Red Lamp Active while Timer is timing',
        elements: [
          {
            id: 'elem_t1_not_done',
            type: 'NC_CONTACT',
            address: { area: 'TIMER', byte: 1, dataType: 'TIMER', rawString: 'T1' },
            symbol: 'T_RED_DONE',
          },
          {
            id: 'elem_red_coil',
            type: 'COIL',
            address: { area: 'OUTPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'Q0.0' },
            symbol: 'LIGHT_RED',
          },
        ],
      },
      {
        id: 'rung_2',
        number: 2,
        comment: 'Rung 2: Green Lamp Active when Timer 1 finishes',
        elements: [
          {
            id: 'elem_t1_is_done',
            type: 'NO_CONTACT',
            address: { area: 'TIMER', byte: 1, dataType: 'TIMER', rawString: 'T1' },
            symbol: 'T_RED_DONE',
          },
          {
            id: 'elem_green_coil',
            type: 'COIL',
            address: { area: 'OUTPUT', byte: 0, bit: 2, dataType: 'BOOL', rawString: 'Q0.2' },
            symbol: 'LIGHT_GREEN',
          },
        ],
      },
    ],
  },
  {
    formatVersion: '1.0',
    project: {
      id: 'proj_tank_pump',
      name: '04. Tank Water Level & Pump Controller',
      author: 'Industrial Automation Lab',
      description: 'Automatic reservoir water filling system with Low Float, High Float switch, and High Alarm strobe.',
      createdAt: '2026-08-30T00:00:00Z',
      updatedAt: '2026-08-30T00:00:00Z',
    },
    plc: {
      dialect: 'siemens-s7-1200',
      scanCycleMs: 20,
      cpuModel: 'CPU 1214C DC/DC/DC',
    },
    ioMap: [
      {
        id: 'tag_low_float',
        symbol: 'FLOAT_LOW',
        address: { area: 'INPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'I0.0' },
        dataType: 'BOOL',
        description: 'Low Level Float Sensor (1 = Water low, needs filling)',
        currentValue: true,
      },
      {
        id: 'tag_high_float',
        symbol: 'FLOAT_HIGH',
        address: { area: 'INPUT', byte: 0, bit: 1, dataType: 'BOOL', rawString: 'I0.1' },
        dataType: 'BOOL',
        description: 'High Level Float Sensor (1 = Tank full, stop filling)',
        currentValue: false,
      },
      {
        id: 'tag_pump',
        symbol: 'PUMP_VALVE',
        address: { area: 'OUTPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'Q0.0' },
        dataType: 'BOOL',
        description: 'Feed Pump Electric Contactor',
        currentValue: false,
      },
      {
        id: 'tag_alarm',
        symbol: 'ALARM_FULL',
        address: { area: 'OUTPUT', byte: 0, bit: 1, dataType: 'BOOL', rawString: 'Q0.1' },
        dataType: 'BOOL',
        description: 'High Level Warning Beacon',
        currentValue: false,
      },
    ],
    ladder: [
      {
        id: 'rung_0',
        number: 0,
        comment: 'Rung 0: Pump Auto-start on low water with seal-in until high level reached',
        elements: [
          {
            id: 'elem_pump_branch',
            type: 'BRANCH',
            params: {
              subBranch: [
                {
                  id: 'elem_pump_seal',
                  type: 'NO_CONTACT',
                  address: { area: 'OUTPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'Q0.0' },
                  symbol: 'PUMP_VALVE',
                },
              ],
            },
          },
          {
            id: 'elem_low_sw',
            type: 'NO_CONTACT',
            address: { area: 'INPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'I0.0' },
            symbol: 'FLOAT_LOW',
          },
          {
            id: 'elem_high_sw_nc',
            type: 'NC_CONTACT',
            address: { area: 'INPUT', byte: 0, bit: 1, dataType: 'BOOL', rawString: 'I0.1' },
            symbol: 'FLOAT_HIGH',
            comment: 'Disengages pump when water touches high float',
          },
          {
            id: 'elem_pump_out',
            type: 'COIL',
            address: { area: 'OUTPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'Q0.0' },
            symbol: 'PUMP_VALVE',
          },
        ],
      },
      {
        id: 'rung_1',
        number: 1,
        comment: 'Rung 1: High Level Strobe Warning',
        elements: [
          {
            id: 'elem_high_sw_no',
            type: 'NO_CONTACT',
            address: { area: 'INPUT', byte: 0, bit: 1, dataType: 'BOOL', rawString: 'I0.1' },
            symbol: 'FLOAT_HIGH',
          },
          {
            id: 'elem_alarm_coil',
            type: 'COIL',
            address: { area: 'OUTPUT', byte: 0, bit: 1, dataType: 'BOOL', rawString: 'Q0.1' },
            symbol: 'ALARM_FULL',
          },
        ],
      },
    ],
  },
  {
    formatVersion: '1.0',
    project: {
      id: 'proj_conveyor_sorter',
      name: '05. Conveyor Batch Counter & Ejector',
      author: 'Industrial Automation Lab',
      description: 'Optical proximity sensor detecting parts on conveyor; CTU counter fires pneumatic ejector piston after batch of 5.',
      createdAt: '2026-08-30T00:00:00Z',
      updatedAt: '2026-08-30T00:00:00Z',
    },
    plc: {
      dialect: 'siemens-s7-1200',
      scanCycleMs: 20,
      cpuModel: 'CPU 1214C DC/DC/DC',
    },
    ioMap: [
      {
        id: 'tag_photo_eye',
        symbol: 'PART_SENSOR',
        address: { area: 'INPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'I0.0' },
        dataType: 'BOOL',
        description: 'Photoelectric Beam Sensor (1 on part detect)',
        currentValue: false,
      },
      {
        id: 'tag_counter',
        symbol: 'BATCH_COUNTER',
        address: { area: 'COUNTER', byte: 1, dataType: 'COUNTER', rawString: 'C1' },
        dataType: 'COUNTER',
        description: 'Batch Count Up Counter (PV = 5)',
        currentValue: false,
      },
      {
        id: 'tag_ejector',
        symbol: 'EJECTOR_SOLENOID',
        address: { area: 'OUTPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'Q0.0' },
        dataType: 'BOOL',
        description: 'Pneumatic Ejector Diverter Cylinder',
        currentValue: false,
      },
    ],
    ladder: [
      {
        id: 'rung_0',
        number: 0,
        comment: 'Rung 0: Part Counter (Counts 5 parts passing sensor)',
        elements: [
          {
            id: 'elem_sensor_no',
            type: 'NO_CONTACT',
            address: { area: 'INPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'I0.0' },
            symbol: 'PART_SENSOR',
          },
          {
            id: 'elem_ctu_1',
            type: 'CTU',
            address: { area: 'COUNTER', byte: 1, dataType: 'COUNTER', rawString: 'C1' },
            symbol: 'BATCH_COUNTER',
            params: { presetCount: 5, currentCount: 0 },
            comment: 'PV = 5 parts',
          },
        ],
      },
      {
        id: 'rung_1',
        number: 1,
        comment: 'Rung 1: Fire Ejector when Batch completes (C1.Q == 1)',
        elements: [
          {
            id: 'elem_c1_done',
            type: 'NO_CONTACT',
            address: { area: 'COUNTER', byte: 1, dataType: 'COUNTER', rawString: 'C1' },
            symbol: 'BATCH_COUNTER',
          },
          {
            id: 'elem_eject_coil',
            type: 'COIL',
            address: { area: 'OUTPUT', byte: 0, bit: 0, dataType: 'BOOL', rawString: 'Q0.0' },
            symbol: 'EJECTOR_SOLENOID',
          },
        ],
      },
    ],
  },
];
