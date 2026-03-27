// ═══════════════════════════════════════════
//  CONTEXT PERSISTENCE MIDDLEWARE
//  Mantém conversas vivas entre reinicializações
//  para Ollama local no OpenClaw
// ═══════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const { ContextManager } = require('../services/context-manager');

const SESSIONS_DIR = path.join(__dirname, '../../data/sessions');

// Garantir diretório existe
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

class ContextPersistence {
  constructor(sessionKey) {
    this.sessionKey = sessionKey;
    this.sessionFile = path.join(SESSIONS_DIR, `${sessionKey}.json`);
    this.context = null;
    this.lastActivity = Date.now();
    this.autoSaveInterval = null;
    
    this._loadSession();
    this._startAutoSave();
  }
  
  _loadSession() {
    try {
      if (fs.existsSync(this.sessionFile)) {
        const data = JSON.parse(fs.readFileSync(this.sessionFile, 'utf-8'));
        this.context = new ContextManager();
        this.context.import(data);
        console.log(`📂 Sessão carregada: ${this.sessionKey} (${this.context.messages.length} msgs)`);
      } else {
        this.context = new ContextManager({
          conversationId: this.sessionKey,
          maxTokens: 4096,
          keepTokens: 1024
        });
        console.log(`🆕 Nova sessão: ${this.sessionKey}`);
      }
    } catch (error) {
      console.error('Erro ao carregar sessão:', error);
      this.context = new ContextManager({ conversationId: this.sessionKey });
    }
  }
  
  _startAutoSave() {
    // Auto-salvar a cada 30 segundos
    this.autoSaveInterval = setInterval(() => {
      this.save();
    }, 30000);
  }
  
  save() {
    try {
      const data = this.context.export();
      fs.writeFileSync(this.sessionFile, JSON.stringify(data, null, 2));
      this.lastActivity = Date.now();
    } catch (error) {
      console.error('Erro ao salvar sessão:', error);
    }
  }
  
  // Adicionar mensagem do usuário
  addUserMessage(content) {
    this.lastActivity = Date.now();
    return this.context.addMessage('user', content);
  }
  
  // Adicionar resposta do assistente
  addAssistantMessage(content) {
    this.lastActivity = Date.now();
    return this.context.addMessage('assistant', content);
  }
  
  // Adicionar mensagem de sistema/tool
  addSystemMessage(content) {
    return this.context.addMessage('system', content);
  }
  
  // Obter contexto formatado para Ollama
  getContextForOllama(systemPrompt = null) {
    return this.context.getContextForOllama(systemPrompt);
  }
  
  // Obter estatísticas
  getStats() {
    return {
      ...this.context.getStats(),
      lastActivity: this.lastActivity,
      sessionFile: this.sessionFile
    };
  }
  
  // Limpar sessão
  clear() {
    this.context.clear();
    this.save();
    console.log(`🧹 Sessão limpa: ${this.sessionKey}`);
  }
  
  // Destruir (limpar recursos)
  destroy() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    this.save();
  }
  
  // Verificar se está inativa (para cleanup)
  isInactive(minutes = 30) {
    return (Date.now() - this.lastActivity) > (minutes * 60 * 1000);
  }
}

// Gerenciador global de sessões
class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.cleanupInterval = null;
    this._startCleanup();
  }
  
  getSession(sessionKey) {
    if (!this.sessions.has(sessionKey)) {
      this.sessions.set(sessionKey, new ContextPersistence(sessionKey));
    }
    return this.sessions.get(sessionKey);
  }
  
  hasSession(sessionKey) {
    // Verificar em memória ou no disco
    if (this.sessions.has(sessionKey)) return true;
    
    const sessionFile = path.join(SESSIONS_DIR, `${sessionKey}.json`);
    return fs.existsSync(sessionFile);
  }
  
  // Listar todas as sessões
  listSessions() {
    const sessions = [];
    
    // Sessões em memória
    for (const [key, session] of this.sessions) {
      sessions.push({
        key,
        inMemory: true,
        ...session.getStats()
      });
    }
    
    // Sessões no disco
    try {
      const files = fs.readdirSync(SESSIONS_DIR);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const key = file.replace('.json', '');
          if (!this.sessions.has(key)) {
            const data = JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, file), 'utf-8'));
            sessions.push({
              key,
              inMemory: false,
              conversationId: data.conversationId,
              totalMessages: data.messageCount,
              lastActivity: data.exportedAt
            });
          }
        }
      }
    } catch (error) {
      console.error('Erro ao listar sessões:', error);
    }
    
    return sessions;
  }
  
  // Limpar sessões antigas
  cleanupInactiveSessions(maxAgeMinutes = 60) {
    let cleaned = 0;
    
    for (const [key, session] of this.sessions) {
      if (session.isInactive(maxAgeMinutes)) {
        session.destroy();
        this.sessions.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 ${cleaned} sessões inativas removidas`);
    }
    
    return cleaned;
  }
  
  // Iniciar limpeza automática
  _startCleanup() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveSessions(60); // Limpar após 1h de inatividade
    }, 10 * 60 * 1000); // Verificar a cada 10 minutos
  }
  
  // Destruir tudo (shutdown)
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    for (const session of this.sessions.values()) {
      session.destroy();
    }
    this.sessions.clear();
  }
}

// Instância global
const globalSessionManager = new SessionManager();

// Middleware para Express
function contextPersistenceMiddleware() {
  return (req, res, next) => {
    // Extrair session key do header ou body
    const sessionKey = req.headers['x-session-key'] || 
                       req.body?.sessionKey || 
                       req.query?.session ||
                       'default';
    
    // Anexar sessão ao request
    req.contextSession = globalSessionManager.getSession(sessionKey);
    req.sessionKey = sessionKey;
    
    next();
  };
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n💾 Salvando todas as sessões...');
  globalSessionManager.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  globalSessionManager.destroy();
  process.exit(0);
});

module.exports = {
  ContextPersistence,
  SessionManager,
  contextPersistenceMiddleware,
  globalSessionManager
};
