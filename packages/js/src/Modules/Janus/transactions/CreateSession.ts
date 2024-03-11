import { Janus } from '../messages/janus';
import { JanusResponse } from '../messages/response';
import { BaseTransaction } from './BaseTransaction';

export class CreateSessionTransaction extends BaseTransaction<{
  sessionId: number;
}> {
  constructor() {
    super({ janus: Janus.create });
  }
  public onMessage(message: JanusResponse): void {
    if (message.janus === 'success') {
      this._resolve({ sessionId: message.data.id });
    } else {
      this._reject(new Error('Failed to create session.'));
    }
  }
}
