// ═══════════════════════════════════════════
//  OPEN TYCOON — Audio Manager
//  Handles BGM (Ambient Jazz), 3D Positional SFX, and UI clicks
//  Designed for low overhead and safe fallback if files fail
// ═══════════════════════════════════════════

import * as THREE from 'three';

export class AudioManager {
  constructor(camera) {
    this.camera = camera;
    this.listener = new THREE.AudioListener();
    this.camera.add(this.listener);

    // Audio loaders
    this.audioLoader = new THREE.AudioLoader();
    
    // Background Music (BGM)
    this.bgm = new THREE.Audio(this.listener);
    
    // SFX Pools
    this.uiSounds = {};
    
    this.isInitialized = false;
    
    // Safe public domain lofi/jazz placeholder (pixabay standard URL structure)
    // If it fails, the error is caught silently.
    this.bgmUrl = 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3'; 
  }

  // Called on first user interaction (to bypass browser auto-play blocks)
  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Load BGM
    this.audioLoader.load(this.bgmUrl, (buffer) => {
      this.bgm.setBuffer(buffer);
      this.bgm.setLoop(true);
      this.bgm.setVolume(0.15); // Calm ambient volume
      this.bgm.play();
    }, undefined, (e) => {
      console.warn('O BGM de Jazz ambiente falhou ao carregar silenciosamente.', e);
    });

    // Procedural UI Sound Generator (no file needed!)
    this.audioCtx = this.listener.context;
  }

  // Procedural UI Click (Soft Pop)
  playUIClick() {
    if (!this.isInitialized || !this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, this.audioCtx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.1);
      
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.1);
    } catch(e) {}
  }

  // Create a 3D Positional sound emitter (e.g. for a typing keyboard)
  create3DEmitter(mesh, type = 'keyboard') {
    const sound = new THREE.PositionalAudio(this.listener);
    sound.setRefDistance(2);
    sound.setMaxDistance(15);
    sound.setRolloffFactor(1); // Linear-ish falloff
    
    mesh.add(sound);

    // Procedural typing sound loop buffer
    if (this.isInitialized && this.audioCtx) {
       // We create a short noise buffer to simulate typing ASMR
       const bufferSize = this.audioCtx.sampleRate * 0.1; // 100ms
       const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
       const output = buffer.getChannelData(0);
       for (let i = 0; i < bufferSize; i++) {
           output[i] = Math.random() * 2 - 1; // White noise
           // Fade out noise
           output[i] *= (1 - i/bufferSize);
       }
       sound.setBuffer(buffer);
       sound.setVolume(0.05);
    }
    
    return sound;
  }
}
