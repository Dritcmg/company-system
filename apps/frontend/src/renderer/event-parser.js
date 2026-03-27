// ═══════════════════════════════════════════
//  event-parser.js — AgentEventPayload → visual status
//  Pure function, no side effects, no imports needed
// ═══════════════════════════════════════════

/**
 * @typedef {Object} ParsedAgentEvent
 * @property {string}      sessionKey
 * @property {'idle'|'thinking'|'tool_calling'|'speaking'|'error'} status
 * @property {string|null} speechText  — for thought bubble
 * @property {string|null} toolName    — tool being called
 * @property {boolean}     isEnd       — true when phase:"end" → caller resets to idle
 */

/**
 * Parse a raw AgentEventPayload from the backend event broadcast into
 * the minimal shape Agent3D needs to update its visual state.
 *
 * @param {object} payload — data.payload from a { type:"event", event:"agent" } frame
 * @returns {ParsedAgentEvent}
 */
export function parseAgentEvent(payload) {
  const { sessionKey = '', stream = '', data = {} } = payload;
  const phase = data.phase ?? '';

  // Defaults
  let status = 'idle';
  let speechText = null;
  let toolName = null;
  let isEnd = false;

  switch (stream) {
    case 'lifecycle':
      if (phase === 'end') {
        status = 'idle';
        isEnd = true;
      } else {
        // 'start', 'thinking', or any other lifecycle phase
        status = 'thinking';
      }
      break;

    case 'tool':
      status = 'tool_calling';
      toolName = data.name ?? null;
      break;

    case 'assistant':
      status = 'speaking';
      speechText = data.text ?? null;
      break;

    case 'error':
      status = 'error';
      break;

    default:
      status = 'idle';
  }

  return { sessionKey, status, speechText, toolName, isEnd };
}
