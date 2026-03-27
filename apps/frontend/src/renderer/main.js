// ═══════════════════════════════════════════
//  OPEN TYCOON — Main Renderer (Clean v3)
//  Room system, fixed orientations, all interactions
//  No PS1 filter, no looping music, clean render
// ═══════════════════════════════════════════

import * as THREE from 'three';

import { Office } from './scene/Office.js';
import { Desk } from './scene/Desk.js';
import { Warehouse } from './scene/Warehouse.js';
import { KanbanBoard } from './scene/KanbanBoard.js';
import { Agent3D } from './agents/Agent3D.js';
import { Player } from './agents/Player.js';
import { TaskPanel, showToast } from './ui/TaskPanel.js';
import { KanbanPanel } from './ui/KanbanPanel.js';
import { HUD } from './ui/HUD.js';
import { FileStoragePanel } from './ui/FileStoragePanel.js';
import { HirePanel } from './ui/HirePanel.js';
import { MeetingPanel } from './ui/MeetingPanel.js';
import { AgentChatPanel } from './ui/AgentChatPanel.js';
import { EscMenu } from './ui/EscMenu.js';
// PS1 filter removed — clean render now
import { API_BASE, WS_URL, COLORS, PLAYER, OFFICE } from '../shared/constants.js';
import { GatewayRpcClient } from './gateway-rpc-client.js';
import { SubAgentPoller } from './sub-agent-poller.js';
import { parseAgentEvent } from './event-parser.js';

// ── Global State ──────────────────────
let scene, camera, renderer, clock;
let player, agents3D = {}, desks = {}, agentsData = [];
let taskPanel, kanbanPanel, hud, fileStoragePanel, hirePanel, meetingPanel, agentChatPanel, escMenu;
let kanbanBoard, warehouse;
let raycaster, mouse;
let ws;
let rpcClient;
let subAgentPoller;
let interactables = [];
let thoughtBubbles = {};
let _interactableMeshCache = null; // cached mesh list, invalidated on scene change
// ps1PostProcess removed
let isMeetingActive = false;

// ── Initialize ────────────────────────
async function init() {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.BACKGROUND);
  scene.fog = new THREE.FogExp2(COLORS.FOG, 0.006); // very light fog

  // Camera
  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 80);
  camera.position.set(-7, 4, 8);

  // Renderer — clean modern render
  const canvas = document.getElementById('game-canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  clock = new THREE.Clock();
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  // Build scene
  buildScene();

  // Load agents
  await loadAgents();

  // Player (CEO) — spawn in CEO room
  player = new Player();
  player.position.set(-7, 0, 5.5);
  scene.add(player);

  // UI
  taskPanel = new TaskPanel();
  kanbanPanel = new KanbanPanel();
  hud = new HUD();
  fileStoragePanel = new FileStoragePanel();
  hirePanel = new HirePanel();
  meetingPanel = new MeetingPanel();
  agentChatPanel = new AgentChatPanel();
  escMenu = new EscMenu();
  agentChatPanel.setAgentsRef(agents3D);
  agentChatPanel.setSceneRef(scene);
  hud.setStatus('WASD = ANDAR | E = INTERAGIR | R = REUNIAO');

  // Events
  window.addEventListener('resize', onResize);

  // Audio disabled — no looping music
  window.audioManager = null;

  // Click
  canvas.addEventListener('click', () => {

    if (document.pointerLockElement !== document.body) {
      document.body.requestPointerLock();
    } else {
      tryInteract();
    }
  });

  // Crosshair
  if (!document.getElementById('fpv-crosshair')) {
    const crosshair = document.createElement('div');
    crosshair.style.cssText = 'position:fixed;top:50%;left:50%;width:4px;height:4px;background:rgba(255,255,255,0.8);transform:translate(-50%,-50%);pointer-events:none;z-index:100;';
    crosshair.id = 'fpv-crosshair';
    document.body.appendChild(crosshair);
  }

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyE') tryInteract();
    if (e.code === 'KeyR') {
      const active = document.activeElement;
      const isTyping = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
      if (!isTyping) triggerMeeting();
    }
        if (e.code === 'Escape') {
      if (taskPanel?.isVisible || agentChatPanel?.isOpen || kanbanPanel?.isOpen || fileStoragePanel?.isOpen || hirePanel?.isOpen || meetingPanel?.isOpen) {
        taskPanel?.hide();
        agentChatPanel?.close();
        kanbanPanel?.close();
        fileStoragePanel?.close();
        hirePanel?.close();
        meetingPanel?.close();
      } else {
        escMenu?.toggle();
      }
      if (document.pointerLockElement === document.body) {
        document.exitPointerLock();
      }
      return;
    }
  });

  // WebSocket
  connectWebSocket();

  // Task delegation events
  window.addEventListener('task-delegated', (e) => {
    const { agentId } = e.detail;
    if (agents3D[agentId]) {
      agents3D[agentId].setStatus('working');
      if (desks[agentId]) desks[agentId].setWorking(true);
    }
  });

  window.addEventListener('open-task-panel-generic', () => {
    if (agentsData.length > 0) {
      document.exitPointerLock();
      taskPanel?.show(agentsData[0]);
    }
  });

  // Agent hired event
  window.addEventListener('agent-hired', async () => {
    showToast('🎉 Novo agente contratado!', 'success');
    // Reload agents
    for (const [id, agent] of Object.entries(agents3D)) {
      scene.remove(agent);
      if (agent.dispose) agent.dispose();
    }
    for (const [id, desk] of Object.entries(desks)) {
      if (id !== 'ceo') scene.remove(desk);
    }
    agents3D = {};
    const deskKeys = Object.keys(desks);
    for (const k of deskKeys) {
      if (k !== 'ceo') delete desks[k];
    }
    invalidateInteractableCache();
    await loadAgents();
  });

  // Brain check
  try {
    const healthRes = await fetch(`${API_BASE}/api/health`);
    const health = await healthRes.json();
    if (health.brain?.ollama) {
      showToast(`IA: ${health.brain.model}`, 'success');
    } else {
      showToast('IA: MODO MOCK — configure .env com API key para IA real', 'info');
      hud?.setStatus('WASD = ANDAR | E = INTERAGIR | R = REUNIAO | MODO MOCK ATIVO');
    }
  } catch (e) {
    showToast('Backend offline — inicie: cd apps/backend && node server.js', 'error');
  }

  // Single shadow update after everything is placed
  renderer.shadowMap.needsUpdate = true;

  animate();
  console.log('🎮 TycoonClaws HQ — AI Office System initialized');
}

