// ═══════════════════════════════════════════
//  GatewayRpcClient — promise-based RPC over WebSocket
//  Matches protocol: { type:"req"|"res", id, method, params, ok, payload }
// ═══════════════════════════════════════════

const RPC_TIMEOUT_MS = 10_000;

export class GatewayRpcClient {
  /** @param {WebSocket} ws — the live WebSocket instance from main.js */
  constructor(ws) {
    this._ws = ws;
    /** @type {Map<string, (data: object) => void>} */
    this._pending = new Map();
  }

  /**
   * Send a request and wait for the matching response.
   * @param {string} method
   * @param {object} params
   * @returns {Promise<object>} resolves with payload on ok:true, rejects otherwise
   */
  async request(method, params = {}) {
    const id = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this._pending.delete(id);
        reject(new Error(`RPC timeout: ${method} (${RPC_TIMEOUT_MS}ms)`));
      }, RPC_TIMEOUT_MS);

      this._pending.set(id, (data) => {
        clearTimeout(timer);
        this._pending.delete(id);
        if (data.ok) {
          resolve(data.payload);
        } else {
          reject(new Error(data.error || `RPC error: ${method}`));
        }
      });

      this._ws.send(JSON.stringify({ type: 'req', id, method, params }));
    });
  }

  /**
   * Called by onmessage handler in main.js when a "res" frame arrives.
   * Resolves the pending promise for the given id.
   * @param {string} id
   * @param {object} data — the full parsed response frame
   */
  onResponse(id, data) {
    const handler = this._pending.get(id);
    if (handler) handler(data);
  }

  /** Remove a pending handler by id (cleanup helper). */
  offResponse(id) {
    this._pending.delete(id);
  }
}
