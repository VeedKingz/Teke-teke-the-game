/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { 
  getConcreteTexture, 
  getContainerTexture, 
  getRailTrackTexture, 
  getHazardStripeTexture, 
  getCRTMonitorTexture,
  getElectricalPanelTexture 
} from './textures';
import { InteractionTarget } from './types';

export interface ElevatedSurface {
  box: THREE.Box3;
  height: number;
}

export interface WorldData {
  scene: THREE.Scene;
  colliders: THREE.Box3[];
  elevatedSurfaces: ElevatedSurface[];
  interactables: InteractionTarget[];
  fuseObjects: Map<string, THREE.Object3D>;
  substationPanel: THREE.Mesh;
  exitGateObject: THREE.Group;
  breakerLever: THREE.Mesh;
  flickerLights: THREE.PointLight[];
  securityDoor: THREE.Object3D;
  crtMesh: THREE.Mesh;
  emergencySirens: THREE.PointLight[];
}

export function buildRailwayYard(scene: THREE.Scene): WorldData {
  const colliders: THREE.Box3[] = [];
  const elevatedSurfaces: ElevatedSurface[] = [];
  const interactables: InteractionTarget[] = [];
  const fuseObjects = new Map<string, THREE.Object3D>();
  const flickerLights: THREE.PointLight[] = [];
  const emergencySirens: THREE.PointLight[] = [];

  // Shared materials
  const concreteTex = getConcreteTexture();
  concreteTex.repeat.set(12, 12);
  const concreteMat = new THREE.MeshStandardMaterial({
    map: concreteTex,
    roughness: 0.9,
    metalness: 0.1,
  });

  const railTex = getRailTrackTexture();
  railTex.repeat.set(1, 16);
  const trackMat = new THREE.MeshStandardMaterial({
    map: railTex,
    roughness: 0.7,
    metalness: 0.4,
  });

  const redContainerMat = new THREE.MeshStandardMaterial({
    map: getContainerTexture('#5c1e19', 0.6),
    roughness: 0.7,
    metalness: 0.3,
  });
  const blueContainerMat = new THREE.MeshStandardMaterial({
    map: getContainerTexture('#19324d', 0.5),
    roughness: 0.7,
    metalness: 0.3,
  });
  const greenContainerMat = new THREE.MeshStandardMaterial({
    map: getContainerTexture('#203b29', 0.5),
    roughness: 0.7,
    metalness: 0.3,
  });

  const hazardMat = new THREE.MeshStandardMaterial({
    map: getHazardStripeTexture(),
    roughness: 0.6,
    metalness: 0.2,
  });

  const darkWoodMat = new THREE.MeshStandardMaterial({
    color: 0x3d281a,
    roughness: 0.9,
    metalness: 0.05,
  });

  const rustMetalMat = new THREE.MeshStandardMaterial({
    color: 0x3a3028,
    roughness: 0.8,
    metalness: 0.6,
  });

  // Helper to add box collider
  function addCollider(minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number) {
    const box = new THREE.Box3(
      new THREE.Vector3(minX, minY, minZ),
      new THREE.Vector3(maxX, maxY, maxZ)
    );
    colliders.push(box);
    return box;
  }

  // Helper to register elevated platform where player can stand and be safe
  function addElevatedPlatform(minX: number, minZ: number, maxX: number, maxZ: number, height: number) {
    const box = new THREE.Box3(
      new THREE.Vector3(minX, height - 0.5, minZ),
      new THREE.Vector3(maxX, height + 1.5, maxZ)
    );
    elevatedSurfaces.push({ box, height });
  }

  // ==========================================
  // 1. GROUND & PERIMETER BOUNDARIES
  // ==========================================
  // Yard Ground plane
  const groundGeo = new THREE.PlaneGeometry(160, 160);
  const groundMesh = new THREE.Mesh(groundGeo, concreteMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.y = 0;
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  // Perimeter high security wall/fence (X: -60 to +60, Z: -60 to +60)
  const wallGeoZ = new THREE.BoxGeometry(2, 6, 120);
  const wallGeoX = new THREE.BoxGeometry(120, 6, 2);
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x222426,
    roughness: 0.85,
    metalness: 0.3,
  });

  // West Wall
  const wallW = new THREE.Mesh(wallGeoZ, wallMat);
  wallW.position.set(-60, 3, 0);
  scene.add(wallW);
  addCollider(-61, 0, -60, -59, 10, 60);

  // East Wall
  const wallE = new THREE.Mesh(wallGeoZ, wallMat);
  wallE.position.set(60, 3, 0);
  scene.add(wallE);
  addCollider(59, 0, -60, 61, 10, 60);

  // South Wall (Behind security office)
  const wallS = new THREE.Mesh(wallGeoX, wallMat);
  wallS.position.set(0, 3, 60);
  scene.add(wallS);
  addCollider(-60, 0, 59, 60, 10, 61);

  // North Wall (Containing Final Exit Gate at X=0, Z=-60)
  const wallN1 = new THREE.Mesh(new THREE.BoxGeometry(54, 6, 2), wallMat);
  wallN1.position.set(-33, 3, -60);
  scene.add(wallN1);
  addCollider(-60, 0, -61, -6, 10, -59);

  const wallN2 = new THREE.Mesh(new THREE.BoxGeometry(54, 6, 2), wallMat);
  wallN2.position.set(33, 3, -60);
  scene.add(wallN2);
  addCollider(6, 0, -61, 60, 10, -59);

  // ==========================================
  // 2. ZONE A: SECURITY OFFICE (Spawn Area)
  // Position: Center-South around (X: 0, Z: 48)
  // ==========================================
  const officeGroup = new THREE.Group();
  officeGroup.position.set(0, 0, 48);

  // Office Walls (width: 10, length: 8, height: 3.5)
  // Back Wall (Z: +4)
  const offBack = new THREE.Mesh(new THREE.BoxGeometry(10, 3.5, 0.4), concreteMat);
  offBack.position.set(0, 1.75, 4);
  officeGroup.add(offBack);
  addCollider(-5, 0, 51.8, 5, 4, 52.2);

  // Left Wall (X: -5)
  const offLeft = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.5, 8), concreteMat);
  offLeft.position.set(-5, 1.75, 0);
  officeGroup.add(offLeft);
  addCollider(-5.2, 0, 44, -4.8, 4, 52);

  // Right Wall (X: +5)
  const offRight = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.5, 8), concreteMat);
  offRight.position.set(5, 1.75, 0);
  officeGroup.add(offRight);
  addCollider(4.8, 0, 44, 5.2, 4, 52);

  // Front Wall with Doorway and Window looking onto yard
  const offFrontLeft = new THREE.Mesh(new THREE.BoxGeometry(3.5, 3.5, 0.4), concreteMat);
  offFrontLeft.position.set(-3.25, 1.75, -4);
  officeGroup.add(offFrontLeft);
  addCollider(-5, 0, 43.8, -1.5, 4, 44.2);

  const offFrontRight = new THREE.Mesh(new THREE.BoxGeometry(3.5, 3.5, 0.4), concreteMat);
  offFrontRight.position.set(3.25, 1.75, -4);
  officeGroup.add(offFrontRight);
  addCollider(1.5, 0, 43.8, 5, 4, 44.2);

  // Lintel above door
  const offLintel = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 0.4), concreteMat);
  offLintel.position.set(0, 3.0, -4);
  officeGroup.add(offLintel);

  // Office Roof
  const offRoof = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.3, 8.4), concreteMat);
  offRoof.position.set(0, 3.65, 0);
  officeGroup.add(offRoof);

  // Metal Door (swings open or is unlocked)
  const securityDoor = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 2.5, 0.15),
    new THREE.MeshStandardMaterial({ color: 0x3a3f45, metalness: 0.6, roughness: 0.5 })
  );
  securityDoor.position.set(0, 1.25, -4);
  officeGroup.add(securityDoor);

  // Office Desk & CRT Computer
  const desk = new THREE.Mesh(
    new THREE.BoxGeometry(3, 0.9, 1.4),
    darkWoodMat
  );
  desk.position.set(0, 0.45, 1.5);
  officeGroup.add(desk);
  addCollider(-1.6, 0, 48.8, 1.6, 1.2, 50.2);

  // CRT Monitor
  const crtMat = new THREE.MeshBasicMaterial({ map: getCRTMonitorTexture() });
  const crtMesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.7), crtMat);
  crtMesh.position.set(-0.6, 1.25, 1.5);
  officeGroup.add(crtMesh);

  // Filing cabinet
  const fileCab = new THREE.Mesh(new THREE.BoxGeometry(1, 2.2, 0.8), rustMetalMat);
  fileCab.position.set(3.8, 1.1, 2.8);
  officeGroup.add(fileCab);
  addCollider(3.3, 0, 50.4, 4.3, 2.2, 51.2);

  // Spare Flashlight Battery on desk
  const batteryMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.25, 8),
    new THREE.MeshStandardMaterial({ color: 0xf5a623, metalness: 0.7, roughness: 0.3 })
  );
  batteryMesh.position.set(0.6, 0.95, 1.4);
  officeGroup.add(batteryMesh);

  interactables.push({
    id: 'battery_office',
    type: 'battery',
    label: 'RESERVE BATTERY',
    prompt: 'TAKE BATTERY',
    distance: 2.8,
    position: [0.6, 0.95, 49.4],
    data: { mesh: batteryMesh },
  });

  // Office Interior Light (Fluorescent overhead)
  const officeLight = new THREE.PointLight(0xfff1cf, 1.8, 10);
  officeLight.position.set(0, 3.2, 0);
  officeGroup.add(officeLight);
  flickerLights.push(officeLight);

  scene.add(officeGroup);

  // ==========================================
  // 3. ZONE B: MAIN RAIL YARD & TRACKS
  // Position: Center area (Z: -30 to +30, X: -20 to +20)
  // ==========================================
  // Rail Tracks running north-south
  [-16, 0, 16].forEach((trackX) => {
    const trackMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 110), trackMat);
    trackMesh.rotation.x = -Math.PI / 2;
    trackMesh.position.set(trackX, 0.02, 0);
    scene.add(trackMesh);
  });

  // Abandoned Freight Boxcars (3 boxcars blocking sightlines & creating mazes)
  function createFreightCar(x: number, z: number, rotationY: number = 0) {
    const carGroup = new THREE.Group();
    carGroup.position.set(x, 0, z);
    carGroup.rotation.y = rotationY;

    // Body (W: 3.4, H: 3.8, L: 14)
    const bodyMesh = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 3.4, 14),
      new THREE.MeshStandardMaterial({
        map: getContainerTexture('#4a2820', 0.75),
        roughness: 0.85,
        metalness: 0.3,
      })
    );
    bodyMesh.position.y = 2.2;
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    carGroup.add(bodyMesh);

    // Steel Wheels / Bogies
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1f1f22, roughness: 0.9 });
    [-4.5, 4.5].forEach((wz) => {
      const bogie = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.7, 3), wheelMat);
      bogie.position.set(0, 0.35, wz);
      carGroup.add(bogie);
    });

    scene.add(carGroup);

    // Add box collider
    const halfW = 1.8;
    const halfL = 7.2;
    addCollider(x - halfW, 0, z - halfL, x + halfW, 4.5, z + halfL);
  }

  // Boxcar 1 on Center Track (closer to office)
  createFreightCar(0, 20);
  // Boxcar 2 on West Track
  createFreightCar(-16, -2);
  // Boxcar 3 on East Track
  createFreightCar(16, 8);

  // Utility Poles with faint halogen floodlights
  [
    { x: -28, z: 25 },
    { x: 28, z: 25 },
    { x: -28, z: -25 },
    { x: 28, z: -25 },
  ].forEach((polePos) => {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.25, 9, 8),
      rustMetalMat
    );
    pole.position.set(polePos.x, 4.5, polePos.z);
    scene.add(pole);
    addCollider(polePos.x - 0.4, 0, polePos.z - 0.4, polePos.x + 0.4, 9, polePos.z + 0.4);

    // Lamp fixture
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.8), hazardMat);
    lamp.position.set(polePos.x, 8.8, polePos.z);
    scene.add(lamp);

    // Faint dim amber yard light (flickering in blackout)
    const pLight = new THREE.PointLight(0xffaa44, 0.45, 18);
    pLight.position.set(polePos.x, 8.5, polePos.z);
    scene.add(pLight);
    flickerLights.push(pLight);
  });

  // ==========================================
  // 4. ZONE C: SHIPPING-CONTAINER MAZE (West side, X: -48 to -24, Z: -20 to +20)
  // Teach vertical survival! Teke Teke CANNOT climb elevated containers!
  // ==========================================
  const containerW = 3.0;
  const containerH = 2.8;
  const containerL = 8.0;

  function placeContainer(x: number, y: number, z: number, mat: THREE.Material, rotY: number = 0) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(containerW, containerH, containerL),
      mat
    );
    mesh.position.set(x, y + containerH / 2, z);
    mesh.rotation.y = rotY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const isRot = Math.abs(rotY) > 0.1;
    const w = isRot ? containerL : containerW;
    const l = isRot ? containerW : containerL;

    // Collider
    addCollider(x - w / 2, y, z - l / 2, x + w / 2, y + containerH, z + l / 2);

    // If container is at base (y=0) and has room on top, register as elevated surface
    addElevatedPlatform(x - w / 2, z - l / 2, x + w / 2, z + l / 2, y + containerH);

    return mesh;
  }

  // Lower tier containers
  placeContainer(-35, 0, 5, redContainerMat);
  placeContainer(-35, 0, -12, blueContainerMat);
  placeContainer(-44, 0, -3, greenContainerMat);
  placeContainer(-44, 0, 14, redContainerMat);
  placeContainer(-28, 0, 18, blueContainerMat, Math.PI / 2);
  placeContainer(-28, 0, -18, redContainerMat, Math.PI / 2);

  // Stacked 2nd tier container
  placeContainer(-44, containerH, -3, blueContainerMat);

  // CLIMBABLE WOODEN RAMP / LADDER PLATFORM leading up onto container (-35, 0, 5)
  // Ramp from ground Y=0 to Y=2.8 at Z=10
  const rampGeo = new THREE.BoxGeometry(2.4, 0.3, 6);
  const rampMesh = new THREE.Mesh(rampGeo, darkWoodMat);
  rampMesh.position.set(-35, 1.4, 11);
  rampMesh.rotation.x = 0.47; // inclined angle up to container
  scene.add(rampMesh);

  // Register ramp surface for player climbing
  addElevatedPlatform(-36.5, 8, -33.5, 14, 1.5);

  // Fuse C hidden at the end of the narrow container alley in an open electrical junction box!
  const fuseCJunction = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 1.0, 0.4),
    hazardMat
  );
  fuseCJunction.position.set(-48, 1.2, 5);
  scene.add(fuseCJunction);

  // Fuse C Pickup Object
  const fuseCGlower = new THREE.PointLight(0xffdd44, 0.6, 3);
  fuseCGlower.position.set(-48, 1.2, 5.3);
  scene.add(fuseCGlower);

  const fuseCMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.35, 8),
    new THREE.MeshStandardMaterial({
      color: 0xffcc33,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0xaa7711,
      emissiveIntensity: 0.4,
    })
  );
  fuseCMesh.rotation.z = Math.PI / 2;
  fuseCMesh.position.set(-48, 1.2, 5.3);
  scene.add(fuseCMesh);
  fuseObjects.set('fuse_c', fuseCMesh);

  interactables.push({
    id: 'fuse_c',
    type: 'fuse',
    label: 'CONTAINER SIDING FUSE (3/3)',
    prompt: 'TAKE FUSE C',
    distance: 2.8,
    position: [-48, 1.2, 5.3],
    data: { fuseId: 'fuse_c' },
  });

  // ==========================================
  // 5. ZONE D: MAINTENANCE WORKSHOP (East side, X: 36 to 52, Z: 5 to 30)
  // Houses Fuse A in industrial repair cabinet
  // ==========================================
  const workshopGroup = new THREE.Group();
  workshopGroup.position.set(44, 0, 18);

  // Workshop building shell (W: 14, L: 18, H: 5)
  // Back Wall (X: +7)
  const wsBack = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5, 18), concreteMat);
  wsBack.position.set(7, 2.5, 0);
  workshopGroup.add(wsBack);
  addCollider(50.7, 0, 9, 51.3, 6, 27);

  // North Wall (Z: -9)
  const wsNorth = new THREE.Mesh(new THREE.BoxGeometry(14, 5, 0.6), concreteMat);
  wsNorth.position.set(0, 2.5, -9);
  workshopGroup.add(wsNorth);
  addCollider(37, 0, 8.7, 51, 6, 9.3);

  // South Wall (Z: +9)
  const wsSouth = new THREE.Mesh(new THREE.BoxGeometry(14, 5, 0.6), concreteMat);
  wsSouth.position.set(0, 2.5, 9);
  workshopGroup.add(wsSouth);
  addCollider(37, 0, 26.7, 51, 6, 27.3);

  // Front Wall with open damaged roller door
  const wsFront1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5, 5), concreteMat);
  wsFront1.position.set(-7, 2.5, -6.5);
  workshopGroup.add(wsFront1);
  addCollider(36.7, 0, 9, 37.3, 6, 14);

  const wsFront2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5, 5), concreteMat);
  wsFront2.position.set(-7, 2.5, 6.5);
  workshopGroup.add(wsFront2);
  addCollider(36.7, 0, 22, 37.3, 6, 27);

  // Open doorway at X: 37, Z: 14 to 22 (entrance to workshop)

  // Workshop Roof
  const wsRoof = new THREE.Mesh(new THREE.BoxGeometry(14.6, 0.4, 18.6), concreteMat);
  wsRoof.position.set(0, 5.2, 0);
  workshopGroup.add(wsRoof);

  // Workbench along back wall
  const workbench = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 7), darkWoodMat);
  workbench.position.set(5.8, 0.55, 0);
  workshopGroup.add(workbench);
  addCollider(48.8, 0, 14.5, 50.8, 1.4, 21.5);

  // Workshop Red Emergency Light
  const wsLight = new THREE.PointLight(0xff3322, 0.8, 12);
  wsLight.position.set(0, 4.2, 0);
  workshopGroup.add(wsLight);
  flickerLights.push(wsLight);

  // Electrical Tool Cabinet holding Fuse A!
  const fuseACabinet = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 1.8, 1.2),
    new THREE.MeshStandardMaterial({
      color: 0x485548,
      metalness: 0.6,
      roughness: 0.4,
    })
  );
  fuseACabinet.position.set(5.8, 0.9, -5.5);
  workshopGroup.add(fuseACabinet);
  addCollider(49.2, 0, 11.8, 50.4, 2.0, 13.2);

  // Fuse A Mesh
  const fuseAMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.35, 8),
    new THREE.MeshStandardMaterial({
      color: 0xffcc33,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0xaa7711,
      emissiveIntensity: 0.4,
    })
  );
  fuseAMesh.rotation.z = Math.PI / 2;
  fuseAMesh.position.set(49.6, 1.3, 12.5);
  scene.add(fuseAMesh);
  fuseObjects.set('fuse_a', fuseAMesh);

  interactables.push({
    id: 'fuse_a',
    type: 'fuse',
    label: 'WORKSHOP HEAVY FUSE (1/3)',
    prompt: 'TAKE FUSE A',
    distance: 2.8,
    position: [49.6, 1.3, 12.5],
    data: { fuseId: 'fuse_a' },
  });

  // Spare battery in workshop
  const battery2 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.25, 8),
    new THREE.MeshStandardMaterial({ color: 0xf5a623, metalness: 0.7, roughness: 0.3 })
  );
  battery2.position.set(49.8, 1.15, 17.5);
  scene.add(battery2);

  interactables.push({
    id: 'battery_workshop',
    type: 'battery',
    label: 'EXTRA BATTERY',
    prompt: 'TAKE BATTERY',
    distance: 2.6,
    position: [49.8, 1.15, 17.5],
    data: { mesh: battery2 },
  });

  scene.add(workshopGroup);

  // ==========================================
  // 6. ZONE E: SIGNAL-CONTROL STATION & HIGH WALKWAY
  // Position: East side, North (X: 38, Z: -25)
  // Houses Fuse B & elevated vantage point!
  // ==========================================
  const signalTowerGroup = new THREE.Group();
  signalTowerGroup.position.set(38, 0, -25);

  // Metal Gantry Platform (Elevated at Y=3.5m, W: 6, L: 8)
  const gantryFloor = new THREE.Mesh(
    new THREE.BoxGeometry(6, 0.3, 8),
    new THREE.MeshStandardMaterial({
      color: 0x2e353b,
      metalness: 0.8,
      roughness: 0.4,
    })
  );
  gantryFloor.position.set(0, 3.5, 0);
  signalTowerGroup.add(gantryFloor);

  // Support steel pillars
  [-2.8, 2.8].forEach((px) => {
    [-3.8, 3.8].forEach((pz) => {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.5, 0.35), rustMetalMat);
      pillar.position.set(px, 1.75, pz);
      signalTowerGroup.add(pillar);
    });
  });

  // Stairs leading up to signal platform (from ground Z: -17 to Z: -21)
  const stairsMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.3, 5),
    darkWoodMat
  );
  stairsMesh.position.set(0, 1.75, 5.5);
  stairsMesh.rotation.x = -0.65; // slope up to gantry
  signalTowerGroup.add(stairsMesh);

  // Register elevated platform for safe height from Teke Teke!
  addElevatedPlatform(34, -30, 42, -20, 3.65);
  // Register stairs slope
  addElevatedPlatform(36.8, -21, 39.2, -16, 1.8);

  // Signal control console holding Fuse B!
  const signalConsole = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 1.1, 1.0),
    hazardMat
  );
  signalConsole.position.set(0, 4.2, -2.5);
  signalTowerGroup.add(signalConsole);

  // Fuse B Mesh on console
  const fuseBMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.35, 8),
    new THREE.MeshStandardMaterial({
      color: 0xffcc33,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0xaa7711,
      emissiveIntensity: 0.4,
    })
  );
  fuseBMesh.rotation.z = Math.PI / 2;
  fuseBMesh.position.set(38, 4.35, -27.5);
  scene.add(fuseBMesh);
  fuseObjects.set('fuse_b', fuseBMesh);

  interactables.push({
    id: 'fuse_b',
    type: 'fuse',
    label: 'SIGNAL STATION FUSE (2/3)',
    prompt: 'TAKE FUSE B',
    distance: 2.8,
    position: [38, 4.35, -27.5],
    data: { fuseId: 'fuse_b' },
  });

  scene.add(signalTowerGroup);

  // ==========================================
  // 7. ZONE F: ELECTRICAL SUBSTATION & FINAL EXIT GATE
  // Position: North Yard, Substation at (X: -16, Z: -48), Gate at (X: 0, Z: -60)
  // ==========================================
  // Substation Transformer Enclosure
  const subGroup = new THREE.Group();
  subGroup.position.set(-16, 0, -48);

  // Industrial Transformers
  [-2.5, 2.5].forEach((tx) => {
    const transformer = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 3.0, 2.4),
      new THREE.MeshStandardMaterial({ color: 0x252a2d, roughness: 0.8, metalness: 0.5 })
    );
    transformer.position.set(tx, 1.5, -2);
    subGroup.add(transformer);
    addCollider(-16 + tx - 1.3, 0, -51.3, -16 + tx + 1.3, 3.5, -48.7);
  });

  // Main Electrical Distribution Panel with 3 Fuse Slots
  const subPanelMat = new THREE.MeshStandardMaterial({
    map: getElectricalPanelTexture(0),
    roughness: 0.5,
    metalness: 0.4,
  });
  const substationPanel = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 2.4, 0.4),
    subPanelMat
  );
  substationPanel.position.set(0, 1.8, 1.5);
  subGroup.add(substationPanel);
  addCollider(-17.5, 0, -47, -14.5, 3.5, -46);

  // Breaker lever on side of panel
  const breakerLever = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.6, 0.2),
    new THREE.MeshStandardMaterial({ color: 0xcc2222, metalness: 0.8, roughness: 0.3 })
  );
  breakerLever.position.set(1.4, 1.8, 1.5);
  breakerLever.rotation.z = -0.5; // Off position
  subGroup.add(breakerLever);

  scene.add(subGroup);

  // Interactable: Fuse Sockets
  interactables.push({
    id: 'substation_socket',
    type: 'socket',
    label: 'SUBSTATION BREAKER BOARD',
    prompt: 'INSERT FUSES (0/3)',
    distance: 3.0,
    position: [-16, 1.8, -46.2],
  });

  // Interactable: Breaker Lever (activates once 3 fuses inserted)
  interactables.push({
    id: 'substation_breaker',
    type: 'breaker',
    label: 'MAIN POWER BREAKER',
    prompt: 'PULL BREAKER SWITCH',
    distance: 3.0,
    position: [-14.6, 1.8, -46.2],
  });

  // ------------------------------------------
  // Final Exit Gate (X: 0, Z: -60)
  // Heavy motorized steel rolling rail gate
  // ------------------------------------------
  const exitGateGroup = new THREE.Group();
  exitGateGroup.position.set(0, 0, -60);

  // Gate Gateposts (Left & Right concrete columns)
  const postL = new THREE.Mesh(new THREE.BoxGeometry(2, 6, 2), concreteMat);
  postL.position.set(-6, 3, 0);
  exitGateGroup.add(postL);

  const postR = new THREE.Mesh(new THREE.BoxGeometry(2, 6, 2), concreteMat);
  postR.position.set(6, 3, 0);
  exitGateGroup.add(postR);

  // Gate overhead girder with "YARD EXIT 04" sign
  const overhead = new THREE.Mesh(new THREE.BoxGeometry(14, 1.2, 1.8), hazardMat);
  overhead.position.set(0, 5.5, 0);
  exitGateGroup.add(overhead);

  // Sliding Heavy Steel Gate Doors (Initially closed, blocks X: -5 to +5)
  const gateDoorGeo = new THREE.BoxGeometry(10, 4.8, 0.4);
  const gateDoorMat = new THREE.MeshStandardMaterial({
    color: 0x2d3238,
    metalness: 0.8,
    roughness: 0.4,
  });
  const gateDoorMesh = new THREE.Mesh(gateDoorGeo, gateDoorMat);
  gateDoorMesh.position.set(0, 2.4, 0);
  exitGateGroup.add(gateDoorMesh);

  // Gate Collider
  const gateCollider = addCollider(-5.5, 0, -61, 5.5, 6, -59);

  // Gate Emergency Siren Strobe
  const gateSiren = new THREE.PointLight(0xff1111, 0, 16);
  gateSiren.position.set(0, 5.0, -1);
  exitGateGroup.add(gateSiren);
  emergencySirens.push(gateSiren);

  // Gate Control Terminal Console (on right post)
  const gateConsole = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 1.2, 0.6),
    hazardMat
  );
  gateConsole.position.set(5.2, 1.4, 1.2);
  exitGateGroup.add(gateConsole);

  interactables.push({
    id: 'exit_gate_console',
    type: 'gate',
    label: 'RAIL EXIT GATE CONSOLE',
    prompt: 'OPEN EXIT GATE',
    distance: 3.2,
    position: [5.2, 1.4, -58.8],
    data: { gateDoor: gateDoorMesh, gateCollider },
  });

  // Freeze matrix computations on static world geometry to boost mobile CPU performance
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj !== substationPanel && obj !== breakerLever && obj !== securityDoor) {
      obj.matrixAutoUpdate = false;
      obj.updateMatrix();
    }
  });

  return {
    scene,
    colliders,
    elevatedSurfaces,
    interactables,
    fuseObjects,
    substationPanel,
    exitGateObject: exitGateGroup,
    breakerLever,
    flickerLights,
    securityDoor,
    crtMesh,
    emergencySirens,
  };
}

// Floor height query (returns ground Y=0, or elevated platform height)
export function getFloorHeightAt(x: number, z: number, currentY: number, elevatedSurfaces: ElevatedSurface[]): number {
  for (const s of elevatedSurfaces) {
    if (
      x >= s.box.min.x &&
      x <= s.box.max.x &&
      z >= s.box.min.z &&
      z <= s.box.max.z
    ) {
      // If player is reasonably close to platform height, stay on it
      if (currentY >= s.height - 0.7) {
        return s.height;
      }
    }
  }
  return 0; // Default ground level
}

// Bounding box collision test for player / entity
export function checkCollision(newPos: THREE.Vector3, radius: number, colliders: THREE.Box3[], height: number = 1.8): boolean {
  const minX = newPos.x - radius;
  const maxX = newPos.x + radius;
  const minZ = newPos.z - radius;
  const maxZ = newPos.z + radius;
  const minY = newPos.y;
  const maxY = newPos.y + height;

  for (const box of colliders) {
    if (
      maxX > box.min.x &&
      minX < box.max.x &&
      maxZ > box.min.z &&
      minZ < box.max.z &&
      maxY > box.min.y &&
      minY < box.max.y
    ) {
      return true;
    }
  }
  return false;
}
