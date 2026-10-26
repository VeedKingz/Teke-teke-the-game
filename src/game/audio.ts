/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

class GameAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  // Spatial audio for Teke Teke
  private tekePanner: PannerNode | null = null;
  private tekeScrapeGain: GainNode | null = null;
  private isTekeScrapingActive: boolean = false;
  private tekeScrapeTimer: number | null = null;
  private tekeScrapeRate: number = 750; // ms interval between scrapes

  // Ambient sound nodes
  private ambientOsc1: OscillatorNode | null = null;
  private ambientNoiseNode: AudioBufferSourceNode | null = null;
  private ambientFilter: BiquadFilterNode | null = null;

  // Heartbeat
  private heartbeatTimer: number | null = null;
  private heartbeatRate: number = 1200; // ms between beats
  private isHeartbeatActive: boolean = false;

  // Cached pre-generated audio buffers for Zero-GC audio on Android
  private scrapeBuffer: AudioBuffer | null = null;
  private footstepGravelBuffer: AudioBuffer | null = null;
  private footstepMetalBuffer: AudioBuffer | null = null;
  private sparkBuffer: AudioBuffer | null = null;

  private isMuted: boolean = false;
  private masterVolume: number = 0.8;
  private ambientVolume: number = 0.6;
  private sfxVolume: number = 0.9;

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(this.ambientVolume, this.ctx.currentTime);
      this.ambientGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Create 3D Panner for Teke Teke
      this.tekePanner = this.ctx.createPanner();
      this.tekePanner.panningModel = 'HRTF';
      this.tekePanner.distanceModel = 'inverse';
      this.tekePanner.refDistance = 3;
      this.tekePanner.maxDistance = 65;
      this.tekePanner.rolloffFactor = 1.3;
      this.tekePanner.coneInnerAngle = 360;

      this.tekeScrapeGain = this.ctx.createGain();
      this.tekeScrapeGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.tekeScrapeGain.connect(this.tekePanner);
      this.tekePanner.connect(this.sfxGain);

      // Pre-generate reusable audio buffers to avoid GC pauses on mobile
      this.prebakeBuffers();

      this.startAmbientDrone();
    } catch (e) {
      console.warn('AudioContext failed to initialize:', e);
    }
  }

  private prebakeBuffers() {
    if (!this.ctx) return;
    const rate = this.ctx.sampleRate;

    // 1. Scrape friction noise buffer
    const scrapeLen = Math.floor(rate * 0.18);
    this.scrapeBuffer = this.ctx.createBuffer(1, scrapeLen, rate);
    const sData = this.scrapeBuffer.getChannelData(0);
    for (let i = 0; i < scrapeLen; i++) {
      sData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (scrapeLen * 0.6));
    }

    // 2. Gravel footstep noise buffer
    const stepLen = Math.floor(rate * 0.07);
    this.footstepGravelBuffer = this.ctx.createBuffer(1, stepLen, rate);
    const gData = this.footstepGravelBuffer.getChannelData(0);
    for (let i = 0; i < stepLen; i++) {
      gData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (stepLen * 0.4));
    }

    // 3. Metal walkway step buffer
    const metalStepLen = Math.floor(rate * 0.09);
    this.footstepMetalBuffer = this.ctx.createBuffer(1, metalStepLen, rate);
    const mData = this.footstepMetalBuffer.getChannelData(0);
    for (let i = 0; i < metalStepLen; i++) {
      mData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (metalStepLen * 0.5));
    }

    // 4. Spark noise buffer
    const sparkLen = Math.floor(rate * 0.35);
    this.sparkBuffer = this.ctx.createBuffer(1, sparkLen, rate);
    const spData = this.sparkBuffer.getChannelData(0);
    for (let i = 0; i < sparkLen; i++) {
      spData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sparkLen * 0.15));
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolumes(master: number, ambient: number, sfx: number) {
    this.masterVolume = master;
    this.ambientVolume = ambient;
    this.sfxVolume = sfx;
    if (this.ctx && this.masterGain && this.ambientGain && this.sfxGain) {
      const t = this.ctx.currentTime;
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : master, t, 0.05);
      this.ambientGain.gain.setTargetAtTime(ambient, t, 0.05);
      this.sfxGain.gain.setTargetAtTime(sfx, t, 0.05);
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : this.masterVolume, this.ctx.currentTime, 0.05);
    }
  }

  // Update AudioListener orientation & position relative to player camera
  public updateListener(camera: THREE.Camera) {
    if (!this.ctx) return;
    const pos = camera.position;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

    const listener = this.ctx.listener;
    if (listener.positionX) {
      const t = this.ctx.currentTime;
      listener.positionX.setTargetAtTime(pos.x, t, 0.05);
      listener.positionY.setTargetAtTime(pos.y, t, 0.05);
      listener.positionZ.setTargetAtTime(pos.z, t, 0.05);
      listener.forwardX.setTargetAtTime(forward.x, t, 0.05);
      listener.forwardY.setTargetAtTime(forward.y, t, 0.05);
      listener.forwardZ.setTargetAtTime(forward.z, t, 0.05);
      listener.upX.setTargetAtTime(up.x, t, 0.05);
      listener.upY.setTargetAtTime(up.y, t, 0.05);
      listener.upZ.setTargetAtTime(up.z, t, 0.05);
    } else {
      // Fallback for older Safari
      (listener as any).setPosition(pos.x, pos.y, pos.z);
      (listener as any).setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
    }
  }

  // Update Teke Teke 3D position for spatial audio
  public updateTekePosition(pos: THREE.Vector3, isChasing: boolean, distanceToPlayer: number) {
    if (!this.ctx || !this.tekePanner) return;
    const t = this.ctx.currentTime;
    if (this.tekePanner.positionX) {
      this.tekePanner.positionX.setTargetAtTime(pos.x, t, 0.05);
      this.tekePanner.positionY.setTargetAtTime(pos.y, t, 0.05);
      this.tekePanner.positionZ.setTargetAtTime(pos.z, t, 0.05);
    } else {
      (this.tekePanner as any).setPosition(pos.x, pos.y, pos.z);
    }

    // Accelerate scrape speed in chase or proximity
    this.tekeScrapeRate = isChasing ? 320 : Math.max(480, 480 + (distanceToPlayer * 15));

    // Control heartbeat based on proximity
    if (distanceToPlayer < 24) {
      const targetHeartRate = Math.max(350, 400 + distanceToPlayer * 35);
      this.setHeartbeat(true, targetHeartRate);
    } else {
      this.setHeartbeat(false, 1000);
    }
  }

  // Start continuous rhythmic scraping
  public startTekeScraping() {
    if (this.isTekeScrapingActive) return;
    this.isTekeScrapingActive = true;
    this.scheduleNextTekeScrape();
  }

  public stopTekeScraping() {
    this.isTekeScrapingActive = false;
    if (this.tekeScrapeTimer) {
      window.clearTimeout(this.tekeScrapeTimer);
      this.tekeScrapeTimer = null;
    }
  }

  private scheduleNextTekeScrape() {
    if (!this.isTekeScrapingActive) return;
    this.playTekeScrapeImpulse();
    this.tekeScrapeTimer = window.setTimeout(() => {
      this.scheduleNextTekeScrape();
    }, this.tekeScrapeRate);
  }

  // Procedural TEKE-TEKE scraping sound: metallic friction blade dragged across stone/gravel
  public playTekeScrapeImpulse() {
    if (!this.ctx || !this.tekeScrapeGain || !this.scrapeBuffer) return;
    try {
      const t = this.ctx.currentTime;

      // 1. Friction noise burst from cached buffer
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.scrapeBuffer;

      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(1400 + Math.random() * 600, t);
      bandpass.Q.setValueAtTime(4.5, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.7, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.16);

      noise.connect(bandpass);
      bandpass.connect(gain);
      gain.connect(this.tekeScrapeGain);
      noise.start(t);

      // 2. Metallic blade / scythe clank (the "TEKE" sharp sound)
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320 + Math.random() * 80, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.14);

      const metalGain = this.ctx.createGain();
      metalGain.gain.setValueAtTime(0.45, t);
      metalGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      osc.connect(metalGain);
      metalGain.connect(this.tekeScrapeGain);
      osc.start(t);
      osc.stop(t + 0.15);
    } catch (e) {
      // Audio fallback
    }
  }

  // Heartbeat sound
  public setHeartbeat(active: boolean, intervalMs: number = 800) {
    this.heartbeatRate = intervalMs;
    if (active && !this.isHeartbeatActive) {
      this.isHeartbeatActive = true;
      this.loopHeartbeat();
    } else if (!active && this.isHeartbeatActive) {
      this.isHeartbeatActive = false;
      if (this.heartbeatTimer) {
        window.clearTimeout(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }
    }
  }

  private loopHeartbeat() {
    if (!this.isHeartbeatActive) return;
    this.playHeartbeatThud();
    this.heartbeatTimer = window.setTimeout(() => {
      this.loopHeartbeat();
    }, this.heartbeatRate);
  }

  private playHeartbeatThud() {
    if (!this.ctx || !this.sfxGain) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(85, t);
      osc.frequency.exponentialRampToValueAtTime(35, t + 0.12);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.65, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.15);

      // Second smaller lub-DUB echo
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(75, t + 0.14);
      osc2.frequency.exponentialRampToValueAtTime(30, t + 0.24);

      const gain2 = this.ctx.createGain();
      gain2.gain.setValueAtTime(0, t);
      gain2.gain.setValueAtTime(0.4, t + 0.14);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.26);

      osc2.connect(gain2);
      gain2.connect(this.sfxGain);
      osc2.start(t + 0.14);
      osc2.stop(t + 0.27);
    } catch (e) {}
  }

  // Player footstep sounds
  public playFootstep(isElevated: boolean, isSprinting: boolean) {
    if (!this.ctx || !this.sfxGain) return;
    const buffer = isElevated ? this.footstepMetalBuffer : this.footstepGravelBuffer;
    if (!buffer) return;
    try {
      const t = this.ctx.currentTime;
      const duration = isElevated ? 0.08 : 0.06;

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = isElevated ? 'bandpass' : 'lowpass';
      filter.frequency.setValueAtTime(isElevated ? 800 : 400 + Math.random() * 150, t);
      if (isElevated) filter.Q.setValueAtTime(6.0, t);

      const gain = this.ctx.createGain();
      const vol = isSprinting ? 0.45 : 0.25;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      noise.start(t);
    } catch (e) {}
  }

  // Flashlight toggle click
  public playFlashlightClick(turnOn: boolean) {
    if (!this.ctx || !this.sfxGain) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(turnOn ? 1200 : 800, t);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.03);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.04);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.04);
    } catch (e) {}
  }

  // Fuse pickup chime
  public playFusePickup() {
    if (!this.ctx || !this.sfxGain) return;
    try {
      const t = this.ctx.currentTime;
      [440, 660, 880].forEach((freq, idx) => {
        if (!this.ctx || !this.sfxGain) return;
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.08);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, t);
        gain.gain.setValueAtTime(0.4, t + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.25);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t + idx * 0.08);
        osc.stop(t + idx * 0.08 + 0.26);
      });
    } catch (e) {}
  }

  // Battery pickup sound
  public playBatteryPickup() {
    if (!this.ctx || !this.sfxGain) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(750, t + 0.18);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.2);
    } catch (e) {}
  }

  // Fuse insert into socket
  public playFuseInsert() {
    if (!this.ctx || !this.sfxGain) return;
    try {
      const t = this.ctx.currentTime;
      // Heavy mechanical latch & spark
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.14);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.15);
    } catch (e) {}
  }

  // Power restoration: heavy breaker throw & substation electrical surge
  public playPowerRestoration() {
    if (!this.ctx || !this.sfxGain) return;
    try {
      const t = this.ctx.currentTime;
      // 1. Heavy clunk
      const clunk = this.ctx.createOscillator();
      clunk.type = 'sawtooth';
      clunk.frequency.setValueAtTime(90, t);
      clunk.frequency.exponentialRampToValueAtTime(30, t + 0.3);

      const clunkGain = this.ctx.createGain();
      clunkGain.gain.setValueAtTime(0.8, t);
      clunkGain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

      clunk.connect(clunkGain);
      clunkGain.connect(this.sfxGain);
      clunk.start(t);
      clunk.stop(t + 0.36);

      // 2. Transformer surge
      const surge = this.ctx.createOscillator();
      surge.type = 'sawtooth';
      surge.frequency.setValueAtTime(60, t + 0.1);
      surge.frequency.exponentialRampToValueAtTime(120, t + 1.2);

      const surgeGain = this.ctx.createGain();
      surgeGain.gain.setValueAtTime(0, t);
      surgeGain.gain.setValueAtTime(0.6, t + 0.1);
      surgeGain.gain.exponentialRampToValueAtTime(0.05, t + 2.5);

      surge.connect(surgeGain);
      surgeGain.connect(this.sfxGain);
      surge.start(t + 0.1);
      surge.stop(t + 2.6);
    } catch (e) {}
  }

  // Blackout spark / electrical pop
  public playBlackoutSound() {
    if (!this.ctx || !this.sfxGain || !this.sparkBuffer) return;
    try {
      const t = this.ctx.currentTime;
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.sparkBuffer;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.9, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      noise.connect(gain);
      gain.connect(this.sfxGain);
      noise.start(t);
    } catch (e) {}
  }

  // Horror jumpscare sting
  public playHorrorSting() {
    if (!this.ctx || !this.sfxGain) return;
    try {
      const t = this.ctx.currentTime;
      // Dissonant tritone chord with harsh sawtooth
      [130.81, 185.0, 246.94, 349.23].forEach((f) => {
        if (!this.ctx || !this.sfxGain) return;
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, t);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2500, t);
        filter.frequency.exponentialRampToValueAtTime(300, t + 1.2);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 1.25);
      });
    } catch (e) {}
  }

  // Gate motor opening & grinding metal
  public playGateOpenSound() {
    if (!this.ctx || !this.sfxGain) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(80, t);
      osc.frequency.linearRampToValueAtTime(95, t + 3.0);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 3.0);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 3.5);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 3.5);
    } catch (e) {}
  }

  // Ambient wind & distant industrial night drone
  private startAmbientDrone() {
    if (!this.ctx || !this.ambientGain) return;
    try {
      const t = this.ctx.currentTime;

      // Low frequency hum
      this.ambientOsc1 = this.ctx.createOscillator();
      this.ambientOsc1.type = 'sine';
      this.ambientOsc1.frequency.setValueAtTime(55, t); // 55Hz electrical mains hum

      const oscGain = this.ctx.createGain();
      oscGain.gain.setValueAtTime(0.15, t);
      this.ambientOsc1.connect(oscGain);
      oscGain.connect(this.ambientGain);
      this.ambientOsc1.start();

      // Filtered wind noise
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Brown noise
        data[i] = (last + (0.02 * white)) / 1.02;
        last = data[i];
        data[i] *= 3.5;
      }

      this.ambientNoiseNode = this.ctx.createBufferSource();
      this.ambientNoiseNode.buffer = buffer;
      this.ambientNoiseNode.loop = true;

      this.ambientFilter = this.ctx.createBiquadFilter();
      this.ambientFilter.type = 'lowpass';
      this.ambientFilter.frequency.setValueAtTime(250, t);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.35, t);

      this.ambientNoiseNode.connect(this.ambientFilter);
      this.ambientFilter.connect(noiseGain);
      noiseGain.connect(this.ambientGain);
      this.ambientNoiseNode.start();
    } catch (e) {}
  }

  public dispose() {
    this.stopTekeScraping();
    this.setHeartbeat(false);
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

export const gameAudio = new GameAudioEngine();
