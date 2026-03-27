// ═══════════════════════════════════════════
//  CONTEXT WINDOW MANAGER
//  Gerenciamento automático de janela de contexto para Ollama
//  Estratégias: Sliding Window + Summarization
// ═══════════════════════════════════════════

const { v4: uuidv4 } = require('uuid');

class ContextManager {
  constructor(options = {}) {
    // Configurações padrão
    this.maxTokens = options.maxTokens || 4096;      // Limite do modelo
    this.keepTokens = options.keepTokens || 1024;    // Quanto manter ao resumir
    this.summarizeThreshold = options.summarizeThreshold || 0.8; // % do limite para resumir
    this.maxMessages = options.maxMessages || 50;    // Máximo de mensagens na janela
    
    // Estado
    this.conversationId = options.conversationId || uuidv4();
    this.messages = [];        // Mensagens atuais na janela
    this.summaries = [];       // Resumos de conversas anteriores
    this.totalTokens = 0;     // Estimativa atual
    this.messageCount = 0;    // Contador total de mensagens
    
    // Callbacks
    this.onSummarize = options.onSummarize || null;
    this.onRotate = options.onRotate || null;
    this.onWarning = options.onWarning || null;
  }
  
  // Adicionar mensagem à conversa
  addMessage(role, content, metadata = {}) {
    const message = {
      id: uuidv4(),
      role,           // 'system', 'user', 'assistant', 'tool'
      content,
      timestamp: Date.now(),
      tokens: this._estimateTokens(content),
      metadata
    };
    
    this.messages.push(message);
    this.totalTokens += message.tokens;
    this.messageCount++;
    
    // Verificar se precisa de manutenção
    this._checkMaintenance();
    
    return message;
  }
  
  // Obter contexto formatado para Ollama
  getContextForOllama(systemPrompt = null) {
    const context = [];
    
    // 1. System prompt (sempre primeiro)
    if (systemPrompt) {
      context.push({
        role: 'system',
        content: systemPrompt
      });
    }
    
    // 2. Resumos anteriores (como contexto de sistema)
    if (this.summaries.length > 0) {
      const summariesText = this.summaries.map((s, i) => 
        `[Resumo da Parte ${i + 1}]\n${s.content}`
      ).join('\n\n');
      
      context.push({
        role: 'system',
        content: `## Contexto da Conversa Anterior\n${summariesText}\n\n## Continuação`
      });
    }
    
    // 3. Mensagens recentes
    for (const msg of this.messages) {
      context.push({
        role: msg.role,
        content: msg.content
      });
    }
    
    return context;
  }
  
  // Verificar e executar manutenção se necessário
  _checkMaintenance() {
    const usageRatio = this.totalTokens / this.maxTokens;
    
    // Alerta prévio
    if (usageRatio > this.summarizeThreshold && this.onWarning) {
      this.onWarning({
        usage: usageRatio,
        tokens: this.totalTokens,
        maxTokens: this.maxTokens,
        message: `Contexto em ${(usageRatio * 100).toFixed(0)}%. Resumo automático em breve...`
      });
    }
    
    // Sliding window: remover mensagens antigas se exceder limite
    if (this.messages.length > this.maxMessages) {
      this._applySlidingWindow();
    }
    
    // Summarization: se ainda estiver perto do limite
    if (usageRatio >= this.summarizeThreshold) {
      this._summarizeAndRotate();
    }
  }
  
  // Aplicar sliding window (remove mensagens antigas)
  _applySlidingWindow() {
    const toRemove = this.messages.length - this.maxMessages;
    const removed = this.messages.splice(0, toRemove);
    
    for (const msg of removed) {
      this.totalTokens -= msg.tokens;
    }
    
    console.log(`🔄 Sliding Window: removidas ${toRemove} mensagens antigas`);
    
    if (this.onRotate) {
      this.onRotate({
        type: 'sliding_window',
        removed: removed.length,
        remaining: this.messages.length
      });
    }
  }
  
  // Resumir e rotacionar contexto
  async _summarizeAndRotate() {
    console.log('📝 Summarizing conversation...');
    
    // Separar mensagens para resumir (as mais antigas)
    const tokensToSummarize = this.totalTokens - this.keepTokens;
    let accumulatedTokens = 0;
    let splitIndex = 0;
    
    for (let i = 0; i < this.messages.length; i++) {
      accumulatedTokens += this.messages[i].tokens;
      if (accumulatedTokens >= tokensToSummarize) {
        splitIndex = i + 1;
        break;
      }
    }
    
    const toSummarize = this.messages.splice(0, splitIndex);
    const summaryContent = this._generateSummary(toSummarize);
    
    // Adicionar aos resumos
    this.summaries.push({
      id: uuidv4(),
      messageRange: { start: this.messageCount - toSummarize.length, end: this.messageCount },
      content: summaryContent,
      timestamp: Date.now()
    });
    
    // Recalcular tokens
    this.totalTokens = this.messages.reduce((sum, m) => sum + m.tokens, 0);
    
    console.log(`✅ Resumo criado: ${toSummarize.length} mensagens → ${this._estimateTokens(summaryContent)} tokens`);
    
    if (this.onSummarize) {
      this.onSummarize({
        summarized: toSummarize.length,
        summaryTokens: this._estimateTokens(summaryContent),
        remaining: this.messages.length,
        totalSummaries: this.summaries.length
      });
    }
  }
  