// ── Build Scene ───────────────────────
function buildScene() {
  const office = new Office();
  scene.add(office);
  scene.office = office;
  office.setScene(scene);

  // Warehouse (file storage) — corner of workspace, away from doorways
  warehouse = new Warehouse();
  warehouse.position.set(10, 0, 7); // far corner, doesn't block doors
  warehouse.isInteractable = true;
  warehouse.interactType = 'storage';
  scene.add(warehouse);
  interactables.push(warehouse);

  // Kanban Board — in meeting room back wall
  kanbanBoard = new KanbanBoard();
  kanbanBoard.position.set(0, 0, -4.5); // meeting room area
  scene.add(kanbanBoard);
  interactables.push(kanbanBoard);

  // CEO Desk — FACING FORWARD toward agents (rotation.y = 0)
  const ceoDesk = new Desk({ color: COLORS.CEO_COLOR, label: 'CEO', isCEO: true });
  ceoDesk.position.set(-8, 0, 4);
  ceoDesk.rotation.y = 0; // faces +z → faces doorway to workspace
  scene.add(ceoDesk);
  desks['ceo'] = ceoDesk;
  ceoDesk.isInteractable = true;
  ceoDesk.interactType = 'ceo-computer';
  interactables.push(ceoDesk);

  // Empty desks ("VAGA") — aligned in workspace grid
  const emptyPositions = [
    { pos: [5, 0, 2], label: 'VAGA', rot: -Math.PI / 2 },
    { pos: [5, 0, 6], label: 'VAGA', rot: -Math.PI / 2 },
  ];
  for (const ep of emptyPositions) {
    const emptyDesk = new Desk({ color: 0x888888, label: ep.label });
    emptyDesk.position.set(...ep.pos);
    emptyDesk.rotation.y = ep.rot;
    emptyDesk.isInteractable = true;
    emptyDesk.interactType = 'hire';
    scene.add(emptyDesk);
    interactables.push(emptyDesk);
  }

  // Meeting button is built inside Office.js
}

