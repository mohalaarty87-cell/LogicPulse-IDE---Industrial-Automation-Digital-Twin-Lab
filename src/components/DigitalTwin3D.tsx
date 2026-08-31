import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { 
  Box as BoxIcon, 
  RotateCcw, 
  Eye, 
  Maximize2, 
  Play, 
  Pause, 
  Cpu, 
  Sparkles, 
  Layers, 
  Flame,
  Activity,
  Zap,
  Gauge,
  Compass,
  Radio,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Move,
  MousePointerClick,
  Info,
  Atom,
  RefreshCw,
  PlusCircle,
  ShieldCheck,
  PackageCheck
} from 'lucide-react';
import { IOTag, SimulationStatus, ThemeStyle, ProjectFile } from '../types/plc';

interface DigitalTwin3DProps {
  project: ProjectFile;
  simStatus: SimulationStatus;
  onToggleTagValue: (tagId: string) => void;
  onToggleForce: (tagId: string) => void;
  theme: ThemeStyle;
}

type SceneType = 'conveyor' | 'tank' | 'traffic' | 'motor';

interface Clickable3DObjectData {
  tagIdentifier: string;
  name: string;
  type: 'sensor' | 'button' | 'actuator';
  description: string;
}

interface PhysicsBoxEntity {
  mesh: THREE.Mesh;
  body: CANNON.Body;
  id: string;
  color: number;
  initialPos: [number, number, number];
}

