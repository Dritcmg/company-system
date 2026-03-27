// ═══════════════════════════════════════════
//  OPEN TYCOON — OpenClaw Integration Service
//  Connects to the local OpenClaw Gateway
// ═══════════════════════════════════════════

const OPENCLAW_URL = 'http://localhost:18789';

/**
 * Spawn a session via the OpenClaw Gateway to execute a real task.
 * Falls back to mock if OpenClaw Gateway is not running.
 */
async function spawnSession(task, agentId, timeoutSeconds = 300) {
  try {
    const response = await fetch(`${OPENCLAW_URL}/api/spawn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task,
        agentId,
        timeoutSeconds,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`OpenClaw Gateway responded with ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`🔗 OpenClaw session for ${agentId}:`, data.success ? 'OK' : 'FAIL');
    return { success: true, data, mock: !data.openclawReal };
  } catch (err) {
    console.log(`⚠️ OpenClaw Gateway not available for ${agentId}: ${err.message}`);
    return mockExecution(task, agentId);
  }
}

/**
 * Check if the OpenClaw Gateway is running
 */
async function isGatewayAvailable() {
  try {
    const res = await fetch(`${OPENCLAW_URL}/health`, { 
      signal: AbortSignal.timeout(2000) 
    });
    const data = await res.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
}

/**
 * Simulate task execution when OpenClaw is not running.
 */
function mockExecution(task, agentId) {
  const mockResults = {
    read_file: `Arquivo lido com sucesso.\n\nResumo: Estrutura bem definida, documentação clara, 3 seções principais.`,
    write_file: `Arquivo criado/atualizado.\n\nLocalização: ./output/resultado.md\nTamanho: 2.4 KB`,
    web_search: `Pesquisa concluída. 5 resultados relevantes encontrados.\n\n1. Documentação oficial\n2. Tutorial passo a passo\n3. Exemplos de implementação`,
    exec: `Comando executado com sucesso.\n\nOutput: Processo concluído sem erros.\nTempo: 1.2s`,
    research: `Análise concluída.\n\n15 pontos de dados analisados.\nConclusão: Resultados dentro do esperado.`,
  };

  const taskType = typeof task === 'object' ? task.tipo : 'exec';
  const result = mockResults[taskType] || mockResults.exec;

  return {
    success: true,
    mock: true,
    data: {
      sessionId: `mock-${Date.now()}`,
      agentId,
      result,
      duration: `${(Math.random() * 4 + 1).toFixed(1)}s`,
    },
  };
}

module.exports = { spawnSession, isGatewayAvailable };
