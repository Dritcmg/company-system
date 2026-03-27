// ═══════════════════════════════════════════
//  OPEN TYCOON — Office (PS1 v2 — Room System)
//  3 rooms: CEO Room, Agent Workspace, Meeting Room
//  Well-lit, interactive, neon city background
// ═══════════════════════════════════════════

import * as THREE from 'three';
import { COLORS, OFFICE } from '../../shared/constants.js';
import { createPS1Material } from '../shaders/PS1Material.js';

export class Office extends THREE.Group {
  setScene(scene) { this.scene = scene; }

  constructor() {
    super();
    this.name = 'office';
    this.interactables = [];
    this._buildFloor();
    this._buildExteriorWalls();
    this._buildCeiling();
    this._buildInteriorWalls();
    this._buildWindow();
    this._buildOfficeLighting(); // ← new: proper ambient + point lights
    this._buildCEORoomDecor();
    this._buildMeetingRoom();
    this._buildWorkspaceDecor();
    this._buildMeetingButton();
    this._dayTime = 0;
  }

  // ── Office Lighting (bright and professional) ──
  _buildOfficeLighting() {
    // Ambient — soft fill, not too bright
    const ambient = new THREE.AmbientLight(0xFFFFFF, 0.9);
    this.add(ambient);

    // Hemisphere (sky warm / ground cool)
    const hemi = new THREE.HemisphereLight(0xFFF5E6, 0xB8C4D0, 0.6);
    hemi.position.set(0, OFFICE.WALL_HEIGHT, 0);
    this.add(hemi);

    // Point lights per room — simulate ceiling panels
    const pointLights = [
      { pos: [-8, 3.5, 2],  color: 0xFFF8E0, intensity: 1.8 },  // CEO room
      { pos: [-8, 3.5, -1], color: 0xFFF8E0, intensity: 1.2 },  // CEO room back
      { pos: [3,  3.5, 3],  color: 0xFFFFFF, intensity: 1.8 },  // Workspace center
      { pos: [8,  3.5, 5],  color: 0xFFFFFF, intensity: 1.4 },  // Workspace right
      { pos: [0,  3.5, -7], color: 0xE8EEFF, intensity: 1.6 },  // Meeting room
      { pos: [6,  3.5, -7], color: 0xE8EEFF, intensity: 1.4 },  // Meeting room right
    ];

    for (const pl of pointLights) {
      const light = new THREE.PointLight(pl.color, pl.intensity, 14, 1.5);
      light.position.set(...pl.pos);
      light.castShadow = false;
      this.add(light);
    }
  }

  // ── Floor ──
  _buildFloor() {
    const s = OFFICE.FLOOR_SIZE;
    const floorMat = createPS1Material({ color: COLORS.FLOOR_WOOD });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(s, s), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.add(floor);

    // CEO room carpet (darker red)
    const ceoCarpet = new THREE.Mesh(
      new THREE.BoxGeometry(7, 0.02, 10),
      createPS1Material({ color: 0x6B2020 })
    );
    ceoCarpet.position.set(-8, 0.01, 1);
    ceoCarpet.receiveShadow = true;
    this.add(ceoCarpet);

    // Meeting room carpet (dark blue)
    const meetCarpet = new THREE.Mesh(
      new THREE.BoxGeometry(18, 0.02, 8),
      createPS1Material({ color: 0x1A2A40 })
    );
    meetCarpet.position.set(2, 0.01, -8);
    meetCarpet.receiveShadow = true;
    this.add(meetCarpet);

    // Workspace carpet (warm gray)
    const workCarpet = new THREE.Mesh(
      new THREE.BoxGeometry(14, 0.02, 10),
      createPS1Material({ color: 0x8B7860 })
    );
    workCarpet.position.set(4, 0.01, 4);
    workCarpet.receiveShadow = true;
    this.add(workCarpet);
  }

  // ── Exterior Walls ──
  _buildExteriorWalls() {
    const h = OFFICE.WALL_HEIGHT;
    const half = OFFICE.FLOOR_SIZE / 2;
    const wallMat = createPS1Material({ color: COLORS.WALL });
    const trimMat = createPS1Material({ color: COLORS.BASEBOARD });

    // Back wall (north, -z)
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(OFFICE.FLOOR_SIZE, h, 0.15), wallMat);
    backWall.position.set(0, h / 2, -half);
    backWall.receiveShadow = true;
    this.add(backWall);

