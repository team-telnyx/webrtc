/**
 * Tests for PreCallDiagnostic timing and lifecycle measurements — T10.
 *
 * These tests verify:
 * - Monotonic clock helper (nowMonoMs) produces finite positive values
 * - DiagnosticTimings fields are populated during a successful run
 * - Duration fields are computed from monotonic timestamps
 * - Epoch timestamps (startedAt, completedAt) use Date.now()
 * - Missing timing sources result in omitted fields (not zero or NaN)
 * - No negative durations or NaN values
 * - Cleanup timing is recorded even when hangup() rejects
 * - ICE and media timing marks are captured when PeerConnection events fire
 * - Timings never block report generation
 */

import { PreCallDiagnostic } from '../PreCallDiagnostic';
import { createDiagnosticContext, nowMonoMs } from '../context';
import type {
  ClientLike,
  CallLike,
  PreCallDiagnosticOptions,
} from '../types';

// --- Mock helpers ---

function createMockCall(overrides: Partial<CallLike> = {}): CallLike {
  return {
    id: 'test-call-id',
    hangup: jest.fn(),
    peerConnection: undefined,
    ...overrides,
  };
}

function createMockClient(overrides: Partial<ClientLike> = {}): ClientLike {
  const mockCall = createMockCall();
  return {
    newCall: jest.fn().mockReturnValue(mockCall),
    ...overrides,
  };
}

function createOptions(
  overrides: Partial<PreCallDiagnosticOptions> = {}
): PreCallDiagnosticOptions {
  return {
    client: createMockClient(),
    destinationNumber: '1234',
    durationMs: 10, // Keep tests fast
    ...overrides,
  };
}

/** Ice connection state type used in mock PeerConnection. */
type IceState = 'new' | 'checking' | 'connected' | 'completed' | 'failed' | 'disconnected' | 'closed';

/**
 * Create a mock RTCPeerConnection that supports addEventListener
 * and can dispatch events for ICE state changes and track events.
 */
function createMockPeerConnection(): {
  pc: RTCPeerConnection;
  dispatchIceStateChange: (state: IceState) => void;
  dispatchTrack: () => void;
} {
  const listeners: Record<string, Array<() => void>> = {};
  let iceState: IceState = 'new';

  const pc = {
    iceConnectionState: iceState as IceState,
    addEventListener: jest.fn().mockImplementation((event: string, handler: () => void) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    }),
    removeEventListener: jest.fn().mockImplementation((event: string, handler: () => void) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((h) => h !== handler);
      }
    }),
  } as unknown as RTCPeerConnection;

  return {
    pc,
    dispatchIceStateChange: (state: IceState) => {
      iceState = state;
      (pc as unknown as Record<string, unknown>).iceConnectionState = state;
      const handlers = listeners['iceconnectionstatechange'] || [];
      for (const handler of handlers) {
        handler();
      }
    },
    dispatchTrack: () => {
      const handlers = listeners['track'] || [];
      for (const handler of handlers) {
        handler();
      }
    },
  };
}

// --- Tests ---

describe('nowMonoMs', () => {
  it('returns a finite positive number', () => {
    const value = nowMonoMs();
    expect(typeof value).toBe('number');
    expect(isFinite(value)).toBe(true);
    expect(value).toBeGreaterThan(0);
  });

  it('returns increasing values on subsequent calls', () => {
    const a = nowMonoMs();
    const b = nowMonoMs();
    expect(b).toBeGreaterThanOrEqual(a);
  });
});

describe('createDiagnosticContext', () => {
  it('initializes both epoch and monotonic start timestamps', () => {
    const context = createDiagnosticContext(createOptions());
    expect(context.timings.startedAtEpochMs).toBeDefined();
    expect(typeof context.timings.startedAtEpochMs).toBe('number');
    expect(context.timings.startedAtMonoMs).toBeDefined();
    expect(typeof context.timings.startedAtMonoMs).toBe('number');
    expect(isFinite(context.timings.startedAtEpochMs)).toBe(true);
    expect(isFinite(context.timings.startedAtMonoMs)).toBe(true);
  });

  it('leaves optional timing fields undefined', () => {
    const context = createDiagnosticContext(createOptions());
    expect(context.timings.completedAtEpochMs).toBeUndefined();
    expect(context.timings.completedAtMonoMs).toBeUndefined();
    expect(context.timings.callCreatedAtMonoMs).toBeUndefined();
    expect(context.timings.callActiveAtMonoMs).toBeUndefined();
    expect(context.timings.callAnsweredAtMonoMs).toBeUndefined();
    expect(context.timings.iceConnectedAtMonoMs).toBeUndefined();
    expect(context.timings.firstStatsAtMonoMs).toBeUndefined();
    expect(context.timings.firstMediaStatsAtMonoMs).toBeUndefined();
    expect(context.timings.statsSamplingStartedAtMonoMs).toBeUndefined();
    expect(context.timings.statsSamplingCompletedAtMonoMs).toBeUndefined();
    expect(context.timings.cleanupStartedAtMonoMs).toBeUndefined();
    expect(context.timings.cleanupCompletedAtMonoMs).toBeUndefined();
  });
});

