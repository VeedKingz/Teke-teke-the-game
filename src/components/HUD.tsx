/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { PlayerStats, InteractionTarget } from '../game/types';
import { 
  Zap, 
  ShieldAlert, 
  Flashlight, 
  Footprints, 
  Hand, 
  Pause, 
  Volume2, 
  VolumeX, 
  HelpCircle,
  Layers
} from 'lucide-react';

interface HUDProps {
  stats: PlayerStats;
  objectiveText: string;
  activeInteraction: InteractionTarget | null;
  onInteract: () => void;
  onToggleFlashlight: () => void;
  onSprintToggle: (sprinting: boolean) => void;
  onPause: () => void;
  onJoystickMove: (x: number, y: number) => void;
  onTouchLook: (dx: number, dy: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  crtEffect: boolean;
}

export const HUD: React.FC<HUDProps> = ({
  stats,
  objectiveText,
  activeInteraction,
  onInteract,
  onToggleFlashlight,
  onSprintToggle,
  onPause,
  onJoystickMove,
  onTouchLook,
  isMuted,
  onToggleMute,
  crtEffect,
}) => {
  // Mobile touch joystick state
  const joystickContainerRef = useRef<HTMLDivElement>(null);
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickNubPos, setJoystickNubPos] = useState({ x: 0, y: 0 });
  const touchIdRef = useRef<number | null>(null);

  // Look touch area tracking
  const lookTouchIdRef = useRef<number | null>(null);
  const lastLookPosRef = useRef<{ x: number; y: number } | null>(null);

  // Sprint hold state for mobile
  const [sprintHeld, setSprintHeld] = useState(false);

