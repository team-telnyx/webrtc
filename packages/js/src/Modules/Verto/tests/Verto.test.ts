import behaveLikeBaseSession from './behaveLike/BaseSession.spec';
import { isQueued } from '../services/Handler';
import Verto, { VERTO_PROTOCOL } from '..';
import { IVertoOptions } from '../util/interfaces';
import { IWebRTCCall } from '../webrtc/interfaces';
import {
  DEFAULT_DEV_ICE_SERVERS,
  DEFAULT_PROD_ICE_SERVERS,
} from '../util/constants';
import {
  clearReconnectToken,
  getReconnectSessionId,
  getReconnectToken,
  RECONNECT_SESSION_ID_MAX_AGE_MS,
  setReconnectSessionId,
  setReconnectToken,
  getActiveCallsRecoveryMarker,
  setActiveCallsRecoveryMarker,
  clearActiveCallsRecoveryMarker,
  type IStoredActiveCall,
} from '../util/reconnect';

const Connection = require('../services/Connection');

describe('Verto', () => {
  const _buildInstance = (props: IVertoOptions): Verto => {
    const instance: Verto = new Verto(props);
    instance.connection = Connection.default();
    return instance;
  };
  let instance: Verto = null;

  const noop = (): void => {};

  beforeAll(() => {
    behaveLikeBaseSession.call(
      this,
      _buildInstance({
        host: 'example.telnyx.com',
        login: 'login',
        password: 'password',
      })
    );
    //VertoHandler.call(this, Verto)
    //LayoutHandler.call(this, Verto)
  });

  beforeEach(() => {
    instance = _buildInstance({
      host: 'example.telnyx.com',
      login: 'login',
      password: 'password',
    });
    instance.subscriptions = {};
    Connection.mockSend.mockClear();
    Connection.default.mockClear();
    Connection.mockClose.mockClear();
    clearReconnectToken();
  });

  it('should instantiate Verto with default methods', () => {
    expect(instance).toBeInstanceOf(Verto);
  });

  describe('beforeunload hangup', () => {
    it('should attempt a BYE for active calls and clear reconnect token on page unload by default', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      addEventListenerSpy.mockClear();
      setReconnectToken('voice-sdk-id');
      setReconnectSessionId('previous-sessid');

      const telnyxRTC = _buildInstance({
        host: 'example.telnyx.com',
        login: 'login',
        password: 'password',
      });
      const hangup = jest.fn();
      telnyxRTC.calls = {
        callA: { hangup } as unknown as IWebRTCCall,
      };

      const beforeUnloadHandler = addEventListenerSpy.mock.calls.find(
        ([eventName]) => eventName === 'beforeunload'
      )?.[1] as EventListener;

      expect(beforeUnloadHandler).toBeDefined();
      beforeUnloadHandler(new Event('beforeunload'));

      expect(hangup).toHaveBeenCalledWith(
        { initiator: 'sdk:beforeunload' },
        true
      );
      expect(getReconnectToken()).toBeNull();
      expect(getReconnectSessionId()).toBeNull();

      addEventListenerSpy.mockRestore();
      clearReconnectToken();
    });

    it('should clear reconnect token and sessid on page unload when hangupOnBeforeUnload is true', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      addEventListenerSpy.mockClear();
      setReconnectToken('voice-sdk-id');
      setReconnectSessionId('previous-sessid');

      const telnyxRTC = _buildInstance({
        host: 'example.telnyx.com',
        login: 'login',
        password: 'password',
        hangupOnBeforeUnload: true,
      });
      const hangup = jest.fn();
      telnyxRTC.calls = {
        callA: { hangup } as unknown as IWebRTCCall,
      };

      const beforeUnloadHandler = addEventListenerSpy.mock.calls.find(
        ([eventName]) => eventName === 'beforeunload'
      )?.[1] as EventListener;

      expect(beforeUnloadHandler).toBeDefined();
      beforeUnloadHandler(new Event('beforeunload'));

      expect(hangup).toHaveBeenCalledWith(
        { initiator: 'sdk:beforeunload' },
        true
      );
      expect(getReconnectToken()).toBeNull();
      expect(getReconnectSessionId()).toBeNull();

      addEventListenerSpy.mockRestore();
      clearReconnectToken();
    });

    it('should allow applications to disable page unload BYE without clearing reconnect token', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      addEventListenerSpy.mockClear();
      setReconnectToken('voice-sdk-id');
      setReconnectSessionId('previous-sessid');

      _buildInstance({
        host: 'example.telnyx.com',
        login: 'login',
        password: 'password',
        hangupOnBeforeUnload: false,
      });

      // A single beforeunload listener is registered (merged handler).
      const beforeUnloadCalls = addEventListenerSpy.mock.calls.filter(
        ([eventName]) => eventName === 'beforeunload'
      );
      expect(beforeUnloadCalls.length).toBe(1);

      expect(getReconnectToken()).toBe('voice-sdk-id');
      expect(getReconnectSessionId()).toBe('previous-sessid');

      addEventListenerSpy.mockRestore();
      clearReconnectToken();
      clearActiveCallsRecoveryMarker();
    });

    it('should save recovery markers for active calls before unload when hangupOnBeforeUnload is false', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      addEventListenerSpy.mockClear();
      clearActiveCallsRecoveryMarker();

      const telnyxRTC = _buildInstance({
        host: 'example.telnyx.com',
        login: 'login',
        password: 'password',
        hangupOnBeforeUnload: false,
      });

      // Simulate a logged-in session with active calls. The save path
      // (Verto/index.ts beforeunload handler) projects each active call to a
      // narrow shape (`id` + `options.customHeaders`).
      telnyxRTC.sessionid = 'session-abc';
      const hangup = jest.fn();
      telnyxRTC.calls = {
        'call-1': {
          id: 'call-1',
          hangup,
          state: 'active',
          direction: 'outbound',
          session: {}, // not persisted — narrow projection drops it
          peer: {}, // not persisted — narrow projection drops it
          options: {
            customHeaders: [{ name: 'X-Test', value: '1' }],
          },
        } as unknown as IWebRTCCall,
        'call-2': {
          id: 'call-2',
          hangup,
          state: 'active',
          direction: 'inbound',
          session: {}, // not persisted — narrow projection drops it
          peer: {}, // not persisted — narrow projection drops it
          options: {},
        } as unknown as IWebRTCCall,
      };

      const beforeUnloadHandler = addEventListenerSpy.mock.calls.find(
        ([eventName]) => eventName === 'beforeunload'
      )?.[1] as EventListener;

      expect(beforeUnloadHandler).toBeDefined();
      beforeUnloadHandler(new Event('beforeunload'));

      // No hangup is called in this branch.
      expect(hangup).not.toHaveBeenCalled();

      const result = getActiveCallsRecoveryMarker();
      expect(result!.calls.length).toBe(2);
      expect(result!.sessionId).toBe('session-abc');

      const ids = result!.calls.map((m) => m.id).sort();
      expect(ids).toEqual(['call-1', 'call-2']);

      const m1 = result!.calls.find((m) => m.id === 'call-1');
      expect(m1!.id).toBe('call-1');
      // Only the narrow projection is persisted: id + customHeaders.
      // State, direction, session, peer are all dropped by the projection.
      expect(m1!.customHeaders).toEqual([{ name: 'X-Test', value: '1' }]);

      // call-2 had no custom headers — `customHeaders` is undefined.
      const m2 = result!.calls.find((m) => m.id === 'call-2');
      expect(m2!.id).toBe('call-2');
      expect(m2!.customHeaders).toBeUndefined();

      // The narrow projection excludes sensitive / host fields — only id
      // and customHeaders are persisted. No session, peer, state,
      // direction, localStream, remoteStream, iceServers, options.
      const serialized = JSON.stringify(result!.calls[0]);
      expect(serialized).not.toContain('"session"');
      expect(serialized).not.toContain('"peer"');
      expect(serialized).not.toContain('"state"');
      expect(serialized).not.toContain('"direction"');
      expect(serialized).not.toContain('"localStream"');
      expect(serialized).not.toContain('"iceServers"');
      expect(serialized).toContain('"customHeaders"');
      // The legacy correlation-id fields are NOT part of the narrow
      // projection (the producer maps only `customHeaders`).
      expect(serialized).not.toContain('"options"');
      expect(serialized).not.toContain('"telnyxSessionId"');

      addEventListenerSpy.mockRestore();
      clearActiveCallsRecoveryMarker();
    });

    it('should clear any stale recovery marker when hangupOnBeforeUnload is false and there are no active calls', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      addEventListenerSpy.mockClear();

      // Pre-seed a stale marker from a previous page.
      setActiveCallsRecoveryMarker(
        [
          { id: 'stale-call', state: 'active', options: {} },
        ] as unknown as IStoredActiveCall[],
        'old-session'
      );
      const seeded = getActiveCallsRecoveryMarker();
      expect(seeded).not.toBeNull();
      expect(seeded!.calls.length).toBe(1);

      // Re-seed since getActiveCallsRecoveryMarker clears on read.
      setActiveCallsRecoveryMarker(
        [
          { id: 'stale-call', state: 'active', options: {} },
        ] as unknown as IStoredActiveCall[],
        'old-session'
      );

      const telnyxRTC = _buildInstance({
        host: 'example.telnyx.com',
        login: 'login',
        password: 'password',
        hangupOnBeforeUnload: false,
      });
      // No sessionid and no active calls.
      telnyxRTC.sessionid = '';
      telnyxRTC.calls = {};

      const beforeUnloadHandler = addEventListenerSpy.mock.calls.find(
        ([eventName]) => eventName === 'beforeunload'
      )?.[1] as EventListener;
      beforeUnloadHandler(new Event('beforeunload'));

      // Stale marker should have been wiped.
      expect(getActiveCallsRecoveryMarker()).toBeNull();

      addEventListenerSpy.mockRestore();
      clearActiveCallsRecoveryMarker();
    });

    it('should NOT write a recovery marker when hangupOnBeforeUnload is not false (default branch)', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      addEventListenerSpy.mockClear();
      clearActiveCallsRecoveryMarker();

      const telnyxRTC = _buildInstance({
        host: 'example.telnyx.com',
        login: 'login',
        password: 'password',
        // default hangupOnBeforeUnload
      });
      telnyxRTC.sessionid = 'session-default';
      telnyxRTC.calls = {
        'call-x': {
          id: 'call-x',
          hangup: jest.fn(),
          state: 'active',
          options: {},
        } as unknown as IWebRTCCall,
      };

      const beforeUnloadHandler = addEventListenerSpy.mock.calls.find(
        ([eventName]) => eventName === 'beforeunload'
      )?.[1] as EventListener;
      beforeUnloadHandler(new Event('beforeunload'));

      // Default branch hangs up and clears the reconnect token — no marker.
      expect(getActiveCallsRecoveryMarker()).toBeNull();

      addEventListenerSpy.mockRestore();
      clearReconnectToken();
      clearActiveCallsRecoveryMarker();
    });
  });

  describe('visibilitychange session-id re-stamp', () => {
    const STORED_AT_KEY = 'telnyx-voice-sdk-session-id-stored-at';

    const setVisibility = (state: 'visible' | 'hidden') => {
      Object.defineProperty(document, 'visibilityState', {
        value: state,
        configurable: true,
      });
    };

    // Build an instance and return its registered visibilitychange handler.
    const buildWithVisHandler = (
      props: Partial<IVertoOptions>
    ): { instance: Verto; handler: EventListener; restore: () => void } => {
      const spy = jest.spyOn(document, 'addEventListener');
      spy.mockClear();
      const instance = _buildInstance({
        host: 'example.telnyx.com',
        login: 'login',
        password: 'password',
        ...props,
      } as IVertoOptions);
      const handler = spy.mock.calls.find(
        ([eventName]) => eventName === 'visibilitychange'
      )?.[1] as EventListener;
      return { instance, handler, restore: () => spy.mockRestore() };
    };

    afterEach(() => {
      // Restore jsdom's default visibility and clear storage between tests.
      delete (document as unknown as { visibilityState?: string })
        .visibilityState;
      clearReconnectToken();
    });

    it('re-stamps freshness when the page is hidden with an active call (hangupOnBeforeUnload=false)', () => {
      const { instance, handler, restore } = buildWithVisHandler({
        hangupOnBeforeUnload: false,
      });
      expect(handler).toBeDefined();

      instance.sessionid = 'session-abc';
      instance.hasActiveCall = jest.fn(() => true);
      const oldStoredAt = Date.now() - 80 * 1000;
      setReconnectSessionId('session-abc', oldStoredAt);

      setVisibility('hidden');
      handler(new Event('visibilitychange'));

      expect(Number(sessionStorage.getItem(STORED_AT_KEY))).toBeGreaterThan(
        oldStoredAt
      );
      expect(getReconnectSessionId()).toBe('session-abc');
      restore();
    });

    it('does not re-stamp while the page is still visible', () => {
      const { instance, handler, restore } = buildWithVisHandler({
        hangupOnBeforeUnload: false,
      });
      instance.sessionid = 'session-abc';
      instance.hasActiveCall = jest.fn(() => true);
      const oldStoredAt = Date.now() - 80 * 1000;
      setReconnectSessionId('session-abc', oldStoredAt);

      setVisibility('visible');
      handler(new Event('visibilitychange'));

      expect(Number(sessionStorage.getItem(STORED_AT_KEY))).toBe(oldStoredAt);
      restore();
    });

    it('does not re-stamp when there is no active call', () => {
      const { instance, handler, restore } = buildWithVisHandler({
        hangupOnBeforeUnload: false,
      });
      instance.sessionid = 'session-abc';
      instance.hasActiveCall = jest.fn(() => false);
      const oldStoredAt = Date.now() - 80 * 1000;
      setReconnectSessionId('session-abc', oldStoredAt);

      setVisibility('hidden');
      handler(new Event('visibilitychange'));

      expect(Number(sessionStorage.getItem(STORED_AT_KEY))).toBe(oldStoredAt);
      restore();
    });

    it('does not re-stamp when hangupOnBeforeUnload is not false', () => {
      const { instance, handler, restore } = buildWithVisHandler({});
      instance.sessionid = 'session-abc';
      instance.hasActiveCall = jest.fn(() => true);
      const oldStoredAt = Date.now() - 80 * 1000;
      setReconnectSessionId('session-abc', oldStoredAt);

      setVisibility('hidden');
      handler(new Event('visibilitychange'));

      expect(Number(sessionStorage.getItem(STORED_AT_KEY))).toBe(oldStoredAt);
      restore();
    });
  });

  describe('visibilitychange call-report flush', () => {
    const setVisibility = (state: 'visible' | 'hidden') => {
      Object.defineProperty(document, 'visibilityState', {
        value: state,
        configurable: true,
      });
    };

    const buildWithVisHandler = (props: Partial<IVertoOptions>) => {
      const spy = jest.spyOn(document, 'addEventListener');
      spy.mockClear();
      const instance = _buildInstance({
        host: 'example.telnyx.com',
        login: 'login',
        password: 'password',
        ...props,
      } as IVertoOptions);
      const handler = spy.mock.calls.find(
        ([eventName]) => eventName === 'visibilitychange'
      )?.[1] as EventListener;
      return { instance, handler, restore: () => spy.mockRestore() };
    };

    afterEach(() => {
      delete (document as unknown as { visibilityState?: string })
        .visibilityState;
    });

    it('flushes a page-hidden report for active calls when hidden (hangupOnBeforeUnload=false)', () => {
      const { instance, handler, restore } = buildWithVisHandler({
        hangupOnBeforeUnload: false,
      });
      expect(handler).toBeDefined();

      const flush = jest.fn();
      instance.hasActiveCall = jest.fn(() => true);
      instance.calls = {
        'call-1': {
          id: 'call-1',
          flushIntermediateCallReport: flush,
        } as unknown as IWebRTCCall,
      };

      setVisibility('hidden');
      handler(new Event('visibilitychange'));

      expect(flush).toHaveBeenCalledTimes(1);
      expect(flush).toHaveBeenCalledWith({ type: 'page-hidden' });
      restore();
    });

    it('does not flush while the page is still visible', () => {
      const { instance, handler, restore } = buildWithVisHandler({
        hangupOnBeforeUnload: false,
      });
      const flush = jest.fn();
      instance.hasActiveCall = jest.fn(() => true);
      instance.calls = {
        'call-1': {
          id: 'call-1',
          flushIntermediateCallReport: flush,
        } as unknown as IWebRTCCall,
      };

      setVisibility('visible');
      handler(new Event('visibilitychange'));

      expect(flush).not.toHaveBeenCalled();
      restore();
    });

    it('does not flush when hangupOnBeforeUnload is not false (call is hung up on unload instead)', () => {
      const { instance, handler, restore } = buildWithVisHandler({});
      const flush = jest.fn();
      instance.hasActiveCall = jest.fn(() => true);
      instance.calls = {
        'call-1': {
          id: 'call-1',
          flushIntermediateCallReport: flush,
        } as unknown as IWebRTCCall,
      };

      setVisibility('hidden');
      handler(new Event('visibilitychange'));

      expect(flush).not.toHaveBeenCalled();
      restore();
    });

    it('does not flush when there is no active call', () => {
      const { instance, handler, restore } = buildWithVisHandler({
        hangupOnBeforeUnload: false,
      });
      const flush = jest.fn();
      instance.hasActiveCall = jest.fn(() => false);
      instance.calls = {
        'call-1': {
          id: 'call-1',
          flushIntermediateCallReport: flush,
        } as unknown as IWebRTCCall,
      };

      setVisibility('hidden');
      handler(new Event('visibilitychange'));

      expect(flush).not.toHaveBeenCalled();
      restore();
    });
  });

  describe('reconnect login', () => {
    it('should include the persisted sessid whenever a stored voice_sdk_id marks the login as a reconnect', async () => {
      setReconnectToken('voice-sdk-id');
      setReconnectSessionId('previous-sessid');
      Connection.mockResponse.mockImplementationOnce(() =>
        JSON.parse(
          '{"jsonrpc":"2.0","id":77,"result":{"message":"logged in","sessid":"previous-sessid"}}'
        )
      );

      await instance.login();

      const { request } = Connection.mockSend.mock.calls[0][0];
      expect(request.method).toBe('login');
      expect(request.params.reconnection).toBe(true);
      expect(request.params.sessid).toBe('previous-sessid');
    });

    it('should not include the persisted sessid when there is no stored voice_sdk_id', async () => {
      setReconnectSessionId('previous-sessid');
      Connection.mockResponse.mockImplementationOnce(() =>
        JSON.parse(
          '{"jsonrpc":"2.0","id":77,"result":{"message":"logged in","sessid":"new-sessid"}}'
        )
      );

      await instance.login();

      const { request } = Connection.mockSend.mock.calls[0][0];
      expect(request.method).toBe('login');
      expect(request.params.reconnection).toBe(false);
      expect(request.params.sessid).toBeUndefined();
    });

    it('should not include the persisted sessid when it is older than 90 seconds', async () => {
      setReconnectToken('voice-sdk-id');
      setReconnectSessionId(
        'previous-sessid',
        Date.now() - 1 - RECONNECT_SESSION_ID_MAX_AGE_MS
      );
      Connection.mockResponse.mockImplementationOnce(() =>
        JSON.parse(
          '{"jsonrpc":"2.0","id":77,"result":{"message":"logged in","sessid":"new-sessid"}}'
        )
      );

      await instance.login();

      const { request } = Connection.mockSend.mock.calls[0][0];
      expect(request.method).toBe('login');
      expect(request.params.reconnection).toBe(true);
      expect(request.params.sessid).toBeUndefined();
    });

    it('should include the in-memory sessid during same-instance socket reconnects', async () => {
      instance.sessionid = 'active-sessid';
      setReconnectToken('voice-sdk-id');
      setReconnectSessionId('stored-sessid');
      Connection.mockResponse.mockImplementationOnce(() =>
        JSON.parse(
          '{"jsonrpc":"2.0","id":77,"result":{"message":"logged in","sessid":"active-sessid"}}'
        )
      );

      await instance.login();

      const { request } = Connection.mockSend.mock.calls[0][0];
      expect(request.method).toBe('login');
      expect(request.params.reconnection).toBe(true);
      expect(request.params.sessid).toBe('active-sessid');
    });

    it('should persist the successful login sessid for future reconnects', async () => {
      Connection.mockResponse.mockImplementationOnce(() =>
        JSON.parse(
          '{"jsonrpc":"2.0","id":77,"result":{"message":"logged in","sessid":"server-sessid"}}'
        )
      );

      await instance.login();

      expect(instance.sessionid).toBe('server-sessid');
      expect(getReconnectSessionId()).toBe('server-sessid');
    });
  });

  it('should set env equal production ', () => {
    const telnyxRTC = _buildInstance({
      env: 'production',
      login: 'login',
      password: 'password',
    });
    expect(telnyxRTC.options.env).toEqual('production');
  });

  it('should set env equal development', () => {
    const telnyxRTC = _buildInstance({
      env: 'development',
      login: 'login',
      password: 'password',
    });
    expect(telnyxRTC.options.env).toEqual('development');
  });

  it('should set host equal wss://test.telnyx.com', () => {
    const telnyxRTC = _buildInstance({
      host: 'wss://test.telnyx.com',
      login: 'login',
      password: 'password',
    });
    expect(telnyxRTC.options.host).toEqual('wss://test.telnyx.com');
  });

  it('should return DEFAULT_PROD_ICE_SERVERS when not pass iceServers or env', () => {
    const telnyxRTC = _buildInstance({ login: 'login', password: 'password' });

    expect(telnyxRTC.iceServers).toEqual(DEFAULT_PROD_ICE_SERVERS);
  });

  it('should return iceServers with DEFAULT_DEV_ICE_SERVERS when env is development', () => {
    const telnyxRTC = _buildInstance({
      env: 'development',
      login: 'login',
      password: 'password',
    });
    expect(telnyxRTC.iceServers).toEqual(DEFAULT_DEV_ICE_SERVERS);
  });

  it('should return iceServers with DEFAULT_PROD_ICE_SERVERS when env is production', () => {
    const telnyxRTC = _buildInstance({
      env: 'production',
      login: 'login',
      password: 'password',
    });
    expect(telnyxRTC.iceServers).toEqual(DEFAULT_PROD_ICE_SERVERS);
  });

  it('should return iceServers with provided value when iceServers is provided', () => {
    const customIceServers: RTCIceServer[] = [
      { urls: 'stun:custom.stun.server:3478' },
    ];
    const telnyxRTC = _buildInstance({
      iceServers: customIceServers,
      login: 'login',
      password: 'password',
    });
    expect(telnyxRTC.iceServers).toEqual(customIceServers);
  });

  describe('.validateOptions()', () => {
    it('should return false with invalid options', () => {
      instance.options = {
        host: 'example.fs.edo',
        project: 'project',
        token: 'token',
      };
      expect(instance.validateOptions()).toEqual(false);
    });

    it('should return false with invalid options', () => {
      instance.options = {
        host: 'fs.example.com',
        login: 'login',
        passwd: '1234',
      };
      expect(instance.validateOptions()).toEqual(true);

      instance.options = {
        host: 'fs.example.com',
        login: 'login',
        password: '1234',
      };
      expect(instance.validateOptions()).toEqual(true);
    });
  });

  describe('.connect()', () => {
    it('should register socket listeners', () => {
      const listeners = [
        'telnyx.socket.close',
        'telnyx.socket.open',
        'telnyx.socket.error',
        'telnyx.socket.message',
      ];
      listeners.forEach((event) => {
        expect(isQueued(event, instance.uuid)).toEqual(true);
      });
    });

    describe('with an already established connection', () => {
      it('should do nothing', async (done) => {
        await instance.connect();
        expect(Connection.mockClose).not.toHaveBeenCalled();
        done();
      });
    });

    describe('with an invalid connection (closed/closing state)', () => {
      it('should close the previous one and create another', async (done) => {
        Connection.mockConnect.mockClear();
        Connection.isAlive.mockReturnValueOnce(false);
        await instance.connect();
        expect(Connection.mockConnect).toHaveBeenCalledTimes(1);
        done();
      });
    });
  });

  describe('.speedTest()', () => {
    // TODO:
  });

  describe('.subscribe()', () => {
    it('should add the subscription and return the response', async () => {
      Connection.mockResponse.mockImplementationOnce(() =>
        JSON.parse(
          '{"jsonrpc":"2.0","id":77,"result":{"subscribedChannels":["channel-test-name"],"sessid":"sessid-xyz"}}'
        )
      );
      const response = await instance.subscribe({
        channels: ['channel-test-name'],
        handler: noop,
      });
      expect(response).toHaveProperty('subscribedChannels');
      expect(response.subscribedChannels).toEqual(['channel-test-name']);
      expect(Connection.mockSend.mock.calls).toHaveLength(1);
      expect(instance.subscriptions[VERTO_PROTOCOL]).toHaveProperty(
        'channel-test-name'
      );
    });

    it('should do nothing if subscription already exists and return NULL', async () => {
      instance.subscriptions = {
        [VERTO_PROTOCOL]: { 'channel-already-there': {} },
      };
      const response = await instance.subscribe({
        channels: ['channel-already-there'],
        handler: noop,
      });
      expect(response).toEqual({});
      expect(Connection.mockSend.mock.calls).toHaveLength(0);
      expect(instance.subscriptions[VERTO_PROTOCOL]).toHaveProperty(
        'channel-already-there'
      );
    });

    it('should not add the subscription to an invalid channel but return the response', async () => {
      Connection.mockResponse.mockImplementationOnce(() =>
        JSON.parse(
          '{"jsonrpc":"2.0","id":77,"result":{"unauthorizedChannels":["channel-invalid"],"sessid":"sessid-xyz"}}'
        )
      );
      const response = await instance.subscribe({
        channels: ['channel-invalid'],
        handler: noop,
      });
      expect(response).toHaveProperty('unauthorizedChannels');
      expect(Connection.mockSend.mock.calls).toHaveLength(1);
      expect(instance.subscriptions).not.toHaveProperty(VERTO_PROTOCOL);
    });
  });

  describe('.unsubscribe()', () => {
    it('should remove the subscription and return the response', async () => {
      const cName = 'channel-already-there';
      instance.subscriptions = { [VERTO_PROTOCOL]: { [cName]: {} } };
      Connection.mockResponse.mockImplementationOnce(() =>
        JSON.parse(
          `{"jsonrpc":"2.0","id":77,"result":{"unsubscribedChannels":["${cName}"],"sessid":"sessid-xyz"}}`
        )
      );
      const response = await instance.unsubscribe({ channels: [cName] });
      expect(response).toHaveProperty('unsubscribedChannels');
      expect(response.unsubscribedChannels).toEqual([cName]);
      expect(instance.subscriptions[VERTO_PROTOCOL]).not.toHaveProperty(cName);
    });

    it('should do nothing if subscription does not exists', async () => {
      const cName = 'channel-fake';
      const response = await instance.unsubscribe({ channels: [cName] });
      expect(response).toEqual({});
      expect(instance.subscriptions).not.toHaveProperty(VERTO_PROTOCOL);
    });
  });

  describe('.broadcast()', () => {
    it('should broadcast the message with valid params', () => {
      const cName = 'bd-channel';
      instance.subscriptions = { [cName]: {} };
      Connection.mockResponse.mockImplementationOnce(() =>
        JSON.parse(
          `{"jsonrpc":"2.0","id":77,"result":{"unsubscribedChannels":["${cName}"],"sessid":"sessid-xyz"}}`
        )
      );
      const response = instance.broadcast({
        channel: cName,
        data: { text: 'msg' },
      });
      expect(response).toBeUndefined();
      const { request } = Connection.mockSend.mock.calls[0][0];
      expect(request.params).toMatchObject({
        sessid: '',
        eventChannel: cName,
        data: { text: 'msg' },
      });
    });

    it('should thrown an error with invalid params', () => {
      expect(instance.broadcast.bind(instance, { channel: '' })).toThrow();
    });
  });

  describe('.mediaConstraints', () => {
    it('should match default constraints', () => {
      const tmp = instance.mediaConstraints;
      expect(tmp).toMatchObject({ audio: true, video: false });
      expect(Object.keys(tmp)).toEqual(['audio', 'video']);
    });

    it('should match media constraints with video enabled when video is true', () => {
      const telnyxRTC = _buildInstance({
        host: 'example.telnyx.com',
        login: 'login',
        password: 'password',
        video: true,
      });
      const tmp = telnyxRTC.mediaConstraints;
      expect(tmp).toMatchObject({ audio: true, video: true });
      expect(Object.keys(tmp)).toEqual(['audio', 'video']);
    });
  });

  describe('.setAudioSettings()', () => {
    const MIC_ID =
      'c3d0a4cb47f5efd7af14c2c3860d12f0199042db6cbdf0c690c38644a24a6ba7';
    const CAM_ID =
      '2060bf50ab9c29c12598bf4eafeafa71d4837c667c7c172bb4407ec6c5150206';

    it('should not set deviceId with an invalid micId', () => {
      expect(
        instance.setAudioSettings({
          micId: CAM_ID,
          micLabel: 'Random Mic',
          volume: 1,
          echoCancellation: false,
        })
      ).resolves.toMatchObject({ volume: 1, echoCancellation: false });
    });

    it('should set deviceId', () => {
      expect(
        instance.setAudioSettings({
          micId: MIC_ID,
          micLabel: 'Random Mic',
          volume: 1,
          echoCancellation: false,
        })
      ).resolves.toMatchObject({
        deviceId: { exact: MIC_ID },
        volume: 1,
        echoCancellation: false,
      });
    });

    it('should remove unsupported audio constraints', () => {
      expect(
        instance.setAudioSettings({
          micId: MIC_ID,
          micLabel: 'Random Mic',
          volume: 1,
          echoCancellation: false,
        })
      ).resolves.toMatchObject({ deviceId: { exact: MIC_ID } });
    });
  });

  describe('.disableMicrophone()', () => {
    it('should set audio constraint to false', () => {
      instance.disableMicrophone();
      expect(instance.mediaConstraints.audio).toEqual(false);
    });
  });

  describe('.enableMicrophone()', () => {
    it('should set audio constraint to true', () => {
      instance.enableMicrophone();
      expect(instance.mediaConstraints.audio).toEqual(true);
    });
  });

  describe('.login()', () => {
    beforeEach(() => {
      // Ensure connection is alive for login tests
      Connection.isAlive.mockReturnValue(true);
    });

    describe('when credentials are provided', () => {
      it('should update login when provided', async () => {
        await instance.login({ creds: { login: 'newlogin' } });
        expect(instance.options.login).toEqual('newlogin');
      });

      it('should update password when provided', async () => {
        await instance.login({ creds: { password: 'newpassword' } });
        expect(instance.options.password).toEqual('newpassword');
      });

      it('should update passwd when provided', async () => {
        await instance.login({ creds: { passwd: 'newpasswd' } });
        expect(instance.options.passwd).toEqual('newpasswd');
      });

      it('should update login_token when provided', async () => {
        await instance.login({ creds: { login_token: 'new_jwt_token' } });
        expect(instance.options.login_token).toEqual('new_jwt_token');
      });

      it('should update userVariables when provided', async () => {
        const newUserVariables = { key: 'value', custom: 'data' };
        await instance.login({ creds: { userVariables: newUserVariables } });
        expect(instance.options.userVariables).toEqual(newUserVariables);
      });

      it('should update anonymous_login when provided', async () => {
        const anonymousLogin = {
          target_type: 'flow',
          target_id: '123',
          target_version_id: 'v1',
        };
        await instance.login({ creds: { anonymous_login: anonymousLogin } });

        expect(instance.options.anonymous_login).toEqual(anonymousLogin);
      });

      it('should update anonymous_login with target_params when provided', async () => {
        const anonymousLogin = {
          target_type: 'ai_assistant',
          target_id: '123',
          target_version_id: 'v1',
          target_params: {
            conversation_id: 'conv-456',
          },
        };
        await instance.login({ creds: { anonymous_login: anonymousLogin } });

        expect(instance.options.anonymous_login).toEqual(anonymousLogin);
        expect(instance.options.anonymous_login.target_params).toEqual({
          conversation_id: 'conv-456',
        });
      });

      it('should update multiple credentials at once', async () => {
        await instance.login({
          creds: {
            login: 'updatedlogin',
            password: 'updatedpassword',
            userVariables: { foo: 'bar' },
          },
        });

        expect(instance.options.login).toEqual('updatedlogin');
        expect(instance.options.password).toEqual('updatedpassword');
        expect(instance.options.userVariables).toEqual({ foo: 'bar' });
      });
    });

    describe('when credentials are not provided', () => {
      it('should not change login when not provided', async () => {
        const originalLogin = instance.options.login;

        await instance.login({ creds: { password: 'newpassword' } });

        expect(instance.options.login).toEqual(originalLogin);
      });

      it('should not change password when not provided', async () => {
        const originalPassword = instance.options.password;

        await instance.login({ creds: { login: 'newlogin' } });

        expect(instance.options.password).toEqual(originalPassword);
      });

      it('should not change any credentials when called with empty params', async () => {
        const originalLogin = instance.options.login;
        const originalPassword = instance.options.password;

        await instance.login({});

        expect(instance.options.login).toEqual(originalLogin);
        expect(instance.options.password).toEqual(originalPassword);
      });

      it('should not change any credentials when called without params', async () => {
        const originalLogin = instance.options.login;
        const originalPassword = instance.options.password;

        await instance.login();

        expect(instance.options.login).toEqual(originalLogin);
        expect(instance.options.password).toEqual(originalPassword);
      });
    });

    describe('when connection is not active', () => {
      it('should return early when connection is null', async () => {
        instance.connection = null;
        const originalLogin = instance.options.login;

        await instance.login({ creds: { login: 'newlogin' } });

        // Credentials should NOT be updated because login returns early
        expect(instance.options.login).toEqual(originalLogin);
      });

      it('should return early when connection is not alive', async () => {
        Connection.isAlive.mockReturnValue(false);
        const originalLogin = instance.options.login;

        await instance.login({ creds: { login: 'newlogin' } });

        // Credentials should NOT be updated because login returns early
        expect(instance.options.login).toEqual(originalLogin);
      });
    });
  });
});
