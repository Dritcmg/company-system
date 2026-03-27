# Tech Stack: TycoonClaws — 3D AI Agent Simulator

> Última atualização: 2026-03-26

## Frontend

- **3D Engine:** Three.js (vanilla JS, sem framework React)
- **Bundler:** Vite 6
- **Linguagem:** JavaScript (ES Modules)
- **Estilo:** CSS puro via `styles.css`
- **Porta:** 5173

## Backend

- **Runtime:** Node.js 20+ LTS
- **Framework:** Express.js
- **WebSocket:** ws
- **Porta:** 3000 (HTTP + WS em mesmo servidor)
- **Gateway interno:** OpenClaw Gateway na porta 18789

## LLM Router

Roteador multi-provider próprio em `services/llm-router.js`:

| Provider | Variável de ambiente | Modelo padrão |
|----------|---------------------|---------------|
| OpenAI / OpenRouter | `OPENAI_API_KEY` | gpt-4o-mini |
| Anthropic | `ANTHROPIC_API_KEY` | claude-sonnet-4-6 |
| Ollama (local) | `OLLAMA_URL` | qwen2.5-coder:7b |

Fallback automático para Ollama se a key do provider configurado não estiver presente.

## Banco de dados

- **Engine:** SQLite via `sql.js` (puro JS — zero compilação nativa)
- **Arquivo:** `data/open-tycoon.db`
- **Auto-save:** a cada 30 segundos

## Desktop (opcional)

- **Framework:** Electron
- **Modo dev:** frontend Vite + backend Node separados
- **Modo prod:** backend embutido no processo Electron

## Agentes

- **Wallace CEO:** NPC especial com personalidade `sarcastic_direct`, endpoint `/api/wallace/conversar`
- **Agentes genéricos:** endpoint `/api/agente/:id/chat` com criação automática de tasks
- **Sub-agentes:** spawnable em runtime via `[SPAWN: descrição]` no output do LLM

## Integrações opcionais

| Serviço | Variável | Uso |
|---------|---------|-----|
| Telegram | `TELEGRAM_BOT_TOKEN` | Notificações de tarefas |
| ClickUp | `CLICKUP_TOKEN` + `CLICKUP_LIST_ID` | Sync de tasks |
