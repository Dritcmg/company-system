# Tycoonclaws — 3D AI Agent Simulator

## 🚀 O Projeto
**Tycoonclaws** é um simulador de escritório 3D funcional onde agentes de IA trabalham, interagem e colaboram em tempo real. Inspirado em clássicos como "Dale & Dawson Stationery Supplies", o foco é observar e gerenciar múltiplos agentes autônomos em um ambiente espacial compartilhado.

## 🛠 Stack Tecnológica
- **Frontend:** React 19 (TypeScript) + Vite
- **3D Engine:** Three.js (@react-three/fiber & @react-three/drei)
- **Styling:** Tailwind CSS
- **Backend:** Node.js 20+ (Express.js)
- **AI Brain:** OpenRouter (Integração unificada de LLMs)
- **Desktop:** Electron 40+
- **Database:** JSON Local (Perfis de agentes, estado do mundo e config)

## 📂 Estrutura de Contexto (Conductor)
Este projeto utiliza o sistema **Conductor** para gerenciar o desenvolvimento:
- `conductor/product.md`: Visão geral e objetivos.
- `conductor/tech-stack.md`: Detalhes da infraestrutura.
- `conductor/product-guidelines.md`: Regras de estilo e negócio.
- `conductor/workflow.md`: Guia de desenvolvimento e Git.
- `conductor/tracks.md`: Acompanhamento de progresso e tarefas.

## ⚙️ Como Começar
1. **Instale as dependências:**
   ```bash
   npm install
   ```
2. **Configure o ambiente:**
   Crie um arquivo `.env` com sua `OPENROUTER_API_KEY`.
3. **Inicie o desenvolvimento:**
   ```bash
   npm run dev
   ```
   *(Isso iniciará o Vite, o servidor Express e o Electron simultaneamente via Concurrently)*

## 🧠 Desenvolvimento com Gemini CLI
Se estiver usando o Gemini CLI, você pode usar os comandos do Conductor para facilitar:
- `/conductor:newTrack`: Criar uma nova tarefa.
- `/conductor:implement`: Implementar uma funcionalidade de uma track.

---
*Este projeto foi "embalado" para facilitar a continuidade do desenvolvimento. Dálhe!*
