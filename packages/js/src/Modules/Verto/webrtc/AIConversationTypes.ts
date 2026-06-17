/**
 * Types for AI conversation signaling over the VSP WebSocket.
 *
 * These types support the PR-531 client-side tool wire protocol:
 * - Inbound: `conversation.item.created` with `item.type = "function_call"`
 * - Outbound: `conversation.item.create` with `item.type = "function_call_output"`
 */

/**
 * An inbound function_call item from the backend (ACA).
 * Represents a request to execute a client-side tool.
 */
export type FunctionCallItem = {
  type: 'function_call';
  /** Unique identifier for this function call. Used to correlate with function_call_output. */
  call_id: string;
  /** Name of the client-side tool to execute. */
  name: string;
  /** JSON-encoded string of the tool arguments. */
  arguments: string;
};

/**
 * An outbound function_call_output item to send to the backend.
 * Represents the result of executing a client-side tool.
 */
export type FunctionCallOutputItem = {
  type: 'function_call_output';
  /** Must match the call_id of the corresponding function_call. */
  call_id: string;
  /** The output/result of the tool execution (typically a JSON-encoded string). */
  output: string;
};

/**
 * Params for an inbound `ai_conversation` message with `params.type = "conversation.item.created"`.
 * Contains a function_call item from the backend.
 */
export type AIConversationFunctionCallParams = {
  type: 'conversation.item.created';
  item: FunctionCallItem;
};

/**
 * Params for an outbound `ai_conversation` message with `params.type = "conversation.item.create"`.
 * Contains a function_call_output item to send back to the backend.
 */
export type AIConversationFunctionCallOutputParams = {
  type: 'conversation.item.create';
  item: FunctionCallOutputItem;
};

/**
 * Generic params for any `ai_conversation` message.
 * Can be a function_call (inbound) or function_call_output (outbound),
 * as well as other `ai_conversation` message types (transcript, etc.).
 */
export type AIConversationParams =
  | AIConversationFunctionCallParams
  | AIConversationFunctionCallOutputParams
  | {
      type: string;
      [key: string]: unknown;
    };

/**
 * Event payload emitted on `SwEvent.AIConversationMessage`.
 * Represents an inbound `ai_conversation` JSON-RPC message from the backend.
 */
export type IAIConversationMessageEvent = {
  /** The method of the JSON-RPC message (always "ai_conversation"). */
  method: 'ai_conversation';
  /** The params of the ai_conversation message. */
  params: AIConversationParams;
  /** Voice SDK ID for correlation, if present. */
  voice_sdk_id?: string;
};

/**
 * Options for `sendAIConversationMessage()`.
 * Used to send a `function_call_output` back to the backend.
 */
export type ISendAIConversationMessageOptions = {
  /** The function call output to send. */
  item: FunctionCallOutputItem;
};

/**
 * Type guard: checks if an `ai_conversation` message contains a `function_call` item.
 */
export function isFunctionCallParams(
  params: AIConversationParams
): params is AIConversationFunctionCallParams {
  if (!params || typeof params !== 'object') {
    return false;
  }
  if (params.type !== 'conversation.item.created') {
    return false;
  }
  const record = params as Record<string, unknown>;
  const item = record['item'];
  if (typeof item !== 'object' || item === null) {
    return false;
  }
  const itemRec = item as Record<string, unknown>;
  return (
    itemRec['type'] === 'function_call' &&
    typeof itemRec['call_id'] === 'string' &&
    typeof itemRec['name'] === 'string' &&
    typeof itemRec['arguments'] === 'string'
  );
}

/**
 * Type guard: checks if an `ai_conversation` message contains a `function_call_output` item.
 */
export function isFunctionCallOutputParams(
  params: AIConversationParams
): params is AIConversationFunctionCallOutputParams {
  if (!params || typeof params !== 'object') {
    return false;
  }
  if (params.type !== 'conversation.item.create') {
    return false;
  }
  const record = params as Record<string, unknown>;
  const item = record['item'];
  if (typeof item !== 'object' || item === null) {
    return false;
  }
  const itemRec = item as Record<string, unknown>;
  return (
    itemRec['type'] === 'function_call_output' &&
    typeof itemRec['call_id'] === 'string' &&
    typeof itemRec['output'] === 'string'
  );
}
