// ═══════════════════════════════════════════
//  OPEN TYCOON — Clean Material (replaces PS1 shader)
//  Uses standard PBR materials that respond to scene lights
// ═══════════════════════════════════════════

import * as THREE from 'three';

/**
 * Creates a clean material that works with standard Three.js lighting.
 * Replaces the old PS1 ShaderMaterial that had hardcoded dark ambient.
 */
export function createPS1Material(opts = {}) {
  const color = new THREE.Color(opts.color ?? 0x888888);
  
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.85,
    metalness: 0.0,
    flatShading: true, // keep the low-poly aesthetic
    side: opts.side ?? THREE.FrontSide,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1.0,
  });
  
  // Emissive support
  if (opts.emissiveIntensity) {
    mat.emissive = color.clone();
    mat.emissiveIntensity = opts.emissiveIntensity;
  }
  
  // Convenience helpers (kept for backward compat)
  mat.setColor = (hex) => { mat.color.set(hex); };
  mat.setEmissive = (intensity) => {
    mat.emissive = mat.color.clone();
    mat.emissiveIntensity = intensity;
  };
  
  return mat;
}

/**
 * Basic unlit material for UI elements, screens, labels
 */
export function createPS1BasicMaterial(opts = {}) {
  return new THREE.MeshBasicMaterial({
    color: opts.color ?? 0xffffff,
    side: opts.side ?? THREE.FrontSide,
    transparent: opts.transparent ?? false,
  });
}