// ── Load Agents ───────────────────────
async function loadAgents() {
  try {
    const res = await fetch(`${API_BASE}/api/agente/listar`);
    const data = await res.json();
    agentsData = data.agentes || [];
    for (const agentData of agentsData) {
      createAgent3D(agentData);
    }
  } catch (err) {
    console.error('Failed to load agents:', err);
    showToast('BACKEND OFF — DADOS LOCAIS', 'error');
    const fallback = [
      {
        id: 'manager-001', nome: 'Ricardo Souza', apelido: 'Rick', cargo: 'manager',
        personalidade: 'meticuloso',
        avatar: { cor: '#2d5a3d', acessorios: ['oculos', 'gravata'] },
        localizacao: { mesa: [2, 0, 2], rotacao: -Math.PI / 2 },
        estado_atual: 'idle',
        historico: { tarefas_concluidas: 0, erros: 0, avaliacao: 5.0 },
      },
      {
        id: 'estagiario-001', nome: 'João Pedro', apelido: 'JP', cargo: 'estagiario',
        personalidade: 'esfomeado',
        avatar: { cor: '#aa6600', acessorios: ['cracha', 'mochila'] },
        localizacao: { mesa: [2, 0, 6], rotacao: -Math.PI / 2 },
        estado_atual: 'idle',
        historico: { tarefas_concluidas: 0, erros: 0, avaliacao: 5.0 },
      },
    ];
    agentsData = fallback;
    for (const a of fallback) createAgent3D(a);
  }
}

function createAgent3D(data) {
  const isCEO = data.cargo === 'ceo';
  const isManager = data.cargo === 'manager';

  if (isCEO) {
    // Wallace usa a CEO desk já criada em buildScene() — não cria nova mesa
    const ceoDeskPos = [-8, 0, 4];
    const ceoRot = Math.PI; // vira para o escritório

    const agent = new Agent3D(data);
    agent.position.set(ceoDeskPos[0], 0, ceoDeskPos[2] + 0.8); // levemente à frente da mesa
    agent.rotation.y = ceoRot;
    agent.homePosition = agent.position.clone();
    agent.homeRotation = ceoRot;
    agent.setStatus(data.estado_atual || 'idle');
    agent.isInteractable = true;
    agent.interactType = 'agent';
    scene.add(agent);
    agents3D[data.id] = agent;
    interactables.push(agent);
    invalidateInteractableCache();
    return;
  }

  // Default positions in workspace area (right side of office)
  const mesaPos = data.localizacao?.mesa || [4, 0, isManager ? 0 : 4];

  const desk = new Desk({
    color: isManager ? COLORS.MANAGER_ACCENT : COLORS.INTERN_ACCENT,
    label: isManager ? 'MANAGER' : 'ESTAGIARIO',
  });
  desk.position.set(mesaPos[0], 0, mesaPos[2]);
  // Agent desks face left (-x direction) so monitor faces the agent
  const rot = data.localizacao?.rotacao ?? -Math.PI / 2;
  desk.rotation.y = rot;
  scene.add(desk);
  desks[data.id] = desk;

  const agent = new Agent3D(data);
  // Agent sits in front of the desk, facing the monitor
  const chairOffset = new THREE.Vector3(0, 0, OFFICE.DESK_DEPTH / 2 + 0.4);
  chairOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
  agent.position.set(mesaPos[0] + chairOffset.x, 0, mesaPos[2] + chairOffset.z);
  agent.rotation.y = rot + Math.PI;
  agent.homePosition = agent.position.clone();
  agent.homeRotation = agent.rotation.y;
  agent.setStatus(data.estado_atual || 'idle');
  agent.isInteractable = true;
  agent.interactType = 'agent';
  scene.add(agent);
  agents3D[data.id] = agent;
  interactables.push(agent);
  invalidateInteractableCache();
}

// ── Agent lookup by sessionKey ────────
function findAgentBySessionKey(sessionKey) {
  if (!sessionKey) return null;
  for (const agent of Object.values(agents3D)) {
    if (agent.agentData?.sessionKey === sessionKey) return agent;
  }
  return null;
}

// ── Interaction ───────────────────────
function tryInteract() {
  if (!player || document.pointerLockElement !== document.body) return;

  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const meshes = prepInteractableMeshes();
  const intersects = player.getFpvInteractables(raycaster, meshes);

  if (intersects.length > 0) {
    const hit = intersects[0].object;
    triggerInteractionBehavior(hit);
  }
}

function invalidateInteractableCache() {
  _interactableMeshCache = null;
}

