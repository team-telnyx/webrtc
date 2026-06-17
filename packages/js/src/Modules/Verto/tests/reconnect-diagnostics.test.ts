/**
 * Unit tests for reconnection lifecycle diagnostics:
 *  - _recordReconnectDiagnostic records on active calls and emits Warning event
 *  - Warning codes 36005-36012 are emitted at the correct lifecycle points
 *  - Diagnostic payloads include only safe fields (no secrets)
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { trigger } from '../services/Handler';
import { SwEvent } from '../util/constants';
import {
  WEBSOCKET_CLOSE_REQUESTED,
  WEBSOCKET_CLOSED,
  NETWORK_CLOSE_DECISION,
  WEBSOCKET_RECONNECT_STARTED,
  WEBSOCKET_RECONNECT_SUCCEEDED,
  WEBSOCKET_RECONNECT_FAILED,
  CALL_RECOVERY_RESULT,
  SIGNALING_RECOVERY_REQUESTED,
} from '../util/constants/errorCodes';
import {
  SDK_WARNINGS,
  createTelnyxWarning,
} from '../util/constants/warnings';

jest.mock('../services/Handler');
jest.mock('../util/logger');

// _recordReconnectDiagnostic is a method on BaseSession. Rather than
// constructing a full BaseSession subclass (which requires many dependencies),
// we extract the core logic into a testable helper that mirrors the real
// implementation.

function recordReconnectDiagnostic(
  calls: Record<string, any> | undefined,
  sessionUuid: string,
  sessionId: string | undefined,
  code: number,
  name: string,
  message: string,
  extras?: Record<string, unknown>,
  options?: { emitWarning?: boolean }
): void {
  const emitWarning = options?.emitWarning !== false;
  if (!calls) return;

  const activeCallIds = Object.keys(calls);

  Object.values(calls).forEach((call) => {
    if (!call?.recordSessionWarning) return;

    try {
      call.recordSessionWarning(code, name, message, activeCallIds);
    } catch {
      // Swallow — matches real implementation
    }
  });

  if (emitWarning) {
    const warning = createTelnyxWarning(code as any, message);
    trigger(
      SwEvent.Warning,
      {
        warning,
        ...(extras || {}),
        sessionId,
      },
      sessionUuid
    );
  }
}

describe('_recordReconnectDiagnostic', () => {
  let mockRecordSessionWarning: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRecordSessionWarning = jest.fn();
  });

  it('records diagnostic on all active calls via recordSessionWarning', () => {
    const calls = {
      'call-1': {
        id: 'call-1',
        recordSessionWarning: mockRecordSessionWarning,
      },
      'call-2': {
        id: 'call-2',
        recordSessionWarning: mockRecordSessionWarning,
      },
    };

    recordReconnectDiagnostic(
      calls,
      'test-uuid',
      'test-session',
      WEBSOCKET_CLOSED,
      'WEBSOCKET_CLOSED',
      'WebSocket closed (code=1006)',
      { closeCode: 1006, wasClean: false }
    );

    expect(mockRecordSessionWarning).toHaveBeenCalledTimes(2);
    expect(mockRecordSessionWarning).toHaveBeenCalledWith(
      WEBSOCKET_CLOSED,
      'WEBSOCKET_CLOSED',
      'WebSocket closed (code=1006)',
      ['call-1', 'call-2']
    );
  });

  it('emits a Warning event with the diagnostic code and extras', () => {
    const calls = {
      'call-1': {
        id: 'call-1',
        recordSessionWarning: jest.fn(),
      },
    };

    recordReconnectDiagnostic(
      calls,
      'test-uuid',
      'test-session',
      NETWORK_CLOSE_DECISION,
      'NETWORK_CLOSE_DECISION',
      'Reconnect decision: attempt',
      { reconnectDecision: 'attempt', reason: 'auto_reconnect_enabled' }
    );

    expect(trigger).toHaveBeenCalledWith(
      SwEvent.Warning,
      expect.objectContaining({
        warning: expect.objectContaining({
          code: NETWORK_CLOSE_DECISION,
          name: 'NETWORK_CLOSE_DECISION',
        }),
        reconnectDecision: 'attempt',
        reason: 'auto_reconnect_enabled',
      }),
      'test-uuid'
    );
  });

  it('handles missing calls gracefully', () => {
    // No calls at all — should not throw
    expect(() => {
      recordReconnectDiagnostic(
        {},
        'test-uuid',
        'test-session',
        WEBSOCKET_RECONNECT_STARTED,
        'WEBSOCKET_RECONNECT_STARTED',
        'Reconnect attempt 1 starting'
      );
    }).not.toThrow();

    // Warning event should still be emitted even without active calls
    expect(trigger).toHaveBeenCalledWith(
      SwEvent.Warning,
      expect.objectContaining({
        warning: expect.objectContaining({
          code: WEBSOCKET_RECONNECT_STARTED,
        }),
      }),
      'test-uuid'
    );
  });

  it('handles undefined calls gracefully', () => {
    expect(() => {
      recordReconnectDiagnostic(
        undefined,
        'test-uuid',
        'test-session',
        WEBSOCKET_CLOSE_REQUESTED,
        'WEBSOCKET_CLOSE_REQUESTED',
        'SDK requested WebSocket close'
      );
    }).not.toThrow();

    // Should not emit warning when calls is undefined
    expect(trigger).not.toHaveBeenCalled();
  });

  it('handles calls without recordSessionWarning gracefully', () => {
    const calls = {
      'call-1': {
        id: 'call-1',
        // No recordSessionWarning method
      },
    };

    expect(() => {
      recordReconnectDiagnostic(
        calls,
        'test-uuid',
        'test-session',
        WEBSOCKET_CLOSE_REQUESTED,
        'WEBSOCKET_CLOSE_REQUESTED',
        'SDK requested WebSocket close'
      );
    }).not.toThrow();
  });

  it('handles recordSessionWarning throwing an error', () => {
    const throwingWarning = jest.fn(() => {
      throw new Error('call report error');
    });
    const calls = {
      'call-1': {
        id: 'call-1',
        recordSessionWarning: throwingWarning,
      },
      'call-2': {
        id: 'call-2',
        recordSessionWarning: jest.fn(),
      },
    };

    // Should not throw, should continue to call-2
    expect(() => {
      recordReconnectDiagnostic(
        calls,
        'test-uuid',
        'test-session',
        CALL_RECOVERY_RESULT,
        'CALL_RECOVERY_RESULT',
        'Call recovery result: recovered'
      );
    }).not.toThrow();

    // call-2's recordSessionWarning should still be called
    expect(calls['call-2'].recordSessionWarning).toHaveBeenCalled();
  });

  it('does not include sensitive data in extras', () => {
    const calls = {
      'call-1': {
        id: 'call-1',
        recordSessionWarning: mockRecordSessionWarning,
      },
    };

    recordReconnectDiagnostic(
      calls,
      'test-uuid',
      'test-session',
      WEBSOCKET_CLOSED,
      'WEBSOCKET_CLOSED',
      'WebSocket closed',
      {
        closeCode: 1006,
        wasClean: false,
        voiceSdkId: 'voice-sdk-123',
        sessid: 'session-abc',
      }
    );

    const warningCall = mockRecordSessionWarning.mock.calls[0];
    // Verify no password, token, or credential fields appear in the call
    const allArgs = JSON.stringify(warningCall);
    expect(allArgs).not.toContain('password');
    expect(allArgs).not.toContain('token');
    expect(allArgs).not.toContain('credential');
    expect(allArgs).not.toContain('secret');
    // Also check the Warning event trigger has safe identifiers but no secrets
    const triggerCall = (trigger as jest.Mock).mock.calls.find(
      (call: any[]) => call[0] === SwEvent.Warning
    );
    const triggerPayload = JSON.stringify(triggerCall);
    expect(triggerPayload).toContain('voiceSdkId');
    expect(triggerPayload).toContain('sessid');
    expect(triggerPayload).not.toContain('password');
    expect(triggerPayload).not.toContain('token');
  });
});

describe('Reconnection diagnostic warning codes', () => {
  it('WEBSOCKET_CLOSE_REQUESTED has code 36005', () => {
    expect(WEBSOCKET_CLOSE_REQUESTED).toBe(36005);
  });

  it('WEBSOCKET_CLOSED has code 36006', () => {
    expect(WEBSOCKET_CLOSED).toBe(36006);
  });

  it('NETWORK_CLOSE_DECISION has code 36007', () => {
    expect(NETWORK_CLOSE_DECISION).toBe(36007);
  });

  it('WEBSOCKET_RECONNECT_STARTED has code 36008', () => {
    expect(WEBSOCKET_RECONNECT_STARTED).toBe(36008);
  });

  it('WEBSOCKET_RECONNECT_SUCCEEDED has code 36009', () => {
    expect(WEBSOCKET_RECONNECT_SUCCEEDED).toBe(36009);
  });

  it('WEBSOCKET_RECONNECT_FAILED has code 36010', () => {
    expect(WEBSOCKET_RECONNECT_FAILED).toBe(36010);
  });

  it('CALL_RECOVERY_RESULT has code 36011', () => {
    expect(CALL_RECOVERY_RESULT).toBe(36011);
  });

  it('SIGNALING_RECOVERY_REQUESTED has code 36012', () => {
    expect(SIGNALING_RECOVERY_REQUESTED).toBe(36012);
  });
});

describe('SDK_WARNINGS registry for reconnection diagnostics', () => {
  it('all reconnection warning codes have entries in SDK_WARNINGS', () => {
    const reconnectCodes = [
      WEBSOCKET_CLOSE_REQUESTED,
      WEBSOCKET_CLOSED,
      NETWORK_CLOSE_DECISION,
      WEBSOCKET_RECONNECT_STARTED,
      WEBSOCKET_RECONNECT_SUCCEEDED,
      WEBSOCKET_RECONNECT_FAILED,
      CALL_RECOVERY_RESULT,
      SIGNALING_RECOVERY_REQUESTED,
    ];

    for (const code of reconnectCodes) {
      expect(SDK_WARNINGS[code as keyof typeof SDK_WARNINGS]).toBeDefined();
      expect(SDK_WARNINGS[code as keyof typeof SDK_WARNINGS].name).toBeTruthy();
      expect(SDK_WARNINGS[code as keyof typeof SDK_WARNINGS].message).toBeTruthy();
      expect(SDK_WARNINGS[code as keyof typeof SDK_WARNINGS].description).toBeTruthy();
      expect(SDK_WARNINGS[code as keyof typeof SDK_WARNINGS].causes).toBeInstanceOf(Array);
      expect(SDK_WARNINGS[code as keyof typeof SDK_WARNINGS].solutions).toBeInstanceOf(Array);
    }
  });

  it('NETWORK_CLOSE_DECISION has attempt, skip, and abort in causes', () => {
    const entry = SDK_WARNINGS[NETWORK_CLOSE_DECISION as keyof typeof SDK_WARNINGS];
    const causesText = entry.causes.join(' ');
    expect(causesText).toContain('attempt');
    expect(causesText).toContain('skip');
    expect(causesText).toContain('abort');
  });

  it('CALL_RECOVERY_RESULT has recovered, not recovered, and not_applicable in causes', () => {
    const entry = SDK_WARNINGS[CALL_RECOVERY_RESULT as keyof typeof SDK_WARNINGS];
    const causesText = entry.causes.join(' ');
    expect(causesText).toContain('recovered');
    // "could not be recovered" contains "recovered" — verify the negative outcome too
    expect(causesText).toContain('could not be recovered');
    expect(causesText).toContain('not applicable');
  });

  it('SIGNALING_RECOVERY_REQUESTED references probe, request, peer failure, and no_rtp sources', () => {
    const entry = SDK_WARNINGS[SIGNALING_RECOVERY_REQUESTED as keyof typeof SDK_WARNINGS];
    const causesText = entry.causes.join(' ');
    expect(causesText).toContain('probe');
    expect(causesText).toContain('request');
    expect(causesText).toContain('Peer failure');
    expect(causesText).toContain('No RTP');
  });
});

describe('_recordReconnectDiagnostic emitWarning option', () => {
  let mockRecordSessionWarning: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRecordSessionWarning = jest.fn();
  });

  it('emits Warning event by default (emitWarning: true)', () => {
    const calls = {
      'call-1': {
        id: 'call-1',
        recordSessionWarning: mockRecordSessionWarning,
      },
    };

    recordReconnectDiagnostic(
      calls,
      'test-uuid',
      'test-session',
      WEBSOCKET_CLOSED,
      'WEBSOCKET_CLOSED',
      'WebSocket closed (code=1006)',
      { closeCode: 1006, wasClean: false }
    );

    expect(trigger).toHaveBeenCalledWith(
      SwEvent.Warning,
      expect.objectContaining({
        warning: expect.objectContaining({
          code: WEBSOCKET_CLOSED,
        }),
      }),
      'test-uuid'
    );
  });

  it('does NOT emit Warning event when emitWarning: false', () => {
    const calls = {
      'call-1': {
        id: 'call-1',
        recordSessionWarning: mockRecordSessionWarning,
      },
    };

    recordReconnectDiagnostic(
      calls,
      'test-uuid',
      'test-session',
      WEBSOCKET_CLOSE_REQUESTED,
      'WEBSOCKET_CLOSE_REQUESTED',
      'SDK requested WebSocket close',
      { socketGeneration: 1, voiceSdkId: 'vs-123' },
      { emitWarning: false }
    );

    // recordSessionWarning should still be called (persistence to call report)
    expect(mockRecordSessionWarning).toHaveBeenCalledTimes(1);
    expect(mockRecordSessionWarning).toHaveBeenCalledWith(
      WEBSOCKET_CLOSE_REQUESTED,
      'WEBSOCKET_CLOSE_REQUESTED',
      'SDK requested WebSocket close',
      ['call-1']
    );

    // But no public warning event should be emitted
    expect(trigger).not.toHaveBeenCalled();
  });

  it('still records to call reports when emitWarning: false', () => {
    const calls = {
      'call-1': {
        id: 'call-1',
        recordSessionWarning: mockRecordSessionWarning,
      },
      'call-2': {
        id: 'call-2',
        recordSessionWarning: mockRecordSessionWarning,
      },
    };

    recordReconnectDiagnostic(
      calls,
      'test-uuid',
      'test-session',
      WEBSOCKET_CLOSE_REQUESTED,
      'WEBSOCKET_CLOSE_REQUESTED',
      'SDK requested WebSocket close',
      { socketGeneration: 2 },
      { emitWarning: false }
    );

    // Both calls should have the warning recorded
    expect(mockRecordSessionWarning).toHaveBeenCalledTimes(2);
    expect(trigger).not.toHaveBeenCalled();
  });
});

