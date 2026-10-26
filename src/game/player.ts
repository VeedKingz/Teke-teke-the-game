/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { gameAudio } from './audio';
import { ElevatedSurface, getFloorHeightAt, checkCollision } from './world';
import { InteractionTarget, PlayerStats } from './types';

// Pre-allocated module-scoped math helpers for Zero-GC frame updates on mobile
const _p_upAxis = new THREE.Vector3(0, 1, 0);
const _p_forward = new THREE.Vector3();
const _p_right = new THREE.Vector3();
const _p_move = new THREE.Vector3();
const _p_candidate = new THREE.Vector3();
const _p_slideX = new THREE.Vector3();
const _p_slideZ = new THREE.Vector3();
const _p_forwardDir = new THREE.Vector3();
const _p_camDir = new THREE.Vector3();
const _p_itemPos = new THREE.Vector3();
const _p_toItem = new THREE.Vector3();

export class PlayerController {
  public camera: THREE.PerspectiveCamera;
  public position: THREE.Vector3 = new THREE.Vector3(0, 1.7, 48); // Spawn in Security Office
  public rotation: THREE.Euler = new THREE.Euler(0, 0, 0, 'YXZ');

  // Input states
  public moveForward: number = 0; // -1 to 1
  public moveRight: number = 0;   // -1 to 1
  public isSprinting: boolean = false;
  public lookDeltaX: number = 0;
  public lookDeltaY: number = 0;

  // Flashlight & Battery
  public isFlashlightOn: boolean = true;
  public flashlight: THREE.SpotLight;
  public flashlightTarget: THREE.Object3D;
  public battery: number = 100;
  public readonly MAX_BATTERY = 100;

  // Stats
  public health: number = 100;
  public readonly MAX_HEALTH = 100;
  public stamina: number = 100;
  public readonly MAX_STAMINA = 100;

  // Inventory
  public fusesCollected: Set<string> = new Set();
  public fusesInserted: number = 0;
  public isPowerRestored: boolean = false;
  public isGateOpened: boolean = false;

  // Elevation & Footsteps
  public isElevated: boolean = false;
  private currentFloorY: number = 0;
  private footstepAccumulator: number = 0;

  // Interaction
  public activeInteraction: InteractionTarget | null = null;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();

  // Settings
  public lookSensitivity: number = 1.0;
  public invertY: boolean = false;

  constructor(camera: THREE.PerspectiveCamera, scene: THREE.Scene) {
    this.camera = camera;
    this.camera.rotation.order = 'YXZ';
    this.camera.position.copy(this.position);

    // Setup authentic PS1 flashlight spotlight (tuned for low-end mobile performance)
    this.flashlight = new THREE.SpotLight(0xfff6de, 2.6, 18, Math.PI / 5, 0.45, 1.2);
    this.flashlight.castShadow = true;
    this.flashlight.shadow.mapSize.width = 256; // 256x256 shadow map for silky smooth mobile performance
    this.flashlight.shadow.mapSize.height = 256;
    this.flashlight.shadow.camera.near = 0.3;
    this.flashlight.shadow.camera.far = 18;

    this.flashlightTarget = new THREE.Object3D();
    scene.add(this.flashlightTarget);
    this.flashlight.target = this.flashlightTarget;

    scene.add(this.flashlight);
  }

  public toggleFlashlight(): boolean {
    if (this.battery <= 0) {
      gameAudio.playFlashlightClick(false);
      this.isFlashlightOn = false;
      this.flashlight.intensity = 0;
      return false;
    }
    this.isFlashlightOn = !this.isFlashlightOn;
    this.flashlight.intensity = this.isFlashlightOn ? 2.6 : 0;
    gameAudio.playFlashlightClick(this.isFlashlightOn);
    return this.isFlashlightOn;
  }

  public addBattery(amount: number = 50) {
    this.battery = Math.min(this.MAX_BATTERY, this.battery + amount);
    gameAudio.playBatteryPickup();
  }

