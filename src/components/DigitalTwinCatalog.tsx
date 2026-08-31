import * as THREE from 'three';
import { IOTag } from '../types/plc';

/**
 * Metadata for interactive 3D elements in a digital twin simulation cell.
 */
export interface ComponentBindingMetadata {
  id: string;
  name: string;
  category: 'actuator' | 'sensor' | 'indicator' | 'passive';
  defaultTagAddress?: string;
  defaultSymbol?: string;
  description: string;
  interactive: boolean;
}

export interface TwinPrimitiveResult {
  group: THREE.Group;
  metadata: ComponentBindingMetadata;
  update: (delta: number, tagLookup: (addrOrSym: string) => boolean) => void;
  interactiveMeshes: THREE.Object3D[];
}

/**
 * 1. Industrial Roller Conveyor Cell Primitive
 */
export function createConveyorPrimitive(options?: {
  length?: number;
  width?: number;
  height?: number;
  motorTag?: string;
}): TwinPrimitiveResult {
  const len = options?.length || 8;
  const w = options?.width || 1.8;
  const h = options?.height || 1.2;
  const motorTag = options?.motorTag || 'Q0.0';

  const group = new THREE.Group();
  const interactiveMeshes: THREE.Object3D[] = [];

  // Materials
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
  const beltMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
  const rollerMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.15 });

  // Bed
  const bed = new THREE.Mesh(new THREE.BoxGeometry(len, 0.3, w), beltMat);
  bed.position.y = h;
  bed.castShadow = true;
  bed.receiveShadow = true;
  group.add(bed);

  // Guard Rails
  const rail1 = new THREE.Mesh(new THREE.BoxGeometry(len, 0.25, 0.08), frameMat);
  rail1.position.set(0, h + 0.25, w / 2 + 0.04);
  const rail2 = new THREE.Mesh(new THREE.BoxGeometry(len, 0.25, 0.08), frameMat);
  rail2.position.set(0, h + 0.25, -w / 2 - 0.04);
  group.add(rail1, rail2);

  // Legs
  const legGeo = new THREE.CylinderGeometry(0.06, 0.06, h, 12);
  const legPositions = [-len / 2 + 0.5, -len / 6, len / 6, len / 2 - 0.5];
  legPositions.forEach((x) => {
    const l1 = new THREE.Mesh(legGeo, frameMat);
    l1.position.set(x, h / 2, w / 2 - 0.1);
    const l2 = new THREE.Mesh(legGeo, frameMat);
    l2.position.set(x, h / 2, -w / 2 + 0.1);
    group.add(l1, l2);
  });

  // Rollers
  const rollers: THREE.Mesh[] = [];
  const rollerGeo = new THREE.CylinderGeometry(0.08, 0.08, w - 0.1, 12);
  for (let x = -len / 2 + 0.4; x <= len / 2 - 0.4; x += 0.6) {
    const roller = new THREE.Mesh(rollerGeo, rollerMat);
    roller.rotation.x = Math.PI / 2;
    roller.position.set(x, h + 0.12, 0);
    group.add(roller);
    rollers.push(roller);
  }

  // Drive motor housing
  const driveMotor = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.6), frameMat);
  driveMotor.rotation.z = Math.PI / 2;
  driveMotor.position.set(len / 2 + 0.3, h, 0);
  group.add(driveMotor);

  driveMotor.userData = {
    tagIdentifier: motorTag,
    name: 'Conveyor Drive Motor',
    type: 'actuator',
    description: `Conveyor motor powered by ${motorTag}`,
  };
  interactiveMeshes.push(driveMotor);

  const metadata: ComponentBindingMetadata = {
    id: 'primitive-conveyor-01',
    name: 'Conveyor Section',
    category: 'actuator',
    defaultTagAddress: motorTag,
    defaultSymbol: 'CONVEYOR_RUN',
    description: 'Motorized roller conveyor segment',
    interactive: true,
  };

  const update = (delta: number, tagLookup: (addr: string) => boolean) => {
    const isRunning = tagLookup(motorTag);
    if (isRunning) {
      rollers.forEach((r) => {
        r.rotation.y += delta * 6;
      });
    }
  };

  return { group, metadata, update, interactiveMeshes };
}

/**
 * 2. Photoelectric / Proximity Sensor Primitive
 */