  // Joystick touch handlers
  const handleJoystickStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;
    setJoystickActive(true);
    updateJoystickPos(touch.clientX, touch.clientY);
  };

  const handleJoystickMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (!joystickActive) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        updateJoystickPos(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleJoystickEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setJoystickActive(false);
        setJoystickNubPos({ x: 0, y: 0 });
        onJoystickMove(0, 0);
        break;
      }
    }
  };

  const updateJoystickPos = (clientX: number, clientY: number) => {
    if (!joystickContainerRef.current) return;
    const rect = joystickContainerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const maxRadius = rect.width / 2 - 12;
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let normX = dx;
    let normY = dy;
    if (dist > maxRadius) {
      normX = (dx / dist) * maxRadius;
      normY = (dy / dist) * maxRadius;
    }

    setJoystickNubPos({ x: normX, y: normY });
    // Normalize to -1 to 1 (x: strafe, y: forward/back inverted)
    onJoystickMove(normX / maxRadius, -normY / maxRadius);
  };

  // Right-side touch look handlers
  const handleLookStart = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    lookTouchIdRef.current = touch.identifier;
    lastLookPosRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleLookMove = (e: React.TouchEvent) => {
    if (lookTouchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchIdRef.current && lastLookPosRef.current) {
        const dx = touch.clientX - lastLookPosRef.current.x;
        const dy = touch.clientY - lastLookPosRef.current.y;
        lastLookPosRef.current = { x: touch.clientX, y: touch.clientY };
        onTouchLook(dx, dy);
        break;
      }
    }
  };

  const handleLookEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchIdRef.current) {
        lookTouchIdRef.current = null;
        lastLookPosRef.current = null;
        break;
      }
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden font-mono">
      {/* Optional CRT scanline & vignette */}
      {crtEffect && <div className="absolute inset-0 crt-overlay z-10" />}
      <div className="absolute inset-0 vignette-overlay z-10" />

      {/* TOP BAR: Objective & Quick System Status */}
      <div className="absolute top-0 left-0 right-0 p-3 sm:p-4 flex justify-between items-start z-20 pointer-events-none">
        {/* Left: Objectives */}
        <div className="bg-black/75 border border-red-950/80 px-3 py-2 rounded-xs shadow-lg max-w-sm sm:max-w-md pointer-events-auto">
          <div className="flex items-center gap-1.5 text-xs text-red-500 font-bold uppercase tracking-wider mb-0.5">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping inline-block" />
            <span>OPERATIONAL DIRECTIVE</span>
          </div>
          <div className="text-sm sm:text-base font-bold text-gray-100 tracking-wide">
            {objectiveText}
          </div>
          {stats.isElevated && (
            <div className="mt-1 flex items-center gap-1 text-xs text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 border border-emerald-700/50 rounded-xs">
              <Layers className="w-3.5 h-3.5" />
              <span>ELEVATED REFUGE: ENTITY BLOCKED</span>
            </div>
          )}
        </div>

        {/* Right: Pause & Audio */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onToggleMute}
            className="p-2 sm:p-2.5 bg-black/80 border border-neutral-700 text-neutral-300 hover:text-white rounded-xs active:bg-neutral-800 transition"
            title="Mute / Unmute"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <button
            onClick={onPause}
            className="p-2 sm:p-2.5 bg-black/80 border border-neutral-700 text-neutral-300 hover:text-white rounded-xs active:bg-neutral-800 transition flex items-center gap-1"
            title="Pause [ESC]"
          >
            <Pause className="w-5 h-5" />
            <span className="hidden sm:inline text-xs font-bold">PAUSE</span>
          </button>
        </div>
      </div>

      {/* BOTTOM LEFT: Health, Battery, and Stamina Vitals */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-auto bg-black/85 border border-neutral-800 p-2.5 rounded-xs space-y-2 min-w-[160px] sm:min-w-[200px]">
        {/* Health */}
        <div>
          <div className="flex justify-between text-xs text-neutral-400 font-bold mb-0.5">
            <span className="flex items-center gap-1 text-rose-400">
              <ShieldAlert className="w-3.5 h-3.5" /> SURVIVOR
            </span>
            <span className="tabular-nums text-rose-300">{Math.round(stats.health)}%</span>
          </div>
          <div className="w-full h-2 bg-neutral-900 border border-neutral-700 rounded-2xs overflow-hidden">
            <div 
              className="h-full bg-rose-600 transition-all duration-200"
              style={{ width: `${stats.health}%` }}
            />
          </div>
        </div>

        {/* Battery */}
        <div>
          <div className="flex justify-between text-xs text-neutral-400 font-bold mb-0.5">
            <span className="flex items-center gap-1 text-amber-400">
              <Zap className="w-3.5 h-3.5" /> TORCH BATTERY
            </span>
            <span className="tabular-nums text-amber-300">{Math.round(stats.battery)}%</span>
          </div>
          <div className="w-full h-2 bg-neutral-900 border border-neutral-700 rounded-2xs overflow-hidden">
            <div 
              className={`h-full transition-all duration-200 ${
                stats.battery > 30 ? 'bg-amber-500' : 'bg-red-600'
              }`}
              style={{ width: `${stats.battery}%` }}
            />
          </div>
        </div>

        {/* Stamina */}
        <div>
          <div className="flex justify-between text-xs text-neutral-400 font-bold mb-0.5">
            <span className="flex items-center gap-1 text-cyan-400">
              <Footprints className="w-3.5 h-3.5" /> STAMINA
            </span>
            <span className="tabular-nums text-cyan-300">{Math.round(stats.stamina)}%</span>
          </div>
          <div className="w-full h-1.5 bg-neutral-900 border border-neutral-700 rounded-2xs overflow-hidden">
            <div 
              className="h-full bg-cyan-500 transition-all duration-150"
              style={{ width: `${stats.stamina}%` }}
            />
          </div>
        </div>
      </div>

      {/* CENTER CROSSHAIR & INTERACTION PROMPT */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
        {/* Subtle center dot */}
        <div className="w-1.5 h-1.5 rounded-full bg-white/40 ring-1 ring-black/80" />

        {/* Contextual Interaction prompt */}
        {activeInteraction && (
          <div className="mt-8 bg-black/90 border-2 border-amber-500 px-4 py-2 rounded-xs shadow-2xl flex items-center gap-2.5 pointer-events-auto animate-pulse">
            <Hand className="w-5 h-5 text-amber-400" />
            <div>
              <div className="text-xs text-amber-400 font-bold uppercase tracking-wider">
                {activeInteraction.label}
              </div>
              <button
                onClick={onInteract}
                className="text-sm font-black text-white hover:text-amber-200 cursor-pointer"
              >
                [E / TAP] {activeInteraction.prompt}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MOBILE TOUCH CONTROLS (Only visible or active on touch displays) */}
      {/* ============================================================== */}
      {/* Left Touch Joystick (Bottom Left) */}
      <div 
        ref={joystickContainerRef}
        onTouchStart={handleJoystickStart}
        onTouchMove={handleJoystickMove}
        onTouchEnd={handleJoystickEnd}
        onTouchCancel={handleJoystickEnd}
        className="absolute bottom-24 left-6 w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 border-neutral-700/80 bg-black/40 backdrop-blur-none pointer-events-auto z-20 flex items-center justify-center touch-none"
      >
        <div 
          className="w-12 h-12 rounded-full bg-neutral-400/70 border border-white/60 shadow-md transition-transform duration-75"
          style={{
            transform: `translate(${joystickNubPos.x}px, ${joystickNubPos.y}px)`,
          }}
        />
        <div className="absolute bottom-1 text-[10px] text-neutral-400 font-bold uppercase tracking-tighter pointer-events-none">
          MOVE
        </div>
      </div>

      {/* Right Slide-Look Touch Zone (Full right half of screen) */}
      <div
        onTouchStart={handleLookStart}
        onTouchMove={handleLookMove}
        onTouchEnd={handleLookEnd}
        onTouchCancel={handleLookEnd}
        className="absolute top-16 right-0 bottom-0 w-1/2 pointer-events-auto z-10 touch-none"
      />

      {/* Right Side Action Buttons */}
      <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-3 pointer-events-auto">
        {/* Flashlight Toggle */}
        <button
          onClick={onToggleFlashlight}
          className={`w-14 h-14 rounded-full border-2 flex items-center justify-center shadow-lg transition active:scale-95 ${
            stats.isFlashlightOn
              ? 'bg-amber-500/80 border-amber-300 text-black'
              : 'bg-black/80 border-neutral-600 text-neutral-400'
          }`}
          title="Toggle Flashlight [F]"
        >
          <Flashlight className="w-6 h-6" />
        </button>

        {/* Sprint Button (Hold or Tap) */}
        <button
          onTouchStart={() => {
            setSprintHeld(true);
            onSprintToggle(true);
          }}
          onTouchEnd={() => {
            setSprintHeld(false);
            onSprintToggle(false);
          }}
          onMouseDown={() => {
            setSprintHeld(true);
            onSprintToggle(true);
          }}
          onMouseUp={() => {
            setSprintHeld(false);
            onSprintToggle(false);
          }}
          className={`w-14 h-14 rounded-full border-2 flex items-center justify-center shadow-lg transition active:scale-95 ${
            sprintHeld || stats.isSprinting
              ? 'bg-cyan-600/90 border-cyan-300 text-white'
              : 'bg-black/80 border-neutral-600 text-neutral-400'
          }`}
          title="Sprint [SHIFT]"
        >
          <Footprints className="w-6 h-6" />
        </button>

        {/* Interact Button */}
        <button
          onClick={onInteract}
          className={`w-16 h-16 rounded-full border-2 flex items-center justify-center shadow-2xl transition active:scale-95 ${
            activeInteraction
              ? 'bg-amber-500 border-white text-black ring-4 ring-amber-500/50 scale-105 animate-bounce'
              : 'bg-black/80 border-neutral-700 text-neutral-500'
          }`}
          title="Interact [E]"
        >
          <Hand className="w-7 h-7" />
        </button>
      </div>

      {/* Desktop Controls Hint (Fades out or small in bottom-center) */}
      <div className="hidden sm:block absolute bottom-2 left-1/2 -translate-x-1/2 text-neutral-500 text-xs tracking-wider z-20 pointer-events-none bg-black/60 px-3 py-1 rounded-xs border border-neutral-800">
        [WASD] MOVE · [MOUSE] LOOK · [F] FLASHLIGHT · [E] INTERACT · [SHIFT] SPRINT · [ESC] PAUSE
      </div>
    </div>
  );
};
