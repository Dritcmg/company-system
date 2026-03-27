// ═══════════════════════════════════════════
//  OPEN TYCOON — Office API Routes
// ═══════════════════════════════════════════

const express = require('express');
const { queryAll, queryOne } = require('../db/database');

const router = express.Router();

// GET /api/escritorio/status
router.get('/status', (req, res) => {
  const getState = (key, fallback) => {
    const row = queryOne('SELECT value FROM office_state WHERE key = ?', [key]);
    return row ? row.value : fallback;
  };
  
  const agentRows = queryAll("SELECT COUNT(*) as c FROM agents WHERE status = 'ativo'");
  const agentes_ativos = agentRows.length > 0 ? agentRows[0].c : 0;
  
  const taskRows = queryAll("SELECT COUNT(*) as c FROM tasks WHERE status IN ('backlog', 'em_execucao')");
  const tarefas_pendentes = taskRows.length > 0 ? taskRows[0].c : 0;
  
  res.json({
    fase: getState('fase', 'startup'),
    nome: getState('nome', 'Open Tycoon HQ'),
    saldo_tokens: parseInt(getState('saldo_tokens', '999999999')),
    agentes_ativos,
    tarefas_pendentes,
    proxima_expansao: null,
  });
});

// GET /api/relatorio/diario
router.get('/relatorio/diario', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  
  const doneRows = queryAll(
    "SELECT COUNT(*) as c FROM tasks WHERE status = 'concluida' AND concluida_em LIKE ?",
    [`${today}%`]
  );
  const concluidas = doneRows.length > 0 ? doneRows[0].c : 0;
  
  const errRows = queryAll(
    "SELECT COUNT(*) as c FROM tasks WHERE status = 'erro' AND concluida_em LIKE ?",
    [`${today}%`]
  );
  const erros = errRows.length > 0 ? errRows[0].c : 0;
  
  const agents = queryAll(
    "SELECT nome, tarefas_concluidas FROM agents WHERE status = 'ativo' ORDER BY tarefas_concluidas DESC"
  );
  
  res.json({
    data: today,
    tarefas_concluidas: concluidas,
    tokens_consumidos: concluidas * 500,
    erros,
    agentes_destaque: agents.slice(0, 3).map(a => a.nome),
    alertas: [],
  });
});

module.exports = router;
