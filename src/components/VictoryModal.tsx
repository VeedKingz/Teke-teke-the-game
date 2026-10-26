/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Award, RotateCcw, Home, CheckCircle2 } from 'lucide-react';
import { EndGameStats } from '../game/types';

interface VictoryModalProps {
  stats: EndGameStats;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  stats,
  onPlayAgain,
  onMainMenu,
}) => {
  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}m ${s.toString().padStart(2, '0')}s`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 font-mono select-none">
      <div className="bg-neutral-950 border-2 border-emerald-600 max-w-md w-full p-6 text-center space-y-6 rounded-xs shadow-[0_0_50px_rgba(16,185,129,0.3)]">
        <div className="space-y-2">
          <div className="inline-flex p-3 bg-emerald-950/70 rounded-full border border-emerald-500 mb-1">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-widest uppercase">
            ESCAPED THE YARD
          </h2>
          <p className="text-xs text-neutral-400 tracking-wide">
            The heavy security gate crashed shut behind you. The dragging scrapes fade into the dark.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="bg-black/90 border border-neutral-800 p-4 rounded-xs grid grid-cols-2 gap-3 text-left">
          <div>
            <div className="text-[10px] text-neutral-500 font-bold uppercase">ESCAPE TIME</div>
            <div className="text-base font-bold text-neutral-200 tabular-nums">
              {formatTime(stats.survivalTimeSec)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-neutral-500 font-bold uppercase">SURVIVAL RANK</div>
            <div className="text-xl font-black text-amber-400 tracking-wider">
              {stats.rating}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-neutral-500 font-bold uppercase">FUSES INSTALLED</div>
            <div className="text-sm font-bold text-emerald-400">
              3 / 3 COMPLETE
            </div>
          </div>
          <div>
            <div className="text-[10px] text-neutral-500 font-bold uppercase">GRID STATUS</div>
            <div className="text-sm font-bold text-emerald-400">
              RESTORED
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          <button
            onClick={onPlayAgain}
            className="w-full py-3 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white font-bold text-sm tracking-wider flex items-center justify-center gap-2 border border-emerald-400 rounded-xs shadow-lg transition"
          >
            <RotateCcw className="w-4 h-4" />
            <span>PLAY AGAIN</span>
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
