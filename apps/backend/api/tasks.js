// ═══════════════════════════════════════════
//  OPEN TYCOON — Tasks API Routes
// ═══════════════════════════════════════════

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { queryAll, queryOne, runAndSave } = require('../db/database');

const router = express.Router();

// POST /api/tarefa/criar
router.post('/criar', (req, res) => {
  const { tipo, descricao, parametros, prazo, prioridade } = req.body;
  
  const id = uuidv4();
  
  runAndSave(`
    INSERT INTO tasks (id, tipo, descricao, parametros, prioridade, prazo)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    id,
    tipo || 'exec',
    descricao || 'Tarefa sem descrição',
    JSON.stringify(parametros || {}),
    prioridade || 'normal',
    prazo || null
  ]);
  
  const rows = queryAll("SELECT COUNT(*) as c FROM tasks WHERE status = 'backlog'");
  const count = rows.length > 0 ? rows[0].c : 0;
  
  res.json({ tarefa_id: id, posicao_fila: count });
});

// GET /api/tarefa/status
router.get('/status', (req, res) => {
  const backlog = queryAll("SELECT * FROM tasks WHERE status = 'backlog' ORDER BY criada_em DESC");
  const em_execucao = queryAll("SELECT * FROM tasks WHERE status = 'em_execucao' ORDER BY iniciada_em DESC");
  const concluidas = queryAll("SELECT * FROM tasks WHERE status = 'concluida' ORDER BY concluida_em DESC LIMIT 20");
  const erros = queryAll("SELECT * FROM tasks WHERE status = 'erro' ORDER BY concluida_em DESC LIMIT 10");
  
  const parseTasks = (tasks) => tasks.map(t => ({ ...t, parametros: JSON.parse(t.parametros || '{}') }));
  
  res.json({
    backlog: parseTasks(backlog),
    em_execucao: parseTasks(em_execucao),
    concluidas: parseTasks(concluidas),
    erros: parseTasks(erros),
  });
});

// GET /api/tarefa/:id
router.get('/:id', (req, res) => {
  const task = queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  if (!task) return res.status(404).json({ erro: 'Tarefa não encontrada' });
  res.json({ ...task, parametros: JSON.parse(task.parametros || '{}') });
});

// POST /api/tarefa/priorizar
router.post('/priorizar', (req, res) => {
  const { tarefa_id } = req.body;
  runAndSave("UPDATE tasks SET prioridade = 'alta' WHERE id = ?", [tarefa_id]);
  res.json({ sucesso: true });
});

module.exports = router;
