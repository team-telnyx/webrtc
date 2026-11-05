jest.unmock('uuid');
jest.unmock('../../services/Connection');

import { setTelemetryWebSocket } from '@telnyx/webrtc-telemetry';
import { TelnyxRTC } from '../../../../TelnyxRTC';
import { setWebSocket } from '../../services/Connection';
import { clearQueue } from '../../services/Handler';
import { telemetryOf } from '../../telemetry';
import logger from '../../util/logger';

type Frame = { id: string; method: string; params?: Record<string, unknown> };

class FakeSocket {
  static signaling: FakeSocket[] = [];
  static telemetry: FakeSocket[] = [];
  readyState = 0;
  bufferedAmount = 0;
  sent: Frame[] = [];
  onopen: (event?: Event) => void;
  onclose: (event?: unknown) => void;
  onerror: (event?: Event) => void;
  onmessage: (event: { data: string }) => void;
  send(data: string) {
    this.sent.push(JSON.parse(data));
  }
  open() {
    this.readyState = 1;
    this.onopen?.(new Event('open'));
  }
  close() {
    this.readyState = 3;
    this.onclose?.({ code: 1000 });
  }
  receive(message: unknown) {
    this.onmessage({ data: JSON.stringify(message) });
  }
}
class SignalingSocket extends FakeSocket {
  constructor() {
    super();
    FakeSocket.signaling.push(this);
  }
}
class TelemetrySocket extends FakeSocket {
  constructor() {
    super();
    FakeSocket.telemetry.push(this);
  }
}

/**
 * Call Report V2: the signaling login says whether this SDK instance sends
 * telemetry (telemetry_enabled), so the signaling VSP sends its vsp_session
 * record only for instances that do.
 */
describe('Call Report V2 in the signaling login', () => {
  let client: TelnyxRTC | null = null;

  beforeEach(() => {
    clearQueue();
    sessionStorage.clear();
    FakeSocket.signaling = [];
    FakeSocket.telemetry = [];
    setWebSocket(SignalingSocket as unknown as typeof WebSocket);
    setTelemetryWebSocket(TelemetrySocket);
    jest.spyOn(logger, 'info').mockImplementation(() => undefined);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    telemetryOf(client)?.client.close();
    await client?.disconnect();
    client = null;
    jest.restoreAllMocks();
    clearQueue();
    sessionStorage.clear();
    setWebSocket(WebSocket);
    setTelemetryWebSocket(typeof WebSocket !== 'undefined' ? WebSocket : null);
  });

  const create = (telemetry?: Record<string, unknown>) => {
    client = new TelnyxRTC({ login: 'user', password: 'secret', telemetry });
    return client;
  };

  /** connect() and open the signaling socket: the login's params. */
  const loginParams = async () => {
    await client.connect();
    const socket = FakeSocket.signaling[0];
    socket.open();
    const login = socket.sent.find((frame) => frame.method === 'login');
    return login.params;
  };

  it('is true while the instance sends telemetry, before any answer from the telemetry server too', async () => {
    create({ url: 'ws://t' });
    expect(await loginParams()).toEqual(
      expect.objectContaining({
        sdk_instance_id: client.telemetry.sdkInstanceId,
        telemetry_enabled: true,
      })
    );
  });

  it('is false once the telemetry server let the instance through no telemetry (telemetry load)', async () => {
    create({ url: 'ws://t' });
    const [telemetry] = FakeSocket.telemetry;
    telemetry.open();
    telemetry.receive({
      jsonrpc: '2.0',
      method: 'telnyx_rtc.telemetry_control',
      params: { enabled: false },
    });
    expect(telemetryOf(client).client.disabledByServer).toBe(true);
    expect(await loginParams()).toEqual(
      expect.objectContaining({
        sdk_instance_id: client.telemetry.sdkInstanceId,
        telemetry_enabled: false,
      })
    );
  });

  it('is false in capture mode: nothing goes to the telemetry server', async () => {
    create({ capture: true });
    expect((await loginParams()).telemetry_enabled).toBe(false);
  });

  it('is left out, with sdk_instance_id, when telemetry is off', async () => {
    create({ enabled: false });
    const params = await loginParams();
    expect(params).not.toHaveProperty('sdk_instance_id');
    expect(params).not.toHaveProperty('telemetry_enabled');
  });
});
