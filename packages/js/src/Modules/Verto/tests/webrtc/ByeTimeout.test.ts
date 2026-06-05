/**
 * Unit tests for BYE execution timeout guard
 *
 * When a BYE message hangs (e.g. socket stalled, server unresponsive),
 * the call should still be cleaned up after the timeout fires.
 * The timeout handle must be cleared in all paths: resolve, reject, timeout.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import Call from '../../webrtc/Call';
import { State } from '../../webrtc/constants';
import Verto from '../..';

const DEFAULT_PARAMS = {
  destinationNumber: 'x3599',
  remoteCallerName: 'Js Client Test',
  remoteCallerNumber: '1234',
  callerName: 'Jest Client',
  callerNumber: '5678',
};

describe('BYE timeout guard', () => {
  let session: any;
  let call: any;

  const createSession = (): any => {
    const s: any = new Verto({
      host: 'example.telnyx.com',
      login: 'testuser',
      password: 'testpass',
    });
    s.connection = {
      close: jest.fn(),
      connect: jest.fn(),
      send: jest.fn().mockResolvedValue({ node_id: 'test' }),
      sendRawText: jest.fn(),
      isAlive: true,
      connected: true,
      previousGatewayState: '',
      host: 'wss://rtc.telnyx.com',
    };
    s._idle = false;
    s.sessionid = 'test-session-id';
    s.callReportId = null;
    return s;
  };

  beforeEach(() => {
    session = createSession();
  });

  afterEach(() => {
    Object.keys(session.calls).forEach((k) =>
      session.calls[k]?.setState(State.Purge)
    );
  });

  const createCall = (): any => {
    const c: any = new Call(session, DEFAULT_PARAMS);
    c.peer = {
      close: jest.fn(),
      instance: {
        close: jest.fn(),
        getStats: jest.fn(),
      },
    };
    c.options.remoteStream = {
      getTracks: () => [],
      getAudioTracks: () => [],
      getVideoTracks: () => [],
    };
    c.options.localStream = {
      getTracks: () => [],
      getAudioTracks: () => [],
      getVideoTracks: () => [],
    };
    return c;
  };

  it('should finalize call even if BYE execution never resolves', async () => {
    jest.useFakeTimers();

    call = createCall();

    // Make BYE execution hang forever (never resolves)
    session.connection.send = jest.fn(() => new Promise(() => {}));

    const hangupPromise = call.hangup();

    // Advance past the 5s BYE timeout
    jest.advanceTimersByTime(5000);

    await hangupPromise;

    // Call should be cleaned up despite BYE never completing
    expect(session.calls[call.id]).toBeUndefined();

    jest.useRealTimers();
  });

  it('should still finalize call when BYE throws an error', async () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    call = createCall();

    // Make BYE execution reject
    session.connection.send = jest.fn(() =>
      Promise.reject(new Error('socket closed'))
    );

    await call.hangup();

    // Call should still be cleaned up even though BYE failed
    expect(session.calls[call.id]).toBeUndefined();
    // Timeout should be cleared even on rejection path (finally block)
    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
  });

  it('should clear the BYE timeout when BYE resolves before timeout', async () => {
    jest.useFakeTimers();
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    call = createCall();

    // Make BYE resolve quickly
    session.connection.send = jest.fn(() =>
      Promise.resolve({ node_id: 'test' })
    );

    await call.hangup();

    // Call should be finalized
    expect(session.calls[call.id]).toBeUndefined();

    // The timeout was set and then cleared because BYE resolved first
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
    expect(clearTimeoutSpy).toHaveBeenCalled();

    setTimeoutSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
    jest.useRealTimers();
  });
});
