import BaseMessage from '../BaseMessage';
import { v4 as uuid } from 'uuid';

class ConversationMessage extends BaseMessage {
  constructor(message: string) {
    super();
    this.method = 'ai_conversation';

    this.buildRequest({
      method: this.method,
      params: {
        type: 'conversation.item.create',
        previous_item_id: null,
        item: {
          id: uuid(),
          type: 'message',
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: message,
            },
          ],
        },
      },
    });
  }
}

export { ConversationMessage };
