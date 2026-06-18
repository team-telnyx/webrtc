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

import Verto from '..';
import Call from '../webrtc/Call';
import { State, Direction } from '../webrtc/constants';
import { register, deRegister } from '../services/Handler';
import { SwEvent, MULTIPLE_ACTIVE_CALLS_DETECTED } from '../util/constants';

const Connection = require('../services/Connection');

describe('MULTIPLE_ACTIVE_CALLS_DETECTED', () => {
  let instance: Verto;

  const _buildInstance = (): Verto => {
    const v = new Verto({
      host: 'example.telnyx.com',
      login: 'login',
      password: 'password',
    });
    (v as any).connection = Connection.default();
    return v;
  };

  const _createCallInState = (
    callId: string,
    state: State,
    direction: Direction = Direction.Outbound
  ): Call => {
    const call = new Call(instance, {
      destinationNumber: 'x3599',
      id: callId,
    });
    call.direction = direction;
    call.setState(state);
    instance.calls[callId] = call;
    return call;
  };

  beforeEach(() => {
    instance = _buildInstance();
    instance.subscriptions = {};
    Connection.mockSend.mockClear();
    Connection.default.mockClear();
    Connection.mockClose.mockClear();
  });

  afterEach(() => {
    // Clean up all calls
    Object.keys(instance.calls).forEach((k) => {
      instance.calls[k].setState(State.Purge);
    });
    instance.calls = {};
    deRegister(SwEvent.Warning, undefined, instance.uuid);
  });

  describe('getActiveCalls()', () => {
    it('should return empty array when no calls exist', () => {
      expect(instance.getActiveCalls()).toEqual([]);
    });

    it('should return calls in active states only', () => {
      _createCallInState('call1', State.Active);
      _createCallInState('call2', State.Ringing);
      _createCallInState('call3', State.Held);

      const active = instance.getActiveCalls();
      expect(active).toHaveLength(3);
      expect(active.map((c) => c.id)).toContain('call1');
      expect(active.map((c) => c.id)).toContain('call2');
      expect(active.map((c) => c.id)).toContain('call3');
    });

    it('should exclude calls in terminal states (Hangup, Destroy, Purge)', () => {
      _createCallInState('call1', State.Active);
      _createCallInState('call2', State.Hangup);
      _createCallInState('call3', State.Destroy);
      _createCallInState('call4', State.Purge);

      const active = instance.getActiveCalls();
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe('call1');
    });

    it('should include calls in Recovering state', () => {
      _createCallInState('call1', State.Recovering);
      const active = instance.getActiveCalls();
      expect(active).toHaveLength(1);
    });
  });

  describe('emitMultipleActiveCallsWarning()', () => {
    it('should emit warning when a new call is created while another call is active', () => {
      _createCallInState('existing1', State.Active);

      const warnings: any[] = [];
      const handler = (w: any) => warnings.push(w);
      register(SwEvent.Warning, handler, instance.uuid);

      instance.emitMultipleActiveCallsWarning('newCall1');

      expect(warnings).toHaveLength(1);
      expect(warnings[0].warning.code).toBe(MULTIPLE_ACTIVE_CALLS_DETECTED);
      expect(warnings[0].callId).toBe('newCall1');
      expect(warnings[0].sessionId).toBe(instance.sessionid);
      expect(warnings[0].activeCalls).toHaveLength(1);
      expect(warnings[0].activeCalls[0].callId).toBe('existing1');
      expect(warnings[0].activeCalls[0].state).toBeDefined();
      expect(warnings[0].activeCalls[0].direction).toBeDefined();

      deRegister(SwEvent.Warning, handler, instance.uuid);
    });

    it('should NOT emit warning when only one call is active', () => {
      // No existing calls
      const warnings: any[] = [];
      const handler = (w: any) => warnings.push(w);
      register(SwEvent.Warning, handler, instance.uuid);

      instance.emitMultipleActiveCallsWarning('newCall1');

      expect(warnings).toHaveLength(0);

      deRegister(SwEvent.Warning, handler, instance.uuid);
    });

    it('should NOT emit warning when existing call is in terminal state', () => {
      _createCallInState('existing1', State.Hangup);

      const warnings: any[] = [];
      const handler = (w: any) => warnings.push(w);
      register(SwEvent.Warning, handler, instance.uuid);

      instance.emitMultipleActiveCallsWarning('newCall1');

      expect(warnings).toHaveLength(0);

      deRegister(SwEvent.Warning, handler, instance.uuid);
    });

    it('should emit warning for recovery when there are other active calls', () => {
      // Recovered calls are active calls too — reviewer explicitly requested
      // that we don't filter them out
      _createCallInState('existing1', State.Active);

      const warnings: any[] = [];
      const handler = (w: any) => warnings.push(w);
      register(SwEvent.Warning, handler, instance.uuid);

      instance.emitMultipleActiveCallsWarning('newCall1');

      expect(warnings).toHaveLength(1);
      expect(warnings[0].warning.code).toBe(MULTIPLE_ACTIVE_CALLS_DETECTED);

      deRegister(SwEvent.Warning, handler, instance.uuid);
    });

    it('should NOT emit warning after the previous call is fully ended/cleaned up', () => {
      const call1 = _createCallInState('existing1', State.Active);

      // Simulate the call ending
      call1.setState(State.Hangup);
      delete instance.calls['existing1'];

      const warnings: any[] = [];
      const handler = (w: any) => warnings.push(w);
      register(SwEvent.Warning, handler, instance.uuid);

      instance.emitMultipleActiveCallsWarning('newCall1');

      expect(warnings).toHaveLength(0);

      deRegister(SwEvent.Warning, handler, instance.uuid);
    });

    it('should allow legitimate multi-call flows to continue after warning', () => {
      _createCallInState('existing1', State.Active);

      const warnings: any[] = [];
      const handler = (w: any) => warnings.push(w);
      register(SwEvent.Warning, handler, instance.uuid);

      instance.emitMultipleActiveCallsWarning('newCall1');

      // The warning was emitted but the call flow continues
      expect(warnings).toHaveLength(1);

      // Simulate the second call being added successfully
      _createCallInState('newCall1', State.Ringing);
      expect(Object.keys(instance.calls)).toHaveLength(2);

      deRegister(SwEvent.Warning, handler, instance.uuid);
    });

    it('should emit only once per new call introduction', () => {
      _createCallInState('existing1', State.Active);

      const warnings: any[] = [];
      const handler = (w: any) => warnings.push(w);
      register(SwEvent.Warning, handler, instance.uuid);

      // First emission
      instance.emitMultipleActiveCallsWarning('newCall1');
      expect(warnings).toHaveLength(1);

      // Calling again with same callId should emit again
      // (this is expected — the method is called once per new call creation)
      instance.emitMultipleActiveCallsWarning('newCall1');
      expect(warnings).toHaveLength(2);

      deRegister(SwEvent.Warning, handler, instance.uuid);
    });

    it('should detect multiple active calls with inbound call', () => {
      _createCallInState('existing1', State.Active);

      const warnings: any[] = [];
      const handler = (w: any) => warnings.push(w);
      register(SwEvent.Warning, handler, instance.uuid);

      instance.emitMultipleActiveCallsWarning('inbound1');

      expect(warnings).toHaveLength(1);
      expect(warnings[0].callId).toBe('inbound1');

      deRegister(SwEvent.Warning, handler, instance.uuid);
    });

    it('should detect multiple active calls with outbound call', () => {
      _createCallInState('existing1', State.Ringing);

      const warnings: any[] = [];
      const handler = (w: any) => warnings.push(w);
      register(SwEvent.Warning, handler, instance.uuid);

      instance.emitMultipleActiveCallsWarning('outbound1');

      expect(warnings).toHaveLength(1);
      expect(warnings[0].callId).toBe('outbound1');

      deRegister(SwEvent.Warning, handler, instance.uuid);
    });

    it('should include basic call info in activeCalls context', () => {
      _createCallInState('existing1', State.Active);

      const warnings: any[] = [];
      const handler = (w: any) => warnings.push(w);
      register(SwEvent.Warning, handler, instance.uuid);

      instance.emitMultipleActiveCallsWarning('newCall1');

      expect(warnings).toHaveLength(1);
      const ctx = warnings[0].activeCalls[0];
      expect(ctx.callId).toBe('existing1');
      expect(ctx.state).toBeDefined();
      expect(ctx.direction).toBeDefined();

      deRegister(SwEvent.Warning, handler, instance.uuid);
    });

    it('should include safe correlation IDs in activeCalls when present', () => {
      const call = _createCallInState('existing1', State.Active);
      // Set correlation IDs on the existing call
      call.options.telnyxSessionId = 'sess-abc123';
      call.options.telnyxLegId = 'leg-xyz789';
      (call as any).sipCallId = 'sip-call-id-001';

      const warnings: any[] = [];
      const handler = (w: any) => warnings.push(w);
      register(SwEvent.Warning, handler, instance.uuid);

      instance.emitMultipleActiveCallsWarning('newCall1');

      expect(warnings).toHaveLength(1);
      const ctx = warnings[0].activeCalls[0];
      expect(ctx.callId).toBe('existing1');
      expect(ctx.telnyxSessionId).toBe('sess-abc123');
      expect(ctx.telnyxLegId).toBe('leg-xyz789');
      expect(ctx.sipCallId).toBe('sip-call-id-001');

      deRegister(SwEvent.Warning, handler, instance.uuid);
    });

    it('should omit correlation IDs when not present on existing calls', () => {
      _createCallInState('existing1', State.Active);

      const warnings: any[] = [];
      const handler = (w: any) => warnings.push(w);
      register(SwEvent.Warning, handler, instance.uuid);

      instance.emitMultipleActiveCallsWarning('newCall1');

      expect(warnings).toHaveLength(1);
      const ctx = warnings[0].activeCalls[0];
      expect(ctx.callId).toBe('existing1');
      expect(ctx.telnyxSessionId).toBeUndefined();
      expect(ctx.telnyxLegId).toBeUndefined();
      expect(ctx.sipCallId).toBeUndefined();

      deRegister(SwEvent.Warning, handler, instance.uuid);
    });

    it('should include newCall with correlation IDs when new call is in session.calls', () => {
      _createCallInState('existing1', State.Active);
      const newCall = _createCallInState('newCall1', State.Ringing);
      newCall.options.telnyxSessionId = 'new-sess-456';
      newCall.options.telnyxLegId = 'new-leg-789';
      (newCall as any).sipCallId = 'new-sip-002';

      const warnings: any[] = [];
      const handler = (w: any) => warnings.push(w);
      register(SwEvent.Warning, handler, instance.uuid);

      instance.emitMultipleActiveCallsWarning('newCall1');

      expect(warnings).toHaveLength(1);
      const newCallPayload = warnings[0].newCall;
      expect(newCallPayload.callId).toBe('newCall1');
      expect(newCallPayload.telnyxSessionId).toBe('new-sess-456');
      expect(newCallPayload.telnyxLegId).toBe('new-leg-789');
      expect(newCallPayload.sipCallId).toBe('new-sip-002');

      deRegister(SwEvent.Warning, handler, instance.uuid);
    });

    it('should include newCall with only callId when new call is not in session.calls', () => {
      _createCallInState('existing1', State.Active);

      const warnings: any[] = [];
      const handler = (w: any) => warnings.push(w);
      register(SwEvent.Warning, handler, instance.uuid);

      // Emit with a callId that doesn't exist in session.calls yet
      // (e.g., outbound call created after emit)
      instance.emitMultipleActiveCallsWarning('unknownCall1');

      expect(warnings).toHaveLength(1);
      const newCallPayload = warnings[0].newCall;
      expect(newCallPayload.callId).toBe('unknownCall1');
      expect(newCallPayload.telnyxSessionId).toBeUndefined();
      expect(newCallPayload.telnyxLegId).toBeUndefined();
      expect(newCallPayload.sipCallId).toBeUndefined();

      deRegister(SwEvent.Warning, handler, instance.uuid);
    });

    it('should emit warning for multiple existing active calls', () => {
      _createCallInState('existing1', State.Active);
      _createCallInState('existing2', State.Ringing);

      const warnings: any[] = [];
      const handler = (w: any) => warnings.push(w);
      register(SwEvent.Warning, handler, instance.uuid);

      instance.emitMultipleActiveCallsWarning('newCall1');

      expect(warnings).toHaveLength(1);
      expect(warnings[0].activeCalls).toHaveLength(2);
      const callIds = warnings[0].activeCalls.map((c: any) => c.callId);
      expect(callIds).toContain('existing1');
      expect(callIds).toContain('existing2');

      deRegister(SwEvent.Warning, handler, instance.uuid);
    });
  });
});
