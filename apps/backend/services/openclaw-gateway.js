const fs = require('fs');
const path = require('path');
// ═══════════════════════════════════════════
//  OPEN TYCOON — OpenClaw Gateway
//  Gerencia sessões de agentes e processa RPC via WebSocket
// ═══════════════════════════════════════════

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { queryAll, queryOne } = require('../db/database');
const { runAgent } = require('./agent-runner');

const HTTP_PORT = 18789;

// Mapa de sessões ativas: sessionKey → SessionObject
const activeSessions = new Map();

// Mapa de execuções ativas para suporte a abort: runId → AbortController-like
const activeRuns = new Map();

// ── Sessões ──────────────────────────────────────────────────────────────────

function createSession(agentId, label, task, requesterSessionKey = null) {
  const sessionUuid = uuidv4();
  const sessionKey = requesterSessionKey
    ? `subagent:${sessionUuid}`
    : `agent:${agentId}:main`;

  const session = {
    sessionKey,
    agentId,
    label,
    task,
    requesterSessionKey,
    startedAt: Date.now(),
    status: 'idle',
  };

  activeSessions.set(sessionKey, session);
  return session;
}

function setSessionStatus(sessionKey, status) {
  const session = activeSessions.get(sessionKey);
  if (session) session.status = status;
}

function removeSession(sessionKey) {
  activeSessions.delete(sessionKey);
}

function listSessions() {
  return Array.from(activeSessions.values());
}

// ── Sub-agentes ───────────────────────────────────────────────────────────────

async function spawnSubAgent(parentSessionKey, task, broadcastFn) {
  const parentSession = activeSessions.get(parentSessionKey);
  if (!parentSession) return null;

  const subUuid = uuidv4();
  const subSessionKey = `subagent:${subUuid}`;
  const label = task.substring(0, 60);

  const subSession = {
    sessionKey: subSessionKey,
    agentId: parentSession.agentId,
    label,
    task,
    requesterSessionKey: parentSessionKey,
    startedAt: Date.now(),
    status: 'running',
  };

  activeSessions.set(subSessionKey, subSession);

  broadcastFn({
    type: 'event',
    event: 'agent',
    payload: {
      runId: subUuid,
      seq: 0,
      stream: 'lifecycle',
      ts: Date.now(),
      data: { phase: 'spawned', parentSessionKey, task },
      sessionKey: subSessionKey,
    },
  });

  console.log(`🌿 Sub-agent spawned: ${subSessionKey}`);

  // Executa o sub-agente de forma assíncrona
  const agentConfig = queryOne('SELECT * FROM agents WHERE id = ?', [parentSession.agentId]) || {
    id: parentSession.agentId,
  };

  const messages = [
    {
      role: 'system',
      content: `Você é um sub-agente auxiliar. Execute a tarefa abaixo de forma objetiva.`,
    },
    { role: 'user', content: task },
  ];

  runAgent(agentConfig, messages, subSessionKey, broadcastFn)
    .then(() => setSessionStatus(subSessionKey, 'done'))
    .catch((err) => {
      console.error(`❌ Sub-agent error [${subSessionKey}]:`, err.message);
      setSessionStatus(subSessionKey, 'done');
    });

  return subSession;
}

// ── Histórico de mensagens em memória ─────────────────────────────────────────

const chatHistories = new Map(); // sessionKey → Array<{role, content, ts}>

function appendHistory(sessionKey, role, content) {
  if (!chatHistories.has(sessionKey)) chatHistories.set(sessionKey, []);
  chatHistories.get(sessionKey).push({ role, content, ts: Date.now() });
}

function getHistory(sessionKey) {
  return chatHistories.get(sessionKey) || [];
}

// ── Processador RPC ───────────────────────────────────────────────────────────

