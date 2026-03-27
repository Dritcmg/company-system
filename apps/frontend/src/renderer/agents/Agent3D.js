// ═══════════════════════════════════════════
//  OPEN TYCOON — Agent3D (PS1 Style)
//  Blocky low-poly characters, flat shading
// ═══════════════════════════════════════════

import * as THREE from 'three';
import { COLORS, STATUS } from '../../shared/constants.js';
import { createPS1Material } from '../shaders/PS1Material.js';

const STATUS_WORKING_SUB = 'working_sub';

export class Agent3D extends THREE.Group {
  constructor(data, options = {}) {
    super();
    this.agentData = data;
    this.agentId = data.id;
    this.status = STATUS.IDLE;
    this.isInteractable = true;
    this.interactType = 'agent';

    // Sub-agent flag
    this.isSubAgent = options.isSubAgent || false;

    // Walking state
    this.walkTarget = null;
    this.walkSpeed = 2.5;
    this.isWalking = false;
    this.homePosition = null;

    // Animation
    this.blinkTimer = Math.random() * 3 + 1;
    this.eyes = [];
    this._idleTime = 0;
    this._eyesClosed = false;
    this._talking = false;

    // Spawn/despawn state
    this._spawning = false;
    this._spawnProgress = 0;
    this._despawning = false;
    this._despawnProgress = 0;
    this._onDespawnComplete = null;

    // Delta tracking (update receives elapsed time, not delta)
    this._lastTime = null;

    // Sub-agent circular walk state
    this._circleAngle = 0;

    // Sub-agent task sprite (updated via setSubAgentTask)
    this._taskSprite = null;

    const isManager = data.cargo === 'manager';
    const rawColor = data.avatar?.cor
      ? parseInt(data.avatar.cor.replace('#', ''), 16)
      : (isManager ? COLORS.MANAGER : COLORS.INTERN);

    const baseColor = this.isSubAgent ? _lightenColor(rawColor, 0.35) : rawColor;

    this._buildBody(baseColor, isManager);
    this._buildFace();
    this._buildAccessories(data.avatar?.acessorios || data.avatar_acessorios || [], baseColor);
    this._buildNameLabel(data.apelido || data.nome, isManager);
    this._buildStatusOrb();

    if (this.isSubAgent) {
      this.scale.set(0.7, 0.7, 0.7);
      this._buildSubBadge();
    }
  }

  // ── Sub-agent helpers ──────────────────────