function prepInteractableMeshes() {
  if (_interactableMeshCache) return _interactableMeshCache;

  const meshes = [];

  // Agents
  for (const [id, agent] of Object.entries(agents3D)) {
    agent.traverse((child) => {
      if (child.isMesh) {
        child.userData.agentId = id;
        child.userData.interactType = 'agent';
        meshes.push(child);
      }
    });
  }

  // Kanban board
  if (kanbanBoard?.boardMesh) {
    kanbanBoard.boardMesh.userData.interactType = 'kanban';
    meshes.push(kanbanBoard.boardMesh);
  }

  // Warehouse (file storage)
  if (warehouse) {
    warehouse.traverse((child) => {
      if (child.isMesh) {
        child.userData.interactType = 'storage';
        meshes.push(child);
      }
    });
  }

  // Empty desks (hire)
  for (const obj of interactables) {
    if (obj.interactType === 'hire') {
      obj.traverse((child) => {
        if (child.isMesh) {
          child.userData.interactType = 'hire';
          meshes.push(child);
        }
      });
    }
  }

  // CEO computer (desk)
  const ceoDeskObj = desks['ceo'];
  if (ceoDeskObj && ceoDeskObj.monitor) {
    ceoDeskObj.monitor.userData.interactType = 'ceo-computer';
    meshes.push(ceoDeskObj.monitor);
  }

  // Meeting button
  if (scene.office?.meetingButton) {
    scene.office.meetingButton.traverse((child) => {
      if (child.isMesh) {
        child.userData.interactType = 'meeting';
        meshes.push(child);
      }
    });
  }

  _interactableMeshCache = meshes;
  return meshes;
}

function triggerInteractionBehavior(hit) {
  const type = hit.userData.interactType;

  switch (type) {
    case 'agent': {
      const agentData = agentsData.find(a => a.id === hit.userData.agentId);
      if (agentData) {
        document.exitPointerLock();
        agentChatPanel?.open(agentData); // Abri o Chat 1-on-1 em vez do TaskPanel
        hud?.setStatus(`CONVERSANDO COM: ${agentData.apelido || agentData.nome}`);
      }
      break;
    }
    case 'kanban': {
      document.exitPointerLock();
      kanbanPanel?.open();
      break;
    }
    case 'storage': {
      document.exitPointerLock();
      fileStoragePanel?.open();
      hud?.setStatus('FILE STORAGE ABERTO');
      break;
    }
    case 'hire': {
      document.exitPointerLock();
      hirePanel?.open();
      hud?.setStatus('CONTRATAR AGENTE');
      break;
    }
    case 'ceo-computer': {
      document.exitPointerLock();
      kanbanPanel?.open(); // CEO computer opens kanban / task overview
      hud?.setStatus('COMPUTADOR DO CEO');
      break;
    }
    case 'meeting': {
      triggerMeeting();
      break;
    }
  }
}

// ── Meeting System ────────────────────
function triggerMeeting() {
  if (isMeetingActive) {
    // End meeting
    isMeetingActive = false;
    meetingPanel?.close();
    hud?.setStatus('REUNIAO ENCERRADA');
    showToast('Reunião encerrada — agentes voltando', 'info');
    // Send agents back to desks
    for (const agent of Object.values(agents3D)) {
      agent.returnHome();
    }
    return;
  }

  isMeetingActive = true;
  hud?.setStatus('REUNIAO! AGENTES SE REUNINDO...');
  showToast('🔴 REUNIÃO CONVOCADA!', 'success');

  // Walk all agents to meeting room
  const meetingPositions = scene.office?.meetingChairPositions || [];
  let i = 0;
  for (const [id, agent] of Object.entries(agents3D)) {
    const pos = meetingPositions[i] || new THREE.Vector3(1.5 + i * 1.2, 0, -8);
    agent.walkTo(pos, () => {
      // Face the table center
      const dx = 1.5 - agent.position.x;
      const dz = -8 - agent.position.z;
      agent.rotation.y = Math.atan2(dx, dz);
    });
    i++;
  }

  // Open meeting panel after a delay
  setTimeout(() => {
    document.exitPointerLock();
    meetingPanel?.open(agentsData);
  }, 2500);
}

