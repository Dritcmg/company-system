// ═══════════════════════════════════════════
//  OPEN TYCOON — File Storage Panel
//  Browse and manage workspace files
// ═══════════════════════════════════════════

import { API_BASE } from '../../shared/constants.js';
import { showToast } from './TaskPanel.js';

export class FileStoragePanel {
  constructor() {
    this.el = null;
    this.isOpen = false;
    this.files = [];
    this._createEl();
  }

  _createEl() {
    this.el = document.createElement('div');
    this.el.id = 'file-storage-panel';
    this.el.className = 'overlay-panel';
    this.el.innerHTML = `
      <div class="overlay-bg" id="fs-overlay"></div>
      <div class="overlay-container" style="max-width:700px;">
        <div class="overlay-header">
          <h2>📁 File Storage</h2>
          <button id="fs-close" class="overlay-close">✕</button>
        </div>
        <div class="overlay-body">
          <div class="fs-toolbar">
            <input type="text" id="fs-search" placeholder="Buscar arquivo..." class="fs-search" />
            <button id="fs-refresh" class="btn-small">🔄</button>
          </div>
          <div id="fs-file-list" class="fs-file-list">
            <div class="fs-loading">Carregando...</div>
          </div>
          <div id="fs-file-content" class="fs-file-content" style="display:none;">
            <div class="fs-content-header">
              <button id="fs-back" class="btn-small">← Voltar</button>
              <span id="fs-file-name"></span>
            </div>
            <pre id="fs-content-body"></pre>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(this.el);

    this.el.querySelector('#fs-close').addEventListener('click', () => this.close());
    this.el.querySelector('#fs-overlay').addEventListener('click', () => this.close());
    this.el.querySelector('#fs-refresh').addEventListener('click', () => this._loadFiles());
    this.el.querySelector('#fs-back').addEventListener('click', () => this._showList());
    this.el.querySelector('#fs-search').addEventListener('input', (e) => this._filterFiles(e.target.value));
  }

  async open() {
    this.isOpen = true;
    this.el.classList.add('active');
    await this._loadFiles();
  }

  close() {
    this.isOpen = false;
    this.el.classList.remove('active');
  }

  async _loadFiles() {
    try {
      const res = await fetch(`${API_BASE}/api/files/list`);
      const data = await res.json();
      this.files = data.arquivos || [];
      this._renderFiles(this.files);
    } catch (e) {
      this.el.querySelector('#fs-file-list').innerHTML = '<div class="fs-empty">Backend offline — inicie com npm run dev</div>';
    }
  }

  _renderFiles(files) {
    const container = this.el.querySelector('#fs-file-list');
    if (files.length === 0) {
      container.innerHTML = '<div class="fs-empty">Nenhum arquivo encontrado</div>';
      return;
    }

    const icons = { '.md': '📝', '.json': '📦', '.js': '⚡', '.ts': '💎', '.html': '🌐', '.css': '🎨', '.txt': '📄', '.yaml': '📋', '.yml': '📋' };

    container.innerHTML = files.map(f => `
      <div class="fs-file-item" data-path="${f.caminho}">
        <span class="fs-icon">${icons[f.extensao] || '📄'}</span>
        <div class="fs-file-info">
          <span class="fs-file-name">${f.nome}</span>
          <span class="fs-file-path">${f.caminho}</span>
        </div>
        <span class="fs-file-size">${(f.tamanho / 1024).toFixed(1)}KB</span>
      </div>
    `).join('');

    container.querySelectorAll('.fs-file-item').forEach(item => {
      item.addEventListener('click', () => this._openFile(item.dataset.path));
    });
    
    container.style.display = 'block';
    this.el.querySelector('#fs-file-content').style.display = 'none';
  }

  _filterFiles(query) {
    const filtered = this.files.filter(f =>
      f.nome.toLowerCase().includes(query.toLowerCase()) ||
      f.caminho.toLowerCase().includes(query.toLowerCase())
    );
    this._renderFiles(filtered);
  }

  async _openFile(path) {
    try {
      const res = await fetch(`${API_BASE}/api/files/read?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      
      this.el.querySelector('#fs-file-list').style.display = 'none';
      this.el.querySelector('#fs-file-content').style.display = 'block';
      this.el.querySelector('#fs-file-name').textContent = path;
      this.el.querySelector('#fs-content-body').textContent = data.conteudo || 'Arquivo vazio';
    } catch (e) {
      showToast('Erro ao ler arquivo', 'error');
    }
  }

  _showList() {
    this.el.querySelector('#fs-file-list').style.display = 'block';
    this.el.querySelector('#fs-file-content').style.display = 'none';
  }
}
