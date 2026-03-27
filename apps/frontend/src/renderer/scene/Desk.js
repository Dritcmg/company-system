// ═══════════════════════════════════════════
//  TYCOON CLAWS — Desk (PS1 Style)
//  Blocky furniture, CRT monitor, chunky chair
// ═══════════════════════════════════════════

import * as THREE from 'three';
import { COLORS, OFFICE } from '../../shared/constants.js';
import { createPS1Material } from '../shaders/PS1Material.js';

export class Desk extends THREE.Group {
  constructor(options = {}) {
    super();
    const { color = COLORS.MANAGER_ACCENT, label = 'Mesa', isCEO = false } = options;
    this.accentColor = color;
    this.isCEO = isCEO;
    this._buildDesk(isCEO);
    this._buildMonitor(color, isCEO);
    this._buildChair();
    this._buildAccessories(color);
    this._buildLabel(label, color);
    this._buildLight();
  }

  _buildDesk(isCEO) {
    const w = isCEO ? 3.2 : OFFICE.DESK_WIDTH;
    const d = isCEO ? 1.5 : OFFICE.DESK_DEPTH;
    const h = OFFICE.DESK_HEIGHT;

    // PS1 chunky desk — thick slab top
    const topMat = createPS1Material({ color: 0x6B4226 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), topMat);
    top.position.y = h;
    top.castShadow = true;
    top.receiveShadow = true;
    this.add(top);

    const legMat = createPS1Material({ color: 0x4A3218 });
    const legGeo = new THREE.BoxGeometry(0.08, h, 0.08);
    const legPositions = [
      [-w/2 + 0.1, -d/2 + 0.1], [w/2 - 0.1, -d/2 + 0.1],
      [-w/2 + 0.1, d/2 - 0.1], [w/2 - 0.1, d/2 - 0.1],
    ];
    for (const [lx, lz] of legPositions) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(lx, h/2, lz);
      this.add(leg);
    }