// ── WebSocket ─────────────────────────
function connectWebSocket() {
  try {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('WS connected');
      rpcClient = new GatewayRpcClient(ws);
      subAgentPoller = new SubAgentPoller(rpcClient);

      subAgentPoller.onSubAgentSpawned((info) => {
        const parentAgent = Object.values(agents3D).find(
          (a) => a.agentData?.sessionKey === info.parentSessionKey
        );
        const baseX = parentAgent ? parentAgent.position.x + 2 : 4;
        const baseZ = parentAgent ? parentAgent.position.z + 1 : 2;
        const subData = {
          id: info.agentId,
          nome: info.label,
          apelido: info.label,
          cargo: 'estagiario',
          sessionKey: info.sessionKey,
          avatar: { cor: '#558855', acessorios: [] },
          localizacao: { mesa: [baseX, 0, baseZ], rotacao: -Math.PI / 2 },
          estado_atual: 'working',
          historico: { tarefas_concluidas: 0, erros: 0, avaliacao: 5.0 },
        };
        createAgent3D(subData);
        agentsData.push(subData);
      });

      subAgentPoller.onSubAgentDespawned((agentId) => {
        const agent = agents3D[agentId];
        if (agent) {
          agent.setStatus('done');
          setTimeout(() => {
            scene.remove(agent);
            if (agent.dispose) agent.dispose();
            delete agents3D[agentId];
            agentsData = agentsData.filter((a) => a.id !== agentId);
            const idx = interactables.indexOf(agent);
            if (idx !== -1) interactables.splice(idx, 1);
            invalidateInteractableCache();
          }, 1500);
        }
      });

      subAgentPoller.start();
    };

    ws.onmessage = (event) => {
      try { handleWSEvent(JSON.parse(event.data)); } catch (e) {}
    };

    ws.onclose = () => {
      subAgentPoller?.stop();
      setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = () => {};
  } catch (err) {
    setTimeout(connectWebSocket, 5000);
  }
}

function handleWSEvent(data) {
  // ── RPC response — resolve pending promise ──────────────
  if (data.type === 'res' && rpcClient) {
    rpcClient.onResponse(data.id, data);
    return;
  }

  // ── Agent event broadcast ────────────────────────────────
  if (data.type === 'event' && data.event === 'agent') {
    const parsed = parseAgentEvent(data.payload);
    const agent = findAgentBySessionKey(parsed.sessionKey);
    if (agent) {
      agent.setStatus(parsed.status);
      if (parsed.speechText) showThoughtBubble(agent.agentId, parsed.speechText);
      if (parsed.isEnd) agent.setStatus('idle');
    }
    return;
  }

  switch (data.type) {
    case 'AGENTE_PENSANDO': {
      const { agente_id, pensamento } = data.payload;
      if (agents3D[agente_id]) {
        agents3D[agente_id].setStatus('working');
        if (desks[agente_id]) desks[agente_id].setWorking(true);
        showThoughtBubble(agente_id, pensamento);
      }
      hud?.setStatus(pensamento);
      break;
    }
    case 'TAREFA_CONCLUIDA': {
      const { agente_id, tarefa_id, resultado } = data.payload;
      if (agents3D[agente_id]) {
        agents3D[agente_id].setStatus('done');
        if (desks[agente_id]) desks[agente_id].setWorking(false);
        // Walk to kanban to post result
        const boardPos = kanbanBoard
          ? new THREE.Vector3(kanbanBoard.position.x, 0, kanbanBoard.position.z + 3)
          : new THREE.Vector3(0, 0, -1);
        agents3D[agente_id].walkTo(boardPos, () => {
          kanbanBoard?.addPostIt(resultado || 'TAREFA OK', 2, COLORS.POSTIT_GREEN);
          setTimeout(() => agents3D[agente_id].returnHome(), 1500);
        });
      }
      taskPanel?.showTaskResult(tarefa_id, resultado);
      const name = agentsData.find(a => a.id === agente_id)?.apelido || agente_id;
      const modelInfo = data.payload.model && data.payload.model !== 'mock' ? ` [${data.payload.model}]` : '';
      showToast(`${name} CONCLUIU!${data.payload.mock ? ' (MOCK)' : modelInfo}`, 'success');
      hideThoughtBubble(agente_id);
      hud?.setStatus(`CONCLUIDO: ${name}`);
      hud?.refresh();
      kanbanPanel?.refresh();
      break;
    }
    case 'AGENTE_ERRO': {
      const { agente_id, erro } = data.payload;
      if (agents3D[agente_id]) {
        agents3D[agente_id].setStatus('error');
        if (desks[agente_id]) desks[agente_id].setWorking(false);
      }
      showToast(`ERRO: ${erro}`, 'error');
      break;
    }
  }
}

// ── Resize ────────────────────────────
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  // no post-process resize needed
}

