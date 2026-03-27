// ═══════════════════════════════════════════
//  META-GYPSI → CLICKUP SYNC
//  Sincronização bidirecional de tarefas
// ═══════════════════════════════════════════

const fetch = require('cross-fetch');

const CLICKUP_API = 'https://api.clickup.com/api/v2';

class ClickUpService {
  constructor(db) {
    this.db = db;
    this.token = process.env.CLICKUP_TOKEN;
    this.listId = process.env.CLICKUP_LIST_ID;
    this.enabled = !!this.token;
    this.lastSync = null;
  }
  
  // Initialize and validate token
  async init() {
    if (!this.enabled) {
      console.log('📋 ClickUp: No CLICKUP_TOKEN set, sync disabled');
      return false;
    }
    
    try {
      // Test connection
      const user = await this._request('/user');
      console.log(`📋 ClickUp: Connected as ${user.user.username}`);
      
      // Get list info if not set
      if (!this.listId) {
        console.log('📋 ClickUp: No CLICKUP_LIST_ID set, using default list');
      }
      
      return true;
    } catch (error) {
      console.error('📋 ClickUp init error:', error.message);
      this.enabled = false;
      return false;
    }
  }
  
  // Sync tasks from ClickUp to local DB
  async syncFromClickUp() {
    if (!this.enabled || !this.listId) return [];
    
    try {
      const response = await this._request(`/list/${this.listId}/task`);
      const tasks = response.tasks || [];
      
      console.log(`📋 Synced ${tasks.length} tasks from ClickUp`);
      
      // Update local DB
      for (const task of tasks) {
        this._upsertTask(task);
      }
      
      this.lastSync = new Date();
      return tasks;
    } catch (error) {
      console.error('📋 Sync from ClickUp failed:', error.message);
      return [];
    }
  }
  
  // Create task in ClickUp from local task
  async createInClickUp(localTask) {
    if (!this.enabled || !this.listId) return null;
    
    try {
      const body = {
        name: localTask.descricao,
        description: `Criado via Meta-Gypsi\nAgente: ${localTask.agente_id || 'N/A'}`,
        status: this._mapStatusToClickUp(localTask.status),
        priority: this._mapPriority(localTask.prioridade)
      };
      
      const response = await this._request(`/list/${this.listId}/task`, 'POST', body);
      
      // Update local task with ClickUp ID
      this.db.runAndSave(
        'UPDATE tasks SET clickup_id = ? WHERE id = ?',
        [response.id, localTask.id]
      );
      
      console.log(`📋 Created task in ClickUp: ${response.id}`);
      return response;
    } catch (error) {
      console.error('📋 Failed to create in ClickUp:', error.message);
      return null;
    }
  }
  
  // Update task status in ClickUp
  async updateStatusInClickUp(clickupId, status) {
    if (!this.enabled) return false;
    
    try {
      const cuStatus = this._mapStatusToClickUp(status);
      await this._request(`/task/${clickupId}`, 'PUT', { status: cuStatus });
      
      console.log(`📋 Updated ClickUp task ${clickupId} to ${cuStatus}`);
      return true;
    } catch (error) {
      console.error('📋 Failed to update ClickUp:', error.message);
      return false;
    }
  }
  
  // Webhook handler for ClickUp updates
  handleWebhook(payload) {
    console.log('📋 ClickUp webhook received:', payload.event);
    
    // Handle different event types
    switch (payload.event) {
      case 'taskUpdated':
        this._handleTaskUpdate(payload.task);
        break;
      case 'taskCreated':
        this._handleTaskCreate(payload.task);
        break;
      case 'taskStatusUpdated':
        this._handleStatusUpdate(payload.task);
        break;
    }
  }
  
  // Internal: Make ClickUp API request
  async _request(endpoint, method = 'GET', body = null) {
    const url = `${CLICKUP_API}${endpoint}`;
    
    const options = {
      method,
      headers: {
        'Authorization': this.token,
        'Content-Type': 'application/json'
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`ClickUp API ${response.status}: ${text}`);
    }
    
    return response.json();
  }
  
  // Internal: Upsert task to local DB
  _upsertTask(clickupTask) {
    const existing = this.db.queryOne(
      'SELECT id FROM tasks WHERE clickup_id = ?',
      [clickupTask.id]
    );
    
    if (existing) {
      // Update existing
      this.db.runAndSave(
        `UPDATE tasks SET 
          descricao = ?, 
          status = ?, 
          prioridade = ?,
          atualizado_em = datetime('now')
        WHERE clickup_id = ?`,
        [
          clickupTask.name,
          this._mapStatusFromClickUp(clickupTask.status.status),
          this._mapPriorityFromClickUp(clickupTask.priority),
          clickupTask.id
        ]
      );
    } else {
      // Create new
      const { v4: uuidv4 } = require('uuid');
      this.db.runAndSave(
        `INSERT INTO tasks (id, clickup_id, descricao, status, prioridade, criado_em)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        [
          uuidv4(),
          clickupTask.id,
          clickupTask.name,
          this._mapStatusFromClickUp(clickupTask.status.status),
          this._mapPriorityFromClickUp(clickupTask.priority)
        ]
      );
    }
  }
  
  // Status mapping
  _mapStatusToClickUp(status) {
    const map = {
      'pendente': 'to do',
      'em_execucao': 'in progress',
      'concluida': 'complete',
      'cancelada': 'closed'
    };
    return map[status] || 'to do';
  }
  
  _mapStatusFromClickUp(cuStatus) {
    const map = {
      'to do': 'pendente',
      'in progress': 'em_execucao',
      'complete': 'concluida',
      'closed': 'cancelada'
    };
    return map[cuStatus.toLowerCase()] || 'pendente';
  }
  
  // Priority mapping
  _mapPriority(priority) {
    const map = {
      'baixa': 2,
      'normal': 3,
      'alta': 4,
      'urgente': 5
    };
    return map[priority] || 3;
  }
  
  _mapPriorityFromClickUp(cuPriority) {
    if (!cuPriority) return 'normal';
    const map = {
      1: 'urgente',
      2: 'alta',
      3: 'normal',
      4: 'baixa'
    };
    return map[cuPriority.priority] || 'normal';
  }
  
  // Webhook handlers
  _handleTaskUpdate(task) {
    this._upsertTask(task);
  }
  
  _handleTaskCreate(task) {
    this._upsertTask(task);
  }
  
  _handleStatusUpdate(task) {
    this.db.runAndSave(
      'UPDATE tasks SET status = ?, atualizado_em = datetime(\'now\') WHERE clickup_id = ?',
      [this._mapStatusFromClickUp(task.status.status), task.id]
    );
  }
}

module.exports = { ClickUpService };
