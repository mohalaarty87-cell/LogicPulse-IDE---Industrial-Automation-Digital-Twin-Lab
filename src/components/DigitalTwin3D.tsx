import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { 
  Box, 
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
  Move
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

  // Active 3D Twin Scene
  const [selectedScene, setSelectedScene] = useState<SceneType>(() => {
    const projId = project.project.id.toLowerCase();
    if (projId.includes('conveyor') || projId.includes('sorter')) return 'conveyor';
    if (projId.includes('tank') || projId.includes('pump')) return 'tank';
    if (projId.includes('traffic')) return 'traffic';
    return 'motor';
  });

  const [cameraPreset, setCameraPreset] = useState<'iso' | 'top' | 'front'>('iso');
  const [isWireframe, setIsWireframe] = useState(false);
  const [showTagsHUD, setShowTagsHUD] = useState(true);

  // Dynamic simulation internal states
  const simStateRef = useRef({
    // Conveyor
    conveyorPos: 0,
    boxX: -4.5,
    boxDetected: false,
    boxPushed: false,
    pusherZ: 0,
    batchCount: 0,
    // Tank
    waterLevel: 1.2, // 0 to 3.5
    // Traffic
    carPosition: -8,
    // Motor
    motorAngle: 0,
    motorRPM: 0,
  });

  // Fast tag lookup
  const tagMap = useMemo(() => {
    const map = new Map<string, IOTag>();
    project.ioMap.forEach((t) => {
      map.set(t.address.rawString.toUpperCase(), t);
      map.set(t.symbol.toUpperCase(), t);
    });
    return map;
  }, [project.ioMap]);

  // Helper to read tag boolean value
  const isTagTrue = (addressOrSymbol: string): boolean => {
    const tag = tagMap.get(addressOrSymbol.toUpperCase());
    if (!tag) return false;
    const val = tag.isForced && tag.forcedValue !== undefined ? tag.forcedValue : tag.currentValue;
    return Boolean(val);
  };

  // Find tag object
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
      cam.position.set(0, 2, 9);
      cam.lookAt(0, 1.5, 0);
    }
  };

  // ================= THREE.JS INITIALIZATION & SCENE CREATION =================
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(theme === 'modern' ? 0xf0f2f5 : 0x07070a);
    scene.fog = new THREE.FogExp2(theme === 'modern' ? 0xf0f2f5 : 0x07070a, 0.035);
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

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(8, 12, 6);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 30;
    dirLight.shadow.camera.left = -8;
    dirLight.shadow.camera.right = 8;
    dirLight.shadow.camera.top = 8;
    dirLight.shadow.camera.bottom = -8;
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x3b82f6, 1, 12);
    pointLight.position.set(-3, 4, 3);
    scene.add(pointLight);

    // 5. Floor Grid
    const gridHelper = new THREE.GridHelper(20, 20, 0x3b82f6, 0x1f293d);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    const floorGeo = new THREE.PlaneGeometry(30, 30);
    const floorMat = new THREE.MeshStandardMaterial({ 
      color: theme === 'modern' ? 0xe2e8f0 : 0x0d0d12, 
      roughness: 0.8,
      metalness: 0.2
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Dynamic Meshes Holder
    const sceneObjectsGroup = new THREE.Group();
    scene.add(sceneObjectsGroup);

    // Track dynamic mesh parts for animation
    const animatedParts: {
      rollers: THREE.Mesh[];
      boxMesh?: THREE.Mesh;
      pusherMesh?: THREE.Mesh;
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
      gearMesh2?: THREE.Mesh;
      runPilotMesh?: THREE.Mesh;
      runPilotLight?: THREE.PointLight;
    } = { rollers: [] };

    // ================= BUILD 3D SCENE ASSETS BASED ON SELECTED SCENE =================

    if (selectedScene === 'conveyor') {
      // --- Conveyor Frame & Belt ---
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
      const beltMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
      const rollerMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.1 });

      // Conveyor Bed
      const bedGeo = new THREE.BoxGeometry(10, 0.4, 2);
      const bedMesh = new THREE.Mesh(bedGeo, beltMat);
      bedMesh.position.set(0, 1.2, 0);
      bedMesh.castShadow = true;
      bedMesh.receiveShadow = true;
      sceneObjectsGroup.add(bedMesh);

      // Side Guard Rails
      const railGeo = new THREE.BoxGeometry(10, 0.3, 0.1);
      const rail1 = new THREE.Mesh(railGeo, frameMat);
      rail1.position.set(0, 1.5, 1.05);
      const rail2 = new THREE.Mesh(railGeo, frameMat);
      rail2.position.set(0, 1.5, -1.05);
      sceneObjectsGroup.add(rail1, rail2);

      // Legs
      const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2);
      [-4.5, -1.5, 1.5, 4.5].forEach((x) => {
        const legF = new THREE.Mesh(legGeo, frameMat);
        legF.position.set(x, 0.6, 0.9);
        const legB = new THREE.Mesh(legGeo, frameMat);
        legB.position.set(x, 0.6, -0.9);
        sceneObjectsGroup.add(legF, legB);
      });

      // Rollers
      const rollerGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.9, 12);
      for (let x = -4.8; x <= 4.8; x += 0.8) {
        const roller = new THREE.Mesh(rollerGeo, rollerMat);
        roller.rotation.x = Math.PI / 2;
        roller.position.set(x, 1.35, 0);
        sceneObjectsGroup.add(roller);
        animatedParts.rollers.push(roller);
      }

      // Optical Proximity Sensor Bracket & Beam (at x = 0)
      const sensorMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.5, roughness: 0.4 });
      const sensorPost = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.0, 0.2), sensorMat);
      sensorPost.position.set(0, 1.8, 1.2);
      const sensorHead = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.3), sensorMat);
      sensorHead.rotation.x = Math.PI / 2;
      sensorHead.position.set(0, 1.7, 1.05);
      sceneObjectsGroup.add(sensorPost, sensorHead);

      // Optical Laser Beam Line across belt
      const beamGeo = new THREE.CylinderGeometry(0.015, 0.015, 2.1);
      const beamMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.6 });
      const sensorBeam = new THREE.Mesh(beamGeo, beamMat);
      sensorBeam.rotation.x = Math.PI / 2;
      sensorBeam.position.set(0, 1.7, 0);
      sceneObjectsGroup.add(sensorBeam);
      animatedParts.sensorBeamMesh = sensorBeam;

      // Pneumatic Pusher / Diverter Cylinder (at x = 2.0)
      const pusherBodyMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7, roughness: 0.3 });
      const cylinderMesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 1.2), pusherBodyMat);
      cylinderMesh.position.set(2, 1.6, -1.8);
      
      const rodMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.0), rollerMat);
      rodMesh.rotation.x = Math.PI / 2;
      rodMesh.position.set(2, 1.6, -1.0);
      
      const pushPaddleMesh = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.4, 0.1), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
      pushPaddleMesh.position.set(2, 1.6, -0.6);

      const pusherGroup = new THREE.Group();
      pusherGroup.add(rodMesh, pushPaddleMesh);
      sceneObjectsGroup.add(cylinderMesh, pusherGroup);
      animatedParts.pusherMesh = pusherGroup as any;

      // Ejection bin / chute on opposite side
      const binMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.6 });
      const binMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 1.2), binMat);
      binMesh.position.set(2, 0.5, 1.8);
      sceneObjectsGroup.add(binMesh);

      // Conveyor Drive Motor
      const motorBody = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.8), frameMat);
      motorBody.rotation.z = Math.PI / 2;
      motorBody.position.set(5.1, 1.2, 0);
      sceneObjectsGroup.add(motorBody);

      // Conveyor Package (Moving Box)
      const boxGeo = new THREE.BoxGeometry(0.8, 0.6, 0.8);
      const boxMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });
      const boxMesh = new THREE.Mesh(boxGeo, boxMat);
      boxMesh.position.set(-4.5, 1.7, 0);
      boxMesh.castShadow = true;
      sceneObjectsGroup.add(boxMesh);
      animatedParts.boxMesh = boxMesh;

    } else if (selectedScene === 'tank') {
      // --- Water Reservoir Tank Scene ---
      // Metal Base Stand
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

      // Tank Base and Top Ring
      const ringGeo = new THREE.TorusGeometry(2.02, 0.08, 12, 32);
      const topRing = new THREE.Mesh(ringGeo, standMat);
      topRing.rotation.x = Math.PI / 2;
      topRing.position.set(0, 4.6, 0);
      const bottomRing = new THREE.Mesh(ringGeo, standMat);
      bottomRing.rotation.x = Math.PI / 2;
      bottomRing.position.set(0, 0.6, 0);
      sceneObjectsGroup.add(topRing, bottomRing);

      // Dynamic Liquid / Water Body inside Tank
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

      // Float Switch Sensors (Low Level Float at y=1.2, High Level Float at y=3.8)
      const floatSensorMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.4 });
      const lowFloat = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), floatSensorMat);
      lowFloat.position.set(1.4, 1.2, 0);
      const highFloat = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), floatSensorMat);
      highFloat.position.set(1.4, 3.8, 0);
      sceneObjectsGroup.add(lowFloat, highFloat);
      animatedParts.lowFloatMesh = lowFloat;
      animatedParts.highFloatMesh = highFloat;

      // Float sensor support rods
      const rodMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 });
      const lowRod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6), rodMat);
      lowRod.rotation.z = Math.PI / 2;
      lowRod.position.set(1.7, 1.2, 0);
      const highRod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6), rodMat);
      highRod.rotation.z = Math.PI / 2;
      highRod.position.set(1.7, 3.8, 0);
      sceneObjectsGroup.add(lowRod, highRod);

      // Centrifugal Filling Pump (Left Side)
      const pumpMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, metalness: 0.6, roughness: 0.3 });
      const pumpBody = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.8, 16), pumpMat);
      pumpBody.position.set(-3.5, 0.8, 0);
      
      const pumpMotor = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.0, 16), standMat);
      pumpMotor.rotation.z = Math.PI / 2;
      pumpMotor.position.set(-4.2, 0.8, 0);
      
      // Inlet Pipe into Tank
      const pipeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });
      const pipeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.8), pipeMat);
      pipeMesh.position.set(-3.5, 2.7, 0);
      
      const pipeOverTop = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.4), pipeMat);
      pipeOverTop.rotation.z = Math.PI / 2;
      pipeOverTop.position.set(-2.3, 4.6, 0);
      
      sceneObjectsGroup.add(pumpBody, pumpMotor, pipeMesh, pipeOverTop);

      // Warning Strobe Beacon on Tank Top
      const beaconBase = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.2), standMat);
      beaconBase.position.set(0, 4.7, 0);
      
      const beaconDome = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x7f1d1d }));
      beaconDome.position.set(0, 4.9, 0);
      
      const beaconLight = new THREE.PointLight(0xef4444, 0, 8);
      beaconLight.position.set(0, 5.0, 0);
      
      sceneObjectsGroup.add(beaconBase, beaconDome, beaconLight);
      animatedParts.alarmLightMesh = beaconDome;
      animatedParts.alarmLightSource = beaconLight;

    } else if (selectedScene === 'traffic') {
      // --- Smart Traffic Light Intersection Scene ---
      // Road Crossing Ground Asphalt
      const roadMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
      const roadGeo = new THREE.PlaneGeometry(16, 16);
      const roadMesh = new THREE.Mesh(roadGeo, roadMat);
      roadMesh.rotation.x = -Math.PI / 2;
      roadMesh.position.y = 0.01;
      sceneObjectsGroup.add(roadMesh);

      // White Lane Markings
      const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      for (let z = -7; z <= 7; z += 2) {
        if (Math.abs(z) > 1.5) {
          const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 1.2), lineMat);
          dash.rotation.x = -Math.PI / 2;
          dash.position.set(0, 0.02, z);
          sceneObjectsGroup.add(dash);
        }
      }

      // Traffic Light Mast & Pole (at x=2.5, z=2.5)
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 5.0), poleMat);
      mast.position.set(2.8, 2.5, 2.8);
      
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6), poleMat);
      arm.rotation.z = Math.PI / 2;
      arm.position.set(1.5, 4.8, 2.8);
      sceneObjectsGroup.add(mast, arm);

      // Traffic Light Housing Box
      const housingMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
      const housing = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.6, 0.5), housingMat);
      housing.position.set(0.5, 4.5, 2.8);
      sceneObjectsGroup.add(housing);

      // Traffic Light Lenses (Red, Yellow, Green)
      const redMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, emissive: 0x000000, roughness: 0.2 });
      const yellowMat = new THREE.MeshStandardMaterial({ color: 0x78350f, emissive: 0x000000, roughness: 0.2 });
      const greenMat = new THREE.MeshStandardMaterial({ color: 0x064e3b, emissive: 0x000000, roughness: 0.2 });

      const redLight = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), redMat);
      redLight.position.set(0.5, 5.0, 2.55);
      
      const yellowLight = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), yellowMat);
      yellowLight.position.set(0.5, 4.5, 2.55);
      
      const greenLight = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), greenMat);
      greenLight.position.set(0.5, 4.0, 2.55);

      sceneObjectsGroup.add(redLight, yellowLight, greenLight);
      animatedParts.trafficRedMesh = redLight;
      animatedParts.trafficYellowMesh = yellowLight;
      animatedParts.trafficGreenMesh = greenLight;

      // Traffic Car (Approaching Intersection)
      const carGroup = new THREE.Group();
      const carBodyMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.5, roughness: 0.3 });
      const carBody = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 3.2), carBodyMat);
      carBody.position.y = 0.55;
      
      const carCabin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 1.8), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
      carCabin.position.set(0, 1.1, -0.2);
      
      carGroup.add(carBody, carCabin);
      carGroup.position.set(-1.2, 0, -8);
      sceneObjectsGroup.add(carGroup);
      animatedParts.trafficCarMesh = carGroup as any;

    } else if (selectedScene === 'motor') {
      // --- 3-Phase Induction Motor & Heavy Industrial Gearbox ---
      const motorCastMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.7, roughness: 0.3 });
      const finMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, metalness: 0.8, roughness: 0.3 });
      const shaftMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.1 });

      // Motor Base Mount Plate
      const basePlate = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.3, 2.6), new THREE.MeshStandardMaterial({ color: 0x334155 }));
      basePlate.position.set(0, 0.15, 0);
      sceneObjectsGroup.add(basePlate);

      // Stator Body Cylinder
      const stator = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 2.4, 32), motorCastMat);
      stator.rotation.z = Math.PI / 2;
      stator.position.set(-0.6, 1.4, 0);
      sceneObjectsGroup.add(stator);

      // Cooling Fins
      for (let i = 0; i < 8; i++) {
        const fin = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.04, 8, 32), finMat);
        fin.rotation.y = Math.PI / 2;
        fin.position.set(-1.5 + i * 0.26, 1.4, 0);
        sceneObjectsGroup.add(fin);
      }

      // Terminal Box on Top
      const termBox = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.8), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
      termBox.position.set(-0.6, 2.7, 0);
      sceneObjectsGroup.add(termBox);

      // Rotating Rotor & Output Drive Shaft
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 4.2, 24), shaftMat);
      shaft.rotation.z = Math.PI / 2;
      shaft.position.set(0.3, 1.4, 0);
      sceneObjectsGroup.add(shaft);
      animatedParts.motorRotorMesh = shaft;

      // Cooling Fan on Rear (-X end)
      const fanHub = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.3, 12), new THREE.MeshStandardMaterial({ color: 0x64748b }));
      fanHub.rotation.z = Math.PI / 2;
      fanHub.position.set(-1.9, 1.4, 0);
      sceneObjectsGroup.add(fanHub);
      animatedParts.motorFanMesh = fanHub;

      // Gearbox on Front (+X end)
      const gearBox = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 1.6), new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 }));
      gearBox.position.set(1.6, 1.4, 0);
      sceneObjectsGroup.add(gearBox);

      // Mechanical Indicator Disc / Pulley with visual rotation marker
      const pulleyMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8 });
      const pulley = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.25, 24), pulleyMat);
      pulley.rotation.z = Math.PI / 2;
      pulley.position.set(2.6, 1.4, 0);
      
      const marker = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.08), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      marker.position.set(2.74, 1.7, 0);
      
      const pulleyGroup = new THREE.Group();
      pulleyGroup.add(pulley, marker);
      sceneObjectsGroup.add(pulleyGroup);
      animatedParts.gearMesh1 = pulleyGroup as any;

      // Status Indicator Pilot Lamp (Run Indicator `Q0.1` or `Q0.0`)
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

    // ================= ANIMATION & PLC SYNCHRONIZATION LOOP =================
    let lastTime = performance.now();

    const animate = (time: number) => {
      animationFrameIdRef.current = requestAnimationFrame(animate);
      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const sim = simStateRef.current;
      const isRunning = simStatus === 'RUNNING';

      // ============ SCENE 1: CONVEYOR & SORTER LOGIC ============
      if (selectedScene === 'conveyor') {
        const motorOn = isRunning && (isTagTrue('Q0.0') || isTagTrue('MOTOR_RUN') || isTagTrue('MOTOR_OUT') || isTagTrue('SYS_ENABLE'));
        const ejectorOn = isTagTrue('Q0.0') || isTagTrue('EJECTOR_SOLENOID') || isTagTrue('Q0.1');

        if (motorOn) {
          sim.conveyorPos += delta * 2.5;
          // Rotate rollers
          animatedParts.rollers.forEach((r) => {
            r.rotation.y += delta * 6;
          });

          // Move box along belt
          if (!sim.boxPushed) {
            sim.boxX += delta * 2.2;
            if (sim.boxX > 5.0) {
              sim.boxX = -4.5;
              sim.boxPushed = false;
            }
          }
        }

        // Proximity sensor detection (when box is near x=0, between -0.4 and +0.4)
        const inSensorRange = sim.boxX >= -0.5 && sim.boxX <= 0.5 && !sim.boxPushed;
        if (inSensorRange !== sim.boxDetected) {
          sim.boxDetected = inSensorRange;
          // Update PLC Tag `I0.0` or `PART_SENSOR` in real-time
          const sensorTag = getTag('PART_SENSOR') || getTag('I0.0');
          if (sensorTag && sensorTag.currentValue !== inSensorRange) {
            onToggleTagValue(sensorTag.id);
          }
        }

        // Visual beam glow
        if (animatedParts.sensorBeamMesh) {
          (animatedParts.sensorBeamMesh.material as THREE.MeshBasicMaterial).color.setHex(
            inSensorRange ? 0x22c55e : 0xef4444
          );
        }

        // Pneumatic pusher extension
        if (ejectorOn) {
          sim.pusherZ = Math.min(sim.pusherZ + delta * 6.0, 1.2);
          // If box is in front of ejector (x around 2.0), push it into bin!
          if (sim.boxX >= 1.4 && sim.boxX <= 2.6) {
            sim.boxPushed = true;
          }
        } else {
          sim.pusherZ = Math.max(sim.pusherZ - delta * 4.0, 0);
        }

        if (animatedParts.pusherMesh) {
          animatedParts.pusherMesh.position.z = sim.pusherZ;
        }

        // Update Box 3D position
        if (animatedParts.boxMesh) {
          if (sim.boxPushed) {
            animatedParts.boxMesh.position.set(2.0, 1.7 - (sim.pusherZ * 0.8), sim.pusherZ * 1.5);
            if (sim.pusherZ >= 1.0) {
              // Reset box to start after being ejected
              setTimeout(() => {
                sim.boxX = -4.5;
                sim.boxPushed = false;
              }, 400);
            }
          } else {
            animatedParts.boxMesh.position.set(sim.boxX, 1.7, 0);
          }
        }
      }

      // ============ SCENE 2: TANK LEVEL & PUMP LOGIC ============
      else if (selectedScene === 'tank') {
        const pumpOn = isRunning && (isTagTrue('Q0.0') || isTagTrue('PUMP_VALVE') || isTagTrue('MOTOR_OUT'));
        const alarmOn = isTagTrue('Q0.1') || isTagTrue('ALARM_FULL');

        // Fluid dynamics simulation
        if (pumpOn) {
          sim.waterLevel = Math.min(sim.waterLevel + delta * 0.8, 3.9);
        } else {
          // Slow passive consumption / drain
          sim.waterLevel = Math.max(sim.waterLevel - delta * 0.15, 0.4);
        }

        // Update Water 3D Mesh
        if (animatedParts.waterMesh) {
          animatedParts.waterMesh.scale.y = Math.max(sim.waterLevel, 0.1);
          animatedParts.waterMesh.position.y = 0.6 + sim.waterLevel / 2;
        }

        // Float switch tags (Low float at y <= 1.2, High float at y >= 3.6)
        const isLowTriggered = sim.waterLevel <= 1.3;
        const isHighTriggered = sim.waterLevel >= 3.6;

        const lowTag = getTag('FLOAT_LOW') || getTag('I0.0');
        if (lowTag && lowTag.currentValue !== isLowTriggered) {
          onToggleTagValue(lowTag.id);
        }

        const highTag = getTag('FLOAT_HIGH') || getTag('I0.1');
        if (highTag && highTag.currentValue !== isHighTriggered) {
          onToggleTagValue(highTag.id);
        }

        // Float sensor visual colors
        if (animatedParts.lowFloatMesh) {
          (animatedParts.lowFloatMesh.material as THREE.MeshStandardMaterial).color.setHex(
            isLowTriggered ? 0xf59e0b : 0x10b981
          );
        }
        if (animatedParts.highFloatMesh) {
          (animatedParts.highFloatMesh.material as THREE.MeshStandardMaterial).color.setHex(
            isHighTriggered ? 0xef4444 : 0x10b981
          );
        }

        // Alarm Beacon strobe animation
        if (animatedParts.alarmLightSource && animatedParts.alarmLightMesh) {
          if (alarmOn || isHighTriggered) {
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

      // ============ SCENE 3: TRAFFIC LIGHT LOGIC ============
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

        // Car AI Driving Simulation
        if (animatedParts.trafficCarMesh) {
          if (greenOn) {
            // Drive forward through intersection
            sim.carPosition += delta * 4.0;
            if (sim.carPosition > 9.0) sim.carPosition = -8.0;
          } else if (redOn || yellowOn) {
            // Stop at stop line (z = -2.5)
            if (sim.carPosition < -2.8) {
              sim.carPosition = Math.min(sim.carPosition + delta * 3.0, -2.8);
            }
          }
          animatedParts.trafficCarMesh.position.z = sim.carPosition;
        }
      }

      // ============ SCENE 4: INDUCTION MOTOR & GEARBOX LOGIC ============
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
          // Coasting decelerate to 0
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
          animatedParts.gearMesh1.rotation.x = sim.motorAngle * 0.25; // 4:1 Gear reduction
        }

        // Run pilot lamp
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

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Mouse drag Orbit rotation
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

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('wheel', onWheel);
      renderer.dispose();
    };
  }, [selectedScene, theme, simStatus, project]);

  return (
    <div className={`flex-1 flex flex-col h-full overflow-hidden select-none relative ${
      theme === 'modern' ? 'bg-slate-100 text-slate-800' : 'bg-[#07070a] text-slate-200'
    }`}>
      {/* 3D Lab Top Control Bar */}
      <div className={`h-12 px-4 border-b flex items-center justify-between shrink-0 z-20 ${
        theme === 'modern' ? 'bg-white border-slate-200' : 'bg-[#111114] border-slate-800'
      }`}>
        {/* Scene Selection Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-bold text-xs tracking-wider uppercase mr-2 text-blue-400">
            <Box className="w-4 h-4" />
            <span>3D Digital Twin Simulation Lab</span>
          </div>

          <div className="flex items-center gap-1 bg-[#1a1a1e] p-0.5 rounded border border-slate-800 text-xs">
            <button
              onClick={() => setSelectedScene('conveyor')}
              className={`px-3 py-1 rounded font-medium flex items-center gap-1.5 transition-colors ${
                selectedScene === 'conveyor'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Move className="w-3.5 h-3.5" /> Conveyor & Sorter
            </button>

            <button
              onClick={() => setSelectedScene('tank')}
              className={`px-3 py-1 rounded font-medium flex items-center gap-1.5 transition-colors ${
                selectedScene === 'tank'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5" /> Tank & Pump
            </button>

            <button
              onClick={() => setSelectedScene('traffic')}
              className={`px-3 py-1 rounded font-medium flex items-center gap-1.5 transition-colors ${
                selectedScene === 'traffic'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" /> Traffic Lights
            </button>

            <button
              onClick={() => setSelectedScene('motor')}
              className={`px-3 py-1 rounded font-medium flex items-center gap-1.5 transition-colors ${
                selectedScene === 'motor'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Gauge className="w-3.5 h-3.5" /> Motor & Gearbox
            </button>
          </div>
        </div>

        {/* Camera Views & HUD Toggles */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1 bg-[#1a1a1e] p-0.5 rounded border border-slate-800">
            <button
              onClick={() => setCameraView('iso')}
              className={`px-2 py-1 rounded text-[11px] font-mono ${
                cameraPreset === 'iso' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ISO 3D
            </button>
            <button
              onClick={() => setCameraView('top')}
              className={`px-2 py-1 rounded text-[11px] font-mono ${
                cameraPreset === 'top' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              TOP
            </button>
            <button
              onClick={() => setCameraView('front')}
              className={`px-2 py-1 rounded text-[11px] font-mono ${
                cameraPreset === 'front' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              FRONT
            </button>
          </div>

          <button
            onClick={() => setShowTagsHUD(!showTagsHUD)}
            className={`px-2.5 py-1 rounded border text-xs flex items-center gap-1.5 transition-colors ${
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
        className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing outline-none"
      />

      {/* Interactive Overlay: 3D Twin HUD & I/O Physical Controls */}
      {showTagsHUD && (
        <div className="absolute top-16 right-4 w-80 bg-[#111114]/90 backdrop-blur-md border border-slate-800 rounded-lg p-3 shadow-2xl z-30 space-y-3 pointer-events-auto text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-200">
              <Cpu className="w-4 h-4 text-blue-400" />
              <span>Live PLC Tag Synchronizer</span>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              {simStatus}
            </span>
          </div>

          {/* Quick Scene Instructions / Interactive Controls */}
          <div className="space-y-2">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Physical Actuators & Sensor I/O:
            </div>

            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
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
                          className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold transition-all ${
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

          <div className="pt-1 border-t border-slate-800 text-[10px] text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-blue-400" />
            <span>Orbit with Mouse Drag | Zoom with Scroll</span>
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
        <span>Mesh Render: WebGL 60 FPS</span>
      </div>
    </div>
  );
};
