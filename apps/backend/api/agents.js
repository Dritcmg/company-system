// ═══════════════════════════════════════════
//  OPEN TYCOON — Agents API Routes
// ═══════════════════════════════════════════

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb, queryAll, queryOne, runAndSave } = require('../db/database');

const router = express.Router();

// GET /api/agente/listar
router.get('/listar', (req, res) => {
  const agents = queryAll('SELECT * FROM agents WHERE status = ?', ['ativo']);
  const parsed = agents.map(parseAgent);
  res.json({ agentes: parsed });
});

// GET /api/agente/:id
router.get('/:id', (req, res) => {
  const agent = queryOne('SELECT * FROM agents WHERE id = ?', [req.params.id]);
  if (!agent) return res.status(404).json({ erro: 'Agente não encontrado' });
  res.json(parseAgent(agent));
});

// POST /api/agente/contratar
router.post('/contratar', (req, res) => {
  const { nome, apelido, cargo, personalidade, skills, avatar, avatar_cor, avatar_acessorios } = req.body;

  const id = `${cargo || 'agent'}-${uuidv4().slice(0, 8)}`;
  const isManager = cargo === 'manager';

  // Assign desk position based on slot availability
  const taken = queryAll('SELECT mesa_x, mesa_z FROM agents WHERE status = ?', ['ativo'])
    .map(r => `${r.mesa_x},${r.mesa_z}`);
  const slots = [
    [2, 2], [2, 6], [5, 2], [5, 6], [8, 2], [8, 6],
  ];
  const slot = slots.find(([x, z]) => !taken.includes(`${x},${z}`)) || [8, 6];

  runAndSave(`
    INSERT INTO agents (id, nome, apelido, cargo, personalidade, skills, avatar_cor, avatar_acessorios,
      mesa_x, mesa_y, mesa_z, mesa_rotacao, estado_atual, contratado_em)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'idle', datetime('now'))
  `, [
    id,
    nome || 'Novo Agente',
    apelido || (nome || 'Agente').split(' ')[0],
    cargo || 'estagiario',
    personalidade || 'meticuloso',
    JSON.stringify(skills || ['read', 'write']),
    avatar_cor || avatar?.cor || (isManager ? '#2d5a3d' : '#aa6600'),
    JSON.stringify(avatar_acessorios || avatar?.acessorios || (isManager ? ['oculos', 'gravata'] : ['cracha'])),
    slot[0],
    slot[1],
    -Math.PI / 2,
  ]);

  const agent = queryOne('SELECT * FROM agents WHERE id = ?', [id]);
  res.json(parseAgent(agent));
});

