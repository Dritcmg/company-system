// ═══════════════════════════════════════════
//  OPEN TYCOON — PS1 Bookshelf & Filing
//  Blocky bookshelves, simple filing cabinets
// ═══════════════════════════════════════════

import * as THREE from 'three';
import { COLORS, OFFICE } from '../../shared/constants.js';
import { createPS1Material } from '../shaders/PS1Material.js';

export class Warehouse extends THREE.Group {
  constructor() {
    super();
    this.name = 'warehouse';
    this._buildBookshelf(-9, 0, -OFFICE.FLOOR_SIZE / 2 + 1.2);
    this._buildBookshelf(-6.5, 0, -OFFICE.FLOOR_SIZE / 2 + 1.2);
    this._buildFilingCabinet(-4, 0, -OFFICE.FLOOR_SIZE / 2 + 0.8);
    this._buildLabel();
  }

  _buildBookshelf(x, y, z) {
    const g = new THREE.Group();
    // PS1: solid wood shelf, no glass
    const frameMat = createPS1Material({ color: 0x3A2A1A });
    const shelfMat = createPS1Material({ color: 0x5C3A1E });

    const w = 1.6, h = 2.4, d = 0.35;
    
    // Sides — thick wooden slabs
    for (const sx of [-w / 2, w / 2]) {
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.05, h, d), frameMat);
      side.position.set(sx, h / 2, 0);
      side.castShadow = true;
      g.add(side);
    }
    
    // Back panel
    const backPanel = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.03), frameMat);
    backPanel.position.set(0, h / 2, -d / 2 + 0.015);
    g.add(backPanel);
    
    // Shelves (5 levels) — thick wooden slabs
    for (let i = 0; i < 5; i++) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(w - 0.1, 0.04, d), shelfMat);
      shelf.position.set(0, 0.15 + i * 0.55, 0);
      shelf.receiveShadow = true;
      g.add(shelf);
    }
    
    // Top
    const topM = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.05, d + 0.02), frameMat);
    topM.position.set(0, h, 0);
    g.add(topM);

    // Books — colored blocks (PS1 can handle boxes fine)
    const bookColors = [COLORS.BOOK_RED, COLORS.BOOK_BLUE, COLORS.BOOK_GREEN, 0x8B6914, 0x6B3A6B, 0x1C5A5A];
    for (let shelf = 0; shelf < 4; shelf++) {
      const sy = 0.17 + shelf * 0.55;
      const bookCount = 4 + Math.floor(Math.random() * 4);
      let bx = -w / 2 + 0.12;
      for (let b = 0; b < bookCount && bx < w / 2 - 0.12; b++) {
        const bw = 0.05 + Math.random() * 0.04;
        const bh = 0.3 + Math.random() * 0.18;
        const bc = bookColors[Math.floor(Math.random() * bookColors.length)];
        const bookMat = createPS1Material({ color: bc });
        const book = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, d * 0.65), bookMat);
        book.position.set(bx + bw / 2, sy + bh / 2, 0);
        book.castShadow = true;
        g.add(book);
        bx += bw + 0.01;
      }
    }

    g.position.set(x, y, z);
    this.add(g);
  }

  _buildFilingCabinet(x, y, z) {
    const g = new THREE.Group();
    // PS1 filing cabinet — solid boxes
    const cabinetMat = createPS1Material({ color: 0xC0C0B0 });
    const handleMat = createPS1Material({ color: 0x333333 });

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.3, 0.45), cabinetMat);
    body.position.y = 0.65;
    body.castShadow = true;
    g.add(body);

    // Drawer lines + handles (4 drawers)
    for (let i = 0; i < 4; i++) {
      const dy = 0.2 + i * 0.3;
      // Drawer line
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(0.58, 0.01, 0.01),
        new THREE.MeshBasicMaterial({ color: 0x888888 })
      );
      line.position.set(0, dy, 0.23);
      g.add(line);
      // Handle — simple block bar
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.02), handleMat);
      handle.position.set(0, dy + 0.14, 0.24);
      g.add(handle);
    }

    g.position.set(x, y, z);
    this.add(g);
  }

  _buildLabel() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 32;
    const ctx = c.getContext('2d');
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#999999';
    ctx.textAlign = 'center';
    ctx.fillText('FILE STORAGE', 128, 22);
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.6 }));
    sprite.scale.set(2.5, 0.4, 1);
    sprite.position.set(-7, 2.8, -OFFICE.FLOOR_SIZE / 2 + 1.5);
    this.add(sprite);
  }
}
