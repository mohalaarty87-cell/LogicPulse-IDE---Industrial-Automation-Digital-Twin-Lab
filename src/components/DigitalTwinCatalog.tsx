import React, { useState } from 'react';
import * as THREE from 'three';
import { 
  Eye, 
  Zap, 
  Cpu, 
  Radio, 
  Layers, 
  Sliders, 
  PlusCircle, 
  Check, 
  X, 
  Move, 
  Gauge, 
  Flame, 
  Activity, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowRightLeft, 
  Maximize2, 
  Sparkles, 
  Lightbulb, 
  Box, 
  Search, 
  Trash2,
  Settings2,
  Compass,
  RotateCw,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { IOTag, ProjectFile, ThemeStyle } from '../types/plc';

/**
 * Metadata for interactive 3D elements in a digital twin simulation cell.
 */
export interface ComponentBindingMetadata {
  id: string;
  name: string;
  category: 'sensor' | 'actuator' | 'indicator' | 'safety' | 'mechanism';
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

export interface PlacedPrimitiveInstance {
  instanceId: string;
  catalogId: string;
  name: string;
  category: 'sensor' | 'actuator' | 'indicator' | 'safety' | 'mechanism';
  boundTag: string; // Address or Symbol
  position: [number, number, number];
  rotation: [number, number, number];
  primitiveResult: TwinPrimitiveResult;
}

export interface CatalogItemDefinition {
  id: string;
  name: string;
  category: 'sensor' | 'actuator' | 'indicator' | 'safety' | 'mechanism';
  icon: React.ComponentType<{ className?: string }>;
  defaultTagAddress: string;
  defaultSymbol: string;
  description: string;
  ioType: 'INPUT' | 'OUTPUT';
  factory: (options?: {
    position?: THREE.Vector3;
    rotation?: THREE.Euler;
    boundTag?: string;
    name?: string;
    customParams?: Record<string, any>;
  }) => TwinPrimitiveResult;
  suggestedPlacements: { label: string; pos: [number, number, number] }[];
}

// =========================================================================
// 1. SENSOR 3D PRIMITIVE FACTORY FUNCTIONS (INPUTS)
// =========================================================================

/**
 * Photoelectric Retroreflective / Beam Sensor
 */
export function createPhotoelectricSensor(options?: {
  position?: THREE.Vector3;
  rotation?: THREE.Euler;
  boundTag?: string;
  name?: string;
}): TwinPrimitiveResult {
  const boundTag = options?.boundTag || 'I0.0';
  const pos = options?.position || new THREE.Vector3(0, 1.6, 1.0);
  const rot = options?.rotation || new THREE.Euler(0, 0, 0);
  const name = options?.name || 'Photoelectric Laser Sensor';

  const group = new THREE.Group();
  group.position.copy(pos);
  group.rotation.copy(rot);
  const interactiveMeshes: THREE.Object3D[] = [];

  // Sensor Bracket
  const bracketMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.2 });
  const mount = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.75, 0.12), bracketMat);
  mount.position.y = -0.3;
  group.add(mount);

  // Barrel Housing
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.6, roughness: 0.3 });
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.3, 16), bodyMat);
  head.rotation.x = Math.PI / 2;
  group.add(head);

  // Indicator LED
  const ledMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, emissive: 0x000000 });
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), ledMat);
  led.position.set(0, 0.12, 0);
  group.add(led);

  // Optical Beam
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.65 });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 2.2, 8), beamMat);
  beam.rotation.x = Math.PI / 2;
  beam.position.set(0, 0, -1.1);
  group.add(beam);

  head.userData = {
    tagIdentifier: boundTag,
    name: name,
    type: 'sensor',
    description: `Optical proximity sensor linked to ${boundTag}`,
  };
  beam.userData = head.userData;
  interactiveMeshes.push(head, beam);

  const metadata: ComponentBindingMetadata = {
    id: `sensor-pe-${boundTag}`,
    name,
    category: 'sensor',
    defaultTagAddress: boundTag,
    defaultSymbol: 'PART_SENSOR',
    description: 'Optical retro-reflective sensor with visible targeting beam',
    interactive: true,
  };

  const update = (_delta: number, tagLookup: (addrOrSym: string) => boolean) => {
    const isTriggered = tagLookup(boundTag);
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
 * Inductive Proximity Sensor (Threaded Barrel M18)
 */
export function createInductiveSensor(options?: {
  position?: THREE.Vector3;
  rotation?: THREE.Euler;
  boundTag?: string;
  name?: string;
}): TwinPrimitiveResult {
  const boundTag = options?.boundTag || 'I0.1';
  const pos = options?.position || new THREE.Vector3(0, 1.4, 0.8);
  const rot = options?.rotation || new THREE.Euler(0, 0, 0);
  const name = options?.name || 'Inductive Proximity Sensor';

  const group = new THREE.Group();
  group.position.copy(pos);
  group.rotation.copy(rot);
  const interactiveMeshes: THREE.Object3D[] = [];

  // Threaded Nickel-Plated Brass Body
  const barrelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.15 });
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.55, 18), barrelMat);
  barrel.rotation.x = Math.PI / 2;
  group.add(barrel);

  // Blue Sensing Face (PBT)
  const faceMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.4 });
  const face = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.088, 0.08, 18), faceMat);
  face.rotation.x = Math.PI / 2;
  face.position.set(0, 0, -0.28);
  group.add(face);

  // Rear 360-deg Yellow Status LED Ring
  const ledRingMat = new THREE.MeshStandardMaterial({ color: 0x475569, emissive: 0x000000 });
  const ledRing = new THREE.Mesh(new THREE.TorusGeometry(0.092, 0.02, 8, 20), ledRingMat);
  ledRing.position.set(0, 0, 0.22);
  group.add(ledRing);

  // Mounting Nut
  const nutMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 });
  const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 6), nutMat);
  nut.rotation.x = Math.PI / 2;
  nut.position.set(0, 0, 0.05);
  group.add(nut);

  barrel.userData = {
    tagIdentifier: boundTag,
    name: name,
    type: 'sensor',
    description: `Inductive proximity metallic sensor linked to ${boundTag}`,
  };
  face.userData = barrel.userData;
  interactiveMeshes.push(barrel, face);

  const metadata: ComponentBindingMetadata = {
    id: `sensor-ind-${boundTag}`,
    name,
    category: 'sensor',
    defaultTagAddress: boundTag,
    defaultSymbol: 'PROX_SENSOR',
    description: 'M18 Shielded inductive sensor for metallic workpiece detection',
    interactive: true,
  };

  const update = (_delta: number, tagLookup: (addrOrSym: string) => boolean) => {
    const isTriggered = tagLookup(boundTag);
    if (isTriggered) {
      ledRingMat.emissive.setHex(0xf59e0b);
      ledRingMat.color.setHex(0xf59e0b);
    } else {
      ledRingMat.emissive.setHex(0x000000);
      ledRingMat.color.setHex(0x475569);
    }
  };

  return { group, metadata, update, interactiveMeshes };
}