// POST /api/agente/demitir
router.post('/demitir', (req, res) => {
  const { agente_id, motivo, detalhes } = req.body;
  
  const agent = queryOne('SELECT * FROM agents WHERE id = ?', [agente_id]);
  if (!agent) return res.status(404).json({ erro: 'Agente não encontrado' });
  
  runAndSave(`
    INSERT INTO dismissals (id, agente_id, nome, cargo, motivo, detalhes)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [uuidv4(), agente_id, agent.nome, agent.cargo, motivo || 'CORTE_CUSTO', detalhes || '']);
  
  runAndSave('UPDATE agents SET status = ? WHERE id = ?', ['demitido', agente_id]);
  
  res.json({ sucesso: true, indenizacao: 0 });
});

// POST /api/agente/atribuir-tarefa
router.post('/atribuir-tarefa', (req, res) => {
  const { agente_id, tarefa } = req.body;
  
  const agent = queryOne('SELECT * FROM agents WHERE id = ?', [agente_id]);
  if (!agent) return res.status(404).json({ erro: 'Agente não encontrado' });
  
  const taskId = uuidv4();
  
  runAndSave(`
    INSERT INTO tasks (id, tipo, descricao, parametros, prioridade, status, agente_id, iniciada_em)
    VALUES (?, ?, ?, ?, ?, 'em_execucao', ?, datetime('now'))
  `, [
    taskId,
    tarefa?.tipo || 'exec',
    tarefa?.descricao || tarefa?.parametros?.path || 'Tarefa sem descrição',
    JSON.stringify(tarefa?.parametros || {}),
    tarefa?.prioridade || 'normal',
    agente_id
  ]);
  
  runAndSave('UPDATE agents SET estado_atual = ?, tarefa_atual_id = ? WHERE id = ?',
    ['working', taskId, agente_id]);
  
  res.json({ tarefa_id: taskId, status: 'aceita' });
});

// POST /api/agente/concluir-tarefa
router.post('/concluir-tarefa', (req, res) => {
  const { tarefa_id, resultado, erro } = req.body;
  
  const status = erro ? 'erro' : 'concluida';
  
  runAndSave(`
    UPDATE tasks SET status = ?, resultado = ?, erro = ?, concluida_em = datetime('now')
    WHERE id = ?
  `, [status, resultado || null, erro || null, tarefa_id]);
  
  const task = queryOne('SELECT * FROM tasks WHERE id = ?', [tarefa_id]);
  if (task?.agente_id) {
    runAndSave('UPDATE agents SET estado_atual = ?, tarefa_atual_id = NULL WHERE id = ?',
      ['idle', task.agente_id]);
    
    if (!erro) {
      runAndSave('UPDATE agents SET tarefas_concluidas = tarefas_concluidas + 1 WHERE id = ?',
        [task.agente_id]);
    } else {
      runAndSave('UPDATE agents SET erros = erros + 1 WHERE id = ?',
        [task.agente_id]);
    }
  }
  
  res.json({ sucesso: true, status });
});

// POST /api/agentes/:id/chat
// Chat individual com extração automática de task
router.post('/:id/chat', async (req, res) => {
  const { mensagem } = req.body;
  const agente_id = req.params.id;
  
  const agent = queryOne('SELECT * FROM agents WHERE id = ?', [agente_id]);
  if (!agent) return res.status(404).json({ erro: 'Agente não encontrado' });
  
  const nome = agent.apelido || agent.nome;
  const cargo = agent.cargo;
  
  try {
    const { thinkWithContext } = require('../services/ollama-brain-v2');
    
    // Prompt do sistema reforçado para criação inteligente de tarefas
    const promptTask = {
      descricao: `Você é ${nome} (${cargo}). O CEO está conversando com você individualmente (1-a-1).
Mensagem do CEO: "${mensagem}"

RESPONDA NORMALMENTE. Mas, SE a mensagem do CEO for um pedido, ordem, ou ideia acionável de trabalho, VOCÊ DEVE criar uma tarefa.
Para criar uma tarefa gerada automaticamente, inclua no ÚLTIMO PARÁGRAFO APENAS da sua resposta o seguinte JSON (e nada mais no json):
\`\`\`json
{
  "create_task": true,
  "projeto_id": "Nome do Projeto Curto",
  "cor_do_projeto": "#hexcolor",
  "descricao": "Descrição clara e técnica do que vou fazer"
}
\`\`\`
Se a mensagem for apenas um bate-papo, pergunte se precisa de algo, sem JSON.`,
      _agentId: agente_id
    };
    
    // Usar context manager do V2
    const respostaLlm = await thinkWithContext(cargo, promptTask, null, null, null, agente_id);
    let textoResposta = respostaLlm.result;
    let novaTaskCriada = null;
    
    // Tentar extrair json de task criado pelo LLM
    const jsonMatch = textoResposta.match(/\`\`\`json\n([\s\S]*?)\n\`\`\`/);
    if (jsonMatch) {
      try {
        const taskData = JSON.parse(jsonMatch[1]);
        if (taskData.create_task) {
          // Remover o JSON do texto de fala limpo
          textoResposta = textoResposta.replace(/\`\`\`json\n([\s\S]*?)\n\`\`\`/g, '').trim();
          
          const taskId = require('uuid').v4();
          runAndSave(`
            INSERT INTO tasks (id, tipo, descricao, prioridade, status, projeto_id, cor_do_projeto, agente_id)
            VALUES (?, 'exec', ?, 'alta', 'backlog', ?, ?, ?)
          `, [
            taskId,
            taskData.descricao || 'Tarefa automática',
            taskData.projeto_id || 'geral',
            taskData.cor_do_projeto || '#FF8A65',
            agente_id
          ]);
          
          novaTaskCriada = {
            id: taskId,
            descricao: taskData.descricao,
            projeto_id: taskData.projeto_id,
            cor_do_projeto: taskData.cor_do_projeto
          };
        }
      } catch(e) { console.error('Falha ao parsear task do LLM:', e.message); }
    }
    
    res.json({
      resposta: textoResposta,
      task_criada: novaTaskCriada,
      mock: respostaLlm.mock
    });
    
  } catch(e) {
    console.error('Agent chat error:', e);
    
    // Fallback inteligente mock
    let textoMock = `Chefe, entendi a mensagem: "${mensagem}". Pode deixar comigo.`;
    let mockTask = null;
    
    if (mensagem.length > 15) {
      textoMock = `Beleza chefe. Entendi "${mensagem}". Vou priorizar isso e criar uma task no quadro pra mim.`;
      const taskId = require('uuid').v4();
      runAndSave(`
        INSERT INTO tasks (id, tipo, descricao, status, projeto_id, cor_do_projeto, agente_id)
        VALUES (?, 'exec', ?, 'backlog', 'Novo Projeto', '#2196F3', ?)
      `, [taskId, `Executar: ${mensagem}`, agente_id]);
      mockTask = { id: taskId, descricao: `Executar: ${mensagem}` };
    }
    
    res.json({ resposta: textoMock, task_criada: mockTask, mock: true });
  }
});

function parseAgent(row) {
  return {
    ...row,
    skills: JSON.parse(row.skills || '[]'),
    avatar_acessorios: JSON.parse(row.avatar_acessorios || '[]'),
    avatar: {
      cor: row.avatar_cor,
      altura: row.avatar_altura,
      acessorios: JSON.parse(row.avatar_acessorios || '[]'),
    },
    localizacao: {
      mesa: [row.mesa_x, row.mesa_y, row.mesa_z],
      rotacao: row.mesa_rotacao,
    },
    historico: {
      tarefas_concluidas: row.tarefas_concluidas,
      tarefas_delegadas: row.tarefas_delegadas,
      erros: row.erros,
      avaliacao: row.avaliacao,
      salario: row.salario,
      contratado_em: row.contratado_em,
    },
  };
}

module.exports = router;
