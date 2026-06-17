import BaseMessage from '../BaseMessage';
import type { FunctionCallOutputItem } from '../../webrtc/AIConversationTypes';

/**
 * Outbound ai_conversation JSON-RPC message.
 *
 * Used to send `function_call_output` items back to the backend
 * after a client-side tool has been executed.
 *
 * Wire format (PR-531):
 * ```json
 * {
 *   "jsonrpc": "2.0",
 *   "method": "ai_conversation",
 *   "params": {
 *     "type": "conversation.item.create",
 *     "item": {
 *       "type": "function_call_output",
 *       "call_id": "...",
 *       "output": "..."
 *     }
 *   }
 * }
 * ```
 */
class AIConversationMessage extends BaseMessage {
  constructor(item: FunctionCallOutputItem) {
    super();
    this.method = 'ai_conversation';

    this.buildRequest({
      method: this.method,
      params: {
        type: 'conversation.item.create',
        item,
      },
    });
  }
}

export { AIConversationMessage };
