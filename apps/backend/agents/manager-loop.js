// ═══════════════════════════════════════════
//  OPEN TYCOON — Manager AI Sub-loop
//  Periodically checks the backlog and auto-delegates
// ═══════════════════════════════════════════

const { queryOne, queryAll, runAndSave } = require('../db/database');
const { getBestModel, isOllamaAvailable } = require('../services/ollama-brain');

// Tick every 15 real seconds (to not spam the LLM)
let lastRun = Date.now();
const COOLDOWN = 15000;

async function checkManagerAI(broadcast) {
  const now = Date.now();
  if (now - lastRun < COOLDOWN) return;
  lastRun = now;

  // 1. Find if we have a Manager who is idle
  const manager = queryOne(`
    SELECT id, nome FROM agents 
    WHERE cargo = 'manager' AND estado_atual = 'idle'
  `);
  
  if (!manager) return; // No idle manager available

  // 2. See if there are pending tasks in the backlog
  const pendingTasks = queryAll(`
    SELECT id, tipo, descricao, prioridade 
    FROM tasks 
    WHERE status = 'backlog' 
    ORDER BY CASE prioridade WHEN 'alta' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END, criada_em ASC
    LIMIT 1
  `);

  if (pendingTasks.length === 0) return; // Nothing to do

  const task = pendingTasks[0]; // Take the most urgent task

  // 3. Find other idle agents (potential assignees, including the manager himself)
  const idleAgents = queryAll(`
    SELECT id, nome, cargo, skills FROM agents 
    WHERE estado_atual = 'idle'
  `);

  // Simple heuristic for now: if someone else is idle, assign to them, 
  // otherwise manager assigns to himself if urgent, otherwise waits.
  
  let assignee = null;
  const isManagerReadHeavy = task.tipo === 'read_file' || task.descricao.toLowerCase().includes('visao') || task.descricao.toLowerCase().includes('vision');

  if (isManagerReadHeavy) {
    // If it's a strategic read/analysis, manager takes it
    assignee = manager;
  } else {
    // Try to find an idle intern
    assignee = idleAgents.find(a => a.cargo === 'estagiario') || manager;
  }

  // Auto delegate using internal API call behavior
  console.log(`👔 Manager AI: Delegating task "${task.descricao}" to ${assignee.nome}`);

  // Broadcast the manager thinking
  broadcast({
    type: 'AGENTE_PENSANDO',
    payload: { 
      agente_id: manager.id, 
      tarefa_id: null, 
      pensamento: `👔 Priorizando task: "${task.descricao.slice(0, 15)}...". Delegando para: ${assignee.nome}` 
    }
  });

  // Call the delegar route via simulated request
  setTimeout(async () => {
    try {
      const res = await fetch('http://localhost:3000/api/delegar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agente_id: assignee.id,
          tarefa_id: task.id, // Update existing
          descricao: task.descricao,
          tipo: task.tipo,
          prioridade: task.prioridade
        })
      });
      if (!res.ok) console.error('Manager AI failed to delegate via HTTP');
    } catch (e) {
      console.error('Manager HTTP Error', e.message);
    }
  }, 2500);
}

module.exports = { checkManagerAI };
