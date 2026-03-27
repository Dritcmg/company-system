// ═══════════════════════════════════════════
//  OPEN TYCOON — Task Panel (V2)
//  With @ file mentions and fixed delegation
// ═══════════════════════════════════════════

import { API_BASE, TASK_TYPE } from '../../shared/constants.js';

export function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  container?.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

export class TaskPanel {
  constructor() {
    this.panel = document.getElementById('task-panel');
    this.agent = null;
    this.files = [];
    this.mentionDropdown = null;
    this._setupClose();
    this._setupMentions();
    this._loadFiles();
  }

  _setupClose() {
    document.getElementById('panel-close')?.addEventListener('click', () => this.hide());
  }

  async _loadFiles() {
    try {
      const res = await fetch(`${API_BASE}/api/files/list`);
      const data = await res.json();
      this.files = data.arquivos || [];
    } catch (e) {
      this.files = [];
    }
  }

  _setupMentions() {
    // Listen for @ key in description textarea
    document.addEventListener('input', (e) => {
      if (e.target.id !== 'task-desc') return;
      const val = e.target.value;
      const cursorPos = e.target.selectionStart;
      
      // Find the last @ before cursor
      const beforeCursor = val.slice(0, cursorPos);
      const lastAt = beforeCursor.lastIndexOf('@');
      
      if (lastAt >= 0) {
        const query = beforeCursor.slice(lastAt + 1).toLowerCase();
        if (query.length >= 0 && !query.includes(' ')) {
          this._showMentionDropdown(e.target, query);
          return;
        }
      }
      this._hideMentionDropdown();
    });

    document.addEventListener('keydown', (e) => {
      if (e.target.id !== 'task-desc') return;
      if (e.key === 'Escape') this._hideMentionDropdown();
    });
  }

  _showMentionDropdown(textarea, query) {
    if (!this.mentionDropdown) {
      this.mentionDropdown = document.createElement('div');
      this.mentionDropdown.className = 'mention-dropdown';
      textarea.parentElement.appendChild(this.mentionDropdown);
    }

    const filtered = this.files
      .filter(f => f.nome.toLowerCase().includes(query) || f.caminho.toLowerCase().includes(query))
      .slice(0, 8);

    if (filtered.length === 0) {
      this._hideMentionDropdown();
      return;
    }

    this.mentionDropdown.innerHTML = filtered.map(f =>
      `<div class="mention-item" data-path="${f.caminho}">
        <span class="mention-icon">${this._fileIcon(f.extensao)}</span>
        <span class="mention-name">${f.nome}</span>
        <span class="mention-path">${f.caminho}</span>
      </div>`
    ).join('');
    this.mentionDropdown.style.display = 'block';

    // Click handler
    this.mentionDropdown.querySelectorAll('.mention-item').forEach(item => {
      item.onclick = () => {
        const filePath = item.dataset.path;
        const val = textarea.value;
        const cursorPos = textarea.selectionStart;
        const lastAt = val.lastIndexOf('@', cursorPos - 1);
        textarea.value = val.slice(0, lastAt) + `@${filePath} ` + val.slice(cursorPos);
        textarea.focus();
        this._hideMentionDropdown();
      };
    });
  }

  _hideMentionDropdown() {
    if (this.mentionDropdown) this.mentionDropdown.style.display = 'none';
  }

  _fileIcon(ext) {
    const icons = { '.md': '📝', '.json': '📦', '.js': '⚡', '.ts': '💎', '.html': '🌐', '.css': '🎨', '.txt': '📄' };
    return icons[ext] || '📄';
  }

  show(agentData) {
    this.agent = agentData;
    this.panel?.classList.add('active');
    this._render();
  }

  hide() {
    this.panel?.classList.remove('active');
    this.agent = null;
  }

