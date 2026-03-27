// ═══════════════════════════════════════════
//  SubAgentPoller — polls sessions.list every 3 s
//  Detects sub-agent spawn/despawn and fires callbacks
// ═══════════════════════════════════════════

const POLL_INTERVAL_MS = 3_000;

// sessionKey pattern: "agent:<name>:subagent:<uuid>"
const SUB_AGENT_RE = /^agent:[^:]+:subagent:(.+)$/;

/**
 * @typedef {Object} SubAgentInfo
 * @property {string} sessionKey      — e.g. "agent:wallace:subagent:uuid-1"
 * @property {string} agentId         — UUID extracted after ":subagent:"
 * @property {string} label           — display label
 * @property {string} task            — task description
 * @property {string} parentSessionKey
 * @property {number} startedAt       — unix timestamp ms
 */

export class SubAgentPoller {
  /** @param {import('./gateway-rpc-client.js').GatewayRpcClient} rpcClient */
  constructor(rpcClient) {
    this._rpc = rpcClient;
    this._timer = null;
    /** @type {Map<string, SubAgentInfo>} sessionKey → info */
    this._known = new Map();
    this._onSpawned = null;
    this._onDespawned = null;
  }

  /** Start polling. */
  start() {
    if (this._timer !== null) return;
    this._poll();
    this._timer = setInterval(() => this._poll(), POLL_INTERVAL_MS);
  }

  /** Stop polling. */
  stop() {
    if (this._timer !== null) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  /**
   * Register callback for new sub-agent.
   * @param {(info: SubAgentInfo) => void} callback
   */
  onSubAgentSpawned(callback) {
    this._onSpawned = callback;
  }

  /**
   * Register callback for removed sub-agent.
   * @param {(agentId: string) => void} callback
   */
  onSubAgentDespawned(callback) {
    this._onDespawned = callback;
  }

  // ── Private ──────────────────────────────

  async _poll() {
    try {
      const payload = await this._rpc.request('sessions.list', {});
      const sessions = payload?.sessions ?? [];
      this._diff(sessions);
    } catch {
      // Silent — backend may not be up yet
    }
  }

  /**
   * Compare fresh session list against known sub-agents.
   * @param {Array<object>} sessions
   */
  _diff(sessions) {
    const current = new Map();

    for (const session of sessions) {
      const key = session.sessionKey ?? session.key ?? '';
      const match = SUB_AGENT_RE.exec(key);
      if (!match) continue;

      const agentId = match[1];
      /** @type {SubAgentInfo} */
      const info = {
        sessionKey: key,
        agentId,
        label: session.label ?? 'Trabalhando...',
        task: session.task ?? '',
        parentSessionKey: session.parentSessionKey ?? '',
        startedAt: session.startedAt ?? Date.now(),
      };
      current.set(key, info);
    }

    // Added
    for (const [key, info] of current) {
      if (!this._known.has(key) && this._onSpawned) {
        this._onSpawned(info);
      }
    }

    // Removed
    for (const [key, info] of this._known) {
      if (!current.has(key) && this._onDespawned) {
        this._onDespawned(info.agentId);
      }
    }

    this._known = current;
  }
}