export function createSensorPrimitive(options?: {
  position?: THREE.Vector3;
  sensorTag?: string;
  name?: string;
}): TwinPrimitiveResult {
  const sensorTag = options?.sensorTag || 'I0.0';
  const pos = options?.position || new THREE.Vector3(0, 1.6, 1.0);
  const name = options?.name || 'Photoelectric Beam Sensor';

  const group = new THREE.Group();
  group.position.copy(pos);
  const interactiveMeshes: THREE.Object3D[] = [];

  // Sensor Mount Bracket
  const bracketMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
  const mount = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.8, 0.12), bracketMat);
  mount.position.y = -0.3;
  group.add(mount);

  // Sensor Body
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.6, roughness: 0.3 });
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.28, 16), bodyMat);
  head.rotation.x = Math.PI / 2;
  group.add(head);

  // Status Indicator LED on sensor body
  const ledMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, emissive: 0x000000 });
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), ledMat);
  led.position.set(0, 0.12, 0);
  group.add(led);

  // Laser detection beam
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.6 });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 2.0, 8), beamMat);
  beam.rotation.x = Math.PI / 2;
  beam.position.set(0, 0, -1.0);
  group.add(beam);

  head.userData = {
    tagIdentifier: sensorTag,
    name: name,
    type: 'sensor',
    description: `Optical proximity sensor linked to input ${sensorTag}`,
  };
  beam.userData = head.userData;

  interactiveMeshes.push(head, beam);

  const metadata: ComponentBindingMetadata = {
    id: `primitive-sensor-${sensorTag}`,
    name: name,
    category: 'sensor',
    defaultTagAddress: sensorTag,
    defaultSymbol: 'PART_DETECTED',
    description: 'Optical retro-reflective beam sensor',
    interactive: true,
  };

  const update = (delta: number, tagLookup: (addr: string) => boolean) => {
    const isTriggered = tagLookup(sensorTag);
    if (isTriggered) {
      beamMat.color.setHex(0x22c55e);
      ledMat.emissive.setHex(0x22c55e);
      ledMat.color.setHex(0x22c55e);
    } else {
      beamMat.color.setHex(0xef4444);
      ledMat.emissive.setHex(0x000000);
      ledMat.color.setHex(0x1e293b);
    }
  };

  return { group, metadata, update, interactiveMeshes };
}

/**
 * 3. Industrial 3-Phase Electric Motor Primitive
 */
export function createMotorPrimitive(options?: {
  position?: THREE.Vector3;
  motorTag?: string;
  name?: string;
}): TwinPrimitiveResult {
  const motorTag = options?.motorTag || 'Q0.0';
  const pos = options?.position || new THREE.Vector3(0, 0, 0);
  const name = options?.name || '3-Phase Induction Motor';

  const group = new THREE.Group();
  group.position.copy(pos);
  const interactiveMeshes: THREE.Object3D[] = [];

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.7, roughness: 0.3 });
  const shaftMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.1 });
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x334155 });

  // Base Plate
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 1.8), baseMat);
  base.position.y = 0.1;
  group.add(base);

  // Stator Housing
  const stator = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.8, 24), bodyMat);
  stator.rotation.z = Math.PI / 2;
  stator.position.set(0, 0.9, 0);
  group.add(stator);

  // Cooling Fins
  for (let i = -0.6; i <= 0.6; i += 0.2) {
    const fin = new THREE.Mesh(new THREE.TorusGeometry(0.84, 0.03, 6, 24), bodyMat);
    fin.rotation.y = Math.PI / 2;
    fin.position.set(i, 0.9, 0);
    group.add(fin);
  }

  // Terminal box
  const termBox = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.5), baseMat);
  termBox.position.set(0, 1.8, 0);
  group.add(termBox);

  // Shaft
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.6, 16), shaftMat);
  shaft.rotation.z = Math.PI / 2;
  shaft.position.set(0.3, 0.9, 0);
  group.add(shaft);

  // Pulley with rotation marker
  const pulley = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.2, 16), new THREE.MeshStandardMaterial({ color: 0xd97706 }));
  pulley.rotation.z = Math.PI / 2;
  pulley.position.set(1.4, 0.9, 0);

  const marker = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.35, 0.05), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  marker.position.set(1.51, 1.05, 0);

  const pulleyGroup = new THREE.Group();
  pulleyGroup.add(pulley, marker);
  group.add(pulleyGroup);

  stator.userData = {
    tagIdentifier: motorTag,
    name: name,
    type: 'actuator',
    description: `Electric Motor actuated by ${motorTag}`,
  };
  interactiveMeshes.push(stator);

  const metadata: ComponentBindingMetadata = {
    id: `primitive-motor-${motorTag}`,
    name: name,
    category: 'actuator',
    defaultTagAddress: motorTag,
    defaultSymbol: 'MOTOR_M1',
    description: 'Standard AC induction drive motor',
    interactive: true,
  };

  let angle = 0;
  const update = (delta: number, tagLookup: (addr: string) => boolean) => {
    const isRunning = tagLookup(motorTag);
    if (isRunning) {
      angle += delta * 12;
      shaft.rotation.x = angle;
      pulleyGroup.rotation.x = angle;
    }
  };

  return { group, metadata, update, interactiveMeshes };
}

