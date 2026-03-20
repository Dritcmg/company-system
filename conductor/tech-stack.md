# Tech Stack: Tycoonclaws — 3D AI Agent Simulator

## Frontend
- **Framework:** React 19 (TypeScript).
- **3D Engine:** Three.js via @react-three/fiber and @react-three/drei.
- **Styling:** Tailwind CSS.
- **Bundler:** Vite.
- **State Management:** React state & axios polling (for World State).

## Backend
- **Runtime:** Node.js 20+ LTS.
- **Framework:** Express.js.
- **API:** OpenRouter (Unified API for LLMs).

## Desktop Wrapper
- **Framework:** Electron 40+.

## Database / Persistence
- **Storage:** JSON files (config, agent profiles, world state).

## Tooling & Infrastructure
- **Concurrent Processes:** Concurrently (Vite + Express + Electron).
- **Build Tool:** Electron-builder.

## Architecture
- **World State Controller**: Central server logic managing multiple agents and history.
- **Legacy Porting Layer**: Wrapper for original Three.js classes in a React context.
- **Observability Panels**: Overlay UI for monitoring agent thoughts and speech.
