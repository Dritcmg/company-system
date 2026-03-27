// ═══════════════════════════════════════════
//  OPEN TYCOON — Meeting Panel
//  Group chat: CEO writes, agents respond
// ═══════════════════════════════════════════

import { API_BASE } from '../../shared/constants.js';
import { showToast } from './TaskPanel.js';

export class MeetingPanel {
  constructor() {
    this.el = null;
    this.isOpen = false;
    this.agents = [];
    this.messages = [];
    this._createEl();
  }

  _createEl() {
    this.el = document.createElement('div');
    this.el.id = 'meeting-panel';
    this.el.className = 'overlay-panel';
    this.el.innerHTML = `
      <div class="overlay-bg" id="meeting-overlay"></div>
      <div class="overlay-container meeting-container" style="max-width:800px;height:80vh;">
        <div class="overlay-header meeting-header">
          <h2>🔴 Sala de Reunião</h2>
          <div class="meeting-participants" id="meeting-participants"></div>
          <button id="meeting-close" class="overlay-close">✕</button>
        </div>
        <div class="meeting-chat" id="meeting-chat">
          <div class="meeting-welcome">
            <p>📋 <strong>Reunião iniciada!</strong></p>
            <p>Escreva sua mensagem abaixo. Os agentes vão responder com base nas suas competências.</p>
          </div>
        </div>
        <div class="meeting-input-area">
          <textarea id="meeting-input" placeholder="CEO: Qual é o plano para hoje?" rows="2"></textarea>
          <button id="meeting-send" class="delegate-btn">📤 Enviar</button>
        </div>
      </div>
    `;
    document.body.appendChild(this.el);

    this.el.querySelector('#meeting-close').addEventListener('click', () => this.close());
    this.el.querySelector('#meeting-overlay').addEventListener('click', () => this.close());
    this.el.querySelector('#meeting-send').addEventListener('click', () => this._sendMessage());
    this.el.querySelector('#meeting-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this._sendMessage();
      }
    });
  }

  open(agents = []) {
    this.isOpen = true;
    this.agents = agents;
    this.el.classList.add('active');
    this._renderParticipants();
    this.el.querySelector('#meeting-input').focus();
  }

  close() {
    this.isOpen = false;
    this.el.classList.remove('active');
  }

  _renderParticipants() {
    const container = this.el.querySelector('#meeting-participants');
    container.innerHTML = this.agents.map(a => {
      const isManager = a.cargo === 'manager';
      const color = a.avatar?.cor || a.avatar_cor || '#666';
      return `<span class="meeting-participant" style="background:${color}">${isManager ? '👔' : '🎓'} ${a.apelido || a.nome}</span>`;
    }).join('');
  }

  async _sendMessage() {
    const input = this.el.querySelector('#meeting-input');
    const message = input.value.trim();
    if (!message) return;

    // Add CEO message to chat
    this._addMessage('CEO', message, '#A00000', true);
    input.value = '';
    input.disabled = true;
    const btn = this.el.querySelector('#meeting-send');
    btn.disabled = true;
    btn.textContent = '⏳ Aguardando...';

    // Add placeholder for all agents simultaneously
    for (const agent of this.agents) {
      this._addMessage(agent.apelido || agent.nome, '💭 Pensando...', agent.avatar?.cor || '#666', false, agent.id);
    }

    const context = this.messages.slice(-10).map(m => `${m.author}: ${m.text}`).join('\n');

    // Fire all agent requests in parallel
    await Promise.all(this.agents.map(async (agent) => {
      const fallbackResponses = {
        manager: 'Entendido. Vou analisar e montar um plano de ação.',
        estagiario: 'Show, chefe! Só me passar os detalhes.',
        ceo: 'Vou revisar e dar o alinhamento estratégico.',
      };
      try {
        const isCEO = agent.cargo === 'ceo';
        const url = isCEO
          ? `${API_BASE}/api/wallace/conversar`
          : `${API_BASE}/api/agente/${agent.id}/chat`;
        const body = isCEO
          ? JSON.stringify({ mensagem: `[REUNIÃO] ${message}\nContexto:\n${context}` })
          : JSON.stringify({ mensagem: `[REUNIÃO] ${message}\nContexto:\n${context}` });

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        });
        const data = await res.json();
        const responseText = data.resposta || data.reply || fallbackResponses[agent.cargo] || 'Anotado!';
        this._updateMessage(agent.id, responseText);
      } catch (e) {
        this._updateMessage(agent.id, fallbackResponses[agent.cargo] || 'Anotado, vamos trabalhar nisso!');
      }
    }));

    input.disabled = false;
    btn.disabled = false;
    btn.textContent = '📤 Enviar';
    input.focus();
  }

  _addMessage(author, text, color, isCEO = false, agentId = null) {
    const chat = this.el.querySelector('#meeting-chat');
    const msg = document.createElement('div');
    msg.className = `meeting-msg ${isCEO ? 'msg-ceo' : 'msg-agent'}`;
    if (agentId) msg.dataset.agentId = agentId;
    msg.innerHTML = `
      <div class="msg-avatar" style="background:${color}">${isCEO ? '👑' : '💼'}</div>
      <div class="msg-body">
        <span class="msg-author">${author}</span>
        <span class="msg-text">${text}</span>
      </div>
    `;
    chat.appendChild(msg);
    chat.scrollTop = chat.scrollHeight;

    this.messages.push({ author, text, isCEO });
  }

  _updateMessage(agentId, text) {
    const msg = this.el.querySelector(`.meeting-msg[data-agent-id="${agentId}"]`);
    if (msg) {
      const textEl = msg.querySelector('.msg-text');
      if (textEl) textEl.textContent = text;
    }
    // Update messages array
    const idx = this.messages.findIndex(m => m.author === agentId);
    if (idx >= 0) this.messages[idx].text = text;
  }
}
