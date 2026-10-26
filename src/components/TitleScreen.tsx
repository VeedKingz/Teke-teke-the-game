/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Play, Settings, HelpCircle, Volume2, VolumeX, Shield, Radio, Terminal, Download } from 'lucide-react';

interface TitleScreenProps {
  onStartGame: () => void;
  onOpenSettings: () => void;
  onOpenDownloadModal: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  graphicsQuality?: string;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  onOpenSettings,
  onOpenDownloadModal,
  isMuted,
  onToggleMute,
  graphicsQuality = 'low',
}) => {
  const [showLore, setShowLore] = useState(false);

  return (
    <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-12 z-30 font-mono select-none pointer-events-auto bg-black/40">
      {/* Top Bar: Brand, Mute & Settings */}
      <div className="flex justify-between items-center w-full">
        <div className="flex items-center gap-2 text-xs text-red-500 font-bold tracking-widest uppercase">
          <Terminal className="w-4 h-4 text-red-600" />
          <span>KISHIMA RAILWAY YARD · BLACKOUT INCIDENT 1998</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenDownloadModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500 text-emerald-300 text-xs font-bold transition rounded-xs cursor-pointer shadow-md"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">GET APK</span>
          </button>
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-black/80 hover:bg-neutral-900 border border-amber-600/70 text-amber-400 text-xs font-bold transition rounded-xs"
            title="Graphics & Performance"
          >
            <span className="text-[10px]">⚡ {graphicsQuality === 'low' ? 'ANDROID BOOST' : graphicsQuality.toUpperCase()}</span>
          </button>
          <button
            onClick={() => setShowLore(!showLore)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-black/80 hover:bg-neutral-900 border border-neutral-700 text-neutral-300 text-xs font-bold transition rounded-xs"
          >
            <HelpCircle className="w-4 h-4 text-amber-500" />
            <span className="hidden sm:inline">HOW TO SURVIVE</span>
          </button>
          <button
            onClick={onToggleMute}
            className="p-2 bg-black/80 hover:bg-neutral-900 border border-neutral-700 text-neutral-300 transition rounded-xs"
            title="Mute / Unmute"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-red-400" />}
          </button>
          <button
            onClick={onOpenSettings}
            className="p-2 bg-black/80 hover:bg-neutral-900 border border-neutral-700 text-neutral-300 transition rounded-xs"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center Hero: Bespoke SVG Title Lockup */}
      <div className="max-w-2xl my-auto">
        <div className="relative inline-block mb-3">
          <svg className="w-full max-w-[340px] sm:max-w-[480px] h-auto drop-shadow-[0_10px_20px_rgba(220,38,38,0.4)]" viewBox="0 0 500 120" fill="none">
            {/* Grungy blood-red angled title typography */}
            <text x="0" y="65" fill="#e5e5e5" fontSize="48" fontWeight="900" letterSpacing="4" fontFamily="monospace">
              TEKE TEKE
            </text>
            <text x="290" y="65" fill="#dc2626" fontSize="48" fontWeight="900" letterSpacing="4" fontFamily="monospace">
              :
            </text>
            <text x="320" y="65" fill="#991b1b" fontSize="32" fontWeight="800" letterSpacing="2" fontFamily="monospace">
              THE GAME
            </text>
            {/* Japanese katakana subtitle */}
            <text x="4" y="98" fill="#7f1d1d" fontSize="20" fontWeight="700" letterSpacing="10" fontFamily="sans-serif">
              テケテケ · 惨劇の操車場
            </text>
          </svg>
          <div className="h-1 w-full bg-gradient-to-r from-red-700 via-neutral-800 to-transparent mt-1" />
        </div>

        <p className="text-neutral-400 text-xs sm:text-sm max-w-lg mb-6 leading-relaxed">
          Trapped in a 1990s industrial railway yard during an emergency blackout. An urban legend stalks the rusty tracks dragging her severed body with horrific speed.
        </p>

        {/* Start Game CTA + Download APK Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <button
            onClick={onStartGame}
            className="group px-8 py-4 bg-red-800 hover:bg-red-700 active:bg-red-900 text-white font-black tracking-widest text-base sm:text-lg border-2 border-red-500 shadow-[0_0_25px_rgba(220,38,38,0.5)] transition flex items-center justify-center gap-3 cursor-pointer rounded-xs"
          >
            <Play className="w-5 h-5 fill-current transition group-hover:scale-110" />
            <span>START SURVIVAL</span>
          </button>

          <button
            onClick={onOpenDownloadModal}
            className="px-6 py-4 bg-neutral-950/90 hover:bg-neutral-900 active:bg-black text-emerald-400 font-bold tracking-wider text-sm sm:text-base border-2 border-emerald-500/80 shadow-[0_0_20px_rgba(16,185,129,0.25)] transition flex items-center justify-center gap-2.5 cursor-pointer rounded-xs"
          >
            <Download className="w-5 h-5 text-emerald-400" />
            <span>DOWNLOAD APK / INSTALL</span>
          </button>
        </div>

        {/* Flat control-hint line */}
        <div className="mt-4 text-[11px] sm:text-xs text-neutral-500 tracking-wider">
          WASD Move · Mouse Look · F Flashlight · E Interact · Shift Sprint · Esc Pause
        </div>
      </div>

      {/* Lore & Survival Guide Modal */}
      {showLore && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-neutral-950 border-2 border-red-900 max-w-lg w-full p-6 text-neutral-300 space-y-4 rounded-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-red-950 pb-2">
              <span className="text-red-500 font-bold tracking-wider text-sm flex items-center gap-2">
                <Radio className="w-4 h-4" /> SURVIVOR PROTOCOL
              </span>
              <button
                onClick={() => setShowLore(false)}
                className="text-neutral-400 hover:text-white font-bold"
              >
                [X]
              </button>
            </div>

            <div className="text-xs space-y-2.5 leading-relaxed text-neutral-300">
              <p>
                <strong className="text-amber-400">1. THE OBJECTIVE:</strong> The main yard exit gate is locked without power. Find all 3 electrical fuses hidden in the Maintenance Workshop, Signal Control Tower, and Shipping Container Siding.
              </p>
              <p>
                <strong className="text-amber-400">2. RESTORE POWER:</strong> Take all 3 fuses to the North Substation distribution cabinet, insert them, and flip the main breaker.
              </p>
              <p>
                <strong className="text-rose-400">3. VERTICAL SURVIVAL:</strong> Teke Teke moves on her hands and torso. <span className="underline decoration-red-500 font-bold">She cannot climb ladders, wooden ramps, or elevated containers</span>. If she chases you, climb to high ground immediately to survive!
              </p>
              <p>
                <strong className="text-amber-400">4. SPATIAL AUDIO:</strong> Listen for her signature metallic dragging scrapes (<span className="text-red-400 italic">teke-teke-teke</span>) through your headphones to determine distance and direction.
              </p>
            </div>

            <button
              onClick={() => setShowLore(false)}
              className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white text-xs font-bold uppercase tracking-wider rounded-xs"
            >
              UNDERSTOOD · CLOSE
            </button>
          </div>
        </div>
      )}

      {/* Bottom Bar: Engine & System Info */}
      <div className="flex justify-between items-end text-[10px] text-neutral-600 border-t border-neutral-900 pt-3">
        <span>PS1 RETRO HORROR ENGINE · TOUCH & DESKTOP COMPATIBLE</span>
        <span>VERSION 1.0.4 · 1998 RAIL ARCHIVE</span>
      </div>
    </div>
  );
};
