# TycoonClaws — 3D AI Agent Office Simulator

> Gerencie agentes de IA em um escritório 3D em tempo real. Explore, delegue tarefas e observe seus agentes trabalhando, caminhando e conversando.

![TycoonClaws](assets/screenshot-placeholder.png)

---

## O que é

**TycoonClaws** é um simulador de escritório 3D funcional onde agentes de IA autônomos trabalham, interagem e colaboram. Você é o CEO — ande pelo escritório em primeira pessoa, fale diretamente com cada agente, convoque reuniões e veja o kanban sendo preenchido em tempo real.

Inspirado em jogos como *Theme Hospital* e *Dwarf Fortress*, mas com agentes de IA reais no lugar de NPCs.

---

## Features

- **Escritório 3D em FPV** — WASD + mouse look, colisões com paredes, 3 salas (CEO, Workspace, Reunião)
- **Agentes PS1-style** — personagens blocky com animações (idle, digitando, caminhando)
- **Chat 1-on-1** — fale diretamente com qualquer agente; ele cria tasks no kanban automaticamente
- **Sala de Reunião** — convoque todos os agentes com `[R]` ou o botão vermelho; chat multi-agente em paralelo
- **Kanban em 3D** — post-its aparecem na parede quando tarefas são concluídas
- **LLM Router** — suporta OpenAI, Anthropic e Ollama (local); fallback automático
- **Wallace CEO** — o próprio Wallace como NPC no escritório, com personalidade `sarcastic_direct`
- **Sub-agentes** — agentes podem spawnar sub-agentes em runtime via `[SPAWN: tarefa]`
- **Contratar agentes** — clique numa mesa vaga para contratar novos agentes com cor e personalidade próprias
- **Relógio digital** no HUD
- **Modo Mock** — funciona sem API key (respostas simuladas)

---

## Instalação

### Pré-requisitos

- Node.js 20+
- (Opcional) [Ollama](https://ollama.ai) para IA local

### 1. Clone

```bash
git clone https://github.com/Padrim222/tycoonclaws.git
cd tycoonclaws
```

### 2. Instale as dependências

```bash
# Backend
cd apps/backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Configure o ambiente

```bash
cp .env.example apps/backend/.env
# Edite apps/backend/.env com sua API key
```

### 4. Inicie

**Terminal 1 — Backend:**
```bash
cd apps/backend
node server.js
```

**Terminal 2 — Frontend:**
```bash
cd apps/frontend
npm run dev
```

Acesse: **http://localhost:5173**

---

## Configuração de IA

Edite `apps/backend/.env`:

```env
# OpenAI (ou OpenRouter)
DEFAULT_LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...

# Ou Anthropic
DEFAULT_LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Ou Ollama (local, sem custo)
DEFAULT_LLM_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
```

Sem nenhuma key configurada, o jogo roda em **Modo Mock** com respostas simuladas.

---

## Controles

| Tecla | Ação |
|-------|------|
| `W A S D` | Mover |
| `Shift` | Correr |
| `Mouse` | Olhar (click para travar cursor) |
| `E` | Interagir com objeto/agente em frente |
| `R` | Convocar / encerrar reunião |
| `Esc` | Fechar painel / menu |

---

## Estrutura do Projeto

```
tycoonclaws/
├── apps/
│   ├── backend/          # Express + WebSocket + LLM Router
│   │   ├── api/          # Rotas REST (agentes, tarefas, escritório)
│   │   ├── services/     # LLM router, Wallace CEO, OpenClaw Gateway
│   │   ├── db/           # SQLite via sql.js
│   │   └── server.js     # Entry point (porta 3000)
│   ├── frontend/         # Three.js + Vite (porta 5173)
│   │   └── src/renderer/
│   │       ├── agents/   # Player, Agent3D
│   │       ├── scene/    # Office, Desk, Warehouse, KanbanBoard
│   │       └── ui/       # HUD, Chat, Kanban, Hire, Meeting
│   └── electron/         # Wrapper desktop (opcional)
├── conductor/            # Documentação de produto
├── data/                 # SQLite + saves
└── .env.example
```

---

## Stack Real

| Camada | Tecnologia |
|--------|-----------|
| Frontend 3D | Three.js + Vite (JS puro) |
| Backend | Node.js + Express + WebSocket |
| Banco de dados | SQLite via sql.js (zero dependência nativa) |
| IA | LLM Router próprio: OpenAI / Anthropic / Ollama |
| Desktop | Electron (opcional) |

---

## Contribuindo

Veja [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Licença

MIT — veja [LICENSE](LICENSE).
