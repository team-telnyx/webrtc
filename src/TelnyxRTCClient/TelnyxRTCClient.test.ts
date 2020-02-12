import TelnyxRTCClient from './TelnyxRTCClient';

// Create an element for the call
document.body.innerHTML = '<audio id="rtc-container"></audio>';

// Stub missing browser APIs
Object.defineProperty((global as any).navigator, 'mediaDevices', {
  get() {
    return {
      enumerateDevices() {
        return Promise.resolve([]);
      },

      getUserMedia() {
        return Promise.resolve({
          getTracks() {
            return [];
          },
        });
      },
    };
  },
  configurable: true,
});


const setup = (params) => {
  return new TelnyxRTCClient({
    credentials: {
      username: 'username',
      password: 'password',
    },
    remoteElement: '#rtc-container',
    useMic: true,
    useSpeaker: true,
    useCamera: false,
    ...params
  });
}

describe('TelnyxRTCClient', () => {
  let client;
  beforeEach(() => {
    client = setup({});
  })

  afterAll(() => {
    client.disconnect();
    client = null;
  });


  it('constructs and assigns properties', () => {
    expect(client.credentials.username).toBe('username');
    expect(client.credentials.password).toBe('password');
    expect(client.remoteElement).toBeInstanceOf(HTMLAudioElement);
    expect(client.telnyxRTC).not.toBeNull();
    expect(client.useMic).toBe(true);
    expect(client.useSpeaker).toBe(true);
    expect(client.useCamera).toBe(false);
  });

  /**
   * Any test that connects over WS needs to disconnect in order to finish running the test.
   */
  it('connects, disconnects, and fires events', (done) => {
    const events = [];
    const fireEvent = (event) => events.push(event);
    client
      .on('socket.connect', () => {
        fireEvent("socket.connect");
      })
      .on('registered', () => {
        fireEvent("registered");
        client.disconnect();
      })
      .on('unregistered', () => {
        fireEvent('unregistered');
      })
      .on('socket.close', () => {
        fireEvent('socket.close');
        expect(events.length).toBe(4);
        done();
      });

    client.connect();
  }, 50000);

  /**
   * @TODO This doesn't establish RTCPeerConnection as it's not available in jsdom.
   * However, it should still initiate a call with TelnyxRTC and call commands.
   */
  it('can make a call', (done) => {
    let didHangUp = false;
    let countCalls = 0;
    const makeCall = () => {
      client.newCall({
        destination: '18004377950',
        callerName: 'Your Name',
        callerNumber: '12014487079‬',
      });
    };
    client
      .on('socket.connect', () => console.log("Connect"))
      .on('registered', () => {
        makeCall()
      })
      .on('callUpdate', (call) => {
        if (countCalls === 0) {
          if (call.state === 'new' && !didHangUp) {
            didHangUp = true;
            call.hangup();
          }

          if (call.state === 'done') {
            client.disconnect();
          }
        }
      })
      .on('socket.close', () => {
        if (countCalls === 0) {
          done();
        }
        countCalls++;
      });

    client.connect();
  }, 10000);

  it("should return all devices in machine", () => {
    const devices = client.getDevices();
    expect(devices).not.toBeNull();
  })

  it("should return configs production when pass env equal production", () => {
    const HOST = `production.telnyx.com`;
    const PROD_PORT = 15000;
    const ENV = 'production';

    const client = setup({
      env: ENV,
      host: HOST,
      port: PROD_PORT,
    });

    expect(client).not.toBeNull();
    expect(client.env).toBe(ENV);
    expect(client.host).toBe(HOST);
    expect(client.port).toBe(PROD_PORT);

  })

  it("should return configs development when pass env equal development", () => {
    const HOST = `development.telnyx.com`;
    const DEV_PORT = 15001;
    const ENV = "development";

    const client = setup({
      env: ENV,
      host: HOST,
      port: DEV_PORT,
    });
    expect(client).not.toBeNull();
    expect(client.env).toBe(ENV);
    expect(client.host).toBe(HOST);
    expect(client.port).toBe(DEV_PORT);
  })

  it("should return exception when module is not supported", () => {
    const MODULE = "telnyx";

    try {
      const client = setup({
        module: MODULE,
      });
    } catch (error) {
      expect(error.message).toBe(`Module ${MODULE} is not supported`);
    }
  })

  it("should return telnyx_rtc when module is null", () => {
    const client = setup({
      module: null,
    });
    expect(client).not.toBeNull();
    expect(client.module).toBe('telnyx_rtc');
  })

  it("should return module equal verto", () => {
    const client = setup({
      module: 'verto',
    });
    expect(client).not.toBeNull();
    expect(client.module).toBe('verto');
  })
});

