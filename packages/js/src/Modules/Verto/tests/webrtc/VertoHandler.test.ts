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
import {
  setActiveCallsRecoveryMarker,
  getActiveCallsRecoveryMarker,
  clearActiveCallsRecoveryMarker,
  RECOVERY_MARKER_MAX_AGE_MS,
} from '../../util/reconnect';

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

    it('should preserve the matched call mute state when recovering from an existing call', async () => {
      await instance.connect();
      const callId = 'muted-recovery-call-id';
      _setupCall({ id: callId });
      call.setState(State.Active);
      call.muteAudio();
      expect(call.isAudioMuted).toBe(true);

      // Mock answer to prevent actual WebRTC peer creation
      const originalAnswer = Call.prototype.answer;
      Call.prototype.answer = jest.fn();

      const msg = JSON.parse(
        `{"jsonrpc":"2.0","id":4410,"method":"telnyx_rtc.attach","params":{"callID":"${callId}","sdp":"SDP","caller_id_name":"Extension 1004","caller_id_number":"1004","callee_id_name":"Outbound Call","callee_id_number":"1003"}}`
      );
      handler.handleMessage(msg);

      const newCall = instance.calls[callId];
      expect(newCall).toBeDefined();
      expect(newCall.recoveredCallId).toEqual(callId);
      expect(newCall.options.mutedMicOnStart).toBe(true);
      expect(newCall.isAudioMuted).toBe(true);

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

    it('should set recoveredCallId when no existing call (recovered attach after SDK reload)', async () => {
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
      expect(newCall.recoveredCallId).toEqual(callId);

      Call.prototype.answer = originalAnswer;
    });

    it('should not recover call by telnyx_session_id when callID differs', async () => {
      await instance.connect();
      const oldCallId = 'old-call-id-1234';
      const newCallId = 'new-call-id-5678';
      _setupCall({ id: oldCallId, telnyxSessionId: 'session-abc' });
      call.setState(State.Active);

      // Mock answer to prevent actual WebRTC peer creation
      const originalAnswer = Call.prototype.answer;
      Call.prototype.answer = jest.fn();

      // Backend's reattach identity is callID-based. telnyx_session_id is not used
      // to match Attach recovery, even if it equals the active call's session ID.
      const msg = JSON.parse(
        `{"jsonrpc":"2.0","id":4407,"method":"telnyx_rtc.attach","params":{"callID":"${newCallId}","sdp":"SDP","caller_id_name":"Extension 1004","caller_id_number":"1004","callee_id_name":"Outbound Call","callee_id_number":"1003","telnyx_session_id":"session-abc"}}`
      );
      handler.handleMessage(msg);

      expect(instance.calls[oldCallId]).toBeDefined();
      expect(instance.calls[newCallId]).toBeUndefined();
      expect(Connection.mockSend).toHaveBeenLastCalledWith({
        request: {
          jsonrpc: '2.0',
          id: 4407,
          result: { method: 'telnyx_rtc.attach' },
        },
      });

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

  /* eslint-disable @typescript-eslint/no-explicit-any */
  describe('TIMEOUT gateway state', () => {
    let onError: jest.Mock;

    beforeEach(() => {
      onError = jest.fn();
      instance.on('telnyx.error', onError);
    });

    afterEach(() => {
      instance.off('telnyx.error');
    });

    it('should emit GATEWAY_FAILED error when TIMEOUT is received', () => {
      instance.connection.previousGatewayState = '';
      const timeoutMsg = JSON.parse(
        '{"jsonrpc":"2.0","id":"gs-1","result":{"params":{"state":"TIMEOUT"},"sessid":"sess1"}}'
      );
      handler.handleMessage(timeoutMsg);

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError.mock.calls[0][0].error.code).toBe(45004);
      expect(onError.mock.calls[0][0].error.name).toBe('GATEWAY_FAILED');
    });

    it('should emit RECONNECTION_EXHAUSTED when autoReconnect is disabled and TIMEOUT is received', () => {
      (instance as any)._autoReconnect = false;
      instance.connection.previousGatewayState = '';
      const timeoutMsg = JSON.parse(
        '{"jsonrpc":"2.0","id":"gs-2","result":{"params":{"state":"TIMEOUT"},"sessid":"sess1"}}'
      );
      handler.handleMessage(timeoutMsg);

      // GATEWAY_FAILED (45004) + RECONNECTION_EXHAUSTED (45003)
      expect(onError).toHaveBeenCalledTimes(2);
      expect(onError.mock.calls[0][0].error.code).toBe(45004);
      expect(onError.mock.calls[1][0].error.code).toBe(45003);
    });

    it('should set skipLastVoiceSdkId on session options when TIMEOUT is received', () => {
      instance.connection.previousGatewayState = '';
      expect(instance.options.skipLastVoiceSdkId).toBeFalsy();
      const timeoutMsg = JSON.parse(
        '{"jsonrpc":"2.0","id":"gs-3","result":{"params":{"state":"TIMEOUT"},"sessid":"sess1"}}'
      );
      handler.handleMessage(timeoutMsg);

      expect(instance.options.skipLastVoiceSdkId).toBe(true);
    });

    it('should also set skipLastVoiceSdkId when FAILED is received', () => {
      instance.connection.previousGatewayState = '';
      const failedMsg = JSON.parse(
        '{"jsonrpc":"2.0","id":"gs-4","result":{"params":{"state":"FAILED"},"sessid":"sess1"}}'
      );
      handler.handleMessage(failedMsg);

      expect(instance.options.skipLastVoiceSdkId).toBe(true);
    });

    it('should not emit GATEWAY_FAILED on consecutive TIMEOUT states', () => {
      instance.connection.previousGatewayState = '';
      const timeoutMsg = JSON.parse(
        '{"jsonrpc":"2.0","id":"gs-5","result":{"params":{"state":"TIMEOUT"},"sessid":"sess1"}}'
      );
      handler.handleMessage(timeoutMsg);
      const firstErrorCount = onError.mock.calls.filter(
        (call: any) => call[0]?.error?.code === 45004
      ).length;

      // previousGatewayState is now set by Connection's onmessage handler,
      // but in this test we manually simulate it
      instance.connection.previousGatewayState = 'TIMEOUT';
      handler.handleMessage(timeoutMsg);
      const secondErrorCount = onError.mock.calls.filter(
        (call: any) => call[0]?.error?.code === 45004
      ).length;

      // Only one GATEWAY_FAILED should have been emitted
      expect(secondErrorCount).toBe(firstErrorCount);
    });

    it('should not reset reconnect attempts on TIMEOUT', () => {
      (instance as any)._reconnectAttempts = 3;
      instance.connection.previousGatewayState = '';
      const timeoutMsg = JSON.parse(
        '{"jsonrpc":"2.0","id":"gs-6","result":{"params":{"state":"TIMEOUT"},"sessid":"sess1"}}'
      );
      handler.handleMessage(timeoutMsg);

      // Reconnect attempts should not be reset until confirmed REGED
      expect((instance as any)._reconnectAttempts).toBe(3);
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

    let onWarning: jest.Mock;
    let onError: jest.Mock;

    beforeEach(() => {
      onWarning = jest.fn();
      onError = jest.fn();
      instance.on('telnyx.warning', onWarning);
      instance.on('telnyx.error', onError);
    });

    afterEach(() => {
      instance.off('telnyx.warning');
      instance.off('telnyx.error');
    });

    // ── Attach-before-reattached_sessions ordering ─────────────────────
    describe('attach-before-reattached_sessions ordering', () => {
      it('should recover call via attach before matching reattached_sessions arrives', async () => {
        await instance.connect();
        const callId = 'call-id-001';
        _setupCall({ id: callId, telnyxSessionId: 'session-abc' });
        call.setState(State.Active);

        // Attach arrives first
        const originalAnswer = Call.prototype.answer;
        Call.prototype.answer = jest.fn();
        sendAttach(callId, 'session-abc');
        Call.prototype.answer = originalAnswer;

        // Call should be recovered
        const newCall = instance.calls[callId];
        expect(newCall).toBeDefined();
        expect(newCall.recoveredCallId).toEqual(callId);

        // reattached_sessions contains call IDs despite the name.
        // Matching call ID should keep the recovered call.
        sendReattach([callId]);

        expect(instance.calls[callId]).toBeDefined();
      });

      it('should terminate attach-recovered call when later reattached_sessions is empty', async () => {
        await instance.connect();
        expect(Object.keys(instance.calls).length).toBe(0);

        // No active call — first attach recovers
        const originalAnswer = Call.prototype.answer;
        Call.prototype.answer = jest.fn();
        sendAttach('call-id-002', 'session-xyz');
        Call.prototype.answer = originalAnswer;
        expect(instance.calls['call-id-002']).toBeDefined();

        // Empty reattached_sessions means no calls are reattached server-side.
        sendReattach([]);

        expect(instance.calls['call-id-002']).toBeUndefined();
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({ code: 48501 }),
            callId: 'call-id-002',
          })
        );
      });
    });

    // ── Empty reattached_sessions orphan cleanup ──────────────────────
    describe('empty reattached_sessions orphan cleanup', () => {
      it('should terminate active call and emit error when reattached_sessions is empty', async () => {
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

    // ── Non-empty reattached_sessions ──────────────────────────────────
    describe('non-empty reattached_sessions', () => {
      it('should keep active call when reattached_sessions contains its callID', async () => {
        await instance.connect();
        const callId = 'call-id-020';
        _setupCall({ id: callId, telnyxSessionId: 'session-active' });
        call.setState(State.Active);

        // reattached_sessions contains call IDs despite the name.
        sendReattach([callId]);

        expect(instance.calls[callId]).toBeDefined();
      });

      it('should terminate active call when non-empty reattached_sessions has no active callID', async () => {
        await instance.connect();
        const callId = 'call-id-021';
        _setupCall({ id: callId, telnyxSessionId: 'session-active' });
        call.setState(State.Active);

        sendReattach(['different-call-id']);

        expect(instance.calls[callId]).toBeUndefined();
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({ code: 48501 }),
            callId,
          })
        );
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

    // ── telnyx_session_id is not used for attach matching ────────────────
    describe('telnyx_session_id mismatch handling', () => {
      it('should ignore attach when only telnyx_session_id matches but callID differs', async () => {
        await instance.connect();
        const oldCallId = 'old-call-id-1234';
        const newCallId = 'new-call-id-5678';
        _setupCall({ id: oldCallId, telnyxSessionId: 'session-abc' });
        call.setState(State.Active);

        const originalAnswer = Call.prototype.answer;
        Call.prototype.answer = jest.fn();
        Connection.mockSend.mockClear();

        // Backend's reattach identity is callID-based; telnyx_session_id is not used for matching.
        sendAttach(newCallId, 'session-abc');

        expect(instance.calls[oldCallId]).toBeDefined();
        expect(instance.calls[newCallId]).toBeUndefined();
        expect(Connection.mockSend).toHaveBeenLastCalledWith({
          request: {
            jsonrpc: '2.0',
            id: 1000,
            result: { method: 'telnyx_rtc.attach' },
          },
        });

        Call.prototype.answer = originalAnswer;
      });

      it('should prefer callID match over telnyx_session_id match', async () => {
        await instance.connect();
        const callId = 'call-exact-match';
        _setupCall({ id: callId, telnyxSessionId: 'session-abc' });
        call.setState(State.Active);

        const originalAnswer = Call.prototype.answer;
        Call.prototype.answer = jest.fn();

        // Attach with matching callID (also has matching session ID)
        sendAttach(callId, 'session-abc');

        // Should recover by callID match
        const newCall = instance.calls[callId];
        expect(newCall).toBeDefined();
        expect(newCall.recoveredCallId).toEqual(callId);

        Call.prototype.answer = originalAnswer;
      });
    });

    // ── Non-matching attach (callID & telnyx_session_id don't match) ──
    describe('non-matching attach (no callID or session ID match)', () => {
      it('should warn, ACK, and ignore attach when callID does not match active calls', async () => {
        await instance.connect();
        const callId = 'call-id-030';
        _setupCall({ id: callId, telnyxSessionId: 'session-active' });
        call.setState(State.Active);

        Connection.mockSend.mockClear();

        // Incoming attach with a DIFFERENT callID and DIFFERENT session ID
        sendAttach('different-call-id', 'session-different');

        // Unknown Attach is not established and does not replace the active call.
        expect(instance.calls[callId]).toBeDefined();
        expect(instance.calls['different-call-id']).toBeUndefined();
        expect(onWarning).toHaveBeenCalledWith(
          expect.objectContaining({
            warning: expect.objectContaining({ code: 35002 }),
            callId: 'different-call-id',
          })
        );
        expect(Connection.mockSend).toHaveBeenLastCalledWith({
          request: {
            jsonrpc: '2.0',
            id: 1000,
            result: { method: 'telnyx_rtc.attach' },
          },
        });
      });

      it('should NOT send BYE when ignoring non-matching attach', async () => {
        await instance.connect();
        const callId = 'call-id-nomatch-bye';
        _setupCall({ id: callId, telnyxSessionId: 'session-active' });
        call.setState(State.Active);

        Connection.mockSend.mockClear();

        // Incoming attach with a DIFFERENT callID and DIFFERENT session ID
        sendAttach('different-call-id', 'session-different');

        expect(instance.calls[callId]).toBeDefined();

        // Verify no BYE was sent
        const byeCalls = Connection.mockSend.mock.calls.filter(
          (c: { request: { method: string } }[]) =>
            c[0]?.request?.method === 'telnyx_rtc.bye'
        );
        expect(byeCalls.length).toBe(0);
      });
    });

    // ── No active call, multiple attaches ──────────────────────────────
    describe('no active call, multiple attaches', () => {
      it('should warn, ACK, and ignore second attach with a different callID', async () => {
        await instance.connect();
        expect(Object.keys(instance.calls).length).toBe(0);

        const originalAnswer = Call.prototype.answer;
        Call.prototype.answer = jest.fn();

        // First attach — recovered
        sendAttach('first-call-id', 'session-first');
        expect(instance.calls['first-call-id']).toBeDefined();
        expect(instance.calls['first-call-id'].recoveredCallId).toEqual(
          'first-call-id'
        );

        Connection.mockSend.mockClear();

        // Second attach with different callID is unknown while a call is active.
        sendAttach('second-call-id', 'session-second');

        expect(instance.calls['first-call-id']).toBeDefined();
        expect(instance.calls['second-call-id']).toBeUndefined();
        expect(onWarning).toHaveBeenCalledWith(
          expect.objectContaining({
            warning: expect.objectContaining({ code: 35002 }),
            callId: 'second-call-id',
          })
        );
        expect(Connection.mockSend).toHaveBeenLastCalledWith({
          request: {
            jsonrpc: '2.0',
            id: 1000,
            result: { method: 'telnyx_rtc.attach' },
          },
        });

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

        // Attach matches call-1 by callID
        const originalAnswer = Call.prototype.answer;
        Call.prototype.answer = jest.fn();
        sendAttach('call-1', 'session-1');
        Call.prototype.answer = originalAnswer;

        // call-1 should be recovered, call-2 should still exist
        expect(instance.calls['call-1']).toBeDefined();
        expect(instance.calls['call-1'].recoveredCallId).toEqual('call-1');
        expect(instance.calls['call-2']).toBeDefined();
      });

      it('should terminate all active calls when reattached_sessions has no active callID match', async () => {
        await instance.connect();

        const callA = new Call(instance, {
          ...DEFAULT_PARAMS,
          id: 'call-a',
        });
        callA.setState(State.Active);

        const callB = new Call(instance, {
          ...DEFAULT_PARAMS,
          id: 'call-b',
        });
        callB.setState(State.Active);

        expect(Object.keys(instance.calls).length).toBe(2);

        sendReattach(['unknown-call-id']);

        expect(instance.calls['call-a']).toBeUndefined();
        expect(instance.calls['call-b']).toBeUndefined();
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({ code: 48501 }),
            callId: 'call-a',
          })
        );
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({ code: 48501 }),
            callId: 'call-b',
          })
        );
      });

      it('should keep all active calls when reattached_sessions matches at least one active callID', async () => {
        await instance.connect();

        const callA = new Call(instance, {
          ...DEFAULT_PARAMS,
          id: 'call-a',
        });
        callA.setState(State.Active);

        const callB = new Call(instance, {
          ...DEFAULT_PARAMS,
          id: 'call-b',
        });
        callB.setState(State.Active);

        sendReattach(['call-b']);

        expect(instance.calls['call-a']).toBeDefined();
        expect(instance.calls['call-b']).toBeDefined();
        expect(onError).not.toHaveBeenCalled();
      });
    });

    // ── Page-reload recovery marker (sessionStorage-backed) ─────────────
    // After a page reload the SDK has no in-memory calls, so the in-process
    // reattach block above does not run. These tests verify the persisted
    // recovery marker path: saved markers are compared against
    // reattached_sessions for the current session id and SESSION_NOT_REATTACHED
    // is emitted for missing calls. The marker is consumed exactly once.
    describe('page-reload recovery marker', () => {
      beforeEach(() => {
        clearActiveCallsRecoveryMarker();
      });

      afterEach(() => {
        clearActiveCallsRecoveryMarker();
      });

      const setSession = (sessid: string) => {
        (instance as any).sessionid = sessid;
      };

      const sendReattachForSession = (
        reattachedSessions: string[]
      ) => {
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

      it('emits SESSION_NOT_REATTACHED once for a saved call missing from reattached_sessions (same sessid)', async () => {
        await instance.connect();
        setSession('sess-reload');

        // Simulate a marker written before the previous page unloaded.
        // The entire Call object is saved; telnyxSessionId/telnyxCallControlId
        // live inside options.
        setActiveCallsRecoveryMarker(
          [
            {
              id: 'lost-call',
              state: 'active',
              direction: 'outbound',
              options: {
                telnyxSessionId: 'tsid-lost',
                telnyxCallControlId: 'ccid-lost',
              },
            },
          ],
          'sess-reload'
        );

        // No in-memory calls and reattached_sessions is empty.
        sendReattachForSession([]);

        expect(onError).toHaveBeenCalledTimes(1);
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({ code: 48501 }),
            callId: 'lost-call',
            sessionId: 'sess-reload',
            telnyxSessionId: 'tsid-lost',
            telnyxCallControlId: 'ccid-lost',
          })
        );

        // Marker must be cleared after consumption.
        expect(getActiveCallsRecoveryMarker().markers.length).toBe(0);
      });

      it('does NOT emit an error when the saved marker sessid differs from the current session', async () => {
        await instance.connect();
        setSession('sess-current');

        setActiveCallsRecoveryMarker(
          [{ id: 'other-session-call', state: 'active' }],
          'sess-different'
        );

        sendReattachForSession([]);

        expect(onError).not.toHaveBeenCalled();
        // Storage is cleared (getActiveCallsRecoveryMarker clears on read).
        expect(getActiveCallsRecoveryMarker().markers.length).toBe(0);
      });

      it('does NOT emit an error when the saved call is present in reattached_sessions (recovered)', async () => {
        await instance.connect();
        setSession('sess-recovered');

        setActiveCallsRecoveryMarker(
          [{ id: 'recovered-call', state: 'active' }],
          'sess-recovered'
        );

        sendReattachForSession(['recovered-call']);

        expect(onError).not.toHaveBeenCalled();
        expect(getActiveCallsRecoveryMarker().markers.length).toBe(0);
      });

      it('does NOT emit an error and clears storage for stale markers (>30 min)', async () => {
        await instance.connect();
        setSession('sess-stale');

        const staleTime = Date.now() - (RECOVERY_MARKER_MAX_AGE_MS + 1000);
        setActiveCallsRecoveryMarker(
          [{ id: 'stale-call', state: 'active' }],
          'sess-stale',
          staleTime
        );

        sendReattachForSession([]);

        expect(onError).not.toHaveBeenCalled();
        expect(getActiveCallsRecoveryMarker().markers.length).toBe(0);
      });

      it('does NOT emit an error and does not mutate storage when there are no saved markers', async () => {
        await instance.connect();
        setSession('sess-empty');

        sendReattachForSession([]);

        expect(onError).not.toHaveBeenCalled();
        expect(getActiveCallsRecoveryMarker().markers.length).toBe(0);
      });

      it('emits at most one notification per saved call across duplicate reattach events (cleanup-after-read)', async () => {
        await instance.connect();
        setSession('sess-dedup');

        setActiveCallsRecoveryMarker(
          [{ id: 'dup-call', state: 'active' }],
          'sess-dedup'
        );

        // First reattach — should emit once and clear storage.
        sendReattachForSession([]);
        expect(onError).toHaveBeenCalledTimes(1);

        // Second reattach (duplicate event) — storage is empty, no new error.
        sendReattachForSession([]);
        expect(onError).toHaveBeenCalledTimes(1);

        expect(getActiveCallsRecoveryMarker().markers.length).toBe(0);
      });

      it('does NOT hang up any call represented by saved markers (notification-only)', async () => {
        await instance.connect();
        setSession('sess-no-hangup');

        setActiveCallsRecoveryMarker(
          [{ id: 'marker-only-call', state: 'active' }],
          'sess-no-hangup'
        );

        Connection.mockSend.mockClear();
        sendReattachForSession([]);

        expect(onError).toHaveBeenCalledTimes(1);

        // No BYE should be sent for the marker-only call.
        const byeCalls = Connection.mockSend.mock.calls.filter(
          (c: { request: { method: string } }[]) =>
            c[0]?.request?.method === 'telnyx_rtc.bye'
        );
        expect(byeCalls.length).toBe(0);
      });

      it('emits SESSION_NOT_REATTACHED for each of multiple saved missing calls', async () => {
        await instance.connect();
        setSession('sess-multi');

        // All markers share the same sessid (stored once at the array level).
        // A marker with a different sessid is now handled by the array-level
        // sessid check — since all markers in this array share sess-multi,
        // all are evaluated against reattached_sessions.
        setActiveCallsRecoveryMarker(
          [
            { id: 'lost-1', state: 'active' },
            { id: 'lost-2', state: 'active' },
          ],
          'sess-multi'
        );

        sendReattachForSession(['recovered-elsewhere']);

        expect(onError).toHaveBeenCalledTimes(2);
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({ callId: 'lost-1' })
        );
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({ callId: 'lost-2' })
        );
        expect(getActiveCallsRecoveryMarker().markers.length).toBe(0);
      });
    });
  });
});
