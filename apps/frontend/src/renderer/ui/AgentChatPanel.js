// ═══════════════════════════════════════════
//  OPEN TYCOON — Agent Chat Panel
//  Direct 1-on-1 communication & dynamic task creation
// ═══════════════════════════════════════════

import { API_BASE } from '../../shared/constants.js';
import { showToast } from './TaskPanel.js';
import { showSpeechBubble } from './SpeechBubble3D.js';

export class AgentChatPanel {
  constructor() {
    this.el = null;
    this.isOpen = false;
    this.agent = null;
    this.agents3D = {};
    this.scene = null;
    this.messages = [];
    this._createEl();
  }

  setAgentsRef(agents) { this.agents3D = agents; }
  setSceneRef(scene) { this.scene = scene; }

  _createEl() {
    this.el = document.createElement('div');
    this.el.id = 'agent-chat-panel';
    this.el.className = 'overlay-panel';
    this.el.innerHTML = `
      <div class="overlay-bg" id="agent-chat-overlay"></div>
      <div class="overlay-container meeting-container" style="max-width:600px;height:85vh;left:auto;right:20px;transform:translate(0,-50%);">
        <div class="overlay-header meeting-header" style="background:#2C3E50;">
          <div style="display:flex;align-items:center;gap:15px;">
            <div id="agent-chat-avatar" style="width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;"></div>
            <div>
              <h2 id="agent-chat-name" style="margin:0;font-size:18px;">Agente</h2>
              <span id="agent-chat-role" style="font-size:12px;opacity:0.8;">cargo</span>
            </div>
          </div>
          <button id="agent-chat-close" class="overlay-close">✕</button>
        </div>
        <div class="meeting-chat" id="agent-chat-history" style="flex:1;background:#F8F9FA;">
          <div class="meeting-welcome">
            <p><strong>Chat Direto</strong></p>
            <p>Fale diretamente com o agente. Peça para executar análises, ou discuta ideias. Se você pedir algo acionável, o agente vai criar uma Tarefa e um Projeto automaticamente.</p>
          </div>
        </div>
        <div class="meeting-input-area" style="background:#FFF;border-top:1px solid #EEE;">
          <textarea id="agent-chat-input" placeholder="Mensagem..." rows="2"></textarea>
          <button id="agent-chat-send" class="delegate-btn" style="background:#3498DB;">Enviar</button>
        </div>
      </div>
    `;
    document.body.appendChild(this.el);

    this.el.querySelector('#agent-chat-close').addEventListener('click', () => this.close());
    this.el.querySelector('#agent-chat-overlay').addEventListener('click', () => this.close());
    this.el.querySelector('#agent-chat-send').addEventListener('click', () => this._sendMessage());
    
    // Auto-resize textarea
    const input = this.el.querySelector('#agent-chat-input');
    input.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = (this.scrollHeight) + 'px';
    });
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this._sendMessage();
      }
    });
  }

  open(agentData) {
    this.isOpen = true;
    this.agent = agentData;
    this.messages = [];
    
    // Update header
    const color = agentData.avatar?.cor || agentData.avatar_cor || '#666';
    const isManager = agentData.cargo === 'manager';
    
    this.el.querySelector('#agent-chat-avatar').style.background = color;
    this.el.querySelector('#agent-chat-avatar').textContent = isManager ? '👔' : '🎓';
    this.el.querySelector('#agent-chat-name').textContent = agentData.apelido || agentData.nome;
    this.el.querySelector('#agent-chat-role').textContent = agentData.cargo.toUpperCase();
    
    // Clear chat
    const chat = this.el.querySelector('#agent-chat-history');
    chat.innerHTML = `
      <div class="meeting-welcome">
        <p><strong>Chat Direto com ${agentData.apelido || agentData.nome}</strong></p>
        <p>Peça tarefas, debata projetos ou simplesmente converse. Ele criará as tasks e organizará as cores dos projetos automaticamente caso necessário.</p>
      </div>
    `;

    this.el.classList.add('active');
    setTimeout(() => this.el.querySelector('#agent-chat-input').focus(), 100);
  }

  close() {
    this.isOpen = false;
    this.el.classList.remove('active');
  }

  async _sendMessage() {
    const input = this.el.querySelector('#agent-chat-input');
    const message = input.value.trim();
    if (!message) return;

    // Add CEO message to chat
    this._addMessage('CEO', message, '#2C3E50', true);
    input.value = '';
    input.style.height = 'auto';
    input.disabled = true;
    const btn = this.el.querySelector('#agent-chat-send');
    btn.disabled = true;
    btn.textContent = 'Pensando...';
    
    const agentColor = this.agent.avatar?.cor || this.agent.avatar_cor || '#666';

    try {
      // Create a temporary loading message for the agent
      const tempId = Date.now().toString();
      this._addMessage(this.agent.apelido || this.agent.nome, '...', agentColor, false, tempId);
      
      const isCEO = this.agent.cargo === 'ceo';
      const chatUrl = isCEO
        ? `${API_BASE}/api/wallace/conversar`
        : `${API_BASE}/api/agente/${this.agent.id}/chat`;

      const res = await fetch(chatUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem: message }),
      });

      const data = await res.json();

      // Remove temporary message and add the real one
      const tempEl = this.el.querySelector(`.meeting-msg[data-msg-id="${tempId}"]`);
      if (tempEl) tempEl.remove();

      const resposta = data.resposta || data.reply || data.message || '...';
      this._addMessage(this.agent.apelido || this.agent.nome, resposta, agentColor, false);
      
      // If a task was created, show a system notification pill in the chat
      if (data.task_criada) {
        this._addTaskCreationPill(data.task_criada);
      }

    } catch (e) {
      const tempEl2 = this.el.querySelector(`.meeting-msg[data-msg-id]`);
      if (tempEl2) tempEl2.remove();
      this._addMessage(
        this.agent.apelido || this.agent.nome,
        '(Backend offline — inicie o servidor para conversar com os agentes)',
        '#999',
        false
      );
    }

    input.disabled = false;
    btn.disabled = false;
    btn.textContent = 'Enviar';
    input.focus();
  }

  _addMessage(author, text, color, isCEO = false, tempId = null) {
    const chat = this.el.querySelector('#agent-chat-history');
    const msg = document.createElement('div');
    msg.className = `meeting-msg ${isCEO ? 'msg-ceo' : 'msg-agent'}`;
    if (tempId) msg.dataset.msgId = tempId;
    
    // Style adjustments for the individual chat to look like WhatsApp/Slack
    msg.style.maxWidth = '85%';
    msg.style.padding = '12px 15px';
    msg.style.borderRadius = '12px';
    msg.style.margin = '10px 0';
    msg.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';
    msg.style.color = '#333';
    
    if (isCEO) {
      msg.style.alignSelf = 'flex-end';
      msg.style.background = '#DCF8C6';
      msg.style.marginLeft = 'auto';
    } else {
      msg.style.alignSelf = 'flex-start';
      msg.style.background = '#FFFFFF';
      msg.style.borderLeft = `4px solid ${color}`;
    }

    // Convert newlines to br 
    const formattedText = text.replace(/\n/g, '<br/>');

    msg.innerHTML = `
      <div style="font-size:11px;opacity:0.6;margin-bottom:4px;font-weight:bold;">${author}</div>
      <div style="font-size:14px;line-height:1.4;">${formattedText}</div>
    `;
    chat.appendChild(msg);
    chat.scrollTop = chat.scrollHeight;
  }

  _addTaskCreationPill(task) {
    const chat = this.el.querySelector('#agent-chat-history');
    const pill = document.createElement('div');
    pill.style.background = task.cor_do_projeto || '#E0E0E0';
    pill.style.color = '#000';
    pill.style.padding = '8px 15px';
    pill.style.borderRadius = '20px';
    pill.style.margin = '15px auto';
    pill.style.fontSize = '12px';
    pill.style.fontWeight = 'bold';
    pill.style.textAlign = 'center';
    pill.style.maxWidth = '80%';
    pill.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    
    pill.innerHTML = `
      📌 Nova Tarefa Criada no Kanban!<br/>
      <span style="opacity:0.8;font-size:11px;">PROJETO: ${task.projeto_id}</span><br/>
      <span style="font-weight:normal;">${task.descricao}</span>
    `;
    
    chat.appendChild(pill);
    chat.scrollTop = chat.scrollHeight;
  }
}
