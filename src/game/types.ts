/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GameState = 
  | 'TITLE'
  | 'CINEMATIC_OPENING'
  | 'PLAYING'
  | 'CINEMATIC_ENCOUNTER'
  | 'CINEMATIC_ESCAPE'
  | 'PAUSED'
  | 'GAME_OVER'
  | 'VICTORY';

export type TekeState =
  | 'DORMANT'
  | 'LISTENING'
  | 'INVESTIGATING'
  | 'STALKING'
  | 'CHASE'
  | 'SEARCHING'
  | 'BLOCKED_BY_HEIGHT'
  | 'REPOSITIONING'
  | 'CAPTURE';

export interface Objective {
  id: string;
  text: string;
  detail: string;
  completed: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
}

export type GraphicsPreset = 'low' | 'medium' | 'high';

export interface GameSettings {
  lookSensitivity: number;
  invertY: boolean;
  masterVolume: number;
  sfxVolume: number;
  ambientVolume: number;
  crtEffect: boolean;
  fogDensity: number;
  graphicsQuality: GraphicsPreset;
  enableShadows: boolean;
  resolutionScale: number; // 0.75 for low-end, 1.0 for standard, 1.25 for high
}

export interface PlayerStats {
  health: number;
  maxHealth: number;
  battery: number;
  maxBattery: number;
  stamina: number;
  maxStamina: number;
  fusesCollected: number;
  fusesInserted: number;
  isFlashlightOn: boolean;
  isSprinting: boolean;
  isElevated: boolean;
}

export interface InteractionTarget {
  id: string;
  type: 'fuse' | 'socket' | 'breaker' | 'gate' | 'battery' | 'door' | 'lore';
  label: string;
  prompt: string;
  distance: number;
  position: [number, number, number];
  data?: any;
}

export interface EndGameStats {
  survivalTimeSec: number;
  fusesFound: number;
  chasesSurvived: number;
  distanceCoveredMeters: number;
  rating: string;
}