export const DigitalTwin3D: React.FC<DigitalTwin3DProps> = ({
  project,
  simStatus,
  onToggleTagValue,
  onToggleForce,
  theme,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const physicsWorldRef = useRef<CANNON.World | null>(null);

  // Active 3D Twin Scene
  const [selectedScene, setSelectedScene] = useState<SceneType>(() => {
    const projId = project.project.id.toLowerCase();
    if (projId.includes('conveyor') || projId.includes('sorter')) return 'conveyor';
    if (projId.includes('tank') || projId.includes('pump')) return 'tank';
    if (projId.includes('traffic')) return 'traffic';
    return 'motor';
  });

  const [cameraPreset, setCameraPreset] = useState<'iso' | 'top' | 'front'>('iso');
  const [showTagsHUD, setShowTagsHUD] = useState(true);
  const [hoveredObjectName, setHoveredObjectName] = useState<string | null>(null);
  const [lastClickedNotice, setLastClickedNotice] = useState<{ title: string; tag: string; value: boolean } | null>(null);
  const [physicsActive, setPhysicsActive] = useState(true);
  const [boxCount, setBoxCount] = useState(1);
  const [sortedCount, setSortedCount] = useState(0);

  // Dynamic simulation internal states
  const simStateRef = useRef({
    // Conveyor
    conveyorPos: 0,
    boxDetected: false,
    pusherZ: 0,
    batchCount: 0,
    sortedBoxIds: new Set<string>(),
    // Tank
    waterLevel: 1.5, // 0 to 4.0
    // Traffic
    carPosition: -8,
    // Motor
    motorAngle: 0,
    motorRPM: 0,
  });

  // Fast tag lookup map
  const tagMap = useMemo(() => {
    const map = new Map<string, IOTag>();
    project.ioMap.forEach((t) => {
      map.set(t.address.rawString.toUpperCase(), t);
      map.set(t.symbol.toUpperCase(), t);
    });
    return map;
  }, [project.ioMap]);

  // Read current live value of tag
  const isTagTrue = (addressOrSymbol: string): boolean => {
    const tag = tagMap.get(addressOrSymbol.toUpperCase());
    if (!tag) return false;
    const val = tag.isForced && tag.forcedValue !== undefined ? tag.forcedValue : tag.currentValue;
    return Boolean(val);
  };

  const getTag = (addressOrSymbol: string): IOTag | undefined => {
    return tagMap.get(addressOrSymbol.toUpperCase());
  };

  // Switch scene preset cameras
  const setCameraView = (view: 'iso' | 'top' | 'front') => {
    setCameraPreset(view);
    if (!cameraRef.current) return;
    const cam = cameraRef.current;
    if (view === 'iso') {
      cam.position.set(7, 6, 8);
      cam.lookAt(0, 1, 0);
    } else if (view === 'top') {
      cam.position.set(0, 12, 0.1);
      cam.lookAt(0, 0, 0);
    } else if (view === 'front') {
      cam.position.set(0, 2.2, 9);
      cam.lookAt(0, 1.4, 0);
    }
  };

  // Keep references to interactive clickable 3D objects for Raycasting
  const interactiveObjectsRef = useRef<THREE.Object3D[]>([]);

  // Function to reset or spawn physics entities
  const resetPhysicsBodiesRef = useRef<() => void>(() => {});
  const spawnNewBoxRef = useRef<() => void>(() => {});

  // ================= THREE.JS & CANNON.JS INITIALIZATION =================
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(theme === 'modern' ? 0xf0f2f5 : 0x07070a);
    scene.fog = new THREE.FogExp2(theme === 'modern' ? 0xf0f2f5 : 0x07070a, 0.032);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(7, 6, 8);
    camera.lookAt(0, 1, 0);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. CANNON.JS Physics World Setup
    const world = new CANNON.World();
    world.gravity.set(0, -9.82, 0); // Standard terrestrial gravity
    world.broadphase = new CANNON.NaiveBroadphase();
    (world.solver as any).iterations = 12;
    (world.solver as any).tolerance = 0.001;
    physicsWorldRef.current = world;

    // Dedicated Physical Materials for accurate contact physics
    const groundPhysMat = new CANNON.Material('ground');
    const conveyorPhysMat = new CANNON.Material('conveyor');
    const boxPhysMat = new CANNON.Material('box');
    const railPhysMat = new CANNON.Material('rail');
    const pusherPhysMat = new CANNON.Material('pusher');
    const binPhysMat = new CANNON.Material('bin');

    // Box <-> Ground contact
    world.addContactMaterial(new CANNON.ContactMaterial(groundPhysMat, boxPhysMat, {
      friction: 0.45,
      restitution: 0.15,
    }));

    // Box <-> Conveyor belt contact (High friction for realistic traction, low bounce)
    world.addContactMaterial(new CANNON.ContactMaterial(conveyorPhysMat, boxPhysMat, {
      friction: 0.65,
      restitution: 0.05,
    }));

    // Box <-> Box collision contact (Box-to-box queuing, stacking & pushing)
    world.addContactMaterial(new CANNON.ContactMaterial(boxPhysMat, boxPhysMat, {
      friction: 0.4,
      restitution: 0.2,
    }));

    // Box <-> Guard rails contact (Low friction to glide smoothly along belt)
    world.addContactMaterial(new CANNON.ContactMaterial(railPhysMat, boxPhysMat, {
      friction: 0.08,
      restitution: 0.1,
    }));

    // Box <-> Pusher actuator contact (Instantaneous diversion impulse)
    world.addContactMaterial(new CANNON.ContactMaterial(pusherPhysMat, boxPhysMat, {
      friction: 0.25,
      restitution: 0.35,
    }));

    // Box <-> Sorting collection bin contact
    world.addContactMaterial(new CANNON.ContactMaterial(binPhysMat, boxPhysMat, {
      friction: 0.5,
      restitution: 0.1,
    }));

    // Physics Ground Plane (prevents objects falling into infinite void)
    const groundBody = new CANNON.Body({
      mass: 0, // static
      shape: new CANNON.Plane(),
      material: groundPhysMat,
    });
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    groundBody.position.set(0, 0, 0);
    world.addBody(groundBody);

    // 5. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(8, 14, 7);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 35;
    dirLight.shadow.camera.left = -9;
    dirLight.shadow.camera.right = 9;
    dirLight.shadow.camera.top = 9;
    dirLight.shadow.camera.bottom = -9;
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x3b82f6, 1.4, 16);
    pointLight.position.set(-3, 5, 4);
    scene.add(pointLight);

    // 6. Floor Visual Grid
    const gridHelper = new THREE.GridHelper(22, 22, 0x3b82f6, 0x1e293b);
    gridHelper.position.y = 0.005;
    scene.add(gridHelper);

    const floorGeo = new THREE.PlaneGeometry(32, 32);
    const floorMat = new THREE.MeshStandardMaterial({ 
      color: theme === 'modern' ? 0xe2e8f0 : 0x0d0d12, 
      roughness: 0.85,
      metalness: 0.15
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Dynamic Meshes Holder
    const sceneObjectsGroup = new THREE.Group();
    scene.add(sceneObjectsGroup);

    const interactiveList: THREE.Object3D[] = [];
    interactiveObjectsRef.current = interactiveList;

    // Physics tracked boxes
    const physicsBoxes: PhysicsBoxEntity[] = [];

    // Track dynamic mesh parts for animation & PLC state updates
    const animatedParts: {
      rollers: THREE.Mesh[];
      pusherMesh?: THREE.Mesh;
      pusherBody?: CANNON.Body;
      sensorHeadMesh?: THREE.Mesh;
      sensorBeamMesh?: THREE.Mesh;
      waterMesh?: THREE.Mesh;
      highFloatMesh?: THREE.Mesh;
      lowFloatMesh?: THREE.Mesh;
      pumpImpellerMesh?: THREE.Mesh;
      alarmLightMesh?: THREE.Mesh;
      alarmLightSource?: THREE.PointLight;
      trafficRedMesh?: THREE.Mesh;
      trafficYellowMesh?: THREE.Mesh;
      trafficGreenMesh?: THREE.Mesh;
      trafficCarMesh?: THREE.Mesh;
      motorRotorMesh?: THREE.Mesh;
      motorFanMesh?: THREE.Mesh;
      gearMesh1?: THREE.Mesh;
      runPilotMesh?: THREE.Mesh;
      runPilotLight?: THREE.PointLight;
      startBtnMesh?: THREE.Mesh;
      stopBtnMesh?: THREE.Mesh;
    } = { rollers: [] };

    // Helper to register interactive 3D clickable object
    const registerInteractive = (mesh: THREE.Object3D, data: Clickable3DObjectData) => {
      mesh.userData = data;
      interactiveList.push(mesh);
    };

    // Box palette colors for visual clarity
    const BOX_COLORS = [0xd97706, 0x3b82f6, 0x10b981, 0x8b5cf6, 0xec4899];

    // Helper to create a physics-enabled workpiece box with Cannon.js rigid body
    const createPhysicsBox = (spawnPos: [number, number, number] = [-4.5, 2.0, 0]): PhysicsBoxEntity => {
      const boxSize = [0.72, 0.55, 0.72];
      const colorHex = BOX_COLORS[physicsBoxes.length % BOX_COLORS.length];
      
      const boxGeo = new THREE.BoxGeometry(boxSize[0], boxSize[1], boxSize[2]);
      const boxMat = new THREE.MeshStandardMaterial({ 
        color: colorHex, 
        roughness: 0.5,
        metalness: 0.25
      });
      const boxMesh = new THREE.Mesh(boxGeo, boxMat);
      boxMesh.castShadow = true;
      boxMesh.receiveShadow = true;
      boxMesh.position.set(...spawnPos);

      // Barcode / Label on box top
      const labelGeo = new THREE.PlaneGeometry(0.4, 0.3);
      const labelMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const labelMesh = new THREE.Mesh(labelGeo, labelMat);
      labelMesh.rotation.x = -Math.PI / 2;
      labelMesh.position.y = boxSize[1] / 2 + 0.002;
      boxMesh.add(labelMesh);

      sceneObjectsGroup.add(boxMesh);

      // Cannon.js Rigid Body with mass & box shape
      const boxShape = new CANNON.Box(new CANNON.Vec3(boxSize[0] / 2, boxSize[1] / 2, boxSize[2] / 2));
      const boxBody = new CANNON.Body({
        mass: 1.2, // 1.2 kg standard workpiece mass
        shape: boxShape,
        material: boxPhysMat,
        position: new CANNON.Vec3(...spawnPos),
        linearDamping: 0.15,
        angularDamping: 0.35,
      });
      world.addBody(boxBody);

      registerInteractive(boxMesh, {
        tagIdentifier: 'I0.0',
        name: `Workpiece Box #${physicsBoxes.length + 1} (Cannon.js RigidBody)`,
        type: 'sensor',
        description: 'Physical workpiece box. Click to apply manual upward physics impulse.'
      });

      const entity: PhysicsBoxEntity = {
        mesh: boxMesh,
        body: boxBody,
        id: `box_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        color: colorHex,
        initialPos: spawnPos,
      };

      physicsBoxes.push(entity);
      setBoxCount(physicsBoxes.length);
      return entity;
    };

    // ================= BUILD 3D SCENE ASSETS =================

    if (selectedScene === 'conveyor') {
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
      const beltMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.95 });
      const rollerMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.1 });

      // Conveyor Bed Mesh
      const bedGeo = new THREE.BoxGeometry(10, 0.4, 2.0);
      const bedMesh = new THREE.Mesh(bedGeo, beltMat);
      bedMesh.position.set(0, 1.2, 0);
      bedMesh.castShadow = true;
      bedMesh.receiveShadow = true;
      sceneObjectsGroup.add(bedMesh);

      // Conveyor Bed Physics Static Body (Cannon.js)
      const bedShape = new CANNON.Box(new CANNON.Vec3(5.0, 0.2, 1.0));
      const bedBody = new CANNON.Body({
        mass: 0, // static mass
        shape: bedShape,
        material: conveyorPhysMat,
        position: new CANNON.Vec3(0, 1.2, 0),
      });
      world.addBody(bedBody);

      // Side Guard Rails with Diverter Gap (Gap from x = 1.3 to x = 2.7 allows pusher to divert box into bin)
      // Front Left Rail
      const rail1Geo = new THREE.BoxGeometry(6.3, 0.35, 0.1);
      const rail1 = new THREE.Mesh(rail1Geo, frameMat);
      rail1.position.set(-1.85, 1.55, 1.05);
      
      // Front Right Rail (after diverter chute)
      const rail2Geo = new THREE.BoxGeometry(2.3, 0.35, 0.1);
      const rail2 = new THREE.Mesh(rail2Geo, frameMat);
      rail2.position.set(3.85, 1.55, 1.05);

      // Rear Continuous Rail
      const railRearGeo = new THREE.BoxGeometry(10, 0.35, 0.1);
      const railRear = new THREE.Mesh(railRearGeo, frameMat);
      railRear.position.set(0, 1.55, -1.05);

      sceneObjectsGroup.add(rail1, rail2, railRear);

      // Guard Rails Cannon.js Physics Bodies
      const rail1Body = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(3.15, 0.18, 0.05)),
        material: railPhysMat,
        position: new CANNON.Vec3(-1.85, 1.55, 1.05),
      });
      const rail2Body = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(1.15, 0.18, 0.05)),
        material: railPhysMat,
        position: new CANNON.Vec3(3.85, 1.55, 1.05),
      });
      const railRearBody = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(5.0, 0.18, 0.05)),
        material: railPhysMat,
        position: new CANNON.Vec3(0, 1.55, -1.05),
      });
      world.addBody(rail1Body);
      world.addBody(rail2Body);
      world.addBody(railRearBody);

      // Legs support
      const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2);
      [-4.5, -1.5, 1.5, 4.5].forEach((x) => {
        const legF = new THREE.Mesh(legGeo, frameMat);
        legF.position.set(x, 0.6, 0.9);
        const legB = new THREE.Mesh(legGeo, frameMat);
        legB.position.set(x, 0.6, -0.9);
        sceneObjectsGroup.add(legF, legB);
      });

      // Rollers along conveyor bed
      const rollerGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.9, 14);
      for (let x = -4.8; x <= 4.8; x += 0.8) {
        const roller = new THREE.Mesh(rollerGeo, rollerMat);
        roller.rotation.x = Math.PI / 2;
        roller.position.set(x, 1.35, 0);
        sceneObjectsGroup.add(roller);
        animatedParts.rollers.push(roller);
      }

      // Optical Proximity Sensor (Interactive Clickable Sensor - I0.0 / PART_SENSOR)
      const sensorMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.5, roughness: 0.4 });
      const sensorPost = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.0, 0.2), sensorMat);
      sensorPost.position.set(0, 1.8, 1.2);
      
      const sensorHead = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.35), sensorMat);
      sensorHead.rotation.x = Math.PI / 2;
      sensorHead.position.set(0, 1.7, 1.05);
      sceneObjectsGroup.add(sensorPost, sensorHead);
      animatedParts.sensorHeadMesh = sensorHead;

      registerInteractive(sensorHead, {
        tagIdentifier: 'I0.0',
        name: 'Proximity Sensor (I0.0 / PART_SENSOR)',
        type: 'sensor',
        description: 'Optical part detector. Click to manually toggle sensor beam.'
      });

      // Optical Laser Beam Line across belt
      const beamGeo = new THREE.CylinderGeometry(0.015, 0.015, 2.1);
      const beamMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.75 });
      const sensorBeam = new THREE.Mesh(beamGeo, beamMat);
      sensorBeam.rotation.x = Math.PI / 2;
      sensorBeam.position.set(0, 1.7, 0);
      sceneObjectsGroup.add(sensorBeam);
      animatedParts.sensorBeamMesh = sensorBeam;

      registerInteractive(sensorBeam, {
        tagIdentifier: 'I0.0',
        name: 'Photoelectric Beam (I0.0)',
        type: 'sensor',
        description: 'Click laser line to simulate object break/detect.'
      });

      // Control Pushbuttons Panel (START I0.1, STOP I0.2)
      const pnlBase = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.4), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
      pnlBase.position.set(-3.5, 1.6, 1.4);
      
      const startBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1), new THREE.MeshStandardMaterial({ color: 0x10b981 }));
      startBtn.rotation.x = Math.PI / 2;
      startBtn.position.set(-3.5, 1.9, 1.62);
      
      const stopBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
      stopBtn.rotation.x = Math.PI / 2;
      stopBtn.position.set(-3.5, 1.4, 1.62);

      sceneObjectsGroup.add(pnlBase, startBtn, stopBtn);
      animatedParts.startBtnMesh = startBtn;
      animatedParts.stopBtnMesh = stopBtn;

      registerInteractive(startBtn, {
        tagIdentifier: 'I0.1',
        name: 'Start Pushbutton (I0.1 / PB_START)',
        type: 'button',
        description: 'Click to pulse/toggle START command tag.'
      });

      registerInteractive(stopBtn, {
        tagIdentifier: 'I0.2',
        name: 'Stop Pushbutton (I0.2 / PB_STOP)',
        type: 'button',
        description: 'Click to pulse/toggle STOP (NC) tag.'
      });

      // Pneumatic Pusher / Diverter Cylinder (Q0.0 / Q0.1)
      const pusherBodyMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7, roughness: 0.3 });
      const cylinderMesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 1.2), pusherBodyMat);
      cylinderMesh.position.set(2, 1.6, -1.8);
      
      const rodMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2), rollerMat);
      rodMesh.rotation.x = Math.PI / 2;
      rodMesh.position.set(2, 1.6, -1.0);
      
      const pushPaddleMesh = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.45, 0.12), new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.2, roughness: 0.4 }));
      pushPaddleMesh.position.set(2, 1.6, -0.6);

      const pusherGroup = new THREE.Group();
      pusherGroup.add(rodMesh, pushPaddleMesh);
      sceneObjectsGroup.add(cylinderMesh, pusherGroup);
      animatedParts.pusherMesh = pusherGroup as any;

      // Kinematic Cannon.js Physics Body for Pusher Solenoid Actuator
      const pusherPhysBody = new CANNON.Body({
        mass: 0,
        type: CANNON.Body.KINEMATIC,
        shape: new CANNON.Box(new CANNON.Vec3(0.55, 0.22, 0.06)),
        material: pusherPhysMat,
        position: new CANNON.Vec3(2, 1.6, -0.6),
      });
      world.addBody(pusherPhysBody);
      animatedParts.pusherBody = pusherPhysBody;

      registerInteractive(pushPaddleMesh, {
        tagIdentifier: 'Q0.1',
        name: 'Pneumatic Diverter (Q0.1 / PUSHER_SOL)',
        type: 'actuator',
        description: 'Pneumatic sorting solenoid actuator.'
      });

      // Ejection collection bin (Visual Mesh & Physics Container)
      const binMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.6, metalness: 0.2 });
      const binGroup = new THREE.Group();
      
      // Bin floor
      const binFloorMesh = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, 1.8), binMat);
      binFloorMesh.position.set(2, 0.3, 2.2);
      
      // Bin walls
      const wallMat = new THREE.MeshStandardMaterial({ color: 0x059669, metalness: 0.4 });
      const wallFront = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.7, 0.08), wallMat);
      wallFront.position.set(2, 0.65, 3.1);
      const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 1.8), wallMat);
      wallLeft.position.set(0.96, 0.65, 2.2);
      const wallRight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 1.8), wallMat);
      wallRight.position.set(3.04, 0.65, 2.2);

      binGroup.add(binFloorMesh, wallFront, wallLeft, wallRight);
      sceneObjectsGroup.add(binGroup);

      // Bin Cannon.js Physics Bodies (Floor + 3 Wall Colliders)
      const binFloorBody = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(1.0, 0.05, 0.9)),
        material: binPhysMat,
        position: new CANNON.Vec3(2, 0.3, 2.2),
      });
      const binFrontWall = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(1.0, 0.35, 0.04)),
        material: binPhysMat,
        position: new CANNON.Vec3(2, 0.65, 3.1),
      });
      const binLeftWall = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(0.04, 0.35, 0.9)),
        material: binPhysMat,
        position: new CANNON.Vec3(0.96, 0.65, 2.2),
      });
      const binRightWall = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(0.04, 0.35, 0.9)),
        material: binPhysMat,
        position: new CANNON.Vec3(3.04, 0.65, 2.2),
      });
      world.addBody(binFloorBody);
      world.addBody(binFrontWall);
      world.addBody(binLeftWall);
      world.addBody(binRightWall);

      // Initial Spawn of 2 Physics Workpiece Boxes
      createPhysicsBox([-4.5, 2.0, 0]);
      setTimeout(() => {
        createPhysicsBox([-2.2, 2.0, 0]);
      }, 50);

    } else if (selectedScene === 'tank') {
      const standMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.4 });
      const standMesh = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.6, 24), standMat);
      standMesh.position.set(0, 0.3, 0);
      sceneObjectsGroup.add(standMesh);

      // Glass Tank Cylinder (Transparent)
      const tankGeo = new THREE.CylinderGeometry(2.0, 2.0, 4.0, 32, 1, true);
      const tankMat = new THREE.MeshPhysicalMaterial({ 
        color: 0x93c5fd, 
        transparent: true, 
        opacity: 0.35, 
        roughness: 0.1, 
        transmission: 0.9, 
        ior: 1.5,
        thickness: 0.2
      });
      const tankMesh = new THREE.Mesh(tankGeo, tankMat);
      tankMesh.position.set(0, 2.6, 0);
      sceneObjectsGroup.add(tankMesh);

      // Tank Rings
      const ringGeo = new THREE.TorusGeometry(2.02, 0.08, 12, 32);
      const topRing = new THREE.Mesh(ringGeo, standMat);
      topRing.rotation.x = Math.PI / 2;
      topRing.position.set(0, 4.6, 0);
      const bottomRing = new THREE.Mesh(ringGeo, standMat);
      bottomRing.rotation.x = Math.PI / 2;
      bottomRing.position.set(0, 0.6, 0);
      sceneObjectsGroup.add(topRing, bottomRing);

      // Dynamic Liquid / Water Body
      const waterGeo = new THREE.CylinderGeometry(1.95, 1.95, 1, 32);
      const waterMat = new THREE.MeshStandardMaterial({ 
        color: 0x0284c7, 
        transparent: true, 
        opacity: 0.75, 
        roughness: 0.1, 
        metalness: 0.1 
      });
      const waterMesh = new THREE.Mesh(waterGeo, waterMat);
      waterMesh.position.set(0, 1.1, 0);
      sceneObjectsGroup.add(waterMesh);
      animatedParts.waterMesh = waterMesh;

      // Float Switch Sensors (Interactive Clickable Sensors)
      const floatSensorMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.4 });
      const lowFloat = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), floatSensorMat.clone());
      lowFloat.position.set(1.4, 1.2, 0);
      const highFloat = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), floatSensorMat.clone());
      highFloat.position.set(1.4, 3.8, 0);
      sceneObjectsGroup.add(lowFloat, highFloat);
      animatedParts.lowFloatMesh = lowFloat;
      animatedParts.highFloatMesh = highFloat;

      registerInteractive(lowFloat, {
        tagIdentifier: 'I0.0',
        name: 'Low Level Float (I0.0 / FLOAT_LOW)',
        type: 'sensor',
        description: 'Click to manually trigger Low Water sensor.'
      });

      registerInteractive(highFloat, {
        tagIdentifier: 'I0.1',
        name: 'High Level Float (I0.1 / FLOAT_HIGH)',
        type: 'sensor',
        description: 'Click to manually trigger High Water sensor.'
      });

      // Float sensor support rods
      const rodMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 });
      const lowRod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6), rodMat);
      lowRod.rotation.z = Math.PI / 2;
      lowRod.position.set(1.7, 1.2, 0);
      const highRod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6), rodMat);
      highRod.rotation.z = Math.PI / 2;
      highRod.position.set(1.7, 3.8, 0);
      sceneObjectsGroup.add(lowRod, highRod);

      // Centrifugal Pump (Left Side)
      const pumpMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, metalness: 0.6, roughness: 0.3 });
      const pumpBody = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.8, 16), pumpMat);
      pumpBody.position.set(-3.5, 0.8, 0);
      
      const pumpMotor = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.0, 16), standMat);
      pumpMotor.rotation.z = Math.PI / 2;
      pumpMotor.position.set(-4.2, 0.8, 0);

      const pipeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });
      const pipeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.8), pipeMat);
      pipeMesh.position.set(-3.5, 2.7, 0);
      
      const pipeOverTop = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.4), pipeMat);
      pipeOverTop.rotation.z = Math.PI / 2;
      pipeOverTop.position.set(-2.3, 4.6, 0);
      
      sceneObjectsGroup.add(pumpBody, pumpMotor, pipeMesh, pipeOverTop);

      registerInteractive(pumpBody, {
        tagIdentifier: 'Q0.0',
        name: 'Filling Pump (Q0.0 / PUMP_VALVE)',
        type: 'actuator',
        description: 'Main inlet liquid pump.'
      });

      // Warning Strobe Beacon
      const beaconBase = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.2), standMat);
      beaconBase.position.set(0, 4.7, 0);
      
      const beaconDome = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x000000 }));
      beaconDome.position.set(0, 4.9, 0);
      
      const beaconLight = new THREE.PointLight(0xef4444, 0, 8);
      beaconLight.position.set(0, 5.0, 0);
      
      sceneObjectsGroup.add(beaconBase, beaconDome, beaconLight);
      animatedParts.alarmLightMesh = beaconDome;
      animatedParts.alarmLightSource = beaconLight;

      registerInteractive(beaconDome, {
        tagIdentifier: 'Q0.1',
        name: 'Alarm Beacon (Q0.1 / ALARM_FULL)',
        type: 'actuator',
        description: 'Overflow visual alert strobe.'
      });

    } else if (selectedScene === 'traffic') {
      const roadMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
      const roadGeo = new THREE.PlaneGeometry(16, 16);
      const roadMesh = new THREE.Mesh(roadGeo, roadMat);
      roadMesh.rotation.x = -Math.PI / 2;
      roadMesh.position.y = 0.01;
      sceneObjectsGroup.add(roadMesh);

      // Traffic Light Mast & Pole
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 5.0), poleMat);
      mast.position.set(2.8, 2.5, 2.8);
      
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6), poleMat);
      arm.rotation.z = Math.PI / 2;
      arm.position.set(1.5, 4.8, 2.8);
      sceneObjectsGroup.add(mast, arm);

      const housingMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
      const housing = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.6, 0.5), housingMat);
      housing.position.set(0.5, 4.5, 2.8);
      sceneObjectsGroup.add(housing);

      // Traffic Light Lenses
      const redLight = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), new THREE.MeshStandardMaterial({ color: 0x7f1d1d, emissive: 0x000000, roughness: 0.2 }));
      redLight.position.set(0.5, 5.0, 2.55);
      
      const yellowLight = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), new THREE.MeshStandardMaterial({ color: 0x78350f, emissive: 0x000000, roughness: 0.2 }));
      yellowLight.position.set(0.5, 4.5, 2.55);
      
      const greenLight = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), new THREE.MeshStandardMaterial({ color: 0x064e3b, emissive: 0x000000, roughness: 0.2 }));
      greenLight.position.set(0.5, 4.0, 2.55);

      sceneObjectsGroup.add(redLight, yellowLight, greenLight);
      animatedParts.trafficRedMesh = redLight;
      animatedParts.trafficYellowMesh = yellowLight;
      animatedParts.trafficGreenMesh = greenLight;

      registerInteractive(redLight, {
        tagIdentifier: 'Q0.0',
        name: 'Red Light (Q0.0 / LIGHT_RED)',
        type: 'actuator',
        description: 'Stop signal output.'
      });

      registerInteractive(yellowLight, {
        tagIdentifier: 'Q0.1',
        name: 'Yellow Light (Q0.1 / LIGHT_YELLOW)',
        type: 'actuator',
        description: 'Caution transition output.'
      });

      registerInteractive(greenLight, {
        tagIdentifier: 'Q0.2',
        name: 'Green Light (Q0.2 / LIGHT_GREEN)',
        type: 'actuator',
        description: 'Go signal output.'
      });

      // Pedestrian Call Button on Mast (I0.0 / PED_BUTTON)
      const pedBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08), new THREE.MeshStandardMaterial({ color: 0x3b82f6 }));
      pedBtn.rotation.z = Math.PI / 2;
      pedBtn.position.set(2.65, 1.8, 2.8);
      sceneObjectsGroup.add(pedBtn);

      registerInteractive(pedBtn, {
        tagIdentifier: 'I0.0',
        name: 'Pedestrian Crossing Button (I0.0)',
        type: 'button',
        description: 'Click to trigger pedestrian walk request.'
      });

      // Approaching Car
      const carGroup = new THREE.Group();
      const carBody = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 3.2), new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.5, roughness: 0.3 }));
      carBody.position.y = 0.55;
      const carCabin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 1.8), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
      carCabin.position.set(0, 1.1, -0.2);
      carGroup.add(carBody, carCabin);
      carGroup.position.set(-1.2, 0, -8);
      sceneObjectsGroup.add(carGroup);
      animatedParts.trafficCarMesh = carGroup as any;

    } else if (selectedScene === 'motor') {
      const motorCastMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.7, roughness: 0.3 });
      const finMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, metalness: 0.8, roughness: 0.3 });
      const shaftMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.1 });

      const basePlate = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.3, 2.6), new THREE.MeshStandardMaterial({ color: 0x334155 }));
      basePlate.position.set(0, 0.15, 0);
      sceneObjectsGroup.add(basePlate);

      const stator = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 2.4, 32), motorCastMat);
      stator.rotation.z = Math.PI / 2;
      stator.position.set(-0.6, 1.4, 0);
      sceneObjectsGroup.add(stator);

      // Rotating Rotor & Drive Shaft
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 4.2, 24), shaftMat);
      shaft.rotation.z = Math.PI / 2;
      shaft.position.set(0.3, 1.4, 0);
      sceneObjectsGroup.add(shaft);
      animatedParts.motorRotorMesh = shaft;

      const fanHub = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.3, 12), new THREE.MeshStandardMaterial({ color: 0x64748b }));
      fanHub.rotation.z = Math.PI / 2;
      fanHub.position.set(-1.9, 1.4, 0);
      sceneObjectsGroup.add(fanHub);
      animatedParts.motorFanMesh = fanHub;

      const gearBox = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 1.6), new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 }));
      gearBox.position.set(1.6, 1.4, 0);
      sceneObjectsGroup.add(gearBox);

      const pulley = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.25, 24), new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8 }));
      pulley.rotation.z = Math.PI / 2;
      pulley.position.set(2.6, 1.4, 0);
      
      const marker = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.08), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      marker.position.set(2.74, 1.7, 0);
      
      const pulleyGroup = new THREE.Group();
      pulleyGroup.add(pulley, marker);
      sceneObjectsGroup.add(pulleyGroup);
      animatedParts.gearMesh1 = pulleyGroup as any;

      registerInteractive(stator, {
        tagIdentifier: 'Q0.0',
        name: 'Main Motor (Q0.0 / MOTOR_FWD)',
        type: 'actuator',
        description: '3-Phase AC induction motor.'
      });

      // Operator Station with Forward, Reverse, Stop Buttons
      const opBox = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.5), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
      opBox.position.set(-0.6, 0.7, 2.0);
      
      const fwdBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08), new THREE.MeshStandardMaterial({ color: 0x10b981 }));
      fwdBtn.rotation.x = Math.PI / 2;
      fwdBtn.position.set(-0.9, 0.8, 2.26);
      
      const revBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08), new THREE.MeshStandardMaterial({ color: 0x3b82f6 }));
      revBtn.rotation.x = Math.PI / 2;
      revBtn.position.set(-0.6, 0.8, 2.26);
      
      const stopMBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
      stopMBtn.rotation.x = Math.PI / 2;
      stopMBtn.position.set(-0.3, 0.8, 2.26);

      sceneObjectsGroup.add(opBox, fwdBtn, revBtn, stopMBtn);

      registerInteractive(fwdBtn, {
        tagIdentifier: 'I0.0',
        name: 'Forward Pushbutton (I0.0 / BTN_FWD)',
        type: 'button',
        description: 'Start motor in forward direction.'
      });

      registerInteractive(revBtn, {
        tagIdentifier: 'I0.1',
        name: 'Reverse Pushbutton (I0.1 / BTN_REV)',
        type: 'button',
        description: 'Start motor in reverse direction.'
      });

      registerInteractive(stopMBtn, {
        tagIdentifier: 'I0.2',
        name: 'Stop Pushbutton (I0.2 / BTN_STOP)',
        type: 'button',
        description: 'Emergency stop contact.'
      });

      // Pilot Lamp
      const pilotBase = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.15), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
      pilotBase.position.set(-0.6, 3.0, 0);
      const pilotLens = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), new THREE.MeshStandardMaterial({ color: 0x064e3b }));
      pilotLens.position.set(-0.6, 3.1, 0);
      const pilotLight = new THREE.PointLight(0x22c55e, 0, 4);
      pilotLight.position.set(-0.6, 3.2, 0);
      
      sceneObjectsGroup.add(pilotBase, pilotLens, pilotLight);
      animatedParts.runPilotMesh = pilotLens;
      animatedParts.runPilotLight = pilotLight;
    }

    // Reset physics helper callback
    resetPhysicsBodiesRef.current = () => {
      simStateRef.current.sortedBoxIds.clear();
      setSortedCount(0);
      physicsBoxes.forEach((pBox, idx) => {
        const posX = -4.5 + (idx * 1.8);
        pBox.body.position.set(posX, 2.0, 0);
        pBox.body.velocity.set(0, 0, 0);
        pBox.body.angularVelocity.set(0, 0, 0);
        pBox.body.quaternion.set(0, 0, 0, 1);
        pBox.mesh.position.copy(pBox.body.position as any);
        pBox.mesh.quaternion.copy(pBox.body.quaternion as any);
      });
    };

    // Spawn new physics box callback
    spawnNewBoxRef.current = () => {
      if (physicsBoxes.length >= 6) {
        // Recycle the furthest or oldest box
        const oldest = physicsBoxes[0];
        oldest.body.position.set(-4.6, 2.2, (Math.random() - 0.5) * 0.3);
        oldest.body.velocity.set(0, 0, 0);
        oldest.body.angularVelocity.set(0, 0, 0);
        oldest.body.quaternion.set(0, 0, 0, 1);
        return;
      }
      createPhysicsBox([-4.6, 2.2, (Math.random() - 0.5) * 0.3]);
    };

    // ================= ANIMATION & PLC SYNCHRONIZATION LOOP =================
    let lastTime = performance.now();

    const animate = (time: number) => {
      animationFrameIdRef.current = requestAnimationFrame(animate);
      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const sim = simStateRef.current;
      const isRunning = simStatus === 'RUNNING';

      // ============ CANNON.JS PHYSICS STEP ============
      if (physicsActive) {
        // Fixed 60Hz physics time stepping with sub-steps for consistent collision response
        world.step(1 / 60, delta, 5);
      }

      // ============ SCENE 1: CONVEYOR & SORTER PHYSICS ============
      if (selectedScene === 'conveyor') {
        const motorOn = isRunning && (isTagTrue('Q0.0') || isTagTrue('MOTOR_RUN') || isTagTrue('MOTOR_OUT') || isTagTrue('SYS_ENABLE') || isTagTrue('MOTOR_FWD'));
        const ejectorOn = isTagTrue('Q0.1') || isTagTrue('EJECTOR_SOLENOID') || isTagTrue('PUSHER_SOL') || isTagTrue('SOL_1');
        const sensorActive = isTagTrue('I0.0') || isTagTrue('PART_SENSOR');

        if (motorOn) {
          sim.conveyorPos += delta * 2.5;
          animatedParts.rollers.forEach((r) => {
            r.rotation.y += delta * 7;
          });
        }

        // Pusher Kinematic Extension & Physical Cannon.js Kinematic Body
        if (ejectorOn) {
          sim.pusherZ = Math.min(sim.pusherZ + delta * 7.5, 1.25);
        } else {
          sim.pusherZ = Math.max(sim.pusherZ - delta * 5.0, 0);
        }

        if (animatedParts.pusherMesh) {
          animatedParts.pusherMesh.position.z = sim.pusherZ;
        }

        if (animatedParts.pusherBody) {
          // Update kinematic body position and velocity in Cannon.js
          const targetPusherZ = -0.6 + sim.pusherZ;
          const currentPusherZ = animatedParts.pusherBody.position.z;
          animatedParts.pusherBody.velocity.set(0, 0, (targetPusherZ - currentPusherZ) / (delta || 0.016));
          animatedParts.pusherBody.position.set(2, 1.6, targetPusherZ);
        }

        let anyBoxInSensor = false;

        // Synchronize Cannon.js Rigid Bodies to Three.js Visual Meshes
        physicsBoxes.forEach((pBox) => {
          const body = pBox.body;
          const mesh = pBox.mesh;

          // Check if box is currently resting on the conveyor belt surface
          const onBelt = body.position.y >= 1.15 && body.position.y <= 2.2 && Math.abs(body.position.z) <= 1.05 && body.position.x >= -5.2 && body.position.x <= 5.2;

          if (onBelt) {
            if (motorOn) {
              // Apply realistic surface traction velocity along conveyor +X axis
              const targetBeltSpeed = 2.4;
              if (body.velocity.x < targetBeltSpeed) {
                body.velocity.x = THREE.MathUtils.lerp(body.velocity.x, targetBeltSpeed, delta * 8.0);
              }
              // Prevent excessive lateral drift while on belt
              body.velocity.z *= 0.95;
            } else {
              // High static friction when belt is stopped
              body.velocity.x = THREE.MathUtils.lerp(body.velocity.x, 0, delta * 12.0);
            }
          }

          // Check if box landed inside the sorted collection bin
          const inBin = body.position.x >= 1.0 && body.position.x <= 3.0 && body.position.z >= 1.3 && body.position.z <= 3.0 && body.position.y < 1.0;
          if (inBin && !sim.sortedBoxIds.has(pBox.id)) {
            sim.sortedBoxIds.add(pBox.id);
            setSortedCount(sim.sortedBoxIds.size);
          }

          // Optical Laser Sensor Intersect (Raycast line detection across conveyor at x = 0.0)
          const inSensor = body.position.x >= -0.55 && body.position.x <= 0.55 && body.position.y >= 1.15 && body.position.y <= 2.3 && Math.abs(body.position.z) <= 0.85;
          if (inSensor) {
            anyBoxInSensor = true;
          }

          // Gravity Fall / Out of bounds Recycle (Reposition smoothly to feeder inlet)
          if (body.position.y < -1.5 || body.position.x > 7.5 || body.position.z > 5.5) {
            body.position.set(-4.6, 2.2, (Math.random() - 0.5) * 0.2);
            body.velocity.set(0, 0, 0);
            body.angularVelocity.set(0, 0, 0);
            body.quaternion.set(0, 0, 0, 1);
            sim.sortedBoxIds.delete(pBox.id);
            setSortedCount(sim.sortedBoxIds.size);
          }

          // Sync Three.js Mesh transform with Cannon.js body
          mesh.position.copy(body.position as any);
          mesh.quaternion.copy(body.quaternion as any);
        });

        // Trigger PLC tag if sensor state changed consistently during scan cycle
        if (anyBoxInSensor !== sim.boxDetected) {
          sim.boxDetected = anyBoxInSensor;
          const sensorTag = getTag('PART_SENSOR') || getTag('I0.0') || getTag('SENSOR_1');
          if (sensorTag && sensorTag.currentValue !== anyBoxInSensor && !sensorTag.isForced) {
            onToggleTagValue(sensorTag.id);
          }
        }

        // Visual beam & sensor head status update based on live scan cycle
        const isLaserTriggered = sensorActive || anyBoxInSensor;
        if (animatedParts.sensorBeamMesh) {
          (animatedParts.sensorBeamMesh.material as THREE.MeshBasicMaterial).color.setHex(
            isLaserTriggered ? 0x22c55e : 0xef4444
          );
        }
        if (animatedParts.sensorHeadMesh) {
          (animatedParts.sensorHeadMesh.material as THREE.MeshStandardMaterial).color.setHex(
            isLaserTriggered ? 0x22c55e : 0xf59e0b
          );
        }
      }

      // ============ SCENE 2: TANK & PUMP ============
      else if (selectedScene === 'tank') {
        const pumpOn = isRunning && (isTagTrue('Q0.0') || isTagTrue('PUMP_VALVE') || isTagTrue('MOTOR_OUT'));
        const alarmOn = isTagTrue('Q0.1') || isTagTrue('ALARM_FULL');
        const lowSensorTagVal = isTagTrue('I0.0') || isTagTrue('FLOAT_LOW');
        const highSensorTagVal = isTagTrue('I0.1') || isTagTrue('FLOAT_HIGH');

        if (pumpOn) {
          sim.waterLevel = Math.min(sim.waterLevel + delta * 0.8, 3.9);
        } else {
          sim.waterLevel = Math.max(sim.waterLevel - delta * 0.15, 0.4);
        }

        if (animatedParts.waterMesh) {
          animatedParts.waterMesh.scale.y = Math.max(sim.waterLevel, 0.1);
          animatedParts.waterMesh.position.y = 0.6 + sim.waterLevel / 2;
        }

        const isLowPhysically = sim.waterLevel <= 1.3;
        const isHighPhysically = sim.waterLevel >= 3.6;

        // Sync tags if not forced
        const lowTag = getTag('FLOAT_LOW') || getTag('I0.0');
        if (lowTag && lowTag.currentValue !== isLowPhysically && !lowTag.isForced) {
          onToggleTagValue(lowTag.id);
        }

        const highTag = getTag('FLOAT_HIGH') || getTag('I0.1');
        if (highTag && highTag.currentValue !== isHighPhysically && !highTag.isForced) {
          onToggleTagValue(highTag.id);
        }

        // Visual feedback on floats directly from PLC Tag State
        if (animatedParts.lowFloatMesh) {
          (animatedParts.lowFloatMesh.material as THREE.MeshStandardMaterial).color.setHex(
            (lowSensorTagVal || isLowPhysically) ? 0xf59e0b : 0x10b981
          );
        }
        if (animatedParts.highFloatMesh) {
          (animatedParts.highFloatMesh.material as THREE.MeshStandardMaterial).color.setHex(
            (highSensorTagVal || isHighPhysically) ? 0xef4444 : 0x10b981
          );
        }

        // Strobe Alarm Beacon
        if (animatedParts.alarmLightSource && animatedParts.alarmLightMesh) {
          if (alarmOn || isHighPhysically || highSensorTagVal) {
            const strobe = Math.sin(time * 0.015) > 0;
            animatedParts.alarmLightSource.intensity = strobe ? 3.0 : 0;
            (animatedParts.alarmLightMesh.material as THREE.MeshStandardMaterial).emissive.setHex(
              strobe ? 0xef4444 : 0x000000
            );
          } else {
            animatedParts.alarmLightSource.intensity = 0;
            (animatedParts.alarmLightMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
          }
        }
      }

      // ============ SCENE 3: TRAFFIC LIGHTS ============
      else if (selectedScene === 'traffic') {
        const redOn = isTagTrue('Q0.0') || isTagTrue('LIGHT_RED');
        const yellowOn = isTagTrue('Q0.1') || isTagTrue('LIGHT_YELLOW');
        const greenOn = isTagTrue('Q0.2') || isTagTrue('LIGHT_GREEN');

        if (animatedParts.trafficRedMesh) {
          (animatedParts.trafficRedMesh.material as THREE.MeshStandardMaterial).emissive.setHex(
            redOn ? 0xef4444 : 0x000000
          );
        }
        if (animatedParts.trafficYellowMesh) {
          (animatedParts.trafficYellowMesh.material as THREE.MeshStandardMaterial).emissive.setHex(
            yellowOn ? 0xf59e0b : 0x000000
          );
        }
        if (animatedParts.trafficGreenMesh) {
          (animatedParts.trafficGreenMesh.material as THREE.MeshStandardMaterial).emissive.setHex(
            greenOn ? 0x10b981 : 0x000000
          );
        }

        if (animatedParts.trafficCarMesh) {
          if (greenOn) {
            sim.carPosition += delta * 4.0;
            if (sim.carPosition > 9.0) sim.carPosition = -8.0;
          } else if (redOn || yellowOn) {
            if (sim.carPosition < -2.8) {
              sim.carPosition = Math.min(sim.carPosition + delta * 3.0, -2.8);
            }
          }
          animatedParts.trafficCarMesh.position.z = sim.carPosition;
        }
      }

      // ============ SCENE 4: MOTOR & GEARBOX ============
      else if (selectedScene === 'motor') {
        const fwdOn = isRunning && (isTagTrue('Q0.0') || isTagTrue('MOTOR_FWD') || isTagTrue('MOTOR_OUT'));
        const revOn = isRunning && (isTagTrue('Q0.1') || isTagTrue('MOTOR_REV'));
        const runLampOn = isTagTrue('Q0.1') || isTagTrue('RUN_LAMP') || fwdOn || revOn;

        if (fwdOn) {
          sim.motorRPM = Math.min(sim.motorRPM + delta * 800, 1450);
          sim.motorAngle += (sim.motorRPM / 60) * (2 * Math.PI) * delta;
        } else if (revOn) {
          sim.motorRPM = Math.max(sim.motorRPM - delta * 800, -1450);
          sim.motorAngle += (sim.motorRPM / 60) * (2 * Math.PI) * delta;
        } else {
          sim.motorRPM *= 0.94;
          sim.motorAngle += (sim.motorRPM / 60) * (2 * Math.PI) * delta;
        }

        if (animatedParts.motorRotorMesh) {
          animatedParts.motorRotorMesh.rotation.x = sim.motorAngle;
        }
        if (animatedParts.motorFanMesh) {
          animatedParts.motorFanMesh.rotation.x = sim.motorAngle;
        }
        if (animatedParts.gearMesh1) {
          animatedParts.gearMesh1.rotation.x = sim.motorAngle * 0.25;
        }

        if (animatedParts.runPilotMesh && animatedParts.runPilotLight) {
          const isLampActive = Math.abs(sim.motorRPM) > 20 || runLampOn;
          (animatedParts.runPilotMesh.material as THREE.MeshStandardMaterial).emissive.setHex(
            isLampActive ? 0x22c55e : 0x000000
          );
          animatedParts.runPilotLight.intensity = isLampActive ? 1.5 : 0;
        }
      }

      renderer.render(scene, camera);
    };

    animationFrameIdRef.current = requestAnimationFrame(animate);

    // ================= RAYCASTER CLICK & HOVER DETECTION =================
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let mouseDownPos = { x: 0, y: 0 };

    const getNormalizedMousePos = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
      };
    };

    const handlePointerMove = (e: MouseEvent) => {
      if (!cameraRef.current) return;
      const { x, y } = getNormalizedMousePos(e);
      mouse.x = x;
      mouse.y = y;

      raycaster.setFromCamera(mouse, cameraRef.current);
      const intersects = raycaster.intersectObjects(interactiveList, true);

      if (intersects.length > 0) {
        let hitObj: THREE.Object3D | null = intersects[0].object;
        while (hitObj && !hitObj.userData?.name && hitObj.parent) {
          hitObj = hitObj.parent;
        }
        if (hitObj && hitObj.userData?.name) {
          container.style.cursor = 'pointer';
          setHoveredObjectName(`${hitObj.userData.name} • [Click to Interact/Toggle]`);
          return;
        }
      }

      container.style.cursor = 'grab';
      setHoveredObjectName(null);
    };

    const handlePointerDown = (e: MouseEvent) => {
      mouseDownPos = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: MouseEvent) => {
      // Check if it's a clean click without major mouse drag
      const dist = Math.hypot(e.clientX - mouseDownPos.x, e.clientY - mouseDownPos.y);
      if (dist > 5 || !cameraRef.current) return;

      const { x, y } = getNormalizedMousePos(e);
      mouse.x = x;
      mouse.y = y;

      raycaster.setFromCamera(mouse, cameraRef.current);
      const intersects = raycaster.intersectObjects(interactiveList, true);

      if (intersects.length > 0) {
        let hitObj: THREE.Object3D | null = intersects[0].object;
        while (hitObj && !hitObj.userData?.tagIdentifier && hitObj.parent) {
          hitObj = hitObj.parent;
        }

        if (hitObj && hitObj.userData?.tagIdentifier) {
          // If a physics box was clicked, apply a slight upward/forward impulse for fun physics interaction
          const pBox = physicsBoxes.find(b => b.mesh === hitObj || b.mesh === intersects[0].object);
          if (pBox) {
            pBox.body.applyImpulse(new CANNON.Vec3(0, 3.8, 0.5), new CANNON.Vec3(0, 0, 0));
          }

          const tagId = hitObj.userData.tagIdentifier;
          const targetTag = getTag(tagId) || getTag(tagId.replace('%', ''));

          if (targetTag) {
            onToggleTagValue(targetTag.id);
            const nextVal = !Boolean(targetTag.isForced && targetTag.forcedValue !== undefined ? targetTag.forcedValue : targetTag.currentValue);

            setLastClickedNotice({
              title: hitObj.userData.name || targetTag.symbol,
              tag: targetTag.address.rawString,
              value: nextVal,
            });

            setTimeout(() => {
              setLastClickedNotice(null);
            }, 3000);
          }
        }
      }
    };

    container.addEventListener('mousemove', handlePointerMove);
    container.addEventListener('mousedown', handlePointerDown);
    container.addEventListener('mouseup', handlePointerUp);

    // Orbit Drag & Zoom
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !cameraRef.current) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      const cam = cameraRef.current;
      const radius = Math.sqrt(cam.position.x ** 2 + cam.position.z ** 2);
      let angle = Math.atan2(cam.position.z, cam.position.x);

      angle -= deltaX * 0.008;
      cam.position.x = radius * Math.cos(angle);
      cam.position.z = radius * Math.sin(angle);
      cam.position.y = Math.max(1.0, Math.min(18.0, cam.position.y + deltaY * 0.02));
      cam.lookAt(0, 1.2, 0);
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      if (!cameraRef.current) return;
      e.preventDefault();
      const cam = cameraRef.current;
      const zoomFactor = e.deltaY > 0 ? 1.08 : 0.92;
      cam.position.multiplyScalar(zoomFactor);
      cam.position.clampLength(3.0, 24.0);
      cam.lookAt(0, 1.2, 0);
    };

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);
    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handlePointerMove);
      container.removeEventListener('mousedown', handlePointerDown);
      container.removeEventListener('mouseup', handlePointerUp);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('wheel', onWheel);
      renderer.dispose();
    };
  }, [selectedScene, theme, simStatus, project, physicsActive]);

  return (
    <div className={`flex-1 flex flex-col h-full overflow-hidden select-none relative ${
      theme === 'modern' ? 'bg-slate-100 text-slate-800' : 'bg-[#07070a] text-slate-200'
    }`}>
      {/* 3D Lab Top Control Bar */}
      <div className={`h-12 px-4 border-b flex items-center justify-between shrink-0 z-20 ${
        theme === 'modern' ? 'bg-white border-slate-200' : 'bg-[#111114] border-slate-800'
      }`}>
        {/* Scene Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-bold text-xs tracking-wider uppercase mr-2 text-blue-400">
            <BoxIcon className="w-4 h-4" />
            <span>3D Digital Twin Simulation Lab</span>
          </div>

          <div className="flex items-center gap-1 bg-[#1a1a1e] p-0.5 rounded border border-slate-800 text-xs">
            <button
              onClick={() => setSelectedScene('conveyor')}
              className={`px-3 py-1 rounded font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                selectedScene === 'conveyor'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Move className="w-3.5 h-3.5" /> Conveyor & Sorter
            </button>

            <button
              onClick={() => setSelectedScene('tank')}
              className={`px-3 py-1 rounded font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                selectedScene === 'tank'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5" /> Tank & Pump
            </button>

            <button
              onClick={() => setSelectedScene('traffic')}
              className={`px-3 py-1 rounded font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                selectedScene === 'traffic'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" /> Traffic Lights
            </button>

            <button
              onClick={() => setSelectedScene('motor')}
              className={`px-3 py-1 rounded font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                selectedScene === 'motor'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Gauge className="w-3.5 h-3.5" /> Motor & Gearbox
            </button>
          </div>
        </div>

        {/* Camera Views, Physics controls & HUD Toggles */}
        <div className="flex items-center gap-2 text-xs">
          {/* Physics Actions for Conveyor Scene */}
          {selectedScene === 'conveyor' && (
            <div className="flex items-center gap-1 bg-[#1a1a1e] p-0.5 rounded border border-slate-800">
              <button
                onClick={() => spawnNewBoxRef.current()}
                className="px-2 py-1 rounded text-[11px] font-mono text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 flex items-center gap-1 cursor-pointer transition-colors"
                title="Spawn a new physical box with Cannon.js gravity & collision"
              >
                <PlusCircle className="w-3 h-3" />
                <span>Add Box ({boxCount})</span>
              </button>

              <button
                onClick={() => resetPhysicsBodiesRef.current()}
                className="px-2 py-1 rounded text-[11px] font-mono text-slate-400 hover:text-white hover:bg-slate-800 flex items-center gap-1 cursor-pointer transition-colors"
                title="Reset physics bodies to initial positions"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset Physics</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-1 bg-[#1a1a1e] p-0.5 rounded border border-slate-800">
            <button
              onClick={() => setCameraView('iso')}
              className={`px-2 py-1 rounded text-[11px] font-mono cursor-pointer ${
                cameraPreset === 'iso' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ISO 3D
            </button>
            <button
              onClick={() => setCameraView('top')}
              className={`px-2 py-1 rounded text-[11px] font-mono cursor-pointer ${
                cameraPreset === 'top' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              TOP
            </button>
            <button
              onClick={() => setCameraView('front')}
              className={`px-2 py-1 rounded text-[11px] font-mono cursor-pointer ${
                cameraPreset === 'front' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              FRONT
            </button>
          </div>

          <button
            onClick={() => setShowTagsHUD(!showTagsHUD)}
            className={`px-2.5 py-1 rounded border text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
              showTagsHUD
                ? 'bg-blue-600/20 border-blue-500/40 text-blue-400 font-bold'
                : 'bg-[#1a1a1e] border-slate-800 text-slate-400'
            }`}
            title="Toggle Live PLC Tag Binding Overlay HUD"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>I/O HUD</span>
          </button>
        </div>
      </div>

      {/* Main 3D Canvas Viewport */}
      <div 
        ref={containerRef} 
        className="flex-1 w-full h-full relative outline-none"
      />

      {/* Interactive Raycast Hover Tooltip */}
      {hoveredObjectName && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-blue-600/90 text-white text-xs font-mono font-bold shadow-xl backdrop-blur-sm pointer-events-none flex items-center gap-2 animate-fade-in z-30 border border-blue-400/40">
          <MousePointerClick className="w-3.5 h-3.5 text-blue-200 animate-bounce" />
          <span>{hoveredObjectName}</span>
        </div>
      )}

      {/* Click Confirmation Toast Notification */}
      {lastClickedNotice && (
        <div className="absolute bottom-16 left-6 px-3.5 py-2 rounded-lg bg-[#111114]/95 border border-emerald-500/50 shadow-2xl backdrop-blur-md text-xs font-mono text-slate-200 flex items-center gap-2.5 z-30 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <div>
            <span className="font-bold text-white">{lastClickedNotice.title}</span> toggled to{' '}
            <span className={lastClickedNotice.value ? 'text-emerald-400 font-bold' : 'text-slate-400 font-bold'}>
              {lastClickedNotice.value ? 'TRUE (1)' : 'FALSE (0)'}
            </span>
          </div>
        </div>
      )}

      {/* Interactive Overlay: 3D Twin HUD & I/O Physical Controls */}
      {showTagsHUD && (
        <div className="absolute top-16 right-4 w-80 bg-[#111114]/90 backdrop-blur-md border border-slate-800 rounded-lg p-3 shadow-2xl z-30 space-y-3 pointer-events-auto text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-200">
              <Cpu className="w-4 h-4 text-blue-400" />
              <span>Live PLC Tag Synchronizer</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 flex items-center gap-1">
                <Atom className="w-3 h-3" /> Cannon.js
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {simStatus}
              </span>
            </div>
          </div>

          {/* Quick Scene Instructions / Interactive Controls */}
          <div className="space-y-2">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between">
              <span>Interactive 3D Sensors & Tags:</span>
              <span className="text-blue-400 font-mono text-[9px]">Raycast Active</span>
            </div>

            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {project.ioMap.map((tag) => {
                const liveVal = tag.isForced && tag.forcedValue !== undefined ? tag.forcedValue : tag.currentValue;
                const isBool = tag.dataType === 'BOOL';

                return (
                  <div 
                    key={tag.id}
                    className="p-2 rounded bg-[#1a1a1e]/80 border border-slate-800 flex items-center justify-between gap-2 hover:border-slate-700 transition-all"
                  >
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 font-mono font-bold text-slate-200">
                        <span className={`px-1 rounded text-[10px] ${
                          tag.address.area === 'INPUT' 
                            ? 'bg-blue-900/60 text-blue-300' 
                            : 'bg-amber-900/60 text-amber-300'
                        }`}>
                          {tag.address.rawString}
                        </span>
                        <span className="truncate">{tag.symbol}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 truncate mt-0.5">
                        {tag.description}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isBool && (
                        <button
                          onClick={() => onToggleTagValue(tag.id)}
                          className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold transition-all cursor-pointer ${
                            Boolean(liveVal)
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_6px_rgba(16,185,129,0.3)]'
                              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
                          }`}
                          title="Click to toggle sensor / pushbutton in 3D scene"
                        >
                          {Boolean(liveVal) ? 'TRUE' : 'FALSE'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sorter Conveyor Physics Telemetry Badge */}
          {selectedScene === 'conveyor' && (
            <div className="p-2 rounded bg-[#16161a] border border-indigo-500/30 text-[11px] space-y-1 font-mono">
              <div className="flex items-center justify-between text-indigo-300 font-bold">
                <span className="flex items-center gap-1">
                  <PackageCheck className="w-3.5 h-3.5 text-emerald-400" /> Sorter Telemetry
                </span>
                <span className="text-emerald-400">{sortedCount} Diverted</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Active Workpieces:</span>
                <span className="text-white font-bold">{boxCount} bodies</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Pusher Actuator:</span>
                <span className={simStateRef.current.pusherZ > 0.1 ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                  {simStateRef.current.pusherZ > 0.1 ? 'EXTENDED (Kinematic)' : 'RETRACTED'}
                </span>
              </div>
            </div>
          )}

          <div className="pt-1 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-400" />
              <span>Click 3D objects to toggle</span>
            </span>
            <span className="text-emerald-400 font-mono">Gravity: 9.82 m/s²</span>
          </div>
        </div>
      )}

      {/* Bottom telemetry footer */}
      <div className="absolute bottom-3 left-4 px-3 py-1.5 rounded-full bg-[#111114]/80 backdrop-blur-md border border-slate-800 text-[11px] font-mono text-slate-400 flex items-center gap-3 pointer-events-none z-20">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Digital Twin: <strong>{selectedScene.toUpperCase()}</strong></span>
        </span>
        <span className="text-slate-600">|</span>
        <span className="text-indigo-400 flex items-center gap-1">
          <Atom className="w-3 h-3" /> Cannon.js RigidBody Engine
        </span>
        <span className="text-slate-600">|</span>
        <span>Collisions: Active</span>
      </div>
    </div>
  );
};