// ── Proximity Hint ────────────────────
function updateProximityHint() {
  const statusEl = document.getElementById('hud-status');
  if (!player || !statusEl) return;

  if (document.pointerLockElement !== document.body) {
    statusEl.style.opacity = '0';
    return;
  }

  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const meshes = prepInteractableMeshes();
  const intersects = player.getFpvInteractables(raycaster, meshes);

  if (intersects.length > 0) {
    const type = intersects[0].object.userData.interactType;
    const hints = {
      'agent': () => {
        const d = agentsData.find(a => a.id === intersects[0].object.userData.agentId);
        return `[E] INTERAGIR: ${d?.apelido || 'AGENTE'}`;
      },
      'kanban': () => '[E] ABRIR QUADRO DE TAREFAS',
      'storage': () => '[E] ABRIR FILE STORAGE',
      'hire': () => '[E] CONTRATAR AGENTE',
      'ceo-computer': () => '[E] USAR COMPUTADOR',
      'meeting': () => '[E] CONVOCAR REUNIAO',
    };
    const hintFn = hints[type];
    if (hintFn) {
      statusEl.textContent = hintFn();
      statusEl.style.opacity = '1';
      return;
    }
  }
  statusEl.style.opacity = '0';
}

// ── Render Loop ───────────────────────
function animate() {
  requestAnimationFrame(animate);

  if (document.hidden) {
    if (!window._lastBGTick) window._lastBGTick = 0;
    const now = performance.now();
    if (now - window._lastBGTick < 200) return;
    window._lastBGTick = now;
  }

  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  if (player) player.update(delta, camera);

  // Disable player movement when typing
  const activeEl = document.activeElement;
  const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT');
  if (isTyping && player) {
    player.moveForward = false;
    player.moveBackward = false;
    player.moveLeft = false;
    player.moveRight = false;
  }

  for (const agent of Object.values(agents3D)) {
    agent.update(time, delta);
  }

  if (scene.office && scene.office.update) {
    scene.office.update(time, delta);
  }

  // Proximity hints (every 10 frames)
  if (Math.floor(time * 60) % 10 === 0) {
    updateProximityHint();
  }

  // Thought bubbles
  for (const [agentId, bubble] of Object.entries(thoughtBubbles)) {
    if (bubble) {
      bubble.position.y = 2.0 + (Math.floor(time * 3) % 2 === 0 ? 0 : 0.06);
    }
  }

  // Clean render — no PS1 filter
  renderer.render(scene, camera);
}

// ── Thought Bubbles ───────────────────
function showThoughtBubble(agentId, text) {
  hideThoughtBubble(agentId);
  const agent = agents3D[agentId];
  if (!agent) return;

  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fillRect(4, 4, 248, 44);
  ctx.strokeStyle = 'rgba(100,70,40,0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, 248, 44);
  ctx.fillStyle = '#333333';
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  const shortText = text.length > 30 ? text.slice(0, 30) + '..' : text;
  ctx.fillText(shortText, 128, 24);
  ctx.font = '10px monospace';
  ctx.fillStyle = '#888';
  ctx.fillText('PENSANDO...', 128, 40);

  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex, transparent: true, depthTest: false,
  }));
  sprite.scale.set(2.2, 0.55, 1);
  sprite.position.copy(agent.position);
  sprite.position.y = 2.0;
  sprite.renderOrder = 10;
  scene.add(sprite);
  thoughtBubbles[agentId] = sprite;

  setTimeout(() => hideThoughtBubble(agentId), 8000);
}

function hideThoughtBubble(agentId) {
  if (thoughtBubbles[agentId]) {
    const bubble = thoughtBubbles[agentId];
    scene.remove(bubble);
    if (bubble.material) {
      if (bubble.material.map) bubble.material.map.dispose();
      bubble.material.dispose();
    }
    if (bubble.geometry) bubble.geometry.dispose();
    delete thoughtBubbles[agentId];
  }
}

// ── Start ─────────────────────────────
  // Graphics quality listener
  window.addEventListener('graphics-quality', (e) => {
    const level = e.detail; // low, medium, high
    if (level === 'low') {
      renderer.setPixelRatio(1);
      renderer.shadowMap.enabled = false;
    } else if (level === 'medium') {
      renderer.setPixelRatio(1.5);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
    } else {
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    showToast(`QUALIDADE: ${level.toUpperCase()}`, 'info');
  });

init().catch(console.error);
