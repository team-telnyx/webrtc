import {
  isFunctionCallParams,
  isFunctionCallOutputParams,
  type AIConversationParams,
  type AIConversationFunctionCallParams,
  type AIConversationFunctionCallOutputParams,
} from '../../webrtc/AIConversationTypes';
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
  });

  describe('SwEvent.AIConversationMessage', () => {
    it('should have the correct event name', () => {
      expect(SwEvent.AIConversationMessage).toBe('telnyx.ai.conversation');
    });
  });
});
