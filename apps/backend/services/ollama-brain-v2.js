// ═══════════════════════════════════════════
//  OLLAMA BRAIN V2 - Com Context Management
//  Integração com ContextManager para janela deslizante
// ═══════════════════════════════════════════

const { ContextManager } = require('./context-manager');

const OLLAMA_URL = 'http://localhost:11434';
const MODEL = 'qwen2.5-coder:7b';

// System prompts para cada papel
const ROLE_PROMPTS = {
  manager: `Você é Ricardo Souza (Rick), gerente de projetos sênior...`,
  estagiario: `Você é João Pedro (JP), estagiário esfomeado por aprender...`,
  ceo: `Você é Wallace, CEO da Meta-Gypsi. Sarcástico, direto, competente...`
};

// Cache de context managers por agente
const contextManagers = new Map();

function getContextManager(agentId, role) {
  const key = `${agentId}-${role}`;
  
  if (!contextManagers.has(key)) {
    contextManagers.set(key, new ContextManager({
      maxTokens: 4096,
      keepTokens: 1024,
      maxMessages: 30,
      onSummarize: (info) => {
        console.log(`📝 [${key}] Contexto resumido: ${info.summarized} msgs → ${info.summaryTokens} tokens`);
      },
      onWarning: (info) => {
        console.log(`⚠️  [${key}] ${info.message}`);
      }
    }));
  }
  
  return contextManagers.get(key);
}

// Versão melhorada da função think com context management
async function thinkWithContext(agentRole, task, broadcast, fileContent = null, agentMemory = '', agentId = 'default') {
  const available = await isOllamaAvailable();
  if (!available) {
    return mockThink(agentRole, task);
  }
  
  const model = await getBestModel();
  if (!model) {
    return mockThink(agentRole, task);
  }
  
  // Obter ou criar context manager para este agente
  const contextManager = getContextManager(agentId, agentRole);
  
  // Construir mensagem do usuário
  let userMessage = `TAREFA: ${task.descricao}`;
  if (fileContent) {
    const maxContent = Math.min(fileContent.length, 3000);
    userMessage += `\n\nCONTEÚDO DO ARQUIVO:\n\`\`\`\n${fileContent.slice(0, maxContent)}\n\`\`\``;
  }
  if (agentMemory && agentMemory !== 'Sem histórico recente.') {
    userMessage += `\n\nMEMÓRIA DO AGENTE:\n${agentMemory}`;
  }
  
  // Adicionar ao contexto
  contextManager.addMessage('user', userMessage, {
    taskId: task._agentId,
    timestamp: Date.now()
  });
  
  // Obter contexto formatado
  const systemPrompt = ROLE_PROMPTS[agentRole] || ROLE_PROMPTS.estagiario;
  const messages = contextManager.getContextForOllama(systemPrompt);
  
  console.log(`🧠 [${agentId}] Thinking with ${messages.length} messages (${contextManager.getStats().usage})`);
  
  try {
    const fetch = require('cross-fetch');
    
    // Usar streaming para resposta em tempo real
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        options: {
          num_ctx: 4096,
          temperature: 0.7,
          top_p: 0.9,
        },
      }),
    });
    
    if (!res.ok) {
      throw new Error(`Ollama API error: ${res.status}`);
    }
    
    // Processar streaming response
    return new Promise((resolve, reject) => {
      let fullResponse = '';
      let thoughtBuffer = '';
      const decoder = new TextDecoder();
      
      res.body.on('data', (chunk) => {
        const text = decoder.decode(chunk, { stream: true });
        const lines = text.split('\n').filter(l => l.trim());
        
        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            if (json.message?.content) {
              fullResponse += json.message.content;
              thoughtBuffer += json.message.content;
              
              // Broadcast thought a cada ~50 chars
              if (thoughtBuffer.length > 50) {
                if (broadcast) {
                  broadcast({
                    type: 'AGENTE_PENSANDO',
                    payload: {
                      agente_id: agentId,
                      pensamento: thoughtBuffer.slice(0, 80),
                      completo: false,
                    },
                  });
                }
                thoughtBuffer = '';
              }
            }
            
            if (json.done) {
              // Adicionar resposta ao contexto
              contextManager.addMessage('assistant', fullResponse.trim());
              
              resolve({
                result: fullResponse.trim(),
                model,
                tokens: json.eval_count || contextManager.totalTokens,
                duration: json.total_duration ? Math.round(json.total_duration / 1e9) : 0,
                mock: false,
                contextStats: contextManager.getStats()
              });
            }
          } catch (parseErr) {
            // Ignorar linhas não parseáveis
          }
        }
      });
      
      res.body.on('end', () => {
        if (!fullResponse) {
          resolve(mockThink(agentRole, task));
        }
      });
      
      res.body.on('error', reject);
    });
    
  } catch (err) {
    console.error('Ollama thinking error:', err.message);
    return mockThink(agentRole, task);
  }
}

// Funções auxiliares (mantidas do original)
async function isOllamaAvailable() {
  try {
    const fetch = require('cross-fetch');
    const res = await fetch(`${OLLAMA_URL}/api/tags`);
    return res.ok;
  } catch {
    return false;
  }
}

async function listModels() {
  try {
    const fetch = require('cross-fetch');
    const res = await fetch(`${OLLAMA_URL}/api/tags`);
    const data = await res.json();
    return data.models || [];
  } catch {
    return [];
  }
}

async function getBestModel() {
  const models = await listModels();
  if (models.length === 0) return null;
  
  const preferred = [
    m => m.name?.includes('qwen2.5-coder'),
    m => m.name?.includes('coder'),
    m => m.name?.includes('qwen'),
    m => true,
  ];
  
  for (const check of preferred) {
    const found = models.find(check);
    if (found) return found.name;
  }
  return models[0]?.name;
}

function mockThink(role, task) {
  // ... (mesma implementação do original)
  const desc = task.descricao || '';
  return {
    result: `✅ [Mock] Tarefa processada: "${desc.substring(0, 50)}..."`,
    model: 'mock',
    tokens: 0,
    duration: 2,
    mock: true,
  };
}

// Exportar funções
module.exports = {
  thinkWithContext,
  isOllamaAvailable,
  listModels,
  getBestModel,
  mockThink,
  getContextManager,
  clearContext: (agentId, role) => {
    const key = `${agentId}-${role}`;
    contextManagers.delete(key);
  }
};