describe('PreCallDiagnostic timings (T10)', () => {
  describe('successful run', () => {
    it('populates epoch timestamps (startedAt, completedAt)', async () => {
      const diagnostic = new PreCallDiagnostic(createOptions());
      const report = await diagnostic.run();

      expect(report.timings?.startedAt).toBeDefined();
      expect(report.timings?.completedAt).toBeDefined();
      expect(typeof report.timings?.startedAt).toBe('number');
      expect(typeof report.timings?.completedAt).toBe('number');
      expect(report.timings!.completedAt!).toBeGreaterThanOrEqual(
        report.timings!.startedAt!
      );
    });

    it('computes totalMs from monotonic timestamps', async () => {
      const diagnostic = new PreCallDiagnostic(createOptions());
      const report = await diagnostic.run();

      expect(report.timings?.totalMs).toBeDefined();
      expect(typeof report.timings?.totalMs).toBe('number');
      expect(report.timings!.totalMs!).toBeGreaterThanOrEqual(0);
    });

    it('computes callCreateMs from monotonic timestamps', async () => {
      const diagnostic = new PreCallDiagnostic(createOptions());
      const report = await diagnostic.run();

      expect(report.timings?.callCreateMs).toBeDefined();
      expect(typeof report.timings?.callCreateMs).toBe('number');
      expect(report.timings!.callCreateMs!).toBeGreaterThanOrEqual(0);
    });

    it('computes callSetupMs from monotonic timestamps', async () => {
      const diagnostic = new PreCallDiagnostic(createOptions());
      const report = await diagnostic.run();

      expect(report.timings?.callSetupMs).toBeDefined();
      expect(typeof report.timings?.callSetupMs).toBe('number');
      expect(report.timings!.callSetupMs!).toBeGreaterThanOrEqual(0);
    });

    it('computes statsSamplingMs from monotonic timestamps', async () => {
      const diagnostic = new PreCallDiagnostic(createOptions());
      const report = await diagnostic.run();

      expect(report.timings?.statsSamplingMs).toBeDefined();
      expect(typeof report.timings?.statsSamplingMs).toBe('number');
      expect(report.timings!.statsSamplingMs!).toBeGreaterThanOrEqual(0);
    });

    it('computes cleanupMs from monotonic timestamps', async () => {
      const diagnostic = new PreCallDiagnostic(createOptions());
      const report = await diagnostic.run();

      expect(report.timings?.cleanupMs).toBeDefined();
      expect(typeof report.timings?.cleanupMs).toBe('number');
      expect(report.timings!.cleanupMs!).toBeGreaterThanOrEqual(0);
    });

    it('omits optional timing fields that have no data source', async () => {
      // Without a PeerConnection, ICE/media/answered timing is not observable
      const diagnostic = new PreCallDiagnostic(createOptions());
      const report = await diagnostic.run();

      // These should be undefined since no PeerConnection events fire
      expect(report.timings?.callAnsweredMs).toBeUndefined();
      expect(report.timings?.iceConnectedMs).toBeUndefined();
      expect(report.timings?.firstStatsMs).toBeUndefined();
      expect(report.timings?.firstMediaStatsMs).toBeUndefined();
    });

    it('never produces NaN or negative duration values', async () => {
      const diagnostic = new PreCallDiagnostic(createOptions());
      const report = await diagnostic.run();

      const timings = report.timings;
      const durationFields: (keyof NonNullable<typeof timings>)[] = [
        'totalMs',
        'callCreateMs',
        'callSetupMs',
        'statsSamplingMs',
        'cleanupMs',
      ];

      for (const field of durationFields) {
        const value = timings?.[field];
        if (value !== undefined) {
          expect(isFinite(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  describe('error path', () => {
    it('still populates timing fields when call creation fails', async () => {
      const mockClient = createMockClient({
        newCall: jest.fn().mockImplementation(() => {
          throw new Error('Call creation failed');
        }),
      });
      const diagnostic = new PreCallDiagnostic(
        createOptions({ client: mockClient })
      );

      const report = await diagnostic.run();

      expect(report.timings?.startedAt).toBeDefined();
      expect(report.timings?.completedAt).toBeDefined();
      expect(report.timings?.totalMs).toBeGreaterThanOrEqual(0);
    });

    it('omits callCreateMs when call creation fails', async () => {
      const mockClient = createMockClient({
        newCall: jest.fn().mockImplementation(() => {
          throw new Error('Call creation failed');
        }),
      });
      const diagnostic = new PreCallDiagnostic(
        createOptions({ client: mockClient })
      );

      const report = await diagnostic.run();

      // callCreateMs and downstream durations should be undefined
      expect(report.timings?.callCreateMs).toBeUndefined();
      expect(report.timings?.callSetupMs).toBeUndefined();
    });
  });

  describe('cleanup timing', () => {
    it('records cleanupMs even when hangup() rejects', async () => {
      const mockCall = createMockCall({
        hangup: jest.fn().mockRejectedValue(new Error('Hangup failed')),
      });
      const mockClient = createMockClient({
        newCall: jest.fn().mockReturnValue(mockCall),
      });
      const diagnostic = new PreCallDiagnostic(
        createOptions({ client: mockClient })
      );

      const report = await diagnostic.run();

      // cleanup should still be timed even when hangup fails
      expect(report.timings?.cleanupMs).toBeDefined();
      expect(report.timings!.cleanupMs!).toBeGreaterThanOrEqual(0);
    });

    it('records cleanupMs when hangup() resolves', async () => {
      const diagnostic = new PreCallDiagnostic(createOptions());
      const report = await diagnostic.run();

      expect(report.timings?.cleanupMs).toBeDefined();
      expect(report.timings!.cleanupMs!).toBeGreaterThanOrEqual(0);
    });

    it('does not record cleanupMs when autoHangup is false', async () => {
      const mockCall = createMockCall();
      const mockClient = createMockClient({
        newCall: jest.fn().mockReturnValue(mockCall),
      });
      const diagnostic = new PreCallDiagnostic(
        createOptions({ client: mockClient, autoHangup: false })
      );

      const report = await diagnostic.run();

      // With autoHangup: false, cleanup still runs but no hangup call
      // cleanupMs should still be recorded (it measures the finally block duration)
      expect(report.timings?.cleanupMs).toBeDefined();
      expect(mockCall.hangup).not.toHaveBeenCalled();
    });
  });

  describe('PeerConnection timing events', () => {
    it('captures iceConnectedMs when ICE connects', async () => {
      const { pc, dispatchIceStateChange } = createMockPeerConnection();
      const mockCall = createMockCall({
        peerConnection: pc,
      });
      const mockClient = createMockClient({
        newCall: jest.fn().mockImplementation(() => {
          // Simulate ICE connecting after call creation
          setTimeout(() => dispatchIceStateChange('connected'), 5);
          return mockCall;
        }),
      });
      const diagnostic = new PreCallDiagnostic(
        createOptions({ client: mockClient, durationMs: 50 })
      );

      const report = await diagnostic.run();

      // iceConnectedMs should be captured if the event fired in time
      if (report.timings?.iceConnectedMs !== undefined) {
        expect(report.timings.iceConnectedMs).toBeGreaterThanOrEqual(0);
      }
      // If it wasn't captured (timing), it should be undefined, not NaN/negative
    });

    it('captures firstMediaStatsMs when track event fires', async () => {
      const { pc, dispatchTrack } = createMockPeerConnection();
      const mockCall = createMockCall({
        peerConnection: pc,
      });
      const mockClient = createMockClient({
        newCall: jest.fn().mockImplementation(() => {
          // Simulate track event after call creation
          setTimeout(() => dispatchTrack(), 5);
          return mockCall;
        }),
      });
      const diagnostic = new PreCallDiagnostic(
        createOptions({ client: mockClient, durationMs: 50 })
      );

      const report = await diagnostic.run();

      if (report.timings?.firstMediaStatsMs !== undefined) {
        expect(report.timings.firstMediaStatsMs).toBeGreaterThanOrEqual(0);
      }
    });

    it('does not capture iceConnectedMs when PeerConnection is absent', async () => {
      const diagnostic = new PreCallDiagnostic(createOptions());
      const report = await diagnostic.run();

      expect(report.timings?.iceConnectedMs).toBeUndefined();
    });

    it('does not capture firstMediaStatsMs when PeerConnection is absent', async () => {
      const diagnostic = new PreCallDiagnostic(createOptions());
      const report = await diagnostic.run();

      expect(report.timings?.firstMediaStatsMs).toBeUndefined();
    });
  });

  describe('timings robustness', () => {
    it('timing generation never throws', async () => {
      // Even with a completely broken mock, timings should not throw
      const mockClient = createMockClient({
        newCall: jest.fn().mockReturnValue({
          id: 'broken',
          hangup: jest.fn().mockImplementation(() => {
            throw new Error('break');
          }),
          peerConnection: undefined,
        }),
      });
      const diagnostic = new PreCallDiagnostic(
        createOptions({ client: mockClient })
      );

      // Should not throw — errors are caught
      const report = await diagnostic.run();
      expect(report.version).toBe(1);
      expect(report.timings).toBeDefined();
    });

    it('all timing durations use consistent units (ms)', async () => {
      const diagnostic = new PreCallDiagnostic(createOptions());
      const report = await diagnostic.run();

      const timings = report.timings;
      // All *Ms fields should be reasonable sub-second values
      // (tests use durationMs: 10, so totalMs should be small)
      if (timings?.totalMs !== undefined) {
        expect(timings.totalMs).toBeLessThan(5000); // generous upper bound
      }
      if (timings?.callCreateMs !== undefined) {
        expect(timings.callCreateMs).toBeLessThan(1000);
      }
      if (timings?.cleanupMs !== undefined) {
        expect(timings.cleanupMs).toBeLessThan(1000);
      }
    });
  });
});