/**
 * 4. Transparent Liquid Reservoir Tank Primitive
 */
export function createTankPrimitive(options?: {
  position?: THREE.Vector3;
  lowTag?: string;
  highTag?: string;
  pumpTag?: string;
  name?: string;
}): TwinPrimitiveResult {
  const lowTag = options?.lowTag || 'I0.0';
  const highTag = options?.highTag || 'I0.1';
  const pumpTag = options?.pumpTag || 'Q0.0';
  const pos = options?.position || new THREE.Vector3(0, 0, 0);
  const name = options?.name || 'Liquid Storage Tank';

  const group = new THREE.Group();
  group.position.copy(pos);
  const interactiveMeshes: THREE.Object3D[] = [];

  const standMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
  
  // Stand Base
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.7, 0.4, 24), standMat);
  base.position.y = 0.2;
  group.add(base);

  // Glass Tank Shell
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x93c5fd,
    transparent: true,
    opacity: 0.35,
    roughness: 0.1,
    transmission: 0.85,
    ior: 1.45,
  });
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 3.2, 32, 1, true), glassMat);
  glass.position.y = 2.0;
  group.add(glass);

  // Liquid volume
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    transparent: true,
    opacity: 0.8,
    roughness: 0.1,
  });
  const water = new THREE.Mesh(new THREE.CylinderGeometry(1.46, 1.46, 1, 32), waterMat);
  water.position.y = 1.0;
  group.add(water);

  // Float switches
  const lowFloatMat = new THREE.MeshStandardMaterial({ color: 0x10b981 });
  const lowFloat = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), lowFloatMat);
  lowFloat.position.set(1.0, 1.0, 0);

  const highFloatMat = new THREE.MeshStandardMaterial({ color: 0x10b981 });
  const highFloat = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), highFloatMat);
  highFloat.position.set(1.0, 3.0, 0);

  group.add(lowFloat, highFloat);

  lowFloat.userData = {
    tagIdentifier: lowTag,
    name: 'Low Level Float Switch',
    type: 'sensor',
    description: `Triggers when tank is empty (${lowTag})`,
  };
  highFloat.userData = {
    tagIdentifier: highTag,
    name: 'High Level Float Switch',
    type: 'sensor',
    description: `Triggers when tank is full (${highTag})`,
  };

  interactiveMeshes.push(lowFloat, highFloat);

  const metadata: ComponentBindingMetadata = {
    id: `primitive-tank-${pumpTag}`,
    name: name,
    category: 'actuator',
    defaultTagAddress: pumpTag,
    defaultSymbol: 'TANK_LEVEL',
    description: 'Process reservoir with dual level float sensors',
    interactive: true,
  };

  let waterLevel = 1.4;
  const update = (delta: number, tagLookup: (addr: string) => boolean) => {
    const isPumping = tagLookup(pumpTag);
    if (isPumping) {
      waterLevel = Math.min(waterLevel + delta * 0.6, 3.1);
    } else {
      waterLevel = Math.max(waterLevel - delta * 0.12, 0.4);
    }

    water.scale.y = Math.max(waterLevel, 0.1);
    water.position.y = 0.4 + waterLevel / 2;

    const isLow = waterLevel <= 1.0 || tagLookup(lowTag);
    const isHigh = waterLevel >= 2.9 || tagLookup(highTag);

    lowFloatMat.color.setHex(isLow ? 0xf59e0b : 0x10b981);
    highFloatMat.color.setHex(isHigh ? 0xef4444 : 0x10b981);
  };

  return { group, metadata, update, interactiveMeshes };
}

/**
 * 5. Industrial Pilot Lamp / Strobe Indicator Primitive
 */
