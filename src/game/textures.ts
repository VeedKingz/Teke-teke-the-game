/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

// Cache generated textures so we don't recreate them repeatedly
const textureCache = new Map<string, THREE.CanvasTexture>();

function createNoise(ctx: CanvasRenderingContext2D, width: number, height: number, opacity: number = 0.15) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 255 * opacity;
    data[i] = Math.min(255, Math.max(0, data[i] + n));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n));
  }
  ctx.putImageData(imgData, 0, 0);
}

// 1. Corrugated Shipping Container Texture (Rusted metal with vertical ribs)
export function getContainerTexture(baseHex: string, rustAmount: number = 0.5): THREE.CanvasTexture {
  const key = `container_${baseHex}_${rustAmount}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 128; // Authentic PS1 low resolution
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Base metal
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 128, 128);

  // Corrugated vertical stripes (shadows & highlights)
  const ribWidth = 16;
  for (let x = 0; x < 128; x += ribWidth) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(x, 0, 3, 128);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fillRect(x + ribWidth - 4, 0, 4, 128);
  }

  // Rust patches
  for (let i = 0; i < 28; i++) {
    const rx = Math.random() * 128;
    const ry = Math.random() * 128;
    const rsize = 6 + Math.random() * 18;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(92, 42, 22, 0.75)' : 'rgba(138, 59, 29, 0.65)';
    ctx.beginPath();
    ctx.arc(rx, ry, rsize, 0, Math.PI * 2);
    ctx.fill();
  }

  createNoise(ctx, 128, 128, 0.25);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  textureCache.set(key, texture);
  return texture;
}

// 2. Grimy Industrial Concrete & Wall Plaster
export function getConcreteTexture(): THREE.CanvasTexture {
  const key = 'concrete';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#2c2d30';
  ctx.fillRect(0, 0, 128, 128);

  // Subtle concrete blotches
  for (let i = 0; i < 35; i++) {
    const x = Math.random() * 128;
    const y = Math.random() * 128;
    const r = 4 + Math.random() * 16;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(60, 62, 65, 0.35)' : 'rgba(20, 21, 24, 0.45)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Stains and grease drippings
  for (let j = 0; j < 5; j++) {
    const x = Math.random() * 128;
    ctx.fillStyle = 'rgba(15, 12, 10, 0.6)';
    ctx.fillRect(x, Math.random() * 40, 4 + Math.random() * 6, 30 + Math.random() * 60);
  }

  createNoise(ctx, 128, 128, 0.3);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  textureCache.set(key, texture);
  return texture;
}

// 3. Railway Tracks & Ballast (Gravel & Steel rails)
export function getRailTrackTexture(): THREE.CanvasTexture {
  const key = 'rail_track';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Dark crushed ballast gravel ground
  ctx.fillStyle = '#1e1b18';
  ctx.fillRect(0, 0, 128, 128);

  // Wooden Railroad ties (horizontal sleepers)
  for (let y = 8; y < 128; y += 32) {
    ctx.fillStyle = '#3a271d';
    ctx.fillRect(4, y, 120, 14);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(4, y + 10, 120, 4);
  }

  // Parallel steel rails running vertically
  const railX1 = 28;
  const railX2 = 100;
  [railX1, railX2].forEach((rx) => {
    // Rail shadow
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(rx - 1, 0, 8, 128);
    // Rail head steel shine
    ctx.fillStyle = '#7a7672';
    ctx.fillRect(rx, 0, 5, 128);
    ctx.fillStyle = '#b8b2a8';
    ctx.fillRect(rx + 1, 0, 2, 128);
  });

  createNoise(ctx, 128, 128, 0.35);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  textureCache.set(key, texture);
  return texture;
}

// 4. Yellow/Black Industrial Hazard Stripes
export function getHazardStripeTexture(): THREE.CanvasTexture {
  const key = 'hazard_stripes';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#b89218'; // Dirty weathered yellow
  ctx.fillRect(0, 0, 64, 64);

  ctx.fillStyle = '#18181a'; // Dark charcoal
  const stripeWidth = 16;
  ctx.beginPath();
  for (let i = -64; i < 128; i += stripeWidth * 2) {
    ctx.moveTo(i, 0);
    ctx.lineTo(i + stripeWidth, 0);
    ctx.lineTo(i + stripeWidth + 64, 64);
    ctx.lineTo(i + 64, 64);
    ctx.closePath();
  }
  ctx.fill();

  createNoise(ctx, 64, 64, 0.25);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  textureCache.set(key, texture);
  return texture;
}

// 5. CRT Terminal Monitor Screen (Green Phosphor on Black)
export function getCRTMonitorTexture(text: string = 'SYSTEM OFFLINE'): THREE.CanvasTexture {
  const key = `crt_${text}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#050c05';
  ctx.fillRect(0, 0, 128, 128);

  // CRT scanlines
  for (let y = 0; y < 128; y += 2) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, y, 128, 1);
  }

  // Glowing phosphor text
  ctx.fillStyle = '#39ff14';
  ctx.font = 'bold 10px monospace';
  ctx.fillText('RAIL CONTROL V1.9', 8, 22);
  ctx.fillStyle = '#ff4444';
  ctx.fillText('CRITICAL: POWER LOSS', 8, 42);
  ctx.fillStyle = '#22cc22';
  ctx.fillText('STATUS: EMERGENCY LOCK', 8, 62);
  ctx.fillText('FUSES: 0/3 DETECTED', 8, 82);
  ctx.fillText('> EVACUATE YARD', 8, 106);

  createNoise(ctx, 128, 128, 0.15);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  textureCache.set(key, texture);
  return texture;
}

