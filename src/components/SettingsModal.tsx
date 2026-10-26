/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameSettings } from '../game/types';
import { Sliders, Volume2, Monitor, Eye } from 'lucide-react';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 font-mono select-none">
      <div className="bg-neutral-950 border-2 border-neutral-700 max-w-md w-full p-6 text-neutral-200 space-y-5 rounded-xs shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2 text-red-500 font-bold uppercase tracking-wider text-base">
            <Sliders className="w-5 h-5" />
            <span>OPERATIONAL SETTINGS</span>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white font-bold"
          >
            [X]
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Sensitivity */}
          <div>
            <div className="flex justify-between font-bold mb-1">
              <span className="flex items-center gap-1.5 text-neutral-300">
                <Eye className="w-4 h-4 text-amber-500" /> LOOK SENSITIVITY
              </span>
              <span className="text-amber-400">{settings.lookSensitivity.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.4"
              max="2.5"
              step="0.1"
              value={settings.lookSensitivity}
              onChange={(e) => onUpdateSettings({ lookSensitivity: parseFloat(e.target.value) })}
              className="w-full accent-red-600 bg-neutral-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Invert Y */}
          <div className="flex items-center justify-between py-1">
            <span className="font-bold text-neutral-300">INVERT VERTICAL LOOK (Y-AXIS)</span>
            <input
              type="checkbox"
              checked={settings.invertY}
              onChange={(e) => onUpdateSettings({ invertY: e.target.checked })}
              className="w-4 h-4 accent-red-600 cursor-pointer"
            />
          </div>

          {/* Graphics & Mobile Performance */}
          <div className="border-t border-neutral-800 pt-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold text-amber-400">
                <Monitor className="w-4 h-4 text-amber-500" /> GRAPHICS PROFILE
              </span>
              <div className="flex gap-1">
                {(['low', 'medium', 'high'] as const).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      if (preset === 'low') {
                        onUpdateSettings({
                          graphicsQuality: 'low',
                          enableShadows: false,
                          resolutionScale: 0.75,
                        });
                      } else if (preset === 'medium') {
                        onUpdateSettings({
                          graphicsQuality: 'medium',
                          enableShadows: true,
                          resolutionScale: 1.0,
                        });
                      } else {
                        onUpdateSettings({
                          graphicsQuality: 'high',
                          enableShadows: true,
                          resolutionScale: 1.25,
                        });
                      }
                    }}
                    className={`px-2 py-1 uppercase text-[10px] font-bold rounded-2xs border transition cursor-pointer ${
                      settings.graphicsQuality === preset
                        ? 'bg-amber-600 border-amber-400 text-black'
                        : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {preset === 'low' ? 'Android Low' : preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick 1-click Low-end Android Optimization banner */}
            <button
              type="button"
              onClick={() => {
                onUpdateSettings({
                  graphicsQuality: 'low',
                  enableShadows: false,
                  resolutionScale: 0.75,
                  crtEffect: false,
                });
              }}
              className="w-full py-1.5 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-600/60 text-amber-300 text-[11px] font-bold rounded-2xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>⚡ APPLY LOW-END ANDROID BOOST (MAX FPS)</span>
            </button>

            {/* Resolution Scale Slider */}
            <div>
              <div className="flex justify-between font-bold mb-1">
                <span className="text-neutral-300">RESOLUTION SCALE (GPU LOAD)</span>
                <span className="text-amber-400">{(settings.resolutionScale * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.6"
                max="1.25"
                step="0.05"
                value={settings.resolutionScale}
                onChange={(e) => onUpdateSettings({ resolutionScale: parseFloat(e.target.value) })}
                className="w-full accent-amber-500 bg-neutral-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-neutral-500 mt-0.5">
                <span>0.6x (Budget Phones)</span>
                <span>1.0x (Native)</span>
                <span>1.25x (High-end)</span>
              </div>
            </div>

            {/* Dynamic Shadows Checkbox */}
            <div className="flex items-center justify-between py-1">
              <span className="text-neutral-300 font-bold">DYNAMIC FLASHLIGHT SHADOWS</span>
              <input
                type="checkbox"
                checked={settings.enableShadows}
                onChange={(e) => onUpdateSettings({ enableShadows: e.target.checked })}
                className="w-4 h-4 accent-amber-500 cursor-pointer"
              />
            </div>

            {/* CRT Scanline Filter */}
            <div className="flex items-center justify-between py-1">
              <span className="text-neutral-300 font-bold">PS1 CRT SCANLINE & VIGNETTE</span>
              <input
                type="checkbox"
                checked={settings.crtEffect}
                onChange={(e) => onUpdateSettings({ crtEffect: e.target.checked })}
                className="w-4 h-4 accent-amber-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Master Volume */}
          <div className="border-t border-neutral-800 pt-3">
            <div className="flex justify-between font-bold mb-1">
              <span className="flex items-center gap-1.5 text-neutral-300">
                <Volume2 className="w-4 h-4 text-emerald-400" /> MASTER AUDIO
              </span>
              <span className="text-emerald-400">{Math.round(settings.masterVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.masterVolume}
              onChange={(e) => onUpdateSettings({ masterVolume: parseFloat(e.target.value) })}
              className="w-full accent-red-600 bg-neutral-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Ambient Drone Volume */}
          <div>
            <div className="flex justify-between font-bold mb-1">
              <span className="text-neutral-400">ATMOSPHERIC AMBIENCE</span>
              <span className="text-neutral-300">{Math.round(settings.ambientVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.ambientVolume}
              onChange={(e) => onUpdateSettings({ ambientVolume: parseFloat(e.target.value) })}
              className="w-full accent-red-600 bg-neutral-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* SFX Volume */}
          <div>
            <div className="flex justify-between font-bold mb-1">
              <span className="text-neutral-400">SOUND EFFECTS & SPATIAL AUDIO</span>
              <span className="text-neutral-300">{Math.round(settings.sfxVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.sfxVolume}
              onChange={(e) => onUpdateSettings({ sfxVolume: parseFloat(e.target.value) })}
              className="w-full accent-red-600 bg-neutral-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs uppercase tracking-wider rounded-xs border border-neutral-600 transition"
        >
          CONFIRM & RETURN
        </button>
      </div>
    </div>
  );
};
