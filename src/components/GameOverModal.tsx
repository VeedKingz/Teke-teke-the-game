/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Skull, RotateCcw, Home } from 'lucide-react';

interface GameOverModalProps {
  survivalTimeSec: number;
  fusesFound: number;
  onRetry: () => void;
  onMainMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  survivalTimeSec,
  fusesFound,
  onRetry,
  onMainMenu,
}) => {
  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 font-mono select-none">
      <div className="bg-red-950/20 border-2 border-red-700 max-w-md w-full p-6 text-center space-y-6 rounded-xs shadow-[0_0_50px_rgba(220,38,38,0.3)]">
        <div className="space-y-2">
          <div className="inline-flex p-3 bg-red-900/40 rounded-full border border-red-600 mb-1">
            <Skull className="w-10 h-10 text-red-500 animate-pulse" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-red-500 tracking-widest uppercase">
            YOU WERE CAUGHT
          </h2>
          <p className="text-xs text-red-300 italic tracking-wider">
            "Tek-tek-tek... the dragging stops right behind your neck."
          </p>
        </div>

        {/* Survival summary */}
        <div className="bg-black/80 border border-neutral-800 p-3.5 rounded-xs grid grid-cols-2 gap-3 text-left">
          <div>
            <div className="text-[10px] text-neutral-500 font-bold uppercase">TIME SURVIVED</div>
            <div className="text-base font-bold text-neutral-200 tabular-nums">
              {formatTime(survivalTimeSec)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-neutral-500 font-bold uppercase">FUSES RETRIEVED</div>
            <div className="text-base font-bold text-amber-400 tabular-nums">
              {fusesFound} / 3
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          <button
            onClick={onRetry}
            className="w-full py-3 bg-red-800 hover:bg-red-700 active:bg-red-900 text-white font-bold text-sm tracking-wider flex items-center justify-center gap-2 border border-red-500 rounded-xs shadow-lg transition"
          >
            <RotateCcw className="w-4 h-4" />
            <span>TRY AGAIN FROM OFFICE</span>
          </button>

          <button
            onClick={onMainMenu}
            className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 font-bold text-xs tracking-wider flex items-center justify-center gap-2 border border-neutral-700 rounded-xs transition"
          >
            <Home className="w-4 h-4" />
            <span>RETURN TO TITLE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