export function createPilotLampPrimitive(options?: {
  position?: THREE.Vector3;
  lampTag?: string;
  color?: 'red' | 'green' | 'yellow' | 'blue';
  name?: string;
}): TwinPrimitiveResult {
  const lampTag = options?.lampTag || 'Q0.1';
  const colorType = options?.color || 'green';
  const pos = options?.position || new THREE.Vector3(0, 0, 0);
  const name = options?.name || `Pilot Lamp (${colorType.toUpperCase()})`;

  const colorHexMap = {
    red: 0xef4444,
    green: 0x22c55e,
    yellow: 0xf59e0b,
    blue: 0x3b82f6,
  };
  const activeColor = colorHexMap[colorType];

  const group = new THREE.Group();
  group.position.copy(pos);
  const interactiveMeshes: THREE.Object3D[] = [];

  const housingMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
  const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.25, 16), housingMat);
  group.add(housing);

  const lensMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    emissive: 0x000000,
    roughness: 0.2,
  });
  const lens = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), lensMat);
  lens.position.y = 0.14;
  group.add(lens);

  const light = new THREE.PointLight(activeColor, 0, 3);
  light.position.y = 0.2;
  group.add(light);

  lens.userData = {
    tagIdentifier: lampTag,
    name: name,
    type: 'indicator',
    description: `Indicator pilot beacon actuated by ${lampTag}`,
  };
  interactiveMeshes.push(lens);

  const metadata: ComponentBindingMetadata = {
    id: `primitive-lamp-${lampTag}`,
    name: name,
    category: 'indicator',
    defaultTagAddress: lampTag,
    defaultSymbol: 'PILOT_LAMP',
    description: `Panel mount ${colorType} status pilot lamp`,
    interactive: true,
  };

  const update = (delta: number, tagLookup: (addr: string) => boolean) => {
    const isOn = tagLookup(lampTag);
    if (isOn) {
      lensMat.emissive.setHex(activeColor);
      lensMat.color.setHex(activeColor);
      light.intensity = 1.8;
    } else {
      lensMat.emissive.setHex(0x000000);
      lensMat.color.setHex(0x1e293b);
      light.intensity = 0;
    }
  };

  return { group, metadata, update, interactiveMeshes };
}

/**
 * 6. Composite Working Simulation Cell: Industrial Automated Sorting Cell
 * Assembles primitive components into a complete ready-to-run workcell.
 */
export function createSortingWorkcell(tags?: IOTag[]): {
  group: THREE.Group;
  primitives: TwinPrimitiveResult[];
  interactiveMeshes: THREE.Object3D[];
  update: (delta: number, tagLookup: (addrOrSym: string) => boolean) => void;
} {
  const cellGroup = new THREE.Group();
  const primitives: TwinPrimitiveResult[] = [];
  const allInteractive: THREE.Object3D[] = [];

  // Conveyor Primitive
  const conveyor = createConveyorPrimitive({ length: 9, motorTag: 'Q0.0' });
  conveyor.group.position.set(0, 0, 0);
  cellGroup.add(conveyor.group);
  primitives.push(conveyor);

  // Optical Sensor Primitive (at x = 0)
  const sensor = createSensorPrimitive({
    position: new THREE.Vector3(0, 1.4, 1.05),
    sensorTag: 'I0.0',
    name: 'Workpiece Entry Sensor (I0.0)',
  });
  cellGroup.add(sensor.group);
  primitives.push(sensor);

  // Motor Primitive (attached to head pulley)
  const motor = createMotorPrimitive({
    position: new THREE.Vector3(4.8, 0, 0),
    motorTag: 'Q0.0',
    name: 'Conveyor Drive Motor (Q0.0)',
  });
  cellGroup.add(motor.group);
  primitives.push(motor);

  // Status Indicator Lamps
  const runLamp = createPilotLampPrimitive({
    position: new THREE.Vector3(-3.8, 1.8, 1.1),
    lampTag: 'Q0.0',
    color: 'green',
    name: 'Conveyor Run Lamp (Q0.0)',
  });
  cellGroup.add(runLamp.group);
  primitives.push(runLamp);

  const alarmLamp = createPilotLampPrimitive({
    position: new THREE.Vector3(-3.4, 1.8, 1.1),
    lampTag: 'Q0.1',
    color: 'red',
    name: 'Alarm / Diverter Lamp (Q0.1)',
  });
  cellGroup.add(alarmLamp.group);
  primitives.push(alarmLamp);

  // Aggregate interactive meshes
  primitives.forEach((p) => {
    allInteractive.push(...p.interactiveMeshes);
  });

  const update = (delta: number, tagLookup: (addrOrSym: string) => boolean) => {
    primitives.forEach((p) => p.update(delta, tagLookup));
  };

  return {
    group: cellGroup,
    primitives,
    interactiveMeshes: allInteractive,
    update,
  };
}
