// ═══════════════════════════════════════════
//  OPEN TYCOON — Electron Preload Script
// ═══════════════════════════════════════════

const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('openTycoon', {
  apiBase: 'http://localhost:3000',
  wsUrl: 'ws://localhost:3000/ws',
  platform: process.platform,
  version: '0.1.0',
});