/**
 * Heavy-Duty Mechanical Limit Switch with Roller Lever
 */
export function createLimitSwitch(options?: {
  position?: THREE.Vector3;
  rotation?: THREE.Euler;
  boundTag?: string;
  name?: string;
}): TwinPrimitiveResult {
  const boundTag = options?.boundTag || 'I0.2';
  const pos = options?.position || new THREE.Vector3(1.5, 1.3, 0.9);
  const rot = options?.rotation || new THREE.Euler(0, 0, 0);
  const name = options?.name || 'Roller Lever Limit Switch';

  const group = new THREE.Group();
  group.position.copy(pos);
  group.rotation.copy(rot);
  const interactiveMeshes: THREE.Object3D[] = [];

  // Die-cast Zinc Housing
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.5, roughness: 0.3 });
  const switchBody = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.25), bodyMat);
  group.add(switchBody);

  // Rotary Lever Arm
  const armGroup = new THREE.Group();
  armGroup.position.set(0, 0.22, 0.1);

  const armMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 });
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.32, 0.04), armMat);
  arm.position.y = 0.16;

  // Bearing Roller
  const rollerMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
  const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.08, 16), rollerMat);
  roller.rotation.z = Math.PI / 2;
  roller.position.y = 0.32;
  armGroup.add(arm, roller);
  group.add(armGroup);

  switchBody.userData = {
    tagIdentifier: boundTag,
    name: name,
    type: 'sensor',
    description: `Mechanical limit switch linked to ${boundTag}`,
  };
  roller.userData = switchBody.userData;
  interactiveMeshes.push(switchBody, roller);

  const metadata: ComponentBindingMetadata = {
    id: `sensor-limit-${boundTag}`,
    name,
    category: 'sensor',
    defaultTagAddress: boundTag,
    defaultSymbol: 'LIMIT_SW',
    description: 'NEMA/IEC rated roller lever mechanical endstop switch',
    interactive: true,
  };

  const update = (_delta: number, tagLookup: (addrOrSym: string) => boolean) => {
    const isTriggered = tagLookup(boundTag);
    if (isTriggered) {
      armGroup.rotation.z = -0.4; // Depressed state
      bodyMat.color.setHex(0x10b981);
    } else {
      armGroup.rotation.z = 0; // Released
      bodyMat.color.setHex(0x3b82f6);
    }
  };

  return { group, metadata, update, interactiveMeshes };
}

/**
 * Operator Control Station Pushbutton (Start / Stop / E-Stop)
 */
export function createPushbuttonPrimitive(options?: {
  position?: THREE.Vector3;
  rotation?: THREE.Euler;
  boundTag?: string;
  type?: 'start' | 'stop' | 'estop';
  name?: string;
}): TwinPrimitiveResult {
  const boundTag = options?.boundTag || (options?.type === 'stop' ? 'I0.1' : options?.type === 'estop' ? 'I0.7' : 'I0.0');
  const btnType = options?.type || 'start';
  const pos = options?.position || new THREE.Vector3(-3.0, 1.6, 1.4);
  const rot = options?.rotation || new THREE.Euler(0, 0, 0);
  const name = options?.name || (btnType === 'start' ? 'Start Button (NO)' : btnType === 'stop' ? 'Stop Button (NC)' : 'Emergency Stop');

  const group = new THREE.Group();
  group.position.copy(pos);
  group.rotation.copy(rot);
  const interactiveMeshes: THREE.Object3D[] = [];

  // Enclosure Box
  const encMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
  const enclosure = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.25), encMat);
  group.add(enclosure);

  // Button Bezel
  const bezelMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
  const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 20), bezelMat);
  bezel.rotation.x = Math.PI / 2;
  bezel.position.set(0, 0, 0.13);
  group.add(bezel);

  // Plunger / Cap
  const btnColor = btnType === 'start' ? 0x10b981 : btnType === 'stop' ? 0xef4444 : 0xdc2626;
  const capMat = new THREE.MeshStandardMaterial({ color: btnColor, roughness: 0.3 });
  
  let cap: THREE.Mesh;
  if (btnType === 'estop') {
    // Mushroom head
    cap = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.12, 20), capMat);
  } else {
    // Flush / Extended cap
    cap = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 20), capMat);
  }
  cap.rotation.x = Math.PI / 2;
  cap.position.set(0, 0, 0.16);
  group.add(cap);

  cap.userData = {
    tagIdentifier: boundTag,
    name: name,
    type: 'button',
    description: `Pushbutton station linked to ${boundTag}`,
  };
  interactiveMeshes.push(cap);

  const metadata: ComponentBindingMetadata = {
    id: `button-${btnType}-${boundTag}`,
    name,
    category: 'sensor',
    defaultTagAddress: boundTag,
    defaultSymbol: btnType === 'start' ? 'PB_START' : btnType === 'stop' ? 'PB_STOP' : 'ESTOP_OK',
    description: `22mm industrial pushbutton with spring return (${btnType.toUpperCase()})`,
    interactive: true,
  };

  const update = (_delta: number, tagLookup: (addrOrSym: string) => boolean) => {
    const isPressed = tagLookup(boundTag);
    cap.position.z = isPressed ? 0.13 : 0.16;
  };

  return { group, metadata, update, interactiveMeshes };
}

