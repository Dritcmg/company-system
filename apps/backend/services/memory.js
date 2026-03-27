// ═══════════════════════════════════════════
//  OPEN TYCOON — Long-Term Memory Service
// ═══════════════════════════════════════════

const { v4: uuidv4 } = require('uuid');
const { queryAll, runAndSave } = require('../db/database');

// Approximate count of words to tokens limit
const MAX_WORDS = 2000; // Roughly 3000 tokens in Portuguese, keeping it safe for the 4096 budget

/**
 * Add a generic memory entry for an agent
 */
function addMemory(agenteId, tipo, conteudo, importancia = 1) {
  const id = uuidv4();
  runAndSave(
    'INSERT INTO agent_memory (id, agente_id, tipo, conteudo, importancia) VALUES (?, ?, ?, ?, ?)',
    [id, agenteId, tipo, conteudo, importancia]
  );
}

/**
 * Log a completed task as a memory
 */
function addTaskResultToMemory(agenteId, taskDesc, resultado) {
  // Truncate long results
  const maxResLength = 400;
  let cleanRes = resultado || '';
  if (cleanRes.length > maxResLength) {
    cleanRes = cleanRes.slice(0, maxResLength) + '...';
  }

  const memoryText = `Cumpriu a tarefa: "${taskDesc}". Resultado resumido: ${cleanRes}`;
  addMemory(agenteId, 'task_result', memoryText, 2);
}

/**
 * Get relevant memory context for the agent, compressing if it's too long
 * (Currently uses a simple chronological cutoff approach to prevent context bloat)
 */
function getMemoryContext(agenteId) {
  // Fetch summaries and high-importance memories, plus recent actions
  const memories = queryAll(
    'SELECT conteudo FROM agent_memory WHERE agente_id = ? ORDER BY criado_em DESC LIMIT 15',
    [agenteId]
  );

  if (!memories || memories.length === 0) {
    return 'Sem histórico recente.';
  }

  // Reverse to make it chronological
  const chronological = memories.reverse();

  let contextString = '';
  let wordCount = 0;

  for (const row of chronological) {
    const text = row.conteudo;
    const words = text.split(/\s+/).length;

    if (wordCount + words > MAX_WORDS) {
      break; 
    }

    contextString += `- ${text}\n`;
    wordCount += words;
  }

  return contextString.trim();
}

/**
 * Clean up old tasks if backlog is too big
 * E.g., removes completed tasks from the board after a certain threshold
 */
function pruneCompletedTasks() {
  // Delete tasks that are 'concluida' and older than 1 day, or keep only top N
  // We'll just delete any completed task that is not the top 30 most recent completed
  const oldTasks = queryAll(`
    SELECT id FROM tasks 
    WHERE status = 'concluida' 
    ORDER BY concluida_em DESC 
    LIMIT -1 OFFSET 20
  `);

  for (const t of oldTasks) {
    runAndSave('DELETE FROM tasks WHERE id = ?', [t.id]);
  }
}

module.exports = {
  addMemory,
  addTaskResultToMemory,
  getMemoryContext,
  pruneCompletedTasks
};
