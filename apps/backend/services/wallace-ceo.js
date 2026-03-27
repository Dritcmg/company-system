// ═══════════════════════════════════════════
//  WALLACE CEO AGENT
//  O próprio Wallace como NPC no escritório 3D
//  Delega tarefas e cria sub-agentes via OpenClaw
// ═══════════════════════════════════════════

const { v4: uuidv4 } = require('uuid');

class WallaceCEO {
  constructor(db, broadcastFn) {
    this.db = db;
    this.broadcast = broadcastFn;
    this.agentId = 'wallace-ceo-001';
    this.name = 'Wallace';
    this.role = 'CEO';
    
    // Ensure Wallace exists in DB
    this._ensureExists();
  }
  
  _ensureExists() {
    const existing = this.db.queryOne('SELECT id FROM agents WHERE id = ?', [this.agentId]);
    
    if (!existing) {
      this.db.runAndSave(`
        INSERT INTO agents (id, nome, apelido, cargo, personalidade, avatar_cor, avatar_altura, avatar_acessorios, mesa_x, mesa_y, mesa_z, mesa_rotacao, estado_atual, tarefas_concluidas, avaliacao)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        this.agentId,
        'Wallace',
        'Wallace',
        'ceo',
        'sarcastic_direct',
        '#FF6B35',
        1.8,
        JSON.stringify(['oculos', 'gravata']),
        -8, 0, 4,   // CEO room position
        Math.PI,    // facing the office
        'idle',
        999,
        5.0
      ]);
      
      console.log('🦊 Wallace CEO initialized in database');
    }
  }
  
  // Get Wallace's data for 3D rendering
  getAgentData() {
    return {
      id: this.agentId,
      nome: 'Wallace',
      apelido: 'Wallace',
      cargo: 'ceo',
      personalidade: 'sarcastic_direct',
      avatar: {
        cor: '#FF6B35',
        acessorios: ['oculos', 'gravata'],
        emoji: '🦊'
      },
      localizacao: {
        mesa: [-8, 0, 4],
        rotacao: Math.PI
      },
      estado_atual: 'idle',
      historico: {
        tarefas_concluidas: 999,
        erros: 0,
        avaliacao: 5.0
      },
      isCEO: true,
      isInteractable: true
    };
  }
  
  // Process conversation with Wallace
  async processConversation(message, context = {}) {
    console.log(`🦊 Wallace received: ${message}`);
    
    // Analyze intent
    const intent = this._analyzeIntent(message);
    
    switch (intent.type) {
      case 'DELEGATE_TASK':
        return this._handleDelegation(intent, message, context);
        
      case 'CREATE_AGENT':
        return this._handleCreateAgent(intent, message);
        
      case 'STATUS_CHECK':
        return this._handleStatusCheck();
        
      case 'CHAT':
      default:
        return this._handleChat(message);
    }
  }
  
  _analyzeIntent(message) {
    const lower = message.toLowerCase();
    
    // Check for delegation patterns
    if (lower.match(/(delegue|mande|peça para|faça|crie|execute|analise)/)) {
      // Extract agent and task
      const agentMatch = message.match(/(?:para|ao|a)\s+(\w+)/i);
      const taskMatch = message.match(/(?:delegue|mande|peça para|faça|crie|execute|analise)\s+(.+?)(?:\s+(?:para|ao|a)\s+\w+|$)/i);
      
      return {
        type: 'DELEGATE_TASK',
        agent: agentMatch ? agentMatch[1] : null,
        task: taskMatch ? taskMatch[1] : message
      };
    }
    
    // Check for agent creation
    if (lower.match(/(contrate|novo agente|novo funcionário|adicionar)/)) {
      return { type: 'CREATE_AGENT' };
    }
    
    // Check for status
    if (lower.match(/(status|relatório|como estamos|o que falta)/)) {
      return { type: 'STATUS_CHECK' };
    }
    
    return { type: 'CHAT' };
  }
  
  async _handleDelegation(intent, originalMessage, context) {
    const { agent, task } = intent;
    
    // Find target agent
    let targetAgent = null;
    if (agent) {
      targetAgent = this.db.queryOne(
        'SELECT id, nome, cargo FROM agents WHERE LOWER(apelido) = LOWER(?) OR LOWER(nome) = LOWER(?)',
        [agent, agent]
      );
    }
    
    // If no specific agent, use best available
    if (!targetAgent) {
      targetAgent = this.db.queryOne(
        "SELECT id, nome, cargo FROM agents WHERE estado_atual = 'idle' AND cargo != 'ceo' ORDER BY RANDOM() LIMIT 1"
      );
    }
    
    if (!targetAgent) {
      return {
        type: 'ERROR',
        message: '🦊 Todos os agentes estão ocupados. Quer que eu contrate mais alguém?'
      };
    }
    
    // Create task
    const taskId = uuidv4();
    this.db.runAndSave(`
      INSERT INTO tasks (id, tipo, descricao, prioridade, status, agente_id, iniciada_em)
      VALUES (?, 'exec', ?, 'normal', 'em_execucao', ?, datetime('now'))
    `, [taskId, task, targetAgent.id]);
    
    // Update agent
    this.db.runAndSave(
      'UPDATE agents SET estado_atual = ?, tarefa_atual_id = ? WHERE id = ?',
      ['working', taskId, targetAgent.id]
    );
    
    // Broadcast
    if (this.broadcast) {
      this.broadcast({
        type: 'AGENTE_PENSANDO',
        payload: {
          agente_id: targetAgent.id,
          pensamento: `📝 Recebendo tarefa: ${task.substring(0, 50)}...`
        }
      });
    }
    
    return {
      type: 'DELEGATION',
      message: `🦊 Beleza. Deleguei para ${targetAgent.apelido || targetAgent.nome}: "${task.substring(0, 60)}${task.length > 60 ? '...' : ''}"`,
      taskId,
      agentId: targetAgent.id
    };
  }
  
  _handleCreateAgent(intent, message) {
    // This would trigger the hiring flow
    return {
      type: 'HIRE',
      message: '🦊 Quer contratar? Me diz: qual o cargo (estagiario, dev, manager) e o nome do novo agente?'
    };
  }
  
  _handleStatusCheck() {
    const stats = this.db.queryOne(`
      SELECT 
        COUNT(*) as total_agents,
        SUM(CASE WHEN estado_atual = 'working' THEN 1 ELSE 0 END) as working,
        SUM(CASE WHEN estado_atual = 'idle' THEN 1 ELSE 0 END) as idle,
        SUM(tarefas_concluidas) as total_tasks
      FROM agents
      WHERE cargo != 'ceo'
    `);
    
    const pendingTasks = this.db.queryOne(`
      SELECT COUNT(*) as count FROM tasks WHERE status = 'pendente'
    `);
    
    return {
      type: 'STATUS',
      message: `🦊 Status do escritório:
• ${stats.total_agents} agentes (${stats.working} trabalhando, ${stats.idle} livres)
• ${stats.total_tasks} tarefas concluídas no total
• ${pendingTasks.count} tarefas pendentes

Tá tudo sob controle. Quer que eu delegue algo?`,
      stats
    };
  }
  
  _handleChat(message) {
    const responses = [
      '🦊 Tô aqui. O que precisa?',
      '🦊 Fala. Tô ouvindo.',
      '🦊 Oi. Tá perdido no escritório virtual?',
      '🦊 Sou eu. Wallace. O que temos pra hoje?',
      '🦊 E aí, chefe. Delegou tarefa pros bonecos hoje?'
    ];
    
    // Simple pattern matching for better responses
    const lower = message.toLowerCase();
    
    if (lower.match(/(oi|olá|ola|hey|hi)/)) {
      return { type: 'CHAT', message: '🦊 Oi. Tô no meu escritório 3D, literalmente. O que precisa?' };
    }
    
    if (lower.match(/(tudo bem|como vai)/)) {
      return { type: 'CHAT', message: '🦊 Tô bem. O servidor tá ligado, os agentes tão funcionando. E você?' };
    }
    
    if (lower.match(/(obrigado|valeu|thanks)/)) {
      return { type: 'CHAT', message: '🦊 De nada. É pra isso que eu existo.' };
    }
    
    return { 
      type: 'CHAT', 
      message: responses[Math.floor(Math.random() * responses.length)]
    };
  }
  
  // Spawn a sub-agent via OpenClaw
  async spawnSubAgent(task, context) {
    // This connects to the OpenClaw Gateway
    try {
      const fetch = require('cross-fetch');
      const response = await fetch('http://localhost:18789/api/spawn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task,
          context,
          agentId: this.agentId,
          agentRole: 'ceo'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        return data;
      }
      
      throw new Error('Gateway returned non-OK status');
    } catch (error) {
      console.error('Failed to spawn sub-agent:', error);
      return { error: error.message };
    }
  }
}

module.exports = { WallaceCEO };