    const drawerMat = createPS1Material({ color: 0x5C3A1E });
    const drawer = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, h * 0.5, 0.04), drawerMat);
    drawer.position.set(0, h * 0.45, d/2 - 0.02);
    this.add(drawer);

    const padMat = createPS1Material({ color: this.accentColor, emissiveIntensity: 0.1 });
    const deskPad = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 0.02, d * 0.4), padMat);
    deskPad.position.set(0, h + 0.04, 0.1);
    this.add(deskPad);

    this.deskWidth = w;
    this.deskDepth = d;
  }

  _buildMonitor(color, isCEO = false) {
    const h = OFFICE.DESK_HEIGHT;
    const d = this.deskDepth || OFFICE.DESK_DEPTH;

    const mw = 0.82;
    const mh = 0.62;
    const crtMat = createPS1Material({ color: 0xC8C0B0 });

    const createOneMonitor = (offsetX) => {
      const monitorBody = new THREE.Mesh(new THREE.BoxGeometry(mw, mh, 0.45), crtMat);
      monitorBody.position.set(offsetX, h + 0.35, -d/2 + 0.35);
      monitorBody.castShadow = true;
      this.add(monitorBody);

      const screenMat = createPS1Material({ color: 0x0a1525, emissiveIntensity: 0.15 });
      const screen = new THREE.Mesh(new THREE.BoxGeometry(mw * 0.85, mh * 0.85, 0.02), screenMat);
      screen.position.set(offsetX, h + 0.36, -d/2 + 0.58);
      this.add(screen);
      if (offsetX === 0 || !this.monitor) this.monitor = screen;

      const baseMat = createPS1Material({ color: 0xA0A090 });
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.3), baseMat);
      base.position.set(offsetX, h + 0.03, -d/2 + 0.35);
      this.add(base);
    };

    if (isCEO) {
      createOneMonitor(-0.5);
      createOneMonitor(0.5);
    } else {
      createOneMonitor(0);
    }

    const ledMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.01), ledMat);
    led.position.set(isCEO ? 0.75 : 0.25, h + 0.12, -d/2 + 0.58);
    this.add(led);
  }

  _buildChair() {
    const d = this.deskDepth || OFFICE.DESK_DEPTH;
    const chairMat = createPS1Material({ color: COLORS.CHAIR_LEATHER });
    const metalMat = createPS1Material({ color: 0x555555 });

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.45), chairMat);
    seat.position.set(0, 0.48, d / 2 + 0.45);
    seat.castShadow = true;
    this.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.55, 0.06), chairMat);
    back.position.set(0, 0.78, d / 2 + 0.68);
    this.add(back);

    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.06), metalMat);
    pole.position.set(0, 0.29, d / 2 + 0.45);
    this.add(pole);

    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.22), metalMat);
      leg.position.set(Math.sin(a) * 0.12, 0.04, d / 2 + 0.45 + Math.cos(a) * 0.12);
      leg.rotation.y = a;
      this.add(leg);
    }
  }

  _buildAccessories(color) {
    const h = OFFICE.DESK_HEIGHT;
    const w = this.deskWidth || OFFICE.DESK_WIDTH;
    const d = this.deskDepth || OFFICE.DESK_DEPTH;

    const lampMat = createPS1Material({ color: COLORS.LAMP_GOLD });
    const lampBase = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.14), lampMat);
    lampBase.position.set(-w / 2 + 0.3, h + 0.04, -d / 2 + 0.2);
    this.add(lampBase);
    const lampPole = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.35, 0.03), lampMat);
    lampPole.position.set(-w / 2 + 0.3, h + 0.22, -d / 2 + 0.2);
    this.add(lampPole);
    const lampShade = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.14), lampMat);
    lampShade.position.set(-w / 2 + 0.3, h + 0.42, -d / 2 + 0.2);
    this.add(lampShade);

    const mugMat = createPS1Material({ color: COLORS.MUG_WHITE });
    const mug = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.07), mugMat);
    mug.position.set(w / 2 - 0.25, h + 0.04, 0.2);
    this.add(mug);

    const kbMat = createPS1Material({ color: 0x333333 });
    const keyboard = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.025, 0.15), kbMat);
    keyboard.position.set(0, h + 0.02, 0.15);
    this.add(keyboard);

    const mouseMat = createPS1Material({ color: 0x222222 });
    const mouse = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.09), mouseMat);
    mouse.position.set(0.25, h + 0.02, 0.15);
    this.add(mouse);

    const potMat = createPS1Material({ color: COLORS.PLANT_POT });
    const pot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.1), potMat);
    pot.position.set(w / 2 - 0.15, h + 0.04, -d / 2 + 0.15);
    this.add(pot);

    const leafMat = createPS1Material({ color: COLORS.PLANT_GREEN });
    const leaf1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.02), leafMat);
    leaf1.position.set(w / 2 - 0.15, h + 0.14, -d / 2 + 0.15);
    this.add(leaf1);
    const leaf2 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.14, 0.12), leafMat);
    leaf2.position.set(w / 2 - 0.15, h + 0.14, -d / 2 + 0.15);
    this.add(leaf2);
  }

  _buildLabel(text, color) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(230,220,205,0.9)';
    ctx.fillRect(20, 8, 216, 48);
    ctx.strokeStyle = `#${color.toString(16).padStart(6, '0')}`;
    ctx.lineWidth = 3;
    ctx.strokeRect(20, 8, 216, 48);
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#3A3A3A';
    ctx.textAlign = 'center';
    ctx.fillText(text, 128, 40);
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    sprite.scale.set(1.6, 0.4, 1);
    sprite.position.set(0, OFFICE.DESK_HEIGHT + 1.5, 0);
    sprite.renderOrder = 1;
    this.add(sprite);
  }

  _buildLight() {
    // SpotLight removida — Office já tem 6 PointLights cobrindo todas as mesas.
    // SpotLight por mesa adicionava ~30% de custo de iluminação sem ganho visual notável.
  }

  setWorking(isWorking) {
    if (this.monitor) {
      const mat = this.monitor.material;
      mat.emissive = mat.color.clone();
      mat.emissiveIntensity = isWorking ? 0.6 : 0.08;
    }
  }
}
