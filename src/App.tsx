/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import { 
  GameState, 
  GameSettings, 
  PlayerStats, 
  InteractionTarget,
  EndGameStats 
} from './game/types';
import { gameAudio } from './game/audio';
import { buildRailwayYard, WorldData } from './game/world';
import { PlayerController } from './game/player';
import { TekeTekeEntity } from './game/entity';
import { CinematicsController, CinematicType } from './game/cinematics';
import { getElectricalPanelTexture } from './game/textures';

import { HUD } from './components/HUD';
import { TitleScreen } from './components/TitleScreen';
import { PauseModal } from './components/PauseModal';
import { GameOverModal } from './components/GameOverModal';
import { VictoryModal } from './components/VictoryModal';
import { SettingsModal } from './components/SettingsModal';
import { DownloadAPKModal } from './components/DownloadAPKModal';

// Smart detection for Android and low-end mobile devices
const isAndroidOrMobile = typeof navigator !== 'undefined' && (
  /Android/i.test(navigator.userAgent) ||
  /iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
  (typeof window !== 'undefined' && (window.innerWidth < 850 || 'ontouchstart' in window))
);

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);

  // High-level Game State
  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Settings with low-end Android defaults
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const saved = localStorage.getItem('teke_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    // Default optimized profile for Android / mobile
    if (isAndroidOrMobile) {
      return {
        lookSensitivity: 1.1,
        invertY: false,
        masterVolume: 0.85,
        sfxVolume: 0.9,
        ambientVolume: 0.6,
        crtEffect: false, // Turn off heavy CRT filter by default on Android for maximum FPS
        fogDensity: 0.045,
        graphicsQuality: 'low',
        enableShadows: false, // Turn off real-time shadows on mobile for 45-60 FPS
        resolutionScale: 0.75, // Render at 75% resolution for smooth Mali/Adreno performance
      };
    }

    return {
      lookSensitivity: 1.0,
      invertY: false,
      masterVolume: 0.85,
      sfxVolume: 0.9,
      ambientVolume: 0.6,
      crtEffect: true,
      fogDensity: 0.045,
      graphicsQuality: 'medium',
      enableShadows: true,
      resolutionScale: 1.0,
    };
  });

  // UI state updated on tick
  const [hudStats, setHudStats] = useState<PlayerStats>({
    health: 100,
    maxHealth: 100,
    battery: 100,
    maxBattery: 100,
    stamina: 100,
    maxStamina: 100,
    fusesCollected: 0,
    fusesInserted: 0,
    isFlashlightOn: true,
    isSprinting: false,
    isElevated: false,
  });

  const [objectiveText, setObjectiveText] = useState('EXPLORE YARD: FIND 3 ELECTRICAL FUSES (0/3)');
  const [activeInteraction, setActiveInteraction] = useState<InteractionTarget | null>(null);

  // End game stats
  const [endStats, setEndStats] = useState<EndGameStats>({
    survivalTimeSec: 0,
    fusesFound: 0,
    chasesSurvived: 0,
    distanceCoveredMeters: 0,
    rating: 'A',
  });

  // Engine Refs (persisted across renders)
  const engineRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    world: WorldData;
    player: PlayerController;
    teke: TekeTekeEntity;
    cinematics: CinematicsController;
    clock: THREE.Clock;
    startTime: number;
    raycaster: THREE.Raycaster;
    isSoftwareGl: boolean;
  } | null>(null);

  const gameStateRef = useRef<GameState>(gameState);
  gameStateRef.current = gameState;

  const settingsRef = useRef<GameSettings>(settings);
  settingsRef.current = settings;

  // Key state tracking
  const keysHeld = useRef<{ [key: string]: boolean }>({});

  // -------------------------------------------------------------
  // Initialization of Three.js Scene, World, Player, and Teke Teke
  // -------------------------------------------------------------
  useEffect(() => {
    if (!canvasMountRef.current) return;

    // Detect software WebGL as instructed by threejs skill
    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch (e) {
        return true;
      }
    })();

    // Compute initial pixel ratio based on device and user resolution scale
    const currentSettings = settingsRef.current;
    const basePixelRatio = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2);
    const targetPixelRatio = Math.max(0.65, Math.min(basePixelRatio * currentSettings.resolutionScale, 2.0));

    // Setup WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl && currentSettings.graphicsQuality !== 'low',
      powerPreference: 'high-performance',
      precision: 'mediump', // mediump shader precision gives great speedup on mobile GPUs
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(targetPixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = !isSoftwareGl && currentSettings.enableShadows;
    renderer.shadowMap.type = THREE.BasicShadowMap; // BasicShadowMap is faster on mobile GPUs

    canvasMountRef.current.appendChild(renderer.domElement);

    // Setup Scene & Dense PS1 Night Fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06080b);
    scene.fog = new THREE.FogExp2(0x06080b, settingsRef.current.fogDensity);

    // Studio Environment reflection using RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Night Atmosphere Lighting: Cool blue-gray moonlight fill
    const hemiLight = new THREE.HemisphereLight(0x223344, 0x0c0d10, 0.45);
    scene.add(hemiLight);

    const moonLight = new THREE.DirectionalLight(0x446688, 0.35);
    moonLight.position.set(20, 40, -30);
    scene.add(moonLight);

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      80
    );

    // Build the 6 interconnected zones of the yard
    const world = buildRailwayYard(scene);

    // Create First-Person Player Controller
    const player = new PlayerController(camera, scene);
    player.lookSensitivity = settingsRef.current.lookSensitivity;
    player.invertY = settingsRef.current.invertY;

    // Create Teke Teke Antagonist Entity
    const teke = new TekeTekeEntity(scene);

    // Create Cinematics Director
    const cinematics = new CinematicsController();

    const clock = new THREE.Clock();
    const raycaster = new THREE.Raycaster();

    engineRef.current = {
      renderer,
      scene,
      camera,
      world,
      player,
      teke,
      cinematics,
      clock,
      startTime: Date.now(),
      raycaster,
      isSoftwareGl,
    };

    // Pre-warm shaders
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // -------------------------------------------------------------
    // Animation & Game Simulation Loop
    // -------------------------------------------------------------
    let frameId = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    let lastTickTime = performance.now();

    function tick() {
      const now = performance.now();
      const rawDt = (now - lastTickTime) / 1000;
      lastTickTime = now;
      const dt = Math.min(rawDt, 0.05);

      const state = gameStateRef.current;

      if (state === 'TITLE') {
        // Atmospheric title screen live camera pan across the mist
        const t = now * 0.0003;
        camera.position.set(
          Math.sin(t) * 22,
          5.5 + Math.sin(t * 1.5) * 0.5,
          -10 + Math.cos(t) * 18
        );
        camera.lookAt(0, 2.0, 0);
      } 
      else if (state === 'CINEMATIC_OPENING' || state === 'CINEMATIC_ENCOUNTER' || state === 'CINEMATIC_ESCAPE') {
        cinematics.update(dt, player, teke, world, (endedType: CinematicType) => {
          if (endedType === 'OPENING') {
            setGameState('PLAYING');
            setObjectiveText('FIND 3 ELECTRICAL FUSES IN YARD (0/3)');
          } else if (endedType === 'ENCOUNTER') {
            setGameState('PLAYING');
            setObjectiveText('AVOID THE ENTITY! SEARCH WORKSHOP, SIGNAL TOWER, & CONTAINERS');
          } else if (endedType === 'ESCAPE') {
            const timeTaken = (Date.now() - engineRef.current!.startTime) / 1000;
            let rating = 'B';
            if (timeTaken < 240) rating = 'S';
            else if (timeTaken < 420) rating = 'A';

            setEndStats({
              survivalTimeSec: timeTaken,
              fusesFound: 3,
              chasesSurvived: cinematics.hasPlayedEncounter ? 3 : 1,
              distanceCoveredMeters: Math.round(timeTaken * 4.2),
              rating,
            });
            setGameState('VICTORY');
          }
        });
      } 
      else if (state === 'PLAYING') {
        // Update Desktop Keyboard inputs
        let forward = 0;
        let right = 0;
        if (keysHeld.current['KeyW'] || keysHeld.current['ArrowUp']) forward += 1;
        if (keysHeld.current['KeyS'] || keysHeld.current['ArrowDown']) forward -= 1;
        if (keysHeld.current['KeyD'] || keysHeld.current['ArrowRight']) right += 1;
        if (keysHeld.current['KeyA'] || keysHeld.current['ArrowLeft']) right -= 1;

        // Merge with virtual joystick if active
        if (Math.abs(player.moveForward) > 0.1 || Math.abs(player.moveRight) > 0.1) {
          // mobile joystick takes precedence if active
        } else {
          player.moveForward = forward;
          player.moveRight = right;
        }

        player.isSprinting = !!keysHeld.current['ShiftLeft'] || !!keysHeld.current['ShiftRight'] || player.isSprinting;

        // Player update
        player.update(dt, world.colliders, world.elevatedSurfaces, world.interactables);

        // Check First Encounter trigger: Player enters middle yard (Z <= 26)
        if (!cinematics.hasPlayedEncounter && player.position.z <= 26) {
          cinematics.startEncounter(player, teke);
          setGameState('CINEMATIC_ENCOUNTER');
        }

        // Teke Teke AI update
        const { caughtPlayer } = teke.update(
          dt,
          player.position,
          player.isSprinting,
          player.isElevated,
          world.colliders,
          raycaster,
          scene
        );

        if (caughtPlayer) {
          gameAudio.playHorrorSting();
          gameAudio.stopTekeScraping();
          const timeSurvived = (Date.now() - engineRef.current!.startTime) / 1000;
          setEndStats((prev) => ({
            ...prev,
            survivalTimeSec: timeSurvived,
            fusesFound: player.fusesCollected.size,
          }));
          setGameState('GAME_OVER');
        }

        // Distance-based point light culling (Saves massive GPU fillrate on mobile)
        const px = player.position.x;
        const pz = player.position.z;
        for (let i = 0; i < world.flickerLights.length; i++) {
          const l = world.flickerLights[i];
          const dx = l.position.x - px;
          const dz = l.position.z - pz;
          // Beyond 36m (~1300 dist squared), disable light to save shader computations
          l.visible = (dx * dx + dz * dz) < 1300;
        }

        // Update emergency siren strobe when power restored
        if (player.isPowerRestored) {
          const sirenFlash = Math.sin(now * 0.008) > 0.1 ? 2.5 : 0;
          world.emergencySirens.forEach((s) => (s.intensity = sirenFlash));
        }

        // Sync React HUD state
        setHudStats(player.getStats());
        setActiveInteraction(player.activeInteraction);
      }

      // Render frame
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    // Start loop
    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    // -------------------------------------------------------------
    // Window Resize Handling
    // -------------------------------------------------------------
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // -------------------------------------------------------------
    // Keyboard & Mouse Listeners
    // -------------------------------------------------------------
    const handleKeyDown = (e: KeyboardEvent) => {
      keysHeld.current[e.code] = true;

      if (gameStateRef.current === 'TITLE') {
        if (e.code === 'Enter' || e.code === 'Space') {
          startGame();
        }
        return;
      }

      if (gameStateRef.current === 'PLAYING') {
        if (e.code === 'KeyF') {
          player.toggleFlashlight();
        } else if (e.code === 'KeyE' || e.code === 'Space') {
          triggerActiveInteraction();
        } else if (e.code === 'Escape') {
          setGameState('PAUSED');
        }
      } else if (gameStateRef.current === 'PAUSED') {
        if (e.code === 'Escape') {
          setGameState('PLAYING');
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysHeld.current[e.code] = false;
    };

    const handleBlur = () => {
      keysHeld.current = {};
      if (player) {
        player.moveForward = 0;
        player.moveRight = 0;
        player.isSprinting = false;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === renderer.domElement && gameStateRef.current === 'PLAYING') {
        player.lookDeltaX += e.movementX;
        player.lookDeltaY += e.movementY;
      }
    };

    const handleCanvasClick = () => {
      if (gameStateRef.current === 'PLAYING') {
        renderer.domElement.requestPointerLock?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('click', handleCanvasClick);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('click', handleCanvasClick);
      gameAudio.dispose();
      renderer.dispose();
      if (canvasMountRef.current) {
        canvasMountRef.current.innerHTML = '';
      }
    };
  }, []);

  // -------------------------------------------------------------
  // Game Actions & Interactivity
  // -------------------------------------------------------------
  const startGame = () => {
    gameAudio.init();
    gameAudio.resume();
    if (!engineRef.current) return;

    const { player, world, cinematics } = engineRef.current;
    engineRef.current.startTime = Date.now();

    // Reset player
    player.health = 100;
    player.battery = 100;
    player.stamina = 100;
    player.fusesCollected.clear();
    player.fusesInserted = 0;
    player.isPowerRestored = false;
    player.isGateOpened = false;
    player.isFlashlightOn = true;
    player.flashlight.intensity = 2.6;

    // Reset Cinematics
    cinematics.hasPlayedEncounter = false;
    cinematics.hasPlayedEscape = false;
    cinematics.startOpening(player, world);

    setGameState('CINEMATIC_OPENING');
  };

  const restartGame = () => {
    if (!engineRef.current) return;
    const { teke } = engineRef.current;
    teke.state = 'DORMANT';
    teke.mesh.visible = false;
    gameAudio.stopTekeScraping();
    startGame();
  };

  const triggerActiveInteraction = () => {
    if (!engineRef.current) return;
    const { player, world, cinematics, teke } = engineRef.current;
    const item = player.activeInteraction;
    if (!item) return;

    // 1. Fuse Pickups
    if (item.type === 'fuse') {
      const fuseId = item.data?.fuseId;
      if (fuseId && !player.fusesCollected.has(fuseId)) {
        player.fusesCollected.add(fuseId);
        gameAudio.playFusePickup();

        // Remove from 3D world
        const mesh = world.fuseObjects.get(fuseId);
        if (mesh) mesh.visible = false;

        // Remove from interactables
        world.interactables = world.interactables.filter((i) => i.id !== item.id);
        player.activeInteraction = null;

        const count = player.fusesCollected.size;
        setObjectiveText(`FUSES COLLECTED: ${count}/3. ${count === 3 ? 'TAKE TO SUBSTATION!' : 'SEARCH YARD'}`);
      }
    } 
    // 2. Battery Pickups
    else if (item.type === 'battery') {
      player.addBattery(50);
      if (item.data?.mesh) item.data.mesh.visible = false;
      world.interactables = world.interactables.filter((i) => i.id !== item.id);
      player.activeInteraction = null;
    } 
    // 3. Substation Fuse Socket
    else if (item.type === 'socket') {
      if (player.fusesCollected.size < 3) {
        setObjectiveText(`NEED ALL 3 FUSES (CURRENT: ${player.fusesCollected.size}/3)`);
      } else if (player.fusesInserted < 3) {
        player.fusesInserted = 3;
        gameAudio.playFuseInsert();

        // Update panel texture to show 3 fuses installed!
        world.substationPanel.material = new THREE.MeshStandardMaterial({
          map: getElectricalPanelTexture(3),
          roughness: 0.5,
          metalness: 0.4,
        });

        setObjectiveText('FUSES INSERTED! PULL THE MAIN BREAKER SWITCH ON THE RIGHT');
      }
    } 
    // 4. Main Breaker Lever
    else if (item.type === 'breaker') {
      if (player.fusesInserted < 3) {
        setObjectiveText('CANNOT ENERGIZE: INSERT 3 FUSES INTO PANEL FIRST');
      } else if (!player.isPowerRestored) {
        player.isPowerRestored = true;
        gameAudio.playPowerRestoration();

        // Rotate breaker lever down
        world.breakerLever.rotation.z = 0.5;

        // Turn on yard emergency siren lights
        world.emergencySirens.forEach((s) => (s.intensity = 2.5));

        setObjectiveText('POWER RESTORED! RUN TO EXIT GATE (NORTH) BEFORE SHE CATCHES YOU!');
      }
    } 
    // 5. Final Exit Gate Console
    else if (item.type === 'gate') {
      if (!player.isPowerRestored) {
        setObjectiveText('GATE OFFLINE: RESTORE POWER AT SUBSTATION FIRST');
      } else if (!player.isGateOpened) {
        player.isGateOpened = true;
        // Start Escape Cinematic
        cinematics.startEscape(player, teke, world);
        setGameState('CINEMATIC_ESCAPE');
      }
    }
  };

  const handleUpdateSettings = (newSettings: Partial<GameSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('teke_settings', JSON.stringify(updated));
      } catch (e) {}

      if (engineRef.current) {
        const { renderer, player, isSoftwareGl } = engineRef.current;
        player.lookSensitivity = updated.lookSensitivity;
        player.invertY = updated.invertY;

        if (newSettings.fogDensity !== undefined) {
          (engineRef.current.scene.fog as THREE.FogExp2).density = updated.fogDensity;
        }

        // Apply dynamic resolution scaling & shadows
        const basePixelRatio = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2);
        const targetPixelRatio = Math.max(0.65, Math.min(basePixelRatio * updated.resolutionScale, 2.0));
        renderer.setPixelRatio(targetPixelRatio);
        renderer.shadowMap.enabled = !isSoftwareGl && updated.enableShadows;

        if (player && player.flashlight) {
          player.flashlight.castShadow = !isSoftwareGl && updated.enableShadows;
        }
      }
      gameAudio.setVolumes(updated.masterVolume, updated.ambientVolume, updated.sfxVolume);
      return updated;
    });
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    gameAudio.setMuted(nextMuted);
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-black select-none">
      {/* 3D Canvas Mount (Isolated so React renders never tear down WebGL) */}
      <div ref={canvasMountRef} className="absolute inset-0 z-0 cursor-crosshair" />

      {/* Title Screen */}
      {gameState === 'TITLE' && (
        <TitleScreen
          onStartGame={startGame}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
          isMuted={isMuted}
          onToggleMute={toggleMute}
          graphicsQuality={settings.graphicsQuality}
        />
      )}

      {/* In-Game HUD (During PLAYING, OPENING, or ENCOUNTER) */}
      {(gameState === 'PLAYING' || gameState === 'CINEMATIC_OPENING' || gameState === 'CINEMATIC_ENCOUNTER') && (
        <HUD
          stats={hudStats}
          objectiveText={objectiveText}
          activeInteraction={activeInteraction}
          onInteract={triggerActiveInteraction}
          onToggleFlashlight={() => engineRef.current?.player.toggleFlashlight()}
          onSprintToggle={(sprint) => {
            if (engineRef.current) engineRef.current.player.isSprinting = sprint;
          }}
          onPause={() => setGameState('PAUSED')}
          onJoystickMove={(x, y) => {
            if (engineRef.current) {
              engineRef.current.player.moveRight = x;
              engineRef.current.player.moveForward = y;
            }
          }}
          onTouchLook={(dx, dy) => {
            if (engineRef.current) {
              engineRef.current.player.lookDeltaX += dx;
              engineRef.current.player.lookDeltaY += dy;
            }
          }}
          isMuted={isMuted}
          onToggleMute={toggleMute}
          crtEffect={settings.crtEffect}
        />
      )}

      {/* Pause Modal */}
      {gameState === 'PAUSED' && (
        <PauseModal
          onResume={() => setGameState('PLAYING')}
          onRestart={restartGame}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
          onMainMenu={() => setGameState('TITLE')}
        />
      )}

      {/* Game Over Modal */}
      {gameState === 'GAME_OVER' && (
        <GameOverModal
          survivalTimeSec={endStats.survivalTimeSec}
          fusesFound={endStats.fusesFound}
          onRetry={restartGame}
          onMainMenu={() => setGameState('TITLE')}
        />
      )}

      {/* Victory Modal */}
      {gameState === 'VICTORY' && (
        <VictoryModal
          stats={endStats}
          onPlayAgain={restartGame}
          onMainMenu={() => setGameState('TITLE')}
        />
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {/* Download Android APK / Installation Modal */}
      {isDownloadModalOpen && (
        <DownloadAPKModal onClose={() => setIsDownloadModalOpen(false)} />
      )}
    </div>
  );
}
