// ═══════════════════════════════════════════
//  OPEN TYCOON — Ollama Brain Service
//  Mantém a interface pública original e delega ao llm-router.js
//  O resto do app continua usando: think, isOllamaAvailable, getBestModel, mockThink
// ═══════════════════════════════════════════

const { chat, chatStream } = require('./llm-router');

const OLLAMA_URL = (process.env.OLLAMA_URL || 'http://localhost:11434').replace(/\/$/, '');
const MAX_CONTEXT_TOKENS = 4096;

// Prompts por cargo — mantidos aqui para não quebrar callers existentes
const ROLE_PROMPTS = {
  manager: `Você é Ricardo Souza (Rick), gerente de projetos sênior.
Personalidade: Meticuloso, organizado, analítico.
Seu papel:
- Avaliar tarefas e decidir prioridades
- Delegar trabalho quando apropriado
- Revisar resultados e dar feedback construtivo
- Identificar quando o time precisa de mais membros
Sempre responda em português brasileiro. Seja conciso e profissional.
Traga insights valiosos e resolva pendências.`,

  estagiario: `Você é João Pedro (JP), estagiário esfomeado por aprender.
Personalidade: Energético, curioso, rápido mas às vezes descuidado.
Seu papel:
- Executar tarefas operacionais com entusiasmo
- Ler e resumir documentos
- Fazer pesquisas e compilar informações
- Perguntar quando não entender algo
Sempre responda em português brasileiro. Seja animado mas profissional.
Use emojis com moderação. Mostre que está aprendendo e evite falhas graves.`,
};

// Monta o prompt de usuário a partir da tarefa
function buildTaskPrompt(task, fileContent = null) {
  let prompt = `TAREFA: ${task.descricao}\nTIPO: ${task.tipo}`;

  if (fileContent) {
    const maxContent = Math.min(fileContent.length, 3000);
    prompt += `\n\nCONTEÚDO DO ARQUIVO:\n\`\`\`\n${fileContent.slice(0, maxContent)}\n\`\`\``;
  }

  prompt += '\n\nExecute a tarefa acima e dê sua resposta:';
  return prompt;
}