// =========================================================================
// 2. ACTUATOR 3D PRIMITIVE FACTORY FUNCTIONS (OUTPUTS)
// =========================================================================

/**
 * Pneumatic Sorter Cylinder with Extension Rod & Diverter Paddle
 */
export function createPneumaticCylinderPrimitive(options?: {
  position?: THREE.Vector3;
  rotation?: THREE.Euler;
  boundTag?: string;
  strokeLength?: number;
  name?: string;
}): TwinPrimitiveResult {
  const boundTag = options?.boundTag || 'Q0.1';
  const stroke = options?.strokeLength || 1.1;
  const pos = options?.position || new THREE.Vector3(2.0, 1.5, -1.2);
  const rot = options?.rotation || new THREE.Euler(0, 0, 0);
  const name = options?.name || 'Pneumatic Sorter Cylinder';

  const group = new THREE.Group();
  group.position.copy(pos);
  group.rotation.copy(rot);
  const interactiveMeshes: THREE.Object3D[] = [];

  // Cylinder Body (Anodized Aluminum)
  const barrelMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });
  const cylinder = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.9), barrelMat);
  group.add(cylinder);

  // Air fittings (Blue push-to-connect)
  const fittingMat = new THREE.MeshStandardMaterial({ color: 0x2563eb });
  const fit1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.1), fittingMat);
  fit1.position.set(0, 0.25, 0.3);
  const fit2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.1), fittingMat);
  fit2.position.set(0, 0.25, -0.3);
  group.add(fit1, fit2);

  // Moving Rod Assembly
  const rodGroup = new THREE.Group();
  
  const rodMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.1 });
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.0), rodMat);
  rod.rotation.x = Math.PI / 2;
  rod.position.z = 0.5;

  const paddleMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4, metalness: 0.2 });
  const paddle = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.08), paddleMat);
  paddle.position.set(0, 0, 1.0);

  rodGroup.add(rod, paddle);
  group.add(rodGroup);

  cylinder.userData = {
    tagIdentifier: boundTag,
    name: name,
    type: 'actuator',
    description: `Pneumatic diverter solenoid actuated by ${boundTag}`,
  };
  paddle.userData = cylinder.userData;
  interactiveMeshes.push(paddle, cylinder);

  const metadata: ComponentBindingMetadata = {
    id: `actuator-cylinder-${boundTag}`,
    name,
    category: 'actuator',
    defaultTagAddress: boundTag,
    defaultSymbol: 'PUSHER_SOL',
    description: 'Double-acting pneumatic linear cylinder with workpiece divert paddle',
    interactive: true,
  };

  let currentExtension = 0;
  const update = (delta: number, tagLookup: (addrOrSym: string) => boolean) => {
    const isEnergized = tagLookup(boundTag);
    const target = isEnergized ? stroke : 0;
    currentExtension = THREE.MathUtils.lerp(currentExtension, target, delta * 12);
    rodGroup.position.z = currentExtension;
  };

  return { group, metadata, update, interactiveMeshes };
}

/**
 * 3-Phase Electric Induction Drive Motor
 */