async function handleRpcRequest(msg, broadcastFn) {
  const { id, method, params = {} } = msg;

  function respond(ok, payload, error = null) {
    return { type: 'res', id, ok, payload: ok ? payload : undefined, error: ok ? undefined : error };
  }

  try {
    switch (method) {
      case 'sessions.list': {
        return respond(true, { sessions: listSessions() });
      }

      case 'agents.list': {
        const agents = queryAll('SELECT * FROM agents WHERE status = ?', ['ativo']);
        return respond(true, { agents });
      }

      case 'chat.send': {
        const { agentId, message, sessionKey: existingKey } = params;
        if (!agentId || !message) {
          return respond(false, null, 'agentId e message são obrigatórios');
        }

        const agentConfig = queryOne('SELECT * FROM agents WHERE id = ?', [agentId]);
        if (!agentConfig) {
          return respond(false, null, `Agente ${agentId} não encontrado`);
        }

        // Obtém ou cria sessão
        let sessionKey = existingKey || `agent:${agentId}:main`;
        if (!activeSessions.has(sessionKey)) {
          createSession(agentId, `Chat com ${agentId}`, message);
        }

        setSessionStatus(sessionKey, 'running');
        appendHistory(sessionKey, 'user', message);

        // Monta contexto de mensagens
        const historyMessages = getHistory(sessionKey).slice(-20).map((h) => ({
          role: h.role,
          content: h.content,
        }));

        const messages = [
          {
            role: 'system',
            content: buildSystemPrompt(agentConfig),
          },
          ...historyMessages,
        ];

        // Inicia execução e responde imediatamente com o runId
        const runId = uuidv4();

        runAgentWithTracking(runId, agentConfig, messages, sessionKey, broadcastFn)
          .then((result) => {
            appendHistory(sessionKey, 'assistant', result.content);
            setSessionStatus(sessionKey, 'idle');

            // Processa sub-agentes detectados
            for (const task of result.subAgentsSpawned) {
              spawnSubAgent(sessionKey, task, broadcastFn);
            }
          })
          .catch((err) => {
            console.error(`❌ chat.send error:`, err.message);
            setSessionStatus(sessionKey, 'idle');
          });

        return respond(true, { runId, sessionKey });
      }

      case 'chat.abort': {
        const { runId } = params;
        if (!runId) return respond(false, null, 'runId é obrigatório');

        const aborted = activeRuns.has(runId);
        activeRuns.delete(runId);
        return respond(true, { aborted });
      }

      case 'chat.history': {
        const { sessionKey } = params;
        if (!sessionKey) return respond(false, null, 'sessionKey é obrigatório');
        return respond(true, { history: getHistory(sessionKey) });
      }

      default:
        return respond(false, null, `Método desconhecido: ${method}`);
    }
  } catch (err) {
    console.error(`❌ RPC error [${id}]:`, err.message);
    return respond(false, null, err.message);
  }
}

// Wrapper que registra o runId para suporte a abort
async function runAgentWithTracking(runId, agentConfig, messages, sessionKey, broadcastFn) {
  activeRuns.set(runId, { aborted: false });

  try {
    const result = await runAgent(agentConfig, messages, sessionKey, broadcastFn);
    return result;
  } finally {
    activeRuns.delete(runId);
  }
}

// Monta system prompt do agente a partir da config do DB
function buildSystemPrompt(agentConfig) {
  const nome = agentConfig.nome || 'Agente';
  const cargo = agentConfig.cargo || 'estagiario';
  const personalidade = agentConfig.personalidade || 'meticuloso';

  let skillContent = '';
  if (agentConfig.skill_path) {
    try {
      const skillFile = path.join(agentConfig.skill_path, 'SKILL.md');
      if (fs.existsSync(skillFile)) {
        skillContent = '\n\nSUAS DIRETRIZES DE SKILL:\n' + fs.readFileSync(skillFile, 'utf-8');
      }
    } catch (e) {
      console.log('Erro ao ler SKILL.md:', e.message);
    }
  }

  return `Você é ${nome} (${cargo}) da empresa TycoonClaws.
Personalidade: ${personalidade}.
Responda em português, de forma profissional e direta.
Se precisar delegar uma sub-tarefa, use o padrão: [SPAWN: descrição da tarefa]` + skillContent;
}

// ── OpenClaw Gateway HTTP (porta 18789 — compatibilidade) ─────────────────────

class OpenClawGateway {
  constructor(broadcastFn) {
    this.broadcast = broadcastFn;
    this.app = express();
    this.server = null;

    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this._setupRoutes();
  }

  _setupRoutes() {
    this.app.get('/health', (_req, res) => {
      res.json({
        status: 'ok',
        service: 'openclaw-gateway',
        sessions: activeSessions.size,
        version: '3.0.0',
        timestamp: new Date().toISOString(),
      });
    });

    // Endpoint legado — mantido para compatibilidade com server.js
    this.app.post('/api/spawn', (req, res) => {
      res.status(503).json({
        success: false,
        error: 'Use WebSocket RPC: chat.send',
        fallback: 'Use Ollama brain instead',
      });
    });

    this.app.get('/api/sessions', (_req, res) => {
      res.json({ sessions: listSessions() });
    });
  }

  async start() {
    return new Promise((resolve) => {
      try {
        this.server = this.app.listen(HTTP_PORT, () => {
          console.log(`🌉 OpenClaw Gateway HTTP on http://localhost:${HTTP_PORT}`);
          resolve();
        });

        this.server.on('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            console.log(`⚠️ OpenClaw Gateway port ${HTTP_PORT} already in use, skipping`);
          } else {
            console.warn('⚠️ OpenClaw Gateway HTTP error:', err.message);
          }
          resolve();
        });
      } catch (e) {
        console.warn('⚠️ OpenClaw Gateway start error:', e.message);
        resolve();
      }
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
      console.log('🌉 OpenClaw Gateway stopped');
    }
  }
}

// ── Heartbeat ─────────────────────────────────────────────────────────────────

function startHeartbeat(broadcastFn) {
  setInterval(() => {
    broadcastFn({ type: 'event', event: 'heartbeat', payload: { ts: Date.now() } });
  }, 30000);
}

module.exports = {
  OpenClawGateway,
  handleRpcRequest,
  startHeartbeat,
  createSession,
  listSessions,
  spawnSubAgent,
};
