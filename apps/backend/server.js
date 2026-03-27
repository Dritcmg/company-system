// ═══════════════════════════════════════════
//  OPEN TYCOON — Express Backend Server
// ═══════════════════════════════════════════

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');

const { initDb, queryOne, runAndSave } = require('./db/database');
const { think, isOllamaAvailable, getBestModel } = require('./services/ollama-brain');
const { addMemory, addTaskResultToMemory, getMemoryContext } = require('./services/memory');
const { startCron } = require('./services/cron');
const { OpenClawGateway, handleRpcRequest, startHeartbeat } = require('./services/openclaw-gateway');
const { TelegramService } = require('./services/telegram');
const { ClickUpService } = require('./services/clickup');
const { WallaceCEO } = require('./services/wallace-ceo');
const fs = require('fs');
const path = require('path');

// Global service instances
let openclawGateway = null;
let telegramService = null;
let clickupService = null;
let wallaceCEO = null;

const PORT = 3000;
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check (works before DB init)
app.get('/api/health', async (req, res) => {
  const ollamaOk = await isOllamaAvailable();
  const model = ollamaOk ? await getBestModel() : null;
  res.json({
    status: 'ok', version: '2.0.0',
    timestamp: new Date().toISOString(),
    brain: { ollama: ollamaOk, model: model || 'mock' },
  });
});

// Create HTTP server + WebSocket
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('🔌 WebSocket client connected');

  ws.on('message', async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      ws.send(JSON.stringify({ type: 'error', error: 'Invalid JSON' }));
      return;
    }

    if (msg.type === 'req') {
      const response = await handleRpcRequest(msg, broadcast);
      ws.send(JSON.stringify(response));
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log('🔌 WebSocket client disconnected');
  });
});

function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(msg);
    }
  }
}

