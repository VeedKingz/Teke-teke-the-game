/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { getTekeFaceTexture } from './textures';
import { TekeState } from './types';
import { gameAudio } from './audio';
import { checkCollision } from './world';

// Pre-allocated module-scoped math helpers for Zero-GC enemy AI updates on mobile
const _teke_dir = new THREE.Vector3();
const _teke_nextPos = new THREE.Vector3();
const _teke_slideX = new THREE.Vector3();
const _teke_slideZ = new THREE.Vector3();
const _teke_from = new THREE.Vector3();
const _teke_to = new THREE.Vector3();
const _teke_rayDir = new THREE.Vector3();
const _teke_ray = new THREE.Ray();
const _teke_hit = new THREE.Vector3();

export class TekeTekeEntity {
  public mesh: THREE.Group;
  public state: TekeState = 'DORMANT';
  public position: THREE.Vector3 = new THREE.Vector3(0, 0, -10);
  
  // Model parts for procedural crawling animation
  private torso: THREE.Mesh;
  private head: THREE.Group;
  private leftUpperArm: THREE.Mesh;
  private leftForearm: THREE.Mesh;
  private rightUpperArm: THREE.Mesh;
  private rightForearm: THREE.Mesh;
  private scythe: THREE.Mesh;

  // Animation cycle
  private crawlCycle: number = 0;
  private crawlSpeed: number = 0;

  // AI navigation & tracking
  public targetPos: THREE.Vector3 = new THREE.Vector3();
  public lastKnownPlayerPos: THREE.Vector3 = new THREE.Vector3();
  public hasLineOfSight: boolean = false;
  private searchTimer: number = 0;
  private blockedTimer: number = 0;
  private stateTimer: number = 0;

  // Tunable speeds
  private readonly STALK_SPEED = 2.4;
  private readonly CHASE_SPEED = 5.6;
  private readonly INVESTIGATE_SPEED = 2.8;

