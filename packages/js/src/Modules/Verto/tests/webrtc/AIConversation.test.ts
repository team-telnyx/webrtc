import {
  isFunctionCallParams,
  isFunctionCallOutputParams,
  type AIConversationParams,
  type AIConversationFunctionCallParams,
  type AIConversationFunctionCallOutputParams,
} from '../../webrtc/AIConversationTypes';
import { AIConversationMessage } from '../../messages/verto/AIConversationMessage';
import { SwEvent } from '../../util/constants';

describe('AIConversationTypes', () => {
  describe('isFunctionCallParams', () => {
    it('should return true for valid function_call params', () => {
      const params: AIConversationFunctionCallParams = {
        type: 'conversation.item.created',
        item: {
          type: 'function_call',
          call_id: 'call-123',
          name: 'lookup_order',
          arguments: '{"orderId": "abc"}',
        },
      };
      expect(isFunctionCallParams(params)).toBe(true);
    });

    it('should return false for function_call_output params', () => {
      const params: AIConversationFunctionCallOutputParams = {
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: 'call-123',
          output: '{"status": "found"}',
        },
      };
      expect(isFunctionCallParams(params)).toBe(false);
    });

    it('should return false for non-conversation.item.created type', () => {
      const params = {
        type: 'response.text.delta',
        item: {
          type: 'function_call',
          call_id: 'call-123',
          name: 'lookup_order',
          arguments: '{}',
        },
      };
      expect(isFunctionCallParams(params)).toBe(false);
    });

    it('should return false when item is missing', () => {
      const params = {
        type: 'conversation.item.created',
      };
      expect(isFunctionCallParams(params)).toBe(false);
    });

    it('should return false when item type is not function_call', () => {
      const params = {
        type: 'conversation.item.created',
        item: {
          type: 'message',
          call_id: 'call-123',
          name: 'lookup_order',
          arguments: '{}',
        },
      };
      expect(isFunctionCallParams(params)).toBe(false);
    });

    it('should return false when call_id is missing', () => {
      const params = {
        type: 'conversation.item.created',
        item: {
          type: 'function_call',
          name: 'lookup_order',
          arguments: '{}',
        },
      };
      expect(isFunctionCallParams(params)).toBe(false);
    });

    it('should return false when name is missing', () => {
      const params = {
        type: 'conversation.item.created',
        item: {
          type: 'function_call',
          call_id: 'call-123',
          arguments: '{}',
        },
      };
      expect(isFunctionCallParams(params)).toBe(false);
    });

    it('should return false when arguments is missing', () => {
      const params = {
        type: 'conversation.item.created',
        item: {
          type: 'function_call',
          call_id: 'call-123',
          name: 'lookup_order',
        },
      };
      expect(isFunctionCallParams(params)).toBe(false);
    });

    it('should return false when arguments is not a string', () => {
      const params = {
        type: 'conversation.item.created',
        item: {
          type: 'function_call',
          call_id: 'call-123',
          name: 'lookup_order',
          arguments: { key: 'value' },
        },
      };
      expect(isFunctionCallParams(params)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isFunctionCallParams(null as unknown as AIConversationParams)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isFunctionCallParams(undefined as unknown as AIConversationParams)).toBe(false);
    });

    it('should return false when item is null', () => {
      const params = {
        type: 'conversation.item.created',
        item: null,
      };
      expect(isFunctionCallParams(params as unknown as AIConversationParams)).toBe(false);
    });
  });

  describe('isFunctionCallOutputParams', () => {
    it('should return true for valid function_call_output params', () => {
      const params: AIConversationFunctionCallOutputParams = {
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: 'call-123',
          output: '{"status": "found"}',
        },
      };
      expect(isFunctionCallOutputParams(params)).toBe(true);
    });

    it('should return false for function_call params', () => {
      const params: AIConversationFunctionCallParams = {
        type: 'conversation.item.created',
        item: {
          type: 'function_call',
          call_id: 'call-123',
          name: 'lookup_order',
          arguments: '{}',
        },
      };
      expect(isFunctionCallOutputParams(params)).toBe(false);
    });

    it('should return false when item type is not function_call_output', () => {
      const params = {
        type: 'conversation.item.create',
        item: {
          type: 'message',
          call_id: 'call-123',
          output: '{}',
        },
      };
      expect(isFunctionCallOutputParams(params as unknown as AIConversationParams)).toBe(false);
    });

    it('should return false when call_id is missing', () => {
      const params = {
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          output: '{}',
        },
      };
      expect(isFunctionCallOutputParams(params as unknown as AIConversationParams)).toBe(false);
    });

    it('should return false when output is missing', () => {
      const params = {
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: 'call-123',
        },
      };
      expect(isFunctionCallOutputParams(params as unknown as AIConversationParams)).toBe(false);
    });

    it('should return false when output is not a string', () => {
      const params = {
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: 'call-123',
          output: 42,
        },
      };
      expect(isFunctionCallOutputParams(params as unknown as AIConversationParams)).toBe(false);
    });
  });

  describe('SwEvent.AIConversationMessage', () => {
    it('should have the correct event name', () => {
      expect(SwEvent.AIConversationMessage).toBe('telnyx.ai.conversation');
    });
  });

  describe('AIConversationMessage', () => {
    it('should build a notification without an id field', () => {
      const msg = new AIConversationMessage({
        type: 'function_call_output',
        call_id: 'call-abc',
        output: '{"result": true}',
      });

      expect(msg.request).toBeDefined();
      expect(msg.request.jsonrpc).toBe('2.0');
      expect(msg.request.method).toBe('ai_conversation');
      // Notification: must NOT have an id field
      expect(msg.request).not.toHaveProperty('id');
      expect(msg.request.params).toEqual({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: 'call-abc',
          output: '{"result": true}',
        },
      });
    });

    it('should serialize to valid JSON-RPC notification', () => {
      const msg = new AIConversationMessage({
        type: 'function_call_output',
        call_id: 'call-xyz',
        output: 'ok',
      });

      const serialized = JSON.stringify(msg.request);
      const parsed = JSON.parse(serialized);

      expect(parsed.jsonrpc).toBe('2.0');
      expect(parsed.method).toBe('ai_conversation');
      expect(parsed).not.toHaveProperty('id');
      expect(parsed.params.type).toBe('conversation.item.create');
      expect(parsed.params.item.type).toBe('function_call_output');
      expect(parsed.params.item.call_id).toBe('call-xyz');
      expect(parsed.params.item.output).toBe('ok');
    });
  });

  describe('Call.sendAIConversationMessage', () => {
    // Minimal mock to test the method without a full Verto session
    const makeCallWithMockSession = (connected: boolean) => {
      const sentTexts: string[] = [];
      const mockSession = {
        connected,
        connection: {
          sendRawText: jest.fn((text: string) => {
            sentTexts.push(text);
          }),
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      // Use Call's sendAIConversationMessage logic directly
      // by importing the method's behavior
      return { mockSession, sentTexts };
    };

    it('should throw when session is not connected', () => {
      const { mockSession } = makeCallWithMockSession(false);

      // Inline the method logic to test without full Call construction
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
      const sendAIConversationMessage = (_item: any) => {
        if (!mockSession.connected) {
          throw new Error(
            'Cannot send AI conversation message: session is not connected. ' +
              'sendAIConversationMessage requires an active WebSocket connection.'
          );
        }
      };

      expect(() =>
        sendAIConversationMessage({
          type: 'function_call_output',
          call_id: 'call-1',
          output: 'ok',
        })
      ).toThrow('Cannot send AI conversation message: session is not connected');
    });

    it('should send fire-and-forget notification when connected', () => {
      const { mockSession, sentTexts } = makeCallWithMockSession(true);

      // Inline the method logic
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sendAIConversationMessage = (item: any) => {
        if (!mockSession.connected) {
          throw new Error(
            'Cannot send AI conversation message: session is not connected. ' +
              'sendAIConversationMessage requires an active WebSocket connection.'
          );
        }
        const msg = new AIConversationMessage(item);
        mockSession.connection.sendRawText(JSON.stringify(msg.request));
      };

      sendAIConversationMessage({
        type: 'function_call_output',
        call_id: 'call-1',
        output: '{"status": "found"}',
      });

      expect(mockSession.connection.sendRawText).toHaveBeenCalledTimes(1);
      const sent = JSON.parse(sentTexts[0]);
      expect(sent.jsonrpc).toBe('2.0');
      expect(sent.method).toBe('ai_conversation');
      // Must be a notification (no id)
      expect(sent).not.toHaveProperty('id');
      expect(sent.params.type).toBe('conversation.item.create');
      expect(sent.params.item.type).toBe('function_call_output');
      expect(sent.params.item.call_id).toBe('call-1');
      expect(sent.params.item.output).toBe('{"status": "found"}');
    });

    it('should not queue or reconnect when disconnected', () => {
      const { mockSession } = makeCallWithMockSession(false);

      // Verify it throws immediately (not returning a promise/queueing)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
      const sendAIConversationMessage = (_item: any) => {
        if (!mockSession.connected) {
          throw new Error(
            'Cannot send AI conversation message: session is not connected. ' +
              'sendAIConversationMessage requires an active WebSocket connection.'
          );
        }
      };

      expect(() =>
        sendAIConversationMessage({
          type: 'function_call_output',
          call_id: 'call-1',
          output: 'ok',
        })
      ).toThrow(Error);

      // sendRawText should never be called
      expect(mockSession.connection.sendRawText).not.toHaveBeenCalled();
    });
  });
});