// Verifica se o Ollama local está disponível
async function isOllamaAvailable() {
  try {
    const fetch = require('cross-fetch');
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

// Lista modelos instalados no Ollama local
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

// Retorna o melhor modelo disponível no Ollama local
async function getBestModel() {
  const models = await listModels();
  if (models.length === 0) return null;

  const preferred = [
    m => m.name?.includes('qwen2.5-coder'),
    m => m.name?.includes('coder'),
    m => m.name?.includes('qwen'),
    () => true,
  ];

  for (const check of preferred) {
    const found = models.find(check);
    if (found) return found.name;
  }
  return models[0]?.name || null;
}

// Resposta simulada quando nenhum LLM está disponível
function mockThink(role, task) {
  const desc = task.descricao || '';
  const isRead = task.tipo === 'read_file' || desc.toLowerCase().includes('leia') || desc.toLowerCase().includes('ler');
  const isSearch = task.tipo === 'web_search' || desc.toLowerCase().includes('pesquis');

  let result;
  if (isRead) {
    result = `📄 Arquivo analisado com sucesso.\n\nResumo:\nO arquivo contém informações relevantes sobre o projeto.\n\nPrincipais pontos:\n- Estrutura bem definida\n- Documentação clara\n- 3 seções principais identificadas\n\n${role === 'manager' ? '📋 Recomendo revisão detalhada antes de prosseguir.' : '🔥 Pronto! Já li tudo, chefe!'}`;
  } else if (isSearch) {
    result = `🔍 Pesquisa concluída.\n\nResultados encontrados:\n- 5 fontes relevantes identificadas\n- Tendências atuais mapeadas\n- Principais insights compilados\n\n${role === 'manager' ? '📊 Análise completa. Veja o relatório detalhado.' : '⚡ Pesquisei tudo! Achei umas coisas bem legais.'}`;
  } else {
    result = `✅ Tarefa executada: "${desc}"\n\n${role === 'manager'
      ? 'Resultado entregue dentro dos padrões de qualidade esperados.\nRecomendo validação antes de avançar.'
      : 'Terminei! Foi desafiador mas consegui 💪\nSe precisar de ajustes, é só falar!'}`;
  }

  return { result, model: 'mock', tokens: 0, duration: Math.random() * 3 + 2, mock: true };
}

/**
 * Função principal: faz o agente "pensar" sobre uma tarefa.
 * Delega ao llm-router, mantendo streaming e broadcast de pensamentos.
 *
 * @param {string}   agentRole   - cargo do agente (manager, estagiario…)
 * @param {Object}   task        - { descricao, tipo, _agentId, llm_provider?, llm_model? }
 * @param {Function} broadcast   - função para emitir pensamentos via WebSocket
 * @param {string}   fileContent - conteúdo de arquivo (opcional)
 * @param {string}   agentMemory - histórico de memória do agente (opcional)
 * @returns {Promise<{result, model, tokens, duration, mock}>}
 */
async function think(agentRole, task, broadcast, fileContent = null, agentMemory = '') {
  // Config de LLM pode vir direto na tarefa (do agente no banco)
  const agentConfig = {
    llm_provider: task.llm_provider || null,
    llm_model: task.llm_model || null,
  };

  // Se for Ollama sem modelos, cai no mock
  const isOllama = !agentConfig.llm_provider || agentConfig.llm_provider === 'ollama';
  if (isOllama) {
    const available = await isOllamaAvailable();
    if (!available) {
      console.log('🧠 Ollama não disponível — usando mock brain');
      return mockThink(agentRole, task);
    }

    const bestModel = await getBestModel();
    if (!bestModel) {
      console.log('🧠 Nenhum modelo encontrado no Ollama — usando mock brain');
      return mockThink(agentRole, task);
    }

    // Se nenhum modelo foi especificado, usa o melhor disponível
    if (!agentConfig.llm_model) agentConfig.llm_model = bestModel;
  }

  let systemPrompt = ROLE_PROMPTS[agentRole] || ROLE_PROMPTS.estagiario;
  if (agentMemory && agentMemory !== 'Sem histórico recente.') {
    systemPrompt += `\n\n[MEMÓRIA DO AGENTE (Ações Recentes)]\n${agentMemory}`;
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: buildTaskPrompt(task, fileContent) },
  ];

  const options = { num_ctx: MAX_CONTEXT_TOKENS, temperature: 0.7 };

  console.log(`🧠 Thinking as ${agentRole} via llm-router...`);

  try {
    let fullResponse = '';
    let thoughtBuffer = '';

    // Usa streaming para broadcast em tempo real de pensamentos
    await chatStream(messages, agentConfig, options, (chunk) => {
      fullResponse += chunk;
      thoughtBuffer += chunk;

      // Emite pensamento a cada ~50 chars para a UI 3D
      if (thoughtBuffer.length > 50 && broadcast) {
        broadcast({
          type: 'AGENTE_PENSANDO',
          payload: {
            agente_id: task._agentId,
            pensamento: thoughtBuffer.slice(0, 80),
            completo: false,
          },
        });
        thoughtBuffer = '';
      }
    });

    // Emite sinal de conclusão
    if (broadcast && thoughtBuffer.length > 0) {
      broadcast({
        type: 'AGENTE_PENSANDO',
        payload: {
          agente_id: task._agentId,
          pensamento: thoughtBuffer.slice(0, 80),
          completo: true,
        },
      });
    }

    if (!fullResponse) return mockThink(agentRole, task);

    return {
      result: fullResponse.trim(),
      model: agentConfig.llm_model || 'unknown',
      tokens: 0,
      duration: 0,
      mock: false,
    };
  } catch (err) {
    console.error('Erro no think:', err.message);
    return mockThink(agentRole, task);
  }
}

module.exports = { think, isOllamaAvailable, listModels, getBestModel, mockThink };
