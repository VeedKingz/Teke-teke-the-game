/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, RotateCcw, Settings, Home } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onOpenDownloadModal: () => void;
  onMainMenu: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onOpenSettings,
  onOpenDownloadModal,
  onMainMenu,
}) => {
  return (
    <div className="fixed inset-0 z-40 bg-black/85 flex items-center justify-center p-4 font-mono select-none">
      <div className="bg-neutral-950 border-2 border-neutral-700 max-w-sm w-full p-6 text-center space-y-5 rounded-xs shadow-2xl">
        <div className="border-b border-neutral-800 pb-3">
          <h2 className="text-xl font-black text-red-500 tracking-widest uppercase">
            SIMULATION PAUSED
          </h2>
          <p className="text-xs text-neutral-500 mt-1">OPERATIONAL FREEZE ACTIVE</p>
        </div>

        <div className="space-y-2.5">
          <button
            onClick={onResume}
            className="w-full py-3 bg-red-800 hover:bg-red-700 active:bg-red-900 text-white font-bold text-sm tracking-wider flex items-center justify-center gap-2 border border-red-600 rounded-xs transition cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>RESUME SURVIVAL</span>
          </button>

          <button
            onClick={onOpenDownloadModal}
            className="w-full py-2.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 font-bold text-xs tracking-wider flex items-center justify-center gap-2 border border-emerald-600 rounded-xs transition cursor-pointer shadow-md"
          >
            <span>📱 GET ANDROID APK / INSTALL</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-bold text-xs tracking-wider flex items-center justify-center gap-2 border border-neutral-700 rounded-xs transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-amber-500" />
            <span>RESTART GAME</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-bold text-xs tracking-wider flex items-center justify-center gap-2 border border-neutral-700 rounded-xs transition"
          >
            <Settings className="w-4 h-4" />
            <span>SETTINGS</span>
          </button>

          <button
            onClick={onMainMenu}
            className="w-full py-2.5 bg-neutral-950 hover:bg-neutral-900 text-neutral-400 font-bold text-xs tracking-wider flex items-center justify-center gap-2 border border-neutral-800 rounded-xs transition"
          >
            <Home className="w-4 h-4" />
            <span>MAIN MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
