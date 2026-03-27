// ═══════════════════════════════════════════
//  OPEN TYCOON — Intern Agent (3D)
//  Extends Agent3D with orange theme
// ═══════════════════════════════════════════

import { Agent3D } from './Agent3D.js';

export class Intern extends Agent3D {
  constructor(data) {
    super(data);
    this.agentType = 'intern';
  }
}