  // Gerar resumo simples (pode ser melhorado com LLM)
  _generateSummary(messages) {
    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    
    // Extrair tópicos principais
    const topics = this._extractTopics(messages);
    
    // Contar decisões/ações
    const actions = this._extractActions(messages);
    
    return `Período: ${this._formatDate(messages[0]?.timestamp)} - ${this._formatDate(messages[messages.length - 1]?.timestamp)}
Tópicos: ${topics.join(', ') || 'Conversa geral'}
Mensagens: ${messages.length} (${userMessages.length} do usuário, ${assistantMessages.length} do assistente)
Decisões/Actions: ${actions.length > 0 ? actions.join('; ') : 'Nenhuma registrada'}
Contexto mantido: ${this.messages.length} mensagens recentes`;
  }
  
  // Extrair tópicos das mensagens (simplificado)
  _extractTopics(messages) {
    const allText = messages.map(m => m.content).join(' ');
    const keywords = [
      'código', 'programação', 'script', 'função', 'bug', 'erro',
      'arquivo', 'pasta', 'diretório', 'projeto',
      'configuração', 'setup', 'instalação',
      'banco de dados', 'API', 'servidor',
      'agente', 'IA', 'modelo', 'Ollama'
    ];
    
    return keywords.filter(kw => 
      allText.toLowerCase().includes(kw.toLowerCase())
    ).slice(0, 5);
  }
  
  // Extrair ações/decisões
  _extractActions(messages) {
    const actions = [];
    const actionPatterns = [
      /(criar|criei|create|created)\s+(.+?)(?:\.|$)/i,
      /(implementar|implementei|implement)\s+(.+?)(?:\.|$)/i,
      /(configurar|configurei|setup)\s+(.+?)(?:\.|$)/i,
      /(adicionar|adicionei|add)\s+(.+?)(?:\.|$)/i,
      /(remover|removi|delete)\s+(.+?)(?:\.|$)/i,
      /(atualizar|atualizei|update)\s+(.+?)(?:\.|$)/i
    ];
    
    for (const msg of messages) {
      for (const pattern of actionPatterns) {
        const match = msg.content.match(pattern);
        if (match) {
          actions.push(`${match[1]} ${match[2]}`.substring(0, 50));
        }
      }
    }
    
    return [...new Set(actions)].slice(0, 5); // Remover duplicatas
  }
  
  // Estimativa simples de tokens (1 token ≈ 4 chars em português)
  _estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }
  
  _formatDate(timestamp) {
    if (!timestamp) return '?';
    return new Date(timestamp).toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
  
  // Estatísticas
  getStats() {
    return {
      conversationId: this.conversationId,
      totalMessages: this.messageCount,
      currentMessages: this.messages.length,
      summaries: this.summaries.length,
      estimatedTokens: this.totalTokens,
      maxTokens: this.maxTokens,
      usage: (this.totalTokens / this.maxTokens * 100).toFixed(1) + '%'
    };
  }
  
  // Limpar tudo
  clear() {
    this.messages = [];
    this.summaries = [];
    this.totalTokens = 0;
    this.messageCount = 0;
    this.conversationId = uuidv4();
  }
  
  // Exportar estado (para persistência)
  export() {
    return {
      conversationId: this.conversationId,
      messages: this.messages,
      summaries: this.summaries,
      totalTokens: this.totalTokens,
      messageCount: this.messageCount,
      exportedAt: Date.now()
    };
  }
  
  // Importar estado
  import(data) {
    this.conversationId = data.conversationId || uuidv4();
    this.messages = data.messages || [];
    this.summaries = data.summaries || [];
    this.totalTokens = data.totalTokens || 0;
    this.messageCount = data.messageCount || 0;
  }
}

// Wrapper para integração com Ollama
class OllamaContextSession {
  constructor(ollamaBrain, options = {}) {
    this.brain = ollamaBrain;
    this.context = new ContextManager({
      maxTokens: options.maxTokens || 4096,
      keepTokens: options.keepTokens || 1024,
      onSummarize: (info) => {
        console.log('📝 Contexto resumido:', info);
      },
      onWarning: (info) => {
        console.log('⚠️ ', info.message);
      }
    });
    
    this.systemPrompt = options.systemPrompt || null;
  }
  
  // Enviar mensagem e obter resposta
  async chat(userMessage, options = {}) {
    // Adicionar mensagem do usuário
    this.context.addMessage('user', userMessage);
    
    // Obter contexto formatado
    const messages = this.context.getContextForOllama(this.systemPrompt);
    
    // Chamar Ollama (simulado - integrar com ollama-brain.js real)
    const response = await this._callOllama(messages, options);
    
    // Adicionar resposta ao contexto
    this.context.addMessage('assistant', response);
    
    return response;
  }
  
  // Simulação de chamada Ollama
  async _callOllama(messages, options) {
    // Aqui integraria com o ollama-brain.js real
    // Por enquanto, retorna simulação
    return `[Resposta do Ollama com ${messages.length} mensagens no contexto]`;
  }
  
  // Obter estatísticas
  getStats() {
    return this.context.getStats();
  }
}

module.exports = { ContextManager, OllamaContextSession };
