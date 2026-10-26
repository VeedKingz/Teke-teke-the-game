/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Download, 
  Smartphone, 
  Package, 
  CheckCircle2, 
  Copy, 
  ExternalLink, 
  FileCode,
  Terminal,
  X
} from 'lucide-react';
import { usePWAInstall } from '../game/usePWAInstall';
import { generateAndroidProjectZip, triggerBlobDownload } from '../game/apkExporter';

interface DownloadAPKModalProps {
  onClose: () => void;
}

export const DownloadAPKModal: React.FC<DownloadAPKModalProps> = ({ onClose }) => {
  const { isInstallable, isInstalled, install, isAndroid, isIOS } = usePWAInstall();
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const appUrl = 'https://ais-pre-jug7p2qiofimb5bkkczdkr-358027540989.asia-southeast1.run.app';

  const handleDownloadZip = async () => {
    setIsExporting(true);
    try {
      const blob = await generateAndroidProjectZip();
      triggerBlobDownload(blob, 'teke-teke-game-android-project.zip');
    } catch (e) {
      console.error('Failed to export zip:', e);
    } finally {
      setIsExporting(false);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex items-center justify-center p-4 font-mono select-none">
      <div className="bg-neutral-950 border-2 border-red-700 max-w-xl w-full p-5 sm:p-6 text-neutral-200 space-y-5 rounded-xs shadow-[0_0_50px_rgba(220,38,38,0.4)] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-red-950/80 pb-3">
          <div className="flex items-center gap-2 text-red-500 font-bold uppercase tracking-wider text-base">
            <Smartphone className="w-5 h-5 text-red-500" />
            <span>ANDROID APK & INSTALLATION OPTIONS</span>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white font-bold p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Option 1: 1-Tap Direct Phone Install (WebAPK) */}
        <div className="bg-neutral-900/90 border border-emerald-600/60 p-4 rounded-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5 uppercase tracking-wide">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              METHOD 1: INSTANT 1-TAP ANDROID INSTALL (RECOMMENDED)
            </span>
            <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700 px-1.5 py-0.5 rounded-2xs font-bold">
              NO PC NEEDED
            </span>
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed">
            Installs directly onto your Android device as a standalone fullscreen game with offline support, home screen icon, and app drawer integration via Android WebAPK.
          </p>

          {isInstalled ? (
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold bg-emerald-950/60 p-2.5 border border-emerald-700/60 rounded-xs">
              <CheckCircle2 className="w-4 h-4" />
              <span>TEKE TEKE IS ALREADY INSTALLED IN FULLSCREEN STANDALONE MODE!</span>
            </div>
          ) : isInstallable ? (
            <button
              onClick={install}
              className="w-full py-3 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white text-xs font-black tracking-widest uppercase flex items-center justify-center gap-2 border border-emerald-400 rounded-xs transition shadow-lg cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>INSTALL TEKE TEKE ON THIS DEVICE NOW</span>
            </button>
          ) : (
            <div className="text-[11px] text-neutral-400 bg-black/60 p-2.5 border border-neutral-800 rounded-xs">
              💡 <strong>On Android Chrome / Brave / Edge:</strong> Tap your browser menu (<span className="text-amber-400 font-bold">⋮</span>) and select <span className="text-emerald-400 font-bold">"Install App"</span> or <span className="text-emerald-400 font-bold">"Add to Home Screen"</span> to generate the native Android WebAPK.
            </div>
          )}
        </div>

        {/* Option 2: Download Full Android Studio Project (.ZIP) */}
        <div className="bg-neutral-900/90 border border-neutral-700 p-4 rounded-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-400 flex items-center gap-1.5 uppercase tracking-wide">
              <Package className="w-4 h-4 text-amber-500" />
              METHOD 2: DOWNLOAD COMPLETE ANDROID STUDIO PROJECT (.ZIP)
            </span>
            <span className="text-[10px] bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded-2xs font-bold">
              SOURCE APK
            </span>
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed">
            Download the complete, pre-configured Android Gradle project containing <code className="text-amber-300">AndroidManifest.xml</code>, <code className="text-amber-300">MainActivity.java</code> (Hardware accelerated fullscreen WebView), and build scripts ready to compile into <code className="text-amber-300">app-release.apk</code> in Android Studio or via <code className="text-neutral-400">./gradlew assembleRelease</code>.
          </p>
          <button
            onClick={handleDownloadZip}
            disabled={isExporting}
            className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-black text-xs font-black tracking-wider uppercase flex items-center justify-center gap-2 border border-amber-300 rounded-xs transition cursor-pointer disabled:opacity-50"
          >
            <FileCode className="w-4 h-4" />
            <span>{isExporting ? 'PACKAGING ANDROID PROJECT...' : 'DOWNLOAD ANDROID STUDIO PROJECT (.ZIP)'}</span>
          </button>
        </div>

        {/* Option 3: 1-Click Cloud APK Builder */}
        <div className="bg-neutral-900/90 border border-neutral-700 p-4 rounded-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-cyan-400 flex items-center gap-1.5 uppercase tracking-wide">
              <ExternalLink className="w-4 h-4 text-cyan-400" />
              METHOD 3: 1-CLICK CLOUD APK GENERATOR (PWABUILDER)
            </span>
            <span className="text-[10px] bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded-2xs font-bold border border-cyan-800">
              FREE CLOUD
            </span>
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed">
            Generate and package an installable, signed Android APK directly in the cloud through Microsoft PWABuilder without needing Android Studio installed.
          </p>
          <a
            href={`https://www.pwabuilder.com?url=${encodeURIComponent(appUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-cyan-300 text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 border border-cyan-600/70 rounded-xs transition text-center"
          >
            <span>OPEN PWABUILDER WITH THIS GAME URL</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Mobile URL share box */}
        <div className="bg-black/80 border border-neutral-800 p-3 rounded-xs flex items-center justify-between gap-2">
          <div className="text-[11px] truncate text-neutral-400">
            <span className="text-neutral-500 font-bold block text-[9px] uppercase">MOBILE GAME URL</span>
            {appUrl}
          </div>
          <button
            onClick={copyUrl}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold rounded-2xs flex items-center gap-1 transition shrink-0 cursor-pointer"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'COPIED!' : 'COPY URL'}</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-bold text-xs uppercase tracking-wider rounded-xs border border-neutral-700 transition"
        >
          CLOSE
        </button>
      </div>
    </div>
  );
};
