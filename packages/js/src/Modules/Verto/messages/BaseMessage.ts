import { v4 as uuidv4 } from 'uuid';

abstract class BaseMessage {
  protected method: string;
  public request: any;
  public response: any;
  public targetNodeId: string;

  buildRequest(params: any) {
    this.request = { ...{ jsonrpc: '2.0', id: uuidv4() }, ...params };
  }

  /**
   * Build a JSON-RPC notification (no `id`). Notifications are
   * fire-and-forget — the server is not expected to send a response,
   * and no one-shot handler is registered for them.
   */
  buildNotification(params: any) {
    this.request = { ...{ jsonrpc: '2.0' }, ...params };
  }
}

export default BaseMessage;
