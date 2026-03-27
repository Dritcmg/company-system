// ═══════════════════════════════════════════
//  OPEN TYCOON — Hire Panel
//  Create a new agent (name, role, personality)
// ═══════════════════════════════════════════

import { API_BASE, PERSONALITIES } from '../../shared/constants.js';
import { showToast } from './TaskPanel.js';

export class HirePanel {
  constructor() {
    this.el = null;
    this.isOpen = false;
    this._createEl();
  }

  _createEl() {
    const personalityOptions = Object.entries(PERSONALITIES)
      .map(([key, val]) => `<option value="${key}">${val.emoji} ${val.label}</option>`)
      .join('');

    this.el = document.createElement('div');
    this.el.id = 'hire-panel';
    this.el.className = 'overlay-panel';
    this.el.innerHTML = `
      <div class="overlay-bg" id="hire-overlay"></div>
      <div class="overlay-container" style="max-width:500px;">
        <div class="overlay-header">
          <h2>👤 Contratar Agente</h2>
          <button id="hire-close" class="overlay-close">✕</button>
        </div>
        <div class="overlay-body">
          <div class="form-group">
            <label>Nome Completo</label>
            <input type="text" id="hire-name" placeholder="Ex: Maria Santos" class="form-input" />
          </div>
          <div class="form-group">
            <label>Apelido</label>
            <input type="text" id="hire-nickname" placeholder="Ex: Mari" class="form-input" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Cargo</label>
              <select id="hire-role" class="form-input">
                <option value="estagiario">🎓 Estagiário</option>
                <option value="manager">👔 Manager</option>
              </select>
            </div>
            <div class="form-group">
              <label>Personalidade</label>
              <select id="hire-personality" class="form-input">
                ${personalityOptions}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Cor do Avatar</label>
            <input type="color" id="hire-color" value="#00aa66" class="form-color" />
          </div>
          <button id="hire-submit" class="delegate-btn" style="width:100%;margin-top:12px;">
            🚀 Contratar Agente
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(this.el);

    this.el.querySelector('#hire-close').addEventListener('click', () => this.close());
    this.el.querySelector('#hire-overlay').addEventListener('click', () => this.close());
    this.el.querySelector('#hire-submit').addEventListener('click', () => this._hire());
  }

  open() {
    this.isOpen = true;
    this.el.classList.add('active');
  }

  close() {
    this.isOpen = false;
    this.el.classList.remove('active');
  }

  async _hire() {
    const name = this.el.querySelector('#hire-name').value.trim();
    const nickname = this.el.querySelector('#hire-nickname').value.trim();
    const role = this.el.querySelector('#hire-role').value;
    const personality = this.el.querySelector('#hire-personality').value;
    const color = this.el.querySelector('#hire-color').value;
    const btn = this.el.querySelector('#hire-submit');

    if (!name) {
      showToast('⚠️ Dê um nome ao agente', 'error');
      return;
    }

    btn.disabled = true;
    btn.textContent = '⏳ Contratando...';

    try {
      const res = await fetch(`${API_BASE}/api/agente/contratar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: name,
          apelido: nickname || name.split(' ')[0],
          cargo: role,
          personalidade: personality,
          avatar_cor: color,
          avatar_acessorios: role === 'manager' ? ['oculos', 'gravata'] : ['cracha'],
        }),
      });

      const data = await res.json();
      if (data.erro) throw new Error(data.erro);

      showToast(`🎉 ${nickname || name} contratado(a) como ${role}!`, 'success');
      window.dispatchEvent(new CustomEvent('agent-hired'));
      this.close();
    } catch (err) {
      showToast(`❌ Erro: ${err.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '🚀 Contratar Agente';
    }
  }
}
