// ═══════════════════════════════════════════
//  OPEN TYCOON — PS1 Kanban Board
//  Blocky wall board with flat post-it cards
// ═══════════════════════════════════════════

import * as THREE from 'three';
import { COLORS, OFFICE } from '../../shared/constants.js';
import { createPS1Material } from '../shaders/PS1Material.js';

export class KanbanBoard extends THREE.Group {
  constructor() {
    super();
    this.name = 'kanbanBoard';
    this.isInteractable = true;
    this.interactType = 'kanban';
    this._buildBoard();
    this._buildColumns();
    this.postIts = [];
  }

  _buildBoard() {
    const half = OFFICE.FLOOR_SIZE / 2;
    // PS1: flat chunky board
    const boardMat = createPS1Material({ color: 0x1A1A24, emissiveIntensity: 0.05 });
    const board = new THREE.Mesh(new THREE.BoxGeometry(5.5, 2.8, 0.1), boardMat);
    board.position.set(0, 2.4, -half + 0.1);
    board.receiveShadow = true;
    this.add(board);
    this.boardMesh = board;

    // Frame — simple contrasting border blocks
    const frameMat = createPS1Material({ color: 0x444455 });
    // Top
    const frameTop = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.06, 0.12), frameMat);
    frameTop.position.set(0, 3.84, -half + 0.1);
    this.add(frameTop);
    // Bottom
    const frameBot = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.06, 0.12), frameMat);
    frameBot.position.set(0, 1.0, -half + 0.1);
    this.add(frameBot);
    // Left
    const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.9, 0.12), frameMat);
    frameL.position.set(-2.78, 2.4, -half + 0.1);
    this.add(frameL);
    // Right
    const frameR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.9, 0.12), frameMat);
    frameR.position.set(2.78, 2.4, -half + 0.1);
    this.add(frameR);

    // Title
    const tc = document.createElement('canvas');
    tc.width = 256; tc.height = 32;
    const ctx = tc.getContext('2d');
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#FFB74D';
    ctx.textAlign = 'center';
    ctx.fillText('QUADRO DE TAREFAS', 128, 22);
    const tex = new THREE.CanvasTexture(tc);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    const title = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    title.scale.set(3, 0.4, 1);
    title.position.set(0, 4, -half + 0.2);
    title.renderOrder = 1;
    this.add(title);
  }

  _buildColumns() {
    const half = OFFICE.FLOOR_SIZE / 2;
    const columns = ['BACKLOG', 'EXECUTANDO', 'CONCLUIDO'];
    const xPositions = [-1.6, 0, 1.6];

    for (let i = 0; i < 3; i++) {
      // Column divider — simple vertical bar
      if (i > 0) {
        const divMat = createPS1Material({ color: 0x555566 });
        const divider = new THREE.Mesh(new THREE.BoxGeometry(0.03, 2.6, 0.04), divMat);
        divider.position.set(xPositions[i] - 0.8, 2.4, -half + 0.16);
        this.add(divider);
      }
      
      // Column header
      const hc = document.createElement('canvas');
      hc.width = 128; hc.height = 32;
      const hctx = hc.getContext('2d');
      hctx.font = 'bold 14px monospace';
      hctx.fillStyle = '#FFFFFF';
      hctx.textAlign = 'center';
      hctx.fillText(columns[i], 64, 20);
      const htex = new THREE.CanvasTexture(hc);
      htex.minFilter = THREE.NearestFilter;
      htex.magFilter = THREE.NearestFilter;
      const header = new THREE.Sprite(new THREE.SpriteMaterial({ map: htex, transparent: true, depthTest: false }));
      header.scale.set(1.2, 0.3, 1);
      header.position.set(xPositions[i], 3.55, -half + 0.2);
      header.renderOrder = 1;
      this.add(header);
    }

    // "Click to open" hint
    const hintC = document.createElement('canvas');
    hintC.width = 256; hintC.height = 32;
    const hctx2 = hintC.getContext('2d');
    hctx2.font = '11px monospace';
    hctx2.fillStyle = '#777777';
    hctx2.textAlign = 'center';
    hctx2.fillText('[E] ABRIR KANBAN', 128, 20);
    const hintTex = new THREE.CanvasTexture(hintC);
    hintTex.minFilter = THREE.NearestFilter;
    hintTex.magFilter = THREE.NearestFilter;
    const hint = new THREE.Sprite(new THREE.SpriteMaterial({ map: hintTex, transparent: true, depthTest: false }));
    hint.scale.set(2, 0.25, 1);
    hint.position.set(0, 0.9, -half + 0.2);
    hint.renderOrder = 1;
    this.add(hint);
  }

  addPostIt(text, column = 0, color = COLORS.POSTIT_YELLOW) {
    const half = OFFICE.FLOOR_SIZE / 2;
    const xPositions = [-1.6, 0, 1.6];
    const yStart = 3.2 - this.postIts.filter(p => p.column === column).length * 0.4;

    // PS1: flat box post-it
    const piMat = createPS1Material({ color });
    const postIt = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.35, 0.02), piMat);
    postIt.position.set(xPositions[column], yStart, -half + 0.18);
    this.add(postIt);

    // Text
    const tc = document.createElement('canvas');
    tc.width = 128; tc.height = 32;
    const ctx = tc.getContext('2d');
    ctx.font = '11px monospace';
    ctx.fillStyle = '#333333';
    ctx.textAlign = 'center';
    const shortText = text.length > 22 ? text.slice(0, 22) + '..' : text;
    ctx.fillText(shortText, 64, 20);
    const tex = new THREE.CanvasTexture(tc);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    label.scale.set(1.2, 0.3, 1);
    label.position.set(xPositions[column], yStart, -half + 0.2);
    label.renderOrder = 2;
    this.add(label);

    this.postIts.push({ mesh: postIt, label, column, text });
  }
}
