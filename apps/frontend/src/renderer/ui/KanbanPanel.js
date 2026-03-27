// ═══════════════════════════════════════════
//  OPEN TYCOON — Kanban Panel (HTML Overlay)
//  Fullscreen Kanban with drag-and-drop columns
// ═══════════════════════════════════════════

import { API_BASE } from '../../shared/constants.js';

export class KanbanPanel {
  constructor() {
    this.el = document.getElementById('kanban-panel');
    this.isOpen = false;
    if (!this.el) this._createEl();
    this._setupClose();
  }

  _createEl() {
    this.el = document.createElement('div');
    this.el.id = 'kanban-panel';
    this.el.className = 'kanban-panel';
    this.el.innerHTML = `
      <div class="kanban-overlay" id="kanban-overlay"></div>
      <div class="kanban-container">
        <div class="kanban-header">
          <h2>📋 Quadro de Tarefas</h2>
          <button id="kanban-close" class="kanban-close-btn">✕</button>
        </div>
        <div class="kanban-board" id="kanban-board">
          <div class="kanban-column" data-status="backlog">
            <div class="kanban-column-header">📥 Backlog</div>
            <div class="kanban-cards" id="kanban-backlog"></div>
          </div>
          <div class="kanban-column" data-status="em_execucao">
            <div class="kanban-column-header">⚙️ Em Execução</div>
            <div class="kanban-cards" id="kanban-execucao"></div>
          </div>
          <div class="kanban-column" data-status="concluida">
            <div class="kanban-column-header">✅ Concluído</div>
            <div class="kanban-cards" id="kanban-concluida"></div>
          </div>
        </div>
        <div class="kanban-footer">
          <button id="kanban-add-task" class="kanban-add-btn">+ Nova Tarefa</button>
        </div>
      </div>
    `;
    document.body.appendChild(this.el);
  }

  _setupClose() {
    this.el.querySelector('#kanban-close')?.addEventListener('click', () => this.close());
    this.el.querySelector('#kanban-overlay')?.addEventListener('click', () => this.close());
    this.el.querySelector('#kanban-add-task')?.addEventListener('click', () => {
      // Dispatch event to open task panel
      window.dispatchEvent(new CustomEvent('open-task-panel-generic'));
    });
  }

  async open() {
    this.isOpen = true;
    this.el.classList.add('active');
    await this.refresh();
  }

  close() {
    this.isOpen = false;
    this.el.classList.remove('active');
  }

  async refresh() {
    try {
      const res = await fetch(`${API_BASE}/api/tarefa/status`);
      const data = await res.json();
      this._renderCards('kanban-backlog', data.backlog || [], '#FFF176');
      this._renderCards('kanban-execucao', data.em_execucao || [], '#81D4FA');
      this._renderCards('kanban-concluida', (data.concluidas || []).slice(0, 10), '#A5D6A7');
    } catch (e) {
      console.error('Failed to load kanban:', e);
    }
  }

  _renderCards(containerId, tasks, defaultColor) {
    const container = this.el.querySelector(`#${containerId}`);
    if (!container) return;
    container.innerHTML = tasks.length === 0
      ? '<div class="kanban-empty">Nenhuma tarefa</div>'
      : tasks.map(t => {
          const color = t.cor_do_projeto || defaultColor;
          const projectBadge = t.projeto_id && t.projeto_id !== 'geral' 
            ? `<span style="background:${color}33; color:${color}; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:bold; margin-bottom:4px; display:inline-block;">${t.projeto_id.toUpperCase()}</span>` 
            : '';
            
          return `
            <div class="kanban-card" style="border-left: 4px solid ${color}" data-id="${t.id}">
              ${projectBadge}
              <div class="kanban-card-type">${t.tipo}</div>
              <div class="kanban-card-desc">${t.descricao || 'Sem descrição'}</div>
              ${t.agente_id ? `<div class="kanban-card-agent">👤 ${t.agente_id.split('-')[0]}</div>` : ''}
              ${t.resultado ? `<div class="kanban-card-result">📄 ${String(t.resultado).slice(0, 60)}...</div>` : ''}
            </div>
          `;
      }).join('');
  }
}