  _render() {
    if (!this.panel || !this.agent) return;
    const a = this.agent;
    const acc = (typeof a.avatar_acessorios === 'string' ? JSON.parse(a.avatar_acessorios) : a.avatar_acessorios) || a.avatar?.acessorios || [];
    const isManager = a.cargo === 'manager';

    this.panel.querySelector('#panel-content').innerHTML = `
      <div class="agent-header">
        <div class="agent-avatar" style="background:${a.avatar?.cor || a.avatar_cor || '#666'}">
          ${isManager ? '👔' : '🎓'}
        </div>
        <div class="agent-info">
          <h3>${a.nome}</h3>
          <span class="agent-role ${isManager ? 'role-manager' : 'role-intern'}">${a.cargo?.toUpperCase()}</span>
          <span class="agent-personality">🔍 ${a.personalidade || 'Meticuloso'}</span>
        </div>
      </div>

      <div class="agent-stats">
        <div class="stat"><span class="stat-value">${a.tarefas_concluidas || a.historico?.tarefas_concluidas || 0}</span><span class="stat-label">Concluídas</span></div>
        <div class="stat"><span class="stat-value">${a.erros || a.historico?.erros || 0}</span><span class="stat-label">Erros</span></div>
        <div class="stat"><span class="stat-value">${(a.avaliacao || a.historico?.avaliacao || 5.0).toFixed(1)}</span><span class="stat-label">Avaliação</span></div>
      </div>

      ${a.estado_atual === 'working' ? `
        <div class="task-current">
          <h4>🔄 Tarefa em Andamento</h4>
          <div class="progress-bar"><div class="progress-fill" id="progress-fill"></div></div>
        </div>
      ` : ''}

      <div class="task-result-area" id="task-result-area"></div>

      <div class="new-task">
        <h4>📝 Nova Tarefa</h4>
        <div class="form-group mention-wrapper">
          <label>Descrição <small>(use @ para mencionar arquivos)</small></label>
          <textarea id="task-desc" placeholder="Ex: Leia o arquivo @VISION.md e faça um resumo" rows="3"></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Tipo</label>
            <select id="task-type">
              <option value="read_file">📖 Ler Arquivo</option>
              <option value="write_file">✍️ Escrever</option>
              <option value="web_search">🔍 Pesquisa Web</option>
              <option value="exec">⚙️ Executar</option>
              <option value="research">🔬 Pesquisa</option>
            </select>
          </div>
          <div class="form-group">
            <label>Prioridade</label>
            <select id="task-priority">
              <option value="normal">Normal</option>
              <option value="alta">🔴 Alta</option>
              <option value="baixa">🟢 Baixa</option>
            </select>
          </div>
        </div>
        <button id="delegate-btn" class="delegate-btn">🚀 Delegar Tarefa</button>
      </div>
    `;

    // Delegate button handler
    const btn = this.panel.querySelector('#delegate-btn');
    btn?.addEventListener('click', () => this._delegate());

    // Animate progress if working
    if (a.estado_atual === 'working') {
      const fill = this.panel.querySelector('#progress-fill');
      if (fill) {
        let progress = 0;
        const iv = setInterval(() => {
          progress += Math.random() * 5;
          if (progress >= 100) { clearInterval(iv); progress = 100; }
          fill.style.width = `${progress}%`;
        }, 200);
      }
    }
  }

  async _delegate() {
    const desc = this.panel.querySelector('#task-desc')?.value;
    const tipo = this.panel.querySelector('#task-type')?.value;
    const prioridade = this.panel.querySelector('#task-priority')?.value;
    const btn = this.panel.querySelector('#delegate-btn');

    if (!desc?.trim()) {
      showToast('⚠️ Escreva uma descrição para a tarefa', 'error');
      return;
    }

    btn.disabled = true;
    btn.textContent = '⏳ Delegando...';

    try {
      // Combined create + delegate (atomic)
      const res = await fetch(`${API_BASE}/api/delegar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agente_id: this.agent.id,
          descricao: desc,
          tipo: tipo || 'exec',
          prioridade: prioridade || 'normal',
        }),
      });

      const data = await res.json();
      if (data.erro) throw new Error(data.erro);

      showToast(`✅ Tarefa delegada para ${this.agent.apelido || this.agent.nome}!${data.mock ? ' (Mock)' : ''}`, 'success');

      // Dispatch event for 3D scene
      window.dispatchEvent(new CustomEvent('task-delegated', {
        detail: { agentId: this.agent.id, taskId: data.tarefa_id },
      }));

      // Update agent state locally
      this.agent.estado_atual = 'working';
      this._render();
    } catch (err) {
      console.error('Delegation failed:', err);
      showToast(`❌ Erro ao delegar: ${err.message}`, 'error');
      btn.disabled = false;
      btn.textContent = '🚀 Delegar Tarefa';
    }
  }

  showTaskResult(taskId, resultado) {
    const area = this.panel?.querySelector('#task-result-area');
    if (!area) return;
    area.innerHTML = `
      <div class="task-result">
        <h4>✅ Resultado</h4>
        <pre>${resultado || 'Tarefa concluída com sucesso.'}</pre>
      </div>
    `;
  }
}