export function createMotorPrimitive(options?: {
  position?: THREE.Vector3;
  rotation?: THREE.Euler;
  boundTag?: string;
  name?: string;
}): TwinPrimitiveResult {
  const boundTag = options?.boundTag || 'Q0.0';
  const pos = options?.position || new THREE.Vector3(4.8, 0.9, 0);
  const rot = options?.rotation || new THREE.Euler(0, 0, 0);
  const name = options?.name || '3-Phase AC Induction Motor';

  const group = new THREE.Group();
  group.position.copy(pos);
  group.rotation.copy(rot);
  const interactiveMeshes: THREE.Object3D[] = [];

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.7, roughness: 0.3 });
  const shaftMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.1 });
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x334155 });

  // Base Plate
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.15, 1.4), baseMat);
  base.position.y = 0.08;
  group.add(base);

  // Stator Housing
  const stator = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 1.4, 24), bodyMat);
  stator.rotation.z = Math.PI / 2;
  stator.position.set(0, 0.7, 0);
  group.add(stator);

  // Terminal box
  const termBox = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.4), baseMat);
  termBox.position.set(0, 1.4, 0);
  group.add(termBox);

  // Shaft & Keyed Pulley
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.0, 16), shaftMat);
  shaft.rotation.z = Math.PI / 2;
  shaft.position.set(0.2, 0.7, 0);
  group.add(shaft);

  const pulleyMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8 });
  const pulley = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.18, 16), pulleyMat);
  pulley.rotation.z = Math.PI / 2;
  pulley.position.set(1.0, 0.7, 0);

  const marker = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.28, 0.04), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  marker.position.set(1.1, 0.8, 0);

  const pulleyGroup = new THREE.Group();
  pulleyGroup.add(pulley, marker);
  group.add(pulleyGroup);

  stator.userData = {
    tagIdentifier: boundTag,
    name: name,
    type: 'actuator',
    description: `Electric Motor actuated by ${boundTag}`,
  };
  interactiveMeshes.push(stator);

  const metadata: ComponentBindingMetadata = {
    id: `actuator-motor-${boundTag}`,
    name,
    category: 'actuator',
    defaultTagAddress: boundTag,
    defaultSymbol: 'MOTOR_RUN',
    description: 'High-torque AC squirrel-cage induction drive motor',
    interactive: true,
  };

  let angle = 0;
  const update = (delta: number, tagLookup: (addrOrSym: string) => boolean) => {
    const isRunning = tagLookup(boundTag);
    if (isRunning) {
      angle += delta * 12;
      shaft.rotation.x = angle;
      pulleyGroup.rotation.x = angle;
    }
  };

  return { group, metadata, update, interactiveMeshes };
}

/**
 * Brass Solenoid Fluid Control Valve
 */
export function createSolenoidValvePrimitive(options?: {
  position?: THREE.Vector3;
  rotation?: THREE.Euler;
  boundTag?: string;
  name?: string;
}): TwinPrimitiveResult {
  const boundTag = options?.boundTag || 'Q0.2';
  const pos = options?.position || new THREE.Vector3(-2.0, 1.2, 0);
  const rot = options?.rotation || new THREE.Euler(0, 0, 0);
  const name = options?.name || '2-Way Solenoid Valve';

  const group = new THREE.Group();
  group.position.copy(pos);
  group.rotation.copy(rot);
  const interactiveMeshes: THREE.Object3D[] = [];

  // Forged Brass Valve Body
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.85, roughness: 0.25 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 0.35), brassMat);
  group.add(body);

  // Flanged Ports
  const port1 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.2), brassMat);
  port1.rotation.z = Math.PI / 2;
  port1.position.set(-0.25, 0, 0);
  const port2 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.2), brassMat);
  port2.rotation.z = Math.PI / 2;
  port2.position.set(0.25, 0, 0);
  group.add(port1, port2);

  // Black Epoxy Encapsulated Solenoid Coil
  const coilMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
  const coil = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.45, 16), coilMat);
  coil.position.y = 0.38;
  group.add(coil);

  // DIN Connector
  const connMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
  const conn = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.2), connMat);
  conn.position.set(0, 0.45, 0.18);
  group.add(conn);

  // LED indicator on connector
  const ledMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, emissive: 0x000000 });
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 10), ledMat);
  led.position.set(0, 0.45, 0.28);
  group.add(led);

  body.userData = {
    tagIdentifier: boundTag,
    name: name,
    type: 'actuator',
    description: `Process solenoid valve actuated by ${boundTag}`,
  };
  interactiveMeshes.push(body);

  const metadata: ComponentBindingMetadata = {
    id: `actuator-valve-${boundTag}`,
    name,
    category: 'actuator',
    defaultTagAddress: boundTag,
    defaultSymbol: 'VALVE_SOL',
    description: 'Pilot-operated 2-way direct acting solenoid valve',
    interactive: true,
  };

  const update = (_delta: number, tagLookup: (addrOrSym: string) => boolean) => {
    const isOpen = tagLookup(boundTag);
    if (isOpen) {
      ledMat.emissive.setHex(0x10b981);
      ledMat.color.setHex(0x10b981);
    } else {
      ledMat.emissive.setHex(0x000000);
      ledMat.color.setHex(0x1e293b);
    }
  };

  return { group, metadata, update, interactiveMeshes };
}

// =========================================================================
// 3. INDICATOR & SIGNALING PRIMITIVE FACTORY FUNCTIONS
// =========================================================================

/**
 * 3-Tier Andon Signal Stack Tower Light (Red / Amber / Green)
 */
