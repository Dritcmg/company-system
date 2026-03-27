// ═══════════════════════════════════════════
//  OPEN TYCOON — Agent Runner
//  Executa agente com LLM e emite eventos OpenClaw
// ═══════════════════════════════════════════

const { v4: uuidv4 } = require('uuid');
const { chatStream } = require('./llm-router');

// Detecta sub-agentes no texto: [SPAWN: descrição da tarefa]
// Criado como função para evitar problema de lastIndex com flag /g
function buildSpawnPattern() {
  return /\[SPAWN:\s*([^\]]+)\]/g;
}

/**
 * Executa um agente com LLM e emite eventos de lifecycle e streaming.
 *
 * @param {Object} agentConfig   - { id, nome, cargo, llm_provider?, llm_model?, personalidade? }
 * @param {Array}  messages      - [{ role: 'system'|'user'|'assistant', content: string }]
 * @param {string} sessionKey    - Chave da sessão (ex: "agent:wallace:main")
 * @param {Function} broadcastFn - Função de broadcast WebSocket
 * @returns {Promise<{ content: string, runId: string, subAgentsSpawned: string[] }>}
 */
async function runAgent(agentConfig, messages, sessionKey, broadcastFn) {
  const runId = uuidv4();
  let seq = 0;
  let fullContent = '';
  const subAgentsSpawned = [];

  function emit(stream, data) {
    broadcastFn({
      type: 'event',
      event: 'agent',
      payload: {
        runId,
        seq: seq++,
        stream,
        ts: Date.now(),
        data,
        sessionKey,
      },
    });
  }

  // Lifecycle: início
  emit('lifecycle', { phase: 'thinking' });
  console.log(`🤖 Agent runner: ${agentConfig.nome || agentConfig.id} [${runId}]`);

  try {
    await chatStream(
      messages,
      {
        llm_provider: agentConfig.llm_provider,
        llm_model: agentConfig.llm_model,
      },
      {},
      (chunk) => {
        fullContent += chunk;
        emit('assistant', { text: chunk });
      }
    );

    // Detecta spawn de sub-agentes no conteúdo completo
    const spawnPattern = buildSpawnPattern();
    let match;
    while ((match = spawnPattern.exec(fullContent)) !== null) {
      subAgentsSpawned.push(match[1].trim());
    }

    // Lifecycle: fim
    emit('lifecycle', { phase: 'end', subAgentsSpawned });

    return { content: fullContent, runId, subAgentsSpawned };
  } catch (err) {
    console.error(`❌ Agent runner error [${runId}]:`, err.message);
    emit('lifecycle', { phase: 'error', error: err.message });
    throw err;
  }
}

module.exports = { runAgent };
