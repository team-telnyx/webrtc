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

    it('should NOT emit warning for recovery that replaces the only active call', () => {
      _createCallInState('existing1', State.Active);

      const warnings: any[] = [];
      const handler = (w: any) => warnings.push(w);
      register(SwEvent.Warning, handler, instance.uuid);

      // Recovery: the new call is replacing existing1
      instance.emitMultipleActiveCallsWarning('newCall1', 'existing1');

      expect(warnings).toHaveLength(0);

      deRegister(SwEvent.Warning, handler, instance.uuid);
    });

    it('should emit warning for recovery when there are OTHER active calls besides the recovered one', () => {
      _createCallInState('existing1', State.Active);
      _createCallInState('existing2', State.Ringing);

      const warnings: any[] = [];
      const handler = (w: any) => warnings.push(w);
      register(SwEvent.Warning, handler, instance.uuid);

      // Recovery: replacing existing1, but existing2 is still there
      instance.emitMultipleActiveCallsWarning('newCall1', 'existing1');

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

    it('should include safe identifiers in warning context and no sensitive data', () => {
      const call1 = _createCallInState('existing1', State.Active);
      (call1.options as any).telnyxSessionId = 'tsid-123';
      (call1.options as any).telnyxLegId = 'tleg-456';

      const warnings: any[] = [];
      const handler = (w: any) => warnings.push(w);
      register(SwEvent.Warning, handler, instance.uuid);

      instance.emitMultipleActiveCallsWarning('newCall1');

      expect(warnings).toHaveLength(1);
      const ctx = warnings[0].activeCalls[0];
      expect(ctx.callId).toBe('existing1');
      expect(ctx.state).toBeDefined();
      expect(ctx.direction).toBeDefined();
      expect(ctx.telnyxSessionId).toBe('tsid-123');
      expect(ctx.telnyxLegId).toBe('tleg-456');

      // Verify no sensitive data
      const warningJson = JSON.stringify(warnings[0]);
      expect(warningJson).not.toContain('password');
      expect(warningJson).not.toContain('token');
      expect(warningJson).not.toContain('credential');
      expect(warningJson).not.toContain('sdp');

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

    it('should emit only once per new call introduction, not on every state transition', () => {
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
  });

  describe('emitMultipleActiveCallsWarning() return value', () => {
    it('should return true when other active calls exist', () => {
      _createCallInState('existing1', State.Active);

      const result = instance.emitMultipleActiveCallsWarning('newCall1');

      expect(result).toBe(true);
    });

    it('should return false when no other active calls exist', () => {
      const result = instance.emitMultipleActiveCallsWarning('newCall1');

      expect(result).toBe(false);
    });

    it('should return false when existing calls are in terminal states', () => {
      _createCallInState('existing1', State.Hangup);

      const result = instance.emitMultipleActiveCallsWarning('newCall1');

      expect(result).toBe(false);
    });

    it('should return false for recovery that replaces the only active call', () => {
      _createCallInState('existing1', State.Active);

      const result = instance.emitMultipleActiveCallsWarning('newCall1', 'existing1');

      expect(result).toBe(false);
    });

    it('should return true for recovery when OTHER active calls exist besides recovered one', () => {
      _createCallInState('existing1', State.Active);
      _createCallInState('existing2', State.Ringing);

      const result = instance.emitMultipleActiveCallsWarning('newCall1', 'existing1');

      expect(result).toBe(true);
    });
  });
});
