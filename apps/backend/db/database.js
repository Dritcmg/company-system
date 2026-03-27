// ═══════════════════════════════════════════
//  OPEN TYCOON — Database (sql.js - pure JS SQLite)
// ═══════════════════════════════════════════

const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, '../../../data/open-tycoon.db');
const SAVE_PATH = path.join(__dirname, '../../../data/save-game.json');

let db = null;
let dbReady = null;

// Initialize database asynchronously
async function initDb() {
  if (db) return db;

  const SQL = await initSqlJs();

  // Ensure data directory exists
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Load existing DB or create new
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  initSchema();
  seedIfEmpty();
  saveDb();

  return db;
}

// Get or wait for DB
function getDb() {
  if (!db) throw new Error('Database not initialized yet. Call initDb() first.');
  return db;
}

// Save DB to disk
function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Auto-save periodically
setInterval(() => { try { saveDb(); } catch(e) {} }, 30000);

function initSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      apelido TEXT,
      cargo TEXT NOT NULL,
      nivel TEXT DEFAULT 'entry',
      personalidade TEXT DEFAULT 'meticuloso',
      skills TEXT DEFAULT '[]',
      status TEXT DEFAULT 'ativo',
      avatar_cor TEXT DEFAULT '#00aa66',
      avatar_altura REAL DEFAULT 1.7,
      avatar_acessorios TEXT DEFAULT '[]',
      mesa_x REAL DEFAULT 0,
      mesa_y REAL DEFAULT 0,
      mesa_z REAL DEFAULT 0,
      mesa_rotacao REAL DEFAULT 0,
      estado_atual TEXT DEFAULT 'idle',
      tarefa_atual_id TEXT,
      tarefas_concluidas INTEGER DEFAULT 0,
      tarefas_delegadas INTEGER DEFAULT 0,
      erros INTEGER DEFAULT 0,
      avaliacao REAL DEFAULT 5.0,
      salario REAL DEFAULT 0,
      contratado_em TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      tipo TEXT NOT NULL,
      descricao TEXT NOT NULL,
      parametros TEXT DEFAULT '{}',
      prioridade TEXT DEFAULT 'normal',
      status TEXT DEFAULT 'backlog',
      agente_id TEXT,
      resultado TEXT,
      erro TEXT,
      prazo TEXT,
      projeto_id TEXT DEFAULT 'geral',
      cor_do_projeto TEXT DEFAULT '#aaaaaa',
      criada_em TEXT DEFAULT (datetime('now')),
      iniciada_em TEXT,
      concluida_em TEXT
    );
  `);

  // Migrations: adiciona colunas sem destruir dados existentes
  try {
    const taskCols = db.exec("PRAGMA table_info(tasks)");
    if (taskCols.length > 0) {
      const columns = taskCols[0].values.map(r => r[1]);
      if (!columns.includes('projeto_id')) db.run("ALTER TABLE tasks ADD COLUMN projeto_id TEXT DEFAULT 'geral'");
      if (!columns.includes('cor_do_projeto')) db.run("ALTER TABLE tasks ADD COLUMN cor_do_projeto TEXT DEFAULT '#aaaaaa'");
    }
  } catch (e) {
    console.error('Migration error (tasks):', e.message);
  }

  // Migration: llm_provider e llm_model para seleção de modelo por agente
  try {
    const agentCols = db.exec("PRAGMA table_info(agents)");
    if (agentCols.length > 0) {
      const columns = agentCols[0].values.map(r => r[1]);
      if (!columns.includes('llm_provider')) db.run("ALTER TABLE agents ADD COLUMN llm_provider TEXT DEFAULT 'openai'");
      if (!columns.includes('llm_model')) db.run("ALTER TABLE agents ADD COLUMN llm_model TEXT DEFAULT 'gpt-4o-mini'");
    }
  } catch (e) {
    console.error('Migration error (agents llm):', e.message);
  }

  // Migration: skill_path para apontar pastas de lógica real
  try {
    const agentCols = db.exec("PRAGMA table_info(agents)");
    if (agentCols.length > 0) {
      const columns = agentCols[0].values.map(r => r[1]);
      if (!columns.includes('skill_path')) db.run("ALTER TABLE agents ADD COLUMN skill_path TEXT");
    }
  } catch (e) {
    console.error('Migration error (agents skill_path):', e.message);
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS dismissals (
      id TEXT PRIMARY KEY,
      agente_id TEXT NOT NULL,
      nome TEXT NOT NULL,
      cargo TEXT,
      motivo TEXT NOT NULL,
      detalhes TEXT,
      flags TEXT DEFAULT '[]',
      blacklist INTEGER DEFAULT 0,
      demitido_em TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS agent_memory (
      id TEXT PRIMARY KEY,
      agente_id TEXT NOT NULL,
      tipo TEXT NOT NULL, -- 'action', 'task_result', 'summary'
      conteudo TEXT NOT NULL,
      importancia INTEGER DEFAULT 1,
      criado_em TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS office_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

// Default agents that must always exist (besides Wallace who is seeded by WallaceCEO)
const DEFAULT_AGENTS = [
  {
    id: 'manager-001',
    nome: 'Ricardo Souza',
    apelido: 'Rick',
    cargo: 'manager',
    nivel: 'senior',
    personalidade: 'meticuloso',
    skills: ['read', 'write', 'analyze', 'delegate'],
    avatar_cor: '#2d5a3d',
    avatar_altura: 1.75,
    avatar_acessorios: ['oculos', 'gravata'],
    mesa_x: 2, mesa_y: 0, mesa_z: 2,
    mesa_rotacao: -Math.PI / 2,
  },
  {
    id: 'estagiario-001',
    nome: 'Ana Lima',
    apelido: 'Ana',
    cargo: 'estagiario',
    nivel: 'entry',
    personalidade: 'curioso',
    skills: ['read', 'write'],
    avatar_cor: '#aa6600',
    avatar_altura: 1.65,
    avatar_acessorios: ['cracha'],
    mesa_x: 2, mesa_y: 0, mesa_z: 6,
    mesa_rotacao: -Math.PI / 2,
  },
];

function seedIfEmpty() {
  let seeded = 0;
  for (const agent of DEFAULT_AGENTS) {
    const exists = db.exec(`SELECT id FROM agents WHERE id = '${agent.id}'`);
    if (exists.length > 0 && exists[0].values.length > 0) continue;

    db.run(`
      INSERT INTO agents (
        id, nome, apelido, cargo, nivel, personalidade, skills, status,
        avatar_cor, avatar_altura, avatar_acessorios,
        mesa_x, mesa_y, mesa_z, mesa_rotacao,
        estado_atual, tarefas_concluidas, tarefas_delegadas, erros,
        avaliacao, salario, contratado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 5.0, 0, datetime('now'))
    `, [
      agent.id,
      agent.nome,
      agent.apelido,
      agent.cargo,
      agent.nivel,
      agent.personalidade,
      JSON.stringify(agent.skills),
      'ativo',
      agent.avatar_cor,
      agent.avatar_altura,
      JSON.stringify(agent.avatar_acessorios),
      agent.mesa_x,
      agent.mesa_y,
      agent.mesa_z,
      agent.mesa_rotacao,
      'idle',
    ]);
    seeded++;
    console.log(`🌱 Seeded default agent: ${agent.apelido} (${agent.id})`);
  }

  // Also try to load from save-game.json if it exists (for extra agents)
  if (fs.existsSync(SAVE_PATH)) {
    try {
      const saveData = JSON.parse(fs.readFileSync(SAVE_PATH, 'utf-8'));
      for (const agent of (saveData.agentes || [])) {
        const exists = db.exec(`SELECT id FROM agents WHERE id = '${agent.id}'`);
        if (exists.length > 0 && exists[0].values.length > 0) continue;
        db.run(`
          INSERT INTO agents (
            id, nome, apelido, cargo, nivel, personalidade, skills, status,
            avatar_cor, avatar_altura, avatar_acessorios,
            mesa_x, mesa_y, mesa_z, mesa_rotacao,
            estado_atual, tarefas_concluidas, tarefas_delegadas, erros,
            avaliacao, salario, contratado_em
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `, [
          agent.id, agent.nome, agent.apelido || '', agent.cargo,
          agent.nivel || 'entry', agent.personalidade || 'meticuloso',
          JSON.stringify(agent.skills || []), agent.status || 'ativo',
          agent.avatar?.cor || '#00aa66', agent.avatar?.altura || 1.7,
          JSON.stringify(agent.avatar?.acessorios || []),
          agent.localizacao?.mesa?.[0] || 0,
          agent.localizacao?.mesa?.[1] || 0,
          agent.localizacao?.mesa?.[2] || 0,
          agent.localizacao?.rotacao || 0,
          agent.estado_atual || 'idle',
          agent.historico?.tarefas_concluidas || 0,
          agent.historico?.tarefas_delegadas || 0,
          agent.historico?.erros || 0,
          agent.historico?.avaliacao || 5.0,
          agent.historico?.salario || 0,
        ]);
        seeded++;
      }
    } catch (err) {
      console.error('⚠️ save-game.json load error:', err.message);
    }
  }

  if (seeded > 0) console.log(`✅ Seeded ${seeded} agents`);
}

// Helper: query that returns array of objects
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// Helper: query that returns single object
function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

// Helper: run statement and save
function runAndSave(sql, params = []) {
  db.run(sql, params);
  // Debounced save
  clearTimeout(runAndSave._timer);
  runAndSave._timer = setTimeout(saveDb, 1000);
}

module.exports = { initDb, getDb, saveDb, queryAll, queryOne, runAndSave };