  constructor(scene: THREE.Scene) {
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    // 1. Pale Gaunt Torso (severed at waist)
    const paleSkinMat = new THREE.MeshStandardMaterial({
      color: 0xb5bcb2,
      roughness: 0.8,
      metalness: 0.1,
    });

    const tornClothMat = new THREE.MeshStandardMaterial({
      color: 0x1a181c,
      roughness: 0.95,
      metalness: 0.05,
    });

    const torsoGeo = new THREE.CylinderGeometry(0.35, 0.28, 0.85, 8);
    this.torso = new THREE.Mesh(torsoGeo, tornClothMat);
    this.torso.position.y = 0.55;
    this.torso.rotation.x = 0.45; // Hunched forward low to ground
    this.mesh.add(this.torso);

    // Severed waist ragged gore mesh
    const severedWaist = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.26, 0.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x420909, roughness: 0.6 })
    );
    severedWaist.position.y = -0.4;
    this.torso.add(severedWaist);

    // 2. Head with matted black hair and horrific face
    this.head = new THREE.Group();
    this.head.position.set(0, 0.48, 0.15);

    const faceMat = new THREE.MeshBasicMaterial({ map: getTekeFaceTexture() });
    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.48, 0.42), faceMat);
    this.head.add(headMesh);

    // Matted long black hair hanging down
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.9 });
    const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.7, 0.2), hairMat);
    hairBack.position.set(0, -0.15, -0.18);
    this.head.add(hairBack);

    const hairSideL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.65, 0.42), hairMat);
    hairSideL.position.set(-0.24, -0.12, 0);
    this.head.add(hairSideL);

    const hairSideR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.65, 0.42), hairMat);
    hairSideR.position.set(0.24, -0.12, 0);
    this.head.add(hairSideR);

    this.torso.add(this.head);

    // 3. Elongated Crawling Arms
    const armGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.65, 6);
    const forearmGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.7, 6);

    // Left Arm
    this.leftUpperArm = new THREE.Mesh(armGeo, paleSkinMat);
    this.leftUpperArm.position.set(-0.45, 0.2, 0);
    this.torso.add(this.leftUpperArm);

    this.leftForearm = new THREE.Mesh(forearmGeo, paleSkinMat);
    this.leftForearm.position.set(0, -0.6, 0.15);
    this.leftUpperArm.add(this.leftForearm);

    // Right Arm (Clutches rusted iron sickle)
    this.rightUpperArm = new THREE.Mesh(armGeo, paleSkinMat);
    this.rightUpperArm.position.set(0.45, 0.2, 0);
    this.torso.add(this.rightUpperArm);

    this.rightForearm = new THREE.Mesh(forearmGeo, paleSkinMat);
    this.rightForearm.position.set(0, -0.6, 0.15);
    this.rightUpperArm.add(this.rightForearm);

    // 4. Rusted Sickle / Iron Scythe
    const scytheBlade = new THREE.Mesh(
      new THREE.TorusGeometry(0.25, 0.04, 4, 12, Math.PI * 0.8),
      new THREE.MeshStandardMaterial({ color: 0x4a4440, metalness: 0.9, roughness: 0.3 })
    );
    scytheBlade.position.set(0.1, -0.38, 0.25);
    scytheBlade.rotation.x = Math.PI / 2;
    this.scythe = scytheBlade;
    this.rightForearm.add(this.scythe);

    // Hide initially until active
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  // Wake entity after opening cinematic / trigger
  public activate(spawnPos: THREE.Vector3) {
    this.position.copy(spawnPos);
    this.mesh.position.copy(spawnPos);
    this.mesh.visible = true;
    this.state = 'LISTENING';
    this.stateTimer = 0;
    gameAudio.startTekeScraping();
  }

  // Main update loop
  public update(
    dt: number,
    playerPos: THREE.Vector3,
    isPlayerRunning: boolean,
    isPlayerElevated: boolean,
    colliders: THREE.Box3[],
    raycaster: THREE.Raycaster,
    worldScene: THREE.Scene
  ): { caughtPlayer: boolean } {
    if (this.state === 'DORMANT') {
      return { caughtPlayer: false };
    }

    this.stateTimer += dt;
    const distanceToPlayer = this.position.distanceTo(playerPos);

    // 1. Check Line-Of-Sight to player
    this.checkLineOfSight(playerPos, colliders);

    // 2. Audio Spatial Update
    gameAudio.updateTekePosition(
      this.position,
      this.state === 'CHASE',
      distanceToPlayer
    );

    // 3. State Machine Transitions
    let moveSpeed = 0;

    // Check if player climbed to safety (Zone C container tops or Zone E gantry)
    if (isPlayerElevated) {
      if (this.state !== 'BLOCKED_BY_HEIGHT') {
        this.state = 'BLOCKED_BY_HEIGHT';
        this.blockedTimer = 0;
      }
    } else if (this.state === 'BLOCKED_BY_HEIGHT') {
      // Player dropped back down! Resume pursuit!
      this.state = 'CHASE';
    }

    switch (this.state) {
      case 'LISTENING':
      case 'INVESTIGATING': {
        // If entity sees player directly
        if (this.hasLineOfSight && distanceToPlayer < 24) {
          this.state = 'CHASE';
          gameAudio.playHorrorSting();
          break;
        }

        // If player is running nearby, Teke Teke investigates noise
        const hearingRadius = isPlayerRunning ? 28 : 12;
        if (distanceToPlayer < hearingRadius) {
          this.lastKnownPlayerPos.copy(playerPos);
          this.state = 'INVESTIGATING';
        }

        if (this.state === 'INVESTIGATING') {
          this.targetPos.copy(this.lastKnownPlayerPos);
          moveSpeed = this.INVESTIGATE_SPEED;
          if (this.position.distanceTo(this.lastKnownPlayerPos) < 2.0) {
            this.state = 'SEARCHING';
            this.searchTimer = 0;
          }
        }
        break;
      }

      case 'STALKING': {
        if (this.hasLineOfSight) {
          this.state = 'CHASE';
          break;
        }
        // Slowly creep towards last known position
        this.targetPos.copy(this.lastKnownPlayerPos);
        moveSpeed = this.STALK_SPEED;
        if (this.stateTimer > 8.0) {
          this.state = 'INVESTIGATING';
          this.stateTimer = 0;
        }
        break;
      }

      case 'CHASE': {
        if (this.hasLineOfSight) {
          this.lastKnownPlayerPos.copy(playerPos);
          this.targetPos.copy(playerPos);
          moveSpeed = this.CHASE_SPEED;
        } else {
          // Lost sight! Run to last known position
          this.targetPos.copy(this.lastKnownPlayerPos);
          moveSpeed = this.CHASE_SPEED;
          if (this.position.distanceTo(this.lastKnownPlayerPos) < 1.5) {
            this.state = 'SEARCHING';
            this.searchTimer = 0;
          }
        }
        break;
      }

      case 'SEARCHING': {
        this.searchTimer += dt;
        moveSpeed = this.STALK_SPEED * 0.7;
        // Wander around last known area
        const wanderAngle = this.searchTimer * 1.5;
        this.targetPos.set(
          this.lastKnownPlayerPos.x + Math.sin(wanderAngle) * 4.0,
          0,
          this.lastKnownPlayerPos.z + Math.cos(wanderAngle) * 4.0
        );

        if (this.hasLineOfSight && distanceToPlayer < 20) {
          this.state = 'CHASE';
          break;
        }

        if (this.searchTimer > 7.0) {
          this.state = 'STALKING';
          this.stateTimer = 0;
        }
        break;
      }

      case 'BLOCKED_BY_HEIGHT': {
        this.blockedTimer += dt;
        // Move to ground position directly beneath player, circling angrily!
        const circleAngle = this.blockedTimer * 1.2;
        this.targetPos.set(
          playerPos.x + Math.sin(circleAngle) * 3.5,
          0,
          playerPos.z + Math.cos(circleAngle) * 3.5
        );
        moveSpeed = this.INVESTIGATE_SPEED;

        // Head looks up menacingly at player
        this.head.rotation.x = -0.7;
        break;
      }

      case 'CAPTURE': {
        // Player caught!
        return { caughtPlayer: true };
      }
    }

    // 4. Movement Navigation & Collision Avoidance (Zero-GC)
    if (moveSpeed > 0) {
      _teke_dir.subVectors(this.targetPos, this.position);
      _teke_dir.y = 0;
      const dist = _teke_dir.length();

      if (dist > 0.4) {
        _teke_dir.normalize();

        // Calculate next candidate position without allocating
        _teke_nextPos.copy(this.position).addScaledVector(_teke_dir, moveSpeed * dt);
        _teke_nextPos.y = 0;

        // Obstacle avoidance against yard colliders
        if (!checkCollision(_teke_nextPos, 0.6, colliders, 1.2)) {
          this.position.copy(_teke_nextPos);
        } else {
          // Slide along wall/container
          _teke_slideX.copy(this.position);
          _teke_slideX.x += _teke_dir.x * moveSpeed * dt;

          _teke_slideZ.copy(this.position);
          _teke_slideZ.z += _teke_dir.z * moveSpeed * dt;

          if (!checkCollision(_teke_slideX, 0.6, colliders, 1.2)) {
            this.position.copy(_teke_slideX);
          } else if (!checkCollision(_teke_slideZ, 0.6, colliders, 1.2)) {
            this.position.copy(_teke_slideZ);
          }
        }

        // Face movement direction
        const angle = Math.atan2(_teke_dir.x, _teke_dir.z);
        this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, angle, dt * 10);
      }
    }

    this.mesh.position.copy(this.position);

    // 5. Procedural Crawling Drag Animation
    this.animateCrawling(dt, moveSpeed);

    // 6. Check capture distance (if not elevated and within 1.4m)
    if (!isPlayerElevated && distanceToPlayer < 1.45 && this.state === 'CHASE') {
      this.state = 'CAPTURE';
      return { caughtPlayer: true };
    }

    return { caughtPlayer: false };
  }

  // Check Line-of-sight using 3D raycasting through colliders (Zero-GC)
  private checkLineOfSight(playerPos: THREE.Vector3, colliders: THREE.Box3[]) {
    _teke_from.copy(this.position);
    _teke_from.y += 0.6;

    _teke_to.copy(playerPos);
    _teke_to.y += 1.2;

    _teke_rayDir.subVectors(_teke_to, _teke_from).normalize();
    _teke_ray.set(_teke_from, _teke_rayDir);
    const targetDist = _teke_from.distanceTo(_teke_to);

    let hitObstacle = false;
    for (let i = 0; i < colliders.length; i++) {
      const box = colliders[i];
      const hit = _teke_ray.intersectBox(box, _teke_hit);
      if (hit && _teke_from.distanceTo(hit) < targetDist - 0.2) {
        hitObstacle = true;
        break;
      }
    }
    this.hasLineOfSight = !hitObstacle;
  }

  // Procedural crawling animation: rapid alternating arm pull and torso drag
  private animateCrawling(dt: number, speed: number) {
    if (speed <= 0) {
      // Idle breathing
      const idleTime = Date.now() * 0.003;
      this.torso.position.y = 0.55 + Math.sin(idleTime) * 0.03;
      this.head.rotation.y = Math.sin(idleTime * 0.8) * 0.2;
      return;
    }

    const animRate = speed * 4.2;
    this.crawlCycle += dt * animRate;

    // Torso drags low, lurching forward on each pull
    const dragBob = Math.abs(Math.sin(this.crawlCycle));
    this.torso.position.y = 0.45 + dragBob * 0.12;
    this.torso.rotation.x = 0.45 + Math.sin(this.crawlCycle) * 0.1;

    // Alternating arm crawl cycle
    const leftArmPhase = Math.sin(this.crawlCycle);
    const rightArmPhase = -Math.sin(this.crawlCycle);

    this.leftUpperArm.rotation.x = -leftArmPhase * 0.9;
    this.leftForearm.rotation.x = Math.max(0, leftArmPhase * 1.1);

    this.rightUpperArm.rotation.x = -rightArmPhase * 0.9;
    this.rightForearm.rotation.x = Math.max(0, rightArmPhase * 1.1);

    // Sickle scrape tilt
    this.scythe.rotation.z = Math.sin(this.crawlCycle * 2) * 0.3;
  }
}
