import behaveLikeBaseSession from './behaveLike/BaseSession.spec';
import LayoutHandler from './webrtc/LayoutHandler';
import { isQueued } from '../services/Handler';
import Verto, { VERTO_PROTOCOL } from '..';

const Connection = require('../services/Connection');

describe('Verto', () => {
  const _buildInstance = (props): Verto => {
    const instance: Verto = new Verto(props);
    // @ts-ignore
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
  });

  it('should instantiate Verto with default methods', () => {
    expect(instance).toBeInstanceOf(Verto);
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

  it('should return iceServers with google servers when is true', () => {
    const telnyxRTC = _buildInstance({
      iceServers: true,
      login: 'login',
      password: 'password',
    });
    expect(telnyxRTC.iceServers[0]).toEqual({
      urls: ['stun:stun.l.google.com:19302'],
    });
  });

  it('should return iceServers with empty [] when is false', () => {
    const telnyxRTC = _buildInstance({
      iceServers: false,
      login: 'login',
      password: 'password',
    });
    expect(telnyxRTC.iceServers).toEqual([]);
  });

  it('should return production iceServers when not pass iceServers', () => {
    const telnyxRTC = _buildInstance({ login: 'login', password: 'password' });
    expect(telnyxRTC.iceServers[0]).toEqual({
      credential: 'testpassword',
      urls: 'turn:turn.telnyx.com:3478?transport=tcp',
      username: 'testuser',
    });
    expect(telnyxRTC.iceServers[1]).toEqual({
      urls: 'stun:stun.telnyx.com:3843',
    });
  });

  it('should set iceServers equal stun.test.telnyx.com', () => {
    const telnyxRTC = _buildInstance({
      iceServers: ['stun.test.telnyx.com'],
      login: 'login',
      password: 'password',
    });
    expect(telnyxRTC.iceServers[0]).toEqual('stun.test.telnyx.com');
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

    it('should set the devices object', () => {
      expect(instance.videoDevices).toBeDefined();
      expect(instance.audioInDevices).toBeDefined();
      expect(instance.audioOutDevices).toBeDefined();
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
      expect(instance.broadcast.bind(instance, { channel: false })).toThrow();
      expect(instance.broadcast.bind(instance, { channel: null })).toThrow();
    });
  });

  describe('.mediaConstraints', () => {
    it('should match default constraints', () => {
      const tmp = instance.mediaConstraints;
      expect(tmp).toMatchObject({ audio: true, video: false });
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
        // @ts-ignore
        instance.setAudioSettings({
          micId: MIC_ID,
          micLabel: 'Random Mic',
          volume: 1,
          echoCancellation: false,
        })
      ).resolves.toMatchObject({ deviceId: { exact: MIC_ID } });
    });
  });

  describe('.setVideoSettings()', () => {
    const MIC_ID =
      'c3d0a4cb47f5efd7af14c2c3860d12f0199042db6cbdf0c690c38644a24a6ba7';
    const CAM_ID =
      '2060bf50ab9c29c12598bf4eafeafa71d4837c667c7c172bb4407ec6c5150206';

    it('should not set deviceId with an invalid camId', () => {
      expect(
        instance.setVideoSettings({
          camId: MIC_ID,
          camLabel: 'Random cam',
          width: 1280,
          height: 720,
        })
      ).resolves.toMatchObject({ width: 1280, height: 720 });
    });

    it('should set deviceId', () => {
      expect(
        instance.setVideoSettings({
          camId: CAM_ID,
          camLabel: 'Random cam',
          width: 1280,
          height: 720,
        })
      ).resolves.toMatchObject({
        deviceId: { exact: CAM_ID },
        width: 1280,
        height: 720,
      });
    });

    it('should remove unsupported audio constraints', () => {
      expect(
        // @ts-ignore
        instance.setVideoSettings({
          camId: CAM_ID,
          camLabel: 'Random cam',
          width: 1280,
          height: 720,
        })
      ).resolves.toMatchObject({ deviceId: { exact: CAM_ID } });
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

  describe('.disableWebcam()', () => {
    it('should set video constraint to false', () => {
      instance.disableWebcam();
      expect(instance.mediaConstraints.video).toEqual(false);
    });
  });

  describe('.enableWebcam()', () => {
    it('should set video constraint to true', () => {
      instance.enableWebcam();
      expect(instance.mediaConstraints.video).toEqual(true);
    });
  });
});

