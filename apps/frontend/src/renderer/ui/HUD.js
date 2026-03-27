// ═══════════════════════════════════════════
//  OPEN TYCOON — HUD Controller (V2)
// ═══════════════════════════════════════════

import { API_BASE } from '../../shared/constants.js';

export class HUD {
  constructor() {
    this.statusEl = document.getElementById('hud-status');
    this.refresh();
    this._interval = setInterval(() => this.refresh(), 10000);
    this._startClock();
  }

  _startClock() {
    const clockEl = document.getElementById('hud-clock');
    if (!clockEl) return;
    const tick = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      clockEl.textContent = `${hh}:${mm}:${ss}`;
    };
    tick();
    this._clockInterval = setInterval(tick, 1000);
  }

  async refresh() {
    try {
      const res = await fetch(`${API_BASE}/api/escritorio/status`);
      const data = await res.json();

      const nameEl = document.getElementById('hud-name');
      const faseEl = document.getElementById('hud-fase');
      const agentsEl = document.getElementById('hud-agents');
      const tasksEl = document.getElementById('hud-tasks');
      const tokensEl = document.getElementById('hud-tokens');

      if (nameEl) nameEl.textContent = data.nome || 'Open Tycoon HQ';
      if (faseEl) faseEl.textContent = data.fase || 'STARTUP';
      if (agentsEl) agentsEl.textContent = data.agentes_ativos ?? 0;
      if (tasksEl) tasksEl.textContent = data.tarefas_pendentes ?? 0;
      if (tokensEl) tokensEl.textContent = (data.saldo_tokens ?? 0).toLocaleString('pt-BR');
    } catch (e) {
      // Backend not available
    }
  }

  setStatus(msg) {
    if (this.statusEl) {
      this.statusEl.textContent = msg;
      this.statusEl.style.opacity = '1';
      clearTimeout(this._fadeTimer);
      this._fadeTimer = setTimeout(() => {
        this.statusEl.style.opacity = '0.6';
      }, 5000);
    }
  }
}
