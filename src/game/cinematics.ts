/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { gameAudio } from './audio';
import { PlayerController } from './player';
import { TekeTekeEntity } from './entity';
import { WorldData } from './world';

export type CinematicType = 'OPENING' | 'ENCOUNTER' | 'ESCAPE' | null;

export class CinematicsController {
  public currentCinematic: CinematicType = null;
  public elapsedTime: number = 0;
  public hasPlayedEncounter: boolean = false;
  public hasPlayedOpening: boolean = false;
  public hasPlayedEscape: boolean = false;

  // Saved camera positions for smooth interpolation
  private startCamPos: THREE.Vector3 = new THREE.Vector3();
  private startCamRot: THREE.Euler = new THREE.Euler();

  public startOpening(player: PlayerController, world: WorldData) {
    this.currentCinematic = 'OPENING';
    this.elapsedTime = 0;
    this.hasPlayedOpening = true;

    player.position.set(0, 1.7, 49.5);
    player.rotation.set(0, 0, 0);
    player.camera.position.copy(player.position);
    player.camera.rotation.copy(player.rotation);

    // Initial flicker in office
    world.flickerLights.forEach((l) => (l.intensity = 1.6));
  }

  public startEncounter(player: PlayerController, teke: TekeTekeEntity) {
    if (this.hasPlayedEncounter) return;
    this.currentCinematic = 'ENCOUNTER';
    this.elapsedTime = 0;
    this.hasPlayedEncounter = true;

    this.startCamPos.copy(player.camera.position);
    this.startCamRot.copy(player.camera.rotation);

    // Spawn Teke Teke in sight between train tracks at Z=5
    teke.activate(new THREE.Vector3(-12, 0, 4));
    gameAudio.playHorrorSting();
  }

  public startEscape(player: PlayerController, teke: TekeTekeEntity, world: WorldData) {
    this.currentCinematic = 'ESCAPE';
    this.elapsedTime = 0;
    this.hasPlayedEscape = true;

    gameAudio.playGateOpenSound();

    // Move Teke Teke behind player for dramatic pursuit
    teke.position.set(0, 0, -42);
    teke.state = 'CHASE';
  }

  public update(
    dt: number,
    player: PlayerController,
    teke: TekeTekeEntity,
    world: WorldData,
    onCinematicEnd: (type: CinematicType) => void
  ) {
    if (!this.currentCinematic) return;
    this.elapsedTime += dt;

    if (this.currentCinematic === 'OPENING') {
      // 0 - 2.5s: Fluorescent light flickers and hums
      if (this.elapsedTime < 2.5) {
        const flicker = Math.random() > 0.3 ? 1.4 : 0.2;
        world.flickerLights[0].intensity = flicker;
      } 
      // 2.5s: BLACKOUT! Power fails, loud spark, lights out!
      else if (this.elapsedTime >= 2.5 && this.elapsedTime < 2.7) {
        if (world.flickerLights[0].intensity > 0) {
          world.flickerLights[0].intensity = 0;
          gameAudio.playBlackoutSound();
        }
      } 
      // 2.7 - 6.0s: Office door unlocks, distant scraping outside
      else if (this.elapsedTime >= 2.7 && this.elapsedTime < 6.0) {
        // Swing security door open
        if (world.securityDoor) {
          world.securityDoor.position.x = THREE.MathUtils.lerp(world.securityDoor.position.x, -2.4, dt * 2);
        }
        // Pan camera slowly toward the door leading to yard
        player.camera.rotation.y = THREE.MathUtils.lerp(player.camera.rotation.y, 0, dt * 2.5);
      } 
      // 6.0s: End opening cinematic, give full control to player
      else {
        const endedType = this.currentCinematic;
        this.currentCinematic = null;
        onCinematicEnd(endedType);
      }
    } 
    else if (this.currentCinematic === 'ENCOUNTER') {
      // 0 - 3.5s: Dramatic look toward Teke Teke crawling between boxcars
      if (this.elapsedTime < 3.2) {
        const lookDir = teke.position.clone().sub(player.position).normalize();
        const targetYaw = Math.atan2(lookDir.x, lookDir.z) + Math.PI;
        player.camera.rotation.y = THREE.MathUtils.lerp(player.camera.rotation.y, targetYaw, dt * 3.5);
        player.camera.rotation.x = THREE.MathUtils.lerp(player.camera.rotation.x, -0.2, dt * 3.5);
      } else {
        const endedType = this.currentCinematic;
        this.currentCinematic = null;
        onCinematicEnd(endedType);
      }
    } 
    else if (this.currentCinematic === 'ESCAPE') {
      // Gate slides open, player moves through gate to Z: -68
      if (world.exitGateObject) {
        const gateDoor = (world.exitGateObject.children[3] as THREE.Mesh);
        if (gateDoor) {
          gateDoor.position.x = THREE.MathUtils.lerp(gateDoor.position.x, 9.0, dt * 1.5);
        }
      }

      // Move player through gate toward freedom
      player.position.z -= dt * 3.2;
      player.camera.position.copy(player.position);

      if (this.elapsedTime > 4.5) {
        const endedType = this.currentCinematic;
        this.currentCinematic = null;
        onCinematicEnd(endedType);
      }
    }
  }
}