// Start server after DB init
async function startServer() {
  try {
    await initDb();
    console.log('✅ Database initialized');

    // Initialize external services (each wrapped — one failure won't crash server)
    console.log('🔌 Initializing external services...');
    
    // Start OpenClaw Gateway (port 18789)
    try {
      openclawGateway = new OpenClawGateway(broadcast);
      await openclawGateway.start();
      startHeartbeat(broadcast);
    } catch (e) {
      console.log('⚠️ OpenClaw Gateway skipped:', e.message);
    }
    
    // Initialize Telegram Bot
    try {
      telegramService = new TelegramService();
      telegramService.init();
    } catch (e) {
      console.log('⚠️ Telegram skipped:', e.message);
    }
    
    // Initialize ClickUp Sync
    try {
      clickupService = new ClickUpService({ queryOne, runAndSave });
      await clickupService.init();
    } catch (e) {
      console.log('⚠️ ClickUp skipped:', e.message);
    }
    
    // Initialize Wallace CEO Agent
    try {
      wallaceCEO = new WallaceCEO({ queryOne, runAndSave }, broadcast);
      console.log('🦊 Wallace CEO initialized');
    } catch (e) {
      console.log('⚠️ Wallace CEO skipped:', e.message);
    }

    // Start background clocks
    try {
      startCron(broadcast);
    } catch (e) {
      console.log('⚠️ Cron skipped:', e.message);
    }

    // Mount API routes (after DB is ready)
    const agentRoutes = require('./api/agents');
    const taskRoutes = require('./api/tasks');
    const officeRoutes = require('./api/office');
    const filesRoutes = require('./api/files');

    app.use('/api/agente', agentRoutes);
    app.use('/api/tarefa', taskRoutes);
    app.use('/api/escritorio', officeRoutes);
    app.use('/api/files', filesRoutes);

    // Wallace CEO conversation endpoint
    app.post('/api/wallace/conversar', async (req, res) => {
      const { mensagem, contexto } = req.body;
      if (!mensagem) {
        return res.status(400).json({ erro: 'Mensagem é obrigatória' });
      }
      
      try {
        const response = await wallaceCEO.processConversation(mensagem, contexto);
        res.json(response);
      } catch (err) {
        console.error('Wallace conversation error:', err);
        res.status(500).json({ erro: err.message });
      }
    });

    // Get Wallace's data for 3D rendering
    app.get('/api/wallace/dados', (req, res) => {
      if (!wallaceCEO) {
        return res.status(503).json({ erro: 'Wallace não inicializado' });
      }
      res.json(wallaceCEO.getAgentData());
    });

    // ClickUp webhook endpoint
    app.post('/webhooks/clickup', (req, res) => {
      if (clickupService) {
        clickupService.handleWebhook(req.body);
      }
      res.json({ received: true });
    });

    // Telegram webhook (if using webhook mode instead of polling)
    app.post('/webhooks/telegram', (req, res) => {
      // Telegram bot handles this via polling by default
      res.json({ received: true });
    });

    // Manual ClickUp sync trigger
    app.post('/api/clickup/sync', async (req, res) => {
      if (!clickupService?.enabled) {
        return res.status(503).json({ erro: 'ClickUp não configurado' });
      }
      
      try {
        const tasks = await clickupService.syncFromClickUp();
        res.json({ sincronizado: true, tarefas: tasks.length });
      } catch (err) {
        res.status(500).json({ erro: err.message });
      }
    });

    // Meeting chat endpoint — CEO sends, agent responds
    app.post('/api/reuniao/mensagem', async (req, res) => {
      const { agente_id, mensagem_ceo, contexto_reuniao } = req.body;
      
      if (!mensagem_ceo) {
        return res.status(400).json({ erro: 'Mensagem é obrigatória' });
      }
      
      try {
        // Get agent info
        const agentRow = queryOne('SELECT * FROM agents WHERE id = ?', [agente_id]);
        const nome = agentRow?.apelido || agentRow?.nome || agente_id;
        const cargo = agentRow?.cargo || 'estagiario';
        const personalidade = agentRow?.personalidade || 'meticuloso';
        
        // Build meeting prompt
        const meetingPrompt = {
          descricao: `REUNIÃO DE EQUIPE — Você é ${nome} (${cargo}, personalidade: ${personalidade}).
O CEO disse na reunião: "${mensagem_ceo}"

${contexto_reuniao ? `Contexto da conversa:\n${contexto_reuniao}\n\n` : ''}
Responda DE FORMA CURTA (1-3 frases) como ${nome} responderia na reunião, considerando seu cargo e personalidade.
Seja direto, profissional, e fale em português.`,
          tipo: 'reuniao',
          _agentId: agente_id,
        };
        
        const result = await think(cargo, meetingPrompt, broadcast, null, null);
        
        res.json({ 
          resposta: result.result,
          agente_id,
          mock: result.mock,
        });
      } catch (err) {
        console.error('Meeting message error:', err);
        // Fallback responses
        const fallbacks = {
          manager: 'Entendido, chefe. Vou analisar e montar um plano de ação.',
          estagiario: 'Beleza! Tô pronto pra executar, só me passa os detalhes.',
        };
        const agentRow = queryOne('SELECT cargo FROM agents WHERE id = ?', [agente_id]);
        res.json({
          resposta: fallbacks[agentRow?.cargo] || 'Anotado. Vamos trabalhar nisso!',
          agente_id,
          mock: true,
        });
      }
    });

    // Combined create + delegate endpoint (atomic)
    app.post('/api/delegar', async (req, res) => {
      const { agente_id, descricao, tipo, prioridade, tarefa_id: existingId } = req.body;

      try {
        const { v4: uuidv4 } = require('uuid');
        let taskId = existingId;

        // Create task if not already existing
        if (!taskId) {
          taskId = uuidv4();
          runAndSave(`
            INSERT INTO tasks (id, tipo, descricao, prioridade, status, agente_id, iniciada_em)
            VALUES (?, ?, ?, ?, 'em_execucao', ?, datetime('now'))
          `, [taskId, tipo || 'exec', descricao || 'Tarefa', prioridade || 'normal', agente_id]);
        } else {
          // Update existing task
          runAndSave("UPDATE tasks SET status = 'em_execucao', agente_id = ?, iniciada_em = datetime('now') WHERE id = ?",
            [agente_id, taskId]);
        }

        // Update agent state to working
        runAndSave('UPDATE agents SET estado_atual = ?, tarefa_atual_id = ? WHERE id = ?',
          ['working', taskId, agente_id]);

        // Broadcast to WebSocket clients
        broadcast({ type: 'AGENTE_PENSANDO', payload: { agente_id, tarefa_id: taskId, pensamento: `🧠 Analisando: ${descricao}` } });

        // Read file content if @ mentioned in description
        let fileContent = null;
        const atMatch = descricao.match(/@([\w./\-]+)/g);
        if (atMatch) {
          const workspace = path.join(__dirname, '../../');
          for (const mention of atMatch) {
            const filePath = mention.replace('@', '');
            const fullPath = path.resolve(workspace, filePath);
            try {
              if (fullPath.startsWith(workspace)) {
                fileContent = fs.readFileSync(fullPath, 'utf-8');
                broadcast({ type: 'AGENTE_PENSANDO', payload: { agente_id, pensamento: `📖 Lendo: ${filePath}` } });
              }
            } catch (e) { /* file not found, ok */ }
          }
        }

        // Get agent role for brain and fetch contextual memory
        const agentRow = queryOne('SELECT cargo FROM agents WHERE id = ?', [agente_id]);
        const role = agentRow?.cargo || 'estagiario';
        const agentMemory = getMemoryContext(agente_id);

        let result;
        const OPENCLAW_URL = 'http://localhost:18789/api/spawn';

        // 🚀 Meta-Gypsi OpenClaw Execution Routing
        if (role !== 'manager') {
          try {
            // Send to actual executing OpenClaw Gateway!
            broadcast({ type: 'AGENTE_PENSANDO', payload: { agente_id, pensamento: `💻 Acessando OpenClaw Exec Engine...` } });
            
            const ocResponse = await fetch(OPENCLAW_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                task: descricao,
                context: agentMemory,
                agentId: agente_id
              })
            });

            if (ocResponse.ok) {
              const ocData = await ocResponse.json();
              result = {
                result: `[OpenClaw Gateway] Retorno: ${ocData.message || 'Tarefa executada no sistema real'}`,
                mock: false,
                duration: 2000,
                model: 'openclaw-gateway',
                tokens: 0
              };
            } else {
              throw new Error('OpenClaw HTTP nao ok');
            }
          } catch(e) {
             console.log('⚠️ OpenClaw Gateway off-line. Fallback para cérebro local simulado.', e.message);
             result = await think(role, { descricao, tipo, _agentId: agente_id }, broadcast, fileContent, agentMemory);
          }
        } else {
          // Manager (Rick) thinks fast locally
          result = await think(role, { descricao, tipo, _agentId: agente_id }, broadcast, fileContent, agentMemory);
        }

        // Simulate delay for mock, Ollama is already done
        const workDuration = result.mock ? (Math.random() * 2000 + 2000) : 0;

        setTimeout(() => {
          // Complete the task
          runAndSave(`
            UPDATE tasks SET status = 'concluida', resultado = ?, concluida_em = datetime('now')
            WHERE id = ?
          `, [result.result, taskId]);

          // Save memory
          addTaskResultToMemory(agente_id, descricao, result.result);

          // Reset agent
          runAndSave('UPDATE agents SET estado_atual = ?, tarefa_atual_id = NULL, tarefas_concluidas = tarefas_concluidas + 1 WHERE id = ?',
            ['idle', agente_id]);

          // Broadcast completion
          broadcast({
            type: 'TAREFA_CONCLUIDA',
            payload: {
              tarefa_id: taskId,
              agente_id,
              resultado: result.result,
              tempo: result.duration,
              mock: result.mock,
              model: result.model,
              tokens: result.tokens,
            },
          });
        }, workDuration);

        res.json({ sucesso: true, tarefa_id: taskId, mock: result.mock, model: result.model });
      } catch (err) {
        console.error('Delegation error:', err);
        res.status(500).json({ erro: err.message });
      }
    });

    // Check brain status
    const ollamaOk = await isOllamaAvailable();
    const model = ollamaOk ? await getBestModel() : null;
    console.log(ollamaOk
      ? `🧠 Brain: Ollama ✅ (model: ${model})`
      : '🧠 Brain: Mock mode (start ollama for real AI)');

    // Start listening
    server.listen(PORT, () => {
      console.log(`\n🏢 Open Tycoon Backend v2.0 running on http://localhost:${PORT}`);
      console.log(`📡 WebSocket available at ws://localhost:${PORT}/ws`);
      console.log(`🦊 Wallace CEO: http://localhost:${PORT}/api/wallace/dados`);
      console.log(`📋 ClickUp Webhook: http://localhost:${PORT}/webhooks/clickup`);
      console.log('');
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  if (openclawGateway) openclawGateway.stop();
  if (telegramService) telegramService.stop();
  process.exit(0);
});

startServer();

module.exports = { app, server, broadcast };