  public update(
    dt: number,
    colliders: THREE.Box3[],
    elevatedSurfaces: ElevatedSurface[],
    interactables: InteractionTarget[]
  ) {
    // 1. Process Look Rotation
    const sens = 0.0024 * this.lookSensitivity;
    this.rotation.y -= this.lookDeltaX * sens;
    const yDelta = this.invertY ? this.lookDeltaY : -this.lookDeltaY;
    this.rotation.x += yDelta * sens;

    // Strict pitch clamp between -75° and +75°
    const maxPitch = 1.30;
    this.rotation.x = Math.max(-maxPitch, Math.min(maxPitch, this.rotation.x));
    this.camera.rotation.copy(this.rotation);

    // Reset look delta
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;

    // 2. Battery Drain
    if (this.isFlashlightOn) {
      this.battery -= dt * 0.7;
      if (this.battery <= 0) {
        this.battery = 0;
        this.isFlashlightOn = false;
        this.flashlight.intensity = 0;
        gameAudio.playFlashlightClick(false);
      }
    }

    // 3. Movement Calculations
    const canSprint = this.isSprinting && this.stamina > 5 && (this.moveForward !== 0 || this.moveRight !== 0);
    const speed = canSprint ? 6.2 : 3.6;

    if (canSprint) {
      this.stamina = Math.max(0, this.stamina - dt * 22);
    } else {
      this.stamina = Math.min(this.MAX_STAMINA, this.stamina + dt * 14);
    }

    // Direction vectors based on camera yaw without allocating new vectors
    _p_forward.set(0, 0, -1).applyAxisAngle(_p_upAxis, this.rotation.y);
    _p_right.set(1, 0, 0).applyAxisAngle(_p_upAxis, this.rotation.y);

    _p_move.set(0, 0, 0);
    if (this.moveForward !== 0) _p_move.addScaledVector(_p_forward, this.moveForward);
    if (this.moveRight !== 0) _p_move.addScaledVector(_p_right, this.moveRight);

    if (_p_move.lengthSq() > 0) {
      _p_move.normalize().multiplyScalar(speed * dt);

      // Check elevation / floor height at candidate position
      const candidateX = this.position.x + _p_move.x;
      const candidateZ = this.position.z + _p_move.z;
      const targetFloorY = getFloorHeightAt(candidateX, candidateZ, this.currentFloorY, elevatedSurfaces);

      // Candidate position with vertical adjustment
      _p_candidate.copy(this.position);
      _p_candidate.x += _p_move.x;
      _p_candidate.z += _p_move.z;
      _p_candidate.y = targetFloorY + 1.7; // 1.7m eye height

      // Check collision with world colliders
      if (!checkCollision(_p_candidate, 0.45, colliders, 1.8)) {
        this.position.x = _p_candidate.x;
        this.position.z = _p_candidate.z;
      } else {
        // Try sliding on X axis
        _p_slideX.copy(this.position);
        _p_slideX.x += _p_move.x;
        if (!checkCollision(_p_slideX, 0.45, colliders, 1.8)) {
          this.position.x = _p_slideX.x;
        } else {
          // Try sliding on Z axis
          _p_slideZ.copy(this.position);
          _p_slideZ.z += _p_move.z;
          if (!checkCollision(_p_slideZ, 0.45, colliders, 1.8)) {
            this.position.z = _p_slideZ.z;
          }
        }
      }

      // Footstep audio calculation
      this.footstepAccumulator += dt * speed;
      const footstepInterval = canSprint ? 1.8 : 2.4;
      if (this.footstepAccumulator >= footstepInterval) {
        this.footstepAccumulator = 0;
        gameAudio.playFootstep(this.isElevated, canSprint);
      }
    }

    // Update floor height & elevation
    this.currentFloorY = getFloorHeightAt(this.position.x, this.position.z, this.currentFloorY, elevatedSurfaces);
    this.isElevated = this.currentFloorY >= 1.8;

    // Smooth camera height adjustment (handles climbing ramps & containers)
    const targetEyeY = this.currentFloorY + 1.7;
    this.position.y = THREE.MathUtils.lerp(this.position.y, targetEyeY, dt * 12);
    this.camera.position.copy(this.position);

    // Update Flashlight spotlight position & direction
    this.flashlight.position.copy(this.position);
    _p_forwardDir.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
    this.flashlightTarget.position.copy(this.position).addScaledVector(_p_forwardDir, 10);

    // Update AudioListener in Web Audio API
    gameAudio.updateListener(this.camera);

    // 4. Forward Raycasting for Interactable Objects
    this.checkInteractables(interactables);
  }

  // Detect interactables in front of player
  private checkInteractables(interactables: InteractionTarget[]) {
    _p_camDir.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
    let closestTarget: InteractionTarget | null = null;
    let closestDist = Infinity;

    for (let i = 0; i < interactables.length; i++) {
      const item = interactables[i];
      _p_itemPos.set(item.position[0], item.position[1], item.position[2]);
      const dist = this.position.distanceTo(_p_itemPos);

      if (dist <= item.distance) {
        _p_toItem.subVectors(_p_itemPos, this.position).normalize();
        const dot = _p_camDir.dot(_p_toItem);

        // Within ~55 degree forward viewing cone
        if (dot > 0.55 && dist < closestDist) {
          closestDist = dist;
          closestTarget = item;
        }
      }
    }

    this.activeInteraction = closestTarget;
  }

  public getStats(): PlayerStats {
    return {
      health: this.health,
      maxHealth: this.MAX_HEALTH,
      battery: this.battery,
      maxBattery: this.MAX_BATTERY,
      stamina: this.stamina,
      maxStamina: this.MAX_STAMINA,
      fusesCollected: this.fusesCollected.size,
      fusesInserted: this.fusesInserted,
      isFlashlightOn: this.isFlashlightOn,
      isSprinting: this.isSprinting,
      isElevated: this.isElevated,
    };
  }
}