export function createStackTowerLightPrimitive(options?: {
  position?: THREE.Vector3;
  rotation?: THREE.Euler;
  redTag?: string;
  amberTag?: string;
  greenTag?: string;
  name?: string;
}): TwinPrimitiveResult {
  const redTag = options?.redTag || 'Q0.0';
  const amberTag = options?.amberTag || 'Q0.1';
  const greenTag = options?.greenTag || 'Q0.2';
  const pos = options?.position || new THREE.Vector3(-3.5, 1.8, 1.2);
  const rot = options?.rotation || new THREE.Euler(0, 0, 0);
  const name = options?.name || 'Andon Stack Tower Light';

  const group = new THREE.Group();
  group.position.copy(pos);
  group.rotation.copy(rot);
  const interactiveMeshes: THREE.Object3D[] = [];

  // Aluminum Mounting Pole & Base
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9), poleMat);
  pole.position.y = 0.45;
  group.add(pole);

  // Tier Cylinders
  const redTierMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, emissive: 0x000000, roughness: 0.2 });
  const redTier = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.22, 20), redTierMat);
  redTier.position.y = 1.35;

  const amberTierMat = new THREE.MeshStandardMaterial({ color: 0x78350f, emissive: 0x000000, roughness: 0.2 });
  const amberTier = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.22, 20), amberTierMat);
  amberTier.position.y = 1.12;

  const greenTierMat = new THREE.MeshStandardMaterial({ color: 0x064e3b, emissive: 0x000000, roughness: 0.2 });
  const greenTier = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.22, 20), greenTierMat);
  greenTier.position.y = 0.89;

  group.add(redTier, amberTier, greenTier);

  // Point light for active glow
  const stackLight = new THREE.PointLight(0xffffff, 0, 4);
  stackLight.position.y = 1.1;
  group.add(stackLight);

  redTier.userData = {
    tagIdentifier: redTag,
    name: 'Stack Light Red Element',
    type: 'indicator',
    description: `Alarm indicator bound to ${redTag}`,
  };
  amberTier.userData = {
    tagIdentifier: amberTag,
    name: 'Stack Light Amber Element',
    type: 'indicator',
    description: `Warning indicator bound to ${amberTag}`,
  };
  greenTier.userData = {
    tagIdentifier: greenTag,
    name: 'Stack Light Green Element',
    type: 'indicator',
    description: `Normal running indicator bound to ${greenTag}`,
  };
  interactiveMeshes.push(redTier, amberTier, greenTier);

  const metadata: ComponentBindingMetadata = {
    id: `indicator-tower-${redTag}`,
    name,
    category: 'indicator',
    defaultTagAddress: greenTag,
    defaultSymbol: 'ANDON_RUN',
    description: '3-tier LED visual signal tower for cell operational state',
    interactive: true,
  };

  const update = (_delta: number, tagLookup: (addrOrSym: string) => boolean) => {
    const isRed = tagLookup(redTag);
    const isAmber = tagLookup(amberTag);
    const isGreen = tagLookup(greenTag);

    redTierMat.emissive.setHex(isRed ? 0xef4444 : 0x000000);
    amberTierMat.emissive.setHex(isAmber ? 0xf59e0b : 0x000000);
    greenTierMat.emissive.setHex(isGreen ? 0x10b981 : 0x000000);

    if (isRed) {
      stackLight.color.setHex(0xef4444);
      stackLight.intensity = 1.5;
    } else if (isAmber) {
      stackLight.color.setHex(0xf59e0b);
      stackLight.intensity = 1.2;
    } else if (isGreen) {
      stackLight.color.setHex(0x10b981);
      stackLight.intensity = 1.2;
    } else {
      stackLight.intensity = 0;
    }
  };

  return { group, metadata, update, interactiveMeshes };
}

/**
 * Optical Safety Light Curtain (Dual Emitter/Receiver Posts)
 */
export function createSafetyLightCurtain(options?: {
  position?: THREE.Vector3;
  rotation?: THREE.Euler;
  boundTag?: string;
  name?: string;
}): TwinPrimitiveResult {
  const boundTag = options?.boundTag || 'I0.6';
  const pos = options?.position || new THREE.Vector3(0, 1.2, 0);
  const rot = options?.rotation || new THREE.Euler(0, 0, 0);
  const name = options?.name || 'Safety Light Curtain';

  const group = new THREE.Group();
  group.position.copy(pos);
  group.rotation.copy(rot);
  const interactiveMeshes: THREE.Object3D[] = [];

  const postMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 });
  
  // Left Emitter Column
  const colL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.6, 0.14), postMat);
  colL.position.set(-1.4, 0.8, 0);
  
  // Right Receiver Column
  const colR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.6, 0.14), postMat);
  colR.position.set(1.4, 0.8, 0);
  group.add(colL, colR);

  // Multi-beam IR Array
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.35 });
  const beams: THREE.Mesh[] = [];
  for (let y = 0.2; y <= 1.4; y += 0.2) {
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 2.8, 6), beamMat);
    beam.rotation.z = Math.PI / 2;
    beam.position.set(0, y, 0);
    group.add(beam);
    beams.push(beam);
  }

  colL.userData = {
    tagIdentifier: boundTag,
    name: name,
    type: 'sensor',
    description: `Category 4 safety light curtain linked to ${boundTag}`,
  };
  colR.userData = colL.userData;
  interactiveMeshes.push(colL, colR);

  const metadata: ComponentBindingMetadata = {
    id: `safety-curtain-${boundTag}`,
    name,
    category: 'safety',
    defaultTagAddress: boundTag,
    defaultSymbol: 'CURTAIN_OK',
    description: 'EN/ISO 13849 Category 4 Safety Optical Light Curtain',
    interactive: true,
  };

  const update = (_delta: number, tagLookup: (addrOrSym: string) => boolean) => {
    const isSafe = tagLookup(boundTag);
    if (isSafe) {
      beamMat.color.setHex(0x22c55e);
      beamMat.opacity = 0.2;
    } else {
      beamMat.color.setHex(0xef4444);
      beamMat.opacity = 0.6;
    }
  };

  return { group, metadata, update, interactiveMeshes };
}

// =========================================================================
// 4. STRUCTURED CATALOG REGISTRY
// =========================================================================

