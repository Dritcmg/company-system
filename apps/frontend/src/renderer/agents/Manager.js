// ═══════════════════════════════════════════
//  OPEN TYCOON — Manager Agent (3D)
//  Extends Agent3D with green theme
// ═══════════════════════════════════════════

import { Agent3D } from './Agent3D.js';

export class Manager extends Agent3D {
  constructor(data) {
    super(data);
    this.agentType = 'manager';
  }
}
