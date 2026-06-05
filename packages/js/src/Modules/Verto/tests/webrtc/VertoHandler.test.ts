/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */
Object.defineProperty(global, 'performance', {
  writable: true,
  value: {
    mark: jest.fn(),
    measure: jest.fn().mockReturnValue({ duration: 0 }),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    getEntriesByName: jest.fn().mockReturnValue([]),
    getEntriesByType: jest.fn().mockReturnValue([]),
    now: jest.fn().mockReturnValue(Date.now()),
  },
});

import BrowserSession from '../../BrowserSession';
import VertoHandler from '../../webrtc/VertoHandler';
import Call from '../../webrtc/Call';
import { State } from '../../webrtc/constants';
const Connection = require('../../services/Connection');
import Verto from '../..';

const DEFAULT_PARAMS = {
  destinationNumber: 'x3599',
  remoteCallerName: 'Js Client Test',
  remoteCallerNumber: '1234',
  callerName: 'Jest Client',
  callerNumber: '5678',
};
describe('VertoHandler', () => {
  let instance: BrowserSession;
  let handler: VertoHandler;
  let call: Call;
  const onNotification = jest.fn();

  const _setupCall = (params: any = {}) => {
    call = new Call(instance, { ...DEFAULT_PARAMS, ...params });
  };

  beforeEach(() => {
    instance = new Verto({
      host: 'example.telnyx.com',
      login: 'login',
      password: 'password',
      project: 'project',
      token: 'token',
    });
    onNotification.mockClear();
    instance.on('telnyx.notification', (notification) => {
      onNotification(notification);
    });
    instance.on('telnyx.ready', (notification) => {
      onNotification(notification);
    });
    handler = new VertoHandler(instance);
  });

  afterEach(() => {
    instance.off('telnyx.notification');
    instance.off('telnyx.ready');

    Object.keys(instance.calls).forEach((k) =>
      instance.calls[k].setState(State.Purge)
    );
  });

  describe('telnyx_rtc.punt', () => {
    it('should call serverDisconnect (no BYE) on PUNT', () => {
      const msg = JSON.parse(
        '{"jsonrpc":"2.0","id":38,"method":"telnyx_rtc.punt","params":{}}'
      );
      instance.serverDisconnect = jest.fn();
      handler.handleMessage(msg);
      expect(instance.serverDisconnect).toBeCalledTimes(1);
    });
  });

  describe('telnyx_rtc.invite', () => {
    it('should create a new Call in ringing state with direction set', async () => {
      await instance.connect();
      const callId = 'cd35e65f-a507-4bd2-8d21-80f36d134a2e';
      const msg = JSON.parse(
        `{"jsonrpc":"2.0","id":4402,"method":"telnyx_rtc.invite","params":{"callID":"${callId}","sdp":"SDP","caller_id_name":"Extension 1004","caller_id_number":"1004","callee_id_name":"Outbound Call","callee_id_number":"1003","display_direction":"outbound"}}`
      );
      handler.handleMessage(msg);
      expect(instance.calls).toHaveProperty(callId);
      expect(instance.calls[callId].id).toEqual(callId);
      expect(instance.calls[callId].state).toEqual('ringing');
      expect(instance.calls[callId].prevState).toEqual('new');
      expect(instance.calls[callId].direction).toEqual('inbound');
    });

    it('should store passed call options', async () => {
      await instance.connect();
      const callId = 'cd35e65f-a507-4bd2-8d21-80f36d134a2e';
      const msg = JSON.parse(
        `{"jsonrpc":"2.0","id":4402,"method":"telnyx_rtc.invite","params":{"callID":"${callId}","sdp":"SDP","caller_id_name":"Extension 1004","caller_id_number":"1004","callee_id_name":"Outbound Call","callee_id_number":"1003","display_direction":"outbound","telnyx_call_control_id":"cc1234","telnyx_session_id":"si1234","telnyx_leg_id":"li1234", "client_state":"aGVsbG8gbXkgZnJpZW5k" }}`
      );
      handler.handleMessage(msg);
      expect(instance.calls).toHaveProperty(callId);
      expect(instance.calls[callId].id).toEqual(callId);
      expect(instance.calls[callId].options.telnyxCallControlId).toEqual(
        'cc1234'
      );
      expect(instance.calls[callId].options.telnyxSessionId).toEqual('si1234');
      expect(instance.calls[callId].options.telnyxLegId).toEqual('li1234');
      expect(instance.calls[callId].options.clientState).toEqual(
        'aGVsbG8gbXkgZnJpZW5k'
      );
    });
  });

  describe('with an active outbound Call', () => {
    beforeEach(async () => {
      await instance.connect();
      _setupCall({ id: 'e2fda6dc-fc9d-4d77-8096-53bb502443b6' });
      call.handleMessage = jest.fn();
      Connection.mockSend.mockClear();
    });

    describe('telnyx_rtc.media', () => {
      it('should pass the msg to the call and reply back to the server', () => {
        const msg = JSON.parse(
          '{"jsonrpc":"2.0","id":4403,"method":"telnyx_rtc.media","params":{"callID":"e2fda6dc-fc9d-4d77-8096-53bb502443b6","sdp":"<REMOTE-SDP>"}}'
        );
        handler.handleMessage(msg);
        expect(call.handleMessage).toBeCalledTimes(1);
        expect(Connection.mockSend).toHaveBeenLastCalledWith({
          request: {
            jsonrpc: '2.0',
            id: 4403,
            result: { method: 'telnyx_rtc.media' },
          },
        });
      });
    });

    describe('telnyx_rtc.answer', () => {
      it('should pass the msg to the call and reply back to the server', () => {
        const msg = JSON.parse(
          '{"jsonrpc":"2.0","id":4404,"method":"telnyx_rtc.answer","params":{"callID":"e2fda6dc-fc9d-4d77-8096-53bb502443b6"}}'
        );
        handler.handleMessage(msg);
        expect(call.handleMessage).toBeCalledTimes(1);
        expect(Connection.mockSend).toHaveBeenLastCalledWith({
          request: {
            jsonrpc: '2.0',
            id: 4404,
            result: { method: 'telnyx_rtc.answer' },
          },
        });
      });
    });
  });

  describe('telnyx_rtc.attach', () => {
    it('should set recoveredCallId on the new call when recovering from an existing call', async () => {
      await instance.connect();
      const callId = 'e2fda6dc-fc9d-4d77-8096-53bb502443b6';
      _setupCall({ id: callId });
      call.setState(State.Active);

      // Mock answer to prevent actual WebRTC peer creation
      const originalAnswer = Call.prototype.answer;
      Call.prototype.answer = jest.fn();

      const msg = JSON.parse(
        `{"jsonrpc":"2.0","id":4405,"method":"telnyx_rtc.attach","params":{"callID":"${callId}","sdp":"SDP","caller_id_name":"Extension 1004","caller_id_number":"1004","callee_id_name":"Outbound Call","callee_id_number":"1003"}}`
      );
      handler.handleMessage(msg);

      const newCall = instance.calls[callId];
      expect(newCall).toBeDefined();
      expect(newCall.recoveredCallId).toEqual(callId);

      Call.prototype.answer = originalAnswer;
    });

    it('should not force relay on the first recovered call even when the previous call reports a VPN media-path stall', async () => {
      await instance.connect();
      const callId = 'e2fda6dc-fc9d-4d77-8096-53bb502443b6';
      _setupCall({ id: callId });
      call.setState(State.Active);
      const shouldForceRelayCandidateForRecovery = jest.fn(() => true);
      (
        call as unknown as {
          _callReportCollector: {
            shouldForceRelayCandidateForRecovery: jest.Mock;
          };
        }
      )._callReportCollector = { shouldForceRelayCandidateForRecovery };

      // Mock answer to prevent actual WebRTC peer creation
      const originalAnswer = Call.prototype.answer;
      Call.prototype.answer = jest.fn();

      const msg = JSON.parse(
        `{"jsonrpc":"2.0","id":4408,"method":"telnyx_rtc.attach","params":{"callID":"${callId}","sdp":"SDP","caller_id_name":"Extension 1004","caller_id_number":"1004","callee_id_name":"Outbound Call","callee_id_number":"1003"}}`
      );
      handler.handleMessage(msg);

      const newCall = instance.calls[callId];
      expect(shouldForceRelayCandidateForRecovery).not.toHaveBeenCalled();
      expect(newCall).toBeDefined();
      expect(newCall.options.forceRelayCandidate).toBe(false);
      expect(newCall.recoveredCallId).toEqual(callId);

      Call.prototype.answer = originalAnswer;
    });

    it('should force relay only when an already recovered call reports the recovery path is still stalled', async () => {
      await instance.connect();
      const callId = 'e2fda6dc-fc9d-4d77-8096-53bb502443b6';
      _setupCall({ id: callId, recoveredCallId: callId });
      call.setState(State.Active);
      const shouldForceRelayCandidateForRecovery = jest.fn(() => true);
      (
        call as unknown as {
          _callReportCollector: {
            shouldForceRelayCandidateForRecovery: jest.Mock;
          };
        }
      )._callReportCollector = { shouldForceRelayCandidateForRecovery };

      // Mock answer to prevent actual WebRTC peer creation
      const originalAnswer = Call.prototype.answer;
      Call.prototype.answer = jest.fn();

      const msg = JSON.parse(
        `{"jsonrpc":"2.0","id":4409,"method":"telnyx_rtc.attach","params":{"callID":"${callId}","sdp":"SDP","caller_id_name":"Extension 1004","caller_id_number":"1004","callee_id_name":"Outbound Call","callee_id_number":"1003"}}`
      );
      handler.handleMessage(msg);

      const newCall = instance.calls[callId];
      expect(shouldForceRelayCandidateForRecovery).toHaveBeenCalledTimes(1);
      expect(newCall).toBeDefined();
      expect(newCall.options.forceRelayCandidate).toBe(true);
      expect(newCall.recoveredCallId).toEqual(callId);

      Call.prototype.answer = originalAnswer;
    });

    it('should NOT set recoveredCallId when no existing call (fresh attach)', async () => {
      await instance.connect();
      const callId = 'fresh-call-id-1234';

      // Mock answer to prevent actual WebRTC peer creation
      const originalAnswer = Call.prototype.answer;
      Call.prototype.answer = jest.fn();

      const msg = JSON.parse(
        `{"jsonrpc":"2.0","id":4406,"method":"telnyx_rtc.attach","params":{"callID":"${callId}","sdp":"SDP","caller_id_name":"Extension 1004","caller_id_number":"1004","callee_id_name":"Outbound Call","callee_id_number":"1003"}}`
      );
      handler.handleMessage(msg);

      const newCall = instance.calls[callId];
      expect(newCall).toBeDefined();
      expect(newCall.recoveredCallId).toBeFalsy();

      Call.prototype.answer = originalAnswer;
    });

    it('should set recoveredCallId when matching by telnyx_session_id with different callID', async () => {
      await instance.connect();
      const oldCallId = 'old-call-id-1234';
      const newCallId = 'new-call-id-5678';
      _setupCall({ id: oldCallId, telnyxSessionId: 'session-abc' });
      call.setState(State.Active);

      // Mock answer to prevent actual WebRTC peer creation
      const originalAnswer = Call.prototype.answer;
      Call.prototype.answer = jest.fn();

      // Server sends attach with a DIFFERENT callID but SAME telnyx_session_id
      const msg = JSON.parse(
        `{"jsonrpc":"2.0","id":4407,"method":"telnyx_rtc.attach","params":{"callID":"${newCallId}","sdp":"SDP","caller_id_name":"Extension 1004","caller_id_number":"1004","callee_id_name":"Outbound Call","callee_id_number":"1003","telnyx_session_id":"session-abc"}}`
      );
      handler.handleMessage(msg);

      const newCall = instance.calls[newCallId];
      expect(newCall).toBeDefined();
      // recoveredCallId should be set to old call's ID (matching by session ID)
      expect(newCall.recoveredCallId).toEqual(oldCallId);

      Call.prototype.answer = originalAnswer;
    });
  });

  describe('telnyx_rtc.info', () => {
    it('should dispatch a notification', () => {
      handler.handleMessage(
        JSON.parse(
          '{"jsonrpc":"2.0","id":37,"method":"telnyx_rtc.info","params":{"fake":"data", "test": "data"}}'
        )
      );
      expect(onNotification).toBeCalledWith({
        type: 'event',
        fake: 'data',
        test: 'data',
      });
    });
  });

  describe('telnyx_rtc.gatewayState', () => {
    it('should dispatch a telnyx.ready notification', () => {
      handler.handleMessage(
        JSON.parse(
          '{"jsonrpc":"2.0","id":20342,"method":"telnyx_rtc.gatewayState","params":{"state":"REGED"}}'
        )
      );

      expect(onNotification).toBeCalledWith({
        state: 'REGED',
        type: 'vertoClientReady',
      });

      handler.handleMessage(
        JSON.parse(
          '{"jsonrpc":"2.0","id":37,"method":"telnyx_rtc.clientReady","params":{"reattached_sessions":["test"], "state": "REGED"}}'
        )
      );

      expect(onNotification).toBeCalledWith({
        state: 'REGED',
        type: 'vertoClientReady',
      });
    });
  });

  describe('Verto message unknown method:', () => {
    it('if result.params.state is REGED should dispatch a telnyx.ready notification', () => {
      handler.handleMessage(
        JSON.parse(
          '{"jsonrpc":"2.0","id":"db971dc0-d571","result":{"params":{"state":"REGED"},"sessid":"fab032b1-9b27-43fc"}}'
        )
      );

      expect(onNotification).toBeCalledWith({
        type: 'vertoClientReady',
      });
    });

    it('should store dc and region from REGED message params on the session', () => {
      handler.handleMessage(
        JSON.parse(
          '{"jsonrpc":"2.0","id":"db971dc0-d571","result":{"params":{"state":"REGED","dc":"ams3-prod","region":"eu-west"},"sessid":"fab032b1-9b27-43fc"}}'
        )
      );

      expect(instance.dc).toBe('ams3-prod');
      expect(instance.region).toBe('eu-west');
    });

    it('should store call_report_id from REGED message params on the session', () => {
      handler.handleMessage(
        JSON.parse(
          '{"jsonrpc":"2.0","id":"db971dc0-d571","result":{"params":{"state":"REGED","call_report_id":"test-report-123"},"sessid":"fab032b1-9b27-43fc"}}'
        )
      );

      expect(instance.callReportId).toBe('test-report-123');
    });
  });

  describe('resetReconnectAttempts on gateway state', () => {
    it('should NOT reset reconnect attempts on REGISTER', () => {
      (instance as any)._reconnectAttempts = 3;
      instance.connection.previousGatewayState = '';

      const registerMsg = JSON.parse(
        '{"jsonrpc":"2.0","id":"reg-1","result":{"params":{"state":"REGISTER"},"sessid":"sess1"}}'
      );
      handler.handleMessage(registerMsg);

      expect((instance as any)._reconnectAttempts).toBe(3);
    });

    it('should reset reconnect attempts on REGED', () => {
      (instance as any)._reconnectAttempts = 3;
      instance.connection.previousGatewayState = '';

      const regedMsg = JSON.parse(
        '{"jsonrpc":"2.0","id":"reg-2","result":{"params":{"state":"REGED"},"sessid":"sess1"}}'
      );
      handler.handleMessage(regedMsg);

      expect((instance as any)._reconnectAttempts).toBe(0);
    });

    it('REGISTER followed by socket close should preserve attempt count', () => {
      (instance as any)._reconnectAttempts = 2;
      instance.connection.previousGatewayState = '';

      // REGISTER does not reset attempts
      const registerMsg = JSON.parse(
        '{"jsonrpc":"2.0","id":"reg-3","result":{"params":{"state":"REGISTER"},"sessid":"sess1"}}'
      );
      handler.handleMessage(registerMsg);
      expect((instance as any)._reconnectAttempts).toBe(2);

      // Socket closes before REGED — attempts still intact
      instance.connection.previousGatewayState = '';
      (instance as any)._reconnectAttempts = 3;

      // Then REGED arrives — now reset
      const regedMsg = JSON.parse(
        '{"jsonrpc":"2.0","id":"reg-4","result":{"params":{"state":"REGED"},"sessid":"sess1"}}'
      );
      handler.handleMessage(regedMsg);
      expect((instance as any)._reconnectAttempts).toBe(0);
    });
  });

  describe('should fire telnyx.ready again after socket reconnection', () => {
    it('fires telnyx.ready again when previousGatewayState is reset after socket close', () => {
      const regedMsg = JSON.parse(
        '{"jsonrpc":"2.0","id":1,"method":"telnyx_rtc.gatewayState","params":{"state":"REGED"}}'
      );

      // Step 1: First REGED — should fire telnyx.ready
      handler.handleMessage(regedMsg);

      expect(onNotification).toHaveBeenLastCalledWith(
        expect.objectContaining({
          state: 'REGED',
          type: 'vertoClientReady',
        })
      );

      const countAfterFirst = onNotification.mock.calls.length;

      // Step 2: Simulate what Connection.onmessage does (line 152 of Connection.ts):
      // it sets previousGatewayState = current state after processing
      instance.connection.previousGatewayState = 'REGED';

      // Step 3: Second REGED — duplicate guard should BLOCK it
      handler.handleMessage(regedMsg);

      expect(onNotification.mock.calls.length).toBe(countAfterFirst);

      // Step 4: Simulate socket close — onNetworkClose() resets previousGatewayState
      instance.connection.previousGatewayState = '';

      // Step 5: Third REGED — should fire again after reconnection
      handler.handleMessage(regedMsg);

      expect(onNotification.mock.calls.length).toBe(countAfterFirst + 1);
      expect(onNotification).toHaveBeenLastCalledWith(
        expect.objectContaining({
          state: 'REGED',
          type: 'vertoClientReady',
        })
      );
    });
  });

  describe('Reattach session handling', () => {
    // Helper to send a clientReady message with reattached_sessions
    const sendReattach = (reattachedSessions: string[]) => {
      const msg = JSON.parse(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 999,
          method: 'telnyx_rtc.clientReady',
          params: {
            reattached_sessions: reattachedSessions,
            state: 'REGED',
          },
        })
      );
      handler.handleMessage(msg);
    };

    // Helper to send an Attach message
    const sendAttach = (
      callID: string,
      telnyxSessionId: string,
      sdp = 'SDP'
    ) => {
      const msg = JSON.parse(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 1000,
          method: 'telnyx_rtc.attach',
          params: {
            callID,
            sdp,
            telnyx_session_id: telnyxSessionId,
            caller_id_name: 'Test',
            caller_id_number: '1004',
            callee_id_name: 'Outbound',
            callee_id_number: '1003',
          },
        })
      );
      handler.handleMessage(msg);
    };

    let onError: jest.Mock;

    beforeEach(() => {
      onError = jest.fn();
      instance.on('telnyx.error', onError);
    });

    afterEach(() => {
      instance.off('telnyx.error');
    });

    // ── Attach-before-reattached_sessions ordering ─────────────────────
    describe('attach-before-reattached_sessions ordering', () => {
      it('should recover call via attach before reattached_sessions arrives', async () => {
        await instance.connect();
        const callId = 'call-id-001';
        _setupCall({ id: callId, telnyxSessionId: 'session-abc' });
        call.setState(State.Active);

        // Attach arrives first
        const originalAnswer = Call.prototype.answer;
        Call.prototype.answer = jest.fn();
        sendAttach(callId, 'session-abc');
        Call.prototype.answer = originalAnswer;

        // Call should be recovered (old call closed, new one created)
        const newCall = instance.calls[callId];
        expect(newCall).toBeDefined();
        expect(newCall.recoveredCallId).toEqual(callId);

        // Now reattached_sessions arrives (non-empty) — should NOT terminate
        sendReattach(['session-abc']);

        // Call should still exist
        expect(instance.calls[callId]).toBeDefined();
        expect(onError).not.toHaveBeenCalled();
      });

      it('should not terminate call when reattached_sessions is empty but attach already recovered', async () => {
        await instance.connect();
        const callId = 'call-id-002';
        _setupCall({ id: callId, telnyxSessionId: 'session-xyz' });
        call.setState(State.Active);

        // Attach arrives first and recovers the call
        const originalAnswer = Call.prototype.answer;
        Call.prototype.answer = jest.fn();
        sendAttach(callId, 'session-xyz');
        Call.prototype.answer = originalAnswer;

        // Now reattached_sessions arrives as EMPTY
        // Since attach already recovered, this should NOT terminate the call
        sendReattach([]);

        // Call should still exist (attach already recovered it)
        expect(instance.calls[callId]).toBeDefined();
        expect(onError).not.toHaveBeenCalled();
      });
    });

    // ── Empty reattached_sessions orphan cleanup ──────────────────────
    describe('empty reattached_sessions orphan cleanup', () => {
      it('should terminate active call when reattached_sessions is empty and no attach recovered it', async () => {
        await instance.connect();
        const callId = 'call-id-010';
        _setupCall({ id: callId, telnyxSessionId: 'session-orphan' });
        call.setState(State.Active);

        expect(instance.calls[callId]).toBeDefined();

        sendReattach([]);

        // Call should be cleaned up
        expect(instance.calls[callId]).toBeUndefined();
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({ code: 48501 }),
          })
        );
      });

      it('should NOT send BYE when terminating an orphaned call', async () => {
        await instance.connect();
        const callId = 'call-id-nobye';
        _setupCall({ id: callId, telnyxSessionId: 'session-orphan' });
        call.setState(State.Active);

        Connection.mockSend.mockClear();

        sendReattach([]);

        expect(instance.calls[callId]).toBeUndefined();

        // Verify no BYE was sent
        const byeCalls = Connection.mockSend.mock.calls.filter(
          (c: { request: { method: string } }[]) =>
            c[0]?.request?.method === 'telnyx_rtc.bye'
        );
        expect(byeCalls.length).toBe(0);
      });
    });

    // ── Non-empty reattached_sessions with missing active call ─────────
    describe('non-empty reattached_sessions missing active call', () => {
      it('should not terminate active call when reattached_sessions does not contain it (attach drives recovery)', async () => {
        await instance.connect();
        const callId = 'call-id-020';
        _setupCall({ id: callId, telnyxSessionId: 'session-active' });
        call.setState(State.Active);

        // reattached_sessions contains a DIFFERENT session
        // Should NOT terminate — attach drives recovery, not reattached_sessions
        sendReattach(['session-different']);

        // Call should still exist
        expect(instance.calls[callId]).toBeDefined();
        expect(onError).not.toHaveBeenCalled();
      });
    });

    // ── Mismatching attach terminates active with SESSION_NOT_REATTACHED ─
    describe('mismatching attach terminates active call', () => {
      it('should terminate active call and ignore mismatching attach', async () => {
        await instance.connect();
        const callId = 'call-id-030';
        _setupCall({ id: callId, telnyxSessionId: 'session-active' });
        call.setState(State.Active);

        // Incoming attach with a DIFFERENT callID and telnyx_session_id
        sendAttach('different-call-id', 'session-different');

        // Active call should be terminated with SESSION_NOT_REATTACHED
        expect(instance.calls[callId]).toBeUndefined();
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({ code: 48501 }),
          })
        );

        // The mismatching attach should NOT create a new call
        expect(instance.calls['different-call-id']).toBeUndefined();
      });

      it('should not send BYE when terminating active call on mismatching attach', async () => {
        await instance.connect();
        const callId = 'call-id-031';
        _setupCall({ id: callId, telnyxSessionId: 'session-active' });
        call.setState(State.Active);

        Connection.mockSend.mockClear();

        sendAttach('different-call-id', 'session-different');

        // No BYE should be sent
        const byeCalls = Connection.mockSend.mock.calls.filter(
          (c: { request: { method: string } }[]) =>
            c[0]?.request?.method === 'telnyx_rtc.bye'
        );
        expect(byeCalls.length).toBe(0);
      });
    });

    // ── Matching attach by callID ─────────────────────────────────────
    describe('matching attach by callID', () => {
      it('should recover call when attach callID matches existing call', async () => {
        await instance.connect();
        const callId = 'call-id-040';
        _setupCall({ id: callId });
        call.setState(State.Active);

        const originalAnswer = Call.prototype.answer;
        Call.prototype.answer = jest.fn();
        sendAttach(callId, 'session-any');
        Call.prototype.answer = originalAnswer;

        const newCall = instance.calls[callId];
        expect(newCall).toBeDefined();
        expect(newCall.recoveredCallId).toEqual(callId);
      });
    });

    // ── Matching attach by telnyx_session_id with different callID ──────
    describe('matching attach by telnyx_session_id with different callID', () => {
      it('should recover call when attach telnyx_session_id matches but callID differs', async () => {
        await instance.connect();
        const oldCallId = 'old-call-id-050';
        const newCallId = 'new-call-id-050';
        _setupCall({ id: oldCallId, telnyxSessionId: 'session-match' });
        call.setState(State.Active);

        const originalAnswer = Call.prototype.answer;
        Call.prototype.answer = jest.fn();
        sendAttach(newCallId, 'session-match');
        Call.prototype.answer = originalAnswer;

        // Old call should be gone, new call created with recoveredCallId
        expect(instance.calls[oldCallId]).toBeUndefined();
        const newCall = instance.calls[newCallId];
        expect(newCall).toBeDefined();
        expect(newCall.recoveredCallId).toEqual(oldCallId);
      });
    });

    // ── No active call, multiple attaches ──────────────────────────────
    describe('no active call, multiple attaches', () => {
      it('should recover first attach and ACK/ignore subsequent ambiguous ones', async () => {
        await instance.connect();
        expect(Object.keys(instance.calls).length).toBe(0);

        const originalAnswer = Call.prototype.answer;
        Call.prototype.answer = jest.fn();

        // First attach — should be recovered
        sendAttach('first-call-id', 'session-first');
        expect(instance.calls['first-call-id']).toBeDefined();
        expect(instance.calls['first-call-id'].recoveredCallId).toBeFalsy();

        // Second attach with different session — the first recovered call
        // now appears as "active". Since it was recovered by a prior
        // no-active-call attach, this second attach is ambiguous and
        // should be ACK'd/ignored, NOT terminate the first call.
        sendAttach('second-call-id', 'session-second');

        // First call should STILL exist (not terminated)
        expect(instance.calls['first-call-id']).toBeDefined();
        // Second attach should NOT create a new call
        expect(instance.calls['second-call-id']).toBeUndefined();

        Call.prototype.answer = originalAnswer;
      });

      it('should ignore duplicate attach for the same session', async () => {
        await instance.connect();
        expect(Object.keys(instance.calls).length).toBe(0);

        const originalAnswer = Call.prototype.answer;
        Call.prototype.answer = jest.fn();

        // First attach — recovered
        sendAttach('first-call-id', 'session-dup');
        expect(instance.calls['first-call-id']).toBeDefined();

        // Duplicate attach for same session but different callID
        sendAttach('dup-call-id', 'session-dup');

        // Original call should still exist; duplicate should be ignored
        expect(instance.calls['first-call-id']).toBeDefined();
        expect(instance.calls['dup-call-id']).toBeUndefined();

        Call.prototype.answer = originalAnswer;
      });
    });

    // ── Edge cases ────────────────────────────────────────────────────
    describe('edge cases', () => {
      it('should not throw when reattached_sessions is not an array', async () => {
        await instance.connect();
        const callId = 'call-id-noarray';
        _setupCall({ id: callId });
        call.setState(State.Active);

        // Send message without reattached_sessions at all
        const msg = JSON.parse(
          '{"jsonrpc":"2.0","id":999,"method":"telnyx_rtc.clientReady","params":{"state":"REGED"}}'
        );

        expect(() => handler.handleMessage(msg)).not.toThrow();
        expect(instance.calls[callId]).toBeDefined();
      });

      it('should handle multiple active calls with attach recovery', async () => {
        await instance.connect();

        const { v4: uuidV4 } = jest.requireMock('uuid');
        let callCount = 0;
        (uuidV4 as jest.Mock).mockImplementation(() => `call-${++callCount}`);

        const call1 = new Call(instance, { ...DEFAULT_PARAMS, id: 'call-1' });
        call1.options.telnyxSessionId = 'session-1';
        call1.setState(State.Active);

        const call2 = new Call(instance, { ...DEFAULT_PARAMS, id: 'call-2' });
        call2.options.telnyxSessionId = 'session-2';
        call2.setState(State.Active);

        void call1;
        void call2;

        expect(Object.keys(instance.calls).length).toBe(2);

        // Attach matches call-1 by session ID
        const originalAnswer = Call.prototype.answer;
        Call.prototype.answer = jest.fn();
        sendAttach('call-1', 'session-1');
        Call.prototype.answer = originalAnswer;

        // call-1 should be recovered, call-2 should still exist
        expect(instance.calls['call-1']).toBeDefined();
        expect(instance.calls['call-1'].recoveredCallId).toEqual('call-1');
        expect(instance.calls['call-2']).toBeDefined();
      });

      it('should reset tracking on new reattach cycle (via resetReattachCycle)', async () => {
        await instance.connect();
        expect(Object.keys(instance.calls).length).toBe(0);

        // First cycle: attach creates a call
        const originalAnswer = Call.prototype.answer;
        Call.prototype.answer = jest.fn();
        sendAttach('call-cycle1', 'session-cycle1');
        Call.prototype.answer = originalAnswer;
        expect(instance.calls['call-cycle1']).toBeDefined();

        // clientReady does NOT reset tracking — attaches arriving after
        // clientReady still see the first call as recovered by attach
        sendReattach(['session-cycle1']);

        // Second attach in the SAME cycle (after clientReady) with different
        // session should NOT terminate the first recovered call — it's
        // ambiguous and should be ACK'd/ignored.
        const originalAnswer2 = Call.prototype.answer;
        Call.prototype.answer = jest.fn();
        sendAttach('call-cycle2', 'session-cycle2');
        Call.prototype.answer = originalAnswer2;

        // First call should still exist (ambiguous attach ignored)
        expect(instance.calls['call-cycle1']).toBeDefined();
        // Second attach should NOT create a call
        expect(instance.calls['call-cycle2']).toBeUndefined();

        // Now simulate a new reattach cycle (WebSocket reconnects)
        handler.resetReattachCycle();

        // After cycle reset, a mismatching attach WILL terminate
        // the old call because tracking was cleared
        const originalAnswer3 = Call.prototype.answer;
        Call.prototype.answer = jest.fn();
        sendAttach('call-cycle3', 'session-cycle3');
        Call.prototype.answer = originalAnswer3;

        // Now the mismatch terminates the old call
        expect(instance.calls['call-cycle1']).toBeUndefined();
        expect(instance.calls['call-cycle3']).toBeUndefined();
      });

      it('should only terminate unrecovered calls on empty reattached_sessions when one call was recovered by attach (per-call tracking)', async () => {
        await instance.connect();

        // Set up two active calls: only call-1 will be recovered by attach
        const call1 = new Call(instance, {
          ...DEFAULT_PARAMS,
          id: 'call-recovered',
        });
        call1.options.telnyxSessionId = 'session-recovered';
        call1.setState(State.Active);

        const call2 = new Call(instance, {
          ...DEFAULT_PARAMS,
          id: 'call-orphan',
        });
        call2.options.telnyxSessionId = 'session-orphan';
        call2.setState(State.Active);

        void call1;
        void call2;

        expect(Object.keys(instance.calls).length).toBe(2);

        // Attach recovers call-recovered
        const originalAnswer = Call.prototype.answer;
        Call.prototype.answer = jest.fn();
        sendAttach('call-recovered', 'session-recovered');
        Call.prototype.answer = originalAnswer;

        // call-recovered should be recovered, call-orphan should still exist
        expect(instance.calls['call-recovered']).toBeDefined();
        expect(instance.calls['call-orphan']).toBeDefined();

        // Now clientReady with empty reattached_sessions arrives
        // Per-call tracking: call-recovered was already recovered by attach,
        // so it should be kept. call-orphan was NOT recovered by attach,
        // so it should be terminated.
        sendReattach([]);

        // call-recovered should still exist (was recovered by attach)
        expect(instance.calls['call-recovered']).toBeDefined();
        // call-orphan should be terminated (was NOT recovered by attach)
        expect(instance.calls['call-orphan']).toBeUndefined();
        // Error should have been fired for call-orphan only
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            callId: 'call-orphan',
            error: expect.objectContaining({ code: 48501 }),
          })
        );
      });

      it('should keep first recovered call when clientReady(non-empty) arrives between attaches', async () => {
        await instance.connect();
        expect(Object.keys(instance.calls).length).toBe(0);

        const originalAnswer = Call.prototype.answer;
        Call.prototype.answer = jest.fn();

        // 1. No active call → first attach recovers session-first
        sendAttach('first-call-id', 'session-first');
        expect(instance.calls['first-call-id']).toBeDefined();
        expect(instance.calls['first-call-id'].recoveredCallId).toBeFalsy();

        // 2. clientReady with non-empty reattached_sessions arrives
        //    (must NOT clear attach-recovery tracking)
        sendReattach(['session-first', 'session-second']);

        // 3. Later attach for session-second arrives
        //    It doesn't match the first call, but the first call was
        //    recovered by attach in this cycle → ambiguous, ACK/ignore
        sendAttach('second-call-id', 'session-second');

        // First call must still exist (not terminated)
        expect(instance.calls['first-call-id']).toBeDefined();
        // Second attach should NOT create a new call
        expect(instance.calls['second-call-id']).toBeUndefined();
        // No error should be fired
        expect(onError).not.toHaveBeenCalled();

        Call.prototype.answer = originalAnswer;
      });
    });
  });
});