export const DIGITAL_TWIN_CATALOG_ITEMS: CatalogItemDefinition[] = [
  {
    id: 'photoelectric_sensor',
    name: 'Photoelectric Beam Sensor',
    category: 'sensor',
    icon: Eye,
    defaultTagAddress: 'I0.0',
    defaultSymbol: 'PART_DETECT',
    description: 'Optical retro-reflective sensor with focused visible targeting laser beam for workpiece detection.',
    ioType: 'INPUT',
    factory: (opts) => createPhotoelectricSensor({ ...opts, boundTag: opts?.boundTag || 'I0.0' }),
    suggestedPlacements: [
      { label: 'Conveyor Infeed (x: -2.5)', pos: [-2.5, 1.6, 1.05] },
      { label: 'Inspection Center (x: 0.0)', pos: [0.0, 1.6, 1.05] },
      { label: 'Ejection Station (x: 2.0)', pos: [2.0, 1.6, 1.05] },
    ],
  },
  {
    id: 'inductive_sensor',
    name: 'Inductive Proximity Sensor (M18)',
    category: 'sensor',
    icon: Radio,
    defaultTagAddress: 'I0.1',
    defaultSymbol: 'PROX_METALLIC',
    description: 'Shielded M18 inductive proximity sensor for non-contact detection of ferrous & non-ferrous metal parts.',
    ioType: 'INPUT',
    factory: (opts) => createInductiveSensor({ ...opts, boundTag: opts?.boundTag || 'I0.1' }),
    suggestedPlacements: [
      { label: 'Sorter Station (x: 1.5)', pos: [1.5, 1.4, 0.9] },
      { label: 'Cylinder Home (x: -1.0)', pos: [-1.0, 1.4, 0.9] },
    ],
  },
  {
    id: 'limit_switch',
    name: 'Roller Lever Limit Switch',
    category: 'sensor',
    icon: Activity,
    defaultTagAddress: 'I0.2',
    defaultSymbol: 'LIMIT_ENDSTOP',
    description: 'Heavy-duty snap-action limit switch with mechanical roller lever arm for stroke limit position feedback.',
    ioType: 'INPUT',
    factory: (opts) => createLimitSwitch({ ...opts, boundTag: opts?.boundTag || 'I0.2' }),
    suggestedPlacements: [
      { label: 'Conveyor Endstop (x: 4.2)', pos: [4.2, 1.4, 0.9] },
      { label: 'Pneumatic Retract (x: 1.6)', pos: [1.6, 1.4, -1.8] },
    ],
  },
  {
    id: 'pushbutton_start',
    name: 'Start Pushbutton Station (NO)',
    category: 'sensor',
    icon: PlusCircle,
    defaultTagAddress: 'I0.0',
    defaultSymbol: 'PB_START',
    description: 'Panel-mount momentary normally-open green start pushbutton contact for machine cycle initiation.',
    ioType: 'INPUT',
    factory: (opts) => createPushbuttonPrimitive({ ...opts, type: 'start', boundTag: opts?.boundTag || 'I0.0' }),
    suggestedPlacements: [
      { label: 'Control Console (x: -3.5)', pos: [-3.5, 1.6, 1.4] },
      { label: 'Operator Station (x: 0.0)', pos: [0.0, 1.6, 1.4] },
    ],
  },
  {
    id: 'pushbutton_estop',
    name: 'Emergency Stop Mushroom Switch',
    category: 'safety',
    icon: AlertTriangle,
    defaultTagAddress: 'I0.7',
    defaultSymbol: 'ESTOP_OK',
    description: 'Twist-to-reset 40mm red mushroom head emergency stop pushbutton with positive break contacts.',
    ioType: 'INPUT',
    factory: (opts) => createPushbuttonPrimitive({ ...opts, type: 'estop', boundTag: opts?.boundTag || 'I0.7' }),
    suggestedPlacements: [
      { label: 'Main Control Panel (x: -3.5)', pos: [-3.5, 1.2, 1.4] },
    ],
  },
  {
    id: 'pneumatic_cylinder',
    name: 'Pneumatic Sorter Cylinder',
    category: 'actuator',
    icon: ArrowRightLeft,
    defaultTagAddress: 'Q0.1',
    defaultSymbol: 'PUSHER_SOL',
    description: 'Double-acting pneumatic linear cylinder actuator with stroke diversion paddle for sorting bad workpieces.',
    ioType: 'OUTPUT',
    factory: (opts) => createPneumaticCylinderPrimitive({ ...opts, boundTag: opts?.boundTag || 'Q0.1' }),
    suggestedPlacements: [
      { label: 'Diverter Station (x: 2.0)', pos: [2.0, 1.6, -1.4] },
      { label: 'Reject Chute (x: -0.5)', pos: [-0.5, 1.6, -1.4] },
    ],
  },
  {
    id: 'drive_motor',
    name: '3-Phase Induction Drive Motor',
    category: 'actuator',
    icon: Gauge,
    defaultTagAddress: 'Q0.0',
    defaultSymbol: 'MOTOR_FWD',
    description: 'High-torque AC asynchronous induction drive motor with rotating shaft, cooling fan, and keyed pulley.',
    ioType: 'OUTPUT',
    factory: (opts) => createMotorPrimitive({ ...opts, boundTag: opts?.boundTag || 'Q0.0' }),
    suggestedPlacements: [
      { label: 'Conveyor Drive Head (x: 4.8)', pos: [4.8, 0.9, 0] },
      { label: 'Feeder Drive (x: -4.8)', pos: [-4.8, 0.9, 0] },
    ],
  },
  {
    id: 'solenoid_valve',
    name: 'Fluid Solenoid Valve',
    category: 'actuator',
    icon: Flame,
    defaultTagAddress: 'Q0.2',
    defaultSymbol: 'VALVE_INLET',
    description: '2-way direct acting brass solenoid valve with LED connector for process fluid or pneumatic line control.',
    ioType: 'OUTPUT',
    factory: (opts) => createSolenoidValvePrimitive({ ...opts, boundTag: opts?.boundTag || 'Q0.2' }),
    suggestedPlacements: [
      { label: 'Main Inlet Line (x: -2.0)', pos: [-2.0, 1.2, 0] },
      { label: 'Discharge Port (x: 2.0)', pos: [2.0, 1.2, 0] },
    ],
  },
  {
    id: 'stack_tower_light',
    name: 'Andon Signal Tower Light (3-Tier)',
    category: 'indicator',
    icon: Lightbulb,
    defaultTagAddress: 'Q0.0',
    defaultSymbol: 'ANDON_STACK',
    description: '3-tier LED visual signal column (Red Alarm, Amber Warning, Green Running) for machine status signaling.',
    ioType: 'OUTPUT',
    factory: (opts) => createStackTowerLightPrimitive({ ...opts, greenTag: opts?.boundTag || 'Q0.0' }),
    suggestedPlacements: [
      { label: 'Workcell Mast (x: -3.8)', pos: [-3.8, 1.2, 1.2] },
      { label: 'Top Overhead (x: 0.0)', pos: [0.0, 2.5, 0] },
    ],
  },
  {
    id: 'safety_light_curtain',
    name: 'Safety Optical Light Curtain',
    category: 'safety',
    icon: ShieldCheck,
    defaultTagAddress: 'I0.6',
    defaultSymbol: 'CURTAIN_GUARD',
    description: 'Multi-beam Category 4 optoelectronic safety protective curtain preventing hazardous entry during operation.',
    ioType: 'INPUT',
    factory: (opts) => createSafetyLightCurtain({ ...opts, boundTag: opts?.boundTag || 'I0.6' }),
    suggestedPlacements: [
      { label: 'Infeed Guard Zone (x: -3.0)', pos: [-3.0, 0.6, 0] },
      { label: 'Ejection Guard Zone (x: 3.0)', pos: [3.0, 0.6, 0] },
    ],
  },
];

