import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Box,
  Camera,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  RotateCcw,
  Layers,
} from 'lucide-react';
import {
  BatterRating,
  BatterShotEvent,
  BowlerDeliveryEvent,
  BowlerRating,
} from '../types/cricket';

interface ThreeStadiumArenaProps {
  player: BatterRating | BowlerRating;
  isBatter: boolean;
}

type CameraPreset = 'broadcast' | 'stumpCam' | 'aerial' | 'sideAngle';

// Module-scope pre-allocated math scratch objects (Zero GC inside render loop)
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _currentLookAt = new THREE.Vector3(0, 1.5, 0);
const _ballPos = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _euler = new THREE.Euler();
const _color = new THREE.Color();

function createProceduralTurfTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0B3B28';
  ctx.fillRect(0, 0, 1024, 1024);

  // Concentric & cross-cut stadium turf mowing bands
  const cx = 512;
  const cy = 512;
  for (let r = 500; r > 0; r -= 36) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = (r / 36) % 2 === 0 ? '#0E4832' : '#093423';
    ctx.fill();
  }

  // Linear mowing stripes
  for (let i = 0; i < 32; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.04)';
    ctx.fillRect(i * 32, 0, 16, 1024);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createProceduralPitchTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Rolled clay turf surface
  const grad = ctx.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, '#C2A878');
  grad.addColorStop(0.5, '#D1B88A');
  grad.addColorStop(1, '#C2A878');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 1024);

  // Subtle pitch wear patches
  ctx.fillStyle = 'rgba(92, 74, 46, 0.18)';
  ctx.beginPath();
  ctx.ellipse(256, 220, 75, 130, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(256, 804, 75, 130, 0, 0, Math.PI * 2);
  ctx.fill();

  // Crisp White Crease Markings
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 10;
  // Far end popping & bowling creases
  ctx.strokeRect(48, 80, 416, 70);
  // Near end popping & bowling creases
  ctx.strokeRect(48, 874, 416, 70);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createRadialContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 120);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.25)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const ThreeStadiumArena: React.FC<ThreeStadiumArenaProps> = ({
  player,
  isBatter,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);

  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('broadcast');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [showHeatZone3D, setShowHeatZone3D] = useState<boolean>(true);
  const [activeBallIdx, setActiveBallIdx] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);

  const batter = isBatter ? (player as BatterRating) : null;
  const bowler = !isBatter ? (player as BowlerRating) : null;

  // Prepare 12 high-pressure 3D trajectory events
  const trajectories = useMemo(() => {
    if (isBatter && batter) {
      const shots: BatterShotEvent[] =
        batter.topPressureShots && batter.topPressureShots.length >= 6
          ? batter.topPressureShots.slice(0, 12)
          : Array.from({ length: 10 }, (_, idx) => ({
              ballIndex: idx + 1,
              over: 16 + (idx % 4),
              ballNum: (idx % 6) + 1,
              runs: idx % 2 === 0 ? 6 : 4,
              isFour: idx % 2 !== 0,
              isSix: idx % 2 === 0,
              stroke: idx % 2 === 0 ? 'Lofted Extra Cover Six' : 'Power Pull Boundary',
              onOrOff: idx % 2 === 0 ? 'Off-side' : 'On-side',
              sector: 'Deep Extra Cover',
              angleDeg: idx % 2 === 0 ? -52 + idx * 5 : 58 - idx * 4,
              distanceRatio: idx % 2 === 0 ? 1.02 : 0.9,
              bpi: 84 + (idx % 12),
              opponent: 'IPL Crunch Match',
              matchDate: '2024',
              bowlerType: 'Pace',
            }));

      return shots.map((s) => {
        const rad = ((s.angleDeg - 90) * Math.PI) / 180;
        const maxRadius = 38 * s.distanceRatio;
        const endX = Math.cos(rad) * maxRadius;
        const endZ = Math.sin(rad) * maxRadius;
        const peakY = s.isSix ? 11.5 : s.isFour ? 1.8 : 2.6;
        const colorHex = s.isSix ? 0xd4af37 : s.isFour ? 0xea1a85 : 0x38bdf8;
        return {
          label: `${s.stroke} (${s.runs} Runs · Ov ${s.over}.${s.ballNum})`,
          start: new THREE.Vector3(0, 0.9, 7.5),
          mid: new THREE.Vector3(endX * 0.52, peakY, 7.5 + (endZ - 7.5) * 0.52),
          end: new THREE.Vector3(endX, 0.35, endZ),
          colorHex,
          bpi: s.bpi,
        };
      });
    } else {
      const dels: BowlerDeliveryEvent[] =
        bowler?.topPressureDeliveries && bowler.topPressureDeliveries.length >= 6
          ? bowler.topPressureDeliveries.slice(0, 12)
          : Array.from({ length: 10 }, (_, idx) => ({
              ballIndex: idx + 1,
              over: 17 + (idx % 3),
              ballNum: (idx % 6) + 1,
              runsConceded: 0,
              isWicket: idx % 2 === 0,
              isDot: true,
              dismissalType: 'Bowled',
              overOrAround: idx % 3 === 0 ? 'Around' : 'Over',
              deliveryStyle: idx % 2 === 0 ? 'Toe-Crushing Yorker' : 'Hard Length Seam',
              lengthZone: 'Blockhole (0-2m)',
              speedKmh: 143.6,
              pitchX: ((idx % 5) - 2) * 0.12,
              pitchY: idx % 2 === 0 ? 0.14 : 0.34,
              endX: 0,
              bpi: 86 + (idx % 10),
              opponent: 'IPL Crunch Spell',
              matchDate: '2024',
            }));

      return dels.map((d) => {
        const releaseX = d.overOrAround === 'Over' ? -0.85 : 0.85;
        const bounceZ = 7.5 - (1 - d.pitchY) * 15.0;
        const bounceX = d.pitchX * 1.4;
        const colorHex = d.isWicket ? 0xea1a85 : 0xd4af37;
        return {
          label: `${d.deliveryStyle} (${d.speedKmh} km/h · ${d.isWicket ? 'WICKET!' : 'DOT BALL'})`,
          start: new THREE.Vector3(releaseX, 2.15, -7.5),
          mid: new THREE.Vector3(bounceX, 0.16, bounceZ),
          end: new THREE.Vector3(d.endX * 1.1, 0.72, 7.6),
          colorHex,
          bpi: d.bpi,
        };
      });
    }
  }, [isBatter, batter, bowler]);

  // Mutable ref state shared with the WebGL animation loop so React updates never recreate the scene
  const simStateRef = useRef({
    cameraPreset,
    isPlaying,
    showHeatZone3D,
    activeBallIdx,
    trajectories,
  });

  useEffect(() => {
    simStateRef.current = {
      cameraPreset,
      isPlaying,
      showHeatZone3D,
      activeBallIdx,
      trajectories,
    };
  }, [cameraPreset, isPlaying, showHeatZone3D, activeBallIdx, trajectories]);

  // Mount Three.js WebGL Scene Once
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    // 1. Software WebGL Detection Guard
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 540;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070b14);
    scene.fog = new THREE.FogExp2(0x070b14, 0.0085);

    // 2. Mandatory Studio Environment Reflection (RoomEnvironment + PMREMGenerator)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 300);
    camera.position.set(0, 22, 48);

    // 3. Balanced 3-Point Studio & Stadium Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x092e1f, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e0, 2.4);
    keyLight.position.set(28, 46, 32);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 5;
    keyLight.shadow.camera.far = 130;
    const d = 48;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xea1a85, 1.35);
    rimLight.position.set(-34, 28, -28);
    scene.add(rimLight);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const turfTex = createProceduralTurfTexture(maxAniso);
    const pitchTex = createProceduralPitchTexture(maxAniso);
    const contactShadowTex = createRadialContactShadowTexture();

    // =========================================================================
    // COMPOSITE MODEL 1: 3D Stadium Bowl, Grandstands & 24 Structural Ribs
    // =========================================================================
    const stadiumGroup = new THREE.Group();

    // Part 1: Outfield Turf Ground Disc
    const turfGeo = new THREE.CylinderGeometry(44, 44, 0.4, 64);
    const turfMat = new THREE.MeshStandardMaterial({
      map: turfTex,
      roughness: 0.78,
      metalness: 0.05,
    });
    const turfMesh = new THREE.Mesh(turfGeo, turfMat);
    turfMesh.position.y = -0.2;
    turfMesh.receiveShadow = true;
    stadiumGroup.add(turfMesh);

    // Part 2: Raised 22-Yard Clay Pitch Strip (offset on Y to prevent Z-fighting)
    const pitchGeo = new THREE.BoxGeometry(3.2, 0.06, 16.5);
    const pitchMat = new THREE.MeshStandardMaterial({
      map: pitchTex,
      roughness: 0.65,
      metalness: 0.08,
    });
    const pitchMesh = new THREE.Mesh(pitchGeo, pitchMat);
    pitchMesh.position.y = 0.03;
    pitchMesh.receiveShadow = true;
    stadiumGroup.add(pitchMesh);

    // Part 3: Glowing Royal Pink Boundary Rope Torus
    const ropeGeo = new THREE.TorusGeometry(39.5, 0.22, 16, 96);
    const ropeMat = new THREE.MeshStandardMaterial({
      color: 0xea1a85,
      emissive: 0xea1a85,
      emissiveIntensity: 0.55,
      roughness: 0.3,
      metalness: 0.6,
    });
    const ropeMesh = new THREE.Mesh(ropeGeo, ropeMat);
    ropeMesh.rotation.x = Math.PI / 2;
    ropeMesh.position.y = 0.22;
    stadiumGroup.add(ropeMesh);

    // Part 4: 30-Yard Inner Circle Ring
    const innerRingGeo = new THREE.RingGeometry(21.8, 22.15, 64);
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0xd4af37,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const innerRingMesh = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRingMesh.rotation.x = -Math.PI / 2;
    innerRingMesh.position.y = 0.04;
    stadiumGroup.add(innerRingMesh);

    // Part 5 & 6: Lower & Upper Grandstand Bowl Tiers
    const lowerBowlGeo = new THREE.CylinderGeometry(52, 44.5, 7.5, 64, 1, true);
    const lowerBowlMat = new THREE.MeshStandardMaterial({
      color: 0x131a2e,
      roughness: 0.6,
      metalness: 0.35,
      side: THREE.DoubleSide,
    });
    const lowerBowl = new THREE.Mesh(lowerBowlGeo, lowerBowlMat);
    lowerBowl.position.y = 3.75;
    stadiumGroup.add(lowerBowl);

    const upperBowlGeo = new THREE.CylinderGeometry(58, 51, 8.5, 64, 1, true);
    const upperBowlMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.65,
      side: THREE.DoubleSide,
    });
    const upperBowl = new THREE.Mesh(upperBowlGeo, upperBowlMat);
    upperBowl.position.y = 11.5;
    stadiumGroup.add(upperBowl);

    // Part 7: Royal Gold Architectural Stadium Canopy Crown
    const canopyRingGeo = new THREE.TorusGeometry(55.5, 0.9, 16, 96);
    const canopyRingMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.2,
      metalness: 0.92,
    });
    const canopyRing = new THREE.Mesh(canopyRingGeo, canopyRingMat);
    canopyRing.rotation.x = Math.PI / 2;
    canopyRing.position.y = 16.0;
    stadiumGroup.add(canopyRing);

    // Part 8: 24 Instanced Stadium Structural Steel Ribs (>20 identical items -> InstancedMesh)
    const ribGeo = new THREE.BoxGeometry(0.65, 16.5, 2.2);
    const ribMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.3,
      metalness: 0.85,
    });
    const ribCount = 24;
    const ribsInstanced = new THREE.InstancedMesh(ribGeo, ribMat, ribCount);
    for (let i = 0; i < ribCount; i++) {
      const angle = (i / ribCount) * Math.PI * 2;
      const radius = 53.5;
      _pos.set(Math.cos(angle) * radius, 8.25, Math.sin(angle) * radius);
      _euler.set(0, -angle, 0.18);
      _quat.setFromEuler(_euler);
      _scale.set(1, 1 + (i % 3) * 0.04, 1);
      _mat4.compose(_pos, _quat, _scale);
      ribsInstanced.setMatrixAt(i, _mat4);
      _color.setHex(i % 2 === 0 ? 0xea1a85 : 0xd4af37);
      ribsInstanced.setColorAt(i, _color);
    }
    ribsInstanced.instanceMatrix.needsUpdate = true;
    if (ribsInstanced.instanceColor) ribsInstanced.instanceColor.needsUpdate = true;
    ribsInstanced.computeBoundingSphere();
    stadiumGroup.add(ribsInstanced);

    // Part 9: 4 Multi-Part Floodlight Towers (Each a 5-part composite THREE.Group)
    for (let t = 0; t < 4; t++) {
      const towerGroup = new THREE.Group();
      const angle = (t * Math.PI) / 2 + Math.PI / 4;
      const dist = 56;
      towerGroup.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
      towerGroup.lookAt(0, 0, 0);

      // Plinth base
      const plinth = new THREE.Mesh(
        new THREE.CylinderGeometry(1.6, 2.1, 3, 12),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8, metalness: 0.2 })
      );
      plinth.position.y = 1.5;
      towerGroup.add(plinth);

      // Tapered steel mast
      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 1.25, 28, 12),
        new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.25, metalness: 0.88 })
      );
      mast.position.y = 15.5;
      towerGroup.add(mast);

      // Head frame
      const headFrame = new THREE.Mesh(
        new THREE.BoxGeometry(7.5, 3.8, 1.1),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.7 })
      );
      headFrame.position.set(0, 29.5, 0.6);
      headFrame.rotation.x = 0.32;
      towerGroup.add(headFrame);

      // Glowing LED Floodlight Array
      const ledBank = new THREE.Mesh(
        new THREE.PlaneGeometry(6.8, 3.1),
        new THREE.MeshBasicMaterial({ color: 0xfffbeb })
      );
      ledBank.position.set(0, 29.3, 1.2);
      ledBank.rotation.x = 0.32;
      towerGroup.add(ledBank);

      stadiumGroup.add(towerGroup);
    }

    scene.add(stadiumGroup);

    // =========================================================================
    // COMPOSITE MODEL 2: 3D LED Cricket Stumps & Bails Assembly (Both Ends)
    // =========================================================================
    const buildStumpsGroup = (zPos: number) => {
      const wicketsGroup = new THREE.Group();
      wicketsGroup.position.set(0, 0.06, zPos);

      // Radial Contact Shadow beneath Stumps
      const shadowPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(1.8, 1.2),
        new THREE.MeshBasicMaterial({
          map: contactShadowTex,
          transparent: true,
          depthWrite: false,
          opacity: 0.5,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        })
      );
      shadowPlane.rotation.x = -Math.PI / 2;
      shadowPlane.position.y = 0.01;
      wicketsGroup.add(shadowPlane);

      // LatheGeometry profile for turned cricket stump with top bail groove
      const lathePoints = [
        new THREE.Vector2(0.0, 0.0),
        new THREE.Vector2(0.032, 0.0),
        new THREE.Vector2(0.032, 0.82),
        new THREE.Vector2(0.022, 0.85),
        new THREE.Vector2(0.03, 0.88),
        new THREE.Vector2(0.0, 0.9),
      ];
      const stumpGeo = new THREE.LatheGeometry(lathePoints, 16);
      const stumpMat = new THREE.MeshStandardMaterial({
        color: 0xea1a85,
        emissive: 0xea1a85,
        emissiveIntensity: 0.35,
        roughness: 0.25,
        metalness: 0.5,
      });

      [-0.14, 0, 0.14].forEach((xOffset) => {
        const stump = new THREE.Mesh(stumpGeo, stumpMat);
        stump.position.set(xOffset, 0, 0);
        stump.castShadow = true;
        wicketsGroup.add(stump);
      });

      // 2 Carved Gold LED Bails
      const bailGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.13, 12);
      const bailMat = new THREE.MeshStandardMaterial({
        color: 0xd4af37,
        emissive: 0xd4af37,
        emissiveIntensity: 0.45,
        roughness: 0.2,
        metalness: 0.9,
      });
      [-0.07, 0.07].forEach((xOffset) => {
        const bail = new THREE.Mesh(bailGeo, bailMat);
        bail.rotation.z = Math.PI / 2;
        bail.position.set(xOffset, 0.91, 0);
        wicketsGroup.add(bail);
      });

      return wicketsGroup;
    };

    scene.add(buildStumpsGroup(7.6));
    scene.add(buildStumpsGroup(-7.6));

    // =========================================================================
    // COMPOSITE MODEL 3: 3D Batter / Bowler Figure & Sculpted Cricket Bat
    // =========================================================================
    const playerRig = new THREE.Group();
    playerRig.position.set(-0.32, 0.06, 7.15);

    // Contact shadow under player
    const playerShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.9, 1.9),
      new THREE.MeshBasicMaterial({
        map: contactShadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.55,
      })
    );
    playerShadow.rotation.x = -Math.PI / 2;
    playerShadow.position.y = 0.015;
    playerRig.add(playerShadow);

    // Batting Pads (Left & Right)
    const padGeo = new THREE.CapsuleGeometry(0.09, 0.55, 8, 12);
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.55,
      metalness: 0.2,
    });
    const leftPad = new THREE.Mesh(padGeo, padMat);
    leftPad.position.set(-0.12, 0.38, 0);
    const rightPad = new THREE.Mesh(padGeo, padMat);
    rightPad.position.set(0.12, 0.38, 0);
    playerRig.add(leftPad, rightPad);

    // Torso Jersey (RR Royal Pink)
    const torsoGeo = new THREE.CapsuleGeometry(0.22, 0.52, 8, 16);
    const torsoMat = new THREE.MeshStandardMaterial({
      color: 0xea1a85,
      roughness: 0.4,
      metalness: 0.3,
    });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.set(0, 1.05, 0);
    torso.castShadow = true;
    playerRig.add(torso);

    // Helmet & Gold Visor Grille
    const helmetGeo = new THREE.SphereGeometry(0.18, 20, 20);
    const helmetMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.2,
      metalness: 0.8,
    });
    const helmet = new THREE.Mesh(helmetGeo, helmetMat);
    helmet.position.set(0, 1.58, 0);
    playerRig.add(helmet);

    const visorGeo = new THREE.TorusGeometry(0.15, 0.018, 8, 20, Math.PI);
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.15,
      metalness: 0.95,
    });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 1.54, -0.06);
    visor.rotation.x = Math.PI / 2;
    playerRig.add(visor);

    // Sculpted Cricket Bat (ExtrudeGeometry blade + handle)
    const batGroup = new THREE.Group();
    const batShape = new THREE.Shape();
    batShape.moveTo(-0.06, 0);
    batShape.lineTo(0.06, 0);
    batShape.lineTo(0.055, 0.58);
    batShape.lineTo(-0.055, 0.58);
    batShape.closePath();
    const batBladeGeo = new THREE.ExtrudeGeometry(batShape, {
      depth: 0.045,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.01,
      bevelSegments: 3,
    });
    const batBladeMat = new THREE.MeshStandardMaterial({
      color: 0xe2c792,
      roughness: 0.45,
      metalness: 0.1,
    });
    const batBlade = new THREE.Mesh(batBladeGeo, batBladeMat);
    batGroup.add(batBlade);

    const handleMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.32, 12),
      new THREE.MeshStandardMaterial({ color: 0xea1a85, roughness: 0.6, metalness: 0.2 })
    );
    handleMesh.position.set(0, 0.72, 0.022);
    batGroup.add(handleMesh);

    batGroup.position.set(0.28, 0.35, -0.18);
    batGroup.rotation.set(-0.45, 0.2, -0.3);
    playerRig.add(batGroup);

    scene.add(playerRig);

    // =========================================================================
    // 3D ROYAL GOLD PRESSURE HEAT ZONE & BALL TRAJECTORY TUBES
    // =========================================================================
    const heatZoneGroup = new THREE.Group();
    const heatDiscGeo = new THREE.CircleGeometry(isBatter ? 11.5 : 3.2, 48);
    const heatDiscMat = new THREE.MeshBasicMaterial({
      color: 0xd4af37,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const heatDisc = new THREE.Mesh(heatDiscGeo, heatDiscMat);
    heatDisc.rotation.x = -Math.PI / 2;
    heatDisc.position.set(isBatter ? -14 : 0, 0.08, isBatter ? -10 : 5.2);
    heatZoneGroup.add(heatDisc);

    const heatRingGeo = new THREE.RingGeometry(
      isBatter ? 11.2 : 2.9,
      isBatter ? 11.7 : 3.35,
      48
    );
    const heatRingMat = new THREE.MeshBasicMaterial({
      color: 0xd4af37,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const heatRing = new THREE.Mesh(heatRingGeo, heatRingMat);
    heatRing.rotation.x = -Math.PI / 2;
    heatRing.position.copy(heatDisc.position);
    heatRing.position.y = 0.09;
    heatZoneGroup.add(heatRing);
    scene.add(heatZoneGroup);

    // Trajectory Tubes Group + Animated 3D Cricket Ball
    const tubesGroup = new THREE.Group();
    scene.add(tubesGroup);

    let curves: THREE.QuadraticBezierCurve3[] = [];
    const rebuildTrajectoryTubes = () => {
      while (tubesGroup.children.length > 0) {
        const ch = tubesGroup.children[0] as THREE.Mesh;
        ch.geometry?.dispose();
        if (Array.isArray(ch.material)) ch.material.forEach((m) => m.dispose());
        else ch.material?.dispose();
        tubesGroup.remove(ch);
      }
      curves = [];

      const list = simStateRef.current.trajectories;
      list.forEach((tr, idx) => {
        const curve = new THREE.QuadraticBezierCurve3(tr.start, tr.mid, tr.end);
        curves.push(curve);
        const isCurrent = idx === simStateRef.current.activeBallIdx;
        const tubeGeo = new THREE.TubeGeometry(curve, 36, isCurrent ? 0.18 : 0.08, 10, false);
        const tubeMat = new THREE.MeshStandardMaterial({
          color: tr.colorHex,
          emissive: tr.colorHex,
          emissiveIntensity: isCurrent ? 0.85 : 0.3,
          transparent: true,
          opacity: isCurrent ? 0.96 : 0.42,
          roughness: 0.25,
          metalness: 0.7,
        });
        const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
        tubesGroup.add(tubeMesh);
      });
    };

    rebuildTrajectoryTubes();

    // Animated 3D Cricket Ball with Seam Ring
    const activeBallGroup = new THREE.Group();
    const ballMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 20, 20),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xd4af37,
        emissiveIntensity: 0.6,
        roughness: 0.2,
        metalness: 0.8,
      })
    );
    const seamMesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.285, 0.025, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xea1a85 })
    );
    activeBallGroup.add(ballMesh, seamMesh);
    scene.add(activeBallGroup);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 4. Animation Loop with Software-WebGL Fence Sync Pacing & Exponential Camera Damping
    const clock = new THREE.Clock();
    let frameId = 0;
    let ballAnimProgress = 0;
    let lastActiveIdx = simStateRef.current.activeBallIdx;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      if (gl.flush) gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      const dt = Math.min(0.1, clock.getDelta());
      const elapsed = clock.getElapsedTime();
      const st = simStateRef.current;

      if (st.activeBallIdx !== lastActiveIdx) {
        lastActiveIdx = st.activeBallIdx;
        rebuildTrajectoryTubes();
        ballAnimProgress = 0;
      }

      // Toggle 3D Royal Gold Heat Zone visibility & subtle breathing scale
      heatZoneGroup.visible = st.showHeatZone3D;
      if (st.showHeatZone3D) {
        const s = 1 + 0.05 * Math.sin(elapsed * 2.5);
        heatDisc.scale.set(s, s, 1);
      }

      // Advance active ball along its 3D Bézier trajectory
      if (st.isPlaying && curves.length > 0) {
        ballAnimProgress += dt * 0.72;
        if (ballAnimProgress >= 1) {
          ballAnimProgress = 0;
          const nextIdx = (st.activeBallIdx + 1) % curves.length;
          simStateRef.current.activeBallIdx = nextIdx;
          setActiveBallIdx(nextIdx);
        }
      }

      const activeCurve = curves[st.activeBallIdx] || curves[0];
      if (activeCurve) {
        activeCurve.getPoint(Math.min(1, ballAnimProgress), _ballPos);
        activeBallGroup.position.copy(_ballPos);
        activeBallGroup.rotation.x += dt * 8;
        activeBallGroup.rotation.y += dt * 6;
      }

      // Smooth Exponential Camera Damping across Camera Presets
      if (st.cameraPreset === 'broadcast') {
        _targetCamPos.set(Math.sin(elapsed * 0.18) * 18, 22, 46);
        _targetLookAt.set(0, 1.5, 0);
      } else if (st.cameraPreset === 'stumpCam') {
        _targetCamPos.set(0, 2.3, 12.2);
        _targetLookAt.set(0, 1.2, -12);
      } else if (st.cameraPreset === 'aerial') {
        _targetCamPos.set(0, 62, 4);
        _targetLookAt.set(0, 0, 0);
      } else {
        _targetCamPos.set(-36, 14, 6);
        _targetLookAt.set(0, 1.5, 0);
      }

      const dampFactor = 1 - Math.exp(-4.2 * dt);
      camera.position.lerp(_targetCamPos, dampFactor);
      _currentLookAt.lerp(_targetLookAt, dampFactor);
      camera.lookAt(_currentLookAt);

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 960;
      const h = container.clientHeight || 540;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      turfTex.dispose();
      pitchTex.dispose();
      contactShadowTex.dispose();
      renderer.dispose();
    };
  }, [isBatter, player.playerId]);

  // Trigger resize when toggling fullscreen
  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 60);
    return () => clearTimeout(timer);
  }, [isFullscreen]);

  const activeTrajectory = trajectories[activeBallIdx] || trajectories[0];

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 h-screen w-screen bg-[#070B14] overflow-hidden'
          : 'relative w-full h-[540px] sm:h-[600px] rounded-3xl border border-[#EA1A85]/40 bg-[#070B14] overflow-hidden shadow-xl'
      }
    >
      {/* Dedicated Isolated WebGL Canvas Mount Container */}
      <div ref={canvasMountRef} className="h-full w-full" />

      {/* Minimal Top-Left Spec Badge (Zero Center Viewport Occlusion, Static Typography) */}
      <div className="pointer-events-none absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2">
        <div className="rounded-xl border border-[#EA1A85]/50 bg-[#090D16]/90 px-3.5 py-2">
          <div className="flex items-center gap-2">
            <Box className="h-4 w-4 text-[#D4AF37]" />
            <span className="font-mono text-[10px] font-extrabold uppercase tracking-widest text-[#D4AF37]">
              3D STADIUM & PRESSURE TRAJECTORY ARENA
            </span>
          </div>
          <p className="font-condensed text-lg font-black uppercase text-white mt-0.5">
            {player.name} · {activeTrajectory?.label}
          </p>
        </div>
      </div>

      {/* Unified Collapsible Bottom Control Dock (<= 15% Viewport Footprint, Solid rgba Surface) */}
      <div
        className="  absolute bottom-4 left-1/2 z-20 -translate-x-1/2 w-[94%] max-w-[920px] transition-transform duration-300"
        style={{
          transform: isDockCollapsed
            ? 'translate(-50%, calc(100% - 34px))'
            : 'translate(-50%, 0)',
        }}
      >
        {/* Collapse / Expand Tab Handle */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setIsDockCollapsed((p) => !p)}
            className="inline-flex items-center gap-1.5 rounded-t-xl border border-b-0 border-[#D4AF37]/40 bg-[#0D1322] px-4 py-1.5 font-mono text-[10px] font-extrabold uppercase tracking-wider text-[#D4AF37] hover:text-white cursor-pointer"
          >
            {isDockCollapsed ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                <span>Show 3D Controls</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                <span>Hide Controls (Zen Mode)</span>
              </>
            )}
          </button>
        </div>

        {/* Bottom Control Bar Body */}
        <div className="rounded-2xl border border-white/15 bg-[#0D1322]/95 px-4 py-3 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Play/Pause & Ball Selector */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#EA1A85] px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-[#d41577] cursor-pointer"
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                <span>{isPlaying ? 'Pause' : 'Play 3D'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveBallIdx((prev) => (prev + 1) % trajectories.length)}
                className="inline-flex items-center gap-1 rounded-xl border border-white/15 bg-[#131A2E] px-3 py-1.5 font-mono text-xs font-bold text-[#D4AF37] hover:text-white cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>
                  Ball #{activeBallIdx + 1}/{trajectories.length}
                </span>
              </button>
            </div>

            {/* Camera Viewpoint Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[10px] font-bold uppercase text-slate-400 mr-1 hidden sm:inline-flex items-center gap-1">
                <Camera className="h-3 w-3 text-[#EA1A85]" />
                Camera:
              </span>
              {(
                [
                  { id: 'broadcast', label: 'Broadcast Orbit' },
                  { id: 'stumpCam', label: 'Stump Cam' },
                  { id: 'aerial', label: 'Aerial Drone' },
                  { id: 'sideAngle', label: 'Side Crease' },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setCameraPreset(preset.id)}
                  className={`rounded-lg px-2.5 py-1 font-mono text-[11px] font-bold transition-colors cursor-pointer ${
                    cameraPreset === preset.id
                      ? 'bg-[#D4AF37] text-[#090D16]'
                      : 'bg-[#131A2E] text-slate-300 hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* 3D Heat Zone Toggle & Fullscreen Cinema Toggle */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowHeatZone3D((p) => !p)}
                className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 font-mono text-[11px] font-bold cursor-pointer ${
                  showHeatZone3D
                    ? 'border-[#D4AF37] bg-[#D4AF37]/20 text-[#D4AF37]'
                    : 'border-white/15 bg-[#131A2E] text-slate-400'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>3D Gold Heat: {showHeatZone3D ? 'ON' : 'OFF'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFullscreen((f) => !f)}
                className="inline-flex items-center gap-1 rounded-xl border border-white/15 bg-[#131A2E] px-3 py-1.5 font-mono text-[11px] font-bold text-white hover:border-[#EA1A85] cursor-pointer"
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="h-3.5 w-3.5 text-[#EA1A85]" />
                    <span>Exit Fullscreen</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-3.5 w-3.5 text-[#D4AF37]" />
                    <span>100vw Fullscreen</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
