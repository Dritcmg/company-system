// ═══════════════════════════════════════════
//  OPEN TYCOON — Player Character (CEO)
//  First-Person View (FPV) & Interaction
// ═══════════════════════════════════════════

import * as THREE from 'three';
import { COLORS, PLAYER, OFFICE } from '../../shared/constants.js';

export class Player extends THREE.Group {
  constructor() {
    super();
    this.name = 'player';
    this.isPlayer = true;

    // Movement state
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.isRunning = false;
    
    // FPV rotation
    this.yaw = 0; // horizontal
    this.pitch = 0; // vertical
    
    // Setup body (hidden in FPV, but keeps collisions/position clear)
    this._buildBody();
    
    this._setupControls();
  }

  _buildBody() {
    // We create a dummy body just for debug if needed, but it's hidden in FPV.
    const bodyMat = new THREE.MeshBasicMaterial({ color: COLORS.CEO_COLOR });
    this.bodyMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.8), bodyMat);
    this.bodyMesh.position.y = 0.9;
    this.bodyMesh.visible = false; // CEO is invisible to himself
    this.add(this.bodyMesh);
  }

  _setupControls() {
    const onKeyDown = (e) => {
      // Ignore if typing in an input
      const ae = document.activeElement;
      if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) return;

      switch (e.code) {
        case 'KeyW': case 'ArrowUp': this.moveForward = true; break;
        case 'KeyS': case 'ArrowDown': this.moveBackward = true; break;
        case 'KeyA': case 'ArrowLeft': this.moveLeft = true; break;
        case 'KeyD': case 'ArrowRight': this.moveRight = true; break;
        case 'ShiftLeft': this.isRunning = true; break;
      }
    };
    const onKeyUp = (e) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': this.moveForward = false; break;
        case 'KeyS': case 'ArrowDown': this.moveBackward = false; break;
        case 'KeyA': case 'ArrowLeft': this.moveLeft = false; break;
        case 'KeyD': case 'ArrowRight': this.moveRight = false; break;
        case 'ShiftLeft': this.isRunning = false; break;
      }
    };
    
    const onMouseMove = (e) => {
      if (document.pointerLockElement === document.body) {
        const movementX = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
        const movementY = e.movementY || e.mozMovementY || e.webkitMovementY || 0;
        
        const sensitivity = 0.002;
        this.yaw -= movementX * sensitivity;
        this.pitch -= movementY * sensitivity;
        
        // Clamp pitch to avoid neck-snapping (looking too far up or down)
        this.pitch = Math.max(-Math.PI/2.1, Math.min(Math.PI/2.1, this.pitch));
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousemove', onMouseMove);
  }

  update(delta, camera) {
    const speed = this.isRunning ? PLAYER.RUN_SPEED * 1.5 : PLAYER.SPEED * 1.2;

    this.direction.set(0, 0, 0);
    // Relative directions (-Z is forward in Three.js)
    if (this.moveForward) this.direction.z = -1;
    if (this.moveBackward) this.direction.z = 1;
    if (this.moveLeft) this.direction.x = -1;
    if (this.moveRight) this.direction.x = 1;
    
    this.direction.normalize();

    // Map WASD to actual world space using current Yaw
    const prevX = this.position.x;
    const prevZ = this.position.z;

    if (this.direction.lengthSq() > 0) {
      // Move speed vector
      const moveVec = new THREE.Vector3(this.direction.x, 0, this.direction.z);
      // apply yaw rotation (yaw is around Y axis)
      moveVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

      this.position.x += moveVec.x * speed * delta;
      this.position.z += moveVec.z * speed * delta;
      
      // Minimal head bobbing while walking
      const t = performance.now() * 0.015;
      this.position.y = Math.sin(t) * 0.06;
    } else {
      // Calm down bob
      this.position.y *= 0.8;
    }

    // Exterior bounds
    const bound = OFFICE.FLOOR_SIZE / 2 - 1.0;
    this.position.x = Math.max(-bound, Math.min(bound, this.position.x));
    this.position.z = Math.max(-bound, Math.min(bound, this.position.z));

    // Interior wall collision
    const px = this.position.x;
    const pz = this.position.z;

    // CEO divider at x = -4 (door gap: z = 4.5 to 7.0)
    const crossedCEO = (prevX > -4 && px < -4) || (prevX < -4 && px > -4);
    if (crossedCEO) {
      const inCEODoor = pz >= 4.3 && pz <= 7.2;
      if (!inCEODoor) this.position.x = prevX;
    }

    // Meeting wall at z = -3 (door gap: x = -3 to 6)
    const crossedMeeting = (prevZ > -3 && pz < -3) || (prevZ < -3 && pz > -3);
    if (crossedMeeting) {
      const inMeetDoor = px >= -3.2 && px <= 6.2;
      if (!inMeetDoor) this.position.z = prevZ;
    }

    // Lock camera into CEO's head (FPV)
    if (camera) {
      // Height = ~1.65 (eye level) + bobbing
      camera.position.set(this.position.x, 1.65 + this.position.y, this.position.z);
      
      // Apply rotation (Euler order YXZ: Yaw then Pitch)
      camera.rotation.set(0, 0, 0); // reset
      camera.rotation.order = 'YXZ';
      camera.rotation.y = this.yaw;
      camera.rotation.x = this.pitch;
    }
  }

  // Look directly ahead in FPV to interact with objects using raycast
  getFpvInteractables(raycaster, interactableMeshes) {
    if (!interactableMeshes || interactableMeshes.length === 0) return [];
    
    // Raycaster is updated outside (in main.js using camera)
    const intersects = raycaster.intersectObjects(interactableMeshes, false);
    
    // Filter out anything too far (e.g. max 4 units interaction)
    return intersects.filter(hit => hit.distance <= 4.0);
  }
}