// =========================================================================
// 5. REACT UI CATALOG DRAWER / MODAL COMPONENT
// =========================================================================

interface DigitalTwinCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectFile;
  onPlacePrimitive: (item: CatalogItemDefinition, boundTag: string, pos: [number, number, number]) => void;
  placedInstances: PlacedPrimitiveInstance[];
  onRemoveInstance: (instanceId: string) => void;
  theme: ThemeStyle;
}

export const DigitalTwinCatalogModal: React.FC<DigitalTwinCatalogModalProps> = ({
  isOpen,
  onClose,
  project,
  onPlacePrimitive,
  placedInstances,
  onRemoveInstance,
  theme,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'sensor' | 'actuator' | 'indicator' | 'safety'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<CatalogItemDefinition | null>(DIGITAL_TWIN_CATALOG_ITEMS[0]);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [customPos, setCustomPos] = useState<[number, number, number]>([0, 1.6, 1.0]);
  const [activeTab, setActiveTab] = useState<'catalog' | 'placed'>('catalog');

  if (!isOpen) return null;

  const filteredItems = DIGITAL_TWIN_CATALOG_ITEMS.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.defaultTagAddress.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSelectCatalogItem = (item: CatalogItemDefinition) => {
    setSelectedItem(item);
    // Find matching tag in project if available, or default
    const matchingTag = project.ioMap.find(t => t.address.rawString.toUpperCase() === item.defaultTagAddress.toUpperCase());
    setSelectedTag(matchingTag ? matchingTag.address.rawString : item.defaultTagAddress);
    if (item.suggestedPlacements.length > 0) {
      setCustomPos(item.suggestedPlacements[0].pos);
    }
  };

  const handlePlace = () => {
    if (!selectedItem) return;
    const tagToBind = selectedTag || selectedItem.defaultTagAddress;
    onPlacePrimitive(selectedItem, tagToBind, customPos);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in">
      <div className={`w-full max-w-4xl h-[620px] rounded-xl shadow-2xl flex flex-col overflow-hidden border ${
        theme === 'modern' 
          ? 'bg-white border-slate-200 text-slate-800' 
          : 'bg-[#111114] border-slate-800 text-slate-100'
      }`}>
        {/* Header */}
        <div className={`h-14 px-6 border-b flex items-center justify-between shrink-0 ${
          theme === 'modern' ? 'bg-slate-50 border-slate-200' : 'bg-[#16161a] border-slate-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Box className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <span>3D Digital Twin Component Catalog</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  Primitive Library
                </span>
              </h2>
              <p className="text-xs text-slate-400">Select, bind, and place interactive 3D sensors and actuators into the virtual cell</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[#1a1a1e] p-0.5 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('catalog')}
                className={`px-3 py-1 rounded font-medium transition-colors cursor-pointer ${
                  activeTab === 'catalog' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Component Library
              </button>
              <button
                onClick={() => setActiveTab('placed')}
                className={`px-3 py-1 rounded font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'placed' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Placed in Scene</span>
                <span className="w-4 h-4 rounded-full bg-slate-800 text-[10px] flex items-center justify-center">
                  {placedInstances.length}
                </span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {activeTab === 'catalog' ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Left Panel: Filter & Item Grid */}
            <div className="w-7/12 border-r border-slate-800 flex flex-col p-4 space-y-3 overflow-hidden">
              {/* Search & Category Filter */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search 3D primitives (sensor, valve, motor)..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#1a1a1e] border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
                {(['all', 'sensor', 'actuator', 'indicator', 'safety'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium capitalize whitespace-nowrap transition-colors cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-blue-600/30 text-blue-400 border border-blue-500/50 font-bold'
                        : 'bg-[#1a1a1e] text-slate-400 border border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {cat === 'all' ? 'All Primitives' : cat}
                  </button>
                ))}
              </div>

              {/* Item Card Grid */}
              <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 gap-2.5">
                {filteredItems.map((item) => {
                  const Icon = item.icon;
                  const isSelected = selectedItem?.id === item.id;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectCatalogItem(item)}
                      className={`p-3 rounded-lg border flex flex-col justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-950/40 border-blue-500 shadow-md ring-1 ring-blue-500/50'
                          : 'bg-[#16161a] border-slate-800/80 hover:border-slate-700 hover:bg-[#1a1a1e]'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          item.ioType === 'INPUT' 
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' 
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-slate-200 truncate">{item.name}</h4>
                          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                            <span className={`px-1 rounded ${item.ioType === 'INPUT' ? 'bg-blue-900/60 text-blue-300' : 'bg-amber-900/60 text-amber-300'}`}>
                              {item.defaultTagAddress}
                            </span>
                            <span className="truncate text-slate-500">{item.defaultSymbol}</span>
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-2">
                        {item.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Panel: Placement & PLC Tag Binding Inspector */}
            {selectedItem && (
              <div className="w-5/12 p-4 flex flex-col justify-between space-y-4 bg-[#141418]">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/40">
                      {React.createElement(selectedItem.icon, { className: 'w-5 h-5' })}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-100">{selectedItem.name}</h3>
                      <span className="text-[10px] text-blue-400 uppercase tracking-wider font-mono">
                        Category: {selectedItem.category} | {selectedItem.ioType}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed bg-[#1a1a1e] p-2.5 rounded-lg border border-slate-800">
                    {selectedItem.description}
                  </p>

                  {/* PLC Tag Binding Configuration */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-blue-400" />
                      <span>Bind to PLC Tag / Address:</span>
                    </label>
                    <select
                      value={selectedTag || selectedItem.defaultTagAddress}
                      onChange={(e) => setSelectedTag(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#1a1a1e] border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      <optgroup label="Project I/O Map Tags">
                        {project.ioMap.map((tag) => (
                          <option key={tag.id} value={tag.address.rawString}>
                            {tag.address.rawString} ({tag.symbol}) - {tag.description}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Default / Custom Address">
                        <option value={selectedItem.defaultTagAddress}>
                          {selectedItem.defaultTagAddress} ({selectedItem.defaultSymbol})
                        </option>
                      </optgroup>
                    </select>
                  </div>

                  {/* Preset Placements */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-blue-400" />
                      <span>Quick Spatial Placement:</span>
                    </label>
                    <div className="grid grid-cols-1 gap-1.5">
                      {selectedItem.suggestedPlacements.map((sug, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCustomPos(sug.pos)}
                          className={`px-2.5 py-1.5 rounded-lg border text-left text-xs font-mono flex items-center justify-between transition-colors cursor-pointer ${
                            customPos[0] === sug.pos[0] && customPos[2] === sug.pos[2]
                              ? 'bg-blue-600/30 border-blue-500 text-blue-300 font-bold'
                              : 'bg-[#1a1a1e] border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span>{sug.label}</span>
                          <span className="text-[10px] text-slate-500">[{sug.pos.join(', ')}]</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Manual Coordinates */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-400">Custom Position (X, Y, Z):</label>
                    <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-slate-500">X:</span>
                        <input
                          type="number"
                          step="0.2"
                          value={customPos[0]}
                          onChange={(e) => setCustomPos([parseFloat(e.target.value) || 0, customPos[1], customPos[2]])}
                          className="w-full px-2 py-1 rounded bg-[#1a1a1e] border border-slate-800 text-slate-200"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500">Y:</span>
                        <input
                          type="number"
                          step="0.2"
                          value={customPos[1]}
                          onChange={(e) => setCustomPos([customPos[0], parseFloat(e.target.value) || 0, customPos[2]])}
                          className="w-full px-2 py-1 rounded bg-[#1a1a1e] border border-slate-800 text-slate-200"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500">Z:</span>
                        <input
                          type="number"
                          step="0.2"
                          value={customPos[2]}
                          onChange={(e) => setCustomPos([customPos[0], customPos[1], parseFloat(e.target.value) || 0])}
                          className="w-full px-2 py-1 rounded bg-[#1a1a1e] border border-slate-800 text-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Place Action Button */}
                <button
                  onClick={handlePlace}
                  className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Place {selectedItem.name} in 3D Scene</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Placed in Scene Tab */
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-200">Active Custom 3D Components ({placedInstances.length})</h3>
                <p className="text-xs text-slate-400">Manage dynamically placed sensors, actuators, and indicators in the active twin</p>
              </div>
            </div>

            {placedInstances.length === 0 ? (
              <div className="h-64 rounded-xl border border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-500 space-y-2">
                <Box className="w-8 h-8 opacity-40" />
                <p className="text-xs">No custom 3D primitives placed yet.</p>
                <button
                  onClick={() => setActiveTab('catalog')}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Browse Component Library</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {placedInstances.map((inst) => (
                  <div
                    key={inst.instanceId}
                    className="p-3.5 rounded-lg bg-[#16161a] border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-slate-200 truncate">{inst.name}</h4>
                      <div className="flex items-center gap-2 mt-1 font-mono text-[10px]">
                        <span className="px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-500/30">
                          {inst.boundTag}
                        </span>
                        <span className="text-slate-500">
                          Pos: [{inst.position.map(n => n.toFixed(1)).join(', ')}]
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onRemoveInstance(inst.instanceId)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Remove from 3D Scene"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