  _buildSubBadge() {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 32;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(80,160,255,0.92)';
    ctx.fillRect(2, 2, 60, 28);
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText('SUB', 32, 22);

    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
    );
    sprite.scale.set(0.55, 0.28, 1);
    sprite.position.y = 1.95;
    sprite.renderOrder = 2;
    this.add(sprite);
    this._subBadge = sprite;
  }

  // ── Spawn / Despawn ────────────────────────

  spawnIn() {
    this._spawning = true;
    this._despawning = false;
    this._spawnProgress = 0;
    this.scale.set(0, 0, 0);
  }

  despawnOut(onComplete) {
    this._despawning = true;
    this._spawning = false;
    this._despawnProgress = 0;
    this._onDespawnComplete = onComplete || null;
  }

  // ── Sub-agent task label ───────────────────

  setSubAgentTask(text) {
    const truncated = text.length > 20 ? text.slice(0, 20) + '..' : text;

    if (!this._taskSprite) {
      this._taskSprite = _createTaskSprite(truncated);
      this._taskSprite.position.y = 2.3;
      this._taskSprite.renderOrder = 3;
      this.add(this._taskSprite);
    } else {
      _updateTaskSprite(this._taskSprite, truncated);
    }
  }

  // ── Body ──────────────────────────────────

  _buildBody(color, isManager) {
    const bodyMat = createPS1Material({ color, snapResolution: 100 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.8, 0.3), bodyMat);
    body.position.y = 0.6;
    body.castShadow = true;
    this.add(body);

    const collarMat = createPS1Material({ color: 0xF0E8D8 });
    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.08, 0.26), collarMat);
    collar.position.y = 0.98;
    this.add(collar);

    const headMat = createPS1Material({ color: 0xFFCCAA });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.3), headMat);
    head.position.y = 1.2;
    head.castShadow = true;
    this.add(head);
    this.head = head;

    const hairColor = isManager ? 0x2A1A0A : 0x1A0F05;
    const hairMat = createPS1Material({ color: hairColor });
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.32), hairMat);
    hair.position.y = 1.41;
    this.add(hair);
    const sideHair = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.24, 0.06), hairMat);
    sideHair.position.set(0, 1.28, -0.15);
    this.add(sideHair);

    const armMat = createPS1Material({ color });
    this.leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), armMat);
    this.leftArm.position.set(-0.3, 0.7, 0);
    this.add(this.leftArm);
    this.rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), armMat);
    this.rightArm.position.set(0.3, 0.7, 0);
    this.add(this.rightArm);

    const handMat = createPS1Material({ color: 0xFFCCAA });
    this.leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), handMat);
    this.leftHand.position.set(-0.3, 0.44, 0);
    this.add(this.leftHand);
    this.rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), handMat);
    this.rightHand.position.set(0.3, 0.44, 0);
    this.add(this.rightHand);

    const legMat = createPS1Material({ color: 0x2A2A35 });
    this.leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.12), legMat);
    this.leftLeg.position.set(-0.1, 0.15, 0);
    this.add(this.leftLeg);
    this.rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.12), legMat);
    this.rightLeg.position.set(0.1, 0.15, 0);
    this.add(this.rightLeg);

    const shoeMat = createPS1Material({ color: 0x1A1A1A });
    for (const sx of [-0.1, 0.1]) {
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.18), shoeMat);
      shoe.position.set(sx, 0.03, 0.03);
      this.add(shoe);
    }
  }

  _buildFace() {
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const eyeGeo = new THREE.BoxGeometry(0.05, 0.05, 0.02);
    for (const ex of [-0.07, 0.07]) {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(ex, 1.22, 0.155);
      this.add(eye);
      this.eyes.push(eye);
    }
    for (const ex of [-0.07, 0.07]) {
      const pupil = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.02, 0.01),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      pupil.position.set(ex + 0.012, 1.225, 0.166);
      this.add(pupil);
    }
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0x8B4513 });
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.015, 0.01), mouthMat);
    this.mouth = mouth;
    mouth.position.set(0, 1.13, 0.16);
    this.add(mouth);
  }

  _buildAccessories(acessorios, color) {
    const parsed = typeof acessorios === 'string' ? JSON.parse(acessorios) : acessorios;
    for (const acc of parsed) {
      switch (acc) {
        case 'oculos': {
          const glassMat = createPS1Material({ color: 0x222222 });
          for (const ex of [-0.07, 0.07]) {
            const lens = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.02), glassMat);
            lens.position.set(ex, 1.22, 0.17);
            this.add(lens);
          }
          const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.02), glassMat);
          bridge.position.set(0, 1.22, 0.17);
          this.add(bridge);
          break;
        }
        case 'gravata': {
          const tieMat = createPS1Material({ color: 0x1C3A5F });
          const tie = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.02), tieMat);
          tie.position.set(0, 0.78, 0.16);
          this.add(tie);
          const tipMat = createPS1Material({ color: 0x142A45 });
          const tip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.02), tipMat);
          tip.position.set(0, 0.64, 0.16);
          this.add(tip);
          break;
        }
        case 'cracha': {
          const crachaMat = createPS1Material({ color: 0xF5F0E8 });
          const cracha = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.02), crachaMat);
          cracha.position.set(-0.15, 0.82, 0.17);
          this.add(cracha);
          break;
        }
        case 'mochila': {
          const mochMat = createPS1Material({ color: 0x5A4A3A });
          const mochila = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.32, 0.14), mochMat);
          mochila.position.set(0, 0.68, -0.22);
          this.add(mochila);
          break;
        }
      }
    }
  }

  _buildNameLabel(name, isManager) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const ctx = c.getContext('2d');

    const bgColor = isManager ? 'rgba(45,90,61,0.9)' : 'rgba(170,102,0,0.9)';
    ctx.fillStyle = bgColor;
    ctx.fillRect(30, 12, 196, 40);

    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(name, 128, 40);

    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    this._nameTexture = tex; // keep ref for dispose()
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
    );
    sprite.scale.set(1.5, 0.38, 1);
    sprite.position.y = 1.65;
    sprite.renderOrder = 1;
    this.add(sprite);
    this._nameSprite = sprite;
  }

  dispose() {
    if (this._nameTexture) { this._nameTexture.dispose(); this._nameTexture = null; }
    if (this._nameSprite?.material) { this._nameSprite.material.dispose(); }
    if (this._subBadge?.material?.map) { this._subBadge.material.map.dispose(); this._subBadge.material.dispose(); }
    if (this._taskSprite?.material?.map) { this._taskSprite.material.map.dispose(); this._taskSprite.material.dispose(); }
    this.traverse(child => {
      if (child.isMesh) {
        child.geometry.dispose();
        if (child.material) child.material.dispose();
      }
    });
  }

  _buildStatusOrb() {
    const orb = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.1, 0.1),
      new THREE.MeshBasicMaterial({ color: COLORS.STATUS_IDLE })
    );
    orb.position.set(0.22, 1.55, 0);
    this.add(orb);
    this.statusOrb = orb;
  }

  // ── Public API ────────────────────────────

  startTalking() { this._talking = true; }
  stopTalking() { 
    this._talking = false; 
    if (this.mouth) this.mouth.scale.y = 1; 
  }

  setStatus(status) {
    this.status = status;
    this._idleTime = 0;
    this._eyesClosed = false;
    const colorMap = {
      [STATUS.IDLE]: COLORS.STATUS_IDLE,
      [STATUS.WORKING]: COLORS.STATUS_WORKING,
      [STATUS.DONE]: COLORS.STATUS_DONE,
      [STATUS.ERROR]: COLORS.STATUS_ERROR,
      [STATUS.WALKING]: COLORS.STATUS_WORKING,
      [STATUS_WORKING_SUB]: 0x50A0FF,
    };
    if (this.statusOrb) {
      this.statusOrb.material.color.setHex(colorMap[status] ?? COLORS.STATUS_IDLE);
    }
  }

  walkTo(targetPos, onArrive) {
    this.walkTarget = targetPos.clone();
    this.walkTarget.y = 0;
    this.isWalking = true;
    this._onArrive = onArrive;
    this.setStatus(STATUS.WALKING);
  }

  returnHome() {
    if (this.homePosition) {
      this.walkTo(this.homePosition, () => this.setStatus(STATUS.IDLE));
    }
  }

  // ── Update Loop ───────────────────────────

  update(time) {
    // Derive delta from elapsed time to drive spawn/despawn animations
    const delta = this._lastTime === null ? 0 : Math.min(time - this._lastTime, 0.1);
    this._lastTime = time;

    this._updateSpawn(delta);
    this._updateDespawn(delta);

    // Skip locomotion/animation when fully scaled down
    if (this._despawning && this._despawnProgress >= 1) return;

    this._updateLocomotion(time, delta);
    this._updateBlink();
  }

  // ── Private update methods ─────────────────

  _updateSpawn(delta) {
    if (!this._spawning) return;

    this._spawnProgress = Math.min(1, this._spawnProgress + delta * 2);
    const t = 1 - Math.pow(1 - this._spawnProgress, 3); // ease-out cubic
    const baseScale = this.isSubAgent ? 0.7 : 1.0;
    this.scale.set(t * baseScale, t * baseScale, t * baseScale);

    if (this._spawnProgress >= 1) this._spawning = false;
  }

  _updateDespawn(delta) {
    if (!this._despawning) return;

    this._despawnProgress = Math.min(1, this._despawnProgress + delta * 2.5);
    const t = Math.pow(1 - this._despawnProgress, 2); // ease-in
    const baseScale = this.isSubAgent ? 0.7 : 1.0;
    this.scale.set(t * baseScale, t * baseScale, t * baseScale);

    if (this._despawnProgress >= 1) {
      this._despawning = false;
      if (this._onDespawnComplete) this._onDespawnComplete();
    }
  }

  _updateLocomotion(time, delta) {
    if (this.isWalking && this.walkTarget) {
      this._updateWalking(time, delta);
      return;
    }

    if (this.status === STATUS_WORKING_SUB) {
      this._updateCircleWalk(time, delta);
      return;
    }

    this._updateIdleOrWorking(time, delta);
  }

  _updateWalking(time, delta) {
    const current = new THREE.Vector3(this.position.x, 0, this.position.z);
    const target = new THREE.Vector3(this.walkTarget.x, 0, this.walkTarget.z);
    const dir = target.clone().sub(current);
    const dist = dir.length();

    if (dist < 0.2) {
      this.isWalking = false;
      this.walkTarget = null;
      if (this._onArrive) this._onArrive();
      return;
    }

    dir.normalize();
    const step = Math.min(this.walkSpeed * 0.016, dist);
    this.position.x += dir.x * step;
    this.position.z += dir.z * step;

    const targetRotation = Math.atan2(dir.x, dir.z);
    this.rotation.y += (targetRotation - this.rotation.y) * 8 * 0.016;

    const t = time * 5;
    const walkFactor = Math.sin(t) > 0 ? 0.5 : -0.5;
    this.leftArm.rotation.x = walkFactor * 0.5;
    this.rightArm.rotation.x = -walkFactor * 0.5;
    this.leftLeg.rotation.x = -walkFactor * 0.4;
    this.rightLeg.rotation.x = walkFactor * 0.4;
    this.position.y = Math.abs(Math.sin(t * 1.2)) * 0.04;
  }

  _updateCircleWalk(time, delta) {
    if (!this.homePosition) return;

    const RADIUS = 0.6;
    const SPEED = 1.2; // radians per second

    this._circleAngle += delta * SPEED;

    this.position.x = this.homePosition.x + Math.cos(this._circleAngle) * RADIUS;
    this.position.z = this.homePosition.z + Math.sin(this._circleAngle) * RADIUS;
    this.position.y = Math.abs(Math.sin(time * 6)) * 0.03;

    // Face the direction of movement (tangent of circle)
    this.rotation.y = this._circleAngle + Math.PI / 2;

    // Snappy walk animation
    const t = time * 5;
    const walkFactor = Math.sin(t) > 0 ? 0.5 : -0.5;
    this.leftArm.rotation.x = walkFactor * 0.4;
    this.rightArm.rotation.x = -walkFactor * 0.4;
    this.leftLeg.rotation.x = -walkFactor * 0.35;
    this.rightLeg.rotation.x = walkFactor * 0.35;
  }

    _updateIdleOrWorking(time, delta) {
    const t = time;

    if (this.status === STATUS.WORKING) {
      if (this.head) {
        this.head.rotation.x = -0.12;
        this.head.position.y = 1.2;
      }
      const typeFrame = Math.floor(t * 8) % 2;
      this.leftArm.rotation.x = typeFrame === 0 ? -0.3 : -0.4;
      this.rightArm.rotation.x = typeFrame === 0 ? -0.4 : -0.3;
      this.leftArm.rotation.z = 0.1;
      this.rightArm.rotation.z = -0.1;

      // Animação de sentar
      this.position.y += (-0.28 - this.position.y) * 0.1;
      this.leftLeg.rotation.x += (-Math.PI/2.2 - this.leftLeg.rotation.x) * 0.1;
      this.rightLeg.rotation.x += (-Math.PI/2.2 - this.rightLeg.rotation.x) * 0.1;
      this.leftLeg.position.z += (0.25 - this.leftLeg.position.z) * 0.1;
      this.rightLeg.position.z += (0.25 - this.rightLeg.position.z) * 0.1;

      if (window.audioManager && !this.sfxEmitter) {
        this.sfxEmitter = window.audioManager.create3DEmitter(this, 'keyboard');
      }
      if (this.sfxEmitter && !this.sfxEmitter.isPlaying) {
        this.sfxEmitter.play();
      }
    } else {
      if (this.sfxEmitter && this.sfxEmitter.isPlaying) {
        this.sfxEmitter.stop();
      }
      if (this.head) {
        this.head.position.y = 1.2 + (Math.floor(t * 2) % 2 === 0 ? 0.01 : 0);
        this.head.rotation.x += (0 - this.head.rotation.x) * 0.15;
      }
      this.leftArm.rotation.x += (0 - this.leftArm.rotation.x) * 0.15;
      this.rightArm.rotation.x += (0 - this.rightArm.rotation.x) * 0.15;
      this.leftArm.rotation.z += (0 - this.leftArm.rotation.z) * 0.15;
      this.rightArm.rotation.z += (0 - this.rightArm.rotation.z) * 0.15;
      this.leftLeg.rotation.x += (0 - this.leftLeg.rotation.x) * 0.15;
      this.rightLeg.rotation.x += (0 - this.rightLeg.rotation.x) * 0.15;
      this.leftLeg.position.z += (0 - this.leftLeg.position.z) * 0.1;
      this.rightLeg.position.z += (0 - this.rightLeg.position.z) * 0.1;
      this.position.y += (0 - this.position.y) * 0.15;

      // Idle eyes closing
      if (this.status === STATUS.IDLE) {
        this._idleTime += delta;
        if (this._idleTime > 8) {
          this._eyesClosed = true;
        }
      }
    }

    // Talking animation
    if (this._talking && this.mouth) {
      const talkFrame = Math.floor(time * 12) % 3;
      this.mouth.scale.y = talkFrame === 0 ? 3 : talkFrame === 1 ? 1.5 : 1;
    }

    if (this.statusOrb) {
      this.statusOrb.rotation.y = Math.floor(t * 2) * 0.785;
    }
  }

  _updateBlink() {
    this.blinkTimer -= 0.016;
    if (this.blinkTimer <= 0) {
      for (const eye of this.eyes) eye.scale.y = 0.1;
      if (this.blinkTimer < -0.15) {
        for (const eye of this.eyes) eye.scale.y = 1.0;
        this.blinkTimer = Math.random() * 4 + 2;
      }
    }
  }
}

// ── Module-level helpers ───────────────────

function _lightenColor(hex, amount) {
  const r = Math.min(255, ((hex >> 16) & 0xFF) + Math.round(255 * amount));
  const g = Math.min(255, ((hex >> 8) & 0xFF) + Math.round(255 * amount));
  const b = Math.min(255, (hex & 0xFF) + Math.round(255 * amount));
  return (r << 16) | (g << 8) | b;
}

function _createTaskCanvas(text) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 40;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(30,80,200,0.88)';
  ctx.fillRect(4, 4, 248, 32);
  ctx.font = '13px monospace';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.fillText(text, 128, 24);
  return c;
}

function _createTaskSprite(text) {
  const c = _createTaskCanvas(text);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
  );
  sprite.scale.set(1.6, 0.25, 1);
  sprite._canvas = c;
  return sprite;
}

function _updateTaskSprite(sprite, text) {
  const c = _createTaskCanvas(text);
  if (sprite.material.map) sprite.material.map.dispose();
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  sprite.material.map = tex;
  sprite.material.needsUpdate = true;
  sprite._canvas = c;
}