// 6. Substation Breaker & Fuse Board Texture
export function getElectricalPanelTexture(fusesInserted: number = 0): THREE.CanvasTexture {
  const key = `substation_board_${fusesInserted}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Weathered grey-green industrial enclosure
  ctx.fillStyle = '#2b362f';
  ctx.fillRect(0, 0, 128, 128);

  // Frame border
  ctx.strokeStyle = '#1a221d';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 124, 124);

  // Warning label
  ctx.fillStyle = '#b89218';
  ctx.fillRect(16, 12, 96, 18);
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 8px monospace';
  ctx.fillText('HIGH VOLTAGE: 11kV', 22, 24);

  // 3 Fuse slots
  for (let i = 0; i < 3; i++) {
    const y = 42 + i * 26;
    // Socket base
    ctx.fillStyle = '#151515';
    ctx.fillRect(20, y, 88, 18);

    if (i < fusesInserted) {
      // Installed fuse: Brass and porcelain cartridge
      ctx.fillStyle = '#d4af37'; // Brass terminal
      ctx.fillRect(24, y + 2, 12, 14);
      ctx.fillRect(92, y + 2, 12, 14);
      ctx.fillStyle = '#e8d8b8'; // Ceramic body
      ctx.fillRect(36, y + 3, 56, 12);
      ctx.fillStyle = '#22ff44'; // Active LED
      ctx.beginPath();
      ctx.arc(114, y + 9, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Empty slot
      ctx.fillStyle = '#331111';
      ctx.fillRect(28, y + 3, 72, 12);
      ctx.fillStyle = '#ff2222'; // Inactive LED
      ctx.beginPath();
      ctx.arc(114, y + 9, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  createNoise(ctx, 128, 128, 0.2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  textureCache.set(key, texture);
  return texture;
}

// 7. Teke Teke Ghost Face Texture
export function getTekeFaceTexture(): THREE.CanvasTexture {
  const key = 'teke_face';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  // Ghastly pale greenish-grey skin
  ctx.fillStyle = '#c5cac3';
  ctx.fillRect(0, 0, 64, 64);

  // Sunken black eye sockets
  ctx.fillStyle = '#08090a';
  ctx.beginPath();
  ctx.ellipse(22, 28, 6, 8, 0, 0, Math.PI * 2);
  ctx.ellipse(42, 28, 6, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Dim reflective glint in eyes
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(21, 26, 2, 2);
  ctx.fillRect(41, 26, 2, 2);

  // Wide, horrific gaping mouth
  ctx.fillStyle = '#100505';
  ctx.beginPath();
  ctx.ellipse(32, 48, 12, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Jagged bloody sharp teeth hints
  ctx.fillStyle = '#dcd8cf';
  for (let x = 24; x <= 40; x += 4) {
    ctx.fillRect(x, 42, 2, 4);
    ctx.fillRect(x, 50, 2, 4);
  }

  // Dirt & bruise stains
  ctx.fillStyle = 'rgba(30, 20, 15, 0.45)';
  ctx.fillRect(10, 36, 12, 18);
  ctx.fillRect(42, 34, 14, 20);

  createNoise(ctx, 64, 64, 0.25);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  textureCache.set(key, texture);
  return texture;
}