    // Right wall (east, +x)
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.15, h, OFFICE.FLOOR_SIZE), wallMat);
    rightWall.position.set(half, h / 2, 0);
    rightWall.receiveShadow = true;
    this.add(rightWall);

    // Front wall (south, +z) — partial (left side has glass)
    const frontWallL = new THREE.Mesh(new THREE.BoxGeometry(8, h, 0.15), wallMat);
    frontWallL.position.set(-8, h / 2, half);
    this.add(frontWallL);
    const frontWallR = new THREE.Mesh(new THREE.BoxGeometry(8, h, 0.15), wallMat);
    frontWallR.position.set(8, h / 2, half);
    this.add(frontWallR);

    // Baseboards
    for (const wall of [
      { pos: [0, 0.075, -half + 0.08], size: [OFFICE.FLOOR_SIZE, 0.15, 0.08] },
      { pos: [half - 0.04, 0.075, 0], size: [0.08, 0.15, OFFICE.FLOOR_SIZE] },
    ]) {
      const base = new THREE.Mesh(new THREE.BoxGeometry(...wall.size), trimMat);
      base.position.set(...wall.pos);
      this.add(base);
    }
  }

  // ── Interior Walls (Room Divisions) ──
  _buildInteriorWalls() {
    const h = OFFICE.WALL_HEIGHT;
    const half = OFFICE.FLOOR_SIZE / 2;
    const wallMat = createPS1Material({ color: COLORS.WALL_INTERIOR });

    // Wall between CEO Room and Agent Workspace (vertical, x = -4)
    // Door opening: z = 4.5 to 7.0 (2.5 units wide, 3m tall)

    // South section (z = -9 to -2)
    const ceoWallS = new THREE.Mesh(new THREE.BoxGeometry(0.12, h, 7), wallMat);
    ceoWallS.position.set(-4, h / 2, -5.5);
    this.add(ceoWallS);

    // Center section (z = -2 to 4.5) — was missing, causing the hole
    const ceoWallC = new THREE.Mesh(new THREE.BoxGeometry(0.12, h, 6.5), wallMat);
    ceoWallC.position.set(-4, h / 2, 1.25);
    this.add(ceoWallC);

    // North section (z = 7 to 12)
    const ceoWallN = new THREE.Mesh(new THREE.BoxGeometry(0.12, h, 5), wallMat);
    ceoWallN.position.set(-4, h / 2, 9.5);
    this.add(ceoWallN);

    // Above doorway (z = 4.5 to 7, y = 3 to 4)
    const ceoWallAboveDoor = new THREE.Mesh(new THREE.BoxGeometry(0.12, h - 3, 2.6), wallMat);
    ceoWallAboveDoor.position.set(-4, 3 + (h - 3) / 2, 5.75);
    this.add(ceoWallAboveDoor);

    // Door frame
    const frameMat = createPS1Material({ color: COLORS.DESK_WALNUT });
    const jambL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3, 0.1), frameMat);
    jambL.position.set(-4, 1.5, 4.5);
    this.add(jambL);
    const jambR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3, 0.1), frameMat);
    jambR.position.set(-4, 1.5, 7);
    this.add(jambR);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 2.6), frameMat);
    lintel.position.set(-4, 3, 5.75);
    this.add(lintel);

    // Wall between workspace and meeting room (horizontal, z = -3)
    // Door opening: x = -3 to 6 (9 units wide)
    // Left section: x = -4 to -3 (stops at CEO divider, not inside CEO room)
    const meetWallL = new THREE.Mesh(new THREE.BoxGeometry(5, h, 0.12), wallMat);
    meetWallL.position.set(-6.5, h / 2, -3); // x: -9 to -4
    this.add(meetWallL);

    // Right section: x = 6 to 12
    const meetWallR = new THREE.Mesh(new THREE.BoxGeometry(6, h, 0.12), wallMat);
    meetWallR.position.set(9, h / 2, -3);
    this.add(meetWallR);

    // Above meeting doorway (x = -3 to 6, y = 3 to 4)
    const meetWallAboveDoor = new THREE.Mesh(new THREE.BoxGeometry(9.2, h - 3, 0.12), wallMat);
    meetWallAboveDoor.position.set(1.5, 3 + (h - 3) / 2, -3);
    this.add(meetWallAboveDoor);

    // Meeting room door frame
    const meetJambL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3, 0.14), frameMat);
    meetJambL.position.set(-3, 1.5, -3);
    this.add(meetJambL);
    const meetJambR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3, 0.14), frameMat);
    meetJambR.position.set(6, 1.5, -3);
    this.add(meetJambR);
    const meetLintel = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.12, 0.14), frameMat);
    meetLintel.position.set(1.5, 3, -3);
    this.add(meetLintel);

    // Room labels
    this._addRoomSign('SALA DO CEO', -8, 3.5, -2, 0);
    this._addRoomSign('SALA DE REUNIAO', 1.5, 3.5, -3.2, 0);
    this._addRoomSign('WORKSPACE', 4, 3.5, -2.8, 0);
  }

  _addRoomSign(text, x, y, z, rotY) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 48;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(40,30,20,0.85)';
    ctx.fillRect(0, 0, 256, 48);
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#FFD580';
    ctx.textAlign = 'center';
    ctx.fillText(text, 128, 32);
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.5), mat);
    sign.position.set(x, y, z);
    sign.rotation.y = rotY;
    this.add(sign);
  }

  // ── Ceiling with Light Panels ──
  _buildCeiling() {
    const ceilMat = createPS1Material({ color: COLORS.CEILING });
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(OFFICE.FLOOR_SIZE, 0.1, OFFICE.FLOOR_SIZE), ceilMat);
    ceil.position.y = OFFICE.WALL_HEIGHT;
    this.add(ceil);

    // Light panels in each room
    const lightPanelMat = new THREE.MeshBasicMaterial({ color: 0xFFF8E0 });
    const panels = [
      // CEO room
      [-8, -1], [-8, 4],
      // Meeting room
      [-2, -8], [5, -8],
      // Workspace
      [2, 2], [8, 2], [2, 6], [8, 6],
    ];
    for (const [x, z] of panels) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.5), lightPanelMat);
      panel.position.set(x, OFFICE.WALL_HEIGHT - 0.04, z);
      this.add(panel);
    }
  }

  // ── Glass Window + Neon City Backdrop ──
  _buildWindow() {
    const half = OFFICE.FLOOR_SIZE / 2;

    // Glass wall (left side, west, -x)
    const glassMat = new THREE.MeshBasicMaterial({
      color: 0x88AACC, transparent: true, opacity: 0.15, side: THREE.DoubleSide
    });
    const pane = new THREE.Mesh(new THREE.BoxGeometry(0.06, OFFICE.WALL_HEIGHT, OFFICE.FLOOR_SIZE), glassMat);
    pane.position.set(-half + 0.03, OFFICE.WALL_HEIGHT / 2, 0);
    this.add(pane);

    // Neon city backdrop — load generated image
    const loader = new THREE.TextureLoader();
    loader.load('/neon_city.png', (texture) => {
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      const cityMat = new THREE.MeshBasicMaterial({ map: texture });
      const cityBackdrop = new THREE.Mesh(new THREE.PlaneGeometry(100, 40), cityMat);
      cityBackdrop.position.set(-half - 25, 8, 0);
      cityBackdrop.rotation.y = Math.PI / 2;
      this.add(cityBackdrop);
    }, undefined, () => {
      // Fallback: procedural city if image fails to load
      this._buildFallbackCity(half);
    });

    // Sunlight
    const sunLight = new THREE.DirectionalLight(0xFFCB8A, 1.6);
    this.sunLight = sunLight;
    sunLight.position.set(-20, 14, 5);
    sunLight.target.position.set(0, 0, -2);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.bias = -0.001;
    sunLight.shadow.camera.left = -15;
    sunLight.shadow.camera.right = 15;
    sunLight.shadow.camera.bottom = -10;
    sunLight.shadow.camera.top = 10;
    this.add(sunLight);
    this.add(sunLight.target);
  }

  _buildFallbackCity(half) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 256;
    const ctx = c.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#0a0020');
    grad.addColorStop(0.4, '#1a0040');
    grad.addColorStop(0.7, '#300060');
    grad.addColorStop(1, '#100030');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = '#050510';
    for (let i = 0; i < 40; i++) {
      const w = 8 + Math.floor(Math.random() * 14);
      const h = 30 + Math.floor(Math.random() * 120);
      const x = i * 13;
      ctx.fillRect(x, 256 - h, w, h);
      for (let wy = 256 - h + 5; wy < 250; wy += 5) {
        if (Math.random() > 0.6) {
          ctx.fillStyle = Math.random() > 0.5 ? '#ff00ff' : '#00ffff';
          ctx.fillRect(x + 2, wy, w - 4, 2);
          ctx.fillStyle = '#050510';
        }
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    const mat = new THREE.MeshBasicMaterial({ map: tex });
    const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(100, 40), mat);
    backdrop.position.set(-half - 25, 8, 0);
    backdrop.rotation.y = Math.PI / 2;
    this.add(backdrop);
  }

  // ── CEO Room Decorations ──
  _buildCEORoomDecor() {
    // Plants
    this.add(this._createPlant(-11, 0, -1));
    this.add(this._createPlant(-11, 0, 7));

    // Bookshelf on back wall of CEO room
    this.add(this._createMiniShelf(-10, 0, -1.5));

    // Clock
    this.add(this._createClock(-7, 3, -1.7));

    // Logo on CEO room wall
    const logoCanvas = document.createElement('canvas');
    logoCanvas.width = 256; logoCanvas.height = 64;
    const lctx = logoCanvas.getContext('2d');
    lctx.fillStyle = '#1a1020';
    lctx.fillRect(0, 0, 256, 64);
    lctx.font = 'bold 22px monospace';
    lctx.fillStyle = '#FFB74D';
    lctx.textAlign = 'center';
    lctx.fillText('TYCOON CLAWS', 128, 28);
    lctx.font = '10px monospace';
    lctx.fillStyle = '#ccc';
    lctx.fillText('AI VIRTUAL OFFICE', 128, 48);
    const logoTex = new THREE.CanvasTexture(logoCanvas);
    logoTex.minFilter = THREE.NearestFilter;
    logoTex.magFilter = THREE.NearestFilter;
    const logoMat = new THREE.MeshBasicMaterial({ map: logoTex });
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), logoMat);
    logo.position.set(-4.1, 3, 4);
    logo.rotation.y = Math.PI / 2;
    this.add(logo);
  }

  // ── Meeting Room ──
  _buildMeetingRoom() {
    // Big round table
    const tableMat = createPS1Material({ color: COLORS.MEETING_TABLE });

    // Octagonal table (PS1 approximation of round)
    const tableTop = new THREE.Mesh(
      new THREE.CylinderGeometry(2.5, 2.5, 0.08, 8),
      tableMat
    );
    tableTop.position.set(1.5, 0.75, -8);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    this.add(tableTop);

    // Table legs
    const legMat = createPS1Material({ color: 0x3A2A1A });
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.75, 0.1), legMat);
      leg.position.set(
        1.5 + Math.cos(angle) * 1.8,
        0.375,
        -8 + Math.sin(angle) * 1.8
      );
      this.add(leg);
    }

    // Chairs around table (8 positions)
    const chairMat = createPS1Material({ color: 0x2A2018 });
    this.meetingChairPositions = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const cx = 1.5 + Math.cos(angle) * 3.2;
      // clamp to ensure chairs stay inside the meeting room (z < -4)
      const cz = Math.min(-4, -8 + Math.sin(angle) * 3.2);

      // Seat
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, 0.4), chairMat);
      seat.position.set(cx, 0.48, cz);
      this.add(seat);

      // Back
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.4, 0.04), chairMat);
      const backX = cx + Math.cos(angle) * 0.2;
      const backZ = cz + Math.sin(angle) * 0.2;
      back.position.set(backX, 0.7, backZ);
      back.rotation.y = -angle + Math.PI;
      this.add(back);

      this.meetingChairPositions.push(new THREE.Vector3(cx, 0, cz));
    }

    // Whiteboard on meeting room wall
    const boardMat = createPS1Material({ color: 0xF0ECE5 });
    const whiteboard = new THREE.Mesh(new THREE.BoxGeometry(5, 2, 0.06), boardMat);
    whiteboard.position.set(1.5, 2.2, -11.9);
    this.add(whiteboard);
    // Frame edges
    for (const [sx, sy, sw, sh] of [
      [1.5, 3.25, 5.1, 0.06], [1.5, 1.15, 5.1, 0.06],
      [-1, 2.2, 0.06, 2.1], [4, 2.2, 0.06, 2.1]
    ]) {
      const framePiece = new THREE.Mesh(
        new THREE.BoxGeometry(sw, sh, 0.08),
        createPS1Material({ color: 0x555555 })
      );
      framePiece.position.set(sx, sy, -11.88);
      this.add(framePiece);
    }

    // "SALA DE REUNIÃO" label on whiteboard
    const wbLabel = document.createElement('canvas');
    wbLabel.width = 256; wbLabel.height = 64;
    const wctx = wbLabel.getContext('2d');
    wctx.font = 'bold 18px monospace';
    wctx.fillStyle = '#333';
    wctx.textAlign = 'center';
    wctx.fillText('AGENDA DA REUNIAO', 128, 30);
    wctx.font = '12px monospace';
    wctx.fillStyle = '#888';
    wctx.fillText('Pressione [R] para reunir', 128, 50);
    const wbTex = new THREE.CanvasTexture(wbLabel);
    wbTex.minFilter = THREE.NearestFilter;
    wbTex.magFilter = THREE.NearestFilter;
    const wbText = new THREE.Sprite(new THREE.SpriteMaterial({ map: wbTex, transparent: true }));
    wbText.scale.set(3, 0.8, 1);
    wbText.position.set(1.5, 2.2, -11.8);
    this.add(wbText);
  }

  // ── Meeting Button (Big Red Button) ──
  _buildMeetingButton() {
    const btnGroup = new THREE.Group();
    btnGroup.name = 'meetingButton';

    // Pedestal
    const pedMat = createPS1Material({ color: 0x555555 });
    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.3), pedMat);
    pedestal.position.y = 0.4;
    btnGroup.add(pedestal);

    // Red button (big, glowing)
    const btnMat = new THREE.MeshBasicMaterial({ color: COLORS.MEETING_BUTTON });
    const button = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.22), btnMat);
    button.position.y = 0.86;
    button.name = 'redButton';
    btnGroup.add(button);

    // Glow ring
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xFF4444, transparent: true, opacity: 0.3 });
    const glow = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.3), glowMat);
    glow.position.y = 0.82;
    btnGroup.add(glow);

    // Label
    const lblCanvas = document.createElement('canvas');
    lblCanvas.width = 128; lblCanvas.height = 32;
    const lctx = lblCanvas.getContext('2d');
    lctx.font = 'bold 12px monospace';
    lctx.fillStyle = '#FF4444';
    lctx.textAlign = 'center';
    lctx.fillText('REUNIAO [R]', 64, 20);
    const lblTex = new THREE.CanvasTexture(lblCanvas);
    lblTex.minFilter = THREE.NearestFilter;
    lblTex.magFilter = THREE.NearestFilter;
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: lblTex, transparent: true }));
    label.scale.set(1.2, 0.3, 1);
    label.position.y = 1.2;
    btnGroup.add(label);

    // Position: workspace side, clearly in front of the meeting room entrance
    btnGroup.position.set(0, 0, -1.5);
    btnGroup.isInteractable = true;
    btnGroup.interactType = 'meeting';
    this.add(btnGroup);
    this.meetingButton = btnGroup;
  }

  // ── Workspace Decorations ──
  _buildWorkspaceDecor() {
    // Plants in workspace
    this.add(this._createPlant(11, 0, 0));
    this.add(this._createPlant(11, 0, 8));

    // Coffee corner in workspace
    this.add(this._createCoffeeCorner(10, 0, -1.5));

    // Water cooler
    this.add(this._createWaterCooler(11, 0, 4));
    this.add(this._createSofa(9.5, 0, -1));
  }

  // ── Lighting (BRIGHT) ──
  _buildLighting() {
    // Strong ambient
    const ambient = new THREE.AmbientLight(0xFFF8E8, 0.85);
    this.add(ambient);

    // Hemisphere (sky + ground bounce)
    const hemi = new THREE.HemisphereLight(0xFFF8F0, 0xA09080, 0.5);
    this.add(hemi);

    // Point lights in each room (restored!)
    const pointLightPositions = [
      // CEO room
      { pos: [-8, 3.5, 2], color: 0xFFF0D8, intensity: 1.2 },
      // Workspace
      { pos: [4, 3.5, 2], color: 0xFFF5E0, intensity: 1.0 },
      { pos: [8, 3.5, 6], color: 0xFFF5E0, intensity: 0.8 },
      // Meeting room
      { pos: [1.5, 3.5, -8], color: 0xFFF0D0, intensity: 1.0 },
    ];
    for (const pl of pointLightPositions) {
      const light = new THREE.PointLight(pl.color, pl.intensity, 15, 1.5);
      light.position.set(...pl.pos);
      this.add(light);
    }
  }

  // ── No-op update ──
  _createSofa(x, y, z) {
    const g = new THREE.Group();
    const baseMat = createPS1Material({ color: 0x3A2A1A });
    const cushionMat = createPS1Material({ color: 0x4A3A2A });

    // Base
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.25, 0.6), baseMat);
    base.position.y = 0.125;
    g.add(base);

    // Encosto
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 0.08), baseMat);
    back.position.set(0, 0.35, -0.26);
    g.add(back);

    // Braços
    for (const bx of [-0.66, 0.66]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 0.6), baseMat);
      arm.position.set(bx, 0.3, 0);
      g.add(arm);
    }

    // Almofadas
    for (const ax of [-0.3, 0.3]) {
      const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.5), cushionMat);
      cushion.position.set(ax, 0.3, 0);
      g.add(cushion);
    }

    g.position.set(x, y, z);
    return g;
  }

  update(time, delta) {
    this._dayTime += (delta || 0.01) * 0.005;
    const phase = (Math.sin(this._dayTime) + 1) / 2; // 0 to 1

    if (this.sunLight) {
      const dayColor = new THREE.Color(0xFFCB8A);
      const nightColor = new THREE.Color(0x223355);
      this.sunLight.color.copy(nightColor).lerp(dayColor, phase);
      this.sunLight.intensity = 0.2 + phase * 2.0;
    }

    if (this.scene) {
      const skyDay = new THREE.Color(COLORS.BACKGROUND);
      const skyNight = new THREE.Color(0x050510);
      this.scene.background.copy(skyNight).lerp(skyDay, phase);
      if (this.scene.fog) {
        this.scene.fog.color.copy(this.scene.background);
      }
    }

    // Pulse meeting button glow
    if (this.meetingButton) {
      const glow = this.meetingButton.children[2]; // glow mesh
      if (glow && glow.material) {
        glow.material.opacity = 0.2 + Math.sin(time * 3) * 0.15;
      }
    }
  }

  // ── Helper: Plant ──
  _createPlant(x, y, z) {
    const g = new THREE.Group();
    const potMat = createPS1Material({ color: COLORS.PLANT_POT });
    const pot = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), potMat);
    pot.position.set(0, 0.175, 0);
    pot.castShadow = true;
    g.add(pot);
    const soilMat = createPS1Material({ color: 0x3A2A1A });
    const soil = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.3), soilMat);
    soil.position.set(0, 0.36, 0);
    g.add(soil);
    const leafMat = createPS1Material({ color: COLORS.PLANT_GREEN });
    const leaf1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.55, 0.04), leafMat);
    leaf1.position.set(0, 0.68, 0);
    g.add(leaf1);
    const leaf2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.55, 0.4), leafMat);
    leaf2.position.set(0, 0.68, 0);
    g.add(leaf2);
    g.position.set(x, y, z);
    return g;
  }

  // ── Helper: Clock ──
  _createClock(x, y, z) {
    const g = new THREE.Group();
    const faceMat = createPS1Material({ color: 0xFFF5E0 });
    const face = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.04), faceMat);
    g.add(face);
    const frameMat = createPS1Material({ color: COLORS.DESK_WALNUT });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 0.03), frameMat);
    frame.position.z = -0.01;
    g.add(frame);
    const markMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
    for (const [mx, my] of [[0, 0.25], [0.25, 0], [0, -0.25], [-0.25, 0]]) {
      const mark = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.01), markMat);
      mark.position.set(mx, my, 0.025);
      if (Math.abs(mx) > 0) mark.rotation.z = Math.PI / 2;
      g.add(mark);
    }
    const now = new Date();
    const hourAngle = -((now.getHours() % 12) / 12) * Math.PI * 2;
    const minAngle = -(now.getMinutes() / 60) * Math.PI * 2;
    const handMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    const hh = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.01), handMat);
    hh.position.set(Math.sin(hourAngle) * 0.1, Math.cos(hourAngle) * 0.1, 0.03);
    hh.rotation.z = hourAngle;
    g.add(hh);
    const mh = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.28, 0.01), handMat);
    mh.position.set(Math.sin(minAngle) * 0.14, Math.cos(minAngle) * 0.14, 0.03);
    mh.rotation.z = minAngle;
    g.add(mh);
    g.position.set(x, y, z);
    return g;
  }

  // ── Helper: Mini bookshelf ──
  _createMiniShelf(x, y, z) {
    const g = new THREE.Group();
    const frameMat = createPS1Material({ color: 0x3A2A1A });
    const shelfMat = createPS1Material({ color: 0x5C3A1E });

    for (const sx of [-0.6, 0.6]) {
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.8, 0.3), frameMat);
      side.position.set(sx, 0.9, 0);
      g.add(side);
    }
    for (let i = 0; i < 4; i++) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.03, 0.28), shelfMat);
      shelf.position.set(0, 0.1 + i * 0.5, 0);
      g.add(shelf);
    }
    const bookColors = [0xA02000, 0x203868, 0x285838, 0x8B6914];
    for (let s = 0; s < 3; s++) {
      let bx = -0.5;
      for (let b = 0; b < 5 && bx < 0.5; b++) {
        const bw = 0.05 + Math.random() * 0.04;
        const bh = 0.25 + Math.random() * 0.2;
        const bookMat = createPS1Material({ color: bookColors[Math.floor(Math.random() * bookColors.length)] });
        const book = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.2), bookMat);
        book.position.set(bx + bw / 2, 0.12 + s * 0.5 + bh / 2, 0);
        g.add(book);
        bx += bw + 0.01;
      }
    }
    g.position.set(x, y, z);
    return g;
  }

  // ── Helper: Coffee corner ──
  _createCoffeeCorner(x, y, z) {
    const g = new THREE.Group();
    const tableMat = createPS1Material({ color: COLORS.DESK_WALNUT });
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, 0.5), tableMat);
    top.position.y = 0.85;
    g.add(top);
    for (const [lx, lz] of [[-0.4, -0.18], [0.4, -0.18], [-0.4, 0.18], [0.4, 0.18]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.85, 0.05), tableMat);
      leg.position.set(lx, 0.425, lz);
      g.add(leg);
    }
    const machineMat = createPS1Material({ color: 0x2A2A2A });
    const machine = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 0.2), machineMat);
    machine.position.set(-0.25, 1.05, 0);
    g.add(machine);
    const mugMat = createPS1Material({ color: COLORS.MUG_WHITE });
    for (let i = 0; i < 2; i++) {
      const mug = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.06), mugMat);
      mug.position.set(0.1 + i * 0.12, 0.9, 0);
      g.add(mug);
    }
    g.position.set(x, y, z);
    return g;
  }

  // ── Helper: Water cooler ──
  _createWaterCooler(x, y, z) {
    const g = new THREE.Group();
    const bodyMat = createPS1Material({ color: 0xD8D8D8 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.0, 0.3), bodyMat);
    body.position.y = 0.5;
    g.add(body);
    const jugMat = createPS1Material({ color: 0x6AAAC8 });
    const jug = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.35, 0.2), jugMat);
    jug.position.y = 1.2;
    g.add(jug);
    g.position.set(x, y, z);
    return g;
  }
}
